import React, { useState } from 'react';
import {
  Wrench,
  Car,
  Plus,
  ClipboardList,
  Boxes,
  CreditCard,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { AutoOrderModal } from './AutoOrderModal';
import { AutoVehicleModal } from './AutoVehicleModal';

export const AutoGarageDashboardView: React.FC = () => {
  const { language, setScreen } = useAtriumStore();
  const { orders, vehicles, parts, addOrder, addVehicle } = useGarageData();

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

  const activeOrders = orders.filter((o) => o.status !== 'Delivered').length;
  const readyOrders = orders.filter((o) => o.status === 'ReadyForPickup').length;
  const lowStockParts = parts.filter((p) => p.stockQuantity <= p.minThreshold).length;
  const totalRevenue = orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Wrench size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'ورشة ميكانيك وصيانة السيارات' : 'Garage Automobile & Atelier'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Facility: 19
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'لوحة إدارة أوامر التصليح، صيانة المركبات والمخزون'
                : 'Suivi des ordres de réparation (OR), pièces de rechange & parc automobile'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="secondary"
            onClick={() => setIsVehicleModalOpen(true)}
            icon={<Car size={14} />}
          >
            {language === 'ar' ? 'مركبة جديدة' : 'Nouveau Véhicule'}
          </AtriumButton>
          <AtriumButton
            variant="primary"
            onClick={() => setIsOrderModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'أمر تصليح جديد (OR)' : 'Nouvel OR'}
          </AtriumButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'أوامر التصليح قيد الإنجاز' : 'OR en atelier'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {activeOrders}
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                {language === 'ar' ? 'قيد العمل' : 'En cours'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'سيارات جاهزة للتسليم' : 'Prêtes à livrer'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {readyOrders}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {language === 'ar' ? 'جاهزة' : 'Prêtes'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'قطع قاربت على النفاد' : 'Alerte stock pièces'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {lowStockParts}
              </span>
              <span className="text-xs text-rose-600 font-semibold">
                {language === 'ar' ? 'تنبيه' : 'Critique'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'حجم المداخيل' : 'Chiffre d\'affaires'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(totalRevenue, language)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'آخر أوامر التصليح في الورشة' : 'Ordres de Réparation Récents'}
              </h2>
            </div>
            <button
              onClick={() => setScreen('scheduler')}
              className="text-xs text-[#C4785A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض الكل' : 'Tous les ordres'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-bold flex items-center justify-center">
                    OR
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>{order.vehiclePlate}</span>
                      <span className="font-normal text-neutral-400">·</span>
                      <span className="font-medium text-neutral-600 dark:text-neutral-300">{order.vehicleModel}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Client: {order.clientName} ({order.clientPhone})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {order.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        vehicles={vehicles}
        onSave={addOrder}
      />

      <AutoVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSave={addVehicle}
      />
    </div>
  );
};
