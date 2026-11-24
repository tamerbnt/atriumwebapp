import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="xl">
      <div className="flex flex-col gap-[var(--s4,16px)]">
        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-[var(--s3,12px)] items-end pb-[var(--s3,12px)] border-b border-[var(--atr-line)]">
          <LabelInput
            label={isAr ? 'الجدول' : isFr ? 'Table' : 'Table'}
            value={tableFilter}
            onChange={setTableFilter}
            placeholder={
              isAr ? 'مثال: gym_members' : isFr ? 'ex: gym_members' : 'e.g. gym_members'
            }
            height={40}
          />

          <LabelSelect
            label={isAr ? 'العملية' : isFr ? 'Action' : 'Action'}
            value={actionFilter}
            onChange={setActionFilter}
            options={ACTION_OPTIONS.map((act) => ({
              value: act,
              label: act === 'ALL' ? (isAr ? 'الكل' : isFr ? 'Tout' : 'All') : act,
            }))}
            height={40}
          />

          <AtriumButton
            type="button"
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} strokeWidth={1.5} />}
            onClick={() => loadPage(false)}
            disabled={isLoading}
          >
            {isAr ? 'تحديث' : isFr ? 'Actualiser' : 'Refresh'}
          </AtriumButton>
        </div>

        {/* Summary counter */}
        <div className="flex items-center justify-between t-cap text-[var(--atr-ink-3)]">
          <span className="tabular-nums">
            {isAr
              ? `عرض ${logs.length} من ${totalCount || logs.length} سجل`
              : isFr
              ? `Affichage de ${logs.length} sur ${totalCount || logs.length} entrées`
              : `Showing ${logs.length} of ${totalCount || logs.length} entries`}
          </span>
          {!isSupabaseConfigured() && (
            <span className="t-cap text-[var(--atr-ink-4)]">
              {isAr ? 'وضع التخزين المحلي نشط' : isFr ? 'Mode local hors-ligne' : 'Local-only mode'}
            </span>
          )}
        </div>

        {/* Error banner with retry */}
        {error && (
          <div
            data-sq="card"
            style={{ '--sq-stroke': '#FDA4AF' } as React.CSSProperties}
            className="p-[var(--s3,12px)] bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between gap-[var(--s3,12px)] t-cap text-rose-700 dark:text-rose-300"
          >
            <span>{error}</span>
            <AtriumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => loadPage(logs.length > 0)}
            >
              {isAr ? 'إعادة المحاولة' : isFr ? 'Réessayer' : 'Retry'}
            </AtriumButton>
          </div>
        )}

        {/* Log rows */}
        {isLoading && logs.length === 0 ? (
          <div className="flex flex-col gap-[var(--s2,8px)]">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                data-sq="ctl"
                data-sq-border="solid"
                style={{ '--sq-stroke': 'var(--atr-line)' } as React.CSSProperties}
                className="h-[var(--sb-item,44px)] bg-[var(--atr-soft)] animate-pulse"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <KineticEmptyStateMotion motionKey={`audit-empty-${language}-${isSupabaseConfigured()}`}>
            <EmptyState
              variant="compact"
              tone={isSupabaseConfigured() ? 'neutral' : 'warning'}
              icon={<Shield size={20} strokeWidth={1.75} />}
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
          <div
            data-sq="table"
            style={{ '--sq-stroke': 'var(--atr-line)' } as React.CSSProperties}
            className="divide-y divide-[var(--atr-line)] bg-[var(--atr-card)]"
          >
            {logs.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full px-[var(--s4,16px)] py-[var(--s3,12px)] flex items-center justify-between gap-[var(--s3,12px)] text-start hover:bg-[var(--atr-soft)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-[var(--s2,8px)] min-w-0">
                      {isExpanded ? (
                        <ChevronDown size={16} strokeWidth={1.5} className="text-[var(--atr-ink-4)] shrink-0" />
                      ) : (
                        <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--atr-ink-4)] shrink-0 rtl:rotate-180" />
                      )}
                      <span className="t-label font-semibold text-[var(--atr-ink)] truncate">
                        {entry.tableName}
                      </span>
                      <span aria-hidden="true" className="text-[var(--atr-ink-4)]">·</span>
                      <span className="t-small font-semibold text-[var(--atr-acc-text)] shrink-0">
                        {entry.action}
                      </span>
                      {entry.recordId && (
                        <>
                          <span aria-hidden="true" className="text-[var(--atr-ink-4)]">·</span>
                          <span className="t-cap tabular-nums text-[var(--atr-ink-3)] truncate max-w-[140px]">
                            {entry.recordId}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="t-cap tabular-nums text-[var(--atr-ink-3)] shrink-0">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-[var(--s4,16px)] py-[var(--s3,12px)] bg-[var(--atr-soft)] border-t border-[var(--atr-line)] grid grid-cols-1 md:grid-cols-2 gap-[var(--s3,12px)]">
                      <div className="flex flex-col gap-[var(--s1,4px)]">
                        <div className="t-small text-[var(--atr-ink-3)]">
                          {isAr ? 'البيانات السابقة' : isFr ? 'Avant (old_data)' : 'Before (old_data)'}
                        </div>
                        <pre
                          data-sq="ctl"
                          style={{ '--sq-stroke': 'var(--atr-line)' } as React.CSSProperties}
                          className="p-[var(--s3,12px)] bg-[var(--atr-card)] t-cap font-sans tabular-nums overflow-x-auto max-h-[160px] text-[var(--atr-ink-2)]"
                        >
                          {entry.oldData ? JSON.stringify(entry.oldData, null, 2) : '—'}
                        </pre>
                      </div>
                      <div className="flex flex-col gap-[var(--s1,4px)]">
                        <div className="t-small text-[var(--atr-ink-3)]">
                          {isAr ? 'البيانات الجديدة' : isFr ? 'Après (new_data)' : 'After (new_data)'}
                        </div>
                        <pre
                          data-sq="ctl"
                          style={{ '--sq-stroke': 'var(--atr-line)' } as React.CSSProperties}
                          className="p-[var(--s3,12px)] bg-[var(--atr-card)] t-cap font-sans tabular-nums overflow-x-auto max-h-[160px] text-[var(--atr-ink-2)]"
                        >
                          {entry.newData ? JSON.stringify(entry.newData, null, 2) : '—'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoadingMore && (
              <div className="p-[var(--s2,8px)] flex flex-col gap-[var(--s2,8px)]">
                <div data-sq="row" data-sq-border="none" className="h-[var(--sb-item,44px)] bg-[var(--atr-soft)] animate-pulse" />
                <div data-sq="row" data-sq-border="none" className="h-[var(--sb-item,44px)] bg-[var(--atr-soft)] animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Keyset Load More footer */}
        {hasMore && (
          <div className="flex justify-center pt-[var(--s1,4px)]">
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
