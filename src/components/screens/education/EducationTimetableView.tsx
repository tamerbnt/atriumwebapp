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
import { useAtriumStore, showToast } from '../../../services/store';
import { EduSession } from '../../../types';
import { RollCallModal } from './RollCallModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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

  const {
    eduSessions,
    eduCohorts,
    eduClassrooms,
    staff,
    currentBranch,
    branches,
    addEduSession,
    deleteEduSession,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();

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
    showToast({
      type: 'success',
      title: isAr ? 'تمت إضافة الحصة' : isEn ? 'Session Scheduled' : 'Séance planifiée',
      message: isAr ? 'تمت إضافة الحصة التدريبية' : 'Créneau d’enseignement ajouté au planning',
    });
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

  const sessionColumns: ColumnDefinition<EduSession>[] = useMemo(
    () => [
      {
        key: 'schedule',
        header: isAr ? 'التوقيت' : isEn ? 'Date & Time' : 'Horaire & Date',
        width: '165px',
        sortable: true,
        renderCell: (s) => (
          <div className="space-y-0.5 font-mono">
            <div className="font-bold text-xs text-[#d4522f] flex items-center gap-1.5">
              <CalendarIcon size={12} />
              <span>{s.date}</span>
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 flex items-center gap-1">
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
            <span className="font-bold text-xs text-black dark:text-white block">{s.cohortName}</span>
            {s.topic && (
              <span className="text-[11px] text-black/55 dark:text-white/55 line-clamp-1">{s.topic}</span>
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
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
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
          <span className="text-xs font-semibold text-black dark:text-white flex items-center gap-1">
            <MapPin size={12} className="text-[#d4522f]" />
            <span>{s.classroomName || 'Non assignée'}</span>
          </span>
        ),
      },
      {
        key: 'instructor',
        header: isAr ? 'المدرب' : isEn ? 'Instructor' : 'Formateur / Enseignant',
        width: '165px',
        renderCell: (s) => (
          <span className="text-xs font-medium text-black/70 dark:text-white/75 flex items-center gap-1">
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1">
              <AlertTriangle size={10} />
              Conflit
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
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
        <div className="py-16 text-center text-black/55 dark:text-white/55">
          <CalendarIcon size={32} className="mx-auto mb-2 opacity-40 text-[#d4522f]" />
          <p className="text-xs font-semibold">
            {isAr ? 'لا توجد حصص مجدولة حالياً' : 'Aucune séance programmée dans le planning'}
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {dates.map((dateStr) => {
          const daySessions = sortedSessions
            .filter((s) => s.date === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div
              key={dateStr}
              className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 p-3.5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#d4522f]" />
                  <span className="font-mono text-xs font-bold text-black dark:text-white">{dateStr}</span>
                </div>
                <span className="text-[10px] font-semibold text-black/55 dark:text-white/55 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                  {daySessions.length} {isAr ? 'حصص' : 'séances'}
                </span>
              </div>
              <div className="space-y-2.5">
                {daySessions.map((s) => {
                  const hasConflict = conflicts.has(s.id);
                  const isSelected = activeSession?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={(e) => {
                        setDrawerOpenerEl(e.currentTarget);
                        setSelectedSession(s);
                      }}
                      className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#d4522f] bg-[#FCEEE8]/40 dark:bg-neutral-800 shadow-xs'
                          : 'border-neutral-200/70 dark:border-neutral-700/60 hover:border-[#d4522f]/60 bg-neutral-50/50 dark:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#d4522f] flex items-center gap-1">
                          <Clock size={11} />
                          {s.startTime} - {s.endTime}
                        </span>
                        {hasConflict && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Conflit
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-black dark:text-white truncate">{s.cohortName}</div>
                      {s.topic && (
                        <div className="text-[11px] text-black/55 dark:text-white/55 line-clamp-1 mt-0.5">
                          {s.topic}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-between text-[10px] text-black/55 dark:text-white/55">
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                          <MapPin size={10} className="text-[#d4522f]" />
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
        subtitle={`${eduSessions.length} ${isAr ? 'حصة مبرمجة' : isEn ? 'scheduled sessions' : 'séances planifiées'}`}
        secondaryActions={
          conflicts.size > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-semibold">
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
          data={sortedSessions}
          keyExtractor={(s) => s.id}
          viewMode={viewMode}
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
          }}
          onViewDetails={(s, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedSession(s);
          }}
          onDelete={(s) => {
            deleteEduSession(s.id);
            if (selectedSession?.id === s.id) setSelectedSession(null);
            showToast({
              type: 'info',
              title: isAr ? 'تم حذف الحصة' : 'Séance retirée du planning',
              message: s.cohortName || '',
            });
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
            ids.forEach((id) => deleteEduSession(id));
            setSelectedSessionIds(new Set<string>());
            if (selectedSession && ids.has(selectedSession.id)) setSelectedSession(null);
            showToast({
              type: 'info',
              title: isAr ? 'تم الحذف' : 'Séances supprimées',
              message: isAr ? 'تم حذف الحصص المحددة' : 'Séances supprimées du planning',
            });
          }}
          renderCard={(s) => {
            const hasConflict = conflicts.has(s.id);
            return (
              <div className="p-4 flex flex-col justify-between h-full space-y-3 w-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-mono text-xs font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded">
                    {s.startTime} - {s.endTime}
                  </div>
                  {hasConflict ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      Conflit
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Planifiée
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-black dark:text-white line-clamp-1">{s.cohortName}</h4>
                  <p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 line-clamp-1">
                    {s.topic || 'Séance de cours'}
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-black/55 dark:text-white/55">
                  <span>{s.classroomName || 'Salle'}</span>
                  <span className="font-medium text-black/70 dark:text-white/75 truncate max-w-[120px]">
                    {s.instructorName}
                  </span>
                </div>
              </div>
            );
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
        avatarText={(activeSession?.cohortName || 'S').charAt(0).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeSession ? resolveRecordBranch(activeSession, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeSession && conflicts.has(activeSession.id) ? 'Conflit' : 'Planifiée'}
        tabs={[
          { id: 'seance', label: isAr ? 'تفاصيل الحصة' : 'Séance & Cours' },
          { id: 'salle', label: isAr ? 'القاعة والتجهيزات' : 'Salle & Capacité' },
          { id: 'emargement', label: isAr ? 'ورقة الحضور' : 'Émargement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={(id) => setInspectorTab(id as 'seance' | 'salle' | 'emargement')}
        onSelectItem={(s) => setSelectedSession(s)}
        onClose={() => setSelectedSession(null)}
        onDelete={(s) => {
          deleteEduSession(s.id);
          setSelectedSession(null);
        }}
        renderBody={(sess, tab) => (
          <div className="space-y-4 text-xs">
            {tab === 'seance' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#F3EDE7] dark:bg-neutral-900/60 rounded-xl border border-[#E6DED6] dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Fiche Pédagogique
                  </span>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Promotion / Cohorte:</span>
                    <span className="font-bold text-black dark:text-white">{sess.cohortName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Date & Créneau:</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {sess.date} ({sess.startTime} - {sess.endTime})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Formateur:</span>
                    <span className="font-medium text-black dark:text-white">{sess.instructorName}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Sujet / Module Traité
                  </span>
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-black dark:text-white">
                    {sess.topic || 'Séance magistrale et travaux pratiques dirigés selon le syllabus de la formation.'}
                  </div>
                </div>
              </div>
            )}

            {tab === 'salle' && (
              <div className="p-3.5 bg-[#F3EDE7] dark:bg-neutral-900/60 rounded-xl border border-[#E6DED6] dark:border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                  Espace Pédagogique Assigné
                </span>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Salle de cours:</span>
                  <span className="font-bold text-black dark:text-white">{sess.classroomName || 'Salle A1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Équipements:</span>
                  <span className="text-black/70 dark:text-white/75">Vidéoprojecteur HD, Tableau blanc, Wi-Fi</span>
                </div>
              </div>
            )}

            {tab === 'emargement' && (
              <div className="p-3.5 bg-[#F3EDE7] dark:bg-neutral-900/60 rounded-xl border border-[#E6DED6] dark:border-neutral-800 space-y-3">
                <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                  Appel & Présences Étudiants
                </span>
                <p className="text-[11px] text-black/70 dark:text-white/75">
                  Feuille d'émargement officielle de la séance. Les absences non justifiées sont transmises à l'administration.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRollCallSession(sess);
                    setIsRollCallOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#d4522f] hover:opacity-90 text-white transition-opacity cursor-pointer"
                >
                  Lancer l'Appel des Présences
                </button>
              </div>
            )}

            <AtriumButton
              variant="outline"
              className="w-full justify-center"
              icon={<Printer size={14} />}
              onClick={() => {
                showToast({
                  type: 'success',
                  title: isAr ? 'طباعة ورقة الحضور' : 'Impression lancée',
                  message: isAr ? 'جاري طباعة ورقة الحضور' : "Impression de la feuille d'émargement",
                });
              }}
            >
              {isAr ? 'طباعة ورقة الحضور' : 'Imprimer Feuille d’Émargement'}
            </AtriumButton>
          </div>
        )}
      />

      {isAddSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-md shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <CalendarIcon size={20} className="text-[#d4522f]" />
                <h3 className="font-bold text-base text-black dark:text-white">{t('edu_btn_add_session')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSessionModalOpen(false)}
                className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white p-1 cursor-pointer"
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
                <div className="grid grid-cols-2 gap-1.5">
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
