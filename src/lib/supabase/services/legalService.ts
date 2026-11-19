import { getSupabaseClient, toValidUuid } from '../client';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  LegalMatter,
  LegalHearing,
  CPCADeadline,
  NotaryDeed,
  EscrowAccount,
  SCFJournalEntry,
  CashReceipt,
  LegalClientEntity,
} from '../../../types/index';

type DbMatterStatus = 'Open' | 'Instruction' | 'Hearing' | 'Deliberation' | 'Appeal' | 'Closed' | 'Archived';
type DbHearingStatus = 'Scheduled' | 'Postponed' | 'Held' | 'JudgmentRendered';
type DbDeadlineType = 'Appel' | 'Cassation' | 'FiscalG50' | 'CNAS' | 'DepotMemoire' | 'Autre';

function toDbMatterStatus(status: LegalMatter['status']): DbMatterStatus {
  switch (status) {
    case 'PendingHearing':
      return 'Hearing';
    case 'UnderDeliberation':
      return 'Deliberation';
    case 'Closed':
      return 'Closed';
    case 'Archived':
      return 'Archived';
    case 'Active':
    default:
      return 'Open';
  }
}

function toDbHearingStatus(status?: string): DbHearingStatus {
  if (status === 'Postponed') return 'Postponed';
  if (status === 'Attended') return 'Held';
  if (status === 'Ruled') return 'JudgmentRendered';
  return 'Scheduled';
}

function toDbDeadlineType(recourse: CPCADeadline['recourseType']): DbDeadlineType {
  if (recourse === 'pourvoi_cassation') return 'Cassation';
  if (recourse.startsWith('appel')) return 'Appel';
  return 'Autre';
}

const META_PREFIX = '__atrium_legal__:';

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

