import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  Filter,
  X,
  FileCheck,
  Info,
  Cloud,
  LayoutGrid,
  List,
  Sparkles,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentalBooking, RentableUnitType } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal } from './VenueCloudSyncModal';
import { VenueBookingsView } from './VenueBookingsView';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCalendarTimeline } from '../../ui/skeleton/StructuralSkeletons';



export const VenueTimelineView: React.FC<any> = () => {
	const { t, language } = useTranslation();
	const { rentableUnits, rentalBookings, checkInBooking, checkOutBooking, deleteRentalBooking, currentBranch, businesses, branches, currentBusinessId, switchBusiness, switchBranch, resetVenueMockData, isSyncing, networkMode, isSyncTimeout, retryCloudSync } = useAtriumStore();
	const [selectedDate, setSelectedDate] = React.useState((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
	const [selectedTypeFilter, setSelectedTypeFilter] = React.useState("All");
	const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
	const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = React.useState(false);
	const [modalInitialUnitId, setModalInitialUnitId] = React.useState<any>(void 0);
	const [modalInitialHour, setModalInitialHour] = React.useState<any>(void 0);
	const [inspectedBooking, setInspectedBooking] = React.useState<any>(null);
	const [viewMode, setViewMode] = React.useState("calendar");
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);
	const filteredUnits = rentableUnits.filter((u) => {
		if (selectedTypeFilter === "All") return true;
		return u.type === selectedTypeFilter;
	});
	const selectedDateBookings = rentalBookings.filter((b) => b.startDateTime.startsWith(selectedDate));
	const selectedDateVolume = selectedDateBookings.reduce((sum, b) => sum + b.totalAmount, 0);
	const occupiedSpacesCount = new Set(selectedDateBookings.map((b) => b.unitId)).size;
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
	const handleSlotClick = (unitId: any, hour: any) => {
		const hourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
		setModalInitialUnitId(unitId);
		setModalInitialHour(hourStr);
		setIsBookingModalOpen(true);
	};
	const getBookingLayout = (booking: any) => {
		const startTimePart = (booking.startDateTime?.split("T")[1] || booking.startDateTime || "08:00").slice(0, 5);
		const endTimePart = (booking.endDateTime?.split("T")[1] || booking.endDateTime || "12:00").slice(0, 5);
		const startParts = startTimePart.includes(":") ? startTimePart.split(":").map(Number) : [8, 0];
		const endParts = endTimePart.includes(":") ? endTimePart.split(":").map(Number) : [12, 0];
		const startH = (startParts[0] || 8) + (startParts[1] || 0) / 60;
		const endH = (endParts[0] || 12) + (endParts[1] || 0) / 60;
		const clampedStart = Math.max(8, Math.min(24, startH));
		const clampedEnd = Math.max(8, Math.min(24, endH));
		const leftPercent = (clampedStart - 8) / 16 * 100;
		const widthPercent = Math.max(4, (clampedEnd - clampedStart) / 16 * 100);
		return {
			left: `${leftPercent}%`,
			width: `${widthPercent}%`
		};
	};
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
		else document.exitFullscreen().catch(() => {});
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: rentalBookings.length > 0
	});
	if (showSkeleton && (rentalBookings.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCalendarTimeline isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6">
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
<div className="flex items-center gap-3.5">
<div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200"><CalendarIcon size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[44px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-neutral-900 dark:text-white">{t("venue_timeline_matrix_title")}</h1>
</div>
</div>
<div className="flex items-center gap-3 relative flex-wrap">
<AtriumButton type="button" variant="primary" onClick={() => {
									setModalInitialUnitId(void 0);
									setModalInitialHour(void 0);
									setIsBookingModalOpen(true);
								}} icon={<Plus size={16} strokeWidth={2.5} />}>{t("venue_btn_new_booking")}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-base font-bold text-neutral-900 dark:text-white">
{language === "ar" ? "المخطط الزمني وإشغال القاعات" : language === "fr" ? "Planning des Salles & Occupation" : "Timeline Matrix & Facility Utilization"}
</h2>
<p className="text-xs text-neutral-400 dark:text-neutral-500">
{language === "ar" ? "متابعة الجلسات المجدولة، الساعات المحجوزة والمداخيل اليومية" : language === "fr" ? "Sessions programmées, créneaux occupés et recettes prévisionnelles" : "Scheduled sessions, occupied time slots, and daily booked revenue"}
</p>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
{language === "ar" ? "القاعات والمساحات المتاحة" : language === "fr" ? "Salles & Espaces Gérés" : "Managed Venue Spaces"}
</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
{occupiedSpacesCount}
{" "}
{language === "ar" ? "قاعة محجوزة اليوم" : "occupied today"}
</span>
</div>
</div>
<div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{rentableUnits.length}</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
<div>
<span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
{language === "ar" ? "حجوزات التاريخ المحدد" : language === "fr" ? "Sessions Programmées" : "Booked Sessions on Date"}
</span>
<div className="mt-1">
<span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">{selectedDate}</span>
</div>
</div>
<div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">{selectedDateBookings.length}</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div>
<span className="text-xs font-medium text-neutral-300">
{language === "ar" ? "حجم التعاقدات اليومي" : language === "fr" ? "Volume Réservé du Jour" : "Day Booked Volume"}
</span>
<div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
<span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">{language === "ar" ? "مداخيل الحجوزات" : "Chiffre d'affaires"}</span>
</div>
</div>
<div className="text-2xl font-black text-white tabular-nums font-mono">{formatCurrencyAmount(selectedDateVolume, "DZD")}</div>
</div>
</div>
</div>
{viewMode !== "calendar" ? /* @__PURE__ */ <VenueBookingsView hideHeader hideKpis viewMode={viewMode} onViewModeChange={setViewMode} showViewToggle onSwitchToTimeline={() => setViewMode("calendar")} /> : /* @__PURE__ */ <div className="space-y-4">
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center bg-white dark:bg-neutral-800 rounded-xl p-1 border border-neutral-200/80 dark:border-neutral-700 shadow-2xs">
<button type="button" onClick={handlePrevDay} className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"><ChevronLeft size={16} className="rtl:rotate-180" /></button>
<button type="button" onClick={handleToday} className="px-3 py-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer">{t("venue_timeline_today")}</button>
<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 px-2 focus:outline-hidden" />
<button type="button" onClick={handleNextDay} className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"><ChevronRight size={16} className="rtl:rotate-180" /></button>
</div>
<div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-2xs overflow-x-auto max-w-full">
{[
											{
												id: "All",
												label: t("venue_type_all")
											},
											{
												id: "Hall",
												label: t("venue_type_hall")
											},
											{
												id: "Studio",
												label: t("venue_type_studio")
											},
											{
												id: "Room",
												label: t("venue_type_room")
											},
											{
												id: "Court",
												label: t("venue_type_court")
											},
											{
												id: "Desk",
												label: t("venue_type_desk")
											}
										].map((item) => /* @__PURE__ */ <button key={item.id} type="button" onClick={() => setSelectedTypeFilter(item.id)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${selectedTypeFilter === item.id ? "bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold shadow-2xs" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>{item.label}</button>)}
</div>
<div className="flex items-center bg-white dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-2xs">
<button type="button" onClick={() => setViewMode("list")} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all cursor-pointer" title="List View"><List size={14} /></button>
<button type="button" onClick={() => setViewMode("grid")} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all cursor-pointer" title="Grid View"><LayoutGrid size={14} /></button>
<button type="button" onClick={() => setViewMode("calendar")} className="p-1.5 rounded-lg bg-[#d4522f] text-white shadow-2xs transition-all cursor-pointer" title="Timeline Matrix View"><CalendarIcon size={14} /></button>
</div>
<button type="button" onClick={toggleFullscreen} className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs" title="Fullscreen"><Maximize2 size={14} /></button>
</div>
<div className="bg-white dark:bg-neutral-800 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-700/80 shadow-2xs overflow-hidden">
<div className="flex border-b border-[#E9EEF0] dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-neutral-800/80 sticky top-0 z-10 text-[11px] font-mono text-neutral-400">
<div className="w-56 sm:w-64 p-3 font-semibold text-neutral-700 dark:text-neutral-300 border-r border-[#E9EEF0] dark:border-neutral-700/80 shrink-0">{t("venue_space_asset_header", language, { count: filteredUnits.length })}</div>
<div className="flex-1 grid grid-cols-16 divide-x divide-neutral-200/50 dark:divide-neutral-700/50">
{HOURS.map((hour) => /* @__PURE__ */ <div key={hour} className="py-2.5 text-center truncate">
{hour}
:00
</div>)}
</div>
</div>
<div className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
{filteredUnits.length === 0 ? /* @__PURE__ */ <div className="p-8 text-center text-sm text-neutral-400">{t("venue_no_spaces_filter")}</div> : filteredUnits.map((unit) => {
										const unitBookings = rentalBookings.filter((b) => b.unitId === unit.id && b.startDateTime.startsWith(selectedDate));
										return /* @__PURE__ */ <div key={unit.id} className="flex min-h-[76px] relative group hover:bg-[#F3EDE7]/60 dark:hover:bg-neutral-700/20 transition-colors">
<div className="w-56 sm:w-64 p-3 border-r border-[#E9EEF0] dark:border-neutral-700/80 shrink-0 flex flex-col justify-center">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: unit.colorHex || "#8B5CF6" }} />
<span className="font-bold text-xs text-neutral-900 dark:text-white truncate">{unit.name}</span>
</div>
<div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
<span>
{unit.type === "Hall" ? t("venue_type_hall") : unit.type === "Studio" ? t("venue_type_studio") : unit.type === "Room" ? t("venue_type_room") : unit.type === "Court" ? t("venue_type_court") : t("venue_type_desk")}
</span>
<span>·</span>
<span>{t("venue_card_capacity", language, { count: unit.capacity })}</span>
<span>·</span>
<span className="tabular-nums font-mono font-semibold text-neutral-700 dark:text-neutral-300">
{formatCurrencyAmount(unit.hourlyRate, unit.currency)}
{t("venue_per_hour")}
</span>
</div>
</div>
<div className="flex-1 relative grid grid-cols-16 divide-x divide-neutral-100 dark:divide-neutral-800/40">
{HOURS.map((hour) => /* @__PURE__ */ <div key={hour} onClick={() => handleSlotClick(unit.id, hour)} className="h-full cursor-pointer hover:bg-[#FCEEE8]/50 dark:hover:bg-neutral-700/30 transition-colors" title={t("venue_slot_tooltip", language, {
														name: unit.name,
														time: `${hour}:00`
													})} />)}
{unitBookings.map((booking) => {
													const layout = getBookingLayout(booking);
													const isCheckedIn = booking.status === "CheckedIn";
													const isConfirmed = booking.status === "Confirmed";
													const isTentative = booking.status === "Tentative";
													return /* @__PURE__ */ <div key={booking.id} onClick={(e) => {
															e.stopPropagation();
															setInspectedBooking(booking);
														}} style={{
															left: layout.left,
															width: layout.width
														}} className={`absolute top-2 bottom-2 z-10 rounded-xl px-2.5 py-1.5 cursor-pointer shadow-xs border transition-all flex flex-col justify-center overflow-hidden ${isCheckedIn ? "bg-purple-600/95 hover:bg-purple-600 text-white border-purple-500" : isConfirmed ? "bg-[#d4522f]/95 hover:bg-[#d4522f] text-white border-[#b03b1b]" : isTentative ? "bg-amber-500/95 hover:bg-amber-500 text-white border-amber-400" : "bg-neutral-700 hover:bg-neutral-800 text-white border-neutral-600"}`}>
<div className="font-bold text-xs truncate leading-tight">{booking.purpose}</div>
<div className="text-[10px] opacity-90 truncate mt-0.5">
{booking.renterName}
{" "}
{booking.renterCompany && `(${booking.renterCompany})`}
</div>
</div>;
												})}
</div>
</div>;
									})}
</div>
</div>
</div>
</div>}
</div>
<BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} initialUnitId={modalInitialUnitId} initialStartTime={modalInitialHour} />
{inspectedBooking && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
<div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-700 pb-3">
<div>
<h3 className="text-base font-bold text-neutral-900 dark:text-white">{inspectedBooking.purpose}</h3>
<span className="text-xs text-neutral-400 font-mono">
{inspectedBooking.unitName}
{" · "}
{inspectedBooking.startDateTime.replace("T", " ").slice(0, 16)}
</span>
</div>
<button type="button" onClick={() => setInspectedBooking(null)} className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"><X size={15} /></button>
</div>
<div className="space-y-3 text-xs">
<div className="p-4 bg-[#F3EDE7] dark:bg-neutral-700/40 rounded-2xl border border-[#E6DED6] dark:border-neutral-700 space-y-2">
<div className="flex justify-between">
<span className="text-neutral-500">Organisateur:</span>
<span className="font-bold text-neutral-900 dark:text-white">{inspectedBooking.renterName}</span>
</div>
<div className="flex justify-between">
<span className="text-neutral-500">Téléphone:</span>
<span className="font-mono text-neutral-800 dark:text-neutral-200">{inspectedBooking.renterPhone}</span>
</div>
<div className="flex justify-between">
<span className="text-neutral-500">Montant Total:</span>
<span className="font-bold text-neutral-900 dark:text-white tabular-nums font-mono">{formatCurrencyAmount(inspectedBooking.totalAmount, inspectedBooking.currency)}</span>
</div>
<div className="flex justify-between">
<span className="text-neutral-500">Caution Sécurité:</span>
<span className="font-semibold text-emerald-600 tabular-nums font-mono">
{formatCurrencyAmount(inspectedBooking.depositAmount, inspectedBooking.currency)}
{" ("}
{inspectedBooking.depositStatus}
)
</span>
</div>
</div>
</div>
<div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
{inspectedBooking.status === "Confirmed" && /* @__PURE__ */ <button type="button" onClick={() => {
									checkInBooking(inspectedBooking.id);
									setInspectedBooking(null);
								}} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">{t("venue_btn_checkin_guest")}</button>}
{inspectedBooking.status === "CheckedIn" && /* @__PURE__ */ <button type="button" onClick={() => {
									checkOutBooking(inspectedBooking.id);
									setInspectedBooking(null);
								}} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">{t("venue_btn_checkout_space")}</button>}
</div>
</div>
</div>}
</div>;
};

export { VenueFinanceView_exports as a, LogOut as c, VenueInventoryView_exports as i, Database as l, VenueStaffView_exports as n, VenueDashboardView_exports as o, VenueRentersView_exports as r, VenueBookingsView_exports as s, VenueTimelineView_exports as t };
