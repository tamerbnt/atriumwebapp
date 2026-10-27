import React, { useState } from 'react';
import { Boxes, Plus, AlertCircle, Search, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
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

  const lowStockCount = parts.filter((p) => p.stockQuantity <= p.minThreshold).length;
  const totalStockUnits = parts.reduce((acc, p) => acc + p.stockQuantity, 0);
  const totalValuation = parts.reduce((acc, p) => acc + p.stockQuantity * p.sellingPriceDzd, 0);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Boxes size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => showToast(language === 'ar' ? 'إضافة صنف قريباً في التحديث' : 'Formulaire ajout pièce disponible', 'info')}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'صنف جديد' : 'Nouvelle Référence'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات المستودع والقطع الحرجة' : 'Niveaux de Stock & Approvisionnement'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة الأصناف المتوفرة، القطع القريبة من النفاد والتقييم المالي' : 'Références gérées, articles sous le seuil d\'alerte et valeur globale'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Références */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'إجمالي القطع المتوفرة' : 'Unités en Rayon'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {totalStockUnits}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {parts.length} {language === 'ar' ? 'صنف مفهرس' : 'références cataloguées'}
              </p>
            </div>
          </div>

          {/* Card 2: Low Stock Alerts */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'قطع تحت حد الأمان' : 'Alertes Réapprovisionnement'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {lowStockCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {lowStockCount > 0 ? (language === 'ar' ? 'تتطلب طلبية مورد' : 'Commande fournisseur requise') : 'Aucune rupture'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'تقييم مخزون الورشة' : 'Valorisation Stock Pièces'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'قيمة الأصول' : 'Actif Atelier'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalValuation, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'قطعة مفلترة' : 'articles trouvés'}
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
            <Boxes size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'جدول المخزون والمستهلكات' : 'Inventaire Magasin'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم، الرمز، الرف...' : 'Recherche par nom, SKU, rayon...'}
            />
          </div>
        </div>

        {/* Parts Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رمز SKU' : 'SKU'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'اسم القطعة' : 'Désignation'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الفئة' : 'Catégorie'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الرف / الموقع' : 'Casier / Rayon'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الكمية' : 'Quantité'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'سعر الوحدة' : 'Prix Unitaire'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((part) => {
                  const isLow = part.stockQuantity <= part.minThreshold;
                  return (
                    <tr key={part.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-[#C4785A]">
                        {part.sku}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {part.name}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                        {part.category}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-neutral-500">
                        {part.locationBin}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            isLow
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black'
                              : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {part.stockQuantity}
                        </span>
                        {isLow && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                            min: {part.minThreshold}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
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
    </div>
  );
};
