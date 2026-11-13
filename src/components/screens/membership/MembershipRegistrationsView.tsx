import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Check,
  X,
  UserCheck,
  Search,
  Download,
  LayoutGrid,
  List,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  Filter,
  Eye,
  Trash2,
  Pin,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RegistrationLead } from '../../../types/index';
import { Avatar } from '../../ui/Avatar';
import { Modal } from '../../ui/Modal';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { localizeStatus } from '../../../utils/rules';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import { t } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export interface MembershipRegistrationsViewProps {
  onAddLead: () => void;
}



export const MembershipRegistrationsView: React.FC<MembershipRegistrationsViewProps> = ({ onAddLead }) => {
	const { leads, plans, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, terminology, updateLeadStatus, deleteLead, convertLeadToMember, currentBusiness, language, showToast, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout } = useAtriumStore();
	const [statusFilter, setStatusFilter] = React.useState("All");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [planFilter, setPlanFilter] = React.useState("All");
	const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [selectedLead, setSelectedLead] = React.useState<any>(null);
	const [conversionLead, setConversionLead] = React.useState<any>(null);
	const [selectedPlanId, setSelectedPlanId] = React.useState("");
	const [selectedLeadIds, setSelectedLeadIds] = React.useState<Set<string>>(() => new Set());
	const [pinnedLeadIds, setPinnedLeadIds] = React.useState<Set<string>>(() => new Set());
	const [leadSortBy, setLeadSortBy] = React.useState("date");
	const [leadSortDir, setLeadSortDir] = React.useState<"asc" | "desc">("desc");
	const filteredLeads = React.useMemo(() => {
		return leads.filter((lead) => {
			if (statusFilter !== "All" && lead.status !== statusFilter) return false;
			if (planFilter !== "All") {
				if (lead.preferredPlanId !== planFilter && lead.preferredPlanName !== planFilter) return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = lead.fullName.toLowerCase().includes(q);
				const matchesPhone = lead.phoneNumber.includes(q);
				const matchesEmail = lead.email.toLowerCase().includes(q);
				if (!matchesName && !matchesPhone && !matchesEmail) return false;
			}
			return true;
		});
	}, [
		leads,
		statusFilter,
		planFilter,
		searchQuery
	]);
	const sortedLeads = React.useMemo(() => {
		return [...filteredLeads].sort((a, b) => {
			const aPinned = pinnedLeadIds.has(a.id);
			const bPinned = pinnedLeadIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (leadSortBy === "applicant") {
				const cmp = a.fullName.localeCompare(b.fullName);
				return leadSortDir === "asc" ? cmp : -cmp;
			}
			if (leadSortBy === "plan") {
				const cmp = (a.preferredPlanName || "").localeCompare(b.preferredPlanName || "");
				return leadSortDir === "asc" ? cmp : -cmp;
			}
			if (leadSortBy === "source") {
				const cmp = a.source.localeCompare(b.source);
				return leadSortDir === "asc" ? cmp : -cmp;
			}
			if (leadSortBy === "status") {
				const cmp = a.status.localeCompare(b.status);
				return leadSortDir === "asc" ? cmp : -cmp;
			}
			const dateA = new Date(a.createdAt).getTime();
			const dateB = new Date(b.createdAt).getTime();
			return leadSortDir === "asc" ? dateA - dateB : dateB - dateA;
		});
	}, [
		filteredLeads,
		pinnedLeadIds,
		leadSortBy,
		leadSortDir
	]);
	const pendingCount = React.useMemo(() => leads.filter((l) => l.status === "Pending").length, [leads]);
	const approvedCount = React.useMemo(() => leads.filter((l) => l.status === "Approved").length, [leads]);
	const declinedCount = React.useMemo(() => leads.filter((l) => l.status === "Declined").length, [leads]);
	const handleTogglePinLead = (lead: any) => {
		setPinnedLeadIds((prev) => {
			const next = new Set<string>(prev);
			if (next.has(lead.id)) next.delete(lead.id);
			else next.add(lead.id);
			return next;
		});
	};
	const handleStartConversion = (lead: any) => {
		setConversionLead(lead);
		setSelectedPlanId(lead.preferredPlanId || plans[0]?.id || "plan_a1");
	};
	const handleConfirmConversion = () => {
		if (!conversionLead) return;
		const plan = plans.find((p) => p.id === selectedPlanId) || plans[0];
		convertLeadToMember(conversionLead.id, plan ? plan.id : "standard_pkg", plan ? plan.name : "Standard Package", plan ? plan.durationDays : 365);
		setConversionLead(null);
		if (selectedLead?.id === conversionLead.id) setSelectedLead(null);
	};
	const handleBatchApprove = () => {
		const targetIds = Array.from(selectedLeadIds);
		const plan = plans[0];
		targetIds.forEach((id) => {
			const lead = leads.find((l) => l.id === id);
			if (lead && lead.status === "Pending") convertLeadToMember(lead.id, lead.preferredPlanId || (plan ? plan.id : "standard_pkg"), lead.preferredPlanName || (plan ? plan.name : "Standard Package"), plan ? plan.durationDays : 365);
		});
		setSelectedLeadIds(new Set<string>());
		showToast?.({
			type: "success",
			title: language === "ar" ? "تم اعتماد الطلبات" : language === "fr" ? "Dossiers validés" : "Leads Converted",
			message: `${targetIds.length} ${language === "ar" ? "طلب تم تحويلهم بنجاح" : language === "fr" ? "demandes approuvées et inscrites" : "leads approved and converted to members"}.`
		});
	};
	const handleBatchDelete = () => {
		const targetIds = Array.from(selectedLeadIds);
		if (deleteLead) targetIds.forEach((id) => deleteLead(id));
		else targetIds.forEach((id) => updateLeadStatus(id, "Declined"));
		setSelectedLeadIds(new Set<string>());
		showToast?.({
			type: "warning",
			title: language === "ar" ? "حذف من السجل" : language === "fr" ? "Suppression effectuée" : "Leads Removed",
			message: `${targetIds.length} ${language === "ar" ? "طلب تم حذفه من السجل" : language === "fr" ? "demandes supprimées" : "leads removed from registry"}.`
		});
	};
	const handleExportCSV = () => {
		const headers = [
			language === "ar" ? "مقدم الطلب" : language === "fr" ? "Candidat" : "Applicant Name",
			language === "ar" ? "الهاتف" : language === "fr" ? "Téléphone" : "Phone",
			language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-mail" : "Email",
			language === "ar" ? "الباقة المفضلة" : language === "fr" ? "Formule souhaitée" : "Preferred Plan",
			language === "ar" ? "قناة الاستقطاب" : language === "fr" ? "Canal d'acquisition" : "Source",
			language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status",
			language === "ar" ? "تاريخ التقديم" : language === "fr" ? "Date de soumission" : "Submitted Date"
		];
		const rows = sortedLeads.map((l) => [
			`"${l.fullName.replace(/"/g, "\"\"")}"`,
			`"${l.phoneNumber}"`,
			`"${l.email}"`,
			`"${(l.preferredPlanName || plans[0]?.name || "Standard Package").replace(/"/g, "\"\"")}"`,
			`"${l.source.replace(/"/g, "\"\"")}"`,
			`"${localizeStatus(l.status, language)}"`,
			`"${new Date(l.createdAt).toLocaleDateString()}"`
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `atrium-leads-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
		else document.exitFullscreen().catch(() => {});
	};
	const leadColumns = React.useMemo(() => [
		{
			key: "applicant",
			header: language === "ar" ? "مقدم الطلب" : language === "fr" ? "Candidat / Prospect" : "Applicant",
			width: "2.5*",
			sortable: true,
			renderCell: (lead: any) => {
				const isPinned = pinnedLeadIds.has(lead.id);
				return /* @__PURE__ */ <div className="flex items-center gap-3 min-w-0">
{isPinned && /* @__PURE__ */ <span className="w-1.5 h-6 rounded-full bg-[#d4522f] shrink-0" title="Pinned" />}
<Avatar name={lead.fullName} size={36} />
<div className="min-w-0">
<div className="text-sm font-bold text-black dark:text-white truncate flex items-center gap-1.5">
<span>{lead.fullName}</span>
{isPinned && /* @__PURE__ */ <Pin size={11} className="text-[#d4522f] shrink-0" />}
</div>
<div className="text-xs text-black/62 dark:text-white/75 truncate">
{lead.phoneNumber}
{" · "}
{lead.email}
</div>
</div>
</div>;
			}
		},
		{
			key: "source",
			header: language === "ar" ? "قناة الاستقطاب" : language === "fr" ? "Canal d'acquisition" : "Acquisition Source",
			width: "1.8*",
			sortable: true,
			renderCell: (lead: any) => /* @__PURE__ */ <div>
<span className="text-xs font-semibold text-black/75 dark:text-white/80">{lead.source}</span>
{lead.notes && /* @__PURE__ */ <span className="block text-[11px] text-black/62 dark:text-white/65 truncate max-w-xs mt-0.5">{lead.notes}</span>}
</div>
		},
		{
			key: "plan",
			header: language === "ar" ? "الباقة المفضلة" : language === "fr" ? "Formule souhaitée" : `Preferred ${terminology.plan}`,
			width: "1.8*",
			sortable: true,
			renderCell: (lead: any) => /* @__PURE__ */ <div>
<span className="inline-block px-2 py-0.5 rounded-md bg-[#d4522f]/10 text-[#d4522f] text-[11.5px] font-semibold border border-[#d4522f]/20">{lead.preferredPlanName || plans[0]?.name || "Standard Package"}</span>
{lead.preferredStartDate && /* @__PURE__ */ <span className="block text-[11px] text-black/62 dark:text-white/65 mt-0.5 tabular-nums">
{language === "ar" ? "بدء: " : language === "fr" ? "Début : " : "Start: "}
{lead.preferredStartDate}
</span>}
</div>
		},
		{
			key: "date",
			header: language === "ar" ? "تاريخ التقديم" : language === "fr" ? "Date de soumission" : "Submission Date",
			width: "1.4*",
			sortable: true,
			renderCell: (lead: any) => /* @__PURE__ */ <span className="text-xs text-black/62 dark:text-white/75 tabular-nums">{new Date(lead.createdAt).toLocaleDateString()}</span>
		},
		{
			key: "status",
			header: language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status",
			width: "1.4*",
			sortable: true,
			renderCell: (lead: any) => {
				const isApp = lead.status === "Approved";
				const isDec = lead.status === "Declined";
				return /* @__PURE__ */ <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold ${isApp ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50" : isDec ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50"}`}>
<span className={`w-1.5 h-1.5 rounded-full ${isApp ? "bg-emerald-500" : isDec ? "bg-rose-500" : "bg-amber-500"}`} />
{localizeStatus(lead.status, language)}
</span>;
			}
		},
		{
			key: "actions",
			header: language === "ar" ? "إجراءات الاعتماد" : language === "fr" ? "Actions" : "Actions",
			width: "1.6*",
			renderCell: (lead: any) => /* @__PURE__ */ <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
{lead.status === "Pending" ? /* @__PURE__ */ <>
<button type="button" onClick={() => handleStartConversion(lead)} style={{ backgroundColor: "var(--color-accent)" }} className="h-7 px-2.5 text-xs font-semibold text-white rounded-lg flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shadow-xs" title={language === "ar" ? "اعتماد" : language === "fr" ? "Valider" : "Convert"}>
<UserCheck size={13} />
<span>{language === "ar" ? "اعتماد" : language === "fr" ? "Valider" : "Convert"}</span>
</button>
<button type="button" onClick={() => updateLeadStatus(lead.id, "Declined")} className="h-7 w-7 rounded-lg flex items-center justify-center text-black/62 dark:text-white/65 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer" title={language === "ar" ? "رفض الطلب" : language === "fr" ? "Refuser le dossier" : "Decline Lead"}><X size={14} /></button>
</> : /* @__PURE__ */ <button type="button" onClick={() => setSelectedLead(lead)} className="h-7 px-2.5 rounded-lg border border-[#E6DED6] dark:border-[#3A3734] text-xs font-semibold text-black/72 dark:text-white/80 hover:bg-[#F3EDE7] dark:hover:bg-[#262422] flex items-center gap-1 cursor-pointer transition-colors">
<Eye size={12} />
<span>{language === "ar" ? "معاينة" : language === "fr" ? "Fiche" : "View"}</span>
</button>}
</div>
		}
	], [
		language,
		pinnedLeadIds,
		terminology.plan,
		plans,
		updateLeadStatus
	]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: leads.length > 0
	});
	if (showSkeleton && (leads.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
		]} viewMode={viewMode} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200 relative">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E6DED6]/80 dark:border-neutral-800/80">
