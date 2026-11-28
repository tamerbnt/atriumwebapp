import { calculateArticle317Stamp, calculateCPCADeadline, type CPCADeadlineCalculationResult, type CPCARecourseType, type DomicileCategory } from './legalRules';
import { evaluateCommunicationDispatch, type DispatchEvaluationResult } from './crmPartyEngine';
import { computeNextAllowedSendIso, isWithinQuietHours } from './reminderEngine';
import type {
  LegalMatter,
  LegalHearing,
  LegalClientEntity,
  NotaryDeed,
  EscrowAccount,
  LegalTimeEntry,
  LegalFeeInvoice,
  LegalHolidayEntry,
  LegalDocTemplate,
  LegalBailiffAct,
  LegalArbitrationTimeline,
  LegalArbitrationMilestone,
  LegalClientLedgerBook,
  LegalConfidentialityLevel,
  CrmParty,
  CrmChannel,
  ReminderQuietHoursConfig,
} from '../types/index';

export const LEGAL_VAULT_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
export const LEGAL_VAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

/**
 * Pure FIPS 180-4 SHA-256 digest (hex lowercase) working identically in Node,
 * Vitest, and browser environments for both strings and binary Uint8Array uploads.
 */
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function computeSha256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const hiBits = Math.floor(bitLen / 0x100000000);
  const loBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, hiBits, false);
  view.setUint32(paddedLen - 4, loBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

export function hashEscrowPin(pin: string): string {
  const cleaned = String(pin || '').trim();
  if (!cleaned) return '';
  return `sha256:${computeSha256Hex(`atrium_escrow_pin_v1:${cleaned}`)}`;
}

// ============================================================================
// 1. Time Tracking -> Fee Invoice Conversion (Centimes Precision & Anti-Double-Billing)
// ============================================================================

export function calculateTimeEntryAmountCentimes(
  durationMinutes: number,
  hourlyRateDzd: number
): number {
  const mins = Math.max(0, Number(durationMinutes) || 0);
  const rate = Math.max(0, Number(hourlyRateDzd) || 0);
  return Math.round((mins / 60) * rate * 100);
}

export interface FeeInvoiceBuildInput {
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  matterId?: string;
  matterNumber?: string;
  clientId?: string;
  clientName: string;
  selectedEntries: LegalTimeEntry[];
  tvaRate: 0 | 9 | 19;
  disbursementDzd?: number;
  paymentMethod?: 'especes' | 'cheque' | 'virement' | 'baridimob';
  invoiceNumber: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
}

export type FeeInvoiceBuildResult =
  | {
      ok: true;
      invoice: LegalFeeInvoice;
      updatedTimeEntries: LegalTimeEntry[];
    }
  | {
      ok: false;
      code: 'NO_TIME_ENTRIES_SELECTED' | 'NON_BILLABLE_TIME_ENTRY' | 'TIME_ENTRY_ALREADY_BILLED';
      message: string;
      offendingEntryIds: string[];
    };

export function buildFeeInvoiceFromTimeEntries(
  input: FeeInvoiceBuildInput
): FeeInvoiceBuildResult {
  const entries = input.selectedEntries || [];
  if (entries.length === 0) {
    return {
      ok: false,
      code: 'NO_TIME_ENTRIES_SELECTED',
      message: 'Sélectionnez au moins une prestation facturable.',
      offendingEntryIds: [],
    };
  }

  const nonBillable = entries.filter((e) => !e.isBillable);
  if (nonBillable.length > 0) {
    return {
      ok: false,
      code: 'NON_BILLABLE_TIME_ENTRY',
      message: 'Certaines lignes sélectionnées ne sont pas marquées facturables.',
      offendingEntryIds: nonBillable.map((e) => e.id),
    };
  }

  const alreadyBilled = entries.filter((e) => e.isBilled || Boolean(e.invoiceId));
  if (alreadyBilled.length > 0) {
    return {
      ok: false,
      code: 'TIME_ENTRY_ALREADY_BILLED',
      message: 'Double facturation bloquée : une ou plusieurs prestations sont déjà facturées.',
      offendingEntryIds: alreadyBilled.map((e) => e.id),
    };
  }

  const feesHtCentimes = entries.reduce(
    (sum, e) => sum + calculateTimeEntryAmountCentimes(e.durationMinutes, e.hourlyRateDzd),
    0
  );
  const disbursementsCentimes = Math.max(0, Math.round((Number(input.disbursementDzd) || 0) * 100));
  const tvaRate = input.tvaRate;
  const tvaCentimes = Math.round(feesHtCentimes * (tvaRate / 100));

  const subtotalBeforeTimbreDzd =
    (feesHtCentimes + tvaCentimes + disbursementsCentimes) / 100;
  const paymentMethod = input.paymentMethod || 'virement';
  const timbreDzd = calculateArticle317Stamp(subtotalBeforeTimbreDzd, paymentMethod);
  const timbreCentimes = Math.round(timbreDzd * 100);
  const totalTtcCentimes = feesHtCentimes + tvaCentimes + disbursementsCentimes + timbreCentimes;

  const issueDate = input.issueDate || new Date().toISOString().split('T')[0];
  const invoiceId = `linv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();

  const invoice: LegalFeeInvoice = {
    id: invoiceId,
    accountId: input.accountId,
    businessId: input.businessId,
    branchId: input.branchId,
    staffId: input.staffId,
    invoiceNumber: input.invoiceNumber,
    matterId: input.matterId,
    matterNumber: input.matterNumber,
    clientId: input.clientId,
    clientName: input.clientName,
    feesHtDzd: Math.round(feesHtCentimes) / 100,
    disbursementsDzd: Math.round(disbursementsCentimes) / 100,
    tvaRate,
    tvaDzd: Math.round(tvaCentimes) / 100,
    timbreDzd: Math.round(timbreCentimes) / 100,
    totalTtcDzd: Math.round(totalTtcCentimes) / 100,
    totalTtcCentimes,
    paidAmountDzd: 0,
    status: 'Sent',
    issueDate,
    dueDate: input.dueDate,
    timeEntryIds: entries.map((e) => e.id),
    lineItems: entries.map((e) => ({
      entryId: e.id,
      description: e.description,
      durationMinutes: e.durationMinutes,
      hourlyRateDzd: e.hourlyRateDzd,
      amountHtDzd:
        Math.round(calculateTimeEntryAmountCentimes(e.durationMinutes, e.hourlyRateDzd)) / 100,
    })),
    notes: input.notes,
    version: 1,
    createdAt: nowIso,
  };

  const updatedTimeEntries: LegalTimeEntry[] = entries.map((e) => ({
    ...e,
    isBilled: true,
    invoiceId,
    billedAt: nowIso,
    version: (e.version || 1) + 1,
  }));

  return {
    ok: true,
    invoice,
    updatedTimeEntries,
  };
}

// ============================================================================
// 2. Conflict-of-Interest Check & Role-Based Confidentiality Scoping
// ============================================================================

export function normalizeLegalPartyToken(raw?: string | null): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(sarl|eurl|spa|snc|scp|scs|ets|cabinet|ste|me|maitre)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface ConflictDetectionMatch {
  sourceType: 'matter' | 'client' | 'notary_deed';
  sourceId: string;
  reference: string;
  matchedField: 'client_vs_adverse' | 'adverse_vs_client' | 'nin_nif' | 'phone';
  matchedName: string;
  severity: 'conflict' | 'warning';
  reason: string;
}

export interface ConflictDetectionResult {
  status: 'clear' | 'warning' | 'conflict';
  hasConflict: boolean;
  matches: ConflictDetectionMatch[];
  checkedAt: string;
}

export function detectLegalConflictOfInterest(
  candidate: {
    matterId?: string;
    clientName: string;
    adversePartyName?: string;
    clientNinOrNif?: string;
    clientPhone?: string;
  },
  existingMatters: LegalMatter[],
  existingClients: LegalClientEntity[] = [],
  existingDeeds: NotaryDeed[] = []
): ConflictDetectionResult {
  const clientTok = normalizeLegalPartyToken(candidate.clientName);
  const adverseTok = normalizeLegalPartyToken(candidate.adversePartyName);
  const ninClean = String(candidate.clientNinOrNif || '').replace(/[\s\-_.]/g, '').toUpperCase();
  const phoneDigits = String(candidate.clientPhone || '').replace(/\D+/g, '').slice(-9);

  const matches: ConflictDetectionMatch[] = [];
  const tokensOverlap = (a: string, b: string) =>
    Boolean(a && b && a.length >= 3 && b.length >= 3 && (a === b || a.includes(b) || b.includes(a)));

  for (const m of existingMatters) {
    if (candidate.matterId && m.id === candidate.matterId) continue;
    const mClientTok = normalizeLegalPartyToken(m.clientName);
    const mAdverseTok = normalizeLegalPartyToken(m.adversePartyName);

    // Client we want to represent is currently our adverse party in another matter -> HARD CONFLICT
    if (clientTok && mAdverseTok && tokensOverlap(clientTok, mAdverseTok)) {
      matches.push({
        sourceType: 'matter',
        sourceId: m.id,
        reference: m.matterNumber,
        matchedField: 'client_vs_adverse',
        matchedName: m.adversePartyName || m.clientName,
        severity: 'conflict',
        reason: `Le client « ${candidate.clientName} » figure comme partie adverse dans le dossier ${m.matterNumber}.`,
      });
    }

    // Proposed adverse party is already an active client of the firm -> HARD CONFLICT
    if (adverseTok && mClientTok && tokensOverlap(adverseTok, mClientTok)) {
      matches.push({
        sourceType: 'matter',
        sourceId: m.id,
        reference: m.matterNumber,
        matchedField: 'adverse_vs_client',
        matchedName: m.clientName,
        severity: 'conflict',
        reason: `La partie adverse « ${candidate.adversePartyName} » est déjà cliente du cabinet (dossier ${m.matterNumber}).`,
      });
    }

    if (
      ninClean &&
      m.clientNinOrNif &&
      m.clientNinOrNif.replace(/[\s\-_.]/g, '').toUpperCase() === ninClean &&
      clientTok &&
      mClientTok &&
      clientTok !== mClientTok
    ) {
      matches.push({
        sourceType: 'matter',
        sourceId: m.id,
        reference: m.matterNumber,
        matchedField: 'nin_nif',
        matchedName: m.clientName,
        severity: 'warning',
        reason: `Même NIN/NIF détecté sur le dossier ${m.matterNumber} (${m.clientName}).`,
      });
    }
  }

  for (const c of existingClients) {
    const cNameTok = normalizeLegalPartyToken(c.nameFr);
    if (adverseTok && cNameTok && tokensOverlap(adverseTok, cNameTok)) {
      matches.push({
        sourceType: 'client',
        sourceId: c.id,
        reference: c.ninOrNif || c.id,
        matchedField: 'adverse_vs_client',
        matchedName: c.nameFr,
        severity: 'conflict',
        reason: `La partie adverse correspond au client enregistré « ${c.nameFr} ».`,
      });
    }
    const cPhoneDigits = String(c.phone || '').replace(/\D+/g, '').slice(-9);
    if (phoneDigits && cPhoneDigits && phoneDigits === cPhoneDigits && clientTok && cNameTok && clientTok !== cNameTok) {
      matches.push({
        sourceType: 'client',
        sourceId: c.id,
        reference: c.phone,
        matchedField: 'phone',
        matchedName: c.nameFr,
        severity: 'warning',
        reason: `Numéro de téléphone identique au client « ${c.nameFr} ».`,
      });
    }
  }

  for (const d of existingDeeds) {
    const vendorTok = normalizeLegalPartyToken(d.parties?.vendorName);
    const buyerTok = normalizeLegalPartyToken(d.parties?.purchaserName);
    if (
      adverseTok &&
      ((vendorTok && tokensOverlap(adverseTok, vendorTok)) ||
        (buyerTok && tokensOverlap(adverseTok, buyerTok)))
    ) {
      matches.push({
        sourceType: 'notary_deed',
        sourceId: d.id,
        reference: d.repertoireNumber,
        matchedField: 'adverse_vs_client',
        matchedName: candidate.adversePartyName || '',
        severity: 'warning',
        reason: `Partie adverse déjà intervenue à l'acte notarié ${d.repertoireNumber}.`,
      });
    }
  }

  const hasConflict = matches.some((m) => m.severity === 'conflict');
  const status: ConflictDetectionResult['status'] = hasConflict
    ? 'conflict'
    : matches.length > 0
    ? 'warning'
    : 'clear';

  return {
    status,
    hasConflict,
    matches,
    checkedAt: new Date().toISOString(),
  };
}

