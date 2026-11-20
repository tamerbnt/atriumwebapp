import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Shield,
  Award,
  X,
  Edit2,
  Check,
  Eye,
  Trash2,
  Phone,
  Mail,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { EduStudent, StudentStatus } from '../../../types';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { CertificateModal } from './CertificateModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorBigStat,
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
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

  const getStudentRowMeta = useCallback(
    (student: EduStudent): KineticRowMeta => {
      const enrollment = eduEnrollments.find((e) => e.studentId === student.id && e.status === 'Active');
      const rate = student.attendanceRatePercent ?? 100;
      return {
        avatarText: student.fullName.slice(0, 2).toUpperCase(),
        subline: `${student.phone}${student.email ? ` · ${student.email}` : ''}`,
        categoryLabel: enrollment ? enrollment.cohortName : student.schoolGrade || (isAr ? 'طالب' : 'Étudiant'),
        statusVariant:
          student.status === 'Active'
            ? 'active'
            : student.status === 'Graduated'
            ? 'info'
            : student.status === 'Applicant'
            ? 'warning'
            : 'blocked',
        statusLabel: localizeStatus(student.status, language),
        metricPrimary: `${rate}%`,
        metricSecondary: enrollment ? formatMoney(enrollment.paidAmount) : student.guardianName || undefined,
        detailCol1: {
          heading: isAr ? 'بيانات الاتصال والولي' : isEn ? 'Contact & Guardian' : 'Contact & Tuteur',
          primaryText: student.phone,
          secondaryText: student.email || '—',
          tertiaryText: student.guardianName ? `${isAr ? 'الولي:' : 'Tuteur:'} ${student.guardianName}` : undefined,
        },
        detailCol2: {
          heading: isAr ? 'التكوين والمواظبة' : isEn ? 'Cohort & Attendance' : 'Cohorte & Assiduité',
          primaryText: enrollment ? enrollment.cohortName : student.schoolGrade || 'Non inscrit',
          secondaryText: `${isAr ? 'الحضور:' : 'Présence:'} ${rate}%`,
        },
        detailCol3: {
          heading: isAr ? 'الوضعية المالية' : isEn ? 'Tuition & Status' : 'Scolarité & Statut',
          primaryText: enrollment ? formatMoney(enrollment.paidAmount) : localizeStatus(student.status, language),
          secondaryText: enrollment && enrollment.balanceDue > 0 ? `${formatMoney(enrollment.balanceDue)} dû` : localizeStatus(student.status, language),
        },
      };
    },
    [eduEnrollments, isAr, isEn, language]
  );

  const getStudentFanActions = useCallback(
    (student: EduStudent): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedStudent(student);
          setActiveDrawerTab('academic');
        },
      },
      {
        id: 'edit',
        label: t('action_edit', 'Modifier'),
        icon: <Edit2 className="w-[15px] h-[15px]" />,
        onClick: () => handleOpenEdit(student),
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          deleteEduStudent(student.id);
          if (selectedStudent?.id === student.id) setSelectedStudent(null);
        },
      },
    ],
    [isAr, isEn, t, handleOpenEdit, deleteEduStudent, selectedStudent?.id]
  );

  const getStudentDetailActions = useCallback(
    (student: EduStudent): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isEn ? 'Open' : 'Ouvrir',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedStudent(student);
          setActiveDrawerTab('academic');
        },
      },
      {
        id: 'cert',
        label: t('edu_drawer_issue_certificate'),
        icon: <Award className="w-3.5 h-3.5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
        onClick: () => {
          setSelectedStudent(student);
          setActiveDrawerTab('certificates');
          setIsCertModalOpen(true);
        },
      },
      {
        id: 'edit',
        label: t('action_edit', 'Modifier'),
        icon: <Edit2 className="w-3.5 h-3.5" />,
        onClick: () => handleOpenEdit(student),
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => {
          deleteEduStudent(student.id);
          if (selectedStudent?.id === student.id) setSelectedStudent(null);
        },
      },
    ],
    [isAr, isEn, t, handleOpenEdit, deleteEduStudent, selectedStudent?.id]
  );

  const studentColumns: ColumnDefinition<EduStudent>[] = useMemo(() => {
    const cols: ColumnDefinition<EduStudent>[] = [
      {
        key: 'student',
        header: t('edu_col_student'),
        minWidth: '215px',
        sortable: true,
        renderCell: (student) => (
          <div className="flex items-center gap-3">
            <div
              data-sq="tile"
              data-sq-border="solid"
              className="w-9 h-9 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-semibold t-small shrink-0 border border-neutral-200 dark:border-neutral-700"
            >
              {student.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate">{student.fullName}</div>
              <div className="t-cap text-black/55 dark:text-white/55 truncate">
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
              <span className="t-cap text-black/55 dark:text-white/55">
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
              className={`px-2 py-1 rounded-full t-small font-semibold tracking-wide ${
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
            <span className="t-cap text-black/55 dark:text-white/55 block truncate">
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
          items={sortedStudents}
          keyExtractor={(s) => s.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            setActiveDrawerTab('academic');
          }}
          onViewDetails={(st, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedStudent(st);
            setActiveDrawerTab('academic');
          }}
          getRowMeta={getStudentRowMeta}
          getFanActions={getStudentFanActions}
          getDetailActions={getStudentDetailActions}
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
              if (ids.size === 0) return;
              runUndoBatch(
                {
                  category: 'education_cohort',
                  operationType: 'bulk',
                  label: isAr
                    ? `تفعيل طلبة (${ids.size})`
                    : isEn
                    ? `Activate students (${ids.size})`
                    : `Activation étudiants (${ids.size})`,
                  entityType: 'eduStudent',
                },
                () => {
                  ids.forEach((id) => updateEduStudent(id, { status: 'Active' }));
                }
              );
              setSelectedStudentIds(new Set<string>());
            },
            variant: 'primary',
          }}
          onBulkDelete={(ids) => {
            if (ids.size === 0) return;
            runUndoBatch(
              {
                category: 'education_cohort',
                operationType: 'bulk',
                label: isAr
                  ? `حذف طلبة (${ids.size})`
                  : isEn
                  ? `Delete students (${ids.size})`
                  : `Suppression étudiants (${ids.size})`,
                entityType: 'eduStudent',
              },
              () => {
                ids.forEach((id) => deleteEduStudent(id));
              }
            );
            setSelectedStudentIds(new Set<string>());
            if (selectedStudent && ids.has(selectedStudent.id)) setSelectedStudent(null);
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
        categoryLabel={activeStudent?.schoolGrade || (isAr ? 'طالب' : isEn ? 'Student' : 'Étudiant')}
        avatarText={(activeStudent?.fullName || 'ST').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeStudent ? resolveRecordBranch(activeStudent, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeStudent ? localizeStatus(activeStudent.status, language) : undefined}
        statusClassName={
          activeStudent?.status === 'Active'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : activeStudent?.status === 'Graduated'
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
            : activeStudent?.status === 'Applicant'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
        }
        tabs={[
          { id: 'academic', label: t('edu_drawer_academic') },
          ...(!isStaff ? [{ id: 'financial', label: t('edu_drawer_financial') }] : []),
          { id: 'guardian', label: t('edu_drawer_guardian') },
          { id: 'certificates', label: t('edu_drawer_certificates') },
        ]}
        activeTab={activeDrawerTab}
        onTabChange={(id) => setActiveDrawerTab(id as StudentDrawerTab)}
        onSelectItem={(s) => {
          setSelectedStudent(s);
          setActiveDrawerTab('academic');
        }}
        onClose={() => setSelectedStudent(null)}
        onDelete={(s) => {
          deleteEduStudent(s.id);
          setSelectedStudent(null);
        }}
        renderBody={(st, tab) => {
          const attRate = st.attendanceRatePercent ?? 100;
          if (!isStaff && tab === 'financial') {
            const totalDue = studentEnrollments.reduce((acc, e) => acc + (e.balanceDue || 0), 0);
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatMoney(totalDue)}
                    tone={totalDue > 0 ? 'danger' : 'ok'}
                    caption={`${studentEnrollments.length} ${t('edu_cohorts_title')}`}
                  />
                </InspectorSection>
                {studentEnrollments.map((enr, idx) => (
                  <InspectorSection key={enr.id} index={idx + 1} title={enr.cohortName}>
                    <InspectorCard>
                      <InspectorKeyValue
                        label={t('edu_field_tuition_fee')}
                        value={formatMoney(enr.agreedTuition)}
                      />
                      <InspectorKeyValue
                        label={isAr ? 'المدفوع' : isEn ? 'Paid' : 'Payé'}
                        value={formatMoney(enr.paidAmount)}
                        tone="ok"
                      />
                      <InspectorKeyValue
                        label={t('edu_fin_receivables')}
                        value={formatMoney(enr.balanceDue)}
                        tone={enr.balanceDue > 0 ? 'danger' : 'ok'}
                        isLast
                      />
                    </InspectorCard>
                  </InspectorSection>
                ))}
                <InspectorSection index={studentEnrollments.length + 1}>
                  <InspectorWideButton
                    label={t('edu_btn_log_payment')}
                    tone="accent"
                    onClick={() => {
                      setSelectedStudent(null);
                      setScreen('finance');
                    }}
                  />
                </InspectorSection>
              </>
            );
          }

          if (tab === 'guardian') {
            return (
              <>
                <InspectorSection index={0} title={t('edu_drawer_guardian')}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={t('edu_field_fullname')}
                      value={st.fullName}
                      mono={false}
                    />
                    <InspectorKeyValue
                      label={t('edu_field_phone')}
                      value={st.phone}
                      icon={<Phone size={13} />}
                      copyText={st.phone}
                    />
                    {st.email && (
                      <InspectorKeyValue
                        label={t('edu_field_email')}
                        value={st.email}
                        icon={<Mail size={13} />}
                        mono={false}
                        copyText={st.email}
                        isLast={!st.guardianName}
                      />
                    )}
                    {st.guardianName && (
                      <>
                        <InspectorKeyValue
                          label={t('edu_field_guardian_name')}
                          value={st.guardianName}
                          icon={<Shield size={13} />}
                          mono={false}
                        />
                        <InspectorKeyValue
                          label={t('edu_field_guardian_relation')}
                          value={st.guardianRelation || 'Parent'}
                          mono={false}
                        />
                        <InspectorKeyValue
                          label={t('edu_field_guardian_phone')}
                          value={st.guardianPhone || '—'}
                          tone="accent"
                          copyText={st.guardianPhone}
                          isLast
                        />
                      </>
                    )}
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'ملاحظات' : 'Notes'}>
                  <InspectorNotesField
                    value={st.notes || ''}
                    onSave={(next) => {
                      updateEduStudent(st.id, { notes: next });
                    }}
                  />
                </InspectorSection>
              </>
            );
          }

          if (tab === 'certificates') {
            return (
              <>
                <InspectorSection
                  index={0}
                  title={t('edu_drawer_certificates')}
                  action={
                    <button
                      type="button"
                      data-sq="ctl-sm"
                      data-sq-border="none"
                      onClick={() => setIsCertModalOpen(true)}
                      className="px-2.5 py-1 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold flex items-center gap-1 cursor-pointer hover:opacity-90"
                    >
                      <Plus size={12} />
                      <span>{t('edu_btn_issue_certificate')}</span>
                    </button>
                  }
                >
                  {studentCerts.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`edu-cert-${st.id}`}>
                      <EmptyState
                        variant="compact"
                        icon={<Award />}
                        title={isAr ? 'لا توجد شهادات بعد' : isEn ? 'No certificates issued yet' : 'Aucun certificat délivré'}
                        secondaryAction={{
                          label: t('edu_btn_issue_certificate'),
                          icon: <Plus />,
                          onClick: () => setIsCertModalOpen(true),
                        }}
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {studentCerts.map((c, idx) => (
                        <InspectorListItem
                          key={c.id}
                          title={c.courseTitle}
                          subtitle={`${c.issueDate} · ${c.honors || 'Completion'}`}
                          badge={{ label: 'Verified', tone: 'ok' }}
                          isLast={idx === studentCerts.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
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
                      id: 'edit',
                      label: t('action_edit', 'Modifier'),
                      icon: <Edit2 size={16} />,
                      primary: true,
                      onClick: () => handleOpenEdit(st),
                    },
                    {
                      id: 'cert',
                      label: t('edu_btn_issue_certificate'),
                      icon: <Award size={16} />,
                      onClick: () => setIsCertModalOpen(true),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={t('edu_col_attendance')}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={t('edu_col_attendance')}
                    value={`${attRate}%`}
                    tone={attRate >= 85 ? 'ok' : 'danger'}
                    isLast
                  />
                  <InspectorProgressBar
                    percent={attRate}
                    tone={attRate >= 85 ? 'ok' : 'danger'}
                    animateKey={st.id}
                  />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2} title={t('edu_cohorts_title')}>
                {studentEnrollments.length === 0 ? (
                  <KineticEmptyStateMotion motionKey={`st-enr-empty-${st.id}`}>
                    <EmptyState
                      variant="compact"
                      tone="neutral"
                      icon={<Users size={20} />}
                      title={isAr ? 'لا يوجد تسجيل نشط' : isEn ? 'No current enrollments' : 'Aucune inscription active'}
                      description={
                        isAr
                          ? 'لم يتم إلحاق هذا الطالب بأي فوج بعد.'
                          : isEn
                          ? 'This student is not enrolled in any cohort yet.'
                          : 'Cet étudiant n’est inscrit à aucune cohorte.'
                      }
                    />
                  </KineticEmptyStateMotion>
                ) : (
                  <InspectorCard>
                    {studentEnrollments.map((enr, idx) => (
                      <InspectorListItem
                        key={enr.id}
                        title={enr.cohortName}
                        subtitle={!isStaff ? `${formatMoney(enr.paidAmount)} / ${formatMoney(enr.agreedTuition)}` : undefined}
                        badge={{ label: enr.status, tone: 'ok' }}
                        isLast={idx === studentEnrollments.length - 1}
                      />
                    ))}
                  </InspectorCard>
                )}
              </InspectorSection>

              <InspectorSection index={3} title={t('edu_tab_rollcall')}>
                {studentAttendance.length === 0 ? (
                  <KineticEmptyStateMotion motionKey={`st-att-empty-${st.id}`}>
                    <EmptyState
                      variant="compact"
                      tone="neutral"
                      icon={<Check size={20} />}
                      title={t('edu_no_sessions')}
                      description={
                        isAr
                          ? 'ستظهر سجلات الحضور هنا بعد أول حصة.'
                          : isEn
                          ? 'Attendance logs will appear after the first session.'
                          : 'Les relevés d’appel apparaîtront après la première séance.'
                      }
                    />
                  </KineticEmptyStateMotion>
                ) : (
                  <InspectorCard>
                    {studentAttendance.slice(0, 5).map((att, idx) => (
                      <InspectorListItem
                        key={att.id}
                        title={att.recordedAt ? att.recordedAt.split('T')[0] : 'Recent Session'}
                        subtitle={att.minutesLate ? `+${att.minutesLate}m` : undefined}
                        badge={{
                          label: att.status,
                          tone: att.status === 'Present' ? 'ok' : att.status === 'Late' ? 'warn' : 'danger',
                        }}
                        isLast={idx === Math.min(4, studentAttendance.length - 1)}
                      />
                    ))}
                  </InspectorCard>
                )}
              </InspectorSection>

              <InspectorSection index={4} title={t('edu_tab_gradebook')}>
                {studentGrades.length === 0 ? (
                  <KineticEmptyStateMotion motionKey={`st-grades-empty-${st.id}`}>
                    <EmptyState
                      variant="compact"
                      tone="neutral"
                      icon={<Award size={20} />}
                      title={isAr ? 'لا توجد درجات مسجلة' : isEn ? 'No grades recorded' : 'Aucune note enregistrée'}
                      description={
                        isAr
                          ? 'لم يتم تسجيل أي تقييم لهذا الطالب حتى الآن.'
                          : isEn
                          ? 'No evaluations have been logged for this student yet.'
                          : 'Aucune évaluation saisie pour le moment.'
                      }
                    />
                  </KineticEmptyStateMotion>
                ) : (
                  <InspectorCard>
                    {studentGrades.map((g, idx) => (
                      <InspectorListItem
                        key={g.id}
                        title={g.assessmentTitle}
                        subtitle={g.teacherRemarks}
                        metaRight={`${g.score} / ${g.maxScore}`}
                        isLast={idx === studentGrades.length - 1}
                      />
                    ))}
                  </InspectorCard>
                )}
              </InspectorSection>
            </>
          );
        }}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="sq-elev-pop w-full max-w-lg">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="relative w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 max-h-[90vh] overflow-y-auto"
            >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="t-card font-semibold text-black dark:text-white">
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
            <form onSubmit={handleSaveStudent} className="space-y-4 pt-4 t-cap">
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
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-4 border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900/60 space-y-3"
              >
                <label className="flex items-center gap-2 font-semibold text-black dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isMinor}
                    onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
                    className="rounded-[var(--r-check,6px)] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] focus:ring-[#d4522f]"
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
                  data-sq="ctl"
                  data-sq-border="solid"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  data-sq="ctl"
                  data-sq-border="none"
                  className="px-5 py-2 bg-[var(--brand-fill,#C9461F)] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t('edu_btn_save_student')}
                </button>
              </div>
            </form>
            </div>
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
