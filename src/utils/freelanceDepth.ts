import { centimesToDzd, dzdToCentimes, roundHalfAwayFromZero } from './money';
import type {
  ActiveTimerState,
  CurrencyCode,
  FreelanceAutoEntrepreneurConfig,
  FreelanceClientContract,
  FreelanceContractTemplate,
  FreelanceExpense,
  FreelanceInvoice,
  FreelancePhotoShoot,
  FreelanceRecurrenceInterval,
  FreelanceTranslationEntry,
  PhotoGalleryStatus,
  ReminderRule,
  TimeLogEntry,
  TranslationPricingUnit,
} from '../types/index';

export const DEFAULT_FREELANCE_FX_RATES_TO_DZD: Record<CurrencyCode, number> = {
  DZD: 1,
  EUR: 145,
  USD: 135,
};

/**
 * Timestamp-authoritative elapsed seconds calculator immune to browser sleep/throttling.
 */
export function computeAuthoritativeElapsedSeconds(
  timer: Pick<ActiveTimerState, 'isRunning' | 'isPaused' | 'startedAt' | 'accumulatedSeconds' | 'elapsedSeconds'>,
  nowMs = Date.now()
): number {
  const baseAcc = Math.max(
    0,
    Math.floor(
      timer.accumulatedSeconds != null
        ? Number(timer.accumulatedSeconds)
        : Number(timer.elapsedSeconds || 0)
    )
  );
  if (!timer.isRunning || timer.isPaused || !timer.startedAt) {
    return baseAcc;
  }
  const startMs = Date.parse(timer.startedAt);
  if (!Number.isFinite(startMs)) return baseAcc;
  const liveDelta = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  return baseAcc + liveDelta;
}

export interface SplitTimeSegment {
  date: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}

/**
 * Splits a continuous time span [startIso, endIso] across UTC midnight boundaries so multi-day
 * sessions record accurate daily time logs whose durations sum cleanly to the total duration.
 */
export function splitCrossMidnightTimeSpan(startIso: string, endIso: string): SplitTimeSegment[] {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return [];
  }

  const totalSeconds = Math.floor((endMs - startMs) / 1000);
  if (totalSeconds <= 0) return [];

  const segments: SplitTimeSegment[] = [];
  let cursorMs = startMs;
  let assignedSeconds = 0;

  while (cursorMs < endMs) {
    const cursorDate = new Date(cursorMs);
    const nextMidnightMs = Date.UTC(
      cursorDate.getUTCFullYear(),
      cursorDate.getUTCMonth(),
      cursorDate.getUTCDate() + 1,
      0,
      0,
      0,
      0
    );
    const segEndMs = Math.min(endMs, nextMidnightMs);
    const isLast = segEndMs >= endMs;
    const rawSecs = isLast
      ? Math.max(0, totalSeconds - assignedSeconds)
      : Math.max(1, Math.floor((segEndMs - cursorMs) / 1000));

    if (rawSecs > 0) {
      assignedSeconds += rawSecs;
      segments.push({
        date: cursorDate.toISOString().slice(0, 10),
        startedAt: new Date(cursorMs).toISOString(),
        endedAt: new Date(segEndMs).toISOString(),
        durationSeconds: rawSecs,
      });
    }

    if (segEndMs <= cursorMs) break;
    cursorMs = segEndMs;
  }

  return segments;
}

/**
 * Resolves timer state when syncing across devices using latest heartbeat/start timestamps.
 */
export function reconcileRemoteActiveTimer(
  localTimer: ActiveTimerState,
  remoteTimer: ActiveTimerState | null | undefined,
  nowMs = Date.now()
): ActiveTimerState {
  if (!remoteTimer) {
    return {
      ...localTimer,
      elapsedSeconds: computeAuthoritativeElapsedSeconds(localTimer, nowMs),
    };
  }
  const localTs = Date.parse(localTimer.lastHeartbeatAt || localTimer.startedAt || '1970-01-01T00:00:00Z');
  const remoteTs = Date.parse(remoteTimer.lastHeartbeatAt || remoteTimer.startedAt || '1970-01-01T00:00:00Z');

  const winner =
    !localTimer.isRunning && remoteTimer.isRunning
      ? remoteTimer
      : remoteTimer.isRunning && remoteTs >= localTs
      ? remoteTimer
      : localTimer;

  return {
    ...winner,
    elapsedSeconds: computeAuthoritativeElapsedSeconds(winner, nowMs),
  };
}