export type LegalCabinetRoleKey =
  | 'avocat_associe'
  | 'notaire_titulaire'
  | 'expert_comptable'
  | 'secretaire_caisse';

export function canRoleAccessConfidentiality(
  role: LegalCabinetRoleKey,
  level: LegalConfidentialityLevel = 'Internal',
  allowedRoles?: string[]
): boolean {
  if (role === 'secretaire_caisse') {
    if (level === 'SecretDefense' || level === 'Restricted' || level === 'NotarialMinute') {
      return false;
    }
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes('secretaire_caisse')) {
      return level === 'PublicClient' || level === 'Internal';
    }
    return true;
  }
  if (level === 'SecretDefense' && allowedRoles && allowedRoles.length > 0) {
    return allowedRoles.includes(role);
  }
  return true;
}

export function filterMattersByRole<T extends Pick<LegalMatter, 'confidentialityLevel' | 'allowedRoles'>>(
  matters: T[],
  role: LegalCabinetRoleKey
): T[] {
  return matters.filter((m) =>
    canRoleAccessConfidentiality(role, m.confidentialityLevel || 'Internal', m.allowedRoles)
  );
}

// ============================================================================
// 3. Holiday Calendar, Auto-Shift Hearing Dates & Bulk CPCA Recalculation
// ============================================================================

