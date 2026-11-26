import { validateAlgerianPhone } from './logisticsRules';
import type {
  Appointment,
  CommercialDocument,
  CrmChannel,
  CrmCommunicationLog,
  CrmCommunicationStatus,
  CrmFollowUpTask,
  CrmMessageTemplate,
  CrmParty,
  CrmPartyLink,
  CrmPartyNote,
  MemberCheckInLog,
  Sale,
  UnifiedDocument,
  UnifiedPayment,
} from '../types/index';

export interface NormalizedCrmPhone {
  valid: boolean;
  operator: 'Mobilis' | 'Djezzy' | 'Ooredoo' | 'Fixe' | 'Unknown';
  formatted: string;
  local10: string | null;
  e164: string | null;
}

/**
 * Reuses `validateAlgerianPhone` from logisticsRules.ts and derives both
 * 10-digit local (`0XXXXXXXXX`) and canonical E.164 (`+213XXXXXXXXX`) forms.
 */
export function normalizeAlgerianPhoneForCrm(rawPhone?: string | null): NormalizedCrmPhone {
  const raw = String(rawPhone || '').trim();
  if (!raw) {
    return { valid: false, operator: 'Unknown', formatted: '', local10: null, e164: null };
  }

  const check = validateAlgerianPhone(raw);
  if (!check.valid) {
    return {
      valid: false,
      operator: 'Unknown',
      formatted: raw,
      local10: null,
      e164: null,
    };
  }

  const local10 = check.formatted.replace(/\s+/g, '');
  const e164 = local10.startsWith('0') ? `+213${local10.slice(1)}` : `+213${local10}`;
  return {
    valid: true,
    operator: check.operator,
    formatted: check.formatted,
    local10,
    e164,
  };
}

export function normalizeNif(nif?: string | null): string | null {
  const cleaned = String(nif || '').replace(/[\s\-_.]/g, '').trim();
  return cleaned.length > 0 ? cleaned.toUpperCase() : null;
}

export function normalizeEmail(email?: string | null): string | null {
  const cleaned = String(email || '').trim().toLowerCase();
  return cleaned.includes('@') ? cleaned : null;
}

export type DuplicateMatchReason = 'phone' | 'nif' | 'email';

export interface PartyDuplicateCandidate {
  party: CrmParty;
  reasons: DuplicateMatchReason[];
  isSharedFamilyPhone: boolean;
  confidence: 'high' | 'medium';
}

/**
 * Detects duplicate parties in the same business by normalized +213 phone,
 * NIF, or email. Explicitly flags shared family phones without hard-blocking
 * separate persons who share a household mobile/fixe line.
 */
export function detectPartyDuplicates(
  candidate: {
    id?: string;
    businessId: string;
    displayName?: string;
    phone?: string;
    email?: string;
    nif?: string;
    sharedPhoneGroup?: boolean;
  },
  existingParties: CrmParty[]
): PartyDuplicateCandidate[] {
  const normPhone = normalizeAlgerianPhoneForCrm(candidate.phone);
  const normNif = normalizeNif(candidate.nif);
  const normEmail = normalizeEmail(candidate.email);
  const candidateName = (candidate.displayName || '').trim().toLowerCase();

  const matches: PartyDuplicateCandidate[] = [];

  for (const party of existingParties) {
    if (party.deletedAt || party.mergedIntoPartyId) continue;
    if (party.businessId !== candidate.businessId) continue;
    if (candidate.id && party.id === candidate.id) continue;

    const reasons: DuplicateMatchReason[] = [];
    const partyPhone = party.phoneE164 || normalizeAlgerianPhoneForCrm(party.phoneRaw).e164;
    if (normPhone.e164 && partyPhone && normPhone.e164 === partyPhone) {
      reasons.push('phone');
    }

    const partyNif = normalizeNif(party.nif);
    if (normNif && partyNif && normNif === partyNif) {
      reasons.push('nif');
    }

    const partyEmail = normalizeEmail(party.email);
    if (normEmail && partyEmail && normEmail === partyEmail) {
      reasons.push('email');
    }

    if (reasons.length === 0) continue;

    const partyName = (party.displayName || '').trim().toLowerCase();
    const isDifferentNamedPerson =
      Boolean(candidateName) &&
      Boolean(partyName) &&
      candidateName !== partyName &&
      !reasons.includes('nif') &&
      !reasons.includes('email');

    const isSharedFamilyPhone =
      reasons.includes('phone') &&
      (Boolean(party.sharedPhoneGroup) ||
        Boolean(candidate.sharedPhoneGroup) ||
        isDifferentNamedPerson);

    const confidence: 'high' | 'medium' =
      reasons.includes('nif') ||
      reasons.includes('email') ||
      (reasons.includes('phone') && !isSharedFamilyPhone)
        ? 'high'
        : 'medium';

    matches.push({
      party,
      reasons,
      isSharedFamilyPhone,
      confidence,
    });
  }

  return matches.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
    return b.reasons.length - a.reasons.length;
  });
}

