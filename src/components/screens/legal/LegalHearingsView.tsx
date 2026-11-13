import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Scale,
  Gavel,
  AlertTriangle,
  Building2,
  FileText,
  UserCheck,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
  Pin,
  Trash2,
  Edit,
  X,
  Save,
  Check,
  Layers,
  ArrowRight,
  Send,
  Download,
  AlertCircle,
  FileCheck,
  Landmark,
  Briefcase,
  Users,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LegalHearing, CPCADeadline } from '../../../types';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { CpcaDeadlineModal } from '../../modals/CpcaDeadlineModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';



export const LegalHearingsView: React.FC<any> = () => {
	const { language, activeLegalRole, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { hearings, matters, deadlines, addHearing, updateHearing, deleteHearing, addCPCADeadline } = useLegalData();
	const { showSkeleton, isTimedOut, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: hearings.length > 0
	});
	const [searchQuery, setSearchQuery] = React.useState("");
	const [filterCategory, setFilterCategory] = React.useState("All");
	const [viewMode, setViewMode] = React.useState("list");
	const [hybridView, setHybridView] = React.useState("docket");
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set(["hear_01"]));
	const [sortBy, setSortBy] = React.useState("hearingDate");
	const [sortDir, setSortDir] = React.useState("asc");
	const [isCpcaModalOpen, setIsCpcaModalOpen] = React.useState(false);
	const [isNewHearingModalOpen, setIsNewHearingModalOpen] = React.useState(false);
	const [selectedHearing, setSelectedHearing] = React.useState<any>(null);
	const [activeInspectorTab, setActiveInspectorTab] = React.useState("audience");
	const [formMatterId, setFormMatterId] = React.useState(matters[0]?.id || "");
	const [formHearingDate, setFormHearingDate] = React.useState(() => (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
	const [formHearingTime, setFormHearingTime] = React.useState("09:30");
	const [formCourtName, setFormCourtName] = React.useState("Tribunal de Sidi M'Hamed");
	const [formCourtRoom, setFormCourtRoom] = React.useState("Salle 04");
	const [formChamber, setFormChamber] = React.useState("Chambre Commerciale");
	const [formBenchJudge, setFormBenchJudge] = React.useState("Président Benalia");
	const [formPurpose, setFormPurpose] = React.useState("Plaidoirie sur le fond & communication de pièces");
	const [formPostponementCode, setFormPostponementCode] = React.useState("RPP");
	const filteredHearings = React.useMemo(() => {
		return hearings.filter((h) => {
			if (filterCategory === "Scheduled" && h.isCompleted) return false;
			if (filterCategory === "Completed" && !h.isCompleted) return false;
			if (filterCategory === "Postponed" && h.status !== "Postponed") return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const mNum = (h.matterNumber || "").toLowerCase().includes(q);
				const mTitle = (h.matterTitle || "").toLowerCase().includes(q);
				const court = (h.courtName || "").toLowerCase().includes(q);
				const judge = (h.benchJudge || "").toLowerCase().includes(q);
				const purpose = (h.purpose || "").toLowerCase().includes(q);
				if (!mNum && !mTitle && !court && !judge && !purpose) return false;
			}
			return true;
		});
	}, [
		hearings,
		filterCategory,
		searchQuery
	]);
	const totalScheduled = React.useMemo(() => hearings.filter((h) => !h.isCompleted).length, [hearings]);
	const totalCriticalDeadlines = React.useMemo(() => deadlines.filter((d) => d.status === "approaching" || d.status === "critical").length, [deadlines]);
	const totalCompleted = React.useMemo(() => hearings.filter((h) => h.isCompleted).length, [hearings]);
	const handleCreateHearing = (e: any) => {
		e.preventDefault();
		const matter = matters.find((m) => m.id === formMatterId);
		const newH = {
			id: `hear_${Date.now()}`,
			accountId: "acc_01",
			businessId: "biz_legal",
			branchId: "branch_legal_main",
			staffId: "staff_01",
			matterId: formMatterId,
			matterNumber: matter?.matterNumber || "DOS-2026-AUTO",
			matterTitle: matter?.title || "Dossier Contentieux",
			matterTitleAr: matter?.titleAr,
			hearingDate: formHearingDate,
			hearingTime: formHearingTime,
			courtName: formCourtName,
			courtRoom: formCourtRoom,
			chamber: formChamber,
			benchJudge: formBenchJudge,
			purpose: formPurpose,
			purposeAr: isAr ? "مرافعة وتبادل المذكرات" : void 0,
			resultSummary: "En cours d'instruction",
			postponementCode: formPostponementCode,
			isCompleted: false,
			status: "Scheduled"
		};
		addHearing(newH);
		showToast(isAr ? "تمت إضافة الجلسة القضائية بنجاح" : "Audience judiciaire programmée avec succès", "success");
		setIsNewHearingModalOpen(false);
	};
	const hearingColumns = React.useMemo(() => [
		{
			key: "hearingDate",
			header: isAr ? "تاريخ وساعة الجلسة" : "Date, Heure & Salle",
			width: "2.5*",
			sortable: true,
			renderCell: (h: any) => /* @__PURE__ */ <div className="flex items-center gap-3 min-w-0 pr-2">
<div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs"><Calendar size={18} /></div>
<div className="min-w-0">
<div className="flex items-center gap-2">
<span className="text-xs font-bold text-black dark:text-white truncate">
{h.hearingDate}
{" "}
{h.hearingTime ? `à ${h.hearingTime}` : ""}
</span>
{pinnedIds.has(h.id) && /* @__PURE__ */ <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono mt-0.5">
{h.courtRoom || "Salle d'Audience"}
{" · "}
{h.chamber || "Chambre"}
</div>
</div>
</div>
		},
		{
			key: "courtName",
			header: isAr ? "المحكمة وهيئة الحكم" : "Juridiction & Siège",
			width: "3*",
			renderCell: (h: any) => /* @__PURE__ */ <div className="text-xs">
<div className="font-semibold text-black dark:text-white truncate">{h.courtName}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono mt-0.5">{h.benchJudge || "Président de Chambre"}</div>
</div>
		},
		{
			key: "matter",
			header: isAr ? "رقم القضية والموضوع" : "Dossier & Objet Litige",
			width: "3*",
			renderCell: (h: any) => /* @__PURE__ */ <div className="text-xs">
<div className="font-bold font-mono text-[#d4522f] truncate">{h.matterNumber}</div>
<div className="text-black/70 dark:text-white/75 truncate text-[11px] mt-0.5">{isAr && h.matterTitleAr ? h.matterTitleAr : h.matterTitle}</div>
</div>
		},
		{
			key: "purpose",
			header: isAr ? "الهدف / المرافعة" : "Démarche & Décision",
			width: "2.5*",
			renderCell: (h: any) => /* @__PURE__ */ <div className="text-xs">
<div className="font-medium text-black dark:text-white truncate">{h.purpose || "Plaidoirie sur le fond"}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono mt-0.5">{h.resultSummary || "En attente"}</div>
</div>
		},
		{
			key: "status",
			header: isAr ? "الوضعية والكود" : "Statut & Renvoi",
			width: "1.8*",
			renderCell: (h: any) => {
				const isDone = h.isCompleted;
				return /* @__PURE__ */ <div className="flex flex-col gap-0.5">
<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block text-center ${isDone ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>{isDone ? isAr ? "تمت" : "Plaidée" : isAr ? "مبرمجة" : "Fixée"}</span>
{h.postponementCode && /* @__PURE__ */ <span className="text-[9px] font-mono font-bold text-black/55 dark:text-white/55 text-center">
{"Code: "}
{h.postponementCode}
</span>}
</div>;
			}
		}
	], [isAr, pinnedIds]);
	const getCustomActions = (h: any) => {
		return [
			{
				id: "inspect",
				label: isAr ? "تفاصيل الجلسة" : "Fiche Audience",
				icon: /* @__PURE__ */ <FileText size={14} />,
				onClick: () => setSelectedHearing(h)
			},
			{
				id: "renvoi",
				label: isAr ? "تأجيل الجلسة (RPP)" : "Reporter (Renvoi)",
				icon: /* @__PURE__ */ <Clock size={14} />,
				onClick: () => {
					updateHearing({
						...h,
						postponementCode: "RPP",
						status: "Postponed",
						resultSummary: "Renvoi accordé pour production de pièces adverses"
					});
					showToast(isAr ? "تم تسجيل تأجيل الجلسة (RPP)" : "Renvoi pour pièces (RPP) enregistré", "info");
				}
			},
			{
				id: "plead",
				label: isAr ? "تمت المرافعة" : "Déclarer Plaidée",
				icon: /* @__PURE__ */ <Gavel size={14} />,
				onClick: () => {
					updateHearing({
						...h,
						isCompleted: true,
						status: "Attended",
						resultSummary: "Plaidée sur le fond. En attente de délibéré."
					});
					showToast(isAr ? "تم تسجيل مرافعة القضية" : "Audience plaidée avec succès", "success");
				}
			},
			{
				id: "delibere",
				label: isAr ? "حجز للمداولة" : "Mise en Délibéré",
				icon: /* @__PURE__ */ <CheckCircle2 size={14} />,
				onClick: () => {
					updateHearing({
						...h,
						postponementCode: "DELIB",
						resultSummary: "Affaire mise en délibéré pour prononcé de jugement"
					});
					showToast(isAr ? "تم حجز القضية للمداولة" : "Affaire mise en délibéré", "success");
				}
			},
			{
				id: "pin",
				label: pinnedIds.has(h.id) ? isAr ? "إلغاء التثبيت" : "Désépingler" : isAr ? "تثبيت VIP" : "Épingler VIP",
				icon: /* @__PURE__ */ <Pin size={14} />,
				onClick: () => {
					setPinnedIds((prev) => {
						const next = new Set(prev);
						if (next.has(h.id)) next.delete(h.id);
						else next.add(h.id);
						return next;
					});
				}
			},
			{
				id: "delete",
				label: isAr ? "حذف" : "Supprimer",
				icon: /* @__PURE__ */ <Trash2 size={14} />,
				variant: "danger",
				onClick: () => {
					deleteHearing(h.id);
					showToast(isAr ? "تم حذف الجلسة" : "Audience retirée du rôle", "info");
				}
			}
		];
	};
	if (showSkeleton && (hearings.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} isTimedOut={isTimedOut} onRetry={retryCloudSync} />;
	const hearingsByDate = filteredHearings.reduce<Record<string, any[]>>((acc, h) => {
		const key = h.hearingDate || "Non datée";
		if (!acc[key]) acc[key] = [];
		acc[key].push(h);
		return acc;
	}, {});
	return /* @__PURE__ */ <div className="space-y-6">
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
<div>
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-black uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white flex items-center gap-2 font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
<Scale className="text-[#d4522f]" size={32} />
<span>
{activeLegalRole === "notaire_titulaire" ? isAr ? "جدول مواعيد المحافظة العقارية والشهر" : "Conservation Foncière & Cadastre" : activeLegalRole === "expert_comptable" ? isAr ? "رزنامة التصريحات الجبائية والمحاسبية" : "Échéancier Fiscal G50 & CNAS" : activeLegalRole === "secretaire_caisse" ? isAr ? "سجل التبليغات القضائية والمحضرين" : "Huissiers de Justice & Formalités" : isAr ? "رول الجلسات ومواعيد الاستئناف CPCA" : "Rôle des Audiences & Délais CPCA"}
</span>
</h1>
</div>
<div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
<AtriumButton variant="outline" onClick={() => setIsCpcaModalOpen(true)} className="flex items-center gap-2 text-xs">
<Clock size={15} />
<span>{isAr ? "حساب ميعاد CPCA" : "Calculer Délai CPCA"}</span>
</AtriumButton>
<AtriumButton variant="primary" onClick={() => setIsNewHearingModalOpen(true)} className="flex items-center gap-2 text-xs">
<Plus size={15} />
<span>{isAr ? "برمجة جلسة جديدة" : "Nouvelle Audience"}</span>
</AtriumButton>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div className="bg-[#F3EDE7] dark:bg-neutral-900/60 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between">
<div>
<div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">{isAr ? "الجلسات المبرمجة" : "Audiences Fixées"}</div>
<div className="text-2xl font-black text-black dark:text-white mt-1 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{totalScheduled}</div>
<div className="text-[11px] text-[#d4522f] mt-1 font-medium">{isAr ? "مدرجة برول المحكمة" : "Inscrites à l'audiencier"}</div>
</div>
<div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 flex items-center justify-center text-[#d4522f] shadow-2xs"><Gavel size={22} /></div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-900/60 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between">
<div>
<div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">{isAr ? "مواعيد استئناف عاجلة" : "Délais CPCA Actifs"}</div>
<div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{totalCriticalDeadlines}</div>
<div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">{isAr ? "خطر السقوط (Loi 08-09)" : "Péremption surveillée (Art. 336)"}</div>
</div>
<div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 flex items-center justify-center text-amber-500 shadow-2xs"><Clock size={22} /></div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-900/60 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between">
<div>
<div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">{isAr ? "قضايا نوقشت / قيد المداولة" : "Affaires Plaidées & Délibérés"}</div>
<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{totalCompleted}</div>
<div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{isAr ? "في انتظار النطق بالحكم" : "En délibéré / Rendu de jugement"}</div>
</div>
<div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700 flex items-center justify-center text-emerald-500 shadow-2xs"><CheckCircle2 size={22} /></div>
</div>
</div>
<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
<div className="flex items-center gap-3 flex-1">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={isAr ? "بحث برقم القضية، المحكمة، القاضي..." : "Rechercher par dossier, juridiction, juge..."} className="flex-1 max-w-md" />
<div className="hidden sm:block">
<LiveSegmentedControl value={filterCategory} onChange={setFilterCategory} size="sm" options={[
								{
									id: "All",
									label: isAr ? "الكل" : language === "fr" ? "Tous" : "All",
									tooltip: isAr ? "جميع الجلسات القضائية" : language === "fr" ? "Toutes les audiences" : "All hearings",
									count: hearings.length
								},
								{
									id: "Scheduled",
									label: isAr ? "مبرمجة" : language === "fr" ? "Fixées" : "Scheduled",
									tooltip: isAr ? "جلسات مبرمجة" : language === "fr" ? "Audiences fixées" : "Scheduled hearings",
									count: totalScheduled
								},
								{
									id: "Postponed",
									label: isAr ? "مؤجلة" : language === "fr" ? "Renvois" : "Postponed",
									tooltip: isAr ? "جلسات مؤجلة" : language === "fr" ? "Audiences renvoyées" : "Postponed hearings",
									count: hearings.filter((h) => h.status === "Postponed").length
								},
								{
									id: "Completed",
									label: isAr ? "منتهية" : language === "fr" ? "Plaidées" : "Completed",
									tooltip: isAr ? "جلسات منتهية ومرافعات مكتملة" : language === "fr" ? "Audiences plaidées" : "Completed hearings",
									count: totalCompleted
								}
							]} />
</div>
</div>
<div className="self-end md:self-auto">
<LiveSegmentedControl value={hybridView} onChange={(val) => setHybridView(val)} size="sm" options={[{
							id: "docket",
							label: isAr ? "الجلسات" : language === "fr" ? "Rôle" : "Docket",
							tooltip: isAr ? "رول الجلسات اليومي" : language === "fr" ? "Rôle d'Audience" : "Court docket view"
						}, {
							id: "register",
							label: isAr ? "السجل" : language === "fr" ? "Registre" : "Registry",
							tooltip: isAr ? "الجدول الشامل للجلسات" : language === "fr" ? "Registre UDC complet" : "Complete UDC registry"
						}]} />
</div>
</div>
<div className="flex gap-6">
<div className="flex-1 min-w-0">
{hybridView === "docket" ? /* @__PURE__ */ <div className="space-y-6">
{Object.keys(hearingsByDate).length === 0 ? /* @__PURE__ */ <div className="p-12 text-center bg-[#F3EDE7] dark:bg-neutral-900/40 rounded-[28px] border border-dashed border-[#E2E8EC] dark:border-neutral-800">
<Gavel size={36} className="mx-auto text-black/55 dark:text-white/55 mb-3" />
<p className="text-sm font-semibold text-black/70 dark:text-white/75">
{isAr ? "لا توجد جلسات قضائية مطابقة لمعايير البحث" : "Aucune audience inscrite à l'audiencier"}
</p>
<p className="text-xs text-black/55 dark:text-white/55 mt-1">
{isAr ? "قم ببرمجة جلسة جديدة أو تعديل معايير التصفية" : "Cliquez sur \"Nouvelle Audience\" pour inscrire une date."}
</p>
</div> : Object.entries(hearingsByDate).map(([date, dateHearings]: [string, any[]]) => /* @__PURE__ */ <div key={date} className="bg-[#F3EDE7] dark:bg-neutral-900/50 rounded-[28px] p-5 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs space-y-4">
<div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800">
<div className="flex items-center gap-2">
<Calendar size={18} className="text-[#d4522f]" />
<h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider font-['Barlow_Condensed',sans-serif] rtl:font-sans">{isAr ? `جلسة يوم ${date}` : `Audience du ${date}`}</h2>
<span className="text-xs bg-[#d4522f]/15 text-[#d4522f] font-bold px-2 py-0.5 rounded-full">
{dateHearings.length}
{" "}
{isAr ? "قضايا" : "dossiers"}
</span>
</div>
<span className="text-[11px] text-black/55 dark:text-white/55 font-mono">{dateHearings[0]?.courtName}</span>
</div>
<div className="grid grid-cols-1 gap-3">
{dateHearings.map((h: any) => /* @__PURE__ */ <div key={h.id} onClick={() => setSelectedHearing(h)} className={`p-4 rounded-2xl bg-white dark:bg-neutral-800 border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${selectedHearing?.id === h.id ? "border-[#d4522f] ring-2 ring-[#d4522f]/20 shadow-sm" : "border-[#E9EEF0] dark:border-neutral-700 hover:border-[#d4522f]/50"}`}>
<div className="flex items-start gap-3 min-w-0">
<div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-600">
<span className="text-xs font-mono font-black">{h.hearingTime || "09:00"}</span>
</div>
<div className="min-w-0">
<div className="flex items-center gap-2">
<span className="font-bold text-xs text-[#d4522f] font-mono">{h.matterNumber}</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-xs font-bold text-black dark:text-white truncate">{isAr && h.matterTitleAr ? h.matterTitleAr : h.matterTitle}</span>
</div>
<div className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 flex items-center gap-2 flex-wrap">
<span>{h.courtRoom}</span>
<span>·</span>
<span>{h.chamber}</span>
<span>·</span>
<span className="font-medium text-black/70 dark:text-white/75">{h.benchJudge}</span>
</div>
<div className="text-[11px] text-black/70 dark:text-white/75 mt-1 font-medium">
{isAr ? "الهدف: " : "Démarche : "}
{" "}
{h.purpose}
</div>
</div>
</div>
<div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
{h.postponementCode && /* @__PURE__ */ <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75">{h.postponementCode}</span>}
<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${h.isCompleted ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>{h.isCompleted ? isAr ? "تمت" : "Plaidée" : isAr ? "مبرمجة" : "Fixée"}</span>
<AtriumButton variant="ghost" size="sm" onClick={(e) => {
													e.stopPropagation();
													setSelectedHearing(h);
												}} className="text-xs"><ArrowRight size={14} /></AtriumButton>
</div>
</div>)}
</div>
</div>)}
</div> : /* @__PURE__ */ <UniversalDataCollection items={filteredHearings} keyExtractor={(h) => h.id} columns={hearingColumns} defaultViewMode={viewMode} selectedIds={selectedIds} onSelectionChange={setSelectedIds} isPinned={(h) => pinnedIds.has(h.id)} onTogglePin={(h) => {
							setPinnedIds((prev) => {
								const next = new Set(prev);
								if (next.has(h.id)) next.delete(h.id);
								else next.add(h.id);
								return next;
							});
						}} sortBy={sortBy} sortDirection={sortDir} onSortChange={(key, dir) => {
							setSortBy(key);
							setSortDir(dir);
						}} onItemClick={(h) => setSelectedHearing(h)} customActions={getCustomActions} renderCard={(h, isSelected) => /* @__PURE__ */ <div className={`p-4 rounded-2xl bg-white dark:bg-neutral-800 border transition-all ${isSelected ? "border-[#d4522f] ring-2 ring-[#d4522f]/20" : "border-[#E9EEF0] dark:border-neutral-700"}`}>
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-bold text-[#d4522f] font-mono">{h.matterNumber}</span>
<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${h.isCompleted ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>{h.isCompleted ? isAr ? "تمت" : "Plaidée" : isAr ? "مبرمجة" : "Fixée"}</span>
</div>
<h3 className="text-xs font-bold text-black dark:text-white truncate">{isAr && h.matterTitleAr ? h.matterTitleAr : h.matterTitle}</h3>
<div className="text-[11px] text-black/55 dark:text-white/55 mt-2 flex items-center justify-between">
<span>{h.hearingDate}</span>
<span className="font-mono text-black/55 dark:text-white/55">{h.courtRoom}</span>
</div>
</div>} />}
</div>
{selectedHearing && /* @__PURE__ */ <aside className="w-[390px] shrink-0 bg-[#F3EDE7] dark:bg-neutral-900/70 rounded-[28px] border border-[#E6DED6] dark:border-neutral-800 p-5 space-y-5 hidden lg:block sticky top-6 self-start shadow-sm">
<div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800">
<div className="flex items-center gap-2">
<Gavel size={18} className="text-[#d4522f]" />
<h3 className="text-sm font-black text-black dark:text-white">{isAr ? "معاينة الجلسة القضائية" : "Fiche d'Audience"}</h3>
</div>
<button onClick={() => setSelectedHearing(null)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-black/55 dark:text-white/55"><X size={16} /></button>
</div>
<div className="grid grid-cols-4 gap-1 p-1 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-xl text-[10px] font-bold text-center">
<button onClick={() => setActiveInspectorTab("audience")} className={`py-1 rounded-lg transition-all ${activeInspectorTab === "audience" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/55 dark:text-white/55"}`}>{isAr ? "الجلسة" : "Audience"}</button>
<button onClick={() => setActiveInspectorTab("procedure")} className={`py-1 rounded-lg transition-all ${activeInspectorTab === "procedure" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/55 dark:text-white/55"}`}>{isAr ? "الدعوى" : "Dossier"}</button>
<button onClick={() => setActiveInspectorTab("delais")} className={`py-1 rounded-lg transition-all ${activeInspectorTab === "delais" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/55 dark:text-white/55"}`}>{isAr ? "المواعيد" : "Délais"}</button>
<button onClick={() => setActiveInspectorTab("notes")} className={`py-1 rounded-lg transition-all ${activeInspectorTab === "notes" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/55 dark:text-white/55"}`}>{isAr ? "القرارات" : "Renvoi"}</button>
</div>
{activeInspectorTab === "audience" && /* @__PURE__ */ <div className="space-y-4 text-xs">
<div>
<div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">{isAr ? "المحكمة والهيئة القضائية" : "Juridiction & Siège"}</div>
<div className="font-bold text-black dark:text-white mt-1">{selectedHearing.courtName}</div>
<div className="text-black/55 dark:text-white/55 mt-0.5">
{selectedHearing.chamber}
{" · "}
{selectedHearing.courtRoom}
</div>
</div>
<div className="grid grid-cols-2 gap-2 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700">
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">{isAr ? "تاريخ الجلسة" : "Date d'Audience"}</div>
<div className="font-bold font-mono text-black dark:text-white mt-0.5">{selectedHearing.hearingDate}</div>
</div>
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">{isAr ? "ساعة النداء" : "Heure d'Appel"}</div>
<div className="font-bold font-mono text-[#d4522f] mt-0.5">{selectedHearing.hearingTime || "09:30"}</div>
</div>
</div>
<div>
<div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">{isAr ? "القاضي رئيس الجلسة" : "Magistrat du Siège"}</div>
<div className="font-semibold text-black dark:text-white mt-1">{selectedHearing.benchJudge || "Président de Chambre"}</div>
</div>
</div>}
{activeInspectorTab === "procedure" && /* @__PURE__ */ <div className="space-y-4 text-xs">
<div>
<div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">{isAr ? "رقم القضية والموضوع" : "N° Dossier & Intitulé"}</div>
<div className="font-mono font-bold text-[#d4522f] mt-1">{selectedHearing.matterNumber}</div>
<div className="font-semibold text-black dark:text-white mt-1">
{isAr && selectedHearing.matterTitleAr ? selectedHearing.matterTitleAr : selectedHearing.matterTitle}
</div>
</div>
<div>
<div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">{isAr ? "الهدف من الجلسة" : "Démarche Procédurale"}</div>
<div className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700 mt-1 text-black/70 dark:text-white/75">{selectedHearing.purpose || "Plaidoirie sur le fond"}</div>
</div>
</div>}
{activeInspectorTab === "delais" && /* @__PURE__ */ <div className="space-y-4 text-xs">
<div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-800 dark:text-amber-300">
<div className="flex items-center gap-1.5 font-bold">
<Clock size={14} />
<span>{isAr ? "رادار المواعيد القانونية CPCA" : "Régime Péremptoire CPCA"}</span>
</div>
<p className="text-[11px] mt-1 leading-relaxed">
{isAr ? "طبقا للمادة 336 من قانون الإجراءات المدنية والإدارية، ميعاد الاستئناف محدد بـ 30 يوما مع مراعاة أيام العطل." : "Sous réserve de notification par huissier selon CPCA Art. 336 (30 jours) avec prorogation Art. 405."}
</p>
</div>
<AtriumButton variant="outline" onClick={() => setIsCpcaModalOpen(true)} className="w-full text-xs flex items-center justify-center gap-2">
<Scale size={14} />
<span>{isAr ? "فتح حاسبة الآجال" : "Calculer Délai d'Appel"}</span>
</AtriumButton>
</div>}
{activeInspectorTab === "notes" && /* @__PURE__ */ <div className="space-y-4 text-xs">
<div>
<div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">{isAr ? "قرار المحكمة ورمز التأجيل" : "Décision / Code Renvoi"}</div>
<div className="flex items-center gap-2 mt-1">
<span className="font-mono font-bold text-sm bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded text-black dark:text-white">{selectedHearing.postponementCode || "RPP"}</span>
<span className="text-black/55 dark:text-white/55">
{selectedHearing.postponementCode === "RPP" ? isAr ? "تأجيل لتبادل الوثائق" : "Renvoi pour pièces" : selectedHearing.postponementCode === "RPO" ? isAr ? "تأجيل للإدلاء بالملاحظات" : "Renvoi pour observations" : isAr ? "مداولة" : "En délibéré"}
</span>
</div>
</div>
<div>
<div className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase">{isAr ? "ملاحظات المحامي" : "Consignes & Compte-rendu"}</div>
<div className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700 mt-1 text-black/70 dark:text-white/75">{selectedHearing.resultSummary || "En attente d'audience."}</div>
</div>
</div>}
<div className="pt-3 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center gap-2">
<AtriumButton variant="primary" onClick={() => {
									updateHearing({
										...selectedHearing,
										isCompleted: true,
										status: "Attended",
										resultSummary: "Audience plaidée. Cause entendue."
									});
									showToast(isAr ? "تم تسجيل مرافعة القضية" : "Audience validée plaidée", "success");
								}} className="flex-1 text-xs">
<Check size={14} className="mr-1 inline" />
{isAr ? "تمت المرافعة" : "Plaidée"}
</AtriumButton>
<AtriumButton variant="outline" onClick={() => {
									updateHearing({
										...selectedHearing,
										postponementCode: "RPP",
										status: "Postponed",
										resultSummary: "Renvoi sollicité pour communication de nouvelles pièces"
									});
									showToast(isAr ? "تم تسجيل التأجيل (RPP)" : "Renvoi RPP accordé", "info");
								}} className="flex-1 text-xs">
<Clock size={14} className="mr-1 inline" />
{isAr ? "تأجيل RPP" : "Renvoi RPP"}
</AtriumButton>
</div>
</aside>}
</div>
<CpcaDeadlineModal isOpen={isCpcaModalOpen} onClose={() => setIsCpcaModalOpen(false)} matters={matters} onSaveDeadline={(dl) => {
					addCPCADeadline(dl);
					showToast(isAr ? "تم حفظ وحساب الميعاد الإجرائي بنجاح" : "Délai CPCA armé et synchronisé", "success");
				}} />
{isNewHearingModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-lg w-full p-6 shadow-xl border border-[#E6DED6] dark:border-neutral-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
<div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800">
<div className="flex items-center gap-2">
<Gavel size={20} className="text-[#d4522f]" />
<h3 className="text-base font-bold text-black dark:text-white">{isAr ? "برمجة جلسة جديدة برول المحكمة" : "Inscrire une Audience Judiciaire"}</h3>
</div>
<button onClick={() => setIsNewHearingModalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black/55 dark:text-white/55"><X size={18} /></button>
</div>
<form onSubmit={handleCreateHearing} className="space-y-4">
<div>
<LabelSelect label={isAr ? "ملف القضية المعنية" : "Dossier Contentieux Associé"} value={formMatterId} onChange={(val) => setFormMatterId(val)} options={matters.map((m) => ({
									value: m.id,
									label: `${m.matterNumber} - ${m.title}`
								}))} />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput label={isAr ? "تاريخ الجلسة" : "Date d'Audience"} type="date" value={formHearingDate} onChange={(e) => setFormHearingDate(e.target.value)} required />
<LabelInput label={isAr ? "ساعة النداء" : "Heure d'Appel"} type="time" value={formHearingTime} onChange={(e) => setFormHearingTime(e.target.value)} required />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput label={isAr ? "المحكمة / المجلس" : "Juridiction / Tribunal"} value={formCourtName} onChange={(e) => setFormCourtName(e.target.value)} required />
<LabelInput label={isAr ? "قاعة الجلسة" : "Salle d'Audience"} value={formCourtRoom} onChange={(e) => setFormCourtRoom(e.target.value)} required />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput label={isAr ? "الغرفة المختصة" : "Chambre / Section"} value={formChamber} onChange={(e) => setFormChamber(e.target.value)} required />
<LabelInput label={isAr ? "القاضي رئيس الجلسة" : "Président du Siège"} value={formBenchJudge} onChange={(e) => setFormBenchJudge(e.target.value)} required />
</div>
<div>
<LabelInput label={isAr ? "الهدف الإجرائي من الجلسة" : "Démarche & Objet (Plaidoirie, RPP, etc.)"} value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} required />
</div>
<div>
<LabelSelect label={isAr ? "رمز التأجيل الافتراضي" : "Code de Renvoi Initiale"} value={formPostponementCode} onChange={(val) => setFormPostponementCode(val)} options={[
									{
										value: "RPP",
										label: "RPP - Renvoi Pour Pièces"
									},
									{
										value: "RPO",
										label: "RPO - Renvoi Pour Observations"
									},
									{
										value: "DELIB",
										label: "DELIB - Mise en Délibéré"
									},
									{
										value: "JUG",
										label: "JUG - Rendu de Jugement"
									}
								]} />
</div>
<div className="pt-4 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-end gap-3">
<AtriumButton variant="outline" type="button" onClick={() => setIsNewHearingModalOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton variant="primary" type="submit">{isAr ? "تسجيل وحفظ برول المحكمة" : "Inscrire au Rôle"}</AtriumButton>
</div>
</form>
</div>
</div>}
</div>;
};
