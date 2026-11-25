/**
 * Pure domain helpers for Step 5 (Section 3 Toast-Only Stubs & Real Action Workflows).
 * Decoupled from React UI so they can be directly unit-tested with node:test and Vitest.
 */

export const MAX_PRINT_BATCH_ITEMS = 1000;
export const MAX_EXPORT_BATCH_ITEMS = 5000;

export interface BatchSelectionResult<T> {
  selectedItems: T[];
  missingIds: string[];
  truncatedCount: number;
  isEmpty: boolean;
}

export function resolveBatchSelection<T>(
  selectedIds: Iterable<string> | null | undefined,
  items: readonly T[],
  getId: (item: T) => string,
  maxItems: number = MAX_EXPORT_BATCH_ITEMS
): BatchSelectionResult<T> {
  const byId = new Map<string, T>();
  for (const item of items) {
    byId.set(String(getId(item)), item);
  }

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  if (selectedIds) {
    for (const rawId of selectedIds) {
      const id = String(rawId);
      if (!seen.has(id)) {
        seen.add(id);
        orderedIds.push(id);
      }
    }
  }

  const resolved: T[] = [];
  const missingIds: string[] = [];
  for (const id of orderedIds) {
    const found = byId.get(id);
    if (found) {
      resolved.push(found);
    } else {
      missingIds.push(id);
    }
  }

  const truncatedCount = Math.max(0, resolved.length - maxItems);
  const selectedItems = truncatedCount > 0 ? resolved.slice(0, maxItems) : resolved;

  return {
    selectedItems,
    missingIds,
    truncatedCount,
    isEmpty: selectedItems.length === 0,
  };
}

export interface ClassEnrollmentCheckInput {
  eventId: string;
  memberId: string;
  capacity: number;
  enrolledCount: number;
  existingEnrollments: ReadonlyArray<{
    eventId: string;
    memberId: string;
    status: 'enrolled' | 'waitlisted' | 'cancelled';
  }>;
}

export interface ClassEnrollmentCheckResult {
  allowed: boolean;
  errorCode?: 'DUPLICATE_ENROLLMENT';
  assignedStatus?: 'enrolled' | 'waitlisted';
  nextEnrolledCount: number;
}

export function evaluateClassEnrollment(
  input: ClassEnrollmentCheckInput
): ClassEnrollmentCheckResult {
  const duplicate = input.existingEnrollments.some(
    (e) =>
      e.eventId === input.eventId &&
      e.memberId === input.memberId &&
      e.status !== 'cancelled'
  );
  if (duplicate) {
    return {
      allowed: false,
      errorCode: 'DUPLICATE_ENROLLMENT',
      nextEnrolledCount: input.enrolledCount,
    };
  }

  const hasSeat = input.enrolledCount < input.capacity;
  return {
    allowed: true,
    assignedStatus: hasSeat ? 'enrolled' : 'waitlisted',
    nextEnrolledCount: hasSeat ? input.enrolledCount + 1 : input.enrolledCount,
  };
}

export interface ScheduleEventLike {
  id: string;
  title: string;
  trainerOrStaff: string;
  roomOrArea: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolledCount: number;
  category: string;
  branchId?: string;
}

export interface DuplicateWeekResult<T extends ScheduleEventLike> {
  created: T[];
  conflicts: Array<{
    sourceId: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    reason: 'room_conflict' | 'coach_conflict';
  }>;
  missingIds: string[];
}

function normalizeTimeMinutes(hhmm: string): number {
  const parts = String(hhmm || '').split(':');
  const h = Number(parts[0] || 0);
  const m = Number(parts[1] || 0);
  return h * 60 + m;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const s1 = normalizeTimeMinutes(aStart);
  const e1 = normalizeTimeMinutes(aEnd);
  const s2 = normalizeTimeMinutes(bStart);
  const e2 = normalizeTimeMinutes(bEnd);
  return s1 < e2 && s2 < e1;
}

