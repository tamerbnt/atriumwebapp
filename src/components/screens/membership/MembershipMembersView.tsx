import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Plus,
  Home,
  ChevronDown,
  Search,
  Download,
  Check,
  Eye,
  X,
  Phone,
  Mail,
  Calendar,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  Edit,
  AlertCircle,
  Building2,
  Sparkles,
  Scissors,
  Clock,
  Receipt,
  ShoppingCart,
  UserCheck,
  Activity,
  SlidersHorizontal,
  List,
  LayoutGrid,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Member, MemberStatus } from '../../../types/index';
import { calculateDaysRemaining, formatMoney, localizeStatus } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { MemberRow, MemberRowData } from './components/MemberRow';
import { FloatingBulkBar } from './components/FloatingBulkBar';
import { MemberSlideOverInspector } from './MemberSlideOverInspector';
import { useSpringCountRef } from './motion/adherentsMotion';
import { useKineticRowLayout } from './motion/useKineticRowLayout';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button as BrandedAtriumButton, LiquidButton } from '@/atrium';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LabelSelect } from '../../ui/LabelSelect';
import { Seek } from '../../ui/Seek';
import { t } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



const MEMBER_COLLATOR = new Intl.Collator(void 0, { sensitivity: "base" });

const ANIM_PULSE_DOT_STYLE = {
	willChange: "opacity",
	contain: "strict"
};

const EXPORT_BTN_STYLE = {
	height: "40px",
	maxHeight: "40px",
	width: "148px"
};

const getMemberAge = (dobString: any) => {
	if (!dobString) return null;
	const dob = new Date(dobString);
	if (isNaN(dob.getTime())) return null;
	const now = /* @__PURE__ */ new Date();
	let age = now.getFullYear() - dob.getFullYear();
	const m = now.getMonth() - dob.getMonth();
	if (m < 0 || m === 0 && now.getDate() < dob.getDate()) age--;
	return age >= 0 ? age : null;
};

const matchesAgeGroup = (dobString: any, group: any) => {
	if (group === "All") return true;
	const age = getMemberAge(dobString);
	if (group === "unspecified") return age === null;
	if (age === null) return false;
	if (group === "under18") return age < 18;
	if (group === "18-25") return age >= 18 && age <= 25;
	if (group === "26-40") return age >= 26 && age <= 40;
	if (group === "41-60") return age >= 41 && age <= 60;
	if (group === "over60") return age > 60;
	return true;
};

const getMemberInitialsColor = (name: any) => {
	const ch = name ? name[0].toLowerCase() : "";
	if (ch === "a") return "#D946EF";
	if (ch === "s") return "#2563EB";
	if (ch === "y") return "#d4522f";
	if (ch === "n") return "#10B981";
	if (ch === "r") return "#06B6D4";
	return "#8B5CF6";
};

const MembersHeaderBar = React.memo(({ title, addLabel, onAddMember }: any) => /* @__PURE__ */ <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white"><Users size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-['Barlow_Condensed',sans-serif] rtl:font-sans font-extrabold uppercase rtl:normal-case leading-none rtl:leading-tight tracking-[0.01em] rtl:tracking-normal text-black dark:text-white">{title}</h1>
</div>
</div>
<div className="flex items-end gap-3 relative flex-wrap">
<AtriumButton variant="primary" size="md" data-action="add-member" onClick={(e) => onAddMember(e.currentTarget)} icon={<Plus size={16} strokeWidth={2.2} />} className="px-4 font-semibold shadow-xs"><span className="text-xs sm:text-sm font-semibold">{addLabel}</span></AtriumButton>
</div>
</div>);

MembersHeaderBar.displayName = "MembersHeaderBar";

const MembersKpiBanner = React.memo(({ membersLabel, membersLower, language, activeMembersCount, expiringCount, displayCount, activeCountRef, expiringChipCountRef, expiringBigCountRef, inflowChipCountRef, inflowBigCountRef }: any) => /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div>
<h2 className="text-base font-bold text-black dark:text-white">
{membersLabel}
{" & "}
{language === "ar" ? "مؤشرات التجديد" : language === "fr" ? "Rétention & Renouvellements" : "Retention Health"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? `قاعدة ${membersLabel} النشطة` : language === "fr" ? `Base active ${membersLower}` : `Active ${membersLabel} Base`}
</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
{"↗ 100% "}
{language === "ar" ? "نشط" : language === "fr" ? "Actifs" : "Active"}
</span>
</div>
</div>
<div ref={activeCountRef} className="text-3xl font-black font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">{activeMembersCount}</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "تنبيهات انتهاء الاشتراك" : language === "fr" ? "Alertes de renouvellement" : "Renewal & Retention Alert"}
</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">
<span ref={expiringChipCountRef}>{expiringCount}</span>
{" "}
{language === "ar" ? "تنتهي قريباً (<14j)" : language === "fr" ? "expirent sous 14j" : "expiring (<14d)"}
</span>
</div>
</div>
<div ref={expiringBigCountRef} className="text-3xl font-black font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white tabular-nums">{expiringCount}</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">
{language === "ar" ? "الوافدون الجدد شهرياً" : language === "fr" ? "Adhésions du mois" : "Monthly Inflow"}
</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
<span ref={inflowChipCountRef}>
+
{displayCount}
</span>
{" "}
{membersLower}
</span>
</div>
<div>
<div ref={inflowBigCountRef} className="text-2xl font-black font-['Barlow_Condensed',sans-serif] rtl:font-sans text-[#FB923C] tabular-nums">
+
{displayCount}
</div>
<p className="text-[11px] text-white/60 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse shrink-0" style={ANIM_PULSE_DOT_STYLE} />
<span>
{language === "ar" ? "باقات وحسابات جديدة هذا الشهر" : language === "fr" ? "Nouveaux forfaits et profils ce mois-ci" : "New packages & client profiles this month"}
</span>
</p>
</div>
</div>
</div>
</div>);

MembersKpiBanner.displayName = "MembersKpiBanner";

