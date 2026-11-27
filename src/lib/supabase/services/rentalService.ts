import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  RentableUnit,
  RentalAssetCheckLog,
  RentalBooking,
  RentalContractTemplate,
  RentalCoworkingSubscription,
  RentalPricingRule,
  RentalRenter,
  SecurityDepositRecord,
} from '../../../types/index';

export interface RentalSyncResult {
  success: boolean;
  error?: string;
  table?: string;
  data?: any;
  queued?: boolean;
}

export const mapRentalUnitFromDb = (row: any): RentableUnit => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  name: row.name,
  code: row.code,
  type: row.type || 'Room',
  rentalMode: row.rental_mode || undefined,
  capacity: Number(row.capacity || 10),
  surfaceAreaSqm: row.surface_area_sqm ? Number(row.surface_area_sqm) : undefined,
  hourlyRate: Number(row.hourly_rate || 0),
  dailyRate: Number(row.daily_rate || 0),
  currency: row.currency || 'DZD',
  amenities: Array.isArray(row.amenities) ? row.amenities : [],
  status: row.status || 'Available',
  description: row.description || '',
  colorHex: row.color_hex || '#8B5CF6',
  serialNumber: row.serial_number || undefined,
  plateNumber: row.plate_number || undefined,
  vin: row.vin || undefined,
  makeModel: row.make_model || undefined,
  odometerKm: row.odometer_km != null ? Number(row.odometer_km) : undefined,
  fuelLevelPct: row.fuel_level_pct != null ? Number(row.fuel_level_pct) : undefined,
  insuranceExpiry: row.insurance_expiry || undefined,
  techControlExpiry: row.tech_control_expiry || undefined,
  lastMaintenanceAt: row.last_maintenance_at || undefined,
  maintenanceIntervalKm:
    row.maintenance_interval_km != null ? Number(row.maintenance_interval_km) : undefined,
  weekendMultiplier: row.weekend_multiplier != null ? Number(row.weekend_multiplier) : undefined,
  graceMinutes: row.grace_minutes != null ? Number(row.grace_minutes) : undefined,
  lateHourlyRate: row.late_hourly_rate != null ? Number(row.late_hourly_rate) : undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
});

export const mapRentalRenterFromDb = (row: any): RentalRenter => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  fullName: row.full_name,
  companyName: row.company_name || undefined,
  email: row.email,
  phone: row.phone,
  idDocNumber: row.id_doc_number || undefined,
  driverLicenseNumber: row.driver_license_number || undefined,
  driverLicenseExpiry: row.driver_license_expiry || undefined,
  crmPartyId: row.crm_party_id || undefined,
  totalBookings: Number(row.total_bookings || 0),
  totalSpent: Number(row.total_spent || 0),
  currency: row.currency || 'DZD',
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
});

