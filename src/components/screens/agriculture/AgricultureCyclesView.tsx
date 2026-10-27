import React, { useState } from 'react';
import { Calendar, Plus, ShieldCheck, AlertTriangle, Droplets, Clock, CheckCircle2, X, Sprout } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriTreatmentLog } from '../../../types';

export const AgricultureCyclesView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { treatmentLogs, parcels, selectedParcelId, setSelectedParcelId, addTreatmentLog } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [productName, setProductName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [pest, setPest] = useState('');
  const [dosage, setDosage] = useState('2.5 kg/ha');
  const [darDays, setDarDays] = useState('7');
  const [operator, setOperator] = useState('Abdelkader (Chef Culture)');
  const [notes, setNotes] = useState('');

  const selectedParcel = parcels.find((p) => p.id === selectedParcelId) || parcels[0];
  const parcelLogs = treatmentLogs.filter((t) => t.parcelId === (selectedParcel?.id || selectedParcelId));

  const filteredLogs = parcelLogs.filter((t) =>
    t.commercialProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.targetPestDisease.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgDar = parcelLogs.length > 0
    ? Math.round(parcelLogs.reduce((acc, t) => acc + t.darDays, 0) / parcelLogs.length)
    : 7;

  const parcelOptions = parcels.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.currentCrop || 'Culture'})`,
  }));

  const handleCreateTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !pest.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم المادة والآفة المستهدفة' : 'Veuillez saisir le produit et le parasite ciblé', 'error');
      return;
    }

    const dar = parseInt(darDays, 10) || 7;
    const today = new Date();
    const harvestAllowed = new Date(today.getTime() + dar * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const newLog: AgriTreatmentLog = {
      id: `treat_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId: selectedParcel?.id || selectedParcelId,
      treatmentDate: today.toISOString().split('T')[0],
      commercialProductName: productName.trim(),
      activeIngredient: activeIngredient.trim() || 'Substance active homologuée',
      targetPestDisease: pest.trim(),
      dosagePerHa: dosage.trim(),
      darDays: dar,
      harvestAllowedDate: harvestAllowed,
      operatorName: operator.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    addTreatmentLog(newLog);
    setIsModalOpen(false);
    setProductName('');
    setPest('');
    showToast(
      isAr ? 'تم تسجيل المعالجة الفلاحية وحساب فترة الأمان (DAR)' : 'Traitement phytosanitaire enregistré avec DAR calculé',
      'success'
    );
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Calendar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'المعالجات الفلاحية وفترات الأمان (DAR)' : 'Traitements Phyto & Suivi DAR'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {parcelLogs.length} interventions
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'سجل المبيدات والمغذيات، حساب فترات الأمان قبل الجني (DAR)، وسلامة المحصول'
                : 'Traçabilité des intrants, respect des Délais Avant Récolte (DAR) et sécurité'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'معالجة جديدة' : 'Nouveau Traitement'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الصحة النباتية والأمان' : 'Protection Phyto & Délais Sanitaires'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {selectedParcel ? `${selectedParcel.name} · ${selectedParcel.currentCrop}` : 'Parcelle sélectionnée'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Interventions */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المعالجات المسجلة للقطعة' : 'Traitements Réalisés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {parcelLogs.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'مواد معتمدة ومسجلة' : 'Intrants homologués appliqués'}
              </p>
            </div>
          </div>

          {/* Card 2: DAR Moyen */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متوسط فترة الأمان (DAR)' : 'Délai Avant Récolte Moyen'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {avgDar} <span className="text-sm font-sans font-normal text-neutral-500">jours</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'حظر الجني قبل التاريخ المحدد' : 'Protection consommateur'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'المطابقة الصحية والبيئية' : 'Conformité Sanitaire'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Normes Phyto
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100% <span className="text-sm font-sans font-normal text-neutral-300">DAR Respecté</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'تتبع كامل للرش والجرعات' : 'Traçabilité complète des intrants'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سجل العمليات الوقائية والعلاجية' : 'Historique des Interventions Phytosanitaires'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <FilterSelect
                value={selectedParcel?.id || selectedParcelId}
                onChange={setSelectedParcelId}
                options={parcelOptions}
              />
            </div>
            <div className="w-52">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالمنتج، الآفة...' : 'Filtrer produit, parasite...'}
              />
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <ShieldCheck size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد معالجات مسجلة لهذه القطعة' : 'Aucun traitement enregistré pour cette parcelle'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg">
                      {log.treatmentDate}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {log.commercialProductName}
                    </h3>
                  </div>

                  <p className="text-xs text-neutral-500">
                    Matière active: <strong className="text-neutral-700 dark:text-neutral-300">{log.activeIngredient}</strong> · Cible: <strong className="text-neutral-700 dark:text-neutral-300">{log.targetPestDisease}</strong>
                  </p>

                  <div className="flex items-center gap-3 text-xs text-neutral-500 pt-1">
                    <span>Dosage: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{log.dosagePerHa}</strong></span>
                    <span>·</span>
                    <span>Opérateur: {log.operatorName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                      Délai Avant Récolte (DAR)
                    </span>
                    <span className="text-base font-bold font-mono text-amber-600">
                      {log.darDays} jours
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                      Récolte Autorisée Dès
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      {log.harvestAllowedDate}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Treatment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'تسجيل معالجة صحية جديدة' : 'Nouveau Traitement Phytosanitaire'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTreatment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الاسم التجاري للمبيد / الدواء' : 'Nom Commercial Produit'}
                  value={productName}
                  onChange={setProductName}
                  placeholder="Ex: Cuprocol 50 WG"
                  required
                />
                <LabelInput
                  label={isAr ? 'المادة الفعالة' : 'Matière Active'}
                  value={activeIngredient}
                  onChange={setActiveIngredient}
                  placeholder="Ex: Oxychlorure de Cuivre"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الآفة أو المرض المستهدف' : 'Parasite / Maladie Cible'}
                  value={pest}
                  onChange={setPest}
                  placeholder="Ex: Mildiou, Oïdium..."
                  required
                />
                <LabelInput
                  label={isAr ? 'الجرعة بالهكتار' : 'Dosage par Hectare'}
                  value={dosage}
                  onChange={setDosage}
                  placeholder="Ex: 2.5 kg/ha"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'فترة الأمان DAR (أيام)' : 'Délai Avant Récolte (DAR Jours)'}
                  type="number"
                  value={darDays}
                  onChange={setDarDays}
                  required
                />
                <LabelInput
                  label={isAr ? 'المسؤول / المشرف على الرش' : 'Opérateur / Applicateur'}
                  value={operator}
                  onChange={setOperator}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'ملاحظات إضافية وظروف الطقس' : 'Remarques (Météo, atomiseur...)'}
                value={notes}
                onChange={setNotes}
                placeholder="Ex: Pulvérisation le matin sans vent..."
              />

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'تسجيل وحساب DAR' : 'Enregistrer'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