const MembersFilterModal = React.memo(({ isOpen, onClose, filterPopoverRef, language, displayCount, totalMembersCount, membersLower, membersUpper, hasActiveAdvancedFilters, onResetFilters, genderFilter, onChangeGender, ageGroupFilter, onChangeAgeGroup, ageGroupCounts, planFilter, onChangePlan, dynamicAvailablePlans, planCounts, statusFilter, onChangeStatus, extendedStatusOptions, genderFilterOptions }: any) => {
	if (!isOpen) return null;
	return createPortal(/* @__PURE__ */ <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/45 dark:bg-black/70 animate-in fade-in duration-150" onClick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}} role="dialog" aria-modal="true" aria-label={language === "ar" ? "مرشحات متقدمة" : language === "fr" ? "Filtres avancés" : "Advanced Filters"}>
<div ref={filterPopoverRef} className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-[#18181B] rounded-[26px] border border-black/8 dark:border-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.22)] p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-black dark:text-white overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
<div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-[#d4522f]/20 flex items-center justify-center text-[#d4522f] shadow-2xs"><SlidersHorizontal size={16} /></div>
<div>
<span className="text-sm font-bold text-black dark:text-white tracking-tight block">
{language === "ar" ? "مرشحات متقدمة" : language === "fr" ? "Filtres avancés" : "Advanced Filters"}
</span>
<span className="text-xs text-black/55 dark:text-white/55">
{displayCount}
{" "}
{membersLower}
</span>
</div>
</div>
<div className="flex items-center gap-2">
{hasActiveAdvancedFilters && /* @__PURE__ */ <button type="button" onClick={onResetFilters} className="text-xs font-semibold text-[#d4522f] hover:underline flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md">
<RotateCcw size={12} />
<span>
{language === "ar" ? "إعادة ضبط" : language === "fr" ? "Réinitialiser" : "Reset"}
</span>
</button>}
<button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors" aria-label="Close filters"><X size={16} /></button>
</div>
</div>
<div className="space-y-4 overflow-y-auto pr-1 max-h-[58vh] -mr-1">
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/75">{language === "ar" ? "الجنس" : language === "fr" ? "Sexe / Genre" : "Gender"}</label>
{genderFilter !== "All" && /* @__PURE__ */ <button type="button" onClick={() => onChangeGender("All")} className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer">{language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"}</button>}
</div>
<LiveSegmentedControl size="sm" fullWidth className="min-w-0 [&>button]:min-w-0 [&>button]:px-2" options={genderFilterOptions} value={genderFilter} onValueChange={(val) => onChangeGender(val)} aria-label={language === "ar" ? "الجنس" : "Sexe"} />
</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/75">
{language === "ar" ? "الفئات العمرية" : language === "fr" ? "Tranches d'âge" : "Age Groups"}
</label>
{ageGroupFilter !== "All" && /* @__PURE__ */ <button type="button" onClick={() => onChangeAgeGroup("All")} className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer">{language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"}</button>}
</div>
<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
{[
									{
										val: "All",
										label: language === "ar" ? "جميع الأعمار" : language === "fr" ? "Tous les âges" : "All Ages"
									},
									{
										val: "under18",
										label: "< 18 ans"
									},
									{
										val: "18-25",
										label: "18 - 25 ans"
									},
									{
										val: "26-40",
										label: "26 - 40 ans"
									},
									{
										val: "41-60",
										label: "41 - 60 ans"
									},
									{
										val: "over60",
										label: "> 60 ans"
									}
								].map((ag) => {
									const isSelected = ageGroupFilter === ag.val;
									const count = ageGroupCounts[ag.val] ?? 0;
									return /* @__PURE__ */ <button key={ag.val} type="button" onClick={() => onChangeAgeGroup(ag.val)} className={`h-9 px-2.5 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-colors ${isSelected ? "bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-bold shadow-2xs" : "bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/40"}`}>
<span className="truncate">{ag.label}</span>
<span className="text-[10px] font-mono opacity-70 tabular-nums ml-1">{count}</span>
</button>;
								})}
</div>
</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/75">{t("member_filter_plan_label", language)}</label>
{planFilter !== "All" && /* @__PURE__ */ <button type="button" onClick={() => onChangePlan("All")} className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer">{language === "ar" ? "عرض الكل" : language === "fr" ? "Toutes" : "Show All"}</button>}
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
<button type="button" onClick={() => onChangePlan("All")} className={`px-3 py-2 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-colors ${planFilter === "All" ? "bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-bold shadow-2xs" : "bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}>
<span className="truncate">{t("member_filter_all_plans", language)}</span>
<span className="text-[10px] font-mono opacity-70 tabular-nums ml-1">{totalMembersCount}</span>
</button>
{dynamicAvailablePlans.map((p: any) => {
									const isSelected = planFilter === p.id || planFilter === p.name;
									const count = planCounts.get(p.id) ?? 0;
									return /* @__PURE__ */ <button key={p.id} type="button" onClick={() => onChangePlan(p.id)} className={`px-3 py-2 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-colors ${isSelected ? "bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-bold shadow-2xs" : "bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"}`}>
<div className="min-w-0 text-left rtl:text-right">
<div className="truncate font-semibold">{p.name}</div>
{p.price > 0 && /* @__PURE__ */ <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">{formatMoney(p.price)}</div>}
</div>
<span className="text-[10px] font-mono opacity-70 tabular-nums ml-2 shrink-0">{count}</span>
</button>;
								})}
</div>
</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/75">
{language === "ar" ? "حالة الحساب والوصول" : language === "fr" ? "Statut du compte" : "Account Status"}
</label>
{statusFilter !== "All" && /* @__PURE__ */ <button type="button" onClick={() => onChangeStatus("All")} className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer">
{language === "ar" ? "إعادة ضبط" : language === "fr" ? "Réinitialiser" : "Reset"}
</button>}
</div>
<div className="w-full overflow-x-auto pb-0.5">
<LiveSegmentedControl size="sm" fullWidth className="min-w-max [&>button]:px-2.5" options={extendedStatusOptions} value={statusFilter} onValueChange={(val) => onChangeStatus(val)} aria-label={language === "ar" ? "حالة الحساب" : "Statut du compte"} />
</div>
</div>
</div>
<div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 shrink-0">
{hasActiveAdvancedFilters && <BrandedAtriumButton tone="soft" size={40} onClick={onResetFilters} className="font-semibold text-xs">
<span>
{language === "ar" ? "إعادة ضبط" : language === "fr" ? "Réinitialiser" : "Reset"}
</span>
</BrandedAtriumButton>}
<BrandedAtriumButton tone="accent" size={40} onClick={onClose} className="flex-1 font-semibold text-xs">
<span>
{language === "ar" ? `عرض ${displayCount} من ${membersUpper}` : language === "fr" ? `Afficher ${displayCount} ${membersLower}` : `Show ${displayCount} ${membersUpper}`}
</span>
</BrandedAtriumButton>
</div>
</div>
</div>, document.body);
});

MembersFilterModal.displayName = "MembersFilterModal";

export const MembershipMembersView: React.FC<any> = React.memo(({ onAddMember, onEditMember }) => {
	const { members, plans, businesses, branches, currentBusiness, currentBusinessId, currentBranch, terminology, language, appointments, sales, schedule, switchBusiness, switchBranch, selectedMember, isDetailOpen, selectMember, closeDetail, updateMember, deleteMember, checkInMember, setScreen, showToast, isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout } = useAtriumStore();
	const [statusFilter, setStatusFilter] = React.useState("All");
	const [genderFilter, setGenderFilter] = React.useState("All");
	const [ageGroupFilter, setAgeGroupFilter] = React.useState("All");
	const [isSearchActive, setIsSearchActive] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [planFilter, setPlanFilter] = React.useState("All");
	const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
	const [selectedIds, setSelectedIds] = React.useState<any[]>([]);
	const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<string>>(() => /* @__PURE__ */ new Set());
	const [pinnedMemberIds, setPinnedMemberIds] = React.useState<Set<string>>(() => /* @__PURE__ */ new Set());
	const [expandedMemberIds, setExpandedMemberIds] = React.useState<Set<string>>(() => /* @__PURE__ */ new Set());
	const [memberSortBy, setMemberSortBy] = React.useState("member");
	const [memberSortDir, setMemberSortDir] = React.useState<"asc" | "desc">("asc");
	const toggleExpandMember = React.useCallback((id: any) => {
		const key = String(id);
		setExpandedMemberIds((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}, []);
	const [isBookModalOpen, setIsBookModalOpen] = React.useState(false);
	const [panelInitialTab, setPanelInitialTab] = React.useState<"overview" | "access" | "billing">("overview");
	const panelOpenerRef = React.useRef<any>(null);
	const lastSelectedIdxRef = React.useRef(-1);
	const [isFilterPopoverOpen, setIsFilterPopoverOpen] = React.useState(false);
	const filterPopoverRef = React.useRef<any>(null);
	const filterButtonRef = React.useRef<any>(null);
	const toggleFilterPopover = React.useCallback(() => {
		setIsFilterPopoverOpen((prev) => !prev);
	}, []);
	const closeFilterPopover = React.useCallback(() => {
		setIsFilterPopoverOpen(false);
	}, []);
	React.useEffect(() => {
		if (!isFilterPopoverOpen) return;
		const handleKeyDown = (e: any) => {
			if (e.key === "Escape") {
				setIsFilterPopoverOpen(false);
				filterButtonRef.current?.focus();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isFilterPopoverOpen]);
	const hasActiveAdvancedFilters = planFilter !== "All" || genderFilter !== "All" || ageGroupFilter !== "All" || statusFilter === "Expired" || statusFilter === "Archived";
	const activeFiltersCount = (planFilter !== "All" ? 1 : 0) + (genderFilter !== "All" ? 1 : 0) + (ageGroupFilter !== "All" ? 1 : 0) + (statusFilter === "Expired" || statusFilter === "Archived" ? 1 : 0);
	const handleResetFilters = React.useCallback(() => {
		setPlanFilter("All");
		setGenderFilter("All");
		setAgeGroupFilter("All");
		setStatusFilter((prev) => prev === "Expired" || prev === "Archived" ? "All" : prev);
		setSearchQuery("");
		setIsFilterPopoverOpen(false);
	}, []);
	const dynamicAvailablePlans = React.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		plans.forEach((p) => {
			map.set(p.id, {
				id: p.id,
				name: p.name,
				price: p.price?.amount || 0
			});
		});
		members.forEach((m) => {
			if (m.membershipPlanId && !map.has(m.membershipPlanId)) map.set(m.membershipPlanId, {
				id: m.membershipPlanId,
				name: m.membershipPlanName || m.membershipPlanId,
				price: 0
			});
		});
		return Array.from(map.values());
	}, [plans, members]);
	const daysRemainingByDate = React.useMemo(() => {
		const cache = /* @__PURE__ */ new Map();
		for (let i = 0; i < members.length; i++) {
			const exp = members[i].expirationDate || "";
			if (!cache.has(exp)) cache.set(exp, calculateDaysRemaining(false, exp));
		}
		return cache;
	}, [members]);
	const { activeMembersCount, expiringCount, expiredCount, archivedCount } = React.useMemo(() => {
		let active = 0;
		let expiring = 0;
		let expired = 0;
		let archived = 0;
		for (let i = 0; i < members.length; i++) {
			const m = members[i];
			if (m.status === "Active") active++;
			else if (m.status === "Expired") expired++;
			else if (m.status === "Banned" || m.status === "Suspended") archived++;
			const d = daysRemainingByDate.get(m.expirationDate || "") ?? 999;
			if (d <= 14 && d > 0) expiring++;
		}
		return {
			activeMembersCount: active,
			expiringCount: expiring,
			expiredCount: expired,
			archivedCount: archived
		};
	}, [members, daysRemainingByDate]);
	const displayMembers = React.useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return members.filter((member) => {
			if (statusFilter !== "All") {
				if (statusFilter === "Active" && member.status !== "Active") return false;
				if (statusFilter === "Expired" && member.status !== "Expired") return false;
				if (statusFilter === "Expiring") {
					if ((daysRemainingByDate.get(member.expirationDate || "") ?? calculateDaysRemaining(false, member.expirationDate)) > 14) return false;
				}
				if (statusFilter === "Archived" && member.status !== "Banned" && member.status !== "Suspended") return false;
			}
			if (planFilter !== "All") {
				if (member.membershipPlanId !== planFilter && member.membershipPlanName !== planFilter) return false;
			}
			if (genderFilter !== "All") {
				if (genderFilter === "Other") {
					if (member.gender === "Male" || member.gender === "Female") return false;
				} else if (member.gender !== genderFilter) return false;
			}
			if (ageGroupFilter !== "All") {
				if (!matchesAgeGroup(member.dateOfBirth, ageGroupFilter)) return false;
			}
			if (q) {
				if (!member.fullName.toLowerCase().includes(q) && !member.phoneNumber.includes(q) && !member.cardId?.toLowerCase().includes(q)) return false;
			}
			return true;
		});
	}, [
		members,
		daysRemainingByDate,
		statusFilter,
		planFilter,
		genderFilter,
		ageGroupFilter,
		searchQuery
	]);
	const { ageGroupCounts, planCounts } = React.useMemo(() => {
		const ag = {
			All: members.length,
			under18: 0,
			"18-25": 0,
			"26-40": 0,
			"41-60": 0,
			over60: 0,
			unspecified: 0
		};
		const pc = /* @__PURE__ */ new Map();
		for (let i = 0; i < members.length; i++) {
			const m = members[i];
			const age = getMemberAge(m.dateOfBirth);
			if (age === null) ag.unspecified++;
			else if (age < 18) ag.under18++;
			else if (age <= 25) ag["18-25"]++;
			else if (age <= 40) ag["26-40"]++;
			else if (age <= 60) ag["41-60"]++;
			else ag.over60++;
			if (m.membershipPlanId) pc.set(m.membershipPlanId, (pc.get(m.membershipPlanId) || 0) + 1);
			if (m.membershipPlanName && m.membershipPlanName !== m.membershipPlanId) pc.set(m.membershipPlanName, (pc.get(m.membershipPlanName) || 0) + 1);
		}
		for (let i = 0; i < dynamicAvailablePlans.length; i++) {
			const p = dynamicAvailablePlans[i];
			if (!pc.has(p.id) && pc.has(p.name)) pc.set(p.id, pc.get(p.name));
		}
		return {
			ageGroupCounts: ag,
			planCounts: pc
		};
	}, [members, dynamicAvailablePlans]);
	const quickStatusOptions = React.useMemo(() => [
		{
			value: "All",
			label: language === "ar" ? "جميع المشتركين" : language === "fr" ? "Tous les adhérents" : "All Members",
			count: members.length
		},
		{
			value: "Active",
			label: language === "ar" ? "اشتراكات نشطة" : language === "fr" ? "Abonnements actifs" : "Active Members",
			count: activeMembersCount
		},
		{
			value: "Expiring",
			label: language === "ar" ? "قيد التجديد (<14j)" : language === "fr" ? "À renouveler (<14j)" : "Expiring (<14d)",
			count: expiringCount
		}
	], [
		language,
		members.length,
		activeMembersCount,
		expiringCount
	]);
	const extendedStatusOptions = React.useMemo(() => [
		{
			value: "All",
			label: t("member_filter_all", language),
			count: members.length
		},
		{
			value: "Active",
			label: t("member_filter_active", language),
			count: activeMembersCount
		},
		{
			value: "Expiring",
			label: t("member_filter_expiring", language),
			count: expiringCount
		},
		{
			value: "Expired",
			label: t("member_filter_expired", language),
			count: expiredCount
		},
		{
			value: "Archived",
			label: t("member_filter_archived", language),
			count: archivedCount
		}
	], [
		language,
		members.length,
		activeMembersCount,
		expiringCount,
		expiredCount,
		archivedCount
	]);
	const genderFilterOptions = React.useMemo(() => [
		{
			value: "All",
			label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"
		},
		{
			value: "Male",
			label: language === "ar" ? "ذكور" : language === "fr" ? "Hommes" : "Male"
		},
		{
			value: "Female",
			label: language === "ar" ? "إناث" : language === "fr" ? "Femmes" : "Female"
		},
		{
			value: "Other",
			label: language === "ar" ? "آخر" : language === "fr" ? "Autre" : "Other"
		}
	], [language]);
	const viewSwitcherOptions = React.useMemo(() => [{
		value: "list",
		icon: /* @__PURE__ */ <List className="w-4 h-4" />,
		"aria-label": "List View"
	}, {
		value: "grid",
		icon: /* @__PURE__ */ <LayoutGrid className="w-4 h-4" />,
		"aria-label": "Grid View"
	}], []);
	const sortedMembers = React.useMemo(() => {
		const list = [...displayMembers];
		list.sort((a, b) => {
			const aPinned = pinnedMemberIds.has(a.id) ? 1 : 0;
			const bPinned = pinnedMemberIds.has(b.id) ? 1 : 0;
			if (aPinned !== bPinned) return bPinned - aPinned;
			if (memberSortBy === "member") {
				const comp = MEMBER_COLLATOR.compare(a.fullName, b.fullName);
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "plan") {
				const comp = MEMBER_COLLATOR.compare(a.membershipPlanName || "", b.membershipPlanName || "");
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "status") {
				const comp = MEMBER_COLLATOR.compare(a.status, b.status);
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "expiration") {
				const ea = a.expirationDate || "";
				const eb = b.expirationDate || "";
				const comp = ea < eb ? -1 : ea > eb ? 1 : 0;
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "balance") {
				const comp = Number(a.balance || 0) - Number(b.balance || 0);
				return memberSortDir === "asc" ? comp : -comp;
			}
			return 0;
		});
		return list;
	}, [
		displayMembers,
		pinnedMemberIds,
		memberSortBy,
		memberSortDir
	]);
	const scrollContainerRef = React.useRef<any>(null);
	const rowsElRef = React.useRef<any>(null);
	const filterKey = `${statusFilter}|${planFilter}|${genderFilter}|${ageGroupFilter}|${searchQuery}`;
	const handlePruneSelection = React.useCallback((hiddenIds: any[]) => {
		if (hiddenIds.length === 0) return;
		setSelectedMemberIds((prev) => {
			let changed = false;
			hiddenIds.forEach((id: any) => {
				if (prev.has(id)) changed = true;
			});
			if (!changed) return prev;
			const next = new Set(prev);
			hiddenIds.forEach((id: any) => next.delete(id));
			return next;
		});
	}, []);
	const handleFilterScrollReset = React.useCallback(() => {
		const scr = scrollContainerRef.current;
		if (scr && scr.scrollTop > 0) scr.scrollTop = 0;
		const outerScroll = scr?.closest("main, [data-scroll-container]");
		if (outerScroll && outerScroll.scrollTop > 0) outerScroll.scrollTop = 0;
	}, []);
	const { renderedRows, registerRowRefs } = useKineticRowLayout({
		matchingMembers: sortedMembers,
		expandedMemberIds,
		viewMode,
		filterKey,
		rowsElRef,
		scrollContainerRef,
		openMemberId: isDetailOpen ? selectedMember?.id ?? null : null,
		onPruneSelection: handlePruneSelection,
		onFilterChange: handleFilterScrollReset
	});
	const lastRowDataMapRef = React.useRef(/* @__PURE__ */ new Map());
	const memberRowDataMap = React.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (let i = 0; i < members.length; i++) {
			const member = members[i];
			const daysRemaining = daysRemainingByDate.get(member.expirationDate || "") ?? calculateDaysRemaining(false, member.expirationDate);
			const remainingText = daysRemaining > 0 ? `${daysRemaining} j restants` : daysRemaining === 0 ? "Expire aujourd’hui" : "Expiré";
			const isBlocked = member.status === "Suspended" || member.status === "Banned" || Boolean((member as any).isBlocked);
			const isExp = member.status === "Expired" || daysRemaining <= 0;
			const rowData = {
				id: member.id,
				name: member.fullName || "Adhérent",
				phone: member.phoneNumber || "",
				email: member.email || "",
				planName: member.membershipPlanName || "Full Access Monthly",
				status: isBlocked ? "Bloqué" : isExp ? "Expiré" : "Actif",
				statusVariant: isBlocked ? "blocked" : isExp ? "expired" : "active",
				expiryDate: member.expirationDate || "Non spécifié",
				daysRemainingLabel: remainingText,
				balance: member.balance || 0,
				balanceLabel: member.balance ? `${Math.round(member.balance).toLocaleString()} DZD` : "Soldé",
				avatarColor: getMemberInitialsColor(member.fullName),
				remainingSessions: member.remainingSessions ?? 24,
				notes: member.notes,
				isBlocked
			};
			map.set(member.id, rowData);
			lastRowDataMapRef.current.set(member.id, rowData);
		}
		return map;
	}, [members, daysRemainingByDate]);
	const sortedMembersRef = React.useRef(sortedMembers);
	sortedMembersRef.current = sortedMembers;
	const membersByIdRef = React.useRef(/* @__PURE__ */ new Map());
	membersByIdRef.current = React.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		members.forEach((m) => map.set(m.id, m));
		return map;
	}, [members]);
	const handleSelectRow = React.useCallback((id: any, e: any) => {
		const key = String(id);
		const list = sortedMembersRef.current;
		const idx = list.findIndex((m) => m.id === key);
		setSelectedMemberIds((prev) => {
			const next = new Set(prev);
			if (e.shiftKey && lastSelectedIdxRef.current > -1 && idx > -1) {
				const start = Math.min(lastSelectedIdxRef.current, idx);
				const end = Math.max(lastSelectedIdxRef.current, idx);
				for (let i = start; i <= end; i++) next.add(list[i].id);
			} else if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
		if (idx > -1) lastSelectedIdxRef.current = idx;
	}, []);
	const handleOpenRowDetails = React.useCallback((id: any, originEl: any) => {
		panelOpenerRef.current = originEl || document.activeElement;
		setPanelInitialTab("overview");
		selectMember(String(id));
	}, [selectMember]);
	const handleEditRow = React.useCallback((id: any, originEl: any) => {
		const m = membersByIdRef.current.get(String(id));
		if (m) onEditMember(m, originEl);
	}, [onEditMember]);
	const handleMessageRow = React.useCallback((id: any) => {
		const m = membersByIdRef.current.get(String(id));
		if (!m) return;
		if (m.email) window.location.href = `mailto:${m.email}`;
		else showToast({
			type: "info",
			title: "Email draft",
			message: `No email address for ${m.fullName}`
		});
	}, [showToast]);
	const handleDeleteRow = React.useCallback((id: any) => {
		const m = membersByIdRef.current.get(String(id));
		if (!m) return;
		deleteMember(m.id);
		showToast({
			type: "info",
			title: "Adhérent supprimé",
			message: `${m.fullName} a été retiré.`
		});
	}, [deleteMember, showToast]);
	const handleRenewRow = React.useCallback((id: any) => {
		const m = membersByIdRef.current.get(String(id));
		if (!m) return;
		const currentExp = new Date(m.expirationDate || (/* @__PURE__ */ new Date()).toISOString());
		const newExp = new Date(currentExp.getTime() + 2592e6).toISOString().split("T")[0];
		updateMember(m.id, {
			expirationDate: newExp,
			status: "Active"
		});
		showToast({
			type: "success",
			title: "Abonnement renouvelé",
			message: `${m.fullName} prolongé jusqu'au ${newExp}`
		});
	}, [updateMember, showToast]);
	const handleArchiveRow = React.useCallback((id: any) => {
		const m = membersByIdRef.current.get(String(id));
		if (!m) return;
		updateMember(m.id, { status: "Suspended" });
		showToast({
			type: "info",
			title: "Adhérent archivé",
			message: `${m.fullName} archivé (suspendu).`
		});
	}, [updateMember, showToast]);
	const handleToggleStatusRow = React.useCallback((id: any) => {
		const m = membersByIdRef.current.get(String(id));
		if (!m) return;
		const isBlocked = m.status === "Suspended" || m.status === "Banned" || Boolean((m as any).isBlocked);
		const newStatus = isBlocked ? "Active" : "Suspended";
		updateMember(m.id, { status: newStatus });
		showToast({
			type: isBlocked ? "success" : "info",
			title: isBlocked ? "Badge réactivé" : "Badge gelé",
			message: `${m.fullName}: ${isBlocked ? "Accès rétabli" : "Accès temporairement suspendu"}`
		});
	}, [updateMember, showToast]);
	const handleTogglePinRow = React.useCallback((id: any) => {
		const key = String(id);
		const m = membersByIdRef.current.get(key);
		setPinnedMemberIds((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
				if (m) showToast({
					type: "info",
					title: "Détaché",
					message: `${m.fullName} n'est plus épinglé`
				});
			} else {
				next.add(key);
				if (m) showToast({
					type: "success",
					title: "Épinglé",
					message: `${m.fullName} épinglé en tête de liste`
				});
			}
			return next;
		});
	}, [showToast]);
	const handlePayRow = React.useCallback((id: any) => {
		setPanelInitialTab("billing");
		selectMember(String(id));
	}, [selectMember]);
	React.useEffect(() => {
		const handleCreated = (e: any) => {
			const newMember = e.detail;
			if (statusFilter !== "All" && statusFilter !== newMember?.status) setStatusFilter("All");
			setSearchQuery("");
			setPlanFilter("All");
			setGenderFilter("All");
			setAgeGroupFilter("All");
			if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
		};
		window.addEventListener("atrium-member-created", handleCreated);
		return () => window.removeEventListener("atrium-member-created", handleCreated);
	}, [statusFilter]);
	const handleInspectorSelectMember = React.useCallback((m: any) => selectMember(m.id), [selectMember]);
	const handleInspectorEdit = React.useCallback((m: any, originEl: any) => onEditMember(m, originEl || document.activeElement), [onEditMember]);
	const handleInspectorDelete = React.useCallback((m: any) => {
		deleteMember(m.id);
		closeDetail();
		showToast({
			type: "info",
			title: "Adhérent supprimé",
			message: `${m.fullName} a été supprimé.`
		});
	}, [
		deleteMember,
		closeDetail,
		showToast
	]);
	const handleInspectorCheckIn = React.useCallback((m: any) => {
		checkInMember(m.id);
		showToast({
			type: "success",
			title: "Passage enregistré",
			message: `Accès autorisé pour ${m.fullName}`
		});
	}, [checkInMember, showToast]);
	const handleInspectorRenew = React.useCallback((m: any) => {
		const daysToAdd = m.membershipPlanName?.toLowerCase().includes("trimest") || m.membershipPlanName?.toLowerCase().includes("quarter") ? 90 : 30;
		const currentExp = new Date(m.expirationDate || (/* @__PURE__ */ new Date()).toISOString());
		const newExp = new Date(currentExp.getTime() + daysToAdd * 864e5).toISOString().split("T")[0];
		updateMember(m.id, {
			expirationDate: newExp,
			status: "Active"
		});
		showToast({
			type: "success",
			title: "Abonnement renouvelé",
			message: `${m.fullName} prolongé jusqu'au ${newExp}`
		});
	}, [updateMember, showToast]);
	const handleInspectorToggleBlock = React.useCallback((m: any) => {
		const isCurrentlyBlocked = m.status === "Suspended" || m.status === "Banned" || Boolean(m.isBlocked);
		const nextStatus = isCurrentlyBlocked ? "Active" : "Suspended";
		updateMember(m.id, {
			status: nextStatus,
			isBlocked: !isCurrentlyBlocked
		} as any);
		showToast({
			type: "info",
			title: !isCurrentlyBlocked ? "Badge bloqué" : "Badge débloqué",
			message: `Badge de ${m.fullName} ${!isCurrentlyBlocked ? "bloqué" : "débloqué"}.`
		});
	}, [updateMember, showToast]);
	const handleInspectorUpdateNotes = React.useCallback((id: any, notes: any) => updateMember(id, { notes }), [updateMember]);
	const handleInspectorToast = React.useCallback((msg: any) => showToast({
		type: "info",
		title: "Notification",
		message: msg
	}), [showToast]);
	const selectedMemberIdsRef = React.useRef(selectedMemberIds);
	selectedMemberIdsRef.current = selectedMemberIds;
	const handleBulkClear = React.useCallback(() => setSelectedMemberIds(/* @__PURE__ */ new Set()), []);
	const handleBulkRenew = React.useCallback(() => {
		const ids = selectedMemberIdsRef.current;
		ids.forEach((id) => {
			const m = membersByIdRef.current.get(id);
			if (m) {
				const currentExp = new Date(m.expirationDate || (/* @__PURE__ */ new Date()).toISOString());
				const newExp = new Date(currentExp.getTime() + 2592e6).toISOString().split("T")[0];
				updateMember(m.id, {
					expirationDate: newExp,
					status: "Active"
				});
			}
		});
		showToast({
			type: "success",
			title: "Renouvellement groupé",
			message: `${ids.size} adhérents renouvelés.`
		});
	}, [updateMember, showToast]);
	const handleBulkArchive = React.useCallback(() => {
		const ids = selectedMemberIdsRef.current;
		ids.forEach((id) => {
			updateMember(id, { status: "Suspended" });
		});
		setSelectedMemberIds(/* @__PURE__ */ new Set());
		showToast({
			type: "info",
			title: "Archivage groupé",
			message: `${ids.size} adhérents archivés.`
		});
	}, [updateMember, showToast]);
	const handleBulkDelete = React.useCallback(() => {
		selectedMemberIdsRef.current.forEach((id) => deleteMember(id));
		setSelectedMemberIds(/* @__PURE__ */ new Set());
		showToast({
			type: "info",
			title: "Suppression groupée",
			message: "Adhérents supprimés."
		});
	}, [deleteMember, showToast]);
	const activeCountRef = useSpringCountRef(activeMembersCount);
	const expiringChipCountRef = useSpringCountRef(expiringCount);
	const expiringBigCountRef = useSpringCountRef(expiringCount);
	const inflowChipCountRef = useSpringCountRef(displayMembers.length, { prefix: "+" });
	const inflowBigCountRef = useSpringCountRef(displayMembers.length, { prefix: "+" });
	const listBadgeCountRef = useSpringCountRef(displayMembers.length);
	const displayMembersRef = React.useRef(displayMembers);
	displayMembersRef.current = displayMembers;
	const handleExportCSV = React.useCallback(() => {
		const list = displayMembersRef.current;
		const headers = [
			language === "ar" ? "الاسم الكامل" : language === "fr" ? "Nom complet" : "Full Name",
			language === "ar" ? "معرف البطاقة" : language === "fr" ? "Identifiant carte" : "Card ID",
			language === "ar" ? "الباقة" : language === "fr" ? "Formule" : "Plan",
			language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status",
			language === "ar" ? "الرصيد" : language === "fr" ? "Solde" : "Balance",
			language === "ar" ? "الهاتف" : language === "fr" ? "Téléphone" : "Phone",
			language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-mail" : "Email",
			language === "ar" ? "تاريخ الانتهاء" : language === "fr" ? "Date d'expiration" : "Expiration Date"
		];
		const rows = list.map((m) => [
			`"${m.fullName}"`,
			`"${m.cardId || ""}"`,
			`"${m.membershipPlanName || (language === "ar" ? "القياسية" : language === "fr" ? "Standard" : "Standard")}"`,
			`"${localizeStatus(m.status, language)}"`,
			`"0.00 ${language === "ar" ? "د.ج" : "DA"}"`,
			`"${m.phoneNumber}"`,
			`"${m.email}"`,
			`"${m.expirationDate}"`
		]);
		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `atrium-members-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}, [language]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: members.length > 0
	});
	if (showSkeleton && (members.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
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
				width: "1.2*",
				minWidth: "100px"
			},
			{
				width: "100px",
				minWidth: "90px"
			}
		]} viewMode={viewMode} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200 relative">
<MembersHeaderBar title={terminology.members} addLabel={`${t("action_add", language)} ${terminology.memberSingle}`} onAddMember={onAddMember} />
<MembersKpiBanner membersLabel={terminology.members} membersLower={terminology.members.toLowerCase()} language={language} activeMembersCount={activeMembersCount} expiringCount={expiringCount} displayCount={displayMembers.length} activeCountRef={activeCountRef} expiringChipCountRef={expiringChipCountRef} expiringBigCountRef={expiringBigCountRef} inflowChipCountRef={inflowChipCountRef} inflowBigCountRef={inflowBigCountRef} />
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3 w-full">
<div className="flex items-center gap-2.5 shrink-0">
<h2 className="text-base font-bold text-black dark:text-white tracking-tight">{language === "ar" ? "قائمة المشتركين" : "Liste des adhérents"}</h2>
<span ref={listBadgeCountRef} className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/70 text-black/75 dark:text-white/80 shadow-2xs tabular-nums">{displayMembers.length}</span>
</div>
<div aria-live="polite" className="sr-only">
{displayMembers.length === 0 ? "Aucun adhérent ne correspond" : `${displayMembers.length} adhérent${displayMembers.length > 1 ? "s" : ""} trouvé${displayMembers.length > 1 ? "s" : ""}`}
</div>
<div className="flex items-center gap-2.5 min-w-0 flex-wrap">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? `البحث في ${terminology.members}...` : language === "fr" ? `Rechercher...` : `Search...`} shutSize={40} openWidth={240} className="shrink-0 !rounded-xl" />
<div className="shrink-0">
<LiveSegmentedControl size="md" options={quickStatusOptions} value={statusFilter === "Expired" || statusFilter === "Archived" ? "All" : statusFilter} onValueChange={(val) => setStatusFilter(val)} aria-label={language === "ar" ? "تصفية المشتركين" : "Filtre des adhérents"} />
</div>
<div className="relative shrink-0">
<button ref={filterButtonRef} type="button" onClick={toggleFilterPopover} className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all shadow-2xs select-none ${hasActiveAdvancedFilters || isFilterPopoverOpen ? "bg-[#FCEEE8] dark:bg-[#d4522f]/15 text-[#d4522f] border-[#d4522f]/40 ring-1 ring-[#d4522f]/20" : "bg-white dark:bg-neutral-800 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"}`} title={language === "ar" ? "مرشحات متقدمة" : language === "fr" ? "Filtres avancés" : "Advanced Filters"} aria-expanded={isFilterPopoverOpen}>
<SlidersHorizontal size={15} className={hasActiveAdvancedFilters ? "text-[#d4522f]" : "text-black/70 dark:text-white/75"} />
<span>{language === "ar" ? "مرشحات" : language === "fr" ? "Filtres" : "Filters"}</span>
{activeFiltersCount > 0 && /* @__PURE__ */ <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center bg-[#d4522f] text-white tabular-nums">{activeFiltersCount}</span>}
<ChevronDown size={13} className={`transition-transform duration-200 text-black/55 dark:text-white/55 ${isFilterPopoverOpen ? "rotate-180" : ""}`} />
</button>
</div>
</div>
<div className="flex items-center gap-2 shrink-0">
<LiveSegmentedControl size="md" options={viewSwitcherOptions} value={viewMode} onValueChange={(val) => setViewMode(val as "list" | "grid")} aria-label="View Switcher" />
<LiquidButton kind="export" size={40} tone="accent" labels={{
										idle: language === "ar" ? "تصدير" : language === "fr" ? "Exporter" : "Export",
										busy: language === "ar" ? "جاري التصدير" : language === "fr" ? "Exportation..." : "Exporting...",
										done: language === "ar" ? "تم التصدير" : language === "fr" ? "Exporté" : "Exported",
										error: language === "ar" ? "فشل" : language === "fr" ? "Échec" : "Failed"
									}} onPress={async () => {
										await new Promise((resolve) => setTimeout(resolve, 600));
										handleExportCSV();
									}} title={t("members_export_csv", language)} aria-label={t("members_export_csv", language)} className="shrink-0 !h-10 !max-h-10 !rounded-xl" style={EXPORT_BTN_STYLE} />
</div>
</div>
<MembersFilterModal isOpen={isFilterPopoverOpen} onClose={closeFilterPopover} filterPopoverRef={filterPopoverRef} language={language} displayCount={displayMembers.length} totalMembersCount={members.length} membersLower={terminology.members.toLowerCase()} membersUpper={terminology.members} hasActiveAdvancedFilters={hasActiveAdvancedFilters} onResetFilters={handleResetFilters} genderFilter={genderFilter} onChangeGender={setGenderFilter} ageGroupFilter={ageGroupFilter} onChangeAgeGroup={setAgeGroupFilter} ageGroupCounts={ageGroupCounts} planFilter={planFilter} onChangePlan={setPlanFilter} dynamicAvailablePlans={dynamicAvailablePlans} planCounts={planCounts} statusFilter={statusFilter} onChangeStatus={setStatusFilter} extendedStatusOptions={extendedStatusOptions} genderFilterOptions={genderFilterOptions} />
{hasActiveAdvancedFilters && /* @__PURE__ */ <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
<span className="text-black/55 dark:text-white/55 font-medium text-[11px]">
{language === "ar" ? "المرشحات النشطة:" : language === "fr" ? "Filtres actifs:" : "Active filters:"}
</span>
{genderFilter !== "All" && /* @__PURE__ */ <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{language === "ar" ? "الجنس" : "Sexe"}
{": "}
{genderFilter === "Male" ? language === "ar" ? "ذكور" : "Hommes" : genderFilter === "Female" ? language === "ar" ? "إناث" : "Femmes" : language === "ar" ? "آخر" : "Autre"}
</span>
<button type="button" onClick={() => setGenderFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove gender filter"><X size={12} /></button>
</span>}
{ageGroupFilter !== "All" && /* @__PURE__ */ <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{language === "ar" ? "العمر" : "Âge"}
{": "}
{ageGroupFilter === "under18" ? "< 18 ans" : ageGroupFilter === "18-25" ? "18 - 25 ans" : ageGroupFilter === "26-40" ? "26 - 40 ans" : ageGroupFilter === "41-60" ? "41 - 60 ans" : ageGroupFilter === "over60" ? "> 60 ans" : "Tous"}
</span>
<button type="button" onClick={() => setAgeGroupFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove age filter"><X size={12} /></button>
</span>}
{planFilter !== "All" && /* @__PURE__ */ <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{t("member_filter_plan_label", language)}
{": "}
{dynamicAvailablePlans.find((p) => p.id === planFilter)?.name || plans.find((p) => p.id === planFilter)?.name || planFilter}
</span>
<button type="button" onClick={() => setPlanFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove filter"><X size={12} /></button>
</span>}
{(statusFilter === "Expired" || statusFilter === "Archived") && /* @__PURE__ */ <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status"}
{": "}
{localizeStatus(statusFilter, language)}
</span>
<button type="button" onClick={() => setStatusFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove filter"><X size={12} /></button>
</span>}
<button type="button" onClick={handleResetFilters} className="text-[11px] font-semibold text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white underline cursor-pointer ml-1">
{language === "ar" ? "إعادة تعيين الكل" : language === "fr" ? "Effacer tout" : "Reset all"}
</button>
</div>}
<div className="w-full">
<div className="w-full overflow-x-auto">
<div className="w-full flex flex-col min-w-[940px]">
<div className="th th-adherents bg-white dark:bg-[#1C1B1A] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[var(--atr-ink,#1B1917)] dark:text-[#EAE3DC] box-border select-none" data-v={viewMode === "grid" ? "g" : "l"} aria-hidden={viewMode === "grid"}>
<button type="button" role="checkbox" tabIndex={viewMode === "grid" ? -1 : 0} aria-checked={selectedMemberIds.size === 0 ? "false" : selectedMemberIds.size === sortedMembers.length && sortedMembers.length > 0 ? "true" : "mixed"} aria-label="Tout sélectionner" onClick={() => {
											if (selectedMemberIds.size === sortedMembers.length) setSelectedMemberIds(/* @__PURE__ */ new Set());
											else setSelectedMemberIds(new Set(sortedMembers.map((m) => m.id)));
										}} className={`cb w-[22px] h-[22px] rounded-[7px] border-[1.5px] grid place-items-center p-0 cursor-pointer ${selectedMemberIds.size === sortedMembers.length && sortedMembers.length > 0 ? "bg-[var(--atr-acc,#C9441F)] border-[var(--atr-acc,#C9441F)] text-white" : "bg-white dark:bg-[#262422] border-[#B3A89E] dark:border-[#5A5550] text-transparent hover:border-[var(--atr-acc,#C9441F)]"}`}>
<Check className={`w-3.5 h-3.5 stroke-[3] transition-opacity duration-120 ${selectedMemberIds.size > 0 ? "opacity-100 text-white" : "opacity-0"}`} />
</button>
{[
										{
											key: "member",
											label: terminology.memberSingle
										},
										{
											key: "plan",
											label: t("member_col_plan", language)
										},
										{
											key: "status",
											label: t("member_col_access", language)
										},
										{
											key: "expiration",
											label: t("member_col_expiration", language)
										},
										{
											key: "balance",
											label: language === "ar" ? "الرصيد" : language === "fr" ? "Solde" : "Balance"
										}
									].map((col) => {
										const isOn = memberSortBy === col.key;
										const dir = memberSortDir;
										return /* @__PURE__ */ <button key={col.key} type="button" data-k={col.key} data-on={isOn ? "true" : void 0} tabIndex={viewMode === "grid" ? -1 : 0} aria-sort={isOn ? dir === "asc" ? "ascending" : "descending" : "none"} onClick={() => {
												if (memberSortBy === col.key) setMemberSortDir((prev) => prev === "asc" ? "desc" : "asc");
												else {
													setMemberSortBy(col.key);
													setMemberSortDir("asc");
												}
											}} className="text-left rtl:text-right font-medium text-[13px] flex items-center gap-2 cursor-pointer hover:text-[var(--atr-acc,#C9441F)] bg-transparent border-0 p-0 text-inherit whitespace-nowrap truncate min-w-0">
<span className="truncate">{col.label}</span>
<i className={`not-italic text-[10px] px-1.5 py-0.5 rounded-[6px] ${isOn ? "bg-[var(--atr-hl,#FBE7DF)] text-[var(--atr-acc,#C9441F)]" : "bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-[var(--atr-mut,#6B635C)]"}`}>{isOn ? dir === "asc" ? "↑" : "↓" : "↕"}</i>
</button>;
									})}
</div>
<div ref={scrollContainerRef} className="scr relative mt-2.5 overflow-y-auto overflow-x-hidden pr-1 pb-[70px] max-h-[640px]">
<div ref={rowsElRef} role="list" aria-label="Adhérents" data-v={viewMode === "grid" ? "g" : "l"} className="rows relative w-full">
{renderedRows.map((rowItem) => {
											const member = rowItem.member;
											const memberRowData = memberRowDataMap.get(member.id) ?? lastRowDataMapRef.current.get(member.id);
											if (!memberRowData) return null;
											return /* @__PURE__ */ <MemberRow key={member.id} member={memberRowData} isSelected={selectedMemberIds.has(member.id)} isOpen={isDetailOpen && selectedMember?.id === member.id} isExpanded={expandedMemberIds.has(member.id)} isPinned={pinnedMemberIds.has(member.id)} registerRowRefs={registerRowRefs} onSelect={handleSelectRow} onToggleExpand={toggleExpandMember} onOpenDetails={handleOpenRowDetails} onEdit={handleEditRow} onMessage={handleMessageRow} onDelete={handleDeleteRow} onRenew={handleRenewRow} onArchive={handleArchiveRow} onToggleStatus={handleToggleStatusRow} onTogglePin={handleTogglePinRow} onPay={handlePayRow} />;
										})}
</div>
{sortedMembers.length === 0 && /* @__PURE__ */ <p className="empty text-center text-[#6B635C] dark:text-[#A89F95] py-10">Aucun adhérent ne correspond. Modifiez la recherche ou les filtres.</p>}
</div>
</div>
</div>
</div>
</div>
<MemberSlideOverInspector isOpen={isDetailOpen && Boolean(selectedMember)} member={selectedMember} allMembers={sortedMembers} openerElement={panelOpenerRef.current} initialTab={panelInitialTab} onClose={closeDetail} onSelectMember={handleInspectorSelectMember} onEdit={handleInspectorEdit} onDelete={handleInspectorDelete} onCheckIn={handleInspectorCheckIn} onRenew={handleInspectorRenew} onToggleBlock={handleInspectorToggleBlock} onUpdateNotes={handleInspectorUpdateNotes} showToast={handleInspectorToast} />
<FloatingBulkBar selectedCount={selectedMemberIds.size} onClear={handleBulkClear} onExport={handleExportCSV} onRenew={handleBulkRenew} onArchive={handleBulkArchive} onDelete={handleBulkDelete} />
{isBookModalOpen && selectedMember && /* @__PURE__ */ <AppointmentModal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} appointment={null} initialDate={(/* @__PURE__ */ new Date()).toISOString().split("T")[0]} initialTime="10:00" initialStaffId={void 0} />}
</div>;
});

MembershipMembersView.displayName = "MembershipMembersView";

export const MembersScreen = MembershipMembersView;
