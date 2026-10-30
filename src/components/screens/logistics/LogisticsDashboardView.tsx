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
  MapPin,
  ShieldCheck,
  RotateCcw,
  Boxes,
  KeyRound,
  FileText,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LogisticsShipmentModal } from './LogisticsShipmentModal';
import { WilayaTariffModal } from './WilayaTariffModal';

export const LogisticsDashboardView: React.FC = () => {
  const { language, setScreen, activeLogisticsRole, setActiveLogisticsRole } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments, manifests, bags, discharges, addShipment, resetLogisticsDemoData } = useLogisticsData();

  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);

  const outForDelivery = shipments.filter((s) => s.status === 'OutForDelivery').length;
  const deliveredCount = shipments.filter((s) => s.status === 'Delivered').length;
  const returnedCount = shipments.filter((s) => s.status === 'Returned' || s.status === 'Postponed').length;
  const hubStockCount = shipments.filter((s) => s.status === 'HubIntake' || s.status === 'ReceivedAtHub' || s.status === 'Sorted').length;

  const totalCodCollected = shipments
    .filter((s) => s.status === 'Delivered')
    .reduce((acc, s) => acc + s.codAmountDzd, 0);

  const totalCodExpected = shipments.reduce((acc, s) => acc + s.codAmountDzd, 0);
  const deliverySuccessRate = shipments.length > 0
    ? Math.round((deliveredCount / shipments.length) * 100)
    : 0;

  // Breakdown by Algerian zones
  const zoneStats = [
    { name: isAr ? 'المنطقة 1 — العاصمة' : 'Zone 1 (Alger)', count: shipments.filter((s) => s.destinationWilaya.includes('16')).length, color: 'bg-emerald-500' },
    { name: isAr ? 'المنطقة 2 — متيجة' : 'Zone 2 (Mitidja)', count: shipments.filter((s) => s.destinationWilaya.includes('09')).length, color: 'bg-blue-500' },
    { name: isAr ? 'المنطقة 3 — الشمال' : 'Zone 3 (Nord)', count: shipments.filter((s) => s.destinationWilaya.includes('31') || s.destinationWilaya.includes('25') || s.destinationWilaya.includes('06') || s.destinationWilaya.includes('13')).length, color: 'bg-indigo-500' },
    { name: isAr ? 'المنطقة 4 — الهضاب' : 'Zone 4 (Plateaux)', count: shipments.filter((s) => s.destinationWilaya.includes('19')).length, color: 'bg-amber-500' },
    { name: isAr ? 'المنطقة 5 — الواحات' : 'Zone 5 (Sud)', count: shipments.filter((s) => s.destinationWilaya.includes('30')).length, color: 'bg-orange-500' },
    { name: isAr ? 'المنطقة 6 — أقصى الجنوب' : 'Zone 6 (Grand Sud)', count: shipments.filter((s) => s.destinationWilaya.includes('11')).length, color: 'bg-[#C4785A]' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'اللوجستيك ومراكز الفرز والتوزيع (58 ولاية)' : 'Messagerie Express & Hub National (58 Wilayas)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {activeLogisticsRole === 'gerant'
                  ? (isAr ? 'المسؤول العام' : 'Direction / Gérant')
                  : activeLogisticsRole === 'dispatcher'
                  ? (isAr ? 'الموزع' : 'Régulateur Dispatch')
                  : activeLogisticsRole === 'hub_sorter'
                  ? (isAr ? 'عامل الفرز' : 'Tri & Quai')
                  : (isAr ? 'مكتب الاستلام' : 'Stop-Desk')}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إدارة الشحنات والطرود، رحلات التوزيع، مسح الباركود، بيانات Décret 05-468 وتحصيل أموال COD'
                : 'Tri des colis, tournées livreurs, lettres de voiture 05-468, décharges caisse et reversements CCP'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => setIsTariffModalOpen(true)}
            icon={<MapPin size={14} />}
          >
            {isAr ? 'شبكة تسعيرات 58 ولاية' : 'Grille Tarifs Wilayas'}
          </AtriumButton>

          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={() => {
              resetLogisticsDemoData();
              showToast(isAr ? 'تمت استعادة البيانات النموذجية للوجستيك' : 'Données démo logistique réinitialisées', 'info');
            }}
            icon={<RotateCcw size={14} />}
            title="Réinitialiser les données de démo"
          >
            {isAr ? 'إعادة تعيين' : 'Reset Démo'}
          </AtriumButton>

          <AtriumButton
            variant="primary"
            size="sm"
            onClick={() => setIsShipModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'شحنة جديدة (AWB)' : 'Nouveau Colis'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'مؤشرات التوزيع وخدمات التوصيل' : 'Activité du Hub & Performance des Tournées'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'متابعة حركة الطرود عبر الولايات، نسبة النجاح والتحصيل النقدي عند الباب' : 'Flux de colis en transit, expéditions réussies et encaissement COD'}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            {deliverySuccessRate}% {isAr ? 'نسبة التسليم الناجح' : 'Taux de Succès'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Colis en Tournée */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'طرود قيد التوزيع في الطريق' : 'Colis en Cours de Tournée'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-[#C4785A] font-mono tabular-nums">
                {outForDelivery}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                {manifests.length} {isAr ? 'بيان شحن شاحنة نشط (LVR)' : 'manifestes LVR actifs'}
              </p>
            </div>
          </div>

          {/* Card 2: Colis Livrés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'طرود تم تسليمها بنجاح' : 'Colis Livrés & Réceptionnés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {deliveredCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                Sur {shipments.length} expéditions totales ({hubStockCount} au Hub)
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'أموال COD المحصلة' : 'Encaissements COD'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Caisse Livreurs
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalCodCollected, language)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {deliveredCount} {isAr ? 'عملية تسليم مدفوعة' : 'remises encaissées'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mid Section: Zonal Heat & Transit Bags Pod */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Wilaya Zones Activity Radar */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-3.5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#C4785A]" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'توزيع الشحنات حسب المناطق والولايات' : 'Répartition des Flux par Zone Géographique'}
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-neutral-500">58 Wilayas</span>
          </div>

          <div className="space-y-2">
            {zoneStats.map((z, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-neutral-700 dark:text-neutral-300">{z.name}</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {z.count} colis
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`${z.color} h-full transition-all duration-300`}
                    style={{
                      width: `${shipments.length > 0 ? (z.count / shipments.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sacs-Navette & Transport Bags Status */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-3.5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes size={16} className="text-neutral-600 dark:text-neutral-400" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'أكياس الشحن المحكمة (Sacs-Navette & Scellés)' : 'Sacs-Navette en Transit & Scellés de Sécurité'}
              </h3>
            </div>
            <AtriumButton variant="ghost" size="xs" onClick={() => setScreen('registrations')}>
              {isAr ? 'فتح الماسح' : 'Scanner Quai'}
            </AtriumButton>
          </div>

          <div className="space-y-2.5">
            {bags.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {b.bagCode}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === 'Sealed'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : b.status === 'InTransit'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Hub W{b.originHubWilaya} → Hub W{b.destinationHubWilaya} • Scellé: <span className="font-mono font-semibold text-[#C4785A]">{b.securitySealNumber}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                    {b.totalItemCount} colis
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    {b.totalWeightKg} kg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'آخر الشحنات والطرود المسجلة' : 'Dernières Expéditions & Délais'}
            </h2>
          </div>
          <AtriumButton
            variant="ghost"
            size="xs"
            onClick={() => setScreen('members')}
            icon={<ChevronRight size={14} />}
          >
            {isAr ? 'عرض الكل' : 'Voir tout'}
          </AtriumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {shipments.slice(0, 6).map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 hover:border-[#C4785A]/40 transition-all shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#C4785A]">
                  {s.trackingCode}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : s.status === 'OutForDelivery'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : s.status === 'Returned' || s.status === 'Postponed'
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-white">
                  {s.recipientName}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {s.destinationWilaya} • {s.recipientPhone}
                </div>
                {s.deliveryMode === 'StopDesk' && (
                  <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Stop-Desk: {s.stopDeskShelfCode || 'RACK-A-01'}
                  </span>
                )}
              </div>
              <div className="pt-2 border-t border-[#EDF1F3] dark:border-neutral-700/60 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-neutral-400 font-sans text-[11px]">
                  Poids: {s.weightKg} kg
                </span>
                <span className="text-neutral-900 dark:text-white">
                  {formatMoney(s.codAmountDzd, language)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <LogisticsShipmentModal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        onSave={addShipment}
      />

      <WilayaTariffModal
        isOpen={isTariffModalOpen}
        onClose={() => setIsTariffModalOpen(false)}
      />
    </div>
  );
};
