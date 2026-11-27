import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Printer,
  X,
  Cloud,
  LogIn,
  LogOut,
  Edit2,
  FileText,
  CreditCard,
  PenTool,
  AlertTriangle,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentRentalBookingsFromState,
  selectCurrentRentableUnitsFromState,
  selectCurrentRentalRentersFromState,
  selectCurrentRentalContractTemplatesFromState,
  selectCurrentUnifiedDocumentsFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { RentalBooking, BookingStatus } from '../../../types/index';
import { formatCurrencyAmount, localizeStatus } from '../../../utils/rules';
import {
  computeLateReturnFee,
  renderRentalContractDocument,
} from '../../../utils/rentalDepth';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { VenueCloudSyncModal, useCanAccessVenueCloudDiagnostics } from './VenueCloudSyncModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticModalShell,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorProgressBar,
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticEmptyStateMotion,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
  useRetainedModalValue,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const STATUS_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]';

type DrawerTab = 'overview' | 'financials' | 'addons';

export interface VenueBookingsViewProps {
  hideHeader?: boolean;
  hideKpis?: boolean;
  viewMode?: 'list' | 'grid' | 'calendar';
  onViewModeChange?: (mode: 'list' | 'grid' | 'calendar') => void;
  showViewToggle?: boolean;
  onSwitchToTimeline?: () => void;
}

