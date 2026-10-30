import React, { useState, useEffect } from 'react';
import { X, Sprout, Calendar, Layers, ShieldCheck, Check } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriCropCycle, AgriParcel, AgriCyclePhase } from '../../../types';
import { useAtriumStore } from '../../../services/store';

interface AgriCropCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cycle: AgriCropCycle) => void;
  cycleToEdit: AgriCropCycle | null;
  parcels: AgriParcel[];
}

export const AgriCropCycleModal: React.FC<AgriCropCycleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cycleToEdit,
  parcels,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [parcelId, setParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [cropName, setCropName] = useState('Tomates Maraîchères');
  const [variety, setVariety] = useState('Marmande F1');
  const [campaignYear, setCampaignYear] = useState('2026');
  const [surfaceAllocatedHa, setSurfaceAllocatedHa] = useState('3.5');
  const [seedLotNumber, setSeedLotNumber] = useState('INPV-SEM-2026-081');
  const [seedQuantityKg, setSeedQuantityKg] = useState('40');
  const [sowingDate, setSowingDate] = useState('2026-02-10');
  const [projectedHarvestDate, setProjectedHarvestDate] = useState('2026-06-15');
  const [projectedYieldQtx, setProjectedYieldQtx] = useState('1400');
  const [actualYieldQtx, setActualYieldQtx] = useState('');
  const [currentPhase, setCurrentPhase] = useState<AgriCyclePhase>('vegetative');
  const [inputCost, setInputCost] = useState('890000');
  const [laborCost, setLaborCost] = useState('420000');
  const [machineryCost, setMachineryCost] = useState('180000');

  useEffect(() => {
    if (cycleToEdit) {
      setParcelId(cycleToEdit.parcelId);
      setCropName(cycleToEdit.cropName);
      setVariety(cycleToEdit.variety);
      setCampaignYear(String(cycleToEdit.campaignYear));
      setSurfaceAllocatedHa(String(cycleToEdit.surfaceAllocatedHa));
      setSeedLotNumber(cycleToEdit.seedLotNumber || '');
      setSeedQuantityKg(cycleToEdit.seedQuantityKg ? String(cycleToEdit.seedQuantityKg) : '');
      setSowingDate(cycleToEdit.sowingDate);
      setProjectedHarvestDate(cycleToEdit.projectedHarvestDate);
      setProjectedYieldQtx(String(cycleToEdit.projectedYieldQtx));
      setActualYieldQtx(cycleToEdit.actualYieldQtx ? String(cycleToEdit.actualYieldQtx) : '');
      setCurrentPhase(cycleToEdit.currentPhase);
      setInputCost(String(cycleToEdit.totalInputCostDzd || 0));
      setLaborCost(String(cycleToEdit.totalLaborCostDzd || 0));
      setMachineryCost(String(cycleToEdit.totalMachineryCostDzd || 0));
    } else {
      setParcelId(parcels[0]?.id || 'parc_01');
      setCropName('Tomates Maraîchères');
      setVariety('Marmande F1');
      setCampaignYear('2026');
      setSurfaceAllocatedHa('3.5');
      setSeedLotNumber('INPV-SEM-2026-081');
      setSeedQuantityKg('40');
      setSowingDate('2026-02-10');
      setProjectedHarvestDate('2026-06-15');
      setProjectedYieldQtx('1400');
      setActualYieldQtx('');
      setCurrentPhase('vegetative');
      setInputCost('890000');
      setLaborCost('420000');
      setMachineryCost('180000');
    }
  }, [cycleToEdit, parcels]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AgriCropCycle = {
      id: cycleToEdit?.id || `cycle_${Date.now()}`,
      accountId: cycleToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId,
      cropName: cropName.trim(),
      variety: variety.trim(),
      campaignYear: parseInt(campaignYear, 10) || new Date().getFullYear(),
      surfaceAllocatedHa: parseFloat(surfaceAllocatedHa) || 1.0,
      seedLotNumber: seedLotNumber.trim() || undefined,
      seedQuantityKg: seedQuantityKg ? parseFloat(seedQuantityKg) : undefined,
      sowingDate,
      projectedHarvestDate,
      projectedYieldQtx: parseFloat(projectedYieldQtx) || 100,
      actualYieldQtx: actualYieldQtx ? parseFloat(actualYieldQtx) : undefined,
      currentPhase,
      activeDarLockoutUntil: cycleToEdit?.activeDarLockoutUntil,
      activePestWarning: cycleToEdit?.activePestWarning,
      totalInputCostDzd: parseFloat(inputCost) || 0,
      totalLaborCostDzd: parseFloat(laborCost) || 0,
      totalMachineryCostDzd: parseFloat(machineryCost) || 0,
      createdAt: cycleToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(payload);
  };

  const parcelOptions = parcels.map((p) => ({
    value: p.id,
    label: `${p.code} - ${p.name} (${p.surfaceHectares} ha)`,
  }));

  const phaseOptions: { value: AgriCyclePhase; label: string }[] = [
    { value: 'planned', label: isAr ? 'مخطط له (Planifié)' : 'Planifié (Budget)' },
    { value: 'sowing', label: isAr ? 'البذر والشتل (Semis)' : 'Semis / Plantation' },
    { value: 'vegetative', label: isAr ? 'نمو وعناية (Croissance)' : 'Croissance & Végétation' },
    { value: 'treatment_locked', label: isAr ? 'معالجة مغلقة (DAR Actif)' : 'Traitement Phyto (Verrouillé DAR)' },
    { value: 'ready_harvest', label: isAr ? 'جاهز للحصاد (Prêt Récolte)' : 'Prêt pour Récolte' },
    { value: 'closed', label: isAr ? 'مكتمل ومغلق (Clôturé)' : 'Clôturé (Bilan Final)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Sprout size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {cycleToEdit
                  ? (isAr ? 'تعديل دورة المحصول الفلاحي' : 'Modifier le Cycle de Culture')
                  : (isAr ? 'فتح دورة محصول وموسم فلاحي جديد' : 'Nouveau Cycle de Culture & Assolement')}
              </h2>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? 'متابعة مراحل الإنتاج، البذور المعتمدة وتوقعات المحصول بالقنطار'
                  : 'Suivi de la campagne agricole, assolements, intrants et rendements prévus'}
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
            <LabelSelect
              label={isAr ? 'القطعة الفلاحية المخصصة *' : 'Parcelle Cadastrale *'}
              value={parcelId}
              onChange={(val) => setParcelId(val)}
              options={parcelOptions}
            />

            <LabelSelect
              label={isAr ? 'مرحلة الدورة الحالية *' : 'Phase Actuelle du Cycle *'}
              value={currentPhase}
              onChange={(val) => setCurrentPhase(val as AgriCyclePhase)}
              options={phaseOptions}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              label={isAr ? 'المحصول الفلاحي *' : 'Désignation de la Culture *'}
              placeholder="Ex: Tomates Maraîchères, Blé Dur, Pommes de Terre"
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الصنف / السلالة *' : 'Variété / Cultivar *'}
              placeholder="Ex: Marmande F1, Spunta, Simeto"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabelInput
              label={isAr ? 'السنة / الحملة' : 'Campagne Agricole'}
              type="number"
              value={campaignYear}
              onChange={(e) => setCampaignYear(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'المساحة المخصصة (هكتار) *' : 'Surface Allouée (ha) *'}
              type="number"
              step="0.1"
              value={surfaceAllocatedHa}
              onChange={(e) => setSurfaceAllocatedHa(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'رقم حصة البذور' : 'N° Lot Semence Certifiée'}
              placeholder="Ex: CCLS-2026-88"
              value={seedLotNumber}
              onChange={(e) => setSeedLotNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <LabelInput
              label={isAr ? 'كمية البذور (كغ)' : 'Semence Utilisée (Kg)'}
              type="number"
              value={seedQuantityKg}
              onChange={(e) => setSeedQuantityKg(e.target.value)}
            />
            <LabelInput
              label={isAr ? 'تاريخ البذر / الشتل *' : 'Date de Semis / Plantation *'}
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'تاريخ الجني المتوقع *' : 'Date Récolte Prévue *'}
              type="date"
              value={projectedHarvestDate}
              onChange={(e) => setProjectedHarvestDate(e.target.value)}
              required
            />
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {isAr ? 'أهداف الإنتاج والتكاليف التقديرية' : 'Objectifs de Rendement & Budget'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                label={isAr ? 'المحصول المتوقع (قنطار) *' : 'Rendement Prévu (Quintaux) *'}
                type="number"
                value={projectedYieldQtx}
                onChange={(e) => setProjectedYieldQtx(e.target.value)}
                required
              />
              <LabelInput
                label={isAr ? 'المحصول المحقق فعلياً (قنطار)' : 'Rendement Réalisé (Quintaux)'}
                type="number"
                placeholder="Ex: 1150"
                value={actualYieldQtx}
                onChange={(e) => setActualYieldQtx(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <LabelInput
                label={isAr ? 'تكلفة الأسمدة والبذور (دج)' : 'Intrants & Semences (DZD)'}
                type="number"
                value={inputCost}
                onChange={(e) => setInputCost(e.target.value)}
              />
              <LabelInput
                label={isAr ? 'أجور العمال والتجميع (دج)' : 'Main d’Œuvre Tâcherons (DZD)'}
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
              />
              <LabelInput
                label={isAr ? 'الوقود والعتاد (دج)' : 'Carburant & Matériel (DZD)'}
                type="number"
                value={machineryCost}
                onChange={(e) => setMachineryCost(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="ghost" size="sm" onClick={onClose} type="button">
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit" icon={<Check size={14} />}>
              {cycleToEdit
                ? (isAr ? 'حفظ التعديلات' : 'Enregistrer Modifications')
                : (isAr ? 'تأكيد فتح الدورة' : 'Valider le Cycle de Culture')}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
