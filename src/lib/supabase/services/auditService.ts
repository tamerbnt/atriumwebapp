import { getSupabaseClient, toValidUuid } from '../client';

export interface AuditLogRecord {
  id: string;
  accountId: string;
  businessId?: string | null;
  branchId?: string | null;
  actorStaffId?: string | null;
  deviceId?: string | null;
  tableName: string;
  recordId?: string | null;
  action: 'INSERT' | 'UPDATE' | 'SOFT_DELETE' | 'DELETE';
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  occurredAt: string;
}

export interface AuditLogPageResult {
  items: AuditLogRecord[];
  hasMore: boolean;
  totalCount: number;
  error?: string;
}

function mapAuditRow(row: any): AuditLogRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    businessId: row.business_id ?? null,
    branchId: row.branch_id ?? null,
    actorStaffId: row.actor_staff_id ?? null,
    deviceId: row.device_id ?? null,
    tableName: String(row.table_name || ''),
    recordId: row.record_id ?? null,
    action: (row.action || 'UPDATE') as AuditLogRecord['action'],
    oldData: row.old_data ?? null,
    newData: row.new_data ?? null,
    occurredAt: String(row.occurred_at || new Date().toISOString()),
  };
}

export const auditService = {
  async fetchAuditLogsPage(params: {
    accountId: string;
    branchId?: string | null;
    cursorOccurredAt?: string | null;
    cursorId?: string | null;
    limit?: number;
    tableName?: string;
    action?: string;
  }): Promise<AuditLogPageResult> {
    const client = getSupabaseClient();
    if (!client) {
      return { items: [], hasMore: false, totalCount: 0, error: 'SUPABASE_UNCONFIGURED' };
    }

    const accountUuid = toValidUuid(params.accountId);
    const branchUuid = params.branchId ? toValidUuid(params.branchId) : null;
    const safeLimit = Math.max(1, Math.min(params.limit ?? 50, 200));

    try {
      const { data, error } = await (client as any).rpc('get_audit_logs_page', {
        p_account_id: accountUuid,
        p_branch_id: branchUuid,
        p_cursor_occurred_at: params.cursorOccurredAt || null,
        p_cursor_id: params.cursorId || null,
        p_limit: safeLimit,
        p_table_name: params.tableName || null,
        p_action: params.action || null,
      });

      if (!error && data) {
        const items = Array.isArray(data.items) ? data.items.map(mapAuditRow) : [];
        return {
          items,
          hasMore: Boolean(data.hasMore),
          totalCount: Number(data.totalCount ?? items.length),
        };
      }
    } catch {
      // Fallback below if Phase 5 RPC is not yet deployed
    }

    try {
      let query = (client as any)
        .from('immutable_audit_logs')
        .select(
          'id, account_id, business_id, branch_id, actor_staff_id, device_id, table_name, record_id, action, old_data, new_data, occurred_at',
          { count: 'exact' }
        )
        .eq('account_id', accountUuid)
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(safeLimit + 1);

      if (branchUuid) query = query.eq('branch_id', branchUuid);
      if (params.tableName) query = query.eq('table_name', params.tableName);
      if (params.action) query = query.eq('action', params.action);
      if (params.cursorOccurredAt) query = query.lt('occurred_at', params.cursorOccurredAt);

      const { data, error, count } = await query;
      if (error) {
        return { items: [], hasMore: false, totalCount: 0, error: error.message };
      }

      const rows = Array.isArray(data) ? data : [];
      const hasMore = rows.length > safeLimit;
      const sliced = hasMore ? rows.slice(0, safeLimit) : rows;
      return {
        items: sliced.map(mapAuditRow),
        hasMore,
        totalCount: Number(count ?? sliced.length),
      };
    } catch (err: any) {
      return {
        items: [],
        hasMore: false,
        totalCount: 0,
        error: err?.message || 'Failed to query audit logs',
      };
    }
  },

  async logAccessDeniedEvent(params: {
    accountId?: string | null;
    businessId?: string | null;
    branchId?: string | null;
    actorStaffId?: string | null;
    attemptedScreen: string;
    category: string;
    effectiveRole: string;
    rawRole?: string | null;
    reason?: string;
    occurredAt: string;
  }): Promise<{ ok: boolean; persistedRemote: boolean }> {
    const client = getSupabaseClient();
    if (!client || !params.accountId) {
      return { ok: true, persistedRemote: false };
    }

    const accountUuid = toValidUuid(params.accountId);
    if (!accountUuid) {
      return { ok: true, persistedRemote: false };
    }

    const businessUuid = params.businessId ? toValidUuid(params.businessId) : null;
    const branchUuid = params.branchId ? toValidUuid(params.branchId) : null;
    const actorStaffUuid = params.actorStaffId ? toValidUuid(params.actorStaffId) : null;

    try {
      const { error } = await (client as any).from('immutable_audit_logs').insert({
        account_id: accountUuid,
        business_id: businessUuid,
        branch_id: branchUuid,
        actor_staff_id: actorStaffUuid,
        table_name: 'security_access_denied',
        record_id: params.attemptedScreen,
        action: 'INSERT',
        new_data: {
          event: 'ACCESS_DENIED',
          attemptedScreen: params.attemptedScreen,
          category: params.category,
          effectiveRole: params.effectiveRole,
          rawRole: params.rawRole ?? null,
          reason: params.reason ?? 'ROLE_NOT_AUTHORIZED',
          occurredAt: params.occurredAt,
        },
        occurred_at: params.occurredAt,
      });
      return { ok: !error, persistedRemote: !error };
    } catch {
      return { ok: false, persistedRemote: false };
    }
  },
};
