import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  Clock,
  Users,
  MapPin,
  Maximize2,
  UserPlus,
  Calendar,
  Eye,
  Trash2,
  Copy,
  CheckCircle2,
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorListItem,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
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

  const handleDeleteEvent = useCallback(
    (ev: ScheduleEvent) => {
      setLocalAddedEvents((prev) => prev.filter((item) => item.id !== ev.id));
      batchDeleteScheduleEvents([ev.id]);
      if (selectedEvent?.id === ev.id) setSelectedEvent(null);
      showToast?.({
        type: 'info',
        title: isAr ? 'تم حذف الحصة' : isEn ? 'Session Removed' : 'Créneau supprimé',
        message: ev.title,
      });
    },
    [batchDeleteScheduleEvents, selectedEvent?.id, isAr, isEn]
  );

  const getRowMeta = useCallback(
    (ev: ScheduleEvent): Partial<KineticRowData> => {
      const isFull = ev.enrolledCount >= ev.capacity;
      const pct = ev.capacity > 0 ? Math.round((ev.enrolledCount / ev.capacity) * 100) : 0;
      const branch = resolveRecordBranch(ev, branchesById, currentBranch, language);
      return {
        subline: `${getDayName(ev.dayOfWeek)} · ${ev.startTime}-${ev.endTime} · ${ev.roomOrArea}`,
        categoryLabel: ev.category,
        statusLabel: isFull
          ? isAr ? 'مكتمل' : isEn ? 'Full' : 'Complet'
          : pct >= 80
          ? isAr ? 'شبه ممتلئ' : isEn ? 'Filling' : 'Presque plein'
          : isAr ? 'متاح' : isEn ? 'Open' : 'Ouvert',
        statusVariant: isFull ? 'blocked' : pct >= 80 ? 'warning' : 'active',
        metricPrimary: `${ev.enrolledCount}/${ev.capacity}`,
        metricSecondary: `${pct}% ${isAr ? 'امتلاء' : isEn ? 'fill' : 'taux'}`,
        detailCol1: {
          heading: isAr ? 'التوقيت والقاعة' : isEn ? 'Slot & Studio' : 'Créneau & Salle',
          primaryText: `${ev.startTime} – ${ev.endTime}`,
          secondaryText: `${getDayName(ev.dayOfWeek)} · ${ev.roomOrArea}`,
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: isAr ? 'التأطير والمدرب' : isEn ? 'Coaching Staff' : 'Encadrement',
          primaryText: ev.trainerOrStaff,
          secondaryText: ev.category,
        },
        detailCol3: {
          heading: isAr ? 'الطاقة الاستيعابية' : isEn ? 'Capacity' : 'Places & Remplissage',
          primaryText: `${ev.enrolledCount} / ${ev.capacity}`,
          secondaryText: `${Math.max(0, ev.capacity - ev.enrolledCount)} ${
            isAr ? 'أماكن متاحة' : isEn ? 'spots left' : 'places libres'
          }`,
        },
      };
    },
    [branchesById, currentBranch, language, getDayName, isAr, isEn]
  );

  const getFanActions = useCallback(
    (ev: ScheduleEvent): KineticRowFanAction[] => [
      {
        id: 'enroll',
        label: isAr ? 'تسجيل حضور' : isEn ? 'Enroll +1' : 'Inscrire +1',
        icon: <UserPlus className="w-[15px] h-[15px]" />,
        onClick: () =>
          showToast?.({
            type: 'success',
            title: isAr ? 'تم تسجيل الحضور' : 'Check-In Recorded',
            message: `${ev.title} (+1)`,
          }),
      },
      {
        id: 'view',
        label: isAr ? 'معاينة' : isEn ? 'Inspect' : 'Fiche',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedEvent(ev);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => handleDeleteEvent(ev),
      },
    ],
    [isAr, isEn, handleDeleteEvent]
  );

  const getDetailActions = useCallback(
    (ev: ScheduleEvent): KineticDetailAction[] => [
      {
        id: 'view',
        label: isAr ? 'فتح البطاقة' : isEn ? 'Inspect Session' : 'Fiche complète',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => setSelectedEvent(ev),
      },
      {
        id: 'enroll',
        label: isAr ? 'تسجيل مشترك' : isEn ? 'Enroll Member' : 'Inscrire adhérent',
        icon: <UserPlus className="w-3.5 h-3.5 text-[#096b40]" />,
        onClick: () =>
          showToast?.({
            type: 'success',
            title: isAr ? 'تم تسجيل الحضور' : 'Check-In Recorded',
            message: `${ev.title} (+1)`,
          }),
      },
    ],
    [isAr, isEn]
  );

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
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
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
          onDelete={handleDeleteEvent}
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
        avatarText={selectedEvent ? selectedEvent.title.slice(0, 2).toUpperCase() : undefined}
        categoryLabel={selectedEvent?.category}
        branchName={
          selectedEvent
            ? resolveRecordBranch(selectedEvent, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          selectedEvent
            ? selectedEvent.enrolledCount >= selectedEvent.capacity
              ? isAr ? 'مكتمل' : isEn ? 'Full' : 'Complet'
              : isAr ? 'متاح' : isEn ? 'Open' : 'Ouvert'
            : undefined
        }
        statusClassName={
          selectedEvent && selectedEvent.enrolledCount >= selectedEvent.capacity
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'الحصة والتوقيت' : isEn ? 'Overview' : 'Aperçu & Créneau' },
          { id: 'attendance', label: isAr ? 'المسجلون' : isEn ? 'Roster' : 'Inscrits & Capacité' },
          { id: 'room', label: isAr ? 'القاعة والمدرب' : isEn ? 'Coach & Room' : 'Salle & Coach' },
        ]}
        holdToDelete
        onClose={() => setSelectedEvent(null)}
        onSelectItem={(ev) => setSelectedEvent(ev)}
        onDelete={handleDeleteEvent}
        renderBody={(ev, activeTab) => {
          const isFull = ev.enrolledCount >= ev.capacity;
          const pct = ev.capacity > 0 ? Math.round((ev.enrolledCount / ev.capacity) * 100) : 0;
          const spotsLeft = Math.max(0, ev.capacity - ev.enrolledCount);
          const branchName = resolveRecordBranch(ev, branchesById, currentBranch, language).name;

          if (activeTab === 'attendance') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'معدل الامتلاء' : isEn ? 'Capacity Fill' : 'Taux de remplissage'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'المسجلون حالياً' : isEn ? 'Enrolled' : 'Participants inscrits'}
                      value={`${ev.enrolledCount} / ${ev.capacity}`}
                      tone={isFull ? 'danger' : 'ok'}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الأماكن المتاحة' : isEn ? 'Spots Left' : 'Places restantes'}
                      value={`${spotsLeft}`}
                      tone={spotsLeft === 0 ? 'danger' : 'accent'}
                      isLast
                    />
                    <InspectorProgressBar
                      percent={pct}
                      tone={isFull ? 'danger' : pct >= 80 ? 'accent' : 'ok'}
                    />
                  </InspectorCard>
                </InspectorSection>

                <InspectorSection index={1} title={isAr ? 'الحضور السريع' : isEn ? 'Session Check-ins' : 'Liste de présence'}>
                  <InspectorCard>
                    <InspectorListItem
                      title={ev.trainerOrStaff}
                      subtitle={isAr ? 'المدرب المشرف' : isEn ? 'Lead Instructor' : 'Coach référent'}
                      badge={{ label: isAr ? 'مؤكد' : 'Confirmé', tone: 'ok' }}
                    />
                    <InspectorListItem
                      title={`${ev.enrolledCount} ${isAr ? 'مشترك مسجل' : isEn ? 'registered members' : 'adhérents inscrits'}`}
                      subtitle={`${ev.roomOrArea} · ${ev.startTime}-${ev.endTime}`}
                      badge={{ label: `${pct}%`, tone: isFull ? 'danger' : 'ok' }}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>

                <InspectorSection index={2}>
                  <InspectorWideButton
                    label={isAr ? 'تسجيل مشترك في الحصة' : isEn ? 'Enroll Member in Session' : 'Inscrire un adhérent'}
                    icon={<UserPlus className="w-4 h-4" />}
                    tone="accent"
                    onClick={() =>
                      showToast?.({
                        type: 'success',
                        title: isAr ? 'تم تسجيل الحضور' : 'Check-In Recorded',
                        message: `${ev.title} (+1)`,
                      })
                    }
                  />
                </InspectorSection>
              </>
            );
          }

          if (activeTab === 'room') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'القاعة والموقع' : isEn ? 'Studio & Branch' : 'Infrastructure'}>
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'القاعة' : 'Salle / Studio'} value={ev.roomOrArea} mono={false} />
                    <InspectorKeyValue label={isAr ? 'المدرب' : 'Coach'} value={ev.trainerOrStaff} mono={false} />
                    <InspectorKeyValue label={isAr ? 'الفرع' : 'Branche'} value={branchName} mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'جدولة الصيانة' : isEn ? 'Readiness' : 'Disponibilité salle'}>
                  <InspectorCard>
                    <InspectorListItem
                      title={`${ev.roomOrArea} · ${isAr ? 'جاهز للاستقبال' : 'Prêt pour séance'}`}
                      subtitle={`${getDayName(ev.dayOfWeek)} · ${ev.startTime} - ${ev.endTime}`}
                      badge={{ label: isAr ? 'جاهز' : 'Prêt', tone: 'ok' }}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'enroll',
                      label: isAr ? 'تسجيل مشترك' : isEn ? 'Enroll +1' : 'Inscrire adhérent',
                      icon: <UserPlus className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () =>
                        showToast?.({
                          type: 'success',
                          title: isAr ? 'تم تسجيل الحضور' : 'Check-In Recorded',
                          message: `${ev.title} (+1)`,
                        }),
                    },
                    {
                      id: 'duplicate',
                      label: isAr ? 'نسخ الحصة' : isEn ? 'Duplicate' : 'Dupliquer',
                      icon: <Plus className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        const clone: ScheduleEvent = {
                          ...ev,
                          id: `sch_copy_${Date.now()}`,
                          enrolledCount: 0,
                        };
                        setLocalAddedEvents((prev) => [clone, ...prev]);
                        showToast?.({
                          type: 'success',
                          title: isAr ? 'تم النسخ' : 'Séance dupliquée',
                          message: ev.title,
                        });
                      },
                    },
                    {
                      id: 'copy-slot',
                      label: isAr ? 'نسخ التوقيت' : isEn ? 'Copy Slot' : 'Copier créneau',
                      icon: <Copy className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        const txt = `${ev.title} · ${getDayName(ev.dayOfWeek)} ${ev.startTime}-${ev.endTime}`;
                        navigator.clipboard?.writeText(txt);
                        showToast?.({ type: 'success', title: 'Copié', message: txt });
                      },
                    },
                    {
                      id: 'confirm',
                      label: isAr ? 'تأكيد الحصة' : isEn ? 'Confirm' : 'Confirmer coach',
                      icon: <CheckCircle2 className="w-[18px] h-[18px] text-[#096b40]" />,
                      onClick: () =>
                        showToast?.({
                          type: 'success',
                          title: isAr ? 'تم التأكيد' : 'Coach confirmé',
                          message: ev.trainerOrStaff,
                        }),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'تفاصيل التوقيت' : isEn ? 'Session Schedule' : 'Détails du créneau'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'التخصص' : 'Discipline'} value={ev.category} tone="accent" mono={false} />
                  <InspectorKeyValue label={isAr ? 'اليوم' : 'Jour'} value={getDayName(ev.dayOfWeek)} mono={false} />
                  <InspectorKeyValue
                    label={isAr ? 'التوقيت' : 'Horaire'}
                    icon={<Clock className="w-[15px] h-[15px]" />}
                    value={`${ev.startTime} - ${ev.endTime}`}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'الامتلاء' : 'Capacité'}
                    value={`${ev.enrolledCount}/${ev.capacity} (${pct}%)`}
                    tone={isFull ? 'danger' : 'ok'}
                    isLast
                  />
                  <InspectorProgressBar percent={pct} tone={isFull ? 'danger' : 'ok'} />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'التأطير والمكان' : isEn ? 'Staff & Location' : 'Encadrement & Lieu'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'المدرب' : 'Coach'} value={ev.trainerOrStaff} mono={false} />
                  <InspectorKeyValue label={isAr ? 'القاعة' : 'Studio'} value={ev.roomOrArea} mono={false} />
                  <InspectorKeyValue label={isAr ? 'الفرع' : 'Branche'} value={branchName} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
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
