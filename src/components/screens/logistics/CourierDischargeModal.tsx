import React, { useState } from 'react';
import { CreditCard, DollarSign, CheckCircle2, AlertTriangle, Printer, X, ShieldCheck } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
} from '../../../services/store';
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
  const { language, currentUser } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="sq-elev-pop max-w-2xl w-full">
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-10 h-10 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-semibold"
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-semibold t-card text-black dark:text-white">
                {isAr ? 'تبرئة ذمة السائق ومطابقة الصندوق (Double-Lock)' : 'Clôture Tournée & Billet de Décharge'}
              </h3>
              <p className="t-cap text-black/55 dark:text-white/55">
                {manifest.manifestNumber} • Chauffeur: {manifest.driverName} ({manifest.vehiclePlate})
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={isAr ? 'إغلاق' : 'Fermer'}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
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
              data-sq-border="none"
              className="p-4 bg-[#F5F1EC] dark:bg-[#22201E]"
            >
              <span className="t-small font-medium text-black/55 dark:text-white/55 block">
                {isAr ? 'المبلغ النظري المتوقع' : 'Montant Théorique Attendu'}
              </span>
              <span className="t-pod font-semibold tabular-nums text-black dark:text-white">
                {formatMoney(expectedAmount, language)}
              </span>
            </div>

            <div
              data-sq="card"
              data-sq-border="none"
              className="p-4 bg-[#F5F1EC] dark:bg-[#22201E]"
            >
              <span className="t-small font-medium text-black/55 dark:text-white/55 block">
                {isAr ? 'المبلغ الفعلي المعدود' : 'Total Physique Compté'}
              </span>
              <span className="t-pod font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {formatMoney(balance.actualTotalDzd, language)}
              </span>
            </div>

            <div
              data-sq="card"
              data-sq-border="none"
              className={`p-4 ${
                balance.status === 'Balanced'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                  : balance.status === 'Shortage'
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                  : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
              }`}
            >
              <span className="t-small font-medium block">
                {isAr ? 'الفارق / الفائض' : 'Écart de Caisse'}
              </span>
              <span className="t-pod font-semibold tabular-nums">
                {balance.discrepancyDzd > 0 ? `+${balance.discrepancyDzd}` : balance.discrepancyDzd} DZD
              </span>
            </div>
          </div>

          {/* Banknote Denominations Counter */}
          <div
            data-sq="card"
            data-sq-border="none"
            className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold t-small text-black dark:text-white">
                {isAr ? 'تعداد الأوراق النقدية والقطع (الدينار الجزائري)' : 'Comptage des Billets & Pièces (DZD)'}
              </h4>
              <button
                type="button"
                onClick={handleQuickFillClean}
                className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline cursor-pointer"
              >
                {isAr ? 'مطابقة آلية فورية' : 'Ajuster automatiquement au centime'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 t-cap">
              <div>
                <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 2 000 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="none"
                    className="w-full bg-white dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n2000}
                      onChange={(e) => setN2000(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-2 tabular-nums font-semibold"
                    />
                  </div>
                  <span className="t-cap text-black/55 dark:text-white/55 shrink-0 tabular-nums">
                    = {formatMoney(n2000 * 2000, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 1 000 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="none"
                    className="w-full bg-white dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n1000}
                      onChange={(e) => setN1000(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-2 tabular-nums font-semibold"
                    />
                  </div>
                  <span className="t-cap text-black/55 dark:text-white/55 shrink-0 tabular-nums">
                    = {formatMoney(n1000 * 1000, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 500 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="none"
                    className="w-full bg-white dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n500}
                      onChange={(e) => setN500(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-2 tabular-nums font-semibold"
                    />
                  </div>
                  <span className="t-cap text-black/55 dark:text-white/55 shrink-0 tabular-nums">
                    = {formatMoney(n500 * 500, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
                  Billets 200 DZD
                </label>
                <div className="flex items-center gap-2">
                  <div
                    data-sq="ctl"
                    data-sq-border="none"
                    className="w-full bg-white dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow"
                  >
                    <input
                      type="number"
                      min="0"
                      value={n200}
                      onChange={(e) => setN200(parseInt(e.target.value) || 0)}
                      className="lbi-field w-full h-full bg-transparent border-0 px-3 py-2 tabular-nums font-semibold"
                    />
                  </div>
                  <span className="t-cap text-black/55 dark:text-white/55 shrink-0 tabular-nums">
                    = {formatMoney(n200 * 200, language)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
                  Pièces de monnaie (Total)
                </label>
                <div
                  data-sq="ctl"
                  data-sq-border="none"
                  className="w-full bg-white dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow"
                >
                  <input
                    type="number"
                    min="0"
                    value={coins}
                    onChange={(e) => setCoins(parseFloat(e.target.value) || 0)}
                    className="lbi-field w-full h-full bg-transparent border-0 px-3 py-2 tabular-nums font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signature & Confirmation Interlock */}
          <div
            data-sq="card"
            data-sq-border="none"
            className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2"
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={courierSigned}
                onChange={(e) => setCourierSigned(e.target.checked)}
                className="w-4 h-4 rounded-[var(--r-check,6px)] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] focus:ring-[#d4522f]"
              />
              <span className="t-small font-semibold text-black dark:text-white">
                {isAr
                  ? 'أؤكد إمضاء وموافقة السائق على المبالغ المحصلة والمسلمة للصندوق'
                  : 'Je confirme la signature conjointe du chauffeur attestant de la remise effective des fonds'}
              </span>
            </label>
            <p className="t-cap text-black/55 dark:text-white/55 pl-7">
              {isAr
                ? 'إصدار محضر تبرئة الذمة يلغي مسؤولية السائق ويحول المبالغ إلى رصيد خزينة المركز'
                : 'L\'approbation génère le bon de décharge légal et transfère la responsabilité au coffre du Hub.'}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--atr-divider)] shrink-0">
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
