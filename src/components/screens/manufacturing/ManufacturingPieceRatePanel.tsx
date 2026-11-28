import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Plus, Send, X } from 'lucide-react';
import {
  selectCurrentMfgPieceRateEntriesFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import type { MfgPieceRateEntry, StaffMember, StaffPayrollRunRecord } from '../../../types/index';
import { computePieceRateEarnings } from '../../../utils/manufacturingDepth';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { useManufacturingData } from './manufacturingData';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

export interface ManufacturingPieceRatePanelProps {
  staffList: StaffMember[];
  payrollRuns: StaffPayrollRunRecord[];
  language: string;
}

export const ManufacturingPieceRatePanel: React.FC<ManufacturingPieceRatePanelProps> = ({
  staffList = [],
  payrollRuns = [],
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { pieceRateEntries, account, currentBusinessId, currentBranchId } = useAtriumSelector(
    (s) => ({
      pieceRateEntries: selectCurrentMfgPieceRateEntriesFromState(s),
      account: s.account,
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
    }),
    shallowEqualObjects
  );
  const { recordMfgPieceRateEntry, postMfgPieceRateToPayroll } = useAtriumActions();
  const { orders } = useManufacturingData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operatorStaffId, setOperatorStaffId] = useState(() => staffList[0]?.id || '');
  const [orderId, setOrderId] = useState(() => orders[0]?.id || '');
  const [goodUnits, setGoodUnits] = useState('10');
  const [ratePerPieceDzd, setRatePerPieceDzd] = useState('250');
  const [periodMonth, setPeriodMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState('');

  const accruedEntries = useMemo(
    () => (pieceRateEntries || []).filter((e) => e.status === 'accrued'),
    [pieceRateEntries]
  );

  const postedEntries = useMemo(
    () => (pieceRateEntries || []).filter((e) => e.status === 'posted_to_payroll' || e.status === 'paid'),
    [pieceRateEntries]
  );

  const accruedTotalDzd = useMemo(
    () => accruedEntries.reduce((sum, e) => sum + centimesToDzd(e.grossAmountCentimes || 0), 0),
    [accruedEntries]
  );

  const postedTotalDzd = useMemo(
    () => postedEntries.reduce((sum, e) => sum + centimesToDzd(e.grossAmountCentimes || 0), 0),
    [postedEntries]
  );

  const activeDraftRun = useMemo(() => payrollRuns.find((r) => r.status === 'draft'), [payrollRuns]);

  const previewRateCentimes = useMemo(
    () => dzdToCentimes(Math.max(0, parseFloat(ratePerPieceDzd) || 0)),
    [ratePerPieceDzd]
  );

  const previewGrossCentimes = useMemo(
    () =>
      computePieceRateEarnings({
        goodUnits: Math.max(0, parseInt(goodUnits, 10) || 0),
        ratePerPieceCentimes: previewRateCentimes,
      }),
    [goodUnits, previewRateCentimes]
  );

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const operator = staffList.find((s) => s.id === operatorStaffId) || staffList[0];
    if (!operator) {
      showToast({
        type: 'warning',
        title: L('No Operator Selected', 'Aucun opérateur sélectionné', 'لم يتم اختيار مشغل'),
        message: L('Add a workshop operator to staff first.', 'Ajoutez d’abord un opérateur dans l’équipe.', 'أضف مشغلاً إلى الفريق أولاً.'),
      });
      return;
    }

    const units = Math.max(0, parseInt(goodUnits, 10) || 0);
    if (units <= 0 || previewRateCentimes <= 0) {
      showToast({
        type: 'warning',
        title: L('Invalid Values', 'Valeurs invalides', 'قيم غير صالحة'),
        message: L('Enter positive units and rate per piece.', 'Saisissez un nombre de pièces et un tarif positifs.', 'أدخل عدداً موجباً للقطع والأجر.'),
      });
      return;
    }

    const linkedOrder = orders.find((o) => o.id === orderId);
    const nowIso = new Date().toISOString();

    const record: MfgPieceRateEntry = {
      id: `mpr_${Date.now()}`,
      accountId: account.id,
      businessId: currentBusinessId,
      branchId: currentBranchId,
      staffId: operator.id,
      operatorStaffId: operator.id,
      operatorName: operator.fullName,
      orderId: linkedOrder?.id,
      orderNumber: linkedOrder?.orderNumber || `MAN-${nowIso.slice(0, 10)}`,
      periodMonth: periodMonth || nowIso.slice(0, 7),
      goodUnits: units,
      scrapUnits: 0,
      ratePerPieceCentimes: previewRateCentimes,
      grossAmountCentimes: previewGrossCentimes,
      status: 'accrued',
      notes: notes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    recordMfgPieceRateEntry(record);
    setNotes('');
    setIsModalOpen(false);
  };

  const handlePostAllAccrued = () => {
    if (accruedEntries.length === 0) return;
    postMfgPieceRateToPayroll(
      accruedEntries.map((c) => c.id),
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
                  'Operator Piece-Rate Earnings & Payroll Bridge',
                  'Rendement à la Pièce & Pont Paie Atelier',
                  'مكافآت الإنتاج بالقطعة وترحيلها للرواتب'
                )}
              </span>
            </h3>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L(
                'Conforming units logged at workstations flow into monthly payroll slips (Primes Rendement Atelier).',
                'Les pièces conformes validées en atelier alimentent directement les bulletins de paie mensuels.',
                'تُرحَّل القطع المطابقة المسجلة في المحطة مباشرة إلى كشوف الرواتب الشهرية.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AtriumButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setIsModalOpen(true)}>
              {L('Record Piece Bonus', 'Saisir Prime Pièce', 'تسجيل مكافأة قطعة')}
            </AtriumButton>
            <AtriumButton
              variant="primary"
              size="sm"
              icon={<Send size={14} />}
              onClick={handlePostAllAccrued}
              disabled={accruedEntries.length === 0}
            >
              {L(
                `Post to Payroll (${accruedEntries.length})`,
                `Envoyer en Paie (${accruedEntries.length})`,
                `ترحيل للرواتب (${accruedEntries.length})`
              )}
            </AtriumButton>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Accrued Piece Earnings', 'Primes Accomplies (En Attente)', 'مستحقات معلقة')}</span>
            <span className="t-card font-semibold text-amber-600 dark:text-amber-400">{formatMoney(accruedTotalDzd, language)}</span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5">{accruedEntries.length} {L('entries', 'lignes', 'بنود')}</span>
          </div>
          <div data-sq="card" data-sq-border="solid" className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <span className="t-cap text-black/55 dark:text-white/60 block">{L('Posted to Payroll', 'Transférées en Paie', 'مرحّلة للرواتب')}</span>
            <span className="t-card font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(postedTotalDzd, language)}</span>
            <span className="t-cap text-black/55 dark:text-white/60 block mt-0.5">{postedEntries.length} {L('entries', 'lignes', 'بنود')}</span>
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

        {(pieceRateEntries || []).length === 0 ? (
          <div data-sq="card" data-sq-border="solid" className="p-6 text-center text-black/55 dark:text-white/60 t-cap bg-[#FAF7F4]/60 dark:bg-[#1E1C1A] [--sq-stroke:var(--sq-stroke-card)]">
            {L(
              'No piece-rate earnings recorded yet. Declare output on Workstation 03 or record a manual entry above.',
              'Aucune prime à la pièce enregistrée. Déclarez un cycle sur le Poste 03 ou saisissez une ligne ci-dessus.',
              'لا توجد مكافآت إنتاج مسجلة بعد.'
            )}
          </div>
        ) : (
          <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <table className="w-full text-left rtl:text-right t-cap">
              <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                <tr>
                  <th className="py-2 px-3">{L('Operator', 'Opérateur', 'المشغل')}</th>
                  <th className="py-2 px-3">{L('Order Ref', 'N° OF', 'أمر التصنيع')}</th>
                  <th className="py-2 px-3">{L('Period', 'Période', 'الفترة')}</th>
                  <th className="py-2 px-3 text-right">{L('Good Units', 'Pièces Bonnes', 'القطع السليمة')}</th>
                  <th className="py-2 px-3 text-right">{L('Rate / Unit', 'Tarif / u', 'الأجر / قطعة')}</th>
                  <th className="py-2 px-3 text-right">{L('Gross Bonus', 'Prime Brute', 'إجمالي المكافأة')}</th>
                  <th className="py-2 px-3">{L('Status', 'Statut', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                {(pieceRateEntries || []).map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                    <td className="py-2 px-3 font-semibold text-black dark:text-white">{entry.operatorName}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{entry.orderNumber}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">{entry.periodMonth}</td>
                    <td className="py-2 px-3 text-right font-medium text-black dark:text-white">{entry.goodUnits} u</td>
                    <td className="py-2 px-3 text-right">{formatMoney(centimesToDzd(entry.ratePerPieceCentimes), language)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-black dark:text-white">
                      {formatMoney(centimesToDzd(entry.grossAmountCentimes), language)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-check,6px)] t-small font-semibold ${
                          entry.status === 'posted_to_payroll' || entry.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {(entry.status === 'posted_to_payroll' || entry.status === 'paid') && <CheckCircle2 size={12} />}
                        <span>
                          {entry.status === 'posted_to_payroll' || entry.status === 'paid'
                            ? L('Posted to Payroll', 'Transférée Paie', 'مرحّلة للرواتب')
                            : L('Accrued', 'En Attente', 'معلقة')}
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
            <h2 className="t-card font-semibold text-black dark:text-white">{L('Record Operator Piece Earnings', 'Enregistrer Prime à la Pièce', 'تسجيل مكافأة قطعة')}</h2>
            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleRecord} className="space-y-3 t-cap">
            <LabelSelect
              label={L('Operator *', 'Opérateur *', 'المشغل *')}
              value={operatorStaffId}
              onChange={setOperatorStaffId}
              options={staffList.map((s) => ({ value: s.id, label: `${s.fullName} (${s.role})` }))}
            />
            <LabelSelect
              label={L('Manufacturing Order', 'Ordre de Fabrication', 'أمر التصنيع')}
              value={orderId}
              onChange={(oid) => {
                setOrderId(oid);
                const ord = orders.find((x) => x.id === oid);
                if (ord?.unitPieceRateCentimes) {
                  setRatePerPieceDzd(String(centimesToDzd(ord.unitPieceRateCentimes)));
                }
              }}
              options={[
                { value: '', label: L('-- Manual / Ad-hoc --', '-- Saisie libre --', '-- يدوي --') },
                ...orders.map((o) => ({ value: o.id, label: `${o.orderNumber} · ${o.productName}` })),
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput type="number" label={L('Conforming Units *', 'Pièces Conformes *', 'القطع السليمة *')} value={goodUnits} onChange={setGoodUnits} required />
              <LabelInput type="number" step="any" label={L('Piece Rate (DZD/u) *', 'Tarif Pièce (DA/u) *', 'الأجر للقطعة (دج) *')} value={ratePerPieceDzd} onChange={setRatePerPieceDzd} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelInput type="month" label={L('Period Month *', 'Mois Paie *', 'شهر الراتب *')} value={periodMonth} onChange={setPeriodMonth} required />
              <LabelInput type="text" label={L('Notes', 'Observations', 'ملاحظات')} value={notes} onChange={setNotes} placeholder="Poste 03 CNC..." />
            </div>
            <div data-sq="ctl-sm" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] flex justify-between items-center tabular-nums">
              <span className="text-black/60 dark:text-white/65">{L('Calculated Gross Bonus', 'Prime Brute Calculée', 'المكافأة الإجمالية')}</span>
              <span className="t-label font-semibold text-[#BF431F] dark:text-[#FF8F63]">
                {formatMoney(centimesToDzd(previewGrossCentimes), language)}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">
                {L('Save Earnings', 'Enregistrer', 'حفظ')}
              </AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </ScreenPod>
  );
};
