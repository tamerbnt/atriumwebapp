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

export const VenueTimelineView: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    rentableUnits,
    rentalBookings,
    checkInBooking,
    checkOutBooking,
    deleteRentalBooking,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    resetVenueMockData,
  } = useAtriumStore();

  // Auto-heal empty venue datasets safely once on mount if empty
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && (rentableUnits.length === 0 || rentalBookings.length === 0)) {
      hasAutoHealed.current = true;
      resetVenueMockData();
    }
  }, [rentableUnits.length, rentalBookings.length, resetVenueMockData]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | RentableUnitType>('All');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [modalInitialUnitId, setModalInitialUnitId] = useState<string | undefined>(undefined);
  const [modalInitialHour, setModalInitialHour] = useState<string | undefined>(undefined);
  const [inspectedBooking, setInspectedBooking] = useState<RentalBooking | null>(null);
  const [mainViewMode, setMainViewMode] = useState<'timeline' | 'collection'>('timeline');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Time slots from 08:00 to 23:00 (16 hours)
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8 to 23

  // Filtered units
  const filteredUnits = rentableUnits.filter((u) => {
    if (selectedTypeFilter === 'All') return true;
    return u.type === selectedTypeFilter;
  });

  const selectedDateBookings = rentalBookings.filter((b) => b.startDateTime.startsWith(selectedDate));
  const selectedDateVolume = selectedDateBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const occupiedSpacesCount = new Set(selectedDateBookings.map((b) => b.unitId)).size;

  // Date navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleSlotClick = (unitId: string, hour: number) => {
    const hourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
    setModalInitialUnitId(unitId);
    setModalInitialHour(hourStr);
    setIsBookingModalOpen(true);
  };

  // Calculate block position and width safely
  const getBookingLayout = (booking: RentalBooking) => {
    const startTimePart = (booking.startDateTime?.split('T')[1] || booking.startDateTime || '08:00').slice(0, 5);
    const endTimePart = (booking.endDateTime?.split('T')[1] || booking.endDateTime || '12:00').slice(0, 5);

    const startParts = startTimePart.includes(':') ? startTimePart.split(':').map(Number) : [8, 0];
    const endParts = endTimePart.includes(':') ? endTimePart.split(':').map(Number) : [12, 0];

    const startH = (startParts[0] || 8) + (startParts[1] || 0) / 60;
    const endH = (endParts[0] || 12) + (endParts[1] || 0) / 60;

    const clampedStart = Math.max(8, Math.min(24, startH));
    const clampedEnd = Math.max(8, Math.min(24, endH));

    const leftPercent = ((clampedStart - 8) / 16) * 100;
    const widthPercent = Math.max(4, ((clampedEnd - clampedStart) / 16) * 100);

    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
            <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {t('venue_timeline_matrix_title')}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('venue_timeline_matrix_sub')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative flex-wrap">
            {/* View Mode Segmented Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setMainViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  mainViewMode === 'timeline'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                <CalendarIcon size={13} />
                <span>{language === 'ar' ? 'المخطط الزمني' : language === 'fr' ? 'Matrice Calendrier' : 'Timeline Matrix'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMainViewMode('collection')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  mainViewMode === 'collection'
                    ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                <LayoutGrid size={13} />
                <span>{language === 'ar' ? 'قائمة الحجوزات' : language === 'fr' ? 'Liste Universelle' : 'List Collection'}</span>
              </button>
            </div>

            {/* Facility Pill: Atrium 1 ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Atrium 1'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Facility Dropdown Menu */}
              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'الفروع والمرافق' : language === 'fr' ? 'Succursales & Sites' : 'Branches & Venues'}
                  </div>
                  {businesses.map((biz) => {
                    const isCurrent = biz.id === currentBusinessId;
                    const matchingBranch = branches.find((b) => b.businessId === biz.id);
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          switchBusiness(biz.id);
                          if (matchingBranch) switchBranch(matchingBranch.id);
                          setIsFacilityDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                          <span className="truncate">{biz.name}</span>
                        </div>
                        {isCurrent && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* New Booking Primary Button */}
            <AtriumButton
              type="button"
              variant="primary"
              onClick={() => {
                setModalInitialUnitId(undefined);
                setModalInitialHour(undefined);
                setIsBookingModalOpen(true);
              }}
              icon={<Plus size={16} strokeWidth={2.5} />}
            >
              {t('venue_btn_new_booking')}
            </AtriumButton>
          </div>
        </div>

        {/* Row 1: Top Metrics Pod Tray */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'المخطط الزمني وإشغال القاعات' : language === 'fr' ? 'Planning des Salles & Occupation' : 'Timeline Matrix & Facility Utilization'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {language === 'ar' ? 'متابعة الجلسات المجدولة، الساعات المحجوزة والمداخيل اليومية' : language === 'fr' ? 'Sessions programmées, créneaux occupés et recettes prévisionnelles' : 'Scheduled sessions, occupied time slots, and daily booked revenue'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tile 1: Spaces in Schedule — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'القاعات والمساحات المتاحة' : language === 'fr' ? 'Salles & Espaces Gérés' : 'Managed Venue Spaces'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    {occupiedSpacesCount} {language === 'ar' ? 'قاعة محجوزة اليوم' : 'occupied today'}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
                {rentableUnits.length}
              </div>
            </div>

            {/* Tile 2: Sessions on Date — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'حجوزات التاريخ المحدد' : language === 'fr' ? 'Sessions Programmées' : 'Booked Sessions on Date'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                    {selectedDate}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
                {selectedDateBookings.length}
              </div>
            </div>

            {/* Tile 3: DARK ESPRESSO CARD (#1F1D1B) — Day Booked Volume */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div>
                <span className="text-xs font-medium text-neutral-300">
                  {language === 'ar' ? 'حجم التعاقدات اليومي' : language === 'fr' ? 'Volume Réservé du Jour' : 'Day Booked Volume'}
                </span>
                <div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
                  <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                    {language === 'ar' ? 'مداخيل الحجوزات' : 'Chiffre d\'affaires'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-white tabular-nums font-mono">
                {formatCurrencyAmount(selectedDateVolume, 'DZD')}
              </div>
            </div>
          </div>
        </div>

        {mainViewMode === 'collection' ? (
          <VenueBookingsView hideHeader />
        ) : (
          <div className="space-y-4">
            {/* Timeline Pod Tray */}
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
              {/* Toolbar with Date Navigator & Filter Capsules */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Date Navigator */}
                <div className="flex items-center bg-white dark:bg-neutral-800 rounded-xl p-1 border border-neutral-200/80 dark:border-neutral-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} className="rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-3 py-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {t('venue_timeline_today')}
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 px-2 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleNextDay}
                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} className="rtl:rotate-180" />
                  </button>
                </div>

                {/* Filter Capsules */}
                <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-2xs overflow-x-auto max-w-full">
                  {[
                    { id: 'All' as const, label: t('venue_type_all') },
                    { id: 'Hall' as const, label: t('venue_type_hall') },
                    { id: 'Studio' as const, label: t('venue_type_studio') },
                    { id: 'Room' as const, label: t('venue_type_room') },
                    { id: 'Court' as const, label: t('venue_type_court') },
                    { id: 'Desk' as const, label: t('venue_type_desk') },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedTypeFilter(item.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        selectedTypeFilter === item.id
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Fullscreen Expand Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs ml-auto"
                  title="Fullscreen"
                >
                  <Maximize2 size={14} />
                </button>
              </div>

              {/* Timeline Gantt Grid Container */}
              <div className="bg-white dark:bg-neutral-800 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-700/80 shadow-2xs overflow-hidden">
                {/* Hours Header Row */}
                <div className="flex border-b border-[#E9EEF0] dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-neutral-800/80 sticky top-0 z-10 text-[11px] font-mono text-neutral-400">
                  <div className="w-56 sm:w-64 p-3 font-semibold text-neutral-700 dark:text-neutral-300 border-r border-[#E9EEF0] dark:border-neutral-700/80 shrink-0">
                    {t('venue_space_asset_header', language, { count: filteredUnits.length })}
                  </div>
                  <div className="flex-1 grid grid-cols-16 divide-x divide-neutral-200/50 dark:divide-neutral-700/50">
                    {HOURS.map((hour) => (
                      <div key={hour} className="py-2.5 text-center truncate">
                        {hour}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Space Rows */}
                <div className="divide-y divide-[#E9EEF0] dark:divide-neutral-700/60">
                  {filteredUnits.length === 0 ? (
                    <div className="p-8 text-center text-sm text-neutral-400">
                      {t('venue_no_spaces_filter')}
                    </div>
                  ) : (
                    filteredUnits.map((unit) => {
                      const unitBookings = rentalBookings.filter(
                        (b) => b.unitId === unit.id && b.startDateTime.startsWith(selectedDate)
                      );

                      return (
                        <div
                          key={unit.id}
                          className="flex min-h-[76px] relative group hover:bg-[#F8F9FA]/60 dark:hover:bg-neutral-700/20 transition-colors"
                        >
                          {/* Space Info Cell */}
                          <div className="w-56 sm:w-64 p-3 border-r border-[#E9EEF0] dark:border-neutral-700/80 shrink-0 flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: unit.colorHex || '#8B5CF6' }}
                              />
                              <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                                {unit.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {unit.type === 'Hall'
                                  ? t('venue_type_hall')
                                  : unit.type === 'Studio'
                                  ? t('venue_type_studio')
                                  : unit.type === 'Room'
                                  ? t('venue_type_room')
                                  : unit.type === 'Court'
                                  ? t('venue_type_court')
                                  : t('venue_type_desk')}
                              </span>
                              <span>·</span>
                              <span>{t('venue_card_capacity', language, { count: unit.capacity })}</span>
                              <span>·</span>
                              <span className="tabular-nums font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                                {formatCurrencyAmount(unit.hourlyRate, unit.currency)}
                                {t('venue_per_hour')}
                              </span>
                            </div>
                          </div>

                          {/* Horizontal Timeline Slot Grid */}
                          <div className="flex-1 relative grid grid-cols-16 divide-x divide-neutral-100 dark:divide-neutral-800/40">
                            {HOURS.map((hour) => (
                              <div
                                key={hour}
                                onClick={() => handleSlotClick(unit.id, hour)}
                                className="h-full cursor-pointer hover:bg-[#FCEEE8]/50 dark:hover:bg-neutral-700/30 transition-colors"
                                title={t('venue_slot_tooltip', language, {
                                  name: unit.name,
                                  time: `${hour}:00`,
                                })}
                              />
                            ))}

                            {/* Overlay Booking Blocks */}
                            {unitBookings.map((booking) => {
                              const layout = getBookingLayout(booking);

                              const isCheckedIn = booking.status === 'CheckedIn';
                              const isConfirmed = booking.status === 'Confirmed';
                              const isTentative = booking.status === 'Tentative';

                              return (
                                <div
                                  key={booking.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectedBooking(booking);
                                  }}
                                  style={{ left: layout.left, width: layout.width }}
                                  className={`absolute top-2 bottom-2 z-10 rounded-xl px-2.5 py-1.5 cursor-pointer shadow-xs border transition-all flex flex-col justify-center overflow-hidden ${
                                    isCheckedIn
                                      ? 'bg-purple-600/95 hover:bg-purple-600 text-white border-purple-500'
                                      : isConfirmed
                                      ? 'bg-[#C4785A]/95 hover:bg-[#C4785A] text-white border-[#b3684a]'
                                      : isTentative
                                      ? 'bg-amber-500/95 hover:bg-amber-500 text-white border-amber-400'
                                      : 'bg-neutral-700 hover:bg-neutral-800 text-white border-neutral-600'
                                  }`}
                                >
                                  <div className="font-bold text-xs truncate leading-tight">
                                    {booking.purpose}
                                  </div>
                                  <div className="text-[10px] opacity-90 truncate mt-0.5">
                                    {booking.renterName} {booking.renterCompany && `(${booking.renterCompany})`}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={modalInitialUnitId}
        initialStartTime={modalInitialHour}
      />

      {/* Booking Inspector Drawer / Modal */}
      {inspectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {inspectedBooking.purpose}
                </h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {inspectedBooking.unitName} · {inspectedBooking.startDateTime.replace('T', ' ').slice(0, 16)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedBooking(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-[#F8F9FA] dark:bg-neutral-700/40 rounded-2xl border border-[#EDF1F3] dark:border-neutral-700 space-y-2">
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
                  <span className="font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
                    {formatCurrencyAmount(inspectedBooking.totalAmount, inspectedBooking.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Caution Sécurité:</span>
                  <span className="font-semibold text-emerald-600 tabular-nums font-mono">
                    {formatCurrencyAmount(inspectedBooking.depositAmount, inspectedBooking.currency)} ({inspectedBooking.depositStatus})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
              {inspectedBooking.status === 'Confirmed' && (
                <button
                  type="button"
                  onClick={() => {
                    checkInBooking(inspectedBooking.id);
                    setInspectedBooking(null);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {t('venue_btn_checkin_guest')}
                </button>
              )}
              {inspectedBooking.status === 'CheckedIn' && (
                <button
                  type="button"
                  onClick={() => {
                    checkOutBooking(inspectedBooking.id);
                    setInspectedBooking(null);
                  }}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {t('venue_btn_checkout_space')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
