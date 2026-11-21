import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  ContractorProject,
  ContractorBoqItem,
  ContractorDailyLog,
  ContractorDgp,
  ContractorServiceOrder,
  ConcretePourRecord,
  SubcontractorAgreement,
  EquipmentLogRecord,
  CaisseExpenseRecord,
} from '../../../types/index';

type DbProjectStatus = 'Tendering' | 'Active' | 'Suspended' | 'ProvisionalReception' | 'FinalReception';
type DbDecompteStatus = 'Draft' | 'Submitted' | 'Certified' | 'Paid';

function toDbProjectStatus(s: ContractorProject['status']): DbProjectStatus {
  switch (s) {
    case 'Tendering':
      return 'Tendering';
    case 'ProvisionalHandover':
      return 'ProvisionalReception';
    case 'DefinitiveHandover':
    case 'Archived':
      return 'FinalReception';
    case 'SitePreparation':
    case 'InProgress':
    default:
      return 'Active';
  }
}

function toDbDecompteStatus(s: ContractorDgp['status']): DbDecompteStatus {
  if (s === 'SubmittedClient') return 'Submitted';
  if (s === 'ApprovedBE') return 'Certified';
  if (s === 'Paid') return 'Paid';
  return 'Draft';
}

const META_PREFIX = '__atrium_btp__:';

function packMeta(plain: string | undefined, meta: Record<string, any>): string {
  return `${META_PREFIX}${JSON.stringify({ plain: plain || '', ...meta })}`;
}

function unpackMeta(raw: string | null | undefined): { plain: string; meta: Record<string, any> } {
  if (!raw) return { plain: '', meta: {} };
  if (raw.startsWith(META_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(META_PREFIX.length));
      const { plain = '', ...meta } = parsed || {};
      return { plain, meta };
    } catch {
      return { plain: raw, meta: {} };
    }
  }
  return { plain: raw, meta: {} };
}

