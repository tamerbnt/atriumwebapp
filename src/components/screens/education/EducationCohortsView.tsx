import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  BookOpen,
  GraduationCap,
  Plus,
  X,
  CheckCircle2,
  Check,
  Play,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { CohortStatus, EduCohort } from '../../../types';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
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

type CourseCat = 'All' | 'Language' | 'Technology' | 'Academic' | 'Arts';

export const EducationCohortsView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    eduCohorts,
    eduCourses,
    eduClassrooms,
    eduEnrollments,
    eduStudents,
    staff,
    currentBranch,
    branches,
    addEduCohort,
    updateEduCohort,
    deleteEduCohort,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [categoryFilter, setCategoryFilter] = useState<CourseCat>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedCohort, setSelectedCohort] = useState<EduCohort | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isAddCohortModalOpen, setIsAddCohortModalOpen] = useState(false);
  const [selectedCohortIds, setSelectedCohortIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedCohortIds, setPinnedCohortIds] = useState<Set<string>>(() => new Set<string>());
  const [cohortSortBy, setCohortSortBy] = useState<string>('name');
  const [cohortSortDir, setCohortSortDir] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    courseId: eduCourses[0]?.id || '',
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7776e6).toISOString().split('T')[0],
    maxStudents: 20,
    instructorId: staff[0]?.id || '',
    classroomId: eduClassrooms[0]?.id || '',
    scheduleSummary: 'Mon & Wed 18:00 - 20:00',
    tuitionFee: 35000,
    status: 'Enrolling',
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    eduCohorts.forEach((c) => {
      const b = resolveRecordBranch(c, branchesById, currentBranch, language).name;
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }, [eduCohorts, branchesById, currentBranch, language]);

  const activeCohort = useMemo(() => {
    if (!selectedCohort) return null;
    return eduCohorts.find((c) => c.id === selectedCohort.id) || selectedCohort;
  }, [selectedCohort, eduCohorts]);

  const filteredCohorts = useMemo(() => {
    return eduCohorts.filter((c) => {
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(c, branchesById, currentBranch, language).name;
        if (b !== branchFilter) return false;
      }
      if (categoryFilter !== 'All') {
        if (eduCourses.find((co) => co.id === c.courseId)?.category !== categoryFilter) return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          c.name.toLowerCase().includes(q) ||
          (c.cohortCode || '').toLowerCase().includes(q) ||
          (c.instructorName || '').toLowerCase().includes(q) ||
          (c.courseTitle || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [eduCohorts, branchFilter, categoryFilter, statusFilter, searchQuery, eduCourses, branchesById, currentBranch, language]);

  const sortedCohorts = useMemo(() => {
    return [...filteredCohorts].sort((a, b) => {
      const aPinned = pinnedCohortIds.has(a.id);
      const bPinned = pinnedCohortIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (cohortSortBy === 'occupancy') {
        cmp = a.enrolledCount / Math.max(1, a.maxStudents) - b.enrolledCount / Math.max(1, b.maxStudents);
      } else if (cohortSortBy === 'tuition') {
        cmp = a.tuitionFee - b.tuitionFee;
      } else if (cohortSortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return cohortSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredCohorts, pinnedCohortIds, cohortSortBy, cohortSortDir, branchesById, currentBranch, language]);

  const totalSeats = eduCohorts.reduce((sum, c) => sum + c.maxStudents, 0);
  const totalEnrolled = eduCohorts.reduce((sum, c) => sum + c.enrolledCount, 0);
  const globalOccupancy = totalSeats > 0 ? Math.round((totalEnrolled / totalSeats) * 100) : 0;
  const totalCohortValue = eduCohorts.reduce((sum, c) => sum + c.enrolledCount * c.tuitionFee, 0);

  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    const course = eduCourses.find((co) => co.id === formData.courseId);
    const room = eduClassrooms.find((r) => r.id === formData.classroomId);
    const instructor = staff.find((s) => s.id === formData.instructorId);
    if (!course) return;
    const newCohort = addEduCohort({
      courseId: course.id,
      courseTitle: course.title,
      instructorId: instructor?.id || staff[0]?.id || 'staff_01',
      instructorName: instructor?.fullName || staff[0]?.fullName || 'Instructor',
      classroomId: room?.id,
      classroomName: room?.name,
      name: formData.name || `${course.title} - Batch 01`,
      startDate: formData.startDate,
      endDate: formData.endDate,
      maxStudents: formData.maxStudents,
      tuitionFee: formData.tuitionFee,
      currency: 'DZD',
      scheduleSummary: formData.scheduleSummary,
      status: formData.status as CohortStatus,
      syllabusMilestones: [
        { title: 'Orientation & Core Fundamentals', completed: true },
        { title: 'Intermediate Hands-on Labs & Projects', completed: false },
        { title: 'Midterm Evaluation & Progress Reviews', completed: false },
        { title: 'Final Capstone Project & Certification', completed: false },
      ],
    });
    setSelectedCohort(newCohort);
    setIsAddCohortModalOpen(false);
  };

  const handleToggleMilestone = (cohortId: string, milestoneIndex: number) => {
    const cohort = eduCohorts.find((c) => c.id === cohortId);
    if (!cohort || !cohort.syllabusMilestones) return;
    const updated = cohort.syllabusMilestones.map((m, idx) =>
      idx === milestoneIndex ? { ...m, completed: !m.completed } : m
    );
    updateEduCohort(cohortId, { syllabusMilestones: updated });
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      isAr ? 'اسم الفوج / الدفعة' : isEn ? 'Cohort Name' : 'Nom Cohorte',
      isAr ? 'المقرر الدراسي' : isEn ? 'Course Title' : 'Cours',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      isAr ? 'الأستاذ' : isEn ? 'Instructor' : 'Formateur',
      isAr ? 'القاعة' : isEn ? 'Classroom' : 'Salle',
      isAr ? 'تاريخ البداية' : isEn ? 'Start Date' : 'Date Début',
      isAr ? 'تاريخ النهاية' : isEn ? 'End Date' : 'Date Fin',
      isAr ? 'المقاعد المسجلة' : isEn ? 'Enrolled' : 'Inscrits',
      isAr ? 'رسوم التسجيل' : isEn ? 'Tuition (DZD)' : 'Frais (DZD)',
      isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
    ];
    const rows = sortedCohorts.map((c) => [
      c.name,
      c.courseTitle,
      resolveRecordBranch(c, branchesById, currentBranch, language).name,
      c.instructorName,
      c.classroomName || '',
      c.startDate,
      c.endDate,
      `${c.enrolledCount}/${c.maxStudents}`,
      c.tuitionFee,
      c.status,
    ]);
    downloadCsvSafe(`cohorts-catalog-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [sortedCohorts, branchesById, currentBranch, language, isAr, isEn]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: eduCohorts.length },
      ...Array.from(branchCounts.entries()).map(([n, c]) => ({ value: n, label: n, count: c })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'status',
        label: isAr ? 'الحالة' : isEn ? 'Cohort Status' : 'Statut Cohorte',
        value: statusFilter,
        onChange: setStatusFilter,
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'Enrolling', label: isAr ? 'تسجيل' : 'Inscriptions' },
          { value: 'InProgress', label: isAr ? 'جارية' : 'En cours' },
          { value: 'Completed', label: isAr ? 'مكتملة' : 'Clôturées' },
        ],
      },
    ];
  }, [branchFilter, statusFilter, branchCounts, eduCohorts.length, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: statusFilter,
        onRemove: () => setStatusFilter('all'),
      });
    }
    if (categoryFilter !== 'All') {
      chips.push({
        key: 'category',
        label: categoryFilter,
        onRemove: () => setCategoryFilter('All'),
      });
    }
    return chips;
  }, [branchFilter, statusFilter, categoryFilter, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const cohortColumns: ColumnDefinition<EduCohort>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('edu_cohorts_title'),
        minWidth: '210px',
        sortable: true,
        renderCell: (cohort) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-black dark:text-white truncate">{cohort.name}</div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate">{cohort.courseTitle}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        sortable: true,
        renderCell: (cohort) => {
          const b = resolveRecordBranch(cohort, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'instructor',
        header: isAr ? 'الأستاذ والمدرّج' : isEn ? 'Instructor & Room' : 'Formateur & Salle',
        minWidth: '165px',
        renderCell: (cohort) => (
          <div className="space-y-0.5 text-xs">
            <div className="font-medium text-black dark:text-white truncate">{cohort.instructorName}</div>
            <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
              {cohort.classroomName || 'Room 1'}
            </div>
          </div>
        ),
      },
      {
        key: 'occupancy',
        header: isAr ? 'المقاعد والنسبة' : isEn ? 'Seats & Capacity' : 'Places Occupées',
        width: '145px',
        sortable: true,
        renderCell: (cohort) => {
          const pct = Math.min(100, Math.round((cohort.enrolledCount / Math.max(1, cohort.maxStudents)) * 100));
          return (
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-black/70 dark:text-white/75 tabular-nums">
                  {cohort.enrolledCount} / {cohort.maxStudents}
                </span>
                <span className="font-bold text-[#d4522f] tabular-nums">{pct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full bg-[#d4522f] rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        key: 'tuition',
        header: isAr ? 'رسوم التسجيل' : isEn ? 'Tuition' : "Frais d'inscription",
        width: '125px',
        sortable: true,
        renderCell: (cohort) => (
          <span className="font-bold text-black dark:text-white tabular-nums">{formatMoney(cohort.tuitionFee)}</span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        width: '110px',
        renderCell: (cohort) => {
          const isEnrolling = cohort.status === 'Enrolling';
          const isRunning = cohort.status === 'InProgress';
          const isCompleted = cohort.status === 'Completed';
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isEnrolling
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : isRunning
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : isCompleted
                  ? 'bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {cohort.status}
            </span>
          );
        },
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language]
  );

  const cohortEnrolledStudents = activeCohort
    ? eduEnrollments
        .filter((e) => e.cohortId === activeCohort.id)
        .map((e) => ({
          enrollment: e,
          student: eduStudents.find((s) => s.id === e.studentId),
        }))
    : [];

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (eduCohorts || []).length > 0,
  });

  if (showSkeleton && ((eduCohorts || []).length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '220px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.8*', minWidth: '150px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={130}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<GraduationCap size={22} />}
        title={t('edu_cohorts_title')}
        subtitle={`${eduCohorts.length} ${isAr ? 'أفواج دراسية' : isEn ? 'academic cohorts' : 'cohortes académiques'}`}
        primaryAction={{
          label: t('edu_modal_add_cohort'),
          icon: <Plus size={15} />,
          onClick: () => setIsAddCohortModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'طاقة استيعاب الأفواج والبرامج' : isEn ? 'Capacity & Cohorts Health' : 'Capacité & Santé des Cohortes'}
        language={language}
        primaryCard={{
          label: isAr ? 'الأفواج النشطة' : isEn ? 'Active Cohorts' : 'Cohortes en Cycle Actif',
          count: eduCohorts.length,
          badgeText: `${eduCourses.length} ${isAr ? 'برامج' : 'programmes'}`,
          tone: 'emerald',
          title: isAr ? 'إظهار جميع الأفواج' : 'Afficher toutes les cohortes',
          isActive: statusFilter === 'InProgress',
          onToggle: () => setStatusFilter((p) => (p === 'InProgress' ? 'all' : 'InProgress')),
        }}
        secondaryCard={{
          label: isAr ? 'نسبة امتلاء المقاعد' : isEn ? 'Seat Fill Rate' : 'Taux de remplissage',
          count: globalOccupancy,
          formatValue: (v) => `${v}%`,
          badgeText: `${totalEnrolled} / ${totalSeats} places`,
          tone: 'terracotta',
          title: isAr ? 'الأفواج المفتوحة للتسجيل' : 'Filtrer inscriptions ouvertes',
          isActive: statusFilter === 'Enrolling',
          onToggle: () => setStatusFilter((p) => (p === 'Enrolling' ? 'all' : 'Enrolling')),
        }}
        darkCard={{
          label: isAr ? 'القيمة الإجمالية للدورات' : isEn ? 'Cohort Tuition Value' : 'Valeur Financière Cohortes',
          valueCount: totalCohortValue,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v),
          badgeCount: totalEnrolled,
          badgePrefix: '',
          badgeSuffix: isAr ? 'مسجل' : 'inscrits',
          caption: isAr ? 'إجمالي الرسوم التعاقدية' : 'Volume scolarité engagé',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'الأفواج والبرامج الدراسية' : isEn ? 'Academic Cohorts' : 'Cohortes & Programmes'}
          liveRegionText={`${sortedCohorts.length} cohortes`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('edu_search_cohorts_ph')}
          statusOptions={[
            { value: 'All', label: t('edu_filter_all_programs'), count: eduCohorts.length },
            { value: 'Language', label: isAr ? 'لغات' : isEn ? 'Languages' : 'Langues' },
            { value: 'Technology', label: isAr ? 'تقنية' : 'Tech' },
            { value: 'Academic', label: isAr ? 'أكاديمي' : isEn ? 'Academic' : 'Soutien' },
            { value: 'Arts', label: isAr ? 'فنون' : 'Arts' },
          ]}
          statusValue={categoryFilter}
          onStatusChange={(val) => setCategoryFilter(val as CourseCat)}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setStatusFilter('all');
            setCategoryFilter('All');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<EduCohort>
          hideToolbar
          data={sortedCohorts}
          keyExtractor={(c) => c.id}
          viewMode={viewMode}
          columns={cohortColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={cohortSortBy}
          sortDirection={cohortSortDir}
          onSortChange={(key, dir) => {
            setCohortSortBy(key);
            setCohortSortDir(dir);
          }}
          openItemId={activeCohort?.id ?? null}
          selectedIds={selectedCohortIds}
          onSelectionChange={setSelectedCohortIds}
          pinnedIds={pinnedCohortIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedCohortIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(cohort, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedCohort(cohort);
          }}
          onViewDetails={(cohort, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedCohort(cohort);
          }}
          onDelete={(cohort) => {
            deleteEduCohort(cohort.id);
            if (selectedCohort?.id === cohort.id) setSelectedCohort(null);
          }}
          bulkSecondaryAction={{
            label: isAr ? 'بدء الدراسة' : isEn ? 'Start Term' : 'Lancer',
            icon: <Play size={13} />,
            onClick: (ids) => {
              ids.forEach((id) => updateEduCohort(id, { status: 'InProgress' }));
              setSelectedCohortIds(new Set<string>());
              showToast({ type: 'success', title: 'Cohortes Lancées', message: `${ids.size} cohortes démarrées.` });
            },
            variant: 'primary',
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteEduCohort(id));
            setSelectedCohortIds(new Set<string>());
            if (selectedCohort && ids.has(selectedCohort.id)) setSelectedCohort(null);
            showToast({ type: 'info', title: 'Suppression', message: `${ids.size} cohortes supprimées.` });
          }}
          renderCard={(cohort) => {
            const occupancyPercent = Math.min(
              100,
              Math.round((cohort.enrolledCount / Math.max(1, cohort.maxStudents)) * 100)
            );
            const completedMilestones = cohort.syllabusMilestones?.filter((m) => m.completed).length || 0;
            const totalMilestones = cohort.syllabusMilestones?.length || 0;
            const b = resolveRecordBranch(cohort, branchesById, currentBranch, language);
            return (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="w-20 h-20 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-[28px] font-bold shadow-md mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700">
                  <BookOpen size={28} />
                </div>
                <h3 className="text-[16px] font-bold text-black dark:text-white truncate max-w-[210px] mb-1 tracking-tight text-center">
                  {cohort.name}
                </h3>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 mb-2 truncate max-w-[200px]">
                  {cohort.courseTitle} · {b.name}
                </span>
                <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-black/55 dark:text-white/55">{cohort.instructorName}</span>
                    <span className="font-bold text-black dark:text-white tabular-nums">
                      {formatMoney(cohort.tuitionFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-black/55 dark:text-white/55 font-medium">
                      {cohort.enrolledCount} / {cohort.maxStudents} seats
                    </span>
                    <span className="font-bold text-[#d4522f] tabular-nums">{occupancyPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-[#d4522f] rounded-full transition-all" style={{ width: `${occupancyPercent}%` }} />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px]">
                    <span className="text-black/55 dark:text-white/55">
                      {totalMilestones > 0 ? `${completedMilestones}/${totalMilestones} Milestones` : cohort.scheduleSummary}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cohort.status}</span>
                  </div>
                </div>
              </div>
            );
          }}
          emptyTitle={t('edu_no_cohorts_found')}
          emptyDescription={t('edu_no_cohorts_found')}
          primaryActionLabel={t('edu_modal_add_cohort')}
          onAddFirstItem={() => setIsAddCohortModalOpen(true)}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedCohorts.length}
        entityPluralLabel={isAr ? 'فوج' : isEn ? 'cohorts' : 'cohortes'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setStatusFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<EduCohort>
        isOpen={Boolean(activeCohort)}
        item={activeCohort}
        allItems={sortedCohorts}
        keyExtractor={(c) => c.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeCohort?.name || ''}
        subtitle={`${activeCohort?.courseTitle || ''} · ${activeCohort?.scheduleSummary || ''}`}
        avatarText={(activeCohort?.name || 'C').charAt(0).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeCohort ? resolveRecordBranch(activeCohort, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeCohort ? localizeStatus(activeCohort.status, language) : undefined}
        onSelectItem={(c) => setSelectedCohort(c)}
        onClose={() => setSelectedCohort(null)}
        onDelete={(c) => {
          deleteEduCohort(c.id);
          setSelectedCohort(null);
        }}
        renderBody={(cohort) => (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
                <span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
                  {isAr ? 'المدرّب / الأستاذ' : isEn ? 'Instructor' : 'Formateur'}
                </span>
                <span className="font-semibold text-black dark:text-white">{cohort.instructorName}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
                <span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
                  {isAr ? 'القاعة الدراسية' : isEn ? 'Classroom' : 'Salle'}
                </span>
                <span className="font-semibold text-black dark:text-white">{cohort.classroomName || 'Room 1'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
                <span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
                  {isAr ? 'رسوم الدورة' : isEn ? 'Tuition Fee' : "Frais d'inscription"}
                </span>
                <span className="font-semibold text-black dark:text-white">{formatMoney(cohort.tuitionFee)}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800">
                <span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
                  {isAr ? 'المقاعد المحجوزة' : isEn ? 'Seats Filled' : 'Places occupées'}
                </span>
                <span className="font-semibold text-[#d4522f]">
                  {cohort.enrolledCount} / {cohort.maxStudents} (
                  {Math.round((cohort.enrolledCount / Math.max(1, cohort.maxStudents)) * 100)}%)
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2.5">
                {isAr ? 'مراحل ومحاور المنهاج' : isEn ? 'Syllabus Milestones & Progress' : 'Progression du programme'}
              </h3>
              <div className="space-y-2">
                {cohort.syllabusMilestones?.map((milestone, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleMilestone(cohort.id, idx)}
                    className={`w-full text-left rtl:text-right flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      milestone.completed
                        ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        milestone.completed ? 'bg-emerald-600 text-white' : 'border border-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      {milestone.completed && <Check size={12} />}
                    </span>
                    <div className="min-w-0">
                      <span
                        className={`font-semibold text-xs block ${
                          milestone.completed ? 'text-black/55 dark:text-white/75 line-through' : 'text-black dark:text-white'
                        }`}
                      >
                        {milestone.title}
                      </span>
                      <span className="text-[10px] text-black/55 dark:text-white/55">
                        {milestone.completed ? 'Milestone Cleared' : 'In Progress'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2.5">
                Enrolled Students Roster ({cohortEnrolledStudents.length})
              </h3>
              {cohortEnrolledStudents.length === 0 ? (
                <p className="text-black/55 dark:text-white/55 italic">No students enrolled yet in this cohort.</p>
              ) : (
                <div className="space-y-1.5">
                  {cohortEnrolledStudents.map(({ enrollment, student }) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900"
                    >
                      <div>
                        <span className="font-semibold text-black dark:text-white block">{enrollment.studentName}</span>
                        <span className="text-[10px] text-black/55 dark:text-white/55">
                          {student?.phone || 'No phone'} · Paid: {formatMoney(enrollment.paidAmount)}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          enrollment.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {enrollment.paymentStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      />

      {isAddCohortModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {t('edu_modal_add_cohort')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddCohortModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 hover:bg-neutral-100 cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateCohort} className="space-y-3.5 pt-4 text-xs">
              <LabelSelect
                field="CourseCurriculum"
                label={t('edu_field_course_title')}
                value={formData.courseId}
                onChange={(val) => setFormData({ ...formData, courseId: val?.target?.value ?? String(val) })}
                options={eduCourses.map((co) => ({ value: co.id, label: co.title, sublabel: co.category }))}
                searchable
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="CohortName"
                label={t('edu_field_cohort_code')}
                required
                value={formData.name}
                onChange={(val) => setFormData({ ...formData, name: val?.target?.value ?? String(val) })}
                placeholder="e.g. Full-Stack Dev - Autumn Batch"
                width="100%"
                height={40}
                corner={12}
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  field="Instructor"
                  label={t('edu_field_instructor')}
                  value={formData.instructorId}
                  onChange={(val) => setFormData({ ...formData, instructorId: val?.target?.value ?? String(val) })}
                  options={staff.map((s) => ({ value: s.id, label: s.fullName, sublabel: s.role }))}
                  searchable
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelSelect
                  field="AssignedClassroom"
                  label={t('edu_field_classroom')}
                  value={formData.classroomId}
                  onChange={(val) => setFormData({ ...formData, classroomId: val?.target?.value ?? String(val) })}
                  options={eduClassrooms.map((r) => ({ value: r.id, label: r.name, sublabel: `Cap: ${r.capacity}` }))}
                  searchable
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="StartDate"
                  label={t('edu_field_start_date')}
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(val) => setFormData({ ...formData, startDate: val?.target?.value ?? String(val) })}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="EndDate"
                  label={t('edu_field_end_date')}
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(val) => setFormData({ ...formData, endDate: val?.target?.value ?? String(val) })}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="TuitionFee"
                  label={t('edu_field_tuition_fee')}
                  type="number"
                  required
                  value={formData.tuitionFee}
                  onChange={(val) => setFormData({ ...formData, tuitionFee: Number(val?.target?.value ?? val) })}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="SeatLimit"
                  label={t('edu_field_max_students')}
                  type="number"
                  required
                  value={formData.maxStudents}
                  onChange={(val) => setFormData({ ...formData, maxStudents: Number(val?.target?.value ?? val) })}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <LabelInput
                field="ScheduleSummary"
                label={t('edu_field_schedule_desc')}
                value={formData.scheduleSummary}
                onChange={(val) => setFormData({ ...formData, scheduleSummary: val?.target?.value ?? String(val) })}
                placeholder="e.g. Sat & Tue 14:00 - 16:30"
                width="100%"
                height={40}
                corner={12}
              />
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddCohortModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#d4522f] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_btn_save_cohort')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
