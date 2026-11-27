import React, { useMemo, useState } from 'react';
import { Clock, CheckCircle2, Plus, Send, X } from 'lucide-react';
import { Button } from '@/atrium/core';
import {
  useAtriumActions,
  useAtriumSelector,
  selectCurrentEduVacataireLogsFromState,
  selectCurrentEduCohortsFromState,
  shallowEqualObjects,
  showToast,
} from '../../../services/store';
import type { StaffMember, StaffPayrollRunRecord } from '../../../types/index';
import { centimesToDzd } from '../../../utils/money';
import { computeVacataireSessionPay, summarizeVacatairePayroll } from '../../../utils/educationDepth';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';

export interface VacatairePayrollPanelProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  language: string;
}

export const VacatairePayrollPanel: React.FC<VacatairePayrollPanelProps> = ({
  staffList,
  payrollRuns,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { eduVacataireLogs, eduCohorts } = useAtriumSelector(
    (s) => ({
      eduVacataireLogs: selectCurrentEduVacataireLogsFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
    }),
    shallowEqualObjects
  );
  const { recordEduVacataireLog, postVacataireLogsToPayroll } = useAtriumActions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [instructorId, setInstructorId] = useState(() => staffList[0]?.id || '');
  const [cohortId, setCohortId] = useState(() => eduCohorts[0]?.id || '');
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hoursWorked, setHoursWorked] = useState('2');
  const [hourlyRateDzd, setHourlyRateDzd] = useState('2500');
  const [notes, setNotes] = useState('');

  const summary = useMemo(
    () => summarizeVacatairePayroll(eduVacataireLogs),
    [eduVacataireLogs]
  );

  const pendingLogs = useMemo(
    () => eduVacataireLogs.filter((v) => v.status === 'pending' && !v.deletedAt),
    [eduVacataireLogs]
  );

  const previewPay = useMemo(() => {
    const h = Math.max(0, parseFloat(hoursWorked) || 0);
    const r = Math.max(0, parseFloat(hourlyRateDzd) || 0);
    return computeVacataireSessionPay(h, r);
  }, [hoursWorked, hourlyRateDzd]);

  const activeDraftRun = useMemo(
    () => payrollRuns.find((r) => r.status === 'draft'),
    [payrollRuns]
  );

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const instructor = staffList.find((s) => s.id === instructorId) || staffList[0];
    if (!instructor) return;
    const h = Math.max(0.25, parseFloat(hoursWorked) || 0);
    const rate = Math.max(0, parseFloat(hourlyRateDzd) || 0);
    const cohort = eduCohorts.find((c) => c.id === cohortId);

    recordEduVacataireLog({
      instructorId: instructor.id,
      instructorName: instructor.fullName,
      cohortId: cohort?.id,
      cohortName: cohort?.name,
      workDate,
      hoursWorked: h,
      hourlyRateDzd: rate,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    setIsModalOpen(false);
  };

  const handlePostAllPending = () => {
    if (pendingLogs.length === 0) {
      showToast({
        type: 'info',
        title: L('Nothing to Post', 'Aucune vacation en attente', 'لا توجد ساعات معلقة'),
        message: L(
          'Record hourly sessions before transferring to Workforce payroll.',
          'Enregistrez des heures de vacation avant le transfert en paie.',
          'سجّل ساعات التعاقد قبل الترحيل إلى كشف الرواتب.'
        ),
      });
      return;
    }
    postVacataireLogsToPayroll(
      pendingLogs.map((l) => l.id),
      activeDraftRun?.id
    );
  };

  return (
    <ScreenPod data-testid="vacataire-payroll-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--atr-divider)]">
        <div className="flex items-center gap-2.5">
          <div
            data-sq="tile"
            data-sq-border="none"
            className="w-9 h-9 bg-[#d4522f]/12 text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] grid place-items-center shrink-0"
          >
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="t-pod text-[var(--text-1)] dark:text-white">
              {L(
                'Vacataire Hourly Teaching Payroll',
                'Paie Horaire des Enseignants Vacataires',
                'رواتب الأساتذة المتعاقدين بالساعة'
              )}
            </h4>
            <p className="t-cap text-black/62 dark:text-white/65 tabular-nums">
              {pendingLogs.length} {L('pending', 'en attente', 'معلقة')} · {summary.pendingHours}h ·{' '}
              {summary.pendingTotalDzd.toLocaleString()} DZD · {L('Posted:', 'Transféré :', 'مرحل:')}{' '}
              {summary.postedTotalDzd.toLocaleString()} DZD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingLogs.length > 0 && (
            <Button
              type="button"
              tone="soft"
              size={32}
              onClick={handlePostAllPending}
              data-testid="post-vacataire-payroll-btn"
            >
              <Send className="w-3.5 h-3.5 me-1.5" />
              {L('Post to Payroll', 'Transférer en Paie', 'ترحيل للرواتب')}
            </Button>
          )}
          <Button
            type="button"
            tone="accent"
            size={32}
            onClick={() => {
              if (!instructorId && staffList[0]) setInstructorId(staffList[0].id);
              if (!cohortId && eduCohorts[0]) setCohortId(eduCohorts[0].id);
              setIsModalOpen(true);
            }}
            data-testid="add-vacataire-log-btn"
          >
            <Plus className="w-3.5 h-3.5 me-1" />
            {L('Log Vacataire Hours', 'Saisir Vacations', 'تسجيل ساعات')}
          </Button>
        </div>
      </div>

      {eduVacataireLogs.length === 0 ? (
        <p className="t-small text-black/62 dark:text-white/65 py-4">
          {L(
            'Track hourly teaching hours for vacataire instructors; posted hours flow directly into Workforce payroll slips under Vacation Enseignement.',
            'Suivez les heures effectuées par les enseignants vacataires ; les lots transférés alimentent directement la paie RH.',
            'تتبّع ساعات التدريس للأساتذة المتعاقدين لترحيلها مباشرة إلى كشوف رواتب الموارد البشرية.'
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
          {eduVacataireLogs.slice(0, 9).map((log) => {
            const name =
              log.instructorName ||
              staffList.find((s) => s.id === log.instructorId)?.fullName ||
              log.instructorId;
            return (
              <div
                key={log.id}
                data-sq="card"
                className="p-4 bg-[#FBF8F5] dark:bg-[#22201E] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="t-label font-semibold text-black dark:text-white truncate">
                    {name}
                  </div>
                  <div className="t-cap text-black/62 dark:text-white/65 truncate">
                    {log.cohortName || L('General Teaching', 'Cours / TD', 'حصة تدريسية')} ·{' '}
                    {log.hoursWorked}h × {centimesToDzd(log.hourlyRateCentimes).toLocaleString()} DZD
                  </div>
                  <div className="t-cap text-black/50 dark:text-white/50 tabular-nums">
                    {log.workDate}
                  </div>
                </div>
                <div className="text-end shrink-0 space-y-1">
                  <div className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63] tabular-nums">
                    +{centimesToDzd(log.grossAmountCentimes).toLocaleString()} DZD
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full t-small font-semibold ${
                      log.status === 'posted_to_payroll'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : log.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {log.status === 'posted_to_payroll' && <CheckCircle2 className="w-3 h-3" />}
                    {log.status === 'posted_to_payroll'
                      ? L('Posted', 'En paie', 'مرحلة')
                      : log.status === 'cancelled'
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
              {L('Log Vacataire Hours', 'Saisir Heures Vacataire', 'تسجيل ساعات أستاذ متعاقد')}
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
              field="vacataireInstructor"
              label={L('Instructor / Vacataire', 'Enseignant / Vacataire', 'الأستاذ المتعاقد')}
              value={instructorId}
              onChange={setInstructorId}
              options={staffList.map((s) => ({ value: s.id, label: `${s.fullName} (${s.role})` }))}
              width="100%"
              height={40}
              corner={12}
            />
            {eduCohorts.length > 0 && (
              <LabelSelect
                field="vacataireCohort"
                label={L('Cohort / Course', 'Cohorte / Cours', 'الفوج / المادة')}
                value={cohortId}
                onChange={setCohortId}
                options={[
                  { value: '', label: L('General / Tutoring', 'Cours particulier / Général', 'دروس عامة') },
                  ...eduCohorts.map((c) => ({ value: c.id, label: c.name })),
                ]}
                width="100%"
                height={40}
                corner={12}
              />
            )}
            <LabelInput
              field="vacataireDate"
              label={L('Work Date', 'Date de séance', 'التاريخ')}
              type="date"
              value={workDate}
              onChange={setWorkDate}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput
                field="vacataireHours"
                label={L('Hours Worked', 'Heures effectuées', 'عدد الساعات')}
                type="number"
                step="0.5"
                min="0.5"
                value={hoursWorked}
                onChange={setHoursWorked}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="vacataireRate"
                label={L('Hourly Rate (DZD)', 'Taux horaire (DZD)', 'الأجر بالساعة (دج)')}
                type="number"
                min="0"
                value={hourlyRateDzd}
                onChange={setHourlyRateDzd}
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <LabelInput
              field="vacataireNotes"
              label={L('Session Topic / Notes', 'Module / Remarques', 'ملاحظات / موضوع الحصة')}
              value={notes}
              onChange={setNotes}
              placeholder={L('e.g. Lab session batch A', 'Ex: TP Algèbre groupe A', 'مثال: حصة تطبيقية فوج أ')}
              width="100%"
              height={40}
              corner={12}
            />
            <div
              data-sq="card"
              data-sq-border="none"
              className="bg-[#F5F1EC] dark:bg-[#22201E] p-3.5 flex justify-between items-center t-small"
            >
              <span className="text-black/65 dark:text-white/65">
                {L('Gross Pay', 'Montant Brut Calculé', 'المبلغ الإجمالي')}
              </span>
              <b className="tabular-nums text-[var(--atr-acc,#d4522f)]">
                {previewPay.grossAmountDzd.toLocaleString()} DZD
              </b>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </Button>
              <Button type="submit" tone="accent" size={40} disabled={staffList.length === 0}>
                {L('Save Hours', 'Enregistrer', 'حفظ الساعات')}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
