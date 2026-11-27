import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  approvePmExpenseAction,
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  selectCurrentPmBatDeliverablesFromState,
  selectCurrentPmClientPortalReviewsFromState,
  selectCurrentPmExpensesFromState,
  selectCurrentPmMilestonesFromState,
  selectCurrentPmPayrollBatchesFromState,
  selectCurrentPmPrintOrdersFromState,
  selectCurrentPmProjectsFromState,
  selectCurrentPmTimesheetsFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentUnifiedPaymentsFromState,
  setActivePmRoleAction,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  computeMilestoneInvoiceableAmount,
  computeProjectRealProfitability,
  computeTeamUtilization,
  evaluateDeliverableRevisionDecision,
  evaluateExpenseReceiptCompliance,
  isNonPrintProjectPreset,
} from '../../utils/projectDepth';
import { Sidebar } from '../../components/layout/Sidebar';
import { ProjectDirectionView } from '../../components/screens/project/ProjectDirectionView';
import { ProjectChefProjetView } from '../../components/screens/project/ProjectChefProjetView';
import { ProjectCreaView } from '../../components/screens/project/ProjectCreaView';
import { ProjectComptaView } from '../../components/screens/project/ProjectComptaView';
import { ProjectGanttPanel } from '../../components/screens/project/ProjectGanttPanel';
import { ProjectTimesheetsPanel } from '../../components/screens/project/ProjectTimesheetsPanel';
import { ProjectBillingPortalPanel } from '../../components/screens/project/ProjectBillingPortalPanel';

function HookBridge({
  onActions,
}: {
  onActions: (a: ReturnType<typeof useAtriumActions>) => void;
}) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

