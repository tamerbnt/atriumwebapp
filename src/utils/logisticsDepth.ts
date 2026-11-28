import {
  LogisticsShipment,
  LogisticsManifest,
  CourierCashDischarge,
  MerchantRemittanceBatch,
} from '../types';
import {
  WilayaZone,
  TariffRule,
  DEFAULT_TARIFF_RULES,
  calculateVolumetricWeight,
  computeAlgerianFiscalStamp,
  calculateCcpKey,
  calculateDriverPayout,
} from './logisticsRules';
import { validateCcpAccount } from './algerianPtt';
import { ALGERIA_58_WILAYAS } from './algerianWilayas';
import type { WilayaReferenceRow } from '../lib/supabase/services/referenceDataService';
import { dzdToCentimes, roundHalfAwayFromZero } from './money';

const roundDecimals = (val: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return roundHalfAwayFromZero(val * factor) / factor;
};

export interface ResolvedWilayaOption {
  code: number;
  codeStr: string;
  value: string;
  label: string;
  nameFr: string;
  nameAr: string;
  nameEn: string;
  zone: WilayaZone;
  communes: string[];
  isLegacy: boolean;
  verificationStatus: 'unverified' | 'verified';
}

export interface WilayaCatalogResolution {
  options: ResolvedWilayaOption[];
  activeCount: number;
  byCode: Map<number, ResolvedWilayaOption>;
}

function getDefaultWilayaReferenceRows(): WilayaReferenceRow[] {
  return ALGERIA_58_WILAYAS.map((w) => ({
    code: w.code,
    nameFr: w.nameFr,
    nameAr: w.nameAr,
    nameEn: w.nameFr,
    defaultZone: w.zone,
    communes: w.communes,
    validFrom: null,
    validTo: null,
    isLegacy: true,
    verificationStatus: 'unverified',
    verifiedBy: null,
    verifiedAt: null,
    updatedAt: '',
  }));
}

/**
 * Resolves runtime wilaya catalog from `wilayas_ref` rows (or local fallback when offline),
 * filtering expired rows when `validTo` is before `asOfDate`.
 */
export function resolveWilayaCatalog(
  rows?: WilayaReferenceRow[] | null,
  asOfDate: string = new Date().toISOString().slice(0, 10)
): WilayaCatalogResolution {
  const source = Array.isArray(rows) && rows.length > 0 ? rows : getDefaultWilayaReferenceRows();
  const active = source
    .filter((r) => !r.validTo || r.validTo >= asOfDate)
    .sort((a, b) => a.code - b.code);

  const byCode = new Map<number, ResolvedWilayaOption>();
  const options: ResolvedWilayaOption[] = active.map((r) => {
    const codeStr = String(r.code).padStart(2, '0');
    const opt: ResolvedWilayaOption = {
      code: r.code,
      codeStr,
      value: `${codeStr} - ${r.nameFr}`,
      label: `${codeStr} - ${r.nameFr}`,
      nameFr: r.nameFr,
      nameAr: r.nameAr,
      nameEn: r.nameEn || r.nameFr,
      zone: (r.defaultZone || 'Zone3_Nord') as WilayaZone,
      communes: Array.isArray(r.communes) ? r.communes : [],
      isLegacy: Boolean(r.isLegacy),
      verificationStatus: r.verificationStatus === 'verified' ? 'verified' : 'unverified',
    };
    byCode.set(r.code, opt);
    return opt;
  });

  return {
    options,
    activeCount: options.length,
    byCode,
  };
}

export interface ZoneResolutionResult {
  zone: WilayaZone;
  matchedCode: number | null;
  matchedName: string | null;
  isUnknownWilaya: boolean;
}

/**
 * Dynamically resolves tariff zone from `wilayas_ref` catalog without hardcoding static lists.
 * Gracefully falls back when an older or unrecognized wilaya code is encountered.
 */
export function resolveWilayaZone(
  wilayaInput: string | number | null | undefined,
  rows?: WilayaReferenceRow[] | null
): ZoneResolutionResult {
  const catalog = resolveWilayaCatalog(rows);
  const raw = String(wilayaInput ?? '').trim();
  const codeMatch = raw.match(/^\s*(\d{1,3})/);
  if (codeMatch) {
    const code = Number(codeMatch[1]);
    const found = catalog.byCode.get(code);
    if (found) {
      return {
        zone: found.zone,
        matchedCode: found.code,
        matchedName: found.nameFr,
        isUnknownWilaya: false,
      };
    }
  }

  const lower = raw.toLowerCase();
  if (lower) {
    const byName = catalog.options.find(
      (o) =>
        o.nameFr.toLowerCase() === lower ||
        o.nameEn.toLowerCase() === lower ||
        lower.includes(o.nameFr.toLowerCase()) ||
        (o.nameAr && raw.includes(o.nameAr))
    );
    if (byName) {
      return {
        zone: byName.zone,
        matchedCode: byName.code,
        matchedName: byName.nameFr,
        isUnknownWilaya: false,
      };
    }
  }

  return {
    zone: 'Zone4_Plateaux',
    matchedCode: codeMatch ? Number(codeMatch[1]) : null,
    matchedName: raw || null,
    isUnknownWilaya: true,
  };
}

