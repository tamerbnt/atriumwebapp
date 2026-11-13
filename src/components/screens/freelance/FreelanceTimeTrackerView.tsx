import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
  Flame,
  Coffee,
  X,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Building2,
  ChevronDown,
  Check,
  Sparkles,
  Pin,
  Download,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatDuration, formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceClient, FreelanceProject, CurrencyCode, TimeLogEntry } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const FreelanceTimeTrackerView: React.FC<any> = () => {
	const { t, language, isRtl } = useTranslation();
	const { activeTimer, timeLogs, freelanceClients, freelanceProjects, startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, logTimeEntry, updateTimeLog, deleteTimeLog, billUnbilledHours, setScreen, showToast, businesses, branches, currentBusinessId, currentBusiness, switchBusiness, switchBranch, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [selectedClientId, setSelectedClientId] = React.useState(freelanceClients[0]?.id || "");
	const [selectedProjectId, setSelectedProjectId] = React.useState(freelanceProjects[0]?.id || "");
	const [taskDescription, setTaskDescription] = React.useState("");
	const [isBillable, setIsBillable] = React.useState(true);
	const [isPomodoro, setIsPomodoro] = React.useState(false);
	const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
	const [manualForm, setManualForm] = React.useState({
		clientId: freelanceClients[0]?.id || "",
		projectId: freelanceProjects[0]?.id || "",
		taskDescription: "",
		hours: 2,
		minutes: 30,
		date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
		isBillable: true
	});
	const availableManualProjects = React.useMemo(() => {
		if (!manualForm.clientId) return freelanceProjects;
		const clientProjects = freelanceProjects.filter((p) => p.clientId === manualForm.clientId);
		return clientProjects.length > 0 ? clientProjects : freelanceProjects;
	}, [freelanceProjects, manualForm.clientId]);
	const handleManualClientChange = (newClientId: any) => {
		const nextProjects = freelanceProjects.filter((p) => p.clientId === newClientId);
		setManualForm((prev) => ({
			...prev,
			clientId: newClientId,
			projectId: nextProjects[0]?.id || ""
		}));
	};
	const handleOpenManualModal = () => {
		const defaultClientId = freelanceClients[0]?.id || "";
		const defaultProjects = freelanceProjects.filter((p) => p.clientId === defaultClientId);
		setManualForm({
			clientId: defaultClientId,
			projectId: defaultProjects[0]?.id || freelanceProjects[0]?.id || "",
			taskDescription: "",
			hours: 2,
			minutes: 30,
			date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
			isBillable: true
		});
		setIsManualModalOpen(true);
	};
	const [logToEdit, setLogToEdit] = React.useState<any>(null);
	const [editLogForm, setEditLogForm] = React.useState({
		taskDescription: "",
		hours: 0,
		minutes: 0,
		date: "",
		isBillable: true
	});
	const [logToDelete, setLogToDelete] = React.useState<any>(null);
	const [searchQuery, setSearchQuery] = React.useState("");
	const availableProjects = React.useMemo(() => {
		return freelanceProjects.filter((p) => p.clientId === selectedClientId);
	}, [freelanceProjects, selectedClientId]);
	const filteredLogs = React.useMemo(() => {
		if (!searchQuery.trim()) return timeLogs;
		const q = searchQuery.toLowerCase();
		return timeLogs.filter((entry) => entry.taskDescription.toLowerCase().includes(q) || entry.clientName.toLowerCase().includes(q) || entry.projectTitle && entry.projectTitle.toLowerCase().includes(q) || entry.deliverableTitle && entry.deliverableTitle.toLowerCase().includes(q));
	}, [timeLogs, searchQuery]);
	const [selectedLogIds, setSelectedLogIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedLogIds, setPinnedLogIds] = React.useState(/* @__PURE__ */ new Set());
	const [timeLogSortBy, setTimeLogSortBy] = React.useState("date");
	const [timeLogSortDir, setTimeLogSortDir] = React.useState("desc");
	const sortedLogs = React.useMemo(() => {
		return [...filteredLogs].sort((a, b) => {
			const aPinned = pinnedLogIds.has(a.id);
			const bPinned = pinnedLogIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (timeLogSortBy === "client") {
				const cmp = a.clientName.localeCompare(b.clientName);
				return timeLogSortDir === "asc" ? cmp : -cmp;
			}
			if (timeLogSortBy === "duration") return timeLogSortDir === "asc" ? a.durationSeconds - b.durationSeconds : b.durationSeconds - a.durationSeconds;
			if (timeLogSortBy === "rate") return timeLogSortDir === "asc" ? a.rateAtMoment - b.rateAtMoment : b.rateAtMoment - a.rateAtMoment;
			if (timeLogSortBy === "status") {
				const getStatusKey = (l: any) => l.isInvoiced ? "invoiced" : l.isBillable ? "unbilled" : "non_billable";
				return timeLogSortDir === "asc" ? getStatusKey(a).localeCompare(getStatusKey(b)) : getStatusKey(b).localeCompare(getStatusKey(a));
			}
			const dateA = new Date(a.date).getTime();
			const dateB = new Date(b.date).getTime();
			return timeLogSortDir === "asc" ? dateA - dateB : dateB - dateA;
		});
	}, [
		filteredLogs,
		pinnedLogIds,
		timeLogSortBy,
		timeLogSortDir
	]);
	const handleTogglePinLog = (log: any) => {
		setPinnedLogIds((prev) => {
			const next = new Set(prev);
			if (next.has(log.id)) next.delete(log.id);
			else next.add(log.id);
			return next;
		});
	};
	const handleBatchDeleteLogs = () => {
		const targetIds = Array.from(selectedLogIds);
		let count = 0;
		targetIds.forEach((id) => {
			const log = timeLogs.find((l) => l.id === id);
			if (log && !log.isInvoiced) {
				deleteTimeLog(id);
				count++;
			}
		});
		setSelectedLogIds(/* @__PURE__ */ new Set());
		showToast({
			type: "warning",
			title: language === "ar" ? "حذف الجلسات" : language === "fr" ? "Sessions supprimées" : "Sessions Removed",
			message: `${count} ${language === "ar" ? "جلسة تم حذفها من السجل" : language === "fr" ? "sessions supprimées du journal" : "time logs removed"}.`
		});
	};
	const handleBatchBillSelected = () => {
		const unbilledSelected = timeLogs.filter((l) => selectedLogIds.has(l.id) && l.isBillable && !l.isInvoiced);
		if (unbilledSelected.length === 0) return;
		Array.from(new Set(unbilledSelected.map((l) => l.clientId))).forEach((cId) => billUnbilledHours(cId, 0));
		setSelectedLogIds(/* @__PURE__ */ new Set());
		showToast({
			type: "success",
			title: language === "ar" ? "تم إنشاء الفواتير" : language === "fr" ? "Factures générées" : "Invoices Created",
			message: `${unbilledSelected.length} ${language === "ar" ? "جلسة تم فوترتها بنجاح" : language === "fr" ? "heures facturées avec succès" : "sessions billed to client invoices"}.`,
			category: "freelance_solo",
			action: {
				label: t("toast_invoice_preview_btn", language),
				onClick: () => setScreen("shop")
			}
		});
	};
	const handleExportCSV = () => {
		const headers = [
			language === "ar" ? "التاريخ" : language === "fr" ? "Date" : "Date",
			language === "ar" ? "العميل" : language === "fr" ? "Client" : "Client",
			language === "ar" ? "المشروع" : language === "fr" ? "Projet" : "Project",
			language === "ar" ? "المهمة" : language === "fr" ? "Tâche" : "Task",
			language === "ar" ? "المدة" : language === "fr" ? "Durée" : "Duration",
			language === "ar" ? "الثواني" : language === "fr" ? "Secondes" : "Seconds",
			language === "ar" ? "سعر الساعة" : language === "fr" ? "Taux horaire" : "Rate",
			language === "ar" ? "العملة" : language === "fr" ? "Devise" : "Currency",
			language === "ar" ? "قابل للفوترة" : language === "fr" ? "Facturable" : "Billable",
			language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status"
		];
		const rows = sortedLogs.map((l) => [
			`"${l.date}"`,
			`"${l.clientName.replace(/"/g, "\"\"")}"`,
			`"${(l.projectTitle || "").replace(/"/g, "\"\"")}"`,
			`"${l.taskDescription.replace(/"/g, "\"\"")}"`,
			`"${formatDuration(l.durationSeconds)}"`,
			l.durationSeconds,
			l.rateAtMoment,
			l.currency,
			l.isBillable ? "Yes" : "No",
			l.isInvoiced ? "Invoiced" : l.isBillable ? "Unbilled" : "Non-billable"
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `atrium-timesheet-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	const totalSecondsAll = timeLogs.reduce((sum, l) => sum + l.durationSeconds, 0);
	const billableSeconds = timeLogs.filter((l) => l.isBillable).reduce((sum, l) => sum + l.durationSeconds, 0);
	const unbilledLogs = timeLogs.filter((l) => l.isBillable && !l.isInvoiced);
	const unbilledHours = Number((unbilledLogs.reduce((sum, l) => sum + l.durationSeconds, 0) / 3600).toFixed(1));
	const billableRatio = totalSecondsAll > 0 ? Math.round(billableSeconds / totalSecondsAll * 100) : 100;
	const handleStartFocusTimer = () => {
		if (freelanceClients.length === 0) {
			setScreen("members");
			return;
		}
		if (freelanceProjects.length === 0) {
			setScreen("scheduler");
			return;
		}
		const client = freelanceClients.find((c) => c.id === selectedClientId) || freelanceClients[0];
		const project = availableProjects.find((p) => p.id === selectedProjectId) || freelanceProjects.find((p) => p.clientId === client.id) || freelanceProjects[0];
		startTimer(client.id, client.company || client.name, project.id, project.title, taskDescription || (language === "ar" ? "مهمة عمل" : language === "fr" ? "Session de travail" : "Sprint Task"), project.deliverables?.[0]?.id, project.deliverables?.[0]?.title, isBillable, isPomodoro);
	};
	const handleEditLogSubmit = (e: any) => {
		e.preventDefault();
		if (!logToEdit || !editLogForm.taskDescription.trim()) return;
		const durationSeconds = Number(editLogForm.hours) * 3600 + Number(editLogForm.minutes) * 60;
		updateTimeLog(logToEdit.id, {
			taskDescription: editLogForm.taskDescription,
			durationSeconds,
			date: editLogForm.date,
			isBillable: editLogForm.isBillable
		});
		setLogToEdit(null);
	};
	const handleManualLogSubmit = (e: any) => {
		e.preventDefault();
		if (!manualForm.taskDescription.trim()) return;
		const client = freelanceClients.find((c) => c.id === manualForm.clientId);
		const project = freelanceProjects.find((p) => p.id === manualForm.projectId);
		const durationSeconds = Number(manualForm.hours) * 3600 + Number(manualForm.minutes) * 60;
		logTimeEntry({
			clientId: manualForm.clientId,
			clientName: client?.name || (language === "ar" ? "العميل" : language === "fr" ? "Client" : "Client"),
			projectId: manualForm.projectId,
			projectTitle: project?.title || (language === "ar" ? "المشروع" : language === "fr" ? "Projet" : "Project"),
			taskDescription: manualForm.taskDescription,
			durationSeconds,
			isBillable: manualForm.isBillable,
			rateAtMoment: client?.hourlyRate || 85,
			currency: client?.currency || "EUR",
			date: manualForm.date
		});
		setManualForm({
			clientId: freelanceClients[0]?.id || "",
			projectId: freelanceProjects[0]?.id || "",
			taskDescription: "",
			hours: 2,
			minutes: 30,
			date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
			isBillable: true
		});
		setIsManualModalOpen(false);
		showToast({
			type: "success",
			title: t("toast_time_logged_title", language),
			message: `${manualForm.hours}h ${manualForm.minutes}m ${t("toast_time_logged_msg", language)} "${project?.title || t("nav_scheduler", language)}".`,
			category: "freelance_solo",
			action: {
				label: t("nav_shop", language),
				onClick: () => setScreen("shop")
			}
		});
	};
	const handleBillClientUnbilled = (clientId: any) => {
		try {
			const inv = billUnbilledHours(clientId, 0);
			showToast({
				type: "success",
				title: t("toast_invoice_gen_title", language),
				message: `${t("toast_invoice_gen_msg", language)} ${inv?.clientName || ""}.`,
				category: "freelance_solo",
				action: {
					label: t("toast_invoice_preview_btn", language),
					onClick: () => setScreen("shop")
				}
			});
			setScreen("shop");
		} catch (err: any) {
			console.error("Error billing hours:", err?.message || err);
		}
	};
	const timeLogColumns = React.useMemo(() => [
		{
			key: "date",
			header: t("common_date", language),
			width: "1.4*",
			sortable: true,
			renderCell: (entry: any) => {
				const isPinned = pinnedLogIds.has(entry.id);
				return /* @__PURE__ */ <div className="flex items-center gap-2">
{isPinned && /* @__PURE__ */ <span className="w-1.5 h-5 rounded-full bg-[#d4522f] shrink-0" />}
<span className="text-xs text-black/55 dark:text-white/55 tabular-nums">{entry.date}</span>
{isPinned && /* @__PURE__ */ <Pin size={11} className="text-[#d4522f] shrink-0" />}
</div>;
			}
		},
		{
			key: "client",
			header: `${t("free_invoice_client", language)} & ${t("free_time_project_label", language)}`,
			width: "2.4*",
			sortable: true,
			renderCell: (entry: any) => /* @__PURE__ */ <div className="min-w-0">
<span className="font-bold text-sm text-black dark:text-white block truncate">{entry.clientName}</span>
<span className="text-[11px] text-black/55 dark:text-white/55 truncate block">{entry.projectTitle}</span>
</div>
		},
		{
			key: "task",
			header: t("free_time_field_notes", language),
			width: "2.4*",
			renderCell: (entry: any) => /* @__PURE__ */ <div className="min-w-0 max-w-xs">
<span className="text-xs font-medium text-black dark:text-white truncate block">{entry.taskDescription}</span>
{entry.deliverableTitle && /* @__PURE__ */ <span className="text-[10px] text-[#d4522f] truncate block mt-0.5">
{t("free_time_milestone_prefix", language)}
{": "}
{entry.deliverableTitle}
</span>}
</div>
		},
		{
			key: "duration",
			header: t("free_time_duration", language),
			width: "1.4*",
			sortable: true,
			renderCell: (entry: any) => /* @__PURE__ */ <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">{formatDuration(entry.durationSeconds)}</span>
		},
		{
			key: "rate",
			header: t("free_time_rate", language),
			width: "1.4*",
			sortable: true,
			renderCell: (entry: any) => /* @__PURE__ */ <span className="font-mono text-xs text-black/70 dark:text-white/75 tabular-nums">
{formatCurrencyAmount(entry.rateAtMoment, entry.currency)}
/h
</span>
		},
		{
			key: "status",
			header: t("common_status", language),
			width: "1.4*",
			sortable: true,
			renderCell: (entry: any) => {
				if (entry.isInvoiced) return /* @__PURE__ */ <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
{t("free_kanban_invoiced", language)}
</span>;
				if (entry.isBillable) return /* @__PURE__ */ <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
<span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
{t("free_time_unbilled_badge", language)}
</span>;
				return /* @__PURE__ */ <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/55 dark:text-white/55">{t("free_time_non_billable", language)}</span>;
			}
		},
		{
			key: "actions",
			header: t("common_actions", language),
			width: "1.2*",
			renderCell: (entry: any) => /* @__PURE__ */ <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
<button type="button" disabled={entry.isInvoiced} onClick={() => {
						setLogToEdit(entry);
						const totalMin = Math.round(entry.durationSeconds / 60);
						setEditLogForm({
							taskDescription: entry.taskDescription,
							hours: Math.floor(totalMin / 60),
							minutes: totalMin % 60,
							date: entry.date,
							isBillable: entry.isBillable
						});
					}} className={`p-1.5 rounded-lg transition-colors ${entry.isInvoiced ? "opacity-30 cursor-not-allowed text-black/55 dark:text-white/55" : "text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"}`} title={entry.isInvoiced ? t("free_time_no_edit_invoiced_tt", language) : t("free_time_edit_log_tt", language)}><Edit2 size={13} /></button>
<button type="button" disabled={entry.isInvoiced} onClick={() => setLogToDelete(entry)} className={`p-1.5 rounded-lg transition-colors ${entry.isInvoiced ? "opacity-30 cursor-not-allowed text-black/55 dark:text-white/55" : "text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"}`} title={entry.isInvoiced ? t("free_time_no_delete_invoiced_tt", language) : t("free_time_delete_log_tt", language)}><Trash2 size={13} /></button>
</div>
		}
	], [
		language,
		pinnedLogIds,
		t
	]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: timeLogs.length > 0
	});
	if (showSkeleton && (timeLogs.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "1.2*",
				minWidth: "100px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} viewMode="list" isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
<div>
<div className="flex items-center gap-2">
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">{t("free_time_title", language)}</h1>
</div>
</div>
<div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
<AtriumButton variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExportCSV} title="Export Timesheet CSV">
<span className="hidden sm:inline">{language === "ar" ? "تصدير" : language === "fr" ? "Exporter" : "Export"}</span>
</AtriumButton>
<AtriumButton variant="primary" size="sm" glow icon={<Plus size={13} />} onClick={handleOpenManualModal}><span>{t("free_time_btn_manual", language)}</span></AtriumButton>
</div>
</div>
<div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 dark:bg-black text-white border border-neutral-800 shadow-xl relative overflow-hidden">
<div className="absolute top-0 right-0 w-96 h-96 bg-[#d4522f]/10 rounded-full blur-3xl pointer-events-none" />
<div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
<div className="space-y-3 text-center lg:text-left">
<div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold tracking-wider text-white/75 uppercase">
<span className={`w-2 h-2 rounded-full ${activeTimer.isRunning && !activeTimer.isPaused ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"}`} />
<span>
{activeTimer.isRunning ? activeTimer.isPaused ? t("free_time_timer_paused_status", language) : t("free_time_live_session_status", language) : t("free_time_ready_status", language)}
</span>
{activeTimer.isPomodoro && /* @__PURE__ */ <span className="text-amber-400">
{"· Pomodoro "}
{activeTimer.pomodoroMode === "work" ? t("free_time_pomodoro_sprint", language) : t("free_time_pomodoro_rest", language)}
</span>}
</div>
<div className="text-5xl sm:text-7xl font-mono font-black tracking-tight text-white tabular-nums drop-shadow-sm">{formatDuration(activeTimer.elapsedSeconds)}</div>
{activeTimer.isRunning && /* @__PURE__ */ <div className="text-xs text-white/80 font-medium">
{t("free_time_working_on_label", language)}
{" "}
<strong className="text-white">{activeTimer.clientName}</strong>
{" ·"}
{" "}
<span className="text-white/75">{activeTimer.taskDescription}</span>
</div>}
</div>
<div className="flex flex-col sm:flex-row items-center gap-3">
{!activeTimer.isRunning ? /* @__PURE__ */ <button type="button" onClick={handleStartFocusTimer} className="h-14 px-8 rounded-2xl bg-[#d4522f] text-white text-sm font-bold flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer shadow-lg hover:shadow-[#d4522f]/20">
<Play size={18} className="fill-current" />
<span>{t("free_time_timer_start", language)}</span>
</button> : /* @__PURE__ */ <div className="flex items-center gap-2">
{activeTimer.isPaused ? /* @__PURE__ */ <button type="button" onClick={resumeTimer} className="h-12 px-6 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors cursor-pointer">
<Play size={16} className="fill-current" />
<span>{t("free_time_timer_resume", language)}</span>
</button> : /* @__PURE__ */ <button type="button" onClick={pauseTimer} className="h-12 px-6 rounded-2xl bg-amber-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer">
<Pause size={16} />
<span>{t("free_time_timer_pause", language)}</span>
</button>}
<button type="button" onClick={stopTimer} className="h-12 px-6 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-rose-700 transition-colors cursor-pointer" title={t("free_time_stop_save_tt", language)}>
<Square size={16} className="fill-current" />
<span>{t("free_time_timer_stop", language)}</span>
</button>
<button type="button" onClick={resetTimer} className="h-12 w-12 rounded-2xl bg-neutral-800 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer" title={t("free_time_discard_tt", language)}><RotateCcw size={16} /></button>
</div>}
</div>
</div>
{!activeTimer.isRunning && /* @__PURE__ */ <div className="mt-8 pt-6 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
<LabelSelect field="Client" label={t("free_invoice_client", language)} value={selectedClientId} onChange={(val) => {
									const cId = val?.target?.value ?? String(val);
									setSelectedClientId(cId);
									const firstProj = freelanceProjects.find((p) => p.clientId === cId);
									if (firstProj) setSelectedProjectId(firstProj.id);
								}} options={freelanceClients.map((c) => ({
									value: c.id,
									label: `${c.name} (${c.company || t("free_clients_private_badge", language)})`
								}))} placeholder={t("free_deliv_ph_select_client", language)} height={46} corner={14} />
<LabelSelect field="Project" label={t("free_time_project_label", language)} value={selectedProjectId} onChange={(val) => setSelectedProjectId(val?.target?.value ?? String(val))} options={availableProjects.map((p) => ({
									value: p.id,
									label: p.title
								}))} placeholder={t("free_time_ph_select_project", language)} height={46} corner={14} />
<LabelInput field="Task" label={t("free_time_working_on", language)} placeholder={t("free_time_live_what_working_on", language)} value={taskDescription} onChange={setTaskDescription} width="100%" height={46} corner={14} />
<div className="flex items-center justify-between sm:justify-end gap-4 pt-4 sm:pt-0">
<label className="flex items-center gap-2 cursor-pointer text-white/80">
<input type="checkbox" checked={isBillable} onChange={(e) => setIsBillable(e.target.checked)} className="rounded text-[#d4522f] focus:ring-0" />
<span>{t("free_time_billable", language)}</span>
</label>
<label className="flex items-center gap-2 cursor-pointer text-white/80">
<input type="checkbox" checked={isPomodoro} onChange={(e) => setIsPomodoro(e.target.checked)} className="rounded text-amber-500 focus:ring-0" />
<span>
{t("free_topbar_pomodoro", language)}
{" (25m)"}
</span>
</label>
</div>
</div>}
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{language === "ar" ? "مؤشرات تتبع الوقت والإنتاجية" : language === "fr" ? "Indicateurs de Temps & Productivité" : "Time Tracking & Productivity Metrics"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{t("free_time_total_hours_logged", language)}</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75">
{timeLogs.length}
{" "}
{t("free_time_tracked_sessions_unit", language)}
</span>
</div>
<div>
<div className="text-2xl font-black text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{(totalSecondsAll / 3600).toFixed(1)}
h
</div>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">{language === "ar" ? "إجمالي الساعات المسجلة" : "Cumul des heures travaillées"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{t("free_time_billable_ratio", language)}</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
{(billableSeconds / 3600).toFixed(1)}
{"h "}
{language === "ar" ? "مفوترة" : "facturables"}
</span>
</div>
<div>
<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{billableRatio}
%
</div>
<p className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">{language === "ar" ? "نسبة الساعات القابلة للفوترة" : "Taux horaire valorisé"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{t("free_time_unbilled_total", language)}</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
{unbilledHours > 0 ? `${unbilledHours}h ${language === "ar" ? "جاهزة" : "à facturer"}` : language === "ar" ? "مفوتر بالكامل" : "À jour"}
</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{unbilledHours}
h
</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>{t("free_time_awaiting_invoice", language)}</span>
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div className="flex items-center gap-2">
<Clock size={16} className="text-[#d4522f]" />
<h3 className="text-sm font-bold text-black dark:text-white">{t("free_time_recent_logs", language)}</h3>
<span className="text-xs text-black/55 dark:text-white/55 font-semibold tabular-nums ml-1">
(
{sortedLogs.length}
)
</span>
</div>
<div className="flex items-center gap-2.5 flex-wrap">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={t("free_time_ph_search_logs", language)} shutSize={36} openWidth={220} />
{unbilledLogs.length > 0 && /* @__PURE__ */ <button type="button" onClick={() => handleBillClientUnbilled(unbilledLogs[0].clientId)} className="h-9 px-3.5 rounded-full bg-[#d4522f] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs shrink-0">
<FileText size={13} />
<span>
{t("free_clients_quick_bill", language)}
{" ("}
{unbilledHours}
h)
</span>
</button>}
</div>
</div>
{selectedLogIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-neutral-900 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
<div className="flex items-center gap-3 text-xs font-semibold">
<span className="px-2 py-0.5 rounded-full bg-[#d4522f] text-white font-bold text-[11px]">{selectedLogIds.size}</span>
<span>
{language === "ar" ? "جلسة محددة" : language === "fr" ? "sessions sélectionnées" : "sessions selected"}
</span>
<button type="button" onClick={() => setSelectedLogIds(/* @__PURE__ */ new Set())} className="text-white/75 hover:text-white underline text-xs cursor-pointer ml-1">
{language === "ar" ? "إلغاء التحديد" : language === "fr" ? "Désélectionner" : "Deselect all"}
</button>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={handleBatchBillSelected} className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
<FileText size={13} />
<span>
{language === "ar" ? "فوترة المحدد" : language === "fr" ? "Facturer la sélection" : "Batch Bill"}
</span>
</button>
<button type="button" onClick={handleBatchDeleteLogs} className="h-8 px-3 rounded-full bg-rose-600/80 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
<Trash2 size={13} />
<span>{language === "ar" ? "حذف" : language === "fr" ? "Supprimer" : "Batch Delete"}</span>
</button>
</div>
</div>}
<UniversalDataCollection items={sortedLogs} keyExtractor={(entry) => entry.id} columns={timeLogColumns} selectedIds={selectedLogIds} onSelectionChange={setSelectedLogIds} isPinned={(entry) => pinnedLogIds.has(entry.id)} onTogglePin={handleTogglePinLog} sortBy={timeLogSortBy} sortDirection={timeLogSortDir} onSortChange={(colKey) => {
							if (timeLogSortBy === colKey) setTimeLogSortDir((prev) => prev === "asc" ? "desc" : "asc");
							else {
								setTimeLogSortBy(colKey);
								setTimeLogSortDir("desc");
							}
						}} showViewToggle emptyTitle={t("free_time_empty_logs", language)} emptyDescription={t("free_time_empty_logs_desc", language)} renderCard={(entry) => {
							const isPinned = pinnedLogIds.has(entry.id);
							return /* @__PURE__ */ <div key={entry.id} className="p-5 rounded-[22px] border border-[#E6DED6] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 shadow-2xs relative space-y-3">
{isPinned && /* @__PURE__ */ <div className="absolute top-3 left-3 text-[#d4522f]"><Pin size={12} className="fill-[#d4522f]" /></div>}
<div className="flex items-center justify-between pl-4">
<span className="font-mono text-base font-black text-[#d4522f] tabular-nums">{formatDuration(entry.durationSeconds)}</span>
<span className="text-xs text-black/55 dark:text-white/55 tabular-nums">{entry.date}</span>
</div>
<div>
<h4 className="text-sm font-bold text-black dark:text-white truncate">{entry.clientName}</h4>
<p className="text-xs text-black/55 dark:text-white/55 truncate">{entry.projectTitle}</p>
</div>
<p className="text-xs text-black/70 dark:text-white/75 line-clamp-2">{entry.taskDescription}</p>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
<div>
{entry.isInvoiced ? /* @__PURE__ */ <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
{t("free_kanban_invoiced", language)}
</span> : entry.isBillable ? /* @__PURE__ */ <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
<span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
{t("free_time_unbilled_badge", language)}
</span> : /* @__PURE__ */ <span className="text-[11px] text-black/55 dark:text-white/55">{t("free_time_non_billable", language)}</span>}
</div>
<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
<button type="button" disabled={entry.isInvoiced} onClick={() => {
													setLogToEdit(entry);
													const totalMin = Math.round(entry.durationSeconds / 60);
													setEditLogForm({
														taskDescription: entry.taskDescription,
														hours: Math.floor(totalMin / 60),
														minutes: totalMin % 60,
														date: entry.date,
														isBillable: entry.isBillable
													});
												}} className={`p-1.5 rounded-lg transition-colors ${entry.isInvoiced ? "opacity-30 cursor-not-allowed text-black/55 dark:text-white/55" : "text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"}`}><Edit2 size={13} /></button>
<button type="button" disabled={entry.isInvoiced} onClick={() => setLogToDelete(entry)} className={`p-1.5 rounded-lg transition-colors ${entry.isInvoiced ? "opacity-30 cursor-not-allowed text-black/55 dark:text-white/55" : "text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"}`}><Trash2 size={13} /></button>
</div>
</div>
</div>;
						}} />
</div>
{isManualModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
<div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<h3 className="text-base font-bold text-black dark:text-white">{t("free_time_modal_manual_title", language)}</h3>
<button type="button" onClick={() => setIsManualModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"><X size={16} /></button>
</div>
<form onSubmit={handleManualLogSubmit} className="space-y-3.5 text-xs">
<LabelSelect field="Client" label={`${t("free_invoice_client", language)} *`} placeholder={t("free_time_ph_select_client", language)} value={manualForm.clientId} onChange={(val) => handleManualClientChange(val?.target?.value ?? String(val))} options={freelanceClients.map((c) => ({
									value: c.id,
									label: c.name,
									sublabel: c.company || t("free_clients_private_badge", language)
								}))} searchable width="100%" height={40} corner={12} />
<LabelSelect field="Project" label={`${t("free_time_project_label", language)} *`} placeholder={t("free_time_ph_select_project", language)} value={manualForm.projectId} onChange={(val) => setManualForm((prev) => ({
									...prev,
									projectId: val?.target?.value ?? String(val)
								}))} options={availableManualProjects.map((p) => ({
									value: p.id,
									label: p.title,
									sublabel: `${p.pricingModel === "Fixed" ? t("free_deliv_pricing_fixed", language) : p.pricingModel === "Hourly" ? t("free_deliv_pricing_hourly", language) : t("free_deliv_pricing_retainer", language)} · ${p.clientName}`
								}))} searchable width="100%" height={40} corner={12} />
<LabelInput id="manual-task-summary" label={t("free_time_field_notes", language)} required placeholder={t("free_time_ph_task_summary", language)} value={manualForm.taskDescription} onChange={(e) => setManualForm((prev) => ({
									...prev,
									taskDescription: e?.target?.value ?? String(e)
								}))} width="100%" height={40} corner={12} />
<div className="grid grid-cols-2 gap-3">
<LabelInput id="manual-hours" label={t("free_time_field_hours", language)} type="number" min="0" value={manualForm.hours} onChange={(e) => setManualForm((prev) => ({
										...prev,
										hours: Number(e?.target?.value ?? e)
									}))} width="100%" height={40} corner={12} />
<LabelInput id="manual-minutes" label={t("free_time_field_minutes", language)} type="number" min="0" max="59" value={manualForm.minutes} onChange={(e) => setManualForm((prev) => ({
										...prev,
										minutes: Number(e?.target?.value ?? e)
									}))} width="100%" height={40} corner={12} />
</div>
<LabelInput id="manual-date" label={t("free_time_field_date", language)} type="date" value={manualForm.date} onChange={(e) => setManualForm((prev) => ({
									...prev,
									date: e?.target?.value ?? String(e)
								}))} width="100%" height={40} corner={12} />
<div className="flex items-center gap-2 pt-2">
<input type="checkbox" id="billableManual" checked={manualForm.isBillable} onChange={(e) => setManualForm({
										...manualForm,
										isBillable: e.target.checked
									})} className="rounded text-[#d4522f]" />
<label htmlFor="billableManual" className="font-medium text-black/70 dark:text-white/75">{t("free_time_billable", language)}</label>
</div>
<div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="outline" size="sm" type="button" onClick={() => setIsManualModalOpen(false)}>{t("common_cancel", language)}</AtriumButton>
<AtriumButton variant="primary" size="sm" glow type="submit">{t("common_save", language)}</AtriumButton>
</div>
</form>
</div>
</div>}
{logToEdit && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
<div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
<div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
<div>
<h3 className="text-base font-bold text-black dark:text-white">{t("free_time_edit_modal_title", language)}</h3>
<p className="text-xs text-black/55 dark:text-white/55">
{logToEdit.clientName}
{" · "}
{logToEdit.projectTitle}
</p>
</div>
<button type="button" onClick={() => setLogToEdit(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"><X size={16} /></button>
</div>
<form onSubmit={handleEditLogSubmit} className="space-y-3.5 text-xs">
<LabelInput id="edit-task-summary" label={t("free_time_field_notes", language)} required value={editLogForm.taskDescription} onChange={(e) => setEditLogForm((prev) => ({
									...prev,
									taskDescription: e?.target?.value ?? String(e)
								}))} width="100%" height={40} corner={12} />
<div className="grid grid-cols-2 gap-3">
<LabelInput id="edit-hours" label={t("free_time_field_hours", language)} type="number" min="0" value={editLogForm.hours} onChange={(e) => setEditLogForm((prev) => ({
										...prev,
										hours: Number(e?.target?.value ?? e)
									}))} width="100%" height={40} corner={12} />
<LabelInput id="edit-minutes" label={t("free_time_field_minutes", language)} type="number" min="0" max="59" value={editLogForm.minutes} onChange={(e) => setEditLogForm((prev) => ({
										...prev,
										minutes: Number(e?.target?.value ?? e)
									}))} width="100%" height={40} corner={12} />
</div>
<LabelInput id="edit-date" label={t("free_time_field_date", language)} type="date" value={editLogForm.date} onChange={(e) => setEditLogForm((prev) => ({
									...prev,
									date: e?.target?.value ?? String(e)
								}))} width="100%" height={40} corner={12} />
<div className="flex items-center gap-2 pt-2">
<input type="checkbox" id="billableEdit" checked={editLogForm.isBillable} onChange={(e) => setEditLogForm({
										...editLogForm,
										isBillable: e.target.checked
									})} className="rounded text-[#d4522f]" />
<label htmlFor="billableEdit" className="font-medium text-black/70 dark:text-white/75 cursor-pointer">{t("free_time_billable", language)}</label>
</div>
<div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="outline" size="sm" type="button" onClick={() => setLogToEdit(null)}>{t("common_cancel", language)}</AtriumButton>
<AtriumButton variant="primary" size="sm" glow type="submit">{t("common_save", language)}</AtriumButton>
</div>
</form>
</div>
</div>}
{logToDelete && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
<div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
<div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
<div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60"><AlertTriangle size={20} /></div>
<div>
<h3 className="text-base font-bold text-black dark:text-white">{t("free_time_delete_modal_title", language)}</h3>
<p className="text-xs text-black/55 dark:text-white/55">
{logToDelete.date}
{" · "}
{formatDuration(logToDelete.durationSeconds)}
</p>
</div>
</div>
<p className="text-xs text-black/70 dark:text-white/75 leading-relaxed">
{t("free_time_delete_modal_confirm", language)}
{" \""}
{logToDelete.taskDescription}
" (
{logToDelete.projectTitle}
)?
</p>
<div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="outline" size="sm" type="button" onClick={() => setLogToDelete(null)}>{t("common_cancel", language)}</AtriumButton>
<AtriumButton variant="danger" size="sm" type="button" onClick={() => {
									deleteTimeLog(logToDelete.id);
									setLogToDelete(null);
								}}>{t("common_delete", language)}</AtriumButton>
</div>
</div>
</div>}
</div>;
};
