import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { syncCoordinator } from '../syncCoordinator';
import type {
  ApprovalActionScope,
  ApprovalRequestStatus,
  PlatformApiKey,
  PlatformApiScope,
  PlatformApprovalRequest,
  PlatformApprovalRule,
  PlatformAttachmentRecord,
  PlatformCustomField,
  PlatformCustomFieldType,
  PlatformPrintTemplate,
  PlatformWebhook,
  PlatformWebhookDelivery,
  PlatformWebhookEventType,
  PrintTemplateDocType,
  VirusScanStatus,
  WebhookDeliveryStatus,
} from '../../../types/index';

export function mapApprovalRuleFromDb(row: any): PlatformApprovalRule {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    actionScope: row.action_scope as ApprovalActionScope,
    ruleName: row.rule_name || '',
    thresholdCentimes: Number(row.threshold_centimes ?? 0),
    thresholdPercent: row.threshold_percent != null ? Number(row.threshold_percent) : null,
    approverRoles: Array.isArray(row.approver_roles) ? row.approver_roles : ['owner'],
    requireDualControl: row.require_dual_control !== false,
    isActive: row.is_active !== false,
    updatedByStaffId: row.updated_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapApprovalRequestFromDb(row: any): PlatformApprovalRequest {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    ruleId: row.rule_id || undefined,
    actionScope: row.action_scope as ApprovalActionScope,
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    entityLabel: row.entity_label || '',
    amountCentimes: Number(row.amount_centimes ?? 0),
    percentDelta: row.percent_delta != null ? Number(row.percent_delta) : null,
    reason: row.reason || '',
    status: (row.status || 'pending') as ApprovalRequestStatus,
    requestedByStaffId: row.requested_by_staff_id || undefined,
    requestedByName: row.requested_by_name || undefined,
    decidedByStaffId: row.decided_by_staff_id || undefined,
    decidedByName: row.decided_by_name || undefined,
    decisionNote: row.decision_note || undefined,
    decidedAt: row.decided_at || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapAttachmentFromDb(row: any): PlatformAttachmentRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    entityLabel: row.entity_label || '',
    bucket: row.bucket || 'platform-attachments',
    storagePath: row.storage_path || '',
    fileName: row.file_name || '',
    mimeType: row.mime_type || 'application/pdf',
    sizeBytes: Number(row.size_bytes ?? 0),
    sha256: row.sha256 || '',
    virusScanStatus: (row.virus_scan_status || 'clean') as VirusScanStatus,
    signedUrlToken: row.signed_url_token || undefined,
    signedUrlExpiresAt: row.signed_url_expires_at || undefined,
    retentionDays: Number(row.retention_days ?? 1825),
    legalHold: Boolean(row.legal_hold),
    eSignatureDataUrl: row.e_signature_data_url || undefined,
    customMetadata: row.custom_metadata || {},
    uploadedByStaffId: row.uploaded_by_staff_id || undefined,
    purgedAt: row.purged_at || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapCustomFieldFromDb(row: any): PlatformCustomField {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    entityType: row.entity_type || 'member',
    fieldKey: row.field_key || '',
    labelEn: row.label_en || '',
    labelFr: row.label_fr || '',
    labelAr: row.label_ar || '',
    fieldType: (row.field_type || 'text') as PlatformCustomFieldType,
    options: Array.isArray(row.options_json) ? row.options_json : [],
    isRequired: Boolean(row.is_required),
    isActive: row.is_active !== false,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapPrintTemplateFromDb(row: any): PlatformPrintTemplate {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    docType: (row.doc_type || 'invoice') as PrintTemplateDocType,
    headerNote: row.header_note || '',
    footerNote: row.footer_note || '',
    accentColor: row.accent_color || '#D4522F',
    showQr: row.show_qr !== false,
    showStamp: row.show_stamp !== false,
    showSignature: row.show_signature !== false,
    rtlMirrorLayout: row.rtl_mirror_layout !== false,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapApiKeyFromDb(row: any): PlatformApiKey {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    label: row.label || '',
    keyPrefix: row.key_prefix || '',
    keyHash: row.key_hash || '',
    scopes: Array.isArray(row.scopes) ? (row.scopes as PlatformApiScope[]) : [],
    rateLimitPerMinute: Number(row.rate_limit_per_minute ?? 120),
    status: row.status === 'revoked' ? 'revoked' : 'active',
    expiresAt: row.expires_at || undefined,
    lastUsedAt: row.last_used_at || undefined,
    revokedAt: row.revoked_at || undefined,
    createdByStaffId: row.created_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWebhookFromDb(row: any): PlatformWebhook {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    label: row.label || '',
    endpointUrl: row.endpoint_url || '',
    subscribedEvents: Array.isArray(row.subscribed_events)
      ? (row.subscribed_events as PlatformWebhookEventType[])
      : [],
    signingSecretMasked: row.signing_secret_masked || '',
    signingSecretHash: row.signing_secret_hash || '',
    status: row.status === 'paused' ? 'paused' : 'active',
    maxRetries: Number(row.max_retries ?? 5),
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapWebhookDeliveryFromDb(row: any): PlatformWebhookDelivery {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    webhookId: row.webhook_id,
    eventType: row.event_type as PlatformWebhookEventType,
    idempotencyKey: row.idempotency_key || '',
    payloadJson: row.payload_json || {},
    signatureHeader: row.signature_header || '',
    status: (row.status || 'pending') as WebhookDeliveryStatus,
    attemptCount: Number(row.attempt_count ?? 1),
    httpStatus: row.http_status != null ? Number(row.http_status) : null,
    responseSnippet: row.response_snippet || undefined,
    nextRetryAt: row.next_retry_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export const platformGovernanceService = {
  async fetchForBusiness(businessId: string): Promise<{
    rules: PlatformApprovalRule[];
    requests: PlatformApprovalRequest[];
    attachments: PlatformAttachmentRecord[];
    customFields: PlatformCustomField[];
    printTemplates: PlatformPrintTemplate[];
    apiKeys: PlatformApiKey[];
    webhooks: PlatformWebhook[];
    webhookDeliveries: PlatformWebhookDelivery[];
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        rules: [],
        requests: [],
        attachments: [],
        customFields: [],
        printTemplates: [],
        apiKeys: [],
        webhooks: [],
        webhookDeliveries: [],
      };
    }
    const bizUuid = toValidUuid(businessId);
    try {
      const fetchTable = (tbl: string, orderCol = 'created_at') =>
        fetchAllPages<any>((from, to) =>
          (client as any)
            .from(tbl)
            .select('*')
            .eq('business_id', bizUuid)
            .is('deleted_at', null)
            .order(orderCol, { ascending: false })
            .range(from, to)
        );
      const [
        ruleRows,
        reqRows,
        attRows,
        cfRows,
        ptRows,
        keyRows,
        whRows,
        delivRows,
      ] = await Promise.all([
        fetchTable('platform_approval_rules'),
        fetchTable('platform_approval_requests'),
        fetchTable('platform_attachments'),
        fetchTable('platform_custom_fields'),
        fetchTable('platform_print_templates'),
        fetchTable('platform_api_keys'),
        fetchTable('platform_webhooks'),
        fetchTable('platform_webhook_deliveries'),
      ]);
      return {
        rules: ruleRows.map(mapApprovalRuleFromDb),
        requests: reqRows.map(mapApprovalRequestFromDb),
        attachments: attRows.map(mapAttachmentFromDb),
        customFields: cfRows.map(mapCustomFieldFromDb),
        printTemplates: ptRows.map(mapPrintTemplateFromDb),
        apiKeys: keyRows.map(mapApiKeyFromDb),
        webhooks: whRows.map(mapWebhookFromDb),
        webhookDeliveries: delivRows.map(mapWebhookDeliveryFromDb),
      };
    } catch {
      return {
        rules: [],
        requests: [],
        attachments: [],
        customFields: [],
        printTemplates: [],
        apiKeys: [],
        webhooks: [],
        webhookDeliveries: [],
      };
    }
  },

  async upsertApprovalRule(rule: PlatformApprovalRule, staffId?: string): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'platform_approval_rules',
      {
        id: toValidUuid(rule.id),
        account_id: toValidUuid(rule.accountId),
        business_id: toValidUuid(rule.businessId),
        branch_id: rule.branchId ? toValidUuid(rule.branchId) : null,
        action_scope: rule.actionScope,
        rule_name: rule.ruleName,
        threshold_centimes: Math.max(0, Math.round(rule.thresholdCentimes)),
        threshold_percent: rule.thresholdPercent ?? null,
        approver_roles: rule.approverRoles,
        require_dual_control: rule.requireDualControl,
        is_active: rule.isActive,
        updated_by_staff_id: staffId ? toValidUuid(staffId) : null,
        version: rule.version ?? 1,
        created_at: rule.createdAt,
        updated_at: rule.updatedAt,
      },
      {
        onConflict: 'business_id,action_scope',
        expectedVersion: rule.version ?? 1,
        entityType: 'platform_approval_rule',
        entityLabel: rule.ruleName,
      }
    );
  },

  async upsertApprovalRequest(req: PlatformApprovalRequest): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'platform_approval_requests',
      {
        id: toValidUuid(req.id),
        account_id: toValidUuid(req.accountId),
        business_id: toValidUuid(req.businessId),
        branch_id: req.branchId ? toValidUuid(req.branchId) : null,
        rule_id: req.ruleId ? toValidUuid(req.ruleId) : null,
        action_scope: req.actionScope,
        entity_type: req.entityType,
        entity_id: req.entityId,
        entity_label: req.entityLabel,
        amount_centimes: Math.max(0, Math.round(req.amountCentimes)),
        percent_delta: req.percentDelta ?? null,
        reason: req.reason,
        status: req.status,
        requested_by_staff_id: req.requestedByStaffId ? toValidUuid(req.requestedByStaffId) : null,
        requested_by_name: req.requestedByName || null,
        decided_by_staff_id: req.decidedByStaffId ? toValidUuid(req.decidedByStaffId) : null,
        decided_by_name: req.decidedByName || null,
        decision_note: req.decisionNote || null,
        decided_at: req.decidedAt || null,
        version: req.version ?? 1,
        created_at: req.createdAt,
        updated_at: req.updatedAt,
      },
      {
        onConflict: 'id',
        expectedVersion: req.version ?? 1,
        entityType: 'platform_approval_request',
        entityLabel: req.entityLabel,
      }
    );
  },

  async decideApproval(params: {
    requestId: string;
    decision: 'approved' | 'rejected' | 'cancelled';
    note?: string;
  }): Promise<void> {
    const recordId = toValidUuid(params.requestId);
    await syncCoordinator.rpcOrQueue(
      'decide_platform_approval',
      {
        p_request_id: recordId,
        p_decision: params.decision,
        p_decision_note: params.note || null,
      },
      {
        table: 'platform_approval_requests',
        recordId,
        entityType: 'platform_approval_request',
        entityLabel: `${params.decision}:${params.requestId}`,
      }
    );
  },

  async upsertAttachment(att: PlatformAttachmentRecord): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'platform_attachments',
      {
        id: toValidUuid(att.id),
        account_id: toValidUuid(att.accountId),
        business_id: toValidUuid(att.businessId),
        branch_id: att.branchId ? toValidUuid(att.branchId) : null,
        entity_type: att.entityType,
        entity_id: att.entityId,
        entity_label: att.entityLabel,
        bucket: att.bucket,
        storage_path: att.storagePath,
        file_name: att.fileName,
        mime_type: att.mimeType,
        size_bytes: att.sizeBytes,
        sha256: att.sha256,
        virus_scan_status: att.virusScanStatus,
        signed_url_token: att.signedUrlToken || null,
        signed_url_expires_at: att.signedUrlExpiresAt || null,
        retention_days: att.retentionDays,
        legal_hold: att.legalHold,
        e_signature_data_url: att.eSignatureDataUrl || null,
        custom_metadata: att.customMetadata || {},
        uploaded_by_staff_id: att.uploadedByStaffId ? toValidUuid(att.uploadedByStaffId) : null,
        purged_at: att.purgedAt || null,
        version: att.version ?? 1,
        created_at: att.createdAt,
        updated_at: att.updatedAt,
      },
      {
        onConflict: 'id',
        expectedVersion: att.version ?? 1,
        entityType: 'platform_attachment',
        entityLabel: att.fileName,
      }
    );
  },

  async purgeAttachment(attachmentId: string): Promise<void> {
    const recordId = toValidUuid(attachmentId);
    await syncCoordinator.rpcOrQueue(
      'purge_expired_platform_attachment',
      { p_attachment_id: recordId },
      {
        table: 'platform_attachments',
        recordId,
        entityType: 'platform_attachment',
        entityLabel: attachmentId,
      }
    );
  },

  async upsertCustomField(cf: PlatformCustomField): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'platform_custom_fields',
      {
        id: toValidUuid(cf.id),
        account_id: toValidUuid(cf.accountId),
        business_id: toValidUuid(cf.businessId),
        entity_type: cf.entityType,
        field_key: cf.fieldKey,
        label_en: cf.labelEn,
        label_fr: cf.labelFr,
        label_ar: cf.labelAr,
        field_type: cf.fieldType,
        options_json: cf.options || [],
        is_required: cf.isRequired,
        is_active: cf.isActive,
        version: cf.version ?? 1,
        created_at: cf.createdAt,
        updated_at: cf.updatedAt,
      },
      {
        onConflict: 'business_id,entity_type,field_key',
        expectedVersion: cf.version ?? 1,
        entityType: 'platform_custom_field',
        entityLabel: cf.fieldKey,
      }
    );
  },

  async upsertPrintTemplate(tpl: PlatformPrintTemplate): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'platform_print_templates',
      {
        id: toValidUuid(tpl.id),
        account_id: toValidUuid(tpl.accountId),
        business_id: toValidUuid(tpl.businessId),
        doc_type: tpl.docType,
        header_note: tpl.headerNote || null,
        footer_note: tpl.footerNote || null,
        accent_color: tpl.accentColor,
        show_qr: tpl.showQr,
        show_stamp: tpl.showStamp,
        show_signature: tpl.showSignature,
        rtl_mirror_layout: tpl.rtlMirrorLayout,
        version: tpl.version ?? 1,
        created_at: tpl.createdAt,
        updated_at: tpl.updatedAt,
      },
      {
        onConflict: 'business_id,doc_type',
        expectedVersion: tpl.version ?? 1,
        entityType: 'platform_print_template',
        entityLabel: tpl.docType,
      }
    );
  },

  async upsertApiKey(key: PlatformApiKey): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'platform_api_keys',
      {
        id: toValidUuid(key.id),
        account_id: toValidUuid(key.accountId),
        business_id: toValidUuid(key.businessId),
        branch_id: key.branchId ? toValidUuid(key.branchId) : null,
        label: key.label,
        key_prefix: key.keyPrefix,
        key_hash: key.keyHash,
        scopes: key.scopes,
        rate_limit_per_minute: key.rateLimitPerMinute,
        status: key.status,
        expires_at: key.expiresAt || null,
        last_used_at: key.lastUsedAt || null,
        revoked_at: key.revokedAt || null,
        created_by_staff_id: key.createdByStaffId ? toValidUuid(key.createdByStaffId) : null,
        version: key.version ?? 1,
        created_at: key.createdAt,
        updated_at: key.updatedAt,
      },
      {
        onConflict: 'id',
        expectedVersion: key.version ?? 1,
        entityType: 'platform_api_key',
        entityLabel: key.label,
      }
    );
  },

  async upsertWebhook(wh: PlatformWebhook): Promise<void> {
    await syncCoordinator.mutateOrQueueUpsert(
      'platform_webhooks',
      {
        id: toValidUuid(wh.id),
        account_id: toValidUuid(wh.accountId),
        business_id: toValidUuid(wh.businessId),
        branch_id: wh.branchId ? toValidUuid(wh.branchId) : null,
        label: wh.label,
        endpoint_url: wh.endpointUrl,
        subscribed_events: wh.subscribedEvents,
        signing_secret_masked: wh.signingSecretMasked,
        signing_secret_hash: wh.signingSecretHash,
        status: wh.status,
        max_retries: wh.maxRetries,
        version: wh.version ?? 1,
        created_at: wh.createdAt,
        updated_at: wh.updatedAt,
      },
      {
        onConflict: 'id',
        expectedVersion: wh.version ?? 1,
        entityType: 'platform_webhook',
        entityLabel: wh.label,
      }
    );
  },

  async recordWebhookDelivery(deliv: PlatformWebhookDelivery): Promise<void> {
    const whUuid = toValidUuid(deliv.webhookId);
    await syncCoordinator.rpcOrQueue(
      'dispatch_webhook_delivery_idempotent',
      {
        p_webhook_id: whUuid,
        p_event_type: deliv.eventType,
        p_idempotency_key: deliv.idempotencyKey,
        p_payload: deliv.payloadJson,
        p_signature_header: deliv.signatureHeader,
        p_status: deliv.status,
        p_http_status: deliv.httpStatus ?? null,
        p_response_snippet: deliv.responseSnippet || null,
      },
      {
        table: 'platform_webhook_deliveries',
        recordId: toValidUuid(deliv.id),
        entityType: 'platform_webhook_delivery',
        entityLabel: `${deliv.eventType}:${deliv.idempotencyKey}`,
      }
    );
  },
};
