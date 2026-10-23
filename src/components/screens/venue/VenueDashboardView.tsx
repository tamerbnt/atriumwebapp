import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  DoorOpen,
  DollarSign,
  TrendingUp,
  MapPin,
  FileCheck,
  Cloud,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentalBooking } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal } from './VenueCloudSyncModal';
import { ActionNode } from '../../ui/ActionNode';

export const VenueDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBusiness,
    currentBranch,
    rentableUnits,
    rentalBookings,
    securityDeposits,
    checkInBooking,
    checkOutBooking,
    setScreen,
    resetVenueMockData,
  } = useAtriumStore();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<string | undefined>(undefined);
  const [activeBookingDetail, setActiveBookingDetail] = useState<RentalBooking | null>(null);

  // Auto-heal empty venue datasets safely once on mount if empty
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && (rentableUnits.length === 0 || rentalBookings.length === 0)) {
      hasAutoHealed.current = true;
      resetVenueMockData();
    }
  }, [rentableUnits.length, rentalBookings.length, resetVenueMockData]);

  // Today's date calculations
  const todayStr = new Date().toISOString().split('T')[0];

  // Scoped metrics
  const totalUnits = rentableUnits.length;
  const occupiedUnits = rentableUnits.filter((u) => u.status === 'Occupied').length;
  const availableUnits = rentableUnits.filter((u) => u.status === 'Available').length;
  const occupancyPercentage = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Today's bookings
  const todayBookings = rentalBookings.filter((b) => b.startDateTime.startsWith(todayStr));
  const activeCheckedIn = rentalBookings.filter((b) => b.status === 'CheckedIn');
  const confirmedUpcoming = rentalBookings.filter(
    (b) => b.status === 'Confirmed' && b.startDateTime.startsWith(todayStr)
  );

  // Active Caution Escrow
  const totalHeldCaution = securityDeposits
    .filter((d) => d.status === 'Held')
    .reduce((sum, d) => sum + d.amount, 0);

  // Today's Booked Volume
  const todayBookedVolume = todayBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const handleQuickBookUnit = (unitId: string) => {
    setSelectedUnitForBooking(unitId);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-1">
            <span>{currentBusiness?.displayName || 'Palais Algiers'}</span>
            <span>·</span>
            <span>{currentBranch?.name || 'Central Complex'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t('nav_venue_dashboard')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('venue_timeline_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetVenueMockData}
            className="px-3.5 py-2.5 bg-[#FCEEE8] dark:bg-neutral-800 hover:bg-[#F8DFD4] dark:hover:bg-neutral-700 text-[#C4785A] text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
          >
            <Sparkles size={15} />
            <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
          </button>
          <button
            onClick={() => setIsCloudSyncModalOpen(true)}
            className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            title="Inspect Supabase live tables and row writes"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud size={15} className="text-purple-600 dark:text-purple-400" />
            Supabase Cloud
          </button>
          <button
            onClick={() => setScreen('scheduler')}
            className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Calendar size={15} />
            {t('nav_venue_timeline')}
          </button>
          <button
            onClick={() => {
              setSelectedUnitForBooking(undefined);
              setIsBookingModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            {t('venue_btn_new_booking')}
          </button>
        </div>
      </div>

      {/* KPI Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_kpi_occupancy')}</span>
            <DoorOpen size={18} className="text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {occupancyPercentage}%
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {occupiedUnits} {t('venue_status_confirmed')} · {availableUnits} {t('common_all')}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_kpi_upcoming_events')}</span>
            <Calendar size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {todayBookings.length}
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {activeCheckedIn.length} {t('venue_kpi_in_use')} · {confirmedUpcoming.length} {t('venue_kpi_upcoming')}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_kpi_escrow_deposits')}</span>
            <ShieldCheck size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalHeldCaution, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {securityDeposits.filter((d) => d.status === 'Held').length} {t('venue_kpi_active_deposits')}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_kpi_booked_volume')}</span>
            <TrendingUp size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(todayBookedVolume, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {t('venue_kpi_booked_volume_sub')}
          </div>
        </div>
      </div>

      {/* Live Spaces & Room Status Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t('venue_spaces_title')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('venue_spaces_subtitle')}
            </p>
          </div>
          <button
            onClick={() => setScreen('shop')}
            className="text-xs text-[var(--color-accent)] hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            {t('venue_btn_manage_catalog')} <ArrowRight size={13} className="rtl:rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rentableUnits.map((unit) => {
            const currentBooking = rentalBookings.find(
              (b) => b.unitId === unit.id && b.status === 'CheckedIn'
            );
            const nextBooking = rentalBookings.find(
              (b) => b.unitId === unit.id && b.status === 'Confirmed' && b.startDateTime.startsWith(todayStr)
            );

            const localizedType =
              unit.type === 'Hall'
                ? t('venue_type_hall')
                : unit.type === 'Studio'
                ? t('venue_type_studio')
                : unit.type === 'Room'
                ? t('venue_type_room')
                : unit.type === 'Court'
                ? t('venue_type_court')
                : t('venue_type_desk');

            const localizedStatus =
              unit.status === 'Available'
                ? (language === 'ar' ? 'متاحة' : language === 'fr' ? 'Disponible' : 'Available')
                : unit.status === 'Occupied'
                ? t('venue_kpi_in_use')
                : (language === 'ar' ? 'صيانة' : language === 'fr' ? 'Maintenance' : 'Maintenance');

            return (
              <ActionNode
                key={unit.id}
                title={unit.name}
                description={`${unit.code} · ${localizedType} · ${t('venue_card_capacity', language, { count: unit.capacity })}${unit.surfaceAreaSqm ? ` · ${t('venue_inv_surface_unit', language, { surface: unit.surfaceAreaSqm })}` : ''}`}
                tag={localizedStatus}
                width="100%"
                air={16}
                corner={20}
                actions={[
                  {
                    id: 'book',
                    label: t('venue_reserve_space'),
                    icon: <Plus size={14} />,
                    onClick: () => handleQuickBookUnit(unit.id),
                  },
                  {
                    id: 'timeline',
                    label: t('venue_view_timeline'),
                    icon: <Calendar size={14} />,
                    onClick: () => setScreen('scheduler'),
                  },
                ]}
              >
                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700/50 text-xs">
                  {currentBooking ? (
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Users size={12} /> {currentBooking.renterName}
                      </div>
                      <div className="text-neutral-500 dark:text-neutral-400 text-[11px] truncate">
                        {currentBooking.purpose}
                      </div>
                      <div className="text-neutral-400 text-[10px] tabular-nums">
                        {t('venue_until_time', language, { time: (currentBooking.endDateTime?.split('T')[1] || currentBooking.endDateTime || '').slice(0, 5) })}
                      </div>
                    </div>
                  ) : nextBooking ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        {nextBooking.renterName}
                      </div>
                      <div className="text-neutral-400 text-[10px] tabular-nums">
                        {(nextBooking.startDateTime?.split('T')[1] || nextBooking.startDateTime || '').slice(0, 5)} - {(nextBooking.endDateTime?.split('T')[1] || nextBooking.endDateTime || '').slice(0, 5)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-neutral-400 text-[11px] italic">
                      {t('venue_available_today')}
                    </div>
                  )}

                  <div className="mt-3 pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700/50">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(unit.hourlyRate, unit.currency)}{t('venue_per_hour')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickBookUnit(unit.id)}
                      className="px-2.5 py-1 bg-[#FDF4F0] hover:bg-[#FBE5DC] text-[#C4785A] rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      {t('venue_btn_reserve')}
                    </button>
                  </div>
                </div>
              </ActionNode>
            );
          })}
        </div>
      </div>

      {/* Split Row: Today's Arrival Schedule & Caution Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t('venue_todays_arrivals')}
            </h2>
            <button
              onClick={() => setScreen('registrations')}
              className="text-xs text-[var(--color-accent)] hover:underline font-medium cursor-pointer"
            >
              {t('venue_all_reservations')}
            </button>
          </div>

          <div className="space-y-3">
            {todayBookings.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <Calendar size={28} className="mx-auto text-neutral-400 mb-2" />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('venue_no_bookings_today')}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {t('venue_no_bookings_today_sub')}
                </p>
              </div>
            ) : (
              todayBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-800/60 border border-[#E9EEF0] dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex flex-col items-center justify-center shrink-0 tabular-nums">
                      <span className="text-[10px] text-neutral-400 font-medium uppercase">
                        {(b.startDateTime?.split('T')[1] || b.startDateTime || '').slice(0, 5)}
                      </span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {b.durationHours}h
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-neutral-900 dark:text-white text-sm">
                          {b.purpose}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            b.status === 'CheckedIn'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : b.status === 'Confirmed'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {b.status === 'CheckedIn'
                            ? t('venue_kpi_in_use')
                            : b.status === 'Confirmed'
                            ? t('venue_status_confirmed')
                            : b.status === 'Tentative'
                            ? t('venue_status_tentative')
                            : t('venue_status_completed')}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{b.renterName}</span>
                        {b.renterCompany && <span>({b.renterCompany})</span>}
                        <span>·</span>
                        <span className="text-neutral-600 dark:text-neutral-400">{b.unitName}</span>
                        <span>·</span>
                        <span>{t('venue_guests_count', language, { count: b.attendeeCount })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right rtl:text-left">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCurrencyAmount(b.totalAmount, b.currency)}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {t('venue_col_caution')}: {formatCurrencyAmount(b.depositAmount, b.currency)} (
                        {b.depositStatus === 'Held'
                          ? t('venue_held_status')
                          : b.depositStatus === 'Refunded'
                          ? t('venue_refunded_status')
                          : t('venue_deducted_status')}
                        )
                      </div>
                    </div>

                    {b.status === 'Confirmed' && (
                      <button
                        onClick={() => checkInBooking(b.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        {t('venue_btn_checkin_guest')}
                      </button>
                    )}
                    {b.status === 'CheckedIn' && (
                      <button
                        onClick={() => checkOutBooking(b.id)}
                        className="px-3.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        {t('venue_btn_checkout_space')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Caution Watchlist (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t('venue_caution_watchlist')}
            </h2>
            <button
              onClick={() => setScreen('finance')}
              className="text-xs text-[var(--color-accent)] hover:underline font-medium cursor-pointer"
            >
              {t('venue_btn_caution_ledger')}
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>{t('venue_kpi_escrow_deposits')}:</span>
              <span className="font-semibold text-neutral-900 dark:text-white tabular-nums ml-auto rtl:mr-auto rtl:ml-0">
                {formatCurrencyAmount(totalHeldCaution, 'DZD')}
              </span>
            </div>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-700/60">
              {securityDeposits
                .filter((d) => d.status === 'Held')
                .slice(0, 4)
                .map((dep) => (
                  <div key={dep.id} className="py-2.5 first:pt-0 last:pb-0 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-white">{dep.renterName}</div>
                      <div className="text-[11px] text-neutral-400 truncate max-w-[180px]">{dep.unitName}</div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <div className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCurrencyAmount(dep.amount, dep.currency)}
                      </div>
                      <div className="text-[10px] text-neutral-400">{dep.paymentMethod}</div>
                    </div>
                  </div>
                ))}
            </div>

            <button
              onClick={() => setScreen('finance')}
              className="w-full py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              {t('venue_fin_btn_release')}
            </button>
          </div>
        </div>
      </div>

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={selectedUnitForBooking}
      />

      {/* Supabase Cloud Sync Diagnostics Modal */}
      <VenueCloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
      />
    </div>
  );
};
