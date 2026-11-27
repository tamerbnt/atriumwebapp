import React, { useState, useMemo } from 'react';
import { Sparkles, Users, AlertTriangle, Plus, CheckCircle2, Play, XCircle } from 'lucide-react';
import {
  selectCurrentMembersFromState,
  selectCurrentSalonHammamSessionsFromState,
  selectCurrentStaffFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import { HammamGenderBlock, HammamSessionStatus } from '../../../types/index';
import { evaluateHammamSessionSlot } from '../../../utils/appointmentDepth';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { EmptyState } from '../../../atrium/components/EmptyState';

const HAMMAM_CABINS = [
  { id: 'Hammam Émeraude', label: 'Hammam Émeraude', defaultCap: 6 },
  { id: 'Hammam Ambre', label: 'Hammam Ambre', defaultCap: 6 },
  { id: 'Cabine Royale Privée', label: 'Cabine Royale Privée', defaultCap: 2 },
];

const HAMMAM_ADDONS = [
  { id: 'savon_noir', label: 'Savon Noir Beldi', priceDzd: 600 },
  { id: 'gommage_kessa', label: 'Gommage Gant Kessa', priceDzd: 1200 },
  { id: 'argile_ghassoul', label: 'Enveloppement Ghassoul', priceDzd: 1500 },
];

export const SalonHammamPanel: React.FC = React.memo(() => {
  const { hammamSessions, members, staff, language } = useAtriumSelector(
    (s) => ({
      hammamSessions: selectCurrentSalonHammamSessionsFromState(s),
      members: selectCurrentMembersFromState(s),
      staff: selectCurrentStaffFromState(s),
      language: s.language,
    }),
    shallowEqualObjects
  );
  const { createHammamSession, updateHammamSessionStatus } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [cabinFilter, setCabinFilter] = useState('All');
  const [cabinName, setCabinName] = useState(HAMMAM_CABINS[0].id);
  const [genderBlock, setGenderBlock] = useState<HammamGenderBlock>('women');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [attendantId, setAttendantId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [bookedCount, setBookedCount] = useState('1');
  const [basePriceDzd, setBasePriceDzd] = useState('3500');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['savon_noir']);

  const cabinCapacity = useMemo(() => {
    if (genderBlock === 'private') return 2;
    return HAMMAM_CABINS.find((c) => c.id === cabinName)?.defaultCap || 6;
  }, [cabinName, genderBlock]);

  const addonsTotalDzd = useMemo(
    () =>
      selectedAddons.reduce((sum, id) => {
        const found = HAMMAM_ADDONS.find((a) => a.id === id);
        return sum + (found ? found.priceDzd : 0);
      }, 0),
    [selectedAddons]
  );

  const slotCheck = useMemo(
    () =>
      evaluateHammamSessionSlot({
        existingSessions: hammamSessions,
        cabinName,
        genderBlock,
        date,
        startTime,
        endTime,
        requestedSeats: Math.max(1, parseInt(bookedCount, 10) || 1),
        cabinCapacity,
      }),
    [hammamSessions, cabinName, genderBlock, date, startTime, endTime, bookedCount, cabinCapacity]
  );

  const filteredSessions = useMemo(
    () => hammamSessions.filter((s) => cabinFilter === 'All' || s.cabinName === cabinFilter),
    [hammamSessions, cabinFilter]
  );

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleClientPick = (id: string) => {
    setSelectedClientId(id);
    const m = members.find((mem) => mem.id === id);
    if (m) {
      setClientName(m.fullName);
      setClientPhone(m.phoneNumber || '');
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      showToast({
        type: 'warning',
        title: isAr ? 'اسم الزبون مطلوب' : isEn ? 'Client Name Required' : 'Nom client requis',
        message: isAr ? 'أدخل اسم الزبون للحجز في الحمام' : isEn ? 'Enter client name to book a Hammam slot.' : 'Saisissez le nom du client pour réserver.',
      });
      return;
    }
    const attendant = staff.find((s) => s.id === attendantId);
    const addonsPayload = selectedAddons
      .map((id) => HAMMAM_ADDONS.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => a.label);

    const res = createHammamSession({
      cabinName,
      genderBlock,
      clientId: selectedClientId || undefined,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      attendantId: attendant?.id,
      attendantName: attendant?.fullName,
      date,
      startTime,
      endTime,
      capacity: cabinCapacity,
      bookedCount: Math.max(1, parseInt(bookedCount, 10) || 1),
      addons: addonsPayload,
      priceDzd: Math.max(0, Number(basePriceDzd || 0)) + addonsTotalDzd,
    });

    if (!res.success) {
      showToast({
        type: 'error',
        title:
          res.error === 'GENDER_BLOCK_CONFLICT'
            ? isAr
              ? 'تعارض فترة النساء/الرجال'
              : isEn
              ? 'Gender Block Conflict'
              : 'Conflit bloc Femmes / Hommes'
            : isAr
            ? 'السعة ممتلئة'
            : isEn
            ? 'Cabin Capacity Full'
            : 'Capacité cabine atteinte',
        message: `${cabinName} (${startTime}-${endTime})`,
      });
      return;
    }

    showToast({
      type: 'success',
      title: isAr ? 'تم حجز الحمام' : isEn ? 'Hammam Session Booked' : 'Séance Hammam réservée',
      message: `${res.session.cabinName} · ${res.session.clientName}`,
    });
    setClientName('');
    setClientPhone('');
    setSelectedClientId('');
  };

  const renderStatusLabel = (status: HammamSessionStatus) => {
    if (status === 'InSession') return isAr ? 'قيد الجلسة' : isEn ? 'In Session' : 'En séance';
    if (status === 'Completed') return isAr ? 'مكتملة' : isEn ? 'Completed' : 'Terminée';
    if (status === 'Cancelled') return isAr ? 'ملغاة' : isEn ? 'Cancelled' : 'Annulée';
    return isAr ? 'محجوزة' : isEn ? 'Booked' : 'Réservée';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
      <form
        onSubmit={handleCreateSession}
        data-sq="card"
        className="p-4 bg-white dark:bg-[#22201E] space-y-3 h-fit"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--brand-text,#BF431F)]" />
            <h3 className="t-label font-semibold text-black dark:text-white">
              {isAr ? 'حجز مقصورة الحمام والسبا' : isEn ? 'Book Hammam / Spa Cabin' : 'Réserver Cabine Hammam'}
            </h3>
          </div>
          <span className="t-cap tabular-nums px-2 py-0.5 rounded-full bg-[#F3EDE7] dark:bg-[#2E2A27] text-black/80 dark:text-white/80">
            {isAr ? `السعة: ${cabinCapacity}` : isEn ? `Cap: ${cabinCapacity}` : `Cap: ${cabinCapacity} pl.`}
          </span>
        </div>

        <LabelSelect
          field="HammamCabin"
          label={isAr ? 'المقصورة' : isEn ? 'Cabin' : 'Cabine Hammam'}
          value={cabinName}
          onChange={setCabinName}
          options={HAMMAM_CABINS.map((c) => ({ value: c.id, label: c.label }))}
          width="100%"
          height={40}
          corner={12}
        />

        <div className="space-y-1">
          <label className="t-small font-medium text-black/75 dark:text-white/80">
            {isAr ? 'فترة الاستقبال' : isEn ? 'Gender Session Block' : 'Créneau Femmes / Hommes / Privé'}
          </label>
          <LiveSegmentedControl
            size="sm"
            value={genderBlock}
            onValueChange={(v) => setGenderBlock(v as HammamGenderBlock)}
            aria-label={isEn ? 'Gender Session Block' : 'Créneau genre'}
            options={[
              { value: 'women', label: isAr ? 'نساء' : isEn ? 'Women' : 'Femmes' },
              { value: 'men', label: isAr ? 'رجال' : isEn ? 'Men' : 'Hommes' },
              { value: 'private', label: isAr ? 'خاصة VIP' : isEn ? 'Private' : 'Privé' },
            ]}
          />
        </div>

        {members.length > 0 && (
          <LabelSelect
            field="HammamClientPick"
            label={isAr ? 'زبون مسجل (اختياري)' : isEn ? 'Registered Client (Optional)' : 'Cliente enregistrée (optionnel)'}
            value={selectedClientId}
            onChange={handleClientPick}
            searchable
            options={[
              { value: '', label: isAr ? 'إدخال يدوي / ضيف' : isEn ? 'Walk-in / Manual' : 'Saisie manuelle' },
              ...members.map((m) => ({ value: m.id, label: m.fullName, sublabel: m.phoneNumber })),
            ]}
            width="100%"
            height={40}
            corner={12}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <LabelInput
            field="HammamClientName"
            label={isAr ? 'اسم الزبون *' : isEn ? 'Client Name *' : 'Nom client *'}
            value={clientName}
            onChange={setClientName}
            required
            width="100%"
            height={40}
            corner={12}
          />
          <LabelInput
            field="HammamClientPhone"
            label={isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
            value={clientPhone}
            onChange={setClientPhone}
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <LabelInput
            field="HammamDate"
            label={isAr ? 'التاريخ' : isEn ? 'Date' : 'Date'}
            type="date"
            value={date}
            onChange={setDate}
            width="100%"
            height={40}
            corner={12}
          />
          <LabelInput
            field="HammamStart"
            label={isAr ? 'من' : isEn ? 'Start' : 'Début'}
            type="time"
            value={startTime}
            onChange={setStartTime}
            width="100%"
            height={40}
            corner={12}
          />
          <LabelInput
            field="HammamEnd"
            label={isAr ? 'إلى' : isEn ? 'End' : 'Fin'}
            type="time"
            value={endTime}
            onChange={setEndTime}
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <LabelInput
            field="HammamSeats"
            label={isAr ? 'عدد الأماكن' : isEn ? 'Seats' : 'Places'}
            type="number"
            min={1}
            max={cabinCapacity}
            value={bookedCount}
            onChange={setBookedCount}
            width="100%"
            height={40}
            corner={12}
          />
          <LabelInput
            field="HammamBasePrice"
            label={isAr ? 'السعر الأساسي (دج)' : isEn ? 'Base Tariff (DZD)' : 'Tarif base (DZD)'}
            type="number"
            min={0}
            value={basePriceDzd}
            onChange={setBasePriceDzd}
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        {staff.length > 0 && (
          <LabelSelect
            field="HammamAttendant"
            label={isAr ? 'المشرفة / الكياسة' : isEn ? 'Attendant / Kessala' : 'Praticienne / Kessala'}
            value={attendantId}
            onChange={setAttendantId}
            options={[
              { value: '', label: isAr ? 'غير محدد' : isEn ? 'Unassigned' : 'Non assignée' },
              ...staff.map((s) => ({ value: s.id, label: s.fullName })),
            ]}
            width="100%"
            height={40}
            corner={12}
          />
        )}

        <div className="space-y-1.5">
          <span className="t-small font-medium text-black/75 dark:text-white/80 block">
            {isAr ? 'الإضافات والعلاجات' : isEn ? 'Ritual Add-ons' : 'Options Rituel Hammam'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {HAMMAM_ADDONS.map((addon) => {
              const active = selectedAddons.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => handleToggleAddon(addon.id)}
                  className={`px-2.5 py-1.5 rounded-lg t-cap font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#d4522f] text-white'
                      : 'bg-[#F5F1EC] dark:bg-[#2B2825] text-black/75 dark:text-white/80'
                  }`}
                >
                  {addon.label} (+{formatMoney(addon.priceDzd)})
                </button>
              );
            })}
          </div>
        </div>

        {!slotCheck.allowed && (
          <div
            role="alert"
            className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 t-small flex items-start gap-2"
          >
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              {slotCheck.reason === 'GENDER_BLOCK_CONFLICT'
                ? isAr
                  ? 'تعارض مع فترة مختلطة محجوزة في نفس التوقيت لهذه المقصورة.'
                  : isEn
                  ? 'Gender block conflict: this cabin already hosts another gender block in that window.'
                  : 'Conflit créneau : cette cabine est déjà réservée pour un autre bloc genre sur cet horaire.'
                : slotCheck.reason === 'INVALID_TIME_RANGE'
                ? isEn
                  ? 'End time must be after start time.'
                  : 'L’heure de fin doit être postérieure au début.'
                : isEn
                ? `Capacity exceeded (${slotCheck.remainingCapacity} remaining).`
                : `Capacité dépassée (${slotCheck.remainingCapacity} places restantes).`}
            </span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-[var(--atr-divider)]">
          <div className="t-small tabular-nums">
            <span className="text-black/60 dark:text-white/65">{isEn ? 'Total:' : 'Total :'} </span>
            <span className="font-semibold text-[var(--brand-text,#BF431F)]">
              {formatMoney(Math.max(0, Number(basePriceDzd || 0)) + addonsTotalDzd)}
            </span>
          </div>
          <Button type="submit" tone="accent" disabled={!slotCheck.allowed} leading={<Plus size={14} />}>
            {isAr ? 'تأكيد الحجز' : isEn ? 'Book Cabin' : 'Réserver'}
          </Button>
        </div>
      </form>

      <div data-sq="card" className="p-4 bg-white dark:bg-[#22201E] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--brand-text,#BF431F)]" />
            <h3 className="t-label font-semibold text-black dark:text-white">
              {isAr ? 'جلسات الحمام والسبا' : isEn ? 'Hammam & Spa Cabin Sessions' : 'Planning Cabines Hammam & Spa'}
            </h3>
          </div>
          <LiveSegmentedControl
            size="sm"
            value={cabinFilter}
            onValueChange={setCabinFilter}
            aria-label={isEn ? 'Filter cabin' : 'Filtrer cabine'}
            options={[
              { value: 'All', label: isEn ? 'All' : 'Toutes' },
              ...HAMMAM_CABINS.map((c) => ({ value: c.id, label: c.label.replace('Hammam ', '') })),
            ]}
          />
        </div>

        {filteredSessions.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<Sparkles />}
            title={isAr ? 'لا توجد جلسات حمام مجدولة' : isEn ? 'No Hammam sessions yet' : 'Aucune séance Hammam planifiée'}
            description={
              isAr
                ? 'استخدم النموذج لحجز جلسة النساء أو الرجال أو المقصورة الخاصة.'
                : isEn
                ? 'Book a women, men, or private cabin ritual using the panel.'
                : 'Utilisez le panneau ci-contre pour réserver un créneau Femmes, Hommes ou Privé.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filteredSessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#1A1816] border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-label font-semibold text-black dark:text-white">{sess.clientName}</span>
                    <span className="px-2 py-0.5 rounded-full t-cap font-semibold bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)]">
                      {sess.cabinName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full t-cap font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      {sess.genderBlock === 'women'
                        ? isAr ? 'نساء' : isEn ? 'Women' : 'Femmes'
                        : sess.genderBlock === 'men'
                        ? isAr ? 'رجال' : isEn ? 'Men' : 'Hommes'
                        : isAr ? 'خاصة' : isEn ? 'Private' : 'Privé'}
                    </span>
                    <span className="t-cap tabular-nums text-black/65 dark:text-white/65">
                      {sess.bookedCount}/{sess.capacity} {isEn ? 'seats' : 'places'}
                    </span>
                  </div>
                  <p className="t-cap tabular-nums text-black/65 dark:text-white/65">
                    {sess.date} · {sess.startTime}–{sess.endTime}
                    {sess.attendantName ? ` · ${sess.attendantName}` : ''}
                    {sess.addons.length > 0 ? ` · ${sess.addons.join(', ')}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="t-label font-semibold tabular-nums text-[var(--brand-text,#BF431F)]">
                    {formatMoney(centimesToDzd(sess.priceCentimes))}
                  </span>
                  <span className="px-2 py-0.5 rounded-full t-cap font-semibold bg-black/5 dark:bg-white/10 text-black dark:text-white">
                    {renderStatusLabel(sess.status)}
                  </span>
                  {sess.status === 'Booked' && (
                    <Button
                      type="button"
                      size={32}
                      tone="soft"
                      onClick={() => updateHammamSessionStatus(sess.id, 'InSession')}
                      leading={<Play size={13} />}
                    >
                      {isEn ? 'Start' : 'Démarrer'}
                    </Button>
                  )}
                  {sess.status === 'InSession' && (
                    <Button
                      type="button"
                      size={32}
                      tone="accent"
                      onClick={() => updateHammamSessionStatus(sess.id, 'Completed')}
                      leading={<CheckCircle2 size={13} />}
                    >
                      {isEn ? 'Complete' : 'Terminer'}
                    </Button>
                  )}
                  {(sess.status === 'Booked' || sess.status === 'InSession') && (
                    <button
                      type="button"
                      onClick={() => updateHammamSessionStatus(sess.id, 'Cancelled')}
                      aria-label={isEn ? 'Cancel Hammam session' : 'Annuler séance Hammam'}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

SalonHammamPanel.displayName = 'SalonHammamPanel';
