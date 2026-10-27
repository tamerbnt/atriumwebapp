import React, { useState } from 'react';
import { ShieldCheck, Plus, CheckCircle2, AlertCircle, Percent, Printer, Award } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const ManufacturingQcView: React.FC = () => {
  const { language } = useAtriumStore();
  const { orders } = useManufacturingData();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = orders.filter(
    (o) =>
      o.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'مراقبة الجودة والتكاليف الصناعية' : 'Contrôle Qualité & Coûts de Revient'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Norme ISO 9001
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'فحص المطابقة، رصد نسبة التالف (Scrap Rate)، وإصدار شهادات المطابقة'
                : 'Conformité dimensionnelle, taux de rebut atelier & validation fin de chaîne'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="outline"
            onClick={() => {
              showToast(language === 'ar' ? 'طباعة تقرير مراقبة الجودة' : 'Impression du rapport qualité', 'info');
              window.print();
            }}
            icon={<Printer size={14} />}
          >
            {language === 'ar' ? 'تقرير الجودة' : 'Rapport Qualité'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات المطابقة ونسب الفاقد' : 'Indicateurs de Conformité & Maîtrise des Rebuts'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة الجودة عند نهاية الخط، التالف المعياري والامتثال لدفتر الشروط' : 'Contrôles dimensionnels libératoires et pourcentage de scrap maîtrisé'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Taux de Conformité */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'معدل المطابقة للمواصفات' : 'Taux de Conformité Moyen'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                98.4%
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'مطابق لشهادة الجودة ISO 9001' : 'Conforme aux tolérances ISO'}
              </p>
            </div>
          </div>

          {/* Card 2: Taux de Rebut (Scrap) */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'نسبة الفاقد / التالف (Scrap)' : 'Taux de Rebut (Scrap)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                1.6%
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {language === 'ar' ? 'ضمن الحدود الآمنة المقبولة' : 'Inférieur au seuil max (2%)'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'شهادات الإفراج عن الدفعات' : 'Libération des Lots'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Contrôle 100%
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                100%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'دفعة مفحوصة ومطابقة' : 'lots inspectés'}
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
            <Award size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل الفحص والاختبارات' : 'Registre des Contrôles Libératoires'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالمنتج أو رقم الدفعة...' : 'Recherche produit, lot...'}
            />
          </div>
        </div>

        {/* QC Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم OF' : 'N° OF'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المنتج' : 'Article Fabriqué'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الكمية المنتجة' : 'Quantité Produite'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'نسبة المطابقة' : 'Conformité'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'قرار الجودة' : 'Décision CQ'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'شهادة المطابقة' : 'Certificat'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#C4785A]">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-neutral-900 dark:text-white">
                      {order.productName}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {order.quantityProduced} {language === 'ar' ? 'وحدة' : 'pcs'}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      98.8%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {language === 'ar' ? 'مقبول ومعتمد' : 'Libéré Conforme'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left">
                      <AtriumButton
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          showToast(
                            language === 'ar'
                              ? `جاري طباعة شهادة المطابقة للدفعة ${order.orderNumber}...`
                              : `Certificat de conformité émis pour ${order.orderNumber}`,
                            'success'
                          );
                          window.print();
                        }}
                        icon={<Printer size={13} />}
                      >
                        {language === 'ar' ? 'شهادة' : 'Certificat'}
                      </AtriumButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
