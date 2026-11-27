import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGanttTimelineItems,
  canApprovePmExpense,
  computeMilestoneInvoiceableAmount,
  computeProjectRealProfitability,
  computeTeamUtilization,
  convertDzdToProjectCurrency,
  convertProjectMoneyToDzd,
  evaluateDeliverableRevisionDecision,
  evaluateExpenseReceiptCompliance,
  isNonPrintProjectPreset,
} from './projectDepth.ts';
import type {
  PMBatDeliverable,
  PMExpense,
  PMMilestone,
  PMPayrollBatch,
  PMPrintOrder,
  PMProject,
  PMTimesheet,
  UnifiedDocument,
} from '../types/index.ts';

function makeProject(overrides: Partial<PMProject> = {}): PMProject {
  return {
    id: 'proj_1',
    tenantId: 'acc_1',
    facilityId: 'br_1',
    clientId: 'cli_1',
    clientName: 'Ooredoo DZ',
    title: 'Q4 Digital & Field Campaign',
    scopeOfWork: 'Integrated launch',
    budgetCapDzd: 2_000_000,
    maxFieldExpensesDzd: 400_000,
    targetGrossMarginPercent: 30,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    kvDeadline: '2026-11-10',
    printDeadline: '2026-11-15',
    executionStartDate: '2026-11-16',
    projectManagerId: 'stf_pm',
    projectManagerName: 'Rami PM',
    leadCreativeId: 'stf_cr',
    leadCreativeName: 'Lina Crea',
    status: 'production',
    currency: 'DZD',
    fxRateToDzd: 1,
    budgetAlertThresholdPct: 85,
    maxRevisionLoops: 3,
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
    ...overrides,
  };
}

test('computeProjectRealProfitability calculates real margin from 6.1 invoiced revenue, expenses, payroll, timesheets, print orders and flags overruns', () => {
  const proj = makeProject({ budgetCapDzd: 1_000_000, maxFieldExpensesDzd: 200_000 });
  const docs: UnifiedDocument[] = [
    {
      id: 'doc_1',
      accountId: 'acc_1',
      businessId: 'biz_1',
      branchId: 'br_1',
      sourceVertical: 'project_milestone',
      docType: 'facture',
      draftNumber: 'BR-001',
      docNumber: 'FAC-2026-0001',
      fiscalYear: 2026,
      status: 'PartiallyPaid',
      partyName: 'Ooredoo DZ',
      docDate: '2026-11-10',
      paymentMethod: 'bank_transfer',
      paymentTerms: '30j',
      currency: 'DZD',
      fxRate: 1,
      fxRateDate: '2026-11-10',
      timbreBasis: 'exempt',
      rateSetId: null,
      items: [],
      tvaBreakdown: [],
      totalHtRawCentimes: 120_000_000,
      generalDiscountPercent: 0,
      totalHtFinalCentimes: 120_000_000, // 1,200,000 DZD revenue
      totalTvaCentimes: 22_800_000,
      timbreFiscalCentimes: 0,
      totalTtcCentimes: 142_800_000,
      guaranteeRetentionPercent: 0,
      guaranteeRetentionCentimes: 0,
      netToPayCentimes: 142_800_000,
      paidCentimes: 70_000_000, // 700,000 DZD collected
      balanceDueCentimes: 72_800_000,
      fiscalHeaderSnapshot: { companyName: 'Agency' },
      totalsInWordsFr: '',
      totalsInWordsAr: '',
      includeStampSignature: true,
      sourceEntityType: 'pm_project',
      sourceEntityId: 'proj_1',
      printedCount: 1,
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
    },
  ];
  const expenses: PMExpense[] = [
    {
      id: 'exp_1',
      tenantId: 'acc_1',
      facilityId: 'br_1',
      projectId: 'proj_1',
      projectTitle: proj.title,
      title: 'Venue Transport',
      category: 'transport',
      amountDzd: 250_000, // > 200,000 max field cap!
      declaredByUserId: 'u1',
      declaredByUserName: 'Amine',
      declaredByRole: 'chef_projet',
      hasFiscalInvoice: false,
      status: 'pending_direction_approval',
      createdAt: '2026-11-12T08:00:00Z',
    },
    {
      id: 'exp_rej',
      tenantId: 'acc_1',
      facilityId: 'br_1',
      projectId: 'proj_1',
      projectTitle: proj.title,
      title: 'Rejected Claim',
      category: 'catering',
      amountDzd: 99_000,
      declaredByUserId: 'u1',
      declaredByUserName: 'Amine',
      declaredByRole: 'chef_projet',
      hasFiscalInvoice: true,
      status: 'rejected',
      createdAt: '2026-11-12T08:00:00Z',
    },
  ];
  const payrollBatches: PMPayrollBatch[] = [
    {
      id: 'bat_1',
      tenantId: 'acc_1',
      facilityId: 'br_1',
      projectId: 'proj_1',
      projectTitle: proj.title,
      missionId: 'mis_1',
      missionCode: 'MIS-01',
      batchNumber: 'PAY-01',
      totalBeneficiaries: 5,
      totalAmountDzd: 300_000,
      status: 'approved_by_direction',
      createdAt: '2026-11-14T08:00:00Z',
    },
  ];
  const timesheets: PMTimesheet[] = [
    {
      id: 'ts_1',
      tenantId: 'acc_1',
      facilityId: 'br_1',
      projectId: 'proj_1',
      projectTitle: proj.title,
      staffName: 'Yacine Dev',
      workDate: '2026-11-13',
      hoursWorked: 10,
      capacityHours: 8,
      billable: true,
      hourlyCostDzd: 3000,
      hourlyBillDzd: 7000,
      taskSummary: 'Portal delivery',
      approvalStatus: 'approved',
      createdAt: '2026-11-13T18:00:00Z',
    },
  ];
  const printOrders: PMPrintOrder[] = [
    {
      id: 'po_1',
      tenantId: 'acc_1',
      facilityId: 'br_1',
      projectId: 'proj_1',
      projectTitle: proj.title,
      orderNumber: 'CMD-1',
      items: [],
      totalCostDzd: 150_000,
      status: 'delivered',
      createdAt: '2026-11-11T09:00:00Z',
    },
  ];

  const prof = computeProjectRealProfitability({
    project: proj,
    expenses,
    payrollBatches,
    timesheets,
    printOrders,
    unifiedDocuments: docs,
  });

  // Real costs: 250k + 300k + 30k + 150k = 730k DZD; rejected expense ignored
  assert.equal(prof.totalExpensesDzd, 250_000);
  assert.equal(prof.payrollCostDzd, 300_000);
  assert.equal(prof.timesheetCostDzd, 30_000);
  assert.equal(prof.printOrdersCostDzd, 150_000);
  assert.equal(prof.totalRealCostDzd, 730_000);
  assert.equal(prof.invoicedRevenueDzd, 1_200_000);
  assert.equal(prof.collectedCashDzd, 700_000);
  assert.equal(prof.realProfitDzd, 470_000);
  assert.equal(prof.missingReceiptExpensesCount, 1);
  assert.equal(prof.isFieldCapOverrun, true);
  assert.equal(prof.alertLevel, 'overrun');
});

