import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  CheckCircle2,
  Play,
  CreditCard,
  Trash2,
  X,
  AlertTriangle,
  Copy,
  MessageCircle,
  FileCheck2,
  ShieldAlert,
} from 'lucide-react';
import {
  selectCurrentAppointmentsFromState,
  selectCurrentBranchFromState,
  selectCurrentMembersFromState,
  selectCurrentProductsFromState,
  selectCurrentSalonConsentFormsFromState,
  selectCurrentSalonGiftCardsFromState,
  selectCurrentSalonPrepaidPackagesFromState,
  selectCurrentServicesFromState,
  selectCurrentStaffFromState,
  selectCurrentStylistSchedulesFromState,
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
import { centimesToDzd, dzdToCentimes } from '../../utils/money';
import {
  buildOnlineBookingLink,
  buildWhatsappBookingUrl,
  computeAppointmentEndTime,
  computeSalonCheckoutSettlement,
  detectClientAllergyConflicts,
  evaluateConsumableDepletionPlan,
  evaluateDepositCancellationPolicy,
  evaluateStylistAvailability,
} from '../../utils/appointmentDepth';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  initialDate?: string;
  initialTime?: string;
  initialStaffId?: string;
  initialClientId?: string;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  initialDate,
  initialTime,
  initialStaffId,
  initialClientId,
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
    account,
    members,
    staff,
    servicesCatalog,
    appointments,
    stylistSchedules,
    prepaidPackages,
    giftCards,
    consentForms,
    products,
    currentBranch,
    language,
    networkMode,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      members: selectCurrentMembersFromState(s),
      staff: selectCurrentStaffFromState(s),
      servicesCatalog: selectCurrentServicesFromState(s),
      appointments: selectCurrentAppointmentsFromState(s),
      stylistSchedules: selectCurrentStylistSchedulesFromState(s),
      prepaidPackages: selectCurrentSalonPrepaidPackagesFromState(s),
      giftCards: selectCurrentSalonGiftCardsFromState(s),
      consentForms: selectCurrentSalonConsentFormsFromState(s),
      products: selectCurrentProductsFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const retainedAppointment = useRetainedModalValue(isOpen ? appointment ?? null : null);
  const displayAppointment = isOpen ? appointment : retainedAppointment;
  const isEditing = !!displayAppointment;

  const [bookingMode, setBookingMode] = useState<'registered' | 'walkin'>('registered');
  const [selectedClientId, setSelectedClientId] = useState(() => appointment?.clientId || initialClientId || members[0]?.id || '');
  const [walkinName, setWalkinName] = useState(() => appointment?.clientName || '');
  const [walkinPhone, setWalkinPhone] = useState(() => appointment?.clientPhone || '');
  const [selectedServiceId, setSelectedServiceId] = useState(() => appointment?.serviceId || servicesCatalog[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState(() => appointment?.staffId || initialStaffId || staff[0]?.id || '');
  const [date, setDate] = useState(() => appointment?.date || initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(() => appointment?.startTime || initialTime || '10:00');
  const [durationMinutes, setDurationMinutes] = useState(() => appointment?.durationMinutes ?? servicesCatalog[0]?.durationMinutes ?? 60);
  const [price, setPrice] = useState(() => (appointment?.price !== undefined ? String(appointment.price) : String(servicesCatalog[0]?.price ?? '')));
  const [status, setStatus] = useState<AppointmentStatus>('Confirmed');
  const [notes, setNotes] = useState('');
  const [bookingChannel, setBookingChannel] = useState<'desk' | 'online' | 'whatsapp' | 'walkin'>('desk');
  const [depositDzd, setDepositDzd] = useState('0');
  const [cutoffHours, setCutoffHours] = useState('24');
  const [allergyOverrideConfirmed, setAllergyOverrideConfirmed] = useState(false);

  // Checkout settlement sub-panel state
  const [showCheckoutPanel, setShowCheckoutPanel] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'Cash' | 'Card' | 'MemberBalance'>('Cash');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [loyaltyRedeem, setLoyaltyRedeem] = useState('0');
  const [retailTotalDzd, setRetailTotalDzd] = useState('0');
  const [tipAmountDzd, setTipAmountDzd] = useState('0');

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
      setBookingChannel(appointment.bookingChannel || 'desk');
      setDepositDzd(String(appointment.depositCentimes ? centimesToDzd(appointment.depositCentimes) : 0));
      setCutoffHours(String(appointment.cancellationCutoffHours ?? 24));
      setAllergyOverrideConfirmed(Boolean(appointment.allergyOverrideConfirmed));
      setBookingMode('registered');
    } else {
      const today = initialDate || new Date().toISOString().split('T')[0];
      const start = initialTime || '10:00';
      const staffMember = initialStaffId
        ? staff.find((s) => s.id === initialStaffId)
        : staff[0];
      const service = servicesCatalog[0];
      const preselectedClient = initialClientId
        ? members.find((m) => m.id === initialClientId)
        : members[0];

      setDate(today);
      setStartTime(start);
      setSelectedStaffId(staffMember ? staffMember.id : staff[0]?.id || '');
      setSelectedServiceId(service ? service.id : '');
      setDurationMinutes(service ? service.durationMinutes : 60);
      setPrice(service ? String(service.price) : '0');
      setStatus('Confirmed');
      setNotes('');
      setWalkinName('');
      setWalkinPhone('');
      setBookingMode('registered');
      setBookingChannel('desk');
      setDepositDzd('0');
      setCutoffHours('24');
      setAllergyOverrideConfirmed(false);
      setSelectedClientId(preselectedClient ? preselectedClient.id : initialClientId || '');
    }
    setShowCheckoutPanel(false);
    setSelectedPackageId('');
    setGiftCardCode('');
    setLoyaltyRedeem('0');
    setRetailTotalDzd('0');
    setTipAmountDzd('0');
    setActionSuccessMessage(null);
    setConfirmingDelete(false);
  }, [appointment, isOpen, initialDate, initialTime, initialStaffId, initialClientId, staff, servicesCatalog, members]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = servicesCatalog.find((s) => s.id === serviceId);
    if (service) {
      setDurationMinutes(service.durationMinutes);
      setPrice(String(service.price));
    }
  };

  const endTimeComputation = useMemo(
    () => computeAppointmentEndTime(startTime, durationMinutes),
    [startTime, durationMinutes]
  );
  const calculatedEndTime = endTimeComputation.endTime;

  const activeService = useMemo(
    () => servicesCatalog.find((s) => s.id === selectedServiceId) || null,
    [servicesCatalog, selectedServiceId]
  );
  const activeClient = useMemo(
    () => (bookingMode === 'registered' ? members.find((m) => m.id === selectedClientId) || null : null),
    [bookingMode, members, selectedClientId]
  );

  const stylistSchedule = useMemo(
    () => stylistSchedules.find((s) => s.staffId === selectedStaffId) || null,
    [stylistSchedules, selectedStaffId]
  );

  const availability = useMemo(
    () =>
      evaluateStylistAvailability({
        schedule: stylistSchedule,
        appointments,
        staffId: selectedStaffId,
        date,
        startTime,
        durationMinutes,
        excludeAppointmentId: appointment?.id,
      }),
    [stylistSchedule, appointments, selectedStaffId, date, startTime, durationMinutes, appointment?.id]
  );

  const allergyConflict = useMemo(
    () => detectClientAllergyConflicts(activeClient, activeService),
    [activeClient, activeService]
  );

  const hasConsentSigned = useMemo(() => {
    if (!activeService?.requiresConsent || !activeClient) return true;
    return consentForms.some(
      (f) =>
        f.clientId === activeClient.id &&
        (f.serviceId === activeService.id || f.serviceName === activeService.name)
    );
  }, [activeService, activeClient, consentForms]);

  const cancellationPolicyPreview = useMemo(() => {
    if (!displayAppointment || displayAppointment.depositStatus !== 'held' || !displayAppointment.depositCentimes) {
      return null;
    }
    return evaluateDepositCancellationPolicy({
      appointment: displayAppointment,
      newStatus: status === 'NoShow' ? 'NoShow' : 'Cancelled',
    });
  }, [displayAppointment, status]);

  const clientActivePackages = useMemo(() => {
    const cid = displayAppointment?.clientId || selectedClientId;
    return prepaidPackages.filter(
      (p) => p.clientId === cid && p.status === 'active' && p.remainingSessions > 0
    );
  }, [prepaidPackages, displayAppointment?.clientId, selectedClientId]);

  const matchedGiftCard = useMemo(() => {
    const norm = giftCardCode.trim().toUpperCase();
    if (!norm) return null;
    return giftCards.find((g) => g.code.trim().toUpperCase() === norm && g.status === 'active') || null;
  }, [giftCards, giftCardCode]);

  const checkoutSettlement = useMemo(() => {
    const basePrice = displayAppointment?.price ?? (parseFloat(price) || 0);
    const pkg = clientActivePackages.find((p) => p.id === selectedPackageId) || null;
    const maxPts = Number(activeClient?.segmentData?.loyaltyPoints || 0);
    const reqPts = Math.min(maxPts, Math.max(0, Math.round(Number(loyaltyRedeem || 0))));
    return computeSalonCheckoutSettlement({
      servicePriceDzd: basePrice,
      retailTotalDzd: Number(retailTotalDzd || 0),
      tipAmountDzd: Number(tipAmountDzd || 0),
      depositCentimes: displayAppointment?.depositCentimes || 0,
      depositStatus: displayAppointment?.depositStatus,
      prepaidPackage: pkg,
      giftCard: matchedGiftCard,
      loyaltyPointsToRedeem: reqPts,
    });
  }, [
    displayAppointment,
    price,
    clientActivePackages,
    selectedPackageId,
    activeClient,
    loyaltyRedeem,
    retailTotalDzd,
    tipAmountDzd,
    matchedGiftCard,
  ]);

  const consumablePlan = useMemo(
    () =>
      evaluateConsumableDepletionPlan({
        service: activeService,
        products,
        alreadyDeducted: Boolean(displayAppointment?.consumablesDeducted),
      }),
    [activeService, products, displayAppointment?.consumablesDeducted]
  );

  const onlineBookingUrl = useMemo(
    () =>
      buildOnlineBookingLink({
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        businessId: currentBranch?.businessId || 'biz_salon',
        branchId: currentBranch?.id || 'branch_salon',
        serviceId: selectedServiceId || undefined,
        staffId: selectedStaffId || undefined,
      }),
    [currentBranch?.businessId, currentBranch?.id, selectedServiceId, selectedStaffId]
  );

  const whatsappShareUrl = useMemo(() => {
    const cName = displayAppointment?.clientName || activeClient?.fullName || walkinName;
    const cPhone = displayAppointment?.clientPhone || activeClient?.phoneNumber || walkinPhone;
    return buildWhatsappBookingUrl({
      phone: cPhone || '',
      clientName: cName,
      businessName: currentBranch?.name || account?.fullName,
      serviceName: activeService?.name || displayAppointment?.serviceName,
      date,
      startTime,
      bookingLink: onlineBookingUrl,
    });
  }, [
    displayAppointment,
    activeClient,
    walkinName,
    walkinPhone,
    currentBranch?.name,
    account?.fullName,
    activeService?.name,
    date,
    startTime,
    onlineBookingUrl,
  ]);

  const handleCopyBookingLink = () => {
    navigator.clipboard?.writeText(onlineBookingUrl);
    showToast({
      type: 'success',
      title: isAr ? 'تم نسخ رابط الحجز' : isEn ? 'Booking Link Copied' : 'Lien de réservation copié',
      message: onlineBookingUrl,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseFloat(price);
    if (price.trim() === '' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      showToast({
        type: 'warning',
        title: isAr ? 'السعر مطلوب' : isEn ? 'Price Required' : 'Tarif requis',
        message: isAr
          ? 'يرجى إدخال سعر صالح للموعد'
          : isEn
          ? 'Please enter a valid appointment price.'
          : 'Veuillez saisir un tarif valide pour ce rendez-vous.',
      });
      return;
    }

    if (availability.issues.includes('APPOINTMENT_OVERLAP')) {
      showToast({
        type: 'error',
        title: isAr ? 'تعارض في الموعد' : isEn ? 'Stylist Double-Booked' : 'Chevauchement créneau',
        message: `${availability.overlappingAppointment?.clientName} (${availability.overlappingAppointment?.startTime}-${availability.overlappingAppointment?.endTime})`,
      });
      return;
    }

    if (allergyConflict.hasConflict && !allergyOverrideConfirmed) {
      showToast({
        type: 'warning',
        title: isAr ? 'تأكيد الحساسية مطلوب' : isEn ? 'Allergy Override Required' : 'Confirmation allergie requise',
        message: `${isEn ? 'Conflicts:' : 'Allergies détectées :'} ${allergyConflict.matchedKeywords.join(', ')}`,
      });
      return;
    }

    const service = activeService || {
      id: 'srv_custom',
      name: 'Custom Salon Service',
      price: parsedPrice,
    };
    const assignedStaff = staff.find((s) => s.id === selectedStaffId) || staff[0];
    if (!assignedStaff && !isEditing) {
      showToast({
        type: 'warning',
        title: isAr ? 'المختص مطلوب' : isEn ? 'Staff Required' : 'Praticien requis',
        message: isAr
          ? 'يرجى اختيار أو إضافة موظف قبل الحجز'
          : isEn
          ? 'Please select an available staff member.'
          : 'Veuillez sélectionner un praticien disponible.',
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
          title: isAr ? 'بيانات العميل مطلوبة' : isEn ? 'Client Details Required' : 'Coordonnées requises',
          message: isAr
            ? 'يرجى إدخال اسم العميل ورقم هاتفه'
            : isEn
            ? 'Please provide both client name and phone number.'
            : 'Veuillez saisir le nom et le téléphone du client.',
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
        clientType: 'walkin',
        notes: `Salon client intake on ${date}`,
      });
      finalClientId = createdClient.id;
    } else {
      const client = members.find((m) => m.id === selectedClientId);
      finalClientName = client ? client.fullName : walkinName.trim();
      finalClientPhone = client ? client.phoneNumber : walkinPhone.trim();
    }

    const depositCentimesVal = dzdToCentimes(Math.max(0, parseFloat(depositDzd) || 0));
    const cutoffVal = Math.max(0, parseInt(cutoffHours, 10) || 24);
    const effectiveChannel = bookingMode === 'walkin' ? 'walkin' : bookingChannel;

    try {
      if (isEditing && appointment) {
        rescheduleAppointment(
          appointment.id,
          date,
          startTime,
          calculatedEndTime,
          assignedStaff?.id,
          assignedStaff?.fullName,
          durationMinutes,
          {
            serviceId: service.id,
            serviceName: service.name,
            price: parsedPrice,
            notes,
            depositCentimes: depositCentimesVal > 0 ? depositCentimesVal : undefined,
            depositStatus:
              appointment.depositStatus && appointment.depositStatus !== 'none'
                ? appointment.depositStatus
                : depositCentimesVal > 0
                ? 'held'
                : 'none',
            cancellationCutoffHours: cutoffVal,
            bookingChannel: effectiveChannel,
            allergyOverrideConfirmed,
          }
        );
        if (status !== appointment.status) {
          updateAppointmentStatus(appointment.id, status);
        }
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
          depositCentimes: depositCentimesVal > 0 ? depositCentimesVal : undefined,
          depositStatus: depositCentimesVal > 0 ? 'held' : 'none',
          cancellationCutoffHours: cutoffVal,
          bookingChannel: effectiveChannel,
          allergyOverrideConfirmed,
        });
      }
      onClose();
    } catch {
      // Overlap toast already triggered by store
    }
  };

  const handleStartService = () => {
    if (!appointment) return;
    updateAppointmentStatus(appointment.id, 'InChair');
    setStatus('InChair');
    setActionSuccessMessage(t('toast_apt_seated_title', language));
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleConfirmCheckout = () => {
    if (!appointment) return;
    const maxPts = Number(activeClient?.segmentData?.loyaltyPoints || 0);
    const reqPts = Math.min(maxPts, Math.max(0, Math.round(Number(loyaltyRedeem || 0))));
    checkoutAppointment(appointment.id, checkoutMethod, {
      prepaidPackageId: selectedPackageId || undefined,
      giftCardCode: matchedGiftCard?.code,
      loyaltyPointsToRedeem: reqPts,
      retailTotalDzd: Math.max(0, Number(retailTotalDzd || 0)),
      tipAmountDzd: Math.max(0, Number(tipAmountDzd || 0)),
      allergyOverrideConfirmed,
    });
    setActionSuccessMessage(t('toast_apt_checkout_title', language));
    setTimeout(() => {
      onClose();
    }, 900);
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

        {/* Quick Action Bar & Share Actions for Existing Appointments */}
        {isEditing && (
          <div
            data-sq="card"
            className="p-[var(--s4,16px)] bg-[#F5F1EC] dark:bg-[#22201E] flex flex-wrap items-center justify-between gap-[var(--s3,12px)]"
          >
            <div className="flex items-center gap-[var(--s2,8px)]">
              <span className="t-small text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
                {t('members_status_col', language)}:
              </span>
              <span
                className={`h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center t-small rounded-full ${
                  status === 'InChair'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    : status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : status === 'Cancelled' || status === 'NoShow'
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

              {status !== 'Completed' && status !== 'Cancelled' && (
                <Button
                  type="button"
                  size={32}
                  tone="soft"
                  onClick={() => setShowCheckoutPanel((p) => !p)}
                  leading={<CreditCard size={14} strokeWidth={1.75} />}
                >
                  {t('apt_checkout_pos', language)}
                </Button>
              )}

              {status !== 'Cancelled' && status !== 'Completed' && (
                <Button type="button" size={32} tone="ghost" onClick={handleCancelBooking}>
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
                    {isAr ? 'تأكيد الحذف' : isEn ? 'Confirm' : 'Confirmer'}
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

        {/* Checkout Settlement Drawer inside Modal */}
        {isEditing && showCheckoutPanel && (
          <div
            data-sq="card"
            className="p-4 bg-[#FBF8F5] dark:bg-[#1E1C1A] border border-[#d4522f]/25 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="t-label font-semibold text-black dark:text-white">
                {isAr ? 'تسوية الفاتورة والدفع' : isEn ? 'Salon Checkout Settlement' : 'Règlement & Encaissement'}
              </h4>
              <span className="t-small font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                +{checkoutSettlement.loyaltyPointsEarned} pts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <LabelSelect
                field="CheckoutMethod"
                label={isEn ? 'Payment Method' : 'Mode paiement'}
                value={checkoutMethod}
                onChange={(v) => setCheckoutMethod(v as 'Cash' | 'Card' | 'MemberBalance')}
                options={[
                  { value: 'Cash', label: isEn ? 'Cash' : 'Espèces' },
                  { value: 'Card', label: isEn ? 'Card / CIB' : 'Carte / BaridiMob' },
                  { value: 'MemberBalance', label: isEn ? 'Client Balance' : 'Solde Client' },
                ]}
                width="100%"
                height={38}
                corner={10}
              />
              <LabelInput
                field="RetailTotal"
                label={isEn ? 'Retail Add-on (DZD)' : 'Boutique (DZD)'}
                type="number"
                min={0}
                value={retailTotalDzd}
                onChange={setRetailTotalDzd}
                width="100%"
                height={38}
                corner={10}
              />
              <LabelInput
                field="TipAmount"
                label={isEn ? 'Tip (DZD)' : 'Pourboire (DZD)'}
                type="number"
                min={0}
                value={tipAmountDzd}
                onChange={setTipAmountDzd}
                width="100%"
                height={38}
                corner={10}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <LabelSelect
                field="PrepaidPackage"
                label={isEn ? 'Prepaid Package' : 'Forfait Prépayé'}
                value={selectedPackageId}
                onChange={setSelectedPackageId}
                options={[
                  { value: '', label: isEn ? 'None' : 'Aucun forfait' },
                  ...clientActivePackages.map((p) => ({
                    value: p.id,
                    label: p.packageName,
                    sublabel: `${p.remainingSessions}/${p.totalSessions}`,
                  })),
                ]}
                width="100%"
                height={38}
                corner={10}
              />
              <LabelInput
                field="GiftCardCode"
                label={isEn ? 'Gift Card Code' : 'Code Carte Cadeau'}
                value={giftCardCode}
                onChange={setGiftCardCode}
                placeholder="GC-..."
                width="100%"
                height={38}
                corner={10}
              />
              <LabelInput
                field="RedeemPoints"
                label={
                  isEn
                    ? `Loyalty Pts (Avail: ${activeClient?.segmentData?.loyaltyPoints || 0})`
                    : `Points Fidélité (${activeClient?.segmentData?.loyaltyPoints || 0})`
                }
                type="number"
                min={0}
                max={Number(activeClient?.segmentData?.loyaltyPoints || 0)}
                value={loyaltyRedeem}
                onChange={setLoyaltyRedeem}
                width="100%"
                height={38}
                corner={10}
              />
            </div>

            {consumablePlan.lines.length > 0 && (
              <div className="p-2 rounded-lg bg-white dark:bg-[#262422] t-cap text-black/75 dark:text-white/75">
                {isEn ? 'Consumables stock deduction:' : 'Déstockage consommables :'}{' '}
                {consumablePlan.lines.map((l) => `${l.productName} (-${l.deductQty})`).join(', ')}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <div className="t-small tabular-nums space-x-3">
                <span>
                  {isEn ? 'Net Payable:' : 'Net à encaisser :'}{' '}
                  <strong className="text-[var(--brand-text,#BF431F)]">
                    {formatMoney(checkoutSettlement.netPayableDzd)}
                  </strong>
                </span>
                {checkoutSettlement.depositAppliedCentimes > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    ({isEn ? 'Deposit applied:' : 'Acompte déduit :'}{' '}
                    {formatMoney(centimesToDzd(checkoutSettlement.depositAppliedCentimes))})
                  </span>
                )}
              </div>
              <Button type="button" tone="accent" size={36} onClick={handleConfirmCheckout}>
                {isEn ? 'Confirm Settlement' : 'Encaisser maintenant'}
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s4,16px)]">
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
                <p className="t-small text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
                  {t('apt_booked_client', language)}
                </p>
                <p className="t-card font-semibold text-[var(--text-1,#17130F)] dark:text-white">
                  {displayAppointment?.clientName}
                </p>
              </div>
              <span className="t-cap text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)] flex items-center gap-[var(--s1,4px)] tabular-nums">
                <Phone size={16} strokeWidth={1.5} /> {displayAppointment?.clientPhone}
              </span>
            </div>
          )}

          {/* Treatment / Service & Assigned Stylist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3,12px)]">
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

          {/* Date, StartTime, Duration (editable), EndTime */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--s3,12px)] items-end">
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
            <LabelSelect
              field="StartTime"
              label={t('apt_field_start_time', language)}
              value={startTime}
              onChange={setStartTime}
              options={[
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
                '18:00', '18:30', '19:00', '19:30',
              ]}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="DurationMinutes"
              label={isAr ? 'المدة (دقيقة)' : isEn ? 'Duration (min)' : 'Durée (min)'}
              type="number"
              min={5}
              step={5}
              value={String(durationMinutes)}
              onChange={(val) => setDurationMinutes(Math.max(5, parseInt(val, 10) || 30))}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="EstimatedEnd"
              label={t('apt_field_estimated_end', language)}
              type="text"
              value={calculatedEndTime}
              onChange={() => {}}
              disabled
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          {/* Availability & Conflict Banner */}
          {!availability.available && (
            <div
              role="alert"
              data-testid="apt-availability-warning"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 t-small space-y-1"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={15} />
                <span>
                  {availability.issues.includes('APPOINTMENT_OVERLAP')
                    ? isEn
                      ? `Double-booking blocked: conflicts with ${availability.overlappingAppointment?.clientName} (${availability.overlappingAppointment?.startTime}-${availability.overlappingAppointment?.endTime}).`
                      : `Chevauchement détecté : conflit avec ${availability.overlappingAppointment?.clientName} (${availability.overlappingAppointment?.startTime}-${availability.overlappingAppointment?.endTime}).`
                    : isEn
                    ? 'Stylist Schedule Warning'
                    : 'Alerte Disponibilité Praticienne'}
                </span>
              </div>
              {availability.issues.includes('EXCEEDS_CLOSING_TIME') && (
                <p className="t-cap">
                  {isEn
                    ? `Ends at ${availability.closingCheck.endTime}, past closing time (${availability.closingCheck.closingTime}).`
                    : `Fin prévue à ${availability.closingCheck.endTime}, après la fermeture (${availability.closingCheck.closingTime}).`}
                </p>
              )}
              {availability.issues.includes('TIME_OFF') && (
                <p className="t-cap">{isEn ? 'Stylist is marked on time-off on this date.' : 'La praticienne est en congé à cette date.'}</p>
              )}
              {availability.issues.includes('DAY_OFF') && (
                <p className="t-cap">{isEn ? 'Selected day is marked as Day Off for this stylist.' : 'Jour de repos hebdomadaire pour cette praticienne.'}</p>
              )}
              {availability.issues.includes('IN_BREAK_WINDOW') && (
                <p className="t-cap">{isEn ? 'Overlaps stylist break window.' : 'Chevauche la pause déjeuner de la praticienne.'}</p>
              )}
              {availability.issues.includes('OUTSIDE_WORKING_HOURS') && (
                <p className="t-cap">{isEn ? 'Outside stylist configured shift hours.' : 'Hors des horaires de travail configurés.'}</p>
              )}
            </div>
          )}

          {/* Allergy Conflict Guard */}
          {allergyConflict.hasConflict && (
            <div
              role="alert"
              data-testid="apt-allergy-alert"
              className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 space-y-2"
            >
              <div className="flex items-center gap-2 t-small font-semibold">
                <ShieldAlert size={16} />
                <span>
                  {isEn ? 'Client Allergy Alert:' : 'Alerte Allergie Cliente :'}{' '}
                  {allergyConflict.matchedKeywords.join(', ')}
                </span>
              </div>
              <label className="flex items-center gap-2 t-cap font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={allergyOverrideConfirmed}
                  onChange={(e) => setAllergyOverrideConfirmed(e.target.checked)}
                  className="rounded accent-[#d4522f]"
                />
                <span>
                  {isEn
                    ? 'Confirm practitioner verified patch test / approved override'
                    : 'Confirmer vérification patch-test / dérogation praticienne'}
                </span>
              </label>
            </div>
          )}

          {/* Consent Warning when service requires consent */}
          {activeService?.requiresConsent && !hasConsentSigned && (
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 t-small flex items-center gap-2">
              <FileCheck2 size={15} />
              <span>
                {isEn
                  ? 'This treatment requires a signed consent form (Services → Tattoo & Laser Consent).'
                  : 'Ce soin requiert une décharge signée (Soins → Consentement Tatouage & Laser).'}
              </span>
            </div>
          )}

          {/* Price, Status, Channel, Deposit & Cutoff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3,12px)] items-end">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3,12px)] items-end">
            <LabelSelect
              field="BookingChannel"
              label={isEn ? 'Booking Channel' : 'Canal de réservation'}
              value={bookingMode === 'walkin' ? 'walkin' : bookingChannel}
              onChange={(v) => setBookingChannel(v as 'desk' | 'online' | 'whatsapp' | 'walkin')}
              options={[
                { value: 'desk', label: isEn ? 'Reception Desk' : 'Comptoir' },
                { value: 'online', label: isEn ? 'Online Link' : 'Lien en ligne' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'walkin', label: isEn ? 'Walk-in' : 'Sans RDV' },
              ]}
              width="100%"
              height={38}
              corner={10}
            />
            <LabelInput
              field="DepositDzd"
              label={isEn ? 'Deposit Held (DZD)' : 'Acompte versé (DZD)'}
              type="number"
              min={0}
              step={500}
              value={depositDzd}
              onChange={setDepositDzd}
              width="100%"
              height={38}
              corner={10}
            />
            <LabelInput
              field="CutoffHours"
              label={isEn ? 'Cancel Cutoff (hrs)' : 'Délai annulation (h)'}
              type="number"
              min={0}
              value={cutoffHours}
              onChange={setCutoffHours}
              width="100%"
              height={38}
              corner={10}
            />
          </div>

          {cancellationPolicyPreview && (status === 'Cancelled' || status === 'NoShow') && (
            <div className="p-2.5 rounded-xl bg-[#F5F1EC] dark:bg-[#22201E] t-small text-black dark:text-white">
              {cancellationPolicyPreview.depositStatus === 'refunded'
                ? isEn
                  ? `Held deposit of ${formatMoney(centimesToDzd(cancellationPolicyPreview.refundedDepositCentimes))} will be refunded (outside cutoff window).`
                  : `L'acompte de ${formatMoney(centimesToDzd(cancellationPolicyPreview.refundedDepositCentimes))} sera remboursé (hors délai).`
                : isEn
                ? `Held deposit of ${formatMoney(centimesToDzd(cancellationPolicyPreview.forfeitedDepositCentimes))} will be forfeited.`
                : `L'acompte de ${formatMoney(centimesToDzd(cancellationPolicyPreview.forfeitedDepositCentimes))} sera retenu.`}
            </div>
          )}

          {/* Treatment Notes */}
          <LabelTextarea
            label={t('apt_field_notes', language)}
            value={notes}
            onChange={setNotes}
            rows={2}
            placeholder={t('apt_ph_notes', language)}
          />

          {/* Online Link & WhatsApp Quick Share + Submit */}
          <div className="pt-[var(--s4,16px)] flex flex-wrap items-center justify-between gap-[var(--s3,12px)] border-t border-[var(--atr-divider)]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyBookingLink}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#F5F1EC] dark:bg-[#2A2724] t-cap font-semibold text-black dark:text-white hover:bg-[#EAE3DB] cursor-pointer"
              >
                <Copy size={13} />
                <span>{isEn ? 'Copy Online Link' : 'Copier lien RDV'}</span>
              </button>
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 t-cap font-semibold hover:bg-emerald-500/25"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </a>
            </div>

            <div className="flex items-center gap-[var(--s3,12px)]">
              <Button type="button" tone="soft" onClick={onClose}>
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
          </div>
        </form>
      </div>
    </Modal>
  );
};


