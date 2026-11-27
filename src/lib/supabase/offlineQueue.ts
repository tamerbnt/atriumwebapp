import { getSupabaseClient, isSupabaseConfigured } from './client';

export type OfflineMutationKind = 'upsert' | 'update' | 'soft_delete' | 'restore' | 'rpc';

export interface OfflineMutationItem {
  id: string;
  kind: OfflineMutationKind;
  table?: string;
  fn?: string;
  payload?: Record<string, any>;
  args?: Record<string, any>;
  recordId?: string;
  deletedByStaffId?: string | null;
  onConflict?: string;
  expectedVersion?: number;
  versionColumn?: string;
  entityType?: string;
  entityLabel?: string;
  dependsOnId?: string;
  enqueuedAt: string;
  attempts: number;
  lastError?: string;
  nextRetryAt?: string;
}

export interface QuarantinedMutationItem extends OfflineMutationItem {
  quarantinedAt: string;
  quarantineReason: 'max_attempts' | 'non_retryable_error';
  errorCode?: string;
}

export class OfflineQueueCapacityError extends Error {
  public readonly code = 'QUEUE_AT_CAPACITY' as const;
  public readonly pendingCount: number;
  public readonly maxCapacity: number;

  constructor(pendingCount: number, maxCapacity = MAX_QUEUE_SIZE) {
    super(
      `QUEUE_AT_CAPACITY: Offline sync queue is full (${pendingCount}/${maxCapacity}). Sync online or export your queue before making new changes.`
    );
    this.name = 'OfflineQueueCapacityError';
    this.pendingCount = pendingCount;
    this.maxCapacity = maxCapacity;
  }
}

export interface OfflineReplayConflict {
  item: OfflineMutationItem;
  serverData: Record<string, any> | null;
  serverVersion: number;
}

export interface OfflineQueueAlert {
  type: 'near_capacity' | 'at_capacity' | 'item_quarantined';
  pendingCount: number;
  quarantinedCount: number;
  item?: OfflineMutationItem | QuarantinedMutationItem;
}

export interface OfflineQueueStatus {
  pendingCount: number;
  quarantinedCount: number;
  maxCapacity: number;
  warnThreshold: number;
  isNearCapacity: boolean;
  isAtCapacity: boolean;
  nextRetryAt: string | null;
}

export interface FlushOfflineQueueOptions {
  ignoreBackoff?: boolean;
  nowMs?: number;
}

export const QUEUE_STORAGE_KEY = 'atrium_offline_mutation_queue_v1';
export const QUARANTINE_STORAGE_KEY = 'atrium_offline_quarantine_v1';
export const MAX_RETRY_ATTEMPTS = 5;
export const WARN_QUEUE_SIZE = 200;
export const MAX_QUEUE_SIZE = 500;
export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 60_000;

const NON_RETRYABLE_SQL_CODES = new Set([
  '22P02', // invalid_text_representation
  '22003', // numeric_value_out_of_range
  '23502', // not_null_violation
  '23503', // foreign_key_violation
  '23505', // unique_violation
  '23514', // check_violation
  '42501', // insufficient_privilege / RLS
  'PGRST202', // missing RPC / signature mismatch
  'PGRST204', // unknown column
]);

/**
 * Dependency priority tiers ensure parent rows sync before child rows or RPCs.
 * Lower numbers flush first.
 */
