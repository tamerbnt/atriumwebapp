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
  Home,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { EduSession } from '../../../types';
import { RollCallModal } from './RollCallModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';

export const EducationTimetableView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    eduSessions,
    eduCohorts,
    eduClassrooms,
    staff,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    addEduSession,
    deleteEduSession,
  } = useAtriumStore();

  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
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
      {/* Outer Rounded Workspace Panel (WPF Spec: CornerRadius 28px, 1px CardBorderBrush) */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Row 0 — Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <CalendarIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {t('edu_timetable_title')}
                </h1>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {eduSessions.length} total slots · {eduClassrooms.length} campus rooms
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('edu_timetable_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill: Atlas Academy ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Campus 1'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Facility Dropdown Menu */}
              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Centres & Campus
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
                          <span className="truncate">{biz.name}</span>
                        </div>
                        {isCurrent && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Conflict Alert Capsule */}
            {conflicts.size > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 text-xs font-semibold">
                <AlertTriangle size={14} />
                <span>{conflicts.size} Conflits détectés</span>
              </div>
            )}

            {/* New Session Button */}
            <AtriumButton
              variant="primary"
              size="sm"
              glow
              icon={<Plus size={14} />}
              onClick={() => setIsAddSessionModalOpen(true)}
            >
              {t('edu_btn_add_session')}
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (Screenshot_30: bg-[#F8F9FA], rounded-[24px], p-5) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white tracking-tight">
              Planning & Utilisation des Espaces
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Disponibilité des salles, rotation des formateurs et intégrité du calendrier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Inset White Card 1: Total Slots */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                  Séances Planifiées
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ↗ {filteredSessions.length} actives
                </span>
              </div>
              <div className="mt-3">
                <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                  {eduSessions.length}
                </span>
                <span className="text-xs text-neutral-400 ml-1">créneaux programmés</span>
              </div>
            </div>

            {/* Inset White Card 2: Classrooms Active */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                  Salles & Ateliers
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  100% opérationnelles
                </span>
              </div>
              <div className="mt-3">
                <span className="text-[22px] font-bold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                  {eduClassrooms.length}
                </span>
                <span className="text-xs text-neutral-400 ml-1">espaces d'enseignement</span>
              </div>
            </div>

            {/* Inset Card 3: DARK ESPRESSO CARD (#1F1D1B) — Conflict & Integrity Monitor */}
            <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm flex flex-col justify-between text-white">
              <div>
                <span className="text-[11px] font-medium text-neutral-400 block mb-1">
                  Intégrité des Horaires
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 inline-block">
                  {conflicts.size > 0 ? `${conflicts.size} Conflits Détectés` : 'Aucun Chevauchement'}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-[22px] font-bold text-white tabular-nums tracking-tight">
                  {conflicts.size === 0 ? 'Optimal' : `${conflicts.size} Alertes`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Pod Tray (Screenshot_30: bg-[#F8F9FA], rounded-[24px], p-5) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Integrated Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-neutral-700 dark:text-neutral-300" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Grille des Séances
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                {filteredSessions.length}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <FilterSelect
                label={t('edu_label_cohort')}
                value={selectedCohortId}
                onChange={(val) => setSelectedCohortId(val?.target?.value ?? String(val))}
                options={[
                  { value: 'all', label: `All Cohorts (${eduCohorts.length})` },
                  ...eduCohorts.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />

              <FilterSelect
                label={t('edu_field_classroom')}
                value={selectedClassroomId}
                onChange={(val) => setSelectedClassroomId(val?.target?.value ?? String(val))}
                options={[
                  { value: 'all', label: `All Rooms (${eduClassrooms.length})` },
                  ...eduClassrooms.map((r) => ({
                    value: r.id,
                    label: `${r.name} (Cap: ${r.capacity})`,
                  })),
                ]}
              />

              <Seek
                value={sessionSearch}
                onChange={setSessionSearch}
                placeholder="Search topic, coach, room..."
                openWidth={220}
                shutSize={36}
              />
            </div>
          </div>

          {/* Schedule Grid */}
          <div>
            {filteredSessions.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                <CalendarIcon size={36} className="mx-auto mb-2 text-neutral-400 opacity-50" />
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  No scheduled sessions found
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Click "{t('edu_btn_add_session')}" above to add new timetable entries.
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
                      className={`p-5 rounded-[18px] border transition-all cursor-pointer relative overflow-hidden group shadow-2xs flex flex-col justify-between ${
                        hasConflict
                          ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20'
                          : 'border-[#E9EEF0] dark:border-neutral-800 bg-white dark:bg-neutral-800 hover:border-[#C4785A]/40'
                      }`}
                    >
                      <div>
                        {/* Top Row: Time Badge & Conflict Flag */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold font-mono">
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

                        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/80 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-neutral-400 shrink-0" />
                            <span className="truncate">{session.classroomName || 'Room A-101'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-neutral-400 shrink-0" />
                            <span className="truncate">{t('edu_field_instructor')}: {session.instructorName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Action */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700/80 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          {session.status}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRollCallSession(session);
                            setIsRollCallOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-[#C4785A] hover:text-white text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          <span>{t('edu_btn_roll_call')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Session Modal */}
      {isAddSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('edu_session_modal_title')}
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
              <LabelSelect
                field="Cohort"
                label={t('edu_label_cohort')}
                value={formData.cohortId}
                onChange={(val) => setFormData({ ...formData, cohortId: typeof val === 'string' ? val : val.target?.value || val })}
                options={eduCohorts.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.cohortCode || c.courseTitle})`,
                }))}
                height={44}
                corner={14}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  field="Classroom"
                  label={t('edu_field_classroom')}
                  value={formData.classroomId}
                  onChange={(val) => setFormData({ ...formData, classroomId: typeof val === 'string' ? val : val.target?.value || val })}
                  options={eduClassrooms.map((r) => ({
                    value: r.id,
                    label: `${r.name} (Cap: ${r.capacity})`,
                  }))}
                  height={44}
                  corner={14}
                />
                <LabelSelect
                  field="Instructor"
                  label={t('edu_field_instructor')}
                  value={formData.instructorId}
                  onChange={(val) => setFormData({ ...formData, instructorId: typeof val === 'string' ? val : val.target?.value || val })}
                  options={staff.map((s) => ({
                    value: s.id,
                    label: `${s.fullName} (${s.role})`,
                  }))}
                  height={44}
                  corner={14}
                />
              </div>

              <LabelInput
                id="session-date"
                label={t('edu_field_session_date')}
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="session-start-time"
                  label={t('edu_field_session_start')}
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
                <LabelInput
                  id="session-end-time"
                  label={t('edu_field_session_end')}
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>

              <LabelInput
                id="session-topic"
                label={t('edu_field_session_topic')}
                placeholder="e.g. Chapter 4: Calculus Limits & Functions"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                >
                  {t('common_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  type="submit"
                >
                  {t('edu_btn_save_session')}
                </AtriumButton>
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
