import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
import { auditService, type AuditLogRecord } from '../../lib/supabase/services/auditService';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { useAtriumSelector } from '../../services/store';
import { EmptyState } from '../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../ui/kinetic';

interface AuditLogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_OPTIONS = ['ALL', 'INSERT', 'UPDATE', 'SOFT_DELETE', 'DELETE'] as const;

export const AuditLogViewerModal: React.FC<AuditLogViewerModalProps> = ({ isOpen, onClose }) => {
  const accountId = useAtriumSelector((s) => s.account.id);
  const currentBranchId = useAtriumSelector((s) => s.currentBranchId);
  const language = useAtriumSelector((s) => s.language);

  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPage = useCallback(
    async (append: boolean) => {
      if (!isSupabaseConfigured()) {
        setLogs([]);
        setHasMore(false);
        setTotalCount(0);
        setError(null);
        return;
      }

      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);

      try {
        const lastItem = append && logs.length > 0 ? logs[logs.length - 1] : null;
        const res = await auditService.fetchAuditLogsPage({
          accountId: accountId || 'acc_01',
          branchId: currentBranchId || null,
          cursorOccurredAt: lastItem?.occurredAt || null,
          cursorId: lastItem?.id || null,
          limit: 50,
          tableName: tableFilter.trim() || undefined,
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
        });

        if (res.error) {
          setError(res.error);
          if (!append) setLogs([]);
        } else {
          setLogs((prev) => (append ? [...prev, ...res.items] : res.items));
          setHasMore(res.hasMore);
          setTotalCount(res.totalCount);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [accountId, currentBranchId, tableFilter, actionFilter, logs]
  );

  useEffect(() => {
    if (!isOpen) return;
    void loadPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tableFilter, actionFilter, currentBranchId]);

  const title = isAr
    ? 'سجل التدقيق غير القابل للتعديل'
    : isFr
    ? "Journal d'audit immuable"
    : 'Immutable Audit Log';

  const subtitle = isAr
    ? 'تتبع العمليات على مستوى الصفوف عبر التصفح التسلسلي'
    : isFr
    ? 'Traçabilité des mutations par curseur haute performance'
    : 'Keyset-paginated row mutation trail';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} maxWidth="xl">
      <div className="space-y-4">
        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-[var(--atr-line)]">
          <input
            type="text"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            placeholder={
              isAr ? 'تصفية باسم الجدول...' : isFr ? 'Filtrer par table (ex: gym_members)...' : 'Filter by table (e.g. gym_members)...'
            }
            className="flex-1 min-w-[200px] h-9 px-3 rounded-lg bg-[var(--atr-soft)] border border-[var(--atr-line)] text-xs text-[var(--atr-ink)] placeholder:text-[var(--atr-ink-4)] focus:outline-none focus:border-[var(--atr-acc)]"
          />

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--atr-soft)] border border-[var(--atr-line)]">
            {ACTION_OPTIONS.map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setActionFilter(act)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  actionFilter === act
                    ? 'bg-[var(--atr-card)] text-[var(--atr-ink)] shadow-2xs'
                    : 'text-[var(--atr-ink-3)] hover:text-[var(--atr-ink)]'
                }`}
              >
                {act === 'ALL' ? (isAr ? 'الكل' : isFr ? 'Tout' : 'All') : act}
              </button>
            ))}
          </div>

          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => loadPage(false)}
            disabled={isLoading}
          >
            {isAr ? 'تحديث' : isFr ? 'Actualiser' : 'Refresh'}
          </AtriumButton>
        </div>

        {/* Summary counter */}
        <div className="flex items-center justify-between text-xs text-[var(--atr-ink-3)]">
          <span className="font-mono tabular-nums">
            {isAr
              ? `عرض ${logs.length} من ${totalCount || logs.length} سجل`
              : isFr
              ? `Affichage de ${logs.length} sur ${totalCount || logs.length} entrées`
              : `Showing ${logs.length} of ${totalCount || logs.length} entries`}
          </span>
          {!isSupabaseConfigured() && (
            <span className="text-[11px] text-[var(--atr-ink-4)]">
              {isAr ? 'وضع التخزين المحلي نشط' : isFr ? 'Mode local hors-ligne' : 'Local-only mode'}
            </span>
          )}
        </div>

        {/* Error banner with retry */}
        {error && (
          <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300">
            <span>{error}</span>
            <AtriumButton
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => loadPage(logs.length > 0)}
            >
              {isAr ? 'إعادة المحاولة' : isFr ? 'Réessayer' : 'Retry'}
            </AtriumButton>
          </div>
        )}

        {/* Log rows */}
        {isLoading && logs.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-[44px] rounded-xl bg-[var(--atr-soft)] animate-pulse border border-[var(--atr-line)]"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <KineticEmptyStateMotion motionKey={`audit-empty-${language}-${isSupabaseConfigured()}`}>
            <EmptyState
              variant="compact"
              tone={isSupabaseConfigured() ? 'neutral' : 'warning'}
              icon={<Shield size={20} />}
              title={
                isSupabaseConfigured()
                  ? isAr
                    ? 'لا توجد سجلات تدقيق مطابقة'
                    : isFr
                    ? "Aucune entrée d'audit correspondante"
                    : 'No matching audit entries found'
                  : isAr
                  ? 'سجل التدقيق السحابي يتطلب ربط Supabase'
                  : isFr
                  ? "Le journal d'audit requiert une connexion Supabase active"
                  : 'Cloud audit log requires an active Supabase connection'
              }
              description={
                isAr
                  ? 'سيتم تسجيل كل عملية إدراج أو تعديل أو حذف ناعم تلقائياً هنا.'
                  : isFr
                  ? 'Toutes les insertions, mises à jour et suppressions logiques sont journalisées automatiquement.'
                  : 'Inserts, updates, and soft deletes are captured automatically by database triggers.'
              }
            />
          </KineticEmptyStateMotion>
        ) : (
          <div className="rounded-xl border border-[var(--atr-line)] divide-y divide-[var(--atr-line)] max-h-[380px] overflow-y-auto bg-[var(--atr-card)]">
            {logs.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div key={entry.id} className="text-xs">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left rtl:text-right hover:bg-[var(--atr-soft)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-[var(--atr-ink-4)] shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-[var(--atr-ink-4)] shrink-0" />
                      )}
                      <span className="font-mono font-semibold text-[var(--atr-ink)] truncate">
                        {entry.tableName}
                      </span>
                      <span aria-hidden="true" className="text-[var(--atr-ink-4)]">·</span>
                      <span className="font-semibold text-[var(--atr-acc-text)] shrink-0">
                        {entry.action}
                      </span>
                      {entry.recordId && (
                        <>
                          <span aria-hidden="true" className="text-[var(--atr-ink-4)]">·</span>
                          <span className="font-mono text-[11px] text-[var(--atr-ink-3)] truncate max-w-[140px]">
                            {entry.recordId}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-[var(--atr-ink-3)] shrink-0">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 bg-[var(--atr-soft)] border-t border-[var(--atr-line)] grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-semibold text-[var(--atr-ink-3)] mb-1">
                          {isAr ? 'البيانات السابقة' : isFr ? 'Avant (old_data)' : 'Before (old_data)'}
                        </div>
                        <pre className="p-2.5 rounded-lg bg-[var(--atr-card)] border border-[var(--atr-line)] text-[11px] font-mono overflow-x-auto max-h-[160px] text-[var(--atr-ink-2)]">
                          {entry.oldData ? JSON.stringify(entry.oldData, null, 2) : '—'}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-[var(--atr-ink-3)] mb-1">
                          {isAr ? 'البيانات الجديدة' : isFr ? 'Après (new_data)' : 'After (new_data)'}
                        </div>
                        <pre className="p-2.5 rounded-lg bg-[var(--atr-card)] border border-[var(--atr-line)] text-[11px] font-mono overflow-x-auto max-h-[160px] text-[var(--atr-ink-2)]">
                          {entry.newData ? JSON.stringify(entry.newData, null, 2) : '—'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoadingMore && (
              <div className="p-2 space-y-2">
                <div className="h-[44px] rounded-lg bg-[var(--atr-soft)] animate-pulse" />
                <div className="h-[44px] rounded-lg bg-[var(--atr-soft)] animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Keyset Load More footer */}
        {hasMore && (
          <div className="flex justify-center pt-1">
            <AtriumButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={isLoadingMore}
              onClick={() => loadPage(true)}
            >
              {isLoadingMore
                ? isAr
                  ? 'جاري التحميل...'
                  : isFr
                  ? 'Chargement...'
                  : 'Loading...'
                : isAr
                ? 'تحميل المزيد'
                : isFr
                ? 'Charger plus'
                : 'Load More'}
            </AtriumButton>
          </div>
        )}
      </div>
    </Modal>
  );
};
