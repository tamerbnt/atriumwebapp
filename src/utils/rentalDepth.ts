import { roundHalfAwayFromZero } from './money';
import type {
  BookingAddon,
  BookingStatus,
  RentableUnit,
  RentalAssetCheckLog,
  RentalBooking,
  RentalContractTemplate,
  RentalCoworkingSubscription,
  RentalMode,
  RentalPricingBreakdown,
  RentalPricingRule,
  RentalRenter,
  RentalStagedPayment,
} from '../types/index';

export function resolveUnitRentalMode(
  unit: Pick<RentableUnit, 'rentalMode' | 'type'> | null | undefined
): RentalMode {
  if (!unit) return 'venue';
  if (unit.rentalMode) return unit.rentalMode;
  if (unit.type === 'Vehicle') return 'vehicle';
  if (unit.type === 'Gear' || unit.type === 'Equipment') return 'gear';
  if (unit.type === 'Desk') return 'coworking_desk';
  return 'venue';
}

export function computeRentalDurationHours(
  startDateTime: string,
  endDateTime: string
): {
  valid: boolean;
  totalMinutes: number;
  durationHours: number;
  spansMultipleDays: boolean;
} {
  const startMs = Date.parse(startDateTime);
  const endMs = Date.parse(endDateTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { valid: false, totalMinutes: 0, durationHours: 0, spansMultipleDays: false };
  }
  const totalMinutes = Math.round((endMs - startMs) / 60_000);
  const durationHours = Math.max(0.5, Math.round((totalMinutes / 60) * 100) / 100);
  const startDay = startDateTime.slice(0, 10);
  const endDay = endDateTime.slice(0, 10);
  return {
    valid: true,
    totalMinutes,
    durationHours,
    spansMultipleDays: startDay !== endDay,
  };
}

export interface OverlapCheckCandidate {
  id?: string;
  unitId: string;
  startDateTime: string;
  endDateTime: string;
  status?: BookingStatus;
}

export interface OverlapCheckResult {
  hasOverlap: boolean;
  reasonCode?: 'INVALID_WINDOW' | 'RENTAL_BOOKING_OVERLAP';
  conflictingBooking?: RentalBooking;
}

export function detectRentalBookingOverlap(
  candidate: OverlapCheckCandidate,
  existingBookings: RentalBooking[]
): OverlapCheckResult {
  const startMs = Date.parse(candidate.startDateTime);
  const endMs = Date.parse(candidate.endDateTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { hasOverlap: true, reasonCode: 'INVALID_WINDOW' };
  }
  if (candidate.status === 'Cancelled' || (candidate.status as string) === 'CheckedOut') {
    return { hasOverlap: false };
  }
  if (!candidate.unitId) {
    return { hasOverlap: false };
  }

  for (const existing of existingBookings) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (existing.unitId !== candidate.unitId) continue;
    if (existing.status === 'Cancelled' || (existing.status as string) === 'CheckedOut') continue;

    const exStartMs = Date.parse(existing.startDateTime);
    const effectiveEndStr =
      existing.status === 'Completed' && existing.actualReturnAt
        ? existing.actualReturnAt
        : existing.endDateTime;
    const exEndMs = Date.parse(effectiveEndStr);
    if (!Number.isFinite(exStartMs) || !Number.isFinite(exEndMs) || exEndMs <= exStartMs) {
      continue;
    }

    // Half-open [start, end) overlap check: adjacent slots (end === next.start) do NOT collide
    if (startMs < exEndMs && endMs > exStartMs) {
      return {
        hasOverlap: true,
        reasonCode: 'RENTAL_BOOKING_OVERLAP',
        conflictingBooking: existing,
      };
    }
  }

  return { hasOverlap: false };
}

function getIsoDateOnly(iso: string): string {
  return String(iso || '').slice(0, 10);
}

