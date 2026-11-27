import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  selectCurrentClassEnrollmentsFromState,
  selectCurrentMemberFreezeLogsFromState,
  selectCurrentMembersFromState,
  selectCurrentPlansFromState,
  selectCurrentScheduleFromState,
  selectCurrentStaffFromState,
  selectCurrentTrainerCommissionsFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import { centimesToDzd, dzdToCentimes } from '../../utils/money';
import { buildMemberQrPayload, parseMemberQrPayload } from '../../utils/membershipDepth';
import { MemberQrPassModal } from '../../components/screens/membership/MemberLifecycleModals';
import { MembershipCourtsPanel } from '../../components/screens/membership/MembershipCourtsPanel';
import { TrainerCommissionsPanel } from '../../components/screens/membership/TrainerCommissionsPanel';
import { MembershipDashboardView } from '../../components/screens/membership/MembershipDashboardView';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 3 Step 1 (7.1 membership_session) — Deep Vertical Integration', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('en');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
    const gymBiz = getGlobalState().businesses.find((b) => b.category === 'membership_session');
    expect(gymBiz).toBeTruthy();
    if (gymBiz) {
      switchBusinessAction(gymBiz.id);
    }
  });

  it('enforces active check-in guard on freeze, allows explicit override, and extends expiry on resume', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const members = selectCurrentMembersFromState(getGlobalState());
    const activeMember = members.find((m) => m.status === 'Active');
    expect(activeMember).toBeTruthy();
    if (!activeMember) return;

    const initialExpiry = activeMember.expirationDate;

    // Trigger a fresh check-in so the 120-min active window guard fires
    const checkRes = actions.checkInMember(activeMember.id, { method: 'qr' });
    expect(checkRes?.allowed).toBe(true);

    // Freeze without override must block during active check-in window
    const blocked = actions.freezeMemberSubscription({
      memberId: activeMember.id,
      daysRequested: 10,
      feeCentimes: dzdToCentimes(500),
    });
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.error).toBe('ACTIVE_CHECKIN_WINDOW');
    }

    // Freeze with explicit manager override succeeds
    const frozen = actions.freezeMemberSubscription({
      memberId: activeMember.id,
      daysRequested: 10,
      feeCentimes: dzdToCentimes(500),
      allowDuringActiveCheckIn: true,
      overrideReason: 'Medical travel certificate verified',
    });
    expect(frozen.allowed).toBe(true);

    const frozenMember = selectCurrentMembersFromState(getGlobalState()).find(
      (m) => m.id === activeMember.id
    );
    expect(frozenMember?.status).toBe('Frozen');
    expect(frozenMember?.freezeDaysUsed).toBeGreaterThanOrEqual(10);

    const freezeLogs = selectCurrentMemberFreezeLogsFromState(getGlobalState()).filter(
      (l) => l.memberId === activeMember.id
    );
    expect(freezeLogs.some((l) => l.action === 'freeze' && l.duringActiveCheckInWindow)).toBe(true);

    // Resume extends expiry by at least 1 day and restores Active status
    const resumed = actions.resumeMemberSubscription(activeMember.id);
    expect(resumed.allowed).toBe(true);

    const resumedMember = selectCurrentMembersFromState(getGlobalState()).find(
      (m) => m.id === activeMember.id
    );
    expect(resumedMember?.status).toBe('Active');
    expect(Date.parse(resumedMember!.expirationDate)).toBeGreaterThan(Date.parse(initialExpiry));
  });

  it('computes mid-cycle plan switches and unused session refunds cleanly', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    let plans = selectCurrentPlansFromState(getGlobalState()).filter((p) => p.isActive);
    if (plans.length < 2) {
      actions.addMembershipPlan({
        name: '10 Sessions Pack',
        description: 'Limited pack',
        price: { amount: 6000, currency: 'DZD' },
        durationDays: 30,
        totalSessions: 10,
        isActive: true,
        sessionsPerWeek: 3,
        isWalkIn: false,
        isPersonalTraining: false,
        genderRule: 0,
      });
      actions.addMembershipPlan({
        name: 'Elite Coaching 20',
        description: 'Extended coaching pack',
        price: { amount: 12000, currency: 'DZD' },
        durationDays: 60,
        totalSessions: 20,
        isActive: true,
        sessionsPerWeek: 0,
        isWalkIn: false,
        isPersonalTraining: true,
        genderRule: 0,
      });
      plans = selectCurrentPlansFromState(getGlobalState()).filter((p) => p.isActive);
    }

    const members = selectCurrentMembersFromState(getGlobalState());
    const targetMember = members.find((m) => m.status === 'Active');
    expect(plans.length).toBeGreaterThanOrEqual(2);
    expect(targetMember).toBeTruthy();
    if (!targetMember || plans.length < 2) return;

    const currentPlan = plans[0];
    const upgradePlan = plans[1];
    actions.updateMember(targetMember.id, {
      membershipPlanId: currentPlan.id,
      membershipPlanName: currentPlan.name,
      remainingSessions: 12,
    });

    const switchRes = actions.switchMemberPlanMidCycle(targetMember.id, upgradePlan.id);
    expect(switchRes).toBeTruthy();
    expect(switchRes!.newPlanPriceCentimes).toBe(dzdToCentimes(upgradePlan.price.amount));

    const updatedAfterSwitch = selectCurrentMembersFromState(getGlobalState()).find(
      (m) => m.id === targetMember.id
    );
    expect(updatedAfterSwitch?.membershipPlanId).toBe(upgradePlan.id);

    // Refund 2 unused sessions if target plan tracks sessions
    actions.updateMember(targetMember.id, { remainingSessions: 8 });
    const memberForRefund = selectCurrentMembersFromState(getGlobalState()).find(
      (m) => m.id === targetMember.id
    )!;
    const planForRefund = plans.find((p) => p.id === memberForRefund.membershipPlanId);
    expect(planForRefund?.totalSessions).toBeGreaterThan(0);
    const refundRes = actions.refundMemberUnusedSessions(
      memberForRefund.id,
      2,
      dzdToCentimes(200)
    );
    expect(refundRes.allowed).toBe(true);
    if (refundRes.allowed) {
      expect(refundRes.remainingAfterRefund).toBe(6);
    }
  });

  it('links family packs, toggles auto-renewal, and processes auto-renewal candidates', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    let plans = selectCurrentPlansFromState(getGlobalState()).filter((p) => p.isActive);
    if (plans.length === 0) {
      actions.addMembershipPlan({
        name: 'Monthly Auto-Renew Plan',
        description: 'Monthly unlimited access',
        price: { amount: 4500, currency: 'DZD' },
        durationDays: 30,
        isActive: true,
        sessionsPerWeek: 0,
        isWalkIn: false,
        isPersonalTraining: false,
        genderRule: 0,
      });
      plans = selectCurrentPlansFromState(getGlobalState()).filter((p) => p.isActive);
    }

    const members = selectCurrentMembersFromState(getGlobalState());
    const primary = members[0];
    const dependent = members[1];
    expect(Boolean(primary && dependent && plans[0])).toBe(true);
    if (!primary || !dependent || !plans[0]) return;

    actions.updateMemberFamilyGroup(primary.id, 'FAM-ALGIERS-01', 'primary');
    actions.updateMemberFamilyGroup(dependent.id, 'FAM-ALGIERS-01', 'dependent');

    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    actions.updateMember(primary.id, {
      status: 'Active',
      membershipPlanId: plans[0].id,
      membershipPlanName: plans[0].name,
      expirationDate: tomorrow,
    });
    const enabled = actions.toggleMemberAutoRenew(primary.id, true, 30);
    expect(enabled).toBe(true);

    const renewed = actions.runAutoRenewalsForEligibleMembers(7);
    expect(renewed.some((r) => r.member.id === primary.id)).toBe(true);

    const refreshedPrimary = selectCurrentMembersFromState(getGlobalState()).find(
      (m) => m.id === primary.id
    );
    expect(Date.parse(refreshedPrimary!.expirationDate)).toBeGreaterThan(Date.parse(tomorrow));
    expect(refreshedPrimary?.familyGroupId).toBe('FAM-ALGIERS-01');
    expect(refreshedPrimary?.familyRole).toBe('primary');
  });

  it('cancels an enrolled member and automatically promotes the oldest waitlisted member', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    let events = selectCurrentScheduleFromState(getGlobalState());
    if (events.length === 0) {
      actions.upsertScheduleEvent({
        id: 'sch_test_waitlist_1',
        tenantId: getGlobalState().account.id,
        facilityId: getGlobalState().currentBranchId,
        title: 'HIIT Conditioning',
        category: 'HIIT',
        dayOfWeek: 1,
        startTime: '18:00',
        endTime: '19:00',
        trainerOrStaff: 'Coach Karim',
        roomOrArea: 'Studio A',
        capacity: 1,
        enrolledCount: 0,
      });
      events = selectCurrentScheduleFromState(getGlobalState());
    }

    const members = selectCurrentMembersFromState(getGlobalState());
    const event = events[0];
    expect(Boolean(event && members.length >= 2)).toBe(true);
    if (!event || members.length < 2) return;

    // Ensure capacity=1 and fresh enrollment count for deterministic waitlist check
    actions.upsertScheduleEvent({
      ...event,
      capacity: 1,
      enrolledCount: 0,
    });

    const firstRes = actions.enrollMemberInClass(event.id, members[0].id);
    expect(firstRes.success).toBe(true);
    expect(firstRes.status).toBe('enrolled');

    const secondRes = actions.enrollMemberInClass(event.id, members[1].id);
    expect(secondRes.success).toBe(true);
    expect(secondRes.status).toBe('waitlisted');

    const enrollmentsBefore = selectCurrentClassEnrollmentsFromState(getGlobalState()).filter(
      (ce) => ce.eventId === event.id && ce.status !== 'cancelled'
    );
    const enrolledRecord = enrollmentsBefore.find((ce) => ce.memberId === members[0].id);
    const waitlistedRecord = enrollmentsBefore.find((ce) => ce.memberId === members[1].id);
    expect(Boolean(enrolledRecord && waitlistedRecord)).toBe(true);
    if (!enrolledRecord || !waitlistedRecord) return;

    const cancelRes = actions.cancelClassEnrollment(enrolledRecord.id);
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.promotedMemberId).toBe(members[1].id);

    const promotedRecord = selectCurrentClassEnrollmentsFromState(getGlobalState()).find(
      (ce) => ce.id === waitlistedRecord.id
    );
    expect(promotedRecord?.status).toBe('enrolled');

    const refreshedEvent = selectCurrentScheduleFromState(getGlobalState()).find(
      (ev) => ev.id === event.id
    );
    expect(refreshedEvent?.enrolledCount).toBe(1);
  });

  it('records trainer commissions, posts to payroll, and folds them into coach payroll slips', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const staff = selectCurrentStaffFromState(getGlobalState());
    const coach = staff[0];
    expect(coach).toBeTruthy();
    if (!coach) return;

    const comm = actions.recordTrainerCommission({
      staffId: coach.id,
      staffName: coach.fullName,
      sourceLabel: 'Pack 10 PT Coaching',
      grossAmountCentimes: dzdToCentimes(20000),
      commissionRateBps: 1500, // 15% = 3000 DZD
    });
    expect(centimesToDzd(comm.commissionCentimes)).toBe(3000);
    expect(comm.status).toBe('pending');

    const posted = actions.postTrainerCommissionsToPayroll([comm.id]);
    expect(posted.length).toBe(1);
    expect(posted[0].status).toBe('posted_to_payroll');

    actions.generateStaffPayrollRun(11, 2026, 'membership_session');
    const stateAfter = getGlobalState();
    const coachSlip = stateAfter.staffPayrollSlips.find(
      (sl) => sl.staffId === coach.id && sl.periodMonth === 11 && sl.periodYear === 2026
    );
    expect(coachSlip).toBeTruthy();
    expect(coachSlip!.coachingCommission).toBeGreaterThanOrEqual(3000);

    const boundComm = selectCurrentTrainerCommissionsFromState(stateAfter).find(
      (c) => c.id === comm.id
    );
    expect(boundComm?.payrollRunId).toBeTruthy();
  });

  it('renders QR pass modal, Courts panel, Trainer Commissions panel, and Dashboard Retention pod', () => {
    const members = selectCurrentMembersFromState(getGlobalState());
    const member = members[0];
    expect(member).toBeTruthy();
    if (!member) return;

    const qrPayload = buildMemberQrPayload(member);
    const parsedQr = parseMemberQrPayload(qrPayload);
    expect(parsedQr.isAtriumQr).toBe(true);
    expect(parsedQr.memberId).toBe(member.id);

    const qrHtml = renderToStaticMarkup(
      <MemberQrPassModal
        isOpen
        onClose={() => {}}
        member={member}
        locale="en"
        showToast={() => {}}
      />
    );
    expect(qrHtml).toContain(qrPayload);
    expect(qrHtml).toContain('<svg');

    const courtsHtml = renderToStaticMarkup(<MembershipCourtsPanel language="en" />);
    expect(courtsHtml).toContain('Courts, Lanes &amp; Sports Resources');

    const staff = selectCurrentStaffFromState(getGlobalState());
    const commissionsHtml = renderToStaticMarkup(
      <TrainerCommissionsPanel staffList={staff} payrollRuns={[]} language="en" />
    );
    expect(commissionsHtml).toContain('Trainer Coaching &amp; Class Commissions');

    const dashboardHtml = renderToStaticMarkup(<MembershipDashboardView />);
    expect(dashboardHtml).toContain('data-testid="membership-retention-pod"');
    expect(dashboardHtml).toContain('Retention, Freeze &amp; Courts');
  });
});
