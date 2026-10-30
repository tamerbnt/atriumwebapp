import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Search,
  Users,
  Phone,
  Send,
  Lock,
  Unlock,
  Sparkles,
  Printer,
  RotateCcw,
  ChevronDown,
  Check,
  MessageCircle,
  HelpCircle,
  BookOpen,
  MapPin,
  CalendarDays,
  FileCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { EduSession, EduStudent, EduCohort, EduQuickAttendanceRecord } from '../../../types/index';
import { PinVerificationModal } from '../../modals/PinVerificationModal';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';

export const AcademyRollCallKiosk: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    eduSessions,
    eduCohorts,
    eduStudents,
    eduEnrollments,
    eduAttendance,
    eduQuickAttendance,
    recordQuickAttendance,
    currentUser,
    currentBranch,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: eduStudents.length > 0 || eduSessions.length > 0,
  });

  // Pick first available or today's session
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return eduSessions[0]?.id || '';
  });

  const activeSession = useMemo(() => {
    return eduSessions.find((s) => s.id === selectedSessionId) || eduSessions[0] || null;
  }, [eduSessions, selectedSessionId]);

  const activeCohort = useMemo(() => {
    if (!activeSession) return null;
    return eduCohorts.find((c) => c.id === activeSession.cohortId) || null;
  }, [activeSession, eduCohorts]);

  // Students enrolled in this cohort
  const enrolledStudents = useMemo(() => {
    if (!activeSession) return [];
    const enrollments = eduEnrollments.filter((e) => e.cohortId === activeSession.cohortId && e.status === 'Active');
    if (enrollments.length > 0) {
      const studentIds = new Set(enrollments.map((e) => e.studentId));
      return eduStudents.filter((s) => studentIds.has(s.id));
    }
    // Fallback: Show students matching this facility
    return eduStudents.slice(0, 15);
  }, [activeSession, eduEnrollments, eduStudents]);

  // Attendance local state map
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; note?: string; time?: string }>
  >({});

  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [lockedTimestamp, setLockedTimestamp] = useState<string | null>(null);
  const [lockedByStaff, setLockedByStaff] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pedagogyTopic, setPedagogyTopic] = useState('');
  const [homeworkNotes, setHomeworkNotes] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Absent student guardian notification modal
  const [notifyingStudent, setNotifyingStudent] = useState<EduStudent | null>(null);

  // Initialize or hydrate attendance map when session changes
  useEffect(() => {
    if (!activeSession) return;

    // Check if session has previous records in eduQuickAttendance
    const existingRecords = eduQuickAttendance.filter((r) => r.sessionId === activeSession.id);
    if (existingRecords.length > 0) {
      const initialMap: Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; note?: string }> = {};
      let locked = false;
      let lastLockedTime = '';
      let staffSig = '';

      existingRecords.forEach((r) => {
        initialMap[r.studentId] = { status: r.status };
        if (r.isLocked) {
          locked = true;
          lastLockedTime = r.markedAt;
          staffSig = r.markedByStaffId;
        }
      });

      setAttendanceMap(initialMap);
      setIsSessionLocked(locked);
      setLockedTimestamp(lastLockedTime ? new Date(lastLockedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
      setLockedByStaff(staffSig || currentUser?.fullName || 'Professeur');
    } else {
      // Default: empty or pre-fill with present
      const defaultMap: Record<string, { status: 'present' | 'absent' | 'late' | 'excused' }> = {};
      enrolledStudents.forEach((s) => {
        defaultMap[s.id] = { status: 'present' };
      });
      setAttendanceMap(defaultMap);
      setIsSessionLocked(false);
      setLockedTimestamp(null);
    }
    setPedagogyTopic(activeSession.topic || '');
  }, [activeSession?.id, enrolledStudents.length]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrolledStudents;
    const q = searchQuery.toLowerCase().trim();
    return enrolledStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.guardianPhone && s.guardianPhone.includes(q)) ||
        s.id.toLowerCase().includes(q)
    );
  }, [enrolledStudents, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = enrolledStudents.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    enrolledStudents.forEach((s) => {
      const record = attendanceMap[s.id];
      const st = record?.status || 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else if (st === 'excused') excused++;
    });

    const ratePercent = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { total, present, absent, late, excused, ratePercent };
  }, [enrolledStudents, attendanceMap]);

  // Mark all present in 1 tap
  const handleMarkAllPresent = () => {
    if (isSessionLocked) return;
    const updated: Record<string, { status: 'present' | 'absent' | 'late' | 'excused' }> = {};
    enrolledStudents.forEach((s) => {
      updated[s.id] = { status: 'present' };
    });
    setAttendanceMap(updated);
    showToast({
      type: 'info',
      title: isRtl ? 'تم تحديد جميع الطلاب حاضرين' : 'Tous marqués présents',
      message: isRtl ? 'يمكنك الآن تحديد الغائبين بشكل فردي بلمسة واحدة' : 'Vous pouvez marquer les éventuels absents d\'un clic.',
    });
  };

  // Toggle individual status
  const handleSetStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    if (isSessionLocked) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Submit and lock roll-call
  const handleSubmitRollCall = () => {
    if (!activeSession) return;

    const now = new Date().toISOString();
    const staffId = currentUser?.id || 'instructor_01';

    enrolledStudents.forEach((s) => {
      const current = attendanceMap[s.id] || { status: 'present' };
      recordQuickAttendance({
        sessionId: activeSession.id,
        cohortId: activeSession.cohortId,
        studentId: s.id,
        studentName: s.fullName,
        status: current.status,
        markedAt: now,
        markedByStaffId: currentUser?.fullName || staffId,
        isLocked: true,
      });
    });

    setIsSessionLocked(true);
    setLockedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLockedByStaff(currentUser?.fullName || 'Enseignant');

    showToast({
      type: 'success',
      title: isRtl ? 'تم تسجيل وتأكيد الحضور بنجاح' : 'Appel Validé & Verrouillé',
      message: isRtl
        ? `تم قفل الحصة بمعدل حضور ${stats.ratePercent}% (${stats.present} حاضرين، ${stats.absent} غائبين)`
        : `Feuille d'émargement verrouillée : ${stats.ratePercent}% de présence (${stats.present} P, ${stats.absent} A).`,
    });
  };

  // WhatsApp / SMS Absentee notification prompt
  const handleSendGuardianAlert = (student: EduStudent) => {
    const parentPhone = student.guardianPhone || student.phone;
    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    const sessionTime = `${activeSession?.startTime || '09:00'} - ${activeSession?.endTime || '11:00'}`;
    const cohortName = activeCohort?.name || activeSession?.cohortName || 'Cours Académie';

    const text = isRtl
      ? `السلام عليكم، نعلمكم بغياب الطالب(ة) ${student.fullName} اليوم في حصة [${cohortName}] المنعقدة في الفترة (${sessionTime}). يرجى التواصل مع إدارة المركز للتبرير.`
      : `Bonjour, l'administration de l'académie vous informe de l'absence de l'étudiant(e) ${student.fullName} aujourd'hui pour la séance de [${cohortName}] (${sessionTime}). Merci de contacter la scolarité pour régulariser.`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/213${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
    setNotifyingStudent(null);
  };

  if (showSkeleton && (eduSessions.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
          <SkeletonKioskGrid count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      {/* Top Banner & Session Picker Pod Tray */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center shrink-0">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {isRtl ? 'كشك تسجيل حضور الدروس السريع' : 'Kiosk Appel & Émargement Express'}
                </h1>
                <span className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isRtl ? 'وضع الأستاذ / المنسق' : 'Espace Instructeur'}
                </span>
                {isSessionLocked && (
                  <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1">
                    <Lock size={12} />
                    {isRtl ? `مغلق (${lockedTimestamp})` : `Verrouillé à ${lockedTimestamp}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isRtl
                  ? 'تسجيل الحضور الفوري بلمسة واحدة بدون إظهار أي ديون أو مبالغ مالية'
                  : 'Pointage tactile haute vitesse en 1 clic sans aucune exposition des créances ou scolarités'}
              </p>
            </div>
          </div>

          {/* Session Selector & Lock Action */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="min-w-[240px]">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                {eduSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.startTime} - {s.endTime} · {s.cohortName} ({s.classroomName || 'Salle'})
                  </option>
                ))}
              </select>
            </div>

            {isSessionLocked ? (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="h-10 px-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 cursor-pointer shadow-xs"
              >
                <Unlock size={14} />
                <span>{isRtl ? 'إلغاء القفل (PIN)' : 'Déverrouiller (PIN)'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitRollCall}
                className="h-10 px-4 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{isRtl ? 'تأكيد وقفل ورقة الحضور' : 'Valider & Verrouiller l\'Appel'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Session Details Bar */}
        {activeSession && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[#C4785A] shrink-0" />
              <div>
                <span className="text-2xs text-neutral-400 block">{isRtl ? 'الفوج / الدورة' : 'Promotion'}</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                  {activeCohort?.name || activeSession.cohortName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600 shrink-0" />
              <div>
                <span className="text-2xs text-neutral-400 block">{isRtl ? 'القاعة' : 'Salle'}</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {activeSession.classroomName || 'Salle Polyvalente'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600 shrink-0" />
              <div>
                <span className="text-2xs text-neutral-400 block">{isRtl ? 'التوقيت' : 'Horaires'}</span>
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  {activeSession.startTime} — {activeSession.endTime}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-2xs text-neutral-400 block">{isRtl ? 'الأستاذ المعين' : 'Formateur'}</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                  {activeSession.instructorName || currentUser?.fullName || 'Professeur Titulaire'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendance KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <span className="text-2xs text-neutral-400 font-bold uppercase tracking-wider block">
            {isRtl ? 'إجمالي الطلبة' : 'Effectif Total'}
          </span>
          <div className="text-xl font-black text-neutral-900 dark:text-white mt-1">
            {stats.total} {isRtl ? 'طالب' : 'étudiants'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
          <span className="text-2xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">
            {isRtl ? 'الحاضرون (P)' : 'Présents (P)'}
          </span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {stats.present}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 shadow-2xs">
          <span className="text-2xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider block">
            {isRtl ? 'الغائبون (A)' : 'Absents (A)'}
          </span>
          <div className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">
            {stats.absent}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
          <span className="text-2xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider block">
            {isRtl ? 'المتأخرون (R)' : 'En Retard (R)'}
          </span>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {stats.late}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#C4785A]/10 border border-[#C4785A]/25 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-2xs text-[#C4785A] font-bold uppercase tracking-wider block">
            {isRtl ? 'نسبة الحضور' : 'Taux de Présence'}
          </span>
          <div className="text-xl font-black font-mono text-[#C4785A] mt-1">
            {stats.ratePercent}%
          </div>
        </div>
      </div>

      {/* Roster Controls: 1-Tap All Present + Instant Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FA] dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSessionLocked}
            onClick={handleMarkAllPresent}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Check size={16} />
            <span>{isRtl ? 'تحديد الكل حاضرون بلمسة واحدة' : 'Tout Marquer Présent (1 Clic)'}</span>
          </button>

          <span className="text-xs text-neutral-400 hidden sm:inline">
            {isRtl ? 'ثم انقر على الغائبين لتعديل حالتهم فورياً' : 'Puis basculez les 1 ou 2 absents individuellement.'}
          </span>
        </div>

        <div className="w-full sm:w-72">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'بحث باسم الطالب أو الهاتف...' : 'Filtrer par nom ou tél...'}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#C4785A]/30"
            />
          </div>
        </div>
      </div>

      {/* Student Roll-Call Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const record = attendanceMap[student.id] || { status: 'present' };
          const status = record.status;

          return (
            <div
              key={student.id}
              className={`rounded-2xl border p-4 transition-all shadow-xs ${
                status === 'present'
                  ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                  : status === 'absent'
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-300/40'
                  : status === 'late'
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-300/40'
                  : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-200 dark:border-neutral-700">
                    {student.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                      {student.fullName}
                    </h3>
                    <p className="text-2xs text-neutral-500 font-mono">
                      ID: {student.id.slice(0, 10)} {student.phone && `· ${student.phone}`}
                    </p>
                  </div>
                </div>

                {/* Presence Rate Badge */}
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
                  {student.attendanceRatePercent ?? 95}% {isRtl ? 'حضور' : 'assiduité'}
                </span>
              </div>

              {/* Status Selector Pill Buttons */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <button
                  type="button"
                  disabled={isSessionLocked}
                  onClick={() => handleSetStatus(student.id, 'present')}
                  className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                    status === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title={isRtl ? 'حاضر' : 'Présent'}
                >
                  <span>P</span>
                  <span className="text-[10px] hidden sm:inline">{isRtl ? 'حاضر' : 'Présent'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSessionLocked}
                  onClick={() => handleSetStatus(student.id, 'absent')}
                  className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                    status === 'absent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-rose-600'
                  }`}
                  title={isRtl ? 'غائب' : 'Absent'}
                >
                  <span>A</span>
                  <span className="text-[10px] hidden sm:inline">{isRtl ? 'غائب' : 'Absent'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSessionLocked}
                  onClick={() => handleSetStatus(student.id, 'late')}
                  className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                    status === 'late'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-amber-600'
                  }`}
                  title={isRtl ? 'متأخر' : 'En retard'}
                >
                  <span>R</span>
                  <span className="text-[10px] hidden sm:inline">{isRtl ? 'تأخر' : 'Retard'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSessionLocked}
                  onClick={() => handleSetStatus(student.id, 'excused')}
                  className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                    status === 'excused'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-blue-600'
                  }`}
                  title={isRtl ? 'غياب مبرر' : 'Excusé'}
                >
                  <span>E</span>
                  <span className="text-[10px] hidden sm:inline">{isRtl ? 'مبرر' : 'Excusé'}</span>
                </button>
              </div>

              {/* Guardian Info & Absentee SMS Prompt */}
              {status === 'absent' && (
                <div className="mt-3 pt-2.5 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-2xs text-rose-700 dark:text-rose-300">
                  <span className="truncate">
                    {student.guardianName ? `${student.guardianRelation || 'Tuteur'}: ${student.guardianName}` : 'Tuteur non renseigné'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotifyingStudent(student)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold cursor-pointer transition-colors"
                  >
                    <MessageCircle size={12} />
                    <span>{isRtl ? 'إشعار الولي' : 'Avis d\'absence'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pedagogy Notes & Homework Footer Pod */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          {isRtl ? 'دفتر المتابعة البيداغوجية للحصة' : 'Cahier de Texte & Progression du Cours'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {isRtl ? 'موضوع الدرس المنجز اليوم' : 'Objectifs & Chapitre Traité'}
            </label>
            <input
              type="text"
              disabled={isSessionLocked}
              value={pedagogyTopic}
              onChange={(e) => setPedagogyTopic(e.target.value)}
              placeholder={isRtl ? 'مثال: الوحدة 4 - قواعد التراكيب والنحو...' : 'Ex: Module 3 - Exercices pratiques et analyse de cas'}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {isRtl ? 'الواجبات المنزلية للحصة القادمة' : 'Devoirs & Consignes pour la Prochaine Séance'}
            </label>
            <input
              type="text"
              disabled={isSessionLocked}
              value={homeworkNotes}
              onChange={(e) => setHomeworkNotes(e.target.value)}
              placeholder={isRtl ? 'مثال: إنجاز التمرين رقم 5 صفحة 42...' : 'Ex: Préparer les exercices 4 et 5 page 68'}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Absentee Guardian Alert Modal */}
      {notifyingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {isRtl ? 'إشعار فوري بغياب الطالب' : 'Notification d\'Absence Immédiate'}
                </h3>
                <p className="text-2xs text-neutral-500">
                  {notifyingStudent.fullName} · {notifyingStudent.guardianPhone || notifyingStudent.phone}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 text-xs space-y-2 mb-4">
              <span className="text-2xs text-neutral-400 uppercase font-semibold block">
                {isRtl ? 'نص الرسالة الموجهة للولي' : 'Aperçu du Message WhatsApp'}
              </span>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
                {isRtl
                  ? `السلام عليكم، نعلمكم بغياب الطالب(ة) ${notifyingStudent.fullName} اليوم في حصة [${activeCohort?.name || activeSession?.cohortName}]. يرجى التواصل مع إدارة المركز للتبرير.`
                  : `Bonjour, l'administration de l'académie vous informe de l'absence de l'étudiant(e) ${notifyingStudent.fullName} aujourd'hui pour la séance de [${activeCohort?.name || activeSession?.cohortName}].`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNotifyingStudent(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => handleSendGuardianAlert(notifyingStudent)}
                className="flex-1 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send size={14} />
                <span>{isRtl ? 'إرسال عبر واتساب' : 'Envoyer WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock PIN Modal */}
      <PinVerificationModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          setIsSessionLocked(false);
          showToast({
            type: 'info',
            title: isRtl ? 'تم إلغاء قفل الحضور' : 'Appel Déverrouillé',
            message: isRtl ? 'يمكنك الآن تعديل حالات الحضور والغياب' : 'Modifications autorisées.',
          });
        }}
        title={isRtl ? 'إلغاء قفل ورقة الحضور' : 'Déverrouiller la Séance'}
        description={isRtl ? 'أدخل رمز PIN لتعديل إحصائيات الحضور المسجلة' : 'Saisissez votre code PIN pour modifier la feuille d\'émargement.'}
      />
    </div>
  );
};