function countWeekendHoursInWindow(
  startMs: number,
  endMs: number,
  weekendDays: number[]
): number {
  if (weekendDays.length === 0 || endMs <= startMs) return 0;
  const set = new Set(weekendDays);
  const stepMs = 30 * 60_000;
  let weekendMinutes = 0;
  for (let cursor = startMs; cursor < endMs; cursor += stepMs) {
    const sliceEnd = Math.min(endMs, cursor + stepMs);
    const d = new Date(cursor);
    if (set.has(d.getUTCDay())) {
      weekendMinutes += (sliceEnd - cursor) / 60_000;
    }
  }
  return Math.round((weekendMinutes / 60) * 100) / 100;
}

export function computeRentalPricingWithRules(input: {
  unit: RentableUnit | null | undefined;
  startDateTime: string;
  endDateTime: string;
  pricingRules: RentalPricingRule[];
  addons?: BookingAddon[];
  overrideRuleId?: string;
}): RentalPricingBreakdown {
  const addons = input.addons || [];
  const addonsTotalDzd = roundHalfAwayFromZero(
    addons.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
  );
  const dur = computeRentalDurationHours(input.startDateTime, input.endDateTime);
  const unit = input.unit;
  if (!unit || !dur.valid) {
    return {
      durationHours: 0,
      totalDaysBilled: 0,
      weekendHours: 0,
      weekendMultiplier: 1,
      seasonalMultiplier: 1,
      baseBeforeRulesDzd: 0,
      adjustedBaseDzd: 0,
      addonsTotalDzd,
      totalDzd: addonsTotalDzd,
    };
  }

  const startMs = Date.parse(input.startDateTime);
  const endMs = Date.parse(input.endDateTime);
  const unitMode = resolveUnitRentalMode(unit);
  const startDay = getIsoDateOnly(input.startDateTime);
  const endDay = getIsoDateOnly(input.endDateTime);

  const matchingRules = (input.pricingRules || []).filter((rule) => {
    if (!rule.isActive) return false;
    if (input.overrideRuleId && rule.id !== input.overrideRuleId) return false;
    if (rule.unitId && rule.unitId !== unit.id) return false;
    if (rule.unitType && rule.unitType !== 'All' && rule.unitType !== unit.type) return false;
    if (rule.rentalMode && rule.rentalMode !== 'all' && rule.rentalMode !== unitMode) return false;
    if (rule.seasonStartDate && endDay < rule.seasonStartDate) return false;
    if (rule.seasonEndDate && startDay > rule.seasonEndDate) return false;
    return true;
  });

  // Most specific rule wins (unit-specific > mode/type-specific > generic)
  matchingRules.sort((a, b) => {
    const score = (r: RentalPricingRule) =>
      (r.unitId ? 4 : 0) +
      (r.unitType && r.unitType !== 'All' ? 2 : 0) +
      (r.seasonStartDate || r.seasonEndDate ? 1 : 0);
    return score(b) - score(a);
  });

  const activeRule = matchingRules[0];
  const fullDays = dur.durationHours >= 8 ? Math.max(1, Math.ceil(dur.durationHours / 24)) : 0;
  const hourlyRate = Number(unit.hourlyRate || 0);
  const dailyRate = Number(unit.dailyRate || 0);

  let baseBeforeRulesDzd = 0;
  if (fullDays > 0 && dailyRate > 0) {
    baseBeforeRulesDzd = roundHalfAwayFromZero(fullDays * dailyRate);
  } else {
    baseBeforeRulesDzd = roundHalfAwayFromZero(dur.durationHours * hourlyRate);
  }

  const weekendDays =
    activeRule?.weekendDays && activeRule.weekendDays.length > 0
      ? activeRule.weekendDays
      : [5, 6]; // Algeria standard weekend: Friday & Saturday
  const weekendMultiplier = Number(
    activeRule?.weekendMultiplier ?? unit.weekendMultiplier ?? 1
  );
  const seasonalMultiplier = Number(activeRule?.seasonalMultiplier ?? 1);
  const weekendHours = countWeekendHoursInWindow(startMs, endMs, weekendDays);
  const weekendShare = dur.durationHours > 0 ? Math.min(1, weekendHours / dur.durationHours) : 0;

  let adjustedBaseDzd = baseBeforeRulesDzd;
  if (activeRule?.flatDailyOverride && activeRule.flatDailyOverride > 0 && fullDays > 0) {
    adjustedBaseDzd = roundHalfAwayFromZero(fullDays * activeRule.flatDailyOverride);
  } else {
    const effectiveWeekendFactor = 1 + weekendShare * Math.max(0, weekendMultiplier - 1);
    adjustedBaseDzd = roundHalfAwayFromZero(
      baseBeforeRulesDzd * seasonalMultiplier * effectiveWeekendFactor
    );
  }

  return {
    durationHours: dur.durationHours,
    totalDaysBilled: fullDays,
    weekendHours,
    appliedRuleId: activeRule?.id,
    appliedRuleName: activeRule?.name,
    weekendMultiplier,
    seasonalMultiplier,
    baseBeforeRulesDzd,
    adjustedBaseDzd,
    addonsTotalDzd,
    totalDzd: adjustedBaseDzd + addonsTotalDzd,
  };
}

