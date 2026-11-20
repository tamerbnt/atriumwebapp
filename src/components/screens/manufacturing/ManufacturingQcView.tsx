import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Printer,
  Check,
  X,
  MapPin,
  Eye,
  Pin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { ManufacturingOrder } from '../../../types';
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
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const ManufacturingQcView: React.FC<any> = () => {
  const { language, currentBranch, branches, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { orders, updateOrder } = useManufacturingData();

  const [searchQuery, setSearchQuery] = useState('');
  const [qcStatusFilter, setQcStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('orderNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleTogglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const nowPinned = !next.has(id);
        if (nowPinned) next.add(id);
        else next.delete(id);
        showToast(
          nowPinned
            ? isAr ? 'تم تثبيت الدفعة بالأعلى' : 'Lot épinglé en tête de contrôle'
            : isAr ? 'تم إلغاء تثبيت الدفعة' : 'Lot désépinglé',
          'info'
        );
        return next;
      });
    },
    [isAr]
  );

  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('cq');
  const [orderForCertificate, setOrderForCertificate] = useState<ManufacturingOrder | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [selectedOrder, orders]);

  const releasedCount = useMemo(() => orders.filter((o) => o.status === 'Completed').length, [orders]);
  const pendingCount = useMemo(() => orders.filter((o) => o.status !== 'Completed').length, [orders]);

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
      if (qcStatusFilter === 'libere' && o.status !== 'Completed') return false;
      if (qcStatusFilter === 'quarantaine' && o.status === 'Completed') return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(o, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(o, branchesById, currentBranch, language);
        const matches =
          o.productName.toLowerCase().includes(q) ||
          o.orderNumber.toLowerCase().includes(q) ||
          (o.batchLotNumber || '').toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, qcStatusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
      else if (sortBy === 'qty') cmp = (a.actualQuantityProduced || a.targetQuantity) - (b.actualQuantityProduced || b.targetQuantity);
      else if (sortBy === 'unitCost') {
        const ua = a.totalCostDzd / (a.actualQuantityProduced || a.targetQuantity || 1);
        const ub = b.totalCostDzd / (b.actualQuantityProduced || b.targetQuantity || 1);
        cmp = ua - ub;
      } else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredOrders, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleReleaseLot = useCallback(
    (order: ManufacturingOrder) => {
      const updated: ManufacturingOrder = { ...order, status: 'Completed' };
      updateOrder(updated);
      if (selectedOrder?.id === order.id) setSelectedOrder(updated);
      showToast(
        isAr
          ? `تم اعتماد وتحرير الدفعة ${order.orderNumber} كدفعة مطابقة للمواصفات ISO 9001`
          : `Lot ${order.orderNumber} libéré et certifié conforme ISO 9001`,
        'success'
      );
    },
    [updateOrder, selectedOrder?.id, isAr]
  );

  const handleSelectOrder = useCallback((order: ManufacturingOrder, openerEl?: HTMLElement | null) => {
    setSelectedOrder(order);
    setDrawerOpenerEl(openerEl || null);
    setInspectorTab('cq');
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = ['N° OF', 'Article Fabriqué', 'Lot', 'Branche', 'Quantité', 'Coût Unitaire (DZD)', 'Décision CQ'];
    const rows = sortedOrders.map((o) => {
      const qty = o.actualQuantityProduced || o.targetQuantity || 1;
      const b = resolveRecordBranch(o, branchesById, currentBranch, language);
      return [
        o.orderNumber,
        o.productName,
        o.batchLotNumber || 'LOT-2026-STD',
        b.name,
        qty,
        Math.round(o.totalCostDzd / qty),
        o.status === 'Completed' ? 'Libéré Conforme' : 'En Contrôle',
      ];
    });
    downloadCsvSafe(`manufacturing_qc_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير سجل مراقبة الجودة' : 'Export QC terminé', 'info');
  }, [sortedOrders, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = branchFilter !== 'All' ? 1 : 0;
  const hasAnyFilters = qcStatusFilter !== 'All' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setQcStatusFilter('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (qcStatusFilter !== 'All') {
      chips.push({
        key: 'qcStatus',
        label: qcStatusFilter === 'libere' ? (isAr ? 'دفعات مطابقة' : 'Lots libérés') : isAr ? 'قيد الفحص' : 'En contrôle',
        onRemove: () => setQcStatusFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [qcStatusFilter, branchFilter, branchOptions, isAr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'qcStatus',
        label: isAr ? 'حالة الفحص والاعتماد' : 'Décision Contrôle Qualité',
        value: qcStatusFilter,
        onChange: setQcStatusFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: orders.length },
          { value: 'libere', label: isAr ? 'معتمد' : 'Libérés', count: releasedCount },
          { value: 'quarantaine', label: isAr ? 'قيد الفحص' : 'En contrôle', count: pendingCount },
        ],
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
    [qcStatusFilter, branchFilter, orders.length, releasedCount, pendingCount, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<ManufacturingOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: isAr ? 'رقم OF' : 'N° OF',
        width: '1.4*',
        sortable: true,
        renderCell: (o) => (
          <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded border border-[#d4522f]/20">
            {o.orderNumber}
          </span>
        ),
      },
      {
        key: 'product',
        header: isAr ? 'المنتج & الدفعة' : 'Article Fabriqué & Lot',
        width: '2.8*',
        renderCell: (o) => (
          <div className="min-w-0">
            <span className="font-bold text-xs text-black dark:text-white block truncate">{o.productName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
              Lot: {o.batchLotNumber || 'LOT-2026-STD'}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'المصنع' : isEn ? 'Branch' : 'Unité',
        width: '1.6*',
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
        key: 'qty',
        header: isAr ? 'الكمية' : 'Quantité',
        width: '1.1*',
        sortable: true,
        renderCell: (o) => (
          <span className="font-mono text-xs font-bold text-black dark:text-white">
            {o.actualQuantityProduced || o.targetQuantity} pcs
          </span>
        ),
      },
      {
        key: 'unitCost',
        header: isAr ? 'تكلفة الوحدة' : 'Coût Unitaire',
        width: '1.4*',
        sortable: true,
        renderCell: (o) => {
          const qty = o.actualQuantityProduced || o.targetQuantity || 1;
          return <span className="font-mono text-xs font-bold text-black/70 dark:text-white/75">{formatMoney(Math.round(o.totalCostDzd / qty), language)}</span>;
        },
      },
      {
        key: 'status',
        header: isAr ? 'قرار CQ' : 'Décision CQ',
        width: '1.5*',
        renderCell: (o) => (
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
              o.status === 'Completed'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            <ShieldCheck size={11} />
            {o.status === 'Completed' ? (isAr ? 'مقبول ومعتمد' : 'Libéré Conforme') : isAr ? 'قيد الفحص' : 'En Contrôle'}
          </span>
        ),
      },
    ],
    [branchesById, currentBranch, language, isAr, isEn]
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
        hasActionBtn={false}
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
        icon={<ShieldCheck size={22} />}
        title={isAr ? 'الجودة' : isEn ? 'Quality' : 'Qualité'}
        subtitle={
          isAr
            ? `${orders.length} دفعة تحت الرقابة · Norme ISO 9001 & IANOR`
            : `${orders.length} lots inspectés · Norme ISO 9001:2015`
        }
        secondaryActions={
          <AtriumButton
            type="button"
            variant="outline"
            onClick={() => {
              showToast(isAr ? 'طباعة تقرير مراقبة الجودة' : 'Impression du rapport qualité', 'info');
              window.print();
            }}
            icon={<Printer size={14} />}
          >
            {isAr ? 'تقرير الجودة' : 'Rapport Qualité'}
          </AtriumButton>
        }
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات المطابقة ونسب الفاقد' : 'Indicateurs de Conformité & Maîtrise des Rebuts'}
        language={language}
        primaryCard={{
          label: isAr ? 'دفعات مطابقة ومحَرّرة' : 'Lots Libérés Conformes',
          badgeText: isAr ? 'مطابق ISO 9001' : 'AQL Validé',
          count: releasedCount,
          tone: 'emerald',
          isActive: qcStatusFilter === 'libere',
          onToggle: () => setQcStatusFilter((prev) => (prev === 'libere' ? 'All' : 'libere')),
        }}
        secondaryCard={{
          label: isAr ? 'دفعات قيد الفحص / الحجر' : 'Lots En Contrôle / Attente',
          badgeText: isAr ? 'فحص مخبري' : 'En contrôle',
          count: pendingCount,
          tone: 'terracotta',
          isActive: qcStatusFilter === 'quarantaine',
          onToggle: () => setQcStatusFilter((prev) => (prev === 'quarantaine' ? 'All' : 'quarantaine')),
        }}
        darkCard={{
          label: isAr ? 'معدل المطابقة ونسبة الفاقد (1.2%)' : 'Conformité & Libération Lots',
          badgeCount: orders.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'دفعة' : 'lots',
          valueCount: 98.8,
          valuePrefix: '',
          valueSuffix: '%',
          caption: isAr ? 'شهادات IANOR / ISO معتمدة 100%' : 'Taux de rebut < 2% (Seuil ISO)',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل الفحص المخبري ومراقبة الجودة (QC / ISO)' : 'Registre des Contrôles Qualité Libératoires (AQL)'}
          liveRegionText={`${sortedOrders.length} lots`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث بالمنتج أو رقم الدفعة...' : 'Rechercher OF, article, lot...'}
          statusOptions={[
            { value: 'All', label: isAr ? 'جميع الدفعات' : 'Tous', count: orders.length },
            { value: 'libere', label: isAr ? 'دفعات مطابقة' : 'Libérés', count: releasedCount },
            { value: 'quarantaine', label: isAr ? 'قيد الفحص' : 'En contrôle', count: pendingCount },
          ]}
          statusValue={qcStatusFilter}
          onStatusChange={setQcStatusFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
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
          openItemId={activeOrder?.id}
          onItemClick={handleSelectOrder}
          onViewDetails={handleSelectOrder}
          isPinned={(o) => pinnedIds.has(o.id)}
          onTogglePin={(o) => handleTogglePin(o.id)}
          getRowMeta={(o): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(o, branchesById, currentBranch, language);
            const qty = o.actualQuantityProduced || o.targetQuantity || 1;
            const unitCost = Math.round(o.totalCostDzd / qty);
            const isReleased = o.status === 'Completed';
            return {
              isPinned: pinnedIds.has(o.id),
              title: o.productName,
              subline: `${o.orderNumber} · Lot ${o.batchLotNumber || 'STD'}`,
              avatarText: 'CQ',
              avatarColor: isReleased ? '#059669' : '#D97706',
              categoryLabel: `Lot ${o.batchLotNumber || 'STD'}`,
              statusLabel: isReleased ? (isAr ? 'محرر مطابق' : 'Libéré ✓') : isAr ? 'قيد الفحص' : 'En contrôle',
              statusVariant: isReleased ? 'active' : 'warning',
              metricPrimary: formatMoney(unitCost, language),
              metricSecondary: `${qty} pcs · 98.8% AQL`,
              branchName: bInfo.name,
              branchCode: bInfo.code,
              detailCol1: {
                heading: isAr ? 'الدفعة والمنتج' : isEn ? 'Batch & Product' : 'Lot & Produit',
                primaryText: o.productName,
                secondaryText: `${o.orderNumber} · ${o.batchLotNumber || 'LOT-2026-STD'}`,
                tertiaryText: bInfo.name,
              },
              detailCol2: {
                heading: isAr ? 'معايير الفحص (AQL)' : isEn ? 'QC Inspection' : 'Contrôle Qualité',
                primaryText: isReleased ? (isAr ? 'مطابق ISO 9001' : 'Conforme ISO 9001') : isAr ? 'فحص مخبري جارٍ' : 'En quarantaine AQL',
                secondaryText: `${qty} ${isAr ? 'وحدة مفحوصة' : 'unités inspectées'}`,
              },
              detailCol3: {
                heading: isAr ? 'تكلفة الوحدة' : isEn ? 'Unit Cost' : 'Coût Unitaire',
                primaryText: formatMoney(unitCost, language),
                secondaryText: `${isAr ? 'الإجمالي:' : 'Lot:'} ${formatMoney(o.totalCostDzd, language)}`,
              },
            };
          }}
          getFanActions={(o): KineticRowFanAction[] => [
            {
              id: 'release',
              label: isAr ? 'تحرير' : 'Libérer',
              icon: <Check className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                e.stopPropagation();
                handleReleaseLot(o);
              },
            },
            {
              id: 'cert',
              label: isAr ? 'شهادة' : 'Certificat',
              icon: <Printer className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                e.stopPropagation();
                setOrderForCertificate(o);
              },
            },
            {
              id: 'inspect',
              label: isAr ? 'فحص' : 'Détails',
              icon: <Eye className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                e.stopPropagation();
                handleSelectOrder(o, e.currentTarget);
              },
            },
            {
              id: 'pin',
              label: pinnedIds.has(o.id) ? (isAr ? 'إلغاء' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin className={`w-[15px] h-[15px] ${pinnedIds.has(o.id) ? 'fill-current' : ''}`} />,
              onClick: (e) => {
                e.stopPropagation();
                handleTogglePin(o.id);
              },
            },
          ]}
          getDetailActions={(o): KineticDetailAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'فتح الفحص' : 'Inspecter',
              icon: <Eye className="w-3.5 h-3.5" />,
              onClick: () => handleSelectOrder(o),
            },
            {
              id: 'release',
              label: isAr ? 'تحرير الدفعة' : 'Libérer Lot',
              icon: <Check className="w-3.5 h-3.5" />,
              onClick: () => handleReleaseLot(o),
            },
            {
              id: 'cert',
              label: isAr ? 'شهادة المطابقة' : 'Certificat ISO',
              icon: <Printer className="w-3.5 h-3.5" />,
              onClick: () => setOrderForCertificate(o),
            },
            {
              id: 'pin',
              label: pinnedIds.has(o.id) ? (isAr ? 'إلغاء التثبيت' : 'Désépingler') : (isAr ? 'تثبيت' : 'Épingler'),
              icon: <Pin className={`w-3.5 h-3.5 ${pinnedIds.has(o.id) ? 'fill-current' : ''}`} />,
              onClick: () => handleTogglePin(o.id),
            },
            {
              id: 'scrap',
              label: isAr ? 'تسجيل تالف' : 'Rebut',
              icon: <AlertCircle className="w-3.5 h-3.5 text-[#c0283d]" />,
              onClick: () =>
                showToast(
                  isAr
                    ? `تم تسجيل تقرير عدم مطابقة للدفعة ${o.orderNumber}`
                    : `Fiche de non-conformité ouverte pour le lot ${o.orderNumber}`,
                  'info'
                ),
            },
          ]}
          customActions={(o) => [
            {
              id: 'release',
              label: isAr ? 'تحرير الدفعة' : 'Libérer Lot',
              icon: <Check size={13} />,
              variant: 'primary',
              onClick: () => handleReleaseLot(o),
            },
            {
              id: 'cert',
              label: isAr ? 'شهادة المطابقة' : 'Certificat ISO',
              icon: <Printer size={13} />,
              variant: 'outline',
              onClick: () => setOrderForCertificate(o),
            },
            {
              id: 'scrap',
              label: isAr ? 'تسجيل تالف' : 'Rebut',
              icon: <AlertCircle size={13} />,
              variant: 'danger',
              onClick: () =>
                showToast(
                  isAr
                    ? `تم تسجيل تقرير عدم مطابقة للدفعة ${o.orderNumber}`
                    : `Fiche de non-conformité ouverte pour le lot ${o.orderNumber}`,
                  'info'
                ),
            },
          ]}
          renderCard={(o) => {
            const qty = o.actualQuantityProduced || o.targetQuantity || 1;
            const unitCost = Math.round(o.totalCostDzd / qty);
            return (
              <div className="flex flex-col justify-between w-full space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded">
                    {o.orderNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    98.8% Conforme
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-black dark:text-white line-clamp-2">{o.productName}</h4>
                  <p className="text-[10px] text-black/55 dark:text-white/55 font-mono mt-0.5">
                    Lot: {o.batchLotNumber || 'LOT-2026-STD'} · {qty} pcs
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">Coût Unitaire</span>
                    <span className="font-mono font-bold text-black/70 dark:text-white/75">{formatMoney(unitCost, language)}</span>
                  </div>
                  <span className="text-emerald-600 font-bold text-xs">
                    {o.status === 'Completed' ? 'Libéré ✓' : 'En contrôle'}
                  </span>
                </div>
              </div>
            );
          }}
          emptyTitle={isAr ? 'لا توجد دفعات مطابقة' : 'Aucun lot trouvé'}
          emptyDescription={isAr ? 'أعد ضبط معايير البحث أو التصفية' : 'Ajustez vos filtres de contrôle qualité'}
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
        entityPluralLabel={isAr ? 'دفعة' : 'lots'}
        hasActiveFilters={activeFiltersCount > 0 || qcStatusFilter !== 'All'}
        onResetFilters={() => {
          setQcStatusFilter('All');
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
        subtitle={activeOrder ? `Lot: ${activeOrder.batchLotNumber || 'LOT-2026-05'}` : ''}
        avatarText="CQ"
        branchName={activeBranchInfo?.name}
        statusLabel={
          activeOrder?.status === 'Completed'
            ? isAr ? 'معتمد ISO' : 'Libéré Conforme'
            : isAr ? 'قيد الفحص' : 'En Contrôle'
        }
        statusClassName={
          activeOrder?.status === 'Completed'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
        }
        tabs={[
          { id: 'cq', label: isAr ? 'فحص الجودة' : 'Contrôle CQ' },
          { id: 'metrologie', label: isAr ? 'القياس والتفاوت' : 'Métrologie' },
          { id: 'couts', label: isAr ? 'التكلفة والتالف' : 'Coûts & Scrap' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(o) => handleSelectOrder(o)}
        onClose={() => setSelectedOrder(null)}
        renderBody={(ord, tab) => (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Check size={13} />}
                onClick={() => handleReleaseLot(ord)}
              >
                {isAr ? 'تحرير واعتماد الدفعة' : 'Libérer Lot ✓'}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                icon={<Printer size={13} />}
                onClick={() => setOrderForCertificate(ord)}
              >
                {isAr ? 'شهادة المطابقة ISO' : 'Certificat ISO'}
              </AtriumButton>
            </div>

            {tab === 'cq' && (
              <div className="space-y-4">
                <div className="sq-elev-card">
                  <div data-sq="card" data-sq-border="none" className="p-4 bg-[#1F1D1B] text-white space-y-2">
                    <div className="flex items-center justify-between text-white/80 text-[11px]">
                      <span>Statut Libération du Lot</span>
                      <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">ISO 9001</span>
                    </div>
                    <div className="text-2xl font-black tracking-tight text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                      98.8% Conforme
                    </div>
                    <p className="text-[10px] text-white/75">
                      Échantillonnage AQL 1.5 validé par le laboratoire de métrologie interne.
                    </p>
                  </div>
                </div>
                <div data-sq="card" data-sq-border="solid" className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Spécifications de Fabrication
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Désignation:</span>
                    <span className="font-bold text-black dark:text-white">{ord.productName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Taille du Lot:</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {ord.actualQuantityProduced || ord.targetQuantity} unités
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Inspecteur Responsable:</span>
                    <span className="font-medium text-black dark:text-white">Ing. Sami Mansour (CQ)</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'metrologie' && (
              <div data-sq="card" data-sq-border="solid" className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                  Rapport Dimensionnel & Tolérances
                </span>
                <div className="space-y-2">
                  <div data-sq="ctl" data-sq-border="solid" className="flex justify-between p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span>Cote Critique Longueur (±0.5mm):</span>
                    <span className="font-mono font-bold text-emerald-600">+0.12mm (OK)</span>
                  </div>
                  <div data-sq="ctl" data-sq-border="solid" className="flex justify-between p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span>Épaisseur & Planéité (±0.2mm):</span>
                    <span className="font-mono font-bold text-emerald-600">-0.05mm (OK)</span>
                  </div>
                  <div data-sq="ctl" data-sq-border="solid" className="flex justify-between p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <span>Adhérence Finition / Revêtement:</span>
                    <span className="font-mono font-bold text-emerald-600">Grade 5B (Parfait)</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'couts' && (
              <div data-sq="card" data-sq-border="solid" className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                  Décomposition Coût de Revient
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-black/55 dark:text-white/55">Matières Premières:</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {formatMoney(ord.totalMaterialCostDzd, language)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/55 dark:text-white/55">Main d'Œuvre Directe:</span>
                  <span className="font-mono font-bold text-black dark:text-white">
                    {formatMoney(ord.totalLaborCostDzd, language)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="font-semibold text-black dark:text-white">Coût Total Lot:</span>
                  <span className="font-mono font-bold text-[#d4522f]">{formatMoney(ord.totalCostDzd, language)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      />

      {orderForCertificate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sq-elev-pop max-w-xl w-full animate-in zoom-in-95 duration-150">
            <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 w-full p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-black dark:text-white">
                      {isAr ? 'شهادة المطابقة الصناعية IANOR / ISO' : 'Certificat de Conformité & Libération Lot'}
                    </h3>
                    <p className="text-xs text-black/55 dark:text-white/55">Norme ISO 9001:2015 & IANOR NA 1620</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-no-liquid="true"
                    data-sq="ctl"
                    data-sq-border="none"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Printer size={14} />
                    <span>{isAr ? 'طباعة' : 'Imprimer'}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={isAr ? 'إغلاق' : 'Fermer'}
                    onClick={() => setOrderForCertificate(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="printable-document p-6 rounded-[var(--r-card,16px)] bg-white border-2 border-emerald-600/40 text-black space-y-5 font-sans shadow-xs">
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <div className="font-black text-sm tracking-tight text-black">ATRIUM MANUFACTURE & CONTRÔLE QUALITÉ</div>
                    <div className="text-[10px] text-black/55 font-medium">
                      Laboratoire de Métrologie Industrielle • Alger • Agrément ONML N° 2026/88
                    </div>
                    <div className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-wide">
                      BULLETIN D'ANALYSE & CERTIFICAT DE CONFORMITÉ PRODUIT FINI
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-xs text-emerald-700">
                      CERT-2026-{orderForCertificate.orderNumber.replace(/[^0-9]/g, '')}
                    </div>
                    <div className="text-[11px] text-black/55 mt-0.5">Date : {new Date().toISOString().split('T')[0]}</div>
                  </div>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-[var(--r-ctl,12px)] border border-neutral-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-black/55">Article inspecté :</span>
                  <span className="font-bold text-black">{orderForCertificate.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55">Ordre de Fabrication :</span>
                  <span className="font-mono font-semibold text-black">{orderForCertificate.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55">N° de Lot de Traçabilité :</span>
                  <span className="font-mono font-bold text-[#d4522f]">
                    {orderForCertificate.batchLotNumber || 'LOT-202610-0089'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55">Quantité libérée :</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {orderForCertificate.actualQuantityProduced ||
                      orderForCertificate.quantityProduced ||
                      orderForCertificate.targetQuantity}{' '}
                    unités conformes
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-black uppercase tracking-wider">
                  Résultats des Contrôles Métrologiques & Essais
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-[var(--r-ctl,12px)] border border-emerald-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Tolérance dimensionnelle (Calibre Vernier) :</span>
                    <span className="font-bold text-emerald-800">Conforme (+/- 0.2mm)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Essai de résistance mécanique / charge :</span>
                    <span className="font-bold text-emerald-800">Validé 100% sans déformation</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Adhérence et état de surface (Aspect A) :</span>
                    <span className="font-bold text-emerald-800">Grade 5B ISO 2409</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-neutral-100 rounded-[var(--r-ctl,12px)] text-[11px] text-black/75 font-medium">
                Le Responsable Assurance Qualité atteste que le lot ci-dessus référencé répond strictement aux spécifications techniques du cahier des charges et est libéré pour livraison client.
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t text-center text-xs">
                <div>
                  <span className="text-black/55 text-[10px] block">Ingénieur Métrologie & CQ</span>
                  <div className="h-10 flex items-center justify-center font-serif text-black italic">Ing. Sofiane Mokrani</div>
                </div>
                <div>
                  <span className="text-black/55 text-[10px] block">Cachet & Signature Direction</span>
                  <div className="h-10 flex items-center justify-center font-serif text-black italic">Direction Qualité Atrium</div>
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
