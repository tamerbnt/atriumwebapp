import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Plus, Send, X } from 'lucide-react';
import {
  selectCurrentRealEstateAgentCommissionsFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import type { RealEstateAgentCommission, StaffMember, StaffPayrollRunRecord } from '../../../types/index';
import { computeAgentCommissionSplit } from '../../../utils/realEstateDepth';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useRealEstateData } from './realEstateData';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

export interface RealEstateAgentCommissionsPanelProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  language: string;
}

export const RealEstateAgentCommissionsPanel: React.FC<RealEstateAgentCommissionsPanelProps> = ({
  staffList = [],
  payrollRuns = [],
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { realEstateAgentCommissions, account, currentBusinessId, currentBranchId } = useAtriumSelector(
    (s) => ({
      realEstateAgentCommissions: selectCurrentRealEstateAgentCommissionsFromState(s),
      account: s.account,
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
    }),
    shallowEqualObjects
  );
  const { recordRealEstateAgentCommission, postRealEstateCommissionsToPayroll } = useAtriumActions();
  const { saleDeals, leases } = useRealEstateData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agentStaffId, setAgentStaffId] = useState(() => staffList[0]?.id || '');
  const [sourceType, setSourceType] = useState<'SaleDeal' | 'Lease' | 'Manual'>('SaleDeal');
  const [sourceId, setSourceId] = useState('');
  const [grossCommissionDzd, setGrossCommissionDzd] = useState('250000');
  const [splitPercent, setSplitPercent] = useState('50');
  const [periodMonth, setPeriodMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const pendingCommissions = useMemo(
    () => (realEstateAgentCommissions || []).filter((c) => c.status === 'pending'),
    [realEstateAgentCommissions]
  );

  const postedCommissions = useMemo(
    () => (realEstateAgentCommissions || []).filter((c) => c.status === 'posted_to_payroll'),
    [realEstateAgentCommissions]
  );

  const pendingTotalDzd = useMemo(
    () => pendingCommissions.reduce((sum, c) => sum + Number(c.agentShareDzd || 0), 0),
    [pendingCommissions]
  );

  const postedTotalDzd = useMemo(
    () => postedCommissions.reduce((sum, c) => sum + Number(c.agentShareDzd || 0), 0),
    [postedCommissions]
  );

  const activeDraftRun = useMemo(() => payrollRuns.find((r) => r.status === 'draft'), [payrollRuns]);

  const previewSplitBps = useMemo(
    () => Math.max(0, Math.min(10000, Math.round((parseFloat(splitPercent) || 0) * 100))),
    [splitPercent]
  );

  const previewCalc = useMemo(() => {
    const grossDzd = Math.max(0, parseFloat(grossCommissionDzd) || 0);
    return computeAgentCommissionSplit({
      grossCommissionDzd: grossDzd,
      primarySplitBps: previewSplitBps,
      secondarySplitBps: 10000 - previewSplitBps,
      hasSecondaryAgent: previewSplitBps < 10000,
    });
  }, [grossCommissionDzd, previewSplitBps]);

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const agent = staffList.find((s) => s.id === agentStaffId) || staffList[0];
    if (!agent) {
      showToast({
        type: 'warning',
        title: L('No Agent Selected', 'Aucun négociateur sélectionné', 'لم يتم اختيار وكيل'),
        message: L('Add a real estate agent to staff first.', 'Ajoutez d’abord un négociateur dans l’équipe.', 'أضف وكيلاً عقارياً أولاً.'),
      });
      return;
    }

    const grossAmount = Math.max(0, parseFloat(grossCommissionDzd) || 0);
    if (grossAmount <= 0 || previewSplitBps <= 0) {
      showToast({
        type: 'warning',
        title: L('Invalid Values', 'Valeurs invalides', 'قيم غير صالحة'),
        message: L('Enter positive agency fee and split percentage.', 'Saisissez un honoraire et un pourcentage positifs.', 'أدخل مبلغ أتعاب ونسبة موجبة.'),
      });
      return;
    }

    const linkedDeal = sourceType === 'SaleDeal' ? saleDeals.find((d) => d.id === sourceId) : undefined;
    const linkedLease = sourceType === 'Lease' ? leases.find((l) => l.id === sourceId) : undefined;
    const nowIso = new Date().toISOString();

    const record: RealEstateAgentCommission = {
      id: `recomm_${Date.now()}`,
      accountId: account.id,
      businessId: currentBusinessId,
      branchId: currentBranchId,
      agentStaffId: agent.id,
      agentName: agent.fullName,
      roleType: 'primary',
      sourceType,
      sourceId: linkedDeal?.id || linkedLease?.id,
      referenceNumber: linkedDeal?.dealNumber || linkedLease?.leaseNumber || `MAN-${nowIso.slice(0, 10)}`,
      periodMonth: periodMonth || nowIso.slice(0, 7),
      grossCommissionCentimes: previewCalc.grossCommissionCentimes,
      splitBps: previewSplitBps,
      agentShareCentimes: previewCalc.primaryShareCentimes,
      agentShareDzd: previewCalc.primaryShareDzd,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    recordRealEstateAgentCommission(record);
    setIsModalOpen(false);
  };

  const handlePostAllPending = () => {
    if (pendingCommissions.length === 0) return;
    postRealEstateCommissionsToPayroll(
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
                  'Negotiator Commission Splits & Payroll Bridge',
                  'Partage Honoraires Négociateurs & Pont Paie',
                  'تقسيم عمولات الوكلاء وترحيلها للرواتب'
                )}
              </span>
            </h3>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L(
                'Sale and lease splits flow directly into monthly workforce payroll slips.',
                'Les parts de vente et location s’intègrent directement dans les bulletins de paie mensuels.',
                'تُرحَّل حصص البيع والكراء مباشرة إلى كشوف الرواتب الشهرية.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AtriumButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setIsModalOpen(true)}>
              {L('Record Commission Share', 'Enregistrer Part Négociateur', 'تسجيل عمولة وكيل')}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Pending Agent Shares', 'Parts en Attente', 'عمولات معلقة')}</span>
            <span className="t-card font-semibold text-amber-600 dark:text-amber-400">{formatMoney(pendingTotalDzd, language)}</span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5">{pendingCommissions.length} {L('entries', 'lignes', 'بنود')}</span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Posted to Payroll', 'Transférées en Paie', 'مرحّلة للرواتب')}</span>
            <span className="t-card font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(postedTotalDzd, language)}</span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5">{postedCommissions.length} {L('entries', 'lignes', 'بنود')}</span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Payroll Integration', 'Synchronisation Paie', 'ربط الرواتب')}</span>
            <span className="t-card font-semibold text-black dark:text-white">
              {activeDraftRun
                ? `${activeDraftRun.periodYear}-${String(activeDraftRun.periodMonth).padStart(2, '0')}`
                : L('Ready', 'Prêt', 'جاهز')}
            </span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5">
              {activeDraftRun ? L('Draft run attached', 'Brouillon de paie actif', 'مرتبط بمسودة الرواتب') : L('Attaches on next payroll run', 'Inclus à la prochaine paie', 'يرتبط بالدورة القادمة')}
            </span>
          </div>
        </div>

        {(realEstateAgentCommissions || []).length === 0 ? (
          <div data-sq="card" data-sq-border="solid" className="p-6 text-center text-black/55 dark:text-white/60 t-cap bg-[#FAF7F4]/60 dark:bg-[#1E1C1A] [--sq-stroke:var(--sq-stroke-card)]">
            {L(
              'No negotiator commissions recorded yet. Finalize a sale deal or record a manual share above.',
              'Aucune commission négociateur enregistrée. Finalisez une vente ou saisissez une part ci-dessus.',
              'لا توجد عمولات مسجلة بعد.'
            )}
          </div>
        ) : (
          <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <table className="w-full text-left rtl:text-right t-cap">
              <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                <tr>
                  <th className="py-2 px-3">{L('Negotiator', 'Négociateur', 'الوكيل')}</th>
                  <th className="py-2 px-3">{L('Reference', 'Référence', 'المرجع')}</th>
                  <th className="py-2 px-3">{L('Period', 'Période', 'الفترة')}</th>
                  <th className="py-2 px-3 text-right">{L('Gross Fee', 'Honoraire Brut', 'إجمالي الأتعاب')}</th>
                  <th className="py-2 px-3 text-right">{L('Split', 'Part', 'النسبة')}</th>
                  <th className="py-2 px-3 text-right">{L('Agent Share', 'Part Agent', 'حصة الوكيل')}</th>
                  <th className="py-2 px-3">{L('Status', 'Statut', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                {(realEstateAgentCommissions || []).map((comm) => (
                  <tr key={comm.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                    <td className="py-2 px-3 font-semibold text-black dark:text-white">{comm.agentName}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{comm.referenceNumber}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{comm.periodMonth}</td>
                    <td className="py-2 px-3 text-right">{formatMoney(centimesToDzd(comm.grossCommissionCentimes), language)}</td>
                    <td className="py-2 px-3 text-right">{(comm.splitBps / 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-right font-semibold text-black dark:text-white">{formatMoney(comm.agentShareDzd, language)}</td>
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
                            ? L('Posted to Payroll', 'Transférée Paie', 'مرحّلة للرواتب')
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
      </div>

      <KineticModalShell isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidthClass="max-w-md" zIndexClass="z-50" scrimClassName="bg-black/60">
        <div data-sq="panel" data-sq-border="solid" className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h2 className="t-card font-semibold text-black dark:text-white">{L('Record Negotiator Commission', 'Enregistrer Part Négociateur', 'تسجيل عمولة وكيل')}</h2>
            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleRecord} className="space-y-3 t-cap">
            <LabelSelect
              label={L('Negotiator *', 'Négociateur *', 'الوكيل *')}
              value={agentStaffId}
              onChange={setAgentStaffId}
              options={staffList.map((s) => ({ value: s.id, label: `${s.fullName} (${s.role})` }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelSelect
                label={L('Source Type', 'Origine', 'المصدر')}
                value={sourceType}
                onChange={(v) => {
                  setSourceType(v as 'SaleDeal' | 'Lease' | 'Manual');
                  setSourceId('');
                }}
                options={[
                  { value: 'SaleDeal', label: L('Sale Deal', 'Dossier Vente', 'ملف بيع') },
                  { value: 'Lease', label: L('Lease Contract', 'Bail Locatif', 'عقد إيجار') },
                  { value: 'Manual', label: L('Manual', 'Saisie manuelle', 'يدوي') },
                ]}
              />
              <LabelSelect
                label={L('Linked Record', 'Dossier lié', 'السجل المرتبط')}
                value={sourceId}
                onChange={(sid) => {
                  setSourceId(sid);
                  if (sourceType === 'SaleDeal') {
                    const d = saleDeals.find((x) => x.id === sid);
                    if (d) setGrossCommissionDzd(String(d.commissionHtDzd || 0));
                  } else if (sourceType === 'Lease') {
                    const l = leases.find((x) => x.id === sid);
                    if (l) setGrossCommissionDzd(String(l.agencyCommissionDzd || l.agencyFeeDzd || l.monthlyRentDzd));
                  }
                }}
                options={[
                  { value: '', label: L('-- Optional --', '-- Optionnel --', '-- اختياري --') },
                  ...(sourceType === 'SaleDeal'
                    ? saleDeals.map((d) => ({ value: d.id, label: `${d.dealNumber} · ${d.propertyTitle}` }))
                    : sourceType === 'Lease'
                    ? leases.map((l) => ({ value: l.id, label: `${l.leaseNumber || l.id} · ${l.tenantName}` }))
                    : []),
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelInput type="number" label={L('Agency Fee Base (DZD) *', 'Honoraires Base (DA) *', 'أساس الأتعاب (دج) *')} value={grossCommissionDzd} onChange={setGrossCommissionDzd} required />
              <LabelInput type="number" step={0.5} label={L('Agent Split (%) *', 'Part Agent (%) *', 'نسبة الوكيل (%) *')} value={splitPercent} onChange={setSplitPercent} required />
            </div>
            <LabelInput type="month" label={L('Period Month *', 'Mois Paie *', 'شهر الراتب *')} value={periodMonth} onChange={setPeriodMonth} required />
            <div data-sq="ctl-sm" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] flex justify-between items-center tabular-nums">
              <span className="text-black/60 dark:text-white/65">{L('Calculated Agent Share', 'Part Calculée', 'حصة الوكيل المحسوبة')}</span>
              <span className="t-label font-semibold text-[#BF431F] dark:text-[#FF8F63]">{formatMoney(previewCalc.primaryShareDzd, language)}</span>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Save Commission', 'Enregistrer', 'حفظ')}
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
