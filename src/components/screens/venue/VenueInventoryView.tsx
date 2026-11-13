import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  DoorOpen,
  Users,
  Maximize2,
  DollarSign,
  Tag,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Pin,
  Calendar,
  Clock,
  Home,
  ChevronDown,
  Download,
  Building2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentableUnitType, RentableUnitStatus } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const VenueInventoryView: React.FC<any> = () => {
	const { t, language } = useTranslation();
	const { rentableUnits, rentalBookings, createRentableUnit, updateRentableUnit, deleteRentableUnit, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, resetVenueMockData, showToast, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [searchQuery, setSearchQuery] = React.useState("");
	const [selectedTypeFilter, setSelectedTypeFilter] = React.useState("All");
	const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
	const [unitToEdit, setUnitToEdit] = React.useState<any>(null);
	const [selectedUnitIds, setSelectedUnitIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedUnitIds, setPinnedUnitIds] = React.useState(/* @__PURE__ */ new Set());
	const [unitSortBy, setUnitSortBy] = React.useState("name");
	const [unitSortDir, setUnitSortDir] = React.useState("asc");
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const [selectedUnit, setSelectedUnit] = React.useState<any>(null);
	const [drawerTab, setDrawerTab] = React.useState("fiche");
	const [unitNotes, setUnitNotes] = React.useState("");
	const [isSavingNotes, setIsSavingNotes] = React.useState(false);
	const [notesSavedNotice, setNotesSavedNotice] = React.useState(false);
	const activeUnit = React.useMemo(() => {
		if (!selectedUnit) return null;
		return rentableUnits.find((u) => u.id === selectedUnit.id) || selectedUnit;
	}, [selectedUnit, rentableUnits]);
	React.useEffect(() => {
		if (activeUnit) setUnitNotes(activeUnit.description || "");
	}, [activeUnit?.id]);
	const handleNotesChange = (val: any) => {
		setUnitNotes(val);
		if (!activeUnit) return;
		setIsSavingNotes(true);
		updateRentableUnit(activeUnit.id, { description: val });
		setTimeout(() => {
			setIsSavingNotes(false);
			setNotesSavedNotice(true);
			setTimeout(() => setNotesSavedNotice(false), 2e3);
		}, 400);
	};
	const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
	const [selectedUnitForBooking, setSelectedUnitForBooking] = React.useState<any>(void 0);
	const [name, setName] = React.useState("");
	const [code, setCode] = React.useState("");
	const [type, setType] = React.useState("Hall");
	const [capacity, setCapacity] = React.useState(50);
	const [surfaceAreaSqm, setSurfaceAreaSqm] = React.useState(120);
	const [hourlyRate, setHourlyRate] = React.useState(8e3);
	const [dailyRate, setDailyRate] = React.useState(6e4);
	const [amenitiesStr, setAmenitiesStr] = React.useState("High-Speed Wifi, Climate Control AC, Sound System");
	const [description, setDescription] = React.useState("");
	const [colorHex, setColorHex] = React.useState("#8B5CF6");
	const filteredUnits = React.useMemo(() => {
		return rentableUnits.filter((u) => {
			const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.code.toLowerCase().includes(searchQuery.toLowerCase()) || u.description.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesType = selectedTypeFilter === "All" || u.type === selectedTypeFilter;
			return matchesSearch && matchesType;
		});
	}, [
		rentableUnits,
		searchQuery,
		selectedTypeFilter
	]);
	const totalSpaces = rentableUnits.length;
	const totalCapacity = rentableUnits.reduce((sum, u) => sum + u.capacity, 0);
	const averageHourlyRate = totalSpaces > 0 ? Math.round(rentableUnits.reduce((sum, u) => sum + u.hourlyRate, 0) / totalSpaces) : 0;
	const sortedUnits = React.useMemo(() => {
		return [...filteredUnits].sort((a, b) => {
			const aPinned = pinnedUnitIds.has(a.id);
			const bPinned = pinnedUnitIds.has(b.id);
			if (aPinned && !bPinned) return -1;
			if (!aPinned && bPinned) return 1;
			if (unitSortBy === "name" || unitSortBy === "code") {
				const cmp = a.name.localeCompare(b.name);
				return unitSortDir === "asc" ? cmp : -cmp;
			}
			if (unitSortBy === "type") {
				const cmp = a.type.localeCompare(b.type);
				return unitSortDir === "asc" ? cmp : -cmp;
			}
			if (unitSortBy === "capacity") return unitSortDir === "asc" ? a.capacity - b.capacity : b.capacity - a.capacity;
			if (unitSortBy === "surface") {
				const aSurf = a.surfaceAreaSqm || 0;
				const bSurf = b.surfaceAreaSqm || 0;
				return unitSortDir === "asc" ? aSurf - bSurf : bSurf - aSurf;
			}
			if (unitSortBy === "rates" || unitSortBy === "hourlyRate") return unitSortDir === "asc" ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate;
			if (unitSortBy === "dailyRate") return unitSortDir === "asc" ? a.dailyRate - b.dailyRate : b.dailyRate - a.dailyRate;
			if (unitSortBy === "status") return unitSortDir === "asc" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
			return 0;
		});
	}, [
		filteredUnits,
		pinnedUnitIds,
		unitSortBy,
		unitSortDir
	]);
	const handleOpenAdd = () => {
		setUnitToEdit(null);
		setName("");
		setCode(`ROOM-${Math.floor(100 + Math.random() * 900)}`);
		setType("Room");
		setCapacity(30);
		setSurfaceAreaSqm(80);
		setHourlyRate(5e3);
		setDailyRate(35e3);
		setAmenitiesStr("Wifi, Presentation Screen, AC");
		setDescription("");
		setColorHex("#3B82F6");
		setIsAddModalOpen(true);
	};
	const handleOpenEdit = (unit: any) => {
		setUnitToEdit(unit);
		setName(unit.name);
		setCode(unit.code);
		setType(unit.type);
		setCapacity(unit.capacity);
		setSurfaceAreaSqm(unit.surfaceAreaSqm || 0);
		setHourlyRate(unit.hourlyRate);
		setDailyRate(unit.dailyRate);
		setAmenitiesStr(unit.amenities.join(", "));
		setDescription(unit.description);
		setColorHex(unit.colorHex || "#8B5CF6");
		setIsAddModalOpen(true);
	};
	const handleSaveUnit = (e: any) => {
		e.preventDefault();
		if (!name.trim()) {
			showToast({
				type: "warning",
				title: "Missing Space Name",
				message: "Please provide a name for this rentable hall or unit."
			});
			return;
		}
		const amenitiesList = amenitiesStr.split(",").map((a) => a.trim()).filter(Boolean);
		if (unitToEdit) updateRentableUnit(unitToEdit.id, {
			name: name.trim(),
			code: code.trim().toUpperCase(),
			type: type as any,
			capacity: Number(capacity) || 10,
			surfaceAreaSqm: Number(surfaceAreaSqm) || 50,
			hourlyRate: Number(hourlyRate) || 0,
			dailyRate: Number(dailyRate) || 0,
			amenities: amenitiesList,
			description: description.trim(),
			colorHex
		});
		else createRentableUnit({
			name: name.trim(),
			code: code.trim().toUpperCase() || `ROOM-${Date.now().toString().slice(-4)}`,
			type: type as any,
			capacity: Number(capacity) || 10,
			surfaceAreaSqm: Number(surfaceAreaSqm) || 50,
			hourlyRate: Number(hourlyRate) || 0,
			dailyRate: Number(dailyRate) || 0,
			currency: "DZD",
			status: "Available",
			amenities: amenitiesList,
			description: description.trim(),
			colorHex
		});
		setIsAddModalOpen(false);
	};
	const handleToggleStatus = (unit: any) => {
		const nextStatus = unit.status === "Available" ? "Maintenance" : unit.status === "Maintenance" ? "Available" : "Available";
		updateRentableUnit(unit.id, { status: nextStatus });
		showToast({
			type: "info",
			title: "Status Updated",
			message: `${unit.name} is now ${nextStatus}`
		});
	};
	const handleExportUnitsCSV = () => {
		const headers = [
			language === "ar" ? "رمز القاعة" : "Code",
			language === "ar" ? "الاسم" : "Name",
			language === "ar" ? "النوع" : "Type",
			language === "ar" ? "الطاقة الاستيعابية" : "Capacity",
			language === "ar" ? "المساحة م²" : "Surface (sqm)",
			language === "ar" ? "السعر بالساعة" : "Hourly Rate",
			language === "ar" ? "السعر باليوم" : "Daily Rate",
			language === "ar" ? "الحالة" : "Status",
			language === "ar" ? "الميزات والتجهيزات" : "Amenities"
		];
		const rows = filteredUnits.map((u) => [
			`"${u.code}"`,
			`"${u.name}"`,
			`"${u.type}"`,
			`"${u.capacity}"`,
			`"${u.surfaceAreaSqm || ""}"`,
			`"${u.hourlyRate}"`,
			`"${u.dailyRate}"`,
			`"${u.status}"`,
			`"${u.amenities.join("; ")}"`
		]);
		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `atrium-venue-spaces-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	const handleBatchDelete = () => {
		if (selectedUnitIds.size === 0) return;
		if (confirm(t("venue_inv_confirm_batch_del", language, { count: selectedUnitIds.size }))) {
			selectedUnitIds.forEach((id) => deleteRentableUnit(id));
			setSelectedUnitIds(/* @__PURE__ */ new Set());
		}
	};
	const handleBatchSetStatus = (status: any) => {
		if (selectedUnitIds.size === 0) return;
		selectedUnitIds.forEach((id) => updateRentableUnit(id, { status }));
		const count = selectedUnitIds.size;
		setSelectedUnitIds(/* @__PURE__ */ new Set());
		showToast({
			type: "success",
			title: language === "ar" ? "تم التحديث" : language === "fr" ? "Statut mis à jour" : "Status Updated",
			message: `${count} ${language === "ar" ? "مساحة تم تحديث حالتها" : "spaces status updated"}`
		});
	};
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
		else document.exitFullscreen().catch(() => {});
	};
	const unitColumns = React.useMemo(() => [
		{
			key: "name",
			header: t("venue_inv_col_space"),
			width: "2.5*",
			minWidth: "220px",
			sortable: true,
			renderCell: (u: any) => {
				const localizedType = u.type === "Hall" ? t("venue_type_hall") : u.type === "Studio" ? t("venue_type_studio") : u.type === "Room" ? t("venue_type_room") : u.type === "Court" ? t("venue_type_court") : t("venue_type_desk");
				return /* @__PURE__ */ <div className="flex items-center gap-3">
<span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: u.colorHex || "#8B5CF6" }} />
<div className="min-w-0">
<div className="font-semibold text-black dark:text-white truncate">{u.name}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 truncate">
{u.code}
{" · "}
{localizedType}
</div>
</div>
</div>;
			}
		},
		{
			key: "capacity",
			header: t("venue_inv_col_capacity"),
			width: "1.2*",
			minWidth: "110px",
			sortable: true,
			renderCell: (u: any) => /* @__PURE__ */ <span className="font-medium text-xs text-black dark:text-white tabular-nums">{t("venue_card_capacity", language, { count: u.capacity })}</span>
		},
		{
			key: "surface",
			header: t("venue_inv_surface"),
			width: "1.2*",
			minWidth: "110px",
			sortable: true,
			renderCell: (u: any) => /* @__PURE__ */ <span className="text-xs text-black/70 dark:text-white/75 tabular-nums">
{u.surfaceAreaSqm ? t("venue_inv_surface_unit", language, { surface: u.surfaceAreaSqm }) : "--"}
</span>
		},
		{
			key: "rates",
			header: t("venue_inv_col_rates"),
			width: "2*",
			minWidth: "170px",
			sortable: true,
			renderCell: (u: any) => /* @__PURE__ */ <div className="text-xs space-y-0.5">
<div className="font-semibold text-black dark:text-white tabular-nums font-mono">
{formatCurrencyAmount(u.hourlyRate, u.currency)}
{" / "}
{t("venue_inv_hourly_short")}
</div>
<div className="text-[11px] text-black/55 dark:text-white/55 tabular-nums font-mono">
{formatCurrencyAmount(u.dailyRate, u.currency)}
{" / "}
{t("venue_inv_daily_short")}
</div>
</div>
		},
		{
			key: "status",
			header: t("venue_inv_col_status"),
			width: "1.2*",
			minWidth: "110px",
			sortable: true,
			renderCell: (u: any) => {
				const localizedStatus = u.status === "Available" ? language === "ar" ? "متاحة" : language === "fr" ? "Disponible" : "Available" : u.status === "Occupied" ? t("venue_kpi_in_use") : language === "ar" ? "صيانة" : language === "fr" ? "Maintenance" : "Maintenance";
				return /* @__PURE__ */ <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${u.status === "Available" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : u.status === "Occupied" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>{localizedStatus}</span>;
			}
		}
	], [language, t]);
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: rentableUnits.length > 0
	});
	if (showSkeleton && (rentableUnits.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
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
<div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white"><DoorOpen size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">{t("venue_inv_title")}</h1>
</div>
</div>
<div className="flex items-center gap-3 relative flex-wrap">
<AtriumButton type="button" variant="primary" onClick={handleOpenAdd} icon={<Plus size={16} strokeWidth={2.5} />}><span>{t("venue_inv_btn_new_space")}</span></AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div>
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{language === "ar" ? "سعة المرافق & أداء الحظيرة" : language === "fr" ? "Capacité des Espaces & Performance" : "Venue Capacity & Portfolio Performance"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "إجمالي القاعات والمساحات" : language === "fr" ? "Parc Total des Espaces" : "Total Venue Spaces"}
</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
{"↗ "}
{totalSpaces}
{" "}
{language === "ar" ? "قاعة جاهزة" : language === "fr" ? "salles prêtes" : "spaces ready"}
</span>
</div>
</div>
<div className="text-3xl font-black text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{totalSpaces}</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "طاقة الاستقبال الإجمالية" : language === "fr" ? "Capacité d'Accueil Totale" : "Total Guest Capacity"}
</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">
{totalCapacity}
{" "}
{language === "ar" ? "مقعد / ضيف" : language === "fr" ? "places" : "seats"}
</span>
</div>
</div>
<div className="text-3xl font-black text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{totalCapacity}</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div>
<span className="text-xs font-medium text-white/80">
{language === "ar" ? "متوسط السعر الساعي" : language === "fr" ? "Tarif Horaire Moyen" : "Average Hourly Rate"}
</span>
<div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
<span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
{language === "ar" ? "التعريفة القياسية للأتريوم" : language === "fr" ? "Tarification de base" : "Baseline Facility Index"}
</span>
</div>
</div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatCurrencyAmount(averageHourlyRate, "DZD")}</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-2">
<DoorOpen size={16} className="text-black/55 dark:text-white/55" />
<span className="text-sm font-bold text-black dark:text-white">
{language === "ar" ? "دليل القاعات والمرافق" : language === "fr" ? "Catalogue des Espaces" : "Spaces Catalog"}
</span>
<span className="text-xs text-black/55 dark:text-white/55 font-semibold tabular-nums ml-1">{sortedUnits.length}</span>
</div>
<div className="flex flex-wrap items-center gap-2.5 ml-auto">
<Seek value={searchQuery} onChange={setSearchQuery} placeholder={t("venue_inv_search_ph")} shutSize={36} openWidth={220} />
<div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
{[
												{
													id: "All",
													label: language === "ar" ? "الكل" : language === "fr" ? "Tous" : "All",
													tooltip: t("venue_type_all")
												},
												{
													id: "Hall",
													label: language === "ar" ? "قاعات" : language === "fr" ? "Salles" : "Halls",
													tooltip: t("venue_type_hall")
												},
												{
													id: "Studio",
													label: language === "ar" ? "أستوديوهات" : "Studios",
													tooltip: t("venue_type_studio")
												},
												{
													id: "Room",
													label: language === "ar" ? "اجتماعات" : language === "fr" ? "Réunion" : "Rooms",
													tooltip: t("venue_type_room")
												},
												{
													id: "Court",
													label: language === "ar" ? "ملاعب" : language === "fr" ? "Terrains" : "Courts",
													tooltip: t("venue_type_court")
												},
												{
													id: "Desk",
													label: language === "ar" ? "مكاتب" : language === "fr" ? "Bureaux" : "Desks",
													tooltip: t("venue_type_desk")
												}
											].map((item) => /* @__PURE__ */ <button key={item.id} type="button" onClick={() => setSelectedTypeFilter(item.id)} title={item.tooltip} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${selectedTypeFilter === item.id ? "bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>{item.label}</button>)}
</div>
<button type="button" onClick={handleExportUnitsCSV} className="h-9 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
<Download size={13} />
<span>{language === "ar" ? "تصدير" : language === "fr" ? "Exporter" : "Export CSV"}</span>
</button>
<button type="button" onClick={toggleFullscreen} className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs" title="Fullscreen"><Maximize2 size={14} /></button>
</div>
</div>
{selectedUnitIds.size > 0 && /* @__PURE__ */ <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2 flex-wrap gap-2">
<div className="flex items-center gap-3">
<span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
<span className="text-xs font-bold text-black dark:text-white">
{selectedUnitIds.size}
{" "}
{language === "ar" ? "مساحات محددة" : language === "fr" ? "espaces sélectionnés" : "spaces selected"}
</span>
</div>
<div className="flex items-center gap-2 flex-wrap">
<button type="button" onClick={() => handleBatchSetStatus("Available")} className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
{language === "ar" ? "تعيين كمتاحة" : language === "fr" ? "Rendre Disponible" : "Mark Available"}
</button>
<button type="button" onClick={() => handleBatchSetStatus("Maintenance")} className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer">
{language === "ar" ? "تعيين للصيانة" : language === "fr" ? "Maintenance" : "Maintenance"}
</button>
<button type="button" onClick={() => setSelectedUnitIds(/* @__PURE__ */ new Set())} className="px-3 py-1 text-xs text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer">
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
<UniversalDataCollection items={sortedUnits} keyExtractor={(u) => u.id} defaultViewMode="grid" columns={unitColumns} sortBy={unitSortBy} sortDirection={unitSortDir} onSortChange={(key) => {
											if (unitSortBy === key) setUnitSortDir((prev) => prev === "asc" ? "desc" : "asc");
											else {
												setUnitSortBy(key);
												setUnitSortDir("asc");
											}
										}} selectedIds={selectedUnitIds} onSelectionChange={setSelectedUnitIds} isPinned={(u) => pinnedUnitIds.has(u.id)} onTogglePin={(u) => {
											setPinnedUnitIds((prev) => {
												const next = new Set(prev);
												if (next.has(u.id)) next.delete(u.id);
												else next.add(u.id);
												return next;
											});
										}} onItemClick={(u) => setSelectedUnit(u)} onViewDetails={(u) => setSelectedUnit(u)} onEdit={handleOpenEdit} onDelete={(u) => {
											if (confirm(t("venue_inv_confirm_del", language, { name: u.name }))) {
												deleteRentableUnit(u.id);
												if (selectedUnit?.id === u.id) setSelectedUnit(null);
											}
										}} customActions={(u) => [{
											id: "book",
											label: t("venue_reserve_space"),
											icon: /* @__PURE__ */ <Calendar size={13} />,
											variant: "primary",
											onClick: () => {
												setSelectedUnitForBooking(u.id);
												setIsBookingModalOpen(true);
											}
										}]} renderCard={(unit) => {
											const localizedType = unit.type === "Hall" ? t("venue_type_hall") : unit.type === "Studio" ? t("venue_type_studio") : unit.type === "Room" ? t("venue_type_room") : unit.type === "Court" ? t("venue_type_court") : t("venue_type_desk");
											const localizedStatus = unit.status === "Available" ? language === "ar" ? "متاحة" : language === "fr" ? "Disponible" : "Available" : unit.status === "Occupied" ? t("venue_kpi_in_use") : language === "ar" ? "صيانة" : language === "fr" ? "Maintenance" : "Maintenance";
											return /* @__PURE__ */ <div className="flex flex-col justify-between w-full h-full">
<div>
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: unit.colorHex || "#8B5CF6" }} />
<span className="text-xs font-mono font-semibold text-black/55 dark:text-white/55 uppercase">{unit.code}</span>
<span className="text-[11px] text-black/55 dark:text-white/55">
{"· "}
{localizedType}
</span>
</div>
<button type="button" onClick={(e) => {
																e.stopPropagation();
																handleToggleStatus(unit);
															}} className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-colors cursor-pointer ${unit.status === "Available" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200" : unit.status === "Occupied" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 hover:bg-purple-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200"}`} title={localizedStatus}>{localizedStatus}</button>
</div>
<h3 className="font-bold text-base text-black dark:text-white">{unit.name}</h3>
<p className="text-xs text-black/55 dark:text-white/75 mt-1 line-clamp-2">{unit.description}</p>
<div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl text-xs">
<div>
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">{t("venue_inv_capacity")}</span>
<span className="font-semibold text-black dark:text-white tabular-nums">{t("venue_card_capacity", language, { count: unit.capacity })}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">{t("venue_inv_surface")}</span>
<span className="font-semibold text-black dark:text-white tabular-nums">
{unit.surfaceAreaSqm ? t("venue_inv_surface_unit", language, { surface: unit.surfaceAreaSqm }) : "--"}
</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">{t("venue_inv_hourly_rate")}</span>
<span className="font-semibold text-black dark:text-white tabular-nums font-mono">{formatCurrencyAmount(unit.hourlyRate, unit.currency)}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">{t("venue_inv_daily_rate")}</span>
<span className="font-semibold text-black dark:text-white tabular-nums font-mono">{formatCurrencyAmount(unit.dailyRate, unit.currency)}</span>
</div>
</div>
{unit.amenities.length > 0 && /* @__PURE__ */ <div className="mt-3 flex flex-wrap gap-1">
{unit.amenities.map((amenity, idx) => /* @__PURE__ */ <span key={idx} className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75 px-2 py-0.5 rounded-md">{amenity}</span>)}
</div>}
</div>
<div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
<span className="text-xs font-bold text-black dark:text-white tabular-nums font-mono">
{formatCurrencyAmount(unit.hourlyRate, unit.currency)}
{" / "}
{t("venue_inv_hourly_short")}
</span>
<button type="button" onClick={(e) => {
															e.stopPropagation();
															setSelectedUnitForBooking(unit.id);
															setIsBookingModalOpen(true);
														}} className="px-3 py-1.5 bg-[#FDF4F0] hover:bg-[#FBE5DC] text-[#d4522f] rounded-xl text-xs font-bold transition-colors cursor-pointer">{t("venue_btn_reserve")}</button>
</div>
</div>;
										}} />
</div>
{activeUnit && /* @__PURE__ */ <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
<div className="flex items-start justify-between">
<div className="flex items-center gap-3 min-w-0">
<span className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-white shadow-2xs font-bold" style={{ backgroundColor: activeUnit.colorHex || "#8B5CF6" }}><DoorOpen size={20} /></span>
<div className="min-w-0">
<h3 className="font-bold text-black dark:text-white truncate text-base">{activeUnit.name}</h3>
<div className="flex items-center gap-1.5 text-xs text-black/55 dark:text-white/55">
<span className="font-mono font-semibold">{activeUnit.code}</span>
<span>·</span>
<span>{activeUnit.type}</span>
</div>
</div>
</div>
<button type="button" onClick={() => setSelectedUnit(null)} className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={16} /></button>
</div>
<div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
<button type="button" onClick={() => {
														setSelectedUnitForBooking(activeUnit.id);
														setIsBookingModalOpen(true);
													}} className="flex-1 py-1.5 px-3 rounded-xl bg-[#d4522f] hover:bg-[#B3684A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
<Calendar size={13} />
<span>{t("venue_reserve_space")}</span>
</button>
<button type="button" onClick={() => handleToggleStatus(activeUnit)} className="py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold flex items-center gap-1 transition-colors">
<Clock size={13} />
<span>{activeUnit.status}</span>
</button>
<button type="button" onClick={() => handleOpenEdit(activeUnit)} className="py-1.5 px-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold flex items-center gap-1 transition-colors"><Edit2 size={13} /></button>
</div>
<div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl text-xs font-semibold">
<button type="button" onClick={() => setDrawerTab("fiche")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "fiche" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Fiche Espace</button>
<button type="button" onClick={() => setDrawerTab("planning")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "planning" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Planning</button>
<button type="button" onClick={() => setDrawerTab("rates")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "rates" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Tarifs</button>
<button type="button" onClick={() => setDrawerTab("notes")} className={`flex-1 py-1 text-center rounded-lg transition-all ${drawerTab === "notes" ? "bg-white dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>Consignes</button>
</div>
{drawerTab === "fiche" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
<div>
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">Capacité d'accueil</span>
<span className="font-bold text-black dark:text-white text-sm">
{activeUnit.capacity}
{" places"}
</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">Superficie</span>
<span className="font-bold text-black dark:text-white text-sm">
{activeUnit.surfaceAreaSqm || "--"}
{" m²"}
</span>
</div>
<div className="mt-1">
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">Type d'espace</span>
<span className="font-semibold text-black dark:text-white">{activeUnit.type}</span>
</div>
<div className="mt-1">
<span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">Statut actuel</span>
<span className="font-semibold text-emerald-600 dark:text-emerald-400">{activeUnit.status}</span>
</div>
</div>
<div>
<span className="font-bold text-[11px] text-black/70 dark:text-white/75 block mb-1.5 uppercase">Équipements & Installations</span>
<div className="flex flex-wrap gap-1">
{activeUnit.amenities.map((a: any, i: number) => /* @__PURE__ */ <span key={i} className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 text-[11px] font-medium">
{"✓ "}
{a}
</span>)}
</div>
</div>
</div>}
{drawerTab === "planning" && /* @__PURE__ */ <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55 font-medium">Créneaux réservés</span>
<span className="font-bold text-[#d4522f]">
{rentalBookings.filter((b) => b.unitId === activeUnit.id).length}
{" réservations"}
</span>
</div>
<div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
{rentalBookings.filter((b) => b.unitId === activeUnit.id).length === 0 ? /* @__PURE__ */ <div className="p-4 text-center text-black/55 dark:text-white/55 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">Aucun créneau planifié sur cet espace.</div> : rentalBookings.filter((b) => b.unitId === activeUnit.id).map((b) => /* @__PURE__ */ <div key={b.id} className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
<div className="flex items-center justify-between font-semibold">
<span className="text-black dark:text-white truncate max-w-[170px]">{b.purpose || "Séance"}</span>
<span className="font-mono text-[#d4522f]">{formatCurrencyAmount(b.totalAmount, b.currency)}</span>
</div>
<div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
<span>{new Date(b.startDateTime).toLocaleDateString()}</span>
<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600">{b.status}</span>
</div>
</div>)}
</div>
</div>}
{drawerTab === "rates" && /* @__PURE__ */ <div className="space-y-3 text-xs animate-in fade-in duration-150">
<div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Tarif Horaire :</span>
<span className="font-mono font-bold text-base text-black dark:text-white">
{formatCurrencyAmount(activeUnit.hourlyRate, activeUnit.currency)}
{" / h"}
</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Tarif Journée Entière :</span>
<span className="font-mono font-bold text-black dark:text-white">
{formatCurrencyAmount(activeUnit.dailyRate, activeUnit.currency)}
{" / j"}
</span>
</div>
<div className="flex justify-between items-center">
<span className="text-black/55 dark:text-white/55">Devise de facturation :</span>
<span className="font-bold text-black dark:text-white font-mono">{activeUnit.currency}</span>
</div>
</div>
</div>}
{drawerTab === "notes" && /* @__PURE__ */ <div className="space-y-2 text-xs animate-in fade-in duration-150">
<div className="flex items-center justify-between">
<label className="text-black/55 dark:text-white/55 font-medium">Consignes d'accès & Entretien :</label>
{isSavingNotes ? /* @__PURE__ */ <span className="text-[10px] text-black/55 dark:text-white/55 animate-pulse">Sauvegarde...</span> : notesSavedNotice ? /* @__PURE__ */ <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
<Check size={11} />
{" Sauvegardé"}
</span> : null}
</div>
<textarea rows={6} value={unitNotes} onChange={(e) => handleNotesChange(e.target.value)} placeholder="Consignes de climatisation, disposition des tables, clés des portes, codes alarme..." className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]" />
</div>}
</div>}
</div>
<div className="pt-2 text-center text-xs text-black/55 dark:text-white/55 font-medium">
{sortedUnits.length}
{" "}
{language === "ar" ? "مساحات معروضة" : language === "fr" ? "espaces affichés" : "spaces displayed"}
</div>
</div>
</div>
{isAddModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
<div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
<div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
<div>
<h3 className="text-lg font-bold text-black dark:text-white">{unitToEdit ? t("venue_inv_btn_edit") : t("venue_inv_btn_new_space")}</h3>
<p className="text-xs text-black/55 dark:text-white/55 mt-0.5">
{language === "ar" ? "تكوين مواصفات القاعة، الطاقة الاستيعابية والتعريفات" : language === "fr" ? "Configurer les caractéristiques, tarifs et équipements" : "Set up space specifications, guest capacity, and hire rates"}
</p>
</div>
<button type="button" onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white transition-colors cursor-pointer"><X size={15} /></button>
</div>
<form onSubmit={handleSaveUnit} className="p-6 space-y-4">
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<LabelInput label={t("venue_inv_space_name") + " *"} placeholder="e.g. Grand Hall Atlas" value={name} onChange={(e) => setName(e.target.value)} required />
<LabelInput label={t("venue_inv_code")} placeholder="e.g. HALL-A" value={code} onChange={(e) => setCode(e.target.value)} required />
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div>
<LabelSelect label={t("venue_inv_type")} value={type} onChange={(val) => setType(val)} options={[
											{
												value: "Hall",
												label: t("venue_type_hall")
											},
											{
												value: "Studio",
												label: t("venue_type_studio")
											},
											{
												value: "Room",
												label: t("venue_type_room")
											},
											{
												value: "Court",
												label: t("venue_type_court")
											},
											{
												value: "Desk",
												label: t("venue_type_desk")
											}
										]} />
</div>
<LabelInput label={t("venue_inv_capacity")} type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
<LabelInput label={t("venue_inv_surface")} type="number" min={1} value={surfaceAreaSqm} onChange={(e) => setSurfaceAreaSqm(Number(e.target.value))} />
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<LabelInput label={t("venue_inv_hourly_rate") + " (DZD) *"} type="number" step={500} value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} required />
<LabelInput label={t("venue_inv_daily_rate") + " (DZD) *"} type="number" step={1000} value={dailyRate} onChange={(e) => setDailyRate(Number(e.target.value))} required />
</div>
<LabelInput label={t("venue_inv_amenities")} placeholder="Wifi, Climatisation, Rétroprojecteur, Sonorisation" value={amenitiesStr} onChange={(e) => setAmenitiesStr(e.target.value)} />
<div>
<label className="block text-xs font-semibold text-black/70 dark:text-white/75 mb-1">{t("venue_inv_desc")}</label>
<textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description commerciale de l'espace..." className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]" />
</div>
<div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
<button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">{language === "ar" ? "إلغاء" : language === "fr" ? "Annuler" : "Cancel"}</button>
<AtriumButton type="submit" variant="primary" icon={<Check size={14} />}>{unitToEdit ? t("venue_inv_btn_edit") : t("venue_inv_btn_save")}</AtriumButton>
</div>
</form>
</div>
</div>}
<BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} initialUnitId={selectedUnitForBooking} />
</div>;
};