export function validateTimeLogMutation(
  log: Pick<TimeLogEntry, 'isInvoiced'>,
  options?: { allowUninvoicing?: boolean }
): { allowed: true } | { allowed: false; code: 'INVOICED_TIME_LOG_IMMUTABLE' } {
  if (log.isInvoiced && !options?.allowUninvoicing) {
    return { allowed: false, code: 'INVOICED_TIME_LOG_IMMUTABLE' };
  }
  return { allowed: true };
}

export function validateInvoiceCurrencyUpdate(
  existingInvoice: Pick<FreelanceInvoice, 'status' | 'currency' | 'fxRateToDzd'>,
  nextCurrency?: CurrencyCode,
  nextFxRate?: number
):
  | { allowed: true }
  | { allowed: false; code: 'NON_DRAFT_INVOICE_CURRENCY_LOCKED' | 'INVALID_FX_RATE' } {
  if (nextFxRate !== undefined && (!Number.isFinite(nextFxRate) || nextFxRate <= 0)) {
    return { allowed: false, code: 'INVALID_FX_RATE' };
  }

  if (existingInvoice.status !== 'Draft') {
    const currencyChanged = nextCurrency !== undefined && nextCurrency !== existingInvoice.currency;
    const fxChanged =
      nextFxRate !== undefined &&
      existingInvoice.fxRateToDzd !== undefined &&
      Math.abs(Number(nextFxRate) - Number(existingInvoice.fxRateToDzd)) > 0.0001;
    if (currencyChanged || fxChanged) {
      return { allowed: false, code: 'NON_DRAFT_INVOICE_CURRENCY_LOCKED' };
    }
  }

  return { allowed: true };
}

export function resolveFreelanceFxRate(
  currency: CurrencyCode,
  explicitFxRate?: number | null
): number {
  if (currency === 'DZD') return 1;
  const parsed = Number(explicitFxRate);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_FREELANCE_FX_RATES_TO_DZD[currency] || 1;
}

export function computeInvoiceDzdEquivalentCentimes(
  totalAmount: number,
  currency: CurrencyCode,
  fxRateToDzd?: number | null
): number {
  const rate = resolveFreelanceFxRate(currency, fxRateToDzd);
  return Math.max(0, roundHalfAwayFromZero(dzdToCentimes(Number(totalAmount || 0)) * rate));
}

export function computeInvoiceDzdEquivalent(
  totalAmount: number,
  currency: CurrencyCode,
  fxRateToDzd?: number | null
): number {
  return centimesToDzd(computeInvoiceDzdEquivalentCentimes(totalAmount, currency, fxRateToDzd));
}

export function computeNextRecurrenceDate(
  isoDate: string,
  interval: FreelanceRecurrenceInterval
): string {
  const base = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const next = new Date(base.getTime());
  if (interval === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (interval === 'monthly') {
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else if (interval === 'quarterly') {
    next.setUTCMonth(next.getUTCMonth() + 3);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  }
  return next.toISOString().slice(0, 10);
}

export function buildRecurringDraftFromInvoice(
  source: FreelanceInvoice,
  nextInvoiceNumber: string,
  issueDate = new Date().toISOString().slice(0, 10)
): Omit<FreelanceInvoice, 'id' | 'tenantId' | 'facilityId' | 'createdAt'> {
  const issueMs = Date.parse(`${source.issueDate}T00:00:00Z`);
  const dueMs = Date.parse(`${source.dueDate}T00:00:00Z`);
  const termDays =
    Number.isFinite(issueMs) && Number.isFinite(dueMs) && dueMs > issueMs
      ? Math.round((dueMs - issueMs) / 86400000)
      : 15;
  const nextDue = new Date(Date.parse(`${issueDate}T00:00:00Z`) + termDays * 86400000)
    .toISOString()
    .slice(0, 10);

  return {
    accountId: source.accountId,
    businessId: source.businessId,
    branchId: source.branchId,
    staffId: source.staffId,
    clientId: source.clientId,
    clientName: source.clientName,
    clientCompany: source.clientCompany,
    clientEmail: source.clientEmail,
    invoiceNumber: nextInvoiceNumber,
    currency: source.currency,
    fxRateToDzd: source.fxRateToDzd,
    totalAmountDzdCentimes: source.totalAmountDzdCentimes,
    issueDate,
    dueDate: nextDue,
    status: 'Draft',
    items: source.items.map((item, i) => ({ ...item, id: `item_rec_${Date.now()}_${i}` })),
    subtotal: source.subtotal,
    taxPercent: source.taxPercent,
    taxAmount: source.taxAmount,
    totalAmount: source.totalAmount,
    isRecurring: source.isRecurring,
    recurrenceInterval: source.recurrenceInterval,
    nextRecurrenceDate: source.recurrenceInterval
      ? computeNextRecurrenceDate(issueDate, source.recurrenceInterval)
      : undefined,
    notes: source.notes,
    paymentDetails: source.paymentDetails ? { ...source.paymentDetails } : undefined,
  };
}

export interface FreelanceOverdueReminderCandidate {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  daysOverdue: number;
  amount: number;
  currency: CurrencyCode;
  ruleId?: string;
}

export function evaluateFreelanceOverdueReminders(
  invoices: FreelanceInvoice[],
  rules: ReminderRule[],
  asOfDate = new Date().toISOString().slice(0, 10)
): FreelanceOverdueReminderCandidate[] {
  const overdueRule = rules.find((r) => r.eventType === 'invoice_overdue' && r.isEnabled);
  const minDays = overdueRule ? Math.max(0, Number(overdueRule.leadDays || 0)) : 1;
  const asOfMs = Date.parse(`${asOfDate}T00:00:00Z`);

  const candidates: FreelanceOverdueReminderCandidate[] = [];
  for (const inv of invoices) {
    if (inv.status === 'Paid' || inv.status === 'Draft') continue;
    const dueMs = Date.parse(`${inv.dueDate}T00:00:00Z`);
    if (!Number.isFinite(dueMs) || !Number.isFinite(asOfMs)) continue;
    const daysOverdue = Math.floor((asOfMs - dueMs) / 86400000);
    if (daysOverdue >= minDays || inv.status === 'Overdue') {
      candidates.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        daysOverdue: Math.max(1, daysOverdue),
        amount: inv.totalAmount,
        currency: inv.currency,
        ruleId: overdueRule?.id,
      });
    }
  }
  return candidates;
}

