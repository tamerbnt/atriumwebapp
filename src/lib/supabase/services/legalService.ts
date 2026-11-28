import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
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
  LegalTimeEntry,
  LegalFeeInvoice,
  LegalHolidayEntry,
  LegalDocTemplate,
  LegalSignedDocument,
  LegalBailiffAct,
  LegalArbitrationTimeline,
  LegalClientLedgerBook,
} from '../../../types/index';
import { computeSha256Hex, validateVaultUploadFile } from '../../../utils/legalDepth';

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
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_clients')
          .select(
            'id, account_id, business_id, branch_id, staff_id, client_kind, full_name, nif, rc_number, phone, email, address, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): LegalClientEntity => {
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
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertClient(entity: LegalClientEntity): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entity.accountId,
      businessId: entity.businessId,
      branchId: entity.branchId,
      staffId: entity.staffId,
    });
    const payload = {
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_clients', payload, {
      expectedVersion: entity.version,
      entityType: 'LegalClient',
      entityLabel: entity.nameFr,
      localData: payload,
    });
    return res.success;
  },

  async fetchMatters(branchId: string, updatedAfter?: string | null): Promise<LegalMatter[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_matters')
          .select(
            'id, account_id, business_id, branch_id, staff_id, matter_number, title, practice_area, client_name, opposing_party, jurisdiction, lead_counsel_name, agreed_fee_dzd, notes, confidentiality_level, allowed_roles, conflict_status, conflict_checked_at, conflict_override_reason, client_portal_token, portal_enabled, is_arbitration, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): LegalMatter => {
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
          confidentialityLevel: row.confidentiality_level || meta.confidentialityLevel || 'Internal',
          allowedRoles: Array.isArray(row.allowed_roles) ? row.allowed_roles : meta.allowedRoles,
          conflictStatus: row.conflict_status || meta.conflictStatus || 'clear',
          conflictCheckedAt: row.conflict_checked_at || meta.conflictCheckedAt,
          conflictOverrideReason: row.conflict_override_reason || meta.conflictOverrideReason,
          clientPortalToken: row.client_portal_token || meta.clientPortalToken,
          portalEnabled: row.portal_enabled ?? Boolean(meta.portalEnabled),
          isArbitration: row.is_arbitration ?? Boolean(meta.isArbitration),
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertMatter(matter: LegalMatter): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: matter.accountId,
      businessId: matter.businessId,
      branchId: matter.branchId,
      staffId: matter.staffId,
    });
    const payload = {
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
      confidentiality_level: matter.confidentialityLevel || 'Internal',
      allowed_roles: matter.allowedRoles || ['avocat_associe', 'notaire_titulaire', 'expert_comptable'],
      conflict_status: matter.conflictStatus || 'clear',
      conflict_checked_at: matter.conflictCheckedAt || null,
      conflict_override_reason: matter.conflictOverrideReason || null,
      client_portal_token: matter.clientPortalToken || null,
      portal_enabled: Boolean(matter.portalEnabled),
      is_arbitration: Boolean(matter.isArbitration),
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_matters', payload, {
      expectedVersion: matter.version,
      entityType: 'LegalMatter',
      entityLabel: matter.matterNumber,
      localData: payload,
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
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_hearings')
          .select(
            'id, account_id, business_id, branch_id, staff_id, matter_id, matter_title, hearing_at, court_name, chamber, outcome_notes, status, original_requested_date, auto_shifted_reason, reminder_sent_at, reminder_channel, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('hearing_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): LegalHearing => {
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
          originalRequestedDate: row.original_requested_date || meta.originalRequestedDate,
          autoShiftedReason: row.auto_shifted_reason || meta.autoShiftedReason,
          reminderSentAt: row.reminder_sent_at || meta.reminderSentAt,
          reminderChannel: row.reminder_channel || meta.reminderChannel,
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertHearing(hearing: LegalHearing): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: hearing.accountId,
      businessId: hearing.businessId,
      branchId: hearing.branchId,
      staffId: hearing.staffId,
    });
    const payload = {
      id: toValidUuid(hearing.id),
      ...trace,
      matter_id: toValidUuid(hearing.matterId),
      matter_title: hearing.matterTitle || hearing.matterNumber || 'Dossier',
      court_name: hearing.courtName || 'Tribunal',
      chamber: hearing.chamber || null,
      hearing_at: `${hearing.hearingDate || new Date().toISOString().split('T')[0]}T${hearing.hearingTime || '09:00'}:00Z`,
      counsel_name: hearing.presidingJudge || hearing.benchJudge || null,
      status: toDbHearingStatus(hearing.status),
      original_requested_date: hearing.originalRequestedDate || null,
      auto_shifted_reason: hearing.autoShiftedReason || null,
      reminder_sent_at: hearing.reminderSentAt || null,
      reminder_channel: hearing.reminderChannel || null,
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
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_hearings', payload, {
      expectedVersion: hearing.version,
      entityType: 'LegalHearing',
      entityLabel: hearing.matterTitle || hearing.matterNumber || hearing.id,
      localData: payload,
    });
    return res.success;
  },

  async fetchCpcaDeadlines(branchId: string, updatedAfter?: string | null): Promise<CPCADeadline[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_deadlines')
          .select('id, title, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('due_date', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): CPCADeadline | null => {
          const { meta } = unpackMeta(row.title);
          return meta.deadline
            ? ({
                ...(meta.deadline as CPCADeadline),
                version: row.version != null ? Number(row.version) : (meta.deadline as CPCADeadline).version,
              })
            : null;
        })
        .filter((d: CPCADeadline | null): d is CPCADeadline => Boolean(d));
    } catch {
      return [];
    }
  },

  async upsertCpcaDeadline(dl: CPCADeadline): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: dl.accountId,
      businessId: dl.businessId,
      branchId: dl.branchId,
      staffId: dl.staffId,
    });
    const payload = {
      id: toValidUuid(dl.id),
      ...trace,
      matter_id: toValidUuid(dl.matterId),
      title: packMeta(`${dl.recourseType} — ${dl.caseNumber}`, { deadline: dl }),
      deadline_type: toDbDeadlineType(dl.recourseType),
      due_date: dl.terminalExpiryDate,
      is_forclusion_critical: dl.status === 'critical' || dl.status === 'approaching',
      is_completed: dl.status === 'filed',
      completed_at: dl.appealFilingReceipt?.filingDate ? `${dl.appealFilingReceipt.filingDate}T12:00:00Z` : null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_deadlines', payload, {
      expectedVersion: dl.version,
      entityType: 'CPCADeadline',
      entityLabel: `${dl.recourseType} — ${dl.caseNumber}`,
      localData: payload,
    });
    return res.success;
  },

  async fetchNotaryDeeds(branchId: string, updatedAfter?: string | null): Promise<NotaryDeed[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_documents')
          .select('id, file_url, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .eq('doc_category', 'NotaryDeed')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): NotaryDeed | null => {
          const { meta } = unpackMeta(row.file_url);
          return meta.deed
            ? ({
                ...(meta.deed as NotaryDeed),
                version: row.version != null ? Number(row.version) : (meta.deed as NotaryDeed).version,
              })
            : null;
        })
        .filter((d: NotaryDeed | null): d is NotaryDeed => Boolean(d));
    } catch {
      return [];
    }
  },

  async upsertNotaryDeed(deed: NotaryDeed, matterId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: deed.accountId,
      businessId: deed.businessId,
      branchId: deed.branchId,
      staffId: deed.staffId,
    });
    const payload = {
      id: toValidUuid(deed.id),
      ...trace,
      matter_id: matterId ? toValidUuid(matterId) : null,
      title: deed.title,
      doc_category: 'NotaryDeed',
      file_url: packMeta(deed.repertoireNumber, { deed }),
      confidentiality_level: 'NotarialMinute',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_documents', payload, {
      expectedVersion: deed.version,
      entityType: 'NotaryDeed',
      entityLabel: deed.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchEscrowMovements(branchId: string, updatedAfter?: string | null): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      return await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_escrow_movements')
          .select(
            'id, account_id, business_id, branch_id, staff_id, client_id, matter_id, movement_type, amount_dzd, reference, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
    } catch {
      return [];
    }
  },

  async upsertEscrowSnapshot(escrow: EscrowAccount): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: escrow.accountId,
      businessId: escrow.businessId,
      branchId: escrow.branchId,
      staffId: escrow.staffId,
    });
    const payload = {
      id: toValidUuid(`escrow_${escrow.id}`),
      ...trace,
      matter_id: toValidUuid(escrow.matterId),
      title: `CARPA ${escrow.matterReference} — ${escrow.clientName}`,
      doc_category: 'EscrowAccount',
      file_url: packMeta(escrow.matterReference, { escrow }),
      confidentiality_level: 'Restricted',
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_documents', payload, {
      expectedVersion: escrow.version,
      entityType: 'EscrowAccount',
      entityLabel: `CARPA ${escrow.matterReference}`,
      localData: payload,
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
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_time_entries')
          .select('id, description, version')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .ilike('description', '__atrium_legal__:%')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data
        .map((row: any): SCFJournalEntry | null => {
          const { meta } = unpackMeta(row.description);
          if (!meta.scfEntry) return null;
          return {
            ...(meta.scfEntry as SCFJournalEntry),
            version: row.version != null ? Number(row.version) : (meta.scfEntry as SCFJournalEntry).version,
          };
        })
        .filter((e: SCFJournalEntry | null): e is SCFJournalEntry => Boolean(e));
    } catch {
      return [];
    }
  },

  async upsertScfEntry(entry: SCFJournalEntry, defaultMatterId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      matter_id: defaultMatterId ? toValidUuid(defaultMatterId) : null,
      counsel_name: entry.entryNumber,
      entry_kind: 'scf_journal',
      description: packMeta(entry.libelle, { scfEntry: entry }),
      duration_minutes: 60,
      hourly_rate_dzd: Number(entry.totalDebitDzd || 0),
      is_billable: false,
      is_billed: entry.status === 'validated',
      entry_date: entry.date || new Date().toISOString().split('T')[0],
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_time_entries', payload, {
      expectedVersion: entry.version,
      entityType: 'SCFJournalEntry',
      entityLabel: entry.entryNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchTimeEntries(branchId: string, updatedAfter?: string | null): Promise<LegalTimeEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_time_entries')
          .select(
            'id, account_id, business_id, branch_id, staff_id, matter_id, matter_number, client_name, counsel_name, activity_type, description, duration_minutes, hourly_rate_dzd, tva_rate, amount_ht_centimes, is_billable, is_billed, invoice_id, billed_at, entry_date, entry_kind, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .eq('entry_kind', 'time')
          .not('description', 'ilike', '__atrium_legal__:%')
          .is('deleted_at', null)
          .order('entry_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): LegalTimeEntry => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        matterId: row.matter_id || undefined,
        matterNumber: row.matter_number || undefined,
        clientName: row.client_name || undefined,
        counselName: row.counsel_name || 'Maître',
        activityType: (row.activity_type || 'consultation') as LegalTimeEntry['activityType'],
        description: row.description,
        durationMinutes: Number(row.duration_minutes || 0),
        hourlyRateDzd: Number(row.hourly_rate_dzd || 0),
        tvaRate: (Number(row.tva_rate ?? 19) as LegalTimeEntry['tvaRate']),
        amountHtCentimes: Number(row.amount_ht_centimes || 0),
        isBillable: Boolean(row.is_billable),
        isBilled: Boolean(row.is_billed),
        invoiceId: row.invoice_id || undefined,
        billedAt: row.billed_at || undefined,
        entryDate: row.entry_date,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertTimeEntry(entry: LegalTimeEntry): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
      staffId: entry.staffId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      matter_id: entry.matterId ? toValidUuid(entry.matterId) : null,
      matter_number: entry.matterNumber || null,
      client_name: entry.clientName || null,
      counsel_name: entry.counselName,
      entry_kind: 'time',
      activity_type: entry.activityType || 'consultation',
      description: entry.description,
      duration_minutes: Math.round(entry.durationMinutes),
      hourly_rate_dzd: Number(entry.hourlyRateDzd || 0),
      tva_rate: Number(entry.tvaRate ?? 19),
      amount_ht_centimes: Math.round(entry.amountHtCentimes || 0),
      is_billable: Boolean(entry.isBillable),
      is_billed: Boolean(entry.isBilled),
      invoice_id: entry.invoiceId ? toValidUuid(entry.invoiceId) : null,
      billed_at: entry.billedAt || null,
      entry_date: entry.entryDate,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_time_entries', payload, {
      expectedVersion: entry.version,
      entityType: 'LegalTimeEntry',
      entityLabel: entry.description,
      localData: payload,
    });
    return res.success;
  },

  async fetchFeeInvoices(branchId: string, updatedAfter?: string | null): Promise<LegalFeeInvoice[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_invoices')
          .select(
            'id, account_id, business_id, branch_id, staff_id, invoice_number, matter_id, matter_number, client_id, client_name, fees_ht_dzd, disbursements_dzd, tva_rate, tva_dzd, timbre_dzd, total_ttc_dzd, total_ttc_centimes, paid_amount_dzd, status, issue_date, due_date, line_items, time_entry_ids, unified_document_id, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('issue_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): LegalFeeInvoice => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        invoiceNumber: row.invoice_number,
        matterId: row.matter_id || undefined,
        matterNumber: row.matter_number || undefined,
        clientId: row.client_id || undefined,
        clientName: row.client_name,
        feesHtDzd: Number(row.fees_ht_dzd || 0),
        disbursementsDzd: Number(row.disbursements_dzd || 0),
        tvaRate: (Number(row.tva_rate ?? 19) as LegalFeeInvoice['tvaRate']),
        tvaDzd: Number(row.tva_dzd || 0),
        timbreDzd: Number(row.timbre_dzd || 0),
        totalTtcDzd: Number(row.total_ttc_dzd || 0),
        totalTtcCentimes: Number(row.total_ttc_centimes || Math.round(Number(row.total_ttc_dzd || 0) * 100)),
        paidAmountDzd: Number(row.paid_amount_dzd || 0),
        status: row.status || 'Sent',
        issueDate: row.issue_date,
        dueDate: row.due_date || undefined,
        timeEntryIds: Array.isArray(row.time_entry_ids) ? row.time_entry_ids : [],
        lineItems: Array.isArray(row.line_items) ? row.line_items : [],
        unifiedDocumentId: row.unified_document_id || undefined,
        notes: row.notes || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertFeeInvoice(invoice: LegalFeeInvoice): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: invoice.accountId,
      businessId: invoice.businessId,
      branchId: invoice.branchId,
      staffId: invoice.staffId,
    });
    const payload = {
      id: toValidUuid(invoice.id),
      ...trace,
      invoice_number: invoice.invoiceNumber,
      matter_id: invoice.matterId ? toValidUuid(invoice.matterId) : null,
      matter_number: invoice.matterNumber || null,
      client_id: invoice.clientId ? toValidUuid(invoice.clientId) : null,
      client_name: invoice.clientName,
      fees_ht_dzd: Number(invoice.feesHtDzd || 0),
      disbursements_dzd: Number(invoice.disbursementsDzd || 0),
      tva_rate: Number(invoice.tvaRate ?? 19),
      tva_dzd: Number(invoice.tvaDzd || 0),
      timbre_dzd: Number(invoice.timbreDzd || 0),
      total_ttc_dzd: Number(invoice.totalTtcDzd || 0),
      total_ttc_centimes: Math.round(invoice.totalTtcCentimes || 0),
      paid_amount_dzd: Number(invoice.paidAmountDzd || 0),
      status: invoice.status,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate || null,
      line_items: invoice.lineItems || [],
      time_entry_ids: (invoice.timeEntryIds || []).map((id) => toValidUuid(id)),
      unified_document_id: invoice.unifiedDocumentId ? toValidUuid(invoice.unifiedDocumentId) : null,
      notes: invoice.notes || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_invoices', payload, {
      expectedVersion: invoice.version,
      entityType: 'LegalFeeInvoice',
      entityLabel: invoice.invoiceNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchCashReceipts(branchId: string, updatedAfter?: string | null): Promise<CashReceipt[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('legal_cash_receipts')
          .select(
            'id, account_id, business_id, branch_id, staff_id, receipt_number, client_name, amount_dzd, payment_method, notes, version, created_at'
          )
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });

      return data.map((row: any): CashReceipt => {
        const { plain: notes, meta } = unpackMeta(row.notes);
        if (meta.receipt) {
          return {
            ...(meta.receipt as CashReceipt),
            version: row.version != null ? Number(row.version) : (meta.receipt as CashReceipt).version,
          };
        }
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
          version: row.version != null ? Number(row.version) : undefined,
          createdAt: row.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async upsertCashReceipt(receipt: CashReceipt): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: receipt.accountId,
      businessId: receipt.businessId,
      branchId: receipt.branchId,
      staffId: receipt.staffId,
    });
    const payload = {
      id: toValidUuid(receipt.id),
      ...trace,
      receipt_number: receipt.receiptNumber,
      invoice_id: null,
      client_name: receipt.clientName,
      amount_dzd: Number(receipt.netCollectedDzd || 0),
      payment_method: receipt.paymentMethod,
      received_date: receipt.createdAt ? receipt.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: packMeta(receipt.matterTitle, { receipt }),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_cash_receipts', payload, {
      expectedVersion: receipt.version,
      entityType: 'CashReceipt',
      entityLabel: receipt.receiptNumber,
      localData: payload,
    });
    return res.success;
  },

  async deleteClient(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_clients', id, deletedByStaffId);
    return res.success;
  },

  async deleteHearing(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_hearings', id, deletedByStaffId);
    return res.success;
  },

  async deleteCpcaDeadline(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_deadlines', id, deletedByStaffId);
    return res.success;
  },

  async deleteNotaryDeed(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_documents', id, deletedByStaffId);
    return res.success;
  },

  async deleteScfEntry(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_time_entries', id, deletedByStaffId);
    return res.success;
  },

  async deleteCashReceipt(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_cash_receipts', id, deletedByStaffId);
    return res.success;
  },

  async deleteTimeEntry(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_time_entries', id, deletedByStaffId);
    return res.success;
  },

  async fetchHolidays(branchId: string): Promise<LegalHolidayEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('legal_holiday_calendars')
          .select('id, account_id, business_id, branch_id, holiday_date, label, label_ar, holiday_kind, is_active, version, created_at')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('holiday_date', { ascending: true })
          .range(from, to)
      );
      return data.map((row: any): LegalHolidayEntry => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        holidayDate: row.holiday_date,
        label: row.label,
        labelAr: row.label_ar || undefined,
        holidayKind: row.holiday_kind || 'custom',
        isActive: row.is_active ?? true,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertHoliday(entry: LegalHolidayEntry): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: entry.accountId,
      businessId: entry.businessId,
      branchId: entry.branchId,
    });
    const payload = {
      id: toValidUuid(entry.id),
      ...trace,
      holiday_date: entry.holidayDate,
      label: entry.label,
      label_ar: entry.labelAr || null,
      holiday_kind: entry.holidayKind,
      is_active: entry.isActive,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_holiday_calendars', payload, {
      expectedVersion: entry.version,
      entityType: 'LegalHolidayEntry',
      entityLabel: entry.label,
      localData: payload,
    });
    return res.success;
  },

  async deleteHoliday(id: string, deletedByStaffId?: string): Promise<boolean> {
    const res = await syncCoordinator.softDeleteRow('legal_holiday_calendars', id, deletedByStaffId);
    return res.success;
  },

  async recalculateDeadlinesOnHolidaysRpc(branchId: string, holidayDates: string[]): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('legal_recalculate_deadlines_on_holidays', {
      p_branch_id: toValidUuid(branchId),
      p_holiday_dates: holidayDates,
    });
    return res.success;
  },

  async upsertEscrowLedger(escrow: EscrowAccount): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: escrow.accountId,
      businessId: escrow.businessId,
      branchId: escrow.branchId,
      staffId: escrow.staffId,
    });
    const payload = {
      id: toValidUuid(escrow.id),
      ...trace,
      matter_id: escrow.matterId ? toValidUuid(escrow.matterId) : null,
      matter_reference: escrow.matterReference,
      client_name: escrow.clientName,
      beneficiary_name: escrow.beneficiaryName,
      bank_account_ref: escrow.bankAccountRef || null,
      bank_statement_balance_centimes: Math.round(
        Number(escrow.bankStatementBalanceDzd ?? escrow.currentBalanceDzd ?? 0) * 100
      ),
      total_deposited_centimes: Math.round(Number(escrow.totalDepositedDzd || 0) * 100),
      total_disbursed_centimes: Math.round(Number(escrow.totalDisbursedDzd || 0) * 100),
      current_balance_centimes: Math.round(Number(escrow.currentBalanceDzd || 0) * 100),
      is_locked: Boolean(escrow.isLocked),
      cadastral_volume: escrow.cadastralClearanceProof?.volume || null,
      cadastral_number: escrow.cadastralClearanceProof?.number || null,
      cadastral_recorded_at: escrow.cadastralClearanceProof?.recordedAt || null,
      release_pin_hash: escrow.releasePinHash || null,
      reconciled_at: escrow.reconciledAt || null,
      transactions: escrow.transactions || [],
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_escrow_accounts', payload, {
      expectedVersion: escrow.version,
      entityType: 'EscrowAccount',
      entityLabel: escrow.matterReference,
      localData: payload,
    });
    return res.success;
  },

  async releaseEscrowGuardedRpc(params: {
    escrowId: string;
    payoutDzd: number;
    pinEntered: string;
    requiredPinHash?: string;
    requireCadastre?: boolean;
    actorName?: string;
    notes?: string;
  }): Promise<boolean> {
    const res = await syncCoordinator.rpcOrQueue('legal_release_escrow_guarded', {
      p_escrow_id: toValidUuid(params.escrowId),
      p_payout_centimes: Math.round(Number(params.payoutDzd || 0) * 100),
      p_pin_entered: params.pinEntered,
      p_required_pin: params.requiredPinHash || null,
      p_require_cadastre: params.requireCadastre ?? true,
      p_actor_name: params.actorName || 'Maître',
      p_notes: params.notes || null,
    });
    return res.success;
  },

  async upsertDocTemplate(tpl: LegalDocTemplate): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: tpl.accountId,
      businessId: tpl.businessId,
      branchId: tpl.branchId,
    });
    const payload = {
      id: toValidUuid(tpl.id),
      ...trace,
      code: tpl.code,
      title: tpl.title,
      title_ar: tpl.titleAr || null,
      template_type: tpl.templateType,
      body_template: tpl.bodyTemplate,
      variables: tpl.variables || [],
      is_system: Boolean(tpl.isSystem),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_doc_templates', payload, {
      expectedVersion: tpl.version,
      entityType: 'LegalDocTemplate',
      entityLabel: tpl.title,
      localData: payload,
    });
    return res.success;
  },

  async uploadVaultDocumentFile(params: {
    branchId: string;
    file: File;
  }): Promise<{ ok: boolean; sha256Hash?: string; storagePath?: string; fileUrl?: string; reason?: string }> {
    const check = validateVaultUploadFile({
      name: params.file.name,
      size: params.file.size,
      type: params.file.type,
    });
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }

    const buf = new Uint8Array(await params.file.arrayBuffer());
    const sha256Hash = computeSha256Hex(buf);
    const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const storagePath = `${toValidUuid(params.branchId)}/${Date.now()}_${safeName}`;

    const client = getSupabaseClient();
    if (client?.storage) {
      try {
        const { error } = await client.storage.from('legal-vault').upload(storagePath, params.file, {
          contentType: params.file.type || 'application/octet-stream',
          upsert: false,
        });
        if (!error) {
          return { ok: true, sha256Hash, storagePath, fileUrl: `storage://legal-vault/${storagePath}` };
        }
      } catch {
        // Offline/unauthenticated preview fallback keeps verified SHA-256 metadata queued for sync
      }
    }
    return {
      ok: true,
      sha256Hash,
      storagePath,
      fileUrl: `local-vault://${storagePath}`,
    };
  },

  async upsertSignedVaultDocument(doc: LegalSignedDocument): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: doc.accountId,
      businessId: doc.businessId,
      branchId: doc.branchId,
      staffId: doc.staffId,
    });
    const payload = {
      id: toValidUuid(doc.id),
      ...trace,
      matter_id: doc.matterId ? toValidUuid(doc.matterId) : null,
      matter_reference: doc.matterReference || null,
      vault_code: doc.vaultCode || null,
      title: doc.title,
      doc_category: doc.docCategory,
      role_scope: doc.roleScope,
      vault_status: doc.vaultStatus,
      confidentiality_level: doc.confidentialityLevel,
      file_url: doc.fileUrl || null,
      storage_bucket: doc.storageBucket || 'legal-vault',
      storage_path: doc.storagePath || null,
      sha256_hash: doc.sha256Hash || null,
      file_size_bytes: doc.fileSizeBytes ?? null,
      mime_type: doc.mimeType || null,
      official_seal_number: doc.officialSealNumber || null,
      cadastral_volume: doc.cadastralVolume || null,
      cadastral_number: doc.cadastralNumber || null,
      template_id: doc.templateId ? toValidUuid(doc.templateId) : null,
      rendered_body: doc.renderedBody || null,
      signature_svg: doc.signatureSvg || null,
      signed_by_name: doc.signedByName || null,
      signed_at: doc.signedAt || null,
      is_portal_shared: Boolean(doc.isPortalShared),
      deposit_date: doc.depositDate || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_documents', payload, {
      expectedVersion: doc.version,
      entityType: 'LegalSignedDocument',
      entityLabel: doc.title,
      localData: payload,
    });
    return res.success;
  },

  async fetchBailiffActs(branchId: string): Promise<LegalBailiffAct[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('legal_bailiff_acts')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('service_date', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): LegalBailiffAct => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        actNumber: row.act_number,
        matterId: row.matter_id || undefined,
        matterNumber: row.matter_number || undefined,
        actKind: row.act_kind,
        bailiffName: row.bailiff_name,
        recipientName: row.recipient_name,
        serviceMode: row.service_mode,
        serviceDate: row.service_date,
        linkedCpcaDeadlineId: row.linked_cpca_deadline_id || undefined,
        pvSummary: row.pv_summary || undefined,
        status: row.status,
        feeCentimes: Number(row.fee_centimes || 0),
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertBailiffAct(act: LegalBailiffAct): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: act.accountId,
      businessId: act.businessId,
      branchId: act.branchId,
      staffId: act.staffId,
    });
    const payload = {
      id: toValidUuid(act.id),
      ...trace,
      act_number: act.actNumber,
      matter_id: act.matterId ? toValidUuid(act.matterId) : null,
      matter_number: act.matterNumber || null,
      act_kind: act.actKind,
      bailiff_name: act.bailiffName,
      recipient_name: act.recipientName,
      service_mode: act.serviceMode,
      service_date: act.serviceDate,
      linked_cpca_deadline_id: act.linkedCpcaDeadlineId ? toValidUuid(act.linkedCpcaDeadlineId) : null,
      pv_summary: act.pvSummary || null,
      status: act.status,
      fee_centimes: Math.round(act.feeCentimes || 0),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_bailiff_acts', payload, {
      expectedVersion: act.version,
      entityType: 'LegalBailiffAct',
      entityLabel: act.actNumber,
      localData: payload,
    });
    return res.success;
  },

  async fetchArbitrationTimelines(branchId: string): Promise<LegalArbitrationTimeline[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('legal_arbitration_timelines')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): LegalArbitrationTimeline => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        caseCode: row.case_code,
        matterId: row.matter_id || undefined,
        matterNumber: row.matter_number || undefined,
        arbitrationSeat: row.arbitration_seat,
        rulesFramework: row.rules_framework,
        tribunalChair: row.tribunal_chair || undefined,
        claimantName: row.claimant_name,
        respondentName: row.respondent_name,
        amountInDisputeCentimes: Number(row.amount_in_dispute_centimes || 0),
        phase: row.phase,
        milestones: Array.isArray(row.milestones) ? row.milestones : [],
        awardDueDate: row.award_due_date || undefined,
        status: row.status,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertArbitrationTimeline(arb: LegalArbitrationTimeline): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: arb.accountId,
      businessId: arb.businessId,
      branchId: arb.branchId,
      staffId: arb.staffId,
    });
    const payload = {
      id: toValidUuid(arb.id),
      ...trace,
      case_code: arb.caseCode,
      matter_id: arb.matterId ? toValidUuid(arb.matterId) : null,
      matter_number: arb.matterNumber || null,
      arbitration_seat: arb.arbitrationSeat,
      rules_framework: arb.rulesFramework,
      tribunal_chair: arb.tribunalChair || null,
      claimant_name: arb.claimantName,
      respondent_name: arb.respondentName,
      amount_in_dispute_centimes: Math.round(arb.amountInDisputeCentimes || 0),
      phase: arb.phase,
      milestones: arb.milestones || [],
      award_due_date: arb.awardDueDate || null,
      status: arb.status,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_arbitration_timelines', payload, {
      expectedVersion: arb.version,
      entityType: 'LegalArbitrationTimeline',
      entityLabel: arb.caseCode,
      localData: payload,
    });
    return res.success;
  },

  async fetchClientLedgers(branchId: string): Promise<LegalClientLedgerBook[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const data = await fetchAllPages<any>((from, to) =>
        (client as any)
          .from('legal_client_ledgers')
          .select('*')
          .eq('branch_id', toValidUuid(branchId))
          .is('deleted_at', null)
          .order('fiscal_period', { ascending: false })
          .range(from, to)
      );
      return data.map((row: any): LegalClientLedgerBook => ({
        id: row.id,
        accountId: row.account_id,
        businessId: row.business_id,
        branchId: row.branch_id,
        staffId: row.staff_id || 'staff_01',
        dossierCode: row.dossier_code,
        clientId: row.client_id || undefined,
        clientName: row.client_name,
        clientNif: row.client_nif || undefined,
        fiscalRegime: row.fiscal_regime || 'Reel',
        fiscalPeriod: row.fiscal_period,
        tvaCollecteeCentimes: Number(row.tva_collectee_centimes || 0),
        tvaDeductibleCentimes: Number(row.tva_deductible_centimes || 0),
        creditTvaAnterieurCentimes: Number(row.credit_tva_anterieur_centimes || 0),
        tvaNetDueCentimes: Number(row.tva_net_due_centimes || 0),
        tapBaseCentimes: Number(row.tap_base_centimes || 0),
        irgSalairesCentimes: Number(row.irg_salaires_centimes || 0),
        ibsAcompteCentimes: Number(row.ibs_acompte_centimes || 0),
        timbreFiscalCentimes: Number(row.timbre_fiscal_centimes || 0),
        totalG50DueCentimes: Number(row.total_g50_due_centimes || 0),
        trialBalanceJson: Array.isArray(row.trial_balance_json) ? row.trial_balance_json : [],
        g50Status: row.g50_status || 'draft',
        liasseReady: Boolean(row.liasse_ready),
        filedAt: row.filed_at || undefined,
        version: row.version != null ? Number(row.version) : undefined,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async upsertClientLedger(book: LegalClientLedgerBook): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: book.accountId,
      businessId: book.businessId,
      branchId: book.branchId,
      staffId: book.staffId,
    });
    const payload = {
      id: toValidUuid(book.id),
      ...trace,
      dossier_code: book.dossierCode,
      client_id: book.clientId ? toValidUuid(book.clientId) : null,
      client_name: book.clientName,
      client_nif: book.clientNif || null,
      fiscal_regime: book.fiscalRegime,
      fiscal_period: book.fiscalPeriod,
      tva_collectee_centimes: Math.round(book.tvaCollecteeCentimes || 0),
      tva_deductible_centimes: Math.round(book.tvaDeductibleCentimes || 0),
      credit_tva_anterieur_centimes: Math.round(book.creditTvaAnterieurCentimes || 0),
      tva_net_due_centimes: Math.round(book.tvaNetDueCentimes || 0),
      tap_base_centimes: Math.round(book.tapBaseCentimes || 0),
      irg_salaires_centimes: Math.round(book.irgSalairesCentimes || 0),
      ibs_acompte_centimes: Math.round(book.ibsAcompteCentimes || 0),
      timbre_fiscal_centimes: Math.round(book.timbreFiscalCentimes || 0),
      total_g50_due_centimes: Math.round(book.totalG50DueCentimes || 0),
      trial_balance_json: book.trialBalanceJson || [],
      g50_status: book.g50Status,
      liasse_ready: Boolean(book.liasseReady),
      filed_at: book.filedAt || null,
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('legal_client_ledgers', payload, {
      expectedVersion: book.version,
      entityType: 'LegalClientLedgerBook',
      entityLabel: book.dossierCode,
      localData: payload,
    });
    return res.success;
  },
};
