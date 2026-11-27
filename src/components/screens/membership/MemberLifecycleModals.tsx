import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  Copy,
  PauseCircle,
  PlayCircle,
  Printer,
  QrCode,
  RotateCcw,
  X,
} from 'lucide-react';
import { Button } from '@/atrium/core';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import type {
  GymMemberFreezeLog,
  Member,
  MemberCheckInLog,
  MembershipPlan,
} from '../../../types/index';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import {
  buildMemberQrPayload,
  calculateMidCyclePlanSwitch,
  DEFAULT_FREEZE_POLICY,
  evaluateMemberFreeze,
  evaluateMemberResume,
  evaluateUnusedSessionRefund,
  generateQrMatrix21x21,
} from '../../../utils/membershipDepth';
import { formatMoney } from '../../../utils/rules';

type Locale = 'en' | 'fr' | 'ar';

const pickL = (locale: Locale, en: string, fr: string, ar: string) =>
  locale === 'ar' ? ar : locale === 'en' ? en : fr;

/* ============================================================================
 * 1. Member Freeze / Resume Modal
 * ============================================================================ */
export interface MemberFreezeModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  checkInLogs: MemberCheckInLog[];
  freezeLogs: GymMemberFreezeLog[];
  locale: Locale;
  onFreeze: (params: {
    memberId: string;
    daysRequested: number;
    feeCentimes?: number;
    allowDuringActiveCheckIn?: boolean;
    overrideReason?: string;
  }) => { allowed: boolean; error?: string };
  onResume: (memberId: string) => { allowed: boolean; error?: string; extendedExpiryDate?: string; actualFrozenDays?: number };
  showToast: (msg: string) => void;
}

