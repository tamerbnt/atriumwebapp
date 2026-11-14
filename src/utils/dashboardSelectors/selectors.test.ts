import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailySparkSeries,
  buildHourlyWeekdayMatrix,
  computeDeltaPercent,
  getPeriodRange,
  pickText,
  resolveChartState,
} from './common.ts';
import {
  selectAppointmentDashboard,
  selectEducationDashboard,
  selectFreelanceDashboard,
  selectMembershipDashboard,
  selectPosDashboard,
  selectProjectDashboard,
  selectTradingDashboard,
  selectVenueDashboard,
} from './coreVerticals.ts';
import {
  selectAgricultureDashboard,
  selectContractorDashboard,
  selectGarageDashboard,
  selectLegalDashboard,
  selectLogisticsDashboard,
  selectManufacturingDashboard,
  selectMedicalDashboard,
  selectRealEstateDashboard,
} from './specializedVerticals.ts';

const ANCHOR = new Date('2026-11-14T14:00:00');

test('common windowing, delta math, and resolveChartState handle empty & boundaries honestly', () => {
  const r7 = getPeriodRange('7d', ANCHOR);
  assert.equal(r7.days, 7);
  assert.ok(r7.endMs > r7.startMs);
  assert.ok(r7.prevEndMs < r7.startMs);

  assert.equal(computeDeltaPercent(120, 100), 20);
  assert.equal(computeDeltaPercent(80, 100), -20);
  assert.equal(computeDeltaPercent(50, 0), 100);
  assert.equal(computeDeltaPercent(0, 0), 0);

  assert.equal(resolveChartState(false, false, false), 'empty');
  assert.equal(resolveChartState(true, true, false), 'loading');
  assert.equal(resolveChartState(true, false, true), 'error');
  assert.equal(resolveChartState(true, false, false), 'ready');

  assert.equal(pickText('fr', 'A', 'B', 'C'), 'A');
  assert.equal(pickText('en', 'A', 'B', 'C'), 'B');
  assert.equal(pickText('ar', 'A', 'B', 'C'), 'C');

  const emptySpark = buildDailySparkSeries([], () => '', () => 0, '30d', 'fr', ANCHOR);
  assert.equal(emptySpark.currentTotal, 0);
  assert.equal(emptySpark.deltaPercent, 0);

  const emptyHeat = buildHourlyWeekdayMatrix([], () => undefined, 'en');
  assert.equal(emptyHeat.hasAny, false);
});

test('buildDailySparkSeries filters strictly by active timeframe (today vs 7d vs 30d vs year)', () => {
  const items = [
    { date: '2026-11-14', amount: 100 }, // today
    { date: '2026-11-10', amount: 250 }, // within 7d
    { date: '2026-10-25', amount: 400 }, // within 30d
    { date: '2026-03-01', amount: 1000 }, // within year
  ];
  const todayRes = buildDailySparkSeries(items, (x) => x.date, (x) => x.amount, 'today', 'fr', ANCHOR);
  const d7Res = buildDailySparkSeries(items, (x) => x.date, (x) => x.amount, '7d', 'fr', ANCHOR);
  const d30Res = buildDailySparkSeries(items, (x) => x.date, (x) => x.amount, '30d', 'fr', ANCHOR);
  const yearRes = buildDailySparkSeries(items, (x) => x.date, (x) => x.amount, 'year', 'fr', ANCHOR);

  assert.equal(todayRes.currentTotal, 100);
  assert.equal(d7Res.currentTotal, 350);
  assert.equal(d30Res.currentTotal, 750);
  assert.equal(yearRes.currentTotal, 1750);
});

