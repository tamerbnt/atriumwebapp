import React, { useState, useEffect } from 'react';
import {
  Phone,
  CheckCircle2,
  Play,
  CreditCard,
  Trash2,
  X,
} from 'lucide-react';
import {
  selectCurrentBranchFromState,
  selectCurrentMembersFromState,
  selectCurrentServicesFromState,
  selectCurrentStaffFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../services/store';
import { Appointment, AppointmentStatus } from '../../types/index';
import { Modal } from '../ui/Modal';
import { useRetainedModalValue } from '../ui/kinetic';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { LabelTextarea } from '../ui/LabelTextarea';
import { LiveSegmentedControl } from '../ui/live/LiveSegmentedControl';
import { Button, LiquidButton } from '@/atrium/core';
import { formatMoney, localizeStatus } from '../../utils/rules';
import { t, getLocalizedService, getLocalizedServiceCategory } from '../../utils/i18n';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  initialDate?: string;
  initialTime?: string;
  initialStaffId?: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  initialDate,
  initialTime,
  initialStaffId,
}) => {
  const {
    createAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    deleteAppointment,
    checkoutAppointment,
    addMember,
  } = useAtriumActions();
  const {
    members,
    staff,
    servicesCatalog,
    language,
    networkMode,
  } = useAtriumSelector(
    (s) => ({
      members: selectCurrentMembersFromState(s),
      staff: selectCurrentStaffFromState(s),
      servicesCatalog: selectCurrentServicesFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );

  const retainedAppointment = useRetainedModalValue(isOpen ? appointment ?? null : null);
  const displayAppointment = isOpen ? appointment : retainedAppointment;
  const isEditing = !!displayAppointment;

  // Booking mode: registered client vs walk-in intake
  const [bookingMode, setBookingMode] = useState<'registered' | 'walkin'>('registered');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('Confirmed');
  const [notes, setNotes] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Sync state when opening modal
  useEffect(() => {
    if (!isOpen) return;
    if (appointment) {
      setSelectedClientId(appointment.clientId);
      setWalkinName(appointment.clientName);
      setWalkinPhone(appointment.clientPhone);
      setSelectedServiceId(appointment.serviceId);
      setSelectedStaffId(appointment.staffId);
      setDate(appointment.date);
      setStartTime(appointment.startTime);
      setDurationMinutes(appointment.durationMinutes);
      setPrice(appointment.price !== undefined ? String(appointment.price) : '');
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
      setBookingMode('registered');
    } else {
      const today = initialDate || new Date().toISOString().split('T')[0];
      const start = initialTime || '10:00';
      const staffMember = initialStaffId
        ? staff.find((s) => s.id === initialStaffId)
        : staff[0];
      const service = servicesCatalog[0];

      setDate(today);
      setStartTime(start);
      setSelectedStaffId(staffMember ? staffMember.id : staff[0]?.id || '');
      setSelectedServiceId(service ? service.id : '');
      setDurationMinutes(service ? service.durationMinutes : 60);
      setPrice(service ? String(service.price) : '');
      setStatus('Confirmed');
      setNotes('');
      setWalkinName('');
      setWalkinPhone('');
      setBookingMode('registered');
      setSelectedClientId(members.length > 0 ? members[0].id : '');
    }
    setActionSuccessMessage(null);
    setConfirmingDelete(false);
  }, [appointment, isOpen, initialDate, initialTime, initialStaffId, staff, servicesCatalog, members]);

  // When service changes, update duration and price
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = servicesCatalog.find((s) => s.id === serviceId);
    if (service) {
      setDurationMinutes(service.durationMinutes);
      setPrice(String(service.price));
    }
  };

  // Compute end time based on start time + duration
  const computeEndTime = (start: string, duration: number) => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const calculatedEndTime = computeEndTime(startTime, durationMinutes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseFloat(price);
    if (price.trim() === '' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'السعر مطلوب' : language === 'fr' ? 'Tarif requis' : 'Price Required',
        message:
          language === 'ar'
            ? 'يرجى إدخال سعر صالح للموعد'
            : language === 'fr'
            ? 'Veuillez saisir un tarif valide pour ce rendez-vous.'
            : 'Please enter a valid appointment price.',
      });
      return;
    }

    const service = servicesCatalog.find((s) => s.id === selectedServiceId) || {
      id: 'srv_custom',
      name: 'Custom Salon Service',
      price: parsedPrice,
    };
    const assignedStaff = staff.find((s) => s.id === selectedStaffId) || staff[0];
    if (!assignedStaff && !isEditing) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'المختص مطلوب' : language === 'fr' ? 'Praticien requis' : 'Staff Required',
        message:
          language === 'ar'
            ? 'يرجى اختيار أو إضافة موظف قبل الحجز'
            : language === 'fr'
            ? 'Veuillez sélectionner un praticien disponible.'
            : 'Please select an available staff member.',
      });
      return;
    }

    let finalClientId = selectedClientId;
    let finalClientName = '';
    let finalClientPhone = '';

    if (bookingMode === 'walkin' && !isEditing) {
      if (!walkinName.trim() || !walkinPhone.trim()) {
        showToast({
          type: 'warning',
          title: language === 'ar' ? 'بيانات العميل مطلوبة' : language === 'fr' ? 'Coordonnées requises' : 'Client Details Required',
          message:
            language === 'ar'
              ? 'يرجى إدخال اسم العميل ورقم هاتفه'
              : language === 'fr'
              ? 'Veuillez saisir le nom et le téléphone du client.'
              : 'Please provide both client name and phone number.',
        });
        return;
      }
      finalClientName = walkinName.trim();
      finalClientPhone = walkinPhone.trim();

      const createdClient = addMember({
        fullName: finalClientName,
        email: `${finalClientName.toLowerCase().replace(/\s+/g, '.') || 'client'}@guest.dz`,
        phoneNumber: finalClientPhone,
        status: 'Active',
        startDate: date,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remainingSessions: 99,
        gender: 'Female',
        source: 'Walk-in Salon',
        membershipPlanName: 'Walk-in Service',
        notes: `Salon client intake on ${date}`,
      });
      finalClientId = createdClient.id;
    } else {
      const client = members.find((m) => m.id === selectedClientId);
      finalClientName = client ? client.fullName : walkinName.trim();
      finalClientPhone = client ? client.phoneNumber : walkinPhone.trim();
    }

    if (isEditing && appointment) {
      rescheduleAppointment(
        appointment.id,
        date,
        startTime,
        calculatedEndTime,
        assignedStaff?.id,
        assignedStaff?.fullName
      );
      updateAppointmentStatus(appointment.id, status);
    } else if (assignedStaff) {
      createAppointment({
        clientId: finalClientId,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        staffId: assignedStaff.id,
        staffName: assignedStaff.fullName,
        serviceId: service.id,
        serviceName: service.name,
        date,
        startTime,
        endTime: calculatedEndTime,
        durationMinutes,
        price: parsedPrice,
        status,
        notes,
      });
    }

    onClose();
  };

  const handleStartService = () => {
    if (!appointment) return;
    updateAppointmentStatus(appointment.id, 'InChair');
    setStatus('InChair');
    setActionSuccessMessage(t('toast_apt_seated_title', language));
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSendToPOS = () => {
    if (!appointment) return;
    checkoutAppointment(appointment.id, 'Cash');
    setActionSuccessMessage(t('toast_apt_checkout_title', language));
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleCancelBooking = () => {
    if (!appointment) return;
    updateAppointmentStatus(appointment.id, 'Cancelled');
    setStatus('Cancelled');
    onClose();
  };

  const handleDelete = () => {
    if (!appointment) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteAppointment(appointment.id);
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={networkMode === 'force_skeleton'}
      title={isEditing ? t('apt_modal_title_edit', language) : t('apt_modal_title_new', language)}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-[var(--s4,16px)]">
      {actionSuccessMessage && (
        <div
          data-sq="card"
          style={{ '--sq-stroke': '#A7F3D0' } as React.CSSProperties}
          className="p-[var(--s3,12px)] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 t-body flex items-center gap-[var(--icon-text-gap,8px)]"
        >
          <CheckCircle2 size={16} strokeWidth={1.5} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Quick Action Bar for Existing Appointments */}
      {isEditing && (
        <div
          data-sq="card"
          className="p-[var(--s4,16px)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-wrap items-center justify-between gap-[var(--s3,12px)]"
        >
          <div className="flex items-center gap-[var(--s2,8px)]">
            <span className="t-small text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">{t('members_status_col', language)}:</span>
            <span
              className={`h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center t-small rounded-full ${
                status === 'InChair'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  : status === 'Completed'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                  : status === 'Cancelled'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
              }`}
            >
              {status === 'InChair' ? `• ${t('dash_salon_in_chair', language)}` : localizeStatus(status, language)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
            {status !== 'InChair' && status !== 'Completed' && (
              <Button
                type="button"
                size={32}
                tone="accent"
                onClick={handleStartService}
                leading={<Play size={14} strokeWidth={1.75} />}
              >
                {t('apt_seat_client', language)}
              </Button>
            )}

            {status !== 'Completed' && (
              <Button
                type="button"
                size={32}
                tone="soft"
                onClick={handleSendToPOS}
                leading={<CreditCard size={14} strokeWidth={1.75} />}
              >
                {t('apt_checkout_pos', language)}
              </Button>
            )}

            {status !== 'Cancelled' && (
              <Button
                type="button"
                size={32}
                tone="ghost"
                onClick={handleCancelBooking}
              >
                {t('action_cancel', language)}
              </Button>
            )}

            {confirmingDelete ? (
              <div
                data-sq="ctl"
                style={{ '--sq-stroke': '#FECDD3' } as React.CSSProperties}
                className="flex items-center gap-[var(--s1,4px)] bg-rose-50 dark:bg-rose-950/60 px-[var(--s2,8px)] py-[var(--s1,4px)]"
              >
                <button
                  type="button"
                  onClick={handleDelete}
                  data-sq="ctl-sm"
                  className="h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] t-small bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد الحذف' : language === 'fr' ? 'Confirmer' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  aria-label={t('action_cancel', language)}
                  className="p-[var(--s1,4px)] text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)] hover:text-[var(--text-1,#17130F)] dark:hover:text-white rounded-full cursor-pointer"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                aria-label={t('apt_action_delete_title', language)}
                className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] grid place-items-center text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)] hover:text-rose-600 dark:hover:text-rose-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                title={t('apt_action_delete_title', language)}
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s4,16px)]">
        {/* Client Selection (Toggle Walk-in vs Existing if new) */}
        {!isEditing && (
          <div className="flex flex-col gap-[var(--s2,8px)]">
            <div className="flex flex-wrap items-center justify-between gap-[var(--s3,12px)]">
              <label className="t-label text-[var(--text-1,#17130F)] dark:text-white">
                {t('apt_field_intake_mode', language)}
              </label>
              <LiveSegmentedControl
                size="sm"
                value={bookingMode}
                onValueChange={(val) => setBookingMode(val as 'registered' | 'walkin')}
                aria-label={t('apt_field_intake_mode', language)}
                options={[
                  { value: 'registered', label: t('apt_mode_registered', language) },
                  { value: 'walkin', label: t('apt_mode_walkin', language) },
                ]}
              />
            </div>

            {bookingMode === 'registered' ? (
              <LabelSelect
                field="SelectClient"
                label={t('apt_field_registered_client', language)}
                value={selectedClientId}
                onChange={setSelectedClientId}
                searchable
                options={members.map((client) => ({
                  value: client.id,
                  label: client.fullName,
                  sublabel: `${client.phoneNumber} · ${client.membershipPlanName || 'Standard Client'}`,
                }))}
                width="100%"
                height={40}
                corner={12}
              />
            ) : (
            <div
              data-sq="card"
              style={{ '--sq-stroke': 'rgba(251,191,36,0.35)' } as React.CSSProperties}
              className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3,12px)] p-[var(--s3,12px)] bg-amber-50/50 dark:bg-amber-950/20"
            >
              <LabelInput
                field="Walk-in Client Name"
                label={t('apt_field_walkin_name', language)}
                value={walkinName}
                onChange={setWalkinName}
                width="100%"
                height={40}
                corner={12}
                required={bookingMode === 'walkin'}
              />
              <LabelInput
                field="Phone Number"
                label={t('apt_field_phone', language)}
                type="tel"
                value={walkinPhone}
                onChange={setWalkinPhone}
                width="100%"
                height={40}
                corner={12}
                required={bookingMode === 'walkin'}
              />
            </div>
            )}
          </div>
        )}

        {isEditing && (
          <div
            data-sq="card"
            className="p-[var(--s3,12px)] bg-[#F5F1EC] dark:bg-[#22201E] flex items-center justify-between gap-[var(--s3,12px)]"
          >
            <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
              <p className="t-small text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">{t('apt_booked_client', language)}</p>
              <p className="t-card font-semibold text-[var(--text-1,#17130F)] dark:text-white">{displayAppointment?.clientName}</p>
            </div>
            <span className="t-cap text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)] flex items-center gap-[var(--s1,4px)] tabular-nums">
              <Phone size={16} strokeWidth={1.5} /> {displayAppointment?.clientPhone}
            </span>
          </div>
        )}

        {/* Treatment / Service Selection */}
        <div>
          <LabelSelect
            field="TreatmentService"
            label={t('apt_field_treatment', language)}
            value={selectedServiceId}
            onChange={handleServiceChange}
            options={servicesCatalog.map((service) => {
              const loc = getLocalizedService(service, language);
              return {
                value: service.id,
                label: loc.name,
                sublabel: `[${getLocalizedServiceCategory(service.category, language)}] ${service.durationMinutes} mins · ${formatMoney(service.price)}`,
              };
            })}
            searchable
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        {/* Assigned Stylist & Practitioner */}
        <div>
          <LabelSelect
            field="AssignedStylist"
            label={t('apt_field_stylist', language)}
            value={selectedStaffId}
            onChange={setSelectedStaffId}
            options={staff.map((s) => ({
              value: s.id,
              label: s.fullName,
              sublabel: s.role,
            }))}
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        {/* Date, Time & Duration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3,12px)] items-end">
          <div>
            <LabelInput
              field="AppointmentDate"
              label={t('apt_field_date', language)}
              type="date"
              value={date}
              onChange={setDate}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div>
            <LabelSelect
              field="StartTime"
              label={t('apt_field_start_time', language)}
              value={startTime}
              onChange={setStartTime}
              options={[
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
                '18:00', '18:30', '19:00', '19:30'
              ]}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="flex flex-col gap-[var(--s1,4px)]">
            <label className="t-small text-[var(--text-1,#17130F)] dark:text-white">
              {t('apt_field_estimated_end', language)} ({durationMinutes}m)
            </label>
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="w-full h-[var(--btn-h,40px)] px-[var(--s3,12px)] flex items-center bg-[#F5F1EC] dark:bg-[#292624] text-[var(--text-1,#17130F)] dark:text-white t-label font-semibold tabular-nums"
            >
              {calculatedEndTime}
            </div>
          </div>
        </div>

        {/* Price & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3,12px)] items-end">
          <div>
            <LabelInput
              field="Price"
              label={t('apt_field_price', language)}
              type="number"
              min={0}
              step={500}
              placeholder="4500"
              value={price}
              onChange={setPrice}
              width="100%"
              height={40}
              corner={12}
              required
            />
          </div>

          <div>
            <LabelSelect
              field="BookingStatus"
              label={t('apt_field_booking_status', language)}
              value={status}
              onChange={(val) => setStatus(val as AppointmentStatus)}
              options={[
                { value: 'Confirmed', label: t('apt_status_confirmed', language) },
                { value: 'InChair', label: t('apt_status_inchair', language) },
                { value: 'Completed', label: t('apt_status_completed', language) },
                { value: 'Cancelled', label: t('apt_status_cancelled', language) },
                { value: 'NoShow', label: t('apt_status_noshow', language) },
              ]}
              width="100%"
              height={40}
              corner={12}
            />
          </div>
        </div>

        {/* Treatment Notes */}
        <LabelTextarea
          label={t('apt_field_notes', language)}
          value={notes}
          onChange={setNotes}
          rows={2}
          placeholder={t('apt_ph_notes', language)}
        />

        {/* Action Buttons */}
        <div className="pt-[var(--s4,16px)] flex items-center justify-end gap-[var(--s3,12px)] border-t border-[var(--atr-divider)]">
          <Button
            type="button"
            tone="soft"
            onClick={onClose}
          >
            {t('action_cancel', language)}
          </Button>
          <LiquidButton
            kind={isEditing ? 'confirm' : 'create'}
            type="submit"
            labels={{
              idle: isEditing ? t('action_save', language) : t('apt_btn_confirm', language),
            }}
          />
        </div>
      </form>
      </div>
    </Modal>
  );
};

