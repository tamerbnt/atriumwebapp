import {
  addCentimes,
  centimesToDzd,
  dzdToCentimes,
  roundHalfAwayFromZero,
  subtractCentimes,
} from './money';
import { numberToWordsArabic, numberToWordsFrench } from './algerianPtt';
import { calculateArt317Timbre } from './rules';
import type { StatutoryRateSet } from '../lib/supabase/services/referenceDataService';
import type {
  Branch,
  Business,
  BusinessCategoryConfig,
  ChequeInstrumentStatus,
  CommercialDocument,
  TimbreCalculationBasis,
  UnifiedCurrency,
  UnifiedDocType,
  UnifiedDocument,
  UnifiedDocumentLine,
  UnifiedFiscalHeaderSnapshot,
  UnifiedPayment,
  UnifiedPaymentAllocation,
  UnifiedPaymentMethod,
  UnifiedTvaBreakdownEntry,
} from '../types/index';

export interface UnifiedLineInput {
  id?: string;
  productId?: string;
  description: string;
  isService?: boolean;
  quantity: number;
  unit?: string;
  unitPriceHt: number;
  tvaPercent?: number;
  discountPercent?: number;
}

export interface UnifiedDocumentCalculationInput {
  items: UnifiedLineInput[];
  generalDiscountPercent?: number;
  guaranteeRetentionPercent?: number;
  paymentMethod?: UnifiedPaymentMethod | string;
  timbreBasis?: TimbreCalculationBasis;
  isCashFiscalStampEnabled?: boolean;
  currency?: UnifiedCurrency;
  fxRate?: number;
  statutoryRate?: StatutoryRateSet | null;
}

export interface UnifiedDocumentCalculationResult {
  items: UnifiedDocumentLine[];
  tvaBreakdown: UnifiedTvaBreakdownEntry[];
  totalHtRawCentimes: number;
  totalHtFinalCentimes: number;
  totalTvaCentimes: number;
  timbreFiscalCentimes: number;
  totalTtcCentimes: number;
  guaranteeRetentionCentimes: number;
  netToPayCentimes: number;
  netToPayDzdEquivalentCentimes: number;
  totalsInWordsFr: string;
  totalsInWordsAr: string;
}

export function isCashPaymentMethod(method?: string): boolean {
  if (!method) return false;
  const norm = method.trim().toLowerCase();
  return (
    norm === 'cash' ||
    norm.includes('espèces') ||
    norm.includes('especes') ||
    norm.includes('caisse') ||
    norm.includes('نقد') ||
    norm.includes('كاش')
  );
}

export function normalizeUnifiedPaymentMethod(method?: string): UnifiedPaymentMethod {
  const m = (method || '').trim().toLowerCase();
  if (m === 'ccp' || m.includes('ccp') || m.includes('poste')) return 'ccp';
  if (m === 'cheque' || m.includes('chèque') || m.includes('cheque')) return 'cheque';
  if (m === 'traite' || m.includes('traite') || m.includes('effet')) return 'traite';
  if (m === 'cib' || m.includes('cib') || m.includes('dahabia') || m === 'card' || m.includes('carte')) return 'cib';
  if (m === 'baridimob' || m.includes('baridi')) return 'baridimob';
  if (m === 'member_balance' || m.includes('balance') || m.includes('solde')) return 'member_balance';
  if (m === 'credit' || m.includes('terme') || m.includes('crédit')) return 'credit';
  if (isCashPaymentMethod(m)) return 'cash';
  return 'bank_transfer';
}

