import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Sparkles,
  Scissors,
  DollarSign,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  CreditCard,
  Trash2,
  X,
  UserPlus,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { Appointment, AppointmentStatus, ServiceItem } from '../../types/index';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { formatMoney } from '../../utils/rules';
import { t } from '../../utils/i18n';

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
    members,
    staff,
    servicesCatalog,
    currentBranch,
    language,
    createAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    deleteAppointment,
    checkoutAppointment,
    addMember,
  } = useAtriumStore();

  const isEditing = !!appointment;

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
  const [price, setPrice] = useState(5000);
  const [status, setStatus] = useState<AppointmentStatus>('Confirmed');
  const [notes, setNotes] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Sync state when opening modal
  useEffect(() => {
    if (appointment) {
      setSelectedClientId(appointment.clientId);
      setWalkinName(appointment.clientName);
      setWalkinPhone(appointment.clientPhone);
      setSelectedServiceId(appointment.serviceId);
      setSelectedStaffId(appointment.staffId);
      setDate(appointment.date);
      setStartTime(appointment.startTime);
      setDurationMinutes(appointment.durationMinutes);
      setPrice(appointment.price);
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
      setPrice(service ? service.price : 4500);
      setStatus('Confirmed');
      setNotes('');
      setBookingMode('registered');
      if (members.length > 0) {
        setSelectedClientId(members[0].id);
      }
    }
    setActionSuccessMessage(null);
  }, [appointment, isOpen, initialDate, initialTime, initialStaffId, staff, servicesCatalog, members]);

  // When service changes, update duration and price
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = servicesCatalog.find((s) => s.id === serviceId);
    if (service) {
      setDurationMinutes(service.durationMinutes);
      setPrice(service.price);
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

    const service = servicesCatalog.find((s) => s.id === selectedServiceId) || {
      id: 'srv_custom',
      name: 'Custom Salon Service',
      price,
    };
    const assignedStaff = staff.find((s) => s.id === selectedStaffId) || staff[0];

    let finalClientId = selectedClientId;
    let finalClientName = '';
    let finalClientPhone = '';

    if (bookingMode === 'walkin' && !isEditing) {
      finalClientName = walkinName.trim() || 'Walk-in Client';
      finalClientPhone = walkinPhone.trim() || '+213 550 00 00 00';

      // Auto-create client record for seamless CRM persistence
      const createdClient = addMember({
        fullName: finalClientName,
        email: `${finalClientName.toLowerCase().replace(/\\s+/g, '.') || 'client'}@guest.dz`,
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
      finalClientName = client ? client.fullName : (walkinName || 'Valued Client');
      finalClientPhone = client ? client.phoneNumber : (walkinPhone || '');
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
    } else {
      createAppointment({
        clientId: finalClientId,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        staffId: assignedStaff?.id || 'stf_salon_01',
        staffName: assignedStaff?.fullName || 'Sarah Louati',
        serviceId: service.id,
        serviceName: service.name,
        date,
        startTime,
        endTime: calculatedEndTime,
        durationMinutes,
        price,
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
    setActionSuccessMessage('Client is now seated in chair. Treatment started.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSendToPOS = () => {
    if (!appointment) return;
    checkoutAppointment(appointment.id, 'Cash');
    setActionSuccessMessage('Appointment completed & invoice created in POS sales history!');
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
    deleteAppointment(appointment.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('apt_modal_title_edit', language) : t('apt_modal_title_new', language)}
      subtitle={
        isEditing
          ? `Booking reference #${appointment.id.slice(-6).toUpperCase()} • ${currentBranch.name}`
          : `Schedule treatment at ${currentBranch.name}`
      }
      maxWidth="lg"
    >
      {actionSuccessMessage && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Quick Action Bar for Existing Appointments */}
      {isEditing && (
        <div className="mb-5 p-3.5 bg-neutral-50 dark:bg-[#202024] border border-neutral-200/70 dark:border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t('members_status_col', language)}:</span>
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                status === 'InChair'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  : status === 'Completed'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                  : status === 'Cancelled'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300'
              }`}
            >
              {status === 'InChair' ? `• ${t('dash_salon_in_chair', language)}` : status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status !== 'InChair' && status !== 'Completed' && (
              <button
                type="button"
                onClick={handleStartService}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Play size={13} />
                {t('apt_seat_client', language)}
              </button>
            )}

            {status !== 'Completed' && (
              <button
                type="button"
                onClick={handleSendToPOS}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <CreditCard size={13} />
                {t('apt_checkout_pos', language)}
              </button>
            )}

            {status !== 'Cancelled' && (
              <button
                type="button"
                onClick={handleCancelBooking}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {t('action_cancel', language)}
              </button>
            )}

            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
              title="Delete Record"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client Selection (Toggle Walk-in vs Existing if new) */}
        {!isEditing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {language === 'ar' ? 'طريقة استقبال العميل' : language === 'fr' ? 'Mode d\'accueil client' : 'Client Intake Mode'}
              </label>
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setBookingMode('registered')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    bookingMode === 'registered'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {t('apt_registered_client', language)}
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('walkin')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    bookingMode === 'walkin'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {t('apt_walkin_client', language)}
                </button>
              </div>
          </div>

            {bookingMode === 'registered' ? (
              <LabelSelect
                field="SelectClient"
                label="Registered Client *"
                value={selectedClientId}
                onChange={(val) => setSelectedClientId(val?.target?.value ?? val)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl">
              <LabelInput
                field="Walk-in Client Name"
                label="Walk-in Client Name *"
                value={walkinName}
                onChange={setWalkinName}
                width="100%"
                height={40}
                corner={12}
                required={bookingMode === 'walkin'}
              />
              <LabelInput
                field="Phone Number"
                label="Phone Number *"
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
          <div className="p-3 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 font-medium">Booked Client</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">{appointment?.clientName}</p>
            </div>
            <span className="text-xs text-neutral-500 flex items-center gap-1">
              <Phone size={12} /> {appointment?.clientPhone}
            </span>
          </div>
        )}

        {/* Treatment / Service Selection */}
        <div>
          <LabelSelect
            field="TreatmentService"
            label="Treatment / Service *"
            value={selectedServiceId}
            onChange={(val) => handleServiceChange(val?.target?.value ?? String(val))}
            options={servicesCatalog.map((service) => ({
              value: service.id,
              label: service.name,
              sublabel: `[${service.category}] ${service.durationMinutes} mins · ${formatMoney(service.price)}`,
            }))}
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
            label="Assigned Stylist / Practitioner *"
            value={selectedStaffId}
            onChange={(val) => setSelectedStaffId(val?.target?.value ?? String(val))}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <LabelInput
              field="AppointmentDate"
              label="Appointment Date"
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
              label="Start Time"
              value={startTime}
              onChange={(val) => setStartTime(val?.target?.value ?? String(val))}
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Estimated End ({durationMinutes}m)
            </label>
            <div className="w-full h-10 px-3 flex items-center bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold rounded-xl">
              {calculatedEndTime}
            </div>
          </div>
        </div>

        {/* Price & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <LabelInput
              field="Price"
              label="Price (DZD)"
              type="number"
              min={0}
              step={500}
              value={price}
              onChange={(val) => setPrice(Number(val?.target?.value || val || 0))}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div>
            <LabelSelect
              field="BookingStatus"
              label="Booking Status"
              value={status}
              onChange={(val) => setStatus((val?.target?.value ?? String(val)) as AppointmentStatus)}
              options={[
                { value: 'Confirmed', label: 'Confirmed' },
                { value: 'InChair', label: 'In Chair (Active Treatment)' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
                { value: 'NoShow', label: 'No Show' },
              ]}
              width="100%"
              height={40}
              corner={12}
            />
          </div>
        </div>

        {/* Treatment Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
            <FileText size={14} /> Treatment & Formula Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Tone formula 8.3 + 9.1 with 20 vol. Hair density fine, scalp sensitive."
            className="w-full p-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#C4785A]"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#C4785A] hover:bg-[#b56b4f] text-white shadow-xs transition-colors cursor-pointer"
          >
            {isEditing ? 'Save Changes' : 'Confirm Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
