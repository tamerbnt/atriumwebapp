import React, { useState, useMemo } from 'react';
import {
  Scale,
  Briefcase,
  Calendar,
  Lock,
  TrendingUp,
  Receipt,
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
import { useLegalData } from './legalData';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonDashboardLegal } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { LegalMatterModal } from './LegalMatterModal';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
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


export const LegalDashboardView: React.FC<any> = () => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, setScreen, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const { matters, hearings, deadlines, escrowAccounts, addMatter, addCPCADeadline } = useLegalData();
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: (matters || []).length > 0
	});
	const [timeFilter, setTimeFilter] = React.useState("today");
	const [currentMonthIndex, setCurrentMonthIndex] = React.useState(10);
	const [isMatterModalOpen, setIsMatterModalOpen] = React.useState(false);
	const [isDeadlineModalOpen, setIsDeadlineModalOpen] = React.useState(false);
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
	const todayHearings = React.useMemo(() => {
		return (hearings || []).filter((h) => h.hearingDate === todayStr);
	}, [hearings, todayStr]);
	const activeMatters = (matters || []).filter((m) => m.status === "Active").length || 28;
	const criticalDeadlines = (deadlines || []).filter((d) => d.status === "critical" || d.status === "approaching").length || 3;
	const todayTrustReceipts = 48e4;
	const dailyTarget = 6e5;
	const targetPct = Math.min(100, Math.round(todayTrustReceipts / dailyTarget * 100));
	const hourlyData = React.useMemo(() => {
		return [
			0,
			2,
			6,
			5,
			1
		];
	}, []);
	const weeklyHearings = React.useMemo(() => {
		return [
			{
				week: language === "ar" ? "أسبوع 1" : "week 1",
				value: 8
			},
			{
				week: language === "ar" ? "أسبوع 2" : "week 2",
				value: 12
			},
			{
				week: language === "ar" ? "أسبوع 3" : "week 3",
				value: 9
			},
			{
				week: language === "ar" ? "أسبوع 4" : "week 4",
				value: 14
			}
		];
	}, [language]);
	const monthlyBilling = React.useMemo(() => {
		const base = 12e5;
		return Array.from({ length: 30 }, (_, i) => {
			const factor = Math.sin(i / 30 * Math.PI) * .5 + .5;
			return Math.round(base * factor * (1 + i % 5 * .12));
		});
	}, []);
	const practiceAreas = React.useMemo(() => {
		return [
			{
				label: language === "ar" ? "قانون تجاري وشركات" : "Droit des Affaires & B2B",
				value: 45,
				color: "#d4522f"
			},
			{
				label: language === "ar" ? "نزاعات عقارية ومدنية" : "Contentieux Civil & Foncier",
				value: 35,
				color: "#3B82F6"
			},
			{
				label: language === "ar" ? "قانون جنائي وعقوبات" : "Pénal & Fraude",
				value: 20,
				color: "#10B981"
			}
		];
	}, [language]);
	const advocateCaseload = React.useMemo(() => {
		return [
			{
				week: "Me. Brahimi",
				value: 14
			},
			{
				week: "Me. Cherif",
				value: 11
			},
			{
				week: "Me. Dahmani",
				value: 8
			},
			{
				week: "Me. Saadi",
				value: 5
			}
		];
	}, []);
	if (showSkeleton && (matters.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonDashboardLegal isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />;
	return /* @__PURE__ */ <div className="flex-1 bg-white dark:bg-[#0C0C0E] min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<DashboardHeader title={t("nav_dashboard", language)} subtitle={language === "ar" ? "مؤشرات قضايا المكتب، جدول الجلسات والمرافعات وأمان حسابات الودائع والآجال القضائية" : language === "fr" ? "Rôle des audiences, suivi des délais procéduraux CPCA et gestion des comptes CARPA." : "Live court docket, hearing schedules, and legal trust accounting."} currentBranchName={currentBranch?.name || "Cabinet Juridique Atrium"} branches={branches} onSwitchBranch={switchBranch} onResetDemoData={() => {}} exportFileName="legal_dashboard_report" />
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "حركة الجلسات والآجال القضائية" : language === "fr" ? "Rôle des Audiences & Délais" : "Court Docket & Hearings"} icon={<Scale size={18} className="text-[#d4522f]" />} badge={<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
{Math.max(todayHearings.length, 2)}
{" "}
{language === "ar" ? "جلسات اليوم" : "Audiences"}
</span>} rightControls={<div className="flex items-center bg-[#F0F2F5] dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-semibold">
<button type="button" onClick={() => setTimeFilter("today")} title={language === "ar" ? "بيانات اليوم" : language === "fr" ? "Données d'aujourd'hui" : "Today's docket"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "today" ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "اليوم" : language === "fr" ? "Aujourd'hui" : "Today"}</button>
<button type="button" onClick={() => setTimeFilter("yesterday")} title={language === "ar" ? "بيانات الأمس" : language === "fr" ? "Données d'hier" : "Yesterday's docket"} className={`px-3 py-1 rounded-md transition-all ${timeFilter === "yesterday" ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "أمس" : language === "fr" ? "Hier" : "Yesterday"}</button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex items-center justify-between">
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "جلسات المحكمة اليوم" : "Audiences au Tribunal"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{Math.max(todayHearings.length, 2)}</span>
<span className="text-xs text-black/55 dark:text-white/55">/ 4 max</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
{"● "}
{language === "ar" ? "ملفات جاهزة" : "Dossiers plaidés"}
</span>
</div>
<div className="w-px h-12 bg-neutral-200 dark:bg-neutral-700 mx-4" />
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "آجال حاسمة قادمة" : "Délais de Forclusion"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{criticalDeadlines}</span>
<span className="text-xs text-black/55 dark:text-white/55">{language === "ar" ? "أيام" : "échéances"}</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">{language === "ar" ? "متابعة CPCA" : "Sous contrôle CPCA"}</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
{language === "ar" ? "توزيع ساعات الاستشارات والمرافعات على مدار 24 ساعة" : "Courbe horaire des actes juridiques (24h)"}
</span>
<HourlyCurveChart data={hourlyData} color="#d4522f" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-1.5">
<span className="text-xs font-medium text-black/70 dark:text-white/75">
{language === "ar" ? "إجمالي أتعاب المكتب اليوم" : "Honoraires Encaissés Aujourd’hui"}
</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(todayTrustReceipts)}</span>
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
<DashboardPod title={language === "ar" ? "محفظة القضايا والموكلين" : language === "fr" ? "Dossiers & Clients" : "Matters & Clients"} icon={<Briefcase size={18} className="text-[#d4522f]" />} rightControls={<div className="flex items-center gap-1 text-xs font-semibold text-black/70 dark:text-white/75">
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev > 0 ? prev - 1 : 11)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronLeft size={14} /></button>
<span className="px-1 text-black dark:text-white">
{months[currentMonthIndex]}
{" 2026"}
</span>
<button type="button" onClick={() => setCurrentMonthIndex((prev) => prev < 11 ? prev + 1 : 0)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded"><ChevronRight size={14} /></button>
</div>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<DashboardMetricCard label={language === "ar" ? "إجمالي الملفات الجارية" : "Dossiers Actifs"} value={activeMatters} badgeText={language === "ar" ? "قيد المتابعة" : "En cours"} badgeVariant="success" tooltip={language === "ar" ? "قضايا مفتوحة أمام الجهات القضائية" : "Dossiers contentieux en cours"} />
<DashboardMetricCard label={language === "ar" ? "عقود الاستشارة السنوية" : "Abonnements B2B"} value={8} badgeText="Retainers" badgeVariant="neutral" tooltip={language === "ar" ? "مؤسسات متعاقدة سنوياً" : "Entreprises sous convention"} />
<DarkEspressoCard label={language === "ar" ? "أموال الودائع CARPA" : "Fonds CARPA Séquestrés"} value={formatMoney(84e5)} sublabel={language === "ar" ? "حسابات الضمان الموثقة" : "Comptes séquestre clients"} badgeText="Audit OK" badgeVariant="neutral" />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "عدد الجلسات والمرافعات أسبوعياً" : "Volume hebdomadaire des audiences plaidées"}
</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{language === "ar" ? "مقارنة شهرية" : "4 dernières semaines"}</span>
</div>
<PillBarHistogram data={weeklyHearings} maxScale={18} barColor="#d4522f" />
</div>
</div>
</DashboardPod>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "الأتعاب والأرباح" : language === "fr" ? "Revenus & Honoraires" : "Revenue & Profit"} icon={<TrendingUp size={18} className="text-[#d4522f]" />} rightControls={<span className="text-xs font-semibold text-black/70 dark:text-white/75 uppercase">
{months[currentMonthIndex]}
{" 2026"}
</span>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="grid grid-cols-3 gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-700/60">
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "صافي الأتعاب" : "Net Cabinet"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(95e4)}</span>
<span className="text-[10px] text-emerald-600 block">+16%</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "مفوتر هذا الشهر" : "Facturé Mois"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(12e5)}</span>
<span className="text-[10px] text-emerald-600 block">+12%</span>
</div>
<div>
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "مصاريف التقاضي" : "Frais de Procédure"}</span>
<span className="text-lg font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(25e4)}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 block">21% CA</span>
</div>
</div>
<div className="pt-3">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-1">
{language === "ar" ? "منحنى التدفق النقدي على مدار 30 يوماً" : "Tendance des encaissements sur 30 jours"}
</span>
<MonthlyAreaChart data={monthlyBilling} color="#8B5CF6" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "مؤشرات الكفاءة القانونية" : "Indicateurs de Performance"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<div className="grid grid-cols-2 gap-3">
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "نسبة كسب القضايا" : "Taux de Succès"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">89.4%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Élevé</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "متوسط مدة الفصل" : "Durée Moyenne Litige"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">7.5 mois</span>
<span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Rapide</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "نسبة تحصيل الأتعاب" : "Recouvrement Honoraires"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">95%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Sécurisé</span>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-700/50 p-3 rounded-xl">
<span className="text-[11px] text-black/70 dark:text-white/75 block">{language === "ar" ? "الالتزام بالمواعيد" : "Respect Délais CPCA"}</span>
<div className="flex items-center justify-between mt-1">
<span className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">100%</span>
<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Zéro forclusion</span>
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
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "توزيع مجالات الاختصاص" : "Répartition des Domaines"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<DonutChart segments={practiceAreas} centerLabel={`${activeMatters} Dossiers`} />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">{language === "ar" ? "توزيع القضايا حسب المحامي" : "Charge par Avocat"}</span>
<Info size={13} className="text-black/55 dark:text-white/55" />
</div>
<PillBarHistogram data={advocateCaseload} maxScale={18} barColor="#3B82F6" />
</div>
</div>
<GuardianCard title={language === "ar" ? "مراقبة الآجال القضائية" : "Court Deadlines"} subtitle={language === "ar" ? "فحص استباقي مستمر لمواعيد الطعن والاستئناف وفق قانون الإجراءات المدنية والإدارية الجزائري" : "Surveillance proactive des délais d’appel, cassation et prescription légale."} score={99} statusText={language === "ar" ? "جميع الملفات والآجال الإجرائية مؤمنة تماماً!" : "Aucun risque de forclusion : délais procéduraux 100% respectés !"} metricLabel={language === "ar" ? "سلامة المواعيد" : "Conformité"} metricValue="100%" trendText={language === "ar" ? "مؤمن" : "Délais sous contrôle"} defaultEnabled />
</div>
</DashboardPod>
</div>
</div>
{isMatterModalOpen && /* @__PURE__ */ <LegalMatterModal isOpen={isMatterModalOpen} onClose={() => setIsMatterModalOpen(false)} onSave={addMatter} />}
{isDeadlineModalOpen && /* @__PURE__ */ <CpcaDeadlineModal isOpen={isDeadlineModalOpen} onClose={() => setIsDeadlineModalOpen(false)} matters={matters || []} onSaveDeadline={addCPCADeadline} />}
</div>;
};
