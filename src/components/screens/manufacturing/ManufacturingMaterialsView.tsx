import React, { useState } from 'react';
import { Boxes, Plus, AlertCircle, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
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

  const lowStockCount = materials.filter((m) => m.stock <= m.minThreshold).length;
  const totalStockValuation = materials.reduce((acc, m) => acc + m.stock * m.unitCostDzd, 0);

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

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => showToast(language === 'ar' ? 'نموذج إضافة مادة أولية' : 'Nouvelle matière première ajoutée', 'info')}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'مادة جديدة' : 'Nouvelle Matière'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مستويات مخزون المواد الأولية' : 'Niveaux de Stocks Matières & Disponibilité'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة المواد المتاحة لخطوط التجميع، التنبيهات والتقييم الإجمالي' : 'Matières pour ordres de fabrication, alertes seuil critique et immobilisation'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Références Totales */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'أصناف المواد الأولية' : 'Références Enregistrées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {materials.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {language === 'ar' ? 'موردون معتمدون' : 'Fournisseurs qualifiés'}
              </p>
            </div>
          </div>

          {/* Card 2: Seuils d'alerte */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'مواد تحت حد الأمان' : 'Alertes Seuil Critique'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {lowStockCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {lowStockCount > 0 ? (language === 'ar' ? 'طلب شراء عاجل مطلوب' : 'Réapprovisionnement nécessaire') : 'Stock sécurisé'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'قيمة مخزون المواد الخام' : 'Valorisation Stock Matières'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'أصول أولية' : 'Matières Brutes'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalStockValuation, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'صنف معروض' : 'articles listés'}
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
              {language === 'ar' ? 'جدول المواد الأولية' : 'Inventaire Matières Premières'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث باسم المادة، الرمز، الفئة...' : 'Recherche matière, SKU, famille...'}
            />
          </div>
        </div>

        {/* Materials Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الرمز' : 'SKU'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المادة الأولية' : 'Désignation'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'الفئة' : 'Famille'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'المخزون' : 'Stock'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'تكلفة الوحدة' : 'Coût Unitaire'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'القيمة الإجمالية' : 'Valeur Totale'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((mat) => {
                  const isLow = mat.stock <= mat.minThreshold;
                  return (
                    <tr key={mat.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-[#C4785A]">
                        {mat.sku}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                        {mat.name}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                        {mat.category}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            isLow
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black'
                              : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {mat.stock} {mat.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono text-neutral-700 dark:text-neutral-300">
                        {formatMoney(mat.unitCostDzd, language)}
                      </td>
                      <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(mat.stock * mat.unitCostDzd, language)}
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
