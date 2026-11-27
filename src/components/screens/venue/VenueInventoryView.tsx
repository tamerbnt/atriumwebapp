import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  DoorOpen,
  Edit2,
  Check,
  X,
  Calendar,
  Power,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentRentableUnitsFromState,
  selectCurrentRentalBookingsFromState,
  selectCurrentRentalPricingRulesFromState,
  selectCurrentRentalContractTemplatesFromState,
  selectCurrentRentalAssetLogsFromState,
  selectCurrentRentalCoworkingSubscriptionsFromState,
  selectCurrentRentalRentersFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import {
  RentableUnit,
  RentableUnitType,
  RentableUnitStatus,
  RentalMode,
} from '../../../types/index';
import { formatCurrencyAmount, localizeStatus } from '../../../utils/rules';
import {
  evaluateCoworkingSubscriptionUsage,
  evaluateGearAssetAvailability,
  evaluateVehicleFleetAlerts,
  resolveUnitRentalMode,
} from '../../../utils/rentalDepth';
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

  const {
    rentableUnits,
    rentalBookings,
    rentalPricingRules,
    rentalContractTemplates,
    rentalAssetLogs,
    rentalCoworkingSubscriptions,
    rentalRenters,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
  } = useAtriumSelector(
    (s) => ({
      rentableUnits: selectCurrentRentableUnitsFromState(s),
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      rentalPricingRules: selectCurrentRentalPricingRulesFromState(s),
      rentalContractTemplates: selectCurrentRentalContractTemplatesFromState(s),
      rentalAssetLogs: selectCurrentRentalAssetLogsFromState(s),
      rentalCoworkingSubscriptions: selectCurrentRentalCoworkingSubscriptionsFromState(s),
      rentalRenters: selectCurrentRentalRentersFromState(s),
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
    upsertRentalPricingRule,
    deleteRentalPricingRule,
    upsertRentalContractTemplate,
    deleteRentalContractTemplate,
    recordRentalAssetCheckLog,
    upsertRentalCoworkingSubscription,
    consumeRentalCoworkingHours,
    retryCloudSync,
  } = useAtriumActions();

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    'catalog' | 'fleet' | 'gear' | 'coworking' | 'rules'
  >('catalog');

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
  const [plateNumber, setPlateNumber] = useState('');
  const [vin, setVin] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [fuelLevelPct, setFuelLevelPct] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [techControlExpiry, setTechControlExpiry] = useState('');
  const [weekendMultiplier, setWeekendMultiplier] = useState('1');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [lateHourlyRate, setLateHourlyRate] = useState('');

  // Sub-tab forms: Fleet / Gear Inspection
  const [logUnitId, setLogUnitId] = useState('');
  const [logType, setLogType] = useState<'checkout' | 'checkin' | 'maintenance'>('checkin');
  const [logMileage, setLogMileage] = useState('');
  const [logFuelPct, setLogFuelPct] = useState('');
  const [logDamageDetected, setLogDamageDetected] = useState(false);
  const [logDamageDzd, setLogDamageDzd] = useState('0');
  const [logNotes, setLogNotes] = useState('');

  // Sub-tab forms: Coworking Pass / Hour Pack
  const [cwRenterId, setCwRenterId] = useState('');
  const [cwPlanName, setCwPlanName] = useState('Pro Desk 40h Pack');
  const [cwPlanKind, setCwPlanKind] = useState<'monthly_pass' | 'hour_pack'>('hour_pack');
  const [cwIncludedHours, setCwIncludedHours] = useState('40');
  const [cwMonthlyFeeDzd, setCwMonthlyFeeDzd] = useState('18000');

  // Sub-tab forms: Pricing Rule & Contract Template
  const [ruleName, setRuleName] = useState('');
  const [ruleWeekendMult, setRuleWeekendMult] = useState('1.25');
  const [ruleSeasonalMult, setRuleSeasonalMult] = useState('1.15');
  const [ruleSeasonStart, setRuleSeasonStart] = useState('');
  const [ruleSeasonEnd, setRuleSeasonEnd] = useState('');
  const [tplName, setTplName] = useState('');
  const [tplMode, setTplMode] = useState<RentalMode | 'all'>('all');
  const [tplBody, setTplBody] = useState(
    'RENTAL AGREEMENT — {{business_name}}\nLessee: {{renter_name}}\nUnit: {{unit_name}} ({{plate_or_serial}})\nPeriod: {{start_date}} -> {{end_date}}\nTotal: {{total_amount}}'
  );

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
    setPlateNumber('');
    setVin('');
    setMakeModel('');
    setSerialNumber('');
    setOdometerKm('');
    setFuelLevelPct('');
    setInsuranceExpiry('');
    setTechControlExpiry('');
    setWeekendMultiplier('1');
    setGraceMinutes('15');
    setLateHourlyRate('');
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
    setPlateNumber(unit.plateNumber || '');
    setVin(unit.vin || '');
    setMakeModel(unit.makeModel || '');
    setSerialNumber(unit.serialNumber || '');
    setOdometerKm(unit.odometerKm !== undefined ? String(unit.odometerKm) : '');
    setFuelLevelPct(unit.fuelLevelPct !== undefined ? String(unit.fuelLevelPct) : '');
    setInsuranceExpiry(unit.insuranceExpiry || '');
    setTechControlExpiry(unit.techControlExpiry || '');
    setWeekendMultiplier(unit.weekendMultiplier !== undefined ? String(unit.weekendMultiplier) : '1');
    setGraceMinutes(unit.graceMinutes !== undefined ? String(unit.graceMinutes) : '15');
    setLateHourlyRate(unit.lateHourlyRate !== undefined ? String(unit.lateHourlyRate) : '');
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

    const extraFields: Partial<RentableUnit> = {
      rentalMode: resolveUnitRentalMode({ type }),
      plateNumber: plateNumber.trim() || undefined,
      vin: vin.trim() || undefined,
      makeModel: makeModel.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      odometerKm: odometerKm.trim() !== '' ? Number(odometerKm) : undefined,
      fuelLevelPct: fuelLevelPct.trim() !== '' ? Number(fuelLevelPct) : undefined,
      insuranceExpiry: insuranceExpiry.trim() || undefined,
      techControlExpiry: techControlExpiry.trim() || undefined,
      weekendMultiplier: weekendMultiplier.trim() !== '' ? Number(weekendMultiplier) : undefined,
      graceMinutes: graceMinutes.trim() !== '' ? Number(graceMinutes) : undefined,
      lateHourlyRate: lateHourlyRate.trim() !== '' ? Number(lateHourlyRate) : undefined,
    };

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
        ...extraFields,
      });
    } else {
      createRentableUnit({
        name: name.trim(),
        code: code.trim().toUpperCase() || `UNIT-${Date.now().toString().slice(-4)}`,
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
        ...extraFields,
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
          { value: 'Vehicle', label: t('venue_type_vehicle') },
          { value: 'Gear', label: t('venue_type_gear') },
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
              : u.type === 'Vehicle'
              ? t('venue_type_vehicle')
              : u.type === 'Gear' || u.type === 'Equipment'
              ? t('venue_type_gear')
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

      {/* 7.5 Vertical Modes & Configuration Switcher */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {(
          [
            { id: 'catalog', label: t('venue_depth_tab_catalog') },
            { id: 'fleet', label: t('venue_depth_tab_fleet') },
            { id: 'gear', label: t('venue_depth_tab_gear') },
            { id: 'coworking', label: t('venue_depth_tab_coworking') },
            { id: 'rules', label: t('venue_depth_tab_rules') },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveWorkspaceTab(tab.id)}
            data-sq="ctl"
            data-sq-border={activeWorkspaceTab === tab.id ? 'none' : 'solid'}
            className={`px-4 py-2 t-small font-semibold transition-colors cursor-pointer ${
              activeWorkspaceTab === tab.id
                ? 'bg-[#d4522f] text-white'
                : 'bg-white dark:bg-[#22201E] text-black/75 dark:text-white/80 [--sq-stroke:var(--sq-stroke-card)] hover:bg-[#F5F1EC] dark:hover:bg-[#2B2825]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeWorkspaceTab === 'catalog' && (
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
            { value: 'Vehicle', label: t('venue_type_vehicle') },
            { value: 'Gear', label: t('venue_type_gear') },
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
                : unit.type === 'Vehicle'
                ? t('venue_type_vehicle')
                : unit.type === 'Gear' || unit.type === 'Equipment'
                ? t('venue_type_gear')
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
      )}

      {activeWorkspaceTab === 'fleet' && (() => {
        const vehicleUnits = rentableUnits.filter((u) => resolveUnitRentalMode(u) === 'vehicle');
        const alerts = evaluateVehicleFleetAlerts(rentableUnits);
        return (
          <ScreenPod>
            <div className="p-6 space-y-6 pb-16">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="t-pod font-semibold text-black dark:text-white">
                  {t('venue_depth_tab_fleet')} ({vehicleUnits.length})
                </h3>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    handleOpenAdd();
                    setType('Vehicle');
                    setCapacity('5');
                  }}
                >
                  {t('venue_type_vehicle')}
                </AtriumButton>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicleUnits.map((v) => {
                  const al = alerts.find((a) => a.unitId === v.id);
                  return (
                    <div
                      key={v.id}
                      data-sq="card"
                      data-sq-border="solid"
                      className="p-4 bg-[#F5F1EC] dark:bg-[#1D1B1A] [--sq-stroke:var(--sq-stroke-card)] space-y-2 t-cap"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="t-small text-black dark:text-white">
                          {v.name} {v.plateNumber ? `· ${v.plateNumber}` : ''}
                        </strong>
                        {al?.needsAttention && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 font-semibold">
                            <AlertTriangle size={11} /> Attention
                          </span>
                        )}
                      </div>
                      <div className="text-black/65 dark:text-white/70 tabular-nums">
                        {v.makeModel || v.code} · {v.odometerKm ?? 0} km · Fuel {v.fuelLevelPct ?? 100}%
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className={`px-2 py-0.5 rounded ${
                          al?.insuranceState === 'expired' || al?.insuranceState === 'expiring_soon'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : al?.insuranceState === 'ok'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-black/[0.06] text-black/65 dark:bg-white/[0.08] dark:text-white/65'
                        }`}>
                          Insurance: {v.insuranceExpiry || '--'} ({al?.insuranceState || 'unset'})
                        </span>
                        <span className={`px-2 py-0.5 rounded ${
                          al?.techControlState === 'expired' || al?.techControlState === 'expiring_soon'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : al?.techControlState === 'ok'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-black/[0.06] text-black/65 dark:bg-white/[0.08] dark:text-white/65'
                        }`}>
                          Tech Control: {v.techControlExpiry || '--'} ({al?.techControlState || 'unset'})
                        </span>
                      </div>
                    </div>
                  );
                })}
                {vehicleUnits.length === 0 && (
                  <div className="t-cap text-black/55 dark:text-white/55">
                    Add a Vehicle unit to track plate, odometer, fuel, insurance & contrôle technique.
                  </div>
                )}
              </div>
              {vehicleUnits.length > 0 && (
                <div className="p-4 bg-[#F5F1EC] dark:bg-[#1D1B1A] rounded-xl space-y-3">
                  <div className="t-small font-semibold text-black dark:text-white">
                    Log Fleet Inspection / Maintenance
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <LabelSelect
                      label={t('venue_type_vehicle')}
                      value={logUnitId || vehicleUnits[0]?.id || ''}
                      onChange={setLogUnitId}
                      options={vehicleUnits.map((v) => ({ value: v.id, label: v.name }))}
                    />
                    <LabelSelect
                      label="Log Type"
                      value={logType}
                      onChange={(val) => setLogType(val as 'checkout' | 'checkin' | 'maintenance')}
                      options={[
                        { value: 'checkout', label: 'Check-out' },
                        { value: 'checkin', label: 'Check-in' },
                        { value: 'maintenance', label: 'Maintenance' },
                      ]}
                    />
                    <LabelInput label="Odometer (km)" type="number" value={logMileage} onChange={setLogMileage} />
                    <LabelInput label="Fuel (%)" type="number" value={logFuelPct} onChange={setLogFuelPct} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <LabelInput label={t('venue_depth_condition_notes')} value={logNotes} onChange={setLogNotes} />
                    </div>
                    <AtriumButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const target = vehicleUnits.find((v) => v.id === (logUnitId || vehicleUnits[0]?.id));
                        if (!target) return;
                        recordRentalAssetCheckLog({
                          unitId: target.id,
                          unitName: target.name,
                          logType,
                          mileageKm: logMileage ? Number(logMileage) : undefined,
                          fuelLevelPct: logFuelPct ? Number(logFuelPct) : undefined,
                          damageDetected: logDamageDetected,
                          damageAmountDzd: Number(logDamageDzd) || 0,
                          conditionNotes: logNotes.trim() || undefined,
                        });
                        setLogNotes('');
                      }}
                    >
                      Save Log
                    </AtriumButton>
                  </div>
                </div>
              )}
              {rentalAssetLogs.length > 0 && (
                <div className="space-y-1.5 t-cap">
                  {rentalAssetLogs.slice(0, 6).map((l) => (
                    <div key={l.id} className="flex justify-between p-2.5 bg-[#F5F1EC] dark:bg-[#1D1B1A] rounded">
                      <span>
                        <strong>{l.unitName}</strong> · {l.logType} · {l.conditionNotes || '--'}
                      </span>
                      <span className="tabular-nums text-black/60 dark:text-white/60">
                        {l.mileageKm !== undefined ? `${l.mileageKm} km` : ''} {l.loggedAt.slice(0, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScreenPod>
        );
      })()}

      {activeWorkspaceTab === 'gear' && (() => {
        const gearUnits = rentableUnits.filter((u) => resolveUnitRentalMode(u) === 'gear');
        return (
          <ScreenPod>
            <div className="p-6 space-y-5 pb-16">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="t-pod font-semibold text-black dark:text-white">
                  {t('venue_depth_tab_gear')} ({gearUnits.length})
                </h3>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    handleOpenAdd();
                    setType('Gear');
                    setCapacity('1');
                  }}
                >
                  {t('venue_type_gear')}
                </AtriumButton>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gearUnits.map((g) => {
                  const avail = evaluateGearAssetAvailability(g, rentalAssetLogs);
                  return (
                    <div
                      key={g.id}
                      data-sq="card"
                      data-sq-border="solid"
                      className="p-4 bg-[#F5F1EC] dark:bg-[#1D1B1A] [--sq-stroke:var(--sq-stroke-card)] space-y-2 t-cap"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="t-small text-black dark:text-white">
                          {g.name} ({g.serialNumber || g.code})
                        </strong>
                        <span className="px-2 py-0.5 rounded-full bg-white dark:bg-[#2B2825] font-semibold">
                          {avail.custodyState}
                        </span>
                      </div>
                      <div className="flex justify-between text-black/65 dark:text-white/65">
                        <span>Damage ledger: {formatCurrencyAmount(avail.totalDamageChargesDzd, g.currency)}</span>
                        <button
                          type="button"
                          className="text-[#d4522f] font-semibold cursor-pointer"
                          onClick={() =>
                            recordRentalAssetCheckLog({
                              unitId: g.id,
                              unitName: g.name,
                              serialNumber: g.serialNumber,
                              logType: avail.custodyState === 'checked_out' ? 'checkin' : 'checkout',
                              conditionNotes: 'Custody swap',
                            })
                          }
                        >
                          Toggle Custody
                        </button>
                      </div>
                    </div>
                  );
                })}
                {gearUnits.length === 0 && (
                  <div className="t-cap text-black/55 dark:text-white/55">
                    Add a Gear / Equipment unit to track serial numbers & custody logs.
                  </div>
                )}
              </div>
            </div>
          </ScreenPod>
        );
      })()}

      {activeWorkspaceTab === 'coworking' && (
        <ScreenPod>
          <div className="p-6 space-y-6 pb-16">
            <h3 className="t-pod font-semibold text-black dark:text-white">
              {t('venue_depth_tab_coworking')} ({rentalCoworkingSubscriptions.length})
            </h3>
            <div className="p-4 bg-[#F5F1EC] dark:bg-[#1D1B1A] rounded-xl grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <LabelSelect
                label={t('venue_voucher_renter_name')}
                value={cwRenterId || rentalRenters[0]?.id || ''}
                onChange={setCwRenterId}
                options={rentalRenters.map((r) => ({ value: r.id, label: r.fullName }))}
              />
              <LabelInput label="Plan Name" value={cwPlanName} onChange={setCwPlanName} />
              <LabelSelect
                label="Kind"
                value={cwPlanKind}
                onChange={(v) => setCwPlanKind(v as 'monthly_pass' | 'hour_pack')}
                options={[
                  { value: 'hour_pack', label: 'Hour Pack' },
                  { value: 'monthly_pass', label: 'Monthly Pass' },
                ]}
              />
              <LabelInput
                label="Included Hours"
                type="number"
                value={cwIncludedHours}
                onChange={setCwIncludedHours}
              />
              <AtriumButton
                variant="primary"
                onClick={() => {
                  const targetRenter =
                    rentalRenters.find((r) => r.id === (cwRenterId || rentalRenters[0]?.id)) ||
                    rentalRenters[0];
                  if (!targetRenter || !cwPlanName.trim()) return;
                  const today = new Date().toISOString().slice(0, 10);
                  const endD = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
                  upsertRentalCoworkingSubscription({
                    renterId: targetRenter.id,
                    renterName: targetRenter.fullName,
                    planName: cwPlanName.trim(),
                    planKind: cwPlanKind,
                    includedHours: Number(cwIncludedHours) || 40,
                    usedHours: 0,
                    monthlyFeeDzd: Number(cwMonthlyFeeDzd) || 18000,
                    startDate: today,
                    endDate: endD,
                    status: 'active',
                  });
                }}
              >
                Create Pass
              </AtriumButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rentalCoworkingSubscriptions.map((sub) => {
                const check = evaluateCoworkingSubscriptionUsage(sub, 1);
                return (
                  <div
                    key={sub.id}
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-4 bg-[#F5F1EC] dark:bg-[#1D1B1A] [--sq-stroke:var(--sq-stroke-card)] flex items-center justify-between gap-3 t-cap"
                  >
                    <div>
                      <div className="font-semibold t-small text-black dark:text-white">
                        {sub.renterName} — {sub.planName}
                      </div>
                      <div className="text-black/65 dark:text-white/65 tabular-nums">
                        {sub.usedHours}h / {sub.includedHours}h ({check.remainingHours}h left) · {sub.status}
                      </div>
                    </div>
                    <AtriumButton
                      size="sm"
                      variant="secondary"
                      onClick={() => consumeRentalCoworkingHours(sub.id, 2)}
                    >
                      -2h Session
                    </AtriumButton>
                  </div>
                );
              })}
            </div>
          </div>
        </ScreenPod>
      )}

      {activeWorkspaceTab === 'rules' && (
        <ScreenPod>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-16">
            <div className="space-y-4">
              <h3 className="t-pod font-semibold text-black dark:text-white">
                {t('venue_depth_pricing_rule_label')} ({rentalPricingRules.length})
              </h3>
              <div className="p-4 bg-[#F5F1EC] dark:bg-[#1D1B1A] rounded-xl space-y-3">
                <LabelInput label="Rule Name" value={ruleName} onChange={setRuleName} placeholder="Summer / Fri-Sat Peak" />
                <div className="grid grid-cols-2 gap-3">
                  <LabelInput label={t('venue_depth_weekend_mult')} type="number" step={0.05} value={ruleWeekendMult} onChange={setRuleWeekendMult} />
                  <LabelInput label={t('venue_depth_seasonal_mult')} type="number" step={0.05} value={ruleSeasonalMult} onChange={setRuleSeasonalMult} />
                  <LabelInput label="Season Start" type="date" value={ruleSeasonStart} onChange={setRuleSeasonStart} />
                  <LabelInput label="Season End" type="date" value={ruleSeasonEnd} onChange={setRuleSeasonEnd} />
                </div>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!ruleName.trim()) return;
                    upsertRentalPricingRule({
                      name: ruleName.trim(),
                      unitType: 'All',
                      rentalMode: 'all',
                      weekendMultiplier: Number(ruleWeekendMult) || 1.25,
                      weekendDays: [5, 6],
                      seasonalMultiplier: Number(ruleSeasonalMult) || 1,
                      seasonStartDate: ruleSeasonStart || undefined,
                      seasonEndDate: ruleSeasonEnd || undefined,
                      isActive: true,
                    });
                    setRuleName('');
                  }}
                >
                  Save Pricing Rule
                </AtriumButton>
              </div>
              {rentalPricingRules.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-[#F5F1EC] dark:bg-[#1D1B1A] rounded t-cap">
                  <div>
                    <strong className="text-black dark:text-white">{r.name}</strong> · Wknd ×{r.weekendMultiplier} · Seas ×{r.seasonalMultiplier}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteRentalPricingRule(r.id)}
                    className="text-black/55 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="t-pod font-semibold text-black dark:text-white">
                {t('venue_depth_contract_template')} ({rentalContractTemplates.length})
              </h3>
              <div className="p-4 bg-[#F5F1EC] dark:bg-[#1D1B1A] rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <LabelInput label="Template Name" value={tplName} onChange={setTplName} placeholder="Wedding / Fleet Standard" />
                  <LabelSelect
                    label="Mode"
                    value={tplMode}
                    onChange={(v) => setTplMode(v as RentalMode | 'all')}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'venue', label: 'Venue' },
                      { value: 'vehicle', label: 'Vehicle' },
                      { value: 'gear', label: 'Gear' },
                      { value: 'coworking_desk', label: 'Coworking' },
                    ]}
                  />
                </div>
                <LabelTextarea label="Contract Body ({{tokens}})" rows={3} value={tplBody} onChange={setTplBody} />
                <AtriumButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!tplName.trim() || !tplBody.trim()) return;
                    upsertRentalContractTemplate({
                      name: tplName.trim(),
                      rentalMode: tplMode,
                      bodyTemplate: tplBody,
                      requireSignature: true,
                    });
                    setTplName('');
                  }}
                >
                  Save Template
                </AtriumButton>
              </div>
              {rentalContractTemplates.map((tpl) => (
                <div key={tpl.id} className="flex items-center justify-between p-3 bg-[#F5F1EC] dark:bg-[#1D1B1A] rounded t-cap">
                  <div>
                    <strong className="text-black dark:text-white">{tpl.name}</strong> ({tpl.rentalMode})
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteRentalContractTemplate(tpl.id)}
                    className="text-black/55 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </ScreenPod>
      )}

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
                      { value: 'Vehicle', label: t('venue_type_vehicle') },
                      { value: 'Gear', label: t('venue_type_gear') },
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
                  step="any"
                  placeholder="5000"
                  value={hourlyRate}
                  onChange={(v) => setHourlyRate(extractStr(v))}
                  required
                />
                <LabelInput
                  label={`${t('venue_inv_daily_rate')} (DZD) *`}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="35000"
                  value={dailyRate}
                  onChange={(v) => setDailyRate(extractStr(v))}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <LabelInput
                  label={t('venue_depth_weekend_mult')}
                  type="number"
                  step={0.05}
                  value={weekendMultiplier}
                  onChange={(v) => setWeekendMultiplier(extractStr(v))}
                />
                <LabelInput
                  label={t('venue_depth_grace_minutes')}
                  type="number"
                  value={graceMinutes}
                  onChange={(v) => setGraceMinutes(extractStr(v))}
                />
                <LabelInput
                  label="Late Rate /h (DZD)"
                  type="number"
                  value={lateHourlyRate}
                  onChange={(v) => setLateHourlyRate(extractStr(v))}
                />
              </div>
              {(type === 'Vehicle' || type === 'Gear' || type === 'Equipment') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--atr-divider)]">
                  {type === 'Vehicle' ? (
                    <>
                      <LabelInput label="Plate Number" value={plateNumber} onChange={(v) => setPlateNumber(extractStr(v))} placeholder="00123-124-16" />
                      <LabelInput label="Make & Model" value={makeModel} onChange={(v) => setMakeModel(extractStr(v))} placeholder="Renault Master / Dacia" />
                      <LabelInput label="Odometer (km)" type="number" value={odometerKm} onChange={(v) => setOdometerKm(extractStr(v))} />
                      <LabelInput label="Fuel Level (%)" type="number" min={0} max={100} value={fuelLevelPct} onChange={(v) => setFuelLevelPct(extractStr(v))} />
                      <LabelInput label="Insurance Expiry" type="date" value={insuranceExpiry} onChange={(v) => setInsuranceExpiry(extractStr(v))} />
                      <LabelInput label="Tech Control Expiry" type="date" value={techControlExpiry} onChange={(v) => setTechControlExpiry(extractStr(v))} />
                    </>
                  ) : (
                    <LabelInput label="Serial Number" value={serialNumber} onChange={(v) => setSerialNumber(extractStr(v))} placeholder="SN-CAM-001" />
                  )}
                </div>
              )}
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
