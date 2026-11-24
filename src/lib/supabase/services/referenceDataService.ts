import { getSupabaseClient, isSupabaseConfigured } from '../client';
import { ALGERIA_58_WILAYAS } from '../../../utils/algerianWilayas';
import type { WilayaZone } from '../../../utils/logisticsRules';

export type ReferenceVerificationStatus = 'unverified' | 'verified' | 'superseded';

export interface IrgBracketRow {
  min_dzd: number;
  max_dzd: number | null;
  rate: number;
}

export interface TimbreConfigJson {
  commercial_cash: {
    rate: number;
    min_dzd: number;
    max_dzd: number;
  };
  art_317_brackets: Array<{
    max_dzd: number;
    stamp_dzd: number;
  }>;
  art_317_over_limit: {
    rate: number;
    max_dzd: number;
  };
}

export interface IrgTransitionalConfigJson {
  min_dzd: number;
  max_exclusive_dzd: number;
  active_code_formula: string;
  code_comment_formula: string;
  requires_accountant_verification: boolean;
}

export interface StatutoryRateSet {
  id: string;
  versionCode: string;
  effectiveFrom: string | null;
  isLegacyBaseline: boolean;
  verificationStatus: ReferenceVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  cnasSalarialRate: number | null;
  cnasPatronalRate: number | null;
  irgBrackets: IrgBracketRow[] | null;
  irgAbatementRate: number | null;
  irgAbatementMinDzd: number | null;
  irgAbatementMaxDzd: number | null;
  irgExemptionThresholdDzd: number | null;
  irgTransitionalMaxDzd: number | null;
  irgTransitionalConfig: IrgTransitionalConfigJson | null;
  snmgDzd: number | null;
  overtimeMultiplier50: number | null;
  overtimeMultiplier100: number | null;
  tvaRates: number[] | null;
  timbreConfig: TimbreConfigJson | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStatutoryRateVersionInput {
  versionCode: string;
  effectiveFrom: string;
  cnasSalarialRate: number | null;
  cnasPatronalRate: number | null;
  irgBrackets: IrgBracketRow[] | null;
  irgAbatementRate: number | null;
  irgAbatementMinDzd: number | null;
  irgAbatementMaxDzd: number | null;
  irgExemptionThresholdDzd: number | null;
  irgTransitionalMaxDzd: number | null;
  irgTransitionalConfig?: IrgTransitionalConfigJson | null;
  snmgDzd: number | null;
  overtimeMultiplier50: number | null;
  overtimeMultiplier100: number | null;
  tvaRates: number[] | null;
  timbreConfig: TimbreConfigJson | null;
  notes?: string | null;
}

export interface WilayaReferenceRow {
  code: number;
  nameFr: string;
  nameAr: string;
  nameEn: string;
  defaultZone: WilayaZone;
  communes: string[];
  validFrom: string | null;
  validTo: string | null;
  isLegacy: boolean;
  verificationStatus: 'unverified' | 'verified';
  verifiedBy: string | null;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface PlatformAdminStatus {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: 'platform_admin' | 'super_admin' | null;
}

export function getLocalCodeBaselineStatutoryRate(): StatutoryRateSet {
  return {
    id: 'local-code-baseline-unverified',
    versionCode: 'DZ-CODE-BASELINE-UNVERIFIED',
    effectiveFrom: null,
    isLegacyBaseline: true,
    verificationStatus: 'unverified',
    verifiedBy: null,
    verifiedAt: null,
    cnasSalarialRate: 0.09,
    cnasPatronalRate: 0.26,
    irgBrackets: [
      { min_dzd: 0, max_dzd: 20000, rate: 0 },
      { min_dzd: 20001, max_dzd: 40000, rate: 0.23 },
      { min_dzd: 40001, max_dzd: 80000, rate: 0.27 },
      { min_dzd: 80001, max_dzd: 160000, rate: 0.3 },
      { min_dzd: 160001, max_dzd: null, rate: 0.35 },
    ],
    irgAbatementRate: 0.4,
    irgAbatementMinDzd: 1000,
    irgAbatementMaxDzd: 1500,
    irgExemptionThresholdDzd: 30000,
    irgTransitionalMaxDzd: 35000,
    irgTransitionalConfig: {
      min_dzd: 30001,
      max_exclusive_dzd: 35000,
      active_code_formula: 'round(irgAfterRebate * (brutImp - 30000) / 5000)',
      code_comment_formula: 'IRG_normal * (137 / 51) - (27925 / 51)',
      requires_accountant_verification: true,
    },
    snmgDzd: null,
    overtimeMultiplier50: 1.5,
    overtimeMultiplier100: 2.0,
    tvaRates: [0, 9, 19],
    timbreConfig: {
      commercial_cash: { rate: 0.01, min_dzd: 20, max_dzd: 2500 },
      art_317_brackets: [
        { max_dzd: 500, stamp_dzd: 0 },
        { max_dzd: 3000, stamp_dzd: 20 },
        { max_dzd: 10000, stamp_dzd: 50 },
        { max_dzd: 50000, stamp_dzd: 100 },
        { max_dzd: 100000, stamp_dzd: 200 },
      ],
      art_317_over_limit: { rate: 0.01, max_dzd: 2500 },
    },
    notes:
      'Unverified code baseline (effective date unknown; snmg_dzd intentionally NULL). Seeded strictly from existing code (algerianPayroll.ts, rules.ts) pending platform-admin verification.',
    createdBy: null,
    createdAt: '',
    updatedAt: '',
  };
}

export function getLocalFallbackWilayasRef(): WilayaReferenceRow[] {
  return ALGERIA_58_WILAYAS.map((w) => ({
    code: w.code,
    nameFr: w.nameFr,
    nameAr: w.nameAr,
    nameEn: w.nameFr,
    defaultZone: w.zone,
    communes: w.communes,
    validFrom: null,
    validTo: null,
    isLegacy: true,
    verificationStatus: 'unverified',
    verifiedBy: null,
    verifiedAt: null,
    updatedAt: '',
  }));
}

/**
 * Derives effective statutory rate set solely from `effectiveFrom <= targetDate`
 * (dated versions ordered by `effectiveFrom DESC`, falling back to `effectiveFrom === null`
 * baseline sentinel only when no effective-dated version applies), excluding superseded versions.
 */
export function selectEffectiveStatutoryRate(
  rates: StatutoryRateSet[],
  targetDateIso: string
): StatutoryRateSet | null {
  const targetDay = String(targetDateIso || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  const eligible = rates
    .filter(
      (r) =>
        r.verificationStatus !== 'superseded' &&
        (r.effectiveFrom === null || r.effectiveFrom <= targetDay)
    )
    .sort((a, b) => {
      if (a.effectiveFrom === null && b.effectiveFrom !== null) return 1;
      if (a.effectiveFrom !== null && b.effectiveFrom === null) return -1;
      if (a.effectiveFrom !== null && b.effectiveFrom !== null && a.effectiveFrom !== b.effectiveFrom) {
        return b.effectiveFrom.localeCompare(a.effectiveFrom);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  return eligible[0] ?? null;
}

/**
 * Lists missing/NULL statutory parameters so callers block only the dependent component
 * until a Platform Admin enters and verifies a complete version.
 */
export function getMissingStatutoryParameters(rate: StatutoryRateSet | null): string[] {
  if (!rate) return ['statutory_rate_set'];
  const missing: string[] = [];
  if (rate.snmgDzd == null) missing.push('snmg_dzd');
  if (rate.cnasSalarialRate == null) missing.push('cnas_salarial_rate');
  if (rate.cnasPatronalRate == null) missing.push('cnas_patronal_rate');
  if (!Array.isArray(rate.irgBrackets) || rate.irgBrackets.length === 0) missing.push('irg_brackets');
  if (rate.irgAbatementRate == null) missing.push('irg_abatement_rate');
  if (rate.irgExemptionThresholdDzd == null) missing.push('irg_exemption_threshold_dzd');
  if (!Array.isArray(rate.tvaRates) || rate.tvaRates.length === 0) missing.push('tva_rates');
  if (!rate.timbreConfig) missing.push('timbre_config');
  return missing;
}

function mapStatutoryRateRow(row: any): StatutoryRateSet {
  return {
    id: row.id,
    versionCode: row.version_code,
    effectiveFrom: row.effective_from ?? null,
    isLegacyBaseline: Boolean(row.is_legacy_baseline),
    verificationStatus: row.verification_status as ReferenceVerificationStatus,
    verifiedBy: row.verified_by ?? null,
    verifiedAt: row.verified_at ?? null,
    cnasSalarialRate: row.cnas_salarial_rate != null ? Number(row.cnas_salarial_rate) : null,
    cnasPatronalRate: row.cnas_patronal_rate != null ? Number(row.cnas_patronal_rate) : null,
    irgBrackets: Array.isArray(row.irg_brackets) ? row.irg_brackets : null,
    irgAbatementRate: row.irg_abatement_rate != null ? Number(row.irg_abatement_rate) : null,
    irgAbatementMinDzd: row.irg_abatement_min_dzd != null ? Number(row.irg_abatement_min_dzd) : null,
    irgAbatementMaxDzd: row.irg_abatement_max_dzd != null ? Number(row.irg_abatement_max_dzd) : null,
    irgExemptionThresholdDzd:
      row.irg_exemption_threshold_dzd != null ? Number(row.irg_exemption_threshold_dzd) : null,
    irgTransitionalMaxDzd:
      row.irg_transitional_max_dzd != null ? Number(row.irg_transitional_max_dzd) : null,
    irgTransitionalConfig: row.irg_transitional_config ?? null,
    snmgDzd: row.snmg_dzd != null ? Number(row.snmg_dzd) : null,
    overtimeMultiplier50:
      row.overtime_multiplier_50 != null ? Number(row.overtime_multiplier_50) : null,
    overtimeMultiplier100:
      row.overtime_multiplier_100 != null ? Number(row.overtime_multiplier_100) : null,
    tvaRates: Array.isArray(row.tva_rates) ? row.tva_rates.map(Number) : null,
    timbreConfig: row.timbre_config ?? null,
    notes: row.notes ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWilayaRefRow(row: any): WilayaReferenceRow {
  return {
    code: Number(row.code),
    nameFr: row.name_fr,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    defaultZone: row.default_zone as WilayaZone,
    communes: Array.isArray(row.communes) ? row.communes : [],
    validFrom: row.valid_from ?? null,
    validTo: row.valid_to ?? null,
    isLegacy: Boolean(row.is_legacy),
    verificationStatus: row.verification_status === 'verified' ? 'verified' : 'unverified',
    verifiedBy: row.verified_by ?? null,
    verifiedAt: row.verified_at ?? null,
    updatedAt: row.updated_at,
  };
}

export const referenceDataService = {
  async checkIsPlatformAdmin(): Promise<PlatformAdminStatus> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { isAdmin: false, isSuperAdmin: false, role: null };
    }
    try {
      const { data: userData } = await client.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        return { isAdmin: false, isSuperAdmin: false, role: null };
      }
      const { data, error } = await (client as any)
        .from('platform_admins')
        .select('role, is_active')
        .eq('account_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        return { isAdmin: false, isSuperAdmin: false, role: null };
      }
      const role = data.role === 'super_admin' ? 'super_admin' : 'platform_admin';
      return {
        isAdmin: true,
        isSuperAdmin: role === 'super_admin',
        role,
      };
    } catch {
      return { isAdmin: false, isSuperAdmin: false, role: null };
    }
  },

  async fetchStatutoryRates(): Promise<{ rates: StatutoryRateSet[]; source: 'supabase' | 'local_fallback' }> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { rates: [getLocalCodeBaselineStatutoryRate()], source: 'local_fallback' };
    }
    try {
      const { data, error } = await (client as any)
        .from('statutory_rates')
        .select('*')
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false });

      if (error || !Array.isArray(data) || data.length === 0) {
        return { rates: [getLocalCodeBaselineStatutoryRate()], source: 'local_fallback' };
      }
      return { rates: data.map(mapStatutoryRateRow), source: 'supabase' };
    } catch {
      return { rates: [getLocalCodeBaselineStatutoryRate()], source: 'local_fallback' };
    }
  },

