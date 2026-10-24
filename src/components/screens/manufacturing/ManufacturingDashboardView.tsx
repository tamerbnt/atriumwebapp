import React, { useState } from 'react';
import {
  Factory,
  Layers,
  Plus,
  Play,
  CheckCircle2,
  Boxes,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';

export const ManufacturingDashboardView: React.FC = () => {
  const { language, setScreen } = useAtriumStore();
  const { boms, orders, addOrder } = useManufacturingData();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const activeOrders = orders.filter((o) => o.status === 'InProduction').length;
  const plannedOrders = orders.filter((o) => o.status === 'Planned').length;
  const completedOrders = orders.filter((o) => o.status === 'Completed').length;
  const totalUnitsProduced = orders.reduce((acc, o) => acc + o.quantityProduced, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Factory size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المصنع وورشة الإنتاج الخفيف' : 'Manufacture & Production Industrielle'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Facility: 21
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة خطوط التصنيع، جداول المكونات (BOM)، وأوامر الإنتاج (OF)'
                : 'Planification industrielle, ordres de fabrication (OF), nomenclatures (BOM) & suivi qualité'}
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

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'أوامر قيد التصنيع' : 'OF en production'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
                {activeOrders}
              </span>
              <span className="text-xs text-[#C4785A] font-semibold">
                {language === 'ar' ? 'نشط' : 'Actifs'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'أوامر مبرمجة' : 'OF planifiés'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {plannedOrders}
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                {language === 'ar' ? 'في الانتظار' : 'En attente'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'إجمالي القطع المصنعة' : 'Pièces produites'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {totalUnitsProduced}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {language === 'ar' ? 'وحدة' : 'unités'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'قوائم المكونات (BOM)' : 'Nomenclatures actives'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 tabular-nums">
                {boms.length}
              </span>
              <span className="text-xs text-neutral-400">
                BOM
              </span>
            </div>
          </div>
        </div>

        {/* Recent OF list */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أوامر التصنيع في الورشة' : 'Ordres de Fabrication en Atelier'}
              </h2>
            </div>
            <button
              onClick={() => setScreen('scheduler')}
              className="text-xs text-[#C4785A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض كل الأوامر' : 'Tous les ordres'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {orders.map((order) => (
              <div key={order.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#C4785A]">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {order.productName}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Poste: {order.assignedStation} · Échéance: {new Date(order.targetDueDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <div className="font-mono font-bold text-neutral-900 dark:text-white">
                      {order.quantityProduced} / {order.quantityOrdered}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Progression
                    </div>
                  </div>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ManufacturingOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        boms={boms}
        onSave={addOrder}
      />
    </div>
  );
};
