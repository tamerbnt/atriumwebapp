import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Calendar,
  CheckCircle2,
  DollarSign,
  Clock,
  Plus,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  BookOpen,
  MapPin,
  Check,
  Building2,
  ChevronDown,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { RollCallModal } from './RollCallModal';
import { EduSession } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';

export const EducationDashboardView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBusiness,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    eduStudents,
    eduCohorts,
    eduSessions,
    eduEnrollments,
    eduAttendance,
    setScreen,
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

  const [activeRollCallSession, setActiveRollCallSession] = useState<EduSession | null>(null);
  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Computed metrics
  const activeStudentsCount = eduStudents.filter(
    (s) => s.status === 'Active' || s.status === 'Applicant'
  ).length;

  const todayIso = new Date().toISOString().split('T')[0];
  const todaySessions = eduSessions.filter((s) => s.date === todayIso || true).slice(0, 5);

  // Overall attendance rate calculation
  const totalAttendanceRecords = eduAttendance.length;
  const presentRecords = eduAttendance.filter(
    (a) => a.status === 'Present' || a.status === 'Late'
  ).length;
  const averageAttendanceRate =
    totalAttendanceRecords > 0
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 94;

  // Tuition metrics
  const totalBilled = eduEnrollments.reduce((acc, e) => acc + (e.agreedTuition || 0), 0);
  const totalPaid = eduEnrollments.reduce((acc, e) => acc + (e.paidAmount || 0), 0);
  const tuitionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  const outstandingTuition = totalBilled - totalPaid;

  // Attention Radar: Students with attendance < 85% or overdue tuition
  const studentsNeedingAttention = eduStudents.filter(
    (s) => s.attendanceRatePercent !== undefined && s.attendanceRatePercent < 85
  );

  const overdueEnrollments = eduEnrollments.filter(
    (e) => e.paymentStatus === 'Overdue' || (e.paymentStatus === 'Partial' && e.balanceDue > 0)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('nav_edu_dashboard')}
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#C4785A]/15 text-[#C4785A] uppercase tracking-wider">
              Category 15 · {t('onboard_categories_label')}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {currentBusiness?.displayName || 'Atlas Academy'} · {currentBranch?.name || 'Campus'} — {t('edu_timetable_subtitle')}
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

          {/* Demo Data Recharge Button */}
          <AtriumButton
            type="button"
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

          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            icon={<Calendar size={14} />}
            onClick={() => setScreen('scheduler')}
          >
            {t('nav_edu_timetable')}
          </AtriumButton>

          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setScreen('members')}
          >
            {t('edu_btn_new_student')}
          </AtriumButton>

          <AtriumButton
            type="button"
            variant="primary"
            size="sm"
            glow
            icon={<CheckCircle2 size={15} />}
            onClick={() => {
              setActiveRollCallSession(null);
              setIsRollCallOpen(true);
            }}
          >
            {t('edu_btn_roll_call')}
          </AtriumButton>
        </div>
      </div>

      {/* Row 1: 4 KPI Overview Strips matching other categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>{t('edu_kpi_total_students')}</span>
            <Users size={16} className="text-[#C4785A]" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight block">
              {activeStudentsCount}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
              {eduCohorts.length} {t('edu_kpi_active_cohorts')}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>{t('common_total')}</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {eduCohorts.reduce((sum, c) => sum + c.enrolledCount, 0)}
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>{t('edu_kpi_attendance_rate')}</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight block">
              {averageAttendanceRate}%
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium block mt-0.5">
              {presentRecords} {t('edu_roll_call_present')}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>{t('common_status')}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">&ge; 90%</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>{t('edu_kpi_tuition_collected')}</span>
            <DollarSign size={16} className="text-blue-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight block">
              {formatMoney(totalPaid)}
            </span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block mt-0.5">
              {tuitionRate}%
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>{t('edu_finance_title')}</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {formatMoney(totalBilled)}
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>{t('edu_kpi_pending_receivables')}</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight block">
              {formatMoney(outstandingTuition)}
            </span>
            <span className="text-[11px] text-rose-500 font-medium block mt-0.5">
              {overdueEnrollments.length} {t('edu_tuition_overdue')}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>{t('common_status')}</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{t('edu_tuition_partial')}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Today's Schedule Queue & Attention Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Scheduled Classes (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Calendar size={17} className="text-[#C4785A]" />
                {t('edu_kpi_today_classes')}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('edu_timetable_subtitle')}
              </p>
            </div>
            <button
              onClick={() => setScreen('scheduler')}
              className="text-xs font-medium text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {t('nav_edu_timetable')} <ArrowRight size={13} className={isRtl ? 'rotate-180' : ''} />
            </button>
          </div>

          <div className="space-y-3">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-2xs hover:border-[#C4785A]/40 transition-all flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex flex-col items-center justify-center text-xs font-bold shrink-0 border border-neutral-200 dark:border-neutral-700">
                    <span className="text-[#C4785A]">{session.startTime}</span>
                    <span className="text-[10px] font-normal text-neutral-400">
                      {session.endTime}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {session.cohortName}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {session.classroomName || 'Room A-101'}
                      </span>
                      <span>·</span>
                      <span>{session.instructorName}</span>
                    </div>
                    {session.topic && (
                      <div className="text-xs font-medium text-[#C4785A] mt-1">
                        {session.topic}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveRollCallSession(session);
                      setIsRollCallOpen(true);
                    }}
                    className="h-8 px-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    <span>{t('edu_btn_roll_call')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Attention Radar (1 col) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={17} className="text-rose-500" />
              {t('edu_attendance_title')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('edu_attendance_subtitle')}
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/40 shadow-2xs space-y-4">
            {/* Low Attendance Alert */}
            <div>
              <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                  <AlertCircle size={13} /> {t('edu_kpi_attendance_rate')} &lt; 85%
                </span>
                <span className="text-neutral-500 text-[11px]">{studentsNeedingAttention.length}</span>
              </div>
              <div className="space-y-2">
                {studentsNeedingAttention.slice(0, 3).map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-neutral-900 text-xs border border-neutral-200 dark:border-neutral-800 shadow-2xs"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {st.fullName}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {st.guardianName || 'Direct'}
                      </div>
                    </div>
                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums text-xs">
                      {st.attendanceRatePercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue Tuition Alert */}
            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
              <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                <span>{t('edu_kpi_pending_receivables')}</span>
                <span className="text-[#C4785A] font-extrabold">{formatMoney(outstandingTuition)}</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {overdueEnrollments.length} {t('edu_tuition_overdue')}
              </p>
              <button
                type="button"
                onClick={() => setScreen('finance')}
                className="mt-3 w-full py-2 text-xs font-semibold text-center text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                {t('edu_finance_title')} →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Active Cohort Capacity Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BookOpen size={17} className="text-[#C4785A]" />
              {t('edu_kpi_active_cohorts')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('edu_cohort_progress', 'Seat occupancy & milestones')}
            </p>
          </div>
          <button
            onClick={() => setScreen('shop')}
            className="text-xs font-medium text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {t('nav_edu_cohorts')} <ChevronRight size={14} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eduCohorts.map((cohort) => {
            const percent = Math.min(
              100,
              Math.round((cohort.enrolledCount / cohort.maxStudents) * 100)
            );
            return (
              <div
                key={cohort.id}
                className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-[#C4785A]/40 shadow-2xs transition-all space-y-3 cursor-pointer group"
                onClick={() => setScreen('shop')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-[#C4785A] uppercase tracking-wider block">
                      {cohort.cohortCode || cohort.courseTitle}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5 group-hover:text-[#C4785A] transition-colors">
                      {cohort.name}
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {cohort.status}
                  </span>
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {cohort.scheduleSummary} · {cohort.classroomName || 'Room 1'}
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {cohort.enrolledCount} of {cohort.maxStudents} Seats
                    </span>
                    <span className="text-[#C4785A] font-bold tabular-nums">
                      {percent}% Full
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-[#C4785A] rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roll Call Modal */}
      {isRollCallOpen && (
        <RollCallModal
          session={activeRollCallSession}
          onClose={() => {
            setIsRollCallOpen(false);
            setActiveRollCallSession(null);
          }}
        />
      )}
    </div>
  );
};
