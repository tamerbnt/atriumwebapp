import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Users,
  MapPin,
  Maximize2,
  UserPlus,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentScheduleFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
  selectTerminologyFromState,
  showToast,
} from '../../../services/store';
import { ScheduleEvent } from '../../../types/index';
import { Modal } from '../../ui/Modal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { t } from '../../../utils/i18n';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonSchedulerView } from '../../ui/skeleton/StructuralSkeletons';

export const MembershipSchedulerView: React.FC = React.memo(() => {
  const {
    schedule,
    branches,
    currentBranch,
    terminology,
    staff,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      schedule: selectCurrentScheduleFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      terminology: selectTerminologyFromState(s),
      staff: selectCurrentStaffFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );

  const { retryCloudSync, batchDeleteScheduleEvents } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [localAddedEvents, setLocalAddedEvents] = useState<ScheduleEvent[]>([]);
  const allScheduleEvents = useMemo(
    () => [...localAddedEvents, ...schedule],
    [localAddedEvents, schedule]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: allScheduleEvents.length > 0,
  });

  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'grid'>('calendar');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [dayFilter, setDayFilter] = useState<string>('All');
  const [availabilityFilter, setAvailabilityFilter] = useState<'All' | 'Open' | 'Full'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(() => new Set());
  const [pinnedEventIds, setPinnedEventIds] = useState<Set<string>>(() => new Set());
  const [eventSortBy, setEventSortBy] = useState<string>('time');
  const [eventSortDir, setEventSortDir] = useState<'asc' | 'desc'>('asc');

  const [newTitle, setNewTitle] = useState('Morning Workout');
  const [newCategory, setNewCategory] = useState('Fitness');
  const [newTrainer, setNewTrainer] = useState(staff[0]?.fullName || 'Coach Karim');
  const [newRoom, setNewRoom] = useState('Studio A');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newCapacity, setNewCapacity] = useState(20);

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const days = useMemo(
    () => [
      { id: 1, label: t('day_monday', language), short: t('day_mon', language) },
      { id: 2, label: t('day_tuesday', language), short: t('day_tue', language) },
      { id: 3, label: t('day_wednesday', language), short: t('day_wed', language) },
      { id: 4, label: t('day_thursday', language), short: t('day_thu', language) },
      { id: 5, label: t('day_friday', language), short: t('day_fri', language) },
      { id: 6, label: t('day_saturday', language), short: t('day_sat', language) },
      { id: 0, label: t('day_sunday', language), short: t('day_sun', language) },
    ],
    [language]
  );

  const getDayName = useCallback(
    (dayOfWeek: number) => {
      const found = days.find((d) => d.id === dayOfWeek);
      return found ? found.label : `Day ${dayOfWeek}`;
    },
    [days]
  );

  const branchOptionsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allScheduleEvents.forEach((ev) => {
      const bName = resolveRecordBranch(ev, branchesById, currentBranch, language).name;
      counts.set(bName, (counts.get(bName) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ value: name, label: name, count }));
  }, [allScheduleEvents, branchesById, currentBranch, language]);

  const collectionEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allScheduleEvents.filter((s) => {
      if (dayFilter !== 'All' && s.dayOfWeek !== parseInt(dayFilter, 10)) return false;
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      const isFull = s.enrolledCount >= s.capacity;
      if (availabilityFilter === 'Open' && isFull) return false;
      if (availabilityFilter === 'Full' && !isFull) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.trainerOrStaff.toLowerCase().includes(q) ||
          s.roomOrArea.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [
    allScheduleEvents,
    dayFilter,
    categoryFilter,
    availabilityFilter,
    branchFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const currentDayEvents = useMemo(() => {
    return collectionEvents.filter((s) => s.dayOfWeek === selectedDay);
  }, [collectionEvents, selectedDay]);

  const sortedCollectionEvents = useMemo(() => {
    const sign = eventSortDir === 'asc' ? 1 : -1;
    return [...collectionEvents].sort((a, b) => {
      const aPinned = pinnedEventIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedEventIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (eventSortBy === 'title') return a.title.localeCompare(b.title) * sign;
      if (eventSortBy === 'day') return (a.dayOfWeek - b.dayOfWeek) * sign;
      if (eventSortBy === 'trainer') return a.trainerOrStaff.localeCompare(b.trainerOrStaff) * sign;
      if (eventSortBy === 'capacity') return (a.enrolledCount - b.enrolledCount) * sign;
      if (eventSortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return a.startTime.localeCompare(b.startTime) * sign;
    });
  }, [collectionEvents, pinnedEventIds, eventSortBy, eventSortDir, branchesById, currentBranch, language]);

  const { totalEnrolled, openCount, fullCount } = useMemo(() => {
    let total = 0;
    let open = 0;
    let full = 0;
    for (let i = 0; i < allScheduleEvents.length; i++) {
      const ev = allScheduleEvents[i];
      total += ev.enrolledCount;
      if (ev.enrolledCount >= ev.capacity) full++;
      else open++;
    }
    return { totalEnrolled: total, openCount: open, fullCount: full };
  }, [allScheduleEvents]);

  const categories = ['All', 'CrossFit', 'Yoga', 'Boxing', 'Pilates', 'HIIT', 'Fitness'];

  const handleResetFilters = useCallback(() => {
    setDayFilter('All');
    setCategoryFilter('All');
    setBranchFilter('All');
    setAvailabilityFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = dayFilter !== 'All' || categoryFilter !== 'All' || branchFilter !== 'All';
  const activeFiltersCount =
    (dayFilter !== 'All' ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const handleExportCSV = useCallback(() => {
    const dayLabel = days.find((d) => d.id === selectedDay)?.label || 'All';
    const headers = [
      'Day',
      'Title',
      'Category',
      'Start Time',
      'End Time',
      'Trainer',
      'Room',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      'Enrolled',
      'Capacity',
    ];
    const list = viewMode === 'calendar' ? currentDayEvents : sortedCollectionEvents;
    const rows = list.map((e) => [
      getDayName(e.dayOfWeek),
      e.title,
      e.category,
      e.startTime,
      e.endTime,
      e.trainerOrStaff,
      e.roomOrArea,
      resolveRecordBranch(e, branchesById, currentBranch, language).name,
      e.enrolledCount,
      e.capacity,
    ]);
    downloadCsvSafe(`atrium-schedule-${dayLabel.toLowerCase()}.csv`, headers, rows);
  }, [days, selectedDay, viewMode, currentDayEvents, sortedCollectionEvents, getDayName, isAr, isEn, branchesById, currentBranch, language]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  const handleSaveNewSession = useCallback(() => {
    const created: ScheduleEvent = {
      id: `sch_${Date.now()}`,
      tenantId: 'acc_01',
      facilityId: currentBranch?.id || 'fac_01',
      title: newTitle.trim() || 'Session Fitness',
      category: newCategory.trim() || 'Fitness',
      dayOfWeek: selectedDay,
      startTime: newStartTime,
      endTime: newEndTime,
      trainerOrStaff: newTrainer.trim() || 'Coach Atrium',
      roomOrArea: newRoom.trim() || 'Studio A',
      capacity: Math.max(1, newCapacity),
      enrolledCount: 0,
    };
    setLocalAddedEvents((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    showToast?.({
      type: 'success',
      title: isAr ? 'تمت إضافة الحصة' : isEn ? 'Session Scheduled' : 'Créneau planifié',
      message: `${created.title} · ${created.startTime}-${created.endTime}`,
    });
  }, [currentBranch, newTitle, newCategory, selectedDay, newStartTime, newEndTime, newTrainer, newRoom, newCapacity, showToast, isAr, isEn]);

  const eventColumns: ColumnDefinition<ScheduleEvent>[] = useMemo(
    () => [
      {
        key: 'title',
        header: isAr ? 'عنوان الحصة / الدورة' : isEn ? 'Class Title' : 'Intitulé du cours',
        sortable: true,
        renderCell: (event) => (
          <div className="min-w-0">
            <span className="text-[13.5px] font-semibold text-black dark:text-white truncate block">
              {event.title}
            </span>
            <span className="text-[11px] font-semibold text-[#d4522f] uppercase tracking-[0.04em] rtl:normal-case block mt-0.5">
              {event.category} · {event.roomOrArea}
            </span>
          </div>
        ),
      },
      {
        key: 'day',
        header: isAr ? 'اليوم والمدرب' : isEn ? 'Day & Coach' : 'Jour & Coach',
        sortable: true,
        renderCell: (event) => (
          <div className="min-w-0">
            <span className="text-[12.5px] font-semibold text-black dark:text-white block">
              {getDayName(event.dayOfWeek)}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65 truncate block">
              {event.trainerOrStaff}
            </span>
          </div>
        ),
      },
      {
        key: 'capacity',
        header: isAr ? 'التوفر' : isEn ? 'Availability' : 'Places',
        sortable: true,
        renderCell: (event) => {
          const isFull = event.enrolledCount >= event.capacity;
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold tabular-nums ${
                isFull
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              {event.enrolledCount}/{event.capacity} {isFull ? (isAr ? 'مكتمل' : 'Complet') : isAr ? 'متاح' : 'Ouvert'}
            </span>
          );
        },
      },
      {
        key: 'time',
        header: isAr ? 'التوقيت' : isEn ? 'Time Slot' : 'Créneau Horaire',
        sortable: true,
        renderCell: (event) => (
          <div className="flex items-center gap-1.5 font-mono text-[12.5px] font-bold text-[#d4522f] tabular-nums">
            <Clock size={12} />
            <span>
              {event.startTime} - {event.endTime}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        sortable: true,
        renderCell: (event) => (
          <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(event, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, getDayName, branchesById, currentBranch, language]
  );

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: allScheduleEvents.length },
      { value: 'Open', label: isAr ? 'متاح' : isEn ? 'Open' : 'Ouverts', count: openCount },
      { value: 'Full', label: isAr ? 'مكتمل' : isEn ? 'Full' : 'Complets', count: fullCount },
    ],
    [isAr, isEn, allScheduleEvents.length, openCount, fullCount]
  );

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches',
            count: allScheduleEvents.length,
          },
          ...branchOptionsWithCounts,
        ],
      },
      {
        id: 'day',
        label: isAr ? 'اليوم' : isEn ? 'Day' : 'Jour',
        value: dayFilter,
        onChange: setDayFilter,
        kind: 'tiles',
        columns: 3,
        options: [
          { value: 'All', label: isAr ? 'كل الأيام' : isEn ? 'All Days' : 'Tous les jours' },
          ...days.map((d) => ({ value: String(d.id), label: d.label })),
        ],
      },
      {
        id: 'category',
        label: isAr ? 'التخصص' : isEn ? 'Discipline' : 'Discipline',
        value: categoryFilter,
        onChange: setCategoryFilter,
        kind: 'tiles',
        columns: 2,
        options: categories.map((c) => ({
          value: c,
          label: c === 'All' ? (isAr ? 'الكل' : isEn ? 'All' : 'Toutes') : c,
        })),
      },
    ],
    [isAr, isEn, branchFilter, allScheduleEvents.length, branchOptionsWithCounts, dayFilter, days, categoryFilter]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (dayFilter !== 'All') {
      chips.push({
        key: 'day',
        label: getDayName(parseInt(dayFilter, 10)),
        onRemove: () => setDayFilter('All'),
      });
    }
    if (categoryFilter !== 'All') {
      chips.push({ key: 'category', label: categoryFilter, onRemove: () => setCategoryFilter('All') });
    }
    return chips;
  }, [branchFilter, dayFilter, categoryFilter, getDayName]);

  if (showSkeleton && (allScheduleEvents.length === 0 || networkMode === 'force_skeleton')) {
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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center p-0.5 rounded-xl bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] gap-0.5 text-xs font-semibold shadow-2xs overflow-x-auto max-w-full">
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
          {days.find((d) => d.id === selectedDay)?.label} · {currentDayEvents.length}{' '}
          {isAr ? 'حصص' : 'sessions'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentDayEvents.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-black/62 dark:text-white/65">
            {isAr
              ? 'لا توجد حصص مجدولة لهذا اليوم'
              : `No sessions planned for ${days.find((d) => d.id === selectedDay)?.label}.`}
          </div>
        ) : (
          currentDayEvents.map((event) => {
            const isFull = event.enrolledCount >= event.capacity;
            const fillRatio = Math.round((event.enrolledCount / event.capacity) * 100);
            const branchName = resolveRecordBranch(event, branchesById, currentBranch, language).name;
            return (
              <button
                key={event.id}
                type="button"
                onClick={(e) => {
                  setDrawerOpenerEl(e.currentTarget);
                  setSelectedEvent(event);
                }}
                className="text-left rtl:text-right p-5 rounded-[18px] bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs hover:border-[#d4522f] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.04em] rtl:normal-case bg-[#F3EDE7] dark:bg-[#262422] text-black/72 dark:text-white/80 px-2 py-0.5 rounded-md">
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
                      <MapPin size={12} className="shrink-0" />
                      <span>
                        {event.roomOrArea} · {branchName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="shrink-0" />
                      <span>{event.trainerOrStaff}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E6DED6]/60 dark:border-[#3A3734] w-full">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-black/62 dark:text-white/65">
                      {isFull ? (isAr ? 'مكتمل' : 'Complet') : isAr ? 'الأماكن' : 'Capacité'}
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
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      <ScreenHeaderBar
        icon={<Calendar size={22} />}
        title={terminology.scheduler}
        primaryAction={{
          label: t('schedule_new_session', language),
          icon: <Plus size={15} strokeWidth={2.5} />,
          onClick: () => setIsAddModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'الطاقة الاستيعابية وجدول التمارين' : isEn ? 'Weekly Session Matrix' : 'Matrice des Séances & Occupation'}
        language={language}
        primaryCard={{
          label: isAr ? 'الحصص المتاحة' : isEn ? 'Open Sessions' : 'Créneaux Ouverts',
          badgeText: `↗ ${allScheduleEvents.length} total`,
          count: openCount,
          tone: 'emerald',
          isActive: availabilityFilter === 'Open',
          onToggle: () => setAvailabilityFilter((p) => (p === 'Open' ? 'All' : 'Open')),
        }}
        secondaryCard={{
          label: isAr ? 'الحصص المكتملة' : isEn ? 'Full Capacity' : 'Séances Complètes',
          badgeText: isAr ? 'مكتمل' : isEn ? 'full' : 'complètes',
          count: fullCount,
          tone: 'terracotta',
          isActive: availabilityFilter === 'Full',
          onToggle: () => setAvailabilityFilter((p) => (p === 'Full' ? 'All' : 'Full')),
        }}
        darkCard={{
          label: t('schedule_enrolled_athletes', language),
          badgePrefix: '',
          badgeCount: allScheduleEvents.length,
          badgeSuffix: 'sessions',
          valuePrefix: '',
          valueCount: totalEnrolled,
          caption: `${t('schedule_peak_capacity', language)} · 12:00 - 18:30`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'قائمة الحصص والجلسات' : isEn ? 'Schedule Collection' : 'Planning des Séances'}
          liveRegionText={`${sortedCollectionEvents.length} sessions`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'ابحث عن الحصة، المدرب، القاعة أو الفرع...'
              : isEn
              ? 'Search session, coach, studio, branch...'
              : 'Rechercher cours, coach, salle, branche...'
          }
          statusOptions={statusOptions}
          statusValue={availabilityFilter}
          onStatusChange={(v) => setAvailabilityFilter(v as any)}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          showCalendarToggle
          onViewModeChange={(m) => setViewMode(m)}
          onExport={handleExportCSV}
          extraTrailingControls={
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-center text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer transition-colors shadow-2xs"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={15} />
            </button>
          }
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<ScheduleEvent>
          items={sortedCollectionEvents}
          keyExtractor={(e) => e.id}
          viewMode={viewMode}
          hideToolbar
          showCalendarToggle
          openItemId={selectedEvent?.id ?? null}
          renderCalendarView={renderTimetableView}
          columns={eventColumns}
          selectedIds={selectedEventIds}
          onSelectionChange={setSelectedEventIds}
          pinnedIds={pinnedEventIds}
          onPinToggle={(e: any) => {
            const id = typeof e === 'string' ? e : e.id;
            setPinnedEventIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          sortBy={eventSortBy}
          sortDirection={eventSortDir}
          onSortChange={(key, dir) => {
            setEventSortBy(key);
            setEventSortDir(dir);
          }}
          onItemClick={(ev, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedEvent(ev);
          }}
          onViewDetails={(ev, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedEvent(ev);
          }}
          bulkSecondaryAction={{
            label: isAr ? 'نسخ للأسبوع المقبل' : 'Dupliquer semaine',
            icon: <Plus size={13} />,
            onClick: (ids) => {
              showToast?.({
                type: 'success',
                title: 'Planification',
                message: `${ids.size} sessions dupliquées.`,
              });
            },
            variant: 'primary',
          }}
          onBulkDelete={(ids) => {
            batchDeleteScheduleEvents(Array.from(ids));
            showToast?.({
              type: 'info',
              title: 'Sessions supprimées',
              message: `${ids.size} sessions retirées du planning.`,
            });
          }}
          emptyTitle={isAr ? 'لا توجد حصص' : 'No timetable sessions found'}
          emptyDescription={isAr ? 'جرب تغيير الفلاتر' : 'Try adjusting search, branch, or discipline filters.'}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || availabilityFilter !== 'All' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedCollectionEvents.length}
        entityPluralLabel={isAr ? 'حصص' : 'sessions'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<ScheduleEvent>
        isOpen={selectedEvent !== null}
        item={selectedEvent}
        allItems={sortedCollectionEvents}
        keyExtractor={(e) => e.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedEvent?.title || ''}
        subtitle={
          selectedEvent
            ? `${getDayName(selectedEvent.dayOfWeek)} · ${selectedEvent.startTime} - ${selectedEvent.endTime}`
            : undefined
        }
        avatarText={selectedEvent ? selectedEvent.title.charAt(0).toUpperCase() : undefined}
        branchName={
          selectedEvent
            ? resolveRecordBranch(selectedEvent, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          selectedEvent
            ? selectedEvent.enrolledCount >= selectedEvent.capacity
              ? isAr ? 'مكتمل' : 'Complet'
              : isAr ? 'متاح' : 'Ouvert'
            : undefined
        }
        statusClassName={
          selectedEvent && selectedEvent.enrolledCount >= selectedEvent.capacity
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }
        onClose={() => setSelectedEvent(null)}
        onSelectItem={(ev) => setSelectedEvent(ev)}
        renderBody={(ev) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold uppercase text-[#d4522f]">{ev.category}</span>
                <div className="text-base font-bold text-black dark:text-white mt-0.5">
                  {ev.startTime} - {ev.endTime}
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-[#d4522f] tabular-nums">
                {ev.enrolledCount}/{ev.capacity}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2.5">
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">{isAr ? 'المدرب:' : 'Coach :'}</span>
                <span className="font-bold text-black dark:text-white">{ev.trainerOrStaff}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">{isAr ? 'القاعة:' : 'Salle / Studio :'}</span>
                <span className="font-semibold text-black dark:text-white">{ev.roomOrArea}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">{isAr ? 'اليوم:' : 'Jour :'}</span>
                <span className="font-semibold text-black dark:text-white">{getDayName(ev.dayOfWeek)}</span>
              </div>
            </div>

            <AtriumButton
              type="button"
              variant="primary"
              className="w-full justify-center"
              icon={<UserPlus size={14} />}
              onClick={() =>
                showToast?.({
                  type: 'success',
                  title: isAr ? 'تم تسجيل الحضور' : 'Check-In Recorded',
                  message: `${ev.title} (+1)`,
                })
              }
            >
              {isAr ? 'تسجيل مشترك في الحصة' : isEn ? 'Enroll Member in Session' : 'Inscrire un adhérent'}
            </AtriumButton>
          </div>
        )}
      />

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
            <AtriumButton type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              <span>{t('action_cancel', language)}</span>
            </AtriumButton>
            <AtriumButton type="button" variant="primary" onClick={handleSaveNewSession}>
              <span>
                {isAr
                  ? 'حفظ الحصة في الجدول'
                  : language === 'fr'
                  ? 'Enregistrer le créneau'
                  : 'Save Schedule'}
              </span>
            </AtriumButton>
          </div>
        </div>
      </Modal>
    </div>
  );
});

MembershipSchedulerView.displayName = 'MembershipSchedulerView';
export const SchedulerScreen = MembershipSchedulerView;
