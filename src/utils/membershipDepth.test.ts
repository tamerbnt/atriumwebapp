import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMemberQrPayload,
  calculateMidCyclePlanSwitch,
  calculateTrainerCommissionCentimes,
  cancelEnrollmentAndPromoteWaitlist,
  collectAutoRenewalCandidates,
  evaluateDayPassTotals,
  evaluateMemberFreeze,
  evaluateMemberResume,
  evaluateUnusedSessionRefund,
  generateQrMatrix21x21,
} from './membershipDepth';
import type { GymClassEnrollment, Member, MembershipPlan } from '../types/index';

const basePlan: MembershipPlan = {
  id: 'plan_1',
  tenantId: 'acc_t1',
  facilityId: 'br_1',
  name: '12-Session Pack',
  description: 'Session pack',
  durationDays: 30,
  totalSessions: 12,
  price: { amount: 6000, currency: 'DZD' },
  isActive: true,
  sessionsPerWeek: 3,
  isWalkIn: false,
  isPersonalTraining: false,
  genderRule: 0,
};

const proPlan: MembershipPlan = {
  ...basePlan,
  id: 'plan_2',
  name: 'Unlimited Pro',
  durationDays: 30,
  totalSessions: 30,
  price: { amount: 9000, currency: 'DZD' },
};

const sampleMember: Member = {
  id: 'mem_1',
  accountId: 'acc_t1',
  businessId: 'biz_1',
  branchId: 'br_1',
  tenantId: 'acc_t1',
  facilityId: 'br_1',
  fullName: 'Amira Cherif',
  email: 'amira@example.dz',
  phoneNumber: '0550123456',
  cardId: 'RFID-991122',
  status: 'Active',
  startDate: '2026-11-01',
  expirationDate: '2026-12-01',
  membershipPlanId: 'plan_1',
  membershipPlanName: '12-Session Pack',
  remainingSessions: 6,
  gender: 'Female',
  autoRenew: true,
  freezeDaysUsed: 0,
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
};