export interface LateReturnFeeResult {
  overdueMinutes: number;
  billableLateMinutes: number;
  billableLateHours: number;
  lateFeeDzd: number;
  withinGrace: boolean;
}

export function computeLateReturnFee(input: {
  scheduledEndDateTime: string;
  actualReturnDateTime: string;
  hourlyRate: number;
  dailyRate?: number;
  graceMinutes?: number;
  overtimeMultiplier?: number;
}): LateReturnFeeResult {
  const scheduledMs = Date.parse(input.scheduledEndDateTime);
  const actualMs = Date.parse(input.actualReturnDateTime);
  if (!Number.isFinite(scheduledMs) || !Number.isFinite(actualMs) || actualMs <= scheduledMs) {
    return {
      overdueMinutes: 0,
      billableLateMinutes: 0,
      billableLateHours: 0,
      lateFeeDzd: 0,
      withinGrace: true,
    };
  }

  const overdueMinutes = Math.round((actualMs - scheduledMs) / 60_000);
  const grace = Math.max(0, Number(input.graceMinutes ?? 15));
  const billableLateMinutes = Math.max(0, overdueMinutes - grace);
  if (billableLateMinutes === 0) {
    return {
      overdueMinutes,
      billableLateMinutes: 0,
      billableLateHours: 0,
      lateFeeDzd: 0,
      withinGrace: true,
    };
  }

  const billableLateHours = Math.ceil(billableLateMinutes / 60);
  const overtimeMultiplier = Math.max(1, Number(input.overtimeMultiplier ?? 1.25));
  const rawHourly = Math.max(0, Number(input.hourlyRate || 0));
  const fallbackFromDaily =
    rawHourly > 0 ? rawHourly : Math.max(0, Number(input.dailyRate || 0) / 8);
  const lateFeeDzd = roundHalfAwayFromZero(
    billableLateHours * fallbackFromDaily * overtimeMultiplier
  );

  return {
    overdueMinutes,
    billableLateMinutes,
    billableLateHours,
    lateFeeDzd,
    withinGrace: false,
  };
}

export interface DepositDeductionValidation {
  valid: boolean;
  errorCode?:
    | 'DEDUCTION_MUST_BE_POSITIVE'
    | 'DEDUCTION_EXCEEDS_DEPOSIT'
    | 'DEDUCTION_REASON_REQUIRED';
  clampedAmount: number;
}

