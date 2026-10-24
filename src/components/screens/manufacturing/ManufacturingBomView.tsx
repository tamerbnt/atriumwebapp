import React, { useState } from 'react';
import { Layers, Plus, Clock, Boxes } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-4 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث باسم المنتج أو كود BOM...' : 'Recherche par produit, code BOM...'}
          />
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'نومكلاتور' : 'nomenclatures'}
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((bom) => (
            <div
              key={bom.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#C4785A]">
                      {bom.bomCode}
                    </span>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                      {bom.finishedProductName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                    <span>Unité: {bom.unit}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {bom.standardLaborHours}h de main d'œuvre
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-neutral-400">Coût de Revient Estimé</div>
                  <div className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                    {formatMoney(bom.estimatedCostDzd, language)}
                  </div>
                </div>
              </div>

              {/* Components table */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {language === 'ar' ? 'المواد والمكونات الداخلة في التركيب' : 'Composants & Matières Premières'}
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {bom.components.map((comp, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {comp.rawProductName}
                        </span>
                        <span className="text-neutral-400 ml-2">
                          ({comp.quantity} {comp.unit})
                        </span>
                      </div>
                      <span className="font-mono text-neutral-600 dark:text-neutral-300">
                        {formatMoney(comp.unitCostDzd, language)} / {comp.unit}
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
