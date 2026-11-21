import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Stethoscope,
  UserCheck,
  XCircle,
  Pin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useMedicalData } from './medicalData';
import { MedicalAppointmentModal } from './MedicalAppointmentModal';
import { MedicalAppointmentSlot } from '../../../types';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonSchedulerView } from '../../ui/skeleton/StructuralSkeletons';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
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

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'RD').slice(0, 2).toUpperCase();
};

const getAptStatusClassName = (status: string): string => {
  switch (status) {
    case 'InRoom':
    case 'Completed':
      return 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
    case 'Arrived':
      return 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';
    case 'Cancelled':
    case 'NoShow':
      return 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]';
    default:
      return 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]';
  }
};

export const MedicalAgendaView: React.FC<any> = () => {
  const { language, currentBranch, branches, isSyncing, networkMode, retryCloudSync } =
    useAtriumStore();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    practitioners,
    appointments,
    patients,
    consultations,
    addAppointment,
    updateAppointmentStatus,
  } = useMedicalData();

  const [selectedDate, setSelectedDate] = useState('2026-05-10');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('calendar');
  const [sortBy, setSortBy] = useState<string>('startTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast({
          type: 'info',
          title: nowPinned ? (isAr ? 'تم التثبيت' : 'RDV Épinglé') : (isAr ? 'تم إلغاء التثبيت' : 'RDV Désépinglé'),
          message: nowPinned ? (isAr ? 'تمت إضافة الموعد للأعلى' : 'Rendez-vous maintenu en tête') : (isAr ? 'تمت الإزالة من الأعلى' : 'Rendez-vous retiré des épinglés'),
        });
        return next;
      });
    },
    [isAr]
  );

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeSlotData, setActiveSlotData] = useState<{ doctorId?: string; time?: string }>({});

  const [inspectedApt, setInspectedApt] = useState<MedicalAppointmentSlot | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('details');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const getAptBranchName = useCallback(
    (apt: MedicalAppointmentSlot) => {
      const patient = patients.find((p) => p.id === apt.patientId);
      return resolveRecordBranch(patient || apt, branchesById, currentBranch, language).name;
    },
    [patients, branchesById, currentBranch, language]
  );

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    appointments.forEach((a) => {
      const bName = getAptBranchName(a);
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [appointments, getAptBranchName]);

  const activeApt = useMemo(() => {
    if (!inspectedApt) return null;
    return appointments.find((a) => a.id === inspectedApt.id) || null;
  }, [inspectedApt, appointments]);

  const activePractitioners = useMemo(
    () =>
      selectedDoctorFilter === 'All'
        ? practitioners
        : practitioners.filter((p) => p.id === selectedDoctorFilter),
    [practitioners, selectedDoctorFilter]
  );

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 8; h < 18; h++) {
      const hourStr = h.toString().padStart(2, '0');
      if (slotIntervalMinutes === 15) {
        slots.push(`${hourStr}:00`, `${hourStr}:15`, `${hourStr}:30`, `${hourStr}:45`);
      } else if (slotIntervalMinutes === 30) {
        slots.push(`${hourStr}:00`, `${hourStr}:30`);
      } else {
        slots.push(`${hourStr}:00`, `${hourStr}:45`);
      }
    }
    return slots;
  }, [slotIntervalMinutes]);

  const handleOpenBooking = useCallback((doctorId?: string, time?: string) => {
    setActiveSlotData({ doctorId, time });
    setIsBookingModalOpen(true);
  }, []);

  const shiftDate = useCallback(
    (days: number) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + days);
      setSelectedDate(d.toISOString().slice(0, 10));
    },
    [selectedDate]
  );

  const handleInspectApt = useCallback(
    (apt: MedicalAppointmentSlot, opener?: HTMLElement | null) => {
      if (opener) setDrawerOpenerEl(opener);
      setInspectedApt(apt);
      setInspectorTab('details');
    },
    []
  );

  const handleStatusChange = useCallback(
    (apt: MedicalAppointmentSlot, nextStatus: MedicalAppointmentSlot['status']) => {
      updateAppointmentStatus(apt.id, nextStatus);
    },
    [updateAppointmentStatus]
  );

  const bookedCount = useMemo(
    () => appointments.filter((a) => a.status === 'Booked').length,
    [appointments]
  );
  const activeCareCount = useMemo(
    () => appointments.filter((a) => a.status === 'Arrived' || a.status === 'InRoom').length,
    [appointments]
  );
  const completedCount = useMemo(
    () => appointments.filter((a) => a.status === 'Completed').length,
    [appointments]
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (selectedDoctorFilter !== 'All' && a.doctorId !== selectedDoctorFilter) return false;
      if (branchFilter !== 'All' && getAptBranchName(a) !== branchFilter) return false;
      if (statusFilter === 'Booked' && a.status !== 'Booked') return false;
      if (statusFilter === 'Active' && a.status !== 'Arrived' && a.status !== 'InRoom') return false;
      if (statusFilter === 'Completed' && a.status !== 'Completed') return false;
      if (
        statusFilter !== 'All' &&
        statusFilter !== 'Booked' &&
        statusFilter !== 'Active' &&
        statusFilter !== 'Completed' &&
        a.status !== statusFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPatient = a.patientName.toLowerCase().includes(q);
        const matchDoctor = a.doctorName.toLowerCase().includes(q);
        const matchReason = a.reason.toLowerCase().includes(q);
        if (!matchPatient && !matchDoctor && !matchReason) return false;
      }
      return true;
    });
  }, [
    appointments,
    selectedDoctorFilter,
    branchFilter,
    statusFilter,
    searchQuery,
    getAptBranchName,
  ]);

  const sortedAppointments = useMemo(() => {
    const list = [...filteredAppointments];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'patientName') {
        cmp = a.patientName.localeCompare(b.patientName);
      } else if (sortBy === 'doctorName') {
        cmp = a.doctorName.localeCompare(b.doctorName);
      } else if (sortBy === 'branch') {
        cmp = getAptBranchName(a).localeCompare(getAptBranchName(b));
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else {
        cmp = `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredAppointments, pinnedIds, sortBy, sortDir, getAptBranchName]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Date',
      'Time',
      'Duration (min)',
      'Patient',
      'Doctor',
      'Branch',
      'Reason',
      'Status',
    ];
    const rows = sortedAppointments.map((a) => [
      a.id,
      a.date,
      a.startTime,
      a.durationMinutes,
      a.patientName,
      a.doctorName,
      getAptBranchName(a),
      a.reason,
      a.status,
    ]);
    downloadCsvSafe(`medical_agenda_${selectedDate}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تم التصدير' : isFr ? 'Export terminé' : 'Export Complete',
      message: isAr ? 'تم تصدير جدول المواعيد' : 'Export agenda CSV généré',
    });
  }, [sortedAppointments, selectedDate, getAptBranchName, isAr, isFr]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedDoctorFilter('All');
    setStatusFilter('All');
    setBranchFilter('All');
  }, []);

  const activeFiltersCount =
    (selectedDoctorFilter !== 'All' ? 1 : 0) +
    (statusFilter !== 'All' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedDoctorFilter !== 'All') {
      const doc = practitioners.find((p) => p.id === selectedDoctorFilter);
      chips.push({
        key: 'doctor',
        label: doc?.fullName || selectedDoctorFilter,
        onRemove: () => setSelectedDoctorFilter('All'),
      });
    }
    if (statusFilter !== 'All') {
      chips.push({
        key: 'status',
        label: statusFilter,
        onRemove: () => setStatusFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [selectedDoctorFilter, statusFilter, branchFilter, practitioners, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'status',
        label: isAr ? 'حالة الموعد' : isFr ? 'Statut du RDV' : 'Appointment Status',
        value: statusFilter,
        onChange: setStatusFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All', count: appointments.length },
          { value: 'Booked', label: isAr ? 'محجوز' : 'Réservé', count: bookedCount },
          { value: 'Active', label: isAr ? 'حاضر/جاري' : 'Présent', count: activeCareCount },
          { value: 'Completed', label: isAr ? 'مكتمل' : 'Terminé', count: completedCount },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / العيادة' : isFr ? 'Branche / Clinique' : 'Branch / Clinic',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'جميع الفروع' : isFr ? 'Toutes' : 'All Branches',
            count: appointments.length,
          },
          ...Array.from(branchCounts.entries()).map(([name, count]) => ({
            value: name,
            label: name,
            count,
          })),
        ],
      },
      {
        id: 'doctor',
        label: isAr ? 'الطبيب المعالج' : isFr ? 'Praticien' : 'Practitioner',
        value: selectedDoctorFilter,
        onChange: setSelectedDoctorFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'جميع الأطباء' : isFr ? 'Tous les médecins' : 'All Doctors',
            count: practitioners.length,
          },
          ...practitioners.map((doc) => ({
            value: doc.id,
            label: doc.fullName,
            sublabel: `${doc.specialty} · ${doc.roomNumber}`,
          })),
        ],
      },
      {
        id: 'interval',
        label: isAr ? 'الفاصل الزمني' : isFr ? 'Granularité Créneau' : 'Slot Interval',
        value: String(slotIntervalMinutes),
        resetValue: '30',
        onChange: (val) => setSlotIntervalMinutes(Number(val) || 30),
        kind: 'segmented',
        options: [
          { value: '15', label: '15 min' },
          { value: '30', label: '30 min' },
          { value: '45', label: '45 min' },
        ],
      },
    ],
    [
      statusFilter,
      branchFilter,
      selectedDoctorFilter,
      slotIntervalMinutes,
      appointments.length,
      bookedCount,
      activeCareCount,
      completedCount,
      branchCounts,
      practitioners,
      isAr,
      isFr,
    ]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'InRoom':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
      case 'Arrived':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
      case 'Completed':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
      case 'Cancelled':
      case 'NoShow':
        return 'bg-red-500/15 text-red-700 dark:text-red-300';
      default:
        return 'bg-[#F3EDE7] dark:bg-[#2B2825] text-black/75 dark:text-white/80';
    }
  };

  const columns: ColumnDefinition<MedicalAppointmentSlot>[] = useMemo(
    () => [
      {
        key: 'startTime',
        header: isAr ? 'التوقيت' : 'Créneau',
        width: '1.4*',
        sortable: true,
        renderCell: (a) => (
          <div>
            <div className="tabular-nums font-semibold t-small text-black dark:text-white">
              {a.startTime}
            </div>
            <div className="t-cap tabular-nums text-black/55 dark:text-white/55">
              {a.date} · {a.durationMinutes}m
            </div>
          </div>
        ),
      },
      {
        key: 'patientName',
        header: isAr ? 'المريض' : 'Patient & Motif',
        width: '2.6*',
        sortable: true,
        renderCell: (a) => (
          <div className="min-w-0">
            <div className="font-semibold t-small text-black dark:text-white truncate">
              {a.patientName}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate max-w-[220px]">
              {a.reason}
            </div>
          </div>
        ),
      },
      {
        key: 'doctorName',
        header: isAr ? 'الطبيب' : 'Praticien',
        width: '2*',
        sortable: true,
        renderCell: (a) => (
          <div className="flex items-center gap-2 min-w-0">
            <Stethoscope size={12} className="text-[#0D9488] shrink-0" />
            <span className="t-small font-semibold text-black dark:text-white truncate">
              {a.doctorName}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.5*',
        sortable: true,
        renderCell: (a) => (
          <span className="t-small font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
            {getAptBranchName(a)}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut',
        width: '1.3*',
        sortable: true,
        renderCell: (a) => (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold ${getStatusBadge(
              a.status
            )}`}
          >
            {a.status}
          </span>
        ),
      },
    ],
    [getAptBranchName, isAr, isFr]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: appointments.length > 0 || practitioners.length > 0,
  });

  if (showSkeleton && ((appointments.length === 0 && practitioners.length === 0) || networkMode === 'force_skeleton')) {
    return (
      <SkeletonSchedulerView
        columnsCount={3}
        hasFacility={false}
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Calendar size={22} />}
        title={isAr ? 'الأجندة' : 'Agenda'}
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <div data-sq="ctl" data-sq-border="none" className="flex items-center bg-[#F5F1EC] dark:bg-[#2B2825] p-[3px]">
              <button
                type="button"
                data-no-liquid="true"
                data-sq="thumb"
                data-sq-border="none"
                onClick={() => shiftDate(-1)}
                className="p-2 hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B] text-black/70 dark:text-white/75 cursor-pointer"
                title={isAr ? 'اليوم السابق' : 'Jour précédent'}
                aria-label={isAr ? 'اليوم السابق' : 'Jour précédent'}
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label={isAr ? 'تاريخ الجدول' : 'Date du planning'}
                className="px-2 py-1 t-small font-semibold tabular-nums bg-transparent text-black dark:text-white border-0 focus:outline-hidden"
              />
              <button
                type="button"
                data-no-liquid="true"
                data-sq="thumb"
                data-sq-border="none"
                onClick={() => shiftDate(1)}
                className="p-2 hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B] text-black/70 dark:text-white/75 cursor-pointer"
                title={isAr ? 'اليوم التالي' : 'Jour suivant'}
                aria-label={isAr ? 'اليوم التالي' : 'Jour suivant'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div data-sq="ctl" data-sq-border="none" className="flex items-center gap-1 bg-[#F5F1EC] dark:bg-[#1D1B19] p-[3px] t-cap">
              {[15, 30, 45].map((interval) => (
                <button
                  key={interval}
                  type="button"
                  data-no-liquid="true"
                  data-sq="thumb"
                  data-sq-border="none"
                  onClick={() => setSlotIntervalMinutes(interval)}
                  className={`px-2 py-1 tabular-nums t-small font-semibold transition-all cursor-pointer ${
                    slotIntervalMinutes === interval
                      ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                      : 'text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {interval}m
                </button>
              ))}
            </div>
          </div>
        }
        primaryAction={{
          label: isAr ? 'موعد جديد' : isFr ? 'Nouveau RDV' : 'New Appointment',
          icon: <Plus size={15} strokeWidth={2.5} />,
          onClick: () => handleOpenBooking(undefined, undefined),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'تنظيم المواعيد والعيادات' : 'Pilotage des Plannings & Cabinets'}
        language={language}
        primaryCard={{
          label: isAr ? 'المواعيد المحجوزة' : 'Rendez-vous Planifiés',
          badgeText: isAr ? 'قريباً' : 'Confirmés',
          count: bookedCount,
          tone: 'terracotta',
          isActive: statusFilter === 'Booked',
          onToggle: () => setStatusFilter((prev) => (prev === 'Booked' ? 'All' : 'Booked')),
        }}
        secondaryCard={{
          label: isAr ? 'قيد الاستقبال / الفحص' : 'Présents & En Salle',
          badgeText: isAr ? 'نشط' : 'En cours',
          count: activeCareCount,
          tone: 'emerald',
          isActive: statusFilter === 'Active',
          onToggle: () => setStatusFilter((prev) => (prev === 'Active' ? 'All' : 'Active')),
        }}
        darkCard={{
          label: isAr ? 'مواعيد مكتملة' : 'Activité Multi-Praticiens',
          badgeCount: practitioners.length,
          badgeSuffix: isAr ? ' أطباء' : ' médecins',
          valueCount: appointments.length,
          valueSuffix: isAr ? ' موعد' : ' RDV',
          caption: `${completedCount} ${isAr ? 'مكتمل اليوم' : 'terminés · créneaux'} ${slotIntervalMinutes}m`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'جدول المواعيد الطبي' : 'Planning Multi-Praticiens'}
          liveRegionText={`${sortedAppointments.length} ${isAr ? 'موعد' : 'rendez-vous'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث بمريض أو طبيب أو سبب...' : 'Rechercher patient, médecin, motif...'
          }
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : 'Tous', count: appointments.length },
            { value: 'Booked', label: isAr ? 'محجوز' : 'Réservés', count: bookedCount },
            { value: 'Active', label: isAr ? 'جاري' : 'Actifs', count: activeCareCount },
            { value: 'Completed', label: isAr ? 'مكتمل' : 'Terminés', count: completedCount },
          ]}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle
          showCalendarToggle
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection
          hideToolbar
          items={sortedAppointments}
          keyExtractor={(a) => a.id}
          viewMode={viewMode}
          defaultViewMode="calendar"
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          openItemId={activeApt?.id ?? null}
          onItemClick={handleInspectApt}
          onViewDetails={handleInspectApt}
          isPinned={(a) => pinnedIds.has(a.id)}
          onTogglePin={(a) => handleTogglePin(a.id)}
          getRowMeta={(a): KineticRowMeta => ({
            isPinned: pinnedIds.has(a.id),
            title: a.patientName,
            subline: `${a.reason} · ${getAptBranchName(a)}`,
            avatarText: getInitials2(a.patientName),
            categoryLabel: a.doctorName,
            statusLabel: a.status,
            statusVariant:
              a.status === 'InRoom' || a.status === 'Completed'
                ? 'active'
                : a.status === 'Arrived'
                ? 'warning'
                : a.status === 'Cancelled' || a.status === 'NoShow'
                ? 'blocked'
                : 'info',
            metricPrimary: `${a.startTime} (${a.durationMinutes}m)`,
            metricSecondary: `${a.doctorName} · ${a.date}`,
            branchName: getAptBranchName(a),
            detailCol1: { heading: isAr ? 'الطبيب' : 'Praticien', primaryText: a.doctorName },
            detailCol2: { heading: isAr ? 'السبب' : 'Motif', primaryText: a.reason },
            detailCol3: { heading: isAr ? 'التاريخ' : 'Date & Créneau', primaryText: `${a.date} · ${a.startTime}` },
          })}
          getFanActions={(apt): KineticRowFanAction<MedicalAppointmentSlot>[] => {
            const actions: KineticRowFanAction<MedicalAppointmentSlot>[] = [];
            if (apt.status === 'Booked') {
              actions.push({
                id: 'arrived',
                label: isAr ? 'وصل' : 'Arrivé',
                icon: <UserCheck size={13} />,
                onClick: () => handleStatusChange(apt, 'Arrived'),
              });
            } else if (apt.status === 'Arrived') {
              actions.push({
                id: 'inroom',
                label: isAr ? 'دخول' : 'En Salle',
                icon: <Stethoscope size={13} />,
                onClick: () => handleStatusChange(apt, 'InRoom'),
              });
            } else if (apt.status === 'InRoom') {
              actions.push({
                id: 'complete',
                label: isAr ? 'إنهاء' : 'Terminer',
                icon: <CheckCircle2 size={13} />,
                onClick: () => handleStatusChange(apt, 'Completed'),
              });
            }
            actions.push({
              id: 'pin',
              label: pinnedIds.has(apt.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin size={13} className={pinnedIds.has(apt.id) ? 'fill-current' : ''} />,
              onClick: () => handleTogglePin(apt.id),
            });
            return actions;
          }}
          getDetailActions={(apt): KineticDetailAction[] => {
            const actions: KineticDetailAction[] = [];
            if (apt.status === 'Booked') {
              actions.push({
                id: 'arrived',
                label: isAr ? 'تسجيل الوصول' : 'Marquer Arrivé',
                icon: <UserCheck size={14} />,
                onClick: () => handleStatusChange(apt, 'Arrived'),
              });
            } else if (apt.status === 'Arrived') {
              actions.push({
                id: 'inroom',
                label: isAr ? 'إدخال الغرفة' : 'Entrée en Salle',
                icon: <Stethoscope size={14} />,
                onClick: () => handleStatusChange(apt, 'InRoom'),
              });
            }
            actions.push({
              id: 'pin',
              label: pinnedIds.has(apt.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin size={14} className={pinnedIds.has(apt.id) ? 'fill-current' : ''} />,
              onClick: () => handleTogglePin(apt.id),
            });
            return actions;
          }}
          renderCalendarView={() => (
            <div className="sq-elev-card">
              <div data-sq="table" data-sq-border="none" className="bg-white dark:bg-[#22201E] overflow-hidden">
              <div className="grid grid-cols-12 bg-[#F5F1EC] dark:bg-[#1D1B19] border-b border-[var(--atr-divider)]">
                <div className="col-span-2 sm:col-span-1 p-4 text-center t-small tabular-nums font-semibold text-black/55 dark:text-white/55 border-r border-[var(--atr-divider)]">
                  {isAr ? 'الوقت' : 'Heure'}
                </div>
                <div
                  className="col-span-10 sm:col-span-11 grid"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(1, activePractitioners.length)}, minmax(0, 1fr))`,
                  }}
                >
                  {activePractitioners.map((doc) => {
                    const waitingCount = consultations.filter(
                      (c) => c.status === 'InWaitingQueue' && c.staffId === doc.id
                    ).length;
                    return (
                      <div
                        key={doc.id}
                        className="p-4 border-r last:border-r-0 border-[var(--atr-divider)] flex items-center justify-between gap-2 min-w-0"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: doc.color }}
                            />
                            <span className="t-small font-semibold text-black dark:text-white truncate">
                              {doc.fullName}
                            </span>
                          </div>
                          <span className="t-cap text-black/55 dark:text-white/75 block truncate">
                            {doc.specialty} ·{' '}
                            <strong className="text-black/70 dark:text-white/75">
                              {doc.roomNumber}
                            </strong>
                          </span>
                        </div>
                        {waitingCount > 0 && (
                          <span
                            title={`File d'attente active : ${waitingCount} patient(s)`}
                            className="t-small font-semibold px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0"
                          >
                            +{waitingCount * 15}m
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="divide-y divide-[var(--atr-divider)] max-h-[600px] overflow-y-auto">
                {timeSlots.map((time) => (
                  <div
                    key={time}
                    className="grid grid-cols-12 min-h-[58px] hover:bg-[#F5F1EC]/50 dark:hover:bg-[#282523]/40 transition-colors"
                  >
                    <div className="col-span-2 sm:col-span-1 p-2 text-center t-small tabular-nums font-semibold text-black/55 dark:text-white/55 border-r border-[var(--atr-divider)] flex items-center justify-center">
                      {time}
                    </div>
                    <div
                      className="col-span-10 sm:col-span-11 grid"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(1, activePractitioners.length)}, minmax(0, 1fr))`,
                      }}
                    >
                      {activePractitioners.map((doc) => {
                        const matchApt = sortedAppointments.find(
                          (a) =>
                            a.doctorId === doc.id && a.date === selectedDate && a.startTime === time
                        );
                        return (
                          <div
                            key={doc.id}
                            className="p-2 border-r last:border-r-0 border-[var(--atr-divider)] relative group min-w-0"
                          >
                            {matchApt ? (
                              <div
                                data-sq="ctl"
                                data-sq-border="none"
                                className={`h-full p-2 flex flex-col justify-between transition-all ${getStatusBadge(
                                  matchApt.status
                                )}`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleInspectApt(matchApt, e.currentTarget)}
                                  className="text-left w-full cursor-pointer focus:outline-hidden"
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-semibold t-small truncate">
                                      {matchApt.patientName}
                                    </span>
                                    <span className="t-small tabular-nums px-2 py-1 rounded-full font-semibold bg-white/50 dark:bg-black/30 shrink-0">
                                      {matchApt.status}
                                    </span>
                                  </div>
                                  <p className="t-cap text-black/70 dark:text-white/75 truncate">
                                    {matchApt.reason}
                                  </p>
                                </button>
                                <div className="flex items-center justify-between t-cap mt-1 pt-1 border-t border-black/5 dark:border-white/5 tabular-nums">
                                  <span>{matchApt.durationMinutes} min</span>
                                  <div className="flex items-center gap-1">
                                    {matchApt.status === 'Booked' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(matchApt, 'Arrived')}
                                        className="t-small font-semibold px-2 py-1 rounded-full bg-amber-500 text-white cursor-pointer"
                                        title="Marquer comme arrivé en salle d'attente"
                                      >
                                        Arrivé
                                      </button>
                                    )}
                                    {matchApt.status === 'Arrived' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(matchApt, 'InRoom')}
                                        className="t-small font-semibold px-2 py-1 rounded-full bg-emerald-600 text-white cursor-pointer"
                                        title="Faire entrer en consultation"
                                      >
                                        En Salle
                                      </button>
                                    )}
                                    {matchApt.status === 'InRoom' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(matchApt, 'Completed')}
                                        className="t-small font-semibold px-2 py-1 rounded-full bg-blue-600 text-white cursor-pointer"
                                        title="Terminer consultation"
                                      >
                                        Terminé
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenBooking(doc.id, time)}
                                data-sq="ctl-sm"
                                data-sq-border="dashed"
                                className="h-full w-full min-h-[42px] [--sq-stroke:transparent] group-hover:[--sq-stroke:rgba(13,148,136,0.4)] hover:bg-[#0D9488]/5 flex items-center justify-center t-cap text-black/55 dark:text-white/55 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                              >
                                + {isAr ? 'حجز' : 'Réserver'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}
          emptyTitle={isAr ? 'لا توجد مواعيد' : 'Aucun rendez-vous planifié'}
          emptyDescription={
            isAr
              ? 'اختر توقيتاً في الجدول لحجز موعد جديد'
              : 'Cliquez sur un créneau ou ajustez vos filtres'
          }
          primaryActionLabel={isAr ? 'موعد جديد' : 'Nouveau RDV'}
          onAddFirstItem={() => handleOpenBooking(undefined, undefined)}
          onResetFilters={handleResetFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedAppointments.length}
        entityPluralLabel={isAr ? 'موعد' : 'rendez-vous'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={!!activeApt}
        item={activeApt}
        allItems={sortedAppointments}
        keyExtractor={(a) => a.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeApt?.patientName || ''}
        subtitle={
          activeApt ? `${activeApt.date} · ${activeApt.startTime} (${activeApt.durationMinutes}m)` : ''
        }
        avatarText={activeApt ? getInitials2(activeApt.patientName) : 'RD'}
        avatarColor="#d4522f"
        categoryLabel={isAr ? 'موعد طبي' : isFr ? 'RENDEZ-VOUS CLINIQUE' : 'APPOINTMENT'}
        branchName={activeApt ? getAptBranchName(activeApt) : ''}
        statusLabel={activeApt?.status || ''}
        statusClassName={activeApt ? getAptStatusClassName(activeApt.status) : undefined}
        tabs={[
          { id: 'details', label: isAr ? 'التفاصيل' : isFr ? 'Détails RDV' : 'Details' },
          { id: 'patient', label: isAr ? 'ملف المريض' : isFr ? 'Dossier' : 'Patient' },
          { id: 'actions', label: isAr ? 'تحديث الحالة' : isFr ? 'Workflow' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(apt) => handleInspectApt(apt)}
        onClose={() => setInspectedApt(null)}
        renderBody={(apt, tab) => {
          const patientRecord = patients.find((p) => p.id === apt.patientId);
          return (
            <div className="space-y-5">
              {tab === 'details' && (
                <>
                  <InspectorSection
                    title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}
                    index={0}
                  >
                    <InspectorQuickActions
                      actions={[
                        {
                          id: 'arrived',
                          label: isAr ? 'وصل' : 'Marquer Arrivé',
                          icon: <UserCheck size={15} />,
                          onClick: () => handleStatusChange(apt, 'Arrived'),
                        },
                        {
                          id: 'inroom',
                          label: isAr ? 'في الغرفة' : 'En Salle',
                          icon: <Stethoscope size={15} />,
                          onClick: () => handleStatusChange(apt, 'InRoom'),
                        },
                        {
                          id: 'new',
                          label: isAr ? 'حجز جديد' : 'Nouveau RDV',
                          icon: <Plus size={15} />,
                          onClick: () => handleOpenBooking(apt.doctorId, undefined),
                        },
                      ]}
                    />
                  </InspectorSection>

                  <InspectorSection
                    title={isAr ? 'تفاصيل الموعد' : 'Créneau & Praticien'}
                    index={1}
                  >
                    <InspectorCard>
                      <InspectorKeyValue label={isAr ? 'الطبيب' : 'Praticien'} value={apt.doctorName} />
                      <InspectorKeyValue label={isAr ? 'السبب' : 'Motif'} value={apt.reason} />
                      <InspectorKeyValue
                        label={isAr ? 'التوقيت' : 'Créneau'}
                        value={`${apt.date} · ${apt.startTime} (${apt.durationMinutes} min)`}
                        mono
                        isLast={!apt.patientPhone && !apt.notes}
                      />
                      {apt.patientPhone && (
                        <InspectorKeyValue
                          label={isAr ? 'الهاتف' : 'Téléphone'}
                          value={apt.patientPhone}
                          mono
                          isLast={!apt.notes}
                        />
                      )}
                      {apt.notes && (
                        <InspectorKeyValue
                          label={isAr ? 'ملاحظات' : 'Notes'}
                          value={apt.notes}
                          isLast
                        />
                      )}
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'patient' && (
                <InspectorSection
                  title={isAr ? 'ملف المريض المرتبط' : 'Fiche Patient Associée'}
                  index={0}
                >
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'الاسم' : 'Patient'} value={apt.patientName} />
                    <InspectorKeyValue
                      label={isAr ? 'الهاتف' : 'Téléphone'}
                      value={patientRecord?.phone || apt.patientPhone || '—'}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'فصيلة الدم' : 'Groupe Sanguin'}
                      value={patientRecord?.bloodGroup || 'O+'}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'بطاقة الشفاء' : 'NSS / Chifa'}
                      value={patientRecord?.nationalId || patientRecord?.chifaCardNumber || 'CHIFA-OK'}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الحساسيات' : 'Allergies'}
                      value={
                        patientRecord?.allergies?.length
                          ? patientRecord.allergies.join(', ')
                          : isAr
                          ? 'لا توجد'
                          : 'Aucune déclarée'
                      }
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              )}

              {tab === 'actions' && (
                <InspectorSection
                  title={isAr ? 'سير العمل' : "Workflow Salle d'Attente"}
                  index={0}
                >
                  <div className="space-y-2">
                    {(['Arrived', 'InRoom', 'Completed', 'Cancelled'] as const).map((nextSt) => (
                      <InspectorWideButton
                        key={nextSt}
                        label={
                          nextSt === 'Arrived'
                            ? 'Marquer Arrivé (Salle d’attente)'
                            : nextSt === 'InRoom'
                            ? 'Entrée en Salle de Consultation'
                            : nextSt === 'Completed'
                            ? 'Clôturer Consultation'
                            : 'Annuler le Rendez-vous'
                        }
                        icon={nextSt === 'Cancelled' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                        tone={
                          nextSt === 'Cancelled' ? 'dark' : nextSt === 'InRoom' ? 'accent' : 'neutral'
                        }
                        disabled={apt.status === nextSt}
                        onClick={() => handleStatusChange(apt, nextSt)}
                      />
                    ))}
                  </div>
                </InspectorSection>
              )}
            </div>
          );
        }}
      />

      <MedicalAppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        practitioners={practitioners}
        patients={patients}
        existingAppointments={appointments}
        onSaveAppointment={addAppointment}
        initialDoctorId={activeSlotData.doctorId}
        initialDate={selectedDate}
        initialTime={activeSlotData.time}
      />
    </div>
  );
};
