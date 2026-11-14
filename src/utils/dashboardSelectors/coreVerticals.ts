import type {
  Appointment,
  B2bClient,
  CommercialDocument,
  EduAdmissionLead,
  EduAttendance,
  EduCertificate,
  EduCohort,
  EduEnrollment,
  EduGrade,
  EduStudent,
  FreelanceClient,
  FreelanceExpense,
  FreelanceInvoice,
  FreelanceProject,
  FreelanceProposal,
  Member,
  MemberCheckInLog,
  PMExpense,
  PMMilestone,
  PMPayrollBatch,
  PMProject,
  Product,
  PurchaseDocument,
  RegistrationLead,
  RentableUnit,
  RentalBooking,
  Sale,
  SalonWorkstation,
  SecurityDepositRecord,
  ServiceItem,
  StaffMember,
  SupportedLanguage,
  TimeLogEntry,
  WarehouseDepot,
} from '../../types/index';
import type {
  AreaPoint,
  BubbleGroup,
  BubblePoint,
  BulletItem,
  CohortRow,
  DonutSegment,
  DumbbellItem,
  FunnelStage,
  GaugeMetric,
  HistogramBin,
  RankedItem,
  SparkPoint,
  StackedBucket,
  TimelineBlock,
  TimelineResource,
  TreemapItem,
  WaterfallStep,
} from '@/atrium';
import {
  buildDailySparkSeries,
  buildHourlyWeekdayMatrix,
  buildPeriodRateSeries,
  computeDeltaPercent,
  DAY_MS,
  filterByPeriod,
  getPeriodBuckets,
  getPeriodRange,
  parseIsoDay,
  pickText,
  type DashboardPeriodKey,
} from './common';

const PALETTE = ['#d4522f', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b655f'];

function parseClockToHour(clock?: string): number | null {
  if (!clock || typeof clock !== 'string') return null;
  const [hStr, mStr] = clock.split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (!Number.isFinite(h) || h < 0 || h > 23) return null;
  return h + (Number.isFinite(m) ? m / 60 : 0);
}

/* ============================================================================
 * 1. GYM & FITNESS (membership_session)
 * ============================================================================ */
export interface MembershipDashboardInput {
  members: Member[];
  checkIns: MemberCheckInLog[];
  sales: Sale[];
  leads: RegistrationLead[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectMembershipDashboard(input: MembershipDashboardInput) {
  const { members, checkIns, sales, leads, period, language, anchorDate = new Date() } = input;
  const nowMs = anchorDate.getTime();
  const activeMembers = members.filter((m) => m.status === 'Active');

  const expiringMembers = activeMembers.filter((m) => {
    const exp = parseIsoDay(m.expirationDate);
    if (!exp) return false;
    const days = Math.ceil((exp.getTime() - nowMs) / DAY_MS);
    return days >= 0 && days <= 14;
  });

  const inactiveRisk = members.filter((m) => m.status === 'Expired' || m.status === 'Frozen').length;
  const churnRiskCount = expiringMembers.length + inactiveRisk;
  const churnRiskRate = members.length > 0 ? Math.round((churnRiskCount / members.length) * 1000) / 10 : 0;

  const recentWindowMs = nowMs - 2 * 3600 * 1000;
  const recentCheckIns = checkIns.filter((c) => {
    const d = parseIsoDay(c.timestamp);
    return d ? d.getTime() >= recentWindowMs && d.getTime() <= nowMs : false;
  }).length;
  const floorOccupied = recentCheckIns;
  const totalCapacity = activeMembers.length > 0 ? Math.max(40, recentCheckIns) : 0;

  const validSales = sales.filter((s) => s.status !== 'Voided' && s.status !== 'Refunded');
  const revenueStats = buildDailySparkSeries(
    validSales,
    (s) => s.createdAt,
    (s) => s.totalAmount || 0,
    period,
    language,
    anchorDate
  );

  const windowCheckIns = filterByPeriod(checkIns, (c) => c.timestamp, period, anchorDate);
  const heatmap = buildHourlyWeekdayMatrix(windowCheckIns, (c) => c.timestamp, language);

  const pendingLeads = leads.filter((l) => l.status === 'Pending').length;
  const approvedLeads = leads.filter((l) => l.status === 'Approved').length;
  const funnelStages: FunnelStage[] =
    leads.length > 0 || members.length > 0
      ? [
          { id: 'prospects', label: pickText(language, 'Prospects reçus', 'Leads Received', 'الطلبات الواردة'), value: leads.length },
          { id: 'pending', label: pickText(language, 'En validation', 'Pending Review', 'قيد المراجعة'), value: pendingLeads + approvedLeads },
          { id: 'approved', label: pickText(language, 'Validés', 'Approved', 'المعتمدة'), value: approvedLeads },
          { id: 'active', label: pickText(language, 'Membres actifs', 'Active Members', 'أعضاء نشطون'), value: activeMembers.length },
        ]
      : [];

  // Cohort retention derived strictly from actual member start/expiration dates
  const monthBuckets = new Map<string, { startMs: number; total: number; retainedByMonth: number[] }>();
  for (const m of members) {
    const start = parseIsoDay(m.startDate || m.createdAt);
    if (!start) continue;
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthBuckets.get(key) || {
      startMs: new Date(start.getFullYear(), start.getMonth(), 1).getTime(),
      total: 0,
      retainedByMonth: [0, 0, 0, 0],
    };
    entry.total += 1;
    const exp = parseIsoDay(m.expirationDate);
    const activeMonths = exp ? Math.max(0, Math.floor((exp.getTime() - start.getTime()) / (30 * DAY_MS))) : 0;
    for (let k = 0; k < 4; k++) {
      if (m.status === 'Active' || activeMonths >= k) {
        entry.retainedByMonth[k] += 1;
      }
    }
    monthBuckets.set(key, entry);
  }
  const cohorts: CohortRow[] = Array.from(monthBuckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-5)
    .map(([label, entry]) => ({
      label,
      values: entry.retainedByMonth.map((c) => Math.round((c / Math.max(1, entry.total)) * 100)),
    }));

  const { range: bucketRange, bucketCount, effectiveStart, bucketMs } = getPeriodBuckets(period, anchorDate);
  const plansBuckets = new Array<number>(bucketCount).fill(0);
  const coachingBuckets = new Array<number>(bucketCount).fill(0);
  for (const sale of validSales) {
    const d = parseIsoDay(sale.createdAt);
    if (!d) continue;
    const ms = d.getTime();
    if (ms < effectiveStart || ms > bucketRange.endMs) continue;
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - effectiveStart) / bucketMs)));
    const items = sale.items || [];
    if (items.length === 0) {
      plansBuckets[idx] += sale.totalAmount || 0;
    } else {
      let saleCoaching = 0;
      let salePlans = 0;
      for (const item of items) {
        const lineAmt = item.totalPrice ?? (item.unitPrice || 0) * (item.quantity || 1);
        if (/coach|pt|perso/i.test(item.productName || '')) {
          saleCoaching += lineAmt;
        } else {
          salePlans += lineAmt;
        }
      }
      const lineSum = saleCoaching + salePlans;
      if (lineSum > 0 && Number.isFinite(sale.totalAmount) && sale.totalAmount !== lineSum) {
        const ratio = sale.totalAmount / lineSum;
        saleCoaching *= ratio;
        salePlans *= ratio;
      }
      plansBuckets[idx] += salePlans;
      coachingBuckets[idx] += saleCoaching;
    }
  }

  const stackedBuckets: StackedBucket[] = revenueStats.series.map((pt, idx) => ({
    label: pt.label,
    values: {
      plans: Math.round(plansBuckets[idx] || 0),
      coaching: Math.round(coachingBuckets[idx] || 0),
    },
  }));

  return {
    activeCount: activeMembers.length,
    totalMembers: members.length,
    revenueTotal: revenueStats.currentTotal,
    revenueDelta: revenueStats.deltaPercent,
    revenueSpark: revenueStats.series,
    churnRiskCount,
    churnRiskRate,
    floorOccupied,
    totalCapacity,
    heatmap,
    funnelStages,
    cohorts,
    stackedBuckets,
    hasSales: sales.length > 0,
    hasMembers: members.length > 0,
    hasCheckIns: heatmap.hasAny,
  };
}

