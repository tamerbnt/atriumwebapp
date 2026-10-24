import React, { useState } from 'react';
import {
  Truck,
  Package,
  Plus,
  QrCode,
  DollarSign,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';

export const LogisticsDashboardView: React.FC = () => {
  const { language, setScreen } = useAtriumStore();
  const { shipments, manifests, addShipment } = useLogisticsData();

  const [isShipModalOpen, setIsShipModalOpen] = useState(false);

  const outForDelivery = shipments.filter((s) => s.status === 'OutForDelivery').length;
  const deliveredToday = shipments.filter((s) => s.status === 'Delivered').length;
  const totalCodCollected = shipments
    .filter((s) => s.status === 'Delivered')
    .reduce((acc, s) => acc + s.codAmountDzd, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'اللوجستيك ومراكز الفرز والتوزيع' : 'Messagerie Express & Hub Logistique'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Facility: 23
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {language === 'ar'
                ? 'إدارة الشحنات والطرود، رحلات التوزيع، مسح الباركود وتحصيل أموال الدفع عند الاستلام (COD)'
                : 'Tri des colis, tournées livreurs, bordereaux de livraison & caisse contre-remboursement'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsShipModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {language === 'ar' ? 'شحنة جديدة (AWB)' : 'Nouveau Colis'}
          </AtriumButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'طرود قيد التوصيل' : 'Colis en livraison'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
                {outForDelivery}
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                {language === 'ar' ? 'في الطريق' : 'En tournée'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'طرود تم تسليمها' : 'Colis livrés'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {deliveredToday}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {language === 'ar' ? 'ناجحة' : 'Succès'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'أموال COD المحصلة' : 'Encaissements COD'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 tabular-nums">
                {formatMoney(totalCodCollected, language)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'مسارات التوزيع النشطة' : 'Feuilles de route'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                {manifests.length}
              </span>
              <span className="text-xs text-neutral-400">
                Livreurs
              </span>
            </div>
          </div>
        </div>

        {/* Shipments List */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'آخر الطرود المسجلة' : 'Dernières Expéditions (AWB)'}
              </h2>
            </div>
            <button
              onClick={() => setScreen('members')}
              className="text-xs text-[#C4785A] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>{language === 'ar' ? 'عرض كل الشحنات' : 'Toutes les expéditions'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {shipments.map((s) => (
              <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#C4785A]">
                      {s.trackingCode}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {s.recipientName}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Destination: {s.destinationWilaya} · Marchand: {s.merchantName}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                    COD: {formatMoney(s.codAmountDzd, language)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LogisticsShipmentModal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        onSave={addShipment}
      />
    </div>
  );
};