export interface PartyMergePlan {
  sourceParty: CrmParty;
  targetParty: CrmParty;
  mergedTarget: CrmParty;
  linksMovedCount: number;
  notesMovedCount: number;
  tasksMovedCount: number;
  commsMovedCount: number;
}

export function planPartyMerge(
  sourceParty: CrmParty,
  targetParty: CrmParty,
  counts: {
    links: CrmPartyLink[];
    notes: CrmPartyNote[];
    tasks: CrmFollowUpTask[];
    comms: CrmCommunicationLog[];
  },
  mergedByStaffId?: string,
  nowIso = new Date().toISOString()
): PartyMergePlan {
  const mergedTarget: CrmParty = {
    ...targetParty,
    phoneRaw: targetParty.phoneRaw || sourceParty.phoneRaw,
    phoneE164: targetParty.phoneE164 || sourceParty.phoneE164,
    phoneLocal: targetParty.phoneLocal || sourceParty.phoneLocal,
    phoneValid: targetParty.phoneValid || sourceParty.phoneValid,
    email: targetParty.email || sourceParty.email,
    nif: targetParty.nif || sourceParty.nif,
    rc: targetParty.rc || sourceParty.rc,
    nis: targetParty.nis || sourceParty.nis,
    ai: targetParty.ai || sourceParty.ai,
    address: targetParty.address || sourceParty.address,
    wilayaCode: targetParty.wilayaCode || sourceParty.wilayaCode,
    optOutAll: targetParty.optOutAll || sourceParty.optOutAll,
    consentSms: targetParty.consentSms && sourceParty.consentSms,
    consentWhatsapp: targetParty.consentWhatsapp && sourceParty.consentWhatsapp,
    consentEmail: targetParty.consentEmail && sourceParty.consentEmail,
    tags: Array.from(new Set([...(targetParty.tags || []), ...(sourceParty.tags || [])])),
    notes: [targetParty.notes, sourceParty.notes].filter(Boolean).join('\n---\n') || undefined,
    version: (targetParty.version || 1) + 1,
    updatedAt: nowIso,
  };

  return {
    sourceParty: {
      ...sourceParty,
      mergedIntoPartyId: targetParty.id,
      mergedAt: nowIso,
      mergedByStaffId,
      deletedAt: nowIso,
      version: (sourceParty.version || 1) + 1,
      updatedAt: nowIso,
    },
    targetParty,
    mergedTarget,
    linksMovedCount: counts.links.filter((l) => l.partyId === sourceParty.id && !l.deletedAt).length,
    notesMovedCount: counts.notes.filter((n) => n.partyId === sourceParty.id && !n.deletedAt).length,
    tasksMovedCount: counts.tasks.filter((t) => t.partyId === sourceParty.id && !t.deletedAt).length,
    commsMovedCount: counts.comms.filter((c) => c.partyId === sourceParty.id).length,
  };
}

