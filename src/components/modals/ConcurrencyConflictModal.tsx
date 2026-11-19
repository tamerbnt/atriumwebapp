import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, GitMerge, RotateCcw, Upload, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
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
  const activeConflict = conflicts[0] || null;

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

  if (!activeConflict) return null;

  const handleKeepServer = async () => {
    setIsSubmitting(true);
    try {
      await resolveConcurrencyConflictAction(activeConflict.id, 'server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverwriteMine = async () => {
    setIsSubmitting(true);
    try {
      await resolveConcurrencyConflictAction(activeConflict.id, 'overwrite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyMerged = async () => {
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

  const subtitleText = `${activeConflict.entityLabel || activeConflict.entityType || activeConflict.table} · ${
    isAr ? 'تم تعديل هذا السجل من جهاز آخر أثناء التحرير' : isFr ? 'Cet enregistrement a été modifié ailleurs pendant votre édition' : 'This record was modified elsewhere while you were editing'
  }`;

  return (
    <Modal
      isOpen={Boolean(activeConflict)}
      onClose={() => dismissConcurrencyConflictAction(activeConflict.id)}
      title={titleText}
      subtitle={subtitleText}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Unboxed inline conflict metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--atr-line)] text-xs text-[var(--atr-ink-3)]">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle size={15} className="text-[var(--atr-acc)] shrink-0" />
            <span className="font-semibold text-[var(--atr-ink)]">
              {activeConflict.entityType || activeConflict.table}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {isAr ? 'نسختك' : isFr ? 'Votre base' : 'Your Base'} v{activeConflict.expectedVersion}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[var(--atr-acc-text)] font-semibold">
              {isAr ? 'نسخة الخادم' : isFr ? 'Serveur' : 'Server'} v{activeConflict.serverVersion}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {new Date(activeConflict.detectedAt).toLocaleTimeString()}
            </span>
          </div>
          {conflicts.length > 1 && (
            <span className="font-mono tabular-nums text-[11px] text-[var(--atr-ink-4)]">
              1 / {conflicts.length} {isAr ? 'تعارضات معلقة' : isFr ? 'en attente' : 'pending'}
            </span>
          )}
        </div>

        {/* Side-by-side field diff table */}
        {diffRows.length === 0 ? (
          <div className="p-4 rounded-xl bg-[var(--atr-soft)] border border-[var(--atr-line)] text-xs text-[var(--atr-ink-3)]">
            {isAr
              ? 'تم تحديث رقم النسخة على الخادم دون اختلاف في الحقول المرئية. يمكنك إعادة الحفظ أو اعتماد نسخة الخادم.'
              : isFr
              ? 'La version serveur a progressé sans divergence visible sur les champs. Vous pouvez écraser ou recharger la version serveur.'
              : 'The server version advanced with no visible field divergence. You may safely reload the server version or re-submit your save.'}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--atr-line)] overflow-hidden bg-[var(--atr-card)]">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-[var(--atr-soft)] border-b border-[var(--atr-line)] text-[11px] font-semibold text-[var(--atr-ink-3)]">
              <div className="col-span-4">
                {isAr ? 'الحقل' : isFr ? 'Champ' : 'Field'}
              </div>
              <div className="col-span-4">
                {isAr ? 'تعديلاتك غير المحفوظة' : isFr ? 'Vos modifications' : 'Your Unsaved Edits'}
              </div>
              <div className="col-span-4">
                {isAr ? 'أحدث نسخة على الخادم' : isFr ? 'Dernier état serveur' : 'Latest Server State'}
              </div>
            </div>

            <div className="divide-y divide-[var(--atr-line)] max-h-[300px] overflow-y-auto">
              {diffRows.map((row) => {
                const picked = selectedSourceByField[row.key] || 'local';
                return (
                  <div
                    key={row.key}
                    className="grid grid-cols-12 gap-3 px-4 py-2.5 items-center text-xs"
                  >
                    <div className="col-span-4 font-medium text-[var(--atr-ink)] truncate" title={row.label}>
                      {row.label}
                    </div>

                    <div className="col-span-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSourceByField((prev) => ({ ...prev, [row.key]: 'local' }))
                        }
                        className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          picked === 'local'
                            ? 'border-[var(--atr-acc)] bg-[var(--atr-hl)] text-[var(--atr-ink)] font-semibold'
                            : 'border-[var(--atr-line)] bg-transparent text-[var(--atr-ink-3)] hover:text-[var(--atr-ink)]'
                        }`}
                      >
                        <span className="truncate font-mono text-[11px] tabular-nums" title={row.localStr}>
                          {row.localStr}
                        </span>
                        {picked === 'local' && <Check size={13} className="text-[var(--atr-acc)] shrink-0" />}
                      </button>
                    </div>

                    <div className="col-span-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSourceByField((prev) => ({ ...prev, [row.key]: 'server' }))
                        }
                        className={`w-full text-left rtl:text-right px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          picked === 'server'
                            ? 'border-[var(--atr-acc)] bg-[var(--atr-hl)] text-[var(--atr-ink)] font-semibold'
                            : 'border-[var(--atr-line)] bg-transparent text-[var(--atr-ink-3)] hover:text-[var(--atr-ink)]'
                        }`}
                      >
                        <span className="truncate font-mono text-[11px] tabular-nums" title={row.serverStr}>
                          {row.serverStr}
                        </span>
                        {picked === 'server' && <Check size={13} className="text-[var(--atr-acc)] shrink-0" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resolution actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--atr-line)]">
          <AtriumButton
            type="button"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            icon={<RotateCcw size={14} />}
            onClick={handleKeepServer}
          >
            {isAr ? 'اعتماد نسخة الخادم' : isFr ? 'Garder la version serveur' : 'Keep Server Version'}
          </AtriumButton>

          <div className="flex flex-wrap items-center gap-2.5">
            {diffRows.length > 0 && (
              <AtriumButton
                type="button"
                variant="secondary"
                size="md"
                disabled={isSubmitting}
                icon={<GitMerge size={14} />}
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
              icon={<Upload size={14} />}
              onClick={handleOverwriteMine}
            >
              {isAr ? 'حفظ تعديلاتي' : isFr ? 'Écraser avec mes modifications' : 'Overwrite with Mine'}
            </AtriumButton>
          </div>
        </div>
      </div>
    </Modal>
  );
};