export function validateDepositDeduction(
  depositAmount: number,
  deductedAmount: number,
  reason: string
): DepositDeductionValidation {
  const held = Math.max(0, Number(depositAmount || 0));
  const requested = Number(deductedAmount);
  if (!Number.isFinite(requested) || requested <= 0) {
    return {
      valid: false,
      errorCode: 'DEDUCTION_MUST_BE_POSITIVE',
      clampedAmount: 0,
    };
  }
  if (requested > held) {
    return {
      valid: false,
      errorCode: 'DEDUCTION_EXCEEDS_DEPOSIT',
      clampedAmount: held,
    };
  }
  if (!String(reason || '').trim()) {
    return {
      valid: false,
      errorCode: 'DEDUCTION_REASON_REQUIRED',
      clampedAmount: roundHalfAwayFromZero(requested),
    };
  }
  return {
    valid: true,
    clampedAmount: roundHalfAwayFromZero(requested),
  };
}

function shiftDays(ymd: string, deltaDays: number): string {
  const base = Date.parse(`${ymd.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(base)) return ymd.slice(0, 10);
  return new Date(base + deltaDays * 86_400_000).toISOString().slice(0, 10);
}

export function buildWeddingPaymentSchedule(input: {
  totalAmountDzd: number;
  eventDate: string;
  bookedDate?: string;
  tranches?: Array<{ label: string; percentage: number; offsetDaysFromEvent: number }>;
}): RentalStagedPayment[] {
  const total = Math.max(0, roundHalfAwayFromZero(Number(input.totalAmountDzd || 0)));
  const eventDay = getIsoDateOnly(input.eventDate) || new Date().toISOString().slice(0, 10);
  const bookedDay = getIsoDateOnly(input.bookedDate || new Date().toISOString());

  const defs =
    input.tranches && input.tranches.length > 0
      ? input.tranches
      : [
          { label: 'Booking Retainer (30%)', percentage: 30, offsetDaysFromEvent: -999 },
          { label: 'Pre-Event Preparation (40%)', percentage: 40, offsetDaysFromEvent: -14 },
          { label: 'Event Day Balance (30%)', percentage: 30, offsetDaysFromEvent: 0 },
        ];

  let allocated = 0;
  return defs.map((def, idx) => {
    const isLast = idx === defs.length - 1;
    const amountDzd = isLast
      ? Math.max(0, total - allocated)
      : roundHalfAwayFromZero((total * def.percentage) / 100);
    allocated += amountDzd;

    const rawDue =
      def.offsetDaysFromEvent <= -900 ? bookedDay : shiftDays(eventDay, def.offsetDaysFromEvent);
    const dueDate = rawDue < bookedDay ? bookedDay : rawDue;

    return {
      id: `stg_${idx + 1}`,
      label: def.label,
      percentage: def.percentage,
      amountDzd,
      dueDate,
      status: 'pending',
      paidDzd: 0,
    };
  });
}

export function applyPaymentToStagedSchedule(
  schedule: RentalStagedPayment[],
  paymentAmountDzd: number,
  unifiedPaymentId?: string,
  paidAtIso = new Date().toISOString()
): RentalStagedPayment[] {
  let remaining = Math.max(0, roundHalfAwayFromZero(Number(paymentAmountDzd || 0)));
  if (remaining <= 0) return schedule;

  return schedule.map((stage) => {
    if (remaining <= 0 || stage.status === 'paid') return stage;
    const owed = Math.max(0, stage.amountDzd - stage.paidDzd);
    if (owed <= 0) return { ...stage, status: 'paid' };
    const applied = Math.min(owed, remaining);
    remaining -= applied;
    const nextPaid = stage.paidDzd + applied;
    const isFullyPaid = nextPaid >= stage.amountDzd;
    return {
      ...stage,
      paidDzd: nextPaid,
      status: isFullyPaid ? 'paid' : nextPaid > 0 ? 'partial' : 'pending',
      paidAt: isFullyPaid ? paidAtIso : stage.paidAt,
      unifiedPaymentId: unifiedPaymentId || stage.unifiedPaymentId,
    };
  });
}

export function renderRentalContractDocument(input: {
  template?: RentalContractTemplate | null;
  booking: RentalBooking;
  unit?: RentableUnit | null;
  renter?: RentalRenter | null;
  businessName: string;
}): string {
  const defaultTemplate = [
    'RENTAL & SERVICE AGREEMENT — {{business_name}}',
    'Contract Reference: {{booking_id}}',
    'Lessee / Renter: {{renter_name}} ({{renter_phone}})',
    'Asset / Space: {{unit_name}} ({{plate_or_serial}})',
    'Period: {{start_date}} -> {{end_date}}',
    'Driver License / ID: {{driver_license}}',
    'Rental Total: {{total_amount}} | Security Deposit (Caution): {{deposit_amount}}',
    'Terms: The lessee accepts custody in good condition and agrees to overtime and damage deductions bounded by the held security deposit.',
  ].join('\n');

  const body = input.template?.bodyTemplate?.trim() || defaultTemplate;
  const plateOrSerial =
    input.unit?.plateNumber ||
    input.unit?.serialNumber ||
    input.unit?.code ||
    input.booking.unitName;
  const driverLicense =
    input.booking.driverLicenseNumber ||
    input.renter?.driverLicenseNumber ||
    input.renter?.idDocNumber ||
    'N/A';

  const replacements: Record<string, string> = {
    '{{business_name}}': input.businessName || 'Atrium Venue & Fleet',
    '{{booking_id}}': input.booking.id,
    '{{renter_name}}': input.booking.renterName,
    '{{renter_phone}}': input.booking.renterPhone || '',
    '{{unit_name}}': input.booking.unitName,
    '{{plate_or_serial}}': plateOrSerial,
    '{{start_date}}': input.booking.startDateTime,
    '{{end_date}}': input.booking.endDateTime,
    '{{driver_license}}': driverLicense,
    '{{total_amount}}': `${input.booking.totalAmount.toLocaleString()} ${input.booking.currency}`,
    '{{deposit_amount}}': `${input.booking.depositAmount.toLocaleString()} ${input.booking.currency}`,
  };

  let out = body;
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(value);
  }
  return out;
}

function escapeIcsText(val: string): string {
  return String(val || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function unescapeIcsText(val: string): string {
  return String(val || '')
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function formatIcsUtcStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '20260101T000000Z';
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function parseIcsDateToIso(raw: string): string {
  const clean = raw.trim();
  const full = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (full) {
    return `${full[1]}-${full[2]}-${full[3]}T${full[4]}:${full[5]}:${full[6]}Z`;
  }
  const dateOnly = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T09:00:00Z`;
  }
  return new Date(clean).toISOString();
}

