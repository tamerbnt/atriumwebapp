import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  Printer,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentEduSessionsFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentEduClassroomsFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { EduSession } from '../../../types';
import { RollCallModal } from './RollCallModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCalendarTimeline } from '../../ui/skeleton/StructuralSkeletons';
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
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const EducationTimetableView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { eduSessions, eduCohorts, eduClassrooms, staff, currentBranch, branches, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      eduSessions: selectCurrentEduSessionsFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
      eduClassrooms: selectCurrentEduClassroomsFromState(s),
      staff: selectCurrentStaffFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { addEduSession, deleteEduSession, retryCloudSync } = useAtriumActions();

  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<EduSession | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'seance' | 'salle' | 'emargement'>('seance');

  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(() => new Set<string>());
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('calendar');
  const [sortBy, setSortBy] = useState<string>('schedule');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [rollCallSession, setRollCallSession] = useState<EduSession | null>(null);

  const [formData, setFormData] = useState({
    cohortId: eduCohorts[0]?.id || '',
    classroomId: eduClassrooms[0]?.id || '',
    instructorId: staff[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    topic: '',
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    eduSessions.forEach((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language).name;
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }, [eduSessions, branchesById, currentBranch, language]);

  const filteredSessions = useMemo(() => {
    return eduSessions.filter((s) => {
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language).name;
        if (b !== branchFilter) return false;
      }
      if (selectedClassroomId !== 'all' && s.classroomId !== selectedClassroomId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          (s.topic || '').toLowerCase().includes(q) ||
          (s.instructorName || '').toLowerCase().includes(q) ||
          (s.cohortName || '').toLowerCase().includes(q) ||
          (s.classroomName || '').toLowerCase().includes(q) ||
          s.date.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [eduSessions, branchFilter, selectedClassroomId, searchQuery, branchesById, currentBranch, language]);

  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      const aPinned = pinnedSessionIds.has(a.id);
      const bPinned = pinnedSessionIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'cohort') {
        cmp = (a.cohortName || '').localeCompare(b.cohortName || '');
      } else if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredSessions, pinnedSessionIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const conflicts = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < filteredSessions.length; i++) {
      for (let j = i + 1; j < filteredSessions.length; j++) {
        const a = filteredSessions[i];
        const b = filteredSessions[j];
        if (a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime) {
          if (
            (a.classroomId && a.classroomId === b.classroomId) ||
            (a.instructorId && a.instructorId === b.instructorId)
          ) {
            set.add(a.id);
            set.add(b.id);
          }
        }
      }
    }
    return set;
  }, [filteredSessions]);

  const activeSession = useMemo(() => {
    if (!selectedSession) return null;
    return eduSessions.find((s) => s.id === selectedSession.id) || selectedSession;
  }, [selectedSession, eduSessions]);

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const cohort = eduCohorts.find((c) => c.id === formData.cohortId);
    const room = eduClassrooms.find((r) => r.id === formData.classroomId);
    const instructor = staff.find((s) => s.id === formData.instructorId);
    if (!cohort) return;
    addEduSession({
      cohortId: cohort.id,
      cohortName: cohort.name,
      classroomId: room?.id,
      classroomName: room?.name,
      instructorId: instructor?.id || cohort.instructorId,
      instructorName: instructor?.fullName || cohort.instructorName,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      topic: formData.topic || undefined,
      status: 'Scheduled',
    });
    setIsAddSessionModalOpen(false);
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'البداية' : 'Début',
      isAr ? 'النهاية' : 'Fin',
      isAr ? 'الفوج' : 'Cohorte',
      isAr ? 'الموضوع' : 'Module',
      isAr ? 'القاعة' : 'Salle',
      isAr ? 'المدرب' : 'Formateur',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedSessions.map((s) => [
      s.date,
      s.startTime,
      s.endTime,
      s.cohortName || '',
      s.topic || '',
      s.classroomName || 'Non assignée',
      s.instructorName || '',
      resolveRecordBranch(s, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`timetable-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : isEn ? 'Export Complete' : 'Export réussi',
      message: `${sortedSessions.length} séances exportées`,
    });
  }, [sortedSessions, branchesById, currentBranch, language, isAr, isEn]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: eduSessions.length },
      ...Array.from(branchCounts.entries()).map(([n, c]) => ({ value: n, label: n, count: c })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / المؤسسة' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'classroom',
        label: isAr ? 'القاعة التدريبية' : isEn ? 'Classroom' : 'Salle Campus',
        value: selectedClassroomId,
        onChange: setSelectedClassroomId,
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes' },
          ...eduClassrooms.map((cr) => ({ value: cr.id, label: cr.name })),
        ],
      },
    ];
  }, [branchFilter, selectedClassroomId, branchCounts, eduSessions.length, eduClassrooms, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (selectedClassroomId !== 'all') {
      const room = eduClassrooms.find((r) => r.id === selectedClassroomId);
      chips.push({
        key: 'classroom',
        label: room?.name || selectedClassroomId,
        onRemove: () => setSelectedClassroomId('all'),
      });
    }
    return chips;
  }, [branchFilter, selectedClassroomId, eduClassrooms, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (selectedClassroomId !== 'all' ? 1 : 0);

  const getSessionRowMeta = useCallback(
    (s: EduSession): KineticRowMeta => {
      const hasConflict = conflicts.has(s.id);
      return {
        avatarText: (s.cohortName || 'SE').slice(0, 2).toUpperCase(),
        subline: `${s.topic || 'Séance de cours'} · ${s.instructorName || 'Formateur'}`,
        categoryLabel: s.classroomName || 'Salle',
        statusVariant: hasConflict ? 'blocked' : 'active',
        statusLabel: hasConflict ? 'Conflit' : 'Planifiée',
        metricPrimary: `${s.startTime} - ${s.endTime}`,
        metricSecondary: s.date,
        detailCol1: {
          heading: isAr ? 'الحصة والأستاذ' : isEn ? 'Topic & Instructor' : 'Séance & Formateur',
          primaryText: s.topic || 'Séance de cours',
          secondaryText: s.instructorName || 'Formateur',
          tertiaryText: s.cohortName,
        },
        detailCol2: {
          heading: isAr ? 'القاعة والتوقيت' : isEn ? 'Room & Schedule' : 'Salle & Créneau',
          primaryText: s.classroomName || 'Salle standard',
          secondaryText: `${s.date} · ${s.startTime} - ${s.endTime}`,
        },
        detailCol3: {
          heading: isAr ? 'حالة الجدولة' : isEn ? 'Conflict Check' : 'Disponibilité',
          primaryText: hasConflict ? (isAr ? 'تعارض قاعة' : 'Conflit détecté') : isAr ? 'مؤكدة' : 'Planifiée',
          secondaryText: s.cohortName,
        },
      };
    },
    [conflicts, isAr, isEn]
  );

  const getSessionFanActions = useCallback(
    (s: EduSession): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedSession(s);
          setInspectorTab('seance');
        },
      },
      {
        id: 'rollcall',
        label: isAr ? 'مناداة الحضور' : isEn ? 'Roll Call' : 'Émargement',
        icon: <ClipboardList className="w-[15px] h-[15px]" />,
        onClick: () => {
          setRollCallSession(s);
          setIsRollCallOpen(true);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          deleteEduSession(s.id);
          if (selectedSession?.id === s.id) setSelectedSession(null);
        },
      },
    ],
    [isAr, isEn, deleteEduSession, selectedSession?.id]
  );

  const getSessionDetailActions = useCallback(
    (s: EduSession): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isEn ? 'Open' : 'Ouvrir',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedSession(s);
          setInspectorTab('seance');
        },
      },
      {
        id: 'rollcall',
        label: isAr ? 'مناداة الحضور' : 'Émargement',
        icon: <ClipboardList className="w-3.5 h-3.5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
        onClick: () => {
          setRollCallSession(s);
          setIsRollCallOpen(true);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => {
          deleteEduSession(s.id);
          if (selectedSession?.id === s.id) setSelectedSession(null);
        },
      },
    ],
    [isAr, isEn, deleteEduSession, selectedSession?.id]
  );

  const sessionColumns: ColumnDefinition<EduSession>[] = useMemo(
    () => [
      {
        key: 'schedule',
        header: isAr ? 'التوقيت' : isEn ? 'Date & Time' : 'Horaire & Date',
        width: '165px',
        sortable: true,
        renderCell: (s) => (
          <div className="space-y-0.5 tabular-nums">
            <div className="font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center gap-2">
              <CalendarIcon size={12} />
              <span>{s.date}</span>
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 flex items-center gap-1">
              <Clock size={11} />
              <span>
                {s.startTime} - {s.endTime}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'cohort',
        header: isAr ? 'الفوج' : isEn ? 'Cohort' : 'Cohorte / Promotion',
        width: '190px',
        sortable: true,
        renderCell: (s) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block">{s.cohortName}</span>
            {s.topic && (
              <span className="t-cap text-black/55 dark:text-white/55 line-clamp-1">{s.topic}</span>
            )}
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        sortable: true,
        renderCell: (s) => {
          const b = resolveRecordBranch(s, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'room',
        header: isAr ? 'القاعة' : isEn ? 'Classroom' : 'Salle Campus',
        width: '140px',
        renderCell: (s) => (
          <span className="t-small font-semibold text-black dark:text-white flex items-center gap-1">
            <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span>{s.classroomName || 'Non assignée'}</span>
          </span>
        ),
      },
      {
        key: 'instructor',
        header: isAr ? 'المدرب' : isEn ? 'Instructor' : 'Formateur / Enseignant',
        width: '165px',
        renderCell: (s) => (
          <span className="t-small font-medium text-black/70 dark:text-white/75 flex items-center gap-1">
            <User size={12} className="text-black/55 dark:text-white/55" />
            <span>{s.instructorName || 'Formateur'}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الوضعية' : isEn ? 'Status' : 'Statut Séance',
        width: '120px',
        renderCell: (s) =>
          conflicts.has(s.id) ? (
            <span className="px-2 py-1 rounded-full t-small font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1">
              <AlertTriangle size={10} />
              Conflit
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full t-small font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
              <CheckCircle2 size={10} />
              Planifiée
            </span>
          ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language, conflicts]
  );

  const renderCalendarGrid = () => {
    const dates = Array.from(new Set(sortedSessions.map((s) => s.date))).sort();
    if (dates.length === 0) {
      return (
        <KineticEmptyStateMotion motionKey="edu-cal-empty">
          <EmptyState
            variant="island"
            icon={<CalendarIcon />}
            title={isAr ? 'لا توجد حصص مجدولة حالياً' : 'Aucune séance programmée dans le planning'}
          />
        </KineticEmptyStateMotion>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {dates.map((dateStr) => {
          const daySessions = sortedSessions
            .filter((s) => s.date === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div key={dateStr} className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="solid"
                className="bg-white dark:bg-[#22201E] p-4 space-y-3 h-full"
              >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#d4522f]" />
                  <span className="tabular-nums t-small font-semibold text-black dark:text-white">{dateStr}</span>
                </div>
                <span className="t-small font-semibold text-black/55 dark:text-white/55 px-2 py-1 bg-neutral-100 dark:bg-[#2B2825] rounded-full">
                  {daySessions.length} {isAr ? 'حصص' : 'séances'}
                </span>
              </div>
              <div className="space-y-2">
                {daySessions.map((s) => {
                  const hasConflict = conflicts.has(s.id);
                  const isSelected = activeSession?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      data-sq="ctl"
                      data-sq-border="solid"
                      onClick={(e) => {
                        setDrawerOpenerEl(e.currentTarget);
                        setSelectedSession(s);
                      }}
                      className={`w-full text-left rtl:text-right p-3 transition-all cursor-pointer ${
                        isSelected
                          ? '[--sq-stroke:#d4522f] bg-[#FCEEE8]/40 dark:bg-[#2B2825]'
                          : 'hover:[--sq-stroke:rgba(212,82,47,0.6)] bg-neutral-50/50 dark:bg-[#191716]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="tabular-nums t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center gap-1">
                          <Clock size={11} />
                          {s.startTime} - {s.endTime}
                        </span>
                        {hasConflict && (
                          <span className="px-2 py-1 rounded-full t-small font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Conflit
                          </span>
                        )}
                      </div>
                      <div className="font-semibold t-small text-black dark:text-white truncate">{s.cohortName}</div>
                      {s.topic && (
                        <div className="t-cap text-black/55 dark:text-white/55 line-clamp-1 mt-0.5">
                          {s.topic}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t border-[var(--atr-divider)] flex items-center justify-between t-cap text-black/55 dark:text-white/55">
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                          <MapPin size={10} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                          {s.classroomName || 'Salle'}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                          <User size={10} />
                          {s.instructorName || 'Formateur'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: eduSessions.length > 0,
  });

  if (showSkeleton && (eduSessions.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCalendarTimeline
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<CalendarIcon size={22} />}
        title={t('edu_timetable_title')}
        secondaryActions={
          conflicts.size > 0 ? (
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 t-small font-semibold"
            >
              <AlertTriangle size={14} />
              <span>{conflicts.size} Conflits détectés</span>
            </div>
          ) : undefined
        }
        primaryAction={{
          label: t('edu_btn_add_session'),
          icon: <Plus size={14} />,
          onClick: () => setIsAddSessionModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'تخطيط واستخدام القاعات' : isEn ? 'Timetable & Classroom Utilization' : 'Planning & Utilisation des Espaces'}
        language={language}
        primaryCard={{
          label: isAr ? 'الحصص المبرمجة' : isEn ? 'Scheduled Sessions' : 'Séances Planifiées',
          count: filteredSessions.length,
          badgeText: `${eduSessions.length} total`,
          tone: 'emerald',
          isActive: selectedClassroomId === 'all',
          onToggle: () => setSelectedClassroomId('all'),
        }}
        secondaryCard={{
          label: isAr ? 'القاعات والورشات' : isEn ? 'Classrooms' : 'Salles & Ateliers',
          count: eduClassrooms.length,
          badgeText: '100% actives',
          tone: 'terracotta',
        }}
        darkCard={{
          label: isAr ? 'سلامة الجدول الزمني' : isEn ? 'Schedule Integrity' : 'Intégrité des Horaires',
          valueCount: conflicts.size,
          valueSuffix: conflicts.size === 0 ? ' Conflit' : ' Alertes',
          badgeCount: filteredSessions.length,
          badgeSuffix: isAr ? ' حصة' : ' séances',
          caption: conflicts.size === 0 ? 'Zéro conflit salle ou formateur' : 'Ajustement de planning requis',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'جدول الحصص والقاعات التدريبية' : isEn ? 'Master Timetable' : 'Grille Générale des Séances & Horaires'}
          liveRegionText={`${sortedSessions.length} ${isAr ? 'حصة' : 'séances'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث بالفوج، القاعة، المدرب...'
              : isEn
              ? 'Search topic, cohort, classroom, instructor...'
              : 'Rechercher matière, cohorte, salle, formateur...'
          }
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          showCalendarToggle
          onViewModeChange={(m) => setViewMode(m)}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setSelectedClassroomId('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<EduSession>
          hideToolbar
          items={sortedSessions}
          keyExtractor={(s) => s.id}
          viewMode={viewMode}
          defaultViewMode="calendar"
          showCalendarToggle
          onViewModeChange={(m: 'list' | 'grid' | 'calendar') => setViewMode(m)}
          renderCalendarView={renderCalendarGrid}
          columns={sessionColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          openItemId={activeSession?.id ?? null}
          selectedIds={selectedSessionIds}
          onSelectionChange={setSelectedSessionIds}
          pinnedIds={pinnedSessionIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedSessionIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(s, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedSession(s);
            setInspectorTab('seance');
          }}
          onViewDetails={(s, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedSession(s);
            setInspectorTab('seance');
          }}
          getRowMeta={getSessionRowMeta}
          getFanActions={getSessionFanActions}
          getDetailActions={getSessionDetailActions}
          onDelete={(s) => {
            deleteEduSession(s.id);
            if (selectedSession?.id === s.id) setSelectedSession(null);
          }}
          customActions={(s) => [
            {
              id: 'rollcall',
              tooltip: isAr ? 'مناداة الحضور' : 'Feuille d’Émargement',
              icon: <ClipboardList size={13} />,
              iconColor: '#d4522f',
              onClick: () => {
                setRollCallSession(s);
                setIsRollCallOpen(true);
              },
            },
            {
              id: 'print',
              tooltip: isAr ? 'طباعة المحضر' : 'Imprimer Liste',
              icon: <Printer size={13} />,
              onClick: () => {
                showToast({
                  type: 'info',
                  title: isAr ? 'ورقة الحضور' : 'Émargement prêt',
                  message: isAr
                    ? `طباعة ورقة الحضور للفوج ${s.cohortName}`
                    : `Feuille d'émargement générée pour ${s.cohortName}`,
                });
              },
            },
          ]}
          bulkSecondaryAction={{
            label: isAr ? 'مناداة الحضور' : 'Feuille d’émargement',
            icon: <ClipboardList size={14} />,
            onClick: (ids) => {
              showToast({
                type: 'success',
                title: isAr ? 'أوراق الحضور جاهزة' : 'Émargements prêts',
                message: isAr
                  ? `تم تجهيز أوراق الحضور لـ ${ids.size} حصص`
                  : `Feuilles d'émargement prêtes pour ${ids.size} séances`,
              });
            },
          }}
          onBulkDelete={(ids) => {
            if (ids.size === 0) return;
            runUndoBatch(
              {
                vertical: 'education_cohort',
                operationType: 'bulk',
                affectedCount: ids.size,
                summary: isAr
                  ? `حذف حصص (${ids.size})`
                  : isEn
                  ? `Delete sessions (${ids.size})`
                  : `Suppression séances (${ids.size})`,
              },
              () => {
                ids.forEach((id) => deleteEduSession(id));
              }
            );
            setSelectedSessionIds(new Set<string>());
            if (selectedSession && ids.has(selectedSession.id)) setSelectedSession(null);
          }}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedSessions.length}
        entityPluralLabel={isAr ? 'حصة' : isEn ? 'sessions' : 'séances'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setSelectedClassroomId('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<EduSession>
        isOpen={Boolean(activeSession)}
        item={activeSession}
        allItems={sortedSessions}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeSession ? `${activeSession.date} · ${activeSession.startTime}` : ''}
        subtitle={activeSession?.cohortName || ''}
        categoryLabel={activeSession?.classroomName || 'Salle'}
        avatarText={(activeSession?.cohortName || 'SE').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeSession ? resolveRecordBranch(activeSession, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeSession && conflicts.has(activeSession.id) ? 'Conflit' : 'Planifiée'}
        statusClassName={
          activeSession && conflicts.has(activeSession.id)
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
        }
        tabs={[
          { id: 'seance', label: isAr ? 'تفاصيل الحصة' : 'Séance & Cours' },
          { id: 'salle', label: isAr ? 'القاعة والتجهيزات' : 'Salle & Capacité' },
          { id: 'emargement', label: isAr ? 'ورقة الحضور' : 'Émargement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={(id) => setInspectorTab(id as 'seance' | 'salle' | 'emargement')}
        onSelectItem={(s) => {
          setSelectedSession(s);
          setInspectorTab('seance');
        }}
        onClose={() => setSelectedSession(null)}
        onDelete={(s) => {
          deleteEduSession(s.id);
          setSelectedSession(null);
        }}
        renderBody={(sess, tab) => {
          if (tab === 'salle') {
            return (
              <InspectorSection index={0} title="Espace Pédagogique Assigné">
                <InspectorCard>
                  <InspectorKeyValue label="Salle de cours" value={sess.classroomName || 'Salle A1'} mono={false} />
                  <InspectorKeyValue
                    label="Équipements"
                    value="Vidéoprojecteur HD, Tableau blanc, Wi-Fi"
                    mono={false}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (tab === 'emargement') {
            return (
              <>
                <InspectorSection index={0} title="Appel & Présences Étudiants">
                  <InspectorCard>
                    <InspectorKeyValue label="Cohorte" value={sess.cohortName || '—'} mono={false} />
                    <InspectorKeyValue label="Créneau" value={`${sess.date} · ${sess.startTime} - ${sess.endTime}`} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label="Lancer l'Appel des Présences"
                    icon={<ClipboardList size={15} />}
                    tone="accent"
                    onClick={() => {
                      setRollCallSession(sess);
                      setIsRollCallOpen(true);
                    }}
                  />
                </InspectorSection>
                <InspectorSection index={2}>
                  <InspectorWideButton
                    label={isAr ? 'طباعة ورقة الحضور' : 'Imprimer Feuille d’Émargement'}
                    icon={<Printer size={15} />}
                    tone="neutral"
                    onClick={() =>
                      showToast({
                        type: 'success',
                        title: isAr ? 'طباعة ورقة الحضور' : 'Impression lancée',
                        message: isAr ? 'جاري طباعة ورقة الحضور' : "Impression de la feuille d'émargement",
                      })
                    }
                  />
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'rollcall',
                      label: isAr ? 'مناداة الحضور' : 'Faire l’Appel',
                      icon: <ClipboardList size={16} />,
                      primary: true,
                      onClick: () => {
                        setRollCallSession(sess);
                        setIsRollCallOpen(true);
                      },
                    },
                    {
                      id: 'print',
                      label: isAr ? 'طباعة المحضر' : 'Imprimer',
                      icon: <Printer size={16} />,
                      onClick: () =>
                        showToast({
                          type: 'success',
                          title: isAr ? 'طباعة ورقة الحضور' : 'Impression lancée',
                          message: isAr ? 'جاري طباعة ورقة الحضور' : "Impression de la feuille d'émargement",
                        }),
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title="Fiche Pédagogique">
                <InspectorCard>
                  <InspectorKeyValue label="Promotion / Cohorte" value={sess.cohortName || '—'} mono={false} />
                  <InspectorKeyValue label="Date" value={sess.date} />
                  <InspectorKeyValue label="Créneau" value={`${sess.startTime} - ${sess.endTime}`} />
                  <InspectorKeyValue label="Formateur" value={sess.instructorName || '—'} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2} title="Sujet / Module Traité">
                <InspectorCard>
                  <InspectorKeyValue
                    label="Thème"
                    value={sess.topic || 'Séance magistrale et travaux pratiques dirigés.'}
                    mono={false}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {isAddSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="sq-elev-pop w-full max-w-md">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <h3 className="font-semibold t-card text-black dark:text-white">{t('edu_btn_add_session')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <LabelSelect
                label={t('edu_label_cohort')}
                value={formData.cohortId}
                onChange={(v) => setFormData({ ...formData, cohortId: extractStr(v) })}
                options={eduCohorts.map((c) => ({ value: c.id, label: c.name }))}
              />
              <LabelSelect
                label={t('edu_field_classroom')}
                value={formData.classroomId}
                onChange={(v) => setFormData({ ...formData, classroomId: extractStr(v) })}
                options={eduClassrooms.map((r) => ({
                  value: r.id,
                  label: `${r.name} (Cap: ${r.capacity})`,
                }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(v) => setFormData({ ...formData, date: extractStr(v) })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <LabelInput
                    label="Début"
                    type="time"
                    value={formData.startTime}
                    onChange={(v) => setFormData({ ...formData, startTime: extractStr(v) })}
                    required
                  />
                  <LabelInput
                    label="Fin"
                    type="time"
                    value={formData.endTime}
                    onChange={(v) => setFormData({ ...formData, endTime: extractStr(v) })}
                    required
                  />
                </div>
              </div>
              <LabelInput
                label="Module / Thème du cours"
                value={formData.topic}
                onChange={(v) => setFormData({ ...formData, topic: extractStr(v) })}
                placeholder="Ex: Programmation Web Avancée"
              />
              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" type="button" onClick={() => setIsAddSessionModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  Ajouter au Planning
                </AtriumButton>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {isRollCallOpen && rollCallSession && (
        <RollCallModal
          session={rollCallSession}
          onClose={() => {
            setIsRollCallOpen(false);
            setRollCallSession(null);
          }}
        />
      )}
    </div>
  );
};
