import React, { useMemo, useState } from 'react';
import {
  FileText,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Globe,
  ShieldAlert,
  RotateCcw,
  ExternalLink,
  Plus,
} from 'lucide-react';
import type {
  PMBatDeliverable,
  PMClientPortalReview,
  PMMilestone,
  PMProject,
  UnifiedCurrency,
  UnifiedDocument,
  UnifiedPayment,
} from '../../../types/index';
import {
  computeMilestoneInvoiceableAmount,
  convertDzdToProjectCurrency,
  DEFAULT_FX_RATES_TO_DZD,
  isUnifiedDocumentLinkedToProject,
  normalizeFxRateToDzd,
} from '../../../utils/projectDepth';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useAtriumActions, useAtriumSelector, shallowEqualObjects } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { ScreenPod } from '../../ui/kinetic';
import {
  UnifiedInvoiceComposerModal,
  type UnifiedInvoiceComposerPrefill,
} from '../../common/invoicing/UnifiedInvoiceComposerModal';
import { UnifiedInvoicePrintModal } from '../../common/invoicing/UnifiedInvoicePrintModal';
import { UnifiedPaymentModal } from '../../common/invoicing/UnifiedPaymentModal';
import { UnifiedPaymentsLedgerPanel } from '../../common/invoicing/UnifiedPaymentsLedgerPanel';

interface ProjectBillingPortalPanelProps {
  projects: PMProject[];
  milestones: PMMilestone[];
  deliverables: PMBatDeliverable[];
  portalReviews: PMClientPortalReview[];
  selectedProjectId?: string;
  onSelectProjectId?: (projectId: string) => void;
  defaultSubView?: 'billing' | 'portal';
}

