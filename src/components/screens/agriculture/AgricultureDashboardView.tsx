import React from 'react';
import { Sprout, Tractor, Scale, Droplets, Layers, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';

export const AgricultureDashboardView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { parcels, harvestTickets, livestock, treatmentLogs } = useAgricultureData();

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const totalHectares = parcels.reduce((acc, p) => acc + p.surfaceHectares, 0);
  const totalHarvestNetKg = harvestTickets.reduce((acc, t) => acc + t.netWeightKg, 0);
  const totalWholesalePayoutDzd = harvestTickets.reduce((acc, t) => acc + t.netFarmPayoutDzd, 0);
  const totalDailyMilkLiters = livestock
    .filter((a) => a.dailyProductionLiters)
    .reduce((acc, a) => acc + (a.dailyProductionLiters || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Sprout size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'لوحة قيادة المستثمرة الفلاحية' : 'Tableau de Bord du Domaine Agricole'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'متابعة القطع الفلاحية، الجني، مبيعات سوق الجملة، وسجل المواشي'
                : 'Supervision des cultures, récoltes pesées, ventes mandataires et cheptel'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'إجمالي المساحة المستغلة' : 'Superficie Totale Exploitation'}
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
              {totalHectares} Ha
            </div>
            <div className="text-[11px] text-[#C4785A]">
              {parcels.length} {isAr ? 'قطع وبيوت بلاستيكية' : 'parcelles & blocs serres'}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'إجمالي المحاصيل المجنية' : 'Volume Récolté (Net)'}
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {(totalHarvestNetKg / 1000).toFixed(1)} T
            </div>
            <div className="text-[11px] text-neutral-400">
              {totalHarvestNetKg.toLocaleString()} kg pesés au pont
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'مداخيل مبيعات سوق الجملة (صافي)' : 'Ventes Marchés de Gros (Net)'}
            </div>
            <div className="text-2xl font-bold font-mono text-blue-600">
              {formatMoney(totalWholesalePayoutDzd)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              Après commission mandataire 6%
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <div className="text-neutral-500 text-xs font-medium">
              {isAr ? 'حلب الحليب اليومي' : 'Production Laitière'}
            </div>
            <div className="text-2xl font-bold font-mono text-amber-600">
              {totalDailyMilkLiters.toFixed(1)} L / jour
            </div>
            <div className="text-[11px] text-neutral-400">
              {livestock.length} {isAr ? 'رؤوس ماشية مسجلة' : 'têtes de cheptel'}
            </div>
          </div>
        </div>

        {/* Parcels Status Cards */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Tractor size={16} className="text-[#C4785A]" />
            <span>{isAr ? 'حالة القطع الفلاحية والبيوت المحمية' : 'État Cultural des Parcelles'}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {parcels.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {p.name}
                  </h3>
                  <span className="font-mono text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2 py-0.5 rounded">
                    {p.surfaceHectares} Ha
                  </span>
                </div>

                <div className="text-xs text-neutral-500 flex items-center justify-between">
                  <span>Culture: <strong className="text-neutral-800 dark:text-neutral-200">{p.currentCrop}</strong></span>
                  <span className="text-neutral-400">Irrigation: {p.irrigationType}</span>
                </div>

                <div className="text-[11px] text-neutral-400 flex items-center justify-between border-t border-neutral-200/60 dark:border-neutral-700/60 pt-1.5">
                  <span>Planté: {p.plantingDate}</span>
                  <span className="text-[#C4785A] font-semibold">Récolte: {p.expectedHarvestDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Weighbridge Tickets */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Scale size={16} className="text-[#C4785A]" />
            <span>{isAr ? 'آخر تذاكر الوزن العمومي للمحاصيل' : 'Derniers Bons de Pesage & Expéditions'}</span>
          </h2>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {harvestTickets.map((ticket) => (
              <div key={ticket.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#C4785A] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded">
                      {ticket.ticketNumber}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {ticket.cropDesignation}
                    </span>
                    <span className="text-neutral-500 font-mono">
                      ({ticket.vehiclePlate})
                    </span>
                  </div>
                  <div className="text-neutral-500">
                    Destination: {ticket.destinationWholesaleMarket} · {ticket.cratesCount} caisses
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-emerald-600">
                    {ticket.netWeightKg.toLocaleString()} kg Net
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Net: {formatMoney(ticket.netFarmPayoutDzd)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
