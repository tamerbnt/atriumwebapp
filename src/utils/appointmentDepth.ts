import { centimesToDzd, dzdToCentimes, subtractCentimes } from './money';
import type {
  Appointment,
  AppointmentStatus,
  Member,
  Product,
  SalonGiftCard,
  SalonHammamSession,
  SalonPrepaidPackage,
  ServiceItem,
  StylistDayHours,
  StylistScheduleConfig,
} from '../types/index';

export const DEFAULT_SALON_CLOSING_TIME = '20:00';
export const DEFAULT_CANCELLATION_CUTOFF_HOURS = 24;
export const DEFAULT_LOYALTY_POINTS_PER_1000_DZD = 10;

const DEFAULT_DAY_HOURS: StylistDayHours = {
  enabled: true,
  startTime: '09:00',
  endTime: '20:00',
  breakStart: '13:00',
  breakEnd: '14:00',
};

export function createDefaultWeeklyHours(): Record<number, StylistDayHours> {
  return {
    0: { ...DEFAULT_DAY_HOURS }, // Sunday (working day in DZ)
    1: { ...DEFAULT_DAY_HOURS },
    2: { ...DEFAULT_DAY_HOURS },
    3: { ...DEFAULT_DAY_HOURS },
    4: { ...DEFAULT_DAY_HOURS },
    5: { enabled: false, startTime: '14:00', endTime: '20:00' }, // Friday off by default
    6: { ...DEFAULT_DAY_HOURS },
  };
}

export function timeStringToMinutes(timeStr: string): number {
  const match = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  const h = Math.max(0, Math.min(23, Number(match[1])));
  const m = Math.max(0, Math.min(59, Number(match[2])));
  return h * 60 + m;
}