export function planWeekDuplication<T extends ScheduleEventLike>(
  existingEvents: readonly T[],
  options: {
    selectedIds?: Iterable<string>;
    dayOffset?: number;
    generateId: (src: T, idx: number) => string;
  }
): DuplicateWeekResult<T> {
  const dayOffset = options.dayOffset ?? 0;
  let targets: T[];
  let missingIds: string[] = [];

  if (options.selectedIds) {
    const sel = resolveBatchSelection(options.selectedIds, existingEvents, (e) => e.id);
    targets = sel.selectedItems;
    missingIds = sel.missingIds;
  } else {
    targets = [...existingEvents];
  }

  const created: T[] = [];
  const conflicts: DuplicateWeekResult<T>['conflicts'] = [];
  const pool: ScheduleEventLike[] = dayOffset === 0 ? [...existingEvents] : [...existingEvents];

  targets.forEach((src, idx) => {
    const targetDay = ((src.dayOfWeek + dayOffset) % 7 + 7) % 7;
    const roomKey = (src.roomOrArea || '').trim().toLowerCase();
    const coachKey = (src.trainerOrStaff || '').trim().toLowerCase();

    const conflictItem = pool.find((other) => {
      if (other.dayOfWeek !== targetDay) return false;
      if (!rangesOverlap(src.startTime, src.endTime, other.startTime, other.endTime)) return false;
      const sameRoom = roomKey.length > 0 && (other.roomOrArea || '').trim().toLowerCase() === roomKey;
      const sameCoach =
        coachKey.length > 0 && (other.trainerOrStaff || '').trim().toLowerCase() === coachKey;
      return sameRoom || sameCoach;
    });

    if (conflictItem) {
      const sameRoom =
        roomKey.length > 0 && (conflictItem.roomOrArea || '').trim().toLowerCase() === roomKey;
      conflicts.push({
        sourceId: src.id,
        title: src.title,
        dayOfWeek: targetDay,
        startTime: src.startTime,
        endTime: src.endTime,
        reason: sameRoom ? 'room_conflict' : 'coach_conflict',
      });
      return;
    }

    const cloned: T = {
      ...src,
      id: options.generateId(src, idx),
      dayOfWeek: targetDay,
      enrolledCount: 0,
    };
    created.push(cloned);
    pool.push(cloned);
  });

  return { created, conflicts, missingIds };
}

export interface DepositReceiptPrintPrep {
  depositReceiptNumber: string;
  printedCount: number;
  isDuplicate: boolean;
}

export function prepareDepositReceiptPrint(
  existingReceiptNumber: string | undefined | null,
  currentPrintedCount: number | undefined | null,
  allocateNumber: () => string
): DepositReceiptPrintPrep {
  const prevCount = Math.max(0, Number(currentPrintedCount || 0));
  const number =
    existingReceiptNumber && existingReceiptNumber.trim().length > 0
      ? existingReceiptNumber.trim()
      : allocateNumber();
  const nextCount = prevCount + 1;
  return {
    depositReceiptNumber: number,
    printedCount: nextCount,
    isDuplicate: nextCount > 1,
  };
}

export function isInspectionEditable(insp: { isLocked?: boolean } | null | undefined): boolean {
  return !insp?.isLocked;
}

