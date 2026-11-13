import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  MapPin,
  Clock,
  Plus,
  X,
  CheckCircle2,
  Circle,
  DollarSign,
  ChevronRight,
  Trash2,
  Edit3,
  Check,
  Eye,
  Home,
  ChevronDown,
  Download,
  Sparkles,
  Building2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { CohortStatus, EduCohort } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

type CourseCat = 'All' | 'Language' | 'Technology' | 'Academic' | 'Arts';



export const EducationCohortsView: React.FC<any> = () => {
	const { t, isRtl, language } = useTranslation();
	const { eduCohorts, eduCourses, eduClassrooms, eduEnrollments, eduStudents, staff, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, addEduCohort, updateEduCohort, deleteEduCohort, showToast, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout } = useAtriumStore();
	const [categoryFilter, setCategoryFilter] = React.useState("All");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [selectedCohort, setSelectedCohort] = React.useState<any>(null);
	const [isAddCohortModalOpen, setIsAddCohortModalOpen] = React.useState(false);
	const [selectedCohortIds, setSelectedCohortIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedCohortIds, setPinnedCohortIds] = React.useState(/* @__PURE__ */ new Set());
	const [cohortSortBy, setCohortSortBy] = React.useState("name");
	const [cohortSortDir, setCohortSortDir] = React.useState("asc");
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [formData, setFormData] = React.useState({
		courseId: eduCourses[0]?.id || "",
		name: "",
		startDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
		endDate: new Date(Date.now() + 7776e6).toISOString().split("T")[0],
		maxStudents: 20,
		instructorId: staff[0]?.id || "",
		classroomId: eduClassrooms[0]?.id || "",
		scheduleSummary: "Mon & Wed 18:00 - 20:00",
		tuitionFee: 35e3,
		status: "Enrolling"
	});
	const filteredCohorts = React.useMemo(() => {
		return eduCohorts.filter((c) => {
			if (categoryFilter !== "All") {
				if (eduCourses.find((co) => co.id === c.courseId)?.category !== categoryFilter) return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = c.name.toLowerCase().includes(q);
				const matchesCode = (c.cohortCode || "").toLowerCase().includes(q);
				const matchesInstructor = (c.instructorName || "").toLowerCase().includes(q);
				const matchesCourse = (c.courseTitle || "").toLowerCase().includes(q);
				if (!matchesName && !matchesCode && !matchesInstructor && !matchesCourse) return false;
			}
			return true;
		});
	}, [
		eduCohorts,
		categoryFilter,
		searchQuery,
		eduCourses
	]);
	const sortedCohorts = React.useMemo(() => {
		return [...filteredCohorts].sort((a, b) => {
			const aPinned = pinnedCohortIds.has(a.id);
			const bPinned = pinnedCohortIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (cohortSortBy === "name") {
				const cmp = a.name.localeCompare(b.name);
				return cohortSortDir === "asc" ? cmp : -cmp;
			}
			if (cohortSortBy === "occupancy") {
				const aRate = a.enrolledCount / a.maxStudents;
				const bRate = b.enrolledCount / b.maxStudents;
				return cohortSortDir === "asc" ? aRate - bRate : bRate - aRate;
			}
			if (cohortSortBy === "tuition") return cohortSortDir === "asc" ? a.tuitionFee - b.tuitionFee : b.tuitionFee - a.tuitionFee;
			return 0;
		});
	}, [
		filteredCohorts,
		pinnedCohortIds,
		cohortSortBy,
		cohortSortDir
	]);
	const cohortColumns = React.useMemo(() => [
		{
			key: "name",
			header: t("edu_cohorts_title"),
			width: "2.5*",
			minWidth: "220px",
			sortable: true,
			renderCell: (cohort: any) => /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F5E2D8] dark:border-neutral-700"><BookOpen size={16} /></div>
<div className="min-w-0">
<div className="font-bold text-black dark:text-white truncate hover:text-[#d4522f] transition-colors">{cohort.name}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 truncate">{cohort.courseTitle}</div>
</div>
</div>
		},
		{
			key: "instructor",
			header: language === "ar" ? "الأستاذ والمدرّج" : language === "fr" ? "Formateur & Salle" : "Instructor & Room",
			width: "2*",
			minWidth: "180px",
			renderCell: (cohort: any) => /* @__PURE__ */ <div className="space-y-0.5 text-xs">
<div className="font-medium text-black dark:text-white truncate">{cohort.instructorName}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 truncate">{cohort.classroomName || "Room 1"}</div>
</div>
		},
		{
			key: "schedule",
			header: language === "ar" ? "التوقيت والمواعيد" : language === "fr" ? "Planning & Période" : "Schedule",
			width: "2*",
			minWidth: "170px",
			renderCell: (cohort: any) => /* @__PURE__ */ <div className="space-y-0.5 text-xs">
<div className="text-black/70 dark:text-white/75 font-medium">{cohort.scheduleSummary}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
{cohort.startDate}
{" — "}
{cohort.endDate}
</div>
</div>
		},
		{
			key: "occupancy",
			header: language === "ar" ? "المقاعد والنسبة" : language === "fr" ? "Places Occupées" : "Seats & Capacity",
			width: "1.8*",
			minWidth: "150px",
			sortable: true,
			renderCell: (cohort: any) => {
				const pct = Math.min(100, Math.round(cohort.enrolledCount / cohort.maxStudents * 100));
				return /* @__PURE__ */ <div className="space-y-1 text-xs">
<div className="flex items-center justify-between text-[11px]">
<span className="font-semibold text-black/70 dark:text-white/75 tabular-nums">
{cohort.enrolledCount}
{" / "}
{cohort.maxStudents}
</span>
<span className="font-bold text-[#d4522f] tabular-nums">
{pct}
%
</span>
</div>
<div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
<div className="h-full bg-[#d4522f] rounded-full transition-all" style={{ width: `${pct}%` }} />
</div>
</div>;
			}
		},
		{
			key: "tuition",
			header: language === "ar" ? "رسوم التسجيل" : language === "fr" ? "Frais d'inscription" : "Tuition",
			width: "1.5*",
			minWidth: "130px",
			sortable: true,
			renderCell: (cohort: any) => /* @__PURE__ */ <span className="font-bold text-black dark:text-white tabular-nums">{formatMoney(cohort.tuitionFee)}</span>
		},
		{
			key: "status",
			header: language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status",
			width: "1.2*",
			minWidth: "110px",
			renderCell: (cohort: any) => {
				const isEnrolling = cohort.status === "Enrolling";
				const isRunning = cohort.status === "InProgress";
				const isCompleted = cohort.status === "Completed";
				return /* @__PURE__ */ <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isEnrolling ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : isRunning ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : isCompleted ? "bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{cohort.status}</span>;
			}
		}
	], [language, t]);
	const totalSeats = eduCohorts.reduce((sum, c) => sum + c.maxStudents, 0);
	const totalEnrolled = eduCohorts.reduce((sum, c) => sum + c.enrolledCount, 0);
	const globalOccupancy = totalSeats > 0 ? Math.round(totalEnrolled / totalSeats * 100) : 0;
	const handleCreateCohort = (e: any) => {
		e.preventDefault();
		const course = eduCourses.find((co) => co.id === formData.courseId);
		const room = eduClassrooms.find((r) => r.id === formData.classroomId);
		const instructor = staff.find((s) => s.id === formData.instructorId);
		if (!course) return;
		const newCohort = addEduCohort({
			courseId: course.id,
			courseTitle: course.title,
			instructorId: instructor?.id || staff[0]?.id || "staff_01",
			instructorName: instructor?.fullName || staff[0]?.fullName || "Instructor",
			classroomId: room?.id,
			classroomName: room?.name,
			name: formData.name || `${course.title} - Batch 01`,
			startDate: formData.startDate,
			endDate: formData.endDate,
			maxStudents: formData.maxStudents,
			tuitionFee: formData.tuitionFee,
			currency: "DZD",
			scheduleSummary: formData.scheduleSummary,
			status: formData.status as any,
			syllabusMilestones: [
				{
					title: "Orientation & Core Fundamentals",
					completed: true
				},
				{
					title: "Intermediate Hands-on Labs & Projects",
					completed: false
				},
				{
					title: "Midterm Evaluation & Progress Reviews",
					completed: false
				},
				{
					title: "Final Capstone Project & Certification",
					completed: false
				}
			]
		});
		setSelectedCohort(newCohort);
		setIsAddCohortModalOpen(false);
	};
	const handleToggleMilestone = (cohortId: any, milestoneIndex: any) => {
		const cohort = eduCohorts.find((c) => c.id === cohortId);
		if (!cohort || !cohort.syllabusMilestones) return;
		const updated = cohort.syllabusMilestones.map((m, idx) => idx === milestoneIndex ? {
			...m,
			completed: !m.completed
		} : m);
		updateEduCohort(cohortId, { syllabusMilestones: updated });
		if (selectedCohort?.id === cohortId) setSelectedCohort({
			...selectedCohort,
			syllabusMilestones: updated
		});
	};
	const handleExportCSV = () => {
		const headers = [
			language === "ar" ? "اسم الفوج / الدفعة" : language === "fr" ? "Nom Cohorte" : "Cohort Name",
			language === "ar" ? "المقرر الدراسي" : language === "fr" ? "Cours" : "Course Title",
			language === "ar" ? "الأستاذ" : language === "fr" ? "Formateur" : "Instructor",
			language === "ar" ? "القاعة" : language === "fr" ? "Salle" : "Classroom",
			language === "ar" ? "تاريخ البداية" : language === "fr" ? "Date Début" : "Start Date",
			language === "ar" ? "تاريخ النهاية" : language === "fr" ? "Date Fin" : "End Date",
			language === "ar" ? "المواعيد" : language === "fr" ? "Horaires" : "Schedule",
			language === "ar" ? "المقاعد المسجلة" : language === "fr" ? "Inscrits" : "Enrolled",
			language === "ar" ? "السعة القصوى" : language === "fr" ? "Capacité" : "Max Capacity",
			language === "ar" ? "رسوم التسجيل" : language === "fr" ? "Frais (DZD)" : "Tuition (DZD)",
			language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status"
		];
		const rows = sortedCohorts.map((c) => [
			`"${c.name}"`,
			`"${c.courseTitle}"`,
			`"${c.instructorName}"`,
			`"${c.classroomName || ""}"`,
			`"${c.startDate}"`,
			`"${c.endDate}"`,
			`"${c.scheduleSummary}"`,
			`"${c.enrolledCount}"`,
			`"${c.maxStudents}"`,
			`"${c.tuitionFee}"`,
			`"${c.status}"`
		]);
		const csvContent = "data:text/csv;charset=utf-8,﻿" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `cohorts-catalog-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast({
			type: "success",
			title: language === "ar" ? "تم التصدير" : language === "fr" ? "Exportation réussie" : "Export Complete",
			message: `${sortedCohorts.length} ${language === "ar" ? "أفواج تم تصديرها" : "cohorts exported successfully"}`
		});
	};
	const handleBatchStart = () => {
		if (selectedCohortIds.size === 0) return;
		const count = selectedCohortIds.size;
		selectedCohortIds.forEach((id) => updateEduCohort(id, { status: "InProgress" }));
		setSelectedCohortIds(/* @__PURE__ */ new Set());
		showToast({
			type: "success",
			title: language === "ar" ? "بدء الدراسة" : language === "fr" ? "Cohortes Lancées" : "Cohorts In Progress",
			message: `${count} ${language === "ar" ? "أفواج بدأت دراستها" : "cohorts marked as in progress"}`
		});
	};
	const handleBatchComplete = () => {
		if (selectedCohortIds.size === 0) return;
		const count = selectedCohortIds.size;
		selectedCohortIds.forEach((id) => updateEduCohort(id, { status: "Completed" }));
		setSelectedCohortIds(/* @__PURE__ */ new Set());
		showToast({
			type: "info",
			title: language === "ar" ? "اكتملت الدورة" : language === "fr" ? "Cohortes Clôturées" : "Cohorts Completed",
			message: `${count} ${language === "ar" ? "أفواج تم إنهاؤها" : "cohorts marked as completed"}`
		});
	};
	const handleBatchDelete = () => {
		if (selectedCohortIds.size === 0) return;
		const count = selectedCohortIds.size;
		if (confirm(language === "ar" ? `هل أنت متأكد من حذف ${count} فوج؟` : language === "fr" ? `Supprimer définitivement ${count} cohortes sélectionnées ?` : `Delete ${count} selected cohorts?`)) {
			selectedCohortIds.forEach((id) => deleteEduCohort(id));
			setSelectedCohortIds(/* @__PURE__ */ new Set());
			showToast({
				type: "info",
				title: language === "ar" ? "تم الحذف" : language === "fr" ? "Suppression" : "Deleted",
				message: `${count} ${language === "ar" ? "أفواج تم حذفها" : "cohorts deleted"}`
			});
		}
	};
	const cohortEnrolledStudents = selectedCohort ? eduEnrollments.filter((e) => e.cohortId === selectedCohort.id).map((e) => {
		return {
			enrollment: e,
			student: eduStudents.find((s) => s.id === e.studentId)
		};
	}) : [];
	const totalCohortValue = eduCohorts.reduce((sum, c) => sum + c.enrolledCount * c.tuitionFee, 0);
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: (eduCohorts || []).length > 0
	});
	if (showSkeleton && ((eduCohorts || []).length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "220px"
			},
			{
				width: "1.5*",
				minWidth: "130px"
			},
			{
				width: "1.2*",
				minWidth: "100px"
			},
			{
				width: "1.8*",
				minWidth: "150px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "1.2*",
				minWidth: "100px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={130} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><GraduationCap size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">{t("edu_cohorts_title")}</h1>
</div>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
<AtriumButton variant="primary" onClick={() => setIsAddCohortModalOpen(true)} icon={<Plus size={14} />}>{t("edu_modal_add_cohort")}</AtriumButton>
</div>
</div>
{selectedCohortIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
<div className="flex items-center gap-3">
<span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
<span className="text-xs font-bold text-black dark:text-white">
{selectedCohortIds.size}
{" "}
{language === "ar" ? "أفواج محددة" : language === "fr" ? "cohortes sélectionnées" : "cohortes selected"}
</span>
</div>
<div className="flex items-center gap-2 flex-wrap">
<button onClick={() => setSelectedCohortIds(/* @__PURE__ */ new Set())} className="px-3 py-1.5 text-xs text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer">
{language === "ar" ? "إلغاء التحديد" : language === "fr" ? "Désélectionner" : "Deselect"}
</button>
<button onClick={handleBatchStart} className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs">
<Play size={13} />
<span>
{language === "ar" ? "بدء الدراسة" : language === "fr" ? "Lancer" : "Start Term"}
</span>
</button>
<button onClick={handleBatchComplete} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs">
<CheckCircle2 size={13} />
<span>
{language === "ar" ? "اختتام الدورة" : language === "fr" ? "Clôturer" : "Complete"}
</span>
</button>
<button onClick={handleBatchDelete} className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs">
<Trash2 size={13} />
<span>{language === "ar" ? "حذف المحدد" : language === "fr" ? "Supprimer" : "Delete"}</span>
</button>
</div>
</div>}
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-3">
<div>
<h3 className="text-xs font-bold text-black dark:text-white tracking-tight">
{language === "ar" ? "طاقة استيعاب الأفواج والبرامج" : language === "fr" ? "Capacité & Santé des Cohortes" : "Capacity & Cohorts Health"}
</h3>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">
{language === "ar" ? "نسبة الأفواج النشطة" : language === "fr" ? "Ratio de cohortes" : "Active Cohorts Ratio"}
</span>
<span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">↗ 100%</span>
</div>
<div>
<span className="text-2xl font-bold text-black dark:text-white tabular-nums tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">{eduCohorts.length}</span>
<span className="text-xs text-black/55 dark:text-white/55 tabular-nums ml-1">
{"/ "}
{eduCohorts.length}
{" "}
{language === "ar" ? "دفعات دراسية" : "batches"}
</span>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">{language === "ar" ? "دفعات دراسية نشطة" : "Cohortes en cycle actif"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">
{language === "ar" ? "نسبة امتلاء المقاعد" : language === "fr" ? "Taux de remplissage" : "Seat Fill Rate"}
</span>
<span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
{t("edu_seats_filled", {
												enrolled: String(totalEnrolled),
												capacity: String(totalSeats)
											})}
</span>
</div>
<div>
<span className="text-2xl font-bold text-black dark:text-white tabular-nums tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{globalOccupancy}
%
</span>
<span className="text-xs text-black/55 dark:text-white/55 ml-1">
{totalEnrolled}
{" / "}
{totalSeats}
{" "}
{language === "ar" ? "مقعد" : "seats"}
</span>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">{language === "ar" ? "نسبة إشغال القاعات" : "Taux d'occupation global"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/75">
{language === "ar" ? "القيمة الإجمالية للدورات" : language === "fr" ? "Valeur Financière Cohortes" : "Cohort Tuition Value"}
</span>
<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 inline-block">
{language === "ar" ? "إجمالي مستحقات الدورة" : language === "fr" ? "Chiffre d'Affaires Engagé" : "Contracted Intake"}
</span>
</div>
<div>
<span className="text-2xl font-bold text-[#FB923C] tabular-nums tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalCohortValue)}</span>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>{language === "ar" ? "إجمالي الرسوم التعاقدية" : "Volume scolarité engagé"}</span>
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
<div className="flex items-center gap-2">
<BookOpen size={18} className="text-black/70 dark:text-white/75" />
<h2 className="text-sm font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{language === "ar" ? "الأفواج والبرامج الدراسية" : language === "fr" ? "Cohortes & Programmes" : "Academic Cohorts"}
</h2>
</div>
<div className="flex items-center gap-2.5 flex-wrap">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={t("edu_search_cohorts_ph")} shutSize={36} openWidth={220} />
<div className="flex items-center gap-1 p-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs">
{[
											{
												id: "All",
												label: t("edu_filter_all_programs"),
												tooltip: language === "ar" ? "جميع البرامج" : language === "fr" ? "Tous les programmes" : "All programs"
											},
											{
												id: "Language",
												label: language === "ar" ? "لغات" : language === "fr" ? "Langues" : "Languages",
												tooltip: language === "ar" ? "اللغات الأجنبية" : language === "fr" ? "Langues étrangères" : "Foreign Languages"
											},
											{
												id: "Technology",
												label: language === "ar" ? "تقنية" : "Tech",
												tooltip: "Tech & Code"
											},
											{
												id: "Academic",
												label: language === "ar" ? "أكاديمي" : language === "fr" ? "Soutien" : "Academic",
												tooltip: language === "ar" ? "الدعم المدرسي والأكاديمي" : language === "fr" ? "Soutien Académique" : "Academic Support"
											},
											{
												id: "Arts",
												label: language === "ar" ? "فنون" : "Arts",
												tooltip: "Arts & Design"
											}
										].map((tab) => /* @__PURE__ */ <button key={tab.id} type="button" title={tab.tooltip} onClick={() => setCategoryFilter(tab.id)} className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${categoryFilter === tab.id ? "bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f]" : "text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white"}`}>{tab.label}</button>)}
