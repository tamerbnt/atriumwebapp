import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  FileText,
  Printer,
  DollarSign,
  AlertCircle,
  X,
  Cloud,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentalBooking, BookingStatus } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal } from './VenueCloudSyncModal';

export const VenueBookingsView: React.FC = () => {
  const {
    rentalBookings,
    checkInBooking,
    checkOutBooking,
    deleteRentalBooking,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<RentalBooking | null>(null);
  const [printedBooking, setPrintedBooking] = useState<RentalBooking | null>(null);

  const filteredBookings = rentalBookings.filter((b) => {
    const matchesSearch =
      b.renterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.renterCompany && b.renterCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.purpose.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'All'
        ? true
        : selectedStatus === 'InUse'
        ? b.status === 'CheckedIn'
        : b.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (b: RentalBooking) => {
    setBookingToEdit(b);
    setIsBookingModalOpen(true);
  };

  const handleNewBooking = () => {
    setBookingToEdit(null);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Reservations & Inquiries
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Complete booking pipeline, confirmed events, walk-ins, and space handovers
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
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
            onClick={handleNewBooking}
            className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Reservation
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search bookings by renter, company, space or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'All', label: 'All Bookings' },
            { id: 'InUse', label: 'In-Use / Checked In' },
            { id: 'Confirmed', label: 'Confirmed' },
            { id: 'Tentative', label: 'Inquiries / Hold' },
            { id: 'Completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedStatus === tab.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table View */}
      <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E9EEF0] dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-medium">
                <th className="py-3 px-4">Event Purpose & Renter</th>
                <th className="py-3 px-4">Space / Unit</th>
                <th className="py-3 px-4">Date & Time Window</th>
                <th className="py-3 px-4">Financials & Balance</th>
                <th className="py-3 px-4">Caution (Deposit)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-800">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No reservations found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    {/* Event & Renter */}
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div className="font-semibold text-neutral-900 dark:text-white truncate">
                        {b.purpose}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                        {b.renterName} {b.renterCompany && `· ${b.renterCompany}`}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        {b.renterPhone}
                      </div>
                    </td>

                    {/* Space */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-neutral-900 dark:text-white">
                        {b.unitName}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {b.unitType} · {b.attendeeCount} guests
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-neutral-900 dark:text-white">
                        {b.startDateTime.split('T')[0]}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {b.startDateTime.split('T')[1]?.slice(0, 5)} - {b.endDateTime.split('T')[1]?.slice(0, 5)} ({b.durationHours}h)
                      </div>
                    </td>

                    {/* Financials */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCurrencyAmount(b.totalAmount, b.currency)}
                      </div>
                      <div className="text-[11px]">
                        {b.balanceDue > 0 ? (
                          <span className="text-amber-600 font-medium tabular-nums">
                            Due: {formatCurrencyAmount(b.balanceDue, b.currency)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Fully Settled</span>
                        )}
                      </div>
                    </td>

                    {/* Caution */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {formatCurrencyAmount(b.depositAmount, b.currency)}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                          b.depositStatus === 'Held'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : b.depositStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {b.depositStatus}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          b.status === 'CheckedIn'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            : b.status === 'Confirmed'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : b.status === 'Tentative'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {b.status === 'CheckedIn' ? 'In-Use' : b.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'Confirmed' && (
                          <button
                            onClick={() => checkInBooking(b.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-medium transition-colors"
                          >
                            Check In
                          </button>
                        )}
                        {b.status === 'CheckedIn' && (
                          <button
                            onClick={() => checkOutBooking(b.id)}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-[11px] font-medium transition-colors"
                          >
                            Check Out
                          </button>
                        )}

                        <button
                          onClick={() => setPrintedBooking(b)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Print Rental Voucher / Agreement"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(b)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Edit Booking"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Cancel reservation for ${b.renterName}?`)) {
                              deleteRentalBooking(b.id);
                            }
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Cancel Reservation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Rental Voucher Modal */}
      {printedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Official Rental Voucher & Handover Pass
                </h3>
                <span className="text-xs font-mono text-neutral-400">
                  Ref: {printedBooking.id}
                </span>
              </div>
              <button
                onClick={() => setPrintedBooking(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Renter Name:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{printedBooking.renterName}</span>
                </div>
                {printedBooking.renterCompany && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Company:</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{printedBooking.renterCompany}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">Contact Phone:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">{printedBooking.renterPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Reserved Space:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{printedBooking.unitName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Reservation Window:</span>
                  <span className="font-mono text-neutral-900 dark:text-white">
                    {printedBooking.startDateTime.replace('T', ' ').slice(0, 16)} - {printedBooking.endDateTime.split('T')[1]?.slice(0, 5)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="flex justify-between font-semibold text-neutral-900 dark:text-white">
                  <span>Total Space Hire:</span>
                  <span className="tabular-nums">{formatCurrencyAmount(printedBooking.totalAmount, printedBooking.currency)}</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Security Caution Held:</span>
                  <span className="font-medium text-emerald-600 tabular-nums">
                    {formatCurrencyAmount(printedBooking.depositAmount, printedBooking.currency)} ({printedBooking.depositStatus})
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Balance Due:</span>
                  <span className="font-medium tabular-nums">{formatCurrencyAmount(printedBooking.balanceDue, printedBooking.currency)}</span>
                </div>
              </div>

              <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                By presenting this voucher, the renter certifies having accepted venue regulations, agreed to inspection upon room return, and authorized security deposit retention in case of property damages.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Agreement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        bookingToEdit={bookingToEdit}
      />

      {/* Supabase Cloud Verification Modal */}
      <VenueCloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
      />
    </div>
  );
};
