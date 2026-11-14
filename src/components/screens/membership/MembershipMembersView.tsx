import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { compactFilterLabel } from '../../../utils/filterLexicon';
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
import {
  useAtriumSelector,
  selectCurrentMembersFromState,
  selectCurrentPlansFromState,
  selectTerminologyFromState,
  selectSelectedMemberFromState,
  selectMemberAction,
  closeDetailAction,
  updateMemberAction,
  deleteMemberAction,
  checkInMemberAction,
  showToast as showToastAction,
} from '../../../services/store';
import { Member, MemberStatus } from '../../../types/index';
import { calculateDaysRemaining, formatMoney, localizeStatus } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { MemberRow, MemberRowData } from './components/MemberRow';
import { FloatingBulkBar } from './components/FloatingBulkBar';
import { MemberSlideOverInspector } from './MemberSlideOverInspector';
import {
  Sp,
  TUNES,
  subscribeFrame,
  subscribeCleanup,
  wake,
  checkReducedMotion,
  useSpringCountRef,
} from './motion/adherentsMotion';
import {
  computeMemberModalMetrics,
  computeModalTransformOrigin,
  shouldFinishClosing,
} from '../../modals/memberModalMotion';
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

const EXPORT_BTN_STYLE = {
	height: "40px",
	maxHeight: "40px",
	width: "148px"
};

const computeMemberAge = (dobString: any, refYear: number, refMonth: number, refDate: number): number | null => {
	if (!dobString) return null;
	const dob = new Date(dobString);
	if (isNaN(dob.getTime())) return null;
	let age = refYear - dob.getFullYear();
	const m = refMonth - dob.getMonth();
	if (m < 0 || (m === 0 && refDate < dob.getDate())) age--;
	return age >= 0 ? age : null;
};

