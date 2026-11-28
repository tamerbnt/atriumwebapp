import {
  addCentimes,
  centimesToDzd,
  dzdToCentimes,
  multiplyCentimes,
  percentOfCentimes,
  roundHalfAwayFromZero,
  subtractCentimes,
} from './money';
import type {
  GarageTechCommission,
  ScfJournalCode,
  ScfPostingEventType,
} from '../types';
import type { ScfLineDraftInput } from './scfAccountingEngine';

export type GarageVehicleType = 'car' | 'utility' | 'truck' | 'moto';
export type GaragePlateFormat = 'algeria_standard' | 'algeria_new' | 'temporary' | 'foreign' | 'moto';

export interface VehicleOwnershipHistoryEntry {
  id: string;
  previousOwnerName: string;
  previousOwnerPhone?: string;
  previousFleetId?: string;
  previousFleetName?: string;
  newOwnerName: string;
  newOwnerPhone?: string;
  newFleetId?: string;
  newFleetName?: string;
  transferredAt: string;
  reason: string;
  odometerAtTransferKm: number;
}

export interface GarageVehicleValidationInput {
  plateNumber: string;
  plateFormat: GaragePlateFormat;
  vehicleType: GarageVehicleType;
  vin?: string;
}

export interface GarageVehicleValidationResult {
  valid: boolean;
  normalizedPlate: string;
  normalizedVin: string;
  vinExempt: boolean;
  errors: string[];
}

export interface GarageOdometerValidationResult {
  ok: boolean;
  minAllowedKm: number;
  errorCode?: 'GARAGE_MILEAGE_REGRESSION' | 'GARAGE_MILEAGE_OVERRIDE_REASON_REQUIRED';
  errorMessage?: string;
}

export interface GarageServiceReminderAlert {
  kind: 'vidange' | 'tech_control' | 'insurance';
  severity: 'ok' | 'due_soon' | 'overdue';
  daysRemaining?: number;
  kmRemaining?: number;
  targetDate?: string;
  message: string;
}

export interface GarageEstimatePhoto {
  id: string;
  name: string;
  dataUrl: string;
  caption?: string;
  capturedAt: string;
}

export interface FlatRateLaborItem {
  id: string;
  branchId: string;
  code: string;
  label: string;
  category: string;
  standardHours: number;
  hourlyRateDzd: number;
  isActive: boolean;
  version?: number;
}

export interface OrderLaborLine {
  id: string;
  flatRateCode?: string;
  label: string;
  hours: number;
  hourlyRateDzd: number;
  totalDzd: number;
  technicianStaffId?: string;
  technicianName?: string;
}

export interface TechnicianTimeLog {
  id: string;
  branchId: string;
  workOrderId: string;
  orderNumber: string;
  technicianStaffId?: string;
  technicianName: string;
  taskLabel: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  laborRevenueDzd: number;
  commissionRateBps: number;
  commissionDzd: number;
  status: 'running' | 'completed' | 'voided';
  notes?: string;
  version?: number;
}

export interface PriceDriftItem {
  partId: string;
  sku: string;
  name: string;
  quotedUnitPriceDzd: number;
  currentUnitPriceDzd: number;
  quantity: number;
  deltaTotalDzd: number;
}

export interface GarageSupplierRecord {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  wilaya: string;
  specialty: string;
  nif?: string;
  rcNumber?: string;
  email?: string;
  paymentTermsDays: number;
  balanceDzd: number;
  crmPartyId?: string;
  version?: number;
}

export interface GaragePurchaseOrderLine {
  partId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCostDzd: number;
  quantityReceived?: number;
}

export interface GaragePurchaseOrderRecord {
  id: string;
  branchId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
  items: GaragePurchaseOrderLine[];
  totalDzd: number;
  deliveryNoteNumber?: string;
  orderedAt?: string;
  receivedAt?: string;
  receivedByName?: string;
  warrantyMonths: number;
  warrantyExpiryDate?: string;
  linesReceived?: GaragePurchaseOrderLine[];
  notes?: string;
  journalEntryId?: string;
  version?: number;
}

export interface BodyShopInsuranceClaim {
  id: string;
  branchId: string;
  claimNumber: string;
  workOrderId: string;
  orderNumber: string;
  insurerName: string;
  policyNumber?: string;
  expertName?: string;
  accidentDate?: string;
  claimedDzd: number;
  deductibleDzd: number;
  approvedDzd: number;
  insurerShareDzd: number;
  clientShareDzd: number;
  status: 'declared' | 'expert_pending' | 'agreed' | 'repaired' | 'settled' | 'rejected';
  expertPvRef?: string;
  notes?: string;
  version?: number;
}

export interface InspectionChecklistItem {
  code: string;
  label: string;
  category: 'freinage' | 'eclairage' | 'suspension' | 'pollution' | 'pneumatiques' | 'chassis';
  result: 'ok' | 'minor_defect' | 'major_defect' | 'critical_defect';
}

