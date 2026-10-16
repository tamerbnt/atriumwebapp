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
      .select('*, subscription_plans(*)')
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) {
      console.warn('[licenseService] fetchSubscription failed:', error);
      return null;
    }
    return data;
  },
};
