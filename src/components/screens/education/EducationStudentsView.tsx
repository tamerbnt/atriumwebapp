import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Shield,
  Award,
  X,
  Edit2,
  Check,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { EduStudent, StudentStatus } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { CertificateModal } from './CertificateModal';
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

type FilterKey = 'all' | 'active' | 'minors' | 'overdue' | 'graduated';
type StudentDrawerTab = 'academic' | 'financial' | 'guardian' | 'certificates';

export const EducationStudentsView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    eduStudents,
    eduCohorts,
    eduEnrollments,
    eduAttendance,
    eduGrades,
    eduCertificates,
    currentBranch,
    branches,
    addEduStudent,
    updateEduStudent,
    deleteEduStudent,
    addEduEnrollment,
    setScreen,
    activeEducationRole,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const isStaff = activeEducationRole === 'staff';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKey, setFilterKey] = useState<FilterKey>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<EduStudent | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<StudentDrawerTab>('academic');
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<EduStudent | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<any>(null);

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedStudentIds, setPinnedStudentIds] = useState<Set<string>>(() => new Set<string>());
  const [studentSortBy, setStudentSortBy] = useState<string>('student');
  const [studentSortDir, setStudentSortDir] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    isMinor: false,
    guardianName: '',
    guardianPhone: '',
    guardianRelation: 'Father',
    schoolGrade: '',
    status: 'Active',
    notes: '',
    initialCohortId: eduCohorts[0]?.id || '',
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    eduStudents.forEach((st) => {
      const b = resolveRecordBranch(st, branchesById, currentBranch, language).name;
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }, [eduStudents, branchesById, currentBranch, language]);

  const filteredStudents = useMemo(() => {
    return eduStudents.filter((st) => {
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(st, branchesById, currentBranch, language).name;
        if (b !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          st.fullName.toLowerCase().includes(q) ||
          (st.phone && st.phone.toLowerCase().includes(q)) ||
          (st.email && st.email.toLowerCase().includes(q)) ||
          (st.guardianName && st.guardianName.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (filterKey === 'active' && st.status !== 'Active') return false;
      if (filterKey === 'minors' && !st.guardianName) return false;
      if (filterKey === 'graduated' && st.status !== 'Graduated') return false;
      if (filterKey === 'overdue') {
        const enroll = eduEnrollments.find((e) => e.studentId === st.id);
        if (!enroll || enroll.paymentStatus !== 'Overdue') return false;
      }
      return true;
    });
  }, [eduStudents, branchFilter, searchQuery, filterKey, eduEnrollments, branchesById, currentBranch, language]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      const aPinned = pinnedStudentIds.has(a.id);
      const bPinned = pinnedStudentIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (studentSortBy === 'attendance') {
        cmp = (a.attendanceRatePercent ?? 100) - (b.attendanceRatePercent ?? 100);
      } else if (studentSortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = a.fullName.localeCompare(b.fullName);
      }
      return studentSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredStudents, pinnedStudentIds, studentSortBy, studentSortDir, branchesById, currentBranch, language]);

  const activeStudent = useMemo(() => {
    if (!selectedStudent) return null;
    return eduStudents.find((s) => s.id === selectedStudent.id) || selectedStudent;
  }, [selectedStudent, eduStudents]);

  const totalStudentsCount = eduStudents.length;
  const activeCount = eduStudents.filter((s) => s.status === 'Active').length;
  const activeMinorsCount = eduStudents.filter((s) => Boolean(s.guardianName)).length;
  const totalBilledEquiv = eduEnrollments
    .filter((e) => e.paymentStatus === 'Paid' || e.paidAmount > 0)
    .reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const averageAttendance =
    eduStudents.length > 0
      ? Math.round(
          eduStudents.reduce((acc, s) => acc + (s.attendanceRatePercent || 92), 0) / eduStudents.length
        )
      : 95;

  const handleOpenAdd = useCallback(() => {
    setStudentToEdit(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      isMinor: false,
      guardianName: '',
      guardianPhone: '',
      guardianRelation: 'Father',
      schoolGrade: 'Adult Learner',
      status: 'Active',
      notes: '',
      initialCohortId: eduCohorts[0]?.id || '',
    });
    setIsAddModalOpen(true);
  }, [eduCohorts]);

  const handleOpenEdit = useCallback((student: EduStudent) => {
    setStudentToEdit(student);
    setFormData({
      fullName: student.fullName,
      email: student.email || '',
      phone: student.phone,
      isMinor: Boolean(student.guardianName),
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianRelation: student.guardianRelation || 'Father',
      schoolGrade: student.schoolGrade || '',
      status: student.status,
      notes: student.notes || '',
      initialCohortId: '',
    });
    setIsAddModalOpen(true);
  }, []);

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentToEdit) {
      updateEduStudent(studentToEdit.id, {
        fullName: formData.fullName,
        email: formData.email || undefined,
        phone: formData.phone,
        guardianName: formData.isMinor ? formData.guardianName : undefined,
        guardianPhone: formData.isMinor ? formData.guardianPhone : undefined,
        guardianRelation: formData.isMinor ? formData.guardianRelation : undefined,
        schoolGrade: formData.schoolGrade || undefined,
        status: formData.status as StudentStatus,
        notes: formData.notes || undefined,
      });
    } else {
      const newStudent = addEduStudent({
        fullName: formData.fullName,
        email: formData.email || undefined,
        phone: formData.phone,
        guardianName: formData.isMinor ? formData.guardianName : undefined,
        guardianPhone: formData.isMinor ? formData.guardianPhone : undefined,
        guardianRelation: formData.isMinor ? formData.guardianRelation : undefined,
        schoolGrade: formData.schoolGrade || undefined,
        status: formData.status as StudentStatus,
        attendanceRatePercent: 100,
        notes: formData.notes || undefined,
      });
      if (formData.initialCohortId) {
        const cohort = eduCohorts.find((c) => c.id === formData.initialCohortId);
        if (cohort) {
          addEduEnrollment({
            studentId: newStudent.id,
            studentName: newStudent.fullName,
            cohortId: cohort.id,
            cohortName: cohort.name,
            agreedTuition: cohort.tuitionFee,
            discountAmount: 0,
            paidAmount: 0,
            balanceDue: cohort.tuitionFee,
            currency: cohort.currency,
            paymentStatus: 'Pending',
            status: 'Active',
            installments: [
              { dueDate: cohort.startDate, amount: Math.round(cohort.tuitionFee * 0.5), isPaid: false },
              {
                dueDate: cohort.endDate,
                amount: cohort.tuitionFee - Math.round(cohort.tuitionFee * 0.5),
                isPaid: false,
              },
            ],
          });
        }
      }
      setSelectedStudent(newStudent);
    }
    setIsAddModalOpen(false);
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      isAr ? 'الاسم الكامل' : isEn ? 'Full Name' : 'Nom complet',
      isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      isAr ? 'البريد الإلكتروني' : 'Email',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      isAr ? 'الفوج' : isEn ? 'Cohort' : 'Promotion / Cohorte',
      isAr ? 'المستوى الدراسي' : isEn ? 'School Grade' : 'Niveau Scolaire',
      isAr ? 'نسبة الحضور' : isEn ? 'Attendance Rate' : 'Taux de Présence',
      isAr ? 'حالة الحساب' : isEn ? 'Status' : 'Statut Étudiant',
      isAr ? 'الولي / الوصي' : isEn ? 'Guardian' : 'Tuteur / Parent',
    ];
    const rows = sortedStudents.map((s) => {
      const enroll = eduEnrollments.find((e) => e.studentId === s.id && e.status === 'Active');
      return [
        s.fullName,
        s.phone,
        s.email || '',
        resolveRecordBranch(s, branchesById, currentBranch, language).name,
        enroll ? enroll.cohortName : 'None',
        s.schoolGrade || '',
        `${s.attendanceRatePercent ?? 100}%`,
        s.status,
        s.guardianName || 'Adult / Self',
      ];
    });
    downloadCsvSafe(`students-roster-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [sortedStudents, eduEnrollments, branchesById, currentBranch, language, isAr, isEn]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: eduStudents.length },
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
        id: 'segment',
        label: isAr ? 'التصنيف' : isEn ? 'Student Segment' : 'Profil Étudiant',
        value: filterKey,
        onChange: (v) => setFilterKey(v as FilterKey),
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: t('edu_filter_all') },
          { value: 'active', label: t('edu_status_active') },
          { value: 'minors', label: t('edu_filter_minors') },
          { value: 'graduated', label: t('edu_status_graduated') },
        ],
      },
    ];
  }, [branchFilter, filterKey, branchCounts, eduStudents.length, isAr, isEn, t]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (filterKey !== 'all') {
      chips.push({
        key: 'segment',
        label: filterKey,
        onRemove: () => setFilterKey('all'),
      });
    }
    return chips;
  }, [branchFilter, filterKey, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (filterKey !== 'all' ? 1 : 0);

  const studentColumns: ColumnDefinition<EduStudent>[] = useMemo(() => {
    const cols: ColumnDefinition<EduStudent>[] = [
      {
        key: 'student',
        header: t('edu_col_student'),
        minWidth: '215px',
        sortable: true,
        renderCell: (student) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
              {student.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate">{student.fullName}</div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                {student.phone} {student.email ? `· ${student.email}` : ''}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        sortable: true,
        renderCell: (student) => {
          const b = resolveRecordBranch(student, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'cohort',
        header: t('edu_col_cohort'),
        minWidth: '170px',
        renderCell: (student) => {
          const enrollment = eduEnrollments.find((e) => e.studentId === student.id && e.status === 'Active');
          return enrollment ? (
            <div>
              <span className="font-medium text-black dark:text-white block truncate max-w-[180px]">
                {enrollment.cohortName}
              </span>
              <span className="text-[10px] text-black/55 dark:text-white/55">
                Enrolled {enrollment.enrolledAt ? enrollment.enrolledAt.split('T')[0] : 'Active'}
              </span>
            </div>
          ) : (
            <span className="text-black/55 dark:text-white/55 italic">No Active Cohort</span>
          );
        },
      },
      {
        key: 'attendance',
        header: t('edu_col_attendance'),
        width: '125px',
        sortable: true,
        renderCell: (student) => {
          const rate = student.attendanceRatePercent ?? 100;
          return (
            <div className="flex items-center gap-2">
              <div className="w-12 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className={`h-full rounded-full ${rate >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${rate}%` }} />
              </div>
              <span className="font-semibold text-black/70 dark:text-white/75 tabular-nums">{rate}%</span>
            </div>
          );
        },
      },
    ];
    if (!isStaff) {
      cols.push({
        key: 'tuition',
        header: t('edu_col_tuition_status'),
        width: '140px',
        renderCell: (student) => {
          const enrollment = eduEnrollments.find((e) => e.studentId === student.id && e.status === 'Active');
          return enrollment ? (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${
                enrollment.paymentStatus === 'Paid'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : enrollment.paymentStatus === 'Overdue'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {enrollment.paymentStatus} · {formatMoney(enrollment.paidAmount)}
            </span>
          ) : (
            <span className="text-black/55 dark:text-white/55">—</span>
          );
        },
      });
    }
    cols.push({
      key: 'guardian',
      header: t('edu_drawer_guardian'),
      width: '150px',
      renderCell: (student) =>
        student.guardianName ? (
          <div className="text-black/70 dark:text-white/75">
            <span className="font-medium block truncate">{student.guardianName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 block truncate">
              {student.guardianRelation || 'Guardian'} · {student.guardianPhone}
            </span>
          </div>
        ) : (
          <span className="text-black/55 dark:text-white/55">Adult / Self</span>
        ),
    });
    return cols;
  }, [eduEnrollments, t, isStaff, isAr, isEn, branchesById, currentBranch, language]);

  const studentEnrollments = activeStudent ? eduEnrollments.filter((e) => e.studentId === activeStudent.id) : [];
  const studentAttendance = activeStudent ? eduAttendance.filter((a) => a.studentId === activeStudent.id) : [];
  const studentGrades = activeStudent ? eduGrades.filter((g) => g.studentId === activeStudent.id) : [];
  const studentCerts = activeStudent ? eduCertificates.filter((c) => c.studentId === activeStudent.id) : [];

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (eduStudents || []).length > 0,
  });

  if (showSkeleton && ((eduStudents || []).length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '200px' },
          { width: '2*', minWidth: '150px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.8*', minWidth: '140px' },
          { width: '2*', minWidth: '160px' },
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
        icon={<Users size={22} />}
        title={t('edu_students_title')}
        subtitle={`${totalStudentsCount} ${isAr ? 'طالب مسجل' : isEn ? 'enrolled students' : 'étudiants inscrits'}`}
        primaryAction={{
          label: t('edu_modal_add_student'),
          icon: <Plus size={15} />,
          onClick: handleOpenAdd,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الانضباط والتحصيل الدراسي' : isEn ? 'Student Body & Attendance Health' : 'Effectifs & Assiduité Scolaire'}
        language={language}
        primaryCard={{
          label: isAr ? 'الطلبة النشطون' : isEn ? 'Active Students' : 'Étudiants Actifs',
          count: activeCount,
          badgeText: `${totalStudentsCount} total`,
          tone: 'emerald',
          title: isAr ? 'طلبة مسجلون ونشطون' : 'Étudiants régulièrement inscrits',
          isActive: filterKey === 'active',
          onToggle: () => setFilterKey((p) => (p === 'active' ? 'all' : 'active')),
        }}
        secondaryCard={{
          label: isAr ? 'معدل الحضور العام' : isEn ? 'Attendance Rate' : "Taux d'assiduité",
          count: averageAttendance,
          formatValue: (v) => `${v}%`,
          badgeText: `${activeMinorsCount} ${isAr ? 'قاصر' : 'mineurs'}`,
          tone: 'terracotta',
          title: isAr ? 'تصفية الطلبة القصر' : 'Filtrer les étudiants mineurs',
          isActive: filterKey === 'minors',
          onToggle: () => setFilterKey((p) => (p === 'minors' ? 'all' : 'minors')),
        }}
        darkCard={
          isStaff
            ? {
                label: isAr ? 'الأفواج والبرامج' : isEn ? 'Cohorts & Programs' : 'Promotions & Cohortes',
                valueCount: eduCohorts.length,
                valuePrefix: '',
                valueSuffix: isAr ? ' فوج' : ' cohortes',
                badgeCount: activeMinorsCount,
                badgePrefix: '',
                badgeSuffix: isAr ? 'قاصر' : 'mineurs',
                caption: isAr ? 'أفواج دراسية تحت الإشراف' : "Programmes d'enseignement en cours",
              }
            : {
                label: isAr ? 'إجمالي التحصيل الدراسي' : isEn ? 'Collected Tuition' : 'Frais Scolaires Encaissés',
                valueCount: totalBilledEquiv,
                valuePrefix: '',
                formatValue: (v) => formatMoney(v),
                badgeCount: eduCohorts.length,
                badgePrefix: '',
                badgeSuffix: isAr ? 'فوج' : 'cohortes',
                caption: isAr ? 'المستحقات الأكاديمية المسواة' : 'Recouvrement scolarité actif',
              }
        }
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'دليل الطلبة' : isEn ? 'Students Directory' : 'Répertoire des Étudiants'}
          liveRegionText={`${sortedStudents.length} ${isAr ? 'طالب' : 'étudiants'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('edu_search_students_ph')}
          statusOptions={[
            { value: 'all', label: t('edu_filter_all'), count: eduStudents.length },
            { value: 'active', label: t('edu_status_active'), count: activeCount },
            { value: 'minors', label: t('edu_filter_minors'), count: activeMinorsCount },
            ...(!isStaff ? [{ value: 'overdue', label: isAr ? 'متأخر' : isEn ? 'Overdue' : 'Retard' }] : []),
            { value: 'graduated', label: t('edu_status_graduated') },
          ]}
          statusValue={filterKey}
          onStatusChange={(val) => setFilterKey(val as FilterKey)}
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
            setFilterKey('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<EduStudent>
          hideToolbar
          data={sortedStudents}
          keyExtractor={(s) => s.id}
          viewMode={viewMode}
          columns={studentColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={studentSortBy}
          sortDirection={studentSortDir}
          onSortChange={(key, dir) => {
            setStudentSortBy(key);
            setStudentSortDir(dir);
          }}
          openItemId={activeStudent?.id ?? null}
          selectedIds={selectedStudentIds}
          onSelectionChange={setSelectedStudentIds}
          pinnedIds={pinnedStudentIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedStudentIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(st, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedStudent(st);
          }}
          onViewDetails={(st, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedStudent(st);
          }}
          onEdit={(st) => handleOpenEdit(st)}
          onDelete={(st) => {
            deleteEduStudent(st.id);
            if (selectedStudent?.id === st.id) setSelectedStudent(null);
          }}
          customActions={(st) => [
            {
              id: 'cert',
              tooltip: t('edu_drawer_issue_certificate'),
              icon: <Award size={13} />,
              iconColor: '#d4522f',
              onClick: () => {
                setSelectedStudent(st);
                setActiveDrawerTab('certificates');
                setIsCertModalOpen(true);
              },
            },
          ]}
          bulkSecondaryAction={{
            label: isAr ? 'تفعيل الطلبة' : isEn ? 'Activate Selected' : 'Activer sélection',
            icon: <Check size={13} />,
            onClick: (ids) => {
              ids.forEach((id) => updateEduStudent(id, { status: 'Active' }));
              setSelectedStudentIds(new Set<string>());
              showToast({
                type: 'success',
                title: isAr ? 'تم التحديث' : 'Mise à jour',
                message: `${ids.size} étudiants activés.`,
              });
            },
            variant: 'primary',
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteEduStudent(id));
            setSelectedStudentIds(new Set<string>());
            if (selectedStudent && ids.has(selectedStudent.id)) setSelectedStudent(null);
            showToast({
              type: 'info',
              title: isAr ? 'حذف الطلبة' : 'Étudiants retirés',
              message: `${ids.size} étudiants supprimés.`,
            });
          }}
          renderCard={(student) => {
            const enrollment = eduEnrollments.find((e) => e.studentId === student.id && e.status === 'Active');
            const rate = student.attendanceRatePercent ?? 100;
            const b = resolveRecordBranch(student, branchesById, currentBranch, language);
            return (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="w-20 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center text-[28px] font-bold shadow-md mb-3 select-none border border-neutral-200 dark:border-neutral-700">
                  {student.fullName.charAt(0)}
                </div>
                <h3 className="text-[16px] font-bold text-black dark:text-white truncate max-w-[210px] mb-1 tracking-tight">
                  {student.fullName}
                </h3>
                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] border border-[#F5E2D8] dark:border-neutral-700 mb-3 truncate max-w-[200px]">
                  {enrollment ? enrollment.cohortName : b.name}
                </span>
                <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-2 text-center">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-black/55 dark:text-white/55">{t('edu_col_attendance')}</span>
                    <span className="font-bold tabular-nums text-black/70 dark:text-white/75">{rate}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div className={`h-full rounded-full ${rate >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${rate}%` }} />
                  </div>
                </div>
              </div>
            );
          }}
          emptyTitle={t('edu_no_students_enrolled')}
          emptyDescription={t('edu_no_students_enrolled')}
          primaryActionLabel={t('edu_modal_add_student')}
          onAddFirstItem={handleOpenAdd}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedStudents.length}
        entityPluralLabel={isAr ? 'طالب' : isEn ? 'students' : 'étudiants'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setFilterKey('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<EduStudent>
        isOpen={Boolean(activeStudent)}
        item={activeStudent}
        allItems={sortedStudents}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeStudent?.fullName || ''}
        subtitle={`${activeStudent?.schoolGrade || 'Adult Learner'} · ${activeStudent?.phone || ''}`}
        avatarText={(activeStudent?.fullName || 'S').charAt(0).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeStudent ? resolveRecordBranch(activeStudent, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeStudent?.status}
        tabs={[
          { id: 'academic', label: t('edu_drawer_academic') },
          ...(!isStaff ? [{ id: 'financial', label: t('edu_drawer_financial') }] : []),
          { id: 'guardian', label: t('edu_drawer_guardian') },
          { id: 'certificates', label: t('edu_drawer_certificates') },
        ]}
        activeTab={activeDrawerTab}
        onTabChange={(id) => setActiveDrawerTab(id as StudentDrawerTab)}
        onSelectItem={(s) => setSelectedStudent(s)}
        onClose={() => setSelectedStudent(null)}
        onDelete={(s) => {
          deleteEduStudent(s.id);
          setSelectedStudent(null);
        }}
        renderBody={(st, tab) => (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleOpenEdit(st)}
                className="px-3 py-1.5 rounded-lg border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-800 font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#F3EDE7]"
              >
                <Edit2 size={13} />
                <span>{t('action_edit', 'Modifier')}</span>
              </button>
            </div>

            {(tab === 'academic' || (isStaff && tab === 'financial')) && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
                    {t('edu_cohorts_title')}
                  </h3>
                  {studentEnrollments.length === 0 ? (
                    <p className="text-black/55 dark:text-white/55 italic">No current enrollments.</p>
                  ) : (
                    <div className="space-y-2">
                      {studentEnrollments.map((enr) => (
                        <div
                          key={enr.id}
                          className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900/60"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-black dark:text-white">{enr.cohortName}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {enr.status}
                            </span>
                          </div>
                          {!isStaff && (
                            <div className="text-[11px] text-black/55 dark:text-white/55">
                              Agreed Tuition: {formatMoney(enr.agreedTuition)} · Paid: {formatMoney(enr.paidAmount)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
                    {t('edu_tab_rollcall')}
                  </h3>
                  {studentAttendance.length === 0 ? (
                    <p className="text-black/55 dark:text-white/55 italic">{t('edu_no_sessions')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {studentAttendance.slice(0, 5).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        >
                          <span className="text-black/70 dark:text-white/75">
                            {att.recordedAt ? att.recordedAt.split('T')[0] : 'Recent Session'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                              att.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : att.status === 'Late'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {att.status} {att.minutesLate ? `(+${att.minutesLate}m)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider mb-2">
                    {t('edu_tab_gradebook')}
                  </h3>
                  {studentGrades.length === 0 ? (
                    <p className="text-black/55 dark:text-white/55 italic">No grades recorded yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {studentGrades.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        >
                          <div>
                            <div className="font-semibold text-black dark:text-white">{g.assessmentTitle}</div>
                            {g.teacherRemarks && (
                              <div className="text-[10px] text-black/55 dark:text-white/55">"{g.teacherRemarks}"</div>
                            )}
                          </div>
                          <span className="font-bold text-[#d4522f] tabular-nums">
                            {g.score} / {g.maxScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isStaff && tab === 'financial' && (
              <div className="space-y-4">
                {studentEnrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black dark:text-white">{enr.cohortName}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        {enr.paymentStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-black/55 dark:text-white/55 block text-[10px]">
                          {t('edu_field_tuition_fee')}
                        </span>
                        <span className="font-bold text-black dark:text-white">{formatMoney(enr.agreedTuition)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-black/55 dark:text-white/55 block text-[10px]">
                          {t('edu_fin_receivables')}
                        </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {formatMoney(enr.balanceDue)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setScreen('finance');
                      }}
                      className="w-full py-2 text-xs font-semibold text-center text-[#d4522f] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors cursor-pointer"
                    >
                      {t('edu_btn_log_payment')} →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'guardian' && (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-black dark:text-white">{t('edu_drawer_guardian')}</span>
                  <Shield size={16} className="text-[#d4522f]" />
                </div>
                {st.guardianName ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-black/55 dark:text-white/55">{t('edu_field_guardian_name')}:</span>
                      <span className="font-semibold text-black dark:text-white">{st.guardianName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black/55 dark:text-white/55">{t('edu_field_guardian_relation')}:</span>
                      <span className="font-semibold text-black dark:text-white">{st.guardianRelation || 'Parent'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black/55 dark:text-white/55">{t('edu_field_guardian_phone')}:</span>
                      <a href={`tel:${st.guardianPhone}`} className="font-semibold text-[#d4522f] hover:underline">
                        {st.guardianPhone}
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-black/55 dark:text-white/55 italic">
                    No linked guardian recorded. Student is registered as an independent adult.
                  </p>
                )}
              </div>
            )}

            {tab === 'certificates' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-black dark:text-white">{t('edu_drawer_certificates')}</span>
                  <button
                    type="button"
                    onClick={() => setIsCertModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#d4522f] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-90"
                  >
                    <Plus size={12} />
                    <span>{t('edu_btn_issue_certificate')}</span>
                  </button>
                </div>
                {studentCerts.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Award size={32} className="mx-auto text-black/55 dark:text-white/55 mb-2" />
                    <p className="text-black/55 dark:text-white/55 italic">No certificates issued yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {studentCerts.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-black dark:text-white">{c.courseTitle}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700">
                            Verified
                          </span>
                        </div>
                        <div className="text-[11px] text-black/55 dark:text-white/55">
                          Issued: {c.issueDate} · Honors: {c.honors || 'Certificate of Completion'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                {studentToEdit ? t('edu_modal_edit_student') : t('edu_modal_add_student')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 hover:bg-neutral-100 cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="space-y-4 pt-4 text-xs">
              <LabelInput
                id="student-fullname"
                label={t('edu_field_fullname')}
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Amine Mansouri"
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="student-phone"
                  label={t('edu_field_phone')}
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0550 12 34 56"
                />
                <LabelInput
                  id="student-email"
                  label={t('edu_field_email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="amine@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="student-grade"
                  label={t('edu_field_school_grade')}
                  value={formData.schoolGrade}
                  onChange={(e) => setFormData({ ...formData, schoolGrade: e.target.value })}
                  placeholder="e.g. 3AS Math / Adult"
                />
                <LabelSelect
                  label={t('edu_filter_status')}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val?.target?.value ?? String(val) })}
                  options={[
                    { value: 'Active', label: t('edu_status_active') },
                    { value: 'Applicant', label: t('edu_stage_inquiry') },
                    { value: 'Graduated', label: t('edu_status_graduated') },
                    { value: 'Suspended', label: t('edu_status_paused') },
                  ]}
                />
              </div>
              {!studentToEdit && eduCohorts.length > 0 && (
                <LabelSelect
                  label={t('edu_field_initial_cohort')}
                  value={formData.initialCohortId}
                  onChange={(val) => setFormData({ ...formData, initialCohortId: val?.target?.value ?? String(val) })}
                  options={[
                    { value: '', label: 'No immediate cohort assignment' },
                    ...eduCohorts.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.cohortCode || c.courseTitle})`,
                    })),
                  ]}
                  placeholder="Select Cohort..."
                />
              )}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900/60 space-y-3">
                <label className="flex items-center gap-2 font-semibold text-black dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isMinor}
                    onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
                    className="rounded text-[#d4522f] focus:ring-[#d4522f]"
                  />
                  <span>{t('edu_field_is_minor')}</span>
                </label>
                {formData.isMinor && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <LabelInput
                        id="guardian-name"
                        label={t('edu_field_guardian_name')}
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        placeholder="e.g. Karim Mansouri"
                      />
                      <LabelSelect
                        label={t('edu_field_guardian_relation')}
                        value={formData.guardianRelation}
                        onChange={(val) =>
                          setFormData({ ...formData, guardianRelation: val?.target?.value ?? String(val) })
                        }
                        options={[
                          { value: 'Father', label: 'Father' },
                          { value: 'Mother', label: 'Mother' },
                          { value: 'Guardian', label: 'Guardian' },
                          { value: 'Sibling', label: 'Sibling' },
                        ]}
                      />
                    </div>
                    <LabelInput
                      id="guardian-phone"
                      label={t('edu_field_guardian_phone')}
                      type="tel"
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      placeholder="0661 98 76 54"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#d4522f] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_btn_save_student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCertModalOpen && (
        <CertificateModal
          certificate={selectedCertForPreview}
          onClose={() => {
            setIsCertModalOpen(false);
            setSelectedCertForPreview(null);
          }}
        />
      )}
    </div>
  );
};