export function computeTimbreFromConfigCentimes(
  ttcBeforeTimbreCentimes: number,
  basis: TimbreCalculationBasis,
  statutoryRate?: StatutoryRateSet | null
): number {
  if (basis === 'exempt' || ttcBeforeTimbreCentimes <= 0) return 0;

  const amountDzd = centimesToDzd(ttcBeforeTimbreCentimes);
  if (basis === 'art_317') {
    const customBrackets = statutoryRate?.timbreConfig?.art_317_brackets as
      | Array<{ max_dzd: number; stamp_dzd: number }>
      | undefined;
    if (Array.isArray(customBrackets) && customBrackets.length > 0) {
      const sorted = [...customBrackets].sort((a, b) => a.max_dzd - b.max_dzd);
      for (const b of sorted) {
        if (amountDzd <= b.max_dzd) return dzdToCentimes(b.stamp_dzd);
      }
      const overCfg = statutoryRate?.timbreConfig?.art_317_over_limit as
        | { rate?: number; max_dzd?: number }
        | undefined;
      const rate = typeof overCfg?.rate === 'number' ? overCfg.rate : 0.01;
      const cap = typeof overCfg?.max_dzd === 'number' ? overCfg.max_dzd : 2500;
      return dzdToCentimes(Math.min(cap, Math.round(amountDzd * rate)));
    }
    return dzdToCentimes(calculateArt317Timbre(amountDzd));
  }

  // commercial_cash (default 1% min 20 max 2500 or from statutory_rates.timbre_config)
  const cc = statutoryRate?.timbreConfig?.commercial_cash as
    | { rate?: number; min_dzd?: number; max_dzd?: number }
    | undefined;
  const rate = typeof cc?.rate === 'number' ? cc.rate : 0.01;
  const minDzd = typeof cc?.min_dzd === 'number' ? cc.min_dzd : 20;
  const maxDzd = typeof cc?.max_dzd === 'number' ? cc.max_dzd : 2500;
  const rawDzd = Math.round(amountDzd * rate);
  return dzdToCentimes(Math.min(maxDzd, Math.max(minDzd, rawDzd)));
}