const TABLE_REPLAY_PRIORITY: Record<string, number> = {
  businesses: 10,
  branches: 12,
  business_configs: 14,
  category_formules: 15,
  staff: 16,
  gym_plans: 18,
  members: 20,
  gym_schedule_events: 22,
  edu_cohorts: 20,
  edu_students: 20,
  edu_sessions: 24,
  freelance_clients: 20,
  freelance_projects: 24,
  re_properties: 20,
  re_tenants: 20,
  re_leases: 24,
  pos_products: 20,
  pos_floor_tables: 21,
  pos_cash_sessions: 22,
  raw_materials: 20,
  mfg_boms: 22,
  staff_payroll_runs: 24,
  // Child / transaction entities
  gym_check_ins: 40,
  gym_walk_in_tickets: 40,
  gym_class_enrollments: 40,
  edu_attendance: 40,
  edu_grades: 40,
  pos_optical_prescriptions: 38,
  pos_kitchen_orders: 39,
  pos_sales: 40,
  pos_cash_movements: 42,
  pos_customer_credit_entries: 43,
  pos_z_reports: 45,
  rental_bookings: 40,
  rental_security_deposits: 44,
  re_inspections: 42,
  mfg_orders: 40,
  mfg_ncr_records: 44,
  staff_attendance_logs: 40,
  staff_salary_advances: 40,
  staff_payroll_slips: 46,
  unified_documents: 35,
  unified_payments: 41,
  unified_payment_allocations: 42,
  scf_chart_of_accounts: 15,
  scf_fiscal_years: 16,
  scf_accounting_periods: 17,
  journal_entries: 44,
  journal_lines: 45,
  scf_posting_failures: 47,
  crm_message_templates: 18,
  crm_parties: 19,
  crm_party_links: 26,
  crm_party_notes: 38,
  crm_follow_up_tasks: 39,
  crm_communication_logs: 43,
  reminder_quiet_hours_configs: 16,
  reminder_rules: 19,
  reminder_delivery_logs: 44,
  wms_bins: 23,
  wms_unit_conversions: 24,
  wms_reorder_rules: 25,
  wms_stock_lots: 26,
  wms_serial_numbers: 27,
  wms_cycle_counts: 36,
  wms_cycle_count_lines: 37,
  wms_stock_transfers: 38,
  wms_landed_cost_allocations: 41,
  wms_consignment_ledger: 42,
  import_column_mappings: 20,
  import_jobs: 48,
  rbac_role_permissions: 15,
  security_workspace_policies: 16,
  data_protection_consents: 35,
  data_subject_requests: 39,
  platform_approval_rules: 16,
  platform_custom_fields: 17,
  platform_print_templates: 17,
  platform_api_keys: 18,
  platform_webhooks: 18,
  platform_approval_requests: 39,
  platform_attachments: 40,
  platform_webhook_deliveries: 45,
  bi_kpi_definitions: 21,
  bi_saved_reports: 26,
  bi_report_snapshots: 52,
  gym_member_freeze_logs: 41,
  gym_trainer_commissions: 43,
  salon_stylist_schedules: 22,
  salon_prepaid_packages: 25,
  salon_gift_cards: 25,
  salon_consent_forms: 42,
  salon_hammam_sessions: 40,
  salon_loyalty_ledger: 44,
  immutable_audit_logs: 50,
};

let memoryFallbackQueue: OfflineMutationItem[] = [];
let memoryFallbackQuarantine: QuarantinedMutationItem[] = [];

const replayConflictListeners = new Set<(conflict: OfflineReplayConflict) => void>();
const queueAlertListeners = new Set<(alert: OfflineQueueAlert) => void>();

export function registerQueueConflictListener(
  listener: (conflict: OfflineReplayConflict) => void
): () => void {
  replayConflictListeners.add(listener);
  return () => {
    replayConflictListeners.delete(listener);
  };
}

export function registerQueueAlertListener(
  listener: (alert: OfflineQueueAlert) => void
): () => void {
  queueAlertListeners.add(listener);
  return () => {
    queueAlertListeners.delete(listener);
  };
}

function emitQueueAlert(alert: OfflineQueueAlert): void {
  queueAlertListeners.forEach((fn) => {
    try {
      fn(alert);
    } catch {
      // ignore listener errors
    }
  });
}

export function isStaleVersionError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || err.sqlstate || '');
  const msg = String(err.message || err.details || err || '');
  return (
    code === '40001' ||
    msg.includes('CONFLICT_STALE_VERSION') ||
    msg.includes('stale version') ||
    msg.includes('stale row_version')
  );
}

export function isNonRetryableError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || err.sqlstate || '');
  if (NON_RETRYABLE_SQL_CODES.has(code)) return true;
  const status = Number(err.status || err.statusCode || 0);
  if (status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 429) {
    return true;
  }
  return false;
}

export function computeBackoffMs(attempts: number): number {
  const safeAttempt = Math.max(1, attempts);
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, safeAttempt - 1));
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readJsonArray<T>(key: string, fallbackRef: () => T[]): T[] {
  if (!hasLocalStorage()) return fallbackRef();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, items: T[], setFallback: (v: T[]) => void): void {
  setFallback(items);
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Fallback already updated in memory
  }
}