export const MemberFreezeModal: React.FC<MemberFreezeModalProps> = ({
  isOpen,
  onClose,
  member,
  checkInLogs,
  freezeLogs,
  locale,
  onFreeze,
  onResume,
  showToast,
}) => {
  const isFrozen = member.status === 'Frozen';
  const [daysRequested, setDaysRequested] = useState('7');
  const [feeDzd, setFeeDzd] = useState(
    String(centimesToDzd(DEFAULT_FREEZE_POLICY.defaultFreezeFeeCentimes))
  );
  const [allowActiveOverride, setAllowActiveOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDaysRequested('7');
      setFeeDzd(String(centimesToDzd(DEFAULT_FREEZE_POLICY.defaultFreezeFeeCentimes)));
      setAllowActiveOverride(false);
      setOverrideReason('');
    }
  }, [isOpen, member.id]);

  const freezePreview = useMemo(() => {
    if (isFrozen) return null;
    return evaluateMemberFreeze({
      member,
      checkInLogs,
      daysRequested: Math.max(1, parseInt(daysRequested, 10) || 0),
      feeCentimes: dzdToCentimes(Math.max(0, parseFloat(feeDzd) || 0)),
      allowDuringActiveCheckIn: allowActiveOverride,
      overrideReason: overrideReason.trim() || undefined,
    });
  }, [isFrozen, member, checkInLogs, daysRequested, feeDzd, allowActiveOverride, overrideReason]);

  const resumePreview = useMemo(() => {
    if (!isFrozen) return null;
    return evaluateMemberResume({
      member,
      autoExtendExpiryOnResume: DEFAULT_FREEZE_POLICY.autoExtendExpiryOnResume,
    });
  }, [isFrozen, member]);

  const memberHistory = useMemo(
    () => freezeLogs.filter((l) => l.memberId === member.id).slice(0, 5),
    [freezeLogs, member.id]
  );

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFrozen) {
      const res = onResume(member.id);
      if (res.allowed) {
        showToast(
          pickL(
            locale,
            `Subscription resumed (+${res.actualFrozenDays ?? 0}d extended to ${res.extendedExpiryDate})`,
            `Abonnement réactivé (+${res.actualFrozenDays ?? 0}j prolongé au ${res.extendedExpiryDate})`,
            `تم استئناف الاشتراك (تمديد +${res.actualFrozenDays ?? 0} يوم حتى ${res.extendedExpiryDate})`
          )
        );
        onClose();
      }
      return;
    }

    if (freezePreview?.error === 'ACTIVE_CHECKIN_WINDOW' && !allowActiveOverride) {
      showToast(
        pickL(
          locale,
          'Member checked in within 2 hours — enable active-window override and enter a reason.',
          'Adhérent badgé depuis moins de 2h — activez la dérogation avec un motif.',
          'تم تسجيل دخول العضو خلال ساعتين — فعّل الاستثناء وأدخل السبب.'
        )
      );
      return;
    }

    if (freezePreview?.duringActiveCheckInWindow && allowActiveOverride && !overrideReason.trim()) {
      showToast(
        pickL(
          locale,
          'Override reason is required during an active check-in window.',
          'Un motif est requis pour geler pendant une séance active.',
          'يجب ذكر سبب التجاوز أثناء فترة الدخول النشطة.'
        )
      );
      return;
    }

    const res = onFreeze({
      memberId: member.id,
      daysRequested: Math.max(1, parseInt(daysRequested, 10) || 1),
      feeCentimes: dzdToCentimes(Math.max(0, parseFloat(feeDzd) || 0)),
      allowDuringActiveCheckIn: allowActiveOverride,
      overrideReason: overrideReason.trim() || undefined,
    });

    if (res.allowed) {
      showToast(
        pickL(
          locale,
          `Membership frozen for ${daysRequested} day(s)`,
          `Abonnement gelé pour ${daysRequested} jour(s)`,
          `تم تجميد الاشتراك لمدة ${daysRequested} يوم`
        )
      );
      onClose();
    } else {
      showToast(res.error || 'FREEZE_BLOCKED');
    }
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      zIndexClass="z-[70]"
      scrimClassName="bg-[#1F1D1B]/45"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        data-testid="member-freeze-modal"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 max-h-[90vh] overflow-y-auto space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-10 h-10 bg-[#d4522f]/12 text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] grid place-items-center shrink-0"
            >
              {isFrozen ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="t-card font-semibold text-black dark:text-white">
                {isFrozen
                  ? pickL(locale, 'Resume Membership', 'Reprendre l’abonnement', 'استئناف الاشتراك')
                  : pickL(locale, 'Freeze Membership', 'Geler l’abonnement', 'تجميد الاشتراك')}
              </h3>
              <p className="t-cap text-black/62 dark:text-white/65">{member.fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={pickL(locale, 'Close', 'Fermer', 'إغلاق')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/65 dark:text-white/70 hover:bg-[#F3EDE7] dark:hover:bg-[#332F2B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          {isFrozen && resumePreview ? (
            <div
              data-sq="card"
              data-sq-border="none"
              className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2 t-small"
            >
              <div className="flex justify-between">
                <span className="text-black/65 dark:text-white/65">
                  {pickL(locale, 'Frozen since', 'Gelé depuis', 'مجمد منذ')}
                </span>
                <b className="tabular-nums">{(member.frozenAt || '').slice(0, 10) || '—'}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-black/65 dark:text-white/65">
                  {pickL(locale, 'Days frozen', 'Jours de gel', 'أيام التجميد')}
                </span>
                <b className="tabular-nums">{resumePreview.actualFrozenDays}d</b>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--atr-divider)]">
                <span className="text-black/65 dark:text-white/65">
                  {pickL(locale, 'Extended expiry', 'Nouvelle échéance', 'تاريخ الانتهاء الجديد')}
                </span>
                <b className="tabular-nums text-[#096b40] dark:text-[#5BE3A3]">
                  {resumePreview.extendedExpiryDate}
                </b>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="freezeDays"
                  label={pickL(locale, 'Freeze Days', 'Jours de gel', 'أيام التجميد')}
                  type="number"
                  value={daysRequested}
                  onChange={setDaysRequested}
                  required
                />
                <LabelInput
                  field="freezeFee"
                  label={pickL(locale, 'Admin Fee (DZD)', 'Frais de gel (DZD)', 'رسوم التجميد (دج)')}
                  type="number"
                  value={feeDzd}
                  onChange={setFeeDzd}
                />
              </div>

              <div
                data-sq="card"
                data-sq-border="none"
                className="bg-[#F5F1EC] dark:bg-[#22201E] p-3.5 space-y-1.5 t-cap"
              >
                <div className="flex justify-between">
                  <span className="text-black/65 dark:text-white/65">
                    {pickL(locale, 'Freeze allowance used', 'Quota utilisé', 'الرصيد المستخدم')}
                  </span>
                  <b className="tabular-nums">
                    {member.freezeDaysUsed || 0} / {DEFAULT_FREEZE_POLICY.maxFreezeDaysPerCycle}{' '}
                    {pickL(locale, 'days', 'jours', 'يوم')}
                  </b>
                </div>
                {freezePreview && (
                  <div className="flex justify-between">
                    <span className="text-black/65 dark:text-white/65">
                      {pickL(locale, 'Freeze until', 'Fin de gel estimée', 'نهاية التجميد')}
                    </span>
                    <b className="tabular-nums">{freezePreview.freezeUntilIso}</b>
                  </div>
                )}
              </div>

              {freezePreview?.duringActiveCheckInWindow && (
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  className="bg-amber-50/90 dark:bg-amber-950/35 [--sq-stroke:#FCD34D] p-3.5 space-y-2.5"
                >
                  <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 t-small">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {pickL(
                        locale,
                        'Active check-in detected in the last 120 min. Confirm override and document reason.',
                        'Passage détecté dans les 120 dernières minutes. Dérogation et motif requis.',
                        'يوجد دخول نشط خلال آخر 120 دقيقة. يجب تأكيد الاستثناء وكتابة السبب.'
                      )}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 t-small font-medium cursor-pointer text-black dark:text-white">
                    <input
                      type="checkbox"
                      checked={allowActiveOverride}
                      onChange={(e) => setAllowActiveOverride(e.target.checked)}
                      className="rounded accent-[#d4522f]"
                    />
                    <span>
                      {pickL(
                        locale,
                        'Allow freeze during active check-in',
                        'Autoriser le gel malgré le passage actif',
                        'السماح بالتجميد رغم الحضور النشط'
                      )}
                    </span>
                  </label>
                  {allowActiveOverride && (
                    <LabelInput
                      field="freezeOverrideReason"
                      label={pickL(locale, 'Override reason', 'Motif de dérogation', 'سبب التجاوز')}
                      value={overrideReason}
                      onChange={setOverrideReason}
                      placeholder={pickL(locale, 'Injury / Medical note', 'Blessure / Certificat', 'إصابة / مبرر طبي')}
                      required
                    />
                  )}
                </div>
              )}

              {freezePreview?.error === 'EXCEEDS_MAX_FREEZE_DAYS' && (
                <p className="t-small text-[#c0283d] dark:text-[#FF8D7A] font-medium">
                  {pickL(
                    locale,
                    `Exceeds maximum ${DEFAULT_FREEZE_POLICY.maxFreezeDaysPerCycle} days per cycle.`,
                    `Dépasse le plafond de ${DEFAULT_FREEZE_POLICY.maxFreezeDaysPerCycle} jours par cycle.`,
                    `يتجاوز الحد الأقصى (${DEFAULT_FREEZE_POLICY.maxFreezeDaysPerCycle} يوماً لكل دورة).`
                  )}
                </p>
              )}
              {freezePreview?.error === 'INVALID_STATUS' && (
                <p className="t-small text-[#c0283d] dark:text-[#FF8D7A] font-medium">
                  {pickL(
                    locale,
                    'Only active members can be frozen.',
                    'Seuls les adhérents actifs peuvent être gelés.',
                    'يمكن تجميد الأعضاء النشطين فقط.'
                  )}
                </p>
              )}
            </>
          )}

          {memberHistory.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--atr-divider)]">
              <div className="t-cap font-semibold text-black/62 dark:text-white/65">
                {pickL(locale, 'Freeze Audit History', 'Historique des gels', 'سجل التجميد')}
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {memberHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex justify-between items-center text-xs py-1 text-black/80 dark:text-white/80"
                  >
                    <span>
                      {h.action === 'freeze'
                        ? pickL(locale, 'Frozen', 'Gelé', 'تجميد')
                        : pickL(locale, 'Resumed', 'Repris', 'استئناف')}{' '}
                      · {h.daysFrozen}d
                    </span>
                    <span className="tabular-nums text-black/55 dark:text-white/55">
                      {h.recordedAt.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {pickL(locale, 'Cancel', 'Annuler', 'إلغاء')}
            </Button>
            <Button
              type="submit"
              tone="accent"
              size={40}
              disabled={
                !isFrozen &&
                (!freezePreview ||
                  (!freezePreview.allowed &&
                    freezePreview.error !== 'ACTIVE_CHECKIN_WINDOW') ||
                  (freezePreview.error === 'ACTIVE_CHECKIN_WINDOW' &&
                    (!allowActiveOverride || !overrideReason.trim())))
              }
            >
              {isFrozen
                ? pickL(locale, 'Confirm Resume', 'Confirmer la reprise', 'تأكيد الاستئناف')
                : pickL(locale, 'Confirm Freeze', 'Confirmer le gel', 'تأكيد التجميد')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

/* ============================================================================
 * 2. Mid-Cycle Plan Switch Modal
 * ============================================================================ */
export interface MemberPlanSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  plans: MembershipPlan[];
  locale: Locale;
  onSwitchPlan: (memberId: string, targetPlanId: string) => ReturnType<typeof calculateMidCyclePlanSwitch> | null;
  showToast: (msg: string) => void;
}

export const MemberPlanSwitchModal: React.FC<MemberPlanSwitchModalProps> = ({
  isOpen,
  onClose,
  member,
  plans,
  locale,
  onSwitchPlan,
  showToast,
}) => {
  const activePlans = useMemo(() => plans.filter((p) => p.isActive), [plans]);
  const [targetPlanId, setTargetPlanId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const other = activePlans.find((p) => p.id !== member.membershipPlanId) || activePlans[0];
      setTargetPlanId(other?.id || '');
    }
  }, [isOpen, activePlans, member.membershipPlanId]);

  const currentPlan = useMemo(
    () =>
      plans.find(
        (p) => p.id === member.membershipPlanId || p.name === member.membershipPlanName
      ),
    [plans, member.membershipPlanId, member.membershipPlanName]
  );

  const targetPlan = useMemo(
    () => activePlans.find((p) => p.id === targetPlanId) || null,
    [activePlans, targetPlanId]
  );

  const preview = useMemo(() => {
    if (!targetPlan) return null;
    return calculateMidCyclePlanSwitch({ member, currentPlan, targetPlan });
  }, [member, currentPlan, targetPlan]);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPlanId) return;
    const result = onSwitchPlan(member.id, targetPlanId);
    if (result) {
      showToast(
        pickL(
          locale,
          `Plan switched to ${targetPlan?.name} (net delta ${formatMoney(centimesToDzd(result.netDeltaCentimes), 'DZD')})`,
          `Formule changée vers ${targetPlan?.name} (solde ${formatMoney(centimesToDzd(result.netDeltaCentimes), 'DZD')})`,
          `تم تغيير الباقة إلى ${targetPlan?.name}`
        )
      );
      onClose();
    }
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      zIndexClass="z-[70]"
      scrimClassName="bg-[#1F1D1B]/45"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        data-testid="member-plan-switch-modal"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-10 h-10 bg-[#d4522f]/12 text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] grid place-items-center shrink-0"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="t-card font-semibold text-black dark:text-white">
                {pickL(locale, 'Mid-Cycle Plan Switch', 'Changement de formule prorata', 'تغيير الباقة أثناء الدورة')}
              </h3>
              <p className="t-cap text-black/62 dark:text-white/65">{member.fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={pickL(locale, 'Close', 'Fermer', 'إغلاق')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/65 dark:text-white/70 hover:bg-[#F3EDE7] dark:hover:bg-[#332F2B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <LabelSelect
            field="targetPlan"
            label={pickL(locale, 'New Membership Plan', 'Nouvelle formule', 'الباقة الجديدة')}
            value={targetPlanId}
            onChange={setTargetPlanId}
            options={activePlans.map((p) => ({
              value: p.id,
              label: p.name,
              sublabel: `${(p.price?.amount ?? 0).toLocaleString()} DZD · ${p.durationDays}j`,
            }))}
          />

          {preview && (
            <div
              data-sq="card"
              data-sq-border="none"
              className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2 t-small"
            >
              <div className="flex justify-between">
                <span className="text-black/65 dark:text-white/65">
                  {pickL(locale, 'Prorated credit', 'Crédit prorata restant', 'رصيد التعديل المتبقي')}
                </span>
                <b className="tabular-nums text-[#096b40] dark:text-[#5BE3A3]">
                  -{formatMoney(centimesToDzd(preview.creditRemainingCentimes), 'DZD')}
                </b>
              </div>
              <div className="flex justify-between">
                <span className="text-black/65 dark:text-white/65">
                  {pickL(locale, 'Target plan price', 'Tarif nouvelle formule', 'سعر الباقة الجديدة')}
                </span>
                <b className="tabular-nums">
                  {formatMoney(centimesToDzd(preview.newPlanPriceCentimes), 'DZD')}
                </b>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--atr-divider)]">
                <span className="font-semibold">
                  {preview.netDeltaCentimes >= 0
                    ? pickL(locale, 'Net balance to charge', 'Différence à régler', 'الفرق المستحق')
                    : pickL(locale, 'Net credit avoir', 'Avoir en faveur adhérent', 'رصيد فائض للعضو')}
                </span>
                <b className="tabular-nums text-[var(--atr-acc,#d4522f)]">
                  {formatMoney(centimesToDzd(Math.abs(preview.netDeltaCentimes)), 'DZD')}
                </b>
              </div>
              <div className="flex justify-between text-xs text-black/62 dark:text-white/62 pt-1">
                <span>
                  {pickL(locale, 'New expiry', 'Échéance', 'الانتهاء')}: {preview.nextExpirationDate}
                </span>
                <span>
                  {pickL(locale, 'Sessions', 'Séances', 'الحصص')}: {preview.nextRemainingSessions}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {pickL(locale, 'Cancel', 'Annuler', 'إلغاء')}
            </Button>
            <Button type="submit" tone="accent" size={40} disabled={!targetPlanId}>
              {pickL(locale, 'Apply Plan Switch', 'Valider le changement', 'تأكيد تغيير الباقة')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

/* ============================================================================
 * 3. Unused Session Refund Modal
 * ============================================================================ */
export interface MemberSessionRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  plans: MembershipPlan[];
  locale: Locale;
  onRefundSessions: (
    memberId: string,
    sessionsToRefund: number,
    adminFeeCentimes?: number
  ) => ReturnType<typeof evaluateUnusedSessionRefund> | { allowed: false; error: string };
  showToast: (msg: string) => void;
}

export const MemberSessionRefundModal: React.FC<MemberSessionRefundModalProps> = ({
  isOpen,
  onClose,
  member,
  plans,
  locale,
  onRefundSessions,
  showToast,
}) => {
  const [sessionsCount, setSessionsCount] = useState('1');
  const [adminFeeDzd, setAdminFeeDzd] = useState('0');

  useEffect(() => {
    if (isOpen) {
      setSessionsCount(String(Math.min(Math.max(1, member.remainingSessions || 1), 1)));
      setAdminFeeDzd('0');
    }
  }, [isOpen, member.id, member.remainingSessions]);

  const currentPlan = useMemo(
    () =>
      plans.find(
        (p) => p.id === member.membershipPlanId || p.name === member.membershipPlanName
      ),
    [plans, member.membershipPlanId, member.membershipPlanName]
  );

  const preview = useMemo(
    () =>
      evaluateUnusedSessionRefund({
        member,
        plan: currentPlan,
        sessionsToRefund: parseInt(sessionsCount, 10) || 0,
        adminFeeCentimes: dzdToCentimes(Math.max(0, parseFloat(adminFeeDzd) || 0)),
      }),
    [member, currentPlan, sessionsCount, adminFeeDzd]
  );

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onRefundSessions(
      member.id,
      parseInt(sessionsCount, 10) || 0,
      dzdToCentimes(Math.max(0, parseFloat(adminFeeDzd) || 0))
    );
    if (res.allowed) {
      showToast(
        pickL(
          locale,
          `Refunded ${res.refundableSessions} session(s) · Net ${formatMoney(centimesToDzd(res.netRefundCentimes), 'DZD')}`,
          `Remboursement de ${res.refundableSessions} séance(s) · Net ${formatMoney(centimesToDzd(res.netRefundCentimes), 'DZD')}`,
          `تم استرداد ${res.refundableSessions} حصص`
        )
      );
      onClose();
    } else {
      showToast(res.error || 'REFUND_BLOCKED');
    }
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      zIndexClass="z-[70]"
      scrimClassName="bg-[#1F1D1B]/45"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        data-testid="member-session-refund-modal"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-10 h-10 bg-[#d4522f]/12 text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] grid place-items-center shrink-0"
            >
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="t-card font-semibold text-black dark:text-white">
                {pickL(locale, 'Refund Unused Sessions', 'Remboursement séances', 'استرداد الحصص المتبقية')}
              </h3>
              <p className="t-cap text-black/62 dark:text-white/65">
                {member.fullName} · {member.remainingSessions ?? 0}{' '}
                {pickL(locale, 'left', 'restantes', 'متبقية')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={pickL(locale, 'Close', 'Fermer', 'إغلاق')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/65 dark:text-white/70 hover:bg-[#F3EDE7] dark:hover:bg-[#332F2B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="sessionsToRefund"
              label={pickL(locale, 'Sessions to Refund', 'Séances à rembourser', 'الحصص المستردة')}
              type="number"
              value={sessionsCount}
              onChange={setSessionsCount}
              required
            />
            <LabelInput
              field="refundAdminFee"
              label={pickL(locale, 'Admin Fee (DZD)', 'Frais de dossier (DZD)', 'رسوم إدارية (دج)')}
              type="number"
              value={adminFeeDzd}
              onChange={setAdminFeeDzd}
            />
          </div>

          <div
            data-sq="card"
            data-sq-border="none"
            className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2 t-small"
          >
            {preview.allowed ? (
              <>
                <div className="flex justify-between">
                  <span className="text-black/65 dark:text-white/65">
                    {pickL(locale, 'Gross refund', 'Montant brut', 'المبلغ الإجمالي')}
                  </span>
                  <b className="tabular-nums">
                    {formatMoney(centimesToDzd(preview.grossRefundCentimes), 'DZD')}
                  </b>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/65 dark:text-white/65">
                    {pickL(locale, 'Remaining after refund', 'Séances restantes après', 'الحصص بعد الاسترداد')}
                  </span>
                  <b className="tabular-nums">{preview.remainingAfterRefund}</b>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--atr-divider)] font-semibold">
                  <span>{pickL(locale, 'Net Refund', 'Net à rembourser', 'الصافي للاسترداد')}</span>
                  <b className="tabular-nums text-[#096b40] dark:text-[#5BE3A3]">
                    {formatMoney(centimesToDzd(preview.netRefundCentimes), 'DZD')}
                  </b>
                </div>
              </>
            ) : (
              <p className="text-[#c0283d] dark:text-[#FF8D7A] font-medium">
                {preview.error === 'NO_REFUNDABLE_PLAN'
                  ? pickL(
                      locale,
                      'Configure plan price and session quota in Settings to compute unit session value.',
                      'Définissez un forfait avec quota et prix dans Paramètres pour calculer le remboursement.',
                      'يجب ضبط سعر وحصص الباقة لحساب قيمة الاسترداد.'
                    )
                  : pickL(
                      locale,
                      'Enter a session count within the member remaining balance.',
                      'Saisissez un nombre de séances valide dans le solde disponible.',
                      'أدخل عدد حصص صالح ضمن الرصيد المتبقي.'
                    )}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {pickL(locale, 'Cancel', 'Annuler', 'إلغاء')}
            </Button>
            <Button type="submit" tone="accent" size={40} disabled={!preview.allowed}>
              {pickL(locale, 'Confirm Refund', 'Confirmer le remboursement', 'تأكيد الاسترداد')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

/* ============================================================================
 * 4. Member QR Pass Badge Modal (21x21 Deterministic Matrix)
 * ============================================================================ */
export interface MemberQrPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  branchName?: string;
  locale: Locale;
  showToast: (msg: string) => void;
}

export const MemberQrPassModal: React.FC<MemberQrPassModalProps> = ({
  isOpen,
  onClose,
  member,
  branchName,
  locale,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const qrPayload = useMemo(() => member.qrToken || buildMemberQrPayload(member), [member]);
  const matrix = useMemo(() => generateQrMatrix21x21(qrPayload), [qrPayload]);

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(qrPayload);
    } catch {
      // ignore clipboard restriction
    }
    setCopied(true);
    showToast(`${pickL(locale, 'QR token copied', 'Code QR copié', 'تم نسخ الرمز')}: ${qrPayload}`);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      zIndexClass="z-[70]"
      scrimClassName="bg-[#1F1D1B]/45"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        data-testid="member-qr-pass-modal"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 text-center space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-left rtl:text-right">
            <QrCode className="w-5 h-5 text-[var(--atr-acc,#d4522f)]" />
            <h3 className="t-card font-semibold text-black dark:text-white">
              {pickL(locale, 'Member QR Pass', 'Badge QR Adhérent', 'بطاقة QR للعضو')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={pickL(locale, 'Close', 'Fermer', 'إغلاق')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/65 dark:text-white/70 hover:bg-[#F3EDE7] dark:hover:bg-[#332F2B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="inline-block p-4 rounded-2xl bg-white border border-black/10 shadow-sm">
          <svg
            viewBox="0 0 21 21"
            className="w-44 h-44 mx-auto"
            role="img"
            aria-label={`QR Pass ${qrPayload}`}
          >
            <rect width="21" height="21" fill="#FFFFFF" />
            {matrix.map((row, r) =>
              row.map((on, c) =>
                on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111111" /> : null
              )
            )}
          </svg>
        </div>

        <div
          data-sq="card"
          data-sq-border="none"
          className="bg-[#F5F1EC] dark:bg-[#22201E] p-3.5 text-left rtl:text-right space-y-1 t-cap"
        >
          <div className="font-semibold text-black dark:text-white">{member.fullName}</div>
          <div className="text-black/65 dark:text-white/65">
            {member.membershipPlanName || 'Standard'} {branchName ? `· ${branchName}` : ''}
          </div>
          <div className="font-mono text-[11px] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] break-all pt-1">
            {qrPayload}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" tone="soft" size={40} className="flex-1" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {pickL(locale, 'Copy Code', 'Copier', 'نسخ')}
          </Button>
          <Button
            type="button"
            tone="accent"
            size={40}
            className="flex-1"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-1.5" />
            {pickL(locale, 'Print', 'Imprimer', 'طباعة')}
          </Button>
        </div>
      </div>
    </KineticModalShell>
  );
};
