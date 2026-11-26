import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  ReminderChannel,
  ReminderDeliveryLog,
  ReminderDeliveryStatus,
  ReminderEventType,
  ReminderQuietHoursConfig,
  ReminderRule,
} from '../../../types/index';

export function mapReminderQuietHoursFromDb(row: any): ReminderQuietHoursConfig {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    enabled: row.enabled !== false,
    startTime: row.start_time || '21:00',
    endTime: row.end_time || '08:00',
    timezone: row.timezone || 'Africa/Algiers',
    allowInAppDuringQuiet: row.allow_in_app_during_quiet !== false,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapReminderRuleFromDb(row: any): ReminderRule {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    eventType: row.event_type as ReminderEventType,
    name: row.name || '',
    isEnabled: row.is_enabled !== false,
    leadDays: Number(row.lead_days ?? 3),
    channels: Array.isArray(row.channels)
      ? (row.channels as ReminderChannel[])
      : ['in_app'],
    templateId: row.template_id || undefined,
    respectQuietHours: row.respect_quiet_hours !== false,
    cooldownHours: Number(row.cooldown_hours ?? 24),
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapReminderDeliveryLogFromDb(row: any): ReminderDeliveryLog {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    ruleId: row.rule_id || undefined,
    eventType: row.event_type as ReminderEventType,
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    entityLabel: row.entity_label || undefined,
    partyId: row.party_id || undefined,
    channel: (row.channel || 'in_app') as ReminderChannel,
    idempotencyKey: row.idempotency_key || '',
    status: (row.status || 'sent') as ReminderDeliveryStatus,
    scheduledFor: row.scheduled_for || undefined,
    deliveredAt: row.delivered_at || undefined,
    title: row.title || '',
    message: row.message || '',
    crmCommLogId: row.crm_comm_log_id || undefined,
    errorCode: row.error_code || undefined,
    errorMessage: row.error_message || undefined,
    attempts: Number(row.attempts ?? 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export const reminderService = {
  async fetchQuietHours(businessId: string): Promise<ReminderQuietHoursConfig[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await (client as any)
        .from('reminder_quiet_hours_configs')
        .select('*')
        .eq('business_id', toValidUuid(businessId))
        .is('deleted_at', null);
      if (error || !Array.isArray(data)) return [];
      return data.map(mapReminderQuietHoursFromDb);
    } catch {
      return [];
    }
  },

  async fetchRules(businessId: string, updatedAfter?: string | null): Promise<ReminderRule[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('reminder_rules')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('event_type', { ascending: true })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map(mapReminderRuleFromDb);
    } catch {
      return [];
    }
  },

  async fetchDeliveryLogs(
    businessId: string,
    updatedAfter?: string | null
  ): Promise<ReminderDeliveryLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('reminder_delivery_logs')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map(mapReminderDeliveryLogFromDb);
    } catch {
      return [];
    }
  },

  async fetchReminderDataForBusiness(
    businessId: string,
    updatedAfter?: string | null
  ): Promise<{
    quietHours: ReminderQuietHoursConfig[];
    rules: ReminderRule[];
    logs: ReminderDeliveryLog[];
  }> {
    const [quietHours, rules, logs] = await Promise.all([
      this.fetchQuietHours(businessId),
      this.fetchRules(businessId, updatedAfter),
      this.fetchDeliveryLogs(businessId, updatedAfter),
    ]);
    return { quietHours, rules, logs };
  },

  async upsertReminderQuietHours(
    config: ReminderQuietHoursConfig,
    staffId?: string
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: config.accountId,
      businessId: config.businessId,
      branchId: config.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(config.id),
      account_id: trace.account_id,
      business_id: toValidUuid(config.businessId),
      enabled: Boolean(config.enabled),
      start_time: config.startTime,
      end_time: config.endTime,
      timezone: config.timezone || 'Africa/Algiers',
      allow_in_app_during_quiet: config.allowInAppDuringQuiet !== false,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert(
      'reminder_quiet_hours_configs',
      payload,
      {
        expectedVersion: config.version,
        entityType: 'ReminderQuietHoursConfig',
        entityLabel: `${config.startTime} - ${config.endTime}`,
        localData: payload,
      }
    );
    return res.success;
  },

  async upsertReminderRule(rule: ReminderRule, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: rule.accountId,
      businessId: rule.businessId,
      branchId: rule.branchId || rule.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(rule.id),
      account_id: trace.account_id,
      business_id: toValidUuid(rule.businessId),
      branch_id: rule.branchId ? toValidUuid(rule.branchId) : null,
      event_type: rule.eventType,
      name: rule.name.trim(),
      is_enabled: Boolean(rule.isEnabled),
      lead_days: Math.max(0, Math.round(rule.leadDays)),
      channels: rule.channels,
      template_id: rule.templateId ? toValidUuid(rule.templateId) : null,
      respect_quiet_hours: Boolean(rule.respectQuietHours),
      cooldown_hours: Math.max(1, Math.round(rule.cooldownHours || 24)),
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('reminder_rules', payload, {
      expectedVersion: rule.version,
      entityType: 'ReminderRule',
      entityLabel: rule.eventType,
      localData: payload,
    });
    return res.success;
  },

  async dispatchReminderIdempotent(log: ReminderDeliveryLog): Promise<{
    success: boolean;
    skipped?: boolean;
    status?: string;
    error?: string;
  }> {
    const res = await syncCoordinator.rpcOrQueue(
      'dispatch_reminder_idempotent',
      {
        p_id: toValidUuid(log.id),
        p_business_id: toValidUuid(log.businessId),
        p_branch_id: log.branchId ? toValidUuid(log.branchId) : null,
        p_rule_id: log.ruleId ? toValidUuid(log.ruleId) : null,
        p_event_type: log.eventType,
        p_entity_type: log.entityType,
        p_entity_id: log.entityId,
        p_entity_label: log.entityLabel || null,
        p_party_id: log.partyId ? toValidUuid(log.partyId) : null,
        p_channel: log.channel,
        p_idempotency_key: log.idempotencyKey,
        p_title: log.title,
        p_message: log.message,
        p_status: log.status,
        p_scheduled_for: log.scheduledFor || null,
        p_crm_comm_log_id: log.crmCommLogId ? toValidUuid(log.crmCommLogId) : null,
        p_error_code: log.errorCode || null,
        p_error_message: log.errorMessage || null,
      },
      {
        table: 'reminder_delivery_logs',
        recordId: toValidUuid(log.id),
        entityType: 'ReminderDeliveryLog',
        entityLabel: `${log.eventType}:${log.channel}`,
      }
    );
    const data = res.data as Record<string, any> | undefined;
    return {
      success: res.success,
      skipped: Boolean(data?.skipped),
      status: data?.status,
      error: res.error,
    };
  },

  async retryDeferredOrFailedReminder(
    log: ReminderDeliveryLog,
    staffId?: string
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId,
      businessId: log.businessId,
      branchId: log.branchId || log.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      account_id: trace.account_id,
      business_id: toValidUuid(log.businessId),
      branch_id: log.branchId ? toValidUuid(log.branchId) : null,
      rule_id: log.ruleId ? toValidUuid(log.ruleId) : null,
      event_type: log.eventType,
      entity_type: log.entityType,
      entity_id: log.entityId,
      entity_label: log.entityLabel || null,
      party_id: log.partyId ? toValidUuid(log.partyId) : null,
      channel: log.channel,
      idempotency_key: log.idempotencyKey,
      status: log.status,
      scheduled_for: log.scheduledFor || null,
      delivered_at: log.deliveredAt || null,
      title: log.title,
      message: log.message,
      crm_comm_log_id: log.crmCommLogId ? toValidUuid(log.crmCommLogId) : null,
      error_code: log.errorCode || null,
      error_message: log.errorMessage || null,
      attempts: log.attempts,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('reminder_delivery_logs', payload, {
      entityType: 'ReminderDeliveryLog',
      entityLabel: log.idempotencyKey,
      localData: payload,
    });
    return res.success;
  },
};
