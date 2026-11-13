import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Pin,
  Eye,
  Home,
  ChevronDown,
  Download,
  Sparkles,
  Maximize2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentalRenter } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const VenueRentersView: React.FC<any> = () => {
	const { t, language } = useTranslation();
	const { rentalRenters, rentalBookings, createRentalRenter, updateRentalRenter, deleteRentalRenter, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, resetVenueMockData, showToast, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [searchQuery, setSearchQuery] = React.useState("");
	const [filterType, setFilterType] = React.useState("All");
	const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
	const [renterToEdit, setRenterToEdit] = React.useState<any>(null);
	const [selectedIds, setSelectedIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedRenterIds, setPinnedRenterIds] = React.useState(/* @__PURE__ */ new Set());
	const [renterSortBy, setRenterSortBy] = React.useState("renter");
	const [renterSortDir, setRenterSortDir] = React.useState("asc");
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [viewMode, setViewMode] = React.useState("list");
	const [selectedRenter, setSelectedRenter] = React.useState<any>(null);
	const [drawerTab, setDrawerTab] = React.useState("dossier");
	const [renterNotes, setRenterNotes] = React.useState("");
	const [isSavingNotes, setIsSavingNotes] = React.useState(false);
	const [notesSavedNotice, setNotesSavedNotice] = React.useState(false);
	const activeRenter = React.useMemo(() => {
		if (!selectedRenter) return null;
		return rentalRenters.find((r) => r.id === selectedRenter.id) || selectedRenter;
	}, [selectedRenter, rentalRenters]);
	React.useEffect(() => {
		if (activeRenter) setRenterNotes(activeRenter.notes || "");
	}, [activeRenter?.id]);
	const handleNotesChange = (val: any) => {
		setRenterNotes(val);
		if (!activeRenter) return;
		setIsSavingNotes(true);
		updateRentalRenter(activeRenter.id, { notes: val });
		setTimeout(() => {
			setIsSavingNotes(false);
			setNotesSavedNotice(true);
			setTimeout(() => setNotesSavedNotice(false), 2e3);
		}, 400);
	};
	const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
	const [bookingRenterId, setBookingRenterId] = React.useState<any>(void 0);
	const [fullName, setFullName] = React.useState("");
	const [companyName, setCompanyName] = React.useState("");
	const [email, setEmail] = React.useState("");
	const [phone, setPhone] = React.useState("");
	const [idDocNumber, setIdDocNumber] = React.useState("");
	const [notes, setNotes] = React.useState("");
	const filteredRenters = React.useMemo(() => {
		return rentalRenters.filter((r) => {
			if (filterType === "Corporate" && !r.companyName) return false;
			if (filterType === "Individual" && r.companyName) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				return r.fullName.toLowerCase().includes(q) || r.companyName && r.companyName.toLowerCase().includes(q) || r.phone.includes(q) || r.email.toLowerCase().includes(q) || r.idDocNumber && r.idDocNumber.toLowerCase().includes(q);
			}
			return true;
		});
	}, [
		rentalRenters,
		filterType,
		searchQuery
	]);
	const totalRentersCount = rentalRenters.length;
	const corporateCount = rentalRenters.filter((r) => Boolean(r.companyName)).length;
	const individualCount = totalRentersCount - corporateCount;
	const totalRevenue = rentalRenters.reduce((sum, r) => sum + r.totalSpent, 0);
	const handleOpenAdd = () => {
		setRenterToEdit(null);
		setFullName("");
		setCompanyName("");
		setEmail("");
		setPhone("+213 ");
		setIdDocNumber("");
		setNotes("");
		setIsAddModalOpen(true);
	};
	const handleOpenEdit = (renter: any) => {
		setRenterToEdit(renter);
		setFullName(renter.fullName);
		setCompanyName(renter.companyName || "");
		setEmail(renter.email);
		setPhone(renter.phone);
		setIdDocNumber(renter.idDocNumber || "");
		setNotes(renter.notes || "");
		setIsAddModalOpen(true);
	};
	const handleSaveRenter = (e: any) => {
		e.preventDefault();
		if (!fullName.trim()) {
			showToast({
				type: "warning",
				title: "Missing Full Name",
				message: "Please enter the renter full name or organizer contact."
			});
			return;
		}
		if (!phone.trim()) {
			showToast({
				type: "warning",
				title: "Missing Telephone",
				message: "Please enter a telephone number for booking confirmations."
			});
			return;
		}
		if (renterToEdit) updateRentalRenter(renterToEdit.id, {
			fullName: fullName.trim(),
			companyName: companyName.trim() || void 0,
			email: email.trim(),
			phone: phone.trim(),
			idDocNumber: idDocNumber.trim() || void 0,
			notes: notes.trim() || void 0
		});
		else createRentalRenter({
			fullName: fullName.trim(),
			companyName: companyName.trim() || void 0,
			email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, ".")}@client.local`,
			phone: phone.trim(),
			idDocNumber: idDocNumber.trim() || void 0,
			currency: "DZD",
			notes: notes.trim() || void 0
		});
		setIsAddModalOpen(false);
	};
	const sortedRenters = React.useMemo(() => {
		return [...filteredRenters].sort((a, b) => {
			const aPinned = pinnedRenterIds.has(a.id);
			const bPinned = pinnedRenterIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (renterSortBy === "renter") {
				const cmp = a.fullName.localeCompare(b.fullName);
				return renterSortDir === "asc" ? cmp : -cmp;
			}
			if (renterSortBy === "bookings") return renterSortDir === "asc" ? a.totalBookings - b.totalBookings : b.totalBookings - a.totalBookings;
			if (renterSortBy === "spent") return renterSortDir === "asc" ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent;
			return 0;
		});
	}, [
		filteredRenters,
		pinnedRenterIds,
		renterSortBy,
		renterSortDir
	]);
	const togglePinRenter = (id: any) => {
		setPinnedRenterIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};
	const renterColumns = React.useMemo(() => [
		{
			key: "renter",
			header: language === "ar" ? "المستأجر / المنظم" : language === "fr" ? "Locataire / Organisateur" : "Renter / Organizer",
			width: "2.5*",
			minWidth: "220px",
			sortable: true,
			renderCell: (renter: any) => /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F5E2D8] dark:border-neutral-700">{renter.fullName.charAt(0).toUpperCase()}</div>
<div className="min-w-0">
<div className="font-bold text-neutral-900 dark:text-white truncate">{renter.fullName}</div>
<div className="text-[11px] text-neutral-400 truncate">
{renter.companyName || (renter.idDocNumber ? `ID: ${renter.idDocNumber}` : language === "ar" ? "مستأجر خاص" : language === "fr" ? "Locataire Particulier" : "Private Renter")}
</div>
</div>
</div>
		},
		{
			key: "contact",
			header: language === "ar" ? "بيانات الاتصال" : language === "fr" ? "Coordonnées" : "Contact",
			width: "2*",
			minWidth: "180px",
			renderCell: (renter: any) => /* @__PURE__ */ <div className="space-y-0.5 text-xs">
<div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
<Phone size={12} className="text-neutral-400 shrink-0" />
<span>{renter.phone}</span>
</div>
<div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 truncate text-[11px]">
<Mail size={12} className="text-neutral-400 shrink-0" />
<span className="truncate">{renter.email}</span>
</div>
</div>
		},
		{
			key: "bookings",
			header: language === "ar" ? "الحجوزات" : language === "fr" ? "Réservations" : "Bookings",
			width: "1.2*",
			minWidth: "110px",
			sortable: true,
			renderCell: (renter: any) => /* @__PURE__ */ <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 tabular-nums">
{renter.totalBookings}
{" "}
{language === "ar" ? "حجز" : language === "fr" ? "réservations" : "bookings"}
</span>
		},
		{
			key: "spent",
			header: t("venue_renters_kpi_revenue"),
			width: "1.5*",
			minWidth: "130px",
			sortable: true,
			renderCell: (renter: any) => /* @__PURE__ */ <span className="font-bold text-neutral-900 dark:text-white tabular-nums font-mono">{formatCurrencyAmount(renter.totalSpent, renter.currency)}</span>
		}
	], [language, t]);
	const handleExportCSV = () => {
		const headers = [
			language === "ar" ? "الاسم الكامل" : language === "fr" ? "Nom complet" : "Full Name",
			language === "ar" ? "الشركة / المؤسسة" : language === "fr" ? "Entreprise" : "Company",
			language === "ar" ? "الهاتف" : language === "fr" ? "Téléphone" : "Phone",
			language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-mail" : "Email",
			language === "ar" ? "رقم وثيقة الهوية" : language === "fr" ? "N° Pièce Identité" : "ID Doc Number",
			language === "ar" ? "عدد الحجوزات" : language === "fr" ? "Total Réservations" : "Total Bookings",
			language === "ar" ? "إجمالي المداخيل" : language === "fr" ? "Total Dépensé" : "Total Spent",
			language === "ar" ? "العملة" : language === "fr" ? "Devise" : "Currency",
			language === "ar" ? "ملاحظات" : language === "fr" ? "Remarques" : "Notes"
		];
		const rows = filteredRenters.map((r) => [
			`"${r.fullName}"`,
			`"${r.companyName || ""}"`,
			`"${r.phone}"`,
			`"${r.email}"`,
			`"${r.idDocNumber || ""}"`,
			`"${r.totalBookings}"`,
			`"${r.totalSpent}"`,
			`"${r.currency || "DZD"}"`,
			`"${r.notes || ""}"`
		]);
		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `atrium-venue-renters-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
		else document.exitFullscreen().catch(() => {});
	};
	const handleBatchDelete = () => {
		if (selectedIds.size === 0) return;
		if (window.confirm(`Delete ${selectedIds.size} selected renters?`)) {
			selectedIds.forEach((id) => deleteRentalRenter(id));
			setSelectedIds(/* @__PURE__ */ new Set());
		}
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: rentalRenters.length > 0
	});
	if (showSkeleton && (rentalRenters.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "200px"
			},
			{
				width: "2*",
				minWidth: "160px"
			},
			{
				width: "1.5*",
				minWidth: "130px"
			},
			{
				width: "1.5*",
				minWidth: "130px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} hasIcon hasFacility hasActionBtn actionBtnWidth={140} isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200"><Users size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-neutral-900 dark:text-white">{t("venue_renters_page_title")}</h1>
</div>
</div>
<div className="flex items-center gap-3 relative flex-wrap">
<AtriumButton type="button" variant="primary" onClick={handleOpenAdd} icon={<Plus size={15} strokeWidth={2.5} />}><span>{t("venue_renters_btn_add")}</span></AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div>
<h2 className="text-base font-bold text-neutral-900 dark:text-white">
{language === "ar" ? "دليل المستأجرين & مؤشرات النشاط" : language === "fr" ? "Dossiers Locataires & Indicateurs" : "Renters Directory & Portfolio Health"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
{language === "ar" ? "إجمالي المستأجرين" : language === "fr" ? "Base Totale Locataires" : "Total Renters"}
</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
{"↗ 100% "}
{language === "ar" ? "نشط" : language === "fr" ? "Actifs" : "Active"}
</span>
</div>
</div>
<div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{totalRentersCount}</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">{t("venue_renters_kpi_corporate")}</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">
{corporateCount}
{" "}
{language === "ar" ? "شركات وهيئات" : language === "fr" ? "entreprises" : "corporate"}
</span>
</div>
</div>
<div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
{totalRentersCount > 0 ? Math.round(corporateCount / totalRentersCount * 100) : 0}
%
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div>
<span className="text-xs font-medium text-neutral-300">{t("venue_renters_kpi_revenue")}</span>
<div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
<span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
{language === "ar" ? "حجم التعاقدات التراكمي" : language === "fr" ? "Masse locative cumulée" : "Cumulative Bookings Turnover"}
</span>
</div>
</div>
<div className="text-2xl font-black text-white tabular-nums font-mono">{formatCurrencyAmount(totalRevenue, "DZD")}</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2">
<Users size={16} className="text-neutral-500" />
<span className="text-sm font-bold text-neutral-900 dark:text-white">
{language === "ar" ? "دليل المستأجرين" : language === "fr" ? "Dossiers Locataires" : "Venue Renters"}
</span>
<span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">{sortedRenters.length}</span>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={t("venue_renters_search_ph")} shutSize={36} openWidth={220} />
<div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs">
<button type="button" onClick={() => setFilterType("All")} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === "All" ? "bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>
{language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All"}
{" "}
{totalRentersCount}
</button>
<button type="button" onClick={() => setFilterType("Corporate")} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === "Corporate" ? "bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>
{language === "ar" ? "شركات" : language === "fr" ? "Entreprises" : "Corporate"}
{" "}
{corporateCount}
</button>
<button type="button" onClick={() => setFilterType("Individual")} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === "Individual" ? "bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>
{language === "ar" ? "أفراد" : language === "fr" ? "Particuliers" : "Private"}
{" "}
{individualCount}
</button>
</div>
<button type="button" onClick={handleExportCSV} className="h-9 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
<Download size={13} />
<span>{language === "ar" ? "تصدير" : language === "fr" ? "Exporter" : "Export Data"}</span>
</button>
<button type="button" onClick={toggleFullscreen} className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs" title="Fullscreen"><Maximize2 size={14} /></button>
</div>
</div>
{selectedIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
<div className="flex items-center gap-3">
<span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
<span className="text-xs font-bold text-neutral-900 dark:text-white">
{selectedIds.size}
{" "}
{language === "ar" ? "مستأجرين محددين" : language === "fr" ? "locataires sélectionnés" : "renters selected"}
</span>
</div>
<div className="flex items-center gap-2">
<button type="button" onClick={() => setSelectedIds(/* @__PURE__ */ new Set())} className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer">
{language === "ar" ? "إلغاء التحديد" : language === "fr" ? "Désélectionner" : "Deselect"}
</button>
<button type="button" onClick={handleBatchDelete} className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs">
<Trash2 size={13} />
<span>
{language === "ar" ? "حذف المحدد" : language === "fr" ? "Supprimer" : "Delete Selected"}
</span>
</button>
</div>
</div>}
<div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
<UniversalDataCollection items={sortedRenters} keyExtractor={(r) => r.id} defaultViewMode="list" columns={renterColumns} sortBy={renterSortBy} sortDirection={renterSortDir} onSortChange={(key) => {
											if (renterSortBy === key) setRenterSortDir((prev) => prev === "asc" ? "desc" : "asc");
											else {
												setRenterSortBy(key);
												setRenterSortDir("asc");
											}
										}} selectedIds={selectedIds} onSelectionChange={setSelectedIds} isPinned={(r) => pinnedRenterIds.has(r.id)} onTogglePin={(r) => togglePinRenter(r.id)} onItemClick={(r) => setSelectedRenter(r)} onViewDetails={(r) => setSelectedRenter(r)} onEdit={handleOpenEdit} onDelete={(r) => {
											if (window.confirm(`Delete renter ${r.fullName}?`)) {
												deleteRentalRenter(r.id);
												if (selectedRenter?.id === r.id) setSelectedRenter(null);
											}
										}} customActions={(r) => [{
											id: "book",
											label: language === "ar" ? "حجز قاعة" : language === "fr" ? "Réserver" : "Book",
											icon: /* @__PURE__ */ <Calendar size={13} />,
											variant: "primary",
											onClick: () => {
												setBookingRenterId(r.id);
												setIsBookingModalOpen(true);
											}
										}]} renderCard={(renter) => /* @__PURE__ */ <div className="flex flex-col items-center justify-center w-full">
<div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">{renter.fullName.charAt(0).toUpperCase()}</div>
<h3 className="text-base font-bold text-neutral-900 dark:text-white truncate max-w-[210px] mb-0.5 tracking-tight">{renter.fullName}</h3>
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mb-3 truncate max-w-[200px]">
{renter.companyName || (language === "ar" ? "مستأجر خاص" : language === "fr" ? "Locataire Particulier" : "Private Renter")}
</span>
<div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
<div className="font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">{renter.phone}</div>
<div className="truncate text-neutral-400 text-[11px]">{renter.email}</div>
<div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
<span className="text-[11px] text-neutral-400 uppercase font-medium">
{renter.totalBookings}
{" "}
{language === "ar" ? "حجز" : "bookings"}
</span>
<span className="font-bold text-[#d4522f] tabular-nums font-mono">{formatCurrencyAmount(renter.totalSpent, renter.currency)}</span>
</div>
</div>
</div>} />
</div>
{activeRenter && /* @__PURE__ */ <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
<div className="flex items-start justify-between">
<div className="flex items-center gap-3 min-w-0">
<div className="w-12 h-12 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-lg font-black shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">{activeRenter.fullName.charAt(0).toUpperCase()}</div>
<div className="min-w-0">
<h3 className="font-bold text-neutral-900 dark:text-white truncate text-base">{activeRenter.fullName}</h3>
<p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
{activeRenter.companyName || (language === "ar" ? "مستأجر خاص" : language === "fr" ? "Particulier" : "Private Renter")}
</p>
</div>
</div>
<button type="button" onClick={() => setSelectedRenter(null)} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={16} /></button>
</div>
<div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
<button type="button" onClick={() => {
													setBookingRenterId(activeRenter.id);
													setIsBookingModalOpen(true);
												}} className="flex-1 py-1.5 px-3 rounded-xl bg-[#d4522f] hover:bg-[#B3684A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
<Calendar size={13} />
<span>{language === "ar" ? "حجز قاعة" : language === "fr" ? "Réserver" : "Book"}</span>
</button>
<button type="button" onClick={() => handleOpenEdit(activeRenter)} className="py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1 transition-colors">
<Edit2 size={13} />
<span>{language === "ar" ? "تعديل" : language === "fr" ? "Modifier" : "Edit"}</span>
</button>
</div>
<div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl text-xs font-semibold">
<button type="button" onClick={() => setDrawerTab("dossier")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "dossier" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>Dossier</button>
<button type="button" onClick={() => setDrawerTab("bookings")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "bookings" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>Réservations</button>
<button type="button" onClick={() => setDrawerTab("finances")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "finances" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>Finances</button>
<button type="button" onClick={() => setDrawerTab("notes")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "notes" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>Notes</button>
</div>
{drawerTab === "dossier" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-2 border border-neutral-100 dark:border-neutral-800">
<div className="flex justify-between items-center">
<span className="text-neutral-500 font-medium">Téléphone :</span>
<a href={`tel:${activeRenter.phone}`} className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 hover:underline">{activeRenter.phone}</a>
</div>
<div className="flex justify-between items-center">
<span className="text-neutral-500 font-medium">E-mail :</span>
<a href={`mailto:${activeRenter.email}`} className="text-neutral-900 dark:text-neutral-100 truncate max-w-[200px] hover:underline">{activeRenter.email}</a>
</div>
<div className="flex justify-between items-center">
<span className="text-neutral-500 font-medium">Organisme / Entité :</span>
<span className="font-semibold text-neutral-900 dark:text-neutral-100">{activeRenter.companyName || "Particulier"}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-neutral-500 font-medium">N° Pièce / NIF :</span>
<span className="font-mono text-neutral-700 dark:text-neutral-300">{activeRenter.idDocNumber || "Non renseigné"}</span>
</div>
</div>
</div>}
{drawerTab === "bookings" && /* @__PURE__ */ <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
<div className="flex items-center justify-between">
<span className="text-neutral-500 font-medium">Historique & Prévues</span>
<span className="font-bold text-[#d4522f]">
{rentalBookings.filter((b) => b.renterId === activeRenter.id).length}
{" réservations"}
</span>
</div>
<div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
{rentalBookings.filter((b) => b.renterId === activeRenter.id).length === 0 ? /* @__PURE__ */ <div className="p-4 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">Aucune réservation active pour le moment.</div> : rentalBookings.filter((b) => b.renterId === activeRenter.id).map((b) => /* @__PURE__ */ <div key={b.id} className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
<div className="flex items-center justify-between font-semibold">
<span className="text-neutral-900 dark:text-white truncate max-w-[170px]">{b.purpose || "Séance de réservation"}</span>
<span className="font-mono text-[#d4522f]">{formatCurrencyAmount(b.totalAmount, b.currency)}</span>
</div>
<div className="flex items-center justify-between text-[11px] text-neutral-400">
<span>{new Date(b.startDateTime).toLocaleDateString()}</span>
<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">{b.status}</span>
</div>
</div>)}
</div>
</div>}
{drawerTab === "finances" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
<div className="flex justify-between items-center">
<span className="text-neutral-500">Chiffre d'affaires cumulé :</span>
<span className="font-mono font-bold text-base text-neutral-900 dark:text-white">{formatCurrencyAmount(activeRenter.totalSpent, activeRenter.currency)}</span>
</div>
<div className="flex justify-between items-center">
<span className="text-neutral-500">Volume total de contrats :</span>
<span className="font-bold text-neutral-900 dark:text-white">
{activeRenter.totalBookings}
{" créneaux"}
</span>
</div>
<div className="flex justify-between items-center">
<span className="text-neutral-500">Panier moyen :</span>
<span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
{activeRenter.totalBookings > 0 ? formatCurrencyAmount(Math.round(activeRenter.totalSpent / activeRenter.totalBookings), activeRenter.currency) : "--"}
</span>
</div>
</div>
</div>}
{drawerTab === "notes" && /* @__PURE__ */ <div className="space-y-2 text-xs animate-in fade-in duration-150">
<div className="flex items-center justify-between">
<label className="text-neutral-500 font-medium">Consignes & Exigences :</label>
{isSavingNotes ? /* @__PURE__ */ <span className="text-[10px] text-neutral-400 animate-pulse">Sauvegarde...</span> : notesSavedNotice ? /* @__PURE__ */ <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
<Check size={11} />
{" Sauvegardé"}
</span> : null}
</div>
<textarea rows={6} value={renterNotes} onChange={(e) => handleNotesChange(e.target.value)} placeholder="Exigences techniques, sonorisation, badges sécurité, consignes traiteur..." className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]" />
</div>}
</div>}
</div>
<div className="pt-2 text-center text-xs text-neutral-400 font-medium">
{sortedRenters.length}
{" "}
{language === "ar" ? "مستأجرين معروضين" : language === "fr" ? "membres affichés" : "renters displayed"}
</div>
</div>
</div>
{isAddModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
<div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
<div className="p-6 border-b border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
<div>
<h3 className="text-lg font-bold text-neutral-900 dark:text-white">{renterToEdit ? t("venue_renters_btn_edit") : t("venue_renters_btn_add")}</h3>
<p className="text-xs text-neutral-400 mt-0.5">
{language === "ar" ? "تسجيل بيانات المنظم، وثائق الهوية والشركة" : language === "fr" ? "Enregistrer les coordonnées et documents de l'organisateur" : "Save organizer contact, ID document, and corporate details"}
</p>
</div>
<button type="button" onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"><X size={15} /></button>
</div>
<form onSubmit={handleSaveRenter} className="p-6 space-y-4">
<LabelInput label={language === "ar" ? "الاسم الكامل *" : language === "fr" ? "Nom Complet *" : "Full Name *"} placeholder="e.g. Tarek Benaissa" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
<LabelInput label={language === "ar" ? "اسم المؤسسة / الشركة المنظمة" : language === "fr" ? "Nom de l'Entreprise / Organisation" : "Company or Organization Name"} placeholder="e.g. SARL Event Horizon" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<LabelInput label={language === "ar" ? "رقم الهاتف *" : language === "fr" ? "Numéro de Téléphone *" : "Telephone *"} placeholder="+213 550 12 34 56" value={phone} onChange={(e) => setPhone(e.target.value)} required />
<LabelInput label={language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "Adresse E-mail" : "Email Address"} type="email" placeholder="contact@organisation.dz" value={email} onChange={(e) => setEmail(e.target.value)} />
</div>
<LabelInput label={language === "ar" ? "رقم بطاقة الهوية / السجل التجاري" : language === "fr" ? "N° Pièce d'Identité / Registre du Commerce" : "National ID / RC / NIF"} placeholder="e.g. 16/00-1234567B19" value={idDocNumber} onChange={(e) => setIdDocNumber(e.target.value)} />
<div>
<label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
{language === "ar" ? "ملاحظات وتفضيلات الحجز" : language === "fr" ? "Remarques & Préférences" : "Notes & Preferences"}
</label>
<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={language === "ar" ? "متطلبات تقنية، سجل المدفوعات..." : language === "fr" ? "Exigences techniques, historique..." : "Technical needs, catering..."} className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]" />
</div>
<div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/60">
<button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">{language === "ar" ? "إلغاء" : language === "fr" ? "Annuler" : "Cancel"}</button>
<AtriumButton type="submit" variant="primary" icon={<Check size={14} />}>
{renterToEdit ? language === "ar" ? "تحديث البيانات" : language === "fr" ? "Mettre à jour" : "Update Renter" : language === "ar" ? "حفظ المستأجر" : language === "fr" ? "Enregistrer" : "Save Renter"}
</AtriumButton>
</div>
</form>
</div>
</div>}
<BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} initialRenterId={bookingRenterId} />
</div>;
};