export const VenueBookingsView: React.FC<VenueBookingsViewProps> = ({
  hideHeader = false,
  hideKpis = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  showViewToggle = true,
  onSwitchToTimeline,
}) => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    rentalBookings,
    rentableUnits,
    rentalRenters,
    rentalContractTemplates,
    unifiedDocuments,
    businessName,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
  } = useAtriumSelector(
    (s) => ({
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      rentableUnits: selectCurrentRentableUnitsFromState(s),
      rentalRenters: selectCurrentRentalRentersFromState(s),
      rentalContractTemplates: selectCurrentRentalContractTemplatesFromState(s),
      unifiedDocuments: selectCurrentUnifiedDocumentsFromState(s),
      businessName:
        s.businesses.find((b) => b.id === s.currentBusinessId)?.name || 'Atrium Venue & Fleet',
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const {
    checkInBooking,
    checkOutBooking,
    updateRentalBooking,
    deleteRentalBooking,
    signRentalBookingContract,
    createRentalUnifiedInvoice,
    recordRentalUnifiedPayment,
    retryCloudSync,
  } = useAtriumActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>('All');
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const effectiveViewMode = controlledViewMode ?? internalViewMode;

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const canAccessCloudDiagnostics = useCanAccessVenueCloudDiagnostics();
  const [bookingToEdit, setBookingToEdit] = useState<RentalBooking | null>(null);
  const [printedBooking, setPrintedBooking] = useState<RentalBooking | null>(null);

  // 7.5 Return Inspection & Late Fee modal state
  const [checkoutTarget, setCheckoutTarget] = useState<RentalBooking | null>(null);
  const [checkoutReturnAt, setCheckoutReturnAt] = useState<string>('');
  const [checkoutMileageIn, setCheckoutMileageIn] = useState<string>('');
  const [checkoutFuelIn, setCheckoutFuelIn] = useState<string>('');
  const [checkoutDamageDetected, setCheckoutDamageDetected] = useState<boolean>(false);
  const [checkoutDamageAmount, setCheckoutDamageAmount] = useState<string>('0');
  const [checkoutConditionNotes, setCheckoutConditionNotes] = useState<string>('');

  // 7.5 Contract & E-Sign modal state
  const [contractTarget, setContractTarget] = useState<RentalBooking | null>(null);
  const [contractTemplatePick, setContractTemplatePick] = useState<string>('');
  const [contractSignerName, setContractSignerName] = useState<string>('');
  const [contractSigPath, setContractSigPath] = useState<string>('');
  const [isDrawingContractSig, setIsDrawingContractSig] = useState<boolean>(false);
  const contractSigSvgRef = useRef<SVGSVGElement | null>(null);

  // 6.2 Unified Payment collection modal state
  const [paymentTarget, setPaymentTarget] = useState<RentalBooking | null>(null);
  const [paymentAmountDzd, setPaymentAmountDzd] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  const [inspectedBooking, setInspectedBooking] = useState<RentalBooking | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const openCheckoutModal = useCallback(
    (b: RentalBooking) => {
      const unit = rentableUnits.find((u) => u.id === b.unitId);
      setCheckoutTarget(b);
      setCheckoutReturnAt(new Date().toISOString().slice(0, 16));
      setCheckoutMileageIn(
        b.mileageOut !== undefined
          ? String(b.mileageOut)
          : unit?.odometerKm !== undefined
          ? String(unit.odometerKm)
          : ''
      );
      setCheckoutFuelIn(
        b.fuelOutPct !== undefined
          ? String(b.fuelOutPct)
          : unit?.fuelLevelPct !== undefined
          ? String(unit.fuelLevelPct)
          : ''
      );
      setCheckoutDamageDetected(false);
      setCheckoutDamageAmount('0');
      setCheckoutConditionNotes(b.inspectionNotes || '');
    },
    [rentableUnits]
  );

  const openContractModal = useCallback((b: RentalBooking) => {
    setContractTarget(b);
    setContractTemplatePick(b.contractTemplateId || '');
    setContractSignerName(b.contractSignerName || b.renterName);
    setContractSigPath(b.contractSignatureData || '');
  }, []);

  const openPaymentModal = useCallback((b: RentalBooking) => {
    const nextStage = b.stagedPaymentSchedule?.find((s) => s.status !== 'paid');
    const suggested = nextStage
      ? Math.max(0, nextStage.amountDzd - nextStage.paidDzd)
      : b.balanceDue || b.totalAmount;
    setPaymentTarget(b);
    setPaymentAmountDzd(String(suggested));
    setPaymentMethod('cash');
  }, []);

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

  const filteredBookings = useMemo(() => {
    return rentalBookings.filter((b) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (unitTypeFilter !== 'All' && b.unitType !== unitTypeFilter) return false;
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
          b.renterName.toLowerCase().includes(q) ||
          (b.renterCompany && b.renterCompany.toLowerCase().includes(q)) ||
          b.unitName.toLowerCase().includes(q) ||
          b.purpose.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    rentalBookings,
    branchFilter,
    unitTypeFilter,
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
      if (bookingSortBy === 'event' || bookingSortBy === 'renter') {
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
      if (bookingSortBy === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return bookingSortDir === 'asc' ? cmp : -cmp;
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

  const totalBookingsCount = rentalBookings.length;
  const inUseCount = rentalBookings.filter((b) => b.status === 'CheckedIn').length;
  const confirmedCount = rentalBookings.filter((b) => b.status === 'Confirmed').length;
  const totalRevenue = rentalBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const handleNewBooking = useCallback(() => {
    setBookingToEdit(null);
    setIsBookingModalOpen(true);
  }, []);

  const handleEdit = useCallback((b: RentalBooking) => {
    setBookingToEdit(b);
    setIsBookingModalOpen(true);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedStatus('All');
    setBranchFilter('All');
    setUnitTypeFilter('All');
  }, []);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (unitTypeFilter !== 'All' ? 1 : 0) +
    (selectedStatus !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedStatus !== 'All') {
      chips.push({
        key: 'status',
        label: `${t('venue_col_status')}: ${selectedStatus === 'InUse' ? t('venue_filter_in_use') : selectedStatus}`,
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
    if (unitTypeFilter !== 'All') {
      chips.push({
        key: 'unitType',
        label: `${isAr ? 'النوع' : isFr ? 'Type' : 'Type'}: ${unitTypeFilter}`,
        onRemove: () => setUnitTypeFilter('All'),
      });
    }
    return chips;
  }, [selectedStatus, branchFilter, unitTypeFilter, t, isAr, isFr]);

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
        id: 'status',
        label: t('venue_col_status'),
        value: selectedStatus,
        onChange: setSelectedStatus,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Toutes' : 'All', count: rentalBookings.length },
          { value: 'InUse', label: t('venue_filter_in_use'), count: inUseCount },
          { value: 'Confirmed', label: t('venue_filter_confirmed'), count: confirmedCount },
          {
            value: 'Tentative',
            label: t('venue_filter_inquiries'),
            count: rentalBookings.filter((b) => b.status === 'Tentative').length,
          },
          {
            value: 'Completed',
            label: t('venue_filter_completed'),
            count: rentalBookings.filter((b) => b.status === 'Completed').length,
          },
        ],
      },
      {
        id: 'unitType',
        label: isAr ? 'نوع القاعة' : isFr ? "Type d'espace" : 'Space Category',
        value: unitTypeFilter,
        onChange: setUnitTypeFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All' },
          { value: 'Hall', label: t('venue_type_hall') },
          { value: 'Studio', label: t('venue_type_studio') },
          { value: 'Room', label: t('venue_type_room') },
          { value: 'Court', label: t('venue_type_court') },
          { value: 'Desk', label: t('venue_type_desk') },
          { value: 'Vehicle', label: t('venue_type_vehicle') },
          { value: 'Gear', label: t('venue_type_gear') },
        ],
      },
    ],
    [
      isAr,
      isFr,
      branchFilter,
      rentalBookings,
      branchCounts,
      t,
      selectedStatus,
      inUseCount,
      confirmedCount,
      unitTypeFilter,
    ]
  );

  const handleExportBookingsCSV = useCallback(() => {
    const headers = [
      isAr ? 'معرف الحجز' : 'ID',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'الحدث / الغرض' : 'Purpose',
      isAr ? 'المستأجر' : 'Renter',
      isAr ? 'الشركة' : 'Company',
      isAr ? 'القاعة' : 'Space',
      isAr ? 'تاريخ البدء' : 'Start DateTime',
      isAr ? 'تاريخ الانتهاء' : 'End DateTime',
      isAr ? 'المدة (س)' : 'Duration (h)',
      isAr ? 'المبلغ الإجمالي' : 'Total Amount',
      isAr ? 'مبلغ الضمان' : 'Deposit Amount',
      isAr ? 'حالة الحجز' : 'Status',
    ];
    const rows = sortedBookings.map((b) => [
      b.id,
      resolveRecordBranch(b, branchesById, currentBranch, language).name,
      b.purpose,
      b.renterName,
      b.renterCompany || '',
      b.unitName,
      b.startDateTime,
      b.endDateTime,
      b.durationHours,
      b.totalAmount,
      b.depositAmount,
      b.status,
    ]);
    downloadCsvSafe(
      `atrium-venue-bookings-${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    showToast({
      type: 'success',
      title: isAr ? 'تم تصدير السجل' : isFr ? 'Export CSV réussi' : 'CSV Exported',
      message: `${sortedBookings.length} ${isAr ? 'حجوزات' : isFr ? 'réservations' : 'bookings'}`,
      category: 'rental_booking',
    });
  }, [sortedBookings, branchesById, currentBranch, language, isAr, isFr]);

  const bookingColumns: ColumnDefinition<RentalBooking>[] = useMemo(
    () => [
      {
        key: 'event',
        header: t('venue_col_event_renter'),
        width: '2.3*',
        minWidth: '210px',
        sortable: true,
        renderCell: (b) => (
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white truncate">{b.purpose}</div>
            <div className="t-cap text-black/55 dark:text-white/75 truncate flex items-center gap-2 mt-0.5">
              <span className="font-medium text-black/70 dark:text-white/75">{b.renterName}</span>
              {b.renterCompany && <span>({b.renterCompany})</span>}
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
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--r-check,6px)] t-small font-medium bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'space',
        header: t('venue_col_space'),
        width: '1.4*',
        minWidth: '135px',
        sortable: true,
        renderCell: (b) => (
          <div>
            <span className="t-small font-semibold text-black dark:text-white block truncate">
              {b.unitName}
            </span>
            <span className="t-cap text-black/55 dark:text-white/55 block mt-0.5">
              {t('venue_guests_count', language, { count: b.attendeeCount })}
            </span>
          </div>
        ),
      },
      {
        key: 'date',
        header: t('venue_col_schedule'),
        width: '1.8*',
        minWidth: '160px',
        sortable: true,
        renderCell: (b) => (
          <div className="t-cap space-y-0.5">
            <div className="font-medium text-black dark:text-white tabular-nums t-small">
              {b.startDateTime.replace('T', ' ').slice(0, 16)}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 flex items-center gap-1">
              <Clock size={10} />
              <span>
                {b.durationHours}h {t('venue_inv_hourly_short')}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'financials',
        header: t('venue_col_financials'),
        width: '1.4*',
        minWidth: '125px',
        sortable: true,
        renderCell: (b) => (
          <div>
            <div className="font-semibold text-black dark:text-white tabular-nums t-small">
              {formatCurrencyAmount(b.totalAmount, b.currency)}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55">
              {t('venue_col_caution')}: {formatCurrencyAmount(b.depositAmount, b.currency)}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('venue_col_status'),
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (b) => {
          const isCheckedIn = b.status === 'CheckedIn';
          const isConfirmed = b.status === 'Confirmed';
          const isTentative = b.status === 'Tentative';
          const isCompleted = b.status === 'Completed';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full t-small font-semibold ${
                isCheckedIn
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                  : isConfirmed
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : isTentative
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : isCompleted
                  ? 'bg-[#EFE9E2] text-black/70 dark:bg-[#2B2825] dark:text-white/75'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              }`}
            >
              {isCheckedIn && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />}
              {isCheckedIn
                ? t('venue_filter_in_use')
                : isConfirmed
                ? t('venue_filter_confirmed')
                : isTentative
                ? t('venue_filter_inquiries')
                : isCompleted
                ? t('venue_filter_completed')
                : b.status}
            </span>
          );
        },
      },
    ],
    [t, language, isAr, isFr, branchesById, currentBranch]
  );

  const retainedPrintedBooking = useRetainedModalValue(printedBooking);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: rentalBookings.length > 0,
  });

  if (showSkeleton && (rentalBookings.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.3*', minWidth: '180px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <ScreenHeaderBar
          icon={<Calendar size={22} />}
          title={t('venue_bookings_page_title')}
          secondaryActions={
            canAccessCloudDiagnostics ? (
              <button
                type="button"
                onClick={() => setIsCloudSyncModalOpen(true)}
                data-sq="ctl"
                data-sq-border="none"
                className="h-10 px-4 bg-[#F5F1EC] hover:bg-[#EFE9E2] dark:bg-[#2B2825] dark:hover:bg-[#332F2B] t-small font-semibold text-black dark:text-white transition-colors flex items-center gap-2 cursor-pointer"
                title="Inspect Supabase live tables and row writes"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Cloud size={14} className="text-purple-600 dark:text-purple-400" />
                <span className="hidden sm:inline">Supabase</span>
              </button>
            ) : undefined
          }
          primaryAction={{
            label: t('venue_btn_new_res'),
            onClick: handleNewBooking,
            icon: <Plus size={16} strokeWidth={2.5} />,
            dataAction: 'new-venue-booking',
          }}
        />
      )}

      {!hideHeader && !hideKpis && (
        <ScreenKpiBanner
          heading={
            isAr
              ? 'سجل الحجوزات & مؤشرات الاستغلال'
              : isFr
              ? "Réservations & Indicateurs d'Activité"
              : 'Bookings Pipeline & Utilization Indicators'
          }
          language={language}
          primaryCard={{
            label: isAr
              ? 'الحجوزات المؤكدة'
              : isFr
              ? 'Réservations Confirmées'
              : 'Confirmed Bookings',
            badgeText: `${confirmedCount} ${isAr ? 'مؤكدة' : isFr ? 'validées' : 'confirmed'}`,
            count: confirmedCount,
            tone: 'emerald',
            isActive: selectedStatus === 'Confirmed',
            onToggle: () =>
              setSelectedStatus((prev) => (prev === 'Confirmed' ? 'All' : 'Confirmed')),
          }}
          secondaryCard={{
            label: isAr
              ? 'جلسات قيد الاستخدام الآن'
              : isFr
              ? 'Sessions En Cours (Live)'
              : 'In-Session Spaces',
            badgeText: isAr ? 'قاعة مستغلة' : isFr ? 'en cours' : 'active',
            count: inUseCount,
            tone: 'terracotta',
            isActive: selectedStatus === 'InUse',
            onToggle: () => setSelectedStatus((prev) => (prev === 'InUse' ? 'All' : 'InUse')),
          }}
          darkCard={{
            label: isAr
              ? 'إجمالي المداخيل المحجوزة'
              : isFr
              ? 'Volume Réservé Cumulé'
              : 'Total Booked Turnover',
            badgeCount: totalBookingsCount,
            badgePrefix: '',
            badgeSuffix: isAr ? 'عقود وحجوزات' : isFr ? 'dossiers actifs' : 'total files',
            valueCount: totalRevenue,
            valuePrefix: '',
            formatValue: (v) => formatCurrencyAmount(v, 'DZD'),
            caption: currentBranch?.name || (isFr ? 'Complexe Principal' : 'Main Complex'),
          }}
        />
      )}

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr ? 'جدول الحجوزات' : isFr ? 'Planning des Réservations' : 'Bookings Register'
          }
          liveRegionText={`${sortedBookings.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('venue_search_bookings_placeholder')}
          statusOptions={[
            {
              value: 'All',
              label: isAr ? 'الكل' : isFr ? 'Toutes' : 'All',
              count: rentalBookings.length,
            },
            {
              value: 'InUse',
              label: isAr ? 'مشغولة' : isFr ? 'Occupées' : 'Active',
              count: inUseCount,
            },
            {
              value: 'Confirmed',
              label: isAr ? 'مؤكدة' : isFr ? 'Confirmées' : 'Confirmed',
              count: confirmedCount,
            },
            {
              value: 'Tentative',
              label: isAr ? 'معلقة' : isFr ? 'Options' : 'Hold',
              count: rentalBookings.filter((b) => b.status === 'Tentative').length,
            },
            {
              value: 'Completed',
              label: isAr ? 'مكتملة' : isFr ? 'Terminées' : 'Completed',
              count: rentalBookings.filter((b) => b.status === 'Completed').length,
            },
          ]}
          statusValue={selectedStatus}
          onStatusChange={setSelectedStatus}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={effectiveViewMode}
          onViewModeChange={(m: 'list' | 'grid' | 'calendar') => {
            if (onViewModeChange) onViewModeChange(m);
            else if (m === 'calendar' && onSwitchToTimeline) onSwitchToTimeline();
            else setInternalViewMode(m);
          }}
          showViewToggle={showViewToggle}
          showCalendarToggle={!!onSwitchToTimeline}
          onExport={handleExportBookingsCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<RentalBooking>
          hideToolbar
          items={sortedBookings}
          keyExtractor={(b) => b.id}
          viewMode={effectiveViewMode}
          defaultViewMode="list"
          columns={bookingColumns}
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
          onEdit={(b) => handleEdit(b)}
          pinnedIds={pinnedBookingIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedBookingIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
                showToast({
                  type: 'info',
                  title: isAr ? 'تم إلغاء التثبيت' : isFr ? 'Désépinglé' : 'Unpinned',
                  message: id,
                });
              } else {
                next.add(id);
                showToast({
                  type: 'info',
                  title: isAr ? 'مثبت' : isFr ? 'Épinglé' : 'Pinned',
                  message: id,
                });
              }
              return next;
            });
          }}
          onDelete={(b) => {
            deleteRentalBooking(b.id);
          }}
          selectedIds={selectedBookingIds}
          onSelectionChange={setSelectedBookingIds}
          bulkSecondaryAction={{
            label: isAr ? 'تأكيد المحدد' : isFr ? 'Confirmer sélection' : 'Confirm Selected',
            icon: <CheckCircle2 size={13} />,
            onClick: (ids: Set<string>) => {
              if (ids.size === 0) return;
              runUndoBatch(
                {
                  vertical: 'rental_booking',
                  operationType: 'bulk',
                  affectedCount: ids.size,
                  summary: isAr
                    ? `تأكيد حجوزات (${ids.size})`
                    : isFr
                    ? `Confirmation réservations (${ids.size})`
                    : `Confirm bookings (${ids.size})`,
                },
                () => {
                  ids.forEach((id) => updateRentalBooking(id, { status: 'Confirmed' as BookingStatus }));
                }
              );
              setSelectedBookingIds(new Set<string>());
            },
          }}
          onBulkDelete={(ids) => {
            if (ids.size === 0) return;
            runUndoBatch(
              {
                vertical: 'rental_booking',
                operationType: 'bulk',
                affectedCount: ids.size,
                summary: isAr
                  ? `حذف حجوزات (${ids.size})`
                  : isFr
                  ? `Suppression réservations (${ids.size})`
                  : `Delete bookings (${ids.size})`,
              },
              () => {
                ids.forEach((id) => deleteRentalBooking(id));
              }
            );
            setSelectedBookingIds(new Set<string>());
          }}
          getRowMeta={(b) => {
            const bInfo = resolveRecordBranch(b, branchesById, currentBranch, language);
            const statusText =
              b.status === 'CheckedIn'
                ? t('venue_filter_in_use')
                : b.status === 'Confirmed'
                ? t('venue_filter_confirmed')
                : b.status === 'Tentative'
                ? t('venue_filter_inquiries')
                : b.status === 'Completed'
                ? t('venue_filter_completed')
                : localizeStatus(b.status, language);
            return {
              title: b.purpose,
              subline: `${b.renterName} · ${b.unitName}`,
              avatarText: (b.renterName || 'RS').slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: b.unitName,
              statusLabel: statusText,
              statusVariant:
                b.status === 'Confirmed' || b.status === 'CheckedIn'
                  ? 'active'
                  : b.status === 'Tentative'
                  ? 'warning'
                  : b.status === 'Completed'
                  ? 'info'
                  : 'blocked',
              metricPrimary: formatCurrencyAmount(b.totalAmount, b.currency),
              metricSecondary: `${b.startDateTime.replace('T', ' ').slice(0, 16)} (${b.durationHours}h)`,
              branchName: bInfo.name,
              isPinned: pinnedBookingIds.has(b.id),
              notes: b.notes,
              detailCol1: { heading: t('venue_voucher_renter_name'), primaryText: b.renterName },
              detailCol2: {
                heading: t('venue_inv_capacity'),
                primaryText: t('venue_guests_count', language, { count: b.attendeeCount }),
              },
              detailCol3: {
                heading: t('venue_col_caution'),
                primaryText: formatCurrencyAmount(b.depositAmount, b.currency),
              },
            };
          }}
          getFanActions={(b) => [
            ...(b.status === 'Confirmed'
              ? [
                  {
                    id: 'checkin',
                    label: t('venue_btn_checkin_guest'),
                    icon: <LogIn size={14} />,
                    onClick: () => checkInBooking(b.id),
                  },
                ]
              : b.status === 'CheckedIn'
              ? [
                  {
                    id: 'checkout',
                    label: t('venue_btn_checkout_space'),
                    icon: <LogOut size={14} />,
                    onClick: () => openCheckoutModal(b),
                  },
                ]
              : []),
            {
              id: 'contract',
              label: t('venue_depth_view_contract_btn'),
              icon: <PenTool size={14} />,
              onClick: () => openContractModal(b),
            },
            {
              id: 'print',
              label: t('venue_btn_print_voucher'),
              icon: <Printer size={14} />,
              onClick: () => setPrintedBooking(b),
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
              icon: <Edit2 size={14} />,
              onClick: () => handleEdit(b),
            },
          ]}
          getDetailActions={(b) => [
            ...(b.status === 'Confirmed'
              ? [
                  {
                    id: 'checkin',
                    label: t('venue_btn_checkin_guest'),
                    icon: <LogIn size={13} />,
                    onClick: () => checkInBooking(b.id),
                  },
                ]
              : b.status === 'CheckedIn'
              ? [
                  {
                    id: 'checkout',
                    label: t('venue_btn_checkout_space'),
                    icon: <LogOut size={13} />,
                    onClick: () => openCheckoutModal(b),
                  },
                ]
              : []),
            {
              id: 'print',
              label: t('venue_btn_print_voucher'),
              icon: <Printer size={13} />,
              onClick: () => setPrintedBooking(b),
            },
          ]}
          emptyTitle={t('venue_no_bookings_match')}
          primaryActionLabel={t('venue_btn_new_res')}
          onAddFirstItem={handleNewBooking}
          hasActiveFilters={activeFiltersCount > 0 || searchQuery.trim().length > 0}
          onResetFilters={handleResetFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedBookings.length}
        entityPluralLabel={isAr ? 'حجوزات' : isFr ? 'réservations' : 'bookings'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<RentalBooking>
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
        avatarText={(activeBooking?.renterName || 'RS').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeBooking
            ? resolveRecordBranch(activeBooking, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeBooking?.status === 'CheckedIn'
            ? t('venue_filter_in_use')
            : activeBooking?.status === 'Confirmed'
            ? t('venue_filter_confirmed')
            : activeBooking?.status === 'Tentative'
            ? t('venue_filter_inquiries')
            : activeBooking?.status === 'Completed'
            ? t('venue_filter_completed')
            : activeBooking?.status
        }
        statusClassName={
          activeBooking?.status === 'Confirmed' || activeBooking?.status === 'CheckedIn'
            ? STATUS_PILL_OK
            : activeBooking?.status === 'Tentative'
            ? STATUS_PILL_WARN
            : STATUS_PILL_INFO
        }
        tabs={[
          { id: 'overview', label: isAr ? 'التفاصيل' : isFr ? 'Dossier' : 'Overview' },
          { id: 'financials', label: isAr ? 'المالية والضمان' : isFr ? 'Finances' : 'Financials' },
          { id: 'addons', label: isAr ? 'الخدمات الإضافية' : isFr ? 'Prestations' : 'Add-ons' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onSelectItem={(b) => setInspectedBooking(b)}
        onClose={() => setInspectedBooking(null)}
        onDelete={(b) => deleteRentalBooking(b.id)}
        holdToDelete
        renderBody={(booking, tab) => {
          const paidRatio =
            booking.totalAmount > 0
              ? Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100))
              : 100;

          if (tab === 'financials') {
            const linkedDoc = booking.unifiedDocumentId
              ? unifiedDocuments.find((d) => d.id === booking.unifiedDocumentId)
              : undefined;
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={isAr ? 'الفوترة والضمان' : 'Synthèse financière'}
                >
                  <InspectorBigStat
                    value={formatCurrencyAmount(booking.totalAmount, booking.currency)}
                    tone="accent"
                    caption={
                      booking.contractSigned
                        ? isFr
                          ? 'Contrat signé'
                          : 'Signed'
                        : isFr
                        ? 'En attente signature'
                        : 'Unsigned'
                    }
                  />
                  <InspectorProgressBar
                    percent={paidRatio}
                    tone={booking.balanceDue > 0 ? 'warn' : 'ok'}
                    animateKey={booking.id}
                  />
                  <InspectorCard>
                    <InspectorKeyValue
                      label={t('venue_voucher_caution_held')}
                      value={`${formatCurrencyAmount(booking.depositAmount, booking.currency)} (${booking.depositStatus})`}
                      mono
                      tone="ok"
                    />
                    {Number(booking.lateFeeDzd || 0) > 0 && (
                      <InspectorKeyValue
                        label={t('venue_depth_late_fee_line')}
                        value={formatCurrencyAmount(booking.lateFeeDzd || 0, booking.currency)}
                        mono
                        tone="danger"
                      />
                    )}
                    <InspectorKeyValue
                      label={t('venue_modal_field_paid_amount')}
                      value={formatCurrencyAmount(booking.paidAmount, booking.currency)}
                      mono
                    />
                    <InspectorKeyValue
                      label={t('venue_voucher_balance_due')}
                      value={formatCurrencyAmount(booking.balanceDue, booking.currency)}
                      mono
                      tone={booking.balanceDue > 0 ? 'danger' : 'ok'}
                    />
                    <InspectorKeyValue
                      label={t('venue_depth_issue_invoice_btn')}
                      value={linkedDoc ? `${linkedDoc.docNumber} (${linkedDoc.status})` : '--'}
                      mono
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>

                {booking.stagedPaymentSchedule && booking.stagedPaymentSchedule.length > 0 && (
                  <InspectorSection index={1} title={t('venue_depth_wedding_schedule_title')}>
                    <InspectorCard>
                      {booking.stagedPaymentSchedule.map((stage, idx) => (
                        <InspectorListItem
                          key={stage.id}
                          title={stage.label}
                          subtitle={`${stage.dueDate} · ${formatCurrencyAmount(stage.paidDzd, booking.currency)} / ${formatCurrencyAmount(stage.amountDzd, booking.currency)}`}
                          metaRight={formatCurrencyAmount(stage.amountDzd, booking.currency)}
                          badge={{
                            label: stage.status,
                            tone:
                              stage.status === 'paid'
                                ? 'ok'
                                : stage.status === 'partial'
                                ? 'warn'
                                : 'neutral',
                          }}
                          isLast={idx === booking.stagedPaymentSchedule!.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  </InspectorSection>
                )}

                <div className="space-y-2">
                  <InspectorWideButton
                    label={
                      linkedDoc
                        ? `${linkedDoc.docNumber} (${linkedDoc.status})`
                        : t('venue_depth_issue_invoice_btn')
                    }
                    icon={<FileText size={14} />}
                    tone="accent"
                    onClick={() => {
                      if (!linkedDoc) {
                        const created = createRentalUnifiedInvoice(booking.id);
                        if (created) {
                          showToast({
                            type: 'success',
                            title: t('venue_depth_issue_invoice_btn'),
                            message: created.docNumber || created.draftNumber,
                          });
                        }
                      }
                    }}
                  />
                  {booking.balanceDue > 0 && (
                    <InspectorWideButton
                      label={t('venue_depth_collect_payment_btn')}
                      icon={<CreditCard size={14} />}
                      tone="neutral"
                      onClick={() => openPaymentModal(booking)}
                    />
                  )}
                  <InspectorWideButton
                    label={t('venue_depth_view_contract_btn')}
                    icon={<PenTool size={14} />}
                    tone="neutral"
                    onClick={() => openContractModal(booking)}
                  />
                  <InspectorWideButton
                    label={t('venue_btn_print_voucher')}
                    icon={<Printer size={14} />}
                    tone="neutral"
                    onClick={() => setPrintedBooking(booking)}
                  />
                </div>
              </div>
            );
          }

          if (tab === 'addons') {
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={`${t('venue_modal_sec_addons')} (${booking.addons?.length || 0})`}
                >
                  {!booking.addons || booking.addons.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`venue-addons-${booking.id}`}>
                      <EmptyState
                        variant="compact"
                        icon={<Plus />}
                        title={
                          isAr
                            ? 'لا توجد إضافات مرتبطة بهذا الحجز'
                            : isFr
                            ? 'Aucune prestation additionnelle.'
                            : 'No add-ons attached to this booking.'
                        }
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {booking.addons.map((a, idx) => (
                        <InspectorListItem
                          key={a.id}
                          title={a.name}
                          subtitle={`× ${a.quantity}`}
                          metaRight={formatCurrencyAmount(a.totalPrice, booking.currency)}
                          isLast={idx === booking.addons!.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  ...(booking.status === 'Confirmed'
                    ? [
                        {
                          id: 'checkin',
                          label: t('venue_btn_checkin_guest'),
                          icon: <LogIn size={15} />,
                          primary: true,
                          onClick: () => checkInBooking(booking.id),
                        },
                      ]
                    : booking.status === 'CheckedIn'
                    ? [
                        {
                          id: 'checkout',
                          label: t('venue_btn_checkout_space'),
                          icon: <LogOut size={15} />,
                          primary: true,
                          onClick: () => openCheckoutModal(booking),
                        },
                      ]
                    : []),
                  {
                    id: 'contract',
                    label: t('venue_depth_view_contract_btn'),
                    icon: <PenTool size={15} />,
                    onClick: () => openContractModal(booking),
                  },
                  {
                    id: 'edit',
                    label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
                    icon: <Edit2 size={15} />,
                    primary: booking.status !== 'Confirmed' && booking.status !== 'CheckedIn',
                    onClick: () => handleEdit(booking),
                  },
                  {
                    id: 'print',
                    label: isAr ? 'وصل' : isFr ? 'Bon' : 'Voucher',
                    icon: <Printer size={15} />,
                    onClick: () => setPrintedBooking(booking),
                  },
                ]}
              />

              <InspectorSection index={0} title={isAr ? 'معلومات الحجز' : 'Dossier réservation'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={t('venue_voucher_renter_name')}
                    value={booking.renterName}
                  />
                  {booking.renterCompany && (
                    <InspectorKeyValue
                      label={t('venue_voucher_company')}
                      value={booking.renterCompany}
                    />
                  )}
                  <InspectorKeyValue
                    label={t('venue_voucher_phone')}
                    value={booking.renterPhone}
                    mono
                    copyText={booking.renterPhone}
                  />
                  <InspectorKeyValue label={t('venue_voucher_space')} value={booking.unitName} />
                  <InspectorKeyValue
                    label={t('venue_inv_capacity')}
                    value={`${booking.attendeeCount}`}
                    mono
                  />
                  {booking.driverLicenseNumber && (
                    <InspectorKeyValue
                      label={t('venue_depth_driver_license')}
                      value={booking.driverLicenseNumber}
                      mono
                    />
                  )}
                  {(booking.mileageOut !== undefined || booking.mileageIn !== undefined) && (
                    <InspectorKeyValue
                      label="Odometer (km)"
                      value={`${booking.mileageOut ?? '--'} → ${booking.mileageIn ?? '--'}`}
                      mono
                    />
                  )}
                  <InspectorKeyValue
                    label={t('venue_voucher_window')}
                    value={`${booking.startDateTime.replace('T', ' ').slice(0, 16)} → ${booking.endDateTime.replace('T', ' ').slice(0, 16)} (${booking.durationHours}h)`}
                    mono
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'ملاحظات' : 'Notes'}>
                <InspectorNotesField
                  value={booking.notes || ''}
                  onSave={(val) => updateRentalBooking(booking.id, { notes: val })}
                  placeholder={isAr ? 'إضافة ملاحظة...' : 'Notes de réservation...'}
                />
              </InspectorSection>
            </div>
          );
        }}
      />

      <KineticModalShell
        isOpen={Boolean(printedBooking)}
        onClose={() => setPrintedBooking(null)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {retainedPrintedBooking && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-[var(--atr-divider)] pb-4">
              <div>
                <h3 className="t-pod font-semibold text-black dark:text-white">
                  {t('venue_voucher_title')}
                </h3>
                <span className="t-cap tabular-nums text-black/55 dark:text-white/55">
                  {t('venue_voucher_ref', language, { id: retainedPrintedBooking.id })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrintedBooking(null)}
                data-sq="ctl-sm"
                data-sq-border="none"
                className="p-2 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 t-cap">
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2"
              >
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">
                    {t('venue_voucher_renter_name')}
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {retainedPrintedBooking.renterName}
                  </span>
                </div>
                {retainedPrintedBooking.renterCompany && (
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">
                      {t('venue_voucher_company')}
                    </span>
                    <span className="font-medium text-black dark:text-white">
                      {retainedPrintedBooking.renterCompany}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">
                    {t('venue_voucher_phone')}
                  </span>
                  <span className="tabular-nums text-black dark:text-white">
                    {retainedPrintedBooking.renterPhone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">
                    {t('venue_voucher_space')}
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {retainedPrintedBooking.unitName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">
                    {t('venue_voucher_window')}
                  </span>
                  <span className="tabular-nums text-black dark:text-white">
                    {retainedPrintedBooking.startDateTime.replace('T', ' ').slice(0, 16)} -{' '}
                    {retainedPrintedBooking.endDateTime.split('T')[1]?.slice(0, 5)}
                  </span>
                </div>
              </div>
              <div
                data-sq="card"
                data-sq-border="none"
                className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2"
              >
                <div className="flex justify-between font-semibold text-black dark:text-white">
                  <span>{t('venue_voucher_total_hire')}</span>
                  <span className="tabular-nums">
                    {formatCurrencyAmount(retainedPrintedBooking.totalAmount, retainedPrintedBooking.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-black/70 dark:text-white/75">
                  <span>{t('venue_voucher_caution_held')}</span>
                  <span className="font-medium text-emerald-600 tabular-nums">
                    {formatCurrencyAmount(retainedPrintedBooking.depositAmount, retainedPrintedBooking.currency)} (
                    {retainedPrintedBooking.depositStatus === 'Held'
                      ? t('venue_held_status')
                      : retainedPrintedBooking.depositStatus === 'Refunded'
                      ? t('venue_refunded_status')
                      : t('venue_deducted_status')}
                    )
                  </span>
                </div>
                <div className="flex justify-between text-black/70 dark:text-white/75">
                  <span>{t('venue_voucher_balance_due')}</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrencyAmount(retainedPrintedBooking.balanceDue, retainedPrintedBooking.currency)}
                  </span>
                </div>
              </div>
              <div
                data-sq="ctl"
                data-sq-border="none"
                className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap text-black/55 dark:text-white/75 leading-relaxed"
              >
                {t('venue_voucher_disclaimer')}
              </div>
            </div>
            <div className="flex justify-end rtl:justify-start gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <button
                type="button"
                onClick={() => window.print()}
                data-sq="ctl"
                data-sq-border="none"
                className="px-5 py-2 bg-[var(--brand-fill,#C9461F)] hover:bg-[#b03b1b] text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} /> {t('venue_btn_print_agreement')}
              </button>
            </div>
          </div>
        )}
      </KineticModalShell>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        bookingToEdit={bookingToEdit}
      />
      {canAccessCloudDiagnostics && (
        <VenueCloudSyncModal
          isOpen={isCloudSyncModalOpen}
          onClose={() => setIsCloudSyncModalOpen(false)}
        />
      )}

      {/* Return Inspection & Late Fee Check-out Modal */}
      <KineticModalShell
        isOpen={Boolean(checkoutTarget)}
        onClose={() => setCheckoutTarget(null)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        {checkoutTarget && (() => {
          const unit = rentableUnits.find((u) => u.id === checkoutTarget.unitId);
          const actualIso = checkoutReturnAt ? `${checkoutReturnAt}:00Z` : new Date().toISOString();
          const feePreview = computeLateReturnFee({
            scheduledEndDateTime: checkoutTarget.endDateTime,
            actualReturnDateTime: actualIso,
            hourlyRate: unit?.lateHourlyRate || unit?.hourlyRate || 0,
            dailyRate: unit?.dailyRate || 0,
            graceMinutes: unit?.graceMinutes ?? 15,
          });
          return (
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <h3 className="font-semibold t-card text-black dark:text-white">
                  {t('venue_depth_checkout_modal_title')}
                </h3>
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="text-black/55 dark:text-white/55 p-1"
                >
                  <X size={18} />
                </button>
              </div>
              <LabelInput
                label={t('venue_depth_actual_return')}
                type="datetime-local"
                value={checkoutReturnAt}
                onChange={setCheckoutReturnAt}
              />
              <div
                data-sq="ctl"
                data-sq-border="none"
                className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap space-y-1"
              >
                <div className="flex justify-between">
                  <span>{t('venue_depth_late_fee_preview')}</span>
                  <strong className="tabular-nums text-[#d4522f]">
                    {formatCurrencyAmount(feePreview.lateFeeDzd, checkoutTarget.currency)}
                  </strong>
                </div>
                <div className="text-black/60 dark:text-white/60">
                  Overdue: {feePreview.overdueMinutes} min ({feePreview.billableLateHours}h billed after {unit?.graceMinutes ?? 15}m grace)
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={t('venue_depth_odometer_in')}
                  type="number"
                  value={checkoutMileageIn}
                  onChange={setCheckoutMileageIn}
                />
                <LabelInput
                  label={t('venue_depth_fuel_in')}
                  type="number"
                  min={0}
                  max={100}
                  value={checkoutFuelIn}
                  onChange={setCheckoutFuelIn}
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-[#F5F1EC] dark:bg-[#292624]">
                <span className="t-cap font-medium flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  {t('venue_depth_damage_detected')}
                </span>
                <LiveSwitch
                  checked={checkoutDamageDetected}
                  onCheckedChange={setCheckoutDamageDetected}
                  aria-label={t('venue_depth_damage_detected')}
                />
              </div>
              {checkoutDamageDetected && (
                <LabelInput
                  label={t('venue_depth_damage_charge')}
                  type="number"
                  value={checkoutDamageAmount}
                  onChange={setCheckoutDamageAmount}
                />
              )}
              <LabelInput
                label={t('venue_depth_condition_notes')}
                value={checkoutConditionNotes}
                onChange={setCheckoutConditionNotes}
              />
              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setCheckoutTarget(null)}>
                  {t('action_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  onClick={() => {
                    checkOutBooking(checkoutTarget.id, {
                      actualReturnAt: actualIso,
                      mileageIn: checkoutMileageIn ? Number(checkoutMileageIn) : undefined,
                      fuelInPct: checkoutFuelIn ? Number(checkoutFuelIn) : undefined,
                      conditionNotes: checkoutConditionNotes.trim() || undefined,
                      damageDetected: checkoutDamageDetected,
                      damageAmountDzd: checkoutDamageDetected ? Number(checkoutDamageAmount) || 0 : 0,
                    });
                    setCheckoutTarget(null);
                  }}
                >
                  {t('venue_depth_confirm_checkout')}
                </AtriumButton>
              </div>
            </div>
          );
        })()}
      </KineticModalShell>

      {/* Contract Preview & E-Sign Modal */}
      <KineticModalShell
        isOpen={Boolean(contractTarget)}
        onClose={() => setContractTarget(null)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        {contractTarget && (() => {
          const unit = rentableUnits.find((u) => u.id === contractTarget.unitId);
          const renter = rentalRenters.find((r) => r.id === contractTarget.renterId);
          const tpl = rentalContractTemplates.find((tplItem) => tplItem.id === contractTemplatePick) || null;
          const renderedDoc = renderRentalContractDocument({
            template: tpl,
            booking: contractTarget,
            unit,
            renter,
            businessName,
          });
          const getPt = (e: React.PointerEvent<SVGSVGElement>): [number, number] | null => {
            const svg = contractSigSvgRef.current;
            if (!svg) return null;
            const rect = svg.getBoundingClientRect();
            if (!rect.width || !rect.height) return null;
            return [
              Math.round(((e.clientX - rect.left) / rect.width) * 320),
              Math.round(((e.clientY - rect.top) / rect.height) * 80),
            ];
          };
          return (
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <h3 className="font-semibold t-card text-black dark:text-white">
                  {t('venue_depth_contract_title')}
                </h3>
                <button
                  type="button"
                  onClick={() => setContractTarget(null)}
                  className="text-black/55 dark:text-white/55 p-1"
                >
                  <X size={18} />
                </button>
              </div>
              <LabelSelect
                label={t('venue_depth_contract_template')}
                value={contractTemplatePick}
                onChange={setContractTemplatePick}
                options={[
                  { value: '', label: t('venue_depth_default_template') },
                  ...rentalContractTemplates.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
              <pre className="p-3 bg-[#F5F1EC] dark:bg-[#191716] rounded-lg t-cap whitespace-pre-wrap text-black dark:text-white max-h-48 overflow-y-auto">
                {renderedDoc}
              </pre>
              <LabelInput
                label={t('venue_depth_signer_name')}
                value={contractSignerName}
                onChange={setContractSignerName}
              />
              <div className="space-y-1.5">
                <div className="flex justify-between t-cap text-black/65 dark:text-white/65">
                  <span>{t('venue_depth_signature_pad')}</span>
                  <button
                    type="button"
                    onClick={() => setContractSigPath('')}
                    className="hover:text-[#d4522f] cursor-pointer"
                  >
                    {t('venue_depth_clear_sig')}
                  </button>
                </div>
                <svg
                  ref={contractSigSvgRef}
                  viewBox="0 0 320 80"
                  onPointerDown={(e) => {
                    const pt = getPt(e);
                    if (!pt) return;
                    setIsDrawingContractSig(true);
                    setContractSigPath((p) => `${p ? `${p} ` : ''}M${pt[0]},${pt[1]}`);
                  }}
                  onPointerMove={(e) => {
                    if (!isDrawingContractSig) return;
                    const pt = getPt(e);
                    if (pt) setContractSigPath((p) => `${p} L${pt[0]},${pt[1]}`);
                  }}
                  onPointerUp={() => setIsDrawingContractSig(false)}
                  onPointerLeave={() => setIsDrawingContractSig(false)}
                  className="w-full h-20 bg-[#F5F1EC] dark:bg-[#191716] border border-[var(--atr-divider)] rounded-lg touch-none cursor-crosshair"
                >
                  {contractSigPath && (
                    <path
                      d={contractSigPath}
                      fill="none"
                      stroke="#d4522f"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setContractTarget(null)}>
                  {t('action_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  onClick={() => {
                    const ok = signRentalBookingContract(contractTarget.id, {
                      signerName: contractSignerName,
                      signatureData: contractSigPath,
                      templateId: contractTemplatePick || undefined,
                    });
                    if (ok) setContractTarget(null);
                  }}
                >
                  {t('venue_depth_sign_contract_btn')}
                </AtriumButton>
              </div>
            </div>
          );
        })()}
      </KineticModalShell>

      {/* 6.2 Unified Payment Collection Modal */}
      <KineticModalShell
        isOpen={Boolean(paymentTarget)}
        onClose={() => setPaymentTarget(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        {paymentTarget && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <h3 className="font-semibold t-card text-black dark:text-white">
                {t('venue_depth_payment_modal_title')}
              </h3>
              <button
                type="button"
                onClick={() => setPaymentTarget(null)}
                className="text-black/55 dark:text-white/55 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <LabelInput
              label={t('venue_depth_payment_amount')}
              type="number"
              min={1}
              value={paymentAmountDzd}
              onChange={setPaymentAmountDzd}
            />
            <LabelSelect
              label={t('venue_depth_payment_method')}
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: 'cash', label: 'Cash / Espèces' },
                { value: 'bank_transfer', label: 'Bank Transfer / Virement' },
                { value: 'ccp', label: 'CCP' },
                { value: 'cib_edahabia', label: 'CIB / Edahabia' },
                { value: 'cheque', label: 'Cheque' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <AtriumButton variant="secondary" onClick={() => setPaymentTarget(null)}>
                {t('action_cancel')}
              </AtriumButton>
              <AtriumButton
                variant="primary"
                onClick={() => {
                  const amt = Number(paymentAmountDzd) || 0;
                  if (amt <= 0) return;
                  recordRentalUnifiedPayment(paymentTarget.id, {
                    amountDzd: amt,
                    method: paymentMethod,
                  });
                  setPaymentTarget(null);
                }}
              >
                {t('venue_depth_collect_payment_btn')}
              </AtriumButton>
            </div>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};