export function buildRealEstateInspectionShareText(
  insp: {
    propertyTitle: string;
    tenantName?: string;
    inspectionType?: string;
    type?: string;
    inspectionDate: string;
    inspectorName?: string;
    generalCondition: string;
    meterElectricityKwh?: number;
    meterGasM3?: number;
    meterWaterM3?: number;
    keysDeliveredCount?: number;
    keysCount?: number;
    isLocked?: boolean;
    observations?: string;
    notes?: string;
  },
  language: 'fr' | 'en' | 'ar' = 'fr'
): string {
  const kind = insp.inspectionType || insp.type || 'CheckIn';
  const keys = insp.keysDeliveredCount ?? insp.keysCount ?? 0;
  const statusLabel = insp.isLocked
    ? language === 'ar'
      ? 'مصادق ومقفل'
      : language === 'en'
      ? 'Validated & Locked'
      : 'Validé & Verrouillé'
    : language === 'ar'
    ? 'مسودة'
    : language === 'en'
    ? 'Draft'
    : 'Brouillon';

  if (language === 'ar') {
    return [
      `محضر معاينة عقارية — ${insp.propertyTitle}`,
      `النوع: ${kind} | التاريخ: ${insp.inspectionDate}`,
      insp.tenantName ? `المستأجر: ${insp.tenantName}` : null,
      insp.inspectorName ? `المعاين: ${insp.inspectorName}` : null,
      `الحالة العامة: ${insp.generalCondition} (${statusLabel})`,
      `العدادات: كهرباء ${insp.meterElectricityKwh ?? 0} kWh · غاز ${insp.meterGasM3 ?? 0} m³ · ماء ${insp.meterWaterM3 ?? 0} m³`,
      `المفاتيح المسلمة: ${keys}`,
      insp.observations || insp.notes ? `ملاحظات: ${insp.observations || insp.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (language === 'en') {
    return [
      `Property Inspection Report — ${insp.propertyTitle}`,
      `Type: ${kind} | Date: ${insp.inspectionDate}`,
      insp.tenantName ? `Tenant: ${insp.tenantName}` : null,
      insp.inspectorName ? `Inspector: ${insp.inspectorName}` : null,
      `Condition: ${insp.generalCondition} (${statusLabel})`,
      `Meters: Elec ${insp.meterElectricityKwh ?? 0} kWh · Gas ${insp.meterGasM3 ?? 0} m³ · Water ${insp.meterWaterM3 ?? 0} m³`,
      `Keys delivered: ${keys}`,
      insp.observations || insp.notes ? `Notes: ${insp.observations || insp.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `PV État des Lieux — ${insp.propertyTitle}`,
    `Type : ${kind} | Date : ${insp.inspectionDate}`,
    insp.tenantName ? `Locataire : ${insp.tenantName}` : null,
    insp.inspectorName ? `Inspecteur : ${insp.inspectorName}` : null,
    `État général : ${insp.generalCondition} (${statusLabel})`,
    `Relevés : Élec ${insp.meterElectricityKwh ?? 0} kWh · Gaz ${insp.meterGasM3 ?? 0} m³ · Eau ${insp.meterWaterM3 ?? 0} m³`,
    `Clés remises : ${keys}`,
    insp.observations || insp.notes ? `Observations : ${insp.observations || insp.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export interface BuildScrapNcrInput {
  ncrId: string;
  qcId: string;
  ncrNumber: string;
  inspectionNumber: string;
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  orderId: string;
  orderNumber: string;
  batchLotNumber: string;
  productName: string;
  inspectorName: string;
  scrappedQuantity: number;
  reason: string;
  notes?: string;
  inspectionDate: string;
}

export function buildScrapNcrArtifacts(input: BuildScrapNcrInput) {
  const qty = Math.max(1, Number(input.scrappedQuantity || 1));
  const qcRecord = {
    id: input.qcId,
    accountId: input.accountId,
    businessId: input.businessId,
    branchId: input.branchId,
    staffId: input.staffId,
    inspectionNumber: input.inspectionNumber,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    batchLotNumber: input.batchLotNumber,
    productName: input.productName,
    sampleSize: qty,
    inspectedQuantity: qty,
    acceptedQuantity: 0,
    rejectedQuantity: qty,
    verdict: 'Scrapped' as const,
    checkpoints: [
      {
        parameter: input.reason || 'Non-conformité',
        nominalValue: '0 Rebut',
        tolerance: '0 U',
        measuredValue: `${qty} U`,
        passed: false,
      },
    ],
    inspectorName: input.inspectorName || 'QC',
    inspectionDate: input.inspectionDate,
    certificateOfConformityGenerated: false,
    notes: input.notes || input.reason,
  };

  const ncrRecord = {
    id: input.ncrId,
    accountId: input.accountId,
    businessId: input.businessId,
    branchId: input.branchId,
    staffId: input.staffId,
    ncrNumber: input.ncrNumber,
    orderId: input.orderId,
    qcInspectionId: input.qcId,
    ofNumber: input.orderNumber,
    lotNumber: input.batchLotNumber,
    productName: input.productName,
    scrappedQuantity: qty,
    reason: input.reason,
    disposition: 'Scrapped' as const,
    status: 'Open' as const,
    cmupAdjustmentHeld: true as const,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };

  return { qcRecord, ncrRecord };
}
