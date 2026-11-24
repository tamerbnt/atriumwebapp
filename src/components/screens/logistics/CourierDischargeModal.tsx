import React, { useState, useEffect } from 'react';
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
import { LabelInput } from '../../ui/LabelInput';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface CourierDischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: LogisticsManifest | null;
  onSaveDischarge: (discharge: CourierCashDischarge) => void;
}

export const CourierDischargeModal: React.FC<CourierDischargeModalProps> = ({
  isOpen,
  onClose,
  manifest: rawManifest,
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
  const manifest = useRetainedModalValue(isOpen ? rawManifest : null);

  const [n2000, setN2000] = useState(0);
  const [n1000, setN1000] = useState(0);
  const [n500, setN500] = useState(0);
  const [n200, setN200] = useState(0);
  const [coins, setCoins] = useState(0);
  const [courierSigned, setCourierSigned] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setN2000(0);
    setN1000(0);
    setN500(0);
    setN200(0);
    setCoins(0);
    setCourierSigned(false);
  }, [isOpen, rawManifest?.id]);

  const expectedAmount = manifest?.totalCodExpectedDzd || 0;

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

    if (!manifest) return;
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
    <KineticModalShell
      isOpen={isOpen && Boolean(rawManifest)}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      scrimClassName="bg-black/50"
      ariaLabel={isAr ? 'تبرئة ذمة السائق ومطابقة الصندوق' : 'Clôture Tournée & Billet de Décharge'}
    >
      {manifest && (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 t-cap">
              <LabelInput
                label="Billets 2 000 DZD"
                type="number"
                min="0"
                value={n2000}
                onChange={(v) => setN2000(parseInt(v, 10) || 0)}
                suffix={<span className="t-cap text-black/55 dark:text-white/55 tabular-nums whitespace-nowrap">= {formatMoney(n2000 * 2000, language)}</span>}
              />
              <LabelInput
                label="Billets 1 000 DZD"
                type="number"
                min="0"
                value={n1000}
                onChange={(v) => setN1000(parseInt(v, 10) || 0)}
                suffix={<span className="t-cap text-black/55 dark:text-white/55 tabular-nums whitespace-nowrap">= {formatMoney(n1000 * 1000, language)}</span>}
              />
              <LabelInput
                label="Billets 500 DZD"
                type="number"
                min="0"
                value={n500}
                onChange={(v) => setN500(parseInt(v, 10) || 0)}
                suffix={<span className="t-cap text-black/55 dark:text-white/55 tabular-nums whitespace-nowrap">= {formatMoney(n500 * 500, language)}</span>}
              />
              <LabelInput
                label="Billets 200 DZD"
                type="number"
                min="0"
                value={n200}
                onChange={(v) => setN200(parseInt(v, 10) || 0)}
                suffix={<span className="t-cap text-black/55 dark:text-white/55 tabular-nums whitespace-nowrap">= {formatMoney(n200 * 200, language)}</span>}
              />
              <LabelInput
                label="Pièces de monnaie (Total)"
                type="number"
                min="0"
                value={coins}
                onChange={(v) => setCoins(parseFloat(v) || 0)}
              />
            </div>
          </div>

          {/* Signature & Confirmation Interlock */}
          <div
            data-sq="card"
            data-sq-border="none"
            className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="t-small font-semibold text-black dark:text-white">
                {isAr
                  ? 'أؤكد إمضاء وموافقة السائق على المبالغ المحصلة والمسلمة للصندوق'
                  : 'Je confirme la signature conjointe du chauffeur attestant de la remise effective des fonds'}
              </span>
              <LiveSwitch
                checked={courierSigned}
                onCheckedChange={setCourierSigned}
                aria-label={isAr ? 'موافقة السائق' : 'Signature conjointe du chauffeur'}
              />
            </div>
            <p className="t-cap text-black/55 dark:text-white/55">
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
      )}
    </KineticModalShell>
  );
};
