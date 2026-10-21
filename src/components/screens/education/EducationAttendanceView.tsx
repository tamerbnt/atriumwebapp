import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RollCallModal } from './RollCallModal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { useTranslation } from '../../../utils/useTranslation';

type ModeKey = 'attendance' | 'gradebook';

export const EducationAttendanceView: React.FC = () => {
  const { t, isRtl } = useTranslation();
  const {
    eduCohorts,
    eduSessions,
    eduStudents,
    eduEnrollments,
    eduAttendance,
    eduGrades,
    recordEduGrade,
    deleteEduGrade,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<ModeKey>('attendance');
  const [selectedCohortId, setSelectedCohortId] = useState<string>(
    eduCohorts[0]?.id || ''
  );
  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Grade Form State
  const [gradeForm, setGradeForm] = useState({
    studentId: '',
    assessmentTitle: 'Midterm Evaluation',
    score: 85,
    maxScore: 100,
    weightPercent: 30,
    teacherRemarks: 'Excellent analytical reasoning and code quality.',
  });

  const activeCohort = eduCohorts.find((c) => c.id === selectedCohortId);

  // Enrolled students in this cohort
  const cohortEnrollments = eduEnrollments.filter(
    (e) => e.cohortId === selectedCohortId && e.status === 'Active'
  );
  const cohortStudentIds = cohortEnrollments.map((e) => e.studentId);
  const cohortStudents = eduStudents.filter((s) => cohortStudentIds.includes(s.id));

  const filteredCohortStudents = React.useMemo(() => {
    if (!searchQuery.trim()) return cohortStudents;
    const q = searchQuery.toLowerCase();
    return cohortStudents.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.phone?.includes(q)
    );
  }, [cohortStudents, searchQuery]);

  // Attendance for this cohort
  const cohortAttendance = eduAttendance.filter((a) => a.cohortId === selectedCohortId);

  // Grades for this cohort
  const cohortGrades = eduGrades.filter((g) => g.cohortId === selectedCohortId);

  // Distinct assessment titles in this cohort
  const assessmentTitles = Array.from(
    new Set(cohortGrades.map((g) => g.assessmentTitle))
  );

  const handleRecordGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const student = eduStudents.find((s) => s.id === gradeForm.studentId);
    if (!student || !selectedCohortId) return;

    recordEduGrade({
      cohortId: selectedCohortId,
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

        <div className="flex items-center gap-2.5 flex-wrap">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('edu_search_in_cohort')}
          />
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
            <button
              type="button"
              onClick={() => setIsRollCallOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <CheckCircle2 size={15} />
              <span>{t('edu_btn_roll_call')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setGradeForm((prev) => ({
                  ...prev,
                  studentId: cohortStudents[0]?.id || '',
                }));
                setIsGradeModalOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>{t('edu_btn_record_grade')}</span>
            </button>
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

      {/* Segmented Mode Switcher */}
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

      {/* Content Section */}
      {activeTab === 'attendance' ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-2xs">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">{t('edu_col_student')}</th>
                <th className="py-3.5 px-4">{t('edu_col_attendance')}</th>
                <th className="py-3.5 px-4">{t('common_status')}</th>
                <th className="py-3.5 px-4 text-right rtl:text-left">{t('edu_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {filteredCohortStudents.map((st) => {
                const studentRecords = cohortAttendance.filter((a) => a.studentId === st.id);
                const presents = studentRecords.filter((a) => a.status === 'Present' || a.status === 'Late').length;
                const total = studentRecords.length;
                const rate = total > 0 ? Math.round((presents / total) * 100) : (st.attendanceRatePercent ?? 95);

                return (
                  <tr
                    key={st.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
                          {st.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {st.fullName}
                          </div>
                          <div className="text-[11px] text-neutral-400">{st.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              rate >= 85 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                          {rate}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
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
                          <span className="text-neutral-400 italic">{t('edu_no_sessions')}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right rtl:text-left">
                      <button
                        type="button"
                        onClick={() => setIsRollCallOpen(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {t('edu_btn_roll_call')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
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
                      <div className="text-[10px] text-neutral-400">{st.schoolGrade}</div>
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
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_grade_save')}
                </button>
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
