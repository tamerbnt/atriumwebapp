import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  Search,
  Download,
  LayoutGrid,
  List,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  X,
  Check,
  UserPlus,
  Sparkles,
  Award,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { ScheduleEvent } from '../../types/index';
import { Modal } from '../ui/Modal';
import { Seek } from '../ui/Seek';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { FilterSelect } from '../ui/FilterSelect';
import { StylistScheduleView } from './StylistScheduleView';
import { t } from '../../utils/i18n';

export const SchedulerScreen: React.FC = () => {
  const {
    schedule,
    currentBranch,
    currentBusiness,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    terminology,
    staff,
    language,
  } = useAtriumStore();

  if (currentBusiness.category === 'appointment_service') {
    return <StylistScheduleView />;
  }

  const isPOS = currentBusiness.category === 'pos_inventory';

  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday default
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  // New session modal fields
  const [newTitle, setNewTitle] = useState(isPOS ? 'Morning Cashier & Floor Roster' : 'Morning Workout');
  const [newCategory, setNewCategory] = useState(isPOS ? 'Morning Shift' : 'Fitness');
  const [newTrainer, setNewTrainer] = useState(staff[0]?.fullName || (isPOS ? 'Amine Bentouati' : 'Coach Karim'));
  const [newRoom, setNewRoom] = useState(isPOS ? 'Register Counter 01' : 'Studio A');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newCapacity, setNewCapacity] = useState(isPOS ? 4 : 20);

  const days = [
    { id: 1, label: t('day_monday', language), short: t('day_mon', language) },
    { id: 2, label: t('day_tuesday', language), short: t('day_tue', language) },
    { id: 3, label: t('day_wednesday', language), short: t('day_wed', language) },
    { id: 4, label: t('day_thursday', language), short: t('day_thu', language) },
    { id: 5, label: t('day_friday', language), short: t('day_fri', language) },
    { id: 6, label: t('day_saturday', language), short: t('day_sat', language) },
    { id: 0, label: t('day_sunday', language), short: t('day_sun', language) },
  ];

  const currentDayEvents = useMemo(() => {
    return schedule.filter((s) => {
      if (s.dayOfWeek !== selectedDay) return false;
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchTrainer = s.trainerOrStaff.toLowerCase().includes(q);
        const matchRoom = s.roomOrArea.toLowerCase().includes(q);
        if (!matchTitle && !matchTrainer && !matchRoom) return false;
      }
      return true;
    });
  }, [schedule, selectedDay, categoryFilter, searchQuery]);

  const totalEnrolled = useMemo(() => {
    return schedule.reduce((acc, s) => acc + s.enrolledCount, 0);
  }, [schedule]);

  const categories = isPOS
    ? ['All', 'Morning Shift', 'Midday Rush', 'Closing Shift', 'Stock Restock', 'Delivery Intake']
    : ['All', 'CrossFit', 'Yoga', 'Boxing', 'Pilates', 'HIIT', 'Fitness'];

  const handleExportCSV = () => {
    const dayLabel = days.find((d) => d.id === selectedDay)?.label || 'All';
    const headers = ['Day', 'Title', 'Category', 'Start Time', 'End Time', 'Trainer', 'Room', 'Enrolled', 'Capacity'];
    const rows = currentDayEvents.map((e) => [
      `"${dayLabel}"`,
      `"${e.title}"`,
      `"${e.category}"`,
      `"${e.startTime}"`,
      `"${e.endTime}"`,
      `"${e.trainerOrStaff}"`,
      `"${e.roomOrArea}"`,
      `"${e.enrolledCount}"`,
      `"${e.capacity}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-schedule-${dayLabel.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Row 0: Top Header matching Desktop App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {terminology.scheduler}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {language === 'ar'
                ? `جدول الحصص والورديات، الطاقة الاستيعابية وحجوزات الموظفين لـ ${currentBranch?.name || 'الفرع'}`
                : language === 'fr'
                ? `Emploi du temps hebdomadaire, capacités des cours et réservations pour ${currentBranch?.name || 'l\'établissement'}`
                : `Weekly timetable, class capacities, and trainer reservations for ${currentBranch?.name || 'Atrium 1'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('fast_switch_title', language)}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Session Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{t('schedule_add_session', language)}</span>
          </button>
        </div>
      </div>

      {/* Row 1: Weekly Utilization & Attendance Health Banner Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {t('schedule_utilization_title', language)}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {t('schedule_utilization_desc', language)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Weekly Classes — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {isPOS ? (language === 'ar' ? 'ورديات العمل المجدولة أسبوعياً' : language === 'fr' ? 'Créneaux & Équipe de la Semaine' : 'Weekly Scheduled Shifts') : t('schedule_weekly_classes', language)}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ {language === 'ar' ? 'جدول نشط' : language === 'fr' ? 'Planning Actif' : 'Active Schedule'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {schedule.length}{' '}
              <span className="text-xs font-normal text-neutral-400">
                {isPOS ? (language === 'ar' ? 'ورديات' : language === 'fr' ? 'créneaux' : 'shifts') : (language === 'ar' ? 'حصص تدريبية' : language === 'fr' ? 'cours au programme' : 'scheduled classes')}
              </span>
            </div>
          </div>

          {/* Tile 2: Weekly Staff Coverage or Enrolled Athletes */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {isPOS ? (language === 'ar' ? 'تغطية طاقم العمل الأسبوعية' : language === 'fr' ? 'Couverture Hebdo de la Caisse' : 'Weekly Staff Coverage') : t('schedule_enrolled_athletes', language)}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  {isPOS ? (language === 'ar' ? '100% تغطية الصندوق' : language === 'fr' ? '100% Couverture Caisse' : '100% Register Coverage') : (language === 'ar' ? '82% نسبة الامتلاء' : language === 'fr' ? '82% Taux de Remplissage' : '82% Capacity Ratio')}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {isPOS ? `${schedule.length * 8}h` : totalEnrolled}{' '}
              <span className="text-xs font-normal text-neutral-400">
                {isPOS ? (language === 'ar' ? 'ساعات' : language === 'fr' ? 'heures' : 'hours') : (language === 'ar' ? 'رياضي مسجل' : language === 'fr' ? 'réservations' : 'bookings')}
              </span>
            </div>
          </div>

          {/* Tile 3: Dark Obsidian Card */}
          <div className="p-5 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div>
              <span className="text-xs font-medium text-neutral-300">
                {isPOS ? (language === 'ar' ? 'ذروة تدفق الزبائن على الصندوق' : language === 'fr' ? 'Heures d\'Affluence Caisse' : 'Peak Register Rush') : t('schedule_peak_capacity', language)}
              </span>
              <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                {isPOS ? (language === 'ar' ? 'ذروة الغداء ومغادرة المكاتب' : language === 'fr' ? 'Pointes midi & sortie de bureaux' : 'Lunch & Office Exit Rush') : (language === 'ar' ? 'ساعات الذروة والقاعة الرئيسية' : language === 'fr' ? 'Heures de Pointe Salle Principale' : 'Peak Hours Main Arena')}
              </div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              12:00 - 18:30{' '}
              <span className="text-xs font-normal text-neutral-400">
                {isPOS ? (language === 'ar' ? 'الكاشير والواجهة' : language === 'fr' ? 'Caisse & Étage' : 'Register & Floor') : 'CrossFit & Boxe'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Timetable Master Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {days.find((d) => d.id === selectedDay)?.label} · {t('nav_scheduler', language)}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {currentDayEvents.length} {language === 'ar' ? 'حصص' : language === 'fr' ? 'créneaux' : 'sessions'}
            </span>
          </div>

          {/* Right Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Seek Kinetic Search Box */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={
                language === 'ar'
                  ? 'ابحث عن اسم الحصة، المدرب، القاعة...'
                  : language === 'fr'
                  ? 'Rechercher un cours, coach, salle...'
                  : 'Search session title, trainer, area...'
              }
              shutSize={36}
              openWidth={230}
            />

            {/* Day of Week Segmented Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs overflow-x-auto max-w-xs sm:max-w-none">
              {days.map((d) => {
                const isActive = selectedDay === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDay(d.id)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>

            {/* Category Filter */}
            <FilterSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(typeof val === 'string' ? val : val.target?.value || val)}
              options={categories.map((c) => ({
                value: c,
                label: c === 'All' ? 'All Disciplines' : c,
              }))}
            />

            {/* Export Data Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-full border border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              title="Download timetable CSV"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* View Mode Display: Grid Cards or Table List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentDayEvents.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-neutral-400">
                No sessions planned for {days.find((d) => d.id === selectedDay)?.label}. Click "New Session" to add one.
              </div>
            ) : (
              currentDayEvents.map((event) => {
                const isFull = event.enrolledCount >= event.capacity;
                const fillRatio = Math.round((event.enrolledCount / event.capacity) * 100);

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`p-5 rounded-[20px] border transition-all cursor-pointer flex flex-col justify-between h-[210px] shadow-2xs ${
                      selectedEvent?.id === event.id
                        ? 'border-[#C4785A] bg-[#FCEEE8]/40 dark:bg-neutral-800/80 ring-1 ring-[#C4785A]/30'
                        : 'border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 hover:border-[#D5DFE3] dark:hover:border-neutral-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-[#C4785A] flex items-center gap-1">
                          <Clock size={13} />
                          <span className="tabular-nums">
                            {event.startTime} - {event.endTime}
                          </span>
                        </span>
                        <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">
                          {event.category}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-1">
                        {event.title}
                      </h3>

                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-neutral-400" />
                          <span>{event.trainerOrStaff}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-neutral-400" />
                          <span>{event.roomOrArea}</span>
                        </div>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-neutral-400 font-medium">Occupancy:</span>
                        <span
                          className={`font-bold tabular-nums ${
                            isFull ? 'text-rose-500' : 'text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {event.enrolledCount} / {event.capacity} ({fillRatio}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, fillRatio)}%`,
                            backgroundColor: isFull ? '#EF4444' : 'var(--color-accent)',
                          }}
                          className="h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* List Table View */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200/60 dark:border-neutral-800/80 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider h-11">
                  <th className="px-5">{language === 'ar' ? 'التوقيت' : language === 'fr' ? 'Créneau' : 'Time Window'}</th>
                  <th className="px-4">{language === 'ar' ? 'عنوان الحصة / الوردية' : language === 'fr' ? 'Titre de la session' : 'Session Title'}</th>
                  <th className="px-4">{language === 'ar' ? 'التصنيف' : language === 'fr' ? 'Discipline' : 'Discipline'}</th>
                  <th className="px-4">{language === 'ar' ? 'المسؤول / المدرب' : language === 'fr' ? 'Responsable' : 'Lead Trainer'}</th>
                  <th className="px-4">{language === 'ar' ? 'القاعة / الصندوق' : language === 'fr' ? 'Salle / Caisse' : 'Facility Studio'}</th>
                  <th className="px-4 text-right">{language === 'ar' ? 'المشاركون / الطاقة' : language === 'fr' ? 'Inscrits & Capacité' : 'Attendance & Capacity'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/60">
                {currentDayEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-xs text-neutral-400">
                      {t('schedule_no_events', language)}
                    </td>
                  </tr>
                ) : (
                  currentDayEvents.map((event) => {
                    const isFull = event.enrolledCount >= event.capacity;
                    const fillRatio = Math.round((event.enrolledCount / event.capacity) * 100);

                    return (
                      <tr
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`h-16 transition-colors cursor-pointer ${
                          selectedEvent?.id === event.id
                            ? 'bg-[#FCEEE8]/60 dark:bg-neutral-800'
                            : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50'
                        }`}
                      >
                        <td className="px-5 py-3 font-mono text-xs font-bold text-[#C4785A]">
                          {event.startTime} - {event.endTime}
                        </td>
                        <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white text-sm">
                          {event.title}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {event.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-700 dark:text-neutral-300 font-semibold">
                          {event.trainerOrStaff}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          {event.roomOrArea}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span
                            className={`text-xs font-bold ${
                              isFull ? 'text-rose-500' : 'text-neutral-900 dark:text-white'
                            }`}
                          >
                            {event.enrolledCount} / {event.capacity} ({fillRatio}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Desktop Slide-out Inspector Drawer for Session */}
      {selectedEvent && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={17} className="text-[#C4785A]" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'معاينة الحصة وسجل الحضور' : language === 'fr' ? 'Inspecteur de séance & Roster' : 'Session Inspector & Roster'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Session Card Overview */}
            <div className="p-5 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wide bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 px-2.5 py-0.5 rounded-full">
                  {selectedEvent.category}
                </span>
                <span className="font-mono text-xs font-bold text-[#C4785A]">
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {selectedEvent.title}
              </h3>
              <p className="text-neutral-500">
                {days.find((d) => d.id === selectedEvent.dayOfWeek)?.label} · {currentBranch?.name || 'Atrium 1'}
              </p>
            </div>

            {/* Logistics */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'اللوجستيات والمشرفون' : language === 'fr' ? 'Logistique & Personnel' : 'Logistics & Personnel'}
              </span>
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Users size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {language === 'ar' ? 'المدرب المشرف:' : language === 'fr' ? 'Coach principal :' : 'Lead Coach:'}{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedEvent.trainerOrStaff}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {language === 'ar' ? 'القاعة / المساحة:' : language === 'fr' ? 'Salle / Espace :' : 'Zone/Studio:'}{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedEvent.roomOrArea}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance & Capacity */}
            <div className="p-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#E8DFD8] dark:border-neutral-700 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#C4785A]">
                  {language === 'ar' ? 'المقاعد المحجوزة' : language === 'fr' ? 'Places réservées' : 'Reserved Seats'}
                </span>
                <span className="text-base font-black text-[#C4785A] tabular-nums">
                  {selectedEvent.enrolledCount} / {selectedEvent.capacity}
                </span>
              </div>
              <div className="w-full h-2 bg-white/70 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, Math.round((selectedEvent.enrolledCount / selectedEvent.capacity) * 100))}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                  className="h-full rounded-full"
                />
              </div>
            </div>

            {/* Sample Athlete Roster */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'سجل حضور الرياضيين بالحصة' : language === 'fr' ? 'Liste des athlètes enregistrés' : 'Checked-In Athlete Roster'}
              </span>
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                <div className="p-3 flex items-center justify-between bg-white dark:bg-neutral-800/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white">amira</div>
                      <div className="text-[11px] text-neutral-400">Card #46466446 · Plan A1</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {language === 'ar' ? 'حاضر' : language === 'fr' ? 'Présent' : 'Checked In'}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between bg-white dark:bg-neutral-800/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      S
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white">saraa</div>
                      <div className="text-[11px] text-neutral-400">Card #46466447 · Plan A1</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {language === 'ar' ? 'حاضر' : language === 'fr' ? 'Présent' : 'Checked In'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                style={{ backgroundColor: 'var(--color-accent)' }}
                className="w-full h-10 rounded-full text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 shadow-xs"
              >
                <UserPlus size={15} />
                <span>{language === 'ar' ? 'تسجيل حضور رياضي سريع' : language === 'fr' ? 'Pointer un athlète rapidement' : 'Quick Check-In Athlete'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-full h-10 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق المعاينة' : language === 'fr' ? 'Fermer l\'inspecteur' : 'Close Inspector'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          language === 'ar'
            ? 'إضافة حصة رياضية جديدة'
            : language === 'fr'
            ? 'Programmer une nouvelle séance'
            : 'Schedule New Session'
        }
        subtitle={
          language === 'ar'
            ? `إضافة حصة أو موعد إلى فرع ${currentBranch?.name || 'الرئيسي'}`
            : language === 'fr'
            ? `Ajouter un cours ou rendez-vous à ${currentBranch?.name || 'Atrium 1'}`
            : `Add class or appointment to ${currentBranch?.name || 'Atrium 1'}`
        }
      >
        <div className="space-y-4">
          <LabelInput
            field="SessionTitle"
            label={`${language === 'ar' ? 'عنوان الحصة الرياضية' : language === 'fr' ? 'Intitulé de la séance' : 'Session Title'} *`}
            required
            value={newTitle}
            onChange={setNewTitle}
            placeholder={language === 'ar' ? 'مثال: أساسيات الملاكمة أو بيلاتيس صباحي' : 'e.g. Boxing Fundamentals or Pilates Morning'}
            width="100%"
            height={46}
            corner={14}
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelSelect
              field="Discipline"
              label={language === 'ar' ? 'نوع النشاط الرياضي' : language === 'fr' ? 'Catégorie sportive' : 'Discipline Category'}
              value={newCategory}
              onChange={(val) => setNewCategory(typeof val === 'string' ? val : val.target?.value || val)}
              options={[
                { value: 'CrossFit', label: 'CrossFit' },
                { value: 'Yoga', label: 'Yoga' },
                { value: 'Boxing', label: language === 'ar' ? 'ملاكمة (Boxing)' : language === 'fr' ? 'Boxe' : 'Boxing' },
                { value: 'Pilates', label: 'Pilates' },
                { value: 'HIIT', label: 'HIIT' },
                { value: 'Fitness', label: language === 'ar' ? 'لياقة بدنية (Fitness)' : 'Fitness' },
              ]}
              height={46}
              corner={14}
            />

            <LabelInput
              field="Capacity"
              label={t('schedule_field_quota', language)}
              type="number"
              value={newCapacity ? String(newCapacity) : ''}
              onChange={(v) => setNewCapacity(Number(v) || 0)}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="StartTime"
              label={language === 'ar' ? 'وقت البدء' : language === 'fr' ? 'Heure de début' : 'Start Time'}
              type="time"
              value={newStartTime}
              onChange={setNewStartTime}
              width="100%"
              height={46}
              corner={14}
            />
            <LabelInput
              field="EndTime"
              label={language === 'ar' ? 'وقت الانتهاء' : language === 'fr' ? 'Heure de fin' : 'End Time'}
              type="time"
              value={newEndTime}
              onChange={setNewEndTime}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="Trainer"
              label={t('schedule_field_trainer', language)}
              value={newTrainer}
              onChange={setNewTrainer}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="Room"
              label={t('schedule_field_room', language)}
              value={newRoom}
              onChange={setNewRoom}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel', language)}
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              className="h-10 px-5 text-xs font-bold text-white rounded-full cursor-pointer hover:opacity-90 shadow-xs"
            >
              {language === 'ar' ? 'حفظ الحصة في الجدول' : language === 'fr' ? 'Enregistrer le créneau' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
