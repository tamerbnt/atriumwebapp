import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  X,
  Eye,
  Pin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RollCallModal } from './RollCallModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { EduStudent, AttendanceStatus } from '../../../types';
import { localizeStatus } from '../../../utils/rules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  KineticEmptyStateMotion,
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
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

type ModeKey = 'attendance' | 'gradebook';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const EducationAttendanceView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    currentBranch,
    branches,
    eduCohorts,
    eduSessions,
    eduStudents,
    eduEnrollments,
    eduAttendance,
    eduGrades,
    recordEduGrade,
    batchRecordAttendance,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<ModeKey>('attendance');
  const [selectedCohortId, setSelectedCohortId] = useState<string>(eduCohorts[0]?.id || 'all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<EduStudent | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'attendance' | 'grades'>('overview');

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedStudentIds, setPinnedStudentIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('student');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [gradeForm, setGradeForm] = useState({
    studentId: '',
    assessmentTitle: 'Midterm Evaluation',
    score: 85,
    maxScore: 100,
    weightPercent: 30,
    teacherRemarks: 'Excellent analytical reasoning and code quality.',
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeCohort = useMemo(
    () => eduCohorts.find((c) => c.id === selectedCohortId) || eduCohorts[0],
    [eduCohorts, selectedCohortId]
  );

  const cohortEnrollments = useMemo(() => {
    const targetId = selectedCohortId === 'all' ? undefined : activeCohort?.id || selectedCohortId;
    return eduEnrollments.filter((e) => (!targetId || e.cohortId === targetId) && e.status === 'Active');
  }, [eduEnrollments, activeCohort, selectedCohortId]);

  const cohortStudentIds = useMemo(() => cohortEnrollments.map((e) => e.studentId), [cohortEnrollments]);

  const cohortStudents = useMemo(() => {
    if (selectedCohortId === 'all') return eduStudents;
    const list = eduStudents.filter((s) => cohortStudentIds.includes(s.id));
    return list.length > 0 ? list : eduStudents.slice(0, 10);
  }, [eduStudents, cohortStudentIds, selectedCohortId]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    cohortStudents.forEach((st) => {
      const b = resolveRecordBranch(st, branchesById, currentBranch, language).name;
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }, [cohortStudents, branchesById, currentBranch, language]);

  const filteredCohortStudents = useMemo(() => {
    return cohortStudents.filter((s) => {
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language).name;
        if (b !== branchFilter) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        Boolean(s.phone && s.phone.includes(q)) ||
        Boolean(s.email && s.email.toLowerCase().includes(q)) ||
        Boolean(s.rfidBadgeCode && s.rfidBadgeCode.toLowerCase().includes(q))
      );
    });
  }, [cohortStudents, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const cohortAttendance = useMemo(() => {
    if (selectedCohortId === 'all') return eduAttendance;
    return eduAttendance.filter((a) => a.cohortId === (activeCohort?.id || selectedCohortId));
  }, [eduAttendance, activeCohort, selectedCohortId]);

  const cohortSessions = useMemo(() => {
    if (selectedCohortId === 'all') return eduSessions;
    return eduSessions.filter((s) => s.cohortId === (activeCohort?.id || selectedCohortId));
  }, [eduSessions, activeCohort, selectedCohortId]);

  const cohortGrades = useMemo(() => {
    if (selectedCohortId === 'all') return eduGrades;
    return eduGrades.filter((g) => g.cohortId === (activeCohort?.id || selectedCohortId));
  }, [eduGrades, activeCohort, selectedCohortId]);

  const sortedStudents = useMemo(() => {
    return [...filteredCohortStudents].sort((a, b) => {
      const aPinned = pinnedStudentIds.has(a.id);
      const bPinned = pinnedStudentIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'attendanceRate') {
        cmp = (a.attendanceRatePercent ?? 95) - (b.attendanceRatePercent ?? 95);
      } else if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else if (sortBy === 'schoolGrade') {
        cmp = (a.schoolGrade || '').localeCompare(b.schoolGrade || '');
      } else {
        cmp = a.fullName.localeCompare(b.fullName);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredCohortStudents, pinnedStudentIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const activeStudent = useMemo(() => {
    if (!selectedStudent) return null;
    return eduStudents.find((s) => s.id === selectedStudent.id) || selectedStudent;
  }, [selectedStudent, eduStudents]);

  const assessmentTitles = useMemo(
    () => Array.from(new Set(cohortGrades.map((g) => g.assessmentTitle))),
    [cohortGrades]
  );

  const handleRecordGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCohortId = activeCohort?.id || eduCohorts[0]?.id || '';
    const student = eduStudents.find((s) => s.id === gradeForm.studentId);
    if (!student || !targetCohortId) return;

    recordEduGrade({
      cohortId: targetCohortId,
      studentId: student.id,
      studentName: student.fullName,
      assessmentTitle: gradeForm.assessmentTitle,
      score: gradeForm.score,
      maxScore: gradeForm.maxScore,
      weightPercent: gradeForm.weightPercent,
      teacherRemarks: gradeForm.teacherRemarks || undefined,
    });

    setIsGradeModalOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم تسجيل النقطة' : isEn ? 'Grade Recorded' : 'Note enregistrée',
      message: `${student.fullName} — ${gradeForm.score}/${gradeForm.maxScore}`,
    });
  };

  const handleBatchMarkStatus = (status: AttendanceStatus) => {
    if (selectedStudentIds.size === 0) return;
    const targetCohortId = activeCohort?.id || eduCohorts[0]?.id || '';
    const targetSession = cohortSessions[0] || eduSessions[0];
    const sessionId = targetSession?.id || `sess_ad_hoc_${Date.now()}`;

    const studentsToMark = cohortStudents.filter((s) => selectedStudentIds.has(s.id));
    const records = studentsToMark.map((st) => ({
      studentId: st.id,
      studentName: st.fullName,
      status,
      minutesLate: status === 'Late' ? 15 : undefined,
      excuseNote: status === 'Excused' ? 'Medical note or administrative approval' : undefined,
    }));

    batchRecordAttendance(sessionId, targetCohortId, records);
    setSelectedStudentIds(new Set<string>());
    showToast({
      type: 'success',
      title: 'Batch Attendance Logged',
      message: `${records.length} students marked ${status}.`,
    });
  };

  const handleExportCSV = useCallback(() => {
    if (activeTab === 'attendance') {
      const headers = ['Student ID', 'Full Name', 'Branch', 'Phone', 'Grade/Level', 'Attendance Rate %', 'RFID', 'Total Records'];
      const rows = sortedStudents.map((st) => {
        const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
        const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        const total = studentRecords.length;
        const rate = total > 0 ? Math.round((presents / total) * 100) : st.attendanceRatePercent ?? 95;
        return [
          st.id,
          st.fullName,
          resolveRecordBranch(st, branchesById, currentBranch, language).name,
          st.phone || '',
          st.schoolGrade || '',
          `${rate}%`,
          st.rfidBadgeCode || '',
          String(total),
        ];
      });
      downloadCsvSafe(
        `atrium_cohort_attendance_${activeCohort?.name || 'cohort'}_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      );
    } else {
      const headers = ['Student ID', 'Full Name', 'Assessment', 'Score', 'Max Score', 'Percentage %', 'Remarks'];
      const rows = cohortGrades.map((g) => [
        g.studentId,
        g.studentName || '',
        g.assessmentTitle || '',
        String(g.score),
        String(g.maxScore),
        `${Math.round((g.score / g.maxScore) * 100)}%`,
        g.teacherRemarks || '',
      ]);
      downloadCsvSafe(
        `atrium_cohort_gradebook_${activeCohort?.name || 'cohort'}_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      );
    }
    showToast({
      type: 'success',
      title: 'Export Complete',
      message: `${activeTab === 'attendance' ? 'Attendance roll' : 'Gradebook records'} exported successfully.`,
    });
  }, [activeTab, sortedStudents, cohortAttendance, cohortGrades, activeCohort, branchesById, currentBranch, language]);

  const totalAttRecords = cohortAttendance.length;
  const presentAttRecords = cohortAttendance.filter(
    (a) => a.status === 'Present' || a.status === 'Late'
  ).length;
  const cohortAttRate = totalAttRecords > 0 ? Math.round((presentAttRecords / totalAttRecords) * 100) : 95;
  const avgGrade =
    cohortGrades.length > 0
      ? Math.round(cohortGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / cohortGrades.length)
      : 88;

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: cohortStudents.length },
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
        id: 'cohort',
        label: isAr ? 'الفوج الدراسي' : isEn ? 'Cohort' : 'Cohorte / Promotion',
        value: selectedCohortId,
        onChange: setSelectedCohortId,
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: t('edu_filter_all') },
          ...eduCohorts.map((c) => ({ value: c.id, label: c.cohortCode || c.name })),
        ],
      },
    ];
  }, [branchFilter, selectedCohortId, branchCounts, cohortStudents.length, eduCohorts, isAr, isEn, t]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (selectedCohortId !== 'all') {
      const c = eduCohorts.find((co) => co.id === selectedCohortId);
      if (c) {
        chips.push({
          key: 'cohort',
          label: c.cohortCode || c.name,
          onRemove: () => setSelectedCohortId('all'),
        });
      }
    }
    return chips;
  }, [branchFilter, selectedCohortId, eduCohorts, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (selectedCohortId !== 'all' ? 1 : 0);

  const getStudentRowMeta = useCallback(
    (st: EduStudent): KineticRowMeta => {
      const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
      const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
      const total = studentRecords.length;
      const rate = total > 0 ? Math.round((presents / total) * 100) : st.attendanceRatePercent ?? 95;
      return {
        avatarText: st.fullName.slice(0, 2).toUpperCase(),
        subline: st.phone || st.email || st.schoolGrade || 'Enrolled',
        categoryLabel: st.schoolGrade || 'Standard',
        statusVariant: rate >= 85 ? 'active' : rate >= 70 ? 'warning' : 'blocked',
        statusLabel: localizeStatus(st.status, language),
        metricPrimary: `${rate}%`,
        metricSecondary: `${total} ${isAr ? 'جلسات' : 'séances'}`,
        detailCol1: {
          heading: isAr ? 'الطالب والمستوى' : isEn ? 'Student & Grade' : 'Apprenant & Niveau',
          primaryText: st.fullName,
          secondaryText: st.phone || st.email || '—',
          tertiaryText: st.schoolGrade || 'Standard',
        },
        detailCol2: {
          heading: isAr ? 'الحضور والمواظبة' : isEn ? 'Attendance Rate' : 'Assiduité & Séances',
          primaryText: `${rate}% (${presents}/${total})`,
          secondaryText: `${total} ${isAr ? 'حصة مسجلة' : 'séances suivies'}`,
        },
        detailCol3: {
          heading: isAr ? 'الحالة الأكاديمية' : isEn ? 'Status & Guardian' : 'Statut & Tuteur',
          primaryText: localizeStatus(st.status, language),
          secondaryText: st.guardianName || undefined,
        },
        isPinned: pinnedStudentIds.has(st.id),
      };
    },
    [cohortAttendance, pinnedStudentIds, isAr, isEn, language]
  );

  const toggleStudentPin = useCallback((id: string) => {
    setPinnedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const getStudentFanActions = useCallback(
    (st: EduStudent): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedStudent(st);
          setInspectorTab('overview');
        },
      },
      {
        id: 'rollcall',
        label: t('edu_btn_roll_call'),
        icon: <CheckCircle2 className="w-[15px] h-[15px]" />,
        onClick: () => setIsRollCallOpen(true),
      },
      {
        id: 'grade',
        label: t('edu_btn_record_grade'),
        icon: <Award className="w-[15px] h-[15px]" />,
        onClick: () => {
          setGradeForm((prev) => ({ ...prev, studentId: st.id }));
          setIsGradeModalOpen(true);
        },
      },
      {
        id: 'pin',
        label: pinnedStudentIds.has(st.id) ? (isAr ? 'إلغاء التثبيت' : 'Détacher') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className="w-[15px] h-[15px]" />,
        onClick: () => toggleStudentPin(st.id),
      },
    ],
    [isAr, isEn, t, pinnedStudentIds, toggleStudentPin]
  );

  const getStudentDetailActions = useCallback(
    (st: EduStudent): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isEn ? 'Open' : 'Ouvrir',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedStudent(st);
          setInspectorTab('overview');
        },
      },
      {
        id: 'rollcall',
        label: t('edu_btn_roll_call'),
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
        onClick: () => setIsRollCallOpen(true),
      },
      {
        id: 'grade',
        label: t('edu_btn_record_grade'),
        icon: <Award className="w-3.5 h-3.5" />,
        onClick: () => {
          setGradeForm((prev) => ({ ...prev, studentId: st.id }));
          setIsGradeModalOpen(true);
        },
      },
      {
        id: 'pin',
        label: pinnedStudentIds.has(st.id) ? (isAr ? 'إلغاء التثبيت' : 'Détacher') : (isAr ? 'تثبيت' : 'Épingler'),
        icon: <Pin className="w-3.5 h-3.5" />,
        onClick: () => toggleStudentPin(st.id),
      },
    ],
    [isAr, isEn, t, pinnedStudentIds, toggleStudentPin]
  );

  const studentColumns: ColumnDefinition<EduStudent>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('edu_col_student'),
        width: '2.3*',
        minWidth: '185px',
        sortable: true,
        renderCell: (st) => (
          <div className="flex items-center gap-3">
            <div
              data-sq="ctl-sm"
              data-sq-border="solid"
              className="w-8 h-8 bg-[#FCEEE8] dark:bg-neutral-800 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small shrink-0 border border-neutral-200 dark:border-neutral-700"
            >
              {st.fullName.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-black dark:text-white">{st.fullName}</div>
              <div className="t-cap text-black/55 dark:text-white/55">
                {st.phone || st.email || 'No contact'}
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
        renderCell: (st) => {
          const b = resolveRecordBranch(st, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'schoolGrade',
        header: 'Grade & RFID',
        width: '1.3*',
        minWidth: '120px',
        sortable: true,
        renderCell: (st) => (
          <div className="space-y-0.5">
            <span className="font-medium text-black dark:text-white">{st.schoolGrade || 'Standard'}</span>
            {st.rfidBadgeCode && (
              <span className="block t-cap text-black/55 dark:text-white/55 tabular-nums">
                {st.rfidBadgeCode}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'attendanceRate',
        header: t('edu_col_attendance'),
        width: '1.6*',
        minWidth: '140px',
        sortable: true,
        renderCell: (st) => {
          const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
          const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
          const total = studentRecords.length;
          const rate = total > 0 ? Math.round((presents / total) * 100) : st.attendanceRatePercent ?? 95;
          return (
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    rate >= 85 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="font-semibold text-black dark:text-white tabular-nums t-small">{rate}%</span>
            </div>
          );
        },
      },
      {
        key: 'recentHistory',
        header: 'Recent Sessions',
        width: '1.8*',
        minWidth: '150px',
        renderCell: (st) => {
          const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
          return (
            <div className="flex items-center gap-2 flex-wrap">
              {studentRecords.slice(0, 4).map((rec) => (
                <span
                  key={rec.id}
                  className={`px-2 py-1 rounded-full t-small font-semibold ${
                    rec.status === 'Present'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : rec.status === 'Late'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  {rec.status === 'Present'
                    ? t('edu_roll_call_present')
                    : rec.status === 'Late'
                    ? t('edu_roll_call_late')
                    : rec.status === 'Absent'
                    ? t('edu_roll_call_absent')
                    : t('edu_roll_call_excused')}
                </span>
              ))}
              {studentRecords.length === 0 && (
                <span className="text-black/55 dark:text-white/55 italic t-cap">{t('edu_no_sessions')}</span>
              )}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: t('edu_col_actions'),
        width: '1.1*',
        minWidth: '100px',
        renderCell: () => (
          <button
            type="button"
            data-sq="ctl-sm"
            data-sq-border="none"
            onClick={(e) => {
              e.stopPropagation();
              setIsRollCallOpen(true);
            }}
            className="px-2.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-[#d4522f] hover:text-white text-black dark:text-white t-small font-semibold transition-colors cursor-pointer"
          >
            {t('edu_btn_roll_call')}
          </button>
        ),
      },
    ],
    [t, cohortAttendance, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (cohortStudents || []).length > 0 || (eduCohorts || []).length > 0,
  });

  if (showSkeleton && ((cohortStudents || []).length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '200px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '2*', minWidth: '160px' },
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
        icon={<Award size={22} />}
        title={t('edu_attendance_title')}
        primaryAction={
          activeTab === 'attendance'
            ? {
                label: t('edu_btn_roll_call'),
                icon: <CheckCircle2 size={15} />,
                onClick: () => setIsRollCallOpen(true),
              }
            : {
                label: t('edu_btn_record_grade'),
                icon: <Plus size={14} />,
                onClick: () => {
                  setGradeForm((prev) => ({
                    ...prev,
                    studentId: cohortStudents[0]?.id || '',
                  }));
                  setIsGradeModalOpen(true);
                },
              }
        }
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الحضور والانضباط الأكاديمي' : isEn ? 'Attendance Overview' : 'Assiduité & Santé Pédagogique'}
        language={language}
        primaryCard={{
          label: t('edu_kpi_cohort_att_rate'),
          count: cohortAttRate,
          formatValue: (v) => `${v}%`,
          badgeText: t('edu_verified_rate'),
          tone: 'emerald',
          isActive: activeTab === 'attendance',
          onToggle: () => setActiveTab('attendance'),
        }}
        secondaryCard={{
          label: t('edu_kpi_active_roster'),
          count: cohortStudents.length,
          badgeText: activeCohort?.scheduleSummary || 'Regular session',
          tone: 'terracotta',
        }}
        darkCard={{
          label: t('edu_kpi_academic_perf'),
          valueCount: avgGrade,
          valueSuffix: '%',
          badgeCount: cohortGrades.length,
          badgeSuffix: isAr ? ' تقييم' : ' notes',
          caption: isAr ? 'المعدل العام التراكمي' : 'Moyenne générale pondérée',
        }}
      />

      {selectedStudentIds.size > 0 && activeTab === 'attendance' && (
        <div
          data-sq="card"
          data-sq-border="solid"
          className="p-3 px-4 bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 [--sq-stroke:#F5E2D8] dark:[--sq-stroke:#404040] flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold flex items-center justify-center">
              {selectedStudentIds.size}
            </span>
            <span className="t-small font-semibold text-black dark:text-white">
              {selectedStudentIds.size} {selectedStudentIds.size === 1 ? 'student' : 'students'} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => handleBatchMarkStatus('Present')}
              className="px-3 py-2 bg-emerald-600 text-white t-small font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Mark Present</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => handleBatchMarkStatus('Late')}
              className="px-3 py-2 bg-amber-600 text-white t-small font-semibold flex items-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer"
            >
              <Clock size={13} />
              <span>Mark Late</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={() => handleBatchMarkStatus('Absent')}
              className="px-3 py-2 bg-rose-600 text-white t-small font-semibold flex items-center gap-2 hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <XCircle size={13} />
              <span>Mark Absent</span>
            </button>
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="solid"
              onClick={() => setSelectedStudentIds(new Set<string>())}
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white t-small font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <ScreenPod>
        <ScreenCollectionToolbar
          title={activeTab === 'attendance' ? t('edu_tab_rollcall') : t('edu_tab_gradebook')}
          liveRegionText={`${sortedStudents.length} ${isAr ? 'طالب' : 'apprenants'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('edu_search_in_cohort')}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          showViewToggle
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          extraTrailingControls={
            <LiveSegmentedControl
              size="md"
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as ModeKey)}
              options={[
                { value: 'attendance', label: t('edu_tab_rollcall') },
                { value: 'gradebook', label: t('edu_tab_gradebook'), count: cohortGrades.length },
              ]}
              aria-label="Attendance or Gradebook Mode"
            />
          }
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setSelectedCohortId('all');
            setSearchQuery('');
          }}
        />

        {activeTab === 'attendance' ? (
          <UniversalDataCollection<EduStudent>
            hideToolbar
            items={sortedStudents}
            columns={studentColumns}
            keyExtractor={(st) => st.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            openItemId={activeStudent?.id ?? null}
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
            selectedIds={selectedStudentIds}
            onSelectionChange={setSelectedStudentIds}
            onItemClick={(st, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedStudent(st);
              setInspectorTab('overview');
            }}
            onViewDetails={(st, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedStudent(st);
              setInspectorTab('overview');
            }}
            getRowMeta={getStudentRowMeta}
            getFanActions={getStudentFanActions}
            getDetailActions={getStudentDetailActions}
            emptyTitle="No learners in cohort"
            emptyDescription="No student records match the search criteria for this cohort"
            primaryActionLabel={t('edu_btn_roll_call')}
            onAddFirstItem={() => setIsRollCallOpen(true)}
          />
        ) : (
          <UniversalDataCollection<EduStudent>
            hideToolbar
            items={sortedStudents}
            keyExtractor={(st) => st.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
            openItemId={activeStudent?.id ?? null}
            pinnedIds={pinnedStudentIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              toggleStudentPin(id);
            }}
            selectedIds={selectedStudentIds}
            onSelectionChange={setSelectedStudentIds}
            onItemClick={(st, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedStudent(st);
              setInspectorTab('grades');
            }}
            onViewDetails={(st, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedStudent(st);
              setInspectorTab('grades');
            }}
            columns={[
              {
                key: 'student',
                header: t('edu_col_student'),
                width: '2.2*',
                minWidth: '175px',
                sortable: true,
                renderCell: (st) => (
                  <div>
                    <div className="font-semibold t-small text-black dark:text-white">{st.fullName}</div>
                    <div className="t-cap text-black/55 dark:text-white/55">
                      {st.schoolGrade || 'Standard'}
                    </div>
                  </div>
                ),
              },
              ...assessmentTitles.map((title) => ({
                key: `grade_${title}`,
                header: title,
                width: '1.2*',
                renderCell: (st: EduStudent) => {
                  const grade = cohortGrades.find(
                    (g) => g.studentId === st.id && g.assessmentTitle === title
                  );
                  return grade ? (
                    <span className="font-semibold t-small tabular-nums text-black dark:text-white">
                      {grade.score} / {grade.maxScore}
                    </span>
                  ) : (
                    <span className="t-cap text-black/55 dark:text-white/55">—</span>
                  );
                },
              })),
              {
                key: 'avgScore',
                header: t('edu_avg_weighted'),
                width: '1.2*',
                renderCell: (st) => {
                  const stGrades = cohortGrades.filter((g) => g.studentId === st.id);
                  const totalScore = stGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
                  const avgScore = stGrades.length > 0 ? Math.round(totalScore / stGrades.length) : 0;
                  return stGrades.length > 0 ? (
                    <span
                      className={`font-semibold tabular-nums t-small ${
                        avgScore >= 80
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : avgScore >= 60
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {avgScore}%
                    </span>
                  ) : (
                    <span className="text-black/55 dark:text-white/55 italic t-cap">—</span>
                  );
                },
              },
              {
                key: 'actions',
                header: t('edu_col_actions'),
                width: '1.2*',
                renderCell: (st) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGradeForm((prev) => ({
                        ...prev,
                        studentId: st.id,
                      }));
                      setIsGradeModalOpen(true);
                    }}
                    data-sq="ctl-sm"
                    data-sq-border="none"
                    className="px-2.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-[#d4522f] hover:text-white text-black dark:text-white t-small font-semibold transition-colors cursor-pointer"
                  >
                    {t('edu_btn_record_grade')}
                  </button>
                ),
              },
            ]}
            getRowMeta={(st): KineticRowMeta => {
              const stGrades = cohortGrades.filter((g) => g.studentId === st.id);
              const totalScore = stGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
              const avgScore = stGrades.length > 0 ? Math.round(totalScore / stGrades.length) : 0;
              const summaryScores = stGrades
                .slice(0, 3)
                .map((g) => `${g.assessmentTitle}: ${g.score}/${g.maxScore}`)
                .join(' · ');
              return {
                avatarText: st.fullName.slice(0, 2).toUpperCase(),
                subline: st.schoolGrade || 'Standard',
                categoryLabel: `${stGrades.length} ${isAr ? 'تقييمات' : 'notes'}`,
                statusVariant: stGrades.length === 0 ? 'warning' : avgScore >= 80 ? 'active' : avgScore >= 60 ? 'warning' : 'blocked',
                statusLabel: stGrades.length > 0 ? `${avgScore}%` : '—',
                metricPrimary: stGrades.length > 0 ? `${avgScore}%` : '—',
                metricSecondary: `${stGrades.length} évaluations`,
                isPinned: pinnedStudentIds.has(st.id),
                detailCol1: {
                  heading: t('edu_col_student'),
                  primaryText: st.fullName,
                  secondaryText: st.schoolGrade || 'Standard',
                },
                detailCol2: {
                  heading: t('edu_tab_gradebook'),
                  primaryText: summaryScores || 'Aucune note enregistrée',
                },
                detailCol3: {
                  heading: t('edu_avg_weighted'),
                  primaryText: stGrades.length > 0 ? `${avgScore}%` : '—',
                  secondaryText: localizeStatus(st.status, language),
                },
              };
            }}
            getFanActions={getStudentFanActions}
            getDetailActions={getStudentDetailActions}
            emptyTitle="No learners in cohort"
            emptyDescription="No student records match the search criteria for this cohort"
            primaryActionLabel={t('edu_btn_record_grade')}
            onAddFirstItem={() => {
              setGradeForm((prev) => ({
                ...prev,
                studentId: cohortStudents[0]?.id || '',
              }));
              setIsGradeModalOpen(true);
            }}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedStudents.length}
        entityPluralLabel={isAr ? 'طالب' : isEn ? 'learners' : 'apprenants'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setSelectedCohortId('all');
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
        subtitle={activeStudent?.phone || activeStudent?.email || ''}
        categoryLabel={activeStudent?.schoolGrade || 'Standard'}
        avatarText={(activeStudent?.fullName || 'ST').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeStudent ? resolveRecordBranch(activeStudent, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeStudent ? localizeStatus(activeStudent.status, language) : undefined}
        statusClassName={
          activeStudent?.status === 'Active'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Summary' : 'Synthèse' },
          { id: 'attendance', label: t('edu_tab_rollcall') },
          { id: 'grades', label: t('edu_tab_gradebook') },
        ]}
        activeTab={inspectorTab}
        onTabChange={(id) => setInspectorTab(id as 'overview' | 'attendance' | 'grades')}
        onSelectItem={(s) => {
          setSelectedStudent(s);
          setInspectorTab('overview');
        }}
        onClose={() => setSelectedStudent(null)}
        renderBody={(st, tab) => {
          const stAtt = cohortAttendance.filter((a) => a.studentId === st.id);
          const stGrades = cohortGrades.filter((g) => g.studentId === st.id);
          const presents = stAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
          const rate = stAtt.length > 0 ? Math.round((presents / stAtt.length) * 100) : st.attendanceRatePercent ?? 95;

          if (tab === 'attendance') {
            return (
              <InspectorSection index={0} title={t('edu_tab_rollcall')}>
                <InspectorCard>
                  {stAtt.length === 0 ? (
                    <InspectorListItem title={t('edu_no_sessions')} isLast />
                  ) : (
                    stAtt.slice(0, 8).map((a, idx) => (
                      <InspectorListItem
                        key={a.id}
                        title={a.recordedAt ? a.recordedAt.split('T')[0] : 'Session'}
                        subtitle={a.minutesLate ? `+${a.minutesLate}m` : undefined}
                        badge={{
                          label: a.status,
                          tone: a.status === 'Present' ? 'ok' : a.status === 'Late' ? 'warn' : 'danger',
                        }}
                        isLast={idx === Math.min(7, stAtt.length - 1)}
                      />
                    ))
                  )}
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (tab === 'grades') {
            return (
              <>
                <InspectorSection index={0} title={t('edu_tab_gradebook')}>
                  {stGrades.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`att-grades-empty-${st.id}`}>
                      <EmptyState
                        variant="compact"
                        tone="neutral"
                        icon={<Award size={20} />}
                        title={isAr ? 'لا توجد علامات مسجلة' : isEn ? 'No grades recorded' : 'Aucune note enregistrée'}
                        description={
                          isAr
                            ? 'لم يتم إدخال تقييمات لهذا الطالب بعد.'
                            : isEn
                            ? 'No assessments have been recorded for this student yet.'
                            : 'Aucune évaluation saisie pour cet étudiant.'
                        }
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {stGrades.map((g, idx) => (
                        <InspectorListItem
                          key={g.id}
                          title={g.assessmentTitle}
                          subtitle={g.teacherRemarks}
                          metaRight={`${g.score} / ${g.maxScore}`}
                          isLast={idx === stGrades.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={t('edu_btn_record_grade')}
                    icon={<Plus size={15} />}
                    tone="accent"
                    onClick={() => {
                      setGradeForm((prev) => ({ ...prev, studentId: st.id }));
                      setIsGradeModalOpen(true);
                    }}
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
                      label: t('edu_btn_roll_call'),
                      icon: <CheckCircle2 size={16} />,
                      primary: true,
                      onClick: () => setIsRollCallOpen(true),
                    },
                    {
                      id: 'grade',
                      label: t('edu_btn_record_grade'),
                      icon: <Award size={16} />,
                      onClick: () => {
                        setGradeForm((prev) => ({ ...prev, studentId: st.id }));
                        setIsGradeModalOpen(true);
                      },
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1}>
                <InspectorBigStat
                  value={`${rate}%`}
                  tone={rate >= 85 ? 'ok' : rate >= 70 ? 'default' : 'danger'}
                  caption={t('edu_col_attendance')}
                />
              </InspectorSection>
              <InspectorSection index={2} title={t('edu_col_student')}>
                <InspectorCard>
                  <InspectorKeyValue label={t('edu_col_attendance')} value={`${rate}%`} tone={rate >= 85 ? 'ok' : 'danger'} />
                  <InspectorProgressBar percent={rate} tone={rate >= 85 ? 'ok' : rate >= 70 ? 'warn' : 'danger'} animateKey={st.id} />
                  <InspectorKeyValue label="Grade / Level" value={st.schoolGrade || 'Standard'} mono={false} />
                  <InspectorKeyValue label="RFID" value={st.rfidBadgeCode || '—'} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="sq-elev-pop w-full max-w-md">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="relative w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6"
            >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="t-card font-semibold text-black dark:text-white">
                {t('edu_grade_modal_title')}
              </h2>
              <button
                type="button"
                onClick={() => setIsGradeModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordGrade} className="space-y-4 pt-4 t-cap">
              <LabelSelect
                field="Student"
                label={t('edu_grade_student')}
                value={gradeForm.studentId}
                onChange={(val) => setGradeForm({ ...gradeForm, studentId: extractStr(val) })}
                options={cohortStudents.map((s) => ({ value: s.id, label: s.fullName }))}
                height={44}
                corner={12}
              />

              <div>
                <LabelInput
                  field="AssessmentTitle"
                  label={t('edu_grade_assessment')}
                  required
                  value={gradeForm.assessmentTitle}
                  onChange={(val) => setGradeForm({ ...gradeForm, assessmentTitle: extractStr(val) })}
                  placeholder="e.g. Midterm Exam, Project 1, Final Defense"
                  width="100%"
                  height={46}
                  corner={12}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="Score"
                    label={t('edu_grade_score')}
                    type="number"
                    required
                    value={gradeForm.score}
                    onChange={(val) => setGradeForm({ ...gradeForm, score: Number(extractStr(val)) || 0 })}
                    width="100%"
                    height={46}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelInput
                    field="MaxScore"
                    label={t('edu_grade_max')}
                    type="number"
                    required
                    value={gradeForm.maxScore}
                    onChange={(val) => setGradeForm({ ...gradeForm, maxScore: Number(extractStr(val)) || 100 })}
                    width="100%"
                    height={46}
                    corner={12}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-black dark:text-white mb-1">
                  {t('edu_grade_remarks')}
                </label>
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                >
                  <textarea
                    rows={2}
                    value={gradeForm.teacherRemarks}
                    onChange={(e) => setGradeForm({ ...gradeForm, teacherRemarks: e.target.value })}
                    className="lbi-field w-full px-3 py-2 bg-transparent border-0 text-black dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="outline" size="sm" type="button" onClick={() => setIsGradeModalOpen(false)}>
                  {t('common_cancel')}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" glow type="submit">
                  {t('edu_grade_save')}
                </AtriumButton>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {isRollCallOpen && (
        <RollCallModal
          cohortId={selectedCohortId === 'all' ? eduCohorts[0]?.id : selectedCohortId}
          onClose={() => setIsRollCallOpen(false)}
        />
      )}
    </div>
  );
};
