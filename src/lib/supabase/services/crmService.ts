import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { buildTraceEnvelope, syncCoordinator } from '../syncCoordinator';
import type {
  CrmChannel,
  CrmCommunicationLog,
  CrmCommunicationStatus,
  CrmFollowUpTask,
  CrmLinkEntityType,
  CrmMessageTemplate,
  CrmParty,
  CrmPartyKind,
  CrmPartyLink,
  CrmPartyNote,
  CrmTaskChannel,
  CrmTaskStatus,
} from '../../../types/index';

export function mapCrmPartyFromDb(row: any): CrmParty {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    partyKind: (row.party_kind === 'company' ? 'company' : 'person') as CrmPartyKind,
    displayName: row.display_name || '',
    phoneRaw: row.phone_raw || undefined,
    phoneE164: row.phone_e164 || undefined,
    phoneLocal: row.phone_local || undefined,
    phoneValid: Boolean(row.phone_valid),
    sharedPhoneGroup: Boolean(row.shared_phone_group),
    email: row.email || undefined,
    nif: row.nif || undefined,
    rc: row.rc || undefined,
    nis: row.nis || undefined,
    ai: row.ai || undefined,
    address: row.address || undefined,
    wilayaCode: row.wilaya_code || undefined,
    preferredLanguage: (row.preferred_language || 'fr') as 'en' | 'fr' | 'ar',
    consentSms: row.consent_sms !== false,
    consentWhatsapp: row.consent_whatsapp !== false,
    consentEmail: row.consent_email !== false,
    optOutAll: Boolean(row.opt_out_all),
    optOutReason: row.opt_out_reason || undefined,
    optOutAt: row.opt_out_at || undefined,
    mergedIntoPartyId: row.merged_into_party_id || undefined,
    mergedAt: row.merged_at || undefined,
    mergedByStaffId: row.merged_by_staff_id || undefined,
    notes: row.notes || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapCrmPartyLinkFromDb(row: any): CrmPartyLink {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    partyId: row.party_id,
    sourceVertical: row.source_vertical || 'trading_commercial',
    entityType: (row.entity_type || 'b2b_client') as CrmLinkEntityType,
    entityId: row.entity_id,
    entityLabel: row.entity_label || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapCrmPartyNoteFromDb(row: any): CrmPartyNote {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    partyId: row.party_id,
    sourceVertical: row.source_vertical || undefined,
    authorStaffId: row.author_staff_id || undefined,
    authorName: row.author_name || undefined,
    noteType: (row.note_type || 'note') as CrmPartyNote['noteType'],
    body: row.body || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapCrmFollowUpTaskFromDb(row: any): CrmFollowUpTask {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    partyId: row.party_id,
    assignedStaffId: row.assigned_staff_id || undefined,
    assignedStaffName: row.assigned_staff_name || undefined,
    title: row.title || '',
    description: row.description || undefined,
    channel: (row.channel || 'in_app') as CrmTaskChannel,
    dueAt: row.due_at,
    status: (row.status || 'open') as CrmTaskStatus,
    completedAt: row.completed_at || undefined,
    createdByStaffId: row.created_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapCrmMessageTemplateFromDb(row: any): CrmMessageTemplate {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    code: row.code,
    channel: (row.channel || 'whatsapp') as CrmChannel,
    name: row.name,
    subjectFr: row.subject_fr || undefined,
    subjectAr: row.subject_ar || undefined,
    subjectEn: row.subject_en || undefined,
    bodyFr: row.body_fr || '',
    bodyAr: row.body_ar || '',
    bodyEn: row.body_en || '',
    variables: Array.isArray(row.variables) ? row.variables : [],
    isSystem: Boolean(row.is_system),
    isActive: row.is_active !== false,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapCrmCommunicationLogFromDb(row: any): CrmCommunicationLog {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    partyId: row.party_id,
    templateId: row.template_id || undefined,
    channel: (row.channel || 'whatsapp') as CrmChannel,
    recipientAddress: row.recipient_address || '',
    language: (row.language || 'fr') as 'en' | 'fr' | 'ar',
    subject: row.subject || undefined,
    renderedBody: row.rendered_body || '',
    missingVariables: Array.isArray(row.missing_variables) ? row.missing_variables : [],
    status: (row.status || 'queued') as CrmCommunicationStatus,
    providerName: row.provider_name || undefined,
    providerMessageId: row.provider_message_id || undefined,
    errorCode: row.error_code || undefined,
    errorMessage: row.error_message || undefined,
    attempts: Number(row.attempts || 1),
    lastAttemptAt: row.last_attempt_at || row.created_at,
    sentAt: row.sent_at || undefined,
    sentByStaffId: row.sent_by_staff_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export const crmService = {
  async fetchParties(businessId: string, updatedAfter?: string | null): Promise<CrmParty[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('crm_parties')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map(mapCrmPartyFromDb);
    } catch {
      return [];
    }
  },

  async fetchPartyLinks(businessId: string, updatedAfter?: string | null): Promise<CrmPartyLink[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('crm_party_links')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map(mapCrmPartyLinkFromDb);
    } catch {
      return [];
    }
  },

  async fetchPartyNotes(businessId: string, updatedAfter?: string | null): Promise<CrmPartyNote[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('crm_party_notes')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map(mapCrmPartyNoteFromDb);
    } catch {
      return [];
    }
  },

  async fetchFollowUpTasks(
    businessId: string,
    updatedAfter?: string | null
  ): Promise<CrmFollowUpTask[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('crm_follow_up_tasks')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('due_at', { ascending: true })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map(mapCrmFollowUpTaskFromDb);
    } catch {
      return [];
    }
  },

  async fetchMessageTemplates(businessId: string): Promise<CrmMessageTemplate[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await (client as any)
        .from('crm_message_templates')
        .select('*')
        .eq('business_id', toValidUuid(businessId))
        .is('deleted_at', null)
        .order('code', { ascending: true });
      if (error || !Array.isArray(data)) return [];
      return data.map(mapCrmMessageTemplateFromDb);
    } catch {
      return [];
    }
  },

  async fetchCommunicationLogs(
    businessId: string,
    updatedAfter?: string | null
  ): Promise<CrmCommunicationLog[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const rows = await fetchAllPages<any>((from, to) => {
        let query = (client as any)
          .from('crm_communication_logs')
          .select('*')
          .eq('business_id', toValidUuid(businessId))
          .is('deleted_at', null)
          .order('last_attempt_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        if (updatedAfter) query = query.gt('updated_at', updatedAfter);
        return query;
      });
      return rows.map(mapCrmCommunicationLogFromDb);
    } catch {
      return [];
    }
  },

  async upsertParty(party: CrmParty, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: party.accountId,
      businessId: party.businessId,
      branchId: party.branchId || party.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(party.id),
      account_id: trace.account_id,
      business_id: toValidUuid(party.businessId),
      branch_id: party.branchId ? toValidUuid(party.branchId) : null,
      party_kind: party.partyKind,
      display_name: party.displayName.trim(),
      phone_raw: party.phoneRaw || null,
      phone_e164: party.phoneE164 || null,
      phone_local: party.phoneLocal || null,
      phone_valid: Boolean(party.phoneValid),
      shared_phone_group: Boolean(party.sharedPhoneGroup),
      email: party.email || null,
      nif: party.nif || null,
      rc: party.rc || null,
      nis: party.nis || null,
      ai: party.ai || null,
      address: party.address || null,
      wilaya_code: party.wilayaCode || null,
      preferred_language: party.preferredLanguage,
      consent_sms: party.consentSms,
      consent_whatsapp: party.consentWhatsapp,
      consent_email: party.consentEmail,
      opt_out_all: party.optOutAll,
      opt_out_reason: party.optOutReason || null,
      opt_out_at: party.optOutAt || null,
      merged_into_party_id: party.mergedIntoPartyId
        ? toValidUuid(party.mergedIntoPartyId)
        : null,
      merged_at: party.mergedAt || null,
      merged_by_staff_id: party.mergedByStaffId ? toValidUuid(party.mergedByStaffId) : null,
      notes: party.notes || null,
      tags: party.tags || [],
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('crm_parties', payload, {
      expectedVersion: party.version,
      entityType: 'CrmParty',
      entityLabel: party.displayName,
      localData: payload,
    });
    return res.success;
  },

  async upsertPartyLink(link: CrmPartyLink, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: link.accountId,
      businessId: link.businessId,
      branchId: link.branchId || link.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(link.id),
      account_id: trace.account_id,
      business_id: toValidUuid(link.businessId),
      branch_id: link.branchId ? toValidUuid(link.branchId) : null,
      party_id: toValidUuid(link.partyId),
      source_vertical: link.sourceVertical,
      entity_type: link.entityType,
      entity_id: link.entityId,
      entity_label: link.entityLabel || null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('crm_party_links', payload, {
      entityType: 'CrmPartyLink',
      entityLabel: link.entityLabel || link.entityId,
      localData: payload,
    });
    return res.success;
  },

  async addPartyNote(note: CrmPartyNote, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: note.accountId,
      businessId: note.businessId,
      branchId: note.branchId || note.businessId,
      staffId: staffId || note.authorStaffId,
    });
    const payload = {
      id: toValidUuid(note.id),
      account_id: trace.account_id,
      business_id: toValidUuid(note.businessId),
      branch_id: note.branchId ? toValidUuid(note.branchId) : null,
      party_id: toValidUuid(note.partyId),
      source_vertical: note.sourceVertical || null,
      author_staff_id: note.authorStaffId ? toValidUuid(note.authorStaffId) : null,
      author_name: note.authorName || null,
      note_type: note.noteType,
      body: note.body,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('crm_party_notes', payload, {
      entityType: 'CrmPartyNote',
      entityLabel: note.noteType,
      localData: payload,
    });
    return res.success;
  },

  async upsertFollowUpTask(task: CrmFollowUpTask, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: task.accountId,
      businessId: task.businessId,
      branchId: task.branchId || task.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(task.id),
      account_id: trace.account_id,
      business_id: toValidUuid(task.businessId),
      branch_id: task.branchId ? toValidUuid(task.branchId) : null,
      party_id: toValidUuid(task.partyId),
      assigned_staff_id: task.assignedStaffId ? toValidUuid(task.assignedStaffId) : null,
      assigned_staff_name: task.assignedStaffName || null,
      title: task.title.trim(),
      description: task.description || null,
      channel: task.channel,
      due_at: task.dueAt,
      status: task.status,
      completed_at: task.completedAt || null,
      created_by_staff_id: task.createdByStaffId ? toValidUuid(task.createdByStaffId) : null,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('crm_follow_up_tasks', payload, {
      expectedVersion: task.version,
      entityType: 'CrmFollowUpTask',
      entityLabel: task.title,
      localData: payload,
    });
    return res.success;
  },

  async upsertMessageTemplate(tpl: CrmMessageTemplate, staffId?: string): Promise<boolean> {
    const trace = buildTraceEnvelope({
      accountId: tpl.accountId,
      businessId: tpl.businessId,
      branchId: tpl.branchId || tpl.businessId,
      staffId,
    });
    const payload = {
      id: toValidUuid(tpl.id),
      account_id: trace.account_id,
      business_id: toValidUuid(tpl.businessId),
      branch_id: tpl.branchId ? toValidUuid(tpl.branchId) : null,
      code: tpl.code,
      channel: tpl.channel,
      name: tpl.name,
      subject_fr: tpl.subjectFr || null,
      subject_ar: tpl.subjectAr || null,
      subject_en: tpl.subjectEn || null,
      body_fr: tpl.bodyFr,
      body_ar: tpl.bodyAr,
      body_en: tpl.bodyEn,
      variables: tpl.variables || [],
      is_system: tpl.isSystem,
      is_active: tpl.isActive,
      updated_at: new Date().toISOString(),
    };
    const res = await syncCoordinator.mutateOrQueueUpsert('crm_message_templates', payload, {
      expectedVersion: tpl.version,
      entityType: 'CrmMessageTemplate',
      entityLabel: tpl.code,
      localData: payload,
    });
    return res.success;
  },

  async mergeParties(
    sourcePartyId: string,
    targetPartyId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await syncCoordinator.rpcOrQueue(
      'merge_crm_parties',
      {
        p_source_party_id: toValidUuid(sourcePartyId),
        p_target_party_id: toValidUuid(targetPartyId),
        p_reason: reason || 'Duplicate merge',
      },
      {
        table: 'crm_parties',
        recordId: toValidUuid(targetPartyId),
        entityType: 'CrmParty',
        entityLabel: `${sourcePartyId} -> ${targetPartyId}`,
      }
    );
    return { success: res.success, error: res.error };
  },

  async recordCommunicationAttempt(log: CrmCommunicationLog): Promise<{
    success: boolean;
    error?: string;
  }> {
    const res = await syncCoordinator.rpcOrQueue(
      'record_crm_communication_attempt',
      {
        p_log_id: toValidUuid(log.id),
        p_business_id: toValidUuid(log.businessId),
        p_branch_id: log.branchId ? toValidUuid(log.branchId) : null,
        p_party_id: toValidUuid(log.partyId),
        p_template_id: log.templateId ? toValidUuid(log.templateId) : null,
        p_channel: log.channel,
        p_recipient_address: log.recipientAddress,
        p_language: log.language,
        p_subject: log.subject || null,
        p_rendered_body: log.renderedBody,
        p_missing_variables: log.missingVariables || [],
        p_requested_status: log.status,
        p_provider_name: log.providerName || null,
        p_error_code: log.errorCode || null,
        p_error_message: log.errorMessage || null,
      },
      {
        table: 'crm_communication_logs',
        recordId: toValidUuid(log.id),
        entityType: 'CrmCommunicationLog',
        entityLabel: `${log.channel}:${log.recipientAddress}`,
      }
    );
    return { success: res.success, error: res.error };
  },
};
