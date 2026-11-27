import type {
  PMProject,
  PMMilestone,
  PMExpense,
  PMPayrollBatch,
  PMAttendance,
  PMPrintOrder,
  PMBatDeliverable,
  PMTimesheet,
  UnifiedCurrency,
  UnifiedDocument,
  UnifiedPayment,
} from '../types/index';

export const NON_PRINT_PROJECT_TRADES = new Set<string>([
  'trade_software_agency',
  'trade_public_relations',
  'trade_brand_consulting',
  'trade_digital_marketing',
]);

export const DEFAULT_FX_RATES_TO_DZD: Record<UnifiedCurrency, number> = {
  DZD: 1,
  EUR: 145,
  USD: 135,
};

export function isNonPrintProjectPreset(
  tradeId?: string | null,
  explicitProjectOverride?: boolean | null
): boolean {
  if (typeof explicitProjectOverride === 'boolean') {
    return explicitProjectOverride;
  }
  if (!tradeId) return false;
  return NON_PRINT_PROJECT_TRADES.has(tradeId);
}

export function normalizeFxRateToDzd(
  currency?: UnifiedCurrency | string | null,
  explicitFxRate?: number | null
): number {
  const cur = (currency || 'DZD') as UnifiedCurrency;
  if (cur === 'DZD') return 1;
  const parsed = Number(explicitFxRate);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_FX_RATES_TO_DZD[cur] || 1;
}

export function convertProjectMoneyToDzd(
  amount: number,
  currency?: UnifiedCurrency | string | null,
  fxRateToDzd?: number | null
): number {
  const val = Number(amount || 0);
  if (!Number.isFinite(val)) return 0;
  const rate = normalizeFxRateToDzd(currency, fxRateToDzd);
  return Math.round(val * rate);
}

export function convertDzdToProjectCurrency(
  amountDzd: number,
  currency?: UnifiedCurrency | string | null,
  fxRateToDzd?: number | null
): number {
  const val = Number(amountDzd || 0);
  if (!Number.isFinite(val)) return 0;
  const rate = normalizeFxRateToDzd(currency, fxRateToDzd);
  if (rate <= 0) return val;
  return Math.round((val / rate) * 100) / 100;
}

export interface ProjectRealProfitabilitySummary {
  projectId: string;
  currency: UnifiedCurrency;
  fxRateToDzd: number;
  budgetCapDzd: number;
  invoicedRevenueDzd: number;
  collectedCashDzd: number;
  openReceivableDzd: number;
  approvedExpensesDzd: number;
  pendingExpensesDzd: number;
  totalExpensesDzd: number;
  missingReceiptExpensesCount: number;
  missingReceiptExpensesDzd: number;
  payrollCostDzd: number;
  timesheetCostDzd: number;
  timesheetBillableValueDzd: number;
  totalLoggedHours: number;
  billableHours: number;
  printOrdersCostDzd: number;
  totalRealCostDzd: number;
  revenueBasisDzd: number;
  revenueBasisSource: 'invoiced' | 'budget_cap';
  realProfitDzd: number;
  realMarginPct: number;
  targetMarginVariancePct: number;
  budgetUtilizationPct: number;
  fieldExpenseUtilizationPct: number;
  alertThresholdPct: number;
  alertLevel: 'ok' | 'warning' | 'overrun';
  isFieldCapOverrun: boolean;
}

export function isUnifiedDocumentLinkedToProject(
  doc: UnifiedDocument,
  project: PMProject,
  milestoneIds: Set<string>
): boolean {
  if (doc.sourceEntityType === 'pm_project' && doc.sourceEntityId === project.id) return true;
  if (doc.sourceEntityType === 'pm_milestone' && doc.sourceEntityId && milestoneIds.has(doc.sourceEntityId)) {
    return true;
  }
  return false;
}

