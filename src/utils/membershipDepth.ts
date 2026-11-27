import { addCentimes, centimesToDzd, dzdToCentimes, roundHalfAwayFromZero, subtractCentimes } from './money';
import { calculateArt317Timbre } from './rules';
import type {
  GymClassEnrollment,
  GymMemberFreezeLog,
  GymTrainerCommission,
  Member,
  MemberCheckInLog,
  MembershipFreezePolicy,
  MembershipPlan,
  RentableUnit,
  RentalBooking,
} from '../types/index';

export const DEFAULT_FREEZE_POLICY: MembershipFreezePolicy = {
  maxFreezeDaysPerCycle: 30,
  defaultFreezeFeeCentimes: 50000, // 500 DZD default unless overridden
  activeCheckInWindowMinutes: 120,
  autoExtendExpiryOnResume: true,
};

function addDaysIsoDate(dateStr: string, days: number): string {
  const baseMs = Date.parse(dateStr.slice(0, 10) + 'T00:00:00.000Z');
  const safeMs = Number.isFinite(baseMs) ? baseMs : Date.now();
  return new Date(safeMs + days * 86400000).toISOString().slice(0, 10);
}

export interface FreezeEvaluationResult {
  allowed: boolean;
  error?:
    | 'ALREADY_FROZEN'
    | 'INVALID_STATUS'
    | 'INVALID_DAYS'
    | 'EXCEEDS_MAX_FREEZE_DAYS'
    | 'ACTIVE_CHECKIN_WINDOW';
  duringActiveCheckInWindow: boolean;
  lastCheckInAt?: string;
  requestedDays: number;
  feeCentimes: number;
  freezeUntilIso: string;
}

export function evaluateMemberFreeze(params: {
  member: Pick<Member, 'id' | 'status' | 'freezeDaysUsed' | 'expirationDate'>;
  checkInLogs: Pick<MemberCheckInLog, 'memberId' | 'timestamp' | 'accessStatus'>[];
  daysRequested: number;
  feeCentimes?: number;
  nowIso?: string;
  policy?: Partial<MembershipFreezePolicy>;
  allowDuringActiveCheckIn?: boolean;
  overrideReason?: string;
}): FreezeEvaluationResult {
  const policy: MembershipFreezePolicy = {
    ...DEFAULT_FREEZE_POLICY,
    ...(params.policy || {}),
  };
  const nowIso = params.nowIso || new Date().toISOString();
  const nowMs = Date.parse(nowIso) || Date.now();

  if (params.member.status === 'Frozen') {
    return {
      allowed: false,
      error: 'ALREADY_FROZEN',
      duringActiveCheckInWindow: false,
      requestedDays: 0,
      feeCentimes: 0,
      freezeUntilIso: nowIso.slice(0, 10),
    };
  }
  if (params.member.status !== 'Active') {
    return {
      allowed: false,
      error: 'INVALID_STATUS',
      duringActiveCheckInWindow: false,
      requestedDays: 0,
      feeCentimes: 0,
      freezeUntilIso: nowIso.slice(0, 10),
    };
  }

  const days = Math.trunc(Number(params.daysRequested) || 0);
  if (days <= 0) {
    return {
      allowed: false,
      error: 'INVALID_DAYS',
      duringActiveCheckInWindow: false,
      requestedDays: days,
      feeCentimes: 0,
      freezeUntilIso: nowIso.slice(0, 10),
    };
  }

  const alreadyUsed = Math.max(0, Number(params.member.freezeDaysUsed || 0));
  if (alreadyUsed + days > policy.maxFreezeDaysPerCycle) {
    return {
      allowed: false,
      error: 'EXCEEDS_MAX_FREEZE_DAYS',
      duringActiveCheckInWindow: false,
      requestedDays: days,
      feeCentimes: 0,
      freezeUntilIso: addDaysIsoDate(nowIso, days),
    };
  }

  const windowMs = Math.max(0, policy.activeCheckInWindowMinutes) * 60 * 1000;
  const recentCheckIn = params.checkInLogs
    .filter(
      (l) =>
        l.memberId === params.member.id &&
        (l.accessStatus === 'Granted' || l.accessStatus === 'Warning_Expiring')
    )
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];

  const diffMs = recentCheckIn ? nowMs - Date.parse(recentCheckIn.timestamp) : Infinity;
  const inActiveWindow = Boolean(
    recentCheckIn && Number.isFinite(diffMs) && diffMs >= 0 && diffMs <= windowMs
  );

  if (inActiveWindow && !params.allowDuringActiveCheckIn) {
    return {
      allowed: false,
      error: 'ACTIVE_CHECKIN_WINDOW',
      duringActiveCheckInWindow: true,
      lastCheckInAt: recentCheckIn?.timestamp,
      requestedDays: days,
      feeCentimes: Math.max(0, Math.trunc(params.feeCentimes ?? policy.defaultFreezeFeeCentimes)),
      freezeUntilIso: addDaysIsoDate(nowIso, days),
    };
  }

  return {
    allowed: true,
    duringActiveCheckInWindow: inActiveWindow,
    lastCheckInAt: recentCheckIn?.timestamp,
    requestedDays: days,
    feeCentimes: Math.max(0, Math.trunc(params.feeCentimes ?? policy.defaultFreezeFeeCentimes)),
    freezeUntilIso: addDaysIsoDate(nowIso, days),
  };
}

