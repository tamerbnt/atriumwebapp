import { getSupabaseClient } from '../client';

export const licenseService = {
  async redeemVoucher(accountId: string, voucherCode: string) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await client.rpc('redeem_license_voucher', {
      p_account_id: accountId,
      p_voucher_code: voucherCode.trim().toUpperCase(),
    });

    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  async fetchSubscription(accountId: string) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('account_subscriptions')
      .select(
        'id, account_id, plan_id, status, is_lifetime, trial_ends_at, current_period_end, grace_ends_at, activated_by_voucher, created_at, updated_at, subscription_plans(id, name, tier_rank, max_businesses, max_branches, max_devices, max_staff, cross_branch_reports, shared_members, is_free_tier, trial_days, price_label, created_at)'
      )
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) {
      console.warn('[licenseService] fetchSubscription failed:', error);
      return null;
    }
    return data;
  },
};