/**
 * Computes zone examples from active `wilayas_ref` rows so tariff UI labels remain synced.
 */
export function buildZoneExamplesFromCatalog(
  rows?: WilayaReferenceRow[] | null
): Record<WilayaZone, string> {
  const catalog = resolveWilayaCatalog(rows);
  const grouped: Record<WilayaZone, string[]> = {
    Zone1_Local: [],
    Zone2_Proche: [],
    Zone3_Nord: [],
    Zone4_Plateaux: [],
    Zone5_Sud: [],
    Zone6_GrandSud: [],
  };

  for (const w of catalog.options) {
    grouped[w.zone]?.push(`${w.codeStr} ${w.nameFr}`);
  }

  return {
    Zone1_Local: grouped.Zone1_Local.slice(0, 4).join(', '),
    Zone2_Proche: grouped.Zone2_Proche.slice(0, 5).join(', '),
    Zone3_Nord: grouped.Zone3_Nord.slice(0, 6).join(', '),
    Zone4_Plateaux: grouped.Zone4_Plateaux.slice(0, 6).join(', '),
    Zone5_Sud: grouped.Zone5_Sud.slice(0, 6).join(', '),
    Zone6_GrandSud: grouped.Zone6_GrandSud.slice(0, 6).join(', '),
  };
}

export interface VolumetricBillingDetails {
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  usedVolumetric: boolean;
  overageKg: number;
  weightSurchargeDzd: number;
}

/**
 * Explicit volumetric vs actual weight rounding edge-case calculator (divisor 5000, ceil overage kg).
 */
export function computeVolumetricBillingDetails(params: {
  actualWeightKg: number;
  dimensionsCm?: { length: number; width: number; height: number } | null;
  rule?: TariffRule;
}): VolumetricBillingDetails {
  const rule = params.rule || DEFAULT_TARIFF_RULES.Zone3_Nord;
  const safeActual = Math.max(0.1, roundDecimals(Number(params.actualWeightKg) || 0, 2));
  const dims = params.dimensionsCm;
  const volRaw =
    dims && dims.length > 0 && dims.width > 0 && dims.height > 0
      ? calculateVolumetricWeight(dims.length, dims.width, dims.height)
      : 0;
  const billableWeightKg = Math.max(safeActual, volRaw);
  const usedVolumetric = volRaw > safeActual;
  const overageKg =
    billableWeightKg > rule.baseWeightKg
      ? Math.ceil(Number((billableWeightKg - rule.baseWeightKg).toFixed(4)))
      : 0;

  return {
    actualWeightKg: safeActual,
    volumetricWeightKg: volRaw,
    billableWeightKg,
    usedVolumetric,
    overageKg,
    weightSurchargeDzd: overageKg * rule.overweightPerKgDzd,
  };
}

export type HubScanStage = 'Intake' | 'Bagging' | 'Unbagging';

export interface DuplicateScanCheckResult {
  isDuplicate: boolean;
  reason?: 'ALREADY_SCANNED_IN_SESSION' | 'ALREADY_IN_TARGET_STAGE' | 'ALREADY_IN_ACTIVE_BAG';
  targetStatus: LogisticsShipment['status'];
}

/**
 * Prevents blind duplicate hub scans in the same stage or session.
 */
export function detectDuplicateParcelScan(params: {
  trackingCode: string;
  stage: HubScanStage;
  shipmentStatus: LogisticsShipment['status'];
  currentBagId?: string;
  targetBagId?: string;
  recentSessionScans: ReadonlyArray<{ code: string; stage?: HubScanStage; status: 'success' | 'error' | 'duplicate' }>;
}): DuplicateScanCheckResult {
  const clean = params.trackingCode.trim().toUpperCase();
  const targetStatus: LogisticsShipment['status'] =
    params.stage === 'Bagging' ? 'Sorted' : 'ReceivedAtHub';

  const alreadyInSession = params.recentSessionScans.some(
    (h) => h.code.toUpperCase() === clean && h.status === 'success' && (!h.stage || h.stage === params.stage)
  );
  if (alreadyInSession) {
    return {
      isDuplicate: true,
      reason: 'ALREADY_SCANNED_IN_SESSION',
      targetStatus,
    };
  }

  if (params.stage === 'Bagging' && params.targetBagId && params.currentBagId === params.targetBagId && params.shipmentStatus === 'Sorted') {
    return {
      isDuplicate: true,
      reason: 'ALREADY_IN_ACTIVE_BAG',
      targetStatus,
    };
  }

  if (params.shipmentStatus === targetStatus) {
    return {
      isDuplicate: true,
      reason: 'ALREADY_IN_TARGET_STAGE',
      targetStatus,
    };
  }

  return {
    isDuplicate: false,
    targetStatus,
  };
}