export interface ResumeEvaluationResult {
  allowed: boolean;
  error?: 'NOT_FROZEN';
  actualFrozenDays: number;
  extendedExpiryDate: string;
}

export function evaluateMemberResume(params: {
  member: Pick<Member, 'status' | 'frozenAt' | 'freezeUntil' | 'expirationDate'>;
  nowIso?: string;
  autoExtendExpiryOnResume?: boolean;
}): ResumeEvaluationResult {
  if (params.member.status !== 'Frozen') {
    return {
      allowed: false,
      error: 'NOT_FROZEN',
      actualFrozenDays: 0,
      extendedExpiryDate: params.member.expirationDate,
    };
  }
  const nowIso = params.nowIso || new Date().toISOString();
  const nowMs = Date.parse(nowIso) || Date.now();
  const frozenMs = params.member.frozenAt ? Date.parse(params.member.frozenAt) : nowMs;
  const diffDays = Number.isFinite(frozenMs)
    ? Math.max(1, Math.ceil(Math.max(0, nowMs - frozenMs) / 86400000))
    : 1;
  const shouldExtend = params.autoExtendExpiryOnResume ?? true;
  const extendedExpiryDate =
    shouldExtend && params.member.expirationDate
      ? addDaysIsoDate(params.member.expirationDate, diffDays)
      : params.member.expirationDate;

  return {
    allowed: true,
    actualFrozenDays: diffDays,
    extendedExpiryDate,
  };
}

export interface MidCyclePlanSwitchResult {
  creditRemainingCentimes: number;
  newPlanPriceCentimes: number;
  netDeltaCentimes: number; // >0 means charge difference; <0 means refund/avoir credit
  unusedRatioPercent: number;
  nextExpirationDate: string;
  nextRemainingSessions: number;
}

export function calculateMidCyclePlanSwitch(params: {
  member: Pick<Member, 'startDate' | 'expirationDate' | 'remainingSessions'>;
  currentPlan: Pick<MembershipPlan, 'durationDays' | 'totalSessions' | 'price'> | null | undefined;
  targetPlan: Pick<MembershipPlan, 'durationDays' | 'totalSessions' | 'price'>;
  nowIso?: string;
}): MidCyclePlanSwitchResult {
  const nowIso = (params.nowIso || new Date().toISOString()).slice(0, 10);
  const nowMs = Date.parse(nowIso + 'T00:00:00.000Z');
  const currentPriceCentimes = params.currentPlan ? dzdToCentimes(params.currentPlan.price.amount) : 0;
  const newPlanPriceCentimes = dzdToCentimes(params.targetPlan.price.amount);

  let ratio = 0;
  if (
    params.currentPlan?.totalSessions &&
    params.currentPlan.totalSessions > 0 &&
    params.member.remainingSessions >= 0
  ) {
    ratio = Math.min(1, Math.max(0, params.member.remainingSessions / params.currentPlan.totalSessions));
  } else {
    const startMs = Date.parse((params.member.startDate || nowIso).slice(0, 10) + 'T00:00:00.000Z');
    const expMs = Date.parse((params.member.expirationDate || nowIso).slice(0, 10) + 'T00:00:00.000Z');
    const totalMs = Math.max(86400000, expMs - startMs);
    const remMs = Math.max(0, expMs - nowMs);
    ratio = Math.min(1, Math.max(0, remMs / totalMs));
  }

  const creditRemainingCentimes =
    currentPriceCentimes > 0 ? roundHalfAwayFromZero(currentPriceCentimes * ratio) : 0;
  const netDeltaCentimes = subtractCentimes(newPlanPriceCentimes, creditRemainingCentimes);
  const durationDays =
    params.targetPlan.durationDays != null && params.targetPlan.durationDays > 0
      ? params.targetPlan.durationDays
      : 30;
  const nextExpirationDate = addDaysIsoDate(nowIso, durationDays);
  const nextRemainingSessions =
    params.targetPlan.totalSessions != null && params.targetPlan.totalSessions > 0
      ? params.targetPlan.totalSessions
      : params.member.remainingSessions;

  return {
    creditRemainingCentimes,
    newPlanPriceCentimes,
    netDeltaCentimes,
    unusedRatioPercent: Math.round(ratio * 1000) / 10,
    nextExpirationDate,
    nextRemainingSessions,
  };
}

