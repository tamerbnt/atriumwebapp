import React, { useState } from 'react';
import {
  Factory,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';

export const ManufacturingOrdersView: React.FC = () => {
  const { language } = useAtriumStore();
  const { orders, boms, addOrder, updateOrderStatus } = useManufacturingData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.assignedStation?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all') return o.status === statusFilter;
    return true;
  });

  const activeCount = orders.filter((o) => o.status === 'InProduction').length;
  const completedCount = orders.filter((o) => o.status === 'Completed').length;
  const totalProducedUnits = orders.reduce((acc, o) => acc + (o.quantityProduced || 0), 0);

  const filterOptions = [
    { value: 'all', label: language === 'ar' ? 'جميع الحالات' : 'Tous les états' },
    { value: 'Planned', label: 'Planifié' },
    { value: 'InProduction', label: 'En production' },
    { value: 'Completed', label: 'Terminé' },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Factory size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أوامر الإنتاج والتصنيع (OF)' : 'Ordres de Fabrication (OF)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {orders.length} OF
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إطلاق دفعات الإنتاج، متابعة المحطات والكميات المنجزة في المصنع'
                : 'Ordonnancement des lots, suivi d\'avancement & consommation matières'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsOrderModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'أمر تصنيع جديد' : 'Nouvel OF'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'حالة دفعات التصنيع ومعدلات التقدم' : 'Suivi des Lots & Avancement Atelier'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة وتيرة العمل على خطوط الإنتاج والكميات المنتجة' : 'Répartition des ordres de fabrication par phase opérationnelle'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: OF Actifs */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'أوامر جارية على الخطوط' : 'OF en Cours de Tirage'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCount}
              </div>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                {language === 'ar' ? 'محطات الإنتاج في حالة عمل' : 'Postes occupés'}
              </p>
            </div>
          </div>

          {/* Card 2: OF Clôturés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'دفعات مكتملة ومسلمة' : 'Lots Clôturés & Stockés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {completedCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {totalProducedUnits.toLocaleString()} {language === 'ar' ? 'قطعة مطابقة' : 'unités finies'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'نسبة إنجاز خطة الإنتاج' : 'Taux d\'Accomplissement'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                OF Master
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 100}%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filtered.length} {language === 'ar' ? 'أمر مصفى' : 'OF affichés'}
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
            <Factory size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل أوامر التصنيع' : 'Ordres de Fabrication'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث برقم OF، المنتج، المحطة...' : 'Rechercher N° OF, article, poste...'}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={filterOptions}
            />
          </div>
        </div>

        {/* Orders Table Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-[#E9EEF0] dark:border-neutral-700/60">
                <tr>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم OF' : 'N° OF'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المنتج النهائي' : 'Produit'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'رقم الدفعة' : 'N° Lot'}</th>
                  <th className="px-4 py-3.5">{language === 'ar' ? 'المحطة / الخط' : 'Poste / Ligne'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الكمية المستهدفة' : 'Cible'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الكمية المنتجة' : 'Produit'}</th>
                  <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Statut'}</th>
                  <th className="px-4 py-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
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
                    <td className="px-4 py-3.5 font-mono text-neutral-500">
                      {order.batchLotNumber || 'LOT-STD'}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700 dark:text-neutral-300">
                      {order.assignedStation || 'Standard'}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-neutral-900 dark:text-white">
                      {order.targetQuantity}
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {order.quantityProduced}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : order.status === 'InProduction'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right rtl:text-left">
                      {order.status === 'Planned' && (
                        <AtriumButton
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            updateOrderStatus(order.id, 'InProduction');
                            showToast('OF lancé sur la ligne', 'info');
                          }}
                          icon={<Play size={12} />}
                        >
                          {language === 'ar' ? 'بدء' : 'Lancer'}
                        </AtriumButton>
                      )}
                      {order.status === 'InProduction' && (
                        <AtriumButton
                          size="xs"
                          variant="primary"
                          onClick={() => {
                            updateOrderStatus(order.id, 'Completed');
                            showToast('OF clôturé avec succès', 'success');
                          }}
                          icon={<CheckCircle2 size={12} />}
                        >
                          {language === 'ar' ? 'إنهاء' : 'Clôturer'}
                        </AtriumButton>
                      )}
                      {order.status === 'Completed' && (
                        <span className="text-[11px] text-emerald-600 flex items-center justify-end rtl:justify-start gap-1 font-semibold">
                          <CheckCircle2 size={13} />
                          {language === 'ar' ? 'مكتمل' : 'Fini'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ManufacturingOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSave={addOrder}
        boms={boms}
      />
    </div>
  );
};