export function computeProjectRealProfitability(params: {
  project: PMProject;
  milestones?: PMMilestone[];
  expenses: PMExpense[];
  payrollBatches: PMPayrollBatch[];
  attendances?: PMAttendance[];
  timesheets?: PMTimesheet[];
  printOrders?: PMPrintOrder[];
  unifiedDocuments?: UnifiedDocument[];
  unifiedPayments?: UnifiedPayment[];
}): ProjectRealProfitabilitySummary {
  const {
    project,
    milestones = [],
    expenses,
    payrollBatches,
    attendances = [],
    timesheets = [],
    printOrders = [],
    unifiedDocuments = [],
    unifiedPayments = [],
  } = params;

  const currency = (project.currency || 'DZD') as UnifiedCurrency;
  const fxRateToDzd = normalizeFxRateToDzd(currency, project.fxRateToDzd);
  const milestoneIds = new Set(
    milestones.filter((m) => m.projectId === project.id).map((m) => m.id)
  );

  // Linked Unified Documents (6.1) — issued / partially paid / paid invoices & credit notes
  const linkedDocs = unifiedDocuments.filter(
    (d) =>
      d.status !== 'Voided' &&
      d.status !== 'Canceled' &&
      isUnifiedDocumentLinkedToProject(d, project, milestoneIds)
  );
  const billableDocs = linkedDocs.filter(
    (d) => d.docType === 'facture' && d.status !== 'Draft'
  );
  const creditNotes = linkedDocs.filter(
    (d) => d.docType === 'avoir' && d.status !== 'Draft'
  );

  const grossInvoicedDzd = billableDocs.reduce(
    (sum, d) => sum + Math.round((d.totalHtFinalCentimes / 100) * normalizeFxRateToDzd(d.currency, d.fxRate)),
    0
  );
  const creditNotesDzd = creditNotes.reduce(
    (sum, d) => sum + Math.round((d.totalHtFinalCentimes / 100) * normalizeFxRateToDzd(d.currency, d.fxRate)),
    0
  );
  const invoicedRevenueDzd = Math.max(0, grossInvoicedDzd - creditNotesDzd);

  const collectedFromDocsDzd = billableDocs.reduce(
    (sum, d) => sum + Math.round((d.paidCentimes / 100) * normalizeFxRateToDzd(d.currency, d.fxRate)),
    0
  );
  const docIdsSet = new Set(billableDocs.map((d) => d.id));
  const collectedFromPaymentsDzd = unifiedPayments
    .filter(
      (p) =>
        p.status === 'posted' &&
        p.direction === 'inflow' &&
        (p.allocations || []).some((a) => docIdsSet.has(a.documentId))
    )
    .reduce(
      (sum, p) =>
        sum +
        (p.allocations || [])
          .filter((a) => docIdsSet.has(a.documentId))
          .reduce((aSum, a) => aSum + Math.round((a.allocatedCentimes / 100) * normalizeFxRateToDzd(p.currency, p.fxRate)), 0),
      0
    );
  const collectedCashDzd = Math.max(collectedFromDocsDzd, collectedFromPaymentsDzd);
  const openReceivableDzd = Math.max(
    0,
    billableDocs.reduce(
      (sum, d) => sum + Math.round((d.balanceDueCentimes / 100) * normalizeFxRateToDzd(d.currency, d.fxRate)),
      0
    )
  );

  // Real expenses (exclude rejected)
  const projExpenses = expenses.filter((e) => e.projectId === project.id && e.status !== 'rejected');
  const approvedExpensesDzd = projExpenses
    .filter((e) => e.status === 'approved_by_direction' || e.status === 'audited_and_paid')
    .reduce((sum, e) => sum + Number(e.amountDzd || 0), 0);
  const pendingExpensesDzd = projExpenses
    .filter((e) => e.status === 'pending_direction_approval')
    .reduce((sum, e) => sum + Number(e.amountDzd || 0), 0);
  const totalExpensesDzd = approvedExpensesDzd + pendingExpensesDzd;
  const missingReceiptExpenses = projExpenses.filter((e) => !evaluateExpenseReceiptCompliance(e).hasReceipt);
  const missingReceiptExpensesCount = missingReceiptExpenses.length;
  const missingReceiptExpensesDzd = missingReceiptExpenses.reduce((s, e) => s + Number(e.amountDzd || 0), 0);

  // Payroll cost (prefer generated/disbursed/pending batches; fall back to present attendances if none)
  const projBatches = payrollBatches.filter((b) => b.projectId === project.id);
  const batchPayrollDzd = projBatches.reduce((sum, b) => sum + Number(b.totalAmountDzd || 0), 0);
  const attendancePayrollDzd = attendances
    .filter((a) => ['present', 'late', 'replacement'].includes(a.status))
    .reduce((sum, a) => sum + Number(a.grossPayableDzd || 0), 0);
  const payrollCostDzd = projBatches.length > 0 ? batchPayrollDzd : attendancePayrollDzd;

  // Timesheet labor cost & hours
  const projTimesheets = timesheets.filter((ts) => ts.projectId === project.id);
  const timesheetCostDzd = projTimesheets.reduce(
    (sum, ts) => sum + Math.round(Number(ts.hoursWorked || 0) * Number(ts.hourlyCostDzd || 0)),
    0
  );
  const timesheetBillableValueDzd = projTimesheets
    .filter((ts) => ts.billable)
    .reduce(
      (sum, ts) => sum + Math.round(Number(ts.hoursWorked || 0) * Number(ts.hourlyBillDzd || 0)),
      0
    );
  const totalLoggedHours = Math.round(
    projTimesheets.reduce((sum, ts) => sum + Number(ts.hoursWorked || 0), 0) * 10
  ) / 10;
  const billableHours = Math.round(
    projTimesheets
      .filter((ts) => ts.billable)
      .reduce((sum, ts) => sum + Number(ts.hoursWorked || 0), 0) * 10
  ) / 10;

  // Print orders cost
  const printOrdersCostDzd = printOrders
    .filter((po) => po.projectId === project.id)
    .reduce((sum, po) => sum + Number(po.totalCostDzd || 0), 0);

  const totalRealCostDzd =
    totalExpensesDzd + payrollCostDzd + timesheetCostDzd + printOrdersCostDzd;
  const budgetCapDzd = Number(project.budgetCapDzd || 0);
  const revenueBasisSource: 'invoiced' | 'budget_cap' =
    invoicedRevenueDzd > 0 ? 'invoiced' : 'budget_cap';
  const revenueBasisDzd = invoicedRevenueDzd > 0 ? invoicedRevenueDzd : budgetCapDzd;

  const realProfitDzd = revenueBasisDzd - totalRealCostDzd;
  const realMarginPct =
    revenueBasisDzd > 0 ? Math.round((realProfitDzd / revenueBasisDzd) * 1000) / 10 : 0;
  const targetMarginVariancePct =
    Math.round((realMarginPct - Number(project.targetGrossMarginPercent || 0)) * 10) / 10;

  const budgetUtilizationPct =
    budgetCapDzd > 0 ? Math.round((totalRealCostDzd / budgetCapDzd) * 1000) / 10 : 0;
  const maxFieldDzd = Number(project.maxFieldExpensesDzd || 0);
  const fieldExpenseUtilizationPct =
    maxFieldDzd > 0 ? Math.round((totalExpensesDzd / maxFieldDzd) * 1000) / 10 : 0;
  const alertThresholdPct = Number(project.budgetAlertThresholdPct ?? 85);
  const isFieldCapOverrun = maxFieldDzd > 0 && totalExpensesDzd > maxFieldDzd;

  let alertLevel: 'ok' | 'warning' | 'overrun' = 'ok';
  if (budgetUtilizationPct > 100 || isFieldCapOverrun) {
    alertLevel = 'overrun';
  } else if (
    budgetUtilizationPct >= alertThresholdPct ||
    fieldExpenseUtilizationPct >= alertThresholdPct
  ) {
    alertLevel = 'warning';
  }

  return {
    projectId: project.id,
    currency,
    fxRateToDzd,
    budgetCapDzd,
    invoicedRevenueDzd,
    collectedCashDzd,
    openReceivableDzd,
    approvedExpensesDzd,
    pendingExpensesDzd,
    totalExpensesDzd,
    missingReceiptExpensesCount,
    missingReceiptExpensesDzd,
    payrollCostDzd,
    timesheetCostDzd,
    timesheetBillableValueDzd,
    totalLoggedHours,
    billableHours,
    printOrdersCostDzd,
    totalRealCostDzd,
    revenueBasisDzd,
    revenueBasisSource,
    realProfitDzd,
    realMarginPct,
    targetMarginVariancePct,
    budgetUtilizationPct,
    fieldExpenseUtilizationPct,
    alertThresholdPct,
    alertLevel,
    isFieldCapOverrun,
  };
}