export interface SessionRefundResult {
  allowed: boolean;
  error?: 'INVALID_SESSION_COUNT' | 'NO_REFUNDABLE_PLAN';
  refundableSessions: number;
  perSessionCentimes: number;
  grossRefundCentimes: number;
  adminFeeCentimes: number;
  netRefundCentimes: number;
  remainingAfterRefund: number;
}

export function evaluateUnusedSessionRefund(params: {
  member: Pick<Member, 'remainingSessions'>;
  plan: Pick<MembershipPlan, 'totalSessions' | 'price'> | null | undefined;
  sessionsToRefund: number;
  adminFeeCentimes?: number;
}): SessionRefundResult {
  const requested = Math.trunc(Number(params.sessionsToRefund) || 0);
  const available = Math.max(0, Number(params.member.remainingSessions || 0));
  if (requested <= 0 || requested > available) {
    return {
      allowed: false,
      error: 'INVALID_SESSION_COUNT',
      refundableSessions: 0,
      perSessionCentimes: 0,
      grossRefundCentimes: 0,
      adminFeeCentimes: 0,
      netRefundCentimes: 0,
      remainingAfterRefund: available,
    };
  }
  const totalPack = Number(params.plan?.totalSessions || 0);
  const planPriceCentimes = params.plan ? dzdToCentimes(params.plan.price.amount) : 0;
  if (totalPack <= 0 || planPriceCentimes <= 0) {
    return {
      allowed: false,
      error: 'NO_REFUNDABLE_PLAN',
      refundableSessions: 0,
      perSessionCentimes: 0,
      grossRefundCentimes: 0,
      adminFeeCentimes: 0,
      netRefundCentimes: 0,
      remainingAfterRefund: available,
    };
  }

  const perSessionCentimes = roundHalfAwayFromZero(planPriceCentimes / totalPack);
  const grossRefundCentimes = roundHalfAwayFromZero((planPriceCentimes * requested) / totalPack);
  const fee = Math.max(0, Math.trunc(params.adminFeeCentimes || 0));
  const netRefundCentimes = Math.max(0, subtractCentimes(grossRefundCentimes, fee));

  return {
    allowed: true,
    refundableSessions: requested,
    perSessionCentimes,
    grossRefundCentimes,
    adminFeeCentimes: fee,
    netRefundCentimes,
    remainingAfterRefund: Math.max(0, available - requested),
  };
}

export interface AutoRenewalCandidate {
  member: Member;
  plan: MembershipPlan;
  nextStartDate: string;
  nextExpirationDate: string;
  nextRemainingSessions: number;
  renewalAmountCentimes: number;
}

