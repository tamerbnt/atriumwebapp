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
    batchDeleteScheduleEvents,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: schedule.length > 0,
  });

  // Unified Tri-View State: Calendar (Timetable) vs List vs Grid
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'grid'>('calendar');

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
    const rows = (viewMode === 'calendar' ? currentDayEvents : sortedCollectionEvents).map((e) => [
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
          <span className="font-bold text-xs text-black dark:text-white block">
            {event.title}
          </span>
          <span className="text-[11px] font-semibold text-[#d4522f] uppercase tracking-[0.04em] rtl:normal-case rtl:tracking-normal block mt-0.5">
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
          <span className="text-xs font-semibold text-black dark:text-white block">
            {getDayName(event.dayOfWeek)}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#d4522f] mt-0.5 tabular-nums">
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
          <div className="w-7 h-7 rounded-full bg-[#F3EDE7] dark:bg-[#262422] flex items-center justify-center text-xs font-bold text-black/72 dark:text-white/80 shrink-0">
            {event.trainerOrStaff.charAt(0)}
          </div>
          <span className="text-xs font-medium text-black dark:text-white truncate">
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
        <div className="flex items-center gap-1.5 text-xs text-black/72 dark:text-white/75">
          <MapPin size={12} className="text-black/62 dark:text-white/65 shrink-0" />
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
              <span className={isFull ? 'text-rose-600 font-bold' : 'text-black/72 dark:text-white/75 font-medium'}>
                {event.enrolledCount}/{event.capacity}
              </span>
              <span className="text-black/62 dark:text-white/65 text-[11px]">{fillPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#F3EDE7] dark:bg-[#262422] overflow-hidden">
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
            className="px-2.5 py-1 rounded-lg bg-[#F3EDE7] hover:bg-[#E6DED6] dark:bg-[#262422] dark:hover:bg-[#3A3734] text-xs font-semibold text-black/75 dark:text-white/80 flex items-center gap-1 cursor-pointer transition-colors"
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

  const renderTimetableView = () => (
    <div className="space-y-4">
      {/* Day of Week Segmented Capsules */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center p-0.5 rounded-xl bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] gap-0.5 text-xs font-semibold shadow-2xs overflow-x-auto max-w-xs sm:max-w-none">
          {days.map((d) => {
            const isActive = selectedDay === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDay(d.id)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#d4522f]/12 text-[#d4522f] dark:bg-[#d4522f]/20 dark:text-[#FB923C] font-bold'
                    : 'text-black/68 dark:text-white/72 hover:text-black dark:hover:text-white'
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-black/62 dark:text-white/65 font-semibold tabular-nums">
          {days.find((d) => d.id === selectedDay)?.label} · {currentDayEvents.length} {language === 'ar' ? 'حصص' : 'sessions'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentDayEvents.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-black/62 dark:text-white/65">
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
                className="p-5 rounded-[18px] bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs hover:border-[#d4522f] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] rtl:normal-case rtl:tracking-normal bg-[#F3EDE7] dark:bg-[#262422] text-black/72 dark:text-white/80 px-2 py-0.5 rounded-md">
                      {event.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#d4522f] flex items-center gap-1 tabular-nums">
                      <Clock size={12} />
                      {event.startTime} - {event.endTime}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-black dark:text-white group-hover:text-[#d4522f] transition-colors mb-1">
                    {event.title}
                  </h3>

                  <div className="space-y-1 text-xs text-black/62 dark:text-white/75">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-black/62 dark:text-white/65" />
                      <span>{event.roomOrArea}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-black/62 dark:text-white/65" />
                      <span>{event.trainerOrStaff}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6DED6]/60 dark:border-[#3A3734]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-black/62 dark:text-white/65">
                      {isFull ? (language === 'ar' ? 'مكتمل' : 'Full') : (language === 'ar' ? 'الأماكن' : 'Capacity')}
                    </span>
                    <span className="font-mono font-bold text-black/75 dark:text-white/80 tabular-nums">
                      {event.enrolledCount}/{event.capacity}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F3EDE7] dark:bg-[#262422] rounded-full overflow-hidden">
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
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Row 0: Top Header matching Desktop App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-[0.98] rtl:leading-tight tracking-[0.012em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {terminology.scheduler}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
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
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
        <div>
          <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
            {language === 'ar' ? 'الطاقة الاستيعابية وجدول التمارين' : 'Weekly Session Matrix & Attendance Roster'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
            <div>
              <span className="text-[12px] font-medium text-black/68 dark:text-white/72">
                {language === 'ar' ? 'إجمالي الحصص المقررة' : 'Scheduled Class Roster'}
              </span>
              <div className="mt-1.5">
                <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  ↗ {language === 'ar' ? 'جدول نشط' : 'Active Schedule'}
                </span>
              </div>
            </div>
            <div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {schedule.length}{' '}
              <span className="text-xs font-sans font-normal text-black/62 dark:text-white/65">
                sessions
              </span>
            </div>
          </div>

          <div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
            <div>
              <span className="text-[12px] font-medium text-black/68 dark:text-white/72">
                {t('schedule_enrolled_athletes', language)}
              </span>
              <div className="mt-1.5">
                <span className="text-[10.5px] font-semibold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-md tabular-nums">
                  82% {language === 'ar' ? 'نسبة الامتلاء' : 'Capacity Ratio'}
                </span>
              </div>
            </div>
            <div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {totalEnrolled}{' '}
              <span className="text-xs font-sans font-normal text-black/62 dark:text-white/65">
                {language === 'ar' ? 'حجز مسجل' : 'bookings'}
              </span>
            </div>
          </div>

          {/* Tile 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Peak Capacity & Arena */}
          <div className="p-4.5 sm:p-5 rounded-[18px] bg-[#1F1D1B] border border-white/[0.08] text-white flex flex-col justify-between min-h-[132px] shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-white/75">
                {t('schedule_peak_capacity', language)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/25 tabular-nums">
                12:00 - 18:30
              </span>
            </div>
            <div>
              <div className="text-[28px] lg:text-[30px] leading-[0.95] font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                12:00 - 18:30
              </div>
              <p className="text-[11.5px] text-white/68 mt-1.5">
                {language === 'ar' ? 'ساعات الذروة والقاعة الرئيسية' : 'Peak Hours Main Arena'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Universal Cards & List View with Integrated Tri-View */}
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
          {/* Collection Filter & Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className="text-black/62 dark:text-white/65" />
              <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
                {language === 'ar' ? 'قائمة الحصص والجلسات العامة' : 'Universal Schedule Collection'}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] text-[11px] font-semibold text-black/68 dark:text-white/75 tabular-nums shadow-2xs">
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
                label={language === 'ar' ? 'اليوم' : language === 'fr' ? 'Jour' : 'Day'}
                value={dayFilter}
                onChange={(val) => setDayFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  {
                    value: 'All',
                    label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All',
                    tooltip: language === 'ar' ? 'جميع الأيام' : language === 'fr' ? 'Tous les jours' : 'All Days',
                  },
                  ...days.map((d) => ({ value: String(d.id), label: d.label, tooltip: d.label })),
                ]}
              />

              {/* Discipline filter */}
              <FilterSelect
                label={language === 'ar' ? 'التصنيف' : 'Discipline'}
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={categories.map((c) => ({
                  value: c,
                  label: c === 'All' ? (language === 'ar' ? 'الكل' : language === 'fr' ? 'Toutes' : 'All') : c,
                  tooltip: c === 'All' ? (language === 'ar' ? 'جميع التخصصات' : language === 'fr' ? 'Toutes les disciplines' : 'All Disciplines') : c,
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
                className="w-9 h-9 rounded-xl bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-center text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer transition-colors shadow-2xs"
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
            viewMode={viewMode}
            defaultViewMode="calendar"
            showCalendarToggle={true}
            onViewModeChange={(mode: 'list' | 'grid' | 'calendar') => setViewMode(mode)}
            renderCalendarView={renderTimetableView}
            bulkSecondaryAction={{
              label: 'Dupliquer semaine',
              icon: <Plus size={13} />,
              onClick: (ids) => {
                showToast({
                  type: 'success',
                  title: 'Planification',
                  message: `${ids.size} sessions dupliquées pour la semaine suivante.`,
                });
              },
              variant: 'primary',
            }}
            onBulkDelete={(ids) => {
              batchDeleteScheduleEvents(Array.from(ids));
              showToast({
                type: 'info',
                title: 'Sessions supprimées',
                message: `${ids.size} sessions retirées du planning.`,
              });
            }}
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
                      <span className="text-[11px] font-semibold uppercase tracking-[0.04em] rtl:normal-case rtl:tracking-normal px-2 py-0.5 rounded-md bg-[#F3EDE7] dark:bg-[#262422] text-black/72 dark:text-white/80">
                        {event.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#d4522f] flex items-center gap-1 tabular-nums">
                        <Clock size={12} />
                        <span>{event.startTime} - {event.endTime}</span>
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-black dark:text-white line-clamp-1 mb-1">
                      {event.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-black/62 dark:text-white/65 mb-3">
                      <span>{getDayName(event.dayOfWeek)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-black/62 dark:text-white/65" />
                        <span>{event.roomOrArea}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6]/60 dark:border-[#3A3734] rounded-xl mb-3">
                      <div className="w-7 h-7 rounded-full bg-[#F3EDE7] dark:bg-[#3A3734] flex items-center justify-center text-xs font-bold text-black/75 dark:text-white/80 shrink-0">
                        {event.trainerOrStaff.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-black/62 dark:text-white/65 block font-medium uppercase tracking-[0.04em] rtl:normal-case rtl:tracking-normal">
                          {language === 'ar' ? 'المدرب' : 'Instructor'}
                        </span>
                        <span className="text-xs font-bold text-black dark:text-white truncate block">
                          {event.trainerOrStaff}
                        </span>
                      </div>
                    </div>

                    {/* Capacity meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono tabular-nums">
                        <span className={isFull ? 'text-rose-600 font-bold' : 'text-black/72 dark:text-white/75'}>
                          {event.enrolledCount} / {event.capacity} {language === 'ar' ? 'مشترك' : 'spots'}
                        </span>
                        <span className="text-black/62 dark:text-white/65 font-bold">{fillPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#F3EDE7] dark:bg-[#262422] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-rose-500' : fillPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#E6DED6]/60 dark:border-[#3A3734] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="text-xs font-bold text-[#d4522f] hover:underline cursor-pointer flex items-center gap-1"
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
                      className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isFull
                          ? 'bg-[#F3EDE7] dark:bg-[#262422] text-black/62 dark:text-white/65 cursor-not-allowed'
                          : 'bg-[#d4522f] text-white hover:opacity-90 shadow-2xs'
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

      {/* Desktop Slide-out Inspector Drawer for Session */}
      {selectedEvent && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-[#1C1B1A] border-l border-[#E6DED6] dark:border-[#3A3734] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="px-6 py-5 border-b border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={17} className="text-[#d4522f]" />
              <span className="text-sm font-semibold text-black dark:text-white">
                {language === 'ar' ? 'معاينة الحصة وسجل الحضور' : language === 'fr' ? 'Inspecteur de séance & Roster' : 'Session Inspector & Roster'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="p-1.5 rounded-lg text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            <div className="p-5 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] rtl:normal-case rtl:tracking-normal bg-[#F3EDE7] dark:bg-[#3A3734] text-black dark:text-white px-2.5 py-0.5 rounded-md">
                  {selectedEvent.category}
                </span>
                <span className="font-mono text-xs font-bold text-[#d4522f] tabular-nums">
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </span>
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white">
                {selectedEvent.title}
              </h3>
              <p className="text-xs text-black/62 dark:text-white/65">
                {getDayName(selectedEvent.dayOfWeek)} · {selectedEvent.roomOrArea}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal text-black/62 dark:text-white/65">
                {language === 'ar' ? 'تفاصيل المدرب والقاعة' : 'Trainer & Studio Info'}
              </h4>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2">
                <div className="flex justify-between">
                  <span className="text-black/62 dark:text-white/65">{language === 'ar' ? 'المدرب المسؤول:' : 'Lead Coach:'}</span>
                  <span className="font-bold text-black dark:text-white">{selectedEvent.trainerOrStaff}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/62 dark:text-white/65">{language === 'ar' ? 'الموقع:' : 'Studio Area:'}</span>
                  <span className="font-semibold text-black dark:text-white">{selectedEvent.roomOrArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/62 dark:text-white/65">{language === 'ar' ? 'الطاقة الاستيعابية:' : 'Max Capacity:'}</span>
                  <span className="font-bold font-mono text-[#d4522f] tabular-nums">{selectedEvent.capacity} athletes</span>
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