  async fetchEffectiveStatutoryRate(targetDateIso?: string): Promise<StatutoryRateSet> {
    const targetDay = (targetDateIso || new Date().toISOString()).slice(0, 10);
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await (client as any).rpc('get_effective_statutory_rates', {
          p_target_date: targetDay,
        });
        if (!error && Array.isArray(data) && data[0]) {
          return mapStatutoryRateRow(data[0]);
        }
      } catch {
        // fall through to client-side selection / fallback
      }
    }
    const { rates } = await this.fetchStatutoryRates();
    return selectEffectiveStatutoryRate(rates, targetDay) ?? getLocalCodeBaselineStatutoryRate();
  },

  async createStatutoryRateVersion(
    input: CreateStatutoryRateVersionInput
  ): Promise<{ data?: StatutoryRateSet; error?: string }> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { error: 'Supabase must be configured and authenticated as Platform Admin to publish statutory rates.' };
    }
    if (!input.versionCode.trim() || !input.effectiveFrom.trim()) {
      return { error: 'Version code and effective_from date are required.' };
    }
    try {
      const { data: userData } = await client.auth.getUser();
      const payload = {
        version_code: input.versionCode.trim(),
        effective_from: input.effectiveFrom.trim(),
        is_legacy_baseline: false,
        verification_status: 'unverified',
        cnas_salarial_rate: input.cnasSalarialRate,
        cnas_patronal_rate: input.cnasPatronalRate,
        irg_brackets: input.irgBrackets,
        irg_abatement_rate: input.irgAbatementRate,
        irg_abatement_min_dzd: input.irgAbatementMinDzd,
        irg_abatement_max_dzd: input.irgAbatementMaxDzd,
        irg_exemption_threshold_dzd: input.irgExemptionThresholdDzd,
        irg_transitional_max_dzd: input.irgTransitionalMaxDzd,
        irg_transitional_config: input.irgTransitionalConfig ?? null,
        snmg_dzd: input.snmgDzd,
        overtime_multiplier_50: input.overtimeMultiplier50,
        overtime_multiplier_100: input.overtimeMultiplier100,
        tva_rates: input.tvaRates,
        timbre_config: input.timbreConfig,
        notes: input.notes ?? null,
        created_by: userData?.user?.id ?? null,
      };

      const { data, error } = await (client as any)
        .from('statutory_rates')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        return { error: error.message || 'Failed to create statutory rate version.' };
      }
      return { data: mapStatutoryRateRow(data) };
    } catch (err: any) {
      return { error: err?.message || 'Failed to create statutory rate version.' };
    }
  },

  async verifyStatutoryRateVersion(
    rateId: string,
    status: 'verified' | 'superseded' = 'verified'
  ): Promise<{ data?: StatutoryRateSet; error?: string }> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { error: 'Supabase must be configured and authenticated as Platform Admin to verify statutory rates.' };
    }
    try {
      const { data: userData } = await client.auth.getUser();
      const updatePayload: Record<string, any> = {
        verification_status: status,
      };
      if (status === 'verified') {
        updatePayload.verified_by = userData?.user?.id ?? null;
        updatePayload.verified_at = new Date().toISOString();
      }
      const { data, error } = await (client as any)
        .from('statutory_rates')
        .update(updatePayload)
        .eq('id', rateId)
        .select('*')
        .single();

      if (error) {
        return { error: error.message || 'Failed to update verification status.' };
      }
      return { data: mapStatutoryRateRow(data) };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update verification status.' };
    }
  },

  async fetchWilayasRef(): Promise<{ wilayas: WilayaReferenceRow[]; source: 'supabase' | 'local_fallback' }> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { wilayas: getLocalFallbackWilayasRef(), source: 'local_fallback' };
    }
    try {
      const { data, error } = await (client as any)
        .from('wilayas_ref')
        .select('*')
        .order('code', { ascending: true });

      if (error || !Array.isArray(data) || data.length === 0) {
        return { wilayas: getLocalFallbackWilayasRef(), source: 'local_fallback' };
      }
      return { wilayas: data.map(mapWilayaRefRow), source: 'supabase' };
    } catch {
      return { wilayas: getLocalFallbackWilayasRef(), source: 'local_fallback' };
    }
  },

  async verifyWilayaRef(
    code: number,
    updates?: { validFrom?: string | null; validTo?: string | null; isLegacy?: boolean }
  ): Promise<{ data?: WilayaReferenceRow; error?: string }> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { error: 'Supabase must be configured and authenticated as Platform Admin to verify wilayas.' };
    }
    try {
      const { data: userData } = await client.auth.getUser();
      const payload: Record<string, any> = {
        verification_status: 'verified',
        verified_by: userData?.user?.id ?? null,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (updates?.validFrom !== undefined) payload.valid_from = updates.validFrom;
      if (updates?.validTo !== undefined) payload.valid_to = updates.validTo;
      if (updates?.isLegacy !== undefined) payload.is_legacy = updates.isLegacy;

      const { data, error } = await (client as any)
        .from('wilayas_ref')
        .update(payload)
        .eq('code', code)
        .select('*')
        .single();

      if (error) {
        return { error: error.message || `Failed to verify wilaya ${code}.` };
      }
      return { data: mapWilayaRefRow(data) };
    } catch (err: any) {
      return { error: err?.message || `Failed to verify wilaya ${code}.` };
    }
  },

  async verifyAllLegacyWilayas(): Promise<{ updatedCount: number; error?: string }> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { updatedCount: 0, error: 'Supabase must be configured and authenticated as Platform Admin.' };
    }
    try {
      const { data: userData } = await client.auth.getUser();
      const { data, error } = await (client as any)
        .from('wilayas_ref')
        .update({
          verification_status: 'verified',
          verified_by: userData?.user?.id ?? null,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('verification_status', 'unverified')
        .select('code');

      if (error) {
        return { updatedCount: 0, error: error.message || 'Bulk wilaya verification failed.' };
      }
      return { updatedCount: Array.isArray(data) ? data.length : 0 };
    } catch (err: any) {
      return { updatedCount: 0, error: err?.message || 'Bulk wilaya verification failed.' };
    }
  },
};
