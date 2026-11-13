import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Droplets,
  Clock,
  CheckCircle2,
  X,
  Sprout,
  Download,
  Trash2,
  Edit,
  Pin,
  Save,
  Check,
  Send,
  Activity,
  Layers,
  MapPin,
  DollarSign,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AgriTreatmentLog, AgriCropCycle, AgriCyclePhase } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { AgriCropCycleModal } from './AgriCropCycleModal';
import { AgriTreatmentModal } from './AgriTreatmentModal';
import { formatMoney } from '../../../utils/rules';
import { evaluateDarSafety } from '../../../utils/agriRules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const AgricultureCyclesView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, retryCloudSync, lastSyncedAt, showToast } = useAtriumStore();
	const isAr = language === "ar";
	const { cropCycles, treatmentLogs, parcels, addCropCycle, updateCropCycle, deleteCropCycle, addTreatmentLog, updateTreatmentLog, deleteTreatmentLog } = useAgricultureData();
	const [activeTabMode, setActiveTabMode] = React.useState("cycles");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [filterParcel, setFilterParcel] = React.useState("all");
	const [viewMode, setViewMode] = React.useState("list");
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set(["cycle_01", "treat_01"]));
	const [sortBy, setSortBy] = React.useState("sowingDate");
	const [sortDir, setSortDir] = React.useState("desc");
	const [isCycleModalOpen, setIsCycleModalOpen] = React.useState(false);
	const [cycleToEdit, setCycleToEdit] = React.useState<any>(null);
	const [isTreatmentModalOpen, setIsTreatmentModalOpen] = React.useState(false);
	const [treatmentToEdit, setTreatmentToEdit] = React.useState<any>(null);
	const [selectedCycle, setSelectedCycle] = React.useState<any>(() => cropCycles[0] || null);
	const [selectedTreatment, setSelectedTreatment] = React.useState<any>(() => treatmentLogs[0] || null);
	const [inspectorTab, setInspectorTab] = React.useState("details");
	const parcelNameMap = React.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		parcels.forEach((p) => map.set(p.id, `${p.code} - ${p.name}`));
		return map;
	}, [parcels]);
	const getPhaseConfig = (phase: any) => {
		switch (phase) {
			case "planned": return {
				label: isAr ? "مخطط (Budget)" : "Planifié",
				bg: "bg-[#F3EDE7] text-black/70 dark:bg-neutral-800 dark:text-white/75"
			};
			case "sowing": return {
				label: isAr ? "بذر / شتل" : "Semis en cours",
				bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
			};
			case "vegetative": return {
				label: isAr ? "نمو وعناية" : "En Végétation",
				bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
			};
			case "treatment_locked": return {
				label: isAr ? "حظر DAR كيميائي" : "DAR Actif (Verrouillé)",
				bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
			};
			case "ready_harvest": return {
				label: isAr ? "جاهز للحصاد" : "Prêt Récolte",
				bg: "bg-[#d4522f]/15 text-[#d4522f]"
			};
			case "closed": return {
				label: isAr ? "مكتمل ومغلق" : "Clôturé",
				bg: "bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75"
			};
			default: return {
				label: phase,
				bg: "bg-neutral-100 text-black/70 dark:text-white/75"
			};
		}
	};
	const filteredCycles = React.useMemo(() => {
		return cropCycles.filter((c) => {
			if (filterParcel !== "all" && c.parcelId !== filterParcel) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesCrop = c.cropName.toLowerCase().includes(q);
				const matchesVar = c.variety.toLowerCase().includes(q);
				const matchesParcel = (parcelNameMap.get(c.parcelId) || "").toLowerCase().includes(q);
				if (!matchesCrop && !matchesVar && !matchesParcel) return false;
			}
			return true;
		});
	}, [
		cropCycles,
		filterParcel,
		searchQuery,
		parcelNameMap
	]);
	const filteredTreatments = React.useMemo(() => {
		return treatmentLogs.filter((t) => {
			if (filterParcel !== "all" && t.parcelId !== filterParcel) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = t.commercialProductName.toLowerCase().includes(q);
				const matchesActive = t.activeIngredient.toLowerCase().includes(q);
				const matchesPest = t.targetPestDisease.toLowerCase().includes(q);
				const matchesOp = t.operatorName.toLowerCase().includes(q);
				if (!matchesName && !matchesActive && !matchesPest && !matchesOp) return false;
			}
			return true;
		});
	}, [
		treatmentLogs,
		filterParcel,
		searchQuery
	]);
	const handleOpenCreateCycle = () => {
		setCycleToEdit(null);
		setIsCycleModalOpen(true);
	};
	const handleOpenEditCycle = (cycle: any) => {
		setCycleToEdit(cycle);
		setIsCycleModalOpen(true);
	};
	const handleSaveCycle = (cycle: any) => {
		if (cycleToEdit) {
			updateCropCycle(cycle);
			if (selectedCycle?.id === cycle.id) setSelectedCycle(cycle);
			showToast(isAr ? "تم تحديث دورة المحصول" : "Cycle de culture mis à jour", "success");
		} else {
			addCropCycle(cycle);
			setSelectedCycle(cycle);
			showToast(isAr ? "تم فتح موسم المحصول الفلاحي" : "Nouveau cycle de culture enregistré", "success");
		}
		setIsCycleModalOpen(false);
	};
	const handleDeleteCycle = (cycle: any) => {
		deleteCropCycle(cycle.id);
		if (selectedCycle?.id === cycle.id) setSelectedCycle(null);
		showToast(isAr ? "تم حذف دورة المحصول" : "Cycle de culture supprimé", "info");
	};
	const handleOpenCreateTreatment = () => {
		setTreatmentToEdit(null);
		setIsTreatmentModalOpen(true);
	};
	const handleOpenEditTreatment = (t: any) => {
		setTreatmentToEdit(t);
		setIsTreatmentModalOpen(true);
	};
	const handleSaveTreatment = (treatment: any) => {
		if (treatmentToEdit) {
			updateTreatmentLog(treatment);
			if (selectedTreatment?.id === treatment.id) setSelectedTreatment(treatment);
			showToast(isAr ? "تم تحديث المعالجة في السجل" : "Traitement sanitaire mis à jour", "success");
		} else {
			addTreatmentLog(treatment);
			setSelectedTreatment(treatment);
			showToast(isAr ? "تم قيد المعالجة وتفعيل فترة الأمان DAR" : "Traitement consigné et délai DAR activé", "success");
		}
		setIsTreatmentModalOpen(false);
	};
	const handleDeleteTreatment = (t: any) => {
		deleteTreatmentLog(t.id);
		if (selectedTreatment?.id === t.id) setSelectedTreatment(null);
		showToast(isAr ? "تم حذف المعالجة" : "Traitement retiré", "info");
	};
	const handleExportCsv = () => {
		if (activeTabMode === "cycles") {
			const headers = [
				"Culture",
				"Variété",
				"Parcelle",
				"Campagne",
				"Surface Ha",
				"Semis",
				"Récolte Prévue",
				"Rendement Prévu Qtx",
				"Rendement Réalisé Qtx",
				"Phase"
			];
			const rows = filteredCycles.map((c) => [
				`"${c.cropName.replace(/"/g, "\"\"")}"`,
				`"${c.variety.replace(/"/g, "\"\"")}"`,
				`"${(parcelNameMap.get(c.parcelId) || c.parcelId).replace(/"/g, "\"\"")}"`,
				c.campaignYear,
				c.surfaceAllocatedHa,
				c.sowingDate,
				c.projectedHarvestDate,
				c.projectedYieldQtx,
				c.actualYieldQtx || 0,
				c.currentPhase
			]);
			const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
			const link = document.createElement("a");
			link.href = encodeURI(csv);
			link.download = `cycles_cultures_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
			link.click();
		} else {
			const headers = [
				"Produit",
				"Substance Active",
				"Cible",
				"Dose/ha",
				"Date Traitement",
				"DAR Jours",
				"Récolte Autorisée",
				"Applicateur"
			];
			const rows = filteredTreatments.map((t) => [
				`"${t.commercialProductName.replace(/"/g, "\"\"")}"`,
				`"${t.activeIngredient.replace(/"/g, "\"\"")}"`,
				`"${t.targetPestDisease.replace(/"/g, "\"\"")}"`,
				t.dosagePerHa,
				t.treatmentDate,
				t.darDays,
				t.harvestAllowedDate,
				`"${t.operatorName.replace(/"/g, "\"\"")}"`
			]);
			const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
			const link = document.createElement("a");
			link.href = encodeURI(csv);
			link.download = `traitements_phyto_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
			link.click();
		}
		showToast(isAr ? "تم تصدير ملف CSV" : "Export CSV généré", "info");
	};
	const totalAllocatedHa = cropCycles.reduce((acc, c) => acc + c.surfaceAllocatedHa, 0);
	const activeDarCyclesCount = cropCycles.filter((c) => c.currentPhase === "treatment_locked").length;
	const readyHarvestCount = cropCycles.filter((c) => c.currentPhase === "ready_harvest").length;
	const totalTreatmentsLogged = treatmentLogs.length;
	const cycleColumns = [
		{
			id: "crop",
			header: isAr ? "المحصول والصنف" : "Culture & Variété",
			accessorKey: "cropName",
			sortable: true,
			minWidth: "200px",
			cell: (c: any) => /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shrink-0"><Sprout size={16} /></div>
<div>
<div className="font-bold text-xs text-black dark:text-white">{c.cropName}</div>
<div className="text-[10px] text-black/55 dark:text-white/55">
{c.variety}
{" • Campagne "}
{c.campaignYear}
</div>
</div>
</div>
		},
		{
			id: "parcel",
			header: isAr ? "القطعة الفلاحية" : "Parcelle",
			accessorKey: "parcelId",
			sortable: true,
			minWidth: "160px",
			cell: (c: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75">
<div className="font-medium truncate max-w-[150px]">{parcelNameMap.get(c.parcelId) || c.parcelId}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
{c.surfaceAllocatedHa}
{" ha alloués"}
</div>
</div>
		},
		{
			id: "dates",
			header: isAr ? "رزنامة الحملة" : "Calendrier",
			accessorKey: "sowingDate",
			sortable: true,
			minWidth: "150px",
			cell: (c: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75">
<div>
{"Semis: "}
<span className="font-mono text-black dark:text-white">{c.sowingDate}</span>
</div>
<div className="text-[10px] text-black/55 dark:text-white/55">
{"Récolte: "}
<span className="font-mono">{c.projectedHarvestDate}</span>
</div>
</div>
		},
		{
			id: "yield",
			header: isAr ? "المحصول (قنطار)" : "Rendement (Qtx)",
			accessorKey: "projectedYieldQtx",
			sortable: true,
			minWidth: "140px",
			cell: (c: any) => /* @__PURE__ */ <div className="text-xs">
<div className="font-mono font-bold text-black dark:text-white">
{c.actualYieldQtx ? `${c.actualYieldQtx} / ` : ""}
{c.projectedYieldQtx}
{" Qtx"}
</div>
<div className="text-[10px] text-black/55 dark:text-white/55">
{Math.round(c.projectedYieldQtx / (c.surfaceAllocatedHa || 1))}
{" Qtx/ha"}
</div>
</div>
		},
		{
			id: "phase",
			header: isAr ? "حالة الدورة" : "Phase Actuelle",
			accessorKey: "currentPhase",
			sortable: true,
			minWidth: "150px",
			cell: (c: any) => {
				const conf = getPhaseConfig(c.currentPhase);
				return /* @__PURE__ */ <div className="flex flex-col gap-1 items-start">
<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${conf.bg}`}>{conf.label}</span>
{c.activeDarLockoutUntil && /* @__PURE__ */ <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
<AlertTriangle size={11} />
{"DAR jusqu'au "}
{c.activeDarLockoutUntil}
</span>}
</div>;
			}
		}
	];
	const treatmentColumns = [
		{
			id: "product",
			header: isAr ? "المادة والمبيد" : "Produit Commercial",
			accessorKey: "commercialProductName",
			sortable: true,
			minWidth: "180px",
			cell: (t: any) => /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold shrink-0"><ShieldCheck size={16} /></div>
<div>
<div className="font-bold text-xs text-black dark:text-white">{t.commercialProductName}</div>
<div className="text-[10px] text-black/55 dark:text-white/55">{t.activeIngredient}</div>
</div>
</div>
		},
		{
			id: "target",
			header: isAr ? "الآفة المستهدفة" : "Cible / Maladie",
			accessorKey: "targetPestDisease",
			sortable: true,
			minWidth: "160px",
			cell: (t: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75">
<div className="font-medium">{t.targetPestDisease}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
{"Dose: "}
{t.dosagePerHa}
</div>
</div>
		},
		{
			id: "parcel",
			header: isAr ? "القطعة المعالجة" : "Parcelle",
			accessorKey: "parcelId",
			sortable: true,
			minWidth: "140px",
			cell: (t: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75">{parcelNameMap.get(t.parcelId) || t.parcelId}</div>
		},
		{
			id: "dar",
			header: isAr ? "فترة الأمان DAR" : "Délai DAR & Récolte",
			accessorKey: "darDays",
			sortable: true,
			minWidth: "170px",
			cell: (t: any) => {
				const safety = evaluateDarSafety(t.treatmentDate, t.darDays);
				return /* @__PURE__ */ <div className="text-xs">
<div className="flex items-center gap-1.5">
<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${safety.isLocked ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>
{t.darDays}
{" jours DAR"}
</span>
{safety.isLocked && /* @__PURE__ */ <span className="text-[10px] text-amber-600 font-mono font-bold">
(
{safety.daysRemaining}
j restants)
</span>}
</div>
<div className="text-[10px] text-black/55 dark:text-white/55 mt-0.5">
{"Autorisé: "}
<span className="font-mono text-black/70 dark:text-white/75">{t.harvestAllowedDate}</span>
</div>
</div>;
			}
		},
		{
			id: "operator",
			header: isAr ? "المطبق المسؤول" : "Applicateur",
			accessorKey: "operatorName",
			sortable: true,
			minWidth: "140px",
			cell: (t: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75">
<div>{t.operatorName}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono">{t.treatmentDate}</div>
</div>
		}
	];
	const getCycleActions = (c: any) => [{
		label: isAr ? "تعديل الدورة" : "Modifier",
		icon: /* @__PURE__ */ <Edit size={14} />,
		onClick: () => handleOpenEditCycle(c)
	}, {
		label: isAr ? "حذف" : "Supprimer",
		icon: /* @__PURE__ */ <Trash2 size={14} />,
		variant: "danger",
		onClick: () => handleDeleteCycle(c)
	}];
	const getTreatmentActions = (t: any) => [{
		label: isAr ? "تعديل" : "Modifier",
		icon: /* @__PURE__ */ <Edit size={14} />,
		onClick: () => handleOpenEditTreatment(t)
	}, {
		label: isAr ? "حذف" : "Supprimer",
		icon: /* @__PURE__ */ <Trash2 size={14} />,
		variant: "danger",
		onClick: () => handleDeleteTreatment(t)
	}];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: cropCycles.length > 0 || treatmentLogs.length > 0
	});
	if (showSkeleton && (cropCycles.length === 0 && treatmentLogs.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.5*",
				minWidth: "140px"
			},
			{
				width: "1.2*",
				minWidth: "120px"
			},
			{
				width: "1.4*",
				minWidth: "140px"
			},
			{
				width: "1.5*",
				minWidth: "150px"
			}
		]} viewMode={viewMode} isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Sprout size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{isAr ? "المحاصيل" : language === "en" ? "Crops" : "Cultures"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d4522f]/15 text-[#d4522f]">
{cropCycles.length}
{" "}
{isAr ? "دورات" : "cycles"}
</span>
</div>
</div>
</div>
<div className="flex items-center gap-2 flex-wrap">
<AtriumButton variant="ghost" size="sm" onClick={handleExportCsv} icon={<Download size={14} />}>{isAr ? "تصدير CSV" : "Export CSV"}</AtriumButton>
{activeTabMode === "cycles" ? /* @__PURE__ */ <AtriumButton variant="primary" onClick={handleOpenCreateCycle} icon={<Plus size={14} />}>{isAr ? "دورة محصول جديدة" : "Nouveau Cycle de Culture"}</AtriumButton> : /* @__PURE__ */ <AtriumButton variant="primary" onClick={handleOpenCreateTreatment} icon={<ShieldCheck size={14} />}>{isAr ? "قيد معالجة جديدة (DAR)" : "Consigner Traitement Phyto"}</AtriumButton>}
</div>
</div>
<div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
<button type="button" onClick={() => setActiveTabMode("cycles")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTabMode === "cycles" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}>
<Sprout size={15} />
{isAr ? "دورات المحاصيل والمواسم الفلاحية" : "Cycles de Culture & Assolement"}
<span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">{cropCycles.length}</span>
</button>
<button type="button" onClick={() => setActiveTabMode("treatments")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTabMode === "treatments" ? "bg-[#d4522f] text-white shadow-xs" : "text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}>
<ShieldCheck size={15} />
{isAr ? "السجل الصحي وفترة الأمان DAR" : "Carnet Phyto & Délais DAR"}
<span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">{treatmentLogs.length}</span>
</button>
</div>
{activeDarCyclesCount > 0 && /* @__PURE__ */ <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
<AlertTriangle size={20} className="shrink-0 text-amber-600" />
<div className="flex-1">
<span className="font-bold">
{isAr ? `تنبيه أمان صحي: توجد ${activeDarCyclesCount} قطع فلاحية خاضعة لفترة الأمان الكيميائي (DAR)` : `Alerte Sanitaire : ${activeDarCyclesCount} cycle(s) sous verrouillage phytosanitaire DAR`}
</span>
<p className="text-[11px] opacity-85 mt-0.5">
{isAr ? "الجني محظور ومقفل نظامياً حتى انقضاء مدة الأمان المقررة في المعهد الوطني لحماية النباتات (INPV)." : "L’émission de bons de récolte et de pesée reste bloquée jusqu’à expiration des délais de rémanence homologués."}
</p>
</div>
</div>}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/55">{isAr ? "المساحة الإجمالية للدورات" : "Superficie Assolement Actif"}</span>
<div className="text-2xl font-bold text-black dark:text-white mt-1 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{totalAllocatedHa.toFixed(1)}
{" "}
<span className="text-xs font-normal text-black/55 dark:text-white/55">ha</span>
</div>
<p className="text-[10.5px] text-[#d4522f] mt-0.5">
{cropCycles.length}
{" "}
{isAr ? "دورات موسمية" : "cycles en exploitation"}
</p>
</div>
<div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/55">{isAr ? "جاهز للحصاد والجني" : "Cultures Prêtes pour Récolte"}</span>
<div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{readyHarvestCount}
{" "}
<span className="text-xs font-normal text-black/55 dark:text-white/55">{isAr ? "محاصيل" : "parcelles"}</span>
</div>
<p className="text-[10.5px] text-black/55 dark:text-white/55 mt-0.5">{isAr ? "تم استيفاء شروط النضج والأمان" : "Conformes pour pesée pont-bascule"}</p>
</div>
<div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/55">{isAr ? "معالجات المقيدة بالسجل" : "Traitements Phyto Enregistrés"}</span>
<div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{totalTreatmentsLogged}</div>
<p className="text-[10.5px] text-black/55 dark:text-white/55 mt-0.5">
{activeDarCyclesCount}
{" "}
{isAr ? "فترات أمان نشطة حالياً" : "DAR actifs en cours"}
</p>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
<div className="lg:col-span-8">
{activeTabMode === "cycles" ? /* @__PURE__ */ <UniversalDataCollection data={filteredCycles} columns={cycleColumns} keyExtractor={(c) => c.id} searchQuery={searchQuery} onSearchChange={setSearchQuery} viewMode={viewMode} onViewModeChange={setViewMode} selectedIds={selectedIds} onSelectionChange={setSelectedIds} bulkSecondaryAction={{
							label: isAr ? "تصدير الدورات" : "Exporter Cycles",
							icon: /* @__PURE__ */ <Download size={14} />,
							onClick: (ids: any) => {
								showToast(isAr ? `تم تصدير ${ids.size} دورات زراعية` : `${ids.size} cycles culturaux exportés`);
							}
						}} onBulkDelete={(ids) => {
							ids.forEach((id) => deleteCropCycle(id));
							setSelectedIds(/* @__PURE__ */ new Set());
							if (selectedCycle && ids.has(selectedCycle.id)) setSelectedCycle(null);
							showToast(isAr ? "تم حذف الدورات المحددة" : "Cycles sélectionnés supprimés");
						}} pinnedIds={pinnedIds} onPinToggle={(c) => {
							const id = typeof c === "string" ? c : c.id;
							const next = new Set(pinnedIds);
							if (next.has(id)) next.delete(id);
							else next.add(id);
							setPinnedIds(next);
						}} sortBy={sortBy} sortDir={sortDir} onSortChange={(field, dir) => {
							setSortBy(field);
							setSortDir(dir);
						}} onItemClick={(c) => setSelectedCycle(c)} customActions={(c) => getCycleActions(c)} emptyTitle={isAr ? "لا توجد دورات محاصيل مسجلة" : "Aucun cycle de culture enregistré"} renderGridCard={(c) => /* @__PURE__ */ <div key={c.id} onClick={() => setSelectedCycle(c)} className={`p-4 rounded-2xl border transition cursor-pointer relative space-y-3 ${selectedCycle?.id === c.id ? "border-[#d4522f] bg-[#d4522f]/5" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300"}`}>
<div className="flex items-start justify-between">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Sprout size={16} /></div>
<div>
<h3 className="text-xs font-bold text-black dark:text-white">{c.cropName}</h3>
<p className="text-[10px] text-black/55 dark:text-white/55">
{c.variety}
{" • Campagne "}
{c.campaignYear}
</p>
</div>
</div>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPhaseConfig(c.currentPhase).bg}`}>{getPhaseConfig(c.currentPhase).label}</span>
</div>
<div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-neutral-100 dark:border-neutral-800">
<div>
<span className="text-black/55 dark:text-white/55">{"Surface: "}</span>
<span className="font-mono font-bold text-black/70 dark:text-white/75">
{c.surfaceAllocatedHa}
{" ha"}
</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55">{"Prévu: "}</span>
<span className="font-mono font-bold text-black/70 dark:text-white/75">
{c.projectedYieldQtx}
{" Qtx"}
</span>
</div>
</div>
{c.activeDarLockoutUntil && /* @__PURE__ */ <div className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1 font-medium">
<AlertTriangle size={12} />
{"DAR actif jusqu’au "}
{c.activeDarLockoutUntil}
</div>}
</div>} /> : /* @__PURE__ */ <UniversalDataCollection data={filteredTreatments} columns={treatmentColumns} keyExtractor={(t) => t.id} searchQuery={searchQuery} onSearchChange={setSearchQuery} viewMode={viewMode} onViewModeChange={setViewMode} selectedIds={selectedIds} onSelectionChange={setSelectedIds} bulkSecondaryAction={{
							label: isAr ? "تصدير السجل الصحي" : "Exporter Traitements",
							icon: /* @__PURE__ */ <Download size={14} />,
							onClick: (ids: any) => {
								showToast(isAr ? `تم تصدير ${ids.size} معالجات صحية` : `${ids.size} traitements phytosanitaires exportés`);
							}
						}} onBulkDelete={(ids) => {
							ids.forEach((id) => deleteTreatmentLog(id));
							setSelectedIds(/* @__PURE__ */ new Set());
							if (selectedTreatment && ids.has(selectedTreatment.id)) setSelectedTreatment(null);
							showToast(isAr ? "تم حذف المعالجات المحددة" : "Traitements sélectionnés supprimés");
						}} pinnedIds={pinnedIds} onPinToggle={(t) => {
							const id = typeof t === "string" ? t : t.id;
							const next = new Set(pinnedIds);
							if (next.has(id)) next.delete(id);
							else next.add(id);
							setPinnedIds(next);
						}} sortBy={sortBy} sortDir={sortDir} onSortChange={(field, dir) => {
							setSortBy(field);
							setSortDir(dir);
						}} onItemClick={(t) => setSelectedTreatment(t)} customActions={(t) => getTreatmentActions(t)} emptyTitle={isAr ? "لا توجد معالجات مسجلة" : "Aucun traitement phytosanitaire consigné"} />}
</div>
<div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
{activeTabMode === "cycles" ? selectedCycle ? /* @__PURE__ */ <div className="space-y-4">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Sprout size={16} /></div>
<div>
<h2 className="text-xs font-bold text-black dark:text-white">{selectedCycle.cropName}</h2>
<p className="text-[10px] text-black/55 dark:text-white/55">
{selectedCycle.variety}
{" • Campagne "}
{selectedCycle.campaignYear}
</p>
</div>
</div>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPhaseConfig(selectedCycle.currentPhase).bg}`}>{getPhaseConfig(selectedCycle.currentPhase).label}</span>
</div>
<div className="flex border-b border-neutral-200 dark:border-neutral-800 text-xs">
<button type="button" onClick={() => setInspectorTab("details")} className={`pb-2 px-2 font-bold border-b-2 transition ${inspectorTab === "details" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55"}`}>{isAr ? "البيانات" : "Détails"}</button>
<button type="button" onClick={() => setInspectorTab("rendement")} className={`pb-2 px-2 font-bold border-b-2 transition ${inspectorTab === "rendement" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55"}`}>{isAr ? "المردود" : "Rendement"}</button>
<button type="button" onClick={() => setInspectorTab("couts")} className={`pb-2 px-2 font-bold border-b-2 transition ${inspectorTab === "couts" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55"}`}>{isAr ? "التكاليف" : "Coûts"}</button>
</div>
{inspectorTab === "details" && /* @__PURE__ */ <div className="space-y-3 text-xs">
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Parcelle:</span>
<span className="font-semibold text-black dark:text-white">{parcelNameMap.get(selectedCycle.parcelId) || selectedCycle.parcelId}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Surface Allouée:</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedCycle.surfaceAllocatedHa}
{" ha"}
</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Lot Semence:</span>
<span className="font-mono text-black/70 dark:text-white/75">{selectedCycle.seedLotNumber || "CCLS-Standard"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Date Semis:</span>
<span className="font-mono text-black/70 dark:text-white/75">{selectedCycle.sowingDate}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Récolte Prévue:</span>
<span className="font-mono text-black/70 dark:text-white/75">{selectedCycle.projectedHarvestDate}</span>
</div>
</div>
{selectedCycle.activeDarLockoutUntil && /* @__PURE__ */ <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
<AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
<div>
<div className="font-bold">Interdiction de récolte active</div>
<div className="text-[11px] opacity-80 mt-0.5">
{selectedCycle.activePestWarning || `DAR jusqu'au ${selectedCycle.activeDarLockoutUntil}`}
</div>
</div>
</div>}
</div>}
{inspectorTab === "rendement" && /* @__PURE__ */ <div className="space-y-3 text-xs">
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2.5">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Objectif Prévu:</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedCycle.projectedYieldQtx}
{" Qtx"}
</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Réalisé:</span>
<span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
{selectedCycle.actualYieldQtx || 0}
{" Qtx"}
</span>
</div>
<div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
<div className="bg-[#d4522f] h-full" style={{ width: `${Math.min(100, Math.round((selectedCycle.actualYieldQtx || 0) / (selectedCycle.projectedYieldQtx || 1) * 100))}%` }} />
</div>
<div className="text-[10.5px] text-black/55 dark:text-white/55 text-right">
Taux de réalisation :
{" "}
{Math.round((selectedCycle.actualYieldQtx || 0) / (selectedCycle.projectedYieldQtx || 1) * 100)}
%
</div>
</div>
</div>}
{inspectorTab === "couts" && /* @__PURE__ */ <div className="space-y-3 text-xs">
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Intrants & Semences:</span>
<span className="font-mono text-black dark:text-white">{formatMoney(selectedCycle.totalInputCostDzd || 0)}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Main d'œuvre Tâcherons:</span>
<span className="font-mono text-black dark:text-white">{formatMoney(selectedCycle.totalLaborCostDzd || 0)}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Matériel & Carburant:</span>
<span className="font-mono text-black dark:text-white">{formatMoney(selectedCycle.totalMachineryCostDzd || 0)}</span>
</div>
<div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between font-bold">
<span>Total Coûts Engagés:</span>
<span className="font-mono text-[#d4522f]">
{formatMoney((selectedCycle.totalInputCostDzd || 0) + (selectedCycle.totalLaborCostDzd || 0) + (selectedCycle.totalMachineryCostDzd || 0))}
</span>
</div>
</div>
</div>}
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
<AtriumButton variant="outline" size="sm" className="w-full" onClick={() => handleOpenEditCycle(selectedCycle)} icon={<Edit size={13} />}>{isAr ? "تعديل الدورة" : "Modifier le Cycle"}</AtriumButton>
</div>
</div> : /* @__PURE__ */ <div className="text-center py-10 text-black/55 dark:text-white/55 text-xs">
{isAr ? "حدد دورة محصول لمعاينة التفاصيل" : "Sélectionnez un cycle pour afficher l’inspecteur"}
</div> : selectedTreatment ? /* @__PURE__ */ <div className="space-y-4">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold"><ShieldCheck size={16} /></div>
<div>
<h2 className="text-xs font-bold text-black dark:text-white">{selectedTreatment.commercialProductName}</h2>
<p className="text-[10px] text-black/55 dark:text-white/55">{selectedTreatment.activeIngredient}</p>
</div>
</div>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
{selectedTreatment.darDays}
j DAR
</span>
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2 text-xs">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Cible / Maladie:</span>
<span className="font-semibold text-black dark:text-white">{selectedTreatment.targetPestDisease}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Parcelle:</span>
<span className="text-black dark:text-white">{parcelNameMap.get(selectedTreatment.parcelId) || selectedTreatment.parcelId}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Dose appliquée:</span>
<span className="font-mono font-semibold">{selectedTreatment.dosagePerHa}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Date Application:</span>
<span className="font-mono">{selectedTreatment.treatmentDate}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Récolte Autorisée:</span>
<span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedTreatment.harvestAllowedDate}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Applicateur:</span>
<span>{selectedTreatment.operatorName}</span>
</div>
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-xs space-y-1">
<span className="text-black/55 dark:text-white/55 font-medium">Consignes & Météo:</span>
<p className="text-black/70 dark:text-white/75 italic text-[11px]">
"
{selectedTreatment.notes || "Aucune observation particulière."}
"
</p>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
<AtriumButton variant="outline" size="sm" className="w-full" onClick={() => handleOpenEditTreatment(selectedTreatment)} icon={<Edit size={13} />}>{isAr ? "تعديل المعالجة" : "Modifier le Traitement"}</AtriumButton>
</div>
</div> : /* @__PURE__ */ <div className="text-center py-10 text-black/55 dark:text-white/55 text-xs">
{isAr ? "حدد معالجة لمعاينة التفاصيل" : "Sélectionnez un traitement pour afficher l’inspecteur"}
</div>}
</div>
</div>
<AgriCropCycleModal isOpen={isCycleModalOpen} onClose={() => setIsCycleModalOpen(false)} onSave={handleSaveCycle} cycleToEdit={cycleToEdit} parcels={parcels} />
<AgriTreatmentModal isOpen={isTreatmentModalOpen} onClose={() => setIsTreatmentModalOpen(false)} onSave={handleSaveTreatment} logToEdit={treatmentToEdit} parcels={parcels} cropCycles={cropCycles} />
</div>;
};
