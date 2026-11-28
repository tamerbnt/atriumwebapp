import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Plus, Send, X } from 'lucide-react';
import {
  useAtriumActions,
  useAtriumSelector,
  selectCurrentTradingRepCommissionsFromState,
  selectCurrentCommercialDocsFromState,
  shallowEqualObjects,
  showToast,
} from '../../../services/store';
import type { StaffMember, StaffPayrollRunRecord } from '../../../types/index';
import { calculateTradingRepCommissionDzd } from '../../../utils/tradingDepth';
import { formatMoney } from '../../../utils/rules';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { AtriumButton } from '../../ui/AtriumButton';

export interface TradingRepCommissionsPanelProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  language: string;
}

export const TradingRepCommissionsPanel: React.FC<TradingRepCommissionsPanelProps> = ({
  staffList,
  payrollRuns,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { tradingRepCommissions, commercialDocs } = useAtriumSelector(
    (s) => ({
      tradingRepCommissions: selectCurrentTradingRepCommissionsFromState(s),
      commercialDocs: selectCurrentCommercialDocsFromState(s),
    }),
    shallowEqualObjects
  );
  const { recordTradingRepCommission, postTradingRepCommissionsToPayroll } = useAtriumActions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repStaffId, setRepStaffId] = useState(() => staffList[0]?.id || '');
  const [commercialDocId, setCommercialDocId] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [basisAmountDzd, setBasisAmountDzd] = useState('150000');
  const [ratePercent, setRatePercent] = useState('2.5');
  const [notes, setNotes] = useState('');

  const pendingCommissions = useMemo(
    () => tradingRepCommissions.filter((c) => c.status === 'pending' && !c.deletedAt),
    [tradingRepCommissions]
  );

  const postedCommissions = useMemo(
    () => tradingRepCommissions.filter((c) => c.status === 'posted_to_payroll' && !c.deletedAt),
    [tradingRepCommissions]
  );

  const pendingTotalDzd = useMemo(
    () => pendingCommissions.reduce((s, c) => s + Number(c.commissionAmountDzd || 0), 0),
    [pendingCommissions]
  );

  const postedTotalDzd = useMemo(
    () => postedCommissions.reduce((s, c) => s + Number(c.commissionAmountDzd || 0), 0),
    [postedCommissions]
  );

  const previewRateBps = useMemo(
    () => Math.max(0, Math.round((parseFloat(ratePercent) || 0) * 100)),
    [ratePercent]
  );

  const previewCommissionDzd = useMemo(
    () => calculateTradingRepCommissionDzd(parseFloat(basisAmountDzd) || 0, previewRateBps),
    [basisAmountDzd, previewRateBps]
  );

  const activeDraftRun = useMemo(
    () => payrollRuns.find((r) => r.status === 'draft'),
    [payrollRuns]
  );

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = staffList.find((s) => s.id === repStaffId) || staffList[0];
    if (!rep) {
      showToast({
        type: 'warning',
        title: L('No Rep Selected', 'Aucun commercial sélectionné', 'لم يتم اختيار مندوب'),
        message: L(
          'Please create a commercial rep in staff first.',
          'Veuillez d’abord ajouter un commercial dans l’équipe.',
          'يرجى إضافة مندوب مبيعات في الفريق أولاً.'
        ),
      });
      return;
    }
    const linkedDoc = commercialDocs.find((d) => d.id === commercialDocId);
    const basis = Math.max(0, parseFloat(basisAmountDzd) || 0);
    if (basis <= 0 || previewRateBps <= 0) {
      showToast({
        type: 'warning',
        title: L('Invalid Commission', 'Montant invalide', 'قيمة غير صالحة'),
        message: L(
          'Enter a positive sales basis and commission rate.',
          'Saisissez un chiffre d’affaires et un taux positifs.',
          'أدخل مبلغ مبيعات ونسبة عمولة موجبة.'
        ),
      });
      return;
    }

    recordTradingRepCommission({
      repStaffId: rep.id,
      repName: rep.fullName || 'Commercial',
      commercialDocId: linkedDoc?.id,
      docNumber: linkedDoc?.docNumber,
      docDate,
      basisAmountDzd: basis,
      rateBps: previewRateBps,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    setIsModalOpen(false);
  };

  const handlePostAllPending = () => {
    if (pendingCommissions.length === 0) {
      showToast({
        type: 'info',
        title: L('Nothing to Post', 'Aucune commission en attente', 'لا توجد عمولات معلقة'),
        message: L(
          'All commercial rep commissions are already posted to payroll.',
          'Toutes les commissions commerciales ont déjà été transférées en paie.',
          'جميع عمولات المناديب تم ترحيلها للرواتب.'
        ),
      });
      return;
    }
    postTradingRepCommissionsToPayroll(
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
                  'Field Sales Rep Commissions & Payroll Transfer',
                  'Commissions Commerciaux & Transfert Paie',
                  'عمولات مناديب المبيعات والترحيل للرواتب'
                )}
              </span>
            </h3>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L(
                'Commissions calculated from paid invoices and delivery rounds inject directly into monthly payroll runs.',
                'Les commissions calculées sur ventes ou tournées s’injectent automatiquement dans les bulletins de paie mensuels.',
                'تُحتسب العمولات من المبيعات أو جولات التوصيل وتُدرج تلقائياً في كشوف الرواتب الشهرية.'
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
              {L('Record Commission', 'Nouvelle Commission', 'تسجيل عمولة')}
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
              {formatMoney(pendingTotalDzd)}
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
              {formatMoney(postedTotalDzd)}
            </span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5 tabular-nums">
              {postedCommissions.length} {L('entries', 'lignes', 'بنود')}
            </span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">
              {L('Next Target Payroll Run', 'Prochaine Période Paie', 'دورة الرواتب المستهدفة')}
            </span>
            <span className="t-small font-semibold text-black dark:text-white block mt-1 tabular-nums">
              {activeDraftRun
                ? `${activeDraftRun.periodYear}-${String(activeDraftRun.periodMonth).padStart(2, '0')}`
                : L('Auto-linked on next payroll generation', 'Lié lors de la prochaine paie', 'يرتبط عند توليد الرواتب')}
            </span>
          </div>
        </div>

        {tradingRepCommissions.length === 0 ? (
          <div data-sq="card" data-sq-border="solid" className="p-6 text-center text-black/55 dark:text-white/60 t-cap bg-[#FAF7F4]/60 dark:bg-[#1E1C1A] [--sq-stroke:var(--sq-stroke-card)]">
            {L(
              'No commercial rep commissions recorded yet.',
              'Aucune commission commerciale enregistrée pour le moment.',
              'لا توجد عمولات مسجلة بعد.'
            )}
          </div>
        ) : (
          <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <table className="w-full text-left rtl:text-right t-cap">
              <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                <tr>
                  <th className="py-2 px-3">{L('Rep', 'Commercial', 'المندوب')}</th>
                  <th className="py-2 px-3">{L('Date', 'Date', 'التاريخ')}</th>
                  <th className="py-2 px-3">{L('Source Ref', 'Réf. Pièce / Tournée', 'المرجع')}</th>
                  <th className="py-2 px-3 text-right">{L('Basis', 'Assiette CA', 'الأساس')}</th>
                  <th className="py-2 px-3 text-right">{L('Rate', 'Taux', 'النسبة')}</th>
                  <th className="py-2 px-3 text-right">{L('Commission', 'Commission', 'العمولة')}</th>
                  <th className="py-2 px-3">{L('Status', 'Statut', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                {tradingRepCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                    <td className="py-2 px-3 font-semibold text-black dark:text-white">{comm.repName}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{comm.docDate}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{comm.docNumber || '—'}</td>
                    <td className="py-2 px-3 text-right">{formatMoney(comm.basisAmountDzd)}</td>
                    <td className="py-2 px-3 text-right">{(comm.rateBps / 100).toFixed(2)}%</td>
                    <td className="py-2 px-3 text-right font-semibold text-black dark:text-white">
                      {formatMoney(comm.commissionAmountDzd)}
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
              {L('Record Rep Commission', 'Enregistrer Commission Commerciale', 'تسجيل عمولة مندوب')}
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
              label={L('Sales Rep *', 'Commercial B2B *', 'المندوب التجاري *')}
              value={repStaffId}
              onChange={setRepStaffId}
              options={staffList.map((s) => ({
                value: s.id,
                label: `${s.fullName} (${s.role})`,
              }))}
            />
            <LabelSelect
              label={L('Linked Document (optional)', 'Facture / Pièce liée (optionnel)', 'المستند المرتبط (اختياري)')}
              value={commercialDocId}
              onChange={(docId) => {
                setCommercialDocId(docId);
                const doc = commercialDocs.find((d) => d.id === docId);
                if (doc) setBasisAmountDzd(String(doc.totalHtFinal || doc.netToPay || 0));
              }}
              options={[
                { value: '', label: L('-- Manual Basis --', '-- Assiette libre --', '-- أساس يدوي --') },
                ...commercialDocs
                  .filter((d) => d.type === 'facture' || d.type === 'bl')
                  .slice(0, 30)
                  .map((d) => ({
                    value: d.id,
                    label: `${d.docNumber} · ${d.clientName} (${formatMoney(d.totalHtFinal || d.netToPay)})`,
                  })),
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput
                type="number"
                label={L('Basis (DZD) *', 'Assiette HT (DA) *', 'المبلغ الأساسي (دج) *')}
                value={basisAmountDzd}
                onChange={setBasisAmountDzd}
                required
              />
              <LabelInput
                type="number"
                step={0.1}
                label={L('Rate (%) *', 'Taux (%) *', 'النسبة (%) *')}
                value={ratePercent}
                onChange={setRatePercent}
                required
              />
            </div>
            <LabelInput
              type="date"
              label={L('Date *', 'Date *', 'التاريخ *')}
              value={docDate}
              onChange={setDocDate}
              required
            />
            <LabelInput
              label={L('Notes', 'Observation', 'ملاحظات')}
              value={notes}
              onChange={setNotes}
            />
            <div data-sq="ctl-sm" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] flex justify-between items-center tabular-nums">
              <span className="text-black/60 dark:text-white/65">{L('Calculated Commission', 'Commission Calculée', 'العمولة المحسوبة')}</span>
              <span className="t-label font-semibold text-[#BF431F] dark:text-[#FF8F63]">
                {formatMoney(previewCommissionDzd)}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Save Commission', 'Enregistrer Commission', 'حفظ العمولة')}
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
