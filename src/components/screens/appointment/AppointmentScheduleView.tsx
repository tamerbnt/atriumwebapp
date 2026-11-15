import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Clock,
  Plus,
  Scissors,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Play,
  CreditCard,
  Building2,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentAppointmentsFromState,
  selectCurrentStaffFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { Appointment } from '../../../types/index';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { t, getLocalizedServiceName } from '../../../utils/i18n';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCalendarTimeline } from '../../ui/skeleton/StructuralSkeletons';
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

const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
];

export const AppointmentScheduleView: React.FC = React.memo(() => {
  const {
    appointments,
    staff,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      appointments: selectCurrentAppointmentsFromState(s),
      staff: selectCurrentStaffFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );

  const {
    updateAppointmentStatus,
    checkoutAppointment,
    batchDeleteAppointments,
    batchUpdateAppointmentStatus,
    retryCloudSync,
  } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedStylistId, setSelectedStylistId] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'grid'>('calendar');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [inspectingApt, setInspectingApt] = useState<Appointment | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [slotPrefill, setSlotPrefill] = useState<any>(null);

  const [selectedAptIds, setSelectedAptIds] = useState<Set<string>>(() => new Set());
  const [pinnedAptIds, setPinnedAptIds] = useState<Set<string>>(() => new Set());
  const [aptSortBy, setAptSortBy] = useState('time');
  const [aptSortDir, setAptSortDir] = useState<'asc' | 'desc'>('asc');

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);
  const salonStylists = useMemo(() => staff.filter((s) => s.isActive), [staff]);

  const { dayAppointments, stats, branchOptionsWithCounts } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const forDay = appointments.filter((apt) => apt.date === selectedDate);
    const branchCounts = new Map<string, number>();
    forDay.forEach((a) => {
      const bName = resolveRecordBranch(a, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    const filtered = forDay.filter((apt) => {
      if (selectedStylistId !== 'All' && apt.staffId !== selectedStylistId) return false;
      if (statusFilter !== 'All' && apt.status !== statusFilter) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(apt, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(apt, branchesById, currentBranch, language).name.toLowerCase();
        return (
          apt.clientName.toLowerCase().includes(q) ||
          apt.serviceName.toLowerCase().includes(q) ||
          apt.staffName.toLowerCase().includes(q) ||
          bName.includes(q)
        );
      }
      return true;
    });
    return {
      dayAppointments: filtered,
      stats: {
        all: forDay.length,
        confirmed: forDay.filter((a) => a.status === 'Confirmed').length,
        inChair: forDay.filter((a) => a.status === 'InChair').length,
        completed: forDay.filter((a) => a.status === 'Completed').length,
        revenue: forDay.filter((a) => a.status !== 'Cancelled').reduce((sum, a) => sum + a.price, 0),
      },
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [appointments, selectedDate, selectedStylistId, statusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedDayAppointments = useMemo(() => {
    const sign = aptSortDir === 'asc' ? 1 : -1;
    return [...dayAppointments].sort((a, b) => {
      const aPinned = pinnedAptIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedAptIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (aptSortBy === 'client') return a.clientName.localeCompare(b.clientName) * sign;
      if (aptSortBy === 'service') return a.serviceName.localeCompare(b.serviceName) * sign;
      if (aptSortBy === 'stylist') return a.staffName.localeCompare(b.staffName) * sign;
      if (aptSortBy === 'price') return (a.price - b.price) * sign;
      if (aptSortBy === 'status') return a.status.localeCompare(b.status) * sign;
      if (aptSortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return a.startTime.localeCompare(b.startTime) * sign;
    });
  }, [dayAppointments, pinnedAptIds, aptSortBy, aptSortDir, branchesById, currentBranch, language]);

  const handlePrevDay = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  }, [selectedDate]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleOneClickCheckout = useCallback(
    (apt: Appointment) => {
      const sale = checkoutAppointment(apt.id, 'Cash');
      showToast?.({
        type: 'success',
        title: isAr ? 'تم التحصيل' : 'Encaissement validé',
        message: `${apt.clientName} · #${sale.id.slice(-6).toUpperCase()}`,
      });
    },
    [checkoutAppointment, showToast, isAr]
  );

  const handleOpenAddModal = useCallback(
    (time?: string, staffId?: string) => {
      setActiveAppointment(null);
      setSlotPrefill({
        date: selectedDate,
        time: time || '10:00',
        staffId: staffId || salonStylists[0]?.id || '',
      });
      setIsModalOpen(true);
    },
    [selectedDate, salonStylists]
  );

  const handleOpenEditModal = useCallback((apt: Appointment) => {
    setActiveAppointment(apt);
    setSlotPrefill(null);
    setIsModalOpen(true);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedStylistId('All');
    setStatusFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = selectedStylistId !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (selectedStylistId !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const handleExportCSV = useCallback(() => {
    const headers = ['Date', 'Start', 'End', 'Stylist', 'Client', 'Service', 'Price', 'Status', 'Branch'];
    const rows = sortedDayAppointments.map((a) => [
      a.date,
      a.startTime,
      a.endTime,
      a.staffName,
      a.clientName,
      a.serviceName,
      a.price,
      localizeStatus(a.status, language),
      resolveRecordBranch(a, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`${t('salon_csv_filename', language)}_${selectedDate}.csv`, headers, rows);
  }, [sortedDayAppointments, language, branchesById, currentBranch, selectedDate]);

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: t('common_all', language), count: stats.all },
      { value: 'Confirmed', label: localizeStatus('Confirmed', language), count: stats.confirmed },
      { value: 'InChair', label: localizeStatus('InChair', language), count: stats.inChair },
      { value: 'Completed', label: localizeStatus('Completed', language), count: stats.completed },
    ],
    [language, stats]
  );

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches',
            count: stats.all,
          },
          ...branchOptionsWithCounts,
        ],
      },
      {
        id: 'stylist',
        label: t('salon_filter_stylist', language),
        value: selectedStylistId,
        onChange: setSelectedStylistId,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: t('salon_filter_all_stylists', language) },
          ...salonStylists.map((st) => ({ value: st.id, label: st.fullName })),
        ],
      },
    ],
    [isAr, isEn, branchFilter, stats.all, branchOptionsWithCounts, language, selectedStylistId, salonStylists]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (selectedStylistId !== 'All') {
      const found = salonStylists.find((s) => s.id === selectedStylistId);
      chips.push({
        key: 'stylist',
        label: found?.fullName || selectedStylistId,
        onRemove: () => setSelectedStylistId('All'),
      });
    }
    return chips;
  }, [branchFilter, selectedStylistId, salonStylists]);

  const appointmentColumns: ColumnDefinition<Appointment>[] = useMemo(
    () => [
      {
        key: 'client',
        header: isAr ? 'الزبون والتوقيت' : isEn ? 'Client & Time' : 'Client & Créneau',
        sortable: true,
        renderCell: (apt) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#d4522f]/10 text-[#d4522f] font-bold text-[11px] font-mono flex flex-col items-center justify-center shrink-0">
              <span>{apt.startTime}</span>
            </div>
            <div className="min-w-0">
              <span className="text-[13.5px] font-semibold text-black dark:text-white truncate block">
                {apt.clientName}
              </span>
              <span className="text-[11px] text-black/62 dark:text-white/65 font-mono truncate block">
                {apt.clientPhone || `${apt.durationMinutes} min`}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'service',
        header: isAr ? 'الخدمة والمصففة' : isEn ? 'Service & Stylist' : 'Prestation & Styliste',
        sortable: true,
        renderCell: (apt) => (
          <div className="min-w-0">
            <span className="text-[12.5px] font-semibold text-black dark:text-white truncate block">
              {getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65 truncate block">
              {apt.staffName}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        sortable: true,
        renderCell: (apt) => (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold ${
              apt.status === 'InChair'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                : apt.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : apt.status === 'Cancelled'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                apt.status === 'InChair'
                  ? 'bg-amber-500'
                  : apt.status === 'Completed'
                  ? 'bg-emerald-500'
                  : apt.status === 'Cancelled'
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
            />
            {apt.status === 'InChair' ? t('salon_kpi_in_chair', language) : localizeStatus(apt.status, language)}
          </span>
        ),
      },
      {
        key: 'price',
        header: isAr ? 'السعر' : isEn ? 'Price' : 'Tarif',
        sortable: true,
        renderCell: (apt) => (
          <div className="tabular-nums">
            <span className="font-mono text-[13px] font-bold text-[#d4522f] block">
              {formatMoney(apt.price)}
            </span>
            <span className="text-[11px] font-mono text-black/62 dark:text-white/65 block">
              {apt.durationMinutes} min
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        sortable: true,
        renderCell: (apt) => (
          <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(apt, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, language, branchesById, currentBranch]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: appointments.length > 0,
  });

  if (showSkeleton && (appointments.length === 0 || networkMode === 'force_skeleton')) {
    return <SkeletonCalendarTimeline isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 relative">
      <ScreenHeaderBar
        icon={<Scissors size={22} />}
        title={t('salon_schedule_title', language)}
        primaryAction={{
          label: t('salon_btn_new_appointment', language),
          icon: <Plus size={15} strokeWidth={2.5} />,
          onClick: () => handleOpenAddModal('10:00'),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات جدول المواعيد' : isEn ? 'Daily Chair Schedule' : 'Occupation des Postes & Recette Jour'}
        language={language}
        primaryCard={{
          label: t('salon_kpi_total_bookings', language),
          badgeText: `↗ ${stats.completed} terminés`,
          count: stats.all,
          tone: 'emerald',
          isActive: statusFilter === 'Confirmed',
          onToggle: () => setStatusFilter((p) => (p === 'Confirmed' ? 'All' : 'Confirmed')),
        }}
        secondaryCard={{
          label: t('salon_kpi_in_chair', language),
          badgeText: `/ ${salonStylists.length} postes`,
          count: stats.inChair,
          tone: 'terracotta',
          isActive: statusFilter === 'InChair',
          onToggle: () => setStatusFilter((p) => (p === 'InChair' ? 'All' : 'InChair')),
        }}
        darkCard={{
          label: t('salon_kpi_est_revenue', language),
          badgePrefix: '',
          badgeCount: stats.completed,
          badgeSuffix: ' clôturés',
          valuePrefix: '',
          valueCount: stats.revenue,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Salon'} · ${selectedDate}`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            viewMode === 'calendar'
              ? isAr ? 'مخطط كراسي المصففين' : 'Planning des Postes'
              : isAr ? 'سجل المواعيد' : 'Registre des Rendez-Vous'
          }
          liveRegionText={`${sortedDayAppointments.length} rendez-vous`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('salon_search_placeholder', language)}
          statusOptions={statusOptions}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          showCalendarToggle
          onViewModeChange={(m) => setViewMode(m)}
          onExport={handleExportCSV}
          extraTrailingControls={
            <div className="flex items-center gap-1 bg-white dark:bg-[#262422] px-1.5 h-10 rounded-xl border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs text-xs font-semibold">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1 rounded-lg hover:bg-[#F3EDE7] dark:hover:bg-[#3A3734] text-black/70 dark:text-white/75 cursor-pointer"
                title={t('salon_btn_prev_day', language)}
              >
                <ChevronLeft size={14} className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-1 rounded-lg bg-[#d4522f]/10 text-[#d4522f] font-bold cursor-pointer"
              >
                {t('salon_btn_today', language)}
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-1 text-xs font-semibold bg-transparent text-black dark:text-white border-none focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={handleNextDay}
                className="p-1 rounded-lg hover:bg-[#F3EDE7] dark:hover:bg-[#3A3734] text-black/70 dark:text-white/75 cursor-pointer"
                title={t('salon_btn_next_day', language)}
              >
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </div>
          }
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<Appointment>
          data={sortedDayAppointments}
          columns={appointmentColumns}
          keyExtractor={(apt) => apt.id}
          viewMode={viewMode}
          hideToolbar
          showCalendarToggle
          openItemId={inspectingApt?.id ?? null}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          renderCalendarView={() => (
            <div className="bg-white dark:bg-[#1C1B1A] rounded-[20px] border border-[#E6DED6] dark:border-[#3A3734] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] border-b border-[#E6DED6] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#262422]">
                    <div className="p-3.5 text-center text-xs font-bold text-black/62 dark:text-white/65 uppercase tracking-wider border-r border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-center">
                      <Clock size={14} className="mr-1" />
                      {t('salon_timeline', language)}
                    </div>
                    {salonStylists.map((stylist, index) => {
                      const count = dayAppointments.filter((a) => a.staffId === stylist.id).length;
                      return (
                        <div
                          key={stylist.id}
                          className={`p-3.5 ${
                            index < salonStylists.length - 1 ? 'border-r border-[#E6DED6] dark:border-[#3A3734]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#d4522f]/15 text-[#d4522f] font-bold text-xs flex items-center justify-center">
                                {stylist.fullName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-black dark:text-white">{stylist.fullName}</p>
                                <p className="text-[11px] text-black/62 dark:text-white/65">
                                  {stylist.role} · Post {index + 1}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#F3EDE7] dark:bg-[#1C1B1A] text-black/75 dark:text-white/80">
                              {count} RDV
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="divide-y divide-[#E6DED6]/60 dark:divide-[#3A3734]/60">
                    {TIME_SLOTS.map((time) => (
                      <div
                        key={time}
                        className="grid grid-cols-[100px_repeat(auto-fit,minmax(200px,1fr))] min-h-[68px]"
                      >
                        <div className="p-3 text-xs font-mono font-semibold text-black/62 dark:text-white/65 text-center border-r border-[#E6DED6] dark:border-[#3A3734] pt-3">
                          {time}
                        </div>
                        {salonStylists.map((stylist, index) => {
                          const apt = dayAppointments.find((a) => a.staffId === stylist.id && a.startTime === time);
                          return (
                            <div
                              key={stylist.id}
                              className={`p-1.5 relative group ${
                                index < salonStylists.length - 1
                                  ? 'border-r border-[#E6DED6]/70 dark:border-[#3A3734]/70'
                                  : ''
                              }`}
                            >
                              {apt ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setDrawerOpenerEl(e.currentTarget);
                                    setInspectingApt(apt);
                                  }}
                                  className={`w-full h-full text-left p-2.5 rounded-2xl cursor-pointer transition-all border shadow-2xs hover:border-[#d4522f] ${
                                    apt.status === 'InChair'
                                      ? 'bg-amber-50 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700'
                                      : apt.status === 'Completed'
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                                      : 'bg-[#FBF8F5] dark:bg-[#262422] border-[#E6DED6] dark:border-[#3A3734]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-xs font-bold text-black dark:text-white truncate">
                                      {apt.clientName}
                                    </span>
                                    <span className="text-[10px] font-bold text-[#d4522f]">
                                      {localizeStatus(apt.status, language)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-medium text-black/70 dark:text-white/75 truncate">
                                    {getLocalizedServiceName(apt.serviceId, apt.serviceName, language)}
                                  </p>
                                  <div className="flex items-center justify-between text-[10px] text-black/62 dark:text-white/65 mt-1 font-mono">
                                    <span>
                                      {apt.startTime}-{apt.endTime}
                                    </span>
                                    <span className="font-bold text-[#d4522f]">{formatMoney(apt.price)}</span>
                                  </div>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddModal(time, stylist.id)}
                                  className="w-full h-full min-h-[50px] rounded-xl border border-dashed border-transparent group-hover:border-[#D4C8BC] flex items-center justify-center text-black/55 hover:text-[#d4522f] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                >
                                  <Plus size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          sortBy={aptSortBy}
          sortDirection={aptSortDir}
          onSortChange={(key, dir) => {
            setAptSortBy(key);
            setAptSortDir(dir);
          }}
          selectedIds={selectedAptIds}
          onSelectionChange={setSelectedAptIds}
          pinnedIds={pinnedAptIds}
          onPinToggle={(apt: any) => {
            const id = typeof apt === 'string' ? apt : apt.id;
            setPinnedAptIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          bulkSecondaryAction={{
            label: isAr ? 'تأكيد المواعيد' : 'Confirmer RDV',
            icon: <CheckCircle2 size={13} />,
            onClick: (ids) => {
              batchUpdateAppointmentStatus(Array.from(ids), 'Confirmed');
              setSelectedAptIds(new Set());
            },
            variant: 'primary',
          }}
          onBulkDelete={(ids) => {
            batchDeleteAppointments(Array.from(ids));
            setSelectedAptIds(new Set());
          }}
          onItemClick={(apt, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectingApt(apt);
          }}
          onViewDetails={(apt, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectingApt(apt);
          }}
          onEdit={(apt) => handleOpenEditModal(apt)}
          customActions={(apt) => [
            ...(apt.status !== 'Completed' && apt.status !== 'Cancelled'
              ? [
                  {
                    id: 'checkout',
                    label: t('salon_quick_checkout', language) || 'Checkout',
                    icon: <CreditCard size={13} />,
                    onClick: () => handleOneClickCheckout(apt),
                  },
                ]
              : []),
            ...(apt.status === 'Confirmed'
              ? [
                  {
                    id: 'start',
                    label: 'Démarrer',
                    icon: <Play size={13} />,
                    onClick: () => updateAppointmentStatus(apt.id, 'InChair'),
                  },
                ]
              : []),
          ]}
          emptyTitle={t('salon_empty_appointments', language)}
          emptyDescription={t('salon_empty_appointments_sub', language)}
          primaryActionLabel={t('salon_new_booking', language)}
          onAddFirstItem={() => handleOpenAddModal('10:00')}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || statusFilter !== 'All' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedDayAppointments.length}
        entityPluralLabel={isAr ? 'مواعيد' : 'rendez-vous'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Appointment>
        isOpen={inspectingApt !== null}
        item={inspectingApt}
        allItems={sortedDayAppointments}
        keyExtractor={(a) => a.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingApt?.clientName || ''}
        subtitle={inspectingApt ? `${inspectingApt.date} · ${inspectingApt.startTime}-${inspectingApt.endTime}` : undefined}
        avatarText={inspectingApt ? inspectingApt.clientName.charAt(0).toUpperCase() : undefined}
        branchName={
          inspectingApt
            ? resolveRecordBranch(inspectingApt, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={inspectingApt ? localizeStatus(inspectingApt.status, language) : undefined}
        statusClassName="bg-amber-50 text-amber-700 border border-amber-200"
        onClose={() => setInspectingApt(null)}
        onSelectItem={(a) => setInspectingApt(a)}
        renderBody={(apt) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold uppercase text-[#d4522f] block">Prestation</span>
                <span className="text-sm font-bold text-black dark:text-white">{apt.serviceName}</span>
              </div>
              <span className="font-mono font-bold text-lg text-[#d4522f]">{formatMoney(apt.price)}</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2">
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Styliste:</span>
                <span className="font-semibold">{apt.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Branche:</span>
                <span className="font-semibold flex items-center gap-1">
                  <Building2 size={12} className="text-[#d4522f]" />
                  {resolveRecordBranch(apt, branchesById, currentBranch, language).name}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {apt.status === 'Confirmed' && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  icon={<Play size={14} />}
                  className="w-full justify-center"
                  onClick={() => {
                    updateAppointmentStatus(apt.id, 'InChair');
                    setInspectingApt({ ...apt, status: 'InChair' });
                  }}
                >
                  Installer au Fauteuil
                </AtriumButton>
              )}
              {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  icon={<CreditCard size={14} />}
                  className="w-full justify-center"
                  onClick={() => {
                    handleOneClickCheckout(apt);
                    setInspectingApt(null);
                  }}
                >
                  {t('salon_quick_checkout', language)}
                </AtriumButton>
              )}
              <AtriumButton
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={() => {
                  setInspectingApt(null);
                  handleOpenEditModal(apt);
                }}
              >
                {isAr ? 'تعديل الموعد' : isEn ? 'Edit Appointment' : 'Modifier le Rendez-Vous'}
              </AtriumButton>
            </div>
          </div>
        )}
      />

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appointment={activeAppointment}
        initialDate={slotPrefill?.date || selectedDate}
        initialTime={slotPrefill?.time || '10:00'}
        initialStaffId={slotPrefill?.staffId}
      />
    </div>
  );
});

AppointmentScheduleView.displayName = 'AppointmentScheduleView';
export const StylistScheduleView = AppointmentScheduleView;
