import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePayrollMigrationDryRun,
  deterministicLegacyUuid,
  exportPayrollDryRunCsv,
  exportPayrollDryRunJson,
  type LegacyPayrollStorageKey,
} from './payrollMigrationDryRun';

test('Step 7a dry-run detects UUID mappings, same-ID diffs, period collisions and missing CCP/RIB with zero writes', () => {
  const memStore: Partial<Record<LegacyPayrollStorageKey, string>> = {
    atrium_staff_attendance_logs_v1: JSON.stringify([
      {
        id: 'att_legacy_1',
        businessId: 'biz_1',
        branchId: 'br_1',
        staffId: 'stf_1',
        staffName: 'Karim',
        date: '2026-11-20',
        timestamp: '2026-11-20T08:00:00.000Z',
        type: 'in',
        method: 'pin',
      },
    ]),
    atrium_staff_salary_advances_v1: JSON.stringify([
      {
        id: 'adv_legacy_1',
        businessId: 'biz_1',
        branchId: 'br_1',
        staffId: 'stf_1',
        staffName: 'Karim',
        amountDzd: 10000,
        dateIssued: '2026-11-10',
        paymentMethod: 'cash',
        voucherNumber: 'AV-001',
        status: 'pending',
      },
    ]),
    atrium_staff_payroll_runs_v1: JSON.stringify([
      {
        id: 'run_legacy_nov',
        businessId: 'biz_1',
        branchId: 'br_1',
        periodMonth: 11,
        periodYear: 2026,
        title: 'Paie Novembre 2026 (Legacy)',
        status: 'approved',
        totalGrossCotisable: 90000,
        totalCnasSalarial: 8100,
        totalCnasPatronal: 23400,
        totalIrg: 4500,
        totalNet: 77400,
        slipsCount: 2,
        createdAt: '2026-11-25T10:00:00.000Z',
      },
    ]),
    atrium_staff_payroll_slips_v1: JSON.stringify([
      {
        id: 'slip_legacy_1',
        payrollRunId: 'run_legacy_nov',
        staffId: 'stf_1',
        matricule: 'EMP-01',
        staffFullName: 'Karim',
        role: 'Coach',
        periodMonth: 11,
        periodYear: 2026,
        periodLabel: '2026-11',
        baseSalary: 50000,
        actualBaseSalary: 50000,
        workedDays: 22,
        standardDays: 22,
        primesCotisables: [],
        salaireBrutCotisable: 50000,
        cnasSalarial: 4500,
        cnasPatronal: 13000,
        salaireBrutImposable: 45500,
        irgTax: 2500,
        primesNonImposables: [],
        acomptesDeduits: 0,
        autresRetenues: 0,
        netAPayer: 43000,
        paymentMethod: 'ccp',
        ccpNumber: '',
        ccpKey: '',
        isPaid: false,
        receiptNumber: 'BS-001',
      },
    ]),
  };

  const report = analyzePayrollMigrationDryRun(
    {
      businessId: 'biz_1',
      branchId: 'br_1',
      staffList: [
        {
          id: 'stf_1',
          tenantId: 't1',
          facilityId: 'br_1',
          fullName: 'Karim',
          email: '',
          phoneNumber: '0550112233',
          role: 'Staff',
          roleRank: 5,
          isActive: true,
          hireDate: '2025-01-01',
          salary: 50000,
          paymentDay: 1,
          paymentMethod: 'ccp',
          ccpNumber: '',
          ccpKey: '',
          pinCode: '****',
          allowedModules: ['dashboard'],
        },
        {
          id: 'stf_2',
          tenantId: 't1',
          facilityId: 'br_1',
          fullName: 'Nadia',
          email: '',
          phoneNumber: '0550445566',
          role: 'Manager',
          roleRank: 15,
          isActive: true,
          hireDate: '2025-01-01',
          salary: 70000,
          paymentDay: 1,
          paymentMethod: 'bank_transfer',
          bankRib: '',
          pinCode: '****',
          allowedModules: ['dashboard'],
        },
      ],
      attendanceLogs: [
        {
          id: deterministicLegacyUuid('att_legacy_1'),
          businessId: 'biz_1',
          branchId: 'br_1',
          staffId: 'stf_1',
          staffName: 'Karim',
          date: '2026-11-20',
          timestamp: '2026-11-20T08:00:00.000Z',
          type: 'out', // intentional same-ID diff vs legacy 'in'
          method: 'pin',
        },
      ],
      salaryAdvances: [],
      payrollRuns: [
        {
          id: 'run_remote_nov_other', // different ID, same (biz_1, br_1, 2026, 11) => collision!
          businessId: 'biz_1',
          branchId: 'br_1',
          periodMonth: 11,
          periodYear: 2026,
          title: 'Paie Novembre 2026 (Remote)',
          status: 'draft',
          totalGrossCotisable: 90000,
          totalCnasSalarial: 8100,
          totalCnasPatronal: 23400,
          totalIrg: 4500,
          totalNet: 77400,
          slipsCount: 2,
          createdAt: '2026-11-26T09:00:00.000Z',
        },
      ],
      payrollSlips: [],
    },
    (key) => memStore[key] ?? null
  );

  assert.equal(report.isReadOnlyDryRun, true);
  assert.equal(report.dbWritesExecuted, 0);
  assert.equal(report.gateStatus, 'AWAITING_GATE_4_APPROVAL');
  assert.equal(report.statutoryBasisBadge, 'Rates not verified (legacy basis)');
  assert.equal(report.uuidMappings.length, 4);
  assert.equal(report.fieldDiffs.length, 1);
  assert.equal(report.fieldDiffs[0].differences[0].field, 'type');
  assert.equal(report.periodCollisions.length, 1);
  assert.equal(report.missingAccountWarnings.length, 3); // 2 staff + 1 slip

  const jsonOut = exportPayrollDryRunJson(report);
  assert.ok(jsonOut.includes('Rates not verified (legacy basis)'));
  const csvOut = exportPayrollDryRunCsv(report);
  assert.ok(csvOut.includes('uuid_mapping'));
  assert.ok(csvOut.includes('period_collision'));
  assert.ok(csvOut.includes('missing_ccp_rib'));
});
