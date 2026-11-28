import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWilayaCatalog,
  resolveWilayaZone,
  computeVolumetricBillingDetails,
  detectDuplicateParcelScan,
  evaluateOtpAttemptLockout,
  computeCourierDischargeWithVariance,
  validateRemittanceCcpBatch,
  optimizeManifestRouteStops,
  aggregateDriverPayrollSummaries,
  buildMerchantFeeInvoiceSummary,
  buildPublicTrackingTimeline,
  computeFreightWaybillTotals,
  computeMovingVolumeQuote,
  evaluateColdChainExcursion,
  computeCustomsDossierDuties,
  computeTowingDispatchQuote,
} from './logisticsDepth';
import { calculateCcpKey } from './logisticsRules';
import type { LogisticsShipment, CourierCashDischarge, MerchantRemittanceBatch } from '../types';
import type { WilayaReferenceRow } from '../lib/supabase/services/referenceDataService';

test('resolveWilayaCatalog & resolveWilayaZone support active wilayas_ref and unknown codes safely', () => {
  const customRows: WilayaReferenceRow[] = [
    {
      code: 16,
      nameFr: 'Alger',
      nameAr: 'الجزائر',
      nameEn: 'Algiers',
      defaultZone: 'Zone1_Local',
      communes: ['Kouba', 'Hydra'],
      validFrom: '2020-01-01',
      validTo: null,
      isLegacy: true,
      verificationStatus: 'verified',
      verifiedBy: null,
      verifiedAt: null,
      updatedAt: '',
    },
    {
      code: 69,
      nameFr: 'Aflou',
      nameAr: 'أفلو',
      nameEn: 'Aflou',
      defaultZone: 'Zone4_Plateaux',
      communes: ['Aflou'],
      validFrom: '2026-01-01',
      validTo: null,
      isLegacy: false,
      verificationStatus: 'verified',
      verifiedBy: null,
      verifiedAt: null,
      updatedAt: '',
    },
    {
      code: 99,
      nameFr: 'Ancien Secteur',
      nameAr: 'قطاع قديم',
      nameEn: 'Expired',
      defaultZone: 'Zone5_Sud',
      communes: [],
      validFrom: '2000-01-01',
      validTo: '2024-01-01',
      isLegacy: true,
      verificationStatus: 'unverified',
      verifiedBy: null,
      verifiedAt: null,
      updatedAt: '',
    },
  ];

  const catalog = resolveWilayaCatalog(customRows, '2026-11-28');
  assert.equal(catalog.activeCount, 2);

  const z69 = resolveWilayaZone('69 - Aflou', customRows);
  assert.equal(z69.zone, 'Zone4_Plateaux');
  assert.equal(z69.isUnknownWilaya, false);

  const unknown = resolveWilayaZone('88 - Secteur Inconnu', customRows);
  assert.equal(unknown.isUnknownWilaya, true);
  assert.equal(unknown.zone, 'Zone4_Plateaux');
});

test('computeVolumetricBillingDetails handles divisor 5000 rounding & overage edge cases', () => {
  const details = computeVolumetricBillingDetails({
    actualWeightKg: 2.0,
    dimensionsCm: { length: 50, width: 40, height: 15 }, // 30000 / 5000 = 6.0 kg
  });
  assert.equal(details.volumetricWeightKg, 6.0);
  assert.equal(details.usedVolumetric, true);
  assert.equal(details.billableWeightKg, 6.0);
  assert.equal(details.overageKg, 1);
  assert.equal(details.weightSurchargeDzd, 70);

  const fractional = computeVolumetricBillingDetails({
    actualWeightKg: 5.01,
    dimensionsCm: { length: 10, width: 10, height: 10 },
  });
  assert.equal(fractional.usedVolumetric, false);
  assert.equal(fractional.overageKg, 1);
});

test('detectDuplicateParcelScan prevents redundant stage or session scans', () => {
  const dupSession = detectDuplicateParcelScan({
    trackingCode: 'ATR-EXP-88912',
    stage: 'Bagging',
    shipmentStatus: 'OutForDelivery',
    recentSessionScans: [{ code: 'ATR-EXP-88912', stage: 'Bagging', status: 'success' }],
  });
  assert.equal(dupSession.isDuplicate, true);
  assert.equal(dupSession.reason, 'ALREADY_SCANNED_IN_SESSION');

  const dupStage = detectDuplicateParcelScan({
    trackingCode: 'ATR-EXP-88915',
    stage: 'Bagging',
    shipmentStatus: 'Sorted',
    recentSessionScans: [],
  });
  assert.equal(dupStage.isDuplicate, true);
  assert.equal(dupStage.reason, 'ALREADY_IN_TARGET_STAGE');

  const clean = detectDuplicateParcelScan({
    trackingCode: 'ATR-EXP-88914',
    stage: 'Bagging',
    shipmentStatus: 'ReceivedAtHub',
    recentSessionScans: [{ code: 'ATR-EXP-88914', stage: 'Intake', status: 'success' }],
  });
  assert.equal(clean.isDuplicate, false);
});

