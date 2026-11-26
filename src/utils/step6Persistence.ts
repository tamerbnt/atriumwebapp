import {
  addCentimes,
  dzdToCentimes,
  roundHalfAwayFromZero,
  subtractCentimes,
} from './money';
import type {
  AttendanceStatus,
  EduAttendance,
  Member,
  MemberCheckInLog,
  PosCashMovement,
  PosZReport,
  Sale,
  SalonChairStage,
  SalonChairStation,
  StockMovement,
} from '../types/index';

export const DEFAULT_CHECKIN_DUPLICATE_WINDOW_MINUTES = 5;
export const DEFAULT_NEGATIVE_VARIANCE_PIN_THRESHOLD_CENTIMES = 50000; // 500.00 DZD

export interface CheckInEvaluationResult {
  allowed: boolean;
  duplicateBlocked: boolean;
  existingCheckInAt?: string;
  accessStatus: MemberCheckInLog['accessStatus'];
  shouldDecrementSession: boolean;
  remainingSessionsBefore?: number;
  remainingSessionsAfter?: number;
  reasonCode:
    | 'granted'
    | 'warning_expiring'
    | 'denied_frozen'
    | 'denied_expired'
    | 'denied_quota'
    | 'duplicate_blocked';
}

export function evaluateMemberCheckIn(
  member: Pick<Member, 'id' | 'status' | 'expirationDate' | 'remainingSessions'>,
  existingLogs: Pick<MemberCheckInLog, 'memberId' | 'timestamp' | 'accessStatus'>[],
  nowIso: string = new Date().toISOString(),
  options?: {
    duplicateWindowMinutes?: number;
    overrideReason?: string;
  }
): CheckInEvaluationResult {
  const nowMs = Date.parse(nowIso) || Date.now();
  const windowMinutes = Math.max(
    0,
    options?.duplicateWindowMinutes ?? DEFAULT_CHECKIN_DUPLICATE_WINDOW_MINUTES
  );
  const hasOverride = Boolean(options?.overrideReason && options.overrideReason.trim().length > 0);

  if (member.status === 'Banned' || member.status === 'Suspended' || member.status === 'Frozen') {
    return {
      allowed: false,
      duplicateBlocked: false,
      accessStatus: 'Denied_Frozen',
      shouldDecrementSession: false,
      remainingSessionsBefore: member.remainingSessions,
      remainingSessionsAfter: member.remainingSessions,
      reasonCode: 'denied_frozen',
    };
  }

  const expiryMs = member.expirationDate ? Date.parse(member.expirationDate) : NaN;
  const daysLeft = Number.isFinite(expiryMs)
    ? Math.ceil((expiryMs - nowMs) / 86400000)
    : 999;

  if (member.status === 'Expired' || (Number.isFinite(expiryMs) && expiryMs < nowMs)) {
    return {
      allowed: false,
      duplicateBlocked: false,
      accessStatus: 'Denied_Expired',
      shouldDecrementSession: false,
      remainingSessionsBefore: member.remainingSessions,
      remainingSessionsAfter: member.remainingSessions,
      reasonCode: 'denied_expired',
    };
  }

  if (member.remainingSessions !== undefined && member.remainingSessions !== null && member.remainingSessions <= 0) {
    return {
      allowed: false,
      duplicateBlocked: false,
      accessStatus: 'Denied_Expired',
      shouldDecrementSession: false,
      remainingSessionsBefore: member.remainingSessions,
      remainingSessionsAfter: member.remainingSessions,
      reasonCode: 'denied_quota',
    };
  }

  if (windowMinutes > 0 && !hasOverride) {
    const windowMs = windowMinutes * 60 * 1000;
    const recent = existingLogs
      .filter(
        (l) =>
          l.memberId === member.id &&
          (l.accessStatus === 'Granted' || l.accessStatus === 'Warning_Expiring')
      )
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];

    if (recent) {
      const diffMs = nowMs - Date.parse(recent.timestamp);
      if (Number.isFinite(diffMs) && diffMs >= 0 && diffMs < windowMs) {
        return {
          allowed: false,
          duplicateBlocked: true,
          existingCheckInAt: recent.timestamp,
          accessStatus: 'Denied_Expired',
          shouldDecrementSession: false,
          remainingSessionsBefore: member.remainingSessions,
          remainingSessionsAfter: member.remainingSessions,
          reasonCode: 'duplicate_blocked',
        };
      }
    }
  }

  const remainingBefore = member.remainingSessions;
  const hasFiniteSessions = remainingBefore !== undefined && remainingBefore !== null;
  const remainingAfter = hasFiniteSessions ? Math.max(0, remainingBefore - 1) : undefined;
  const isWarning = daysLeft <= 5;

  return {
    allowed: true,
    duplicateBlocked: false,
    accessStatus: isWarning ? 'Warning_Expiring' : 'Granted',
    shouldDecrementSession: hasFiniteSessions,
    remainingSessionsBefore: remainingBefore,
    remainingSessionsAfter: remainingAfter,
    reasonCode: isWarning ? 'warning_expiring' : 'granted',
  };
}

