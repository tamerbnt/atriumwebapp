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
import { useTranslation } from '../../../utils/useTranslation';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingToEdit?: RentalBooking | null;
  initialUnitId?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialRenterId?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  bookingToEdit,
  initialUnitId,
  initialDate,
  initialStartTime,
  initialRenterId,
}) => {
  const { t, language } = useTranslation();
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

  // Sync renter when initialRenterId changes
  useEffect(() => {
    if (initialRenterId) {
      setSelectedRenterId(initialRenterId);
      const r = rentalRenters.find((item) => item.id === initialRenterId);
      if (r) {
        setRenterName(r.fullName);
        setRenterPhone(r.phone);
        setRenterEmail(r.email || '');
        setRenterCompany(r.companyName || '');
      }
    }
  }, [initialRenterId, rentalRenters]);

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
        title: language === 'ar' ? 'اسم المستأجر مفقود' : language === 'fr' ? 'Nom du locataire manquant' : 'Missing Renter Name',
        message: language === 'ar' ? 'يرجى تقديم اسم الزبون أو الهيئة المستأجرة.' : language === 'fr' ? 'Veuillez renseigner le nom du client ou de l\'organisation.' : 'Please provide the client name or organization for this reservation.',
      });
      return;
    }
    if (!purpose.trim()) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'طبيعة المناسبة مفقودة' : language === 'fr' ? 'Motif de l\'événement manquant' : 'Missing Event Purpose',
        message: language === 'ar' ? 'يرجى وصف طبيعة النشاط أو الفعالية.' : language === 'fr' ? 'Veuillez préciser la nature de la réservation.' : 'Please describe the event or rental purpose.',
      });
      return;
    }
    if (!selectedUnit) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'لم يتم اختيار فضاء' : language === 'fr' ? 'Aucun espace sélectionné' : 'No Space Selected',
        message: language === 'ar' ? 'يرجى اختيار قاعة أو فضاء متاح.' : language === 'fr' ? 'Veuillez choisir une salle ou un espace disponible.' : 'Please pick an available room, hall, or court.',
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
      title: bookingToEdit
        ? (language === 'ar' ? 'تم تحديث الحجز' : language === 'fr' ? 'Réservation mise à jour' : 'Reservation Updated')
        : (language === 'ar' ? 'تم تأكيد حجز الفضاء' : language === 'fr' ? 'Espace réservé avec succès' : 'Venue Reserved'),
      message: language === 'ar'
        ? `تم حجز ${selectedUnit.name} لصالح ${renterName.trim()} (${startDate}).`
        : language === 'fr'
        ? `${selectedUnit.name} réservé pour ${renterName.trim()} (${startDate}).`
        : `${selectedUnit.name} reserved for ${renterName.trim()} (${startDate}).`,
      category: 'rental_booking',
      action: {
        label: language === 'ar' ? 'طباعة العقد' : language === 'fr' ? 'Imprimer Contrat' : 'Print Agreement',
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
              {bookingToEdit ? t('venue_modal_edit_title') : t('venue_modal_new_title')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('venue_modal_sub')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Space & Time */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              {t('venue_modal_sec_space')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabelSelect
                  field="BookableSpace"
                  label={t('venue_modal_field_space')}
                  value={selectedUnitId}
                  onChange={(val) => setSelectedUnitId(val?.target?.value ?? String(val))}
                  options={rentableUnits.map((u) => ({
                    value: u.id,
                    label: u.name,
                    sublabel: `${u.type} · Cap: ${u.capacity} · ${formatCurrencyAmount(u.hourlyRate, u.currency)}/h`,
                  }))}
                  searchable
                  width="100%"
                  height={40}
                  corner={12}
                  required
                />
              </div>

              <LabelInput
                id="booking-start-date"
                label={t('venue_modal_field_date')}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />

              <LabelInput
                id="booking-start-time"
                label={t('venue_modal_field_start_time')}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />

              <LabelInput
                id="booking-end-time"
                label={`${t('venue_modal_field_end_time')} (${t('venue_modal_duration_label', { hours: durationHours })})`}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Section 2: Renter & Event Details */}
          <div className="space-y-4 pt-4 border-t border-[#E9EEF0] dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              {t('venue_modal_sec_renter')}
            </h3>

            {rentalRenters.length > 0 && !bookingToEdit && (
              <div>
                <LabelSelect
                  field="ExistingRenter"
                  label={t('venue_modal_select_existing')}
                  value={selectedRenterId}
                  onChange={(val) => handleSelectRenter(val?.target?.value ?? String(val))}
                  options={[
                    { value: '', label: t('venue_modal_renter_walkin_opt') },
                    ...rentalRenters.map((r) => ({
                      value: r.id,
                      label: `${r.fullName} ${r.companyName ? `(${r.companyName})` : ''}`,
                      sublabel: r.phone,
                    })),
                  ]}
                  searchable
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelInput
                field="Renter Full Name"
                label={t('venue_modal_field_renter_name')}
                value={renterName}
                onChange={setRenterName}
                width="100%"
                height={40}
                corner={12}
                required
              />

              <LabelInput
                field="Company"
                label={t('venue_modal_field_renter_company')}
                value={renterCompany}
                onChange={setRenterCompany}
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                field="Phone Number"
                label={t('venue_modal_field_renter_phone')}
                type="tel"
                value={renterPhone}
                onChange={setRenterPhone}
                width="100%"
                height={40}
                corner={12}
                required
              />

              <LabelInput
                field="Email Address"
                label={t('venue_modal_field_renter_email')}
                type="email"
                value={renterEmail}
                onChange={setRenterEmail}
                width="100%"
                height={40}
                corner={12}
              />

              <div className="md:col-span-2">
                <LabelInput
                  field="Event Title"
                  label={t('venue_modal_field_purpose')}
                  placeholder={t('venue_modal_field_purpose_ph')}
                  value={purpose}
                  onChange={setPurpose}
                  width="100%"
                  height={44}
                  corner={14}
                  required
                />
              </div>

              <div>
                <LabelInput
                  id="booking-attendees"
                  label={t('venue_modal_field_attendees')}
                  type="number"
                  min="1"
                  max={selectedUnit?.capacity ? selectedUnit.capacity + 50 : 500}
                  value={attendeeCount}
                  onChange={(e) => setAttendeeCount(Number(e.target.value))}
                />
                {selectedUnit?.capacity && attendeeCount > selectedUnit.capacity && (
                  <p className="text-[11px] text-amber-500 mt-1">
                    Exceeds nominal space capacity ({selectedUnit.capacity} max).
                  </p>
                )}
              </div>

              <div>
                <LabelSelect
                  field="ReservationStatus"
                  label={t('venue_modal_field_status')}
                  value={status}
                  onChange={(val) => setStatus((val?.target?.value ?? String(val)) as BookingStatus)}
                  options={[
                    { value: 'Confirmed', label: t('venue_filter_confirmed') },
                    { value: 'CheckedIn', label: t('venue_filter_in_use') },
                    { value: 'Tentative', label: t('venue_filter_inquiries') },
                    { value: 'Completed', label: t('venue_filter_completed') },
                    { value: 'Cancelled', label: t('status_cancelled') },
                  ]}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Add-on Equipment & Services */}
          <div className="space-y-4 pt-4 border-t border-[#E9EEF0] dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              {t('venue_modal_sec_addons')}
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
                        className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full">
                <LabelInput
                  field="AddonName"
                  label={t('venue_modal_addon_ph_name')}
                  placeholder="e.g. 4K Projector / Catering"
                  value={newAddonName}
                  onChange={setNewAddonName}
                  width="100%"
                  height={42}
                  corner={12}
                />
              </div>
              <div className="w-full sm:w-32">
                <LabelInput
                  field="AddonPrice"
                  label={t('venue_modal_addon_ph_price')}
                  type="number"
                  placeholder="0"
                  value={newAddonPrice || ''}
                  onChange={(val) => setNewAddonPrice(Number(val?.target?.value ?? val))}
                  width="100%"
                  height={42}
                  corner={12}
                />
              </div>
              <button
                type="button"
                onClick={handleAddAddon}
                className="w-full sm:w-auto h-[42px] px-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 shrink-0 mt-3 sm:mt-0 cursor-pointer"
              >
                <Plus size={14} /> {t('venue_modal_btn_add_addon')}
              </button>
            </div>
          </div>

          {/* Section 4: Caution, Security Deposit & Financials */}
          <div className="space-y-4 pt-4 border-t border-[#E9EEF0] dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              {t('venue_modal_sec_financials')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <LabelInput
                  id="booking-deposit"
                  label={t('venue_modal_field_deposit')}
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <LabelSelect
                  field="EscrowStatus"
                  label={t('venue_modal_field_deposit_status')}
                  value={depositStatus}
                  onChange={(val) => setDepositStatus((val?.target?.value ?? String(val)) as DepositStatus)}
                  options={[
                    { value: 'Held', label: t('venue_held_status') },
                    { value: 'Pending', label: t('status_pending') },
                    { value: 'Refunded', label: t('venue_refunded_status') },
                    { value: 'Retained', label: t('venue_deducted_status') },
                  ]}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <div>
                <LabelInput
                  id="booking-paid-amount"
                  label={t('venue_modal_field_paid_amount')}
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>{t('venue_modal_calc_space_base', { hours: durationHours })}</span>
                <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                  {formatCurrencyAmount(baseAmount, selectedUnit?.currency)}
                </span>
              </div>
              {addonsTotal > 0 && (
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>{t('venue_modal_calc_addons')}</span>
                  <span className="font-medium text-neutral-900 dark:text-white tabular-nums">
                    +{formatCurrencyAmount(addonsTotal, selectedUnit?.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-neutral-900 dark:text-white pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span>{t('venue_modal_calc_total')}</span>
                <span className="text-sm tabular-nums">
                  {formatCurrencyAmount(totalAmount, selectedUnit?.currency)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-500 dark:text-neutral-400 text-[11px]">
                <span>{t('venue_balance_due', 'Remaining Balance Due:')}</span>
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
              <span>{t('venue_modal_field_contract_signed')}</span>
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E9EEF0] dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-800/30">
          <AtriumButton
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            {t('action_cancel')}
          </AtriumButton>
          <AtriumButton
            type="button"
            variant="primary"
            glow
            icon={<Check size={15} />}
            onClick={handleSubmit}
          >
            {bookingToEdit ? t('action_save') : t('venue_reserve_space')}
          </AtriumButton>
        </div>
      </div>
    </div>
  );
};