export function minutesToTimeString(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function computeAppointmentEndTime(startTime: string, durationMinutes: number): {
  startMinutes: number;
  endMinutes: number;
  endTime: string;
  crossesMidnight: boolean;
} {
  const startMinutes = timeStringToMinutes(startTime || '09:00');
  const duration = Math.max(5, Math.round(Number(durationMinutes) || 30));
  const rawEnd = startMinutes + duration;
  const crossesMidnight = rawEnd >= 24 * 60;
  const endMinutes = Math.min(rawEnd, 23 * 60 + 59);
  return {
    startMinutes,
    endMinutes,
    endTime: minutesToTimeString(endMinutes),
    crossesMidnight,
  };
}

/**
 * Normalizes salon client records (including legacy walk-ins missing clientType/segmentData)
 * so Walk-in filter, VIP badge, allergies, and totalVisits are always well-formed.
 */
export function normalizeSalonMemberRecord(member: Member): Member {
  const seg = member.segmentData && typeof member.segmentData === 'object' ? { ...member.segmentData } : {};
  const sourceLower = String(member.source || '').toLowerCase();
  const planLower = String(member.membershipPlanName || '').toLowerCase();
  const isWalkIn =
    member.clientType === 'walkin' ||
    seg.isWalkIn === true ||
    sourceLower.includes('walk') ||
    planLower.includes('walk-in') ||
    planLower.includes('walkin');
  const isVip = member.clientType === 'vip' || seg.isVip === true || Number(seg.lifetimeSpent || 0) >= 50000;
  const clientType: 'regular' | 'vip' | 'walkin' = isWalkIn ? 'walkin' : isVip ? 'vip' : 'regular';

  return {
    ...member,
    clientType,
    segmentData: {
      hairType: typeof seg.hairType === 'string' && seg.hairType ? seg.hairType : 'Standard',
      allergies: Array.isArray(seg.allergies) ? seg.allergies : [],
      colorFormulas: Array.isArray(seg.colorFormulas) ? seg.colorFormulas : [],
      loyaltyPoints: Number(seg.loyaltyPoints || 0),
      totalVisits: Number(seg.totalVisits || (isWalkIn ? 1 : 0)),
      lifetimeSpent: Number(seg.lifetimeSpent || 0),
      ...seg,
      isWalkIn,
      isVip,
      clientType,
    },
  };
}

export function migrateSalonClientsWalkInVisibility(members: Member[]): Member[] {
  return members.map(normalizeSalonMemberRecord);
}

/**
 * Checks whether a stylist already has a conflicting non-cancelled appointment on the same date.
 */
export function findStylistAppointmentOverlap(params: {
  appointments: Appointment[];
  staffId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
}): Appointment | null {
  if (!params.staffId || !params.date || !params.startTime) return null;
  const startMin = timeStringToMinutes(params.startTime);
  const endMin = startMin + Math.max(5, Math.round(Number(params.durationMinutes) || 30));

  for (const apt of params.appointments) {
    if (params.excludeAppointmentId && apt.id === params.excludeAppointmentId) continue;
    if (apt.status === 'Cancelled' || apt.status === 'NoShow') continue;
    if (apt.staffId !== params.staffId || apt.date !== params.date) continue;

    const aptStart = timeStringToMinutes(apt.startTime);
    const aptEnd = apt.endTime
      ? timeStringToMinutes(apt.endTime)
      : aptStart + Math.max(5, Number(apt.durationMinutes || 30));

    if (startMin < aptEnd && endMin > aptStart) {
      return apt;
    }
  }
  return null;
}

export interface ClosingTimeCheckResult {
  exceedsClosingTime: boolean;
  endTime: string;
  closingTime: string;
  overflowMinutes: number;
}

export function checkClosingTimeSpan(
  startTime: string,
  durationMinutes: number,
  closingTime: string = DEFAULT_SALON_CLOSING_TIME
): ClosingTimeCheckResult {
  const { endMinutes, endTime, crossesMidnight } = computeAppointmentEndTime(startTime, durationMinutes);
  const closingMinutes = timeStringToMinutes(closingTime || DEFAULT_SALON_CLOSING_TIME);
  const effectiveEnd = crossesMidnight ? 24 * 60 : endMinutes;
  const overflowMinutes = Math.max(0, effectiveEnd - closingMinutes);
  return {
    exceedsClosingTime: overflowMinutes > 0,
    endTime,
    closingTime: closingTime || DEFAULT_SALON_CLOSING_TIME,
    overflowMinutes,
  };
}

export type StylistAvailabilityIssue =
  | 'OUTSIDE_WORKING_HOURS'
  | 'DAY_OFF'
  | 'IN_BREAK_WINDOW'
  | 'TIME_OFF'
  | 'EXCEEDS_CLOSING_TIME'
  | 'APPOINTMENT_OVERLAP';

export interface StylistAvailabilityResult {
  available: boolean;
  issues: StylistAvailabilityIssue[];
  overlappingAppointment?: Appointment | null;
  closingCheck: ClosingTimeCheckResult;
  dayHours?: StylistDayHours;
}

export function evaluateStylistAvailability(params: {
  schedule?: StylistScheduleConfig | null;
  appointments: Appointment[];
  staffId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  excludeAppointmentId?: string;
  defaultClosingTime?: string;
}): StylistAvailabilityResult {
  const issues: StylistAvailabilityIssue[] = [];
  const startMin = timeStringToMinutes(params.startTime);
  const duration = Math.max(5, Math.round(Number(params.durationMinutes) || 30));
  const endMin = startMin + duration;

  const scheduleClosing = params.schedule?.salonClosingTime || params.defaultClosingTime || DEFAULT_SALON_CLOSING_TIME;
  const closingCheck = checkClosingTimeSpan(params.startTime, duration, scheduleClosing);

  // Determine day of week in UTC from YYYY-MM-DD
  const parsedDate = new Date(`${params.date.slice(0, 10)}T12:00:00Z`);
  const dow = Number.isNaN(parsedDate.getTime()) ? 1 : parsedDate.getUTCDay();
  const weekly = params.schedule?.weeklyHours || createDefaultWeeklyHours();
  const dayHours = weekly[dow];

  if (params.schedule) {
    // Time-off ranges check
    const targetIso = params.date.slice(0, 10);
    const inTimeOff = (params.schedule.timeOffRanges || []).some(
      (r) => r.startDate <= targetIso && targetIso <= r.endDate
    );
    if (inTimeOff) {
      issues.push('TIME_OFF');
    }

    if (dayHours && !dayHours.enabled) {
      issues.push('DAY_OFF');
    } else if (dayHours && dayHours.enabled) {
      const workStart = timeStringToMinutes(dayHours.startTime);
      const workEnd = timeStringToMinutes(dayHours.endTime);
      if (startMin < workStart || endMin > workEnd) {
        issues.push('OUTSIDE_WORKING_HOURS');
      }
      if (dayHours.breakStart && dayHours.breakEnd) {
        const bStart = timeStringToMinutes(dayHours.breakStart);
        const bEnd = timeStringToMinutes(dayHours.breakEnd);
        if (bEnd > bStart && startMin < bEnd && endMin > bStart) {
          issues.push('IN_BREAK_WINDOW');
        }
      }
    }
  }

  if (closingCheck.exceedsClosingTime) {
    issues.push('EXCEEDS_CLOSING_TIME');
  }

  const overlappingAppointment = findStylistAppointmentOverlap({
    appointments: params.appointments,
    staffId: params.staffId,
    date: params.date,
    startTime: params.startTime,
    durationMinutes: duration,
    excludeAppointmentId: params.excludeAppointmentId,
  });

  if (overlappingAppointment) {
    issues.push('APPOINTMENT_OVERLAP');
  }

  return {
    available: issues.length === 0,
    issues,
    overlappingAppointment,
    closingCheck,
    dayHours,
  };
}

export interface AllergyConflictResult {
  hasConflict: boolean;
  matchedKeywords: string[];
  clientAllergies: string[];
}

export function detectClientAllergyConflicts(
  member: Pick<Member, 'segmentData'> | undefined | null,
  service: Pick<ServiceItem, 'name' | 'category' | 'description' | 'allergyKeywords' | 'consumables'> | undefined | null
): AllergyConflictResult {
  const rawAllergies: string[] = Array.isArray(member?.segmentData?.allergies)
    ? member!.segmentData!.allergies.map((a: unknown) => String(a).trim()).filter(Boolean)
    : [];

  if (rawAllergies.length === 0 || !service) {
    return { hasConflict: false, matchedKeywords: [], clientAllergies: rawAllergies };
  }

  const haystackParts = [
    service.name || '',
    service.category || '',
    service.description || '',
    ...(Array.isArray(service.allergyKeywords) ? service.allergyKeywords : []),
    ...(Array.isArray(service.consumables) ? service.consumables.map((c) => c.productName) : []),
  ];
  const haystack = haystackParts.join(' ').toLowerCase();

  const matchedKeywords: string[] = [];
  for (const allergy of rawAllergies) {
    const normalized = allergy.toLowerCase();
    if (normalized && haystack.includes(normalized)) {
      matchedKeywords.push(allergy);
    } else if (Array.isArray(service.allergyKeywords)) {
      const tokenMatch = service.allergyKeywords.some((kw) => {
        const k = kw.trim().toLowerCase();
        return k && (k.includes(normalized) || normalized.includes(k));
      });
      if (tokenMatch) matchedKeywords.push(allergy);
    }
  }

  return {
    hasConflict: matchedKeywords.length > 0,
    matchedKeywords,
    clientAllergies: rawAllergies,
  };
}

export interface DepositCancellationDecision {
  newStatus: Extract<AppointmentStatus, 'Cancelled' | 'NoShow'>;
  depositStatus: 'none' | 'refunded' | 'forfeited';
  refundedDepositCentimes: number;
  forfeitedDepositCentimes: number;
  hoursBeforeAppointment: number;
  outsideCutoffWindow: boolean;
}

export function evaluateDepositCancellationPolicy(params: {
  appointment: Pick<Appointment, 'date' | 'startTime' | 'depositCentimes' | 'depositStatus' | 'cancellationCutoffHours'>;
  cancelledAtIso?: string;
  newStatus?: Extract<AppointmentStatus, 'Cancelled' | 'NoShow'>;
}): DepositCancellationDecision {
  const newStatus = params.newStatus || 'Cancelled';
  const depositCentimes = Math.max(0, Math.round(Number(params.appointment.depositCentimes || 0)));
  const cutoffHours = Math.max(0, Number(params.appointment.cancellationCutoffHours ?? DEFAULT_CANCELLATION_CUTOFF_HOURS));
  const apptIso = `${params.appointment.date.slice(0, 10)}T${(params.appointment.startTime || '09:00').slice(0, 5)}:00Z`;
  const apptMs = Date.parse(apptIso);
  const cancelMs = Date.parse(params.cancelledAtIso || new Date().toISOString());
  const hoursBefore = Number.isFinite(apptMs) && Number.isFinite(cancelMs)
    ? (apptMs - cancelMs) / 3600000
    : 0;

  const outsideCutoffWindow = hoursBefore >= cutoffHours;

  if (depositCentimes <= 0 || params.appointment.depositStatus !== 'held') {
    return {
      newStatus,
      depositStatus: 'none',
      refundedDepositCentimes: 0,
      forfeitedDepositCentimes: 0,
      hoursBeforeAppointment: hoursBefore,
      outsideCutoffWindow,
    };
  }

  if (newStatus === 'Cancelled' && outsideCutoffWindow) {
    return {
      newStatus,
      depositStatus: 'refunded',
      refundedDepositCentimes: depositCentimes,
      forfeitedDepositCentimes: 0,
      hoursBeforeAppointment: hoursBefore,
      outsideCutoffWindow: true,
    };
  }

  return {
    newStatus,
    depositStatus: 'forfeited',
    refundedDepositCentimes: 0,
    forfeitedDepositCentimes: depositCentimes,
    hoursBeforeAppointment: hoursBefore,
    outsideCutoffWindow: false,
  };
}

export interface ConsumableDeductionLine {
  productId: string;
  productName: string;
  deductQty: number;
  previousStock: number;
  nextStock: number;
  shortfallQty: number;
}

export interface ConsumableDepletionPlan {
  alreadyDeducted: boolean;
  lines: ConsumableDeductionLine[];
}

export function evaluateConsumableDepletionPlan(params: {
  service?: Pick<ServiceItem, 'consumables'> | null;
  products: Pick<Product, 'id' | 'name' | 'stockQuantity'>[];
  alreadyDeducted?: boolean;
}): ConsumableDepletionPlan {
  if (params.alreadyDeducted || !params.service?.consumables?.length) {
    return { alreadyDeducted: Boolean(params.alreadyDeducted), lines: [] };
  }

  const productMap = new Map(params.products.map((p) => [p.id, p]));
  const lines: ConsumableDeductionLine[] = [];

  for (const item of params.service.consumables) {
    const qty = Math.max(0, Number(item.quantity || 0));
    if (!item.productId || qty <= 0) continue;
    const prod = productMap.get(item.productId);
    if (!prod) continue;
    const prev = Math.max(0, Number(prod.stockQuantity || 0));
    const next = Math.max(0, prev - qty);
    lines.push({
      productId: prod.id,
      productName: prod.name || item.productName,
      deductQty: qty,
      previousStock: prev,
      nextStock: next,
      shortfallQty: Math.max(0, qty - prev),
    });
  }

  return { alreadyDeducted: false, lines };
}

export interface SalonCheckoutSettlement {
  grossCentimes: number;
  packageCoveredCentimes: number;
  depositAppliedCentimes: number;
  giftCardAppliedCentimes: number;
  loyaltyDiscountCentimes: number;
  netPayableCentimes: number;
  netPayableDzd: number;
  loyaltyPointsEarned: number;
}

export function computeSalonCheckoutSettlement(params: {
  servicePriceDzd: number;
  retailTotalDzd?: number;
  tipAmountDzd?: number;
  depositCentimes?: number;
  depositStatus?: Appointment['depositStatus'];
  prepaidPackage?: Pick<SalonPrepaidPackage, 'status' | 'remainingSessions'> | null;
  giftCard?: Pick<SalonGiftCard, 'status' | 'remainingCentimes'> | null;
  loyaltyPointsToRedeem?: number; // 1 point = 10 DZD (1000 centimes)
}): SalonCheckoutSettlement {
  const grossCentimes = dzdToCentimes(
    Number(params.servicePriceDzd || 0) +
      Number(params.retailTotalDzd || 0) +
      Number(params.tipAmountDzd || 0)
  );
  const serviceOnlyCentimes = dzdToCentimes(Number(params.servicePriceDzd || 0));

  const packageEligible =
    params.prepaidPackage &&
    params.prepaidPackage.status === 'active' &&
    params.prepaidPackage.remainingSessions > 0;
  const packageCoveredCentimes = packageEligible ? Math.min(grossCentimes, serviceOnlyCentimes) : 0;

  let remaining = subtractCentimes(grossCentimes, packageCoveredCentimes);

  const depositEligible = params.depositStatus === 'held' && Number(params.depositCentimes || 0) > 0;
  const depositAppliedCentimes = depositEligible
    ? Math.min(remaining, Math.round(Number(params.depositCentimes || 0)))
    : 0;
  remaining = subtractCentimes(remaining, depositAppliedCentimes);

  const gcEligible =
    params.giftCard &&
    params.giftCard.status === 'active' &&
    Number(params.giftCard.remainingCentimes || 0) > 0;
  const giftCardAppliedCentimes = gcEligible
    ? Math.min(remaining, Math.round(Number(params.giftCard!.remainingCentimes)))
    : 0;
  remaining = subtractCentimes(remaining, giftCardAppliedCentimes);

  const requestedLoyaltyCentimes = Math.max(0, Math.round(Number(params.loyaltyPointsToRedeem || 0))) * 1000;
  const loyaltyDiscountCentimes = Math.min(remaining, requestedLoyaltyCentimes);
  remaining = subtractCentimes(remaining, loyaltyDiscountCentimes);

  const netPayableDzd = centimesToDzd(remaining);
  const loyaltyPointsEarned = Math.floor(
    (netPayableDzd + centimesToDzd(depositAppliedCentimes)) / 1000
  ) * DEFAULT_LOYALTY_POINTS_PER_1000_DZD;

  return {
    grossCentimes,
    packageCoveredCentimes,
    depositAppliedCentimes,
    giftCardAppliedCentimes,
    loyaltyDiscountCentimes,
    netPayableCentimes: remaining,
    netPayableDzd,
    loyaltyPointsEarned,
  };
}

export function buildOnlineBookingLink(params: {
  origin?: string;
  businessId: string;
  branchId: string;
  serviceId?: string;
  staffId?: string;
}): string {
  const base = params.origin || 'https://app.atrium-erp.dz';
  const url = new URL('/book', base);
  url.searchParams.set('biz', params.businessId);
  url.searchParams.set('branch', params.branchId);
  if (params.serviceId) url.searchParams.set('service', params.serviceId);
  if (params.staffId) url.searchParams.set('stylist', params.staffId);
  return url.toString();
}

export function sanitizeWhatsappPhone(phone: string): string {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('0') && digits.length === 10) return `213${digits.slice(1)}`;
  return digits;
}