test('evaluateOtpAttemptLockout enforces max 3 tries and locks Stop-Desk handover', () => {
  const a1 = evaluateOtpAttemptLockout({ expectedOtp: '7492', enteredOtp: '0000', currentAttempts: 0 });
  assert.equal(a1.matched, false);
  assert.equal(a1.attemptsUsed, 1);
  assert.equal(a1.isLockedOut, false);

  const a3 = evaluateOtpAttemptLockout({ expectedOtp: '7492', enteredOtp: '1111', currentAttempts: 2 });
  assert.equal(a3.matched, false);
  assert.equal(a3.attemptsUsed, 3);
  assert.equal(a3.isLockedOut, true);
  assert.equal(a3.remainingAttempts, 0);

  // Even the right OTP is rejected while locked out
  const blockedCorrect = evaluateOtpAttemptLockout({
    expectedOtp: '7492',
    enteredOtp: '7492',
    currentAttempts: 3,
    isLockedOut: true,
  });
  assert.equal(blockedCorrect.matched, false);
  assert.equal(blockedCorrect.isLockedOut, true);
});

test('computeCourierDischargeWithVariance reconciles counterfeit notes & parcel count mismatch', () => {
  const res = computeCourierDischargeWithVariance({
    expectedAmountDzd: 20000,
    expectedParcelCount: 10,
    deliveredCount: 8,
    returnedCount: 1, // 1 parcel unaccounted
    note2000Count: 10,
    note1000Count: 0,
    note500Count: 0,
    note200Count: 0,
    coinsDzd: 0,
    counterfeitAmountDzd: 2000,
    damagedAmountDzd: 500,
  });
  assert.equal(res.grossCountedDzd, 20000);
  assert.equal(res.usableCashDzd, 17500);
  assert.equal(res.cashDiscrepancyDzd, -2500);
  assert.equal(res.status, 'Shortage');
  assert.equal(res.parcelCountMismatch, true);
  assert.equal(res.requiresSupervisorReview, true);
});

test('validateRemittanceCcpBatch blocks invalid CCP Mod-97 checksum', () => {
  const validKey = calculateCcpKey('0012345678');
  const batches: MerchantRemittanceBatch[] = [
    {
      id: 'r1',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      staffId: 'st',
      batchNumber: 'LOT-01',
      merchantName: 'Shop A',
      ccpAccount: '0012345678',
      ccpKey: validKey,
      grossCodDzd: 10000,
      shippingFeesDzd: 600,
      returnFeesDzd: 0,
      netPayoutDzd: 9400,
      paymentChannel: 'AlgeriePoste_SFP01',
      status: 'Approved',
    },
    {
      id: 'r2',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      staffId: 'st',
      batchNumber: 'LOT-02',
      merchantName: 'Shop B',
      ccpAccount: '0012345678',
      ccpKey: validKey === 99 ? 10 : validKey + 1,
      grossCodDzd: 10000,
      shippingFeesDzd: 600,
      returnFeesDzd: 0,
      netPayoutDzd: 9400,
      paymentChannel: 'AlgeriePoste_SFP01',
      status: 'Approved',
    },
  ];
  const check = validateRemittanceCcpBatch(batches);
  assert.equal(check.isValid, false);
  assert.equal(check.invalidIssues.length, 1);
  assert.equal(check.invalidIssues[0].batchNumber, 'LOT-02');
});

test('optimizeManifestRouteStops clusters by wilaya and puts StopDesk before HomeDelivery', () => {
  const base = {
    accountId: 'a',
    businessId: 'b',
    branchId: 'br',
    staffId: 'st',
    merchantName: 'M',
    recipientPhone: '0555000000',
    shippingFeeDzd: 600,
    weightKg: 2,
    createdAt: '2026-05-25T08:00:00Z',
  };
  const plan = optimizeManifestRouteStops([
    { ...base, id: '1', trackingCode: 'A1', recipientName: 'R1', destinationWilaya: '31 - Oran', destinationAddress: 'Bir El Djir', codAmountDzd: 4000, status: 'Sorted', deliveryMode: 'HomeDelivery' },
    { ...base, id: '2', trackingCode: 'A2', recipientName: 'R2', destinationWilaya: '16 - Alger', destinationAddress: 'Kouba', codAmountDzd: 5000, status: 'OutForDelivery', deliveryMode: 'HomeDelivery' },
    { ...base, id: '3', trackingCode: 'A3', recipientName: 'R3', destinationWilaya: '16 - Alger', destinationAddress: 'Bab Ezzouar', codAmountDzd: 3000, status: 'Sorted', deliveryMode: 'StopDesk' },
  ] as LogisticsShipment[]);

  assert.equal(plan.stops[0].trackingCode, 'A3');
  assert.equal(plan.stops[1].trackingCode, 'A2');
  assert.equal(plan.stops[2].trackingCode, 'A1');
  assert.equal(plan.distinctWilayas, 2);
});

