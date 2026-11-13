import React, { useState } from 'react';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Search,
  BookOpen,
  ChevronRight,
  Sparkles,
  Home,
  ChevronDown,
  Building2,
  Check,
  Eye,
  Printer,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { EduSession } from '../../../types';
import { RollCallModal } from './RollCallModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCalendarTimeline } from '../../ui/skeleton/StructuralSkeletons';



export const EducationTimetableView: React.FC<any> = () => {
	const { t, language } = useTranslation();
	const isAr = language === "ar";
	const { eduSessions, eduCohorts, eduClassrooms, staff, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, addEduSession, deleteEduSession, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [selectedCohortId, setSelectedCohortId] = React.useState("all");
	const [selectedClassroomId, setSelectedClassroomId] = React.useState("all");
	const [isAddSessionModalOpen, setIsAddSessionModalOpen] = React.useState(false);
	const [selectedSession, setSelectedSession] = React.useState<any>(null);
	const [selectedSessionIds, setSelectedSessionIds] = React.useState(/* @__PURE__ */ new Set());
	const [viewMode, setViewMode] = React.useState("calendar");
	const [inspectorTab, setInspectorTab] = React.useState("seance");
	const [isRollCallOpen, setIsRollCallOpen] = React.useState(false);
	const [rollCallSession, setRollCallSession] = React.useState<any>(null);
	const [formData, setFormData] = React.useState({
		cohortId: eduCohorts[0]?.id || "",
		classroomId: eduClassrooms[0]?.id || "",
		instructorId: staff[0]?.id || "",
		date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
		startTime: "09:00",
		endTime: "11:00",
		topic: ""
	});
	const filteredSessions = eduSessions.filter((s) => {
		if (selectedCohortId !== "all" && s.cohortId !== selectedCohortId) return false;
		if (selectedClassroomId !== "all" && s.classroomId !== selectedClassroomId) return false;
		return true;
	});
	const conflicts = /* @__PURE__ */ new Set();
	for (let i = 0; i < filteredSessions.length; i++) for (let j = i + 1; j < filteredSessions.length; j++) {
		const a = filteredSessions[i];
		const b = filteredSessions[j];
		if (a.date === b.date) {
			if (a.startTime < b.endTime && b.startTime < a.endTime) {
				if (a.classroomId && a.classroomId === b.classroomId || a.instructorId && a.instructorId === b.instructorId) {
					conflicts.add(a.id);
					conflicts.add(b.id);
				}
			}
		}
	}
	const handleCreateSession = (e: any) => {
		e.preventDefault();
		const cohort = eduCohorts.find((c) => c.id === formData.cohortId);
		const room = eduClassrooms.find((r) => r.id === formData.classroomId);
		const instructor = staff.find((s) => s.id === formData.instructorId);
		if (!cohort) return;
		addEduSession({
			cohortId: cohort.id,
			cohortName: cohort.name,
			classroomId: room?.id,
			classroomName: room?.name,
			instructorId: instructor?.id || cohort.instructorId,
			instructorName: instructor?.fullName || cohort.instructorName,
			date: formData.date,
			startTime: formData.startTime,
			endTime: formData.endTime,
			topic: formData.topic || void 0,
			status: "Scheduled"
		});
		setIsAddSessionModalOpen(false);
		showToast(isAr ? "تمت إضافة الحصة التدريبية" : "Créneau d’enseignement ajouté au planning", "success");
	};
	const getSessionActions = (s: any) => [
		{
			label: isAr ? "معاينة الحصة" : "Consulter Fiche",
			icon: /* @__PURE__ */ <Eye size={14} />,
			onClick: () => setSelectedSession(s)
		},
		{
			label: isAr ? "مناداة الحضور" : "Feuille d’Émargement",
			icon: /* @__PURE__ */ <ClipboardList size={14} />,
			onClick: () => {
				setRollCallSession(s);
				setIsRollCallOpen(true);
			}
		},
		{
			label: isAr ? "طباعة المحضر" : "Imprimer Liste",
			icon: /* @__PURE__ */ <Printer size={14} />,
			onClick: () => {
				showToast(isAr ? `طباعة ورقة الحضور للفوج ${s.cohortName}` : `Feuille d'émargement générée pour ${s.cohortName}`, "info");
			}
		},
		{
			label: isAr ? "حذف الحصة" : "Supprimer",
			icon: /* @__PURE__ */ <Trash2 size={14} />,
			onClick: () => {
				deleteEduSession(s.id);
				if (selectedSession?.id === s.id) setSelectedSession(null);
				showToast(isAr ? "تم حذف الحصة" : "Séance retirée du planning", "info");
			}
		}
	];
	const renderCalendarGrid = () => {
		const dates = Array.from(new Set(filteredSessions.map((s) => s.date))).sort();
		if (dates.length === 0) return /* @__PURE__ */ <div className="py-16 text-center text-black/55 dark:text-white/55">
<CalendarIcon size={32} className="mx-auto mb-2 opacity-40 text-[#d4522f]" />
<p className="text-xs font-semibold">
{isAr ? "لا توجد حصص مجدولة حالياً" : "Aucune séance programmée dans le planning"}
</p>
</div>;
		return /* @__PURE__ */ <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
{dates.map((dateStr) => {
				const daySessions = filteredSessions.filter((s) => s.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
				return /* @__PURE__ */ <div key={dateStr} className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 p-3.5 shadow-2xs space-y-3">
<div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
<div className="flex items-center gap-2">
<div className="w-2 h-2 rounded-full bg-[#d4522f]" />
<span className="font-mono text-xs font-bold text-black dark:text-white">{dateStr}</span>
</div>
<span className="text-[10px] font-semibold text-black/55 dark:text-white/55 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full">
{daySessions.length}
{" "}
{isAr ? "حصص" : "séances"}
</span>
</div>
<div className="space-y-2.5">
{daySessions.map((s) => {
							const hasConflict = conflicts.has(s.id);
							const isSelected = selectedSession?.id === s.id;
							return /* @__PURE__ */ <div key={s.id} onClick={() => setSelectedSession(s)} className={`p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "border-[#d4522f] bg-[#FCEEE8]/40 dark:bg-neutral-800 shadow-xs" : "border-neutral-200/70 dark:border-neutral-700/60 hover:border-[#d4522f]/60 bg-neutral-50/50 dark:bg-neutral-800/40"}`}>
<div className="flex items-center justify-between gap-1 mb-1.5">
<span className="font-mono text-[11px] font-bold text-[#d4522f] flex items-center gap-1">
<Clock size={11} />
{s.startTime}
{" - "}
{s.endTime}
</span>
{hasConflict && /* @__PURE__ */ <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Conflit</span>}
</div>
<div className="font-bold text-xs text-black dark:text-white truncate">{s.cohortName}</div>
{s.topic && /* @__PURE__ */ <div className="text-[11px] text-black/55 dark:text-white/55 line-clamp-1 mt-0.5">{s.topic}</div>}
<div className="mt-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-between text-[10px] text-black/55 dark:text-white/55">
<span className="flex items-center gap-1 truncate max-w-[110px]">
<MapPin size={10} className="text-[#d4522f]" />
{s.classroomName || "Salle"}
</span>
<span className="flex items-center gap-1 truncate max-w-[110px]">
<User size={10} />
{s.instructorName || "Formateur"}
</span>
</div>
</div>;
						})}
</div>
</div>;
			})}
</div>;
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: eduSessions.length > 0
	});
	if (showSkeleton && (eduSessions.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCalendarTimeline isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><CalendarIcon size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">{t("edu_timetable_title")}</h1>
</div>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
{conflicts.size > 0 && /* @__PURE__ */ <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-semibold">
<AlertTriangle size={14} />
<span>
{conflicts.size}
{" Conflits détectés"}
</span>
</div>}
<AtriumButton variant="primary" size="sm" glow icon={<Plus size={14} />} onClick={() => setIsAddSessionModalOpen(true)}>{t("edu_btn_add_session")}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-3">
<div>
<h3 className="text-xs font-bold text-black dark:text-white tracking-tight">Planning & Utilisation des Espaces</h3>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">Séances Planifiées</span>
<span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
{"↗ "}
{filteredSessions.length}
{" actives"}
</span>
</div>
<div>
<span className="text-2xl font-bold text-black dark:text-white tabular-nums tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">{eduSessions.length}</span>
<span className="text-xs text-black/55 dark:text-white/55 ml-1">créneaux programmés</span>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">Volume horaire d'enseignement</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">Salles & Ateliers</span>
<span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">100% opérationnelles</span>
</div>
<div>
<span className="text-2xl font-bold text-black dark:text-white tabular-nums tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">{eduClassrooms.length}</span>
<span className="text-xs text-black/55 dark:text-white/55 ml-1">espaces d'enseignement</span>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">Rotation salles & laboratoires</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/75">Intégrité des Horaires</span>
<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 inline-block">{conflicts.size > 0 ? `${conflicts.size} Conflits Détectés` : "Optimal"}</span>
</div>
<div>
<span className="text-2xl font-bold text-[#FB923C] tabular-nums tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">{conflicts.size === 0 ? "Optimal" : `${conflicts.size} Alertes`}</span>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>
{conflicts.size === 0 ? "Zéro conflit salle ou formateur" : "Ajustement de planning requis"}
</span>
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "جدول الحصص والقاعات التدريبية" : "Grille Générale des Séances & Horaires"}
</h2>
</div>
<div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto max-w-full">
{[{
									id: "all",
									label: isAr ? "الكل" : "Toutes",
									tooltip: isAr ? "جميع القاعات" : "Toutes les salles"
								}, ...eduClassrooms.map((cr) => {
									const compact = compactFilterLabel(cr.name);
									return {
										id: cr.id,
										label: compact.label,
										tooltip: cr.name
									};
								})].map((tab) => {
									const isActive = selectedClassroomId === tab.id;
									return /* @__PURE__ */ <button key={tab.id} type="button" title={tab.tooltip} onClick={() => setSelectedClassroomId(tab.id)} className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer" style={{
											backgroundColor: isActive ? "#FCEEE8" : "transparent",
											color: isActive ? "var(--color-accent)" : "#71717A"
										}}>{tab.label}</button>;
								})}
</div>
</div>
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection items={filteredSessions} keyExtractor={(s) => s.id} viewMode={viewMode} defaultViewMode="calendar" showCalendarToggle onViewModeChange={setViewMode} renderCalendarView={renderCalendarGrid} selectedIds={selectedSessionIds} onSelectionChange={setSelectedSessionIds} bulkSecondaryAction={{
										label: isAr ? "مناداة الحضور" : "Feuille d’émargement",
										icon: /* @__PURE__ */ <ClipboardList size={14} />,
										onClick: (ids: any) => {
											showToast(isAr ? `تم تجهيز أوراق الحضور لـ ${ids.size} حصص` : `Feuilles d'émargement prêtes pour ${ids.size} séances`);
										}
									}} onBulkDelete={(ids) => {
										ids.forEach((id) => deleteEduSession(id));
										setSelectedSessionIds(/* @__PURE__ */ new Set());
										if (selectedSession && ids.has(selectedSession.id)) setSelectedSession(null);
										showToast(isAr ? "تم حذف الحصص المحددة" : "Séances supprimées du planning");
									}} searchPlaceholder={isAr ? "بحث بالفوج، القاعة، المدرب..." : "Rechercher matière, cohorte, salle, formateur..."} searchFilter={(s, query) => (s.topic || "").toLowerCase().includes(query.toLowerCase()) || (s.instructorName || "").toLowerCase().includes(query.toLowerCase()) || (s.cohortName || "").toLowerCase().includes(query.toLowerCase()) || (s.classroomName || "").toLowerCase().includes(query.toLowerCase()) || s.date.includes(query)} onSelectRow={(s) => setSelectedSession(s)} customActions={(s) => getSessionActions(s)} columns={[
										{
											id: "schedule",
											header: isAr ? "التوقيت" : "Horaire & Date",
											width: "160px",
											sortable: true,
											renderCell: (s: any) => /* @__PURE__ */ <div className="space-y-0.5 font-mono">
<div className="font-bold text-xs text-[#d4522f] flex items-center gap-1.5">
<CalendarIcon size={12} />
<span>{s.date}</span>
</div>
<div className="text-[11px] text-black/55 dark:text-white/55 flex items-center gap-1">
<Clock size={11} />
<span>
{s.startTime}
{" - "}
{s.endTime}
</span>
</div>
</div>
										},
										{
											id: "cohort",
											header: isAr ? "الفوج" : "Cohorte / Promotion",
											width: "180px",
											renderCell: (s: any) => /* @__PURE__ */ <div>
<span className="font-bold text-xs text-black dark:text-white block">{s.cohortName}</span>
{s.topic && /* @__PURE__ */ <span className="text-[11px] text-black/55 dark:text-white/55 line-clamp-1">{s.topic}</span>}
</div>
										},
										{
											id: "room",
											header: isAr ? "القاعة" : "Salle Campus",
											width: "140px",
											renderCell: (s: any) => /* @__PURE__ */ <span className="text-xs font-semibold text-black dark:text-white flex items-center gap-1">
<MapPin size={12} className="text-[#d4522f]" />
<span>{s.classroomName || "Non assignée"}</span>
</span>
										},
										{
											id: "instructor",
											header: isAr ? "المدرب" : "Formateur / Enseignant",
											width: "170px",
											renderCell: (s: any) => /* @__PURE__ */ <span className="text-xs font-medium text-black/70 dark:text-white/75 flex items-center gap-1">
<User size={12} className="text-black/55 dark:text-white/55" />
<span>{s.instructorName || "Formateur"}</span>
</span>
										},
										{
											id: "status",
											header: isAr ? "الوضعية" : "Statut Séance",
											width: "120px",
											renderCell: (s: any) => {
												return conflicts.has(s.id) ? /* @__PURE__ */ <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
<AlertTriangle size={10} />
Conflit
</span> : /* @__PURE__ */ <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
<CheckCircle2 size={10} />
Planifiée
</span>;
											}
										}
									]} renderCard={(s) => {
										const hasConflict = conflicts.has(s.id);
										return /* @__PURE__ */ <div className="p-4 flex flex-col justify-between h-full space-y-3">
<div className="flex items-start justify-between gap-2">
<div className="font-mono text-xs font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded">
{s.startTime}
{" - "}
{s.endTime}
</div>
{hasConflict ? /* @__PURE__ */ <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Conflit</span> : /* @__PURE__ */ <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Planifiée</span>}
</div>
<div>
<h4 className="font-bold text-xs text-black dark:text-white line-clamp-1">{s.cohortName}</h4>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 line-clamp-1">{s.topic || "Séance de cours"}</p>
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-black/55 dark:text-white/55">
<span>{s.classroomName || "Salle"}</span>
<span className="font-medium text-black/70 dark:text-white/75 truncate max-w-[120px]">{s.instructorName}</span>
</div>
</div>;
									}} />
</div>
{selectedSession && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><CalendarIcon size={16} /></div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 font-mono">
{selectedSession.date}
{" · "}
{selectedSession.startTime}
</h3>
<p className="text-[10px] text-black/55 dark:text-white/55 truncate max-w-[210px]">{selectedSession.cohortName}</p>
</div>
</div>
<button onClick={() => setSelectedSession(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-black/55 dark:text-white/55 transition-colors"><X size={15} /></button>
</div>
<div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
<button onClick={() => setInspectorTab("seance")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "seance" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "تفاصيل الحصة" : "Séance & Cours"}</button>
<button onClick={() => setInspectorTab("salle")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "salle" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "القاعة والتجهيزات" : "Salle & Capacité"}</button>
<button onClick={() => setInspectorTab("emargement")} className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${inspectorTab === "emargement" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>{isAr ? "ورقة الحضور" : "Émargement"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
{inspectorTab === "seance" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Fiche Pédagogique</span>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Promotion / Cohorte:</span>
<span className="font-bold text-black dark:text-white">{selectedSession.cohortName}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Date & Créneau:</span>
<span className="font-mono font-bold text-black dark:text-white">
{selectedSession.date}
{" ("}
{selectedSession.startTime}
{" - "}
{selectedSession.endTime}
)
</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Formateur:</span>
<span className="font-medium text-black dark:text-white">{selectedSession.instructorName}</span>
</div>
</div>
<div className="space-y-1.5">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold">Sujet / Module Traité</span>
<div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-black dark:text-white">
{selectedSession.topic || "Séance magistrale et travaux pratiques dirigés selon le syllabus de la formation."}
</div>
</div>
</div>}
{inspectorTab === "salle" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Espace Pédagogique Assigné</span>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Salle de cours:</span>
<span className="font-bold text-black dark:text-white">{selectedSession.classroomName || "Salle A1"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Équipements:</span>
<span className="text-black/70 dark:text-white/75">Vidéoprojecteur HD, Tableau blanc, Wi-Fi</span>
</div>
</div>
</div>}
{inspectorTab === "emargement" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Appel & Présences Étudiants</span>
<p className="text-[11px] text-black/70 dark:text-white/75">
Feuille d'émargement officielle de la séance. Les absences non justifiées sont transmises à l'administration.
</p>
<button onClick={() => {
																setRollCallSession(selectedSession);
																setIsRollCallOpen(true);
															}} className="w-full py-2 rounded-lg text-xs font-bold bg-[#d4522f] hover:bg-[#b06a4e] text-white transition-colors">Lancer l'Appel des Présences</button>
</div>
</div>}
</div>
<div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
<AtriumButton variant="primary" className="w-full justify-center" icon={<Printer size={14} />} onClick={() => {
												showToast(isAr ? "جاري طباعة ورقة الحضور" : "Impression de la feuille d’émargement", "success");
											}}>{isAr ? "طباعة ورقة الحضور" : "Imprimer Feuille d’Émargement"}</AtriumButton>
</div>
</div>}
</div>
</div>
</div>
{isAddSessionModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
<div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-md shadow-xl space-y-5">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<div className="flex items-center gap-2">
<CalendarIcon size={20} className="text-[#d4522f]" />
<h3 className="font-bold text-base text-black dark:text-white">{t("edu_btn_add_session")}</h3>
</div>
<button onClick={() => setIsAddSessionModalOpen(false)} className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white p-1"><X size={18} /></button>
</div>
<form onSubmit={handleCreateSession} className="space-y-4">
<LabelSelect label={t("edu_label_cohort")} value={formData.cohortId} onChange={(v) => setFormData({
									...formData,
									cohortId: v
								})} options={eduCohorts.map((c) => ({
									value: c.id,
									label: c.name
								}))} />
<LabelSelect label={t("edu_field_classroom")} value={formData.classroomId} onChange={(v) => setFormData({
									...formData,
									classroomId: v
								})} options={eduClassrooms.map((r) => ({
									value: r.id,
									label: `${r.name} (Cap: ${r.capacity})`
								}))} />
<div className="grid grid-cols-2 gap-3">
<LabelInput label="Date" type="date" value={formData.date} onChange={(v) => setFormData({
										...formData,
										date: v
									})} required />
<div className="grid grid-cols-2 gap-1.5">
<LabelInput label="Début" type="time" value={formData.startTime} onChange={(v) => setFormData({
											...formData,
											startTime: v
										})} required />
<LabelInput label="Fin" type="time" value={formData.endTime} onChange={(v) => setFormData({
											...formData,
											endTime: v
										})} required />
</div>
</div>
<LabelInput label="Module / Thème du cours" value={formData.topic} onChange={(v) => setFormData({
									...formData,
									topic: v
								})} placeholder="Ex: Programmation Web Avancée" />
<div className="flex justify-end gap-2 pt-2">
<AtriumButton variant="secondary" onClick={() => setIsAddSessionModalOpen(false)}>Annuler</AtriumButton>
<AtriumButton variant="primary" type="submit">Ajouter au Planning</AtriumButton>
</div>
</form>
</div>
</div>}
{isRollCallOpen && rollCallSession && /* @__PURE__ */ <RollCallModal session={rollCallSession} onClose={() => {
					setIsRollCallOpen(false);
					setRollCallSession(null);
				}} />}
</div>;
};
