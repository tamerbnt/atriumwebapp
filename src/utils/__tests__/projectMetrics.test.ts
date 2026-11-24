import { describe, it, expect } from 'vitest';
import {
  computeAvailableAuditYears,
  computeDirectionFinancialAudit,
  computeSuperviseurSlaSummary,
} from '../projectMetrics';
import type {
  PMProject,
  PMExpense,
  PMMission,
  PMAttendance,
  PMPayrollBatch,
} from '../../types/index';

describe('projectMetrics.ts — real data financial audit & SLA summaries', () => {
  it('returns zero metrics and hasData=false when tenant has no projects, expenses, missions, or batches', () => {
    const summary = computeDirectionFinancialAudit({
      projects: [],
      expenses: [],
      missions: [],
      attendances: [],
      payrollBatches: [],
      selectedYear: 2026,
    });

    expect(summary.hasData).toBe(false);
    expect(summary.totalRevenueDzd).toBe(0);
    expect(summary.totalExpensesDzd).toBe(0);
    expect(summary.totalPayrollDzd).toBe(0);
    expect(summary.avgMarginPct).toBe(0);
    expect(summary.closedMissionsCount).toBe(0);
    expect(summary.activeWilayasCount).toBe(0);
    expect(summary.attendanceCompliancePct).toBe(0);
    expect(summary.avgMissionRating).toBe(0);
    expect(summary.clientProfitability).toEqual([]);
    expect(summary.expenseBreakdown).toEqual([]);
    expect(summary.availableYears).toEqual([2026]);
  });

  it('computes sorted available audit years from records', () => {
    const years = computeAvailableAuditYears(
      [{ startDate: '2025-03-01' } as unknown as PMProject],
      [{ createdAt: '2026-01-15T10:00:00Z' } as unknown as PMExpense],
      [{ startDate: '2024-11-01' } as unknown as PMMission],
      [{ disbursedAt: '2026-02-28', createdAt: '2026-02-28' } as unknown as PMPayrollBatch],
      2026
    );
    expect(years).toEqual([2026, 2025, 2024]);
  });

  it('aggregates revenue, excludes rejected expenses, and computes margins and wilaya coverage accurately', () => {
    const projects = [
      {
        id: 'proj_1',
        tenantId: 't1',
        branchId: 'b1',
        title: 'Salon Agro',
        clientName: 'Sonatrach',
        budgetCapDzd: 1_000_000,
        startDate: '2026-02-01',
        status: 'active',
        createdAt: '2026-01-20T00:00:00Z',
        updatedAt: '2026-01-20T00:00:00Z',
      },
      {
        id: 'proj_2',
        tenantId: 't1',
        branchId: 'b1',
        title: 'Campagne Oran',
        clientName: 'Cevital',
        budgetCapDzd: 500_000,
        startDate: '2026-04-01',
        status: 'active',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-20T00:00:00Z',
      },
    ] as unknown as PMProject[];

    const expenses = [
      {
        id: 'exp_1',
        projectId: 'proj_1',
        amountDzd: 200_000,
        category: 'logistics',
        status: 'approved',
        createdAt: '2026-02-10T00:00:00Z',
      },
      {
        id: 'exp_rejected',
        projectId: 'proj_1',
        amountDzd: 999_000,
        category: 'logistics',
        status: 'rejected',
        createdAt: '2026-02-11T00:00:00Z',
      },
    ] as unknown as PMExpense[];

    const missions = [
      {
        id: 'mis_1',
        projectId: 'proj_1',
        wilayaCode: '16',
        status: 'completed',
        startDate: '2026-02-05',
      },
      {
        id: 'mis_2',
        projectId: 'proj_2',
        wilayaCode: '31',
        status: 'in_progress',
        startDate: '2026-04-05',
      },
    ] as unknown as PMMission[];

    const attendances = [
      {
        id: 'att_1',
        missionId: 'mis_1',
        date: '2026-02-05',
        isLocked: true,
        shiftRating: 5,
        grossPayableDzd: 100_000,
      },
      {
        id: 'att_2',
        missionId: 'mis_2',
        date: '2026-04-05',
        isLocked: false,
        shiftRating: 4,
        grossPayableDzd: 50_000,
      },
    ] as unknown as PMAttendance[];

    const payrollBatches = [
      {
        id: 'bat_1',
        disbursedAt: '2026-04-30',
        totalAmountDzd: 300_000,
        createdAt: '2026-04-30T00:00:00Z',
      },
    ] as unknown as PMPayrollBatch[];

    const summary = computeDirectionFinancialAudit({
      projects,
      expenses,
      missions,
      attendances,
      payrollBatches,
      selectedYear: 2026,
    });

    expect(summary.hasData).toBe(true);
    expect(summary.totalRevenueDzd).toBe(1_500_000);
    expect(summary.totalExpensesDzd).toBe(200_000);
    expect(summary.totalPayrollDzd).toBe(300_000);
    // Margin: (1_500_000 - 500_000) / 1_500_000 = 66.7%
    expect(summary.avgMarginPct).toBe(66.7);
    expect(summary.closedMissionsCount).toBe(1);
    expect(summary.activeWilayasCount).toBe(2);
    expect(summary.attendanceCompliancePct).toBe(50);
    expect(summary.avgMissionRating).toBe(4.5);
    expect(summary.clientProfitability[0]).toEqual({
      clientName: 'Sonatrach',
      revenueDzd: 1_000_000,
      pctShare: 67,
      marginPct: 80,
    });
    expect(summary.expenseBreakdown[0]).toEqual({
      categoryKey: 'payroll_ccp',
      amountDzd: 300_000,
      pctShare: 60,
    });
  });

  it('computes superviseur SLA summary excluding cancelled missions', () => {
    const sla = computeSuperviseurSlaSummary(
      [
        { id: 'm1', wilayaCode: '16', status: 'completed' },
        { id: 'm2', wilayaCode: '31', status: 'in_progress' },
        { id: 'm3', wilayaCode: '25', status: 'cancelled' },
      ] as unknown as PMMission[],
      [
        { id: 'a1', isLocked: true },
        { id: 'a2', isLocked: false },
      ] as unknown as PMAttendance[]
    );
    expect(sla.totalMissions).toBe(2);
    expect(sla.closedMissionsCount).toBe(1);
    expect(sla.activeWilayasCount).toBe(2);
    expect(sla.closureCompliancePct).toBe(50);
    expect(sla.hasData).toBe(true);
  });
});
