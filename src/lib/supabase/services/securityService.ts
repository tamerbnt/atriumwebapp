import { getSupabaseClient, toValidUuid } from '../client';
import { fetchAllPages } from '../pagination';
import { syncCoordinator } from '../syncCoordinator';
import type {
  DataConsentStatus,
  DataConsentSubjectType,
  DataProtectionConsent,
  DataSubjectRequest,
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  RbacAction,
  RbacPermissionRule,
  RbacResource,
  SecurityWorkspacePolicy,
} from '../../../types/index';

export function mapRbacRuleFromDb(row: any): RbacPermissionRule {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    category: row.category || 'pos_inventory',
    roleKey: row.role_key || 'staff',
    resource: row.resource as RbacResource,
    action: row.action as RbacAction,
    allowed: Boolean(row.allowed),
    updatedByStaffId: row.updated_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapSecurityPolicyFromDb(row: any): SecurityWorkspacePolicy {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    owner2faEnabled: Boolean(row.owner_2fa_enabled),
    owner2faSecretMasked: row.owner_2fa_secret_masked || undefined,
    owner2faRecoveryHashes: Array.isArray(row.owner_2fa_recovery_hashes)
      ? (row.owner_2fa_recovery_hashes as string[])
      : [],
    owner2faVerifiedAt: row.owner_2fa_verified_at || undefined,
    sessionTimeoutMinutes: Number(row.session_timeout_minutes ?? 15),
    pinLockMaxAttempts: Number(row.pin_lock_max_attempts ?? 5),
    pinLockoutSeconds: Number(row.pin_lockout_seconds ?? 300),
    requirePinOnIdle: row.require_pin_on_idle !== false,
    logSensitiveReads: row.log_sensitive_reads !== false,
    dataRetentionDays: Number(row.data_retention_days ?? 1825),
    law1807ReviewStatus:
      row.law_18_07_review_status === 'counsel_reviewed'
        ? 'counsel_reviewed'
        : 'pending_counsel_review',
    counselReviewNotes: row.counsel_review_notes || undefined,
    updatedByStaffId: row.updated_by_staff_id || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapConsentFromDb(row: any): DataProtectionConsent {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    subjectType: row.subject_type as DataConsentSubjectType,
    subjectId: row.subject_id || '',
    subjectName: row.subject_name || '',
    purpose: row.purpose || '',
    legalBasis: (row.legal_basis || 'consent') as DataProtectionConsent['legalBasis'],
    status: (row.status || 'granted') as DataConsentStatus,
    consentMethod: (row.consent_method || 'digital_pin') as DataProtectionConsent['consentMethod'],
    capturedByStaffId: row.captured_by_staff_id || undefined,
    grantedAt: row.granted_at || row.created_at,
    withdrawnAt: row.withdrawn_at || undefined,
    notes: row.notes || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function mapDsrFromDb(row: any): DataSubjectRequest {
  return {
    id: row.id,
    accountId: row.account_id,
    businessId: row.business_id,
    branchId: row.branch_id || undefined,
    subjectType: row.subject_type as DataConsentSubjectType,
    subjectId: row.subject_id || '',
    subjectName: row.subject_name || '',
    requestType: row.request_type as DataSubjectRequestType,
    status: (row.status || 'requested') as DataSubjectRequestStatus,
    requestedByStaffId: row.requested_by_staff_id || undefined,
    processedByStaffId: row.processed_by_staff_id || undefined,
    exportSummary: row.export_summary ?? null,
    reason: row.reason || undefined,
    processedAt: row.processed_at || undefined,
    version: row.version != null ? Number(row.version) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export const securityService = {
  async fetchSecurityDataForBusiness(businessId: string): Promise<{
    rules: RbacPermissionRule[];
    policy: SecurityWorkspacePolicy | null;
    consents: DataProtectionConsent[];
    requests: DataSubjectRequest[];
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return { rules: [], policy: null, consents: [], requests: [] };
    }
    const bizUuid = toValidUuid(businessId);
    try {
      const [rulesRows, policyRes, consentRows, dsrRows] = await Promise.all([
        fetchAllPages<any>((from, to) =>
          (client as any)
            .from('rbac_role_permissions')
            .select('*')
            .eq('business_id', bizUuid)
            .is('deleted_at', null)
            .range(from, to)
        ),
        (client as any)
          .from('security_workspace_policies')
          .select('*')
          .eq('business_id', bizUuid)
          .is('deleted_at', null)
          .maybeSingle(),
        fetchAllPages<any>((from, to) =>
          (client as any)
            .from('data_protection_consents')
            .select('*')
            .eq('business_id', bizUuid)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to)
        ),
        fetchAllPages<any>((from, to) =>
          (client as any)
            .from('data_subject_requests')
            .select('*')
            .eq('business_id', bizUuid)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to)
        ),
      ]);

      return {
        rules: rulesRows.map(mapRbacRuleFromDb),
        policy: policyRes?.data ? mapSecurityPolicyFromDb(policyRes.data) : null,
        consents: consentRows.map(mapConsentFromDb),
        requests: dsrRows.map(mapDsrFromDb),
      };
    } catch {
      return { rules: [], policy: null, consents: [], requests: [] };
    }
  },

  async upsertRbacRule(rule: RbacPermissionRule, staffId?: string): Promise<void> {
    const payload = {
      id: toValidUuid(rule.id),
      account_id: toValidUuid(rule.accountId),
      business_id: toValidUuid(rule.businessId),
      branch_id: rule.branchId ? toValidUuid(rule.branchId) : null,
      category: rule.category,
      role_key: rule.roleKey,
      resource: rule.resource,
      action: rule.action,
      allowed: rule.allowed,
      updated_by_staff_id: staffId ? toValidUuid(staffId) : null,
      version: rule.version ?? 1,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    };
    await syncCoordinator.mutateOrQueueUpsert('rbac_role_permissions', payload, {
      onConflict: 'business_id,role_key,resource,action',
      expectedVersion: rule.version ?? 1,
      entityType: 'rbac_permission',
      entityLabel: `${rule.roleKey}:${rule.resource}:${rule.action}`,
    });
  },

  async upsertSecurityPolicy(policy: SecurityWorkspacePolicy, staffId?: string): Promise<void> {
    const payload = {
      id: toValidUuid(policy.id),
      account_id: toValidUuid(policy.accountId),
      business_id: toValidUuid(policy.businessId),
      owner_2fa_enabled: policy.owner2faEnabled,
      owner_2fa_secret_masked: policy.owner2faSecretMasked || null,
      owner_2fa_recovery_hashes: policy.owner2faRecoveryHashes || [],
      owner_2fa_verified_at: policy.owner2faVerifiedAt || null,
      session_timeout_minutes: policy.sessionTimeoutMinutes,
      pin_lock_max_attempts: policy.pinLockMaxAttempts,
      pin_lockout_seconds: policy.pinLockoutSeconds,
      require_pin_on_idle: policy.requirePinOnIdle,
      log_sensitive_reads: policy.logSensitiveReads,
      data_retention_days: policy.dataRetentionDays,
      law_18_07_review_status: policy.law1807ReviewStatus,
      counsel_review_notes: policy.counselReviewNotes || null,
      updated_by_staff_id: staffId ? toValidUuid(staffId) : null,
      version: policy.version ?? 1,
      created_at: policy.createdAt,
      updated_at: policy.updatedAt,
    };
    await syncCoordinator.mutateOrQueueUpsert('security_workspace_policies', payload, {
      onConflict: 'business_id',
      expectedVersion: policy.version ?? 1,
      entityType: 'security_policy',
      entityLabel: policy.businessId,
    });
  },

  async upsertDataConsent(consent: DataProtectionConsent, staffId?: string): Promise<void> {
    const payload = {
      id: toValidUuid(consent.id),
      account_id: toValidUuid(consent.accountId),
      business_id: toValidUuid(consent.businessId),
      branch_id: consent.branchId ? toValidUuid(consent.branchId) : null,
      subject_type: consent.subjectType,
      subject_id: consent.subjectId,
      subject_name: consent.subjectName,
      purpose: consent.purpose,
      legal_basis: consent.legalBasis,
      status: consent.status,
      consent_method: consent.consentMethod,
      captured_by_staff_id: staffId ? toValidUuid(staffId) : null,
      granted_at: consent.grantedAt,
      withdrawn_at: consent.withdrawnAt || null,
      notes: consent.notes || null,
      version: consent.version ?? 1,
      created_at: consent.createdAt,
      updated_at: consent.updatedAt,
    };
    await syncCoordinator.mutateOrQueueUpsert('data_protection_consents', payload, {
      onConflict: 'id',
      expectedVersion: consent.version ?? 1,
      entityType: 'data_consent',
      entityLabel: consent.subjectName,
    });
  },

  async upsertDataSubjectRequest(req: DataSubjectRequest, staffId?: string): Promise<void> {
    const payload = {
      id: toValidUuid(req.id),
      account_id: toValidUuid(req.accountId),
      business_id: toValidUuid(req.businessId),
      branch_id: req.branchId ? toValidUuid(req.branchId) : null,
      subject_type: req.subjectType,
      subject_id: req.subjectId,
      subject_name: req.subjectName,
      request_type: req.requestType,
      status: req.status,
      requested_by_staff_id: (req.requestedByStaffId || staffId)
        ? toValidUuid(req.requestedByStaffId || staffId || '')
        : null,
      processed_by_staff_id: req.processedByStaffId ? toValidUuid(req.processedByStaffId) : null,
      export_summary: req.exportSummary || null,
      reason: req.reason || null,
      processed_at: req.processedAt || null,
      version: req.version ?? 1,
      created_at: req.createdAt,
      updated_at: req.updatedAt,
    };
    await syncCoordinator.mutateOrQueueUpsert('data_subject_requests', payload, {
      onConflict: 'id',
      expectedVersion: req.version ?? 1,
      entityType: 'data_subject_request',
      entityLabel: `${req.requestType}:${req.subjectName}`,
    });
  },

  async processDataSubjectRequest(params: {
    requestId: string;
    action: 'export' | 'erase' | 'reject';
    exportSummary?: Record<string, any> | null;
    reason?: string;
  }): Promise<void> {
    const recordId = toValidUuid(params.requestId);
    await syncCoordinator.rpcOrQueue(
      'process_data_subject_request',
      {
        p_request_id: recordId,
        p_action: params.action,
        p_export_summary: params.exportSummary || null,
        p_reason: params.reason || null,
      },
      {
        table: 'data_subject_requests',
        recordId,
        entityType: 'data_subject_request',
        entityLabel: `${params.action}:${params.requestId}`,
      }
    );
  },
};
