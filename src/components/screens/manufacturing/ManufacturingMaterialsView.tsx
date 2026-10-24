import React, { useState } from 'react';
import { Boxes, Plus, AlertCircle } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

interface RawMaterial {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  minThreshold: number;
  unitCostDzd: number;
}

const INITIAL_MATERIALS: RawMaterial[] = [
  { id: 'm_01', sku: 'RAW-WD-01', name: 'Bois Chêne Brut Séché 50mm', category: 'Bois & Dérivés', stock: 12.5, unit: 'm³', minThreshold: 3, unitCostDzd: 180000 },
  { id: 'm_02', sku: 'RAW-STL-02', name: 'Piètement Acier Poudré Noir', category: 'Métallurgie', stock: 14, unit: 'Pièce', minThreshold: 6, unitCostDzd: 15000 },
  { id: 'm_03', sku: 'RAW-CHM-03', name: 'Vernis Polyuréthane Mat 5L', category: 'Chimie & Peinture', stock: 8, unit: 'Bidon', minThreshold: 5, unitCostDzd: 12000 },
  { id: 'm_04', sku: 'RAW-PLS-04', name: 'Granulés Polypropylène Vierge', category: 'Polymères', stock: 450, unit: 'kg', minThreshold: 200, unitCostDzd: 420 },
];

export const ManufacturingMaterialsView: React.FC = () => {
  const { language } = useAtriumStore();
  const [materials] = useState<RawMaterial[]>(INITIAL_MATERIALS);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Boxes size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المواد الأولية والمخرجات' : 'Matières Premières & Stocks Usine'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {materials.length} références
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة مخزون المواد الخام لخطوط الإنتاج والتنبيه عند انخفاض الكميات'
                : 'Stocks d\'approvisionnement, alertes seuil d\'alerte & valorisation matière'}
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
            placeholder={language === 'ar' ? 'بحث عن مادة أولية أو صنف...' : 'Rechercher matière première, SKU...'}
          />
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'الرمز' : 'Réf. SKU'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'المادة الأولية' : 'Désignation'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الفئة' : 'Famille'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'المخزون المتوفر' : 'Stock Actuel'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'التكلفة المعيارية' : 'Coût Unitaire'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((mat) => {
                const isLow = mat.stock <= mat.minThreshold;
                return (
                  <tr key={mat.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#C4785A]">
                      {mat.sku}
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                      {mat.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {mat.category}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs ${
                          isLow
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isLow && <AlertCircle size={11} />}
                        {mat.stock} {mat.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(mat.unitCostDzd, language)} / {mat.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