<div className="flex items-center gap-3.5 sm:gap-4">
<div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white"><ClipboardList size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-[0.98] rtl:leading-tight tracking-[0.012em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">{terminology.registration}</h1>
</div>
</div>
<div className="flex items-center gap-3 relative flex-wrap sm:flex-nowrap">
<AtriumButton type="button" variant="primary" onClick={onAddLead} icon={<Plus size={15} strokeWidth={2.5} />}><span>{t("reg_add_lead", language)}</span></AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<div>
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">{t("reg_pipeline_health_title", language)}</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
<div>
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">{t("reg_active_intake_label", language)}</span>
<div className="mt-1.5">
<span className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/40 px-2 py-0.5 rounded-md tabular-nums">
{"↗ "}
{pendingCount}
{" "}
{language === "ar" ? "في الانتظار" : language === "fr" ? "En attente" : "Pending"}
</span>
</div>
</div>
<div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{pendingCount}</div>
</div>
<div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
<div>
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">{t("reg_converted_members_label", language)}</span>
<div className="mt-1.5">
<span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
{language === "ar" ? "تحويل مؤكد" : language === "fr" ? "Conversion réussie" : "Converted"}
</span>
</div>
</div>
<div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{approvedCount}</div>
</div>
<div className="p-4.5 sm:p-5 rounded-[18px] bg-[#1F1D1B] border border-white/[0.08] text-white flex flex-col justify-between min-h-[132px] shadow-sm">
<div className="flex items-center justify-between gap-2">
<span className="text-[12px] font-medium text-white/75">{t("reg_intake_sla_label", language)}</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/25 tabular-nums">{"< 15 min"}</span>
</div>
<div>
<div className="text-[28px] lg:text-[30px] leading-[0.95] font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{"< 15 min"}</div>
<p className="text-[11.5px] text-white/68 mt-1.5">
{language === "ar" ? "بوابة التسجيل الذاتي وموقع الجوال" : language === "fr" ? "Borne libre-service & web mobile" : "Self-service Kiosk & Mobile Web"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<ClipboardList size={16} className="text-black/62 dark:text-white/65" />
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
{terminology.registration}
{" "}
{t("reg_requests_title", language)}
</h2>
<span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] text-[11px] font-semibold text-black/68 dark:text-white/75 tabular-nums shadow-2xs">{filteredLeads.length}</span>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? "بحث باسم المتقدم، الهاتف، البريد..." : language === "fr" ? "Rechercher nom, tél, e-mail..." : "Search applicant name, phone, email..."} shutSize={36} openWidth={240} />
								<LiveSegmentedControl size="sm" value={statusFilter} onValueChange={(val) => setStatusFilter(val)} options={[
									{
										value: "All",
										label: t("member_filter_all", language),
										tooltip: language === "ar" ? "جميع طلبات التسجيل" : language === "fr" ? "Toutes les demandes d'inscription" : "All registration requests",
										count: leads.length
									},
									{
										value: "Pending",
										label: language === "ar" ? "منتظر" : language === "fr" ? "Attente" : "Pending",
										tooltip: language === "ar" ? "قيد الانتظار للمراجعة" : language === "fr" ? "Demandes en attente de validation" : "Pending review",
										count: pendingCount
									},
									{
										value: "Approved",
										label: language === "ar" ? "معتمد" : language === "fr" ? "Approuvé" : "Approved",
										tooltip: language === "ar" ? "الطلبات المعتمدة" : language === "fr" ? "Demandes approuvées" : "Approved requests",
										count: approvedCount
									},
									{
										value: "Declined",
										label: language === "ar" ? "مرفوض" : language === "fr" ? "Refusé" : "Declined",
										tooltip: language === "ar" ? "الطلبات المرفوضة" : language === "fr" ? "Demandes refusées" : "Declined requests",
										count: declinedCount
									}
								]} aria-label="Registrations Status Filter" />
