import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  User,
  Users,
  Scissors,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Play,
  CreditCard,
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  Download,
  AlertCircle,
  Eye,
  UserPlus,
  Check,
  Pin,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Appointment, AppointmentStatus, StaffMember } from '../../../types/index';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { t, getLocalizedService, getLocalizedServiceCategory, getLocalizedServiceName } from '../../../utils/i18n';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCalendarTimeline } from '../../ui/skeleton/StructuralSkeletons';



const TIME_SLOTS = [
	"09:00",
	"09:30",
	"10:00",
	"10:30",
	"11:00",
	"11:30",
	"12:00",
	"12:30",
	"13:00",
	"13:30",
	"14:00",
	"14:30",
	"15:00",
	"15:30",
	"16:00",
	"16:30",
	"17:00",
	"17:30",
	"18:00",
	"18:30",
	"19:00",
	"19:30"
];

export const AppointmentScheduleView: React.FC<any> = () => {
	const { appointments, servicesCatalog, staff, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, updateAppointmentStatus, checkoutAppointment, batchDeleteAppointments, batchUpdateAppointmentStatus, resetSalonMockData, language, showToast, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [selectedDate, setSelectedDate] = React.useState((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
	const [selectedStylistId, setSelectedStylistId] = React.useState("All");
	const [statusFilter, setStatusFilter] = React.useState("All");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [viewMode, setViewMode] = React.useState("calendar");
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [isModalOpen, setIsModalOpen] = React.useState(false);
	const [activeAppointment, setActiveAppointment] = React.useState<any>(null);
	const [slotPrefill, setSlotPrefill] = React.useState<any>(null);
	const [selectedAptIds, setSelectedAptIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedAptIds, setPinnedAptIds] = React.useState(/* @__PURE__ */ new Set());
	const [aptSortBy, setAptSortBy] = React.useState("time");
	const [aptSortDir, setAptSortDir] = React.useState("asc");
	const salonStylists = React.useMemo(() => {
		return staff.filter((s) => s.isActive);
	}, [staff]);
	const dayAppointments = React.useMemo(() => {
		return appointments.filter((apt) => {
			if (apt.date !== selectedDate) return false;
			if (selectedStylistId !== "All" && apt.staffId !== selectedStylistId) return false;
			if (statusFilter !== "All" && apt.status !== statusFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchClient = apt.clientName.toLowerCase().includes(q);
				const matchService = apt.serviceName.toLowerCase().includes(q);
				const matchStaff = apt.staffName.toLowerCase().includes(q);
				if (!matchClient && !matchService && !matchStaff) return false;
			}
			return true;
		});
	}, [
		appointments,
		selectedDate,
		selectedStylistId,
		statusFilter,
		searchQuery
	]);
	const statusCounts = React.useMemo(() => {
		const list = appointments.filter((apt) => apt.date === selectedDate);
		return {
			all: list.length,
			confirmed: list.filter((a) => a.status === "Confirmed").length,
			inChair: list.filter((a) => a.status === "InChair").length,
			completed: list.filter((a) => a.status === "Completed").length
		};
	}, [appointments, selectedDate]);
	const sortedDayAppointments = React.useMemo(() => {
		return [...dayAppointments].sort((a, b) => {
			const aPinned = pinnedAptIds.has(a.id);
			const bPinned = pinnedAptIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (aptSortBy === "time") {
				const cmp = a.startTime.localeCompare(b.startTime);
				return aptSortDir === "asc" ? cmp : -cmp;
			}
			if (aptSortBy === "client") {
				const cmp = a.clientName.localeCompare(b.clientName);
				return aptSortDir === "asc" ? cmp : -cmp;
			}
			if (aptSortBy === "service") {
				const cmp = a.serviceName.localeCompare(b.serviceName);
				return aptSortDir === "asc" ? cmp : -cmp;
			}
			if (aptSortBy === "stylist") {
				const cmp = a.staffName.localeCompare(b.staffName);
				return aptSortDir === "asc" ? cmp : -cmp;
			}
			if (aptSortBy === "price") return aptSortDir === "asc" ? a.price - b.price : b.price - a.price;
			if (aptSortBy === "status") return aptSortDir === "asc" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
			return 0;
		});
	}, [
		dayAppointments,
		pinnedAptIds,
		aptSortBy,
		aptSortDir
	]);
	const appointmentColumns = React.useMemo(() => [
		{
			key: "time",
			header: t("salon_timeline", language) || "Time",
			width: "1.4*",
			minWidth: "120px",
			sortable: true,
			renderCell: (apt: any) => /* @__PURE__ */ <div className="flex items-center gap-2">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/10 text-[#d4522f] font-bold text-xs flex flex-col items-center justify-center shrink-0">
<span className="text-[11px] font-bold leading-tight font-mono">{apt.startTime}</span>
<span className="text-[9px] text-neutral-400 font-medium font-mono">
{apt.durationMinutes}
m
</span>
</div>
</div>
		},
		{
			key: "client",
			header: language === "ar" ? "الزبون" : language === "fr" ? "Client" : "Client",
			width: "2.2*",
			minWidth: "180px",
			sortable: true,
			renderCell: (apt: any) => /* @__PURE__ */ <div className="min-w-0">
<div className="font-bold text-neutral-900 dark:text-white truncate text-xs">{apt.clientName}</div>
<div className="text-[10px] text-neutral-400 font-mono truncate">{apt.clientPhone}</div>
</div>
		},
		{
			key: "service",
			header: language === "ar" ? "الخدمة" : language === "fr" ? "Prestation" : "Service",
			width: "2.5*",
			minWidth: "200px",
			sortable: true,
			renderCell: (apt: any) => /* @__PURE__ */ <div className="min-w-0 text-xs">
<div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}</div>
{apt.notes && /* @__PURE__ */ <div className="text-[10px] text-neutral-400 italic truncate">
"
{apt.notes}
"
</div>}
</div>
		},
		{
			key: "stylist",
			header: language === "ar" ? "المصفف / الأخصائي" : language === "fr" ? "Praticien / Styliste" : "Staff / Stylist",
			width: "2*",
			minWidth: "160px",
			sortable: true,
			renderCell: (apt: any) => /* @__PURE__ */ <div className="flex items-center gap-2 min-w-0">
<div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-[10px] flex items-center justify-center shrink-0">{apt.staffName.split(" ").map((n: any) => n[0]).join("")}</div>
<span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium truncate">{apt.staffName}</span>
</div>
		},
		{
			key: "price",
			header: language === "ar" ? "السعر" : language === "fr" ? "Tarif" : "Price",
			width: "1.4*",
			minWidth: "110px",
			sortable: true,
			renderCell: (apt: any) => /* @__PURE__ */ <span className="font-bold text-neutral-900 dark:text-white text-xs tabular-nums font-mono">{formatMoney(apt.price)}</span>
		},
		{
			key: "status",
			header: language === "ar" ? "الحالة" : language === "fr" ? "Statut" : "Status",
			width: "1.6*",
			minWidth: "130px",
			sortable: true,
			renderCell: (apt: any) => /* @__PURE__ */ <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${apt.status === "InChair" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : apt.status === "Completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : apt.status === "Cancelled" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"}`}>
{apt.status === "InChair" && /* @__PURE__ */ <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
{apt.status === "InChair" ? t("salon_kpi_in_chair", language) : localizeStatus(apt.status, language)}
</span>
		}
	], [language]);
	const stats = React.useMemo(() => {
		return {
			totalBookings: dayAppointments.length,
			inChairCount: dayAppointments.filter((a) => a.status === "InChair").length,
			completedCount: dayAppointments.filter((a) => a.status === "Completed").length,
			revenue: dayAppointments.filter((a) => a.status !== "Cancelled").reduce((sum, a) => sum + a.price, 0)
		};
	}, [dayAppointments]);
	const handlePrevDay = () => {
		const d = new Date(selectedDate);
		d.setDate(d.getDate() - 1);
		setSelectedDate(d.toISOString().split("T")[0]);
	};
	const handleNextDay = () => {
		const d = new Date(selectedDate);
		d.setDate(d.getDate() + 1);
		setSelectedDate(d.toISOString().split("T")[0]);
	};
	const handleToday = () => {
		setSelectedDate((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
	};
	const formattedDateLabel = React.useMemo(() => {
		const d = /* @__PURE__ */ new Date(selectedDate + "T00:00:00");
		const locale = language === "ar" ? "ar-DZ" : language === "fr" ? "fr-FR" : "en-US";
		return d.toLocaleDateString(locale, {
			weekday: "long",
			month: "short",
			day: "numeric",
			year: "numeric"
		});
	}, [selectedDate, language]);
	const [checkoutToast, setCheckoutToast] = React.useState<any>(null);
	const handleOneClickCheckout = (apt: any) => {
		const sale = checkoutAppointment(apt.id, "Cash");
		const msg = t("salon_checkout_success_toast", language).replace("{client}", apt.clientName).replace("{saleId}", sale.id.slice(-6).toUpperCase()).replace("{stylist}", apt.staffName);
		setCheckoutToast({
			message: msg,
			saleId: sale.id,
			stylist: apt.staffName
		});
		setTimeout(() => setCheckoutToast(null), 4e3);
	};
	const handleOpenAddModal = (time: any, staffId?: any) => {
		setActiveAppointment(null);
		setSlotPrefill({
			date: selectedDate,
			time: time || "10:00",
			staffId: staffId || salonStylists[0]?.id || ""
		});
		setIsModalOpen(true);
	};
	const handleOpenEditModal = (apt: any) => {
		setActiveAppointment(apt);
		setSlotPrefill(null);
		setIsModalOpen(true);
	};
	const handleExportCSV = () => {
		const headers = language === "ar" ? [
			"التاريخ",
			"وقت البدء",
			"وقت الانتهاء",
			"المصفف",
			"الزبون",
			"الهاتف",
			"الخدمة",
			"السعر (د.ج)",
			"الحالة"
		] : language === "fr" ? [
			"Date",
			"Heure début",
			"Heure fin",
			"Coiffeur(se)",
			"Client(e)",
			"Téléphone",
			"Prestation",
			"Tarif (DA)",
			"Statut"
		] : [
			"Date",
			"Start Time",
			"End Time",
			"Stylist",
			"Client",
			"Phone",
			"Service",
			"Price (DZD)",
			"Status"
		];
		const rows = dayAppointments.map((a) => [
			`"${a.date}"`,
			`"${a.startTime}"`,
			`"${a.endTime}"`,
			`"${a.staffName}"`,
			`"${a.clientName}"`,
			`"${a.clientPhone}"`,
			`"${a.serviceName}"`,
			`"${a.price}"`,
			`"${localizeStatus(a.status, language)}"`
		]);
		const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `${t("salon_csv_filename", language)}_${selectedDate}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: appointments.length > 0
	});
	if (showSkeleton && (appointments.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCalendarTimeline isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6">
<div className="space-y-4">
{checkoutToast && /* @__PURE__ */ <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xs animate-in slide-in-from-top-1">
<div className="flex items-center gap-2">
<CheckCircle2 size={15} className="text-emerald-600" />
<span>{checkoutToast.message}</span>
</div>
<span className="text-[11px] font-mono opacity-80">
Ref #
{checkoutToast.saleId.slice(-6)}
</span>
</div>}
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
<div>
<div className="flex items-center gap-3.5 mb-1">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center shrink-0"><Scissors size={20} /></div>
<h1 className="text-[32px] sm:text-[40px] font-extrabold uppercase leading-none tracking-[0.01em] text-neutral-900 dark:text-white rtl:text-[26px] rtl:sm:text-[32px] rtl:leading-tight">{t("salon_schedule_title", language)}</h1>
</div>
</div>
<div className="flex items-center gap-2.5">
<AtriumButton type="button" variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>{t("salon_btn_export_csv", language)}</AtriumButton>
<AtriumButton type="button" variant="primary" size="sm" glow icon={<Plus size={15} />} onClick={() => handleOpenAddModal("10:00")}>{t("salon_btn_new_appointment", language)}</AtriumButton>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{t("salon_kpi_total_bookings", language)}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#d4522f]/10 text-[#d4522f]">
{stats.completedCount}
{" terminés"}
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">{stats.totalBookings}</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
<Calendar size={13} className="text-[#d4522f]" />
<span>
{"Agenda journalier • "}
{formattedDateLabel}
</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{t("salon_kpi_in_chair", language)}</span>
<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
<span>En Fauteuil</span>
</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
{stats.inChairCount}
{" "}
<span className="text-xs font-normal text-neutral-400">
{"/ "}
{salonStylists.length}
{" postes"}
</span>
</div>
<div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
<Users size={13} className="text-blue-500" />
<span>
{salonStylists.length > 0 ? Math.round(stats.inChairCount / salonStylists.length * 100) : 0}
% taux d'occupation direct
</span>
</div>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 shadow-sm text-white flex flex-col justify-between h-[124px] relative overflow-hidden group">
<div className="flex items-center justify-between">
<span className="text-xs font-semibold text-[#E7E5E4]">{t("salon_kpi_est_revenue", language)}</span>
<span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">Journée Active</span>
</div>
<div>
<div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">{formatMoney(stats.revenue)}</div>
<div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
<span className="flex items-center gap-1">
<Sparkles size={12} className="text-[#FB923C]" />
<span>Recette prévisionnelle TTC</span>
</span>
<span className="font-mono text-stone-300">DZD</span>
</div>
</div>
<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
<div className="flex items-center gap-2.5">
<div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]"><Scissors size={18} /></div>
<div className="flex items-center gap-2">
<span className="text-sm font-bold text-neutral-900 dark:text-white">
{viewMode === "calendar" ? language === "ar" ? "مخطط كراسي المصففين" : "Planning des Postes de Coiffure" : language === "ar" ? "سجل المواعيد العام" : "Registre des Rendez-Vous"}
</span>
<span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#d4522f]/10 text-[#d4522f]">{dayAppointments.length}</span>
</div>
</div>
<div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
<div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs text-xs font-bold">
<button type="button" onClick={handlePrevDay} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer" title={t("salon_btn_prev_day", language)}><ChevronLeft size={14} className="rtl:rotate-180" /></button>
<button type="button" onClick={handleToday} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] shadow-2xs cursor-pointer">{t("salon_btn_today", language)}</button>
<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-1.5 py-0.5 text-xs font-semibold bg-transparent text-neutral-800 dark:text-neutral-200 border-none focus:outline-none cursor-pointer" />
<button type="button" onClick={handleNextDay} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer" title={t("salon_btn_next_day", language)}><ChevronRight size={14} className="rtl:rotate-180" /></button>
</div>
<LiveSegmentedControl size="sm" value={statusFilter} onValueChange={setStatusFilter} options={[
									{
										value: "All",
										label: t("common_all", language),
										count: statusCounts.all
									},
									{
										value: "Confirmed",
										label: localizeStatus("Confirmed", language),
										count: statusCounts.confirmed
									},
									{
										value: "InChair",
										label: localizeStatus("InChair", language),
										count: statusCounts.inChair
									},
									{
										value: "Completed",
										label: localizeStatus("Completed", language),
										count: statusCounts.completed
									}
								]} aria-label="Appointment Status Filter" />
<LabelSelect field="Stylist" label={t("salon_filter_stylist", language)} value={selectedStylistId} onChange={(val) => setSelectedStylistId(val?.target?.value ?? String(val))} options={[{
									value: "All",
									label: `${t("salon_filter_all_stylists", language)} (${salonStylists.length})`
								}, ...salonStylists.map((st) => ({
									value: st.id,
									label: st.fullName,
									sublabel: st.role
								}))]} width={170} height={34} corner={12} />
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={t("salon_search_placeholder", language)} shutSize={34} openWidth={220} />
</div>
</div>
<div className="w-full">
<UniversalDataCollection items={sortedDayAppointments} keyExtractor={(apt: any) => apt.id} viewMode={viewMode} defaultViewMode="calendar" showCalendarToggle onViewModeChange={(m: any) => setViewMode(m)} renderCalendarView={() => /* @__PURE__ */ <div className="bg-white dark:bg-neutral-800 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-700/80 shadow-2xs overflow-hidden">
<div className="overflow-x-auto">
<div className="min-w-[760px]">
<div className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80">
<div className="p-3.5 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
<Clock size={14} className="mr-1 text-neutral-400" />
{" "}
{t("salon_timeline", language)}
</div>
{salonStylists.map((stylist, index) => {
											const count = dayAppointments.filter((a) => a.staffId === stylist.id).length;
											return /* @__PURE__ */ <div key={stylist.id} className={`p-3.5 ${index < salonStylists.length - 1 ? "border-r border-neutral-200 dark:border-neutral-800" : ""}`}>
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-full bg-[#d4522f]/15 text-[#d4522f] font-bold text-xs flex items-center justify-center">{stylist.fullName.split(" ").map((n) => n[0]).join("")}</div>
<div>
<p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">{stylist.fullName}</p>
<p className="text-[10px] text-neutral-500 font-medium">
{stylist.role}
{" • "}
{t("salon_chair_num", language).replace("{number}", String(index + 1))}
</p>
</div>
</div>
<span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
{count === 1 ? t("salon_booking_count_single", language).replace("{count}", "1") : t("salon_booking_count_multi", language).replace("{count}", String(count))}
</span>
</div>
</div>;
										})}
</div>
<div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
{TIME_SLOTS.map((time) => {
											return /* @__PURE__ */ <div key={time} className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] min-h-[68px] hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 transition-colors">
<div className="p-3 text-xs font-semibold text-neutral-500 text-center border-r border-neutral-200 dark:border-neutral-800 flex items-start justify-center pt-3">{time}</div>
{salonStylists.map((stylist, index) => {
													const apt = dayAppointments.find((a) => a.staffId === stylist.id && a.startTime === time);
													return /* @__PURE__ */ <div key={stylist.id} className={`p-1.5 relative group ${index < salonStylists.length - 1 ? "border-r border-neutral-200/70 dark:border-neutral-800/70" : ""}`}>
{apt ? /* @__PURE__ */ <div onClick={() => handleOpenEditModal(apt)} className={`h-full w-full p-2.5 rounded-2xl cursor-pointer transition-all border shadow-xs hover:shadow-md ${apt.status === "InChair" ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20" : apt.status === "Completed" ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : apt.status === "Cancelled" ? "bg-neutral-100/70 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 opacity-60" : "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"}`}>
<div className="flex items-center justify-between gap-1 mb-1">
<span className="text-xs font-bold text-neutral-900 dark:text-white truncate">{apt.clientName}</span>
<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${apt.status === "InChair" ? "bg-amber-500 text-white animate-pulse" : apt.status === "Completed" ? "bg-emerald-600 text-white" : apt.status === "Cancelled" ? "bg-neutral-400 text-white" : "bg-indigo-600 text-white"}`}>{localizeStatus(apt.status, language)}</span>
</div>
<p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate mb-1">{getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}</p>
<div className="flex items-center justify-between text-[10px] text-neutral-500 font-medium">
<span>
{apt.startTime}
{" - "}
{apt.endTime}
{" ("}
{apt.durationMinutes}
m)
</span>
<span className="font-bold text-[#d4522f]">{formatMoney(apt.price)}</span>
</div>
{apt.status === "InChair" && /* @__PURE__ */ <AtriumButton type="button" size="xs" variant="primary" className="mt-2 w-full text-[10px]" icon={<CreditCard size={11} />} onClick={(e) => {
																		e.stopPropagation();
																		handleOneClickCheckout(apt);
																	}} title={t("salon_quick_checkout", language)}>{t("salon_quick_checkout", language)}</AtriumButton>}
</div> : /* @__PURE__ */ <button type="button" onClick={() => handleOpenAddModal(time, stylist.id)} className="w-full h-full min-h-[50px] rounded-xl border border-dashed border-transparent group-hover:border-neutral-300 dark:group-hover:border-neutral-700 group-hover:bg-neutral-100/50 dark:group-hover:bg-neutral-800/40 flex items-center justify-center text-neutral-400 hover:text-[#d4522f] transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
<span className="flex items-center gap-1 text-[11px] font-medium">
<Plus size={13} />
{" "}
{t("salon_book_slot", language)}
</span>
</button>}
</div>;
												})}
</div>;
										})}
</div>
</div>
</div>
</div>} columns={appointmentColumns} sortBy={aptSortBy} sortDirection={aptSortDir} onSortChange={(key) => {
							if (aptSortBy === key) setAptSortDir((prev) => prev === "asc" ? "desc" : "asc");
							else {
								setAptSortBy(key);
								setAptSortDir("asc");
							}
						}} selectedIds={selectedAptIds} onSelectionChange={setSelectedAptIds} isPinned={(apt) => pinnedAptIds.has(apt.id)} onTogglePin={(apt) => {
							setPinnedAptIds((prev) => {
								const next = new Set(prev);
								if (next.has(apt.id)) next.delete(apt.id);
								else next.add(apt.id);
								return next;
							});
						}} bulkSecondaryAction={{
							label: language === "ar" ? "تأكيد المواعيد" : "Confirmer RDV",
							icon: /* @__PURE__ */ <CheckCircle2 size={13} />,
							onClick: (ids: any) => {
								batchUpdateAppointmentStatus(Array.from(ids), "Confirmed");
								showToast({
									type: "success",
									title: "Mises à jour",
									message: `${ids.size} rendez-vous confirmés.`
								});
							},
							variant: "primary"
						}} onBulkDelete={(ids) => {
							batchDeleteAppointments(Array.from(ids));
							showToast({
								type: "info",
								title: "Rendez-vous annulés",
								message: `${ids.size} rendez-vous retirés.`
							});
						}} renderCard={(apt) => /* @__PURE__ */ <div className="flex flex-col justify-between w-full h-full">
<div>
<div className="flex items-center justify-between gap-2 mb-2">
<span className="font-mono text-xs font-bold text-neutral-900 dark:text-white bg-[#d4522f]/10 text-[#d4522f] px-2.5 py-1 rounded-lg">
{apt.startTime}
{" ("}
{apt.durationMinutes}
m)
</span>
<span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${apt.status === "InChair" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : apt.status === "Completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : apt.status === "Cancelled" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"}`}>
{apt.status === "InChair" && /* @__PURE__ */ <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
{apt.status === "InChair" ? t("salon_kpi_in_chair", language) : localizeStatus(apt.status, language)}
</span>
</div>
<h3 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1 mb-0.5">{apt.clientName}</h3>
<p className="text-[11px] text-neutral-400 font-mono mb-2">{apt.clientPhone}</p>
<div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-xs space-y-1 mb-3">
<div className="flex items-center justify-between">
<span className="text-neutral-400 text-[10px] uppercase font-medium">{language === "ar" ? "الخدمة" : "Service"}</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[140px]">{getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}</span>
</div>
<div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
<span className="text-neutral-400 text-[10px] uppercase font-medium">{language === "ar" ? "المصفف" : "Staff"}</span>
<span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]">{apt.staffName}</span>
</div>
</div>
{apt.notes && /* @__PURE__ */ <p className="text-[11px] text-neutral-400 italic mb-2 line-clamp-1">
"
{apt.notes}
"
</p>}
</div>
<div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
<span className="text-xs font-bold font-mono text-neutral-900 dark:text-white tabular-nums">{formatMoney(apt.price)}</span>
{apt.status !== "Completed" && apt.status !== "Cancelled" && /* @__PURE__ */ <AtriumButton size="xs" variant="primary" icon={<CreditCard size={12} />} onClick={(e) => {
										e.stopPropagation();
										handleOneClickCheckout(apt);
									}}>{t("salon_quick_checkout", language)}</AtriumButton>}
</div>
</div>} onItemClick={(apt) => handleOpenEditModal(apt)} onViewDetails={(apt) => handleOpenEditModal(apt)} onEdit={(apt) => handleOpenEditModal(apt)} customActions={(apt) => [...apt.status !== "Completed" && apt.status !== "Cancelled" ? [{
							id: "checkout",
							tooltip: t("salon_quick_checkout", language) || "Checkout",
							icon: /* @__PURE__ */ <CreditCard size={13} />,
							iconColor: "#d4522f",
							onClick: (e: any) => {
								e.stopPropagation();
								handleOneClickCheckout(apt);
							}
						}] : [], ...apt.status === "Confirmed" ? [{
							id: "start",
							tooltip: t("salon_kpi_in_chair", language) || "Start Service",
							icon: /* @__PURE__ */ <Play size={13} />,
							iconColor: "#D97706",
							onClick: (e: any) => {
								e.stopPropagation();
								updateAppointmentStatus(apt.id, "InChair");
							}
						}] : []]} emptyTitle={t("salon_empty_appointments", language)} emptyDescription={t("salon_empty_appointments_sub", language)} primaryActionLabel={t("salon_new_booking", language)} onAddFirstItem={() => handleOpenAddModal("10:00")} />
</div>
</div>
<AppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} appointment={activeAppointment} initialDate={slotPrefill?.date || selectedDate} initialTime={slotPrefill?.time || "10:00"} initialStaffId={slotPrefill?.staffId} />
</div>;
};

export const StylistScheduleView = AppointmentScheduleView;
