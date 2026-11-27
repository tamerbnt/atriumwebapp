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
  filterByScope,
  getPeriodBuckets,
  getPeriodRange,
  parseIsoDay,
  parseIsoDayMs,
  pickText,
  resolvePeriodKey,
  type DashboardPeriodKey,
} from './common';
import {
  evaluateVehicleFleetAlerts,
  filterBookingSegmentsForDate,
  resolveUnitRentalMode,
} from '../rentalDepth';

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
  cardFilters?: Record<string, string>;
}

export function selectMembershipDashboard(input: MembershipDashboardInput) {
  const { members, checkIns, sales, leads, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const nowMs = anchorDate.getTime();
  const activeMembers = members.filter((m) => m.status === 'Active');

  const revPeriod = resolvePeriodKey(cardFilters.revenue, period);
  const mixPeriod = resolvePeriodKey(cardFilters.mix, period);
  const riskScope = cardFilters.risk || 'all';
  const capacityWindow = cardFilters.capacity || '2h';
  const heatmapPeriod = resolvePeriodKey(cardFilters.heatmap, period);
  const funnelScope = cardFilters.funnel || 'all';
  const cohortsScope = cardFilters.cohorts || 'all';

  const expiringMembers = activeMembers.filter((m) => {
    const expMs = parseIsoDayMs(m.expirationDate);
    if (expMs === null) return false;
    const days = Math.ceil((expMs - nowMs) / DAY_MS);
    return days >= 0 && days <= 14;
  });

  const inactiveRisk = members.filter((m) => m.status === 'Expired' || m.status === 'Frozen').length;
  const churnRiskCount =
    riskScope === 'expiring'
      ? expiringMembers.length
      : riskScope === 'inactive'
      ? inactiveRisk
      : expiringMembers.length + inactiveRisk;
  const churnRiskRate = members.length > 0 ? Math.round((churnRiskCount / members.length) * 1000) / 10 : 0;

  let floorOccupied = 0;
  let totalCapacity = 0;
  if (capacityWindow === '7d') {
    const weekCheckIns = filterByPeriod(checkIns, (c) => c.timestamp, '7d', anchorDate).length;
    floorOccupied = Math.round(weekCheckIns / 7);
    totalCapacity = activeMembers.length > 0 ? Math.max(40, floorOccupied) : 0;
  } else if (capacityWindow === 'today') {
    const todayCheckIns = filterByPeriod(checkIns, (c) => c.timestamp, 'today', anchorDate).length;
    floorOccupied = todayCheckIns;
    totalCapacity = activeMembers.length > 0 ? Math.max(40, todayCheckIns) : 0;
  } else {
    const recentWindowMs = nowMs - 2 * 3600 * 1000;
    let recentCheckIns = 0;
    for (const c of checkIns) {
      const ms = parseIsoDayMs(c.timestamp);
      if (ms !== null && ms >= recentWindowMs && ms <= nowMs) recentCheckIns += 1;
    }
    floorOccupied = recentCheckIns;
    totalCapacity = activeMembers.length > 0 ? Math.max(40, recentCheckIns) : 0;
  }

  const validSales = sales.filter((s) => s.status !== 'Voided' && s.status !== 'Refunded');
  const revenueStats = buildDailySparkSeries(
    validSales,
    (s) => s.createdAt,
    (s) => s.totalAmount || 0,
    revPeriod,
    language,
    anchorDate
  );

  const windowCheckIns = filterByPeriod(checkIns, (c) => c.timestamp, heatmapPeriod, anchorDate);
  const heatmap = buildHourlyWeekdayMatrix(windowCheckIns, (c) => c.timestamp, language);

  const scopedLeads = funnelScope === 'all' ? leads : filterByScope(leads, (l) => l.createdAt, funnelScope, period, anchorDate);
  const scopedActiveMembers =
    funnelScope === 'all'
      ? activeMembers
      : filterByScope(activeMembers, (m) => m.startDate || m.createdAt, funnelScope, period, anchorDate);
  const pendingLeads = scopedLeads.filter((l) => l.status === 'Pending').length;
  const approvedLeads = scopedLeads.filter((l) => l.status === 'Approved').length;
  const funnelStages: FunnelStage[] =
    scopedLeads.length > 0 || scopedActiveMembers.length > 0 || members.length > 0
      ? [
          { id: 'prospects', label: pickText(language, 'Prospects reçus', 'Leads Received', 'الطلبات الواردة'), value: scopedLeads.length },
          { id: 'pending', label: pickText(language, 'En validation', 'Pending Review', 'قيد المراجعة'), value: pendingLeads + approvedLeads },
          { id: 'approved', label: pickText(language, 'Validés', 'Approved', 'المعتمدة'), value: approvedLeads },
          { id: 'active', label: pickText(language, 'Membres actifs', 'Active Members', 'أعضاء نشطون'), value: scopedActiveMembers.length },
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
    const expMs = parseIsoDayMs(m.expirationDate);
    const activeMonths = expMs !== null ? Math.max(0, Math.floor((expMs - start.getTime()) / (30 * DAY_MS))) : 0;
    for (let k = 0; k < 4; k++) {
      if (m.status === 'Active' || activeMonths >= k) {
        entry.retainedByMonth[k] += 1;
      }
    }
    monthBuckets.set(key, entry);
  }
  const allCohorts: CohortRow[] = Array.from(monthBuckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-5)
    .map(([label, entry]) => ({
      label,
      values: entry.retainedByMonth.map((c) => Math.round((c / Math.max(1, entry.total)) * 100)),
    }));
  const cohorts: CohortRow[] =
    cohortsScope === 'recent3'
      ? allCohorts.slice(-3)
      : cohortsScope === 'active'
      ? allCohorts.filter((r) => (r.values[1] ?? r.values[0] ?? 0) > 0)
      : allCohorts;

  const mixStats =
    mixPeriod === revPeriod
      ? revenueStats
      : buildDailySparkSeries(validSales, (s) => s.createdAt, (s) => s.totalAmount || 0, mixPeriod, language, anchorDate);
  const { range: bucketRange, bucketCount, effectiveStart, bucketMs } = getPeriodBuckets(mixPeriod, anchorDate);
  const plansBuckets = new Array<number>(bucketCount).fill(0);
  const coachingBuckets = new Array<number>(bucketCount).fill(0);
  for (const sale of validSales) {
    const ms = parseIsoDayMs(sale.createdAt);
    if (ms === null || ms < effectiveStart || ms > bucketRange.endMs) continue;
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

  const stackedBuckets: StackedBucket[] = mixStats.series.map((pt, idx) => ({
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
  cardFilters?: Record<string, string>;
}

export function selectAppointmentDashboard(input: AppointmentDashboardInput) {
  const { appointments, services, staff, workstations, sales, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const revPeriod = resolvePeriodKey(cardFilters.revenue, period);
  const mixPeriod = resolvePeriodKey(cardFilters.mix, period);
  const noShowPeriod = resolvePeriodKey(cardFilters.noshow, period);
  const capacityScope = cardFilters.capacity || 'all';
  const timelineShift = cardFilters.timeline || 'all';
  const donutPeriod = resolvePeriodKey(cardFilters.donut, period);
  const rankedPeriod = resolvePeriodKey(cardFilters.ranked, period);

  const revRange = getPeriodRange(revPeriod, anchorDate);
  const revApts = appointments.filter((a) => {
    const ms = parseIsoDayMs(a.date || a.createdAt);
    return ms !== null && ms >= revRange.startMs && ms <= revRange.endMs;
  });

  const revenueOfApts = (list: Appointment[]) =>
    list
      .filter((a) => a.status !== 'Cancelled' && a.status !== 'NoShow')
      .reduce((sum, a) => sum + (a.price || 0) + (a.retailProductsTotal || 0), 0);

  const activeApts = appointments.filter((a) => a.status !== 'Cancelled' && a.status !== 'NoShow');
  const aptSeries = buildDailySparkSeries(
    activeApts,
    (a) => a.date || a.createdAt,
    (a) => (a.price || 0) + (a.retailProductsTotal || 0),
    revPeriod,
    language,
    anchorDate
  );

  const nsRange = getPeriodRange(noShowPeriod, anchorDate);
  let nsWinTotal = 0;
  let nsWinBad = 0;
  let nsPrevTotal = 0;
  let nsPrevBad = 0;
  for (const a of appointments) {
    const ms = parseIsoDayMs(a.date || a.createdAt);
    if (ms === null) continue;
    const isBad = a.status === 'NoShow' || a.status === 'Cancelled';
    if (ms >= nsRange.startMs && ms <= nsRange.endMs) {
      nsWinTotal += 1;
      if (isBad) nsWinBad += 1;
    } else if (ms >= nsRange.prevStartMs && ms <= nsRange.prevEndMs) {
      nsPrevTotal += 1;
      if (isBad) nsPrevBad += 1;
    }
  }
  const noShowListCount = nsWinBad;
  const noShowRate = nsWinTotal > 0 ? Math.round((nsWinBad / nsWinTotal) * 1000) / 10 : 0;
  const prevNoShowRate = nsPrevTotal > 0 ? Math.round((nsPrevBad / nsPrevTotal) * 1000) / 10 : 0;
  const noShowSpark = buildPeriodRateSeries(
    appointments,
    (a) => a.date || a.createdAt,
    (a) => a.status === 'NoShow' || a.status === 'Cancelled',
    noShowPeriod,
    language,
    anchorDate
  );

  const activeWorkstations = workstations.filter((w) => w.isAvailable);
  const occupiedChairs = appointments.filter((a) => a.status === 'InChair').length;
  const totalChairs =
    capacityScope === 'active'
      ? activeWorkstations.length > 0
        ? activeWorkstations.length
        : Math.max(0, staff.filter((s) => s.isActive).length)
      : workstations.length > 0
      ? workstations.length
      : Math.max(0, staff.filter((s) => s.isActive).length);

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

  const timelineStartHour = timelineShift === 'pm' ? 13 : 8;
  const timelineEndHour = timelineShift === 'am' ? 14 : 21;
  const timelineApts = filterByPeriod(appointments, (a) => a.date || a.createdAt, period, anchorDate);
  const blocks: TimelineBlock[] = timelineApts
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
        tone: (a.status === 'InChair' ? 'primary' : a.status === 'Completed' ? 'secondary' : 'neutral') as TimelineBlock['tone'],
        statusLabel: a.status,
      };
    })
    .filter((b) => b.endHour > timelineStartHour && b.startHour < timelineEndHour);

  // Service category donut from booked appointments joined with services
  const donutApts = filterByPeriod(appointments, (a) => a.date || a.createdAt, donutPeriod, anchorDate);
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const catTotals = new Map<string, number>();
  for (const a of donutApts) {
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
  const retailSeries = buildDailySparkSeries(validRetailSales, (s) => s.createdAt, (s) => s.totalAmount || 0, revPeriod, language, anchorDate);
  const mixAptSeries =
    mixPeriod === revPeriod
      ? aptSeries
      : buildDailySparkSeries(activeApts, (a) => a.date || a.createdAt, (a) => (a.price || 0) + (a.retailProductsTotal || 0), mixPeriod, language, anchorDate);
  const mixRetailSeries =
    mixPeriod === revPeriod
      ? retailSeries
      : buildDailySparkSeries(validRetailSales, (s) => s.createdAt, (s) => s.totalAmount || 0, mixPeriod, language, anchorDate);

  const stackedBuckets: StackedBucket[] = mixAptSeries.series.map((pt, i) => ({
    label: pt.label,
    values: {
      services: Math.round(pt.value),
      retail: Math.round(mixRetailSeries.series[i]?.value || 0),
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
  const totalRevenue = revenueOfApts(revApts) + retailSeries.currentTotal;
  const combinedPrevTotal = aptSeries.previousTotal + retailSeries.previousTotal;

  // Ranked stylists
  const rankedApts = filterByPeriod(appointments, (a) => a.date || a.createdAt, rankedPeriod, anchorDate);
  const stylistAgg = new Map<string, { label: string; revenue: number; count: number; tips: number }>();
  for (const a of rankedApts) {
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
    noShowCount: noShowListCount,
    noShowSpark,
    occupiedChairs,
    totalChairs,
    resources,
    blocks,
    timelineStartHour,
    timelineEndHour,
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
  cardFilters?: Record<string, string>;
}

export function selectPosDashboard(input: PosDashboardInput) {
  const { sales, products, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const revPeriod = resolvePeriodKey(cardFilters.revenue, period);
  const trendPeriod = resolvePeriodKey(cardFilters.trend, period);
  const waterfallPeriod = resolvePeriodKey(cardFilters.waterfall, period);
  const stockScope = cardFilters.stock || 'all';
  const treemapBasis = cardFilters.treemap || 'cost';
  const heatmapPeriod = resolvePeriodKey(cardFilters.heatmap, period);
  const rankedPeriod = resolvePeriodKey(cardFilters.ranked, period);

  const validSales = sales.filter((s) => s.status !== 'Voided' && s.status !== 'Refunded');
  const revRange = getPeriodRange(revPeriod, anchorDate);
  const revWindowSales = validSales.filter((s) => {
    const ms = parseIsoDayMs(s.createdAt);
    return ms !== null && ms >= revRange.startMs && ms <= revRange.endMs;
  });

  const salesSeries = buildDailySparkSeries(validSales, (s) => s.createdAt, (s) => s.totalAmount || 0, revPeriod, language, anchorDate);
  const trendSeries =
    trendPeriod === revPeriod
      ? salesSeries
      : buildDailySparkSeries(validSales, (s) => s.createdAt, (s) => s.totalAmount || 0, trendPeriod, language, anchorDate);

  const lowStockItems = products.filter((p) => {
    const qty = p.stockQuantity ?? 0;
    const reorder = p.reorderLevel ?? 5;
    if (stockScope === 'out') return qty <= 0;
    if (stockScope === 'low') return qty > 0 && qty <= reorder;
    return qty <= reorder;
  });

  const wfSales =
    waterfallPeriod === revPeriod
      ? revWindowSales
      : filterByPeriod(validSales, (s) => s.createdAt, waterfallPeriod, anchorDate);

  const productCostMap = new Map(products.map((p) => [p.id, p.costPrice ?? p.cost?.amount ?? 0]));
  let grossTotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let cogsTotal = 0;

  for (const sale of wfSales) {
    grossTotal += sale.subtotal ?? sale.totalAmount ?? 0;
    discountTotal += sale.discountAmount ?? sale.discount ?? 0;
    taxTotal += sale.taxAmount ?? 0;
    for (const item of sale.items || []) {
      const unitCost = item.costPrice ?? productCostMap.get(item.productId) ?? 0;
      cogsTotal += unitCost * (item.quantity || 1);
    }
  }
  const netMargin = grossTotal - discountTotal - cogsTotal - taxTotal;

  const waterfallSteps: WaterfallStep[] =
    wfSales.length > 0
      ? [
          { id: 'gross', label: pickText(language, 'Ventes brutes', 'Gross Sales', 'إجمالي المبيعات'), value: Math.round(grossTotal), kind: 'total' },
          { id: 'disc', label: pickText(language, 'Remises', 'Discounts', 'التخفيضات'), value: -Math.round(discountTotal), kind: 'delta' },
          { id: 'cogs', label: pickText(language, 'Coût achat', 'COGS', 'التكلفة'), value: -Math.round(cogsTotal), kind: 'delta' },
          { id: 'tax', label: pickText(language, 'Taxes TVA', 'Taxes', 'الضرائب'), value: -Math.round(taxTotal), kind: 'delta' },
          { id: 'net', label: pickText(language, 'Marge nette', 'Net Margin', 'صافي الربح'), value: Math.round(netMargin), kind: 'total' },
        ]
      : [];

  const rankedSales =
    rankedPeriod === waterfallPeriod
      ? wfSales
      : filterByPeriod(validSales, (s) => s.createdAt, rankedPeriod, anchorDate);
  const skuAgg = new Map<string, { label: string; revenue: number; qty: number }>();
  for (const sale of rankedSales) {
    for (const item of sale.items || []) {
      const cur = skuAgg.get(item.productId || item.productName) || { label: item.productName, revenue: 0, qty: 0 };
      cur.revenue += item.totalPrice || 0;
      cur.qty += item.quantity || 0;
      skuAgg.set(item.productId || item.productName, cur);
    }
  }

  const catValue = new Map<string, number>();
  for (const p of products) {
    const unitPrice =
      treemapBasis === 'retail'
        ? p.price?.amount ?? p.costPrice ?? p.cost?.amount ?? 0
        : p.costPrice ?? p.cost?.amount ?? p.price?.amount ?? 0;
    const val = (p.stockQuantity || 0) * unitPrice;
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

  const heatSales =
    heatmapPeriod === revPeriod
      ? revWindowSales
      : filterByPeriod(validSales, (s) => s.createdAt, heatmapPeriod, anchorDate);
  const rushHeatmap = buildHourlyWeekdayMatrix(heatSales, (s) => s.createdAt, language);

  return {
    grossRevenue: salesSeries.currentTotal,
    revenueDelta: salesSeries.deltaPercent,
    revenueSpark: salesSeries.series,
    areaPoints: trendSeries.areaPoints,
    ticketsCount: revWindowSales.length,
    avgTicket: revWindowSales.length > 0 ? Math.round(salesSeries.currentTotal / revWindowSales.length) : 0,
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
  cardFilters?: Record<string, string>;
}

export function selectProjectDashboard(input: ProjectDashboardInput) {
  const { projects, milestones, payrollBatches, expenses, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const budgetScope = cardFilters.budget || period;
  const budgetPeriod = resolvePeriodKey(budgetScope, period);
  const approvalScope = cardFilters.approvals || 'all';
  const waterfallScope = cardFilters.waterfall || period;
  const funnelScope = cardFilters.funnel || period;
  const bulletsScope = cardFilters.bullets || 'all';

  const budgetProjects = filterByScope(projects, (p) => p.createdAt || p.startDate, budgetScope, period, anchorDate);
  const totalBudget = budgetProjects.reduce((sum, p) => sum + (p.budgetCapDzd || 0), 0);
  const budgetSpark = buildDailySparkSeries(projects, (p) => p.createdAt || p.startDate, (p) => p.budgetCapDzd || 0, budgetPeriod, language, anchorDate);

  const windowPayroll = filterByScope(payrollBatches, (b) => b.disbursedAt || b.ccpGeneratedAt || b.directionApprovedAt || b.createdAt, waterfallScope, period, anchorDate);
  const windowExpenses = filterByScope(expenses, (e) => e.directionApprovedAt || e.createdAt, waterfallScope, period, anchorDate);
  const waterfallProjects = filterByScope(projects, (p) => p.createdAt || p.startDate, waterfallScope, period, anchorDate);
  const waterfallBudget = waterfallProjects.reduce((sum, p) => sum + (p.budgetCapDzd || 0), 0);
  const totalPayroll = windowPayroll.reduce((sum, b) => sum + (b.totalAmountDzd || 0), 0);
  const totalExpenses = windowExpenses.filter((e) => e.status !== 'rejected').reduce((sum, e) => sum + (e.amountDzd || 0), 0);
  const netMargin = waterfallBudget - totalPayroll - totalExpenses;

  const allPendingPayroll = payrollBatches.filter((b) => b.status === 'pending_direction_approval').length;
  const allPendingExpenses = expenses.filter((e) => e.status === 'pending_direction_approval').length;
  const pendingApprovals =
    approvalScope === 'payroll'
      ? allPendingPayroll
      : approvalScope === 'expenses'
      ? allPendingExpenses
      : allPendingPayroll + allPendingExpenses;

  const windowMilestones = filterByPeriod(milestones, (m) => m.completedAt || m.targetDate, period, anchorDate);
  const completedMilestones = windowMilestones.filter((m) => m.isCompleted).length;
  const milestoneRate = windowMilestones.length > 0 ? Math.round((completedMilestones / windowMilestones.length) * 100) : 0;

  const allPayrollScope = filterByScope(payrollBatches, (b) => b.disbursedAt || b.ccpGeneratedAt || b.directionApprovedAt || b.createdAt, period, period, anchorDate);
  const allExpenseScope = filterByScope(expenses, (e) => e.directionApprovedAt || e.createdAt, period, period, anchorDate);
  const spentByProject = new Map<string, number>();
  for (const b of allPayrollScope) spentByProject.set(b.projectId, (spentByProject.get(b.projectId) || 0) + (b.totalAmountDzd || 0));
  for (const e of allExpenseScope) {
    if (e.status !== 'rejected') spentByProject.set(e.projectId, (spentByProject.get(e.projectId) || 0) + (e.amountDzd || 0));
  }

  const windowProjects = filterByPeriod(projects, (p) => p.createdAt || p.startDate, period, anchorDate);
  const allBullets: BulletItem[] = (windowProjects.length > 0 ? windowProjects : projects).slice(0, 6).map((p) => ({
    id: p.id,
    label: p.title,
    value: Math.round(spentByProject.get(p.id) || 0),
    target: Math.round(p.budgetCapDzd || 0),
  }));
  const bulletItems: BulletItem[] =
    bulletsScope === 'over50'
      ? allBullets.filter((b) => (b.target || 0) > 0 && b.value >= (b.target || 0) * 0.5)
      : allBullets;

  const waterfallSteps: WaterfallStep[] =
    waterfallProjects.length > 0 || windowPayroll.length > 0 || windowExpenses.length > 0
      ? [
          { id: 'contracts', label: pickText(language, 'Contrats engagés', 'Contract Cap', 'قيمة العقود'), value: Math.round(waterfallBudget), kind: 'total' },
          { id: 'payroll', label: pickText(language, 'Paies talents', 'Talent Payroll', 'أجور الفريق'), value: -Math.round(totalPayroll), kind: 'delta' },
          { id: 'expenses', label: pickText(language, 'Frais terrain', 'Field Ops', 'مصاريف الميدان'), value: -Math.round(totalExpenses), kind: 'delta' },
          { id: 'margin', label: pickText(language, 'Marge nette', 'Net Margin', 'صافي الهامش'), value: Math.round(netMargin), kind: 'total' },
        ]
      : [];

  const funnelProjects = filterByScope(projects, (p) => p.createdAt || p.startDate, funnelScope, period, anchorDate);
  const stageCounts = { framing: 0, crea: 0, prod: 0, field: 0, done: 0 };
  for (const p of funnelProjects) {
    if (p.status === 'framing') stageCounts.framing += 1;
    else if (p.status === 'crea_active' || p.status === 'creative_kv' || p.status === 'client_validated') stageCounts.crea += 1;
    else if (p.status === 'print_ready' || p.status === 'production') stageCounts.prod += 1;
    else if (p.status === 'field_execution' || p.status === 'field_active') stageCounts.field += 1;
    else if (p.status === 'completed' || p.status === 'closed' || p.status === 'archived') stageCounts.done += 1;
  }
  const pipelineStages: FunnelStage[] =
    funnelProjects.length > 0
      ? [
          { id: 'total', label: pickText(language, 'Total portefeuille', 'Portfolio', 'كل المشاريع'), value: funnelProjects.length },
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
      value: waterfallBudget > 0 ? Math.max(0, Math.round((netMargin / waterfallBudget) * 100)) : 0,
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
    hasProjects: windowProjects.length > 0 || projects.length > 0,
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
  cardFilters?: Record<string, string>;
}

export function selectVenueDashboard(input: VenueDashboardInput) {
  const { units, bookings, deposits, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const revPeriod = resolvePeriodKey(cardFilters.revenue, period);
  const trendPeriod = resolvePeriodKey(cardFilters.trend, period);
  const balanceScope = cardFilters.balance || 'all';
  const timelineShift = cardFilters.timeline || 'all';
  const capacityScope = cardFilters.capacity || 'all';
  const donutPeriod = resolvePeriodKey(cardFilters.donut, period);

  const activeBookings = bookings.filter((b) => b.status !== 'Cancelled');
  const revSeries = buildDailySparkSeries(activeBookings, (b) => b.startDateTime || b.createdAt, (b) => b.totalAmount || 0, revPeriod, language, anchorDate);
  const trendSeries =
    trendPeriod === revPeriod
      ? revSeries
      : buildDailySparkSeries(activeBookings, (b) => b.startDateTime || b.createdAt, (b) => b.totalAmount || 0, trendPeriod, language, anchorDate);

  const scopedUnits =
    capacityScope === 'all'
      ? units
      : units.filter((u) => {
          const mode = resolveUnitRentalMode(u);
          if (capacityScope === 'cowork') return mode === 'coworking_desk';
          if (capacityScope === 'fleet') return mode === 'vehicle' || mode === 'gear';
          return mode === 'venue';
        });
  const occupiedUnits = scopedUnits.filter((u) => u.status === 'Occupied').length;
  const occupancyPct = scopedUnits.length > 0 ? Math.round((occupiedUnits / scopedUnits.length) * 100) : 0;

  const fleetAlerts = evaluateVehicleFleetAlerts(units, anchorDate.toISOString());
  const fleetAttentionCount = fleetAlerts.filter((a) => a.needsAttention).length;

  const heldDepositsTotal = deposits.filter((d) => d.status === 'Held').reduce((sum, d) => sum + (d.amount || 0), 0);
  const windowBookings = filterByPeriod(activeBookings, (b) => b.startDateTime || b.createdAt, period, anchorDate);
  const nowMs = anchorDate.getTime();
  const outstandingBalance =
    balanceScope === 'overdue'
      ? windowBookings
          .filter((b) => (b.balanceDue || 0) > 0 && ((parseIsoDayMs(b.endDateTime || b.startDateTime) ?? nowMs) < nowMs))
          .reduce((sum, b) => sum + (b.balanceDue || 0), 0)
      : windowBookings.reduce((sum, b) => sum + (b.balanceDue || 0), 0);

  const resources: TimelineResource[] = units.slice(0, 6).map((u) => ({
    id: u.id,
    label: u.name,
    meta: u.type,
  }));

  const timelineStartHour = timelineShift === 'pm' ? 13 : 8;
  const timelineEndHour = timelineShift === 'am' ? 14 : 22;
  const anchorYmd = anchorDate.toISOString().slice(0, 10);
  const anchorDaySegments = filterBookingSegmentsForDate(
    activeBookings,
    anchorYmd,
    timelineStartHour,
    timelineEndHour
  );
  const blocks: TimelineBlock[] =
    anchorDaySegments.length > 0
      ? anchorDaySegments.map((seg) => ({
          id: seg.booking.id,
          resourceId: seg.booking.unitId,
          label: `${seg.continuesFromPriorDay ? '← ' : ''}${seg.booking.renterName} · ${seg.booking.purpose}${seg.continuesToNextDay ? ' →' : ''}`,
          startHour: seg.startHour,
          endHour: seg.endHour,
          tone: (seg.booking.status === 'CheckedIn'
            ? 'primary'
            : seg.booking.status === 'Confirmed'
            ? 'secondary'
            : 'neutral') as TimelineBlock['tone'],
          statusLabel: seg.booking.status,
        }))
      : windowBookings
          .map((b) => {
            const start = parseIsoDay(b.startDateTime);
            const end = parseIsoDay(b.endDateTime);
            const startH = start ? start.getHours() + start.getMinutes() / 60 : 9;
            const crossesDay =
              b.startDateTime.slice(0, 10) !== (b.endDateTime || '').slice(0, 10);
            const endH = crossesDay
              ? timelineEndHour
              : Math.min(
                  timelineEndHour,
                  Math.max(
                    startH + 1,
                    end ? end.getHours() + end.getMinutes() / 60 : startH + (b.durationHours || 2)
                  )
                );
            return {
              id: b.id,
              resourceId: b.unitId,
              label: `${b.renterName} · ${b.purpose}${crossesDay ? ' →' : ''}`,
              startHour: Math.max(timelineStartHour, startH),
              endHour: endH,
              tone: (b.status === 'CheckedIn' ? 'primary' : b.status === 'Confirmed' ? 'secondary' : 'neutral') as TimelineBlock['tone'],
              statusLabel: b.status,
            };
          })
          .filter((b) => b.endHour > timelineStartHour && b.startHour < timelineEndHour);

  const donutBookings = filterByPeriod(activeBookings, (b) => b.startDateTime || b.createdAt, donutPeriod, anchorDate);
  const typeMap = new Map<string, number>();
  for (const b of donutBookings) {
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
    areaPoints: trendSeries.areaPoints,
    occupiedUnits,
    totalUnits: scopedUnits.length,
    heldDepositsTotal,
    outstandingBalance,
    fleetUnitsCount: fleetAlerts.length,
    fleetAttentionCount,
    gauges,
    resources,
    blocks,
    timelineStartHour,
    timelineEndHour,
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
  cardFilters?: Record<string, string>;
}

export function selectEducationDashboard(input: EducationDashboardInput) {
  const { students, cohorts, attendance, grades, admissions, certificates, enrollments, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const tuitionPeriod = resolvePeriodKey(cardFilters.tuition, period);
  const bulletsScope = cardFilters.bullets || 'all';
  const absencePeriod = resolvePeriodKey(cardFilters.absence, period);
  const attendancePeriod = resolvePeriodKey(cardFilters.attendance, period);
  const funnelScope = cardFilters.funnel || period;
  const cohortsPeriod = resolvePeriodKey(cardFilters.cohorts, period);
  const gradesScope = cardFilters.grades || period;

  const activeStudents = students.filter((s) => s.status === 'Active');
  const tuitionSeries = buildDailySparkSeries(enrollments, (e) => e.enrolledAt, (e) => e.paidAmount || 0, tuitionPeriod, language, anchorDate);
  const windowEnrollments = filterByPeriod(enrollments, (e) => e.enrolledAt, tuitionPeriod, anchorDate);
  const overdueBalance = windowEnrollments.reduce((sum, e) => sum + (e.balanceDue || 0), 0);

  const absAttendance = filterByPeriod(attendance, (a) => a.recordedAt, absencePeriod, anchorDate);
  const absentCount = absAttendance.filter((a) => a.status === 'Absent').length;
  const absenceRate = absAttendance.length > 0 ? Math.round((absentCount / absAttendance.length) * 1000) / 10 : 0;
  const absenceSpark = buildPeriodRateSeries(
    attendance,
    (a) => a.recordedAt,
    (a) => a.status === 'Absent',
    absencePeriod,
    language,
    anchorDate
  );

  const windowAdmissions = filterByScope(admissions, (a) => a.createdAt, funnelScope, period, anchorDate);
  const windowCertificates = filterByScope(certificates, (c) => c.issueDate, funnelScope, period, anchorDate);
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
  const cohortAtt =
    cohortsPeriod === absencePeriod
      ? absAttendance
      : filterByPeriod(attendance, (a) => a.recordedAt, cohortsPeriod, anchorDate);
  const weekBuckets = new Set<string>();
  const cohortWeekMap = new Map<string, Map<string, { present: number; total: number }>>();
  for (const att of cohortAtt) {
    const d = parseIsoDay(att.recordedAt);
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
  const windowGrades = filterByScope(grades, (g) => g.gradedAt, gradesScope, period, anchorDate);
  const gradeBinCounts = [0, 0, 0, 0, 0];
  for (const g of windowGrades) {
    const norm20 = g.maxScore > 0 ? (g.score / g.maxScore) * 20 : 0;
    if (norm20 < 10) gradeBinCounts[0] += 1;
    else if (norm20 < 13) gradeBinCounts[1] += 1;
    else if (norm20 < 16) gradeBinCounts[2] += 1;
    else if (norm20 < 18.5) gradeBinCounts[3] += 1;
    else if (norm20 <= 20) gradeBinCounts[4] += 1;
  }
  const binsDef = [
    { id: 'b1', label: '0–9' },
    { id: 'b2', label: '10–12' },
    { id: 'b3', label: '13–15' },
    { id: 'b4', label: '16–18' },
    { id: 'b5', label: '18.5–20' },
  ];
  const gradeBins: HistogramBin[] = windowGrades.length > 0
    ? binsDef.map((b, idx) => ({
        id: b.id,
        label: b.label,
        value: gradeBinCounts[idx],
      }))
    : [];

  const stackedAtt =
    attendancePeriod === absencePeriod
      ? absAttendance
      : filterByPeriod(attendance, (a) => a.recordedAt, attendancePeriod, anchorDate);
  const attByCohort = new Map<string, { present: number; late: number; absent: number }>();
  for (const a of stackedAtt) {
    let counts = attByCohort.get(a.cohortId);
    if (!counts) {
      counts = { present: 0, late: 0, absent: 0 };
      attByCohort.set(a.cohortId, counts);
    }
    if (a.status === 'Present') counts.present += 1;
    else if (a.status === 'Late') counts.late += 1;
    else if (a.status === 'Absent') counts.absent += 1;
  }
  const attBuckets: StackedBucket[] = cohorts
    .slice(0, 6)
    .map((c) => {
      const counts = attByCohort.get(c.id) || { present: 0, late: 0, absent: 0 };
      return {
        label: c.cohortCode || c.name.slice(0, 12),
        values: counts,
      };
    })
    .filter((b) => b.values.present + b.values.late + b.values.absent > 0);

  const scopedCohorts =
    bulletsScope === 'active'
      ? cohorts.filter((c) => c.status === 'InProgress' || c.status === 'Enrolling')
      : cohorts;
  const cohortFillBullets: BulletItem[] = scopedCohorts.slice(0, 5).map((c) => ({
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
  cardFilters?: Record<string, string>;
}

export function selectFreelanceDashboard(input: FreelanceDashboardInput) {
  const { clients, projects, timeLogs, invoices, proposals, expenses, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const revPeriod = resolvePeriodKey(cardFilters.revenue, period);
  const trendPeriod = resolvePeriodKey(cardFilters.trend, period);
  const unpaidScope = cardFilters.unpaid || 'all';
  const funnelScope = cardFilters.funnel || period;
  const donutPeriod = resolvePeriodKey(cardFilters.donut, period);
  const dumbbellScope = cardFilters.dumbbell || 'all';

  const paidInvoices = invoices.filter((i) => i.status === 'Paid');
  const revSeries = buildDailySparkSeries(paidInvoices, (i) => i.paidAt || i.issueDate, (i) => i.totalAmount || 0, revPeriod, language, anchorDate);
  const trendSeries =
    trendPeriod === revPeriod
      ? revSeries
      : buildDailySparkSeries(paidInvoices, (i) => i.paidAt || i.issueDate, (i) => i.totalAmount || 0, trendPeriod, language, anchorDate);

  const windowLogs = filterByPeriod(timeLogs, (l) => l.date, period, anchorDate);
  const windowInvoices = filterByPeriod(invoices, (i) => i.issueDate, period, anchorDate);
  const windowPaidInvoices = windowInvoices.filter((i) => i.status === 'Paid');
  const windowUnpaidInvoices = windowInvoices.filter((i) =>
    unpaidScope === 'overdue' ? i.status === 'Overdue' : i.status === 'Sent' || i.status === 'Overdue'
  );
  const windowExpenses = filterByPeriod(expenses, (e) => e.date || e.createdAt, period, anchorDate);

  let totalLogSec = 0;
  let billableLogSec = 0;
  const projectLogSec = new Map<string, number>();
  for (const l of windowLogs) {
    const dur = l.durationSeconds || 0;
    totalLogSec += dur;
    if (l.isBillable) billableLogSec += dur;
    if (l.projectId) {
      projectLogSec.set(l.projectId, (projectLogSec.get(l.projectId) || 0) + dur);
    }
  }
  const totalLoggedHours = Math.round((totalLogSec / 3600) * 10) / 10;
  const billableHours = Math.round((billableLogSec / 3600) * 10) / 10;
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

  const funnelProposals = filterByScope(proposals, (p) => p.createdAt, funnelScope, period, anchorDate);
  const funnelInvoices = filterByScope(invoices, (i) => i.issueDate, funnelScope, period, anchorDate);
  const funnelPaid = funnelInvoices.filter((i) => i.status === 'Paid');
  const funnelStages: FunnelStage[] =
    funnelProposals.length > 0 || funnelInvoices.length > 0
      ? [
          { id: 'sent', label: pickText(language, 'Devis émis', 'Proposals', 'العروض'), value: funnelProposals.length },
          { id: 'accepted', label: pickText(language, 'Devis acceptés', 'Accepted', 'المقبولة'), value: funnelProposals.filter((p) => p.status === 'Accepted').length },
          { id: 'invoiced', label: pickText(language, 'Facturées', 'Invoiced', 'المفوترة'), value: funnelInvoices.length },
          { id: 'paid', label: pickText(language, 'Encaissées', 'Paid', 'المدفوعة'), value: funnelPaid.length },
        ]
      : [];

  const rawDumbbell: DumbbellItem[] = projects.slice(0, 6).map((p) => {
    const projectHours = (projectLogSec.get(p.id) || 0) / 3600;
    return {
      id: p.id,
      label: p.title,
      prev: p.estimatedHours || 0,
      value: Math.round((projectHours > 0 ? projectHours : p.loggedHours || 0) * 10) / 10,
    };
  });
  const hoursDumbbell: DumbbellItem[] =
    dumbbellScope === 'over' ? rawDumbbell.filter((item) => item.value > item.prev) : rawDumbbell;

  const donutInvoices =
    donutPeriod === period ? windowInvoices : filterByPeriod(invoices, (i) => i.issueDate, donutPeriod, anchorDate);
  const clientTotals = new Map<string, number>();
  for (const inv of donutInvoices) {
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
    areaPoints: trendSeries.areaPoints as AreaPoint[],
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
  cardFilters?: Record<string, string>;
}

export function selectTradingDashboard(input: TradingDashboardInput) {
  const { commercialDocs, purchaseDocs, b2bClients, warehouses, products, period, language, anchorDate = new Date(), cardFilters = {} } = input;
  const turnoverPeriod = resolvePeriodKey(cardFilters.turnover, period);
  const flowPeriod = resolvePeriodKey(cardFilters.flow, period);
  const receivablesScope = cardFilters.receivables || 'all';
  const bulletsScope = cardFilters.bullets || 'all';
  const waterfallPeriod = resolvePeriodKey(cardFilters.waterfall, period);
  const treemapScope = cardFilters.treemap || 'warehouse';
  const bubbleScope = cardFilters.bubble || 'all';

  const activeSales = commercialDocs.filter((d) => d.status !== 'Canceled' && d.type !== 'devis');
  const activePurchases = purchaseDocs.filter((p) => p.status !== 'Canceled');

  const docSign = (d: CommercialDocument) => (d.type === 'avoir' || d.type === 'retour' ? -1 : 1);

  const revSeries = buildDailySparkSeries(
    activeSales,
    (d) => d.date || d.createdAt,
    (d) => docSign(d) * (d.totalTtc || d.netToPay || 0),
    turnoverPeriod,
    language,
    anchorDate
  );

  const flowSalesSeries =
    flowPeriod === turnoverPeriod
      ? revSeries
      : buildDailySparkSeries(
          activeSales,
          (d) => d.date || d.createdAt,
          (d) => docSign(d) * (d.totalTtc || d.netToPay || 0),
          flowPeriod,
          language,
          anchorDate
        );
  const flowPurchaseSeries = buildDailySparkSeries(
    activePurchases,
    (p) => p.orderDate || p.createdAt,
    (p) => p.totalTtc || 0,
    flowPeriod,
    language,
    anchorDate
  );

  const wfSales = filterByPeriod(activeSales, (d) => d.date || d.createdAt, waterfallPeriod, anchorDate);
  const wfPurchases = filterByPeriod(activePurchases, (p) => p.orderDate || p.createdAt, waterfallPeriod, anchorDate);

  const isWatchClient = (c: B2bClient) => c.creditLimit > 0 && (c.outstandingBalance || 0) / c.creditLimit >= 0.75;
  const outstandingReceivables = (receivablesScope === 'over75' ? b2bClients.filter(isWatchClient) : b2bClients)
    .reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

  const grossSalesHt = wfSales.reduce((s, d) => s + docSign(d) * (d.totalHtRaw || d.totalHtFinal || 0), 0);
  const discounts = wfSales.reduce((s, d) => s + docSign(d) * Math.max(0, (d.totalHtRaw || 0) - (d.totalHtFinal || 0)), 0);
  const purchasesTotal = wfPurchases.reduce((s, p) => s + (p.totalHt || p.totalTtc || 0), 0);
  const netTrading = grossSalesHt - discounts - purchasesTotal;

  const waterfallSteps: WaterfallStep[] =
    wfSales.length > 0 || wfPurchases.length > 0
      ? [
          { id: 'gross', label: pickText(language, 'Ventes B2B HT', 'B2B Sales', 'مبيعات الجملة'), value: Math.round(grossSalesHt), kind: 'total' },
          { id: 'disc', label: pickText(language, 'Remises', 'Discounts', 'التخفيضات'), value: -Math.round(discounts), kind: 'delta' },
          { id: 'purch', label: pickText(language, 'Achats / COGS', 'Purchases', 'المشتريات'), value: -Math.round(purchasesTotal), kind: 'delta' },
          { id: 'net', label: pickText(language, 'Marge négoce', 'Net Margin', 'صافي الهامش'), value: Math.round(netTrading), kind: 'total' },
        ]
      : [];

  const treemapItems: TreemapItem[] =
    treemapScope === 'warehouse' && warehouses.length > 0
      ? warehouses.map((w, i) => ({
          id: w.id,
          label: w.name,
          value: Math.round(w.totalValuationDzd || 0),
          color: PALETTE[i % PALETTE.length],
        }))
      : products
          .slice(0, 8)
          .map((p, i) => ({
            id: p.id,
            label: p.name,
            value: Math.round((p.stockQuantity || 0) * (p.costPrice ?? p.cost?.amount ?? p.price?.amount ?? 0)),
            color: PALETTE[i % PALETTE.length],
          }));

  const bulletClients = bulletsScope === 'watch' ? b2bClients.filter(isWatchClient) : b2bClients;
  const creditBullets: BulletItem[] = bulletClients.slice(0, 5).map((c) => ({
    id: c.id,
    label: c.companyName,
    value: Math.round(c.outstandingBalance || 0),
    target: Math.round(c.creditLimit || 0),
  }));

  const windowSales = filterByPeriod(activeSales, (d) => d.date || d.createdAt, period, anchorDate);
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
  const allBubblePoints: BubblePoint[] = b2bClients.map((c) => {
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
  const bubblePoints: BubblePoint[] =
    bubbleScope === 'watch' || bubbleScope === 'normal'
      ? allBubblePoints.filter((pt) => pt.groupId === bubbleScope)
      : allBubblePoints;

  const stackedBuckets: StackedBucket[] = flowSalesSeries.series.map((pt, i) => ({
    label: pt.label,
    values: {
      sales: Math.round(pt.value),
      purchases: Math.round(flowPurchaseSeries.series[i]?.value || 0),
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
