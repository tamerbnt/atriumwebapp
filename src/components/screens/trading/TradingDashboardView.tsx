import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  FileText,
  Truck,
  Boxes,
  Package,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardTrading } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
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


export const TradingDashboardView: React.FC<any> = () => {
	const { t, language, isRtl } = useTranslation();
	const { commercialDocs, purchaseDocs, products, warehouses, currentBranch, branches, switchBranch, setScreen, resetTradingMockData, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: (commercialDocs || []).length > 0 || (products || []).length > 0
	});
	const [timeFilter, setTimeFilter] = React.useState("today");
	const [currentMonthIndex, setCurrentMonthIndex] = React.useState(10);
	const [isComposerOpen, setIsComposerOpen] = React.useState(false);
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
	const todayStr = React.useMemo(() => (/* @__PURE__ */ new Date()).toISOString().split("T")[0], []);
	const todayDocs = React.useMemo(() => {
		return (commercialDocs || []).filter((d) => d.date?.startsWith(todayStr));
	}, [commercialDocs, todayStr]);
	const todayGross = React.useMemo(() => {
		return todayDocs.reduce((sum, d) => sum + (d.totalTtc || d.netToPay || 0), 0) || 68e4;
	}, [todayDocs]);
	const pendingShipments = React.useMemo(() => {
		return (commercialDocs || []).filter((d) => d.status === "Validated" || d.status === "Draft").length || 4;
	}, [commercialDocs]);
	const dailyTarget = 15e5;
	const targetPct = Math.min(100, Math.round(todayGross / dailyTarget * 100));
	const hourlyData = React.useMemo(() => {
		return [
			0,
			2,
			7,
			5,
			2
		];
	}, []);
	const weeklyTradeVolume = React.useMemo(() => {
		return [
			{
				week: language === "ar" ? "أسبوع 1" : "week 1",
				value: 42e5
			},
			{
				week: language === "ar" ? "أسبوع 2" : "week 2",
				value: 48e5
			},
			{
				week: language === "ar" ? "أسبوع 3" : "week 3",
				value: 54e5
			},
			{
				week: language === "ar" ? "أسبوع 4" : "week 4",
				value: 49e5
			}
		];
	}, [language]);
	const totalProducts = (products || []).length || 180;
	const totalWarehouses = (warehouses || []).length || 3;
	const monthlyBilling = React.useMemo(() => {
		const base = 18e6;
		return Array.from({ length: 30 }, (_, i) => {
			const factor = Math.sin(i / 30 * Math.PI) * .5 + .5;
			return Math.round(base * factor * (1 + i % 6 * .1));
		});
	}, []);
	const productFamilies = React.useMemo(() => {
		return [
			{
				label: language === "ar" ? "مواد أولية وتغليف" : "Matières & Packaging",
				value: 42,
				color: "#d4522f"
			},
			{
				label: language === "ar" ? "قطع غيار صناعية" : "Pièces Industrielles",
				value: 36,
				color: "#3B82F6"
			},
			{
				label: language === "ar" ? "كيماويات وزيوت" : "Chimie & Fluides",
				value: 22,
				color: "#10B981"
			}
		];
	}, [language]);
	const topBuyers = React.useMemo(() => {
		return [
			{
				week: "Cevital Dist.",
				value: 48
			},
			{
				week: "Groupe Benamor",
				value: 38
			},
			{
				week: "Sidi Kebir Com.",
				value: 29
			},
			{
				week: "Oran Négoce",
				value: 22
			}
		];
	}, []);
	if (showSkeleton) return /* @__PURE__ */ <div className="p-6"><SkeletonDashboardTrading /></div>;
	return /* @__PURE__ */ <div className="flex-1 bg-white dark:bg-[#0C0C0E] min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<DashboardHeader title={t("nav_dashboard", language)} subtitle={language === "ar" ? "مؤشرات حركة التجارة بالجملة، خطوط الإمداد، المخازن وحسابات الزبائن B2B" : language === "fr" ? "Flux des expéditions en direct, rotation des stocks et créances commerciales." : "Live B2B dispatches, stock turnover, and trade receivables."} currentBranchName={currentBranch?.name || "Comptoir Commercial Alger"} branches={branches} onSwitchBranch={switchBranch} onResetDemoData={resetTradingMockData} exportFileName="trading_dashboard_report" />
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "حركة الشحن والطلبيات" : language === "fr" ? "Expéditions & Commandes B2B" : "Dispatch & Order Flow"} icon={<Truck size={18} className="text-[#d4522f]" />} badge={<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
{pendingShipments}
{" "}
{language === "ar" ? "شحنات قيد التحضير" : "En Préparation"}
</span>} rightControls={<div className="flex items-center bg-[#F0F2F5] dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-semibold">
<button type="button" onClick={() => setTimeFilter("today")} title={language === "ar" ? "عرض مؤشرات اليوم" : language === "fr" ? "Activité d'aujourd'hui" : "Today's activity"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "today" ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "اليوم" : language === "fr" ? "Aujourd'hui" : "Today"}</button>
<button type="button" onClick={() => setTimeFilter("yesterday")} title={language === "ar" ? "عرض مؤشرات الأمس" : language === "fr" ? "Activité d'hier" : "Yesterday's activity"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "yesterday" ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "أمس" : language === "fr" ? "Hier" : "Yesterday"}</button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex items-center justify-between">
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "شحنات جاهزة للتسليم" : "Bons de Livraison Prêts"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{pendingShipments}</span>
<span className="text-xs text-black/55 dark:text-white/55">/ 10 max</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
{"● "}
{language === "ar" ? "النقل نشط" : "Camions chargés"}
</span>
</div>
<div className="w-px h-12 bg-neutral-200 dark:bg-neutral-700 mx-4" />
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "طلبيات قيد التجهيز" : "Picking en Entrepôt"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{Math.max(todayDocs.length, 6)}</span>
<span className="text-xs text-black/55 dark:text-white/55">{language === "ar" ? "أوامر" : "commandes"}</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
{totalWarehouses}
{" "}
{language === "ar" ? "مستودعات" : "dépôts"}
</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
{language === "ar" ? "كثافة حركة الشحن على مدار 24 ساعة" : "Courbe horaire des sorties palettes (24h)"}
</span>
<HourlyCurveChart data={hourlyData} color="#d4522f" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-1.5">
<span className="text-xs font-medium text-black/70 dark:text-white/75">{language === "ar" ? "إجمالي المبيعات اليوم" : "CA Facturé Aujourd’hui"}</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(todayGross)}</span>
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
<span>{formatMoney(dailyTarget)}</span>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "الحسابات التجارية" : language === "fr" ? "Comptes B2B & Grossistes" : "Account Growth"} icon={<Building2 size={18} className="text-[#d4522f]" />} rightControls={<div className="flex items-center gap-1 text-xs font-semibold text-black/70 dark:text-white/75">
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev > 0 ? prev - 1 : 11)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronLeft size={14} /></button>
<span className="px-1 text-black dark:text-white">
{months[currentMonthIndex]}
{" 2026"}
</span>
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev < 11 ? prev + 1 : 0)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronRight size={14} /></button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<DashboardMetricCard label={language === "ar" ? "المواد المسجلة" : "Références SKU"} value={totalProducts} badgeText={language === "ar" ? "متوفر" : "En Stock"} badgeVariant="success" tooltip={language === "ar" ? "الكتالوج التجاري للمنتجات" : "Articles actifs en entrepôt"} />
<DashboardMetricCard label={language === "ar" ? "الحسابات التجارية" : "Comptes Grossistes"} value={42} badgeText={language === "ar" ? "حسابات B2B" : "Distributeurs"} badgeVariant="neutral" tooltip={language === "ar" ? "زبائن الجملة والتوزيع" : "Clients enregistrés"} />
<DarkEspressoCard label={language === "ar" ? "مستحقات آجلة معلقة" : "Encours Crédit Client"} value={formatMoney(45e5)} sublabel={language === "ar" ? "فواتير مستحقة الدفع" : "Créances à 30/60 jours"} badgeText={language === "ar" ? "مراقب" : "Sous contrôle"} badgeVariant="neutral" />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "حجم المبيعات الأسبوعية (دج)" : "Volume hebdomadaire des ventes"}
</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{language === "ar" ? "مقارنة شهرية" : "4 dernières semaines"}</span>
</div>
<PillBarHistogram data={weeklyTradeVolume} maxScale={Math.max(...weeklyTradeVolume.map((w) => w.value)) * 1.2} barColor="#d4522f" />
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
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="grid grid-cols-3 gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-700/60">
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "هامش الربح" : "Marge Nette"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(Math.round(todayGross * .22))}</span>
<span className="text-[10px] text-emerald-600 block">22% Brut</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "الإيراد الإجمالي" : "CA Facturé"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(todayGross)}</span>
<span className="text-[10px] text-emerald-600 block">+11.4%</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "تكلفة البضاعة" : "Coût d’Achat"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(Math.round(todayGross * .78))}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 block">78% CA</span>
</div>
</div>
<div className="pt-3">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
{language === "ar" ? "منحنى الفوترة على مدار 30 يوماً" : "Tendance de facturation sur 30 jours"}
</span>
<MonthlyAreaChart data={monthlyBilling} color="#8B5CF6" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "مؤشرات الأداء التجاري B2B" : "Ratios de Performance Négoce"}
</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<div className="grid grid-cols-2 gap-3">
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "متوسط أجل الدفع (DSO)" : "DSO Moyen"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">32 j</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Maitrisé</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "نسبة تسليم الطلبيات" : "Taux de Service"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">97.4%</span>
<span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">OTIF</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "دوران المخزون" : "Rotation Stocks"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">6.2x /an</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Fluide</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "هامش الربح الإجمالي" : "Marge Brute"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">22%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Optimal</span>
</div>
</div>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "المؤشرات والتنبيهات" : language === "fr" ? "Analyses & Alertes" : "Insights & Alerts"} icon={<Receipt size={18} className="text-[#d4522f]" />} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "توزيع المبيعات حسب الصنف" : "Mix Familles Produits"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<DonutChart segments={productFamilies} centerLabel={`${totalProducts} SKUs`} />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "كبار المشترين (حجم الطلبات)" : "Top Acheteurs B2B"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<PillBarHistogram data={topBuyers} maxScale={60} barColor="#3B82F6" />
</div>
</div>
<GuardianCard title={language === "ar" ? "رأس المال والسيولة" : "Working Capital"} subtitle={language === "ar" ? "الموازنة المستمرة بين ديون الموردين ومستحقات الزبائن وقيمة المخزون لتفادي فجوات السيولة" : "Surveillance proactive du ratio Créances / Dettes / Stocks. Trésorerie commerciale positive."} score={91} statusText={language === "ar" ? "توازن رأس المال العامل ممتاز!" : "BFR équilibré : couverture des créances à 128% !"} metricLabel={language === "ar" ? "كفاية رأس المال" : "Couverture"} metricValue="128%" trendText={language === "ar" ? "آمن" : "BFR sain"} defaultEnabled />
</div>
</DashboardPod>
</div>
</div>
{isComposerOpen && /* @__PURE__ */ <CommercialDocComposerModal isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} />}
</div>;
};
