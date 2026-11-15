import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Building2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Warehouse,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StockMovementVoucher, Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StockMovementModal } from './StockMovementModal';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
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

type InventoryViewTab = 'stock_state' | 'vouchers';

export const TradingInventoryView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    products,
    warehouses,
    stockVouchers,
    createWarehouseDepot,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [selectedDepotId, setSelectedDepotId] = useState('all');
  const [subTab, setSubTab] = useState<InventoryViewTab>('stock_state');
  const [stockAlertOnly, setStockAlertOnly] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [newDepotModalOpen, setNewDepotModalOpen] = useState(false);

  const [depotCode, setDepotCode] = useState('');
  const [depotName, setDepotName] = useState('');
  const [depotAddress, setDepotAddress] = useState('');
  const [depotCity, setDepotCity] = useState('Alger');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [inspectingVoucher, setInspectingVoucher] = useState<StockMovementVoucher | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const metrics = useMemo(() => {
    const branchCounts = new Map<string, number>();
    products.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalValuation: products.reduce(
        (sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0),
        0
      ),
      lowStockCount: products.filter((p) => (p.stockQuantity || 0) <= (p.reorderLevel || 10)).length,
      totalUnits: products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0),
      depotsCount: warehouses.length,
      vouchersCount: stockVouchers.length,
      branchCounts,
    };
  }, [products, warehouses, stockVouchers, branchesById, currentBranch, language]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (stockAlertOnly && (p.stockQuantity || 0) > (p.reorderLevel || 10)) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.sku || '').toLowerCase().includes(q) &&
          !(p.category || '').toLowerCase().includes(q) &&
          !bName.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [products, stockAlertOnly, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const ap = pinnedIds.has(a.id);
      const bp = pinnedIds.has(b.id);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      let cmp = 0;
      if (sortBy === 'sku') cmp = (a.sku || '').localeCompare(b.sku || '');
      else if (sortBy === 'stock') cmp = (a.stockQuantity || 0) - (b.stockQuantity || 0);
      else if (sortBy === 'price') cmp = (a.price?.amount || 0) - (b.price?.amount || 0);
      else if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredProducts, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const filteredVouchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stockVouchers.filter((v) => {
      if (selectedDepotId !== 'all') {
        if (v.depotSourceId !== selectedDepotId && v.depotTargetId !== selectedDepotId) return false;
      }
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(v, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(v, branchesById, currentBranch, language).name.toLowerCase();
        if (
          !v.voucherNumber.toLowerCase().includes(q) &&
          !v.reason.toLowerCase().includes(q) &&
          !(v.operatorName || '').toLowerCase().includes(q) &&
          !bName.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [stockVouchers, selectedDepotId, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const handleCreateDepot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depotCode || !depotName) return;
    createWarehouseDepot({
      businessId: 'biz_trading',
      branchId: currentBranch?.id || 'branch_trading_main',
      tenantId: 'acc_01',
      facilityId: currentBranch?.id || 'branch_trading_main',
      code: depotCode.trim().toUpperCase(),
      name: depotName.trim(),
      address: depotAddress.trim() || 'Alger',
      city: depotCity.trim() || 'Alger',
      isMain: false,
      totalSkusCount: 0,
      totalValuationDzd: 0,
    });
    setDepotCode('');
    setDepotName('');
    setDepotAddress('');
    setNewDepotModalOpen(false);
  };

  const handleExportCsv = useCallback(() => {
    if (subTab === 'stock_state') {
      const headers = ['SKU', 'Désignation', 'Catégorie', 'Branche', 'Stock Réel', 'Coût PMP', 'Prix Vente HT'];
      const rows = sortedProducts.map((p) => [
        p.sku || '',
        p.name,
        p.category || '',
        resolveRecordBranch(p, branchesById, currentBranch, language).name,
        p.stockQuantity || 0,
        p.cost?.amount || p.costPrice || 0,
        p.price?.amount || 0,
      ]);
      downloadCsvSafe(`atrium-trading-stock-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    } else {
      const headers = ['N° Bon', 'Type', 'Date', 'Source', 'Branche', 'Motif', 'Valorisation'];
      const rows = filteredVouchers.map((v) => [
        v.voucherNumber,
        v.type,
        v.date,
        v.depotSourceName,
        resolveRecordBranch(v, branchesById, currentBranch, language).name,
        v.reason,
        v.totalValuationDzd,
      ]);
      downloadCsvSafe(`atrium-trading-vouchers-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    }
  }, [subTab, sortedProducts, filteredVouchers, branchesById, currentBranch, language]);

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOptions = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: products.length },
      ...Array.from(metrics.branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    ];
    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الوكالة' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
      {
        id: 'depot',
        label: isAr ? 'المستودع' : isEn ? 'Warehouse Depot' : 'Dépôt logistique',
        value: selectedDepotId,
        onChange: setSelectedDepotId,
        resetValue: 'all',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'all', label: t('trading_inventory_all_depots', 'Tous les dépôts') },
          ...warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })),
        ],
      },
      {
        id: 'stock_alert',
        label: isAr ? 'تنبيه المخزون' : isEn ? 'Stock Level' : 'Niveau stock',
        value: stockAlertOnly ? 'low' : 'all',
        onChange: (val) => setStockAlertOnly(val === 'low'),
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'low', label: isAr ? 'نقص المخزون' : isEn ? 'Low Stock' : 'Alerte réappro' },
        ],
      },
    ];
  }, [branchFilter, selectedDepotId, stockAlertOnly, metrics.branchCounts, products.length, warehouses, t, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (selectedDepotId !== 'all') {
      const w = warehouses.find((d) => d.id === selectedDepotId);
      chips.push({
        key: 'depot',
        label: `Dépôt: ${w?.code || selectedDepotId}`,
        onRemove: () => setSelectedDepotId('all'),
      });
    }
    if (stockAlertOnly) {
      chips.push({
        key: 'low',
        label: isAr ? 'نقص المخزون' : 'Alerte Réappro',
        onRemove: () => setStockAlertOnly(false),
      });
    }
    return chips;
  }, [branchFilter, selectedDepotId, stockAlertOnly, warehouses, isAr, isEn]);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) + (selectedDepotId !== 'all' ? 1 : 0) + (stockAlertOnly ? 1 : 0);

  const stockColumns: ColumnDefinition<Product>[] = useMemo(
    () => [
      {
        key: 'sku',
        header: 'Code SKU',
        width: '125px',
        sortable: true,
        renderCell: (prod) => (
          <span className="font-mono text-xs font-bold text-black/70 dark:text-white/75">{prod.sku || 'N/A'}</span>
        ),
      },
      {
        key: 'name',
        header: "Désignation de l'Article",
        minWidth: '220px',
        sortable: true,
        renderCell: (prod) => (
          <div className="text-xs">
            <span className="font-bold text-black dark:text-white block">{prod.name}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">
              {prod.category} {prod.supplier ? `• Fournisseur: ${prod.supplier}` : ''}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '140px',
        sortable: true,
        renderCell: (prod) => {
          const b = resolveRecordBranch(prod, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'stock',
        header: t('trading_inventory_col_qty_on_hand', 'Stock Réel'),
        width: '120px',
        sortable: true,
        renderCell: (prod) => {
          const isLow = (prod.stockQuantity || 0) <= (prod.reorderLevel || 10);
          return (
            <div className="text-xs font-mono">
              <span
                className={`font-bold tabular-nums ${
                  isLow ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'
                }`}
              >
                {prod.stockQuantity || 0} {prod.unit || 'u'}
              </span>
              {isLow && (
                <span className="block text-[10px] text-rose-500 font-semibold uppercase">
                  {t('trading_inventory_low_stock_warning', 'Alerte Réappro')}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'cost',
        header: t('trading_inventory_col_cost', 'Coût PMP (HT)'),
        width: '120px',
        renderCell: (prod) => (
          <span className="font-mono text-xs text-black/70 dark:text-white/75 tabular-nums">
            {formatMoney(prod.cost?.amount || prod.costPrice || 0)}
          </span>
        ),
      },
      {
        key: 'price',
        header: t('trading_catalog_col_price', 'Prix Vente HT'),
        width: '120px',
        sortable: true,
        renderCell: (prod) => (
          <span className="font-mono text-xs font-semibold text-black dark:text-white tabular-nums">
            {formatMoney(prod.price?.amount || 0)}
          </span>
        ),
      },
      {
        key: 'valuation',
        header: t('trading_inventory_col_total_val', 'Valorisation Stock'),
        width: '145px',
        renderCell: (prod) => {
          const val = (prod.stockQuantity || 0) * (prod.cost?.amount || prod.costPrice || 0);
          return (
            <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
              {formatMoney(val)}
            </span>
          );
        },
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language]
  );

  const voucherColumns: ColumnDefinition<StockMovementVoucher>[] = useMemo(
    () => [
      {
        key: 'voucherNumber',
        header: 'N° Bon de Mouvement',
        width: '180px',
        renderCell: (v) => {
          const badgeColor =
            v.type === 'entree'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
              : v.type === 'sortie'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400';
          return (
            <div className="flex items-center gap-2 font-mono text-xs font-bold">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${badgeColor}`}>
                {v.type === 'entree' ? 'BE' : v.type === 'sortie' ? 'BS' : 'BT'}
              </span>
              <span className="text-black dark:text-white">{v.voucherNumber}</span>
            </div>
          );
        },
      },
      {
        key: 'date',
        header: 'Date',
        width: '110px',
        renderCell: (v) => <span className="font-mono text-xs text-black/70 dark:text-white/75">{v.date}</span>,
      },
      {
        key: 'depots',
        header: 'Trajet / Dépôts',
        minWidth: '200px',
        renderCell: (v) => (
          <div className="text-xs">
            <span className="font-medium text-black dark:text-white">{v.depotSourceName}</span>
            {v.type === 'transfert' && v.depotTargetName && (
              <span className="text-black/55 dark:text-white/55 flex items-center gap-1 text-[11px]">
                → {v.depotTargetName}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '140px',
        renderCell: (v) => {
          const b = resolveRecordBranch(v, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'reason',
        header: 'Motif',
        width: '150px',
        renderCell: (v) => (
          <span className="text-xs font-mono text-black/70 dark:text-white/75">{v.reason.replace('_', ' ')}</span>
        ),
      },
      {
        key: 'valuation',
        header: 'Valeur du Bon',
        width: '140px',
        renderCell: (v) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatMoney(v.totalValuationDzd)}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0 || warehouses.length > 0,
  });

  if (showSkeleton && ((products.length === 0 && warehouses.length === 0) || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Boxes size={22} />}
        title={t('trading_inventory_title', 'Stocks')}
        subtitle={`${warehouses.length} ${isAr ? 'مستودعات نشطة' : isEn ? 'active depots' : 'dépôts actifs'}`}
        primaryAction={{
          label: t('trading_inventory_new_movement', 'Nouveau Bon de Mouvement'),
          icon: <Plus size={15} />,
          onClick: () => setMovementModalOpen(true),
        }}
        secondaryActions={
          <AtriumButton
            variant="secondary"
            size="md"
            onClick={() => setNewDepotModalOpen(true)}
            icon={<Building2 size={14} />}
          >
            <span>{t('trading_inventory_new_depot', 'Nouveau Dépôt')}</span>
          </AtriumButton>
        }
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات المخزون والمستودعات' : isEn ? 'Inventory Metrics' : 'Indicateurs Stocks & Dépôts'}
        language={language}
        primaryCard={{
          label: isAr ? 'المقالات والوحدات المخزنة' : 'Références & Volume Réel',
          count: metrics.totalUnits,
          formatValue: (v) => `${v}${isAr ? ' وحدة' : ' u'}`,
          badgeText: `${products.length} SKUs · ${metrics.lowStockCount} alerte`,
          tone: metrics.lowStockCount > 0 ? 'terracotta' : 'emerald',
          title:
            metrics.lowStockCount > 0
              ? `${metrics.lowStockCount} en rupture imminente`
              : 'Niveaux de stocks nominaux',
          isActive: stockAlertOnly,
          onToggle: () => {
            setSubTab('stock_state');
            setStockAlertOnly((v) => !v);
          },
        }}
        secondaryCard={{
          label: isAr ? 'المستودعات وسندات النقل' : 'Maillage & Mouvements',
          count: metrics.vouchersCount,
          badgeText: `${metrics.depotsCount} sites`,
          tone: 'emerald',
          title: "Bons d'entrée, sortie et transferts",
          isActive: subTab === 'vouchers',
          onToggle: () => setSubTab((prev) => (prev === 'vouchers' ? 'stock_state' : 'vouchers')),
        }}
        darkCard={{
          label: isAr ? 'إجمالي قيمة المخزون الحالية' : 'Valorisation Totale du Stock',
          valueCount: metrics.totalValuation,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v),
          badgeCount: metrics.depotsCount,
          badgePrefix: '',
          badgeSuffix: 'Dépôts',
          caption: 'Coût PMP (HT) — Actif circulant multi-dépôts',
        }}
      />

      <ScreenPod>
        <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#d4522f]">
              <Warehouse size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                {t('trading_inventory_depots_hub', 'Réseau des Dépôts & Hubs Logistiques')}
              </span>
              <span className="text-[11px] text-black/55 dark:text-white/75 block">
                Filtrage actif du stock par entrepôt physique ou valorisation consolidée
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-black/55 dark:text-white/55">
            {warehouses.length} {t('trading_depots_active', 'dépôts configurés')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          <button
            type="button"
            onClick={() => setSelectedDepotId('all')}
            className={`p-3.5 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer ${
              selectedDepotId === 'all'
                ? 'border-[#d4522f] bg-white dark:bg-neutral-800 shadow-xs ring-2 ring-[#d4522f]/20'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-black dark:text-white">
                {t('trading_inventory_all_depots', 'Tous')}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-semibold">
                GLOBAL
              </span>
            </div>
            <div className="text-xs font-bold font-mono text-[#d4522f]">{formatMoney(metrics.totalValuation)}</div>
          </button>
          {warehouses.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelectedDepotId(w.id)}
              className={`p-3.5 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer ${
                selectedDepotId === w.id
                  ? 'border-[#d4522f] bg-white dark:bg-neutral-800 shadow-xs ring-2 ring-[#d4522f]/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-black dark:text-white truncate">{w.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-semibold">
                  {w.code}
                </span>
              </div>
              <div className="text-[11px] text-black/55 dark:text-white/55 mb-0.5">{w.city}</div>
              <div className="text-xs font-mono font-bold text-black dark:text-white">
                {formatMoney(w.totalValuationDzd || 0)}
              </div>
            </button>
          ))}
        </div>
      </ScreenPod>

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            subTab === 'stock_state'
              ? t('trading_inventory_tab_state', 'État des Stocks')
              : t('trading_inventory_tab_vouchers', 'Bons de Mouvements')
          }
          liveRegionText={
            subTab === 'stock_state' ? `${sortedProducts.length} SKUs` : `${filteredVouchers.length} bons`
          }
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث برمز المادة، التسمية، السند...' : 'Filtrer article, bon, SKU...'}
          statusOptions={[
            { value: 'stock_state', label: isAr ? 'المخزون' : isEn ? 'Stock' : 'Stocks', count: products.length },
            { value: 'vouchers', label: isAr ? 'السندات' : isEn ? 'Vouchers' : 'Bons', count: stockVouchers.length },
          ]}
          statusValue={subTab}
          onStatusChange={(val) => setSubTab(val as InventoryViewTab)}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setSelectedDepotId('all');
            setStockAlertOnly(false);
            setSearchQuery('');
          }}
        />

        {subTab === 'stock_state' ? (
          <UniversalDataCollection<Product>
            hideToolbar
            data={sortedProducts}
            keyExtractor={(p) => p.id}
            viewMode={viewMode}
            columns={stockColumns}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            openItemId={inspectingProduct?.id ?? null}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              setPinnedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onItemClick={(p, el) => {
              setDrawerOpenerEl(el || null);
              setInspectingProduct(p);
            }}
            onViewDetails={(p, el) => {
              setDrawerOpenerEl(el || null);
              setInspectingProduct(p);
            }}
            renderCard={(p) => {
              const b = resolveRecordBranch(p, branchesById, currentBranch, language);
              return (
                <div className="p-4 border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/80 rounded-2xl space-y-2 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs text-black/60 dark:text-white/60">{p.sku || 'SKU'}</span>
                      <span className="text-[10px] font-medium text-[#d4522f]">{b.name}</span>
                    </div>
                    <p className="font-bold text-xs text-black dark:text-white">{p.name}</p>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t border-neutral-100 dark:border-neutral-700 font-mono">
                    <span>Stock : {p.stockQuantity || 0}</span>
                    <span className="font-bold text-[#d4522f] tabular-nums">{formatMoney(p.price?.amount || 0)}</span>
                  </div>
                </div>
              );
            }}
            emptyTitle={isAr ? 'لا توجد مقالات في هذا المستودع' : 'Aucun article dans ce dépôt'}
            emptyDescription={
              isAr
                ? 'قم بإدخال مواد للمستودع عبر سندات الاستلام.'
                : "Effectuez une réception à quai ou un bon de mouvement d'entrée."
            }
          />
        ) : (
          <UniversalDataCollection<StockMovementVoucher>
            hideToolbar
            data={filteredVouchers}
            keyExtractor={(v) => v.id}
            viewMode={viewMode}
            columns={voucherColumns}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            openItemId={inspectingVoucher?.id ?? null}
            onItemClick={(v, el) => {
              setDrawerOpenerEl(el || null);
              setInspectingVoucher(v);
            }}
            onViewDetails={(v, el) => {
              setDrawerOpenerEl(el || null);
              setInspectingVoucher(v);
            }}
            renderCard={(v) => (
              <div className="p-4 border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/80 rounded-2xl space-y-1.5">
                <span className="font-mono text-xs font-bold">{v.voucherNumber}</span>
                <p className="font-bold text-xs">{v.reason}</p>
                <div className="flex justify-between text-xs pt-2 border-t border-neutral-100 dark:border-neutral-700">
                  <span>{v.date}</span>
                  <span className="font-bold text-[#d4522f] font-mono">{formatMoney(v.totalValuationDzd)}</span>
                </div>
              </div>
            )}
            emptyTitle={isAr ? 'لا توجد حركات مخزون مسجلة' : 'Aucun mouvement de stock enregistré'}
            emptyDescription={
              isAr ? 'أنشئ أول سند حركة.' : "Créez votre premier bon d'entrée, sortie ou transfert ci-dessus."
            }
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={subTab === 'stock_state' ? sortedProducts.length : filteredVouchers.length}
        entityPluralLabel={subTab === 'stock_state' ? 'articles' : 'bons'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setSelectedDepotId('all');
          setStockAlertOnly(false);
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Product>
        isOpen={!!inspectingProduct}
        item={inspectingProduct}
        allItems={sortedProducts}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingProduct?.name || ''}
        subtitle={inspectingProduct ? `${inspectingProduct.sku || 'SKU'} · ${inspectingProduct.category || 'Général'}` : undefined}
        avatarText="SKU"
        branchName={
          inspectingProduct ? resolveRecordBranch(inspectingProduct, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={`${inspectingProduct?.stockQuantity || 0} ${inspectingProduct?.unit || 'u'}`}
        onClose={() => setInspectingProduct(null)}
        onSelectItem={(p) => setInspectingProduct(p)}
        renderBody={(p) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-neutral-800/50 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/60">Stock disponible :</span>
                <span className="font-mono font-bold text-black dark:text-white">
                  {p.stockQuantity || 0} {p.unit || 'u'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/60">Seuil réapprovisionnement :</span>
                <span className="font-mono">{p.reorderLevel || 10}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/60">Coût PMP (HT) :</span>
                <span className="font-mono">{formatMoney(p.cost?.amount || p.costPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/60">Prix vente HT :</span>
                <span className="font-mono font-bold text-[#d4522f]">{formatMoney(p.price?.amount || 0)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setInspectingProduct(null);
                setMovementModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-[#d4522f] hover:bg-[#b83f1f] text-white font-bold text-xs cursor-pointer"
            >
              Enregistrer un mouvement de stock
            </button>
          </div>
        )}
      />

      <KineticSlideOverInspector<StockMovementVoucher>
        isOpen={!!inspectingVoucher}
        item={inspectingVoucher}
        allItems={filteredVouchers}
        keyExtractor={(v) => v.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingVoucher?.voucherNumber || ''}
        subtitle={inspectingVoucher ? `${inspectingVoucher.date} · ${inspectingVoucher.depotSourceName}` : undefined}
        avatarText={inspectingVoucher ? inspectingVoucher.type.slice(0, 2).toUpperCase() : 'MV'}
        branchName={
          inspectingVoucher ? resolveRecordBranch(inspectingVoucher, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={inspectingVoucher?.type.toUpperCase()}
        onClose={() => setInspectingVoucher(null)}
        onSelectItem={(v) => setInspectingVoucher(v)}
        renderBody={(v) => (
          <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-neutral-800/50 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-black/55 dark:text-white/60">Source :</span>
              <span className="font-semibold">{v.depotSourceName}</span>
            </div>
            {v.depotTargetName && (
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/60">Destination :</span>
                <span className="font-semibold">{v.depotTargetName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black/55 dark:text-white/60">Motif :</span>
              <span className="font-mono">{v.reason}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-neutral-700">
              <span className="text-black/55 dark:text-white/60">Valorisation :</span>
              <span className="font-mono font-bold text-[#d4522f]">{formatMoney(v.totalValuationDzd)}</span>
            </div>
          </div>
        )}
      />

      <StockMovementModal isOpen={movementModalOpen} onClose={() => setMovementModalOpen(false)} />

      {newDepotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-black dark:text-white flex items-center gap-2 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              <Building2 size={18} className="text-[#d4522f]" />
              <span>Ajouter un Nouveau Dépôt</span>
            </h2>
            <form onSubmit={handleCreateDepot} className="space-y-3 text-xs">
              <LabelInput
                label="Code Dépôt *"
                placeholder="Ex: DEP-03"
                value={depotCode}
                onChange={(e) => setDepotCode(e.target.value)}
                required
              />
              <LabelInput
                label="Nom du Dépôt / Hangar *"
                placeholder="Ex: Dépôt Annaba Port"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                required
              />
              <LabelInput
                label="Adresse Logistique"
                placeholder="Ex: Quai Ouest, Zone Portuaire"
                value={depotAddress}
                onChange={(e) => setDepotAddress(e.target.value)}
              />
              <LabelInput
                label="Ville"
                placeholder="Ex: Annaba"
                value={depotCity}
                onChange={(e) => setDepotCity(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setNewDepotModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm">
                  Créer le Dépôt
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