export function getDefaultCrmMessageTemplates(
  accountId: string,
  businessId: string
): CrmMessageTemplate[] {
  const nowIso = '2026-11-01T00:00:00.000Z';
  const defs: Array<
    Omit<CrmMessageTemplate, 'id' | 'accountId' | 'businessId' | 'isActive' | 'isSystem' | 'createdAt' | 'updatedAt'>
  > = [
    {
      code: 'PAYMENT_FOLLOWUP',
      channel: 'whatsapp',
      name: 'Relance Règlement / Facture',
      subjectFr: 'Rappel facture {{doc_number}}',
      subjectAr: 'تذكير بالفاتورة {{doc_number}}',
      subjectEn: 'Invoice reminder {{doc_number}}',
      bodyFr:
        'Bonjour {{name}}, sauf erreur de notre part, la pièce {{doc_number}} d’un montant de {{amount}} reste due pour le {{due_date}}. — {{business_name}}',
      bodyAr:
        'مرحباً {{name}}، نود تذكيركم بأن الفاتورة رقم {{doc_number}} بمبلغ {{amount}} مستحقة بتاريخ {{due_date}}. — {{business_name}}',
      bodyEn:
        'Hello {{name}}, friendly reminder that document {{doc_number}} for {{amount}} is due on {{due_date}}. — {{business_name}}',
      variables: ['name', 'doc_number', 'amount', 'due_date', 'business_name'],
    },
    {
      code: 'APPOINTMENT_REMINDER',
      channel: 'sms',
      name: 'Confirmation / Rappel Rendez-vous',
      subjectFr: 'Rappel rendez-vous',
      subjectAr: 'تذكير بالموعد',
      subjectEn: 'Appointment reminder',
      bodyFr:
        'Bonjour {{name}}, votre rendez-vous chez {{business_name}} est confirmé le {{due_date}}. Contact : {{phone}}.',
      bodyAr:
        'مرحباً {{name}}، تم تأكيد موعدكم لدى {{business_name}} بتاريخ {{due_date}}. للاستفسار: {{phone}}.',
      bodyEn:
        'Hello {{name}}, your appointment with {{business_name}} is confirmed for {{due_date}}. Contact: {{phone}}.',
      variables: ['name', 'business_name', 'due_date', 'phone'],
    },
    {
      code: 'WELCOME_ONBOARDING',
      channel: 'email',
      name: 'Bienvenue & Fiche Client',
      subjectFr: 'Bienvenue chez {{business_name}}',
      subjectAr: 'مرحباً بكم في {{business_name}}',
      subjectEn: 'Welcome to {{business_name}}',
      bodyFr:
        'Bonjour {{name}},\n\nVotre dossier client est désormais actif chez {{business_name}}. Notre équipe reste joignable au {{phone}}.\n\nCordialement.',
      bodyAr:
        'مرحباً {{name}}،\n\nتم تفعيل ملفكم لدى {{business_name}}. فريقنا في خدمتكم عبر الرقم {{phone}}.\n\nمع التحية.',
      bodyEn:
        'Hello {{name}},\n\nYour profile with {{business_name}} is now active. Reach us anytime at {{phone}}.\n\nBest regards.',
      variables: ['name', 'business_name', 'phone'],
    },
  ];

  return defs.map((d) => ({
    ...d,
    id: `crm_tpl_${businessId}_${d.code.toLowerCase()}_${d.channel}`,
    accountId,
    businessId,
    isSystem: true,
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

export interface RenderedCrmMessage {
  subject: string;
  body: string;
  missingVariables: string[];
}

export function renderCrmTemplate(
  template: Pick<
    CrmMessageTemplate,
    'subjectFr' | 'subjectAr' | 'subjectEn' | 'bodyFr' | 'bodyAr' | 'bodyEn'
  >,
  language: 'en' | 'fr' | 'ar',
  variables: Record<string, string | number | null | undefined>
): RenderedCrmMessage {
  const rawSubject =
    language === 'ar'
      ? template.subjectAr || template.subjectFr || template.subjectEn || ''
      : language === 'en'
      ? template.subjectEn || template.subjectFr || template.subjectAr || ''
      : template.subjectFr || template.subjectEn || template.subjectAr || '';
  const rawBody =
    language === 'ar'
      ? template.bodyAr || template.bodyFr || template.bodyEn
      : language === 'en'
      ? template.bodyEn || template.bodyFr || template.bodyAr
      : template.bodyFr || template.bodyEn || template.bodyAr;

  const missingSet = new Set<string>();
  const replaceTokens = (text: string): string =>
    text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key: string) => {
      const val = variables[key];
      const str = val === null || val === undefined ? '' : String(val).trim();
      if (!str) {
        missingSet.add(key);
        return `[${key}]`;
      }
      return str;
    });

  return {
    subject: replaceTokens(rawSubject),
    body: replaceTokens(rawBody),
    missingVariables: Array.from(missingSet),
  };
}

export interface DispatchEvaluationInput {
  party: CrmParty;
  channel: CrmChannel;
  renderedBody: string;
  missingVariables: string[];
  allowMissingVariables?: boolean;
  providerConfigured?: boolean;
  simulateProviderFailure?: boolean;
  providerName?: string;
}

export interface DispatchEvaluationResult {
  allowed: boolean;
  status: CrmCommunicationStatus;
  recipientAddress: string;
  errorCode?: string;
  errorMessage?: string;
  providerName?: string;
}

/**
 * Enforces opt-out consent, recipient validity, missing-variable warning policy,
 * and honest provider dispatch status (never claiming gateway delivery when no
 * SMS/WhatsApp/Email gateway is configured).
 */
export function evaluateCommunicationDispatch(
  input: DispatchEvaluationInput
): DispatchEvaluationResult {
  const { party, channel } = input;
  const recipientAddress =
    channel === 'email'
      ? normalizeEmail(party.email) || ''
      : party.phoneE164 || normalizeAlgerianPhoneForCrm(party.phoneRaw).e164 || '';

  if (party.optOutAll) {
    return {
      allowed: false,
      status: 'blocked_opt_out',
      recipientAddress,
      errorCode: 'CRM_OPT_OUT_ALL',
      errorMessage: 'Contact opted out of all outbound communications.',
    };
  }

  const channelConsent =
    channel === 'sms'
      ? party.consentSms
      : channel === 'whatsapp'
      ? party.consentWhatsapp
      : party.consentEmail;

  if (!channelConsent) {
    return {
      allowed: false,
      status: 'blocked_opt_out',
      recipientAddress,
      errorCode: 'CRM_CHANNEL_OPT_OUT',
      errorMessage: `Contact opted out of ${channel.toUpperCase()} messages.`,
    };
  }

  if (!recipientAddress) {
    return {
      allowed: false,
      status: 'failed',
      recipientAddress: '',
      errorCode: 'CRM_MISSING_RECIPIENT',
      errorMessage:
        channel === 'email'
          ? 'Valid email address is required.'
          : 'Valid +213 phone number is required.',
    };
  }

  if (input.missingVariables.length > 0 && !input.allowMissingVariables) {
    return {
      allowed: false,
      status: 'failed',
      recipientAddress,
      errorCode: 'CRM_MISSING_TEMPLATE_VARS',
      errorMessage: `Missing template variable(s): ${input.missingVariables.join(', ')}`,
    };
  }

  if (input.simulateProviderFailure) {
    return {
      allowed: false,
      status: 'failed',
      recipientAddress,
      providerName: input.providerName || `${channel}_gateway`,
      errorCode: 'PROVIDER_DELIVERY_ERROR',
      errorMessage: 'Provider dispatch failed — queued for retry.',
    };
  }

  if (!input.providerConfigured) {
    return {
      allowed: false,
      status: 'failed',
      recipientAddress,
      providerName: input.providerName || 'unconfigured_gateway',
      errorCode: 'PROVIDER_NOT_CONFIGURED',
      errorMessage:
        'External SMS/WhatsApp/Email gateway is not configured; retry once provider is active or use direct app handoff.',
    };
  }

  return {
    allowed: true,
    status: 'sent',
    recipientAddress,
    providerName: input.providerName || `${channel}_gateway`,
  };
}

export type Party360TimelineItemKind =
  | 'document'
  | 'commercial_doc'
  | 'payment'
  | 'pos_sale'
  | 'appointment'
  | 'checkin'
  | 'note'
  | 'task'
  | 'communication';

export interface Party360TimelineItem {
  id: string;
  kind: Party360TimelineItemKind;
  date: string;
  vertical?: string;
  title: string;
  subtitle?: string;
  amountDzd?: number;
  status?: string;
}

export interface Party360Summary {
  party: CrmParty;
  links: CrmPartyLink[];
  linkedVerticals: string[];
  totalBilledDzd: number;
  totalPaidDzd: number;
  openBalanceDzd: number;
  openTasksCount: number;
  failedCommsCount: number;
  timeline: Party360TimelineItem[];
}

export function buildParty360Summary(params: {
  party: CrmParty;
  links: CrmPartyLink[];
  unifiedDocuments?: UnifiedDocument[];
  unifiedPayments?: UnifiedPayment[];
  commercialDocs?: CommercialDocument[];
  sales?: Sale[];
  appointments?: Appointment[];
  checkIns?: MemberCheckInLog[];
  notes?: CrmPartyNote[];
  tasks?: CrmFollowUpTask[];
  communications?: CrmCommunicationLog[];
}): Party360Summary {
  const { party } = params;
  const partyLinks = (params.links || []).filter((l) => l.partyId === party.id && !l.deletedAt);
  const linkedEntityIds = new Set(partyLinks.map((l) => l.entityId));
  const partyNameLower = party.displayName.trim().toLowerCase();

  const matchesEntity = (id?: string | null, name?: string | null, partyId?: string | null) => {
    if (partyId && partyId === party.id) return true;
    if (id && linkedEntityIds.has(id)) return true;
    if (name && partyNameLower && name.trim().toLowerCase() === partyNameLower) return true;
    return false;
  };

  const timeline: Party360TimelineItem[] = [];
  let totalBilledCentimes = 0;
  let totalPaidCentimes = 0;
  let openBalanceCentimes = 0;

  for (const doc of params.unifiedDocuments || []) {
    if (!matchesEntity(doc.partyId, doc.partyName, doc.partyId)) continue;
    const isCredit = doc.docType === 'avoir' || doc.docType === 'retour';
    if (doc.status !== 'Draft' && doc.status !== 'Canceled' && doc.status !== 'Voided') {
      totalBilledCentimes += isCredit ? -doc.netToPayCentimes : doc.netToPayCentimes;
      openBalanceCentimes += isCredit ? 0 : doc.balanceDueCentimes;
    }
    timeline.push({
      id: `doc_${doc.id}`,
      kind: 'document',
      date: doc.docDate || doc.createdAt,
      vertical: doc.sourceVertical,
      title: `${doc.docNumber || doc.draftNumber} (${doc.docType})`,
      subtitle: doc.partyName,
      amountDzd: Math.round(doc.netToPayCentimes / 100),
      status: doc.status,
    });
  }

  for (const pay of params.unifiedPayments || []) {
    if (!matchesEntity(pay.partyId, pay.partyName, pay.partyId)) continue;
    if (pay.status !== 'bounced' && pay.status !== 'reversed') {
      totalPaidCentimes += pay.amountCentimes;
    }
    timeline.push({
      id: `pay_${pay.id}`,
      kind: 'payment',
      date: pay.paymentDate || pay.createdAt,
      vertical: pay.sourceVertical,
      title: `${pay.paymentNumber || 'REG'} · ${pay.method}`,
      subtitle: pay.instrumentNumber || pay.notes || pay.partyName,
      amountDzd: Math.round(pay.amountCentimes / 100),
      status: pay.status,
    });
  }

  for (const cdoc of params.commercialDocs || []) {
    if (!matchesEntity(cdoc.clientId, cdoc.clientName)) continue;
    timeline.push({
      id: `cdoc_${cdoc.id}`,
      kind: 'commercial_doc',
      date: cdoc.date || cdoc.createdAt,
      vertical: 'trading_commercial',
      title: `${cdoc.docNumber} (${cdoc.type})`,
      subtitle: cdoc.clientName,
      amountDzd: cdoc.totalTtc,
      status: cdoc.status,
    });
  }

  for (const sale of params.sales || []) {
    if (!matchesEntity(sale.memberId, sale.memberName)) continue;
    const saleCentimes = Math.round((sale.totalAmount || 0) * 100);
    if (sale.status !== 'Voided' && sale.status !== 'Refunded') {
      totalBilledCentimes += saleCentimes;
      totalPaidCentimes += saleCentimes;
    }
    timeline.push({
      id: `sale_${sale.id}`,
      kind: 'pos_sale',
      date: sale.createdAt,
      vertical: 'pos_inventory',
      title: `POS ${sale.id.slice(0, 8)}`,
      subtitle: sale.paymentMethod,
      amountDzd: sale.totalAmount || 0,
      status: sale.status,
    });
  }

  for (const appt of params.appointments || []) {
    if (!matchesEntity(appt.clientId, appt.clientName)) continue;
    timeline.push({
      id: `appt_${appt.id}`,
      kind: 'appointment',
      date: appt.startTime || appt.createdAt,
      vertical: 'appointment_service',
      title: appt.serviceName || 'Rendez-vous',
      subtitle: appt.staffName,
      amountDzd: appt.price,
      status: appt.status,
    });
  }

  for (const chk of params.checkIns || []) {
    if (!matchesEntity(chk.memberId, chk.memberName)) continue;
    timeline.push({
      id: `chk_${chk.id}`,
      kind: 'checkin',
      date: chk.timestamp,
      vertical: 'membership_session',
      title: `Check-in ${chk.checkInMethod}`,
      subtitle: chk.planName || chk.overrideReason,
      status: chk.accessStatus,
    });
  }

  for (const note of params.notes || []) {
    if (note.partyId !== party.id || note.deletedAt) continue;
    timeline.push({
      id: `note_${note.id}`,
      kind: 'note',
      date: note.createdAt,
      vertical: note.sourceVertical,
      title: `${note.noteType.toUpperCase()} · ${note.authorName || 'Staff'}`,
      subtitle: note.body,
    });
  }

  const partyTasks = (params.tasks || []).filter((t) => t.partyId === party.id && !t.deletedAt);
  for (const task of partyTasks) {
    timeline.push({
      id: `task_${task.id}`,
      kind: 'task',
      date: task.dueAt,
      title: task.title,
      subtitle: `${task.channel} · ${task.assignedStaffName || ''}`.trim(),
      status: task.status,
    });
  }

  const partyComms = (params.communications || []).filter((c) => c.partyId === party.id);
  for (const comm of partyComms) {
    timeline.push({
      id: `comm_${comm.id}`,
      kind: 'communication',
      date: comm.lastAttemptAt || comm.createdAt,
      title: `${comm.channel.toUpperCase()} · ${comm.recipientAddress || '—'}`,
      subtitle: comm.errorMessage || comm.renderedBody.slice(0, 80),
      status: comm.status,
    });
  }

  timeline.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  return {
    party,
    links: partyLinks,
    linkedVerticals: Array.from(new Set(partyLinks.map((l) => l.sourceVertical))),
    totalBilledDzd: Math.round(totalBilledCentimes / 100),
    totalPaidDzd: Math.round(totalPaidCentimes / 100),
    openBalanceDzd: Math.round(openBalanceCentimes / 100),
    openTasksCount: partyTasks.filter((t) => t.status === 'open').length,
    failedCommsCount: partyComms.filter((c) => c.status === 'failed').length,
    timeline,
  };
}
