import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, GitMerge, RotateCcw, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useRetainedModalValue } from '../ui/kinetic/KineticModalShell';
import { AtriumButton } from '../ui/AtriumButton';
import { LiveSegmentedControl } from '../ui/live/LiveSegmentedControl';
import { useAtriumSelector, resolveConcurrencyConflictAction, dismissConcurrencyConflictAction } from '../../services/store';

const INTERNAL_IGNORE_KEYS = new Set([
  'id',
  'account_id',
  'business_id',
  'branch_id',
  'staff_id',
  'updated_by_staff_id',
  'device_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'version',
  'row_version',
]);

function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function humanizeFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ConcurrencyConflictModal: React.FC = () => {
  const conflicts = useAtriumSelector((s) => s.concurrencyConflicts || []);
  const language = useAtriumSelector((s) => s.language);
  const rawConflict = conflicts[0] || null;
  const activeConflict = useRetainedModalValue(rawConflict);

  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const [selectedSourceByField, setSelectedSourceByField] = useState<
    Record<string, 'local' | 'server'>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const diffRows = useMemo(() => {
    if (!activeConflict) return [];
    const local = activeConflict.localData || {};
    const server = activeConflict.serverData || {};
    const allKeys = Array.from(new Set([...Object.keys(local), ...Object.keys(server)]));

    return allKeys
      .filter((key) => !INTERNAL_IGNORE_KEYS.has(key))
      .map((key) => {
        const localStr = formatDiffValue(local[key]);
        const serverStr = formatDiffValue(server[key]);
        return {
          key,
          label: humanizeFieldName(key),
          localVal: local[key],
          serverVal: server[key],
          localStr,
          serverStr,
          differs: localStr !== serverStr,
        };
      })
      .filter((row) => row.differs);
  }, [activeConflict]);

  useEffect(() => {
    if (!activeConflict) return;
    const defaults: Record<string, 'local' | 'server'> = {};
    diffRows.forEach((row) => {
      defaults[row.key] = 'local';
    });
    setSelectedSourceByField(defaults);
    setIsSubmitting(false);
  }, [activeConflict?.id, diffRows.length]);

  const handleKeepServer = async () => {
    if (!activeConflict) return;
    setIsSubmitting(true);
    try {
      await resolveConcurrencyConflictAction(activeConflict.id, 'server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverwriteMine = async () => {
    if (!activeConflict) return;
    setIsSubmitting(true);
    try {
      await resolveConcurrencyConflictAction(activeConflict.id, 'overwrite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyMerged = async () => {
    if (!activeConflict) return;
    setIsSubmitting(true);
    try {
      const mergedPatch: Record<string, any> = {};
      diffRows.forEach((row) => {
        const pick = selectedSourceByField[row.key] || 'local';
        mergedPatch[row.key] = pick === 'server' ? row.serverVal : row.localVal;
      });
      await resolveConcurrencyConflictAction(activeConflict.id, 'merge', mergedPatch);
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleText = isAr
    ? 'تعارض في التعديلات المتزامنة'
    : isFr
    ? 'Conflit de modification concurrente'
    : 'Concurrent Edit Conflict';

  return (
    <Modal
      isOpen={Boolean(rawConflict)}
      onClose={() => activeConflict && dismissConcurrencyConflictAction(activeConflict.id)}
      title={titleText}
      maxWidth="xl"
    >
      {activeConflict && (
      <div className="flex flex-col gap-[var(--s4,16px)]">
        {/* Inline conflict metadata */}
        <div className="flex flex-wrap items-center justify-between gap-[var(--s2,8px)] pb-[var(--s3,12px)] border-b border-[var(--atr-line)] t-cap text-[var(--atr-ink-3)]">
          <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
            <AlertTriangle size={16} strokeWidth={1.5} className="text-[var(--atr-acc)] shrink-0" />
            <span className="t-small font-semibold text-[var(--atr-ink)]">
              {activeConflict.entityLabel || activeConflict.entityType || activeConflict.table}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {isAr ? 'نسختك' : isFr ? 'Votre base' : 'Your Base'} v{activeConflict.expectedVersion}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-[var(--atr-acc-text)] font-semibold">
              {isAr ? 'نسخة الخادم' : isFr ? 'Serveur' : 'Server'} v{activeConflict.serverVersion}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {new Date(activeConflict.detectedAt).toLocaleTimeString()}
            </span>
          </div>
          {conflicts.length > 1 && (
            <span className="tabular-nums t-cap text-[var(--atr-ink-4)]">
              1 / {conflicts.length} {isAr ? 'تعارضات معلقة' : isFr ? 'en attente' : 'pending'}
            </span>
          )}
        </div>

        {/* Field diff rows using branded LiveSegmentedControl */}
        {diffRows.length === 0 ? (
          <div
            data-sq="card"
            style={{ '--sq-stroke': 'var(--atr-line)' } as React.CSSProperties}
            className="p-[var(--s4,16px)] bg-[#F5F1EC] dark:bg-[#292624] t-body text-[var(--atr-ink-3)]"
          >
            {isAr
              ? 'تم تحديث رقم النسخة على الخادم دون اختلاف في الحقول المرئية. يمكنك إعادة الحفظ أو اعتماد نسخة الخادم.'
              : isFr
              ? 'La version serveur a progressé sans divergence visible sur les champs. Vous pouvez écraser ou recharger la version serveur.'
              : 'The server version advanced with no visible field divergence. You may safely reload the server version or re-submit your save.'}
          </div>
        ) : (
          <div
            data-sq="table"
            style={{ '--sq-stroke': 'var(--atr-line)' } as React.CSSProperties}
            className="overflow-hidden bg-[#F5F1EC] dark:bg-[#292624] divide-y divide-[var(--atr-line)]"
          >
            {diffRows.map((row) => {
              const picked = selectedSourceByField[row.key] || 'local';
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-[var(--s3,12px)] px-[var(--s4,16px)] py-[var(--s3,12px)] items-center"
                >
                  <div className="sm:col-span-4 t-label text-[var(--atr-ink)] truncate" title={row.label}>
                    {row.label}
                  </div>
                  <div className="sm:col-span-8 min-w-0">
                    <LiveSegmentedControl
                      size="sm"
                      fullWidth
                      className="min-w-0 [&>button]:min-w-0 [&>button]:truncate"
                      aria-label={row.label}
                      value={picked}
                      onValueChange={(val) =>
                        setSelectedSourceByField((prev) => ({
                          ...prev,
                          [row.key]: val as 'local' | 'server',
                        }))
                      }
                      options={[
                        {
                          value: 'local',
                          label: `${isAr ? 'نسختك: ' : isFr ? 'Moi: ' : 'Mine: '}${row.localStr}`,
                        },
                        {
                          value: 'server',
                          label: `${isAr ? 'الخادم: ' : isFr ? 'Serveur: ' : 'Server: '}${row.serverStr}`,
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resolution actions */}
        <div className="flex flex-wrap items-center justify-between gap-[var(--s3,12px)] pt-[var(--s3,12px)] border-t border-[var(--atr-line)]">
          <AtriumButton
            type="button"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            icon={<RotateCcw size={16} strokeWidth={1.5} />}
            onClick={handleKeepServer}
          >
            {isAr ? 'اعتماد نسخة الخادم' : isFr ? 'Garder la version serveur' : 'Keep Server Version'}
          </AtriumButton>

          <div className="flex flex-wrap items-center gap-[var(--s3,12px)]">
            {diffRows.length > 0 && (
              <AtriumButton
                type="button"
                variant="secondary"
                size="md"
                disabled={isSubmitting}
                icon={<GitMerge size={16} strokeWidth={1.5} />}
                onClick={handleApplyMerged}
              >
                {isAr ? 'دمج الحقول المختارة' : isFr ? 'Appliquer la sélection' : 'Apply Selected Fields'}
              </AtriumButton>
            )}

            <AtriumButton
              type="button"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              icon={<Upload size={16} strokeWidth={1.5} />}
              onClick={handleOverwriteMine}
            >
              {isAr ? 'حفظ تعديلاتي' : isFr ? 'Écraser avec mes modifications' : 'Overwrite with Mine'}
            </AtriumButton>
          </div>
        </div>
      </div>
      )}
    </Modal>
  );
};