function readQueue(): OfflineMutationItem[] {
  return readJsonArray<OfflineMutationItem>(QUEUE_STORAGE_KEY, () => memoryFallbackQueue);
}

function writeQueue(items: OfflineMutationItem[]): void {
  writeJsonArray(QUEUE_STORAGE_KEY, items, (v) => {
    memoryFallbackQueue = v;
  });
}

function readQuarantine(): QuarantinedMutationItem[] {
  return readJsonArray<QuarantinedMutationItem>(QUARANTINE_STORAGE_KEY, () => memoryFallbackQuarantine);
}

function writeQuarantine(items: QuarantinedMutationItem[]): void {
  writeJsonArray(QUARANTINE_STORAGE_KEY, items, (v) => {
    memoryFallbackQuarantine = v;
  });
}

export function getQueuedMutations(): OfflineMutationItem[] {
  return readQueue();
}

export function getQuarantinedMutations(): QuarantinedMutationItem[] {
  return readQuarantine();
}

export function getOfflineQueueCount(): number {
  return readQueue().length;
}

export function getOfflineQueueStatus(): OfflineQueueStatus {
  const queue = readQueue();
  const quarantine = readQuarantine();
  const pendingCount = queue.length;
  const quarantinedCount = quarantine.length;
  const retryTimes = queue
    .map((q) => q.nextRetryAt)
    .filter((v): v is string => Boolean(v))
    .sort();
  return {
    pendingCount,
    quarantinedCount,
    maxCapacity: MAX_QUEUE_SIZE,
    warnThreshold: WARN_QUEUE_SIZE,
    isNearCapacity: pendingCount >= WARN_QUEUE_SIZE,
    isAtCapacity: pendingCount >= MAX_QUEUE_SIZE,
    nextRetryAt: retryTimes[0] ?? null,
  };
}

export function clearOfflineQueue(): void {
  writeQueue([]);
}

export function clearQuarantinedMutations(): void {
  writeQuarantine([]);
}

export function retryQuarantinedMutation(id: string): OfflineMutationItem | null {
  const queue = readQueue();
  const quarantine = readQuarantine();
  if (queue.length >= MAX_QUEUE_SIZE) {
    emitQueueAlert({
      type: 'at_capacity',
      pendingCount: queue.length,
      quarantinedCount: quarantine.length,
    });
    throw new OfflineQueueCapacityError(queue.length, MAX_QUEUE_SIZE);
  }
  const idx = quarantine.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  const target = quarantine[idx];
  const rest = quarantine.filter((q) => q.id !== id);
  writeQuarantine(rest);

  const { quarantinedAt: _qa, quarantineReason: _qr, errorCode: _ec, ...base } = target;
  const requeued: OfflineMutationItem = {
    ...base,
    attempts: 0,
    nextRetryAt: undefined,
    lastError: undefined,
  };
  queue.push(requeued);
  writeQueue(queue);
  return requeued;
}

export function dismissQuarantinedMutation(id: string): boolean {
  const quarantine = readQuarantine();
  const next = quarantine.filter((q) => q.id !== id);
  if (next.length === quarantine.length) return false;
  writeQuarantine(next);
  return true;
}

export function exportOfflineQueueSnapshot(): {
  exportedAt: string;
  pendingCount: number;
  quarantinedCount: number;
  pending: OfflineMutationItem[];
  quarantined: QuarantinedMutationItem[];
} {
  const pending = readQueue();
  const quarantined = readQuarantine();
  return {
    exportedAt: new Date().toISOString(),
    pendingCount: pending.length,
    quarantinedCount: quarantined.length,
    pending,
    quarantined,
  };
}

export function cancelQueuedMutations(
  table: string,
  recordId: string,
  kinds?: OfflineMutationKind[]
): number {
  const queue = readQueue();
  const next = queue.filter((q) => {
    const matchesTable = q.table === table;
    const matchesRecord = q.recordId === recordId || q.payload?.id === recordId;
    const matchesKind = !kinds || kinds.includes(q.kind);
    return !(matchesTable && matchesRecord && matchesKind);
  });
  const removed = queue.length - next.length;
  if (removed > 0) {
    writeQueue(next);
  }
  return removed;
}

