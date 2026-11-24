import React, { useState } from 'react';
import { X, Milk, AlertTriangle, Check, Thermometer } from 'lucide-react';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AgriMilkingRecord, AgriDairyCow } from '../../../types';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { computeOnilMilkSubsidy } from '../../../utils/agriRules';
import { formatMoney } from '../../../utils/rules';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

interface AgriMilkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: AgriMilkingRecord) => void;
  dairyCows: AgriDairyCow[];
}

export const AgriMilkingModal: React.FC<AgriMilkingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  dairyCows,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );
  const isAr = language === 'ar';

  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionPeriod, setSessionPeriod] = useState<'morning' | 'evening'>('morning');
  const [totalTankLiters, setTotalTankLiters] = useState('480');
  const [tankTemperature, setTankTemperature] = useState('3.8');
  const [destinationDairy, setDestinationDairy] = useState('Laiterie Giplait Draa Ben Khedda');
  const [dairyDeliverySlipNo, setDairyDeliverySlipNo] = useState(`BL-GIP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [fatContentMg, setFatContentMg] = useState('35.2');
  const [density, setDensity] = useState('1.030');

  // Automatically count cows under withholding
  const lockedCows = dairyCows.filter((c) => c.isInWithholdingLockout || c.healthStatus === 'InTreatment' || c.healthStatus === 'Quarantine');
  const estimatedWithholdingLiters = lockedCows.reduce((acc, c) => acc + (c.dailyAvgLiters || c.dailyProductionLiters || 20) / 2, 0);

  const [rejectedWithholdingLiters, setRejectedWithholdingLiters] = useState(String(Math.round(estimatedWithholdingLiters)));

  const total = parseFloat(totalTankLiters) || 0;
  const rejected = parseFloat(rejectedWithholdingLiters) || 0;
  const temp = parseFloat(tankTemperature) || 3.8;
  const subsidy = computeOnilMilkSubsidy(total, rejected, 12.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AgriMilkingRecord = {
      id: `milk_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      sessionDate,
      sessionPeriod,
      totalTankLiters: total,
      rejectedWithholdingLiters: rejected,
      conformingLiters: subsidy.conformingLiters,
      tankTemperatureCelsius: temp,
      destinationDairy: destinationDairy.trim(),
      dairyDeliverySlipNo: dairyDeliverySlipNo.trim() || undefined,
      fatContentMg: parseFloat(fatContentMg) || undefined,
      density: parseFloat(density) || undefined,
      onilSubsidyRateDzd: 12.0,
      onilTotalSubsidyDzd: subsidy.subsidyAmountDzd,
      operatorStaffId: currentUser?.id || 'staff_01',
      createdAt: new Date().toISOString(),
    };
    onSave(payload);
  };

  const dairyOptions = [
    { value: 'Laiterie Giplait Draa Ben Khedda', label: 'Laiterie Giplait Draa Ben Khedda (Groupe Public)' },
    { value: 'Laiterie Giplait Birkhadem, Alger', label: 'Laiterie Giplait Birkhadem, Alger' },
    { value: 'Laiterie Soummam Akbou', label: 'Laiterie Soummam (Akbou, Bejaia)' },
    { value: 'Laiterie Tchin-Lait Candia Baraki', label: 'Tchin-Lait Candia (Baraki)' },
    { value: 'Laiterie Trèfle Blida', label: 'Laiterie Trèfle (Zone Industrielle Benboulaid, Blida)' },
  ];

  return (
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl" zIndexClass="z-[9990]">
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[90vh] overflow-y-auto p-6"
      >
          <div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)]">
            <div className="flex items-center gap-3">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-blue-500/15 text-blue-600 flex items-center justify-center font-semibold shrink-0"
              >
                <Milk size={20} />
              </div>
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {isAr ? 'تسجيل جلسة حلب وتبريد الحليب' : 'Enregistrer une Session de Traite & Tank'}
                </h2>
              </div>
            </div>
            <button
              type="button"
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              onClick={onClose}
              className="p-2 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <X size={18} />
            </button>
          </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <LabelInput
              field="SessionDate"
              label={isAr ? 'تاريخ الحلب *' : 'Date de la Traite *'}
              type="date"
              value={sessionDate}
              onChange={setSessionDate}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <div className="space-y-1">
              <span className="block t-cap font-semibold text-black/55 dark:text-white/55">
                {isAr ? 'فترة الحلب *' : 'Période de Traite *'}
              </span>
              <LiveSegmentedControl
                size="md"
                fullWidth
                value={sessionPeriod}
                onChange={(val) => setSessionPeriod(val as 'morning' | 'evening')}
                options={[
                  { value: 'morning', label: isAr ? 'الصباح' : 'Matin (05h)' },
                  { value: 'evening', label: isAr ? 'المساء' : 'Soir (16h30)' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              field="TotalTankLiters"
              label={isAr ? 'إجمالي لترات الحلب بالخزان *' : 'Volume Total Trait (Litres) *'}
              type="number"
              value={totalTankLiters}
              onChange={setTotalTankLiters}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="TankTemperature"
              label={isAr ? 'حرارة الخزان (°C) *' : 'Température Tank Réfrigéré (°C) *'}
              type="number"
              step="0.1"
              value={tankTemperature}
              onChange={setTankTemperature}
              width="100%"
              height={40}
              corner={12}
              required
            />
          </div>

          {/* Temperature Warning if > 4°C */}
          {temp > 4.0 && (
            <div
              data-sq="card"
              data-sq-border="solid"
              style={{ '--sq-stroke': 'rgba(245, 158, 11, 0.35)' } as React.CSSProperties}
              className="p-3 bg-amber-500/10 flex items-center gap-2 t-cap text-amber-800 dark:text-amber-300"
            >
              <Thermometer size={16} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold">
                  {temp > 6.0
                    ? (isAr ? 'إنذار حرج: عطل ضاغط التبريد (>6°C)' : 'Alerte Critique : Compresseur Défaillant (>6°C)')
                    : (isAr ? 'تنبيه: حرارة الخزان أعلى من المعيار (>4°C)' : 'Attention : Température au-dessus de 4°C')}
                </span>
                <p className="t-cap opacity-80 mt-0.5">
                  {isAr
                    ? 'الحرارة المثالية لتخزين الحليب هي بين +3.5°C و +4.0°C لتفادي التحمض.'
                    : 'La plage optimale de conservation du lait cru est de +3.5°C à +4.0°C pour éviter l’acidification.'}
                </p>
              </div>
            </div>
          )}

          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-4 bg-neutral-50 dark:bg-[#22201E] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="t-small font-semibold text-black dark:text-white">
                {isAr ? 'عزل الحليب المعالج بالمضادات الحيوية' : 'Exclusion Sanitaire (Antibiotiques)'}
              </span>
              <span className="t-small text-amber-600 font-medium">
                {lockedCows.length} {isAr ? 'أبقار خاضعة لفترة السحب' : 'vache(s) sous traitement'}
              </span>
            </div>

            <LabelInput
              field="RejectedWithholdingLiters"
              label={isAr ? 'اللترات المعزولة المهدورة (غير مطابقة) *' : 'Litres Écartés / Jetés (Non-Conformes) *'}
              type="number"
              value={rejectedWithholdingLiters}
              onChange={setRejectedWithholdingLiters}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <p className="t-cap text-black/55 dark:text-white/55">
              {isAr
                ? 'الحليب المعالج بالمضادات الحيوية يُستبعد تلقائياً من خزان التسليم لحماية دعم ONIL.'
                : 'Le lait contenant des résidus médicamenteux est strictly exclu du volume éligible à la prime ONIL.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelSelect
              field="DestinationDairy"
              label={isAr ? 'الملبنة المستلمة المعتمدة *' : 'Laiterie Destinataire Agréée *'}
              value={destinationDairy}
              onChange={setDestinationDairy}
              options={dairyOptions}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="DairyDeliverySlipNo"
              label={isAr ? 'رقم وصل التسليم (BL)' : 'N° Bon de Livraison Laiterie'}
              value={dairyDeliverySlipNo}
              onChange={setDairyDeliverySlipNo}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              field="FatContentMg"
              label={isAr ? 'نسبة المادة الدسمة (غ/ل)' : 'Matière Grasse (g/L)'}
              type="number"
              step="0.1"
              value={fatContentMg}
              onChange={setFatContentMg}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="Density"
              label={isAr ? 'الكثافة (Densité)' : 'Densité'}
              type="number"
              step="0.001"
              value={density}
              onChange={setDensity}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          {/* ONIL Subsidy Live Payout Calculation Box */}
          <div
            data-sq="card"
            data-sq-border="solid"
            style={{ '--sq-stroke': 'rgba(16, 185, 129, 0.3)' } as React.CSSProperties}
            className="p-4 bg-emerald-500/10 t-cap space-y-2 text-emerald-900 dark:text-emerald-300"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">Volume Conforme Éligible :</span>
              <span className="tabular-nums font-semibold">{subsidy.conformingLiters.toLocaleString()} Litres</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Subvention de l’État ONIL (12 DA/L) :</span>
              <span className="tabular-nums font-semibold t-label text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                + {formatMoney(subsidy.subsidyAmountDzd)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--atr-divider)]">
            <Button tone="soft" size={40} onClick={onClose} type="button">
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button tone="accent" size={40} type="submit" leading={<Check size={14} />}>
              {isAr ? 'تأكيد وقيد جلسة الحلب' : 'Valider la Session de Traite'}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
