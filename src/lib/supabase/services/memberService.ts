import { getSupabaseClient, isUuid } from '../client';
import { mapMemberFromDb, mapLeadFromDb } from '../mappers';
import type { Member, RegistrationLead } from '../../../types/index';

export const memberService = {
  async fetchMembers(branchId: string): Promise<Member[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(branchId)) return [];

    try {
      const { data, error } = await client
        .from('members_directory')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true);

      if (error) {
        console.warn('[memberService] fetchMembers failed:', error);
        return [];
      }
      return (data || []).map(mapMemberFromDb);
    } catch {
      return [];
    }
  },

  async createMember(member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Member | null> {
    const client = getSupabaseClient();
    if (!client || !isUuid(member.tenantId) || !isUuid(member.facilityId)) return null;

    const { data, error } = await client
      .from('members_directory')
      .insert({
        account_id: member.tenantId,
        branch_id: member.facilityId,
        full_name: member.fullName,
        email: member.email || null,
        phone: member.phoneNumber || null,
        rfid_tag: member.cardId || null,
        status: member.status || 'Active',
        gender: member.gender || 'Other',
        photo_url: member.profileImageUrl || null,
        is_active: member.status === 'Active',
      })
      .select()
      .single();

    if (error) {
      console.warn('[memberService] createMember failed:', error);
      return null;
    }
    return mapMemberFromDb(data);
  },

  async updateMember(member: Member): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || !isUuid(member.id)) return false;

    const { error } = await client
      .from('members_directory')
      .update({
        full_name: member.fullName,
        email: member.email || null,
        phone: member.phoneNumber || null,
        rfid_tag: member.cardId || null,
        status: member.status || 'Active',
        gender: member.gender || 'Other',
        photo_url: member.profileImageUrl || null,
        is_active: member.status === 'Active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id);

    if (error) {
      console.warn('[memberService] updateMember failed:', error);
      return false;
    }
    return true;
  },

  async deleteMember(memberId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || !isUuid(memberId)) return false;

    const { error } = await client
      .from('members_directory')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) {
      console.warn('[memberService] deleteMember failed:', error);
      return false;
    }
    return true;
  },

  async fetchRegistrationRequests(branchId: string): Promise<RegistrationLead[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(branchId)) return [];

    try {
      const { data, error } = await client
        .from('registration_requests')
        .select('*')
        .eq('branch_id', branchId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.warn('[memberService] fetchRegistrationRequests failed:', error);
        return [];
      }
      return (data || []).map(mapLeadFromDb);
    } catch {
      return [];
    }
  },

  async createRegistrationRequest(lead: Omit<RegistrationLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<RegistrationLead | null> {
    const client = getSupabaseClient();
    if (!client || !isUuid(lead.tenantId) || !isUuid(lead.facilityId)) return null;

    const { data, error } = await client
      .from('registration_requests')
      .insert({
        account_id: lead.tenantId,
        branch_id: lead.facilityId,
        payload: {
          fullName: lead.fullName,
          email: lead.email,
          phoneNumber: lead.phoneNumber,
          source: lead.source,
          notes: lead.notes,
          preferredPlanName: lead.preferredPlanName,
        },
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.warn('[memberService] createRegistrationRequest failed:', error);
      return null;
    }
    return mapLeadFromDb(data);
  },
};
