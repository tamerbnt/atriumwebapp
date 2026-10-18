import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentalBooking, RentableUnitType } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { BookingModal } from './BookingModal';

export const VenueTimelineView: React.FC = () => {
  const {
    rentableUnits,
    rentalBookings,
    checkInBooking,
    checkOutBooking,
    deleteRentalBooking,
  } = useAtriumStore();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | RentableUnitType>('All');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [modalInitialUnitId, setModalInitialUnitId] = useState<string | undefined>(undefined);
  const [modalInitialHour, setModalInitialHour] = useState<string | undefined>(undefined);
  const [inspectedBooking, setInspectedBooking] = useState<RentalBooking | null>(null);

  // Time slots from 08:00 to 23:00 (15 hours)
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8 to 23

  // Filtered units
  const filteredUnits = rentableUnits.filter((u) => {
    if (selectedTypeFilter === 'All') return true;
    return u.type === selectedTypeFilter;
  });

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

  // Calculate block position and width
  const getBookingLayout = (booking: RentalBooking) => {
    const startParts = booking.startDateTime.split('T')[1]?.slice(0, 5).split(':').map(Number);
    const endParts = booking.endDateTime.split('T')[1]?.slice(0, 5).split(':').map(Number);

    const startH = (startParts[0] || 8) + (startParts[1] || 0) / 60;
    const endH = (endParts[0] || 12) + (endParts[1] || 0) / 60;

    const clampedStart = Math.max(8, Math.min(24, startH));
    const clampedEnd = Math.max(8, Math.min(24, endH));

    const leftPercent = ((clampedStart - 8) / 16) * 100;
    const widthPercent = Math.max(4, ((clampedEnd - clampedStart) / 16) * 100);

    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Occupancy Matrix & Timeline
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Horizontal scheduling grid of spaces, studios, courts & asset reservations
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Navigator */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={handlePrevDay}
              className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Today
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-neutral-800 dark:text-neutral-200 px-2 focus:outline-hidden"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => {
              setModalInitialUnitId(undefined);
              setModalInitialHour(undefined);
              setIsBookingModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Booking
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {(['All', 'Hall', 'Studio', 'Room', 'Court', 'Desk'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedTypeFilter(type)}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedTypeFilter === type
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {type === 'All' ? 'All Spaces' : `${type}s`}
          </button>
        ))}
      </div>

      {/* Timeline Gantt Grid Container */}
      <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        {/* Hours Header Row */}
        <div className="flex border-b border-[#E9EEF0] dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/80 sticky top-0 z-10 text-[11px] font-mono text-neutral-400">
          <div className="w-56 sm:w-64 p-3 font-semibold text-neutral-700 dark:text-neutral-300 border-r border-[#E9EEF0] dark:border-neutral-800 shrink-0">
            Space / Asset ({filteredUnits.length})
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
        <div className="divide-y divide-[#E9EEF0] dark:divide-neutral-800">
          {filteredUnits.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No spaces found matching this filter.
            </div>
          ) : (
            filteredUnits.map((unit) => {
              const unitBookings = rentalBookings.filter(
                (b) => b.unitId === unit.id && b.startDateTime.startsWith(selectedDate)
              );

              return (
                <div key={unit.id} className="flex min-h-[76px] relative group hover:bg-neutral-50/40 dark:hover:bg-neutral-800/20 transition-colors">
                  {/* Space Info Cell */}
                  <div className="w-56 sm:w-64 p-3 border-r border-[#E9EEF0] dark:border-neutral-800 shrink-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: unit.colorHex || '#8B5CF6' }}
                      />
                      <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                        {unit.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                      <span>{unit.type}</span>
                      <span>·</span>
                      <span>Cap: {unit.capacity}</span>
                      <span>·</span>
                      <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
                        {formatCurrencyAmount(unit.hourlyRate, unit.currency)}/h
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Timeline Slot Grid */}
                  <div className="flex-1 relative grid grid-cols-16 divide-x divide-neutral-100 dark:divide-neutral-800/40">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        onClick={() => handleSlotClick(unit.id, hour)}
                        className="h-full cursor-pointer hover:bg-amber-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                        title={`Click to reserve ${unit.name} at ${hour}:00`}
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
                              ? 'bg-purple-600/90 hover:bg-purple-600 text-white border-purple-500'
                              : isConfirmed
                              ? 'bg-blue-600/90 hover:bg-blue-600 text-white border-blue-500'
                              : isTentative
                              ? 'bg-amber-500/90 hover:bg-amber-500 text-white border-amber-400'
                              : 'bg-neutral-700 hover:bg-neutral-800 text-white border-neutral-600'
                          }`}
                        >
                          <div className="font-semibold text-xs truncate">
                            {booking.purpose}
                          </div>
                          <div className="text-[10px] opacity-90 truncate flex items-center gap-1.5">
                            <span>{booking.renterName}</span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {booking.startDateTime.split('T')[1]?.slice(0, 5)} - {booking.endDateTime.split('T')[1]?.slice(0, 5)}
                            </span>
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

      {/* Booking Detail Inspector Drawer / Modal */}
      {inspectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#E9EEF0] dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  Reservation {inspectedBooking.id}
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                  {inspectedBooking.purpose}
                </h3>
              </div>
              <button
                onClick={() => setInspectedBooking(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Space Reserved:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{inspectedBooking.unitName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Renter:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {inspectedBooking.renterName} {inspectedBooking.renterCompany && `(${inspectedBooking.renterCompany})`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Phone:</span>
                <span className="font-mono text-neutral-900 dark:text-white">{inspectedBooking.renterPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Time Window:</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-white">
                  {inspectedBooking.startDateTime.replace('T', ' ').slice(0, 16)} ➔ {inspectedBooking.endDateTime.split('T')[1]?.slice(0, 5)} ({inspectedBooking.durationHours}h)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Total Price:</span>
                <span className="font-bold text-sm text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrencyAmount(inspectedBooking.totalAmount, inspectedBooking.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Caution (Deposit):</span>
                <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrencyAmount(inspectedBooking.depositAmount, inspectedBooking.currency)} ({inspectedBooking.depositStatus})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Contract Signed:</span>
                <span className={`font-semibold ${inspectedBooking.contractSigned ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {inspectedBooking.contractSigned ? 'Yes · Signed' : 'Pending Signature'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {inspectedBooking.status === 'Confirmed' && (
                <button
                  onClick={() => {
                    checkInBooking(inspectedBooking.id);
                    setInspectedBooking(null);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Check In Guest
                </button>
              )}
              {inspectedBooking.status === 'CheckedIn' && (
                <button
                  onClick={() => {
                    checkOutBooking(inspectedBooking.id);
                    setInspectedBooking(null);
                  }}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Check Out & Return Space
                </button>
              )}
              <button
                onClick={() => {
                  deleteRentalBooking(inspectedBooking.id);
                  setInspectedBooking(null);
                }}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={modalInitialUnitId}
        initialDate={selectedDate}
        initialStartTime={modalInitialHour}
      />
    </div>
  );
};
