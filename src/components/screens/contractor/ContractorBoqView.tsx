import React, { useState } from 'react';
import { ClipboardList, Plus, FileText, CheckCircle2, Building, Layers, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorBoqItem } from '../../../types';

export const ContractorBoqView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { boqItems, projects, selectedProjectId, setSelectedProjectId, addBoqItem } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [itemCode, setItemCode] = useState('05.01');
  const [designation, setDesignation] = useState('');
  const [unit, setUnit] = useState<ContractorBoqItem['unit']>('m2');
  const [plannedQty, setPlannedQty] = useState('100');
  const [unitPrice, setUnitPrice] = useState('3500');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectItems = boqItems.filter((item) => item.projectId === (selectedProject?.id || selectedProjectId));

  const filteredItems = projectItems.filter((item) =>
    item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPlannedValue = projectItems.reduce((acc, item) => acc + item.totalPlannedDzd, 0);
  const totalExecutedValue = projectItems.reduce((acc, item) => acc + item.totalExecutedDzd, 0);
  const executionRatio = totalPlannedValue > 0 ? Math.round((totalExecutedValue / totalPlannedValue) * 100) : 0;

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.projectCode} - ${p.projectName.substring(0, 24)}...`,
  }));

  const handleCreateBoqItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim()) {
      showToast(isAr ? 'يرجى إدخال توصيف البند' : 'Veuillez saisir la désignation du poste', 'error');
      return;
    }

    const qty = parseFloat(plannedQty) || 0;
    const price = parseFloat(unitPrice) || 0;

    const newItem: ContractorBoqItem = {
      id: `boq_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: selectedProject?.id || selectedProjectId,
      itemCode: itemCode.trim(),
      designation: designation.trim(),
      unit,
      plannedQty: qty,
      executedQty: 0,
      unitPriceDzd: price,
      totalPlannedDzd: qty * price,
      totalExecutedDzd: 0,
      createdAt: new Date().toISOString(),
    };

    addBoqItem(newItem);
    setIsModalOpen(false);
    setDesignation('');
    showToast(
      isAr ? 'تمت إضافة البند إلى الكشف التقديري (BOQ)' : 'Poste ajouté au bordereau BOQ',
      'success'
    );
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الكشف الكمي والتقديري (BOQ / BPU)' : 'Bordereau Quantitatif & Estimatif (BOQ)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {projectItems.length} postes
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'أسعار الوحدات التعاقدية، الكميات المخططة والمنجزة على الأرض'
                : 'Bordereau des Prix Unitaires (BPU), métrés prévus et exécutés par poste'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'إضافة بند BPU' : 'Ajouter un Poste'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الكشف الكمي للورشة' : 'Métrés & Chiffrage du Chantier Sélectionné'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {selectedProject ? `${selectedProject.projectCode} · ${selectedProject.projectName}` : 'Chantier actif'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Postes chiffrés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'عدد البنود التعاقدية' : 'Postes au Bordereau'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {projectItems.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'مدرجة في كشف BPU' : 'Métrés contractuels validés'}
              </p>
            </div>
          </div>

          {/* Card 2: Montant Prévu */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الميزانية التقديرية (BOQ)' : 'Total Prévu au Devis'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatMoney(totalPlannedValue)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'حسب الأسعار الأحادية' : 'Cumul prévisionnel marché'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي المنفذ الفعلي' : 'Montant Exécuté Validé'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {executionRatio}% Avancement
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalExecutedValue)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'مطابق لتقارير الكشف الميداني' : 'Métrés contradictoires sur site'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'جدول بنود الكشف والأسعار الأحادية (BPU)' : 'Détail des Postes & Prix Unitaires'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredItems.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-56">
              <FilterSelect
                value={selectedProject?.id || selectedProjectId}
                onChange={setSelectedProjectId}
                options={projectOptions}
              />
            </div>
            <div className="w-52">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isAr ? 'بحث بالرمز، البند...' : 'Filtrer code, désignation...'}
              />
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <ClipboardList size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد بنود مطابقة لهذا المشروع' : 'Aucun poste correspondant pour ce chantier'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[18px] border border-[#E9EEF0] dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 border-b border-[#E9EEF0] dark:border-neutral-800 text-neutral-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Désignation des Travaux</th>
                  <th className="py-3 px-3 text-center">Unité</th>
                  <th className="py-3 px-3 text-right">Qté Prévue</th>
                  <th className="py-3 px-3 text-right">Qté Exécutée</th>
                  <th className="py-3 px-3 text-right">P.U (DZD)</th>
                  <th className="py-3 px-4 text-right">Total Exécuté</th>
                  <th className="py-3 px-4 text-center">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-800">
                {filteredItems.map((item) => {
                  const pct = item.plannedQty > 0 ? Math.round((item.executedQty / item.plannedQty) * 100) : 0;
                  return (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#C4785A]">
                        {item.itemCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-900 dark:text-white max-w-sm truncate">
                        {item.designation}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-neutral-500 uppercase">
                        {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                        {item.plannedQty.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        {item.executedQty.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                        {item.unitPriceDzd.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(item.totalExecutedDzd)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            pct >= 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : pct > 0
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add BOQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ClipboardList size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'إضافة بند إلى الكشف التقديري' : 'Nouveau Poste BPU / Métré'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBoqItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رمز البند (Code Poste)' : 'Code Poste (ex: 04.02)'}
                  value={itemCode}
                  onChange={setItemCode}
                  placeholder="05.01"
                  required
                />
                <LabelSelect
                  label={isAr ? 'الوحدة' : 'Unité de Mesure'}
                  value={unit}
                  onChange={(v) => setUnit(v as ContractorBoqItem['unit'])}
                  options={[
                    { value: 'm2', label: 'm² (Mètre carré)' },
                    { value: 'm3', label: 'm³ (Mètre cube)' },
                    { value: 'ml', label: 'ml (Mètre linéaire)' },
                    { value: 'kg', label: 'kg (Kilogramme / Acier)' },
                    { value: 'ton', label: 'Tonne' },
                    { value: 'u', label: 'U (Unité)' },
                    { value: 'forfait', label: 'Fft (Forfait)' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'توصيف الأشغال' : 'Désignation détaillée des travaux'}
                value={designation}
                onChange={setDesignation}
                placeholder="Ex: Fourniture et pose de menuiserie aluminium double vitrage"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية التقديرية' : 'Quantité Prévue'}
                  type="number"
                  value={plannedQty}
                  onChange={setPlannedQty}
                  required
                />
                <LabelInput
                  label={isAr ? 'السعر الأحادي (DZD)' : 'Prix Unitaire H.T (DZD)'}
                  type="number"
                  value={unitPrice}
                  onChange={setUnitPrice}
                  required
                />
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl flex items-center justify-between text-xs">
                <span className="text-neutral-500">Total H.T Estimé:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  {formatMoney((parseFloat(plannedQty) || 0) * (parseFloat(unitPrice) || 0))}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'تسجيل البند' : 'Enregistrer le Poste'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