export function enqueueMutation(
  mutation: Omit<OfflineMutationItem, 'id' | 'enqueuedAt' | 'attempts'>
): OfflineMutationItem {
  const queue = readQueue();
  const targetId = mutation.recordId || mutation.payload?.id;

  let mergedPayload = mutation.payload;
  let preservedExpectedVersion = mutation.expectedVersion;
  let preservedDependsOnId = mutation.dependsOnId;
  if (mutation.kind === 'update' && targetId && mutation.table) {
    const prevUpdate = queue.find(
      (q) =>
        q.kind === 'update' &&
        q.table === mutation.table &&
        (q.recordId === targetId || q.payload?.id === targetId)
    );
    if (prevUpdate?.payload) {
      mergedPayload = { ...prevUpdate.payload, ...mutation.payload };
    }
    if (preservedExpectedVersion === undefined && prevUpdate?.expectedVersion !== undefined) {
      preservedExpectedVersion = prevUpdate.expectedVersion;
    }
    if (!preservedDependsOnId && prevUpdate?.dependsOnId) {
      preservedDependsOnId = prevUpdate.dependsOnId;
    }
  }

  const item: OfflineMutationItem = {
    ...mutation,
    payload: mergedPayload,
    expectedVersion: preservedExpectedVersion,
    dependsOnId: preservedDependsOnId,
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
  };

  // Deduplicate identical upsert / update / soft_delete for the same table + record id so queue stays compact
  const filtered =
    targetId && item.table
      ? queue.filter(
          (q) =>
            !(
              q.table === item.table &&
              (q.recordId === targetId || q.payload?.id === targetId) &&
              q.kind === item.kind
            )
        )
      : queue;

  // At 500 capacity: BLOCK new mutations visibly; never drop old mutations or overflow into quarantine.
  if (filtered.length >= MAX_QUEUE_SIZE) {
    emitQueueAlert({
      type: 'at_capacity',
      pendingCount: queue.length,
      quarantinedCount: readQuarantine().length,
      item,
    });
    throw new OfflineQueueCapacityError(queue.length, MAX_QUEUE_SIZE);
  }

  filtered.push(item);
  writeQueue(filtered);

  if (filtered.length >= WARN_QUEUE_SIZE) {
    emitQueueAlert({
      type: 'near_capacity',
      pendingCount: filtered.length,
      quarantinedCount: readQuarantine().length,
      item,
    });
  }

  return item;
}

export function canAcceptQueueAdditions(additionalDistinctSlots = 1): boolean {
  const queue = readQueue();
  if (queue.length + additionalDistinctSlots > MAX_QUEUE_SIZE) {
    emitQueueAlert({
      type: 'at_capacity',
      pendingCount: queue.length,
      quarantinedCount: readQuarantine().length,
    });
    return false;
  }
  return true;
}

function getKindPriority(kind: OfflineMutationKind): number {
  switch (kind) {
    case 'upsert':
      return 1;
    case 'update':
      return 2;
    case 'restore':
      return 3;
    case 'rpc':
      return 4;
    case 'soft_delete':
      return 5;
  }
}

function getItemReplayPriority(item: OfflineMutationItem): number {
  if (item.kind === 'rpc') {
    if (item.fn === 'issue_unified_document') return 356;
    if (item.fn === 'record_unified_payment_with_allocations') return 430;
    if (item.fn === 'transition_cheque_traite_status') return 440;
    if (item.fn === 'post_scf_journal_entry') return 450;
    if (item.fn === 'reverse_scf_journal_entry') return 460;
    if (item.fn === 'set_scf_period_status') return 175;
    if (item.fn === 'reconcile_scf_journal_lines') return 470;
    if (item.fn === 'approve_payroll_run') return 480;
    if (item.fn === 'merge_crm_parties') return 268;
    if (item.fn === 'record_crm_communication_attempt') return 435;
    if (item.fn === 'dispatch_reminder_idempotent') return 445;
    if (item.fn === 'mark_import_job_rolled_back') return 485;
    if (item.fn === 'process_data_subject_request') return 395;
    if (item.fn === 'cancel_and_promote_gym_class_enrollment') return 405;
    if (item.fn === 'record_bi_report_snapshot') return 520;
    if (item.fn === 'log_sensitive_read_event') return 500;
  }
  return (item.table ? TABLE_REPLAY_PRIORITY[item.table] ?? 35 : 48) * 10 + getKindPriority(item.kind);
}