export interface OtpAttemptEvaluation {
  matched: boolean;
  attemptsUsed: number;
  remainingAttempts: number;
  isLockedOut: boolean;
  canUnlockWithManagerPin: boolean;
}

export const STOP_DESK_MAX_OTP_ATTEMPTS = 3;

/**
 * Evaluates Stop-Desk OTP verification with strict retry limits and lockout enforcement.
 */
export function evaluateOtpAttemptLockout(params: {
  expectedOtp: string;
  enteredOtp: string;
  currentAttempts: number;
  maxAttempts?: number;
  isLockedOut?: boolean;
}): OtpAttemptEvaluation {
  const max = Math.max(1, params.maxAttempts ?? STOP_DESK_MAX_OTP_ATTEMPTS);
  if (params.isLockedOut || params.currentAttempts >= max) {
    return {
      matched: false,
      attemptsUsed: Math.max(max, params.currentAttempts),
      remainingAttempts: 0,
      isLockedOut: true,
      canUnlockWithManagerPin: true,
    };
  }

  const matched = Boolean(params.expectedOtp) && params.enteredOtp.trim() === params.expectedOtp.trim();
  if (matched) {
    return {
      matched: true,
      attemptsUsed: params.currentAttempts,
      remainingAttempts: max - params.currentAttempts,
      isLockedOut: false,
      canUnlockWithManagerPin: true,
    };
  }

  const nextAttempts = params.currentAttempts + 1;
  const locked = nextAttempts >= max;
  return {
    matched: false,
    attemptsUsed: nextAttempts,
    remainingAttempts: Math.max(0, max - nextAttempts),
    isLockedOut: locked,
    canUnlockWithManagerPin: true,
  };
}

export interface CourierDischargeWithVarianceResult {
  grossCountedDzd: number;
  counterfeitDeductionDzd: number;
  damagedDeductionDzd: number;
  usableCashDzd: number;
  cashDiscrepancyDzd: number;
  parcelCountDelta: number;
  parcelCountMismatch: boolean;
  requiresSupervisorReview: boolean;
  status: 'Clean' | 'Shortage' | 'Surplus';
}

/**
 * Full cash + banknote + counterfeit/damaged + parcel count reconciliation for driver discharge.
 */
export function computeCourierDischargeWithVariance(params: {
  expectedAmountDzd: number;
  expectedParcelCount: number;
  deliveredCount: number;
  returnedCount: number;
  note2000Count: number;
  note1000Count: number;
  note500Count: number;
  note200Count: number;
  coinsDzd: number;
  counterfeitAmountDzd?: number;
  damagedAmountDzd?: number;
}): CourierDischargeWithVarianceResult {
  const grossCountedDzd =
    Math.max(0, params.note2000Count) * 2000 +
    Math.max(0, params.note1000Count) * 1000 +
    Math.max(0, params.note500Count) * 500 +
    Math.max(0, params.note200Count) * 200 +
    Math.max(0, params.coinsDzd);

  const counterfeitDeductionDzd = Math.max(0, Number(params.counterfeitAmountDzd || 0));
  const damagedDeductionDzd = Math.max(0, Number(params.damagedAmountDzd || 0));
  const usableCashDzd = Math.max(0, grossCountedDzd - counterfeitDeductionDzd - damagedDeductionDzd);
  const cashDiscrepancyDzd = usableCashDzd - Math.max(0, params.expectedAmountDzd);

  const accountedParcels = Math.max(0, params.deliveredCount) + Math.max(0, params.returnedCount);
  const parcelCountDelta = accountedParcels - Math.max(0, params.expectedParcelCount);
  const parcelCountMismatch = params.expectedParcelCount > 0 && parcelCountDelta !== 0;

  let status: 'Clean' | 'Shortage' | 'Surplus' = 'Clean';
  if (cashDiscrepancyDzd < 0) status = 'Shortage';
  else if (cashDiscrepancyDzd > 0) status = 'Surplus';

  const requiresSupervisorReview =
    status !== 'Clean' ||
    counterfeitDeductionDzd > 0 ||
    damagedDeductionDzd > 0 ||
    parcelCountMismatch;

  return {
    grossCountedDzd,
    counterfeitDeductionDzd,
    damagedDeductionDzd,
    usableCashDzd,
    cashDiscrepancyDzd,
    parcelCountDelta,
    parcelCountMismatch,
    requiresSupervisorReview,
    status,
  };
}