const matchesAgeValue = (age: number | null, group: string) => {
	if (group === "All") return true;
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

const MembersHeaderBar = React.memo(({ title, addLabel, onAddMember }: any) => /* @__PURE__ */ <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
<div className="flex items-center gap-3.5 sm:gap-4">
<div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white"><Users size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase rtl:normal-case leading-[0.98] rtl:leading-tight tracking-[0.012em] rtl:tracking-normal text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">{title}</h1>
</div>
</div>
<div className="flex items-end gap-3 relative flex-wrap">
<AtriumButton variant="primary" size="md" data-action="add-member" onClick={(e) => onAddMember(e.currentTarget)} icon={<Plus size={16} strokeWidth={2.2} />} className="px-4 font-semibold shadow-xs"><span className="text-xs sm:text-sm font-semibold">{addLabel}</span></AtriumButton>
</div>
</div>);

MembersHeaderBar.displayName = "MembersHeaderBar";

const MembersKpiBanner = React.memo(({ membersLabel, membersLower, language, activeMembersCount, expiringCount, displayCount, statusFilter, onToggleStatusFilter, activeCountRef, expiringChipCountRef, expiringBigCountRef, inflowChipCountRef, inflowBigCountRef }: any) => {
	const isActiveFilterOn = statusFilter === "Active";
	const isExpiringFilterOn = statusFilter === "Expiring";
	return /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
<div>
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] text-black dark:text-white">
{membersLabel}
{" & "}
{language === "ar" ? "مؤشرات التجديد" : language === "fr" ? "Rétention & Renouvellements" : "Retention Health"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<button
	type="button"
	data-no-liquid="true"
	onClick={() => onToggleStatusFilter("Active")}
	aria-pressed={isActiveFilterOn}
	title={language === "ar" ? "تصفية حسب المشتركين النشطين" : language === "fr" ? "Filtrer les adhérents actifs" : "Filter active members"}
	className={`group relative overflow-hidden p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border text-left rtl:text-right flex flex-col justify-between min-h-[132px] w-full cursor-pointer select-none transform-gpu transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] active:translate-y-0 active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 motion-reduce:transition-none motion-reduce:hover:transform-none ${
		isActiveFilterOn
			? "border-emerald-500/70 dark:border-emerald-400/70 ring-2 ring-emerald-500/20 shadow-[0_10px_24px_-6px_rgba(16,185,129,0.22),0_4px_10px_-2px_rgba(20,16,12,0.06)] dark:shadow-[0_12px_26px_-6px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]"
			: "border-[#E6DED6] dark:border-neutral-700/60 shadow-[0_2px_8px_rgba(20,16,12,0.05),0_1px_2px_rgba(20,16,12,0.04)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#D5C9BE] dark:hover:border-neutral-600/80 hover:shadow-[0_12px_28px_-6px_rgba(20,16,12,0.12),0_4px_10px_-2px_rgba(20,16,12,0.06)] dark:hover:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.1)]"
	}`}
>
<div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.14),transparent_70%)] ${isActiveFilterOn ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
<div className="relative z-10 w-full">
<div className="flex items-center justify-between gap-2">
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">
{language === "ar" ? `قاعدة ${membersLabel} النشطة` : language === "fr" ? `Base active ${membersLower}` : `Active ${membersLabel} Base`}
</span>
{isActiveFilterOn && <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-emerald-700 dark:text-emerald-300 bg-emerald-500/12 px-1.5 py-0.5 rounded-md">{language === "ar" ? "مُصفّى" : language === "fr" ? "Filtré" : "Filtered"}</span>}
</div>
<div className="mt-1.5">
<span className="inline-block text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
{"↗ 100% "}
{language === "ar" ? "نشط" : language === "fr" ? "Actifs" : "Active"}
</span>
</div>
</div>
<div ref={activeCountRef} className="relative z-10 text-[30px] lg:text-[32px] leading-[0.95] font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left rtl:origin-right group-hover:scale-[1.03]">{activeMembersCount}</div>
</button>
<button
	type="button"
	data-no-liquid="true"
	onClick={() => onToggleStatusFilter("Expiring")}
	aria-pressed={isExpiringFilterOn}
	title={language === "ar" ? "تصفية حسب الاشتراكات التي تنتهي قريباً" : language === "fr" ? "Filtrer les renouvellements imminents" : "Filter expiring memberships"}
	className={`group relative overflow-hidden p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border text-left rtl:text-right flex flex-col justify-between min-h-[132px] w-full cursor-pointer select-none transform-gpu transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] active:translate-y-0 active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4522f]/70 motion-reduce:transition-none motion-reduce:hover:transform-none ${
		isExpiringFilterOn
			? "border-[#d4522f]/75 dark:border-[#e8643f]/75 ring-2 ring-[#d4522f]/20 shadow-[0_10px_24px_-6px_rgba(212,82,47,0.22),0_4px_10px_-2px_rgba(20,16,12,0.06)] dark:shadow-[0_12px_26px_-6px_rgba(232,100,63,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]"
			: "border-[#E6DED6] dark:border-neutral-700/60 shadow-[0_2px_8px_rgba(20,16,12,0.05),0_1px_2px_rgba(20,16,12,0.04)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#D5C9BE] dark:hover:border-neutral-600/80 hover:shadow-[0_12px_28px_-6px_rgba(20,16,12,0.12),0_4px_10px_-2px_rgba(20,16,12,0.06)] dark:hover:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.1)]"
	}`}
>
<div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 bg-[radial-gradient(240px_circle_at_90%_10%,rgba(212,82,47,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(232,100,63,0.14),transparent_70%)] ${isExpiringFilterOn ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
<div className="relative z-10 w-full">
<div className="flex items-center justify-between gap-2">
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">
{language === "ar" ? "تنبيهات انتهاء الاشتراك" : language === "fr" ? "Alertes de renouvellement" : "Renewal & Retention Alert"}
</span>
{isExpiringFilterOn && <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#d4522f] dark:text-[#FF8D7A] bg-[#d4522f]/12 px-1.5 py-0.5 rounded-md">{language === "ar" ? "مُصفّى" : language === "fr" ? "Filtré" : "Filtered"}</span>}
</div>
<div className="mt-1.5">
<span className="inline-block text-[10.5px] font-semibold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
<span ref={expiringChipCountRef}>{expiringCount}</span>
{" "}
{language === "ar" ? "تنتهي قريباً (<14j)" : language === "fr" ? "expirent sous 14j" : "expiring (<14d)"}
</span>
</div>
</div>
<div ref={expiringBigCountRef} className="relative z-10 text-[30px] lg:text-[32px] leading-[0.95] font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left rtl:origin-right group-hover:scale-[1.03]">{expiringCount}</div>
</button>
<div className="group relative overflow-hidden p-4.5 sm:p-5 rounded-[18px] bg-[#1F1D1B] border border-white/[0.08] text-white flex flex-col justify-between min-h-[132px] shadow-[0_4px_14px_rgba(20,16,12,0.16),0_1px_3px_rgba(20,16,12,0.12)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.07)] transform-gpu transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] hover:border-[#FB923C]/35 hover:shadow-[0_14px_30px_-6px_rgba(212,82,47,0.24),0_6px_14px_-2px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.72),0_0_0_1px_rgba(251,146,60,0.22)] motion-reduce:transition-none motion-reduce:hover:transform-none">
<div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(260px_circle_at_88%_12%,rgba(251,146,60,0.14),transparent_70%)]" />
<div className="relative z-10 flex items-center justify-between gap-2">
<span className="text-[12px] font-medium text-white/75">
{language === "ar" ? "الوافدون الجدد شهرياً" : language === "fr" ? "Adhésions du mois" : "Monthly Inflow"}
</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5">
<span ref={inflowChipCountRef}>
+
{displayCount}
</span>
{" "}
{membersLower}
</span>
</div>
<div className="relative z-10">
<div ref={inflowBigCountRef} className="text-[30px] lg:text-[32px] leading-[0.95] font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left rtl:origin-right group-hover:scale-[1.03]">
+
{displayCount}
</div>
<p className="text-[11.5px] text-white/65 mt-1.5">
{language === "ar" ? "باقات وحسابات جديدة هذا الشهر" : language === "fr" ? "Nouveaux forfaits et profils ce mois-ci" : "New packages & client profiles this month"}
</p>
</div>
</div>
</div>
</div>;
});

MembersKpiBanner.displayName = "MembersKpiBanner";

const MembersFilterModal = React.memo(({ isOpen, onClose, filterPopoverRef, triggerRef, language, displayCount, totalMembersCount, membersLower, membersUpper, hasActiveAdvancedFilters, onResetFilters, genderFilter, onChangeGender, ageGroupFilter, onChangeAgeGroup, ageGroupCounts, planFilter, onChangePlan, dynamicAvailablePlans, planCounts, statusFilter, onChangeStatus, extendedStatusOptions, genderFilterOptions }: any) => {
	const hasMountedRef = useRef(isOpen);
	if (isOpen) hasMountedRef.current = true;
	const scrimRef = useRef<HTMLDivElement | null>(null);
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const springRef = useRef<Sp | null>(null);
	const stateRef = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed');
	const lastDrawKeyRef = useRef<string>('');
	const willChangeRef = useRef<boolean>(false);

	if (!springRef.current) {
		springRef.current = new Sp(isOpen ? 100 : 0, TUNES.modal);
	}

	const setDialogRef = useCallback((el: HTMLDivElement | null) => {
		dialogRef.current = el;
		if (filterPopoverRef) filterPopoverRef.current = el;
	}, [filterPopoverRef]);

	const finishClosing = useCallback(() => {
		const root = scrimRef.current;
		const dialog = dialogRef.current;
		const s = springRef.current;
		if (s) {
			s.t = 0;
			s.x = 0;
			s.v = 0;
		}
		if (root) {
			root.hidden = true;
			root.style.opacity = '0';
			root.style.pointerEvents = 'none';
			root.style.willChange = '';
		}
		if (dialog) {
			dialog.style.transform = checkReducedMotion() ? 'scale3d(1, 1, 1)' : 'scale3d(0.72, 0.72, 1)';
			dialog.style.willChange = '';
		}
		stateRef.current = 'closed';
	}, []);

	useEffect(() => {
		const drawFilterModal = () => {
			const st = stateRef.current;
			if (st === 'closed' || checkReducedMotion()) return;
			const root = scrimRef.current;
			const dialog = dialogRef.current;
			const s = springRef.current;
			if (!root || !dialog || !s) return;
			if (st === 'open' && s.rest()) return;

			const metrics = computeMemberModalMetrics(s.x, false);
			const opQ = Math.round(metrics.opacity * 100) / 100;
			const scQ = Math.round(metrics.scale * 1000) / 1000;
			const key = `${opQ}|${scQ}`;
			if (key !== lastDrawKeyRef.current) {
				lastDrawKeyRef.current = key;
				root.style.opacity = String(opQ);
				dialog.style.transform = `scale3d(${scQ}, ${scQ}, 1)`;
			}
		};

		const cleanFilterModal = () => {
			const st = stateRef.current;
			if (st === 'closed' || checkReducedMotion()) return;
			const root = scrimRef.current;
			const dialog = dialogRef.current;
			const s = springRef.current;
			if (!root || !dialog || !s) return;

			if (st === 'opening' && s.t === 100 && s.rest()) {
				s.snap();
				lastDrawKeyRef.current = '1|1';
				root.style.opacity = '1';
				dialog.style.transform = 'scale3d(1, 1, 1)';
				if (willChangeRef.current) {
					willChangeRef.current = false;
					root.style.willChange = '';
					dialog.style.willChange = '';
				}
				stateRef.current = 'open';
			} else if (st === 'closing' && shouldFinishClosing(s.x, s.t)) {
				lastDrawKeyRef.current = '';
				willChangeRef.current = false;
				finishClosing();
			}
		};

		const unsubDraw = subscribeFrame(drawFilterModal);
		const unsubClean = subscribeCleanup(cleanFilterModal);
		return () => {
			unsubDraw();
			unsubClean();
			springRef.current?.destroy();
			springRef.current = null;
		};
	}, [finishClosing]);

	useLayoutEffect(() => {
		const root = scrimRef.current;
		const dialog = dialogRef.current;
		const s = springRef.current;
		if (!root || !dialog || !s) return;

		if (isOpen) {
			const st = stateRef.current;
			if (st === 'opening' || st === 'open') return;
			const reduced = checkReducedMotion();
			stateRef.current = reduced ? 'open' : 'opening';
			root.hidden = false;
			root.style.pointerEvents = 'auto';
			root.style.opacity = reduced ? '1' : '0';
			dialog.style.transform = reduced ? 'scale3d(1, 1, 1)' : 'scale3d(0.72, 0.72, 1)';

			const dRect = dialog.getBoundingClientRect();
			const tRect = triggerRef?.current?.isConnected ? triggerRef.current.getBoundingClientRect() : null;
			dialog.style.transformOrigin = computeModalTransformOrigin(tRect, dRect, window.innerWidth, window.innerHeight);

			if (reduced) {
				s.t = 100;
				s.snap();
				lastDrawKeyRef.current = '1|1';
			} else {
				willChangeRef.current = true;
				root.style.willChange = 'opacity';
				dialog.style.willChange = 'transform';
				if (st === 'closed') {
					s.x = 0;
					s.v = 0;
				}
				s.setTarget(100);
				wake();
			}
		} else if (stateRef.current === 'opening' || stateRef.current === 'open') {
			const reduced = checkReducedMotion();
			root.style.pointerEvents = 'none';
			if (reduced) {
				finishClosing();
			} else {
				stateRef.current = 'closing';
				willChangeRef.current = true;
				root.style.willChange = 'opacity';
				dialog.style.willChange = 'transform';
				s.setTarget(0);
				wake();
			}
		}
	}, [isOpen, finishClosing, triggerRef]);

	if (!hasMountedRef.current) return null;

	return createPortal(/* @__PURE__ */ <div ref={scrimRef} hidden={!isOpen && stateRef.current === 'closed'} className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/45 dark:bg-black/70 select-none" style={{ opacity: 0, pointerEvents: 'none' }} onClick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}} role="dialog" aria-modal="true" aria-hidden={!isOpen} aria-label={language === "ar" ? "مرشحات متقدمة" : language === "fr" ? "Filtres avancés" : "Advanced Filters"}>
<div ref={setDialogRef} style={{ contain: 'layout paint' }} className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-[#1C1B1A] rounded-[26px] border border-[#E6DED6] dark:border-[#3A3734] shadow-[0_18px_48px_rgba(0,0,0,0.22)] p-5 sm:p-6 space-y-4 text-black dark:text-white overflow-hidden flex flex-col select-text" onClick={(e) => e.stopPropagation()}>
<div className="flex items-center justify-between pb-3.5 border-b border-[#E6DED6] dark:border-[#3A3734] shrink-0">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-full bg-[#d4522f]/12 dark:bg-[#d4522f]/20 flex items-center justify-center text-[#d4522f] shadow-2xs"><SlidersHorizontal size={16} /></div>
<div>
<span className="text-sm font-semibold text-black dark:text-white tracking-tight block">
{language === "ar" ? "مرشحات متقدمة" : language === "fr" ? "Filtres avancés" : "Advanced Filters"}
</span>
<span className="text-xs text-black/62 dark:text-white/68 tabular-nums">
{displayCount}
{" "}
{membersLower}
</span>
</div>
</div>
<div className="flex items-center gap-2">
{hasActiveAdvancedFilters && /* @__PURE__ */ <button type="button" data-no-liquid="true" onClick={onResetFilters} className="text-xs font-semibold text-[#d4522f] hover:underline flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md">
<RotateCcw size={12} />
<span>
{language === "ar" ? "إعادة ضبط" : language === "fr" ? "Réinitialiser" : "Reset"}
</span>
</button>}
<button type="button" data-no-liquid="true" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 text-black/62 dark:text-white/68 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors" aria-label="Close filters"><X size={16} /></button>
</div>
</div>
<div className="space-y-4 overflow-y-auto pr-1 max-h-[58vh] -mr-1">
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11.5px] font-semibold uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal text-black/72 dark:text-white/75">{language === "ar" ? "الجنس" : language === "fr" ? "Sexe / Genre" : "Gender"}</label>
{genderFilter !== "All" && /* @__PURE__ */ <button type="button" onClick={() => onChangeGender("All")} className="text-[11px] text-[#d4522f] font-semibold hover:underline cursor-pointer">{language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"}</button>}
</div>
<LiveSegmentedControl size="sm" fullWidth className="min-w-0 [&>button]:min-w-0 [&>button]:px-2" options={genderFilterOptions} value={genderFilter} onValueChange={(val) => onChangeGender(val)} aria-label={language === "ar" ? "الجنس" : "Sexe"} />
</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11.5px] font-semibold uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal text-black/72 dark:text-white/75">
{language === "ar" ? "الفئات العمرية" : language === "fr" ? "Tranches d'âge" : "Age Groups"}
</label>
{ageGroupFilter !== "All" && /* @__PURE__ */ <button type="button" onClick={() => onChangeAgeGroup("All")} className="text-[11px] text-[#d4522f] font-semibold hover:underline cursor-pointer">{language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"}</button>}
</div>
<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
{[
									{
										val: "All",
										label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
										tooltip: language === "ar" ? "جميع الأعمار" : language === "fr" ? "Toutes les tranches d'âge" : "All Ages"
									},
									{
										val: "under18",
										label: "<18",
										tooltip: language === "ar" ? "أقل من 18 سنة" : language === "fr" ? "Moins de 18 ans (< 18 ans)" : "Under 18 years"
									},
									{
										val: "18-25",
										label: "18-25",
										tooltip: language === "ar" ? "18 إلى 25 سنة" : language === "fr" ? "De 18 à 25 ans" : "18 to 25 years"
									},
									{
										val: "26-40",
										label: "26-40",
										tooltip: language === "ar" ? "26 إلى 40 سنة" : language === "fr" ? "De 26 à 40 ans" : "26 to 40 years"
									},
									{
										val: "41-60",
										label: "41-60",
										tooltip: language === "ar" ? "41 إلى 60 سنة" : language === "fr" ? "De 41 à 60 ans" : "41 to 60 years"
									},
									{
										val: "over60",
										label: ">60",
										tooltip: language === "ar" ? "أكثر من 60 سنة" : language === "fr" ? "Plus de 60 ans (> 60 ans)" : "Over 60 years"
									}
								].map((ag) => {
									const isSelected = ageGroupFilter === ag.val;
									const count = ageGroupCounts[ag.val] ?? 0;
									return /* @__PURE__ */ <button key={ag.val} type="button" data-no-liquid="true" onClick={() => onChangeAgeGroup(ag.val)} title={ag.tooltip} className={`h-9 px-2.5 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-colors ${isSelected ? "bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-semibold shadow-2xs" : "bg-[#FBF8F5] dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-[#F3EDE7] dark:hover:bg-neutral-700/40"}`}>
<span className="truncate">{ag.label}</span>
<span className="text-[11px] font-mono opacity-75 tabular-nums ml-1">{count}</span>
</button>;
								})}
</div>
</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11.5px] font-semibold uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal text-black/72 dark:text-white/75">{t("member_filter_plan_label", language)}</label>
{planFilter !== "All" && /* @__PURE__ */ <button type="button" data-no-liquid="true" onClick={() => onChangePlan("All")} title={language === "ar" ? "عرض كل الباقات" : language === "fr" ? "Afficher toutes les formules" : "Show all plans"} className="text-[11px] text-[#d4522f] font-semibold hover:underline cursor-pointer">{language === "ar" ? "الكل" : language === "fr" ? "Toutes" : "All"}</button>}
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
<button type="button" data-no-liquid="true" onClick={() => onChangePlan("All")} title={language === "ar" ? "جميع الباقات" : language === "fr" ? "Toutes les formules" : "All plans"} className={`px-3 py-2 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-colors ${planFilter === "All" ? "bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-semibold shadow-2xs" : "bg-[#FBF8F5] dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-[#F3EDE7] dark:hover:bg-neutral-700/50"}`}>
<span className="truncate">{t("member_filter_all_plans", language)}</span>
<span className="text-[11px] font-mono opacity-75 tabular-nums ml-1">{totalMembersCount}</span>
</button>
{dynamicAvailablePlans.map((p: any) => {
									const isSelected = planFilter === p.id || planFilter === p.name;
									const count = planCounts.get(p.id) ?? 0;
									const compactPlan = compactFilterLabel(p.name);
									return /* @__PURE__ */ <button key={p.id} type="button" data-no-liquid="true" onClick={() => onChangePlan(p.id)} title={p.name} className={`px-3 py-2 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-colors ${isSelected ? "bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-semibold shadow-2xs" : "bg-[#FBF8F5] dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-[#F3EDE7] dark:hover:bg-neutral-700/50"}`}>
<div className="min-w-0 text-left rtl:text-right">
<div className="truncate font-semibold">{compactPlan.label}</div>
{p.price > 0 && /* @__PURE__ */ <div className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums">{formatMoney(p.price)}</div>}
</div>
<span className="text-[11px] font-mono opacity-75 tabular-nums ml-2 shrink-0">{count}</span>
</button>;
								})}
</div>
</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between">
<label className="text-[11.5px] font-semibold uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal text-black/72 dark:text-white/75">
{language === "ar" ? "حالة الحساب والوصول" : language === "fr" ? "Statut du compte" : "Account Status"}
</label>
{statusFilter !== "All" && /* @__PURE__ */ <button type="button" onClick={() => onChangeStatus("All")} className="text-[11px] text-[#d4522f] font-semibold hover:underline cursor-pointer">
{language === "ar" ? "إعادة ضبط" : language === "fr" ? "Réinitialiser" : "Reset"}
</button>}
</div>
<div className="w-full overflow-x-auto pb-0.5">
<LiveSegmentedControl size="sm" fullWidth className="min-w-max [&>button]:px-2.5" options={extendedStatusOptions} value={statusFilter} onValueChange={(val) => onChangeStatus(val)} aria-label={language === "ar" ? "حالة الحساب" : "Statut du compte"} />
</div>
</div>
</div>
<div className="pt-3 border-t border-[#E6DED6] dark:border-[#3A3734] flex items-center gap-2 shrink-0">
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

const MembersKineticListStage = React.memo(({
	scrollContainerRef,
	sortedMembers,
	expandedMemberIds,
	viewMode,
	filterKey,
	openMemberId,
	selectedMemberIds,
	pinnedMemberIds,
	memberSortBy,
	memberSortDir,
	memberRowDataMap,
	lastRowDataMapRef,
	terminology,
	language,
	onPruneSelection,
	onFilterChange,
	onToggleSelectAll,
	onToggleSort,
	onSelectRow,
	onToggleExpand,
	onOpenDetails,
	onEdit,
	onMessage,
	onDelete,
	onRenew,
	onArchive,
	onToggleStatus,
	onTogglePin,
	onPay,
}: any) => {
	const rowsElRef = useRef<HTMLDivElement | null>(null);
	const { renderedRows, registerRowRefs } = useKineticRowLayout({
		matchingMembers: sortedMembers,
		expandedMemberIds,
		viewMode,
		filterKey,
		rowsElRef,
		scrollContainerRef,
		openMemberId,
		onPruneSelection,
		onFilterChange,
	});

	const sortColumns = useMemo(() => [
		{ key: "member", label: terminology.memberSingle },
		{ key: "plan", label: t("member_col_plan", language) },
		{ key: "status", label: t("member_col_access", language) },
		{ key: "expiration", label: t("member_col_expiration", language) },
		{ key: "balance", label: language === "ar" ? "الرصيد" : language === "fr" ? "Solde" : "Balance" },
	], [terminology.memberSingle, language]);

	const selectedCount = selectedMemberIds.size;
	const totalCount = sortedMembers.length;

	return (
		<div className="w-full">
			<div className="w-full members-x-wrap">
				<div className="w-full flex flex-col min-w-[940px] h-[560px] sm:h-[702px]">
					<div className="th th-adherents shrink-0 bg-white dark:bg-[#1C1B1A] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[var(--atr-ink,#000000)] dark:text-white box-border select-none" data-v={viewMode === "grid" ? "g" : "l"} aria-hidden={viewMode === "grid"}>
						<button type="button" role="checkbox" tabIndex={viewMode === "grid" ? -1 : 0} aria-checked={selectedCount === 0 ? "false" : selectedCount === totalCount && totalCount > 0 ? "true" : "mixed"} aria-label="Tout sélectionner" onClick={onToggleSelectAll} className={`cb w-[22px] h-[22px] rounded-[7px] border-[1.5px] grid place-items-center p-0 cursor-pointer ${selectedCount === totalCount && totalCount > 0 ? "bg-[var(--atr-acc,#d4522f)] border-[var(--atr-acc,#d4522f)] text-white" : "bg-white dark:bg-[#262422] border-[#D4C8BC] dark:border-[#5A5550] text-transparent hover:border-[var(--atr-acc,#d4522f)]"}`}>
							<Check className={`w-3.5 h-3.5 stroke-[3] transition-opacity duration-120 ${selectedCount > 0 ? "opacity-100 text-white" : "opacity-0"}`} />
						</button>
						{sortColumns.map((col) => {
							const isOn = memberSortBy === col.key;
							const dir = memberSortDir;
							return (
								<button key={col.key} type="button" data-k={col.key} data-on={isOn ? "true" : void 0} tabIndex={viewMode === "grid" ? -1 : 0} aria-sort={isOn ? dir === "asc" ? "ascending" : "descending" : "none"} onClick={() => onToggleSort(col.key)} className="text-left rtl:text-right font-semibold text-[11.5px] uppercase tracking-[0.05em] rtl:normal-case rtl:tracking-normal text-black/68 dark:text-white/75 flex items-center gap-1.5 cursor-pointer hover:text-[var(--atr-acc,#d4522f)] bg-transparent border-0 p-0 whitespace-nowrap truncate min-w-0">
									<span className="truncate">{col.label}</span>
									<i className={`not-italic text-[11px] px-1.5 py-0.5 rounded-[5px] ${isOn ? "bg-[var(--atr-hl,rgba(212,82,47,0.12))] text-[var(--atr-acc,#d4522f)]" : "bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-[var(--atr-mut,rgba(0,0,0,0.68))] dark:text-white/70"}`}>{isOn ? dir === "asc" ? "↑" : "↓" : "↕"}</i>
								</button>
							);
						})}
					</div>
					<div ref={scrollContainerRef} className="scr relative mt-2.5 overflow-y-auto overflow-x-hidden pb-[70px] flex-1 min-h-0">
						<div ref={rowsElRef} role="list" aria-label="Adhérents" data-v={viewMode === "grid" ? "g" : "l"} className="rows relative w-full">
							{renderedRows.map((rowItem) => {
								const member = rowItem.member;
								const memberRowData = memberRowDataMap.get(member.id) ?? lastRowDataMapRef.current.get(member.id);
								if (!memberRowData) return null;
								return (
									<MemberRow
										key={member.id}
										member={memberRowData}
										isSelected={selectedMemberIds.has(member.id)}
										isOpen={openMemberId === member.id}
										isExpanded={expandedMemberIds.has(member.id)}
										isPinned={pinnedMemberIds.has(member.id)}
										registerRowRefs={registerRowRefs}
										onSelect={onSelectRow}
										onToggleExpand={onToggleExpand}
										onOpenDetails={onOpenDetails}
										onEdit={onEdit}
										onMessage={onMessage}
										onDelete={onDelete}
										onRenew={onRenew}
										onArchive={onArchive}
										onToggleStatus={onToggleStatus}
										onTogglePin={onTogglePin}
										onPay={onPay}
									/>
								);
							})}
						</div>
						{sortedMembers.length === 0 && <p className="empty text-center text-black/68 dark:text-white/70 py-10">Aucun adhérent ne correspond. Modifiez la recherche ou les filtres.</p>}
					</div>
				</div>
			</div>
		</div>
	);
});

MembersKineticListStage.displayName = "MembersKineticListStage";

export const MembershipMembersView: React.FC<any> = React.memo(({ onAddMember, onEditMember }) => {
	const members = useAtriumSelector(selectCurrentMembersFromState);
	const plans = useAtriumSelector(selectCurrentPlansFromState);
	const terminology = useAtriumSelector(selectTerminologyFromState);
	const language = useAtriumSelector((s) => s.language);
	const selectedMember = useAtriumSelector(selectSelectedMemberFromState);
	const isDetailOpen = useAtriumSelector((s) => s.isDetailOpen);
	const selectMember = selectMemberAction;
	const closeDetail = closeDetailAction;
	const updateMember = updateMemberAction;
	const deleteMember = deleteMemberAction;
	const checkInMember = checkInMemberAction;
	const showToast = showToastAction;
	const isSyncing = useAtriumSelector((s) => s.isSyncing);
	const networkMode = useAtriumSelector((s) => s.networkMode || 'online');
	const [statusFilter, setStatusFilter] = React.useState("All");
	const [genderFilter, setGenderFilter] = React.useState("All");
	const [ageGroupFilter, setAgeGroupFilter] = React.useState("All");
	const [isSearchActive, setIsSearchActive] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [planFilter, setPlanFilter] = React.useState("All");
	const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
	const deferredSearchQuery = useDeferredValue(searchQuery);
	const deferredStatusFilter = useDeferredValue(statusFilter);
	const deferredPlanFilter = useDeferredValue(planFilter);
	const deferredGenderFilter = useDeferredValue(genderFilter);
	const deferredAgeGroupFilter = useDeferredValue(ageGroupFilter);
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
	// Pre-index member metadata once per [members, daysRemainingByDate] so keystrokes & filter switches do O(N) simple field checks
	const preparedMembers = React.useMemo(() => {
		const now = new Date();
		const refYear = now.getFullYear();
		const refMonth = now.getMonth();
		const refDate = now.getDate();
		return members.map((member) => {
			const daysRemaining = daysRemainingByDate.get(member.expirationDate || "") ?? calculateDaysRemaining(false, member.expirationDate);
			const age = computeMemberAge(member.dateOfBirth, refYear, refMonth, refDate);
			const fullNameLower = (member.fullName || "").toLowerCase();
			const phone = member.phoneNumber || "";
			const cardLower = (member.cardId || "").toLowerCase();
			const remainingText = daysRemaining > 0 ? `${daysRemaining} j restants` : daysRemaining === 0 ? "Expire aujourd’hui" : "Expiré";
			const isBlocked = member.status === "Suspended" || member.status === "Banned" || Boolean((member as any).isBlocked);
			const isExp = member.status === "Expired" || daysRemaining <= 0;
			const rowData: MemberRowData = {
				id: member.id,
				name: member.fullName || "Adhérent",
				phone,
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
			return {
				member,
				daysRemaining,
				age,
				searchHaystack: `${fullNameLower}\0${phone}\0${cardLower}`,
				balanceNum: Number(member.balance || 0),
				expStr: member.expirationDate || "",
				rowData
			};
		});
	}, [members, daysRemainingByDate]);

	const { activeMembersCount, expiringCount, expiredCount, archivedCount, ageGroupCounts, planCounts } = React.useMemo(() => {
		let active = 0;
		let expiring = 0;
		let expired = 0;
		let archived = 0;
		const ag = {
			All: preparedMembers.length,
			under18: 0,
			"18-25": 0,
			"26-40": 0,
			"41-60": 0,
			over60: 0,
			unspecified: 0
		};
		const pc = /* @__PURE__ */ new Map();
		for (let i = 0; i < preparedMembers.length; i++) {
			const item = preparedMembers[i];
			const m = item.member;
			if (m.status === "Active") active++;
			else if (m.status === "Expired") expired++;
			else if (m.status === "Banned" || m.status === "Suspended") archived++;
			if (item.daysRemaining <= 14 && item.daysRemaining > 0) expiring++;
			const age = item.age;
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
			activeMembersCount: active,
			expiringCount: expiring,
			expiredCount: expired,
			archivedCount: archived,
			ageGroupCounts: ag,
			planCounts: pc
		};
	}, [preparedMembers, dynamicAvailablePlans]);

	// Pre-sort ONCE when members / pins / sort column change — never during typing or filtering!
	const sortedPreparedMembers = React.useMemo(() => {
		const list = [...preparedMembers];
		list.sort((a, b) => {
			const aPinned = pinnedMemberIds.has(a.member.id) ? 1 : 0;
			const bPinned = pinnedMemberIds.has(b.member.id) ? 1 : 0;
			if (aPinned !== bPinned) return bPinned - aPinned;
			if (memberSortBy === "member") {
				const comp = MEMBER_COLLATOR.compare(a.member.fullName, b.member.fullName);
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "plan") {
				const comp = MEMBER_COLLATOR.compare(a.member.membershipPlanName || "", b.member.membershipPlanName || "");
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "status") {
				const comp = MEMBER_COLLATOR.compare(a.member.status, b.member.status);
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "expiration") {
				const comp = a.expStr < b.expStr ? -1 : a.expStr > b.expStr ? 1 : 0;
				return memberSortDir === "asc" ? comp : -comp;
			}
			if (memberSortBy === "balance") {
				const comp = a.balanceNum - b.balanceNum;
				return memberSortDir === "asc" ? comp : -comp;
			}
			return 0;
		});
		return list;
	}, [preparedMembers, pinnedMemberIds, memberSortBy, memberSortDir]);

	// Filter already-sorted array (filtering preserves order -> zero sort overhead during keystrokes/filter taps)
	const sortedMembers = React.useMemo(() => {
		const q = deferredSearchQuery.trim().toLowerCase();
		const hasStatus = deferredStatusFilter !== "All";
		const hasPlan = deferredPlanFilter !== "All";
		const hasGender = deferredGenderFilter !== "All";
		const hasAge = deferredAgeGroupFilter !== "All";
		const hasQuery = q.length > 0;
		if (!hasStatus && !hasPlan && !hasGender && !hasAge && !hasQuery) {
			return sortedPreparedMembers.map((item) => item.member);
		}
		const result: Member[] = [];
		for (let i = 0; i < sortedPreparedMembers.length; i++) {
			const item = sortedPreparedMembers[i];
			const member = item.member;
			if (hasStatus) {
				if (deferredStatusFilter === "Active" && member.status !== "Active") continue;
				if (deferredStatusFilter === "Expired" && member.status !== "Expired") continue;
				if (deferredStatusFilter === "Expiring" && item.daysRemaining > 14) continue;
				if (deferredStatusFilter === "Archived" && member.status !== "Banned" && member.status !== "Suspended") continue;
			}
			if (hasPlan) {
				if (member.membershipPlanId !== deferredPlanFilter && member.membershipPlanName !== deferredPlanFilter) continue;
			}
			if (hasGender) {
				if (deferredGenderFilter === "Other") {
					if (member.gender === "Male" || member.gender === "Female") continue;
				} else if (member.gender !== deferredGenderFilter) continue;
			}
			if (hasAge && !matchesAgeValue(item.age, deferredAgeGroupFilter)) continue;
			if (hasQuery && !item.searchHaystack.includes(q)) continue;
			result.push(member);
		}
		return result;
	}, [
		sortedPreparedMembers,
		deferredStatusFilter,
		deferredPlanFilter,
		deferredGenderFilter,
		deferredAgeGroupFilter,
		deferredSearchQuery
	]);
	const displayMembers = sortedMembers;

	const quickStatusOptions = React.useMemo(() => [
		{
			value: "All",
			label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
			tooltip: language === "ar" ? "جميع المشتركين" : language === "fr" ? "Tous les adhérents" : "All Members",
			count: members.length
		},
		{
			value: "Active",
			label: language === "ar" ? "نشط" : language === "fr" ? "Actifs" : "Active",
			tooltip: language === "ar" ? "اشتراكات نشطة" : language === "fr" ? "Abonnements actifs" : "Active Subscriptions",
			count: activeMembersCount
		},
		{
			value: "Expiring",
			label: language === "ar" ? "قريب" : language === "fr" ? "Imminent" : "Expiring",
			tooltip: language === "ar" ? "قيد التجديد خلال أقل من 14 يوماً" : language === "fr" ? "À renouveler sous 14 jours" : "Expiring within 14 days",
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
			tooltip: language === "ar" ? "جميع المشتركين" : language === "fr" ? "Tous les adhérents" : "All members",
			count: members.length
		},
		{
			value: "Active",
			label: t("member_filter_active", language),
			tooltip: language === "ar" ? "اشتراكات نشطة" : language === "fr" ? "Abonnements actifs" : "Active subscriptions",
			count: activeMembersCount
		},
		{
			value: "Expiring",
			label: t("member_filter_expiring", language),
			tooltip: language === "ar" ? "تنتهي خلال 14 يوماً" : language === "fr" ? "À renouveler (< 14 jours)" : "Expiring (< 14 days)",
			count: expiringCount
		},
		{
			value: "Expired",
			label: t("member_filter_expired", language),
			tooltip: language === "ar" ? "اشتراكات منتهية الصلاحية" : language === "fr" ? "Abonnements expirés" : "Expired subscriptions",
			count: expiredCount
		},
		{
			value: "Archived",
			label: t("member_filter_archived", language),
			tooltip: language === "ar" ? "موقوف أو محظور" : language === "fr" ? "Suspendus ou bloqués" : "Suspended or banned",
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
	const scrollContainerRef = React.useRef<any>(null);
	const filterKey = `${deferredStatusFilter}|${deferredPlanFilter}|${deferredGenderFilter}|${deferredAgeGroupFilter}|${deferredSearchQuery}`;
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
	}, []);
	const lastRowDataMapRef = React.useRef(/* @__PURE__ */ new Map());
	const memberRowDataMap = React.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (let i = 0; i < preparedMembers.length; i++) {
			const item = preparedMembers[i];
			map.set(item.member.id, item.rowData);
			lastRowDataMapRef.current.set(item.member.id, item.rowData);
		}
		return map;
	}, [preparedMembers]);
	const sortedIndexByIdMap = React.useMemo(() => {
		const map = /* @__PURE__ */ new Map<string, number>();
		for (let i = 0; i < sortedMembers.length; i++) {
			map.set(sortedMembers[i].id, i);
		}
		return map;
	}, [sortedMembers]);
	const sortedIndexByIdRef = React.useRef(sortedIndexByIdMap);
	sortedIndexByIdRef.current = sortedIndexByIdMap;
	const sortedMembersRef = React.useRef(sortedMembers);
	sortedMembersRef.current = sortedMembers;
	const membersByIdRef = React.useRef(/* @__PURE__ */ new Map());
	membersByIdRef.current = React.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (let i = 0; i < members.length; i++) {
			const m = members[i];
			map.set(m.id, m);
		}
		return map;
	}, [members]);
	const handleToggleSelectAll = React.useCallback(() => {
		const list = sortedMembersRef.current;
		setSelectedMemberIds((prev) => {
			if (prev.size === list.length) return /* @__PURE__ */ new Set();
			return new Set(list.map((m) => m.id));
		});
	}, []);
	const handleToggleSort = React.useCallback((colKey: string) => {
		setMemberSortBy((prevBy) => {
			if (prevBy === colKey) {
				setMemberSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
				return prevBy;
			}
			setMemberSortDir("asc");
			return colKey;
		});
	}, []);
	const handleSelectRow = React.useCallback((id: any, e: any) => {
		const key = String(id);
		const list = sortedMembersRef.current;
		const idx = sortedIndexByIdRef.current.get(key) ?? -1;
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
	const handleToggleKpiStatusFilter = React.useCallback((targetStatus: "Active" | "Expiring") => {
		setStatusFilter((prev) => (prev === targetStatus ? "All" : targetStatus));
	}, []);
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
		]} viewMode={viewMode} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200 relative">
<MembersHeaderBar title={terminology.members} addLabel={`${t("action_add", language)} ${terminology.memberSingle}`} onAddMember={onAddMember} />
<MembersKpiBanner membersLabel={terminology.members} membersLower={terminology.members.toLowerCase()} language={language} activeMembersCount={activeMembersCount} expiringCount={expiringCount} displayCount={displayMembers.length} statusFilter={statusFilter} onToggleStatusFilter={handleToggleKpiStatusFilter} activeCountRef={activeCountRef} expiringChipCountRef={expiringChipCountRef} expiringBigCountRef={expiringBigCountRef} inflowChipCountRef={inflowChipCountRef} inflowBigCountRef={inflowBigCountRef} />
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-4 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3 w-full">
<div className="flex items-center gap-2.5 shrink-0">
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">{language === "ar" ? "قائمة المشتركين" : "Liste des adhérents"}</h2>
<div aria-live="polite" className="sr-only">
{displayMembers.length === 0 ? "Aucun adhérent ne correspond" : `${displayMembers.length} adhérent${displayMembers.length > 1 ? "s" : ""} trouvé${displayMembers.length > 1 ? "s" : ""}`}
</div>
</div>
<div className="flex flex-wrap items-center justify-end gap-2.5 min-w-0 ms-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={language === "ar" ? `البحث في ${terminology.members}...` : language === "fr" ? `Rechercher...` : `Search...`} shutSize={40} openWidth={240} className="shrink-0 !rounded-xl" />
<div className="shrink-0">
<LiveSegmentedControl size="md" options={quickStatusOptions} value={statusFilter === "Expired" || statusFilter === "Archived" ? "All" : statusFilter} onValueChange={(val) => setStatusFilter(val)} aria-label={language === "ar" ? "تصفية المشتركين" : "Filtre des adhérents"} />
</div>
<div className="relative shrink-0">
<button ref={filterButtonRef} type="button" onClick={toggleFilterPopover} className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all shadow-2xs select-none ${hasActiveAdvancedFilters || isFilterPopoverOpen ? "bg-[#d4522f]/12 dark:bg-[#d4522f]/15 text-[#d4522f] border-[#d4522f]/40 ring-1 ring-[#d4522f]/20" : "bg-white dark:bg-neutral-800 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-[#FBF8F5] dark:hover:bg-neutral-700/50"}`} title={language === "ar" ? "مرشحات متقدمة" : language === "fr" ? "Filtres avancés" : "Advanced Filters"} aria-expanded={isFilterPopoverOpen}>
<SlidersHorizontal size={15} className={hasActiveAdvancedFilters ? "text-[#d4522f]" : "text-black/70 dark:text-white/75"} />
<span>{language === "ar" ? "مرشحات" : language === "fr" ? "Filtres" : "Filters"}</span>
{activeFiltersCount > 0 && /* @__PURE__ */ <span className="w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center bg-[#d4522f] text-white tabular-nums">{activeFiltersCount}</span>}
<ChevronDown size={13} className={`transition-transform duration-200 text-black/62 dark:text-white/65 ${isFilterPopoverOpen ? "rotate-180" : ""}`} />
</button>
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
</div>
<MembersFilterModal isOpen={isFilterPopoverOpen} onClose={closeFilterPopover} filterPopoverRef={filterPopoverRef} triggerRef={filterButtonRef} language={language} displayCount={displayMembers.length} totalMembersCount={members.length} membersLower={terminology.members.toLowerCase()} membersUpper={terminology.members} hasActiveAdvancedFilters={hasActiveAdvancedFilters} onResetFilters={handleResetFilters} genderFilter={genderFilter} onChangeGender={setGenderFilter} ageGroupFilter={ageGroupFilter} onChangeAgeGroup={setAgeGroupFilter} ageGroupCounts={ageGroupCounts} planFilter={planFilter} onChangePlan={setPlanFilter} dynamicAvailablePlans={dynamicAvailablePlans} planCounts={planCounts} statusFilter={statusFilter} onChangeStatus={setStatusFilter} extendedStatusOptions={extendedStatusOptions} genderFilterOptions={genderFilterOptions} />
{hasActiveAdvancedFilters && /* @__PURE__ */ <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
<span className="text-black/62 dark:text-white/65 font-medium text-[11px]">
{language === "ar" ? "المرشحات النشطة:" : language === "fr" ? "Filtres actifs:" : "Active filters:"}
</span>
{genderFilter !== "All" && /* @__PURE__ */ <span title={`${language === "ar" ? "الجنس" : language === "fr" ? "Sexe" : "Gender"}: ${genderFilter === "Male" ? language === "ar" ? "ذكور" : language === "fr" ? "Hommes" : "Male" : genderFilter === "Female" ? language === "ar" ? "إناث" : language === "fr" ? "Femmes" : "Female" : language === "ar" ? "آخر" : language === "fr" ? "Autre" : "Other"}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{genderFilter === "Male" ? language === "ar" ? "ذكور" : language === "fr" ? "Hommes" : "Male" : genderFilter === "Female" ? language === "ar" ? "إناث" : language === "fr" ? "Femmes" : "Female" : language === "ar" ? "آخر" : language === "fr" ? "Autre" : "Other"}
</span>
<button type="button" onClick={() => setGenderFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove gender filter"><X size={12} /></button>
</span>}
{ageGroupFilter !== "All" && /* @__PURE__ */ <span title={`${language === "ar" ? "العمر" : language === "fr" ? "Tranche d'âge" : "Age"}: ${ageGroupFilter === "under18" ? "< 18 ans" : ageGroupFilter === "18-25" ? "18 - 25 ans" : ageGroupFilter === "26-40" ? "26 - 40 ans" : ageGroupFilter === "41-60" ? "41 - 60 ans" : ageGroupFilter === "over60" ? "> 60 ans" : "Tous"}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{ageGroupFilter === "under18" ? "<18" : ageGroupFilter === "over60" ? ">60" : ageGroupFilter === "All" ? (language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All") : ageGroupFilter}
</span>
<button type="button" onClick={() => setAgeGroupFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove age filter"><X size={12} /></button>
</span>}
{planFilter !== "All" && (() => {
	const fullPlanName = dynamicAvailablePlans.find((p) => p.id === planFilter)?.name || plans.find((p) => p.id === planFilter)?.name || planFilter;
	return /* @__PURE__ */ <span title={`${t("member_filter_plan_label", language)}: ${fullPlanName}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{compactFilterLabel(fullPlanName).label}
</span>
<button type="button" onClick={() => setPlanFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove filter"><X size={12} /></button>
</span>;
})()}
{(statusFilter === "Expired" || statusFilter === "Archived") && /* @__PURE__ */ <span title={`${language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status"}: ${localizeStatus(statusFilter, language)}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
<span>
{localizeStatus(statusFilter, language)}
</span>
<button type="button" onClick={() => setStatusFilter("All")} className="hover:text-black dark:hover:text-white transition-colors cursor-pointer" title="Supprimer filtre" aria-label="Remove filter"><X size={12} /></button>
</span>}
<button type="button" onClick={handleResetFilters} title={language === "ar" ? "إعادة تعيين كافة المرشحات" : language === "fr" ? "Réinitialiser tous les filtres" : "Reset all filters"} className="text-[11px] font-semibold text-black/72 dark:text-white/75 hover:text-black dark:hover:text-white underline cursor-pointer ml-1">
{language === "ar" ? "إعادة" : language === "fr" ? "Effacer" : "Reset"}
</button>
</div>}
<MembersKineticListStage
	scrollContainerRef={scrollContainerRef}
	sortedMembers={sortedMembers}
	expandedMemberIds={expandedMemberIds}
	viewMode={viewMode}
	filterKey={filterKey}
	openMemberId={isDetailOpen ? selectedMember?.id ?? null : null}
	selectedMemberIds={selectedMemberIds}
	pinnedMemberIds={pinnedMemberIds}
	memberSortBy={memberSortBy}
	memberSortDir={memberSortDir}
	memberRowDataMap={memberRowDataMap}
	lastRowDataMapRef={lastRowDataMapRef}
	terminology={terminology}
	language={language}
	onPruneSelection={handlePruneSelection}
	onFilterChange={handleFilterScrollReset}
	onToggleSelectAll={handleToggleSelectAll}
	onToggleSort={handleToggleSort}
	onSelectRow={handleSelectRow}
	onToggleExpand={toggleExpandMember}
	onOpenDetails={handleOpenRowDetails}
	onEdit={handleEditRow}
	onMessage={handleMessageRow}
	onDelete={handleDeleteRow}
	onRenew={handleRenewRow}
	onArchive={handleArchiveRow}
	onToggleStatus={handleToggleStatusRow}
	onTogglePin={handleTogglePinRow}
	onPay={handlePayRow}
/>
</div>
<MemberSlideOverInspector isOpen={isDetailOpen && Boolean(selectedMember)} member={selectedMember} allMembers={sortedMembers} openerElement={panelOpenerRef.current} initialTab={panelInitialTab} onClose={closeDetail} onSelectMember={handleInspectorSelectMember} onEdit={handleInspectorEdit} onDelete={handleInspectorDelete} onCheckIn={handleInspectorCheckIn} onRenew={handleInspectorRenew} onToggleBlock={handleInspectorToggleBlock} onUpdateNotes={handleInspectorUpdateNotes} showToast={handleInspectorToast} />
<FloatingBulkBar selectedCount={selectedMemberIds.size} onClear={handleBulkClear} onExport={handleExportCSV} onRenew={handleBulkRenew} onArchive={handleBulkArchive} onDelete={handleBulkDelete} />
{isBookModalOpen && selectedMember && /* @__PURE__ */ <AppointmentModal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} appointment={null} initialDate={(/* @__PURE__ */ new Date()).toISOString().split("T")[0]} initialTime="10:00" initialStaffId={void 0} />}
</div>;
});

MembershipMembersView.displayName = "MembershipMembersView";

export const MembersScreen = MembershipMembersView;
