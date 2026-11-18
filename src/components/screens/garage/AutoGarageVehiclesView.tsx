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
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import {
  useGarageData,
  VehicleAsset,
  RepairOrder,
  calculateEstimatedMileage,
} from './garageData';
import { AutoVehicleModal } from './AutoVehicleModal';
import { AutoOrderModal } from './AutoOrderModal';
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
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    vehicles,
    orders,
    bays,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addOrder,
  } = useGarageData();

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
      showToast({
        type: 'success',
        title: isAr ? 'حذف' : 'Supprimé',
        message: isAr ? 'تم حذف المركبة من الحظيرة' : 'Véhicule retiré du parc',
      });
    },
    [deleteVehicle, inspectedVehicle, isAr]
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
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Car size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-black dark:text-white truncate">
                    {v.brand} {v.model}
                  </span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">VIP</span>}
                  {v.isFleet && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/50">
                      Flotte B2B
                    </span>
                  )}
                  {inShop && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Wrench size={10} />
                      {isAr ? 'في الورشة' : 'En Atelier'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white font-bold">
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
            <div className="text-xs font-semibold text-black dark:text-white truncate flex items-center gap-1.5">
              {v.isFleet && <Building2 size={12} className="text-[#d4522f] shrink-0" />}
              <span className="truncate">{v.ownerName}</span>
            </div>
            <div className="text-[11px] font-mono text-black/55 dark:text-white/55 mt-0.5">{v.ownerPhone}</div>
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
            <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">
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
          const needsOilChange = estKm - (v.lastServiceKm || v.mileageKm - 5000) >= 9500;
          return (
            <div className="space-y-0.5">
              <div className="text-xs font-mono font-bold text-black dark:text-white flex items-center gap-1.5">
                <Gauge size={13} className="text-[#d4522f]" />
                <span>{estKm.toLocaleString()} km</span>
                <span className="text-[10px] text-black/55 dark:text-white/55 font-normal">(est.)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {needsOilChange ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-0.5">
                    <AlertTriangle size={9} />
                    {isAr ? 'تغيير زيت مطلوب' : 'Vidange requise'}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-black/55 dark:text-white/55">
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
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
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
        primaryAction={{
          label: isAr ? 'تسجيل مركبة' : isEn ? 'New Vehicle' : 'Nouveau Véhicule',
          icon: <Plus size={16} strokeWidth={2.5} />,
          onClick: handleOpenAdd,
        }}
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
            ids.forEach((id) => deleteVehicle(id));
            setSelectedIds(new Set());
            if (inspectedVehicle && ids.has(inspectedVehicle.id)) setInspectedVehicle(null);
            showToast({
              type: 'success',
              title: isAr ? 'حذف' : 'Supprimé',
              message: isAr ? 'تم حذف المركبات المحددة' : 'Véhicules sélectionnés supprimés',
            });
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
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
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
                <InspectorSection index={1} title="Distribution & Préconisations">
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
                  <InspectorKeyValue label="N° Châssis (VIN)" value={v.vin} />
                  <InspectorKeyValue label="Immatriculation" value={v.plateNumber} tone="accent" />
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
                  <InspectorKeyValue
                    label="Carte Grise"
                    value={v.carteGriseNumber || 'Non renseignée'}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {isVehicleModalOpen && (
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
              showToast({
                type: 'success',
                title: v.plateNumber,
                message: isAr ? 'تم تحديث بيانات المركبة' : 'Véhicule mis à jour',
              });
            } else {
              addVehicle(v);
              showToast({
                type: 'success',
                title: v.plateNumber,
                message: isAr ? 'تم تسجيل المركبة بنجاح' : 'Véhicule enregistré avec succès',
              });
            }
            setIsVehicleModalOpen(false);
            setVehicleToEdit(null);
          }}
        />
      )}

      {isOrderModalOpen && orderVehicle && (
        <AutoOrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setOrderVehicle(null);
          }}
          vehicles={[orderVehicle]}
          bays={bays}
          onSave={(order) => {
            addOrder(order);
            setIsOrderModalOpen(false);
            setOrderVehicle(null);
            showToast({
              type: 'success',
              title: order.orderNumber,
              message: isAr ? 'تم إنشاء أمر الإصلاح بنجاح' : 'Ordre de réparation créé',
            });
          }}
        />
      )}
    </div>
  );
};