export interface RemittanceCcpValidationIssue {
  batchId: string;
  batchNumber: string;
  merchantName: string;
  expectedKey: number;
  providedKey: number;
  error: string;
}

export interface RemittanceCcpBatchValidationResult {
  isValid: boolean;
  validBatches: MerchantRemittanceBatch[];
  invalidIssues: RemittanceCcpValidationIssue[];
}

/**
 * Strictly validates Algérie Poste CCP account syntax + Clé 97 checksum on remittance batches.
 * Blocks execution and SFP 01 export whenever any batch fails CCP 97 verification.
 */
export function validateRemittanceCcpBatch(
  batches: ReadonlyArray<MerchantRemittanceBatch>
): RemittanceCcpBatchValidationResult {
  const validBatches: MerchantRemittanceBatch[] = [];
  const invalidIssues: RemittanceCcpValidationIssue[] = [];

  for (const b of batches) {
    const syntax = validateCcpAccount(b.ccpAccount, String(b.ccpKey));
    const expectedKey = calculateCcpKey(b.ccpAccount);
    const providedKey = Number(b.ccpKey);

    if (!syntax.isValid) {
      invalidIssues.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        merchantName: b.merchantName,
        expectedKey,
        providedKey,
        error: syntax.error || 'Format CCP invalide',
      });
      continue;
    }

    if (expectedKey !== providedKey) {
      invalidIssues.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        merchantName: b.merchantName,
        expectedKey,
        providedKey,
        error: `Clé CCP 97 invalide (attendue: ${String(expectedKey).padStart(2, '0')}, saisie: ${String(providedKey).padStart(2, '0')})`,
      });
      continue;
    }

    if (b.netPayoutDzd <= 0) {
      invalidIssues.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        merchantName: b.merchantName,
        expectedKey,
        providedKey,
        error: 'Montant net à virer doit être positif',
      });
      continue;
    }

    validBatches.push(b);
  }

  return {
    isValid: invalidIssues.length === 0 && validBatches.length > 0,
    validBatches,
    invalidIssues,
  };
}

export interface OptimizedRouteStop {
  stopIndex: number;
  shipmentId: string;
  trackingCode: string;
  wilayaCode: number;
  wilayaLabel: string;
  commune: string;
  deliveryMode: 'HomeDelivery' | 'StopDesk';
  recipientName: string;
  recipientPhone: string;
  codAmountDzd: number;
  weightKg: number;
  priorityScore: number;
}

export interface RouteOptimizationPlan {
  stops: OptimizedRouteStop[];
  totalParcels: number;
  totalCodDzd: number;
  totalWeightKg: number;
  distinctWilayas: number;
  stopDeskStops: number;
  homeStops: number;
}

/**
 * Optimizes delivery stops by Wilaya code cluster -> Stop-Desk hub dropoffs first -> commune -> COD value desc.
 */
export function optimizeManifestRouteStops(
  shipments: ReadonlyArray<LogisticsShipment>
): RouteOptimizationPlan {
  const active = shipments.filter((s) => s.status !== 'Delivered' && s.status !== 'Cancelled' && s.status !== 'Returned');

  const scored = active.map((s) => {
    const codeMatch = String(s.destinationWilaya || '').match(/^\s*(\d{1,3})/);
    const wilayaCode = codeMatch ? Number(codeMatch[1]) : 99;
    const modePriority = s.deliveryMode === 'StopDesk' ? 0 : 1;
    const priorityScore = wilayaCode * 1000 + modePriority * 100 - Math.min(99, Math.floor((s.codAmountDzd || 0) / 1000));
    return { s, wilayaCode, priorityScore };
  });

  scored.sort((a, b) => {
    if (a.wilayaCode !== b.wilayaCode) return a.wilayaCode - b.wilayaCode;
    const modeA = a.s.deliveryMode === 'StopDesk' ? 0 : 1;
    const modeB = b.s.deliveryMode === 'StopDesk' ? 0 : 1;
    if (modeA !== modeB) return modeA - modeB;
    const commCmp = (a.s.destinationAddress || '').localeCompare(b.s.destinationAddress || '');
    if (commCmp !== 0) return commCmp;
    return (b.s.codAmountDzd || 0) - (a.s.codAmountDzd || 0);
  });

  const wilayaSet = new Set<number>();
  let totalCodDzd = 0;
  let totalWeightKg = 0;
  let stopDeskStops = 0;
  let homeStops = 0;

  const stops: OptimizedRouteStop[] = scored.map(({ s, wilayaCode, priorityScore }, idx) => {
    wilayaSet.add(wilayaCode);
    totalCodDzd += s.codAmountDzd || 0;
    totalWeightKg += s.weightKg || 0;
    if (s.deliveryMode === 'StopDesk') stopDeskStops += 1;
    else homeStops += 1;
    return {
      stopIndex: idx + 1,
      shipmentId: s.id,
      trackingCode: s.trackingCode,
      wilayaCode,
      wilayaLabel: s.destinationWilaya,
      commune: s.destinationAddress,
      deliveryMode: s.deliveryMode === 'StopDesk' ? 'StopDesk' : 'HomeDelivery',
      recipientName: s.recipientName,
      recipientPhone: s.recipientPhone,
      codAmountDzd: s.codAmountDzd || 0,
      weightKg: s.weightKg || 0,
      priorityScore,
    };
  });

  return {
    stops,
    totalParcels: stops.length,
    totalCodDzd,
    totalWeightKg: roundDecimals(totalWeightKg, 2),
    distinctWilayas: wilayaSet.size,
    stopDeskStops,
    homeStops,
  };
}

