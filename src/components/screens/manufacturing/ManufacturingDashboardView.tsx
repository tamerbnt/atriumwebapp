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
import { formatMoney } from '../../../utils/rules';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { SkeletonKpiGrid } from '../../ui/skeleton/StructuralSkeletons';

export const ManufacturingDashboardView: React.FC = () => {
  const {
    language,
    setScreen,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();
  const { boms, orders, addOrder } = useManufacturingData();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: orders.length > 0 || boms.length > 0,
  });

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const activeOrders = orders.filter((o) => o.status === 'InProduction').length;
  const plannedOrders = orders.filter((o) => o.status === 'Planned').length;
  const completedOrders = orders.filter((o) => o.status === 'Completed').length;
  const totalUnitsProduced = orders.reduce((acc, o) => acc + (o.quantityProduced || 0), 0);
  const totalPlannedUnits = orders.reduce((acc, o) => acc + o.targetQuantity, 0);

  if (showSkeleton && (orders.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <SkeletonKpiGrid count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Factory size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات خطوط الإنتاج والورشة' : 'Cadence de Production & Rendement Lignes'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة تشغيل المحطات، الوحدات المنجزة ونسب الامتثال' : 'Ordres de fabrication en cours, unités produites et disponibilité BOM'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: OF en production */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'أوامر تصنيع قيد الإنجاز' : 'Ordres de Fabrication Actifs'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeOrders}
              </div>
              <p className="text-[11px] text-[#C4785A] mt-0.5 font-medium">
                {plannedOrders} {language === 'ar' ? 'مبرمج في جدول الانتظار' : 'OF planifiés'}
              </p>
            </div>
          </div>

          {/* Card 2: Pièces produites */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {language === 'ar' ? 'الوحدات المصنعة المكتملة' : 'Unités Fabriquées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {totalUnitsProduced.toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                Sur {totalPlannedUnits.toLocaleString()} cibles prévues
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'كفاءة التصنيع والجاهزية' : 'Efficacité Industrielle'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                {boms.length} {language === 'ar' ? 'وصفة BOM' : 'Nomenclatures'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {totalPlannedUnits > 0 ? Math.round((totalUnitsProduced / totalPlannedUnits) * 100) : 100}%
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {completedOrders} {language === 'ar' ? 'أمر تم تسليمه للمخزن' : 'OF clôturés avec succès'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'أوامر التصنيع في ورشة الإنتاج' : 'Lignes de Production en Cours'}
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
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-white">
                  {order.productName}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {order.assignedStation || 'Poste Standard'} • Lot: {order.batchLotNumber || 'B-01'}
                </div>
              </div>
              <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-neutral-400 font-sans text-[11px]">
                  {language === 'ar' ? 'الإنجاز' : 'Progression'}
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {order.quantityProduced} / {order.targetQuantity} {language === 'ar' ? 'قطعة' : 'unités'}
                </span>
              </div>
            </div>
          ))}
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
