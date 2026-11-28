import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Car,
  Plus,
  Wrench,
  AlertTriangle,
  Gauge,
  Building2,
  Edit,
  Pin,
  ArrowLeftRight,
  Disc,
  Link2,
  X,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { pickLocalizedText, runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import {
  evaluateTireStorageAlert,
  evaluateVehicleServiceReminders,
  type TireStorageEntry,
} from '../../../utils/garageDepth';
import {
  useGarageData,
  VehicleAsset,
  RepairOrder,
  calculateEstimatedMileage,
} from './garageData';
import { AutoVehicleModal } from './AutoVehicleModal';
import { AutoOrderModal } from './AutoOrderModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorListItem,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticModalShell,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const AutoGarageVehiclesView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode,
      isSyncTimeout: s.isSyncTimeout,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync, ensurePartyForEntity } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const {
    vehicles,
    orders,
    bays,
    tireStorage,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    transferVehicleOwner,
    upsertTireStorageEntry,
    addOrder,
  } = useGarageData();

  const [activeMode, setActiveMode] = useState<'vehicles' | 'tires'>('vehicles');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [fuelFilter, setFuelFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['veh_01']));
  const [sortBy, setSortBy] = useState<string>('plate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<VehicleAsset | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderVehicle, setOrderVehicle] = useState<VehicleAsset | null>(null);

  const [inspectedVehicle, setInspectedVehicle] = useState<VehicleAsset | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');

  const [transferTarget, setTransferTarget] = useState<VehicleAsset | null>(null);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferOdometer, setTransferOdometer] = useState('');

  const [isTireModalOpen, setIsTireModalOpen] = useState(false);
  const [tireVehicleId, setTireVehicleId] = useState('');
  const [tireSeason, setTireSeason] = useState<'summer' | 'winter' | 'all_season'>('winter');
  const [tireSize, setTireSize] = useState('');
  const [tireBrand, setTireBrand] = useState('');
  const [tireQty, setTireQty] = useState('4');
  const [tireTreadMm, setTireTreadMm] = useState('5.5');
  const [tireRack, setTireRack] = useState('');
  const [tireDueSwapDate, setTireDueSwapDate] = useState('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeVehicle = useMemo(() => {
    if (!inspectedVehicle) return null;
    return vehicles.find((v) => v.id === inspectedVehicle.id) || inspectedVehicle;
  }, [inspectedVehicle, vehicles]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    vehicles.forEach((v) => {
      const bName = resolveRecordBranch(v, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [vehicles, branchesById, currentBranch, language]);

  const vehicleOrdersMap = useMemo(() => {
    const map = new Map<string, RepairOrder[]>();
    orders.forEach((o) => {
      const list = map.get(o.vehiclePlate) || [];
      list.push(o);
      map.set(o.vehiclePlate, list);
    });
    return map;
  }, [orders]);

  const activeVehiclesInShop = useMemo(
    () => new Set(orders.filter((o) => o.status !== 'Delivered').map((o) => o.vehiclePlate)).size,
    [orders]
  );

  const fleetVehiclesCount = useMemo(() => vehicles.filter((v) => v.isFleet).length, [vehicles]);

  const vidangeDueCount = useMemo(
    () =>
      vehicles.filter((v) => {
        const estKm = calculateEstimatedMileage(v.mileageKm, v.lastServiceDate, v.dailyAvgKm || 50);
        return estKm - (v.lastServiceKm || v.mileageKm - 5000) >= 9500;
      }).length,
    [vehicles]
  );

  const distinctBrands = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.brand))).sort(),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filterSegment === 'Fleet' && !v.isFleet) return false;
      if (filterSegment === 'Individual' && v.isFleet) return false;
      if (filterSegment === 'VidangeDue') {
        const estKm = calculateEstimatedMileage(v.mileageKm, v.lastServiceDate, v.dailyAvgKm || 50);
        if (estKm - (v.lastServiceKm || v.mileageKm - 5000) < 9500) return false;
      }
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(v, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (brandFilter !== 'All' && v.brand.toLowerCase() !== brandFilter.toLowerCase()) return false;
      if (fuelFilter !== 'All' && (v.fuelType || 'Diesel') !== fuelFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = v.plateNumber.toLowerCase().includes(q);
        const matchesOwner = v.ownerName.toLowerCase().includes(q);
        const matchesBrand = v.brand.toLowerCase().includes(q);
        const matchesModel = v.model.toLowerCase().includes(q);
        const matchesVin = v.vin.toLowerCase().includes(q);
        const matchesFleet = v.fleetName?.toLowerCase().includes(q);
        if (!matchesPlate && !matchesOwner && !matchesBrand && !matchesModel && !matchesVin && !matchesFleet) {
          return false;
        }
      }
      return true;
    });
  }, [vehicles, filterSegment, branchFilter, brandFilter, fuelFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedVehicles = useMemo(() => {
    const list = [...filteredVehicles];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'plate') {
        cmp = a.plateNumber.localeCompare(b.plateNumber);
      } else if (sortBy === 'owner') {
        cmp = a.ownerName.localeCompare(b.ownerName);
      } else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else if (sortBy === 'mileage') {
        cmp = a.mileageKm - b.mileageKm;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredVehicles, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenAdd = useCallback(() => {
    setVehicleToEdit(null);
    setIsVehicleModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((v: VehicleAsset) => {
    setVehicleToEdit(v);
    setIsVehicleModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (v: VehicleAsset) => {
      deleteVehicle(v.id);
      if (inspectedVehicle?.id === v.id) setInspectedVehicle(null);
    },
    [deleteVehicle, inspectedVehicle]
  );

  const handleTogglePin = useCallback((v: VehicleAsset) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(v.id)) next.delete(v.id);
      else next.add(v.id);
      return next;
    });
  }, []);

  const handleOpenNewOrder = useCallback((v: VehicleAsset) => {
    setOrderVehicle(v);
    setIsOrderModalOpen(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Matricule',
      'Marque',
      'Modèle',
      'Année',
      'Type',
      'Flotte B2B',
      'Succursale',
      'Propriétaire',
      'Téléphone',
      'Compteur Lu (km)',
      'Compteur Estimé (km)',
      'Dernière Révision',
    ];
    const rows = sortedVehicles.map((v) => {
      const estKm = calculateEstimatedMileage(v.mileageKm, v.lastServiceDate, v.dailyAvgKm || 50);
      const branchInfo = resolveRecordBranch(v, branchesById, currentBranch, language);
      return [
        v.id,
        v.plateNumber,
        v.brand,
        v.model,
        String(v.year),
        v.isFleet ? 'Flotte B2B' : 'Particulier',
        v.fleetName || '',
        branchInfo.name,
        v.ownerName,
        v.ownerPhone,
        String(v.mileageKm),
        String(estKm),
        v.lastServiceDate || '',
      ];
    });
    downloadCsvSafe(`parc_vehicules_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تصدير CSV' : 'Export CSV',
      message: isAr ? 'تم تصدير حظيرة المركبات' : 'Export du parc automobile terminé',
    });
  }, [sortedVehicles, branchesById, currentBranch, language, isAr]);

  const getRowMeta = useCallback(
    (v: VehicleAsset): Partial<KineticRowData> => {
      const estKm = calculateEstimatedMileage(v.mileageKm, v.lastServiceDate, v.dailyAvgKm || 50);
      const isDue = estKm - (v.lastServiceKm || v.mileageKm - 5000) >= 9500;
      const inShop = orders.some((o) => o.vehiclePlate === v.plateNumber && o.status !== 'Delivered');
      const br = resolveRecordBranch(v, branchesById, currentBranch, language);
      return {
        title: `${v.brand} ${v.model}`,
        subline: `${v.plateNumber} · ${v.ownerName}`,
        categoryLabel: v.isFleet
          ? isAr ? 'أسطول B2B' : isEn ? 'B2B Fleet' : 'Flotte B2B'
          : isAr ? 'فردي' : isEn ? 'Individual' : 'Particulier',
        statusLabel: inShop
          ? isAr ? 'في الورشة' : isEn ? 'In Shop' : 'En Atelier'
          : isDue
          ? isAr ? 'تغيير زيت' : isEn ? 'Service Due' : 'Vidange Due'
          : isAr ? 'جاهز' : isEn ? 'Available' : 'Disponible',
        statusVariant: inShop ? 'info' : isDue ? 'warning' : 'active',
        metricPrimary: `${estKm.toLocaleString()} km`,
        metricSecondary: v.ownerPhone || br.name,
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'المالك والأسطول' : isEn ? 'Owner & Fleet' : 'Propriétaire & Flotte',
          primaryText: v.ownerName,
          secondaryText: v.fleetName || v.ownerPhone || '—',
        },
        detailCol2: {
          heading: isAr ? 'العداد والصيانة' : isEn ? 'Odometer & Service' : 'Kilométrage & Révision',
          primaryText: `${estKm.toLocaleString()} km`,
          secondaryText: `${v.fuelType || 'Diesel'} · ${v.year}`,
        },
        detailCol3: {
          heading: isAr ? 'الترقيم والفرع' : isEn ? 'Plate & Branch' : 'Matricule & Succursale',
          primaryText: v.plateNumber,
          secondaryText: br.name,
        },
      };
    },
    [orders, branchesById, currentBranch, language, isAr, isEn]
  );

  const getFanActions = useCallback(
    (v: VehicleAsset): KineticRowFanAction[] => [
      {
        id: 'order',
        label: 'OR +',
        icon: <Wrench size={14} />,
        onClick: () => handleOpenNewOrder(v),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Éditer',
        icon: <Edit size={14} />,
        onClick: () => handleOpenEdit(v),
      },
    ],
    [handleOpenNewOrder, handleOpenEdit, isAr]
  );

  const getDetailActions = useCallback(
    (v: VehicleAsset): KineticDetailAction[] => [
      {
        id: 'order',
        label: isAr ? 'فتح أمر إصلاح' : 'Nouvel OR',
        icon: <Wrench size={14} />,
        onClick: () => handleOpenNewOrder(v),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Modifier',
        icon: <Edit size={14} />,
        onClick: () => handleOpenEdit(v),
      },
    ],
    [handleOpenNewOrder, handleOpenEdit, isAr]
  );

  const columns: ColumnDefinition<VehicleAsset>[] = useMemo(
    () => [
      {
        key: 'plate',
        header: isAr ? 'الترقيم / الموديل' : isEn ? 'Vehicle & Plate' : 'Véhicule & Immatriculation',
        width: '3*',
        sortable: true,
        renderCell: (v) => {
          const isPinned = pinnedIds.has(v.id);
          const inShop = orders.some((o) => o.vehiclePlate === v.plateNumber && o.status !== 'Delivered');
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold t-small flex items-center justify-center shrink-0"
              >
                <Car size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="t-small font-semibold text-black dark:text-white truncate">
                    {v.brand} {v.model}
                  </span>
                  {isPinned && <span className="t-small text-amber-500 font-semibold">VIP</span>}
                  {v.isFleet && (
                    <span className="t-small px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold">
                      Flotte B2B
                    </span>
                  )}
                  {inShop && (
                    <span className="t-small px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Wrench size={10} />
                      {isAr ? 'في الورشة' : 'En Atelier'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 t-cap text-black/55 dark:text-white/55 tabular-nums">
                  <span className="px-2 py-1 rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] text-black dark:text-white font-semibold">
                    {v.plateNumber}
                  </span>
                  <span>·</span>
                  <span>{v.year}</span>
                  {v.fuelType && (
                    <>
                      <span>·</span>
                      <span>{v.fuelType}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'owner',
        header: isAr ? 'المالك / الحظيرة' : isEn ? 'Owner / Fleet' : 'Propriétaire & Flotte',
        width: '2.2*',
        sortable: true,
        renderCell: (v) => (
          <div className="min-w-0">
            <div className="t-small font-semibold text-black dark:text-white truncate flex items-center gap-2">
              {v.isFleet && <Building2 size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />}
              <span className="truncate">{v.ownerName}</span>
            </div>
            <div className="t-cap tabular-nums text-black/55 dark:text-white/55 mt-0.5">{v.ownerPhone}</div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Succursale',
        width: '1.5*',
        sortable: true,
        renderCell: (v) => {
          const info = resolveRecordBranch(v, branchesById, currentBranch, language);
          return (
            <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">
              {info.name}
            </span>
          );
        },
      },
      {
        key: 'mileage',
        header: isAr ? 'العداد والصيانة التنبؤية' : isEn ? 'Mileage & Service' : 'Kilométrage & Maintenance',
        width: '2.3*',
        sortable: true,
        renderCell: (v) => {
          const estKm = calculateEstimatedMileage(v.mileageKm, v.lastServiceDate, v.dailyAvgKm || 50);
          const reminders = evaluateVehicleServiceReminders(v);
          const urgentReminder = reminders.find((r) => r.severity === 'overdue' || r.severity === 'due_soon');
          const needsOilChange = estKm - (v.lastServiceKm || v.mileageKm - 5000) >= 9500 || urgentReminder?.kind === 'vidange';
          return (
            <div className="space-y-0.5">
              <div className="t-small tabular-nums font-semibold text-black dark:text-white flex items-center gap-2">
                <Gauge size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>{estKm.toLocaleString()} km</span>
                <span className="t-cap text-black/55 dark:text-white/55 font-normal">(est.)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {urgentReminder ? (
                  <span className={`t-small font-semibold px-2 py-0.5 rounded-[var(--r-check,6px)] flex items-center gap-1 ${
                    urgentReminder.severity === 'overdue'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    <AlertTriangle size={10} />
                    {urgentReminder.message}
                  </span>
                ) : needsOilChange ? (
                  <span className="t-small font-semibold px-2 py-0.5 rounded-[var(--r-check,6px)] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-0.5">
                    <AlertTriangle size={9} />
                    {isAr ? 'تغيير زيت مطلوب' : 'Vidange requise'}
                  </span>
                ) : (
                  <span className="t-small font-medium text-black/55 dark:text-white/55">
                    Dernière: {v.lastServiceKm ? `${v.lastServiceKm.toLocaleString()} km` : v.lastServiceDate || '—'}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: isAr ? 'أوامر الورشة' : isEn ? 'RO History' : 'Historique OR',
        width: '1.3*',
        renderCell: (v) => {
          const vehOrders = vehicleOrdersMap.get(v.plateNumber) || [];
          return (
            <div className="text-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full t-small font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {vehOrders.length} {isAr ? 'أوامر' : 'ORs'}
              </span>
            </div>
          );
        },
      },
    ],
    [isAr, isEn, pinnedIds, orders, branchesById, currentBranch, language, vehicleOrdersMap]
  );

  const hasAdvancedFilters = branchFilter !== 'All' || brandFilter !== 'All' || fuelFilter !== 'All';
  const activeAdvancedCount =
    (branchFilter !== 'All' ? 1 : 0) + (brandFilter !== 'All' ? 1 : 0) + (fuelFilter !== 'All' ? 1 : 0);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'segment',
        label: isAr ? 'الفئة والحالة' : isEn ? 'Segment' : 'Segment & Alertes',
        value: filterSegment,
        onChange: setFilterSegment,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: vehicles.length },
          { value: 'Fleet', label: isAr ? 'أساطيل B2B' : 'Flottes B2B', count: fleetVehiclesCount },
          { value: 'Individual', label: isAr ? 'أفراد' : 'Particuliers', count: vehicles.length - fleetVehiclesCount },
          { value: 'VidangeDue', label: isAr ? 'صيانة مستحقة' : 'Vidange Requise', count: vidangeDueCount },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'الفرع / الورشة' : isEn ? 'Branch' : 'Succursale',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes', count: vehicles.length },
          ...Array.from(branchCounts.entries()).map(([bName, count]) => ({
            value: bName,
            label: bName,
            count,
          })),
        ],
      },
      {
        id: 'brand',
        label: isAr ? 'العلامة التجارية' : isEn ? 'Brand' : 'Marque Constructeur',
        value: brandFilter,
        onChange: setBrandFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 3,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes' },
          ...distinctBrands.map((b) => ({
            value: b,
            label: b,
            count: vehicles.filter((v) => v.brand === b).length,
          })),
        ],
      },
      {
        id: 'fuel',
        label: isAr ? 'نوع الوقود' : isEn ? 'Fuel Type' : 'Motorisation',
        value: fuelFilter,
        onChange: setFuelFilter,
        resetValue: 'All',
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous' },
          { value: 'Diesel', label: 'Diesel' },
          { value: 'Essence', label: 'Essence' },
          { value: 'GPL', label: 'GPL' },
        ],
      },
    ],
    [
      isAr,
      isEn,
      filterSegment,
      branchFilter,
      brandFilter,
      fuelFilter,
      vehicles,
      fleetVehiclesCount,
      vidangeDueCount,
      branchCounts,
      distinctBrands,
    ]
  );

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterSegment !== 'All') {
      chips.push({
        key: 'segment',
        label: filterSegment === 'Fleet' ? 'Flottes B2B' : filterSegment === 'Individual' ? 'Particuliers' : 'Vidange Requise',
        onRemove: () => setFilterSegment('All'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : 'Succursale'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (brandFilter !== 'All') {
      chips.push({
        key: 'brand',
        label: `${isAr ? 'الماركة' : 'Marque'}: ${brandFilter}`,
        onRemove: () => setBrandFilter('All'),
      });
    }
    if (fuelFilter !== 'All') {
      chips.push({
        key: 'fuel',
        label: `${isAr ? 'الوقود' : 'Carburant'}: ${fuelFilter}`,
        onRemove: () => setFuelFilter('All'),
      });
    }
    return chips;
  }, [filterSegment, branchFilter, brandFilter, fuelFilter, isAr]);

  const handleResetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterSegment('All');
    setBranchFilter('All');
    setBrandFilter('All');
    setFuelFilter('All');
  }, []);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: vehicles.length > 0,
  });

  if (showSkeleton && (vehicles.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '140px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut || isSyncTimeout}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Car size={26} />}
        title={isAr ? 'المركبات' : isEn ? 'Vehicles' : 'Véhicules'}
        secondaryActions={
          <LiveSegmentedControl
            size="sm"
            value={activeMode}
            onValueChange={(val) => setActiveMode(val as 'vehicles' | 'tires')}
            options={[
              {
                value: 'vehicles',
                label: L('Vehicles', 'Parc', 'المركبات'),
                count: vehicles.length,
              },
              {
                value: 'tires',
                label: L('Tire Hotel', 'Hôtel Pneus', 'فندق الإطارات'),
                count: tireStorage.length,
              },
            ]}
            aria-label="Vehicles View Switcher"
          />
        }
        primaryAction={
          activeMode === 'tires'
            ? {
                label: L('Store Tire Set', 'Dépôt Pneus', 'إيداع إطارات'),
                icon: <Plus size={16} strokeWidth={2.5} />,
                onClick: () => {
                  setTireVehicleId(vehicles[0]?.id || '');
                  setTireSize('');
                  setTireBrand('');
                  setTireRack('');
                  setIsTireModalOpen(true);
                },
              }
            : {
                label: isAr ? 'تسجيل مركبة' : isEn ? 'New Vehicle' : 'Nouveau Véhicule',
                icon: <Plus size={16} strokeWidth={2.5} />,
                onClick: handleOpenAdd,
              }
        }
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الحظيرة ونشاط الصيانة' : isEn ? 'Fleet & Maintenance KPIs' : 'Indicateurs de Flotte & Atelier'}
        language={language}
        primaryCard={{
          label: isAr ? 'مركبات أساطيل B2B' : isEn ? 'Corporate Fleet Vehicles' : 'Véhicules Flottes B2B',
          badgeText: isAr ? 'أساطيل' : isEn ? 'Fleets' : 'B2B',
          count: fleetVehiclesCount,
          isActive: filterSegment === 'Fleet',
          onToggle: () => setFilterSegment((prev) => (prev === 'Fleet' ? 'All' : 'Fleet')),
          tone: 'emerald',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        secondaryCard={{
          label: isAr ? 'تنبيهات تغيير الزيت' : isEn ? 'Oil Service Due' : 'Vidanges À Prévoir',
          badgeText: isAr ? 'صيانة' : isEn ? 'Service Due' : 'Alerte Km',
          count: vidangeDueCount,
          isActive: filterSegment === 'VidangeDue',
          onToggle: () => setFilterSegment((prev) => (prev === 'VidangeDue' ? 'All' : 'VidangeDue')),
          tone: 'terracotta',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        darkCard={{
          label: isAr ? 'إجمالي الحظيرة المسجلة' : isEn ? 'Registered Fleet Assets' : 'Parc Total Enregistré',
          badgeCount: activeVehiclesInShop,
          badgeSuffix: isAr ? ' بالورشة' : isEn ? ' in shop' : ' en atelier',
          valueCount: vehicles.length,
          valueSuffix: isAr ? ' مركبة' : ' véhicules',
          caption: isAr ? 'أرقام الهياكل (VIN) والترقيم موثقة' : 'N° Châssis (VIN) & immatriculations certifiés',
        }}
      />

      {activeMode === 'tires' ? (
        <ScreenPod>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
                  <Disc size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <span>{L('Seasonal Tire Storage (Hôtel Pneus)', 'Hôtel Pneus & Gardiennage Saisonnier', 'مستودع حفظ الإطارات الموسمية')}</span>
                </h2>
                <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
                  {L(
                    'Monitors tread depth (< 3.0mm wear alert) and seasonal swap due dates.',
                    'Suivi des racks, profondeur des sculptures (< 3.0 mm) et dates de permutation saisonnière.',
                    'تتبع الرفوف وتنبيهات تآكل الإطارات وتواريخ الاستبدال الموسمي.'
                  )}
                </p>
              </div>
            </div>

            {tireStorage.length === 0 ? (
              <div data-sq="card" data-sq-border="solid" className="p-6 text-center t-cap text-black/55 dark:text-white/60 [--sq-stroke:var(--sq-stroke-card)]">
                {L('No tire sets currently in storage.', 'Aucun train de pneus en gardiennage.', 'لا توجد إطارات مودعة حالياً.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tireStorage.map((entry) => {
                  const alert = evaluateTireStorageAlert(entry);
                  return (
                    <div
                      key={entry.id}
                      data-sq="card"
                      data-sq-border="solid"
                      className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-2 t-cap"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-black dark:text-white">{entry.plateNumber} · {entry.storageTag}</div>
                          <div className="text-black/60 dark:text-white/65">{entry.ownerName}</div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-[var(--r-check,6px)] t-small font-semibold ${
                            alert.status === 'replace_recommended'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : alert.status === 'swap_due'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {entry.status === 'mounted'
                            ? L('Mounted', 'Montés', 'مركبة')
                            : alert.status === 'replace_recommended'
                            ? L('Replace Tire', 'À Remplacer', 'تحتاج تغيير')
                            : alert.status === 'swap_due'
                            ? L('Swap Due', 'Permutation Due', 'حان التبديل')
                            : L('Stored OK', 'En Stock OK', 'محفوظة')}
                        </span>
                      </div>
                      <div className="text-black/70 dark:text-white/75 tabular-nums">
                        {entry.tireSize} · {entry.brand || 'Multi'} ×{entry.quantity} · {entry.treadDepthMm} mm
                      </div>
                      <div className="text-black/55 dark:text-white/55">
                        Rack: {entry.rackLocation} · {entry.dueSwapDate ? `Swap: ${entry.dueSwapDate}` : entry.season}
                      </div>
                      {alert.warnings.length > 0 && (
                        <div className="text-amber-700 dark:text-amber-300 font-medium">
                          {alert.warnings.join(' · ')}
                        </div>
                      )}
                      <div className="pt-1 flex justify-end">
                        <AtriumButton
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const nextStatus = entry.status === 'stored' ? 'mounted' : 'stored';
                            upsertTireStorageEntry({ ...entry, status: nextStatus });
                          }}
                        >
                          {entry.status === 'stored'
                            ? L('Mark Mounted', 'Sortir / Monter', 'تركيب على المركبة')
                            : L('Return to Rack', 'Remettre en Rack', 'إرجاع للمستودع')}
                        </AtriumButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScreenPod>
      ) : (
      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'دليل السيارات' : isEn ? 'Vehicle Registry' : 'Registre Automobile'}
          language={language}
          liveRegionText={`${sortedVehicles.length} ${isAr ? 'مركبة' : 'véhicules'}`}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث بالترقيم أو المالك أو الموديل...' : 'Recherche matricule, modèle, VIN...'
          }
          statusValue={filterSegment}
          onStatusChange={setFilterSegment}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: vehicles.length },
            { value: 'Fleet', label: isAr ? 'أساطيل' : isEn ? 'Fleets' : 'Flottes', count: fleetVehiclesCount },
            { value: 'VidangeDue', label: isAr ? 'صيانة' : isEn ? 'Due' : 'Vidange', count: vidangeDueCount },
          ]}
          hasActiveAdvancedFilters={hasAdvancedFilters}
          activeFiltersCount={activeAdvancedCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetAllFilters}
        />

        <UniversalDataCollection
          hideToolbar
          items={sortedVehicles}
          keyExtractor={(v) => v.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
          onBulkDelete={(ids) => {
            const count = ids.size;
            runUndoBatch(
              {
                operationType: 'bulk',
                vertical: 'auto_garage',
                affectedCount: count,
                summary: pickLocalizedText(language, {
                  fr: `${count} véhicules supprimés`,
                  en: `${count} vehicles deleted`,
                  ar: `تم حذف ${count} مركبات`,
                }),
                toastTitle: pickLocalizedText(language, {
                  fr: 'Parc Véhicules',
                  en: 'Vehicle Fleet',
                  ar: 'حظيرة المركبات',
                }),
              },
              () => {
                ids.forEach((id) => deleteVehicle(id));
              }
            );
            setSelectedIds(new Set());
            if (inspectedVehicle && ids.has(inspectedVehicle.id)) setInspectedVehicle(null);
          }}
          isPinned={(v) => pinnedIds.has(v.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeVehicle?.id || null}
          onItemClick={(v, el) => {
            setDrawerOpenerEl(el || null);
            setInspectedVehicle(v);
          }}
          onViewDetails={(v, el) => {
            setDrawerOpenerEl(el || null);
            setInspectedVehicle(v);
          }}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          customActions={(v) => [
            {
              id: 'order',
              label: isAr ? 'فتح أمر إصلاح' : 'Nouvel OR',
              tooltip: isAr ? 'فتح أمر إصلاح' : 'Créer Ordre de Réparation',
              icon: <Wrench size={13} />,
              variant: 'primary',
              onClick: () => handleOpenNewOrder(v),
            },
          ]}
        />
      </ScreenPod>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedVehicles.length}
        entityPluralLabel={isAr ? 'مركبة' : isEn ? 'vehicles' : 'véhicules'}
        hasActiveFilters={filterSegment !== 'All' || hasAdvancedFilters}
        onResetFilters={handleResetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeVehicle)}
        item={activeVehicle}
        allItems={sortedVehicles}
        keyExtractor={(v) => v.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : ''}
        subtitle={activeVehicle ? `${activeVehicle.plateNumber} · ${activeVehicle.year}` : ''}
        categoryLabel={activeVehicle ? `${activeVehicle.plateNumber} · ${activeVehicle.year}` : ''}
        avatarText={activeVehicle?.brand.slice(0, 2).toUpperCase() || 'VH'}
        branchName={
          activeVehicle ? resolveRecordBranch(activeVehicle, branchesById, currentBranch, language).name : ''
        }
        statusLabel={
          activeVehicle?.isFleet
            ? isAr
              ? 'أسطول B2B'
              : 'Flotte B2B'
            : isAr
            ? 'زبون فردي'
            : 'Particulier'
        }
        statusClassName={
          activeVehicle?.isFleet
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'البطاقة' : 'Fiche & Client' },
          { id: 'orders', label: isAr ? 'أوامر OR' : 'Historique OR' },
          { id: 'maintenance', label: isAr ? 'الصيانة' : 'Entretien' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => setInspectedVehicle(item)}
        onClose={() => setInspectedVehicle(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(v, tab) => {
          const estKm = calculateEstimatedMileage(v.mileageKm, v.lastServiceDate, v.dailyAvgKm || 50);
          const lastKm = v.lastServiceKm || v.mileageKm - 5000;
          const kmSince = estKm - lastKm;
          const nextVidange = lastKm + 10000;
          const isOverdue = estKm >= nextVidange;
          const vehOrders = vehicleOrdersMap.get(v.plateNumber) || [];
          const vidangePercent = Math.min(100, Math.round((kmSince / 10000) * 100));

          if (tab === 'orders') {
            return (
              <InspectorSection index={0} title={isAr ? 'سجل أوامر التصليح' : 'Historique des Ordres de Réparation'}>
                {vehOrders.length > 0 ? (
                  <InspectorCard>
                    {vehOrders.map((o, i) => (
                      <InspectorListItem
                        key={o.id}
                        title={o.orderNumber}
                        subtitle={`${new Date(o.intakeDate).toLocaleDateString()} · ${o.diagnosticNotes}`}
                        metaRight={formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
                        badge={{ label: o.status, tone: o.status === 'Delivered' ? 'ok' : 'warn' }}
                        isLast={i === vehOrders.length - 1}
                      />
                    ))}
                  </InspectorCard>
                ) : (
                  <InspectorCard>
                    <InspectorKeyValue label="Historique OR" value="Aucun ordre enregistré" mono={false} isLast />
                  </InspectorCard>
                )}
              </InspectorSection>
            );
          }

          if (tab === 'maintenance') {
            const serviceReminders = evaluateVehicleServiceReminders(v);
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'الصيانة التنبؤية' : 'Échéancier Vidange & Distribution'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label="Vidange (10,000 km)"
                      value={isOverdue ? 'À effectuer d’urgence' : 'Statut Conforme'}
                      tone={isOverdue ? 'warn' : 'ok'}
                      mono={false}
                    />
                    <InspectorKeyValue label="Dernière vidange" value={`${lastKm.toLocaleString()} km`} />
                    <InspectorKeyValue label="Prochaine échéance" value={`${nextVidange.toLocaleString()} km`} />
                    <InspectorKeyValue label="Progression cycle" value={`${vidangePercent}%`} isLast />
                    <InspectorProgressBar percent={vidangePercent} tone={isOverdue ? 'warn' : 'ok'} animateKey={v.id} />
                  </InspectorCard>
                </InspectorSection>
                {serviceReminders.length > 0 && (
                  <InspectorSection index={1} title={L('Service & Compliance Reminders', 'Rappels Entretien, CT & Assurance', 'تذكيرات الصيانة والفحص')}>
                    <InspectorCard>
                      {serviceReminders.map((rem, idx) => (
                        <InspectorListItem
                          key={`${rem.kind}_${idx}`}
                          title={rem.message}
                          subtitle={rem.targetDate || rem.kind}
                          badge={{
                            label: rem.severity === 'overdue' ? L('Overdue', 'Expiré', 'متأخر') : rem.severity === 'due_soon' ? L('Due Soon', 'Proche', 'قريباً') : 'OK',
                            tone: rem.severity === 'ok' ? 'ok' : 'warn',
                          }}
                          isLast={idx === serviceReminders.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  </InspectorSection>
                )}
                <InspectorSection index={2} title="Distribution & Préconisations">
                  <InspectorCard>
                    <InspectorKeyValue
                      label="Courroie Distribution"
                      value="60,000 km · Contrôle annuel"
                      mono={false}
                      isLast
                    />
                  </InspectorCard>
                  <div className="mt-3">
                    <InspectorWideButton
                      tone="accent"
                      label={isAr ? 'جدولة صيانة وقائية' : 'Planifier Révision Atelier'}
                      icon={<Wrench className="w-4 h-4" />}
                      onClick={() => handleOpenNewOrder(v)}
                    />
                  </div>
                </InspectorSection>
              </>
            );
          }

          const ownershipHistory = v.ownershipHistory || [];
          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'order',
                      label: isAr ? 'أمر تصليح' : 'Nouvel OR',
                      icon: <Wrench className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => handleOpenNewOrder(v),
                    },
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : 'Modifier',
                      icon: <Edit className="w-[18px] h-[18px]" />,
                      onClick: () => handleOpenEdit(v),
                    },
                    {
                      id: 'transfer',
                      label: L('Transfer Owner', 'Céder / Transférer', 'نقل الملكية'),
                      icon: <ArrowLeftRight className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        setNewOwnerName('');
                        setNewOwnerPhone('');
                        setNewOwnerEmail('');
                        setTransferReason('');
                        setTransferOdometer(String(v.mileageKm));
                        setTransferTarget(v);
                      },
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(v.id) ? 'Désépingler' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handleTogglePin(v),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'المواصفات الفنية' : 'Données Constructeur'}>
                <InspectorCard>
                  <InspectorKeyValue label="N° Châssis (VIN)" value={v.vin || (v.vehicleType === 'moto' ? 'Exempté (Moto)' : '—')} />
                  <InspectorKeyValue label="Immatriculation" value={v.plateNumber} tone="accent" />
                  <InspectorKeyValue label="Catégorie" value={`${v.vehicleType || 'car'} · ${v.plateFormat || 'algeria_standard'}`} mono={false} />
                  <InspectorKeyValue label="Motorisation" value={v.fuelType || 'Diesel'} mono={false} />
                  <InspectorKeyValue label="Année modèle" value={String(v.year)} />
                  <InspectorKeyValue label="Compteur Enregistré" value={`${v.mileageKm.toLocaleString()} km`} />
                  <InspectorKeyValue label="Compteur Estimé" value={`${estKm.toLocaleString()} km`} tone="ok" isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection
                index={2}
                title={v.isFleet ? (isAr ? 'حساب الأسطول B2B' : 'Flotte Conventionnée B2B') : 'Coordonnées Client'}
              >
                <InspectorCard>
                  {v.isFleet && (
                    <InspectorKeyValue label="Flotte B2B" value={v.fleetName || 'Compte Entreprise'} mono={false} tone="accent" />
                  )}
                  <InspectorKeyValue label="Contact / Titulaire" value={v.ownerName} mono={false} />
                  <InspectorKeyValue label="Téléphone" value={v.ownerPhone} />
                  <InspectorKeyValue label="Fiche CRM Unifiée" value={v.crmPartyId ? `Lié (${v.crmPartyId.slice(0, 8)})` : 'Non liée'} tone={v.crmPartyId ? 'ok' : 'warn'} />
                  <InspectorKeyValue
                    label="Carte Grise"
                    value={v.carteGriseNumber || 'Non renseignée'}
                    isLast
                  />
                </InspectorCard>
                {!v.crmPartyId && (
                  <div className="mt-2.5">
                    <InspectorWideButton
                      label={L('Link Client to CRM Master', 'Lier au Référentiel CRM', 'ربط بملف الزبائن الموحد')}
                      icon={<Link2 className="w-4 h-4" />}
                      onClick={() => {
                        const res = ensurePartyForEntity({
                          businessId: v.businessId,
                          branchId: v.branchId,
                          sourceVertical: 'auto_garage',
                          entityType: 'garage_client',
                          entityId: v.id,
                          partyKind: v.isFleet ? 'company' : 'person',
                          displayName: v.ownerName,
                          phone: v.ownerPhone,
                          email: v.ownerEmail,
                        });
                        updateVehicle({ ...v, crmPartyId: res.party.id });
                        showToast({
                          type: 'success',
                          title: L('CRM Linked', 'Fiche CRM Liée', 'تم ربط الزبون'),
                          message: `${res.party.displayName}`,
                        });
                      }}
                    />
                  </div>
                )}
              </InspectorSection>

              {ownershipHistory.length > 0 && (
                <InspectorSection index={3} title={L('Ownership Transfer History', 'Historique Cessions Propriétaire', 'سجل نقل الملكية')}>
                  <InspectorCard>
                    {ownershipHistory.map((h, i) => (
                      <InspectorListItem
                        key={h.id}
                        title={`${h.previousOwnerName} → ${h.newOwnerName}`}
                        subtitle={`${new Date(h.transferredAt).toLocaleDateString()} · ${h.reason} · ${h.odometerAtTransferKm.toLocaleString()} km`}
                        isLast={i === ownershipHistory.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              )}
            </>
          );
        }}
      />

      <AutoVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setVehicleToEdit(null);
        }}
        vehicleToEdit={vehicleToEdit}
        onSave={(v) => {
          if (vehicleToEdit) {
            updateVehicle(v);
            if (inspectedVehicle?.id === v.id) setInspectedVehicle(v);
          } else {
            addVehicle(v);
          }
          setIsVehicleModalOpen(false);
          setVehicleToEdit(null);
        }}
      />

      <AutoOrderModal
        isOpen={isOrderModalOpen && Boolean(orderVehicle)}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderVehicle(null);
        }}
        vehicles={orderVehicle ? [orderVehicle] : []}
        bays={bays}
        existingOrders={orders}
        onSave={(order) => {
          addOrder(order);
          setIsOrderModalOpen(false);
          setOrderVehicle(null);
        }}
      />

      <KineticModalShell
        isOpen={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        {transferTarget && (
          <div data-sq="panel" data-sq-border="solid" className="w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
              <h3 className="t-card font-semibold text-black dark:text-white">
                {L('Transfer Vehicle Ownership', 'Cession / Changement Propriétaire', 'نقل ملكية المركبة')} · {transferTarget.plateNumber}
              </h3>
              <button type="button" onClick={() => setTransferTarget(null)} className="p-1 cursor-pointer"><X size={18} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const updated = transferVehicleOwner(transferTarget.id, {
                    newOwnerName,
                    newOwnerPhone,
                    newOwnerEmail,
                    reason: transferReason,
                    odometerAtTransferKm: parseInt(transferOdometer, 10) || transferTarget.mileageKm,
                  });
                  setInspectedVehicle(updated);
                  setTransferTarget(null);
                  showToast({
                    type: 'success',
                    title: L('Ownership Transferred', 'Cession Enregistrée', 'تم نقل الملكية'),
                    message: `${updated.plateNumber} → ${updated.ownerName}`,
                  });
                } catch (err: any) {
                  showToast({
                    type: 'error',
                    title: L('Transfer Error', 'Erreur Cession', 'خطأ في النقل'),
                    message: err?.message || L('Owner name and reason (>= 3 chars) required.', 'Nom et motif (3 car. min) requis.', 'الاسم والسبب مطلوبان.'),
                  });
                }
              }}
              className="space-y-3"
            >
              <LabelInput label={L('New Owner Name *', 'Nouveau Propriétaire *', 'المالك الجديد *')} value={newOwnerName} onChange={setNewOwnerName} required />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput label={L('New Phone *', 'Nouveau Téléphone *', 'الهاتف الجديد *')} value={newOwnerPhone} onChange={setNewOwnerPhone} required />
                <LabelInput type="number" label={L('Odometer (km)', 'Compteur (km)', 'العداد (كم)')} value={transferOdometer} onChange={setTransferOdometer} />
              </div>
              <LabelInput label={L('Transfer Reason *', 'Motif de cession (min. 3 car.) *', 'سبب نقل الملكية *')} value={transferReason} onChange={setTransferReason} placeholder="Vente entre particuliers / Rachat flotte" required />
              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setTransferTarget(null)}>{L('Cancel', 'Annuler', 'إلغاء')}</AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm">{L('Confirm Transfer', 'Valider Cession', 'تأكيد النقل')}</AtriumButton>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>

      <KineticModalShell
        isOpen={isTireModalOpen}
        onClose={() => setIsTireModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
      >
        <div data-sq="panel" data-sq-border="solid" className="w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">{L('Store Tires (Hôtel Pneus)', 'Nouveau Dépôt Hôtel Pneus', 'إيداع إطارات جديدة')}</h3>
            <button type="button" onClick={() => setIsTireModalOpen(false)} className="p-1 cursor-pointer"><X size={18} /></button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const veh = vehicles.find((v) => v.id === tireVehicleId) || vehicles[0];
              if (!veh || !tireSize.trim() || !tireRack.trim()) return;
              const entry: TireStorageEntry = {
                id: `tire_${Date.now()}`,
                branchId: veh.branchId || currentBranch?.id || 'branch_garage_main',
                storageTag: `HTL-${new Date().getFullYear()}-${String(tireStorage.length + 1).padStart(3, '0')}`,
                vehicleId: veh.id,
                plateNumber: veh.plateNumber,
                ownerName: veh.ownerName,
                season: tireSeason,
                tireSize: tireSize.trim(),
                brand: tireBrand.trim() || 'Michelin',
                quantity: parseInt(tireQty, 10) || 4,
                treadDepthMm: parseFloat(tireTreadMm) || 5.0,
                rackLocation: tireRack.trim(),
                storedAt: new Date().toISOString().slice(0, 10),
                dueSwapDate: tireDueSwapDate.trim() || undefined,
                status: 'stored',
              };
              upsertTireStorageEntry(entry);
              setIsTireModalOpen(false);
              showToast({
                type: 'success',
                title: L('Tires Stored', 'Dépôt Enregistré', 'تم حفظ الإطارات'),
                message: `${entry.storageTag} · ${entry.plateNumber}`,
              });
            }}
            className="space-y-3"
          >
            <LabelSelect
              label={L('Vehicle *', 'Véhicule *', 'المركبة *')}
              value={tireVehicleId}
              onChange={setTireVehicleId}
              options={vehicles.map((v) => ({ value: v.id, label: `${v.plateNumber} · ${v.ownerName}` }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput label={L('Tire Size *', 'Dimension *', 'المقاس *')} value={tireSize} onChange={setTireSize} placeholder="205/55 R16" required />
              <LabelSelect
                label={L('Season', 'Saison', 'الموسم')}
                value={tireSeason}
                onChange={(v) => setTireSeason(v as any)}
                options={[
                  { value: 'winter', label: 'Hiver' },
                  { value: 'summer', label: 'Été' },
                  { value: 'all_season', label: '4 Saisons' },
                ]}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <LabelInput label={L('Brand', 'Marque', 'العلامة')} value={tireBrand} onChange={setTireBrand} placeholder="Michelin" />
              <LabelInput type="number" label={L('Qty', 'Qté', 'الكمية')} value={tireQty} onChange={setTireQty} />
              <LabelInput type="number" label={L('Tread (mm)', 'Sculpture (mm)', 'العمق')} value={tireTreadMm} onChange={setTireTreadMm} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelInput label={L('Rack *', 'Emplacement Rack *', 'الرف *')} value={tireRack} onChange={setTireRack} placeholder="Rack P-04" required />
              <LabelInput type="date" label={L('Due Swap Date', 'Échéance Permutation', 'تاريخ التبديل')} value={tireDueSwapDate} onChange={setTireDueSwapDate} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsTireModalOpen(false)}>{L('Cancel', 'Annuler', 'إلغاء')}</AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">{L('Store Tires', 'Valider Dépôt', 'حفظ الإيداع')}</AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </div>
  );
};