export const DEFAULT_ALGERIAN_HOLIDAY_CALENDAR: Array<{
  holidayDate: string;
  label: string;
  labelAr: string;
  holidayKind: 'fixed' | 'islamic' | 'judicial';
}> = [
  { holidayDate: '2026-01-01', label: 'Jour de l’An', labelAr: 'رأس السنة الميلادية', holidayKind: 'fixed' },
  { holidayDate: '2026-01-12', label: 'Yennayer (Nouvel An Amazigh)', labelAr: 'يناير (رأس السنة الأمازيغية)', holidayKind: 'fixed' },
  { holidayDate: '2026-03-20', label: 'Aïd El Fitr (Jour 1)', labelAr: 'عيد الفطر المبارك', holidayKind: 'islamic' },
  { holidayDate: '2026-03-21', label: 'Aïd El Fitr (Jour 2)', labelAr: 'ثاني أيام عيد الفطر', holidayKind: 'islamic' },
  { holidayDate: '2026-05-01', label: 'Fête du Travail', labelAr: 'عيد العمال', holidayKind: 'fixed' },
  { holidayDate: '2026-05-27', label: 'Aïd El Adha (Jour 1)', labelAr: 'عيد الأضحى المبارك', holidayKind: 'islamic' },
  { holidayDate: '2026-05-28', label: 'Aïd El Adha (Jour 2)', labelAr: 'ثاني أيام عيد الأضحى', holidayKind: 'islamic' },
  { holidayDate: '2026-06-16', label: 'Awal Moharram (1er Moharram)', labelAr: 'أول محرم', holidayKind: 'islamic' },
  { holidayDate: '2026-06-25', label: 'Achoura', labelAr: 'عاشوراء', holidayKind: 'islamic' },
  { holidayDate: '2026-07-05', label: 'Fête de l’Indépendance et de la Jeunesse', labelAr: 'عيد الاستقلال والشباب', holidayKind: 'fixed' },
  { holidayDate: '2026-08-25', label: 'Mawlid Ennabaoui', labelAr: 'المولد النبوي الشريف', holidayKind: 'islamic' },
  { holidayDate: '2026-11-01', label: 'Fête de la Révolution', labelAr: 'ذكرى اندلاع الثورة', holidayKind: 'fixed' },
];