export interface InspectionCenterPv {
  id: string;
  branchId: string;
  pvNumber: string;
  vehicleId?: string;
  workOrderId?: string;
  plateNumber: string;
  odometerKm: number;
  inspectorName: string;
  inspectionDate: string;
  validUntil: string;
  verdict: 'favorable' | 'contre_visite' | 'immobilise';
  checklist: InspectionChecklistItem[];
  defectsCount: number;
  majorDefectsCount: number;
  notes?: string;
  version?: number;
}

export interface DetailingPackage {
  id: string;
  branchId: string;
  code: string;
  name: string;
  tier: 'express' | 'standard' | 'ceramic' | 'ppf';
  durationMinutes: number;
  priceDzd: number;
  includedSteps: string[];
  isActive: boolean;
  version?: number;
}

export interface TireStorageEntry {
  id: string;
  branchId: string;
  storageTag: string;
  vehicleId?: string;
  plateNumber: string;
  ownerName: string;
  season: 'summer' | 'winter' | 'all_season';
  tireSize: string;
  brand?: string;
  quantity: number;
  treadDepthMm: number;
  rackLocation: string;
  storedAt: string;
  dueSwapDate?: string;
  status: 'stored' | 'mounted' | 'disposed';
  notes?: string;
  version?: number;
}

export const DEFAULT_INSPECTION_CHECKLIST: readonly Omit<InspectionChecklistItem, 'result'>[] = [
  { code: 'CT-01', label: 'Efficacité & déséquilibre freinage avant/arrière', category: 'freinage' },
  { code: 'CT-02', label: 'Frein de stationnement & flexibles hydrauliques', category: 'freinage' },
  { code: 'CT-03', label: 'Réglage feux de croisement, route & signalisation', category: 'eclairage' },
  { code: 'CT-04', label: 'Jeu direction, rotules & amortisseurs', category: 'suspension' },
  { code: 'CT-05', label: 'Profondeur sculptures pneus (>= 1.6mm) & jantes', category: 'pneumatiques' },
  { code: 'CT-06', label: 'Opacité fumées / émissions CO-CO2 échappement', category: 'pollution' },
  { code: 'CT-07', label: 'Intégrité châssis, soubassement & pare-brise', category: 'chassis' },
] as const;

export function formatGarageSequentialCode(
  prefix: string,
  existingCodes: string[],
  year = new Date().getFullYear()
): string {
  const yearToken = `${prefix}-${year}-`;
  let maxSeq = 0;
  for (const code of existingCodes) {
    if (!code || !code.startsWith(yearToken)) continue;
    const tail = code.slice(yearToken.length);
    const num = Number.parseInt(tail, 10);
    if (Number.isFinite(num) && num > maxSeq) maxSeq = num;
  }
  return `${yearToken}${String(maxSeq + 1).padStart(4, '0')}`;
}

export function validateVehiclePlateAndVin(input: GarageVehicleValidationInput): GarageVehicleValidationResult {
  const normalizedPlate = (input.plateNumber || '').trim().toUpperCase();
  const normalizedVin = (input.vin || '').trim().toUpperCase();
  const vinExempt = input.vehicleType === 'moto';
  const errors: string[] = [];

  if (!normalizedPlate || normalizedPlate.length < 4) {
    errors.push('PLATE_REQUIRED');
  } else {
    if (input.plateFormat === 'algeria_standard' && !/^[0-9]{3,6}-[0-9]{3}-[0-9]{2}$/.test(normalizedPlate)) {
      errors.push('PLATE_FORMAT_ALGERIA_STANDARD');
    } else if (input.plateFormat === 'algeria_new' && !/^[0-9]{2}-[0-9]{4,6}-[0-9]{2}$/.test(normalizedPlate)) {
      errors.push('PLATE_FORMAT_ALGERIA_NEW');
    } else if (input.plateFormat === 'temporary' && !/^(WW|PROV|TEMP)[-\s]?[A-Z0-9-]{3,}$/.test(normalizedPlate)) {
      errors.push('PLATE_FORMAT_TEMPORARY');
    }
  }

  if (!vinExempt && normalizedVin.length > 0 && normalizedVin.length !== 17) {
    errors.push('VIN_17_CHARS_REQUIRED_NON_MOTO');
  }

  return {
    valid: errors.length === 0,
    normalizedPlate,
    normalizedVin,
    vinExempt,
    errors,
  };
}

export function validateIntakeOdometer(params: {
  newKm: number;
  recordedKm: number;
  lastServiceKm?: number;
  isOdometerReplaced?: boolean;
  overrideReason?: string;
}): GarageOdometerValidationResult {
  const minAllowedKm = Math.max(
    0,
    Number.isFinite(params.recordedKm) ? params.recordedKm : 0,
    Number.isFinite(params.lastServiceKm || 0) ? (params.lastServiceKm || 0) : 0
  );
  const entered = Number.isFinite(params.newKm) ? params.newKm : 0;

  if (entered < minAllowedKm) {
    if (params.isOdometerReplaced) {
      if ((params.overrideReason || '').trim().length < 5) {
        return {
          ok: false,
          minAllowedKm,
          errorCode: 'GARAGE_MILEAGE_OVERRIDE_REASON_REQUIRED',
          errorMessage: 'Précisez le motif de remplacement du compteur kilométrique (min. 5 caractères).',
        };
      }
      return { ok: true, minAllowedKm };
    }
    return {
      ok: false,
      minAllowedKm,
      errorCode: 'GARAGE_MILEAGE_REGRESSION',
      errorMessage: `Régression kilométrique bloquée : ${entered.toLocaleString()} km < ${minAllowedKm.toLocaleString()} km enregistrés.`,
    };
  }

  return { ok: true, minAllowedKm };
}

