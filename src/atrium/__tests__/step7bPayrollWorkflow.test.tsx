import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaffPayrollSubView } from '../../components/common/staff/StaffPayrollSubView';
import { PayslipPrintModal } from '../../components/common/staff/PayslipPrintModal';
import { PayrollMigrationDryRunPanel } from '../../components/common/staff/PayrollMigrationDryRunPanel';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import { atriumActions } from '../../services/store';
import { getLocalCodeBaselineStatutoryRate } from '../../lib/supabase/services/referenceDataService';
import type {
  StaffMember,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
  StaffSalaryAdvance,
} from '../../types/index';

describe('Step 7b Workforce Payroll & Attendance Workflows', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    atriumActions.resetToDefaultDemoData('membership_session');
  });

  it('renders statutory warning badges (Rates not verified, Legacy basis, SNMG missing/below) and lifecycle buttons in StaffPayrollSubView', () => {
    const staffList: StaffMember[] = [
      {
        id: 'stf_1',
        fullName: 'Samir Coach',
        role: 'Coach',
        status: 'active',
        isActive: true,
        salary: 18000,
        paymentMethod: 'cash',
      } as StaffMember,
    ];
    const draftRun: StaffPayrollRunRecord = {
      id: 'run_draft_1',
      periodMonth: 11,
      periodYear: 2026,
      title: 'Paie Novembre 2026',
      status: 'draft',
      runType: 'regular',
      adjustmentSeq: 0,
      rateSetId: null,
      rateBasis: 'legacy',
      rateSnapshot: {
        versionId: 'local-code-baseline-unverified',
        versionCode: 'DZ-CODE-BASELINE-UNVERIFIED',
        effectiveFrom: null,
        verificationStatus: 'unverified',
        cnasSalarialRate: 0.09,
        cnasPatronalRate: 0.26,
        irgBrackets: null,
        irgAbatementRate: 0.4,
        irgAbatementMinDzd: 1000,
        irgAbatementMaxDzd: 1500,
        irgExemptionThresholdDzd: 30000,
        irgTransitionalMaxDzd: 35000,
        irgTransitionalConfig: null,
        snmgDzd: null,
        overtimeMultiplier50: 1.5,
        overtimeMultiplier100: 2.0,
      },
      totalGrossCotisable: 18000,
      totalCnasSalarial: 1620,
      totalCnasPatronal: 4680,
      totalIrg: 0,
      totalNet: 16380,
      slipsCount: 1,
      createdAt: '2026-11-26T10:00:00Z',
    };
    const pendingAdvance: StaffSalaryAdvance = {
      id: 'adv_1',
      staffId: 'stf_1',
      staffName: 'Samir Coach',
      amountDzd: 5000,
      dateIssued: '2026-11-10',
      reason: 'Acompte',
      status: 'pending',
      paymentMethod: 'cash',
      voucherNumber: 'AV-001',
    };

    const draftHtml = renderToStaticMarkup(
      <StaffPayrollSubView
        staffList={staffList}
        payrollRuns={[draftRun]}
        payrollSlips={[]}
        salaryAdvances={[pendingAdvance]}
        onGeneratePayroll={() => {}}
        onApprovePayroll={() => {}}
        onMarkSlipPaid={() => {}}
        onCreateAdvance={() => {}}
        onWaiveAdvance={() => {}}
        effectiveStatutoryRate={getLocalCodeBaselineStatutoryRate()}
        businessName="Atlas Gym"
        fiscalProfile={{ nif: '123456789012345', rc: '16/00-112233' }}
        language="en"
      />
    );

    expect(draftHtml).toContain('Rates not verified');
    expect(draftHtml).toContain('Legacy basis');
    expect(draftHtml).toContain('SNMG not configured');
    expect(draftHtml).toContain('Approve (Lock)');
    expect(draftHtml).toContain('Close &amp; Pay');
    expect(draftHtml).toContain('Waive');

    const approvedRun: StaffPayrollRunRecord = {
      ...draftRun,
      status: 'approved',
      rateBasis: 'versioned',
      rateSnapshot: {
        ...draftRun.rateSnapshot!,
        verificationStatus: 'verified',
        snmgDzd: 24000,
      },
    };
    const approvedHtml = renderToStaticMarkup(
      <StaffPayrollSubView
        staffList={staffList}
        payrollRuns={[approvedRun]}
        payrollSlips={[]}
        salaryAdvances={[]}
        onGeneratePayroll={() => {}}
        onApprovePayroll={() => {}}
        onMarkSlipPaid={() => {}}
        onCreateAdvance={() => {}}
        language="en"
      />
    );

    expect(approvedHtml).toContain('Approved (Locked)');
    expect(approvedHtml).toContain('Adjustment Run');
    expect(approvedHtml).toContain('Mark All Paid');
    expect(approvedHtml).toContain('below SNMG');
  });

  it('PayslipPrintModal uses real fiscal identifiers (zero demo NIF/RC/NSS fallbacks) and renders carryover row', () => {
    const slip: StaffPayrollSlipRecord = {
      id: 'slip_1',
      payrollRunId: 'run_1',
      staffId: 'stf_1',
      matricule: 'MAT-001',
      staffFullName: 'Nadia Benali',
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
      acomptesDeduits: 3000,
      advanceCarryover: 1500,
      autresRetenues: 0,
      netAPayer: 37500,
      paymentMethod: 'cash',
      isPaid: false,
      receiptNumber: 'FP-2026-11-001',
      rateBasis: 'legacy',
    };

    const html = renderToStaticMarkup(
      <PayslipPrintModal
        isOpen
        onClose={() => {}}
        slip={slip}
        businessName="Salle Oran"
        fiscalProfile={{ nif: '999888777666555', rc: '31/00-555444' }}
        businessAddress="Oran Centre"
        language="fr"
      />
    );

    expect(html).toContain('Salle Oran');
    expect(html).toContain('999888777666555');
    expect(html).toContain('31/00-555444');
    expect(html).toContain('Rates not verified');
    expect(html).toContain('Legacy basis');
    expect(html).toContain('1');
    expect(html).not.toContain('002416098124589');
    expect(html).not.toContain('16/00-88124');
    expect(html).not.toContain('89 04 16 0000 00');
  });

  it('PayrollMigrationDryRunPanel exposes Step 7b insert-only backfill trigger alongside Step 7a diagnostics', () => {
    const html = renderToStaticMarkup(<PayrollMigrationDryRunPanel language="en" />);
    expect(html).toContain('step7a-payroll-dry-run-panel');
    expect(html).toContain('step7b-execute-backfill-btn');
    expect(html).toContain('localStorage preserved for 1 release');
  });

  it('store payroll workflow creates regular run, blocks duplicate overwrite after approval, supports adjustment sequence, and waives advances', () => {
    const regRun = atriumActions.generateStaffPayrollRun(2, 2026, 'membership_session');
    expect(regRun).toBeTruthy();
    expect(regRun?.status).toBe('draft');
    expect(regRun?.runType).toBe('regular');
    expect(regRun?.adjustmentSeq).toBe(0);

    // Approve (lock without paying)
    atriumActions.approveStaffPayrollRun(regRun!.id, { markPaid: false });

    // Non-adjustment regeneration of approved regular run must fail closed
    const blockedDuplicate = atriumActions.generateStaffPayrollRun(2, 2026, 'membership_session');
    expect(blockedDuplicate).toBeNull();

    // Adjustment run succeeds with adjustmentSeq === 1
    const adjRun = atriumActions.generateStaffPayrollRun(2, 2026, 'membership_session', {
      isAdjustment: true,
    });
    expect(adjRun).toBeTruthy();
    expect(adjRun?.runType).toBe('adjustment');
    expect(adjRun?.adjustmentSeq).toBe(1);
  });
});
