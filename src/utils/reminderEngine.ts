import type {
  AgriDairyCow,
  Appointment,
  CPCADeadline,
  CommercialDocument,
  CrmMessageTemplate,
  CrmParty,
  CrmPartyLink,
  EduEnrollment,
  GarageVehicle,
  Member,
  Product,
  RealEstateLease,
  RealEstateMandate,
  ReminderChannel,
  ReminderDeliveryLog,
  ReminderEventType,
  ReminderQuietHoursConfig,
  ReminderRule,
  RentalBooking,
  UnifiedDocument,
  UnifiedPayment,
} from '../types/index';
import { renderCrmTemplate } from './crmPartyEngine';

export interface ReminderEventCatalogMeta {
  eventType: ReminderEventType;
  labelEn: string;
  labelFr: string;
  labelAr: string;
  defaultLeadDays: number;
  defaultChannels: ReminderChannel[];
  defaultTemplateCode?: string;
  targetScreen?: string;
}

export const REMINDER_EVENT_CATALOG: ReminderEventCatalogMeta[] = [
  {
    eventType: 'membership_expiring',
    labelEn: 'Membership Expiring',
    labelFr: 'Abonnement expirant',
    labelAr: 'انتهاء صلاحية الاشتراك',
    defaultLeadDays: 7,
    defaultChannels: ['in_app', 'whatsapp'],
    defaultTemplateCode: 'RENEWAL_NOTICE',
    targetScreen: 'members',
  },
  {
    eventType: 'invoice_overdue',
    labelEn: 'Invoice Overdue',
    labelFr: 'Facture échue / impayée',
    labelAr: 'فاتورة متأخرة عن السداد',
    defaultLeadDays: 0,
    defaultChannels: ['in_app', 'whatsapp', 'email'],
    defaultTemplateCode: 'PAYMENT_FOLLOWUP',
    targetScreen: 'finance',
  },
  {
    eventType: 'installment_due',
    labelEn: 'Installment Due',
    labelFr: 'Échéance / tranche due',
    labelAr: 'قسط مستحق الدفع',
    defaultLeadDays: 3,
    defaultChannels: ['in_app', 'sms'],
    defaultTemplateCode: 'PAYMENT_FOLLOWUP',
    targetScreen: 'finance',
  },
  {
    eventType: 'rent_due',
    labelEn: 'Rent / Booking Due',
    labelFr: 'Loyer / échéance location',
    labelAr: 'إيجار مستحق',
    defaultLeadDays: 5,
    defaultChannels: ['in_app', 'whatsapp'],
    defaultTemplateCode: 'PAYMENT_FOLLOWUP',
    targetScreen: 'dashboard',
  },
  {
    eventType: 'appointment_tomorrow',
    labelEn: 'Appointment Tomorrow',
    labelFr: 'Rendez-vous demain (J-1)',
    labelAr: 'موعد غداً',
    defaultLeadDays: 1,
    defaultChannels: ['in_app', 'whatsapp'],
    defaultTemplateCode: 'APPT_REMINDER',
    targetScreen: 'appointments',
  },
  {
    eventType: 'low_stock',
    labelEn: 'Low Stock Alert',
    labelFr: 'Stock bas / seuil alerte',
    labelAr: 'تنبيه انخفاض المخزون',
    defaultLeadDays: 0,
    defaultChannels: ['in_app'],
    targetScreen: 'shop',
  },
  {
    eventType: 'expiry_date',
    labelEn: 'Product / Batch Expiry',
    labelFr: 'Péremption lot / produit',
    labelAr: 'قرب انتهاء الصلاحية',
    defaultLeadDays: 15,
    defaultChannels: ['in_app'],
    targetScreen: 'shop',
  },
  {
    eventType: 'service_due',
    labelEn: 'Garage Service / Maintenance Due',
    labelFr: 'Révision / entretien garage dû',
    labelAr: 'موعد صيانة المركبة',
    defaultLeadDays: 7,
    defaultChannels: ['in_app', 'sms'],
    targetScreen: 'dashboard',
  },
  {
    eventType: 'dar_lockout',
    labelEn: 'Dairy DAR Lockout Window',
    labelFr: 'Blocage sanitaire lait (DAR)',
    labelAr: 'حظر الحلب الصحي',
    defaultLeadDays: 2,
    defaultChannels: ['in_app'],
    targetScreen: 'dashboard',
  },
  {
    eventType: 'cheque_due',
    labelEn: 'Cheque / Traite Maturity Due',
    labelFr: 'Échéance chèque / traite',
    labelAr: 'استحقاق شيك أو كمبيالة',
    defaultLeadDays: 2,
    defaultChannels: ['in_app', 'email'],
    targetScreen: 'finance',
  },
  {
    eventType: 'deadline_cpca',
    labelEn: 'Legal CPCA Procedural Deadline',
    labelFr: 'Délai impératif CPCA',
    labelAr: 'أجل قانوني (قانون الإجراءات)',
    defaultLeadDays: 5,
    defaultChannels: ['in_app', 'email'],
    targetScreen: 'dashboard',
  },
  {
    eventType: 'contract_expiry',
    labelEn: 'Contract / Mandate Expiry',
    labelFr: 'Échéance contrat / mandat',
    labelAr: 'انتهاء صلاحية العقد / التفويض',
    defaultLeadDays: 15,
    defaultChannels: ['in_app', 'email'],
    targetScreen: 'dashboard',
  },
  {
    eventType: 'vehicle_documents_expiry',
    labelEn: 'Vehicle Documents Expiry (Insurance / CT)',
    labelFr: 'Documents véhicule (Assurance / CT)',
    labelAr: 'انتهاء وثائق المركبة (تأمين / مراقبة)',
    defaultLeadDays: 15,
    defaultChannels: ['in_app', 'sms'],
    targetScreen: 'dashboard',
  },
];