export interface StaffUtilizationRow {
  staffId: string;
  staffName: string;
  loggedHours: number;
  billableHours: number;
  nonBillableHours: number;
  capacityHours: number;
  utilizationPct: number;
  billabilityPct: number;
  laborCostDzd: number;
  billableValueDzd: number;
}

export interface TeamUtilizationSummary {
  rows: StaffUtilizationRow[];
  totalLoggedHours: number;
  totalBillableHours: number;
  totalCapacityHours: number;
  overallUtilizationPct: number;
  overallBillabilityPct: number;
  totalLaborCostDzd: number;
  totalBillableValueDzd: number;
}

export function computeTeamUtilization(
  timesheets: PMTimesheet[],
  defaultPeriodCapacityHours = 40
): TeamUtilizationSummary {
  const map = new Map<
    string,
    {
      staffId: string;
      staffName: string;
      loggedHours: number;
      billableHours: number;
      capacityByDate: Map<string, number>;
      laborCostDzd: number;
      billableValueDzd: number;
    }
  >();

  for (const ts of timesheets) {
    const key = ts.staffMemberId || ts.staffName;
    const existing = map.get(key) || {
      staffId: ts.staffMemberId || key,
      staffName: ts.staffName,
      loggedHours: 0,
      billableHours: 0,
      capacityByDate: new Map<string, number>(),
      laborCostDzd: 0,
      billableValueDzd: 0,
    };
    const hrs = Math.max(0, Number(ts.hoursWorked || 0));
    existing.loggedHours += hrs;
    if (ts.billable) {
      existing.billableHours += hrs;
      existing.billableValueDzd += Math.round(hrs * Number(ts.hourlyBillDzd || 0));
    }
    existing.laborCostDzd += Math.round(hrs * Number(ts.hourlyCostDzd || 0));
    const capForDay = Math.max(1, Number(ts.capacityHours || 8));
    existing.capacityByDate.set(
      ts.workDate,
      Math.max(existing.capacityByDate.get(ts.workDate) || 0, capForDay)
    );
    map.set(key, existing);
  }

  const rows: StaffUtilizationRow[] = Array.from(map.values())
    .map((entry) => {
      const summedDayCap = Array.from(entry.capacityByDate.values()).reduce((s, c) => s + c, 0);
      const capacityHours = Math.max(defaultPeriodCapacityHours, summedDayCap);
      const nonBillableHours = Math.max(0, entry.loggedHours - entry.billableHours);
      return {
        staffId: entry.staffId,
        staffName: entry.staffName,
        loggedHours: Math.round(entry.loggedHours * 10) / 10,
        billableHours: Math.round(entry.billableHours * 10) / 10,
        nonBillableHours: Math.round(nonBillableHours * 10) / 10,
        capacityHours,
        utilizationPct: capacityHours > 0 ? Math.round((entry.loggedHours / capacityHours) * 1000) / 10 : 0,
        billabilityPct:
          entry.loggedHours > 0
            ? Math.round((entry.billableHours / entry.loggedHours) * 1000) / 10
            : 0,
        laborCostDzd: entry.laborCostDzd,
        billableValueDzd: entry.billableValueDzd,
      };
    })
    .sort((a, b) => b.loggedHours - a.loggedHours);

  const totalLoggedHours =
    Math.round(rows.reduce((s, r) => s + r.loggedHours, 0) * 10) / 10;
  const totalBillableHours =
    Math.round(rows.reduce((s, r) => s + r.billableHours, 0) * 10) / 10;
  const totalCapacityHours = rows.reduce((s, r) => s + r.capacityHours, 0);
  const overallUtilizationPct =
    totalCapacityHours > 0
      ? Math.round((totalLoggedHours / totalCapacityHours) * 1000) / 10
      : 0;
  const overallBillabilityPct =
    totalLoggedHours > 0
      ? Math.round((totalBillableHours / totalLoggedHours) * 1000) / 10
      : 0;

  return {
    rows,
    totalLoggedHours,
    totalBillableHours,
    totalCapacityHours,
    overallUtilizationPct,
    overallBillabilityPct,
    totalLaborCostDzd: rows.reduce((s, r) => s + r.laborCostDzd, 0),
    totalBillableValueDzd: rows.reduce((s, r) => s + r.billableValueDzd, 0),
  };
}

