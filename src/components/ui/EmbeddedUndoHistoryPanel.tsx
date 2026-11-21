import React, { useMemo, useState } from 'react';
import { Undo2, Redo2, Search, Trash2, X, Clock, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import {
  useUndoHistory,
  getVerticalDisplayName,
  getOperationDisplayName,
  getUndoButtonLabel,
  getRedoButtonLabel,
} from '../../services/undoEngine';
import {
  SupportedLanguage,
  UndoOperationType,
  UndoVerticalKey,
} from '../../types/index';
import { EmptyState } from '../../atrium/components/EmptyState';

export interface EmbeddedUndoHistoryPanelProps {
  businessId: string;
  branchId: string;
  vertical: UndoVerticalKey;
  language: SupportedLanguage;
  externalSearchQuery?: string;
  onExternalSearchChange?: (q: string) => void;
  lockVerticalScope?: boolean;
}

const OP_FILTERS: Array<'all' | UndoOperationType> = ['all', 'create', 'edit', 'status', 'delete', 'bulk'];
const STATUS_FILTERS: Array<'all' | 'available' | 'undone'> = ['all', 'available', 'undone'];

function formatRelativeTime(ts: number, language: SupportedLanguage): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 10) {
    return language === 'ar' ? 'الآن' : language === 'fr' ? "À l'instant" : 'Just now';
  }
  if (diffSec < 60) {
    return language === 'ar' ? `منذ ${diffSec} ث` : language === 'fr' ? `Il y a ${diffSec}s` : `${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return language === 'ar' ? `منذ ${diffMin} د` : language === 'fr' ? `Il y a ${diffMin} min` : `${diffMin}m ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  return language === 'ar' ? `منذ ${diffHr} س` : language === 'fr' ? `Il y a ${diffHr}h` : `${diffHr}h ago`;
}

