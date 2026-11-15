import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  ChevronRight,
  Trash2,
  X,
  ArrowRight,
  Fuel,
  Gauge,
  Camera,
  Boxes,
  Package,
  Car,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, RepairOrder } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const ORDER_STATUS_SEQUENCE: RepairOrder['status'][] = [
  'Intake',
  'Diagnostic',
  'WaitingApproval',
  'WaitingParts',
  'InRepair',
  'Testing',
  'ReadyForPickup',
  'Delivered',
];

const KANBAN_COLUMNS: Array<{ id: RepairOrder['status']; fr: string; en: string; ar: string; color: string }> = [
  { id: 'Diagnostic', fr: 'Diagnostic', en: 'Diagnostic', ar: 'التشخيص', color: 'border-amber-300 dark:border-amber-800' },
  { id: 'WaitingParts', fr: 'Attente Pièces', en: 'Waiting Parts', ar: 'انتظار القطع', color: 'border-rose-300 dark:border-rose-800' },
  { id: 'InRepair', fr: 'Sur Pont (Travaux)', en: 'On Lift (Work)', ar: 'قيد العمل على الجسر', color: 'border-indigo-300 dark:border-indigo-800' },
  { id: 'Testing', fr: 'Contrôle & Essai', en: 'QC & Road Test', ar: 'المراقبة والتجريب', color: 'border-cyan-300 dark:border-cyan-800' },
  { id: 'ReadyForPickup', fr: 'Prêt Livraison', en: 'Ready for Pickup', ar: 'جاهزة للتسليم', color: 'border-emerald-300 dark:border-emerald-800' },
];

