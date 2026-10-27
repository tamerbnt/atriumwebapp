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
  AlertTriangle,
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
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Wrench size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات نشاط الورشة والرافعات' : 'Activité Atelier & Ponts Élévateurs'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة تدفق المركبات وسرعة تسليم أوامر الصيانة' : 'Flux de passage atelier, rotation des postes et alertes pièces'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Active ORs */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'أوامر التصليح قيد الإنجاز' : 'Ordres de Réparation Actifs'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeOrders}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                {orders.length} {language === 'ar' ? 'إجمالي الأوامر' : 'OR cumulés'}
              </p>
            </div>
          </div>

          {/* Card 2: Ready for Pickup & Stock Alerts */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'مركبات جاهزة للتسليم' : 'Véhicules Prêts à Livrer'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {readyOrders}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {lowStockParts > 0 ? `${lowStockParts} pièces en alerte stock` : 'Stock pièces optimal'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'رقم أعمال الورشة' : 'Chiffre d\'Affaires Atelier'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {language === 'ar' ? 'فوترة الصيانة' : 'Facturation OR'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalRevenue, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {vehicles.length} {language === 'ar' ? 'مركبة مسجلة بالحظيرة' : 'véhicules gérés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'المركبات الجارية في الورشة' : 'Véhicules Présents en Atelier'}
            </h2>
          </div>
          <AtriumButton
            variant="ghost"
            size="xs"
            onClick={() => setScreen('registrations')}
            icon={<ChevronRight size={14} />}
          >
            {language === 'ar' ? 'عرض الكل' : 'Voir tout'}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {orders.slice(0, 6).map((order) => (
            <div
              key={order.id}
              className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 hover:border-[#C4785A]/40 transition-all shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#C4785A]">
                  {order.orderNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    order.status === 'ReadyForPickup'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : order.status === 'InRepair'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-white">
                  {order.vehiclePlate} — {order.vehicleModel}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {order.clientName}
                </div>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-1 italic">
                "{order.diagnosticNotes}"
              </p>
              <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-neutral-400 font-sans text-[11px]">
                  {language === 'ar' ? 'التقدير' : 'Montant'}
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSave={addOrder}
        vehicles={vehicles}
      />
      <AutoVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSave={addVehicle}
      />
    </div>
  );
};
