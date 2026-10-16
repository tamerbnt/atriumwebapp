import { getSupabaseClient, isUuid } from '../client';
import { mapStaffFromDb, mapStaffRoleToDb } from '../mappers';
import type { StaffMember } from '../../../types/index';

export const staffService = {
  async getStaffProfiles(email: string) {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client.rpc('get_staff_profiles', {
      p_email: email.trim().toLowerCase(),
    });

    if (error) {
      console.warn('[staffService] get_staff_profiles RPC failed:', error);
      return [];
    }
    return data || [];
  },

  async fetchStaffForSync(accountId: string, branchId?: string): Promise<StaffMember[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(accountId)) return [];

    // Try RPC first as specified in v1.3
    try {
      const { data: rpcData, error: rpcError } = await client.rpc('get_staff_for_sync', {
        p_account_id: accountId,
        p_facility_id: branchId || null,
        p_updated_after: null,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData.map((row: any) => mapStaffFromDb(row, branchId));
      }
    } catch {
      // Fallback to direct table query
    }

    const { data, error } = await client
      .from('staff')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (error) {
      console.warn('[staffService] fetchStaff failed:', error);
      return [];
    }
    return (data || []).map((row) => mapStaffFromDb(row, branchId));
  },

  async createStaff(staff: Omit<StaffMember, 'id' | 'hireDate'>): Promise<StaffMember | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('staff')
      .insert({
        account_id: staff.tenantId,
        full_name: staff.fullName,
        email: staff.email || null,
        phone: staff.phoneNumber || null,
        role: mapStaffRoleToDb(staff.role),
        is_active: staff.isActive,
      })
      .select()
      .single();

    if (error) {
      console.warn('[staffService] createStaff failed:', error);
      return null;
    }
    return mapStaffFromDb(data, staff.facilityId);
  },
};
