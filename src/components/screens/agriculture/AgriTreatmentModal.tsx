import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, Droplets, Check, Zap } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriTreatmentLog, AgriParcel, AgriCropCycle } from '../../../types';
import { useAtriumStore } from '../../../services/store';

interface AgriTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (treatment: AgriTreatmentLog) => void;
  logToEdit: AgriTreatmentLog | null;
  parcels: AgriParcel[];
  cropCycles?: AgriCropCycle[];
}

interface InpvPreset {
  name: string;
  activeIngredient: string;
  target: string;
  dosage: string;
  darDays: number;
}

const INPV_PRESETS: InpvPreset[] = [
  {
    name: 'Cuprocol 50 WP',
    activeIngredient: 'Oxychlorure de cuivre (50%)',
    target: 'Mildiou & Bactérioses arboricoles',
    dosage: '4.0 kg/ha',
    darDays: 7,
  },
  {
    name: 'Ridomil Gold MZ',
    activeIngredient: 'Métalaxyl-M (4%) + Mancozèbe (64%)',
    target: 'Mildiou de la pomme de terre & tomate',
    dosage: '2.5 kg/ha',
    darDays: 14,
  },
  {
    name: 'Karate Zeon 50 CS',
    activeIngredient: 'Lambda-cyhalothrine (50 g/L)',
    target: 'Pucerons, Noctuelles & Tuta absoluta',
    dosage: '0.15 L/ha',
    darDays: 7,
  },
  {
    name: 'Score 250 EC',
    activeIngredient: 'Difénoconazole (250 g/L)',
    target: 'Oïdium, Tavelure & Moniliose',
    dosage: '0.20 L/ha',
    darDays: 14,
  },
  {
    name: 'Mancozèbe 80 WP',
    activeIngredient: 'Mancozèbe pur (80%)',
    target: 'Alternariose, Rouille & Anthracnose',
    dosage: '2.0 kg/ha',
    darDays: 15,
  },
  {
    name: 'Soufre Mouillable Micronisé',
    activeIngredient: 'Soufre élémentaire (80%)',
    target: 'Oïdium des vergers & Acariens',
    dosage: '5.0 kg/ha',
    darDays: 3,
  },
  {
    name: 'Décis 25 EC',
    activeIngredient: 'Deltaméthrine (25 g/L)',
    target: 'Mouche de l’olive & Cératite méditerranéenne',
    dosage: '0.50 L/ha',
    darDays: 7,
  },
];

