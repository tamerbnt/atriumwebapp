import { getSupabaseClient, toValidUuid } from '../client';
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

export const memberService = {
  async fetchMembers(branchId: string, updatedAfter?: string | null): Promise<Member[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('gym_members')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) {
        console.warn('[memberService] fetchMembers failed:', error.message);
        return [];
      }
      return (data || []).map(mapMemberFromDb);
    } catch {
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

    await syncCoordinator.mutateOrQueueUpsert('gym_members', {
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

    const res = await syncCoordinator.mutateOrQueueUpsert('gym_members', {
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

    let query = (client as any)
      .from('gym_check_ins')
      .select('*')
      .eq('branch_id', toValidUuid(branchId))
      .is('deleted_at', null)
      .order('checked_in_at', { ascending: false });

    if (updatedAfter) query = query.gt('updated_at', updatedAfter);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((row: any): MemberCheckInLog => ({
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
    return syncCoordinator.mutateOrQueueUpsert('gym_walk_in_tickets', {
      id: toValidUuid(ticket.id),
      ...trace,
      visitor_name: ticket.clientName,
      phone_number: ticket.phone || null,
      ticket_code: ticket.ticketNumber || `DAY-${Date.now()}`,
      amount_dzd: ticket.amountDzd,
      payment_method: ticket.paymentMethod || 'Cash',
      valid_date: (ticket.issuedAt || new Date().toISOString()).slice(0, 10),
      is_used: false,
    });
  },

  async fetchPlans(branchId: string): Promise<MembershipPlan[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await (client as any)
      .from('gym_plans')
      .select('*')
      .eq('branch_id', toValidUuid(branchId))
      .is('deleted_at', null);

    if (error) return [];
    return (data || []).map((row: any): MembershipPlan => ({
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
    }));
  },

  async upsertPlan(plan: MembershipPlan, ctx: { accountId: string; businessId: string; branchId: string }) {
    const trace = buildTraceEnvelope(ctx);
    return syncCoordinator.mutateOrQueueUpsert('gym_plans', {
      id: toValidUuid(plan.id),
      ...trace,
      name: plan.name,
      description: plan.description || null,
      duration_days: plan.durationDays,
      session_quota: plan.sessionsPerWeek ?? null,
      price_dzd: plan.price.amount,
      currency: plan.price.currency || 'DZD',
      is_active: plan.isActive,
    });
  },

  async fetchScheduleEvents(branchId: string): Promise<ScheduleEvent[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await (client as any)
      .from('gym_schedule_events')
      .select('*')
      .eq('branch_id', toValidUuid(branchId))
      .is('deleted_at', null);

    if (error) return [];
    return (data || []).map((row: any): ScheduleEvent => ({
      id: row.id,
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
    }));
  },

  async fetchRegistrationRequests(branchId: string, updatedAfter?: string | null): Promise<RegistrationLead[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('gym_registration_leads')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('requested_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) {
        console.warn('[memberService] fetchRegistrationRequests failed:', error.message);
        return [];
      }
      return (data || []).map(mapLeadFromDb);
    } catch {
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

    await syncCoordinator.mutateOrQueueUpsert('gym_registration_leads', {
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
    status: 'Pending' | 'Approved' | 'Declined'
  ): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueUpdate('gym_registration_leads', leadId, {
      status,
    });
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
