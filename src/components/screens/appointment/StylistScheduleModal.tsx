import React, { useState, useEffect, useMemo } from 'react';
import { Clock, CalendarOff, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import {
  selectCurrentStaffFromState,
  selectCurrentStylistSchedulesFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import { StylistDayHours, StylistTimeOffRange } from '../../../types/index';
import { createDefaultWeeklyHours, DEFAULT_SALON_CLOSING_TIME } from '../../../utils/appointmentDepth';

interface StylistScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStaffId?: string;
}

const DAY_LABELS: Record<number, { fr: string; en: string; ar: string }> = {
  0: { fr: 'Dimanche', en: 'Sunday', ar: 'الأحد' },
  1: { fr: 'Lundi', en: 'Monday', ar: 'الاثنين' },
  2: { fr: 'Mardi', en: 'Tuesday', ar: 'الثلاثاء' },
  3: { fr: 'Mercredi', en: 'Wednesday', ar: 'الأربعاء' },
  4: { fr: 'Jeudi', en: 'Thursday', ar: 'الخميس' },
  5: { fr: 'Vendredi', en: 'Friday', ar: 'الجمعة' },
  6: { fr: 'Samedi', en: 'Saturday', ar: 'السبت' },
};

export const StylistScheduleModal: React.FC<StylistScheduleModalProps> = ({
  isOpen,
  onClose,
  initialStaffId,
}) => {
  const { staff, schedules, language } = useAtriumSelector(
    (s) => ({
      staff: selectCurrentStaffFromState(s),
      schedules: selectCurrentStylistSchedulesFromState(s),
      language: s.language,
    }),
    shallowEqualObjects
  );
  const { upsertStylistSchedule } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const activeStaff = useMemo(() => staff.filter((s) => s.isActive), [staff]);

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [closingTime, setClosingTime] = useState(DEFAULT_SALON_CLOSING_TIME);
  const [weeklyHours, setWeeklyHours] = useState<Record<number, StylistDayHours>>(() =>
    createDefaultWeeklyHours()
  );
  const [timeOffRanges, setTimeOffRanges] = useState<StylistTimeOffRange[]>([]);
  const [newOffStart, setNewOffStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [newOffEnd, setNewOffEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [newOffReason, setNewOffReason] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const defaultStaff =
      (initialStaffId && activeStaff.find((s) => s.id === initialStaffId)) || activeStaff[0];
    setSelectedStaffId(defaultStaff?.id || '');
  }, [isOpen, initialStaffId, activeStaff]);

  useEffect(() => {
    if (!isOpen || !selectedStaffId) return;
    const existing = schedules.find((s) => s.staffId === selectedStaffId);
    if (existing) {
      setClosingTime(existing.salonClosingTime || DEFAULT_SALON_CLOSING_TIME);
      setWeeklyHours({ ...createDefaultWeeklyHours(), ...existing.weeklyHours });
      setTimeOffRanges(existing.timeOffRanges || []);
    } else {
      setClosingTime(DEFAULT_SALON_CLOSING_TIME);
      setWeeklyHours(createDefaultWeeklyHours());
      setTimeOffRanges([]);
    }
  }, [isOpen, selectedStaffId, schedules]);

  const updateDay = (dayIndex: number, patch: Partial<StylistDayHours>) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], ...patch },
    }));
  };

  const handleAddTimeOff = () => {
    if (!newOffStart || !newOffEnd || newOffEnd < newOffStart) {
      showToast({
        type: 'warning',
        title: isAr ? 'تاريخ غير صالح' : isEn ? 'Invalid Dates' : 'Dates invalides',
        message: isAr
          ? 'تأكد من أن تاريخ النهاية بعد البداية'
          : isEn
          ? 'End date must be on or after start date.'
          : 'La date de fin doit être postérieure au début.',
      });
      return;
    }
    setTimeOffRanges((prev) => [
      ...prev,
      {
        id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        startDate: newOffStart,
        endDate: newOffEnd,
        reason: newOffReason.trim() || undefined,
      },
    ]);
    setNewOffReason('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const stylist = activeStaff.find((s) => s.id === selectedStaffId);
    if (!stylist) return;
    upsertStylistSchedule({
      staffId: stylist.id,
      staffName: stylist.fullName,
      salonClosingTime: closingTime || DEFAULT_SALON_CLOSING_TIME,
      weeklyHours,
      timeOffRanges,
    });
    showToast({
      type: 'success',
      title: isAr ? 'تم حفظ الجدول' : isEn ? 'Schedule Saved' : 'Planning enregistré',
      message: `${stylist.fullName} · ${isAr ? 'الإغلاق' : isEn ? 'Closing' : 'Fermeture'} ${closingTime}`,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'ساعات عمل المصففة والإجازات' : isEn ? 'Stylist Hours & Time Off' : 'Horaires & Congés Styliste'}
      maxWidth="xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {activeStaff.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#F5F1EC] dark:bg-[#22201E] t-body text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
            {isAr
              ? 'لا يوجد موظفون نشطون في هذا الفرع. أضف موظفًا من شاشة الفريق أولاً.'
              : isEn
              ? 'No active stylists found in this branch. Add a staff member in the Staff view first.'
              : 'Aucun praticien actif dans cette branche. Ajoutez un membre depuis l’écran Équipe.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelSelect
                field="StylistScheduleStaff"
                label={isAr ? 'المختصة / المصففة' : isEn ? 'Stylist / Practitioner' : 'Styliste / Praticienne'}
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                options={activeStaff.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                  sublabel: s.role,
                }))}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="SalonClosingTime"
                label={isAr ? 'وقت إغلاق الصالون' : isEn ? 'Salon Closing Time' : 'Heure de fermeture salon'}
                type="time"
                value={closingTime}
                onChange={setClosingTime}
                width="100%"
                height={40}
                corner={12}
              />
            </div>

            <div
              data-sq="card"
              className="p-3 bg-[#FBF8F5] dark:bg-[#1E1C1A] space-y-2 max-h-[280px] overflow-y-auto"
            >
              <div className="flex items-center gap-2 t-small font-semibold text-black dark:text-white pb-1 border-b border-[var(--atr-divider)]">
                <Clock size={14} />
                <span>{isAr ? 'ساعات العمل الأسبوعية والراحة' : isEn ? 'Weekly Hours & Break Window' : 'Horaires hebdomadaires & Pause'}</span>
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                const cfg = weeklyHours[dayIdx] || { enabled: true, startTime: '09:00', endTime: '20:00' };
                const dayName = isAr ? DAY_LABELS[dayIdx].ar : isEn ? DAY_LABELS[dayIdx].en : DAY_LABELS[dayIdx].fr;
                return (
                  <div
                    key={dayIdx}
                    className="grid grid-cols-[120px_1fr] sm:grid-cols-[135px_auto_1fr] items-center gap-2 py-1.5 border-b border-[var(--atr-divider)] last:border-b-0"
                  >
                    <label className="flex items-center gap-2 t-small font-medium text-black dark:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) => updateDay(dayIdx, { enabled: e.target.checked })}
                        className="rounded border-black/20 accent-[#d4522f]"
                      />
                      <span>{dayName}</span>
                    </label>
                    {cfg.enabled ? (
                      <div className="flex flex-wrap items-center gap-2 t-cap">
                        <label className="flex items-center gap-1">
                          <span className="text-black/60 dark:text-white/60">{isAr ? 'من' : isEn ? 'In' : 'Début'}</span>
                          <input
                            type="time"
                            value={cfg.startTime}
                            onChange={(e) => updateDay(dayIdx, { startTime: e.target.value })}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#2A2724] border border-black/10 dark:border-white/10 t-small tabular-nums"
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span className="text-black/60 dark:text-white/60">{isAr ? 'إلى' : isEn ? 'Out' : 'Fin'}</span>
                          <input
                            type="time"
                            value={cfg.endTime}
                            onChange={(e) => updateDay(dayIdx, { endTime: e.target.value })}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#2A2724] border border-black/10 dark:border-white/10 t-small tabular-nums"
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span className="text-black/60 dark:text-white/60">{isAr ? 'راحة' : isEn ? 'Break' : 'Pause'}</span>
                          <input
                            type="time"
                            value={cfg.breakStart || ''}
                            onChange={(e) => updateDay(dayIdx, { breakStart: e.target.value })}
                            className="px-1.5 py-1 rounded-lg bg-white dark:bg-[#2A2724] border border-black/10 dark:border-white/10 t-small tabular-nums"
                          />
                          <span>–</span>
                          <input
                            type="time"
                            value={cfg.breakEnd || ''}
                            onChange={(e) => updateDay(dayIdx, { breakEnd: e.target.value })}
                            className="px-1.5 py-1 rounded-lg bg-white dark:bg-[#2A2724] border border-black/10 dark:border-white/10 t-small tabular-nums"
                          />
                        </label>
                      </div>
                    ) : (
                      <span className="t-small text-rose-600 dark:text-rose-400 font-medium">
                        {isAr ? 'يوم راحة' : isEn ? 'Day Off' : 'Repos'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div data-sq="card" className="p-3 bg-[#FBF8F5] dark:bg-[#1E1C1A] space-y-3">
              <div className="flex items-center gap-2 t-small font-semibold text-black dark:text-white">
                <CalendarOff size={14} />
                <span>{isAr ? 'فترات الغياب والعطلة' : isEn ? 'Vacations & Time-Off Ranges' : 'Congés & Indisponibilités'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.4fr_auto] gap-2 items-end">
                <LabelInput
                  field="TimeOffStart"
                  label={isAr ? 'من' : isEn ? 'From' : 'Du'}
                  type="date"
                  value={newOffStart}
                  onChange={setNewOffStart}
                  width="100%"
                  height={36}
                  corner={10}
                />
                <LabelInput
                  field="TimeOffEnd"
                  label={isAr ? 'إلى' : isEn ? 'To' : 'Au'}
                  type="date"
                  value={newOffEnd}
                  onChange={setNewOffEnd}
                  width="100%"
                  height={36}
                  corner={10}
                />
                <LabelInput
                  field="TimeOffReason"
                  label={isAr ? 'السبب' : isEn ? 'Reason' : 'Motif'}
                  value={newOffReason}
                  onChange={setNewOffReason}
                  placeholder={isEn ? 'Annual leave / Training' : 'Congé / Formation'}
                  width="100%"
                  height={36}
                  corner={10}
                />
                <Button type="button" size={36} tone="soft" onClick={handleAddTimeOff} leading={<Plus size={14} />}>
                  {isAr ? 'إضافة' : isEn ? 'Add' : 'Ajouter'}
                </Button>
              </div>
              {timeOffRanges.length > 0 && (
                <div className="space-y-1.5">
                  {timeOffRanges.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white dark:bg-[#262422] t-small"
                    >
                      <span className="tabular-nums font-medium text-black dark:text-white">
                        {r.startDate} → {r.endDate}
                        {r.reason ? ` · ${r.reason}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTimeOffRanges((prev) => prev.filter((item) => item.id !== r.id))}
                        aria-label={isEn ? 'Remove time off' : 'Supprimer indisponibilité'}
                        className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--atr-divider)]">
          <Button type="button" tone="soft" onClick={onClose}>
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </Button>
          <Button
            type="submit"
            tone="accent"
            disabled={activeStaff.length === 0}
            leading={<CheckCircle2 size={15} />}
          >
            {isAr ? 'حفظ الساعات' : isEn ? 'Save Schedule' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
