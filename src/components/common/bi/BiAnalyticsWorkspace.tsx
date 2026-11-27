import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Building2,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Minus,
  Plus,
  Printer,
  Sliders,
  Trash2,
} from 'lucide-react';
import {
  selectCurrentBiKpiDefinitionsFromState,
  selectCurrentBiReportSnapshotsFromState,
  selectCurrentBiSavedReportsFromState,
  selectCurrentBusinessFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import type {
  BiAgingBucketKey,
  BiDateRangePreset,
  BiReportSnapshot,
  BiReportType,
} from '../../../types/index';
import {
  buildBiReportCsv,
  buildBiReportPrintHtml,
  canDispatchScheduledReportNow,
  evaluateBiKpiRegistry,
  formatBiMetricDisplayValue,
} from '../../../utils/biKpiRegistry';
import { t } from '../../../utils/i18n';
import { centimesToDzd } from '../../../utils/money';

type BiSubTab = 'overview' | 'branches' | 'registry' | 'scheduled';

const PERIOD_PRESETS: Array<{ id: BiDateRangePreset; key: string }> = [
  { id: 'today', key: 'phase2_bi_period_today' },
  { id: '7d', key: 'phase2_bi_period_7d' },
  { id: '30d', key: 'phase2_bi_period_30d' },
  { id: '90d', key: 'phase2_bi_period_90d' },
  { id: 'ytd', key: 'phase2_bi_period_ytd' },
  { id: 'custom', key: 'phase2_bi_period_custom' },
];

const REPORT_TYPES: Array<{ id: BiReportType; labelEn: string; labelFr: string; labelAr: string }> = [
  { id: 'executive_overview', labelEn: 'Executive Overview', labelFr: 'Synthèse Direction', labelAr: 'ملخص الإدارة' },
  { id: 'receivables_aging', labelEn: 'Receivables Aging', labelFr: 'Balance Âgée', labelAr: 'أعمار الذمم' },
  { id: 'inventory_valuation', labelEn: 'Inventory Valuation', labelFr: 'Valorisation Stock', labelAr: 'تقييم المخزون' },
  { id: 'workforce_payroll', labelEn: 'Workforce & Payroll', labelFr: 'Masse Salariale', labelAr: 'الرواتب والموارد' },
  { id: 'branch_comparison', labelEn: 'Branch Comparison', labelFr: 'Comparatif Agences', labelAr: 'مقارنة الفروع' },
];

function triggerClientDownload(content: string, mimeType: string, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const BiAnalyticsWorkspace: React.FC = () => {
  const {
    accountId,
    currentBusiness,
    currentBusinessId,
    language,
    branches,
    biDefinitions,
    savedReports,
    snapshots,
    unifiedDocuments,
    unifiedPayments,
    sales,
    products,
    wmsStockLots,
    payrollRuns,
    purchaseDocs,
    pmExpenses,
    freelanceExpenses,
    scfJournalEntries,
    printTemplates,
  } = useAtriumSelector(
    (s) => ({
      accountId: s.account?.id || '',
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBusinessId: s.currentBusinessId,
      language: s.language,
      branches: s.branches || [],
      biDefinitions: selectCurrentBiKpiDefinitionsFromState(s),
      savedReports: selectCurrentBiSavedReportsFromState(s),
      snapshots: selectCurrentBiReportSnapshotsFromState(s),
      unifiedDocuments: s.unifiedDocuments || [],
      unifiedPayments: s.unifiedPayments || [],
      sales: s.sales || [],
      products: s.products || [],
      wmsStockLots: s.wmsStockLots || [],
      payrollRuns: s.staffPayrollRuns || [],
      purchaseDocs: s.purchaseDocs || [],
      pmExpenses: s.pmExpenses || [],
      freelanceExpenses: s.freelanceExpenses || [],
      scfJournalEntries: s.journalEntries || [],
      printTemplates: s.platformPrintTemplates || [],
    }),
    shallowEqualObjects
  );

  const {
    upsertBiKpiDefinition,
    saveBiReportConfig,
    deleteBiSavedReport,
    generateBiReportSnapshot,
  } = useAtriumActions();

  const [subTab, setSubTab] = useState<BiSubTab>('overview');
  const [preset, setPreset] = useState<BiDateRangePreset>('30d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(Date.now() - 29 * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Target drafts per KPI code in Registry tab
  const [targetDrafts, setTargetDrafts] = useState<Record<string, string>>({});

  // Scheduled report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState<BiReportType>('executive_overview');
  const [reportPreset, setReportPreset] = useState<BiDateRangePreset>('30d');
  const [reportCron, setReportCron] = useState('0 8 * * 1');
  const [reportRecipients, setReportRecipients] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const activeBranches = useMemo(
    () => (branches || []).filter((b) => b.businessId === currentBusinessId && b.isActive !== false),
    [branches, currentBusinessId]
  );

  const evaluated = useMemo(
    () =>
      evaluateBiKpiRegistry({
        accountId,
        businessId: currentBusinessId || '',
        branchIdFilter: branchFilter === 'all' ? undefined : branchFilter,
        branches,
        definitions: biDefinitions,
        unifiedDocuments,
        unifiedPayments,
        sales,
        products,
        wmsStockLots,
        payrollRuns,
        purchaseDocs,
        pmExpenses,
        freelanceExpenses,
        scfJournalEntries,
        preset,
        customStart,
        customEnd,
      }),
    [
      accountId,
      currentBusinessId,
      branchFilter,
      branches,
      biDefinitions,
      unifiedDocuments,
      unifiedPayments,
      sales,
      products,
      wmsStockLots,
      payrollRuns,
      purchaseDocs,
      pmExpenses,
      freelanceExpenses,
      scfJournalEntries,
      preset,
      customStart,
      customEnd,
    ]
  );

  const activePrintTemplate = useMemo(
    () =>
      (printTemplates || []).find(
        (tpl) =>
          tpl.businessId === currentBusinessId &&
          (tpl.docType === 'report' || tpl.docType === 'invoice') &&
          !tpl.deletedAt
      ),
    [printTemplates, currentBusinessId]
  );

  const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US';
  const agingBucketLabels: Record<BiAgingBucketKey, string> = {
    current: t('phase2_bi_aging_current', language),
    '1_30': t('phase2_bi_aging_1_30', language),
    '31_60': t('phase2_bi_aging_31_60', language),
    '61_90': t('phase2_bi_aging_61_90', language),
    '90_plus': t('phase2_bi_aging_90_plus', language),
  };

  const handleExportCsv = () => {
    const csv = buildBiReportCsv({
      title: `${currentBusiness?.name || 'Atrium'} BI Report`,
      bounds: evaluated.bounds,
      evaluations: evaluated.evaluations,
      agingBuckets: evaluated.agingBuckets,
      branchComparison: evaluated.branchComparison,
      language,
    });
    triggerClientDownload(csv, 'text/csv;charset=utf-8', `atrium-bi-${evaluated.bounds.periodEnd}.csv`);
    showToast({
      type: 'success',
      title: t('phase2_bi_export_csv', language),
      message: t('phase2_bi_csv_downloaded', language),
    });
  };

  const handleGenerateSnapshotAndA4 = (linkedReportId?: string, customTitle?: string) => {
    const snapshot = generateBiReportSnapshot({
      reportId: linkedReportId,
      title: customTitle,
      preset,
      customStart,
      customEnd,
      branchIdFilter: branchFilter === 'all' ? undefined : branchFilter,
    });
    const html = buildBiReportPrintHtml({
      businessName: currentBusiness?.name || 'Atrium ERP',
      reportTitle: snapshot.title,
      bounds: evaluated.bounds,
      evaluations: evaluated.evaluations,
      agingBuckets: evaluated.agingBuckets,
      branchComparison: evaluated.branchComparison,
      printTemplate: activePrintTemplate,
      language,
    });
    triggerClientDownload(html, 'text/html;charset=utf-8', `atrium-bi-a4-${snapshot.periodEnd}.html`);
    showToast({
      type: 'success',
      title: snapshot.title,
      message: t('phase2_bi_snapshot_saved', language),
    });
  };

  const handleDownloadSnapshotA4 = (snap: BiReportSnapshot) => {
    const html = buildBiReportPrintHtml({
      businessName: currentBusiness?.name || 'Atrium ERP',
      reportTitle: snap.title,
      bounds: {
        periodStart: snap.periodStart,
        periodEnd: snap.periodEnd,
        previousPeriodStart: snap.previousPeriodStart,
        previousPeriodEnd: snap.previousPeriodEnd,
        startMs: Date.parse(snap.periodStart),
        endMs: Date.parse(snap.periodEnd),
        prevStartMs: Date.parse(snap.previousPeriodStart),
        prevEndMs: Date.parse(snap.previousPeriodEnd),
      },
      evaluations: evaluated.evaluations.map((ev) => ({
        ...ev,
        currentValue: snap.metricsJson[ev.kpiCode] ?? ev.currentValue,
      })),
      agingBuckets: snap.agingBucketsJson.length > 0 ? snap.agingBucketsJson : evaluated.agingBuckets,
      branchComparison:
        snap.branchBreakdownJson.length > 0 ? snap.branchBreakdownJson : evaluated.branchComparison,
      printTemplate: activePrintTemplate,
      language,
    });
    triggerClientDownload(html, 'text/html;charset=utf-8', `atrium-bi-snapshot-${snap.id}.html`);
    showToast({
      type: 'success',
      title: snap.title,
      message: t('phase2_bi_a4_downloaded', language),
    });
  };

  const handleSaveTarget = (kpiCode: string, fallbackValue: number | null | undefined) => {
    const raw = targetDrafts[kpiCode];
    const parsed = raw !== undefined ? raw.trim() : fallbackValue != null ? String(fallbackValue) : '';
    const nextVal = parsed === '' ? null : Number(parsed);
    if (nextVal !== null && !Number.isFinite(nextVal)) return;
    upsertBiKpiDefinition({ kpiCode, targetValue: nextVal });
    showToast({
      type: 'success',
      title: kpiCode,
      message: t('phase2_bi_target_saved', language),
    });
  };

  const handleSaveScheduledReport = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = saveBiReportConfig({
      title: reportTitle,
      reportType,
      kpiCodes: evaluated.evaluations.map((k) => k.kpiCode),
      dateRangePreset: reportPreset,
      comparePreviousPeriod: true,
      branchId: branchFilter,
      scheduleCron: reportCron.trim() || null,
      scheduleRecipientsRaw: reportRecipients,
    });
    if (!res.ok) {
      const msg =
        res.errorCode === 'EMPTY_TITLE'
          ? t('phase2_bi_empty_title', language)
          : `${t('phase2_bi_invalid_email', language)} (${(res.invalidEmails || []).join(', ')})`;
      setFormError(msg);
      showToast({
        type: 'error',
        title: t('phase2_bi_save_report', language),
        message: msg,
      });
      return;
    }
    setReportTitle('');
    setReportRecipients('');
    showToast({
      type: 'success',
      title: res.report.title,
      message: t('phase2_bi_report_saved', language),
    });
  };

  const renderMetricLabel = (item: { labelEn: string; labelFr: string; labelAr: string }) =>
    language === 'ar' ? item.labelAr : language === 'fr' ? item.labelFr : item.labelEn;

  const subTabs: Array<{ id: BiSubTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: t('phase2_bi_tab_overview', language), icon: <BarChart2 size={15} /> },
    { id: 'branches', label: t('phase2_bi_tab_branches', language), icon: <Building2 size={15} /> },
    { id: 'registry', label: t('phase2_bi_tab_registry', language), icon: <Sliders size={15} /> },
    { id: 'scheduled', label: t('phase2_bi_tab_scheduled', language), icon: <Clock size={15} /> },
  ];

  return (
    <div
      className="flex flex-col gap-5 p-4 md:p-6 max-w-7xl mx-auto w-full text-[var(--text-primary,#191716)] dark:text-[#F5F2EE]"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header & Global Controls */}
      <div
        data-sq="panel"
        className="sq-elev-card rounded-3xl p-5 border border-[var(--border-subtle,rgba(0,0,0,0.08))] dark:border-white/10 bg-white/85 dark:bg-[#1E1C1A]/85 backdrop-blur-md"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              data-sq="tile"
              className="w-11 h-11 rounded-2xl bg-[var(--brand-accent,#D4522F)]/15 text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63] flex items-center justify-center shrink-0"
            >
              <BarChart2 size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {t('phase2_bi_title', language)}
              </h1>
              <p className="text-xs md:text-sm text-[var(--text-secondary,#6B635C)] dark:text-[#B5AEA6] mt-0.5">
                {t('phase2_bi_subtitle', language)}
              </p>
              <p className="text-[11px] font-medium text-[var(--text-secondary,#6B635C)] dark:text-[#9A9188] mt-1 tabular-nums">
                {evaluated.bounds.periodStart} → {evaluated.bounds.periodEnd} ({t('phase2_bi_vs_previous', language)}:{' '}
                {evaluated.bounds.previousPeriodStart} → {evaluated.bounds.previousPeriodEnd})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-sq="ctl"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.11] transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>{t('phase2_bi_export_csv', language)}</span>
            </button>
            <button
              type="button"
              data-sq="ctl"
              onClick={() => handleGenerateSnapshotAndA4()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-accent,#D4522F)] text-white hover:opacity-95 transition-opacity shadow-sm cursor-pointer"
            >
              <Printer size={15} />
              <span>{t('phase2_bi_generate_snapshot', language)}</span>
            </button>
          </div>
        </div>

        {/* Period & Branch Filters */}
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Calendar size={14} className="text-[var(--text-secondary,#6B635C)] me-1" />
            {PERIOD_PRESETS.map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-sq="ctl-sm"
                  aria-pressed={active}
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--brand-accent,#D4522F)] text-white'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                  }`}
                >
                  {t(p.key, language)}
                </button>
              );
            })}
            {preset === 'custom' && (
              <div className="flex items-center gap-1.5 ms-2">
                <input
                  type="date"
                  aria-label="Custom period start"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210]"
                />
                <span className="text-xs opacity-60">→</span>
                <input
                  type="date"
                  aria-label="Custom period end"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210]"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--text-secondary,#6B635C)]" />
            <select
              aria-label={t('phase2_bi_branch_col', language)}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-black/10 dark:border-white/15 bg-white dark:bg-[#141210]"
            >
              <option value="all">{t('phase2_bi_all_branches', language)}</option>
              {activeBranches.map((br) => (
                <option key={br.id} value={br.id}>
                  {br.name} ({br.code || 'BR'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="BI Workspace Views">
          {subTabs.map((st) => {
            const active = subTab === st.id;
            return (
              <button
                key={st.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-sq="ctl"
                onClick={() => setSubTab(st.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#191716] text-white dark:bg-[#F5F2EE] dark:text-[#191716] shadow-sm'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary,#6B635C)] dark:text-[#C5BEB6] hover:bg-black/[0.08]'
                }`}
              >
                {st.icon}
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab 1: Overview & Aging */}
      {subTab === 'overview' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluated.evaluations.map((ev) => {
              const positiveGood =
                ev.kpiCode !== 'receivables_outstanding' &&
                ev.kpiCode !== 'expiring_stock_risk' &&
                ev.kpiCode !== 'operating_expenses_scf';
              const isPositiveTrend = positiveGood ? ev.deltaValue >= 0 : ev.deltaValue <= 0;
              const targetDisplay =
                ev.targetValue != null
                  ? formatBiMetricDisplayValue(
                      { unitType: ev.unitType, currentValue: ev.targetValue },
                      language
                    )
                  : null;
              return (
                <div
                  key={ev.kpiCode}
                  data-sq="card"
                  className="sq-elev-card rounded-2xl p-4 border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#1E1C1A]/90 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary,#6B635C)] dark:text-[#A59D94]">
                        {ev.category}
                      </span>
                      <h3 className="text-sm font-bold mt-0.5">{renderMetricLabel(ev)}</h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold tabular-nums ${
                        ev.trend === 'flat'
                          ? 'bg-black/[0.06] dark:bg-white/10 text-[var(--text-secondary,#6B635C)]'
                          : isPositiveTrend
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {ev.trend === 'up' ? (
                        <ArrowUpRight size={12} />
                      ) : ev.trend === 'down' ? (
                        <ArrowDownRight size={12} />
                      ) : (
                        <Minus size={12} />
                      )}
                      {ev.deltaPercent >= 0 ? '+' : ''}
                      {ev.deltaPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="text-2xl font-extrabold tracking-tight tabular-nums">
                    {formatBiMetricDisplayValue(ev, language)}
                  </div>

                  <div className="text-[11px] text-[var(--text-secondary,#6B635C)] dark:text-[#A59D94] flex flex-col gap-1 pt-2 border-t border-black/5 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <span>{t('phase2_bi_vs_previous', language)}</span>
                      <span className="font-semibold tabular-nums">
                        {formatBiMetricDisplayValue(
                          { unitType: ev.unitType, currentValue: ev.previousValue },
                          language
                        )}
                      </span>
                    </div>
                    {targetDisplay && (
                      <div className="flex items-center justify-between">
                        <span>{t('phase2_bi_target_label', language)}</span>
                        <span className="font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63]">
                          {targetDisplay}
                        </span>
                      </div>
                    )}
                    <div className="truncate opacity-80" title={ev.formulaSpec}>
                      {ev.formulaSpec}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Receivables Aging Breakdown */}
          <div
            data-sq="panel"
            className="sq-elev-card rounded-2xl p-5 border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#1E1C1A]/90"
          >
            <h2 className="text-base font-bold mb-4">{t('phase2_bi_aging_title', language)}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {evaluated.agingBuckets.map((b) => (
                <div
                  key={b.bucket}
                  data-sq="card"
                  className="rounded-xl p-3.5 border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04]"
                >
                  <div className="text-xs font-semibold text-[var(--text-secondary,#6B635C)] dark:text-[#B5AEA6]">
                    {agingBucketLabels[b.bucket]}
                  </div>
                  <div className="text-lg font-extrabold mt-1 tabular-nums">
                    {centimesToDzd(b.amountCentimes).toLocaleString(locale)} DZD
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent,#D4522F)]"
                      style={{ width: `${Math.min(100, Math.max(0, b.sharePercent))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-75 tabular-nums">
                    <span>{b.docCount} docs</span>
                    <span>{b.sharePercent.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Branch Comparison */}
      {subTab === 'branches' && (
        <div
          data-sq="panel"
          className="sq-elev-card rounded-2xl p-5 border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#1E1C1A]/90 overflow-x-auto"
        >
          <h2 className="text-base font-bold mb-4">{t('phase2_bi_tab_branches', language)}</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-xs uppercase text-[var(--text-secondary,#6B635C)]">
                <th className="py-2.5 px-3 text-start">{t('phase2_bi_branch_col', language)}</th>
                <th className="py-2.5 px-3 text-end">{t('phase2_bi_revenue_col', language)}</th>
                <th className="py-2.5 px-3 text-end">{t('phase2_bi_collections_col', language)}</th>
                <th className="py-2.5 px-3 text-end">{t('phase2_bi_receivables_col', language)}</th>
                <th className="py-2.5 px-3 text-end">{t('phase2_bi_expenses_col', language)}</th>
                <th className="py-2.5 px-3 text-end">{t('phase2_bi_rate_col', language)}</th>
              </tr>
            </thead>
            <tbody>
              {evaluated.branchComparison.map((row) => (
                <tr
                  key={row.branchId}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <td className="py-3 px-3 font-semibold">
                    {row.branchName}{' '}
                    <span className="text-xs opacity-60 font-normal">({row.branchCode})</span>
                  </td>
                  <td className="py-3 px-3 text-end tabular-nums font-medium">
                    {centimesToDzd(row.revenueCentimes).toLocaleString(locale)} DZD
                  </td>
                  <td className="py-3 px-3 text-end tabular-nums text-emerald-700 dark:text-emerald-300 font-medium">
                    {centimesToDzd(row.collectionsCentimes).toLocaleString(locale)} DZD
                  </td>
                  <td className="py-3 px-3 text-end tabular-nums">
                    {centimesToDzd(row.receivablesCentimes).toLocaleString(locale)} DZD
                  </td>
                  <td className="py-3 px-3 text-end tabular-nums">
                    {centimesToDzd(row.expensesCentimes).toLocaleString(locale)} DZD
                  </td>
                  <td className="py-3 px-3 text-end tabular-nums font-bold">
                    {row.collectionRatePercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab 3: KPI Registry */}
      {subTab === 'registry' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {biDefinitions.map((def) => {
            const draftVal =
              targetDrafts[def.kpiCode] !== undefined
                ? targetDrafts[def.kpiCode]
                : def.targetValue != null
                ? String(def.targetValue)
                : '';
            return (
              <div
                key={def.kpiCode}
                data-sq="card"
                className="sq-elev-card rounded-2xl p-4 border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#1E1C1A]/90 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/10">
                      {def.kpiCode}
                    </code>
                    <h3 className="text-sm font-bold mt-1">{renderMetricLabel(def)}</h3>
                  </div>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/10">
                    {def.unitType}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary,#6B635C)] dark:text-[#B5AEA6]">
                  <span className="font-semibold">{t('phase2_bi_formula_label', language)}:</span>{' '}
                  {def.formulaSpec}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/10">
                  <label
                    htmlFor={`target-${def.kpiCode}`}
                    className="text-xs font-semibold whitespace-nowrap"
                  >
                    {t('phase2_bi_target_label', language)}:
                  </label>
                  <input
                    id={`target-${def.kpiCode}`}
                    type="number"
                    value={draftVal}
                    onChange={(e) =>
                      setTargetDrafts((prev) => ({ ...prev, [def.kpiCode]: e.target.value }))
                    }
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl text-xs border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210] tabular-nums"
                  />
                  <button
                    type="button"
                    data-sq="ctl-sm"
                    onClick={() => handleSaveTarget(def.kpiCode, def.targetValue)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--brand-accent,#D4522F)] text-white hover:opacity-95 cursor-pointer"
                  >
                    {t('phase2_bi_save_target', language)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-tab 4: Scheduled Reports & Immutable Snapshots */}
      {subTab === 'scheduled' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Builder + Saved Reports */}
          <div
            data-sq="panel"
            className="sq-elev-card rounded-2xl p-5 border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#1E1C1A]/90 flex flex-col gap-4"
          >
            <h2 className="text-base font-bold">{t('phase2_bi_saved_reports_heading', language)}</h2>
            <form onSubmit={handleSaveScheduledReport} className="flex flex-col gap-3">
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder={t('phase2_bi_report_title_ph', language)}
                aria-label={t('phase2_bi_report_title_ph', language)}
                className="w-full px-3 py-2 rounded-xl text-xs border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Report Type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as BiReportType)}
                  className="px-3 py-2 rounded-xl text-xs border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210]"
                >
                  {REPORT_TYPES.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {renderMetricLabel(rt)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Schedule Preset"
                  value={reportPreset}
                  onChange={(e) => setReportPreset(e.target.value as BiDateRangePreset)}
                  className="px-3 py-2 rounded-xl text-xs border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210]"
                >
                  {PERIOD_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
                    <option key={p.id} value={p.id}>
                      {t(p.key, language)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={reportCron}
                  onChange={(e) => setReportCron(e.target.value)}
                  placeholder="0 8 * * 1"
                  aria-label="Cron Schedule"
                  className="px-3 py-2 rounded-xl text-xs font-mono border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210]"
                />
                <input
                  type="text"
                  value={reportRecipients}
                  onChange={(e) => setReportRecipients(e.target.value)}
                  placeholder={t('phase2_bi_recipients_ph', language)}
                  aria-label={t('phase2_bi_recipients_ph', language)}
                  className="px-3 py-2 rounded-xl text-xs border border-black/15 dark:border-white/15 bg-white dark:bg-[#141210]"
                />
              </div>
              {formError && (
                <div className="text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                  {formError}
                </div>
              )}
              <button
                type="submit"
                data-sq="ctl"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-accent,#D4522F)] text-white hover:opacity-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>{t('phase2_bi_save_report', language)}</span>
              </button>
            </form>

            <div className="flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/10">
              {savedReports.length === 0 ? (
                <p className="text-xs opacity-70">{t('phase2_bi_no_reports', language)}</p>
              ) : (
                savedReports.map((rep) => {
                  const ready = canDispatchScheduledReportNow(rep);
                  return (
                    <div
                      key={rep.id}
                      data-sq="card"
                      className="rounded-xl p-3 border border-black/[0.07] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{rep.title}</div>
                        <div className="text-[11px] opacity-75 truncate">
                          {rep.dateRangePreset.toUpperCase()} · {rep.scheduleCron || 'manual'} ·{' '}
                          {rep.scheduleRecipients.join(', ') || 'internal'}
                        </div>
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            ready
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {ready
                            ? t('phase2_bi_cooldown_ready', language)
                            : t('phase2_bi_cooldown_recent', language)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          data-sq="ctl-sm"
                          onClick={() => handleGenerateSnapshotAndA4(rep.id, rep.title)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#191716] text-white dark:bg-white dark:text-[#191716] cursor-pointer"
                        >
                          {t('phase2_bi_run_now', language)}
                        </button>
                        <button
                          type="button"
                          aria-label={`${t('phase2_bi_delete', language)} ${rep.title}`}
                          data-sq="ctl-sm"
                          onClick={() => deleteBiSavedReport(rep.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Immutable Snapshot History */}
          <div
            data-sq="panel"
            className="sq-elev-card rounded-2xl p-5 border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#1E1C1A]/90 flex flex-col gap-3"
          >
            <h2 className="text-base font-bold">{t('phase2_bi_snapshots_heading', language)}</h2>
            {snapshots.length === 0 ? (
              <p className="text-xs opacity-75">{t('phase2_bi_no_snapshots', language)}</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    data-sq="card"
                    className="rounded-xl p-3.5 border border-black/[0.07] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                        <FileText size={13} className="text-[var(--brand-accent,#D4522F)] shrink-0" />
                        <span className="truncate">{snap.title}</span>
                      </div>
                      <div className="text-[11px] opacity-75 mt-0.5 tabular-nums">
                        {snap.periodStart} → {snap.periodEnd} ·{' '}
                        {centimesToDzd(snap.metricsJson.gross_invoiced_revenue || 0).toLocaleString(locale)} DZD
                      </div>
                    </div>
                    <button
                      type="button"
                      data-sq="ctl-sm"
                      onClick={() => handleDownloadSnapshotA4(snap)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/[0.06] dark:bg-white/10 hover:bg-black/10 shrink-0 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>{t('phase2_bi_download_a4', language)}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
