import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Search,
  BookOpen,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { EduSession } from '../../../types';
import { RollCallModal } from './RollCallModal';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';

export const EducationTimetableView: React.FC = () => {
  const {
    eduSessions,
    eduCohorts,
    eduClassrooms,
    staff,
    addEduSession,
    deleteEduSession,
  } = useAtriumStore();

  const [selectedCohortId, setSelectedCohortId] = useState<string>('all');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<EduSession | null>(null);
  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [rollCallSession, setRollCallSession] = useState<EduSession | null>(null);

  // New session form state
  const [formData, setFormData] = useState({
    cohortId: eduCohorts[0]?.id || '',
    classroomId: eduClassrooms[0]?.id || '',
    instructorId: staff[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    topic: '',
  });

  const [sessionSearch, setSessionSearch] = useState('');

  // Filtered sessions
  const filteredSessions = eduSessions.filter((s) => {
    if (selectedCohortId !== 'all' && s.cohortId !== selectedCohortId) return false;
    if (selectedClassroomId !== 'all' && s.classroomId !== selectedClassroomId) return false;
    if (sessionSearch.trim()) {
      const q = sessionSearch.toLowerCase();
      const match =
        (s.topic || '').toLowerCase().includes(q) ||
        (s.instructorName || '').toLowerCase().includes(q) ||
        (s.cohortName || '').toLowerCase().includes(q) ||
        (s.classroomName || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Conflict detection: sessions with overlapping time in same classroom or with same instructor
  const conflicts = new Set<string>();
  for (let i = 0; i < filteredSessions.length; i++) {
    for (let j = i + 1; j < filteredSessions.length; j++) {
      const a = filteredSessions[i];
      const b = filteredSessions[j];
      if (a.date === b.date) {
        const isOverlap = a.startTime < b.endTime && b.startTime < a.endTime;
        if (isOverlap) {
          if (
            (a.classroomId && a.classroomId === b.classroomId) ||
            (a.instructorId && a.instructorId === b.instructorId)
          ) {
            conflicts.add(a.id);
            conflicts.add(b.id);
          }
        }
      }
    }
  }

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const cohort = eduCohorts.find((c) => c.id === formData.cohortId);
    const room = eduClassrooms.find((r) => r.id === formData.classroomId);
    const instructor = staff.find((s) => s.id === formData.instructorId);

    if (!cohort) return;

    addEduSession({
      cohortId: cohort.id,
      cohortName: cohort.name,
      classroomId: room?.id,
      classroomName: room?.name,
      instructorId: instructor?.id || cohort.instructorId,
      instructorName: instructor?.fullName || cohort.instructorName,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      topic: formData.topic || undefined,
      status: 'Scheduled',
    });

    setIsAddSessionModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Master Timetable & Classrooms
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {eduSessions.length} total scheduled slots · {eduClassrooms.length} campus rooms
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Conflict-free room scheduling, instructor timetables, and real-time session roll calls
          </p>
        </div>

        <div className="flex items-center gap-3">
          {conflicts.size > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-semibold">
              <AlertTriangle size={14} />
              <span>{conflicts.size} Schedule Clash Detected</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsAddSessionModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* Filter and Selection Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Cohort:</span>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C4785A] cursor-pointer"
            >
              <option value="all">All Cohorts ({eduCohorts.length})</option>
              {eduCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Classroom:</span>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C4785A] cursor-pointer"
            >
              <option value="all">All Rooms ({eduClassrooms.length})</option>
              {eduClassrooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Cap: {r.capacity})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={sessionSearch}
            onChange={setSessionSearch}
            placeholder="Search topic, coach, room..."
            openWidth={240}
            shutSize={38}
          />
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Showing {filteredSessions.length} session slots
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div>
        {filteredSessions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA]/50 dark:bg-neutral-900/20">
            <CalendarIcon size={36} className="mx-auto mb-2 text-neutral-400 opacity-50" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No scheduled sessions found
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Click "Schedule Session" above to add new timetable entries.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSessions.map((session) => {
              const hasConflict = conflicts.has(session.id);
              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionForDetail(session)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-2xs flex flex-col justify-between ${
                    hasConflict
                      ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-[#C4785A]/40'
                  }`}
                >
                  <div>
                    {/* Top Row: Time Badge & Conflict Flag */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold font-mono">
                        <Clock size={13} className="text-[#C4785A]" />
                        <span>
                          {session.startTime} - {session.endTime}
                        </span>
                      </div>

                      {hasConflict ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <AlertTriangle size={13} />
                          Room Conflict
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                          {session.date}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-[#C4785A] transition-colors">
                      {session.cohortName}
                    </h3>

                    {session.topic && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2">
                        {session.topic}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-neutral-400 shrink-0" />
                        <span className="truncate">{session.classroomName || 'Room A-101'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-neutral-400 shrink-0" />
                        <span className="truncate">Instructor: {session.instructorName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {session.status}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRollCallSession(session);
                        setIsRollCallOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Roll Call</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Session Modal */}
      {isAddSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Schedule Classroom Session
              </h2>
              <button
                type="button"
                onClick={() => setIsAddSessionModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Target Cohort *
                </label>
                <select
                  required
                  value={formData.cohortId}
                  onChange={(e) => setFormData({ ...formData, cohortId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                >
                  {eduCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cohortCode || c.courseTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Classroom
                  </label>
                  <select
                    value={formData.classroomId}
                    onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  >
                    {eduClassrooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Cap: {r.capacity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Instructor
                  </label>
                  <select
                    value={formData.instructorId}
                    onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <LabelInput
                id="session-date"
                label="Session Date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="session-start-time"
                  label="Start Time"
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
                <LabelInput
                  id="session-end-time"
                  label="End Time"
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>

              <LabelInput
                id="session-topic"
                label="Topic / Lesson Plan Summary"
                placeholder="e.g. Chapter 4: Calculus Limits & Functions"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save Timetable Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roll Call Modal */}
      {isRollCallOpen && (
        <RollCallModal
          session={rollCallSession}
          onClose={() => {
            setIsRollCallOpen(false);
            setRollCallSession(null);
          }}
        />
      )}
    </div>
  );
};
