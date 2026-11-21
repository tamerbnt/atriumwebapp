import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { mapAppointmentFromDb } from '../mappers';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  Appointment,
  AppointmentStatus,
  ServiceItem,
  SalonWorkstation,
  SalonChairStation,
  StylistPayout,
} from '../../../types/index';

export const mapSalonServiceFromDb = (row: any): ServiceItem => ({
  id: row.id,
  facilityId: row.branch_id,
  accountId: row.account_id,
  businessId: row.business_id,
  branchId: row.branch_id,
  staffId: row.staff_id || undefined,
  name: row.name,
  category: (row.category || 'Hair') as ServiceItem['category'],
  durationMinutes: Number(row.duration_minutes || 45),
  price: Number(row.price_dzd || 0),
  commissionRate: Number(row.commission_percent || 40),
  isActive: row.is_active ?? true,
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapSalonWorkstationFromDb = (row: any): SalonWorkstation => ({
  id: row.id,
  name: row.name,
  type: (row.zone || 'StylingChair') as SalonWorkstation['type'],
  assignedStaffName: row.assigned_stylist_name || undefined,
  isAvailable: row.status !== 'Occupied',
  version: row.version != null ? Number(row.version) : undefined,
});

export const mapStylistPayoutFromDb = (row: any): StylistPayout => {
  const [periodStart = '', periodEnd = ''] = String(row.period_label || '').split('..');
  const commissionAmount = Number(row.commission_amount_dzd || 0);
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    staffId: row.stylist_id || '',
    staffName: row.stylist_name,
    periodStart,
    periodEnd: periodEnd || periodStart,
    totalServicesCount: Number(row.services_count || 0),
    totalServiceRevenue: Number(row.gross_revenue_dzd || 0),
    commissionRate: Number(row.commission_rate || 40),
    commissionAmount,
    retailSalesCount: 0,
    retailSalesRevenue: 0,
    retailCommissionAmount: 0,
    totalPayout: commissionAmount,
    status: row.status || 'Pending',
    paymentMethod: row.payment_method || undefined,
    paidAt: row.paid_at || undefined,
    version: row.version != null ? Number(row.version) : undefined,
  };
};

export const appointmentService = {
  async fetchAppointments(branchId: string, updatedAfter?: string | null): Promise<Appointment[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('salon_appointments')
          .select(
            'id, account_id, business_id, branch_id, stylist_id, staff_id, client_id, client_name, client_phone, staff_name, service_id, service_name, appointment_date, start_time, end_time, duration_minutes, price, status, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('appointment_date', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return rows.map(mapAppointmentFromDb);
    } catch {
      return [];
    }
  },

  async upsertAppointment(apt: Appointment): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: apt.accountId || apt.tenantId,
      businessId: apt.businessId,
      branchId: apt.branchId || apt.facilityId,
      staffId: apt.staffId,
    });

    const payload = {
      id: toValidUuid(apt.id),
      ...trace,
      client_id: apt.clientId ? toValidUuid(apt.clientId) : null,
      client_name: apt.clientName,
      client_phone: apt.clientPhone || null,
      stylist_id: apt.staffId ? toValidUuid(apt.staffId) : null,
      staff_name: apt.staffName,
      service_id: apt.serviceId ? toValidUuid(apt.serviceId) : null,
      service_name: apt.serviceName,
      appointment_date: apt.date,
      start_time: apt.startTime,
      end_time: apt.endTime,
      duration_minutes: apt.durationMinutes,
      price: apt.price,
      status: apt.status,
      notes: apt.notes || null,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('salon_appointments', payload, {
      expectedVersion: apt.version,
      entityType: 'Appointment',
      entityLabel: `${apt.clientName} — ${apt.serviceName}`,
      localData: payload,
    });
    return res.success;
  },

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    expectedVersion?: number
  ): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueUpdate(
      'salon_appointments',
      id,
      { status },
      {
        expectedVersion,
        entityType: 'Appointment',
        localData: { status },
      }
    );
    return res.success;
  },

  async deleteAppointment(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('salon_appointments', id, deletedByStaffId);
    return res.success;
  },

  async checkoutAppointment(
    appointmentId: string,
    paymentMethod: 'Cash' | 'Card' | 'MemberBalance' = 'Cash',
    deviceId?: string
  ) {
    return syncCoordinator.rpcOrQueue('salon_checkout_appointment', {
      p_appointment_id: toValidUuid(appointmentId),
      p_payment_method: paymentMethod,
      p_device_id: deviceId || null,
    });
  },

  async fetchServices(branchId: string, updatedAfter?: string | null): Promise<ServiceItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('salon_services')
        .select(
          'id, account_id, business_id, branch_id, staff_id, name, category, duration_minutes, price_dzd, commission_percent, is_active, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map(mapSalonServiceFromDb);
  },

  async upsertService(srv: ServiceItem): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: srv.accountId,
      businessId: srv.businessId,
      branchId: srv.branchId || srv.facilityId,
      staffId: srv.staffId,
    });
    const payload = {
      id: toValidUuid(srv.id),
      ...trace,
      name: srv.name,
      category: srv.category || 'Hair',
      duration_minutes: srv.durationMinutes,
      price_dzd: srv.price,
      commission_percent: srv.commissionRate ?? 40,
      is_active: srv.isActive ?? true,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_services', payload, {
      expectedVersion: srv.version,
      entityType: 'ServiceItem',
      entityLabel: srv.name,
      localData: payload,
    });
    return res.success;
  },

  async deleteService(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('salon_services', id, deletedByStaffId);
    return res.success;
  },

  async fetchChairStations(branchId: string): Promise<SalonChairStation[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('salon_chair_stations')
        .select(
          'id, chair_number, stylist_name, current_client_name, current_service_name, status, started_at, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map((row: any): SalonChairStation => ({
      workstationId: row.id,
      workstationName: row.chair_number,
      currentStylistName: row.stylist_name || '',
      clientName: row.current_client_name || undefined,
      serviceName: row.current_service_name || undefined,
      stage: row.status === 'Occupied' ? 'in_progress' : row.status === 'Free' ? 'waiting' : 'completed',
      startTime: row.started_at || undefined,
      version: row.version != null ? Number(row.version) : undefined,
    }));
  },

  async upsertChairStation(
    station: SalonChairStation,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const dbStatus =
      station.stage === 'in_progress' ? 'Occupied' : station.stage === 'waiting' ? 'Free' : 'Cleaning';
    const payload = {
      id: toValidUuid(station.workstationId),
      ...trace,
      chair_number: station.workstationName,
      stylist_name: station.currentStylistName || null,
      current_client_name: station.clientName || null,
      current_service_name: station.serviceName || null,
      status: dbStatus,
      started_at: station.startTime || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_chair_stations', payload, {
      expectedVersion: station.version,
      entityType: 'SalonChairStation',
      entityLabel: station.workstationName,
      localData: payload,
    });
    return res.success;
  },

  async fetchWorkstations(branchId: string): Promise<SalonWorkstation[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('salon_workstations')
        .select('id, name, zone, assigned_stylist_name, status, version')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to)
    );
    return data.map(mapSalonWorkstationFromDb);
  },

  async fetchStylistPayouts(branchId: string): Promise<StylistPayout[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) =>
      (client as any)
        .from('salon_stylist_payouts')
        .select(
          'id, account_id, business_id, branch_id, stylist_id, stylist_name, period_label, services_count, gross_revenue_dzd, commission_rate, commission_amount_dzd, status, payment_method, paid_at, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    );
    return data.map(mapStylistPayoutFromDb);
  },

  async upsertStylistPayout(
    payout: StylistPayout,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(payout.id),
      ...trace,
      stylist_id: payout.staffId ? toValidUuid(payout.staffId) : null,
      stylist_name: payout.staffName,
      period_label: `${payout.periodStart}..${payout.periodEnd}`,
      services_count: payout.totalServicesCount,
      gross_revenue_dzd: payout.totalServiceRevenue,
      commission_rate: payout.commissionRate,
      commission_amount_dzd: payout.commissionAmount,
      status: payout.status,
      payment_method: payout.paymentMethod || null,
      paid_at: payout.paidAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_stylist_payouts', payload, {
      expectedVersion: payout.version,
      entityType: 'StylistPayout',
      entityLabel: `${payout.staffName} (${payout.periodStart}..${payout.periodEnd})`,
      localData: payload,
    });
    return res.success;
  },
};
