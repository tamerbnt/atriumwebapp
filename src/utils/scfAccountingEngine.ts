import {
  addCentimes,
  centimesToDzd,
  dzdToCentimes,
  roundHalfAwayFromZero,
} from './money';
import { validateAndBalanceSCFEntry } from './legalRules';
import type {
  PurchaseDocument,
  Sale,
  SCFJournalEntry,
  ScfAccount,
  ScfAccountClass,
  ScfAccountingPeriod,
  ScfJournalCode,
  ScfJournalEntry,
  ScfJournalLine,
  ScfPostingEventType,
  StaffPayrollRunRecord,
  StockMovementVoucher,
  UnifiedCurrency,
  UnifiedDocument,
  UnifiedPayment,
} from '../types/index';

export const G50_PREPARATION_DISCLAIMER_EN =
  'Preparation aid — verify exact G50 / TAP / IBS / TVA figures with a certified accountant before DGI filing.';
export const G50_PREPARATION_DISCLAIMER_FR =
  'Aide à la préparation — faites vérifier les montants G50 / TAP / IBS / TVA par un expert-comptable avant dépôt DGI.';
export const G50_PREPARATION_DISCLAIMER_AR =
  'أداة مساعدة للتحضير — يرجى التحقق من أرقام تصريح G50 / TVA مع محاسب معتمد قبل الإيداع لدى إدارة الضرائب.';

export function getG50PreparationDisclaimer(language: 'en' | 'fr' | 'ar' = 'fr'): string {
  if (language === 'ar') return G50_PREPARATION_DISCLAIMER_AR;
  if (language === 'en') return G50_PREPARATION_DISCLAIMER_EN;
  return G50_PREPARATION_DISCLAIMER_FR;
}

export function toPeriodKey(dateStr?: string): string {
  const clean = (dateStr || '').trim();
  if (/^\d{4}-\d{2}/.test(clean)) return clean.slice(0, 7);
  const now = new Date().toISOString();
  return now.slice(0, 7);
}

export function isScfPeriodClosed(
  dateStr: string,
  periods: ScfAccountingPeriod[] = [],
  legacyClosedMonths: string[] = []
): boolean {
  const periodKey = toPeriodKey(dateStr);
  const periodRow = periods.find((p) => p.periodKey === periodKey);
  if (periodRow) {
    return periodRow.status === 'closed';
  }
  return legacyClosedMonths.includes(periodKey);
}

export function getDefaultScfChartOfAccounts(
  accountId: string,
  businessId: string
): ScfAccount[] {
  const seed: Array<
    Omit<ScfAccount, 'id' | 'accountId' | 'businessId' | 'isActive' | 'isSystem'>
  > = [
    { code: '101000', labelFr: 'Capital social', labelAr: 'رأس المال الاجتماعي', labelEn: 'Share Capital', scfClass: 1, normalBalance: 'credit', accountType: 'equity', isReconcilable: false },
    { code: '300000', labelFr: 'Stocks de marchandises', labelAr: 'مخزون البضائع', labelEn: 'Merchandise Inventory', scfClass: 3, normalBalance: 'debit', accountType: 'asset', isReconcilable: false },
    { code: '310000', labelFr: 'Matières premières et fournitures', labelAr: 'المواد الأولية واللوازم', labelEn: 'Raw Materials & Supplies', scfClass: 3, normalBalance: 'debit', accountType: 'asset', isReconcilable: false },
    { code: '401000', labelFr: 'Fournisseurs de stocks et services', labelAr: 'الموردون', labelEn: 'Trade Payables', scfClass: 4, normalBalance: 'credit', accountType: 'liability', isReconcilable: false },
    { code: '411000', labelFr: 'Clients', labelAr: 'الزبائن', labelEn: 'Trade Receivables', scfClass: 4, normalBalance: 'debit', accountType: 'asset', isReconcilable: false },
    { code: '421000', labelFr: 'Personnel - Rémunérations dues', labelAr: 'المستخدمون - الأجور المستحقة', labelEn: 'Salaries Payable', scfClass: 4, normalBalance: 'credit', accountType: 'liability', isReconcilable: false },
    { code: '425000', labelFr: 'Personnel - Avances et acomptes', labelAr: 'المستخدمون - التسبيقات', labelEn: 'Staff Salary Advances', scfClass: 4, normalBalance: 'debit', accountType: 'asset', isReconcilable: false },
    { code: '431000', labelFr: 'Sécurité sociale (CNAS)', labelAr: 'الضمان الاجتماعي (CNAS)', labelEn: 'Social Security (CNAS)', scfClass: 4, normalBalance: 'credit', accountType: 'liability', isReconcilable: false },
    { code: '442000', labelFr: 'État - Impôts et taxes / IRG Salaires', labelAr: 'الدولة - الضريبة على الدخل الإجمالي', labelEn: 'IRG Payroll Withholding', scfClass: 4, normalBalance: 'credit', accountType: 'liability', isReconcilable: false },
    { code: '445600', labelFr: 'TVA déductible sur achats et services', labelAr: 'الرسم على القيمة المضافة القابل للاسترجاع', labelEn: 'Deductible Input VAT', scfClass: 4, normalBalance: 'debit', accountType: 'asset', isReconcilable: false },
    { code: '445700', labelFr: 'TVA collectée sur ventes et prestations', labelAr: 'الرسم على القيمة المضافة المحصل', labelEn: 'Collected Output VAT', scfClass: 4, normalBalance: 'credit', accountType: 'liability', isReconcilable: false },
    { code: '447000', labelFr: 'Autres impôts, taxes et droits de timbre', labelAr: 'حقوق الطابع والضرائب الأخرى', labelEn: 'Fiscal Stamp & Other Taxes', scfClass: 4, normalBalance: 'credit', accountType: 'liability', isReconcilable: false },
    { code: '511300', labelFr: 'Effets et chèques à encaisser', labelAr: 'شيكات وأوراق تجارية قيد التحصيل', labelEn: 'Cheques & Traites Clearing', scfClass: 5, normalBalance: 'debit', accountType: 'asset', isReconcilable: true },
    { code: '512000', labelFr: 'Banques comptes courants', labelAr: 'البنوك الحسابات الجارية', labelEn: 'Bank Current Accounts', scfClass: 5, normalBalance: 'debit', accountType: 'asset', isReconcilable: true },
    { code: '517000', labelFr: 'CCP Algérie Poste / BaridiMob', labelAr: 'الحساب البريدي الجاري / بريدي موب', labelEn: 'CCP & BaridiMob Clearing', scfClass: 5, normalBalance: 'debit', accountType: 'asset', isReconcilable: true },
    { code: '530000', labelFr: 'Caisse centrale', labelAr: 'الصندوق المركزي', labelEn: 'Main Cash Register', scfClass: 5, normalBalance: 'debit', accountType: 'asset', isReconcilable: true },
    { code: '600000', labelFr: 'Achats de marchandises vendues', labelAr: 'مشتريات البضائع المستهلكة', labelEn: 'Cost of Goods Purchased', scfClass: 6, normalBalance: 'debit', accountType: 'expense', isReconcilable: false },
    { code: '601000', labelFr: 'Matières premières consommées', labelAr: 'المواد الأولية المستهلكة', labelEn: 'Raw Materials Consumed', scfClass: 6, normalBalance: 'debit', accountType: 'expense', isReconcilable: false },
    { code: '631000', labelFr: 'Rémunérations du personnel', labelAr: 'أجور المستخدمين', labelEn: 'Payroll Wages & Salaries', scfClass: 6, normalBalance: 'debit', accountType: 'expense', isReconcilable: false },
    { code: '635000', labelFr: 'Cotisations patronales aux organismes sociaux', labelAr: 'اشتراكات صاحب العمل في الضمان الاجتماعي', labelEn: 'Employer CNAS Contributions', scfClass: 6, normalBalance: 'debit', accountType: 'expense', isReconcilable: false },
    { code: '656000', labelFr: "Pertes de change et écarts d'arrondi", labelAr: 'خسائر الصرف وفروق التقريب', labelEn: 'FX & Rounding Losses', scfClass: 6, normalBalance: 'debit', accountType: 'expense', isReconcilable: false },
    { code: '700000', labelFr: 'Ventes de marchandises', labelAr: 'مبيعات البضائع', labelEn: 'Merchandise Sales', scfClass: 7, normalBalance: 'credit', accountType: 'revenue', isReconcilable: false },
    { code: '706000', labelFr: 'Prestations de services', labelAr: 'أداء الخدمات', labelEn: 'Service Revenue', scfClass: 7, normalBalance: 'credit', accountType: 'revenue', isReconcilable: false },
    { code: '756000', labelFr: "Gains de change et écarts d'arrondi", labelAr: 'أرباح الصرف وفروق التقريب', labelEn: 'FX & Rounding Gains', scfClass: 7, normalBalance: 'credit', accountType: 'revenue', isReconcilable: false },
  ];

  return seed.map((row) => ({
    ...row,
    id: `scf_acct_${businessId}_${row.code}`,
    accountId,
    businessId,
    isReconcilable: row.isReconcilable,
    isSystem: true,
    isActive: true,
  }));
}