export function buildRentalBookingsIcs(
  bookings: RentalBooking[],
  calendarName = 'Atrium Rentals'
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atrium ERP//Rental Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const b of bookings) {
    if (b.status === 'Cancelled') continue;
    const uid = b.icalUid || `${b.id}@atrium.local`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatIcsUtcStamp(b.updatedAt || b.createdAt)}`);
    lines.push(`DTSTART:${formatIcsUtcStamp(b.startDateTime)}`);
    lines.push(`DTEND:${formatIcsUtcStamp(b.endDateTime)}`);
    lines.push(`SUMMARY:${escapeIcsText(`${b.unitName} — ${b.renterName} (${b.purpose})`)}`);
    lines.push(`LOCATION:${escapeIcsText(b.unitName)}`);
    lines.push(
      `DESCRIPTION:${escapeIcsText(`Status: ${b.status} | Phone: ${b.renterPhone || ''} | Total: ${b.totalAmount} ${b.currency}`)}`
    );
    lines.push(`STATUS:${b.status === 'Tentative' ? 'TENTATIVE' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export interface ParsedIcsEvent {
  uid: string;
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  status: BookingStatus;
}

export function parseIcsBookings(icsText: string): ParsedIcsEvent[] {
  const unfolded = String(icsText || '').replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const events: ParsedIcsEvent[] = [];
  let current: Partial<ParsedIcsEvent> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (trimmed === 'END:VEVENT' && current) {
      if (current.startDateTime && current.endDateTime) {
        events.push({
          uid: current.uid || `ics_${events.length + 1}_${Date.now()}`,
          summary: current.summary || 'Imported iCal Booking',
          location: current.location,
          description: current.description,
          startDateTime: current.startDateTime,
          endDateTime: current.endDateTime,
          status: current.status || 'Confirmed',
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const rawKey = trimmed.slice(0, colonIdx).split(';')[0].toUpperCase();
    const val = trimmed.slice(colonIdx + 1);

    if (rawKey === 'UID') current.uid = val.trim();
    else if (rawKey === 'SUMMARY') current.summary = unescapeIcsText(val);
    else if (rawKey === 'LOCATION') current.location = unescapeIcsText(val);
    else if (rawKey === 'DESCRIPTION') current.description = unescapeIcsText(val);
    else if (rawKey === 'DTSTART') current.startDateTime = parseIcsDateToIso(val);
    else if (rawKey === 'DTEND') current.endDateTime = parseIcsDateToIso(val);
    else if (rawKey === 'STATUS') {
      const upper = val.trim().toUpperCase();
      current.status =
        upper === 'TENTATIVE'
          ? 'Tentative'
          : upper === 'CANCELLED'
          ? 'Cancelled'
          : 'Confirmed';
    }
  }

  return events;
}

export interface VehicleComplianceAlert {
  unitId: string;
  unitName: string;
  plateNumber?: string;
  insuranceState: 'expired' | 'expiring_soon' | 'ok' | 'unset';
  techControlState: 'expired' | 'expiring_soon' | 'ok' | 'unset';
  maintenanceDue: boolean;
  needsAttention: boolean;
}

function classifyExpiryState(
  expiryYmd: string | undefined,
  nowMs: number,
  warningDays = 30
): 'expired' | 'expiring_soon' | 'ok' | 'unset' {
  if (!expiryYmd) return 'unset';
  const expMs = Date.parse(`${expiryYmd.slice(0, 10)}T23:59:59Z`);
  if (!Number.isFinite(expMs)) return 'unset';
  if (expMs < nowMs) return 'expired';
  if (expMs - nowMs <= warningDays * 86_400_000) return 'expiring_soon';
  return 'ok';
}

export function evaluateVehicleFleetAlerts(
  units: RentableUnit[],
  nowIso = new Date().toISOString()
): VehicleComplianceAlert[] {
  const nowMs = Date.parse(nowIso) || Date.now();
  return units
    .filter((u) => resolveUnitRentalMode(u) === 'vehicle')
    .map((u) => {
      const insuranceState = classifyExpiryState(u.insuranceExpiry, nowMs);
      const techControlState = classifyExpiryState(u.techControlExpiry, nowMs);
      const maintenanceDue = Boolean(
        u.maintenanceIntervalKm &&
          u.odometerKm &&
          u.maintenanceIntervalKm > 0 &&
          u.odometerKm % u.maintenanceIntervalKm >= u.maintenanceIntervalKm - 500
      );
      const needsAttention =
        insuranceState === 'expired' ||
        insuranceState === 'expiring_soon' ||
        techControlState === 'expired' ||
        techControlState === 'expiring_soon' ||
        maintenanceDue;
      return {
        unitId: u.id,
        unitName: u.name,
        plateNumber: u.plateNumber,
        insuranceState,
        techControlState,
        maintenanceDue,
        needsAttention,
      };
    });
}

export function evaluateGearAssetAvailability(
  unit: RentableUnit,
  checkLogs: RentalAssetCheckLog[]
): {
  custodyState: 'in_stock' | 'checked_out' | 'maintenance';
  lastLog?: RentalAssetCheckLog;
  totalDamageChargesDzd: number;
} {
  const unitLogs = (checkLogs || [])
    .filter((l) => l.unitId === unit.id)
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const lastLog = unitLogs[0];
  const totalDamageChargesDzd = unitLogs.reduce(
    (sum, l) => sum + Number(l.damageAmountDzd || 0),
    0
  );

  let custodyState: 'in_stock' | 'checked_out' | 'maintenance' = 'in_stock';
  if (unit.status === 'Maintenance' || lastLog?.logType === 'maintenance') {
    custodyState = 'maintenance';
  } else if (unit.status === 'Occupied' || lastLog?.logType === 'checkout') {
    custodyState = 'checked_out';
  }

  return { custodyState, lastLog, totalDamageChargesDzd };
}

export function evaluateCoworkingSubscriptionUsage(
  subscription: RentalCoworkingSubscription,
  requestedHours: number,
  nowIso = new Date().toISOString()
): {
  allowed: boolean;
  reasonCode?:
    | 'SUBSCRIPTION_NOT_ACTIVE'
    | 'SUBSCRIPTION_EXPIRED'
    | 'INSUFFICIENT_HOURS';
  remainingHours: number;
} {
  const remainingHours = Math.max(0, Number(subscription.includedHours) - Number(subscription.usedHours));
  if (subscription.status !== 'active') {
    return { allowed: false, reasonCode: 'SUBSCRIPTION_NOT_ACTIVE', remainingHours };
  }
  const today = nowIso.slice(0, 10);
  if (subscription.endDate && today > subscription.endDate.slice(0, 10)) {
    return { allowed: false, reasonCode: 'SUBSCRIPTION_EXPIRED', remainingHours };
  }
  if (
    subscription.planKind === 'hour_pack' &&
    requestedHours > 0 &&
    remainingHours < requestedHours
  ) {
    return { allowed: false, reasonCode: 'INSUFFICIENT_HOURS', remainingHours };
  }
  return {
    allowed: true,
    remainingHours:
      subscription.planKind === 'hour_pack'
        ? Math.max(0, remainingHours - Math.max(0, requestedHours))
        : remainingHours,
  };
}

export interface TimelineDaySegment {
  booking: RentalBooking;
  startHour: number;
  endHour: number;
  continuesFromPriorDay: boolean;
  continuesToNextDay: boolean;
}

export function filterBookingSegmentsForDate(
  bookings: RentalBooking[],
  targetDateYmd: string,
  gridStartHour = 8,
  gridEndHour = 24
): TimelineDaySegment[] {
  const dayStartMs = Date.parse(`${targetDateYmd}T00:00:00Z`);
  const dayEndMs = dayStartMs + 86_400_000;
  if (!Number.isFinite(dayStartMs)) return [];

  const result: TimelineDaySegment[] = [];
  for (const booking of bookings) {
    if (booking.status === 'Cancelled') continue;
    const bStartMs = Date.parse(booking.startDateTime);
    const bEndMs = Date.parse(booking.endDateTime);
    if (!Number.isFinite(bStartMs) || !Number.isFinite(bEndMs) || bEndMs <= bStartMs) {
      continue;
    }
    if (bEndMs <= dayStartMs || bStartMs >= dayEndMs) continue;

    const clampedStartMs = Math.max(bStartMs, dayStartMs);
    const clampedEndMs = Math.min(bEndMs, dayEndMs);
    const rawStartHour = (clampedStartMs - dayStartMs) / 3_600_000;
    const rawEndHour = (clampedEndMs - dayStartMs) / 3_600_000;

    const startHour = Math.max(gridStartHour, Math.min(gridEndHour - 0.5, rawStartHour));
    const endHour = Math.min(gridEndHour, Math.max(startHour + 0.5, rawEndHour));

    result.push({
      booking,
      startHour,
      endHour,
      continuesFromPriorDay: bStartMs < dayStartMs,
      continuesToNextDay: bEndMs > dayEndMs,
    });
  }

  return result;
}
