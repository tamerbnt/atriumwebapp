import React, { useState } from 'react';
import { Boxes, Plus, AlertCircle, Search } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const AutoGaragePartsView: React.FC = () => {
  const { language } = useAtriumStore();
  const { parts } = useGarageData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = parts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.locationBin.toLowerCase().includes(searchQuery.toLowerCase())
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
                {language === 'ar' ? 'مخزن قطع الغيار والمستهلكات' : 'Magasin Pièces de Rechange'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {parts.length} références
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة مخزون الورشة، حدود الطلب الحرج، ومواقع التخزين'
                : 'Inventaire atelier, seuils de réapprovisionnement & emplacements de stockage'}
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
            placeholder={language === 'ar' ? 'بحث باسم القطعة، الرمز أو الرف...' : 'Recherche par nom, référence SKU, rayon...'}
          />
          <div className="text-xs text-neutral-500">
            {filtered.length} {language === 'ar' ? 'قطع' : 'articles trouvés'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'الرمز' : 'Réf. SKU'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'القطعة' : 'Désignation'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الصنف' : 'Catégorie'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'الموقع' : 'Emplacement'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'المخزون' : 'Stock'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'سعر الشراء' : 'Prix d\'achat'}</th>
                <th className="px-4 py-3 text-right">{language === 'ar' ? 'سعر البيع' : 'Prix atelier'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((part) => {
                const isLow = part.stockQuantity <= part.minThreshold;
                return (
                  <tr key={part.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#C4785A]">
                      {part.sku}
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                      {part.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {part.category}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-500">
                      {part.locationBin}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                          isLow
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isLow && <AlertCircle size={11} />}
                        {part.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-500">
                      {formatMoney(part.buyingPriceDzd, language)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(part.sellingPriceDzd, language)}
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