export function buildWhatsappBookingUrl(params: {
  phone: string;
  clientName?: string;
  businessName?: string;
  serviceName?: string;
  date?: string;
  startTime?: string;
  bookingLink?: string;
}): string {
  const cleanPhone = sanitizeWhatsappPhone(params.phone);
  const message = params.serviceName && params.date && params.startTime
    ? `Bonjour ${params.clientName || ''}, votre rendez-vous (${params.serviceName}) chez ${params.businessName || 'notre salon'} est confirmé le ${params.date} à ${params.startTime}.${params.bookingLink ? ` Lien: ${params.bookingLink}` : ''}`
    : `Bonjour ${params.clientName || ''}, réservez votre prochain rendez-vous chez ${params.businessName || 'notre salon'}: ${params.bookingLink || ''}`;
  const encoded = encodeURIComponent(message.trim());
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface HammamSlotValidation {
  allowed: boolean;
  reason?: 'CAPACITY_EXCEEDED' | 'GENDER_BLOCK_CONFLICT' | 'INVALID_TIME_RANGE';
  remainingCapacity: number;
}

export function evaluateHammamSessionSlot(params: {
  existingSessions: SalonHammamSession[];
  cabinName: string;
  genderBlock: SalonHammamSession['genderBlock'];
  date: string;
  startTime: string;
  endTime: string;
  requestedSeats?: number;
  cabinCapacity?: number;
}): HammamSlotValidation {
  const startMin = timeStringToMinutes(params.startTime);
  const endMin = timeStringToMinutes(params.endTime);
  if (endMin <= startMin) {
    return { allowed: false, reason: 'INVALID_TIME_RANGE', remainingCapacity: 0 };
  }

  const seats = Math.max(1, Math.round(Number(params.requestedSeats || 1)));
  const maxCap = Math.max(1, Math.round(Number(params.cabinCapacity || (params.genderBlock === 'private' ? 2 : 6))));

  const overlapping = params.existingSessions.filter((s) => {
    if (s.status === 'Cancelled' || s.status === 'Completed') return false;
    if (s.cabinName !== params.cabinName || s.date !== params.date) return false;
    const sStart = timeStringToMinutes(s.startTime);
    const sEnd = timeStringToMinutes(s.endTime);
    return startMin < sEnd && endMin > sStart;
  });

  const genderConflict = overlapping.some((s) => s.genderBlock !== params.genderBlock);
  if (genderConflict) {
    return { allowed: false, reason: 'GENDER_BLOCK_CONFLICT', remainingCapacity: 0 };
  }

  const occupiedSeats = overlapping.reduce((acc, s) => acc + Math.max(1, Number(s.bookedCount || 1)), 0);
  const remainingCapacity = Math.max(0, maxCap - occupiedSeats);

  if (occupiedSeats + seats > maxCap) {
    return { allowed: false, reason: 'CAPACITY_EXCEEDED', remainingCapacity };
  }

  return { allowed: true, remainingCapacity: remainingCapacity - seats };
}