export interface MilestoneInvoiceabilityResult {
  eligible: boolean;
  reasonCode?:
    | 'MILESTONE_NOT_APPROVED'
    | 'MILESTONE_ZERO_AMOUNT'
    | 'FULLY_INVOICED'
    | 'EXCEEDS_PROJECT_CAP';
  milestoneTotalDzd: number;
  approvedPct: number;
  maxApprovedDzd: number;
  alreadyInvoicedDzd: number;
  remainingBillableDzd: number;
  invoiceAmountDzd: number;
  currency: UnifiedCurrency;
  fxRateToDzd: number;
  invoiceAmountInProjectCurrency: number;
}

export function computeMilestoneInvoiceableAmount(params: {
  milestone: PMMilestone;
  project: PMProject;
  requestedPctToBill?: number;
  existingProjectDocs?: UnifiedDocument[];
}): MilestoneInvoiceabilityResult {
  const { milestone, project, requestedPctToBill, existingProjectDocs = [] } = params;
  const currency = (project.currency || 'DZD') as UnifiedCurrency;
  const fxRateToDzd = normalizeFxRateToDzd(currency, project.fxRateToDzd);

  const explicitAmount = Number(milestone.amountDzd || 0);
  const derivedAmount =
    explicitAmount > 0
      ? explicitAmount
      : Math.round((Number(project.budgetCapDzd || 0) * Number(milestone.billingPct || 0)) / 100);
  const milestoneTotalDzd = Math.max(0, derivedAmount);

  const approvedPct = milestone.isCompleted
    ? 100
    : Math.max(0, Math.min(100, Number(milestone.approvedPct ?? 0)));

  if (milestoneTotalDzd <= 0) {
    return {
      eligible: false,
      reasonCode: 'MILESTONE_ZERO_AMOUNT',
      milestoneTotalDzd: 0,
      approvedPct,
      maxApprovedDzd: 0,
      alreadyInvoicedDzd: 0,
      remainingBillableDzd: 0,
      invoiceAmountDzd: 0,
      currency,
      fxRateToDzd,
      invoiceAmountInProjectCurrency: 0,
    };
  }

  if (approvedPct <= 0) {
    return {
      eligible: false,
      reasonCode: 'MILESTONE_NOT_APPROVED',
      milestoneTotalDzd,
      approvedPct: 0,
      maxApprovedDzd: 0,
      alreadyInvoicedDzd: Number(milestone.invoicedAmountDzd || 0),
      remainingBillableDzd: 0,
      invoiceAmountDzd: 0,
      currency,
      fxRateToDzd,
      invoiceAmountInProjectCurrency: 0,
    };
  }

  const maxApprovedDzd = Math.round((milestoneTotalDzd * approvedPct) / 100);
  const docsInvoicedForMilestoneDzd = existingProjectDocs
    .filter(
      (d) =>
        d.sourceEntityType === 'pm_milestone' &&
        d.sourceEntityId === milestone.id &&
        d.docType === 'facture' &&
        d.status !== 'Voided' &&
        d.status !== 'Canceled'
    )
    .reduce(
      (s, d) =>
        s +
        Math.round((d.totalHtFinalCentimes / 100) * normalizeFxRateToDzd(d.currency, d.fxRate)),
      0
    );
  const alreadyInvoicedDzd = Math.max(
    Number(milestone.invoicedAmountDzd || 0),
    docsInvoicedForMilestoneDzd
  );
  const remainingBillableDzd = Math.max(0, maxApprovedDzd - alreadyInvoicedDzd);

  if (remainingBillableDzd <= 0) {
    return {
      eligible: false,
      reasonCode: 'FULLY_INVOICED',
      milestoneTotalDzd,
      approvedPct,
      maxApprovedDzd,
      alreadyInvoicedDzd,
      remainingBillableDzd: 0,
      invoiceAmountDzd: 0,
      currency,
      fxRateToDzd,
      invoiceAmountInProjectCurrency: 0,
    };
  }

  const desiredDzd =
    requestedPctToBill != null
      ? Math.min(
          remainingBillableDzd,
          Math.max(0, Math.round((milestoneTotalDzd * requestedPctToBill) / 100))
        )
      : remainingBillableDzd;

  // Enforce project contract budget cap across issued invoices
  const totalProjectInvoicedDzd = existingProjectDocs
    .filter(
      (d) =>
        (d.sourceEntityType === 'pm_project' || d.sourceEntityType === 'pm_milestone') &&
        d.docType === 'facture' &&
        d.status !== 'Voided' &&
        d.status !== 'Canceled'
    )
    .reduce(
      (s, d) =>
        s +
        Math.round((d.totalHtFinalCentimes / 100) * normalizeFxRateToDzd(d.currency, d.fxRate)),
      0
    );
  const projectRemainingCapDzd =
    Number(project.budgetCapDzd || 0) > 0
      ? Math.max(0, Number(project.budgetCapDzd) - totalProjectInvoicedDzd)
      : desiredDzd;
  const cappedInvoiceDzd = Math.min(desiredDzd, projectRemainingCapDzd);

  if (cappedInvoiceDzd <= 0) {
    return {
      eligible: false,
      reasonCode: 'EXCEEDS_PROJECT_CAP',
      milestoneTotalDzd,
      approvedPct,
      maxApprovedDzd,
      alreadyInvoicedDzd,
      remainingBillableDzd,
      invoiceAmountDzd: 0,
      currency,
      fxRateToDzd,
      invoiceAmountInProjectCurrency: 0,
    };
  }

  return {
    eligible: true,
    milestoneTotalDzd,
    approvedPct,
    maxApprovedDzd,
    alreadyInvoicedDzd,
    remainingBillableDzd,
    invoiceAmountDzd: cappedInvoiceDzd,
    currency,
    fxRateToDzd,
    invoiceAmountInProjectCurrency: convertDzdToProjectCurrency(
      cappedInvoiceDzd,
      currency,
      fxRateToDzd
    ),
  };
}