export function calculateUnifiedDocumentTotals(
  input: UnifiedDocumentCalculationInput
): UnifiedDocumentCalculationResult {
  const generalDiscPct = Math.max(0, Math.min(100, Number(input.generalDiscountPercent || 0)));
  const retentionPct = Math.max(0, Math.min(100, Number(input.guaranteeRetentionPercent || 0)));
  const fxRate = Math.max(0.000001, Number(input.fxRate || 1));

  const basis: TimbreCalculationBasis = input.timbreBasis
    ? input.timbreBasis
    : input.isCashFiscalStampEnabled || isCashPaymentMethod(input.paymentMethod)
      ? 'commercial_cash'
      : 'exempt';

  const allowedTvaRates =
    Array.isArray(input.statutoryRate?.tvaRates) && input.statutoryRate!.tvaRates.length > 0
      ? input.statutoryRate!.tvaRates
      : [0, 9, 19];

  const baseLines = (input.items || []).map((item, idx) => {
    const qty = Math.max(0, Number(item.quantity || 0));
    const unitPriceHt = Math.max(0, Number(item.unitPriceHt || 0));
    const lineDiscPct = Math.max(0, Math.min(100, Number(item.discountPercent || 0)));
    const rawRate = Number(item.tvaPercent ?? 19);
    const tvaPercent = allowedTvaRates.includes(rawRate) ? rawRate : rawRate;
    const rawLineHtCentimes = roundHalfAwayFromZero(dzdToCentimes(qty * unitPriceHt * (1 - lineDiscPct / 100)));
    return {
      id: item.id || `line_${idx + 1}`,
      productId: item.productId,
      description: item.description || '',
      isService: Boolean(item.isService),
      quantity: qty,
      unit: item.unit || 'u',
      unitPriceHt,
      tvaPercent,
      discountPercent: lineDiscPct,
      rawLineHtCentimes,
    };
  });

  const totalHtRawCentimes = addCentimes(...baseLines.map((l) => l.rawLineHtCentimes));
  const genDiscCentimes = roundHalfAwayFromZero(totalHtRawCentimes * (generalDiscPct / 100));
  const totalHtFinalCentimes = Math.max(0, subtractCentimes(totalHtRawCentimes, genDiscCentimes));

  const tvaBuckets = new Map<number, { baseHtCentimes: number; tvaCentimes: number }>();
  const computedLines: UnifiedDocumentLine[] = baseLines.map((line) => {
    const lineAdjustedHtCentimes =
      totalHtRawCentimes > 0
        ? roundHalfAwayFromZero(totalHtFinalCentimes * (line.rawLineHtCentimes / totalHtRawCentimes))
        : 0;
    const lineTvaCentimes = roundHalfAwayFromZero(lineAdjustedHtCentimes * (line.tvaPercent / 100));
    const bucket = tvaBuckets.get(line.tvaPercent) || { baseHtCentimes: 0, tvaCentimes: 0 };
    bucket.baseHtCentimes = addCentimes(bucket.baseHtCentimes, lineAdjustedHtCentimes);
    bucket.tvaCentimes = addCentimes(bucket.tvaCentimes, lineTvaCentimes);
    tvaBuckets.set(line.tvaPercent, bucket);
    return {
      id: line.id,
      productId: line.productId,
      description: line.description,
      isService: line.isService,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceHt: line.unitPriceHt,
      tvaPercent: line.tvaPercent,
      discountPercent: line.discountPercent,
      totalHtCentimes: lineAdjustedHtCentimes,
      totalTvaCentimes: lineTvaCentimes,
      totalTtcCentimes: addCentimes(lineAdjustedHtCentimes, lineTvaCentimes),
    };
  });

  const tvaBreakdown: UnifiedTvaBreakdownEntry[] = Array.from(tvaBuckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ratePercent, vals]) => ({
      ratePercent,
      baseHtCentimes: vals.baseHtCentimes,
      tvaCentimes: vals.tvaCentimes,
    }));

  const totalTvaCentimes = addCentimes(...tvaBreakdown.map((b) => b.tvaCentimes));
  const ttcBeforeTimbreCentimes = addCentimes(totalHtFinalCentimes, totalTvaCentimes);
  const applyCashStamp =
    basis !== 'exempt' && (Boolean(input.isCashFiscalStampEnabled) || isCashPaymentMethod(input.paymentMethod));
  const timbreFiscalCentimes = applyCashStamp
    ? computeTimbreFromConfigCentimes(ttcBeforeTimbreCentimes, basis, input.statutoryRate)
    : 0;

  const totalTtcCentimes = addCentimes(ttcBeforeTimbreCentimes, timbreFiscalCentimes);
  const guaranteeRetentionCentimes = roundHalfAwayFromZero(totalTtcCentimes * (retentionPct / 100));
  const netToPayCentimes = Math.max(0, subtractCentimes(totalTtcCentimes, guaranteeRetentionCentimes));
  const netToPayDzdEquivalentCentimes =
    input.currency && input.currency !== 'DZD'
      ? roundHalfAwayFromZero(netToPayCentimes * fxRate)
      : netToPayCentimes;

  const roundedWordsAmount = Math.round(centimesToDzd(netToPayCentimes));
  return {
    items: computedLines,
    tvaBreakdown,
    totalHtRawCentimes,
    totalHtFinalCentimes,
    totalTvaCentimes,
    timbreFiscalCentimes,
    totalTtcCentimes,
    guaranteeRetentionCentimes,
    netToPayCentimes,
    netToPayDzdEquivalentCentimes,
    totalsInWordsFr: numberToWordsFrench(roundedWordsAmount),
    totalsInWordsAr: numberToWordsArabic(roundedWordsAmount),
  };
}

export function buildUnifiedFiscalHeader(
  business?: Partial<Business> | null,
  branch?: Partial<Branch> | null,
  config?: Partial<BusinessCategoryConfig> | null
): UnifiedFiscalHeaderSnapshot {
  const fp = config?.fiscalProfile;
  return {
    companyName:
      fp?.companyLegalName?.trim() ||
      business?.displayName?.trim() ||
      business?.name?.trim() ||
      '—',
    address: fp?.address?.trim() || branch?.address?.trim() || undefined,
    phone: fp?.phone?.trim() || business?.phone?.trim() || branch?.phone?.trim() || undefined,
    email: fp?.email?.trim() || undefined,
    nif: fp?.nif?.trim() || undefined,
    nis: fp?.nis?.trim() || undefined,
    rc: fp?.rc?.trim() || undefined,
    ai: fp?.ai?.trim() || undefined,
    ribCcp: fp?.ribCcp?.trim() || fp?.rib?.trim() || fp?.ccp?.trim() || undefined,
    logoUrl: business?.logoUrl?.trim() || undefined,
    footerNote: config?.invoiceFooter?.trim() || undefined,
    templateLanguage: config?.systemLanguage || 'fr',
  };
}