</div>
<button type="button" onClick={handleExportCSV} className="h-9 px-3 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer" title="Export CSV">
<Download size={13} />
<span className="hidden sm:inline">CSV</span>
</button>
</div>
</div>
<UniversalDataCollection items={sortedCohorts} keyExtractor={(c) => c.id} defaultViewMode="grid" columns={cohortColumns} isLoading={isSyncing || networkMode === "force_skeleton"} isOffline={networkMode === "offline"} isTimedOut={isSyncTimeout} lastSyncedAt={lastSyncedAt} onRetrySync={retryCloudSync} sortBy={cohortSortBy} sortDirection={cohortSortDir} onSortChange={(key) => {
								if (cohortSortBy === key) setCohortSortDir((prev) => prev === "asc" ? "desc" : "asc");
								else {
									setCohortSortBy(key);
									setCohortSortDir("asc");
								}
							}} renderCard={(cohort) => {
								const occupancyPercent = Math.min(100, Math.round(cohort.enrolledCount / cohort.maxStudents * 100));
								const completedMilestones = cohort.syllabusMilestones?.filter((m) => m.completed).length || 0;
								const totalMilestones = cohort.syllabusMilestones?.length || 0;
								return /* @__PURE__ */ <div className="flex flex-col items-center justify-center w-full">
<div className="w-20 h-20 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-[28px] font-bold shadow-md mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700"><BookOpen size={28} /></div>
<h3 className="text-[16px] font-bold text-black dark:text-white truncate max-w-[210px] mb-1 tracking-tight text-center">{cohort.name}</h3>
<span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 mb-2 truncate max-w-[200px]">{cohort.courseTitle}</span>
<div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-2">
<div className="flex items-center justify-between text-[11px]">
<span className="text-black/55 dark:text-white/55">{cohort.instructorName}</span>
<span className="font-bold text-black dark:text-white tabular-nums">{formatMoney(cohort.tuitionFee)}</span>
</div>
<div className="flex items-center justify-between text-[11px]">
<span className="text-black/55 dark:text-white/55 font-medium">
{cohort.enrolledCount}
{" / "}
{cohort.maxStudents}
{" "}
{language === "ar" ? "مقاعد" : "seats"}
</span>
<span className="font-bold text-[#d4522f] tabular-nums">
{occupancyPercent}
%
</span>
</div>
<div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
<div className="h-full bg-[#d4522f] rounded-full transition-all" style={{ width: `${occupancyPercent}%` }} />
</div>
<div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px]">
<span className="text-black/55 dark:text-white/55">
{totalMilestones > 0 ? `${completedMilestones}/${totalMilestones} Milestones` : cohort.scheduleSummary}
</span>
<span className="font-semibold text-emerald-600 dark:text-emerald-400">{cohort.status}</span>
</div>
</div>
</div>;
							}} onItemClick={(cohort) => setSelectedCohort(cohort)} onViewDetails={(cohort) => setSelectedCohort(cohort)} onEdit={(cohort) => setSelectedCohort(cohort)} onTogglePin={(cohort) => {
								setPinnedCohortIds((prev) => {
									const next = new Set(prev);
									if (next.has(cohort.id)) {
										next.delete(cohort.id);
										showToast?.({
											type: "info",
											title: "Unpinned",
											message: `${cohort.name} unpinned`
										});
									} else {
										next.add(cohort.id);
										showToast?.({
											type: "info",
											title: "Pinned",
											message: `${cohort.name} pinned to top`
										});
									}
									return next;
								});
							}} onDelete={(cohort) => {
								if (confirm(t("edu_confirm_delete_cohort"))) deleteEduCohort(cohort.id);
							}} isPinned={(cohort) => pinnedCohortIds.has(cohort.id)} selectedIds={selectedCohortIds} onSelectionChange={setSelectedCohortIds} emptyTitle={t("edu_no_cohorts_found")} emptyDescription={t("edu_no_cohorts_found")} primaryActionLabel={t("edu_modal_add_cohort")} onAddFirstItem={() => setIsAddCohortModalOpen(true)} />
