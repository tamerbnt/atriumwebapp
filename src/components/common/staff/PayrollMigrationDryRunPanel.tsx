import React, { useMemo, useState, useCallback } from 'react';
import {
  ShieldAlert,
  FileSearch,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  KeyRound,
  GitCompare,
  Layers,
  Landmark,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentStaffFromState,
  showToast,
} from '../../../services/store';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import {
  analyzePayrollMigrationDryRun,
  exportPayrollDryRunCsv,
  exportPayrollDryRunJson,
  readPayrollMigrationCompletion,
  type PayrollDryRunReport,
  type PayrollMigrationCompletionMarker,
} from '../../../utils/payrollMigrationDryRun';
import { Button } from '@/atrium/core';

interface PayrollMigrationDryRunPanelProps {
  language: string;
  className?: string;
}

type DiagnosticTab = 'mappings' | 'diffs' | 'collisions' | 'accounts';

export const PayrollMigrationDryRunPanel: React.FC<PayrollMigrationDryRunPanelProps> = ({
  language,
  className = '',
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { canViewSensitivePayroll, executePayrollMigrationBackfill } = useAtriumActions();
  const isAuthorized = canViewSensitivePayroll();
  const supabaseReady = isSupabaseConfigured();

  const {
    currentBusinessId,
    currentBranchId,
    staffList,
    attendanceLogs,
    salaryAdvances,
    payrollRuns,
    payrollSlips,
  } = useAtriumSelector(
    (s) => ({
      currentBusinessId: s.currentBusinessId || '',
      currentBranchId: s.currentBranchId || '',
      staffList: selectCurrentStaffFromState(s),
      attendanceLogs: s.staffAttendanceLogs || [],
      salaryAdvances: s.staffSalaryAdvances || [],
      payrollRuns: s.staffPayrollRuns || [],
      payrollSlips: s.staffPayrollSlips || [],
    }),
    shallowEqualObjects
  );

  const [refreshNonce, setRefreshNonce] = useState(0);
  const [activeTab, setActiveTab] = useState<DiagnosticTab>('mappings');
  const [isBackfilling, setIsBackfilling] = useState(false);

  const completionMarker: PayrollMigrationCompletionMarker | null = useMemo(() => {
    void refreshNonce;
    return readPayrollMigrationCompletion();
  }, [refreshNonce]);

  const report: PayrollDryRunReport | null = useMemo(() => {
    if (!isAuthorized) return null;
    void refreshNonce;
    return analyzePayrollMigrationDryRun({
      businessId: currentBusinessId,
      branchId: currentBranchId,
      staffList,
      attendanceLogs,
      salaryAdvances,
      payrollRuns,
      payrollSlips,
    });
  }, [
    isAuthorized,
    refreshNonce,
    currentBusinessId,
    currentBranchId,
    staffList,
    attendanceLogs,
    salaryAdvances,
    payrollRuns,
    payrollSlips,
  ]);

  const handleRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
    showToast({
      type: 'info',
      title: isAr
        ? 'تم تحديث الفحص التجريبي'
        : isEn
        ? 'Dry-Run Refreshed'
        : 'Inspection à vide actualisée',
      message: isAr
        ? '0 عمليات كتابة في قاعدة البيانات (معاينة للقراءة فقط).'
        : isEn
        ? '0 database writes executed (read-only preview).'
        : '0 écriture exécutée en base de données (lecture seule).',
    });
  }, [isAr, isEn]);

  const handleRunBackfill = useCallback(async () => {
    if (isBackfilling) return;
    setIsBackfilling(true);
    try {
      await executePayrollMigrationBackfill(false);
      setRefreshNonce((n) => n + 1);
    } finally {
      setIsBackfilling(false);
    }
  }, [executePayrollMigrationBackfill, isBackfilling]);

  const triggerDownload = useCallback((content: string, filename: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast({
        type: 'error',
        title: 'Export failed',
        message: 'Unable to generate dry-run export file.',
      });
    }
  }, []);

  const handleExportJson = useCallback(() => {
    if (!report) return;
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(
      exportPayrollDryRunJson(report),
      `atrium-payroll-dry-run-${stamp}.json`,
      'application/json;charset=utf-8'
    );
  }, [report, triggerDownload]);

  const handleExportCsv = useCallback(() => {
    if (!report) return;
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(
      exportPayrollDryRunCsv(report),
      `atrium-payroll-dry-run-${stamp}.csv`,
      'text/csv;charset=utf-8'
    );
  }, [report, triggerDownload]);

  if (!isAuthorized || !report) {
    return null;
  }

  const totalLegacyRecords = report.entitySummaries.reduce(
    (sum, item) => sum + item.legacyTotalCount,
    0
  );
  const totalNewToRemote = report.entitySummaries.reduce(
    (sum, item) => sum + item.newToRemoteCount,
    0
  );

  const entityLabel = (kind: string) => {
    if (kind === 'attendance') return isAr ? 'سجلات الحضور' : isEn ? 'Attendance Logs' : 'Pointages';
    if (kind === 'advance') return isAr ? 'السلفيات' : isEn ? 'Salary Advances' : 'Acomptes';
    if (kind === 'payroll_run') return isAr ? 'دفعات الرواتب' : isEn ? 'Payroll Runs' : 'Cycles de Paie';
    return isAr ? 'كشوف الرواتب' : isEn ? 'Payslips' : 'Bulletins de Paie';
  };

  return (
    <section
      data-testid="step7a-payroll-dry-run-panel"
      dir={isAr ? 'rtl' : 'ltr'}
      className={`rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#22201E] p-5 space-y-5 ${className}`}
    >
      {/* Header & Read-Only Guardrail Banner */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSearch size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
            <h3 className="t-card font-semibold text-black dark:text-white">
              {isAr
                ? 'فحص وترحيل بيانات الرواتب السحابي (7أ / 7ب)'
                : isEn
                ? 'Payroll Migration Inspector & Backfill (Step 7a / 7b)'
                : 'Inspecteur & Reprise Paie Cloud (Étapes 7a / 7b)'}
            </h3>
          </div>
          <p className="t-cap text-black/65 dark:text-white/65">
            {isAr
              ? 'فحص بيانات localStorage وتنفيذ ترحيل إدراج فقط (بدون حذف النسخة المحلية الاحتياطية).'
              : isEn
              ? 'Read-only diagnostic and one-time insert-only DB backfill (legacy localStorage keys preserved as read-only backup).'
              : 'Diagnostic en lecture seule et reprise unique par insertion uniquement (caches localStorage conservés en sauvegarde).'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            tone="soft"
            size={36}
            leading={<RefreshCw size={14} />}
            onClick={handleRefresh}
          >
            {isAr ? 'تحديث الفحص' : isEn ? 'Re-scan' : 'Réanalyser'}
          </Button>
          <Button
            type="button"
            tone="soft"
            size={36}
            leading={<Download size={14} />}
            onClick={handleExportCsv}
          >
            CSV
          </Button>
          <Button
            type="button"
            tone="soft"
            size={36}
            leading={<Download size={14} />}
            onClick={handleExportJson}
          >
            JSON
          </Button>
          <Button
            type="button"
            data-testid="step7b-execute-backfill-btn"
            tone="accent"
            size={36}
            leading={<Database size={14} />}
            disabled={!supabaseReady || isBackfilling || Boolean(completionMarker)}
            onClick={() => void handleRunBackfill()}
          >
            {completionMarker
              ? isAr ? 'اكتمل الترحيل' : isEn ? 'Backfill Completed' : 'Reprise Effectuée'
              : isBackfilling
              ? isAr ? 'جاري الترحيل...' : isEn ? 'Backfilling...' : 'Reprise en cours...'
              : isAr ? 'ترحيل إدراج فقط' : isEn ? 'Run Insert-Only DB Backfill' : 'Exécuter Reprise Base'}
          </Button>
        </div>
      </div>

      {/* Backfill Completion / Execution Status + Statutory Basis Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="step7b-backfill-section">
        {completionMarker ? (
          <div className="rounded-xl border border-emerald-300/70 dark:border-emerald-800/70 bg-emerald-50/75 dark:bg-emerald-950/30 p-3.5 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <div className="t-small font-semibold text-emerald-900 dark:text-emerald-200">
                Step 7b backfill completed ({completionMarker.completedAt.slice(0, 10)})
              </div>
              <div className="t-cap text-emerald-800/85 dark:text-emerald-300/85 tabular-nums">
                Inserted: {completionMarker.runsInserted} runs · {completionMarker.slipsInserted} slips · {completionMarker.advancesInserted} advances · {completionMarker.attendanceInserted} punches · {completionMarker.skippedCollisions.length} collisions skipped · Legacy localStorage backup preserved
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-300/70 dark:border-amber-800/70 bg-amber-50/75 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5">
            <ShieldAlert size={16} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <div className="t-small font-semibold text-amber-900 dark:text-amber-200">
                {supabaseReady
                  ? isAr
                    ? 'جاهز لتنفيذ الترحيل لمرة واحدة (إدراج فقط)'
                    : isEn
                    ? 'Ready for one-time insert-only DB backfill (Step 7b)'
                    : 'Prêt pour reprise unique en base (Étape 7b — insertion seule)'
                  : isAr
                  ? 'السحابة غير مفعلة — فحص محلي للقراءة فقط'
                  : isEn
                  ? 'Cloud sync not configured — local read-only inspection'
                  : 'Sync cloud inactive — inspection locale en lecture seule'}
              </div>
              <div className="t-cap text-amber-800/85 dark:text-amber-300/85 tabular-nums">
                {report.dbWritesExecuted} dry-run writes · Existing DB rows never overwritten · localStorage preserved for 1 release
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FAF6F1] dark:bg-[#191716] p-3.5 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-black/65 dark:text-white/70 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <div className="t-small font-semibold text-black dark:text-white">
              {report.statutoryBasisBadge}
            </div>
            <div className="t-cap text-black/62 dark:text-white/65 tabular-nums">
              Scanned {report.scannedKeys.length} keys · {totalLegacyRecords} cached · {totalNewToRemote} new
            </div>
          </div>
        </div>
      </div>

      {/* Scanned localStorage Keys & Entity Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FBF8F5] dark:bg-[#191716] p-4 space-y-2.5">
          <div className="flex items-center gap-2 t-small font-semibold text-black dark:text-white">
            <Database size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span>{isAr ? 'مفاتيح localStorage المفحوصة' : isEn ? 'Scanned localStorage Keys' : 'Clés localStorage analysées'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse t-cap">
              <thead>
                <tr className="border-b border-black/[0.07] dark:border-white/[0.07] text-black/55 dark:text-white/55">
                  <th className="py-1.5 font-semibold text-start">Key</th>
                  <th className="py-1.5 font-semibold text-start">State</th>
                  <th className="py-1.5 font-semibold text-end">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {report.scannedKeys.map((sk) => (
                  <tr key={sk.key}>
                    <td className="py-1.5 font-mono text-[11px] text-black dark:text-white">{sk.key}</td>
                    <td className="py-1.5 text-black/70 dark:text-white/75">
                      {sk.present ? (isEn ? 'Present' : isAr ? 'موجود' : 'Présent') : isEn ? 'Absent' : isAr ? 'غائب' : 'Absent'}
                    </td>
                    <td className="py-1.5 text-end tabular-nums font-semibold text-black dark:text-white">
                      {sk.recordCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FBF8F5] dark:bg-[#191716] p-4 space-y-2.5">
          <div className="flex items-center gap-2 t-small font-semibold text-black dark:text-white">
            <Layers size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span>{isAr ? 'ملخص الكيانات والفروقات' : isEn ? 'Entity Migration Breakdown' : 'Synthèse par Entité'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse t-cap">
              <thead>
                <tr className="border-b border-black/[0.07] dark:border-white/[0.07] text-black/55 dark:text-white/55">
                  <th className="py-1.5 font-semibold text-start">Entity</th>
                  <th className="py-1.5 font-semibold text-end">Cached</th>
                  <th className="py-1.5 font-semibold text-end">New</th>
                  <th className="py-1.5 font-semibold text-end">Diffs</th>
                  <th className="py-1.5 font-semibold text-end">Remote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {report.entitySummaries.map((sum) => (
                  <tr key={sum.entityKind}>
                    <td className="py-1.5 font-medium text-black dark:text-white">{entityLabel(sum.entityKind)}</td>
                    <td className="py-1.5 text-end tabular-nums text-black dark:text-white">{sum.legacyTotalCount}</td>
                    <td className="py-1.5 text-end tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {sum.newToRemoteCount}
                    </td>
                    <td className="py-1.5 text-end tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                      {sum.fieldDiffCount}
                    </td>
                    <td className="py-1.5 text-end tabular-nums text-black/75 dark:text-white/75">
                      {sum.remoteTotalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Diagnostic Tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap border-b border-black/[0.07] dark:border-white/[0.07] pb-2">
          {[
            {
              id: 'mappings' as const,
              label: isEn ? `UUID Mappings (${report.uuidMappings.length})` : isAr ? `تعيين UUID (${report.uuidMappings.length})` : `Mappings UUID (${report.uuidMappings.length})`,
              icon: <KeyRound size={13} />,
            },
            {
              id: 'diffs' as const,
              label: isEn ? `Field Diffs (${report.fieldDiffs.length})` : isAr ? `اختلافات الحقول (${report.fieldDiffs.length})` : `Écarts Champs (${report.fieldDiffs.length})`,
              icon: <GitCompare size={13} />,
            },
            {
              id: 'collisions' as const,
              label: isEn ? `Period Collisions (${report.periodCollisions.length})` : isAr ? `تعارضات الفترات (${report.periodCollisions.length})` : `Doublons Période (${report.periodCollisions.length})`,
              icon: <AlertTriangle size={13} />,
            },
            {
              id: 'accounts' as const,
              label: isEn ? `CCP / RIB Warnings (${report.missingAccountWarnings.length})` : isAr ? `نواقص CCP/RIB (${report.missingAccountWarnings.length})` : `CCP / RIB Manquants (${report.missingAccountWarnings.length})`,
              icon: <Landmark size={13} />,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-8 px-3 rounded-lg t-small font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1F1D1B] text-white dark:bg-white dark:text-[#191716]'
                    : 'bg-[#F3EDE7] dark:bg-[#2B2825] text-black/75 dark:text-white/80 hover:bg-[#EAE3DC] dark:hover:bg-[#332F2B]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'mappings' && (
          <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-3.5">
            {report.uuidMappings.length === 0 ? (
              <div className="flex items-center gap-2 t-cap text-black/62 dark:text-white/65 py-2">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'No legacy localStorage payroll IDs detected in this tenant scope.' : 'Aucun identifiant hérité détecté dans le cache local pour cette entreprise.'}</span>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-start border-collapse t-cap">
                  <thead>
                    <tr className="border-b border-black/[0.07] dark:border-white/[0.07] text-black/55 dark:text-white/55">
                      <th className="py-1.5 font-semibold text-start">Entity</th>
                      <th className="py-1.5 font-semibold text-start">Legacy ID</th>
                      <th className="py-1.5 font-semibold text-start">Target UUID</th>
                      <th className="py-1.5 font-semibold text-start">Label</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                    {report.uuidMappings.map((m) => (
                      <tr key={`${m.entityKind}-${m.legacyId}`}>
                        <td className="py-1.5 text-black/75 dark:text-white/80">{entityLabel(m.entityKind)}</td>
                        <td className="py-1.5 font-mono text-[11px] text-black dark:text-white">{m.legacyId}</td>
                        <td className="py-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">{m.mappedUuid}</td>
                        <td className="py-1.5 text-black/75 dark:text-white/80">{m.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diffs' && (
          <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-3.5">
            {report.fieldDiffs.length === 0 ? (
              <div className="flex items-center gap-2 t-cap text-black/62 dark:text-white/65 py-2">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'No field drift detected between cached IDs and remote store.' : 'Aucune divergence de champs détectée entre cache et base.'}</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {report.fieldDiffs.map((diff) => (
                  <div
                    key={`${diff.entityKind}-${diff.mappedUuid}`}
                    className="rounded-lg bg-[#FAF6F1] dark:bg-[#191716] p-3 t-cap space-y-1"
                  >
                    <div className="font-semibold text-black dark:text-white">
                      {entityLabel(diff.entityKind)} · {diff.label}
                    </div>
                    {diff.differences.map((d) => (
                      <div key={d.field} className="text-black/70 dark:text-white/75 tabular-nums">
                        <span className="font-mono text-[11px]">{d.field}</span>: local{' '}
                        <strong className="text-amber-700 dark:text-amber-400">{String(d.localValue)}</strong> vs remote{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">{String(d.remoteValue)}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'collisions' && (
          <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-3.5">
            {report.periodCollisions.length === 0 ? (
              <div className="flex items-center gap-2 t-cap text-black/62 dark:text-white/65 py-2">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'Zero duplicate payroll period collisions detected.' : 'Aucun doublon de période de paie détecté.'}</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {report.periodCollisions.map((col) => (
                  <div
                    key={col.collisionKey}
                    className="rounded-lg border border-rose-300/70 dark:border-rose-800/70 bg-rose-50/70 dark:bg-rose-950/30 p-3 t-cap space-y-1"
                  >
                    <div className="font-semibold text-rose-900 dark:text-rose-200 tabular-nums">
                      {col.periodMonth}/{col.periodYear} ({col.runType} #{col.adjustmentSeq})
                    </div>
                    <div className="text-rose-800/85 dark:text-rose-300/85">
                      {col.sources.map((s) => `${s.source}: ${s.runId} (${s.status})`).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-3.5">
            {report.missingAccountWarnings.length === 0 ? (
              <div className="flex items-center gap-2 t-cap text-black/62 dark:text-white/65 py-2">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? 'All CCP and bank transfer staff/slips have disbursement coordinates.' : 'Tous les dossiers CCP et virements possèdent leurs coordonnées.'}</span>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-start border-collapse t-cap">
                  <thead>
                    <tr className="border-b border-black/[0.07] dark:border-white/[0.07] text-black/55 dark:text-white/55">
                      <th className="py-1.5 font-semibold text-start">Source</th>
                      <th className="py-1.5 font-semibold text-start">Staff</th>
                      <th className="py-1.5 font-semibold text-start">Method</th>
                      <th className="py-1.5 font-semibold text-start">Missing Fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                    {report.missingAccountWarnings.map((w) => (
                      <tr key={`${w.source}-${w.entityId}`}>
                        <td className="py-1.5 text-black/75 dark:text-white/80">{w.source}</td>
                        <td className="py-1.5 font-medium text-black dark:text-white">{w.staffName}</td>
                        <td className="py-1.5 uppercase text-black/70 dark:text-white/75">{w.paymentMethod}</td>
                        <td className="py-1.5 font-mono text-[11px] text-rose-700 dark:text-rose-400">
                          {w.missingFields.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
