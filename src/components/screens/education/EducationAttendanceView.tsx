import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  X,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RollCallModal } from './RollCallModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EduStudent, AttendanceStatus } from '../../../types';
import { localizeStatus } from '../../../utils/rules';
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
            <div className="w-8 h-8 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
              {st.fullName.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-black dark:text-white">{st.fullName}</div>
              <div className="text-[11px] text-black/55 dark:text-white/55">
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
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
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
              <span className="block text-[10px] text-black/55 dark:text-white/55 font-mono">
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
              <span className="font-bold text-black dark:text-white tabular-nums text-xs">{rate}%</span>
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
            <div className="flex items-center gap-1.5 flex-wrap">
              {studentRecords.slice(0, 4).map((rec) => (
                <span
                  key={rec.id}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                <span className="text-black/55 dark:text-white/55 italic text-[11px]">{t('edu_no_sessions')}</span>
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
            onClick={(e) => {
              e.stopPropagation();
              setIsRollCallOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#d4522f] hover:text-white text-black dark:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {t('edu_btn_roll_call')}
          </button>
        ),
      },
    ],
    [t, cohortAttendance, isAr, isEn, branchesById, currentBranch, language]
  );

  const renderStudentCard = (st: EduStudent) => {
    const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
    const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const total = studentRecords.length;
    const rate = total > 0 ? Math.round((presents / total) * 100) : st.attendanceRatePercent ?? 95;
    const b = resolveRecordBranch(st, branchesById, currentBranch, language);

    return (
      <div className="space-y-3.5 w-full">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-200 dark:border-neutral-700">
              {st.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-black dark:text-white text-sm">{st.fullName}</h3>
              <p className="text-[11px] text-black/70 dark:text-white/70">{b.name}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white">
            {st.schoolGrade || 'Enrolled'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-black/70 dark:text-white/70 font-medium">{t('edu_col_attendance')}</span>
            <span className="font-bold text-black dark:text-white tabular-nums">{rate}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                rate >= 85 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {studentRecords.slice(0, 3).map((rec) => (
              <span
                key={rec.id}
                className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  rec.status === 'Present'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : rec.status === 'Late'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                }`}
                title={rec.status}
              >
                {rec.status.charAt(0)}
              </span>
            ))}
            {studentRecords.length === 0 && (
              <span className="text-[10px] text-black/55 dark:text-white/55 italic">No logs yet</span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRollCallOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-[#d4522f] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
          >
            {t('edu_btn_roll_call')}
          </button>
        </div>
      </div>
    );
  };

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
        subtitle={`${cohortStudents.length} ${isAr ? 'متعلم في السجل' : isEn ? 'learners tracked' : 'apprenants suivis'}`}
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
        <div className="p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#d4522f] text-white text-xs font-bold flex items-center justify-center">
              {selectedStudentIds.size}
            </span>
            <span className="text-xs font-semibold text-black dark:text-white">
              {selectedStudentIds.size} {selectedStudentIds.size === 1 ? 'student' : 'students'} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleBatchMarkStatus('Present')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Mark Present</span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchMarkStatus('Late')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-700 transition-colors cursor-pointer"
            >
              <Clock size={13} />
              <span>Mark Late</span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchMarkStatus('Absent')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <XCircle size={13} />
              <span>Mark Absent</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudentIds(new Set<string>())}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
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
          showViewToggle={activeTab === 'attendance'}
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
            data={sortedStudents}
            columns={studentColumns}
            renderCard={renderStudentCard}
            keyExtractor={(st) => st.id}
            viewMode={viewMode}
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
            }}
            onViewDetails={(st, el) => {
              setDrawerOpenerEl(el || null);
              setSelectedStudent(st);
            }}
            emptyTitle="No learners in cohort"
            emptyDescription="No student records match the search criteria for this cohort"
            primaryActionLabel={t('edu_btn_roll_call')}
            onAddFirstItem={() => setIsRollCallOpen(true)}
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-separate border-spacing-y-1.5 text-xs">
              <thead>
                <tr className="bg-transparent text-[11px] font-semibold text-black/70 dark:text-white/70 uppercase tracking-wider rtl:normal-case rtl:tracking-normal">
                  <th className="py-2.5 px-4">{t('edu_col_student')}</th>
                  {assessmentTitles.map((title) => (
                    <th key={title} className="py-2.5 px-4">
                      {title}
                    </th>
                  ))}
                  <th className="py-2.5 px-4">{t('edu_avg_weighted')}</th>
                  <th className="py-2.5 px-4 text-right rtl:text-left">{t('edu_col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((st) => {
                  const studentGrades = cohortGrades.filter((g) => g.studentId === st.id);
                  const totalScore = studentGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0);
                  const avgScore = studentGrades.length > 0 ? Math.round(totalScore / studentGrades.length) : 0;

                  return (
                    <tr
                      key={st.id}
                      className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-black dark:text-white">{st.fullName}</div>
                        <div className="text-[10px] text-black/55 dark:text-white/55">
                          {st.schoolGrade || 'Standard'}
                        </div>
                      </td>

                      {assessmentTitles.map((title) => {
                        const grade = studentGrades.find((g) => g.assessmentTitle === title);
                        return (
                          <td key={title} className="py-3.5 px-4 tabular-nums">
                            {grade ? (
                              <span className="font-semibold text-black dark:text-white">
                                {grade.score} / {grade.maxScore}
                              </span>
                            ) : (
                              <span className="text-black/55 dark:text-white/55">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3.5 px-4">
                        {studentGrades.length > 0 ? (
                          <span
                            className={`font-bold tabular-nums text-xs ${
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
                          <span className="text-black/55 dark:text-white/55 italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right rtl:text-left">
                        <button
                          type="button"
                          onClick={() => {
                            setGradeForm((prev) => ({
                              ...prev,
                              studentId: st.id,
                            }));
                            setIsGradeModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#d4522f] hover:text-white text-black dark:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t('edu_btn_record_grade')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        avatarText={(activeStudent?.fullName || 'S').charAt(0).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeStudent ? resolveRecordBranch(activeStudent, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeStudent ? localizeStatus(activeStudent.status, language) : undefined}
        onSelectItem={(s) => setSelectedStudent(s)}
        onClose={() => setSelectedStudent(null)}
        renderBody={(st) => {
          const stAtt = cohortAttendance.filter((a) => a.studentId === st.id);
          const stGrades = cohortGrades.filter((g) => g.studentId === st.id);
          return (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold uppercase tracking-wider text-black/55 dark:text-white/55 mb-2">
                  {t('edu_tab_rollcall')}
                </h4>
                {stAtt.length === 0 ? (
                  <p className="italic text-black/55 dark:text-white/55">{t('edu_no_sessions')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {stAtt.slice(0, 6).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-neutral-900/60"
                      >
                        <span className="font-mono text-black/70 dark:text-white/75">
                          {a.recordedAt ? a.recordedAt.split('T')[0] : 'Session'}
                        </span>
                        <span className="font-bold text-black dark:text-white">{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold uppercase tracking-wider text-black/55 dark:text-white/55 mb-2">
                  {t('edu_tab_gradebook')}
                </h4>
                {stGrades.length === 0 ? (
                  <p className="italic text-black/55 dark:text-white/55">No grades recorded yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {stGrades.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      >
                        <span className="font-semibold text-black dark:text-white">{g.assessmentTitle}</span>
                        <span className="font-bold text-[#d4522f] tabular-nums">
                          {g.score} / {g.maxScore}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />

      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
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

            <form onSubmit={handleRecordGrade} className="space-y-4 pt-4 text-xs">
              <LabelSelect
                field="Student"
                label={t('edu_grade_student')}
                value={gradeForm.studentId}
                onChange={(val) => setGradeForm({ ...gradeForm, studentId: extractStr(val) })}
                options={cohortStudents.map((s) => ({ value: s.id, label: s.fullName }))}
                height={44}
                corner={14}
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
                  corner={14}
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
                    corner={14}
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
                    corner={14}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-black dark:text-white mb-1">
                  {t('edu_grade_remarks')}
                </label>
                <textarea
                  rows={2}
                  value={gradeForm.teacherRemarks}
                  onChange={(e) => setGradeForm({ ...gradeForm, teacherRemarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white"
                />
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
