import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  ScfAccount,
  ScfAccountClass,
  ScfAccountingPeriod,
  ScfJournalCode,
  ScfJournalEntry,
  ScfJournalLine,
  ScfPostingEventType,
  ScfPostingFailure,
  UnifiedCurrency,
} from '../../../types/index';

export function mapScfAccountFromDb(row: any): ScfAccount {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    code: row.code,
    labelFr: row.label_fr,
    labelAr: row.label_ar,
    labelEn: row.label_en,
    scfClass: Number(row.scf_class || 4) as ScfAccountClass,
    normalBalance: row.normal_balance === 'credit' ? 'credit' : 'debit',
    accountType: row.account_type || 'asset',
    isReconcilable: Boolean(row.is_reconcilable),
    isSystem: Boolean(row.is_system),
    isActive: row.is_active !== false,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapScfPeriodFromDb(row: any): ScfAccountingPeriod {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    periodKey: row.period_key,
    fiscalYear: Number(row.fiscal_year),
    periodMonth: Number(row.period_month),
    status: row.status === 'closed' ? 'closed' : 'open',
    closedAt: row.closed_at || undefined,
    closedByStaffId: row.closed_by_staff_id || undefined,
    reopenedAt: row.reopened_at || undefined,
    reopenedByStaffId: row.reopened_by_staff_id || undefined,
    reopenReason: row.reopen_reason || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    updatedAt: row.updated_at,
  };
}

export function mapScfJournalLineFromDb(row: any): ScfJournalLine {
  return {
    id: row.id,
    lineNo: Number(row.line_no || 1),
    accountCode: row.account_code,
    accountLabel: row.account_label || row.account_code,
    partyId: row.party_id || undefined,
    partyName: row.party_name || undefined,
    debitCentimes: Number(row.debit_centimes || 0),
    creditCentimes: Number(row.credit_centimes || 0),
    originalCurrency: (row.original_currency || 'DZD') as UnifiedCurrency,
    originalAmountCentimes: Number(row.original_amount_centimes || 0),
    fxRate: Number(row.fx_rate ?? 1),
    reconciled: Boolean(row.reconciled),
    reconciledAt: row.reconciled_at || undefined,
    reconciliationRef: row.reconciliation_ref || undefined,
    statementDate: row.statement_date || undefined,
  };
}

