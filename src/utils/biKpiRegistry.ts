import type {
  BiAgingBucketKey,
  BiAgingBucketSummary,
  BiBranchComparisonRow,
  BiDateRangePreset,
  BiKpiDefinition,
  BiKpiEvaluation,
  BiSavedReport,
  Branch,
  FreelanceExpense,
  PMExpense,
  PlatformPrintTemplate,
  Product,
  PurchaseDocument,
  Sale,
  ScfJournalEntry,
  StaffAttendanceLogRecord,
  StaffPayrollRunRecord,
  SupportedLanguage,
  UnifiedDocument,
  UnifiedPayment,
  WmsStockLot,
} from '../types/index';
import { centimesToDzd, dzdToCentimes } from './money';

const DAY_MS = 86_400_000;

export function buildCanonicalBiKpiDefinitions(params: {
  accountId: string;
  businessId?: string;
}): BiKpiDefinition[] {
  const now = new Date().toISOString();
  const base = (
    kpiCode: string,
    category: BiKpiDefinition['category'],
    labelEn: string,
    labelFr: string,
    labelAr: string,
    formulaSpec: string,
    unitType: BiKpiDefinition['unitType'],
    sourceTables: string[],
    targetValue?: number | null
  ): BiKpiDefinition => ({
    id: `bikpi_${params.businessId || 'global'}_${kpiCode}`,
    accountId: params.accountId,
    businessId: params.businessId,
    kpiCode,
    category,
    labelEn,
    labelFr,
    labelAr,
    formulaSpec,
    unitType,
    sourceTables,
    targetValue: targetValue ?? null,
    isActive: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return [
    base(
      'gross_invoiced_revenue',
      'revenue',
      'Gross Invoiced Revenue',
      'Chiffre d’affaires facturé',
      'الإيرادات المفوترة الإجمالية',
      'SUM(issued invoices − credit notes) + unbridged settled sales',
      'centimes',
      ['unified_documents', 'sales'],
      15_000_000
    ),
    base(
      'cash_collections',
      'collections',
      'Cleared Cash Collections',
      'Encaissements nets validés',
      'التحصيلات النقدية المعتمدة',
      'SUM(posted inbound unified_payments − bounced/reversed) + unbridged settled sales',
      'centimes',
      ['unified_payments', 'sales'],
      12_000_000
    ),
    base(
      'receivables_outstanding',
      'receivables',
      'Open Receivables Balance',
      'Créances clients ouvertes',
      'الذمم المدينة المفتوحة',
      'SUM(balance_due_centimes on unpaid issued invoices)',
      'centimes',
      ['unified_documents'],
      0
    ),
    base(
      'collection_efficiency_pct',
      'collections',
      'Collection Ratio (%)',
      'Taux d’encaissement (%)',
      'نسبة التحصيل (%)',
      '(cash_collections / MAX(1, gross_invoiced_revenue)) × 100',
      'percent',
      ['unified_documents', 'unified_payments', 'sales'],
      85
    ),
    base(
      'inventory_valuation_cmup',
      'inventory',
      'Inventory Valuation (CMUP)',
      'Valorisation stock (CMUP)',
      'تقييم المخزون (CMUP)',
      'SUM(wms_stock_lots qty_on_hand × unit_cost) + unlotted products cost',
      'centimes',
      ['wms_stock_lots', 'pos_products'],
      null
    ),
    base(
      'expiring_stock_risk',
      'inventory',
      'Expiring Stock Risk (30d)',
      'Stock à risque péremption (30j)',
      'مخزون قريب الانتهاء (30 يوم)',
      'SUM(qty_on_hand × unit_cost_centimes for lots expiring ≤ 30d)',
      'centimes',
      ['wms_stock_lots'],
      0
    ),
    base(
      'workforce_payroll_cost',
      'workforce',
      'Employer Payroll Cost',
      'Masse salariale employeur',
      'تكلفة الرواتب الإجمالية',
      'SUM(total_gross_cotisable + cnas_patronal on approved/paid runs)',
      'centimes',
      ['hr_payroll_runs'],
      null
    ),
    base(
      'operating_expenses_scf',
      'operations',
      'Operating Spend & Purchases',
      'Charges & achats d’exploitation',
      'مصاريف التشغيل والمشتريات',
      'SUM(approved purchases + PM/freelance expenses + Class 6 SCF debits)',
      'centimes',
      ['purchase_documents', 'pm_expenses', 'freelance_expenses', 'scf_journal_entries'],
      null
    ),
    base(
      'net_operating_margin_pct',
      'revenue',
      'Net Operating Margin (%)',
      'Marge nette d’exploitation (%)',
      'صافي هامش التشغيل (%)',
      '((gross_invoiced_revenue − operating_expenses − payroll) / revenue) × 100',
      'percent',
      ['unified_documents', 'scf_journal_entries', 'hr_payroll_runs'],
      22
    ),
  ];
}

export interface BiPeriodBounds {
  periodStart: string;
  periodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
  startMs: number;
  endMs: number;
  prevStartMs: number;
  prevEndMs: number;
}

function toDayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function parseIsoTimeMs(iso?: string | null): number | null {
  if (!iso || typeof iso !== 'string') return null;
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00.000Z` : trimmed;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

export function resolveBiPeriodBounds(params: {
  preset: BiDateRangePreset;
  customStart?: string;
  customEnd?: string;
  anchorDate?: Date;
}): BiPeriodBounds {
  const anchor = params.anchorDate ? new Date(params.anchorDate.getTime()) : new Date();
  const anchorEnd = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 23, 59, 59, 999);
  const anchorStartOfDay = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 0, 0, 0, 0);

  let startMs = anchorStartOfDay - 29 * DAY_MS;
  let endMs = anchorEnd;

  if (params.preset === 'today') {
    startMs = anchorStartOfDay;
  } else if (params.preset === '7d') {
    startMs = anchorStartOfDay - 6 * DAY_MS;
  } else if (params.preset === '30d') {
    startMs = anchorStartOfDay - 29 * DAY_MS;
  } else if (params.preset === '90d') {
    startMs = anchorStartOfDay - 89 * DAY_MS;
  } else if (params.preset === 'ytd') {
    startMs = Date.UTC(anchor.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  } else if (params.preset === 'custom' && params.customStart && params.customEnd) {
    const s = parseIsoTimeMs(`${params.customStart.slice(0, 10)}T00:00:00.000Z`);
    const e = parseIsoTimeMs(`${params.customEnd.slice(0, 10)}T23:59:59.999Z`);
    if (s !== null && e !== null && e >= s) {
      startMs = s;
      endMs = e;
    }
  }

  const spanMs = Math.max(DAY_MS, endMs - startMs + 1);
  const prevEndMs = startMs - 1;
  const prevStartMs = prevEndMs - spanMs + 1;

  return {
    periodStart: toDayString(startMs),
    periodEnd: toDayString(endMs),
    previousPeriodStart: toDayString(prevStartMs),
    previousPeriodEnd: toDayString(prevEndMs),
    startMs,
    endMs,
    prevStartMs,
    prevEndMs,
  };
}

export interface BiEvaluationInput {
  accountId: string;
  businessId: string;
  branchIdFilter?: string; // undefined or 'all' => all branches
  branches: Branch[];
  definitions?: BiKpiDefinition[];
  unifiedDocuments: UnifiedDocument[];
  unifiedPayments: UnifiedPayment[];
  sales: Sale[];
  products: Product[];
  wmsStockLots: WmsStockLot[];
  payrollRuns: StaffPayrollRunRecord[];
  attendanceLogs?: StaffAttendanceLogRecord[];
  purchaseDocs: PurchaseDocument[];
  pmExpenses: PMExpense[];
  freelanceExpenses: FreelanceExpense[];
  scfJournalEntries: ScfJournalEntry[];
  preset: BiDateRangePreset;
  customStart?: string;
  customEnd?: string;
  anchorDate?: Date;
}

function isInWindow(iso: string | undefined, minMs: number, maxMs: number): boolean {
  const ms = parseIsoTimeMs(iso);
  return ms !== null && ms >= minMs && ms <= maxMs;
}

function isBranchMatch(itemBranchId: string | undefined, filter: string | undefined): boolean {
  if (!filter || filter === 'all') return true;
  return itemBranchId === filter;
}

function isActiveIssuedDoc(doc: UnifiedDocument): boolean {
  return doc.status !== 'Draft' && doc.status !== 'Voided' && doc.status !== 'Canceled';
}

function computeWindowCoreMetrics(
  input: BiEvaluationInput,
  minMs: number,
  maxMs: number,
  branchFilter: string | undefined
): {
  revenueCentimes: number;
  collectionsCentimes: number;
  receivablesCentimes: number;
  collectionEfficiencyPct: number;
  inventoryValuationCentimes: number;
  expiringStockRiskCentimes: number;
  payrollCostCentimes: number;
  operatingExpensesCentimes: number;
  netOperatingMarginPct: number;
  activeDocsCount: number;
} {
  // 1. Track legacy sale IDs already represented in unified_documents to guarantee zero double-counting
  const bridgedSaleIds = new Set<string>();
  for (const doc of input.unifiedDocuments || []) {
    if (doc.sourceEntityType === 'sale' && doc.sourceEntityId) {
      bridgedSaleIds.add(doc.sourceEntityId);
    }
  }

  let revenueCentimes = 0;
  let receivablesCentimes = 0;
  let activeDocsCount = 0;

  for (const doc of input.unifiedDocuments || []) {
    if (doc.businessId !== input.businessId) continue;
    if (!isBranchMatch(doc.branchId, branchFilter)) continue;
    if (!isActiveIssuedDoc(doc)) continue;

    if (
      doc.docType === 'facture' ||
      doc.docType === 'avoir' ||
      doc.docType === 'receipt' ||
      doc.docType === 'retour'
    ) {
      const sign = doc.docType === 'avoir' || doc.docType === 'retour' ? -1 : 1;
      if (isInWindow(doc.docDate || doc.createdAt, minMs, maxMs)) {
        revenueCentimes += sign * Math.round(doc.totalTtcCentimes || 0);
        activeDocsCount += 1;
      }
      if (doc.docType === 'facture' && doc.status !== 'Paid' && (doc.balanceDueCentimes || 0) > 0) {
        // Receivables snapshot uses all open unpaid issued invoices dated <= periodEnd
        const docMs = parseIsoTimeMs(doc.docDate || doc.createdAt);
        if (docMs !== null && docMs <= maxMs) {
          receivablesCentimes += Math.round(doc.balanceDueCentimes || 0);
        }
      }
    }
  }

  for (const s of input.sales || []) {
    if (s.businessId && s.businessId !== input.businessId) continue;
    if (!isBranchMatch(s.branchId, branchFilter)) continue;
    if (s.status === 'Voided' || s.status === 'Refunded') continue;
    if (bridgedSaleIds.has(s.id)) continue;
    if (isInWindow(s.createdAt, minMs, maxMs)) {
      const amtCentimes = dzdToCentimes(s.totalAmount || 0);
      revenueCentimes += amtCentimes;
      activeDocsCount += 1;
    }
  }

  // 2. Collections: posted inbound unifiedPayments + unbridged settled cash/card sales
  const paymentDocsInSales = new Set<string>();
  let collectionsCentimes = 0;
  for (const p of input.unifiedPayments || []) {
    if (p.businessId !== input.businessId) continue;
    if (!isBranchMatch(p.branchId, branchFilter)) continue;
    if (p.direction !== 'inflow') continue;
    if (p.status === 'bounced' || p.status === 'reversed' || p.status === 'pending_clearance') continue;
    if (isInWindow(p.paymentDate || p.createdAt, minMs, maxMs)) {
      collectionsCentimes += Math.round(p.amountCentimes || 0);
      for (const a of p.allocations || []) {
        paymentDocsInSales.add(a.documentId);
      }
    }
  }
  for (const s of input.sales || []) {
    if (s.businessId && s.businessId !== input.businessId) continue;
    if (!isBranchMatch(s.branchId, branchFilter)) continue;
    if (s.status === 'Voided' || s.status === 'Refunded') continue;
    if (bridgedSaleIds.has(s.id) || paymentDocsInSales.has(s.id)) continue;
    if (s.paymentMethod !== 'Credit' && isInWindow(s.createdAt, minMs, maxMs)) {
      collectionsCentimes += dzdToCentimes(s.totalAmount || 0);
    }
  }

  const collectionEfficiencyPct =
    revenueCentimes > 0
      ? Math.round((collectionsCentimes / revenueCentimes) * 1000) / 10
      : 0;

  // 3. Inventory CMUP Valuation + 30-day expiry risk
  let inventoryValuationCentimes = 0;
  let expiringStockRiskCentimes = 0;
  const lotProductIds = new Set<string>();
  const expiryHorizonMs = maxMs + 30 * DAY_MS;

  for (const lot of input.wmsStockLots || []) {
    if (lot.businessId !== input.businessId) continue;
    if (!isBranchMatch(lot.branchId, branchFilter)) continue;
    if (lot.qtyOnHand <= 0) continue;
    lotProductIds.add(lot.productId);
    const val = Math.round(lot.qtyOnHand * (lot.unitCostCentimes || 0));
    inventoryValuationCentimes += val;
    const expMs = parseIsoTimeMs(lot.expiryDate);
    if (expMs !== null && expMs <= expiryHorizonMs) {
      expiringStockRiskCentimes += val;
    }
  }
  for (const prod of input.products || []) {
    if (prod.businessId && prod.businessId !== input.businessId) continue;
    if (!isBranchMatch(prod.branchId, branchFilter)) continue;
    if (lotProductIds.has(prod.id)) continue;
    if ((prod.stockQuantity || 0) <= 0) continue;
    const unitCostDzd = prod.costPrice ?? prod.cost?.amount ?? prod.price?.amount ?? 0;
    inventoryValuationCentimes += Math.round(prod.stockQuantity * dzdToCentimes(unitCostDzd));
  }

  // 4. Workforce Employer Payroll Cost
  let payrollCostCentimes = 0;
  for (const run of input.payrollRuns || []) {
    if (run.businessId && run.businessId !== input.businessId) continue;
    if (!isBranchMatch(run.branchId, branchFilter)) continue;
    if (run.status === 'draft') continue;
    const runDateIso =
      run.approvedAt ||
      `${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}-28T12:00:00.000Z`;
    if (isInWindow(runDateIso, minMs, maxMs)) {
      const employerTotalDzd = (run.totalGrossCotisable || 0) + (run.totalCnasPatronal || 0);
      payrollCostCentimes += dzdToCentimes(employerTotalDzd);
    }
  }

  // 5. Operating Expenses & Purchases (SCF Class 6 debits if posted, otherwise operational purchases/expenses)
  let operatingExpensesCentimes = 0;
  const scfExpenseEntries = (input.scfJournalEntries || []).filter(
    (j) =>
      j.businessId === input.businessId &&
      isBranchMatch(j.branchId, branchFilter) &&
      j.status !== 'reversed' &&
      isInWindow(j.entryDate, minMs, maxMs)
  );
  let hasScfClass6 = false;
  for (const entry of scfExpenseEntries) {
    for (const line of entry.lines || []) {
      if (line.accountCode.startsWith('6') && line.debitCentimes > 0) {
        operatingExpensesCentimes += Math.round(line.debitCentimes);
        hasScfClass6 = true;
      }
    }
  }
  if (!hasScfClass6) {
    for (const po of input.purchaseDocs || []) {
      if (po.businessId && po.businessId !== input.businessId) continue;
      if (!isBranchMatch(po.branchId, branchFilter)) continue;
      if (po.status === 'Canceled' || po.status === 'Draft') continue;
      if (isInWindow(po.orderDate || po.createdAt, minMs, maxMs)) {
        const poAmount = (po as any).totalAmount ?? 0;
        operatingExpensesCentimes += dzdToCentimes(poAmount);
      }
    }
    for (const pme of input.pmExpenses || []) {
      if (pme.businessId && pme.businessId !== input.businessId) continue;
      if (!isBranchMatch(pme.branchId, branchFilter)) continue;
      if (isInWindow(pme.createdAt, minMs, maxMs)) {
        operatingExpensesCentimes += dzdToCentimes(pme.amountDzd || 0);
      }
    }
    for (const fe of input.freelanceExpenses || []) {
      if (fe.businessId && fe.businessId !== input.businessId) continue;
      if (!isBranchMatch(fe.branchId, branchFilter)) continue;
      if (isInWindow(fe.date || fe.createdAt, minMs, maxMs)) {
        operatingExpensesCentimes += dzdToCentimes(fe.amount || 0);
      }
    }
  }

  const netOperatingMarginPct =
    revenueCentimes > 0
      ? Math.round(
          ((revenueCentimes - operatingExpensesCentimes - payrollCostCentimes) / revenueCentimes) *
            1000
        ) / 10
      : 0;

  return {
    revenueCentimes,
    collectionsCentimes,
    receivablesCentimes,
    collectionEfficiencyPct,
    inventoryValuationCentimes,
    expiringStockRiskCentimes,
    payrollCostCentimes,
    operatingExpensesCentimes,
    netOperatingMarginPct,
    activeDocsCount,
  };
}

export function evaluateBiKpiRegistry(input: BiEvaluationInput): {
  bounds: BiPeriodBounds;
  evaluations: BiKpiEvaluation[];
  metricsByCode: Record<string, number>;
  agingBuckets: BiAgingBucketSummary[];
  branchComparison: BiBranchComparisonRow[];
} {
  const bounds = resolveBiPeriodBounds({
    preset: input.preset,
    customStart: input.customStart,
    customEnd: input.customEnd,
    anchorDate: input.anchorDate,
  });

  const defs =
    input.definitions && input.definitions.length > 0
      ? input.definitions.filter((d) => d.isActive && !d.deletedAt)
      : buildCanonicalBiKpiDefinitions({
          accountId: input.accountId,
          businessId: input.businessId,
        });

  const curr = computeWindowCoreMetrics(
    input,
    bounds.startMs,
    bounds.endMs,
    input.branchIdFilter
  );
  const prev = computeWindowCoreMetrics(
    input,
    bounds.prevStartMs,
    bounds.prevEndMs,
    input.branchIdFilter
  );

  const pickValue = (
    m: typeof curr,
    code: string
  ): number => {
    switch (code) {
      case 'gross_invoiced_revenue':
        return m.revenueCentimes;
      case 'cash_collections':
        return m.collectionsCentimes;
      case 'receivables_outstanding':
        return m.receivablesCentimes;
      case 'collection_efficiency_pct':
        return m.collectionEfficiencyPct;
      case 'inventory_valuation_cmup':
        return m.inventoryValuationCentimes;
      case 'expiring_stock_risk':
        return m.expiringStockRiskCentimes;
      case 'workforce_payroll_cost':
        return m.payrollCostCentimes;
      case 'operating_expenses_scf':
        return m.operatingExpensesCentimes;
      case 'net_operating_margin_pct':
        return m.netOperatingMarginPct;
      default:
        return 0;
    }
  };

  const metricsByCode: Record<string, number> = {};
  const evaluations: BiKpiEvaluation[] = defs.map((def) => {
    const currentValue = pickValue(curr, def.kpiCode);
    const previousValue = pickValue(prev, def.kpiCode);
    metricsByCode[def.kpiCode] = currentValue;
    const deltaValue = Math.round((currentValue - previousValue) * 10) / 10;
    let deltaPercent = 0;
    if (previousValue === 0) {
      deltaPercent = currentValue === 0 ? 0 : 100;
    } else {
      deltaPercent = Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 1000) / 10;
    }
    const trend: BiKpiEvaluation['trend'] =
      deltaValue > 0 ? 'up' : deltaValue < 0 ? 'down' : 'flat';

    return {
      kpiCode: def.kpiCode,
      category: def.category,
      labelEn: def.labelEn,
      labelFr: def.labelFr,
      labelAr: def.labelAr,
      formulaSpec: def.formulaSpec,
      unitType: def.unitType,
      sourceTables: def.sourceTables,
      currentValue,
      previousValue,
      deltaValue,
      deltaPercent,
      targetValue: def.targetValue ?? null,
      trend,
    };
  });

  const agingBuckets = computeReceivablesAgingBuckets({
    businessId: input.businessId,
    branchIdFilter: input.branchIdFilter,
    unifiedDocuments: input.unifiedDocuments,
    asOfMs: bounds.endMs,
  });

  const branchComparison = computeCrossBranchComparison({
    input,
    bounds,
  });

  return {
    bounds,
    evaluations,
    metricsByCode,
    agingBuckets,
    branchComparison,
  };
}

export function computeReceivablesAgingBuckets(params: {
  businessId: string;
  branchIdFilter?: string;
  unifiedDocuments: UnifiedDocument[];
  asOfMs?: number;
}): BiAgingBucketSummary[] {
  const asOfMs = params.asOfMs ?? Date.now();
  const orderedKeys: BiAgingBucketKey[] = ['current', '1_30', '31_60', '61_90', '90_plus'];
  const acc: Record<BiAgingBucketKey, { docCount: number; amountCentimes: number }> = {
    current: { docCount: 0, amountCentimes: 0 },
    '1_30': { docCount: 0, amountCentimes: 0 },
    '31_60': { docCount: 0, amountCentimes: 0 },
    '61_90': { docCount: 0, amountCentimes: 0 },
    '90_plus': { docCount: 0, amountCentimes: 0 },
  };

  let totalCentimes = 0;
  for (const doc of params.unifiedDocuments || []) {
    if (doc.businessId !== params.businessId) continue;
    if (!isBranchMatch(doc.branchId, params.branchIdFilter)) continue;
    if (!isActiveIssuedDoc(doc) || doc.docType !== 'facture' || doc.status === 'Paid') continue;
    const dueCentimes = Math.round(doc.balanceDueCentimes || 0);
    if (dueCentimes <= 0) continue;

    const dueMs = parseIsoTimeMs(doc.dueDate || doc.docDate || doc.createdAt) ?? asOfMs;
    const overdueDays = Math.floor((asOfMs - dueMs) / DAY_MS);

    let bucket: BiAgingBucketKey = 'current';
    if (overdueDays >= 1 && overdueDays <= 30) bucket = '1_30';
    else if (overdueDays >= 31 && overdueDays <= 60) bucket = '31_60';
    else if (overdueDays >= 61 && overdueDays <= 90) bucket = '61_90';
    else if (overdueDays > 90) bucket = '90_plus';

    acc[bucket].docCount += 1;
    acc[bucket].amountCentimes += dueCentimes;
    totalCentimes += dueCentimes;
  }

  return orderedKeys.map((bucket) => ({
    bucket,
    docCount: acc[bucket].docCount,
    amountCentimes: acc[bucket].amountCentimes,
    sharePercent:
      totalCentimes > 0
        ? Math.round((acc[bucket].amountCentimes / totalCentimes) * 1000) / 10
        : 0,
  }));
}

export function computeCrossBranchComparison(params: {
  input: BiEvaluationInput;
  bounds: BiPeriodBounds;
}): BiBranchComparisonRow[] {
  const bizBranches = (params.input.branches || []).filter(
    (b) => b.businessId === params.input.businessId && b.isActive !== false
  );
  const branchList: Array<{ id: string; name: string; code: string }> =
    bizBranches.length > 0
      ? bizBranches.map((b) => ({ id: b.id, name: b.name, code: b.code || 'BR' }))
      : [{ id: 'default', name: 'Main Branch', code: 'HQ' }];

  return branchList.map((br) => {
    const filter = br.id === 'default' ? undefined : br.id;
    const m = computeWindowCoreMetrics(
      params.input,
      params.bounds.startMs,
      params.bounds.endMs,
      filter
    );
    return {
      branchId: br.id,
      branchName: br.name,
      branchCode: br.code,
      revenueCentimes: m.revenueCentimes,
      collectionsCentimes: m.collectionsCentimes,
      receivablesCentimes: m.receivablesCentimes,
      expensesCentimes: m.operatingExpensesCentimes + m.payrollCostCentimes,
      collectionRatePercent: m.collectionEfficiencyPct,
      activeDocumentsCount: m.activeDocsCount,
    };
  });
}

export function validateBiScheduleRecipients(rawEmails: string): {
  validEmails: string[];
  invalidEmails: string[];
} {
  const parts = (rawEmails || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  for (const email of [...new Set(parts)]) {
    if (emailRe.test(email)) validEmails.push(email);
    else invalidEmails.push(email);
  }
  return { validEmails, invalidEmails };
}

function neutralizeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function formatBiMetricDisplayValue(
  evalRow: Pick<BiKpiEvaluation, 'unitType' | 'currentValue'>,
  language: SupportedLanguage = 'en'
): string {
  const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US';
  if (evalRow.unitType === 'centimes') {
    return `${centimesToDzd(evalRow.currentValue).toLocaleString(locale)} DZD`;
  }
  if (evalRow.unitType === 'percent') {
    return `${evalRow.currentValue.toFixed(1)}%`;
  }
  if (evalRow.unitType === 'days') {
    return `${Math.round(evalRow.currentValue)} d`;
  }
  return Math.round(evalRow.currentValue).toLocaleString(locale);
}

export function buildBiReportCsv(params: {
  title: string;
  bounds: BiPeriodBounds;
  evaluations: BiKpiEvaluation[];
  agingBuckets: BiAgingBucketSummary[];
  branchComparison: BiBranchComparisonRow[];
  language?: SupportedLanguage;
}): string {
  const lang = params.language || 'en';
  const lines: string[] = [
    [
      neutralizeCsvCell('Report'),
      neutralizeCsvCell(params.title),
      neutralizeCsvCell('Period'),
      neutralizeCsvCell(`${params.bounds.periodStart} -> ${params.bounds.periodEnd}`),
    ].join(','),
    '',
    ['KPI Code', 'Metric Label', 'Category', 'Current', 'Previous', 'Delta %', 'Formula'].map(neutralizeCsvCell).join(','),
  ];

  for (const row of params.evaluations) {
    const label = lang === 'ar' ? row.labelAr : lang === 'fr' ? row.labelFr : row.labelEn;
    const currVal = row.unitType === 'centimes' ? centimesToDzd(row.currentValue) : row.currentValue;
    const prevVal = row.unitType === 'centimes' ? centimesToDzd(row.previousValue) : row.previousValue;
    lines.push(
      [
        neutralizeCsvCell(row.kpiCode),
        neutralizeCsvCell(label),
        neutralizeCsvCell(row.category),
        neutralizeCsvCell(currVal),
        neutralizeCsvCell(prevVal),
        neutralizeCsvCell(`${row.deltaPercent}%`),
        neutralizeCsvCell(row.formulaSpec),
      ].join(',')
    );
  }

  lines.push('');
  lines.push(['Aging Bucket', 'Documents', 'Balance (DZD)', 'Share %'].map(neutralizeCsvCell).join(','));
  for (const b of params.agingBuckets) {
    lines.push(
      [
        neutralizeCsvCell(b.bucket),
        neutralizeCsvCell(b.docCount),
        neutralizeCsvCell(centimesToDzd(b.amountCentimes)),
        neutralizeCsvCell(`${b.sharePercent}%`),
      ].join(',')
    );
  }

  lines.push('');
  lines.push(['Branch', 'Code', 'Revenue (DZD)', 'Collections (DZD)', 'Receivables (DZD)', 'Collection %'].map(neutralizeCsvCell).join(','));
  for (const br of params.branchComparison) {
    lines.push(
      [
        neutralizeCsvCell(br.branchName),
        neutralizeCsvCell(br.branchCode),
        neutralizeCsvCell(centimesToDzd(br.revenueCentimes)),
        neutralizeCsvCell(centimesToDzd(br.collectionsCentimes)),
        neutralizeCsvCell(centimesToDzd(br.receivablesCentimes)),
        neutralizeCsvCell(`${br.collectionRatePercent}%`),
      ].join(',')
    );
  }

  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildBiReportPrintHtml(params: {
  businessName: string;
  reportTitle: string;
  bounds: BiPeriodBounds;
  evaluations: BiKpiEvaluation[];
  agingBuckets: BiAgingBucketSummary[];
  branchComparison: BiBranchComparisonRow[];
  printTemplate?: Pick<PlatformPrintTemplate, 'accentColor' | 'footerNote' | 'showStamp'>;
  language?: SupportedLanguage;
}): string {
  const accent = params.printTemplate?.accentColor || '#D4522F';
  const footer = params.printTemplate?.footerNote || 'Atrium ERP & CRM — Unified BI KPI Registry';
  const lang = params.language || 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const kpiRows = params.evaluations
    .map((e) => {
      const label = lang === 'ar' ? e.labelAr : lang === 'fr' ? e.labelFr : e.labelEn;
      return `<tr>
        <td><strong>${escapeHtml(label)}</strong><br/><small style="color:#666">${escapeHtml(e.formulaSpec)}</small></td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${escapeHtml(formatBiMetricDisplayValue(e, lang))}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${e.deltaPercent >= 0 ? '+' : ''}${e.deltaPercent.toFixed(1)}%</td>
      </tr>`;
    })
    .join('');

  const branchRows = params.branchComparison
    .map(
      (b) => `<tr>
        <td>${escapeHtml(b.branchName)} (${escapeHtml(b.branchCode)})</td>
        <td style="text-align:right">${centimesToDzd(b.revenueCentimes).toLocaleString()} DZD</td>
        <td style="text-align:right">${centimesToDzd(b.collectionsCentimes).toLocaleString()} DZD</td>
        <td style="text-align:right">${centimesToDzd(b.receivablesCentimes).toLocaleString()} DZD</td>
        <td style="text-align:right">${b.collectionRatePercent.toFixed(1)}%</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(params.reportTitle)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #191716; margin: 28px; }
    .hdr { border-bottom: 3px solid ${escapeHtml(accent)}; padding-bottom: 12px; margin-bottom: 20px; display:flex; justify-content:space-between; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th, td { border-bottom: 1px solid #e5dfd8; padding: 8px 6px; text-align: start; }
    th { background: #f8f5f1; font-weight: 700; }
    .foot { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <h1 style="margin:0;color:${escapeHtml(accent)}">${escapeHtml(params.reportTitle)}</h1>
      <div>${escapeHtml(params.businessName)}</div>
    </div>
    <div style="text-align:right;font-size:12px">
      <div><strong>${escapeHtml(params.bounds.periodStart)}</strong> → <strong>${escapeHtml(params.bounds.periodEnd)}</strong></div>
      <div style="color:#666">vs ${escapeHtml(params.bounds.previousPeriodStart)} → ${escapeHtml(params.bounds.previousPeriodEnd)}</div>
    </div>
  </div>
  <h2>KPI Registry</h2>
  <table>
    <thead><tr><th>Metric</th><th style="text-align:right">Current</th><th style="text-align:right">Delta %</th></tr></thead>
    <tbody>${kpiRows}</tbody>
  </table>
  <h2>Branch Comparison</h2>
  <table>
    <thead><tr><th>Branch</th><th style="text-align:right">Revenue</th><th style="text-align:right">Collections</th><th style="text-align:right">Receivables</th><th style="text-align:right">Collection %</th></tr></thead>
    <tbody>${branchRows}</tbody>
  </table>
  <div class="foot">${escapeHtml(footer)}</div>
</body>
</html>`;
}

export function canDispatchScheduledReportNow(
  report: BiSavedReport,
  nowMs = Date.now(),
  cooldownMs = 12 * 3600 * 1000
): boolean {
  if (!report.lastDispatchedAt) return true;
  const lastMs = Date.parse(report.lastDispatchedAt);
  if (!Number.isFinite(lastMs)) return true;
  return nowMs - lastMs >= cooldownMs;
}