export interface LiveDriverPayrollSummary {
  driverName: string;
  employmentType: 'salaried' | 'freelance_commission';
  deliveredCount: number;
  returnedCount: number;
  codCollectedDzd: number;
  dischargeShortageDzd: number;
  grossCompensationDzd: number;
  taxWithheldDzd: number;
  netPayableAfterDeductionsDzd: number;
}

/**
 * Aggregates live per-driver payroll compensation from shipments and cash discharges (no hardcoded counts).
 */
export function aggregateDriverPayrollSummaries(params: {
  shipments: ReadonlyArray<LogisticsShipment>;
  discharges: ReadonlyArray<CourierCashDischarge>;
  manifests?: ReadonlyArray<LogisticsManifest>;
  baseSalaryMonthlyDzd?: number;
  commissionPerDeliveredDzd?: number;
  commissionPerReturnDzd?: number;
  fuelAllowanceDzd?: number;
}): LiveDriverPayrollSummary[] {
  const driverMap = new Map<
    string,
    { delivered: number; returned: number; cod: number; shortage: number }
  >();

  const ensure = (name: string) => {
    const clean = name.trim() || 'Livreur Hub';
    if (!driverMap.has(clean)) {
      driverMap.set(clean, { delivered: 0, returned: 0, cod: 0, shortage: 0 });
    }
    return driverMap.get(clean)!;
  };

  for (const s of params.shipments) {
    if (!s.assignedDriverName) continue;
    const entry = ensure(s.assignedDriverName);
    if (s.status === 'Delivered') {
      entry.delivered += 1;
      entry.cod += s.codAmountDzd || 0;
    } else if (s.status === 'Returned') {
      entry.returned += 1;
    }
  }

  for (const d of params.discharges) {
    const entry = ensure(d.courierStaffId);
    entry.delivered = Math.max(entry.delivered, d.deliveredCount || 0);
    entry.returned = Math.max(entry.returned, d.returnedCount || 0);
    if (d.discrepancyDzd < 0) {
      entry.shortage += Math.abs(d.discrepancyDzd);
    }
  }

  if (driverMap.size === 0 && params.manifests) {
    for (const m of params.manifests) {
      ensure(m.driverName);
    }
  }

  const summaries: LiveDriverPayrollSummary[] = [];
  let idx = 0;
  for (const [driverName, counts] of driverMap.entries()) {
    const employmentType: 'salaried' | 'freelance_commission' =
      driverName.toLowerCase().includes('van') || idx % 2 === 0
        ? 'salaried'
        : 'freelance_commission';
    idx += 1;

    const comp = calculateDriverPayout({
      employmentType,
      completedDeliveries: counts.delivered,
      returnedDeliveries: counts.returned,
      baseSalaryMonthlyDzd: params.baseSalaryMonthlyDzd ?? 48000,
      commissionPerDeliveredDzd: params.commissionPerDeliveredDzd ?? 220,
      commissionPerReturnDzd: params.commissionPerReturnDzd ?? 50,
      fuelAllowanceDzd: counts.delivered > 0 ? (params.fuelAllowanceDzd ?? 1500) : 0,
      withholdingTaxRatePercent: 5,
    });

    const netAfterShortage = Math.max(0, comp.netPayoutDzd - counts.shortage);

    summaries.push({
      driverName,
      employmentType,
      deliveredCount: counts.delivered,
      returnedCount: counts.returned,
      codCollectedDzd: counts.cod,
      dischargeShortageDzd: counts.shortage,
      grossCompensationDzd: comp.grossCompensationDzd,
      taxWithheldDzd: comp.taxWithheldDzd,
      netPayableAfterDeductionsDzd: netAfterShortage,
    });
  }

  return summaries.sort((a, b) => b.netPayableAfterDeductionsDzd - a.netPayableAfterDeductionsDzd);
}

