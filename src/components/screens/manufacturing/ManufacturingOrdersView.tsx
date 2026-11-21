import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Factory,
  Plus,
  Play,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Boxes,
  Printer,
  MapPin,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { pickLocalizedText, runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { ManufacturingOrder } from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { ManufacturingOrderModal } from './ManufacturingOrderModal';
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
  KineticSlideOverInspector,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticEmptyStateMotion,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const ManufacturingOrdersView: React.FC<any> = () => {
  const { language, currentBranch, branches, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { orders, boms, addOrder, updateOrder, deleteOrder, updateOrderStatus } = useManufacturingData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [stationFilter, setStationFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['of_01']));
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<ManufacturingOrder | null>(null);
  const [orderForFiche, setOrderForFiche] = useState<ManufacturingOrder | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [selectedOrder, orders]);

  const bomMap = useMemo(() => {
    const map = new Map<string, (typeof boms)[number]>();
    boms.forEach((b) => map.set(b.id, b));
    return map;
  }, [boms]);

  const activeInProduction = useMemo(() => orders.filter((o) => o.status === 'InProduction').length, [orders]);
  const completedCount = useMemo(() => orders.filter((o) => o.status === 'Completed').length, [orders]);
  const plannedCount = useMemo(() => orders.filter((o) => o.status === 'Planned').length, [orders]);
  const totalValueInWork = useMemo(() => orders.reduce((acc, o) => acc + (o.totalCostDzd || 0), 0), [orders]);

  const stationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => {
      const s = o.assignedStation || 'Non assigné';
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return [
      { value: 'All', label: isAr ? 'الكل' : 'Tous', count: orders.length },
      ...Array.from(counts.entries()).map(([value, count]) => ({ value, label: value, count })),
    ];
  }, [orders, isAr]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const b = resolveRecordBranch(o, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [orders, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: orders.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || orders.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, orders.length, isAr, isEn]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== 'All' && o.status !== filterStatus) return false;
      if (stationFilter !== 'All' && (o.assignedStation || 'Non assigné') !== stationFilter) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(o, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(o, branchesById, currentBranch, language);
        const matches =
          o.orderNumber.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          (o.batchLotNumber ? o.batchLotNumber.toLowerCase().includes(q) : false) ||
          (o.clientName ? o.clientName.toLowerCase().includes(q) : false) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, filterStatus, stationFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
      else if (sortBy === 'product') cmp = a.productName.localeCompare(b.productName);
      else if (sortBy === 'cost') cmp = a.totalCostDzd - b.totalCostDzd;
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredOrders, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenAdd = useCallback(() => {
    setOrderToEdit(null);
    setIsOrderModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((o: ManufacturingOrder) => {
    setOrderToEdit(o);
    setIsOrderModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (o: ManufacturingOrder) => {
      deleteOrder(o.id);
      if (selectedOrder?.id === o.id) setSelectedOrder(null);
    },
    [deleteOrder, selectedOrder?.id]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      const count = ids.size;
      runUndoBatch(
        {
          operationType: 'bulk',
          vertical: 'manufacturing_production',
          affectedCount: count,
          summary: pickLocalizedText(language, {
            fr: `${count} ordres de fabrication supprimés`,
            en: `${count} manufacturing orders deleted`,
            ar: `تم حذف ${count} أوامر تصنيع`,
          }),
          toastTitle: pickLocalizedText(language, {
            fr: 'Ordres de Fabrication',
            en: 'Manufacturing Orders',
            ar: 'أوامر التصنيع',
          }),
        },
        () => {
          ids.forEach((id) => deleteOrder(id));
        }
      );
      if (selectedOrder && ids.has(selectedOrder.id)) setSelectedOrder(null);
      setSelectedIds(new Set());
    },
    [deleteOrder, selectedOrder, language]
  );

  const handleTogglePin = useCallback((o: ManufacturingOrder) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(o.id)) next.delete(o.id);
      else next.add(o.id);
      return next;
    });
  }, []);

  const handleSelectOrder = useCallback((o: ManufacturingOrder, openerEl?: HTMLElement | null) => {
    setSelectedOrder(o);
    setDrawerOpenerEl(openerEl || null);
    setActiveTab('details');
    setInspectorNotes(
      o.notes || `Ordre de fabrication ${o.orderNumber}. Lancement atelier validé. Contrôle qualité en fin de cycle.`
    );
    setNoteSaved(false);
  }, []);

  const handleAdvanceStatus = useCallback(
    (o: ManufacturingOrder) => {
      const nextStatus: ManufacturingOrder['status'] =
        o.status === 'Planned' ? 'InProduction' : o.status === 'InProduction' ? 'Completed' : 'Planned';
      updateOrderStatus(o.id, nextStatus);
      if (selectedOrder?.id === o.id) {
        setSelectedOrder({ ...selectedOrder, status: nextStatus });
      }
    },
    [updateOrderStatus, selectedOrder]
  );

  const handleSaveNotes = () => {
    if (!activeOrder) return;
    const updated: ManufacturingOrder = { ...activeOrder, notes: inspectorNotes };
    updateOrder(updated);
    setSelectedOrder(updated);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Order Number',
      'Product',
      'BOM ID',
      'Branche',
      'Target Qty',
      'Produced Qty',
      'Lot Number',
      'Status',
      'Due Date',
      'Total Cost (DZD)',
    ];
    const rows = sortedOrders.map((o) => {
      const b = resolveRecordBranch(o, branchesById, currentBranch, language);
      return [
        o.orderNumber,
        o.productName,
        o.bomId || '',
        b.name,
        o.targetQuantity || o.quantityOrdered || 0,
        o.actualQuantityProduced || o.quantityProduced || 0,
        o.batchLotNumber || '',
        o.status,
        o.dueDate || '',
        o.totalCostDzd,
      ];
    });
    downloadCsvSafe(`manufacturing_orders_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير أوامر التصنيع' : 'Export des ordres de fabrication terminé', 'info');
  }, [sortedOrders, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (stationFilter !== 'All') c++;
    if (branchFilter !== 'All') c++;
    return c;
  }, [stationFilter, branchFilter]);

  const hasAnyFilters =
    filterStatus !== 'All' || stationFilter !== 'All' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('All');
    setStationFilter('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterStatus !== 'All') {
      chips.push({ key: 'status', label: filterStatus, onRemove: () => setFilterStatus('All') });
    }
    if (stationFilter !== 'All') {
      chips.push({ key: 'station', label: stationFilter, onRemove: () => setStationFilter('All') });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [filterStatus, stationFilter, branchFilter, branchOptions]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'station',
        label: isAr ? 'محطة التشغيل' : isEn ? 'Workstation' : 'Poste / Ligne Atelier',
        value: stationFilter,
        onChange: setStationFilter,
        kind: 'tiles',
        columns: 2,
        options: stationOptions,
      },
      {
        id: 'branch',
        label: isAr ? 'المصنع / الفرع' : isEn ? 'Branch' : 'Unité / Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ],
    [stationFilter, branchFilter, stationOptions, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<ManufacturingOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: isAr ? 'رقم الأمر / المنتج' : 'N° OF & Produit Fini',
        width: '3.0*',
        sortable: true,
        renderCell: (o) => {
          const isPinned = pinnedIds.has(o.id);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold t-small flex items-center justify-center shrink-0">
                <Factory size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="t-small font-semibold text-black dark:text-white truncate">{o.productName}</span>
                  {isPinned && <span className="t-small text-amber-500 font-semibold">📌 VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 t-cap text-black/55 dark:text-white/55 tabular-nums">
                  <span className="font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{o.orderNumber}</span>
                  <span>·</span>
                  <span>{o.batchLotNumber || 'LOT-2026'}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'quantities',
        header: isAr ? 'الكمية المستهدفة / المنجزة' : 'Quantités (Cible / Fait)',
        width: '2.2*',
        renderCell: (o) => {
          const target = o.targetQuantity || o.quantityOrdered || 1;
          const done = o.actualQuantityProduced || o.quantityProduced || 0;
          const pct = Math.min(100, Math.round((done / target) * 100));
          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between t-small tabular-nums font-semibold text-black dark:text-white">
                <span>
                  {done} / {target} u
                </span>
                <span className="t-cap text-black/55 dark:text-white/55">{pct}%</span>
              </div>
              <div className="w-full bg-[#E8E2DA] dark:bg-[#2B2825] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#d4522f] h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'المصنع' : isEn ? 'Branch' : 'Unité',
        width: '1.8*',
        sortable: true,
        renderCell: (o) => {
          const b = resolveRecordBranch(o, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'cost',
        header: isAr ? 'التكلفة الإجمالية' : 'Valorisation Totale',
        width: '2.0*',
        sortable: true,
        renderCell: (o) => (
          <div>
            <span className="t-small tabular-nums font-semibold text-black dark:text-white">{formatMoney(o.totalCostDzd, language)}</span>
            <div className="t-cap text-black/55 dark:text-white/55">{isAr ? 'مواد + عمالة' : 'Matières + MO'}</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut Atelier',
        width: '1.8*',
        renderCell: (o) => {
          const isDone = o.status === 'Completed';
          const isProg = o.status === 'InProduction';
          return (
            <div className="text-center">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full t-small font-semibold ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : isProg
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                    : 'bg-[#F3EDE7] dark:bg-[#2B2825] text-black/70 dark:text-white/75'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDone ? 'bg-emerald-500' : isProg ? 'bg-amber-500 animate-[live-heartbeat_1.2s_infinite]' : 'bg-neutral-400'
                  }`}
                />
                {isDone ? (isAr ? 'مكتمل' : 'Terminé') : isProg ? (isAr ? 'قيد التصنيع' : 'En Cours') : isAr ? 'مخطط' : 'Planifié'}
              </span>
            </div>
          );
        },
      },
    ],
    [pinnedIds, branchesById, currentBranch, language, isAr, isEn]
  );

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
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  const activeBranchInfo = activeOrder ? resolveRecordBranch(activeOrder, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Factory size={22} />}
        title={isAr ? 'التصنيع' : isEn ? 'Orders' : 'Production'}
        subtitle={
          isAr
            ? `${orders.length} أمر تصنيع · ${activeInProduction} قيد التشغيل`
            : `${orders.length} OF lancés · ${activeInProduction} en cours atelier`
        }
        primaryAction={{
          label: isAr ? 'أمر تصنيع جديد' : 'Nouvel OF',
          onClick: handleOpenAdd,
          icon: <Plus size={16} strokeWidth={2.2} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات خطوط الإنتاج والورشة' : 'Indicateurs de Cadence & Encours Atelier'}
        language={language}
        primaryCard={{
          label: isAr ? 'أوامر تصنيع قيد الإنجاز' : 'Ordres en Cours Atelier',
          badgeText: isAr ? 'دفعات نشطة' : 'Production active',
          count: activeInProduction,
          tone: 'terracotta',
          isActive: filterStatus === 'InProduction',
          onToggle: () => setFilterStatus((prev) => (prev === 'InProduction' ? 'All' : 'InProduction')),
        }}
        secondaryCard={{
          label: isAr ? 'أوامر مكتملة ومعتمدة' : 'Ordres Terminés',
          badgeText: isAr ? 'جاهز للتسليم' : 'Lots finalisés',
          count: completedCount,
          tone: 'emerald',
          isActive: filterStatus === 'Completed',
          onToggle: () => setFilterStatus((prev) => (prev === 'Completed' ? 'All' : 'Completed')),
        }}
        darkCard={{
          label: isAr ? 'قيمة الإنتاج الإجمالية (ISO 9001)' : 'Encours Valorisé & Traçabilité',
          badgeCount: orders.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'أمر' : 'OF',
          valueCount: Math.round(totalValueInWork),
          valuePrefix: '',
          valueSuffix: ' DA',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? 'تتبع الأرقام التسلسلية والدفعات 100%' : 'N° de lots et traçabilité amont/aval',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'دليل أوامر التصنيع' : 'Ordres de Fabrication'}
          liveRegionText={`${sortedOrders.length} ${isAr ? 'أمر' : 'OF'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث بالرقم أو المنتج أو رقم الدفعة...' : 'Recherche OF, produit, lot...'}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: orders.length },
            { value: 'InProduction', label: isAr ? 'جاري' : isEn ? 'Active' : 'En cours', count: activeInProduction },
            { value: 'Planned', label: isAr ? 'مخطط' : isEn ? 'Planned' : 'Planifiés', count: plannedCount },
            { value: 'Completed', label: isAr ? 'مكتمل' : isEn ? 'Done' : 'Terminés', count: completedCount },
          ]}
          statusValue={filterStatus}
          onStatusChange={setFilterStatus}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection
          hideToolbar
          data={sortedOrders}
          keyExtractor={(o) => o.id}
          defaultViewMode={viewMode}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={handleBulkDelete}
          isPinned={(o) => pinnedIds.has(o.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeOrder?.id}
          onItemClick={handleSelectOrder}
          onViewDetails={handleSelectOrder}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          getRowMeta={(o): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(o, branchesById, currentBranch, language);
            const target = o.targetQuantity || o.quantityOrdered || 1;
            const done = o.actualQuantityProduced || o.quantityProduced || 0;
            const isDone = o.status === 'Completed';
            const isRunning = o.status === 'InProduction';
            return {
              title: o.productName,
              subline: `${o.orderNumber} · ${o.assignedStation || 'Atelier'}`,
              avatarText: (o.orderNumber || 'OF').slice(0, 3).toUpperCase(),
              avatarColor: isDone ? '#059669' : isRunning ? '#d4522f' : '#64748B',
              categoryLabel: o.assignedStation || (isAr ? 'ورشة' : 'Atelier'),
              statusLabel: isDone ? (isAr ? 'مكتمل' : 'Terminé') : isRunning ? (isAr ? 'قيد التصنيع' : 'En Cours') : isAr ? 'مخطط' : 'Planifié',
              statusVariant: isDone ? 'active' : isRunning ? 'warning' : 'info',
              metricPrimary: formatMoney(o.totalCostDzd, language),
              metricSecondary: `${done} / ${target} u`,
              branchName: bInfo.name,
              branchCode: bInfo.code,
              isPinned: pinnedIds.has(o.id),
              detailCol1: {
                heading: isAr ? 'أمر التصنيع والمنتج' : isEn ? 'Order & Product' : 'OF & Produit',
                primaryText: `${o.orderNumber} · ${o.productName}`,
                secondaryText: `Lot: ${o.batchLotNumber || 'STD'}`,
                tertiaryText: bInfo.name,
              },
              detailCol2: {
                heading: isAr ? 'التقدم والمحطة' : isEn ? 'Progress & Station' : 'Cadence & Poste',
                primaryText: `${done} / ${target} ${isAr ? 'وحدة' : 'unités'}`,
                secondaryText: o.assignedStation || 'Atelier Central',
                tertiaryText: o.dueDate ? `Éch: ${o.dueDate}` : undefined,
              },
              detailCol3: {
                heading: isAr ? 'التكلفة الإجمالية' : isEn ? 'Total Cost' : 'Coût Production',
                primaryText: formatMoney(o.totalCostDzd, language),
                secondaryText: o.bomId ? (bomMap.get(o.bomId)?.bomCode || 'BOM') : 'Standard',
              },
            };
          }}
          getFanActions={(o): KineticRowFanAction[] => [
            {
              id: 'advance',
              label: isAr ? 'تقديم الحالة' : isEn ? 'Advance' : 'Avancer',
              icon: <Play className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                e.stopPropagation();
                handleAdvanceStatus(o);
              },
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
              icon: <Edit className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                e.stopPropagation();
                handleOpenEdit(o);
              },
            },
            {
              id: 'del',
              label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
              icon: <Trash2 className="w-[15px] h-[15px]" />,
              isDanger: true,
              onClick: (e) => {
                e.stopPropagation();
                handleDelete(o);
              },
            },
          ]}
          getDetailActions={(o): KineticDetailAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'فتح الأمر' : isEn ? 'Open' : 'Fiche OF',
              icon: <Eye className="w-3.5 h-3.5" />,
              onClick: () => handleSelectOrder(o),
            },
            {
              id: 'advance',
              label: isAr ? 'تقديم الحالة' : isEn ? 'Advance' : 'Avancer Étape',
              icon: <Play className="w-3.5 h-3.5" />,
              onClick: () => handleAdvanceStatus(o),
            },
            {
              id: 'print',
              label: isAr ? 'بطاقة التتبع' : 'Fiche Suiveuse',
              icon: <Printer className="w-3.5 h-3.5" />,
              onClick: () => setOrderForFiche(o),
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
              icon: <Edit className="w-3.5 h-3.5" />,
              onClick: () => handleOpenEdit(o),
            },
            {
              id: 'del',
              label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
              icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
              onClick: () => handleDelete(o),
            },
          ]}
          customActions={(o) => [
            {
              id: 'print',
              label: isAr ? 'بطاقة التتبع' : 'Fiche Suiveuse',
              tooltip: isAr ? 'طباعة بطاقة تتبع الورشة' : 'Imprimer la Fiche Suiveuse Atelier',
              icon: <Printer size={13} />,
              variant: 'outline',
              onClick: () => setOrderForFiche(o),
            },
            {
              id: 'advance',
              label: isAr ? 'تقديم الحالة' : 'Avancer Étape',
              tooltip: isAr ? 'تقديم حالة التصنيع' : "Passer à l'étape suivante",
              icon: <Play size={13} />,
              variant: 'primary',
              onClick: () => handleAdvanceStatus(o),
            },
          ]}
          renderCard={(o) => {
            const isPinned = pinnedIds.has(o.id);
            const isDone = o.status === 'Completed';
            const target = o.targetQuantity || o.quantityOrdered || 1;
            const done = o.actualQuantityProduced || o.quantityProduced || 0;
            return (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center t-dialog font-semibold mb-3 select-none tabular-nums">
                  <Factory size={32} />
                </div>
                <div className="flex items-center gap-2 max-w-[210px] mb-0.5">
                  <h3 className="t-card font-semibold text-black dark:text-white truncate">{o.productName}</h3>
                  {isPinned && <span className="t-cap text-amber-500">📌</span>}
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full t-small tabular-nums font-semibold bg-[#F3EDE7] dark:bg-[#2B2825] text-black/70 dark:text-white/75 mb-3">
                  {o.orderNumber}
                </span>
                <div className="w-full pt-3 border-t border-[var(--atr-divider)] t-cap space-y-1 text-center">
                  <div className="text-black dark:text-white tabular-nums font-semibold t-label">{formatMoney(o.totalCostDzd, language)}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--atr-divider)] t-cap">
                    <span className="text-black/55 dark:text-white/55 tabular-nums">
                      {done} / {target} unités
                    </span>
                    {isDone ? (
                      <span className="text-emerald-600 font-semibold">{isAr ? 'مكتمل' : 'Terminé'}</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">{isAr ? 'قيد التصنيع' : 'En Cours'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
          emptyTitle={isAr ? 'لا توجد أوامر تصنيع مطابقة' : 'Aucun ordre de fabrication'}
          emptyDescription={
            isAr
              ? 'أطلق أول أمر تصنيع أو أعد ضبط معايير البحث'
              : 'Lancez un premier ordre de fabrication ou modifiez vos filtres de recherche'
          }
          primaryActionLabel={isAr ? 'أمر جديد' : 'Nouvel OF'}
          onAddFirstItem={handleOpenAdd}
          onResetFilters={resetAllFilters}
          hasActiveFilters={hasAnyFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedOrders.length}
        entityPluralLabel={isAr ? 'أمر تصنيع' : isEn ? 'orders' : 'OF'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setStationFilter('All');
          setBranchFilter('All');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeOrder)}
        item={activeOrder}
        allItems={sortedOrders}
        keyExtractor={(o) => o.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeOrder?.orderNumber || ''}
        subtitle={activeOrder?.productName || ''}
        avatarText="OF"
        branchName={activeBranchInfo?.name}
        statusLabel={
          activeOrder?.status === 'Completed'
            ? isAr ? 'مكتمل' : 'Terminé'
            : activeOrder?.status === 'InProduction'
            ? isAr ? 'قيد التصنيع' : 'En Cours'
            : isAr ? 'مخطط' : 'Planifié'
        }
        statusClassName={
          activeOrder?.status === 'Completed'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            : activeOrder?.status === 'InProduction'
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
            : 'bg-[#F3EDE7] text-black/70 dark:bg-[#2B2825] dark:text-white/75'
        }
        tabs={[
          { id: 'details', label: isAr ? 'أمر التصنيع' : 'Ordre' },
          { id: 'costing', label: isAr ? 'التكاليف' : 'Coûts' },
          { id: 'bom', label: isAr ? 'التركيبة BOM' : 'BOM' },
          { id: 'notes', label: isAr ? 'الورشة' : 'Atelier' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(o) => handleSelectOrder(o)}
        onClose={() => setSelectedOrder(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(ord, tab) => (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Play size={13} />}
                onClick={() => handleAdvanceStatus(ord)}
              >
                {isAr ? 'تقديم الخطوة' : 'Avancer Étape'}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                icon={<Printer size={13} />}
                onClick={() => setOrderForFiche(ord)}
              >
                {isAr ? 'بطاقة التتبع' : 'Fiche Suiveuse'}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                icon={<Edit size={13} />}
                onClick={() => handleOpenEdit(ord)}
              >
                {isAr ? 'تعديل' : 'Modifier'}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="ghost"
                size="sm"
                icon={<Pin size={13} />}
                onClick={() => handleTogglePin(ord)}
              >
                {pinnedIds.has(ord.id) ? (isAr ? 'مثبت' : 'Épinglé') : isAr ? 'تثبيت' : 'Épingler'}
              </AtriumButton>
            </div>

            {tab === 'details' && (
              <div className="space-y-3 t-cap">
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2">
                  <div className="t-small font-semibold text-black/55 dark:text-white/55">
                    {isAr ? 'معلومات الدفعة' : 'Paramètres de Fabrication'}
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'المنتج النهائي' : 'Produit fini'}</span>
                    <span className="font-semibold text-black dark:text-white text-right max-w-[210px] truncate">{ord.productName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'رقم الدفعة' : 'N° de Lot (Batch)'}</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">{ord.batchLotNumber || 'LOT-2026-05'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'الكمية المستهدفة' : 'Quantité cible'}</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">
                      {ord.targetQuantity || ord.quantityOrdered || 1} unités
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'الكمية المنتجة' : 'Quantité produite'}</span>
                    <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                      {ord.actualQuantityProduced || ord.quantityProduced || 0} unités
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'محطة التشغيل' : 'Poste assigné'}</span>
                    <span className="font-semibold text-black dark:text-white">{ord.assignedStation || 'Ligne Principale'}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'costing' && (
              <div className="space-y-3 t-cap">
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2">
                  <div className="t-small font-semibold text-black/55 dark:text-white/55">
                    {isAr ? 'تفكيك التكاليف الصناعية' : 'Décomposition Coût de Revient'}
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'المواد الأولية' : 'Matières premières'}</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">
                      {formatMoney(ord.totalMaterialCostDzd || 0, language)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'اليد العاملة المباشرة' : "Main d'œuvre atelier"}</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">
                      {formatMoney(ord.totalLaborCostDzd || 0, language)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 font-semibold text-black dark:text-white t-label">
                    <span>{isAr ? 'التكلفة الإجمالية' : 'Coût Total de Fabrication'}</span>
                    <span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(ord.totalCostDzd, language)}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'bom' && (
              <div className="space-y-2 t-cap">
                {ord.bomId && bomMap.has(ord.bomId) ? (
                  (() => {
                    const b = bomMap.get(ord.bomId)!;
                    return (
                      <div className="space-y-2">
                        <div data-sq="ctl" data-sq-border="none" className="p-3 bg-[#F3EDE7] dark:bg-[#2B2825] font-semibold text-black dark:text-white flex items-center justify-between">
                          <span>{b.bomCode}</span>
                          <span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(b.estimatedCostDzd, language)} / u</span>
                        </div>
                        <div className="space-y-2">
                          {b.components.map((c, i) => (
                            <div
                              key={i}
                              data-sq="ctl"
                              data-sq-border="none"
                              className="p-2 bg-[#F5F1EC] dark:bg-[#22201E] flex items-center justify-between"
                            >
                              <span className="text-black/70 dark:text-white/75 truncate max-w-[190px]">{c.rawProductName}</span>
                              <span className="tabular-nums text-black/55 dark:text-white/55">
                                {c.quantity} {c.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <KineticEmptyStateMotion motionKey={`mfg-bom-${ord.id}`}>
                    <EmptyState
                      variant="compact"
                      icon={<Boxes />}
                      title={isAr ? 'لا توجد تركيبة مرتبطة' : 'Aucune nomenclature liée.'}
                    />
                  </KineticEmptyStateMotion>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 t-cap">
                <label className="block t-small font-semibold text-black/55 dark:text-white/55">
                  {isAr ? 'ملاحظات وتوجيهات الورشة' : "Consignes d'Atelier & Rebuts"}
                </label>
                <div data-sq="ctl" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow">
                  <textarea
                    value={inspectorNotes}
                    onChange={(e) => setInspectorNotes(e.target.value)}
                    rows={8}
                    placeholder={isAr ? 'أدخل ملاحظات الورشة...' : 'Tolérances dimensionnelles, cadence, rebus observés...'}
                    className="lbi-field w-full p-3 bg-transparent border-0 text-black dark:text-white t-cap outline-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="t-cap text-black/55 dark:text-white/55">
                    {noteSaved && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={12} /> {isAr ? 'تم الحفظ' : 'Enregistré'}
                      </span>
                    )}
                  </span>
                  <AtriumButton type="button" variant="primary" size="sm" icon={<Save size={13} />} onClick={handleSaveNotes}>
                    <span>{isAr ? 'حفظ الملاحظات' : 'Enregistrer'}</span>
                  </AtriumButton>
                </div>
              </div>
            )}
          </div>
        )}
      />

      {isOrderModalOpen && (
        <ManufacturingOrderModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setOrderToEdit(null);
          }}
          boms={boms}
          orderToEdit={orderToEdit}
          onSave={(o) => {
            if (orderToEdit) {
              updateOrder(o);
              if (selectedOrder?.id === o.id) setSelectedOrder(o);
            } else {
              addOrder(o);
            }
            setIsOrderModalOpen(false);
            setOrderToEdit(null);
          }}
        />
      )}

      {orderForFiche && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sq-elev-pop max-w-2xl w-full animate-in zoom-in-95 duration-150">
            <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 sm:p-8 [--sq-stroke:var(--sq-stroke-pop)] space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)]">
                <div className="flex items-center gap-3">
                  <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold t-card text-black dark:text-white">
                      {isAr ? 'بطاقة التتبع المرافقة للورشة (Fiche Suiveuse)' : "Fiche Suiveuse d'Atelier & Ordre de Travail"}
                    </h3>
                    <p className="t-cap text-black/55 dark:text-white/55">
                      Document officiel d'atelier • Traçabilité Décret 05-468 & ISO 9001
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl"
                    data-sq-border="none"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[var(--brand-fill,#C9461F)] hover:bg-[#b03b1b] text-white t-small font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer size={14} />
                    <span>{isAr ? 'طباعة' : 'Imprimer'}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={isAr ? 'إغلاق' : 'Fermer'}
                    onClick={() => setOrderForFiche(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="printable-document p-6 rounded-[var(--r-card,16px)] bg-white border-2 border-dashed border-black/[0.18] text-black space-y-5 shadow-xs font-sans">
                <div className="flex justify-between items-start border-b border-black/[0.12] pb-4">
                  <div>
                    <div className="font-semibold t-pod text-black">ATRIUM MANUFACTURE & ATELIER PME</div>
                    <div className="t-small text-black/55 font-medium">
                      Zone Industrielle Oued Smar, Alger • NIF: 001916010044589 • RC: 16/00-0988421
                    </div>
                    <div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] mt-1">
                      FICHE SUIVEUSE DE PRODUCTION • ORDRE DE FABRICATION
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums font-semibold t-dialog text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{orderForFiche.orderNumber}</div>
                    <div className="tabular-nums t-small font-semibold text-black/75 mt-0.5">
                      {orderForFiche.batchLotNumber || 'LOT-202610-0089'}
                    </div>
                    <div className="tabular-nums t-cap text-black/55 mt-1">|||||||||||||||||||||||||||||||</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-[var(--r-ctl,12px)] t-cap border border-black/[0.12]">
                  <div>
                    <span className="text-black/55 block t-small font-semibold">Produit Fini</span>
                    <span className="font-semibold text-black">{orderForFiche.productName}</span>
                  </div>
                  <div>
                    <span className="text-black/55 block t-small font-semibold">Quantité Cible</span>
                    <span className="tabular-nums font-semibold text-black">{orderForFiche.targetQuantity} unités</span>
                  </div>
                  <div>
                    <span className="text-black/55 block t-small font-semibold">Poste / Ligne</span>
                    <span className="font-semibold text-black">{orderForFiche.assignedStation || 'Poste 03 CNC'}</span>
                  </div>
                  <div>
                    <span className="text-black/55 block t-small font-semibold">Échéance</span>
                    <span className="tabular-nums font-semibold text-black">{orderForFiche.dueDate?.split('T')[0] || '2026-06-15'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="t-small font-semibold text-black">
                    Gamme Opératoire & Visas de Validation Postes
                  </div>
                  <table className="w-full t-cap border border-black/[0.12] rounded-[var(--r-ctl-sm,10px)] overflow-hidden">
                  <thead className="bg-neutral-100 text-black/75 font-semibold border-b border-black/[0.12]">
                    <tr>
                      <th className="p-2 text-left w-12">Op.</th>
                      <th className="p-2 text-left">Poste de Travail / Opération</th>
                      <th className="p-2 text-center w-24">Cadence</th>
                      <th className="p-2 text-center w-28">Visa Opérateur</th>
                      <th className="p-2 text-center w-28">Visa Contrôle CQ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.10]">
                    <tr>
                      <td className="p-2 tabular-nums font-semibold text-center">010</td>
                      <td className="p-2">Découpe, Dégauchissage & Calibrage brut</td>
                      <td className="p-2 tabular-nums text-center">45 min</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 tabular-nums font-semibold text-center">020</td>
                      <td className="p-2">Usinage commande numérique & Perçage CNC</td>
                      <td className="p-2 tabular-nums text-center">60 min</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 tabular-nums font-semibold text-center">030</td>
                      <td className="p-2">Assemblage mécanique & Pose quincaillerie</td>
                      <td className="p-2 tabular-nums text-center">40 min</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 tabular-nums font-semibold text-center">040</td>
                      <td className="p-2">Finition de surface & Contrôle dimensionnel final</td>
                      <td className="p-2 tabular-nums text-center">30 min</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                      <td className="p-2 border-l border-black/[0.12] text-center text-black/55 t-cap">[ ______ ]</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-neutral-100 rounded-[var(--r-ctl,12px)] t-cap text-black/75 flex items-center justify-between">
                <span>
                  ⚠️ <strong>Sécurité Loi 88-07 :</strong> Port des EPI (lunettes, gants, chaussures) obligatoire sur toute la phase.
                </span>
                <span className="tabular-nums font-semibold text-black">{'Tolérance Rebut : < 3%'}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center t-cap">
                <div>
                  <span className="text-black/55 t-cap block">Chef d'Atelier (Lancement)</span>
                  <div className="h-10 flex items-center justify-center text-black/75 italic">M. Brahim M.</div>
                </div>
                <div>
                  <span className="text-black/55 t-cap block">Magasinier (Sortie BSM)</span>
                  <div className="h-10 flex items-center justify-center text-black/75 italic">M. Amine T.</div>
                </div>
                <div>
                  <span className="text-black/55 t-cap block">Responsable Qualité (Quitus)</span>
                  <div className="h-10 flex items-center justify-center text-black/75 italic">Ing. S. Mokrani</div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
