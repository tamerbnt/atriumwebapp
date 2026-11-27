import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { mapMemberFromDb, mapLeadFromDb } from '../mappers';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  Member,
  RegistrationLead,
  MemberCheckInLog,
  WalkInTicket,
  MembershipPlan,
  ScheduleEvent,
  GymClassEnrollment,
  GymMemberFreezeLog,
  GymTrainerCommission,
} from '../../../types/index';

export const mapMembershipPlanFromDb = (row: any): MembershipPlan => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  name: row.name,
  description: row.description || '',
  durationDays: row.duration_days != null ? Number(row.duration_days) : null,
  totalSessions: row.total_sessions != null ? Number(row.total_sessions) : null,
  price: { amount: Number(row.price_dzd || 0), currency: row.currency || 'DZD' },
  isActive: row.is_active ?? true,
  sessionsPerWeek: Number(row.session_quota ?? 0),
  isWalkIn: false,
  isPersonalTraining: false,
  genderRule: 0,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapScheduleEventFromDb = (row: any): ScheduleEvent => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id || undefined,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  title: row.title,
  trainerOrStaff: row.coach_name || '',
  roomOrArea: row.room_name || '',
  dayOfWeek: Number(row.day_of_week ?? 0),
  startTime: row.start_time,
  endTime: row.end_time,
  capacity: Number(row.capacity || 20),
  enrolledCount: Number(row.enrolled_count || 0),
  category: row.category || 'Class',
  coachConfirmed: Boolean(row.coach_confirmed),
  coachConfirmedAt: row.coach_confirmed_at || undefined,
  coachConfirmedBy: row.coach_confirmed_by || undefined,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapClassEnrollmentFromDb = (row: any): GymClassEnrollment => ({
  id: row.id,
  accountId: row.account_id || undefined,
  businessId: row.business_id || undefined,
  branchId: row.branch_id || undefined,
  staffId: row.staff_id || undefined,
  eventId: row.event_id,
  memberId: row.member_id,
  memberName: row.member_name || '',
  status: (row.status || 'enrolled') as GymClassEnrollment['status'],
  enrolledAt: row.enrolled_at || row.created_at || new Date().toISOString(),
  cancelledAt: row.cancelled_at || undefined,
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
});

