import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

import {
  clearOfflineQueue,
  clearQuarantinedMutations,
} from '../../lib/supabase/offlineQueue';
import {
  atriumActions,
  loginWithPinAction,
  setLanguageAction,
  useAtriumStore,
} from '../../services/store';
import {
  computeBankCashReconciliation,
  computeGeneralLedger,
  computeTrialBalance,
  computeTvaG50AidReport,
  getG50PreparationDisclaimer,
} from '../../utils/scfAccountingEngine';
import { ScfAccountingWorkspace } from '../../components/common/accounting/ScfAccountingWorkspace';
import { ScfPrintReportModal } from '../../components/common/accounting/ScfPrintReportModal';
import type { Product, PurchaseDocument, ScfJournalEntry } from '../../types/index';

function readStoreSnapshot() {
  let snap: ReturnType<typeof useAtriumStore> | null = null;
  const Probe: React.FC = () => {
    snap = useAtriumStore();
    return null;
  };
  renderToStaticMarkup(<Probe />);
  return snap!;
}

describe('Phase 2 Step 2 (6.3): Shared SCF Accounting Layer (Loi 07-11)', () => {
  beforeEach(() => {
    clearOfflineQueue();
    clearQuarantinedMutations();
    atriumActions.resetAllData();
    const initialSnap = readStoreSnapshot();
    const tradingBiz = initialSnap.businesses.find((b) => b.category === 'trading_commercial');
    if (tradingBiz) atriumActions.switchBusiness(tradingBiz.id);
    loginWithPinAction('1234');
    setLanguageAction('fr');
  });

  it('auto-posts balanced VE entry on UnifiedDocument issue and handles cheque receipt, clearance & bounce', () => {
    const doc = atriumActions.createUnifiedDocument({
      docType: 'facture',
      sourceVertical: 'trading_commercial',
      partyName: 'SARL Atlas Distribution',
      partyNif: '002016000088991',
      docDate: '2026-11-18',
      paymentMethod: 'bank_transfer',
      items: [
        {
          description: 'Lot Câbles Industriels',
          isService: false,
          quantity: 2,
          unit: 'u',
          unitPriceHt: 10000,
          tvaPercent: 19,
          discountPercent: 0,
        },
      ],
      issueImmediately: true,
    });

    expect(doc.status).toBe('Issued');
    let state = readStoreSnapshot();
    const saleEntry = state.journalEntries.find(
      (e) => e.sourceDocId === doc.id && e.sourceEventType === 'sale_invoice'
    );
    expect(saleEntry).toBeDefined();
    expect(saleEntry!.journalCode).toBe('VE');
    expect(saleEntry!.totalDebitCentimes).toBe(saleEntry!.totalCreditCentimes);
    expect(saleEntry!.totalDebitCentimes).toBe(2380000);
    expect(saleEntry!.lines.some((l) => l.accountCode === '411000' && l.debitCentimes === 2380000)).toBe(true);
    expect(saleEntry!.lines.some((l) => l.accountCode === '700000' && l.creditCentimes === 2000000)).toBe(true);
    expect(saleEntry!.lines.some((l) => l.accountCode === '445700' && l.creditCentimes === 380000)).toBe(true);

    // Cheque payment -> 511300 debit / 411000 credit
    const chequePayment = atriumActions.recordUnifiedPayment({
      sourceVertical: 'trading_commercial',
      partyName: 'SARL Atlas Distribution',
      method: 'cheque',
      direction: 'inflow',
      amountDzd: 23800,
      paymentDate: '2026-11-19',
      instrumentNumber: 'CHQ-778811',
      instrumentBank: 'BNA',
      allocations: [{ documentId: doc.id }],
    });
    expect(chequePayment).toBeTruthy();

    state = readStoreSnapshot();
    const receiptEntry = state.journalEntries.find(
      (e) => e.sourceDocId === chequePayment!.id && e.sourceEventType === 'payment'
    );
    expect(receiptEntry).toBeDefined();
    expect(receiptEntry!.lines.some((l) => l.accountCode === '511300' && l.debitCentimes === 2380000)).toBe(true);
    expect(receiptEntry!.lines.some((l) => l.accountCode === '411000' && l.creditCentimes === 2380000)).toBe(true);

    // Cheque cleared -> 512000 debit / 511300 credit
    expect(atriumActions.transitionChequeStatus(chequePayment!.id, 'cleared')).toBe(true);
    state = readStoreSnapshot();
    const clearedEntry = state.journalEntries.find(
      (e) => e.sourceDocId === chequePayment!.id && e.sourceEventType === 'instrument_clear'
    );
    expect(clearedEntry).toBeDefined();
    expect(clearedEntry!.journalCode).toBe('BQ');
    expect(clearedEntry!.lines.some((l) => l.accountCode === '512000' && l.debitCentimes === 2380000)).toBe(true);
    expect(clearedEntry!.lines.some((l) => l.accountCode === '511300' && l.creditCentimes === 2380000)).toBe(true);

    // Cheque bounced -> 411000 debit / 512000 credit
    expect(atriumActions.transitionChequeStatus(chequePayment!.id, 'bounced', 'Provision insuffisante')).toBe(true);
    state = readStoreSnapshot();
    const bouncedEntry = state.journalEntries.find(
      (e) => e.sourceDocId === chequePayment!.id && e.sourceEventType === 'instrument_bounce'
    );
    expect(bouncedEntry).toBeDefined();
    expect(bouncedEntry!.lines.some((l) => l.accountCode === '411000' && l.debitCentimes === 2380000)).toBe(true);
    expect(bouncedEntry!.lines.some((l) => l.accountCode === '512000' && l.creditCentimes === 2380000)).toBe(true);
  });

  it('auto-posts balanced SCF entries for payroll approval, purchase receipt, stock voucher, and POS sale', () => {
    let state = readStoreSnapshot();
    const gymBiz = state.businesses.find((b) => b.category === 'membership_session');
    if (gymBiz) atriumActions.switchBusiness(gymBiz.id);

    // 1. Payroll approval -> PA
    const run = atriumActions.generateStaffPayrollRun(2, 2026, 'membership_session');
    expect(run).toBeTruthy();
    atriumActions.approveStaffPayrollRun(run!.id, { markPaid: false });

    state = readStoreSnapshot();
    const paEntry = state.journalEntries.find(
      (e) => e.sourceEventType === 'payroll_run' && e.journalCode === 'PA'
    );
    expect(paEntry).toBeDefined();
    expect(paEntry!.totalDebitCentimes).toBe(paEntry!.totalCreditCentimes);
    expect(paEntry!.lines.some((l) => l.accountCode === '631000')).toBe(true);
    expect(paEntry!.lines.some((l) => l.accountCode === '421000')).toBe(true);
    expect(paEntry!.lines.some((l) => l.accountCode === '431000')).toBe(true);

    const tradingBiz = state.businesses.find((b) => b.category === 'trading_commercial');
    if (tradingBiz) atriumActions.switchBusiness(tradingBiz.id);
    state = readStoreSnapshot();

    // 2. Purchase Order receipt -> AC + ST
    const existingPo: PurchaseDocument | undefined = state.purchaseDocs.find((p) => p.type === 'po');
    expect(existingPo).toBeDefined();
    const br = atriumActions.receivePurchaseDoc(existingPo!.id);
    expect(br).toBeTruthy();

    state = readStoreSnapshot();
    const acEntry = state.journalEntries.find(
      (e) => e.sourceDocId === br!.id && e.sourceEventType === 'purchase_receipt'
    );
    expect(acEntry).toBeDefined();
    expect(acEntry!.journalCode).toBe('AC');
    expect(acEntry!.totalDebitCentimes).toBe(acEntry!.totalCreditCentimes);
    expect(acEntry!.lines.some((l) => l.accountCode === '600000')).toBe(true);
    expect(acEntry!.lines.some((l) => l.accountCode === '401000')).toBe(true);

    const brStockEntry = state.journalEntries.find(
      (e) => e.journalCode === 'ST' && e.sourceEventType === 'stock_movement'
    );
    expect(brStockEntry).toBeDefined();
    expect(brStockEntry!.totalDebitCentimes).toBe(brStockEntry!.totalCreditCentimes);

    // 3. Explicit stock sortie voucher -> ST
    const prod: Product | undefined = state.products[0];
    const prodId = prod?.id || 'prod_test_scf';
    const sv = atriumActions.createStockVoucher({
      voucherNumber: 'BS-2026-9001',
      type: 'sortie',
      date: '2026-11-22',
      depotSourceId: 'dep_01',
      depotSourceName: 'Dépôt Central',
      reason: 'consommation_interne',
      operatorName: 'Magasinier',
      items: [
        {
          productId: prodId,
          productName: prod?.name || 'Article Test',
          quantity: 2,
          unitCostDzd: 1500,
          unit: 'u',
        },
      ],
      totalValuationDzd: 3000,
      tenantId: 'acc_test',
      facilityId: 'br_test',
    });
    expect(sv).toBeTruthy();

    // 4. POS Sale -> CA/VE/BQ
    const saleProduct: Product = prod || {
      id: 'prod_pos_test',
      name: 'Boisson Énergisante',
      price: { amount: 250, currency: 'DZD' },
      stockQuantity: 20,
      category: 'Boissons',
      tenantId: 'acc_test',
      facilityId: 'br_test',
    };
    const posSale = atriumActions.processSale(
      [{ product: saleProduct, quantity: 3 }],
      'Cash'
    );
    expect(posSale).toBeTruthy();

    state = readStoreSnapshot();
    const posScfEntry = state.journalEntries.find(
      (e) => e.sourceDocId === posSale.id && e.sourceEventType === 'pos_sale'
    );
    expect(posScfEntry).toBeDefined();
    expect(posScfEntry!.totalDebitCentimes).toBe(posScfEntry!.totalCreditCentimes);
    expect(posScfEntry!.lines.some((l) => l.accountCode === '530000')).toBe(true);
    expect(posScfEntry!.lines.some((l) => l.accountCode.startsWith('70'))).toBe(true);
  });

  it('enforces executive/expert_comptable RBAC on period close, routes closed-period failures to retry queue, and supports reopening + retry', () => {
    // Non-executive Réceptionniste & Caisse cannot lock periods
    const cashierLogin = loginWithPinAction('4321');
    expect(cashierLogin.success).toBe(true);
    const denied = atriumActions.setAccountingPeriodStatus('2026-10', 'closed');
    expect(denied.ok).toBe(false);
    expect(denied.errorCode).toBe('SCF_PERIOD_PERMISSION_DENIED');

    // Executive Owner can lock periods
    loginWithPinAction('1234');
    const locked = atriumActions.setAccountingPeriodStatus('2026-10', 'closed', 'Clôture mensuelle Oct');
    expect(locked.ok).toBe(true);

    // Backdated entry into closed period is NEVER silently dropped -> goes to scfPostingFailures
    const blockedPost = atriumActions.postManualJournalEntry({
      journalCode: 'OD',
      entryDate: '2026-10-15',
      pieceRef: 'OD-RETRO-01',
      libelle: 'Régularisation Octobre',
      lines: [
        { accountCode: '613000', accountLabel: 'Locations', debitCentimes: 1200000, creditCentimes: 0 },
        { accountCode: '401000', accountLabel: 'Fournisseurs', debitCentimes: 0, creditCentimes: 1200000 },
      ],
    });
    expect(blockedPost.ok).toBe(false);
    expect(blockedPost.errorCode).toBe('SCF_PERIOD_CLOSED');

    let state = readStoreSnapshot();
    const pendingFailure = state.scfPostingFailures.find(
      (f) => f.status === 'pending' && f.errorCode === 'SCF_PERIOD_CLOSED'
    );
    expect(pendingFailure).toBeDefined();
    expect(pendingFailure!.sourceRef).toBe('OD-RETRO-01');

    // Reopen period -> Retry queued failure -> Entry posts cleanly and failure resolves
    const reopened = atriumActions.setAccountingPeriodStatus('2026-10', 'open', 'Correction validée');
    expect(reopened.ok).toBe(true);

    const retried = atriumActions.retryScfPostingFailure(pendingFailure!.id);
    expect(retried.ok).toBe(true);
    expect(retried.entry).toBeDefined();

    state = readStoreSnapshot();
    const resolvedFailure = state.scfPostingFailures.find((f) => f.id === pendingFailure!.id);
    expect(resolvedFailure?.status).toBe('resolved');
    expect(resolvedFailure?.resolvedEntryId).toBe(retried.entry!.id);
    expect(state.journalEntries.some((e) => e.id === retried.entry!.id)).toBe(true);
  });

  it('posts balanced reversal (contre-passation), blocks double reversal, and computes Trial Balance, General Ledger, Bank Reconciliation & G50 Aid', () => {
    const manualRes = atriumActions.postManualJournalEntry({
      journalCode: 'BQ',
      entryDate: '2026-11-24',
      pieceRef: 'VIR-BNA-09',
      libelle: 'Encaissement virement client',
      lines: [
        { accountCode: '512000', accountLabel: 'Banques', debitCentimes: 4500000, creditCentimes: 0 },
        { accountCode: '411000', accountLabel: 'Clients', debitCentimes: 0, creditCentimes: 4500000 },
      ],
    });
    expect(manualRes.ok).toBe(true);
    const entry = manualRes.entry!;

    // Reconcile 512000 line & verify bank reconciliation computation
    const bankLine = entry.lines.find((l) => l.accountCode === '512000')!;
    expect(atriumActions.toggleReconcileJournalLine(entry.id, bankLine.id, true, 'REL-2026-11', '2026-11-25')).toBe(true);

    let state = readStoreSnapshot();
    const recon = computeBankCashReconciliation(state.journalEntries, '512000');
    expect(recon.reconciledCount).toBe(1);
    expect(recon.reconciledBalanceCentimes).toBe(4500000);
    expect(recon.unreconciledDeltaCentimes).toBe(0);

    // Reverse entry -> balanced reversal + original marked 'reversed' + double reversal blocked
    const rev = atriumActions.reverseJournalEntry(entry.id, '2026-11-26', 'Erreur client');
    expect(rev.ok).toBe(true);
    expect(rev.reversalEntry!.totalDebitCentimes).toBe(4500000);
    expect(rev.reversalEntry!.lines.some((l) => l.accountCode === '512000' && l.creditCentimes === 4500000)).toBe(true);

    const doubleRev = atriumActions.reverseJournalEntry(entry.id, '2026-11-26', 'Second attempt');
    expect(doubleRev.ok).toBe(false);
    expect(doubleRev.errorCode).toBe('SCF_ENTRY_ALREADY_REVERSED');

    // Issue one invoice in 2026-11 to populate Trial Balance, GL, and G50 Aid
    atriumActions.createUnifiedDocument({
      docType: 'facture',
      sourceVertical: 'trading_commercial',
      partyName: 'EURL Horizon',
      docDate: '2026-11-25',
      items: [{ description: 'Service Audit', isService: true, quantity: 1, unit: 'forfait', unitPriceHt: 20000, tvaPercent: 19, discountPercent: 0 }],
      issueImmediately: true,
    });

    state = readStoreSnapshot();
    const tb = computeTrialBalance(state.journalEntries, state.scfAccounts, { periodKey: '2026-11' });
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalMovementsDebitCentimes).toBe(tb.totalMovementsCreditCentimes);
    expect(tb.rows.some((r) => r.accountCode === '445700')).toBe(true);

    const gl = computeGeneralLedger(state.journalEntries, '512000', { periodKey: '2026-11' });
    expect(gl.rows.length).toBeGreaterThanOrEqual(2);
    expect(gl.endingBalanceCentimes).toBe(0);

    const g50 = computeTvaG50AidReport(state.journalEntries, '2026-11', 'en');
    expect(g50.taxableTurnoverHtCentimes).toBe(2000000);
    expect(g50.tvaCollectedCentimes).toBe(380000);
    expect(g50.disclaimer).toBe(getG50PreparationDisclaimer('en'));
    expect(g50.disclaimer).toContain('Preparation aid');
  });

  it('renders ScfAccountingWorkspace and ScfPrintReportModal with visible DGI G50 disclaimer notice', () => {
    setLanguageAction('en');
    const workspaceHtml = renderToStaticMarkup(
      <ScfAccountingWorkspace sourceVerticalFilter="trading_commercial" />
    );
    expect(workspaceHtml).toContain('scf-accounting-workspace');
    expect(workspaceHtml).toContain('scf-new-entry-btn');
    expect(workspaceHtml).toContain('scf-tab-g50_aid');
    expect(workspaceHtml).toContain('scf-tab-queue');

    const g50Report = computeTvaG50AidReport([] as ScfJournalEntry[], '2026-11', 'en');
    const printHtml = renderToStaticMarkup(
      <ScfPrintReportModal
        isOpen
        onClose={() => {}}
        kind="g50_aid"
        periodLabel="2026-11"
        g50Report={g50Report}
      />
    );
    expect(printHtml).toContain('Preparation aid');
    expect(printHtml).toContain('certified accountant before DGI filing');
  });
});