describe('Phase 3 Step 4 (7.4 project_milestone) — Agency, Milestones, Portal, Timesheets & Profitability', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    atriumActions.resetAllData();
    setLanguageAction('en');
    const pinResult = loginWithPinAction('1234');
    expect(pinResult.success).toBe(true);
    const pmBiz = getGlobalState().businesses.find((b) => b.category === 'project_milestone');
    expect(pmBiz).toBeTruthy();
    if (pmBiz) {
      switchBusinessAction(pmBiz.id);
    }
  });

  it('handles FX project setup, milestone partial approval gating, 6.1 billing, 6.2 payment collection, real profitability & overrun alerts', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const state0 = getGlobalState();
    const proj = actions.addPmProject({
      tenantId: state0.account.id,
      facilityId: state0.currentBranchId,
      clientId: 'cli_fx_1',
      clientName: 'EuroBrand AG',
      title: 'Europe Launch Retainer',
      scopeOfWork: 'Design & digital campaign',
      budgetCapDzd: 1_000_000,
      maxFieldExpensesDzd: 250_000,
      targetGrossMarginPercent: 30,
      startDate: '2026-11-01',
      endDate: '2026-12-15',
      kvDeadline: '2026-11-10',
      printDeadline: '2026-11-20',
      executionStartDate: '2026-11-22',
      projectManagerId: 'stf_pm',
      projectManagerName: 'Yanis PM',
      leadCreativeId: 'stf_crea',
      leadCreativeName: 'Meriem Crea',
      status: 'production',
      currency: 'EUR',
      fxRateToDzd: 255,
      budgetAlertThresholdPct: 85,
      maxRevisionLoops: 3,
      isNonPrintPreset: true,
    });

    expect(proj.currency).toBe('EUR');
    expect(proj.fxRateToDzd).toBe(255);

    const ms = actions.upsertPmMilestone({
      projectId: proj.id,
      title: 'Sprint 1 & Key Visuals',
      phase: 'concept_kv',
      startDate: '2026-11-02',
      targetDate: '2026-11-20',
      isCompleted: false,
      assignedRole: 'chef_projet',
      amountDzd: 500_000,
      billingPct: 50,
    });

    // Edge case 1: 0% approved cannot be invoiced
    const blockedSlice = computeMilestoneInvoiceableAmount({
      milestone: ms,
      project: proj,
      existingProjectDocs: [],
    });
    expect(blockedSlice.eligible).toBe(false);
    expect(blockedSlice.reasonCode).toBe('MILESTONE_NOT_APPROVED');

    // Approve 40% partial slice (200,000 DZD)
    const partiallyApproved = actions.approvePmMilestonePartial(ms.id, 40);
    expect(partiallyApproved?.approvalStatus).toBe('partial_approved');
    expect(partiallyApproved?.approvedPct).toBe(40);

    const eligibleSlice = computeMilestoneInvoiceableAmount({
      milestone: partiallyApproved!,
      project: proj,
      existingProjectDocs: [],
    });
    expect(eligibleSlice.eligible).toBe(true);
    expect(eligibleSlice.invoiceAmountDzd).toBe(200_000);

    // Issue 6.1 unified invoice linked to milestone in EUR equivalent (200,000 DZD @ 255 -> 784.31 EUR)
    const doc = actions.createUnifiedDocument({
      docType: 'facture',
      sourceVertical: 'project_milestone',
      partyName: proj.clientName,
      currency: 'EUR',
      fxRate: 255,
      sourceEntityType: 'pm_milestone',
      sourceEntityId: ms.id,
      issueImmediately: true,
      items: [
        {
          description: 'Sprint 1 (40% Partial Milestone)',
          isService: true,
          quantity: 1,
          unit: 'forfait',
          unitPriceHt: eligibleSlice.invoiceAmountInProjectCurrency,
          tvaPercent: 0,
        },
      ],
    });
    expect(doc.status).toBe('Issued');

    // Mark milestone slice invoiced & record 6.2 inflow payment
    actions.approvePmMilestonePartial(ms.id, 40, doc.id, 200_000);
    const updatedMs = selectCurrentPmMilestonesFromState(getGlobalState()).find((m) => m.id === ms.id)!;
    const afterFullSliceBilling = computeMilestoneInvoiceableAmount({
      milestone: updatedMs,
      project: proj,
      existingProjectDocs: selectCurrentUnifiedDocumentsFromState(getGlobalState()),
    });
    expect(afterFullSliceBilling.eligible).toBe(false);
    expect(afterFullSliceBilling.reasonCode).toBe('FULLY_INVOICED');

    const pay = actions.recordUnifiedPayment({
      sourceVertical: 'project_milestone',
      partyName: proj.clientName,
      method: 'bank_transfer',
      direction: 'inflow',
      amountDzd: 200_000,
      allocations: [{ documentId: doc.id, requestedDzd: 200_000 }],
    });
    expect(pay).toBeTruthy();

    // Add timesheet labor cost (10h * 3,000 DZD/h = 30,000 DZD) and expense pushing past 100% cap
    actions.recordPmTimesheet({
      tenantId: state0.account.id,
      facilityId: state0.currentBranchId,
      projectId: proj.id,
      projectTitle: proj.title,
      milestoneId: ms.id,
      staffMemberId: 'stf_dev_1',
      staffName: 'Amine Dev',
      workDate: '2026-11-12',
      hoursWorked: 10,
      billable: true,
      hourlyCostDzd: 3000,
      hourlyBillDzd: 7000,
      capacityHours: 8,
      taskSummary: 'Frontend architecture',
    });

    actions.addPmExpense({
      tenantId: state0.account.id,
      facilityId: state0.currentBranchId,
      projectId: proj.id,
      projectTitle: proj.title,
      title: 'Production Vendor Fee',
      category: 'materials',
      amountDzd: 1_050_000,
      declaredByUserId: state0.currentUser.id,
      declaredByUserName: state0.currentUser.fullName,
      declaredByRole: 'chef_projet',
      hasFiscalInvoice: true,
    });

    const latest = getGlobalState();
    const summary = computeProjectRealProfitability({
      project: proj,
      milestones: selectCurrentPmMilestonesFromState(latest),
      expenses: selectCurrentPmExpensesFromState(latest),
      payrollBatches: selectCurrentPmPayrollBatchesFromState(latest),
      timesheets: selectCurrentPmTimesheetsFromState(latest),
      printOrders: selectCurrentPmPrintOrdersFromState(latest),
      unifiedDocuments: selectCurrentUnifiedDocumentsFromState(latest),
      unifiedPayments: selectCurrentUnifiedPaymentsFromState(latest),
    });

    expect(summary.timesheetCostDzd).toBe(30_000);
    expect(summary.totalExpensesDzd).toBe(1_050_000);
    expect(summary.collectedCashDzd).toBeGreaterThanOrEqual(199_900);
    expect(summary.alertLevel).toBe('overrun');
    expect(summary.realProfitDzd).toBeLessThan(0);
  });

  function ensurePmProject(actions: ReturnType<typeof useAtriumActions>) {
    const existing = selectCurrentPmProjectsFromState(getGlobalState());
    if (existing.length > 0) return existing[0];
    const s = getGlobalState();
    return actions.addPmProject({
      tenantId: s.account.id,
      facilityId: s.currentBranchId,
      clientId: 'cli_seed_1',
      clientName: 'Atlas Telecom',
      title: 'Campaign Seed Project',
      scopeOfWork: 'Integrated deliverables',
      budgetCapDzd: 1_500_000,
      maxFieldExpensesDzd: 300_000,
      targetGrossMarginPercent: 30,
      startDate: '2026-11-01',
      endDate: '2026-12-20',
      kvDeadline: '2026-11-10',
      printDeadline: '2026-11-15',
      executionStartDate: '2026-11-18',
      projectManagerId: 'stf_pm',
      projectManagerName: 'Yanis PM',
      leadCreativeId: 'stf_cr',
      leadCreativeName: 'Meriem Crea',
      status: 'production',
    });
  }

  it('blocks approval of unreceipted expense without override reason and permits with >=5 char Direction override', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const project = ensurePmProject(actions);
    const state = getGlobalState();
    expect(project).toBeTruthy();

    const exp = actions.addPmExpense({
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      projectId: project.id,
      projectTitle: project.title,
      title: 'Emergency Taxi Run',
      category: 'transport',
      amountDzd: 3500,
      declaredByUserId: state.currentUser.id,
      declaredByUserName: state.currentUser.fullName,
      declaredByRole: 'superviseur',
      hasFiscalInvoice: false,
      receiptPhotoUrl: '',
    });

    const compliance = evaluateExpenseReceiptCompliance(exp);
    expect(compliance.hasReceipt).toBe(false);
    expect(compliance.missingReceiptFlagged).toBe(true);

    // Blocked when missing override reason
    expect(approvePmExpenseAction(exp.id)).toBe(false);
    expect(approvePmExpenseAction(exp.id, 'ok')).toBe(false);
    const stillPending = selectCurrentPmExpensesFromState(getGlobalState()).find((e) => e.id === exp.id)!;
    expect(stillPending.status).toBe('pending_direction_approval');

    // Allowed with Direction override reason >= 5 chars
    expect(approvePmExpenseAction(exp.id, 'Approved emergency cash transit')).toBe(true);
    const approved = selectCurrentPmExpensesFromState(getGlobalState()).find((e) => e.id === exp.id)!;
    expect(approved.status).toBe('approved_by_direction');
    expect(approved.missingReceiptFlagged).toBe(true);
    expect(approved.missingReceiptOverrideReason).toBe('Approved emergency cash transit');
  });

  it('enforces client portal revision loop limits, supports Direction override, and tracks client approval history', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const project = ensurePmProject(actions);
    const state = getGlobalState();

    const bat = actions.addPmBatDeliverable({
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      projectId: project.id,
      projectTitle: project.title,
      title: 'Brand Identity Deck v1',
      deliverableKind: 'strategy_deck',
      fileFormat: 'pdf',
      colorSpace: 'RVB',
      resolutionDpi: 150,
      bleedMm: 0,
      hasBleedIncluded: false,
      version: 1,
      versionCode: 'v1',
      previewUrl: 'https://cdn.example/deck-v1.pdf',
      fileSizeBytes: 1_200_000,
      uploadedByCreativeId: state.currentUser.id,
      uploadedByCreativeName: 'Meriem Crea',
      approvalStatus: 'pending_review',
      revisionCount: 0,
      maxRevisionLoops: 1,
    });

    // Round 1 revision allowed (0 -> 1)
    const rev1 = actions.submitClientPortalDeliverableReview({
      deliverableId: bat.id,
      reviewerName: 'Nadia Client',
      decision: 'revision_requested',
      comments: 'Adjust hero contrast',
    });
    expect(rev1.ok).toBe(true);
    expect(rev1.nextRevisionCount).toBe(1);

    // Round 2 blocked because maxRevisionLoops = 1
    const rev2Blocked = actions.submitClientPortalDeliverableReview({
      deliverableId: bat.id,
      reviewerName: 'Nadia Client',
      decision: 'revision_requested',
      comments: 'Second tweak',
    });
    expect(rev2Blocked.ok).toBe(false);
    expect(rev2Blocked.reason).toBe('REVISION_LOOP_LIMIT_EXCEEDED');

    // Pure rule sanity check
    expect(
      evaluateDeliverableRevisionDecision({
        deliverable: { revisionCount: 1, maxRevisionLoops: 1, approvalStatus: 'revision_requested' },
        decision: 'revision_requested',
      }).allowed
    ).toBe(false);

    // Grant +1 revision override
    const overrideRes = actions.submitClientPortalDeliverableReview({
      deliverableId: bat.id,
      reviewerName: 'Direction Override',
      decision: 'override_granted',
      comments: 'Extra round authorized',
    });
    expect(overrideRes.ok).toBe(true);
    expect(overrideRes.maxRevisionLoops).toBe(2);

    // Round 2 now succeeds, followed by final client sign-off
    const rev2Allowed = actions.submitClientPortalDeliverableReview({
      deliverableId: bat.id,
      reviewerName: 'Nadia Client',
      decision: 'revision_requested',
      comments: 'Final copy tweak',
    });
    expect(rev2Allowed.ok).toBe(true);
    expect(rev2Allowed.nextRevisionCount).toBe(2);

    const signOff = actions.submitClientPortalDeliverableReview({
      deliverableId: bat.id,
      reviewerName: 'Nadia Client',
      decision: 'approved',
      comments: 'Approved for release',
    });
    expect(signOff.ok).toBe(true);

    const latestBat = selectCurrentPmBatDeliverablesFromState(getGlobalState()).find(
      (b) => b.id === bat.id
    )!;
    expect(latestBat.approvalStatus).toBe('approved');
    expect(latestBat.clientApprovedByName).toBe('Nadia Client');
    expect(selectCurrentPmClientPortalReviewsFromState(getGlobalState()).length).toBeGreaterThanOrEqual(4);
  });

  it('tracks timesheets, team utilization, and applies Light Non-Print Agency Preset in Chef de Projet, Crea & Sidebar', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);

    const project = ensurePmProject(actions);
    const state = getGlobalState();

    const ts = actions.recordPmTimesheet({
      tenantId: state.account.id,
      facilityId: state.currentBranchId,
      projectId: project.id,
      projectTitle: project.title,
      staffMemberId: 'stf_ux',
      staffName: 'Salma UX',
      workDate: '2026-11-18',
      hoursWorked: 6,
      billable: true,
      hourlyCostDzd: 2500,
      hourlyBillDzd: 6000,
      capacityHours: 8,
      taskSummary: 'Client UX Wireframes',
    });
    actions.approvePmTimesheet(ts.id);

    const timesheets = selectCurrentPmTimesheetsFromState(getGlobalState());
    const approvedEntry = timesheets.find((entry) => entry.id === ts.id);
    expect(approvedEntry?.approvalStatus).toBe('approved');

    const utilization = computeTeamUtilization(timesheets);
    expect(utilization.totalLoggedHours).toBeGreaterThanOrEqual(6);
    expect(utilization.totalBillableValueDzd).toBeGreaterThanOrEqual(36_000);

    // Preset evaluation
    expect(isNonPrintProjectPreset('trade_software_agency')).toBe(true);
    expect(isNonPrintProjectPreset('trade_comm_agency')).toBe(false);
    expect(isNonPrintProjectPreset('trade_comm_agency', true)).toBe(true);

    // Flip project-level Non-Print preset on current project & verify Chef de Projet hides POSM tabs
    actions.updatePmProjectConfig(project.id, { isNonPrintPreset: true });
    const cpNonPrintHtml = renderToStaticMarkup(<ProjectChefProjetView initialTab="portfolio" />);
    expect(cpNonPrintHtml).toContain('Non-Print Agency Preset');
    expect(cpNonPrintHtml).not.toContain('PMPrintCatalogPanel');
    expect(cpNonPrintHtml).not.toContain('NaN');

    const creaNonPrintHtml = renderToStaticMarkup(<ProjectCreaView initialTab="upload" />);
    expect(creaNonPrintHtml).toContain('Non-Print Agency Preset active');
    expect(creaNonPrintHtml).toContain('Digital Asset / UI');
    expect(creaNonPrintHtml).not.toContain('NaN');

    // Onboard a pure software agency business so businessConfig.onboardingContext.selectedTradeId drives Sidebar too
    actions.completeOnboarding({
      fullName: 'Karim CTO',
      email: 'karim@softagency.dz',
      phone: '0550001122',
      businessName: 'SoftCraft Agency',
      category: 'project_milestone',
      branchName: 'Algiers HQ',
      branchAddress: 'Hydra, Algiers',
      branchPhone: '0550001122',
      onboardingContext: {
        selectedTradeId: 'trade_software_agency',
      },
    });
    setActivePmRoleAction('chef_projet');

    const sidebarNonPrintHtml = renderToStaticMarkup(<Sidebar />);
    expect(sidebarNonPrintHtml).toContain('Deliverables');
    expect(sidebarNonPrintHtml).not.toContain('Catalog');
  });

  it('renders all Project Direction, Chef de Projet, Compta and Phase 3 panels cleanly without NaN', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const project = ensurePmProject(actions);

    const state = getGlobalState();
    const projects = selectCurrentPmProjectsFromState(state);
    const milestones = selectCurrentPmMilestonesFromState(state);
    const deliverables = selectCurrentPmBatDeliverablesFromState(state);
    const timesheets = selectCurrentPmTimesheetsFromState(state);
    const reviews = selectCurrentPmClientPortalReviewsFromState(state);

    const dirGantt = renderToStaticMarkup(<ProjectDirectionView initialTab="gantt" />);
    expect(dirGantt).toContain('Gantt Planning');
    expect(dirGantt).not.toContain('NaN');

    const dirBilling = renderToStaticMarkup(<ProjectDirectionView initialTab="billing" />);
    expect(dirBilling).toContain('Milestone Billing');
    expect(dirBilling).not.toContain('NaN');

    const dirReports = renderToStaticMarkup(<ProjectDirectionView initialTab="reports" />);
    expect(dirReports).toContain('Consolidated Real Project Profitability');
    expect(dirReports).not.toContain('NaN');

    const comptaReceivables = renderToStaticMarkup(<ProjectComptaView initialTab="receivables" />);
    expect(comptaReceivables).toContain('Linked Quotes, Invoices');
    expect(comptaReceivables).not.toContain('NaN');

    const ganttPanel = renderToStaticMarkup(
      <ProjectGanttPanel
        projects={projects}
        milestones={milestones}
        selectedProjectId={project.id}
        onUpsertMilestone={() => {}}
        onApproveMilestonePartial={() => {}}
      />
    );
    expect(ganttPanel).toContain('Gantt Planning');
    expect(ganttPanel).not.toContain('NaN');

    const tsPanel = renderToStaticMarkup(
      <ProjectTimesheetsPanel
        accountId={state.account.id}
        branchId={state.currentBranchId}
        projects={projects}
        milestones={milestones}
        staff={state.staff}
        timesheets={timesheets}
        onRecordTimesheet={() => {}}
        onApproveTimesheet={() => {}}
        onDeleteTimesheet={() => {}}
      />
    );
    expect(tsPanel).toContain('Utilization Rate');
    expect(tsPanel).not.toContain('NaN');

    const portalPanel = renderToStaticMarkup(
      <ProjectBillingPortalPanel
        projects={projects}
        milestones={milestones}
        deliverables={deliverables}
        portalReviews={reviews}
        selectedProjectId={project.id}
        defaultSubView="portal"
      />
    );
    expect(portalPanel).toContain('Client Approval Portal');
    expect(portalPanel).not.toContain('NaN');
  });
});
