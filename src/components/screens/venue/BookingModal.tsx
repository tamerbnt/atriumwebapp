import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  ShieldCheck,
  Plus,
  Trash2,
  DollarSign,
  FileCheck,
  Check,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentalBooking, BookingAddon, BookingStatus, DepositStatus } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { LabelInput } from '../../ui/LabelInput';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingToEdit?: RentalBooking | null;
  initialUnitId?: string;
  initialDate?: string;
  initialStartTime?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  bookingToEdit,
  initialUnitId,
  initialDate,
  initialStartTime,
}) => {
  const {
    rentableUnits,
    rentalRenters,
    createRentalBooking,
    updateRentalBooking,
    createRentalRenter,
    showToast,
  } = useAtriumStore();

  const todayStr = initialDate || new Date().toISOString().split('T')[0];
  const startHourStr = initialStartTime || '14:00';

  // Form State
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    initialUnitId || rentableUnits[0]?.id || ''
  );
  const [selectedRenterId, setSelectedRenterId] = useState<string>('');
  const [renterName, setRenterName] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [renterEmail, setRenterEmail] = useState('');
  const [renterCompany, setRenterCompany] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(startHourStr);
  const [endTime, setEndTime] = useState('18:00');
  const [durationHours, setDurationHours] = useState(4);
  const [attendeeCount, setAttendeeCount] = useState(25);
  const [status, setStatus] = useState<BookingStatus>('Confirmed');
  const [contractSigned, setContractSigned] = useState(true);
  const [depositAmount, setDepositAmount] = useState<number>(20000);
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('Held');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Addons State
  const [addons, setAddons] = useState<BookingAddon[]>([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState<number>(5000);

  // Sync unit when initialUnitId changes
  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  // Sync when bookingToEdit is passed
  useEffect(() => {
    if (bookingToEdit) {
      setSelectedUnitId(bookingToEdit.unitId);
      setSelectedRenterId(bookingToEdit.renterId);
      setRenterName(bookingToEdit.renterName);
      setRenterPhone(bookingToEdit.renterPhone);
      setRenterEmail(bookingToEdit.renterEmail || '');
      setRenterCompany(bookingToEdit.renterCompany || '');
      setPurpose(bookingToEdit.purpose);
      
      const sDate = bookingToEdit.startDateTime.split('T')[0];
      const sTime = bookingToEdit.startDateTime.split('T')[1]?.slice(0, 5) || '14:00';
      const eTime = bookingToEdit.endDateTime.split('T')[1]?.slice(0, 5) || '18:00';
      
      setStartDate(sDate);
      setStartTime(sTime);
      setEndTime(eTime);
      setDurationHours(bookingToEdit.durationHours);
      setAttendeeCount(bookingToEdit.attendeeCount);
      setStatus(bookingToEdit.status);
      setContractSigned(bookingToEdit.contractSigned);
      setDepositAmount(bookingToEdit.depositAmount);
      setDepositStatus(bookingToEdit.depositStatus);
      setPaidAmount(bookingToEdit.paidAmount);
      setNotes(bookingToEdit.notes || '');
      setAddons(bookingToEdit.addons || []);
    } else {
      // Default reset
      if (rentableUnits.length > 0 && !initialUnitId) {
        setSelectedUnitId(rentableUnits[0].id);
      }
      setRenterName('');
      setRenterPhone('');
      setRenterEmail('');
      setRenterCompany('');
      setPurpose('');
      setStartDate(initialDate || new Date().toISOString().split('T')[0]);
      setStartTime(initialStartTime || '14:00');
      setEndTime('18:00');
      setDurationHours(4);
      setAttendeeCount(20);
      setStatus('Confirmed');
      setContractSigned(true);
      setDepositAmount(20000);
      setDepositStatus('Held');
      setPaidAmount(0);
      setNotes('');
      setAddons([]);
    }
  }, [bookingToEdit, isOpen]);

  // Auto-fill renter fields when existing renter selected
  const handleSelectRenter = (renterId: string) => {
    setSelectedRenterId(renterId);
    const renter = rentalRenters.find((r) => r.id === renterId);
    if (renter) {
      setRenterName(renter.fullName);
      setRenterPhone(renter.phone);
      setRenterEmail(renter.email);
      setRenterCompany(renter.companyName || '');
    }
  };

  const selectedUnit = rentableUnits.find((u) => u.id === selectedUnitId) || rentableUnits[0];

  // Duration auto-calc when times change
  useEffect(() => {
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    if (!isNaN(sH) && !isNaN(eH)) {
      const diffMinutes = eH * 60 + (eM || 0) - (sH * 60 + (sM || 0));
      if (diffMinutes > 0) {
        setDurationHours(Math.max(1, Math.round(diffMinutes / 60)));
      }
    }
  }, [startTime, endTime]);

  // Pricing calculations
  const hourlyRate = selectedUnit?.hourlyRate || 5000;
  const baseAmount = durationHours >= 8 && selectedUnit?.dailyRate
    ? selectedUnit.dailyRate
    : hourlyRate * durationHours;

  const addonsTotal = addons.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = baseAmount + addonsTotal;
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  const handleAddAddon = () => {
    if (!newAddonName.trim() || newAddonPrice <= 0) return;
    const item: BookingAddon = {
      id: `add_${Date.now()}`,
      name: newAddonName.trim(),
      unitPrice: newAddonPrice,
      quantity: 1,
      totalPrice: newAddonPrice,
    };
    setAddons([...addons, item]);
    setNewAddonName('');
    setNewAddonPrice(5000);
  };

  const handleRemoveAddon = (id: string) => {
    setAddons(addons.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renterName.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Renter Name',
        message: 'Please provide the client name or organization for this reservation.',
      });
      return;
    }
    if (!purpose.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Event Purpose',
        message: 'Please describe the event or rental purpose.',
      });
      return;
    }
    if (!selectedUnit) {
      showToast({
        type: 'warning',
        title: 'No Space Selected',
        message: 'Please pick an available room, hall, or court.',
      });
      return;
    }

    let targetRenterId = selectedRenterId;
    if (!targetRenterId) {
      // Create new renter profile automatically
      const newRenter = createRentalRenter({
        fullName: renterName.trim(),
        companyName: renterCompany.trim() || undefined,
        email: renterEmail.trim() || `${renterName.toLowerCase().replace(/\s+/g, '.')}@client.local`,
        phone: renterPhone.trim() || '+213 550 00 00 00',
        currency: selectedUnit.currency || 'DZD',
      });
      targetRenterId = newRenter.id;
    }

    const startDateTime = `${startDate}T${startTime}:00Z`;
    const endDateTime = `${startDate}T${endTime}:00Z`;

    if (bookingToEdit) {
      updateRentalBooking(bookingToEdit.id, {
        unitId: selectedUnit.id,
        unitName: selectedUnit.name,
        unitType: selectedUnit.type,
        renterId: targetRenterId,
        renterName: renterName.trim(),
        renterPhone: renterPhone.trim(),
        renterEmail: renterEmail.trim() || undefined,
        renterCompany: renterCompany.trim() || undefined,
        purpose: purpose.trim(),
        startDateTime,
        endDateTime,
        durationHours,
        attendeeCount,
        status,
        baseAmount,
        addonsAmount: addonsTotal,
        totalAmount,
        currency: selectedUnit.currency,
        depositAmount,
        depositStatus,
        paidAmount,
        balanceDue,
        addons,
        contractSigned,
        notes: notes.trim() || undefined,
      });
    } else {
      createRentalBooking({
        renterId: targetRenterId,
        renterName: renterName.trim(),
        renterPhone: renterPhone.trim(),
        renterEmail: renterEmail.trim() || undefined,
        renterCompany: renterCompany.trim() || undefined,
        unitId: selectedUnit.id,
        unitName: selectedUnit.name,
        unitType: selectedUnit.type,
        purpose: purpose.trim(),
        startDateTime,
        endDateTime,
        durationHours,
        attendeeCount,
        status,
        baseAmount,
        addonsAmount: addonsTotal,
        totalAmount,
        currency: selectedUnit.currency,
        depositAmount,
        depositStatus,
        paidAmount,
        balanceDue,
        addons,
        contractSigned,
        notes: notes.trim() || undefined,
      });
    }

    showToast({
      type: 'success',
      title: bookingToEdit ? 'Reservation Updated' : 'Venue Reserved',
      message: `${selectedUnit.name} reserved for ${renterName.trim()} (${startDate}).`,
      category: 'rental_booking',
      action: {
        label: 'Contract',
        onClick: () => window.print?.(),
      },
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E9EEF0] dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {bookingToEdit ? 'Edit Reservation' : 'New Venue & Space Reservation'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Configure room schedule, renter details, add-on equipment, and security deposit
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Space & Time */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              1. Space & Date Selection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Bookable Space / Asset
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:border-[var(--color-accent)]"
                  required
                >
                  {rentableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.type} · Cap: {u.capacity} · {formatCurrencyAmount(u.hourlyRate, u.currency)}/h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Reservation Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:border-[var(--color-accent)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:border-[var(--color-accent)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  End Time (Est. Duration: {durationHours}h)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:border-[var(--color-accent)]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Renter & Event Details */}
          <div className="space-y-4 pt-4 border-t border-[#E9EEF0] dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              2. Renter & Event Purpose
            </h3>

            {rentalRenters.length > 0 && !bookingToEdit && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Pick Existing Renter (or type a new one below)
                </label>
                <select
                  value={selectedRenterId}
                  onChange={(e) => handleSelectRenter(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-800 dark:text-neutral-200"
                >
                  <option value="">-- Add New Renter / Walk-in --</option>
                  {rentalRenters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} {r.companyName ? `(${r.companyName})` : ''} · {r.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelInput
                field="Renter Full Name"
                label="Renter Full Name *"
                value={renterName}
                onChange={setRenterName}
                width="100%"
                height={44}
                corner={14}
                required
              />

              <LabelInput
                field="Company"
                label="Company / Organization"
                value={renterCompany}
                onChange={setRenterCompany}
                width="100%"
                height={44}
                corner={14}
              />

              <LabelInput
                field="Phone Number"
                label="Phone Number *"
                type="tel"
                value={renterPhone}
                onChange={setRenterPhone}
                width="100%"
                height={44}
                corner={14}
                required
              />

              <LabelInput
                field="Email Address"
                label="Email Address"
                type="email"
                value={renterEmail}
                onChange={setRenterEmail}
                width="100%"
                height={44}
                corner={14}
              />

              <div className="md:col-span-2">
                <LabelInput
                  field="Event Title"
                  label="Event Title / Booking Purpose *"
                  value={purpose}
                  onChange={setPurpose}
                  width="100%"
                  height={44}
                  corner={14}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Expected Attendees
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedUnit?.capacity ? selectedUnit.capacity + 50 : 500}
                  value={attendeeCount}
                  onChange={(e) => setAttendeeCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:border-[var(--color-accent)]"
                />
                {selectedUnit?.capacity && attendeeCount > selectedUnit.capacity && (
                  <p className="text-[11px] text-amber-500 mt-1">
                    Exceeds nominal space capacity ({selectedUnit.capacity} max).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Reservation Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BookingStatus)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:border-[var(--color-accent)]"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="CheckedIn">Checked In / In-Use</option>
                  <option value="Tentative">Tentative / Inquiry</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Add-on Equipment & Services */}
          <div className="space-y-4 pt-4 border-t border-[#E9EEF0] dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              3. Add-on Equipment & Services (Upsells)
            </h3>

            {addons.length > 0 && (
              <div className="space-y-2">
                {addons.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700/60 text-xs"
                  >
                    <div>
                      <span className="font-medium text-neutral-900 dark:text-white">{a.name}</span>
                      <span className="text-neutral-500 dark:text-neutral-400 ml-2">
                        {formatCurrencyAmount(a.unitPrice, selectedUnit?.currency)} × {a.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCurrencyAmount(a.totalPrice, selectedUnit?.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(a.id)}
                        className="text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. 4K Projector / AV Technician / Coffee Catering"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-hidden"
              />
              <input
                type="number"
                placeholder="Price"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(Number(e.target.value))}
                className="w-28 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-hidden tabular-nums"
              />
              <button
                type="button"
                onClick={handleAddAddon}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} /> Add Option
              </button>
            </div>
          </div>

          {/* Section 4: Caution, Security Deposit & Financials */}
          <div className="space-y-4 pt-4 border-t border-[#E9EEF0] dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              4. Security Deposit & Financial Settlement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Security Deposit (Caution)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Caution Escrow Status
                </label>
                <select
                  value={depositStatus}
                  onChange={(e) => setDepositStatus(e.target.value as DepositStatus)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden"
                >
                  <option value="Held">Held (Collected)</option>
                  <option value="Pending">Pending (Not Collected)</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Retained">Retained for Damages</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Amount Paid So Far
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-hidden tabular-nums"
                />
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Space Rental ({durationHours} hours):</span>
                <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrencyAmount(baseAmount, selectedUnit?.currency)}
                </span>
              </div>
              {addonsTotal > 0 && (
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Add-on Equipment & Services:</span>
                  <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                    +{formatCurrencyAmount(addonsTotal, selectedUnit?.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-neutral-900 dark:text-white pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span>Total Booking Amount:</span>
                <span className="text-sm tabular-nums">
                  {formatCurrencyAmount(totalAmount, selectedUnit?.currency)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400 text-[11px]">
                <span>Remaining Balance Due:</span>
                <span className={`font-semibold tabular-nums ${balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrencyAmount(balanceDue, selectedUnit?.currency)}
                </span>
              </div>
            </div>

            {/* Contract Signed Checkbox */}
            <label className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={contractSigned}
                onChange={(e) => setContractSigned(e.target.checked)}
                className="w-4 h-4 rounded-md border-neutral-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span>Rental Terms & Liability Agreement Signed by Renter</span>
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E9EEF0] dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check size={15} />
            {bookingToEdit ? 'Save Changes' : 'Confirm & Book Space'}
          </button>
        </div>
      </div>
    </div>
  );
};