function parseIsoYmdUtc(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || '').trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  return new Date(Date.UTC(y, m, d));
}

function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface HearingDateCheckResult {
  requestedDate: string;
  adjustedDate: string;
  wasShifted: boolean;
  reason?: string;
}

export function validateOrShiftHearingDate(
  requestedDate: string,
  holidays: Array<Pick<LegalHolidayEntry, 'holidayDate' | 'label' | 'isActive'>> | string[]
): HearingDateCheckResult {
  const parsed = parseIsoYmdUtc(requestedDate);
  if (!parsed) {
    return { requestedDate, adjustedDate: requestedDate, wasShifted: false };
  }

  const holidayMap = new Map<string, string>();
  for (const h of holidays) {
    if (typeof h === 'string') {
      holidayMap.set(h.slice(0, 10), 'Jour férié');
    } else if (h.isActive !== false) {
      holidayMap.set(h.holidayDate.slice(0, 10), h.label);
    }
  }

  const fixedMmDd = new Map<string, string>([
    ['01-01', 'Jour de l’An'],
    ['05-01', 'Fête du Travail'],
    ['07-05', 'Fête de l’Indépendance'],
    ['11-01', 'Fête de la Révolution'],
  ]);

  let wasShifted = false;
  let lastReason: string | undefined;
  const cursor = new Date(parsed.getTime());

  for (let guard = 0; guard < 14; guard += 1) {
    const dow = cursor.getUTCDay(); // 5=Friday, 6=Saturday
    const ymd = formatUtcYmd(cursor);
    const mmdd = ymd.slice(5, 10);

    if (dow === 5) {
      wasShifted = true;
      lastReason = 'Vendredi (jour de repos hebdomadaire judiciaire — Art. 405 CPCA)';
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }
    if (dow === 6) {
      wasShifted = true;
      lastReason = 'Samedi (jour chômé judiciaire — Art. 405 CPCA)';
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }
    if (holidayMap.has(ymd)) {
      wasShifted = true;
      lastReason = `${holidayMap.get(ymd)} (${ymd}) — report au prochain jour ouvrable judiciaire`;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }
    if (fixedMmDd.has(mmdd)) {
      wasShifted = true;
      lastReason = `${fixedMmDd.get(mmdd)} (${ymd}) — report au prochain jour ouvrable judiciaire`;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }
    break;
  }

  return {
    requestedDate,
    adjustedDate: formatUtcYmd(cursor),
    wasShifted,
    reason: lastReason,
  };
}

export function recalculateDeadlinesWithHolidays<
  T extends {
    id: string;
    notificationDate: string;
    recourseType: CPCARecourseType;
    domicileCategory: DomicileCategory;
    terminalExpiryDate: string;
    status: string;
    isRolledOver: boolean;
    rolloverReason?: string;
  }