export interface ScfLineDraftInput {
  accountCode: string;
  accountLabel: string;
  partyId?: string;
  partyName?: string;
  debitCentimes: number;
  creditCentimes: number;
  originalCurrency?: UnifiedCurrency;
  originalAmountCentimes?: number;
  fxRate?: number;
}

export interface ScfValidationResult {
  isValid: boolean;
  totalDebitCentimes: number;
  totalCreditCentimes: number;
  deltaCentimes: number;
  errorCode?: 'SCF_ENTRY_EMPTY' | 'SCF_LINE_INVALID' | 'SCF_ENTRY_UNBALANCED';
  errorMessage?: string;
}

/**
 * Validates double-entry balance in exact integer centimes while reusing
 * `validateAndBalanceSCFEntry` from legalRules.ts as the statutory SCF invariant.
 */
export function validateScfJournalLines(
  lines: Array<Pick<ScfLineDraftInput, 'accountCode' | 'debitCentimes' | 'creditCentimes'>>
): ScfValidationResult {
  if (!Array.isArray(lines) || lines.length < 2) {
    return {
      isValid: false,
      totalDebitCentimes: 0,
      totalCreditCentimes: 0,
      deltaCentimes: 0,
      errorCode: 'SCF_ENTRY_EMPTY',
      errorMessage: 'Une écriture comptable SCF nécessite au moins deux lignes (débit et crédit).',
    };
  }

  let totalDebitCentimes = 0;
  let totalCreditCentimes = 0;
  for (const l of lines) {
    const debit = roundHalfAwayFromZero(Number(l.debitCentimes || 0));
    const credit = roundHalfAwayFromZero(Number(l.creditCentimes || 0));
    if (!l.accountCode?.trim() || debit < 0 || credit < 0 || (debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      return {
        isValid: false,
        totalDebitCentimes,
        totalCreditCentimes,
        deltaCentimes: totalDebitCentimes - totalCreditCentimes,
        errorCode: 'SCF_LINE_INVALID',
        errorMessage: 'Chaque ligne SCF doit comporter un compte valide et un seul côté positif (Débit ou Crédit).',
      };
    }
    totalDebitCentimes = addCentimes(totalDebitCentimes, debit);
    totalCreditCentimes = addCentimes(totalCreditCentimes, credit);
  }

  const legalCheck = validateAndBalanceSCFEntry(
    lines.map((l) => ({
      accountNumber: l.accountCode,
      debitDzd: centimesToDzd(l.debitCentimes),
      creditDzd: centimesToDzd(l.creditCentimes),
    }))
  );

  const deltaCentimes = totalDebitCentimes - totalCreditCentimes;
  if (totalDebitCentimes <= 0 || deltaCentimes !== 0 || !legalCheck.isBalanced) {
    return {
      isValid: false,
      totalDebitCentimes,
      totalCreditCentimes,
      deltaCentimes,
      errorCode: 'SCF_ENTRY_UNBALANCED',
      errorMessage:
        legalCheck.error ||
        `Écriture SCF déséquilibrée de ${centimesToDzd(Math.abs(deltaCentimes)).toFixed(2)} DA.`,
    };
  }

  return {
    isValid: true,
    totalDebitCentimes,
    totalCreditCentimes,
    deltaCentimes: 0,
  };
}

export function convertForeignCentimesToDzd(
  amountCentimes: number,
  currency: UnifiedCurrency,
  fxRate: number
): number {
  const safeRate = currency === 'DZD' ? 1 : Math.max(0.000001, Number(fxRate || 1));
  return roundHalfAwayFromZero(amountCentimes * safeRate);
}

/**
 * Resolves any FX / centime rounding residual onto SCF accounts 656000 / 756000
 * if the discrepancy is within rounding tolerance (default <= 500 centimes = 5 DZD).
 */
export function absorbRoundingOrFxDelta(
  lines: ScfLineDraftInput[],
  maxToleranceCentimes = 500
): ScfLineDraftInput[] {
  const debit = lines.reduce((s, l) => s + roundHalfAwayFromZero(l.debitCentimes), 0);
  const credit = lines.reduce((s, l) => s + roundHalfAwayFromZero(l.creditCentimes), 0);
  const diff = debit - credit;
  if (diff === 0 || Math.abs(diff) > maxToleranceCentimes) {
    return lines;
  }
  if (diff > 0) {
    // Debit exceeds credit -> credit 756000 (FX/Rounding Gain)
    return [
      ...lines,
      {
        accountCode: '756000',
        accountLabel: "Gains de change et écarts d'arrondi",
        debitCentimes: 0,
        creditCentimes: diff,
      },
    ];
  }
  // Credit exceeds debit -> debit 656000 (FX/Rounding Loss)
  return [
    ...lines,
    {
      accountCode: '656000',
      accountLabel: "Pertes de change et écarts d'arrondi",
      debitCentimes: Math.abs(diff),
      creditCentimes: 0,
    },
  ];
}

export interface ScfPostingDraft {
  journalCode: ScfJournalCode;
  entryDate: string;
  pieceRef: string;
  libelle: string;
  sourceVertical: string;
  sourceEventType: ScfPostingEventType;
  sourceDocId?: string;
  idempotencyKey: string;
  currency: UnifiedCurrency;
  fxRate: number;
  lines: ScfLineDraftInput[];
}

function getTreasuryAccountForMethod(method: string): { code: string; label: string } {
  switch (method) {
    case 'cash':
      return { code: '530000', label: 'Caisse centrale' };
    case 'ccp':
    case 'baridimob':
      return { code: '517000', label: 'CCP Algérie Poste / BaridiMob' };
    case 'cheque':
    case 'traite':
      return { code: '511300', label: 'Effets et chèques à encaisser' };
    case 'bank_transfer':
    case 'cib':
    default:
      return { code: '512000', label: 'Banques comptes courants' };
  }
}

export function buildPostingForUnifiedDocument(doc: UnifiedDocument): ScfPostingDraft | null {
  if (!['facture', 'avoir', 'retour', 'receipt'].includes(doc.docType)) {
    return null;
  }

  const currency = doc.currency || 'DZD';
  const fxRate = currency === 'DZD' ? 1 : Math.max(0.000001, Number(doc.fxRate || 1));
  const isCreditNote = doc.docType === 'avoir' || doc.docType === 'retour';

  const ttcOriginal = doc.netToPayCentimes > 0 ? doc.netToPayCentimes : doc.totalTtcCentimes;
  const htOriginal = doc.totalHtFinalCentimes;
  const tvaOriginal = doc.totalTvaCentimes;
  const timbreOriginal = doc.timbreFiscalCentimes;
  const retentionOriginal = doc.guaranteeRetentionCentimes;

  const ttcDzd = convertForeignCentimesToDzd(ttcOriginal + retentionOriginal, currency, fxRate);
  const htDzd = convertForeignCentimesToDzd(htOriginal, currency, fxRate);
  const tvaDzd = convertForeignCentimesToDzd(tvaOriginal, currency, fxRate);
  const timbreDzd = convertForeignCentimesToDzd(timbreOriginal, currency, fxRate);

  const hasOnlyServices =
    Array.isArray(doc.items) && doc.items.length > 0 && doc.items.every((i) => i.isService);
  const revenueCode = hasOnlyServices ? '706000' : '700000';
  const revenueLabel = hasOnlyServices ? 'Prestations de services' : 'Ventes de marchandises';

  const rawLines: ScfLineDraftInput[] = [];
  if (ttcDzd > 0) {
    rawLines.push({
      accountCode: '411000',
      accountLabel: 'Clients',
      partyId: doc.partyId,
      partyName: doc.partyName,
      debitCentimes: isCreditNote ? 0 : ttcDzd,
      creditCentimes: isCreditNote ? ttcDzd : 0,
      originalCurrency: currency,
      originalAmountCentimes: ttcOriginal + retentionOriginal,
      fxRate,
    });
  }
  if (htDzd > 0) {
    rawLines.push({
      accountCode: revenueCode,
      accountLabel: revenueLabel,
      partyId: doc.partyId,
      partyName: doc.partyName,
      debitCentimes: isCreditNote ? htDzd : 0,
      creditCentimes: isCreditNote ? 0 : htDzd,
      originalCurrency: currency,
      originalAmountCentimes: htOriginal,
      fxRate,
    });
  }
  if (tvaDzd > 0) {
    rawLines.push({
      accountCode: '445700',
      accountLabel: 'TVA collectée sur ventes et prestations',
      debitCentimes: isCreditNote ? tvaDzd : 0,
      creditCentimes: isCreditNote ? 0 : tvaDzd,
      originalCurrency: currency,
      originalAmountCentimes: tvaOriginal,
      fxRate,
    });
  }
  if (timbreDzd > 0) {
    rawLines.push({
      accountCode: '447000',
      accountLabel: 'Autres impôts, taxes et droits de timbre',
      debitCentimes: isCreditNote ? timbreDzd : 0,
      creditCentimes: isCreditNote ? 0 : timbreDzd,
      originalCurrency: currency,
      originalAmountCentimes: timbreOriginal,
      fxRate,
    });
  }

  const lines = absorbRoundingOrFxDelta(rawLines, 500);
  const pieceRef = doc.docNumber || doc.draftNumber;

  return {
    journalCode: 'VE',
    entryDate: doc.docDate || new Date().toISOString().slice(0, 10),
    pieceRef,
    libelle: isCreditNote
      ? `Avoir ${pieceRef} · ${doc.partyName}`
      : `Facturation ${pieceRef} · ${doc.partyName}`,
    sourceVertical: doc.sourceVertical || 'trading_commercial',
    sourceEventType: 'sale_invoice',
    sourceDocId: doc.id,
    idempotencyKey: `doc_issue:${doc.id}`,
    currency,
    fxRate,
    lines,
  };
}

export function buildPostingForUnifiedPayment(payment: UnifiedPayment): ScfPostingDraft {
  const currency = payment.currency || 'DZD';
  const fxRate = currency === 'DZD' ? 1 : Math.max(0.000001, Number(payment.fxRate || 1));
  const amountDzd = convertForeignCentimesToDzd(payment.amountCentimes, currency, fxRate);
  const treasury = getTreasuryAccountForMethod(payment.method);
  const isCash = payment.method === 'cash';
  const isOutflow = payment.direction === 'outflow';
  const counterpartyCode = isOutflow ? '401000' : '411000';
  const counterpartyLabel = isOutflow ? 'Fournisseurs de stocks et services' : 'Clients';

  const lines: ScfLineDraftInput[] = isOutflow
    ? [
        {
          accountCode: counterpartyCode,
          accountLabel: counterpartyLabel,
          partyId: payment.partyId,
          partyName: payment.partyName,
          debitCentimes: amountDzd,
          creditCentimes: 0,
          originalCurrency: currency,
          originalAmountCentimes: payment.amountCentimes,
          fxRate,
        },
        {
          accountCode: treasury.code,
          accountLabel: treasury.label,
          partyId: payment.partyId,
          partyName: payment.partyName,
          debitCentimes: 0,
          creditCentimes: amountDzd,
          originalCurrency: currency,
          originalAmountCentimes: payment.amountCentimes,
          fxRate,
        },
      ]
    : [
        {
          accountCode: treasury.code,
          accountLabel: treasury.label,
          partyId: payment.partyId,
          partyName: payment.partyName,
          debitCentimes: amountDzd,
          creditCentimes: 0,
          originalCurrency: currency,
          originalAmountCentimes: payment.amountCentimes,
          fxRate,
        },
        {
          accountCode: counterpartyCode,
          accountLabel: counterpartyLabel,
          partyId: payment.partyId,
          partyName: payment.partyName,
          debitCentimes: 0,
          creditCentimes: amountDzd,
          originalCurrency: currency,
          originalAmountCentimes: payment.amountCentimes,
          fxRate,
        },
      ];

  return {
    journalCode: isCash ? 'CA' : 'BQ',
    entryDate: payment.paymentDate || new Date().toISOString().slice(0, 10),
    pieceRef: payment.paymentNumber,
    libelle: `${isOutflow ? 'Décaissement' : 'Encaissement'} ${payment.paymentNumber} (${payment.method.toUpperCase()}) · ${payment.partyName}`,
    sourceVertical: payment.sourceVertical || 'trading_commercial',
    sourceEventType: 'payment',
    sourceDocId: payment.id,
    idempotencyKey: `payment:${payment.id}`,
    currency,
    fxRate,
    lines,
  };
}

export function buildPostingForInstrumentTransition(
  payment: UnifiedPayment,
  transition: 'cleared' | 'bounced',
  reason?: string
): ScfPostingDraft {
  const currency = payment.currency || 'DZD';
  const fxRate = currency === 'DZD' ? 1 : Math.max(0.000001, Number(payment.fxRate || 1));
  const amountDzd = convertForeignCentimesToDzd(payment.amountCentimes, currency, fxRate);
  const entryDate = new Date().toISOString().slice(0, 10);

  if (transition === 'cleared') {
    return {
      journalCode: 'BQ',
      entryDate,
      pieceRef: payment.instrumentNumber || payment.paymentNumber,
      libelle: `Encaissement effet ${payment.paymentNumber}${payment.instrumentNumber ? ` #${payment.instrumentNumber}` : ''} · ${payment.partyName}`,
      sourceVertical: payment.sourceVertical || 'trading_commercial',
      sourceEventType: 'instrument_clear',
      sourceDocId: payment.id,
      idempotencyKey: `instrument_clear:${payment.id}`,
      currency,
      fxRate,
      lines: [
        {
          accountCode: '512000',
          accountLabel: 'Banques comptes courants',
          partyId: payment.partyId,
          partyName: payment.partyName,
          debitCentimes: amountDzd,
          creditCentimes: 0,
          originalCurrency: currency,
          originalAmountCentimes: payment.amountCentimes,
          fxRate,
        },
        {
          accountCode: '511300',
          accountLabel: 'Effets et chèques à encaisser',
          partyId: payment.partyId,
          partyName: payment.partyName,
          debitCentimes: 0,
          creditCentimes: amountDzd,
          originalCurrency: currency,
          originalAmountCentimes: payment.amountCentimes,
          fxRate,
        },
      ],
    };
  }

  // Bounce reversal: credit either 512000 if it had been cleared or 511300 if still pending clearance
  const creditCode = payment.status === 'posted' ? '512000' : '511300';
  const creditLabel =
    payment.status === 'posted'
      ? 'Banques comptes courants'
      : 'Effets et chèques à encaisser';

  return {
    journalCode: 'BQ',
    entryDate,
    pieceRef: payment.instrumentNumber || payment.paymentNumber,
    libelle: `Impayé effet ${payment.paymentNumber}${reason ? ` (${reason})` : ''} · ${payment.partyName}`,
    sourceVertical: payment.sourceVertical || 'trading_commercial',
    sourceEventType: 'instrument_bounce',
    sourceDocId: payment.id,
    idempotencyKey: `instrument_bounce:${payment.id}`,
    currency,
    fxRate,
    lines: [
      {
        accountCode: '411000',
        accountLabel: 'Clients',
        partyId: payment.partyId,
        partyName: payment.partyName,
        debitCentimes: amountDzd,
        creditCentimes: 0,
        originalCurrency: currency,
        originalAmountCentimes: payment.amountCentimes,
        fxRate,
      },
      {
        accountCode: creditCode,
        accountLabel: creditLabel,
        partyId: payment.partyId,
        partyName: payment.partyName,
        debitCentimes: 0,
        creditCentimes: amountDzd,
        originalCurrency: currency,
        originalAmountCentimes: payment.amountCentimes,
        fxRate,
      },
    ],
  };
}

export function buildPostingForPayrollRun(
  run: StaffPayrollRunRecord,
  options?: { employerCnasRatePercent?: number }
): ScfPostingDraft {
  const grossCentimes = dzdToCentimes(Math.max(0, run.totalGrossCotisable || 0));
  const netCentimes = dzdToCentimes(Math.max(0, run.totalNet || 0));
  const employeeCnasCentimes = dzdToCentimes(Math.max(0, run.totalCnasSalarial || 0));
  const irgCentimes = dzdToCentimes(Math.max(0, run.totalIrg || 0));
  const advancesCentimes = Math.max(
    0,
    grossCentimes - employeeCnasCentimes - irgCentimes - netCentimes
  );
  const employerCnasRate = options?.employerCnasRatePercent ?? 26;
  const employerCnasCentimes =
    run.totalCnasPatronal && run.totalCnasPatronal > 0
      ? dzdToCentimes(run.totalCnasPatronal)
      : roundHalfAwayFromZero((grossCentimes * employerCnasRate) / 100);
  const periodMonth = String(run.periodMonth).padStart(2, '0');
  const entryDate = `${run.periodYear}-${periodMonth}-28`;

  const lines: ScfLineDraftInput[] = [
    {
      accountCode: '631000',
      accountLabel: 'Rémunérations du personnel',
      debitCentimes: grossCentimes,
      creditCentimes: 0,
    },
  ];

  if (employerCnasCentimes > 0) {
    lines.push({
      accountCode: '635000',
      accountLabel: 'Cotisations patronales aux organismes sociaux',
      debitCentimes: employerCnasCentimes,
      creditCentimes: 0,
    });
  }

  if (netCentimes > 0) {
    lines.push({
      accountCode: '421000',
      accountLabel: 'Personnel - Rémunérations dues',
      debitCentimes: 0,
      creditCentimes: netCentimes,
    });
  }

  const totalCnas = employeeCnasCentimes + employerCnasCentimes;
  if (totalCnas > 0) {
    lines.push({
      accountCode: '431000',
      accountLabel: 'Sécurité sociale (CNAS)',
      debitCentimes: 0,
      creditCentimes: totalCnas,
    });
  }

  if (irgCentimes > 0) {
    lines.push({
      accountCode: '442000',
      accountLabel: 'État - Impôts et taxes / IRG Salaires',
      debitCentimes: 0,
      creditCentimes: irgCentimes,
    });
  }

  if (advancesCentimes > 0) {
    lines.push({
      accountCode: '425000',
      accountLabel: 'Personnel - Avances et acomptes',
      debitCentimes: 0,
      creditCentimes: advancesCentimes,
    });
  }

  return {
    journalCode: 'PA',
    entryDate,
    pieceRef: run.title || `PAIE-${run.periodYear}-${periodMonth}`,
    libelle: `Paie ${run.title} (${run.slipsCount} sal.)`,
    sourceVertical: 'workforce_payroll',
    sourceEventType: 'payroll_run',
    sourceDocId: run.id,
    idempotencyKey: `payroll_run:${run.id}`,
    currency: 'DZD',
    fxRate: 1,
    lines: absorbRoundingOrFxDelta(lines, 500),
  };
}

export function buildPostingForPurchaseReceipt(doc: PurchaseDocument): ScfPostingDraft {
  const htCentimes = dzdToCentimes(Math.max(0, doc.totalHt || 0));
  const tvaCentimes = dzdToCentimes(Math.max(0, doc.totalTva || 0));
  const ttcCentimes = dzdToCentimes(Math.max(0, doc.totalTtc || doc.totalHt + doc.totalTva));
  const lines: ScfLineDraftInput[] = [];

  if (htCentimes > 0) {
    lines.push({
      accountCode: '600000',
      accountLabel: 'Achats de marchandises vendues',
      partyId: doc.supplierId,
      partyName: doc.supplierName,
      debitCentimes: htCentimes,
      creditCentimes: 0,
    });
  }
  if (tvaCentimes > 0) {
    lines.push({
      accountCode: '445600',
      accountLabel: 'TVA déductible sur achats et services',
      debitCentimes: tvaCentimes,
      creditCentimes: 0,
    });
  }
  if (ttcCentimes > 0) {
    lines.push({
      accountCode: '401000',
      accountLabel: 'Fournisseurs de stocks et services',
      partyId: doc.supplierId,
      partyName: doc.supplierName,
      debitCentimes: 0,
      creditCentimes: ttcCentimes,
    });
  }

  return {
    journalCode: 'AC',
    entryDate: doc.actualDeliveryDate || doc.orderDate || new Date().toISOString().slice(0, 10),
    pieceRef: doc.docNumber,
    libelle: `Réception achat ${doc.docNumber} · ${doc.supplierName}`,
    sourceVertical: 'trading_commercial',
    sourceEventType: 'purchase_receipt',
    sourceDocId: doc.id,
    idempotencyKey: `purchase_receipt:${doc.id}`,
    currency: 'DZD',
    fxRate: 1,
    lines: absorbRoundingOrFxDelta(lines, 500),
  };
}

export function buildPostingForStockVoucher(voucher: StockMovementVoucher): ScfPostingDraft | null {
  if (voucher.type !== 'entree' && voucher.type !== 'sortie') return null;
  const valCentimes = dzdToCentimes(Math.max(0, voucher.totalValuationDzd || 0));
  if (valCentimes <= 0) return null;

  const isEntree = voucher.type === 'entree';
  return {
    journalCode: 'ST',
    entryDate: voucher.date || new Date().toISOString().slice(0, 10),
    pieceRef: voucher.voucherNumber,
    libelle: `${isEntree ? 'Entrée stock' : 'Sortie stock'} ${voucher.voucherNumber} (${voucher.reason})`,
    sourceVertical: 'trading_commercial',
    sourceEventType: 'stock_movement',
    sourceDocId: voucher.id,
    idempotencyKey: `stock_voucher:${voucher.id}`,
    currency: 'DZD',
    fxRate: 1,
    lines: isEntree
      ? [
          {
            accountCode: '300000',
            accountLabel: 'Stocks de marchandises',
            debitCentimes: valCentimes,
            creditCentimes: 0,
          },
          {
            accountCode: '600000',
            accountLabel: 'Achats de marchandises vendues',
            debitCentimes: 0,
            creditCentimes: valCentimes,
          },
        ]
      : [
          {
            accountCode: '600000',
            accountLabel: 'Achats de marchandises vendues',
            debitCentimes: valCentimes,
            creditCentimes: 0,
          },
          {
            accountCode: '300000',
            accountLabel: 'Stocks de marchandises',
            debitCentimes: 0,
            creditCentimes: valCentimes,
          },
        ],
  };
}

export function buildPostingForPosSale(sale: Sale): ScfPostingDraft {
  const totalCentimes = dzdToCentimes(Math.max(0, sale.totalAmount || 0));
  const tvaCentimes = dzdToCentimes(Math.max(0, sale.taxAmount || 0));
  const htCentimes = Math.max(0, totalCentimes - tvaCentimes);
  const methodNorm =
    sale.paymentMethod === 'Cash'
      ? 'cash'
      : sale.paymentMethod === 'BankTransfer'
        ? 'bank_transfer'
        : sale.paymentMethod === 'Credit'
          ? 'credit'
          : 'cib';
  const debitAcct =
    methodNorm === 'credit'
      ? { code: '411000', label: 'Clients' }
      : getTreasuryAccountForMethod(methodNorm);

  const lines: ScfLineDraftInput[] = [
    {
      accountCode: debitAcct.code,
      accountLabel: debitAcct.label,
      partyId: sale.memberId,
      partyName: sale.memberName || 'Client Comptoir',
      debitCentimes: totalCentimes,
      creditCentimes: 0,
    },
    {
      accountCode: '700000',
      accountLabel: 'Ventes de marchandises',
      debitCentimes: 0,
      creditCentimes: htCentimes,
    },
  ];
  if (tvaCentimes > 0) {
    lines.push({
      accountCode: '445700',
      accountLabel: 'TVA collectée sur ventes et prestations',
      debitCentimes: 0,
      creditCentimes: tvaCentimes,
    });
  }

  return {
    journalCode: methodNorm === 'cash' ? 'CA' : 'VE',
    entryDate: (sale.createdAt || new Date().toISOString()).slice(0, 10),
    pieceRef: `POS-${sale.id.slice(-6).toUpperCase()}`,
    libelle: `Vente POS · ${sale.memberName || 'Comptoir'}`,
    sourceVertical: 'pos_inventory',
    sourceEventType: 'pos_sale',
    sourceDocId: sale.id,
    idempotencyKey: `pos_sale:${sale.id}`,
    currency: 'DZD',
    fxRate: 1,
    lines: absorbRoundingOrFxDelta(lines, 500),
  };
}

export function buildPostingFromLegalScfEntry(entry: SCFJournalEntry): ScfPostingDraft {
  return {
    journalCode: entry.journalCode,
    entryDate: entry.date || new Date().toISOString().slice(0, 10),
    pieceRef: entry.pieceJustificativeRef || entry.entryNumber,
    libelle: entry.libelle,
    sourceVertical: 'legal_accounting',
    sourceEventType: 'legal_scf',
    sourceDocId: entry.id,
    idempotencyKey: `legal_scf:${entry.id}`,
    currency: 'DZD',
    fxRate: 1,
    lines: (entry.lines || []).map((l) => ({
      accountCode: l.accountNumber,
      accountLabel: l.accountLabel,
      debitCentimes: dzdToCentimes(Number(l.debitDzd || 0)),
      creditCentimes: dzdToCentimes(Number(l.creditDzd || 0)),
    })),
  };
}

export function buildReversalDraft(
  original: ScfJournalEntry,
  reversalDate: string,
  reason?: string
): ScfPostingDraft {
  if (original.status === 'reversed') {
    throw new Error('SCF_ENTRY_ALREADY_REVERSED');
  }
  return {
    journalCode: original.journalCode,
    entryDate: reversalDate,
    pieceRef: original.entryNumber,
    libelle: `Contre-passation ${original.entryNumber}${reason ? ` · ${reason.trim()}` : ''}`,
    sourceVertical: original.sourceVertical,
    sourceEventType: 'reversal',
    sourceDocId: original.id,
    idempotencyKey: `rev:${original.id}`,
    currency: original.currency,
    fxRate: original.fxRate,
    lines: original.lines.map((l) => ({
      accountCode: l.accountCode,
      accountLabel: l.accountLabel,
      partyId: l.partyId,
      partyName: l.partyName,
      debitCentimes: l.creditCentimes,
      creditCentimes: l.debitCentimes,
      originalCurrency: l.originalCurrency,
      originalAmountCentimes: l.originalAmountCentimes,
      fxRate: l.fxRate,
    })),
  };
}

export interface TrialBalanceRow {
  accountCode: string;
  accountLabel: string;
  scfClass: ScfAccountClass;
  totalDebitCentimes: number;
  totalCreditCentimes: number;
  closingDebitBalanceCentimes: number;
  closingCreditBalanceCentimes: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalMovementsDebitCentimes: number;
  totalMovementsCreditCentimes: number;
  totalClosingDebitCentimes: number;
  totalClosingCreditCentimes: number;
  isBalanced: boolean;
}

export function computeTrialBalance(
  entries: ScfJournalEntry[],
  accounts: ScfAccount[],
  options?: { periodKey?: string; journalCode?: ScfJournalCode | 'ALL' }
): TrialBalanceReport {
  const acctMap = new Map(accounts.map((a) => [a.code, a]));
  const totalsByCode = new Map<
    string,
    { label: string; debitCentimes: number; creditCentimes: number }
  >();

  for (const entry of entries) {
    if (options?.periodKey && options.periodKey !== 'ALL' && entry.periodKey !== options.periodKey) {
      continue;
    }
    if (options?.journalCode && options.journalCode !== 'ALL' && entry.journalCode !== options.journalCode) {
      continue;
    }
    for (const line of entry.lines) {
      const prev = totalsByCode.get(line.accountCode) || {
        label: acctMap.get(line.accountCode)?.labelFr || line.accountLabel || line.accountCode,
        debitCentimes: 0,
        creditCentimes: 0,
      };
      prev.debitCentimes += line.debitCentimes;
      prev.creditCentimes += line.creditCentimes;
      totalsByCode.set(line.accountCode, prev);
    }
  }

  const rows: TrialBalanceRow[] = Array.from(totalsByCode.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, agg]) => {
      const net = agg.debitCentimes - agg.creditCentimes;
      const clsNum = Number(code[0]);
      const scfClass = (clsNum >= 1 && clsNum <= 7 ? clsNum : 4) as ScfAccountClass;
      return {
        accountCode: code,
        accountLabel: agg.label,
        scfClass,
        totalDebitCentimes: agg.debitCentimes,
        totalCreditCentimes: agg.creditCentimes,
        closingDebitBalanceCentimes: net > 0 ? net : 0,
        closingCreditBalanceCentimes: net < 0 ? Math.abs(net) : 0,
      };
    });

  const totalMovementsDebitCentimes = rows.reduce((s, r) => s + r.totalDebitCentimes, 0);
  const totalMovementsCreditCentimes = rows.reduce((s, r) => s + r.totalCreditCentimes, 0);
  const totalClosingDebitCentimes = rows.reduce((s, r) => s + r.closingDebitBalanceCentimes, 0);
  const totalClosingCreditCentimes = rows.reduce((s, r) => s + r.closingCreditBalanceCentimes, 0);

  return {
    rows,
    totalMovementsDebitCentimes,
    totalMovementsCreditCentimes,
    totalClosingDebitCentimes,
    totalClosingCreditCentimes,
    isBalanced:
      totalMovementsDebitCentimes === totalMovementsCreditCentimes &&
      totalClosingDebitCentimes === totalClosingCreditCentimes,
  };
}

