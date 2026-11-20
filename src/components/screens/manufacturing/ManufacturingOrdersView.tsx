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
import { useAtriumStore, showToast } from '../../../services/store';
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
  const { language, currentBranch, branches, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
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
      showToast(isAr ? 'تم حذف أمر التصنيع' : 'Ordre de fabrication supprimé', 'success');
    },
    [deleteOrder, selectedOrder?.id, isAr]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      ids.forEach((id) => deleteOrder(id));
      if (selectedOrder && ids.has(selectedOrder.id)) setSelectedOrder(null);
      setSelectedIds(new Set());
      showToast(isAr ? 'تم حذف الأوامر المحددة' : 'Ordres de fabrication supprimés', 'success');
    },
    [deleteOrder, selectedOrder, isAr]
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
      showToast(isAr ? `تم تحديث حالة الأمر إلى ${nextStatus}` : `Statut mis à jour : ${nextStatus}`, 'info');
    },
    [updateOrderStatus, selectedOrder, isAr]
  );

  const handleSaveNotes = () => {
    if (!activeOrder) return;
    const updated: ManufacturingOrder = { ...activeOrder, notes: inspectorNotes };
    updateOrder(updated);
    setSelectedOrder(updated);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات الأمر' : 'Consignes de fabrication enregistrées', 'success');
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
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Factory size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-black dark:text-white truncate">{o.productName}</span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
                  <span className="font-bold text-[#d4522f]">{o.orderNumber}</span>
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
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-black dark:text-white">
                <span>
                  {done} / {target} u
                </span>
                <span className="text-[10px] text-black/55 dark:text-white/55">{pct}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
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
            <div className="text-xs font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-1.5">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
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
            <span className="text-xs font-mono font-bold text-black dark:text-white">{formatMoney(o.totalCostDzd, language)}</span>
            <div className="text-[10px] text-black/55 dark:text-white/55">{isAr ? 'مواد + عمالة' : 'Matières + MO'}</div>
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
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                    : isProg
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 border-neutral-200/60'
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
                <div className="w-20 h-20 rounded-full bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] flex items-center justify-center text-2xl font-bold shadow-xs mb-3 select-none border border-[#F5E2D8] dark:border-neutral-700 font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                  <Factory size={32} />
                </div>
                <div className="flex items-center gap-1.5 max-w-[210px] mb-0.5">
                  <h3 className="text-base font-bold text-black dark:text-white truncate tracking-tight">{o.productName}</h3>
                  {isPinned && <span className="text-xs text-amber-500">📌</span>}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 mb-3 border border-neutral-200 dark:border-neutral-700">
                  {o.orderNumber}
                </span>
                <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1 text-center">
                  <div className="text-black dark:text-white font-mono font-bold text-[13px]">{formatMoney(o.totalCostDzd, language)}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[10px]">
                    <span className="text-black/55 dark:text-white/55 font-mono">
                      {done} / {target} unités
                    </span>
                    {isDone ? (
                      <span className="text-emerald-600 font-bold">{isAr ? 'مكتمل' : 'Terminé'}</span>
                    ) : (
                      <span className="text-amber-600 font-bold">{isAr ? 'قيد التصنيع' : 'En Cours'}</span>
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
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
            : activeOrder?.status === 'InProduction'
            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
            : 'bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
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
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                    {isAr ? 'معلومات الدفعة' : 'Paramètres de Fabrication'}
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'المنتج النهائي' : 'Produit fini'}</span>
                    <span className="font-bold text-black dark:text-white text-right max-w-[210px] truncate">{ord.productName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'رقم الدفعة' : 'N° de Lot (Batch)'}</span>
                    <span className="font-mono font-semibold text-black dark:text-white">{ord.batchLotNumber || 'LOT-2026-05'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'الكمية المستهدفة' : 'Quantité cible'}</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {ord.targetQuantity || ord.quantityOrdered || 1} unités
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'الكمية المنتجة' : 'Quantité produite'}</span>
                    <span className="font-mono font-bold text-[#d4522f]">
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
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider">
                    {isAr ? 'تفكيك التكاليف الصناعية' : 'Décomposition Coût de Revient'}
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'المواد الأولية' : 'Matières premières'}</span>
                    <span className="font-mono font-semibold text-black dark:text-white">
                      {formatMoney(ord.totalMaterialCostDzd || 0, language)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-black/55 dark:text-white/55">{isAr ? 'اليد العاملة المباشرة' : "Main d'œuvre atelier"}</span>
                    <span className="font-mono font-semibold text-black dark:text-white">
                      {formatMoney(ord.totalLaborCostDzd || 0, language)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-black dark:text-white text-[13px]">
                    <span>{isAr ? 'التكلفة الإجمالية' : 'Coût Total de Fabrication'}</span>
                    <span className="font-mono text-[#d4522f]">{formatMoney(ord.totalCostDzd, language)}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'bom' && (
              <div className="space-y-2 text-xs">
                {ord.bomId && bomMap.has(ord.bomId) ? (
                  (() => {
                    const b = bomMap.get(ord.bomId)!;
                    return (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-bold text-black dark:text-white flex items-center justify-between">
                          <span>{b.bomCode}</span>
                          <span className="font-mono text-[#d4522f]">{formatMoney(b.estimatedCostDzd, language)} / u</span>
                        </div>
                        <div className="space-y-1.5">
                          {b.components.map((c, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between"
                            >
                              <span className="text-black/70 dark:text-white/75 truncate max-w-[190px]">{c.rawProductName}</span>
                              <span className="font-mono text-black/55 dark:text-white/55">
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
              <div className="space-y-3 text-xs">
                <label className="block text-[11px] font-bold text-black/55 dark:text-white/55 uppercase">
                  {isAr ? 'ملاحظات وتوجيهات الورشة' : "Consignes d'Atelier & Rebuts"}
                </label>
                <textarea
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  rows={8}
                  placeholder={isAr ? 'أدخل ملاحظات الورشة...' : 'Tolérances dimensionnelles, cadence, rebus observés...'}
                  className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-2 focus:ring-[#d4522f] outline-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-black/55 dark:text-white/55">
                    {noteSaved && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
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
              showToast(isAr ? 'تم تحديث أمر التصنيع' : 'Ordre de fabrication mis à jour', 'success');
            } else {
              addOrder(o);
              showToast(isAr ? 'تم إنشاء أمر التصنيع بنجاح' : 'Ordre de fabrication créé avec succès', 'success');
            }
            setIsOrderModalOpen(false);
            setOrderToEdit(null);
          }}
        />
      )}

      {orderForFiche && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">
                    {isAr ? 'بطاقة التتبع المرافقة للورشة (Fiche Suiveuse)' : "Fiche Suiveuse d'Atelier & Ordre de Travail"}
                  </h3>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    Document officiel d'atelier • Traçabilité Décret 05-468 & ISO 9001
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#d4522f] hover:bg-[#b03b1b] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Printer size={14} />
                  <span>{isAr ? 'طباعة' : 'Imprimer'}</span>
                </button>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setOrderForFiche(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-neutral-300 text-black space-y-5 shadow-xs font-sans">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <div className="font-black text-lg tracking-tight text-black">ATRIUM MANUFACTURE & ATELIER PME</div>
                  <div className="text-[11px] text-black/55 font-medium">
                    Zone Industrielle Oued Smar, Alger • NIF: 001916010044589 • RC: 16/00-0988421
                  </div>
                  <div className="text-xs font-bold text-[#d4522f] mt-1">
                    FICHE SUIVEUSE DE PRODUCTION • ORDRE DE FABRICATION
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-xl text-[#d4522f]">{orderForFiche.orderNumber}</div>
                  <div className="font-mono text-xs font-bold text-black/75 mt-0.5">
                    {orderForFiche.batchLotNumber || 'LOT-202610-0089'}
                  </div>
                  <div className="font-mono text-[10px] text-black/55 mt-1 tracking-widest">|||||||||||||||||||||||||||||||</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 rounded-xl text-xs border border-neutral-200">
                <div>
                  <span className="text-black/55 block text-[10px] uppercase font-bold">Produit Fini</span>
                  <span className="font-bold text-black">{orderForFiche.productName}</span>
                </div>
                <div>
                  <span className="text-black/55 block text-[10px] uppercase font-bold">Quantité Cible</span>
                  <span className="font-mono font-bold text-black">{orderForFiche.targetQuantity} unités</span>
                </div>
                <div>
                  <span className="text-black/55 block text-[10px] uppercase font-bold">Poste / Ligne</span>
                  <span className="font-semibold text-black">{orderForFiche.assignedStation || 'Poste 03 CNC'}</span>
                </div>
                <div>
                  <span className="text-black/55 block text-[10px] uppercase font-bold">Échéance</span>
                  <span className="font-mono font-semibold text-black">{orderForFiche.dueDate?.split('T')[0] || '2026-06-15'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-black uppercase tracking-wider">
                  Gamme Opératoire & Visas de Validation Postes
                </div>
                <table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
                  <thead className="bg-neutral-100 text-black/75 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="p-2 text-left w-12">Op.</th>
                      <th className="p-2 text-left">Poste de Travail / Opération</th>
                      <th className="p-2 text-center w-24">Cadence</th>
                      <th className="p-2 text-center w-28">Visa Opérateur</th>
                      <th className="p-2 text-center w-28">Visa Contrôle CQ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">010</td>
                      <td className="p-2">Découpe, Dégauchissage & Calibrage brut</td>
                      <td className="p-2 font-mono text-center">45 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">020</td>
                      <td className="p-2">Usinage commande numérique & Perçage CNC</td>
                      <td className="p-2 font-mono text-center">60 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">030</td>
                      <td className="p-2">Assemblage mécanique & Pose quincaillerie</td>
                      <td className="p-2 font-mono text-center">40 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-center">040</td>
                      <td className="p-2">Finition de surface & Contrôle dimensionnel final</td>
                      <td className="p-2 font-mono text-center">30 min</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                      <td className="p-2 border-l border-neutral-200 text-center text-black/55 text-[10px]">[ ______ ]</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-neutral-100 rounded-xl text-[11px] text-black/75 flex items-center justify-between">
                <span>
                  ⚠️ <strong>Sécurité Loi 88-07 :</strong> Port des EPI (lunettes, gants, chaussures) obligatoire sur toute la phase.
                </span>
                <span className="font-mono font-bold text-black">{'Tolérance Rebut : < 3%'}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center text-xs">
                <div>
                  <span className="text-black/55 text-[10px] block">Chef d'Atelier (Lancement)</span>
                  <div className="h-10 flex items-center justify-center font-serif text-black/75 italic">M. Brahim M.</div>
                </div>
                <div>
                  <span className="text-black/55 text-[10px] block">Magasinier (Sortie BSM)</span>
                  <div className="h-10 flex items-center justify-center font-serif text-black/75 italic">M. Amine T.</div>
                </div>
                <div>
                  <span className="text-black/55 text-[10px] block">Responsable Qualité (Quitus)</span>
                  <div className="h-10 flex items-center justify-center font-serif text-black/75 italic">Ing. S. Mokrani</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