test('computeMilestoneInvoiceableAmount enforces partial approval percentage, multi-currency FX conversion, and over-billing caps', () => {
  const proj = makeProject({ currency: 'EUR', fxRateToDzd: 145, budgetCapDzd: 2_900_000 });
  const msPending: PMMilestone = {
    id: 'ms_1',
    projectId: proj.id,
    title: 'Phase 1',
    phase: 'concept_kv',
    targetDate: '2026-11-20',
    isCompleted: false,
    assignedRole: 'crea',
    amountDzd: 1_450_000, // 10,000 EUR
    approvedPct: 0,
  };

  const blocked = computeMilestoneInvoiceableAmount({ milestone: msPending, project: proj });
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.reasonCode, 'MILESTONE_NOT_APPROVED');

  const msPartial: PMMilestone = {
    ...msPending,
    approvalStatus: 'partial_approved',
    approvedPct: 40, // 580,000 DZD = 4,000 EUR
    invoicedAmountDzd: 145_000, // already billed 1,000 EUR
  };

  const eligible = computeMilestoneInvoiceableAmount({ milestone: msPartial, project: proj });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.maxApprovedDzd, 580_000);
  assert.equal(eligible.remainingBillableDzd, 435_000);
  assert.equal(eligible.invoiceAmountInProjectCurrency, 3000);
  assert.equal(convertProjectMoneyToDzd(3000, 'EUR', 145), 435_000);
  assert.equal(convertDzdToProjectCurrency(145_000, 'EUR', 145), 1000);
});

