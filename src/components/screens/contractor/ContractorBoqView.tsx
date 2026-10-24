import React, { useState } from 'react';
import { ClipboardList, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
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

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const projectItems = boqItems.filter((item) => item.projectId === selectedProjectId);

  const filteredItems = projectItems.filter((item) =>
    item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPlannedValue = projectItems.reduce((acc, item) => acc + item.totalPlannedDzd, 0);
  const totalExecutedValue = projectItems.reduce((acc, item) => acc + item.totalExecutedDzd, 0);

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
      projectId: selectedProjectId,
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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'الكشف الكمي والتقديري (BOQ / BPU)' : 'Bordereau Quantitatif & Estimatif (BOQ)'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {projectItems.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'أسعار الوحدات التعاقدية، الكميات المخططة والمنجزة على الأرض'
                : 'Bordereau des Prix Unitaires (BPU), métrés prévus et exécutés'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالبند، التوصيف...' : 'Rechercher poste, désignation...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'بند جديد' : 'Nouveau Poste BOQ'}
          </AtriumButton>
        </div>
      </div>

      {/* Project Switcher Bar */}
      <div className="bg-white/60 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-medium">{isAr ? 'الورشة:' : 'Chantier:'}</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-medium"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectCode} - {p.projectName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <div>
            <span className="text-neutral-400 text-[10px] uppercase">Prévu: </span>
            <span className="font-bold text-neutral-700 dark:text-neutral-300">{formatMoney(totalPlannedValue)}</span>
          </div>
          <div>
            <span className="text-neutral-400 text-[10px] uppercase">Exécuté: </span>
            <span className="font-bold text-[#C4785A]">{formatMoney(totalExecutedValue)}</span>
          </div>
        </div>
      </div>

      {/* BOQ Items Table */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <ClipboardList size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد بنود مطابقة' : 'Aucun poste BOQ trouvé'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Désignation des Prestations</th>
                    <th className="py-3 px-4 text-center">Unité</th>
                    <th className="py-3 px-4 text-right">Qté Prévue</th>
                    <th className="py-3 px-4 text-right">Qté Réalisée</th>
                    <th className="py-3 px-4 text-right">Prix Unitaire</th>
                    <th className="py-3 px-4 text-right">Montant Réalisé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredItems.map((item) => {
                    const percent = item.plannedQty > 0 ? Math.round((item.executedQty / item.plannedQty) * 100) : 0;
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#C4785A]">
                          {item.itemCode}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-white max-w-sm">
                          {item.designation}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-neutral-500">
                          {item.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold">
                          {item.plannedQty.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                          {item.executedQty.toLocaleString()}
                          <span className="text-[10px] text-neutral-400 block font-normal">
                            ({percent}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                          {formatMoney(item.unitPriceDzd)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#C4785A]">
                          {formatMoney(item.totalExecutedDzd)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New BOQ Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-[#C4785A]" />
                <span>{isAr ? 'إضافة بند كشف كمي وتقديري' : 'Nouveau Poste au Bordereau (BOQ)'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBoqItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رقم البند *' : 'Numéro de Poste *'}
                  placeholder="Ex: 05.02"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الوحدة' : 'Unité Métrique'}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ContractorBoqItem['unit'])}
                  options={[
                    { value: 'm3', label: 'm3 (Mètre Cube)' },
                    { value: 'm2', label: 'm2 (Mètre Carré)' },
                    { value: 'ml', label: 'ml (Mètre Linéaire)' },
                    { value: 'kg', label: 'kg (Kilogramme)' },
                    { value: 'ton', label: 'ton (Tonne)' },
                    { value: 'u', label: 'u (Unité / Pièce)' },
                    { value: 'ens', label: 'ens (Ensemble / Forfait)' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'توصيف البند والأعمال *' : 'Désignation Précise des Travaux *'}
                placeholder="Ex: Enduit extérieur au mortier de ciment batard..."
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية التقديرية' : 'Quantité Prévue'}
                  type="number"
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'سعر الوحدة (دج)' : 'Prix Unitaire (DZD)'}
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'إدراج البند' : 'Enregistrer au BOQ'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
