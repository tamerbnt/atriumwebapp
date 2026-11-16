import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Cloud,
  LogIn,
  LogOut,
  Edit2,
  Users,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RentableUnit, RentalBooking } from '../../../types/index';
import { formatCurrencyAmount, localizeStatus } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal } from './VenueCloudSyncModal';
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

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);

export const VenueTimelineView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    rentableUnits,
    rentalBookings,
    checkInBooking,
    checkOutBooking,
    deleteRentalBooking,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('calendar');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<RentalBooking | null>(null);
  const [modalInitialUnitId, setModalInitialUnitId] = useState<string | undefined>(undefined);
  const [modalInitialHour, setModalInitialHour] = useState<string | undefined>(undefined);

  const [inspectedBooking, setInspectedBooking] = useState<RentalBooking | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedBookingIds, setPinnedBookingIds] = useState<Set<string>>(() => new Set<string>());
  const [bookingSortBy, setBookingSortBy] = useState<string>('date');
  const [bookingSortDir, setBookingSortDir] = useState<'asc' | 'desc'>('asc');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    rentalBookings.forEach((b) => {
      const bName = resolveRecordBranch(b, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [rentalBookings, branchesById, currentBranch, language]);

  const activeBooking = useMemo(() => {
    if (!inspectedBooking) return null;
    return rentalBookings.find((b) => b.id === inspectedBooking.id) || null;
  }, [inspectedBooking, rentalBookings]);

  const filteredUnits = useMemo(() => {
    return rentableUnits.filter((u) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(u, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (selectedTypeFilter !== 'All' && u.type !== selectedTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hasMatchingBooking = rentalBookings.some(
          (b) =>
            b.unitId === u.id &&
            b.startDateTime.startsWith(selectedDate) &&
            (b.purpose.toLowerCase().includes(q) || b.renterName.toLowerCase().includes(q))
        );
        if (!u.name.toLowerCase().includes(q) && !u.code.toLowerCase().includes(q) && !hasMatchingBooking) {
          return false;
        }
      }
      return true;
    });
  }, [
    rentableUnits,
    branchFilter,
    selectedTypeFilter,
    searchQuery,
    rentalBookings,
    selectedDate,
    branchesById,
    currentBranch,
    language,
  ]);

  const filteredBookings = useMemo(() => {
    return rentalBookings.filter((b) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (selectedTypeFilter !== 'All' && b.unitType !== selectedTypeFilter) return false;
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'InUse') {
          if (b.status !== 'CheckedIn') return false;
        } else if (b.status !== selectedStatus) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.purpose.toLowerCase().includes(q) ||
          b.renterName.toLowerCase().includes(q) ||
          (b.renterCompany && b.renterCompany.toLowerCase().includes(q)) ||
          b.unitName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    rentalBookings,
    branchFilter,
    selectedTypeFilter,
    selectedStatus,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const aPinned = pinnedBookingIds.has(a.id);
      const bPinned = pinnedBookingIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (bookingSortBy === 'date') {
        const cmp = a.startDateTime.localeCompare(b.startDateTime);
        return bookingSortDir === 'asc' ? cmp : -cmp;
      }
      if (bookingSortBy === 'event') {
        const cmp = a.purpose.localeCompare(b.purpose);
        return bookingSortDir === 'asc' ? cmp : -cmp;
      }
      if (bookingSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return bookingSortDir === 'asc' ? cmp : -cmp;
      }
      if (bookingSortBy === 'space') {
        const cmp = a.unitName.localeCompare(b.unitName);
        return bookingSortDir === 'asc' ? cmp : -cmp;
      }
      if (bookingSortBy === 'financials') {
        return bookingSortDir === 'asc'
          ? a.totalAmount - b.totalAmount
          : b.totalAmount - a.totalAmount;
      }
      return 0;
    });
  }, [
    filteredBookings,
    pinnedBookingIds,
    bookingSortBy,
    bookingSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const selectedDateBookings = useMemo(
    () => rentalBookings.filter((b) => b.startDateTime.startsWith(selectedDate)),
    [rentalBookings, selectedDate]
  );
  const selectedDateVolume = selectedDateBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const occupiedSpacesCount = new Set(selectedDateBookings.map((b) => b.unitId)).size;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleSlotClick = (unitId: string, hour: number) => {
    const hourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
    setBookingToEdit(null);
    setModalInitialUnitId(unitId);
    setModalInitialHour(hourStr);
    setIsBookingModalOpen(true);
  };

  const getBookingLayout = (booking: RentalBooking) => {
    const startTimePart = (booking.startDateTime?.split('T')[1] || '08:00').slice(0, 5);
    const endTimePart = (booking.endDateTime?.split('T')[1] || '12:00').slice(0, 5);
    const startParts = startTimePart.includes(':') ? startTimePart.split(':').map(Number) : [8, 0];
    const endParts = endTimePart.includes(':') ? endTimePart.split(':').map(Number) : [12, 0];
    const startH = (startParts[0] || 8) + (startParts[1] || 0) / 60;
    const endH = (endParts[0] || 12) + (endParts[1] || 0) / 60;
    const clampedStart = Math.max(8, Math.min(24, startH));
    const clampedEnd = Math.max(8, Math.min(24, endH));
    const leftPercent = ((clampedStart - 8) / 16) * 100;
    const widthPercent = Math.max(4, ((clampedEnd - clampedStart) / 16) * 100);
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTypeFilter('All');
    setSelectedStatus('All');
    setBranchFilter('All');
  }, []);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (selectedTypeFilter !== 'All' ? 1 : 0) +
    (selectedStatus !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedTypeFilter !== 'All') {
      chips.push({
        key: 'type',
        label: `${isAr ? 'النوع' : isFr ? 'Espace' : 'Space'}: ${selectedTypeFilter}`,
        onRemove: () => setSelectedTypeFilter('All'),
      });
    }
    if (selectedStatus !== 'All') {
      chips.push({
        key: 'status',
        label: `${t('venue_col_status')}: ${selectedStatus}`,
        onRemove: () => setSelectedStatus('All'),
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
  }, [selectedTypeFilter, selectedStatus, branchFilter, t, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع / المرفق' : isFr ? 'Branche / Complexe' : 'Branch / Facility',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
            count: rentalBookings.length,
          },
          ...Array.from(branchCounts.entries()).map(([name, count]) => ({
            value: name,
            label: name,
            count,
          })),
        ],
      },
      {
        id: 'unitType',
        label: isAr ? 'فئة الفضاء' : isFr ? "Catégorie d'Espace" : 'Space Category',
        value: selectedTypeFilter,
        onChange: setSelectedTypeFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All' },
          { value: 'Hall', label: t('venue_type_hall') },
          { value: 'Studio', label: t('venue_type_studio') },
          { value: 'Room', label: t('venue_type_room') },
          { value: 'Court', label: t('venue_type_court') },
          { value: 'Desk', label: t('venue_type_desk') },
        ],
      },
      {
        id: 'status',
        label: t('venue_col_status'),
        value: selectedStatus,
        onChange: setSelectedStatus,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Toutes' : 'All', count: rentalBookings.length },
          {
            value: 'InUse',
            label: t('venue_filter_in_use'),
            count: rentalBookings.filter((b) => b.status === 'CheckedIn').length,
          },
          {
            value: 'Confirmed',
            label: t('venue_filter_confirmed'),
            count: rentalBookings.filter((b) => b.status === 'Confirmed').length,
          },
          {
            value: 'Tentative',
            label: t('venue_filter_inquiries'),
            count: rentalBookings.filter((b) => b.status === 'Tentative').length,
          },
        ],
      },
    ],
    [isAr, isFr, branchFilter, rentalBookings, branchCounts, selectedTypeFilter, t, selectedStatus]
  );

  const handleExportTimelineCSV = useCallback(() => {
    const headers = [
      'ID',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      t('venue_col_space'),
      t('venue_col_event_renter'),
      t('venue_voucher_renter_name'),
      t('venue_col_schedule'),
      t('venue_col_financials'),
      t('venue_col_status'),
    ];
    const rows = sortedBookings.map((b) => [
      b.id,
      resolveRecordBranch(b, branchesById, currentBranch, language).name,
      b.unitName,
      b.purpose,
      b.renterName,
      `${b.startDateTime.replace('T', ' ').slice(0, 16)} (${b.durationHours}h)`,
      `${b.totalAmount} ${b.currency}`,
      b.status,
    ]);
    downloadCsvSafe(`atrium-venue-timeline-${selectedDate}.csv`, headers, rows);
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : isFr ? 'Export CSV réussi' : 'CSV Exported',
      message: `${sortedBookings.length} ${isFr ? 'sessions exportées.' : 'sessions exported.'}`,
      category: 'rental_booking',
    });
  }, [sortedBookings, branchesById, currentBranch, language, selectedDate, t, isAr, isFr]);

  const timelineColumns: ColumnDefinition<RentalBooking>[] = useMemo(
    () => [
      {
        key: 'event',
        header: t('venue_col_event_renter'),
        width: '2.3*',
        minWidth: '200px',
        sortable: true,
        renderCell: (b) => (
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white truncate">{b.purpose}</div>
            <div className="text-[11px] text-black/55 dark:text-white/75 truncate">
              {b.renterName} {b.renterCompany ? `(${b.renterCompany})` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '125px',
        sortable: true,
        renderCell: (b) => {
          const bInfo = resolveRecordBranch(b, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'space',
        header: t('venue_col_space'),
        width: '1.5*',
        minWidth: '140px',
        sortable: true,
        renderCell: (b) => (
          <span className="text-xs font-semibold text-black dark:text-white truncate block">
            {b.unitName}
          </span>
        ),
      },
      {
        key: 'date',
        header: t('venue_col_schedule'),
        width: '1.8*',
        minWidth: '160px',
        sortable: true,
        renderCell: (b) => (
          <div className="text-xs font-mono text-black dark:text-white">
            {b.startDateTime.replace('T', ' ').slice(0, 16)} ({b.durationHours}h)
          </div>
        ),
      },
      {
        key: 'financials',
        header: t('venue_col_financials'),
        width: '1.3*',
        minWidth: '120px',
        sortable: true,
        renderCell: (b) => (
          <span className="font-bold font-mono text-xs text-black dark:text-white tabular-nums">
            {formatCurrencyAmount(b.totalAmount, b.currency)}
          </span>
        ),
      },
    ],
    [t, isAr, isFr, branchesById, currentBranch, language]
  );

  const renderCalendarMatrix = useCallback(
    () => (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-white dark:bg-neutral-800 rounded-xl p-1 border border-neutral-200/80 dark:border-neutral-700 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="p-1.5 text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              {t('venue_timeline_today')}
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Selected date"
              className="bg-transparent text-xs font-semibold text-black dark:text-white px-2 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="p-1.5 text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
          <span className="text-xs font-semibold text-black/65 dark:text-white/65">
            {t('venue_space_asset_header', language, { count: filteredUnits.length })}
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-[20px] border border-[#E6DED6] dark:border-neutral-700/80 shadow-2xs overflow-x-auto">
          <div className="min-w-[920px]">
            <div className="flex border-b border-[#E6DED6] dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-neutral-800/80 sticky top-0 z-10 text-[11px] font-mono text-black/55 dark:text-white/55">
              <div className="w-56 sm:w-64 p-3 font-semibold text-black/70 dark:text-white/75 border-r border-[#E6DED6] dark:border-neutral-700/80 shrink-0">
                {t('venue_space_asset_header', language, { count: filteredUnits.length })}
              </div>
              <div className="flex-1 grid grid-cols-16 divide-x divide-neutral-200/50 dark:divide-neutral-700/50">
                {HOURS.map((hour) => (
                  <div key={hour} className="py-2.5 text-center truncate">
                    {hour}:00
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[#E6DED6] dark:divide-neutral-700/60">
              {filteredUnits.length === 0 ? (
                <div className="p-8 text-center text-sm text-black/55 dark:text-white/55">
                  {t('venue_no_spaces_filter')}
                </div>
              ) : (
                filteredUnits.map((unit: RentableUnit) => {
                  const unitBookings = rentalBookings.filter(
                    (b) => b.unitId === unit.id && b.startDateTime.startsWith(selectedDate)
                  );
                  return (
                    <div
                      key={unit.id}
                      className="flex min-h-[76px] relative group hover:bg-[#F3EDE7]/60 dark:hover:bg-neutral-700/20 transition-colors"
                    >
                      <div className="w-56 sm:w-64 p-3 border-r border-[#E6DED6] dark:border-neutral-700/80 shrink-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: unit.colorHex || '#8B5CF6' }}
                          />
                          <span className="font-bold text-xs text-black dark:text-white truncate">
                            {unit.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-black/55 dark:text-white/75 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>
                            {unit.type === 'Hall'
                              ? t('venue_type_hall')
                              : unit.type === 'Studio'
                              ? t('venue_type_studio')
                              : unit.type === 'Room'
                              ? t('venue_type_room')
                              : unit.type === 'Court'
                              ? t('venue_type_court')
                              : t('venue_type_desk')}
                          </span>
                          <span>·</span>
                          <span>{t('venue_card_capacity', language, { count: unit.capacity })}</span>
                          <span>·</span>
                          <span className="tabular-nums font-mono font-semibold text-black/70 dark:text-white/75">
                            {formatCurrencyAmount(unit.hourlyRate, unit.currency)}
                            {t('venue_per_hour')}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 relative grid grid-cols-16 divide-x divide-neutral-100 dark:divide-neutral-800/40">
                        {HOURS.map((hour) => (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => handleSlotClick(unit.id, hour)}
                            className="h-full cursor-pointer hover:bg-[#FCEEE8]/50 dark:hover:bg-neutral-700/30 transition-colors text-left"
                            aria-label={t('venue_slot_tooltip', language, {
                              name: unit.name,
                              time: `${hour}:00`,
                            })}
                            title={t('venue_slot_tooltip', language, {
                              name: unit.name,
                              time: `${hour}:00`,
                            })}
                          />
                        ))}
                        {unitBookings.map((booking) => {
                          const layout = getBookingLayout(booking);
                          const isCheckedIn = booking.status === 'CheckedIn';
                          const isConfirmed = booking.status === 'Confirmed';
                          const isTentative = booking.status === 'Tentative';
                          return (
                            <button
                              key={booking.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerOpenerEl(e.currentTarget);
                                setInspectedBooking(booking);
                              }}
                              style={{ left: layout.left, width: layout.width }}
                              className={`absolute top-2 bottom-2 z-10 rounded-xl px-2.5 py-1.5 cursor-pointer shadow-xs border transition-all flex flex-col justify-center overflow-hidden text-left ${
                                isCheckedIn
                                  ? 'bg-purple-600/95 hover:bg-purple-600 text-white border-purple-500'
                                  : isConfirmed
                                  ? 'bg-[#d4522f]/95 hover:bg-[#d4522f] text-white border-[#b03b1b]'
                                  : isTentative
                                  ? 'bg-amber-500/95 hover:bg-amber-500 text-white border-amber-400'
                                  : 'bg-neutral-700 hover:bg-neutral-800 text-white border-neutral-600'
                              }`}
                            >
                              <div className="font-bold text-xs truncate leading-tight">
                                {booking.purpose}
                              </div>
                              <div className="text-[10px] opacity-90 truncate mt-0.5">
                                {booking.renterName}{' '}
                                {booking.renterCompany && `(${booking.renterCompany})`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    [selectedDate, filteredUnits, rentalBookings, language, t]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: rentalBookings.length > 0,
  });

  if (showSkeleton && (rentalBookings.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCalendarTimeline
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ScreenHeaderBar
        icon={<CalendarIcon size={22} />}
        title={t('venue_timeline_matrix_title')}
        subtitle={
          isAr
            ? 'المخطط الزمني الساعي وإشغال القاعات'
            : isFr
            ? 'Matrice horaire & disponibilité des espaces'
            : 'Hourly space availability & utilization matrix'
        }
        secondaryActions={
          <button
            type="button"
            onClick={() => setIsCloudSyncModalOpen(true)}
            className="h-10 px-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-black dark:text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-2xs border border-[#E6DED6] dark:border-neutral-700"
            title="Inspect Supabase live tables and row writes"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Supabase</span>
          </button>
        }
        primaryAction={{
          label: t('venue_btn_new_booking'),
          onClick: () => {
            setBookingToEdit(null);
            setModalInitialUnitId(undefined);
            setModalInitialHour(undefined);
            setIsBookingModalOpen(true);
          },
          icon: <Plus size={16} strokeWidth={2.5} />,
          dataAction: 'new-timeline-booking',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'المخطط الزمني وإشغال القاعات'
            : isFr
            ? 'Planning des Salles & Occupation'
            : 'Timeline Matrix & Facility Utilization'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'القاعات والمساحات المتاحة'
            : isFr
            ? 'Salles & Espaces Gérés'
            : 'Managed Venue Spaces',
          badgeText: `${occupiedSpacesCount} ${isAr ? 'قاعة محجوزة اليوم' : isFr ? "occupées aujourd'hui" : 'occupied today'}`,
          count: rentableUnits.length,
          tone: 'emerald',
          isActive: selectedTypeFilter === 'Hall',
          onToggle: () => setSelectedTypeFilter((prev) => (prev === 'Hall' ? 'All' : 'Hall')),
        }}
        secondaryCard={{
          label: isAr
            ? 'حجوزات التاريخ المحدد'
            : isFr
            ? 'Sessions Programmées'
            : 'Booked Sessions on Date',
          badgeText: selectedDate,
          count: selectedDateBookings.length,
          tone: 'terracotta',
          isActive: selectedStatus === 'InUse',
          onToggle: () => setSelectedStatus((prev) => (prev === 'InUse' ? 'All' : 'InUse')),
        }}
        darkCard={{
          label: isAr
            ? 'حجم التعاقدات اليومي'
            : isFr
            ? 'Volume Réservé du Jour'
            : 'Day Booked Volume',
          badgeCount: selectedDateBookings.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'حجوزات اليوم' : isFr ? 'sessions' : 'sessions',
          valueCount: selectedDateVolume,
          valuePrefix: '',
          formatValue: (v) => formatCurrencyAmount(v, 'DZD'),
          caption: currentBranch?.name || (isFr ? 'Chiffre prévisionnel' : 'Booked Turnover'),
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            viewMode === 'calendar'
              ? isAr
                ? 'الجدول الزمني للقاعات'
                : isFr
                ? 'Matrice Horaire des Espaces'
                : 'Spaces Hourly Matrix'
              : isAr
              ? 'قائمة الحجوزات المجدولة'
              : isFr
              ? 'Liste des Sessions'
              : 'Scheduled Sessions'
          }
          liveRegionText={`${viewMode === 'calendar' ? filteredUnits.length : sortedBookings.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('venue_search_bookings_placeholder')}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All' },
            { value: 'Hall', label: isAr ? 'قاعات' : isFr ? 'Salles' : 'Halls' },
            { value: 'Studio', label: isAr ? 'أستوديوهات' : 'Studios' },
            { value: 'Room', label: isAr ? 'اجتماعات' : isFr ? 'Réunion' : 'Rooms' },
            { value: 'Court', label: isAr ? 'ملاعب' : isFr ? 'Terrains' : 'Courts' },
          ]}
          statusValue={selectedTypeFilter}
          onStatusChange={setSelectedTypeFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={(m: 'list' | 'grid' | 'calendar') => setViewMode(m)}
          showViewToggle
          showCalendarToggle
          onExport={handleExportTimelineCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection
          hideToolbar
          data={sortedBookings}
          keyExtractor={(b) => b.id}
          viewMode={viewMode}
          renderCalendarView={renderCalendarMatrix}
          columns={timelineColumns}
          sortBy={bookingSortBy}
          sortDirection={bookingSortDir}
          onSortChange={(key, dir) => {
            setBookingSortBy(key);
            setBookingSortDir(dir);
          }}
          openItemId={activeBooking?.id || null}
          onItemClick={(b, el) => {
            setDrawerOpenerEl(el || null);
            setInspectedBooking(b);
          }}
          onViewDetails={(b, el) => {
            setDrawerOpenerEl(el || null);
            setInspectedBooking(b);
          }}
          onEdit={(b) => {
            setBookingToEdit(b);
            setIsBookingModalOpen(true);
          }}
          isPinned={(b) => pinnedBookingIds.has(b.id)}
          onPinToggle={(b) => {
            setPinnedBookingIds((prev) => {
              const next = new Set(prev);
              if (next.has(b.id)) next.delete(b.id);
              else next.add(b.id);
              return next;
            });
          }}
          selectedIds={selectedBookingIds}
          onSelectionChange={setSelectedBookingIds}
          renderCard={(b) => (
            <div className="flex flex-col justify-between w-full h-full">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-black dark:text-white truncate">
                    {b.unitName}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75">
                    {b.status}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-black dark:text-white line-clamp-1 mb-1">
                  {b.purpose}
                </h3>
                <p className="text-[11px] text-black/55 dark:text-white/75 mb-2">{b.renterName}</p>
                <div className="flex items-center gap-1.5 text-xs font-mono text-black/70 dark:text-white/75">
                  <Clock size={12} />
                  <span>{b.startDateTime.replace('T', ' ').slice(0, 16)}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="font-bold font-mono text-xs text-black dark:text-white">
                  {formatCurrencyAmount(b.totalAmount, b.currency)}
                </span>
                <span className="text-[11px] text-black/55 dark:text-white/55">
                  {b.durationHours}h
                </span>
              </div>
            </div>
          )}
          emptyTitle={t('venue_no_bookings_match')}
          primaryActionLabel={t('venue_btn_new_booking')}
          onAddFirstItem={() => {
            setBookingToEdit(null);
            setIsBookingModalOpen(true);
          }}
          hasActiveFilters={activeFiltersCount > 0 || searchQuery.trim().length > 0}
          onResetFilters={handleResetFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={viewMode === 'calendar' ? filteredUnits.length : sortedBookings.length}
        entityPluralLabel={
          viewMode === 'calendar'
            ? isAr
              ? 'مساحات'
              : isFr
              ? 'espaces'
              : 'spaces'
            : isAr
            ? 'حجوزات'
            : isFr
            ? 'réservations'
            : 'bookings'
        }
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeBooking)}
        item={activeBooking}
        allItems={sortedBookings}
        keyExtractor={(b) => b.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeBooking?.purpose || ''}
        subtitle={
          activeBooking
            ? `${activeBooking.unitName} · ${activeBooking.startDateTime.replace('T', ' ').slice(0, 16)}`
            : ''
        }
        avatarText={(activeBooking?.renterName || 'V').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeBooking
            ? resolveRecordBranch(activeBooking, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeBooking ? localizeStatus(activeBooking.status, language) : undefined}
        onSelectItem={(b) => setInspectedBooking(b)}
        onClose={() => setInspectedBooking(null)}
        onDelete={(b) => deleteRentalBooking(b.id)}
        holdToDelete
        renderBody={(booking) => (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap gap-2">
              {booking.status === 'Confirmed' && (
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<LogIn size={14} />}
                  onClick={() => checkInBooking(booking.id)}
                >
                  {t('venue_btn_checkin_guest')}
                </AtriumButton>
              )}
              {booking.status === 'CheckedIn' && (
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<LogOut size={14} />}
                  onClick={() => checkOutBooking(booking.id)}
                >
                  {t('venue_btn_checkout_space')}
                </AtriumButton>
              )}
              <AtriumButton
                variant="secondary"
                size="sm"
                icon={<Edit2 size={14} />}
                onClick={() => {
                  setBookingToEdit(booking);
                  setIsBookingModalOpen(true);
                }}
              >
                {isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit'}
              </AtriumButton>
            </div>

            <div className="p-4 bg-[#F3EDE7]/60 dark:bg-neutral-800/40 rounded-2xl border border-[#E6DED6] dark:border-neutral-700 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/60">
                  {t('venue_voucher_renter_name')}
                </span>
                <span className="font-bold text-black dark:text-white">{booking.renterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/60">{t('venue_voucher_phone')}</span>
                <span className="font-mono text-black dark:text-white">{booking.renterPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/60">{t('venue_inv_capacity')}</span>
                <span className="font-semibold text-black dark:text-white flex items-center gap-1">
                  <Users size={12} /> {booking.attendeeCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/60">
                  {t('venue_col_financials')}
                </span>
                <span className="font-bold text-black dark:text-white tabular-nums font-mono">
                  {formatCurrencyAmount(booking.totalAmount, booking.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60 dark:text-white/60">
                  {t('venue_voucher_caution_held')}
                </span>
                <span className="font-semibold text-emerald-600 tabular-nums font-mono">
                  {formatCurrencyAmount(booking.depositAmount, booking.currency)} (
                  {booking.depositStatus})
                </span>
              </div>
            </div>
          </div>
        )}
      />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        bookingToEdit={bookingToEdit}
        initialUnitId={modalInitialUnitId}
        initialStartTime={modalInitialHour}
        initialDate={selectedDate}
      />
      <VenueCloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
      />
    </div>
  );
};