export interface ExpenseReceiptCompliance {
  hasReceipt: boolean;
  missingReceiptFlagged: boolean;
  hasOverrideReason: boolean;
}

export function evaluateExpenseReceiptCompliance(
  expense: Pick<PMExpense, 'receiptPhotoUrl' | 'hasFiscalInvoice' | 'missingReceiptOverrideReason'>
): ExpenseReceiptCompliance {
  const hasPhoto = Boolean(expense.receiptPhotoUrl && expense.receiptPhotoUrl.trim().length > 0);
  const hasReceipt = hasPhoto || Boolean(expense.hasFiscalInvoice);
  const hasOverrideReason = Boolean(
    expense.missingReceiptOverrideReason && expense.missingReceiptOverrideReason.trim().length >= 5
  );
  return {
    hasReceipt,
    missingReceiptFlagged: !hasReceipt,
    hasOverrideReason,
  };
}

export function canApprovePmExpense(
  expense: Pick<PMExpense, 'receiptPhotoUrl' | 'hasFiscalInvoice' | 'missingReceiptOverrideReason'>,
  overrideReason?: string
): { allowed: boolean; reason?: 'MISSING_RECEIPT_REQUIRES_OVERRIDE' } {
  const compliance = evaluateExpenseReceiptCompliance(expense);
  if (compliance.hasReceipt) {
    return { allowed: true };
  }
  const effectiveReason = (overrideReason ?? expense.missingReceiptOverrideReason ?? '').trim();
  if (effectiveReason.length >= 5) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: 'MISSING_RECEIPT_REQUIRES_OVERRIDE',
  };
}