test('evaluateExpenseReceiptCompliance & canApprovePmExpense flag missing receipts and require Direction override reason', () => {
  const unreceipted: PMExpense = {
    id: 'exp_no_rcp',
    tenantId: 'acc_1',
    facilityId: 'br_1',
    projectId: 'proj_1',
    projectTitle: 'Launch',
    title: 'Urgent Cash Fuel',
    category: 'transport',
    amountDzd: 6500,
    declaredByUserId: 'u1',
    declaredByUserName: 'Karim',
    declaredByRole: 'superviseur',
    hasFiscalInvoice: false,
    receiptPhotoUrl: '',
    status: 'pending_direction_approval',
    createdAt: '2026-11-15T10:00:00Z',
  };

  const compliance = evaluateExpenseReceiptCompliance(unreceipted);
  assert.equal(compliance.hasReceipt, false);
  assert.equal(compliance.missingReceiptFlagged, true);

  assert.deepEqual(canApprovePmExpense(unreceipted), {
    allowed: false,
    reason: 'MISSING_RECEIPT_REQUIRES_OVERRIDE',
  });
  assert.equal(
    canApprovePmExpense(unreceipted, 'Emergency highway toll verified by phone').allowed,
    true
  );
});

test('evaluateDeliverableRevisionDecision enforces revision loop count limit unless overridden or approved', () => {
  const deliverable: Pick<PMBatDeliverable, 'revisionCount' | 'maxRevisionLoops' | 'approvalStatus'> = {
    revisionCount: 3,
    maxRevisionLoops: 3,
    approvalStatus: 'revision_requested',
  };

  const blocked = evaluateDeliverableRevisionDecision({
    deliverable,
    decision: 'revision_requested',
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.blockedReason, 'REVISION_LOOP_LIMIT_EXCEEDED');

  const extended = evaluateDeliverableRevisionDecision({
    deliverable,
    decision: 'override_granted',
  });
  assert.equal(extended.allowed, true);
  assert.equal(extended.maxRevisionLoops, 4);

  const afterExtension = evaluateDeliverableRevisionDecision({
    deliverable: { ...deliverable, maxRevisionLoops: extended.maxRevisionLoops },
    decision: 'revision_requested',
  });
  assert.equal(afterExtension.allowed, true);
  assert.equal(afterExtension.nextRevisionCount, 4);
});

test('computeTeamUtilization & buildGanttTimelineItems & isNonPrintProjectPreset behave deterministically', () => {
  assert.equal(isNonPrintProjectPreset('trade_software_agency'), true);
  assert.equal(isNonPrintProjectPreset('trade_comm_agency'), false);
  assert.equal(isNonPrintProjectPreset('trade_comm_agency', true), true);

  const util = computeTeamUtilization([
    {
      id: 't1',
      tenantId: 'a',
      facilityId: 'b',
      projectId: 'p1',
      projectTitle: 'SaaS',
      staffMemberId: 'stf_1',
      staffName: 'Amira',
      workDate: '2026-11-10',
      hoursWorked: 8,
      capacityHours: 8,
      billable: true,
      hourlyCostDzd: 2000,
      hourlyBillDzd: 5000,
      taskSummary: 'API',
      approvalStatus: 'approved',
      createdAt: '2026-11-10T17:00:00Z',
    },
    {
      id: 't2',
      tenantId: 'a',
      facilityId: 'b',
      projectId: 'p1',
      projectTitle: 'SaaS',
      staffMemberId: 'stf_1',
      staffName: 'Amira',
      workDate: '2026-11-11',
      hoursWorked: 4,
      capacityHours: 8,
      billable: false,
      hourlyCostDzd: 2000,
      hourlyBillDzd: 0,
      taskSummary: 'Internal QA',
      approvalStatus: 'submitted',
      createdAt: '2026-11-11T17:00:00Z',
    },
  ]);

  assert.equal(util.totalLoggedHours, 12);
  assert.equal(util.totalBillableHours, 8);
  assert.equal(util.overallUtilizationPct, 30); // 12 / 40 default period hours
  assert.equal(util.rows[0].billabilityPct, 66.7);

  const gantt = buildGanttTimelineItems({
    projects: [makeProject()],
    milestones: [
      {
        id: 'ms_a',
        projectId: 'proj_1',
        title: 'Brief',
        phase: 'brief',
        startDate: '2026-11-01',
        targetDate: '2026-11-08',
        isCompleted: true,
        assignedRole: 'direction',
      },
      {
        id: 'ms_b',
        projectId: 'proj_1',
        title: 'Dev Sprint',
        phase: 'bat_production',
        startDate: '2026-11-09',
        targetDate: '2026-11-20',
        isCompleted: false,
        assignedRole: 'crea',
        dependsOnMilestoneId: 'ms_a',
      },
    ],
    referenceDate: '2026-11-25',
  });

  assert.equal(gantt.items.length, 3);
  assert.equal(gantt.items[2].isOverdue, true);
  assert.equal(gantt.items[2].dependsOnId, 'ms_a');
});