test('aggregateDriverPayrollSummaries & buildMerchantFeeInvoiceSummary compute live amounts', () => {
  const ships: LogisticsShipment[] = [
    {
      id: 's1',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      staffId: 'st',
      trackingCode: 'ATR-1',
      merchantName: 'Bio Shop',
      recipientName: 'A',
      recipientPhone: '0550112233',
      destinationWilaya: '16 - Alger',
      destinationAddress: 'Hydra',
      codAmountDzd: 10000,
      shippingFeeDzd: 600,
      weightKg: 1,
      status: 'Delivered',
      assignedDriverName: 'Farid (Van 01)',
      createdAt: '2026-05-25T08:00:00Z',
    },
    {
      id: 's2',
      accountId: 'a',
      businessId: 'b',
      branchId: 'br',
      staffId: 'st',
      trackingCode: 'ATR-2',
      merchantName: 'Bio Shop',
      recipientName: 'B',
      recipientPhone: '0550112244',
      destinationWilaya: '16 - Alger',
      destinationAddress: 'Kouba',
      codAmountDzd: 5000,
      shippingFeeDzd: 600,
      weightKg: 1,
      status: 'Returned',
      assignedDriverName: 'Farid (Van 01)',
      createdAt: '2026-05-25T08:00:00Z',
    },
  ];
  const discharges: CourierCashDischarge[] = [];
  const payroll = aggregateDriverPayrollSummaries({ shipments: ships, discharges });
  assert.equal(payroll.length, 1);
  assert.equal(payroll[0].deliveredCount, 1);
  assert.equal(payroll[0].returnedCount, 1);

  const invoice = buildMerchantFeeInvoiceSummary({
    merchantName: 'Bio Shop',
    shipments: ships,
    periodLabel: '2026-05',
  });
  assert.equal(invoice.grossCodDzd, 10000);
  assert.equal(invoice.deliveryFeesHtDzd, 600);
  assert.equal(invoice.returnFeesHtDzd, 200);
  assert.equal(invoice.tva19Dzd, 152);
  assert.equal(invoice.netMerchantPayableDzd, 10000 - 952);
});

test('buildPublicTrackingTimeline & 5 specialty logistics calculators produce deterministic totals', () => {
  const timeline = buildPublicTrackingTimeline({
    id: 's1',
    accountId: 'a',
    businessId: 'b',
    branchId: 'br',
    staffId: 'st',
    trackingCode: 'ATR-EXP-88912',
    merchantName: 'M',
    recipientName: 'R',
    recipientPhone: '0550000000',
    destinationWilaya: '16 - Alger',
    destinationAddress: 'Kouba',
    codAmountDzd: 8500,
    shippingFeeDzd: 600,
    weightKg: 1.8,
    status: 'OutForDelivery',
    createdAt: '2026-05-25T08:00:00Z',
  });
  assert.equal(timeline.shareCode, 'TRK-ATREXP88912');
  assert.equal(timeline.steps.filter((s) => s.completed).length, 5);

  const freight = computeFreightWaybillTotals({ distanceKm: 400, weightTons: 12, ratePerKmDzd: 180 });
  assert.equal(freight.freightHtDzd, 72000);
  assert.ok(freight.totalTtcDzd > freight.totalHtDzd);

  const moving = computeMovingVolumeQuote({
    volumeM3: 25,
    ratePerM3Dzd: 1800,
    distanceKm: 50,
    originFloor: 3,
    destinationFloor: 2,
    hasElevatorOrigin: false,
    hasElevatorDest: true,
    packingIncluded: true,
  });
  assert.equal(moving.stairSurchargeDzd, 7500);

  const coldBreach = evaluateColdChainExcursion({
    recordedTempC: 11.5,
    minAllowedTempC: 2,
    maxAllowedTempC: 8,
    excursionMinutes: 45,
  });
  assert.equal(coldBreach.status, 'Breach');
  assert.equal(coldBreach.requiresQuarantine, true);

  const customs = computeCustomsDossierDuties({
    fobValueDzd: 1000000,
    freightDzd: 150000,
    insuranceDzd: 25000,
    customsDutyRatePercent: 15,
  });
  assert.equal(customs.cifDzd, 1175000);
  assert.equal(customs.customsDutyDzd, 176250);

  const tow = computeTowingDispatchQuote({
    vehicleClass: 'PoidsLourd',
    distanceKm: 40,
    isNightOrWeekend: true,
    needsWinchExtraction: true,
  });
  assert.equal(tow.baseHookDzd, 18000);
  assert.ok(tow.nightSurchargeDzd > 0);
});
