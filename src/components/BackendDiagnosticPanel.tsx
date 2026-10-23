import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCw,
  Eye,
  Database,
  Cloud,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  Server,
  Zap,
} from 'lucide-react';
import { useAtriumStore } from '../services/store';
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
    isSupabaseConfigured,
  } = store;

  const [isRunning, setIsRunning] = useState(false);
  const [probes, setProbes] = useState<DiagnosticProbeResult[]>([]);
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<DiagnosticProbeResult | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [expandedVertical, setExpandedVertical] = useState<string | null>(null);

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
    } catch (err) {
      console.error('[diagnosticPanel] Audit run failed:', err);
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
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Top Summary Banner */}
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <Server size={14} className="text-neutral-700 dark:text-neutral-300" />
                <span>
                  {summary?.cloudConnected
                    ? 'PostgreSQL Supabase (Production Cloud Active)'
                    : 'Atrium Reactive Store (Offline Resilient Mode)'}
                </span>
                <span>·</span>
                <span>7 Verticals Covered</span>
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                {summary
                  ? summary.overallStatus === 'passed'
                    ? 'Backend Ready · All CRUD Probes Operational'
                    : 'Backend Audit Completed · Needs Attention'
                  : 'Ready to Run Live Backend Audit'}
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Verifies non-destructive Create, Read, Update, and Delete operations along with Quadruple Traceability (<code className="text-neutral-800 dark:text-neutral-200 font-mono">account_id</code>, <code className="text-neutral-800 dark:text-neutral-200 font-mono">business_id</code>, <code className="text-neutral-800 dark:text-neutral-200 font-mono">branch_id</code>, <code className="text-neutral-800 dark:text-neutral-200 font-mono">staff_id</code>).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={executeAudit}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer"
              >
                <RotateCw size={14} className={isRunning ? 'animate-spin' : ''} />
                <span>{isRunning ? 'Auditing CRUD Operations...' : 'Run Live Audit'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  CRUD Probes Passed
                </span>
                <span className="text-base font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
                  {summary.passedCount} / {summary.totalProbes}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  Traceability Compliance
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {summary.traceabilityCompliancePercent}%
                </span>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  Average Probe Latency
                </span>
                <span className="text-base font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
                  {summary.averageLatencyMs} ms
                </span>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">
                  Last Executed
                </span>
                <span className="text-base font-bold text-neutral-800 dark:text-neutral-200 font-mono tabular-nums">
                  {new Date(summary.testedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Probes Matrix List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              Vertical Probes Breakdown (7 Verticals)
            </h3>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Safe fixtures automatically torn down upon probe completion
            </span>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
            {probes.map((probe) => {
              const allTracePassed =
                probe.traceKeysVerified.accountId &&
                probe.traceKeysVerified.businessId &&
                probe.traceKeysVerified.branchId &&
                probe.traceKeysVerified.staffId;

              return (
                <div key={probe.id} className="p-3.5 space-y-2.5">
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            {probe.name}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                            [{probe.vertical}]
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
                        <span>Inspect Payload</span>
                      </button>
                    </div>
                  </div>

                  {/* Quadruple Keys Breakdown */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-900">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Traceability Keys:
                    </span>
                    <span className={probe.traceKeysVerified.accountId ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
                      account_id {probe.traceKeysVerified.accountId ? '✓' : '✗'}
                    </span>
                    <span>·</span>
                    <span className={probe.traceKeysVerified.businessId ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
                      business_id {probe.traceKeysVerified.businessId ? '✓' : '✗'}
                    </span>
                    <span>·</span>
                    <span className={probe.traceKeysVerified.branchId ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
                      branch_id {probe.traceKeysVerified.branchId ? '✓' : '✗'}
                    </span>
                    <span>·</span>
                    <span className={probe.traceKeysVerified.staffId ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
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
        </div>

        {/* Inspector Drawer / Modal */}
        {selectedProbe && (
          <div className="border border-neutral-300 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Payload & Lineage Inspector: {selectedProbe.name}
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
                  <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
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