export function sortQueueForReplay(queue: OfflineMutationItem[]): OfflineMutationItem[] {
  const byId = new Map(queue.map((q) => [q.id, q]));
  const getDepth = (item: OfflineMutationItem, seen = new Set<string>()): number => {
    if (!item.dependsOnId || seen.has(item.id)) return 0;
    seen.add(item.id);
    const parent = byId.get(item.dependsOnId);
    return parent ? 1 + getDepth(parent, seen) : 0;
  };

  return [...queue].sort((a, b) => {
    const depthDiff = getDepth(a) - getDepth(b);
    if (depthDiff !== 0) return depthDiff;

    const prioA = getItemReplayPriority(a);
    const prioB = getItemReplayPriority(b);
    if (prioA !== prioB) return prioA - prioB;

    return a.enqueuedAt.localeCompare(b.enqueuedAt);
  });
}

let activeFlushPromise: Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
}> | null = null;

async function fetchLatestServerRow(
  client: any,
  table: string | undefined,
  recordId: string | undefined
): Promise<Record<string, any> | null> {
  if (!client || !table || !recordId) return null;
  try {
    const { data } = await client.from(table).select('*').eq('id', recordId).maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

function moveToQuarantine(
  item: OfflineMutationItem,
  reason: QuarantinedMutationItem['quarantineReason'],
  errorMsg: string,
  errorCode?: string
): void {
  const quarantine = readQuarantine();
  const entry: QuarantinedMutationItem = {
    ...item,
    lastError: errorMsg,
    quarantinedAt: new Date().toISOString(),
    quarantineReason: reason,
    errorCode,
  };
  quarantine.push(entry);
  writeQuarantine(quarantine);
  emitQueueAlert({
    type: 'item_quarantined',
    pendingCount: readQueue().length,
    quarantinedCount: quarantine.length,
    item: entry,
  });
}

export async function flushOfflineQueue(
  options: FlushOfflineQueueOptions = {}
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
}> {
  if (activeFlushPromise) return activeFlushPromise;

  activeFlushPromise = (async () => {
    const client = getSupabaseClient();
    const rawQueue = readQueue();

    if (!client || !isSupabaseConfigured() || rawQueue.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    const orderedQueue = sortQueueForReplay(rawQueue);
    const nowMs = options.nowMs ?? Date.now();
    const remaining: OfflineMutationItem[] = [];
    const failedIdsInCycle = new Set<string>();

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of orderedQueue) {
      // Defer if parent dependency failed or is still pending in this flush cycle
      if (item.dependsOnId && failedIdsInCycle.has(item.dependsOnId)) {
        failedIdsInCycle.add(item.id);
        remaining.push(item);
        continue;
      }

      // Honor exponential backoff window unless explicitly overridden
      if (!options.ignoreBackoff && item.nextRetryAt) {
        const retryAtMs = Date.parse(item.nextRetryAt);
        if (Number.isFinite(retryAtMs) && retryAtMs > nowMs) {
          failedIdsInCycle.add(item.id);
          remaining.push(item);
          continue;
        }
      }

      processed += 1;

      try {
        let errorObj: any = null;
        let isConflict = false;
        const versionCol = item.versionColumn || 'version';
        const targetId = item.recordId || item.payload?.id;

        if (item.kind === 'upsert' && item.table && item.payload) {
          const { error } = await (client as any)
            .from(item.table)
            .upsert(item.payload, item.onConflict ? { onConflict: item.onConflict } : undefined);
          if (error) {
            errorObj = error;
            isConflict = isStaleVersionError(error);
          }
        } else if (item.kind === 'update' && item.table && item.recordId && item.payload) {
          let query = (client as any)
            .from(item.table)
            .update(item.payload)
            .eq('id', item.recordId);

          if (item.expectedVersion !== undefined) {
            query = query.eq(versionCol, item.expectedVersion).select(`id, ${versionCol}`);
          }

          const { data, error } = await query;
          if (error) {
            errorObj = error;
            isConflict = isStaleVersionError(error);
          } else if (item.expectedVersion !== undefined && Array.isArray(data) && data.length === 0) {
            isConflict = true;
            errorObj = { message: 'CONFLICT_STALE_VERSION' };
          }
        } else if (item.kind === 'soft_delete' && item.table && item.recordId) {
          const { error } = await (client as any)
            .from(item.table)
            .update({
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...(item.deletedByStaffId ? { updated_by_staff_id: item.deletedByStaffId } : {}),
            })
            .eq('id', item.recordId);
          if (error) errorObj = error;
        } else if (item.kind === 'restore' && item.table && item.recordId) {
          const { error } = await (client as any)
            .from(item.table)
            .update({
              deleted_at: null,
              updated_at: new Date().toISOString(),
              ...(item.deletedByStaffId ? { updated_by_staff_id: item.deletedByStaffId } : {}),
            })
            .eq('id', item.recordId);
          if (error) errorObj = error;
        } else if (item.kind === 'rpc' && item.fn) {
          const { error } = await (client as any).rpc(item.fn, item.args || {});
          if (error) {
            errorObj = error;
            isConflict = isStaleVersionError(error);
          }
        }

        if (!errorObj) {
          succeeded += 1;
        } else if (isConflict) {
          conflicts += 1;
          const serverData = await fetchLatestServerRow(client, item.table, targetId);
          const serverVersion = Number(serverData?.[versionCol] ?? (item.expectedVersion ?? 1) + 1);
          replayConflictListeners.forEach((fn) => {
            try {
              fn({ item, serverData, serverVersion });
            } catch {
              // ignore listener error
            }
          });
        } else {
          failed += 1;
          failedIdsInCycle.add(item.id);
          const nextAttempts = item.attempts + 1;
          const errMessage = errorObj?.message || 'Sync error';
          const errCode = errorObj?.code || errorObj?.sqlstate;

          if (isNonRetryableError(errorObj)) {
            moveToQuarantine({ ...item, attempts: nextAttempts }, 'non_retryable_error', errMessage, errCode);
          } else if (nextAttempts >= MAX_RETRY_ATTEMPTS) {
            moveToQuarantine({ ...item, attempts: nextAttempts }, 'max_attempts', errMessage, errCode);
          } else {
            const backoffMs = computeBackoffMs(nextAttempts);
            remaining.push({
              ...item,
              attempts: nextAttempts,
              lastError: errMessage,
              nextRetryAt: new Date(nowMs + backoffMs).toISOString(),
            });
          }
        }
      } catch (err: any) {
        if (isStaleVersionError(err)) {
          conflicts += 1;
          const targetId = item.recordId || item.payload?.id;
          const serverData = await fetchLatestServerRow(client, item.table, targetId);
          const versionCol = item.versionColumn || 'version';
          const serverVersion = Number(serverData?.[versionCol] ?? (item.expectedVersion ?? 1) + 1);
          replayConflictListeners.forEach((fn) => {
            try {
              fn({ item, serverData, serverVersion });
            } catch {
              // ignore listener error
            }
          });
        } else {
          failed += 1;
          failedIdsInCycle.add(item.id);
          const nextAttempts = item.attempts + 1;
          const errMessage = err?.message || 'Network exception';
          if (isNonRetryableError(err)) {
            moveToQuarantine({ ...item, attempts: nextAttempts }, 'non_retryable_error', errMessage, err?.code);
          } else if (nextAttempts >= MAX_RETRY_ATTEMPTS) {
            moveToQuarantine({ ...item, attempts: nextAttempts }, 'max_attempts', errMessage, err?.code);
          } else {
            const backoffMs = computeBackoffMs(nextAttempts);
            remaining.push({
              ...item,
              attempts: nextAttempts,
              lastError: errMessage,
              nextRetryAt: new Date(nowMs + backoffMs).toISOString(),
            });
          }
        }
      }
    }

    writeQueue(remaining);
    return { processed, succeeded, failed, conflicts };
  })();

  try {
    return await activeFlushPromise;
  } finally {
    activeFlushPromise = null;
  }
}