export interface GeneralLedgerRow {
  entryId: string;
  lineId: string;
  entryNumber: string;
  journalCode: ScfJournalCode;
  entryDate: string;
  pieceRef: string;
  libelle: string;
  partyName?: string;
  debitCentimes: number;
  creditCentimes: number;
  runningBalanceCentimes: number;
  reconciled: boolean;
  reconciliationRef?: string;
  statementDate?: string;
  status: ScfJournalEntry['status'];
}

export function computeGeneralLedger(
  entries: ScfJournalEntry[],
  accountCode: string,
  options?: { periodKey?: string }
): {
  accountCode: string;
  rows: GeneralLedgerRow[];
  totalDebitCentimes: number;
  totalCreditCentimes: number;
  endingBalanceCentimes: number;
} {
  const matched: Array<{ entry: ScfJournalEntry; line: ScfJournalLine }> = [];
  for (const entry of entries) {
    if (options?.periodKey && options.periodKey !== 'ALL' && entry.periodKey !== options.periodKey) {
      continue;
    }
    for (const line of entry.lines) {
      if (line.accountCode === accountCode) {
        matched.push({ entry, line });
      }
    }
  }

  matched.sort(
    (a, b) =>
      a.entry.entryDate.localeCompare(b.entry.entryDate) ||
      a.entry.entryNumber.localeCompare(b.entry.entryNumber) ||
      a.line.lineNo - b.line.lineNo
  );

  let running = 0;
  let totalDebitCentimes = 0;
  let totalCreditCentimes = 0;

  const rows: GeneralLedgerRow[] = matched.map(({ entry, line }) => {
    totalDebitCentimes += line.debitCentimes;
    totalCreditCentimes += line.creditCentimes;
    running += line.debitCentimes - line.creditCentimes;
    return {
      entryId: entry.id,
      lineId: line.id,
      entryNumber: entry.entryNumber,
      journalCode: entry.journalCode,
      entryDate: entry.entryDate,
      pieceRef: entry.pieceRef,
      libelle: entry.libelle,
      partyName: line.partyName,
      debitCentimes: line.debitCentimes,
      creditCentimes: line.creditCentimes,
      runningBalanceCentimes: running,
      reconciled: line.reconciled,
      reconciliationRef: line.reconciliationRef,
      statementDate: line.statementDate,
      status: entry.status,
    };
  });

  return {
    accountCode,
    rows,
    totalDebitCentimes,
    totalCreditCentimes,
    endingBalanceCentimes: running,
  };
}