<LabelSelect field="Plan" label={t("member_filter_plan_label", language)} value={planFilter} onChange={(val) => setPlanFilter(val?.target?.value ?? String(val))} options={[{
									value: "All",
									label: t("member_filter_all_plans", language),
									tooltip: language === "ar" ? "جميع الاشتراكات" : language === "fr" ? "Toutes les formules" : "All membership plans"
								}, ...plans.map((p) => ({
									value: p.id,
									label: compactFilterLabel(p.name).label,
									tooltip: p.name
								}))]} width={160} height={36} corner={18} />
<AtriumButton type="button" variant="secondary" onClick={handleExportCSV} icon={<Download size={13} />} title="Download CSV export">
<span>
{language === "ar" ? "تصدير البيانات" : language === "fr" ? "Exporter les données" : "Export Data"}
</span>
</AtriumButton>
<button type="button" onClick={toggleFullscreen} className="w-9 h-9 rounded-xl bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-center text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer transition-colors shadow-2xs" title="Toggle Fullscreen"><Maximize2 size={13} /></button>
</div>
</div>
<UniversalDataCollection items={sortedLeads} keyExtractor={(lead) => lead.id} viewMode={viewMode} onViewModeChange={setViewMode} columns={leadColumns} isLoading={isSyncing || networkMode === "force_skeleton"} isOffline={networkMode === "offline"} isTimedOut={isSyncTimeout} lastSyncedAt={lastSyncedAt} onRetrySync={retryCloudSync} selectedIds={selectedLeadIds} onSelectionChange={setSelectedLeadIds} bulkSecondaryAction={{
						label: language === "ar" ? "اعتماد وتحويل" : language === "fr" ? "Valider la sélection" : "Batch Approve",
						icon: /* @__PURE__ */ <UserCheck size={13} />,
						onClick: handleBatchApprove,
						variant: "primary"
					}} onBulkDelete={handleBatchDelete} isPinned={(lead) => pinnedLeadIds.has(lead.id)} onTogglePin={handleTogglePinLead} onItemClick={(lead) => setSelectedLead(lead)} sortBy={leadSortBy} sortDirection={leadSortDir} onSortChange={(colKey) => {
						if (leadSortBy === colKey) setLeadSortDir((prev) => prev === "asc" ? "desc" : "asc");
						else {
							setLeadSortBy(colKey);
							setLeadSortDir("asc");
						}
					}} showViewToggle emptyTitle={language === "ar" ? "لا توجد طلبات تسجيل" : language === "fr" ? "Aucune demande d'inscription" : "No Registration Requests"} emptyDescription={language === "ar" ? "لا توجد طلبات تطابق الفلتر الحالي، يمكنك إضافة طلب تسجيل جديد" : language === "fr" ? "Aucun prospect ne correspond aux critères actuels. Vous pouvez saisir une nouvelle demande." : "No intake leads match current filters. You can record a new intake lead."} renderCard={(lead) => {
						const isPinned = pinnedLeadIds.has(lead.id);
						return /* @__PURE__ */ <div key={lead.id} onClick={() => setSelectedLead(lead)} className={`p-5 rounded-[18px] border transition-all cursor-pointer relative shadow-2xs ${selectedLead?.id === lead.id ? "border-[#d4522f] bg-[#d4522f]/[0.06] dark:bg-[#262422] ring-1 ring-[#d4522f]/30" : "border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#1C1B1A] hover:border-[#D4C8BC] dark:hover:border-[#4A4642]"}`}>
{isPinned && /* @__PURE__ */ <div className="absolute top-3 left-3 text-[#d4522f]" title="Pinned lead"><Pin size={12} className="fill-[#d4522f]" /></div>}
<div className="flex items-center justify-between mb-3 pl-4">
<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${lead.status === "Approved" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : lead.status === "Declined" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"}`}>{localizeStatus(lead.status, language)}</span>
<span className="text-[11px] text-black/62 dark:text-white/65 tabular-nums">{new Date(lead.createdAt).toLocaleDateString()}</span>
</div>
<div className="flex items-center gap-3 mb-3">
<Avatar name={lead.fullName} size={42} />
<div className="min-w-0 flex-1">
<h3 className="text-sm font-bold text-black dark:text-white truncate">{lead.fullName}</h3>
<p className="text-xs text-black/62 dark:text-white/65 truncate">{lead.phoneNumber}</p>
</div>
</div>
<div className="text-xs space-y-1 mb-4 text-black/72 dark:text-white/75 pt-2.5 border-t border-[#E6DED6]/60 dark:border-[#3A3734]">
<div className="flex justify-between">
<span className="text-black/62 dark:text-white/65">{language === "ar" ? "الباقة:" : language === "fr" ? "Formule :" : "Plan:"}</span>
<span className="font-semibold text-[#d4522f] truncate max-w-[140px]">{lead.preferredPlanName || plans[0]?.name || "Standard Package"}</span>
</div>
<div className="flex justify-between">
<span className="text-black/62 dark:text-white/65">{language === "ar" ? "المصدر:" : language === "fr" ? "Source :" : "Source:"}</span>
<span className="truncate max-w-[140px]">{lead.source}</span>
</div>
</div>
{lead.status === "Pending" ? /* @__PURE__ */ <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
<AtriumButton type="button" variant="primary" size="xs" onClick={() => handleStartConversion(lead)} icon={<UserCheck size={13} />} className="flex-1 justify-center">
<span>
{language === "ar" ? "اعتماد وتحويل" : language === "fr" ? "Valider" : "Convert"}
</span>
</AtriumButton>
<button type="button" onClick={() => updateLeadStatus(lead.id, "Declined")} className="h-7 w-7 rounded-lg border border-[#E6DED6] dark:border-[#3A3734] text-xs font-semibold text-black/62 dark:text-white/65 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"><X size={14} /></button>
</div> : /* @__PURE__ */ <AtriumButton type="button" variant="secondary" size="xs" onClick={(e) => {
										e.stopPropagation();
										setSelectedLead(lead);
									}} icon={<Eye size={13} />} className="w-full justify-center">
<span>
{language === "ar" ? "عرض تفاصيل الملف" : language === "fr" ? "Consulter le dossier" : "View Full Dossier"}
</span>
</AtriumButton>}
</div>;
					}} />
</div>
{selectedLead && /* @__PURE__ */ <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-[#1C1B1A] border-l border-[#E6DED6] dark:border-[#3A3734] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
<div className="px-6 py-5 border-b border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between">
<div className="flex items-center gap-2">
<ClipboardList size={17} className="text-[#d4522f]" />
<span className="text-sm font-semibold text-black dark:text-white">
{language === "ar" ? "معاينة ملف المرشح" : language === "fr" ? "Fiche du prospect" : "Prospect Dossier Inspector"}
</span>
</div>
<button type="button" onClick={() => setSelectedLead(null)} className="p-1.5 rounded-lg text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] cursor-pointer"><X size={18} /></button>
</div>
<div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
<div className="p-5 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center gap-4">
<Avatar name={selectedLead.fullName} size={50} />
<div>
<h3 className="text-base font-bold text-black dark:text-white">{selectedLead.fullName}</h3>
<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold mt-1 ${selectedLead.status === "Approved" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : selectedLead.status === "Declined" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"}`}>{localizeStatus(selectedLead.status, language)}</span>
</div>
</div>
<div className="space-y-3">
<span className="text-[11.5px] font-semibold text-black/68 dark:text-white/72 uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal">
{language === "ar" ? "معلومات الاتصال والتفاصيل" : language === "fr" ? "Contact & Détails" : "Contact & Details"}
</span>
<div className="p-4 rounded-2xl bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2.5">
<div className="flex items-center gap-2.5">
<Phone size={14} className="text-[#d4522f]" />
<span className="text-black dark:text-white font-semibold tabular-nums">{selectedLead.phoneNumber}</span>
</div>
<div className="flex items-center gap-2.5">
<Mail size={14} className="text-[#d4522f]" />
<span className="text-black dark:text-white font-semibold">{selectedLead.email}</span>
</div>
<div className="flex items-center gap-2.5">
<Calendar size={14} className="text-[#d4522f]" />
<span className="text-black dark:text-white">
{language === "ar" ? "تاريخ البدء المطلوب:" : language === "fr" ? "Début souhaité :" : "Requested start:"}
{" "}
<strong className="text-black dark:text-white tabular-nums">
{selectedLead.preferredStartDate || (language === "ar" ? "فوري" : language === "fr" ? "Immédiat" : "Immediate")}
</strong>
</span>
</div>
{selectedLead.notes && /* @__PURE__ */ <div className="pt-2 border-t border-[#E6DED6]/60 dark:border-[#3A3734] text-black/62 dark:text-white/65">
<span className="font-semibold text-black/75 dark:text-white/80">
{language === "ar" ? "الملاحظات:" : language === "fr" ? "Remarques :" : "Notes:"}
</span>
{" "}
{selectedLead.notes}
</div>}
</div>
</div>
<div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
<div>
<span className="text-[11.5px] font-semibold text-[#d4522f]">
{language === "ar" ? "الباقة المفضلة" : language === "fr" ? "Formule préférée" : "Preferred Plan"}
</span>
<div className="text-sm font-bold text-black dark:text-white mt-0.5">{selectedLead.preferredPlanName || plans[0]?.name || "Standard Package"}</div>
</div>
<span className="text-base font-bold text-[#d4522f] tabular-nums">
{"1 500 "}
{language === "ar" ? "د.ج" : "DA"}
</span>
</div>
<div className="space-y-2 pt-2">
{selectedLead.status === "Pending" ? /* @__PURE__ */ <>
<AtriumButton type="button" variant="primary" onClick={() => handleStartConversion(selectedLead)} icon={<UserCheck size={16} />} className="w-full justify-center">
<span>
{language === "ar" ? "اعتماد العضوية وتسجيل الاشتراك" : language === "fr" ? "Valider l'adhésion & Inscrire" : "Approve & Convert to Member"}
</span>
</AtriumButton>
<AtriumButton type="button" variant="danger" onClick={() => {
									updateLeadStatus(selectedLead.id, "Declined");
									setSelectedLead(null);
								}} className="w-full justify-center">
<span>
{language === "ar" ? "رفض الطلب" : language === "fr" ? "Refuser la demande" : "Decline Registration"}
</span>
</AtriumButton>
</> : /* @__PURE__ */ <AtriumButton type="button" variant="primary" onClick={() => setSelectedLead(null)} className="w-full justify-center">
<span>
{language === "ar" ? "إغلاق الملف" : language === "fr" ? "Fermer le dossier" : "Close Dossier"}
</span>
</AtriumButton>}
</div>
</div>
</div>}
<Modal isOpen={conversionLead !== null} onClose={() => setConversionLead(null)} title={language === "ar" ? "اعتماد العضوية وتسجيل المشترك" : language === "fr" ? "Valider l'adhésion et créer l'adhérent" : "Convert Lead to Active Member"} subtitle={language === "ar" ? `ترقية ${conversionLead?.fullName} إلى مشترك رسمي في ${currentBranch?.name || "الفرع"}` : language === "fr" ? `Finaliser l'inscription de ${conversionLead?.fullName} au sein de ${currentBranch?.name || "Atrium 1"}` : `Promote ${conversionLead?.fullName} to official member status in ${currentBranch?.name || "Atrium 1"}`}>
{conversionLead && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3.5 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] text-xs space-y-1">
<div>
<strong className="text-black dark:text-white">
{language === "ar" ? "المتقدم:" : language === "fr" ? "Candidat :" : "Applicant:"}
</strong>
{" "}
{conversionLead.fullName}
</div>
<div>
<strong className="text-black dark:text-white">{language === "ar" ? "الهاتف:" : language === "fr" ? "Téléphone :" : "Phone:"}</strong>
{" "}
{conversionLead.phoneNumber}
{" · "}
{conversionLead.email}
</div>
<div>
<strong className="text-black dark:text-white">{language === "ar" ? "القناة:" : language === "fr" ? "Canal :" : "Source:"}</strong>
{" "}
{conversionLead.source}
</div>
</div>
<div>
<LabelSelect field="MembershipPlan" label={`${t("member_field_plan_package", language)} *`} value={selectedPlanId} onChange={(val) => setSelectedPlanId(val?.target?.value ?? String(val))} options={plans.map((p) => ({
								value: p.id,
								label: p.name,
								sublabel: `${p.durationDays} ${t("member_days_unit", language)} · ${p.price.amount.toLocaleString()} ${language === "ar" ? "د.ج" : "DA"}`
							}))} searchable width="100%" height={46} corner={14} />
</div>
<div className="p-3 rounded-2xl bg-[#d4522f]/10 border border-[#d4522f]/20 text-xs text-[#d4522f]">
{language === "ar" ? "عند التأكيد، سيتم إنشاء معرف بطاقة RFID تلقائياً، واعتماد الطلب، وتسجيل المشترك مباشرة." : language === "fr" ? "Dès validation, un badge RFID unique sera attribué, le dossier sera approuvé et l'adhérent actif immédiatement." : "Upon confirmation, a unique RFID card credential will be generated automatically, the lead will be marked Approved, and the member will be enrolled immediately."}
</div>
<div className="flex items-center justify-end gap-3 pt-3">
<AtriumButton type="button" variant="ghost" onClick={() => setConversionLead(null)}><span>{t("action_cancel", language)}</span></AtriumButton>
<AtriumButton type="button" variant="primary" onClick={handleConfirmConversion} icon={<Check size={15} />}>
<span>
{language === "ar" ? "تأكيد وإنشاء المشترك" : language === "fr" ? "Confirmer & Créer l'adhérent" : "Confirm & Create Member"}
</span>
</AtriumButton>
</div>
</div>}
</Modal>
</div>;
};

export const RegistrationsScreen = MembershipRegistrationsView;
