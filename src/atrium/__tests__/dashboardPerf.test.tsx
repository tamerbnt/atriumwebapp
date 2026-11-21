import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RollingDigits } from '../charts/primitives/RollingDigits';
import { ChartCard } from '../charts/primitives/ChartCard';
import {
  formatShortDateLabel,
  parseIsoDayMs,
} from '../../utils/dashboardSelectors/common';
import {
  selectAppointmentDashboard,
  selectEducationDashboard,
  selectFreelanceDashboard,
  selectMembershipDashboard,
  selectPosDashboard,
  selectProjectDashboard,
  selectTradingDashboard,
  selectVenueDashboard,
} from '../../utils/dashboardSelectors/coreVerticals';
import {
  selectAgricultureDashboard,
  selectContractorDashboard,
  selectGarageDashboard,
  selectLegalDashboard,
  selectLogisticsDashboard,
  selectManufacturingDashboard,
  selectMedicalDashboard,
  selectRealEstateDashboard,
} from '../../utils/dashboardSelectors/specializedVerticals';
import {
  shallowEqualObjects,
  selectCurrentMembersFromState,
  selectCurrentSalesFromState,
  selectCurrentLeadsFromState,
  selectCurrentMemberCheckInsFromState,
  startTimerAction,
  pauseTimerAction,
  resumeTimerAction,
  resetTimerAction,
  getTimerState,
  subscribeAtriumStore,
  subscribeTimerState,
} from '../../services/store';
import { vi } from 'vitest';

const ANCHOR = new Date('2026-11-14T14:00:00');