export function dedupeEduAttendanceRecords(records: EduAttendance[]): EduAttendance[] {
  const byKey = new Map<string, EduAttendance>();
  for (const rec of records) {
    const key = `${rec.businessId || ''}::${rec.sessionId}::${rec.studentId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, rec);
      continue;
    }
    const existingTs = Date.parse(existing.markedAt || existing.recordedAt || '') || 0;
    const candidateTs = Date.parse(rec.markedAt || rec.recordedAt || '') || 0;
    if (candidateTs >= existingTs) {
      byKey.set(key, rec);
    }
  }
  return Array.from(byKey.values());
}

export function appendEduAttendanceChange(
  previous: Pick<EduAttendance, 'status' | 'changeHistory'> | undefined,
  nextStatus: AttendanceStatus,
  staffId: string,
  reason: string,
  nowIso: string = new Date().toISOString()
): NonNullable<EduAttendance['changeHistory']> {
  const history = Array.isArray(previous?.changeHistory) ? [...previous.changeHistory] : [];
  if (previous && previous.status !== nextStatus) {
    history.push({
      previousStatus: previous.status,
      newStatus: nextStatus,
      changedBy: staffId,
      changedAt: nowIso,
      reason: reason || undefined,
    });
  }
  return history;
}

export function computeElapsedMinutesFromIso(
  startedAtIso?: string | null,
  nowMs: number = Date.now()
): number {
  if (!startedAtIso) return 0;
  const startedMs = Date.parse(startedAtIso);
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startedMs) / 60000));
}

export function normalizeChairStage(stage?: string): SalonChairStage {
  if (stage === 'in_progress' || stage === 'completed' || stage === 'paid') {
    return stage;
  }
  return 'waiting';
}

export function buildPersistedChairStation(
  station: SalonChairStation,
  nowMs: number = Date.now()
): SalonChairStation {
  const stage = normalizeChairStage(station.stage);
  const startTime =
    stage === 'in_progress' && !station.startTime
      ? new Date(nowMs).toISOString()
      : station.startTime;
  return {
    ...station,
    stage,
    startTime,
    elapsedMinutes:
      stage === 'in_progress' && startTime
        ? computeElapsedMinutesFromIso(startTime, nowMs)
        : station.elapsedMinutes ?? 0,
  };
}

export interface DrawerExpectedCashInput {
  openingFloatCentimes: number;
  cashSalesCentimes: number;
  cashMovements: Pick<PosCashMovement, 'direction' | 'paymentMethod' | 'amountCentimes'>[];
  cashRefundsCentimes?: number;
}

export interface DrawerExpectedCashSummary {
  openingFloatCentimes: number;
  cashSalesCentimes: number;
  cashInCentimes: number;
  cashOutCentimes: number;
  cashRefundsCentimes: number;
  expectedCashCentimes: number;
}

export function computeDrawerExpectedCentimes(
  input: DrawerExpectedCashInput
): DrawerExpectedCashSummary {
  const openingFloatCentimes = roundHalfAwayFromZero(Math.max(0, input.openingFloatCentimes));
  const cashSalesCentimes = roundHalfAwayFromZero(Math.max(0, input.cashSalesCentimes));
  const cashRefundsCentimes = roundHalfAwayFromZero(Math.max(0, input.cashRefundsCentimes || 0));

  let cashInCentimes = 0;
  let cashOutCentimes = 0;
  for (const mv of input.cashMovements) {
    if (mv.paymentMethod !== 'Cash') continue;
    const amt = roundHalfAwayFromZero(Math.max(0, mv.amountCentimes));
    if (mv.direction === 'in') {
      cashInCentimes = addCentimes(cashInCentimes, amt);
    } else {
      cashOutCentimes = addCentimes(cashOutCentimes, amt);
    }
  }

  const expectedCashCentimes = subtractCentimes(
    addCentimes(openingFloatCentimes, cashSalesCentimes, cashInCentimes),
    addCentimes(cashOutCentimes, cashRefundsCentimes)
  );

  return {
    openingFloatCentimes,
    cashSalesCentimes,
    cashInCentimes,
    cashOutCentimes,
    cashRefundsCentimes,
    expectedCashCentimes,
  };
}

export function computeVarianceCentimes(
  actualCashCentimes: number,
  expectedCashCentimes: number
): number {
  return subtractCentimes(actualCashCentimes, expectedCashCentimes);
}

export function requiresVarianceManagerPin(
  varianceCentimes: number,
  thresholdCentimes: number = DEFAULT_NEGATIVE_VARIANCE_PIN_THRESHOLD_CENTIMES
): boolean {
  const safeThreshold = Math.abs(roundHalfAwayFromZero(thresholdCentimes));
  return roundHalfAwayFromZero(varianceCentimes) < -safeThreshold;
}

export interface ProvisionalZDriftEvaluation {
  driftDetected: boolean;
  nextStatus: PosZReport['status'];
  driftDetails?: string;
}

export function evaluateProvisionalZReportDrift(
  provisional: Pick<
    PosZReport,
    'cashSalesCentimes' | 'cardSalesCentimes' | 'baridimobSalesCentimes' | 'refundsTotalCentimes'
  >,
  serverTotals: {
    cashSalesCentimes: number;
    cardSalesCentimes: number;
    baridimobSalesCentimes: number;
    refundsTotalCentimes: number;
  }
): ProvisionalZDriftEvaluation {
  const diffs: string[] = [];
  if (provisional.cashSalesCentimes !== serverTotals.cashSalesCentimes) {
    diffs.push(
      `cash:${provisional.cashSalesCentimes}->${serverTotals.cashSalesCentimes}`
    );
  }
  if (provisional.cardSalesCentimes !== serverTotals.cardSalesCentimes) {
    diffs.push(
      `card:${provisional.cardSalesCentimes}->${serverTotals.cardSalesCentimes}`
    );
  }
  if (provisional.baridimobSalesCentimes !== serverTotals.baridimobSalesCentimes) {
    diffs.push(
      `baridimob:${provisional.baridimobSalesCentimes}->${serverTotals.baridimobSalesCentimes}`
    );
  }
  if (provisional.refundsTotalCentimes !== serverTotals.refundsTotalCentimes) {
    diffs.push(
      `refunds:${provisional.refundsTotalCentimes}->${serverTotals.refundsTotalCentimes}`
    );
  }

  if (diffs.length > 0) {
    return {
      driftDetected: true,
      nextStatus: 'drift_flagged',
      driftDetails: `Closed-day drift detected on reconnect (${diffs.join(', ')})`,
    };
  }

  return {
    driftDetected: false,
    nextStatus: 'finalized',
  };
}

export function sumSalePaymentCentimes(sales: Sale[]): {
  cashSalesCentimes: number;
  cardSalesCentimes: number;
  baridimobSalesCentimes: number;
  totalGrossSalesCentimes: number;
  refundsTotalCentimes: number;
} {
  let cashSalesCentimes = 0;
  let cardSalesCentimes = 0;
  let baridimobSalesCentimes = 0;
  let totalGrossSalesCentimes = 0;
  let refundsTotalCentimes = 0;

  for (const s of sales) {
    const amountC = dzdToCentimes(Number(s.totalAmount || 0));
    if (s.status === 'Refunded') {
      refundsTotalCentimes = addCentimes(refundsTotalCentimes, amountC);
      continue;
    }
    if (s.status === 'Voided') continue;

    totalGrossSalesCentimes = addCentimes(totalGrossSalesCentimes, amountC);
    if (s.paymentMethod === 'Cash') {
      cashSalesCentimes = addCentimes(cashSalesCentimes, amountC);
    } else if (s.paymentMethod === 'Card') {
      cardSalesCentimes = addCentimes(cardSalesCentimes, amountC);
    } else if (s.paymentMethod === 'BankTransfer') {
      baridimobSalesCentimes = addCentimes(baridimobSalesCentimes, amountC);
    } else if (s.paymentMethod === 'Split' && Array.isArray(s.payments)) {
      for (const p of s.payments) {
        const pC = dzdToCentimes(Number(p.amount || 0));
        if (p.method === 'Cash') cashSalesCentimes = addCentimes(cashSalesCentimes, pC);
        else if (p.method === 'Card') cardSalesCentimes = addCentimes(cardSalesCentimes, pC);
        else if (p.method === 'BankTransfer') {
          baridimobSalesCentimes = addCentimes(baridimobSalesCentimes, pC);
        }
      }
    }
  }

  return {
    cashSalesCentimes,
    cardSalesCentimes,
    baridimobSalesCentimes,
    totalGrossSalesCentimes,
    refundsTotalCentimes,
  };
}

export interface RefundLineRequest {
  productId: string;
  productName: string;
  quantity: number;
}

export interface RefundLineValidation {
  productId: string;
  productName: string;
  soldQuantity: number;
  alreadyRefundedQuantity: number;
  remainingRefundableQuantity: number;
  approvedQuantity: number;
  exceededRequested: boolean;
}

export function computeRefundableQuantities(
  sale: Pick<Sale, 'id' | 'items'>,
  stockMovements: Pick<StockMovement, 'productId' | 'productName' | 'type' | 'quantity' | 'reason'>[]
): RefundLineValidation[] {
  const shortId = sale.id.slice(-6).toUpperCase();
  const matchingRefunds = stockMovements.filter(
    (m) =>
      m.type === 'Return' &&
      typeof m.reason === 'string' &&
      m.reason.includes(`Refund #${shortId}`)
  );

  return (sale.items || []).map((item) => {
    const refundedQty = matchingRefunds
      .filter((m) => (item.productId ? m.productId === item.productId : m.productName === item.productName))
      .reduce((sum, m) => sum + Math.max(0, Number(m.quantity || 0)), 0);
    const soldQty = Math.max(0, Number(item.quantity || 0));
    const remaining = Math.max(0, soldQty - refundedQty);
    return {
      productId: item.productId || '',
      productName: item.productName,
      soldQuantity: soldQty,
      alreadyRefundedQuantity: refundedQty,
      remainingRefundableQuantity: remaining,
      approvedQuantity: remaining,
      exceededRequested: false,
    };
  });
}