export const AgriTreatmentModal: React.FC<AgriTreatmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  logToEdit,
  parcels,
  cropCycles = [],
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [parcelId, setParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [cropCycleId, setCropCycleId] = useState<string>('');
  const [treatmentDate, setTreatmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [productName, setProductName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [targetPest, setTargetPest] = useState('');
  const [dosage, setDosage] = useState('2.5 kg/ha');
  const [totalQuantityUsed, setTotalQuantityUsed] = useState('20');
  const [darDays, setDarDays] = useState('7');
  const [operator, setOperator] = useState('Abdelkader (Chef Culture)');
  const [safetyGearConfirmed, setSafetyGearConfirmed] = useState(true);
  const [notes, setNotes] = useState('Pulvérisation matinale par temps calme. Vitesse tracteur 6 km/h.');

  useEffect(() => {
    if (logToEdit) {
      setParcelId(logToEdit.parcelId);
      setCropCycleId(logToEdit.cropCycleId || '');
      setTreatmentDate(logToEdit.treatmentDate);
      setProductName(logToEdit.commercialProductName);
      setActiveIngredient(logToEdit.activeIngredient);
      setTargetPest(logToEdit.targetPestDisease);
      setDosage(logToEdit.dosagePerHa);
      setTotalQuantityUsed(logToEdit.totalQuantityUsed ? String(logToEdit.totalQuantityUsed) : '20');
      setDarDays(String(logToEdit.darDays));
      setOperator(logToEdit.operatorName);
      setSafetyGearConfirmed(logToEdit.safetyGearConfirmed ?? true);
      setNotes(logToEdit.notes || '');
    } else {
      setParcelId(parcels[0]?.id || 'parc_01');
      setCropCycleId('');
      setTreatmentDate(new Date().toISOString().split('T')[0]);
      setProductName(INPV_PRESETS[0].name);
      setActiveIngredient(INPV_PRESETS[0].activeIngredient);
      setTargetPest(INPV_PRESETS[0].target);
      setDosage(INPV_PRESETS[0].dosage);
      setTotalQuantityUsed('20');
      setDarDays(String(INPV_PRESETS[0].darDays));
      setOperator('Abdelkader (Chef Culture)');
      setSafetyGearConfirmed(true);
      setNotes('Pulvérisation matinale par temps calme. Vitesse tracteur 6 km/h.');
    }
  }, [logToEdit, parcels]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: InpvPreset) => {
    setProductName(preset.name);
    setActiveIngredient(preset.activeIngredient);
    setTargetPest(preset.target);
    setDosage(preset.dosage);
    setDarDays(String(preset.darDays));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dar = parseInt(darDays, 10) || 7;
    const baseDate = new Date(treatmentDate);
    const allowedDate = new Date(baseDate.getTime() + dar * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const payload: AgriTreatmentLog = {
      id: logToEdit?.id || `treat_${Date.now()}`,
      accountId: logToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId,
      cropCycleId: cropCycleId || undefined,
      treatmentDate,
      commercialProductName: productName.trim(),
      activeIngredient: activeIngredient.trim() || 'Substance active homologuée',
      targetPestDisease: targetPest.trim(),
      dosagePerHa: dosage.trim(),
      totalQuantityUsed: parseFloat(totalQuantityUsed) || undefined,
      darDays: dar,
      harvestAllowedDate: allowedDate,
      operatorName: operator.trim(),
      safetyGearConfirmed,
      notes: notes.trim(),
      createdAt: logToEdit?.createdAt || new Date().toISOString(),
    };
    onSave(payload);
  };

  const parcelOptions = parcels.map((p) => ({
    value: p.id,
    label: `${p.code} - ${p.name} (${p.surfaceHectares} ha)`,
  }));

  const cycleOptions = [
    { value: '', label: isAr ? '-- غير مرتبط بدورة محددة --' : '-- Non rattaché à un cycle précis --' },
    ...cropCycles.map((c) => ({
      value: c.id,
      label: `${c.cropName} (${c.variety}) - Campagne ${c.campaignYear}`,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {logToEdit
                  ? (isAr ? 'تعديل المعالجة النباتية' : 'Modifier le Traitement Phytosanitaire')
                  : (isAr ? 'قيد معالجة جديدة وفترة الأمان DAR' : 'Consigner un Traitement & Délai DAR (INPV)')}
              </h2>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? 'مراقبة فترات الأمان قبل الجني لحماية المستهلك وضمان مطابقة التصدير'
                  : 'Enregistrement obligatoire au carnet sanitaire et verrouillage de récolte'}
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

        {/* Quick INPV Presets Selector Chips */}
        <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
              <Zap size={13} className="text-[#C4785A]" />
              {isAr ? 'مواد معتمدة ومطابقة لوزارة الفلاحة (INPV)' : 'Produits Homologués INPV Algérie (Pré-remplissage 1-clic)'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INPV_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition font-medium ${
                  productName === p.name
                    ? 'bg-[#C4785A] text-white border-[#C4785A]'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-[#C4785A]'
                }`}
              >
                {p.name} <span className="opacity-70 text-[9.5px]">({p.darDays}j DAR)</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelSelect
              label={isAr ? 'القطعة الفلاحية المستهدفة *' : 'Parcelle Cadastrale *'}
              value={parcelId}
              onChange={(val) => setParcelId(val)}
              options={parcelOptions}
            />

            <LabelSelect
              label={isAr ? 'دورة المحصول المرتبطة' : 'Cycle de Culture Associé'}
              value={cropCycleId}
              onChange={(val) => setCropCycleId(val)}
              options={cycleOptions}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              label={isAr ? 'اسم المنتج التجاري *' : 'Produit Commercial Homologué *'}
              placeholder="Ex: Ridomil Gold, Cuprocol"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'المادة الفعالة' : 'Substance Active'}
              placeholder="Ex: Métalaxyl-M + Mancozèbe"
              value={activeIngredient}
              onChange={(e) => setActiveIngredient(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabelInput
              label={isAr ? 'الآفة أو المرض المستهدف *' : 'Cible / Maladie *'}
              placeholder="Ex: Mildiou, Oïdium, Cératite"
              value={targetPest}
              onChange={(e) => setTargetPest(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الجرعة بالهكتار *' : 'Dose / ha *'}
              placeholder="Ex: 2.5 kg/ha"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الكمية الإجمالية المستخدمة' : 'Quantité Totale Utilisée'}
              placeholder="Ex: 20 kg"
              value={totalQuantityUsed}
              onChange={(e) => setTotalQuantityUsed(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabelInput
              label={isAr ? 'تاريخ المعالجة والرش *' : 'Date d’Application *'}
              type="date"
              value={treatmentDate}
              onChange={(e) => setTreatmentDate(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'فترة الأمان DAR (أيام) *' : 'Délai Avant Récolte DAR (Jours) *'}
              type="number"
              value={darDays}
              onChange={(e) => setDarDays(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'المطبق المسؤول' : 'Applicateur Responsable'}
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              required
            />
          </div>

          {/* Safety Warning Preview */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {isAr
                  ? `الحصاد سيكون محظوراً حتى: `
                  : `Verrouillage sanitaire de la récolte jusqu’au : `}
              </span>
              <span className="font-mono font-bold underline">
                {(() => {
                  const d = new Date(treatmentDate);
                  const n = parseInt(darDays, 10) || 0;
                  d.setDate(d.getDate() + n);
                  return d.toISOString().split('T')[0];
                })()}
              </span>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isAr
                  ? 'سيتم تعطيل إصدار وصولات الجني للقطعة حتى انقضاء المدة.'
                  : 'L’émission de bons de récolte sera physiquement bloquée sur cette parcelle durant le DAR.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="safetyGear"
              checked={safetyGearConfirmed}
              onChange={(e) => setSafetyGearConfirmed(e.target.checked)}
              className="rounded text-[#C4785A] focus:ring-[#C4785A]"
            />
            <label htmlFor="safetyGear" className="text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer">
              {isAr
                ? 'أؤكد ارتداء معدات الوقاية الفردية (EPI) ومراعاة اتجاه الرياح'
                : 'Je confirme le port des Équipements de Protection Individuelle (EPI) et le respect des normes INPV'}
            </label>
          </div>

          <LabelInput
            label={isAr ? 'ملاحظات وظروف الطقس' : 'Observations & Conditions Météo'}
            placeholder="Ex: Pulvérisation sans vent, température 19°C..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="ghost" size="sm" onClick={onClose} type="button">
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit" icon={<Check size={14} />}>
              {logToEdit
                ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                : (isAr ? 'تأكيد وقيد المعالجة' : 'Consigner le Traitement Phyto')}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
