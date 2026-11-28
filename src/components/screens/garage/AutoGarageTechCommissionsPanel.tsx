import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock, Plus, Send, X } from 'lucide-react';
import {
  useAtriumActions,
  useAtriumSelector,
  selectCurrentGarageTechCommissionsFromState,
  shallowEqualObjects,
  showToast,
} from '../../../services/store';
import type { GarageTechCommission, StaffMember, StaffPayrollRunRecord } from '../../../types/index';
import { centimesToDzd, dzdToCentimes, roundHalfAwayFromZero } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useGarageData } from './garageData';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { AtriumButton } from '../../ui/AtriumButton';

export interface AutoGarageTechCommissionsPanelProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  language: string;
}

export const AutoGarageTechCommissionsPanel: React.FC<AutoGarageTechCommissionsPanelProps> = ({
  staffList = [],
  payrollRuns = [],
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { garageTechCommissions, account, currentBusinessId, currentBranchId } = useAtriumSelector(
    (s) => ({
      garageTechCommissions: selectCurrentGarageTechCommissionsFromState(s),
      account: s.account,
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
    }),
    shallowEqualObjects
  );
  const { recordGarageTechCommission, postGarageCommissionsToPayroll } = useAtriumActions();
  const { orders, timeLogs } = useGarageData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [techStaffId, setTechStaffId] = useState(() => staffList[0]?.id || '');
  const [workOrderId, setWorkOrderId] = useState('');
  const [laborBaseDzd, setLaborBaseDzd] = useState('12000');
  const [ratePercent, setRatePercent] = useState('15');
  const [periodMonth, setPeriodMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const pendingCommissions = useMemo(
    () => (garageTechCommissions || []).filter((c) => c.status === 'pending'),
    [garageTechCommissions]
  );

  const postedCommissions = useMemo(
    () => (garageTechCommissions || []).filter((c) => c.status === 'posted_to_payroll'),
    [garageTechCommissions]
  );

  const pendingTotalDzd = useMemo(
    () => pendingCommissions.reduce((sum, c) => sum + Number(c.commissionAmountDzd || 0), 0),
    [pendingCommissions]
  );

  const postedTotalDzd = useMemo(
    () => postedCommissions.reduce((sum, c) => sum + Number(c.commissionAmountDzd || 0), 0),
    [postedCommissions]
  );

  const previewRateBps = useMemo(
    () => Math.max(0, Math.round((parseFloat(ratePercent) || 0) * 100)),
    [ratePercent]
  );

  const previewCommissionDzd = useMemo(() => {
    const baseCentimes = dzdToCentimes(Math.max(0, parseFloat(laborBaseDzd) || 0));
    const commCentimes = roundHalfAwayFromZero((baseCentimes * previewRateBps) / 10000);
    return centimesToDzd(commCentimes);
  }, [laborBaseDzd, previewRateBps]);

  const activeDraftRun = useMemo(
    () => payrollRuns.find((r) => r.status === 'draft'),
    [payrollRuns]
  );

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const tech = staffList.find((s) => s.id === techStaffId) || staffList[0];
    if (!tech) {
      showToast({
        type: 'warning',
        title: L('No Technician Selected', 'Aucun mécanicien sélectionné', 'لم يتم اختيار تقني'),
        message: L(
          'Add a garage technician to staff first.',
          'Ajoutez d’abord un mécanicien dans l’équipe.',
          'أضف ميكانيكياً في الفريق أولاً.'
        ),
      });
      return;
    }

    const baseAmount = Math.max(0, parseFloat(laborBaseDzd) || 0);
    if (baseAmount <= 0 || previewRateBps <= 0) {
      showToast({
        type: 'warning',
        title: L('Invalid Values', 'Montant invalide', 'قيم غير صالحة'),
        message: L(
          'Enter positive labor revenue and commission rate.',
          'Saisissez une base main-d’œuvre et un taux positifs.',
          'أدخل أجرة يد عاملة ونسبة موجبة.'
        ),
      });
      return;
    }

    const linkedOrder = orders.find((o) => o.id === workOrderId);
    const laborBaseCentimes = dzdToCentimes(baseAmount);
    const commissionCentimes = roundHalfAwayFromZero((laborBaseCentimes * previewRateBps) / 10000);
    const nowIso = new Date().toISOString();

    const record: GarageTechCommission = {
      id: `gcomm_${Date.now()}`,
      accountId: account.id,
      businessId: currentBusinessId,
      branchId: currentBranchId,
      technicianStaffId: tech.id,
      technicianName: tech.fullName,
      workOrderId: linkedOrder?.id,
      orderNumber: linkedOrder?.orderNumber || `MAN-${nowIso.slice(0, 10)}`,
      periodMonth: periodMonth || nowIso.slice(0, 7),
      laborBaseCentimes,
      commissionRateBps: previewRateBps,
      commissionCentimes,
      commissionAmountDzd: centimesToDzd(commissionCentimes),
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    recordGarageTechCommission(record);
    setIsModalOpen(false);
  };

  const handlePostAllPending = () => {
    if (pendingCommissions.length === 0) {
      showToast({
        type: 'info',
        title: L('Nothing to Post', 'Aucune commission en attente', 'لا توجد عمولات معلقة'),
        message: L(
          'All technician commissions are already transferred to payroll.',
          'Toutes les commissions mécaniciens ont déjà été transférées en paie.',
          'جميع عمولات التقنيين مرحّلة للرواتب بالفعل.'
        ),
      });
      return;
    }
    postGarageCommissionsToPayroll(
      pendingCommissions.map((c) => c.id),
      activeDraftRun?.id
    );
  };

  return (
    <ScreenPod>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
              <Award size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>
                {L(
                  'Mechanic Time Logs & Payroll Commissions',
                  'Pointage Atelier & Commissions Mécaniciens',
                  'سجل ساعات العمل وعمولات الميكانيكيين للرواتب'
                )}
              </span>
            </h3>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L(
                'Tracked bay time and flat-rate commissions post directly to monthly workforce payroll slips.',
                'Les temps chronométrés et primes sur barème s’intègrent directement dans les fiches de paie mensuelles.',
                'تُرحَّل مكافآت ساعات العمل والخدمات مباشرة إلى كشوف الرواتب الشهرية.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AtriumButton
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setIsModalOpen(true)}
            >
              {L('Record Bonus / Commission', 'Nouvelle Prime / Commission', 'تسجيل مكافأة / عمولة')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Send size={14} />}
              onClick={handlePostAllPending}
              disabled={pendingCommissions.length === 0}
            >
              {L(
                `Post to Payroll (${pendingCommissions.length})`,
                `Envoyer en Paie (${pendingCommissions.length})`,
                `ترحيل للرواتب (${pendingCommissions.length})`
              )}
            </AtriumButton>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">
              {L('Pending Commissions', 'Commissions en Attente', 'عمولات معلقة')}
            </span>
            <span className="t-card font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatMoney(pendingTotalDzd, language)}
            </span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5 tabular-nums">
              {pendingCommissions.length} {L('entries', 'lignes', 'بنود')}
            </span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">
              {L('Posted to Payroll', 'Transférées en Paie', 'مرحّلة للرواتب')}
            </span>
            <span className="t-card font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(postedTotalDzd, language)}
            </span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5 tabular-nums">
              {postedCommissions.length} {L('entries', 'lignes', 'بنود')}
            </span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">
              {L('Tracked Bay Sessions', 'Pointages Chrono Atelier', 'جلسات التوقيت المسجلة')}
            </span>
            <span className="t-card font-semibold tabular-nums text-black dark:text-white">
              {timeLogs.length}
            </span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5 tabular-nums">
              {activeDraftRun
                ? `${L('Payroll Run', 'Paie', 'دورة الرواتب')}: ${activeDraftRun.periodYear}-${String(activeDraftRun.periodMonth).padStart(2, '0')}`
                : L('Linked on next payroll run', 'Lié à la prochaine paie', 'يرتبط بالدورة القادمة')}
            </span>
          </div>
        </div>

        {(garageTechCommissions || []).length === 0 ? (
          <div data-sq="card" data-sq-border="solid" className="p-6 text-center text-black/55 dark:text-white/60 t-cap bg-[#FAF7F4]/60 dark:bg-[#1E1C1A] [--sq-stroke:var(--sq-stroke-card)]">
            {L(
              'No mechanic commissions recorded yet. Start a timer on a Repair Order or record a bonus.',
              'Aucune commission mécanicien enregistrée. Démarrez un chrono sur un OR ou saisissez une prime.',
              'لا توجد عمولات ميكانيكيين مسجلة بعد.'
            )}
          </div>
        ) : (
          <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <table className="w-full text-left rtl:text-right t-cap">
              <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                <tr>
                  <th className="py-2 px-3">{L('Technician', 'Technicien', 'التقني')}</th>
                  <th className="py-2 px-3">{L('RO #', 'N° OR', 'رقم الأمر')}</th>
                  <th className="py-2 px-3">{L('Period', 'Période', 'الفترة')}</th>
                  <th className="py-2 px-3 text-right">{L('Labor Base', 'Base MO', 'قاعدة الأجرة')}</th>
                  <th className="py-2 px-3 text-right">{L('Rate', 'Taux', 'النسبة')}</th>
                  <th className="py-2 px-3 text-right">{L('Commission', 'Prime', 'العمولة')}</th>
                  <th className="py-2 px-3">{L('Status', 'Statut', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                {(garageTechCommissions || []).map((comm) => (
                  <tr key={comm.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                    <td className="py-2 px-3 font-semibold text-black dark:text-white">{comm.technicianName}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{comm.orderNumber || '—'}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{comm.periodMonth}</td>
                    <td className="py-2 px-3 text-right">{formatMoney(centimesToDzd(comm.laborBaseCentimes), language)}</td>
                    <td className="py-2 px-3 text-right">{(comm.commissionRateBps / 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-right font-semibold text-black dark:text-white">
                      {formatMoney(comm.commissionAmountDzd, language)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-check,6px)] t-small font-semibold ${
                          comm.status === 'posted_to_payroll'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {comm.status === 'posted_to_payroll' && <CheckCircle2 size={12} />}
                        <span>
                          {comm.status === 'posted_to_payroll'
                            ? comm.payrollRunId
                              ? L('In Payroll Run', 'Intégrée Paie', 'مربوطة بالرواتب')
                              : L('Ready for Payroll', 'Prête pour Paie', 'جاهزة للرواتب')
                            : L('Pending', 'En Attente', 'معلقة')}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {timeLogs.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="t-small font-semibold text-black/70 dark:text-white/75 flex items-center gap-1.5">
              <Clock size={14} />
              <span>{L('Recent Workshop Time Clock Logs', 'Derniers Pointages Chronométrés', 'آخر تسجيلات التوقيت بالورشة')}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 t-cap">
              {timeLogs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  data-sq="ctl-sm"
                  data-sq-border="solid"
                  className="p-3 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] flex items-center justify-between gap-2 tabular-nums"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-black dark:text-white block truncate">
                      {log.orderNumber} · {log.technicianName}
                    </span>
                    <span className="text-black/55 dark:text-white/55 block truncate">{log.taskLabel}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-black dark:text-white block">
                      {log.status === 'running' ? L('Running', 'En cours', 'جاري') : `${log.durationMinutes} min`}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(log.commissionDzd || 0, language)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <KineticModalShell
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h2 className="t-card font-semibold text-black dark:text-white">
              {L('Record Mechanic Commission', 'Enregistrer Commission Mécanicien', 'تسجيل عمولة ميكانيكي')}
            </h2>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleRecord} className="space-y-3 t-cap">
            <LabelSelect
              label={L('Technician *', 'Mécanicien / Technicien *', 'الميكانيكي / التقني *')}
              value={techStaffId}
              onChange={setTechStaffId}
              options={staffList.map((s) => ({
                value: s.id,
                label: `${s.fullName} (${s.role})`,
              }))}
            />
            <LabelSelect
              label={L('Linked Repair Order (optional)', 'OR Associé (optionnel)', 'أمر الإصلاح المرتبط (اختياري)')}
              value={workOrderId}
              onChange={(oid) => {
                setWorkOrderId(oid);
                const ord = orders.find((o) => o.id === oid);
                if (ord && (ord.laborCostDzd || ord.estimatedCostDzd)) {
                  setLaborBaseDzd(String(ord.laborCostDzd || ord.estimatedCostDzd || 0));
                }
              }}
              options={[
                { value: '', label: L('-- Manual Basis --', '-- Base manuelle --', '-- أساس يدوي --') },
                ...orders.slice(0, 30).map((o) => ({
                  value: o.id,
                  label: `${o.orderNumber} · ${o.vehiclePlate} (${o.clientName})`,
                })),
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput
                type="number"
                label={L('Labor Base (DZD) *', 'Base MO (DA) *', 'أجرة اليد العاملة (دج) *')}
                value={laborBaseDzd}
                onChange={setLaborBaseDzd}
                required
              />
              <LabelInput
                type="number"
                step={0.5}
                label={L('Rate (%) *', 'Taux (%) *', 'النسبة (%) *')}
                value={ratePercent}
                onChange={setRatePercent}
                required
              />
            </div>
            <LabelInput
              type="month"
              label={L('Period Month *', 'Mois Paie *', 'شهر الراتب *')}
              value={periodMonth}
              onChange={setPeriodMonth}
              required
            />
            <div data-sq="ctl-sm" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] flex justify-between items-center tabular-nums">
              <span className="text-black/60 dark:text-white/65">{L('Calculated Commission', 'Commission Calculée', 'العمولة المحسوبة')}</span>
              <span className="t-label font-semibold text-[#BF431F] dark:text-[#FF8F63]">
                {formatMoney(previewCommissionDzd, language)}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Save Commission', 'Enregistrer', 'حفظ العمولة')}
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
