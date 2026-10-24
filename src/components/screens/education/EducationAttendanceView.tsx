import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  Users,
  Search,
  Calendar,
  X,
  TrendingUp,
  Download,
  Sparkles,
  Building2,
  ChevronDown,
  Check,
  CheckCheck,
  UserCheck,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RollCallModal } from './RollCallModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EduStudent, AttendanceStatus } from '../../../types';

type ModeKey = 'attendance' | 'gradebook';

export const EducationAttendanceView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    currentBusiness,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    eduCohorts,
    eduSessions,
    eduStudents,
    eduEnrollments,
    eduAttendance,
    eduGrades,
    recordEduGrade,
    deleteEduGrade,
    batchRecordAttendance,
    resetEduMockData,
    showToast,
  } = useAtriumStore();

  // Auto-healing
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && eduStudents.length === 0 && resetEduMockData) {
      hasAutoHealed.current = true;
      resetEduMockData();
    }
  }, [eduStudents.length, resetEduMockData]);

  const [activeTab, setActiveTab] = useState<ModeKey>('attendance');
  const [selectedCohortId, setSelectedCohortId] = useState<string>(
    eduCohorts[0]?.id || ''
  );
  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Pinning
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [pinnedStudentIds, setPinnedStudentIds] = useState<Set<string>>(new Set());

  // Grade Form State
  const [gradeForm, setGradeForm] = useState({
    studentId: '',
    assessmentTitle: 'Midterm Evaluation',
    score: 85,
    maxScore: 100,
    weightPercent: 30,
    teacherRemarks: 'Excellent analytical reasoning and code quality.',
  });

  const activeCohort = eduCohorts.find((c) => c.id === selectedCohortId) || eduCohorts[0];

  // Enrolled students in this cohort
  const cohortEnrollments = useMemo(() => {
    return eduEnrollments.filter(
      (e) => (e.cohortId === (activeCohort?.id || selectedCohortId)) && e.status === 'Active'
    );
  }, [eduEnrollments, activeCohort, selectedCohortId]);

  const cohortStudentIds = useMemo(() => cohortEnrollments.map((e) => e.studentId), [cohortEnrollments]);

  const cohortStudents = useMemo(() => {
    const list = eduStudents.filter((s) => cohortStudentIds.includes(s.id));
    // Fallback if cohort has no active enrollment links yet, show students
    return list.length > 0 ? list : eduStudents.slice(0, 10);
  }, [eduStudents, cohortStudentIds]);

  const filteredCohortStudents = useMemo(() => {
    if (!searchQuery.trim()) return cohortStudents;
    const q = searchQuery.toLowerCase();
    return cohortStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.rfidBadgeCode?.toLowerCase().includes(q)
    );
  }, [cohortStudents, searchQuery]);

  // Attendance for this cohort
  const cohortAttendance = useMemo(() => {
    return eduAttendance.filter((a) => a.cohortId === (activeCohort?.id || selectedCohortId));
  }, [eduAttendance, activeCohort, selectedCohortId]);

  // Sessions for this cohort
  const cohortSessions = useMemo(() => {
    return eduSessions.filter((s) => s.cohortId === (activeCohort?.id || selectedCohortId));
  }, [eduSessions, activeCohort, selectedCohortId]);

  // Grades for this cohort
  const cohortGrades = useMemo(() => {
    return eduGrades.filter((g) => g.cohortId === (activeCohort?.id || selectedCohortId));
  }, [eduGrades, activeCohort, selectedCohortId]);

  // Distinct assessment titles in this cohort
  const assessmentTitles = useMemo(() => {
    return Array.from(new Set(cohortGrades.map((g) => g.assessmentTitle)));
  }, [cohortGrades]);

  const togglePinStudent = (student: EduStudent) => {
    setPinnedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(student.id)) {
        next.delete(student.id);
      } else {
        next.add(student.id);
      }
      return next;
    });
  };

  const handleRecordGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCohortId = activeCohort?.id || selectedCohortId;
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
  };

  // Batch attendance helper
  const handleBatchMarkStatus = (status: AttendanceStatus) => {
    if (selectedStudentIds.size === 0) return;
    const targetCohortId = activeCohort?.id || selectedCohortId;
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
    setSelectedStudentIds(new Set());
    showToast({
      type: 'success',
      title: 'Batch Attendance Logged',
      message: `${records.length} students marked ${status}.`,
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (activeTab === 'attendance') {
      const headers = ['Student ID', 'Full Name', 'Phone', 'Grade/Level', 'Attendance Rate %', 'RFID', 'Total Records'];
      const rows = filteredCohortStudents.map((st) => {
        const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
        const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        const total = studentRecords.length;
        const rate = total > 0 ? Math.round((presents / total) * 100) : (st.attendanceRatePercent ?? 95);
        return [
          `"${st.id}"`,
          `"${st.fullName.replace(/"/g, '""')}"`,
          `"${st.phone || ''}"`,
          `"${st.schoolGrade || ''}"`,
          `"${rate}%"`,
          `"${st.rfidBadgeCode || ''}"`,
          `"${total}"`,
        ];
      });
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `atrium_cohort_attendance_${activeCohort?.name || 'cohort'}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Student ID', 'Full Name', 'Assessment', 'Score', 'Max Score', 'Percentage %', 'Remarks'];
      const rows = cohortGrades.map((g) => [
        `"${g.studentId}"`,
        `"${(g.studentName || '').replace(/"/g, '""')}"`,
        `"${(g.assessmentTitle || '').replace(/"/g, '""')}"`,
        `"${g.score}"`,
        `"${g.maxScore}"`,
        `"${Math.round((g.score / g.maxScore) * 100)}%"`,
        `"${(g.teacherRemarks || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `atrium_cohort_gradebook_${activeCohort?.name || 'cohort'}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    showToast({
      type: 'success',
      title: 'Export Complete',
      message: `${activeTab === 'attendance' ? 'Attendance roll' : 'Gradebook records'} exported successfully.`,
    });
  };

  // KPIs
  const totalAttRecords = cohortAttendance.length;
  const presentAttRecords = cohortAttendance.filter(
    (a) => a.status === 'Present' || a.status === 'Late'
  ).length;
  const cohortAttRate = totalAttRecords > 0 ? Math.round((presentAttRecords / totalAttRecords) * 100) : 95;
  const avgGrade =
    cohortGrades.length > 0
      ? Math.round(
          cohortGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) /
            cohortGrades.length
        )
      : 88;

  // UniversalDataCollection Columns for Attendance
  const studentColumns: ColumnDefinition<EduStudent>[] = useMemo(() => [
    {
      key: 'student',
      header: t('edu_col_student'),
      width: '2.5*',
      minWidth: '180px',
      sortable: true,
      renderCell: (st: EduStudent) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
            {st.fullName.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-neutral-900 dark:text-white">
              {st.fullName}
            </div>
            <div className="text-[11px] text-neutral-400">
              {st.phone || st.email || 'No contact'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'schoolGrade',
      header: 'Grade & RFID',
      width: '1.5*',
      minWidth: '120px',
      sortable: true,
      renderCell: (st: EduStudent) => (
        <div className="space-y-0.5">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {st.schoolGrade || 'Standard'}
          </span>
          {st.rfidBadgeCode && (
            <span className="block text-[10px] text-neutral-400 font-mono">
              {st.rfidBadgeCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'attendanceRate',
      header: t('edu_col_attendance'),
      width: '1.8*',
      minWidth: '140px',
      sortable: true,
      renderCell: (st: EduStudent) => {
        const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
        const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        const total = studentRecords.length;
        const rate = total > 0 ? Math.round((presents / total) * 100) : (st.attendanceRatePercent ?? 95);
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
            <span className="font-bold text-neutral-800 dark:text-neutral-200 tabular-nums text-xs">
              {rate}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'recentHistory',
      header: 'Recent Sessions',
      width: '2*',
      minWidth: '160px',
      renderCell: (st: EduStudent) => {
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
              <span className="text-neutral-400 italic text-[11px]">{t('edu_no_sessions')}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: t('edu_col_actions'),
      width: '1.2*',
      minWidth: '100px',
      renderCell: (st: EduStudent) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsRollCallOpen(true);
          }}
          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          {t('edu_btn_roll_call')}
        </button>
      ),
    },
  ], [t, cohortAttendance]);

  // Card view for Grid mode
  const renderStudentCard = (st: EduStudent) => {
    const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
    const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const total = studentRecords.length;
    const rate = total > 0 ? Math.round((presents / total) * 100) : (st.attendanceRatePercent ?? 95);

    return (
      <div className="space-y-3.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-200 dark:border-neutral-700">
              {st.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm">
                {st.fullName}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {st.phone || st.email || 'No phone'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {st.schoolGrade || 'Enrolled'}
          </span>
        </div>

        {/* Rate Gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium">
              {t('edu_col_attendance')}
            </span>
            <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
              {rate}%
            </span>
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

        {/* Recent session badges */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {studentRecords.slice(0, 3).map((rec) => (
              <span
                key={rec.id}
                className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
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
              <span className="text-[10px] text-neutral-400 italic">No logs yet</span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRollCallOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-[#C4785A] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
          >
            {t('edu_btn_roll_call')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('edu_attendance_title')}
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {activeCohort?.name || t('edu_label_cohort')} · {t('edu_learners_count', { count: String(cohortStudents.length) })}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t('edu_attendance_subtitle')}
          </p>
        </div>

        {/* Action Station */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Facility / Vertical Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
            >
              <Building2 size={14} className="text-[#C4785A]" />
              <span className="truncate max-w-[130px] sm:max-w-[170px]">
                {currentBusiness?.displayName || 'Atlas Academy'}
              </span>
              <ChevronDown size={13} className="text-neutral-400" />
            </button>

            {isFacilityDropdownOpen && (
              <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150`}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('topbar_fast_switch')}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.displayName || biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Demo Data Button */}
          <AtriumButton
            variant="outline"
            size="sm"
            icon={<Sparkles size={14} className="text-[#C4785A]" />}
            onClick={() => {
              resetEduMockData();
              showToast({
                type: 'success',
                title: 'Demo Data Recharged',
                message: 'All Education cohorts, students, sessions, and attendance metrics refreshed.',
              });
            }}
            title="Reload realistic Algerian academy demo data"
          >
            <span className="hidden sm:inline">Demo Data</span>
          </AtriumButton>

          {/* CSV Export Button */}
          <AtriumButton
            variant="outline"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
          >
            <span className="hidden sm:inline">{t('common_export_csv') || 'Export CSV'}</span>
          </AtriumButton>

          <FilterSelect
            label={t('edu_label_cohort')}
            value={selectedCohortId}
            onChange={(val) => setSelectedCohortId(typeof val === 'string' ? val : val.target?.value || val)}
            options={eduCohorts.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.cohortCode || c.courseTitle})`,
            }))}
          />

          {activeTab === 'attendance' ? (
            <AtriumButton
              variant="primary"
              size="sm"
              glow
              icon={<CheckCircle2 size={15} />}
              onClick={() => setIsRollCallOpen(true)}
            >
              {t('edu_btn_roll_call')}
            </AtriumButton>
          ) : (
            <AtriumButton
              variant="primary"
              size="sm"
              glow
              icon={<Plus size={14} />}
              onClick={() => {
                setGradeForm((prev) => ({
                  ...prev,
                  studentId: cohortStudents[0]?.id || '',
                }));
                setIsGradeModalOpen(true);
              }}
            >
              {t('edu_btn_record_grade')}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('edu_kpi_cohort_att_rate')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {cohortAttRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('edu_verified_rate')}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('edu_kpi_active_roster')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {cohortStudents.length}
            </span>
            <span className="text-xs text-neutral-500">{t('edu_seats_of', { count: String(activeCohort?.maxStudents || 20) })}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('edu_kpi_academic_perf')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {avgGrade}%
            </span>
            <span className="text-xs text-neutral-500">{t('edu_avg_weighted')}</span>
          </div>
        </div>
      </div>

      {/* Segmented Mode Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t('edu_tab_rollcall')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gradebook')}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'gradebook'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t('edu_tab_gradebook')}
          </button>
        </div>

        <div className="w-full sm:w-72">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('edu_search_in_cohort')}
          />
        </div>
      </div>

      {/* Multi-Select Batch Action Toolbar for Attendance */}
      {selectedStudentIds.size > 0 && activeTab === 'attendance' && (
        <div className="sticky top-2 z-40 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-[#C4785A]/40 shadow-xl flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center">
              {selectedStudentIds.size}
            </span>
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
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
              onClick={() => setSelectedStudentIds(new Set())}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Content Section: UniversalDataCollection for Attendance */}
      {activeTab === 'attendance' ? (
        <UniversalDataCollection<EduStudent>
          items={filteredCohortStudents}
          columns={studentColumns}
          renderCard={renderStudentCard}
          keyExtractor={(st) => st.id}
          defaultViewMode="list"
          isPinned={(st) => pinnedStudentIds.has(st.id)}
          onTogglePin={togglePinStudent}
          selectedIds={selectedStudentIds}
          onSelectionChange={setSelectedStudentIds}
          emptyTitle="No learners in cohort"
          emptyDescription="No student records match the search criteria for this cohort"
          primaryActionLabel={t('edu_btn_roll_call')}
          onAddFirstItem={() => setIsRollCallOpen(true)}
        />
      ) : (
        /* Mode: Gradebook Matrix */
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-2xs">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">{t('edu_col_student')}</th>
                {assessmentTitles.map((title) => (
                  <th key={title} className="py-3.5 px-4">
                    {title}
                  </th>
                ))}
                <th className="py-3.5 px-4">{t('edu_avg_weighted')}</th>
                <th className="py-3.5 px-4 text-right rtl:text-left">{t('edu_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {cohortStudents.map((st) => {
                const studentGrades = cohortGrades.filter((g) => g.studentId === st.id);
                const totalScore = studentGrades.reduce(
                  (acc, g) => acc + (g.score / g.maxScore) * 100,
                  0
                );
                const avgScore =
                  studentGrades.length > 0 ? Math.round(totalScore / studentGrades.length) : 0;

                return (
                  <tr
                    key={st.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {st.fullName}
                      </div>
                      <div className="text-[10px] text-neutral-400">{st.schoolGrade || 'Standard'}</div>
                    </td>

                    {assessmentTitles.map((title) => {
                      const grade = studentGrades.find((g) => g.assessmentTitle === title);
                      return (
                        <td key={title} className="py-3.5 px-4 tabular-nums">
                          {grade ? (
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {grade.score} / {grade.maxScore}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
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
                        <span className="text-neutral-400 italic">—</span>
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
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
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

      {/* Record Grade Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('edu_grade_modal_title')}
              </h2>
              <button
                type="button"
                onClick={() => setIsGradeModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordGrade} className="space-y-4 pt-4 text-xs">
              <LabelSelect
                field="Student"
                label={t('edu_grade_student')}
                value={gradeForm.studentId}
                onChange={(val) => setGradeForm({ ...gradeForm, studentId: typeof val === 'string' ? val : val.target?.value || val })}
                options={cohortStudents.map((s) => ({
                  value: s.id,
                  label: s.fullName,
                }))}
                height={44}
                corner={14}
              />

              <div>
                <LabelInput
                  field="AssessmentTitle"
                  label={t('edu_grade_assessment')}
                  required
                  value={gradeForm.assessmentTitle}
                  onChange={(val) => setGradeForm({ ...gradeForm, assessmentTitle: String(val?.target?.value || val || '') })}
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
                    onChange={(val) => setGradeForm({ ...gradeForm, score: Number(val?.target?.value || val || 0) })}
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
                    onChange={(val) => setGradeForm({ ...gradeForm, maxScore: Number(val?.target?.value || val || 0) })}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('edu_grade_remarks')}
                </label>
                <textarea
                  rows={2}
                  value={gradeForm.teacherRemarks}
                  onChange={(e) => setGradeForm({ ...gradeForm, teacherRemarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                >
                  {t('common_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  type="submit"
                >
                  {t('edu_grade_save')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roll Call Modal */}
      {isRollCallOpen && (
        <RollCallModal
          cohortId={selectedCohortId}
          onClose={() => setIsRollCallOpen(false)}
        />
      )}
    </div>
  );
};
