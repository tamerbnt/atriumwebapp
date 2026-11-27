import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { mapAppointmentFromDb } from '../mappers';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  Appointment,
  AppointmentStatus,
  SalonChairStation,
  SalonConsentForm,
  SalonGiftCard,
  SalonHammamSession,
  SalonLoyaltyEntry,
  SalonPrepaidPackage,
  SalonWorkstation,
  ServiceItem,
  StylistPayout,
  StylistScheduleConfig,
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
  bufferMinutes: row.buffer_minutes != null ? Number(row.buffer_minutes) : undefined,
  costPrice: row.cost_price_centimes != null ? Number(row.cost_price_centimes) / 100 : undefined,
  consumables: Array.isArray(row.consumables) ? row.consumables : [],
  allergyKeywords: Array.isArray(row.allergy_keywords) ? row.allergy_keywords : [],
  requiresConsent: Boolean(row.requires_consent),
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
            'id, account_id, business_id, branch_id, stylist_id, staff_id, client_id, client_name, client_phone, staff_name, service_id, service_name, appointment_date, start_time, end_time, duration_minutes, price, status, notes, deposit_centimes, deposit_status, cancellation_cutoff_hours, refunded_deposit_centimes, allergy_override_confirmed, booking_channel, consumables_deducted, package_id, gift_card_code, loyalty_points_used, loyalty_points_earned, is_paid, payment_method, version, created_at'
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
      deposit_centimes: apt.depositCentimes ?? 0,
      deposit_status: apt.depositStatus ?? 'none',
      cancellation_cutoff_hours: apt.cancellationCutoffHours ?? 24,
      refunded_deposit_centimes: apt.refundedDepositCentimes ?? 0,
      allergy_override_confirmed: Boolean(apt.allergyOverrideConfirmed),
      booking_channel: apt.bookingChannel ?? 'desk',
      consumables_deducted: Boolean(apt.consumablesDeducted),
      package_id: apt.packageId ? toValidUuid(apt.packageId) : null,
      gift_card_code: apt.giftCardCode || null,
      loyalty_points_used: apt.loyaltyPointsUsed ?? 0,
      loyalty_points_earned: apt.loyaltyPointsEarned ?? 0,
      is_paid: Boolean(apt.isPaid),
      payment_method: apt.paymentMethod || null,
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
          'id, account_id, business_id, branch_id, staff_id, name, category, duration_minutes, price_dzd, commission_percent, buffer_minutes, cost_price_centimes, consumables, allergy_keywords, requires_consent, is_active, version'
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
      buffer_minutes: srv.bufferMinutes ?? 0,
      cost_price_centimes: srv.costPrice != null ? Math.round(srv.costPrice * 100) : 0,
      consumables: Array.isArray(srv.consumables) ? srv.consumables : [],
      allergy_keywords: Array.isArray(srv.allergyKeywords) ? srv.allergyKeywords : [],
      requires_consent: Boolean(srv.requiresConsent),
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

  async fetchChairStations(branchId: string, updatedAfter?: string | null): Promise<SalonChairStation[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const data = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('salon_chair_stations')
        .select(
          'id, chair_number, stylist_id, stylist_name, current_appointment_id, current_client_name, current_service_name, service_price_centimes, stage, status, started_at, version'
        )
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return data.map((row: any): SalonChairStation => {
      const priceCentimes =
        row.service_price_centimes != null ? Number(row.service_price_centimes) : undefined;
      const stage =
        row.stage === 'in_progress' || row.stage === 'completed' || row.stage === 'paid'
          ? row.stage
          : row.status === 'Occupied'
          ? 'in_progress'
          : row.status === 'Free'
          ? 'waiting'
          : 'completed';
      return {
        workstationId: row.id,
        workstationName: row.chair_number,
        currentStylistId: row.stylist_id || undefined,
        currentStylistName: row.stylist_name || '',
        currentAppointmentId: row.current_appointment_id || undefined,
        clientName: row.current_client_name || undefined,
        serviceName: row.current_service_name || undefined,
        servicePriceCentimes: priceCentimes,
        servicePriceDzd: priceCentimes != null ? priceCentimes / 100 : undefined,
        stage,
        startTime: row.started_at || undefined,
        version: row.version != null ? Number(row.version) : undefined,
      };
    });
  },

  async upsertChairStation(
    station: SalonChairStation,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const dbStatus =
      station.stage === 'in_progress'
        ? 'Occupied'
        : station.stage === 'completed'
        ? 'Occupied'
        : station.clientName
        ? 'Occupied'
        : 'Free';
    const priceCentimes =
      station.servicePriceCentimes != null
        ? Math.round(station.servicePriceCentimes)
        : station.servicePriceDzd != null
        ? Math.round(station.servicePriceDzd * 100)
        : null;
    const payload = {
      id: toValidUuid(station.workstationId),
      ...trace,
      chair_number: station.workstationName,
      stylist_id: station.currentStylistId ? toValidUuid(station.currentStylistId) : null,
      stylist_name: station.currentStylistName || null,
      current_appointment_id: station.currentAppointmentId
        ? toValidUuid(station.currentAppointmentId)
        : null,
      current_client_name: station.clientName || null,
      current_service_name: station.serviceName || null,
      service_price_centimes: priceCentimes,
      stage: station.stage || 'waiting',
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

  async cancelWithDeposit(
    appointmentId: string,
    cancelledAtIso: string,
    newStatus: 'Cancelled' | 'NoShow' = 'Cancelled'
  ) {
    return syncCoordinator.rpcOrQueue('cancel_salon_appointment_with_deposit', {
      p_appointment_id: toValidUuid(appointmentId),
      p_cancelled_at: cancelledAtIso,
      p_new_status: newStatus,
    });
  },

  async redeemPackageOrGiftCard(params: {
    packageId?: string;
    giftCardId?: string;
    amountCentimes?: number;
  }) {
    return syncCoordinator.rpcOrQueue('redeem_salon_package_or_gift_card', {
      p_package_id: params.packageId ? toValidUuid(params.packageId) : null,
      p_gift_card_id: params.giftCardId ? toValidUuid(params.giftCardId) : null,
      p_amount_centimes: Math.max(0, Math.round(Number(params.amountCentimes || 0))),
    });
  },

  async fetchStylistSchedules(branchId: string): Promise<StylistScheduleConfig[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('salon_stylist_schedules')
          .select('id, account_id, business_id, branch_id, staff_id, staff_name, salon_closing_time, weekly_hours, time_off_ranges, version, updated_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('id', { ascending: true })
          .range(from, to)
      );
      return rows.map((r: any): StylistScheduleConfig => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        staffId: r.staff_id,
        staffName: r.staff_name || '',
        salonClosingTime: r.salon_closing_time || '20:00',
        weeklyHours: r.weekly_hours || {},
        timeOffRanges: Array.isArray(r.time_off_ranges) ? r.time_off_ranges : [],
        version: r.version != null ? Number(r.version) : undefined,
        updatedAt: r.updated_at || undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertStylistSchedule(
    sched: StylistScheduleConfig,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(sched.id),
      ...trace,
      staff_id: toValidUuid(sched.staffId),
      staff_name: sched.staffName,
      salon_closing_time: sched.salonClosingTime || '20:00',
      weekly_hours: sched.weeklyHours || {},
      time_off_ranges: Array.isArray(sched.timeOffRanges) ? sched.timeOffRanges : [],
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_stylist_schedules', payload, {
      expectedVersion: sched.version,
      entityType: 'StylistScheduleConfig',
      entityLabel: sched.staffName,
      localData: payload,
    });
    return res.success;
  },

  async fetchPrepaidPackages(branchId: string): Promise<SalonPrepaidPackage[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('salon_prepaid_packages')
          .select('id, account_id, business_id, branch_id, client_id, client_name, package_name, service_ids, category_filter, total_sessions, remaining_sessions, price_centimes, expires_at, status, version, created_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((r: any): SalonPrepaidPackage => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        clientId: r.client_id || '',
        clientName: r.client_name,
        packageName: r.package_name,
        serviceIds: Array.isArray(r.service_ids) ? r.service_ids : [],
        categoryFilter: r.category_filter || undefined,
        totalSessions: Number(r.total_sessions || 1),
        remainingSessions: Number(r.remaining_sessions || 0),
        priceCentimes: Number(r.price_centimes || 0),
        expiresAt: r.expires_at || undefined,
        status: r.status || 'active',
        createdAt: r.created_at,
        version: r.version != null ? Number(r.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertPrepaidPackage(
    pkg: SalonPrepaidPackage,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(pkg.id),
      ...trace,
      client_id: pkg.clientId ? toValidUuid(pkg.clientId) : null,
      client_name: pkg.clientName,
      package_name: pkg.packageName,
      service_ids: pkg.serviceIds || [],
      category_filter: pkg.categoryFilter || null,
      total_sessions: pkg.totalSessions,
      remaining_sessions: pkg.remainingSessions,
      price_centimes: pkg.priceCentimes,
      expires_at: pkg.expiresAt || null,
      status: pkg.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_prepaid_packages', payload, {
      expectedVersion: pkg.version,
      entityType: 'SalonPrepaidPackage',
      entityLabel: pkg.packageName,
      localData: payload,
    });
    return res.success;
  },

  async fetchGiftCards(branchId: string): Promise<SalonGiftCard[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('salon_gift_cards')
          .select('id, account_id, business_id, branch_id, code, recipient_name, recipient_phone, purchaser_name, initial_centimes, remaining_centimes, expires_at, status, version, created_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((r: any): SalonGiftCard => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        code: r.code,
        recipientName: r.recipient_name,
        recipientPhone: r.recipient_phone || undefined,
        purchaserName: r.purchaser_name || undefined,
        initialCentimes: Number(r.initial_centimes || 0),
        remainingCentimes: Number(r.remaining_centimes || 0),
        expiresAt: r.expires_at || undefined,
        status: r.status || 'active',
        createdAt: r.created_at,
        version: r.version != null ? Number(r.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertGiftCard(
    gc: SalonGiftCard,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(gc.id),
      ...trace,
      code: gc.code,
      recipient_name: gc.recipientName,
      recipient_phone: gc.recipientPhone || null,
      purchaser_name: gc.purchaserName || null,
      initial_centimes: gc.initialCentimes,
      remaining_centimes: gc.remainingCentimes,
      expires_at: gc.expiresAt || null,
      status: gc.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_gift_cards', payload, {
      expectedVersion: gc.version,
      entityType: 'SalonGiftCard',
      entityLabel: gc.code,
      localData: payload,
    });
    return res.success;
  },

  async fetchLoyaltyLedger(branchId: string): Promise<SalonLoyaltyEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('salon_loyalty_ledger')
          .select('id, account_id, business_id, branch_id, client_id, client_name, appointment_id, points_delta, balance_after, reason, recorded_at, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('recorded_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((r: any): SalonLoyaltyEntry => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        clientId: r.client_id,
        clientName: r.client_name || undefined,
        appointmentId: r.appointment_id || undefined,
        pointsDelta: Number(r.points_delta || 0),
        balanceAfter: Number(r.balance_after || 0),
        reason: r.reason,
        recordedAt: r.recorded_at,
        version: r.version != null ? Number(r.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertLoyaltyEntry(
    entry: SalonLoyaltyEntry,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      client_id: toValidUuid(entry.clientId),
      client_name: entry.clientName || null,
      appointment_id: entry.appointmentId ? toValidUuid(entry.appointmentId) : null,
      points_delta: entry.pointsDelta,
      balance_after: entry.balanceAfter,
      reason: entry.reason,
      recorded_at: entry.recordedAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_loyalty_ledger', payload, {
      expectedVersion: entry.version,
      entityType: 'SalonLoyaltyEntry',
      entityLabel: entry.reason,
      localData: payload,
    });
    return res.success;
  },

  async fetchConsentForms(branchId: string): Promise<SalonConsentForm[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('salon_consent_forms')
          .select('id, account_id, business_id, branch_id, client_id, client_name, appointment_id, service_id, service_name, protocol_type, medical_checklist, allergies_acknowledged, signature_data_url, before_photo_path, after_photo_path, signed_at, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('signed_at', { ascending: false })
          .range(from, to)
      );
      return rows.map((r: any): SalonConsentForm => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        clientId: r.client_id || '',
        clientName: r.client_name,
        appointmentId: r.appointment_id || undefined,
        serviceId: r.service_id || undefined,
        serviceName: r.service_name,
        protocolType: r.protocol_type,
        medicalChecklist: r.medical_checklist || {},
        allergiesAcknowledged: Boolean(r.allergies_acknowledged),
        signatureDataUrl: r.signature_data_url,
        beforePhotoPath: r.before_photo_path || undefined,
        afterPhotoPath: r.after_photo_path || undefined,
        signedAt: r.signed_at,
        version: r.version != null ? Number(r.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertConsentForm(
    form: SalonConsentForm,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(form.id),
      ...trace,
      client_id: form.clientId ? toValidUuid(form.clientId) : null,
      client_name: form.clientName,
      appointment_id: form.appointmentId ? toValidUuid(form.appointmentId) : null,
      service_id: form.serviceId ? toValidUuid(form.serviceId) : null,
      service_name: form.serviceName,
      protocol_type: form.protocolType,
      medical_checklist: form.medicalChecklist || {},
      allergies_acknowledged: Boolean(form.allergiesAcknowledged),
      signature_data_url: form.signatureDataUrl,
      before_photo_path: form.beforePhotoPath || null,
      after_photo_path: form.afterPhotoPath || null,
      signed_at: form.signedAt,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_consent_forms', payload, {
      expectedVersion: form.version,
      entityType: 'SalonConsentForm',
      entityLabel: `${form.clientName} — ${form.serviceName}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchHammamSessions(branchId: string): Promise<SalonHammamSession[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('salon_hammam_sessions')
          .select('id, account_id, business_id, branch_id, cabin_name, gender_block, client_id, client_name, client_phone, attendant_id, attendant_name, session_date, start_time, end_time, capacity, booked_count, addons, price_centimes, status, notes, created_at, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('session_date', { ascending: true })
          .range(from, to)
      );
      return rows.map((r: any): SalonHammamSession => ({
        id: r.id,
        accountId: r.account_id,
        businessId: r.business_id,
        branchId: r.branch_id,
        cabinName: r.cabin_name,
        genderBlock: r.gender_block,
        clientId: r.client_id || undefined,
        clientName: r.client_name,
        clientPhone: r.client_phone || undefined,
        attendantId: r.attendant_id || undefined,
        attendantName: r.attendant_name || undefined,
        date: r.session_date,
        startTime: r.start_time,
        endTime: r.end_time,
        capacity: Number(r.capacity || 1),
        bookedCount: Number(r.booked_count || 1),
        addons: Array.isArray(r.addons) ? r.addons : [],
        priceCentimes: Number(r.price_centimes || 0),
        status: r.status || 'Booked',
        notes: r.notes || undefined,
        createdAt: r.created_at,
        version: r.version != null ? Number(r.version) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async upsertHammamSession(
    session: SalonHammamSession,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope(ctx);
    const payload = {
      id: toValidUuid(session.id),
      ...trace,
      cabin_name: session.cabinName,
      gender_block: session.genderBlock,
      client_id: session.clientId ? toValidUuid(session.clientId) : null,
      client_name: session.clientName,
      client_phone: session.clientPhone || null,
      attendant_id: session.attendantId ? toValidUuid(session.attendantId) : null,
      attendant_name: session.attendantName || null,
      session_date: session.date,
      start_time: session.startTime,
      end_time: session.endTime,
      capacity: session.capacity,
      booked_count: session.bookedCount,
      addons: session.addons || [],
      price_centimes: session.priceCentimes,
      status: session.status,
      notes: session.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('salon_hammam_sessions', payload, {
      expectedVersion: session.version,
      entityType: 'SalonHammamSession',
      entityLabel: `${session.cabinName} — ${session.clientName}`,
      localData: payload,
    });
    return res.success;
  },
};
