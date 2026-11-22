import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Building2,
  Warehouse,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentProductsFromState,
  selectCurrentWarehousesFromState,
  selectCurrentStockVouchersFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { StockMovementVoucher, Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StockMovementModal } from './StockMovementModal';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { EmptyState } from '../../../atrium/components/EmptyState';
import {
  KineticEmptyStateMotion,
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
  InspectorBigStat,
  InspectorListItem,
  InspectorWideButton,
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

type InventoryViewTab = 'stock_state' | 'vouchers';
type ProductDrawerTab = 'stock' | 'valorisation' | 'mouvements';
type VoucherDrawerTab = 'bon' | 'trajet' | 'articles';

export const TradingInventoryView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { products, warehouses, stockVouchers, currentBranch, branches, isSyncing, networkMode, lastSyncedAt, isSyncTimeout } = useAtriumSelector(
    (s) => ({
      products: selectCurrentProductsFromState(s),
      warehouses: selectCurrentWarehousesFromState(s),
      stockVouchers: selectCurrentStockVouchersFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );
  const { createWarehouseDepot, retryCloudSync } = useAtriumActions();

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
  const [productDrawerTab, setProductDrawerTab] = useState<ProductDrawerTab>('stock');
  const [inspectingVoucher, setInspectingVoucher] = useState<StockMovementVoucher | null>(null);
  const [voucherDrawerTab, setVoucherDrawerTab] = useState<VoucherDrawerTab>('bon');
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
          <span className="tabular-nums t-small font-semibold text-black/70 dark:text-white/75">{prod.sku || 'N/A'}</span>
        ),
      },
      {
        key: 'name',
        header: "Désignation de l'Article",
        minWidth: '220px',
        sortable: true,
        renderCell: (prod) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{prod.name}</span>
            <span className="t-cap text-black/55 dark:text-white/55">
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
            <div className="t-cap tabular-nums">
              <span
                className={`font-semibold tabular-nums ${
                  isLow ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'
                }`}
              >
                {prod.stockQuantity || 0} {prod.unit || 'u'}
              </span>
              {isLow && (
                <span className="block t-small text-rose-500 font-semibold">
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
          <span className="tabular-nums t-cap text-black/70 dark:text-white/75">
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
          <span className="tabular-nums t-small font-semibold text-black dark:text-white">
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
            <span className="tabular-nums font-semibold t-small text-black dark:text-white">
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
            <div className="flex items-center gap-2 tabular-nums t-small font-semibold">
              <span className={`px-2 py-1 rounded-[var(--r-check,6px)] t-cap ${badgeColor}`}>
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
        renderCell: (v) => <span className="tabular-nums t-cap text-black/70 dark:text-white/75">{v.date}</span>,
      },
      {
        key: 'depots',
        header: 'Trajet / Dépôts',
        minWidth: '200px',
        renderCell: (v) => (
          <div className="t-cap">
            <span className="font-medium text-black dark:text-white">{v.depotSourceName}</span>
            {v.type === 'transfert' && v.depotTargetName && (
              <span className="text-black/55 dark:text-white/55 flex items-center gap-1 t-cap">
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
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
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
          <span className="t-cap tabular-nums text-black/70 dark:text-white/75">{v.reason.replace('_', ' ')}</span>
        ),
      },
      {
        key: 'valuation',
        header: 'Valeur du Bon',
        width: '140px',
        renderCell: (v) => (
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">
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
        <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2">
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-8 h-8 bg-[#FCEEE8] dark:bg-[#2B2825] flex items-center justify-center text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]"
            >
              <Warehouse size={16} />
            </div>
            <div>
              <span className="t-small font-semibold text-black dark:text-white">
                {t('trading_inventory_depots_hub', 'Réseau des Dépôts & Hubs Logistiques')}
              </span>
              <span className="t-cap text-black/55 dark:text-white/75 block">
                Filtrage actif du stock par entrepôt physique ou valorisation consolidée
              </span>
            </div>
          </div>
          <span className="t-small tabular-nums font-semibold text-black/55 dark:text-white/55">
            {warehouses.length} {t('trading_depots_active', 'dépôts configurés')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
          <div className="sq-elev-card">
          <button
            type="button"
            onClick={() => setSelectedDepotId('all')}
            data-sq="card"
            data-sq-border={selectedDepotId === 'all' ? 'solid' : 'solid'}
            data-sq-stroke-w={selectedDepotId === 'all' ? '2' : '1'}
            className={`w-full h-full p-4 text-left rtl:text-right transition-all cursor-pointer ${
              selectedDepotId === 'all'
                ? '[--sq-stroke:#d4522f] bg-white dark:bg-[#22201E]'
                : '[--sq-stroke:var(--sq-stroke-card)] bg-white dark:bg-[#22201E] hover:bg-[#FAF7F4] dark:hover:bg-[#282523]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold t-small text-black dark:text-white">
                {t('trading_inventory_all_depots', 'Tous')}
              </span>
              <span className="t-small tabular-nums px-2 py-1 rounded-[var(--r-check,6px)] bg-[#EFE9E2] dark:bg-[#2B2825] text-black/75 dark:text-white/80 font-semibold">
                GLOBAL
              </span>
            </div>
            <div className="t-small font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(metrics.totalValuation)}</div>
          </button>
          </div>
          {warehouses.map((w) => (
            <div key={w.id} className="sq-elev-card sq-elev-card-hover">
            <button
              type="button"
              onClick={() => setSelectedDepotId(w.id)}
              data-sq="card"
              data-sq-border="solid"
              data-sq-stroke-w={selectedDepotId === w.id ? '2' : '1'}
              className={`w-full h-full p-4 text-left rtl:text-right transition-colors cursor-pointer ${
                selectedDepotId === w.id
                  ? '[--sq-stroke:#d4522f] bg-white dark:bg-[#22201E]'
                  : '[--sq-stroke:var(--sq-stroke-card)] bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold t-small text-black dark:text-white truncate">{w.name}</span>
                <span className="t-small tabular-nums px-2 py-1 rounded-[var(--r-check,6px)] bg-[#EFE9E2] dark:bg-[#2B2825] text-black/75 dark:text-white/80 font-semibold">
                  {w.code}
                </span>
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 mb-0.5">{w.city}</div>
              <div className="t-small tabular-nums font-semibold text-black dark:text-white">
                {formatMoney(w.totalValuationDzd || 0)}
              </div>
            </button>
            </div>
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
            items={sortedProducts}
            keyExtractor={(p) => p.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode="list"
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
            getRowMeta={(p) => {
              const isLow = (p.stockQuantity || 0) <= (p.reorderLevel || 10);
              const cost = p.cost?.amount || p.costPrice || 0;
              const val = (p.stockQuantity || 0) * cost;
              const branchInfo = resolveRecordBranch(p, branchesById, currentBranch, language);
              return {
                title: p.name,
                subline: `${p.sku || 'SKU'} · ${p.category || 'Général'}`,
                avatarText: p.name.slice(0, 2).toUpperCase(),
                avatarColor: '#d4522f',
                categoryLabel: p.category || 'Article',
                statusLabel: isLow ? 'Alerte Réappro' : `${p.stockQuantity || 0} ${p.unit || 'u'}`,
                statusVariant: isLow ? 'warning' : 'active',
                metricPrimary: formatMoney(val),
                metricSecondary: `PMP ${formatMoney(cost)}`,
                branchName: branchInfo.name,
                isPinned: pinnedIds.has(p.id),
                detailCol1: { heading: 'Stock Réel', primaryText: `${p.stockQuantity || 0} ${p.unit || 'u'}` },
                detailCol2: { heading: 'Seuil Alerte', primaryText: `${p.reorderLevel || 10}` },
                detailCol3: { heading: 'Prix Vente HT', primaryText: formatMoney(p.price?.amount || 0) },
              };
            }}
            getFanActions={() => [
              {
                id: 'move',
                label: 'Mouvement Stock',
                icon: <Boxes size={14} />,
                onClick: () => setMovementModalOpen(true),
              },
            ]}
            getDetailActions={() => [
              {
                id: 'move',
                label: 'Mouvement',
                icon: <Boxes size={13} />,
                onClick: () => setMovementModalOpen(true),
              },
            ]}
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
            items={filteredVouchers}
            keyExtractor={(v) => v.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode="list"
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
            getRowMeta={(v) => {
              const branchInfo = resolveRecordBranch(v, branchesById, currentBranch, language);
              return {
                title: v.voucherNumber,
                subline: `${v.date} · ${v.depotSourceName}${v.depotTargetName ? ` → ${v.depotTargetName}` : ''}`,
                avatarText: v.type === 'entree' ? 'BE' : v.type === 'sortie' ? 'BS' : 'BT',
                avatarColor: '#d4522f',
                categoryLabel: v.reason.replace('_', ' '),
                statusLabel: v.type.toUpperCase(),
                statusVariant: v.type === 'entree' ? 'active' : v.type === 'sortie' ? 'blocked' : 'info',
                metricPrimary: formatMoney(v.totalValuationDzd),
                metricSecondary: v.date,
                branchName: branchInfo.name,
                detailCol1: { heading: 'Source', primaryText: v.depotSourceName },
                detailCol2: { heading: 'Destination', primaryText: v.depotTargetName || '—' },
                detailCol3: { heading: 'Motif', primaryText: v.reason.replace('_', ' ') },
              };
            }}
            getFanActions={(v) => [
              {
                id: 'inspect',
                label: isAr ? 'معاينة' : isEn ? 'Inspect' : 'Détails',
                icon: <Boxes size={14} />,
                onClick: (e) => {
                  setDrawerOpenerEl(e.currentTarget);
                  setInspectingVoucher(v);
                },
              },
            ]}
            getDetailActions={(v) => [
              {
                id: 'inspect',
                label: isAr ? 'فتح السند' : isEn ? 'Open Voucher' : 'Ouvrir Bon',
                icon: <Boxes size={13} />,
                onClick: () => setInspectingVoucher(v),
              },
              {
                id: 'move',
                label: isAr ? 'حركة جديدة' : isEn ? 'New Movement' : 'Mouvement',
                icon: <Boxes size={13} />,
                onClick: () => setMovementModalOpen(true),
              },
            ]}
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
        avatarText={inspectingProduct ? inspectingProduct.name.slice(0, 2).toUpperCase() : 'SK'}
        avatarColor="#d4522f"
        branchName={
          inspectingProduct ? resolveRecordBranch(inspectingProduct, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={`${inspectingProduct?.stockQuantity || 0} ${inspectingProduct?.unit || 'u'}`}
        statusClassName={
          (inspectingProduct?.stockQuantity || 0) <= (inspectingProduct?.reorderLevel || 10)
            ? STATUS_PILL_WARN
            : STATUS_PILL_OK
        }
        tabs={[
          { id: 'stock', label: isAr ? 'المخزون' : isEn ? 'Stock' : 'Stock' },
          { id: 'valorisation', label: isAr ? 'التقييم' : isEn ? 'Valuation' : 'Valorisation' },
          { id: 'mouvements', label: isAr ? 'الحركات' : isEn ? 'Movements' : 'Mouvements' },
        ]}
        activeTab={productDrawerTab}
        onTabChange={(tab) => setProductDrawerTab(tab as ProductDrawerTab)}
        onClose={() => setInspectingProduct(null)}
        onSelectItem={(p) => setInspectingProduct(p)}
        renderBody={(p, tab) => {
          const qty = p.stockQuantity || 0;
          const reorder = p.reorderLevel || 10;
          const cost = p.cost?.amount || p.costPrice || 0;
          const val = qty * cost;
          const pct = reorder > 0 ? Math.min(100, Math.round((qty / (reorder * 3)) * 100)) : 100;
          const relatedVouchers = stockVouchers.slice(0, 5);

          if (tab === 'valorisation') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title="Valorisation PMP">
                  <InspectorBigStat
                    value={formatMoney(val)}
                    tone="accent"
                    caption={`Actif en stock (${qty} ${p.unit || 'u'})`}
                  />
                  <InspectorCard>
                    <InspectorKeyValue label="Coût PMP (HT)" value={formatMoney(cost)} mono />
                    <InspectorKeyValue label="Prix Vente HT" value={formatMoney(p.price?.amount || 0)} mono isLast />
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'mouvements') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title="Derniers bons enregistrés">
                  {relatedVouchers.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`tr-inv-mvt-empty-${p.id}`}>
                      <EmptyState
                        variant="compact"
                        tone="neutral"
                        icon={<Boxes size={20} />}
                        title="Aucun bon enregistré"
                        description="Les bons d’entrée, sortie et transfert de ce produit apparaîtront ici."
                        secondaryAction={{
                          label: 'Nouveau mouvement',
                          icon: <Plus size={14} />,
                          onClick: () => setMovementModalOpen(true),
                        }}
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {relatedVouchers.map((v, idx) => (
                        <InspectorListItem
                          key={v.id}
                          title={v.voucherNumber}
                          subtitle={`${v.date} · ${v.depotSourceName}`}
                          metaRight={formatMoney(v.totalValuationDzd)}
                          isLast={idx === relatedVouchers.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
                </InspectorSection>
                <InspectorWideButton
                  label="Enregistrer un mouvement de stock"
                  icon={<Boxes size={14} />}
                  tone="accent"
                  onClick={() => {
                    setInspectingProduct(null);
                    setMovementModalOpen(true);
                  }}
                />
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  {
                    id: 'move',
                    label: 'Mouvement',
                    icon: <Boxes size={15} />,
                    primary: true,
                    onClick: () => {
                      setInspectingProduct(null);
                      setMovementModalOpen(true);
                    },
                  },
                ]}
              />
              <InspectorSection index={0} title="Disponibilité & Seuil">
                <InspectorBigStat
                  value={`${qty} ${p.unit || 'u'}`}
                  tone={qty <= reorder ? 'danger' : 'ok'}
                  caption={`Seuil réapprovisionnement : ${reorder}`}
                />
                <InspectorCard>
                  <InspectorProgressBar percent={pct} tone={qty <= reorder ? 'warn' : 'ok'} animateKey={p.id} />
                  <InspectorKeyValue label="Code SKU" value={p.sku || 'SKU'} mono copyText={p.sku} />
                  <InspectorKeyValue label="Coût PMP (HT)" value={formatMoney(cost)} mono />
                  <InspectorKeyValue label="Prix vente HT" value={formatMoney(p.price?.amount || 0)} mono tone="accent" isLast />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
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
        avatarColor="#d4522f"
        branchName={
          inspectingVoucher ? resolveRecordBranch(inspectingVoucher, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={inspectingVoucher?.type.toUpperCase()}
        statusClassName={
          inspectingVoucher?.type === 'entree'
            ? STATUS_PILL_OK
            : inspectingVoucher?.type === 'sortie'
            ? STATUS_PILL_WARN
            : STATUS_PILL_INFO
        }
        tabs={[
          { id: 'bon', label: isAr ? 'السند' : isEn ? 'Voucher' : 'Bon' },
          { id: 'trajet', label: isAr ? 'المسار' : isEn ? 'Route' : 'Trajet' },
          { id: 'articles', label: isAr ? 'المواد' : isEn ? 'Items' : 'Articles' },
        ]}
        activeTab={voucherDrawerTab}
        onTabChange={(tab) => setVoucherDrawerTab(tab as VoucherDrawerTab)}
        onClose={() => setInspectingVoucher(null)}
        onSelectItem={(v) => setInspectingVoucher(v)}
        renderBody={(v, tab) => {
          if (tab === 'trajet') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title="Trajet logistique">
                  <InspectorCard>
                    <InspectorKeyValue label="Dépôt source" value={v.depotSourceName} />
                    <InspectorKeyValue label="Dépôt cible" value={v.depotTargetName || 'Mouvement interne'} />
                    <InspectorKeyValue label="Opérateur" value={v.operatorName || 'Magasinier'} isLast />
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'articles') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={`Lignes du bon (${v.items?.length || 0})`}>
                  <InspectorCard>
                    {!v.items || v.items.length === 0 ? (
                      <InspectorKeyValue label="Valorisation globale" value={formatMoney(v.totalValuationDzd)} mono isLast />
                    ) : (
                      v.items.map((it, idx) => (
                        <InspectorListItem
                          key={`${it.productId}-${idx}`}
                          title={it.productName}
                          subtitle={`${it.quantity} ${it.unit}`}
                          metaRight={formatMoney(it.quantity * it.unitCostDzd)}
                          isLast={idx === v.items.length - 1}
                        />
                      ))
                    )}
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorSection index={0} title="Synthèse Mouvement">
                <InspectorBigStat
                  value={formatMoney(v.totalValuationDzd)}
                  tone="accent"
                  caption={`Motif : ${v.reason.replace('_', ' ')}`}
                />
                <InspectorCard>
                  <InspectorKeyValue label="Source" value={v.depotSourceName} />
                  {v.depotTargetName && <InspectorKeyValue label="Destination" value={v.depotTargetName} />}
                  <InspectorKeyValue label="Date" value={v.date} mono />
                  <InspectorKeyValue label="Motif" value={v.reason.replace('_', ' ')} isLast />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />

      <StockMovementModal isOpen={movementModalOpen} onClose={() => setMovementModalOpen(false)} />

      {newDepotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="sq-elev-pop relative w-full max-w-md">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4"
            >
            <h2 className="t-card font-semibold text-black dark:text-white flex items-center gap-2">
              <Building2 size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>Ajouter un Nouveau Dépôt</span>
            </h2>
            <form onSubmit={handleCreateDepot} className="space-y-3 t-cap">
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
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
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
        </div>
      )}
    </div>
  );
};
