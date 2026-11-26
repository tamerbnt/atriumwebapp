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
            .select(
              'id, account_id, business_id, branch_id, full_name, email, phone, role, is_active, created_at, salary, payment_day, ccp_number, ccp_key, bank_rib, payment_method, card_id, badge_token, status, version'
            )
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
        .select(
          'id, account_id, business_id, branch_id, staff_id, staff_name, staff_role, log_timestamp, log_date, type, method, source, entered_by, entered_by_name, terminal_id, notes, version'
        )
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
      source: entry.source || entry.method || 'kiosk',
      entered_by: entry.enteredBy && isUuid(entry.enteredBy) ? entry.enteredBy : null,
      entered_by_name: entry.enteredByName || null,
      terminal_id: entry.terminalId || null,
      notes: entry.notes || null,
    };
    // staff_attendance_logs is append-only in DB; insert via upsert(onConflict id) for offline retry safety
    const res = await syncCoordinator.mutateOrQueueUpsert('staff_attendance_logs', payload, {
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
        .select(
          'id, account_id, business_id, branch_id, staff_id, staff_name, amount_dzd, date_issued, payment_method, reason, voucher_number, status, deducted_in_period, version'
        )
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
      status: adv.status === 'deducted' ? 'pending' : adv.status,
      deducted_in_period: adv.status === 'deducted' ? null : adv.deductedInPeriod || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('staff_salary_advances', payload, {
      expectedVersion: adv.version,
      entityType: 'StaffSalaryAdvance',
      entityLabel: `${adv.staffName} (${adv.voucherNumber})`,
      localData: payload,
    });
    return res.success;
  },

  async waiveSalaryAdvance(advance: StaffSalaryAdvance): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueUpdate(
      'staff_salary_advances',
      advance.id,
      { status: 'waived' },
      {
        expectedVersion: advance.version,
        entityType: 'StaffSalaryAdvance',
        entityLabel: `${advance.staffName} (${advance.voucherNumber})`,
        localData: { ...advance, status: 'waived' },
      }
    );
    return res.success;
  },

  async fetchPayrollRuns(branchId: string, updatedAfter?: string | null): Promise<StaffPayrollRunRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const rows = await fetchAllPages<any>((from, to) => {
      let query = (client as any)
        .from('staff_payroll_runs')
        .select(
          'id, account_id, business_id, branch_id, category, period_month, period_year, title, status, run_type, adjustment_seq, rate_set_id, rate_basis, rate_snapshot, total_gross_cotisable, total_cnas_salarial, total_cnas_patronal, total_irg, total_net, slips_count, approved_at, approved_by, version, created_at'
        )
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
    const validRateSetId = run.rateSetId && isUuid(run.rateSetId) ? run.rateSetId : null;
    const payload = {
      id: toValidUuid(run.id),
      ...trace,
      category: run.category || category,
      period_month: run.periodMonth,
      period_year: run.periodYear,
      title: run.title,
      status: run.status,
      run_type: run.runType || 'regular',
      adjustment_seq: run.adjustmentSeq ?? 0,
      rate_set_id: validRateSetId,
      rate_basis: run.rateBasis || (validRateSetId ? 'versioned' : 'legacy'),
      rate_snapshot: run.rateSnapshot ?? null,
      total_gross_cotisable: run.totalGrossCotisable,
      total_cnas_salarial: run.totalCnasSalarial,
      total_cnas_patronal: run.totalCnasPatronal,
      total_irg: run.totalIrg,
      total_net: run.totalNet,
      slips_count: run.slipsCount,
      approved_at: run.approvedAt || null,
      approved_by: run.approvedBy && isUuid(run.approvedBy) ? run.approvedBy : null,
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
        .select(
          'id, payroll_run_id, staff_id, matricule, staff_full_name, role, period_month, period_year, period_label, base_salary, actual_base_salary, worked_days, standard_days, coaching_commission, primes_cotisables, salaire_brut_cotisable, cnas_salarial, cnas_patronal, salaire_brut_imposable, irg_tax, primes_non_imposables, acomptes_deduits, autres_retenues, net_a_payer, payment_method, ccp_number, ccp_key, bank_rib, nss, is_paid, paid_date, receipt_number, rate_set_id, rate_basis, rate_snapshot, version'
        )
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
    const validRateSetId = slip.rateSetId && isUuid(slip.rateSetId) ? slip.rateSetId : null;
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
      rate_set_id: validRateSetId,
      rate_basis: slip.rateBasis || (validRateSetId ? 'versioned' : 'legacy'),
      rate_snapshot: slip.rateSnapshot ?? null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('staff_payroll_slips', payload, {
      expectedVersion: slip.version,
      entityType: 'StaffPayrollSlip',
      entityLabel: `${slip.staffFullName} (${slip.periodLabel})`,
      localData: payload,
    });
    return res.success;
  },

  async markPayrollSlipPaid(slip: StaffPayrollSlipRecord, paidDate: string): Promise<boolean> {
    const res = await syncCoordinator.mutateOrQueueUpdate(
      'staff_payroll_slips',
      slip.id,
      { is_paid: true, paid_date: paidDate },
      {
        expectedVersion: slip.version,
        entityType: 'StaffPayrollSlip',
        entityLabel: `${slip.staffFullName} (${slip.periodLabel})`,
        localData: { ...slip, isPaid: true, paidDate },
      }
    );
    return res.success;
  },

  async approvePayrollRun(
    runId: string,
    opts: {
      markPaid?: boolean;
      advanceIds?: string[];
      waiveAdvanceIds?: string[];
      expectedVersion?: number;
      title?: string;
    } = {}
  ) {
    const validRunId = toValidUuid(runId);
    return syncCoordinator.rpcOrQueue<{
      success: boolean;
      runId?: string;
      status?: string;
      alreadyApproved?: boolean;
      approvedAt?: string;
      approvedBy?: string;
      deductedAdvanceIds?: string[];
      waivedAdvanceIds?: string[];
      error?: string;
    }>(
      'approve_payroll_run',
      {
        p_run_id: validRunId,
        p_mark_paid: Boolean(opts.markPaid),
        p_advance_ids: opts.advanceIds ? opts.advanceIds.map((id) => toValidUuid(id)) : null,
        p_waive_advance_ids: opts.waiveAdvanceIds ? opts.waiveAdvanceIds.map((id) => toValidUuid(id)) : null,
      },
      {
        table: 'staff_payroll_runs',
        recordId: validRunId,
        expectedVersion: opts.expectedVersion,
        entityType: 'StaffPayrollRun',
        entityLabel: opts.title || `Payroll Run ${validRunId}`,
      }
    );
  },

  async insertOnlyBackfillPayroll(params: {
    ctx: { accountId: string; businessId: string; branchId: string; category?: string };
    attendanceLogs: StaffAttendanceLogRecord[];
    salaryAdvances: StaffSalaryAdvance[];
    payrollRuns: StaffPayrollRunRecord[];
    payrollSlips: StaffPayrollSlipRecord[];
  }): Promise<{
    attendanceInserted: number;
    advancesInserted: number;
    runsInserted: number;
    slipsInserted: number;
    skippedCollisions: Array<{ runId: string; reason: string }>;
    errors: string[];
  }> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('SUPABASE_UNCONFIGURED');
    }

    const result = {
      attendanceInserted: 0,
      advancesInserted: 0,
      runsInserted: 0,
      slipsInserted: 0,
      skippedCollisions: [] as Array<{ runId: string; reason: string }>,
      errors: [] as string[],
    };

    const { ctx } = params;
    const insertedRunIds = new Set<string>();

    if (params.attendanceLogs.length > 0) {
      const rows = params.attendanceLogs.map((entry) => {
        const trace = buildTraceEnvelope({
          accountId: entry.accountId || ctx.accountId,
          businessId: entry.businessId || ctx.businessId,
          branchId: entry.branchId || ctx.branchId,
          staffId: entry.staffId,
        });
        return {
          id: toValidUuid(entry.id),
          ...trace,
          staff_name: entry.staffName,
          staff_role: entry.staffRole || 'Staff',
          log_timestamp: entry.timestamp,
          log_date: entry.date,
          type: entry.type,
          method: entry.method,
          source: entry.source || entry.method || 'kiosk',
          entered_by: entry.enteredBy && isUuid(entry.enteredBy) ? entry.enteredBy : null,
          entered_by_name: entry.enteredByName || null,
          terminal_id: entry.terminalId || null,
          notes: entry.notes || null,
        };
      });
      const { error } = await (client as any)
        .from('staff_attendance_logs')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        result.errors.push(`attendance: ${error.message}`);
      } else {
        result.attendanceInserted = rows.length;
      }
    }

    if (params.salaryAdvances.length > 0) {
      const rows = params.salaryAdvances.map((adv) => {
        const trace = buildTraceEnvelope({
          accountId: adv.accountId || ctx.accountId,
          businessId: adv.businessId || ctx.businessId,
          branchId: adv.branchId || ctx.branchId,
          staffId: adv.staffId,
        });
        return {
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
      });
      const { error } = await (client as any)
        .from('staff_salary_advances')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        result.errors.push(`advances: ${error.message}`);
      } else {
        result.advancesInserted = rows.length;
      }
    }

    for (const run of params.payrollRuns) {
      const trace = buildTraceEnvelope({
        accountId: run.accountId || ctx.accountId,
        businessId: run.businessId || ctx.businessId,
        branchId: run.branchId || ctx.branchId,
      });
      const mappedRunId = toValidUuid(run.id);
      const payload = {
        id: mappedRunId,
        ...trace,
        category: run.category || ctx.category || 'membership_session',
        period_month: run.periodMonth,
        period_year: run.periodYear,
        title: run.title,
        status: run.status,
        run_type: run.runType || 'regular',
        adjustment_seq: run.adjustmentSeq ?? 0,
        rate_set_id: null,
        rate_basis: 'legacy',
        rate_snapshot: run.rateSnapshot ?? null,
        total_gross_cotisable: run.totalGrossCotisable,
        total_cnas_salarial: run.totalCnasSalarial,
        total_cnas_patronal: run.totalCnasPatronal,
        total_irg: run.totalIrg,
        total_net: run.totalNet,
        slips_count: run.slipsCount,
        approved_at: run.approvedAt || null,
        approved_by: run.approvedBy && isUuid(run.approvedBy) ? run.approvedBy : null,
      };
      const { error } = await (client as any)
        .from('staff_payroll_runs')
        .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        if (error.code === '23505') {
          result.skippedCollisions.push({
            runId: run.id,
            reason: `Period collision (${run.periodMonth}/${run.periodYear} ${payload.run_type}#${payload.adjustment_seq})`,
          });
        } else {
          result.errors.push(`run ${run.id}: ${error.message}`);
        }
      } else {
        insertedRunIds.add(mappedRunId);
        result.runsInserted += 1;
      }
    }

    const skippedRunIdSet = new Set(result.skippedCollisions.map((c) => toValidUuid(c.runId)));
    const eligibleSlips = params.payrollSlips.filter(
      (slip) => !skippedRunIdSet.has(toValidUuid(slip.payrollRunId))
    );

    if (eligibleSlips.length > 0) {
      const slipRows = eligibleSlips.map((slip) => {
        const trace = buildTraceEnvelope({
          accountId: ctx.accountId,
          businessId: ctx.businessId,
          branchId: ctx.branchId,
          staffId: slip.staffId,
        });
        return {
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
          coaching_commission: slip.coachingCommission ?? 0,
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
          rate_set_id: null,
          rate_basis: 'legacy',
          rate_snapshot: slip.rateSnapshot ?? null,
        };
      });

      const { error } = await (client as any)
        .from('staff_payroll_slips')
        .upsert(slipRows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        result.errors.push(`slips: ${error.message}`);
      } else {
        result.slipsInserted = slipRows.length;
      }
    }

    return result;
  },
};
