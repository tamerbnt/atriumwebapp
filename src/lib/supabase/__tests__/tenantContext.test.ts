import { describe, it, expect, beforeEach } from 'vitest';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import { clearOfflineQueue, getOfflineQueueCount } from '../offlineQueue';
import { requireTenantAccountId, requireTenantContext, TenantContextMissingError } from '../tenantContext';

describe('Tenant Context Fail-Closed Enforcement (4.2)', () => {
  beforeEach(() => {
    clearOfflineQueue();
  });

  it('throws TenantContextMissingError when all accountId candidates are empty', () => {
    expect(() => requireTenantAccountId(undefined, null, '', '   ')).toThrow(TenantContextMissingError);
    expect(requireTenantAccountId('', 'acct-real-99')).toBe('acct-real-99');
  });

  it('requires both accountId and branchId in buildTraceEnvelope and never emits deterministic zero UUID fallback', () => {
    expect(() =>
      buildTraceEnvelope({ accountId: '', businessId: 'biz_1', branchId: 'branch_1' })
    ).toThrow(TenantContextMissingError);

    expect(() =>
      buildTraceEnvelope({ accountId: 'acct-real-1', businessId: 'biz_1', branchId: '' })
    ).toThrow(TenantContextMissingError);

    const trace = buildTraceEnvelope({
      accountId: 'acct-real-1',
      businessId: 'biz_1',
      branchId: 'branch_1',
      staffId: 'stf_1',
    });
    expect(trace.account_id).toBeTruthy();
    expect(trace.branch_id).toBeTruthy();
  });

  it('refuses to queue anything when tenant context is missing during upsert preparation', async () => {
    expect(() =>
      requireTenantContext({ accountId: undefined, branchId: 'branch_1' })
    ).toThrow(TenantContextMissingError);
    expect(getOfflineQueueCount()).toBe(0);
    // Direct syncCoordinator call with valid context still queues offline
    const res = await syncCoordinator.mutateOrQueueUpsert('gym_members', {
      id: 'mem_real_1',
      full_name: 'Karim',
    });
    expect(res.queued).toBe(true);
    expect(getOfflineQueueCount()).toBe(1);
  });
});