export const contractorService = {
  async fetchProjects(branchId: string, updatedAfter?: string | null): Promise<ContractorProject[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_projects')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_code, title, client_name, location, wilaya, contract_amount_ht_dzd, retention_guarantee_percent, start_date, expected_end_date, progress_percent, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): ContractorProject => {
        const { plain: location, meta } = unpackMeta(row.location);
        const contractAmount = Number(row.contract_amount_ht_dzd || 0);
        const retentionPct = Number(row.retention_guarantee_percent ?? 5);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          projectCode: row.project_code,
          projectName: row.title,
          clientName: row.client_name,
          siteLocation: location,
          wilayaNumber: row.wilaya ? Number(row.wilaya) : meta.wilayaNumber,
          contractAmountDzd: contractAmount,
          retentionGuaranteePercent: retentionPct,
          retentionAmountDzd: Number(meta.retentionAmountDzd ?? (contractAmount * retentionPct) / 100),
          hasBankCautionReplacement: meta.hasBankCautionReplacement,
          bankCautionReference: meta.bankCautionReference,
          startDate: row.start_date || '',
          targetEndDate: row.expected_end_date || '',
          revisedEndDate: meta.revisedEndDate,
          supervisorName: meta.supervisorName || 'Chef de Chantier',
          progressPercent: Number(row.progress_percent || 0),
          status: (meta.uiStatus || 'InProgress') as ContractorProject['status'],
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertProject(proj: ContractorProject): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: proj.accountId || 'acc_01',
      businessId: proj.businessId,
      branchId: proj.branchId,
      staffId: proj.staffId,
    });
    const payload = {
      id: toValidUuid(proj.id),
      ...trace,
      project_code: proj.projectCode,
      title: proj.projectName,
      client_name: proj.clientName,
      wilaya: proj.wilayaNumber ? String(proj.wilayaNumber) : null,
      location: packMeta(proj.siteLocation, {
        wilayaNumber: proj.wilayaNumber,
        retentionAmountDzd: proj.retentionAmountDzd,
        hasBankCautionReplacement: proj.hasBankCautionReplacement,
        bankCautionReference: proj.bankCautionReference,
        revisedEndDate: proj.revisedEndDate,
        supervisorName: proj.supervisorName,
        uiStatus: proj.status,
      }),
      contract_amount_ht_dzd: Number(proj.contractAmountDzd || 0),
      retention_guarantee_percent: Number(proj.retentionGuaranteePercent ?? 5),
      progress_percent: Number(proj.progressPercent || 0),
      start_date: proj.startDate || null,
      expected_end_date: proj.targetEndDate || null,
      status: toDbProjectStatus(proj.status),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_projects', payload, {
      expectedVersion: proj.version,
      entityType: 'ContractorProject',
      entityLabel: proj.projectName,
      localData: payload,
    });
    return res.success;
  },

  async fetchBoqItems(branchId: string, updatedAfter?: string | null): Promise<ContractorBoqItem[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_boq_items')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, lot_code, designation, unit, contract_qty, executed_qty, unit_price_dzd, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('lot_code', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): ContractorBoqItem => {
        const { plain: lotCode, meta } = unpackMeta(row.lot_code);
        const plannedQty = Number(row.contract_qty || 0);
        const executedQty = Number(row.executed_qty || 0);
        const unitPriceDzd = Number(row.unit_price_dzd || 0);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          projectId: row.project_id,
          lotCode: lotCode || undefined,
          lotTitle: meta.lotTitle,
          itemCode: meta.itemCode || lotCode || row.id.slice(0, 6),
          designation: row.designation,
          unit: (row.unit || 'm3') as ContractorBoqItem['unit'],
          plannedQty,
          executedQty,
          unitPriceDzd,
          totalPlannedDzd: plannedQty * unitPriceDzd,
          totalExecutedDzd: executedQty * unitPriceDzd,
          isAdditionalWork: meta.isAdditionalWork,
          avenantReference: meta.avenantReference,
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertBoqItem(item: ContractorBoqItem): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: item.accountId || 'acc_01',
      businessId: item.businessId,
      branchId: item.branchId,
      staffId: item.staffId,
    });
    const payload = {
      id: toValidUuid(item.id),
      ...trace,
      project_id: toValidUuid(item.projectId),
      lot_code: packMeta(item.lotCode, {
        lotTitle: item.lotTitle,
        itemCode: item.itemCode,
        isAdditionalWork: item.isAdditionalWork,
        avenantReference: item.avenantReference,
      }),
      designation: item.designation,
      unit: item.unit,
      contract_qty: Number(item.plannedQty || 0),
      executed_qty: Number(item.executedQty || 0),
      unit_price_dzd: Number(item.unitPriceDzd || 0),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_boq_items', payload, {
      expectedVersion: item.version,
      entityType: 'ContractorBoqItem',
      entityLabel: item.designation,
      localData: payload,
    });
    return res.success;
  },

  async fetchDailyLogs(branchId: string, updatedAfter?: string | null): Promise<ContractorDailyLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_daily_logs')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, log_date, weather, workers_count, activities_summary, incidents_noted, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('log_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .filter((row: any) => {
          const { meta } = unpackMeta(row.activities_summary);
          return !meta.kind || meta.kind === 'daily_log';
        })
        .map((row: any): ContractorDailyLog => {
          const { plain: tasksAccomplished, meta } = unpackMeta(row.activities_summary);
          if (meta.dailyLog) {
            return {
              ...(meta.dailyLog as ContractorDailyLog),
              version: row.version != null ? Number(row.version) : (meta.dailyLog as ContractorDailyLog).version,
            };
          }
          return {
            id: row.id,
            accountId: row.account_id,
            businessId: row.business_id,
            branchId: row.branch_id,
            staffId: row.staff_id || 'staff_01',
            projectId: row.project_id,
            date: row.log_date,
            weather: row.weather || 'Ensoleillé',
            headcountWorkers: Number(row.workers_count || 0),
            equipmentOnSite: [],
            tasksAccomplished,
            incidentsSafety: row.incidents_noted || '',
            supervisorSignature: 'Chef de Chantier',
            version: row.version != null ? Number(row.version) : undefined,
            createdAt: row.created_at,
          };
        });
    } catch {
      return [];
    }
  },

  async upsertDailyLog(log: ContractorDailyLog): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || 'acc_01',
      businessId: log.businessId,
      branchId: log.branchId,
      staffId: log.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      project_id: toValidUuid(log.projectId),
      log_date: log.date || log.logDate || new Date().toISOString().split('T')[0],
      weather: log.weather || 'Ensoleillé',
      workers_count: Number(log.headcountWorkers ?? log.workforceCount ?? 0),
      activities_summary: packMeta(log.tasksAccomplished || log.worksSummary, {
        kind: 'daily_log',
        dailyLog: log,
      }),
      incidents_noted: log.incidentsSafety || log.incidentsOrDelays || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_daily_logs', payload, {
      expectedVersion: log.version,
      entityType: 'ContractorDailyLog',
      entityLabel: log.date || log.logDate || log.id,
      localData: payload,
    });
    return res.success;
  },

  async fetchDgps(branchId: string, updatedAfter?: string | null): Promise<ContractorDgp[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_decomptes')
          .select(
            'id, account_id, business_id, branch_id, staff_id, project_id, situation_number, period_label, gross_cumulative_dzd, previous_cumulative_dzd, period_gross_dzd, retention_deducted_dzd, net_payable_ttc_dzd, status, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('situation_number', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): ContractorDgp => {
        const { plain: periodLabel, meta } = unpackMeta(row.period_label);
        if (meta.dgp) {
          return {
            ...(meta.dgp as ContractorDgp),
            version: row.version != null ? Number(row.version) : (meta.dgp as ContractorDgp).version,
          };
        }
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          projectId: row.project_id,
          dgpNumber: `DGP-${String(row.situation_number).padStart(2, '0')}`,
          periodLabel,
          grossCompletedDzd: Number(row.gross_cumulative_dzd || 0),
          previousCumulDzd: Number(row.previous_cumulative_dzd || 0),
          periodGrossDzd: Number(row.period_gross_dzd || 0),
          retentionGuaranteePercent: 5,
          retentionGuaranteeDzd: Number(row.retention_deducted_dzd || 0),
          advanceAmortizationDzd: 0,
          tvaPercent: 19,
          tvaAmountDzd: 0,
          netPayableDzd: Number(row.net_payable_ttc_dzd || 0),
          status: row.status === 'Paid' ? 'Paid' : row.status === 'Certified' ? 'ApprovedBE' : row.status === 'Submitted' ? 'SubmittedClient' : 'Draft',
          issuedDate: row.created_at ? row.created_at.split('T')[0] : '',
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertDgp(dgp: ContractorDgp): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: dgp.accountId || 'acc_01',
      businessId: dgp.businessId,
      branchId: dgp.branchId,
      staffId: dgp.staffId,
    });
    const numMatch = String(dgp.dgpNumber || '').match(/(\d+)/);
    const payload = {
      id: toValidUuid(dgp.id),
      ...trace,
      project_id: toValidUuid(dgp.projectId),
      situation_number: numMatch ? Number(numMatch[1]) : 1,
      period_label: packMeta(dgp.periodLabel, { dgp }),
      gross_cumulative_dzd: Number(dgp.grossCompletedDzd || 0),
      previous_cumulative_dzd: Number(dgp.previousCumulDzd || 0),
      period_gross_dzd: Number(dgp.periodGrossDzd || 0),
      retention_deducted_dzd: Number(dgp.retentionGuaranteeDzd || 0),
      price_revision_dzd: 0,
      net_payable_ttc_dzd: Number(dgp.netPayableDzd || 0),
      status: toDbDecompteStatus(dgp.status),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_decomptes', payload, {
      expectedVersion: dgp.version,
      entityType: 'ContractorDgp',
      entityLabel: dgp.dgpNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchServiceOrders(branchId: string, updatedAfter?: string | null): Promise<ContractorServiceOrder[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_daily_logs')
          .select('id, activities_summary, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('activities_summary', '__atrium_btp__:%service_order%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): ContractorServiceOrder | null => {
          const { meta } = unpackMeta(row.activities_summary);
          if (meta.kind !== 'service_order' || !meta.order) return null;
          return {
            ...(meta.order as ContractorServiceOrder),
            version: row.version != null ? Number(row.version) : (meta.order as ContractorServiceOrder).version,
          };
        })
        .filter((o: ContractorServiceOrder | null): o is ContractorServiceOrder => Boolean(o));
    } catch {
      return [];
    }
  },

  async upsertServiceOrder(os: ContractorServiceOrder): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: os.accountId || 'acc_01',
      businessId: os.businessId,
      branchId: os.branchId,
      staffId: os.staffId,
    });
    const payload = {
      id: toValidUuid(`os_${os.id}`),
      ...trace,
      project_id: toValidUuid(os.projectId),
      log_date: os.effectiveDate || new Date().toISOString().split('T')[0],
      activities_summary: packMeta(os.osNumber, { kind: 'service_order', order: os }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_daily_logs', payload, {
      expectedVersion: os.version,
      entityType: 'ContractorServiceOrder',
      entityLabel: os.osNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchConcretePours(branchId: string, updatedAfter?: string | null): Promise<ConcretePourRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_daily_logs')
          .select('id, activities_summary, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('activities_summary', '__atrium_btp__:%concrete_pour%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): ConcretePourRecord | null => {
          const { meta } = unpackMeta(row.activities_summary);
          if (meta.kind !== 'concrete_pour' || !meta.pour) return null;
          return {
            ...(meta.pour as ConcretePourRecord),
            version: row.version != null ? Number(row.version) : (meta.pour as ConcretePourRecord).version,
          };
        })
        .filter((p: ConcretePourRecord | null): p is ConcretePourRecord => Boolean(p));
    } catch {
      return [];
    }
  },

  async upsertConcretePour(pour: ConcretePourRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: pour.accountId || 'acc_01',
      businessId: pour.businessId,
      branchId: pour.branchId,
      staffId: pour.staffId,
    });
    const payload = {
      id: toValidUuid(`pour_${pour.id}`),
      ...trace,
      project_id: toValidUuid(pour.projectId),
      log_date: pour.pourDate || new Date().toISOString().split('T')[0],
      activities_summary: packMeta(pour.elementPoured, { kind: 'concrete_pour', pour }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_daily_logs', payload, {
      expectedVersion: pour.version,
      entityType: 'ConcretePourRecord',
      entityLabel: pour.elementPoured,
      localData: payload,
    });
    return res.success;
  },

  async fetchSubcontractors(branchId: string, updatedAfter?: string | null): Promise<SubcontractorAgreement[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_subcontractors')
          .select('id, nif, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): SubcontractorAgreement | null => {
          const { meta } = unpackMeta(row.nif);
          if (!meta.agreement) return null;
          return {
            ...(meta.agreement as SubcontractorAgreement),
            version: row.version != null ? Number(row.version) : (meta.agreement as SubcontractorAgreement).version,
          };
        })
        .filter((s: SubcontractorAgreement | null): s is SubcontractorAgreement => Boolean(s));
    } catch {
      return [];
    }
  },

  async upsertSubcontractor(sub: SubcontractorAgreement): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: sub.accountId || 'acc_01',
      businessId: sub.businessId,
      branchId: sub.branchId,
      staffId: sub.staffId,
    });
    const payload = {
      id: toValidUuid(sub.id),
      ...trace,
      company_name: sub.subcontractorName,
      specialty: sub.tradeType,
      phone: sub.contactPhone || null,
      nif: packMeta(undefined, { agreement: sub }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_subcontractors', payload, {
      expectedVersion: sub.version,
      entityType: 'SubcontractorAgreement',
      entityLabel: sub.subcontractorName,
      localData: payload,
    });
    return res.success;
  },

  async fetchEquipmentLogs(branchId: string, updatedAfter?: string | null): Promise<EquipmentLogRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_equipment')
          .select('id, name, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): EquipmentLogRecord | null => {
          const { meta } = unpackMeta(row.name);
          if (!meta.log) return null;
          return {
            ...(meta.log as EquipmentLogRecord),
            version: row.version != null ? Number(row.version) : (meta.log as EquipmentLogRecord).version,
          };
        })
        .filter((e: EquipmentLogRecord | null): e is EquipmentLogRecord => Boolean(e));
    } catch {
      return [];
    }
  },

  async upsertEquipmentLog(log: EquipmentLogRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: log.accountId || 'acc_01',
      businessId: log.businessId,
      branchId: log.branchId,
      staffId: log.staffId,
    });
    const payload = {
      id: toValidUuid(log.id),
      ...trace,
      asset_code: log.matriculeNumber || log.id,
      name: packMeta(log.equipmentName, { log }),
      category: log.equipmentCategory,
      assigned_project_id: log.projectId ? toValidUuid(log.projectId) : null,
      status: 'OnSite',
      hourly_rate_dzd: 0,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_equipment', payload, {
      expectedVersion: log.version,
      entityType: 'EquipmentLogRecord',
      entityLabel: log.equipmentName,
      localData: payload,
    });
    return res.success;
  },

  async fetchCaisseExpenses(branchId: string, updatedAfter?: string | null): Promise<CaisseExpenseRecord[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('btp_materials')
          .select('id, name, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('name', '__atrium_btp__:%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): CaisseExpenseRecord | null => {
          const { meta } = unpackMeta(row.name);
          if (!meta.expense) return null;
          return {
            ...(meta.expense as CaisseExpenseRecord),
            version: row.version != null ? Number(row.version) : (meta.expense as CaisseExpenseRecord).version,
          };
        })
        .filter((e: CaisseExpenseRecord | null): e is CaisseExpenseRecord => Boolean(e));
    } catch {
      return [];
    }
  },

  async upsertCaisseExpense(exp: CaisseExpenseRecord): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: exp.accountId || 'acc_01',
      businessId: exp.businessId,
      branchId: exp.branchId,
      staffId: exp.staffId,
    });
    const payload = {
      id: toValidUuid(`exp_${exp.id}`),
      ...trace,
      project_id: exp.projectId ? toValidUuid(exp.projectId) : null,
      name: packMeta(exp.beneficiaryName, { expense: exp }),
      unit: exp.expenseCategory,
      stock_quantity: 1,
      unit_cost_dzd: Number(exp.netCashDisbursedDzd || exp.amountDzd || 0),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('btp_materials', payload, {
      expectedVersion: exp.version,
      entityType: 'CaisseExpenseRecord',
      entityLabel: exp.beneficiaryName,
      localData: payload,
    });
    return res.success;
  },

  async deleteProject(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_projects', id, deletedByStaffId);
    return res.success;
  },

  async deleteBoqItem(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_boq_items', id, deletedByStaffId);
    return res.success;
  },

  async deleteDailyLog(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_daily_logs', id, deletedByStaffId);
    return res.success;
  },

  async deleteDgp(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_decomptes', id, deletedByStaffId);
    return res.success;
  },

  async deleteServiceOrder(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_daily_logs', `os_${id}`, deletedByStaffId);
    return res.success;
  },

  async deleteConcretePour(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_daily_logs', `pour_${id}`, deletedByStaffId);
    return res.success;
  },

  async deleteSubcontractor(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_subcontractors', id, deletedByStaffId);
    return res.success;
  },

  async deleteEquipmentLog(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_equipment', id, deletedByStaffId);
    return res.success;
  },

  async deleteCaisseExpense(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('btp_materials', `exp_${id}`, deletedByStaffId);
    return res.success;
  },
};
