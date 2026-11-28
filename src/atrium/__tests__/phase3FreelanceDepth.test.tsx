import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  getGlobalState,
  loginWithPinAction,
  selectCurrentFreelanceAeConfigsFromState,
  selectCurrentFreelanceClientContractsFromState,
  selectCurrentFreelanceClientsFromState,
  selectCurrentFreelanceInvoicesFromState,
  selectCurrentFreelancePhotoShootsFromState,
  selectCurrentFreelanceProjectsFromState,
  selectCurrentFreelanceTranslationEntriesFromState,
  selectCurrentTimeLogsFromState,
  setLanguageAction,
  switchBusinessAction,
  useAtriumActions,
} from '../../services/store';
import {
  buildDefaultFreelanceContractTemplates,
  canTransitionGalleryStage,
  computeAuthoritativeElapsedSeconds,
  computeInvoiceDzdEquivalent,
  computeTranslationQuote,
  detectPhotoShootOverlap,
  evaluateAutoEntrepreneurTurnover,
  formatNextSwornRegisterNumber,
  renderFreelanceContractBody,
  splitCrossMidnightTimeSpan,
} from '../../utils/freelanceDepth';
import { selectFreelanceDashboard } from '../../utils/dashboardSelectors/coreVerticals';
import { FreelanceDashboardView } from '../../components/screens/freelance/FreelanceDashboardView';
import { FreelanceTimeTrackerView } from '../../components/screens/freelance/FreelanceTimeTrackerView';
import { FreelanceClientsView } from '../../components/screens/freelance/FreelanceClientsView';
import { FreelanceProposalsView } from '../../components/screens/freelance/FreelanceProposalsView';
import { FreelanceDeliverablesView } from '../../components/screens/freelance/FreelanceDeliverablesView';
import { FreelanceInvoicesView } from '../../components/screens/freelance/FreelanceInvoicesView';
import { FreelanceFinanceView } from '../../components/screens/freelance/FreelanceFinanceView';
import { FreelanceHistoryView } from '../../components/screens/freelance/FreelanceHistoryView';
import { FreelanceStaffView } from '../../components/screens/freelance/FreelanceStaffView';

function HookBridge({ onActions }: { onActions: (a: ReturnType<typeof useAtriumActions>) => void }) {
  const actions = useAtriumActions();
  onActions(actions);
  return null;
}

function seedFreelanceTestEntities(actions: ReturnType<typeof useAtriumActions>) {
  const client = actions.addFreelanceClient({
    name: 'Karim Ziani',
    company: 'Atlas Studio DZ',
    email: 'karim@atlas-studio.dz',
    phone: '0550112233',
    country: 'Algeria',
    currency: 'EUR',
    hourlyRate: 85,
    status: 'Active',
  });

  const project = actions.addFreelanceProject({
    clientId: client.id,
    clientName: client.name,
    title: 'Atrium Portal Redesign',
    description: 'End-to-end UX & engineering retainer',
    pricingModel: 'Hourly',
    currency: 'EUR',
    budget: 8500,
    hourlyRate: 85,
    estimatedHours: 100,
    stage: 'InProgress',
    startDate: '2026-11-01',
    deadline: '2026-12-15',
    deliverables: [
      {
        id: 'deliv_test_1',
        projectId: 'pending',
        title: 'Design System Audit',
        stage: 'InProgress',
        estimatedHours: 20,
        loggedHours: 0,
        dueDate: '2026-11-28',
        isCompleted: false,
      },
    ],
  });

  return { client, project };
}