export interface MerchantFeeInvoiceSummary {
  merchantName: string;
  periodLabel: string;
  deliveredCount: number;
  returnedCount: number;
  grossCodDzd: number;
  deliveryFeesHtDzd: number;
  returnFeesHtDzd: number;
  tva19Dzd: number;
  stampDutyDzd: number;
  totalFeesTtcDzd: number;
  netMerchantPayableDzd: number;
  grossCodCentimes: number;
  totalFeesTtcCentimes: number;
  netMerchantPayableCentimes: number;
  scfLines: Array<{ accountCode: string; label: string; debitDzd: number; creditDzd: number }>;
}

/**
 * Builds monthly merchant settlement & delivery fee invoice breakdown linked to SCF & unified documents.
 */
export function buildMerchantFeeInvoiceSummary(params: {
  merchantName: string;
  shipments: ReadonlyArray<LogisticsShipment>;
  periodLabel: string;
  returnFeePerParcelDzd?: number;
  tvaRatePercent?: number;
}): MerchantFeeInvoiceSummary {
  const cleanMerchant = params.merchantName.trim();
  const scoped = params.shipments.filter(
    (s) => !cleanMerchant || s.merchantName.toLowerCase() === cleanMerchant.toLowerCase()
  );
  const delivered = scoped.filter((s) => s.status === 'Delivered');
  const returned = scoped.filter((s) => s.status === 'Returned');

  const grossCodDzd = delivered.reduce((sum, s) => sum + (s.codAmountDzd || 0), 0);
  const deliveryFeesHtDzd = delivered.reduce((sum, s) => sum + (s.shippingFeeDzd || 0), 0);
  const returnFeeUnit = params.returnFeePerParcelDzd ?? 200;
  const returnFeesHtDzd = returned.length * returnFeeUnit;
  const taxableFees = deliveryFeesHtDzd + returnFeesHtDzd;
  const tvaRate = params.tvaRatePercent ?? 19;
  const tva19Dzd = roundDecimals((taxableFees * tvaRate) / 100, 0);
  const stampDutyDzd = delivered.reduce(
    (sum, s) => sum + (s.stampDutyDzd ?? computeAlgerianFiscalStamp(s.codAmountDzd || 0)),
    0
  );
  const totalFeesTtcDzd = taxableFees + tva19Dzd;
  const netMerchantPayableDzd = Math.max(0, grossCodDzd - totalFeesTtcDzd);

  const scfLines = [
    { accountCode: '530', label: 'Caisse COD Collectée', debitDzd: grossCodDzd, creditDzd: 0 },
    { accountCode: '706', label: 'Prestations Livraison & Retours HT', debitDzd: 0, creditDzd: taxableFees },
    { accountCode: '4457', label: 'TVA Collectée 19% sur Frais Port', debitDzd: 0, creditDzd: tva19Dzd },
    { accountCode: '467', label: 'Compte Courant Marchand E-Commerce', debitDzd: 0, creditDzd: netMerchantPayableDzd },
  ];

  return {
    merchantName: cleanMerchant || 'Tous Marchands',
    periodLabel: params.periodLabel,
    deliveredCount: delivered.length,
    returnedCount: returned.length,
    grossCodDzd,
    deliveryFeesHtDzd,
    returnFeesHtDzd,
    tva19Dzd,
    stampDutyDzd,
    totalFeesTtcDzd,
    netMerchantPayableDzd,
    grossCodCentimes: dzdToCentimes(grossCodDzd),
    totalFeesTtcCentimes: dzdToCentimes(totalFeesTtcDzd),
    netMerchantPayableCentimes: dzdToCentimes(netMerchantPayableDzd),
    scfLines,
  };
}

export interface TrackingTimelineStep {
  code: string;
  titleFr: string;
  titleEn: string;
  titleAr: string;
  location: string;
  timestamp: string;
  completed: boolean;
  isCurrent: boolean;
  notes?: string;
}

/**
 * Generates ordered recipient tracking milestones + public link metadata.
 */
