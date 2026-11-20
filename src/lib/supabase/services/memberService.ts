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
  durationDays: Number(row.duration_days || 30),
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
            .select('*')
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
    deviceId?: string
  ) {
    return syncCoordinator.rpcOrQueue('gym_record_check_in', {
      p_branch_id: toValidUuid(branchId),
      p_member_id: toValidUuid(memberId),
      p_method: method,
      p_device_id: deviceId || null,
    });
  },

  async fetchCheckIns(branchId: string, updatedAfter?: string | null): Promise<MemberCheckInLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('gym_check_ins')
        .select('*')
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
      accessStatus: row.status === 'granted' ? 'Granted' : 'Denied_Expired',
      checkInMethod: row.method === 'rfid' ? 'nfc_card' : row.method === 'qr' ? 'barcode_scanner' : 'manual_click',
    }));
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
      ticket_code: ticket.ticketNumber || `DAY-${Date.now()}`,
      amount_dzd: ticket.amountDzd,
      payment_method: ticket.paymentMethod || 'Cash',
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
        .select('*')
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
      duration_days: plan.durationDays,
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
        .select('*')
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

  async fetchRegistrationRequests(branchId: string, updatedAfter?: string | null): Promise<RegistrationLead[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('gym_registration_leads')
            .select('*')
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
};