test('all 8 core vertical selectors return honest zero/empty payloads on empty collections', () => {
  const mem = selectMembershipDashboard({ members: [], checkIns: [], sales: [], leads: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(mem.revenueTotal, 0);
  assert.equal(mem.funnelStages.length, 0);
  assert.equal(mem.cohorts.length, 0);
  assert.equal(mem.hasCheckIns, false);

  const apt = selectAppointmentDashboard({ appointments: [], services: [], staff: [], workstations: [], sales: [], period: '30d', language: 'en', anchorDate: ANCHOR });
  assert.equal(apt.totalRevenue, 0);
  assert.equal(apt.donutSegments.length, 0);
  assert.equal(apt.rankedStylists.length, 0);

  const pos = selectPosDashboard({ sales: [], products: [], period: '30d', language: 'ar', anchorDate: ANCHOR });
  assert.equal(pos.grossRevenue, 0);
  assert.equal(pos.waterfallSteps.length, 0);
  assert.equal(pos.treemapItems.length, 0);

  const proj = selectProjectDashboard({ projects: [], milestones: [], payrollBatches: [], expenses: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(proj.totalBudget, 0);
  assert.equal(proj.waterfallSteps.length, 0);
  assert.equal(proj.rankedProjects.length, 0);

  const venue = selectVenueDashboard({ units: [], bookings: [], deposits: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(venue.bookingRevenue, 0);
  assert.equal(venue.donutSegments.length, 0);

  const edu = selectEducationDashboard({ students: [], cohorts: [], attendance: [], grades: [], admissions: [], certificates: [], enrollments: [], period: '30d', language: 'en', anchorDate: ANCHOR });
  assert.equal(edu.tuitionCollected, 0);
  assert.equal(edu.gradeBins.length, 0);
  assert.equal(edu.funnelStages.length, 0);

  const fl = selectFreelanceDashboard({ clients: [], projects: [], timeLogs: [], invoices: [], proposals: [], expenses: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(fl.collectedRevenue, 0);
  assert.equal(fl.funnelStages.length, 0);

  const tr = selectTradingDashboard({ commercialDocs: [], purchaseDocs: [], b2bClients: [], warehouses: [], products: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(tr.b2bTurnover, 0);
  assert.equal(tr.waterfallSteps.length, 0);
  assert.equal(tr.treemapItems.length, 0);
});

test('all 8 specialized vertical selectors return honest zero/empty payloads on empty collections (no fake defaults)', () => {
  const med = selectMedicalDashboard({ practitioners: [], consultations: [], appointments: [], chifaClaims: [], consumables: [], labRecords: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(med.consultationRevenue, 0);
  assert.equal(med.radarAxes.length, 0);
  assert.equal(med.funnelStages.length, 0);

  const gar = selectGarageDashboard({ orders: [], bays: [], parts: [], fleets: [], invoices: [], period: '30d', language: 'en', anchorDate: ANCHOR });
  assert.equal(gar.workshopRevenue, 0);
  assert.equal(gar.totalBays, 0);
  assert.equal(gar.waterfallSteps.length, 0);

  const re = selectRealEstateDashboard({ properties: [], mandates: [], leases: [], quittances: [], visits: [], buyers: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(re.collectedTotal, 0);
  assert.equal(re.funnelStages.length, 0);

  const mfg = selectManufacturingDashboard({ orders: [], boms: [], materials: [], qcRecords: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(mfg.totalProduced, 0);
  assert.equal(mfg.radarAxes.length, 0);

  const leg = selectLegalDashboard({ matters: [], hearings: [], deadlines: [], notaryDeeds: [], escrowAccounts: [], cashReceipts: [], scfEntries: [], period: '30d', language: 'ar', anchorDate: ANCHOR });
  assert.equal(leg.collectedHonoraires, 0);
  assert.equal(leg.funnelStages.length, 0);

  const log = selectLogisticsDashboard({ shipments: [], discharges: [], remittances: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(log.codCollected, 0);
  assert.equal(log.weightBins.length, 0);

  const con = selectContractorDashboard({ projects: [], boqItems: [], dailyLogs: [], dgps: [], serviceOrders: [], concretePours: [], subcontractors: [], equipmentLogs: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(con.dgpCertifiedTotal, 0);
  assert.equal(con.waterfallSteps.length, 0);

  const agri = selectAgricultureDashboard({ parcels: [], cropCycles: [], treatmentLogs: [], pointages: [], dairyCows: [], milkingRecords: [], weighbridgeTickets: [], period: '30d', language: 'fr', anchorDate: ANCHOR });
  assert.equal(agri.harvestKgTotal, 0);
  assert.equal(agri.radarAxes.length, 0);
});

test('selectProjectDashboard ranks projects strictly by descending targetGrossMarginPercent and computes real waterfall', () => {
  const res = selectProjectDashboard({
    projects: [
      { id: 'p1', title: 'Alpha', targetGrossMarginPercent: 18, budgetCapDzd: 100000, createdAt: '2026-11-10' },
      { id: 'p2', title: 'Beta', targetGrossMarginPercent: 42, budgetCapDzd: 200000, createdAt: '2026-11-11' },
      { id: 'p3', title: 'Gamma', targetGrossMarginPercent: 27, budgetCapDzd: 150000, createdAt: '2026-11-12' },
    ] as any,
    milestones: [
      { id: 'm1', isCompleted: true },
      { id: 'm2', isCompleted: false },
    ] as any,
    payrollBatches: [{ id: 'b1', projectId: 'p2', totalAmountDzd: 50000, status: 'pending_direction_approval' }] as any,
    expenses: [{ id: 'e1', projectId: 'p1', amountDzd: 25000, status: 'approved' }] as any,
    period: '30d',
    language: 'en',
    anchorDate: ANCHOR,
  });

  assert.deepEqual(
    res.rankedProjects.map((r) => r.id),
    ['p2', 'p3', 'p1']
  );
  assert.equal(res.pendingApprovals, 1);
  assert.equal(res.totalBudget, 450000);
  assert.equal(res.waterfallSteps[0].value, 450000);
  assert.equal(res.waterfallSteps[3].value, 375000);
});