>(
  deadlines: T[],
  holidays: Array<Pick<LegalHolidayEntry, 'holidayDate' | 'isActive'>> | string[]
): { updated: T[]; recalculatedCount: number } {
  const activeDates = holidays
    .filter((h) => (typeof h === 'string' ? true : h.isActive !== false))
    .map((h) => (typeof h === 'string' ? h.slice(0, 10) : h.holidayDate.slice(0, 10)));

  let recalculatedCount = 0;
  const updated = deadlines.map((dl) => {
    if (dl.status === 'filed' || dl.status === 'forfeited') return dl;
    const calc: CPCADeadlineCalculationResult = calculateCPCADeadline(
      dl.notificationDate,
      dl.recourseType,
      dl.domicileCategory,
      activeDates
    );
    if (calc.terminalExpiryDate !== dl.terminalExpiryDate || calc.isRolledOver !== dl.isRolledOver) {
      recalculatedCount += 1;
      return {
        ...dl,
        terminalExpiryDate: calc.terminalExpiryDate,
        isRolledOver: calc.isRolledOver,
        rolloverReason: calc.rolloverReason,
      };
    }
    return dl;
  });

  return { updated, recalculatedCount };
}

// ============================================================================
// 4. CARPA / Escrow Reconciliation & Guarded Release Validation
// ============================================================================

export interface CarpaReconciliationResult {
  ledgerBalanceCentimes: number;
  bankStatementCentimes: number;
  varianceCentimes: number;
  isReconciled: boolean;
  statusLabel: 'Rapproché' | 'Écart Détecté';
}

export function computeCarpaReconciliation(
  account: Pick<EscrowAccount, 'currentBalanceDzd' | 'bankStatementBalanceDzd'>
): CarpaReconciliationResult {
  const ledgerBalanceCentimes = Math.round((Number(account.currentBalanceDzd) || 0) * 100);
  const bankStatementCentimes = Math.round(
    (Number(account.bankStatementBalanceDzd ?? account.currentBalanceDzd) || 0) * 100
  );
  const varianceCentimes = bankStatementCentimes - ledgerBalanceCentimes;
  const isReconciled = varianceCentimes === 0;
  return {
    ledgerBalanceCentimes,
    bankStatementCentimes,
    varianceCentimes,
    isReconciled,
    statusLabel: isReconciled ? 'Rapproché' : 'Écart Détecté',
  };
}

export function validateEscrowGuardedRelease(params: {
  account: Pick<
    EscrowAccount,
    'currentBalanceDzd' | 'cadastralClearanceProof' | 'releasePinHash'
  >;
  payoutAmountDzd: number;
  pinEntered: string;
  requireCadastre?: boolean;
}): { allowed: boolean; reason?: string; code?: string } {
  const payoutCentimes = Math.round((Number(params.payoutAmountDzd) || 0) * 100);
  const balanceCentimes = Math.round((Number(params.account.currentBalanceDzd) || 0) * 100);
  const requireCadastre = params.requireCadastre ?? true;

  if (payoutCentimes <= 0) {
    return {
      allowed: false,
      code: 'INVALID_ESCROW_PAYOUT_AMOUNT',
      reason: 'Le montant de déblocage doit être strictement positif.',
    };
  }
  if (payoutCentimes > balanceCentimes) {
    return {
      allowed: false,
      code: 'INSUFFICIENT_ESCROW_BALANCE',
      reason: 'Solde séquestre insuffisant sur ce dossier.',
    };
  }
  if (
    requireCadastre &&
    (!params.account.cadastralClearanceProof?.volume?.trim() ||
      !params.account.cadastralClearanceProof?.number?.trim())
  ) {
    return {
      allowed: false,
      code: 'CADASTRE_CLEARANCE_REQUIRED',
      reason:
        'Déblocage interdit : publication foncière (Volume & Numéro Conservation Foncière) requise.',
    };
  }

  const enteredClean = String(params.pinEntered || '').trim();
  const storedHash = String(params.account.releasePinHash || '').trim();
  if (!enteredClean) {
    return {
      allowed: false,
      code: 'INVALID_ESCROW_PIN',
      reason: 'Saisissez votre code PIN titulaire pour débloquer les fonds.',
    };
  }

  const matches =
    storedHash.length > 0
      ? storedHash.startsWith('sha256:')
        ? storedHash === hashEscrowPin(enteredClean)
        : storedHash === enteredClean
      : false;

  if (!matches) {
    return {
      allowed: false,
      code: 'INVALID_ESCROW_PIN',
      reason: 'Code PIN de sécurité titulaire incorrect ou non configuré sur ce compte séquestre.',
    };
  }

  return { allowed: true };
}

// ============================================================================
// 5. Document Vault File Guard, Templates, SVG Signature & Client Portal Link
// ============================================================================

export function validateVaultUploadFile(file: {
  name: string;
  size: number;
  type: string;
}): { ok: boolean; reason?: string } {
  if (!file.name || !file.name.trim()) {
    return { ok: false, reason: 'Nom de fichier requis.' };
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'Le fichier est vide.' };
  }
  if (file.size > LEGAL_VAULT_MAX_BYTES) {
    return {
      ok: false,
      reason: `Taille maximale dépassée (${(file.size / (1024 * 1024)).toFixed(1)} Mo > 15 Mo).`,
    };
  }
  if (
    file.type &&
    !(LEGAL_VAULT_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return {
      ok: false,
      reason: `Format non autorisé (${file.type}). Formats acceptés : PDF, PNG, JPEG, WEBP, DOCX, TXT.`,
    };
  }
  return { ok: true };
}

