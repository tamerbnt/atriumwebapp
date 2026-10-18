import { getSupabaseClient, isUuid, toValidUuid } from '../client';
import type {
  RentableUnit,
  RentalBooking,
  RentalRenter,
  SecurityDepositRecord,
  BookingAddon,
} from '../../../types/index';

export interface RentalSyncResult {
  success: boolean;
  error?: string;
  table?: string;
  data?: any;
}

export const rentalService = {
  // ============================================================
  // Rentable Units (Spaces & Assets)
  // ============================================================
  async fetchUnits(branchId: string): Promise<RentableUnit[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const { data, error } = await (client as any)
        .from('rentable_units')
        .select('*')
        .eq('branch_id', safeBranchId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[rentalService] fetchUnits warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): RentableUnit => ({
        id: row.id,
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
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertUnit(unit: RentableUnit): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase client is not connected' };
    }

    const safeId = toValidUuid(unit.id);
    const safeAccountId = toValidUuid(unit.tenantId);
    const safeBranchId = toValidUuid(unit.facilityId);

    try {
      const payload: any = {
        id: safeId,
        account_id: safeAccountId,
        branch_id: safeBranchId,
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

      const { data, error } = await (client as any)
        .from('rentable_units')
        .upsert(payload)
        .select();

      if (error) {
        console.warn('[rentalService] upsertUnit error:', error.message);
        return { success: false, error: error.message, table: 'rentable_units' };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network exception', table: 'rentable_units' };
    }
  },

  async deleteUnit(unitId: string): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Not connected' };

    const safeId = toValidUuid(unitId);

    try {
      const { error } = await (client as any)
        .from('rentable_units')
        .delete()
        .eq('id', safeId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // ============================================================
  // Renters & Corporate Accounts
  // ============================================================
  async fetchRenters(branchId: string): Promise<RentalRenter[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const { data, error } = await (client as any)
        .from('rental_renters')
        .select('*')
        .eq('branch_id', safeBranchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[rentalService] fetchRenters warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): RentalRenter => ({
        id: row.id,
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
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertRenter(renter: RentalRenter): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Not connected' };

    const safeId = toValidUuid(renter.id);
    const safeAccountId = toValidUuid(renter.tenantId);
    const safeBranchId = toValidUuid(renter.facilityId);

    try {
      const payload: any = {
        id: safeId,
        account_id: safeAccountId,
        branch_id: safeBranchId,
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

      const { data, error } = await (client as any)
        .from('rental_renters')
        .upsert(payload)
        .select();

      if (error) {
        console.warn('[rentalService] upsertRenter error:', error.message);
        return { success: false, error: error.message, table: 'rental_renters' };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message, table: 'rental_renters' };
    }
  },

  async deleteRenter(renterId: string): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Not connected' };

    const safeId = toValidUuid(renterId);

    try {
      const { error } = await (client as any)
        .from('rental_renters')
        .delete()
        .eq('id', safeId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // ============================================================
  // Bookings & Reservations
  // ============================================================
  async fetchBookings(branchId: string): Promise<RentalBooking[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const { data, error } = await (client as any)
        .from('rental_bookings')
        .select('*')
        .eq('branch_id', safeBranchId)
        .order('start_date_time', { ascending: true });

      if (error) {
        console.warn('[rentalService] fetchBookings warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): RentalBooking => ({
        id: row.id,
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
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertBooking(booking: RentalBooking): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Not connected' };

    const safeId = toValidUuid(booking.id);
    const safeAccountId = toValidUuid(booking.tenantId);
    const safeBranchId = toValidUuid(booking.facilityId);

    try {
      const payload: any = {
        id: safeId,
        account_id: safeAccountId,
        branch_id: safeBranchId,
        renter_id: booking.renterId,
        renter_name: booking.renterName,
        renter_phone: booking.renterPhone,
        renter_email: booking.renterEmail || null,
        renter_company: booking.renterCompany || null,
        unit_id: booking.unitId,
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
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (client as any)
        .from('rental_bookings')
        .upsert(payload)
        .select();

      if (error) {
        console.warn('[rentalService] upsertBooking error:', error.message);
        return { success: false, error: error.message, table: 'rental_bookings' };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message, table: 'rental_bookings' };
    }
  },

  async deleteBooking(bookingId: string): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Not connected' };

    const safeId = toValidUuid(bookingId);

    try {
      const { error } = await (client as any)
        .from('rental_bookings')
        .delete()
        .eq('id', safeId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // ============================================================
  // Security Deposits (Caution Escrow)
  // ============================================================
  async fetchDeposits(branchId: string): Promise<SecurityDepositRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const safeBranchId = toValidUuid(branchId);

    try {
      const { data, error } = await (client as any)
        .from('security_deposits')
        .select('*')
        .eq('branch_id', safeBranchId)
        .order('collected_at', { ascending: false });

      if (error) {
        console.warn('[rentalService] fetchDeposits warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): SecurityDepositRecord => ({
        id: row.id,
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
        collectedAt: row.collected_at,
        releasedAt: row.released_at || undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertDeposit(deposit: SecurityDepositRecord): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Not connected' };

    const safeId = toValidUuid(deposit.id);
    const safeAccountId = toValidUuid(deposit.tenantId);
    const safeBranchId = toValidUuid(deposit.facilityId);

    try {
      const payload: any = {
        id: safeId,
        account_id: safeAccountId,
        branch_id: safeBranchId,
        booking_id: deposit.bookingId,
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

      const { data, error } = await (client as any)
        .from('security_deposits')
        .upsert(payload)
        .select();

      if (error) {
        console.warn('[rentalService] upsertDeposit error:', error.message);
        return { success: false, error: error.message, table: 'security_deposits' };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message, table: 'security_deposits' };
    }
  },

  async deleteDeposit(depositId: string): Promise<RentalSyncResult> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Not connected' };

    const safeId = toValidUuid(depositId);

    try {
      const { error } = await (client as any)
        .from('security_deposits')
        .delete()
        .eq('id', safeId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // ============================================================
  // Cloud Sync Health & Diagnostics
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
    const checkTable = async (tbl: string) => {
      try {
        const { error } = await (client as any).from(tbl).select('id').limit(1);
        if (!error) tablesFound.push(tbl);
      } catch {
        // ignore
      }
    };

    await Promise.all([
      checkTable('rentable_units'),
      checkTable('rental_renters'),
      checkTable('rental_bookings'),
      checkTable('security_deposits'),
    ]);

    // Test write permission
    let canWrite = false;
    let errorDetail: string | undefined;
    try {
      const testId = '00000000-0000-4000-8000-000000009999';
      const { error: testErr } = await (client as any)
        .from('rentable_units')
        .upsert({
          id: testId,
          name: '__cloud_ping_test__',
          code: '__PING__',
          type: 'Room',
          capacity: 1,
          status: 'Available',
          hourly_rate: 0,
          daily_rate: 0,
        });

      if (testErr) {
        errorDetail = testErr.message;
      } else {
        canWrite = true;
        // Clean up test row
        await (client as any).from('rentable_units').delete().eq('id', testId);
      }
    } catch (err: any) {
      errorDetail = err?.message;
    }

    return {
      configured: true,
      tablesFound,
      canWrite,
      errorDetail,
    };
  },
};