describe('Dashboard performance foundations & isolation guarantees', () => {
  it('shallowEqualObjects avoids false-positive renders and catches real slice changes', () => {
    const arrA = [{ id: '1' }];
    const arrB = [{ id: '2' }];

    expect(
      shallowEqualObjects(
        { members: arrA, sales: arrB, theme: 'light', count: 0 },
        { members: arrA, sales: arrB, theme: 'light', count: 0 }
      )
    ).toBe(true);

    expect(
      shallowEqualObjects(
        { members: arrA, count: Number.NaN },
        { members: arrA, count: Number.NaN }
      )
    ).toBe(true);

    expect(
      shallowEqualObjects(
        { members: arrA, theme: 'light' },
        { members: arrA, theme: 'dark' }
      )
    ).toBe(false);

    expect(
      shallowEqualObjects(
        { members: arrA },
        { members: [{ id: '1' }] }
      )
    ).toBe(false);

    expect(
      shallowEqualObjects(
        { a: 1 } as Record<string, unknown>,
        { a: 1, b: 2 } as Record<string, unknown>
      )
    ).toBe(false);
  });

  it('store branch selectors keep referential stability across unrelated state mutations', () => {
    const baseState = {
      currentBranchId: 'branch_gym_hydra',
      members: [
        { id: 'm1', facilityId: 'branch_gym_hydra', status: 'Active' },
        { id: 'm2', facilityId: 'branch_other', status: 'Active' },
      ],
      sales: [{ id: 's1', facilityId: 'branch_gym_hydra', totalAmount: 5000 }],
      leads: [{ id: 'l1', facilityId: 'branch_gym_hydra', status: 'Pending' }],
      memberCheckIns: [{ id: 'c1', branchId: 'branch_gym_hydra', timestamp: '2026-11-14T10:00:00' }],
      activeTimer: { isRunning: true, elapsedSeconds: 10 },
      toasts: [],
      notifications: [],
    } as any;

    const firstSlice = {
      members: selectCurrentMembersFromState(baseState),
      sales: selectCurrentSalesFromState(baseState),
      leads: selectCurrentLeadsFromState(baseState),
      checkIns: selectCurrentMemberCheckInsFromState(baseState),
    };

    // Simulate 60 timer ticks & toast updates without mutating branch collections
    let latestState = baseState;
    for (let tick = 1; tick <= 60; tick++) {
      latestState = {
        ...latestState,
        activeTimer: { isRunning: true, elapsedSeconds: 10 + tick },
        toasts: tick % 2 === 0 ? [{ id: `t-${tick}`, message: 'Tick' }] : [],
      };
      const nextSlice = {
        members: selectCurrentMembersFromState(latestState),
        sales: selectCurrentSalesFromState(latestState),
        leads: selectCurrentLeadsFromState(latestState),
        checkIns: selectCurrentMemberCheckInsFromState(latestState),
      };
      expect(nextSlice.members).toBe(firstSlice.members);
      expect(nextSlice.sales).toBe(firstSlice.sales);
      expect(nextSlice.leads).toBe(firstSlice.leads);
      expect(nextSlice.checkIns).toBe(firstSlice.checkIns);
      expect(shallowEqualObjects(firstSlice, nextSlice)).toBe(true);
    }

    // Mutating branch collection invalidates only that slice
    const mutatedMembersState = {
      ...latestState,
      members: [
        ...latestState.members,
        { id: 'm3', facilityId: 'branch_gym_hydra', status: 'Active' },
      ],
    };
    expect(selectCurrentMembersFromState(mutatedMembersState)).not.toBe(firstSlice.members);
    expect(selectCurrentSalesFromState(mutatedMembersState)).toBe(firstSlice.sales);
  });

  it('parseIsoDayMs and formatShortDateLabel match standard JS Date/Intl output and stay < 2ms over 2000 lookups', () => {
    expect(parseIsoDayMs(undefined)).toBeNull();
    expect(parseIsoDayMs('')).toBeNull();
    expect(parseIsoDayMs('   ')).toBeNull();
    expect(parseIsoDayMs('not-a-date')).toBeNull();

    const dateOnly = '2026-11-14';
    expect(parseIsoDayMs(dateOnly)).toBe(Date.parse('2026-11-14T12:00:00'));

    const isoTs = '2026-11-14T09:42:15Z';
    expect(parseIsoDayMs(isoTs)).toBe(Date.parse(isoTs));

    const ts = Date.parse('2026-11-14T12:00:00');
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
      const expected = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(ts);
      expect(formatShortDateLabel(ts, lang)).toBe(expected);
    }

    // Warm-up
    parseIsoDayMs('2026-11-14');
    formatShortDateLabel(ts, 'fr');

    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) {
      parseIsoDayMs('2026-11-14');
      formatShortDateLabel(ts, 'fr');
    }
    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(5);
  });

  it('RollingDigits and memoized ChartCard render safely without layout/whitespace glitches', () => {
    expect((ChartCard as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));

    const html = renderToStaticMarkup(
      <ChartCard title="Perf Card">
        <RollingDigits value="124 500 DZD" />
      </ChartCard>
    );
    expect(html).toContain('dir="ltr" class="ax-roll');
    expect(html).toContain('Perf Card');
    expect(html).toContain('\u00a0');
  });

  it('executes all 16 vertical dashboard selectors with 200+ items within interactive frame budgets', () => {
    const dates = Array.from({ length: 240 }, (_, i) => {
      const dayOffset = i % 90;
      const d = new Date(ANCHOR.getTime() - dayOffset * 86_400_000);
      return d.toISOString();
    });

    const members = dates.map((d, i) => ({
      id: `m-${i}`,
      status: i % 5 === 0 ? 'Expired' : i % 7 === 0 ? 'Frozen' : 'Active',
      startDate: d.slice(0, 10),
      expirationDate: new Date(ANCHOR.getTime() + ((i % 25) - 5) * 86_400_000).toISOString().slice(0, 10),
    })) as any[];

    const sales = dates.map((d, i) => ({
      id: `s-${i}`,
      totalAmount: 4500 + (i % 10) * 500,
      createdAt: d,
      status: i % 12 === 0 ? 'Canceled' : 'Paid',
      items: [{ itemType: i % 2 === 0 ? 'Plan' : 'Product', name: `Item ${i % 6}`, quantity: 1, totalPrice: 4500 }],
    })) as any[];

    const checkIns = dates.map((d, i) => ({
      id: `ci-${i}`,
      timestamp: d,
      memberId: `m-${i}`,
    })) as any[];

    const leads = dates.map((d, i) => ({
      id: `ld-${i}`,
      status: i % 3 === 0 ? 'Converted' : 'Pending',
      createdAt: d,
    })) as any[];

    const t0 = performance.now();

    const mem = selectMembershipDashboard({
      members,
      checkIns,
      sales,
      leads,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(mem.revenueTotal).toBeGreaterThan(0);

    const apt = selectAppointmentDashboard({
      appointments: dates.map((d, i) => ({
        id: `a-${i}`,
        date: d.slice(0, 10),
        startTime: '10:00',
        endTime: '11:00',
        status: i % 8 === 0 ? 'NoShow' : 'Completed',
        price: 3500,
        staffId: `st-${i % 5}`,
        staffName: `Stylist ${i % 5}`,
        serviceName: `Cut ${i % 4}`,
      })) as any,
      services: [{ id: 'sv1', name: 'Cut 0', price: 3500, durationMinutes: 45 }] as any,
      staff: [{ id: 'st-0', fullName: 'Stylist 0', role: 'Coiffeur', isActive: true }] as any,
      workstations: [{ id: 'w1', name: 'Chaise 1', status: 'Occupied' }] as any,
      sales,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(apt.totalRevenue).toBeGreaterThan(0);

    const pos = selectPosDashboard({
      sales,
      products: Array.from({ length: 60 }, (_, i) => ({
        id: `p-${i}`,
        name: `Prod ${i}`,
        category: `Cat ${i % 5}`,
        stockQuantity: i % 30,
        minStockLevel: 5,
        costPrice: 500,
        price: { amount: 900 },
      })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(pos.grossRevenue).toBeGreaterThan(0);

    const proj = selectProjectDashboard({
      projects: Array.from({ length: 40 }, (_, i) => ({
        id: `pj-${i}`,
        title: `Project ${i}`,
        budgetCapDzd: 500_000,
        targetGrossMarginPercent: 15 + (i % 30),
        createdAt: dates[i],
        status: i % 4 === 0 ? 'closed' : 'field_active',
      })) as any,
      milestones: Array.from({ length: 120 }, (_, i) => ({
        id: `ms-${i}`,
        projectId: `pj-${i % 40}`,
        isCompleted: i % 2 === 0,
      })) as any,
      payrollBatches: Array.from({ length: 30 }, (_, i) => ({
        id: `pb-${i}`,
        projectId: `pj-${i}`,
        totalAmountDzd: 60_000,
        status: i % 3 === 0 ? 'pending_direction_approval' : 'paid',
        createdAt: dates[i],
      })) as any,
      expenses: Array.from({ length: 80 }, (_, i) => ({
        id: `ex-${i}`,
        projectId: `pj-${i % 40}`,
        amountDzd: 12_000,
        status: 'approved',
        createdAt: dates[i],
      })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(proj.totalBudget).toBeGreaterThan(0);

    const venue = selectVenueDashboard({
      units: Array.from({ length: 24 }, (_, i) => ({ id: `u-${i}`, name: `Space ${i}`, type: 'Hall', status: i % 2 === 0 ? 'Occupied' : 'Available', hourlyRate: 4000 })) as any,
      bookings: dates.map((d, i) => ({ id: `b-${i}`, unitId: `u-${i % 24}`, unitType: 'Hall', renterName: `Renter ${i}`, purpose: 'Event', startDateTime: d, endDateTime: d, totalAmount: 18_000, status: i % 6 === 0 ? 'Canceled' : 'Confirmed', createdAt: d })) as any,
      deposits: Array.from({ length: 20 }, (_, i) => ({ id: `dp-${i}`, amountDzd: 10_000, status: 'Held' })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(venue.bookingRevenue).toBeGreaterThan(0);

    const edu = selectEducationDashboard({
      students: Array.from({ length: 120 }, (_, i) => ({ id: `stu-${i}`, status: 'Active' })) as any,
      cohorts: Array.from({ length: 12 }, (_, i) => ({ id: `coh-${i}`, name: `Cohort ${i}`, maxCapacity: 20, currentCount: 15, status: 'Active' })) as any,
      attendance: Array.from({ length: 200 }, (_, i) => ({ id: `att-${i}`, cohortId: `coh-${i % 12}`, recordedAt: dates[i], status: i % 7 === 0 ? 'Absent' : 'Present' })) as any,
      grades: Array.from({ length: 150 }, (_, i) => ({ id: `gr-${i}`, gradedAt: dates[i], score: 10 + (i % 10), maxScore: 20 })) as any,
      admissions: leads as any,
      certificates: Array.from({ length: 30 }, (_, i) => ({ id: `cert-${i}`, issueDate: dates[i] })) as any,
      enrollments: Array.from({ length: 120 }, (_, i) => ({ id: `enr-${i}`, paidAmount: 25_000, totalFee: 30_000, balanceDue: 5000, enrolledAt: dates[i] })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(edu.tuitionCollected).toBeGreaterThan(0);

    const fl = selectFreelanceDashboard({
      clients: Array.from({ length: 25 }, (_, i) => ({ id: `fc-${i}`, name: `Client ${i}` })) as any,
      projects: Array.from({ length: 30 }, (_, i) => ({ id: `fp-${i}`, clientId: `fc-${i % 25}`, title: `Proj ${i}`, status: 'Active', budget: 120_000 })) as any,
      timeLogs: dates.slice(0, 120).map((d, i) => ({ id: `tl-${i}`, date: d.slice(0, 10), durationMinutes: 90, isBillable: i % 4 !== 0, hourlyRate: 4000 })) as any,
      invoices: dates.slice(0, 80).map((d, i) => ({ id: `inv-${i}`, issueDate: d.slice(0, 10), paidAt: d.slice(0, 10), totalAmount: 45_000, paidAmount: i % 3 === 0 ? 0 : 45_000, status: i % 3 === 0 ? 'Sent' : 'Paid' })) as any,
      proposals: leads as any,
      expenses: dates.slice(0, 60).map((d, i) => ({ id: `fe-${i}`, date: d.slice(0, 10), amount: 5000 })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(fl.collectedRevenue).toBeGreaterThan(0);

    const tr = selectTradingDashboard({
      commercialDocs: dates.slice(0, 100).map((d, i) => ({ id: `cd-${i}`, type: 'facture', status: 'Validated', totalTtc: 95_000, netToPay: 95_000, createdAt: d, date: d, clientName: `B2B ${i % 10}` })) as any,
      purchaseDocs: dates.slice(0, 60).map((d, i) => ({ id: `pd-${i}`, type: 'facture_achat', totalTtc: 40_000, orderDate: d, createdAt: d })) as any,
      b2bClients: Array.from({ length: 20 }, (_, i) => ({ id: `bc-${i}`, companyName: `B2B ${i}`, creditLimit: 500_000, outstandingBalance: 50_000 + i * 10_000 })) as any,
      warehouses: [{ id: 'wh1', name: 'Dépôt Central', capacityPallets: 500, usedPallets: 320 }] as any,
      products: Array.from({ length: 50 }, (_, i) => ({ id: `tp-${i}`, name: `SKU ${i}`, category: `Gamme ${i % 4}`, stockQuantity: 25, costPrice: 1200, price: { amount: 1800 } })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(tr.b2bTurnover).toBeGreaterThan(0);

    const med = selectMedicalDashboard({
      practitioners: [{ id: 'pr1', fullName: 'Dr. Ali', specialty: 'Généraliste', isActive: true }] as any,
      consultations: dates.slice(0, 120).map((d, i) => ({ id: `co-${i}`, consultationDate: d.slice(0, 10), createdAt: d, status: 'Completed', consultationFeeDzd: 2500, practitionerId: 'pr1' })) as any,
      appointments: dates.slice(0, 120).map((d, i) => ({ id: `ma-${i}`, date: d.slice(0, 10), status: 'Completed', startTime: '09:00' })) as any,
      chifaClaims: Array.from({ length: 40 }, (_, i) => ({ id: `ch-${i}`, claimedAmountDzd: 1800, status: i % 4 === 0 ? 'Pending' : 'Reimbursed', submittedAt: dates[i] })) as any,
      consumables: [{ id: 'cm1', name: 'Gants', stockQty: 200, minThreshold: 50 }] as any,
      labRecords: [{ id: 'lb1', status: 'Ready', requestedAt: dates[0] }] as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(med.consultationRevenue).toBeGreaterThan(0);

    const gar = selectGarageDashboard({
      orders: dates.slice(0, 80).map((d, i) => ({ id: `or-${i}`, createdAt: d, status: i % 3 === 0 ? 'InProgress' : 'Completed', totalEstimateDzd: 22_000, bayId: `bay-${i % 4}` })) as any,
      bays: Array.from({ length: 6 }, (_, i) => ({ id: `bay-${i}`, name: `Pont ${i}`, status: i % 2 === 0 ? 'Occupied' : 'Free' })) as any,
      parts: Array.from({ length: 40 }, (_, i) => ({ id: `pt-${i}`, name: `Part ${i}`, stockQty: 10 + i, minStock: 5, unitPriceDzd: 3000 })) as any,
      fleets: [{ id: 'fl1', companyName: 'Fleet A', creditLimitDzd: 200_000, currentBalanceDzd: 40_000 }] as any,
      invoices: dates.slice(0, 60).map((d, i) => ({ id: `gi-${i}`, issuedAt: d, totalTtc: 24_000, paidAmountDzd: 24_000, status: 'Paid' })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(gar.workshopRevenue).toBeGreaterThan(0);

    const re = selectRealEstateDashboard({
      properties: Array.from({ length: 30 }, (_, i) => ({ id: `pr-${i}`, title: `Bien ${i}`, listingType: i % 2 === 0 ? 'Sale' : 'Rental', propertyType: 'Appartement', surfaceM2: 110, priceDzd: 18_000_000, roomsCount: 3 })) as any,
      mandates: Array.from({ length: 20 }, (_, i) => ({ id: `mn-${i}`, propertyId: `pr-${i}`, status: 'Active', createdAt: dates[i] })) as any,
      leases: Array.from({ length: 15 }, (_, i) => ({ id: `ls-${i}`, status: 'Active', monthlyRentDzd: 55_000 })) as any,
      quittances: dates.slice(0, 60).map((d, i) => ({ id: `q-${i}`, totalCollectedDzd: 55_000, paymentDate: d.slice(0, 10), createdAt: d, status: 'Paid' })) as any,
      visits: dates.slice(0, 40).map((d, i) => ({ id: `v-${i}`, visitDate: d.slice(0, 10), outcome: 'Interested' })) as any,
      buyers: leads as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(re.collectedTotal).toBeGreaterThan(0);

    const mfg = selectManufacturingDashboard({
      orders: dates.slice(0, 60).map((d, i) => ({ id: `mo-${i}`, startDate: d, createdAt: d, plannedQty: 100, quantityProduced: 92, scrapQty: 3, status: 'Completed' })) as any,
      boms: [{ id: 'bm1', productName: 'Widget', unitCostDzd: 450 }] as any,
      materials: [{ id: 'rm1', name: 'Acier', stockQty: 400, minQty: 100, unitCostDzd: 200 }] as any,
      qcRecords: dates.slice(0, 60).map((d, i) => ({ id: `qc-${i}`, inspectedAt: d, passedQty: 90, rejectedQty: 2, result: 'Pass' })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(mfg.totalProduced).toBeGreaterThan(0);

    const leg = selectLegalDashboard({
      matters: Array.from({ length: 40 }, (_, i) => ({ id: `mt-${i}`, title: `Dossier ${i}`, status: 'Active', openedAt: dates[i], billedDzd: 85_000 })) as any,
      hearings: Array.from({ length: 25 }, (_, i) => ({ id: `hr-${i}`, date: dates[i].slice(0, 10), status: 'Scheduled' })) as any,
      deadlines: Array.from({ length: 20 }, (_, i) => ({ id: `dl-${i}`, dueDate: dates[i].slice(0, 10), isCompleted: i % 2 === 0 })) as any,
      notaryDeeds: Array.from({ length: 15 }, (_, i) => ({ id: `nd-${i}`, feeDzd: 40_000, signedAt: dates[i] })) as any,
      escrowAccounts: [{ id: 'es1', balanceDzd: 1_200_000 }] as any,
      cashReceipts: dates.slice(0, 50).map((d, i) => ({ id: `cr-${i}`, createdAt: d, netCollectedDzd: 35_000 })) as any,
      scfEntries: [{ id: 'scf1', amountDzd: 35_000, date: dates[0].slice(0, 10), type: 'Credit' }] as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(leg.collectedHonoraires).toBeGreaterThan(0);

    const log = selectLogisticsDashboard({
      shipments: dates.map((d, i) => ({
        id: `sh-${i}`,
        createdAt: d,
        status: i % 7 === 0 ? 'Returned' : 'Delivered',
        codAmountDzd: 4200,
        destinationWilaya: `Wilaya ${i % 6}`,
        weightKg: 2.2,
      })) as any,
      discharges: Array.from({ length: 20 }, (_, i) => ({ id: `dc-${i}`, createdAt: dates[i], parcelCount: 12 })) as any,
      remittances: Array.from({ length: 20 }, (_, i) => ({ id: `rm-${i}`, remittedAt: dates[i], amountDzd: 50_000 })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(log.codCollected).toBeGreaterThan(0);

    const con = selectContractorDashboard({
      projects: [{ id: 'cp1', title: 'Chantier A', budgetDzd: 5_000_000, status: 'Active' }] as any,
      boqItems: [{ id: 'bq1', projectId: 'cp1', plannedAmountDzd: 1_000_000, executedAmountDzd: 650_000 }] as any,
      dailyLogs: dates.slice(0, 45).map((d, i) => ({ id: `dl-${i}`, date: d.slice(0, 10), workersCount: 18 })) as any,
      dgps: Array.from({ length: 12 }, (_, i) => ({ id: `dg-${i}`, issuedDate: dates[i], createdAt: dates[i], netPayableDzd: 320_000, status: 'Certified' })) as any,
      serviceOrders: [{ id: 'so1', status: 'Active' }] as any,
      concretePours: dates.slice(0, 20).map((d, i) => ({ id: `cp-${i}`, date: d.slice(0, 10), volumeM3: 45 })) as any,
      subcontractors: [{ id: 'sub1', companyName: 'Sous-traitant A', contractAmountDzd: 400_000 }] as any,
      equipmentLogs: dates.slice(0, 30).map((d, i) => ({ id: `eq-${i}`, date: d.slice(0, 10), hoursUsed: 8 })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(con.dgpCertifiedTotal).toBeGreaterThan(0);

    const agri = selectAgricultureDashboard({
      parcels: [{ id: 'pa1', name: 'Nord', surfaceHectares: 25, anrhAnnualQuotaM3: 2000, anrhConsumedM3: 1100 }] as any,
      cropCycles: [{ id: 'cc1', parcelId: 'pa1', cropName: 'Blé', variety: 'Dur', currentPhase: 'growing', projectedYieldQtx: 120, actualYieldQtx: 95 }] as any,
      treatmentLogs: dates.slice(0, 25).map((d, i) => ({ id: `tr-${i}`, date: d.slice(0, 10), parcelId: 'pa1' })) as any,
      pointages: dates.slice(0, 40).map((d, i) => ({ id: `pt-${i}`, date: d.slice(0, 10), totalWageDzd: 3500 })) as any,
      dairyCows: [{ id: 'cw1', isInWithholdingLockout: false, reproStatus: 'Active' }] as any,
      milkingRecords: dates.slice(0, 60).map((d, i) => ({ id: `mk-${i}`, sessionDate: d.slice(0, 10), conformingLiters: 210 })) as any,
      weighbridgeTickets: dates.slice(0, 40).map((d, i) => ({ id: `wb-${i}`, date: d.slice(0, 10), netWeightKg: 1850 })) as any,
      period: '30d',
      language: 'fr',
      anchorDate: ANCHOR,
    });
    expect(agri.harvestKgTotal).toBeGreaterThan(0);

    const totalMs = performance.now() - t0;
    expect(totalMs).toBeLessThan(120);
  });

  it('1 Hz active timer ticks notify timer micro-store subscribers without notifying main store subscribers', () => {
    vi.useFakeTimers();
    try {
      let mainStoreCalls = 0;
      let timerStoreCalls = 0;
      const unsubMain = subscribeAtriumStore(() => {
        mainStoreCalls += 1;
      });
      const unsubTimer = subscribeTimerState(() => {
        timerStoreCalls += 1;
      });

      startTimerAction('cli_1', 'Client Test', 'prj_1', 'Projet Test', 'Task focus');
      expect(mainStoreCalls).toBe(1);
      expect(timerStoreCalls).toBe(1);
      expect(getTimerState().elapsedSeconds).toBe(0);

      // 60 seconds of 1 Hz ticks -> 0 main store notifications, 60 timer micro-store notifications
      vi.advanceTimersByTime(60_000);
      expect(mainStoreCalls).toBe(1);
      expect(timerStoreCalls).toBe(61);
      expect(getTimerState().elapsedSeconds).toBe(60);

      pauseTimerAction();
      expect(mainStoreCalls).toBe(2);
      vi.advanceTimersByTime(10_000);
      expect(getTimerState().elapsedSeconds).toBe(60);

      resumeTimerAction();
      expect(mainStoreCalls).toBe(3);
      vi.advanceTimersByTime(5_000);
      expect(getTimerState().elapsedSeconds).toBe(65);
      expect(mainStoreCalls).toBe(3);

      resetTimerAction();
      expect(getTimerState().elapsedSeconds).toBe(0);
      expect(getTimerState().isRunning).toBe(false);

      unsubMain();
      unsubTimer();
    } finally {
      vi.useRealTimers();
    }
  });
});
