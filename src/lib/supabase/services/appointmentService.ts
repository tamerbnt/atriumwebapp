import { getSupabaseClient } from '../client';
import { mapAppointmentFromDb } from '../mappers';
import type { Appointment, AppointmentStatus } from '../../../types/index';

export const appointmentService = {
  async fetchAppointments(branchId: string): Promise<Appointment[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('appointments')
        .select('*')
        .eq('branch_id', branchId)
        .order('date', { ascending: true });

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
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('appointments')
        .upsert({
          id: apt.id,
          account_id: apt.accountId || apt.tenantId,
          business_id: apt.businessId || undefined,
          branch_id: apt.branchId || apt.facilityId,
          client_id: apt.clientId || null,
          client_name: apt.clientName,
          client_phone: apt.clientPhone || null,
          staff_id: apt.staffId || null,
          staff_name: apt.staffName,
          service_id: apt.serviceId || null,
          service_name: apt.serviceName,
          date: apt.date,
          start_time: apt.startTime,
          end_time: apt.endTime,
          duration_minutes: apt.durationMinutes,
          price: apt.price,
          status: apt.status,
          notes: apt.notes || null,
        });

      if (error) {
        console.warn('[appointmentService] upsertAppointment notice:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.warn('[appointmentService] updateStatus notice:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },
};
