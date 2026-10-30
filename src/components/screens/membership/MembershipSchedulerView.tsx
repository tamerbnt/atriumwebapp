import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  Download,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  X,
  Check,
  UserPlus,
  Award,
  Pin,
  LayoutGrid,
  List,
  Eye,
  Filter,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { ScheduleEvent } from '../../../types/index';
import { Modal } from '../../ui/Modal';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { FilterSelect } from '../../ui/FilterSelect';
import { t } from '../../../utils/i18n';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonSchedulerView } from '../../ui/skeleton/StructuralSkeletons';

export const MembershipSchedulerView: React.FC = () => {
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
    showToast,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: schedule.length > 0,
  });

  // High-level View Switcher: Timeline Matrix vs Universal Collection
  const [mainViewMode, setMainViewMode] = useState<'timeline' | 'collection'>('collection');

  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday default
  const [dayFilter, setDayFilter] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  // Universal Collection state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [pinnedEventIds, setPinnedEventIds] = useState<Set<string>>(new Set());
  const [eventSortBy, setEventSortBy] = useState<string>('time');
  const [eventSortDir, setEventSortDir] = useState<'asc' | 'desc'>('asc');

  // New session modal fields
  const [newTitle, setNewTitle] = useState('Morning Workout');
  const [newCategory, setNewCategory] = useState('Fitness');
  const [newTrainer, setNewTrainer] = useState(staff[0]?.fullName || 'Coach Karim');
  const [newRoom, setNewRoom] = useState('Studio A');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newCapacity, setNewCapacity] = useState(20);

  const days = [
    { id: 1, label: t('day_monday', language), short: t('day_mon', language) },
    { id: 2, label: t('day_tuesday', language), short: t('day_tue', language) },
    { id: 3, label: t('day_wednesday', language), short: t('day_wed', language) },
    { id: 4, label: t('day_thursday', language), short: t('day_thu', language) },
    { id: 5, label: t('day_friday', language), short: t('day_fri', language) },
    { id: 6, label: t('day_saturday', language), short: t('day_sat', language) },
    { id: 0, label: t('day_sunday', language), short: t('day_sun', language) },
  ];

  const getDayName = (dayOfWeek: number) => {
    const found = days.find((d) => d.id === dayOfWeek);
    return found ? found.label : `Day ${dayOfWeek}`;
  };

  // Timeline events: filtered by day
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

  // Universal Collection events: can view all days or filter by day
  const collectionEvents = useMemo(() => {
    return schedule.filter((s) => {
      if (dayFilter !== 'All' && s.dayOfWeek !== parseInt(dayFilter, 10)) return false;
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchTrainer = s.trainerOrStaff.toLowerCase().includes(q);
        const matchRoom = s.roomOrArea.toLowerCase().includes(q);
        const matchCategory = s.category.toLowerCase().includes(q);
        if (!matchTitle && !matchTrainer && !matchRoom && !matchCategory) return false;
      }
      return true;
    });
  }, [schedule, dayFilter, categoryFilter, searchQuery]);

  const sortedCollectionEvents = useMemo(() => {
    return [...collectionEvents].sort((a, b) => {
      const aPinned = pinnedEventIds.has(a.id);
      const bPinned = pinnedEventIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (eventSortBy === 'time') {
        const cmp = a.startTime.localeCompare(b.startTime);
        return eventSortDir === 'asc' ? cmp : -cmp;
      }
      if (eventSortBy === 'title') {
        const cmp = a.title.localeCompare(b.title);
        return eventSortDir === 'asc' ? cmp : -cmp;
      }
      if (eventSortBy === 'day') {
        const cmp = a.dayOfWeek - b.dayOfWeek;
        return eventSortDir === 'asc' ? cmp : -cmp;
      }
      if (eventSortBy === 'trainer') {
        const cmp = a.trainerOrStaff.localeCompare(b.trainerOrStaff);
        return eventSortDir === 'asc' ? cmp : -cmp;
      }
      if (eventSortBy === 'capacity') {
        const cmp = a.enrolledCount - b.enrolledCount;
        return eventSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [collectionEvents, pinnedEventIds, eventSortBy, eventSortDir]);

  const totalEnrolled = useMemo(() => {
    return schedule.reduce((acc, s) => acc + s.enrolledCount, 0);
  }, [schedule]);

  const categories = ['All', 'CrossFit', 'Yoga', 'Boxing', 'Pilates', 'HIIT', 'Fitness'];

  const handleExportCSV = () => {
    const dayLabel = days.find((d) => d.id === selectedDay)?.label || 'All';
    const headers = ['Day', 'Title', 'Category', 'Start Time', 'End Time', 'Trainer', 'Room', 'Enrolled', 'Capacity'];
    const rows = (mainViewMode === 'timeline' ? currentDayEvents : sortedCollectionEvents).map((e) => [
      `"${getDayName(e.dayOfWeek)}"`,
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

  const eventColumns: ColumnDefinition<ScheduleEvent>[] = useMemo(() => [
    {
      key: 'title',
      header: language === 'ar' ? 'عنوان الحصة / الدورة' : language === 'fr' ? 'Intitulé du cours' : 'Class Title & Discipline',
      width: '2.5*',
      minWidth: '180px',
      sortable: true,
      renderCell: (event) => (
        <div>
          <span className="font-bold text-xs text-neutral-900 dark:text-white block">
            {event.title}
          </span>
          <span className="text-[10px] font-bold text-[#C4785A] uppercase tracking-wider block mt-0.5">
            {event.category}
          </span>
        </div>
      ),
    },
    {
      key: 'day',
      header: language === 'ar' ? 'اليوم والتوقيت' : language === 'fr' ? 'Jour & Créneau' : 'Day & Time Slot',
      width: '2*',
      minWidth: '160px',
      sortable: true,
      renderCell: (event) => (
        <div>
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
            {getDayName(event.dayOfWeek)}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#C4785A] mt-0.5">
            <Clock size={11} />
            <span>{event.startTime} - {event.endTime}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'trainer',
      header: language === 'ar' ? 'المدرب / المسؤول' : language === 'fr' ? 'Coach / Responsable' : 'Trainer / Coach',
      width: '1.8*',
      minWidth: '140px',
      sortable: true,
      renderCell: (event) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
            {event.trainerOrStaff.charAt(0)}
          </div>
          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {event.trainerOrStaff}
          </span>
        </div>
      ),
    },
    {
      key: 'room',
      header: language === 'ar' ? 'القاعة / الاستوديو' : language === 'fr' ? 'Salle / Studio' : 'Room / Studio',
      width: '1.5*',
      minWidth: '120px',
      renderCell: (event) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
          <MapPin size={12} className="text-neutral-400 shrink-0" />
          <span className="truncate">{event.roomOrArea}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: language === 'ar' ? 'نسبة الامتلاء' : language === 'fr' ? 'Remplissage' : 'Occupancy',
      width: '1.8*',
      minWidth: '140px',
      sortable: true,
      renderCell: (event) => {
        const isFull = event.enrolledCount >= event.capacity;
        const fillPercent = Math.min(100, Math.round((event.enrolledCount / event.capacity) * 100));
        return (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] font-mono tabular-nums">
              <span className={isFull ? 'text-rose-600 font-bold' : 'text-neutral-700 dark:text-neutral-300 font-medium'}>
                {event.enrolledCount}/{event.capacity}
              </span>
              <span className="text-neutral-400 text-[10px]">{fillPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isFull ? 'bg-rose-500' : fillPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: language === 'ar' ? 'إجراءات' : language === 'fr' ? 'Actions' : 'Actions',
      width: '1.2*',
      minWidth: '100px',
      renderCell: (event) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEvent(event);
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer"
          >
            <Eye size={12} />
            <span>{language === 'ar' ? 'عرض' : 'View'}</span>
          </button>
        </div>
      ),
    },
  ], [language, days]);

  if (showSkeleton && (schedule.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonSchedulerView
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />
    );
  }

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
          {/* Prominent High-Visibility Segmented Switcher: Timeline vs Universal Collection */}
          <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setMainViewMode('collection')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                mainViewMode === 'collection'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>{language === 'ar' ? 'بطاقات وقائمة عامة' : language === 'fr' ? 'Collection Cartes & Liste' : 'Universal Cards & List'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMainViewMode('timeline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                mainViewMode === 'timeline'
                  ? 'bg-[#C4785A] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
              }`}
            >
              <Calendar size={14} />
              <span>{language === 'ar' ? 'مخطط الأيام الزمني' : language === 'fr' ? 'Planning Calendrier' : 'Timetable Timeline'}</span>
            </button>
          </div>

          {/* Facility Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
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
          <AtriumButton
            type="button"
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus size={15} strokeWidth={2.5} />}
            className="shrink-0"
          >
            <span>{t('schedule_new_session', language)}</span>
          </AtriumButton>
        </div>
      </div>

      {/* Row 1: Weekly Staff Coverage or Enrolled Athletes KPIs */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'الطاقة الاستيعابية وجدول التمارين' : 'Weekly Session Matrix & Attendance Roster'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar'
              ? 'تتبع الحصص التدريبية، توزيع المدربين ومعدلات حضور المشتركين'
              : 'Coach allocations, studio room assignments, and real-time attendance capacity'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {language === 'ar' ? 'إجمالي الحصص المقررة' : 'Scheduled Class Roster'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ {language === 'ar' ? 'جدول نشط' : 'Active Schedule'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {schedule.length}{' '}
              <span className="text-xs font-normal text-neutral-400">
                sessions
              </span>
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {t('schedule_enrolled_athletes', language)}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  82% {language === 'ar' ? 'نسبة الامتلاء' : 'Capacity Ratio'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {totalEnrolled}{' '}
              <span className="text-xs font-normal text-neutral-400">
                {language === 'ar' ? 'حجز مسجل' : 'bookings'}
              </span>
            </div>
          </div>

          {/* Tile 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Peak Capacity & Arena */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {t('schedule_peak_capacity', language)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                12:00 - 18:30
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                12:00 - 18:30
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>{language === 'ar' ? 'ساعات الذروة والقاعة الرئيسية' : 'Peak Hours Main Arena'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Universal Cards & List View OR Timetable Timeline */}
      {mainViewMode === 'collection' ? (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          {/* Collection Filter & Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-neutral-500" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'قائمة الحصص والجلسات العامة' : 'Universal Schedule Collection'}
              </span>
              <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
                {sortedCollectionEvents.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {/* Search */}
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={language === 'ar' ? 'ابحث عن اسم الحصة، المدرب، القاعة...' : 'Search session, coach, studio...'}
                shutSize={36}
                openWidth={220}
              />

              {/* Day filter */}
              <FilterSelect
                label={language === 'ar' ? 'اليوم' : 'Day'}
                value={dayFilter}
                onChange={(val) => setDayFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'All', label: language === 'ar' ? 'جميع الأيام' : 'All Days' },
                  ...days.map((d) => ({ value: String(d.id), label: d.label })),
                ]}
              />

              {/* Discipline filter */}
              <FilterSelect
                label={language === 'ar' ? 'التصنيف' : 'Discipline'}
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={categories.map((c) => ({
                  value: c,
                  label: c === 'All' ? (language === 'ar' ? 'جميع التخصصات' : 'All Disciplines') : c,
                }))}
              />

              {/* Export */}
              <AtriumButton
                variant="secondary"
                onClick={handleExportCSV}
                icon={<Download size={13} />}
                size="sm"
              >
                Export
              </AtriumButton>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
                title="Toggle Fullscreen"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* UniversalDataCollection Component */}
          <UniversalDataCollection<ScheduleEvent>
            items={sortedCollectionEvents}
            keyExtractor={(e) => e.id}
            defaultViewMode="list"
            sortBy={eventSortBy}
            sortDirection={eventSortDir}
            onSortChange={(key) => {
              if (eventSortBy === key) {
                setEventSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setEventSortBy(key);
                setEventSortDir('asc');
              }
            }}
            selectedIds={selectedEventIds}
            onSelectionChange={setSelectedEventIds}
            isPinned={(e) => pinnedEventIds.has(e.id)}
            onTogglePin={(e) => {
              setPinnedEventIds((prev) => {
                const next = new Set(prev);
                if (next.has(e.id)) next.delete(e.id);
                else next.add(e.id);
                return next;
              });
            }}
            onItemClick={(event) => setSelectedEvent(event)}
            columns={eventColumns}
            renderCard={(event) => {
              const isFull = event.enrolledCount >= event.capacity;
              const fillPercent = Math.min(100, Math.round((event.enrolledCount / event.capacity) * 100));

              return (
                <div className="flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {event.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#C4785A] flex items-center gap-1">
                        <Clock size={12} />
                        <span>{event.startTime} - {event.endTime}</span>
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1 mb-1">
                      {event.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                      <span>{getDayName(event.dayOfWeek)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-neutral-400" />
                        <span>{event.roomOrArea}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl mb-3">
                      <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
                        {event.trainerOrStaff.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-neutral-400 block font-medium uppercase">
                          {language === 'ar' ? 'المدرب' : 'Instructor'}
                        </span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block">
                          {event.trainerOrStaff}
                        </span>
                      </div>
                    </div>

                    {/* Capacity meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono tabular-nums">
                        <span className={isFull ? 'text-rose-600 font-bold' : 'text-neutral-600 dark:text-neutral-300'}>
                          {event.enrolledCount} / {event.capacity} {language === 'ar' ? 'مشترك' : 'spots'}
                        </span>
                        <span className="text-neutral-400 font-bold">{fillPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-rose-500' : fillPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="text-xs font-bold text-[#C4785A] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={12} />
                      <span>{language === 'ar' ? 'عرض السجل' : 'View Roster'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isFull}
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast({
                          type: 'success',
                          title: language === 'ar' ? 'تم تسجيل المشترك' : 'Member Enrolled',
                          message: `${event.title} (${event.startTime})`,
                        });
                      }}
                      className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isFull
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                          : 'bg-[#C4785A] text-white hover:opacity-90 shadow-2xs'
                      }`}
                    >
                      <UserPlus size={13} />
                      <span>{isFull ? (language === 'ar' ? 'مكتمل' : 'Full') : (language === 'ar' ? 'تسجيل' : 'Enroll')}</span>
                    </button>
                  </div>
                </div>
              );
            }}
            emptyTitle={language === 'ar' ? 'لا توجد حصص تطابق خيارات البحث' : 'No timetable sessions found'}
            emptyDescription={language === 'ar' ? 'جرب تغيير شروط البحث أو مسح المرشحات لتظهر جميع الحصص' : 'Try adjusting your search query or discipline filter.'}
          />
        </div>
      ) : (
        /* Timetable Timeline Mode */
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-neutral-500" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {days.find((d) => d.id === selectedDay)?.label} · {t('nav_scheduler', language)}
              </span>
              <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
                {currentDayEvents.length} {language === 'ar' ? 'حصص' : 'sessions'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={language === 'ar' ? 'ابحث عن اسم الحصة، المدرب، القاعة...' : 'Search session, trainer, room...'}
                shutSize={36}
                openWidth={220}
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

              <FilterSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={categories.map((c) => ({
                  value: c,
                  label: c === 'All' ? 'All Disciplines' : c,
                }))}
              />

              <AtriumButton
                variant="secondary"
                onClick={handleExportCSV}
                icon={<Download size={13} />}
                size="sm"
              >
                Export
              </AtriumButton>
            </div>
          </div>

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

                      <h3 className="text-base font-black text-neutral-900 dark:text-white leading-tight mb-1">
                        {event.title}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{event.roomOrArea}</span>
                        </span>
                        <span>·</span>
                        <span>{event.trainerOrStaff}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400 font-medium">
                          {language === 'ar' ? 'المشاركون المقيدون' : 'Enrolled Athletes'}
                        </span>
                        <span
                          className={`font-black tabular-nums ${
                            isFull ? 'text-rose-500' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {event.enrolledCount} / {event.capacity} ({fillRatio}%)
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-rose-500' : fillRatio > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(fillRatio, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
              <p className="text-xs text-neutral-500">
                {getDayName(selectedEvent.dayOfWeek)} · {selectedEvent.roomOrArea}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {language === 'ar' ? 'تفاصيل المدرب والقاعة' : 'Trainer & Studio Info'}
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">{language === 'ar' ? 'المدرب المسؤول:' : 'Lead Coach:'}</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{selectedEvent.trainerOrStaff}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{language === 'ar' ? 'الموقع:' : 'Studio Area:'}</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedEvent.roomOrArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{language === 'ar' ? 'الطاقة الاستيعابية:' : 'Max Capacity:'}</span>
                  <span className="font-bold font-mono text-[#C4785A]">{selectedEvent.capacity} athletes</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <AtriumButton
                type="button"
                variant="primary"
                onClick={() => {
                  showToast({
                    type: 'success',
                    title: language === 'ar' ? 'تم تسجيل حضور إضافي' : 'Athlete Check-In Recorded',
                    message: `${selectedEvent.title} (+1)`,
                  });
                }}
                icon={<UserPlus size={14} />}
                className="w-full justify-center"
              >
                <span>{language === 'ar' ? 'تسجيل مشترك جديد في الحصة' : 'Enroll New Member in Session'}</span>
              </AtriumButton>

              <AtriumButton
                type="button"
                variant="secondary"
                onClick={() => setSelectedEvent(null)}
                className="w-full justify-center"
              >
                <span>{language === 'ar' ? 'إغلاق' : 'Close'}</span>
              </AtriumButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Timetable Class */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('schedule_modal_title', language)}
      >
        <div className="space-y-4">
          <LabelInput
            field="Title"
            label={t('schedule_field_title', language)}
            value={newTitle}
            onChange={setNewTitle}
            width="100%"
            height={46}
            corner={14}
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="Category"
              label={t('schedule_field_category', language)}
              value={newCategory}
              onChange={setNewCategory}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="Capacity"
              label={t('schedule_field_capacity', language)}
              value={String(newCapacity)}
              onChange={(val) => setNewCapacity(parseInt(val, 10) || 0)}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="StartTime"
              label={t('schedule_field_start_time', language)}
              value={newStartTime}
              onChange={setNewStartTime}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="EndTime"
              label={t('schedule_field_end_time', language)}
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
            <AtriumButton
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              <span>{t('action_cancel', language)}</span>
            </AtriumButton>
            <AtriumButton
              type="button"
              variant="primary"
              onClick={() => setIsAddModalOpen(false)}
            >
              <span>{language === 'ar' ? 'حفظ الحصة في الجدول' : language === 'fr' ? 'Enregistrer le créneau' : 'Save Schedule'}</span>
            </AtriumButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const SchedulerScreen = MembershipSchedulerView;