/* ============================================================================
 * 2. SALON, SPA & BEAUTY (appointment_service)
 * ============================================================================ */
export interface AppointmentDashboardInput {
  appointments: Appointment[];
  services: ServiceItem[];
  staff: StaffMember[];
  workstations: SalonWorkstation[];
  sales: Sale[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectAppointmentDashboard(input: AppointmentDashboardInput) {
  const { appointments, services, staff, workstations, sales, period, language, anchorDate = new Date() } = input;
  const range = getPeriodRange(period, anchorDate);

  const windowApts = appointments.filter((a) => {
    const d = parseIsoDay(a.date || a.createdAt);
    return d ? d.getTime() >= range.startMs && d.getTime() <= range.endMs : false;
  });

  const prevApts = appointments.filter((a) => {
    const d = parseIsoDay(a.date || a.createdAt);
    return d ? d.getTime() >= range.prevStartMs && d.getTime() <= range.prevEndMs : false;
  });

  const revenueOfApts = (list: Appointment[]) =>
    list
      .filter((a) => a.status !== 'Cancelled' && a.status !== 'NoShow')
      .reduce((sum, a) => sum + (a.price || 0) + (a.retailProductsTotal || 0), 0);

  const aptSeries = buildDailySparkSeries(
    appointments.filter((a) => a.status !== 'Cancelled' && a.status !== 'NoShow'),
    (a) => a.date || a.createdAt,
    (a) => (a.price || 0) + (a.retailProductsTotal || 0),
    period,
    language,
    anchorDate
  );

  const noShowList = windowApts.filter((a) => a.status === 'NoShow' || a.status === 'Cancelled');
  const prevNoShow = prevApts.filter((a) => a.status === 'NoShow' || a.status === 'Cancelled');
  const noShowRate = windowApts.length > 0 ? Math.round((noShowList.length / windowApts.length) * 1000) / 10 : 0;
  const prevNoShowRate = prevApts.length > 0 ? Math.round((prevNoShow.length / prevApts.length) * 1000) / 10 : 0;
  const noShowSpark = buildPeriodRateSeries(
    appointments,
    (a) => a.date || a.createdAt,
    (a) => a.status === 'NoShow' || a.status === 'Cancelled',
    period,
    language,
    anchorDate
  );

  const occupiedChairs = appointments.filter((a) => a.status === 'InChair').length;
  const totalChairs = workstations.length > 0 ? workstations.length : Math.max(0, staff.filter((s) => s.isActive).length);

  const resources: TimelineResource[] = (staff.length > 0
    ? staff
    : Array.from(new Map(appointments.map((a) => [a.staffId, { id: a.staffId, fullName: a.staffName, role: 'Stylist' }])).values())
  )
    .slice(0, 6)
    .map((s) => ({
      id: s.id,
      label: s.fullName,
      meta: 'role' in s ? String(s.role) : undefined,
    }));

  const blocks: TimelineBlock[] = windowApts
    .filter((a) => a.status !== 'Cancelled')
    .map((a) => {
      const startHour = parseClockToHour(a.startTime) ?? 10;
      const durH = Math.max(0.5, (a.durationMinutes || 45) / 60);
      const endHour = parseClockToHour(a.endTime) ?? Math.min(21, startHour + durH);
      return {
        id: a.id,
        resourceId: a.staffId,
        label: `${a.clientName} · ${a.serviceName}`,
        startHour,
        endHour: Math.max(startHour + 0.5, endHour),
        tone: a.status === 'InChair' ? 'primary' : a.status === 'Completed' ? 'secondary' : 'neutral',
        statusLabel: a.status,
      };
    });

  // Service category donut from booked appointments joined with services
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const catTotals = new Map<string, number>();
  for (const a of windowApts) {
    if (a.status === 'Cancelled') continue;
    const cat = serviceMap.get(a.serviceId)?.category || a.serviceName || 'General';
    catTotals.set(cat, (catTotals.get(cat) || 0) + (a.price || 0));
  }
  const donutSegments: DonutSegment[] = Array.from(catTotals.entries()).map(([label, value], i) => ({
    id: `cat-${i}`,
    label,
    value: Math.round(value),
    color: PALETTE[i % PALETTE.length],
  }));

  // Stacked service vs retail revenue
  const validRetailSales = sales.filter((s) => s.status !== 'Voided' && s.status !== 'Refunded');
  const retailSeries = buildDailySparkSeries(validRetailSales, (s) => s.createdAt, (s) => s.totalAmount || 0, period, language, anchorDate);
  const stackedBuckets: StackedBucket[] = aptSeries.series.map((pt, i) => ({
    label: pt.label,
    values: {
      services: Math.round(pt.value),
      retail: Math.round(retailSeries.series[i]?.value || 0),
    },
  }));

  const combinedRevenueSpark: SparkPoint[] = aptSeries.series.map((pt, i) => {
    const retailPt = retailSeries.series[i];
    return {
      label: pt.label,
      value: Math.round((pt.value + (retailPt?.value || 0)) * 100) / 100,
      previous: Math.round(((pt.previous || 0) + (retailPt?.previous || 0)) * 100) / 100,
    };
  });
  const totalRevenue = revenueOfApts(windowApts) + retailSeries.currentTotal;
  const combinedPrevTotal = aptSeries.previousTotal + retailSeries.previousTotal;

  // Ranked stylists
  const stylistAgg = new Map<string, { label: string; revenue: number; count: number; tips: number }>();
  for (const a of windowApts) {
    if (a.status === 'Cancelled' || a.status === 'NoShow') continue;
    const key = a.staffId || a.staffName;
    const cur = stylistAgg.get(key) || { label: a.staffName, revenue: 0, count: 0, tips: 0 };
    cur.revenue += a.price || 0;
    cur.count += 1;
    cur.tips += a.tipAmount || 0;
    stylistAgg.set(key, cur);
  }
  const rankedStylists: RankedItem[] = Array.from(stylistAgg.entries()).map(([id, item]) => ({
    id,
    label: item.label,
    values: { revenue: item.revenue, bookings: item.count, tips: item.tips },
  }));

  return {
    totalRevenue,
    revenueDelta: computeDeltaPercent(totalRevenue, combinedPrevTotal),
    revenueSpark: combinedRevenueSpark,
    noShowRate,
    noShowDelta: computeDeltaPercent(noShowRate, prevNoShowRate),
    noShowCount: noShowList.length,
    noShowSpark,
    occupiedChairs,
    totalChairs,
    resources,
    blocks,
    donutSegments,
    stackedBuckets,
    rankedStylists,
    hasData: appointments.length > 0 || services.length > 0,
  };
}

/* ============================================================================
 * 3. POS & RETAIL (pos_inventory)
 * ============================================================================ */
export interface PosDashboardInput {
  sales: Sale[];
  products: Product[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectPosDashboard(input: PosDashboardInput) {
  const { sales, products, period, language, anchorDate = new Date() } = input;
  const range = getPeriodRange(period, anchorDate);
  const validSales = sales.filter((s) => s.status !== 'Voided' && s.status !== 'Refunded');

  const windowSales = validSales.filter((s) => {
    const d = parseIsoDay(s.createdAt);
    return d ? d.getTime() >= range.startMs && d.getTime() <= range.endMs : false;
  });

  const salesSeries = buildDailySparkSeries(validSales, (s) => s.createdAt, (s) => s.totalAmount || 0, period, language, anchorDate);
  const lowStockItems = products.filter((p) => (p.stockQuantity ?? 0) <= (p.reorderLevel ?? 5));

  const productCostMap = new Map(products.map((p) => [p.id, p.costPrice ?? p.cost?.amount ?? 0]));
  let grossTotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let cogsTotal = 0;

  const skuAgg = new Map<string, { label: string; revenue: number; qty: number }>();
  for (const sale of windowSales) {
    grossTotal += sale.subtotal ?? sale.totalAmount ?? 0;
    discountTotal += sale.discountAmount ?? sale.discount ?? 0;
    taxTotal += sale.taxAmount ?? 0;
    for (const item of sale.items || []) {
      const unitCost = item.costPrice ?? productCostMap.get(item.productId) ?? 0;
      cogsTotal += unitCost * (item.quantity || 1);
      const cur = skuAgg.get(item.productId || item.productName) || { label: item.productName, revenue: 0, qty: 0 };
      cur.revenue += item.totalPrice || 0;
      cur.qty += item.quantity || 0;
      skuAgg.set(item.productId || item.productName, cur);
    }
  }
  const netMargin = grossTotal - discountTotal - cogsTotal - taxTotal;

  const waterfallSteps: WaterfallStep[] =
    windowSales.length > 0
      ? [
          { id: 'gross', label: pickText(language, 'Ventes brutes', 'Gross Sales', 'إجمالي المبيعات'), value: Math.round(grossTotal), kind: 'total' },
          { id: 'disc', label: pickText(language, 'Remises', 'Discounts', 'التخفيضات'), value: -Math.round(discountTotal), kind: 'delta' },
          { id: 'cogs', label: pickText(language, 'Coût achat', 'COGS', 'التكلفة'), value: -Math.round(cogsTotal), kind: 'delta' },
          { id: 'tax', label: pickText(language, 'Taxes TVA', 'Taxes', 'الضرائب'), value: -Math.round(taxTotal), kind: 'delta' },
          { id: 'net', label: pickText(language, 'Marge nette', 'Net Margin', 'صافي الربح'), value: Math.round(netMargin), kind: 'total' },
        ]
      : [];

  const catValue = new Map<string, number>();
  for (const p of products) {
    const val = (p.stockQuantity || 0) * (p.costPrice ?? p.cost?.amount ?? p.price?.amount ?? 0);
    if (val <= 0) continue;
    catValue.set(p.category || 'General', (catValue.get(p.category || 'General') || 0) + val);
  }
  const treemapItems: TreemapItem[] = Array.from(catValue.entries()).map(([label, value], i) => ({
    id: `pos-cat-${i}`,
    label,
    value: Math.round(value),
    color: PALETTE[i % PALETTE.length],
  }));

  const rankedSkus: RankedItem[] = Array.from(skuAgg.entries()).map(([id, v]) => ({
    id,
    label: v.label,
    values: { revenue: Math.round(v.revenue), units: v.qty },
  }));

  const rushHeatmap = buildHourlyWeekdayMatrix(windowSales, (s) => s.createdAt, language);

  return {
    grossRevenue: salesSeries.currentTotal,
    revenueDelta: salesSeries.deltaPercent,
    revenueSpark: salesSeries.series,
    areaPoints: salesSeries.areaPoints,
    ticketsCount: windowSales.length,
    avgTicket: windowSales.length > 0 ? Math.round(salesSeries.currentTotal / windowSales.length) : 0,
    lowStockCount: lowStockItems.length,
    totalProducts: products.length,
    treemapItems,
    waterfallSteps,
    rankedSkus,
    rushHeatmap,
  };
}

/* ============================================================================
 * 4. PROJECT & CREATIVE AGENCY (project_milestone)
 * ============================================================================ */
export interface ProjectDashboardInput {
  projects: PMProject[];
  milestones: PMMilestone[];
  payrollBatches: PMPayrollBatch[];
  expenses: PMExpense[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectProjectDashboard(input: ProjectDashboardInput) {
  const { projects, milestones, payrollBatches, expenses, period, language, anchorDate = new Date() } = input;
  const windowProjects = filterByPeriod(projects, (p) => p.createdAt || p.startDate, period, anchorDate);
  const windowPayroll = filterByPeriod(payrollBatches, (b) => b.disbursedAt || b.ccpGeneratedAt || b.directionApprovedAt || b.createdAt, period, anchorDate);
  const windowExpenses = filterByPeriod(expenses, (e) => e.directionApprovedAt || e.createdAt, period, anchorDate);
  const windowMilestones = filterByPeriod(milestones, (m) => m.completedAt || m.targetDate, period, anchorDate);

  const totalBudget = windowProjects.reduce((sum, p) => sum + (p.budgetCapDzd || 0), 0);
  const totalPayroll = windowPayroll.reduce((sum, b) => sum + (b.totalAmountDzd || 0), 0);
  const totalExpenses = windowExpenses.filter((e) => e.status !== 'rejected').reduce((sum, e) => sum + (e.amountDzd || 0), 0);
  const netMargin = totalBudget - totalPayroll - totalExpenses;

  const budgetSpark = buildDailySparkSeries(projects, (p) => p.createdAt || p.startDate, (p) => p.budgetCapDzd || 0, period, language, anchorDate);

  const pendingApprovals =
    windowPayroll.filter((b) => b.status === 'pending_direction_approval').length +
    windowExpenses.filter((e) => e.status === 'pending_direction_approval').length;

  const completedMilestones = windowMilestones.filter((m) => m.isCompleted).length;
  const milestoneRate = windowMilestones.length > 0 ? Math.round((completedMilestones / windowMilestones.length) * 100) : 0;

  const spentByProject = new Map<string, number>();
  for (const b of windowPayroll) spentByProject.set(b.projectId, (spentByProject.get(b.projectId) || 0) + (b.totalAmountDzd || 0));
  for (const e of windowExpenses) {
    if (e.status !== 'rejected') spentByProject.set(e.projectId, (spentByProject.get(e.projectId) || 0) + (e.amountDzd || 0));
  }

  const bulletItems: BulletItem[] = windowProjects.slice(0, 5).map((p) => ({
    id: p.id,
    label: p.title,
    value: Math.round(spentByProject.get(p.id) || 0),
    target: Math.round(p.budgetCapDzd || 0),
  }));

  const waterfallSteps: WaterfallStep[] =
    windowProjects.length > 0 || windowPayroll.length > 0 || windowExpenses.length > 0
      ? [
          { id: 'contracts', label: pickText(language, 'Contrats engagés', 'Contract Cap', 'قيمة العقود'), value: Math.round(totalBudget), kind: 'total' },
          { id: 'payroll', label: pickText(language, 'Paies talents', 'Talent Payroll', 'أجور الفريق'), value: -Math.round(totalPayroll), kind: 'delta' },
          { id: 'expenses', label: pickText(language, 'Frais terrain', 'Field Ops', 'مصاريف الميدان'), value: -Math.round(totalExpenses), kind: 'delta' },
          { id: 'margin', label: pickText(language, 'Marge nette', 'Net Margin', 'صافي الهامش'), value: Math.round(netMargin), kind: 'total' },
        ]
      : [];

  const stageCounts = {
    framing: windowProjects.filter((p) => p.status === 'framing').length,
    crea: windowProjects.filter((p) => ['crea_active', 'creative_kv', 'client_validated'].includes(p.status)).length,
    prod: windowProjects.filter((p) => ['print_ready', 'production'].includes(p.status)).length,
    field: windowProjects.filter((p) => ['field_execution', 'field_active'].includes(p.status)).length,
    done: windowProjects.filter((p) => ['completed', 'closed', 'archived'].includes(p.status)).length,
  };
  const pipelineStages: FunnelStage[] =
    windowProjects.length > 0
      ? [
          { id: 'total', label: pickText(language, 'Total portefeuille', 'Portfolio', 'كل المشاريع'), value: windowProjects.length },
          { id: 'crea', label: pickText(language, 'Créa & BAT', 'Creative & Print', 'التصميم والطباعة'), value: stageCounts.crea + stageCounts.prod + stageCounts.field + stageCounts.done },
          { id: 'field', label: pickText(language, 'Terrain actif', 'Field Ops', 'التنفيذ الميداني'), value: stageCounts.field + stageCounts.done },
          { id: 'done', label: pickText(language, 'Clôturés', 'Completed', 'المكتملة'), value: stageCounts.done },
        ]
      : [];

  // Fixed margin ranking comparator (explicit numeric desc sort)
  const rankedProjects: RankedItem[] = [...windowProjects]
    .sort((a, b) => (b.targetGrossMarginPercent || 0) - (a.targetGrossMarginPercent || 0))
    .map((p) => ({
      id: p.id,
      label: p.title,
      values: {
        margin: p.targetGrossMarginPercent || 0,
        budget: p.budgetCapDzd || 0,
      },
    }));

  const gauges: GaugeMetric[] = [
    {
      id: 'milestones',
      label: pickText(language, 'Jalons validés', 'Milestones SLA', 'إنجاز المراحل'),
      value: milestoneRate,
      target: 90,
      targetLabel: '90%',
      unit: '%',
    },
    {
      id: 'margin',
      label: pickText(language, 'Marge globale', 'Portfolio Margin', 'هامش الربح'),
      value: totalBudget > 0 ? Math.max(0, Math.round((netMargin / totalBudget) * 100)) : 0,
      target: 35,
      targetLabel: '35%',
      unit: '%',
    },
  ];

  return {
    totalBudget,
    budgetDelta: budgetSpark.deltaPercent,
    budgetSpark: budgetSpark.series,
    pendingApprovals,
    gauges,
    waterfallSteps,
    pipelineStages,
    bulletItems,
    rankedProjects,
    hasProjects: windowProjects.length > 0,
  };
}

/* ============================================================================
 * 5. RENTALS, COWORKING & VENUE (rental_booking)
 * ============================================================================ */
export interface VenueDashboardInput {
  units: RentableUnit[];
  bookings: RentalBooking[];
  deposits: SecurityDepositRecord[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectVenueDashboard(input: VenueDashboardInput) {
  const { units, bookings, deposits, period, language, anchorDate = new Date() } = input;
  const activeBookings = bookings.filter((b) => b.status !== 'Cancelled');
  const windowBookings = filterByPeriod(activeBookings, (b) => b.startDateTime || b.createdAt, period, anchorDate);
  const revSeries = buildDailySparkSeries(activeBookings, (b) => b.startDateTime || b.createdAt, (b) => b.totalAmount || 0, period, language, anchorDate);

  const occupiedUnits = units.filter((u) => u.status === 'Occupied').length;
  const occupancyPct = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

  const heldDepositsTotal = deposits.filter((d) => d.status === 'Held').reduce((sum, d) => sum + (d.amount || 0), 0);
  const outstandingBalance = windowBookings.reduce((sum, b) => sum + (b.balanceDue || 0), 0);

  const resources: TimelineResource[] = units.slice(0, 6).map((u) => ({
    id: u.id,
    label: u.name,
    meta: u.type,
  }));

  const blocks: TimelineBlock[] = windowBookings.map((b) => {
    const start = parseIsoDay(b.startDateTime);
    const startH = start ? start.getHours() + start.getMinutes() / 60 : 9;
    const endH = Math.min(23, Math.max(startH + 1, startH + (b.durationHours || 2)));
    return {
      id: b.id,
      resourceId: b.unitId,
      label: `${b.renterName} · ${b.purpose}`,
      startHour: startH,
      endHour: endH,
      tone: b.status === 'CheckedIn' ? 'primary' : b.status === 'Confirmed' ? 'secondary' : 'neutral',
      statusLabel: b.status,
    };
  });

  const typeMap = new Map<string, number>();
  for (const b of windowBookings) {
    typeMap.set(b.unitType, (typeMap.get(b.unitType) || 0) + (b.totalAmount || 0));
  }
  const donutSegments: DonutSegment[] = Array.from(typeMap.entries()).map(([label, value], i) => ({
    id: `venue-t-${i}`,
    label,
    value: Math.round(value),
    color: PALETTE[i % PALETTE.length],
  }));

  const gauges: GaugeMetric[] = [
    {
      id: 'occ',
      label: pickText(language, 'Occupation', 'Occupancy', 'الإشغال'),
      value: occupancyPct,
      target: 80,
      targetLabel: '80%',
      unit: '%',
    },
    {
      id: 'signed',
      label: pickText(language, 'Contrats signés', 'Signed Contracts', 'العقود الموقعة'),
      value: windowBookings.length > 0 ? Math.round((windowBookings.filter((b) => b.contractSigned).length / windowBookings.length) * 100) : 0,
      target: 100,
      targetLabel: '100%',
      unit: '%',
    },
  ];

  return {
    bookingRevenue: revSeries.currentTotal,
    revenueDelta: revSeries.deltaPercent,
    revenueSpark: revSeries.series,
    areaPoints: revSeries.areaPoints,
    occupiedUnits,
    totalUnits: units.length,
    heldDepositsTotal,
    outstandingBalance,
    gauges,
    resources,
    blocks,
    donutSegments,
  };
}

/* ============================================================================
 * 6. EDUCATION & ACADEMY (education_cohort)
 * ============================================================================ */
export interface EducationDashboardInput {
  students: EduStudent[];
  cohorts: EduCohort[];
  attendance: EduAttendance[];
  grades: EduGrade[];
  admissions: EduAdmissionLead[];
  certificates: EduCertificate[];
  enrollments: EduEnrollment[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectEducationDashboard(input: EducationDashboardInput) {
  const { students, cohorts, attendance, grades, admissions, certificates, enrollments, period, language, anchorDate = new Date() } = input;
  const activeStudents = students.filter((s) => s.status === 'Active');
  const tuitionSeries = buildDailySparkSeries(enrollments, (e) => e.enrolledAt, (e) => e.paidAmount || 0, period, language, anchorDate);

  const windowAttendance = filterByPeriod(attendance, (a) => a.date || a.recordedAt, period, anchorDate);
  const windowGrades = filterByPeriod(grades, (g) => g.gradedAt, period, anchorDate);
  const windowEnrollments = filterByPeriod(enrollments, (e) => e.enrolledAt, period, anchorDate);
  const windowAdmissions = filterByPeriod(admissions, (a) => a.createdAt, period, anchorDate);
  const windowCertificates = filterByPeriod(certificates, (c) => c.issueDate, period, anchorDate);

  const overdueBalance = windowEnrollments.reduce((sum, e) => sum + (e.balanceDue || 0), 0);
  const absentCount = windowAttendance.filter((a) => a.status === 'Absent').length;
  const absenceRate = windowAttendance.length > 0 ? Math.round((absentCount / windowAttendance.length) * 1000) / 10 : 0;
  const absenceSpark = buildPeriodRateSeries(
    attendance,
    (a) => a.date || a.recordedAt,
    (a) => a.status === 'Absent',
    period,
    language,
    anchorDate
  );

  const funnelStages: FunnelStage[] =
    windowAdmissions.length > 0 || activeStudents.length > 0 || windowCertificates.length > 0
      ? [
          { id: 'inquiries', label: pickText(language, 'Demandes', 'Inquiries', 'الطلبات'), value: windowAdmissions.length },
          { id: 'admitted', label: pickText(language, 'Admis', 'Admitted', 'المقبولون'), value: windowAdmissions.filter((a) => ['Admitted', 'Enrolled'].includes(a.stage)).length },
          { id: 'enrolled', label: pickText(language, 'Inscrits actifs', 'Active Enrolled', 'المسجلون'), value: activeStudents.length },
          { id: 'certified', label: pickText(language, 'Certifiés', 'Certified', 'المتخرجون'), value: windowCertificates.length },
        ]
      : [];

  // Cohort attendance heatmap across sorted distinct chronological weeks (up to last 4 weeks)
  const weekBuckets = new Set<string>();
  const cohortWeekMap = new Map<string, Map<string, { present: number; total: number }>>();
  for (const att of windowAttendance) {
    const d = parseIsoDay(att.date || att.recordedAt);
    if (!d) continue;
    const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
    const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    weekBuckets.add(weekKey);
    const byWeek = cohortWeekMap.get(att.cohortId) || new Map<string, { present: number; total: number }>();
    const entry = byWeek.get(weekKey) || { present: 0, total: 0 };
    entry.total += 1;
    if (att.status === 'Present' || att.status === 'Late') entry.present += 1;
    byWeek.set(weekKey, entry);
    cohortWeekMap.set(att.cohortId, byWeek);
  }
  const sortedWeeks = Array.from(weekBuckets).sort().slice(-4);
  const cohortRows: CohortRow[] = cohorts
    .slice(0, 5)
    .map((c) => {
      const byWeek = cohortWeekMap.get(c.id);
      if (!byWeek || sortedWeeks.length === 0) return { label: c.name, values: [] };
      const values: number[] = [];
      for (const wk of sortedWeeks) {
        const stat = byWeek.get(wk);
        if (stat && stat.total > 0) {
          values.push(Math.round((stat.present / stat.total) * 100));
        }
      }
      return { label: c.name, values };
    })
    .filter((r) => r.values.length > 0);

  // Real grade distribution histogram from eduGrades
  const binsDef = [
    { id: 'b1', label: '0–9', min: 0, max: 9.99 },
    { id: 'b2', label: '10–12', min: 10, max: 12.99 },
    { id: 'b3', label: '13–15', min: 13, max: 15.99 },
    { id: 'b4', label: '16–18', min: 16, max: 18.49 },
    { id: 'b5', label: '18.5–20', min: 18.5, max: 20 },
  ];
  const gradeBins: HistogramBin[] = windowGrades.length > 0
    ? binsDef.map((b) => ({
        id: b.id,
        label: b.label,
        value: windowGrades.filter((g) => {
          const norm20 = g.maxScore > 0 ? (g.score / g.maxScore) * 20 : 0;
          return norm20 >= b.min && norm20 <= b.max;
        }).length,
      }))
    : [];

  const attBuckets: StackedBucket[] = cohorts.slice(0, 6).map((c) => {
    const list = windowAttendance.filter((a) => a.cohortId === c.id);
    return {
      label: c.cohortCode || c.name.slice(0, 12),
      values: {
        present: list.filter((a) => a.status === 'Present').length,
        late: list.filter((a) => a.status === 'Late').length,
        absent: list.filter((a) => a.status === 'Absent').length,
      },
    };
  }).filter((b) => b.values.present + b.values.late + b.values.absent > 0);

  const cohortFillBullets: BulletItem[] = cohorts.slice(0, 5).map((c) => ({
    id: c.id,
    label: c.name,
    value: c.enrolledCount || 0,
    target: c.maxStudents || 20,
  }));

  return {
    activeStudents: activeStudents.length,
    tuitionCollected: tuitionSeries.currentTotal,
    tuitionDelta: tuitionSeries.deltaPercent,
    tuitionSpark: tuitionSeries.series,
    overdueBalance,
    absenceRate,
    absenceSpark,
    funnelStages,
    cohortRows,
    gradeBins,
    attBuckets,
    cohortFillBullets,
  };
}

/* ============================================================================
 * 7. FREELANCE & SOLO (freelance_solo)
 * ============================================================================ */
export interface FreelanceDashboardInput {
  clients: FreelanceClient[];
  projects: FreelanceProject[];
  timeLogs: TimeLogEntry[];
  invoices: FreelanceInvoice[];
  proposals: FreelanceProposal[];
  expenses: FreelanceExpense[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectFreelanceDashboard(input: FreelanceDashboardInput) {
  const { clients, projects, timeLogs, invoices, proposals, expenses, period, language, anchorDate = new Date() } = input;
  const paidInvoices = invoices.filter((i) => i.status === 'Paid');
  const revSeries = buildDailySparkSeries(paidInvoices, (i) => i.paidAt || i.issueDate, (i) => i.totalAmount || 0, period, language, anchorDate);

  const windowLogs = filterByPeriod(timeLogs, (l) => l.date, period, anchorDate);
  const windowInvoices = filterByPeriod(invoices, (i) => i.issueDate, period, anchorDate);
  const windowPaidInvoices = windowInvoices.filter((i) => i.status === 'Paid');
  const windowUnpaidInvoices = windowInvoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue');
  const windowExpenses = filterByPeriod(expenses, (e) => e.date || e.createdAt, period, anchorDate);
  const windowProposals = filterByPeriod(proposals, (p) => p.createdAt, period, anchorDate);

  const totalLoggedHours = Math.round((windowLogs.reduce((s, l) => s + (l.durationSeconds || 0), 0) / 3600) * 10) / 10;
  const billableHours = Math.round((windowLogs.filter((l) => l.isBillable).reduce((s, l) => s + (l.durationSeconds || 0), 0) / 3600) * 10) / 10;
  const utilizationPct = totalLoggedHours > 0 ? Math.round((billableHours / totalLoggedHours) * 100) : 0;

  const unpaidAmount = windowUnpaidInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const expenseTotal = windowExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const gauges: GaugeMetric[] = [
    {
      id: 'billable',
      label: pickText(language, 'Temps facturable', 'Billable Ratio', 'نسبة الفوترة'),
      value: utilizationPct,
      target: 75,
      targetLabel: '75%',
      unit: '%',
    },
    {
      id: 'paid',
      label: pickText(language, 'Taux encaissement', 'Collection Rate', 'نسبة التحصيل'),
      value: windowInvoices.length > 0 ? Math.round((windowPaidInvoices.length / windowInvoices.length) * 100) : 0,
      target: 90,
      targetLabel: '90%',
      unit: '%',
    },
  ];

  const funnelStages: FunnelStage[] =
    windowProposals.length > 0 || windowInvoices.length > 0
      ? [
          { id: 'sent', label: pickText(language, 'Devis émis', 'Proposals', 'العروض'), value: windowProposals.length },
          { id: 'accepted', label: pickText(language, 'Devis acceptés', 'Accepted', 'المقبولة'), value: windowProposals.filter((p) => p.status === 'Accepted').length },
          { id: 'invoiced', label: pickText(language, 'Facturées', 'Invoiced', 'المفوترة'), value: windowInvoices.length },
          { id: 'paid', label: pickText(language, 'Encaissées', 'Paid', 'المدفوعة'), value: windowPaidInvoices.length },
        ]
      : [];

  const hoursDumbbell: DumbbellItem[] = projects.slice(0, 6).map((p) => {
    const projectHours =
      windowLogs.filter((l) => l.projectId === p.id).reduce((s, l) => s + (l.durationSeconds || 0), 0) / 3600;
    return {
      id: p.id,
      label: p.title,
      prev: p.estimatedHours || 0,
      value: Math.round((projectHours > 0 ? projectHours : p.loggedHours || 0) * 10) / 10,
    };
  });

  const clientTotals = new Map<string, number>();
  for (const inv of windowInvoices) {
    clientTotals.set(inv.clientName, (clientTotals.get(inv.clientName) || 0) + (inv.totalAmount || 0));
  }
  const donutSegments: DonutSegment[] = Array.from(clientTotals.entries()).map(([label, value], i) => ({
    id: `fl-cl-${i}`,
    label,
    value: Math.round(value),
    color: PALETTE[i % PALETTE.length],
  }));

  return {
    collectedRevenue: revSeries.currentTotal,
    revenueDelta: revSeries.deltaPercent,
    revenueSpark: revSeries.series,
    areaPoints: revSeries.areaPoints as AreaPoint[],
    unpaidAmount,
    expenseTotal,
    totalClients: clients.length,
    gauges,
    funnelStages,
    hoursDumbbell,
    donutSegments,
  };
}

/* ============================================================================
 * 8. COMMERCIAL TRADING & WHOLESALE (trading_commercial)
 * ============================================================================ */
export interface TradingDashboardInput {
  commercialDocs: CommercialDocument[];
  purchaseDocs: PurchaseDocument[];
  b2bClients: B2bClient[];
  warehouses: WarehouseDepot[];
  products: Product[];
  period: DashboardPeriodKey;
  language: SupportedLanguage;
  anchorDate?: Date;
}

export function selectTradingDashboard(input: TradingDashboardInput) {
  const { commercialDocs, purchaseDocs, b2bClients, warehouses, products, period, language, anchorDate = new Date() } = input;
  const activeSales = commercialDocs.filter((d) => d.status !== 'Canceled' && d.type !== 'devis');
  const activePurchases = purchaseDocs.filter((p) => p.status !== 'Canceled');

  const docSign = (d: CommercialDocument) => (d.type === 'avoir' || d.type === 'retour' ? -1 : 1);

  const revSeries = buildDailySparkSeries(
    activeSales,
    (d) => d.date || d.createdAt,
    (d) => docSign(d) * (d.totalTtc || d.netToPay || 0),
    period,
    language,
    anchorDate
  );
  const purchaseSeries = buildDailySparkSeries(
    activePurchases,
    (p) => p.orderDate || p.createdAt,
    (p) => p.totalTtc || 0,
    period,
    language,
    anchorDate
  );

  const windowSales = filterByPeriod(activeSales, (d) => d.date || d.createdAt, period, anchorDate);
  const windowPurchases = filterByPeriod(activePurchases, (p) => p.orderDate || p.createdAt, period, anchorDate);

  const outstandingReceivables = b2bClients.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

  const grossSalesHt = windowSales.reduce((s, d) => s + docSign(d) * (d.totalHtRaw || d.totalHtFinal || 0), 0);
  const discounts = windowSales.reduce((s, d) => s + docSign(d) * Math.max(0, (d.totalHtRaw || 0) - (d.totalHtFinal || 0)), 0);
  const purchasesTotal = windowPurchases.reduce((s, p) => s + (p.totalHt || p.totalTtc || 0), 0);
  const netTrading = grossSalesHt - discounts - purchasesTotal;

  const waterfallSteps: WaterfallStep[] =
    windowSales.length > 0 || windowPurchases.length > 0
      ? [
          { id: 'gross', label: pickText(language, 'Ventes B2B HT', 'B2B Sales', 'مبيعات الجملة'), value: Math.round(grossSalesHt), kind: 'total' },
          { id: 'disc', label: pickText(language, 'Remises', 'Discounts', 'التخفيضات'), value: -Math.round(discounts), kind: 'delta' },
          { id: 'purch', label: pickText(language, 'Achats / COGS', 'Purchases', 'المشتريات'), value: -Math.round(purchasesTotal), kind: 'delta' },
          { id: 'net', label: pickText(language, 'Marge négoce', 'Net Margin', 'صافي الهامش'), value: Math.round(netTrading), kind: 'total' },
        ]
      : [];

  const treemapItems: TreemapItem[] =
    warehouses.length > 0
      ? warehouses.map((w, i) => ({
          id: w.id,
          label: w.name,
          value: Math.round(w.totalValuationDzd || 0),
          color: PALETTE[i % PALETTE.length],
        }))
      : products
          .slice(0, 6)
          .map((p, i) => ({
            id: p.id,
            label: p.name,
            value: Math.round((p.stockQuantity || 0) * (p.costPrice ?? p.cost?.amount ?? p.price?.amount ?? 0)),
            color: PALETTE[i % PALETTE.length],
          }));

  const creditBullets: BulletItem[] = b2bClients.slice(0, 5).map((c) => ({
    id: c.id,
    label: c.companyName,
    value: Math.round(c.outstandingBalance || 0),
    target: Math.round(c.creditLimit || 0),
  }));

  const docCountByClient = new Map<string, { count: number; volume: number }>();
  for (const d of windowSales) {
    const cur = docCountByClient.get(d.clientId) || { count: 0, volume: 0 };
    cur.count += 1;
    cur.volume += docSign(d) * (d.totalTtc || d.netToPay || 0);
    docCountByClient.set(d.clientId, cur);
  }
  const bubbleGroups: BubbleGroup[] = [
    { id: 'normal', label: pickText(language, 'En-cours sain', 'Healthy Credit', 'ائتمان سليم'), color: '#10b981' },
    { id: 'watch', label: pickText(language, 'Plafond > 75%', 'High Utilization', 'سقف مرتفع'), color: '#d4522f' },
  ];
  const bubblePoints: BubblePoint[] = b2bClients.map((c) => {
    const agg = docCountByClient.get(c.id) || { count: 0, volume: c.outstandingBalance || 0 };
    const ratio = c.creditLimit > 0 ? c.outstandingBalance / c.creditLimit : 0;
    return {
      id: c.id,
      label: c.companyName,
      groupId: ratio >= 0.75 ? 'watch' : 'normal',
      x: agg.count,
      y: Math.round(agg.volume),
      size: Math.max(1, Math.round(c.outstandingBalance || Math.abs(agg.volume) * 0.2)),
    };
  });

  const stackedBuckets: StackedBucket[] = revSeries.series.map((pt, i) => ({
    label: pt.label,
    values: {
      sales: Math.round(pt.value),
      purchases: Math.round(purchaseSeries.series[i]?.value || 0),
    },
  }));

  return {
    b2bTurnover: revSeries.currentTotal,
    turnoverDelta: revSeries.deltaPercent,
    turnoverSpark: revSeries.series,
    outstandingReceivables,
    creditBullets,
    waterfallSteps,
    treemapItems: treemapItems.filter((t) => t.value > 0),
    bubbleGroups,
    bubblePoints,
    stackedBuckets,
  };
}
