import React, { useState } from 'react';
import { Sprout, Tractor, Scale, Droplets, Layers, Calendar, CheckCircle2, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { AgricultureParcelModal } from './AgricultureParcelModal';

export const AgricultureDashboardView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { parcels, harvestTickets, livestock, treatmentLogs, addParcel, setSelectedParcelId } = useAgricultureData();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalHectares = parcels.reduce((acc, p) => acc + p.surfaceHectares, 0);
  const totalHarvestNetKg = harvestTickets.reduce((acc, t) => acc + t.netWeightKg, 0);
  const totalWholesalePayoutDzd = harvestTickets.reduce((acc, t) => acc + (t.netFarmPayoutDzd || t.totalAmountDzd || 0), 0);
  const totalDailyMilkLiters = livestock
    .filter((a) => a.dailyProductionLiters)
    .reduce((acc, a) => acc + (a.dailyProductionLiters || 0), 0);

  const totalAnrhQuotaM3 = parcels.reduce((acc, p) => acc + (p.anrhAnnualQuotaM3 || 0), 0);
  const totalAnrhConsumedM3 = parcels.reduce((acc, p) => acc + (p.anrhConsumedM3 || 0), 0);
  const waterUsagePct = totalAnrhQuotaM3 > 0 ? Math.round((totalAnrhConsumedM3 / totalAnrhQuotaM3) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'لوحة قيادة المستثمرة الفلاحية' : 'Tableau de Bord du Domaine Agricole'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                Facility: 25
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'متابعة القطع الفلاحية، الجني، مبيعات سوق الجملة، وسجل المواشي'
                : 'Supervision des cultures, récoltes pesées, ventes mandataires et cheptel'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'قطعة جديدة' : 'Nouvelle Parcelle'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الإنتاج والمحاصيل' : 'Indicateurs Globaux de l\'Exploitation'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'المساحات المزروعة، حجم الإنتاج الموزون وصافي عائدات أسواق الجملة'
              : 'Assolement, tonnages récoltés au pont-bascule et recettes nettes'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Superficie Exploitation */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي المساحة المستغلة' : 'Superficie Exploitation'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {totalHectares} <span className="text-sm font-sans font-normal text-neutral-500">Hectares</span>
              </div>
              <p className="text-[11px] text-[#C4785A] mt-0.5 font-medium">
                {parcels.length} {isAr ? 'قطع وبيوت بلاستيكية' : 'parcelles & blocs serres'}
              </p>
            </div>
          </div>

          {/* Card 2: Volume Récolté */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي المحاصيل المجنية' : 'Volume Récolté (Net)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {(totalHarvestNetKg / 1000).toFixed(1)} <span className="text-sm font-sans font-normal text-neutral-500">Tonnes</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {totalHarvestNetKg.toLocaleString()} kg pesés au pont
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'مداخيل سوق الجملة (صافي)' : 'Ventes Marchés de Gros'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Mandataires 6%
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalWholesalePayoutDzd)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {totalDailyMilkLiters.toFixed(0)} L/j {isAr ? 'حليب يومي' : 'lait produit'} · {livestock.length} têtes
              </p>
            </div>
          </div>
        </div>

        {/* ANRH Borehole Irrigation Water Dial & Budget */}
        {totalAnrhQuotaM3 > 0 && (
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Droplets size={16} className="text-blue-500 shrink-0" />
              <div>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {isAr ? 'حصة مياه السقي بالآبار الارتوازية (وكالة ANRH) :' : 'Ressources Hydriques & Forages ANRH :'}
                </span>{' '}
                <span className="text-neutral-500">
                  {totalAnrhConsumedM3.toLocaleString()} m³ / {totalAnrhQuotaM3.toLocaleString()} m³ {isAr ? 'مستهلكة' : 'alloués'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    waterUsagePct >= 85 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, waterUsagePct)}%` }}
                />
              </div>
              <span className={`font-mono font-bold ${waterUsagePct >= 85 ? 'text-amber-600' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {waterUsagePct}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Parcels Grid Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tractor size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'القطع الفلاحية قيد الدورة الزراعية' : 'Parcelles & Cultures en Cours'}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
            {parcels.length} parcelles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {parcels.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedParcelId(p.id)}
              className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/60 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-500">
                    {p.surfaceHectares} Ha
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'Harvesting'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#C4785A] font-medium line-clamp-1 mt-0.5">
                    {p.currentCrop}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1 text-xs text-neutral-500">
                <div className="flex justify-between">
                  <span>Irrigation:</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{p.irrigationType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sol:</span>
                  <span className="truncate max-w-[120px] text-neutral-700 dark:text-neutral-300">{p.soilType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Weighing Tickets Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'آخر وصولات وزن المحاصيل (Pont-Bascule)' : 'Dernières Pesées & Expéditions Récolte'}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
            {harvestTickets.length} tickets
          </span>
        </div>

        <div className="space-y-3">
          {harvestTickets.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-neutral-900 p-4 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 dark:text-white font-mono bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded-md">
                    {t.ticketNumber}
                  </span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {t.cropDesignation}
                  </span>
                  <span className="text-neutral-400">· {t.truckPlate || t.vehiclePlate}</span>
                </div>
                <p className="text-neutral-500">
                  Destination: {t.destinationWholesaleMarket} · Chauffeur: {t.driverName || 'Non assigné'}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">Poids Net</span>
                  <span className="font-bold font-mono text-neutral-900 dark:text-white text-sm">
                    {t.netWeightKg.toLocaleString()} kg
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block uppercase tracking-wider">Net Mandataire</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatMoney(t.netFarmPayoutDzd || t.totalAmountDzd || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Parcel Modal */}
      <AgricultureParcelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(p) => {
          addParcel(p);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};
