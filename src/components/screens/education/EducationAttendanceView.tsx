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

type ModeKey = 'attendance' | 'gradebook';

export const EducationAttendanceView: React.FC = () => {
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
              Roll Call Attendance & Gradebook
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {activeCohort?.name || 'Academic Cohort'} · {cohortStudents.length} learners
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time session roll call attendance matrix, academic evaluations, and weighted gradebook
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#C4785A] cursor-pointer shadow-2xs"
          >
            {eduCohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cohortCode || c.courseTitle})
              </option>
            ))}
          </select>

          {activeTab === 'attendance' ? (
            <button
              type="button"
              onClick={() => setIsRollCallOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <CheckCircle2 size={15} />
              <span>Take Roll Call</span>
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
              <span>Record Assessment Grade</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Cohort Attendance Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {cohortAttRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">verified rate</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Active Roster Enrolled
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {cohortStudents.length}
            </span>
            <span className="text-xs text-neutral-500">of {activeCohort?.maxStudents || 20} seats</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Academic Performance
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {avgGrade}%
            </span>
            <span className="text-xs text-neutral-500">average weighted score</span>
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
          Daily Roll Call Attendance Matrix
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
          Evaluations & Weighted Gradebook
        </button>
      </div>

      {/* Content Section */}
      {activeTab === 'attendance' ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Attendance Rate</th>
                <th className="py-3.5 px-4">Status Log</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {cohortStudents.map((st) => {
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
                            {rec.status}
                          </span>
                        ))}
                        {studentRecords.length === 0 && (
                          <span className="text-neutral-400 italic">No attendance logged yet</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setIsRollCallOpen(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Roll Call
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
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                {assessmentTitles.map((title) => (
                  <th key={title} className="py-3.5 px-4">
                    {title}
                  </th>
                ))}
                <th className="py-3.5 px-4">Weighted Average</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
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
                        <span className="text-neutral-400 italic">Not graded</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
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
                        Enter Grade
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
                Record Assessment Grade
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
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Student *
                </label>
                <select
                  required
                  value={gradeForm.studentId}
                  onChange={(e) => setGradeForm({ ...gradeForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                >
                  {cohortStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  required
                  value={gradeForm.assessmentTitle}
                  onChange={(e) => setGradeForm({ ...gradeForm, assessmentTitle: e.target.value })}
                  placeholder="e.g. Midterm Exam, Project 1, Final Defense"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Student Score *
                  </label>
                  <input
                    type="number"
                    required
                    value={gradeForm.score}
                    onChange={(e) => setGradeForm({ ...gradeForm, score: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Max Possible Score *
                  </label>
                  <input
                    type="number"
                    required
                    value={gradeForm.maxScore}
                    onChange={(e) => setGradeForm({ ...gradeForm, maxScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Teacher Remarks / Feedback
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save Grade
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
