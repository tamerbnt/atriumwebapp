import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { syncCoordinator } from '../syncCoordinator';
import type {
  BiDateRangePreset,
  BiKpiCategory,
  BiKpiDefinition,
  BiKpiUnitType,
  BiReportSnapshot,
  BiReportType,
  BiSavedReport,
} from '../../../types/index';

export function mapBiKpiDefinitionFromDb(row: any): BiKpiDefinition {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id || undefined,
    kpiCode: row.kpi_code || '',
    category: (row.category || 'revenue') as BiKpiCategory,
    labelEn: row.label_en || '',
    labelFr: row.label_fr || '',
    labelAr: row.label_ar || '',
    formulaSpec: row.formula_spec || '',
    unitType: (row.unit_type || 'centimes') as BiKpiUnitType,
    sourceTables: Array.isArray(row.source_tables) ? row.source_tables : [],
    targetValue: row.target_value != null ? Number(row.target_value) : null,
    isActive: row.is_active !== false,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapBiSavedReportFromDb(row: any): BiSavedReport {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    title: row.title || '',
    reportType: (row.report_type || 'executive_overview') as BiReportType,
    kpiCodes: Array.isArray(row.kpi_codes) ? row.kpi_codes : [],
    dateRangePreset: (row.date_range_preset || '30d') as BiDateRangePreset,
    comparePreviousPeriod: row.compare_previous_period !== false,
    scheduleCron: row.schedule_cron || null,
    scheduleRecipients: Array.isArray(row.schedule_recipients) ? row.schedule_recipients : [],
    lastDispatchedAt: row.last_dispatched_at || undefined,
    createdByStaffId: row.created_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapBiReportSnapshotFromDb(row: any): BiReportSnapshot {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    reportId: row.report_id || undefined,
    title: row.title || '',
    periodStart: row.period_start,
    periodEnd: row.period_end,
    previousPeriodStart: row.previous_period_start,
    previousPeriodEnd: row.previous_period_end,
    metricsJson: row.metrics_json && typeof row.metrics_json === 'object' ? row.metrics_json : {},
    branchBreakdownJson: Array.isArray(row.branch_breakdown_json) ? row.branch_breakdown_json : [],
    agingBucketsJson: Array.isArray(row.aging_buckets_json) ? row.aging_buckets_json : [],
    generatedByStaffId: row.generated_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export const biService = {
  async fetchForBusiness(businessId: string): Promise<{
    definitions: BiKpiDefinition[];
    savedReports: BiSavedReport[];
    snapshots: BiReportSnapshot[];
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return { definitions: [], savedReports: [], snapshots: [] };
    }
    const bizUuid = toValidUuid(businessId);
    try {
      const fetchTable = (tbl: string) =>
        fetchAllPages<any>((from, to) =>
          (client as any)
            .from(tbl)
            .select('*')
            .eq('business_id', bizUuid)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to)
        );
      const [defRows, repRows, snapRows] = await Promise.all([
        fetchTable('bi_kpi_definitions'),
        fetchTable('bi_saved_reports'),
        fetchTable('bi_report_snapshots'),
      ]);
      return {
        definitions: defRows.map(mapBiKpiDefinitionFromDb),
        savedReports: repRows.map(mapBiSavedReportFromDb),
        snapshots: snapRows.map(mapBiReportSnapshotFromDb),
      };
    } catch {
      return { definitions: [], savedReports: [], snapshots: [] };
    }
  },

  async upsertKpiDefinition(def: BiKpiDefinition): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'bi_kpi_definitions',
      {
        id: toValidUuid(def.id),
        account_id: toValidUuid(def.accountId),
        business_id: def.businessId ? toValidUuid(def.businessId) : null,
        kpi_code: def.kpiCode,
        category: def.category,
        label_en: def.labelEn,
        label_fr: def.labelFr,
        label_ar: def.labelAr,
        formula_spec: def.formulaSpec,
        unit_type: def.unitType,
        source_tables: def.sourceTables || [],
        target_value: def.targetValue ?? null,
        is_active: def.isActive,
        version: def.version ?? 1,
        created_at: def.createdAt,
        updated_at: def.updatedAt,
      },
      {
        onConflict: 'id',
        expectedVersion: def.version ?? 1,
        entityType: 'bi_kpi_definition',
        entityLabel: def.kpiCode,
      }
    );
  },

  async upsertSavedReport(report: BiSavedReport): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'bi_saved_reports',
      {
        id: toValidUuid(report.id),
        account_id: toValidUuid(report.accountId),
        business_id: toValidUuid(report.businessId),
        branch_id: report.branchId ? toValidUuid(report.branchId) : null,
        title: report.title,
        report_type: report.reportType,
        kpi_codes: report.kpiCodes || [],
        date_range_preset: report.dateRangePreset,
        compare_previous_period: report.comparePreviousPeriod,
        schedule_cron: report.scheduleCron || null,
        schedule_recipients: report.scheduleRecipients || [],
        last_dispatched_at: report.lastDispatchedAt || null,
        created_by_staff_id: report.createdByStaffId ? toValidUuid(report.createdByStaffId) : null,
        version: report.version ?? 1,
        created_at: report.createdAt,
        updated_at: report.updatedAt,
        deleted_at: report.deletedAt || null,
      },
      {
        onConflict: 'id',
        expectedVersion: report.version ?? 1,
        entityType: 'bi_saved_report',
        entityLabel: report.title,
      }
    );
  },

  async recordReportSnapshot(snapshot: BiReportSnapshot): Promise<void> {
    const bizUuid = toValidUuid(snapshot.businessId);
    await syncCoordinator.rpcOrQueue(
      'record_bi_report_snapshot',
      {
        p_business_id: bizUuid,
        p_branch_id: snapshot.branchId ? toValidUuid(snapshot.branchId) : null,
        p_report_id: snapshot.reportId ? toValidUuid(snapshot.reportId) : null,
        p_title: snapshot.title,
        p_period_start: snapshot.periodStart,
        p_period_end: snapshot.periodEnd,
        p_previous_period_start: snapshot.previousPeriodStart,
        p_previous_period_end: snapshot.previousPeriodEnd,
        p_metrics_json: snapshot.metricsJson || {},
        p_branch_breakdown_json: snapshot.branchBreakdownJson || [],
        p_aging_buckets_json: snapshot.agingBucketsJson || [],
      },
      {
        table: 'bi_report_snapshots',
        recordId: toValidUuid(snapshot.id),
        entityType: 'bi_report_snapshot',
        entityLabel: snapshot.title,
      }
    );
  },
};
