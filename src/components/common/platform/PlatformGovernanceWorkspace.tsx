import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileCheck2,
  KeyRound,
  Link2,
  Lock,
  Paperclip,
  Printer,
  RefreshCw,
  Send,
  ShieldAlert,
  Sliders,
  Trash2,
  Unlock,
  Webhook,
  XCircle,
} from 'lucide-react';
import {
  selectCurrentBusinessFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import type {
  ApprovalActionScope,
  PlatformApiScope,
  PlatformCustomFieldType,
  PlatformWebhookEventType,
  PrintTemplateDocType,
} from '../../../types/index';
import { t } from '../../../utils/i18n';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import {
  APPROVAL_ACTION_SCOPES,
  PLATFORM_API_SCOPES,
  PLATFORM_WEBHOOK_EVENTS,
  buildDefaultPrintTemplate,
} from '../../../utils/platformGovernanceEngine';

type PlatformSubTab = 'approvals' | 'attachments' | 'api_keys' | 'webhooks';

export const PlatformGovernanceWorkspace: React.FC = () => {
  const {
    accountId,
    currentBusiness,
    currentBusinessId,
    language,
    rulesRaw,
    requestsRaw,
    attachmentsRaw,
    customFieldsRaw,
    printTemplatesRaw,
    apiKeysRaw,
    webhooksRaw,
    deliveriesRaw,
  } = useAtriumSelector(
    (s) => ({
      accountId: s.account?.id || '',
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessId: s.currentBusinessId,
      language: s.language,
      rulesRaw: s.platformApprovalRules,
      requestsRaw: s.platformApprovalRequests,
      attachmentsRaw: s.platformAttachments,
      customFieldsRaw: s.platformCustomFields,
      printTemplatesRaw: s.platformPrintTemplates,
      apiKeysRaw: s.platformApiKeys,
      webhooksRaw: s.platformWebhooks,
      deliveriesRaw: s.platformWebhookDeliveries,
    }),
    shallowEqualObjects
  );

  const {
    savePlatformApprovalRule,
    submitPlatformApprovalRequest,
    decidePlatformApprovalRequest,
    registerPlatformAttachment,
    toggleAttachmentLegalHold,
    issueAttachmentSignedUrl,
    purgePlatformAttachment,
    upsertPlatformCustomField,
    upsertPlatformPrintTemplate,
    createPlatformApiKey,
    revokePlatformApiKey,
    createPlatformWebhook,
    togglePlatformWebhookStatus,
    triggerWebhookDelivery,
    retryWebhookDelivery,
  } = useAtriumActions();

  const [subTab, setSubTab] = useState<PlatformSubTab>('approvals');

  // Filter business slices reactively
  const rules = useMemo(
    () => (rulesRaw || []).filter((r) => r.businessId === currentBusinessId && !r.deletedAt),
    [rulesRaw, currentBusinessId]
  );
  const requests = useMemo(
    () => (requestsRaw || []).filter((r) => r.businessId === currentBusinessId && !r.deletedAt),
    [requestsRaw, currentBusinessId]
  );
  const attachments = useMemo(
    () =>
      (attachmentsRaw || []).filter(
        (a) => a.businessId === currentBusinessId && !a.deletedAt && !a.purgedAt
      ),
    [attachmentsRaw, currentBusinessId]
  );
  const customFields = useMemo(
    () => (customFieldsRaw || []).filter((f) => f.businessId === currentBusinessId && !f.deletedAt),
    [customFieldsRaw, currentBusinessId]
  );
  const printTemplates = useMemo(
    () => (printTemplatesRaw || []).filter((p) => p.businessId === currentBusinessId && !p.deletedAt),
    [printTemplatesRaw, currentBusinessId]
  );
  const apiKeys = useMemo(
    () => (apiKeysRaw || []).filter((k) => k.businessId === currentBusinessId && !k.deletedAt),
    [apiKeysRaw, currentBusinessId]
  );
  const webhooks = useMemo(
    () => (webhooksRaw || []).filter((w) => w.businessId === currentBusinessId && !w.deletedAt),
    [webhooksRaw, currentBusinessId]
  );
  const deliveries = useMemo(
    () => (deliveriesRaw || []).filter((d) => d.businessId === currentBusinessId && !d.deletedAt),
    [deliveriesRaw, currentBusinessId]
  );

  // Approvals form state
  const [reqScope, setReqScope] = useState<ApprovalActionScope>('discount');
  const [reqEntityLabel, setReqEntityLabel] = useState('');
  const [reqAmountDzd, setReqAmountDzd] = useState('15000');
  const [reqPercent, setReqPercent] = useState('18');
  const [reqReason, setReqReason] = useState('');
  const [soleOwnerOverride, setSoleOwnerOverride] = useState(false);

  // Rule quick editor
  const [editScope, setEditScope] = useState<ApprovalActionScope>('discount');
  const [editThresholdDzd, setEditThresholdDzd] = useState('10000');
  const [editDualControl, setEditDualControl] = useState(true);

  // Attachments, Custom Fields & Print Templates state
  const [attEntityType, setAttEntityType] = useState('invoice');
  const [attEntityId, setAttEntityId] = useState('FAC-2026-001');
  const [attFileName, setAttFileName] = useState('signed_contract.pdf');
  const [attMimeType, setAttMimeType] = useState('application/pdf');
  const [attSizeBytes, setAttSizeBytes] = useState('48200');
  const [attRetentionDays, setAttRetentionDays] = useState('1825');
  const [attLegalHold, setAttLegalHold] = useState(false);
  const [lastSignedUrl, setLastSignedUrl] = useState<string | null>(null);

  const [cfEntityType, setCfEntityType] = useState('invoice');
  const [cfKey, setCfKey] = useState('');
  const [cfLabel, setCfLabel] = useState('');
  const [cfType, setCfType] = useState<PlatformCustomFieldType>('text');

  const [tplDocType, setTplDocType] = useState<PrintTemplateDocType>('invoice');
  const activeTemplate = useMemo(() => {
    return (
      printTemplates.find((p) => p.docType === tplDocType) ||
      buildDefaultPrintTemplate({
        accountId,
        businessId: currentBusinessId,
        docType: tplDocType,
      })
    );
  }, [printTemplates, tplDocType, accountId, currentBusinessId]);
  const [tplFooter, setTplFooter] = useState(activeTemplate.footerNote || '');
  const [tplAccent, setTplAccent] = useState(activeTemplate.accentColor || '#D4522F');
  const [tplShowQr, setTplShowQr] = useState(activeTemplate.showQr);
  const [tplShowStamp, setTplShowStamp] = useState(activeTemplate.showStamp);

  useEffect(() => {
    setTplFooter(activeTemplate.footerNote || '');
    setTplAccent(activeTemplate.accentColor || '#D4522F');
    setTplShowQr(activeTemplate.showQr);
    setTplShowStamp(activeTemplate.showStamp);
  }, [activeTemplate.docType, activeTemplate.footerNote, activeTemplate.accentColor, activeTemplate.showQr, activeTemplate.showStamp]);

  // API Key state
  const [apiKeyLabel, setApiKeyLabel] = useState('');
  const [apiKeyRate, setApiKeyRate] = useState('120');
  const [apiKeyScopes, setApiKeyScopes] = useState<PlatformApiScope[]>([
    'invoices:read',
    'bi:read',
  ]);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  // Webhook state
  const [whLabel, setWhLabel] = useState('');
  const [whUrl, setWhUrl] = useState('https://hooks.partner.dz/atrium');
  const [whEvents, setWhEvents] = useState<PlatformWebhookEventType[]>([
    'invoice.issued',
    'payment.recorded',
  ]);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);

  const copyText = (value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    showToast({
      type: 'success',
      title: t('phase2_plat_title', language),
      message: t('phase2_sec_copied_clipboard', language),
    });
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const thresholdCentimes = dzdToCentimes(Number(editThresholdDzd) || 0);
    savePlatformApprovalRule({
      actionScope: editScope,
      ruleName: `${editScope} >= ${editThresholdDzd} DZD`,
      thresholdCentimes,
      requireDualControl: editDualControl,
      isActive: true,
    });
    showToast({
      type: 'success',
      title: t('phase2_plat_approvals_tab', language),
      message: t('phase2_plat_rule_saved', language),
    });
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEntityLabel.trim() || !reqReason.trim()) return;
    const { request, ruleMatched } = submitPlatformApprovalRequest({
      actionScope: reqScope,
      entityType: 'invoice',
      entityId: reqEntityLabel.trim().toUpperCase().replace(/\s+/g, '-'),
      entityLabel: reqEntityLabel.trim(),
      amountCentimes: dzdToCentimes(Number(reqAmountDzd) || 0),
      percentDelta: reqPercent ? Number(reqPercent) : null,
      reason: reqReason.trim(),
    });
    setReqEntityLabel('');
    setReqReason('');
    showToast({
      type: ruleMatched ? 'warning' : 'success',
      title: request.entityLabel,
      message: t('phase2_plat_request_submitted', language),
    });
  };

  const handleDecideRequest = (
    requestId: string,
    decision: 'approved' | 'rejected' | 'cancelled'
  ) => {
    const res = decidePlatformApprovalRequest({
      requestId,
      decision,
      allowSoleOwnerFallback: soleOwnerOverride,
    });
    if (!res.ok) {
      showToast({
        type: 'error',
        title: t('phase2_plat_approvals_tab', language),
        message:
          res.reasonCode === 'APPROVAL_SELF_DECISION_FORBIDDEN'
            ? t('phase2_plat_self_approve_blocked', language)
            : res.reasonCode,
      });
      return;
    }
    showToast({
      type: 'success',
      title: res.request.entityLabel,
      message: `${t('phase2_plat_decision_recorded', language)}: ${res.request.status}`,
    });
  };

  const handleRegisterAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    const res = registerPlatformAttachment({
      entityType: attEntityType,
      entityId: attEntityId.trim() || 'DOC-001',
      entityLabel: `${attEntityType}:${attEntityId || 'DOC-001'}`,
      fileName: attFileName.trim(),
      mimeType: attMimeType,
      sizeBytes: Number(attSizeBytes) || 1024,
      virusScanStatus: 'clean',
      retentionDays: Number(attRetentionDays) || 1825,
      legalHold: attLegalHold,
    });
    if (!res.ok) {
      showToast({
        type: 'error',
        title: t('phase2_plat_attachments_tab', language),
        message: `${t('phase2_plat_attachment_rejected', language)} (${res.errorCode})`,
      });
      return;
    }
    setLastSignedUrl(
      `/storage/v1/object/sign/${res.attachment.bucket}/${res.attachment.storagePath}?token=${res.attachment.signedUrlToken}`
    );
    showToast({
      type: 'success',
      title: res.attachment.fileName,
      message: t('phase2_plat_attachment_saved', language),
    });
  };

  const handleSaveCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfKey.trim() || !cfLabel.trim()) return;
    upsertPlatformCustomField({
      entityType: cfEntityType,
      fieldKey: cfKey.trim(),
      labelEn: cfLabel.trim(),
      labelFr: cfLabel.trim(),
      labelAr: cfLabel.trim(),
      fieldType: cfType,
    });
    setCfKey('');
    setCfLabel('');
    showToast({
      type: 'success',
      title: t('phase2_plat_custom_fields_title', language),
      message: t('phase2_plat_custom_field_saved', language),
    });
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    upsertPlatformPrintTemplate({
      docType: tplDocType,
      footerNote: tplFooter,
      accentColor: tplAccent,
      showQr: tplShowQr,
      showStamp: tplShowStamp,
    });
    showToast({
      type: 'success',
      title: t('phase2_plat_print_templates_title', language),
      message: t('phase2_plat_template_saved', language),
    });
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyLabel.trim()) return;
    const res = createPlatformApiKey({
      label: apiKeyLabel.trim(),
      scopes: apiKeyScopes,
      rateLimitPerMinute: Number(apiKeyRate) || 120,
      expiresInDays: 365,
    });
    setRevealedToken(res.plaintextToken);
    setApiKeyLabel('');
    showToast({
      type: 'success',
      title: res.record.label,
      message: t('phase2_plat_api_key_created', language),
    });
  };

  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whLabel.trim() || !whUrl.trim()) return;
    const res = createPlatformWebhook({
      label: whLabel.trim(),
      endpointUrl: whUrl.trim(),
      subscribedEvents: whEvents,
      maxRetries: 5,
    });
    if (!res.ok) {
      showToast({
        type: 'error',
        title: t('phase2_plat_webhooks_tab', language),
        message: res.errorCode,
      });
      return;
    }
    setRevealedWebhookSecret(res.plaintextSecret);
    setWhLabel('');
    showToast({
      type: 'success',
      title: res.webhook.label,
      message: t('phase2_plat_webhook_created', language),
    });
  };

  const toggleScope = (scope: PlatformApiScope) => {
    setApiKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const toggleWhEvent = (ev: PlatformWebhookEventType) => {
    setWhEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  };

  return (
    <div className="flex flex-col gap-[var(--pod-gap,16px)]">
      {/* Header Banner */}
      <div className="sq-elev-card">
        <div
          data-sq="panel"
          className="bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,16px)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s3,12px)]"
        >
          <div className="flex items-center gap-[var(--s3,12px)]">
            <div
              data-sq="tile"
              data-sq-border="none"
              style={{ backgroundColor: 'var(--color-accent-dim)', color: 'var(--brand-text)' }}
              className="w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
            >
              <Sliders size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="t-pod text-[var(--text-1)] dark:text-white">
                {t('phase2_plat_title', language)}
              </h2>
              <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {currentBusiness?.name} · {t('phase2_plat_subtitle', language)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-[var(--s2,8px)]">
            {(
              [
                {
                  id: 'approvals' as PlatformSubTab,
                  label: t('phase2_plat_approvals_tab', language),
                  icon: <ClipboardCheck size={14} />,
                },
                {
                  id: 'attachments' as PlatformSubTab,
                  label: t('phase2_plat_attachments_tab', language),
                  icon: <Paperclip size={14} />,
                },
                {
                  id: 'api_keys' as PlatformSubTab,
                  label: t('phase2_plat_api_keys_tab', language),
                  icon: <KeyRound size={14} />,
                },
                {
                  id: 'webhooks' as PlatformSubTab,
                  label: t('phase2_plat_webhooks_tab', language),
                  icon: <Webhook size={14} />,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                data-sq="ctl-sm"
                onClick={() => setSubTab(item.id)}
                className={`h-[34px] px-[var(--s3,12px)] t-small font-semibold inline-flex items-center gap-[6px] cursor-pointer transition-colors ${
                  subTab === item.id
                    ? 'bg-[var(--brand-fill)] text-white'
                    : 'bg-white dark:bg-[#22201E] text-[var(--text-2)] hover:text-[var(--text-1)] dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Tab 1: Approvals & Maker-Checker */}
      {subTab === 'approvals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--pod-gap,16px)]">
          <div className="sq-elev-card">
            <div
              data-sq="panel"
              className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-[var(--s4,16px)]"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_plat_rules_heading', language)}
                </h3>
                <label className="inline-flex items-center gap-2 t-cap text-[var(--text-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soleOwnerOverride}
                    onChange={(e) => setSoleOwnerOverride(e.target.checked)}
                  />
                  <span>{t('phase2_plat_sole_owner_override', language)}</span>
                </label>
              </div>

              <form onSubmit={handleSaveRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  aria-label="Rule action scope"
                  value={editScope}
                  onChange={(e) => setEditScope(e.target.value as ApprovalActionScope)}
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                >
                  {APPROVAL_ACTION_SCOPES.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={editThresholdDzd}
                  onChange={(e) => setEditThresholdDzd(e.target.value)}
                  placeholder="10000"
                  aria-label="Rule threshold DZD"
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
                <button
                  type="submit"
                  data-sq="ctl"
                  className="h-[38px] px-4 bg-[var(--brand-fill)] text-white t-small font-semibold cursor-pointer"
                >
                  {t('phase2_plat_save_rule_btn', language)}
                </button>
              </form>

              <label className="inline-flex items-center gap-2 t-cap text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editDualControl}
                  onChange={(e) => setEditDualControl(e.target.checked)}
                />
                <span>{t('phase2_plat_dual_control_label', language)}</span>
              </label>

              <div className="flex flex-col gap-2">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    data-sq="card"
                    className="p-3 bg-[#F8F5F1] dark:bg-[#191716] flex items-center justify-between gap-2 t-small"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-1)] dark:text-white">
                        {r.ruleName}
                      </div>
                      <div className="t-cap text-[var(--text-2)]">
                        {r.actionScope} · ≥ {centimesToDzd(r.thresholdCentimes).toLocaleString()} DZD ·{' '}
                        {r.requireDualControl ? 'Maker-Checker' : 'Single Approver'}
                      </div>
                    </div>
                    <span className="t-cap font-semibold text-emerald-700 dark:text-emerald-400">
                      {r.isActive ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sq-elev-card">
            <div
              data-sq="panel"
              className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-[var(--s4,16px)]"
            >
              <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                {t('phase2_plat_requests_heading', language)}
              </h3>

              <form onSubmit={handleSubmitRequest} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    aria-label="Request scope"
                    value={reqScope}
                    onChange={(e) => setReqScope(e.target.value as ApprovalActionScope)}
                    data-sq="ctl"
                    className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  >
                    {APPROVAL_ACTION_SCOPES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={reqEntityLabel}
                    onChange={(e) => setReqEntityLabel(e.target.value)}
                    placeholder={t('phase2_plat_req_entity_ph', language)}
                    data-sq="ctl"
                    className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  />
                  <input
                    type="number"
                    min={0}
                    value={reqAmountDzd}
                    onChange={(e) => setReqAmountDzd(e.target.value)}
                    placeholder="Amount DZD"
                    data-sq="ctl"
                    className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={reqPercent}
                    onChange={(e) => setReqPercent(e.target.value)}
                    placeholder="% delta"
                    data-sq="ctl"
                    className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                  />
                  <input
                    type="text"
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder={t('phase2_plat_req_reason_ph', language)}
                    data-sq="ctl"
                    className="sm:col-span-2 h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  />
                </div>
                <button
                  type="submit"
                  data-sq="ctl"
                  className="h-[38px] px-4 bg-neutral-900 text-white t-small font-semibold cursor-pointer self-start"
                >
                  {t('phase2_plat_submit_req_btn', language)}
                </button>
              </form>

              <div className="flex flex-col gap-2">
                {requests.length === 0 ? (
                  <p className="t-cap text-[var(--text-2)]">{t('phase2_plat_no_requests', language)}</p>
                ) : (
                  requests.map((r) => (
                    <div
                      key={r.id}
                      data-sq="card"
                      className="p-3 bg-[#F8F5F1] dark:bg-[#191716] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="t-small">
                        <div className="font-semibold text-[var(--text-1)] dark:text-white">
                          {r.entityLabel} · {centimesToDzd(r.amountCentimes).toLocaleString()} DZD
                        </div>
                        <div className="t-cap text-[var(--text-2)]">
                          {r.actionScope} · {r.requestedByName} · <strong>{r.status}</strong> — {r.reason}
                        </div>
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-sq="ctl-sm"
                            onClick={() => handleDecideRequest(r.id, 'approved')}
                            className="h-[32px] px-3 bg-emerald-600 text-white t-cap font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 size={14} />
                            <span>{t('phase2_plat_approve_btn', language)}</span>
                          </button>
                          <button
                            type="button"
                            data-sq="ctl-sm"
                            onClick={() => handleDecideRequest(r.id, 'rejected')}
                            className="h-[32px] px-3 bg-rose-600 text-white t-cap font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle size={14} />
                            <span>{t('phase2_sec_reject_btn', language)}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Attachments, Signed URLs, Legal Hold, Custom Fields & Print Templates */}
      {subTab === 'attachments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--pod-gap,16px)]">
          <div className="sq-elev-card">
            <div
              data-sq="panel"
              className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-[var(--s4,16px)]"
            >
              <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                {t('phase2_plat_attachments_tab', language)}
              </h3>
              <form onSubmit={handleRegisterAttachment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  aria-label="Attachment entity type"
                  value={attEntityType}
                  onChange={(e) => setAttEntityType(e.target.value)}
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                >
                  <option value="invoice">invoice</option>
                  <option value="expense">expense</option>
                  <option value="contract">contract</option>
                  <option value="patient">patient</option>
                </select>
                <input
                  type="text"
                  value={attEntityId}
                  onChange={(e) => setAttEntityId(e.target.value)}
                  placeholder="FAC-2026-001"
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                />
                <input
                  type="text"
                  value={attFileName}
                  onChange={(e) => setAttFileName(e.target.value)}
                  placeholder="contract.pdf"
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                />
                <select
                  aria-label="Attachment MIME type"
                  value={attMimeType}
                  onChange={(e) => setAttMimeType(e.target.value)}
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                >
                  <option value="application/pdf">application/pdf</option>
                  <option value="image/png">image/png</option>
                  <option value="image/jpeg">image/jpeg</option>
                  <option value="text/csv">text/csv</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={attSizeBytes}
                  onChange={(e) => setAttSizeBytes(e.target.value)}
                  placeholder="Size bytes"
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
                <input
                  type="number"
                  min={7}
                  value={attRetentionDays}
                  onChange={(e) => setAttRetentionDays(e.target.value)}
                  placeholder="Retention days"
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
                <label className="sm:col-span-2 inline-flex items-center gap-2 t-cap text-[var(--text-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attLegalHold}
                    onChange={(e) => setAttLegalHold(e.target.checked)}
                  />
                  <span>{t('phase2_plat_legal_hold_label', language)}</span>
                </label>
                <button
                  type="submit"
                  data-sq="ctl"
                  className="sm:col-span-2 h-[38px] px-4 bg-[var(--brand-fill)] text-white t-small font-semibold cursor-pointer"
                >
                  {t('phase2_plat_register_att_btn', language)}
                </button>
              </form>

              {lastSignedUrl && (
                <div
                  data-sq="card"
                  className="p-3 bg-emerald-50 dark:bg-emerald-950/30 t-cap text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2"
                >
                  <span className="truncate font-mono">{lastSignedUrl}</span>
                  <button
                    type="button"
                    data-sq="ctl-sm"
                    onClick={() => copyText(lastSignedUrl)}
                    className="h-[28px] px-2 bg-white dark:bg-[#22201E] text-[var(--text-1)] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    data-sq="card"
                    className="p-3 bg-[#F8F5F1] dark:bg-[#191716] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="t-small min-w-0">
                      <div className="font-semibold text-[var(--text-1)] dark:text-white truncate">
                        {att.fileName} ({Math.round(att.sizeBytes / 1024)} KB)
                      </div>
                      <div className="t-cap text-[var(--text-2)] truncate">
                        {att.entityType}:{att.entityId} · scan: {att.virusScanStatus} ·{' '}
                        {att.legalHold ? 'LEGAL HOLD' : `${att.retentionDays}d`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-sq="ctl-sm"
                        onClick={() => {
                          const signed = issueAttachmentSignedUrl({ attachmentId: att.id });
                          if (signed.ok) {
                            setLastSignedUrl(signed.signedUrl);
                          }
                        }}
                        className="h-[30px] px-2.5 bg-white dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white t-cap inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Link2 size={12} />
                        <span>{t('phase2_plat_signed_url_btn', language)}</span>
                      </button>
                      <button
                        type="button"
                        data-sq="ctl-sm"
                        onClick={() => toggleAttachmentLegalHold(att.id)}
                        className={`h-[30px] px-2.5 t-cap inline-flex items-center gap-1 cursor-pointer ${
                          att.legalHold
                            ? 'bg-amber-600 text-white'
                            : 'bg-[#EFE9E2] dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white'
                        }`}
                      >
                        {att.legalHold ? <Lock size={12} /> : <Unlock size={12} />}
                        <span>Hold</span>
                      </button>
                      <button
                        type="button"
                        data-sq="ctl-sm"
                        aria-label={`Purge ${att.fileName}`}
                        onClick={() => {
                          const res = purgePlatformAttachment(att.id);
                          if (!res.ok) {
                            showToast({
                              type: 'error',
                              title: att.fileName,
                              message:
                                res.reasonCode === 'LEGAL_HOLD_ACTIVE'
                                  ? t('phase2_plat_purge_blocked_hold', language)
                                  : `${t('phase2_plat_attachment_rejected', language)} (${res.reasonCode})`,
                            });
                          }
                        }}
                        className="h-[30px] px-2.5 bg-rose-600 text-white t-cap inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[var(--pod-gap,16px)]">
            <div className="sq-elev-card">
              <div
                data-sq="panel"
                className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-3"
              >
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_plat_custom_fields_title', language)}
                </h3>
                <form onSubmit={handleSaveCustomField} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    aria-label="Custom field entity"
                    value={cfEntityType}
                    onChange={(e) => setCfEntityType(e.target.value)}
                    data-sq="ctl"
                    className="h-[38px] px-2 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  >
                    <option value="invoice">invoice</option>
                    <option value="member">member</option>
                    <option value="customer">customer</option>
                    <option value="product">product</option>
                  </select>
                  <input
                    type="text"
                    value={cfKey}
                    onChange={(e) => setCfKey(e.target.value)}
                    placeholder="po_number"
                    data-sq="ctl"
                    className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  />
                  <input
                    type="text"
                    value={cfLabel}
                    onChange={(e) => setCfLabel(e.target.value)}
                    placeholder="PO Reference"
                    data-sq="ctl"
                    className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  />
                  <select
                    aria-label="Custom field type"
                    value={cfType}
                    onChange={(e) => setCfType(e.target.value as PlatformCustomFieldType)}
                    data-sq="ctl"
                    className="h-[38px] px-2 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="date">date</option>
                    <option value="boolean">boolean</option>
                  </select>
                  <button
                    type="submit"
                    data-sq="ctl"
                    className="sm:col-span-4 h-[36px] px-4 bg-neutral-900 text-white t-small font-semibold cursor-pointer"
                  >
                    {t('phase2_plat_add_custom_field_btn', language)}
                  </button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {customFields.map((cf) => (
                    <span
                      key={cf.id}
                      data-sq="ctl-sm"
                      className="px-3 py-1 bg-[#F3EDE7] dark:bg-[#191716] t-cap text-[var(--text-1)] dark:text-white"
                    >
                      {cf.entityType}.{cf.fieldKey} ({cf.fieldType})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="sq-elev-card">
              <div
                data-sq="panel"
                className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <Printer size={16} className="text-[var(--brand-text)]" />
                  <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                    {t('phase2_plat_print_templates_title', language)}
                  </h3>
                </div>
                <form onSubmit={handleSaveTemplate} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      aria-label="Print template document type"
                      value={tplDocType}
                      onChange={(e) => setTplDocType(e.target.value as PrintTemplateDocType)}
                      data-sq="ctl"
                      className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                    >
                      <option value="invoice">invoice</option>
                      <option value="quote">quote</option>
                      <option value="receipt">receipt</option>
                      <option value="payslip">payslip</option>
                      <option value="report">report</option>
                    </select>
                    <input
                      type="text"
                      value={tplAccent}
                      onChange={(e) => setTplAccent(e.target.value)}
                      placeholder="#D4522F"
                      data-sq="ctl"
                      className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small font-mono"
                    />
                  </div>
                  <input
                    type="text"
                    value={tplFooter}
                    onChange={(e) => setTplFooter(e.target.value)}
                    placeholder={t('phase2_plat_tpl_footer_ph', language)}
                    data-sq="ctl"
                    className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                  />
                  <div className="flex flex-wrap gap-4 t-cap text-[var(--text-2)]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tplShowQr}
                        onChange={(e) => setTplShowQr(e.target.checked)}
                      />
                      <span>QR Code</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tplShowStamp}
                        onChange={(e) => setTplShowStamp(e.target.checked)}
                      />
                      <span>Stamp & Signature</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    data-sq="ctl"
                    className="h-[36px] px-4 bg-[var(--brand-fill)] text-white t-small font-semibold cursor-pointer self-start"
                  >
                    {t('phase2_plat_save_tpl_btn', language)}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Scoped REST API Keys */}
      {subTab === 'api_keys' && (
        <div className="sq-elev-card">
          <div
            data-sq="panel"
            className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-[var(--s4,16px)]"
          >
            <h3 className="t-pod text-[var(--text-1)] dark:text-white">
              {t('phase2_plat_api_keys_tab', language)}
            </h3>

            {revealedToken && (
              <div
                data-sq="card"
                style={{ '--sq-stroke': 'rgba(16,185,129,0.45)' } as React.CSSProperties}
                className="p-4 bg-emerald-50 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="t-small text-emerald-900 dark:text-emerald-200">
                  <div className="font-semibold">{t('phase2_plat_one_time_secret', language)}</div>
                  <code className="font-mono text-xs break-all">{revealedToken}</code>
                </div>
                <button
                  type="button"
                  data-sq="ctl-sm"
                  onClick={() => copyText(revealedToken)}
                  className="h-[34px] px-3 bg-emerald-700 text-white t-cap font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </button>
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={apiKeyLabel}
                  onChange={(e) => setApiKeyLabel(e.target.value)}
                  placeholder={t('phase2_plat_api_label_ph', language)}
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                />
                <input
                  type="number"
                  min={10}
                  max={6000}
                  value={apiKeyRate}
                  onChange={(e) => setApiKeyRate(e.target.value)}
                  placeholder="RPM (e.g. 120)"
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small tabular-nums"
                />
                <button
                  type="submit"
                  data-sq="ctl"
                  className="h-[38px] px-4 bg-[var(--brand-fill)] text-white t-small font-semibold cursor-pointer"
                >
                  {t('phase2_plat_create_api_key_btn', language)}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {PLATFORM_API_SCOPES.map((sc) => {
                  const active = apiKeyScopes.includes(sc);
                  return (
                    <button
                      key={sc}
                      type="button"
                      data-sq="ctl-sm"
                      aria-pressed={active}
                      onClick={() => toggleScope(sc)}
                      className={`h-[30px] px-3 t-cap font-semibold cursor-pointer ${
                        active
                          ? 'bg-neutral-900 text-white'
                          : 'bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-2)]'
                      }`}
                    >
                      {sc}
                    </button>
                  );
                })}
              </div>
            </form>

            <div className="flex flex-col gap-2">
              {apiKeys.length === 0 ? (
                <p className="t-cap text-[var(--text-2)]">{t('phase2_plat_no_api_keys', language)}</p>
              ) : (
                apiKeys.map((k) => (
                  <div
                    key={k.id}
                    data-sq="card"
                    className="p-3 bg-[#F8F5F1] dark:bg-[#191716] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="t-small">
                      <div className="font-semibold text-[var(--text-1)] dark:text-white">
                        {k.label} · <code className="font-mono">{k.keyPrefix}</code>
                      </div>
                      <div className="t-cap text-[var(--text-2)]">
                        SHA-256: {k.keyHash.slice(0, 12)}… · {k.rateLimitPerMinute} req/min ·{' '}
                        {k.scopes.join(', ')} · <strong>{k.status}</strong>
                      </div>
                    </div>
                    {k.status === 'active' && (
                      <button
                        type="button"
                        data-sq="ctl-sm"
                        onClick={() => revokePlatformApiKey(k.id)}
                        className="h-[32px] px-3 bg-rose-600 text-white t-cap font-semibold cursor-pointer shrink-0"
                      >
                        {t('phase2_plat_revoke_btn', language)}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Signed Outbound Webhooks */}
      {subTab === 'webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--pod-gap,16px)]">
          <div className="sq-elev-card">
            <div
              data-sq="panel"
              className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-3"
            >
              <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                {t('phase2_plat_webhooks_tab', language)}
              </h3>

              {revealedWebhookSecret && (
                <div
                  data-sq="card"
                  className="p-3 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between gap-2 t-cap"
                >
                  <code className="font-mono truncate">{revealedWebhookSecret}</code>
                  <button
                    type="button"
                    data-sq="ctl-sm"
                    onClick={() => copyText(revealedWebhookSecret)}
                    className="h-[28px] px-2 bg-emerald-700 text-white cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              )}

              <form onSubmit={handleCreateWebhook} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={whLabel}
                  onChange={(e) => setWhLabel(e.target.value)}
                  placeholder={t('phase2_plat_wh_label_ph', language)}
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                />
                <input
                  type="url"
                  value={whUrl}
                  onChange={(e) => setWhUrl(e.target.value)}
                  placeholder="https://hooks.partner.dz/atrium"
                  data-sq="ctl"
                  className="h-[38px] px-3 bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-1)] dark:text-white t-small"
                />
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_WEBHOOK_EVENTS.map((ev) => {
                    const active = whEvents.includes(ev);
                    return (
                      <button
                        key={ev}
                        type="button"
                        data-sq="ctl-sm"
                        aria-pressed={active}
                        onClick={() => toggleWhEvent(ev)}
                        className={`h-[28px] px-2.5 t-cap cursor-pointer ${
                          active
                            ? 'bg-neutral-900 text-white'
                            : 'bg-[#F3EDE7] dark:bg-[#191716] text-[var(--text-2)]'
                        }`}
                      >
                        {ev}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="submit"
                  data-sq="ctl"
                  className="h-[38px] px-4 bg-[var(--brand-fill)] text-white t-small font-semibold cursor-pointer self-start"
                >
                  {t('phase2_plat_add_webhook_btn', language)}
                </button>
              </form>

              <div className="flex flex-col gap-2">
                {webhooks.map((w) => (
                  <div
                    key={w.id}
                    data-sq="card"
                    className="p-3 bg-[#F8F5F1] dark:bg-[#191716] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="t-small min-w-0">
                        <div className="font-semibold text-[var(--text-1)] dark:text-white truncate">
                          {w.label} ({w.status})
                        </div>
                        <div className="t-cap text-[var(--text-2)] truncate">
                          {w.endpointUrl} · {w.signingSecretMasked}
                        </div>
                      </div>
                      <button
                        type="button"
                        data-sq="ctl-sm"
                        onClick={() => togglePlatformWebhookStatus(w.id)}
                        className="h-[28px] px-2.5 bg-white dark:bg-[#2B2825] t-cap cursor-pointer"
                      >
                        {w.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        data-sq="ctl-sm"
                        onClick={() =>
                          triggerWebhookDelivery({
                            webhookId: w.id,
                            eventType: w.subscribedEvents[0] || 'invoice.issued',
                            simulateHttpStatus: 200,
                          })
                        }
                        className="h-[30px] px-3 bg-emerald-600 text-white t-cap font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Send size={12} />
                        <span>{t('phase2_plat_send_test_btn', language)}</span>
                      </button>
                      <button
                        type="button"
                        data-sq="ctl-sm"
                        onClick={() =>
                          triggerWebhookDelivery({
                            webhookId: w.id,
                            eventType: w.subscribedEvents[0] || 'invoice.issued',
                            simulateHttpStatus: 502,
                          })
                        }
                        className="h-[30px] px-3 bg-amber-600 text-white t-cap font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldAlert size={12} />
                        <span>{t('phase2_plat_sim_fail_btn', language)}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sq-elev-card">
            <div
              data-sq="panel"
              className="bg-white dark:bg-[#22201E] p-[var(--card-pad,20px)] flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <FileCheck2 size={16} className="text-[var(--brand-text)]" />
                <h3 className="t-pod text-[var(--text-1)] dark:text-white">
                  {t('phase2_plat_deliveries_heading', language)}
                </h3>
              </div>

              {deliveries.length === 0 ? (
                <p className="t-cap text-[var(--text-2)]">{t('phase2_plat_no_deliveries', language)}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {deliveries.map((d) => (
                    <div
                      key={d.id}
                      data-sq="card"
                      className="p-3 bg-[#F8F5F1] dark:bg-[#191716] flex flex-col gap-1 t-small"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text-1)] dark:text-white">
                          {d.eventType} · #{d.attemptCount} ({d.status})
                        </span>
                        {(d.status === 'retrying' || d.status === 'dead_letter') && (
                          <button
                            type="button"
                            data-sq="ctl-sm"
                            onClick={() =>
                              retryWebhookDelivery({ deliveryId: d.id, simulateHttpStatus: 200 })
                            }
                            className="h-[28px] px-2.5 bg-neutral-900 text-white t-cap inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={12} />
                            <span>{t('phase2_plat_retry_btn', language)}</span>
                          </button>
                        )}
                      </div>
                      <div className="t-cap text-[var(--text-2)] font-mono truncate">
                        {d.signatureHeader}
                      </div>
                      <div className="t-cap text-[var(--text-2)]">{d.responseSnippet}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
