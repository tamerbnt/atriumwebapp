import { describe, it, expect, beforeEach } from 'vitest';
import {
  CATEGORY_TABLE_MAP,
  CORE_SYNC_TABLES,
  buildTraceEnvelope,
  runWithConcurrency,
  syncCoordinator,
} from '../syncCoordinator';
import {
  clearOfflineQueue,
  enqueueMutation,
  flushOfflineQueue,
  getOfflineQueueCount,
  getQueuedMutations,
} from '../offlineQueue';
import { isUuid, toValidUuid } from '../client';
import type { BusinessCategory } from '../../../types/index';

const ALL_16_VERTICALS: BusinessCategory[] = [
  'membership_session',
  'appointment_service',
  'pos_inventory',
  'project_milestone',
  'rental_booking',
  'education_cohort',
  'freelance_solo',
  'trading_commercial',
  'medical_clinic',
  'auto_garage',
  'real_estate',
  'manufacturing_production',
  'legal_accounting',
  'logistics_delivery',
  'construction_contractor',
  'agriculture_farming',
];

describe('syncCoordinator & offlineQueue', () => {
  beforeEach(() => {
    clearOfflineQueue();
    syncCoordinator.clearCursors();
  });

  it('covers all 16 BusinessCategory verticals plus core sync tables', () => {
    expect(CORE_SYNC_TABLES).toContain('businesses');
    expect(CORE_SYNC_TABLES).toContain('branches');
    expect(CORE_SYNC_TABLES).toContain('staff');

    for (const category of ALL_16_VERTICALS) {
      const tables = syncCoordinator.getTablesForCategory(category);
      expect(tables.length, `Missing tables for ${category}`).toBeGreaterThanOrEqual(6);
      expect(CATEGORY_TABLE_MAP[category]).toEqual(tables);
    }
  });

  it('coalesces concurrent runSingleFlight calls sharing the same key and resets after settlement', async () => {
    let executions = 0;
    const work = () =>
      syncCoordinator.runSingleFlight('branch_01:sync', async () => {
        executions += 1;
        await new Promise((r) => setTimeout(r, 15));
        return executions;
      });

    const [a, b, c] = await Promise.all([work(), work(), work()]);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(c).toBe(1);
    expect(executions).toBe(1);
    expect(syncCoordinator.isSyncing('branch_01:sync')).toBe(false);

    const next = await work();
    expect(next).toBe(2);
    expect(executions).toBe(2);
  });

  it('bounds runWithConcurrency strictly to maxConcurrency workers', async () => {
    let active = 0;
    let peak = 0;
    const tasks = Array.from({ length: 14 }, (_, idx) => async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 8));
      active -= 1;
      return idx * 2;
    });

    const results = await runWithConcurrency(tasks, 4);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
    expect(results).toEqual(Array.from({ length: 14 }, (_, idx) => idx * 2));
  });

  it('builds valid UUID trace envelopes and preserves delta cursors', () => {
    const trace = buildTraceEnvelope({
      accountId: 'acc_01',
      businessId: 'biz_medical',
      branchId: 'branch_med_main',
      staffId: 'staff_01',
    });

    expect(isUuid(trace.account_id)).toBe(true);
    expect(isUuid(trace.business_id)).toBe(true);
    expect(isUuid(trace.branch_id)).toBe(true);
    expect(isUuid(trace.staff_id)).toBe(true);
    expect(trace.device_id.length).toBeGreaterThan(0);

    expect(syncCoordinator.getDeltaCursor('branch_med_main', 'medical_clinic')).toBeNull();
    const ts = '2026-11-18T10:00:00.000Z';
    syncCoordinator.markSynced('branch_med_main', 'medical_clinic', ts);
    expect(syncCoordinator.getDeltaCursor('branch_med_main', 'medical_clinic')).toBe(ts);
  });

  it('queues upserts, soft-deletes, and RPCs offline with deduplication per (table, id, kind)', async () => {
    const id = toValidUuid('pat_01');
    const first = await syncCoordinator.mutateOrQueueUpsert('medical_patients', { id, full_name: 'Amine A.' });
    const second = await syncCoordinator.mutateOrQueueUpsert('medical_patients', { id, full_name: 'Amine B.' });

    expect(first.queued).toBe(true);
    expect(second.queued).toBe(true);
    expect(getOfflineQueueCount()).toBe(1);
    expect(getQueuedMutations()[0]?.payload?.full_name).toBe('Amine B.');

    await syncCoordinator.softDeleteRow('medical_patients', 'pat_02', 'staff_01');
    await syncCoordinator.rpcOrQueue('logistics_seal_bag', { p_bag_id: toValidUuid('bag_01') });
    expect(getOfflineQueueCount()).toBe(3);

    enqueueMutation({
      kind: 'upsert',
      table: 'btp_projects',
      payload: { id: toValidUuid('proj_01'), title: 'Chantier' },
    });
    expect(getOfflineQueueCount()).toBe(4);

    // Without configured Supabase client, flushOfflineQueue leaves queue intact cleanly
    const flushRes = await flushOfflineQueue();
    expect(flushRes).toEqual({ processed: 0, succeeded: 0, failed: 0 });
    expect(getOfflineQueueCount()).toBe(4);
  });
});
