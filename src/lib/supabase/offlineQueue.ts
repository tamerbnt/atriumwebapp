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
  enqueuedAt: string;
  attempts: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'atrium_offline_mutation_queue_v1';
const MAX_RETRY_ATTEMPTS = 5;

let memoryFallbackQueue: OfflineMutationItem[] = [];

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
  }

  const item: OfflineMutationItem = {
    ...mutation,
    payload: mergedPayload,
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

let activeFlushPromise: Promise<{ processed: number; succeeded: number; failed: number }> | null = null;

export async function flushOfflineQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (activeFlushPromise) return activeFlushPromise;

  activeFlushPromise = (async () => {
    const client = getSupabaseClient();
    const queue = readQueue();

    if (!client || !isSupabaseConfigured() || queue.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const remaining: OfflineMutationItem[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        let errorMessage: string | null = null;

        if (item.kind === 'upsert' && item.table && item.payload) {
          const { error } = await (client as any)
            .from(item.table)
            .upsert(item.payload, item.onConflict ? { onConflict: item.onConflict } : undefined);
          if (error) errorMessage = error.message;
        } else if (item.kind === 'update' && item.table && item.recordId && item.payload) {
          const { error } = await (client as any)
            .from(item.table)
            .update(item.payload)
            .eq('id', item.recordId);
          if (error) errorMessage = error.message;
        } else if (item.kind === 'soft_delete' && item.table && item.recordId) {
          const { error } = await (client as any)
            .from(item.table)
            .update({
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...(item.deletedByStaffId ? { updated_by_staff_id: item.deletedByStaffId } : {}),
            })
            .eq('id', item.recordId);
          if (error) errorMessage = error.message;
        } else if (item.kind === 'rpc' && item.fn) {
          const { error } = await (client as any).rpc(item.fn, item.args || {});
          if (error) errorMessage = error.message;
        }

        if (!errorMessage) {
          succeeded += 1;
        } else {
          failed += 1;
          const nextAttempts = item.attempts + 1;
          if (nextAttempts < MAX_RETRY_ATTEMPTS) {
            remaining.push({ ...item, attempts: nextAttempts, lastError: errorMessage });
          }
        }
      } catch (err: any) {
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

    writeQueue(remaining);
    return { processed: queue.length, succeeded, failed };
  })();

  try {
    return await activeFlushPromise;
  } finally {
    activeFlushPromise = null;
  }
}
