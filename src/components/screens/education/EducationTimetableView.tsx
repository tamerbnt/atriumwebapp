import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  Printer,
  Trash2,
  ClipboardList,
  Car,
  Bus,
  Utensils,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentEduSessionsFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentEduClassroomsFromState,
  selectCurrentEduStudentsFromState,
  selectCurrentEduEnrollmentsFromState,
  selectCurrentEduDrivingLogsFromState,
  selectCurrentEduK12ServicesFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { PrintSheetModal, PrintSheetPage } from '../../modals/PrintSheetModal';
import { resolveBatchSelection } from '../../../utils/step5Actions';
import { runUndoBatch } from '../../../services/undoEngine';
import { EduDrivingLogKind, EduSession } from '../../../types';
import {
  computeSessionDurationHours,
  detectDrivingVehicleOrInstructorConflict,
  detectEduSessionConflicts,
  summarizeDrivingStudentProgress,
  summarizeK12Services,
} from '../../../utils/educationDepth';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import { RollCallModal } from './RollCallModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { Button } from '@/atrium/core';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCalendarTimeline } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticModalShell,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const EducationTimetableView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { eduSessions, eduCohorts, eduClassrooms, eduStudents, eduEnrollments, eduDrivingLogs, eduK12Services, staff, currentBranch, branches, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      eduSessions: selectCurrentEduSessionsFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
      eduClassrooms: selectCurrentEduClassroomsFromState(s),
      eduStudents: selectCurrentEduStudentsFromState(s),
      eduEnrollments: selectCurrentEduEnrollmentsFromState(s),
      eduDrivingLogs: selectCurrentEduDrivingLogsFromState(s),
      eduK12Services: selectCurrentEduK12ServicesFromState(s),
      staff: selectCurrentStaffFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const {
    addEduSession,
    deleteEduSession,
    recordEduVacataireLog,
    addEduDrivingLog,
    updateEduDrivingLog,
    upsertEduK12Service,
    toggleK12ServiceCheckIn,
    retryCloudSync,
  } = useAtriumActions();

  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<EduSession | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'seance' | 'salle' | 'emargement'>('seance');

  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(() => new Set<string>());
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('calendar');
  const [sortBy, setSortBy] = useState<string>('schedule');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [rollCallSession, setRollCallSession] = useState<EduSession | null>(null);
  const [attendancePrintState, setAttendancePrintState] = useState<{
    pages: PrintSheetPage[];
    warning?: string;
  } | null>(null);

  const openAttendanceSheetPrint = useCallback(
    (sessionsToPrint: EduSession[], warning?: string) => {
      const studentsById = new Map(eduStudents.map((st) => [st.id, st]));
      const cohortsById = new Map(eduCohorts.map((c) => [c.id, c]));
      const pages: PrintSheetPage[] = sessionsToPrint.map((s) => {
        const cohort = cohortsById.get(s.cohortId);
        const roster = eduEnrollments
          .filter((enr) => enr.cohortId === s.cohortId && enr.status !== 'Dropped')
          .map((enr, idx) => {
            const stu = studentsById.get(enr.studentId);
            return [
              String(idx + 1),
              stu ? stu.fullName : enr.studentName || enr.studentId,
              stu?.phone || '—',
              enr.status,
              '☐ P   ☐ A   ☐ R',
              '',
            ];
          });
        return {
          id: s.id,
          title: isAr ? `ورقة الحضور — ${s.cohortName || cohort?.name || 'الفوج'}` : isEn ? `Attendance Sheet — ${s.cohortName || cohort?.name || 'Cohort'}` : `Feuille d'émargement — ${s.cohortName || cohort?.name || 'Cohorte'}`,
          subtitle: `${s.date} · ${s.startTime} - ${s.endTime} · ${s.classroomName || 'Salle'}`,
          badgeText: `${roster.length} ${isAr ? 'طالب' : isEn ? 'students' : 'apprenants'}`,
          sections: [
            {
              rows: [
                { label: isAr ? 'الأستاذ / المدرب' : isEn ? 'Instructor' : 'Formateur', value: s.instructorName || '—' },
                { label: isAr ? 'القاعة' : isEn ? 'Classroom' : 'Salle', value: s.classroomName || '—' },
                { label: isAr ? 'الموضوع' : isEn ? 'Topic' : 'Module / Thème', value: s.topic || '—' },
              ],
            },
          ],
          tableHeaders: [
            '#',
            isAr ? 'الاسم الكامل' : isEn ? 'Student' : 'Apprenant',
            isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
            isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
            isAr ? 'الحضور' : isEn ? 'Mark' : 'Présence',
            isAr ? 'التوقيع' : isEn ? 'Signature' : 'Signature',
          ],
          tableRows: roster.length > 0 ? roster : [['1', isAr ? 'لا يوجد طلاب مسجلون' : isEn ? 'No enrolled students' : 'Aucun apprenant inscrit', '—', '—', '—', '—']],
          signatureLeft: isAr ? 'توقيع الأستاذ' : isEn ? 'Instructor Signature' : 'Signature Formateur',
          signatureRight: isAr ? 'توقيع الإدارة' : isEn ? 'Administration Stamp' : 'Visa Administration',
        };
      });
      setAttendancePrintState({ pages, warning });
    },
    [eduStudents, eduCohorts, eduEnrollments, isAr, isEn]
  );

  const [formData, setFormData] = useState({
    cohortId: eduCohorts[0]?.id || '',
    classroomId: eduClassrooms[0]?.id || '',
    instructorId: staff[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    topic: '',
    vehicleId: '',
    vehicleLabel: '',
    isVacataire: false,
    hourlyRateDzd: '1800',
  });

  const [activeMode, setActiveMode] = useState<'timetable' | 'driving' | 'k12'>('timetable');
  const [drivingForm, setDrivingForm] = useState<{
    studentId: string;
    instructorId: string;
    logKind: EduDrivingLogKind;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    vehicleLabel: string;
    vehiclePlate: string;
    hoursLogged: string;
    examResult: 'pending' | 'passed' | 'failed' | 'absent';
  }>({
    studentId: eduStudents[0]?.id || '',
    instructorId: staff[0]?.id || '',
    logKind: 'driving_hours',
    scheduledDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '12:00',
    vehicleLabel: 'Clio 5 Auto-École #01',
    vehiclePlate: '00421-125-16',
    hoursLogged: '2',
    examResult: 'pending',
  });

  const [k12Form, setK12Form] = useState<{
    studentId: string;
    serviceType: 'canteen' | 'transport';
    planName: string;
    routeOrDiet: string;
    pickupStop: string;
    monthlyFeeDzd: string;
  }>({
    studentId: eduStudents[0]?.id || '',
    serviceType: 'transport',
    planName: 'Bus Scolaire Matin & Soir',
    routeOrDiet: 'Circuit Hydra — Ben Aknoun',
    pickupStop: 'Arrêt Val d’Hydra',
    monthlyFeeDzd: '6500',
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    eduSessions.forEach((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language).name;
      map.set(b, (map.get(b) || 0) + 1);
    });
    return map;
  }, [eduSessions, branchesById, currentBranch, language]);

  const filteredSessions = useMemo(() => {
    return eduSessions.filter((s) => {
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language).name;
        if (b !== branchFilter) return false;
      }
      if (selectedClassroomId !== 'all' && s.classroomId !== selectedClassroomId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          (s.topic || '').toLowerCase().includes(q) ||
          (s.instructorName || '').toLowerCase().includes(q) ||
          (s.cohortName || '').toLowerCase().includes(q) ||
          (s.classroomName || '').toLowerCase().includes(q) ||
          s.date.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [eduSessions, branchFilter, selectedClassroomId, searchQuery, branchesById, currentBranch, language]);

  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      const aPinned = pinnedSessionIds.has(a.id);
      const bPinned = pinnedSessionIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'cohort') {
        cmp = (a.cohortName || '').localeCompare(b.cohortName || '');
      } else if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredSessions, pinnedSessionIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const conflicts = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < filteredSessions.length; i++) {
      for (let j = i + 1; j < filteredSessions.length; j++) {
        const a = filteredSessions[i];
        const b = filteredSessions[j];
        if (a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime) {
          if (
            (a.classroomId && a.classroomId === b.classroomId) ||
            (a.instructorId && a.instructorId === b.instructorId)
          ) {
            set.add(a.id);
            set.add(b.id);
          }
        }
      }
    }
    return set;
  }, [filteredSessions]);

  const activeSession = useMemo(() => {
    if (!selectedSession) return null;
    return eduSessions.find((s) => s.id === selectedSession.id) || selectedSession;
  }, [selectedSession, eduSessions]);

  const sessionConflictPreview = useMemo(() => {
    const cohort = eduCohorts.find((c) => c.id === formData.cohortId) || eduCohorts[0];
    const instructorId = formData.instructorId || cohort?.instructorId || '';
    return detectEduSessionConflicts(
      {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        classroomId: formData.classroomId || undefined,
        instructorId,
        vehicleId: formData.vehicleId.trim() || undefined,
        status: 'Scheduled',
      },
      eduSessions
    );
  }, [formData, eduCohorts, eduSessions]);

  const drivingConflictPreview = useMemo(() => {
    const instructorId = drivingForm.instructorId || staff[0]?.id || '';
    const vehicleId = drivingForm.vehiclePlate.trim() || drivingForm.vehicleLabel.trim() || undefined;
    return detectDrivingVehicleOrInstructorConflict(
      {
        scheduledDate: drivingForm.scheduledDate,
        startTime: drivingForm.startTime,
        endTime: drivingForm.endTime,
        instructorId,
        vehicleId,
      },
      eduDrivingLogs
    );
  }, [drivingForm, eduDrivingLogs, staff]);

  const k12Summary = useMemo(() => summarizeK12Services(eduK12Services), [eduK12Services]);

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const cohort = eduCohorts.find((c) => c.id === formData.cohortId) || eduCohorts[0];
    const room = eduClassrooms.find((r) => r.id === formData.classroomId) || eduClassrooms[0];
    const instructor = staff.find((s) => s.id === formData.instructorId) || staff[0];
    if (!cohort) return;
    const durationHours = computeSessionDurationHours(formData.startTime, formData.endTime);
    const hourlyRate = Math.max(0, Number(formData.hourlyRateDzd || 0));
    const created = addEduSession({
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
      vehicleId: formData.vehicleId.trim() || undefined,
      vehicleLabel: formData.vehicleLabel.trim() || undefined,
      isVacataire: formData.isVacataire,
      hourlyRateDzd: formData.isVacataire ? hourlyRate : undefined,
      durationHours: durationHours > 0 ? durationHours : undefined,
      status: 'Scheduled',
    });
    if (!created) return;
    if (formData.isVacataire && hourlyRate > 0 && durationHours > 0) {
      recordEduVacataireLog({
        instructorId: created.instructorId,
        instructorName: created.instructorName,
        sessionId: created.id,
        cohortId: created.cohortId,
        cohortName: created.cohortName,
        workDate: created.date,
        hoursWorked: durationHours,
        hourlyRateDzd: hourlyRate,
        notes: created.topic || created.cohortName,
      });
    }
    setIsAddSessionModalOpen(false);
  };

  const handleAddDrivingLog = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = eduStudents.find((s) => s.id === drivingForm.studentId) || eduStudents[0];
    const inst = staff.find((s) => s.id === drivingForm.instructorId) || staff[0];
    if (!stu || !inst) return;
    const hours =
      Number(drivingForm.hoursLogged || 0) > 0
        ? Number(drivingForm.hoursLogged)
        : computeSessionDurationHours(drivingForm.startTime, drivingForm.endTime) || 1;
    const created = addEduDrivingLog({
      studentId: stu.id,
      studentName: stu.fullName,
      instructorId: inst.id,
      instructorName: inst.fullName,
      vehicleId: drivingForm.vehiclePlate.trim() || drivingForm.vehicleLabel.trim() || undefined,
      vehicleLabel: drivingForm.vehicleLabel.trim() || undefined,
      vehiclePlate: drivingForm.vehiclePlate.trim() || undefined,
      logKind: drivingForm.logKind,
      scheduledDate: drivingForm.scheduledDate,
      startTime: drivingForm.startTime,
      endTime: drivingForm.endTime,
      hoursLogged: hours,
      examResult: drivingForm.examResult,
    });
    if (created) {
      setDrivingForm((prev) => ({
        ...prev,
        examResult: 'pending',
      }));
    }
  };

  const handleSaveK12Service = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = eduStudents.find((s) => s.id === k12Form.studentId) || eduStudents[0];
    if (!stu || !k12Form.planName.trim()) return;
    upsertEduK12Service({
      studentId: stu.id,
      studentName: stu.fullName,
      serviceType: k12Form.serviceType,
      planName: k12Form.planName.trim(),
      routeOrDiet: k12Form.routeOrDiet.trim() || undefined,
      pickupStop: k12Form.pickupStop.trim() || undefined,
      monthlyFeeCentimes: dzdToCentimes(Math.max(0, Number(k12Form.monthlyFeeDzd || 0))),
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      checkInToday: false,
    });
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'البداية' : 'Début',
      isAr ? 'النهاية' : 'Fin',
      isAr ? 'الفوج' : 'Cohorte',
      isAr ? 'الموضوع' : 'Module',
      isAr ? 'القاعة' : 'Salle',
      isAr ? 'المدرب' : 'Formateur',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedSessions.map((s) => [
      s.date,
      s.startTime,
      s.endTime,
      s.cohortName || '',
      s.topic || '',
      s.classroomName || 'Non assignée',
      s.instructorName || '',
      resolveRecordBranch(s, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`timetable-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : isEn ? 'Export Complete' : 'Export réussi',
      message: `${sortedSessions.length} séances exportées`,
    });
  }, [sortedSessions, branchesById, currentBranch, language, isAr, isEn]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: eduSessions.length },
      ...Array.from(branchCounts.entries()).map(([n, c]) => ({ value: n, label: n, count: c })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / المؤسسة' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'classroom',
        label: isAr ? 'القاعة التدريبية' : isEn ? 'Classroom' : 'Salle Campus',
        value: selectedClassroomId,
        onChange: setSelectedClassroomId,
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes' },
          ...eduClassrooms.map((cr) => ({ value: cr.id, label: cr.name })),
        ],
      },
    ];
  }, [branchFilter, selectedClassroomId, branchCounts, eduSessions.length, eduClassrooms, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (selectedClassroomId !== 'all') {
      const room = eduClassrooms.find((r) => r.id === selectedClassroomId);
      chips.push({
        key: 'classroom',
        label: room?.name || selectedClassroomId,
        onRemove: () => setSelectedClassroomId('all'),
      });
    }
    return chips;
  }, [branchFilter, selectedClassroomId, eduClassrooms, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (selectedClassroomId !== 'all' ? 1 : 0);

  const getSessionRowMeta = useCallback(
    (s: EduSession): KineticRowMeta => {
      const hasConflict = conflicts.has(s.id);
      return {
        avatarText: (s.cohortName || 'SE').slice(0, 2).toUpperCase(),
        subline: `${s.topic || 'Séance de cours'} · ${s.instructorName || 'Formateur'}`,
        categoryLabel: s.classroomName || 'Salle',
        statusVariant: hasConflict ? 'blocked' : 'active',
        statusLabel: hasConflict ? 'Conflit' : 'Planifiée',
        metricPrimary: `${s.startTime} - ${s.endTime}`,
        metricSecondary: s.date,
        detailCol1: {
          heading: isAr ? 'الحصة والأستاذ' : isEn ? 'Topic & Instructor' : 'Séance & Formateur',
          primaryText: s.topic || 'Séance de cours',
          secondaryText: s.instructorName || 'Formateur',
          tertiaryText: s.cohortName,
        },
        detailCol2: {
          heading: isAr ? 'القاعة والتوقيت' : isEn ? 'Room & Schedule' : 'Salle & Créneau',
          primaryText: s.classroomName || 'Salle standard',
          secondaryText: `${s.date} · ${s.startTime} - ${s.endTime}`,
        },
        detailCol3: {
          heading: isAr ? 'حالة الجدولة' : isEn ? 'Conflict Check' : 'Disponibilité',
          primaryText: hasConflict ? (isAr ? 'تعارض قاعة' : 'Conflit détecté') : isAr ? 'مؤكدة' : 'Planifiée',
          secondaryText: s.cohortName,
        },
      };
    },
    [conflicts, isAr, isEn]
  );

  const getSessionFanActions = useCallback(
    (s: EduSession): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedSession(s);
          setInspectorTab('seance');
        },
      },
      {
        id: 'rollcall',
        label: isAr ? 'مناداة الحضور' : isEn ? 'Roll Call' : 'Émargement',
        icon: <ClipboardList className="w-[15px] h-[15px]" />,
        onClick: () => {
          setRollCallSession(s);
          setIsRollCallOpen(true);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          deleteEduSession(s.id);
          if (selectedSession?.id === s.id) setSelectedSession(null);
        },
      },
    ],
    [isAr, isEn, deleteEduSession, selectedSession?.id]
  );

  const getSessionDetailActions = useCallback(
    (s: EduSession): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isEn ? 'Open' : 'Ouvrir',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedSession(s);
          setInspectorTab('seance');
        },
      },
      {
        id: 'rollcall',
        label: isAr ? 'مناداة الحضور' : 'Émargement',
        icon: <ClipboardList className="w-3.5 h-3.5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
        onClick: () => {
          setRollCallSession(s);
          setIsRollCallOpen(true);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => {
          deleteEduSession(s.id);
          if (selectedSession?.id === s.id) setSelectedSession(null);
        },
      },
    ],
    [isAr, isEn, deleteEduSession, selectedSession?.id]
  );

  const sessionColumns: ColumnDefinition<EduSession>[] = useMemo(
    () => [
      {
        key: 'schedule',
        header: isAr ? 'التوقيت' : isEn ? 'Date & Time' : 'Horaire & Date',
        width: '165px',
        sortable: true,
        renderCell: (s) => (
          <div className="space-y-0.5 tabular-nums">
            <div className="font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center gap-2">
              <CalendarIcon size={12} />
              <span>{s.date}</span>
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 flex items-center gap-1">
              <Clock size={11} />
              <span>
                {s.startTime} - {s.endTime}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'cohort',
        header: isAr ? 'الفوج' : isEn ? 'Cohort' : 'Cohorte / Promotion',
        width: '190px',
        sortable: true,
        renderCell: (s) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block">{s.cohortName}</span>
            {s.topic && (
              <span className="t-cap text-black/55 dark:text-white/55 line-clamp-1">{s.topic}</span>
            )}
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '135px',
        sortable: true,
        renderCell: (s) => {
          const b = resolveRecordBranch(s, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'room',
        header: isAr ? 'القاعة' : isEn ? 'Classroom' : 'Salle Campus',
        width: '140px',
        renderCell: (s) => (
          <span className="t-small font-semibold text-black dark:text-white flex items-center gap-1">
            <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span>{s.classroomName || 'Non assignée'}</span>
          </span>
        ),
      },
      {
        key: 'instructor',
        header: isAr ? 'المدرب' : isEn ? 'Instructor' : 'Formateur / Enseignant',
        width: '165px',
        renderCell: (s) => (
          <span className="t-small font-medium text-black/70 dark:text-white/75 flex items-center gap-1">
            <User size={12} className="text-black/55 dark:text-white/55" />
            <span>{s.instructorName || 'Formateur'}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الوضعية' : isEn ? 'Status' : 'Statut Séance',
        width: '120px',
        renderCell: (s) =>
          conflicts.has(s.id) ? (
            <span className="px-2 py-1 rounded-full t-small font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1">
              <AlertTriangle size={10} />
              Conflit
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full t-small font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
              <CheckCircle2 size={10} />
              Planifiée
            </span>
          ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language, conflicts]
  );

  const renderCalendarGrid = () => {
    const dates = Array.from(new Set(sortedSessions.map((s) => s.date))).sort();
    if (dates.length === 0) {
      return (
        <KineticEmptyStateMotion motionKey="edu-cal-empty">
          <EmptyState
            variant="island"
            icon={<CalendarIcon />}
            title={isAr ? 'لا توجد حصص مجدولة حالياً' : isEn ? 'No sessions scheduled yet' : 'Aucune séance programmée dans le planning'}
          />
        </KineticEmptyStateMotion>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {dates.map((dateStr) => {
          const daySessions = sortedSessions
            .filter((s) => s.date === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div key={dateStr} className="sq-elev-card">
              <div
                data-sq="card"
                data-sq-border="solid"
                className="bg-white dark:bg-[#22201E] p-4 space-y-3 h-full"
              >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#d4522f]" />
                  <span className="tabular-nums t-small font-semibold text-black dark:text-white">{dateStr}</span>
                </div>
                <span className="t-small font-semibold text-black/55 dark:text-white/55 px-2 py-1 bg-neutral-100 dark:bg-[#2B2825] rounded-full">
                  {daySessions.length} {isAr ? 'حصص' : isEn ? 'sessions' : 'séances'}
                </span>
              </div>
              <div className="space-y-2">
                {daySessions.map((s) => {
                  const hasConflict = conflicts.has(s.id);
                  const isSelected = activeSession?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      data-sq="ctl"
                      data-sq-border="solid"
                      onClick={(e) => {
                        setDrawerOpenerEl(e.currentTarget);
                        setSelectedSession(s);
                      }}
                      className={`w-full text-left rtl:text-right p-3 transition-all cursor-pointer ${
                        isSelected
                          ? '[--sq-stroke:#d4522f] bg-[#FCEEE8]/40 dark:bg-[#2B2825]'
                          : 'hover:[--sq-stroke:rgba(212,82,47,0.6)] bg-neutral-50/50 dark:bg-[#191716]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="tabular-nums t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center gap-1">
                          <Clock size={11} />
                          {s.startTime} - {s.endTime}
                        </span>
                        {hasConflict && (
                          <span className="px-2 py-1 rounded-full t-small font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            {isAr ? 'تعارض' : isEn ? 'Conflict' : 'Conflit'}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold t-small text-black dark:text-white truncate">{s.cohortName}</div>
                      {s.topic && (
                        <div className="t-cap text-black/55 dark:text-white/55 line-clamp-1 mt-0.5">
                          {s.topic}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t border-[var(--atr-divider)] flex items-center justify-between t-cap text-black/55 dark:text-white/55">
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                          <MapPin size={10} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                          {s.classroomName || 'Salle'}
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                          <User size={10} />
                          {s.instructorName || 'Formateur'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: eduSessions.length > 0,
  });

  if (showSkeleton && (eduSessions.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCalendarTimeline
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<CalendarIcon size={22} />}
        title={t('edu_timetable_title')}
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            {conflicts.size > 0 && (
              <div
                data-sq="ctl"
                data-sq-border="none"
                className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 t-small font-semibold"
              >
                <AlertTriangle size={14} />
                <span>{conflicts.size} {isAr ? 'تعارضات مكتشفة' : isEn ? 'conflicts detected' : 'Conflits détectés'}</span>
              </div>
            )}
            <LiveSegmentedControl
              size="md"
              value={activeMode}
              onValueChange={(val) => setActiveMode(val as 'timetable' | 'driving' | 'k12')}
              options={[
                { value: 'timetable', label: isAr ? 'الجدول' : isEn ? 'Timetable' : 'Planning' },
                { value: 'driving', label: t('edu_tab_driving_school'), count: eduDrivingLogs.length },
                { value: 'k12', label: t('edu_tab_k12_services'), count: eduK12Services.length },
              ]}
              aria-label="Timetable Trade Mode"
            />
          </div>
        }
        primaryAction={{
          label: t('edu_btn_add_session'),
          icon: <Plus size={14} />,
          onClick: () => setIsAddSessionModalOpen(true),
        }}
      />

      {activeMode === 'driving' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-5 space-y-3 lg:col-span-1">
              <div className="flex items-center gap-2 font-semibold text-black dark:text-white">
                <Car size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>{t('edu_tab_driving_school')}</span>
              </div>
              {drivingConflictPreview.hasConflict && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 t-small font-medium flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{drivingConflictPreview.reason}</span>
                </div>
              )}
              <form onSubmit={handleAddDrivingLog} className="space-y-3">
                <LabelSelect
                  field="DrivingStudent"
                  label={t('edu_col_student')}
                  value={drivingForm.studentId}
                  onChange={(v) => setDrivingForm({ ...drivingForm, studentId: v })}
                  options={eduStudents.map((st) => ({ value: st.id, label: st.fullName }))}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelSelect
                  field="DrivingInstructor"
                  label={t('edu_field_instructor')}
                  value={drivingForm.instructorId}
                  onChange={(v) => setDrivingForm({ ...drivingForm, instructorId: v })}
                  options={staff.map((st) => ({ value: st.id, label: st.fullName }))}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelSelect
                  field="DrivingKind"
                  label={isAr ? 'النوع' : isEn ? 'Session / Exam Type' : 'Type de séance / examen'}
                  value={drivingForm.logKind}
                  onChange={(v) => setDrivingForm({ ...drivingForm, logKind: v as EduDrivingLogKind })}
                  options={[
                    { value: 'driving_hours', label: isAr ? 'ساعات سياقة عملية' : isEn ? 'Practical Driving Hours' : 'Heures de conduite' },
                    { value: 'code_session', label: isAr ? 'حصة قانون المرور' : isEn ? 'Code Theory Class' : 'Cours Code' },
                    { value: 'code_exam', label: isAr ? 'امتحان القانون' : isEn ? 'Code Exam' : 'Examen Code' },
                    { value: 'circuit_exam', label: isAr ? 'امتحان المناورة (الكرينو)' : isEn ? 'Circuit / Créneau Exam' : 'Examen Créneau' },
                    { value: 'road_exam', label: isAr ? 'امتحان السياقة (الطريق)' : isEn ? 'Road Driving Exam' : 'Examen Conduite' },
                  ]}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <div className="grid grid-cols-2 gap-2">
                  <LabelInput
                    field="DrivingVehicle"
                    label={isAr ? 'المركبة' : isEn ? 'Vehicle' : 'Véhicule'}
                    value={drivingForm.vehicleLabel}
                    onChange={(v) => setDrivingForm({ ...drivingForm, vehicleLabel: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                  <LabelInput
                    field="DrivingPlate"
                    label={isAr ? 'الترقيم' : isEn ? 'Plate / ID' : 'Matricule'}
                    value={drivingForm.vehiclePlate}
                    onChange={(v) => setDrivingForm({ ...drivingForm, vehiclePlate: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <LabelInput
                  field="DrivingDate"
                  label="Date"
                  type="date"
                  value={drivingForm.scheduledDate}
                  onChange={(v) => setDrivingForm({ ...drivingForm, scheduledDate: v })}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <div className="grid grid-cols-2 gap-2">
                  <LabelInput
                    field="DrivingStart"
                    label={isAr ? 'من' : isEn ? 'Start' : 'Début'}
                    type="time"
                    value={drivingForm.startTime}
                    onChange={(v) => setDrivingForm({ ...drivingForm, startTime: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                  <LabelInput
                    field="DrivingEnd"
                    label={isAr ? 'إلى' : isEn ? 'End' : 'Fin'}
                    type="time"
                    value={drivingForm.endTime}
                    onChange={(v) => setDrivingForm({ ...drivingForm, endTime: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LabelInput
                    field="DrivingHours"
                    label={isAr ? 'الساعات' : isEn ? 'Hours' : 'Heures'}
                    type="number"
                    value={drivingForm.hoursLogged}
                    onChange={(v) => setDrivingForm({ ...drivingForm, hoursLogged: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                  <LabelSelect
                    field="DrivingExamResult"
                    label={isAr ? 'النتيجة' : isEn ? 'Result' : 'Résultat'}
                    value={drivingForm.examResult}
                    onChange={(v) => setDrivingForm({ ...drivingForm, examResult: v as 'pending' | 'passed' | 'failed' | 'absent' })}
                    options={[
                      { value: 'pending', label: isAr ? 'قيد الانتظار' : isEn ? 'Pending' : 'En attente' },
                      { value: 'passed', label: isAr ? 'ناجح' : isEn ? 'Passed' : 'Admis' },
                      { value: 'failed', label: isAr ? 'مؤجل / راسب' : isEn ? 'Failed' : 'Ajourné' },
                      { value: 'absent', label: isAr ? 'غائب' : isEn ? 'Absent' : 'Absent' },
                    ]}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <Button tone="accent" size={40} type="submit" className="w-full" disabled={drivingConflictPreview.hasConflict}>
                  {isAr ? 'حفظ حصة السياقة / الامتحان' : isEn ? 'Save Driving Log' : 'Enregistrer séance / examen'}
                </Button>
              </form>
            </div>

            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-5 space-y-4 lg:col-span-2">
              <div className="font-semibold text-black dark:text-white">
                {isAr ? 'متابعة المترشحين والامتحانات (قانون / كرينو / طريق)' : isEn ? 'Candidate Progress & Exam Log' : 'Suivi Candidats & Examens (Code · Créneau · Conduite)'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eduStudents.slice(0, 6).map((st) => {
                  const prog = summarizeDrivingStudentProgress(eduDrivingLogs, st.id);
                  return (
                    <div key={st.id} data-sq="ctl" data-sq-border="solid" className="p-3 bg-[#FBF9F6] dark:bg-[#191716] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold t-small text-black dark:text-white truncate">{st.fullName}</span>
                        <span className="tabular-nums t-cap font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                          {prog.totalDrivingHours}h / 20h
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap t-cap">
                        <span className={prog.codePassed ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-black/50 dark:text-white/50'}>
                          Code: {prog.codePassed ? 'OK' : '—'}
                        </span>
                        <span className={prog.circuitPassed ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-black/50 dark:text-white/50'}>
                          {isAr ? 'الكرينو' : isEn ? 'Circuit' : 'Créneau'}: {prog.circuitPassed ? 'OK' : '—'}
                        </span>
                        <span className={prog.roadPassed ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-black/50 dark:text-white/50'}>
                          {isAr ? 'الطريق' : isEn ? 'Road' : 'Conduite'}: {prog.roadPassed ? 'OK' : '—'}
                        </span>
                        {prog.readyForRoadExam && (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            · {isAr ? 'جاهز للطريق' : isEn ? 'Road Ready' : 'Prêt Conduite'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto">
                {eduDrivingLogs.length === 0 ? (
                  <div className="p-6 text-center t-small text-black/55 dark:text-white/55">
                    {isAr ? 'لا توجد سجلات سياقة مسجلة بعد.' : isEn ? 'No driving logs recorded yet.' : 'Aucune séance ou examen enregistré.'}
                  </div>
                ) : (
                  eduDrivingLogs.map((log) => (
                    <div key={log.id} data-sq="ctl" data-sq-border="solid" className="p-3 bg-[#FBF9F6] dark:bg-[#191716] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold t-small text-black dark:text-white">
                          {log.studentName} · <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{log.logKind}</span>
                        </div>
                        <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                          {log.scheduledDate} · {log.startTime}-{log.endTime} · {log.vehicleLabel || '—'} ({log.hoursLogged}h) · {log.instructorName}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          tone={log.examResult === 'passed' ? 'accent' : 'soft'}
                          size={32}
                          onClick={() => updateEduDrivingLog(log.id, { examResult: 'passed' })}
                        >
                          {isAr ? 'ناجح' : isEn ? 'Pass' : 'Admis'}
                        </Button>
                        <Button
                          tone={log.examResult === 'failed' ? 'danger' : 'soft'}
                          size={32}
                          onClick={() => updateEduDrivingLog(log.id, { examResult: 'failed' })}
                        >
                          {isAr ? 'مؤجل' : isEn ? 'Fail' : 'Ajourné'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeMode === 'k12' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-4">
              <div className="t-cap text-black/55 dark:text-white/55">{isAr ? 'النقل المدرسي' : isEn ? 'Transport Plans' : 'Transport Scolaire'}</div>
              <div className="text-xl font-bold text-black dark:text-white tabular-nums">{k12Summary.activeTransportCount}</div>
            </div>
            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-4">
              <div className="t-cap text-black/55 dark:text-white/55">{isAr ? 'الإطعام المدرسي' : isEn ? 'Canteen Plans' : 'Cantine & Demi-pension'}</div>
              <div className="text-xl font-bold text-black dark:text-white tabular-nums">{k12Summary.activeCanteenCount}</div>
            </div>
            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-4">
              <div className="t-cap text-black/55 dark:text-white/55">{isAr ? 'تسجيل الحضور اليوم' : isEn ? 'Checked In Today' : 'Pointages du Jour'}</div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{k12Summary.checkedInTodayCount}</div>
            </div>
            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-4">
              <div className="t-cap text-black/55 dark:text-white/55">{isAr ? 'العائد الشهري' : isEn ? 'Monthly Recurring' : 'Mensuel K-12'}</div>
              <div className="text-xl font-bold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                {k12Summary.monthlyRecurringDzd.toLocaleString()} DZD
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-5 space-y-3 lg:col-span-1">
              <div className="flex items-center gap-2 font-semibold text-black dark:text-white">
                {k12Form.serviceType === 'transport' ? <Bus size={18} /> : <Utensils size={18} />}
                <span>{t('edu_tab_k12_services')}</span>
              </div>
              <form onSubmit={handleSaveK12Service} className="space-y-3">
                <LabelSelect
                  field="K12Student"
                  label={t('edu_col_student')}
                  value={k12Form.studentId}
                  onChange={(v) => setK12Form({ ...k12Form, studentId: v })}
                  options={eduStudents.map((st) => ({ value: st.id, label: st.fullName }))}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelSelect
                  field="K12Type"
                  label={isAr ? 'نوع الخدمة' : isEn ? 'Service Type' : 'Type de service'}
                  value={k12Form.serviceType}
                  onChange={(v) => setK12Form({ ...k12Form, serviceType: v as 'canteen' | 'transport' })}
                  options={[
                    { value: 'transport', label: isAr ? 'النقل المدرسي (الحافلة)' : isEn ? 'School Bus Transport' : 'Transport Scolaire' },
                    { value: 'canteen', label: isAr ? 'المطعم المدرسي' : isEn ? 'Canteen Meal Plan' : 'Cantine Scolaire' },
                  ]}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="K12PlanName"
                  label={isAr ? 'الباقة / الاشتراك' : isEn ? 'Plan Name' : 'Formule'}
                  value={k12Form.planName}
                  onChange={(v) => setK12Form({ ...k12Form, planName: v })}
                  width="100%"
                  height={40}
                  corner={12}
                  required
                />
                <LabelInput
                  field="K12Route"
                  label={isAr ? 'المسار أو النظام الغذائي' : isEn ? 'Route or Diet' : 'Circuit ou Régime'}
                  value={k12Form.routeOrDiet}
                  onChange={(v) => setK12Form({ ...k12Form, routeOrDiet: v })}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <div className="grid grid-cols-2 gap-2">
                  <LabelInput
                    field="K12Stop"
                    label={isAr ? 'محطة التوقف' : isEn ? 'Pickup Stop' : 'Arrêt'}
                    value={k12Form.pickupStop}
                    onChange={(v) => setK12Form({ ...k12Form, pickupStop: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                  <LabelInput
                    field="K12Fee"
                    label={isAr ? 'الرسم الشهري (دج)' : isEn ? 'Monthly Fee (DZD)' : 'Tarif Mensuel (DZD)'}
                    type="number"
                    value={k12Form.monthlyFeeDzd}
                    onChange={(v) => setK12Form({ ...k12Form, monthlyFeeDzd: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <Button tone="accent" size={40} type="submit" className="w-full">
                  {isAr ? 'تفعيل الخدمة للطالب' : isEn ? 'Assign K-12 Service' : 'Affecter Service K-12'}
                </Button>
              </form>
            </div>

            <div data-sq="card" data-sq-border="solid" className="bg-white dark:bg-[#22201E] p-5 space-y-3 lg:col-span-2">
              <div className="font-semibold text-black dark:text-white">
                {isAr ? 'قوائم النقل والمطعم اليومية' : isEn ? 'Active K-12 Subscriptions & Daily Check-In' : 'Abonnements Cantine & Ramassage Scolaire'}
              </div>
              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {eduK12Services.length === 0 ? (
                  <div className="p-6 text-center t-small text-black/55 dark:text-white/55">
                    {isAr ? 'لا توجد اشتراكات نقل أو مطعم حالياً.' : isEn ? 'No K-12 canteen or transport services yet.' : 'Aucun abonnement cantine ou transport enregistré.'}
                  </div>
                ) : (
                  eduK12Services.map((svc) => (
                    <div key={svc.id} data-sq="ctl" data-sq-border="solid" className="p-3 bg-[#FBF9F6] dark:bg-[#191716] flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2">
                          {svc.serviceType === 'transport' ? <Bus size={14} /> : <Utensils size={14} />}
                          <span>{svc.studentName}</span>
                          <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">· {svc.planName}</span>
                        </div>
                        <div className="t-cap text-black/55 dark:text-white/55">
                          {svc.routeOrDiet || '—'} {svc.pickupStop ? `· ${svc.pickupStop}` : ''} · {centimesToDzd(svc.monthlyFeeCentimes).toLocaleString()} DZD/mois
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          tone={svc.checkInToday ? 'accent' : 'soft'}
                          size={32}
                          onClick={() => toggleK12ServiceCheckIn(svc.id)}
                        >
                          {svc.checkInToday ? (isAr ? 'حاضر اليوم ✓' : isEn ? 'Checked In ✓' : 'Pointé ✓') : (isAr ? 'تسجيل اليوم' : isEn ? 'Check In' : 'Pointer')}
                        </Button>
                        <Button
                          tone="soft"
                          size={32}
                          onClick={() =>
                            upsertEduK12Service({
                              ...svc,
                              status: svc.status === 'active' ? 'paused' : 'active',
                            })
                          }
                        >
                          {svc.status === 'active' ? (isAr ? 'إيقاف' : isEn ? 'Pause' : 'Pause') : (isAr ? 'تفعيل' : isEn ? 'Activate' : 'Activer')}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
      <>
      <ScreenKpiBanner
        heading={isAr ? 'تخطيط واستخدام القاعات' : isEn ? 'Timetable & Classroom Utilization' : 'Planning & Utilisation des Espaces'}
        language={language}
        primaryCard={{
          label: isAr ? 'الحصص المبرمجة' : isEn ? 'Scheduled Sessions' : 'Séances Planifiées',
          count: filteredSessions.length,
          badgeText: `${eduSessions.length} total`,
          tone: 'emerald',
          isActive: selectedClassroomId === 'all',
          onToggle: () => setSelectedClassroomId('all'),
        }}
        secondaryCard={{
          label: isAr ? 'القاعات والورشات' : isEn ? 'Classrooms' : 'Salles & Ateliers',
          count: eduClassrooms.length,
          badgeText: '100% actives',
          tone: 'terracotta',
        }}
        darkCard={{
          label: isAr ? 'سلامة الجدول الزمني' : isEn ? 'Schedule Integrity' : 'Intégrité des Horaires',
          valueCount: conflicts.size,
          valueSuffix: conflicts.size === 0 ? ' Conflit' : ' Alertes',
          badgeCount: filteredSessions.length,
          badgeSuffix: isAr ? ' حصة' : ' séances',
          caption: conflicts.size === 0 ? 'Zéro conflit salle ou formateur' : 'Ajustement de planning requis',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'جدول الحصص والقاعات التدريبية' : isEn ? 'Master Timetable' : 'Grille Générale des Séances & Horaires'}
          liveRegionText={`${sortedSessions.length} ${isAr ? 'حصة' : 'séances'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث بالفوج، القاعة، المدرب...'
              : isEn
              ? 'Search topic, cohort, classroom, instructor...'
              : 'Rechercher matière, cohorte, salle, formateur...'
          }
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          showCalendarToggle
          onViewModeChange={(m) => setViewMode(m)}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setSelectedClassroomId('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<EduSession>
          hideToolbar
          items={sortedSessions}
          keyExtractor={(s) => s.id}
          viewMode={viewMode}
          defaultViewMode="calendar"
          showCalendarToggle
          onViewModeChange={(m: 'list' | 'grid' | 'calendar') => setViewMode(m)}
          renderCalendarView={renderCalendarGrid}
          columns={sessionColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          openItemId={activeSession?.id ?? null}
          selectedIds={selectedSessionIds}
          onSelectionChange={setSelectedSessionIds}
          pinnedIds={pinnedSessionIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedSessionIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(s, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedSession(s);
            setInspectorTab('seance');
          }}
          onViewDetails={(s, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedSession(s);
            setInspectorTab('seance');
          }}
          getRowMeta={getSessionRowMeta}
          getFanActions={getSessionFanActions}
          getDetailActions={getSessionDetailActions}
          onDelete={(s) => {
            deleteEduSession(s.id);
            if (selectedSession?.id === s.id) setSelectedSession(null);
          }}
          customActions={(s) => [
            {
              id: 'rollcall',
              tooltip: isAr ? 'مناداة الحضور' : 'Feuille d’Émargement',
              icon: <ClipboardList size={13} />,
              iconColor: '#d4522f',
              onClick: () => {
                setRollCallSession(s);
                setIsRollCallOpen(true);
              },
            },
            {
              id: 'print',
              tooltip: isAr ? 'طباعة المحضر' : 'Imprimer Liste',
              icon: <Printer size={13} />,
              onClick: () => openAttendanceSheetPrint([s]),
            },
          ]}
          bulkSecondaryAction={{
            label: isAr ? 'مناداة الحضور' : 'Feuille d’émargement',
            icon: <ClipboardList size={14} />,
            onClick: (ids) => {
              const resolved = resolveBatchSelection(Array.from(ids), sortedSessions, (s) => s.id, 100);
              if (resolved.selectedItems.length === 0) {
                showToast({
                  type: 'warning',
                  title: isAr ? 'لا توجد حصص' : isEn ? 'No sessions selected' : 'Aucune séance sélectionnée',
                  message: isAr ? 'اختر حصة واحدة على الأقل للطباعة.' : 'Sélectionnez au moins une séance valide.',
                });
                return;
              }
              openAttendanceSheetPrint(
                resolved.selectedItems,
                resolved.truncatedCount > 0 ? `Limité à 100 feuilles (${resolved.truncatedCount} ignorées).` : undefined
              );
            },
          }}
          onBulkDelete={(ids) => {
            if (ids.size === 0) return;
            runUndoBatch(
              {
                vertical: 'education_cohort',
                operationType: 'bulk',
                affectedCount: ids.size,
                summary: isAr
                  ? `حذف حصص (${ids.size})`
                  : isEn
                  ? `Delete sessions (${ids.size})`
                  : `Suppression séances (${ids.size})`,
              },
              () => {
                ids.forEach((id) => deleteEduSession(id));
              }
            );
            setSelectedSessionIds(new Set<string>());
            if (selectedSession && ids.has(selectedSession.id)) setSelectedSession(null);
          }}
        />
      </ScreenPod>
      </>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedSessions.length}
        entityPluralLabel={isAr ? 'حصة' : isEn ? 'sessions' : 'séances'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setSelectedClassroomId('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<EduSession>
        isOpen={Boolean(activeSession)}
        item={activeSession}
        allItems={sortedSessions}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeSession ? `${activeSession.date} · ${activeSession.startTime}` : ''}
        subtitle={activeSession?.cohortName || ''}
        categoryLabel={activeSession?.classroomName || 'Salle'}
        avatarText={(activeSession?.cohortName || 'SE').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeSession ? resolveRecordBranch(activeSession, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeSession && conflicts.has(activeSession.id) ? 'Conflit' : 'Planifiée'}
        statusClassName={
          activeSession && conflicts.has(activeSession.id)
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
        }
        tabs={[
          { id: 'seance', label: isAr ? 'تفاصيل الحصة' : 'Séance & Cours' },
          { id: 'salle', label: isAr ? 'القاعة والتجهيزات' : 'Salle & Capacité' },
          { id: 'emargement', label: isAr ? 'ورقة الحضور' : 'Émargement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={(id) => setInspectorTab(id as 'seance' | 'salle' | 'emargement')}
        onSelectItem={(s) => {
          setSelectedSession(s);
          setInspectorTab('seance');
        }}
        onClose={() => setSelectedSession(null)}
        onDelete={(s) => {
          deleteEduSession(s.id);
          setSelectedSession(null);
        }}
        renderBody={(sess, tab) => {
          if (tab === 'salle') {
            return (
              <InspectorSection index={0} title="Espace Pédagogique Assigné">
                <InspectorCard>
                  <InspectorKeyValue label="Salle de cours" value={sess.classroomName || 'Salle A1'} mono={false} />
                  <InspectorKeyValue
                    label="Équipements"
                    value="Vidéoprojecteur HD, Tableau blanc, Wi-Fi"
                    mono={false}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (tab === 'emargement') {
            return (
              <>
                <InspectorSection index={0} title="Appel & Présences Étudiants">
                  <InspectorCard>
                    <InspectorKeyValue label="Cohorte" value={sess.cohortName || '—'} mono={false} />
                    <InspectorKeyValue label="Créneau" value={`${sess.date} · ${sess.startTime} - ${sess.endTime}`} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label="Lancer l'Appel des Présences"
                    icon={<ClipboardList size={15} />}
                    tone="accent"
                    onClick={() => {
                      setRollCallSession(sess);
                      setIsRollCallOpen(true);
                    }}
                  />
                </InspectorSection>
                <InspectorSection index={2}>
                  <InspectorWideButton
                    label={isAr ? 'طباعة ورقة الحضور' : 'Imprimer Feuille d’Émargement'}
                    icon={<Printer size={15} />}
                    tone="neutral"
                    onClick={() => openAttendanceSheetPrint([sess])}
                  />
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'rollcall',
                      label: isAr ? 'مناداة الحضور' : 'Faire l’Appel',
                      icon: <ClipboardList size={16} />,
                      primary: true,
                      onClick: () => {
                        setRollCallSession(sess);
                        setIsRollCallOpen(true);
                      },
                    },
                    {
                      id: 'print',
                      label: isAr ? 'طباعة المحضر' : 'Imprimer',
                      icon: <Printer size={16} />,
                      onClick: () => openAttendanceSheetPrint([sess]),
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title="Fiche Pédagogique">
                <InspectorCard>
                  <InspectorKeyValue label="Promotion / Cohorte" value={sess.cohortName || '—'} mono={false} />
                  <InspectorKeyValue label="Date" value={sess.date} />
                  <InspectorKeyValue label="Créneau" value={`${sess.startTime} - ${sess.endTime}`} />
                  <InspectorKeyValue label="Formateur" value={sess.instructorName || '—'} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2} title="Sujet / Module Traité">
                <InspectorCard>
                  <InspectorKeyValue
                    label="Thème"
                    value={sess.topic || 'Séance magistrale et travaux pratiques dirigés.'}
                    mono={false}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticModalShell
        isOpen={isAddSessionModalOpen}
        onClose={() => setIsAddSessionModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-5 max-h-[92vh] overflow-y-auto"
        >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <h3 className="font-semibold t-card text-black dark:text-white">{t('edu_btn_add_session')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            <form onSubmit={handleCreateSession} className="space-y-4">
              {sessionConflictPreview.hasConflict && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 t-small font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>
                    {sessionConflictPreview.reasonCode}
                    {sessionConflictPreview.conflictingSession
                      ? ` · ${sessionConflictPreview.conflictingSession.cohortName} (${sessionConflictPreview.conflictingSession.startTime}-${sessionConflictPreview.conflictingSession.endTime})`
                      : ''}
                  </span>
                </div>
              )}
              <LabelSelect
                field="Cohort"
                label={t('edu_label_cohort')}
                value={formData.cohortId}
                onChange={(v) => setFormData({ ...formData, cohortId: v })}
                options={eduCohorts.map((c) => ({ value: c.id, label: c.name }))}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="SessionInstructor"
                label={t('edu_field_instructor')}
                value={formData.instructorId}
                onChange={(v) => setFormData({ ...formData, instructorId: v })}
                options={staff.map((st) => ({ value: st.id, label: st.fullName }))}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="Classroom"
                label={t('edu_field_classroom')}
                value={formData.classroomId}
                onChange={(v) => setFormData({ ...formData, classroomId: v })}
                options={eduClassrooms.map((r) => ({
                  value: r.id,
                  label: `${r.name} (Cap: ${r.capacity})`,
                }))}
                width="100%"
                height={40}
                corner={12}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="SessionDate"
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(v) => setFormData({ ...formData, date: v })}
                  width="100%"
                  height={40}
                  corner={12}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <LabelInput
                    field="StartTime"
                    label={isAr ? 'البداية' : isEn ? 'Start' : 'Début'}
                    type="time"
                    value={formData.startTime}
                    onChange={(v) => setFormData({ ...formData, startTime: v })}
                    width="100%"
                    height={40}
                    corner={12}
                    required
                  />
                  <LabelInput
                    field="EndTime"
                    label={isAr ? 'النهاية' : isEn ? 'End' : 'Fin'}
                    type="time"
                    value={formData.endTime}
                    onChange={(v) => setFormData({ ...formData, endTime: v })}
                    width="100%"
                    height={40}
                    corner={12}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="SessionVehicleId"
                  label={isAr ? 'معرف المركبة (اختياري)' : isEn ? 'Vehicle ID (optional)' : 'ID Véhicule (optionnel)'}
                  value={formData.vehicleId}
                  onChange={(v) => setFormData({ ...formData, vehicleId: v })}
                  placeholder="VEH-01"
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="SessionVehicleLabel"
                  label={isAr ? 'اسم المركبة' : isEn ? 'Vehicle Label' : 'Véhicule'}
                  value={formData.vehicleLabel}
                  onChange={(v) => setFormData({ ...formData, vehicleLabel: v })}
                  placeholder="Clio 5"
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-3 bg-[#F3EDE7] dark:bg-[#22201E] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="t-small font-medium text-black dark:text-white">
                    {isAr ? 'تسجيل ساعات الأستاذ المتعاقد تلقائياً' : isEn ? 'Auto-log Vacataire Hourly Pay' : 'Enregistrer Vacation Horaire'}
                  </span>
                  <LiveSwitch
                    checked={formData.isVacataire}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVacataire: checked })}
                    aria-label="Vacataire Auto Log"
                  />
                </div>
                {formData.isVacataire && (
                  <LabelInput
                    field="VacataireHourlyRate"
                    label={isAr ? 'الأجر الساعي (دج)' : isEn ? 'Hourly Rate (DZD)' : 'Taux Horaire (DZD)'}
                    type="number"
                    value={formData.hourlyRateDzd}
                    onChange={(v) => setFormData({ ...formData, hourlyRateDzd: v })}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                )}
              </div>
              <LabelInput
                field="SessionTopic"
                label={isAr ? 'الموضوع / المحور' : isEn ? 'Module / Course Topic' : 'Module / Thème du cours'}
                value={formData.topic}
                onChange={(v) => setFormData({ ...formData, topic: v })}
                placeholder={isAr ? 'مثال: برمجة الويب المتقدمة' : isEn ? 'e.g. Advanced Web Programming' : 'Ex: Programmation Web Avancée'}
                width="100%"
                height={40}
                corner={12}
              />
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--atr-divider)]">
                <Button tone="soft" size={40} type="button" onClick={() => setIsAddSessionModalOpen(false)}>
                  {t('common_cancel')}
                </Button>
                <Button tone="accent" size={40} type="submit" disabled={sessionConflictPreview.hasConflict}>
                  {isAr ? 'إضافة إلى الجدول' : isEn ? 'Add to Schedule' : 'Ajouter au Planning'}
                </Button>
              </div>
            </form>
            </div>
      </KineticModalShell>

      <RollCallModal
        isOpen={isRollCallOpen && Boolean(rollCallSession)}
        session={rollCallSession}
        onClose={() => {
          setIsRollCallOpen(false);
          setRollCallSession(null);
        }}
      />

      <PrintSheetModal
        isOpen={Boolean(attendancePrintState)}
        onClose={() => setAttendancePrintState(null)}
        language={language}
        format="a4"
        title={isAr ? 'أوراق الحضور الرسمية' : isEn ? 'Official Attendance Sheets' : 'Feuilles d’émargement'}
        subtitle={`${attendancePrintState?.pages.length || 0} ${isAr ? 'حصص' : isEn ? 'sessions' : 'séances'}`}
        pages={attendancePrintState?.pages || []}
        warningBanner={attendancePrintState?.warning}
      />
    </div>
  );
};