export function canEditUnifiedDocument(doc: Pick<UnifiedDocument, 'status'>): boolean {
  return doc.status === 'Draft';
}

export function formatDraftDocNumber(docType: UnifiedDocType, idSeed: string): string {
  const short = idSeed.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000001';
  const tag = docType.toUpperCase().slice(0, 4);
  return `DRAFT-${tag}-${short}`;
}

export function formatServerFiscalNumber(
  docType: UnifiedDocType,
  fiscalYear: number,
  seqNumber: number
): string {
  const prefixMap: Record<UnifiedDocType, string> = {
    devis: 'DEV',
    commande: 'BC',
    bl: 'BL',
    facture: 'FAC',
    avoir: 'AV',
    retour: 'AV',
    receipt: 'REC',
    proforma: 'PRO',
  };
  return `${prefixMap[docType] || 'DOC'}-${fiscalYear}-${String(seqNumber).padStart(5, '0')}`;
}

export function buildCreditNoteDraftFromInvoice(
  invoice: UnifiedDocument,
  reason: string,
  partialItems?: Array<{ lineId: string; quantity: number }>,
  nowIso: string = new Date().toISOString()
): UnifiedDocument {
  if (invoice.status === 'Draft' || invoice.status === 'Voided' || invoice.status === 'Canceled') {
    throw new Error('CREDIT_NOTE_REQUIRES_ISSUED_DOCUMENT');
  }
  const sourceLines = partialItems && partialItems.length > 0
    ? invoice.items
        .map((line) => {
          const match = partialItems.find((p) => p.lineId === line.id);
          if (!match || match.quantity <= 0) return null;
          return {
            ...line,
            quantity: Math.min(line.quantity, match.quantity),
          };
        })
        .filter((l): l is UnifiedDocumentLine => Boolean(l))
    : invoice.items;

  if (sourceLines.length === 0) {
    throw new Error('CREDIT_NOTE_EMPTY_LINES');
  }

  const calc = calculateUnifiedDocumentTotals({
    items: sourceLines.map((l) => ({
      id: l.id,
      productId: l.productId,
      description: l.description,
      isService: l.isService,
      quantity: l.quantity,
      unit: l.unit,
      unitPriceHt: l.unitPriceHt,
      tvaPercent: l.tvaPercent,
      discountPercent: l.discountPercent,
    })),
    generalDiscountPercent: invoice.generalDiscountPercent,
    guaranteeRetentionPercent: invoice.guaranteeRetentionPercent,
    paymentMethod: invoice.paymentMethod,
    timbreBasis: invoice.timbreBasis,
    currency: invoice.currency,
    fxRate: invoice.fxRate,
  });

  const newId = `udoc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...invoice,
    id: newId,
    docType: 'avoir',
    draftNumber: formatDraftDocNumber('avoir', newId),
    docNumber: null,
    status: 'Draft',
    items: calc.items,
    tvaBreakdown: calc.tvaBreakdown,
    totalHtRawCentimes: calc.totalHtRawCentimes,
    totalHtFinalCentimes: calc.totalHtFinalCentimes,
    totalTvaCentimes: calc.totalTvaCentimes,
    timbreFiscalCentimes: calc.timbreFiscalCentimes,
    totalTtcCentimes: calc.totalTtcCentimes,
    guaranteeRetentionCentimes: calc.guaranteeRetentionCentimes,
    netToPayCentimes: calc.netToPayCentimes,
    paidCentimes: 0,
    balanceDueCentimes: calc.netToPayCentimes,
    totalsInWordsFr: calc.totalsInWordsFr,
    totalsInWordsAr: calc.totalsInWordsAr,
    linkedDocId: invoice.id,
    linkedDocNumber: invoice.docNumber || invoice.draftNumber,
    creditNoteForDocId: invoice.id,
    notesTop: reason || `Avoir sur ${invoice.docNumber || invoice.draftNumber}`,
    issuedAt: undefined,
    issuedByStaffId: undefined,
    printedCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export interface PaymentAllocationTargetInput {
  documentId: string;
  documentNumber?: string;
  openBalanceCentimes: number;
  requestedCentimes?: number;
}

export interface ComputedPaymentAllocationPlan {
  allocations: Array<{
    documentId: string;
    documentNumber?: string;
    allocatedCentimes: number;
  }>;
  totalAllocatedCentimes: number;
  unallocatedCreditCentimes: number;
}

export function allocatePaymentAcrossDocuments(
  paymentAmountCentimes: number,
  targets: PaymentAllocationTargetInput[]
): ComputedPaymentAllocationPlan {
  const safeTotal = roundHalfAwayFromZero(paymentAmountCentimes);
  if (safeTotal <= 0) {
    throw new Error('INVALID_PAYMENT_AMOUNT');
  }

  let remaining = safeTotal;
  const allocations: ComputedPaymentAllocationPlan['allocations'] = [];

  for (const target of targets) {
    if (remaining <= 0) break;
    const openBal = Math.max(0, roundHalfAwayFromZero(target.openBalanceCentimes));
    if (openBal <= 0) continue;
    const cap = target.requestedCentimes != null
      ? Math.min(openBal, Math.max(0, roundHalfAwayFromZero(target.requestedCentimes)))
      : openBal;
    const alloc = Math.min(remaining, cap);
    if (alloc > 0) {
      allocations.push({
        documentId: target.documentId,
        documentNumber: target.documentNumber,
        allocatedCentimes: alloc,
      });
      remaining = subtractCentimes(remaining, alloc);
    }
  }

  return {
    allocations,
    totalAllocatedCentimes: subtractCentimes(safeTotal, remaining),
    unallocatedCreditCentimes: remaining,
  };
}

export function isDateInClosedPeriod(dateIso: string, closedPeriods: string[]): boolean {
  if (!dateIso || !Array.isArray(closedPeriods) || closedPeriods.length === 0) return false;
  const monthKey = dateIso.slice(0, 7); // YYYY-MM
  const yearKey = dateIso.slice(0, 4); // YYYY
  return closedPeriods.includes(monthKey) || closedPeriods.includes(yearKey);
}

export function applyChequeStatusTransition(
  payment: UnifiedPayment,
  documents: UnifiedDocument[],
  nextStatus: ChequeInstrumentStatus,
  reason?: string,
  nowIso: string = new Date().toISOString()
): { updatedPayment: UnifiedPayment; updatedDocuments: UnifiedDocument[]; reopenedCount: number } {
  if (payment.method !== 'cheque' && payment.method !== 'traite') {
    throw new Error('PAYMENT_NOT_INSTRUMENT');
  }
  if (payment.instrumentStatus === 'bounced') {
    throw new Error('BOUNCED_INSTRUMENT_FINAL');
  }
  if (payment.instrumentStatus === 'cleared' && nextStatus === 'deposited') {
    throw new Error('INVALID_INSTRUMENT_TRANSITION');
  }

  const updatedPayment: UnifiedPayment = {
    ...payment,
    instrumentStatus: nextStatus,
    status:
      nextStatus === 'cleared'
        ? 'posted'
        : nextStatus === 'bounced'
          ? 'bounced'
          : 'pending_clearance',
    bouncedReason:
      nextStatus === 'bounced'
        ? (reason?.trim() || 'Chèque / Traite impayé')
        : payment.bouncedReason,
    updatedAt: nowIso,
  };

  let reopenedCount = 0;
  let updatedDocuments = documents;
  if (nextStatus === 'bounced' && payment.allocations.length > 0) {
    const byDocId = new Map(payment.allocations.map((a) => [a.documentId, a.allocatedCentimes]));
    updatedDocuments = documents.map((doc) => {
      const alloc = byDocId.get(doc.id);
      if (!alloc || alloc <= 0) return doc;
      reopenedCount += 1;
      const nextPaid = Math.max(0, subtractCentimes(doc.paidCentimes, alloc));
      const nextBalance = Math.min(doc.netToPayCentimes, subtractCentimes(doc.netToPayCentimes, nextPaid));
      const nextDocStatus: UnifiedDocument['status'] =
        nextPaid > 0 && nextBalance > 0
          ? 'PartiallyPaid'
          : nextPaid === 0 && doc.docNumber
            ? 'Issued'
            : doc.status;
      return {
        ...doc,
        paidCentimes: nextPaid,
        balanceDueCentimes: nextBalance,
        status: nextDocStatus,
        updatedAt: nowIso,
      };
    });
  }

  return { updatedPayment, updatedDocuments, reopenedCount };
}

export function convertCommercialDocToUnified(
  doc: CommercialDocument,
  header: UnifiedFiscalHeaderSnapshot
): UnifiedDocument {
  const calc = calculateUnifiedDocumentTotals({
    items: (doc.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      description: i.description,
      isService: i.isService,
      quantity: i.quantity,
      unit: i.unit,
      unitPriceHt: i.unitPriceHt,
      tvaPercent: i.tvaPercent,
      discountPercent: i.discountPercent,
    })),
    generalDiscountPercent: doc.generalDiscountPercent,
    guaranteeRetentionPercent: doc.guaranteeRetentionPercent,
    paymentMethod: doc.paymentMethod,
    isCashFiscalStampEnabled: doc.timbreFiscal > 0,
    currency: (doc.currency as UnifiedCurrency) || 'DZD',
  });
  const isPaid = doc.status === 'Paid';
  const mappedStatus: UnifiedDocument['status'] =
    doc.status === 'Paid'
      ? 'Paid'
      : doc.status === 'Canceled'
        ? 'Canceled'
        : doc.status === 'Delivered'
          ? 'Delivered'
          : doc.status === 'Validated'
            ? 'Issued'
            : 'Draft';

  return {
    id: doc.id,
    accountId: doc.accountId || doc.tenantId,
    businessId: doc.businessId || '',
    branchId: doc.branchId || doc.facilityId || '',
    sourceVertical: 'trading_commercial',
    docType: doc.type,
    draftNumber: formatDraftDocNumber(doc.type, doc.id),
    docNumber: doc.docNumber || null,
    fiscalYear: Number((doc.date || '').slice(0, 4)) || new Date().getFullYear(),
    status: mappedStatus,
    partyId: doc.clientId,
    partyName: doc.clientName,
    partyNif: doc.clientNif,
    partyRc: doc.clientRc,
    partyAi: doc.clientAi,
    depotId: doc.depotId,
    depotName: doc.depotName,
    docDate: doc.date,
    dueDate: doc.dueDate,
    validityDays: doc.validityDays,
    paymentMethod: normalizeUnifiedPaymentMethod(doc.paymentMethod),
    paymentTerms: doc.paymentTerms,
    currency: (doc.currency as UnifiedCurrency) || 'DZD',
    fxRate: 1,
    fxRateDate: doc.date,
    timbreBasis: doc.timbreFiscal > 0 ? 'commercial_cash' : 'exempt',
    items: calc.items,
    tvaBreakdown: calc.tvaBreakdown,
    totalHtRawCentimes: calc.totalHtRawCentimes,
    generalDiscountPercent: doc.generalDiscountPercent,
    totalHtFinalCentimes: calc.totalHtFinalCentimes,
    totalTvaCentimes: calc.totalTvaCentimes,
    timbreFiscalCentimes: calc.timbreFiscalCentimes,
    totalTtcCentimes: calc.totalTtcCentimes,
    guaranteeRetentionPercent: doc.guaranteeRetentionPercent,
    guaranteeRetentionCentimes: calc.guaranteeRetentionCentimes,
    netToPayCentimes: calc.netToPayCentimes,
    paidCentimes: isPaid ? calc.netToPayCentimes : 0,
    balanceDueCentimes: isPaid ? 0 : calc.netToPayCentimes,
    fiscalHeaderSnapshot: header,
    totalsInWordsFr: calc.totalsInWordsFr,
    totalsInWordsAr: calc.totalsInWordsAr,
    includeStampSignature: doc.includeStampSignature,
    notesTop: doc.notesTop,
    notesBottom: doc.notesBottom,
    linkedDocId: doc.linkedDocId,
    linkedDocNumber: doc.linkedDocNumber,
    sourceEntityType: 'trading_doc',
    sourceEntityId: doc.id,
    printedCount: 0,
    version: doc.version,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