export const ProjectBillingPortalPanel: React.FC<ProjectBillingPortalPanelProps> = ({
  projects,
  milestones,
  deliverables,
  portalReviews,
  selectedProjectId,
  onSelectProjectId,
  defaultSubView = 'billing',
}) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { unifiedDocuments, unifiedPayments, currentUser } = useAtriumSelector(
    (s) => ({
      unifiedDocuments: s.unifiedDocuments || [],
      unifiedPayments: s.unifiedPayments || [],
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );

  const {
    updatePmProjectConfig,
    approvePmMilestonePartial,
    issueUnifiedDocument,
    createCreditNoteForDocument,
    submitClientPortalDeliverableReview,
  } = useAtriumActions();

  const [subView, setSubView] = useState<'billing' | 'portal'>(defaultSubView);
  const [localProjectId, setLocalProjectId] = useState(selectedProjectId || projects[0]?.id || '');

  const activeProject = useMemo(
    () =>
      projects.find((p) => p.id === (selectedProjectId || localProjectId)) || projects[0],
    [projects, selectedProjectId, localProjectId]
  );

  const projectCurrency: UnifiedCurrency = (activeProject?.currency || 'DZD') as UnifiedCurrency;
  const projectFxRate = normalizeFxRateToDzd(projectCurrency, activeProject?.fxRateToDzd);

  const [fxDraftCurrency, setFxDraftCurrency] = useState<UnifiedCurrency>(projectCurrency);
  const [fxDraftRate, setFxDraftRate] = useState(String(projectFxRate));

  const projectMilestones = useMemo(
    () => milestones.filter((m) => m.projectId === (activeProject?.id || '')),
    [milestones, activeProject]
  );
  const milestoneIdSet = useMemo(
    () => new Set(projectMilestones.map((m) => m.id)),
    [projectMilestones]
  );

  const projectDocs = useMemo(() => {
    if (!activeProject) return [];
    return unifiedDocuments.filter((doc) =>
      isUnifiedDocumentLinkedToProject(doc, activeProject, milestoneIdSet)
    );
  }, [unifiedDocuments, activeProject, milestoneIdSet]);

  const projectDocIds = useMemo(() => new Set(projectDocs.map((d) => d.id)), [projectDocs]);

  const projectPayments = useMemo(() => {
    return unifiedPayments.filter(
      (p) =>
        p.sourceVertical === 'project_milestone' &&
        ((p.allocations || []).some((a) => projectDocIds.has(a.documentId)) ||
          (activeProject && p.partyName === activeProject.clientName))
    );
  }, [unifiedPayments, projectDocIds, activeProject]);

  // Partial milestone slider map
  const [partialDraftPctById, setPartialDraftPctById] = useState<Record<string, number>>({});

  // Invoicing modals state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrefill, setComposerPrefill] = useState<UnifiedInvoiceComposerPrefill | undefined>();
  const [printDoc, setPrintDoc] = useState<UnifiedDocument | null>(null);
  const [paymentDoc, setPaymentDoc] = useState<UnifiedDocument | null>(null);

  // Client portal state
  const projectDeliverables = useMemo(
    () => deliverables.filter((d) => d.projectId === (activeProject?.id || '')),
    [deliverables, activeProject]
  );
  const [portalReviewerName, setPortalReviewerName] = useState(
    activeProject?.clientName || currentUser?.fullName || 'Client Approver'
  );
  const [portalCommentsById, setPortalCommentsById] = useState<Record<string, string>>({});
  const [portalErrorById, setPortalErrorById] = useState<Record<string, string>>({});

  const formatProjectMoney = (amountDzd: number) => {
    if (projectCurrency === 'DZD') return formatMoney(amountDzd, 'DZD');
    const fxVal = convertDzdToProjectCurrency(amountDzd, projectCurrency, projectFxRate);
    return `${fxVal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${projectCurrency} (${formatMoney(amountDzd, 'DZD')})`;
  };

  const handleProjectChange = (id: string) => {
    setLocalProjectId(id);
    if (onSelectProjectId) onSelectProjectId(id);
    const nextProj = projects.find((p) => p.id === id);
    if (nextProj) {
      const nextCur = (nextProj.currency || 'DZD') as UnifiedCurrency;
      setFxDraftCurrency(nextCur);
      setFxDraftRate(String(normalizeFxRateToDzd(nextCur, nextProj.fxRateToDzd)));
      setPortalReviewerName(nextProj.clientName || 'Client');
    }
  };

  const handleOpenQuoteComposer = () => {
    if (!activeProject) return;
    const budgetInCurrency = convertDzdToProjectCurrency(
      activeProject.budgetCapDzd,
      projectCurrency,
      projectFxRate
    );
    setComposerPrefill({
      docType: 'devis',
      sourceVertical: 'project_milestone',
      partyName: activeProject.clientName,
      sourceEntityType: 'pm_project',
      sourceEntityId: activeProject.id,
      currency: projectCurrency,
      fxRate: projectFxRate,
      notesTop: `${activeProject.title} — ${activeProject.scopeOfWork}`,
      items: [
        {
          description: activeProject.title,
          isService: true,
          quantity: 1,
          unit: 'forfait',
          unitPriceHt: budgetInCurrency,
          tvaPercent: 19,
        },
      ],
    });
    setComposerOpen(true);
  };

  const handleBillMilestone = (ms: PMMilestone) => {
    if (!activeProject) return;
    const check = computeMilestoneInvoiceableAmount({
      milestone: ms,
      project: activeProject,
      existingProjectDocs: projectDocs,
    });
    if (!check.eligible) return;

    setComposerPrefill({
      docType: 'facture',
      sourceVertical: 'project_milestone',
      partyName: activeProject.clientName,
      sourceEntityType: 'pm_milestone',
      sourceEntityId: ms.id,
      currency: check.currency,
      fxRate: check.fxRateToDzd,
      notesTop: `${activeProject.title} · Jalon: ${ms.title} (${check.approvedPct}% validé)`,
      items: [
        {
          description: `${ms.title} (${check.approvedPct}%)`,
          isService: true,
          quantity: 1,
          unit: 'jalon',
          unitPriceHt: check.invoiceAmountInProjectCurrency,
          tvaPercent: 19,
        },
      ],
    });
    setComposerOpen(true);
  };

  const handlePortalAction = (
    bat: PMBatDeliverable,
    decision: 'approved' | 'revision_requested' | 'override_granted'
  ) => {
    const comment = portalCommentsById[bat.id] || '';
    const res = submitClientPortalDeliverableReview({
      deliverableId: bat.id,
      reviewerName: portalReviewerName || activeProject?.clientName || 'Client',
      decision,
      comments: comment || undefined,
    });
    if (!res.ok) {
      setPortalErrorById((prev) => ({
        ...prev,
        [bat.id]: t('pm_depth_portal_limit_blocked', {
          max: String(res.maxRevisionLoops || bat.maxRevisionLoops || 3),
        }),
      }));
    } else {
      setPortalErrorById((prev) => {
        const next = { ...prev };
        delete next[bat.id];
        return next;
      });
      setPortalCommentsById((prev) => ({ ...prev, [bat.id]: '' }));
    }
  };

  if (!activeProject) {
    return (
      <ScreenPod>
        <div className="sq-elev-card">
          <div data-sq="card" data-sq-border="none" className="p-8 bg-white dark:bg-[#22201E]">
            <EmptyState
              variant="compact"
              tone="neutral"
              icon={<FileText size={22} />}
              title={t('pm_depth_no_project_title')}
              description={t('pm_depth_no_project_desc')}
            />
          </div>
        </div>
      </ScreenPod>
    );
  }

  return (
    <ScreenPod>
      <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'} data-testid="project-billing-portal">
        {/* Header Bar with Project Picker, Currency FX & Mode Switch */}
        <div className="sq-elev-card">
          <div
            data-sq="card"
            data-sq-border="none"
            className="p-5 bg-white dark:bg-[#22201E] space-y-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                  {subView === 'billing'
                    ? t('pm_depth_billing_badge')
                    : t('pm_depth_portal_badge')}
                </span>
                <h2 className="t-pod font-semibold text-black dark:text-white mt-0.5">
                  {activeProject.title} · {activeProject.clientName}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="w-52">
                  <LabelSelect
                    field="BillingProjectSelect"
                    label={t('pm_depth_project_label')}
                    value={activeProject.id}
                    onChange={handleProjectChange}
                    options={projects.map((p) => ({
                      value: p.id,
                      label: `${p.title} (${p.currency || 'DZD'})`,
                    }))}
                    height={38}
                    corner={10}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSubView('billing')}
                  data-sq="ctl-sm"
                  className={`px-3 py-2 t-small font-semibold cursor-pointer transition-colors ${
                    subView === 'billing'
                      ? 'bg-[#BF431F] text-white'
                      : 'bg-[#F5F1EC] dark:bg-[#2B2825] text-black/75 dark:text-white/80'
                  }`}
                >
                  {t('pm_depth_tab_billing')} ({projectDocs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubView('portal')}
                  data-sq="ctl-sm"
                  className={`px-3 py-2 t-small font-semibold cursor-pointer transition-colors ${
                    subView === 'portal'
                      ? 'bg-[#BF431F] text-white'
                      : 'bg-[#F5F1EC] dark:bg-[#2B2825] text-black/75 dark:text-white/80'
                  }`}
                >
                  {t('pm_depth_tab_portal')} ({projectDeliverables.length})
                </button>
              </div>
            </div>

            {/* Project Currency & FX Config Row */}
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="p-3 bg-[#F5F1EC] dark:bg-[#191716] flex flex-wrap items-end gap-3"
            >
              <div className="flex items-center gap-2 t-cap font-semibold text-black dark:text-white mr-2 self-center">
                <Globe className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>{t('pm_depth_currency_fx')}</span>
              </div>
              <div className="w-28">
                <LabelSelect
                  field="ProjCurrency"
                  label={t('pm_depth_currency_label')}
                  value={fxDraftCurrency}
                  onChange={(v) => {
                    const nextC = v as UnifiedCurrency;
                    setFxDraftCurrency(nextC);
                    setFxDraftRate(String(DEFAULT_FX_RATES_TO_DZD[nextC] || 1));
                  }}
                  options={[
                    { value: 'DZD', label: 'DZD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USD', label: 'USD' },
                  ]}
                  height={36}
                  corner={8}
                />
              </div>
              <div className="w-32">
                <LabelInput
                  field="ProjFxRate"
                  label={t('pm_depth_fx_rate_label')}
                  type="number"
                  value={fxDraftCurrency === 'DZD' ? '1' : fxDraftRate}
                  onChange={setFxDraftRate}
                  disabled={fxDraftCurrency === 'DZD'}
                  height={36}
                  corner={8}
                />
              </div>
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updatePmProjectConfig(activeProject.id, {
                    currency: fxDraftCurrency,
                    fxRateToDzd:
                      fxDraftCurrency === 'DZD' ? 1 : Number(fxDraftRate || DEFAULT_FX_RATES_TO_DZD[fxDraftCurrency]),
                  })
                }
              >
                {t('pm_depth_apply_fx')}
              </AtriumButton>
              <div className="ml-auto">
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenQuoteComposer}
                >
                  {t('pm_depth_create_quote_btn')}
                </AtriumButton>
              </div>
            </div>
          </div>
        </div>

        {subView === 'billing' ? (
          <div className="space-y-6">
            {/* Milestones Partial Approval & Milestone Invoicing */}
            <div className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-5 bg-white dark:bg-[#22201E] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="t-label font-semibold text-black dark:text-white">
                    {t('pm_depth_milestones_billing_title')} ({projectMilestones.length})
                  </h3>
                  <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                    {t('pm_depth_contract_cap')}: {formatProjectMoney(activeProject.budgetCapDzd)}
                  </span>
                </div>

                {projectMilestones.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    tone="neutral"
                    icon={<FileText size={20} />}
                    title={t('pm_depth_no_milestones_title')}
                    description={t('pm_depth_no_milestones_desc')}
                  />
                ) : (
                  <div className="space-y-3">
                    {projectMilestones.map((ms) => {
                      const currentPct =
                        partialDraftPctById[ms.id] ??
                        (ms.isCompleted ? 100 : Number(ms.approvedPct || 0));
                      const invoiceability = computeMilestoneInvoiceableAmount({
                        milestone: ms,
                        project: activeProject,
                        existingProjectDocs: projectDocs,
                      });
                      return (
                        <div
                          key={ms.id}
                          data-sq="ctl"
                          data-sq-border="none"
                          className="p-4 bg-[#F5F1EC] dark:bg-[#191716] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="t-small font-semibold text-black dark:text-white">
                                {ms.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-[var(--r-check,6px)] text-[11px] font-semibold ${
                                  (ms.approvedPct || 0) >= 100 || ms.isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : (ms.approvedPct || 0) > 0
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                              >
                                {ms.approvedPct ?? (ms.isCompleted ? 100 : 0)}%{' '}
                                {isAr ? 'معتمد' : isEn ? 'approved' : 'validé'}
                              </span>
                            </div>
                            <p className="t-cap text-black/60 dark:text-white/65 tabular-nums">
                              {t('pm_depth_milestone_val')}:{' '}
                              {formatProjectMoney(invoiceability.milestoneTotalDzd)} ·{' '}
                              {t('pm_depth_already_billed')}:{' '}
                              {formatMoney(invoiceability.alreadyInvoicedDzd, 'DZD')} ·{' '}
                              {t('pm_depth_remaining_billable')}:{' '}
                              {formatMoney(invoiceability.remainingBillableDzd, 'DZD')}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <label className="flex items-center gap-2 t-cap font-semibold">
                              <span>%</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                aria-label={`Approved percent for ${ms.title}`}
                                value={currentPct}
                                onChange={(e) =>
                                  setPartialDraftPctById((prev) => ({
                                    ...prev,
                                    [ms.id]: Math.max(0, Math.min(100, Number(e.target.value || 0))),
                                  }))
                                }
                                className="w-16 h-8 px-2 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--r-check,6px)] tabular-nums text-center"
                              />
                            </label>
                            <AtriumButton
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => approvePmMilestonePartial(ms.id, currentPct)}
                            >
                              {t('pm_depth_validate_partial_btn')}
                            </AtriumButton>
                            <AtriumButton
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={!invoiceability.eligible}
                              onClick={() => handleBillMilestone(ms)}
                            >
                              {t('pm_depth_bill_milestone_btn')}
                            </AtriumButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Unified Documents (6.1) Linked to Project / Milestones */}
            <div className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-5 bg-white dark:bg-[#22201E] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="t-label font-semibold text-black dark:text-white">
                    {t('pm_depth_unified_docs_title')} ({projectDocs.length})
                  </h3>
                </div>
                {projectDocs.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    tone="neutral"
                    icon={<FileText size={20} />}
                    title={t('pm_depth_no_docs_title')}
                    description={t('pm_depth_no_docs_desc')}
                  />
                ) : (
                  <div className="divide-y divide-[var(--atr-divider)]">
                    {projectDocs.map((doc) => {
                      const docCurrency = doc.currency || 'DZD';
                      const totalAmt = centimesToDzd(doc.netToPayCentimes);
                      const balanceAmt = centimesToDzd(doc.balanceDueCentimes);
                      return (
                        <div
                          key={doc.id}
                          className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="t-small font-semibold tabular-nums text-black dark:text-white">
                                {doc.docNumber || doc.draftNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-[var(--r-check,6px)] text-[11px] font-semibold bg-[#F3EDE7] dark:bg-[#2B2825] uppercase">
                                {doc.docType}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-[var(--r-check,6px)] text-[11px] font-semibold ${
                                  doc.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : doc.status === 'Draft'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                }`}
                              >
                                {doc.status}
                              </span>
                            </div>
                            <p className="t-cap text-black/60 dark:text-white/65 tabular-nums">
                              {doc.docDate} · {totalAmt.toLocaleString('fr-FR')} {docCurrency}
                              {docCurrency !== 'DZD'
                                ? ` (≈ ${formatMoney(Math.round(totalAmt * (doc.fxRate || 1)), 'DZD')})`
                                : ''}{' '}
                              · {isAr ? 'المتبقي:' : isEn ? 'Due:' : 'Reste :'}{' '}
                              {balanceAmt.toLocaleString('fr-FR')} {docCurrency}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {doc.status === 'Draft' && (
                              <AtriumButton
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => issueUnifiedDocument(doc.id)}
                              >
                                {isAr ? 'إصدار رسمي' : isEn ? 'Issue Official' : 'Émettre Officiel'}
                              </AtriumButton>
                            )}
                            <AtriumButton
                              type="button"
                              variant="outline"
                              size="sm"
                              icon={<Printer className="w-3.5 h-3.5" />}
                              onClick={() => setPrintDoc(doc)}
                            >
                              {isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer'}
                            </AtriumButton>
                            {doc.status !== 'Draft' &&
                              doc.docType === 'facture' &&
                              doc.balanceDueCentimes > 0 && (
                                <AtriumButton
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  icon={<CreditCard className="w-3.5 h-3.5" />}
                                  onClick={() => setPaymentDoc(doc)}
                                >
                                  {isAr ? 'تحصيل' : isEn ? 'Collect (6.2)' : 'Encaisser (6.2)'}
                                </AtriumButton>
                              )}
                            {doc.status !== 'Draft' && doc.docType === 'facture' && (
                              <AtriumButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  createCreditNoteForDocument(
                                    doc.id,
                                    'Ajustement facturation projet'
                                  )
                                }
                              >
                                {isAr ? 'إشعار دائن' : isEn ? 'Credit Note' : 'Avoir'}
                              </AtriumButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {projectPayments.length > 0 && (
              <UnifiedPaymentsLedgerPanel
                payments={projectPayments}
                title={t('pm_depth_payments_ledger_title')}
              />
            )}
          </div>
        ) : (
          /* Client Approval Portal with Revision Loop Limit */
          <div className="space-y-5">
            <div className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-5 bg-white dark:bg-[#22201E] flex flex-col sm:flex-row sm:items-end justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                    <h3 className="t-label font-semibold text-black dark:text-white">
                      {t('pm_depth_portal_heading')}
                    </h3>
                  </div>
                  <p className="t-cap text-black/60 dark:text-white/65">
                    {t('pm_depth_portal_desc')}
                  </p>
                </div>
                <div className="w-64">
                  <LabelInput
                    field="PortalReviewer"
                    label={t('pm_depth_portal_reviewer')}
                    value={portalReviewerName}
                    onChange={setPortalReviewerName}
                    height={38}
                    corner={10}
                  />
                </div>
              </div>
            </div>

            {projectDeliverables.length === 0 ? (
              <div className="sq-elev-card">
                <div data-sq="card" data-sq-border="none" className="p-8 bg-white dark:bg-[#22201E]">
                  <EmptyState
                    variant="compact"
                    tone="neutral"
                    icon={<FileText size={20} />}
                    title={t('pm_depth_portal_empty_title')}
                    description={t('pm_depth_portal_empty_desc')}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {projectDeliverables.map((bat) => {
                  const revCount = bat.revisionCount || 0;
                  const maxLoops = bat.maxRevisionLoops || activeProject.maxRevisionLoops || 3;
                  const atLimit = revCount >= maxLoops;
                  const history = portalReviews.filter((r) => r.deliverableId === bat.id);
                  const blockedMsg = portalErrorById[bat.id];

                  return (
                    <div key={bat.id} className="sq-elev-card">
                      <div
                        data-sq="card"
                        data-sq-border="none"
                        className="p-5 bg-white dark:bg-[#22201E] space-y-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="t-small font-semibold text-black dark:text-white">
                              {bat.title} ({bat.versionCode})
                            </h4>
                            <p className="t-cap text-black/55 dark:text-white/55">
                              {bat.deliverableKind || 'print_bat'} · {bat.fileFormat.toUpperCase()}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-[var(--r-check,6px)] t-cap font-semibold tabular-nums ${
                              atLimit
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-[#F3EDE7] dark:bg-[#2B2825] text-black/75 dark:text-white/80'
                            }`}
                          >
                            {t('pm_depth_revision_counter', {
                              count: String(revCount),
                              max: String(maxLoops),
                            })}
                          </span>
                        </div>

                        {bat.clientApprovedAt && (
                          <div className="p-3 bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] rounded-[var(--r-check,6px)] t-cap font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>
                              {t('pm_depth_portal_signed_off', {
                                name: bat.clientApprovedByName || activeProject.clientName,
                              })}
                            </span>
                          </div>
                        )}

                        {blockedMsg && (
                          <div className="p-3 bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] rounded-[var(--r-check,6px)] t-cap font-semibold flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>{blockedMsg}</span>
                          </div>
                        )}

                        <LabelTextarea
                          field={`PortalNote-${bat.id}`}
                          label={t('pm_depth_portal_comment_label')}
                          rows={2}
                          value={portalCommentsById[bat.id] || ''}
                          onChange={(val) =>
                            setPortalCommentsById((prev) => ({ ...prev, [bat.id]: val }))
                          }
                          placeholder={t('pm_depth_portal_comment_ph')}
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <AtriumButton
                            type="button"
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            onClick={() => handlePortalAction(bat, 'approved')}
                          >
                            {t('pm_depth_portal_approve_btn')}
                          </AtriumButton>
                          <AtriumButton
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={<AlertTriangle className="w-4 h-4" />}
                            onClick={() => handlePortalAction(bat, 'revision_requested')}
                          >
                            {t('pm_depth_portal_revision_btn')}
                          </AtriumButton>
                          {atLimit && (
                            <AtriumButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon={<RotateCcw className="w-3.5 h-3.5" />}
                              onClick={() => handlePortalAction(bat, 'override_granted')}
                            >
                              {t('pm_depth_portal_override_btn')}
                            </AtriumButton>
                          )}
                        </div>

                        {history.length > 0 && (
                          <div className="pt-3 border-t border-[var(--atr-divider)] space-y-1.5">
                            <span className="t-cap font-semibold text-black/55 dark:text-white/55 block">
                              {t('pm_depth_portal_history')}
                            </span>
                            {history.slice(0, 4).map((h) => (
                              <div
                                key={h.id}
                                className="t-cap flex items-center justify-between text-black/70 dark:text-white/75"
                              >
                                <span className="truncate">
                                  <strong>{h.reviewerName}</strong> · {h.decision}
                                  {h.comments ? ` — ${h.comments}` : ''}
                                </span>
                                <span className="tabular-nums opacity-70 shrink-0 ml-2">
                                  R{h.revisionRound}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <UnifiedInvoiceComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        prefill={composerPrefill}
        onSaved={(doc) => {
          if (
            composerPrefill?.sourceEntityType === 'pm_milestone' &&
            composerPrefill.sourceEntityId &&
            doc.docType === 'facture' &&
            doc.status !== 'Draft'
          ) {
            const invDzd = Math.round(
              centimesToDzd(doc.totalHtFinalCentimes) *
                normalizeFxRateToDzd(doc.currency, doc.fxRate)
            );
            const ms = milestones.find((m) => m.id === composerPrefill.sourceEntityId);
            if (ms) {
              approvePmMilestonePartial(ms.id, ms.approvedPct || 100, doc.id, invDzd);
            }
          }
          setComposerOpen(false);
        }}
      />

      <UnifiedInvoicePrintModal
        isOpen={Boolean(printDoc)}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />

      <UnifiedPaymentModal
        isOpen={Boolean(paymentDoc)}
        onClose={() => setPaymentDoc(null)}
        sourceVertical="project_milestone"
        partyId={paymentDoc?.partyId}
        partyName={paymentDoc?.partyName || activeProject.clientName}
        initialSelectedDocId={paymentDoc?.id}
        defaultAmountDzd={
          paymentDoc
            ? Math.round(
                centimesToDzd(paymentDoc.balanceDueCentimes) *
                  normalizeFxRateToDzd(paymentDoc.currency, paymentDoc.fxRate)
              )
            : 0
        }
      />
    </ScreenPod>
  );
};