export const DEFAULT_LEGAL_DOC_TEMPLATES: Array<
  Omit<LegalDocTemplate, 'accountId' | 'businessId' | 'branchId' | 'createdAt'>
> = [
  {
    id: 'tpl_mise_en_demeure',
    code: 'TPL-MD-001',
    title: 'Mise en demeure — Recouvrement / Exécution',
    titleAr: 'إعذار رسمي بالوفاء أو التنفيذ',
    templateType: 'mise_en_demeure',
    variables: ['client_name', 'adverse_party', 'matter_number', 'amount_dzd', 'due_days', 'cabinet_name'],
    isSystem: true,
    bodyTemplate:
      `CABINET {{cabinet_name}}\n` +
      `OBJET : MISE EN DEMEURE VALANT SOMMATION DE PAYER (Dossier {{matter_number}})\n\n` +
      `À l'attention de : {{adverse_party}}\n` +
      `Pour le compte de notre mandant : {{client_name}}\n\n` +
      `Madame, Monsieur,\n` +
      `Sauf erreur ou omission, la créance certaine, liquide et exigible d'un montant de {{amount_dzd}} DZD demeure impayée à ce jour.\n` +
      `Par la présente mise en demeure, nous vous prions de bien vouloir régulariser l'intégralité de cette somme sous huitaine ({{due_days}} jours) à compter de la réception de la présente.\n` +
      `À défaut, nous saisirons la juridiction compétente sans autre avis.\n\n` +
      `Fait pour valoir ce que de droit.`,
  },
  {
    id: 'tpl_requete_introductive',
    code: 'TPL-REQ-002',
    title: 'Requête introductive d’instance civile / commerciale',
    titleAr: 'عريضة افتتاح دعوى مدنية / تجارية',
    templateType: 'requete',
    variables: ['court_name', 'chamber', 'client_name', 'adverse_party', 'matter_number', 'claims_summary'],
    isSystem: true,
    bodyTemplate:
      `À MONSIEUR LE PRÉSIDENT DU TRIBUNAL DE {{court_name}} — SECTION {{chamber}}\n` +
      `REQUÊTE INTRODUCTIVE D’INSTANCE (Dossier {{matter_number}})\n\n` +
      `POUR : {{client_name}} (Demandeur)\n` +
      `CONTRE : {{adverse_party}} (Défendeur)\n\n` +
      `PLAISE AU TRIBUNAL :\n` +
      `{{claims_summary}}\n\n` +
      `SOUS TOUTES RÉSERVES — POUR JUSTICE.`,
  },
  {
    id: 'tpl_procuration',
    code: 'TPL-PRC-003',
    title: 'Procuration spéciale / Mandat de représentation',
    titleAr: 'وكالة خاصة بالتمثيل والتقاضي',
    templateType: 'procuration',
    variables: ['client_name', 'client_nin', 'representative_name', 'matter_number', 'purpose'],
    isSystem: true,
    bodyTemplate:
      `PROCURATION SPÉCIALE (Dossier {{matter_number}})\n\n` +
      `Je soussigné(e) {{client_name}} (NIN/NIF : {{client_nin}}),\n` +
      `donne par la présente pouvoir spécial à {{representative_name}} à l'effet d'accomplir l'acte suivant : {{purpose}}.\n\n` +
      `Bon pour pouvoir.`,
  },
  {
    id: 'tpl_bail_commercial',
    code: 'TPL-BAIL-004',
    title: 'Contrat de bail commercial (Art. 169 Code de Commerce)',
    titleAr: 'عقد إيجار تجاري',
    templateType: 'bail',
    variables: ['landlord_name', 'tenant_name', 'property_address', 'monthly_rent_dzd', 'duration_months'],
    isSystem: true,
    bodyTemplate:
      `ACTE DE BAIL COMMERCIAL (Art. 169 et suivants du Code de Commerce Algérien)\n\n` +
      `ENTRE LES SOUSSIGNÉS :\n` +
      `Le Bailleur : {{landlord_name}}\n` +
      `Le Preneur : {{tenant_name}}\n\n` +
      `Désignation du local : {{property_address}}\n` +
      `Durée : {{duration_months}} mois — Loyer mensuel : {{monthly_rent_dzd}} DZD.`,
  },
];

export function interpolateLegalTemplate(
  bodyTemplate: string,
  values: Record<string, string | number | null | undefined>
): { rendered: string; unresolvedTokens: string[] } {
  const unresolved = new Set<string>();
  const rendered = bodyTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const raw = values[key];
    const str = raw === null || raw === undefined ? '' : String(raw).trim();
    if (!str) {
      unresolved.add(key);
      return `[${key}]`;
    }
    return str;
  });
  return { rendered, unresolvedTokens: Array.from(unresolved) };
}

