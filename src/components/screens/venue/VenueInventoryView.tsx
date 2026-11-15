import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  DoorOpen,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RentableUnit, RentableUnitType, RentableUnitStatus } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { BookingModal } from './BookingModal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const VenueInventoryView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    rentableUnits,
    rentalBookings,
    createRentableUnit,
    updateRentableUnit,
    deleteRentableUnit,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();

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
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [unitNotes, setUnitNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<string | undefined>(
    undefined
  );

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<RentableUnitType>('Hall');
  const [capacity, setCapacity] = useState(50);
  const [surfaceAreaSqm, setSurfaceAreaSqm] = useState(120);
  const [hourlyRate, setHourlyRate] = useState(8000);
  const [dailyRate, setDailyRate] = useState(60000);
  const [amenitiesStr, setAmenitiesStr] = useState(
    'High-Speed Wifi, Climate Control AC, Sound System'
  );
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

  useEffect(() => {
    if (activeUnit) {
      setUnitNotes(activeUnit.description || '');
    }
  }, [activeUnit?.id]);

  const handleNotesChange = (val: string) => {
    setUnitNotes(val);
    if (!activeUnit) return;
    setIsSavingNotes(true);
    updateRentableUnit(activeUnit.id, { description: val });
    setTimeout(() => {
      setIsSavingNotes(false);
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 2000);
    }, 400);
  };

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
    setCode(`ROOM-${Math.floor(100 + Math.random() * 900)}`);
    setType('Room');
    setCapacity(30);
    setSurfaceAreaSqm(80);
    setHourlyRate(5000);
    setDailyRate(35000);
    setAmenitiesStr('Wifi, Presentation Screen, AC');
    setDescription('');
    setColorHex('#3B82F6');
    setIsAddModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((unit: RentableUnit) => {
    setUnitToEdit(unit);
    setName(unit.name);
    setCode(unit.code);
    setType(unit.type);
    setCapacity(unit.capacity);
    setSurfaceAreaSqm(unit.surfaceAreaSqm || 0);
    setHourlyRate(unit.hourlyRate);
    setDailyRate(unit.dailyRate);
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
    const amenitiesList = amenitiesStr
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    if (unitToEdit) {
      updateRentableUnit(unitToEdit.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        capacity: Number(capacity) || 10,
        surfaceAreaSqm: Number(surfaceAreaSqm) || 50,
        hourlyRate: Number(hourlyRate) || 0,
        dailyRate: Number(dailyRate) || 0,
        amenities: amenitiesList,
        description: description.trim(),
        colorHex,
      });
    } else {
      createRentableUnit({
        name: name.trim(),
        code: code.trim().toUpperCase() || `ROOM-${Date.now().toString().slice(-4)}`,
        type,
        capacity: Number(capacity) || 10,
        surfaceAreaSqm: Number(surfaceAreaSqm) || 50,
        hourlyRate: Number(hourlyRate) || 0,
        dailyRate: Number(dailyRate) || 0,
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
      showToast({
        type: 'info',
        title: isFr ? 'Statut mis à jour' : 'Status Updated',
        message: `${unit.name} → ${nextStatus}`,
      });
    },
    [updateRentableUnit, isFr]
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
                <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
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
          <span className="font-medium text-xs text-black dark:text-white tabular-nums">
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
          <span className="text-xs text-black/70 dark:text-white/75 tabular-nums">
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
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-black dark:text-white tabular-nums font-mono">
              {formatCurrencyAmount(u.hourlyRate, u.currency)} / {t('venue_inv_hourly_short')}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 tabular-nums font-mono">
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
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${
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
        subtitle={
          isAr
            ? 'سعة القاعات والمرافق وتجهيزات الاستقبال'
            : isFr
            ? 'Catalogue des salles, capacités & tarification horaire'
            : 'Spaces catalog, capacities, and hourly hire rates'
        }
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

        <UniversalDataCollection
          hideToolbar
          data={sortedUnits}
          keyExtractor={(u) => u.id}
          viewMode={viewMode}
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
          isPinned={(u) => pinnedUnitIds.has(u.id)}
          onPinToggle={(u) => {
            setPinnedUnitIds((prev) => {
              const next = new Set(prev);
              if (next.has(u.id)) next.delete(u.id);
              else next.add(u.id);
              return next;
            });
          }}
          onDelete={(u) => {
            deleteRentableUnit(u.id);
            if (selectedUnit?.id === u.id) setSelectedUnit(null);
            showToast({
              type: 'info',
              title: isFr ? 'Espace supprimé' : 'Space Removed',
              message: u.name,
            });
          }}
          selectedIds={selectedUnitIds}
          onSelectionChange={setSelectedUnitIds}
          customActions={(u) => [
            {
              id: 'book',
              label: t('venue_reserve_space'),
              icon: <Calendar size={13} />,
              variant: 'primary',
              onClick: () => {
                setSelectedUnitForBooking(u.id);
                setIsBookingModalOpen(true);
              },
            },
          ]}
          bulkSecondaryAction={{
            label: isAr ? 'تعيين كمتاحة' : isFr ? 'Rendre Disponible' : 'Mark Available',
            icon: <Check size={13} />,
            onClick: (ids: Set<string>) => {
              ids.forEach((id) => updateRentableUnit(id, { status: 'Available' }));
              setSelectedUnitIds(new Set<string>());
              showToast({
                type: 'success',
                title: isFr ? 'Statut mis à jour' : 'Status Updated',
                message: `${ids.size} ${isFr ? 'espaces disponibles' : 'spaces available'}`,
              });
            },
            variant: 'primary',
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteRentableUnit(id));
            setSelectedUnitIds(new Set<string>());
            showToast({
              type: 'info',
              title: isFr ? 'Espaces supprimés' : 'Spaces Deleted',
              message: `${ids.size} ${isFr ? 'espaces supprimés' : 'spaces deleted'}`,
            });
          }}
          renderCard={(unit) => {
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
            return (
              <div className="flex flex-col justify-between w-full h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: unit.colorHex || '#8B5CF6' }}
                      />
                      <span className="text-xs font-mono font-semibold text-black/55 dark:text-white/55 uppercase">
                        {unit.code}
                      </span>
                      <span className="text-[11px] text-black/55 dark:text-white/55">
                        · {localizedType}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(unit);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-colors cursor-pointer ${
                        unit.status === 'Available'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                          : unit.status === 'Occupied'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 hover:bg-purple-200'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
                      }`}
                    >
                      {localizedStatus}
                    </button>
                  </div>
                  <h3 className="font-bold text-base text-black dark:text-white">{unit.name}</h3>
                  <p className="text-xs text-black/55 dark:text-white/75 mt-1 line-clamp-2">
                    {unit.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl text-xs">
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_capacity')}
                      </span>
                      <span className="font-semibold text-black dark:text-white tabular-nums">
                        {t('venue_card_capacity', language, { count: unit.capacity })}
                      </span>
                    </div>
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_surface')}
                      </span>
                      <span className="font-semibold text-black dark:text-white tabular-nums">
                        {unit.surfaceAreaSqm
                          ? t('venue_inv_surface_unit', language, {
                              surface: unit.surfaceAreaSqm,
                            })
                          : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_hourly_rate')}
                      </span>
                      <span className="font-semibold text-black dark:text-white tabular-nums font-mono">
                        {formatCurrencyAmount(unit.hourlyRate, unit.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_daily_rate')}
                      </span>
                      <span className="font-semibold text-black dark:text-white tabular-nums font-mono">
                        {formatCurrencyAmount(unit.dailyRate, unit.currency)}
                      </span>
                    </div>
                  </div>
                  {unit.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {unit.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-black/70 dark:text-white/75 px-2 py-0.5 rounded-md"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-black dark:text-white tabular-nums font-mono">
                    {formatCurrencyAmount(unit.hourlyRate, unit.currency)} /{' '}
                    {t('venue_inv_hourly_short')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUnitForBooking(unit.id);
                      setIsBookingModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#FDF4F0] hover:bg-[#FBE5DC] text-[#d4522f] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {t('venue_btn_reserve')}
                  </button>
                </div>
              </div>
            );
          }}
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

      <KineticSlideOverInspector
        isOpen={Boolean(activeUnit)}
        item={activeUnit}
        allItems={sortedUnits}
        keyExtractor={(u) => u.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeUnit?.name || ''}
        subtitle={activeUnit ? `${activeUnit.code} · ${activeUnit.type}` : ''}
        avatarText={(activeUnit?.code || 'SP').slice(0, 2)}
        avatarColor={activeUnit?.colorHex || '#8B5CF6'}
        branchName={
          activeUnit
            ? resolveRecordBranch(activeUnit, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeUnit?.status}
        tabs={[
          { id: 'fiche', label: isFr ? 'Fiche Espace' : 'Space Specs' },
          { id: 'planning', label: isFr ? 'Planning' : 'Schedule' },
          { id: 'rates', label: isFr ? 'Tarifs' : 'Rates' },
          { id: 'notes', label: isFr ? 'Consignes' : 'Notes' },
        ]}
        onSelectItem={(u) => setSelectedUnit(u)}
        onClose={() => setSelectedUnit(null)}
        onDelete={(u) => deleteRentableUnit(u.id)}
        holdToDelete
        renderBody={(unit, tab) => {
          const unitBookings = rentalBookings.filter((b) => b.unitId === unit.id);
          return (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap gap-2">
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<Calendar size={13} />}
                  onClick={() => {
                    setSelectedUnitForBooking(unit.id);
                    setIsBookingModalOpen(true);
                  }}
                >
                  {t('venue_reserve_space')}
                </AtriumButton>
                <AtriumButton
                  variant="secondary"
                  size="sm"
                  icon={<Clock size={13} />}
                  onClick={() => handleToggleStatus(unit)}
                >
                  {unit.status}
                </AtriumButton>
                <AtriumButton
                  variant="secondary"
                  size="sm"
                  icon={<Edit2 size={13} />}
                  onClick={() => handleOpenEdit(unit)}
                >
                  {isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit'}
                </AtriumButton>
              </div>

              {tab === 'fiche' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F3EDE7]/60 dark:bg-neutral-800/50 rounded-2xl border border-[#E6DED6] dark:border-neutral-800">
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_capacity')}
                      </span>
                      <span className="font-bold text-black dark:text-white text-sm">
                        {unit.capacity} places
                      </span>
                    </div>
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_surface')}
                      </span>
                      <span className="font-bold text-black dark:text-white text-sm">
                        {unit.surfaceAreaSqm || '--'} m²
                      </span>
                    </div>
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_type')}
                      </span>
                      <span className="font-semibold text-black dark:text-white">{unit.type}</span>
                    </div>
                    <div>
                      <span className="text-black/55 dark:text-white/55 block text-[10px] uppercase font-medium">
                        {t('venue_inv_col_status')}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {unit.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-[11px] text-black/70 dark:text-white/75 block mb-1.5 uppercase">
                      {t('venue_inv_amenities')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {unit.amenities.map((a, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-black/75 dark:text-white/80 text-[11px] font-medium"
                        >
                          ✓ {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'planning' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55 font-medium">
                      {isFr ? 'Créneaux réservés' : 'Reserved Slots'}
                    </span>
                    <span className="font-bold text-[#d4522f]">
                      {unitBookings.length} {isFr ? 'réservations' : 'bookings'}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {unitBookings.length === 0 ? (
                      <div className="p-4 text-center text-black/55 dark:text-white/55 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                        {isFr
                          ? 'Aucun créneau planifié sur cet espace.'
                          : 'No scheduled slots for this space.'}
                      </div>
                    ) : (
                      unitBookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-black dark:text-white truncate max-w-[190px]">
                              {b.purpose || 'Session'}
                            </span>
                            <span className="font-mono text-[#d4522f]">
                              {formatCurrencyAmount(b.totalAmount, b.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
                            <span>{new Date(b.startDateTime).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                              {b.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab === 'rates' && (
                <div className="p-4 bg-[#F3EDE7]/60 dark:bg-neutral-800/50 rounded-2xl space-y-3 border border-[#E6DED6] dark:border-neutral-800">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {t('venue_inv_hourly_rate')} :
                    </span>
                    <span className="font-mono font-bold text-base text-black dark:text-white">
                      {formatCurrencyAmount(unit.hourlyRate, unit.currency)} / h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {t('venue_inv_daily_rate')} :
                    </span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {formatCurrencyAmount(unit.dailyRate, unit.currency)} / j
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Devise :</span>
                    <span className="font-bold text-black dark:text-white font-mono">
                      {unit.currency}
                    </span>
                  </div>
                </div>
              )}

              {tab === 'notes' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-black/55 dark:text-white/55 font-medium">
                      {isFr ? "Consignes d'accès & Entretien :" : 'Access & Maintenance Notes:'}
                    </label>
                    {isSavingNotes ? (
                      <span className="text-[10px] text-black/55 dark:text-white/55 animate-pulse">
                        Sauvegarde...
                      </span>
                    ) : notesSavedNotice ? (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={11} /> Sauvegardé
                      </span>
                    ) : null}
                  </div>
                  <textarea
                    rows={6}
                    value={unitNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Consignes de climatisation, disposition des tables, clés des portes..."
                    className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
                  />
                </div>
              )}
            </div>
          );
        }}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-black dark:text-white">
                  {unitToEdit ? t('venue_inv_btn_edit') : t('venue_inv_btn_new_space')}
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55 mt-0.5">
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
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
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
                  value={capacity}
                  onChange={(v) => setCapacity(Number(extractStr(v)) || 1)}
                  required
                />
                <LabelInput
                  label={t('venue_inv_surface')}
                  type="number"
                  min={1}
                  value={surfaceAreaSqm}
                  onChange={(v) => setSurfaceAreaSqm(Number(extractStr(v)) || 1)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabelInput
                  label={`${t('venue_inv_hourly_rate')} (DZD) *`}
                  type="number"
                  step={500}
                  value={hourlyRate}
                  onChange={(v) => setHourlyRate(Number(extractStr(v)) || 0)}
                  required
                />
                <LabelInput
                  label={`${t('venue_inv_daily_rate')} (DZD) *`}
                  type="number"
                  step={1000}
                  value={dailyRate}
                  onChange={(v) => setDailyRate(Number(extractStr(v)) || 0)}
                  required
                />
              </div>
              <LabelInput
                label={t('venue_inv_amenities')}
                placeholder="Wifi, Climatisation, Rétroprojecteur, Sonorisation"
                value={amenitiesStr}
                onChange={(v) => setAmenitiesStr(extractStr(v))}
              />
              <div>
                <label className="block text-xs font-semibold text-black/70 dark:text-white/75 mb-1">
                  {t('venue_inv_desc')}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description commerciale de l'espace..."
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-black/70 dark:text-white/75 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء' : isFr ? 'Annuler' : 'Cancel'}
                </button>
                <AtriumButton type="submit" variant="primary" icon={<Check size={14} />}>
                  {unitToEdit ? t('venue_inv_btn_edit') : t('venue_inv_btn_save')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={selectedUnitForBooking}
      />
    </div>
  );
};
