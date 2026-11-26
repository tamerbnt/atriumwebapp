import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  ChequeInstrumentStatus,
  TimbreCalculationBasis,
  UnifiedCurrency,
  UnifiedDocStatus,
  UnifiedDocType,
  UnifiedDocument,
  UnifiedPayment,
  UnifiedPaymentAllocation,
  UnifiedPaymentMethod,
} from '../../../types/index';

export function mapUnifiedDocumentFromDb(row: any): UnifiedDocument {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    sourceVertical: row.source_vertical || 'trading_commercial',
    docType: (row.doc_type || 'facture') as UnifiedDocType,
    draftNumber: row.draft_number,
    docNumber: row.doc_number ?? null,
    fiscalYear: Number(row.fiscal_year || new Date().getFullYear()),
    status: (row.status || 'Draft') as UnifiedDocStatus,
    partyId: row.party_id || undefined,
    partyName: row.party_name || '',
    partyNif: row.party_nif || undefined,
    partyNis: row.party_nis || undefined,
    partyRc: row.party_rc || undefined,
    partyAi: row.party_ai || undefined,
    partyAddress: row.party_address || undefined,
    partyPhone: row.party_phone || undefined,
    depotId: row.depot_id || undefined,
    depotName: row.depot_name || undefined,
    docDate: row.doc_date || new Date().toISOString().slice(0, 10),
    dueDate: row.due_date || undefined,
    validityDays: row.validity_days != null ? Number(row.validity_days) : undefined,
    paymentMethod: row.payment_method || 'bank_transfer',
    paymentTerms: row.payment_terms || 'Comptant',
    currency: (row.currency || 'DZD') as UnifiedCurrency,
    fxRate: Number(row.fx_rate ?? 1),
    fxRateDate: row.fx_rate_date || row.doc_date || new Date().toISOString().slice(0, 10),
    timbreBasis: (row.timbre_basis || 'commercial_cash') as TimbreCalculationBasis,
    rateSetId: row.rate_set_id ?? null,
    items: Array.isArray(row.items) ? row.items : [],
    tvaBreakdown: Array.isArray(row.tva_breakdown) ? row.tva_breakdown : [],
    totalHtRawCentimes: Number(row.total_ht_raw_centimes || 0),
    generalDiscountPercent: Number(row.general_discount_percent || 0),
    totalHtFinalCentimes: Number(row.total_ht_final_centimes || 0),
    totalTvaCentimes: Number(row.total_tva_centimes || 0),
    timbreFiscalCentimes: Number(row.timbre_fiscal_centimes || 0),
    totalTtcCentimes: Number(row.total_ttc_centimes || 0),
    guaranteeRetentionPercent: Number(row.guarantee_retention_percent || 0),
    guaranteeRetentionCentimes: Number(row.guarantee_retention_centimes || 0),
    netToPayCentimes: Number(row.net_to_pay_centimes || 0),
    paidCentimes: Number(row.paid_centimes || 0),
    balanceDueCentimes: Number(row.balance_due_centimes || 0),
    fiscalHeaderSnapshot: row.fiscal_header_snapshot || { companyName: '—' },
    totalsInWordsFr: row.totals_in_words_fr || '',
    totalsInWordsAr: row.totals_in_words_ar || '',
    includeStampSignature: row.include_stamp_signature ?? true,
    notesTop: row.notes_top || undefined,
    notesBottom: row.notes_bottom || undefined,
    linkedDocId: row.linked_doc_id || undefined,
    linkedDocNumber: row.linked_doc_number || undefined,
    creditNoteForDocId: row.credit_note_for_doc_id || undefined,
    sourceEntityType: row.source_entity_type || undefined,
    sourceEntityId: row.source_entity_id || undefined,
    issuedAt: row.issued_at || undefined,
    issuedByStaffId: row.issued_by_staff_id || undefined,
    voidedAt: row.voided_at || undefined,
    voidedReason: row.voided_reason || undefined,
    printedCount: Number(row.printed_count || 0),
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUnifiedPaymentFromDb(
  row: any,
  allocations: UnifiedPaymentAllocation[] = []
): UnifiedPayment {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id,
    sourceVertical: row.source_vertical || 'trading_commercial',
    partyId: row.party_id || undefined,
    partyName: row.party_name || '',
    paymentNumber: row.payment_number || '',
    method: (row.method || 'cash') as UnifiedPaymentMethod,
    direction: row.direction === 'outflow' ? 'outflow' : 'inflow',
    amountCentimes: Number(row.amount_centimes || 0),
    unallocatedCreditCentimes: Number(row.unallocated_credit_centimes || 0),
    currency: (row.currency || 'DZD') as UnifiedCurrency,
    fxRate: Number(row.fx_rate ?? 1),
    paymentDate: row.payment_date || new Date().toISOString().slice(0, 10),
    recordedByStaffId: row.recorded_by_staff_id || undefined,
    cashSessionId: row.cash_session_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    status: row.status || 'posted',
    instrumentStatus: (row.instrument_status || undefined) as ChequeInstrumentStatus | undefined,
    instrumentNumber: row.instrument_number || undefined,
    instrumentBank: row.instrument_bank || undefined,
    instrumentDueDate: row.instrument_due_date || undefined,
    bouncedReason: row.bounced_reason || undefined,
    reversedPaymentId: row.reversed_payment_id || undefined,
    reversalReason: row.reversal_reason || undefined,
    notes: row.notes || undefined,
    allocations,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const invoicingService = {
  async fetchUnifiedDocuments(
    branchId: string,
    updatedAfter?: string | null
  ): Promise<UnifiedDocument[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('unified_documents')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('doc_date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return data.map(mapUnifiedDocumentFromDb);
    } catch {
      return [];
    }
  },

  async fetchUnifiedPayments(
    branchId: string,
    updatedAfter?: string | null
  ): Promise<UnifiedPayment[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const branchUuid = toValidUuid(branchId);
      const payments = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('unified_payments')
          .select('*')
          .eq('branch_id', branchUuid)
          .is('deleted_at', null)
          .order('payment_date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      if (payments.length === 0) return [];
      const paymentIds = payments.map((p) => p.id);
      const { data: allocRows } = await (client as any)
        .from('unified_payment_allocations')
        .select('id, payment_id, document_id, allocated_centimes, created_at')
        .in('payment_id', paymentIds)
        .is('deleted_at', null);

      const allocByPayId = new Map<string, UnifiedPaymentAllocation[]>();
      for (const a of allocRows || []) {
        const list = allocByPayId.get(a.payment_id) || [];
        list.push({
          id: a.id,
          paymentId: a.payment_id,
          documentId: a.document_id,
          allocatedCentimes: Number(a.allocated_centimes || 0),
          createdAt: a.created_at,
        });
        allocByPayId.set(a.payment_id, list);
      }

      return payments.map((p) => mapUnifiedPaymentFromDb(p, allocByPayId.get(p.id) || []));
    } catch {
      return [];
    }
  },

  async upsertUnifiedDocument(doc: UnifiedDocument, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: doc.accountId,
      businessId: doc.businessId,
      branchId: doc.branchId,
      staffId,
    });
    const payload = {
      id: toValidUuid(doc.id),
      account_id: trace.account_id,
      business_id: toValidUuid(doc.businessId),
      branch_id: trace.branch_id,
      source_vertical: doc.sourceVertical || 'trading_commercial',
      doc_type: doc.docType,
      draft_number: doc.draftNumber,
      doc_number: doc.docNumber || null,
      fiscal_year: Number(doc.fiscalYear),
      status: doc.status,
      party_id: doc.partyId || null,
      party_name: doc.partyName,
      party_nif: doc.partyNif || null,
      party_nis: doc.partyNis || null,
      party_rc: doc.partyRc || null,
      party_ai: doc.partyAi || null,
      party_address: doc.partyAddress || null,
      party_phone: doc.partyPhone || null,
      depot_id: doc.depotId || null,
      depot_name: doc.depotName || null,
      doc_date: doc.docDate,
      due_date: doc.dueDate || null,
      validity_days: doc.validityDays ?? null,
      payment_method: doc.paymentMethod,
      payment_terms: doc.paymentTerms,
      currency: doc.currency,
      fx_rate: doc.fxRate,
      fx_rate_date: doc.fxRateDate,
      timbre_basis: doc.timbreBasis,
      rate_set_id: doc.rateSetId ? toValidUuid(doc.rateSetId) : null,
      items: doc.items || [],
      tva_breakdown: doc.tvaBreakdown || [],
      total_ht_raw_centimes: doc.totalHtRawCentimes,
      general_discount_percent: doc.generalDiscountPercent,
      total_ht_final_centimes: doc.totalHtFinalCentimes,
      total_tva_centimes: doc.totalTvaCentimes,
      timbre_fiscal_centimes: doc.timbreFiscalCentimes,
      total_ttc_centimes: doc.totalTtcCentimes,
      guarantee_retention_percent: doc.guaranteeRetentionPercent,
      guarantee_retention_centimes: doc.guaranteeRetentionCentimes,
      net_to_pay_centimes: doc.netToPayCentimes,
      paid_centimes: doc.paidCentimes,
      balance_due_centimes: doc.balanceDueCentimes,
      fiscal_header_snapshot: doc.fiscalHeaderSnapshot || {},
      totals_in_words_fr: doc.totalsInWordsFr || '',
      totals_in_words_ar: doc.totalsInWordsAr || '',
      include_stamp_signature: doc.includeStampSignature,
      notes_top: doc.notesTop || null,
      notes_bottom: doc.notesBottom || null,
      linked_doc_id: doc.linkedDocId ? toValidUuid(doc.linkedDocId) : null,
      linked_doc_number: doc.linkedDocNumber || null,
      credit_note_for_doc_id: doc.creditNoteForDocId ? toValidUuid(doc.creditNoteForDocId) : null,
      source_entity_type: doc.sourceEntityType || null,
      source_entity_id: doc.sourceEntityId || null,
      issued_at: doc.issuedAt || null,
      issued_by_staff_id: doc.issuedByStaffId ? toValidUuid(doc.issuedByStaffId) : null,
      voided_at: doc.voidedAt || null,
      voided_reason: doc.voidedReason || null,
      printed_count: doc.printedCount || 0,
      updated_at: new Date().toISOString(),
    };

    const res = await syncCoordinator.mutateOrQueueUpsert('unified_documents', payload, {
      expectedVersion: doc.version,
      entityType: 'UnifiedDocument',
      entityLabel: doc.docNumber || doc.draftNumber,
      localData: payload,
    });
    return res.success;
  },

  async issueUnifiedDocument(
    docId: string,
    fiscalYear?: number
  ): Promise<{ success: boolean; docNumber?: string; status?: UnifiedDocStatus; queued?: boolean; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue<{
      document_id: string;
      doc_number: string;
      fiscal_year: number;
      status: UnifiedDocStatus;
    }>(
      'issue_unified_document',
      {
        p_doc_id: toValidUuid(docId),
        p_fiscal_year: fiscalYear ?? null,
      },
      {
        table: 'unified_documents',
        recordId: toValidUuid(docId),
        entityType: 'UnifiedDocument',
        entityLabel: docId,
      }
    );
    return {
      success: res.success,
      docNumber: res.data?.doc_number,
      status: res.data?.status,
      queued: res.queued,
      error: res.error,
    };
  },

  async recordPaymentWithAllocations(payment: UnifiedPayment): Promise<{
    success: boolean;
    paymentNumber?: string;
    status?: UnifiedPayment['status'];
    queued?: boolean;
    error?: string;
  }> {
    const res = await syncCoordinator.rpcOrQueue<{
      payment_id: string;
      payment_number: string;
      status: UnifiedPayment['status'];
    }>(
      'record_unified_payment_with_allocations',
      {
        p_payment_id: toValidUuid(payment.id),
        p_business_id: toValidUuid(payment.businessId),
        p_branch_id: toValidUuid(payment.branchId),
        p_source_vertical: payment.sourceVertical || 'trading_commercial',
        p_party_id: payment.partyId || null,
        p_party_name: payment.partyName,
        p_method: payment.method,
        p_direction: payment.direction,
        p_amount_centimes: payment.amountCentimes,
        p_currency: payment.currency,
        p_fx_rate: payment.fxRate,
        p_payment_date: payment.paymentDate,
        p_idempotency_key: payment.idempotencyKey || payment.id,
        p_allocations: (payment.allocations || []).map((a) => ({
          document_id: toValidUuid(a.documentId),
          allocated_centimes: a.allocatedCentimes,
        })),
        p_cash_session_id: payment.cashSessionId ? toValidUuid(payment.cashSessionId) : null,
        p_instrument_number: payment.instrumentNumber || null,
        p_instrument_bank: payment.instrumentBank || null,
        p_instrument_due_date: payment.instrumentDueDate || null,
        p_notes: payment.notes || null,
      },
      {
        table: 'unified_payments',
        recordId: toValidUuid(payment.id),
        entityType: 'UnifiedPayment',
        entityLabel: payment.paymentNumber || payment.partyName,
      }
    );
    return {
      success: res.success,
      paymentNumber: res.data?.payment_number,
      status: res.data?.status,
      queued: res.queued,
      error: res.error,
    };
  },

  async transitionChequeTraiteStatus(
    paymentId: string,
    nextStatus: 'deposited' | 'cleared' | 'bounced',
    reason?: string
  ): Promise<{ success: boolean; queued?: boolean; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue(
      'transition_cheque_traite_status',
      {
        p_payment_id: toValidUuid(paymentId),
        p_next_status: nextStatus,
        p_reason: reason || null,
      },
      {
        table: 'unified_payments',
        recordId: toValidUuid(paymentId),
        entityType: 'UnifiedPayment',
        entityLabel: paymentId,
      }
    );
    return {
      success: res.success,
      queued: res.queued,
      error: res.error,
    };
  },

  async deleteUnifiedDraft(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('unified_documents', id, deletedByStaffId);
    return res.success;
  },
};