export const memberService = {
  async fetchMembers(branchId: string, updatedAfter?: string | null): Promise<Member[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('gym_members')
            .select(
              'id, account_id, business_id, branch_id, staff_id, full_name, email, phone_number, card_id, rfid_tag, barcode, plan_id, plan_name, status, start_date, expiration_date, remaining_sessions, gender, notes, emergency_contact_name, emergency_contact_phone, profile_image_url, auto_renew, billing_cycle_days, family_group_id, family_role, frozen_at, freeze_until, freeze_days_used, freeze_fee_centimes, freeze_reason, qr_token, version, created_at, updated_at'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );
      return rows.map(mapMemberFromDb);
    } catch (error: any) {
      console.warn('[memberService] fetchMembers failed:', error?.message || error);
      return [];
    }
  },

  async createMember(member: Member): Promise<Member | null> {
    const id = toValidUuid(member.id);
    const trace = buildTraceEnvelope({
      accountId: member.accountId || member.tenantId,
      businessId: member.businessId,
      branchId: member.branchId || member.facilityId,
      staffId: member.staffId,
    });

    const payload = {
      id,
      ...trace,
      plan_id: member.membershipPlanId ? toValidUuid(member.membershipPlanId) : null,
      plan_name: member.membershipPlanName || null,
      full_name: member.fullName,
      email: member.email || null,
      phone_number: member.phoneNumber || null,
      status: member.status || 'Active',
      card_id: member.cardId || null,
      profile_image_url: member.profileImageUrl || null,
      start_date: member.startDate,
      expiration_date: member.expirationDate || null,
      remaining_sessions: member.remainingSessions ?? null,
      gender: member.gender || 'Other',
      notes: member.notes || null,
      emergency_contact_name: member.emergencyContactName || null,
      emergency_contact_phone: member.emergencyContactPhone || null,
      auto_renew: Boolean(member.autoRenew),
      billing_cycle_days: member.billingCycleDays ?? null,
      family_group_id: member.familyGroupId || null,
      family_role: member.familyRole || null,
      frozen_at: member.frozenAt || null,
      freeze_until: member.freezeUntil || null,
      freeze_days_used: member.freezeDaysUsed ?? 0,
      freeze_fee_centimes: member.freezeFeeCentimes ?? 0,
      freeze_reason: member.freezeReason || null,
      qr_token: member.qrToken || null,
    };

    await syncCoordinator.mutateOrQueueUpsert('gym_members', payload, {
      expectedVersion: member.version,
      entityType: 'Member',
      entityLabel: member.fullName,
      localData: payload,
    });

    return { ...member, id };
  },

  async updateMember(member: Member): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: member.accountId || member.tenantId,
      businessId: member.businessId,
      branchId: member.branchId || member.facilityId,
      staffId: member.staffId,
    });

    const payload = {
      id: toValidUuid(member.id),
      ...trace,
      plan_id: member.membershipPlanId ? toValidUuid(member.membershipPlanId) : null,
      plan_name: member.membershipPlanName || null,
      full_name: member.fullName,
      email: member.email || null,
      phone_number: member.phoneNumber || null,
      status: member.status || 'Active',
      card_id: member.cardId || null,
      profile_image_url: member.profileImageUrl || null,
      start_date: member.startDate,
      expiration_date: member.expirationDate || null,
      remaining_sessions: member.remainingSessions ?? null,
      gender: member.gender || 'Other',
      notes: member.notes || null,
      emergency_contact_name: member.emergencyContactName || null,
      emergency_contact_phone: member.emergencyContactPhone || null,
      auto_renew: Boolean(member.autoRenew),
      billing_cycle_days: member.billingCycleDays ?? null,
      family_group_id: member.familyGroupId || null,
      family_role: member.familyRole || null,
      frozen_at: member.frozenAt || null,
      freeze_until: member.freezeUntil || null,
      freeze_days_used: member.freezeDaysUsed ?? 0,
      freeze_fee_centimes: member.freezeFeeCentimes ?? 0,
      freeze_reason: member.freezeReason || null,
      qr_token: member.qrToken || null,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('gym_members', payload, {
      expectedVersion: member.version,
      entityType: 'Member',
      entityLabel: member.fullName,
      localData: payload,
    });
    return res.success;
  },

  async deleteMember(memberId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('gym_members', memberId, deletedByStaffId);
    return res.success;
  },

  async recordCheckIn(
    branchId: string,
    memberId: string,
    method: 'rfid' | 'qr' | 'manual' | 'turnstile' = 'rfid',
    deviceId?: string,
    options?: {
      checkInId?: string;
      duplicateWindowMinutes?: number;
      overrideByStaffId?: string;
      overrideReason?: string;
    }
  ) {
    return syncCoordinator.rpcOrQueue('gym_record_check_in', {
      p_branch_id: toValidUuid(branchId),
      p_member_id: toValidUuid(memberId),
      p_method: method,
      p_device_id: deviceId || null,
      p_check_in_id: options?.checkInId ? toValidUuid(options.checkInId) : null,
      p_duplicate_window_minutes: options?.duplicateWindowMinutes ?? 5,
      p_override_by_staff_id: options?.overrideByStaffId ? toValidUuid(options.overrideByStaffId) : null,
      p_override_reason: options?.overrideReason?.trim() || null,
    });
  },

  async fetchCheckIns(branchId: string, updatedAfter?: string | null): Promise<MemberCheckInLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('gym_check_ins')
        .select(
          'id, account_id, business_id, branch_id, staff_id, member_id, member_name, checked_in_at, status, method, remaining_sessions_after, override_by_staff_id, override_reason, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('checked_in_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return rows.map((row: any): MemberCheckInLog => ({
      id: row.id,
      accountId: row.account_id || '',
      businessId: row.business_id || '',
      branchId: row.branch_id,
      staffId: row.staff_id || '',
      memberId: row.member_id,
      memberName: row.member_name || '',
      planId: row.plan_id || '',
      planName: row.plan_name || '',
      timestamp: row.checked_in_at,
      accessStatus:
        row.status === 'granted'
          ? 'Granted'
          : row.status === 'denied_frozen'
          ? 'Denied_Frozen'
          : 'Denied_Expired',
      remainingSessionsAfter:
        row.remaining_sessions_after != null ? Number(row.remaining_sessions_after) : undefined,
      checkInMethod:
        row.method === 'rfid'
          ? 'nfc_card'
          : row.method === 'qr'
          ? 'barcode_scanner'
          : 'manual_click',
      overrideByStaffId: row.override_by_staff_id || undefined,
      overrideReason: row.override_reason || undefined,
      version: row.version != null ? Number(row.version) : undefined,
    }));
  },

  async fetchWalkInTickets(branchId: string, updatedAfter?: string | null): Promise<WalkInTicket[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('gym_walk_in_tickets')
          .select(
            'id, account_id, business_id, branch_id, staff_id, visitor_name, phone_number, ticket_code, amount_dzd, payment_method, valid_date, created_at, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map((row: any): WalkInTicket => ({
        id: row.id,
        accountId: row.account_id || '',
        businessId: row.business_id || '',
        branchId: row.branch_id,
        staffId: row.staff_id || '',
        ticketNumber: row.ticket_code || '',
        clientName: row.visitor_name || '',
        phone: row.phone_number || undefined,
        amountDzd: Number(row.amount_dzd || 0),
        paymentMethod: (row.payment_method || 'cash').toLowerCase() as WalkInTicket['paymentMethod'],
        timbreFiscalDzd: 0,
        issuedAt: row.created_at || `${row.valid_date}T00:00:00.000Z`,
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertWalkInTicket(ticket: WalkInTicket, ctx: { accountId: string; businessId: string; branchId: string }) {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
    });
    const payload = {
      id: toValidUuid(ticket.id),
      ...trace,
      visitor_name: ticket.clientName,
      phone_number: ticket.phone || null,
      ticket_code: ticket.ticketNumber || `WI-${new Date().getFullYear()}-00001`,
      amount_dzd: ticket.amountDzd,
      payment_method: ticket.paymentMethod || 'cash',
      valid_date: (ticket.issuedAt || new Date().toISOString()).slice(0, 10),
      is_used: false,
    };
    return syncCoordinator.mutateOrQueueUpsert('gym_walk_in_tickets', payload, {
      expectedVersion: ticket.version,
      entityType: 'WalkInTicket',
      entityLabel: ticket.ticketNumber || ticket.clientName,
      localData: payload,
    });
  },

  async fetchPlans(branchId: string): Promise<MembershipPlan[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('gym_plans')
        .select(
          'id, account_id, business_id, branch_id, name, description, duration_days, total_sessions, price_dzd, currency, is_active, session_quota, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return rows.map(mapMembershipPlanFromDb);
  },

  async upsertPlan(plan: MembershipPlan, ctx: { accountId: string; businessId: string; branchId: string }) {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(plan.id),
      ...trace,
      name: plan.name,
      description: plan.description || null,
      duration_days: plan.durationDays ?? null,
      total_sessions: plan.totalSessions ?? null,
      session_quota: plan.sessionsPerWeek ?? null,
      price_dzd: plan.price.amount,
      currency: plan.price.currency || 'DZD',
      is_active: plan.isActive,
    };
    return syncCoordinator.mutateOrQueueUpsert('gym_plans', payload, {
      expectedVersion: plan.version,
      entityType: 'MembershipPlan',
      entityLabel: plan.name,
      localData: payload,
    });
  },

  async deletePlan(planId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('gym_plans', planId, deletedByStaffId);
    return res.success;
  },

  async fetchScheduleEvents(branchId: string): Promise<ScheduleEvent[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('gym_schedule_events')
        .select(
          'id, account_id, business_id, branch_id, staff_id, title, coach_name, room_name, day_of_week, start_time, end_time, capacity, enrolled_count, coach_confirmed, coach_confirmed_at, coach_confirmed_by, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return rows.map(mapScheduleEventFromDb);
  },

  async upsertScheduleEvent(
    ev: ScheduleEvent,
    ctx?: { accountId?: string; businessId?: string; branchId?: string; staffId?: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ev.accountId || ctx?.accountId || ev.tenantId,
      businessId: ev.businessId || ctx?.businessId,
      branchId: ev.branchId || ctx?.branchId || ev.facilityId,
      staffId: ev.staffId || ctx?.staffId,
    });
    const payload = {
      id: toValidUuid(ev.id),
      ...trace,
      title: ev.title,
      coach_name: ev.trainerOrStaff || null,
      room_name: ev.roomOrArea || null,
      day_of_week: ev.dayOfWeek,
      start_time: ev.startTime,
      end_time: ev.endTime,
      capacity: ev.capacity,
      enrolled_count: ev.enrolledCount,
      category: ev.category || 'Class',
      coach_confirmed: Boolean(ev.coachConfirmed),
      coach_confirmed_at: ev.coachConfirmedAt || null,
      coach_confirmed_by: ev.coachConfirmedBy ? toValidUuid(ev.coachConfirmedBy) : null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('gym_schedule_events', payload, {
      expectedVersion: ev.version,
      entityType: 'ScheduleEvent',
      entityLabel: ev.title,
      localData: payload,
    });
    return res.success;
  },

  async deleteScheduleEvent(eventId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('gym_schedule_events', eventId, deletedByStaffId);
    return res.success;
  },

  async fetchClassEnrollments(branchId: string): Promise<GymClassEnrollment[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('gym_class_enrollments')
          .select(
            'id, account_id, business_id, branch_id, staff_id, event_id, member_id, member_name, status, enrolled_at, cancelled_at, notes, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('enrolled_at', { ascending: false })
          .range(from, to)
      );
      return rows.map(mapClassEnrollmentFromDb);
    } catch {
      return [];
    }
  },

  async upsertClassEnrollment(
    enrollment: GymClassEnrollment,
    ctx?: { accountId?: string; businessId?: string; branchId?: string; staffId?: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: enrollment.accountId || ctx?.accountId,
      businessId: enrollment.businessId || ctx?.businessId,
      branchId: enrollment.branchId || ctx?.branchId,
      staffId: enrollment.staffId || ctx?.staffId,
    });
    const payload = {
      id: toValidUuid(enrollment.id),
      ...trace,
      event_id: toValidUuid(enrollment.eventId),
      member_id: toValidUuid(enrollment.memberId),
      member_name: enrollment.memberName,
      status: enrollment.status,
      enrolled_at: enrollment.enrolledAt,
      cancelled_at: enrollment.cancelledAt || null,
      notes: enrollment.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('gym_class_enrollments', payload, {
      expectedVersion: enrollment.version,
      entityType: 'GymClassEnrollment',
      entityLabel: enrollment.memberName,
      localData: payload,
    });
    return res.success;
  },

  async deleteClassEnrollment(enrollmentId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('gym_class_enrollments', enrollmentId, deletedByStaffId);
    return res.success;
  },

  async fetchRegistrationRequests(branchId: string, updatedAfter?: string | null): Promise<RegistrationLead[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('gym_registration_leads')
            .select(
              'id, account_id, business_id, branch_id, staff_id, full_name, email, phone_number, source, status, notes, preferred_plan_name, version, requested_at, processed_at, created_at, updated_at'
            )
            .eq('branch_id', toValidUuid(branchId))
            .is('deleted_at', null)
            .order('requested_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, to);

          if (updatedAfter) query = query.gt('updated_at', updatedAfter);
          return query;
        },
        { throwOnError: true }
      );
      return rows.map(mapLeadFromDb);
    } catch (error: any) {
      console.warn('[memberService] fetchRegistrationRequests failed:', error?.message || error);
      return [];
    }
  },

  async createRegistrationRequest(
    lead: Omit<RegistrationLead, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<RegistrationLead | null> {
    const id = toValidUuid(lead.id);
    const trace = buildTraceEnvelope({
      accountId: lead.accountId || lead.tenantId,
      businessId: lead.businessId,
      branchId: lead.branchId || lead.facilityId,
      staffId: lead.staffId,
    });

    const payload = {
      id,
      ...trace,
      full_name: lead.fullName,
      email: lead.email || null,
      phone_number: lead.phoneNumber || null,
      source: lead.source || 'Web Form',
      preferred_plan_name: lead.preferredPlanName || null,
      notes: lead.notes || null,
      status: lead.status || 'Pending',
      requested_at: new Date().toISOString(),
    };

    await syncCoordinator.mutateOrQueueUpsert('gym_registration_leads', payload, {
      expectedVersion: lead.version,
      entityType: 'RegistrationLead',
      entityLabel: lead.fullName,
      localData: payload,
    });

    return {
      ...lead,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async updateLeadStatus(
    leadId: string,
    status: 'Pending' | 'Approved' | 'Declined',
    expectedVersion?: number
  ): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueUpdate(
      'gym_registration_leads',
      leadId,
      { status },
      {
        expectedVersion,
        entityType: 'RegistrationLead',
        localData: { status },
      }
    );
    return res.success;
  },

  async deleteLead(leadId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow(
      'gym_registration_leads',
      leadId,
      deletedByStaffId
    );
    return res.success;
  },

  async cancelAndPromoteClassEnrollment(enrollmentId: string) {
    return syncCoordinator.rpcOrQueue('cancel_and_promote_gym_class_enrollment', {
      p_enrollment_id: toValidUuid(enrollmentId),
    });
  },

  async fetchFreezeLogs(branchId: string): Promise<GymMemberFreezeLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('gym_member_freeze_logs')
          .select(
            'id, account_id, business_id, branch_id, member_id, staff_id, action, days_frozen, fee_centimes, extended_expiry_to, during_active_checkin_window, override_reason, recorded_at, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('recorded_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((row: any): GymMemberFreezeLog => ({
        id: row.id,
        accountId: row.account_id || undefined,
        businessId: row.business_id || undefined,
        branchId: row.branch_id || undefined,
        memberId: row.member_id,
        staffId: row.staff_id || undefined,
        action: row.action,
        daysFrozen: Number(row.days_frozen || 0),
        feeCentimes: Number(row.fee_centimes || 0),
        extendedExpiryTo: row.extended_expiry_to || undefined,
        duringActiveCheckInWindow: Boolean(row.during_active_checkin_window),
        overrideReason: row.override_reason || undefined,
        recordedAt: row.recorded_at,
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertFreezeLog(
    log: GymMemberFreezeLog,
    ctx?: { accountId?: string; businessId?: string; branchId?: string; staffId?: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || ctx?.accountId,
      businessId: log.businessId || ctx?.businessId,
      branchId: log.branchId || ctx?.branchId,
      staffId: log.staffId || ctx?.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      member_id: toValidUuid(log.memberId),
      action: log.action,
      days_frozen: log.daysFrozen,
      fee_centimes: log.feeCentimes,
      extended_expiry_to: log.extendedExpiryTo || null,
      during_active_checkin_window: Boolean(log.duringActiveCheckInWindow),
      override_reason: log.overrideReason || null,
      recorded_at: log.recordedAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('gym_member_freeze_logs', payload, {
      expectedVersion: log.version,
      entityType: 'GymMemberFreezeLog',
      entityLabel: log.memberName || log.memberId,
      localData: payload,
    });
    return res.success;
  },

  async fetchTrainerCommissions(branchId: string): Promise<GymTrainerCommission[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('gym_trainer_commissions')
          .select(
            'id, account_id, business_id, branch_id, staff_id, member_id, schedule_event_id, source_label, gross_amount_centimes, commission_rate_bps, commission_centimes, status, payroll_run_id, earned_date, version'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('earned_date', { ascending: false })
          .range(from, to)
      );
      return rows.map((row: any): GymTrainerCommission => ({
        id: row.id,
        accountId: row.account_id || undefined,
        businessId: row.business_id || undefined,
        branchId: row.branch_id || undefined,
        staffId: row.staff_id,
        memberId: row.member_id || undefined,
        scheduleEventId: row.schedule_event_id || undefined,
        sourceLabel: row.source_label,
        grossAmountCentimes: Number(row.gross_amount_centimes || 0),
        commissionRateBps: Number(row.commission_rate_bps || 0),
        commissionCentimes: Number(row.commission_centimes || 0),
        status: row.status || 'pending',
        payrollRunId: row.payroll_run_id || undefined,
        earnedDate: row.earned_date,
        version: row.version != null ? Number(row.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertTrainerCommission(
    comm: GymTrainerCommission,
    ctx?: { accountId?: string; businessId?: string; branchId?: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: comm.accountId || ctx?.accountId,
      businessId: comm.businessId || ctx?.businessId,
      branchId: comm.branchId || ctx?.branchId,
      staffId: comm.staffId,
    });
    const payload = {
      id: toValidUuid(comm.id),
      ...trace,
      member_id: comm.memberId ? toValidUuid(comm.memberId) : null,
      schedule_event_id: comm.scheduleEventId ? toValidUuid(comm.scheduleEventId) : null,
      source_label: comm.sourceLabel,
      gross_amount_centimes: comm.grossAmountCentimes,
      commission_rate_bps: comm.commissionRateBps,
      commission_centimes: comm.commissionCentimes,
      status: comm.status,
      payroll_run_id: comm.payrollRunId ? toValidUuid(comm.payrollRunId) : null,
      earned_date: comm.earnedDate,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('gym_trainer_commissions', payload, {
      expectedVersion: comm.version,
      entityType: 'GymTrainerCommission',
      entityLabel: comm.sourceLabel,
      localData: payload,
    });
    return res.success;
  },
};
