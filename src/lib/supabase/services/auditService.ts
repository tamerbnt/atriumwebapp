import { getSupabaseClient, isSupabaseConfigured, toValidUuid } from '../client';
import { enqueueMutation, OfflineQueueCapacityError } from '../offlineQueue';

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

const NON_RETRYABLE_AUDIT_CODES = new Set(['22P02', '42501', 'PGRST202']);

function tryEnqueueAuditRpc(
  rpcArgs: Record<string, any>,
  attemptedScreen: string
): boolean {
  try {
    enqueueMutation({
      kind: 'rpc',
      fn: 'log_access_denied_event',
      table: 'immutable_audit_logs',
      args: rpcArgs,
      entityType: 'security_audit',
      entityLabel: attemptedScreen,
    });
    return true;
  } catch (err) {
    if (err instanceof OfflineQueueCapacityError) {
      return false;
    }
    return false;
  }
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
  }): Promise<{ ok: boolean; persistedRemote: boolean; queued?: boolean }> {
    const businessUuid = params.businessId ? toValidUuid(params.businessId) : null;
    const branchUuid = params.branchId ? toValidUuid(params.branchId) : null;

    // Actor identity (actor_auth_id / actor_staff_id) is strictly server-derived inside the RPC.
    const rpcArgs = {
      p_attempted_screen: params.attemptedScreen,
      p_category: params.category,
      p_effective_role: params.effectiveRole,
      p_raw_role: params.rawRole ?? null,
      p_reason: params.reason ?? 'ROLE_NOT_AUTHORIZED',
      p_business_id: businessUuid,
      p_branch_id: branchUuid,
      p_occurred_at: params.occurredAt,
    };

    const client = getSupabaseClient();
    const configured = isSupabaseConfigured();
    const isOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;

    if (!configured || !client) {
      return { ok: true, persistedRemote: false, queued: false };
    }

    if (isOffline) {
      const queued = tryEnqueueAuditRpc(rpcArgs, params.attemptedScreen);
      return { ok: true, persistedRemote: false, queued };
    }

    try {
      const { error } = await (client as any).rpc('log_access_denied_event', rpcArgs);
      if (!error) {
        return { ok: true, persistedRemote: true, queued: false };
      }
      const errCode = String(error?.code || error?.sqlstate || '');
      if (NON_RETRYABLE_AUDIT_CODES.has(errCode)) {
        return { ok: false, persistedRemote: false, queued: false };
      }
      const queued = tryEnqueueAuditRpc(rpcArgs, params.attemptedScreen);
      return { ok: queued, persistedRemote: false, queued };
    } catch {
      const queued = tryEnqueueAuditRpc(rpcArgs, params.attemptedScreen);
      return { ok: queued, persistedRemote: false, queued };
    }
  },
};
