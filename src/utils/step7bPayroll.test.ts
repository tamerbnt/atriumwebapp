import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectLegacyPayrollBackfillPayload,
  deterministicLegacyUuid,
  executePayrollMigrationBackfill,
  isPayrollMigrationCompleted,
  LEGACY_PAYROLL_STORAGE_KEYS,
  PAYROLL_MIGRATION_DONE_KEY,
  readPayrollMigrationCompletion,
  resolveNextAdjustmentSeq,
} from './payrollMigrationDryRun.ts';
import { sortQueueForReplay, type OfflineMutationItem } from '../lib/supabase/offlineQueue.ts';
import type {
  StaffAttendanceLogRecord,
  StaffMember,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
  StaffSalaryAdvance,
} from '../types/index.ts';

function makeStorage(initial: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    read: (key: string) => store.get(key) ?? null,
    write: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('Step 7b: Offline RPC replay ordering & insert-only payroll backfill', () => {
  it('orders approve_payroll_run RPC (480) after staff_salary_advances (401) and staff_payroll_slips (461)', () => {
    const advMutation: OfflineMutationItem = {
      id: 'm_adv',
      kind: 'upsert',
      table: 'staff_salary_advances',
      payload: { id: 'adv_1' },
      enqueuedAt: '2026-11-26T10:00:00Z',
      attempts: 0,
    };
    const slipMutation: OfflineMutationItem = {
      id: 'm_slip',
      kind: 'upsert',
      table: 'staff_payroll_slips',
      payload: { id: 'slip_1' },
      enqueuedAt: '2026-11-26T10:00:01Z',
      attempts: 0,
    };
    const approveRpc: OfflineMutationItem = {
      id: 'm_approve',
      kind: 'rpc',
      table: 'staff_payroll_runs',
      fn: 'approve_payroll_run',
      args: { p_run_id: 'run_1', p_mark_paid: false },
      enqueuedAt: '2026-11-26T09:59:00Z',
      attempts: 0,
    };

    const sorted = sortQueueForReplay([approveRpc, slipMutation, advMutation]);
    assert.deepEqual(
      sorted.map((x) => x.id),
      ['m_adv', 'm_slip', 'm_approve']
    );
  });

  it('resolveNextAdjustmentSeq increments sequence cleanly for existing regular and adjustment runs', () => {
    const baseRun: StaffPayrollRunRecord = {
      id: 'run_reg',
      businessId: 'biz_1',
      branchId: 'br_1',
      periodMonth: 11,
      periodYear: 2026,
      title: 'Paie Novembre 2026',
      status: 'approved',
      runType: 'regular',
      adjustmentSeq: 0,
      totalGrossCotisable: 60000,
      totalCnasSalarial: 5400,
      totalCnasPatronal: 15600,
      totalIrg: 7000,
      totalNet: 47600,
      slipsCount: 1,
      createdAt: '2026-11-25T10:00:00Z',
    };

    assert.equal(resolveNextAdjustmentSeq([baseRun], 'biz_1', 'br_1', 2026, 11), 1);

    const adj1: StaffPayrollRunRecord = {
      ...baseRun,
      id: 'run_adj_1',
      runType: 'adjustment',
      adjustmentSeq: 1,
    };
    assert.equal(resolveNextAdjustmentSeq([baseRun, adj1], 'biz_1', 'br_1', 2026, 11), 2);
  });

  it('collectLegacyPayrollBackfillPayload skips period collisions while mapping non-colliding records to legacy UUIDs', () => {
    const remoteRun: StaffPayrollRunRecord = {
      id: '11111111-1111-4111-8111-111111111111',
      businessId: 'biz_1',
      branchId: 'br_1',
      periodMonth: 11,
      periodYear: 2026,
      title: 'Paie Novembre 2026',
      status: 'approved',
      runType: 'regular',
      adjustmentSeq: 0,
      totalGrossCotisable: 60000,
      totalCnasSalarial: 5400,
      totalCnasPatronal: 15600,
      totalIrg: 7000,
      totalNet: 47600,
      slipsCount: 1,
      createdAt: '2026-11-25T10:00:00Z',
    };
    const collidingLegacyRun: StaffPayrollRunRecord = {
      ...remoteRun,
      id: 'legacy_run_nov_dup',
    };
    const nonCollidingLegacyRun: StaffPayrollRunRecord = {
      ...remoteRun,
      id: 'legacy_run_oct',
      periodMonth: 10,
      title: 'Paie Octobre 2026',
    };
    const slips: StaffPayrollSlipRecord[] = [
      {
        id: 'slip_nov_dup',
        payrollRunId: 'legacy_run_nov_dup',
        staffId: 'stf_1',
        matricule: 'MAT-001',
        staffFullName: 'Karim',
        role: 'Coach',
        periodMonth: 11,
        periodYear: 2026,
        periodLabel: 'Novembre 2026',
        baseSalary: 50000,
        actualBaseSalary: 50000,
        workedDays: 22,
        standardDays: 22,
        primesCotisables: [],
        salaireBrutCotisable: 50000,
        cnasSalarial: 4500,
        cnasPatronal: 13000,
        salaireBrutImposable: 45500,
        irgTax: 5000,
        primesNonImposables: [],
        acomptesDeduits: 0,
        autresRetenues: 0,
        netAPayer: 40500,
        paymentMethod: 'cash',
        isPaid: false,
        receiptNumber: 'FP-1',
      },
      {
        id: 'slip_oct',
        payrollRunId: 'legacy_run_oct',
        staffId: 'stf_1',
        matricule: 'MAT-001',
        staffFullName: 'Karim',
        role: 'Coach',
        periodMonth: 10,
        periodYear: 2026,
        periodLabel: 'Octobre 2026',
        baseSalary: 50000,
        actualBaseSalary: 50000,
        workedDays: 22,
        standardDays: 22,
        primesCotisables: [],
        salaireBrutCotisable: 50000,
        cnasSalarial: 4500,
        cnasPatronal: 13000,
        salaireBrutImposable: 45500,
        irgTax: 5000,
        primesNonImposables: [],
        acomptesDeduits: 0,
        autresRetenues: 0,
        netAPayer: 40500,
        paymentMethod: 'cash',
        isPaid: true,
        receiptNumber: 'FP-0',
      },
    ];
    const att: StaffAttendanceLogRecord[] = [
      {
        id: 'att_legacy_1',
        businessId: 'biz_1',
        branchId: 'br_1',
        staffId: 'stf_1',
        staffName: 'Karim',
        staffRole: 'Coach',
        timestamp: '2026-10-12T08:00:00Z',
        date: '2026-10-12',
        type: 'in',
        method: 'kiosk',
      },
    ];
    const adv: StaffSalaryAdvance[] = [
      {
        id: 'adv_legacy_1',
        businessId: 'biz_1',
        branchId: 'br_1',
        staffId: 'stf_1',
        staffName: 'Karim',
        amountDzd: 5000,
        dateIssued: '2026-10-05',
        reason: 'Urgence',
        status: 'deducted',
        paymentMethod: 'cash',
        voucherNumber: 'AV-1',
      },
    ];

    const mem = makeStorage({
      atrium_staff_payroll_runs_v1: JSON.stringify([collidingLegacyRun, nonCollidingLegacyRun]),
      atrium_staff_payroll_slips_v1: JSON.stringify(slips),
      atrium_staff_attendance_logs_v1: JSON.stringify(att),
      atrium_staff_salary_advances_v1: JSON.stringify(adv),
    });

    const payload = collectLegacyPayrollBackfillPayload(
      {
        businessId: 'biz_1',
        branchId: 'br_1',
        staffList: [{ id: 'stf_1', fullName: 'Karim' } as StaffMember],
        attendanceLogs: [],
        salaryAdvances: [],
        payrollRuns: [remoteRun],
        payrollSlips: [],
      },
      mem.read
    );

    // Colliding Nov run & slip excluded; Oct run & slip retained and tagged legacy
    assert.equal(payload.payrollRuns.length, 1);
    assert.equal(payload.payrollRuns[0].id, deterministicLegacyUuid('legacy_run_oct'));
    assert.equal(payload.payrollRuns[0].rateBasis, 'legacy');
    assert.equal(payload.payrollRuns[0].rateSetId, null);

    assert.equal(payload.payrollSlips.length, 1);
    assert.equal(payload.payrollSlips[0].id, deterministicLegacyUuid('slip_oct'));
    assert.equal(payload.attendanceLogs.length, 1);
    assert.equal(payload.salaryAdvances.length, 1);
  });

  it('executePayrollMigrationBackfill marks completion once, is idempotent, and preserves legacy localStorage keys', async () => {
    const legacyAttRaw = JSON.stringify([
      {
        id: 'att_legacy_2',
        businessId: 'biz_1',
        branchId: 'br_1',
        staffId: 'stf_1',
        staffName: 'Karim',
        staffRole: 'Coach',
        timestamp: '2026-11-26T08:00:00Z',
        date: '2026-11-26',
        type: 'in',
        method: 'kiosk',
      },
    ]);
    const mem = makeStorage({
      atrium_staff_attendance_logs_v1: legacyAttRaw,
    });

    let persistCalls = 0;
    const first = await executePayrollMigrationBackfill({
      remoteState: {
        businessId: 'biz_1',
        branchId: 'br_1',
        staffList: [],
        attendanceLogs: [],
        salaryAdvances: [],
        payrollRuns: [],
        payrollSlips: [],
      },
      storageReader: mem.read,
      storageWriter: mem.write,
      persistInsertOnly: async (payload) => {
        persistCalls += 1;
        return {
          attendanceInserted: payload.attendanceLogs.length,
          advancesInserted: payload.salaryAdvances.length,
          runsInserted: payload.payrollRuns.length,
          slipsInserted: payload.payrollSlips.length,
          skippedCollisions: [],
          errors: [],
        };
      },
    });

    assert.equal(first.alreadyCompleted, false);
    assert.equal(first.errors.length, 0);
    assert.equal(first.marker.attendanceInserted, 1);
    assert.equal(persistCalls, 1);
    assert.equal(isPayrollMigrationCompleted(mem.read), true);
    assert.equal(mem.read('atrium_staff_attendance_logs_v1'), legacyAttRaw);
    assert.deepEqual(first.marker.retainedBackupKeys, [...LEGACY_PAYROLL_STORAGE_KEYS]);

    const marker = readPayrollMigrationCompletion(mem.read);
    assert.ok(marker);
    assert.ok(mem.store.has(PAYROLL_MIGRATION_DONE_KEY));

    // Re-running without force must short-circuit with zero additional DB writes
    const second = await executePayrollMigrationBackfill({
      remoteState: {
        businessId: 'biz_1',
        branchId: 'br_1',
        staffList: [],
        attendanceLogs: [],
        salaryAdvances: [],
        payrollRuns: [],
        payrollSlips: [],
      },
      storageReader: mem.read,
      storageWriter: mem.write,
      persistInsertOnly: async () => {
        persistCalls += 1;
        return {
          attendanceInserted: 0,
          advancesInserted: 0,
          runsInserted: 0,
          slipsInserted: 0,
          skippedCollisions: [],
          errors: [],
        };
      },
    });

    assert.equal(second.alreadyCompleted, true);
    assert.equal(persistCalls, 1);
  });
});
