import React, { useState } from 'react';
import { X, Milk, AlertTriangle, Check, Thermometer } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriMilkingRecord, AgriDairyCow } from '../../../types';
import { useAtriumStore } from '../../../services/store';
import { computeOnilMilkSubsidy } from '../../../utils/agriRules';
import { formatMoney } from '../../../utils/rules';

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
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
              <Milk size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {isAr ? 'تسجيل جلسة حلب وتبريد الحليب' : 'Enregistrer une Session de Traite & Tank'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? 'مراقبة درجة حرارة خزان التبريد واحتساب دعم أونيل (12 دج/ل)'
                  : 'Contrôle thermique du tank à lait et calcul de la prime d’État ONIL'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              label={isAr ? 'تاريخ الحلب *' : 'Date de la Traite *'}
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
            <LabelSelect
              label={isAr ? 'فترة الحلب *' : 'Période de Traite *'}
              value={sessionPeriod}
              onChange={(val) => setSessionPeriod(val as 'morning' | 'evening')}
              options={[
                { value: 'morning', label: isAr ? 'حلب الصباح (05:00 - 07:00)' : 'Traite du Matin (05:00 - 07:00)' },
                { value: 'evening', label: isAr ? 'حلب المساء (16:30 - 18:30)' : 'Traite du Soir (16:30 - 18:30)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              label={isAr ? 'إجمالي لترات الحلب بالخزان *' : 'Volume Total Trait (Litres) *'}
              type="number"
              value={totalTankLiters}
              onChange={(e) => setTotalTankLiters(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'حرارة الخزان (°C) *' : 'Température Tank Réfrigéré (°C) *'}
              type="number"
              step="0.1"
              value={tankTemperature}
              onChange={(e) => setTankTemperature(e.target.value)}
              required
            />
          </div>

          {/* Temperature Warning if > 4°C */}
          {temp > 4.0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <Thermometer size={16} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">
                  {temp > 6.0
                    ? (isAr ? 'إنذار حرج: عطل ضاغط التبريد (>6°C)' : 'Alerte Critique : Compresseur Défaillant (>6°C)')
                    : (isAr ? 'تنبيه: حرارة الخزان أعلى من المعيار (>4°C)' : 'Attention : Température au-dessus de 4°C')}
                </span>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {isAr
                    ? 'الحرارة المثالية لتخزين الحليب هي بين +3.5°C و +4.0°C لتفادي التحمض.'
                    : 'La plage optimale de conservation du lait cru est de +3.5°C à +4.0°C pour éviter l’acidification.'}
                </p>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {isAr ? 'عزل الحليب المعالج بالمضادات الحيوية' : 'Exclusion Sanitaire (Antibiotiques)'}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">
                {lockedCows.length} {isAr ? 'أبقار خاضعة لفترة السحب' : 'vache(s) sous traitement'}
              </span>
            </div>

            <LabelInput
              label={isAr ? 'اللترات المعزولة المهدورة (غير مطابقة) *' : 'Litres Écartés / Jetés (Non-Conformes) *'}
              type="number"
              value={rejectedWithholdingLiters}
              onChange={(e) => setRejectedWithholdingLiters(e.target.value)}
              required
            />
            <p className="text-[10.5px] text-neutral-400">
              {isAr
                ? 'الحليب المعالج بالمضادات الحيوية يُستبعد تلقائياً من خزان التسليم لحماية دعم ONIL.'
                : 'Le lait contenant des résidus médicamenteux est strictly exclu du volume éligible à la prime ONIL.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelSelect
              label={isAr ? 'الملبنة المستلمة المعتمدة *' : 'Laiterie Destinataire Agréée *'}
              value={destinationDairy}
              onChange={(val) => setDestinationDairy(val)}
              options={dairyOptions}
            />
            <LabelInput
              label={isAr ? 'رقم وصل التسليم (BL)' : 'N° Bon de Livraison Laiterie'}
              value={dairyDeliverySlipNo}
              onChange={(e) => setDairyDeliverySlipNo(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <LabelInput
              label={isAr ? 'نسبة المادة الدسمة (غ/ل)' : 'Matière Grasse (g/L)'}
              type="number"
              step="0.1"
              value={fatContentMg}
              onChange={(e) => setFatContentMg(e.target.value)}
            />
            <LabelInput
              label={isAr ? 'الكثافة (Densité)' : 'Densité'}
              type="number"
              step="0.001"
              value={density}
              onChange={(e) => setDensity(e.target.value)}
            />
          </div>

          {/* ONIL Subsidy Live Payout Calculation Box */}
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs space-y-1.5 text-emerald-900 dark:text-emerald-300">
            <div className="flex justify-between items-center">
              <span className="font-medium">Volume Conforme Éligible :</span>
              <span className="font-mono font-bold">{subsidy.conformingLiters.toLocaleString()} Litres</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Subvention de l’État ONIL (12 DA/L) :</span>
              <span className="font-mono font-bold text-sm text-[#C4785A]">
                + {formatMoney(subsidy.subsidyAmountDzd)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="ghost" size="sm" onClick={onClose} type="button">
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit" icon={<Check size={14} />}>
              {isAr ? 'تأكيد وقيد جلسة الحلب' : 'Valider la Session de Traite'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
