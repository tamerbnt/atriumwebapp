import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMProject, PMPayrollBatch, PMExpense } from '../../../types/index';
import {
  TrendingUp,
  Radio,
  Users,
  AlertCircle,
  CheckCircle,
  Plus,
  ShieldCheck,
  Eye,
  X,
  FileText,
  Clock,
  Sparkles,
  DollarSign,
  ChevronRight,
  Filter,
  Download,
  Check,
  Ban,
  Calendar,
  Layers,
  ArrowUpRight,
  Building2,
  ChevronDown,
  Pin,
  Trash2,
  FolderKanban,
  Edit2,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiquidExportButton } from '../../ui/liquid/LiquidExportButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { SkeletonDashboardProject } from '../../ui/skeleton/StructuralSkeletons';
import {
  DashboardPod,
  DashboardMetricCard,
  DarkEspressoCard,
  HourlyCurveChart,
  PillBarHistogram,
  MonthlyAreaChart,
  DonutChart,
  GuardianCard,
} from '../../common/dashboard';

interface ProjectDirectionViewProps {
  initialTab?: 'dashboard' | 'projects' | 'new_project' | 'approvals' | 'reports';
}



export const ProjectDirectionView: React.FC<ProjectDirectionViewProps> = ({ initialTab = "dashboard" }) => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, pmProjects, pmMissions, pmTalents, pmPayrollBatches, pmExpenses, pmClients, staff, addPmProject, deletePmProject, batchDeletePmProjects, batchUpdatePmProjectStatus, approvePmExpense, rejectPmExpense, batchApprovePmExpenses, batchRejectPmExpenses, batchDeletePmExpenses, approvePmPayrollBatch, batchApprovePmPayrollBatches, resetPmMockData, activePmSubScreen, setActivePmSubScreen, showToast, isSyncing, networkMode, isSyncTimeout, lastSyncedAt, retryCloudSync } = useAtriumStore();
	const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: pmProjects.length > 0
	});
	const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
	const [selectedReceiptUrl, setSelectedReceiptUrl] = React.useState<any>(null);
	const [rejectionModalId, setRejectionModalId] = React.useState<any>(null);
	const [rejectionReason, setRejectionReason] = React.useState("");
	const currentScreen = activePmSubScreen === "new_project" || initialTab === "new_project" ? "new_project" : activePmSubScreen === "approvals" || initialTab === "approvals" ? "approvals" : activePmSubScreen === "reports" || initialTab === "reports" ? "reports" : activePmSubScreen === "projects" || initialTab === "projects" ? "projects" : "dashboard";
	const [directionPeriod, setDirectionPeriod] = React.useState("today");
	const [projectSearch, setProjectSearch] = React.useState("");
	const [projectStatusFilter, setProjectStatusFilter] = React.useState("all");
	const [selectedProjectIds, setSelectedProjectIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedProjectIds, setPinnedProjectIds] = React.useState(/* @__PURE__ */ new Set());
	const [projectSortBy, setProjectSortBy] = React.useState("project");
	const [projectSortDir, setProjectSortDir] = React.useState("asc");
	const [approvalsTab, setApprovalsTab] = React.useState("all");
	const [approvalSearch, setApprovalSearch] = React.useState("");
	const [selectedApprovalBatchIds, setSelectedApprovalBatchIds] = React.useState(/* @__PURE__ */ new Set());
	const [selectedApprovalExpenseIds, setSelectedApprovalExpenseIds] = React.useState(/* @__PURE__ */ new Set());
	const [validatedPaieIds, setValidatedPaieIds] = React.useState<any[]>([]);
	const [quickBriefTitle, setQuickBriefTitle] = React.useState("Roadshow 5G Ouest — Rollup, A5, Kakemonos & Stands");
	const [quickBriefSuccess, setQuickBriefSuccess] = React.useState(false);
	const [newProjectTitle, setNewProjectTitle] = React.useState("");
	const [newProjectClientId, setNewProjectClientId] = React.useState(pmClients[0]?.id || "");
	const [newProjectScope, setNewProjectScope] = React.useState("");
	const [newProjectBudgetCap, setNewProjectBudgetCap] = React.useState("3500000");
	const [newProjectMaxField, setNewProjectMaxField] = React.useState("650000");
	const [newProjectMargin, setNewProjectMargin] = React.useState("30");
	const [newProjectStartDate, setNewProjectStartDate] = React.useState("2026-11-01");
	const [newProjectEndDate, setNewProjectEndDate] = React.useState("2026-12-15");
	const [newProjectPmId, setNewProjectPmId] = React.useState("stf_pm_01");
	const [newProjectCreaId, setNewProjectCreaId] = React.useState("stf_crea_01");
	const [projectCreatedSuccess, setProjectCreatedSuccess] = React.useState(false);
	const totalTurnoverDzd = pmProjects.reduce((acc, p) => acc + p.budgetCapDzd, 0);
	pmMissions.filter((m) => m.status === "live_today").length;
	pmTalents.filter((t) => t.status === "active").length;
	const pendingPayrollBatches = React.useMemo(() => {
		return pmPayrollBatches.filter((b) => {
			const matchesStatus = b.status === "pending_direction_approval";
			const matchesSearch = !approvalSearch.trim() || b.batchNumber.toLowerCase().includes(approvalSearch.toLowerCase()) || b.projectTitle.toLowerCase().includes(approvalSearch.toLowerCase()) || b.missionCode.toLowerCase().includes(approvalSearch.toLowerCase());
			return matchesStatus && matchesSearch;
		});
	}, [pmPayrollBatches, approvalSearch]);
	const pendingExpenses = React.useMemo(() => {
		return pmExpenses.filter((e) => {
			const matchesStatus = e.status === "pending_direction_approval";
			const matchesSearch = !approvalSearch.trim() || e.title.toLowerCase().includes(approvalSearch.toLowerCase()) || e.category.toLowerCase().includes(approvalSearch.toLowerCase()) || e.declaredByUserName.toLowerCase().includes(approvalSearch.toLowerCase());
			return matchesStatus && matchesSearch;
		});
	}, [pmExpenses, approvalSearch]);
	const totalPendingApprovals = pendingPayrollBatches.length + pendingExpenses.length;
	const filteredProjects = React.useMemo(() => {
		return pmProjects.filter((p) => {
			const q = projectSearch.toLowerCase().trim();
			const matchSearch = !q || p.title.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.projectManagerName.toLowerCase().includes(q) || p.leadCreativeName.toLowerCase().includes(q);
			const matchStatus = projectStatusFilter === "all" || p.status === projectStatusFilter || projectStatusFilter === "production" && (p.status === "production" || p.status === "crea_active" || p.status === "print_ready") || projectStatusFilter === "field_execution" && (p.status === "field_execution" || p.status === "field_active") || projectStatusFilter === "completed" && (p.status === "completed" || p.status === "closed");
			return matchSearch && matchStatus;
		});
	}, [
		pmProjects,
		projectSearch,
		projectStatusFilter
	]);
	const sortedProjects = React.useMemo(() => {
		return [...filteredProjects].sort((a, b) => {
			const aPinned = pinnedProjectIds.has(a.id);
			const bPinned = pinnedProjectIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (projectSortBy === "project") {
				const cmp = a.title.localeCompare(b.title);
				return projectSortDir === "asc" ? cmp : -cmp;
			}
			if (projectSortBy === "budget") return projectSortDir === "asc" ? a.budgetCapDzd - b.budgetCapDzd : b.budgetCapDzd - a.budgetCapDzd;
			if (projectSortBy === "margin") return projectSortDir === "asc" ? a.targetGrossMarginPercent - b.targetGrossMarginPercent : b.targetGrossMarginPercent - a.targetGrossMarginPercent;
			if (projectSortBy === "deadline") return projectSortDir === "asc" ? a.endDate.localeCompare(b.endDate) : b.endDate.localeCompare(a.endDate);
			if (projectSortBy === "status") return projectSortDir === "asc" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
			return 0;
		});
	}, [
		filteredProjects,
		pinnedProjectIds,
		projectSortBy,
		projectSortDir
	]);
	const projectColumns = React.useMemo(() => [
		{
			key: "project",
			header: "Projet & Client",
			width: "2.5*",
			minWidth: "240px",
			sortable: true,
			renderCell: (proj: any) => {
				const isPinned = pinnedProjectIds.has(proj.id);
				return /* @__PURE__ */ <div className="flex items-center gap-3">
<button type="button" onClick={(e) => {
								e.stopPropagation();
								setPinnedProjectIds((prev) => {
									const next = new Set(prev);
									if (next.has(proj.id)) next.delete(proj.id);
									else next.add(proj.id);
									return next;
								});
							}} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isPinned ? "text-[#d4522f] bg-[#d4522f]/10" : "text-black/55 dark:text-white/55 hover:text-black/80 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800"}`} title={isPinned ? "Détacher le projet" : "Épingler en haut"}><Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} /></button>
<div className="w-9 h-9 rounded-xl bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0">{proj.title.substring(0, 2).toUpperCase()}</div>
<div className="min-w-0">
<div className="font-semibold text-black dark:text-white text-xs truncate max-w-[200px]">{proj.title}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 truncate">
{proj.clientName}
{" · "}
<span className="font-mono text-[10px]">{proj.id.slice(0, 8)}</span>
</div>
</div>
</div>;
			}
		},
		{
			key: "budget",
			header: "Plafond Budgétaire",
			width: "1.5*",
			minWidth: "150px",
			sortable: true,
			align: "right",
			renderCell: (proj: any) => /* @__PURE__ */ <div className="font-mono text-xs font-semibold text-black dark:text-white tabular-nums">{formatMoney(proj.budgetCapDzd, "DZD")}</div>
		},
		{
			key: "margin",
			header: "Marge Brute",
			width: "1*",
			minWidth: "110px",
			sortable: true,
			align: "center",
			renderCell: (proj: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
{proj.targetGrossMarginPercent}
%
</span>
		},
		{
			key: "timeline",
			header: "Période & Clôture",
			width: "1.5*",
			minWidth: "160px",
			sortable: true,
			renderCell: (proj: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75 font-mono">
{proj.startDate}
{" "}
<span className="text-black/55 dark:text-white/55">➔</span>
{" "}
{proj.endDate}
</div>
		},
		{
			key: "leads",
			header: "Équipe Responsable",
			width: "1.5*",
			minWidth: "170px",
			renderCell: (proj: any) => /* @__PURE__ */ <div className="text-[11px] text-black/70 dark:text-white/75 space-y-0.5">
<div>
<span className="text-black/55 dark:text-white/55 font-medium">CDP:</span>
{" "}
{proj.projectManagerName}
</div>
<div>
<span className="text-black/55 dark:text-white/55 font-medium">Créa:</span>
{" "}
{proj.leadCreativeName}
</div>
</div>
		},
		{
			key: "status",
			header: "Statut Campagne",
			width: "1.2*",
			minWidth: "130px",
			sortable: true,
			align: "center",
			renderCell: (proj: any) => {
				const badge = ({
					framing: {
						label: "Cahier des charges",
						bg: "bg-[#F3EDE7] dark:bg-neutral-800",
						text: "text-black/70 dark:text-white/75"
					},
					creative_kv: {
						label: "KV Créa",
						bg: "bg-amber-100 dark:bg-amber-950/60",
						text: "text-amber-700 dark:text-amber-300"
					},
					client_validated: {
						label: "Validé Client",
						bg: "bg-blue-100 dark:bg-blue-950/60",
						text: "text-blue-700 dark:text-blue-300"
					},
					production: {
						label: "En Production",
						bg: "bg-purple-100 dark:bg-purple-950/60",
						text: "text-purple-700 dark:text-purple-300"
					},
					field_execution: {
						label: "Terrain Live",
						bg: "bg-red-100 dark:bg-red-950/60",
						text: "text-red-700 dark:text-red-300"
					},
					completed: {
						label: "Clôturé",
						bg: "bg-emerald-100 dark:bg-emerald-950/60",
						text: "text-emerald-700 dark:text-emerald-300"
					},
					archived: {
						label: "Archivé",
						bg: "bg-[#F3EDE7] dark:bg-neutral-800",
						text: "text-black/55 dark:text-white/55"
					}
				} as Record<string, any>)[proj.status] || {
					label: proj.status,
					bg: "bg-[#F3EDE7]",
					text: "text-black/70 dark:text-white/75"
				};
				return /* @__PURE__ */ <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
			}
		}
	], [pinnedProjectIds]);
	const handleCreateProject = (e: any) => {
		e.preventDefault();
		const client = pmClients.find((c) => c.id === newProjectClientId) || pmClients[0];
		const pmMember = staff.find((s) => s.id === newProjectPmId) || { fullName: "Amine Meziane (PM)" };
		const creaMember = staff.find((s) => s.id === newProjectCreaId) || { fullName: "Lina Hadj-Ali (Créa)" };
		addPmProject({
			tenantId: "acc_01",
			facilityId: "branch_agency_main",
			clientId: client?.id || "pm_cli_01",
			clientName: client?.name || "Client National",
			title: newProjectTitle || "Nouvelle Campagne Terrain",
			scopeOfWork: newProjectScope || "Cahier des charges standard activation.",
			budgetCapDzd: Number(newProjectBudgetCap) || 2e6,
			maxFieldExpensesDzd: Number(newProjectMaxField) || 4e5,
			targetGrossMarginPercent: Number(newProjectMargin) || 28,
			startDate: newProjectStartDate,
			endDate: newProjectEndDate,
			kvDeadline: newProjectStartDate,
			printDeadline: newProjectStartDate,
			executionStartDate: newProjectStartDate,
			projectManagerId: newProjectPmId,
			projectManagerName: pmMember.fullName,
			leadCreativeId: newProjectCreaId,
			leadCreativeName: creaMember.fullName,
			status: "framing"
		});
		setProjectCreatedSuccess(true);
		setTimeout(() => {
			setProjectCreatedSuccess(false);
			setActivePmSubScreen("projects");
		}, 1800);
		setNewProjectTitle("");
		setNewProjectScope("");
	};
	const handleRejectConfirm = () => {
		if (rejectionModalId) {
			rejectPmExpense(rejectionModalId, rejectionReason || "Non conforme au cahier des charges");
			setRejectionModalId(null);
			setRejectionReason("");
		}
	};
	const handleExportProjectsCsv = () => {
		const headers = [
			"ID Projet",
			"Titre de la Campagne",
			"Client",
			"Plafond Budgétaire DZD",
			"Dépenses Terrain Max DZD",
			"Marge Cible %",
			"Date Début",
			"Date Fin",
			"Chef de Projet",
			"Directeur Artistique",
			"Statut"
		];
		const rows = sortedProjects.map((p) => [
			`"${p.id}"`,
			`"${p.title.replace(/"/g, "\"\"")}"`,
			`"${p.clientName.replace(/"/g, "\"\"")}"`,
			p.budgetCapDzd,
			p.maxFieldExpensesDzd,
			p.targetGrossMarginPercent,
			p.startDate,
			p.endDate,
			`"${p.projectManagerName.replace(/"/g, "\"\"")}"`,
			`"${p.leadCreativeName.replace(/"/g, "\"\"")}"`,
			p.status
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `portefeuille_projets_nch_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	const handleExportAuditCsv = () => {
		const csvContent = "﻿" + [
			"Type,Ref,Projet,Montant DZD,Statut",
			...pendingPayrollBatches.map((b) => `Paie,${b.batchNumber},${b.projectTitle},${b.totalAmountDzd},En attente`),
			...pendingExpenses.map((e) => `Achat,${e.title},${e.projectTitle},${e.amountDzd},En attente`)
		].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `audit_direction_nch_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	if (showSkeleton && (pmProjects.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<SkeletonDashboardProject />
</div>;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<OfflineRetryBanner isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync} />
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
<div>
<div className="flex items-center gap-3.5">
{currentScreen === "dashboard" && /* @__PURE__ */ <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 flex items-center justify-center text-black dark:text-white">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
<rect x="3" y="3" width="7" height="7" rx="1.5" />
<rect x="14" y="3" width="7" height="7" rx="1.5" />
<rect x="14" y="14" width="7" height="7" rx="1.5" />
<rect x="3" y="14" width="7" height="7" rx="1.5" />
</svg>
</div>}
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{currentScreen === "dashboard" ? (language === "ar" ? "الرئيسية" : language === "en" ? "Home" : "Tableau") : currentScreen === "projects" ? (language === "ar" ? "المشاريع" : language === "en" ? "Projects" : "Projets") : currentScreen === "new_project" ? (language === "ar" ? "مشروع جديد" : language === "en" ? "New Brief" : "Nouveau Brief") : currentScreen === "approvals" ? (language === "ar" ? "الموافقات" : language === "en" ? "Approvals" : "Validations") : (language === "ar" ? "التقارير" : language === "en" ? "Reports" : "Rapports")}
</h1>
</div>
</div>
<div className="flex items-center gap-2.5 flex-wrap">
<LiquidExportButton size="sm" onExport={currentScreen === "projects" ? handleExportProjectsCsv : handleExportAuditCsv} idleLabel={language === "ar" ? "تصدير CSV" : language === "fr" ? "EXPORTER CSV" : "EXPORT CSV"} id="pm-dir-export-btn" />
</div>
</div>
<div className="flex border-b border-[#E6DED6] dark:border-neutral-800 gap-1 overflow-x-auto">
{[
					{
						id: "dashboard",
						label: t("nav_dashboard", language),
						icon: TrendingUp
					},
					{
						id: "projects",
						label: "Portefeuille Projets",
						icon: FolderKanban,
						count: pmProjects.length
					},
					{
						id: "approvals",
						label: "Approbations & Décaissements",
						icon: ShieldCheck,
						count: totalPendingApprovals
					},
					{
						id: "reports",
						label: "Rapports & Marges",
						icon: Layers
					},
					{
						id: "new_project",
						label: "+ Nouveau Projet",
						icon: Plus
					}
				].map((tab) => {
					const Icon = tab.icon;
					const isActive = currentScreen === tab.id;
					return /* @__PURE__ */ <button key={tab.id} onClick={() => setActivePmSubScreen(tab.id)} className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${isActive ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>
<Icon className="w-4 h-4" />
<span>{tab.label}</span>
{tab.count !== void 0 && tab.count > 0 && /* @__PURE__ */ <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${tab.id === "approvals" ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300" : "bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75"}`}>{tab.count}</span>}
</button>;
				})}
</div>
{currentScreen === "dashboard" && /* @__PURE__ */ <div className="space-y-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "حركة تسليم المشاريع والمهام" : language === "fr" ? "Projets & Livrables" : "Active Projects"} icon={<TrendingUp size={18} className="text-[#d4522f]" />} badge={<span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
{pmProjects.length}
{" "}
{language === "ar" ? "مشاريع نشطة" : "Campagnes Actives"}
</span>} rightControls={<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{pmTalents.length}
{" "}
{language === "ar" ? "فريق معتمد" : "Talents Mobilisés"}
</span>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex items-center justify-between">
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "الحملات قيد التنفيذ" : "Campagnes Terrain"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{pmProjects.length}</span>
<span className="text-xs text-black/55 dark:text-white/55">/ 12 obj</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
{"● "}
{language === "ar" ? "تسليم في الموعد" : "Dans les délais"}
</span>
</div>
<div className="w-px h-12 bg-neutral-200 dark:bg-neutral-700 mx-4" />
<div className="flex-1">
<span className="text-xs font-medium text-black/70 dark:text-white/75 block mb-1">{language === "ar" ? "تأشيرات معلقة" : "Approbations Requises"}</span>
<div className="flex items-baseline gap-2">
<span className="text-3xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{totalPendingApprovals}</span>
<span className="text-xs text-black/55 dark:text-white/55">{language === "ar" ? "ملفات" : "décaissements"}</span>
</div>
<span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">{language === "ar" ? "بانتظار الإدارة" : "En attente DG"}</span>
</div>
</div>
<div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700">
<span className="text-[11px] text-black/55 dark:text-white/55 block mb-2">
{language === "ar" ? "كثافة نشاط الفريق على مدار 24 ساعة" : "Courbe horaire de cadence agence (24h)"}
</span>
<HourlyCurveChart data={[
												0,
												2,
												8,
												6,
												2
											]} color="#d4522f" />
</div>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-1.5">
<span className="text-xs font-medium text-black/70 dark:text-white/75">
{language === "ar" ? "نسبة إنجاز مراحل المشاريع" : "Burn-Down & Avancement Lots"}
</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">88%</span>
</div>
<div className="w-full bg-neutral-100 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mb-1">
<div className="bg-[#d4522f] h-full rounded-full transition-all duration-500" style={{ width: "88%" }} />
</div>
<div className="flex justify-between text-[11px] text-black/55 dark:text-white/55">
<span>
{"88% "}
{language === "ar" ? "منجز" : "réalisé"}
</span>
<span>Target 95%</span>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "محفظة المشاريع والعملاء" : language === "fr" ? "Portefeuille & Contrats" : "Portfolio & Contracts"} icon={<FolderKanban size={18} className="text-[#d4522f]" />} rightControls={<span className="text-xs font-semibold text-black/70 dark:text-white/75">58 Wilayas Coverage</span>} className="flex-1 flex flex-col justify-between">
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<DashboardMetricCard label={language === "ar" ? "حملات نشطة" : "Campagnes Actives"} value={pmProjects.length} badgeText={language === "ar" ? "سارية" : "En cours"} badgeVariant="success" tooltip={language === "ar" ? "مشاريع قيد التنفيذ" : "Projets déployés"} />
<DashboardMetricCard label={language === "ar" ? "طاقم العمل الميداني" : "Talents Mobilisés"} value={pmTalents.length} badgeText="Terrain" badgeVariant="neutral" tooltip={language === "ar" ? "مشرفين ومنشطين معتمدين" : "Superviseurs qualifiés"} />
<DarkEspressoCard label={language === "ar" ? "حجم التعاقدات المعتمدة" : "Budget Engagé Validé"} value={formatMoney(totalTurnoverDzd)} sublabel={language === "ar" ? "عقود مؤشرة" : "Volume d’affaires"} badgeText="Contrats" badgeVariant="neutral" />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex justify-between items-center mb-3">
<span className="text-xs font-semibold text-black/70 dark:text-white">
{language === "ar" ? "إنجاز المراحل أسبوعياً" : "Jalons & Livrables clôturés (4 semaines)"}
</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{language === "ar" ? "مقارنة شهرية" : "4 dernières semaines"}</span>
</div>
<PillBarHistogram data={[
											{
												week: "Semaine 1",
												value: 8
											},
											{
												week: "Semaine 2",
												value: 14
											},
											{
												week: "Semaine 3",
												value: 11
											},
											{
												week: "Semaine 4",
												value: 16
											}
										]} maxScale={20} barColor="#d4522f" />
</div>
</div>
</DashboardPod>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
<div className="lg:col-span-5 flex flex-col">
<DashboardPod title={language === "ar" ? "الإيرادات والأرباح" : language === "fr" ? "Revenus & Marges" : "Revenue & Profit"} subtitle={language === "ar" ? "تتبع الإيرادات المفوترة، تكاليف المواهب وهامش الربحية" : language === "fr" ? "Suivi de la facturation client, coûts talents et marge nette" : "Billing milestones, talent fees and gross margins"} icon={<DollarSign size={18} className="text-[#d4522f]" />} rightControls={<span className="text-xs font-semibold text-black/70 dark:text-white/75 font-mono">{language === "ar" ? "نوفمبر 2026" : "NOVEMBRE 2026"}</span>}>
<div className="space-y-4">
<div className="grid grid-cols-3 gap-2">
<DashboardMetricCard label={language === "ar" ? "صافي الهامش" : language === "fr" ? "Marge Nette" : "Net Margin"} value={`${Math.round(totalTurnoverDzd * .42).toLocaleString()} DA`} subtext={language === "ar" ? "42% نسبة الهامش" : "42.0% ratio"} trend="+8.4%" trendDirection="up" />
<DashboardMetricCard label={language === "ar" ? "المفوتر" : language === "fr" ? "Facturé" : "Invoiced"} value={`${totalTurnoverDzd.toLocaleString()} DA`} subtext={language === "ar" ? "ميزانيات العقود" : "Engagé client"} />
<DashboardMetricCard label={language === "ar" ? "تكاليف الإنتاج" : language === "fr" ? "Coûts Engagés" : "Talent & Ops"} value={`${Math.round(totalTurnoverDzd * .58).toLocaleString()} DA`} subtext={language === "ar" ? "رواتب ونفقات" : "Paies & frais"} trendDirection="neutral" />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<div className="flex items-center justify-between mb-2">
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "الفوترة والتحصيل (30 يوماً)" : language === "fr" ? "Facturation & Recouvrement (30j)" : "Billing & Collections (30d)"}
</span>
<span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-semibold">+12.6% M/M</span>
</div>
<MonthlyAreaChart data={[
												8e4,
												12e4,
												15e4,
												19e4,
												24e4,
												28e4,
												31e4,
												36e4,
												42e4,
												48e4,
												51e4,
												56e4,
												62e4,
												68e4,
												71e4,
												75e4,
												82e4,
												89e4,
												94e4,
												99e4,
												105e4,
												112e4,
												118e4,
												124e4,
												131e4,
												138e4,
												142e4,
												149e4,
												156e4,
												totalTurnoverDzd || 165e4
											]} currency="DA" color="#d4522f" />
</div>
<div className="grid grid-cols-2 gap-2 pt-1">
<div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<span className="text-[11px] text-black/70 dark:text-white/75 block">
{language === "ar" ? "نسبة التحصيل" : language === "fr" ? "Taux de Recouvrement" : "Collection Rate"}
</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">92.4%</span>
<span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">{language === "ar" ? "ممتاز" : "Optimal"}</span>
</div>
<div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<span className="text-[11px] text-black/70 dark:text-white/75 block">
{language === "ar" ? "متوسط السداد (DSO)" : language === "fr" ? "Délai Paiement Client" : "Average DSO"}
</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">28j</span>
<span className="text-[10px] text-blue-600 font-semibold block mt-0.5">{language === "ar" ? "تحت الهدف" : "< 30 jours"}</span>
</div>
<div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<span className="text-[11px] text-black/70 dark:text-white/75 block">
{language === "ar" ? "انحراف الميزانية" : language === "fr" ? "Dérapage Budgétaire" : "Budget Variance"}
</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">0.0%</span>
<span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">{language === "ar" ? "مضبوط" : "Sous contrôle"}</span>
</div>
<div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<span className="text-[11px] text-black/70 dark:text-white/75 block">
{language === "ar" ? "المشاريع الرابحة" : language === "fr" ? "Projets Rentables" : "Profitable Projects"}
</span>
<span className="text-base font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">94%</span>
<span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">↗ +4.0%</span>
</div>
</div>
</div>
</DashboardPod>
</div>
<div className="lg:col-span-7 flex flex-col">
<DashboardPod title={language === "ar" ? "الفريق والميزانية" : language === "fr" ? "Équipe & Budget" : "Insights & Budget"} subtitle={language === "ar" ? "توزيع الموارد حسب التخصص وحماية هوامش المشاريع" : language === "fr" ? "Répartition par pôle, cadence créative et prévention des dépassements" : "Workload distribution, creative cadence and runaway guard"} icon={<ShieldCheck size={18} className="text-[#d4522f]" />}>
<div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-3.5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm">
<span className="text-xs font-semibold text-black/70 dark:text-white/75 block mb-2">
{language === "ar" ? "توزيع ساعات العمل" : language === "fr" ? "Répartition Heures / Pôle" : "Hours by Discipline"}
</span>
<DonutChart segments={[
												{
													label: language === "ar" ? "تصميم وهوية" : "Key Visual / UI",
													value: 45,
													color: "#d4522f"
												},
												{
													label: language === "ar" ? "تطوير وإنتاج" : "Dev / Motion",
													value: 30,
													color: "#6366F1"
												},
												{
													label: language === "ar" ? "استراتيجية وإدارة" : "Stratégie & PM",
													value: 15,
													color: "#10B981"
												},
												{
													label: language === "ar" ? "مراجعة وتدقيق" : "QA & Recette",
													value: 10,
													color: "#F59E0B"
												}
											]} size={110} />
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[18px] p-3.5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-sm flex flex-col justify-between">
<span className="text-xs font-semibold text-black/70 dark:text-white/75 block mb-2">
{language === "ar" ? "وتيرة إنجاز المهام (أسبوعياً)" : language === "fr" ? "Cadence Livrables / Semaine" : "Weekly Deliverable Cadence"}
</span>
<PillBarHistogram bars={[
												{
													label: language === "ar" ? "أسبوع 1" : "Sem 1",
													value: 14
												},
												{
													label: language === "ar" ? "أسبوع 2" : "Sem 2",
													value: 18
												},
												{
													label: language === "ar" ? "أسبوع 3" : "Sem 3",
													value: 16
												},
												{
													label: language === "ar" ? "أسبوع 4" : "Sem 4",
													value: 20,
													highlight: true
												}
											]} activeColor="#d4522f" />
</div>
</div>
<GuardianCard title={language === "ar" ? "مراقبة الميزانية" : language === "fr" ? "Suivi Budget" : "Budget Watch"} subtitle={pendingPayrollBatches.length > 0 ? language === "ar" ? `تنبيه: يوجد ${pendingPayrollBatches.length} دفعة رواتب معلقة تتطلب مصادقة الإدارة العامة.` : `${pendingPayrollBatches.length} lot(s) de paie en attente de visa direction.` : language === "ar" ? "ممتاز! جميع الميزانيات ونفقات المواهب مطابقة لسقوف العقود." : "Excellente gestion: tous les jalons livrables sont dans l'enveloppe budgétaire."} score={pendingPayrollBatches.length > 0 ? 88 : 96} scoreLabel={language === "ar" ? "معدل الحماية" : "Conformité"} gaugeColor={pendingPayrollBatches.length > 0 ? "#F59E0B" : "#10B981"} onToggle={() => showToast(language === "ar" ? "تم تحديث مراقبة الميزانية" : "Suivi budgétaire actif", "info")} />
</div>
</DashboardPod>
</div>
</div>
</div>}
{currentScreen === "projects" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{language === "ar" ? "سجل محفظة المشاريع والتعاقدات" : "Portefeuille Projets & Gouvernance Grands Comptes"}
</h2>
</div>
<LiveSegmentedControl size="sm" value={projectStatusFilter} onValueChange={(val) => setProjectStatusFilter(val)} options={[
								{
									value: "all",
									label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
									tooltip: language === "ar" ? "جميع المشاريع" : language === "fr" ? "Tous les comptes" : "All accounts",
									count: pmProjects.length
								},
								{
									value: "framing",
									label: language === "ar" ? "تأطير" : language === "fr" ? "Cadrage" : "Scoping",
									tooltip: language === "ar" ? "دفتر الشروط" : language === "fr" ? "Cahier des charges" : "Project specifications",
									count: pmProjects.filter((p) => p.status === "framing").length
								},
								{
									value: "production",
									label: language === "ar" ? "إنتاج" : language === "fr" ? "Production" : "Production",
									tooltip: language === "ar" ? "قيد الإنتاج" : language === "fr" ? "En production" : "In production",
									count: pmProjects.filter((p) => p.status === "production" || p.status === "crea_active" || p.status === "print_ready").length
								},
								{
									value: "field_execution",
									label: language === "ar" ? "الميدان" : language === "fr" ? "Terrain" : "Field",
									tooltip: language === "ar" ? "الميدان الحي" : language === "fr" ? "Terrain live" : "Live field execution",
									count: pmProjects.filter((p) => p.status === "field_execution" || p.status === "field_active").length
								},
								{
									value: "completed",
									label: language === "ar" ? "مكتملة" : language === "fr" ? "Clôturés" : "Closed",
									tooltip: language === "ar" ? "مكتملة ومقفلة" : language === "fr" ? "Clôturés" : "Completed & closed",
									count: pmProjects.filter((p) => p.status === "completed" || p.status === "closed").length
								}
							]} />
</div>
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs">
<div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
<Seek value={projectSearch} onChange={setProjectSearch} placeholder="Rechercher par campagne, client ou responsable..." openWidth={360} shutSize={38} />
<FilterSelect label="Statut" value={projectStatusFilter} onChange={(val) => setProjectStatusFilter(typeof val === "string" ? val : val.target?.value || val)} options={[
									{
										value: "all",
										label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
										tooltip: language === "ar" ? "جميع الحالات" : language === "fr" ? "Tous les statuts" : "All statuses"
									},
									{
										value: "framing",
										label: language === "ar" ? "تأطير" : language === "fr" ? "Cadrage" : "Scoping",
										tooltip: language === "ar" ? "دفتر الشروط" : language === "fr" ? "Cahier des charges" : "Project specifications"
									},
									{
										value: "creative_kv",
										label: language === "ar" ? "تصميم" : language === "fr" ? "Créa" : "Creative",
										tooltip: language === "ar" ? "تصميم مفتاح الحملة" : language === "fr" ? "KV Créa" : "Key visual creative"
									},
									{
										value: "client_validated",
										label: language === "ar" ? "مُصدّق" : language === "fr" ? "Validé" : "Approved",
										tooltip: language === "ar" ? "مصادق من العميل" : language === "fr" ? "Validé Client" : "Client approved"
									},
									{
										value: "production",
										label: language === "ar" ? "إنتاج" : language === "fr" ? "Production" : "Production",
										tooltip: language === "ar" ? "قيد الإنتاج" : language === "fr" ? "En Production" : "In production"
									},
									{
										value: "field_execution",
										label: language === "ar" ? "ميدان" : language === "fr" ? "Terrain" : "Field",
										tooltip: language === "ar" ? "التنفيذ الميداني" : language === "fr" ? "Terrain Live" : "Live field execution"
									},
									{
										value: "completed",
										label: language === "ar" ? "مغلق" : language === "fr" ? "Clôturé" : "Closed",
										tooltip: language === "ar" ? "مكتمل ومغلق" : language === "fr" ? "Clôturé" : "Completed & closed"
									},
									{
										value: "archived",
										label: language === "ar" ? "مؤرشف" : language === "fr" ? "Archivé" : "Archived",
										tooltip: language === "ar" ? "مشروع مؤرشف" : language === "fr" ? "Archivé" : "Archived project"
									}
								]} />
</div>
<div className="flex items-center gap-2">
<AtriumButton type="button" variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setActivePmSubScreen("new_project")}>Nouveau Projet</AtriumButton>
</div>
</div>
{selectedProjectIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between px-4 py-3 bg-[#d4522f]/10 border border-[#d4522f]/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
<div className="flex items-center gap-3 text-xs font-semibold text-[#d4522f]">
<span>
{selectedProjectIds.size}
{" projet(s) sélectionné(s)"}
</span>
<button type="button" onClick={() => setSelectedProjectIds(/* @__PURE__ */ new Set())} className="text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white underline cursor-pointer">Désélectionner</button>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => {
										batchUpdatePmProjectStatus(Array.from(selectedProjectIds), "closed");
										setSelectedProjectIds(/* @__PURE__ */ new Set());
									}} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer">Marquer Clôturés</button>
<button type="button" onClick={() => {
										batchUpdatePmProjectStatus(Array.from(selectedProjectIds), "field_active");
										setSelectedProjectIds(/* @__PURE__ */ new Set());
									}} className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl transition-colors cursor-pointer">Passer Terrain</button>
<button type="button" onClick={() => {
										batchDeletePmProjects(Array.from(selectedProjectIds));
										setSelectedProjectIds(/* @__PURE__ */ new Set());
									}} className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer">
<Trash2 className="w-3.5 h-3.5" />
Supprimer
</button>
</div>
</div>}
<UniversalDataCollection items={sortedProjects} keyExtractor={(p) => p.id} defaultViewMode="list" columns={projectColumns} sortBy={projectSortBy} sortDirection={projectSortDir} onSortChange={(key) => {
							if (projectSortBy === key) setProjectSortDir((prev) => prev === "asc" ? "desc" : "asc");
							else {
								setProjectSortBy(key);
								setProjectSortDir("asc");
							}
						}} selectedIds={selectedProjectIds} onSelectionChange={setSelectedProjectIds} renderCard={(proj) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-4">
<div className="space-y-2">
<div className="flex items-start justify-between gap-2">
<span className="text-[11px] font-bold text-[#d4522f] uppercase tracking-wider truncate">{proj.clientName}</span>
<span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
{proj.targetGrossMarginPercent}
%
</span>
</div>
<h3 className="text-base font-bold text-black dark:text-white line-clamp-1">{proj.title}</h3>
<p className="text-xs text-black/55 dark:text-white/55 line-clamp-2">{proj.scopeOfWork}</p>
</div>
<div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 space-y-2 text-xs">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Plafond Budget:</span>
<span className="font-mono font-bold text-black dark:text-white tabular-nums">{formatMoney(proj.budgetCapDzd, "DZD")}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Plafond Terrain:</span>
<span className="font-mono text-black/70 dark:text-white/75 tabular-nums">{formatMoney(proj.maxFieldExpensesDzd, "DZD")}</span>
</div>
<div className="flex justify-between items-center text-[11px] text-black/55 dark:text-white/55">
<span>
{"CDP: "}
{proj.projectManagerName.split(" ")[0]}
</span>
<span>
{"Créa: "}
{proj.leadCreativeName.split(" ")[0]}
</span>
</div>
</div>
</div>} />
</div>}
{currentScreen === "new_project" && /* @__PURE__ */ <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs max-w-4xl mx-auto space-y-6">
<div>
<span className="text-xs font-semibold text-[#d4522f] uppercase tracking-wide">{t("pm_dir_screen_new_badge")}</span>
<h2 className="text-xl font-bold text-black dark:text-white mt-1">{t("pm_dir_screen_new_title")}</h2>
</div>
{projectCreatedSuccess && /* @__PURE__ */ <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold animate-in fade-in">
<CheckCircle className="w-5 h-5 text-emerald-600" />
{t("pm_dir_screen_new_success")}
</div>}
<form onSubmit={handleCreateProject} className="space-y-5">
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div className="sm:col-span-2">
<LabelInput field="Title" label={t("pm_dir_field_title")} required placeholder={t("pm_dir_field_title_ph")} value={newProjectTitle} onChange={setNewProjectTitle} width="100%" height={48} corner={14} />
</div>
<LabelSelect field="Client" label={t("pm_dir_field_client")} value={newProjectClientId} onChange={(val) => setNewProjectClientId(typeof val === "string" ? val : val.target?.value || val)} options={pmClients.map((c) => ({
										value: c.id,
										label: `${c.name} (${c.wilaya})`
									}))} height={48} corner={14} />
<div>
<LabelInput field="BudgetCap" label={t("pm_dir_field_budget_cap")} type="number" value={newProjectBudgetCap} onChange={setNewProjectBudgetCap} width="100%" height={48} corner={14} />
</div>
<div>
<LabelInput field="MaxField" label={t("pm_dir_field_max_field")} type="number" value={newProjectMaxField} onChange={setNewProjectMaxField} width="100%" height={48} corner={14} />
</div>
<div>
<LabelInput field="Margin" label={t("pm_dir_field_margin")} type="number" value={newProjectMargin} onChange={setNewProjectMargin} width="100%" height={48} corner={14} />
</div>
<div className="sm:col-span-2">
<label className="text-xs font-semibold text-black/70 dark:text-white/75 block mb-1">{t("pm_dir_field_scope")}</label>
<textarea rows={4} required placeholder={t("pm_dir_field_scope_ph")} value={newProjectScope} onChange={(e) => setNewProjectScope(e.target.value)} className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]" />
</div>
<div>
<LabelInput field="StartDate" label={t("pm_dir_field_start_date")} type="date" value={newProjectStartDate} onChange={setNewProjectStartDate} width="100%" height={48} corner={14} />
</div>
<div>
<LabelInput field="EndDate" label={t("pm_dir_field_end_date")} type="date" value={newProjectEndDate} onChange={setNewProjectEndDate} width="100%" height={48} corner={14} />
</div>
<LabelSelect field="LeadPM" label={t("pm_dir_field_pm")} value={newProjectPmId} onChange={(val) => setNewProjectPmId(typeof val === "string" ? val : val.target?.value || val)} options={[{
										value: "stf_pm_01",
										label: "Amine Meziane (Senior PM)"
									}, {
										value: "stf_pm_02",
										label: "Samy Cherif (Event Lead)"
									}]} height={48} corner={14} />
<LabelSelect field="LeadCrea" label={t("pm_dir_field_crea")} value={newProjectCreaId} onChange={(val) => setNewProjectCreaId(typeof val === "string" ? val : val.target?.value || val)} options={[{
										value: "stf_crea_01",
										label: "Lina Hadj-Ali (Directrice Artistique)"
									}, {
										value: "stf_crea_02",
										label: "Rachid Benali (Infographiste Print)"
									}]} height={48} corner={14} />
</div>
<div className="pt-4 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-end gap-3">
<button type="button" onClick={() => {
									setNewProjectTitle("");
									setNewProjectScope("");
								}} className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 hover:text-black cursor-pointer">Réinitialiser</button>
<AtriumButton type="submit" variant="primary" size="md" icon={<Sparkles className="w-4 h-4" />}>Lancer le Projet & Dispatcher ➔</AtriumButton>
</div>
</form>
</div>}
{currentScreen === "approvals" && /* @__PURE__ */ <div className="space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs">
<div>
<span className="text-xs font-semibold text-[#d4522f] uppercase tracking-wide">{t("pm_dir_approvals_badge")}</span>
<h2 className="text-xl font-bold text-black dark:text-white mt-0.5">{t("pm_dir_approvals_title")}</h2>
</div>
<div className="flex flex-wrap items-center gap-2">
<Seek value={approvalSearch} onChange={setApprovalSearch} placeholder={t("common_search")} openWidth={260} shutSize={38} />
<div className="flex items-center gap-1.5 p-1 bg-[#F3EDE7] dark:bg-neutral-800 rounded-xl text-xs">
<button type="button" onClick={() => setApprovalsTab("all")} title={language === "ar" ? `جميع الموافقات المعلقة (${totalPendingApprovals})` : language === "fr" ? `Toutes les approbations (${totalPendingApprovals})` : `All pending approvals (${totalPendingApprovals})`} className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${approvalsTab === "all" ? "bg-white dark:bg-neutral-700 text-black dark:text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"}</button>
<button type="button" onClick={() => setApprovalsTab("payroll")} title={language === "ar" ? `دفعات الرواتب المعلقة (${pendingPayrollBatches.length})` : language === "fr" ? `Lots de Paie (${pendingPayrollBatches.length})` : `Payroll batches (${pendingPayrollBatches.length})`} className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${approvalsTab === "payroll" ? "bg-white dark:bg-neutral-700 text-black dark:text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "الرواتب" : language === "fr" ? "Paie" : "Payroll"}</button>
<button type="button" onClick={() => setApprovalsTab("expenses")} title={language === "ar" ? `مذكرات المصاريف المعلقة (${pendingExpenses.length})` : language === "fr" ? `Notes de Frais (${pendingExpenses.length})` : `Expense claims (${pendingExpenses.length})`} className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${approvalsTab === "expenses" ? "bg-white dark:bg-neutral-700 text-black dark:text-white shadow-xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{language === "ar" ? "المصاريف" : language === "fr" ? "Frais" : "Expenses"}</button>
</div>
</div>
</div>
{(approvalsTab === "all" || approvalsTab === "payroll") && /* @__PURE__ */ <div className="space-y-3">
<div className="flex items-center justify-between text-xs font-bold text-black/70 dark:text-white/75 px-1">
<span>Lots de Paie Terrain en Attente de Déblocage</span>
{pendingPayrollBatches.length > 0 && /* @__PURE__ */ <button type="button" onClick={() => batchApprovePmPayrollBatches(pendingPayrollBatches.map((b) => b.id))} className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer">
Valider tous les lots de paie (
{pendingPayrollBatches.length}
)
</button>}
</div>
{pendingPayrollBatches.length === 0 ? /* @__PURE__ */ <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 text-xs text-black/55 dark:text-white/55">Aucun lot de paie en attente d'approbation.</div> : pendingPayrollBatches.map((batch) => /* @__PURE__ */ <div key={batch.id} className="p-5 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">Lot de Paie</span>
<span className="font-mono text-xs font-semibold text-black dark:text-white">{batch.batchNumber}</span>
<span className="text-black/55 dark:text-white/55">·</span>
<span className="text-xs text-black/70 dark:text-white/75 font-medium">{batch.projectTitle}</span>
</div>
<p className="text-xs text-black/55 dark:text-white/55">
{"Mission "}
<span className="font-mono font-semibold">{batch.missionCode}</span>
{" · "}
{batch.totalBeneficiaries}
{" animateurs pointés et vérifiés par le Superviseur."}
</p>
</div>
<div className="flex items-center gap-4 shrink-0">
<div className="text-right">
<span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">{t("common_amount")}</span>
<span className="font-bold text-lg text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(batch.totalAmountDzd, "DZD")}</span>
</div>
<button type="button" onClick={() => approvePmPayrollBatch(batch.id)} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer">
<CheckCircle className="w-4 h-4" />
{t("pm_dir_btn_validate_ccp")}
</button>
</div>
</div>)}
</div>}
{(approvalsTab === "all" || approvalsTab === "expenses") && /* @__PURE__ */ <div className="space-y-3 pt-2">
<div className="flex items-center justify-between text-xs font-bold text-black/70 dark:text-white/75 px-1">
<span>Achats & Notes de Frais Terrain Déclarés</span>
{pendingExpenses.length > 0 && /* @__PURE__ */ <button type="button" onClick={() => batchApprovePmExpenses(pendingExpenses.map((e) => e.id))} className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer">
Valider toutes les notes de frais (
{pendingExpenses.length}
)
</button>}
</div>
{pendingExpenses.length === 0 ? /* @__PURE__ */ <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 text-xs text-black/55 dark:text-white/55">Aucun frais d'activation en attente d'arbitrage.</div> : pendingExpenses.map((expense) => /* @__PURE__ */ <div key={expense.id} className="p-5 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">{expense.category}</span>
<span className="text-xs font-semibold text-black dark:text-white">{expense.title}</span>
{expense.hasFiscalInvoice && /* @__PURE__ */ <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">Facture Fiscale</span>}
</div>
<p className="text-xs text-black/55 dark:text-white/55">
{"Déclaré par "}
{expense.declaredByUserName}
{" ("}
{expense.declaredByRole}
{") · "}
{expense.projectTitle}
</p>
</div>
<div className="flex items-center gap-3 shrink-0">
{expense.receiptPhotoUrl && /* @__PURE__ */ <button type="button" onClick={() => setSelectedReceiptUrl(expense.receiptPhotoUrl || null)} className="px-3 py-1.5 text-xs text-black/70 dark:text-white/75 border border-[#E6DED6] dark:border-neutral-700 rounded-xl hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer">
<Eye className="w-3.5 h-3.5" />
Justificatif
</button>}
<div className="text-right">
<span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">{t("common_amount")}</span>
<span className="font-bold text-base text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(expense.amountDzd, "DZD")}</span>
</div>
<button type="button" onClick={() => approvePmExpense(expense.id)} className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer">
<CheckCircle className="w-3.5 h-3.5" />
Valider
</button>
<button type="button" onClick={() => setRejectionModalId(expense.id)} className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 transition-colors cursor-pointer">Refuser</button>
</div>
</div>)}
</div>}
</div>}
{currentScreen === "reports" && /* @__PURE__ */ <div className="space-y-6">
<div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<div>
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">Écran 1.4 · Rapports d'Activité & Marges</span>
<h2 className="text-xl font-bold text-black dark:text-white">Audit Financier Consolidé — Année 2026</h2>
</div>
<LiquidExportButton size="md" onExport={handleExportAuditCsv} idleLabel={language === "ar" ? "تحميل التدقيق المالي" : language === "fr" ? "TÉLÉCHARGER AUDIT (CSV)" : "DOWNLOAD AUDIT (CSV)"} id="pm-dir-audit-export-btn" />
</div>
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
<div className="p-4 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-[#FBF8F5]/80 dark:bg-neutral-800/40">
<span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">{t("pm_dir_kpi_cumul_ca")}</span>
<div className="text-2xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">58,4 M DA</div>
<span className="text-[11px] text-emerald-600 font-semibold">{t("pm_dir_vs_2025")}</span>
</div>
<div className="p-4 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-[#FBF8F5]/80 dark:bg-neutral-800/40">
<span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">{t("pm_dir_kpi_avg_margin")}</span>
<div className="text-2xl font-bold text-emerald-600 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">31,4 %</div>
<span className="text-[11px] text-black/55 dark:text-white/55">{t("pm_dir_target_objective")}</span>
</div>
<div className="p-4 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-[#FBF8F5]/80 dark:bg-neutral-800/40">
<span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">{t("pm_dir_kpi_closed_missions")}</span>
<div className="text-2xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">48</div>
<span className="text-[11px] text-black/55 dark:text-white/55">{t("pm_dir_coverage_wilayas")}</span>
</div>
<div className="p-4 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-[#FBF8F5]/80 dark:bg-neutral-800/40">
<span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">{t("pm_dir_kpi_attendance_rate")}</span>
<div className="text-2xl font-bold text-blue-600 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">98,2 %</div>
<span className="text-[11px] text-black/55 dark:text-white/55">{t("pm_dir_rating_avg")}</span>
</div>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
<div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs space-y-4">
<h3 className="text-sm font-semibold text-black dark:text-white flex items-center justify-between">
<span>{t("pm_dir_client_profitability")}</span>
<span className="text-xs text-black/55 dark:text-white/55 font-normal">{t("pm_dir_turnover_share")}</span>
</h3>
<div className="space-y-3">
{[
								{
									name: "Ooredoo Algérie",
									ca: "24,5 M DA",
									pct: 42,
									margin: "32%",
									color: "bg-red-500"
								},
								{
									name: t("pm_dir_client_danone"),
									ca: "16,3 M DA",
									pct: 28,
									margin: "30%",
									color: "bg-blue-500"
								},
								{
									name: t("pm_dir_client_cevital"),
									ca: "10,5 M DA",
									pct: 18,
									margin: "34%",
									color: "bg-emerald-500"
								},
								{
									name: t("pm_dir_client_others"),
									ca: "7,1 M DA",
									pct: 12,
									margin: "28%",
									color: "bg-amber-500"
								}
							].map((cli) => /* @__PURE__ */ <div key={cli.name} className="space-y-1 text-xs">
<div className="flex justify-between items-center">
<span className="font-semibold text-black dark:text-white">{cli.name}</span>
<span className="font-mono text-black/55 dark:text-white/55">
{cli.ca}
{" · Marge "}
{cli.margin}
</span>
</div>
<div className="w-full h-2 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 overflow-hidden"><div className={`h-full ${cli.color}`} style={{ width: `${cli.pct}%` }} /></div>
</div>)}
</div>
</div>
<div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs space-y-4">
<h3 className="text-sm font-semibold text-black dark:text-white flex items-center justify-between">
<span>Ventilation des Dépenses par Poste</span>
<span className="text-xs text-black/55 dark:text-white/55 font-normal">Terrain & Logistique</span>
</h3>
<div className="space-y-3">
{[
								{
									label: "Indemnités & Paies Animateurs (CCP)",
									amount: "34,2 M DA",
									pct: 58,
									color: "bg-[#DC2626]"
								},
								{
									label: "Production POSM & Impression Imprimeur",
									amount: "14,8 M DA",
									pct: 25,
									color: "bg-purple-500"
								},
								{
									label: "Transport, Carburant & Hébergement",
									amount: "6,5 M DA",
									pct: 11,
									color: "bg-amber-500"
								},
								{
									label: "Frais de Régie & Autorisations APC",
									amount: "2,9 M DA",
									pct: 6,
									color: "bg-blue-500"
								}
							].map((item) => /* @__PURE__ */ <div key={item.label} className="space-y-1 text-xs">
<div className="flex justify-between items-center">
<span className="font-semibold text-black dark:text-white">{item.label}</span>
<span className="font-mono text-black/55 dark:text-white/55">{item.amount}</span>
</div>
<div className="w-full h-2 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 overflow-hidden"><div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} /></div>
</div>)}
</div>
</div>
</div>
</div>}
{selectedReceiptUrl && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E6DED6] dark:border-neutral-800 space-y-4">
<div className="flex items-center justify-between">
<h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
<Receipt className="w-4 h-4 text-[#d4522f]" />
Justificatif Fiscal de Paiement
</h3>
<button type="button" onClick={() => setSelectedReceiptUrl(null)} className="p-1 rounded-lg hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 text-black/55 dark:text-white/55 hover:text-black/80 cursor-pointer"><X className="w-4 h-4" /></button>
</div>
<img src={selectedReceiptUrl} alt="Scan Justificatif" className="w-full h-72 object-cover rounded-xl border border-[#E6DED6] dark:border-neutral-800" />
<div className="flex justify-end">
<button type="button" onClick={() => setSelectedReceiptUrl(null)} className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 bg-[#F3EDE7] dark:bg-neutral-800 hover:bg-[#EAE1D8] rounded-xl cursor-pointer">Fermer</button>
</div>
</div>
</div>}
{rejectionModalId && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E6DED6] dark:border-neutral-800 space-y-4">
<div className="flex items-center justify-between">
<h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
<Ban className="w-4 h-4" />
Motif du Rejet de la Dépense
</h3>
<button type="button" onClick={() => setRejectionModalId(null)} className="p-1 rounded-lg hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 text-black/55 dark:text-white/55 hover:text-black/80 cursor-pointer"><X className="w-4 h-4" /></button>
</div>
<p className="text-xs text-black/55 dark:text-white/55">
Veuillez préciser la raison du refus (ex: justificatif illisible, montant hors barème APC, achat non approuvé).
</p>
<textarea rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Ex: Facture proforma non conforme ou facture fiscale manquante..." className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
<div className="flex justify-end gap-2">
<button type="button" onClick={() => setRejectionModalId(null)} className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 hover:text-black cursor-pointer">Annuler</button>
<button type="button" onClick={handleRejectConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs cursor-pointer">Confirmer le Rejet</button>
</div>
</div>
</div>}
</div>;
};
