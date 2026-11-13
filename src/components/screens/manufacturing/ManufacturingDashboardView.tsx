import React, { useState, useMemo } from 'react';
import {
  Factory,
  Layers,
  Boxes,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Info,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { useManufacturingData } from './manufacturingData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardManufacturing } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';
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


export const ManufacturingDashboardView: React.FC<any> = () => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, setScreen, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const { boms, orders, addOrder } = useManufacturingData();
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: (orders || []).length > 0 || (boms || []).length > 0
	});
	const [timeFilter, setTimeFilter] = React.useState("today");
	const [currentMonthIndex, setCurrentMonthIndex] = React.useState(10);
	const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false);
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
	const activeOrders = (orders || []).filter((o) => o.status === "InProduction").length || 4;
	const plannedOrders = (orders || []).filter((o) => o.status === "Planned").length || 2;
	const completedOrders = (orders || []).filter((o) => o.status === "Completed").length || 18;
	const totalUnitsProduced = (orders || []).reduce((acc, o) => acc + (o.quantityProduced || 0), 0) || 4800;
	const dailyTargetUnits = 6e3;
	const targetPct = Math.min(100, Math.round(totalUnitsProduced / dailyTargetUnits * 100));
	const hourlyData = React.useMemo(() => {
		return [
			0,
			4,
			9,
			8,
			3
		];
	}, []);
	const weeklyProduction = React.useMemo(() => {
		return [
			{
				week: language === "ar" ? "أسبوع 1" : "week 1",
				value: 24e3
			},
			{
				week: language === "ar" ? "أسبوع 2" : "week 2",
				value: 28500
			},
			{
				week: language === "ar" ? "أسبوع 3" : "week 3",
				value: 26e3
			},
			{
				week: language === "ar" ? "أسبوع 4" : "week 4",
				value: 31e3
			}
		];
	}, [language]);
	const monthlyProductionValue = React.useMemo(() => {
		const base = 45e5;
		return Array.from({ length: 30 }, (_, i) => {
			const factor = Math.sin(i / 30 * Math.PI) * .5 + .5;
			return Math.round(base * factor * (1 + i % 5 * .12));
		});
	}, []);
	const productMix = React.useMemo(() => {
		return [
			{
				label: language === "ar" ? "تجهيزات ومعدات" : "Équipements & Boîtiers",
				value: 45,
				color: "#d4522f"
			},
			{
				label: language === "ar" ? "كابلات وتوصيلات" : "Câblage & Faisceaux",
				value: 35,
				color: "#3B82F6"
			},
			{
				label: language === "ar" ? "قطع قولبة بلاستيكية" : "Injection Plastique",
				value: 20,
				color: "#10B981"
			}
		];
	}, [language]);
	const stationOutput = React.useMemo(() => {
		return [
			{
				week: "Usinage CNC",
				value: 42
			},
			{
				week: "Soudure Auto",
				value: 38
			},
			{
				week: "Assemblage",
				value: 50
			},
			{
				week: "Contrôle Qualité",
				value: 48
			}
		];
	}, []);
	if (showSkeleton && (orders.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonDashboardManufacturing isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />;
	return /* @__PURE__ */ <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<DashboardHeader title={t("nav_dashboard", language)} subtitle={language === "ar" ? "مؤشرات خطوط الإنتاج، كفاءة المحطات وتتبع أوامر التصنيع ومراقبة الجودة" : language === "fr" ? "Rendement des lignes de fabrication, TRS machines et contrôle qualité des ordres (OF)." : "Live production floor throughput, OEE machine uptime, and quality assurance analytics."} currentBranchName={currentBranch?.name || "Usine de Production Atrium"} branches={branches} onSwitchBranch={switchBranch} onResetDemoData={() => {}} exportFileName="manufacturing_dashboard_report" />
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "حركة خطوط الإنتاج والآلات" : language === "fr" ? "Lignes de Fabrication & Postes" : "Workstation Flow & Machine Uptime"} icon={<Factory size={18} className="text-[#d4522f]" />} badge={<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
{activeOrders}
{" "}
{language === "ar" ? "أوامر جارية" : "OF en cours"}
</span>} rightControls={<div className="flex items-center bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 p-0.5 rounded-xl text-xs font-semibold shadow-2xs">
<button type="button" onClick={() => setTimeFilter("today")} title={language === "ar" ? "بيانات اليوم" : language === "fr" ? "Données d'aujourd'hui" : "Today's output"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "today" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "اليوم" : language === "fr" ? "Aujourd'hui" : "Today"}</button>
<button type="button" onClick={() => setTimeFilter("yesterday")} title={language === "ar" ? "بيانات الأمس" : language === "fr" ? "Données d'hier" : "Yesterday's output"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "yesterday" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "أمس" : language === "fr" ? "Hier" : "Yesterday"}</button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex items-center justify-between">
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "أوامر الإنتاج النشطة" : "Ordres de Fabrication (OF)"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{activeOrders}</span>
<span className="text-xs text-black/55 dark:text-white/55">/ 8 lignes</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
{"● "}
{language === "ar" ? "الآلات تعمل" : "Lignes actives"}
</span>
</div>
<div className="w-px h-12 bg-[#E6DED6] dark:bg-neutral-700 mx-4" />
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "أوامر مبرمجة قادمة" : "OF Planifiés"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{plannedOrders}</span>
<span className="text-xs text-black/55 dark:text-white/55">{language === "ar" ? "دفعات" : "lots"}</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-full">
{completedOrders}
{" "}
{language === "ar" ? "تم إنهاؤها" : "clôturés"}
</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-[#E6DED6] dark:border-neutral-700/60">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
{language === "ar" ? "كثافة إنتاج القطع على مدار 24 ساعة" : "Courbe horaire de cadence pièces (24h)"}
</span>
<HourlyCurveChart data={hourlyData} color="#d4522f" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-1.5">
<span className="text-xs font-medium text-black/70 dark:text-white/75">{language === "ar" ? "القطع المصنعة اليوم" : "Unités Fabriquées Aujourd’hui"}</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{totalUnitsProduced.toLocaleString()}
{" pcs"}
</span>
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
<span>
{dailyTargetUnits.toLocaleString()}
{" pcs"}
</span>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "الإنتاج وقوائم المواد" : language === "fr" ? "En-Cours & Nomenclatures" : "Production & BOM"} icon={<Layers size={18} className="text-[#d4522f]" />} rightControls={<div className="flex items-center gap-1 text-xs font-semibold text-black/70 dark:text-white/75">
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev > 0 ? prev - 1 : 11)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronLeft size={14} /></button>
<span className="px-1 text-black dark:text-white">
{months[currentMonthIndex]}
{" 2026"}
</span>
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev < 11 ? prev + 1 : 0)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronRight size={14} /></button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<DashboardMetricCard label={language === "ar" ? "قوائم المواد (BOM)" : "Nomenclatures (BOM)"} value={(boms || []).length || 14} badgeText={language === "ar" ? "معتمدة" : "Validées"} badgeVariant="success" tooltip={language === "ar" ? "مخططات التركيب والتصنيع" : "Recettes de fabrication actives"} />
<DashboardMetricCard label={language === "ar" ? "الدفعات المنتجة هذا الشهر" : "Lots Fabriqués Mois"} value={completedOrders} badgeText={language === "ar" ? "مكتملة" : "Livrés"} badgeVariant="neutral" tooltip={language === "ar" ? "دفعات فحصت وسلمت للمخزن" : "Ordres clôturés"} />
<DarkEspressoCard label={language === "ar" ? "نسبة الهدر والفاقد" : "Taux de Rebut (Scrap)"} value="1.2%" sublabel={language === "ar" ? "تحت الحد الأقصى" : "Sous le seuil tolérance 2%"} badgeText="Conforme" badgeVariant="neutral" />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "حجم الإنتاج الأسبوعي (قطع)" : "Cadence hebdomadaire d’unités produites"}
</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{language === "ar" ? "مقارنة شهرية" : "4 dernières semaines"}</span>
</div>
<PillBarHistogram data={weeklyProduction} maxScale={35000} barColor="#d4522f" />
</div>
</div>
</DashboardPod>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "الإيرادات والتكاليف" : language === "fr" ? "Revenus & Coûts" : "Revenue & Cost"} icon={<TrendingUp size={18} className="text-[#d4522f]" />} rightControls={<span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase">
{months[currentMonthIndex]}
{" 2026"}
</span>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="grid grid-cols-3 gap-2 pb-3 border-b border-[#E6DED6] dark:border-neutral-700/60">
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "قيمة الإنتاج" : "Valeur Usine"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(42e5)}</span>
<span className="text-[10px] text-emerald-600 block">+8.5%</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "مواد أولية" : "Matières Cons."}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(24e5)}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 block">57% Coût</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "طاقة ويد عاملة" : "Main d’Œuvre"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(11e5)}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 block">26% Coût</span>
</div>
</div>
<div className="pt-3">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
{language === "ar" ? "منحنى قيمة الإنتاج على مدار 30 يوماً" : "Tendance de valeur produite sur 30 jours"}
</span>
<MonthlyAreaChart data={monthlyProductionValue} color="#8B5CF6" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "مؤشرات الكفاءة الصناعية (TRS / OEE)" : "Ratios de Performance Industrielle"}
</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<div className="grid grid-cols-2 gap-3">
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "الفعالية الإجمالية (TRS)" : "Taux TRS / OEE"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">86.4%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">World Class</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "زمن الدورة للقطعة" : "Cycle Time Moyen"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">42 sec</span>
<span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Optimisé</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "دقة وصفة التصنيع" : "Précision BOM"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">99.4%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Conforme</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "الالتزام بجدول التسليم" : "Respect Délais OF"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">97.8%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">À l’heure</span>
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
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "توزيع الإنتاج حسب الصنف" : "Mix Produits Finis"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<DonutChart segments={productMix} centerLabel={`${activeOrders} OF`} />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "إنتاجية المحطات والورشات" : "Rendement par Poste"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<PillBarHistogram data={stationOutput} maxScale={60} barColor="#3B82F6" />
</div>
</div>
<GuardianCard title={language === "ar" ? "مراقبة الجودة (QC)" : "Quality Control"} subtitle={language === "ar" ? "فحص آلي لتقارير عدم المطابقة وعينات الجودة في نهاية كل خط إنتاج قبل التغليف والتخزين" : "Surveillance proactive des non-conformités matière et validation des jalons QC."} score={98} statusText={language === "ar" ? "جميع العينات مطابقة للمواصفات ISO 9001!" : "Zéro non-conformité critique : conformité certifiée !"} metricLabel={language === "ar" ? "مؤشر الجودة" : "Conformité"} metricValue="98.8%" trendText={language === "ar" ? "معتمد" : "Lots conformes"} defaultEnabled />
</div>
</DashboardPod>
</div>
</div>
{isOrderModalOpen && /* @__PURE__ */ <ManufacturingOrderModal isOpen={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} boms={boms} onSave={addOrder} />}
</div>;
};
