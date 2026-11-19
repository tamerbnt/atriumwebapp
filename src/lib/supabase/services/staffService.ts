import { getSupabaseClient, isUuid, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import {
  mapStaffFromDb,
  mapStaffRoleToDb,
  mapAttendanceLogFromDb,
  mapSalaryAdvanceFromDb,
  mapPayrollRunFromDb,
  mapPayrollSlipFromDb,
} from '../mappers';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  StaffMember,
  StaffAttendanceLogRecord,
  StaffSalaryAdvance,
  StaffPayrollRunRecord,
  StaffPayrollSlipRecord,
} from '../../../types/index';

export const staffService = {
  async getStaffProfiles(email: string) {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client.rpc('get_staff_profiles', {
      p_email: email.trim().toLowerCase(),
    });

    if (error) {
      console.warn('[staffService] get_staff_profiles RPC failed:', error);
      return [];
    }
    return data || [];
  },

  async verifyPin(branchId: string, pin: string) {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'UNCONFIGURED' };

    const { data, error } = await (client as any).rpc('verify_staff_pin', {
      p_branch_id: toValidUuid(branchId),
      p_pin: pin,
    });
    if (error) return { success: false, error: error.message };
    return data || { success: false };
  },

  async setPin(staffId: string, newPin: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || !isUuid(staffId)) return false;

    const { data, error } = await (client as any).rpc('set_staff_pin', {
      p_staff_id: staffId,
      p_new_pin: newPin,
    });
    return !error && Boolean((data as any)?.success);
  },

  async fetchStaffForSync(
    accountId: string,
    branchId?: string,
    updatedAfter?: string | null
  ): Promise<StaffMember[]> {
    const client = getSupabaseClient();
    if (!client || !isUuid(accountId)) return [];

    try {
      const { data: rpcData, error: rpcError } = await client.rpc('get_staff_for_sync', {
        p_account_id: accountId,
        p_facility_id: branchId && isUuid(branchId) ? branchId : null,
        p_updated_after: updatedAfter || null,
      });

      if (!rpcError && Array.isArray(rpcData)) {
        return rpcData.map((row: any) => mapStaffFromDb(row, branchId));
      }
    } catch {
      // Fallback below
    }

    try {
      const rows = await fetchAllPages(
        (from, to) => {
          let query = client
            .from('staff')
            .select('*')
            .eq('account_id', accountId)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('id', { ascending: true })
            .range(from, to);

          if (updatedAfter) {
            query = query.gt('updated_at', updatedAfter);
          }
          return query;
        },
        { throwOnError: true }
      );
      return rows.map((row) => mapStaffFromDb(row, branchId));
    } catch (error) {
      console.warn('[staffService] fetchStaff failed:', error);
      return [];
    }
  },

  async createStaff(staff: StaffMember): Promise<StaffMember | null> {
    const trace = buildTraceEnvelope({
      accountId: staff.accountId || staff.tenantId,
      businessId: staff.businessId,
      branchId: staff.branchId || staff.facilityId,
      staffId: staff.staffId,
    });

    const payload: Record<string, any> = {
      id: toValidUuid(staff.id),
      account_id: trace.account_id,
      business_id: trace.business_id,
      branch_id: trace.branch_id,
      updated_by_staff_id: trace.updated_by_staff_id,
      device_id: trace.device_id,
      full_name: staff.fullName,
      email: staff.email || null,
      phone: staff.phoneNumber || null,
      role: mapStaffRoleToDb(staff.role),
      salary: staff.salary || 0,
      payment_day: staff.paymentDay || 1,
      ccp_number: staff.ccpNumber || null,
      ccp_key: staff.ccpKey || null,
      bank_rib: staff.bankRib || null,
      payment_method: staff.paymentMethod || 'cash',
      card_id: staff.cardId || null,
      badge_token: staff.badgeToken || null,
      status: staff.status || 'active',
      is_active: staff.isActive ?? true,
      updated_at: trace.updated_at,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('staff', payload, {
      expectedVersion: staff.version,
      entityType: 'Staff',
      entityLabel: staff.fullName,
      localData: payload,
    });
    if (res.success && staff.pinCode && staff.pinCode !== '****') {
      await staffService.setPin(payload.id, staff.pinCode);
    }
    return { ...staff, id: payload.id };
  },

  async updateStaff(staff: StaffMember): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: staff.accountId || staff.tenantId,
      businessId: staff.businessId,
      branchId: staff.branchId || staff.facilityId,
      staffId: staff.staffId,
    });

    const payload: Record<string, any> = {
      id: toValidUuid(staff.id),
      account_id: trace.account_id,
      business_id: trace.business_id,
      branch_id: trace.branch_id,
      updated_by_staff_id: trace.updated_by_staff_id,
      device_id: trace.device_id,
      full_name: staff.fullName,
      email: staff.email || null,
      phone: staff.phoneNumber || null,
      role: mapStaffRoleToDb(staff.role),
      salary: staff.salary || 0,
      payment_day: staff.paymentDay || 1,
      ccp_number: staff.ccpNumber || null,
      ccp_key: staff.ccpKey || null,
      bank_rib: staff.bankRib || null,
      payment_method: staff.paymentMethod || 'cash',
      card_id: staff.cardId || null,
      badge_token: staff.badgeToken || null,
      status: staff.status || 'active',
      is_active: staff.isActive ?? true,
      updated_at: trace.updated_at,
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('staff', payload, {
      expectedVersion: staff.version,
      entityType: 'Staff',
      entityLabel: staff.fullName,
      localData: payload,
    });
    if (res.success && staff.pinCode && staff.pinCode !== '****') {
      await staffService.setPin(payload.id, staff.pinCode);
    }
    return res.success;
  },

  async deleteStaff(staffId: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('staff', staffId, deletedByStaffId);
    return res.success;
  },

  // ========================================================================
  // Workforce ERP: Attendance, Salary Advances, Payroll Runs & Slips
  // ========================================================================
  async fetchAttendanceLogs(branchId: string, updatedAfter?: string | null): Promise<StaffAttendanceLogRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('staff_attendance_logs')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('log_timestamp', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return rows.map(mapAttendanceLogFromDb);
  },

  async upsertAttendanceLog(entry: StaffAttendanceLogRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      staff_name: entry.staffName,
      staff_role: entry.staffRole,
      log_timestamp: entry.timestamp,
      log_date: entry.date,
      type: entry.type,
      method: entry.method,
      terminal_id: entry.terminalId || null,
      notes: entry.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('staff_attendance_logs', payload, {
      expectedVersion: entry.version,
      entityType: 'StaffAttendanceLog',
      entityLabel: `${entry.staffName} (${entry.date})`,
      localData: payload,
    });
    return res.success;
  },

  async fetchSalaryAdvances(branchId: string, updatedAfter?: string | null): Promise<StaffSalaryAdvance[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('staff_salary_advances')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('date_issued', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return rows.map(mapSalaryAdvanceFromDb);
  },

  async upsertSalaryAdvance(adv: StaffSalaryAdvance): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: adv.accountId,
      businessId: adv.businessId,
      branchId: adv.branchId,
      staffId: adv.staffId,
    });
    const payload = {
      id: toValidUuid(adv.id),
      ...trace,
      staff_name: adv.staffName,
      amount_dzd: adv.amountDzd,
      date_issued: adv.dateIssued,
      payment_method: adv.paymentMethod,
      reason: adv.reason || null,
      voucher_number: adv.voucherNumber,
      status: adv.status,
      deducted_in_period: adv.deductedInPeriod || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('staff_salary_advances', payload, {
      expectedVersion: adv.version,
      entityType: 'StaffSalaryAdvance',
      entityLabel: `${adv.staffName} (${adv.voucherNumber})`,
      localData: payload,
    });
    return res.success;
  },

  async fetchPayrollRuns(branchId: string, updatedAfter?: string | null): Promise<StaffPayrollRunRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('staff_payroll_runs')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return rows.map(mapPayrollRunFromDb);
  },

  async upsertPayrollRun(run: StaffPayrollRunRecord, category = 'membership_session'): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: run.accountId,
      businessId: run.businessId,
      branchId: run.branchId,
    });
    const payload = {
      id: toValidUuid(run.id),
      ...trace,
      category,
      period_month: run.periodMonth,
      period_year: run.periodYear,
      title: run.title,
      status: run.status,
      total_gross_cotisable: run.totalGrossCotisable,
      total_cnas_salarial: run.totalCnasSalarial,
      total_cnas_patronal: run.totalCnasPatronal,
      total_irg: run.totalIrg,
      total_net: run.totalNet,
      slips_count: run.slipsCount,
      approved_at: run.approvedAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('staff_payroll_runs', payload, {
      expectedVersion: run.version,
      entityType: 'StaffPayrollRun',
      entityLabel: run.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchPayrollSlips(branchId: string, updatedAfter?: string | null): Promise<StaffPayrollSlipRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('staff_payroll_slips')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);
      return query;
    });
    return rows.map(mapPayrollSlipFromDb);
  },

  async upsertPayrollSlip(
    slip: StaffPayrollSlipRecord,
    ctx: { accountId: string; businessId: string; branchId: string }
  ): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: ctx.accountId,
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      staffId: slip.staffId,
    });
    const payload = {
      id: toValidUuid(slip.id),
      ...trace,
      payroll_run_id: toValidUuid(slip.payrollRunId),
      matricule: slip.matricule,
      staff_full_name: slip.staffFullName,
      role: slip.role,
      period_month: slip.periodMonth,
      period_year: slip.periodYear,
      period_label: slip.periodLabel,
      base_salary: slip.baseSalary,
      actual_base_salary: slip.actualBaseSalary,
      worked_days: slip.workedDays,
      standard_days: slip.standardDays,
      coaching_commission: slip.coachingCommission,
      primes_cotisables: slip.primesCotisables,
      salaire_brut_cotisable: slip.salaireBrutCotisable,
      cnas_salarial: slip.cnasSalarial,
      cnas_patronal: slip.cnasPatronal,
      salaire_brut_imposable: slip.salaireBrutImposable,
      irg_tax: slip.irgTax,
      primes_non_imposables: slip.primesNonImposables,
      acomptes_deduits: slip.acomptesDeduits,
      autres_retenues: slip.autresRetenues,
      net_a_payer: slip.netAPayer,
      payment_method: slip.paymentMethod,
      ccp_number: slip.ccpNumber || null,
      ccp_key: slip.ccpKey || null,
      bank_rib: slip.bankRib || null,
      nss: slip.nss || null,
      is_paid: slip.isPaid,
      paid_date: slip.paidDate || null,
      receipt_number: slip.receiptNumber,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('staff_payroll_slips', payload, {
      expectedVersion: slip.version,
      entityType: 'StaffPayrollSlip',
      entityLabel: `${slip.staffFullName} (${slip.periodLabel})`,
      localData: payload,
    });
    return res.success;
  },
};
