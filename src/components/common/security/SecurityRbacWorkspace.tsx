import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  Scale,
  Check,
  X,
  RotateCcw,
  AlertTriangle,
  FileDown,
  Trash2,
  Eye,
  Copy,
  UserCheck,
  FileText,
} from 'lucide-react';
import {
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
  selectCurrentBusinessFromState,
} from '../../../services/store';
import type {
  DataConsentSubjectType,
  DataSubjectRequestType,
  RbacAction,
  RbacResource,
  SecurityWorkspacePolicy,
} from '../../../types/index';
import { t } from '../../../utils/i18n';
import {
  CATALOG_ROLES_BY_CATEGORY,
  RBAC_ACTIONS,
  RBAC_RESOURCES,
  buildDefaultPermissionMatrix,
  createDefaultSecurityPolicy,
  normalizeRbacRole,
} from '../../../utils/rbacEngine';
import { normalizeBusinessCategory } from '../../../utils/staffRules';

type SecuritySubTab = 'rbac' | 'auth_policy' | 'law_18_07';

const RESOURCE_LABEL_MAP: Record<RbacResource, { en: string; fr: string; ar: string }> = {
  dashboard: { en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة القيادة' },
  members: { en: 'Clients / Members', fr: 'Clients / Adhérents', ar: 'العملاء / الأعضاء' },
  registrations: { en: 'Orders & Registrations', fr: 'Dossiers & Commandes', ar: 'التسجيلات والطلبات' },
  shop: { en: 'POS & Catalog', fr: 'Caisse & Catalogue', ar: 'نقطة البيع والكتالوج' },
  scheduler: { en: 'Schedule & Operations', fr: 'Planning & Opérations', ar: 'الجدول والعمليات' },
  finance: { en: 'Finance & Accounting', fr: 'Finance & Comptabilité', ar: 'المالية والمحاسبة' },
  history: { en: 'Audit & History', fr: 'Historique & Audit', ar: 'السجل والتدقيق' },
  analytics: { en: 'BI & Analytics', fr: 'Analytique & KPI', ar: 'التحليلات والتقارير' },
  staff: { en: 'Workforce & Payroll', fr: 'Équipe & Paie', ar: 'الفريق والرواتب' },
  settings: { en: 'Workspace Settings', fr: 'Paramètres Espace', ar: 'إعدادات المساحة' },
  medical_records: { en: 'Medical Dossiers', fr: 'Dossiers Médicaux', ar: 'الملفات الطبية' },
  legal_records: { en: 'Legal & Notary Vault', fr: 'Cabinet & Actes Juridiques', ar: 'السجل القانوني والتوثيق' },
  wms: { en: 'Warehouse & FEFO (WMS)', fr: 'Entrepôt & Lots (WMS)', ar: 'المستودع والدفعات' },
  data_import: { en: 'CSV / Excel Import', fr: 'Import CSV / Excel', ar: 'استيراد البيانات' },
  rbac: { en: 'RBAC & 2FA Governance', fr: 'Gouvernance RBAC & 2FA', ar: 'صلاحيات RBAC والأمان' },
  data_protection: { en: 'Law 18-07 Privacy Aid', fr: 'Aide Loi 18-07', ar: 'حماية المعطيات 18-07' },
};

const ACTION_LABEL_MAP: Record<RbacAction, { en: string; fr: string; ar: string }> = {
  view: { en: 'View', fr: 'Voir', ar: 'عرض' },
  create: { en: 'Create', fr: 'Créer', ar: 'إنشاء' },
  edit: { en: 'Edit', fr: 'Modifier', ar: 'تعديل' },
  delete: { en: 'Delete', fr: 'Suppr.', ar: 'حذف' },
  approve: { en: 'Approve', fr: 'Valider', ar: 'اعتماد' },
  export: { en: 'Export', fr: 'Exporter', ar: 'تصدير' },
};

export const SecurityRbacWorkspace: React.FC = () => {
  const {
    accountId,
    currentBusiness,
    currentBusinessId,
    currentBranchId,
    language,
    rbacPermissionsRaw,
    securityPolicyByBusiness,
    dataConsentsRaw,
    dataSubjectRequestsRaw,
    sensitiveReadEventsRaw,
  } = useAtriumSelector(
    (s) => ({
      accountId: s.account?.id || '',
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
      language: s.language,
      rbacPermissionsRaw: s.rbacPermissions,
      securityPolicyByBusiness: s.securityPolicyByBusiness,
      dataConsentsRaw: s.dataProtectionConsents,
      dataSubjectRequestsRaw: s.dataSubjectRequests,
      sensitiveReadEventsRaw: s.sensitiveReadEvents,
    }),
    shallowEqualObjects
  );

  const {
    saveRbacPermissionCell,
    applyRbacRolePreset,
    resetRbacMatrixToDefaults,
    updateSecurityWorkspacePolicy,
    beginOwner2faEnrollment,
    enableOwner2fa,
    disableOwner2fa,
    lockActiveSession,
    captureDataConsent,
    withdrawDataConsent,
    createDataSubjectRequest,
    processDataSubjectRequestAction,
  } = useAtriumActions();

  const langKey = (language === 'ar' || language === 'en' ? language : 'fr') as 'en' | 'fr' | 'ar';
  const category = normalizeBusinessCategory(currentBusiness?.category);
  const catalogRoles = useMemo(
    () => CATALOG_ROLES_BY_CATEGORY[category] || ['owner', 'staff'],
    [category]
  );

  const [subTab, setSubTab] = useState<SecuritySubTab>('rbac');
  const [selectedRole, setSelectedRole] = useState<string>(catalogRoles[0] || 'owner');

  useEffect(() => {
    if (!catalogRoles.includes(selectedRole)) {
      setSelectedRole(catalogRoles[0] || 'owner');
    }
  }, [catalogRoles, selectedRole]);

  const rbacRules = useMemo(() => {
    const existing = (rbacPermissionsRaw || []).filter(
      (r) => r.businessId === currentBusinessId && !r.deletedAt
    );
    if (existing.length > 0) return existing;
    return buildDefaultPermissionMatrix({
      accountId,
      businessId: currentBusinessId,
      branchId: currentBranchId || undefined,
      category,
    });
  }, [rbacPermissionsRaw, currentBusinessId, accountId, currentBranchId, category]);

  const policy: SecurityWorkspacePolicy = useMemo(
    () =>
      securityPolicyByBusiness?.[currentBusinessId] ||
      createDefaultSecurityPolicy({
        accountId,
        businessId: currentBusinessId,
      }),
    [securityPolicyByBusiness, accountId, currentBusinessId]
  );

  const consents = useMemo(
    () => (dataConsentsRaw || []).filter((c) => c.businessId === currentBusinessId && !c.deletedAt),
    [dataConsentsRaw, currentBusinessId]
  );

  const dsrList = useMemo(
    () =>
      (dataSubjectRequestsRaw || []).filter(
        (r) => r.businessId === currentBusinessId && !r.deletedAt
      ),
    [dataSubjectRequestsRaw, currentBusinessId]
  );

  const sensitiveReads = useMemo(
    () => (sensitiveReadEventsRaw || []).filter((e) => e.businessId === currentBusinessId),
    [sensitiveReadEventsRaw, currentBusinessId]
  );

  // Security Policy Form State
  const [timeoutMin, setTimeoutMin] = useState<number>(policy.sessionTimeoutMinutes);
  const [maxAttempts, setMaxAttempts] = useState<number>(policy.pinLockMaxAttempts);
  const [lockSeconds, setLockSeconds] = useState<number>(policy.pinLockoutSeconds);
  const [requirePinOnIdle, setRequirePinOnIdle] = useState<boolean>(policy.requirePinOnIdle);
  const [logSensitiveReads, setLogSensitiveReads] = useState<boolean>(policy.logSensitiveReads);
  const [retentionDays, setRetentionDays] = useState<number>(policy.dataRetentionDays);
  const [counselStatus, setCounselStatus] = useState<
    'pending_counsel_review' | 'counsel_reviewed'
  >(policy.law1807ReviewStatus);
  const [counselNotes, setCounselNotes] = useState<string>(policy.counselReviewNotes || '');

  useEffect(() => {
    setTimeoutMin(policy.sessionTimeoutMinutes);
    setMaxAttempts(policy.pinLockMaxAttempts);
    setLockSeconds(policy.pinLockoutSeconds);
    setRequirePinOnIdle(policy.requirePinOnIdle);
    setLogSensitiveReads(policy.logSensitiveReads);
    setRetentionDays(policy.dataRetentionDays);
    setCounselStatus(policy.law1807ReviewStatus);
    setCounselNotes(policy.counselReviewNotes || '');
  }, [policy]);

  // 2FA Enrollment State
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    maskedSecret: string;
    otpAuthUri: string;
    recoveryCodes: string[];
  } | null>(null);
  const [totpVerifyInput, setTotpVerifyInput] = useState('');
  const [twoFaDisableCode, setTwoFaDisableCode] = useState('');
  const [twoFaFeedback, setTwoFaFeedback] = useState<string | null>(null);

  // Consent Form State
  const [consentSubjectType, setConsentSubjectType] =
    useState<DataConsentSubjectType>('customer');
  const [consentSubjectId, setConsentSubjectId] = useState('');
  const [consentSubjectName, setConsentSubjectName] = useState('');
  const [consentPurpose, setConsentPurpose] = useState('');
  const [consentBasis, setConsentBasis] = useState<'consent' | 'contract' | 'legal_obligation'>(
    'consent'
  );
  const [consentMethod, setConsentMethod] = useState<
    'signed_paper' | 'digital_pin' | 'portal_checkbox'
  >('digital_pin');

  // DSR Form State
  const [dsrSubjectType, setDsrSubjectType] = useState<DataConsentSubjectType>('customer');
  const [dsrSubjectId, setDsrSubjectId] = useState('');
  const [dsrSubjectName, setDsrSubjectName] = useState('');
  const [dsrType, setDsrType] = useState<DataSubjectRequestType>('export');
  const [dsrReason, setDsrReason] = useState('');

  const handleToggleCell = (resource: RbacResource, action: RbacAction, currentVal: boolean) => {
    const res = saveRbacPermissionCell({
      roleKey: selectedRole,
      resource,
      action,
      allowed: !currentVal,
    });
    if (!res.ok) {
      showToast({
        type: 'warning',
        title: t('phase2_sec_rbac_title', language),
        message: t('phase2_sec_owner_protected_note', language),
      });
    }
  };

  const handleApplyPreset = (preset: 'defaults' | 'operational' | 'readonly' | 'full') => {
    const res = applyRbacRolePreset({ roleKey: selectedRole, preset });
    if (res.ok) {
      showToast({
        type: 'success',
        title: t('phase2_sec_rbac_title', language),
        message: `${selectedRole} → ${preset}`,
      });
    }
  };

  const handleResetMatrix = () => {
    const res = resetRbacMatrixToDefaults();
    if (res.ok) {
      showToast({
        type: 'success',
        title: t('phase2_sec_rbac_title', language),
        message: t('phase2_sec_matrix_reset_done', language),
      });
    }
  };

  const handleSaveSecurityPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateSecurityWorkspacePolicy({
      sessionTimeoutMinutes: timeoutMin,
      pinLockMaxAttempts: maxAttempts,
      pinLockoutSeconds: lockSeconds,
      requirePinOnIdle,
      logSensitiveReads,
    });
    if (updated) {
      showToast({
        type: 'success',
        title: t('phase2_sec_policy_tab', language),
        message: t('phase2_sec_policy_saved', language),
      });
    }
  };

  const handleBegin2fa = () => {
    setTwoFaFeedback(null);
    setTotpVerifyInput('');
    setEnrollment(beginOwner2faEnrollment());
  };

  const handleConfirm2fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    const res = enableOwner2fa({
      secret: enrollment.secret,
      totpCode: totpVerifyInput,
      recoveryCodes: enrollment.recoveryCodes,
    });
    if (res.ok) {
      setEnrollment(null);
      setTotpVerifyInput('');
      setTwoFaFeedback(null);
      showToast({
        type: 'success',
        title: t('phase2_sec_2fa_title', language),
        message: t('phase2_sec_2fa_enabled_msg', language),
      });
    } else {
      setTwoFaFeedback(t('phase2_sec_2fa_invalid_code', language));
    }
  };

  const handleDisable2fa = (e: React.FormEvent) => {
    e.preventDefault();
    const res = disableOwner2fa({ verificationCode: twoFaDisableCode });
    if (res.ok) {
      setTwoFaDisableCode('');
      setTwoFaFeedback(null);
      showToast({
        type: 'success',
        title: t('phase2_sec_2fa_title', language),
        message: t('phase2_sec_2fa_disabled_msg', language),
      });
    } else {
      setTwoFaFeedback(t('phase2_sec_2fa_invalid_code', language));
    }
  };

  const handleCopyOtpUri = () => {
    if (!enrollment) return;
    try {
      navigator.clipboard?.writeText(enrollment.otpAuthUri);
      showToast({
        type: 'success',
        title: 'OTPAuth URI',
        message: t('phase2_sec_copied_clipboard', language),
      });
    } catch {
      // Clipboard unavailable in headless/restricted environment
    }
  };

  const handleSaveLaw1807Notes = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateSecurityWorkspacePolicy({
      dataRetentionDays: retentionDays,
      law1807ReviewStatus: counselStatus,
      counselReviewNotes: counselNotes,
    });
    if (updated) {
      showToast({
        type: 'success',
        title: t('phase2_sec_law1807_tab', language),
        message: t('phase2_sec_policy_saved', language),
      });
    }
  };

  const handleCreateConsent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentSubjectName.trim() || !consentPurpose.trim()) return;
    captureDataConsent({
      subjectType: consentSubjectType,
      subjectId: consentSubjectId.trim() || `subj_${Date.now()}`,
      subjectName: consentSubjectName.trim(),
      purpose: consentPurpose.trim(),
      legalBasis: consentBasis,
      consentMethod,
    });
    setConsentSubjectId('');
    setConsentSubjectName('');
    setConsentPurpose('');
    showToast({
      type: 'success',
      title: t('phase2_sec_consents_title', language),
      message: t('phase2_sec_consent_saved', language),
    });
  };

  const handleCreateDsr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dsrSubjectName.trim()) return;
    createDataSubjectRequest({
      subjectType: dsrSubjectType,
      subjectId: dsrSubjectId.trim() || `subj_${Date.now()}`,
      subjectName: dsrSubjectName.trim(),
      requestType: dsrType,
      reason: dsrReason,
    });
    setDsrSubjectId('');
    setDsrSubjectName('');
    setDsrReason('');
    showToast({
      type: 'success',
      title: t('phase2_sec_dsr_title', language),
      message: t('phase2_sec_dsr_created', language),
    });
  };

  const handleProcessDsr = (requestId: string, action: 'export' | 'erase' | 'reject') => {
    const res = processDataSubjectRequestAction({ requestId, action });
    if (!res.ok) {
      showToast({
        type: 'error',
        title: t('phase2_sec_dsr_title', language),
        message: res.error || 'FORBIDDEN_DATA_PROTECTION',
      });
      return;
    }
    if (action === 'export' && res.exportPayload && typeof document !== 'undefined') {
      try {
        const blob = new Blob([JSON.stringify(res.exportPayload, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `law1807_dsr_export_${requestId.slice(0, 8)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // Ignore blob download errors in SSR
      }
    }
    showToast({
      type: 'success',
      title: t('phase2_sec_dsr_title', language),
      message: `${t('phase2_sec_dsr_processed', language)} (${action})`,
    });
  };

  const normalizedSelectedRole = normalizeRbacRole(selectedRole);

  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)]">
      {/* Sub-navigation bar */}
      <div className="sq-elev-card">
        <div
          data-sq="panel"
          className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col md:flex-row md:items-center justify-between gap-[var(--s3,12px)]"
        >
          <div className="flex items-center gap-[var(--s3,12px)]">
            <div
              data-sq="tile"
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
              className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
            >
              <Shield size={20} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-[2px]">
              <h2 className="t-pod text-[var(--text-1)] dark:text-white">
                {t('phase2_sec_title', language)}
              </h2>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {t('phase2_sec_subtitle', language)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
            <button
              type="button"
              data-sq="ctl-sm"
              onClick={() => setSubTab('rbac')}
              className={`h-[36px] px-[var(--s3,12px)] t-small font-semibold inline-flex items-center gap-[var(--s2,8px)] cursor-pointer transition-colors ${
                subTab === 'rbac'
                  ? 'bg-[var(--brand-fill)] text-white'
                  : 'bg-white dark:bg-[#22201E] text-[var(--text-1)] dark:text-white/80'
              }`}
            >
              <Shield size={14} />
              <span>{t('phase2_sec_rbac_tab', language)}</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              onClick={() => setSubTab('auth_policy')}
              className={`h-[36px] px-[var(--s3,12px)] t-small font-semibold inline-flex items-center gap-[var(--s2,8px)] cursor-pointer transition-colors ${
                subTab === 'auth_policy'
                  ? 'bg-[var(--brand-fill)] text-white'
                  : 'bg-white dark:bg-[#22201E] text-[var(--text-1)] dark:text-white/80'
              }`}
            >
              <KeyRound size={14} />
              <span>{t('phase2_sec_policy_tab', language)}</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              onClick={() => setSubTab('law_18_07')}
              className={`h-[36px] px-[var(--s3,12px)] t-small font-semibold inline-flex items-center gap-[var(--s2,8px)] cursor-pointer transition-colors ${
                subTab === 'law_18_07'
                  ? 'bg-[var(--brand-fill)] text-white'
                  : 'bg-white dark:bg-[#22201E] text-[var(--text-1)] dark:text-white/80'
              }`}
            >
              <Scale size={14} />
              <span>{t('phase2_sec_law1807_tab', language)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab 1: RBAC Matrix */}
      {subTab === 'rbac' && (
        <div className="sq-elev-card">
          <div
            data-sq="panel"
            className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--s4,16px)]"
          >
            <h3 className="t-pod text-[var(--text-1)] dark:text-white">
              {t('phase2_sec_rbac_title', language)}
            </h3>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-[var(--s3,12px)]">
              <div className="flex flex-wrap items-center gap-[var(--s3,12px)]">
                <label className="flex items-center gap-[var(--s2,8px)] t-small font-semibold text-[var(--text-1)] dark:text-white">
                  <span>{t('phase2_sec_role_label', language)}:</span>
                  <select
                    data-testid="rbac-role-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="h-[36px] px-[var(--s3,12px)] rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small font-semibold"
                  >
                    {catalogRoles.map((roleKey) => (
                      <option key={roleKey} value={roleKey}>
                        {roleKey}
                      </option>
                    ))}
                  </select>
                </label>

                <span className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                  ({category})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => handleApplyPreset('defaults')}
                  className="h-[32px] px-[10px] bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white t-cap font-semibold cursor-pointer"
                >
                  {t('phase2_sec_preset_defaults', language)}
                </button>
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => handleApplyPreset('operational')}
                  className="h-[32px] px-[10px] bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white t-cap font-semibold cursor-pointer"
                >
                  {t('phase2_sec_preset_operational', language)}
                </button>
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => handleApplyPreset('readonly')}
                  className="h-[32px] px-[10px] bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white t-cap font-semibold cursor-pointer"
                >
                  {t('phase2_sec_preset_readonly', language)}
                </button>
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => handleApplyPreset('full')}
                  className="h-[32px] px-[10px] bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white t-cap font-semibold cursor-pointer"
                >
                  {t('phase2_sec_preset_full', language)}
                </button>
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={handleResetMatrix}
                  className="h-[32px] px-[10px] bg-[#FDF4F0] dark:bg-[#2E1E19] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] t-cap font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>{t('phase2_sec_reset_matrix', language)}</span>
                </button>
              </div>
            </div>

            <div className="p-[var(--s3,12px)] rounded-[var(--r-card,12px)] bg-[#F7F4F0] dark:bg-[#191716] t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] flex items-center gap-[var(--s2,8px)]">
              <Lock size={14} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0" />
              <span>{t('phase2_sec_owner_protected_note', language)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-[var(--atr-divider)]">
                    <th className="py-2.5 px-3 text-start t-cap font-semibold text-[var(--text-2)]">
                      {t('phase2_sec_col_resource', language)}
                    </th>
                    {RBAC_ACTIONS.map((act) => (
                      <th
                        key={act}
                        className="py-2.5 px-2 text-center t-cap font-semibold text-[var(--text-2)]"
                      >
                        {ACTION_LABEL_MAP[act][langKey]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--atr-divider)]">
                  {RBAC_RESOURCES.map((resource) => {
                    const isOwnerLocked =
                      (normalizedSelectedRole === 'owner' ||
                        normalizedSelectedRole === 'gerant' ||
                        normalizedSelectedRole === 'directeur_general' ||
                        normalizedSelectedRole === 'admin' ||
                        normalizedSelectedRole === 'direction') &&
                      (resource === 'rbac' || resource === 'settings');
                    return (
                      <tr
                        key={resource}
                        className="hover:bg-[#FAF7F4] dark:hover:bg-[#262422]/60 transition-colors"
                      >
                        <td className="py-2.5 px-3 t-small font-medium text-[var(--text-1)] dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{RESOURCE_LABEL_MAP[resource][langKey]}</span>
                            {isOwnerLocked && (
                              <Lock
                                size={12}
                                className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0"
                              />
                            )}
                          </div>
                        </td>
                        {RBAC_ACTIONS.map((action) => {
                          const cellRule = rbacRules.find(
                            (r) =>
                              normalizeRbacRole(r.roleKey) === normalizedSelectedRole &&
                              r.resource === resource &&
                              r.action === action
                          );
                          const allowed = isOwnerLocked ? true : Boolean(cellRule?.allowed);
                          return (
                            <td key={action} className="py-2 px-2 text-center">
                              <button
                                type="button"
                                disabled={isOwnerLocked}
                                data-testid={`rbac-cell-${normalizedSelectedRole}-${resource}-${action}`}
                                aria-pressed={allowed}
                                onClick={() => handleToggleCell(resource, action, allowed)}
                                className={`w-8 h-8 rounded-[8px] inline-flex items-center justify-center transition-colors ${
                                  isOwnerLocked
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 opacity-75 cursor-not-allowed'
                                    : allowed
                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 cursor-pointer'
                                    : 'bg-neutral-200/70 dark:bg-[#2B2825] text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300/70 cursor-pointer'
                                }`}
                              >
                                {allowed ? <Check size={14} /> : <X size={14} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Owner 2FA, Session Timeout & PIN Brute-Force Policy */}
      {subTab === 'auth_policy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--pod-gap,16px)]">
          {/* Session & PIN Lockout Policy */}
          <form
            onSubmit={handleSaveSecurityPolicy}
            data-sq="panel"
            className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--s4,16px)]"
          >
            <div className="flex items-center justify-between gap-[var(--s2,8px)]">
              <div className="flex items-center gap-[var(--s2,8px)]">
                <Lock size={18} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_session_policy_title', language)}
                </h3>
              </div>
              <button
                type="button"
                data-sq="ctl-sm"
                onClick={() => lockActiveSession('manual_lock')}
                className="h-[32px] px-[12px] bg-[#2B2825] text-white t-cap font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Lock size={13} />
                <span>{t('phase2_sec_lock_now', language)}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3,12px)]">
              <label className="flex flex-col gap-1">
                <span className="t-cap text-[var(--text-2)]">
                  {t('phase2_sec_idle_minutes', language)}
                </span>
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={timeoutMin}
                  onChange={(e) => setTimeoutMin(Number(e.target.value) || 15)}
                  className="h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="t-cap text-[var(--text-2)]">
                  {t('phase2_sec_pin_max_attempts', language)}
                </span>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value) || 5)}
                  className="h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="t-cap text-[var(--text-2)]">
                  {t('phase2_sec_pin_lock_seconds', language)}
                </span>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  value={lockSeconds}
                  onChange={(e) => setLockSeconds(Number(e.target.value) || 300)}
                  className="h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
              </label>
            </div>

            <div className="flex flex-col gap-[var(--s2,8px)]">
              <label className="flex items-center justify-between p-[var(--s3,12px)] rounded-[var(--r-card,12px)] bg-[#FAF7F4] dark:bg-[#191716] cursor-pointer">
                <span className="t-small text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_require_pin_idle', language)}
                </span>
                <input
                  type="checkbox"
                  checked={requirePinOnIdle}
                  onChange={(e) => setRequirePinOnIdle(e.target.checked)}
                  className="w-4 h-4 accent-[#C9461F]"
                />
              </label>

              <label className="flex items-center justify-between p-[var(--s3,12px)] rounded-[var(--r-card,12px)] bg-[#FAF7F4] dark:bg-[#191716] cursor-pointer">
                <span className="t-small text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_log_sensitive_reads', language)}
                </span>
                <input
                  type="checkbox"
                  checked={logSensitiveReads}
                  onChange={(e) => setLogSensitiveReads(e.target.checked)}
                  className="w-4 h-4 accent-[#C9461F]"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                data-sq="ctl"
                className="h-[38px] px-[16px] bg-[var(--brand-fill)] text-white t-btn cursor-pointer"
              >
                {t('phase2_sec_save_policy', language)}
              </button>
            </div>
          </form>

          {/* Owner 2FA TOTP Card */}
          <div
            data-sq="panel"
            className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--s4,16px)]"
          >
            <div className="flex items-center justify-between gap-[var(--s2,8px)]">
              <div className="flex items-center gap-[var(--s2,8px)]">
                <KeyRound size={18} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_2fa_title', language)}
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full t-cap font-semibold ${
                  policy.owner2faEnabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-neutral-200 text-neutral-700 dark:bg-[#2B2825] dark:text-neutral-300'
                }`}
              >
                {policy.owner2faEnabled
                  ? t('phase2_sec_2fa_status_on', language)
                  : t('phase2_sec_2fa_status_off', language)}
              </span>
            </div>

            <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
              {t('phase2_sec_2fa_desc', language)}
            </p>

            {!policy.owner2faEnabled ? (
              !enrollment ? (
                <div>
                  <button
                    type="button"
                    data-sq="ctl"
                    onClick={handleBegin2fa}
                    className="h-[38px] px-[16px] bg-[var(--brand-fill)] text-white t-btn inline-flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound size={15} />
                    <span>{t('phase2_sec_2fa_begin_btn', language)}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfirm2fa} className="flex flex-col gap-[var(--s3,12px)]">
                  <div className="p-[var(--s3,12px)] rounded-[var(--r-card,12px)] bg-[#FAF7F4] dark:bg-[#191716] flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-cap font-semibold text-[var(--text-2)]">
                        {t('phase2_sec_2fa_secret_label', language)}:{' '}
                        <code className="tabular-nums text-[var(--text-1)] dark:text-white">
                          {enrollment.maskedSecret}
                        </code>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOtpUri}
                        className="t-cap font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={12} />
                        <span>URI</span>
                      </button>
                    </div>
                    <div className="t-cap text-[var(--text-2)] break-all bg-white dark:bg-[#22201E] p-2 rounded-[8px] border border-[var(--atr-divider)] font-mono">
                      {enrollment.otpAuthUri}
                    </div>

                    <div className="t-cap font-semibold text-[var(--text-1)] dark:text-white mt-1">
                      {t('phase2_sec_2fa_recovery_codes', language)}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {enrollment.recoveryCodes.map((code) => (
                        <code
                          key={code}
                          className="px-2 py-1 rounded bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] text-center t-cap tabular-nums text-[var(--text-1)] dark:text-white"
                        >
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={totpVerifyInput}
                      onChange={(e) => {
                        setTotpVerifyInput(e.target.value);
                        setTwoFaFeedback(null);
                      }}
                      placeholder="6-digit TOTP (e.g. 123456)"
                      className="flex-1 h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                    />
                    <button
                      type="submit"
                      data-sq="ctl"
                      className="h-[38px] px-[16px] bg-[var(--brand-fill)] text-white t-btn cursor-pointer"
                    >
                      {t('phase2_sec_2fa_confirm_btn', language)}
                    </button>
                  </div>

                  {twoFaFeedback && (
                    <div className="t-cap text-rose-600 dark:text-rose-400">{twoFaFeedback}</div>
                  )}
                </form>
              )
            ) : (
              <form onSubmit={handleDisable2fa} className="flex flex-col gap-[var(--s3,12px)]">
                <div className="p-[var(--s3,12px)] rounded-[var(--r-card,12px)] bg-[#FAF7F4] dark:bg-[#191716] flex flex-col gap-1 t-cap text-[var(--text-2)]">
                  <span>
                    {t('phase2_sec_2fa_secret_label', language)}:{' '}
                    <strong className="text-[var(--text-1)] dark:text-white">
                      {policy.owner2faSecretMasked || '••••••••'}
                    </strong>
                  </span>
                  <span>
                    {t('phase2_sec_2fa_recovery_remaining', language)}:{' '}
                    <strong className="tabular-nums text-[var(--text-1)] dark:text-white">
                      {policy.owner2faRecoveryHashes?.length ?? 0}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={twoFaDisableCode}
                    onChange={(e) => {
                      setTwoFaDisableCode(e.target.value);
                      setTwoFaFeedback(null);
                    }}
                    placeholder={t('phase2_sec_2fa_enter_code', language)}
                    className="flex-1 h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                  />
                  <button
                    type="submit"
                    data-sq="ctl"
                    className="h-[38px] px-[16px] bg-rose-600 text-white t-btn cursor-pointer"
                  >
                    {t('phase2_sec_2fa_disable_btn', language)}
                  </button>
                </div>

                {twoFaFeedback && (
                  <div className="t-cap text-rose-600 dark:text-rose-400">{twoFaFeedback}</div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 3: Law 18-07 Data Protection Aid + Sensitive Read Audit */}
      {subTab === 'law_18_07' && (
        <div className="flex flex-col gap-[var(--pod-gap,16px)]">
          {/* Mandatory Non-Certification Disclaimer Banner */}
          <div
            data-sq="card"
            data-testid="law1807-disclaimer-banner"
            style={{ '--sq-stroke': 'rgba(245,158,11,0.45)' } as React.CSSProperties}
            className="p-[var(--s4,16px)] rounded-[var(--r-card,14px)] bg-amber-50 dark:bg-amber-950/35 text-amber-950 dark:text-amber-200 flex items-start gap-[var(--s3,12px)]"
          >
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <div className="t-small font-semibold">
                {t('phase2_sec_law1807_disclaimer_title', language)}
              </div>
              <p className="t-cap leading-relaxed">{t('phase2_sec_law1807_disclaimer', language)}</p>
            </div>
          </div>

          {/* Counsel Review Status + Retention Policy */}
          <form
            onSubmit={handleSaveLaw1807Notes}
            data-sq="panel"
            className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--s3,12px)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_counsel_card_title', language)}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 t-cap font-semibold">
                {counselStatus === 'counsel_reviewed'
                  ? t('phase2_sec_counsel_reviewed', language)
                  : t('phase2_sec_counsel_pending', language)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--s3,12px)]">
              <label className="flex flex-col gap-1">
                <span className="t-cap text-[var(--text-2)]">
                  {t('phase2_sec_counsel_status_label', language)}
                </span>
                <select
                  value={counselStatus}
                  onChange={(e) =>
                    setCounselStatus(
                      e.target.value as 'pending_counsel_review' | 'counsel_reviewed'
                    )
                  }
                  className="h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small"
                >
                  <option value="pending_counsel_review">
                    {t('phase2_sec_counsel_pending', language)}
                  </option>
                  <option value="counsel_reviewed">
                    {t('phase2_sec_counsel_reviewed', language)}
                  </option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="t-cap text-[var(--text-2)]">
                  {t('phase2_sec_retention_days', language)}
                </span>
                <input
                  type="number"
                  min={30}
                  max={36500}
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value) || 1825)}
                  className="h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="t-cap text-[var(--text-2)]">
                  {t('phase2_sec_counsel_notes_label', language)}
                </span>
                <input
                  type="text"
                  value={counselNotes}
                  onChange={(e) => setCounselNotes(e.target.value)}
                  placeholder="Ref. ANPDP / internal DPO review..."
                  className="h-[38px] px-3 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] text-[var(--text-1)] dark:text-white t-small"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                data-sq="ctl"
                className="h-[36px] px-[14px] bg-[var(--brand-fill)] text-white t-btn cursor-pointer"
              >
                {t('phase2_sec_save_policy', language)}
              </button>
            </div>
          </form>

          {/* Consents + DSR Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--pod-gap,16px)]">
            {/* Consents Registry */}
            <div
              data-sq="panel"
              className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--s3,12px)]"
            >
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_consents_title', language)}
                </h3>
              </div>

              <form onSubmit={handleCreateConsent} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={consentSubjectType}
                  onChange={(e) => setConsentSubjectType(e.target.value as DataConsentSubjectType)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                >
                  <option value="customer">Customer</option>
                  <option value="member">Member</option>
                  <option value="patient">Patient</option>
                  <option value="legal_client">Legal Client</option>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="party">Party</option>
                </select>
                <input
                  type="text"
                  value={consentSubjectId}
                  onChange={(e) => setConsentSubjectId(e.target.value)}
                  placeholder="ID (optional)"
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                />
                <input
                  type="text"
                  required
                  value={consentSubjectName}
                  onChange={(e) => setConsentSubjectName(e.target.value)}
                  placeholder={t('phase2_sec_subject_name_ph', language)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                />
                <input
                  type="text"
                  required
                  value={consentPurpose}
                  onChange={(e) => setConsentPurpose(e.target.value)}
                  placeholder={t('phase2_sec_consent_purpose_ph', language)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                />
                <select
                  value={consentBasis}
                  onChange={(e) => setConsentBasis(e.target.value as any)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                >
                  <option value="consent">consent</option>
                  <option value="contract">contract</option>
                  <option value="legal_obligation">legal_obligation</option>
                </select>
                <select
                  value={consentMethod}
                  onChange={(e) => setConsentMethod(e.target.value as any)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                >
                  <option value="digital_pin">digital_pin</option>
                  <option value="signed_paper">signed_paper</option>
                  <option value="portal_checkbox">portal_checkbox</option>
                </select>
                <button
                  type="submit"
                  data-sq="ctl"
                  className="sm:col-span-2 h-[36px] bg-[var(--brand-fill)] text-white t-btn cursor-pointer"
                >
                  {t('phase2_sec_capture_consent_btn', language)}
                </button>
              </form>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {consents.length === 0 ? (
                  <p className="t-cap text-[var(--text-2)] py-2">
                    {t('phase2_sec_no_consents', language)}
                  </p>
                ) : (
                  consents.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-[10px] bg-[#FAF7F4] dark:bg-[#191716] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="t-small font-semibold text-[var(--text-1)] dark:text-white truncate">
                          {c.subjectName} ({c.subjectType})
                        </div>
                        <div className="t-cap text-[var(--text-2)] truncate">
                          {c.purpose} • {c.legalBasis}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full t-cap font-semibold ${
                            c.status === 'granted'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {c.status}
                        </span>
                        {c.status === 'granted' && (
                          <button
                            type="button"
                            onClick={() => withdrawDataConsent(c.id)}
                            className="t-cap font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            {t('phase2_sec_withdraw_btn', language)}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Data Subject Requests (DSR Export / Erase) */}
            <div
              data-sq="panel"
              className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--s3,12px)]"
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_dsr_title', language)}
                </h3>
              </div>

              <form onSubmit={handleCreateDsr} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={dsrSubjectType}
                  onChange={(e) => setDsrSubjectType(e.target.value as DataConsentSubjectType)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                >
                  <option value="customer">Customer</option>
                  <option value="member">Member</option>
                  <option value="patient">Patient</option>
                  <option value="legal_client">Legal Client</option>
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="party">Party</option>
                </select>
                <select
                  value={dsrType}
                  onChange={(e) => setDsrType(e.target.value as DataSubjectRequestType)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                >
                  <option value="export">export</option>
                  <option value="erase">erase</option>
                  <option value="rectify">rectify</option>
                </select>
                <input
                  type="text"
                  value={dsrSubjectId}
                  onChange={(e) => setDsrSubjectId(e.target.value)}
                  placeholder="Subject ID (optional)"
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                />
                <input
                  type="text"
                  required
                  value={dsrSubjectName}
                  onChange={(e) => setDsrSubjectName(e.target.value)}
                  placeholder={t('phase2_sec_subject_name_ph', language)}
                  className="h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                />
                <input
                  type="text"
                  value={dsrReason}
                  onChange={(e) => setDsrReason(e.target.value)}
                  placeholder={t('phase2_sec_dsr_reason_ph', language)}
                  className="sm:col-span-2 h-[36px] px-2.5 rounded-[var(--r-ctl,10px)] bg-[#F3EDE7] dark:bg-[#191716] border border-[var(--atr-divider)] t-small text-[var(--text-1)] dark:text-white"
                />
                <button
                  type="submit"
                  data-sq="ctl"
                  className="sm:col-span-2 h-[36px] bg-[var(--brand-fill)] text-white t-btn cursor-pointer"
                >
                  {t('phase2_sec_create_dsr_btn', language)}
                </button>
              </form>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {dsrList.length === 0 ? (
                  <p className="t-cap text-[var(--text-2)] py-2">
                    {t('phase2_sec_no_dsr', language)}
                  </p>
                ) : (
                  dsrList.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-[10px] bg-[#FAF7F4] dark:bg-[#191716] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="t-small font-semibold text-[var(--text-1)] dark:text-white truncate">
                          {r.subjectName} • {r.requestType.toUpperCase()}
                        </div>
                        <div className="t-cap text-[var(--text-2)]">
                          {r.status} {r.reason ? `• ${r.reason}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleProcessDsr(r.id, 'export')}
                          className="h-[28px] px-2 rounded-[8px] bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white t-cap font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileDown size={12} />
                          <span>JSON</span>
                        </button>
                        {r.status === 'requested' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleProcessDsr(r.id, 'erase')}
                              className="h-[28px] px-2 rounded-[8px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 t-cap font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>{t('phase2_sec_erase_btn', language)}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProcessDsr(r.id, 'reject')}
                              className="h-[28px] px-2 rounded-[8px] bg-neutral-200 dark:bg-[#2B2825] text-neutral-700 dark:text-neutral-300 t-cap font-semibold cursor-pointer"
                            >
                              {t('phase2_sec_reject_btn', language)}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sensitive Vertical Read Audit Log */}
          <div
            data-sq="panel"
            className="bg-white dark:bg-[#22201E] p-[var(--pod-pad,16px)] flex flex-col gap-[var(--s3,12px)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]" />
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_sec_sensitive_reads_title', language)}
                </h3>
              </div>
              <span className="t-cap text-[var(--text-2)] tabular-nums">
                {sensitiveReads.length}
              </span>
            </div>

            {sensitiveReads.length === 0 ? (
              <p className="t-cap text-[var(--text-2)]">
                {t('phase2_sec_no_sensitive_reads', language)}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--atr-divider)]">
                      <th className="py-2 px-2 text-start t-cap font-semibold text-[var(--text-2)]">
                        Time
                      </th>
                      <th className="py-2 px-2 text-start t-cap font-semibold text-[var(--text-2)]">
                        Vertical
                      </th>
                      <th className="py-2 px-2 text-start t-cap font-semibold text-[var(--text-2)]">
                        Table
                      </th>
                      <th className="py-2 px-2 text-start t-cap font-semibold text-[var(--text-2)]">
                        Scope
                      </th>
                      <th className="py-2 px-2 text-start t-cap font-semibold text-[var(--text-2)]">
                        Role
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--atr-divider)]">
                    {sensitiveReads.slice(0, 25).map((ev) => (
                      <tr key={ev.id}>
                        <td className="py-2 px-2 t-cap tabular-nums text-[var(--text-2)]">
                          {ev.occurredAt.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="py-2 px-2 t-cap text-[var(--text-1)] dark:text-white">
                          {ev.vertical}
                        </td>
                        <td className="py-2 px-2 t-cap font-mono text-[var(--text-1)] dark:text-white">
                          {ev.targetTable}
                        </td>
                        <td className="py-2 px-2 t-cap text-[var(--text-2)]">{ev.recordLabel}</td>
                        <td className="py-2 px-2 t-cap font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]">
                          {ev.role}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