export function validateSignatureSvg(svg: string): { valid: boolean; reason?: string } {
  const trimmed = String(svg || '').trim();
  if (!trimmed.startsWith('<svg') || !trimmed.includes('</svg>')) {
    return { valid: false, reason: 'Signature vectorielle invalide.' };
  }
  if (!trimmed.includes('<path') && !trimmed.includes('<polyline')) {
    return { valid: false, reason: 'Veuillez tracer votre signature avant de sceller le document.' };
  }
  return { valid: true };
}

export function buildLegalPortalTokenAndUrl(
  matterId: string,
  matterNumber: string,
  origin = 'https://app.atrium-dz.com'
): { token: string; url: string } {
  const raw = computeSha256Hex(`${matterId}:${matterNumber}`).slice(0, 24);
  const token = `lpr_${raw}`;
  const cleanOrigin = origin.replace(/\/+$/, '');
  return {
    token,
    url: `${cleanOrigin}/portal/legal/${encodeURIComponent(token)}`,
  };
}

// ============================================================================
// 6. Hearing & CPCA Reminder Dispatch (Respects CRM Opt-Out & Quiet Hours)
// ============================================================================

export interface LegalReminderDispatchPreview {
  allowed: boolean;
  queuedForAfterQuietHours: boolean;
  scheduledSendIso: string;
  renderedMessage: string;
  dispatchEvaluation: DispatchEvaluationResult;
}

export function prepareHearingOrDeadlineReminder(params: {
  party: CrmParty;
  channel: CrmChannel;
  subjectLabel: string;
  targetDate: string;
  courtOrRef: string;
  nowIso: string;
  quietHours?: Pick<ReminderQuietHoursConfig, 'enabled' | 'startTime' | 'endTime' | 'timezone'> | null;
  providerConfigured?: boolean;
}): LegalReminderDispatchPreview {
  const renderedMessage = `Cabinet Juridique — Rappel : ${params.subjectLabel} (${params.courtOrRef}) le ${params.targetDate}. Merci de confirmer réception.`;
  const dispatchEvaluation = evaluateCommunicationDispatch({
    party: params.party,
    channel: params.channel,
    renderedBody: renderedMessage,
    missingVariables: [],
    providerConfigured: params.providerConfigured ?? false,
  });

  const optOutBlocked = dispatchEvaluation.status === 'blocked_opt_out';
  if (optOutBlocked) {
    return {
      allowed: false,
      queuedForAfterQuietHours: false,
      scheduledSendIso: params.nowIso,
      renderedMessage,
      dispatchEvaluation,
    };
  }

  const inQuiet = isWithinQuietHours(params.nowIso, params.quietHours);
  const scheduledSendIso = inQuiet
    ? computeNextAllowedSendIso(params.nowIso, params.quietHours)
    : params.nowIso;

  return {
    allowed: dispatchEvaluation.allowed,
    queuedForAfterQuietHours: inQuiet,
    scheduledSendIso,
    renderedMessage,
    dispatchEvaluation,
  };
}

// ============================================================================
// 7. Trade Gaps: Expert-Comptable G50 / Multi-Client Books, Huissier Acts, Arbitration Timelines
// ============================================================================

export interface G50CalculationInput {
  tvaCollecteeCentimes: number;
  tvaDeductibleCentimes: number;
  creditTvaAnterieurCentimes?: number;
  tapBaseCentimes?: number;
  tapRatePercent?: number; // Default 0% following Loi de Finances 2024 abolition of TAP unless special rate
  irgSalairesCentimes?: number;
  ibsAcompteCentimes?: number;
  timbreFiscalCentimes?: number;
}

export interface G50CalculationResult {
  tvaCollecteeCentimes: number;
  tvaDeductibleCentimes: number;
  creditTvaAnterieurCentimes: number;
  tvaNetDueCentimes: number;
  creditTvaReportableCentimes: number;
  tapDueCentimes: number;
  irgSalairesCentimes: number;
  ibsAcompteCentimes: number;
  timbreFiscalCentimes: number;
  totalG50DueCentimes: number;
}

