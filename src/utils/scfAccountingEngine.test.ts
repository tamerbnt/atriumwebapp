import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPostingForInstrumentTransition,
  buildPostingForPayrollRun,
  buildPostingForPurchaseReceipt,
  buildPostingForStockVoucher,
  buildPostingForUnifiedDocument,
  buildPostingForUnifiedPayment,
  buildReversalDraft,
  buildScfCsvContent,
  computeBankCashReconciliation,
  computeGeneralLedger,
  computeTrialBalance,
  computeTvaG50AidReport,
  getDefaultScfChartOfAccounts,
  isScfPeriodClosed,
  validateScfJournalLines,
} from './scfAccountingEngine';
import type {
  PurchaseDocument,
  ScfAccountingPeriod,
  ScfJournalEntry,
  StaffPayrollRunRecord,
  StockMovementVoucher,
  UnifiedDocument,
  UnifiedPayment,
} from '../types/index';

test('SCF Engine: validates strict double-entry balance and rejects unbalanced or single-sided postings', () => {
  const emptyCheck = validateScfJournalLines([]);
  assert.equal(emptyCheck.isValid, false);
  assert.equal(emptyCheck.errorCode, 'SCF_ENTRY_EMPTY');

  const unbalanced = validateScfJournalLines([
    { accountCode: '411000', debitCentimes: 119000, creditCentimes: 0 },
    { accountCode: '700000', debitCentimes: 0, creditCentimes: 100000 },
  ]);
  assert.equal(unbalanced.isValid, false);
  assert.equal(unbalanced.errorCode, 'SCF_ENTRY_UNBALANCED');
  assert.equal(unbalanced.deltaCentimes, 19000);

  const balanced = validateScfJournalLines([
    { accountCode: '411000', debitCentimes: 119000, creditCentimes: 0 },
    { accountCode: '700000', debitCentimes: 0, creditCentimes: 100000 },
    { accountCode: '445700', debitCentimes: 0, creditCentimes: 19000 },
  ]);
  assert.equal(balanced.isValid, true);
  assert.equal(balanced.totalDebitCentimes, 119000);
});

test('SCF Engine: posts multi-currency EUR unified invoice with FX rounding difference balanced onto 656/756', () => {
  const eurDoc: UnifiedDocument = {
    id: 'doc_eur_1',
    accountId: 'acc_test',
    businessId: 'biz_test',
    branchId: 'br_test',
    sourceVertical: 'freelance_agency',
    docType: 'facture',
    draftNumber: 'BR-FAC-001',
    docNumber: 'FAC-2026-00012',
    fiscalYear: 2026,
    status: 'Issued',
    partyId: 'cli_1',
    partyName: 'Euro Client SAS',
    docDate: '2026-11-18',
    paymentMethod: 'bank_transfer',
    paymentTerms: '30j',
    currency: 'EUR',
    fxRate: 145.33,
    fxRateDate: '2026-11-18',
    timbreBasis: 'exempt',
    items: [
      {
        id: 'l1',
        description: 'Mission Design',
        isService: true,
        quantity: 1,
        unit: 'forfait',
        unitPriceHt: 100.01,
        tvaPercent: 19,
        totalHtCentimes: 10001,
        totalTvaCentimes: 1900,
        totalTtcCentimes: 11901,
      },
    ],
    tvaBreakdown: [{ ratePercent: 19, baseHtCentimes: 10001, tvaCentimes: 1900 }],
    totalHtRawCentimes: 10001,
    generalDiscountPercent: 0,
    totalHtFinalCentimes: 10001,
    totalTvaCentimes: 1900,
    timbreFiscalCentimes: 0,
    totalTtcCentimes: 11901,
    guaranteeRetentionPercent: 0,
    guaranteeRetentionCentimes: 0,
    netToPayCentimes: 11901,
    paidCentimes: 0,
    balanceDueCentimes: 11901,
    fiscalHeaderSnapshot: { companyName: 'Test Agency' },
    totalsInWordsFr: '',
    totalsInWordsAr: '',
    includeStampSignature: true,
    printedCount: 0,
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
  };

  const draft = buildPostingForUnifiedDocument(eurDoc);
  assert.ok(draft);
  assert.equal(draft.journalCode, 'VE');
  assert.equal(draft.currency, 'EUR');
  const check = validateScfJournalLines(draft.lines);
  assert.equal(check.isValid, true);
  // Service revenue goes to 706000
  assert.ok(draft.lines.some((l) => l.accountCode === '706000'));
});