export function collectAutoRenewalCandidates(params: {
  members: Member[];
  plans: MembershipPlan[];
  todayIso?: string;
  leadDays?: number;
}): AutoRenewalCandidate[] {
  const todayIso = (params.todayIso || new Date().toISOString()).slice(0, 10);
  const todayMs = Date.parse(todayIso + 'T00:00:00.000Z');
  const leadMs = Math.max(0, params.leadDays ?? 3) * 86400000;
  const out: AutoRenewalCandidate[] = [];

  for (const m of params.members) {
    if (!m.autoRenew) continue;
    if (m.status === 'Frozen' || m.status === 'Banned' || m.status === 'Suspended') continue;
    const plan =
      params.plans.find((p) => p.id === m.membershipPlanId) ||
      params.plans.find(
        (p) => m.membershipPlanName && p.name.toLowerCase() === m.membershipPlanName.toLowerCase()
      );
    if (!plan || !plan.isActive) continue;

    const expStr = (m.expirationDate || todayIso).slice(0, 10);
    const expMs = Date.parse(expStr + 'T00:00:00.000Z');
    if (!Number.isFinite(expMs) || expMs - todayMs > leadMs) continue;

    const cycleDays = m.billingCycleDays || plan.durationDays || 30;
    const baseStart = expMs >= todayMs ? expStr : todayIso;
    const nextExp = addDaysIsoDate(baseStart, cycleDays);
    const nextSessions =
      plan.totalSessions != null && plan.totalSessions > 0 ? plan.totalSessions : m.remainingSessions;

    out.push({
      member: m,
      plan,
      nextStartDate: baseStart,
      nextExpirationDate: nextExp,
      nextRemainingSessions: nextSessions,
      renewalAmountCentimes: dzdToCentimes(plan.price.amount),
    });
  }
  return out;
}

export interface WaitlistCancelResult {
  cancelledEnrollment: GymClassEnrollment | null;
  promotedEnrollment: GymClassEnrollment | null;
  nextEnrolledCount: number;
  updatedEnrollments: GymClassEnrollment[];
}

export function cancelEnrollmentAndPromoteWaitlist(params: {
  enrollmentId: string;
  enrollments: GymClassEnrollment[];
  currentEnrolledCount: number;
  nowIso?: string;
}): WaitlistCancelResult {
  const nowIso = params.nowIso || new Date().toISOString();
  const target = params.enrollments.find((e) => e.id === params.enrollmentId);
  if (!target || target.status === 'cancelled') {
    return {
      cancelledEnrollment: null,
      promotedEnrollment: null,
      nextEnrolledCount: params.currentEnrolledCount,
      updatedEnrollments: params.enrollments,
    };
  }

  const cancelledEnrollment: GymClassEnrollment = {
    ...target,
    status: 'cancelled',
    cancelledAt: nowIso,
  };

  let promotedEnrollment: GymClassEnrollment | null = null;
  if (target.status === 'enrolled') {
    const nextInLine = params.enrollments
      .filter((e) => e.eventId === target.eventId && e.status === 'waitlisted' && e.id !== target.id)
      .sort((a, b) => Date.parse(a.enrolledAt) - Date.parse(b.enrolledAt))[0];

    if (nextInLine) {
      promotedEnrollment = {
        ...nextInLine,
        status: 'enrolled',
      };
    }
  }

  const updatedEnrollments = params.enrollments.map((e) => {
    if (e.id === cancelledEnrollment.id) return cancelledEnrollment;
    if (promotedEnrollment && e.id === promotedEnrollment.id) return promotedEnrollment;
    return e;
  });

  const nextEnrolledCount =
    target.status === 'enrolled' && !promotedEnrollment
      ? Math.max(0, params.currentEnrolledCount - 1)
      : params.currentEnrolledCount;

  return {
    cancelledEnrollment,
    promotedEnrollment,
    nextEnrolledCount,
    updatedEnrollments,
  };
}

export function buildMemberQrPayload(member: Pick<Member, 'id' | 'businessId' | 'cardId'>): string {
  const bizTag = (member.businessId || 'ATRIUM').slice(0, 8).toUpperCase();
  const cardTag = (member.cardId || member.id.slice(0, 8)).toUpperCase();
  return `ATR:MEM:${bizTag}:${member.id}:${cardTag}`;
}

/**
 * Generates a deterministic 21x21 QR-like finder+data matrix for offline/online member badges.
 * Always places canonical 7x7 finder patterns at TL, TR, and BL corners plus timing tracks.
 */