export function clampPartialRefundItems(
  sale: Pick<Sale, 'id' | 'items'>,
  requestedItems: RefundLineRequest[] | undefined,
  stockMovements: Pick<StockMovement, 'productId' | 'productName' | 'type' | 'quantity' | 'reason'>[]
): {
  lines: RefundLineValidation[];
  validItems: RefundLineRequest[];
  hasExceededRequest: boolean;
  isFullRefund: boolean;
} {
  const baseline = computeRefundableQuantities(sale, stockMovements);
  if (!requestedItems || requestedItems.length === 0) {
    const validItems = baseline
      .filter((l) => l.remainingRefundableQuantity > 0)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        quantity: l.remainingRefundableQuantity,
      }));
    return {
      lines: baseline,
      validItems,
      hasExceededRequest: false,
      isFullRefund: validItems.length > 0,
    };
  }

  let hasExceededRequest = false;
  const lines = baseline.map((line) => {
    const req = requestedItems.find((r) =>
      line.productId ? r.productId === line.productId : r.productName === line.productName
    );
    const reqQty = Math.max(0, Number(req?.quantity || 0));
    const exceeded = reqQty > line.remainingRefundableQuantity;
    if (exceeded) hasExceededRequest = true;
    const approved = Math.min(reqQty, line.remainingRefundableQuantity);
    return {
      ...line,
      approvedQuantity: approved,
      exceededRequested: exceeded,
    };
  });

  const validItems = lines
    .filter((l) => l.approvedQuantity > 0)
    .map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.approvedQuantity,
    }));

  const isFullRefund = lines.every(
    (l) => l.remainingRefundableQuantity - l.approvedQuantity <= 0
  );

  return {
    lines,
    validItems,
    hasExceededRequest,
    isFullRefund,
  };
}
