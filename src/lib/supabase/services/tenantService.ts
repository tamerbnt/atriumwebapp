import { getSupabaseClient, isUuid } from '../client';
import { mapBusinessFromDb, mapBranchFromDb } from '../mappers';
import type { Business, Branch, BusinessCategory } from '../../../types/index';

export interface OnboardParams {
  ownerId: string;
  fullName: string;
  email: string;
  businessName: string;
  branchName: string;
  category: BusinessCategory;
  voucherCode?: string;
}

export const tenantService = {
  async onboardOwnerAccount(params: OnboardParams) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await client.rpc('onboard_owner_account', {
      p_owner_id: params.ownerId,
      p_full_name: params.fullName,
      p_email: params.email,
      p_business_name: params.businessName,
      p_branch_name: params.branchName,
      p_category: params.category,
      p_device_label: 'Web App',
      p_voucher_code: params.voucherCode || null,
      p_modules: null,
    });

    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  async fetchBusinesses(accountId: string): Promise<Business[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(accountId)) return [];

    const { data, error } = await client
      .from('businesses')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (error) {
      console.warn('[tenantService] fetchBusinesses failed:', error);
      return [];
    }
    return (data || []).map(mapBusinessFromDb);
  },

  async fetchBranches(accountId: string, businessId?: string): Promise<Branch[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(accountId)) return [];

    let query = client
      .from('branches')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (businessId && isUuid(businessId)) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[tenantService] fetchBranches failed:', error);
      return [];
    }
    return (data || []).map(mapBranchFromDb);
  },

  async fetchTenantFacilities(tenantId: string) {
    const client = getSupabaseClient();
    if (!client || !isUuid(tenantId)) return [];

    const { data, error } = await client.rpc('get_tenant_facilities', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.warn('[tenantService] get_tenant_facilities RPC failed:', error);
      return [];
    }
    return data || [];
  },

  async createBusiness(accountId: string, name: string, category: BusinessCategory, address?: string, phone?: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase is not configured');

    const { data, error } = await client.rpc('create_business', {
      p_account_id: accountId,
      p_name: name,
      p_category: category,
      p_address: address || null,
      p_phone: phone || null,
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async createBranch(accountId: string, businessId: string, name: string, address?: string, phone?: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase is not configured');

    const { data, error } = await client.rpc('create_branch', {
      p_account_id: accountId,
      p_business_id: businessId,
      p_name: name,
      p_address: address || null,
      p_phone: phone || null,
    });

    if (error) throw new Error(error.message);
    return data;
  },
};