test('evaluateMemberFreeze blocks freeze during active check-in window unless overridden, and resume extends expiry', () => {
  const blocked = evaluateMemberFreeze({
    member: sampleMember,
    checkInLogs: [
      {
        memberId: 'mem_1',
        timestamp: '2026-11-27T09:30:00.000Z',
        accessStatus: 'Granted',
      },
    ],
    daysRequested: 7,
    nowIso: '2026-11-27T10:00:00.000Z',
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.error, 'ACTIVE_CHECKIN_WINDOW');
  assert.equal(blocked.duringActiveCheckInWindow, true);

  const forced = evaluateMemberFreeze({
    member: sampleMember,
    checkInLogs: [
      {
        memberId: 'mem_1',
        timestamp: '2026-11-27T09:30:00.000Z',
        accessStatus: 'Granted',
      },
    ],
    daysRequested: 7,
    nowIso: '2026-11-27T10:00:00.000Z',
    allowDuringActiveCheckIn: true,
    overrideReason: 'Injury recovery',
  });
  assert.equal(forced.allowed, true);
  assert.equal(forced.freezeUntilIso, '2026-12-04');

  const exceeded = evaluateMemberFreeze({
    member: { ...sampleMember, freezeDaysUsed: 25 },
    checkInLogs: [],
    daysRequested: 10,
    nowIso: '2026-11-27T10:00:00.000Z',
  });
  assert.equal(exceeded.allowed, false);
  assert.equal(exceeded.error, 'EXCEEDS_MAX_FREEZE_DAYS');

  const resumed = evaluateMemberResume({
    member: {
      status: 'Frozen',
      frozenAt: '2026-11-20T08:00:00.000Z',
      expirationDate: '2026-12-01',
    },
    nowIso: '2026-11-27T08:00:00.000Z',
    autoExtendExpiryOnResume: true,
  });
  assert.equal(resumed.allowed, true);
  assert.equal(resumed.actualFrozenDays, 7);
  assert.equal(resumed.extendedExpiryDate, '2026-12-08');
});

test('calculateMidCyclePlanSwitch & evaluateUnusedSessionRefund preserve exact integer centimes', () => {
  const switched = calculateMidCyclePlanSwitch({
    member: sampleMember, // 6 of 12 sessions left => 50% of 6,000 DZD = 3,000 DZD credit
    currentPlan: basePlan,
    targetPlan: proPlan, // 9,000 DZD
    nowIso: '2026-11-16',
  });
  assert.equal(switched.creditRemainingCentimes, 300000);
  assert.equal(switched.newPlanPriceCentimes, 900000);
  assert.equal(switched.netDeltaCentimes, 600000);
  assert.equal(switched.nextRemainingSessions, 30);

  const refund = evaluateUnusedSessionRefund({
    member: sampleMember,
    plan: basePlan,
    sessionsToRefund: 4, // 4/12 * 6000 = 2000 DZD = 200000 centimes
    adminFeeCentimes: 25000, // 250 DZD fee
  });
  assert.equal(refund.allowed, true);
  assert.equal(refund.grossRefundCentimes, 200000);
  assert.equal(refund.netRefundCentimes, 175000);
  assert.equal(refund.remainingAfterRefund, 2);
});

test('collectAutoRenewalCandidates identifies due auto-renew active members cleanly', () => {
  const candidates = collectAutoRenewalCandidates({
    members: [
      { ...sampleMember, expirationDate: '2026-11-28' },
      { ...sampleMember, id: 'mem_2', autoRenew: false, expirationDate: '2026-11-28' },
      { ...sampleMember, id: 'mem_3', status: 'Frozen', expirationDate: '2026-11-28' },
    ],
    plans: [basePlan],
    todayIso: '2026-11-27',
    leadDays: 3,
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].member.id, 'mem_1');
  assert.equal(candidates[0].nextExpirationDate, '2026-12-28');
  assert.equal(candidates[0].renewalAmountCentimes, 600000);
});

test('cancelEnrollmentAndPromoteWaitlist promotes earliest waitlisted member on cancellation', () => {
  const enrollments: GymClassEnrollment[] = [
    {
      id: 'enr_1',
      eventId: 'ev_1',
      memberId: 'mem_1',
      memberName: 'Amira',
      status: 'enrolled',
      enrolledAt: '2026-11-27T08:00:00Z',
    },
    {
      id: 'enr_2',
      eventId: 'ev_1',
      memberId: 'mem_2',
      memberName: 'Sara',
      status: 'waitlisted',
      enrolledAt: '2026-11-27T08:05:00Z',
    },
    {
      id: 'enr_3',
      eventId: 'ev_1',
      memberId: 'mem_3',
      memberName: 'Karim',
      status: 'waitlisted',
      enrolledAt: '2026-11-27T08:10:00Z',
    },
  ];
  const res = cancelEnrollmentAndPromoteWaitlist({
    enrollmentId: 'enr_1',
    enrollments,
    currentEnrolledCount: 1,
    nowIso: '2026-11-27T09:00:00Z',
  });
  assert.equal(res.cancelledEnrollment?.status, 'cancelled');
  assert.equal(res.promotedEnrollment?.id, 'enr_2');
  assert.equal(res.promotedEnrollment?.status, 'enrolled');
  assert.equal(res.nextEnrolledCount, 1);
});

test('QR pass matrix, trainer commissions & day-pass timbre toggle are deterministic', () => {
  const payload = buildMemberQrPayload(sampleMember);
  assert.equal(payload, 'ATR:MEM:BIZ_1:mem_1:RFID-991122');
  const grid = generateQrMatrix21x21(payload);
  assert.equal(grid.length, 21);
  assert.equal(grid[0].length, 21);
  assert.equal(grid[0][0], true); // TL finder corner
  assert.equal(grid[0][20], true); // TR finder corner
  assert.equal(grid[20][0], true); // BL finder corner

  assert.equal(calculateTrainerCommissionCentimes(600000, 1500), 90000); // 15% of 6,000 DZD = 900 DZD

  const withTimbre = evaluateDayPassTotals({ baseAmountDzd: 1000, paymentMethod: 'cash', applyTimbreFiscal: true });
  assert.equal(withTimbre.timbreDzd, 50);
  assert.equal(withTimbre.totalDzd, 1050);

  const withoutTimbre = evaluateDayPassTotals({ baseAmountDzd: 1000, paymentMethod: 'cash', applyTimbreFiscal: false });
  assert.equal(withoutTimbre.timbreDzd, 0);
  assert.equal(withoutTimbre.totalDzd, 1000);
});
