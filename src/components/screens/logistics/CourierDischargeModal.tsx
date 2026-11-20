import React, { useState } from 'react';
import { CreditCard, DollarSign, CheckCircle2, AlertTriangle, Printer, X, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { CourierCashDischarge, LogisticsManifest } from '../../../types';
import { computeCourierDischargeBalance } from '../../../utils/logisticsRules';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';

interface CourierDischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: LogisticsManifest;
  onSaveDischarge: (discharge: CourierCashDischarge) => void;
}

export const CourierDischargeModal: React.FC<CourierDischargeModalProps> = ({
  isOpen,
  onClose,
  manifest,
  onSaveDischarge,
}) => {
  const { language, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [n2000, setN2000] = useState(0);
  const [n1000, setN1000] = useState(0);
  const [n500, setN500] = useState(0);
  const [n200, setN200] = useState(0);
  const [coins, setCoins] = useState(0);
  const [courierSigned, setCourierSigned] = useState(false);

  if (!isOpen) return null;

  const expectedAmount = manifest.totalCodExpectedDzd || 0;

  const balance = computeCourierDischargeBalance({
    expectedAmountDzd: expectedAmount,
    note2000Count: n2000,
    note1000Count: n1000,
    note500Count: n500,
    note200Count: n200,
    coinsDzd: coins,
  });

  const handleQuickFillClean = () => {
    // Fill banknote distribution matching exactly the expected total
    let rem = expectedAmount;
    const count2000 = Math.floor(rem / 2000);
    rem %= 2000;
    const count1000 = Math.floor(rem / 1000);
    rem %= 1000;
    const count500 = Math.floor(rem / 500);
    rem %= 500;
    const count200 = Math.floor(rem / 200);
    rem %= 200;

    setN2000(count2000);
    setN1000(count1000);
    setN500(count500);
    setN200(count200);
    setCoins(rem);
    setCourierSigned(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!courierSigned) {
      showToast(
        isAr ? 'يرجى تأكيد إمضاء السائق على كشف التصفية' : 'Signature du chauffeur obligatoire',
        'error'
      );
      return;
    }

    const discharge: CourierCashDischarge = {
      id: `dech_${Date.now()}`,
      accountId: manifest.accountId,
      businessId: manifest.businessId,
      branchId: manifest.branchId,
      cashierStaffId: currentUser?.id || 'staff_cashier',
      courierStaffId: manifest.driverName,
      manifestId: manifest.id,
      dischargeNumber: `DECH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      deliveredCount: manifest.totalShipmentsCount,
      returnedCount: 0,
      expectedCodDzd: expectedAmount,
      actualCashTurnedInDzd: balance.actualTotalDzd,
      discrepancyDzd: balance.discrepancyDzd,
      banknotesCount: {
        note2000: n2000,
        note1000: n1000,
        note500: n500,
        note200: n200,
        coins,
      },
      courierSignatureConfirmed: courierSigned,
      status: balance.status === 'Balanced' ? 'Clean' : balance.status === 'Shortage' ? 'Shortage' : 'Surplus',
      timestamp: new Date().toISOString(),
    };

    onSaveDischarge(discharge);
    showToast(
      isAr ? 'تم تسجيل محضر تبرئة ذمة السائق وخزن النقد' : 'Billet de décharge caisse validé',
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="sq-elev-pop max-w-2xl w-full">
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-neutral-900 w-full p-6 border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-10 h-10 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold"
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {isAr ? 'تبرئة ذمة السائق ومطابقة الصندوق (Double-Lock)' : 'Clôture Tournée & Billet de Décharge'}
              </h3>
              <p className="text-xs text-black/55 dark:text-white/55">
                {manifest.manifestNumber} • Chauffeur: {manifest.driverName} ({manifest.vehiclePlate})
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={isAr ? 'إغلاق' : 'Fermer'}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-3.5 bg-[#F3EDE7] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60"
            >
              <span className="text-[11px] font-medium text-black/55 dark:text-white/55 block">
                {isAr ? 'المبلغ النظري المتوقع' : 'Montant Théorique Attendu'}
              </span>
              <span className="text-lg font-bold font-mono text-black dark:text-white">
                {formatMoney(expectedAmount, language)}
              </span>
            </div>

            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-3.5 bg-[#F3EDE7] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60"
            >
              <span className="text-[11px] font-medium text-black/55 dark:text-white/55 block">
                {isAr ? 'المبلغ الفعلي المعدود' : 'Total Physique Compté'}
              </span>
              <span className="text-lg font-bold font-mono text-[#d4522f]">
                {formatMoney(balance.actualTotalDzd, language)}
              </span>
            </div>

            <div
              data-sq="card"
              data-sq-border="solid"
              className={`p-3.5 border ${
                balance.status === 'Balanced'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 [--sq-stroke:#a7f3d0] dark:[--sq-stroke:#065f46] text-emerald-700 dark:text-emerald-300'
                  : balance.status === 'Shortage'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 [--sq-stroke:#fde68a] dark:[--sq-stroke:#92400e] text-amber-700 dark:text-amber-300'
                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 [--sq-stroke:#bfdbfe] dark:[--sq-stroke:#1e40af] text-blue-700 dark:text-blue-300'
              }`}
            >
              <span className="text-[11px] font-medium block">
                {isAr ? 'الفارق / الفائض' : 'Écart de Caisse'}
              </span>
              <span className="text-lg font-bold font-mono">
                {balance.discrepancyDzd > 0 ? `+${balance.discrepancyDzd}` : balance.discrepancyDzd} DZD
              </span>
            </div>
          </div>

          {/* Banknote Denominations Counter */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-4 bg-[#F3EDE7] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-black dark:text-white uppercase tracking-wider">
                {isAr ? 'تعداد الأوراق النقدية والقطع (الدينار الجزائري)' : 'Comptage des Billets & Pièces (DZD)'}
              </h4>
              <button
                type="button"
                onClick={handleQuickFillClean}
                className="text-[11px] font-semibold text-[#d4522f] hover:underline cursor-pointer"
              >
                {isAr ? 'مطابقة آلية فورية' : 'Ajuster automatiquement au centime'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 2 000 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n2000}
                      onChange={(e) => setN2000(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-1.5 font-mono font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-black/55 dark:text-white/55 shrink-0 font-mono">
                    = {formatMoney(n2000 * 2000, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 1 000 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n1000}
                      onChange={(e) => setN1000(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-1.5 font-mono font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-black/55 dark:text-white/55 shrink-0 font-mono">
                    = {formatMoney(n1000 * 1000, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 500 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n500}
                      onChange={(e) => setN500(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-1.5 font-mono font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-black/55 dark:text-white/55 shrink-0 font-mono">
                    = {formatMoney(n500 * 500, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 200 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n200}
                      onChange={(e) => setN200(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-1.5 font-mono font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-black/55 dark:text-white/55 shrink-0 font-mono">
                    = {formatMoney(n200 * 200, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black/70 dark:text-white/75 mb-1">
                  Pièces de monnaie (Total)
                </label>
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                >
                  <input
                    type="number"
                    min="0"
                    value={coins}
                    onChange={(e) => setCoins(parseFloat(e.target.value) || 0)}
                    className="lbi-field w-full h-full bg-transparent border-0 px-3 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signature & Confirmation Interlock */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-2"
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={courierSigned}
                onChange={(e) => setCourierSigned(e.target.checked)}
                className="w-4 h-4 rounded-[var(--r-check,6px)] text-[#d4522f] focus:ring-[#d4522f]"
              />
              <span className="text-xs font-semibold text-black dark:text-white">
                {isAr
                  ? 'أؤكد إمضاء وموافقة السائق على المبالغ المحصلة والمسلمة للصندوق'
                  : 'Je confirme la signature conjointe du chauffeur attestant de la remise effective des fonds'}
              </span>
            </label>
            <p className="text-[11px] text-black/55 dark:text-white/55 pl-7">
              {isAr
                ? 'إصدار محضر تبرئة الذمة يلغي مسؤولية السائق ويحول المبالغ إلى رصيد خزينة المركز'
                : 'L\'approbation génère le bon de décharge légal et transfère la responsabilité au coffre du Hub.'}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
            <AtriumButton
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                showToast(isAr ? 'طباعة محضر التبرئة' : 'Impression du bon de décharge', 'info');
                window.print();
              }}
              icon={<Printer size={14} />}
            >
              {isAr ? 'طباعة المحضر' : 'Imprimer Décharge'}
            </AtriumButton>

            <div className="flex items-center gap-2">
              <AtriumButton variant="ghost" size="sm" type="button" onClick={onClose}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </AtriumButton>
              <AtriumButton variant="primary" size="sm" type="submit" icon={<CheckCircle2 size={14} />}>
                {isAr ? 'تأكيد وإغلاق العهدة' : 'Valider la Décharge'}
              </AtriumButton>
            </div>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};