export interface DeliverableRevisionEvaluation {
  allowed: boolean;
  blockedReason?: 'REVISION_LOOP_LIMIT_EXCEEDED';
  currentRevisionCount: number;
  nextRevisionCount: number;
  maxRevisionLoops: number;
  remainingRevisions: number;
  nextApprovalStatus: PMBatDeliverable['approvalStatus'];
}

export function evaluateDeliverableRevisionDecision(params: {
  deliverable: Pick<PMBatDeliverable, 'revisionCount' | 'maxRevisionLoops' | 'approvalStatus'>;
  decision: 'approved' | 'revision_requested' | 'override_granted';
  overrideLimit?: boolean;
}): DeliverableRevisionEvaluation {
  const { deliverable, decision, overrideLimit = false } = params;
  const currentRevisionCount = Math.max(0, Number(deliverable.revisionCount || 0));
  const maxRevisionLoops = Math.max(1, Number(deliverable.maxRevisionLoops || 3));

  if (decision === 'approved') {
    return {
      allowed: true,
      currentRevisionCount,
      nextRevisionCount: currentRevisionCount,
      maxRevisionLoops,
      remainingRevisions: Math.max(0, maxRevisionLoops - currentRevisionCount),
      nextApprovalStatus: 'approved',
    };
  }

  if (decision === 'override_granted') {
    const extendedMax = maxRevisionLoops + 1;
    return {
      allowed: true,
      currentRevisionCount,
      nextRevisionCount: currentRevisionCount,
      maxRevisionLoops: extendedMax,
      remainingRevisions: Math.max(0, extendedMax - currentRevisionCount),
      nextApprovalStatus: deliverable.approvalStatus,
    };
  }

  if (currentRevisionCount >= maxRevisionLoops && !overrideLimit) {
    return {
      allowed: false,
      blockedReason: 'REVISION_LOOP_LIMIT_EXCEEDED',
      currentRevisionCount,
      nextRevisionCount: currentRevisionCount,
      maxRevisionLoops,
      remainingRevisions: 0,
      nextApprovalStatus: deliverable.approvalStatus,
    };
  }

  const nextRevisionCount = currentRevisionCount + 1;
  return {
    allowed: true,
    currentRevisionCount,
    nextRevisionCount,
    maxRevisionLoops,
    remainingRevisions: Math.max(0, maxRevisionLoops - nextRevisionCount),
    nextApprovalStatus: 'revision_requested',
  };
}

