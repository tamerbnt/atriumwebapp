import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentalRenter } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { BookingModal } from './BookingModal';

export const VenueRentersView: React.FC = () => {
  const {
    rentalRenters,
    createRentalRenter,
    updateRentalRenter,
    deleteRentalRenter,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [renterToEdit, setRenterToEdit] = useState<RentalRenter | null>(null);

  // Quick book for selected renter
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingRenterId, setBookingRenterId] = useState<string | undefined>(undefined);

  // Form State
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idDocNumber, setIdDocNumber] = useState('');
  const [notes, setNotes] = useState('');

  const filteredRenters = rentalRenters.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      (r.companyName && r.companyName.toLowerCase().includes(q)) ||
      r.phone.includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.idDocNumber && r.idDocNumber.toLowerCase().includes(q))
    );
  });

  const totalRentersCount = rentalRenters.length;
  const corporateCount = rentalRenters.filter((r) => Boolean(r.companyName)).length;
  const totalRevenue = rentalRenters.reduce((sum, r) => sum + r.totalSpent, 0);

  const handleOpenAdd = () => {
    setRenterToEdit(null);
    setFullName('');
    setCompanyName('');
    setEmail('');
    setPhone('+213 ');
    setIdDocNumber('');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (renter: RentalRenter) => {
    setRenterToEdit(renter);
    setFullName(renter.fullName);
    setCompanyName(renter.companyName || '');
    setEmail(renter.email);
    setPhone(renter.phone);
    setIdDocNumber(renter.idDocNumber || '');
    setNotes(renter.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveRenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    if (renterToEdit) {
      updateRentalRenter(renterToEdit.id, {
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        idDocNumber: idDocNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      createRentalRenter({
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@client.local`,
        phone: phone.trim(),
        idDocNumber: idDocNumber.trim() || undefined,
        currency: 'DZD',
        notes: notes.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Renters & Client Directory
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Corporate accounts, repeat event organizers, identification records & booking history
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Renter
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
            Registered Renters
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {totalRentersCount}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {corporateCount} corporate organizations
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
            Corporate Share
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {totalRentersCount > 0 ? Math.round((corporateCount / totalRentersCount) * 100) : 0}%
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Agencies, production studios & forums
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
            Lifetime Renter Value
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalRevenue, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Cumulative bookings turnover
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search renters by name, company, phone, ID number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-hidden"
        />
      </div>

      {/* Renter Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRenters.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-200 dark:border-neutral-800">
            <Users size={36} className="mx-auto text-neutral-400 mb-2" />
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              No renters found
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Add your first renter contact or organization using the button above.
            </p>
          </div>
        ) : (
          filteredRenters.map((renter) => (
            <div
              key={renter.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-800/60 border border-[#E9EEF0] dark:border-neutral-800 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-2xs"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                    {renter.fullName.charAt(0)}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">
                    {renter.idDocNumber || 'NO ID REGISTERED'}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  {renter.fullName}
                </h3>
                {renter.companyName && (
                  <div className="text-xs font-medium text-[var(--color-accent)] mt-0.5">
                    {renter.companyName}
                  </div>
                )}

                <div className="space-y-1 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-neutral-400" />
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{renter.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={13} className="text-neutral-400 shrink-0" />
                    <span className="truncate">{renter.email}</span>
                  </div>
                </div>

                {renter.notes && (
                  <p className="mt-3 text-[11px] text-neutral-400 dark:text-neutral-500 italic line-clamp-2">
                    "{renter.notes}"
                  </p>
                )}

                {/* Stats */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase">Bookings</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {renter.totalBookings} events
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase">Total Spend</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(renter.totalSpent, renter.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(renter)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    title="Edit Renter"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete renter profile for ${renter.fullName}?`)) {
                        deleteRentalRenter(renter.id);
                      }
                    }}
                    className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete Renter"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setBookingRenterId(renter.id);
                    setIsBookingModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors"
                >
                  Book Space
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Renter Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {renterToEdit ? 'Edit Renter Profile' : 'New Renter & Client Registration'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRenter} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amina Kaci"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kaci Events & Communications"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="+213 552 11 22 33"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="contact@events.dz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  National ID / Passport Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ID-DZ-9912048"
                  value={idDocNumber}
                  onChange={(e) => setIdDocNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Notes & Preferences
                </label>
                <textarea
                  rows={2}
                  placeholder="Special catering needs, preferred spaces, billing preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-xl"
                >
                  {renterToEdit ? 'Save Changes' : 'Register Renter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </div>
  );
};
