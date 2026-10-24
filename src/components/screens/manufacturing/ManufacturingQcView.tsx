import React, { useState } from 'react';
import { ShieldCheck, Plus, CheckCircle2, AlertCircle, Percent, Printer } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
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
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">Taux de Conformité Moyen</span>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-600">
              98.4%
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">Taux de Rebut (Scrap)</span>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-600">
              1.6%
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">Contrôles Validés</span>
            <div className="mt-1 text-2xl font-bold font-mono text-neutral-900 dark:text-white">
              {orders.length} lots
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث عن أمر أو منتج...' : 'Recherche par OF, produit...'}
          />
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">N° OF</th>
                <th className="px-4 py-3">Produit Fabriqué</th>
                <th className="px-4 py-3 text-center">Conformes</th>
                <th className="px-4 py-3 text-center">Rebuts</th>
                <th className="px-4 py-3 text-center">Statut Qualité</th>
                <th className="px-4 py-3 text-right">Rapport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#C4785A]">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                    {order.productName}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600">
                    {order.quantityProduced}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-rose-600">
                    {order.quantityScrapped}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Conforme
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AtriumButton
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        showToast('Génération du certificat de contrôle qualité...', 'info');
                        window.print();
                      }}
                      icon={<Printer size={12} />}
                    >
                      {language === 'ar' ? 'شهادة المطابقة' : 'Certificat QC'}
                    </AtriumButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
