import React, { useState, useEffect, useCallback } from 'react';
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
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentEduCohortsFromState,
  selectCurrentEduSessionsFromState,
  selectCurrentEduStudentsFromState,
  selectCurrentEduEnrollmentsFromState,
  selectCurrentEduAttendanceFromState,
  useAtriumActions,
} from '../../../services/store';
import { AttendanceStatus, EduSession } from '../../../types';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Button } from '@/atrium/core';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

interface RollCallModalProps {
  isOpen?: boolean;
  session?: EduSession | null;
  cohortId?: string;
  onClose: () => void;
}

export const RollCallModal: React.FC<RollCallModalProps> = ({
  isOpen = true,
  session,
  cohortId: propCohortId,
  onClose,
}) => {
  const { t } = useTranslation();
  const { eduCohorts, eduSessions, eduStudents, eduEnrollments, eduAttendance } = useAtriumSelector(
    (s) => ({
      eduCohorts: selectCurrentEduCohortsFromState(s),
      eduSessions: selectCurrentEduSessionsFromState(s),
      eduStudents: selectCurrentEduStudentsFromState(s),
      eduEnrollments: selectCurrentEduEnrollmentsFromState(s),
      eduAttendance: selectCurrentEduAttendanceFromState(s),
    }),
    shallowEqualObjects
  );
  const { batchRecordAttendance } = useAtriumActions();

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

  const buildRollStateForSession = useCallback(
    (targetCohortId: string, targetSessionId: string) => {
      const targetEnrolledIds = eduEnrollments
        .filter((e) => e.cohortId === targetCohortId && e.status === 'Active')
        .map((e) => e.studentId);
      const targetStudents = eduStudents.filter((s) => targetEnrolledIds.includes(s.id));
      const targetExisting = eduAttendance.filter((a) => a.sessionId === targetSessionId);
      const initial: Record<
        string,
        { status: AttendanceStatus; minutesLate?: number; excuseNote?: string }
      > = {};
      targetStudents.forEach((st) => {
        const existing = targetExisting.find((r) => r.studentId === st.id);
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
    },
    [eduEnrollments, eduStudents, eduAttendance]
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
  >(() => buildRollStateForSession(selectedCohortId, selectedSessionId));

  useEffect(() => {
    if (!isOpen) return;
    const nextCohortId = session?.cohortId || propCohortId || (eduCohorts[0]?.id || '');
    const nextCohortSessions = eduSessions.filter((s) => s.cohortId === nextCohortId);
    const nextSessionId = session?.id || nextCohortSessions[0]?.id || '';
    setSelectedCohortId(nextCohortId);
    setSelectedSessionId(nextSessionId);
    setRollState(buildRollStateForSession(nextCohortId, nextSessionId));
  }, [isOpen, session, propCohortId]);

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

  const presentCount = Object.values(rollState).filter(
    (e) => e.status === 'Present' || e.status === 'Late'
  ).length;
  const totalCount = studentsInCohort.length;
  const attendanceRate =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

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
    onClose();
  };

  const getStatusLabel = (st: AttendanceStatus) => {
    switch (st) {
      case 'Present':
        return t('edu_roll_call_present');
      case 'Late':
        return t('edu_roll_call_late');
      case 'Absent':
        return t('edu_roll_call_absent');
      case 'Excused':
        return t('edu_roll_call_excused');
    }
  };

  return (
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-2xl" zIndexClass="z-[9990]">
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--atr-divider)] bg-[#F3EDE7] dark:bg-[#22201E]">
          <h2 className="t-card font-semibold text-black dark:text-white">
            {t('edu_roll_call_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters & Tally */}
        <div className="px-6 py-3 border-b border-[var(--atr-divider)] bg-white dark:bg-[#22201E] flex flex-wrap items-center justify-between gap-3 t-cap">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-[260px]">
            <LabelSelect
              field="Cohort"
              label={t('edu_label_cohort')}
              value={selectedCohortId}
              onChange={(nextCohortId) => {
                setSelectedCohortId(nextCohortId);
                const nextCohortSessions = eduSessions.filter((s) => s.cohortId === nextCohortId);
                const nextSessionId = nextCohortSessions[0]?.id || '';
                setSelectedSessionId(nextSessionId);
                setRollState(buildRollStateForSession(nextCohortId, nextSessionId));
              }}
              options={eduCohorts.map((c) => ({
                value: c.id,
                label: c.name,
                sublabel: c.cohortCode || c.courseTitle,
              }))}
              width="100%"
              height={40}
              corner={12}
            />

            <LabelSelect
              field="Session"
              label={t('edu_label_session')}
              value={selectedSessionId}
              onChange={(nextSessionId) => {
                setSelectedSessionId(nextSessionId);
                setRollState(buildRollStateForSession(selectedCohortId, nextSessionId));
              }}
              options={
                cohortSessions.length === 0
                  ? [{ value: '', label: t('edu_no_sessions') }]
                  : cohortSessions.map((s) => ({
                      value: s.id,
                      label: `${s.date} (${s.startTime} - ${s.endTime})`,
                    }))
              }
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-black/70 dark:text-white/75">
              {t('edu_present_tally', {
                present: String(presentCount),
                total: String(totalCount),
                rate: String(attendanceRate),
              })}
            </span>
            <Button
              type="button"
              tone="soft"
              size={36}
              onClick={markAllPresent}
            >
              {t('edu_mark_all_present')}
            </Button>
          </div>
        </div>

        {/* Student Roster Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 t-cap">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {studentsInCohort.map((student) => {
              const currentStatus = rollState[student.id]?.status || 'Present';

              return (
                <div
                  key={student.id}
                  data-sq="card"
                  data-sq-border="solid"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-white dark:bg-[#22201E] hover:[--sq-stroke:rgba(212,82,47,0.45)] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      data-sq="ctl-sm"
                      data-sq-border="solid"
                      className="w-8 h-8 bg-neutral-100 dark:bg-[#2B2825] text-black dark:text-white flex items-center justify-center font-semibold t-small shrink-0"
                    >
                      {student.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-black dark:text-white truncate">
                        {student.fullName}
                      </div>
                      <div className="t-cap text-black/55 dark:text-white/55 truncate">
                        {student.guardianName
                          ? t('edu_guardian_prefix', { name: student.guardianName })
                          : student.phone}
                      </div>
                    </div>
                  </div>

                  <LiveSegmentedControl
                    size="sm"
                    value={currentStatus}
                    onChange={(val) => handleStatusChange(student.id, val as AttendanceStatus)}
                    aria-label={student.fullName}
                    options={(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map((st) => ({
                      value: st,
                      label: getStatusLabel(st),
                    }))}
                  />
                </div>
              );
            })}

            {studentsInCohort.length === 0 && (
              <div className="py-12 text-center text-black/55 dark:text-white/55 italic">
                {t('edu_no_students_enrolled')}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="px-6 py-4 border-t border-[var(--atr-divider)] flex items-center justify-end gap-2.5 bg-white dark:bg-[#262422]">
            <Button
              tone="soft"
              size={40}
              type="button"
              onClick={onClose}
            >
              {t('common_cancel')}
            </Button>
            <Button
              tone="accent"
              size={40}
              type="submit"
              disabled={studentsInCohort.length === 0}
            >
              {t('edu_save_roll_call')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};
