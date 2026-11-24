import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
  computeBackoffMs,
  dismissQuarantinedMutation,
  enqueueMutation,
  exportOfflineQueueSnapshot,
  flushOfflineQueue,
  getOfflineQueueCount,
  getOfflineQueueStatus,
  getQuarantinedMutations,
  MAX_QUEUE_SIZE,
  MAX_RETRY_ATTEMPTS,
  OfflineQueueCapacityError,
  QUARANTINE_STORAGE_KEY,
  QUEUE_STORAGE_KEY,
  registerQueueAlertListener,
  retryQuarantinedMutation,
  sortQueueForReplay,
  WARN_QUEUE_SIZE,
} from '../offlineQueue';
import { syncCoordinator } from '../syncCoordinator';
import * as clientModule from '../client';
import { clearVolatileCachePreservingQueue } from '../../../components/common/ErrorBoundary';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k: string) {
      return map.get(k) ?? null;
    },
    key(idx: number) {
      return Array.from(map.keys())[idx] ?? null;
    },
    removeItem(k: string) {
      map.delete(k);
    },
    setItem(k: string, v: string) {
      map.set(k, v);
    },
  };
}

describe('6.11 offlineQueue hardening', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('orders parent entities before child transactions and respects dependsOnId', () => {
    const childRpc = enqueueMutation({
      kind: 'rpc',
      fn: 'mfg_scrap_with_ncr',
      args: { p_inspection_id: 'ins_1' },
    });
    const childCheckIn = enqueueMutation({
      kind: 'upsert',
      table: 'gym_check_ins',
      payload: { id: 'chk_1' },
    });
    const parentMember = enqueueMutation({
      kind: 'upsert',
      table: 'members',
      payload: { id: 'mem_1' },
    });
    const dependentUpdate = enqueueMutation({
      kind: 'update',
      table: 'members',
      recordId: 'mem_1',
      payload: { full_name: 'Updated' },
      dependsOnId: parentMember.id,
    });

    const ordered = sortQueueForReplay([childRpc, dependentUpdate, childCheckIn, parentMember]);
    const orderIds = ordered.map((x) => x.id);
    expect(orderIds.indexOf(parentMember.id)).toBeLessThan(orderIds.indexOf(dependentUpdate.id));
    expect(orderIds.indexOf(parentMember.id)).toBeLessThan(orderIds.indexOf(childCheckIn.id));
    expect(orderIds.indexOf(childCheckIn.id)).toBeLessThan(orderIds.indexOf(childRpc.id));
  });

  it('emits capacity alerts at WARN_QUEUE_SIZE and visibly BLOCKS new writes at MAX_QUEUE_SIZE (500) without dropping or quarantining items', async () => {
    const alerts: string[] = [];
    const unsub = registerQueueAlertListener((alert) => {
      alerts.push(alert.type);
    });

    for (let i = 0; i < WARN_QUEUE_SIZE; i++) {
      enqueueMutation({
        kind: 'upsert',
        table: 'gym_check_ins',
        payload: { id: `chk_${i}` },
      });
    }
    expect(alerts).toContain('near_capacity');
    expect(getOfflineQueueStatus().isNearCapacity).toBe(true);

    for (let i = WARN_QUEUE_SIZE; i < MAX_QUEUE_SIZE; i++) {
      enqueueMutation({
        kind: 'upsert',
        table: 'gym_check_ins',
        payload: { id: `chk_${i}` },
      });
    }
    expect(getOfflineQueueCount()).toBe(MAX_QUEUE_SIZE);
    expect(getOfflineQueueStatus().isAtCapacity).toBe(true);

    // Direct enqueueMutation at 500 must throw OfflineQueueCapacityError and preserve all 500 items untouched
    expect(() =>
      enqueueMutation({
        kind: 'upsert',
        table: 'gym_check_ins',
        payload: { id: 'chk_overflow' },
      })
    ).toThrow(OfflineQueueCapacityError);
    expect(alerts).toContain('at_capacity');
    expect(getOfflineQueueCount()).toBe(MAX_QUEUE_SIZE);
    expect(getQuarantinedMutations().length).toBe(0);

    // SyncCoordinator wrappers must also block cleanly with blockedByCapacity=true and no data loss
    const coordRes = await syncCoordinator.mutateOrQueueUpsert('gym_check_ins', {
      id: 'chk_blocked_via_coord',
    });
    expect(coordRes.success).toBe(false);
    expect(coordRes.queued).toBe(false);
    expect(coordRes.blockedByCapacity).toBe(true);
    expect(coordRes.error).toContain('QUEUE_AT_CAPACITY');
    expect(getOfflineQueueCount()).toBe(MAX_QUEUE_SIZE);

    const batchRes = await syncCoordinator.mutateBatchUpsert('gym_check_ins', [{ id: 'chk_batch_1' }]);
    expect(batchRes.success).toBe(false);
    expect(batchRes.queued).toBe(false);
    expect(batchRes.blockedByCapacity).toBe(true);
    expect(getOfflineQueueCount()).toBe(MAX_QUEUE_SIZE);

    unsub();
  });

  it('quarantines non-retryable 4xx/constraint errors and items exceeding MAX_RETRY_ATTEMPTS with exponential backoff', async () => {
    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);

    let failTransient = true;
    const mockClient = {
      from: (table: string) => ({
        upsert: async (payload: any) => {
          if (table === 'edu_attendance' && payload.id === 'bad_rls') {
            return { error: { code: '42501', message: 'RLS policy violation' } };
          }
          if (failTransient) {
            return { error: { message: 'Temporary network timeout' } };
          }
          return { error: null };
        },
      }),
    };
    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const transient = enqueueMutation({
      kind: 'upsert',
      table: 'gym_check_ins',
      payload: { id: 'chk_retry' },
    });
    const nonRetryable = enqueueMutation({
      kind: 'upsert',
      table: 'edu_attendance',
      payload: { id: 'bad_rls' },
    });
    expect(transient.id).toBeTruthy();
    expect(nonRetryable.id).toBeTruthy();

    const baseNow = Date.parse('2026-11-24T12:00:00.000Z');
    const first = await flushOfflineQueue({ nowMs: baseNow });
    expect(first.failed).toBe(2);

    // Non-retryable RLS item is quarantined immediately
    const q1 = getQuarantinedMutations();
    expect(q1.some((x) => x.id === nonRetryable.id && x.quarantineReason === 'non_retryable_error')).toBe(true);

    // Transient item waits for backoff window when nowMs has not elapsed
    const skippedDuringBackoff = await flushOfflineQueue({ nowMs: baseNow + 500 });
    expect(skippedDuringBackoff.processed).toBe(0);

    // Exhaust remaining attempts
    let cursorNow = baseNow + computeBackoffMs(1) + 10;
    for (let attempt = 2; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      await flushOfflineQueue({ nowMs: cursorNow });
      cursorNow += computeBackoffMs(attempt) + 10;
    }

    expect(getOfflineQueueCount()).toBe(0);
    expect(getQuarantinedMutations().some((x) => x.id === transient.id && x.quarantineReason === 'max_attempts')).toBe(true);

    // Export snapshot contains quarantined items, and retry restores item to active queue
    const snap = exportOfflineQueueSnapshot();
    expect(snap.quarantinedCount).toBe(2);

    failTransient = false;
    const retried = retryQuarantinedMutation(transient.id);
    expect(retried?.attempts).toBe(0);
    const second = await flushOfflineQueue({ ignoreBackoff: true });
    expect(second.succeeded).toBe(1);

    expect(dismissQuarantinedMutation(nonRetryable.id)).toBe(true);
    expect(getQuarantinedMutations().length).toBe(0);
  });

  it('defers child mutation in same flush cycle when parent dependsOnId fails', async () => {
    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
    const calls: string[] = [];
    const mockClient = {
      from: (table: string) => ({
        upsert: async (payload: any) => {
          calls.push(`${table}:${payload.id}`);
          if (table === 'members') {
            return { error: { message: 'Temporary outage' } };
          }
          return { error: null };
        },
      }),
    };
    vi.spyOn(clientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

    const parent = enqueueMutation({
      kind: 'upsert',
      table: 'members',
      payload: { id: 'mem_parent' },
    });
    const child = enqueueMutation({
      kind: 'upsert',
      table: 'gym_check_ins',
      payload: { id: 'chk_child' },
      dependsOnId: parent.id,
    });

    const res = await flushOfflineQueue({ nowMs: Date.parse('2026-11-24T12:00:00.000Z') });
    expect(calls).toEqual(['members:mem_parent']);
    expect(res.processed).toBe(1);
    expect(res.failed).toBe(1);
    expect(getOfflineQueueCount()).toBe(2);
    // Child kept 0 attempts since it was deferred behind failed parent
    const remainingChild = exportOfflineQueueSnapshot().pending.find((x) => x.id === child.id);
    expect(remainingChild?.attempts).toBe(0);
  });

  it('preserves offline queue & quarantine when ErrorBoundary clears volatile cache', () => {
    const storage = createMemoryStorage();
    storage.setItem('atrium_app_state_v1', 'legacy');
    storage.setItem('atrium_app_state_v2', 'volatile');
    storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify([{ id: 'mut_1' }]));
    storage.setItem(QUARANTINE_STORAGE_KEY, JSON.stringify([{ id: 'mut_q' }]));

    clearVolatileCachePreservingQueue(storage);

    expect(storage.getItem('atrium_app_state_v1')).toBeNull();
    expect(storage.getItem('atrium_app_state_v2')).toBeNull();
    expect(storage.getItem(QUEUE_STORAGE_KEY)).toBe(JSON.stringify([{ id: 'mut_1' }]));
    expect(storage.getItem(QUARANTINE_STORAGE_KEY)).toBe(JSON.stringify([{ id: 'mut_q' }]));
  });
});
