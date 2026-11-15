import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  CheckCircle2,
  Stethoscope,
  UserCheck,
  XCircle,
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

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
    },
    []
  );

  const handleStatusChange = useCallback(
    (apt: MedicalAppointmentSlot, nextStatus: MedicalAppointmentSlot['status']) => {
      updateAppointmentStatus(apt.id, nextStatus);
      showToast({
        type: 'success',
        title: isAr ? 'تم تحديث الموعد' : isFr ? 'Statut RDV mis à jour' : 'Status Updated',
        message: `${apt.patientName} → ${nextStatus}`,
      });
    },
    [updateAppointmentStatus, isAr, isFr]
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
  }, [filteredAppointments, sortBy, sortDir, getAptBranchName]);

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
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'Arrived':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'Completed':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'Cancelled':
      case 'NoShow':
        return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
      default:
        return 'bg-neutral-500/15 text-black/75 dark:text-white/80 border-neutral-500/30';
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
            <div className="font-mono font-bold text-xs text-black dark:text-white">
              {a.startTime}
            </div>
            <div className="text-[11px] font-mono text-black/55 dark:text-white/55">
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
            <div className="font-bold text-xs text-black dark:text-white truncate">
              {a.patientName}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 truncate max-w-[220px]">
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
          <div className="flex items-center gap-1.5 min-w-0">
            <Stethoscope size={12} className="text-[#0D9488] shrink-0" />
            <span className="text-xs font-semibold text-black dark:text-white truncate">
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
          <span className="text-xs font-medium text-black/70 dark:text-white/75 truncate block max-w-[140px]">
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
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
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
        subtitle={`Polyclinique · ${selectedDate}`}
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-black/70 dark:text-white/75 cursor-pointer"
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
                className="px-2 py-1 text-xs font-semibold font-mono bg-transparent text-black dark:text-white border-0 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-black/70 dark:text-white/75 cursor-pointer"
                title={isAr ? 'اليوم التالي' : 'Jour suivant'}
                aria-label={isAr ? 'اليوم التالي' : 'Jour suivant'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
              {[15, 30, 45].map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setSlotIntervalMinutes(interval)}
                  className={`px-2 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    slotIntervalMinutes === interval
                      ? 'bg-[#d4522f] text-white shadow-2xs'
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
          data={sortedAppointments}
          keyExtractor={(a) => a.id}
          defaultViewMode={viewMode}
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
          customActions={(apt) => {
            if (apt.status === 'Booked') {
              return [
                {
                  id: 'arrived',
                  label: isAr ? 'وصل' : 'Arrivé',
                  icon: <UserCheck size={13} />,
                  variant: 'primary',
                  onClick: () => handleStatusChange(apt, 'Arrived'),
                },
              ];
            }
            if (apt.status === 'Arrived') {
              return [
                {
                  id: 'inroom',
                  label: isAr ? 'دخول' : 'En Salle',
                  icon: <Stethoscope size={13} />,
                  variant: 'primary',
                  onClick: () => handleStatusChange(apt, 'InRoom'),
                },
              ];
            }
            return [];
          }}
          renderCard={(a) => (
            <div className="flex flex-col w-full space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-xs text-[#d4522f]">
                  {a.startTime} · {a.durationMinutes}m
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                    a.status
                  )}`}
                >
                  {a.status}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-black dark:text-white truncate">
                  {a.patientName}
                </h4>
                <p className="text-xs text-black/55 dark:text-white/55 truncate">{a.reason}</p>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
                <span className="truncate">{a.doctorName}</span>
                <span className="font-mono">{a.date}</span>
              </div>
            </div>
          )}
          renderCalendarView={() => (
            <div className="bg-white dark:bg-neutral-900 rounded-[24px] border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xs">
              <div className="grid grid-cols-12 bg-[#F3EDE7] dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
                <div className="col-span-2 sm:col-span-1 p-3.5 text-center text-[11px] font-mono font-bold text-black/55 dark:text-white/55 uppercase tracking-wider border-r border-neutral-200 dark:border-neutral-800">
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
                        className="p-3.5 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 min-w-0"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: doc.color }}
                            />
                            <span className="text-xs font-bold text-black dark:text-white truncate">
                              {doc.fullName}
                            </span>
                          </div>
                          <span className="text-[10px] text-black/55 dark:text-white/75 block truncate">
                            {doc.specialty} ·{' '}
                            <strong className="text-black/70 dark:text-white/75">
                              {doc.roomNumber}
                            </strong>
                          </span>
                        </div>
                        {waitingCount > 0 && (
                          <span
                            title={`File d'attente active : ${waitingCount} patient(s)`}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0"
                          >
                            +{waitingCount * 15}m
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[600px] overflow-y-auto">
                {timeSlots.map((time) => (
                  <div
                    key={time}
                    className="grid grid-cols-12 min-h-[58px] hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                  >
                    <div className="col-span-2 sm:col-span-1 p-2 text-center text-xs font-mono font-bold text-black/55 dark:text-white/55 border-r border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
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
                            className="p-1.5 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 relative group min-w-0"
                          >
                            {matchApt ? (
                              <div
                                className={`h-full p-2 rounded-xl border flex flex-col justify-between shadow-2xs transition-all ${getStatusBadge(
                                  matchApt.status
                                )}`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleInspectApt(matchApt, e.currentTarget)}
                                  className="text-left w-full cursor-pointer focus:outline-hidden"
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-xs truncate">
                                      {matchApt.patientName}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-white/50 dark:bg-black/30 shrink-0">
                                      {matchApt.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-black/70 dark:text-white/75 truncate">
                                    {matchApt.reason}
                                  </p>
                                </button>
                                <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-black/5 dark:border-white/5 font-mono">
                                  <span>{matchApt.durationMinutes} min</span>
                                  <div className="flex items-center gap-1">
                                    {matchApt.status === 'Booked' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(matchApt, 'Arrived')}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white cursor-pointer"
                                        title="Marquer comme arrivé en salle d'attente"
                                      >
                                        Arrivé
                                      </button>
                                    )}
                                    {matchApt.status === 'Arrived' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(matchApt, 'InRoom')}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white cursor-pointer"
                                        title="Faire entrer en consultation"
                                      >
                                        En Salle
                                      </button>
                                    )}
                                    {matchApt.status === 'InRoom' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(matchApt, 'Completed')}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white cursor-pointer"
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
                                className="h-full w-full min-h-[42px] rounded-lg border border-dashed border-transparent group-hover:border-[#0D9488]/40 hover:bg-[#0D9488]/5 flex items-center justify-center text-[10px] text-black/55 dark:text-white/55 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
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
        avatarText={activeApt?.patientName?.charAt(0).toUpperCase() || 'R'}
        avatarColor="#0D9488"
        branchName={activeApt ? getAptBranchName(activeApt) : ''}
        statusLabel={activeApt?.status || ''}
        tabs={[
          { id: 'details', label: isAr ? 'التفاصيل' : 'Détails RDV' },
          { id: 'actions', label: isAr ? 'تحديث الحالة' : 'Workflow' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(apt) => handleInspectApt(apt)}
        onClose={() => setInspectedApt(null)}
        renderBody={(apt, tab) => (
          <div className="space-y-4 text-xs">
            {tab === 'details' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Praticien :</span>
                    <span className="font-bold text-black dark:text-white">{apt.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Motif :</span>
                    <span className="font-semibold text-black dark:text-white">{apt.reason}</span>
                  </div>
                  {apt.patientPhone && (
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55 flex items-center gap-1">
                        <Phone size={11} /> Téléphone :
                      </span>
                      <span className="font-mono font-semibold text-black dark:text-white">
                        {apt.patientPhone}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55 flex items-center gap-1">
                      <Clock size={11} /> Créneau :
                    </span>
                    <span className="font-mono font-bold text-[#d4522f]">
                      {apt.date} · {apt.startTime} ({apt.durationMinutes} min)
                    </span>
                  </div>
                </div>
                {apt.notes && (
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 text-amber-800 dark:text-amber-300">
                    {apt.notes}
                  </div>
                )}
              </div>
            )}

            {tab === 'actions' && (
              <div className="space-y-2.5">
                {(['Arrived', 'InRoom', 'Completed', 'Cancelled'] as const).map((nextSt) => (
                  <button
                    key={nextSt}
                    type="button"
                    disabled={apt.status === nextSt}
                    onClick={() => handleStatusChange(apt, nextSt)}
                    className={`w-full p-3 rounded-xl font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      apt.status === nextSt
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-black/45 dark:text-white/45 cursor-not-allowed'
                        : nextSt === 'Cancelled'
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                        : 'bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white hover:bg-[#d4522f] hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {nextSt === 'Cancelled' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                      <span>
                        {nextSt === 'Arrived'
                          ? 'Marquer Arrivé (Salle d’attente)'
                          : nextSt === 'InRoom'
                          ? 'Entrée en Salle de Consultation'
                          : nextSt === 'Completed'
                          ? 'Clôturer Consultation'
                          : 'Annuler le Rendez-vous'}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] uppercase">{nextSt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
