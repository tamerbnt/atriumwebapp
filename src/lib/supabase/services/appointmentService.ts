import { getSupabaseClient, toValidUuid } from '../client';
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

export const appointmentService = {
  async fetchAppointments(branchId: string, updatedAfter?: string | null): Promise<Appointment[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('salon_appointments')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('appointment_date', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) {
        console.warn('[appointmentService] fetchAppointments notice:', error.message);
        return [];
      }

      return (data || []).map(mapAppointmentFromDb);
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

    const res = await syncCoordinator.mutateOrQueueUpsert('salon_appointments', {
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
    });
    return res.success;
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueUpdate('salon_appointments', id, {
      status,
    });
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

    let query = (client as any)
      .from('salon_services')
      .select('*')
      .eq('branch_id', toValidUuid(branchId))
      .is('deleted_at', null);

    if (updatedAfter) query = query.gt('updated_at', updatedAfter);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((row: any): ServiceItem => ({
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
    }));
  },

  async upsertService(srv: ServiceItem): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: srv.accountId,
      businessId: srv.businessId,
      branchId: srv.branchId || srv.facilityId,
      staffId: srv.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_services', {
      id: toValidUuid(srv.id),
      ...trace,
      name: srv.name,
      category: srv.category || 'Hair',
      duration_minutes: srv.durationMinutes,
      price_dzd: srv.price,
      commission_percent: srv.commissionRate ?? 40,
      is_active: srv.isActive ?? true,
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

    const { data, error } = await (client as any)
      .from('salon_chair_stations')
      .select('*')
      .eq('branch_id', toValidUuid(branchId))
      .is('deleted_at', null);

    if (error) return [];
    return (data || []).map((row: any): SalonChairStation => ({
      workstationId: row.id,
      workstationName: row.chair_number,
      currentStylistName: row.stylist_name || '',
      clientName: row.current_client_name || undefined,
      serviceName: row.current_service_name || undefined,
      stage: row.status === 'Occupied' ? 'in_progress' : row.status === 'Free' ? 'waiting' : 'completed',
      startTime: row.started_at || undefined,
    }));
  },

  async upsertChairStation(
    station: SalonChairStation,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const dbStatus =
      station.stage === 'in_progress' ? 'Occupied' : station.stage === 'waiting' ? 'Free' : 'Cleaning';
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_chair_stations', {
      id: toValidUuid(station.workstationId),
      ...trace,
      chair_number: station.workstationName,
      stylist_name: station.currentStylistName || null,
      current_client_name: station.clientName || null,
      current_service_name: station.serviceName || null,
      status: dbStatus,
      started_at: station.startTime || null,
    });
    return res.success;
  },

  async fetchWorkstations(branchId: string): Promise<SalonWorkstation[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await (client as any)
      .from('salon_workstations')
      .select('*')
      .eq('branch_id', toValidUuid(branchId))
      .is('deleted_at', null);

    if (error) return [];
    return (data || []).map((row: any): SalonWorkstation => ({
      id: row.id,
      name: row.name,
      type: (row.zone || 'StylingChair') as SalonWorkstation['type'],
      assignedStaffName: row.assigned_stylist_name || undefined,
      isAvailable: row.status !== 'Occupied',
    }));
  },

  async fetchStylistPayouts(branchId: string): Promise<StylistPayout[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await (client as any)
      .from('salon_stylist_payouts')
      .select('*')
      .eq('branch_id', toValidUuid(branchId))
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((row: any): StylistPayout => {
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
      };
    });
  },

  async upsertStylistPayout(
    payout: StylistPayout,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_stylist_payouts', {
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
    });
    return res.success;
  },
};