test('SCF Engine: handles payments, cheque clearance, bounce reversal, purchase receipt, payroll, and stock voucher rules', () => {
  const payment: UnifiedPayment = {
    id: 'pay_1',
    accountId: 'acc_test',
    businessId: 'biz_test',
    branchId: 'br_test',
    sourceVertical: 'trading_commercial',
    partyId: 'cli_1',
    partyName: 'SARL Atlas',
    paymentNumber: 'REG-2026-00001',
    method: 'cheque',
    direction: 'inflow',
    amountCentimes: 11900000,
    unallocatedCreditCentimes: 0,
    currency: 'DZD',
    fxRate: 1,
    paymentDate: '2026-11-20',
    status: 'pending_clearance',
    instrumentStatus: 'received',
    instrumentNumber: 'CHQ-900',
    allocations: [],
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  };

  const payDraft = buildPostingForUnifiedPayment(payment);
  assert.equal(validateScfJournalLines(payDraft.lines).isValid, true);
  assert.equal(payDraft.lines[0].accountCode, '511300');

  const clearDraft = buildPostingForInstrumentTransition(payment, 'cleared');
  assert.equal(validateScfJournalLines(clearDraft.lines).isValid, true);
  assert.equal(clearDraft.lines[0].accountCode, '512000');
  assert.equal(clearDraft.lines[1].accountCode, '511300');

  const bounceDraft = buildPostingForInstrumentTransition(payment, 'bounced', 'Impayé');
  assert.equal(validateScfJournalLines(bounceDraft.lines).isValid, true);
  assert.equal(bounceDraft.lines[0].accountCode, '411000');

  const payrollRun: StaffPayrollRunRecord = {
    id: 'prun_1',
    accountId: 'acc_test',
    businessId: 'biz_test',
    branchId: 'br_test',
    title: 'Paie Novembre 2026',
    periodYear: 2026,
    periodMonth: 11,
    runType: 'regular',
    adjustmentSeq: 0,
    slipsCount: 3,
    totalGrossCotisable: 300000,
    totalCnasSalarial: 27000,
    totalCnasPatronal: 78000,
    totalIrg: 30000,
    totalNet: 230000, // implies 13,000 DA salary advances deducted
    status: 'approved',
    createdAt: '2026-11-28T10:00:00Z',
  };
  const payrollDraft = buildPostingForPayrollRun(payrollRun);
  assert.equal(payrollDraft.journalCode, 'PA');
  assert.equal(validateScfJournalLines(payrollDraft.lines).isValid, true);
  assert.ok(payrollDraft.lines.some((l) => l.accountCode === '425000' && l.creditCentimes === 1300000));

  const payrollDraftWithAllowances = buildPostingForPayrollRun(
    {
      ...payrollRun,
      id: 'run_allowances',
      totalGrossCotisable: 100000,
      totalCnasSalarial: 9000,
      totalCnasPatronal: 26000,
      totalIrg: 12000,
      totalNet: 91200, // 100000 - 9000 - 12000 + 17200 (Panier+Transport) - 5000 (avance)
    },
    {
      slips: [
        {
          id: 'slip_1',
          payrollRunId: 'run_allowances',
          staffId: 'stf_1',
          matricule: 'MAT-001',
          staffFullName: 'Karim Test',
          role: 'coach',
          periodMonth: 11,
          periodYear: 2026,
          periodLabel: 'Novembre 2026',
          baseSalary: 100000,
          actualBaseSalary: 100000,
          workedDays: 22,
          standardDays: 22,
          coachingCommission: 0,
          primesCotisables: [],
          salaireBrutCotisable: 100000,
          cnasSalarial: 9000,
          cnasPatronal: 26000,
          salaireBrutImposable: 91000,
          irgTax: 12000,
          primesNonImposables: [
            { label: 'Indemnité de Panier', amount: 13200 },
            { label: 'Indemnité de Transport', amount: 4000 },
          ],
          acomptesDeduits: 5000,
          advanceCarryover: 0,
          autresRetenues: 0,
          netAPayer: 91200,
          paymentMethod: 'cash',
          isPaid: false,
          receiptNumber: 'FP-001',
        },
      ],
    }
  );
  assert.equal(validateScfJournalLines(payrollDraftWithAllowances.lines).isValid, true);
  assert.ok(
    payrollDraftWithAllowances.lines.some((l) => l.accountCode === '631000' && l.debitCentimes === 11720000)
  );
  assert.ok(
    payrollDraftWithAllowances.lines.some((l) => l.accountCode === '425000' && l.creditCentimes === 500000)
  );

  const purchase: PurchaseDocument = {
    id: 'po_1',
    tenantId: 'acc_test',
    facilityId: 'br_test',
    docNumber: 'BR-2026-0001',
    type: 'br',
    supplierId: 'sup_1',
    supplierName: 'Fournisseur Magreb',
    depotId: 'dep_1',
    orderDate: '2026-11-21',
    actualDeliveryDate: '2026-11-21',
    items: [],
    totalHt: 50000,
    totalTva: 9500,
    totalTtc: 59500,
    currency: 'DZD',
    status: 'Received',
    createdAt: '2026-11-21T10:00:00Z',
    updatedAt: '2026-11-21T10:00:00Z',
  };
  const poDraft = buildPostingForPurchaseReceipt(purchase);
  assert.equal(validateScfJournalLines(poDraft.lines).isValid, true);

  const voucher: StockMovementVoucher = {
    id: 'sv_1',
    tenantId: 'acc_test',
    facilityId: 'br_test',
    voucherNumber: 'BS-2026-0001',
    type: 'sortie',
    date: '2026-11-22',
    depotSourceId: 'dep_1',
    depotSourceName: 'Dépôt Principal',
    reason: 'sortie_client',
    operatorName: 'Magasinier',
    items: [],
    totalValuationDzd: 42000,
    createdAt: '2026-11-22T10:00:00Z',
  };
  const svDraft = buildPostingForStockVoucher(voucher);
  assert.ok(svDraft);
  assert.equal(validateScfJournalLines(svDraft.lines).isValid, true);
});

