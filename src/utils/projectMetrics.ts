import type {
  PMProject,
  PMExpense,
  PMMission,
  PMAttendance,
  PMPayrollBatch,
} from '../types/index';

export interface ProjectClientProfitabilityRow {
  clientName: string;
  revenueDzd: number;
  pctShare: number;
  marginPct: number;
}

export interface ProjectExpenseBreakdownRow {
  categoryKey: string;
  amountDzd: number;
  pctShare: number;
}

export interface ProjectDirectionAuditSummary {
  year: number;
  availableYears: number[];
  hasData: boolean;
  totalRevenueDzd: number;
  totalExpensesDzd: number;
  totalPayrollDzd: number;
  avgMarginPct: number;
  closedMissionsCount: number;
  activeWilayasCount: number;
  attendanceCompliancePct: number;
  avgMissionRating: number;
  clientProfitability: ProjectClientProfitabilityRow[];
  expenseBreakdown: ProjectExpenseBreakdownRow[];
}

export interface SuperviseurSlaSummary {
  totalMissions: number;
  closedMissionsCount: number;
  activeWilayasCount: number;
  closureCompliancePct: number;
  hasData: boolean;
}

function extractYear(isoDate?: string | null): number | null {
  if (!isoDate) return null;
  const m = String(isoDate).match(/^(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) && y >= 2000 && y <= 2100 ? y : null;
}

export function computeAvailableAuditYears(
  projects: PMProject[],
  expenses: PMExpense[],
  missions: PMMission[],
  batches: PMPayrollBatch[],
  fallbackYear = new Date().getFullYear()
): number[] {
  const years = new Set<number>();
  projects.forEach((p) => {
    const y = extractYear(p.startDate) ?? extractYear(p.createdAt);
    if (y) years.add(y);
  });
  expenses.forEach((e) => {
    const y = extractYear(e.createdAt);
    if (y) years.add(y);
  });
  missions.forEach((m) => {
    const y = extractYear(m.startDate) ?? extractYear(m.createdAt);
    if (y) years.add(y);
  });
  batches.forEach((b) => {
    const y = extractYear(b.disbursedAt) ?? extractYear(b.createdAt);
    if (y) years.add(y);
  });
  if (years.size === 0) years.add(fallbackYear);
  return Array.from(years).sort((a, b) => b - a);
}

export function computeDirectionFinancialAudit(params: {
  projects: PMProject[];
  expenses: PMExpense[];
  missions: PMMission[];
  attendances: PMAttendance[];
  payrollBatches: PMPayrollBatch[];
  selectedYear: number;
}): ProjectDirectionAuditSummary {
  const { projects, expenses, missions, attendances, payrollBatches, selectedYear } = params;
  const availableYears = computeAvailableAuditYears(
    projects,
    expenses,
    missions,
    payrollBatches,
    selectedYear
  );

  const yearProjects = projects.filter((p) => {
    const y = extractYear(p.startDate) ?? extractYear(p.createdAt);
    return y === selectedYear;
  });
  const yearExpenses = expenses.filter((e) => extractYear(e.createdAt) === selectedYear);
  const yearMissions = missions.filter((m) => {
    const y = extractYear(m.startDate) ?? extractYear(m.createdAt);
    return y === selectedYear;
  });
  const yearMissionIds = new Set(yearMissions.map((m) => m.id));
  const yearAttendances = attendances.filter(
    (a) => extractYear(a.date) === selectedYear || yearMissionIds.has(a.missionId)
  );
  const yearBatches = payrollBatches.filter((b) => {
    const y = extractYear(b.disbursedAt) ?? extractYear(b.createdAt);
    return y === selectedYear;
  });

  const totalRevenueDzd = yearProjects.reduce((sum, p) => sum + Number(p.budgetCapDzd || 0), 0);

  const activeExpenses = yearExpenses.filter((e) => e.status !== 'rejected');
  const totalExpensesDzd = activeExpenses.reduce((sum, e) => sum + Number(e.amountDzd || 0), 0);

  const totalPayrollDzd =
    yearBatches.length > 0
      ? yearBatches.reduce((sum, b) => sum + Number(b.totalAmountDzd || 0), 0)
      : yearAttendances.reduce((sum, a) => sum + Number(a.grossPayableDzd || 0), 0);

  const totalCostDzd = totalExpensesDzd + totalPayrollDzd;
  const avgMarginPct =
    totalRevenueDzd > 0
      ? Math.round(((totalRevenueDzd - totalCostDzd) / totalRevenueDzd) * 1000) / 10
      : 0;

  const closedMissionsCount = yearMissions.filter((m) => m.status === 'completed').length;
  const activeWilayasCount = new Set(
    yearMissions.map((m) => m.wilayaCode).filter((c) => Boolean(c))
  ).size;

  const lockedOrClosedAttendances = yearAttendances.filter((a) => a.isLocked).length;
  const attendanceCompliancePct =
    yearAttendances.length > 0
      ? Math.round((lockedOrClosedAttendances / yearAttendances.length) * 1000) / 10
      : yearMissions.length > 0
      ? Math.round((closedMissionsCount / yearMissions.length) * 1000) / 10
      : 0;

  const ratedAttendances = yearAttendances.filter((a) => Number(a.shiftRating || 0) > 0);
  const avgMissionRating =
    ratedAttendances.length > 0
      ? Math.round(
          (ratedAttendances.reduce((s, a) => s + Number(a.shiftRating || 0), 0) /
            ratedAttendances.length) *
            10
        ) / 10
      : 0;

  const clientMap = new Map<string, { revenue: number; costs: number }>();
  const projectById = new Map(yearProjects.map((p) => [p.id, p]));

  yearProjects.forEach((p) => {
    const key = p.clientName || 'Client';
    const cur = clientMap.get(key) || { revenue: 0, costs: 0 };
    cur.revenue += Number(p.budgetCapDzd || 0);
    clientMap.set(key, cur);
  });

  activeExpenses.forEach((e) => {
    const proj = projectById.get(e.projectId);
    if (!proj) return;
    const key = proj.clientName || 'Client';
    const cur = clientMap.get(key) || { revenue: 0, costs: 0 };
    cur.costs += Number(e.amountDzd || 0);
    clientMap.set(key, cur);
  });

  const clientProfitability: ProjectClientProfitabilityRow[] = Array.from(clientMap.entries())
    .map(([clientName, agg]) => ({
      clientName,
      revenueDzd: agg.revenue,
      pctShare: totalRevenueDzd > 0 ? Math.round((agg.revenue / totalRevenueDzd) * 100) : 0,
      marginPct:
        agg.revenue > 0
          ? Math.round(((agg.revenue - agg.costs) / agg.revenue) * 100)
          : 0,
    }))
    .sort((a, b) => b.revenueDzd - a.revenueDzd)
    .slice(0, 6);

  const expenseCategories = new Map<string, number>();
  if (totalPayrollDzd > 0) {
    expenseCategories.set('payroll_ccp', totalPayrollDzd);
  }
  activeExpenses.forEach((e) => {
    const cat = e.category || 'materials';
    expenseCategories.set(cat, (expenseCategories.get(cat) || 0) + Number(e.amountDzd || 0));
  });

  const grandSpend = totalPayrollDzd + totalExpensesDzd;
  const expenseBreakdown: ProjectExpenseBreakdownRow[] = Array.from(expenseCategories.entries())
    .map(([categoryKey, amountDzd]) => ({
      categoryKey,
      amountDzd,
      pctShare: grandSpend > 0 ? Math.round((amountDzd / grandSpend) * 100) : 0,
    }))
    .sort((a, b) => b.amountDzd - a.amountDzd);

  const hasData =
    yearProjects.length > 0 ||
    yearExpenses.length > 0 ||
    yearMissions.length > 0 ||
    yearBatches.length > 0;

  return {
    year: selectedYear,
    availableYears,
    hasData,
    totalRevenueDzd,
    totalExpensesDzd,
    totalPayrollDzd,
    avgMarginPct,
    closedMissionsCount,
    activeWilayasCount,
    attendanceCompliancePct,
    avgMissionRating,
    clientProfitability,
    expenseBreakdown,
  };
}

export function computeSuperviseurSlaSummary(
  missions: PMMission[],
  attendances: PMAttendance[]
): SuperviseurSlaSummary {
  const nonCancelled = missions.filter((m) => m.status !== 'cancelled');
  const closedMissionsCount = nonCancelled.filter((m) => m.status === 'completed').length;
  const activeWilayasCount = new Set(
    nonCancelled.map((m) => m.wilayaCode).filter((c) => Boolean(c))
  ).size;

  let closureCompliancePct = 0;
  if (attendances.length > 0) {
    const lockedCount = attendances.filter((a) => a.isLocked).length;
    closureCompliancePct = Math.round((lockedCount / attendances.length) * 1000) / 10;
  } else if (nonCancelled.length > 0) {
    closureCompliancePct = Math.round((closedMissionsCount / nonCancelled.length) * 1000) / 10;
  }

  return {
    totalMissions: nonCancelled.length,
    closedMissionsCount,
    activeWilayasCount,
    closureCompliancePct,
    hasData: nonCancelled.length > 0 || attendances.length > 0,
  };
}
