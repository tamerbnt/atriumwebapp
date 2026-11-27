import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Plus, X, XCircle } from 'lucide-react';
import { Button } from '@/atrium/core';
import {
  useAtriumActions,
  useAtriumSelector,
  selectCurrentMembersFromState,
  selectCurrentRentableUnitsFromState,
  selectCurrentRentalBookingsFromState,
  shallowEqualObjects,
  showToast,
} from '../../../services/store';
import { isGymCourtOrResourceUnit } from '../../../utils/membershipDepth';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic/KineticEmptyStateMotion';

export const MembershipCourtsPanel: React.FC<{ language: string }> = ({ language }) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { rentableUnits, rentalBookings, members } = useAtriumSelector(
    (s) => ({
      rentableUnits: selectCurrentRentableUnitsFromState(s),
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      members: selectCurrentMembersFromState(s),
    }),
    shallowEqualObjects
  );
  const { createRentableUnit, createRentalBooking, updateRentalBooking } = useAtriumActions();

  const courtUnits = useMemo(
    () => rentableUnits.filter((u) => isGymCourtOrResourceUnit(u)),
    [rentableUnits]
  );

  const courtUnitIds = useMemo(() => new Set(courtUnits.map((u) => u.id)), [courtUnits]);
  const courtBookings = useMemo(
    () => rentalBookings.filter((b) => courtUnitIds.has(b.unitId)),
    [rentalBookings, courtUnitIds]
  );

  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [unitName, setUnitName] = useState('Padel Court 1');
  const [unitType, setUnitType] = useState<'court' | 'lane' | 'studio'>('court');
  const [hourlyRate, setHourlyRate] = useState('3500');

  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [renterName, setRenterName] = useState('');
  const [renterPhone, setRenterPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [bookingAmount, setBookingAmount] = useState('3500');

  const openBookModal = (unitId?: string) => {
    const target = courtUnits.find((u) => u.id === unitId) || courtUnits[0];
    setSelectedUnitId(target?.id || '');
    setBookingAmount(String(target?.hourlyRate || target?.dailyRate || 3500));
    setRenterName(members[0]?.fullName || '');
    setRenterPhone(members[0]?.phoneNumber || '');
    setIsAddBookingOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    const rate = Math.max(0, parseFloat(hourlyRate) || 3000);
    createRentableUnit({
      code: unitName.trim().slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'CRT1',
      name: unitName.trim(),
      description: `${unitType} · ${unitName.trim()}`,
      type: unitType as any,
      capacity: unitType === 'court' ? 4 : 6,
      hourlyRate: rate,
      dailyRate: rate * 6,
      currency: 'DZD',
      status: 'Available',
      amenities: ['Lighting', 'Locker access'],
    });
    showToast({
      type: 'success',
      title: L('Resource added', 'Terrain / espace ajouté', 'تمت إضافة المرفق'),
      message: unitName.trim(),
    });
    setIsAddUnitOpen(false);
  };

  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const unit = courtUnits.find((u) => u.id === selectedUnitId);
    if (!unit || !renterName.trim()) return;
    const amount = Math.max(0, parseFloat(bookingAmount) || unit.hourlyRate || 3000);
    const startDt = `${bookingDate}T${startTime}:00`;
    const endDt = `${bookingDate}T${endTime}:00`;
    const diffHours = Math.max(
      1,
      Math.round(((Date.parse(endDt) - Date.parse(startDt)) / 3600000) * 10) / 10 || 1
    );
    const matchedMember = members.find(
      (m) => m.fullName.toLowerCase() === renterName.trim().toLowerCase()
    );
    createRentalBooking({
      unitId: unit.id,
      unitName: unit.name,
      unitType: unit.type,
      renterId: matchedMember?.id || `walkin_${Date.now()}`,
      renterName: renterName.trim(),
      renterPhone: renterPhone.trim() || '—',
      purpose: `${unit.name} court reservation`,
      startDateTime: startDt,
      endDateTime: endDt,
      durationHours: diffHours,
      attendeeCount: unit.capacity || 2,
      baseAmount: amount,
      addonsAmount: 0,
      totalAmount: amount,
      depositAmount: 0,
      depositStatus: 'Pending',
      currency: 'DZD',
      status: 'Confirmed',
      paidAmount: 0,
      balanceDue: amount,
      addons: [],
      contractSigned: true,
    });
    setIsAddBookingOpen(false);
  };

  return (
    <div data-testid="membership-courts-panel" className="space-y-6">
      <ScreenPod>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--atr-divider)]">
          <div>
            <h2 className="t-card font-semibold text-black dark:text-white">
              {L('Courts, Lanes & Sports Resources', 'Terrains, Couloirs & Ressources', 'الملاعب والممرات والمرافق')}
            </h2>
            <p className="t-cap text-black/62 dark:text-white/65">
              {L(
                'Shared booking calendar for padel, tennis, pool lanes, and private studios.',
                'Réservations partagées : padel, tennis, couloirs piscine et studios privés.',
                'حجوزات مشتركة للملاعب، الممرات والاستوديوهات الخاصة.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" tone="soft" size={36} onClick={() => setIsAddUnitOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {L('Add Court / Resource', 'Ajouter Terrain / Zone', 'إضافة ملعب / مرفق')}
            </Button>
            {courtUnits.length > 0 && (
              <Button type="button" tone="accent" size={36} onClick={() => openBookModal()}>
                <Calendar className="w-4 h-4 mr-1" />
                {L('Book Slot', 'Réserver créneau', 'حجز فترة')}
              </Button>
            )}
          </div>
        </div>

        {courtUnits.length === 0 ? (
          <div className="py-8">
            <KineticEmptyStateMotion motionKey="courts-empty">
              <EmptyState
                variant="compact"
                tone="neutral"
                icon={<Calendar />}
                title={L('No sports courts configured yet', 'Aucun terrain ou ressource configuré', 'لا توجد ملاعب أو مرافق مضافة بعد')}
                description={L(
                  'Add your first padel court, pool lane, or studio to accept hourly bookings.',
                  'Ajoutez votre premier terrain de padel, couloir de nage ou studio pour ouvrir les réservations.',
                  'أضف أول ملعب بادل أو ممر سباحة لبدء الحجوزات بالساعة.'
                )}
                secondaryAction={{
                  label: L('Add Court / Resource', 'Ajouter Terrain', 'إضافة ملعب'),
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => setIsAddUnitOpen(true),
                }}
              />
            </KineticEmptyStateMotion>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {courtUnits.map((unit) => {
              const activeBookings = courtBookings.filter(
                (b) => b.unitId === unit.id && (b.status === 'Confirmed' || b.status === 'CheckedIn')
              ).length;
              return (
                <div
                  key={unit.id}
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-4 bg-[#FAF7F3] dark:bg-[#22201E] space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="t-small font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#2B2825] text-black/75 dark:text-white/80 uppercase">
                        {unit.type}
                      </span>
                      <span className="t-small font-semibold tabular-nums text-[var(--atr-acc,#d4522f)]">
                        {(unit.hourlyRate || unit.dailyRate || 0).toLocaleString()} DZD/h
                      </span>
                    </div>
                    <h3 className="t-label font-semibold text-black dark:text-white">{unit.name}</h3>
                    <p className="t-cap text-black/62 dark:text-white/65">
                      {activeBookings} {L('upcoming booking(s)', 'réservation(s) active(s)', 'حجز نشط')}
                    </p>
                  </div>
                  <Button type="button" tone="soft" size={32} onClick={() => openBookModal(unit.id)}>
                    {L('Book Slot', 'Réserver', 'حجز')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScreenPod>

      {courtBookings.length > 0 && (
        <ScreenPod>
          <h3 className="t-card font-semibold text-black dark:text-white mb-3">
            {L('Court & Resource Reservations', 'Réservations Terrains & Zones', 'سجل حجوزات الملاعب')}
          </h3>
          <div className="divide-y divide-[var(--atr-divider)]">
            {courtBookings.map((bk) => (
              <div
                key={bk.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="t-small font-semibold text-black dark:text-white">
                    {bk.unitName} · {bk.renterName}
                  </div>
                  <div className="t-cap text-black/62 dark:text-white/65 tabular-nums">
                    {bk.startDateTime.replace('T', ' ').slice(0, 16)} → {bk.endDateTime.slice(11, 16)} ·{' '}
                    {bk.totalAmount.toLocaleString()} DZD
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full t-small font-semibold ${
                      bk.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        : bk.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {bk.status}
                  </span>
                  {bk.status === 'Confirmed' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRentalBooking(bk.id, {
                          status: 'Completed',
                          paidAmount: bk.totalAmount,
                          balanceDue: 0,
                        })
                      }
                      className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30 cursor-pointer"
                      aria-label={L('Complete booking', 'Clôturer réservation', 'إتمام الحجز')}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {(bk.status === 'Confirmed' || bk.status === 'Tentative') && (
                    <button
                      type="button"
                      onClick={() => updateRentalBooking(bk.id, { status: 'Cancelled' })}
                      className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30 cursor-pointer"
                      aria-label={L('Cancel booking', 'Annuler réservation', 'إلغاء الحجز')}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScreenPod>
      )}

      <KineticModalShell
        isOpen={isAddUnitOpen}
        onClose={() => setIsAddUnitOpen(false)}
        maxWidthClass="max-w-sm"
        zIndexClass="z-50"
        scrimClassName="bg-[#1F1D1B]/45"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {L('Add Court / Resource', 'Nouveau Terrain / Zone', 'إضافة ملعب / مرفق')}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddUnitOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveUnit} className="space-y-4">
            <LabelInput
              field="courtName"
              label={L('Resource Name', 'Nom du terrain / zone', 'اسم الملعب أو المرفق')}
              value={unitName}
              onChange={setUnitName}
              required
            />
            <LabelSelect
              field="courtType"
              label={L('Type', 'Type', 'النوع')}
              value={unitType}
              onChange={(v) => setUnitType(v as any)}
              options={[
                { value: 'court', label: L('Padel / Tennis Court', 'Terrain Padel / Tennis', 'ملعب بادل / تنس') },
                { value: 'lane', label: L('Swimming Pool Lane', 'Couloir Piscine', 'ممر سباحة') },
                { value: 'studio', label: L('Private Studio / Zone', 'Studio / Ring Privé', 'استوديو / منطقة خاصة') },
              ]}
            />
            <LabelInput
              field="courtRate"
              label={L('Hourly Rate (DZD)', 'Tarif horaire (DZD)', 'السعر بالساعة (دج)')}
              type="number"
              value={hourlyRate}
              onChange={setHourlyRate}
              required
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsAddUnitOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {L('Save', 'Enregistrer', 'حفظ')}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={isAddBookingOpen}
        onClose={() => setIsAddBookingOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-[#1F1D1B]/45"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {L('Book Court / Resource', 'Réserver Terrain / Zone', 'حجز ملعب أو مرفق')}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddBookingOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-black/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveBooking} className="space-y-4">
            <LabelSelect
              field="courtUnit"
              label={L('Court / Resource', 'Terrain / Ressource', 'الملعب / المرفق')}
              value={selectedUnitId}
              onChange={setSelectedUnitId}
              options={courtUnits.map((u) => ({ value: u.id, label: u.name }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput
                field="renterName"
                label={L('Member / Guest', 'Adhérent / Client', 'العضو / الزبون')}
                value={renterName}
                onChange={setRenterName}
                required
              />
              <LabelInput
                field="renterPhone"
                label={L('Phone', 'Téléphone', 'الهاتف')}
                value={renterPhone}
                onChange={setRenterPhone}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LabelInput
                field="bkDate"
                label={L('Date', 'Date', 'التاريخ')}
                type="date"
                value={bookingDate}
                onChange={setBookingDate}
                required
              />
              <LabelInput
                field="bkStart"
                label={L('Start', 'Début', 'من')}
                type="time"
                value={startTime}
                onChange={setStartTime}
                required
              />
              <LabelInput
                field="bkEnd"
                label={L('End', 'Fin', 'إلى')}
                type="time"
                value={endTime}
                onChange={setEndTime}
                required
              />
            </div>
            <LabelInput
              field="bkAmount"
              label={L('Total (DZD)', 'Montant (DZD)', 'المبلغ (دج)')}
              type="number"
              value={bookingAmount}
              onChange={setBookingAmount}
              required
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsAddBookingOpen(false)}>
                {L('Cancel', 'Annuler', 'إلغاء')}
              </Button>
              <Button type="submit" tone="accent" size={40} disabled={!selectedUnitId}>
                {L('Confirm Booking', 'Confirmer réservation', 'تأكيد الحجز')}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </div>
  );
};
