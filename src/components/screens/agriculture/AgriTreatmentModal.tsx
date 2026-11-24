import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, Droplets, Check, Zap } from 'lucide-react';
import { Button } from '@/atrium/core';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriTreatmentLog, AgriParcel, AgriCropCycle } from '../../../types';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

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
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl" zIndexClass="z-[9990]">
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
                className="w-10 h-10 bg-amber-500/15 text-amber-600 flex items-center justify-center font-semibold shrink-0"
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {logToEdit
                    ? (isAr ? 'تعديل المعالجة النباتية' : 'Modifier le Traitement Phytosanitaire')
                    : (isAr ? 'قيد معالجة جديدة وفترة الأمان DAR' : 'Consigner un Traitement & Délai DAR (INPV)')}
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

          {/* Quick INPV Presets Selector Chips */}
          <div
            data-sq="card"
            data-sq-border="solid"
            className="mt-4 p-3 bg-neutral-50 dark:bg-[#22201E]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="t-small font-semibold text-black/70 dark:text-white flex items-center gap-2">
                <Zap size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                {isAr ? 'مواد معتمدة ومطابقة لوزارة الفلاحة (INPV)' : 'Produits Homologués INPV Algérie (Pré-remplissage 1-clic)'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INPV_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  data-sq="ctl-sm"
                  data-sq-border="solid"
                  style={productName === p.name ? ({ '--sq-stroke': '#d4522f' } as React.CSSProperties) : undefined}
                  className={`t-small px-2.5 py-1 transition font-medium cursor-pointer ${
                    productName === p.name
                      ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                      : 'bg-white dark:bg-[#2B2825] text-black dark:text-white hover:[--sq-stroke:#d4522f]'
                  }`}
                >
                  {p.name} <span className="opacity-70 t-cap">({p.darDays}j DAR)</span>
                </button>
              ))}
            </div>
          </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelSelect
              field="Parcel"
              label={isAr ? 'القطعة الفلاحية المستهدفة *' : 'Parcelle Cadastrale *'}
              value={parcelId}
              onChange={setParcelId}
              options={parcelOptions}
              width="100%"
              height={40}
              corner={12}
            />

            <LabelSelect
              field="CropCycle"
              label={isAr ? 'دورة المحصول المرتبطة' : 'Cycle de Culture Associé'}
              value={cropCycleId}
              onChange={setCropCycleId}
              options={cycleOptions}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              field="ProductName"
              label={isAr ? 'اسم المنتج التجاري *' : 'Produit Commercial Homologué *'}
              placeholder="Ex: Ridomil Gold, Cuprocol"
              value={productName}
              onChange={setProductName}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="ActiveIngredient"
              label={isAr ? 'المادة الفعالة' : 'Substance Active'}
              placeholder="Ex: Métalaxyl-M + Mancozèbe"
              value={activeIngredient}
              onChange={setActiveIngredient}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabelInput
              field="TargetPest"
              label={isAr ? 'الآفة أو المرض المستهدف *' : 'Cible / Maladie *'}
              placeholder="Ex: Mildiou, Oïdium, Cératite"
              value={targetPest}
              onChange={setTargetPest}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="Dosage"
              label={isAr ? 'الجرعة بالهكتار *' : 'Dose / ha *'}
              placeholder="Ex: 2.5 kg/ha"
              value={dosage}
              onChange={setDosage}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="TotalQuantityUsed"
              label={isAr ? 'الكمية الإجمالية المستخدمة' : 'Quantité Totale Utilisée'}
              placeholder="Ex: 20 kg"
              value={totalQuantityUsed}
              onChange={setTotalQuantityUsed}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabelInput
              field="TreatmentDate"
              label={isAr ? 'تاريخ المعالجة والرش *' : 'Date d’Application *'}
              type="date"
              value={treatmentDate}
              onChange={setTreatmentDate}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="DarDays"
              label={isAr ? 'فترة الأمان DAR (أيام) *' : 'Délai Avant Récolte DAR (Jours) *'}
              type="number"
              value={darDays}
              onChange={setDarDays}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <LabelInput
              field="Operator"
              label={isAr ? 'المطبق المسؤول' : 'Applicateur Responsable'}
              value={operator}
              onChange={setOperator}
              width="100%"
              height={40}
              corner={12}
              required
            />
          </div>

          {/* Safety Warning Preview */}
          <div
            data-sq="card"
            data-sq-border="solid"
            style={{ '--sq-stroke': 'rgba(245, 158, 11, 0.35)' } as React.CSSProperties}
            className="p-3 bg-amber-500/10 flex items-start gap-2 t-cap text-amber-800 dark:text-amber-300"
          >
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {isAr
                  ? `الحصاد سيكون محظوراً حتى: `
                  : `Verrouillage sanitaire de la récolte jusqu’au : `}
              </span>
              <span className="tabular-nums font-semibold underline">
                {(() => {
                  const d = new Date(treatmentDate);
                  const n = parseInt(darDays, 10) || 0;
                  d.setDate(d.getDate() + n);
                  return d.toISOString().split('T')[0];
                })()}
              </span>
              <p className="t-cap opacity-80 mt-0.5">
                {isAr
                  ? 'سيتم تعطيل إصدار وصولات الجني للقطعة حتى انقضاء المدة.'
                  : 'L’émission de bons de récolte sera physiquement bloquée sur cette parcelle durant le DAR.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-1">
            <span className="t-cap text-black/70 dark:text-white">
              {isAr
                ? 'أؤكد ارتداء معدات الوقاية الفردية (EPI) ومراعاة اتجاه الرياح'
                : 'Je confirme le port des Équipements de Protection Individuelle (EPI) et le respect des normes INPV'}
            </span>
            <LiveSwitch
              checked={safetyGearConfirmed}
              onCheckedChange={setSafetyGearConfirmed}
              aria-label={isAr ? 'معدات الوقاية' : 'Confirmation EPI'}
            />
          </div>

          <LabelInput
            field="TreatmentNotes"
            label={isAr ? 'ملاحظات وظروف الطقس' : 'Observations & Conditions Météo'}
            placeholder="Ex: Pulvérisation sans vent, température 19°C..."
            value={notes}
            onChange={setNotes}
            width="100%"
            height={40}
            corner={12}
          />

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--atr-divider)]">
            <Button tone="soft" size={40} onClick={onClose} type="button">
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button tone="accent" size={40} type="submit" leading={<Check size={14} />}>
              {logToEdit
                ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                : (isAr ? 'تأكيد وقيد المعالجة' : 'Consigner le Traitement Phyto')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
