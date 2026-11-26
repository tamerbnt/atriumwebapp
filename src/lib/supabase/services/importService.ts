import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  ImportColumnMapping,
  ImportDelimiter,
  ImportDuplicatePolicy,
  ImportEncoding,
  ImportEntityType,
  ImportJob,
  ImportJobStatus,
  ImportRowError,
} from '../../../types/index';

export function mapImportMappingFromDb(row: any): ImportColumnMapping {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    entityType: row.entity_type as ImportEntityType,
    templateName: row.template_name || '',
    encoding: (row.encoding || 'auto') as ImportEncoding,
    delimiter: (row.delimiter || 'auto') as ImportDelimiter,
    duplicatePolicy: (row.duplicate_policy || 'skip') as ImportDuplicatePolicy,
    columnMap: row.column_map && typeof row.column_map === 'object' ? row.column_map : {},
    createdByStaffId: row.created_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapImportJobFromDb(row: any): ImportJob {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    entityType: row.entity_type as ImportEntityType,
    mappingId: row.mapping_id || undefined,
    fileName: row.file_name || '',
    encoding: (row.encoding || 'utf-8') as ImportEncoding,
    delimiter: (row.delimiter || ',') as ImportDelimiter,
    duplicatePolicy: (row.duplicate_policy || 'skip') as ImportDuplicatePolicy,
    status: (row.status || 'previewed') as ImportJobStatus,
    totalRows: Number(row.total_rows ?? 0),
    validRows: Number(row.valid_rows ?? 0),
    insertedRows: Number(row.inserted_rows ?? 0),
    updatedRows: Number(row.updated_rows ?? 0),
    mergedRows: Number(row.merged_rows ?? 0),
    skippedRows: Number(row.skipped_rows ?? 0),
    errorRows: Number(row.error_rows ?? 0),
    chunkSize: Number(row.chunk_size ?? 500),
    chunksTotal: Number(row.chunks_total ?? 0),
    chunksCommitted: Number(row.chunks_committed ?? 0),
    errorSummary: Array.isArray(row.error_summary) ? (row.error_summary as ImportRowError[]) : [],
    createdRecordIds: Array.isArray(row.created_record_ids) ? (row.created_record_ids as string[]) : [],
    startedAt: row.started_at || row.created_at,
    completedAt: row.completed_at || undefined,
    createdByStaffId: row.created_by_staff_id || undefined,
    createdByName: row.created_by_name || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export const importService = {
  async fetchMappings(businessId: string): Promise<ImportColumnMapping[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('import_column_mappings')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .range(from, to)
      );
      return rows.map(mapImportMappingFromDb);
    } catch {
      return [];
    }
  },

  async fetchJobs(businessId: string): Promise<ImportJob[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('import_jobs')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return rows.map(mapImportJobFromDb);
    } catch {
      return [];
    }
  },

  async fetchImportDataForBusiness(businessId: string): Promise<{
    mappings: ImportColumnMapping[];
    jobs: ImportJob[];
  }> {
    const [mappings, jobs] = await Promise.all([
      this.fetchMappings(businessId),
      this.fetchJobs(businessId),
    ]);
    return { mappings, jobs };
  },

  async upsertMapping(mapping: ImportColumnMapping, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: mapping.accountId,
      businessId: mapping.businessId,
      branchId: mapping.branchId || mapping.businessId,
      staffId: staffId || mapping.createdByStaffId,
    });
    const payload = {
      ...trace,
      id: toValidUuid(mapping.id),
      business_id: toValidUuid(mapping.businessId),
      branch_id: mapping.branchId ? toValidUuid(mapping.branchId) : null,
      entity_type: mapping.entityType,
      template_name: mapping.templateName,
      encoding: mapping.encoding,
      delimiter: mapping.delimiter,
      duplicate_policy: mapping.duplicatePolicy,
      column_map: mapping.columnMap,
      created_by_staff_id: staffId ? toValidUuid(staffId) : null,
      version: mapping.version ?? 1,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('import_column_mappings', payload, {
      entityType: 'import_column_mappings',
      entityLabel: `${mapping.entityType}: ${mapping.templateName}`,
      expectedVersion: mapping.version,
    });
    return res.success || res.queued;
  },

  async deleteMapping(mappingId: string, staffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow(
      'import_column_mappings',
      toValidUuid(mappingId),
      staffId ? toValidUuid(staffId) : null
    );
    return res.success || res.queued;
  },

  async upsertJob(job: ImportJob, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: job.accountId,
      businessId: job.businessId,
      branchId: job.branchId || job.businessId,
      staffId: staffId || job.createdByStaffId,
    });
    const payload = {
      ...trace,
      id: toValidUuid(job.id),
      business_id: toValidUuid(job.businessId),
      branch_id: job.branchId ? toValidUuid(job.branchId) : null,
      entity_type: job.entityType,
      mapping_id: job.mappingId ? toValidUuid(job.mappingId) : null,
      file_name: job.fileName,
      encoding: job.encoding,
      delimiter: job.delimiter,
      duplicate_policy: job.duplicatePolicy,
      status: job.status,
      total_rows: job.totalRows,
      valid_rows: job.validRows,
      inserted_rows: job.insertedRows,
      updated_rows: job.updatedRows,
      merged_rows: job.mergedRows,
      skipped_rows: job.skippedRows,
      error_rows: job.errorRows,
      chunk_size: job.chunkSize,
      chunks_total: job.chunksTotal,
      chunks_committed: job.chunksCommitted,
      error_summary: job.errorSummary.slice(0, 200),
      created_record_ids: job.createdRecordIds.slice(0, 5000),
      started_at: job.startedAt,
      completed_at: job.completedAt || null,
      created_by_staff_id: staffId ? toValidUuid(staffId) : null,
      created_by_name: job.createdByName || null,
      version: job.version ?? 1,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('import_jobs', payload, {
      entityType: 'import_jobs',
      entityLabel: job.fileName,
      expectedVersion: job.version,
    });
    return res.success || res.queued;
  },

  async markJobRolledBack(jobId: string, reason?: string): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue(
      'mark_import_job_rolled_back',
      {
        p_job_id: toValidUuid(jobId),
        p_reason: reason || null,
      },
      {
        table: 'import_jobs',
        recordId: toValidUuid(jobId),
        entityType: 'import_jobs',
        entityLabel: `Rollback ${jobId}`,
      }
    );
    return res.success || res.queued;
  },
};
