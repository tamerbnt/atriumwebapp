import React, { useState, useMemo } from 'react';
import {
  Building2,
  Key,
  Home,
  TrendingUp,
  Receipt,
  FileCheck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useRealEstateData } from './realEstateData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardRealEstate } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
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


export const RealEstateDashboardView: React.FC<any> = () => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, setScreen, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const { properties, leases, addProperty, addLease } = useRealEstateData();
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: (properties || []).length > 0
	});
	const [timeFilter, setTimeFilter] = React.useState("today");
	const [currentMonthIndex, setCurrentMonthIndex] = React.useState(10);
	const [isPropModalOpen, setIsPropModalOpen] = React.useState(false);
	const [isLeaseModalOpen, setIsLeaseModalOpen] = React.useState(false);
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
	const totalProps = (properties || []).length || 36;
	const rentedProps = (properties || []).filter((p) => p.status === "Rented").length || 24;
	const availableProps = (properties || []).filter((p) => p.status === "Available").length || 12;
	const occupancyRate = Math.round(rentedProps / Math.max(1, totalProps) * 100);
	const monthlyRentCollected = React.useMemo(() => {
		return (leases || []).filter((l) => l.status === "Active").reduce((acc, l) => acc + (l.monthlyRentDzd || 0), 0) || 185e4;
	}, [leases]);
	const targetRent = 25e5;
	const targetPct = Math.min(100, Math.round(monthlyRentCollected / targetRent * 100));
	const hourlyData = React.useMemo(() => {
		return [
			0,
			1,
			4,
			6,
			2
		];
	}, []);
	const weeklySignatures = React.useMemo(() => {
		return [
			{
				week: language === "ar" ? "أسبوع 1" : "week 1",
				value: 3
			},
			{
				week: language === "ar" ? "أسبوع 2" : "week 2",
				value: 5
			},
			{
				week: language === "ar" ? "أسبوع 3" : "week 3",
				value: 4
			},
			{
				week: language === "ar" ? "أسبوع 4" : "week 4",
				value: 6
			}
		];
	}, [language]);
	const monthlyCommissions = React.useMemo(() => {
		const base = 48e4;
		return Array.from({ length: 30 }, (_, i) => {
			const factor = Math.sin(i / 30 * Math.PI) * .5 + .5;
			return Math.round(base * factor * (1 + i % 5 * .15));
		});
	}, []);
	const propertyTypes = React.useMemo(() => {
		return [
			{
				label: language === "ar" ? "شقق سكنية" : "Appartements F3/F4",
				value: 48,
				color: "#d4522f"
			},
			{
				label: language === "ar" ? "فيلات ومنازل" : "Villas Haut Standing",
				value: 32,
				color: "#3B82F6"
			},
			{
				label: language === "ar" ? "مكاتب ومحلات" : "Locaux & Bureaux",
				value: 20,
				color: "#10B981"
			}
		];
	}, [language]);
	const agentVolume = React.useMemo(() => {
		return [
			{
				week: "Sofiane (Senior)",
				value: 12
			},
			{
				week: "Yasmine (Com.)",
				value: 9
			},
			{
				week: "Nabil (B2B)",
				value: 7
			},
			{
				week: "Ryad (Junior)",
				value: 4
			}
		];
	}, []);
	if (showSkeleton && (properties.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonDashboardRealEstate isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />;
	return /* @__PURE__ */ <div className="flex-1 bg-white dark:bg-[#0C0C0E] min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<DashboardHeader title={t("nav_dashboard", language)} subtitle={language === "ar" ? "مؤشرات المحفظة العقارية، تدفق الزيارات وعقود الإيجار والوساطة والتحصيل" : language === "fr" ? "Portefeuille immobilier en direct, mandats exclusifs et encaissement des loyers." : "Live property portfolio, lease agreements, and real estate brokerage analytics."} currentBranchName={currentBranch?.name || "Agence Immobilière Atrium"} branches={branches} onSwitchBranch={switchBranch} onResetDemoData={() => {}} exportFileName="realestate_dashboard_report" />
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "حركة المعاينات والصفقات" : language === "fr" ? "Visites & Activité" : "Visits & Deals"} icon={<Key size={18} className="text-[#d4522f]" />} badge={<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
{rentedProps}
{" / "}
{totalProps}
{" "}
{language === "ar" ? "عقارات مؤجرة" : "Biens Loués"}
</span>} rightControls={<div className="flex items-center bg-[#F0F2F5] dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-semibold">
<button type="button" onClick={() => setTimeFilter("today")} title={language === "ar" ? "عرض مؤشرات اليوم" : language === "fr" ? "Activité d'aujourd'hui" : "Today's activity"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "today" ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "اليوم" : language === "fr" ? "Aujourd'hui" : "Today"}</button>
<button type="button" onClick={() => setTimeFilter("yesterday")} title={language === "ar" ? "عرض مؤشرات الأمس" : language === "fr" ? "Activité d'hier" : "Yesterday's activity"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "yesterday" ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "أمس" : language === "fr" ? "Hier" : "Yesterday"}</button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex items-center justify-between">
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "عقارات مؤجرة حالياً" : "Biens Sous Bail"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{rentedProps}</span>
<span className="text-xs text-black/55 dark:text-white/55">
{"/ "}
{totalProps}
</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
{"● "}
{occupancyRate}
{"% "}
{language === "ar" ? "معدل الإشغال" : "Taux d’occupation"}
</span>
</div>
<div className="w-px h-12 bg-neutral-200 dark:bg-neutral-700 mx-4" />
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "عقارات شاغرة متاحة" : "Biens Disponibles"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{availableProps}</span>
<span className="text-xs text-black/55 dark:text-white/55">{language === "ar" ? "عقار" : "à louer/vendre"}</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">{language === "ar" ? "جاهزة للمعاينات" : "Visites ouvertes"}</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
{language === "ar" ? "كثافة طلبات المعاينة على مدار 24 ساعة" : "Courbe horaire des visites planifiées (24h)"}
</span>
<HourlyCurveChart data={hourlyData} color="#d4522f" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-1.5">
<span className="text-xs font-medium text-black/70 dark:text-white/75">{language === "ar" ? "مجموع الإيجارات الشهرية" : "Loyers Mensuels Recouvrés"}</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(monthlyRentCollected)}</span>
</div>
<div className="w-full bg-neutral-100 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mb-1">
<div className="bg-[#d4522f] h-full rounded-full transition-all duration-500" style={{ width: `${targetPct}%` }} />
</div>
<div className="flex justify-between text-[11px] text-black/55 dark:text-white/55">
<span>
{targetPct}
{"% "}
{language === "ar" ? "من الهدف" : "de l’objectif"}
</span>
<span>{formatMoney(targetRent)}</span>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "المحفظة والعقود" : language === "fr" ? "Portefeuille & Mandats" : "Portfolio & Mandates"} icon={<Building2 size={18} className="text-[#d4522f]" />} rightControls={<div className="flex items-center gap-1 text-xs font-semibold text-black/70 dark:text-white/75">
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev > 0 ? prev - 1 : 11)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronLeft size={14} /></button>
<span className="px-1 text-black dark:text-white">
{months[currentMonthIndex]}
{" 2026"}
</span>
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev < 11 ? prev + 1 : 0)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronRight size={14} /></button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<DashboardMetricCard label={language === "ar" ? "إجمالي العقارات" : "Biens au Portefeuille"} value={totalProps} badgeText={language === "ar" ? "مسجلة" : "Actifs"} badgeVariant="success" tooltip={language === "ar" ? "جميع العقارات المسجلة بالوكالة" : "Biens sous mandat"} />
<DashboardMetricCard label={language === "ar" ? "عقود الإيجار السارية" : "Baux Actifs"} value={(leases || []).filter((l) => l.status === "Active").length || 24} badgeText={language === "ar" ? "سارية" : "En cours"} badgeVariant="neutral" tooltip={language === "ar" ? "عقود مؤجرة وموثقة" : "Baux avec locataire en place"} />
<DarkEspressoCard label={language === "ar" ? "تنبيه انتهاء العقود" : "Échéances Baux (60j)"} value={3} sublabel={language === "ar" ? "عقود بحاجة للتجديد" : "À renouveler sous 60 jours"} badgeText={language === "ar" ? "تجديد" : "Renouvellement"} badgeVariant="warning" />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "حجم الصفقات وتوقيع العقود أسبوعياً" : "Signatures de baux et ventes (4 semaines)"}
</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{language === "ar" ? "مقارنة شهرية" : "4 dernières semaines"}</span>
</div>
<PillBarHistogram data={weeklySignatures} maxScale={8} barColor="#d4522f" />
</div>
</div>
</DashboardPod>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "الإيرادات والأرباح" : language === "fr" ? "Revenus & Honoraires" : "Revenue & Profit"} icon={<TrendingUp size={18} className="text-[#d4522f]" />} rightControls={<span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase">
{months[currentMonthIndex]}
{" 2026"}
</span>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="grid grid-cols-3 gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-700/60">
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "عمولة الوكالة" : "Honoraires Nets"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(32e4)}</span>
<span className="text-[10px] text-emerald-600 block">+14%</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "حجم الإيجارات" : "Volume Loyers"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(monthlyRentCollected)}</span>
<span className="text-[10px] text-emerald-600 block">+8%</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "تسويق وإشهار" : "Marketing & Dép."}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(65e3)}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 block">20% Honoraires</span>
</div>
</div>
<div className="pt-3">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
{language === "ar" ? "منحنى العمولات على مدار 30 يوماً" : "Tendance des honoraires sur 30 jours"}
</span>
<MonthlyAreaChart data={monthlyCommissions} color="#8B5CF6" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "مؤشرات الأداء العقاري" : "Ratios de Performance"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<div className="grid grid-cols-2 gap-3">
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "متوسط مدة التأجير" : "Délai Moyen Location"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">22 j</span>
<span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Rapide</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "العائد الاستثماري" : "Rendement Locatif"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">7.8%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Rentable</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "نسبة تحصيل الإيجارات" : "Taux d’Encaissement"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">98%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Sans impayé</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "تحويل الزيارات لعقود" : "Conversion Visites"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">34%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Performant</span>
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
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "توزيع أنواع العقارات" : "Typologie des Biens"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<DonutChart segments={propertyTypes} centerLabel={`${totalProps} Biens`} />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "أداء وكلاء العقارات" : "Ventes & Baux par Agent"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<PillBarHistogram data={agentVolume} maxScale={15} barColor="#3B82F6" />
</div>
</div>
<GuardianCard title={language === "ar" ? "تجديد العقود" : "Lease Renewals"} subtitle={language === "ar" ? "فحص استباقي لعقود الإيجار التي تقترب من نهايتها لتفادي فترات الشغور وإعادة طرحها في السوق" : "Surveillance proactive des baux à échéance sous 60 jours pour éliminer la vacance locative."} score={96} statusText={language === "ar" ? "نسبة الشغور منخفضة ومحكومة تماماً!" : "Vacance locative minimale : 96% du parc sécurisé !"} metricLabel={language === "ar" ? "استقرار الإشغال" : "Stabilité"} metricValue="96%" trendText={language === "ar" ? "مستقر" : "Zéro impayé"} defaultEnabled />
</div>
</DashboardPod>
</div>
</div>
{isPropModalOpen && /* @__PURE__ */ <RealEstatePropertyModal isOpen={isPropModalOpen} onClose={() => setIsPropModalOpen(false)} onSave={addProperty} />}
{isLeaseModalOpen && /* @__PURE__ */ <RealEstateLeaseModal isOpen={isLeaseModalOpen} onClose={() => setIsLeaseModalOpen(false)} properties={properties} onSave={addLease} />}
</div>;
};
