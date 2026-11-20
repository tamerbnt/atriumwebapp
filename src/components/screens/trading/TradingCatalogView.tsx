import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  PackagePlus,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorBigStat,
  InspectorNotesField,
  InspectorWideButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
const STATUS_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]';

type CatalogTab = 'products' | 'services';
type DrawerTab = 'fiche' | 'stock' | 'marge';

export const TradingCatalogView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    currentBranch,
    currentBusinessConfig,
    branches,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();
  const configuredDefaultTva = currentBusinessConfig.defaultTvaRate ?? 19;

  const [activeTab, setActiveTab] = useState<CatalogTab>('products');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [tvaFilter, setTvaFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('fiche');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState(1000);
  const [costAmount, setCostAmount] = useState(700);
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('u');
  const [taxRate, setTaxRate] = useState(configuredDefaultTva);
  const [category, setCategory] = useState('Matériaux BTP');
  const [reorderLevel, setReorderLevel] = useState(10);
  const [stockQuantity, setStockQuantity] = useState(50);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeProduct = useMemo(() => {
    if (!selectedProduct) return null;
    return products.find((p) => p.id === selectedProduct.id) || selectedProduct;
  }, [selectedProduct, products]);

  const handleSaveNotes = useCallback(
    (val: string) => {
      if (!activeProduct) return;
      updateProduct(activeProduct.id, { description: val });
      showToast({
        type: 'success',
        title: isAr ? 'تم حفظ الملاحظات' : isEn ? 'Notes saved' : 'Spécifications enregistrées',
        message: activeProduct.name,
      });
    },
    [activeProduct, updateProduct, isAr, isEn]
  );

  const handleReplenishStock = useCallback(
    (prod: Product, delta = 10) => {
      const nextStock = (prod.stockQuantity || 0) + delta;
      updateProduct(prod.id, { stockQuantity: nextStock });
      showToast({
        type: 'success',
        title: 'Stock Réapprovisionné',
        message: `+${delta} ${prod.unit || 'u'} ajoutés à ${prod.name} (Nouveau stock: ${nextStock})`,
      });
    },
    [updateProduct]
  );

  const stats = useMemo(() => {
    const physicalProducts = products.filter(
      (p) =>
        !p.category?.toLowerCase().includes('service') &&
        !p.category?.toLowerCase().includes('prestation') &&
        p.unit !== 'forfait'
    );
    const services = products.filter(
      (p) =>
        p.category?.toLowerCase().includes('service') ||
        p.category?.toLowerCase().includes('prestation') ||
        p.unit === 'forfait'
    );
    const totalValuation = physicalProducts.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0),
      0
    );
    const totalSalesPotential = physicalProducts.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.price?.amount || 0),
      0
    );
    const avgMargin =
      totalSalesPotential > 0
        ? Math.round(((totalSalesPotential - totalValuation) / totalSalesPotential) * 100)
        : 32;

    const branchCounts = new Map<string, number>();
    products.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });

    return {
      productsCount: physicalProducts.length,
      servicesCount: services.length,
      totalValuation,
      totalSalesPotential,
      avgMargin,
      branchCounts,
    };
  }, [products, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const isSrv =
        p.category?.toLowerCase().includes('service') ||
        p.category?.toLowerCase().includes('prestation') ||
        p.unit === 'forfait';
      if (activeTab === 'services' && !isSrv) return false;
      if (activeTab === 'products' && isSrv) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (tvaFilter !== 'all' && String(p.taxRate ?? 19) !== tvaFilter) return false;
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
  }, [products, activeTab, branchFilter, tvaFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'sku') cmp = (a.sku || '').localeCompare(b.sku || '');
      else if (sortBy === 'price') cmp = (a.price?.amount || 0) - (b.price?.amount || 0);
      else if (sortBy === 'stock') cmp = (a.stockQuantity || 0) - (b.stockQuantity || 0);
      else if (sortBy === 'branch') {
        cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'SKU',
      'Désignation',
      'Catégorie',
      'Branche',
      'Type',
      'Unité',
      'TVA %',
      'Prix Vente HT',
      'Coût Achat HT',
      'Stock Réel',
      'Seuil Alerte',
    ];
    const rows = sortedItems.map((p) => [
      p.sku || '',
      p.name,
      p.category || '',
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
      p.unit === 'forfait' ? 'Service' : 'Produit',
      p.unit || 'u',
      p.taxRate ?? 19,
      p.price?.amount || 0,
      p.cost?.amount || p.costPrice || 0,
      p.stockQuantity ?? '',
      p.reorderLevel ?? '',
    ]);
    downloadCsvSafe(`atrium-trading-catalog-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [sortedItems, branchesById, currentBranch, language]);

  const handleOpenAdd = useCallback(() => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPriceAmount(1000);
    setCostAmount(700);
    setSku('');
    setUnit(activeTab === 'services' ? 'forfait' : 'u');
    setTaxRate(activeTab === 'services' ? (configuredDefaultTva === 0 ? 0 : 9) : configuredDefaultTva);
    setCategory(activeTab === 'services' ? 'Prestations & Services' : 'Matériaux BTP');
    setReorderLevel(10);
    setStockQuantity(50);
    setModalOpen(true);
  }, [activeTab, configuredDefaultTva]);

  const handleEdit = useCallback((p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setPriceAmount(p.price?.amount || 0);
    setCostAmount(p.cost?.amount || p.costPrice || 0);
    setSku(p.sku || '');
    setUnit(p.unit || 'u');
    setTaxRate(p.taxRate ?? configuredDefaultTva);
    setCategory(p.category || 'Général');
    setReorderLevel(p.reorderLevel || 10);
    setStockQuantity(p.stockQuantity || 0);
    setModalOpen(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: name.trim(),
        description: description.trim(),
        price: { amount: priceAmount, currency: 'DZD' },
        cost: { amount: costAmount, currency: 'DZD' },
        sku: sku.trim() || undefined,
        unit,
        taxRate,
        category,
        reorderLevel,
        stockQuantity: activeTab === 'services' ? 999 : stockQuantity,
      });
    } else {
      addProduct({
        name: name.trim(),
        description: description.trim(),
        price: { amount: priceAmount, currency: 'DZD' },
        cost: { amount: costAmount, currency: 'DZD' },
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        unit,
        taxRate,
        category,
        reorderLevel,
        stockQuantity: activeTab === 'services' ? 999 : stockQuantity,
        isActive: true,
        isPinned: false,
      });
    }
    setModalOpen(false);
  };

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOptions = [
      { value: 'All', label: isAr ? 'جميع الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: products.length },
      ...Array.from(stats.branchCounts.entries()).map(([n, c]) => ({ value: n, label: n, count: c })),
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
        id: 'tva',
        label: isAr ? 'ضريبة القيمة المضافة' : isEn ? 'VAT Rate' : 'Taux TVA',
        value: tvaFilter,
        onChange: setTvaFilter,
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: '19', label: '19%' },
          { value: '9', label: '9%' },
          { value: '0', label: '0%' },
        ],
      },
    ];
  }, [branchFilter, tvaFilter, stats.branchCounts, products.length, isAr, isEn]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (tvaFilter !== 'all') {
      chips.push({
        key: 'tva',
        label: `TVA: ${tvaFilter}%`,
        onRemove: () => setTvaFilter('all'),
      });
    }
    return chips;
  }, [branchFilter, tvaFilter, isAr, isEn]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (tvaFilter !== 'all' ? 1 : 0);

  const columns: ColumnDefinition<Product>[] = useMemo(
    () => [
      {
        key: 'sku',
        header: 'Réf. SKU',
        width: '120px',
        sortable: true,
        renderCell: (p) => <span className="tabular-nums t-small font-semibold text-black dark:text-white">{p.sku || 'N/A'}</span>,
      },
      {
        key: 'name',
        header: 'Désignation',
        minWidth: '210px',
        sortable: true,
        renderCell: (p) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block">{p.name}</span>
            <span className="t-cap text-black/55 dark:text-white/55">{p.category}</span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '140px',
        sortable: true,
        renderCell: (p) => {
          const b = resolveRecordBranch(p, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 t-small font-medium text-black/75 dark:text-white/80 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </span>
          );
        },
      },
      {
        key: 'unit',
        header: 'Unité',
        width: '70px',
        renderCell: (p) => <span className="t-cap tabular-nums text-black/55 dark:text-white/55">{p.unit || 'u'}</span>,
      },
      {
        key: 'tva',
        header: 'TVA %',
        width: '70px',
        renderCell: (p) => (
          <span className="t-cap tabular-nums text-black/70 dark:text-white/75">{p.taxRate ?? 19}%</span>
        ),
      },
      {
        key: 'price',
        header: 'Prix Vente HT',
        width: '125px',
        sortable: true,
        renderCell: (p) => (
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">
            {formatMoney(p.price?.amount || 0)}
          </span>
        ),
      },
      {
        key: 'cost',
        header: "Coût d'Achat HT",
        width: '120px',
        renderCell: (p) => (
          <span className="tabular-nums t-cap text-black/55 dark:text-white/55">
            {formatMoney(p.cost?.amount || p.costPrice || 0)}
          </span>
        ),
      },
      ...(activeTab === 'products'
        ? [
            {
              key: 'stock',
              header: 'Stock Réel',
              width: '95px',
              sortable: true,
              renderCell: (p: Product) => (
                <span className="tabular-nums font-semibold t-small text-black dark:text-white">
                  {p.stockQuantity || 0}
                </span>
              ),
            },
          ]
        : []),
      {
        key: 'actions',
        header: '',
        width: '80px',
        renderCell: (p) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(p);
              }}
              aria-label={t('action_edit', 'Modifier')}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-2 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
            >
              <Edit size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteProduct(p.id);
                if (selectedProduct?.id === p.id) setSelectedProduct(null);
              }}
              aria-label={t('action_delete', 'Supprimer')}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="p-2 text-black/55 dark:text-white/55 hover:text-rose-600 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [activeTab, isAr, isEn, branchesById, currentBranch, language, t, handleEdit, deleteProduct, selectedProduct?.id]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0,
  });

  if (showSkeleton && (products.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
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
        icon={<ShoppingBag size={22} />}
        title={t('trading_catalog_title', 'Catalogue')}
        primaryAction={{
          label:
            activeTab === 'products'
              ? isAr
                ? 'مادة جديدة'
                : 'Nouvel Article'
              : isAr
              ? 'خدمة جديدة'
              : 'Nouvelle Prestation',
          icon: <Plus size={15} />,
          onClick: handleOpenAdd,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات الكتالوج والهوامش' : isEn ? 'Catalog & Margin Metrics' : 'Indicateurs Catalogue & Marges'}
        language={language}
        primaryCard={{
          label: isAr ? 'مواد وسلع المخزن' : 'Articles & Matériaux',
          count: stats.productsCount,
          badgeText: `${stats.productsCount} réf.`,
          tone: 'terracotta',
          title: `Prix de vente HT moyen: ${formatMoney(1850)}`,
          isActive: activeTab === 'products',
          onToggle: () => setActiveTab('products'),
        }}
        secondaryCard={{
          label: isAr ? 'الخدمات والاستشارات' : 'Prestations & Services',
          count: stats.servicesCount,
          badgeText: `Marge ${stats.avgMargin}%`,
          tone: 'emerald',
          title: `Marge commerciale brute: ${stats.avgMargin}%`,
          isActive: activeTab === 'services',
          onToggle: () => setActiveTab('services'),
        }}
        darkCard={{
          label: isAr ? 'القيمة الإجمالية للكتالوج' : 'Valorisation Globale du Stock',
          valueCount: stats.totalValuation,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v),
          badgeCount: stats.totalSalesPotential,
          badgePrefix: '',
          formatBadgeValue: (v) => formatMoney(v),
          badgeSuffix: 'HT',
          caption: isAr ? 'تكلفة المخزون الفعلية وإجمالي المبيعات المتوقعة' : "Coût d'Achat & Potentiel Vente HT",
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            activeTab === 'products'
              ? t('trading_catalog_articles_title', 'Articles de Négoce')
              : t('trading_catalog_services_title', 'Prestations & Forfaits')
          }
          liveRegionText={`${sortedItems.length} ${isAr ? 'مرجع' : 'références'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث بالاسم، الرمز، الفئة...' : 'Filtrer nom, SKU, catégorie...'}
          statusOptions={[
            { value: 'products', label: isAr ? 'منتجات' : isEn ? 'Products' : 'Produits', count: stats.productsCount },
            { value: 'services', label: isAr ? 'خدمات' : 'Services', count: stats.servicesCount },
          ]}
          statusValue={activeTab}
          onStatusChange={(val) => setActiveTab(val as CatalogTab)}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setTvaFilter('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<Product>
          hideToolbar
          items={sortedItems}
          keyExtractor={(p) => p.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode="list"
          columns={columns}
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
          openItemId={activeProduct?.id ?? null}
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
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteProduct(id));
            setSelectedIds(new Set<string>());
            if (selectedProduct && ids.has(selectedProduct.id)) setSelectedProduct(null);
            showToast({ type: 'info', title: 'Articles supprimés', message: `${ids.size} référence(s) retirée(s).` });
          }}
          onItemClick={(p, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedProduct(p);
          }}
          onViewDetails={(p, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedProduct(p);
          }}
          onEdit={(p) => handleEdit(p)}
          onDelete={(p) => {
            deleteProduct(p.id);
            if (selectedProduct?.id === p.id) setSelectedProduct(null);
          }}
          getRowMeta={(p) => {
            const isSrv = p.unit === 'forfait' || p.category?.toLowerCase().includes('service');
            const isLow = !isSrv && (p.stockQuantity || 0) <= (p.reorderLevel || 10);
            const sale = p.price?.amount || 0;
            const cost = p.cost?.amount || p.costPrice || 0;
            const marginPct = sale > 0 ? Math.round(((sale - cost) / sale) * 100) : 0;
            const branchInfo = resolveRecordBranch(p, branchesById, currentBranch, language);
            return {
              title: p.name,
              subline: `${p.sku || 'SANS SKU'} · ${p.category || 'Général'}`,
              avatarText: p.name.slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: p.category || (isSrv ? 'Service' : 'Article'),
              statusLabel: isSrv
                ? 'Service'
                : isLow
                ? `${p.stockQuantity || 0} ${p.unit || 'u'} · Bas`
                : `${p.stockQuantity || 0} ${p.unit || 'u'}`,
              statusVariant: isSrv ? 'info' : isLow ? 'warning' : 'active',
              metricPrimary: formatMoney(sale),
              metricSecondary: `Marge ${marginPct}%`,
              branchName: branchInfo.name,
              isPinned: pinnedIds.has(p.id),
              notes: p.description,
              detailCol1: { heading: 'Coût Achat HT', primaryText: formatMoney(cost) },
              detailCol2: { heading: 'TVA', primaryText: `${p.taxRate ?? 19}%` },
              detailCol3: { heading: 'Unité', primaryText: p.unit || 'u' },
            };
          }}
          getFanActions={(p) => {
            const actions = [];
            if (p.unit !== 'forfait') {
              actions.push({
                id: 'replenish',
                label: '+10 Stock',
                icon: <PackagePlus size={14} />,
                onClick: () => handleReplenishStock(p, 10),
              });
            }
            actions.push(
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={14} />,
                onClick: () => handleEdit(p),
              },
              {
                id: 'delete',
                label: t('action_delete', 'Supprimer'),
                icon: <Trash2 size={14} />,
                isDanger: true,
                onClick: () => {
                  deleteProduct(p.id);
                  if (selectedProduct?.id === p.id) setSelectedProduct(null);
                },
              }
            );
            return actions;
          }}
          getDetailActions={(p) => {
            const actions = [
              {
                id: 'edit',
                label: t('action_edit', 'Modifier'),
                icon: <Edit size={13} />,
                onClick: () => handleEdit(p),
              },
            ];
            if (p.unit !== 'forfait') {
              actions.unshift({
                id: 'replenish',
                label: '+10 Stock',
                icon: <PackagePlus size={13} />,
                onClick: () => handleReplenishStock(p, 10),
              });
            }
            return actions;
          }}
          emptyTitle="Aucun article trouvé"
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedItems.length}
        entityPluralLabel={activeTab === 'products' ? 'articles' : 'prestations'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setTvaFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Product>
        isOpen={!!activeProduct}
        item={activeProduct}
        allItems={sortedItems}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeProduct?.name || ''}
        subtitle={activeProduct ? `${activeProduct.sku || 'SANS SKU'} · ${activeProduct.category || 'Général'}` : undefined}
        avatarText={activeProduct ? activeProduct.name.slice(0, 2).toUpperCase() : 'PR'}
        avatarColor="#d4522f"
        branchName={
          activeProduct ? resolveRecordBranch(activeProduct, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={
          activeProduct?.unit === 'forfait'
            ? 'Service'
            : `${activeProduct?.stockQuantity || 0} ${activeProduct?.unit || 'u'}`
        }
        statusClassName={
          activeProduct?.unit === 'forfait'
            ? STATUS_PILL_INFO
            : (activeProduct?.stockQuantity || 0) <= (activeProduct?.reorderLevel || 10)
            ? STATUS_PILL_WARN
            : STATUS_PILL_OK
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'البطاقة' : isEn ? 'Profile' : 'Fiche' },
          { id: 'stock', label: isAr ? 'المخزون' : isEn ? 'Stock' : 'Stock' },
          { id: 'marge', label: isAr ? 'الهامش' : isEn ? 'Margin' : 'Marge' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onClose={() => setSelectedProduct(null)}
        onSelectItem={(p) => setSelectedProduct(p)}
        onDelete={(p) => {
          deleteProduct(p.id);
          setSelectedProduct(null);
        }}
        holdToDelete
        renderBody={(prod, tab) => {
          const salePrice = prod.price?.amount || 0;
          const costPrice = prod.cost?.amount || prod.costPrice || 0;
          const unitMargin = salePrice - costPrice;
          const marginPercent = salePrice > 0 ? Math.round((unitMargin / salePrice) * 100) : 0;
          const isSrv = prod.unit === 'forfait';
          const stockQty = prod.stockQuantity || 0;
          const reorderLvl = prod.reorderLevel || 10;
          const stockRatio = reorderLvl > 0 ? Math.min(100, Math.round((stockQty / (reorderLvl * 3)) * 100)) : 100;

          if (tab === 'stock') {
            return (
              <div className="space-y-4">
                {isSrv ? (
                  <InspectorSection index={0} title={isAr ? 'طبيعة الخدمة' : 'Prestation immatérielle'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Unité de facturation" value="Forfait" isLast />
                    </InspectorCard>
                  </InspectorSection>
                ) : (
                  <>
                    <InspectorSection index={0} title={isAr ? 'مستوى المخزون' : 'Niveau de stock'}>
                      <InspectorBigStat
                        value={`${stockQty} ${prod.unit || 'u'}`}
                        tone={stockQty <= reorderLvl ? 'danger' : 'ok'}
                        caption={`Seuil d'alerte : ${reorderLvl} ${prod.unit || 'u'}`}
                      />
                      <InspectorCard>
                        <InspectorProgressBar
                          percent={stockRatio}
                          tone={stockQty <= reorderLvl ? 'warn' : 'ok'}
                          animateKey={prod.id}
                        />
                        <InspectorKeyValue
                          label="Valorisation stock (HT)"
                          value={formatMoney(stockQty * costPrice)}
                          mono
                          tone="accent"
                          isLast
                        />
                      </InspectorCard>
                    </InspectorSection>
                    <InspectorSection index={1} title={isAr ? 'تزويد سريع' : 'Réapprovisionnement rapide'}>
                      <InspectorWideButton
                        label="+10 Stock immédiat"
                        icon={<PackagePlus size={14} />}
                        tone="accent"
                        onClick={() => handleReplenishStock(prod, 10)}
                      />
                    </InspectorSection>
                  </>
                )}
              </div>
            );
          }

          if (tab === 'marge') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isAr ? 'تحليل الربحية' : 'Rentabilité unitaire'}>
                  <InspectorBigStat
                    value={formatMoney(unitMargin)}
                    tone={marginPercent >= 25 ? 'ok' : 'accent'}
                    caption={`Marge brute commerciale : ${marginPercent}%`}
                  />
                  <InspectorCard>
                    <InspectorKeyValue label="Prix de Vente HT" value={formatMoney(salePrice)} mono />
                    <InspectorKeyValue label="Coût d'Achat HT" value={formatMoney(costPrice)} mono />
                    <InspectorKeyValue label="Taux TVA" value={`${prod.taxRate ?? 19}%`} mono isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'الملاحظات الفنية' : 'Spécifications techniques'}>
                  <InspectorNotesField
                    value={prod.description || ''}
                    onSave={handleSaveNotes}
                    placeholder="Spécifications techniques..."
                  />
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  ...(isSrv
                    ? []
                    : [
                        {
                          id: 'replenish',
                          label: '+10 Stock',
                          icon: <PackagePlus size={15} />,
                          primary: true,
                          onClick: () => handleReplenishStock(prod, 10),
                        },
                      ]),
                  {
                    id: 'edit',
                    label: t('action_edit', 'Modifier'),
                    icon: <Edit size={15} />,
                    onClick: () => handleEdit(prod),
                  },
                ]}
              />
              <InspectorSection index={0} title={isAr ? 'معلومات المادة' : 'Identité & Tarification'}>
                <InspectorCard>
                  <InspectorKeyValue label="Référence SKU" value={prod.sku || 'SANS SKU'} mono copyText={prod.sku} />
                  <InspectorKeyValue label="Catégorie" value={prod.category || 'Général'} />
                  <InspectorKeyValue label="Unité" value={prod.unit || 'u'} mono />
                  <InspectorKeyValue label="Prix Vente HT" value={formatMoney(salePrice)} mono tone="accent" />
                  <InspectorKeyValue label="TVA applicable" value={`${prod.taxRate ?? 19}%`} mono isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'الملاحظات الفنية' : 'Spécifications'}>
                <InspectorNotesField
                  value={prod.description || ''}
                  onSave={handleSaveNotes}
                  placeholder="Spécifications techniques..."
                />
              </InspectorSection>
            </div>
          );
        }}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="sq-elev-pop relative w-full max-w-lg">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="relative w-full bg-white dark:bg-neutral-900 [--sq-stroke:#E5E5E5] dark:[--sq-stroke:#262626] p-6 space-y-4"
            >
            <h2 className="t-card font-semibold text-black dark:text-white">
              {editingProduct ? "Modifier l'Article" : 'Ajouter au Catalogue'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 t-cap">
              <LabelInput
                label="Désignation Commerciale *"
                placeholder="Ex: Ciment Portland CPJ-42.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label="Référence / SKU"
                  placeholder="Ex: MAT-CIM-50"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
                <LabelSelect
                  label="Unité de Mesure"
                  value={unit}
                  onChange={(val) => setUnit(typeof val === 'string' ? val : val?.target?.value || 'u')}
                  options={[
                    { value: 'u', label: 'u (Unité)' },
                    { value: 'pcs', label: 'pcs (Pièces)' },
                    { value: 'sac', label: 'sac (Sac)' },
                    { value: 'barre', label: 'barre (Barre)' },
                    { value: 'fut', label: 'fût (Fût)' },
                    { value: 'tonne', label: 'tonne (Tonne)' },
                    { value: 'm', label: 'm (Mètre)' },
                    { value: 'm²', label: 'm² (Mètre carré)' },
                    { value: 'pack', label: 'pack (Couronne/Lot)' },
                    { value: 'forfait', label: 'forfait (Prestation)' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  type="number"
                  label="Prix Vente HT (DA) *"
                  value={priceAmount}
                  step={10}
                  onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
                  required
                />
                <LabelInput
                  type="number"
                  label="Coût d'Achat HT"
                  value={costAmount}
                  step={10}
                  onChange={(e) => setCostAmount(parseFloat(e.target.value) || 0)}
                />
                <LabelSelect
                  label="Taux TVA"
                  value={taxRate}
                  onChange={(val) => setTaxRate(Number(typeof val === 'object' && val?.target ? val.target.value : val))}
                  options={[
                    { value: 19, label: '19% (Standard)' },
                    { value: 9, label: '9% (Réduit)' },
                    { value: 0, label: '0% (Exonéré)' },
                  ]}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm">
                  Enregistrer
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
