import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  DoorOpen,
  Edit2,
  Check,
  X,
  Calendar,
  Power,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentRentableUnitsFromState,
  selectCurrentRentalBookingsFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { RentableUnit, RentableUnitType, RentableUnitStatus } from '../../../types/index';
import { formatCurrencyAmount, localizeStatus } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
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
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticEmptyStateMotion,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const STATUS_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]';

type DrawerTab = 'fiche' | 'planning' | 'rates';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const VenueInventoryView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const { rentableUnits, rentalBookings, currentBranch, branches, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      rentableUnits: selectCurrentRentableUnitsFromState(s),
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const {
    createRentableUnit,
    updateRentableUnit,
    deleteRentableUnit,
    retryCloudSync,
  } = useAtriumActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<RentableUnit | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedUnitIds, setPinnedUnitIds] = useState<Set<string>>(() => new Set<string>());
  const [unitSortBy, setUnitSortBy] = useState<string>('name');
  const [unitSortDir, setUnitSortDir] = useState<'asc' | 'desc'>('asc');

  const [selectedUnit, setSelectedUnit] = useState<RentableUnit | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('fiche');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<string | undefined>(
    undefined
  );

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<RentableUnitType>('Hall');
  const [capacity, setCapacity] = useState('');
  const [surfaceAreaSqm, setSurfaceAreaSqm] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [amenitiesStr, setAmenitiesStr] = useState('');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#8B5CF6');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    rentableUnits.forEach((u) => {
      const bName = resolveRecordBranch(u, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [rentableUnits, branchesById, currentBranch, language]);

  const activeUnit = useMemo(() => {
    if (!selectedUnit) return null;
    return rentableUnits.find((u) => u.id === selectedUnit.id) || null;
  }, [selectedUnit, rentableUnits]);

  const filteredUnits = useMemo(() => {
    return rentableUnits.filter((u) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(u, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (selectedTypeFilter !== 'All' && u.type !== selectedTypeFilter) return false;
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          u.name.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q) ||
          (u.description && u.description.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [
    rentableUnits,
    branchFilter,
    selectedTypeFilter,
    statusFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedUnits = useMemo(() => {
    return [...filteredUnits].sort((a, b) => {
      const aPinned = pinnedUnitIds.has(a.id);
      const bPinned = pinnedUnitIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (unitSortBy === 'name' || unitSortBy === 'code') {
        const cmp = a.name.localeCompare(b.name);
        return unitSortDir === 'asc' ? cmp : -cmp;
      }
      if (unitSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return unitSortDir === 'asc' ? cmp : -cmp;
      }
      if (unitSortBy === 'capacity') {
        return unitSortDir === 'asc' ? a.capacity - b.capacity : b.capacity - a.capacity;
      }
      if (unitSortBy === 'surface') {
        const aSurf = a.surfaceAreaSqm || 0;
        const bSurf = b.surfaceAreaSqm || 0;
        return unitSortDir === 'asc' ? aSurf - bSurf : bSurf - aSurf;
      }
      if (unitSortBy === 'rates') {
        return unitSortDir === 'asc' ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate;
      }
      if (unitSortBy === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return unitSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [
    filteredUnits,
    pinnedUnitIds,
    unitSortBy,
    unitSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const totalSpaces = rentableUnits.length;
  const availableSpaces = rentableUnits.filter((u) => u.status === 'Available').length;
  const totalCapacity = rentableUnits.reduce((sum, u) => sum + u.capacity, 0);
  const averageHourlyRate =
    totalSpaces > 0
      ? Math.round(rentableUnits.reduce((sum, u) => sum + u.hourlyRate, 0) / totalSpaces)
      : 0;

  const handleOpenAdd = useCallback(() => {
    setUnitToEdit(null);
    setName('');
    setCode('');
    setType('Room');
    setCapacity('');
    setSurfaceAreaSqm('');
    setHourlyRate('');
    setDailyRate('');
    setAmenitiesStr('');
    setDescription('');
    setColorHex('#3B82F6');
    setIsAddModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((unit: RentableUnit) => {
    setUnitToEdit(unit);
    setName(unit.name);
    setCode(unit.code);
    setType(unit.type);
    setCapacity(unit.capacity ? String(unit.capacity) : '');
    setSurfaceAreaSqm(unit.surfaceAreaSqm ? String(unit.surfaceAreaSqm) : '');
    setHourlyRate(unit.hourlyRate !== undefined ? String(unit.hourlyRate) : '');
    setDailyRate(unit.dailyRate !== undefined ? String(unit.dailyRate) : '');
    setAmenitiesStr(unit.amenities.join(', '));
    setDescription(unit.description);
    setColorHex(unit.colorHex || '#8B5CF6');
    setIsAddModalOpen(true);
  }, []);

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({
        type: 'warning',
        title: isFr ? 'Nom manquant' : 'Missing Space Name',
        message: isFr
          ? 'Veuillez saisir un nom pour cet espace.'
          : 'Please provide a name for this rentable hall or unit.',
      });
      return;
    }
    const parsedCapacity = parseInt(capacity, 10);
    const parsedHourly = parseFloat(hourlyRate);
    const parsedDaily = parseFloat(dailyRate);
    if (!Number.isFinite(parsedCapacity) || parsedCapacity < 1) {
      showToast({
        type: 'warning',
        title: isFr ? 'Capacité requise' : 'Capacity Required',
        message: isFr
          ? 'Veuillez saisir une capacité valide (au moins 1 place).'
          : 'Please enter a valid guest capacity (at least 1).',
      });
      return;
    }
    if (
      hourlyRate.trim() === '' ||
      !Number.isFinite(parsedHourly) ||
      parsedHourly < 0 ||
      dailyRate.trim() === '' ||
      !Number.isFinite(parsedDaily) ||
      parsedDaily < 0
    ) {
      showToast({
        type: 'warning',
        title: isFr ? 'Tarifs requis' : 'Rates Required',
        message: isFr
          ? 'Veuillez saisir les tarifs horaire et journalier (DZD).'
          : 'Please enter valid hourly and daily rates (DZD).',
      });
      return;
    }
    const parsedSurface =
      surfaceAreaSqm.trim() !== '' && Number.isFinite(parseFloat(surfaceAreaSqm))
        ? parseFloat(surfaceAreaSqm)
        : undefined;
    const amenitiesList = amenitiesStr
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (unitToEdit) {
      updateRentableUnit(unitToEdit.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        capacity: parsedCapacity,
        surfaceAreaSqm: parsedSurface,
        hourlyRate: parsedHourly,
        dailyRate: parsedDaily,
        amenities: amenitiesList,
        description: description.trim(),
        colorHex,
      });
    } else {
      createRentableUnit({
        name: name.trim(),
        code: code.trim().toUpperCase() || `ROOM-${Date.now().toString().slice(-4)}`,
        type,
        capacity: parsedCapacity,
        surfaceAreaSqm: parsedSurface,
        hourlyRate: parsedHourly,
        dailyRate: parsedDaily,
        currency: 'DZD',
        status: 'Available',
        amenities: amenitiesList,
        description: description.trim(),
        colorHex,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleToggleStatus = useCallback(
    (unit: RentableUnit) => {
      const nextStatus: RentableUnitStatus =
        unit.status === 'Available' ? 'Maintenance' : 'Available';
      updateRentableUnit(unit.id, { status: nextStatus });
    },
    [updateRentableUnit]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTypeFilter('All');
    setStatusFilter('All');
    setBranchFilter('All');
  }, []);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (selectedTypeFilter !== 'All' ? 1 : 0) +
    (statusFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedTypeFilter !== 'All') {
      chips.push({
        key: 'type',
        label: `${isAr ? 'النوع' : isFr ? 'Type' : 'Type'}: ${selectedTypeFilter}`,
        onRemove: () => setSelectedTypeFilter('All'),
      });
    }
    if (statusFilter !== 'All') {
      chips.push({
        key: 'status',
        label: `${t('venue_inv_col_status')}: ${statusFilter}`,
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
  }, [selectedTypeFilter, statusFilter, branchFilter, t, isAr, isFr]);

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
            count: rentableUnits.length,
          },
          ...Array.from(branchCounts.entries()).map(([bName, count]) => ({
            value: bName,
            label: bName,
            count,
          })),
        ],
      },
      {
        id: 'type',
        label: t('venue_inv_type'),
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
        label: t('venue_inv_col_status'),
        value: statusFilter,
        onChange: setStatusFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All', count: rentableUnits.length },
          {
            value: 'Available',
            label: isAr ? 'متاحة' : isFr ? 'Disponible' : 'Available',
            count: availableSpaces,
          },
          {
            value: 'Occupied',
            label: t('venue_kpi_in_use'),
            count: rentableUnits.filter((u) => u.status === 'Occupied').length,
          },
          {
            value: 'Maintenance',
            label: isAr ? 'صيانة' : 'Maintenance',
            count: rentableUnits.filter((u) => u.status === 'Maintenance').length,
          },
        ],
      },
    ],
    [
      isAr,
      isFr,
      branchFilter,
      rentableUnits,
      branchCounts,
      t,
      selectedTypeFilter,
      statusFilter,
      availableSpaces,
    ]
  );

  const handleExportUnitsCSV = useCallback(() => {
    const headers = [
      isAr ? 'رمز القاعة' : 'Code',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'الاسم' : 'Name',
      isAr ? 'النوع' : 'Type',
      isAr ? 'الطاقة الاستيعابية' : 'Capacity',
      isAr ? 'المساحة م²' : 'Surface (sqm)',
      isAr ? 'السعر بالساعة' : 'Hourly Rate',
      isAr ? 'السعر باليوم' : 'Daily Rate',
      isAr ? 'الحالة' : 'Status',
      isAr ? 'الميزات والتجهيزات' : 'Amenities',
    ];
    const rows = sortedUnits.map((u) => [
      u.code,
      resolveRecordBranch(u, branchesById, currentBranch, language).name,
      u.name,
      u.type,
      u.capacity,
      u.surfaceAreaSqm || '',
      u.hourlyRate,
      u.dailyRate,
      u.status,
      u.amenities.join('; '),
    ]);
    downloadCsvSafe(
      `atrium-venue-spaces-${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : isFr ? 'Export CSV réussi' : 'CSV Exported',
      message: `${sortedUnits.length} ${isFr ? 'espaces exportés.' : 'spaces exported.'}`,
      category: 'rental_booking',
    });
  }, [sortedUnits, branchesById, currentBranch, language, isAr, isFr]);

  const unitColumns: ColumnDefinition<RentableUnit>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('venue_inv_col_space'),
        width: '2.3*',
        minWidth: '210px',
        sortable: true,
        renderCell: (u) => {
          const localizedType =
            u.type === 'Hall'
              ? t('venue_type_hall')
              : u.type === 'Studio'
              ? t('venue_type_studio')
              : u.type === 'Room'
              ? t('venue_type_room')
              : u.type === 'Court'
              ? t('venue_type_court')
              : t('venue_type_desk');
          return (
            <div className="flex items-center gap-3">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: u.colorHex || '#8B5CF6' }}
              />
              <div className="min-w-0">
                <div className="font-semibold text-black dark:text-white truncate">{u.name}</div>
                <div className="t-cap text-black/55 dark:text-white/55 truncate">
                  {u.code} · {localizedType}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '125px',
        sortable: true,
        renderCell: (u) => {
          const bInfo = resolveRecordBranch(u, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--r-check,6px)] t-small font-medium bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'capacity',
        header: t('venue_inv_col_capacity'),
        width: '1.1*',
        minWidth: '105px',
        sortable: true,
        renderCell: (u) => (
          <span className="font-medium t-small text-black dark:text-white tabular-nums">
            {t('venue_card_capacity', language, { count: u.capacity })}
          </span>
        ),
      },
      {
        key: 'surface',
        header: t('venue_inv_surface'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (u) => (
          <span className="t-cap text-black/70 dark:text-white/75 tabular-nums">
            {u.surfaceAreaSqm
              ? t('venue_inv_surface_unit', language, { surface: u.surfaceAreaSqm })
              : '--'}
          </span>
        ),
      },
      {
        key: 'rates',
        header: t('venue_inv_col_rates'),
        width: '1.8*',
        minWidth: '160px',
        sortable: true,
        renderCell: (u) => (
          <div className="t-cap space-y-0.5">
            <div className="font-semibold text-black dark:text-white tabular-nums">
              {formatCurrencyAmount(u.hourlyRate, u.currency)} / {t('venue_inv_hourly_short')}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
              {formatCurrencyAmount(u.dailyRate, u.currency)} / {t('venue_inv_daily_short')}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('venue_inv_col_status'),
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (u) => {
          const localizedStatus =
            u.status === 'Available'
              ? isAr
                ? 'متاحة'
                : isFr
                ? 'Disponible'
                : 'Available'
              : u.status === 'Occupied'
              ? t('venue_kpi_in_use')
              : isAr
              ? 'صيانة'
              : 'Maintenance';
          return (
            <span
              className={`inline-block px-2.5 py-1 rounded-full t-small font-semibold tracking-wide ${
                u.status === 'Available'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : u.status === 'Occupied'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            >
              {localizedStatus}
            </span>
          );
        },
      },
    ],
    [t, language, isAr, isFr, branchesById, currentBranch]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: rentableUnits.length > 0,
  });

  if (showSkeleton && (rentableUnits.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.3*', minWidth: '180px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
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
      <ScreenHeaderBar
        icon={<DoorOpen size={22} />}
        title={t('venue_inv_title')}
        primaryAction={{
          label: t('venue_inv_btn_new_space'),
          onClick: handleOpenAdd,
          icon: <Plus size={16} strokeWidth={2.5} />,
          dataAction: 'new-venue-space',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'سعة المرافق & أداء الحظيرة'
            : isFr
            ? 'Capacité des Espaces & Performance'
            : 'Venue Capacity & Portfolio Performance'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'القاعات الجاهزة للاستغلال'
            : isFr
            ? 'Espaces Disponibles'
            : 'Available Spaces',
          badgeText: `${availableSpaces} / ${totalSpaces} ${isAr ? 'جاهزة' : isFr ? 'prêtes' : 'ready'}`,
          count: availableSpaces,
          tone: 'emerald',
          isActive: statusFilter === 'Available',
          onToggle: () =>
            setStatusFilter((prev) => (prev === 'Available' ? 'All' : 'Available')),
        }}
        secondaryCard={{
          label: isAr
            ? 'طاقة الاستقبال الإجمالية'
            : isFr
            ? "Capacité d'Accueil Totale"
            : 'Total Guest Capacity',
          badgeText: isAr ? 'مقعد / ضيف' : isFr ? 'places' : 'seats',
          count: totalCapacity,
          tone: 'terracotta',
          isActive: selectedTypeFilter === 'Hall',
          onToggle: () => setSelectedTypeFilter((prev) => (prev === 'Hall' ? 'All' : 'Hall')),
        }}
        darkCard={{
          label: isAr
            ? 'متوسط السعر الساعي'
            : isFr
            ? 'Tarif Horaire Moyen'
            : 'Average Hourly Rate',
          badgeCount: totalSpaces,
          badgePrefix: '',
          badgeSuffix: isAr ? 'مرافق' : isFr ? 'espaces' : 'spaces',
          valueCount: averageHourlyRate,
          valuePrefix: '',
          formatValue: (v) => formatCurrencyAmount(v, 'DZD'),
          caption: isFr ? 'Tarification de base' : 'Baseline Facility Index',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'دليل القاعات والمرافق'
              : isFr
              ? 'Catalogue des Espaces'
              : 'Spaces Catalog'
          }
          liveRegionText={`${sortedUnits.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('venue_inv_search_ph')}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All', count: totalSpaces },
            { value: 'Hall', label: isAr ? 'قاعات' : isFr ? 'Salles' : 'Halls' },
            { value: 'Studio', label: isAr ? 'أستوديوهات' : 'Studios' },
            { value: 'Room', label: isAr ? 'اجتماعات' : isFr ? 'Réunion' : 'Rooms' },
            { value: 'Court', label: isAr ? 'ملاعب' : isFr ? 'Terrains' : 'Courts' },
            { value: 'Desk', label: isAr ? 'مكاتب' : isFr ? 'Bureaux' : 'Desks' },
          ]}
          statusValue={selectedTypeFilter}
          onStatusChange={setSelectedTypeFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={(m: 'list' | 'grid' | 'calendar') => {
            if (m === 'list' || m === 'grid') setViewMode(m);
          }}
          showViewToggle
          onExport={handleExportUnitsCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<RentableUnit>
          hideToolbar
          items={sortedUnits}
          keyExtractor={(u) => u.id}
          viewMode={viewMode}
          defaultViewMode="grid"
          columns={unitColumns}
          sortBy={unitSortBy}
          sortDirection={unitSortDir}
          onSortChange={(key, dir) => {
            setUnitSortBy(key);
            setUnitSortDir(dir);
          }}
          openItemId={activeUnit?.id || null}
          onItemClick={(u, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedUnit(u);
          }}
          onViewDetails={(u, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedUnit(u);
          }}
          onEdit={handleOpenEdit}
          pinnedIds={pinnedUnitIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedUnitIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onDelete={(u) => {
            deleteRentableUnit(u.id);
            if (selectedUnit?.id === u.id) setSelectedUnit(null);
          }}
          selectedIds={selectedUnitIds}
          onSelectionChange={setSelectedUnitIds}
          bulkSecondaryAction={{
            label: isAr ? 'تعيين كمتاحة' : isFr ? 'Rendre Disponible' : 'Mark Available',
            icon: <Check size={13} />,
            onClick: (ids: Set<string>) => {
              if (ids.size === 0) return;
              runUndoBatch(
                {
                  vertical: 'rental_booking',
                  operationType: 'bulk',
                  affectedCount: ids.size,
                  summary: isAr
                    ? `تفعيل فضاءات (${ids.size})`
                    : isFr
                    ? `Mise à disposition (${ids.size})`
                    : `Mark spaces available (${ids.size})`,
                },
                () => {
                  ids.forEach((id) => updateRentableUnit(id, { status: 'Available' }));
                }
              );
              setSelectedUnitIds(new Set<string>());
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
                  ? `حذف فضاءات (${ids.size})`
                  : isFr
                  ? `Suppression espaces (${ids.size})`
                  : `Delete spaces (${ids.size})`,
              },
              () => {
                ids.forEach((id) => deleteRentableUnit(id));
              }
            );
            setSelectedUnitIds(new Set<string>());
          }}
          getRowMeta={(unit) => {
            const bInfo = resolveRecordBranch(unit, branchesById, currentBranch, language);
            const localizedType =
              unit.type === 'Hall'
                ? t('venue_type_hall')
                : unit.type === 'Studio'
                ? t('venue_type_studio')
                : unit.type === 'Room'
                ? t('venue_type_room')
                : unit.type === 'Court'
                ? t('venue_type_court')
                : t('venue_type_desk');
            const localizedStatus =
              unit.status === 'Available'
                ? isAr
                  ? 'متاحة'
                  : isFr
                  ? 'Disponible'
                  : 'Available'
                : unit.status === 'Occupied'
                ? t('venue_kpi_in_use')
                : isAr
                ? 'صيانة'
                : 'Maintenance';
            return {
              title: unit.name,
              subline: `${unit.code} · ${localizedType}`,
              avatarText: (
                (unit.code || unit.name || 'SP').replace(/[^A-Za-z0-9]/g, '') || 'SP'
              )
                .slice(0, 2)
                .toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: localizedType,
              statusLabel: localizedStatus,
              statusVariant:
                unit.status === 'Available'
                  ? 'active'
                  : unit.status === 'Occupied'
                  ? 'info'
                  : 'warning',
              metricPrimary: `${formatCurrencyAmount(unit.hourlyRate, unit.currency)} / ${t('venue_inv_hourly_short')}`,
              metricSecondary: t('venue_card_capacity', language, { count: unit.capacity }),
              branchName: bInfo.name,
              isPinned: pinnedUnitIds.has(unit.id),
              notes: unit.description,
              detailCol1: {
                heading: t('venue_inv_capacity'),
                primaryText: t('venue_card_capacity', language, { count: unit.capacity }),
              },
              detailCol2: {
                heading: t('venue_inv_surface'),
                primaryText: unit.surfaceAreaSqm
                  ? t('venue_inv_surface_unit', language, { surface: unit.surfaceAreaSqm })
                  : '--',
              },
              detailCol3: {
                heading: t('venue_inv_daily_rate'),
                primaryText: formatCurrencyAmount(unit.dailyRate, unit.currency),
              },
            };
          }}
          getFanActions={(u) => [
            {
              id: 'book',
              label: t('venue_btn_reserve'),
              icon: <Calendar size={14} />,
              onClick: () => {
                setSelectedUnitForBooking(u.id);
                setIsBookingModalOpen(true);
              },
            },
            {
              id: 'toggle',
              label: isAr ? 'تبديل الحالة' : 'Statut',
              icon: <Power size={14} />,
              onClick: () => handleToggleStatus(u),
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
              icon: <Edit2 size={14} />,
              onClick: () => handleOpenEdit(u),
            },
          ]}
          getDetailActions={(u) => [
            {
              id: 'book',
              label: t('venue_reserve_space'),
              icon: <Calendar size={13} />,
              onClick: () => {
                setSelectedUnitForBooking(u.id);
                setIsBookingModalOpen(true);
              },
            },
            {
              id: 'toggle',
              label: u.status,
              icon: <Power size={13} />,
              onClick: () => handleToggleStatus(u),
            },
          ]}
          emptyTitle={t('venue_no_spaces_filter')}
          primaryActionLabel={t('venue_inv_btn_new_space')}
          onAddFirstItem={handleOpenAdd}
          hasActiveFilters={activeFiltersCount > 0 || searchQuery.trim().length > 0}
          onResetFilters={handleResetFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedUnits.length}
        entityPluralLabel={isAr ? 'مساحات' : isFr ? 'espaces' : 'spaces'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<RentableUnit>
        isOpen={Boolean(activeUnit)}
        item={activeUnit}
        allItems={sortedUnits}
        keyExtractor={(u) => u.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeUnit?.name || ''}
        subtitle={activeUnit ? `${activeUnit.code} · ${activeUnit.type}` : ''}
        avatarText={(
          (activeUnit?.code || 'SP').replace(/[^A-Za-z0-9]/g, '') || 'SP'
        )
          .slice(0, 2)
          .toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeUnit
            ? resolveRecordBranch(activeUnit, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeUnit ? localizeStatus(activeUnit.status, language) : undefined}
        statusClassName={
          activeUnit?.status === 'Available'
            ? STATUS_PILL_OK
            : activeUnit?.status === 'Occupied'
            ? STATUS_PILL_INFO
            : STATUS_PILL_WARN
        }
        tabs={[
          { id: 'fiche', label: isFr ? 'Fiche Espace' : 'Space Specs' },
          { id: 'planning', label: isFr ? 'Planning' : 'Schedule' },
          { id: 'rates', label: isFr ? 'Tarifs' : 'Rates' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onSelectItem={(u) => setSelectedUnit(u)}
        onClose={() => setSelectedUnit(null)}
        onDelete={(u) => deleteRentableUnit(u.id)}
        holdToDelete
        renderBody={(unit, tab) => {
          const unitBookings = rentalBookings.filter((b) => b.unitId === unit.id);

          if (tab === 'planning') {
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={`${isFr ? 'Créneaux réservés' : 'Reserved Slots'} (${unitBookings.length})`}
                >
                  {unitBookings.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`venue-inv-plan-${unit.id}`}>
                      <EmptyState
                        variant="compact"
                        icon={<Calendar />}
                        title={
                          isFr
                            ? 'Aucun créneau planifié sur cet espace.'
                            : 'No scheduled slots for this space.'
                        }
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {unitBookings.map((b, idx) => (
                        <InspectorListItem
                          key={b.id}
                          title={b.purpose || 'Session'}
                          subtitle={new Date(b.startDateTime).toLocaleDateString()}
                          metaRight={formatCurrencyAmount(b.totalAmount, b.currency)}
                          badge={{
                            label: b.status,
                            tone: b.status === 'Confirmed' || b.status === 'CheckedIn' ? 'ok' : 'neutral',
                          }}
                          isLast={idx === unitBookings.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
                </InspectorSection>

                <InspectorWideButton
                  label={t('venue_reserve_space')}
                  icon={<Calendar size={14} />}
                  tone="accent"
                  onClick={() => {
                    setSelectedUnitForBooking(unit.id);
                    setIsBookingModalOpen(true);
                  }}
                />
              </div>
            );
          }

          if (tab === 'rates') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isFr ? 'Grille tarifaire' : 'Hire Rates'}>
                  <InspectorBigStat
                    value={`${formatCurrencyAmount(unit.hourlyRate, unit.currency)} / h`}
                    tone="accent"
                    caption={t('venue_inv_hourly_rate')}
                  />
                  <InspectorCard>
                    <InspectorKeyValue
                      label={t('venue_inv_hourly_rate')}
                      value={`${formatCurrencyAmount(unit.hourlyRate, unit.currency)} / h`}
                      mono
                      tone="accent"
                    />
                    <InspectorKeyValue
                      label={t('venue_inv_daily_rate')}
                      value={`${formatCurrencyAmount(unit.dailyRate, unit.currency)} / j`}
                      mono
                    />
                    <InspectorKeyValue label="Devise" value={unit.currency} mono isLast />
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'book',
                    label: t('venue_btn_reserve'),
                    icon: <Calendar size={15} />,
                    primary: true,
                    onClick: () => {
                      setSelectedUnitForBooking(unit.id);
                      setIsBookingModalOpen(true);
                    },
                  },
                  {
                    id: 'toggle',
                    label: localizeStatus(unit.status, language),
                    icon: <Power size={15} />,
                    onClick: () => handleToggleStatus(unit),
                  },
                  {
                    id: 'edit',
                    label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
                    icon: <Edit2 size={15} />,
                    onClick: () => handleOpenEdit(unit),
                  },
                ]}
              />

              <InspectorSection index={0} title={isAr ? 'مواصفات القاعة' : 'Fiche technique'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={t('venue_inv_capacity')}
                    value={`${unit.capacity} places`}
                    mono
                  />
                  <InspectorKeyValue
                    label={t('venue_inv_surface')}
                    value={`${unit.surfaceAreaSqm || '--'} m²`}
                    mono
                  />
                  <InspectorKeyValue label={t('venue_inv_type')} value={unit.type} />
                  <InspectorKeyValue
                    label={t('venue_inv_amenities')}
                    value={unit.amenities.join(', ') || '--'}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection
                index={1}
                title={isFr ? "Consignes d'accès & Entretien" : 'Access & Maintenance Notes'}
              >
                <InspectorNotesField
                  value={unit.description || ''}
                  onSave={(val) => updateRentableUnit(unit.id, { description: val })}
                  placeholder={
                    isAr
                      ? 'تعليمات التكييف، ترتيب الطاولات، مفاتيح...'
                      : 'Consignes de climatisation, disposition des tables, clés des portes...'
                  }
                />
              </InspectorSection>
            </div>
          );
        }}
      />

      <KineticModalShell
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full overflow-hidden max-h-[92vh] overflow-y-auto"
        >
            <div className="p-6 border-b border-[var(--atr-divider)] flex items-center justify-between">
              <div>
                <h3 className="t-pod font-semibold text-black dark:text-white">
                  {unitToEdit ? t('venue_inv_btn_edit') : t('venue_inv_btn_new_space')}
                </h3>
                <p className="t-cap text-black/55 dark:text-white/55 mt-0.5">
                  {isAr
                    ? 'تكوين مواصفات القاعة، الطاقة الاستيعابية والتعريفات'
                    : isFr
                    ? 'Configurer les caractéristiques, tarifs et équipements'
                    : 'Set up space specifications, guest capacity, and hire rates'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B] flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput
                  label={`${t('venue_inv_space_name')} *`}
                  placeholder="e.g. Grand Hall Atlas"
                  value={name}
                  onChange={(v) => setName(extractStr(v))}
                  required
                />
                <LabelInput
                  label={t('venue_inv_code')}
                  placeholder="e.g. HALL-A"
                  value={code}
                  onChange={(v) => setCode(extractStr(v))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <LabelSelect
                    label={t('venue_inv_type')}
                    value={type}
                    onChange={(val) => setType(extractStr(val) as RentableUnitType)}
                    options={[
                      { value: 'Hall', label: t('venue_type_hall') },
                      { value: 'Studio', label: t('venue_type_studio') },
                      { value: 'Room', label: t('venue_type_room') },
                      { value: 'Court', label: t('venue_type_court') },
                      { value: 'Desk', label: t('venue_type_desk') },
                    ]}
                  />
                </div>
                <LabelInput
                  label={t('venue_inv_capacity')}
                  type="number"
                  min={1}
                  placeholder="50"
                  value={capacity}
                  onChange={(v) => setCapacity(extractStr(v))}
                  required
                />
                <LabelInput
                  label={t('venue_inv_surface')}
                  type="number"
                  min={1}
                  placeholder="120"
                  value={surfaceAreaSqm}
                  onChange={(v) => setSurfaceAreaSqm(extractStr(v))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput
                  label={`${t('venue_inv_hourly_rate')} (DZD) *`}
                  type="number"
                  min={0}
                  step={500}
                  placeholder="5000"
                  value={hourlyRate}
                  onChange={(v) => setHourlyRate(extractStr(v))}
                  required
                />
                <LabelInput
                  label={`${t('venue_inv_daily_rate')} (DZD) *`}
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="35000"
                  value={dailyRate}
                  onChange={(v) => setDailyRate(extractStr(v))}
                  required
                />
              </div>
              <LabelInput
                label={t('venue_inv_amenities')}
                placeholder="Wifi, Climatisation, Rétroprojecteur, Sonorisation"
                value={amenitiesStr}
                onChange={(v) => setAmenitiesStr(extractStr(v))}
              />
              <LabelTextarea
                label={t('venue_inv_desc')}
                rows={2}
                value={description}
                onChange={setDescription}
                placeholder="Description commerciale de l'espace..."
              />
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  data-sq="ctl"
                  data-sq-border="none"
                  className="px-4 py-2 t-small font-semibold text-black/70 dark:text-white/75 hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : isFr ? 'Annuler' : 'Cancel'}
                </button>
                <AtriumButton type="submit" variant="primary" icon={<Check size={14} />}>
                  {unitToEdit ? t('venue_inv_btn_edit') : t('venue_inv_btn_save')}
                </AtriumButton>
              </div>
            </form>
        </div>
      </KineticModalShell>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={selectedUnitForBooking}
      />
    </div>
  );
};