export function transferVehicleOwnership<
  T extends {
    ownerName: string;
    ownerPhone?: string;
    ownerEmail?: string;
    isFleet?: boolean;
    fleetId?: string;
    fleetName?: string;
    crmPartyId?: string;
    mileageKm: number;
    ownershipHistory?: VehicleOwnershipHistoryEntry[];
  }
>(params: {
  vehicle: T;
  newOwnerName: string;
  newOwnerPhone: string;
  newOwnerEmail?: string;
  newFleetId?: string;
  newFleetName?: string;
  reason: string;
  transferredAtIso?: string;
  odometerAtTransferKm?: number;
}): { updatedVehicle: T & { ownershipHistory: VehicleOwnershipHistoryEntry[] }; historyEntry: VehicleOwnershipHistoryEntry } {
  const { vehicle } = params;
  const newName = params.newOwnerName.trim();
  const newPhone = params.newOwnerPhone.trim();
  const cleanReason = params.reason.trim();
  if (!newName) throw new Error('NEW_OWNER_NAME_REQUIRED');
  if (cleanReason.length < 3) throw new Error('OWNERSHIP_TRANSFER_REASON_REQUIRED');

  const transferredAt = params.transferredAtIso || new Date().toISOString();
  const odometerAtTransferKm =
    typeof params.odometerAtTransferKm === 'number' && params.odometerAtTransferKm >= 0
      ? params.odometerAtTransferKm
      : vehicle.mileageKm;

  const historyEntry: VehicleOwnershipHistoryEntry = {
    id: `own_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    previousOwnerName: vehicle.ownerName,
    previousOwnerPhone: vehicle.ownerPhone,
    previousFleetId: vehicle.fleetId,
    previousFleetName: vehicle.fleetName,
    newOwnerName: newName,
    newOwnerPhone: newPhone,
    newFleetId: params.newFleetId,
    newFleetName: params.newFleetName,
    transferredAt,
    reason: cleanReason,
    odometerAtTransferKm,
  };

  const existingHistory = Array.isArray(vehicle.ownershipHistory) ? vehicle.ownershipHistory : [];
  const updatedVehicle: T = {
    ...vehicle,
    ownerName: newName,
    ownerPhone: newPhone,
    ownerEmail: params.newOwnerEmail?.trim() || undefined,
    isFleet: Boolean(params.newFleetId || params.newFleetName),
    fleetId: params.newFleetId || undefined,
    fleetName: params.newFleetName || undefined,
    crmPartyId: undefined,
    mileageKm: Math.max(vehicle.mileageKm, odometerAtTransferKm),
    ownershipHistory: [historyEntry, ...existingHistory],
  };

  return {
    updatedVehicle: updatedVehicle as T & { ownershipHistory: VehicleOwnershipHistoryEntry[] },
    historyEntry,
  };
}

export function evaluateVehicleServiceReminders(
  vehicle: {
    mileageKm: number;
    lastServiceDate?: string;
    nextServiceKm?: number;
    nextServiceDate?: string;
    dailyAvgKm?: number;
    techControlExpiry?: string;
    insuranceExpiry?: string;
  },
  todayIso = new Date().toISOString().slice(0, 10)
): GarageServiceReminderAlert[] {
  const alerts: GarageServiceReminderAlert[] = [];
  const todayMs = Date.parse(`${todayIso.slice(0, 10)}T00:00:00Z`);

  // 1. Vidange (km + estimated daily avg progression)
  if (typeof vehicle.nextServiceKm === 'number' && vehicle.nextServiceKm > 0) {
    let estimatedKm = vehicle.mileageKm;
    if (vehicle.lastServiceDate && (vehicle.dailyAvgKm || 0) > 0) {
      const lastMs = Date.parse(`${vehicle.lastServiceDate.slice(0, 10)}T00:00:00Z`);
      if (Number.isFinite(lastMs) && todayMs > lastMs) {
        const days = Math.floor((todayMs - lastMs) / 86_400_000);
        estimatedKm = Math.max(vehicle.mileageKm, vehicle.mileageKm + days * (vehicle.dailyAvgKm || 0));
      }
    }
    const kmRemaining = vehicle.nextServiceKm - estimatedKm;
    let severity: GarageServiceReminderAlert['severity'] = 'ok';
    if (kmRemaining <= 0) severity = 'overdue';
    else if (kmRemaining <= 1000) severity = 'due_soon';

    alerts.push({
      kind: 'vidange',
      severity,
      kmRemaining,
      targetDate: vehicle.nextServiceDate,
      message:
        severity === 'overdue'
          ? `Vidange dépassée (${Math.abs(kmRemaining).toLocaleString()} km)`
          : severity === 'due_soon'
          ? `Vidange imminente dans ${kmRemaining.toLocaleString()} km`
          : `Prochaine vidange dans ${kmRemaining.toLocaleString()} km`,
    });
  }

  // 2. Contrôle technique
  if (vehicle.techControlExpiry) {
    const expiryIso = vehicle.techControlExpiry.slice(0, 10);
    const expiryMs = Date.parse(`${expiryIso}T00:00:00Z`);
    if (Number.isFinite(expiryMs)) {
      const daysRemaining = Math.round((expiryMs - todayMs) / 86_400_000);
      const severity: GarageServiceReminderAlert['severity'] =
        daysRemaining < 0 ? 'overdue' : daysRemaining <= 30 ? 'due_soon' : 'ok';
      alerts.push({
        kind: 'tech_control',
        severity,
        daysRemaining,
        targetDate: expiryIso,
        message:
          severity === 'overdue'
            ? `Contrôle technique expiré (${Math.abs(daysRemaining)} j)`
            : severity === 'due_soon'
            ? `Contrôle technique dans ${daysRemaining} j`
            : `Contrôle technique valide (${expiryIso})`,
      });
    }
  }

  // 3. Assurance
  if (vehicle.insuranceExpiry) {
    const expiryIso = vehicle.insuranceExpiry.slice(0, 10);
    const expiryMs = Date.parse(`${expiryIso}T00:00:00Z`);
    if (Number.isFinite(expiryMs)) {
      const daysRemaining = Math.round((expiryMs - todayMs) / 86_400_000);
      const severity: GarageServiceReminderAlert['severity'] =
        daysRemaining < 0 ? 'overdue' : daysRemaining <= 30 ? 'due_soon' : 'ok';
      alerts.push({
        kind: 'insurance',
        severity,
        daysRemaining,
        targetDate: expiryIso,
        message:
          severity === 'overdue'
            ? `Assurance expirée (${Math.abs(daysRemaining)} j)`
            : severity === 'due_soon'
            ? `Assurance expire dans ${daysRemaining} j`
            : `Assurance valide (${expiryIso})`,
      });
    }
  }

  return alerts;
}

export function evaluateBayAssignment(params: {
  bay?: { id: string; name: string; isOccupied: boolean; activeOrderId?: string };
  workOrderId: string;
}): {
  ok: boolean;
  errorCode?: 'GARAGE_BAY_NOT_FOUND' | 'GARAGE_BAY_ALREADY_OCCUPIED';
  errorMessage?: string;
} {
  if (!params.bay) {
    return {
      ok: false,
      errorCode: 'GARAGE_BAY_NOT_FOUND',
      errorMessage: 'Pont ou baie introuvable.',
    };
  }
  if (
    params.bay.isOccupied &&
    params.bay.activeOrderId &&
    params.bay.activeOrderId !== params.workOrderId
  ) {
    return {
      ok: false,
      errorCode: 'GARAGE_BAY_ALREADY_OCCUPIED',
      errorMessage: `Double affectation bloquée : ${params.bay.name} est déjà occupé par un autre OR.`,
    };
  }
  return { ok: true };
}

export function computeFlatRateLaborLine(params: {
  item: Pick<FlatRateLaborItem, 'code' | 'label' | 'standardHours' | 'hourlyRateDzd'>;
  fleetNegotiatedHourlyRateDzd?: number;
  quantityMultiplier?: number;
  technicianStaffId?: string;
  technicianName?: string;
}): OrderLaborLine {
  const mult = Math.max(0.25, params.quantityMultiplier ?? 1);
  const hours = roundHalfAwayFromZero(params.item.standardHours * mult * 100) / 100;
  const hourlyRateDzd =
    typeof params.fleetNegotiatedHourlyRateDzd === 'number' && params.fleetNegotiatedHourlyRateDzd > 0
      ? params.fleetNegotiatedHourlyRateDzd
      : params.item.hourlyRateDzd;
  const totalCentimes = multiplyCentimes(dzdToCentimes(hourlyRateDzd), hours);
  return {
    id: `lab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    flatRateCode: params.item.code,
    label: params.item.label,
    hours,
    hourlyRateDzd,
    totalDzd: centimesToDzd(totalCentimes),
    technicianStaffId: params.technicianStaffId,
    technicianName: params.technicianName,
  };
}