export function computeClientG50Declaration(input: G50CalculationInput): G50CalculationResult {
  const collectee = Math.max(0, Math.round(input.tvaCollecteeCentimes || 0));
  const deductible = Math.max(0, Math.round(input.tvaDeductibleCentimes || 0));
  const creditPrev = Math.max(0, Math.round(input.creditTvaAnterieurCentimes || 0));
  const rawTvaDelta = collectee - deductible - creditPrev;
  const tvaNetDueCentimes = Math.max(0, rawTvaDelta);
  const creditTvaReportableCentimes = rawTvaDelta < 0 ? Math.abs(rawTvaDelta) : 0;

  const tapBase = Math.max(0, Math.round(input.tapBaseCentimes || 0));
  const tapRate = Math.max(0, Number(input.tapRatePercent || 0));
  const tapDueCentimes = Math.round(tapBase * (tapRate / 100));

  const irgSalairesCentimes = Math.max(0, Math.round(input.irgSalairesCentimes || 0));
  const ibsAcompteCentimes = Math.max(0, Math.round(input.ibsAcompteCentimes || 0));
  const timbreFiscalCentimes = Math.max(0, Math.round(input.timbreFiscalCentimes || 0));

  const totalG50DueCentimes =
    tvaNetDueCentimes + tapDueCentimes + irgSalairesCentimes + ibsAcompteCentimes + timbreFiscalCentimes;

  return {
    tvaCollecteeCentimes: collectee,
    tvaDeductibleCentimes: deductible,
    creditTvaAnterieurCentimes: creditPrev,
    tvaNetDueCentimes,
    creditTvaReportableCentimes,
    tapDueCentimes,
    irgSalairesCentimes,
    ibsAcompteCentimes,
    timbreFiscalCentimes,
    totalG50DueCentimes,
  };
}

export function summarizeMultiClientBooks(ledgers: LegalClientLedgerBook[]): {
  totalClients: number;
  filedCount: number;
  liasseReadyCount: number;
  aggregateG50DueDzd: number;
} {
  const totalClients = ledgers.length;
  const filedCount = ledgers.filter((l) => l.g50Status === 'filed_dgi' || l.g50Status === 'paid').length;
  const liasseReadyCount = ledgers.filter((l) => l.liasseReady).length;
  const aggregateCentimes = ledgers.reduce((sum, l) => sum + (Number(l.totalG50DueCentimes) || 0), 0);
  return {
    totalClients,
    filedCount,
    liasseReadyCount,
    aggregateG50DueDzd: Math.round(aggregateCentimes) / 100,
  };
}

export function createBailiffActWithOptionalCpcaDeadline(params: {
  accountId: string;
  businessId: string;
  branchId: string;
  staffId: string;
  actNumber: string;
  matterId?: string;
  matterNumber?: string;
  actKind: LegalBailiffAct['actKind'];
  bailiffName: string;
  recipientName: string;
  serviceMode: LegalBailiffAct['serviceMode'];
  serviceDate: string;
  feeDzd: number;
  pvSummary?: string;
  recourseToTrigger?: CPCARecourseType;
  domicileCategory?: DomicileCategory;
  holidays?: string[];
}): {
  act: LegalBailiffAct;
  cpcaCalculation?: CPCADeadlineCalculationResult;
} {
  const cpcaCalculation = params.recourseToTrigger
    ? calculateCPCADeadline(
        params.serviceDate,
        params.recourseToTrigger,
        params.domicileCategory || 'local',
        params.holidays || []
      )
    : undefined;

  const act: LegalBailiffAct = {
    id: `hui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    accountId: params.accountId,
    businessId: params.businessId,
    branchId: params.branchId,
    staffId: params.staffId,
    actNumber: params.actNumber,
    matterId: params.matterId,
    matterNumber: params.matterNumber,
    actKind: params.actKind,
    bailiffName: params.bailiffName,
    recipientName: params.recipientName,
    serviceMode: params.serviceMode,
    serviceDate: params.serviceDate,
    pvSummary: params.pvSummary,
    status: params.pvSummary ? 'pv_logged' : 'served',
    feeCentimes: Math.max(0, Math.round((Number(params.feeDzd) || 0) * 100)),
    version: 1,
    createdAt: new Date().toISOString(),
  };

  return { act, cpcaCalculation };
}

export function createDefaultArbitrationMilestones(startDate: string): LegalArbitrationMilestone[] {
  const base = parseIsoYmdUtc(startDate) || new Date();
  const addDays = (days: number) => {
    const d = new Date(base.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return formatUtcYmd(d);
  };
  return [
    { id: 'ms_req', label: 'Notification d’Arbitrage & Constitution du Tribunal', targetDate: addDays(15), status: 'done', completedDate: startDate },
    { id: 'ms_tor', label: 'Acte de Mission (Terms of Reference)', targetDate: addDays(45), status: 'pending' },
    { id: 'ms_mem', label: 'Échange des Mémoires & Pièces', targetDate: addDays(90), status: 'pending' },
    { id: 'ms_hear', label: 'Plaidoiries & Clôture des Débats', targetDate: addDays(135), status: 'pending' },
    { id: 'ms_award', label: 'Prononcé de la Sentence Arbitrale & Exequatur', targetDate: addDays(180), status: 'pending' },
  ];
}

export function evaluateArbitrationTimelineStatus(
  timeline: Pick<LegalArbitrationTimeline, 'milestones' | 'status'>
): { completedCount: number; totalCount: number; progressPercent: number } {
  const totalCount = timeline.milestones.length || 1;
  const completedCount = timeline.milestones.filter((m) => m.status === 'done').length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, progressPercent };
}
