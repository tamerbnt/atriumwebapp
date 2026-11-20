import React, { useMemo, useState, useEffect } from 'react';
import { Undo2, Redo2, Search, Trash2, X, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  UndoEntryStatus,
  BusinessCategory,
} from '../../types/index';

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
  const { entries, availableCount, undoById, redoById, clearHistory } = useUndoHistory(
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
    if (op === 'all') return l3('الكل', 'Tout', 'All');
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
      className="absolute top-[calc(100%+8px)] right-0 rtl:right-auto rtl:left-0 w-[min(420px,calc(100vw-24px))] bg-[var(--atr-card,#FBF8F5)] border border-[var(--atr-line,#E6DED6)] rounded-[20px] shadow-[var(--atr-shadow-pop)] z-[120] overflow-hidden flex flex-col max-h-[min(78vh,560px)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--atr-line,#E6DED6)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
            style={{
              background: 'var(--facility-accent-dim, rgba(201, 70, 31, 0.12))',
              color: 'var(--facility-accent, var(--brand-fill, #C9461F))',
            }}
          >
            <Undo2 size={16} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="t-card text-[var(--text-1)] truncate">
              {l3('سجل التراجع', "Historique d'annulation", 'Undo History')}
            </h3>
            <p className="t-cap text-[var(--text-2)] tabular-nums">
              {availableCount}{' '}
              {l3('عملية متاحة للتراجع', 'actions annulables', 'reversible actions')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => clearHistory()}
              className="h-8 px-2.5 rounded-[10px] t-small text-[var(--text-2)] hover:text-rose-600 hover:bg-rose-500/10 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title={l3('مسح السجل', "Vider l'historique", 'Clear history')}
            >
              <Trash2 size={13} strokeWidth={1.6} />
              <span>{l3('مسح', 'Vider', 'Clear')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--atr-soft,#ede6e0)] transition-colors cursor-pointer"
            aria-label={l3('إغلاق', 'Fermer', 'Close')}
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="px-4 py-3 border-b border-[var(--atr-line,#E6DED6)] flex flex-col gap-2.5 bg-[var(--atr-soft,#ede6e0)]/45">
        {/* Search + Vertical Select */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              size={14}
              strokeWidth={1.6}
              className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={l3('بحث في العمليات...', 'Filtrer les actions...', 'Filter actions...')}
              className="w-full h-8 ps-8 pe-7 rounded-[10px] bg-[var(--atr-card,#FBF8F5)] border border-[var(--atr-line,#E6DED6)] t-small text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--facility-accent,var(--brand-fill))]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)] cursor-pointer"
                aria-label="Clear filter search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            aria-label={l3('تصفية حسب النشاط', 'Filtrer par module', 'Filter by vertical')}
            value={verticalFilter}
            onChange={(e) => setVerticalFilter(e.target.value as 'all' | UndoVerticalKey)}
            className="h-8 px-2.5 rounded-[10px] bg-[var(--atr-card,#FBF8F5)] border border-[var(--atr-line,#E6DED6)] t-small text-[var(--text-1)] max-w-[148px] truncate cursor-pointer focus:outline-none focus:border-[var(--facility-accent,var(--brand-fill))]"
          >
            <option value="all">{l3('كل القطاعات', 'Tous modules', 'All modules')}</option>
            {presentVerticals.map((v) => (
              <option key={v} value={v}>
                {getVerticalDisplayName(v, language)}
              </option>
            ))}
          </select>
        </div>

        {/* Operation Type Segmented Filter */}
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
                    ? 'bg-[var(--atr-card,#FBF8F5)] text-[var(--text-1)] font-semibold border border-[var(--atr-line,#E6DED6)] shadow-2xs'
                    : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                }`}
              >
                {getOpLabel(op)}
              </button>
            );
          })}
        </div>

        {/* Availability Filter */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`h-6 px-2 rounded-[6px] t-cap whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'font-semibold text-[var(--facility-accent,var(--brand-fill))] bg-[var(--facility-accent-dim,rgba(201,70,31,0.12))]'
                      : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                  }`}
                >
                  {getStatusLabel(st)}
                </button>
              );
            })}
          </div>
          <span className="t-cap text-[var(--text-3)] tabular-nums whitespace-nowrap">
            {filteredEntries.length} / {entries.length}
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
