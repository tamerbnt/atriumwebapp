import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  RentableUnit,
  RentalBooking,
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
  capacity: Number(row.capacity || 10),
  surfaceAreaSqm: row.surface_area_sqm ? Number(row.surface_area_sqm) : undefined,
  hourlyRate: Number(row.hourly_rate || 0),
  dailyRate: Number(row.daily_rate || 0),
  currency: row.currency || 'DZD',
  amenities: Array.isArray(row.amenities) ? row.amenities : [],
  status: row.status || 'Available',
  description: row.description || '',
  colorHex: row.color_hex || '#8B5CF6',
  version: row.version != null ? Number(row.version) : undefined,
  createdAt: row.created_at,
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
  currency: row.currency || 'DZD',
  paymentMethod: row.payment_method || 'Cash',
  status: row.status || 'Held',
  deductionReason: row.deduction_reason || undefined,
  version: row.version != null ? Number(row.version) : undefined,
  collectedAt: row.collected_at,
  releasedAt: row.released_at || undefined,
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
      capacity: unit.capacity,
      surface_area_sqm: unit.surfaceAreaSqm || null,
      hourly_rate: unit.hourlyRate,
      daily_rate: unit.dailyRate,
      currency: unit.currency,
      amenities: unit.amenities,
      status: unit.status,
      description: unit.description || null,
      color_hex: unit.colorHex || '#8B5CF6',
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
      currency: deposit.currency,
      payment_method: deposit.paymentMethod,
      status: deposit.status,
      deduction_reason: deposit.deductionReason || null,
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
    for (const tbl of ['rental_units', 'rental_renters', 'rental_bookings', 'rental_security_deposits']) {
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
      canWrite: Boolean(sessionData?.session?.user && tablesFound.length === 4),
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
