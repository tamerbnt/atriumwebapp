import React, { useState, useMemo } from 'react';
import {
  Clock,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  HeartPulse,
  Eye,
  Plus,
  Pin,
  X,
  CreditCard,
  FileText,
  Printer,
  Phone,
  LayoutGrid,
  List,
  Activity,
  Tv,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { MedicalConsultation } from '../../../types';
import { useMedicalData } from './medicalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { MedicalConsultationModal } from './MedicalConsultationModal';
import { MedicalWaitingRoomTvModal } from './MedicalWaitingRoomTvModal';
import { MedicalAgendaView } from './MedicalAgendaView';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const MedicalQueueView: React.FC<any> = () => {
	const { language, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { consultations, patients, practitioners, updateConsultationStatus, markConsultationPaid, addConsultation } = useMedicalData();
	const [activeSubView, setActiveSubView] = React.useState("queue");
	const [isTvModalOpen, setIsTvModalOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState("all");
	const [displayLayout, setDisplayLayout] = React.useState("collection");
	const [viewMode, setViewMode] = React.useState("list");
	const [sortBy, setSortBy] = React.useState("consultationDate");
	const [sortDir, setSortDir] = React.useState("desc");
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedIds, setPinnedIds] = React.useState(/* @__PURE__ */ new Set(["cons_01"]));
	const [selectedConsultation, setSelectedConsultation] = React.useState<any>(() => consultations[0] || null);
	const [activeInspectorTab, setActiveInspectorTab] = React.useState("fiche");
	const [isConsultModalOpen, setIsConsultModalOpen] = React.useState(false);
	const [quickNote, setQuickNote] = React.useState("");
	const [noteSaved, setNoteSaved] = React.useState(false);
	const filtered = React.useMemo(() => {
		return consultations.filter((c) => {
			const q = searchQuery.toLowerCase();
			if (!(c.patientName.toLowerCase().includes(q) || c.chiefComplaint.toLowerCase().includes(q) || c.diagnosis && c.diagnosis.toLowerCase().includes(q))) return false;
			if (statusFilter === "waiting") return c.status === "InWaitingQueue";
			if (statusFilter === "in_progress") return c.status === "InConsultation";
			if (statusFilter === "completed") return c.status === "Completed";
			return true;
		});
	}, [
		consultations,
		searchQuery,
		statusFilter
	]);
	const queueCounts = React.useMemo(() => ({
		all: consultations.length,
		waiting: consultations.filter((c) => c.status === "InWaitingQueue").length,
		in_progress: consultations.filter((c) => c.status === "InConsultation").length,
		completed: consultations.filter((c) => c.status === "Completed").length
	}), [consultations]);
	const sortedConsultations = React.useMemo(() => {
		const list = [...filtered];
		list.sort((a, b) => {
			const isPinnedA = pinnedIds.has(a.id);
			const isPinnedB = pinnedIds.has(b.id);
			if (isPinnedA && !isPinnedB) return -1;
			if (!isPinnedA && isPinnedB) return 1;
			if (sortBy === "consultationDate") return sortDir === "asc" ? a.consultationDate.localeCompare(b.consultationDate) : b.consultationDate.localeCompare(a.consultationDate);
			if (sortBy === "patientName") return sortDir === "asc" ? a.patientName.localeCompare(b.patientName) : b.patientName.localeCompare(a.patientName);
			if (sortBy === "consultationFeeDzd") return sortDir === "asc" ? a.consultationFeeDzd - b.consultationFeeDzd : b.consultationFeeDzd - a.consultationFeeDzd;
			return 0;
		});
		return list;
	}, [
		filtered,
		pinnedIds,
		sortBy,
		sortDir
	]);
	const waitingCount = consultations.filter((c) => c.status === "InWaitingQueue").length;
	const inProgressCount = consultations.filter((c) => c.status === "InConsultation").length;
	const completedCount = consultations.filter((c) => c.status === "Completed").length;
	const handleTogglePin = (id: any) => {
		setPinnedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		showToast(pinnedIds.has(id) ? isAr ? "تم إلغاء التثبيت" : "Priorité retirée" : isAr ? "تم تثبيت أولوية المريض" : "Patient priorisé en tête de file", "info");
	};
	const handleStartExam = (c: any) => {
		updateConsultationStatus(c.id, "InConsultation");
		setSelectedConsultation({
			...c,
			status: "InConsultation"
		});
		showToast(isAr ? "تم استدعاء المريض لغرفة الكشف" : "Patient appelé au cabinet de consultation", "info");
	};
	const handleFinishExam = (c: any) => {
		updateConsultationStatus(c.id, "Completed");
		setSelectedConsultation({
			...c,
			status: "Completed"
		});
		showToast(isAr ? "تم إنهاء وتأكيد الفحص الطبي" : "Consultation clôturée avec succès", "success");
	};
	const handleSaveNote = () => {
		if (!quickNote.trim()) return;
		setNoteSaved(true);
		setTimeout(() => setNoteSaved(false), 2e3);
		showToast(isAr ? "تم حفظ الملاحظة السريرية" : "Observation clinique enregistrée", "success");
	};
	const columns = [
		{
			key: "patientName",
			header: isAr ? "المريض / الشكوى" : "Patient & Motif",
			sortable: true,
			minWidth: "220px",
			renderCell: (c: any) => {
				const isPinned = pinnedIds.has(c.id);
				return /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-orange-100 dark:border-neutral-800">{c.patientName.charAt(0).toUpperCase()}</div>
<div className="min-w-0">
<div className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
{c.patientName}
{isPinned && /* @__PURE__ */ <span className="text-xs text-amber-500">📌</span>}
</div>
<div className="text-[11px] text-black/55 dark:text-white/75 truncate max-w-[180px]">{c.chiefComplaint}</div>
</div>
</div>;
			}
		},
		{
			key: "vitals",
			header: isAr ? "العلامات الحيوية" : "Constantes Vitales",
			minWidth: "180px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-mono text-[11px] font-semibold">{c.vitals?.bloodPressure || "120/80"}</span>
<span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-mono text-[11px]">{c.vitals?.temperatureCelsius ? `${c.vitals.temperatureCelsius}°C` : "37°C"}</span>
<span className="text-[11px] text-black/55 dark:text-white/55 font-mono">{c.vitals?.weightKg ? `${c.vitals.weightKg}kg` : ""}</span>
</div>
		},
		{
			key: "status",
			header: isAr ? "حالة الدور" : "Statut Triage",
			sortable: true,
			minWidth: "130px",
			renderCell: (c: any) => /* @__PURE__ */ <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.status === "InWaitingQueue" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" : c.status === "InConsultation" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300" : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
{c.status === "InConsultation" && /* @__PURE__ */ <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
{c.status === "InWaitingQueue" ? isAr ? "في الانتظار" : "En attente" : c.status === "InConsultation" ? isAr ? "في الفحص" : "En consultation" : isAr ? "مكتمل" : "Terminé"}
</span>
		},
		{
			key: "consultationFeeDzd",
			header: isAr ? "الأتعاب DZD" : "Honoraires",
			sortable: true,
			minWidth: "120px",
			renderCell: (c: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-black dark:text-white">{formatMoney(c.consultationFeeDzd, "DZD")}</div>
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: consultations.length > 0
	});
	if (showSkeleton && (consultations.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2*",
				minWidth: "140px"
			},
			{
				width: "2*",
				minWidth: "140px"
			},
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Clock size={20} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">{isAr ? "قائمة الانتظار والفرز السريري" : "File d'Attente & Triage Clinique"}</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
{waitingCount}
{" "}
{isAr ? "في الانتظار" : "en attente"}
</span>
</div>
</div>
</div>
<div className="flex flex-wrap items-center gap-2">
<div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
<button type="button" onClick={() => setActiveSubView("queue")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubView === "queue" ? "bg-white dark:bg-neutral-700 text-[#0D9488] shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>
<Clock size={13} />
<span>{isAr ? "قائمة الفرز والانتظار" : "File de Triage"}</span>
</button>
<button type="button" onClick={() => setActiveSubView("agenda")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubView === "agenda" ? "bg-white dark:bg-neutral-700 text-[#0D9488] shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>
<Calendar size={13} />
<span>{isAr ? "أجندة المواعيد" : "Agenda Multi-Médecins"}</span>
</button>
</div>
<AtriumButton variant="secondary" onClick={() => setIsTvModalOpen(true)} icon={<Tv size={14} className="text-[#0D9488]" />}>Écran TV Salle d'Attente</AtriumButton>
{activeSubView === "queue" && /* @__PURE__ */ <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
<button type="button" onClick={() => setDisplayLayout("collection")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${displayLayout === "collection" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "الجدول والبطاقات" : "Registre"}</button>
<button type="button" onClick={() => setDisplayLayout("visual_queue")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${displayLayout === "visual_queue" ? "bg-white dark:bg-neutral-700 text-[#d4522f] shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "لوحة الانتظار" : "File Visuelle"}</button>
</div>}
<AtriumButton variant="primary" onClick={() => setIsConsultModalOpen(true)} icon={<Plus size={14} />}>{isAr ? "قبول مريض جديد" : "Admettre un Patient"}</AtriumButton>
</div>
</div>
{activeSubView === "agenda" ? /* @__PURE__ */ <MedicalAgendaView /> : /* @__PURE__ */ <>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "مؤشرات تدفق المرضى وأوقات الانتظار" : "Flux Salle d'Attente & Triage des Urgences"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "مرضى في الانتظار" : "Patients en Salle d'Attente"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{waitingCount}</div>
<p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Priorité selon ordre d'admission</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "حالياً في الفحص" : "En Examen Médical"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{inProgressCount}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">Cabinet de consultation actif</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "إجمالي الفحوصات" : "Prise en Charge Clinique"}</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">SLA & TRIAGE</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{completedCount}
{" / "}
{consultations.length}
</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>Consultations clôturées avec succès</span>
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2">
<HeartPulse size={16} className="text-black/55 dark:text-white/55" />
<span className="text-sm font-bold text-black dark:text-white">{isAr ? "سجل الاستشارات والفرز" : "Registre des Consultations & Triage"}</span>
<span className="text-xs text-black/55 dark:text-white/55 font-semibold tabular-nums ml-1">{sortedConsultations.length}</span>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={isAr ? "بحث عن مريض أو تشخيص..." : "Rechercher patient ou motif..."} shutSize={36} openWidth={220} />
<LiveSegmentedControl size="sm" value={statusFilter} onValueChange={(val) => setStatusFilter(val)} options={[
								{
									value: "all",
									label: isAr ? "الكل" : language === "fr" ? "Tous" : "All",
									tooltip: isAr ? "جميع المرضى في قائمة الانتظار" : language === "fr" ? "Tous les patients du jour" : "All patients today",
									count: queueCounts.all
								},
								{
									value: "waiting",
									label: isAr ? "منتظر" : language === "fr" ? "Attente" : "Waiting",
									tooltip: isAr ? "في قاعة الانتظار" : language === "fr" ? "En salle d'attente" : "In waiting room",
									count: queueCounts.waiting
								},
								{
									value: "in_progress",
									label: isAr ? "فحص" : language === "fr" ? "Consultation" : "Exam",
									tooltip: isAr ? "في الفحص الطبي حالياً" : language === "fr" ? "En consultation médicale" : "Currently in consultation",
									count: queueCounts.in_progress
								},
								{
									value: "completed",
									label: isAr ? "مكتمل" : language === "fr" ? "Clôturés" : "Done",
									tooltip: isAr ? "استشارات مكتملة" : language === "fr" ? "Consultations clôturées" : "Completed consultations",
									count: queueCounts.completed
								}
							]} aria-label="Medical Triage Filter" />
</div>
</div>
<div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
{displayLayout === "collection" ? /* @__PURE__ */ <UniversalDataCollection items={sortedConsultations} keyExtractor={(c) => c.id} defaultViewMode={viewMode} columns={columns} sortBy={sortBy} sortDirection={sortDir} onSortChange={(key) => {
								if (sortBy === key) setSortDir((prev) => prev === "asc" ? "desc" : "asc");
								else {
									setSortBy(key);
									setSortDir("asc");
								}
							}} selectedIds={selectedIds} onSelectionChange={setSelectedIds} isPinned={(c) => pinnedIds.has(c.id)} onTogglePin={(c) => handleTogglePin(c.id)} onItemClick={(c) => setSelectedConsultation(c)} customActions={(c) => [{
								id: "exam",
								label: c.status === "InWaitingQueue" ? isAr ? "بدء الفحص" : "Consulter" : isAr ? "إنهاء" : "Clôturer",
								icon: /* @__PURE__ */ <Stethoscope size={13} />,
								variant: "primary",
								onClick: () => {
									if (c.status === "InWaitingQueue") handleStartExam(c);
									else handleFinishExam(c);
								}
							}, {
								id: "fiche",
								label: isAr ? "الملف" : "Fiche",
								icon: /* @__PURE__ */ <Eye size={13} />,
								onClick: () => setSelectedConsultation(c)
							}]} renderCard={(c) => {
								const isPinned = pinnedIds.has(c.id);
								return /* @__PURE__ */ <div className="flex flex-col w-full space-y-3">
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-black dark:text-white truncate">
{c.patientName}
{" "}
{isPinned && "📌"}
</span>
<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "InWaitingQueue" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : c.status === "InConsultation" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"}`}>
{c.status === "InWaitingQueue" ? "Attente" : c.status === "InConsultation" ? "En cours" : "Terminé"}
</span>
</div>
<div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-1 text-center text-xs font-mono">
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">TA</div>
<div className="font-bold text-black dark:text-white">{c.vitals?.bloodPressure || "N/A"}</div>
</div>
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">Temp</div>
<div className="font-bold text-black dark:text-white">{c.vitals?.temperatureCelsius ? `${c.vitals.temperatureCelsius}°` : "37°"}</div>
</div>
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">Poids</div>
<div className="font-bold text-black dark:text-white">{c.vitals?.weightKg ? `${c.vitals.weightKg}k` : "N/A"}</div>
</div>
</div>
<div className="text-xs text-black/55 dark:text-white/55 line-clamp-1">{c.chiefComplaint}</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
<span className="font-mono font-bold text-xs text-[#d4522f]">{formatMoney(c.consultationFeeDzd, "DZD")}</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{c.consultationDate.split("T")[0]}</span>
</div>
</div>;
							}} emptyTitle={isAr ? "لا توجد استشارات مطابقة" : "Aucune consultation trouvée"} emptyDescription={isAr ? "قم بقبول مريض جديد للبدء" : "Admettez un premier patient en salle d'attente"} primaryActionLabel={isAr ? "قبول مريض" : "Admettre un patient"} onAddFirstItem={() => setIsConsultModalOpen(true)} /> : /* @__PURE__ */ <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
{sortedConsultations.map((cons, index) => /* @__PURE__ */ <div key={cons.id} onClick={() => setSelectedConsultation(cons)} className={`bg-white dark:bg-neutral-800 rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all cursor-pointer ${selectedConsultation?.id === cons.id ? "border-[#d4522f] ring-2 ring-[#d4522f]/30" : cons.status === "InConsultation" ? "border-blue-400 ring-1 ring-blue-400/30" : "border-[#E9EEF0] dark:border-neutral-700/60 hover:border-neutral-300"}`}>
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 text-xs font-bold flex items-center justify-center text-black/70 dark:text-white/75">
#
{index + 1}
</span>
<span className="text-xs font-bold text-black dark:text-white truncate max-w-[140px]">{cons.patientName}</span>
</div>
<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cons.status === "InWaitingQueue" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : cons.status === "InConsultation" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"}`}>
{cons.status === "InWaitingQueue" ? "Attente" : cons.status === "InConsultation" ? "En cours" : "Terminé"}
</span>
</div>
<div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-1 text-center text-xs font-mono border border-neutral-100 dark:border-neutral-700/40">
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">TA</div>
<div className="font-bold text-black dark:text-white">{cons.vitals?.bloodPressure || "N/A"}</div>
</div>
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">Temp</div>
<div className="font-bold text-black dark:text-white">
{cons.vitals?.temperatureCelsius ? `${cons.vitals.temperatureCelsius}°C` : "N/A"}
</div>
</div>
<div>
<div className="text-[10px] text-black/55 dark:text-white/55">Poids</div>
<div className="font-bold text-black dark:text-white">{cons.vitals?.weightKg ? `${cons.vitals.weightKg}kg` : "N/A"}</div>
</div>
</div>
<div className="text-xs text-black/70 dark:text-white/75 truncate">
<span className="font-medium text-black/55 dark:text-white/55 mr-1">Motif:</span>
{cons.chiefComplaint}
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
<span className="text-xs font-mono font-bold text-[#d4522f]">{formatMoney(cons.consultationFeeDzd, "DZD")}</span>
<button type="button" onClick={(e) => {
												e.stopPropagation();
												if (cons.status === "InWaitingQueue") handleStartExam(cons);
												else handleFinishExam(cons);
											}} className="px-2.5 py-1 rounded-lg bg-[#d4522f] text-white text-[11px] font-semibold hover:bg-[#b0674b] transition-colors cursor-pointer">
{cons.status === "InWaitingQueue" ? "Appeler" : cons.status === "InConsultation" ? "Clôturer" : "Revoir"}
</button>
</div>
</div>)}
</div>}
</div>
{selectedConsultation && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-800/60 flex items-center justify-between">
<div className="flex items-center gap-3 min-w-0">
<div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#d4522f] font-bold text-sm flex items-center justify-center shrink-0 border border-orange-200/60"><Stethoscope size={18} /></div>
<div className="min-w-0">
<h3 className="font-bold text-sm text-black dark:text-white truncate">{selectedConsultation.patientName}</h3>
<div className="flex items-center gap-1.5 text-xs text-black/55 dark:text-white/55">
<span className="font-mono">
{"Réf: "}
{selectedConsultation.id}
</span>
</div>
</div>
</div>
<button type="button" onClick={() => setSelectedConsultation(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"><X size={16} /></button>
</div>
<div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-4 bg-white dark:bg-neutral-850 text-xs">
<button type="button" onClick={() => setActiveInspectorTab("fiche")} className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${activeInspectorTab === "fiche" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "الفحص" : "Fiche"}</button>
<button type="button" onClick={() => setActiveInspectorTab("vitals")} className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${activeInspectorTab === "vitals" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "العلامات" : "Constantes"}</button>
<button type="button" onClick={() => setActiveInspectorTab("finance")} className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${activeInspectorTab === "finance" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "الأتعاب" : "Honoraires"}</button>
<button type="button" onClick={() => setActiveInspectorTab("actions")} className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${activeInspectorTab === "actions" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{isAr ? "الإجراءات" : "Actions"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4">
{activeInspectorTab === "fiche" && /* @__PURE__ */ <div className="space-y-4 text-xs animate-in fade-in duration-150">
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
<span className="text-[10px] font-bold text-black/55 dark:text-white/55">MOTIF DE CONSULTATION</span>
<p className="text-black dark:text-white font-medium text-xs">{selectedConsultation.chiefComplaint}</p>
</div>
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
<span className="text-[10px] font-bold text-black/55 dark:text-white/55">DIAGNOSTIC / EXAMEN CLINIQUE</span>
<p className="text-black dark:text-white">
{selectedConsultation.diagnosis || selectedConsultation.clinicalExam || "Examen clinique en cours de documentation."}
</p>
</div>
<div className="space-y-2">
<label className="text-[11px] font-semibold text-black/70 dark:text-white/75">{isAr ? "ملاحظة الطبيب الفورية" : "Note d'observation immédiate"}</label>
<textarea rows={3} value={quickNote} onChange={(e) => setQuickNote(e.target.value)} placeholder="Ajouter une consigne ou observation..." className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-[#d4522f]" />
<div className="flex justify-end">
<AtriumButton size="xs" variant="primary" onClick={handleSaveNote}>{noteSaved ? "Enregistré ✓" : "Sauvegarder note"}</AtriumButton>
</div>
</div>
</div>}
{activeInspectorTab === "vitals" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="grid grid-cols-2 gap-2.5">
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold">TENSION ARTÉRIELLE</span>
<div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">{selectedConsultation.vitals?.bloodPressure || "120/80"}</div>
<span className="text-[10px] text-emerald-600 font-medium">Normotendu</span>
</div>
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold">TEMPÉRATURE</span>
<div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">
{selectedConsultation.vitals?.temperatureCelsius ? `${selectedConsultation.vitals.temperatureCelsius}°C` : "37.0°C"}
</div>
<span className="text-[10px] text-black/55 dark:text-white/55">Apyrétique</span>
</div>
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold">POIDS / TAILLE</span>
<div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">
{selectedConsultation.vitals?.weightKg ? `${selectedConsultation.vitals.weightKg} kg` : "72 kg"}
</div>
<span className="text-[10px] text-black/55 dark:text-white/55">
{"IMC: "}
{selectedConsultation.vitals?.bmi || "23.5"}
</span>
</div>
<div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 font-bold">FRÉQUENCE CARDIAQUE</span>
<div className="font-mono text-base font-bold text-black dark:text-white mt-0.5">
{selectedConsultation.vitals?.heartRateBpm ? `${selectedConsultation.vitals.heartRateBpm} bpm` : "74 bpm"}
</div>
<span className="text-[10px] text-black/55 dark:text-white/55">Pouls régulier</span>
</div>
</div>
</div>}
{activeInspectorTab === "finance" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="p-4 rounded-xl bg-orange-50/60 dark:bg-neutral-800 border border-orange-100 dark:border-neutral-700 space-y-3">
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Honoraires conventionnés:</span>
<span className="font-mono font-bold text-sm text-[#d4522f]">{formatMoney(selectedConsultation.consultationFeeDzd, "DZD")}</span>
</div>
<div className="flex items-center justify-between text-black/70 dark:text-white/75">
<span>Ticket modérateur patient:</span>
<span className="font-mono font-semibold">{formatMoney(selectedConsultation.copayAmountDzd || 600, "DZD")}</span>
</div>
<div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
<span>Prise en charge CNAS/Chifa:</span>
<span className="font-mono font-semibold">{formatMoney(selectedConsultation.insuranceShareDzd || 2400, "DZD")}</span>
</div>
<div className="pt-2 border-t border-orange-200/60 dark:border-neutral-700 flex items-center justify-between font-bold">
<span>Statut encaissement:</span>
<span className={selectedConsultation.isPaid ? "text-emerald-600" : "text-amber-600"}>{selectedConsultation.isPaid ? "Réglé ✓" : "En attente de paiement"}</span>
</div>
</div>
{!selectedConsultation.isPaid && /* @__PURE__ */ <AtriumButton variant="primary" onClick={() => {
												markConsultationPaid(selectedConsultation.id);
												setSelectedConsultation({
													...selectedConsultation,
													isPaid: true
												});
												showToast("Paiement enregistré avec succès", "success");
											}} className="w-full justify-center" icon={<CreditCard size={14} />}>Encaisser la consultation</AtriumButton>}
</div>}
{activeInspectorTab === "actions" && /* @__PURE__ */ <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
{selectedConsultation.status === "InWaitingQueue" && /* @__PURE__ */ <button type="button" onClick={() => handleStartExam(selectedConsultation)} className="w-full p-3 rounded-xl bg-[#d4522f] text-white font-semibold flex items-center justify-between hover:bg-[#b0674b] transition-colors cursor-pointer">
<span className="flex items-center gap-2">
<Stethoscope size={16} />
Faire entrer le patient
</span>
<ArrowRight size={14} />
</button>}
{selectedConsultation.status === "InConsultation" && /* @__PURE__ */ <button type="button" onClick={() => handleFinishExam(selectedConsultation)} className="w-full p-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-between hover:bg-emerald-700 transition-colors cursor-pointer">
<span className="flex items-center gap-2">
<CheckCircle2 size={16} />
Clôturer la consultation
</span>
<ArrowRight size={14} />
</button>}
<button type="button" onClick={() => handleTogglePin(selectedConsultation.id)} className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
<span className="flex items-center gap-2">
<Pin size={16} />
{pinnedIds.has(selectedConsultation.id) ? "Détacher priorité" : "Prioriser en tête de file"}
</span>
</button>
<button type="button" onClick={() => {
													showToast("Impression du ticket de passage...", "info");
												}} className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-semibold flex items-center justify-between hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
<span className="flex items-center gap-2">
<Printer size={16} />
Imprimer ticket d'attente
</span>
</button>
</div>}
</div>
</div>}
</div>
</div>
</>}
<MedicalConsultationModal isOpen={isConsultModalOpen} onClose={() => setIsConsultModalOpen(false)} patients={patients} onSave={addConsultation} />
<MedicalWaitingRoomTvModal isOpen={isTvModalOpen} onClose={() => setIsTvModalOpen(false)} consultations={consultations} practitioners={practitioners} />
</div>;
};