export const legalService = {
  async fetchClients(branchId: string, updatedAfter?: string | null): Promise<LegalClientEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_clients')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): LegalClientEntity => {
        const { plain: addressFr, meta } = unpackMeta(row.address);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          clientType: row.client_kind === 'Corporate' ? 'personne_morale' : 'personne_physique',
          nameFr: row.full_name,
          nameAr: meta.nameAr || row.full_name,
          ninOrNif: row.nif || '',
          commercialRegistryNumber: row.rc_number || undefined,
          phone: row.phone || '',
          email: row.email || undefined,
          addressFr,
          addressAr: meta.addressAr || addressFr,
          wilaya: meta.wilaya || '16 Alger',
          courtJurisdiction: meta.courtJurisdiction || 'Cour d\'Alger',
          activeMattersCount: Number(meta.activeMattersCount ?? 0),
          outstandingBalanceDzd: Number(meta.outstandingBalanceDzd ?? 0),
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertClient(entity: LegalClientEntity): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entity.accountId || 'acc_01',
      businessId: entity.businessId,
      branchId: entity.branchId,
      staffId: entity.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_clients', {
      id: toValidUuid(entity.id),
      ...trace,
      full_name: entity.nameFr,
      client_kind: entity.clientType === 'personne_morale' ? 'Corporate' : 'Individual',
      phone: entity.phone || null,
      email: entity.email || null,
      nif: entity.ninOrNif || null,
      rc_number: entity.commercialRegistryNumber || null,
      address: packMeta(entity.addressFr, {
        nameAr: entity.nameAr,
        addressAr: entity.addressAr,
        wilaya: entity.wilaya,
        courtJurisdiction: entity.courtJurisdiction,
        activeMattersCount: entity.activeMattersCount,
        outstandingBalanceDzd: entity.outstandingBalanceDzd,
      }),
    });
    return res.success;
  },

  async fetchMatters(branchId: string, updatedAfter?: string | null): Promise<LegalMatter[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_matters')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): LegalMatter => {
        const { plain, meta } = unpackMeta(row.notes);
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          matterNumber: row.matter_number,
          title: row.title,
          titleAr: meta.titleAr,
          category: (row.practice_area || 'Commercial') as LegalMatter['category'],
          clientName: row.client_name,
          clientNameAr: meta.clientNameAr,
          clientPhone: meta.clientPhone || '',
          clientNinOrNif: meta.clientNinOrNif,
          adversePartyName: row.opposing_party || undefined,
          adversePartyNameAr: meta.adversePartyNameAr,
          courtJurisdiction: row.jurisdiction || undefined,
          chamber: meta.chamber,
          assignedLawyer: row.lead_counsel_name || '',
          retainerAmountDzd: Number(row.agreed_fee_dzd || 0),
          trustEscrowBalanceDzd: Number(meta.trustEscrowBalanceDzd ?? 0),
          status: (meta.uiStatus || 'Active') as LegalMatter['status'],
          nextHearingDate: meta.nextHearingDate,
          cpcaDeadlineId: meta.cpcaDeadlineId,
          notes: plain || undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertMatter(matter: LegalMatter): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: matter.accountId || 'acc_01',
      businessId: matter.businessId,
      branchId: matter.branchId,
      staffId: matter.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_matters', {
      id: toValidUuid(matter.id),
      ...trace,
      matter_number: matter.matterNumber,
      title: matter.title,
      practice_area: matter.category,
      jurisdiction: matter.courtJurisdiction || null,
      court_case_number: matter.matterNumber,
      client_name: matter.clientName,
      opposing_party: matter.adversePartyName || null,
      lead_counsel_name: matter.assignedLawyer || null,
      fee_model: 'Forfait',
      agreed_fee_dzd: Number(matter.retainerAmountDzd || 0),
      status: toDbMatterStatus(matter.status),
      opened_date: matter.createdAt ? matter.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: packMeta(matter.notes, {
        uiStatus: matter.status,
        titleAr: matter.titleAr,
        clientNameAr: matter.clientNameAr,
        clientPhone: matter.clientPhone,
        clientNinOrNif: matter.clientNinOrNif,
        adversePartyNameAr: matter.adversePartyNameAr,
        chamber: matter.chamber,
        trustEscrowBalanceDzd: matter.trustEscrowBalanceDzd,
        nextHearingDate: matter.nextHearingDate,
        cpcaDeadlineId: matter.cpcaDeadlineId,
      }),
    });
    return res.success;
  },

  async deleteMatter(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_matters', id, deletedByStaffId);
    return res.success;
  },

  async fetchHearings(branchId: string, updatedAfter?: string | null): Promise<LegalHearing[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_hearings')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('hearing_at', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): LegalHearing => {
        const { plain, meta } = unpackMeta(row.outcome_notes);
        const isoDate = row.hearing_at ? String(row.hearing_at).split('T')[0] : '';
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          matterId: row.matter_id,
          matterNumber: meta.matterNumber,
          matterTitle: row.matter_title,
          matterTitleAr: meta.matterTitleAr,
          hearingDate: meta.hearingDate || isoDate,
          hearingTime: meta.hearingTime,
          courtName: row.court_name,
          courtRoom: meta.courtRoom,
          chamber: row.chamber || undefined,
          benchJudge: meta.benchJudge,
          presidingJudge: meta.presidingJudge,
          purpose: meta.purpose,
          purposeAr: meta.purposeAr,
          objective: meta.objective,
          resultSummary: meta.resultSummary,
          outcomeNotes: plain || undefined,
          postponementCode: meta.postponementCode,
          isCompleted: Boolean(meta.isCompleted),
          nextDate: meta.nextDate,
          status: meta.uiStatus || row.status,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertHearing(hearing: LegalHearing): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: hearing.accountId || 'acc_01',
      businessId: hearing.businessId,
      branchId: hearing.branchId,
      staffId: hearing.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_hearings', {
      id: toValidUuid(hearing.id),
      ...trace,
      matter_id: toValidUuid(hearing.matterId),
      matter_title: hearing.matterTitle || hearing.matterNumber || 'Dossier',
      court_name: hearing.courtName || 'Tribunal',
      chamber: hearing.chamber || null,
      hearing_at: `${hearing.hearingDate || new Date().toISOString().split('T')[0]}T${hearing.hearingTime || '09:00'}:00Z`,
      counsel_name: hearing.presidingJudge || hearing.benchJudge || null,
      status: toDbHearingStatus(hearing.status),
      outcome_notes: packMeta(hearing.outcomeNotes, {
        uiStatus: hearing.status,
        matterNumber: hearing.matterNumber,
        matterTitleAr: hearing.matterTitleAr,
        hearingDate: hearing.hearingDate,
        hearingTime: hearing.hearingTime,
        courtRoom: hearing.courtRoom,
        benchJudge: hearing.benchJudge,
        presidingJudge: hearing.presidingJudge,
        purpose: hearing.purpose,
        purposeAr: hearing.purposeAr,
        objective: hearing.objective,
        resultSummary: hearing.resultSummary,
        postponementCode: hearing.postponementCode,
        isCompleted: hearing.isCompleted,
        nextDate: hearing.nextDate,
      }),
    });
    return res.success;
  },

  async fetchCpcaDeadlines(branchId: string, updatedAfter?: string | null): Promise<CPCADeadline[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_deadlines')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): CPCADeadline | null => {
          const { meta } = unpackMeta(row.title);
          return meta.deadline ? (meta.deadline as CPCADeadline) : null;
        })
        .filter((d: CPCADeadline | null): d is CPCADeadline => Boolean(d));
    } catch {
      return [];
    }
  },

  async upsertCpcaDeadline(dl: CPCADeadline): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: dl.accountId || 'acc_01',
      businessId: dl.businessId,
      branchId: dl.branchId,
      staffId: dl.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_deadlines', {
      id: toValidUuid(dl.id),
      ...trace,
      matter_id: toValidUuid(dl.matterId),
      title: packMeta(`${dl.recourseType} — ${dl.caseNumber}`, { deadline: dl }),
      deadline_type: toDbDeadlineType(dl.recourseType),
      due_date: dl.terminalExpiryDate,
      is_forclusion_critical: dl.status === 'critical' || dl.status === 'approaching',
      is_completed: dl.status === 'filed',
      completed_at: dl.appealFilingReceipt?.filingDate ? `${dl.appealFilingReceipt.filingDate}T12:00:00Z` : null,
    });
    return res.success;
  },

  async fetchNotaryDeeds(branchId: string, updatedAfter?: string | null): Promise<NotaryDeed[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_documents')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .eq('doc_category', 'NotaryDeed')
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): NotaryDeed | null => {
          const { meta } = unpackMeta(row.file_url);
          return meta.deed ? (meta.deed as NotaryDeed) : null;
        })
        .filter((d: NotaryDeed | null): d is NotaryDeed => Boolean(d));
    } catch {
      return [];
    }
  },

  async upsertNotaryDeed(deed: NotaryDeed, matterId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: deed.accountId || 'acc_01',
      businessId: deed.businessId,
      branchId: deed.branchId,
      staffId: deed.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_documents', {
      id: toValidUuid(deed.id),
      ...trace,
      matter_id: matterId ? toValidUuid(matterId) : null,
      title: deed.title,
      doc_category: 'NotaryDeed',
      file_url: packMeta(deed.repertoireNumber, { deed }),
      confidentiality_level: 'NotarialMinute',
    });
    return res.success;
  },

  async fetchEscrowMovements(branchId: string, updatedAfter?: string | null): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_escrow_movements')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  async upsertEscrowSnapshot(escrow: EscrowAccount): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: escrow.accountId || 'acc_01',
      businessId: escrow.businessId,
      branchId: escrow.branchId,
      staffId: escrow.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_documents', {
      id: toValidUuid(`escrow_${escrow.id}`),
      ...trace,
      matter_id: toValidUuid(escrow.matterId),
      title: `CARPA ${escrow.matterReference} — ${escrow.clientName}`,
      doc_category: 'EscrowAccount',
      file_url: packMeta(escrow.matterReference, { escrow }),
      confidentiality_level: 'Restricted',
    });
    return res.success;
  },

  async recordEscrowMovement(params: {
    clientId: string;
    matterId?: string | null;
    movementType: 'deposit' | 'withdrawal' | 'fee_transfer';
    amountDzd: number;
    reference: string;
    notes?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('legal_escrow_movement', {
      p_client_id: toValidUuid(params.clientId),
      p_matter_id: params.matterId ? toValidUuid(params.matterId) : null,
      p_movement_type: params.movementType,
      p_amount_dzd: Number(params.amountDzd),
      p_reference: params.reference,
      p_notes: params.notes || null,
    });
    return res.success;
  },

  async fetchScfEntries(branchId: string, updatedAfter?: string | null): Promise<SCFJournalEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_time_entries')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .ilike('description', '__atrium_legal__:%')
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || [])
        .map((row: any): SCFJournalEntry | null => {
          const { meta } = unpackMeta(row.description);
          return meta.scfEntry ? (meta.scfEntry as SCFJournalEntry) : null;
        })
        .filter((e: SCFJournalEntry | null): e is SCFJournalEntry => Boolean(e));
    } catch {
      return [];
    }
  },

  async upsertScfEntry(entry: SCFJournalEntry, defaultMatterId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId || 'acc_01',
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_time_entries', {
      id: toValidUuid(entry.id),
      ...trace,
      matter_id: defaultMatterId ? toValidUuid(defaultMatterId) : null,
      counsel_name: entry.entryNumber,
      description: packMeta(entry.libelle, { scfEntry: entry }),
      duration_minutes: 60,
      hourly_rate_dzd: Number(entry.totalDebitDzd || 0),
      is_billable: false,
      is_billed: entry.status === 'validated',
      entry_date: entry.date || new Date().toISOString().split('T')[0],
    });
    return res.success;
  },

  async fetchCashReceipts(branchId: string, updatedAfter?: string | null): Promise<CashReceipt[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = (client as any)
        .from('legal_cash_receipts')
        .select('*')
        .eq('branch_id', toValidUuid(branchId))
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (updatedAfter) query = query.gt('updated_at', updatedAfter);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any): CashReceipt => {
        const { plain: notes, meta } = unpackMeta(row.notes);
        if (meta.receipt) return meta.receipt as CashReceipt;
        return {
          id: row.id,
          accountId: row.account_id,
          businessId: row.business_id,
          branchId: row.branch_id,
          staffId: row.staff_id || 'staff_01',
          receiptNumber: row.receipt_number,
          clientName: row.client_name,
          matterTitle: notes || '',
          totalHtDzd: Number(row.amount_dzd || 0),
          tvaDzd: 0,
          paymentMethod: (row.payment_method || 'especes') as CashReceipt['paymentMethod'],
          timbreFiscalDzd: 0,
          netCollectedDzd: Number(row.amount_dzd || 0),
          cashierName: 'Caissier',
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertCashReceipt(receipt: CashReceipt): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: receipt.accountId || 'acc_01',
      businessId: receipt.businessId,
      branchId: receipt.branchId,
      staffId: receipt.staffId,
    });
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_cash_receipts', {
      id: toValidUuid(receipt.id),
      ...trace,
      receipt_number: receipt.receiptNumber,
      invoice_id: null,
      client_name: receipt.clientName,
      amount_dzd: Number(receipt.netCollectedDzd || 0),
      payment_method: receipt.paymentMethod,
      received_date: receipt.createdAt ? receipt.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: packMeta(receipt.matterTitle, { receipt }),
    });
    return res.success;
  },
};