export const mapRentalBookingFromDb = (row: any): RentalBooking => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  renterId: row.renter_id,
  renterName: row.renter_name,
  renterPhone: row.renter_phone,
  renterEmail: row.renter_email || undefined,
  renterCompany: row.renter_company || undefined,
  unitId: row.unit_id,
  unitName: row.unit_name,
  unitType: row.unit_type || 'Room',
  rentalMode: row.rental_mode || undefined,
  purpose: row.purpose,
  startDateTime: row.start_date_time,
  endDateTime: row.end_date_time,
  durationHours: Number(row.duration_hours || 1),
  attendeeCount: Number(row.attendee_count || 1),
  status: row.status || 'Confirmed',
  baseAmount: Number(row.base_amount || 0),
  addonsAmount: Number(row.addons_amount || 0),
  totalAmount: Number(row.total_amount || 0),
  currency: row.currency || 'DZD',
  depositAmount: Number(row.deposit_amount || 0),
  depositStatus: row.deposit_status || 'Held',
  paidAmount: Number(row.paid_amount || 0),
  balanceDue: Number(row.balance_due || 0),
  addons: Array.isArray(row.addons) ? row.addons : [],
  contractSigned: Boolean(row.contract_signed),
  contractTemplateId: row.contract_template_id || undefined,
  contractSignedAt: row.contract_signed_at || undefined,
  contractSignerName: row.contract_signer_name || undefined,
  contractSignatureData: row.contract_signature_data || undefined,
  pricingBreakdown: row.pricing_breakdown || undefined,
  seasonalRuleId: row.seasonal_rule_id || undefined,
  lateFeeDzd: row.late_fee_dzd != null ? Number(row.late_fee_dzd) : undefined,
  actualReturnAt: row.actual_return_at || undefined,
  stagedPaymentSchedule: Array.isArray(row.staged_payment_schedule)
    ? row.staged_payment_schedule
    : undefined,
  icalUid: row.ical_uid || undefined,
  unifiedDocumentId: row.unified_document_id || undefined,
  driverLicenseNumber: row.driver_license_number || undefined,
  driverLicenseExpiry: row.driver_license_expiry || undefined,
  mileageOut: row.mileage_out != null ? Number(row.mileage_out) : undefined,
  mileageIn: row.mileage_in != null ? Number(row.mileage_in) : undefined,
  fuelOutPct: row.fuel_out_pct != null ? Number(row.fuel_out_pct) : undefined,
  fuelInPct: row.fuel_in_pct != null ? Number(row.fuel_in_pct) : undefined,
  inspectionNotes: row.inspection_notes || undefined,
  notes: row.notes || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapRentalDepositFromDb = (row: any): SecurityDepositRecord => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  tenantId: row.account_id,
  facilityId: row.branch_id,
  bookingId: row.booking_id,
  renterName: row.renter_name,
  unitName: row.unit_name,
  amount: Number(row.amount || 0),
  originalAmount: row.original_amount != null ? Number(row.original_amount) : undefined,
  deductedAmount: row.deducted_amount != null ? Number(row.deducted_amount) : undefined,
  currency: row.currency || 'DZD',
  paymentMethod: row.payment_method || 'Cash',
  status: row.status || 'Held',
  deductionReason: row.deduction_reason || undefined,
  depositReceiptNumber: row.deposit_receipt_number || undefined,
  printedCount: row.printed_count != null ? Number(row.printed_count) : 0,
  version: row.version != null ? Number(row.version) : undefined,
  collectedAt: row.collected_at,
  releasedAt: row.released_at || undefined,
});