describe('Phase 3 Step 7 (7.7 freelance_solo) — Deep Vertical Integration', () => {
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
    const freelanceBiz = getGlobalState().businesses.find((b) => b.category === 'freelance_solo');
    expect(freelanceBiz).toBeTruthy();
    if (freelanceBiz) {
      switchBusinessAction(freelanceBiz.id);
    }
  });

  it('computes authoritative elapsed time, splits cross-midnight spans, and releases time logs when linked invoice is deleted', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client, project } = seedFreelanceTestEntities(actions);

    const startIso = '2026-11-26T22:30:00.000Z';
    const endIso = '2026-11-27T01:30:00.000Z';
    const elapsed = computeAuthoritativeElapsedSeconds(
      {
        isRunning: true,
        isPaused: false,
        startedAt: startIso,
        accumulatedSeconds: 0,
        elapsedSeconds: 0,
      },
      Date.parse(endIso)
    );
    expect(elapsed).toBe(10800);

    const segments = splitCrossMidnightTimeSpan(startIso, endIso);
    expect(segments).toHaveLength(2);
    expect(segments[0].date).toBe('2026-11-26');
    expect(segments[0].durationSeconds).toBe(5400);
    expect(segments[1].date).toBe('2026-11-27');
    expect(segments[1].durationSeconds).toBe(5400);

    const log = actions.logTimeEntry({
      clientId: client.id,
      clientName: client.name,
      projectId: project.id,
      projectTitle: project.title,
      taskDescription: 'Late sprint deployment',
      durationSeconds: 7200,
      isBillable: true,
      rateAtMoment: 85,
      currency: 'EUR',
      date: '2026-11-27',
    });

    const invoice = actions.billUnbilledHours(client.id, 0);
    expect(invoice.totalAmount).toBe(170);

    const lockedLog = selectCurrentTimeLogsFromState(getGlobalState()).find((l) => l.id === log.id);
    expect(lockedLog?.isInvoiced).toBe(true);

    // Deleting the linked invoice un-invoices the time logs
    actions.deleteFreelanceInvoice(invoice.id);
    const releasedLog = selectCurrentTimeLogsFromState(getGlobalState()).find((l) => l.id === log.id);
    expect(releasedLog?.isInvoiced).toBe(false);
  });

  it('blocks direct mutation and deletion of invoiced time logs while allowing edits once released', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client, project } = seedFreelanceTestEntities(actions);

    const log = actions.logTimeEntry({
      clientId: client.id,
      clientName: client.name,
      projectId: project.id,
      projectTitle: project.title,
      taskDescription: 'Original Billable Spec',
      durationSeconds: 3600,
      isBillable: true,
      rateAtMoment: 85,
      currency: 'EUR',
      date: '2026-11-27',
    });
    const inv = actions.billUnbilledHours(client.id, 0);

    // Attempt mutation & delete while invoiced -> blocked
    actions.updateTimeLog(log.id, { taskDescription: 'Tampered Spec', durationSeconds: 18000 });
    actions.deleteTimeLog(log.id);
    const stillLocked = selectCurrentTimeLogsFromState(getGlobalState()).find((l) => l.id === log.id);
    expect(stillLocked?.taskDescription).toBe('Original Billable Spec');
    expect(stillLocked?.durationSeconds).toBe(3600);

    // Release by deleting invoice, then update succeeds
    actions.deleteFreelanceInvoice(inv.id);
    actions.updateTimeLog(log.id, { taskDescription: 'Edited After Release', durationSeconds: 5400 });
    const updated = selectCurrentTimeLogsFromState(getGlobalState()).find((l) => l.id === log.id);
    expect(updated?.taskDescription).toBe('Edited After Release');
    expect(updated?.durationSeconds).toBe(5400);
  });

  it('locks invoice currency and FX rate once non-Draft while keeping Draft invoices editable', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client } = seedFreelanceTestEntities(actions);

    const draftInv = actions.createFreelanceInvoice({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      invoiceNumber: 'INV-2026-771',
      currency: 'EUR',
      fxRateToDzd: 145,
      issueDate: '2026-11-27',
      dueDate: '2026-12-12',
      status: 'Draft',
      items: [{ id: 'it_1', description: 'Advisory', quantity: 1, unitRate: 1000, total: 1000 }],
      subtotal: 1000,
      taxPercent: 0,
      taxAmount: 0,
      totalAmount: 1000,
    });

    expect(computeInvoiceDzdEquivalent(1000, 'EUR', 145)).toBe(145000);

    // Draft invoice currency/FX edit allowed
    const draftEditOk = actions.updateFreelanceInvoice(draftInv.id, {
      currency: 'USD',
      fxRateToDzd: 135,
    });
    expect(draftEditOk).toBe(true);

    // Promote to Sent -> further currency/FX changes blocked
    expect(actions.updateFreelanceInvoice(draftInv.id, { status: 'Sent' })).toBe(true);
    const nonDraftLocked = actions.updateFreelanceInvoice(draftInv.id, {
      currency: 'EUR',
      fxRateToDzd: 150,
    });
    expect(nonDraftLocked).toBe(false);

    const persisted = selectCurrentFreelanceInvoicesFromState(getGlobalState()).find(
      (i) => i.id === draftInv.id
    );
    expect(persisted?.currency).toBe('USD');
    expect(persisted?.fxRateToDzd).toBe(135);
    expect(persisted?.totalAmountDzdCentimes).toBe(13500000);
  });

  it('tracks Auto-Entrepreneur threshold alerts (80% / >100%) and transitions unverified fallback on verify', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client } = seedFreelanceTestEntities(actions);

    // Unverified baseline defaults (5,000,000 DZD, 5% + 0.5%)
    const initialSummary = evaluateAutoEntrepreneurTurnover({
      invoices: [],
      expenses: [],
      configs: selectCurrentFreelanceAeConfigsFromState(getGlobalState()),
      year: 2026,
    });
    expect(initialSummary.isUnverified).toBe(true);
    expect(initialSummary.annualCeilingDzd).toBe(5000000);

    const paidApproaching = actions.createFreelanceInvoice({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      invoiceNumber: 'INV-AE-80',
      currency: 'DZD',
      fxRateToDzd: 1,
      issueDate: '2026-06-10',
      dueDate: '2026-06-25',
      status: 'Paid',
      paidAt: '2026-06-15T10:00:00Z',
      items: [{ id: 'ae_1', description: 'Milestone', quantity: 1, unitRate: 4200000, total: 4200000 }],
      subtotal: 4200000,
      taxPercent: 0,
      taxAmount: 0,
      totalAmount: 4200000,
    });
    expect(paidApproaching.status).toBe('Paid');

    const approachingSummary = evaluateAutoEntrepreneurTurnover({
      invoices: [paidApproaching],
      configs: [],
      year: 2026,
    });
    expect(approachingSummary.isApproachingCeiling).toBe(true);
    expect(approachingSummary.isOverCeiling).toBe(false);
    expect(approachingSummary.estimatedContributionDzd).toBe(210000);
    expect(approachingSummary.estimatedTaxDzd).toBe(21000);

    // Push past 5,000,000 DZD ceiling
    const overInv = {
      ...paidApproaching,
      id: 'inv_over',
      totalAmount: 1000000,
      totalAmountDzdCentimes: 100000000,
    };
    const overSummary = evaluateAutoEntrepreneurTurnover({
      invoices: [paidApproaching, overInv],
      configs: [],
      year: 2026,
    });
    expect(overSummary.isOverCeiling).toBe(true);

    // Verify AE config transitions isUnverified -> false
    const verified = actions.markFreelanceAeConfigVerified();
    expect(verified?.verificationStatus).toBe('verified');
    const postVerifyDash = selectFreelanceDashboard({
      clients: getGlobalState().freelanceClients,
      projects: getGlobalState().freelanceProjects,
      timeLogs: getGlobalState().timeLogs,
      invoices: getGlobalState().freelanceInvoices,
      proposals: getGlobalState().freelanceProposals,
      expenses: getGlobalState().freelanceExpenses,
      aeConfigs: selectCurrentFreelanceAeConfigsFromState(getGlobalState()),
      period: '30d',
      language: 'en',
    });
    expect(postVerifyDash.autoEntrepreneur.isUnverified).toBe(false);
  });

  it('generates recurring drafts, logs overdue 6.5 reminders, and bridges to Unified 6.1/6.2 documents and payments', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client } = seedFreelanceTestEntities(actions);

    const parentInv = actions.createFreelanceInvoice({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      invoiceNumber: 'INV-REC-001',
      currency: 'EUR',
      fxRateToDzd: 145,
      issueDate: '2026-10-01',
      dueDate: '2026-10-16',
      status: 'Overdue',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      nextRecurrenceDate: '2026-11-01',
      items: [{ id: 'rec_1', description: 'Monthly Retainer', quantity: 1, unitRate: 500, total: 500 }],
      subtotal: 500,
      taxPercent: 0,
      taxAmount: 0,
      totalAmount: 500,
    });

    const nextDraft = actions.generateRecurringFreelanceInvoice(parentInv.id);
    expect(nextDraft).toBeTruthy();
    expect(nextDraft?.status).toBe('Draft');
    expect(nextDraft?.totalAmount).toBe(500);

    const reminderLog = actions.sendFreelanceInvoiceReminder(parentInv.id);
    expect(reminderLog?.entityType).toBe('freelance_invoice');
    expect(reminderLog?.status).toBe('sent');
    const remindedInv = selectCurrentFreelanceInvoicesFromState(getGlobalState()).find(
      (i) => i.id === parentInv.id
    );
    expect(remindedInv?.lastRemindedAt).toBeTruthy();

    const unifiedDoc = actions.createFreelanceUnifiedInvoice(parentInv.id, {
      docType: 'facture',
      issueImmediately: true,
    });
    expect(unifiedDoc).toBeTruthy();

    const payment = actions.recordFreelanceInvoicePayment(parentInv.id, {
      amount: 500,
      method: 'bank_transfer',
      paymentDate: '2026-11-27',
    });
    expect(payment).toBeTruthy();
    expect(payment?.amountCentimes).toBe(7250000);

    const paidInv = selectCurrentFreelanceInvoicesFromState(getGlobalState()).find(
      (i) => i.id === parentInv.id
    );
    expect(paidInv?.status).toBe('Paid');
  });

  it('renders contract templates cleanly and locks signed contracts with signer name and signatureHash', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client } = seedFreelanceTestEntities(actions);

    const templates = buildDefaultFreelanceContractTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(3);
    const rendered = renderFreelanceContractBody(templates[0].bodyTemplate, {
      provider_name: 'Nassim',
      client_name: client.name,
      client_company: client.company || '',
      scope_summary: 'Mobile Portal Audit',
      contract_value: 2500,
      currency: 'EUR',
      effective_date: '2026-11-27',
    });
    expect(rendered.missingVariables).toHaveLength(0);
    expect(rendered.renderedBody).toContain('Mobile Portal Audit');

    const contract = actions.createFreelanceContract({
      clientId: client.id,
      templateId: templates[0].id,
      category: 'service_agreement',
      title: 'Mobile Portal MSA',
      renderedBody: rendered.renderedBody,
      currency: 'EUR',
      contractValue: 2500,
      effectiveDate: '2026-11-27',
    });
    expect(contract.status).toBe('draft');
    expect(contract.contractNumber).toMatch(/^CTR-\d{4}-\d{3}$/);

    const signed = actions.signFreelanceContract(contract.id, 'Karim Ziani');
    expect(signed?.status).toBe('signed');
    expect(signed?.signerName).toBe('Karim Ziani');
    expect(signed?.signatureHash).toMatch(/^SIG-/);

    const stored = selectCurrentFreelanceClientContractsFromState(getGlobalState()).find(
      (c) => c.id === contract.id
    );
    expect(stored?.status).toBe('signed');
  });

  it('assigns sequential REG-YYYY-NNNN sworn register numbers, calculates quotes, and bills translation entries', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client } = seedFreelanceTestEntities(actions);

    const quote = computeTranslationQuote({
      pricingUnit: 'page',
      unitCount: 4,
      unitRate: 1250,
    });
    expect(quote.totalAmount).toBe(5000);

    const nextNum = formatNextSwornRegisterNumber(
      [{ registerNumber: `REG-${new Date().getFullYear()}-0007` }],
      new Date().getFullYear()
    );
    expect(nextNum).toBe(`REG-${new Date().getFullYear()}-0008`);

    const entry1 = actions.upsertTranslationEntry({
      clientId: client.id,
      sourceLanguage: 'AR',
      targetLanguage: 'FR',
      documentTitle: 'Acte de Naissance & Casier Judiciaire',
      certificationKind: 'sworn_official',
      pricingUnit: 'page',
      unitCount: 4,
      unitRate: 1250,
      currency: 'DZD',
      issuedDate: '2026-11-27',
      swornSealRef: 'SEAL-DZ-412',
    });
    expect(entry1.registerNumber).toMatch(/^REG-\d{4}-\d{4}$/);
    expect(entry1.totalAmount).toBe(5000);

    const inv = actions.billTranslationEntry(entry1.id);
    expect(inv).toBeTruthy();
    expect(inv?.totalAmount).toBe(5000);

    const updatedEntry = selectCurrentFreelanceTranslationEntriesFromState(getGlobalState()).find(
      (e) => e.id === entry1.id
    );
    expect(updatedEntry?.status).toBe('billed');
    expect(updatedEntry?.invoiceId).toBe(inv?.id);
  });

  it('rejects overlapping photo shoots via half-open intervals, validates gallery workflow stages, and bills shoots', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client } = seedFreelanceTestEntities(actions);

    const shoot1 = actions.upsertPhotoShoot({
      clientId: client.id,
      shootTitle: 'Brand Editorial Morning',
      location: 'Algiers Casbah',
      shootDate: '2026-12-05',
      startTime: '09:00',
      endTime: '12:00',
      packageName: 'Half-Day Studio',
      packageFee: 45000,
      currency: 'DZD',
    });
    expect(shoot1).toBeTruthy();

    // Overlapping window rejected (11:00–13:00 overlaps 09:00–12:00)
    const overlapping = actions.upsertPhotoShoot({
      clientId: client.id,
      shootTitle: 'Conflicting Portrait',
      shootDate: '2026-12-05',
      startTime: '11:00',
      endTime: '13:00',
      packageFee: 20000,
      currency: 'DZD',
    });
    expect(overlapping).toBeNull();

    // Adjacent boundary 12:00–14:00 is allowed (half-open)
    const adjacent = detectPhotoShootOverlap(
      {
        shootDate: '2026-12-05',
        startTime: '12:00',
        endTime: '14:00',
        galleryStatus: 'scheduled',
      },
      selectCurrentFreelancePhotoShootsFromState(getGlobalState())
    );
    expect(adjacent.hasConflict).toBe(false);

    // Gallery stage transition enforcement
    expect(canTransitionGalleryStage('watermarked_preview', 'final_delivered')).toBe(true);
    expect(canTransitionGalleryStage('final_delivered', 'editing')).toBe(false);

    if (shoot1) {
      const moved = actions.upsertPhotoShoot({
        id: shoot1.id,
        clientId: client.id,
        shootTitle: shoot1.shootTitle,
        shootDate: shoot1.shootDate,
        startTime: shoot1.startTime,
        endTime: shoot1.endTime,
        packageFee: shoot1.packageFee,
        currency: shoot1.currency,
        galleryStatus: 'watermarked_preview',
        watermarkEnabled: true,
      });
      expect(moved?.galleryStatus).toBe('watermarked_preview');

      const billedInv = actions.billPhotoShoot(shoot1.id);
      expect(billedInv).toBeTruthy();
      expect(billedInv?.totalAmount).toBe(45000);
    }
  });

  it('renders all Freelance workspace views via SSR without errors and surfaces "Rates not verified" on unverified AE defaults', () => {
    let actions!: ReturnType<typeof useAtriumActions>;
    renderToStaticMarkup(<HookBridge onActions={(a) => (actions = a)} />);
    const { client, project } = seedFreelanceTestEntities(actions);
    expect(selectCurrentFreelanceClientsFromState(getGlobalState()).some((c) => c.id === client.id)).toBe(true);
    expect(selectCurrentFreelanceProjectsFromState(getGlobalState()).some((p) => p.id === project.id)).toBe(true);

    const dashHtml = renderToStaticMarkup(<FreelanceDashboardView />);
    expect(dashHtml).toContain('Rates not verified');
    expect(dashHtml).toContain('Auto-Entrepreneur');

    const timeHtml = renderToStaticMarkup(<FreelanceTimeTrackerView />);
    const clientsHtml = renderToStaticMarkup(<FreelanceClientsView />);
    const proposalsHtml = renderToStaticMarkup(<FreelanceProposalsView />);
    const deliverablesHtml = renderToStaticMarkup(<FreelanceDeliverablesView />);
    const invoicesHtml = renderToStaticMarkup(<FreelanceInvoicesView />);
    const financeHtml = renderToStaticMarkup(<FreelanceFinanceView />);
    const historyHtml = renderToStaticMarkup(<FreelanceHistoryView />);
    const staffHtml = renderToStaticMarkup(<FreelanceStaffView />);

    expect(timeHtml.length).toBeGreaterThan(200);
    expect(clientsHtml.length).toBeGreaterThan(200);
    expect(clientsHtml).not.toContain('free_clients_table_client');
    expect(proposalsHtml.length).toBeGreaterThan(200);
    expect(deliverablesHtml.length).toBeGreaterThan(200);
    expect(invoicesHtml.length).toBeGreaterThan(200);
    expect(financeHtml).toContain('Rates not verified');
    expect(historyHtml.length).toBeGreaterThan(100);
    expect(staffHtml.length).toBeGreaterThan(100);
  });
});