export function getDefaultReminderQuietHours(
  accountId: string,
  businessId: string,
  nowIso = new Date().toISOString()
): ReminderQuietHoursConfig {
  return {
    id: `qh_${businessId}`,
    accountId,
    businessId,
    enabled: true,
    startTime: '21:00',
    endTime: '08:00',
    timezone: 'Africa/Algiers',
    allowInAppDuringQuiet: true,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function getDefaultReminderRules(
  accountId: string,
  businessId: string,
  branchId?: string,
  templates: CrmMessageTemplate[] = [],
  nowIso = new Date().toISOString()
): ReminderRule[] {
  return REMINDER_EVENT_CATALOG.map((meta) => {
    const matchedTemplate = meta.defaultTemplateCode
      ? templates.find((t) => t.code === meta.defaultTemplateCode && !t.deletedAt)
      : undefined;
    return {
      id: `remrule_${businessId}_${meta.eventType}`,
      accountId,
      businessId,
      branchId,
      eventType: meta.eventType,
      name: meta.labelFr,
      isEnabled: true,
      leadDays: meta.defaultLeadDays,
      channels: [...meta.defaultChannels],
      templateId: matchedTemplate?.id,
      respectQuietHours: true,
      cooldownHours: 24,
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}

function parseHHmmMinutes(hhmm: string): number {
  const [hStr, mStr] = (hhmm || '00:00').split(':');
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return h * 60 + m;
}

/**
 * Returns local wall-clock parts in the configured timezone (default Africa/Algiers = UTC+1).
 */
export function getLocalTimePartsInZone(iso: string, timeZone = 'Africa/Algiers'): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
  dateStr: string;
} {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return getLocalTimePartsInZone(now.toISOString(), timeZone);
  }
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'Africa/Algiers',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour') === 24 ? 0 : get('hour');
    const minute = get('minute');
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      year,
      month,
      day,
      hour,
      minute,
      minutesSinceMidnight: hour * 60 + minute,
      dateStr: `${year}-${pad(month)}-${pad(day)}`,
    };
  } catch {
    // UTC+1 Algeria fallback
    const utcPlus1 = new Date(d.getTime() + 60 * 60_000);
    const year = utcPlus1.getUTCFullYear();
    const month = utcPlus1.getUTCMonth() + 1;
    const day = utcPlus1.getUTCDate();
    const hour = utcPlus1.getUTCHours();
    const minute = utcPlus1.getUTCMinutes();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      year,
      month,
      day,
      hour,
      minute,
      minutesSinceMidnight: hour * 60 + minute,
      dateStr: `${year}-${pad(month)}-${pad(day)}`,
    };
  }
}

export function isWithinQuietHours(
  nowIso: string,
  config?: Pick<ReminderQuietHoursConfig, 'enabled' | 'startTime' | 'endTime' | 'timezone'> | null
): boolean {
  if (!config || !config.enabled) return false;
  const startMin = parseHHmmMinutes(config.startTime);
  const endMin = parseHHmmMinutes(config.endTime);
  if (startMin === endMin) return false;

  const { minutesSinceMidnight } = getLocalTimePartsInZone(nowIso, config.timezone || 'Africa/Algiers');
  if (startMin > endMin) {
    // Overnight window e.g. 21:00 -> 08:00
    return minutesSinceMidnight >= startMin || minutesSinceMidnight < endMin;
  }
  return minutesSinceMidnight >= startMin && minutesSinceMidnight < endMin;
}

export function computeNextAllowedSendIso(
  nowIso: string,
  config?: Pick<ReminderQuietHoursConfig, 'enabled' | 'startTime' | 'endTime' | 'timezone'> | null
): string {
  if (!isWithinQuietHours(nowIso, config) || !config) {
    return nowIso;
  }
  const startMin = parseHHmmMinutes(config.startTime);
  const endMin = parseHHmmMinutes(config.endTime);
  const parts = getLocalTimePartsInZone(nowIso, config.timezone || 'Africa/Algiers');
  const curMin = parts.minutesSinceMidnight;

  let deltaMinutes = endMin - curMin;
  if (startMin > endMin && curMin >= startMin) {
    // Tonight before midnight -> tomorrow's endTime
    deltaMinutes = 24 * 60 - curMin + endMin;
  } else if (deltaMinutes <= 0) {
    deltaMinutes += 24 * 60;
  }

  const baseMs = new Date(nowIso).getTime();
  return new Date(baseMs + deltaMinutes * 60_000).toISOString();
}

export function buildReminderIdempotencyKey(params: {
  ruleId: string;
  eventType: ReminderEventType;
  entityId: string;
  targetDate: string;
  channel: ReminderChannel;
}): string {
  const cleanDate = (params.targetDate || '').slice(0, 10) || 'today';
  return `${params.ruleId}:${params.eventType}:${params.entityId}:${cleanDate}:${params.channel}`;
}

export interface ReminderVehicleDocumentInput {
  id: string;
  plate: string;
  label?: string;
  insuranceExpiry?: string;
  technicalControlExpiry?: string;
  vignetteExpiry?: string;
  nextServiceDate?: string;
  currentOdometer?: number;
  nextServiceOdometer?: number;
  ownerName?: string;
  ownerPhone?: string;
}

export interface ReminderContractInput {
  id: string;
  title: string;
  counterpartyName?: string;
  counterpartyPhone?: string;
  endDate: string;
  status?: string;
}

export interface ReminderScanInput {
  businessId: string;
  branchId?: string;
  members?: Member[];
  unifiedDocuments?: UnifiedDocument[];
  unifiedPayments?: UnifiedPayment[];
  commercialDocs?: CommercialDocument[];
  eduEnrollments?: EduEnrollment[];
  rentalBookings?: RentalBooking[];
  appointments?: Appointment[];
  products?: Product[];
  garageVehicles?: Array<
    GarageVehicle & {
      nextServiceDate?: string;
      nextServiceOdometer?: number;
      insuranceExpiry?: string;
      technicalControlExpiry?: string;
    }
  >;
  fleetVehicles?: ReminderVehicleDocumentInput[];
  dairyCows?: AgriDairyCow[];
  cpcaDeadlines?: CPCADeadline[];
  leases?: RealEstateLease[];
  mandates?: RealEstateMandate[];
  contracts?: ReminderContractInput[];
}

