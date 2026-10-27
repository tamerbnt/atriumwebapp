import React, { useState } from 'react';
import { Layers, Plus, Clock, Boxes, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const ManufacturingBomView: React.FC = () => {
  const { language } = useAtriumStore();
  const { boms } = useManufacturingData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = boms.filter(
    (b) =>
      b.finishedProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bomCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalComponents = boms.reduce((acc, b) => acc + (b.components?.length || 0), 0);
  const avgCost = boms.length > 0 ? boms.reduce((acc, b) => acc + b.estimatedCostDzd, 0) / boms.length : 0;

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'جداول المكونات والنومكلاتور (BOM)' : 'Nomenclatures Produits (Bill of Materials)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {boms.length} BOM
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'تعريف المواد الأولية، تكاليف المكونات، وساعات اليد العاملة المعيارية'
                : 'Structure des produits finis, décomposition matière & temps de gamme opératoire'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => showToast(language === 'ar' ? 'إنشاء تركيبة نومكلاتور جديدة' : 'Création de nomenclature disponible', 'info')}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'تركيبة جديدة' : 'Nouvelle BOM'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'هندسة المنتجات والمكونات المعيارية' : 'Ingénierie Produits & Standard de Coût'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة الوصفات التصنيعية، المواد المستهلكة ومتوسط التكلفة للوحدة' : 'Formules de fabrication actives, matières premières mobilisées et coût moyen'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Nomenclatures Actives */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'جداول المكونات المعتمدة' : 'BOM Produits Définies'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {boms.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                100% {language === 'ar' ? 'جاهزة لإطلاق OF' : 'prêtes pour production'}
              </p>
            </div>
          </div>

          {/* Card 2: Composants référencés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي المكونات والمواد' : 'Composants Intégrés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {totalComponents}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'مواد أولية وقطع وسيطة' : 'Matières premières & sous-ensembles'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'متوسط تكلفة الإنتاج' : 'Coût Moyen Unitaire'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Standard BOM
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(avgCost, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'نومكلاتور مفلترة' : 'nomenclatures listées'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'فهرس وصفات المنتجات' : 'Catalogue des Nomenclatures'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالمنتج أو رمز BOM...' : 'Rechercher produit, code BOM...'}
            />
          </div>
        </div>

        {/* BOM Cards Container */}
        <div className="space-y-3.5">
          {filtered.map((bom) => (
            <div
              key={bom.id}
              className="p-5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#C4785A]/15 text-[#C4785A]">
                    {bom.bomCode}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {bom.finishedProductName}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-neutral-500">
                    {bom.standardLaborHours}h {language === 'ar' ? 'مدة الصنع' : 'temps gamme'}
                  </span>
                  <span className="font-bold text-[#C4785A] text-sm">
                    {formatMoney(bom.estimatedCostDzd, language)}
                  </span>
                </div>
              </div>

              {/* Components List */}
              <div className="pt-3 border-t border-[#EDF1F3] dark:border-neutral-700/60">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  {language === 'ar' ? 'قائمة المواد الأولية والمكونات' : 'Composants & Matières'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {bom.components.map((comp) => (
                    <div
                      key={comp.rawProductId}
                      className="px-3 py-2 rounded-xl bg-[#F8F9FA] dark:bg-neutral-800/80 border border-[#EDF1F3] dark:border-neutral-700 flex items-center justify-between text-xs"
                    >
                      <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                        {comp.rawProductName}
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {comp.quantity} {comp.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
