import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Car,
  Clock,
  TrendingUp,
  Receipt,
  Boxes,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useGarageData } from './garageData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardGarage } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { AutoOrderModal } from './AutoOrderModal';
import { AutoVehicleModal } from './AutoVehicleModal';
import {
  DashboardHeader,
  DashboardPod,
  DashboardMetricCard,
  DarkEspressoCard,
  HourlyCurveChart,
  PillBarHistogram,
  MonthlyAreaChart,
  DonutChart,
  GuardianCard,
} from '../../common/dashboard';


export const AutoGarageDashboardView: React.FC<any> = () => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, setScreen, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const { orders, vehicles, parts, bays, fleets, invoices, addOrder, addVehicle } = useGarageData();
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: (orders || []).length > 0 || (vehicles || []).length > 0
	});
	const [timeFilter, setTimeFilter] = React.useState("today");
	const [currentMonthIndex, setCurrentMonthIndex] = React.useState(10);
	const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false);
	const [isVehicleModalOpen, setIsVehicleModalOpen] = React.useState(false);
	const months = [
		"JAN",
		"FEV",
		"MAR",
		"AVR",
		"MAI",
		"JUIN",
		"JUIL",
		"AOU",
		"SEP",
		"OCT",
		"NOV",
		"DEC"
	];
	const occupiedBays = React.useMemo(() => (bays || []).filter((b) => b.isOccupied).length || 3, [bays]);
	const totalBays = (bays || []).length || 6;
	const readyForPickup = React.useMemo(() => (orders || []).filter((o) => o.status === "ReadyForPickup" || o.status === "Delivered").length || 2, [orders]);
	const todayRevenue = React.useMemo(() => {
		return (invoices || []).reduce((sum, i) => sum + (i.netToPayDzd || i.totalTtc || 0), 0) || 85e3;
	}, [invoices]);
	const dailyTarget = 15e4;
	const targetPct = Math.min(100, Math.round(todayRevenue / dailyTarget * 100));
	const hourlyData = React.useMemo(() => {
		return [
			0,
			1,
			5,
			4,
			2
		];
	}, []);
	const weeklyRepairTrend = React.useMemo(() => {
		return [
			{
				week: language === "ar" ? "أسبوع 1" : "week 1",
				value: 16
			},
			{
				week: language === "ar" ? "أسبوع 2" : "week 2",
				value: 22
			},
			{
				week: language === "ar" ? "أسبوع 3" : "week 3",
				value: 19
			},
			{
				week: language === "ar" ? "أسبوع 4" : "week 4",
				value: 24
			}
		];
	}, [language]);
	const totalVehiclesCount = (vehicles || []).length || 58;
	const totalFleetsCount = (fleets || []).length || 4;
	const monthlyRevenue = React.useMemo(() => {
		const base = 95e4;
		return Array.from({ length: 30 }, (_, i) => {
			const factor = Math.sin(i / 30 * Math.PI) * .5 + .5;
			return Math.round(base * factor * (1 + i % 5 * .12));
		});
	}, []);
	const jobTypes = React.useMemo(() => {
		return [
			{
				label: language === "ar" ? "صيانة دورية وزيوت" : "Vidange & Révision",
				value: 45,
				color: "#d4522f"
			},
			{
				label: language === "ar" ? "ميكانيك وفرامل" : "Mécanique & Freinage",
				value: 35,
				color: "#3B82F6"
			},
			{
				label: language === "ar" ? "تشخيص إلكتروني" : "Diagnostic OBD & Élec",
				value: 20,
				color: "#10B981"
			}
		];
	}, [language]);
	const mechanicProductivity = React.useMemo(() => {
		return [
			{
				week: "Mourad (Chef)",
				value: 9
			},
			{
				week: "Slimane (Méc.)",
				value: 7
			},
			{
				week: "Walid (Élec.)",
				value: 6
			},
			{
				week: "Hamza (Appr.)",
				value: 4
			}
		];
	}, []);
	if (showSkeleton) return /* @__PURE__ */ <div className="p-6"><SkeletonDashboardGarage /></div>;
	return /* @__PURE__ */ <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<DashboardHeader title={t("nav_dashboard", language)} subtitle={language === "ar" ? "مؤشرات حركة الورشة، إشغال الجسور والرافعات وتتبع أوامر الإصلاح وقطع الغيار" : language === "fr" ? "Occupation des ponts élévateurs, ordres de réparation et rentabilité garage." : "Live lift & bay utilization, repair order turnaround, and auto workshop analytics."} currentBranchName={currentBranch?.name || "Atelier Central Auto Atrium"} branches={branches} onSwitchBranch={switchBranch} onResetDemoData={() => {}} exportFileName="garage_dashboard_report" />
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "إشغال الجسور والورشة" : language === "fr" ? "Occupation des Ponts & Baies" : "Lift & Bay Utilization"} icon={<Wrench size={18} className="text-[#d4522f]" />} badge={<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
{occupiedBays}
{" / "}
{totalBays}
{" "}
{language === "ar" ? "جسور مشغولة" : "Ponts Actifs"}
</span>} rightControls={<div className="flex items-center bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 p-0.5 rounded-xl text-xs font-semibold shadow-2xs">
<button type="button" onClick={() => setTimeFilter("today")} title={language === "ar" ? "بيانات اليوم" : language === "fr" ? "Données d'aujourd'hui" : "Today's metrics"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "today" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "اليوم" : language === "fr" ? "Aujourd'hui" : "Today"}</button>
<button type="button" onClick={() => setTimeFilter("yesterday")} title={language === "ar" ? "بيانات الأمس" : language === "fr" ? "Données d'hier" : "Yesterday's metrics"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "yesterday" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "أمس" : language === "fr" ? "Hier" : "Yesterday"}</button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex items-center justify-between">
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "الجسور قيد العمل" : "Ponts Élévateurs"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{occupiedBays}</span>
<span className="text-xs text-black/55 dark:text-white/55">
{"/ "}
{totalBays}
</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
{"● "}
{Math.round(occupiedBays / totalBays * 100)}
{"% "}
{language === "ar" ? "معدل الإشغال" : "Charge atelier"}
</span>
</div>
<div className="w-px h-12 bg-[#E6DED6] dark:bg-neutral-700 mx-4" />
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "سيارات جاهزة للتسليم" : "Prêtes à Livrer"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{readyForPickup}</span>
<span className="text-xs text-black/55 dark:text-white/55">{language === "ar" ? "مركبات" : "véhicules"}</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">{language === "ar" ? "فواتير محررة" : "Facturation prête"}</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-[#E6DED6] dark:border-neutral-700/60">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
{language === "ar" ? "كثافة أعمال الورشة على مدار 24 ساعة" : "Charge horaire des ponts (24h)"}
</span>
<HourlyCurveChart data={hourlyData} color="#d4522f" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-1.5">
<span className="text-xs font-medium text-black/70 dark:text-white/75">{language === "ar" ? "إيرادات الورشة اليوم" : "Chiffre d’Affaires Aujourd’hui"}</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(todayRevenue)}</span>
</div>
<div className="w-full bg-[#E6DED6]/70 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mb-1">
<div className="bg-[#d4522f] h-full rounded-full transition-all duration-500" style={{ width: `${targetPct}%` }} />
</div>
<div className="flex justify-between text-[11px] text-black/55 dark:text-white/55">
<span>
{targetPct}
{"% "}
{language === "ar" ? "من الهدف" : "de l’objectif"}
</span>
<span>{formatMoney(dailyTarget)}</span>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "حظيرة المركبات والأساطيل" : language === "fr" ? "Flottes & Parc Roulant" : "Vehicles & Fleets"} icon={<Car size={18} className="text-[#d4522f]" />} rightControls={<div className="flex items-center gap-1 text-xs font-semibold text-black/70 dark:text-white/75">
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev > 0 ? prev - 1 : 11)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronLeft size={14} /></button>
<span className="px-1 text-black dark:text-white">
{months[currentMonthIndex]}
{" 2026"}
</span>
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev < 11 ? prev + 1 : 0)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronRight size={14} /></button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<DashboardMetricCard label={language === "ar" ? "حظيرة المركبات" : "Véhicules Référencés"} value={totalVehiclesCount} badgeText={language === "ar" ? "مسجلة" : "Parc"} badgeVariant="success" tooltip={language === "ar" ? "مركبات ببطاقات صيانة بالورشة" : "Véhicules ayant historique atelier"} />
<DashboardMetricCard label={language === "ar" ? "حسابات الأساطيل B2B" : "Contrats Flottes"} value={totalFleetsCount} badgeText="Flottes" badgeVariant="neutral" tooltip={language === "ar" ? "شركات وأساطيل نقل متعاقدة" : "Entreprises sous contrat d’entretien"} />
<DarkEspressoCard label={language === "ar" ? "أوامر إصلاح نشطة" : "Ordres de Réparation (OR)"} value={(orders || []).filter((o) => o.status === "InRepair").length || 4} sublabel={language === "ar" ? "قيد التنفيذ" : "En cours de travaux"} badgeText={language === "ar" ? "نشط" : "En cours"} badgeVariant="neutral" />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "عدد التدخلات الأسبوعية" : "Volume hebdomadaire des réparations"}
</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{language === "ar" ? "مقارنة شهرية" : "4 dernières semaines"}</span>
</div>
<PillBarHistogram data={weeklyRepairTrend} maxScale={30} barColor="#d4522f" />
</div>
</div>
</DashboardPod>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "الإيرادات والأرباح" : language === "fr" ? "Revenus & Marges" : "Revenue & Profit"} icon={<TrendingUp size={18} className="text-[#d4522f]" />} rightControls={<span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase">
{months[currentMonthIndex]}
{" 2026"}
</span>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="grid grid-cols-3 gap-2 pb-3 border-b border-[#E6DED6] dark:border-neutral-700/60">
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "صافي الورشة" : "Marge Nette"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(Math.round(todayRevenue * .46))}</span>
<span className="text-[10px] text-emerald-600 block">46% Brut</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "الإيراد الإجمالي" : "CA Facturé"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(todayRevenue)}</span>
<span className="text-[10px] text-emerald-600 block">+9.1%</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "قطع ومستهلكات" : "Pièces Achetées"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(Math.round(todayRevenue * .54))}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 block">54% CA</span>
</div>
</div>
<div className="pt-3">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
{language === "ar" ? "منحنى التدفق النقدي على مدار 30 يوماً" : "Tendance des encaissements sur 30 jours"}
</span>
<MonthlyAreaChart data={monthlyRevenue} color="#8B5CF6" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "مؤشرات كفاءة الورشة" : "Indicateurs Atelier"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<div className="grid grid-cols-2 gap-3">
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "زمن دوران الجسر" : "Temps Rotation Pont"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">2.4 h</span>
<span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Rapide</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "هامش قطع الغيار" : "Marge Pièces"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">32%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Optimal</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "إصلاح من المرة الأولى" : "First-Time Fix"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">96.8%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Qualité</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "دقة التشخيص" : "Précision Diagnostic"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">98.5%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">OBD Expert</span>
</div>
</div>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "المؤشرات والتنبيهات" : language === "fr" ? "Analyses & Alertes" : "Insights & Alerts"} icon={<ShieldCheck size={18} className="text-[#d4522f]" />} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "توزيع أنواع الإصلاحات" : "Typologie des Prestations"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<DonutChart segments={jobTypes} centerLabel={`${totalVehiclesCount} Véhicules`} />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "إنتاجية الفنيين والميكانيكيين" : "Ordres Clôturés / Mécanicien"}
</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<PillBarHistogram data={mechanicProductivity} maxScale={12} barColor="#3B82F6" />
</div>
</div>
<GuardianCard title={language === "ar" ? "تنبيهات الجسور والقطع" : "Workshop Queue"} subtitle={language === "ar" ? "مراقبة زمن إشغال الرافعات والتأكد من توفر قطع الغيار قبل فك المحركات والفرامل" : "Surveillance proactive des délais d’immobilisation et disponibilité des pièces."} score={95} statusText={language === "ar" ? "جاهزية الورشة وتوافر القطع ممتاز!" : "Flux d’atelier régulé : zéro blocage de pont !"} metricLabel={language === "ar" ? "كفاءة التدفق" : "Fluidité"} metricValue="95%" trendText={language === "ar" ? "مؤمن" : "Cadence optimale"} defaultEnabled />
</div>
</DashboardPod>
</div>
</div>
{isOrderModalOpen && /* @__PURE__ */ <AutoOrderModal isOpen={isOrderModalOpen} vehicles={vehicles} onClose={() => setIsOrderModalOpen(false)} onSave={addOrder} />}
{isVehicleModalOpen && /* @__PURE__ */ <AutoVehicleModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} onSave={addVehicle} />}
</div>;
};