export const mapRentalPricingRuleFromDb = (row: any): RentalPricingRule => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  name: row.name,
  unitType: row.unit_type || 'All',
  rentalMode: row.rental_mode || 'all',
  unitId: row.unit_id || undefined,
  weekendMultiplier: Number(row.weekend_multiplier || 1),
  weekendDays: Array.isArray(row.weekend_days) ? row.weekend_days.map(Number) : [5, 6],
  seasonStartDate: row.season_start_date || undefined,
  seasonEndDate: row.season_end_date || undefined,
  seasonalMultiplier: Number(row.seasonal_multiplier || 1),
  flatDailyOverride: row.flat_daily_override != null ? Number(row.flat_daily_override) : undefined,
  isActive: row.is_active !== false,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapRentalContractTemplateFromDb = (row: any): RentalContractTemplate => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  name: row.name,
  rentalMode: row.rental_mode || 'all',
  bodyTemplate: row.body_template || '',
  requireSignature: row.require_signature !== false,
  isDefault: Boolean(row.is_default),
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapRentalAssetCheckLogFromDb = (row: any): RentalAssetCheckLog => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  unitId: row.unit_id,
  unitName: row.unit_name,
  bookingId: row.booking_id || undefined,
  logType: row.log_type || 'checkout',
  mileageKm: row.mileage_km != null ? Number(row.mileage_km) : undefined,
  fuelLevelPct: row.fuel_level_pct != null ? Number(row.fuel_level_pct) : undefined,
  serialNumber: row.serial_number || undefined,
  conditionNotes: row.condition_notes || undefined,
  damageDetected: Boolean(row.damage_detected),
  damageAmountDzd: row.damage_amount_dzd != null ? Number(row.damage_amount_dzd) : undefined,
  performedBy: row.performed_by || undefined,
  loggedAt: row.logged_at,
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapRentalCoworkingSubscriptionFromDb = (row: any): RentalCoworkingSubscription => ({
  id: row.id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id,
  renterId: row.renter_id,
  renterName: row.renter_name,
  unitId: row.unit_id || undefined,
  unitName: row.unit_name || undefined,
  planName: row.plan_name,
  planKind: row.plan_kind || 'monthly_pass',
  includedHours: Number(row.included_hours || 0),
  usedHours: Number(row.used_hours || 0),
  monthlyFeeDzd: Number(row.monthly_fee_dzd || 0),
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status || 'active',
  autoRenew: Boolean(row.auto_renew),
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const rentalService = {
  // ============================================================
  // Rental Units (rental_units)
  // ============================================================
  async fetchUnits(branchId: string, updatedAfter?: string | null): Promise<RentableUnit[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('rental_units')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapRentalUnitFromDb);
    } catch {
      return [];
    }
  },

  async upsertUnit(unit: RentableUnit): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: unit.accountId || unit.tenantId,
      businessId: unit.businessId,
      branchId: unit.branchId || unit.facilityId,
      staffId: unit.staffId,
    });

    const payload = {
      id: toValidUuid(unit.id),
      ...trace,
      name: unit.name,
      code: unit.code,
      type: unit.type,
      rental_mode: unit.rentalMode || 'venue',
      capacity: unit.capacity,
      surface_area_sqm: unit.surfaceAreaSqm || null,
      hourly_rate: unit.hourlyRate,
      daily_rate: unit.dailyRate,
      currency: unit.currency,
      amenities: unit.amenities,
      status: unit.status,
      description: unit.description || null,
      color_hex: unit.colorHex || '#8B5CF6',
      serial_number: unit.serialNumber || null,
      plate_number: unit.plateNumber || null,
      vin: unit.vin || null,
      make_model: unit.makeModel || null,
      odometer_km: unit.odometerKm ?? null,
      fuel_level_pct: unit.fuelLevelPct ?? null,
      insurance_expiry: unit.insuranceExpiry || null,
      tech_control_expiry: unit.techControlExpiry || null,
      last_maintenance_at: unit.lastMaintenanceAt || null,
      maintenance_interval_km: unit.maintenanceIntervalKm ?? null,
      weekend_multiplier: unit.weekendMultiplier ?? 1,
      grace_minutes: unit.graceMinutes ?? 15,
      late_hourly_rate: unit.lateHourlyRate ?? 0,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('rental_units', payload, {
      expectedVersion: unit.version,
      entityType: 'RentableUnit',
      entityLabel: unit.name,
      localData: payload,
    });
    return {
      success: res.success,
      queued: res.queued,
      error: res.error,
      table: 'rental_units',
    };
  },

  async deleteUnit(unitId: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_units', unitId, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  // ============================================================
  // Renters & Corporate Accounts (rental_renters)
  // ============================================================
  async fetchRenters(branchId: string, updatedAfter?: string | null): Promise<RentalRenter[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('rental_renters')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapRentalRenterFromDb);
    } catch {
      return [];
    }
  },

  async upsertRenter(renter: RentalRenter): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: renter.accountId || renter.tenantId,
      businessId: renter.businessId,
      branchId: renter.branchId || renter.facilityId,
      staffId: renter.staffId,
    });

    const payload = {
      id: toValidUuid(renter.id),
      ...trace,
      full_name: renter.fullName,
      company_name: renter.companyName || null,
      email: renter.email,
      phone: renter.phone,
      id_doc_number: renter.idDocNumber || null,
      driver_license_number: renter.driverLicenseNumber || null,
      driver_license_expiry: renter.driverLicenseExpiry || null,
      crm_party_id: renter.crmPartyId ? toValidUuid(renter.crmPartyId) : null,
      total_bookings: renter.totalBookings,
      total_spent: renter.totalSpent,
      currency: renter.currency,
      notes: renter.notes || null,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('rental_renters', payload, {
      expectedVersion: renter.version,
      entityType: 'RentalRenter',
      entityLabel: renter.fullName,
      localData: payload,
    });
    return {
      success: res.success,
      queued: res.queued,
      error: res.error,
      table: 'rental_renters',
    };
  },

  async deleteRenter(renterId: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_renters', renterId, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  // ============================================================
  // Bookings & Reservations (rental_bookings)
  // ============================================================
  async fetchBookings(branchId: string, updatedAfter?: string | null): Promise<RentalBooking[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('rental_bookings')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('start_date_time', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapRentalBookingFromDb);
    } catch {
      return [];
    }
  },

  async upsertBooking(booking: RentalBooking): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: booking.accountId || booking.tenantId,
      businessId: booking.businessId,
      branchId: booking.branchId || booking.facilityId,
      staffId: booking.staffId,
    });

    const payload = {
      id: toValidUuid(booking.id),
      ...trace,
      renter_id: toValidUuid(booking.renterId),
      renter_name: booking.renterName,
      renter_phone: booking.renterPhone,
      renter_email: booking.renterEmail || null,
      renter_company: booking.renterCompany || null,
      unit_id: toValidUuid(booking.unitId),
      unit_name: booking.unitName,
      unit_type: booking.unitType,
      rental_mode: booking.rentalMode || 'venue',
      purpose: booking.purpose,
      start_date_time: booking.startDateTime,
      end_date_time: booking.endDateTime,
      duration_hours: booking.durationHours,
      attendee_count: booking.attendeeCount,
      status: booking.status,
      base_amount: booking.baseAmount,
      addons_amount: booking.addonsAmount,
      total_amount: booking.totalAmount,
      currency: booking.currency,
      deposit_amount: booking.depositAmount,
      deposit_status: booking.depositStatus,
      paid_amount: booking.paidAmount,
      balance_due: booking.balanceDue,
      addons: booking.addons || [],
      contract_signed: booking.contractSigned,
      contract_template_id: booking.contractTemplateId ? toValidUuid(booking.contractTemplateId) : null,
      contract_signed_at: booking.contractSignedAt || null,
      contract_signer_name: booking.contractSignerName || null,
      contract_signature_data: booking.contractSignatureData || null,
      pricing_breakdown: booking.pricingBreakdown || null,
      seasonal_rule_id: booking.seasonalRuleId ? toValidUuid(booking.seasonalRuleId) : null,
      late_fee_dzd: booking.lateFeeDzd ?? 0,
      actual_return_at: booking.actualReturnAt || null,
      staged_payment_schedule: booking.stagedPaymentSchedule || [],
      ical_uid: booking.icalUid || `${booking.id}@atrium.local`,
      unified_document_id: booking.unifiedDocumentId ? toValidUuid(booking.unifiedDocumentId) : null,
      driver_license_number: booking.driverLicenseNumber || null,
      driver_license_expiry: booking.driverLicenseExpiry || null,
      mileage_out: booking.mileageOut ?? null,
      mileage_in: booking.mileageIn ?? null,
      fuel_out_pct: booking.fuelOutPct ?? null,
      fuel_in_pct: booking.fuelInPct ?? null,
      inspection_notes: booking.inspectionNotes || null,
      notes: booking.notes || null,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('rental_bookings', payload, {
      expectedVersion: booking.version,
      entityType: 'RentalBooking',
      entityLabel: `${booking.renterName} — ${booking.unitName}`,
      localData: payload,
    });
    return {
      success: res.success,
      queued: res.queued,
      error: res.error,
      table: 'rental_bookings',
    };
  },

  async deleteBooking(bookingId: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_bookings', bookingId, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  // ============================================================
  // Security Deposits (rental_security_deposits)
  // ============================================================
  async fetchDeposits(branchId: string, updatedAfter?: string | null): Promise<SecurityDepositRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('rental_security_deposits')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('collected_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map(mapRentalDepositFromDb);
    } catch {
      return [];
    }
  },

  async upsertDeposit(deposit: SecurityDepositRecord): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: deposit.accountId || deposit.tenantId,
      businessId: deposit.businessId,
      branchId: deposit.branchId || deposit.facilityId,
      staffId: deposit.staffId,
    });

    const payload = {
      id: toValidUuid(deposit.id),
      ...trace,
      booking_id: toValidUuid(deposit.bookingId),
      renter_name: deposit.renterName,
      unit_name: deposit.unitName,
      amount: deposit.amount,
      original_amount: deposit.originalAmount ?? deposit.amount,
      deducted_amount: deposit.deductedAmount ?? 0,
      currency: deposit.currency,
      payment_method: deposit.paymentMethod,
      status: deposit.status,
      deduction_reason: deposit.deductionReason || null,
      deposit_receipt_number: deposit.depositReceiptNumber || null,
      printed_count: Math.max(0, Number(deposit.printedCount || 0)),
      collected_at: deposit.collectedAt,
      released_at: deposit.releasedAt || null,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('rental_security_deposits', payload, {
      expectedVersion: deposit.version,
      entityType: 'SecurityDeposit',
      entityLabel: deposit.renterName,
      localData: payload,
    });
    return {
      success: res.success,
      queued: res.queued,
      error: res.error,
      table: 'rental_security_deposits',
    };
  },

  async deleteDeposit(depositId: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_security_deposits', depositId, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  // ============================================================
  // 7.5 Pricing Rules, Contract Templates, Asset Check Logs & Coworking Subs
  // ============================================================
  async fetchPricingRules(branchId: string, updatedAfter?: string | null): Promise<RentalPricingRule[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const safeBranchId = toValidUuid(branchId);
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let q = (client as any)
          .from('rental_pricing_rules')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) q = q.gt('updated_at', updatedAfter);
        return q;
      });
      return data.map(mapRentalPricingRuleFromDb);
    } catch {
      return [];
    }
  },

  async upsertPricingRule(rule: RentalPricingRule): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: rule.accountId,
      businessId: rule.businessId,
      branchId: rule.branchId,
      staffId: rule.staffId,
    });
    const payload = {
      id: toValidUuid(rule.id),
      ...trace,
      name: rule.name,
      unit_type: rule.unitType || 'All',
      rental_mode: rule.rentalMode || 'all',
      unit_id: rule.unitId ? toValidUuid(rule.unitId) : null,
      weekend_multiplier: rule.weekendMultiplier,
      weekend_days: rule.weekendDays || [5, 6],
      season_start_date: rule.seasonStartDate || null,
      season_end_date: rule.seasonEndDate || null,
      seasonal_multiplier: rule.seasonalMultiplier,
      flat_daily_override: rule.flatDailyOverride ?? null,
      is_active: rule.isActive,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('rental_pricing_rules', payload, {
      expectedVersion: rule.version,
      entityType: 'RentalPricingRule',
      entityLabel: rule.name,
      localData: payload,
    });
    return { success: res.success, queued: res.queued, error: res.error, table: 'rental_pricing_rules' };
  },

  async deletePricingRule(id: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_pricing_rules', id, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  async fetchContractTemplates(branchId: string, updatedAfter?: string | null): Promise<RentalContractTemplate[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const safeBranchId = toValidUuid(branchId);
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let q = (client as any)
          .from('rental_contract_templates')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) q = q.gt('updated_at', updatedAfter);
        return q;
      });
      return data.map(mapRentalContractTemplateFromDb);
    } catch {
      return [];
    }
  },

  async upsertContractTemplate(tpl: RentalContractTemplate): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: tpl.accountId,
      businessId: tpl.businessId,
      branchId: tpl.branchId,
      staffId: tpl.staffId,
    });
    const payload = {
      id: toValidUuid(tpl.id),
      ...trace,
      name: tpl.name,
      rental_mode: tpl.rentalMode || 'all',
      body_template: tpl.bodyTemplate,
      require_signature: tpl.requireSignature,
      is_default: Boolean(tpl.isDefault),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('rental_contract_templates', payload, {
      expectedVersion: tpl.version,
      entityType: 'RentalContractTemplate',
      entityLabel: tpl.name,
      localData: payload,
    });
    return { success: res.success, queued: res.queued, error: res.error, table: 'rental_contract_templates' };
  },

  async fetchAssetCheckLogs(branchId: string, updatedAfter?: string | null): Promise<RentalAssetCheckLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const safeBranchId = toValidUuid(branchId);
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let q = (client as any)
          .from('rental_asset_check_logs')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('logged_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) q = q.gt('updated_at', updatedAfter);
        return q;
      });
      return data.map(mapRentalAssetCheckLogFromDb);
    } catch {
      return [];
    }
  },

  async upsertAssetCheckLog(log: RentalAssetCheckLog): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId,
      businessId: log.businessId,
      branchId: log.branchId,
      staffId: log.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      unit_id: toValidUuid(log.unitId),
      unit_name: log.unitName,
      booking_id: log.bookingId ? toValidUuid(log.bookingId) : null,
      log_type: log.logType,
      mileage_km: log.mileageKm ?? null,
      fuel_level_pct: log.fuelLevelPct ?? null,
      serial_number: log.serialNumber || null,
      condition_notes: log.conditionNotes || null,
      damage_detected: Boolean(log.damageDetected),
      damage_amount_dzd: log.damageAmountDzd ?? 0,
      performed_by: log.performedBy || null,
      logged_at: log.loggedAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('rental_asset_check_logs', payload, {
      expectedVersion: log.version,
      entityType: 'RentalAssetCheckLog',
      entityLabel: `${log.unitName} (${log.logType})`,
      localData: payload,
    });
    return { success: res.success, queued: res.queued, error: res.error, table: 'rental_asset_check_logs' };
  },

  async fetchCoworkingSubscriptions(
    branchId: string,
    updatedAfter?: string | null
  ): Promise<RentalCoworkingSubscription[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const safeBranchId = toValidUuid(branchId);
    try {
      const data = await fetchAllPages<any>((from, to) => {
        let q = (client as any)
          .from('rental_coworking_subscriptions')
          .select('*')
          .eq('branch_id', safeBranchId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (updatedAfter) q = q.gt('updated_at', updatedAfter);
        return q;
      });
      return data.map(mapRentalCoworkingSubscriptionFromDb);
    } catch {
      return [];
    }
  },

  async upsertCoworkingSubscription(
    sub: RentalCoworkingSubscription
  ): Promise<RentalSyncResult> {
    const trace = buildTraceEnvelope({
      accountId: sub.accountId,
      businessId: sub.businessId,
      branchId: sub.branchId,
      staffId: sub.staffId,
    });
    const payload = {
      id: toValidUuid(sub.id),
      ...trace,
      renter_id: toValidUuid(sub.renterId),
      renter_name: sub.renterName,
      unit_id: sub.unitId ? toValidUuid(sub.unitId) : null,
      unit_name: sub.unitName || null,
      plan_name: sub.planName,
      plan_kind: sub.planKind,
      included_hours: sub.includedHours,
      used_hours: sub.usedHours,
      monthly_fee_dzd: sub.monthlyFeeDzd,
      start_date: sub.startDate,
      end_date: sub.endDate,
      status: sub.status,
      auto_renew: Boolean(sub.autoRenew),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('rental_coworking_subscriptions', payload, {
      expectedVersion: sub.version,
      entityType: 'RentalCoworkingSubscription',
      entityLabel: `${sub.renterName} — ${sub.planName}`,
      localData: payload,
    });
    return {
      success: res.success,
      queued: res.queued,
      error: res.error,
      table: 'rental_coworking_subscriptions',
    };
  },

  async deleteContractTemplate(id: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_contract_templates', id, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  async deleteAssetCheckLog(id: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_asset_check_logs', id, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  async deleteCoworkingSubscription(id: string, deletedByStaffId?: string): Promise<RentalSyncResult> {
    const res = await syncCoordinator.softDeleteRow('rental_coworking_subscriptions', id, deletedByStaffId);
    return { success: res.success, queued: res.queued, error: res.error };
  },

  // ============================================================
  // Cloud Sync Read Diagnostics (No unsafe write probes)
  // ============================================================
  async checkCloudTables(): Promise<{
    configured: boolean;
    tablesFound: string[];
    canWrite: boolean;
    errorDetail?: string;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return { configured: false, tablesFound: [], canWrite: false, errorDetail: 'Supabase credentials not configured' };
    }

    const tablesFound: string[] = [];
    for (const tbl of [
      'rental_units',
      'rental_renters',
      'rental_bookings',
      'rental_security_deposits',
      'rental_pricing_rules',
      'rental_contract_templates',
      'rental_asset_check_logs',
      'rental_coworking_subscriptions',
    ]) {
      try {
        const { error } = await (client as any).from(tbl).select('id').limit(1);
        if (!error) tablesFound.push(tbl);
      } catch {
        // ignore
      }
    }

    const { data: sessionData } = await client.auth.getSession();
    return {
      configured: true,
      tablesFound,
      canWrite: Boolean(sessionData?.session?.user && tablesFound.length >= 4),
    };
  },

  async fetchCloudSummary(branchId?: string): Promise<{
    configured: boolean;
    connected: boolean;
    counts: { units: number; bookings: number; renters: number; deposits: number };
    latestBooking?: RentalBooking | null;
    error?: string;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        configured: false,
        connected: false,
        counts: { units: 0, bookings: 0, renters: 0, deposits: 0 },
        error: 'Supabase client is not connected',
      };
    }

    const safeBranchId = branchId ? toValidUuid(branchId) : null;
    const countQuery = (tbl: string) => {
      let q = (client as any).from(tbl).select('id', { count: 'exact', head: true }).is('deleted_at', null);
      if (safeBranchId) q = q.eq('branch_id', safeBranchId);
      return q;
    };

    try {
      const [uRes, bRes, rRes, dRes] = await Promise.all([
        countQuery('rental_units'),
        countQuery('rental_bookings'),
        countQuery('rental_renters'),
        countQuery('rental_security_deposits'),
      ]);

      return {
        configured: true,
        connected: !bRes.error && !uRes.error,
        counts: {
          units: uRes.count ?? 0,
          bookings: bRes.count ?? 0,
          renters: rRes.count ?? 0,
          deposits: dRes.count ?? 0,
        },
        latestBooking: null,
        error: bRes.error?.message || uRes.error?.message,
      };
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        counts: { units: 0, bookings: 0, renters: 0, deposits: 0 },
        error: err?.message || 'Network exception while connecting to Supabase',
      };
    }
  },
};
