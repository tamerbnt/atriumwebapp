import React, { useMemo, useState } from 'react';
import { GitMerge, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { Button } from '@/atrium/core';
import { planPartyMerge } from '../../../utils/crmPartyEngine';
import type { CrmParty } from '../../../types/index';
import {
  useAtriumActions,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentCrmPartyLinksFromState,
  selectCurrentCrmPartyNotesFromState,
  selectCurrentCrmFollowUpTasksFromState,
  selectCurrentCrmCommunicationLogsFromState,
} from '../../../services/store';

export interface CrmPartyMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceParty: CrmParty | null;
  targetParty: CrmParty | null;
  onMerged?: (targetPartyId: string) => void;
}

export const CrmPartyMergeModal: React.FC<CrmPartyMergeModalProps> = ({
  isOpen,
  onClose,
  sourceParty,
  targetParty,
  onMerged,
}) => {
  const { language, links, notes, tasks, comms } = useAtriumSelector(
    (s) => ({
      language: s.language,
      links: selectCurrentCrmPartyLinksFromState(s),
      notes: selectCurrentCrmPartyNotesFromState(s),
      tasks: selectCurrentCrmFollowUpTasksFromState(s),
      comms: selectCurrentCrmCommunicationLogsFromState(s),
    }),
    shallowEqualObjects
  );
  const { mergeCrmParties } = useAtriumActions();
  const [reason, setReason] = useState('Duplicate contact merged');
  const [swapped, setSwapped] = useState(false);

  const effectiveSource = swapped ? targetParty : sourceParty;
  const effectiveTarget = swapped ? sourceParty : targetParty;

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const plan = useMemo(() => {
    if (!effectiveSource || !effectiveTarget) return null;
    return planPartyMerge(effectiveSource, effectiveTarget, {
      links,
      notes,
      tasks,
      comms,
    });
  }, [effectiveSource, effectiveTarget, links, notes, tasks, comms]);

  const handleConfirm = () => {
    if (!effectiveSource || !effectiveTarget) return;
    const res = mergeCrmParties(effectiveSource.id, effectiveTarget.id, reason);
    if (res.ok) {
      onMerged?.(effectiveTarget.id);
      onClose();
    }
  };

  return (
    <KineticModalShell
      isOpen={isOpen && Boolean(effectiveSource && effectiveTarget)}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      dir={isAr ? 'rtl' : 'ltr'}
      ariaLabel={L('Merge duplicate CRM parties', 'Fusionner les fiches doublons', 'دمج ملفات العملاء المكررة')}
    >
      {effectiveSource && effectiveTarget && plan && (
        <div
          data-testid="crm-merge-modal"
          className="bg-white dark:bg-[#22201E] text-black dark:text-white rounded-3xl p-6 space-y-4 border border-black/10 dark:border-white/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--atr-hl,rgba(212,82,47,0.12))] text-[var(--atr-acc,#d4522f)] grid place-items-center">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold t-title m-0">
                  {L('Merge Duplicate Contacts', 'Fusionner deux fiches tiers', 'دمج ملفين مكررين')}
                </h3>
                <p className="t-small text-black/65 dark:text-white/65 m-0">
                  {L(
                    'All links, documents, payments, notes, tasks, and delivery logs move atomically to the primary profile.',
                    'Tous les liens, pièces, paiements, notes, tâches et journaux d’envoi sont transférés vers la fiche principale.',
                    'سيتم نقل جميع الروابط والفواتير والمدفوعات والملاحظات والمهام وسجل الإرسال تلقائياً إلى الملف الرئيسي.'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={L('Close', 'Fermer', 'إغلاق')}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 grid place-items-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FDE4DF]/60 dark:bg-[#3D1E1A]/60 border border-[#c0283d]/20">
              <span className="t-cap uppercase font-semibold text-[#c0283d] dark:text-[#FF8D7A] block mb-1">
                {L('Source (Archived)', 'Source (Archivée)', 'المصدر (مؤرشف)')}
              </span>
              <div className="font-semibold t-body">{effectiveSource.displayName}</div>
              <div className="t-small text-black/70 dark:text-white/70 tabular-nums">
                {effectiveSource.phoneE164 || effectiveSource.phoneRaw || '—'}
              </div>
              <div className="t-small text-black/65 dark:text-white/65 truncate">
                {effectiveSource.email || effectiveSource.nif || '—'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#DDF5E8]/70 dark:bg-[#143324]/70 border border-[#096b40]/20">
              <span className="t-cap uppercase font-semibold text-[#096b40] dark:text-[#5BE3A3] block mb-1">
                {L('Target (Primary)', 'Cible (Principale)', 'الهدف (الرئيسي)')}
              </span>
              <div className="font-semibold t-body">{effectiveTarget.displayName}</div>
              <div className="t-small text-black/70 dark:text-white/70 tabular-nums">
                {effectiveTarget.phoneE164 || effectiveTarget.phoneRaw || '—'}
              </div>
              <div className="t-small text-black/65 dark:text-white/65 truncate">
                {effectiveTarget.email || effectiveTarget.nif || '—'}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSwapped((v) => !v)}
              className="t-small font-semibold text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] hover:underline cursor-pointer"
            >
              {L('Swap source / target', 'Inverser source / cible', 'تبديل المصدر والهدف')}
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-[#2B2825] grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="t-kpi-s font-bold tabular-nums">{plan.linksMovedCount}</div>
              <div className="t-cap text-black/65 dark:text-white/65">{L('Links', 'Liens', 'روابط')}</div>
            </div>
            <div>
              <div className="t-kpi-s font-bold tabular-nums">{plan.notesMovedCount}</div>
              <div className="t-cap text-black/65 dark:text-white/65">{L('Notes', 'Notes', 'ملاحظات')}</div>
            </div>
            <div>
              <div className="t-kpi-s font-bold tabular-nums">{plan.tasksMovedCount}</div>
              <div className="t-cap text-black/65 dark:text-white/65">{L('Tasks', 'Tâches', 'مهام')}</div>
            </div>
            <div>
              <div className="t-kpi-s font-bold tabular-nums">{plan.commsMovedCount}</div>
              <div className="t-cap text-black/65 dark:text-white/65">{L('Messages', 'Messages', 'رسائل')}</div>
            </div>
          </div>

          {plan.mergedTarget.optOutAll && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 t-small">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {L(
                  'Opt-out preferences are strictly preserved on the merged profile.',
                  'Le refus de prospection (opt-out) de l’une des fiches est conservé sur la fiche fusionnée.',
                  'يتم الحفاظ على تفضيلات رفض الرسائل بعد الدمج.'
                )}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] t-small text-black/70 dark:text-white/70">
            <AlertTriangle className="w-4 h-4 text-[var(--atr-acc,#d4522f)] shrink-0" />
            <span>
              {L(
                'An immutable audit log entry is recorded for this merge.',
                'Une trace d’audit immuable est enregistrée pour cette fusion.',
                'يتم تسجيل سجل تدقيق غير قابل للتعديل لهذه العملية.'
              )}
            </span>
          </div>

          <LabelInput
            field="crmMergeReason"
            label={L('Audit Reason', 'Motif de fusion (audit)', 'سبب الدمج (التدقيق)')}
            value={reason}
            onChange={setReason}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {L('Cancel', 'Annuler', 'إلغاء')}
            </Button>
            <Button
              type="button"
              tone="accent"
              size={40}
              data-testid="crm-confirm-merge-btn"
              onClick={handleConfirm}
            >
              {L('Confirm Merge', 'Confirmer la fusion', 'تأكيد الدمج')}
            </Button>
          </div>
        </div>
      )}
    </KineticModalShell>
  );
};
