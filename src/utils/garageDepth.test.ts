import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatGarageSequentialCode,
  validateVehiclePlateAndVin,
  validateIntakeOdometer,
  transferVehicleOwnership,
  evaluateVehicleServiceReminders,
  evaluateBayAssignment,
  computeFlatRateLaborLine,
  startTechTimeLog,
  stopTechTimeLog,
  aggregateGaragePayrollCommissions,
  captureQuoteUnitPricesSnapshot,
  detectQuoteToInvoicePriceDrift,
  prepareWorkOrderReopenWithCreditNote,
  createSupplierPurchaseOrder,
  receivePurchaseOrderGoods,
  evaluatePartWarrantyStatus,
  evaluateBodyShopClaim,
  evaluateInspectionPv,
  evaluateTireStorageAlert,
  computeGarageInvoiceTotalsCentimes,
  buildGarageInvoiceScfDraft,
} from './garageDepth';

test('formatGarageSequentialCode generates deterministic sequential codes without gaps', () => {
  const next = formatGarageSequentialCode('OR', ['OR-2026-0041', 'OR-2026-0044', 'OR-2025-0999'], 2026);
  assert.equal(next, 'OR-2026-0045');
  assert.equal(formatGarageSequentialCode('BC-GAR', [], 2026), 'BC-GAR-2026-0001');
});

test('validateVehiclePlateAndVin exempts moto from 17-char VIN while validating 5 plate formats', () => {
  const motoOk = validateVehiclePlateAndVin({
    plateNumber: 'MOTO-16-4412',
    plateFormat: 'moto',
    vehicleType: 'moto',
    vin: 'FRAME991',
  });
  assert.equal(motoOk.valid, true);
  assert.equal(motoOk.vinExempt, true);

  const carBadVin = validateVehiclePlateAndVin({
    plateNumber: '00142-118-16',
    plateFormat: 'algeria_standard',
    vehicleType: 'car',
    vin: 'SHORTVIN',
  });
  assert.equal(carBadVin.valid, false);
  assert.ok(carBadVin.errors.includes('VIN_17_CHARS_REQUIRED_NON_MOTO'));

  const newFormatOk = validateVehiclePlateAndVin({
    plateNumber: '16-00142-22',
    plateFormat: 'algeria_new',
    vehicleType: 'utility',
    vin: 'VF1RFB00123456789',
  });
  assert.equal(newFormatOk.valid, true);
});