export interface BankCashReconciliationSummary {
  accountCode: string;
  bookBalanceCentimes: number;
  reconciledBalanceCentimes: number;
  unreconciledDeltaCentimes: number;
  reconciledCount: number;
  unreconciledCount: number;
  lines: GeneralLedgerRow[];
}

export function computeBankCashReconciliation(
  entries: ScfJournalEntry[],
  accountCode: string,
  options?: { periodKey?: string }
): BankCashReconciliationSummary {
  const gl = computeGeneralLedger(entries, accountCode, options);
  let reconciledBalanceCentimes = 0;
  let reconciledCount = 0;
  let unreconciledCount = 0;

  for (const row of gl.rows) {
    if (row.reconciled) {
      reconciledBalanceCentimes += row.debitCentimes - row.creditCentimes;
      reconciledCount += 1;
    } else {
      unreconciledCount += 1;
    }
  }

  return {
    accountCode,
    bookBalanceCentimes: gl.endingBalanceCentimes,
    reconciledBalanceCentimes,
    unreconciledDeltaCentimes: gl.endingBalanceCentimes - reconciledBalanceCentimes,
    reconciledCount,
    unreconciledCount,
    lines: gl.rows,
  };
}

export interface TvaG50AidReport {
  periodKey: string;
  disclaimer: string;
  taxableTurnoverHtCentimes: number; // Class 70 net credits
  tvaCollectedCentimes: number; // 4457xx net credits
  tvaDeductibleCentimes: number; // 4456xx net debits
  netTvaPayableCentimes: number; // max(0, collected - deductible)
  tvaCreditCarryForwardCentimes: number; // max(0, deductible - collected)
  timbreFiscalCentimes: number; // 447xxx net credits
  irgSalariesCentimes: number; // 442xxx net credits
  cnasPayableCentimes: number; // 431xxx net credits
  sourceEntriesCount: number;
}