export interface ReminderCandidate {
  eventType: ReminderEventType;
  entityType: string;
  entityId: string;
  entityLabel: string;
  targetDate: string;
  dueAmountDzd?: number;
  partyLookupId?: string;
  partyLookupType?: CrmPartyLink['entityType'];
  partyDisplayName?: string;
  partyPhone?: string;
  variables: Record<string, string>;
  titleFr: string;
  titleEn: string;
  titleAr: string;
  messageFr: string;
  messageEn: string;
  messageAr: string;
  targetScreen?: string;
}

function diffDaysIso(targetDateStr: string, referenceDayStr: string): number | null {
  const t = Date.parse(`${targetDateStr.slice(0, 10)}T00:00:00Z`);
  const r = Date.parse(`${referenceDayStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(r)) return null;
  return Math.round((t - r) / 86_400_000);
}

/**
 * Pure scanner across all 13 event sources in Atrium.
 * Evaluates due windows based on each rule's `leadDays`.
 */
export function scanStateForReminderCandidates(
  input: ReminderScanInput,
  rules: ReminderRule[],
  nowIso = new Date().toISOString()
): ReminderCandidate[] {
  const todayStr = nowIso.slice(0, 10);
  const rulesByEvent = new Map<ReminderEventType, ReminderRule>();
  for (const r of rules) {
    if (!r.deletedAt) rulesByEvent.set(r.eventType, r);
  }
  const getLead = (ev: ReminderEventType): number => {
    const r = rulesByEvent.get(ev);
    if (r) return r.leadDays;
    return REMINDER_EVENT_CATALOG.find((c) => c.eventType === ev)?.defaultLeadDays ?? 3;
  };

  const candidates: ReminderCandidate[] = [];

  // 1. membership_expiring
  const memLead = getLead('membership_expiring');
  for (const m of input.members || []) {
    if (!m.expirationDate || m.status === 'Suspended' || m.status === 'Banned') continue;
    const daysLeft = diffDaysIso(m.expirationDate, todayStr);
    if (daysLeft === null || daysLeft < -1 || daysLeft > memLead) continue;
    candidates.push({
      eventType: 'membership_expiring',
      entityType: 'member',
      entityId: m.id,
      entityLabel: m.fullName,
      targetDate: m.expirationDate.slice(0, 10),
      partyLookupId: m.id,
      partyLookupType: 'member',
      partyDisplayName: m.fullName,
      partyPhone: m.phoneNumber,
      variables: {
        name: m.fullName,
        due_date: m.expirationDate.slice(0, 10),
      },
      titleFr: `Abonnement expirant · ${m.fullName}`,
      titleEn: `Membership expiring · ${m.fullName}`,
      titleAr: `قرب انتهاء اشتراك · ${m.fullName}`,
      messageFr: `L'abonnement de ${m.fullName} expire le ${m.expirationDate.slice(0, 10)} (J-${Math.max(0, daysLeft)}).`,
      messageEn: `${m.fullName}'s membership expires on ${m.expirationDate.slice(0, 10)} (${Math.max(0, daysLeft)}d left).`,
      messageAr: `ينتهي اشتراك ${m.fullName} بتاريخ ${m.expirationDate.slice(0, 10)}.`,
      targetScreen: 'members',
    });
  }

  // 2. invoice_overdue
  const invLead = getLead('invoice_overdue');
  for (const doc of input.unifiedDocuments || []) {
    if (
      doc.status === 'Draft' ||
      doc.status === 'Paid' ||
      doc.status === 'Canceled' ||
      doc.status === 'Voided' ||
      doc.balanceDueCentimes <= 0
    ) {
      continue;
    }
    const dueStr = (doc.dueDate || doc.docDate || '').slice(0, 10);
    if (!dueStr) continue;
    const daysUntilDue = diffDaysIso(dueStr, todayStr);
    if (daysUntilDue === null || daysUntilDue > invLead) continue;
    const amountDzd = Math.round(doc.balanceDueCentimes / 100);
    candidates.push({
      eventType: 'invoice_overdue',
      entityType: 'unified_document',
      entityId: doc.id,
      entityLabel: doc.docNumber || doc.draftNumber,
      targetDate: dueStr,
      dueAmountDzd: amountDzd,
      partyLookupId: doc.partyId,
      partyDisplayName: doc.partyName,
      variables: {
        name: doc.partyName,
        doc_number: doc.docNumber || doc.draftNumber,
        amount: `${amountDzd.toLocaleString('en-US')} DZD`,
        due_date: dueStr,
      },
      titleFr: `Facture échue · ${doc.docNumber || doc.draftNumber}`,
      titleEn: `Invoice overdue · ${doc.docNumber || doc.draftNumber}`,
      titleAr: `فاتورة مستحقة · ${doc.docNumber || doc.draftNumber}`,
      messageFr: `${doc.partyName} — reste dû ${amountDzd.toLocaleString('en-US')} DZD (échéance ${dueStr}).`,
      messageEn: `${doc.partyName} — balance due ${amountDzd.toLocaleString('en-US')} DZD (due ${dueStr}).`,
      messageAr: `${doc.partyName} — المبلغ المتبقي ${amountDzd.toLocaleString('en-US')} دج (تاريخ الاستحقاق ${dueStr}).`,
      targetScreen: 'finance',
    });
  }

  // 3. installment_due (CommercialDocument due dates / installments + EduEnrollment tuition installments)
  const instLead = getLead('installment_due');
  for (const cdoc of input.commercialDocs || []) {
    const legacyInstallments = (cdoc as unknown as {
      installments?: Array<{ id: string; dueDate?: string; amount: number; status?: string }>;
    }).installments;
    if (Array.isArray(legacyInstallments) && legacyInstallments.length > 0) {
      for (const inst of legacyInstallments) {
        if (inst.status === 'Paid' || !inst.dueDate) continue;
        const daysUntilDue = diffDaysIso(inst.dueDate, todayStr);
        if (daysUntilDue === null || daysUntilDue < -30 || daysUntilDue > instLead) continue;
        candidates.push({
          eventType: 'installment_due',
          entityType: 'installment',
          entityId: `${cdoc.id}_${inst.id}`,
          entityLabel: `${cdoc.docNumber} #${inst.id}`,
          targetDate: inst.dueDate.slice(0, 10),
          dueAmountDzd: inst.amount,
          partyLookupId: cdoc.clientId,
          partyLookupType: 'b2b_client',
          partyDisplayName: cdoc.clientName,
          variables: {
            name: cdoc.clientName,
            doc_number: cdoc.docNumber,
            amount: `${Math.round(inst.amount).toLocaleString('en-US')} DZD`,
            due_date: inst.dueDate.slice(0, 10),
          },
          titleFr: `Échéance due · ${cdoc.docNumber}`,
          titleEn: `Installment due · ${cdoc.docNumber}`,
          titleAr: `قسط مستحق · ${cdoc.docNumber}`,
          messageFr: `Tranche de ${Math.round(inst.amount).toLocaleString('en-US')} DZD due le ${inst.dueDate.slice(0, 10)} (${cdoc.clientName}).`,
          messageEn: `Installment of ${Math.round(inst.amount).toLocaleString('en-US')} DZD due on ${inst.dueDate.slice(0, 10)} (${cdoc.clientName}).`,
          messageAr: `قسط بقيمة ${Math.round(inst.amount).toLocaleString('en-US')} دج مستحق بتاريخ ${inst.dueDate.slice(0, 10)}.`,
          targetScreen: 'finance',
        });
      }
    } else if (
      cdoc.status !== 'Paid' &&
      cdoc.status !== 'Canceled' &&
      cdoc.dueDate &&
      cdoc.netToPay > 0
    ) {
      const daysUntilDue = diffDaysIso(cdoc.dueDate, todayStr);
      if (daysUntilDue !== null && daysUntilDue >= -30 && daysUntilDue <= instLead) {
        candidates.push({
          eventType: 'installment_due',
          entityType: 'commercial_document',
          entityId: cdoc.id,
          entityLabel: cdoc.docNumber,
          targetDate: cdoc.dueDate.slice(0, 10),
          dueAmountDzd: cdoc.netToPay,
          partyLookupId: cdoc.clientId,
          partyLookupType: 'b2b_client',
          partyDisplayName: cdoc.clientName,
          variables: {
            name: cdoc.clientName,
            doc_number: cdoc.docNumber,
            amount: `${Math.round(cdoc.netToPay).toLocaleString('en-US')} ${cdoc.currency || 'DZD'}`,
            due_date: cdoc.dueDate.slice(0, 10),
          },
          titleFr: `Échéance due · ${cdoc.docNumber}`,
          titleEn: `Installment due · ${cdoc.docNumber}`,
          titleAr: `قسط مستحق · ${cdoc.docNumber}`,
          messageFr: `Échéance de ${Math.round(cdoc.netToPay).toLocaleString('en-US')} ${cdoc.currency || 'DZD'} due le ${cdoc.dueDate.slice(0, 10)} (${cdoc.clientName}).`,
          messageEn: `Installment of ${Math.round(cdoc.netToPay).toLocaleString('en-US')} ${cdoc.currency || 'DZD'} due on ${cdoc.dueDate.slice(0, 10)} (${cdoc.clientName}).`,
          messageAr: `قسط بقيمة ${Math.round(cdoc.netToPay).toLocaleString('en-US')} ${cdoc.currency || 'DZD'} مستحق بتاريخ ${cdoc.dueDate.slice(0, 10)}.`,
          targetScreen: 'finance',
        });
      }
    }
  }
  for (const enr of input.eduEnrollments || []) {
    if (enr.balanceDue <= 0 && !(enr.installments && enr.installments.some((i) => !i.isPaid))) {
      continue;
    }
    const unpaidInstallments = (enr.installments || []).filter((i) => !i.isPaid && i.dueDate && i.amount > 0);
    for (let idx = 0; idx < unpaidInstallments.length; idx++) {
      const inst = unpaidInstallments[idx];
      const daysUntilDue = diffDaysIso(inst.dueDate, todayStr);
      if (daysUntilDue === null || daysUntilDue < -30 || daysUntilDue > instLead) continue;
      candidates.push({
        eventType: 'installment_due',
        entityType: 'edu_enrollment',
        entityId: `${enr.id}_inst_${idx}`,
        entityLabel: enr.studentName || enr.id,
        targetDate: inst.dueDate.slice(0, 10),
        dueAmountDzd: inst.amount,
        partyLookupId: enr.studentId,
        partyLookupType: 'student',
        partyDisplayName: enr.studentName,
        variables: {
          name: enr.studentName || 'Étudiant',
          doc_number: enr.cohortName || enr.id,
          amount: `${Math.round(inst.amount).toLocaleString('en-US')} DZD`,
          due_date: inst.dueDate.slice(0, 10),
        },
        titleFr: `Tranche formation due · ${enr.studentName}`,
        titleEn: `Tuition installment due · ${enr.studentName}`,
        titleAr: `قسط دراسي مستحق · ${enr.studentName}`,
        messageFr: `Tranche de scolarité ${Math.round(inst.amount).toLocaleString('en-US')} DZD due le ${inst.dueDate.slice(0, 10)}.`,
        messageEn: `Tuition installment ${Math.round(inst.amount).toLocaleString('en-US')} DZD due on ${inst.dueDate.slice(0, 10)}.`,
        messageAr: `القسط الدراسي ${Math.round(inst.amount).toLocaleString('en-US')} دج مستحق بتاريخ ${inst.dueDate.slice(0, 10)}.`,
        targetScreen: 'dashboard',
      });
    }
  }

  // 4. rent_due (RealEstateLease + RentalBooking)
  const rentLead = getLead('rent_due');
  for (const lease of input.leases || []) {
    if (lease.status !== 'Active') continue;
    const baseDue = lease.lastPaymentDate
      ? (() => {
          const d = new Date(lease.lastPaymentDate);
          d.setUTCMonth(d.getUTCMonth() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : todayStr;
    const daysLeft = diffDaysIso(baseDue, todayStr);
    if (daysLeft === null || daysLeft > rentLead) continue;
    candidates.push({
      eventType: 'rent_due',
      entityType: 're_lease',
      entityId: lease.id,
      entityLabel: lease.propertyTitle,
      targetDate: baseDue,
      dueAmountDzd: lease.monthlyRentDzd,
      partyDisplayName: lease.tenantName,
      partyPhone: lease.tenantPhone,
      variables: {
        name: lease.tenantName,
        doc_number: lease.leaseNumber || lease.propertyTitle,
        amount: `${Math.round(lease.monthlyRentDzd).toLocaleString('en-US')} DZD`,
        due_date: baseDue,
      },
      titleFr: `Loyer dû · ${lease.propertyTitle}`,
      titleEn: `Rent due · ${lease.propertyTitle}`,
      titleAr: `إيجار مستحق · ${lease.propertyTitle}`,
      messageFr: `Loyer de ${Math.round(lease.monthlyRentDzd).toLocaleString('en-US')} DZD pour ${lease.tenantName} (${baseDue}).`,
      messageEn: `Rent of ${Math.round(lease.monthlyRentDzd).toLocaleString('en-US')} DZD for ${lease.tenantName} (${baseDue}).`,
      messageAr: `إيجار بقيمة ${Math.round(lease.monthlyRentDzd).toLocaleString('en-US')} دج المستأجر ${lease.tenantName}.`,
      targetScreen: 'dashboard',
    });
  }
  for (const bk of input.rentalBookings || []) {
    const rawStatus = String(bk.status);
    if (rawStatus === 'Cancelled' || rawStatus === 'Completed' || rawStatus === 'CheckedOut' || bk.balanceDue <= 0) {
      continue;
    }
    const dueStr = (bk.startDateTime || '').slice(0, 10);
    if (!dueStr) continue;
    const daysLeft = diffDaysIso(dueStr, todayStr);
    if (daysLeft === null || daysLeft > rentLead) continue;
    candidates.push({
      eventType: 'rent_due',
      entityType: 'rental_booking',
      entityId: bk.id,
      entityLabel: bk.unitName || bk.id,
      targetDate: dueStr,
      dueAmountDzd: bk.balanceDue,
      partyLookupId: bk.renterId,
      partyLookupType: 'renter',
      partyDisplayName: bk.renterName,
      partyPhone: bk.renterPhone,
      variables: {
        name: bk.renterName,
        doc_number: bk.unitName || bk.id,
        amount: `${Math.round(bk.balanceDue).toLocaleString('en-US')} ${bk.currency || 'DZD'}`,
        due_date: dueStr,
      },
      titleFr: `Solde location dû · ${bk.renterName}`,
      titleEn: `Booking balance due · ${bk.renterName}`,
      titleAr: `مستحقات الحجز · ${bk.renterName}`,
      messageFr: `Solde location ${Math.round(bk.balanceDue).toLocaleString('en-US')} ${bk.currency || 'DZD'} pour ${bk.unitName || bk.id} (${dueStr}).`,
      messageEn: `Booking balance ${Math.round(bk.balanceDue).toLocaleString('en-US')} ${bk.currency || 'DZD'} for ${bk.unitName || bk.id} (${dueStr}).`,
      messageAr: `الرصيد المستحق للحجز ${Math.round(bk.balanceDue).toLocaleString('en-US')} دج بتاريخ ${dueStr}.`,
      targetScreen: 'dashboard',
    });
  }

  // 5. appointment_tomorrow
  const apptLead = getLead('appointment_tomorrow');
  for (const appt of input.appointments || []) {
    if (appt.status === 'Cancelled' || appt.status === 'Completed' || appt.status === 'NoShow') continue;
    const apptDate = (appt.date || appt.startTime || '').slice(0, 10);
    if (!apptDate) continue;
    const daysUntil = diffDaysIso(apptDate, todayStr);
    if (daysUntil === null || daysUntil < 0 || daysUntil > apptLead) continue;
    candidates.push({
      eventType: 'appointment_tomorrow',
      entityType: 'appointment',
      entityId: appt.id,
      entityLabel: `${appt.clientName} · ${appt.serviceName}`,
      targetDate: apptDate,
      partyLookupId: appt.clientId,
      partyLookupType: 'appointment_client',
      partyDisplayName: appt.clientName,
      partyPhone: appt.clientPhone,
      variables: {
        name: appt.clientName,
        due_date: `${apptDate} ${appt.startTime || ''}`.trim(),
      },
      titleFr: `Rendez-vous proche · ${appt.clientName}`,
      titleEn: `Upcoming appointment · ${appt.clientName}`,
      titleAr: `موعد قادم · ${appt.clientName}`,
      messageFr: `RDV ${appt.serviceName} le ${apptDate} ${appt.startTime || ''} (${appt.clientName}).`,
      messageEn: `Appointment ${appt.serviceName} on ${apptDate} ${appt.startTime || ''} (${appt.clientName}).`,
      messageAr: `موعد ${appt.serviceName} بتاريخ ${apptDate} ${appt.startTime || ''}.`,
      targetScreen: 'appointments',
    });
  }

  // 6. low_stock
  for (const prod of input.products || []) {
    const threshold = prod.reorderLevel ?? 5;
    if (prod.stockQuantity > threshold) continue;
    candidates.push({
      eventType: 'low_stock',
      entityType: 'product',
      entityId: prod.id,
      entityLabel: prod.name,
      targetDate: todayStr,
      variables: {
        name: prod.name,
        amount: String(prod.stockQuantity),
      },
      titleFr: `Stock bas · ${prod.name}`,
      titleEn: `Low stock · ${prod.name}`,
      titleAr: `انخفاض المخزون · ${prod.name}`,
      messageFr: `${prod.name} : stock actuel ${prod.stockQuantity} (seuil alerte ${threshold}).`,
      messageEn: `${prod.name}: current stock ${prod.stockQuantity} (alert threshold ${threshold}).`,
      messageAr: `${prod.name}: المخزون الحالي ${prod.stockQuantity} (حد التنبيه ${threshold}).`,
      targetScreen: 'shop',
    });
  }

  // 7. expiry_date (products / lots carrying expiryDate)
  const expLead = getLead('expiry_date');
  for (const prod of input.products || []) {
    const expStr = (prod as any).expiryDate ? String((prod as any).expiryDate).slice(0, 10) : '';
    if (!expStr) continue;
    const daysLeft = diffDaysIso(expStr, todayStr);
    if (daysLeft === null || daysLeft > expLead) continue;
    candidates.push({
      eventType: 'expiry_date',
      entityType: 'product_lot',
      entityId: prod.id,
      entityLabel: prod.name,
      targetDate: expStr,
      variables: {
        name: prod.name,
        due_date: expStr,
      },
      titleFr: `Péremption proche · ${prod.name}`,
      titleEn: `Expiry approaching · ${prod.name}`,
      titleAr: `قرب انتهاء الصلاحية · ${prod.name}`,
      messageFr: `Produit/Lot ${prod.name} expire le ${expStr}.`,
      messageEn: `Product/Batch ${prod.name} expires on ${expStr}.`,
      messageAr: `تنتهي صلاحية ${prod.name} بتاريخ ${expStr}.`,
      targetScreen: 'shop',
    });
  }

  // 8. service_due (garage)
  const srvLead = getLead('service_due');
  for (const v of input.garageVehicles || []) {
    const nextDate = v.nextServiceDate?.slice(0, 10);
    const dateTriggered =
      nextDate &&
      (() => {
        const d = diffDaysIso(nextDate, todayStr);
        return d !== null && d <= srvLead;
      })();
    const kmTriggered =
      v.nextServiceOdometer !== undefined && v.currentOdometer >= v.nextServiceOdometer - 500;
    if (!dateTriggered && !kmTriggered) continue;
    candidates.push({
      eventType: 'service_due',
      entityType: 'garage_vehicle',
      entityId: v.id,
      entityLabel: `${v.brand} ${v.model} (${v.licensePlate})`,
      targetDate: nextDate || todayStr,
      partyDisplayName: v.ownerName,
      partyPhone: v.ownerPhone,
      variables: {
        name: v.ownerName,
        doc_number: v.licensePlate,
        due_date: nextDate || todayStr,
      },
      titleFr: `Entretien garage dû · ${v.licensePlate}`,
      titleEn: `Vehicle service due · ${v.licensePlate}`,
      titleAr: `صيانة مستحقة · ${v.licensePlate}`,
      messageFr: `${v.brand} ${v.model} (${v.licensePlate}) : révision due (${v.currentOdometer} km).`,
      messageEn: `${v.brand} ${v.model} (${v.licensePlate}): service due (${v.currentOdometer} km).`,
      messageAr: `${v.brand} ${v.model} (${v.licensePlate}): موعد الصيانة (${v.currentOdometer} كم).`,
      targetScreen: 'dashboard',
    });
  }

  // 9. dar_lockout
  const darLead = getLead('dar_lockout');
  for (const cow of input.dairyCows || []) {
    if (!cow.isInWithholdingLockout) continue;
    const until = (cow.withholdingLockoutUntil || todayStr).slice(0, 10);
    const daysLeft = diffDaysIso(until, todayStr);
    if (daysLeft !== null && daysLeft > darLead) continue;
    candidates.push({
      eventType: 'dar_lockout',
      entityType: 'dairy_cow',
      entityId: cow.id,
      entityLabel: `${cow.earTagNumber} · ${cow.nameOrNumber}`,
      targetDate: until,
      variables: {
        name: cow.nameOrNumber,
        doc_number: cow.earTagNumber,
        due_date: until,
      },
      titleFr: `Blocage sanitaire DAR · ${cow.earTagNumber}`,
      titleEn: `DAR withholding lockout · ${cow.earTagNumber}`,
      titleAr: `حظر الحلب الصحي · ${cow.earTagNumber}`,
      messageFr: `Vache ${cow.earTagNumber} en délai d'attente jusqu'au ${until}${cow.withholdingReason ? ` (${cow.withholdingReason})` : ''}.`,
      messageEn: `Cow ${cow.earTagNumber} in withholding lockout until ${until}${cow.withholdingReason ? ` (${cow.withholdingReason})` : ''}.`,
      messageAr: `البقرة ${cow.earTagNumber} في فترة الحظر الصحي حتى ${until}.`,
      targetScreen: 'dashboard',
    });
  }

  // 10. cheque_due
  const chqLead = getLead('cheque_due');
  for (const pay of input.unifiedPayments || []) {
    if (
      (pay.method !== 'cheque' && pay.method !== 'traite') ||
      pay.status !== 'pending_clearance' ||
      !pay.instrumentDueDate
    ) {
      continue;
    }
    const dueStr = pay.instrumentDueDate.slice(0, 10);
    const daysLeft = diffDaysIso(dueStr, todayStr);
    if (daysLeft === null || daysLeft > chqLead) continue;
    const amountDzd = Math.round(pay.amountCentimes / 100);
    candidates.push({
      eventType: 'cheque_due',
      entityType: 'unified_payment',
      entityId: pay.id,
      entityLabel: pay.instrumentNumber || pay.paymentNumber,
      targetDate: dueStr,
      dueAmountDzd: amountDzd,
      partyLookupId: pay.partyId,
      partyDisplayName: pay.partyName,
      variables: {
        name: pay.partyName,
        doc_number: pay.instrumentNumber || pay.paymentNumber,
        amount: `${amountDzd.toLocaleString('en-US')} DZD`,
        due_date: dueStr,
      },
      titleFr: `Échéance chèque/traite · ${pay.instrumentNumber || pay.paymentNumber}`,
      titleEn: `Cheque / Traite due · ${pay.instrumentNumber || pay.paymentNumber}`,
      titleAr: `استحقاق شيك / كمبيالة · ${pay.instrumentNumber || pay.paymentNumber}`,
      messageFr: `${pay.method.toUpperCase()} ${pay.instrumentNumber || ''} de ${amountDzd.toLocaleString('en-US')} DZD à remettre le ${dueStr}.`,
      messageEn: `${pay.method.toUpperCase()} ${pay.instrumentNumber || ''} of ${amountDzd.toLocaleString('en-US')} DZD due on ${dueStr}.`,
      messageAr: `${pay.instrumentNumber || pay.paymentNumber} بمبلغ ${amountDzd.toLocaleString('en-US')} دج مستحق بتاريخ ${dueStr}.`,
      targetScreen: 'finance',
    });
  }

  // 11. deadline_cpca
  const cpcaLead = getLead('deadline_cpca');
  for (const dl of input.cpcaDeadlines || []) {
    if (dl.status === 'filed' || dl.status === 'forfeited' || !dl.terminalExpiryDate) continue;
    const expStr = dl.terminalExpiryDate.slice(0, 10);
    const daysLeft = diffDaysIso(expStr, todayStr);
    if (daysLeft === null || daysLeft > cpcaLead) continue;
    candidates.push({
      eventType: 'deadline_cpca',
      entityType: 'cpca_deadline',
      entityId: dl.id,
      entityLabel: `${dl.caseNumber} (${dl.recourseType})`,
      targetDate: expStr,
      variables: {
        name: dl.caseNumber,
        doc_number: dl.caseNumber,
        due_date: expStr,
      },
      titleFr: `Délai impératif CPCA · ${dl.caseNumber}`,
      titleEn: `CPCA legal deadline · ${dl.caseNumber}`,
      titleAr: `أجل قانوني حاسم · ${dl.caseNumber}`,
      messageFr: `Recours ${dl.recourseType} (${dl.courtJurisdiction}) — forclusion le ${expStr}.`,
      messageEn: `Recourse ${dl.recourseType} (${dl.courtJurisdiction}) — terminal expiry ${expStr}.`,
      messageAr: `أجل الطعن ${dl.recourseType} (${dl.courtJurisdiction}) ينتهي بتاريخ ${expStr}.`,
      targetScreen: 'dashboard',
    });
  }

  // 12. contract_expiry (mandates, leases, contracts)
  const ctrLead = getLead('contract_expiry');
  for (const mnd of input.mandates || []) {
    if (mnd.status === 'Revoked' || mnd.status === 'Executed' || mnd.status === 'Expired') continue;
    const expStr = (mnd.endDate || '').slice(0, 10);
    if (!expStr) continue;
    const daysLeft = diffDaysIso(expStr, todayStr);
    if (daysLeft === null || daysLeft > ctrLead) continue;
    candidates.push({
      eventType: 'contract_expiry',
      entityType: 're_mandate',
      entityId: mnd.id,
      entityLabel: `${mnd.mandateNumber} · ${mnd.propertyTitle}`,
      targetDate: expStr,
      partyDisplayName: mnd.ownerFullName,
      partyPhone: mnd.ownerPhone,
      variables: {
        name: mnd.ownerFullName,
        doc_number: mnd.mandateNumber,
        due_date: expStr,
      },
      titleFr: `Mandat / Contrat expirant · ${mnd.mandateNumber}`,
      titleEn: `Contract / Mandate expiring · ${mnd.mandateNumber}`,
      titleAr: `قرب انتهاء التفويض · ${mnd.mandateNumber}`,
      messageFr: `Mandat ${mnd.mandateNumber} (${mnd.propertyTitle}) expire le ${expStr}.`,
      messageEn: `Mandate ${mnd.mandateNumber} (${mnd.propertyTitle}) expires on ${expStr}.`,
      messageAr: `ينتهي التفويض ${mnd.mandateNumber} (${mnd.propertyTitle}) بتاريخ ${expStr}.`,
      targetScreen: 'dashboard',
    });
  }
  for (const c of input.contracts || []) {
    if (c.status === 'Closed' || c.status === 'Cancelled' || !c.endDate) continue;
    const expStr = c.endDate.slice(0, 10);
    const daysLeft = diffDaysIso(expStr, todayStr);
    if (daysLeft === null || daysLeft > ctrLead) continue;
    candidates.push({
      eventType: 'contract_expiry',
      entityType: 'contract',
      entityId: c.id,
      entityLabel: c.title,
      targetDate: expStr,
      partyDisplayName: c.counterpartyName,
      partyPhone: c.counterpartyPhone,
      variables: {
        name: c.counterpartyName || c.title,
        doc_number: c.title,
        due_date: expStr,
      },
      titleFr: `Contrat arrivant à terme · ${c.title}`,
      titleEn: `Contract expiring · ${c.title}`,
      titleAr: `قرب انتهاء العقد · ${c.title}`,
      messageFr: `Contrat ${c.title} arrive à échéance le ${expStr}.`,
      messageEn: `Contract ${c.title} expires on ${expStr}.`,
      messageAr: `ينتهي العقد ${c.title} بتاريخ ${expStr}.`,
      targetScreen: 'dashboard',
    });
  }

  // 13. vehicle_documents_expiry
  const vehLead = getLead('vehicle_documents_expiry');
  const vehicleDocsSources: ReminderVehicleDocumentInput[] = [
    ...(input.fleetVehicles || []),
    ...(input.garageVehicles || [])
      .filter((gv) => gv.insuranceExpiry || gv.technicalControlExpiry)
      .map((gv) => ({
        id: gv.id,
        plate: gv.licensePlate,
        label: `${gv.brand} ${gv.model}`,
        insuranceExpiry: gv.insuranceExpiry,
        technicalControlExpiry: gv.technicalControlExpiry,
        ownerName: gv.ownerName,
        ownerPhone: gv.ownerPhone,
      })),
  ];
  for (const fv of vehicleDocsSources) {
    const checks: Array<{ kind: string; date?: string }> = [
      { kind: 'insurance', date: fv.insuranceExpiry },
      { kind: 'technical_control', date: fv.technicalControlExpiry },
      { kind: 'vignette', date: fv.vignetteExpiry },
    ];
    for (const chk of checks) {
      if (!chk.date) continue;
      const expStr = chk.date.slice(0, 10);
      const daysLeft = diffDaysIso(expStr, todayStr);
      if (daysLeft === null || daysLeft > vehLead) continue;
      candidates.push({
        eventType: 'vehicle_documents_expiry',
        entityType: `vehicle_${chk.kind}`,
        entityId: `${fv.id}_${chk.kind}`,
        entityLabel: `${fv.plate} (${chk.kind})`,
        targetDate: expStr,
        partyDisplayName: fv.ownerName,
        partyPhone: fv.ownerPhone,
        variables: {
          name: fv.ownerName || fv.plate,
          doc_number: fv.plate,
          due_date: expStr,
        },
        titleFr: `Document véhicule (${chk.kind}) · ${fv.plate}`,
        titleEn: `Vehicle document (${chk.kind}) · ${fv.plate}`,
        titleAr: `وثيقة المركبة · ${fv.plate}`,
        messageFr: `Véhicule ${fv.plate} — ${chk.kind} expire le ${expStr}.`,
        messageEn: `Vehicle ${fv.plate} — ${chk.kind} expires on ${expStr}.`,
        messageAr: `المركبة ${fv.plate} — تنتهي صلاحية الوثيقة بتاريخ ${expStr}.`,
        targetScreen: 'dashboard',
      });
    }
  }

  return candidates;
}

export interface PlannedReminderDispatch {
  candidate: ReminderCandidate;
  rule: ReminderRule;
  channel: ReminderChannel;
  idempotencyKey: string;
  party?: CrmParty | null;
  status: 'sent' | 'deferred_quiet_hours' | 'blocked_opt_out' | 'skipped_duplicate';
  scheduledFor?: string;
  title: string;
  message: string;
  errorCode?: string;
  errorMessage?: string;
}

export function planReminderDispatches(params: {
  candidates: ReminderCandidate[];
  rules: ReminderRule[];
  existingLogs: ReminderDeliveryLog[];
  quietHours?: ReminderQuietHoursConfig | null;
  parties?: CrmParty[];
  partyLinks?: CrmPartyLink[];
  templates?: CrmMessageTemplate[];
  language?: 'en' | 'fr' | 'ar';
  nowIso?: string;
}): PlannedReminderDispatch[] {
  const nowIso = params.nowIso || new Date().toISOString();
  const lang = params.language || 'fr';
  const rulesByEvent = new Map<ReminderEventType, ReminderRule>();
  for (const r of params.rules) {
    if (!r.deletedAt) rulesByEvent.set(r.eventType, r);
  }

  const seenKeys = new Set<string>();
  for (const log of params.existingLogs) {
    if (!log.deletedAt && log.status !== 'failed') {
      seenKeys.add(log.idempotencyKey);
    }
  }

  const partiesById = new Map<string, CrmParty>();
  for (const p of params.parties || []) {
    if (!p.deletedAt) partiesById.set(p.id, p);
  }

  const resolvePartyForCandidate = (c: ReminderCandidate): CrmParty | null => {
    if (c.partyLookupId) {
      if (partiesById.has(c.partyLookupId)) return partiesById.get(c.partyLookupId)!;
      const link = (params.partyLinks || []).find(
        (l) => !l.deletedAt && l.entityId === c.partyLookupId
      );
      if (link && partiesById.has(link.partyId)) return partiesById.get(link.partyId)!;
    }
    if (c.partyDisplayName) {
      const lower = c.partyDisplayName.trim().toLowerCase();
      const found = (params.parties || []).find(
        (p) => !p.deletedAt && p.displayName.trim().toLowerCase() === lower
      );
      if (found) return found;
    }
    return null;
  };

  const quietActive = isWithinQuietHours(nowIso, params.quietHours);
  const nextAllowedIso = quietActive
    ? computeNextAllowedSendIso(nowIso, params.quietHours)
    : undefined;

  const planned: PlannedReminderDispatch[] = [];

  for (const candidate of params.candidates) {
    const rule = rulesByEvent.get(candidate.eventType);
    if (!rule || !rule.isEnabled) continue;

    const party = resolvePartyForCandidate(candidate);
    const partyLang = party?.preferredLanguage || lang;

    const title =
      partyLang === 'ar'
        ? candidate.titleAr
        : partyLang === 'en'
        ? candidate.titleEn
        : candidate.titleFr;

    const tpl = rule.templateId
      ? (params.templates || []).find((t) => t.id === rule.templateId && !t.deletedAt)
      : undefined;

    for (const channel of rule.channels) {
      const idempotencyKey = buildReminderIdempotencyKey({
        ruleId: rule.id,
        eventType: candidate.eventType,
        entityId: candidate.entityId,
        targetDate: candidate.targetDate,
        channel,
      });

      let renderedMsg =
        partyLang === 'ar'
          ? candidate.messageAr
          : partyLang === 'en'
          ? candidate.messageEn
          : candidate.messageFr;

      if (tpl && channel !== 'in_app') {
        const rendered = renderCrmTemplate(tpl, partyLang, {
          ...candidate.variables,
          name: party?.displayName || candidate.partyDisplayName || candidate.entityLabel,
        });
        if (rendered.body.trim()) {
          renderedMsg = rendered.body;
        }
      }

      if (seenKeys.has(idempotencyKey)) {
        // Already dispatched/scheduled for this exact key — never emit twice
        continue;
      }
      seenKeys.add(idempotencyKey);

      // Opt-out check on external channels
      if (channel !== 'in_app' && party) {
        const channelRevoked =
          party.optOutAll ||
          (channel === 'sms' && !party.consentSms) ||
          (channel === 'whatsapp' && !party.consentWhatsapp) ||
          (channel === 'email' && !party.consentEmail);

        if (channelRevoked) {
          planned.push({
            candidate,
            rule,
            channel,
            idempotencyKey,
            party,
            status: 'blocked_opt_out',
            title,
            message: renderedMsg,
            errorCode: party.optOutAll ? 'CRM_OPT_OUT_ALL' : 'CRM_CHANNEL_OPT_OUT',
            errorMessage: party.optOutAll
              ? 'Contact opted out of all outbound communications.'
              : `Contact revoked ${channel.toUpperCase()} consent.`,
          });
          continue;
        }
      }

      // Quiet hours check
      const mustDeferForQuiet =
        quietActive &&
        rule.respectQuietHours &&
        (channel !== 'in_app' || params.quietHours?.allowInAppDuringQuiet === false);

      if (mustDeferForQuiet) {
        planned.push({
          candidate,
          rule,
          channel,
          idempotencyKey,
          party,
          status: 'deferred_quiet_hours',
          scheduledFor: nextAllowedIso,
          title,
          message: renderedMsg,
        });
        continue;
      }

      planned.push({
        candidate,
        rule,
        channel,
        idempotencyKey,
        party,
        status: 'sent',
        title,
        message: renderedMsg,
      });
    }
  }

  return planned;
}