test('validateIntakeOdometer blocks mileage regression unless odometer replacement reason provided', () => {
  const blocked = validateIntakeOdometer({
    newKm: 120000,
    recordedKm: 142500,
    lastServiceKm: 138000,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.errorCode, 'GARAGE_MILEAGE_REGRESSION');

  const missingReason = validateIntakeOdometer({
    newKm: 0,
    recordedKm: 142500,
    isOdometerReplaced: true,
    overrideReason: 'OK',
  });
  assert.equal(missingReason.ok, false);
  assert.equal(missingReason.errorCode, 'GARAGE_MILEAGE_OVERRIDE_REASON_REQUIRED');

  const allowedOverride = validateIntakeOdometer({
    newKm: 120,
    recordedKm: 142500,
    isOdometerReplaced: true,
    overrideReason: 'Combiné tableau de bord remplacé neuf suite panne EEPROM',
  });
  assert.equal(allowedOverride.ok, true);
});

test('transferVehicleOwnership logs immutable history and resets previous owner/fleet bindings', () => {
  const { updatedVehicle, historyEntry } = transferVehicleOwnership({
    vehicle: {
      ownerName: 'SARL Logistique Express',
      ownerPhone: '0560112233',
      isFleet: true,
      fleetId: 'fleet_01',
      fleetName: 'Express Colis DZ',
      crmPartyId: 'crm_old',
      mileageKm: 215400,
      ownershipHistory: [],
    },
    newOwnerName: 'Karim Belkacem',
    newOwnerPhone: '0551998877',
    reason: 'Cession véhicule fin de leasing',
    odometerAtTransferKm: 216000,
  });

  assert.equal(updatedVehicle.ownerName, 'Karim Belkacem');
  assert.equal(updatedVehicle.isFleet, false);
  assert.equal(updatedVehicle.fleetId, undefined);
  assert.equal(updatedVehicle.crmPartyId, undefined);
  assert.equal(updatedVehicle.mileageKm, 216000);
  assert.equal(updatedVehicle.ownershipHistory?.length, 1);
  assert.equal(historyEntry.previousOwnerName, 'SARL Logistique Express');
});

test('evaluateVehicleServiceReminders detects vidange, contrôle technique & insurance alerts', () => {
  const alerts = evaluateVehicleServiceReminders(
    {
      mileageKm: 149200,
      nextServiceKm: 150000,
      techControlExpiry: '2026-05-01',
      insuranceExpiry: '2026-05-25',
    },
    '2026-05-10'
  );
  assert.equal(alerts.length, 3);
  assert.equal(alerts.find((a) => a.kind === 'vidange')?.severity, 'due_soon');
  assert.equal(alerts.find((a) => a.kind === 'tech_control')?.severity, 'overdue');
  assert.equal(alerts.find((a) => a.kind === 'insurance')?.severity, 'due_soon');
});

test('evaluateBayAssignment prevents double assignment on occupied bays', () => {
  const blocked = evaluateBayAssignment({
    bay: { id: 'bay_01', name: 'Pont 1', isOccupied: true, activeOrderId: 'ro_01' },
    workOrderId: 'ro_02',
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.errorCode, 'GARAGE_BAY_ALREADY_OCCUPIED');

  const sameOrder = evaluateBayAssignment({
    bay: { id: 'bay_01', name: 'Pont 1', isOccupied: true, activeOrderId: 'ro_01' },
    workOrderId: 'ro_01',
  });
  assert.equal(sameOrder.ok, true);
});

test('flat-rate labor, time clock & payroll commission aggregation work cleanly in centimes', () => {
  const line = computeFlatRateLaborLine({
    item: { code: 'FR-EMB-01', label: 'Remplacement Kit Embrayage', standardHours: 4.5, hourlyRateDzd: 2500 },
    fleetNegotiatedHourlyRateDzd: 2000,
  });
  assert.equal(line.hourlyRateDzd, 2000);
  assert.equal(line.totalDzd, 9000);

  const running = startTechTimeLog({
    branchId: 'branch_garage_main',
    workOrderId: 'ro_04',
    orderNumber: 'OR-2026-0044',
    technicianStaffId: 'stf_tech_01',
    technicianName: 'Karim',
    taskLabel: 'Dépose boîte + embrayage',
    commissionRateBps: 1500,
    startedAtIso: '2026-05-11T08:00:00Z',
  });

  const { completedLog, commissionRecord } = stopTechTimeLog({
    log: running,
    hourlyRateDzd: 2000,
    accountId: 'acc_01',
    businessId: 'biz_garage',
    endedAtIso: '2026-05-11T10:00:00Z',
  });

  assert.equal(completedLog.durationMinutes, 120);
  assert.equal(completedLog.laborRevenueDzd, 4000);
  assert.equal(completedLog.commissionDzd, 600);
  assert.equal(commissionRecord.commissionCentimes, 60000);

  const agg = aggregateGaragePayrollCommissions(
    [{ ...commissionRecord, status: 'posted_to_payroll' }],
    'stf_tech_01',
    '2026-05'
  );
  assert.equal(agg.totalDzd, 600);
});

test('quote-to-invoice price drift & reopen via credit note enforce audit integrity', () => {
  const snap = captureQuoteUnitPricesSnapshot([
    { partId: 'p_01', unitPriceDzd: 4500 },
    { partId: 'p_02', unitPriceDzd: 11000 },
  ]);
  const drift = detectQuoteToInvoicePriceDrift({
    partsUsed: [
      { partId: 'p_01', sku: 'BRK-PLQ-01', name: 'Plaquettes', quantity: 2, unitPriceDzd: 4500 },
      { partId: 'p_02', sku: 'BRK-DSC-02', name: 'Disques', quantity: 1, unitPriceDzd: 11000 },
    ],
    quoteUnitPricesSnapshot: snap,
    catalogParts: [
      { id: 'p_01', sellingPriceDzd: 5200 },
      { id: 'p_02', sellingPriceDzd: 11000 },
    ],
  });
  assert.equal(drift.hasDrift, true);
  assert.equal(drift.items.length, 1);
  assert.equal(drift.totalDeltaDzd, 1400);

  assert.throws(
    () =>
      prepareWorkOrderReopenWithCreditNote({
        order: { id: 'ro_03', isLockedInvoiced: true, invoiceId: 'inv_01', status: 'Delivered' },
        creditNoteId: '',
        creditNoteNumber: '',
        reason: 'Erreur pièce',
      }),
    /GARAGE_REOPEN_REQUIRES_CREDIT_NOTE/
  );

  const reopened = prepareWorkOrderReopenWithCreditNote({
    order: { id: 'ro_03', isLockedInvoiced: true, invoiceId: 'inv_01', status: 'Delivered' },
    creditNoteId: 'cn_01',
    creditNoteNumber: 'AV-2026-0001',
    reason: 'Avoir émis pour ajout parallélisme',
  });
  assert.equal(reopened.isLockedInvoiced, false);
  assert.equal(reopened.status, 'InRepair');
  assert.equal(reopened.reopenCreditNoteId, 'cn_01');
});

test('purchasing PO receipt, warranty tracking & specialty engines compute accurately', () => {
  const po = createSupplierPurchaseOrder({
    branchId: 'branch_garage_main',
    existingPoNumbers: [],
    supplierId: 'sup_01',
    supplierName: 'SARL Bosch Pièces DZ',
    items: [{ partId: 'p_01', sku: 'BRK-PLQ-01', name: 'Plaquettes', quantity: 10, unitCostDzd: 2800 }],
    warrantyMonths: 12,
    nowIso: '2026-05-10T10:00:00Z',
  });
  assert.equal(po.poNumber, 'BC-GAR-2026-0001');
  assert.equal(po.totalDzd, 28000);

  const { updatedPo, stockAdjustments } = receivePurchaseOrderGoods({
    po,
    deliveryNoteNumber: 'BL-88412',
    receivedByName: 'Mounir (Magasinier)',
    receivedAtIso: '2026-05-12T14:00:00Z',
  });
  assert.equal(updatedPo.status, 'Received');
  assert.equal(updatedPo.warrantyExpiryDate, '2027-05-12');
  assert.equal(stockAdjustments[0].addedQty, 10);

  const warranty = evaluatePartWarrantyStatus(updatedPo, '2026-06-01');
  assert.equal(warranty.status, 'active');

  const claimSplit = evaluateBodyShopClaim({ claimedDzd: 185000, approvedDzd: 165000, deductibleDzd: 15000 });
  assert.equal(claimSplit.insurerShareDzd, 150000);
  assert.equal(claimSplit.clientShareDzd, 35000);

  const pvContre = evaluateInspectionPv(
    [
      { code: 'CT-01', label: 'Freinage', category: 'freinage', result: 'major_defect' },
      { code: 'CT-03', label: 'Feux', category: 'eclairage', result: 'minor_defect' },
    ],
    '2026-05-10'
  );
  assert.equal(pvContre.verdict, 'contre_visite');
  assert.equal(pvContre.defectsCount, 2);
  assert.equal(pvContre.majorDefectsCount, 1);

  const tireWarn = evaluateTireStorageAlert(
    { treadDepthMm: 2.4, dueSwapDate: '2026-05-01', status: 'stored' },
    '2026-05-10'
  );
  assert.equal(tireWarn.status, 'replace_recommended');
  assert.equal(tireWarn.warnings.length, 2);
});

test('garage invoice centimes calculation & SCF journal draft balance cleanly', () => {
  const totals = computeGarageInvoiceTotalsCentimes({
    laborTotalDzd: 4200,
    partsTotalDzd: 17290,
    partsDiscountPercent: 5,
    billingType: 'facture_dgi',
    paymentMethod: 'especes',
  });
  const scf = buildGarageInvoiceScfDraft({
    invoiceNumber: 'FAC-2026-00129',
    orderNumber: 'OR-2026-0041',
    clientName: 'SARL Atlas',
    laborTotalHtDzd: totals.laborTotalHt,
    partsTotalHtDzd: totals.partsTotalHt - totals.discountHt,
    discountHtDzd: totals.discountHt,
    tvaAmountDzd: totals.tvaAmount,
    timbreFiscalDzd: totals.timbreFiscal,
    totalTtcDzd: totals.totalTtc,
    netToPayDzd: totals.netToPayDzd,
    paymentMethod: 'especes',
    isPaid: true,
  });
  const totalDebit = scf.lines.reduce((s, l) => s + l.debitCentimes, 0);
  const totalCredit = scf.lines.reduce((s, l) => s + l.creditCentimes, 0);
  assert.equal(totalDebit, totalCredit);
});
