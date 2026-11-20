import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  Search,
  Users,
  Send,
  Unlock,
  Check,
  MessageCircle,
  BookOpen,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { EduStudent } from '../../../types/index';
import { pickLocalizedText, registerUndoEntry, runUndoBatch } from '../../../services/undoEngine';
import { PinVerificationModal } from '../../modals/PinVerificationModal';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonKioskGrid } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
} from '../../ui/kinetic';

type QuickStatus = 'present' | 'absent' | 'late' | 'excused';
type AttendanceMapState = Record<string, { status: QuickStatus }>;

export const AcademyRollCallKiosk: React.FC = () => {
  const { language, isRtl } = useTranslation();
  const isEn = language === 'en';
  const {
    eduSessions,
    eduCohorts,
    eduStudents,
    eduEnrollments,
    eduQuickAttendance,
    recordQuickAttendance,
    currentUser,
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

  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => eduSessions[0]?.id || '');

  const activeSession = useMemo(
    () => eduSessions.find((s) => s.id === selectedSessionId) || eduSessions[0] || null,
    [eduSessions, selectedSessionId]
  );

  const activeCohort = useMemo(() => {
    if (!activeSession) return null;
    return eduCohorts.find((c) => c.id === activeSession.cohortId) || null;
  }, [activeSession, eduCohorts]);

  const enrolledStudents = useMemo(() => {
    if (!activeSession) return [];
    const enrollments = eduEnrollments.filter(
      (e) => e.cohortId === activeSession.cohortId && e.status === 'Active'
    );
    if (enrollments.length > 0) {
      const studentIds = new Set(enrollments.map((e) => e.studentId));
      return eduStudents.filter((s) => studentIds.has(s.id));
    }
    return eduStudents.slice(0, 15);
  }, [activeSession, eduEnrollments, eduStudents]);

  const [attendanceMap, setAttendanceMap] = useState<AttendanceMapState>({});
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [lockedTimestamp, setLockedTimestamp] = useState<string | null>(null);
  const [lockedByStaff, setLockedByStaff] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pedagogyTopic, setPedagogyTopic] = useState('');
  const [homeworkNotes, setHomeworkNotes] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [notifyingStudent, setNotifyingStudent] = useState<EduStudent | null>(null);

  useEffect(() => {
    if (!activeSession) return;
    const existingRecords = eduQuickAttendance.filter((r) => r.sessionId === activeSession.id);
    if (existingRecords.length > 0) {
      const initialMap: AttendanceMapState = {};
      let locked = false;
      let lastLockedTime = '';
      let staffSig = '';
      existingRecords.forEach((r) => {
        initialMap[r.studentId] = { status: r.status as QuickStatus };
        if (r.isLocked) {
          locked = true;
          lastLockedTime = r.markedAt;
          staffSig = r.markedByStaffId;
        }
      });
      setAttendanceMap(initialMap);
      setIsSessionLocked(locked);
      setLockedTimestamp(
        lastLockedTime
          ? new Date(lastLockedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null
      );
      setLockedByStaff(staffSig || currentUser?.fullName || 'Professeur');
    } else {
      const defaultMap: AttendanceMapState = {};
      enrolledStudents.forEach((s) => {
        defaultMap[s.id] = { status: 'present' };
      });
      setAttendanceMap(defaultMap);
      setIsSessionLocked(false);
      setLockedTimestamp(null);
    }
    setPedagogyTopic(activeSession.topic || '');
  }, [activeSession?.id, enrolledStudents.length]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrolledStudents;
    const q = searchQuery.toLowerCase().trim();
    return enrolledStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        Boolean(s.phone && s.phone.includes(q)) ||
        Boolean(s.guardianPhone && s.guardianPhone.includes(q)) ||
        s.id.toLowerCase().includes(q)
    );
  }, [enrolledStudents, searchQuery]);

  const stats = useMemo(() => {
    const total = enrolledStudents.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    enrolledStudents.forEach((s) => {
      const st = attendanceMap[s.id]?.status || 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else if (st === 'excused') excused++;
    });
    const ratePercent = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { total, present, absent, late, excused, ratePercent };
  }, [enrolledStudents, attendanceMap]);

  const handleMarkAllPresent = () => {
    if (isSessionLocked) return;
    const updated: AttendanceMapState = {};
    enrolledStudents.forEach((s) => {
      updated[s.id] = { status: 'present' };
    });
    setAttendanceMap(updated);
    showToast({
      type: 'info',
      title: isRtl ? 'تم تحديد جميع الطلاب حاضرين' : 'Tous marqués présents',
      message: isRtl
        ? 'يمكنك الآن تحديد الغائبين بشكل فردي بلمسة واحدة'
        : "Vous pouvez marquer les éventuels absents d'un clic.",
    });
  };

  const handleSetStatus = (studentId: string, status: QuickStatus) => {
    if (isSessionLocked) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
      },
    }));
  };

  const handleSubmitRollCall = () => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    const staffId = currentUser?.id || 'instructor_01';
    const prevLocked = isSessionLocked;
    const prevLockedTs = lockedTimestamp;
    const prevLockedBy = lockedByStaff;
    const nextLockedTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextLockedBy = currentUser?.fullName || 'Enseignant';

    runUndoBatch(
      {
        vertical: 'education_cohort',
        operationType: 'bulk',
        affectedCount: enrolledStudents.length,
        toastType: 'success',
        summary: pickLocalizedText(language, {
          en: `Roll call locked (${stats.ratePercent}% · ${enrolledStudents.length} students)`,
          fr: `Appel validé & verrouillé (${stats.ratePercent}% · ${enrolledStudents.length} étudiants)`,
          ar: `تم تأكيد وقفل الحضور (${stats.ratePercent}%)`,
        }),
      },
      () => {
        enrolledStudents.forEach((s) => {
          const current = attendanceMap[s.id] || { status: 'present' as QuickStatus };
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
        registerUndoEntry({
          vertical: 'education_cohort',
          operationType: 'status',
          summary: 'Lock roll call state',
          undo: () => {
            setIsSessionLocked(prevLocked);
            setLockedTimestamp(prevLockedTs);
            setLockedByStaff(prevLockedBy);
          },
          redo: () => {
            setIsSessionLocked(true);
            setLockedTimestamp(nextLockedTs);
            setLockedByStaff(nextLockedBy);
          },
        });
      }
    );

    setIsSessionLocked(true);
    setLockedTimestamp(nextLockedTs);
    setLockedByStaff(nextLockedBy);
  };

  const handleSendGuardianAlert = (student: EduStudent) => {
    const cleanPhone = (student.guardianPhone || student.phone || '').replace(/[^0-9]/g, '');
    const sessionTime = `${activeSession?.startTime || '09:00'} - ${activeSession?.endTime || '11:00'}`;
    const cohortName = activeCohort?.name || activeSession?.cohortName || 'Cours Académie';
    const text = isRtl
      ? `السلام عليكم، نعلمكم بغياب الطالب(ة) ${student.fullName} اليوم في حصة [${cohortName}] المنعقدة في الفترة (${sessionTime}). يرجى التواصل مع إدارة المركز للتبرير.`
      : `Bonjour, l'administration de l'académie vous informe de l'absence de l'étudiant(e) ${student.fullName} aujourd'hui pour la séance de [${cohortName}] (${sessionTime}). Merci de contacter la scolarité pour régulariser.`;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast({
      type: 'success',
      title: isRtl ? 'تم تجهيز إشعار الولي' : isEn ? 'Guardian Alert Queued' : "Avis d'absence transmis",
      message: `${student.guardianName || student.fullName} (+213 ${cleanPhone}) · ${lockedByStaff || activeSession?.instructorName || ''}`,
    });
    setNotifyingStudent(null);
  };

  if (showSkeleton && (eduSessions.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        >
          <SkeletonKioskGrid count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      <ScreenHeaderBar
        icon={<GraduationCap size={22} />}
        title={isRtl ? 'الحضور السريع' : isEn ? 'Roll Call Kiosk' : 'Appel Rapide'}
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="min-w-[230px] h-10 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                aria-label={isRtl ? 'اختيار الحصة' : 'Sélectionner la séance'}
                className="lbi-field w-full h-full px-3 bg-transparent border-0 t-small font-semibold text-black dark:text-white cursor-pointer focus:outline-none"
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
                data-sq="ctl"
                data-sq-border="solid"
                onClick={() => setIsPinModalOpen(true)}
                className="h-10 px-4 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 t-small font-semibold flex items-center gap-2 hover:bg-amber-100 cursor-pointer"
              >
                <Unlock size={14} />
                <span>{isRtl ? 'إلغاء القفل (PIN)' : 'Déverrouiller (PIN)'}</span>
              </button>
            ) : null}
          </div>
        }
        primaryAction={
          !isSessionLocked
            ? {
                label: isRtl ? 'تأكيد وقفل ورقة الحضور' : "Valider & Verrouiller l'Appel",
                icon: <CheckCircle2 size={16} />,
                onClick: handleSubmitRollCall,
              }
            : undefined
        }
      />

      <ScreenKpiBanner
        heading={isRtl ? 'مؤشرات الحضور والانضباط الفوري' : isEn ? 'Live Roll Call Indicators' : 'Indicateurs Appel & Assiduité'}
        language={language}
        primaryCard={{
          label: isRtl ? 'نسبة الحضور' : isEn ? 'Attendance Rate' : 'Taux de Présence',
          count: stats.ratePercent,
          formatValue: (v) => `${v}%`,
          badgeText: `${stats.present} ${isRtl ? 'حاضر' : 'présents'}`,
          tone: 'emerald',
        }}
        secondaryCard={{
          label: isRtl ? 'إجمالي الطلبة' : isEn ? 'Enrolled Roster' : 'Effectif Séance',
          count: stats.total,
          badgeText: isSessionLocked && lockedTimestamp ? `${isRtl ? 'مغلق' : 'Verrouillé'} ${lockedTimestamp}` : `${stats.excused} ${isRtl ? 'مبرر' : 'excusés'}`,
          tone: 'terracotta',
        }}
        darkCard={{
          label: isRtl ? 'الغياب والتأخر' : isEn ? 'Absences & Late' : 'Absences & Retards',
          valueCount: stats.absent,
          valueSuffix: isRtl ? ' غائب' : ' absents',
          badgeCount: stats.late,
          badgeSuffix: isRtl ? ' متأخر' : ' retards',
          caption: isRtl ? 'متابعة فورية مع الأولياء' : 'Suivi disciplinaire & alertes parents',
        }}
      />

      <ScreenPod>
        <div className="space-y-5">
          {activeSession && (
            <div
              data-sq="card"
              data-sq-border="solid"
              className="bg-[#F3EDE7]/65 dark:bg-neutral-800/40 border border-[#E6DED6] dark:border-neutral-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 t-cap"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
                <div>
                  <span className="t-cap text-black/55 dark:text-white/55 block">
                    {isRtl ? 'الفوج / الدورة' : 'Promotion'}
                  </span>
                  <span className="font-semibold text-black dark:text-white truncate block">
                    {activeCohort?.name || activeSession.cohortName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="t-cap text-black/55 dark:text-white/55 block">
                    {isRtl ? 'القاعة' : 'Salle'}
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {activeSession.classroomName || 'Salle Polyvalente'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-600 shrink-0" />
                <div>
                  <span className="t-cap text-black/55 dark:text-white/55 block">
                    {isRtl ? 'التوقيت' : 'Horaires'}
                  </span>
                  <span className="tabular-nums font-semibold text-black dark:text-white">
                    {activeSession.startTime} — {activeSession.endTime}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-600 shrink-0" />
                <div>
                  <span className="t-cap text-black/55 dark:text-white/55 block">
                    {isRtl ? 'الأستاذ المعين' : 'Formateur'}
                  </span>
                  <span className="font-semibold text-black dark:text-white truncate block">
                    {activeSession.instructorName || currentUser?.fullName || 'Professeur Titulaire'}
                  </span>
                </div>
              </div>
            </div>
          )}

      <div
        data-sq="card"
        data-sq-border="solid"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F3EDE7] dark:bg-[#141312] p-4 border border-neutral-200 dark:border-[#33302D] [--sq-stroke:#e5e5e5] dark:[--sq-stroke:#33302D]"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-sq="ctl"
            data-sq-border="none"
            disabled={isSessionLocked}
            onClick={handleMarkAllPresent}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white t-small font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Check size={16} />
            <span>{isRtl ? 'تحديد الكل حاضرون بلمسة واحدة' : 'Tout Marquer Présent (1 Clic)'}</span>
          </button>
          <span className="t-cap text-black/55 dark:text-white/55 hidden sm:inline">
            {isRtl
              ? 'ثم انقر على الغائبين لتعديل حالتهم فورياً'
              : 'Puis basculez les 1 ou 2 absents individuellement.'}
          </span>
        </div>
        <div className="w-full sm:w-72">
          <div
            data-sq="ctl"
            data-sq-border="solid"
            className="relative h-10 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          >
            <Search size={15} className="absolute left-3 top-3 text-black/55 dark:text-white/55 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'بحث باسم الطالب أو الهاتف...' : 'Filtrer par nom ou tél...'}
              className="lbi-field w-full h-full pl-9 pr-3 bg-transparent border-0 t-small font-medium focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const status = attendanceMap[student.id]?.status || 'present';
          return (
            <div key={student.id} className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="solid"
                data-sq-stroke-w={status !== 'present' ? 2 : undefined}
                className={`border p-4 transition-all h-full ${
                  status === 'present'
                    ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 [--sq-stroke:#e5e5e5] dark:[--sq-stroke:#262626]'
                    : status === 'absent'
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 [--sq-stroke:#fda4af] dark:[--sq-stroke:rgba(136,19,55,0.6)]'
                    : status === 'late'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 [--sq-stroke:#fcd34d] dark:[--sq-stroke:rgba(120,53,15,0.6)]'
                    : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/60 [--sq-stroke:#93c5fd] dark:[--sq-stroke:rgba(30,58,138,0.6)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      data-sq="tile"
                      data-sq-border="solid"
                      className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-semibold t-label shrink-0 border border-neutral-200 dark:border-neutral-700"
                    >
                      {student.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold t-small text-black dark:text-white truncate">{student.fullName}</h3>
                      <p className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                        ID: {student.id.slice(0, 10)} {student.phone && `· ${student.phone}`}
                      </p>
                    </div>
                  </div>
                  <span className="t-small font-semibold px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 shrink-0">
                    {student.attendanceRatePercent ?? 95}% {isRtl ? 'حضور' : 'assiduité'}
                  </span>
                </div>

                <div
                  data-sq="ctl"
                  data-sq-border="none"
                  className="grid grid-cols-4 gap-2 p-[3px] bg-neutral-100 dark:bg-neutral-800"
                >
                  <button
                    type="button"
                    data-sq="thumb"
                    data-sq-border="none"
                    disabled={isSessionLocked}
                    onClick={() => handleSetStatus(student.id, 'present')}
                    className={`h-9 t-small font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                      status === 'present'
                        ? 'bg-emerald-600 text-white'
                        : 'text-black/70 dark:text-white/75 hover:text-black'
                    }`}
                    title={isRtl ? 'حاضر' : 'Présent'}
                  >
                    <span>P</span>
                    <span className="t-cap hidden sm:inline">{isRtl ? 'حاضر' : 'Présent'}</span>
                  </button>
                  <button
                    type="button"
                    data-sq="thumb"
                    data-sq-border="none"
                    disabled={isSessionLocked}
                    onClick={() => handleSetStatus(student.id, 'absent')}
                    className={`h-9 t-small font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                      status === 'absent'
                        ? 'bg-rose-600 text-white'
                        : 'text-black/70 dark:text-white/75 hover:text-rose-600'
                    }`}
                    title={isRtl ? 'غائب' : 'Absent'}
                  >
                    <span>A</span>
                    <span className="t-cap hidden sm:inline">{isRtl ? 'غائب' : 'Absent'}</span>
                  </button>
                  <button
                    type="button"
                    data-sq="thumb"
                    data-sq-border="none"
                    disabled={isSessionLocked}
                    onClick={() => handleSetStatus(student.id, 'late')}
                    className={`h-9 t-small font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                      status === 'late'
                        ? 'bg-amber-600 text-white'
                        : 'text-black/70 dark:text-white/75 hover:text-amber-600'
                    }`}
                    title={isRtl ? 'متأخر' : 'En retard'}
                  >
                    <span>R</span>
                    <span className="t-cap hidden sm:inline">{isRtl ? 'تأخر' : 'Retard'}</span>
                  </button>
                  <button
                    type="button"
                    data-sq="thumb"
                    data-sq-border="none"
                    disabled={isSessionLocked}
                    onClick={() => handleSetStatus(student.id, 'excused')}
                    className={`h-9 t-small font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                      status === 'excused'
                        ? 'bg-blue-600 text-white'
                        : 'text-black/70 dark:text-white/75 hover:text-blue-600'
                    }`}
                    title={isRtl ? 'غياب مبرر' : 'Excusé'}
                  >
                    <span>E</span>
                    <span className="t-cap hidden sm:inline">{isRtl ? 'مبرر' : 'Excusé'}</span>
                  </button>
                </div>

              {status === 'absent' && (
                <div className="mt-3 pt-2.5 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between t-cap text-rose-700 dark:text-rose-300">
                  <span className="truncate">
                    {student.guardianName
                      ? `${student.guardianRelation || 'Tuteur'}: ${student.guardianName}`
                      : 'Tuteur non renseigné'}
                  </span>
                  <button
                    type="button"
                    data-sq="ctl-sm"
                    data-sq-border="none"
                    onClick={() => setNotifyingStudent(student)}
                    className="flex items-center gap-1 px-2 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-semibold cursor-pointer transition-colors"
                  >
                    <MessageCircle size={12} />
                    <span>{isRtl ? 'إشعار الولي' : "Avis d'absence"}</span>
                  </button>
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sq-elev-card">
        <div
          data-sq="card"
          data-sq-border="solid"
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 space-y-4"
        >
        <h3 className="t-small font-semibold text-black/55 dark:text-white/55">
          {isRtl ? 'دفتر المتابعة البيداغوجية للحصة' : 'Cahier de Texte & Progression du Cours'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
              {isRtl ? 'موضوع الدرس المنجز اليوم' : 'Objectifs & Chapitre Traité'}
            </label>
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="h-10 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
            >
              <input
                type="text"
                disabled={isSessionLocked}
                value={pedagogyTopic}
                onChange={(e) => setPedagogyTopic(e.target.value)}
                placeholder={
                  isRtl
                    ? 'مثال: الوحدة 4 - قواعد التراكيب والنحو...'
                    : 'Ex: Module 3 - Exercices pratiques et analyse de cas'
                }
                className="lbi-field w-full h-full px-3 bg-transparent border-0 t-small font-medium focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block t-small font-semibold text-black/70 dark:text-white/75 mb-1">
              {isRtl ? 'الواجبات المنزلية للحصة القادمة' : 'Devoirs & Consignes pour la Prochaine Séance'}
            </label>
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="h-10 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
            >
              <input
                type="text"
                disabled={isSessionLocked}
                value={homeworkNotes}
                onChange={(e) => setHomeworkNotes(e.target.value)}
                placeholder={
                  isRtl ? 'مثال: إنجاز التمرين رقم 5 صفحة 42...' : 'Ex: Préparer les exercices 4 et 5 page 68'
                }
                className="lbi-field w-full h-full px-3 bg-transparent border-0 t-small font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>
        </div>
      </div>
        </div>
      </ScreenPod>

      {notifyingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="sq-elev-pop max-w-md w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full p-6 animate-in fade-in zoom-in-95 duration-150"
            >
            <div className="flex items-center gap-2 mb-4">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-rose-100 text-rose-700 flex items-center justify-center"
              >
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="t-label font-semibold text-black dark:text-white">
                  {isRtl ? 'إشعار فوري بغياب الطالب' : "Notification d'Absence Immédiate"}
                </h3>
                <p className="t-cap text-black/55 dark:text-white/55">
                  {notifyingStudent.fullName} · {notifyingStudent.guardianPhone || notifyingStudent.phone}
                </p>
              </div>
            </div>
            <div
              data-sq="card"
              data-sq-border="none"
              className="bg-neutral-50 dark:bg-neutral-800/60 p-4 t-cap space-y-2 mb-4"
            >
              <span className="t-small text-black/55 dark:text-white/55 font-semibold block">
                {isRtl ? 'نص الرسالة الموجهة للولي' : 'Aperçu du Message WhatsApp'}
              </span>
              <p className="t-cap text-black/70 dark:text-white/75 leading-relaxed font-sans">
                {isRtl
                  ? `السلام عليكم، نعلمكم بغياب الطالب(ة) ${notifyingStudent.fullName} اليوم في حصة [${
                      activeCohort?.name || activeSession?.cohortName
                    }]. يرجى التواصل مع إدارة المركز للتبرير.`
                  : `Bonjour, l'administration de l'académie vous informe de l'absence de l'étudiant(e) ${notifyingStudent.fullName} aujourd'hui pour la séance de [${
                      activeCohort?.name || activeSession?.cohortName
                    }].`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-sq="ctl"
                data-sq-border="none"
                onClick={() => setNotifyingStudent(null)}
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 t-small font-semibold text-black/70 dark:text-white/75 cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                data-sq="ctl"
                data-sq-border="none"
                onClick={() => handleSendGuardianAlert(notifyingStudent)}
                className="flex-1 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white t-small font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={14} />
                <span>{isRtl ? 'إرسال عبر واتساب' : 'Envoyer WhatsApp'}</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

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
        description={
          isRtl
            ? 'أدخل رمز PIN لتعديل إحصائيات الحضور المسجلة'
            : "Saisissez votre code PIN pour modifier la feuille d'émargement."
        }
      />
    </div>
  );
};
