import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

describe('auditService.logAccessDeniedEvent (server-side RPC & offline queue)', () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('writes remotely via log_access_denied_event RPC without client-forged actor_auth_id or non-UUID record_id', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: { status: 'INSERTED' }, error: null });
    vi.doMock('../client', () => ({
      getSupabaseClient: () => ({ rpc: rpcMock }),
      isSupabaseConfigured: () => true,
      toValidUuid: (v: string) => v,
    }));

    const { auditService } = await import('../services/auditService');
    const res = await auditService.logAccessDeniedEvent({
      accountId: '00000000-0000-4000-8000-000000000001',
      businessId: '00000000-0000-4000-8000-000000000002',
      branchId: '00000000-0000-4000-8000-000000000003',
      actorStaffId: 'forged_staff',
      attemptedScreen: 'settings',
      category: 'pos_inventory',
      effectiveRole: 'Staff',
      rawRole: 'Cashier',
      reason: 'ROUTE_GUARD_DENIED',
      occurredAt: '2026-11-24T12:00:00.000Z',
    });

    expect(res).toEqual({ ok: true, persistedRemote: true, queued: false });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [fnName, args] = rpcMock.mock.calls[0];
    expect(fnName).toBe('log_access_denied_event');
    expect(args).not.toHaveProperty('actor_auth_id');
    expect(args).not.toHaveProperty('p_actor_auth_id');
    expect(args).not.toHaveProperty('actor_staff_id');
    expect(args).not.toHaveProperty('record_id');
    expect(args.p_attempted_screen).toBe('settings');
  });

  it('queues RPC into offlineQueue when offline and replays it via flushOfflineQueue', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: { status: 'INSERTED' }, error: null });
    vi.doMock('../client', () => ({
      getSupabaseClient: () => ({ rpc: rpcMock }),
      isSupabaseConfigured: () => true,
      toValidUuid: (v: string) => v,
    }));
    vi.stubGlobal('navigator', { onLine: false });

    const { auditService } = await import('../services/auditService');
    const { getQueuedMutations, flushOfflineQueue } = await import('../offlineQueue');

    const res = await auditService.logAccessDeniedEvent({
      attemptedScreen: 'finance',
      category: 'logistics_delivery',
      effectiveRole: 'dispatcher',
      rawRole: 'dispatcher',
      reason: 'ROUTE_GUARD_DENIED',
      occurredAt: '2026-11-24T12:05:00.000Z',
    });

    expect(res).toEqual({ ok: true, persistedRemote: false, queued: true });
    expect(rpcMock).not.toHaveBeenCalled();

    const queue = getQueuedMutations();
    expect(queue.length).toBe(1);
    expect(queue[0].kind).toBe('rpc');
    expect(queue[0].fn).toBe('log_access_denied_event');
    expect(queue[0].table).toBe('immutable_audit_logs');

    // Back online -> flushOfflineQueue replays the RPC
    vi.stubGlobal('navigator', { onLine: true });
    const flushed = await flushOfflineQueue({ ignoreBackoff: true });
    expect(flushed.succeeded).toBe(1);
    expect(rpcMock).toHaveBeenCalledWith(
      'log_access_denied_event',
      expect.objectContaining({ p_attempted_screen: 'finance' })
    );
  });

  it('handles non-retryable RLS/signature errors without queueing and returns safely when queue is full', async () => {
    const rpcMock = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'insufficient_privilege' } })
      .mockResolvedValueOnce({ data: null, error: { code: '57014', message: 'timeout' } });

    vi.doMock('../client', () => ({
      getSupabaseClient: () => ({ rpc: rpcMock }),
      isSupabaseConfigured: () => true,
      toValidUuid: (v: string) => v,
    }));

    const { auditService } = await import('../services/auditService');
    const { getQueuedMutations, QUEUE_STORAGE_KEY, MAX_QUEUE_SIZE } = await import('../offlineQueue');

    const nonRetryable = await auditService.logAccessDeniedEvent({
      attemptedScreen: 'staff',
      category: 'pos_inventory',
      effectiveRole: 'Staff',
      occurredAt: '2026-11-24T12:10:00.000Z',
    });
    expect(nonRetryable).toEqual({ ok: false, persistedRemote: false, queued: false });
    expect(getQueuedMutations().length).toBe(0);

    // Fill queue to MAX_QUEUE_SIZE to verify OfflineQueueCapacityError does not crash
    const fullItems = Array.from({ length: MAX_QUEUE_SIZE }, (_, idx) => ({
      id: `q_${idx}`,
      kind: 'rpc',
      fn: 'noop',
      enqueuedAt: '2026-11-24T12:00:00.000Z',
      attempts: 0,
    }));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(fullItems));

    const capRes = await auditService.logAccessDeniedEvent({
      attemptedScreen: 'staff',
      category: 'pos_inventory',
      effectiveRole: 'Staff',
      occurredAt: '2026-11-24T12:11:00.000Z',
    });
    expect(capRes).toEqual({ ok: false, persistedRemote: false, queued: false });
  });
});
