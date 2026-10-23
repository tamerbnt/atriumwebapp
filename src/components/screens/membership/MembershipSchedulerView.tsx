import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  CheckCircle2,
  ChevronDown,
  Building2,
  Dumbbell,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { ScheduleEvent } from '../../../types/index';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

export const MembershipSchedulerView: React.FC = () => {
  const { language, isRtl } = useTranslation();
  const { schedule, staff, currentBranch } = useAtriumStore();

  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday default
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('All');

  const days = [
    { num: 1, name: language === 'ar' ? 'الإثنين' : language === 'fr' ? 'Lundi' : 'Monday' },
    { num: 2, name: language === 'ar' ? 'الثلاثاء' : language === 'fr' ? 'Mardi' : 'Tuesday' },
    { num: 3, name: language === 'ar' ? 'الأربعاء' : language === 'fr' ? 'Mercredi' : 'Wednesday' },
    { num: 4, name: language === 'ar' ? 'الخميس' : language === 'fr' ? 'Jeudi' : 'Thursday' },
    { num: 5, name: language === 'ar' ? 'الجمعة' : language === 'fr' ? 'Vendredi' : 'Friday' },
    { num: 6, name: language === 'ar' ? 'السبت' : language === 'fr' ? 'Samedi' : 'Saturday' },
    { num: 7, name: language === 'ar' ? 'الأحد' : language === 'fr' ? 'Dimanche' : 'Sunday' },
  ];

  const rooms = useMemo(() => {
    const set = new Set<string>();
    schedule.forEach((s) => set.add(s.roomOrArea || 'Salle A'));
    return ['All', ...Array.from(set)];
  }, [schedule]);

  const filteredSessions = useMemo(() => {
    return schedule.filter((s) => {
      const matchDay = s.dayOfWeek === selectedDay;
      const matchRoom = roomFilter === 'All' || s.roomOrArea === roomFilter;
      const matchSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.trainerOrStaff && s.trainerOrStaff.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchDay && matchRoom && matchSearch;
    });
  }, [schedule, selectedDay, roomFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'جدول الحصص والأنشطة التدريبية' : language === 'fr' ? 'Planning des Séances & Cours Collectifs' : 'Class Schedule & Group Sessions'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {schedule.length} {language === 'ar' ? 'حصص تدريبية مجدولة أسبوعياً' : language === 'fr' ? 'créneaux de fitness, crossfit et musculation' : 'weekly scheduled sessions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالحصة أو المدرب...' : 'Recherche cours ou coach...'}
              openWidth={260}
              shutSize={36}
            />
          </div>
        </div>

        {/* Days of Week Tabs */}
        <div className="grid grid-cols-7 gap-2 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          {days.map((d) => {
            const countForDay = schedule.filter((s) => s.dayOfWeek === d.num).length;
            const isSelected = selectedDay === d.num;
            return (
              <button
                key={d.num}
                type="button"
                onClick={() => setSelectedDay(d.num)}
                className={`py-2.5 px-2 rounded-2xl text-center border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#C4785A] text-white border-[#C4785A] shadow-xs'
                    : 'bg-neutral-50 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                }`}
              >
                <span className="text-xs font-bold block">{d.name}</span>
                <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                  {countForDay} {language === 'ar' ? 'حصص' : 'cours'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className="bg-white dark:bg-[#18181B] rounded-[22px] p-5 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-mono font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-xl">
                  {session.startTime} - {session.endTime}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {session.category || 'Tous Niveaux'}
                </span>
              </div>

              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                {session.title}
              </h3>

              <div className="space-y-1.5 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[#C4785A]" />
                  <span>Coach: <strong className="text-neutral-700 dark:text-neutral-300">{session.trainerOrStaff || 'Staff'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#C4785A]" />
                  <span>Salle: {session.roomOrArea || 'Studio Principal'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                {session.enrolledCount || 0} / {session.capacity} places
              </span>
              <span className="text-[11px] text-emerald-600 font-bold">
                {session.capacity - (session.enrolledCount || 0)} disponibles
              </span>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full py-16 text-center text-xs text-neutral-400 bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800">
            Aucun cours programmé pour ce jour ou ce filtre.
          </div>
        )}
      </div>
    </div>
  );
};
