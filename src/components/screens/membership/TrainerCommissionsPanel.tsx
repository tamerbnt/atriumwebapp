import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Plus, Send, X } from 'lucide-react';
import { Button } from '@/atrium/core';
import {
  useAtriumActions,
  useAtriumSelector,
  selectCurrentTrainerCommissionsFromState,
  shallowEqualObjects,
  showToast,
} from '../../../services/store';
import type { StaffMember, StaffPayrollRunRecord } from '../../../types/index';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import { calculateTrainerCommissionCentimes } from '../../../utils/membershipDepth';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';

export interface TrainerCommissionsPanelProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  language: string;
}

export const TrainerCommissionsPanel: React.FC<TrainerCommissionsPanelProps> = ({
  staffList,
  payrollRuns,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { trainerCommissions } = useAtriumSelector(
    (s) => ({
      trainerCommissions: selectCurrentTrainerCommissionsFromState(s),
    }),
    shallowEqualObjects
  );
  const { recordTrainerCommission, postTrainerCommissionsToPayroll } = useAtriumActions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffId, setStaffId] = useState(() => staffList[0]?.id || '');
  const [sourceLabel, setSourceLabel] = useState('');
  const [grossDzd, setGrossDzd] = useState('5000');
  const [ratePct, setRatePct] = useState('15');

  const pendingCommissions = useMemo(
    () => trainerCommissions.filter((c) => c.status === 'pending'),
    [trainerCommissions]
  );

  const pendingTotalDzd = useMemo(
    () =>
      centimesToDzd(pendingCommissions.reduce((acc, c) => acc + c.commissionCentimes, 0)),
    [pendingCommissions]
  );

  const previewCommissionDzd = useMemo(() => {
    const grossCentimes = dzdToCentimes(Math.max(0, parseFloat(grossDzd) || 0));
    const bps = Math.round(Math.max(0, parseFloat(ratePct) || 0) * 100);
    return centimesToDzd(calculateTrainerCommissionCentimes(grossCentimes, bps));
  }, [grossDzd, ratePct]);

  const activeDraftRun = useMemo(
    () => payrollRuns.find((r) => r.status === 'draft'),
    [payrollRuns]
  );

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const coach = staffList.find((s) => s.id === staffId) || staffList[0];
    if (!coach || !sourceLabel.trim()) return;
    const grossCentimes = dzdToCentimes(Math.max(0, parseFloat(grossDzd) || 0));
    const bps = Math.round(Math.max(0, parseFloat(ratePct) || 0) * 100);
    recordTrainerCommission({
      staffId: coach.id,
      staffName: coach.fullName,
      sourceLabel: sourceLabel.trim(),
      grossAmountCentimes: grossCentimes,
      commissionRateBps: bps,
    });
    showToast({
      type: 'success',
      title: L('Commission recorded', 'Commission enregistrée', 'تم تسجيل العمولة'),
      message: `${coach.fullName} · ${previewCommissionDzd.toLocaleString()} DZD`,
    });
    setSourceLabel('');
    setIsModalOpen(false);
  };

  const handlePostAllPending = () => {
    if (pendingCommissions.length === 0) return;
    const posted = postTrainerCommissionsToPayroll(
      pendingCommissions.map((c) => c.id),
      activeDraftRun?.id
    );
    showToast({
      type: 'success',
      title: L('Posted to payroll', 'Transféré en paie', 'تم الترحيل إلى الرواتب'),
      message: L(
        `${posted.length} commission(s) ready for next payroll run.`,
        `${posted.length} commission(s) prête(s) pour le calcul de paie.`,
        `تم ترحيل ${posted.length} عمولات إلى مسير الرواتب.`
      ),
    });
  };

  return (
    <ScreenPod data-testid="trainer-commissions-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--atr-divider)]">
        <div className="flex items-center gap-2.5">
          <div
            data-sq="tile"
            data-sq-border="none"
            className="w-9 h-9 bg-[#d4522f]/12 text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] grid place-items-center shrink-0"
          >
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="t-pod text-[var(--text-1)] dark:text-white">
              {L('Trainer Coaching & Class Commissions', 'Commissions Coachs & Séances', 'عمولات المدربين والحصص')}
            </h4>
            <p className="t-cap text-black/62 dark:text-white/65 tabular-nums">
              {pendingCommissions.length} {L('pending', 'en attente', 'معلقة')} · {pendingTotalDzd.toLocaleString()} DZD
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCommissions.length > 0 && (
            <Button
              type="button"
              tone="soft"
              size={32}
              onClick={handlePostAllPending}
              data-testid="post-trainer-commissions-btn"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {L('Post to Payroll', 'Intégrer à la paie', 'ترحيل للرواتب')}
            </Button>
          )}
          <Button
            type="button"
            tone="accent"
            size={32}
            onClick={() => {
              if (!staffId && staffList[0]) setStaffId(staffList[0].id);
              setIsModalOpen(true);
            }}
            data-testid="add-trainer-commission-btn"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {L('Record Commission', 'Nouvelle commission', 'تسجيل عمولة')}
          </Button>
        </div>
      </div>

      {trainerCommissions.length === 0 ? (
        <p className="t-small text-black/62 dark:text-white/65 py-4">
          {L(
            'Record per-session or PT package commissions for coaches; posted items are automatically included in payroll slips.',
            'Enregistrez les commissions PT ou cours collectifs des coachs pour les inclure automatiquement dans les bulletins de paie.',
            'سجّل عمولات التدريب الشخصي أو الحصص لإدراجها تلقائياً في كشوف الرواتب.'
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
          {trainerCommissions.slice(0, 9).map((comm) => {
            const coachName =
              comm.staffName ||
              staffList.find((s) => s.id === comm.staffId)?.fullName ||
              comm.staffId;
            return (
              <div
                key={comm.id}
                data-sq="card"
                className="p-4 bg-[#FBF8F5] dark:bg-[#22201E] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="t-label font-semibold text-black dark:text-white truncate">
                    {coachName}
                  </div>
                  <div className="t-cap text-black/62 dark:text-white/65 truncate">
                    {comm.sourceLabel} · {(comm.commissionRateBps / 100).toFixed(1)}%
                  </div>
                  <div className="t-cap text-black/50 dark:text-white/50 tabular-nums">
                    {comm.earnedDate}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63] tabular-nums">
                    +{centimesToDzd(comm.commissionCentimes).toLocaleString()} DZD
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full t-small font-semibold ${
                      comm.status === 'posted_to_payroll'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : comm.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {comm.status === 'posted_to_payroll' && <CheckCircle2 className="w-3 h-3" />}
                    {comm.status === 'posted_to_payroll'
                      ? L('Posted', 'En paie', 'مرحلة')
                      : comm.status === 'cancelled'
                      ? L('Cancelled', 'Annulée', 'ملغاة')
                      : L('Pending', 'En attente', 'معلقة')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <KineticModalShell
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-[#1F1D1B]/45"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {L('Record Trainer Commission', 'Commission Coach / PT', 'تسجيل عمولة مدرب')}
            </h3>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleRecord} className="space-y-4">
            <LabelSelect
              field="commissionStaff"
              label={L('Coach / Trainer', 'Coach / Instructeur', 'المدرب')}
              value={staffId}
              onChange={setStaffId}
              options={staffList.map((s) => ({ value: s.id, label: `${s.fullName} (${s.role})` }))}
            />
            <LabelInput
              field="commissionLabel"
              label={L('Session / Pack Label', 'Séance ou Pack PT', 'الحصة أو الباقة')}
              value={sourceLabel}
              onChange={setSourceLabel}
              placeholder={L('10 PT Sessions Pack', 'Pack 10 séances Coaching', 'باقة 10 حصص تدريب خاص')}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput
                field="commissionGross"
                label={L('Gross Revenue (DZD)', 'Montant encaissé (DZD)', 'المبلغ الإجمالي (دج)')}
                type="number"
                value={grossDzd}
                onChange={setGrossDzd}
                required
              />
              <LabelInput
                field="commissionRate"
                label={L('Rate (%)', 'Taux (%)', 'النسبة (%)')}
                type="number"
                value={ratePct}
                onChange={setRatePct}
                required
              />
            </div>
            <div
              data-sq="card"
              data-sq-border="none"
              className="bg-[#F5F1EC] dark:bg-[#22201E] p-3.5 flex justify-between items-center t-small"
            >
              <span className="text-black/65 dark:text-white/65">
                {L('Calculated Commission', 'Commission calculée', 'العمولة المحسوبة')}
              </span>
              <b className="tabular-nums text-[var(--atr-acc,#d4522f)]">
                {previewCommissionDzd.toLocaleString()} DZD
              </b>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </Button>
              <Button type="submit" tone="accent" size={40} disabled={!staffId && staffList.length === 0}>
                {L('Save Commission', 'Enregistrer', 'حفظ العمولة')}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
