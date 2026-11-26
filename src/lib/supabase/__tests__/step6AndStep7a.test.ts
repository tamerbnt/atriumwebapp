import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as clientModule from '../client';
import {
  clearOfflineQueue,
  getOfflineQueueCount,
} from '../offlineQueue';
import {
  clearCachedDeviceBlocks,
  seedLocalDeviceBlock,
  sequenceService,
} from '../services/sequenceService';
import { posService } from '../services/posService';
import { atriumActions } from '../../../services/store';
import {
  resetUndoEngineForTests,
  undoLatestForBranch,
} from '../../../services/undoEngine';
import {
  computeElapsedMinutesFromIso,
  requiresVarianceManagerPin,
} from '../../../utils/step6Persistence';
import {
  analyzePayrollMigrationDryRun,
  deterministicLegacyUuid,
  exportPayrollDryRunCsv,
  exportPayrollDryRunJson,
} from '../../../utils/payrollMigrationDryRun';
import { dzdToCentimes } from '../../../utils/money';

function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockStorage },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
}

describe('Step 6 (1.1–1.6 Persistence) & Step 7a (Read-Only Payroll Dry-Run Inspector)', () => {
  let baselineSnapshot: string;

  beforeEach(() => {
    installMemoryStorage();
    baselineSnapshot = atriumActions.exportDatabase();
    clearOfflineQueue();
    clearCachedDeviceBlocks();
    resetUndoEngineForTests();
  });

  afterEach(() => {
    atriumActions.importDatabase(baselineSnapshot);
    clearOfflineQueue();
    clearCachedDeviceBlocks();
    resetUndoEngineForTests();
    vi.restoreAllMocks();
  });

  it('1.1: enforces 5-minute duplicate check-in block with PIN override reason, undo reversal, and sequential walk_in_ticket allocation', async () => {
    const initSnap = JSON.parse(atriumActions.exportDatabase());
    const gymBiz =
      initSnap.businesses.find((b: any) => b.category === 'membership_session') ||
      initSnap.businesses[0];
    atriumActions.switchBusiness(gymBiz.id);
    const snap = JSON.parse(atriumActions.exportDatabase());
    let member = snap.members.find((m: any) => m.status === 'Active');
    if (!member) {
      member = {
        id: 'mem_step6_1',
        tenantId: snap.account.id,
        facilityId: snap.currentBranchId,
        businessId: snap.currentBusinessId,
        branchId: snap.currentBranchId,
        fullName: 'Amira Test',
        phoneNumber: '+213550001122',
        status: 'Active',
        expirationDate: '2099-12-31',
        remainingSessions: 8,
      };
      snap.members.push(member);
    }

    // Ensure member has finite sessions and no recent check-ins inside 5 minutes
    const initialSessions = 8;
    snap.members = snap.members.map((m: any) =>
      m.id === member.id
        ? {
            ...m,
            status: 'Active',
            expirationDate: '2099-12-31',
            remainingSessions: initialSessions,
          }
        : m
    );
    snap.memberCheckIns = [];
    atriumActions.importDatabase(JSON.stringify(snap));

    // First check-in succeeds and decrements session
    const firstRes = atriumActions.checkInMember(member.id, { method: 'qr', logDenied: true });
    expect(firstRes?.allowed).toBe(true);
    expect(firstRes?.duplicateBlocked).toBe(false);

    const afterFirst = JSON.parse(atriumActions.exportDatabase());
    let updatedMember = afterFirst.members.find((m: any) => m.id === member.id);
    expect(updatedMember.remainingSessions).toBe(initialSessions - 1);
    expect(afterFirst.memberCheckIns).toHaveLength(1);

    // Immediate second check-in without override is duplicate-blocked
    const dupRes = atriumActions.checkInMember(member.id, { method: 'qr', logDenied: true });
    expect(dupRes?.allowed).toBe(false);
    expect(dupRes?.duplicateBlocked).toBe(true);
    expect(dupRes?.reasonCode).toBe('duplicate_blocked');

    // Override with staffId + reason bypasses duplicate block and logs override fields
    const overrideRes = atriumActions.checkInMember(member.id, {
      method: 'qr',
      logDenied: true,
      overrideByStaffId: 'stf_owner_1',
      overrideReason: 'Member re-entered after forgetting bag at car',
    });
    expect(overrideRes?.allowed).toBe(true);
    expect(overrideRes?.duplicateBlocked).toBe(false);

    const afterOverride = JSON.parse(atriumActions.exportDatabase());
    updatedMember = afterOverride.members.find((m: any) => m.id === member.id);
    expect(updatedMember.remainingSessions).toBe(initialSessions - 2);
    expect(afterOverride.memberCheckIns).toHaveLength(2);
    expect(afterOverride.memberCheckIns[0].overrideReason).toBe(
      'Member re-entered after forgetting bag at car'
    );
    expect(afterOverride.memberCheckIns[0].overrideByStaffId).toBe('stf_owner_1');

    // Undo reverts the override check-in and restores remainingSessions
    const undone = await undoLatestForBranch(
      afterOverride.currentBusinessId,
      afterOverride.currentBranchId
    );
    expect(undone).toBe(true);
    const afterUndo = JSON.parse(atriumActions.exportDatabase());
    const memberAfterUndo = afterUndo.members.find((m: any) => m.id === member.id);
    expect(memberAfterUndo.remainingSessions).toBe(initialSessions - 1);
    expect(afterUndo.memberCheckIns).toHaveLength(1);

    // Walk-in ticket uses cached offline device block (sequential WI-... with zero Math.random)
    seedLocalDeviceBlock({
      businessId: clientModule.toValidUuid(afterUndo.currentBusinessId),
      branchId: clientModule.toValidUuid(afterUndo.currentBranchId),
      deviceId: 'dev_test_kiosk',
      docType: 'walk_in_ticket',
      fiscalYear: 2026,
      rangeStart: 10,
      rangeEnd: 15,
      nextNumber: 10,
      prefix: 'WI',
      allocatedAt: '2026-11-26T08:00:00Z',
    });

    const seq1 = await sequenceService.allocateFromDeviceBlock({
      businessId: afterUndo.currentBusinessId,
      branchId: afterUndo.currentBranchId,
      docType: 'walk_in_ticket',
      fiscalYear: 2026,
      deviceId: 'dev_test_kiosk',
    });
    const seq2 = await sequenceService.allocateFromDeviceBlock({
      businessId: afterUndo.currentBusinessId,
      branchId: afterUndo.currentBranchId,
      docType: 'walk_in_ticket',
      fiscalYear: 2026,
      deviceId: 'dev_test_kiosk',
    });

    expect(seq1.data?.formattedNumber).toBe('WI-2026-00010');
    expect(seq2.data?.formattedNumber).toBe('WI-2026-00011');
  });

  it('1.2: batchRecordAttendance writes locked EduAttendance truth, unlock appends changeHistory reason, and re-save logs transition', () => {
    const initSnap = JSON.parse(atriumActions.exportDatabase());
    const eduBiz = initSnap.businesses.find((b: any) => b.category === 'education_cohort');
    if (eduBiz) atriumActions.switchBusiness(eduBiz.id);
    const snap = JSON.parse(atriumActions.exportDatabase());

    const cohort = snap.eduCohorts[0] || {
      id: 'coh_step6_1',
      tenantId: snap.account.id,
      facilityId: snap.currentBranchId,
      businessId: snap.currentBusinessId,
      branchId: snap.currentBranchId,
      name: 'Anglais B2',
    };
    const session =
      snap.eduSessions.find((s: any) => s.cohortId === cohort.id) ||
      snap.eduSessions[0] || {
        id: 'sess_step6_1',
        tenantId: snap.account.id,
        facilityId: snap.currentBranchId,
        businessId: snap.currentBusinessId,
        branchId: snap.currentBranchId,
        cohortId: cohort.id,
        topic: 'Grammar Workshop',
        status: 'Scheduled',
      };
    const students =
      snap.eduStudents.length >= 2
        ? snap.eduStudents.slice(0, 2)
        : [
            {
              id: 'stu_step6_1',
              tenantId: snap.account.id,
              facilityId: snap.currentBranchId,
              businessId: snap.currentBusinessId,
              branchId: snap.currentBranchId,
              fullName: 'Yacine Haddad',
              attendanceRatePercent: 100,
            },
            {
              id: 'stu_step6_2',
              tenantId: snap.account.id,
              facilityId: snap.currentBranchId,
              businessId: snap.currentBusinessId,
              branchId: snap.currentBranchId,
              fullName: 'Ines Mansouri',
              attendanceRatePercent: 100,
            },
          ];
    if (!snap.eduCohorts.length) snap.eduCohorts = [cohort];
    if (!snap.eduSessions.length) snap.eduSessions = [session];
    if (snap.eduStudents.length < 2) snap.eduStudents = students;

    snap.eduAttendance = [];
    snap.eduQuickAttendance = [];
    atriumActions.importDatabase(JSON.stringify(snap));

    atriumActions.batchRecordAttendance(session.id, cohort.id, [
      {
        studentId: students[0].id,
        studentName: students[0].fullName,
        status: 'Present',
        reason: 'Initial roll call',
      },
      {
        studentId: students[1].id,
        studentName: students[1].fullName,
        status: 'Absent',
        reason: 'Initial roll call',
      },
    ]);

    const afterSave = JSON.parse(atriumActions.exportDatabase());
    const sessionAtt = afterSave.eduAttendance.filter((a: any) => a.sessionId === session.id);
    expect(sessionAtt).toHaveLength(2);
    expect(
      sessionAtt.every((a: any) => a.isLocked === true && Boolean(a.markedBy) && Boolean(a.markedAt))
    ).toBe(true);

    // Unlock session with PIN-verified audit reason
    atriumActions.unlockEduSessionAttendance(session.id, 'Student arrived late with medical excuse');
    const afterUnlock = JSON.parse(atriumActions.exportDatabase());
    const unlockedRows = afterUnlock.eduAttendance.filter((a: any) => a.sessionId === session.id);
    expect(unlockedRows.every((a: any) => a.isLocked === false)).toBe(true);
    expect(unlockedRows[0].changeHistory[0].reason).toContain(
      'Unlocked: Student arrived late with medical excuse'
    );

    // Re-save student[1] from Absent -> Late and verify changeHistory transition
    atriumActions.batchRecordAttendance(session.id, cohort.id, [
      {
        studentId: students[0].id,
        studentName: students[0].fullName,
        status: 'Present',
      },
      {
        studentId: students[1].id,
        studentName: students[1].fullName,
        status: 'Late',
        reason: 'Arrived 10m late with note',
      },
    ]);

    const afterResave = JSON.parse(atriumActions.exportDatabase());
    const student2Att = afterResave.eduAttendance.find(
      (a: any) => a.sessionId === session.id && a.studentId === students[1].id
    );
    expect(student2Att.isLocked).toBe(true);
    expect(student2Att.status).toBe('Late');
    const transition = student2Att.changeHistory.find(
      (h: any) => h.previousStatus === 'Absent' && h.newStatus === 'Late'
    );
    expect(transition).toBeDefined();
    expect(transition.reason).toBe('Arrived 10m late with note');
  });

  it('1.3: updateSalonChairStation normalizes IDs, persists ISO startTime + centimes price, ticks elapsed min, and supports undo', async () => {
    const initSnap = JSON.parse(atriumActions.exportDatabase());
    const salonBiz = initSnap.businesses.find((b: any) => b.category === 'appointment_service');
    if (salonBiz) atriumActions.switchBusiness(salonBiz.id);
    const activeBizId = salonBiz?.id || initSnap.currentBusinessId;

    const startedAt = new Date(Date.now() - 19 * 60 * 1000).toISOString();
    expect(computeElapsedMinutesFromIso(startedAt)).toBeGreaterThanOrEqual(19);

    atriumActions.updateSalonChairStation({
      workstationId: 'ws_1',
      workstationName: 'Chair 01',
      clientName: 'Yasmine Boudjema',
      currentStylistId: 'stf_1',
      currentStylistName: 'Meriem',
      serviceName: 'Brushing & Soin',
      servicePriceDzd: 3500,
      servicePriceCentimes: dzdToCentimes(3500),
      stage: 'in_progress',
      startTime: startedAt,
      elapsedMinutes: 19,
    });

    // Updating via canonical UUID updates the same workstation entry (no duplicate ws_1 vs UUID)
    const canonicalWsUuid = clientModule.toValidUuid('ws_1');
    atriumActions.updateSalonChairStation({
      workstationId: canonicalWsUuid,
      workstationName: 'Chair 01',
      clientName: 'Yasmine Boudjema',
      currentStylistId: 'stf_1',
      currentStylistName: 'Meriem',
      serviceName: 'Brushing & Soin',
      servicePriceCentimes: dzdToCentimes(3500),
      stage: 'completed',
      startTime: startedAt,
      elapsedMinutes: 20,
    });

    const snap = JSON.parse(atriumActions.exportDatabase());
    const matching = (snap.salonChairStations || []).filter(
      (st: any) =>
        st.workstationId === 'ws_1' ||
        clientModule.toValidUuid(st.workstationId) === canonicalWsUuid
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].stage).toBe('completed');
    expect(matching[0].servicePriceCentimes).toBe(350000);
    expect(matching[0].servicePriceDzd).toBe(3500);

    // Undo restores previous 'in_progress' stage
    const undone = await undoLatestForBranch(activeBizId, snap.currentBranchId);
    expect(undone).toBe(true);
    const afterUndo = JSON.parse(atriumActions.exportDatabase());
    const reverted = (afterUndo.salonChairStations || []).find(
      (st: any) =>
        st.workstationId === 'ws_1' ||
        clientModule.toValidUuid(st.workstationId) === canonicalWsUuid
    );
    expect(reverted.stage).toBe('in_progress');
  });

  it('1.4: manages POS cash sessions, centimes movements, >500 DA negative variance PIN threshold, offline provisional Z, drift detection, and reprint count', async () => {
    const initSnap = JSON.parse(atriumActions.exportDatabase());
    const posBiz = initSnap.businesses.find((b: any) => b.category === 'pos_inventory');
    if (posBiz) atriumActions.switchBusiness(posBiz.id);
    const session = atriumActions.openPosCashSession({
      openingFloatCentimes: dzdToCentimes(15000),
      notes: 'Morning float',
    });
    expect(session.status).toBe('open');
    expect(session.openingFloatCentimes).toBe(1500000);

    const mv = atriumActions.addPosCashMovement({
      sessionId: session.id,
      payee: 'Milk Supplier',
      category: 'Supplies',
      paymentMethod: 'Cash',
      direction: 'out',
      amountCentimes: dzdToCentimes(1200),
    });
    expect(mv.amountCentimes).toBe(120000);

    expect(requiresVarianceManagerPin(-50000)).toBe(false);
    expect(requiresVarianceManagerPin(-50001)).toBe(true);

    // Offline close creates provisional Z-report (zNumber: null) without fabricating a sequence
    vi.spyOn(clientModule, 'isSupabaseConfigured').mockReturnValue(true);
    atriumActions.setNetworkMode('offline');

    const provisionalReport = await atriumActions.closePosCashSessionAndIssueZReport({
      sessionId: session.id,
      actualCashCentimes: dzdToCentimes(13000),
      variancePinVerified: true,
      varianceVerifiedByStaffId: 'mgr_1',
    });
    expect(provisionalReport.status).toBe('provisional_pending_sync');
    expect(provisionalReport.zNumber).toBeNull();
    expect(provisionalReport.localCloseRef).toMatch(/^ZLOC-/);
    expect(provisionalReport.variancePinVerified).toBe(true);

    // Simulate a hidden cash sale arriving for that closed date before reconnect finalization -> drift detected
    const snap = JSON.parse(atriumActions.exportDatabase());
    snap.sales.unshift({
      id: 'sale_drift_probe_1',
      tenantId: snap.account.id,
      facilityId: snap.currentBranchId,
      branchId: snap.currentBranchId,
      totalAmount: 500,
      paymentMethod: 'Cash',
      status: 'Completed',
      items: [{ productId: 'p1', productName: 'Espresso', quantity: 1, unitPrice: 500 }],
      createdAt: `${provisionalReport.businessDate}T14:00:00.000Z`,
    });
    atriumActions.importDatabase(JSON.stringify(snap));

    vi.spyOn(posService, 'upsertZReport').mockResolvedValue({
      success: true,
      zNumber: 'Z-2026-00001',
      status: 'drift_flagged',
    });

    atriumActions.setNetworkMode('online');
    await atriumActions.finalizeProvisionalPosZReports();

    const afterFinalize = JSON.parse(atriumActions.exportDatabase());
    const resolvedReport = afterFinalize.posZReports.find(
      (r: any) => r.id === provisionalReport.id
    );
    expect(resolvedReport.status).toBe('drift_flagged');
    expect(resolvedReport.driftDetected).toBe(true);
    expect(resolvedReport.driftDetails).toContain('cash:');
    expect(resolvedReport.zNumber).toBe('Z-2026-00001');

    // Reprint increments persisted counter
    atriumActions.reprintPosZReport(provisionalReport.id);
    const afterReprint = JSON.parse(atriumActions.exportDatabase());
    const reprintedReport = afterReprint.posZReports.find(
      (r: any) => r.id === provisionalReport.id
    );
    expect(reprintedReport.reprintedCount).toBe(1);
  });

  it('1.5: supports sequential partial refunds with quantity clamping, stock restoration, status progression, and undo reversal', async () => {
    const initSnap = JSON.parse(atriumActions.exportDatabase());
    const posBiz = initSnap.businesses.find((b: any) => b.category === 'pos_inventory');
    if (posBiz) atriumActions.switchBusiness(posBiz.id);
    const snap = JSON.parse(atriumActions.exportDatabase());
    let prod = snap.products[0];
    if (!prod) {
      prod = {
        id: 'prod_step6_refund_1',
        tenantId: snap.account.id,
        facilityId: snap.currentBranchId,
        businessId: snap.currentBusinessId,
        branchId: snap.currentBranchId,
        name: 'Espresso Arabica 250g',
        description: 'Packet 250g',
        price: { amount: 950, currency: 'DZD' },
        cost: { amount: 600, currency: 'DZD' },
        stockQuantity: 10,
        sku: 'POS-ESP-250',
        category: 'Coffee',
        reorderLevel: 2,
        isActive: true,
      };
      snap.products = [prod];
    }
    const startingStock = prod.stockQuantity;

    const testSale = {
      id: 'sale_pos_partial_999',
      tenantId: snap.account.id,
      facilityId: snap.currentBranchId,
      branchId: snap.currentBranchId,
      totalAmount: prod.price.amount * 3,
      paymentMethod: 'Cash',
      status: 'Completed',
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 3,
          unitPrice: prod.price.amount,
        },
      ],
      createdAt: '2026-11-26T10:00:00.000Z',
    };
    snap.sales.unshift(testSale);
    atriumActions.importDatabase(JSON.stringify(snap));

    // 1st partial refund: 1 of 3 items
    atriumActions.refundSale(testSale.id, 'Damaged cap', [
      { productId: prod.id, productName: prod.name, quantity: 1 },
    ]);

    let midSnap = JSON.parse(atriumActions.exportDatabase());
    expect(midSnap.products.find((p: any) => p.id === prod.id).stockQuantity).toBe(
      startingStock + 1
    );
    let midSale = midSnap.sales.find((s: any) => s.id === testSale.id);
    expect(midSale.status).toBe('Completed');
    expect(midSale.refundedItems).toEqual([
      { productId: prod.id, productName: prod.name, quantity: 1 },
    ]);

    // 2nd partial refund requests excessive quantity (99) -> clamped to remaining 2 -> sale becomes Refunded
    atriumActions.refundSale(testSale.id, 'Customer returned rest', [
      { productId: prod.id, productName: prod.name, quantity: 99 },
    ]);

    const finalSnap = JSON.parse(atriumActions.exportDatabase());
    expect(finalSnap.products.find((p: any) => p.id === prod.id).stockQuantity).toBe(
      startingStock + 3
    );
    const finalSale = finalSnap.sales.find((s: any) => s.id === testSale.id);
    expect(finalSale.status).toBe('Refunded');
    expect(finalSale.refundedItems).toEqual([
      { productId: prod.id, productName: prod.name, quantity: 3 },
    ]);

    // Undo reverts the second partial refund cleanly
    const undone = await undoLatestForBranch(
      finalSnap.currentBusinessId,
      finalSnap.currentBranchId
    );
    expect(undone).toBe(true);
    const revertedSnap = JSON.parse(atriumActions.exportDatabase());
    expect(revertedSnap.products.find((p: any) => p.id === prod.id).stockQuantity).toBe(
      startingStock + 1
    );
    expect(revertedSnap.sales.find((s: any) => s.id === testSale.id).status).toBe('Completed');
  });

  it('Step 7a: executes read-only payroll dry-run inspection with zero DB writes, Gate 4 hold, collision & CCP/RIB checks, and JSON/CSV export', () => {
    const mockStorage: Record<string, string> = {
      atrium_staff_attendance_logs_v1: JSON.stringify([
        {
          id: 'att_leg_1',
          businessId: 'biz_1',
          branchId: 'br_1',
          staffId: 'stf_1',
          staffName: 'Karim Benali',
          date: '2026-11-10',
          type: 'check_in',
          method: 'manual',
          timestamp: '2026-11-10T08:05:00Z',
        },
      ]),
      atrium_staff_salary_advances_v1: JSON.stringify([
        {
          id: 'adv_leg_1',
          businessId: 'biz_1',
          branchId: 'br_1',
          voucherNumber: 'AV-001',
          staffId: 'stf_1',
          staffName: 'Karim Benali',
          amountDzd: 12000,
          paymentMethod: 'cash',
          status: 'approved',
          issueDate: '2026-11-12',
        },
      ]),
      atrium_staff_payroll_runs_v1: JSON.stringify([
        {
          id: 'run_leg_nov',
          businessId: 'biz_1',
          branchId: 'br_1',
          title: 'Paie Novembre Local',
          periodYear: 2026,
          periodMonth: 11,
          periodLabel: '2026-11',
          status: 'validated',
          slipsCount: 1,
          totalBaseSalary: 60000,
          totalGrossCotisable: 65000,
          totalCnasSalarial: 5850,
          totalCnasEmployer: 16900,
          totalIrg: 4500,
          totalAdvancesDeducted: 12000,
          totalNet: 42650,
          createdAt: '2026-11-25T10:00:00Z',
        },
      ]),
      atrium_staff_payroll_slips_v1: JSON.stringify([
        {
          id: 'slip_leg_nov_1',
          businessId: 'biz_1',
          branchId: 'br_1',
          runId: 'run_leg_nov',
          staffId: 'stf_1',
          staffFullName: 'Karim Benali',
          staffRole: 'Coach',
          periodLabel: '2026-11',
          paymentMethod: 'ccp',
          ccpNumber: '',
          ccpKey: '',
          baseSalaryDzd: 60000,
          grossCotisableDzd: 65000,
          cnasSalarialDzd: 5850,
          irgTaxDzd: 4500,
          netAPayerDzd: 42650,
          grossCotisable: 65000,
          cnasSalarial: 5850,
          irgTax: 4500,
          netAPayer: 42650,
          isPaid: false,
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
            fullName: 'Karim Benali',
            role: 'Coach',
            paymentMethod: 'ccp',
            ccpNumber: '',
            ccpKey: '',
          } as any,
        ],
        attendanceLogs: [],
        salaryAdvances: [],
        payrollRuns: [
          {
            id: 'run_remote_nov',
            businessId: 'biz_1',
            branchId: 'br_1',
            title: 'Paie Novembre Serveur',
            periodYear: 2026,
            periodMonth: 11,
            periodLabel: '2026-11',
            status: 'paid',
            slipsCount: 1,
            totalBaseSalary: 60000,
            totalGrossCotisable: 65000,
            totalCnasSalarial: 5850,
            totalCnasEmployer: 16900,
            totalIrg: 4500,
            totalAdvancesDeducted: 0,
            totalNet: 54650,
            createdAt: '2026-11-26T08:00:00Z',
          } as any,
        ],
        payrollSlips: [],
      },
      (key) => mockStorage[key] ?? null
    );

    expect(report.isReadOnlyDryRun).toBe(true);
    expect(report.dbWritesExecuted).toBe(0);
    expect(report.gateStatus).toBe('AWAITING_GATE_4_APPROVAL');
    expect(report.statutoryBasisBadge).toBe('Rates not verified (legacy basis)');
    expect(getOfflineQueueCount()).toBe(0);

    // Deterministic UUID mapping matches client.ts helper
    expect(
      report.uuidMappings.find((m) => m.legacyId === 'run_leg_nov')?.mappedUuid
    ).toBe(deterministicLegacyUuid('run_leg_nov'));

    // Period collision detected (two distinct run IDs on 2026-11 regular#0)
    expect(report.periodCollisions).toHaveLength(1);
    expect(report.periodCollisions[0].periodYear).toBe(2026);
    expect(report.periodCollisions[0].periodMonth).toBe(11);

    // Missing CCP credentials flagged on staff + slip
    expect(report.missingAccountWarnings.length).toBeGreaterThanOrEqual(2);
    expect(report.hasBlockersOrWarnings).toBe(true);

    const exportedJson = JSON.parse(exportPayrollDryRunJson(report));
    expect(exportedJson.dbWritesExecuted).toBe(0);
    expect(exportedJson.gateStatus).toBe('AWAITING_GATE_4_APPROVAL');

    const exportedCsv = exportPayrollDryRunCsv(report);
    expect(exportedCsv).toContain('Rates not verified (legacy basis)');
    expect(exportedCsv).toContain('period_collision');
    expect(exportedCsv).toContain('missing_ccp_rib');
  });
});