export const EmbeddedUndoHistoryPanel: React.FC<EmbeddedUndoHistoryPanelProps> = ({
  businessId,
  branchId,
  vertical,
  language,
  externalSearchQuery,
  onExternalSearchChange,
  lockVerticalScope = false,
}) => {
  const { entries, availableCount, undoById, redoById, clearHistory } = useUndoHistory(
    businessId,
    branchId
  );

  const [scopeMode, setScopeMode] = useState<'vertical' | 'facility'>('vertical');
  const [opFilter, setOpFilter] = useState<'all' | UndoOperationType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'undone'>('all');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const effectiveSearch = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setEffectiveSearch = onExternalSearchChange || setInternalSearchQuery;
  const usesExternalSearch = externalSearchQuery !== undefined;

  const scopedEntries = useMemo(() => {
    if (!lockVerticalScope && scopeMode === 'facility') {
      return entries;
    }
    return entries.filter((entry) => {
      if (vertical === 'staff' || lockVerticalScope) {
        return entry.vertical === vertical;
      }
      return entry.vertical === vertical || entry.vertical === 'settings';
    });
  }, [entries, lockVerticalScope, scopeMode, vertical]);

  const scopedAvailableCount = useMemo(
    () => scopedEntries.filter((e) => e.status === 'available').length,
    [scopedEntries]
  );

  const filteredEntries = useMemo(() => {
    const q = effectiveSearch.trim().toLowerCase();
    return scopedEntries.filter((entry) => {
      if (opFilter !== 'all' && entry.operationType !== opFilter) return false;
      if (statusFilter === 'available' && entry.status !== 'available') return false;
      if (statusFilter === 'undone' && entry.status !== 'undone') return false;
      if (q) {
        const hay = `${entry.summary} ${entry.entityLabel || ''} ${getVerticalDisplayName(entry.vertical, language)} ${getOperationDisplayName(entry.operationType, language)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedEntries, opFilter, statusFilter, effectiveSearch, language]);

  const getOpLabel = (op: 'all' | UndoOperationType) => {
    if (op === 'all') return l3('الكل', 'Tout', 'All');
    return getOperationDisplayName(op, language);
  };

  const getStatusLabel = (st: 'all' | 'available' | 'undone') => {
    if (st === 'all') return l3('الكل', 'Tous', 'All');
    if (st === 'available') return l3('قابل للتراجع', 'Annulables', 'Available');
    return l3('تم التراجع', 'Annulés', 'Undone');
  };

  const hasFiltersActive =
    opFilter !== 'all' ||
    statusFilter !== 'all' ||
    effectiveSearch.trim().length > 0 ||
    (!lockVerticalScope && scopeMode !== 'vertical');

  return (
    <div className="flex flex-col gap-3">
      {/* Sub-toolbar: Scope toggle + Op filters + Availability + Clear */}
      <div
        data-sq="card"
        className="p-3.5 bg-[#FBF8F5] dark:bg-[#22201E] flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              data-sq="tile"
              className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{
                background: 'var(--facility-accent-dim, rgba(201, 70, 31, 0.12))',
                color: 'var(--facility-accent, var(--brand-fill, #C9461F))',
              }}
            >
              <Undo2 size={15} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="t-label font-semibold text-[var(--text-1)] dark:text-white truncate">
                {l3('سجل الإلغاء والتراجع (Ctrl+Z)', "Journal d'annulations & Rétablissement (Ctrl+Z)", 'Undo & Rollback Log (Ctrl+Z)')}
              </div>
              <div className="t-cap text-[var(--text-2)] dark:text-white/65 tabular-nums">
                {scopedAvailableCount}{' '}
                {l3('متاح للتراجع في هذا النطاق', 'annulables dans cette vue', 'reversible in this scope')}
                {!lockVerticalScope && scopeMode === 'vertical' && availableCount > scopedAvailableCount
                  ? ` · ${availableCount} ${l3('إجمالاً في المؤسسة', 'au total établissement', 'total workspace')}`
                  : ''}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!lockVerticalScope && (
              <div
                data-sq="ctl-sm"
                data-sq-border="none"
                className="inline-flex items-center p-0.5 bg-[#EFE9E2] dark:bg-[#191716]"
              >
                <button
                  type="button"
                  onClick={() => setScopeMode('vertical')}
                  className={`h-7 px-2.5 rounded-[7px] t-small cursor-pointer transition-colors ${
                    scopeMode === 'vertical'
                      ? 'bg-[var(--facility-accent-dim,rgba(201,70,31,0.12))] text-[var(--facility-accent,var(--brand-text,#BF431F))] font-semibold'
                      : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  {l3('هذا القسم', 'Ce module', 'This module')}
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('facility')}
                  className={`h-7 px-2.5 rounded-[7px] t-small cursor-pointer transition-colors flex items-center gap-1 ${
                    scopeMode === 'facility'
                      ? 'bg-[var(--facility-accent-dim,rgba(201,70,31,0.12))] text-[var(--facility-accent,var(--brand-text,#BF431F))] font-semibold'
                      : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  <Layers size={12} />
                  <span>{l3('كامل المؤسسة', "Tout l'établissement", 'Whole facility')}</span>
                </button>
              </div>
            )}

            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => clearHistory()}
                data-sq="ctl-sm"
                className="h-8 px-2.5 t-small text-[var(--text-2)] hover:text-rose-600 hover:bg-rose-500/10 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                title={l3('مسح السجل', "Vider l'historique", 'Clear history')}
              >
                <Trash2 size={13} strokeWidth={1.6} />
                <span>{l3('مسح السجل', "Vider l'historique", 'Clear log')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Operation Type Filter */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {OP_FILTERS.map((op) => {
              const active = opFilter === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOpFilter(op)}
                  className={`h-7 px-2.5 rounded-[8px] t-small whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-white dark:bg-[#2B2825] text-[var(--text-1)] dark:text-white font-semibold shadow-2xs'
                      : 'text-[var(--text-2)] hover:text-[var(--text-1)] dark:hover:text-white'
                  }`}
                >
                  {getOpLabel(op)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 ms-auto">
            {!usesExternalSearch && (
              <div className="relative min-w-[190px]">
                <Search
                  size={13}
                  strokeWidth={1.6}
                  className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none"
                />
                <input
                  type="text"
                  value={effectiveSearch}
                  onChange={(e) => setEffectiveSearch(e.target.value)}
                  placeholder={l3('بحث في الإلغاءات...', 'Filtrer les annulations...', 'Filter undo entries...')}
                  className="w-full h-7 ps-7 pe-6 rounded-[8px] border-0 bg-[#F5F1EC] dark:bg-[#2B2825] focus:bg-white dark:focus:bg-[#312D2A] t-small text-[var(--text-1)] dark:text-white placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--facility-accent,#d4522f)]/30 transition-all"
                />
                {effectiveSearch && (
                  <button
                    type="button"
                    onClick={() => setEffectiveSearch('')}
                    className="absolute right-1.5 rtl:right-auto rtl:left-1.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
                    aria-label="Clear filter search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Availability status filter */}
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((st) => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`h-7 px-2.5 rounded-[7px] t-cap whitespace-nowrap cursor-pointer transition-colors ${
                      active
                        ? 'font-semibold text-[var(--facility-accent,var(--brand-text,#BF431F))] bg-[var(--facility-accent-dim,rgba(201,70,31,0.12))]'
                        : 'text-[var(--text-2)] hover:text-[var(--text-1)] dark:hover:text-white'
                    }`}
                  >
                    {getStatusLabel(st)}
                  </button>
                );
              })}
            </div>

            <span className="t-cap text-[var(--text-3)] tabular-nums whitespace-nowrap">
              {filteredEntries.length} / {scopedEntries.length}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline List */}
      {filteredEntries.length === 0 ? (
        <div className="py-4">
          <EmptyState
            variant="compact"
            tone="neutral"
            icon={<Clock className="w-4 h-4" strokeWidth={1.5} />}
            title={l3('لا توجد عمليات مسجلة', 'Aucune annulation correspondante', 'No matching undo operations')}
            description={l3(
              'ستظهر عمليات الإنشاء والتعديل والحذف هنا للتراجع أو الإعادة فوراً.',
              'Toutes les créations, modifications, suppressions et actions groupées apparaissent ici pour un retour arrière immédiat.',
              'Creates, edits, status changes, deletes, and bulk actions appear here for instant rollback.'
            )}
            primaryAction={
              hasFiltersActive
                ? {
                    label: l3('إعادة ضبط الفلاتر', 'Réinitialiser les filtres', 'Reset filters'),
                    onClick: () => {
                      setOpFilter('all');
                      setStatusFilter('all');
                      setScopeMode('vertical');
                      setEffectiveSearch('');
                    },
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div
          data-sq="card"
          className="sq-elev-card bg-white dark:bg-[#22201E] divide-y divide-black/[0.045] dark:divide-white/[0.06] overflow-hidden"
        >
          {filteredEntries.map((entry) => {
            const isUndone = entry.status === 'undone';
            const isError = entry.status === 'error';
            const isBusy = busyId === entry.id;
            const exactTime = new Date(entry.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={entry.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FBF8F5] dark:hover:bg-[#262422]/70 transition-colors"
              >
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 t-cap text-[var(--text-3)] flex-wrap">
                    <span className="font-medium text-[var(--text-2)] dark:text-white/80">
                      {getVerticalDisplayName(entry.vertical, language)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{getOperationDisplayName(entry.operationType, language)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatRelativeTime(entry.createdAt, language)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{exactTime}</span>
                    {entry.affectedCount && entry.affectedCount > 1 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums font-semibold text-[var(--text-2)] dark:text-white/75">
                          {entry.affectedCount} {l3('عناصر', 'éléments', 'items')}
                        </span>
                      </>
                    )}
                    {isUndone && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 size={11} />
                          {l3('تم التراجع', 'Annulé', 'Undone')}
                        </span>
                      </>
                    )}
                    {isError && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span
                          title={entry.lastError}
                          className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium"
                        >
                          <AlertCircle size={11} />
                          {l3('خطأ', 'Erreur', 'Error')}
                        </span>
                      </>
                    )}
                  </div>

                  <p
                    className={`t-label truncate ${
                      isUndone ? 'text-[var(--text-2)] line-through' : 'text-[var(--text-1)] dark:text-white'
                    }`}
                    title={entry.summary}
                  >
                    {entry.summary}
                  </p>
                </div>

                <div className="shrink-0">
                  {entry.status !== 'undone' ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyId(entry.id);
                        try {
                          await undoById(entry.id);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="h-8 px-3 rounded-[8px] flex items-center gap-1.5 t-small font-semibold cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
                      style={{
                        color: 'var(--facility-accent, var(--brand-fill, #C9461F))',
                        background: 'var(--facility-accent-dim, rgba(201, 70, 31, 0.12))',
                      }}
                    >
                      <Undo2 size={13} strokeWidth={2} />
                      <span>{getUndoButtonLabel(language)}</span>
                    </button>
                  ) : entry.canRedo && entry.redo ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={async () => {
                        setBusyId(entry.id);
                        try {
                          await redoById(entry.id);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="h-8 px-3 rounded-[8px] flex items-center gap-1.5 t-small font-medium text-[var(--text-2)] hover:text-[var(--text-1)] dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#2B2825] cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      <Redo2 size={13} strokeWidth={1.8} />
                      <span>{getRedoButtonLabel(language)}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmbeddedUndoHistoryPanel;
