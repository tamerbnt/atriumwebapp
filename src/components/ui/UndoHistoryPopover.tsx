import React, { useMemo, useState, useEffect } from 'react';
import { Undo2, Redo2, Search, Trash2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  BusinessCategory,
} from '../../types/index';
import { LiveSelect } from './live/LiveSelect';
import { LiveSegmentedControl } from './live/LiveSegmentedControl';
import { LabelInput } from './LabelInput';

export interface UndoHistoryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  branchId: string;
  currentCategory?: BusinessCategory;
  language: SupportedLanguage;
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

export const UndoHistoryPopover: React.FC<UndoHistoryPopoverProps> = ({
  isOpen,
  onClose,
  businessId,
  branchId,
  currentCategory,
  language,
}) => {
  const { entries, undoById, redoById, clearHistory } = useUndoHistory(
    businessId,
    branchId
  );

  const [verticalFilter, setVerticalFilter] = useState<'all' | UndoVerticalKey>('all');
  const [opFilter, setOpFilter] = useState<'all' | UndoOperationType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'undone'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const presentVerticals = useMemo(() => {
    const set = new Set<UndoVerticalKey>();
    if (currentCategory) set.add(currentCategory);
    entries.forEach((e) => set.add(e.vertical));
    return Array.from(set);
  }, [entries, currentCategory]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (verticalFilter !== 'all' && entry.vertical !== verticalFilter) return false;
      if (opFilter !== 'all' && entry.operationType !== opFilter) return false;
      if (statusFilter === 'available' && entry.status !== 'available') return false;
      if (statusFilter === 'undone' && entry.status !== 'undone') return false;
      if (q) {
        const hay = `${entry.summary} ${entry.entityLabel || ''} ${getVerticalDisplayName(entry.vertical, language)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, verticalFilter, opFilter, statusFilter, searchQuery, language]);

  if (!isOpen) return null;

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const getOpLabel = (op: 'all' | UndoOperationType) => {
    if (op === 'all') return l3('كل العمليات', 'Toutes opérations', 'All actions');
    return getOperationDisplayName(op, language);
  };

  const getStatusLabel = (st: 'all' | 'available' | 'undone') => {
    if (st === 'all') return l3('الكل', 'Tous', 'All');
    if (st === 'available') return l3('قابل للتراجع', 'Annulables', 'Available');
    return l3('تم التراجع', 'Annulés', 'Undone');
  };

  return (
    <div
      role="dialog"
      aria-label={l3('سجل التراجع والعمليات', "Historique d'annulation", 'Undo History')}
      className="sq-elev-pop absolute top-[calc(100%+8px)] end-0 w-[min(420px,calc(100vw-24px))] bg-white dark:bg-[#262422] border border-black/[0.05] dark:border-white/[0.08] rounded-[20px] z-[120] overflow-hidden flex flex-col max-h-[min(78vh,560px)]"
    >
      {/* Filters Toolbar (Headerless Popover) */}
      <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.07] flex flex-col gap-2.5 bg-[#FBF8F5] dark:bg-[#191716]">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <LabelInput
              field={l3('بحث في العمليات', 'Filtrer les actions', 'Filter actions')}
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              prefix={<Search size={14} strokeWidth={1.6} />}
            />
          </div>
          {entries.length > 0 && (
            <button
              type="button"
              data-no-liquid=""
              onClick={() => clearHistory()}
              className="h-10 px-2.5 rounded-[10px] t-small text-[var(--text-2)] hover:text-rose-600 hover:bg-rose-500/10 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={l3('مسح السجل', "Vider l'historique", 'Clear history')}
            >
              <Trash2 size={14} strokeWidth={1.6} />
              <span>{l3('مسح', 'Vider', 'Clear')}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <LiveSelect
            size="sm"
            tone="soft"
            className="w-full justify-between"
            aria-label={l3('تصفية حسب النشاط', 'Filtrer par module', 'Filter by vertical')}
            value={verticalFilter}
            onValueChange={(val) => setVerticalFilter(val as 'all' | UndoVerticalKey)}
            options={[
              { value: 'all', label: l3('كل القطاعات', 'Tous modules', 'All modules') },
              ...presentVerticals.map((v) => ({
                value: v,
                label: getVerticalDisplayName(v, language),
              })),
            ]}
          />

          <LiveSelect
            size="sm"
            tone="soft"
            className="w-full justify-between"
            aria-label={l3('نوع العملية', "Type d'opération", 'Operation type')}
            value={opFilter}
            onValueChange={(val) => setOpFilter(val as 'all' | UndoOperationType)}
            options={OP_FILTERS.map((op) => ({
              value: op,
              label: getOpLabel(op),
            }))}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <LiveSegmentedControl
            size="sm"
            fullWidth
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as 'all' | 'available' | 'undone')}
            aria-label={l3('الحالة', 'Statut', 'Status')}
            options={STATUS_FILTERS.map((st) => ({
              value: st,
              label: getStatusLabel(st),
            }))}
          />
          <span className="t-cap text-[var(--text-3)] tabular-nums whitespace-nowrap shrink-0">
            {filteredEntries.length}/{entries.length}
          </span>
        </div>
      </div>

      {/* Entries Timeline */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--atr-line,#E6DED6)]">
        {filteredEntries.length === 0 ? (
          <div className="px-4 py-10 text-center flex flex-col items-center gap-2">
            <Clock size={22} strokeWidth={1.5} className="text-[var(--text-3)]" />
            <p className="t-label text-[var(--text-1)]">
              {l3('لا توجد عمليات مطابقة', 'Aucune action correspondante', 'No matching operations')}
            </p>
            <p className="t-cap text-[var(--text-2)] max-w-[260px]">
              {l3(
                'ستظهر جميع عمليات الإنشاء والتعديل والحذف هنا للتراجع السريع.',
                'Toutes les créations, modifications et suppressions apparaîtront ici.',
                'Creates, edits, status changes, and deletes appear here for instant rollback.'
              )}
            </p>
            {(verticalFilter !== 'all' || opFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim().length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setVerticalFilter('all');
                  setOpFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="mt-1 h-7 px-3 rounded-[8px] t-small font-medium cursor-pointer transition-colors"
                style={{
                  color: 'var(--facility-accent, var(--brand-fill, #C9461F))',
                  background: 'var(--facility-accent-dim, rgba(201, 70, 31, 0.12))',
                }}
              >
                {l3('إعادة ضبط الفلاتر', 'Réinitialiser les filtres', 'Reset filters')}
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isUndone = entry.status === 'undone';
            const isError = entry.status === 'error';
            const isBusy = busyId === entry.id;

            return (
              <div
                key={entry.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--atr-soft,#ede6e0)]/40 transition-colors"
              >
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 t-cap text-[var(--text-3)] flex-wrap">
                    <span className="font-medium text-[var(--text-2)]">
                      {getVerticalDisplayName(entry.vertical, language)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{getOperationDisplayName(entry.operationType, language)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatRelativeTime(entry.createdAt, language)}</span>
                    {isUndone && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
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
                          className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"
                        >
                          <AlertCircle size={11} />
                          {l3('خطأ', 'Erreur', 'Error')}
                        </span>
                      </>
                    )}
                  </div>

                  <p
                    className={`t-label truncate ${
                      isUndone ? 'text-[var(--text-2)] line-through' : 'text-[var(--text-1)]'
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
                      className="h-8 px-2.5 rounded-[8px] flex items-center gap-1.5 t-small font-semibold cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
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
                      className="h-8 px-2.5 rounded-[8px] flex items-center gap-1.5 t-small font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--atr-soft,#ede6e0)] cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      <Redo2 size={13} strokeWidth={1.8} />
                      <span>{getRedoButtonLabel(language)}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UndoHistoryPopover;