</div>
</div>
{selectedCohort && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
<div className="w-full max-w-lg bg-white dark:bg-[#18181B] h-full shadow-2xl border-l rtl:border-r rtl:border-l-0 border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
<div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
<div>
<span className="text-[11px] font-semibold text-[#d4522f] uppercase tracking-wider block">Class Details</span>
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">{selectedCohort.name}</h2>
<p className="text-xs text-black/55 dark:text-white/55">
{selectedCohort.courseTitle}
{" · "}
{selectedCohort.scheduleSummary}
</p>
</div>
<button type="button" onClick={() => setSelectedCohort(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"><X size={16} /></button>
</div>
<div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
<div className="grid grid-cols-2 gap-3">
<div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
{language === "ar" ? "المدرّب / الأستاذ" : language === "fr" ? "Formateur" : "Instructor"}
</span>
<span className="font-semibold text-black dark:text-white">{selectedCohort.instructorName}</span>
</div>
<div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
{language === "ar" ? "القاعة الدراسية" : language === "fr" ? "Salle" : "Classroom"}
</span>
<span className="font-semibold text-black dark:text-white">{selectedCohort.classroomName || "Room 1"}</span>
</div>
<div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
{language === "ar" ? "رسوم الدورة" : language === "fr" ? "Frais d'inscription" : "Tuition Fee"}
</span>
<span className="font-semibold text-black dark:text-white">{formatMoney(selectedCohort.tuitionFee)}</span>
</div>
<div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
<span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
{language === "ar" ? "المقاعد المحجوزة" : language === "fr" ? "Places occupées" : "Seats Filled"}
</span>
<span className="font-semibold text-[#d4522f]">
{selectedCohort.enrolledCount}
{" / "}
{selectedCohort.maxStudents}
{" ("}
{Math.round(selectedCohort.enrolledCount / selectedCohort.maxStudents * 100)}
%)
</span>
</div>
</div>
<div>
<h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2.5">
{language === "ar" ? "مراحل ومحاور المنهاج" : language === "fr" ? "Progression du programme" : "Syllabus Milestones & Progress"}
</h3>
<div className="space-y-2">
{selectedCohort.syllabusMilestones?.map((milestone: any, idx: number) => /* @__PURE__ */ <div key={idx} onClick={() => handleToggleMilestone(selectedCohort.id, idx)} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${milestone.completed ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"}`}>
<button type="button" className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${milestone.completed ? "bg-emerald-600 text-white" : "border border-neutral-300 dark:border-neutral-700"}`}>{milestone.completed && /* @__PURE__ */ <Check size={12} />}</button>
<div className="min-w-0">
<span className={`font-semibold text-xs block ${milestone.completed ? "text-black/55 dark:text-white/75 line-through" : "text-black dark:text-white"}`}>{milestone.title}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">{milestone.completed ? "Milestone Cleared" : "In Progress"}</span>
</div>
</div>)}
</div>
</div>
<div>
<div className="flex items-center justify-between mb-2.5">
<h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
Enrolled Students Roster (
{cohortEnrolledStudents.length}
)
</h3>
</div>
{cohortEnrolledStudents.length === 0 ? /* @__PURE__ */ <p className="text-black/55 dark:text-white/55 italic">No students enrolled yet in this cohort.</p> : /* @__PURE__ */ <div className="space-y-1.5">
{cohortEnrolledStudents.map(({ enrollment, student }) => /* @__PURE__ */ <div key={enrollment.id} className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900">
<div>
<span className="font-semibold text-black dark:text-white block">{enrollment.studentName}</span>
<span className="text-[10px] text-black/55 dark:text-white/55">
{student?.phone || "No phone"}
{" · Paid: "}
{formatMoney(enrollment.paidAmount)}
</span>
</div>
<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${enrollment.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{enrollment.paymentStatus}</span>
</div>)}
</div>}
</div>
</div>
</div>
</div>}
{isAddCohortModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
<div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
<div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">{t("edu_modal_add_cohort")}</h2>
<button type="button" onClick={() => setIsAddCohortModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"><X size={16} /></button>
</div>
<form onSubmit={handleCreateCohort} className="space-y-3.5 pt-4 text-xs">
<LabelSelect field="CourseCurriculum" label={t("edu_field_course_title")} value={formData.courseId} onChange={(val) => setFormData({
									...formData,
									courseId: val?.target?.value ?? String(val)
								})} options={eduCourses.map((co) => ({
									value: co.id,
									label: co.title,
									sublabel: co.category
								}))} searchable width="100%" height={40} corner={12} />
<LabelInput field="CohortName" label={t("edu_field_cohort_code")} required value={formData.name} onChange={(val) => setFormData({
									...formData,
									name: val?.target?.value ?? val
								})} placeholder="e.g. Full-Stack Dev - Autumn Batch" width="100%" height={40} corner={12} />
<div className="grid grid-cols-2 gap-3">
<LabelSelect field="Instructor" label={t("edu_field_instructor")} value={formData.instructorId} onChange={(val) => setFormData({
										...formData,
										instructorId: val?.target?.value ?? String(val)
									})} options={staff.map((s) => ({
										value: s.id,
										label: s.fullName,
										sublabel: s.role
									}))} searchable width="100%" height={40} corner={12} />
<LabelSelect field="AssignedClassroom" label={t("edu_field_classroom")} value={formData.classroomId} onChange={(val) => setFormData({
										...formData,
										classroomId: val?.target?.value ?? String(val)
									})} options={eduClassrooms.map((r) => ({
										value: r.id,
										label: r.name,
										sublabel: `Cap: ${r.capacity}`
									}))} searchable width="100%" height={40} corner={12} />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput field="StartDate" label={t("edu_field_start_date")} type="date" required value={formData.startDate} onChange={(val) => setFormData({
										...formData,
										startDate: val?.target?.value ?? val
									})} width="100%" height={40} corner={12} />
<LabelInput field="EndDate" label={t("edu_field_end_date")} type="date" required value={formData.endDate} onChange={(val) => setFormData({
										...formData,
										endDate: val?.target?.value ?? val
									})} width="100%" height={40} corner={12} />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput field="TuitionFee" label={t("edu_field_tuition_fee")} type="number" required value={formData.tuitionFee} onChange={(val) => setFormData({
										...formData,
										tuitionFee: Number(val?.target?.value ?? val)
									})} width="100%" height={40} corner={12} />
<LabelInput field="SeatLimit" label={t("edu_field_max_students")} type="number" required value={formData.maxStudents} onChange={(val) => setFormData({
										...formData,
										maxStudents: Number(val?.target?.value ?? val)
									})} width="100%" height={40} corner={12} />
</div>
<LabelInput field="ScheduleSummary" label={t("edu_field_schedule_desc")} value={formData.scheduleSummary} onChange={(val) => setFormData({
									...formData,
									scheduleSummary: val?.target?.value ?? val
								})} placeholder="e.g. Sat & Tue 14:00 - 16:30" width="100%" height={40} corner={12} />
<div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
<button type="button" onClick={() => setIsAddCohortModalOpen(false)} className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white font-semibold cursor-pointer">{t("common_cancel")}</button>
<button type="submit" className="px-5 py-2 rounded-xl bg-[#d4522f] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs">{t("edu_btn_save_cohort")}</button>
</div>
</form>
</div>
</div>}
</div>;
};
