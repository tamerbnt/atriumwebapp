import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Check,
  Calendar,
  Save,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { AttendanceStatus, EduSession } from '../../../types';
import { LabelSelect } from '../../ui/LabelSelect';

interface RollCallModalProps {
  session?: EduSession | null;
  cohortId?: string;
  onClose: () => void;
}

export const RollCallModal: React.FC<RollCallModalProps> = ({
  session,
  cohortId: propCohortId,
  onClose,
}) => {
  const {
    eduCohorts,
    eduSessions,
    eduStudents,
    eduEnrollments,
    eduAttendance,
    batchRecordAttendance,
    showToast,
    setScreen,
  } = useAtriumStore();

  const [selectedCohortId, setSelectedCohortId] = useState<string>(
    session?.cohortId || propCohortId || (eduCohorts[0]?.id || '')
  );

  const cohortSessions = eduSessions.filter((s) => s.cohortId === selectedCohortId);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    session?.id || cohortSessions[0]?.id || ''
  );

  // Get enrolled students for this cohort
  const enrolledStudentIds = eduEnrollments
    .filter((e) => e.cohortId === selectedCohortId && e.status === 'Active')
    .map((e) => e.studentId);

  const studentsInCohort = eduStudents.filter((s) =>
    enrolledStudentIds.includes(s.id)
  );

  // Prepopulate attendance state from existing attendance records if any, else default to Present
  const existingRecords = eduAttendance.filter(
    (a) => a.sessionId === selectedSessionId
  );

  const [rollState, setRollState] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        minutesLate?: number;
        excuseNote?: string;
      }
    >
  >(() => {
    const initial: Record<
      string,
      { status: AttendanceStatus; minutesLate?: number; excuseNote?: string }
    > = {};
    studentsInCohort.forEach((st) => {
      const existing = existingRecords.find((r) => r.studentId === st.id);
      if (existing) {
        initial[st.id] = {
          status: existing.status,
          minutesLate: existing.minutesLate,
          excuseNote: existing.excuseNote,
        };
      } else {
        initial[st.id] = { status: 'Present' };
      }
    });
    return initial;
  });

  const activeCohort = eduCohorts.find((c) => c.id === selectedCohortId);
  const activeSession = eduSessions.find((s) => s.id === selectedSessionId);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRollState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        minutesLate: status === 'Late' ? prev[studentId]?.minutesLate || 15 : undefined,
      },
    }));
  };

  const markAllPresent = () => {
    const updated: typeof rollState = {};
    studentsInCohort.forEach((st) => {
      updated[st.id] = { status: 'Present' };
    });
    setRollState(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedCohortId) return;

    const records = studentsInCohort.map((st) => {
      const entry = rollState[st.id] || { status: 'Present' as AttendanceStatus };
      return {
        studentId: st.id,
        studentName: st.fullName,
        status: entry.status,
        minutesLate: entry.minutesLate,
        excuseNote: entry.excuseNote,
      };
    });

    batchRecordAttendance(selectedSessionId, selectedCohortId, records);
    showToast({
      type: 'success',
      title: 'Roll Call Logged',
      message: `Attendance saved for ${activeCohort?.name || 'Cohort'} (${presentCount}/${studentsInCohort.length} present).`,
      category: 'education_cohort',
      action: {
        label: 'Gradebook',
        onClick: () => {
          setScreen('analytics');
        },
      },
    });
    onClose();
  };

  const presentCount = Object.values(rollState).filter(
    (e) => e.status === 'Present' || e.status === 'Late'
  ).length;
  const totalCount = studentsInCohort.length;
  const attendanceRate =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/60">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Roll Call Attendance
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {activeCohort?.name || 'Class Session'} · {activeSession?.date || 'Today'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters & Tally */}
        <div className="px-6 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <LabelSelect
              field="Cohort"
              label="Cohort"
              value={selectedCohortId}
              onChange={(val) => {
                const nextCohortId = val?.target?.value ?? String(val);
                setSelectedCohortId(nextCohortId);
                const nextCohortSessions = eduSessions.filter((s) => s.cohortId === nextCohortId);
                setSelectedSessionId(nextCohortSessions[0]?.id || '');
              }}
              options={eduCohorts.map((c) => ({
                value: c.id,
                label: c.name,
                sublabel: c.cohortCode || c.courseTitle,
              }))}
              width={220}
              height={40}
              corner={12}
            />

            <LabelSelect
              field="Session"
              label="Session"
              value={selectedSessionId}
              onChange={(val) => setSelectedSessionId(val?.target?.value ?? String(val))}
              options={cohortSessions.length === 0 ? [{ value: '', label: 'No sessions scheduled' }] : cohortSessions.map((s) => ({
                value: s.id,
                label: `${s.date} (${s.startTime} - ${s.endTime})`,
              }))}
              width={260}
              height={40}
              corner={12}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-neutral-500">
              Present: <strong className="text-emerald-600 font-bold">{presentCount}</strong> / {totalCount} ({attendanceRate}%)
            </span>
            <button
              type="button"
              onClick={markAllPresent}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer shadow-2xs"
            >
              Mark All Present
            </button>
          </div>
        </div>

        {/* Student Roster Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-2 text-xs">
          {studentsInCohort.map((student) => {
            const currentStatus = rollState[student.id]?.status || 'Present';

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
                    {student.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {student.fullName}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {student.guardianName ? `Guardian: ${student.guardianName}` : student.phone}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(student.id, st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        currentStatus === st
                          ? st === 'Present'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : st === 'Late'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : st === 'Absent'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {studentsInCohort.length === 0 && (
            <div className="py-12 text-center text-neutral-400 italic">
              No students enrolled in this cohort yet. Enroll students from the Students CRM directory.
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-neutral-900 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={studentsInCohort.length === 0}
              className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              Save Roll Call Records
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
