import { getSupabaseClient, isUuid, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { mapBusinessConfigFromDb, mapCategoryFormuleFromDb } from '../mappers';
import { buildTraceEnvelope, getActiveDeviceId, syncCoordinator } from '../syncCoordinator';
import type { BusinessCategoryConfig, CategoryFormule } from '../../../types/index';

export const configService = {
  async fetchBusinessConfigs(accountId: string): Promise<BusinessCategoryConfig[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(accountId)) return [];

    try {
      const rows = await fetchAllPages<any>(
        (from, to) =>
          (client as any)
            .from('business_configs')
            .select(
              'id, account_id, business_id, branch_id, category, currency, default_tva_rate, apply_timbre_fiscal, fiscal_ids, onboarding_context, category_settings, setup_state, version, updated_at'
            )
            .eq('account_id', accountId)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false })
            .range(from, to),
        { throwOnError: true }
      );
      return rows.map(mapBusinessConfigFromDb);
    } catch (error: any) {
      console.warn('[configService] fetchBusinessConfigs failed:', error?.message || error);
      return [];
    }
  },

  async upsertBusinessConfig(
    config: BusinessCategoryConfig,
    ctx?: { accountId?: string; branchId?: string; staffId?: string }
  ) {
    const trace = buildTraceEnvelope({
      accountId: config.accountId || ctx?.accountId,
      businessId: config.businessId,
      branchId: config.branchId || ctx?.branchId || config.businessId,
      staffId: ctx?.staffId,
    });

    const payload = {
      id: toValidUuid(config.id),
      account_id: trace.account_id,
      business_id: toValidUuid(config.businessId),
      branch_id: config.branchId ? toValidUuid(config.branchId) : trace.branch_id,
      category: config.category,
      currency: config.currency || 'DZD',
      default_tva_rate: Number(config.defaultTvaRate ?? 19),
      apply_timbre_fiscal: Boolean(config.applyTimbreFiscal),
      fiscal_ids: config.fiscalProfile || {},
      onboarding_context: config.onboardingContext || {},
      category_settings: config.categorySettings || {},
      setup_state: config.setupState || { dismissed: false },
      is_active: true,
      staff_id: trace.staff_id,
      updated_by_staff_id: trace.updated_by_staff_id,
      device_id: trace.device_id,
      updated_at: new Date().toISOString(),
    };

    return syncCoordinator.mutateOrQueueUpsert('business_configs', payload, {
      onConflict: 'business_id',
      expectedVersion: config.version,
      entityType: 'BusinessConfig',
      entityLabel: config.businessId,
      localData: payload,
    });
  },

  async upsertBusinessConfigAtomic(
    config: BusinessCategoryConfig,
    ctx?: { branchId?: string }
  ) {
    return syncCoordinator.rpcOrQueue(
      'upsert_business_config',
      {
        p_business_id: toValidUuid(config.businessId),
        p_branch_id: config.branchId
          ? toValidUuid(config.branchId)
          : ctx?.branchId
          ? toValidUuid(ctx.branchId)
          : null,
        p_category: config.category,
        p_currency: config.currency || 'DZD',
        p_default_tva_rate: Number(config.defaultTvaRate ?? 19),
        p_apply_timbre_fiscal: Boolean(config.applyTimbreFiscal),
        p_fiscal_ids: config.fiscalProfile || {},
        p_onboarding_context: config.onboardingContext || {},
        p_category_settings: config.categorySettings || {},
        p_setup_state: config.setupState || { dismissed: false },
        p_expected_version: config.version ?? null,
        p_device_id: getActiveDeviceId(),
      },
      {
        table: 'business_configs',
        recordId: config.id,
        expectedVersion: config.version,
        entityType: 'BusinessConfig',
        entityLabel: config.businessId,
        localData: config as any,
      }
    );
  },

  async updateBusinessIdentity(params: {
    businessId: string;
    name: string;
    displayName?: string;
    address?: string;
    phone?: string;
    expectedVersion?: number;
  }) {
    return syncCoordinator.rpcOrQueue(
      'update_business_identity',
      {
        p_business_id: toValidUuid(params.businessId),
        p_name: params.name,
        p_display_name: params.displayName || params.name,
        p_address: params.address || null,
        p_phone: params.phone || null,
      },
      {
        table: 'businesses',
        recordId: params.businessId,
        expectedVersion: params.expectedVersion,
        entityType: 'Business',
        entityLabel: params.name,
        localData: params,
      }
    );
  },

  async fetchCategoryFormules(
    accountId: string,
    businessId?: string,
    updatedAfter?: string | null
  ): Promise<CategoryFormule[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(accountId)) return [];

    try {
      const rows = await fetchAllPages<any>(
        (from, to) => {
          let query = (client as any)
            .from('category_formules')
            .select(
              'id, account_id, business_id, branch_id, category, formule_type, code, name, description, price_amount, rate_percent, duration_value, duration_unit, currency, tax_rate, metadata, is_active, sort_order, version, created_at, updated_at'
            )
            .eq('account_id', accountId)
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: false })
            .range(from, to);

          if (businessId && isUuid(businessId)) {
            query = query.eq('business_id', businessId);
          }
          if (updatedAfter) {
            query = query.gt('updated_at', updatedAfter);
          }
          return query;
        },
        { throwOnError: true }
      );
      return rows.map(mapCategoryFormuleFromDb);
    } catch (error: any) {
      console.warn('[configService] fetchCategoryFormules failed:', error?.message || error);
      return [];
    }
  },

  async upsertCategoryFormule(
    formule: CategoryFormule,
    ctx: { accountId: string; businessId: string; branchId?: string; staffId?: string }
  ) {
    const trace = buildTraceEnvelope({
      accountId: formule.accountId || ctx.accountId,
      businessId: formule.businessId || ctx.businessId,
      branchId: formule.branchId || ctx.branchId || ctx.businessId,
      staffId: ctx.staffId,
    });

    const payload = {
      id: toValidUuid(formule.id),
      account_id: trace.account_id,
      business_id: toValidUuid(formule.businessId || ctx.businessId),
      branch_id: formule.branchId ? toValidUuid(formule.branchId) : trace.branch_id,
      category: formule.category,
      formule_type: formule.formuleType,
      code: formule.code || null,
      name: formule.name,
      description: formule.description || null,
      price_amount: Number(formule.priceAmount ?? 0),
      rate_percent: Number(formule.ratePercent ?? 0),
      duration_value: Math.max(0, Math.round(Number(formule.durationValue ?? 0))),
      duration_unit: formule.durationUnit || 'days',
      currency: formule.currency || 'DZD',
      tax_rate: Number(formule.taxRate ?? 19),
      metadata: formule.metadata || {},
      is_active: Boolean(formule.isActive),
      sort_order: Number(formule.sortOrder ?? 0),
      staff_id: trace.staff_id,
      updated_by_staff_id: trace.updated_by_staff_id,
      device_id: trace.device_id,
      updated_at: new Date().toISOString(),
    };

    return syncCoordinator.mutateOrQueueUpsert('category_formules', payload, {
      expectedVersion: formule.version,
      entityType: 'CategoryFormule',
      entityLabel: formule.name,
      localData: payload,
    });
  },

  async deleteCategoryFormule(formuleId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('category_formules', formuleId, deletedByStaffId);
    return res.success;
  },
};