export function generateQrMatrix21x21(payload: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = border || inner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Deterministic hash seed over payload bytes for data modules
  let h1 = 2166136261 >>> 0;
  for (let i = 0; i < payload.length; i++) {
    h1 ^= payload.charCodeAt(i);
    h1 = Math.imul(h1, 16777619) >>> 0;
  }

  const isReserved = (r: number, c: number) => {
    if (r < 8 && c < 8) return true;
    if (r < 8 && c >= size - 8) return true;
    if (r >= size - 8 && c < 8) return true;
    if (r === 6 || c === 6) return true;
    return false;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isReserved(r, c)) continue;
      h1 ^= (r * 31 + c * 17 + (payload.charCodeAt((r + c) % Math.max(1, payload.length)) || 7)) >>> 0;
      h1 = Math.imul(h1, 16777619) >>> 0;
      grid[r][c] = (h1 & 1) === 1;
    }
  }

  return grid;
}

export function calculateTrainerCommissionCentimes(
  grossAmountCentimes: number,
  commissionRateBps: number
): number {
  const gross = Math.max(0, Math.trunc(grossAmountCentimes || 0));
  const bps = Math.min(10000, Math.max(0, Math.trunc(commissionRateBps || 0)));
  if (gross === 0 || bps === 0) return 0;
  return roundHalfAwayFromZero((gross * bps) / 10000);
}

export function evaluateDayPassTotals(params: {
  baseAmountDzd: number;
  paymentMethod: string;
  applyTimbreFiscal: boolean;
}): {
  baseCentimes: number;
  timbreCentimes: number;
  totalCentimes: number;
  timbreDzd: number;
  totalDzd: number;
} {
  const baseCentimes = Math.max(0, dzdToCentimes(params.baseAmountDzd));
  const isCash = params.paymentMethod.toLowerCase() === 'cash';
  const timbreDzd =
    params.applyTimbreFiscal && isCash ? calculateArt317Timbre(centimesToDzd(baseCentimes)) : 0;
  const timbreCentimes = dzdToCentimes(timbreDzd);
  const totalCentimes = addCentimes(baseCentimes, timbreCentimes);
  return {
    baseCentimes,
    timbreCentimes,
    totalCentimes,
    timbreDzd,
    totalDzd: centimesToDzd(totalCentimes),
  };
}

export function isGymCourtOrResourceUnit(unit: Pick<RentableUnit, 'type' | 'name'>): boolean {
  const t = (unit.type || '').toLowerCase();
  const n = (unit.name || '').toLowerCase();
  return (
    t === 'court' ||
    t === 'lane' ||
    t === 'studio' ||
    t === 'zone' ||
    /padel|tennis|court|terrain|pool|piscine|lane|couloir|climb|escalade|ring|tatami|cage/.test(
      `${t} ${n}`
    )
  );
}

export function computeMembershipRetentionSummary(params: {
  members: Member[];
  freezeLogs: GymMemberFreezeLog[];
  commissions: GymTrainerCommission[];
  courtBookings: RentalBooking[];
}): {
  activeRatePct: number;
  autoRenewRatePct: number;
  frozenCount: number;
  familyLinkedCount: number;
  pendingCommissionCentimes: number;
  activeCourtBookingsCount: number;
} {
  const total = Math.max(1, params.members.length);
  const activeCount = params.members.filter((m) => m.status === 'Active').length;
  const autoRenewCount = params.members.filter((m) => Boolean(m.autoRenew)).length;
  const frozenCount = params.members.filter((m) => m.status === 'Frozen').length;
  const familyLinkedCount = params.members.filter((m) => Boolean(m.familyGroupId)).length;
  const pendingCommissionCentimes = params.commissions
    .filter((c) => c.status === 'pending')
    .reduce((acc, c) => acc + c.commissionCentimes, 0);
  const activeCourtBookingsCount = params.courtBookings.filter(
    (b) => b.status === 'Confirmed' || b.status === 'CheckedIn' || b.status === 'Pending'
  ).length;

  return {
    activeRatePct: Math.round((activeCount / total) * 1000) / 10,
    autoRenewRatePct: Math.round((autoRenewCount / total) * 1000) / 10,
    frozenCount,
    familyLinkedCount,
    pendingCommissionCentimes,
    activeCourtBookingsCount,
  };
}
