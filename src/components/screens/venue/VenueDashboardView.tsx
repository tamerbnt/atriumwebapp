import React, { useState } from 'react';
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
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal } from './VenueCloudSyncModal';
import { ActionNode } from '../../ui/ActionNode';

export const VenueDashboardView: React.FC = () => {
  const {
    currentBusiness,
    currentBranch,
    rentableUnits,
    rentalBookings,
    securityDeposits,
    checkInBooking,
    checkOutBooking,
    setScreen,
  } = useAtriumStore();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<string | undefined>(undefined);
  const [activeBookingDetail, setActiveBookingDetail] = useState<RentalBooking | null>(null);

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
            Venue & Space Operations
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Live occupancy matrix, arrival check-ins, security caution escrow & space turnover
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCloudSyncModalOpen(true)}
            className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-xl transition-colors flex items-center gap-2"
            title="Inspect Supabase live tables and row writes"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud size={15} className="text-purple-600 dark:text-purple-400" />
            Supabase Cloud
          </button>
          <button
            onClick={() => setScreen('scheduler')}
            className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 rounded-xl transition-colors flex items-center gap-2"
          >
            <Calendar size={15} />
            Occupancy Matrix
          </button>
          <button
            onClick={() => {
              setSelectedUnitForBooking(undefined);
              setIsBookingModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Reserve Space
          </button>
        </div>
      </div>

      {/* KPI Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Live Space Occupancy</span>
            <DoorOpen size={18} className="text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {occupancyPercentage}%
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {occupiedUnits} occupied · {availableUnits} vacant of {totalUnits} units
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Today's Arrivals</span>
            <Calendar size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {todayBookings.length}
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {activeCheckedIn.length} in-use · {confirmedUpcoming.length} upcoming
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Security Caution Escrow</span>
            <ShieldCheck size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalHeldCaution, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {securityDeposits.filter((d) => d.status === 'Held').length} active deposits held
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Today's Booked Volume</span>
            <TrendingUp size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(todayBookedVolume, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Space hire + equipment add-ons
          </div>
        </div>
      </div>

      {/* Live Spaces & Room Status Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Live Spaces & Asset Status
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Current real-time state of halls, studios, courts, and private suites
            </p>
          </div>
          <button
            onClick={() => setScreen('shop')}
            className="text-xs text-[var(--color-accent)] hover:underline font-medium flex items-center gap-1"
          >
            Manage Catalog <ArrowRight size={13} />
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

            return (
              <ActionNode
                key={unit.id}
                title={unit.name}
                description={`${unit.code} · ${unit.type} · Cap: ${unit.capacity} pers${unit.surfaceAreaSqm ? ` · ${unit.surfaceAreaSqm} m²` : ''}`}
                tag={unit.status}
                width="100%"
                air={16}
                corner={20}
                actions={[
                  {
                    id: 'book',
                    label: 'Reserve Space',
                    icon: <Plus size={14} />,
                    onClick: () => handleQuickBookUnit(unit.id),
                  },
                  {
                    id: 'timeline',
                    label: 'View Timeline',
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
                        Until {currentBooking.endDateTime.split('T')[1]?.slice(0, 5)}
                      </div>
                    </div>
                  ) : nextBooking ? (
                    <div className="space-y-1">
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        Next: {nextBooking.renterName}
                      </div>
                      <div className="text-neutral-400 text-[10px] tabular-nums">
                        {nextBooking.startDateTime.split('T')[1]?.slice(0, 5)} - {nextBooking.endDateTime.split('T')[1]?.slice(0, 5)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-neutral-400 text-[11px] italic">
                      Available for booking today
                    </div>
                  )}

                  <div className="mt-3 pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700/50">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(unit.hourlyRate, unit.currency)}/h
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickBookUnit(unit.id)}
                      className="px-2.5 py-1 bg-[#FDF4F0] hover:bg-[#FBE5DC] text-[#C4785A] rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Reserve
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
              Today's Schedule & Arrivals
            </h2>
            <button
              onClick={() => setScreen('registrations')}
              className="text-xs text-[var(--color-accent)] hover:underline font-medium"
            >
              All Reservations
            </button>
          </div>

          <div className="space-y-3">
            {todayBookings.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <Calendar size={28} className="mx-auto text-neutral-400 mb-2" />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  No bookings scheduled for today
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Click 'Reserve Space' above to log an event or walk-in session.
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
                        {b.startDateTime.split('T')[1]?.slice(0, 5)}
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
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{b.renterName}</span>
                        {b.renterCompany && <span>({b.renterCompany})</span>}
                        <span>·</span>
                        <span className="text-neutral-600 dark:text-neutral-400">{b.unitName}</span>
                        <span>·</span>
                        <span>{b.attendeeCount} guests</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCurrencyAmount(b.totalAmount, b.currency)}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Deposit: {formatCurrencyAmount(b.depositAmount, b.currency)} ({b.depositStatus})
                      </div>
                    </div>

                    {b.status === 'Confirmed' && (
                      <button
                        onClick={() => checkInBooking(b.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors"
                      >
                        Check In
                      </button>
                    )}
                    {b.status === 'CheckedIn' && (
                      <button
                        onClick={() => checkOutBooking(b.id)}
                        className="px-3.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-medium transition-colors"
                      >
                        Check Out
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
              Caution Watchlist
            </h2>
            <button
              onClick={() => setScreen('finance')}
              className="text-xs text-[var(--color-accent)] hover:underline font-medium"
            >
              Caution Ledger
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Deposits in Escrow:</span>
              <span className="font-semibold text-neutral-900 dark:text-white tabular-nums ml-auto">
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
                    <div className="text-right">
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
              className="w-full py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              Inspect & Release Deposits
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