export const AutoGarageOrdersView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    activeGarageRole,
    isSyncing,
    networkMode,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const isMechanicRole = activeGarageRole === 'mecanicien';

  const {
    orders,
    vehicles,
    parts,
    bays,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    requisitionPartToOrder,
  } = useGarageData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('All');

  const [displayMode, setDisplayMode] = useState<'kanban' | 'collection'>(isMechanicRole ? 'kanban' : 'collection');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['ro_01']));
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState('1');

  const [inspectedOrder, setInspectedOrder] = useState<RepairOrder | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ordre');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeOrder = useMemo(() => {
    if (!inspectedOrder) return null;
    return orders.find((o) => o.id === inspectedOrder.id) || inspectedOrder;
  }, [inspectedOrder, orders]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const bName = resolveRecordBranch(o, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [orders, branchesById, currentBranch, language]);

  const activeCount = useMemo(
    () => orders.filter((o) => o.status === 'InRepair' || o.status === 'Diagnostic').length,
    [orders]
  );
  const readyCount = useMemo(
    () => orders.filter((o) => o.status === 'ReadyForPickup').length,
    [orders]
  );
  const totalBilled = useMemo(
    () => orders.reduce((acc, o) => acc + (o.finalCostDzd || o.estimatedCostDzd), 0),
    [orders]
  );
  const occupiedBaysCount = useMemo(() => bays.filter((b) => b.isOccupied).length, [bays]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === 'active_shop') {
        if (o.status !== 'InRepair' && o.status !== 'Diagnostic') return false;
      } else if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(o, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (clientTypeFilter !== 'All') {
        const cType = o.clientType || 'individual';
        if (cType !== clientTypeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = o.vehiclePlate.toLowerCase().includes(q);
        const matchesClient = o.clientName.toLowerCase().includes(q);
        const matchesOrder = o.orderNumber.toLowerCase().includes(q);
        const matchesModel = o.vehicleModel.toLowerCase().includes(q);
        const matchesTech = o.technicianName.toLowerCase().includes(q);
        if (!matchesPlate && !matchesClient && !matchesOrder && !matchesModel && !matchesTech) return false;
      }
      return true;
    });
  }, [orders, statusFilter, branchFilter, clientTypeFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      let cmp = 0;
      if (sortBy === 'orderNumber') {
        cmp = a.orderNumber.localeCompare(b.orderNumber);
      } else if (sortBy === 'vehicle') {
        cmp = a.vehiclePlate.localeCompare(b.vehiclePlate);
      } else if (sortBy === 'client') {
        cmp = a.clientName.localeCompare(b.clientName);
      } else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else if (sortBy === 'cost') {
        cmp = (a.finalCostDzd || a.estimatedCostDzd) - (b.finalCostDzd || b.estimatedCostDzd);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredOrders, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const getStatusLabel = useCallback(
    (status: RepairOrder['status']) => {
      switch (status) {
        case 'Intake':
          return isAr ? 'استلام أولي' : isEn ? 'Intake' : 'Entrée Réception';
        case 'Diagnostic':
          return isAr ? 'التشخيص' : isEn ? 'Diagnostic' : 'Diagnostic En Cours';
        case 'WaitingApproval':
          return isAr ? 'انتظار الموافقة' : isEn ? 'Awaiting Approval' : 'Attente Devis Client';
        case 'WaitingParts':
          return isAr ? 'انتظار القطع' : isEn ? 'Waiting Parts' : 'Attente Pièces';
        case 'InRepair':
          return isAr ? 'قيد الإصلاح' : isEn ? 'In Repair' : 'Sur Pont (En Travaux)';
        case 'Testing':
          return isAr ? 'فحص وتجريب' : isEn ? 'QC & Test' : 'Contrôle & Essai';
        case 'ReadyForPickup':
          return isAr ? 'جاهز للتسليم' : isEn ? 'Ready' : 'Prêt pour Livraison';
        case 'Delivered':
          return isAr ? 'مسلّم ومغلق' : isEn ? 'Delivered' : 'Clôturé & Livré';
        default:
          return status;
      }
    },
    [isAr, isEn]
  );

  const renderStatusBadge = useCallback(
    (status: RepairOrder['status']) => {
      const label = getStatusLabel(status);
      switch (status) {
        case 'Intake':
          return <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">{label}</span>;
        case 'Diagnostic':
          return <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">{label}</span>;
        case 'WaitingApproval':
          return <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">{label}</span>;
        case 'WaitingParts':
          return <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">{label}</span>;
        case 'InRepair':
          return <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">{label}</span>;
        case 'Testing':
          return <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">{label}</span>;
        case 'ReadyForPickup':
          return <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">{label}</span>;
        case 'Delivered':
          return <span className="text-[11px] font-semibold text-black/70 dark:text-white/75 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full">{label}</span>;
        default:
          return null;
      }
    },
    [getStatusLabel]
  );

  const handleTogglePin = useCallback((order: RepairOrder) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      return next;
    });
  }, []);

  const handleDeleteOrder = useCallback(
    (order: RepairOrder) => {
      deleteOrder(order.id);
      if (inspectedOrder?.id === order.id) setInspectedOrder(null);
      showToast({
        type: 'success',
        title: isAr ? 'حذف' : 'Supprimé',
        message: isAr ? 'تم حذف أمر التصليح' : 'Ordre de réparation supprimé',
      });
    },
    [deleteOrder, inspectedOrder, isAr]
  );

  const handleNextStatus = useCallback(
    (order: RepairOrder) => {
      const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(order.status);
      if (currentIndex >= 0 && currentIndex < ORDER_STATUS_SEQUENCE.length - 1) {
        const next = ORDER_STATUS_SEQUENCE[currentIndex + 1];
        updateOrderStatus(order.id, next);
        if (inspectedOrder?.id === order.id) {
          setInspectedOrder({ ...order, status: next });
        }
        showToast({
          type: 'success',
          title: order.orderNumber,
          message: isAr ? `تم تحديث الحالة إلى: ${getStatusLabel(next)}` : `Statut mis à jour : ${getStatusLabel(next)}`,
        });
      }
    },
    [updateOrderStatus, inspectedOrder, isAr, getStatusLabel]
  );

  const handleRequisitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !selectedPartId) return;
    const qty = parseInt(selectedPartQty, 10) || 1;
    if (requisitionPartToOrder(activeOrder.id, selectedPartId, qty)) {
      showToast({
        type: 'success',
        title: activeOrder.orderNumber,
        message: isAr ? 'تم صرف القطعة وإضافتها لأمر التصليح' : 'Pièce réquisitionnée et sortie du stock',
      });
      setIsRequisitionModalOpen(false);
    } else {
      showToast({
        type: 'error',
        title: isAr ? 'نقص المخزون' : 'Stock insuffisant',
        message: isAr ? 'الكمية غير كافية في المخزن' : 'Stock insuffisant dans le magasin',
      });
    }
  };

  const handleExportCsv = useCallback(() => {
    const headers = isMechanicRole
      ? ['OrderNumber', 'Plate', 'Vehicle', 'Client', 'Branch', 'Bay', 'Technician', 'Status']
      : ['OrderNumber', 'Plate', 'Vehicle', 'Client', 'Branch', 'Bay', 'Technician', 'Status', 'TotalDZD'];
    const rows = sortedOrders.map((o) => {
      const branchInfo = resolveRecordBranch(o, branchesById, currentBranch, language);
      const base = [
        o.orderNumber,
        o.vehiclePlate,
        o.vehicleModel,
        o.clientName,
        branchInfo.name,
        o.bayName || 'Non assigné',
        o.technicianName,
        o.status,
      ];
      if (!isMechanicRole) base.push(String(o.finalCostDzd || o.estimatedCostDzd));
      return base;
    });
    downloadCsvSafe(`ordres_reparation_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تصدير CSV' : 'Export CSV',
      message: isAr ? 'تم تصدير سجل أوامر التصليح' : 'Registre des OR exporté',
    });
  }, [sortedOrders, isMechanicRole, branchesById, currentBranch, language, isAr]);

  const columns: ColumnDefinition<RepairOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: isAr ? 'رقم الأمر' : isEn ? 'RO #' : 'N° OR',
        width: '1.2*',
        sortable: true,
        renderCell: (o) => (
          <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-[#d4522f]">
            <span>{o.orderNumber}</span>
          </div>
        ),
      },
      {
        key: 'vehicle',
        header: isAr ? 'المركبة والماتريكيل' : isEn ? 'Vehicle & Plate' : 'Véhicule & Matricule',
        width: '2.2*',
        sortable: true,
        renderCell: (o) => (
          <div className="min-w-0">
            <span className="font-mono font-bold text-xs text-black dark:text-white block">{o.vehiclePlate}</span>
            <span className="text-[11px] text-black/55 dark:text-white/55 block truncate">{o.vehicleModel}</span>
          </div>
        ),
      },
      {
        key: 'client',
        header: isAr ? 'الزبون' : isEn ? 'Client' : 'Client & Tél',
        width: '2*',
        sortable: true,
        renderCell: (o) => (
          <div className="min-w-0">
            <span className="font-semibold text-xs text-black dark:text-white block truncate">{o.clientName}</span>
            <span className="text-[11px] text-black/55 dark:text-white/55 font-mono block">{o.clientPhone}</span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Succursale',
        width: '1.4*',
        sortable: true,
        renderCell: (o) => {
          const info = resolveRecordBranch(o, branchesById, currentBranch, language);
          return (
            <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">
              {info.name}
            </span>
          );
        },
      },
      {
        key: 'bay',
        header: isAr ? 'الجسر والتقني' : isEn ? 'Lift & Tech' : 'Pont & Mécanicien',
        width: '1.8*',
        renderCell: (o) => (
          <div className="text-xs min-w-0">
            <span className="font-semibold text-black/75 dark:text-white/80 block truncate">{o.bayName || 'Non assigné'}</span>
            <span className="text-[11px] text-black/55 dark:text-white/55 block truncate">{o.technicianName}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Stage' : 'Statut',
        width: '1.5*',
        sortable: true,
        renderCell: (o) => renderStatusBadge(o.status),
      },
      ...(!isMechanicRole
        ? [
            {
              key: 'cost',
              header: isAr ? 'التكلفة' : isEn ? 'Total' : 'Montant',
              width: '1.3*',
              sortable: true,
              renderCell: (o: RepairOrder) => (
                <div className="text-right font-mono font-bold text-xs text-black dark:text-white">
                  {formatMoney(o.finalCostDzd || o.estimatedCostDzd, language)}
                </div>
              ),
            },
          ]
        : []),
    ],
    [isAr, isEn, isMechanicRole, branchesById, currentBranch, language, renderStatusBadge]
  );

  const hasAdvancedFilters = branchFilter !== 'All' || clientTypeFilter !== 'All';
  const activeAdvancedCount = (branchFilter !== 'All' ? 1 : 0) + (clientTypeFilter !== 'All' ? 1 : 0);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'status',
        label: isAr ? 'مرحلة الورشة' : isEn ? 'Workshop Stage' : 'Étape Atelier',
        value: statusFilter,
        onChange: setStatusFilter,
        resetValue: 'all',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: orders.length },
          { value: 'active_shop', label: isAr ? 'نشطة بالورشة' : isEn ? 'Active Shop' : 'En Atelier', count: activeCount },
          { value: 'Diagnostic', label: isAr ? 'التشخيص' : 'Diagnostic' },
          { value: 'WaitingParts', label: isAr ? 'انتظار القطع' : 'Attente Pièces' },
          { value: 'InRepair', label: isAr ? 'على الجسر' : 'Sur Pont' },
          { value: 'ReadyForPickup', label: isAr ? 'جاهزة للتسليم' : 'Prêts Livraison', count: readyCount },
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
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes', count: orders.length },
          ...Array.from(branchCounts.entries()).map(([bName, count]) => ({
            value: bName,
            label: bName,
            count,
          })),
        ],
      },
      {
        id: 'clientType',
        label: isAr ? 'نوع الحساب' : isEn ? 'Client Type' : 'Type Client',
        value: clientTypeFilter,
        onChange: setClientTypeFilter,
        resetValue: 'All',
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'individual', label: isAr ? 'أفراد' : isEn ? 'Private' : 'Particuliers' },
          { value: 'corporate_fleet', label: isAr ? 'أساطيل B2B' : isEn ? 'Fleets B2B' : 'Flottes B2B' },
        ],
      },
    ],
    [isAr, isEn, statusFilter, branchFilter, clientTypeFilter, orders.length, activeCount, readyCount, branchCounts]
  );

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: `${isAr ? 'المرحلة' : 'Étape'}: ${statusFilter === 'active_shop' ? (isAr ? 'نشطة بالورشة' : 'En Atelier') : getStatusLabel(statusFilter as RepairOrder['status'])}`,
        onRemove: () => setStatusFilter('all'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : 'Succursale'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (clientTypeFilter !== 'All') {
      chips.push({
        key: 'clientType',
        label: clientTypeFilter === 'corporate_fleet' ? 'Flotte B2B' : 'Particulier',
        onRemove: () => setClientTypeFilter('All'),
      });
    }
    return chips;
  }, [statusFilter, branchFilter, clientTypeFilter, isAr, getStatusLabel]);

  const handleResetAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setBranchFilter('All');
    setClientTypeFilter('All');
  }, []);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: orders.length > 0,
  });

  if (showSkeleton && (orders.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
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
        icon={<Wrench size={26} />}
        title={
          isAr
            ? 'الإصلاحات'
            : isEn
            ? activeGarageRole === 'mecanicien'
              ? 'Bays'
              : 'Repairs'
            : activeGarageRole === 'mecanicien'
            ? 'Ponts'
            : 'Réparations'
        }
        subtitle={
          isAr
            ? `${orders.length} أوامر تصليح مسجلة · ${occupiedBaysCount}/${bays.length} جسور مشغولة`
            : `${orders.length} ordres de réparation · ${occupiedBaysCount}/${bays.length} ponts occupés`
        }
        secondaryActions={
          <LiveSegmentedControl
            size="sm"
            value={displayMode}
            onValueChange={(val) => setDisplayMode(val as 'kanban' | 'collection')}
            options={[
              {
                value: 'kanban',
                label: isAr ? 'جسور' : language === 'fr' ? 'Ponts' : 'Lifts',
                tooltip: isAr ? 'لوحة الجسور (كانبان)' : language === 'fr' ? 'Vue Ponts (Kanban)' : 'Lifts Kanban board',
                count: orders.length,
              },
              {
                value: 'collection',
                label: isAr ? 'سجل' : language === 'fr' ? 'Registre' : 'Table',
                tooltip: isAr ? 'سجل أوامر التصليح' : language === 'fr' ? 'Registre des ordres (Tableau)' : 'Repair orders table',
              },
            ]}
            aria-label="Garage View Mode"
          />
        }
        primaryAction={{
          label: isAr ? 'فتح أمر تصليح (OR)' : isEn ? 'New Repair Order' : 'Nouvel OR (Entrée)',
          icon: <Plus size={16} strokeWidth={2.5} />,
          onClick: () => setIsOrderModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الورشة وجسور الرفع' : isEn ? 'Workshop & Lifts KPIs' : 'Indicateurs Atelier & Ponts'}
        language={language}
        primaryCard={{
          label: isAr ? 'أوامر قيد الإنجاز' : isEn ? 'Active in Workshop' : 'En Réparation Active',
          badgeText: isAr ? 'نشطة' : isEn ? 'Active' : 'Atelier',
          count: activeCount,
          isActive: statusFilter === 'active_shop',
          onToggle: () => setStatusFilter((prev) => (prev === 'active_shop' ? 'all' : 'active_shop')),
          tone: 'terracotta',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        secondaryCard={{
          label: isAr ? 'جاهزة للتسليم' : isEn ? 'Ready for Pickup' : 'Prêts pour Livraison',
          badgeText: isAr ? 'مكتملة' : isEn ? 'Ready' : 'Prêts',
          count: readyCount,
          isActive: statusFilter === 'ReadyForPickup',
          onToggle: () => setStatusFilter((prev) => (prev === 'ReadyForPickup' ? 'all' : 'ReadyForPickup')),
          tone: 'emerald',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        darkCard={
          isMechanicRole
            ? {
                label: isAr ? 'جسور الرفع المشغولة' : isEn ? 'Workshop Lifts Occupied' : 'Ponts Élévateurs Occupés',
                badgeCount: occupiedBaysCount,
                badgeSuffix: ` / ${bays.length}`,
                valueCount: bays.length - occupiedBaysCount,
                valueSuffix: isAr ? ' متاح' : isEn ? ' free' : ' libres',
                caption: isAr ? 'حالة الرافعات في الوقت الفعلي' : 'Disponibilité des postes en temps réel',
              }
            : {
                label: isAr ? 'قيمة الأوامر الحالية' : isEn ? 'Active RO Pipeline' : "Volume d'Affaires OR",
                badgeCount: occupiedBaysCount,
                badgeSuffix: ` / ${bays.length} ponts`,
                valueCount: totalBilled,
                valueSuffix: ' DA',
                caption: isAr ? 'إجمالي أوامر التصليح الجارية' : 'Cumul estimatif & facturé atelier',
              }
        }
      />

      {/* Real-time Bay Strip */}
      <ScreenPod>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-black dark:text-white flex items-center gap-2">
              <Wrench size={14} className="text-[#d4522f]" />
              {isAr ? 'حالة جسور الرفع والورشة في الوقت الفعلي' : 'Occupation Temps Réel des Ponts & Postes Atelier'}
            </span>
            <span className="text-[11px] font-medium text-black/55 dark:text-white/55">
              {occupiedBaysCount === bays.length
                ? isAr
                  ? 'الورشة ممتلئة'
                  : 'Atelier Plein'
                : `${bays.length - occupiedBaysCount} ${isAr ? 'مراكز متاحة' : 'postes disponibles'}`}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {bays.map((bay) => {
              const bayOrder = orders.find((o) => o.assignedBayId === bay.id || o.id === bay.activeOrderId);
              return (
                <button
                  key={bay.id}
                  type="button"
                  disabled={!bayOrder}
                  onClick={(e) => {
                    if (bayOrder) {
                      setDrawerOpenerEl(e.currentTarget);
                      setInspectedOrder(bayOrder);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left rtl:text-right transition-all text-xs ${
                    bay.isOccupied
                      ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800/60 shadow-2xs cursor-pointer hover:border-[#d4522f]'
                      : 'bg-white dark:bg-neutral-900 border-[#E6DED6] dark:border-neutral-800 opacity-85 cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-black dark:text-white truncate">P{bay.bayNumber}</span>
                    <span className={`w-2 h-2 rounded-full ${bay.isOccupied ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  </div>
                  <span className="text-[11px] text-black/55 dark:text-white/55 block truncate">{bay.name}</span>
                  {bayOrder ? (
                    <span className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 block">
                      <span className="font-mono font-bold text-black dark:text-white block text-[11px] truncate">
                        {bayOrder.vehiclePlate}
                      </span>
                      <span className="text-[10px] text-black/55 dark:text-white/55 block truncate">
                        {bayOrder.technicianName}
                      </span>
                    </span>
                  ) : (
                    <span className="mt-2 block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {isAr ? 'متاح' : 'Libre'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </ScreenPod>

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            displayMode === 'kanban'
              ? isAr
                ? 'لوحة مسار الورشة'
                : 'Tableau Atelier (Kanban)'
              : isAr
              ? 'سجل أوامر التصليح'
              : 'Registre des Ordres de Réparation'
          }
          language={language}
          liveRegionText={`${sortedOrders.length} ${isAr ? 'أمر تصليح' : 'OR'}`}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'البحث برقم الأمر، الماتريكيل، التقني...' : 'Recherche par N° OR, matricule, technicien...'
          }
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            { value: 'all', label: isAr ? 'الكل' : 'Tous', count: orders.length },
            { value: 'active_shop', label: isAr ? 'بالورشة' : 'En Atelier', count: activeCount },
            { value: 'ReadyForPickup', label: isAr ? 'جاهز' : 'Prêts', count: readyCount },
          ]}
          hasActiveAdvancedFilters={hasAdvancedFilters}
          activeFiltersCount={activeAdvancedCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={displayMode === 'collection'}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={handleResetAllFilters}
        />

        {displayMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start mt-4">
            {KANBAN_COLUMNS.map((col) => {
              const colOrders = sortedOrders.filter((o) => o.status === col.id);
              const colLabel = isAr ? col.ar : isEn ? col.en : col.fr;
              return (
                <div
                  key={col.id}
                  className="bg-white dark:bg-neutral-900 rounded-3xl p-3 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs flex flex-col space-y-3 min-h-[380px]"
                >
                  <div className={`flex items-center justify-between pb-2 border-b-2 ${col.color}`}>
                    <span className="font-bold text-xs text-black dark:text-white">{colLabel}</span>
                    <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 text-[11px] font-mono flex items-center justify-center font-bold">
                      {colOrders.length}
                    </span>
                  </div>
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[550px] pr-1">
                    {colOrders.length === 0 ? (
                      <div className="text-center py-8 text-black/55 dark:text-white/55 text-xs italic">
                        {isAr ? 'لا توجد سيارات' : 'Aucun véhicule'}
                      </div>
                    ) : (
                      colOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`p-3 rounded-2xl border transition-all space-y-2 ${
                            activeOrder?.id === order.id
                              ? 'bg-[#FDF4F0] dark:bg-neutral-800 border-[#d4522f] shadow-xs'
                              : 'bg-[#F3EDE7] dark:bg-[#141312] border-neutral-200/60 dark:border-neutral-700/60 hover:border-neutral-400'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              setDrawerOpenerEl(e.currentTarget);
                              setInspectedOrder(order);
                            }}
                            className="w-full text-left rtl:text-right space-y-2 bg-transparent border-0 p-0 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-[#d4522f]">{order.orderNumber}</span>
                              <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
                                {order.bayName || 'Cour'}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-xs text-black dark:text-white block font-mono">
                                {order.vehiclePlate}
                              </span>
                              <span className="text-[11px] text-black/55 dark:text-white/55 block truncate">
                                {order.vehicleModel}
                              </span>
                            </div>
                            <div className="text-[10px] text-black/55 dark:text-white/55 flex items-center justify-between pt-1 border-t border-neutral-200/40 dark:border-neutral-700/40">
                              <span className="truncate">{order.technicianName}</span>
                              {!isMechanicRole && (
                                <span className="font-mono font-bold text-black/70 dark:text-white/75 shrink-0">
                                  {formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNextStatus(order)}
                            className="w-full py-1.5 rounded-xl bg-white dark:bg-neutral-700 hover:bg-[#d4522f] hover:text-white text-black/75 dark:text-white text-[10px] font-bold flex items-center justify-center gap-1 border border-neutral-200 dark:border-neutral-600 transition-colors cursor-pointer"
                          >
                            <span>{isAr ? 'تقديم المرحلة' : 'Avancer étape'}</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <UniversalDataCollection
            hideToolbar
            data={sortedOrders}
            columns={columns}
            keyExtractor={(o) => o.id}
            defaultViewMode={viewMode}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkSecondaryAction={{
              label: isAr ? 'تقديم المرحلة للمحدد' : 'Avancer étape atelier',
              icon: <ArrowRight size={14} />,
              onClick: (ids) => {
                ids.forEach((id) => {
                  const ord = orders.find((o) => o.id === id);
                  if (ord) handleNextStatus(ord);
                });
                setSelectedIds(new Set());
                showToast({
                  type: 'success',
                  title: isAr ? 'تحديث جماعي' : 'Atelier',
                  message: isAr ? 'تم تحديث مرحلة الأوامر المحددة' : 'Statut mis à jour pour la sélection',
                });
              },
            }}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteOrder(id));
              setSelectedIds(new Set());
              if (inspectedOrder && ids.has(inspectedOrder.id)) setInspectedOrder(null);
              showToast({
                type: 'success',
                title: isAr ? 'حذف' : 'Supprimé',
                message: isAr ? 'تم حذف الأوامر المحددة' : 'Ordres de réparation supprimés',
              });
            }}
            isPinned={(o) => pinnedIds.has(o.id)}
            onTogglePin={handleTogglePin}
            openItemId={activeOrder?.id || null}
            onItemClick={(order, el) => {
              setDrawerOpenerEl(el || null);
              setInspectedOrder(order);
            }}
            onViewDetails={(order, el) => {
              setDrawerOpenerEl(el || null);
              setInspectedOrder(order);
            }}
            onDelete={handleDeleteOrder}
            customActions={(order) => [
              {
                id: 'next',
                label: isAr ? 'تقديم المرحلة' : 'Avancer étape',
                icon: <ChevronRight size={13} />,
                onClick: () => handleNextStatus(order),
              },
              {
                id: 'req',
                label: isAr ? 'صرف قطع' : 'Pièces',
                icon: <Package size={13} />,
                onClick: () => {
                  setInspectedOrder(order);
                  setIsRequisitionModalOpen(true);
                },
              },
            ]}
            renderCard={(order) => (
              <div className="space-y-3 text-left rtl:text-right w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#d4522f]">{order.orderNumber}</span>
                  {renderStatusBadge(order.status)}
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono text-black dark:text-white">{order.vehiclePlate}</h3>
                  <p className="text-xs text-black/55 dark:text-white/55 truncate">{order.vehicleModel}</p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">{order.clientName}</span>
                    <span className="font-mono text-[11px] text-black/65 dark:text-white/70">{order.bayName || 'Cour'}</span>
                  </div>
                  {!isMechanicRole && (
                    <div className="flex justify-between font-mono font-bold text-black dark:text-white">
                      <span className="text-[11px] font-normal text-black/55 dark:text-white/55">{order.technicianName}</span>
                      <span className="text-[#d4522f]">{formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedOrders.length}
        entityPluralLabel={isAr ? 'أمر تصليح' : isEn ? 'repair orders' : 'ordres de réparation'}
        hasActiveFilters={statusFilter !== 'all' || hasAdvancedFilters}
        onResetFilters={handleResetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeOrder)}
        item={activeOrder}
        allItems={sortedOrders}
        keyExtractor={(o) => o.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeOrder ? `${activeOrder.vehiclePlate} · ${activeOrder.vehicleModel}` : ''}
        subtitle={activeOrder ? `${activeOrder.orderNumber} · ${activeOrder.clientName}` : ''}
        avatarText={activeOrder?.orderNumber.slice(-3) || 'OR'}
        avatarColor="#d4522f"
        branchName={
          activeOrder ? resolveRecordBranch(activeOrder, branchesById, currentBranch, language).name : ''
        }
        statusLabel={activeOrder ? getStatusLabel(activeOrder.status) : ''}
        tabs={[
          { id: 'ordre', label: isAr ? 'تفاصيل الأمر' : 'Détails OR' },
          { id: 'parts', label: `${isAr ? 'القطع' : 'Pièces'} (${activeOrder?.partsUsed.length || 0})` },
          { id: 'diag', label: isAr ? 'التشخيص' : 'Diagnostic' },
          ...(!isMechanicRole ? [{ id: 'costs', label: isAr ? 'التكاليف' : 'Coûts' }] : []),
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => setInspectedOrder(item)}
        onClose={() => setInspectedOrder(null)}
        onDelete={handleDeleteOrder}
        holdToDelete
        renderBody={(order) => (
          <div className="space-y-4 text-xs">
            {activeTab === 'ordre' && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55 font-semibold">
                      {isAr ? 'الحالة الحالية' : 'Statut actuel'}
                    </span>
                    {renderStatusBadge(order.status)}
                  </div>
                  {order.status !== 'Delivered' && (
                    <button
                      type="button"
                      onClick={() => handleNextStatus(order)}
                      className="w-full py-2 bg-[#d4522f] hover:bg-[#b03b1b] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>{isAr ? 'نقل للمرحلة التالية' : "Passer à l'étape suivante"}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
                  <span className="font-bold text-black dark:text-white block">
                    {isAr ? 'جسر الرفع والتقني المكلف' : 'Affectation Pont & Technicien'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                      <span className="text-[10px] text-black/55 dark:text-white/55 block">Pont / Baie</span>
                      <span className="font-bold text-black dark:text-white truncate block">
                        {order.bayName || 'Non assigné'}
                      </span>
                    </div>
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                      <span className="text-[10px] text-black/55 dark:text-white/55 block">Technicien</span>
                      <span className="font-bold text-black dark:text-white truncate block">{order.technicianName}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-[10px] text-black/55 dark:text-white/55 flex items-center gap-1">
                      <Gauge size={12} className="text-[#d4522f]" />
                      Kilométrage
                    </span>
                    <span className="font-mono font-bold text-sm text-black dark:text-white mt-1 block">
                      {order.inOdometerKm?.toLocaleString() || '—'} km
                    </span>
                  </div>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200/60 dark:border-neutral-700">
                    <span className="text-[10px] text-black/55 dark:text-white/55 flex items-center gap-1">
                      <Fuel size={12} className="text-[#d4522f]" />
                      Carburant
                    </span>
                    <span className="font-mono font-bold text-sm text-black dark:text-white mt-1 block">
                      {order.fuelLevel || '50'}%
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                  <span className="font-bold text-black dark:text-white flex items-center gap-1.5">
                    <Camera size={13} className="text-[#d4522f]" />
                    {isAr ? 'أضرار الهيكل المسجلة عند الدخول' : 'Dommages notifiés lors du walkaround'} (
                    {(order.damageMarkers || []).length})
                  </span>
                  {(order.damageMarkers || []).length === 0 ? (
                    <p className="text-[11px] text-black/55 dark:text-white/55 italic">
                      Véhicule admis sans dommages carrosserie notés.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {order.damageMarkers?.map((dm, i) => (
                        <li key={dm.id} className="text-[11px] text-black/70 dark:text-white/75 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="capitalize font-semibold">{dm.damageType}</span>
                          <span className="text-black/55 dark:text-white/55">
                            ({dm.view} · {dm.severity})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'parts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-black dark:text-white">
                    {isAr ? 'قطع الغيار المصروفة' : 'Pièces Utilisées'}
                  </span>
                  <AtriumButton
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => setIsRequisitionModalOpen(true)}
                  >
                    {isAr ? 'صرف قطعة' : 'Sortir Pièce'}
                  </AtriumButton>
                </div>
                {order.partsUsed.length === 0 ? (
                  <div className="p-6 text-center text-black/55 dark:text-white/55 italic border border-dashed rounded-2xl">
                    Aucune pièce réquisitionnée pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {order.partsUsed.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-black dark:text-white truncate max-w-[200px]">{p.name}</span>
                          <span className="font-mono text-black/55 dark:text-white/55 font-bold">x{p.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55 font-mono">
                          <span>{p.sku}</span>
                          {!isMechanicRole && (
                            <span className="font-bold text-[#d4522f]">{formatMoney(p.totalPriceDzd, language)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diag' && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 space-y-1">
                  <span className="font-bold text-black dark:text-white block">Diagnostic Initial & Plaintes</span>
                  <p className="text-black/70 dark:text-white/75 leading-relaxed">{order.diagnosticNotes}</p>
                </div>
                <div className="space-y-2">
                  <span className="font-bold text-black dark:text-white block">Contrôle Qualité & Clôture</span>
                  {(
                    order.technicianChecklist || [
                      { id: '1', label: 'Vérification serrage au couple des roues', done: true },
                      { id: '2', label: 'Contrôle niveau huile & liquide de refroidissement', done: true },
                      { id: '3', label: 'Test effacement défauts valise OBD-II', done: false },
                      { id: '4', label: 'Essai dynamique sur route & freinage', done: false },
                    ]
                  ).map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => {
                          const baseList = order.technicianChecklist || [
                            { id: '1', label: 'Vérification serrage au couple des roues', done: true },
                            { id: '2', label: 'Contrôle niveau huile & liquide de refroidissement', done: true },
                            { id: '3', label: 'Test effacement défauts valise OBD-II', done: false },
                            { id: '4', label: 'Essai dynamique sur route & freinage', done: false },
                          ];
                          const updated = baseList.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c));
                          updateOrder({ ...order, technicianChecklist: updated });
                        }}
                        className="rounded text-[#d4522f] focus:ring-[#d4522f]"
                      />
                      <span className={`text-xs ${item.done ? 'line-through text-black/55 dark:text-white/55' : 'text-black dark:text-white'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'costs' && !isMechanicRole && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Main d'œuvre HT :</span>
                    <span className="font-bold">{formatMoney(order.laborCostDzd || 3750, language)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Pièces détachées HT :</span>
                    <span className="font-bold">{formatMoney(order.partsCostDzd || 15500, language)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 text-sm font-black text-[#d4522f]">
                    <span>Total Facturable :</span>
                    <span>{formatMoney(order.finalCostDzd || order.estimatedCostDzd, language)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      />

      <AutoOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        vehicles={vehicles}
        bays={bays}
        onSave={(newOrder) => {
          addOrder(newOrder);
          setInspectedOrder(newOrder);
        }}
      />

      {isRequisitionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                <Boxes size={16} className="text-[#d4522f]" />
                <span>{isAr ? 'صرف قطعة غيار لأمر التصليح' : 'Sortie Pièce Magasin (Réquisition)'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRequisitionModalOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRequisitionSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-black/70 dark:text-white/75 block mb-1.5">
                  {isAr ? 'اختيار القطعة من المخزن' : 'Sélectionner la pièce en stock'}
                </label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white"
                  required
                >
                  <option value="">-- Choisir une pièce disponible --</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                      {p.name} ({p.sku}) · Stock: {p.stockQuantity} {p.unit || 'pcs'} · {p.sellingPriceDzd.toLocaleString()} DA
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-black/70 dark:text-white/75 block mb-1.5">
                  {isAr ? 'الكمية المطلوبة' : 'Quantité à sortir'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedPartQty}
                  onChange={(e) => setSelectedPartQty(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white font-mono"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="secondary" onClick={() => setIsRequisitionModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton type="submit" variant="primary">
                  {isAr ? 'تأكيد الصرف' : 'Valider la sortie'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
