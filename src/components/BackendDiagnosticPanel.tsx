import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Eye,
  Server,
  Copy,
  Check,
  X,
  Download,
  FileCheck2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../services/store';
import {
  runFullBackendDiagnostics,
  DiagnosticProbeResult,
  DiagnosticSummary,
} from '../services/diagnosticRunner';
import { Modal } from './ui/Modal';

interface BackendDiagnosticPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendDiagnosticPanel: React.FC<BackendDiagnosticPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const store = useAtriumStore();
  const {
    account,
    currentBusinessId,
    currentBranchId,
    currentUser,
    staff,
    language,
    currentBusiness,
  } = store;

  const [isRunning, setIsRunning] = useState(false);
  const [probes, setProbes] = useState<DiagnosticProbeResult[]>([]);
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<DiagnosticProbeResult | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'passed' | 'attention'>('all');

  const executeAudit = async () => {
    setIsRunning(true);
    try {
      const result = await runFullBackendDiagnostics({
        account,
        currentBusinessId,
        currentBranchId,
        currentUser,
        staff,
      });
      setProbes(result.probes);
      setSummary(result.summary);
      showToast({
        type: result.summary.overallStatus === 'passed' ? 'success' : 'warning',
        title: language === 'ar' ? 'اكتمل فحص الخادم' : language === 'fr' ? 'Audit backend terminé' : 'Backend Audit Complete',
        message:
          language === 'ar'
            ? `تم فحص ${result.summary.passedCount}/${result.summary.totalProbes} عملية بنجاح بنسبة امتثال ${result.summary.traceabilityCompliancePercent}%`
            : language === 'fr'
            ? `${result.summary.passedCount}/${result.summary.totalProbes} sondes validées avec ${result.summary.traceabilityCompliancePercent}% de conformité`
            : `${result.summary.passedCount}/${result.summary.totalProbes} CRUD probes passed with ${result.summary.traceabilityCompliancePercent}% compliance`,
      });
    } catch (err) {
      console.error('[diagnosticPanel] Audit run failed:', err);
      showToast({
        type: 'error',
        title: language === 'ar' ? 'فشل الفحص' : language === 'fr' ? 'Échec de l\'audit' : 'Audit Failed',
        message: String(err),
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run once upon first opening if no results exist
  useEffect(() => {
    if (isOpen && probes.length === 0 && !isRunning) {
      executeAudit();
    }
  }, [isOpen]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleExportAuditReport = () => {
    try {
      const report = {
        title: 'Atrium ERP & CRM Backend Readiness & CRUD Audit Report',
        generatedAt: new Date().toISOString(),
        business: {
          id: currentBusinessId,
          name: currentBusiness?.name,
          category: currentBusiness?.category,
        },
        operator: {
          id: currentUser?.id,
          name: currentUser?.fullName,
          role: currentUser?.role,
        },
        environment: {
          runtime: 'Node.js 22 (Web Browser Client Engine)',
          supabaseActive: summary?.cloudConnected || false,
          persistenceLayer: summary?.cloudConnected
            ? 'Supabase Cloud (PostgreSQL)'
            : 'Atrium Local Reactive Store (In-Memory + Storage)',
        },
        summary,
        probes,
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `atrium_backend_audit_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        title: language === 'ar' ? 'تم تنزيل التقرير' : language === 'fr' ? 'Rapport téléchargé' : 'Report Exported',
        message: language === 'ar' ? 'تم حفظ تقرير تدقيق الجاهزية بنجاح' : language === 'fr' ? 'Rapport d\'audit exporté au format JSON' : 'Readiness audit report exported to JSON',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: language === 'ar' ? 'فشل التصدير' : language === 'fr' ? 'Échec export' : 'Export Failed',
        message: err?.message || 'Could not export audit file',
      });
    }
  };

  const filteredProbes = probes.filter((probe) => {
    if (filterMode === 'passed') return probe.status === 'passed';
    if (filterMode === 'attention') return probe.status !== 'passed';
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        language === 'ar'
          ? 'مركز تشخيص وفحص جاهزية الخادم وقاعدة البيانات'
          : language === 'fr'
          ? 'Console de Diagnostic & Validation CRUD Backend'
          : 'Backend Production Readiness & CRUD Diagnostics'
      }
      maxWidth="xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Top Summary Banner */}
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <Server size={14} className="text-neutral-700 dark:text-neutral-300" />
                <span>
                  {summary?.cloudConnected
                    ? (language === 'ar' ? 'سوبابيس PostgreSQL (سحابة الإنتاج نشطة)' : language === 'fr' ? 'PostgreSQL Supabase (Cloud de Production)' : 'PostgreSQL Supabase (Production Cloud Active)')
                    : (language === 'ar' ? 'محرك Atrium التفاعلي (الوضع المحلي الآمن)' : language === 'fr' ? 'Moteur Réactif Atrium (Mode Local Résilient)' : 'Atrium Reactive Store (Offline Resilient Mode)')}
                </span>
                <span>·</span>
                <span>{language === 'ar' ? '7 أنشطة تجارية متكاملة' : language === 'fr' ? '7 métiers couverts' : '7 Verticals Covered'}</span>
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                {summary
                  ? summary.overallStatus === 'passed'
                    ? (language === 'ar' ? 'جاهز للإنتاج · جميع عمليات CRUD تعمل بنجاح' : language === 'fr' ? 'Prêt pour la production · Toutes les sondes CRUD sont validées' : 'Backend Ready · All CRUD Probes Operational')
                    : (language === 'ar' ? 'اكتمل الفحص · تنبيهات بحاجة للمراجعة' : language === 'fr' ? 'Audit complété · Nécessite attention' : 'Backend Audit Completed · Needs Attention')
                  : (language === 'ar' ? 'جاهز لتشغيل فحص الجاهزية المباشر' : language === 'fr' ? 'Prêt à lancer l\'audit backend' : 'Ready to Run Live Backend Audit')}
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                {language === 'ar'
                  ? 'يتحقق من دورة العمليات الكاملة (إنشاء، قراءة، تعديل، حذف) مع التتبع الرباعي الصارم دون تلويث بيانات الإنتاج.'
                  : language === 'fr'
                  ? 'Vérifie les opérations non destructives de création, lecture, mise à jour et suppression ainsi que la traçabilité quadruple.'
                  : 'Verifies non-destructive Create, Read, Update, and Delete operations along with Quadruple Traceability.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportAuditReport}
                disabled={!summary}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                title={language === 'ar' ? 'تصدير تقرير التدقيق JSON' : language === 'fr' ? 'Exporter rapport d\'audit' : 'Export audit report'}
              >
                <Download size={13} className="text-[#C4785A]" />
                <span>{language === 'ar' ? 'تصدير التقرير' : language === 'fr' ? 'Exporter' : 'Export Report'}</span>
              </button>

              <button
                type="button"
                onClick={executeAudit}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer"
              >
                <RotateCw size={14} className={isRunning ? 'animate-spin' : ''} />
                <span>
                  {isRunning
                    ? (language === 'ar' ? 'جارٍ تدقيق العمليات...' : language === 'fr' ? 'Audit en cours...' : 'Auditing CRUD Operations...')
                    : (language === 'ar' ? 'تشغيل الفحص المباشر' : language === 'fr' ? 'Lancer l\'audit' : 'Run Live Audit')}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {language === 'ar' ? 'العمليات الناجحة' : language === 'fr' ? 'Sondes CRUD validées' : 'CRUD Probes Passed'}
                </span>
                <span className="text-base font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
                  {summary.passedCount} / {summary.totalProbes}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {language === 'ar' ? 'نسبة الامتثال للتتبع' : language === 'fr' ? 'Conformité traçabilité' : 'Traceability Compliance'}
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {summary.traceabilityCompliancePercent}%
                </span>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {language === 'ar' ? 'متوسط سرعة الاستجابة' : language === 'fr' ? 'Latence moyenne' : 'Average Probe Latency'}
                </span>
                <span className="text-base font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
                  {summary.averageLatencyMs} ms
                </span>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  {language === 'ar' ? 'وقت آخر فحص' : language === 'fr' ? 'Dernière exécution' : 'Last Executed'}
                </span>
                <span className="text-base font-bold text-neutral-800 dark:text-neutral-200 font-mono tabular-nums">
                  {new Date(summary.testedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              {language === 'ar' ? 'تفاصيل فحص الأنشطة الـ 7' : language === 'fr' ? 'Détail des 7 métiers' : 'Vertical Probes Breakdown (7 Verticals)'}
            </h3>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline">
              · {language === 'ar' ? 'تطهير فوري للبيانات الاختبارية' : language === 'fr' ? 'Nettoyage automatique sans débris' : 'Zero test debris'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border ${
                filterMode === 'all'
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                  : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'} ({probes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('passed')}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border ${
                filterMode === 'passed'
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                  : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {language === 'ar' ? 'الناجحة' : language === 'fr' ? 'Validées' : 'Passed'} ({summary?.passedCount ?? probes.filter((p) => p.status === 'passed').length})
            </button>
            {((summary?.warningCount ?? 0) > 0 || (summary?.failedCount ?? 0) > 0) && (
              <button
                type="button"
                onClick={() => setFilterMode('attention')}
                className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border ${
                  filterMode === 'attention'
                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                    : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {language === 'ar' ? 'تنبيهات' : language === 'fr' ? 'Alertes' : 'Alerts'} ({(summary?.warningCount ?? 0) + (summary?.failedCount ?? 0)})
              </button>
            )}
          </div>
        </div>

        {/* Probes Matrix List */}
        <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
          {filteredProbes.map((probe) => {
            const allTracePassed =
              probe.traceKeysVerified.accountId &&
              probe.traceKeysVerified.businessId &&
              probe.traceKeysVerified.branchId &&
              probe.traceKeysVerified.staffId;

            return (
              <div key={probe.id} className="p-3.5 space-y-2.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {probe.status === 'passed' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : probe.status === 'warning' ? (
                      <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                          {probe.name}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                          [{probe.vertical}]
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5">
                          {probe.layer}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {probe.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="text-xs font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                      {probe.latencyMs} ms
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedProbe(probe)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 px-2 py-1 bg-neutral-50 dark:bg-neutral-900 transition-colors cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>{language === 'ar' ? 'فحص البيانات' : language === 'fr' ? 'Inspecter' : 'Inspect Payload'}</span>
                    </button>
                  </div>
                </div>

                {/* Quadruple Keys Breakdown */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-900">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {language === 'ar' ? 'مفاتيح التتبع:' : language === 'fr' ? 'Traçabilité :' : 'Traceability Keys:'}
                  </span>
                  <span className={probe.traceKeysVerified.accountId ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-rose-600 font-medium'}>
                    account_id {probe.traceKeysVerified.accountId ? '✓' : '✗'}
                  </span>
                  <span>·</span>
                  <span className={probe.traceKeysVerified.businessId ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-rose-600 font-medium'}>
                    business_id {probe.traceKeysVerified.businessId ? '✓' : '✗'}
                  </span>
                  <span>·</span>
                  <span className={probe.traceKeysVerified.branchId ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-rose-600 font-medium'}>
                    branch_id {probe.traceKeysVerified.branchId ? '✓' : '✗'}
                  </span>
                  <span>·</span>
                  <span className={probe.traceKeysVerified.staffId ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-rose-600 font-medium'}>
                    staff_id {probe.traceKeysVerified.staffId ? '✓' : '✗'}
                  </span>
                  <span>·</span>
                  <span className="text-neutral-400">
                    Ops: {probe.operationsTested.join(' → ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inspector Drawer / Modal */}
        {selectedProbe && (
          <div className="border border-neutral-300 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'معاينة هيكلية السجل والتتبع:' : language === 'fr' ? 'Inspecteur de charge & traçabilité :' : 'Payload & Lineage Inspector:'} {selectedProbe.name}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  ({selectedProbe.layer})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(JSON.stringify(selectedProbe.payloadSent, null, 2))
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 bg-white dark:bg-neutral-800 cursor-pointer"
                >
                  {copiedPayload ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedPayload ? (language === 'ar' ? 'تم النسخ' : 'Copié') : (language === 'ar' ? 'نسخ JSON' : 'Copy JSON')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProbe(null)}
                  className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <pre className="p-3 bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-neutral-800">
              {JSON.stringify(selectedProbe.payloadSent, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
};