export function startTechTimeLog(params: {
  branchId: string;
  workOrderId: string;
  orderNumber: string;
  technicianStaffId?: string;
  technicianName: string;
  taskLabel: string;
  commissionRateBps?: number;
  startedAtIso?: string;
}): TechnicianTimeLog {
  return {
    id: `tlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    branchId: params.branchId,
    workOrderId: params.workOrderId,
    orderNumber: params.orderNumber,
    technicianStaffId: params.technicianStaffId,
    technicianName: params.technicianName.trim(),
    taskLabel: params.taskLabel.trim() || 'Intervention mécanique',
    startedAt: params.startedAtIso || new Date().toISOString(),
    durationMinutes: 0,
    laborRevenueDzd: 0,
    commissionRateBps: Math.max(0, Math.min(10000, params.commissionRateBps ?? 1500)),
    commissionDzd: 0,
    status: 'running',
  };
}

export function stopTechTimeLog(params: {
  log: TechnicianTimeLog;
  hourlyRateDzd: number;
  accountId: string;
  businessId: string;
  endedAtIso?: string;
  minimumBillableMinutes?: number;
}): {
  completedLog: TechnicianTimeLog;
  commissionRecord: GarageTechCommission;
} {
  const endedAt = params.endedAtIso || new Date().toISOString();
  const startMs = Date.parse(params.log.startedAt);
  const endMs = Date.parse(endedAt);
  const rawMinutes =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.round((endMs - startMs) / 60_000)
      : 0;
  const durationMinutes = Math.max(params.minimumBillableMinutes ?? 15, rawMinutes);

  const hourlyCentimes = dzdToCentimes(Math.max(0, params.hourlyRateDzd));
  const laborRevenueCentimes = multiplyCentimes(hourlyCentimes, durationMinutes / 60);
  const commissionCentimes = roundHalfAwayFromZero(
    (laborRevenueCentimes * params.log.commissionRateBps) / 10000
  );

  const completedLog: TechnicianTimeLog = {
    ...params.log,
    endedAt,
    durationMinutes,
    laborRevenueDzd: centimesToDzd(laborRevenueCentimes),
    commissionDzd: centimesToDzd(commissionCentimes),
    status: 'completed',
  };

  const nowIso = endedAt;
  const commissionRecord: GarageTechCommission = {
    id: `gcomm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    accountId: params.accountId,
    businessId: params.businessId,
    branchId: params.log.branchId,
    technicianStaffId: params.log.technicianStaffId || `tech_${params.log.technicianName.toLowerCase().replace(/\s+/g, '_')}`,
    technicianName: params.log.technicianName,
    workOrderId: params.log.workOrderId,
    orderNumber: params.log.orderNumber,
    periodMonth: nowIso.slice(0, 7),
    laborBaseCentimes: laborRevenueCentimes,
    commissionRateBps: params.log.commissionRateBps,
    commissionCentimes,
    commissionAmountDzd: centimesToDzd(commissionCentimes),
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return { completedLog, commissionRecord };
}

export function aggregateGaragePayrollCommissions(
  commissions: GarageTechCommission[],
  technicianStaffId: string,
  periodMonth?: string
): {
  totalCentimes: number;
  totalDzd: number;
  count: number;
} {
  const matching = commissions.filter(
    (c) =>
      c.technicianStaffId === technicianStaffId &&
      c.status === 'posted_to_payroll' &&
      (!periodMonth || c.periodMonth === periodMonth)
  );
  const totalCentimes = matching.reduce((sum, c) => addCentimes(sum, c.commissionCentimes), 0);
  return {
    totalCentimes,
    totalDzd: centimesToDzd(totalCentimes),
    count: matching.length,
  };
}

export function captureQuoteUnitPricesSnapshot(
  partsUsed: Array<{ partId: string; unitPriceDzd: number }>
): Record<string, number> {
  const snapshot: Record<string, number> = {};
  for (const line of partsUsed) {
    if (line.partId) {
      snapshot[line.partId] = Number(line.unitPriceDzd || 0);
    }
  }
  return snapshot;
}

export function detectQuoteToInvoicePriceDrift(params: {
  partsUsed: Array<{ partId: string; sku: string; name: string; quantity: number; unitPriceDzd: number }>;
  quoteUnitPricesSnapshot?: Record<string, number>;
  catalogParts: Array<{ id: string; sellingPriceDzd: number }>;
}): {
  hasDrift: boolean;
  items: PriceDriftItem[];
  totalDeltaDzd: number;
} {
  const snapshot = params.quoteUnitPricesSnapshot || {};
  const catalogMap = new Map(params.catalogParts.map((p) => [p.id, p]));
  const items: PriceDriftItem[] = [];
  let totalDeltaCentimes = 0;

  for (const line of params.partsUsed) {
    const quotedUnitPriceDzd = snapshot[line.partId];
    if (typeof quotedUnitPriceDzd !== 'number') continue;
    const catalogPart = catalogMap.get(line.partId);
    const currentUnitPriceDzd = catalogPart ? Number(catalogPart.sellingPriceDzd) : Number(line.unitPriceDzd);
    const quotedCentimes = dzdToCentimes(quotedUnitPriceDzd);
    const currentCentimes = dzdToCentimes(currentUnitPriceDzd);
    if (quotedCentimes !== currentCentimes) {
      const deltaPerUnit = subtractCentimes(currentCentimes, quotedCentimes);
      const deltaLine = multiplyCentimes(deltaPerUnit, line.quantity);
      totalDeltaCentimes = addCentimes(totalDeltaCentimes, deltaLine);
      items.push({
        partId: line.partId,
        sku: line.sku,
        name: line.name,
        quotedUnitPriceDzd,
        currentUnitPriceDzd,
        quantity: line.quantity,
        deltaTotalDzd: centimesToDzd(deltaLine),
      });
    }
  }

  return {
    hasDrift: items.length > 0,
    items,
    totalDeltaDzd: centimesToDzd(totalDeltaCentimes),
  };
}

export function prepareWorkOrderReopenWithCreditNote<
  T extends {
    id: string;
    isLockedInvoiced?: boolean;
    invoiceId?: string;
    status: string;
    reopenCreditNoteId?: string;
    reopenCreditNoteNumber?: string;
    reopenReason?: string;
    reopenedAt?: string;
  }
>(params: {
  order: T;
  creditNoteId: string;
  creditNoteNumber: string;
  reason: string;
  reopenedAtIso?: string;
}): T & {
  reopenCreditNoteId: string;
  reopenCreditNoteNumber: string;
  reopenReason: string;
  reopenedAt: string;
} {
  const { order } = params;
  if (!order.isLockedInvoiced && !order.invoiceId) {
    throw new Error('GARAGE_ORDER_NOT_LOCKED_INVOICED');
  }
  if (!params.creditNoteId || !params.creditNoteId.trim()) {
    throw new Error('GARAGE_REOPEN_REQUIRES_CREDIT_NOTE');
  }
  const cleanReason = (params.reason || '').trim();
  if (cleanReason.length < 3) {
    throw new Error('GARAGE_REOPEN_REASON_REQUIRED');
  }

  return {
    ...order,
    isLockedInvoiced: false,
    status: 'InRepair',
    reopenCreditNoteId: params.creditNoteId.trim(),
    reopenCreditNoteNumber: params.creditNoteNumber.trim(),
    reopenReason: cleanReason,
    reopenedAt: params.reopenedAtIso || new Date().toISOString(),
  };
}

export function createSupplierPurchaseOrder(params: {
  branchId: string;
  existingPoNumbers: string[];
  supplierId: string;
  supplierName: string;
  items: GaragePurchaseOrderLine[];
  warrantyMonths?: number;
  notes?: string;
  status?: 'Draft' | 'Ordered';
  nowIso?: string;
}): GaragePurchaseOrderRecord {
  if (!params.supplierId || !params.supplierName.trim()) {
    throw new Error('GARAGE_PO_SUPPLIER_REQUIRED');
  }
  if (!params.items || params.items.length === 0) {
    throw new Error('GARAGE_PO_ITEMS_REQUIRED');
  }
  const totalCentimes = params.items.reduce(
    (sum, item) => addCentimes(sum, multiplyCentimes(dzdToCentimes(item.unitCostDzd), item.quantity)),
    0
  );
  const nowIso = params.nowIso || new Date().toISOString();
  const status = params.status || 'Ordered';

  return {
    id: `gpo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    branchId: params.branchId,
    poNumber: formatGarageSequentialCode('BC-GAR', params.existingPoNumbers, new Date(nowIso).getFullYear()),
    supplierId: params.supplierId,
    supplierName: params.supplierName.trim(),
    status,
    items: params.items,
    totalDzd: centimesToDzd(totalCentimes),
    orderedAt: status === 'Ordered' ? nowIso : undefined,
    warrantyMonths: Math.max(0, Math.round(params.warrantyMonths ?? 6)),
    notes: params.notes?.trim() || undefined,
  };
}

export function receivePurchaseOrderGoods(params: {
  po: GaragePurchaseOrderRecord;
  deliveryNoteNumber: string;
  receivedByName: string;
  receivedLines?: GaragePurchaseOrderLine[];
  receivedAtIso?: string;
}): {
  updatedPo: GaragePurchaseOrderRecord;
  stockAdjustments: Array<{ partId: string; addedQty: number; newBuyingPriceDzd: number }>;
} {
  const bl = (params.deliveryNoteNumber || '').trim();
  if (!bl) throw new Error('GARAGE_BL_REQUIRED');
  if (params.po.status === 'Received') throw new Error('GARAGE_PO_ALREADY_RECEIVED');
  if (params.po.status === 'Cancelled') throw new Error('GARAGE_PO_CANCELLED');

  const lines = (params.receivedLines && params.receivedLines.length > 0 ? params.receivedLines : params.po.items).map(
    (line) => ({
      ...line,
      quantityReceived:
        typeof line.quantityReceived === 'number' && line.quantityReceived >= 0
          ? line.quantityReceived
          : line.quantity,
    })
  );

  const stockAdjustments = lines
    .filter((l) => (l.quantityReceived || 0) > 0)
    .map((l) => ({
      partId: l.partId,
      addedQty: l.quantityReceived || 0,
      newBuyingPriceDzd: l.unitCostDzd,
    }));

  const receivedAt = params.receivedAtIso || new Date().toISOString();
  const warrantyMonths = Math.max(0, params.po.warrantyMonths || 0);
  let warrantyExpiryDate: string | undefined;
  if (warrantyMonths > 0) {
    const dt = new Date(receivedAt);
    dt.setUTCMonth(dt.getUTCMonth() + warrantyMonths);
    warrantyExpiryDate = dt.toISOString().slice(0, 10);
  }

  return {
    updatedPo: {
      ...params.po,
      status: 'Received',
      deliveryNoteNumber: bl,
      receivedAt,
      receivedByName: params.receivedByName.trim() || 'Magasinier',
      linesReceived: lines,
      warrantyExpiryDate,
    },
    stockAdjustments,
  };
}

export function evaluatePartWarrantyStatus(
  po: Pick<GaragePurchaseOrderRecord, 'status' | 'warrantyMonths' | 'warrantyExpiryDate'>,
  todayIso = new Date().toISOString().slice(0, 10)
): {
  status: 'no_warranty' | 'active' | 'expiring_soon' | 'expired';
  daysRemaining: number;
} {
  if (po.status !== 'Received' || !po.warrantyExpiryDate || (po.warrantyMonths || 0) <= 0) {
    return { status: 'no_warranty', daysRemaining: 0 };
  }
  const todayMs = Date.parse(`${todayIso.slice(0, 10)}T00:00:00Z`);
  const expMs = Date.parse(`${po.warrantyExpiryDate.slice(0, 10)}T00:00:00Z`);
  const daysRemaining = Math.round((expMs - todayMs) / 86_400_000);
  if (daysRemaining < 0) return { status: 'expired', daysRemaining };
  if (daysRemaining <= 30) return { status: 'expiring_soon', daysRemaining };
  return { status: 'active', daysRemaining };
}

export function evaluateBodyShopClaim(params: {
  claimedDzd: number;
  approvedDzd: number;
  deductibleDzd: number;
}): {
  insurerShareDzd: number;
  clientShareDzd: number;
} {
  const claimedCentimes = dzdToCentimes(Math.max(0, params.claimedDzd));
  const approvedCentimes = dzdToCentimes(Math.max(0, params.approvedDzd));
  const deductibleCentimes = dzdToCentimes(Math.max(0, params.deductibleDzd));

  const insurerShareCentimes = Math.max(0, subtractCentimes(approvedCentimes, deductibleCentimes));
  const clientShareCentimes = Math.max(0, subtractCentimes(claimedCentimes, insurerShareCentimes));

  return {
    insurerShareDzd: centimesToDzd(insurerShareCentimes),
    clientShareDzd: centimesToDzd(clientShareCentimes),
  };
}

export function evaluateInspectionPv(
  checklist: InspectionChecklistItem[],
  inspectionDateIso = new Date().toISOString().slice(0, 10)
): {
  verdict: InspectionCenterPv['verdict'];
  defectsCount: number;
  majorDefectsCount: number;
  validUntil: string;
} {
  const minorCount = checklist.filter((i) => i.result === 'minor_defect').length;
  const majorCount = checklist.filter((i) => i.result === 'major_defect').length;
  const criticalCount = checklist.filter((i) => i.result === 'critical_defect').length;

  const defectsCount = minorCount + majorCount + criticalCount;
  const majorDefectsCount = majorCount + criticalCount;

  const baseDate = new Date(`${inspectionDateIso.slice(0, 10)}T00:00:00Z`);
  let verdict: InspectionCenterPv['verdict'] = 'favorable';

  if (criticalCount > 0) {
    verdict = 'immobilise';
  } else if (majorCount > 0) {
    verdict = 'contre_visite';
    baseDate.setUTCDate(baseDate.getUTCDate() + 60);
  } else {
    baseDate.setUTCFullYear(baseDate.getUTCFullYear() + 1);
  }

  return {
    verdict,
    defectsCount,
    majorDefectsCount,
    validUntil: baseDate.toISOString().slice(0, 10),
  };
}

export function evaluateTireStorageAlert(
  entry: Pick<TireStorageEntry, 'treadDepthMm' | 'dueSwapDate' | 'status'>,
  todayIso = new Date().toISOString().slice(0, 10)
): {
  status: 'ok' | 'swap_due' | 'replace_recommended';
  warnings: string[];
} {
  if (entry.status !== 'stored') return { status: 'ok', warnings: [] };
  const warnings: string[] = [];
  let status: 'ok' | 'swap_due' | 'replace_recommended' = 'ok';

  if (entry.treadDepthMm < 3.0) {
    status = 'replace_recommended';
    warnings.push(`Sculpture faible (${entry.treadDepthMm} mm < 3.0 mm)`);
  }
  if (entry.dueSwapDate && entry.dueSwapDate.slice(0, 10) <= todayIso.slice(0, 10)) {
    if (status === 'ok') status = 'swap_due';
    warnings.push(`Permutation saisonnière due (${entry.dueSwapDate.slice(0, 10)})`);
  }
  return { status, warnings };
}

export function computeGarageInvoiceTotalsCentimes(params: {
  laborTotalDzd: number;
  partsTotalDzd: number;
  partsDiscountPercent?: number;
  billingType: 'facture_dgi' | 'bon_caisse';
  paymentMethod: 'especes' | 'cib_dahabia' | 'cheque' | 'virement';
  tvaRatePercent?: number;
}): {
  laborTotalHt: number;
  partsTotalHt: number;
  discountHt: number;
  subtotalHt: number;
  tvaRate: number;
  tvaAmount: number;
  totalTtc: number;
  timbreFiscal: number;
  netToPayDzd: number;
} {
  const laborCentimes = dzdToCentimes(Math.max(0, params.laborTotalDzd));
  const partsCentimes = dzdToCentimes(Math.max(0, params.partsTotalDzd));
  const discountCentimes = percentOfCentimes(partsCentimes, Math.max(0, params.partsDiscountPercent || 0));
  const subtotalCentimes = Math.max(0, subtractCentimes(addCentimes(laborCentimes, partsCentimes), discountCentimes));

  const tvaRate = params.billingType === 'facture_dgi' ? (params.tvaRatePercent ?? 19) : 0;
  const tvaCentimes = tvaRate > 0 ? percentOfCentimes(subtotalCentimes, tvaRate) : 0;
  const totalTtcCentimes = addCentimes(subtotalCentimes, tvaCentimes);

  let timbreCentimes = 0;
  if (params.paymentMethod === 'especes' && totalTtcCentimes > 0) {
    const rawStampCentimes = Math.ceil(totalTtcCentimes * 0.01);
    timbreCentimes = Math.min(rawStampCentimes, dzdToCentimes(10000));
  }

  const netToPayCentimes = addCentimes(totalTtcCentimes, timbreCentimes);
  return {
    laborTotalHt: centimesToDzd(laborCentimes),
    partsTotalHt: centimesToDzd(partsCentimes),
    discountHt: centimesToDzd(discountCentimes),
    subtotalHt: centimesToDzd(subtotalCentimes),
    tvaRate,
    tvaAmount: centimesToDzd(tvaCentimes),
    totalTtc: centimesToDzd(totalTtcCentimes),
    timbreFiscal: centimesToDzd(timbreCentimes),
    netToPayDzd: centimesToDzd(netToPayCentimes),
  };
}

export function buildGarageInvoiceScfDraft(params: {
  invoiceNumber: string;
  orderNumber: string;
  clientName: string;
  partyId?: string;
  laborTotalHtDzd: number;
  partsTotalHtDzd: number;
  discountHtDzd: number;
  tvaAmountDzd: number;
  timbreFiscalDzd: number;
  totalTtcDzd: number;
  netToPayDzd: number;
  paymentMethod: 'especes' | 'cib_dahabia' | 'cheque' | 'virement';
  isPaid: boolean;
}): {
  eventType: ScfPostingEventType;
  journalCode: ScfJournalCode;
  memo: string;
  lines: ScfLineDraftInput[];
} {
  const netCentimes = dzdToCentimes(params.netToPayDzd);
  const tvaCentimes = dzdToCentimes(params.tvaAmountDzd);
  const timbreCentimes = dzdToCentimes(params.timbreFiscalDzd);
  const netHtRevenueCentimes = Math.max(0, subtractCentimes(netCentimes, addCentimes(tvaCentimes, timbreCentimes)));

  const laborCentimes = dzdToCentimes(params.laborTotalHtDzd);
  const partsNetCentimes = Math.max(0, subtractCentimes(netHtRevenueCentimes, laborCentimes));

  const debitAccount =
    params.isPaid && params.paymentMethod === 'especes'
      ? { code: '5311', label: 'Caisse Principale Atelier' }
      : params.isPaid
      ? { code: '5121', label: 'Banque Principale DZD' }
      : { code: '4111', label: 'Clients Atelier & Flottes' };

  const lines: ScfLineDraftInput[] = [
    {
      accountCode: debitAccount.code,
      accountLabel: debitAccount.label,
      partyId: params.partyId,
      partyName: params.clientName,
      debitCentimes: netCentimes,
      creditCentimes: 0,
    },
  ];

  if (laborCentimes > 0) {
    lines.push({
      accountCode: '7061',
      accountLabel: 'Prestations Atelier & Main-d’œuvre',
      debitCentimes: 0,
      creditCentimes: laborCentimes,
    });
  }
  if (partsNetCentimes > 0) {
    lines.push({
      accountCode: '7001',
      accountLabel: 'Ventes Pièces de Rechange & Fluides',
      debitCentimes: 0,
      creditCentimes: partsNetCentimes,
    });
  }
  if (tvaCentimes > 0) {
    lines.push({
      accountCode: '4457',
      accountLabel: 'TVA Collectée 19%',
      debitCentimes: 0,
      creditCentimes: tvaCentimes,
    });
  }
  if (timbreCentimes > 0) {
    lines.push({
      accountCode: '4471',
      accountLabel: 'Droits de Timbre Fiscal à Reverser',
      debitCentimes: 0,
      creditCentimes: timbreCentimes,
    });
  }

  return {
    eventType: 'sale_invoice',
    journalCode: params.isPaid ? (params.paymentMethod === 'especes' ? 'CA' : 'BQ') : 'VE',
    memo: `Facturation Garage ${params.invoiceNumber} (OR ${params.orderNumber}) — ${params.clientName}`,
    lines,
  };
}
