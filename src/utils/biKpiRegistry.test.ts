import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBiReportCsv,
  buildBiReportPrintHtml,
  buildCanonicalBiKpiDefinitions,
  canDispatchScheduledReportNow,
  computeReceivablesAgingBuckets,
  evaluateBiKpiRegistry,
  resolveBiPeriodBounds,
  validateBiScheduleRecipients,
} from './biKpiRegistry';
import type {
  BiSavedReport,
  Branch,
  Sale,
  StaffPayrollRunRecord,
  UnifiedDocument,
  UnifiedPayment,
  WmsStockLot,
} from '../types/index';

const anchor = new Date('2026-11-27T12:00:00.000Z');

test('evaluateBiKpiRegistry prevents double-counting bridged sales and computes period deltas', () => {
  const branches: Branch[] = [
    {
      id: 'br_1',
      accountId: 'acc_a',
      businessId: 'biz_1',
      name: 'Alger Centre',
      code: 'ALG',
      isMainBranch: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'br_2',
      accountId: 'acc_a',
      businessId: 'biz_1',
      name: 'Oran Est',
      code: 'ORN',
      isMainBranch: false,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  const unifiedDocuments: UnifiedDocument[] = [
    {
      id: 'ud_1',
      accountId: 'acc_a',
      businessId: 'biz_1',
      branchId: 'br_1',
      sourceVertical: 'trading_commercial',
      docType: 'facture',
      draftNumber: 'DRF-1',
      docNumber: 'FAC-2026-001',
      fiscalYear: 2026,
      status: 'PartiallyPaid',
      partyName: 'Client Alpha',
      docDate: '2026-11-20',
      dueDate: '2026-11-05',
      paymentMethod: 'bank_transfer',
      paymentTerms: '15d',
      currency: 'DZD',
      fxRate: 1,
      fxRateDate: '2026-11-20',
      timbreBasis: 'exempt',
      items: [],
      tvaBreakdown: [],
      totalHtRawCentimes: 1_000_000,
      generalDiscountPercent: 0,
      totalHtFinalCentimes: 1_000_000,
      totalTvaCentimes: 0,
      timbreFiscalCentimes: 0,
      totalTtcCentimes: 1_000_000, // 10,000 DZD
      guaranteeRetentionPercent: 0,
      guaranteeRetentionCentimes: 0,
      netToPayCentimes: 1_000_000,
      paidCentimes: 400_000,
      balanceDueCentimes: 600_000, // 6,000 DZD overdue (1-30d)
      fiscalHeaderSnapshot: { companyName: 'Biz' },
      totalsInWordsFr: '',
      totalsInWordsAr: '',
      includeStampSignature: false,
      sourceEntityType: 'sale',
      sourceEntityId: 'sale_bridged',
      printedCount: 1,
      createdAt: '2026-11-20T10:00:00Z',
      updatedAt: '2026-11-20T10:00:00Z',
    },
    {
      id: 'ud_cn_1',
      accountId: 'acc_a',
      businessId: 'biz_1',
      branchId: 'br_1',
      sourceVertical: 'trading_commercial',
      docType: 'avoir',
      draftNumber: 'AV-1',
      docNumber: 'AV-2026-001',
      fiscalYear: 2026,
      status: 'Issued',
      partyName: 'Client Alpha',
      docDate: '2026-11-22',
      paymentMethod: 'bank_transfer',
      paymentTerms: 'immediate',
      currency: 'DZD',
      fxRate: 1,
      fxRateDate: '2026-11-22',
      timbreBasis: 'exempt',
      items: [],
      tvaBreakdown: [],
      totalHtRawCentimes: 200_000,
      generalDiscountPercent: 0,
      totalHtFinalCentimes: 200_000,
      totalTvaCentimes: 0,
      timbreFiscalCentimes: 0,
      totalTtcCentimes: 200_000, // -2,000 DZD
      guaranteeRetentionPercent: 0,
      guaranteeRetentionCentimes: 0,
      netToPayCentimes: 200_000,
      paidCentimes: 0,
      balanceDueCentimes: 0,
      fiscalHeaderSnapshot: { companyName: 'Biz' },
      totalsInWordsFr: '',
      totalsInWordsAr: '',
      includeStampSignature: false,
      printedCount: 1,
      createdAt: '2026-11-22T10:00:00Z',
      updatedAt: '2026-11-22T10:00:00Z',
    },
  ];

  // Bridged sale MUST NOT be double-counted alongside ud_1; unbridged Oran sale IS counted
  const sales: Sale[] = [
    {
      id: 'sale_bridged',
      businessId: 'biz_1',
      branchId: 'br_1',
      tenantId: 'biz_1',
      facilityId: 'br_1',
      totalAmount: 10_000,
      paymentMethod: 'BankTransfer',
      items: [],
      createdAt: '2026-11-20T10:00:00Z',
      status: 'Completed',
    },
    {
      id: 'sale_oran',
      businessId: 'biz_1',
      branchId: 'br_2',
      tenantId: 'biz_1',
      facilityId: 'br_2',
      totalAmount: 5_000,
      paymentMethod: 'Cash',
      items: [],
      createdAt: '2026-11-21T10:00:00Z',
      status: 'Completed',
    },
  ];

  const unifiedPayments: UnifiedPayment[] = [
    {
      id: 'upay_1',
      accountId: 'acc_a',
      businessId: 'biz_1',
      branchId: 'br_1',
      sourceVertical: 'trading_commercial',
      partyName: 'Client Alpha',
      paymentNumber: 'PAY-1',
      method: 'bank_transfer',
      direction: 'inflow',
      amountCentimes: 400_000,
      unallocatedCreditCentimes: 0,
      currency: 'DZD',
      fxRate: 1,
      paymentDate: '2026-11-21',
      status: 'posted',
      allocations: [],
      createdAt: '2026-11-21T10:00:00Z',
      updatedAt: '2026-11-21T10:00:00Z',
    },
  ];

  const lots: WmsStockLot[] = [
    {
      id: 'lot_exp',
      accountId: 'acc_a',
      businessId: 'biz_1',
      branchId: 'br_1',
      productId: 'prod_1',
      productName: 'Oil',
      lotNumber: 'L1',
      expiryDate: '2026-12-05',
      qtyOnHand: 10,
      qtyReserved: 0,
      unitCostCentimes: 50_000,
      recallStatus: 'active',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
  ];

  const payrollRuns: StaffPayrollRunRecord[] = [
    {
      id: 'pr_1',
      accountId: 'acc_a',
      businessId: 'biz_1',
      branchId: 'br_1',
      periodMonth: 11,
      periodYear: 2026,
      title: 'Nov Payroll',
      status: 'approved',
      totalGrossCotisable: 4_000,
      totalCnasSalarial: 360,
      totalCnasPatronal: 1_040,
      totalIrg: 0,
      totalNet: 3_640,
      slipsCount: 1,
      createdAt: '2026-11-25T00:00:00Z',
      approvedAt: '2026-11-25T10:00:00Z',
    },
  ];

  const res = evaluateBiKpiRegistry({
    accountId: 'acc_a',
    businessId: 'biz_1',
    branches,
    definitions: buildCanonicalBiKpiDefinitions({ accountId: 'acc_a', businessId: 'biz_1' }),
    unifiedDocuments,
    unifiedPayments,
    sales,
    products: [],
    wmsStockLots: lots,
    payrollRuns,
    purchaseDocs: [],
    pmExpenses: [],
    freelanceExpenses: [],
    scfJournalEntries: [],
    preset: '30d',
    anchorDate: anchor,
  });

  // 10,000 - 2,000 (credit note) + 5,000 (Oran unbridged sale) = 13,000 DZD = 1,300,000 centimes
  assert.equal(res.metricsByCode.gross_invoiced_revenue, 1_300_000);
  // 4,000 (unifiedPayment) + 5,000 (Oran cash sale) = 9,000 DZD = 900,000 centimes
  assert.equal(res.metricsByCode.cash_collections, 900_000);
  assert.equal(res.metricsByCode.receivables_outstanding, 600_000);
  assert.equal(res.metricsByCode.inventory_valuation_cmup, 500_000);
  assert.equal(res.metricsByCode.expiring_stock_risk, 500_000);
  assert.equal(res.metricsByCode.workforce_payroll_cost, 504_000);

  // Aging bucket 1_30 should hold 600,000 centimes (due 2026-11-05 -> 22 days past due)
  const bucket130 = res.agingBuckets.find((b) => b.bucket === '1_30');
  assert.equal(bucket130?.amountCentimes, 600_000);
  assert.equal(bucket130?.docCount, 1);

  // Branch comparison breakdown
  assert.equal(res.branchComparison.length, 2);
  const alger = res.branchComparison.find((b) => b.branchId === 'br_1');
  const oran = res.branchComparison.find((b) => b.branchId === 'br_2');
  assert.equal(alger?.revenueCentimes, 800_000);
  assert.equal(oran?.revenueCentimes, 500_000);
});

test('CSV formula injection neutralization, print HTML escaping, recipient validation & schedule cooldown', () => {
  const bounds = resolveBiPeriodBounds({ preset: '30d', anchorDate: anchor });
  const csv = buildBiReportCsv({
    title: '=CMD|calc',
    bounds,
    evaluations: [
      {
        kpiCode: 'gross_invoiced_revenue',
        category: 'revenue',
        labelEn: 'Gross Revenue',
        labelFr: 'CA Brut',
        labelAr: 'الإيرادات',
        formulaSpec: 'SUM(invoices)',
        unitType: 'centimes',
        sourceTables: ['unified_documents'],
        currentValue: 100_000,
        previousValue: 50_000,
        deltaValue: 50_000,
        deltaPercent: 100,
        trend: 'up',
      },
    ],
    agingBuckets: computeReceivablesAgingBuckets({
      businessId: 'biz_1',
      unifiedDocuments: [],
      asOfMs: bounds.endMs,
    }),
    branchComparison: [],
  });
  assert.ok(csv.includes('"\'=CMD|calc"'));

  const html = buildBiReportPrintHtml({
    businessName: 'Atrium <Test>',
    reportTitle: 'Executive BI',
    bounds,
    evaluations: [],
    agingBuckets: [],
    branchComparison: [],
    printTemplate: { accentColor: '#C9461F', footerNote: 'NIF Test', showStamp: true },
  });
  assert.ok(html.includes('Atrium &lt;Test&gt;'));
  assert.ok(html.includes('#C9461F'));

  const emails = validateBiScheduleRecipients('ceo@atrium.dz, bad-email, cfo@atrium.dz');
  assert.deepEqual(emails.validEmails, ['ceo@atrium.dz', 'cfo@atrium.dz']);
  assert.deepEqual(emails.invalidEmails, ['bad-email']);

  const rep: BiSavedReport = {
    id: 'rep_1',
    accountId: 'acc_a',
    businessId: 'biz_1',
    title: 'Weekly',
    reportType: 'executive_overview',
    kpiCodes: ['gross_invoiced_revenue'],
    dateRangePreset: '7d',
    comparePreviousPeriod: true,
    scheduleRecipients: ['ceo@atrium.dz'],
    lastDispatchedAt: '2026-11-27T11:00:00.000Z',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-27T11:00:00Z',
  };
  assert.equal(canDispatchScheduledReportNow(rep, anchor.getTime()), false);
  assert.equal(canDispatchScheduledReportNow(rep, anchor.getTime() + 13 * 3600 * 1000), true);
});