export interface GanttBarItem {
  id: string;
  projectId: string;
  kind: 'project' | 'milestone';
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  leftPct: number;
  widthPct: number;
  durationDays: number;
  isCompleted: boolean;
  isOverdue: boolean;
  progressPct: number;
  dependsOnId?: string;
}

export interface GanttTimelineResult {
  windowStart: string;
  windowEnd: string;
  totalDays: number;
  items: GanttBarItem[];
}

function toDayTimestamp(isoDate?: string | null): number {
  if (!isoDate) return Date.now();
  const ms = Date.parse(isoDate.slice(0, 10) + 'T00:00:00Z');
  return Number.isFinite(ms) ? ms : Date.now();
}

export function buildGanttTimelineItems(params: {
  projects: PMProject[];
  milestones: PMMilestone[];
  referenceDate?: string;
}): GanttTimelineResult {
  const { projects, milestones, referenceDate = new Date().toISOString().slice(0, 10) } = params;
  const refMs = toDayTimestamp(referenceDate);
  const DAY_MS = 86_400_000;

  if (projects.length === 0) {
    return {
      windowStart: referenceDate,
      windowEnd: referenceDate,
      totalDays: 1,
      items: [],
    };
  }

  const allDatesMs: number[] = [];
  projects.forEach((p) => {
    allDatesMs.push(toDayTimestamp(p.startDate), toDayTimestamp(p.endDate));
  });
  milestones.forEach((m) => {
    if (m.startDate) allDatesMs.push(toDayTimestamp(m.startDate));
    allDatesMs.push(toDayTimestamp(m.targetDate));
  });

  const minMs = Math.min(...allDatesMs);
  const maxMs = Math.max(...allDatesMs, minMs + DAY_MS);
  const totalDays = Math.max(1, Math.round((maxMs - minMs) / DAY_MS) + 1);

  const items: GanttBarItem[] = [];
  for (const proj of projects) {
    const pStartMs = toDayTimestamp(proj.startDate);
    const pEndMs = Math.max(pStartMs, toDayTimestamp(proj.endDate));
    const pMilestones = milestones
      .filter((m) => m.projectId === proj.id)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

    const completedCount = pMilestones.filter((m) => m.isCompleted).length;
    const progressPct =
      pMilestones.length > 0
        ? Math.round((completedCount / pMilestones.length) * 100)
        : proj.status === 'completed' || proj.status === 'closed'
        ? 100
        : 25;

    const pLeft = Math.max(0, Math.min(98, ((pStartMs - minMs) / DAY_MS / totalDays) * 100));
    const pDurationDays = Math.max(1, Math.round((pEndMs - pStartMs) / DAY_MS) + 1);
    const pWidth = Math.max(3, Math.min(100 - pLeft, (pDurationDays / totalDays) * 100));
    const isProjClosed = proj.status === 'completed' || proj.status === 'closed';

    items.push({
      id: `gantt-proj-${proj.id}`,
      projectId: proj.id,
      kind: 'project',
      title: proj.title,
      subtitle: `${proj.clientName} · ${proj.currency || 'DZD'}`,
      startDate: proj.startDate,
      endDate: proj.endDate,
      leftPct: Math.round(pLeft * 10) / 10,
      widthPct: Math.round(pWidth * 10) / 10,
      durationDays: pDurationDays,
      isCompleted: isProjClosed,
      isOverdue: !isProjClosed && pEndMs < refMs,
      progressPct,
    });

    for (const ms of pMilestones) {
      const mEndMs = toDayTimestamp(ms.targetDate);
      const mStartMs = ms.startDate
        ? toDayTimestamp(ms.startDate)
        : Math.max(pStartMs, mEndMs - 4 * DAY_MS);
      const mLeft = Math.max(0, Math.min(98, ((mStartMs - minMs) / DAY_MS / totalDays) * 100));
      const mDurationDays = Math.max(1, Math.round((mEndMs - mStartMs) / DAY_MS) + 1);
      const mWidth = Math.max(2.5, Math.min(100 - mLeft, (mDurationDays / totalDays) * 100));
      const msPct = ms.isCompleted ? 100 : Number(ms.approvedPct || 0);

      items.push({
        id: `gantt-ms-${ms.id}`,
        projectId: proj.id,
        kind: 'milestone',
        title: ms.title,
        subtitle: `${ms.assignedRole} · ${ms.approvalStatus || (ms.isCompleted ? 'approved' : 'pending')}`,
        startDate: new Date(mStartMs).toISOString().slice(0, 10),
        endDate: ms.targetDate,
        leftPct: Math.round(mLeft * 10) / 10,
        widthPct: Math.round(mWidth * 10) / 10,
        durationDays: mDurationDays,
        isCompleted: ms.isCompleted,
        isOverdue: !ms.isCompleted && mEndMs < refMs,
        progressPct: msPct,
        dependsOnId: ms.dependsOnMilestoneId,
      });
    }
  }

  return {
    windowStart: new Date(minMs).toISOString().slice(0, 10),
    windowEnd: new Date(maxMs).toISOString().slice(0, 10),
    totalDays,
    items,
  };
}
