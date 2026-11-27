import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  PenTool,
  CalendarRange,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentRentableUnitsFromState,
  selectCurrentRentalRentersFromState,
  selectCurrentRentalBookingsFromState,
  selectCurrentRentalPricingRulesFromState,
  selectCurrentRentalContractTemplatesFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import {
  RentalBooking,
  BookingAddon,
  BookingStatus,
  DepositStatus,
} from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import {
  buildWeddingPaymentSchedule,
  computeRentalDurationHours,
  computeRentalPricingWithRules,
  detectRentalBookingOverlap,
  resolveUnitRentalMode,
} from '../../../utils/rentalDepth';
import { useTranslation } from '../../../utils/useTranslation';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

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
    rentalBookings,
    rentalPricingRules,
    rentalContractTemplates,
  } = useAtriumSelector(
    (s) => ({
      rentableUnits: selectCurrentRentableUnitsFromState(s),
      rentalRenters: selectCurrentRentalRentersFromState(s),
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      rentalPricingRules: selectCurrentRentalPricingRulesFromState(s),
      rentalContractTemplates: selectCurrentRentalContractTemplatesFromState(s),
    }),
    shallowEqualObjects
  );
  const { createRentalBooking, updateRentalBooking, createRentalRenter } = useAtriumActions();

  const todayStr = initialDate || new Date().toISOString().split('T')[0];
  const startHourStr = initialStartTime || '14:00';

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
  const [endDate, setEndDate] = useState(todayStr);
  const [endTime, setEndTime] = useState('18:00');
  const [attendeeCount, setAttendeeCount] = useState(25);
  const [status, setStatus] = useState<BookingStatus>('Confirmed');
  const [contractSigned, setContractSigned] = useState(true);
  const [contractTemplateId, setContractTemplateId] = useState<string>('');
  const [contractSignerName, setContractSignerName] = useState<string>('');
  const [contractSignatureData, setContractSignatureData] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(20000);
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('Held');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [selectedPricingRuleId, setSelectedPricingRuleId] = useState<string>('');
  const [useWeddingSchedule, setUseWeddingSchedule] = useState<boolean>(false);

  // Vehicle / Fleet / Gear inspection fields
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState('');
  const [mileageOut, setMileageOut] = useState<string>('');
  const [fuelOutPct, setFuelOutPct] = useState<string>('');

  // Addons State
  const [addons, setAddons] = useState<BookingAddon[]>([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState<number>(5000);

  // Signature pad SVG stroke state
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const sigSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

  useEffect(() => {
    if (initialRenterId) {
      setSelectedRenterId(initialRenterId);
      const r = rentalRenters.find((item) => item.id === initialRenterId);
      if (r) {
        setRenterName(r.fullName);
        setRenterPhone(r.phone);
        setRenterEmail(r.email || '');
        setRenterCompany(r.companyName || '');
        setDriverLicenseNumber(r.driverLicenseNumber || '');
        setDriverLicenseExpiry(r.driverLicenseExpiry || '');
        setContractSignerName(r.fullName);
      }
    }
  }, [initialRenterId, rentalRenters]);

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
      const eDate = bookingToEdit.endDateTime.split('T')[0] || sDate;
      const eTime = bookingToEdit.endDateTime.split('T')[1]?.slice(0, 5) || '18:00';

      setStartDate(sDate);
      setStartTime(sTime);
      setEndDate(eDate);
      setEndTime(eTime);
      setAttendeeCount(bookingToEdit.attendeeCount);
      setStatus(bookingToEdit.status);
      setContractSigned(bookingToEdit.contractSigned);
      setContractTemplateId(bookingToEdit.contractTemplateId || '');
      setContractSignerName(bookingToEdit.contractSignerName || bookingToEdit.renterName);
      setContractSignatureData(bookingToEdit.contractSignatureData || '');
      setDepositAmount(bookingToEdit.depositAmount);
      setDepositStatus(bookingToEdit.depositStatus);
      setPaidAmount(bookingToEdit.paidAmount);
      setNotes(bookingToEdit.notes || '');
      setAddons(bookingToEdit.addons || []);
      setSelectedPricingRuleId(bookingToEdit.seasonalRuleId || '');
      setUseWeddingSchedule(Boolean(bookingToEdit.stagedPaymentSchedule?.length));
      setDriverLicenseNumber(bookingToEdit.driverLicenseNumber || '');
      setDriverLicenseExpiry(bookingToEdit.driverLicenseExpiry || '');
      setMileageOut(
        bookingToEdit.mileageOut !== undefined ? String(bookingToEdit.mileageOut) : ''
      );
      setFuelOutPct(
        bookingToEdit.fuelOutPct !== undefined ? String(bookingToEdit.fuelOutPct) : ''
      );
    } else {
      const defUnit =
        rentableUnits.find((u) => u.id === (initialUnitId || selectedUnitId)) ||
        rentableUnits[0];
      if (rentableUnits.length > 0 && !initialUnitId) {
        setSelectedUnitId(rentableUnits[0].id);
      }
      const d = initialDate || new Date().toISOString().split('T')[0];
      setRenterName('');
      setRenterPhone('');
      setRenterEmail('');
      setRenterCompany('');
      setPurpose('');
      setStartDate(d);
      setEndDate(d);
      setStartTime(initialStartTime || '14:00');
      setEndTime('18:00');
      setAttendeeCount(20);
      setStatus('Confirmed');
      setContractSigned(true);
      setContractTemplateId('');
      setContractSignerName('');
      setContractSignatureData('');
      setDepositAmount(20000);
      setDepositStatus('Held');
      setPaidAmount(0);
      setNotes('');
      setAddons([]);
      setSelectedPricingRuleId('');
      setUseWeddingSchedule(false);
      setDriverLicenseNumber('');
      setDriverLicenseExpiry('');
      setMileageOut(defUnit?.odometerKm !== undefined ? String(defUnit.odometerKm) : '');
      setFuelOutPct(defUnit?.fuelLevelPct !== undefined ? String(defUnit.fuelLevelPct) : '');
    }
  }, [bookingToEdit, isOpen]);

  const handleSelectRenter = (renterId: string) => {
    setSelectedRenterId(renterId);
    const renter = rentalRenters.find((r) => r.id === renterId);
    if (renter) {
      setRenterName(renter.fullName);
      setRenterPhone(renter.phone);
      setRenterEmail(renter.email);
      setRenterCompany(renter.companyName || '');
      setDriverLicenseNumber(renter.driverLicenseNumber || '');
      setDriverLicenseExpiry(renter.driverLicenseExpiry || '');
      if (!contractSignerName) setContractSignerName(renter.fullName);
    }
  };

  const selectedUnit =
    rentableUnits.find((u) => u.id === selectedUnitId) || rentableUnits[0];
  const unitMode = resolveUnitRentalMode(selectedUnit);

  const startDateTime = `${startDate}T${startTime}:00Z`;
  const endDateTime = `${endDate}T${endTime}:00Z`;

  const durationMeta = useMemo(
    () => computeRentalDurationHours(startDateTime, endDateTime),
    [startDateTime, endDateTime]
  );

  const overlapResult = useMemo(
    () =>
      detectRentalBookingOverlap(
        {
          id: bookingToEdit?.id,
          unitId: selectedUnit?.id || '',
          startDateTime,
          endDateTime,
          status,
        },
        rentalBookings
      ),
    [bookingToEdit?.id, selectedUnit?.id, startDateTime, endDateTime, status, rentalBookings]
  );

  const pricingBreakdown = useMemo(
    () =>
      computeRentalPricingWithRules({
        unit: selectedUnit,
        startDateTime,
        endDateTime,
        pricingRules: rentalPricingRules,
        addons,
        overrideRuleId: selectedPricingRuleId || undefined,
      }),
    [selectedUnit, startDateTime, endDateTime, rentalPricingRules, addons, selectedPricingRuleId]
  );

  const durationHours = durationMeta.valid ? durationMeta.durationHours : 0;
  const baseAmount = pricingBreakdown.adjustedBaseDzd;
  const addonsTotal = pricingBreakdown.addonsTotalDzd;
  const totalAmount = pricingBreakdown.totalDzd;
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  const stagedSchedulePreview = useMemo(() => {
    if (!useWeddingSchedule) return undefined;
    return buildWeddingPaymentSchedule({
      totalAmountDzd: totalAmount,
      eventDate: startDate,
    });
  }, [useWeddingSchedule, totalAmount, startDate]);

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

  const getRelativePoint = (e: React.PointerEvent<SVGSVGElement>): [number, number] | null => {
    const svg = sigSvgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 320);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 80);
    return [Math.max(0, Math.min(320, x)), Math.max(0, Math.min(80, y))];
  };

  const handleSigPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getRelativePoint(e);
    if (!pt) return;
    setIsDrawingSig(true);
    setContractSignatureData((prev) => `${prev ? `${prev} ` : ''}M${pt[0]},${pt[1]}`);
  };

  const handleSigPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingSig) return;
    const pt = getRelativePoint(e);
    if (!pt) return;
    setContractSignatureData((prev) => `${prev} L${pt[0]},${pt[1]}`);
  };

  const handleSigPointerUp = () => {
    if (isDrawingSig) setIsDrawingSig(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (overlapResult.hasOverlap) {
      showToast({
        type: 'error',
        title: t('venue_depth_overlap_title'),
        message:
          overlapResult.reasonCode === 'INVALID_WINDOW'
            ? t('venue_depth_invalid_window_msg')
            : t('venue_depth_overlap_msg'),
      });
      return;
    }
    if (!renterName.trim()) {
      showToast({
        type: 'warning',
        title:
          language === 'ar'
            ? 'اسم المستأجر مفقود'
            : language === 'fr'
            ? 'Nom du locataire manquant'
            : 'Missing Renter Name',
        message:
          language === 'ar'
            ? 'يرجى تقديم اسم الزبون أو الهيئة المستأجرة.'
            : language === 'fr'
            ? "Veuillez renseigner le nom du client ou de l'organisation."
            : 'Please provide the client name or organization for this reservation.',
      });
      return;
    }
    if (!purpose.trim()) {
      showToast({
        type: 'warning',
        title:
          language === 'ar'
            ? 'طبيعة المناسبة مفقودة'
            : language === 'fr'
            ? "Motif de l'événement manquant"
            : 'Missing Event Purpose',
        message:
          language === 'ar'
            ? 'يرجى وصف طبيعة النشاط أو الفعالية.'
            : language === 'fr'
            ? 'Veuillez préciser la nature de la réservation.'
            : 'Please describe the event or rental purpose.',
      });
      return;
    }
    if (!selectedUnit) {
      showToast({
        type: 'warning',
        title:
          language === 'ar'
            ? 'لم يتم اختيار فضاء'
            : language === 'fr'
            ? 'Aucun espace sélectionné'
            : 'No Space Selected',
        message:
          language === 'ar'
            ? 'يرجى اختيار قاعة أو فضاء متاح.'
            : language === 'fr'
            ? 'Veuillez choisir une salle ou un espace disponible.'
            : 'Please pick an available room, hall, or unit.',
      });
      return;
    }

    let saveSucceeded = false;
    const signerClean = (contractSignerName || renterName).trim();
    const signatureTimestamp =
      contractSigned && (signerClean || contractSignatureData)
        ? bookingToEdit?.contractSignedAt || new Date().toISOString()
        : undefined;

    const commitBooking = () => {
      let targetRenterId = selectedRenterId;
      if (!targetRenterId) {
        const newRenter = createRentalRenter({
          fullName: renterName.trim(),
          companyName: renterCompany.trim() || undefined,
          email:
            renterEmail.trim() ||
            `${renterName.toLowerCase().replace(/\s+/g, '.')}@client.local`,
          phone: renterPhone.trim() || '+213 550 00 00 00',
          driverLicenseNumber: driverLicenseNumber.trim() || undefined,
          driverLicenseExpiry: driverLicenseExpiry.trim() || undefined,
          currency: selectedUnit.currency || 'DZD',
        });
        targetRenterId = newRenter.id;
      }

      const commonFields = {
        unitId: selectedUnit.id,
        unitName: selectedUnit.name,
        unitType: selectedUnit.type,
        rentalMode: unitMode,
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
        contractTemplateId: contractTemplateId || undefined,
        contractSignerName: signerClean || undefined,
        contractSignatureData: contractSignatureData || undefined,
        contractSignedAt: signatureTimestamp,
        pricingBreakdown,
        seasonalRuleId: selectedPricingRuleId || pricingBreakdown.appliedRuleId,
        stagedPaymentSchedule: stagedSchedulePreview,
        driverLicenseNumber: driverLicenseNumber.trim() || undefined,
        driverLicenseExpiry: driverLicenseExpiry.trim() || undefined,
        mileageOut: mileageOut.trim() !== '' ? Number(mileageOut) : undefined,
        fuelOutPct: fuelOutPct.trim() !== '' ? Number(fuelOutPct) : undefined,
        notes: notes.trim() || undefined,
      };

      if (bookingToEdit) {
        saveSucceeded = updateRentalBooking(bookingToEdit.id, commonFields);
      } else {
        const created = createRentalBooking(commonFields);
        saveSucceeded = Boolean(created);
      }
    };

    if (!selectedRenterId) {
      runUndoBatch(
        {
          vertical: 'rental_booking',
          operationType: bookingToEdit ? 'edit' : 'create',
          summary: bookingToEdit
            ? language === 'ar'
              ? `تعديل حجز: ${purpose.trim()}`
              : language === 'fr'
              ? `Modification réservation : ${purpose.trim()}`
              : `Update booking: ${purpose.trim()}`
            : language === 'ar'
            ? `حجز جديد: ${purpose.trim()}`
            : language === 'fr'
            ? `Nouvelle réservation : ${purpose.trim()}`
            : `New booking: ${purpose.trim()}`,
          entityLabel: purpose.trim(),
        },
        commitBooking
      );
    } else {
      commitBooking();
    }

    if (saveSucceeded) {
      onClose();
    }
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      zIndexClass="z-[9990]"
      scrimClassName="bg-black/60"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-[var(--atr-divider)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="t-dialog font-semibold text-black dark:text-white">
              {bookingToEdit ? t('venue_modal_edit_title') : t('venue_modal_new_title')}
            </h2>
            {durationMeta.spansMultipleDays && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full t-cap font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                <CalendarRange size={12} />
                {t('venue_depth_overnight_badge')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-sq="ctl"
            data-sq-border="none"
            className="p-2 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {overlapResult.hasOverlap && (
            <div
              role="alert"
              data-sq="card"
              data-sq-border="solid"
              className="p-3.5 bg-red-50 dark:bg-red-950/50 [--sq-stroke:#ef4444] text-red-700 dark:text-red-200 flex items-start gap-3"
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="space-y-0.5 t-cap">
                <div className="font-semibold">{t('venue_depth_overlap_title')}</div>
                <div>
                  {overlapResult.reasonCode === 'INVALID_WINDOW'
                    ? t('venue_depth_invalid_window_msg')
                    : `${t('venue_depth_overlap_msg')}${
                        overlapResult.conflictingBooking
                          ? ` (${overlapResult.conflictingBooking.renterName}: ${overlapResult.conflictingBooking.startDateTime.slice(0, 16)} → ${overlapResult.conflictingBooking.endDateTime.slice(0, 16)})`
                          : ''
                      }`}
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Space & Multi-Day Time Window */}
          <div className="space-y-4">
            <h3 className="t-small font-semibold text-black/55 dark:text-white/55">
              {t('venue_modal_sec_space')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabelSelect
                  field="BookableSpace"
                  label={t('venue_modal_field_space')}
                  value={selectedUnitId}
                  onChange={setSelectedUnitId}
                  options={rentableUnits.map((u) => ({
                    value: u.id,
                    label: u.name,
                    sublabel: `${u.type}${u.plateNumber ? ` · ${u.plateNumber}` : ''} · ${formatCurrencyAmount(u.hourlyRate, u.currency)}/h`,
                  }))}
                  searchable
                  width="100%"
                  height={40}
                  corner={12}
                  required
                />
              </div>

              <div>
                <LabelSelect
                  field="PricingRule"
                  label={t('venue_depth_pricing_rule_label')}
                  value={selectedPricingRuleId}
                  onChange={setSelectedPricingRuleId}
                  options={[
                    { value: '', label: t('venue_depth_auto_rule_opt') },
                    ...rentalPricingRules
                      .filter((r) => r.isActive)
                      .map((r) => ({
                        value: r.id,
                        label: r.name,
                        sublabel: `WKND ×${r.weekendMultiplier} · SEAS ×${r.seasonalMultiplier}`,
                      })),
                  ]}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <LabelInput
                id="booking-start-date"
                label={t('venue_modal_field_date')}
                type="date"
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  if (v > endDate) setEndDate(v);
                }}
                required
              />

              <LabelInput
                id="booking-end-date"
                label={t('venue_depth_field_end_date')}
                type="date"
                value={endDate}
                onChange={setEndDate}
                required
              />

              <LabelInput
                id="booking-start-time"
                label={t('venue_modal_field_start_time')}
                type="time"
                value={startTime}
                onChange={setStartTime}
                required
              />

              <LabelInput
                id="booking-end-time"
                label={`${t('venue_modal_field_end_time')} (${t('venue_modal_duration_label', { hours: durationHours })})`}
                type="time"
                value={endTime}
                onChange={setEndTime}
                required
              />
            </div>
          </div>

          {/* Section 2: Renter & Event Details */}
          <div className="space-y-4 pt-4 border-t border-[var(--atr-divider)]">
            <h3 className="t-small font-semibold text-black/55 dark:text-white/55">
              {t('venue_modal_sec_renter')}
            </h3>

            {rentalRenters.length > 0 && !bookingToEdit && (
              <div>
                <LabelSelect
                  field="ExistingRenter"
                  label={t('venue_modal_select_existing')}
                  value={selectedRenterId}
                  onChange={handleSelectRenter}
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
                  height={40}
                  corner={12}
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
                  onChange={(val) => setAttendeeCount(Number(val) || 1)}
                />
                {selectedUnit?.capacity && attendeeCount > selectedUnit.capacity && (
                  <p className="t-cap text-amber-500 mt-1">
                    Exceeds nominal space capacity ({selectedUnit.capacity} max).
                  </p>
                )}
              </div>

              <div>
                <LabelSelect
                  field="ReservationStatus"
                  label={t('venue_modal_field_status')}
                  value={status}
                  onChange={(val) => setStatus(val as BookingStatus)}
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

            {(unitMode === 'vehicle' || unitMode === 'gear') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {unitMode === 'vehicle' && (
                  <>
                    <LabelInput
                      id="booking-driver-license"
                      label={t('venue_depth_driver_license')}
                      value={driverLicenseNumber}
                      onChange={setDriverLicenseNumber}
                      placeholder="16/123456-B"
                    />
                    <LabelInput
                      id="booking-driver-license-exp"
                      label={t('venue_depth_driver_license_exp')}
                      type="date"
                      value={driverLicenseExpiry}
                      onChange={setDriverLicenseExpiry}
                    />
                    <LabelInput
                      id="booking-odometer-out"
                      label={t('venue_depth_odometer_out')}
                      type="number"
                      value={mileageOut}
                      onChange={setMileageOut}
                    />
                    <LabelInput
                      id="booking-fuel-out"
                      label={t('venue_depth_fuel_out')}
                      type="number"
                      min="0"
                      max="100"
                      value={fuelOutPct}
                      onChange={setFuelOutPct}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Add-on Equipment & Services */}
          <div className="space-y-4 pt-4 border-t border-[var(--atr-divider)]">
            <h3 className="t-small font-semibold text-black/55 dark:text-white/55">
              {t('venue_modal_sec_addons')}
            </h3>

            {addons.length > 0 && (
              <div className="space-y-2">
                {addons.map((a) => (
                  <div
                    key={a.id}
                    data-sq="ctl"
                    data-sq-border="none"
                    className="flex items-center justify-between p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap"
                  >
                    <div>
                      <span className="font-medium text-black dark:text-white">{a.name}</span>
                      <span className="text-black/55 dark:text-white/75 ml-2">
                        {formatCurrencyAmount(a.unitPrice, selectedUnit?.currency)} × {a.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-black dark:text-white tabular-nums">
                        {formatCurrencyAmount(a.totalPrice, selectedUnit?.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(a.id)}
                        className="text-black/55 dark:text-white/55 hover:text-red-500 transition-colors cursor-pointer"
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
                  height={40}
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
                  onChange={(val) => setNewAddonPrice(Number(val) || 0)}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <button
                type="button"
                onClick={handleAddAddon}
                data-sq="ctl"
                data-sq-border="none"
                className="w-full sm:w-auto h-[40px] px-4 bg-[#F5F1EC] hover:bg-[#EFE9E2] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] t-small font-medium text-black dark:text-white transition-colors flex items-center justify-center gap-2 shrink-0 mt-3 sm:mt-0 cursor-pointer"
              >
                <Plus size={14} /> {t('venue_modal_btn_add_addon').replace(/^\+\s*/, '')}
              </button>
            </div>
          </div>

          {/* Section 4: Caution, Pricing Rules, Wedding Schedule & Signature */}
          <div className="space-y-4 pt-4 border-t border-[var(--atr-divider)]">
            <h3 className="t-small font-semibold text-black/55 dark:text-white/55">
              {t('venue_modal_sec_financials')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <LabelInput
                  id="booking-deposit"
                  label={t('venue_modal_field_deposit')}
                  type="number"
                  value={depositAmount}
                  onChange={(val) => setDepositAmount(Number(val) || 0)}
                />
              </div>

              <div>
                <LabelSelect
                  field="EscrowStatus"
                  label={t('venue_modal_field_deposit_status')}
                  value={depositStatus}
                  onChange={(val) => setDepositStatus(val as DepositStatus)}
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
                  onChange={(val) => setPaidAmount(Number(val) || 0)}
                />
              </div>
            </div>

            <div
              data-sq="card"
              data-sq-border="none"
              className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2 t-cap"
            >
              <div className="flex justify-between text-black/70 dark:text-white/75">
                <span>{t('venue_modal_calc_space_base', { hours: durationHours })}</span>
                <span className="font-medium text-black dark:text-white tabular-nums">
                  {formatCurrencyAmount(baseAmount, selectedUnit?.currency)}
                </span>
              </div>
              {(pricingBreakdown.weekendMultiplier !== 1 ||
                pricingBreakdown.seasonalMultiplier !== 1 ||
                pricingBreakdown.appliedRuleName) && (
                <div className="flex justify-between text-black/60 dark:text-white/65">
                  <span>
                    {pricingBreakdown.appliedRuleName || t('venue_depth_pricing_rule_label')} (
                    {t('venue_depth_weekend_mult')} ×{pricingBreakdown.weekendMultiplier} ·{' '}
                    {t('venue_depth_seasonal_mult')} ×{pricingBreakdown.seasonalMultiplier})
                  </span>
                  <span className="tabular-nums">
                    {pricingBreakdown.weekendHours}h wknd
                  </span>
                </div>
              )}
              {addonsTotal > 0 && (
                <div className="flex justify-between text-black/70 dark:text-white/75">
                  <span>{t('venue_modal_calc_addons')}</span>
                  <span className="font-medium text-black dark:text-white tabular-nums">
                    +{formatCurrencyAmount(addonsTotal, selectedUnit?.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-black dark:text-white pt-2 border-t border-[var(--atr-divider)]">
                <span>{t('venue_modal_calc_total')}</span>
                <span className="t-body tabular-nums">
                  {formatCurrencyAmount(totalAmount, selectedUnit?.currency)}
                </span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/75 t-cap">
                <span>{t('venue_voucher_balance_due')}</span>
                <span
                  className={`font-semibold tabular-nums ${
                    balanceDue > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrencyAmount(balanceDue, selectedUnit?.currency)}
                </span>
              </div>
            </div>

            {/* Wedding Staged Schedule Toggle */}
            <div
              className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)]"
              data-sq="ctl"
              data-sq-border="none"
            >
              <span className="t-cap font-medium text-black/75 dark:text-white/80">
                {t('venue_depth_wedding_schedule_toggle')}
              </span>
              <LiveSwitch
                checked={useWeddingSchedule}
                onCheckedChange={setUseWeddingSchedule}
                aria-label={t('venue_depth_wedding_schedule_toggle')}
              />
            </div>

            {stagedSchedulePreview && stagedSchedulePreview.length > 0 && (
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] space-y-1.5 t-cap"
              >
                <div className="font-semibold text-black dark:text-white">
                  {t('venue_depth_wedding_schedule_title')}
                </div>
                {stagedSchedulePreview.map((stg) => (
                  <div
                    key={stg.id}
                    className="flex justify-between text-black/75 dark:text-white/75 tabular-nums"
                  >
                    <span>
                      {stg.label} ({stg.dueDate})
                    </span>
                    <span className="font-semibold">
                      {formatCurrencyAmount(stg.amountDzd, selectedUnit?.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Contract Template & E-Signature */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LabelSelect
                  field="ContractTemplate"
                  label={t('venue_depth_contract_template')}
                  value={contractTemplateId}
                  onChange={setContractTemplateId}
                  options={[
                    { value: '', label: t('venue_depth_default_template') },
                    ...rentalContractTemplates.map((tpl) => ({
                      value: tpl.id,
                      label: tpl.name,
                      sublabel: tpl.rentalMode,
                    })),
                  ]}
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  id="booking-signer-name"
                  label={t('venue_depth_signer_name')}
                  value={contractSignerName}
                  onChange={setContractSignerName}
                  placeholder={renterName || 'Signer full name'}
                />
              </div>

              <div
                className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)]"
                data-sq="ctl"
                data-sq-border="none"
              >
                <span className="t-cap font-medium text-black/75 dark:text-white/80">
                  {t('venue_modal_field_contract_signed')}
                </span>
                <LiveSwitch
                  checked={contractSigned}
                  onCheckedChange={setContractSigned}
                  aria-label={t('venue_modal_field_contract_signed')}
                />
              </div>

              {contractSigned && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between t-cap text-black/65 dark:text-white/65">
                    <span className="flex items-center gap-1.5 font-medium">
                      <PenTool size={13} /> {t('venue_depth_signature_pad')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setContractSignatureData('')}
                      className="text-black/60 hover:text-[#d4522f] cursor-pointer"
                    >
                      {t('venue_depth_clear_sig')}
                    </button>
                  </div>
                  <svg
                    ref={sigSvgRef}
                    viewBox="0 0 320 80"
                    onPointerDown={handleSigPointerDown}
                    onPointerMove={handleSigPointerMove}
                    onPointerUp={handleSigPointerUp}
                    onPointerLeave={handleSigPointerUp}
                    className="w-full h-20 bg-[#F5F1EC] dark:bg-[#191716] border border-[var(--atr-divider)] rounded-lg touch-none cursor-crosshair"
                  >
                    {contractSignatureData && (
                      <path
                        d={contractSignatureData}
                        fill="none"
                        stroke="#d4522f"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-[var(--atr-divider)] flex items-center justify-between shrink-0 bg-[#F5F1EC]/60 dark:bg-[#22201E]">
          <AtriumButton type="button" variant="ghost" onClick={onClose}>
            {t('action_cancel')}
          </AtriumButton>
          <AtriumButton
            type="button"
            variant="primary"
            glow
            disabled={overlapResult.hasOverlap}
            icon={<Check size={15} />}
            onClick={handleSubmit}
          >
            {bookingToEdit ? t('action_save') : t('venue_reserve_space')}
          </AtriumButton>
        </div>
      </div>
    </KineticModalShell>
  );
};