test('SCF Engine: reversal, closed period blocking, Trial Balance, General Ledger, Bank Reconciliation, and TVA/G50 Aid', () => {
  const accounts = getDefaultScfChartOfAccounts('acc_test', 'biz_test');
  const closedPeriods: ScfAccountingPeriod[] = [
    {
      id: 'per_oct',
      accountId: 'acc_test',
      businessId: 'biz_test',
      periodKey: '2026-10',
      fiscalYear: 2026,
      periodMonth: 10,
      status: 'closed',
    },
  ];
  assert.equal(isScfPeriodClosed('2026-10-15', closedPeriods), true);
  assert.equal(isScfPeriodClosed('2026-11-15', closedPeriods), false);

  const saleEntry: ScfJournalEntry = {
    id: 'je_1',
    accountId: 'acc_test',
    businessId: 'biz_test',
    branchId: 'br_test',
    entryNumber: 'EC-2026-00001',
    journalCode: 'VE',
    entryDate: '2026-11-10',
    periodKey: '2026-11',
    fiscalYear: 2026,
    pieceRef: 'FAC-2026-00001',
    libelle: 'Vente B2B',
    sourceVertical: 'trading_commercial',
    sourceEventType: 'sale_invoice',
    currency: 'DZD',
    fxRate: 1,
    totalDebitCentimes: 11900000,
    totalCreditCentimes: 11900000,
    lines: [
      { id: 'jl1', lineNo: 1, accountCode: '411000', accountLabel: 'Clients', debitCentimes: 11900000, creditCentimes: 0, originalCurrency: 'DZD', originalAmountCentimes: 11900000, fxRate: 1, reconciled: false },
      { id: 'jl2', lineNo: 2, accountCode: '700000', accountLabel: 'Ventes de marchandises', debitCentimes: 0, creditCentimes: 10000000, originalCurrency: 'DZD', originalAmountCentimes: 10000000, fxRate: 1, reconciled: false },
      { id: 'jl3', lineNo: 3, accountCode: '445700', accountLabel: 'TVA collectée', debitCentimes: 0, creditCentimes: 1900000, originalCurrency: 'DZD', originalAmountCentimes: 1900000, fxRate: 1, reconciled: false },
    ],
    status: 'posted',
    postedAt: '2026-11-10T10:00:00Z',
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
  };

  const bankEntry: ScfJournalEntry = {
    id: 'je_2',
    accountId: 'acc_test',
    businessId: 'biz_test',
    branchId: 'br_test',
    entryNumber: 'EC-2026-00002',
    journalCode: 'BQ',
    entryDate: '2026-11-12',
    periodKey: '2026-11',
    fiscalYear: 2026,
    pieceRef: 'REG-2026-00001',
    libelle: 'Encaissement virement',
    sourceVertical: 'trading_commercial',
    sourceEventType: 'payment',
    currency: 'DZD',
    fxRate: 1,
    totalDebitCentimes: 11900000,
    totalCreditCentimes: 11900000,
    lines: [
      { id: 'jl4', lineNo: 1, accountCode: '512000', accountLabel: 'Banques', debitCentimes: 11900000, creditCentimes: 0, originalCurrency: 'DZD', originalAmountCentimes: 11900000, fxRate: 1, reconciled: true, reconciliationRef: 'REL-BNA-11' },
      { id: 'jl5', lineNo: 2, accountCode: '411000', accountLabel: 'Clients', debitCentimes: 0, creditCentimes: 11900000, originalCurrency: 'DZD', originalAmountCentimes: 11900000, fxRate: 1, reconciled: false },
    ],
    status: 'posted',
    postedAt: '2026-11-12T10:00:00Z',
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
  };

  const purchaseEntry: ScfJournalEntry = {
    id: 'je_3',
    accountId: 'acc_test',
    businessId: 'biz_test',
    branchId: 'br_test',
    entryNumber: 'EC-2026-00003',
    journalCode: 'AC',
    entryDate: '2026-11-14',
    periodKey: '2026-11',
    fiscalYear: 2026,
    pieceRef: 'ACH-2026-001',
    libelle: 'Achat stock TVA déductible',
    sourceVertical: 'trading_commercial',
    sourceEventType: 'purchase_receipt',
    currency: 'DZD',
    fxRate: 1,
    totalDebitCentimes: 5950000,
    totalCreditCentimes: 5950000,
    lines: [
      { id: 'jl6', lineNo: 1, accountCode: '600000', accountLabel: 'Achats', debitCentimes: 5000000, creditCentimes: 0, originalCurrency: 'DZD', originalAmountCentimes: 5000000, fxRate: 1, reconciled: false },
      { id: 'jl7', lineNo: 2, accountCode: '445600', accountLabel: 'TVA déductible', debitCentimes: 950000, creditCentimes: 0, originalCurrency: 'DZD', originalAmountCentimes: 950000, fxRate: 1, reconciled: false },
      { id: 'jl8', lineNo: 3, accountCode: '401000', accountLabel: 'Fournisseurs', debitCentimes: 0, creditCentimes: 5950000, originalCurrency: 'DZD', originalAmountCentimes: 5950000, fxRate: 1, reconciled: false },
    ],
    status: 'posted',
    postedAt: '2026-11-14T10:00:00Z',
    createdAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
  };

  const entries = [saleEntry, bankEntry, purchaseEntry];

  const tb = computeTrialBalance(entries, accounts, { periodKey: '2026-11' });
  assert.equal(tb.isBalanced, true);
  assert.equal(tb.totalMovementsDebitCentimes, 29750000);
  const clientRow = tb.rows.find((r) => r.accountCode === '411000');
  assert.equal(clientRow?.closingDebitBalanceCentimes, 0);

  const gl = computeGeneralLedger(entries, '411000', { periodKey: '2026-11' });
  assert.equal(gl.rows.length, 2);
  assert.equal(gl.endingBalanceCentimes, 0);

  const recon = computeBankCashReconciliation(entries, '512000', { periodKey: '2026-11' });
  assert.equal(recon.reconciledCount, 1);
  assert.equal(recon.unreconciledDeltaCentimes, 0);

  const g50 = computeTvaG50AidReport(entries, '2026-11', 'en');
  assert.match(g50.disclaimer, /Preparation aid/i);
  assert.equal(g50.tvaCollectedCentimes, 1900000);
  assert.equal(g50.tvaDeductibleCentimes, 950000);
  assert.equal(g50.netTvaPayableCentimes, 950000);

  const rev = buildReversalDraft(saleEntry, '2026-11-15', 'Erreur facturation');
  assert.equal(validateScfJournalLines(rev.lines).isValid, true);
  assert.equal(rev.lines[0].creditCentimes, 11900000);

  const csv = buildScfCsvContent(['Code', 'FormulaAttempt'], [['411000', '=1+1']], g50.disclaimer);
  assert.ok(csv.includes('Preparation aid'));
  assert.ok(csv.includes("'=1+1"));
});