export function computeTvaG50AidReport(
  entries: ScfJournalEntry[],
  periodKey: string,
  language: 'en' | 'fr' | 'ar' = 'fr'
): TvaG50AidReport {
  let taxableTurnoverHtCentimes = 0;
  let tvaCollectedCentimes = 0;
  let tvaDeductibleCentimes = 0;
  let timbreFiscalCentimes = 0;
  let irgSalariesCentimes = 0;
  let cnasPayableCentimes = 0;
  let sourceEntriesCount = 0;

  for (const entry of entries) {
    if (periodKey !== 'ALL' && entry.periodKey !== periodKey) continue;
    sourceEntriesCount += 1;
    for (const line of entry.lines) {
      const code = line.accountCode;
      if (code.startsWith('70')) {
        taxableTurnoverHtCentimes += line.creditCentimes - line.debitCentimes;
      } else if (code.startsWith('4457')) {
        tvaCollectedCentimes += line.creditCentimes - line.debitCentimes;
      } else if (code.startsWith('4456')) {
        tvaDeductibleCentimes += line.debitCentimes - line.creditCentimes;
      } else if (code.startsWith('447')) {
        timbreFiscalCentimes += line.creditCentimes - line.debitCentimes;
      } else if (code.startsWith('442')) {
        irgSalariesCentimes += line.creditCentimes - line.debitCentimes;
      } else if (code.startsWith('431')) {
        cnasPayableCentimes += line.creditCentimes - line.debitCentimes;
      }
    }
  }

  const netTvaDiff = tvaCollectedCentimes - tvaDeductibleCentimes;

  return {
    periodKey,
    disclaimer: getG50PreparationDisclaimer(language),
    taxableTurnoverHtCentimes,
    tvaCollectedCentimes,
    tvaDeductibleCentimes,
    netTvaPayableCentimes: netTvaDiff > 0 ? netTvaDiff : 0,
    tvaCreditCarryForwardCentimes: netTvaDiff < 0 ? Math.abs(netTvaDiff) : 0,
    timbreFiscalCentimes: Math.max(0, timbreFiscalCentimes),
    irgSalariesCentimes: Math.max(0, irgSalariesCentimes),
    cnasPayableCentimes: Math.max(0, cnasPayableCentimes),
    sourceEntriesCount,
  };
}

export function escapeScfCsvCell(value: string | number | boolean | null | undefined): string {
  const raw = String(value ?? '');
  const trimmedStart = raw.replace(/^[\t\r\n ]+/, '');
  const neutralized = /^[=+\-@]/.test(trimmedStart) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function buildScfCsvContent(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
  headerNote?: string
): string {
  const out: string[] = [];
  if (headerNote) {
    out.push(escapeScfCsvCell(headerNote));
  }
  out.push(headers.map((h) => escapeScfCsvCell(h)).join(','));
  for (const row of rows) {
    out.push(row.map((c) => escapeScfCsvCell(c)).join(','));
  }
  return `\uFEFF${out.join('\n')}`;
}