export function mapScfJournalEntryFromDb(
  row: any,
  lines: ScfJournalLine[] = []
): ScfJournalEntry {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    entryNumber: row.entry_number,
    journalCode: (row.journal_code || 'OD') as ScfJournalCode,
    entryDate: row.entry_date,
    periodKey: row.period_key,
    fiscalYear: Number(row.fiscal_year),
    pieceRef: row.piece_ref || '',
    libelle: row.libelle || '',
    sourceVertical: row.source_vertical || 'trading_commercial',
    sourceEventType: (row.source_event_type || 'manual') as ScfPostingEventType,
    sourceDocId: row.source_doc_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    currency: (row.currency || 'DZD') as UnifiedCurrency,
    fxRate: Number(row.fx_rate ?? 1),
    totalDebitCentimes: Number(row.total_debit_centimes || 0),
    totalCreditCentimes: Number(row.total_credit_centimes || 0),
    lines,
    status: row.status === 'reversed' ? 'reversed' : 'posted',
    reversedEntryId: row.reversed_entry_id || undefined,
    reversalReason: row.reversal_reason || undefined,
    postedByStaffId: row.posted_by_staff_id || undefined,
    postedAt: row.posted_at || row.created_at,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapScfPostingFailureFromDb(row: any): ScfPostingFailure {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    sourceVertical: row.source_vertical || 'trading_commercial',
    sourceEventType: (row.source_event_type || 'manual') as ScfPostingEventType,
    sourceDocId: row.source_doc_id || undefined,
    sourceRef: row.source_ref || '',
    entryDate: row.entry_date,
    payload: row.payload || {},
    errorCode: row.error_code || 'SCF_POST_ERROR',
    errorMessage: row.error_message || '',
    status: row.status === 'resolved' || row.status === 'dismissed' ? row.status : 'pending',
    attempts: Number(row.attempts || 1),
    lastAttemptAt: row.last_attempt_at || row.created_at,
    resolvedEntryId: row.resolved_entry_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const scfAccountingService = {
  async fetchAccounts(businessId: string): Promise<ScfAccount[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await (client as any)
        .from('scf_chart_of_accounts')
        .select('*')
        .eq('business_id', toValidUuid(businessId))
        .is('deleted_at', null)
        .order('code', { ascending: true });
      if (error || !Array.isArray(data)) return [];
      return data.map(mapScfAccountFromDb);
    } catch {
      return [];
    }
  },

  async fetchPeriods(businessId: string): Promise<ScfAccountingPeriod[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await (client as any)
        .from('scf_accounting_periods')
        .select('*')
        .eq('business_id', toValidUuid(businessId))
        .is('deleted_at', null)
        .order('period_key', { ascending: false });
      if (error || !Array.isArray(data)) return [];
      return data.map(mapScfPeriodFromDb);
    } catch {
      return [];
    }
  },

  async fetchJournalEntries(
    branchId: string,
    updatedAfter?: string | null
  ): Promise<ScfJournalEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const branchUuid = toValidUuid(branchId);
      const entries = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('journal_entries')
          .select('*')
          .eq('branch_id', branchUuid)
          .is('deleted_at', null)
          .order('entry_date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      if (entries.length === 0) return [];
      const ids = entries.map((e) => e.id);
      const { data: lineRows } = await (client as any)
        .from('journal_lines')
        .select('*')
        .in('journal_entry_id', ids)
        .is('deleted_at', null)
        .order('line_no', { ascending: true });

      const byEntry = new Map<string, ScfJournalLine[]>();
      for (const row of lineRows || []) {
        const list = byEntry.get(row.journal_entry_id) || [];
        list.push(mapScfJournalLineFromDb(row));
        byEntry.set(row.journal_entry_id, list);
      }

      return entries.map((e) => mapScfJournalEntryFromDb(e, byEntry.get(e.id) || []));
    } catch {
      return [];
    }
  },

  async fetchPostingFailures(branchId: string): Promise<ScfPostingFailure[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await (client as any)
        .from('scf_posting_failures')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('last_attempt_at', { ascending: false });
      if (error || !Array.isArray(data)) return [];
      return data.map(mapScfPostingFailureFromDb);
    } catch {
      return [];
    }
  },

  async seedChartOfAccounts(businessId: string): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue<number>('seed_scf_chart_of_accounts', {
      p_business_id: toValidUuid(businessId),
    });
    return res.success;
  },

  async upsertAccount(acct: ScfAccount, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: acct.accountId,
      businessId: acct.businessId,
      branchId: acct.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(acct.id),
      account_id: trace.account_id,
      business_id: toValidUuid(acct.businessId),
      code: acct.code.trim(),
      label_fr: acct.labelFr.trim(),
      label_ar: acct.labelAr.trim() || acct.labelFr.trim(),
      label_en: acct.labelEn.trim() || acct.labelFr.trim(),
      scf_class: acct.scfClass,
      normal_balance: acct.normalBalance,
      account_type: acct.accountType,
      is_reconcilable: acct.isReconcilable,
      is_system: acct.isSystem,
      is_active: acct.isActive,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('scf_chart_of_accounts', payload, {
      expectedVersion: acct.version,
      entityType: 'ScfAccount',
      entityLabel: acct.code,
      localData: payload,
    });
    return res.success;
  },

  async postJournalEntry(entry: ScfJournalEntry): Promise<{
    success: boolean;
    entryNumber?: string;
    error?: string;
  }> {
    const res = await syncCoordinator.rpcOrQueue<{
      entry_id: string;
      entry_number: string;
      period_key: string;
      status: 'posted';
    }>(
      'post_scf_journal_entry',
      {
        p_entry_id: toValidUuid(entry.id),
        p_business_id: toValidUuid(entry.businessId),
        p_branch_id: toValidUuid(entry.branchId),
        p_journal_code: entry.journalCode,
        p_entry_date: entry.entryDate,
        p_piece_ref: entry.pieceRef,
        p_libelle: entry.libelle,
        p_source_vertical: entry.sourceVertical,
        p_source_event_type: entry.sourceEventType,
        p_source_doc_id: entry.sourceDocId || null,
        p_idempotency_key: entry.idempotencyKey || entry.id,
        p_currency: entry.currency,
        p_fx_rate: entry.fxRate,
        p_lines: entry.lines.map((l) => ({
          account_code: l.accountCode,
          account_label: l.accountLabel,
          party_id: l.partyId || null,
          party_name: l.partyName || null,
          debit_centimes: l.debitCentimes,
          credit_centimes: l.creditCentimes,
          original_currency: l.originalCurrency,
          original_amount_centimes: l.originalAmountCentimes,
          fx_rate: l.fxRate,
        })),
      },
      {
        table: 'journal_entries',
        recordId: toValidUuid(entry.id),
        entityType: 'ScfJournalEntry',
        entityLabel: entry.entryNumber,
      }
    );
    return {
      success: res.success,
      entryNumber: res.data?.entry_number,
      error: res.error,
    };
  },

  async reverseJournalEntry(
    entryId: string,
    reversalDate: string,
    reason?: string
  ): Promise<{ success: boolean; reversalEntryNumber?: string; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue<{
      reversal_entry_id: string;
      reversal_entry_number: string;
    }>(
      'reverse_scf_journal_entry',
      {
        p_entry_id: toValidUuid(entryId),
        p_reversal_date: reversalDate,
        p_reason: reason || null,
      },
      {
        table: 'journal_entries',
        recordId: toValidUuid(entryId),
        entityType: 'ScfJournalEntry',
        entityLabel: entryId,
      }
    );
    return {
      success: res.success,
      reversalEntryNumber: res.data?.reversal_entry_number,
      error: res.error,
    };
  },

  async setPeriodStatus(
    businessId: string,
    periodKey: string,
    status: 'open' | 'closed',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue(
      'set_scf_period_status',
      {
        p_business_id: toValidUuid(businessId),
        p_period_key: periodKey,
        p_status: status,
        p_reason: reason || null,
      },
      {
        table: 'scf_accounting_periods',
        recordId: `${toValidUuid(businessId)}:${periodKey}`,
        entityType: 'ScfAccountingPeriod',
        entityLabel: periodKey,
      }
    );
    return { success: res.success, error: res.error };
  },

  async reconcileLines(
    lineIds: string[],
    reconciled: boolean,
    reconciliationRef?: string,
    statementDate?: string
  ): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue(
      'reconcile_scf_journal_lines',
      {
        p_line_ids: lineIds.map((id) => toValidUuid(id)),
        p_reconciled: reconciled,
        p_reconciliation_ref: reconciliationRef || null,
        p_statement_date: statementDate || new Date().toISOString().slice(0, 10),
      },
      {
        table: 'journal_lines',
        recordId: toValidUuid(lineIds[0] || 'reconcile'),
        entityType: 'ScfJournalLine',
        entityLabel: reconciliationRef || 'Rapprochement',
      }
    );
    return res.success;
  },

  async upsertPostingFailure(failure: ScfPostingFailure, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: failure.accountId,
      businessId: failure.businessId,
      branchId: failure.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(failure.id),
      account_id: trace.account_id,
      business_id: toValidUuid(failure.businessId),
      branch_id: trace.branch_id,
      source_vertical: failure.sourceVertical,
      source_event_type: failure.sourceEventType,
      source_doc_id: failure.sourceDocId || null,
      source_ref: failure.sourceRef,
      entry_date: failure.entryDate,
      payload: failure.payload || {},
      error_code: failure.errorCode,
      error_message: failure.errorMessage,
      status: failure.status,
      attempts: failure.attempts,
      last_attempt_at: failure.lastAttemptAt,
      resolved_entry_id: failure.resolvedEntryId ? toValidUuid(failure.resolvedEntryId) : null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('scf_posting_failures', payload, {
      entityType: 'ScfPostingFailure',
      entityLabel: failure.sourceRef,
      localData: payload,
    });
    return res.success;
  },
};
