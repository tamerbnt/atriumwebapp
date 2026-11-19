import { getSupabaseClient, isSupabaseConfigured } from './client';

export type OfflineMutationKind = 'upsert' | 'update' | 'soft_delete' | 'rpc';

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
  enqueuedAt: string;
  attempts: number;
  lastError?: string;
}

export interface OfflineReplayConflict {
  item: OfflineMutationItem;
  serverData: Record<string, any> | null;
  serverVersion: number;
}

const QUEUE_STORAGE_KEY = 'atrium_offline_mutation_queue_v1';
const MAX_RETRY_ATTEMPTS = 5;

let memoryFallbackQueue: OfflineMutationItem[] = [];
const replayConflictListeners = new Set<(conflict: OfflineReplayConflict) => void>();

export function registerQueueConflictListener(
  listener: (conflict: OfflineReplayConflict) => void
): () => void {
  replayConflictListeners.add(listener);
  return () => {
    replayConflictListeners.delete(listener);
  };
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

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readQueue(): OfflineMutationItem[] {
  if (!hasLocalStorage()) return memoryFallbackQueue;
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineMutationItem[]): void {
  if (!hasLocalStorage()) {
    memoryFallbackQueue = items;
    return;
  }
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    memoryFallbackQueue = items;
  }
}

export function getQueuedMutations(): OfflineMutationItem[] {
  return readQueue();
}

export function getOfflineQueueCount(): number {
  return readQueue().length;
}

export function clearOfflineQueue(): void {
  memoryFallbackQueue = [];
  writeQueue([]);
}

export function enqueueMutation(
  mutation: Omit<OfflineMutationItem, 'id' | 'enqueuedAt' | 'attempts'>
): OfflineMutationItem {
  const queue = readQueue();
  const targetId = mutation.recordId || mutation.payload?.id;

  let mergedPayload = mutation.payload;
  let preservedExpectedVersion = mutation.expectedVersion;
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
  }

  const item: OfflineMutationItem = {
    ...mutation,
    payload: mergedPayload,
    expectedVersion: preservedExpectedVersion,
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

  filtered.push(item);
  writeQueue(filtered);
  return item;
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

export async function flushOfflineQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
}> {
  if (activeFlushPromise) return activeFlushPromise;

  activeFlushPromise = (async () => {
    const client = getSupabaseClient();
    const queue = readQueue();

    if (!client || !isSupabaseConfigured() || queue.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    const remaining: OfflineMutationItem[] = [];
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of queue) {
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
          const nextAttempts = item.attempts + 1;
          if (nextAttempts < MAX_RETRY_ATTEMPTS) {
            remaining.push({
              ...item,
              attempts: nextAttempts,
              lastError: errorObj?.message || 'Sync error',
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
          const nextAttempts = item.attempts + 1;
          if (nextAttempts < MAX_RETRY_ATTEMPTS) {
            remaining.push({
              ...item,
              attempts: nextAttempts,
              lastError: err?.message || 'Network exception',
            });
          }
        }
      }
    }

    writeQueue(remaining);
    return { processed: queue.length, succeeded, failed, conflicts };
  })();

  try {
    return await activeFlushPromise;
  } finally {
    activeFlushPromise = null;
  }
}