export function buildPublicTrackingTimeline(
  shipment: LogisticsShipment,
  customEvents: ReadonlyArray<{ status: string; location: string; notes?: string; occurredAt: string }> = []
): { shareCode: string; steps: TrackingTimelineStep[] } {
  const shareCode = `TRK-${shipment.trackingCode.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
  const order: LogisticsShipment['status'][] = [
    'Created',
    'HubIntake',
    'ReceivedAtHub',
    'Sorted',
    'OutForDelivery',
    'Delivered',
  ];
  const currentIdx = order.indexOf(shipment.status);

  const labels: Record<string, { fr: string; en: string; ar: string }> = {
    Created: { fr: 'Bordereau créé par le marchand', en: 'Waybill created by merchant', ar: 'تم إنشاء بوليصة الشحن' },
    HubIntake: { fr: 'Ramassé / Entrée au Hub', en: 'Picked up at origin hub', ar: 'استلام في مركز الانطلاق' },
    ReceivedAtHub: { fr: 'Réceptionné au Hub destination', en: 'Received at hub', ar: 'وصل إلى مركز التوزيع' },
    Sorted: { fr: 'Trié & affecté sur ligne', en: 'Sorted & assigned to line', ar: 'تم الفرز والتوجيه' },
    OutForDelivery: { fr: 'En cours de livraison', en: 'Out for delivery', ar: 'قيد التوصيل مع الموزع' },
    Delivered: { fr: 'Livré au destinataire', en: 'Delivered to recipient', ar: 'تم التسليم بنجاح' },
    Postponed: { fr: 'Tentative reportée', en: 'Delivery postponed', ar: 'تم تأجيل التسليم' },
    Returned: { fr: 'Retour expéditeur initié', en: 'Returned to sender', ar: 'مرتجع إلى المرسل' },
    Cancelled: { fr: 'Expédition annulée', en: 'Shipment cancelled', ar: 'شحنة ملغاة' },
  };

  const steps: TrackingTimelineStep[] = order.map((st, idx) => {
    const lbl = labels[st];
    const matched = customEvents.find((e) => e.status === st);
    return {
      code: st,
      titleFr: lbl.fr,
      titleEn: lbl.en,
      titleAr: lbl.ar,
      location: matched?.location || (idx >= 3 ? shipment.destinationWilaya : 'Hub National Alger 16'),
      timestamp: matched?.occurredAt || (idx === 0 ? shipment.createdAt : ''),
      completed: currentIdx >= idx,
      isCurrent: currentIdx === idx,
      notes: matched?.notes,
    };
  });

  if (shipment.status === 'Postponed' || shipment.status === 'Returned' || shipment.status === 'Cancelled') {
    const lbl = labels[shipment.status];
    steps.push({
      code: shipment.status,
      titleFr: lbl.fr,
      titleEn: lbl.en,
      titleAr: lbl.ar,
      location: shipment.destinationWilaya,
      timestamp: new Date().toISOString(),
      completed: true,
      isCurrent: true,
      notes: shipment.returnReasonCode,
    });
  }

  for (const ev of customEvents) {
    if (!order.includes(ev.status as LogisticsShipment['status']) && ev.status !== shipment.status) {
      steps.push({
        code: ev.status,
        titleFr: ev.notes || ev.status,
        titleEn: ev.notes || ev.status,
        titleAr: ev.notes || ev.status,
        location: ev.location,
        timestamp: ev.occurredAt,
        completed: true,
        isCurrent: false,
        notes: ev.notes,
      });
    }
  }

  return { shareCode, steps };
}

// ============================================================================
// [trade gap] 5 Logistics Specialty Trade Calculators
// ============================================================================

export function computeFreightWaybillTotals(params: {
  distanceKm: number;
  weightTons: number;
  ratePerKmDzd: number;
  fuelSurchargePercent?: number;
  loadingFeeDzd?: number;
  tvaRatePercent?: number;
}) {
  const dist = Math.max(0, params.distanceKm);
  const tons = Math.max(0, params.weightTons);
  const freightHtDzd = Math.round(dist * Math.max(0, params.ratePerKmDzd));
  const fuelDzd = Math.round((freightHtDzd * Math.max(0, params.fuelSurchargePercent ?? 8)) / 100);
  const loadingDzd = Math.max(0, params.loadingFeeDzd ?? 0);
  const totalHtDzd = freightHtDzd + fuelDzd + loadingDzd;
  const tvaDzd = Math.round((totalHtDzd * Math.max(0, params.tvaRatePercent ?? 19)) / 100);
  const totalTtcDzd = totalHtDzd + tvaDzd;
  return {
    distanceKm: dist,
    weightTons: tons,
    freightHtDzd,
    fuelDzd,
    loadingDzd,
    totalHtDzd,
    tvaDzd,
    totalTtcDzd,
    totalTtcCentimes: dzdToCentimes(totalTtcDzd),
  };
}

export function computeMovingVolumeQuote(params: {
  volumeM3: number;
  ratePerM3Dzd: number;
  distanceKm: number;
  originFloor: number;
  destinationFloor: number;
  hasElevatorOrigin: boolean;
  hasElevatorDest: boolean;
  packingIncluded: boolean;
}) {
  const vol = Math.max(1, params.volumeM3);
  const baseVolumeDzd = Math.round(vol * Math.max(0, params.ratePerM3Dzd));
  const roadFeeDzd = Math.round(Math.max(0, params.distanceKm) * 85);
  const carryFloorsOrigin = params.hasElevatorOrigin ? 0 : Math.max(0, params.originFloor);
  const carryFloorsDest = params.hasElevatorDest ? 0 : Math.max(0, params.destinationFloor);
  const stairSurchargeDzd = (carryFloorsOrigin + carryFloorsDest) * 2500;
  const packingFeeDzd = params.packingIncluded ? Math.round(vol * 1200) : 0;
  const totalHtDzd = baseVolumeDzd + roadFeeDzd + stairSurchargeDzd + packingFeeDzd;
  const tvaDzd = Math.round(totalHtDzd * 0.19);
  const totalTtcDzd = totalHtDzd + tvaDzd;
  return {
    volumeM3: vol,
    baseVolumeDzd,
    roadFeeDzd,
    stairSurchargeDzd,
    packingFeeDzd,
    totalHtDzd,
    tvaDzd,
    totalTtcDzd,
  };
}

export function evaluateColdChainExcursion(params: {
  recordedTempC: number;
  minAllowedTempC: number;
  maxAllowedTempC: number;
  excursionMinutes: number;
}) {
  const deltaLow = params.recordedTempC < params.minAllowedTempC ? params.minAllowedTempC - params.recordedTempC : 0;
  const deltaHigh = params.recordedTempC > params.maxAllowedTempC ? params.recordedTempC - params.maxAllowedTempC : 0;
  const maxDeviationC = roundDecimals(Math.max(deltaLow, deltaHigh), 2);
  let status: 'Compliant' | 'Warning' | 'Breach' = 'Compliant';
  if (maxDeviationC > 2 || (maxDeviationC > 0 && params.excursionMinutes >= 30)) {
    status = 'Breach';
  } else if (maxDeviationC > 0) {
    status = 'Warning';
  }
  return {
    status,
    maxDeviationC,
    requiresQuarantine: status === 'Breach',
  };
}

export function computeCustomsDossierDuties(params: {
  fobValueDzd: number;
  freightDzd: number;
  insuranceDzd: number;
  customsDutyRatePercent: number;
  tvaRatePercent?: number;
  transitAgencyFeeDzd?: number;
}) {
  const cifDzd = Math.max(0, params.fobValueDzd) + Math.max(0, params.freightDzd) + Math.max(0, params.insuranceDzd);
  const customsDutyDzd = Math.round((cifDzd * Math.max(0, params.customsDutyRatePercent)) / 100);
  const tvaBaseDzd = cifDzd + customsDutyDzd;
  const tvaDzd = Math.round((tvaBaseDzd * Math.max(0, params.tvaRatePercent ?? 19)) / 100);
  const agencyFeeDzd = Math.max(0, params.transitAgencyFeeDzd ?? 25000);
  const totalPayableDzd = customsDutyDzd + tvaDzd + agencyFeeDzd;
  return {
    cifDzd,
    customsDutyDzd,
    tvaDzd,
    agencyFeeDzd,
    totalPayableDzd,
  };
}

export function computeTowingDispatchQuote(params: {
  vehicleClass: 'VL' | 'Utilitaire' | 'PoidsLourd';
  distanceKm: number;
  isNightOrWeekend: boolean;
  needsWinchExtraction: boolean;
}) {
  const baseHookDzd =
    params.vehicleClass === 'PoidsLourd' ? 18000 : params.vehicleClass === 'Utilitaire' ? 7500 : 4500;
  const ratePerKmDzd =
    params.vehicleClass === 'PoidsLourd' ? 280 : params.vehicleClass === 'Utilitaire' ? 150 : 110;
  const distanceFeeDzd = Math.round(Math.max(0, params.distanceKm) * ratePerKmDzd);
  const winchFeeDzd = params.needsWinchExtraction ? 4500 : 0;
  const subTotal = baseHookDzd + distanceFeeDzd + winchFeeDzd;
  const nightSurchargeDzd = params.isNightOrWeekend ? Math.round(subTotal * 0.25) : 0;
  const totalDzd = subTotal + nightSurchargeDzd;
  return {
    baseHookDzd,
    distanceFeeDzd,
    winchFeeDzd,
    nightSurchargeDzd,
    totalDzd,
  };
}