export const FALLBACK_UNVERIFIED_AE_CONFIG: Omit<
  FreelanceAutoEntrepreneurConfig,
  'id' | 'createdAt'
> = {
  effectiveFrom: '2026-01-01',
  annualTurnoverCeilingDzd: 5000000,
  contributionRatePct: 5.0,
  taxRatePct: 0.5,
  verificationStatus: 'unverified',
  notes: 'Baseline Algerian Auto-Entrepreneur statutory ceiling/rates — unverified until confirmed by user.',
};

export function resolveAutoEntrepreneurConfig(
  configs: FreelanceAutoEntrepreneurConfig[],
  asOfDate = new Date().toISOString().slice(0, 10)
): FreelanceAutoEntrepreneurConfig {
  const eligible = (configs || [])
    .filter((c) => c.effectiveFrom <= asOfDate)
    .sort((a, b) => {
      if (b.effectiveFrom !== a.effectiveFrom) {
        return b.effectiveFrom.localeCompare(a.effectiveFrom);
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  if (eligible.length > 0) return eligible[0];
  if (configs.length > 0) {
    return [...configs].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0];
  }
  return {
    id: 'ae_default_unverified',
    ...FALLBACK_UNVERIFIED_AE_CONFIG,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

export interface AutoEntrepreneurTurnoverSummary {
  year: number;
  collectedTurnoverDzdCentimes: number;
  collectedTurnoverDzd: number;
  billedTurnoverDzdCentimes: number;
  billedTurnoverDzd: number;
  deductibleExpensesDzdCentimes: number;
  deductibleExpensesDzd: number;
  annualCeilingDzd: number;
  remainingHeadroomDzd: number;
  utilizationPct: number;
  isApproachingCeiling: boolean;
  isOverCeiling: boolean;
  estimatedContributionDzd: number;
  estimatedTaxDzd: number;
  estimatedTotalDueDzd: number;
  isUnverified: boolean;
  activeConfig: FreelanceAutoEntrepreneurConfig;
}

export function evaluateAutoEntrepreneurTurnover(params: {
  invoices: FreelanceInvoice[];
  expenses?: FreelanceExpense[];
  configs: FreelanceAutoEntrepreneurConfig[];
  year?: number;
  asOfDate?: string;
}): AutoEntrepreneurTurnoverSummary {
  const asOfDate = params.asOfDate || new Date().toISOString().slice(0, 10);
  const year = params.year ?? Number(asOfDate.slice(0, 4));
  const yearPrefix = `${year}-`;
  const activeConfig = resolveAutoEntrepreneurConfig(params.configs, asOfDate);

  let collectedCentimes = 0;
  let billedCentimes = 0;

  for (const inv of params.invoices) {
    const refDate = inv.status === 'Paid' && inv.paidAt ? inv.paidAt.slice(0, 10) : inv.issueDate;
    if (!refDate.startsWith(yearPrefix) || inv.status === 'Draft') continue;
    const dzdCentimes =
      inv.totalAmountDzdCentimes && inv.totalAmountDzdCentimes > 0
        ? inv.totalAmountDzdCentimes
        : computeInvoiceDzdEquivalentCentimes(inv.totalAmount, inv.currency, inv.fxRateToDzd);
    billedCentimes += dzdCentimes;
    if (inv.status === 'Paid') {
      collectedCentimes += dzdCentimes;
    }
  }

  let deductibleExpensesCentimes = 0;
  for (const exp of params.expenses || []) {
    if (!exp.isTaxDeductible || !(exp.date || '').startsWith(yearPrefix)) continue;
    deductibleExpensesCentimes += computeInvoiceDzdEquivalentCentimes(exp.amount, exp.currency);
  }

  const collectedDzd = centimesToDzd(collectedCentimes);
  const billedDzd = centimesToDzd(billedCentimes);
  const ceilingDzd = Math.max(1, Number(activeConfig.annualTurnoverCeilingDzd || 5000000));
  const utilizationPct = Math.round((collectedDzd / ceilingDzd) * 1000) / 10;
  const remainingHeadroomDzd = Math.max(0, Math.round(ceilingDzd - collectedDzd));

  const estimatedContributionDzd = centimesToDzd(
    roundHalfAwayFromZero(collectedCentimes * (Number(activeConfig.contributionRatePct || 0) / 100))
  );
  const estimatedTaxDzd = centimesToDzd(
    roundHalfAwayFromZero(collectedCentimes * (Number(activeConfig.taxRatePct || 0) / 100))
  );

  return {
    year,
    collectedTurnoverDzdCentimes: collectedCentimes,
    collectedTurnoverDzd: collectedDzd,
    billedTurnoverDzdCentimes: billedCentimes,
    billedTurnoverDzd: billedDzd,
    deductibleExpensesDzdCentimes: deductibleExpensesCentimes,
    deductibleExpensesDzd: centimesToDzd(deductibleExpensesCentimes),
    annualCeilingDzd: ceilingDzd,
    remainingHeadroomDzd,
    utilizationPct,
    isApproachingCeiling: utilizationPct >= 80 && utilizationPct <= 100,
    isOverCeiling: collectedDzd > ceilingDzd,
    estimatedContributionDzd,
    estimatedTaxDzd,
    estimatedTotalDueDzd: centimesToDzd(
      dzdToCentimes(estimatedContributionDzd) + dzdToCentimes(estimatedTaxDzd)
    ),
    isUnverified: activeConfig.verificationStatus !== 'verified',
    activeConfig,
  };
}

export function buildDefaultFreelanceContractTemplates(
  context?: { accountId?: string; businessId?: string; branchId?: string }
): FreelanceContractTemplate[] {
  const base = {
    accountId: context?.accountId,
    businessId: context?.businessId,
    branchId: context?.branchId,
    isSystemPreset: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
  return [
    {
      ...base,
      id: 'tpl_freelance_msa',
      templateKey: 'service_agreement_msa',
      category: 'service_agreement',
      title: 'Contrat de Prestation de Services / Master Service Agreement',
      variablesSchema: ['provider_name', 'client_name', 'client_company', 'scope_summary', 'contract_value', 'currency', 'effective_date'],
      bodyTemplate:
        'Entre {{provider_name}} (Prestataire) et {{client_name}} ({{client_company}}), il est convenu ce qui suit à compter du {{effective_date}}.\n\nObjet : {{scope_summary}}\nHonoraires convenus : {{contract_value}} {{currency}}.\nPaiement sous 15 jours à réception de facture.',
    },
    {
      ...base,
      id: 'tpl_freelance_nda',
      templateKey: 'mutual_nda',
      category: 'nda',
      title: 'Accord de Confidentialité (NDA) / Non-Disclosure Agreement',
      variablesSchema: ['provider_name', 'client_name', 'client_company', 'effective_date'],
      bodyTemplate:
        'Accord de confidentialité conclu le {{effective_date}} entre {{provider_name}} et {{client_name}} ({{client_company}}). Chaque partie s’engage à préserver la confidentialité des documents, données et codes sources échangés.',
    },
    {
      ...base,
      id: 'tpl_freelance_photo_release',
      templateKey: 'photography_model_release',
      category: 'photography_release',
      title: 'Cession de Droits & Autorisation Photo / Usage Release',
      variablesSchema: ['provider_name', 'client_name', 'scope_summary', 'contract_value', 'currency', 'effective_date'],
      bodyTemplate:
        'Contrat de séance et licence d’exploitation conclu le {{effective_date}} entre {{provider_name}} (Photographe) et {{client_name}}. Couverture : {{scope_summary}}. Forfait : {{contract_value}} {{currency}}. Les aperçus filigranés précèdent la livraison finale.',
    },
  ];
}

export function renderFreelanceContractBody(
  bodyTemplate: string,
  variables: Record<string, string | number | undefined>
): { renderedBody: string; missingVariables: string[] } {
  const missingVariables: string[] = [];
  const renderedBody = bodyTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const val = variables[key];
    if (val === undefined || String(val).trim() === '') {
      missingVariables.push(key);
      return `[${key}]`;
    }
    return String(val);
  });
  return { renderedBody, missingVariables: Array.from(new Set(missingVariables)) };
}

export function computeTranslationQuote(params: {
  pricingUnit: TranslationPricingUnit;
  unitCount: number;
  unitRate: number;
}): { totalAmount: number; totalCentimes: number } {
  const rateCentimes = Math.max(0, dzdToCentimes(Number(params.unitRate || 0)));
  const qty = params.pricingUnit === 'fixed' ? 1 : Math.max(0, Number(params.unitCount || 0));
  const totalCentimes = Math.max(0, roundHalfAwayFromZero(rateCentimes * qty));
  return {
    totalCentimes,
    totalAmount: centimesToDzd(totalCentimes),
  };
}

export function formatNextSwornRegisterNumber(
  existingEntries: Pick<FreelanceTranslationEntry, 'registerNumber'>[],
  year = new Date().getFullYear()
): string {
  const prefix = `REG-${year}-`;
  let maxSeq = 0;
  for (const item of existingEntries) {
    if (item.registerNumber.startsWith(prefix)) {
      const num = parseInt(item.registerNumber.slice(prefix.length), 10);
      if (Number.isFinite(num) && num > maxSeq) maxSeq = num;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export function detectPhotoShootOverlap(
  candidate: Pick<FreelancePhotoShoot, 'shootDate' | 'startTime' | 'endTime' | 'galleryStatus'> & {
    id?: string;
  },
  existingShoots: FreelancePhotoShoot[]
): { hasConflict: boolean; conflictingShoot?: FreelancePhotoShoot; reason?: 'INVALID_WINDOW' | 'OVERLAP' } {
  if (!candidate.startTime || !candidate.endTime || candidate.endTime <= candidate.startTime) {
    return { hasConflict: true, reason: 'INVALID_WINDOW' };
  }
  if (candidate.galleryStatus === 'cancelled') {
    return { hasConflict: false };
  }
  for (const existing of existingShoots) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (existing.galleryStatus === 'cancelled') continue;
    if (existing.shootDate !== candidate.shootDate) continue;
    // Half-open [startTime, endTime)
    if (existing.startTime < candidate.endTime && existing.endTime > candidate.startTime) {
      return {
        hasConflict: true,
        conflictingShoot: existing,
        reason: 'OVERLAP',
      };
    }
  }
  return { hasConflict: false };
}

const GALLERY_STAGE_ORDER: PhotoGalleryStatus[] = [
  'scheduled',
  'shot',
  'editing',
  'proofing',
  'watermarked_preview',
  'final_delivered',
];

export function canTransitionGalleryStage(from: PhotoGalleryStatus, to: PhotoGalleryStatus): boolean {
  if (from === 'cancelled' || to === 'cancelled') return from !== 'final_delivered';
  if (from === to) return true;
  const fromIdx = GALLERY_STAGE_ORDER.indexOf(from);
  const toIdx = GALLERY_STAGE_ORDER.indexOf(to);
  return fromIdx >= 0 && toIdx >= 0 && toIdx >= fromIdx;
}

export function buildNextContractNumber(
  existingContracts: Pick<FreelanceClientContract, 'contractNumber'>[],
  year = new Date().getFullYear()
): string {
  const prefix = `CTR-${year}-`;
  let maxSeq = 0;
  for (const c of existingContracts) {
    if (c.contractNumber.startsWith(prefix)) {
      const n = parseInt(c.contractNumber.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}
