import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  Tag,
  Sparkles,
  TrendingUp,
  Percent,
  Check,
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

type CatalogTab = 'products' | 'services';
type DrawerTab = 'fiche' | 'stock' | 'marge' | 'notes';

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
    branches,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();

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
  const [productNotes, setProductNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState(1000);
  const [costAmount, setCostAmount] = useState(700);
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('u');
  const [taxRate, setTaxRate] = useState(19);
  const [category, setCategory] = useState('Matériaux BTP');
  const [reorderLevel, setReorderLevel] = useState(10);
  const [stockQuantity, setStockQuantity] = useState(50);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeProduct = useMemo(() => {
    if (!selectedProduct) return null;
    return products.find((p) => p.id === selectedProduct.id) || selectedProduct;
  }, [selectedProduct, products]);

  useEffect(() => {
    if (activeProduct) setProductNotes(activeProduct.description || '');
  }, [activeProduct?.id]);

  const handleNotesChange = (val: string) => {
    setProductNotes(val);
    if (!activeProduct) return;
    setIsSavingNotes(true);
    updateProduct(activeProduct.id, { description: val });
    setTimeout(() => {
      setIsSavingNotes(false);
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 2000);
    }, 400);
  };

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
    setTaxRate(activeTab === 'services' ? 9 : 19);
    setCategory(activeTab === 'services' ? 'Prestations & Services' : 'Matériaux BTP');
    setReorderLevel(10);
    setStockQuantity(50);
    setModalOpen(true);
  }, [activeTab]);

  const handleEdit = useCallback((p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setPriceAmount(p.price?.amount || 0);
    setCostAmount(p.cost?.amount || p.costPrice || 0);
    setSku(p.sku || '');
    setUnit(p.unit || 'u');
    setTaxRate(p.taxRate ?? 19);
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
        renderCell: (p) => <span className="font-mono text-xs font-bold text-black dark:text-white">{p.sku || 'N/A'}</span>,
      },
      {
        key: 'name',
        header: 'Désignation',
        minWidth: '210px',
        sortable: true,
        renderCell: (p) => (
          <div className="text-xs">
            <span className="font-bold text-black dark:text-white block">{p.name}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55">{p.category}</span>
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
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-black/75 dark:text-white/80 truncate">
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
        renderCell: (p) => <span className="text-xs font-mono text-black/55 dark:text-white/55">{p.unit || 'u'}</span>,
      },
      {
        key: 'tva',
        header: 'TVA %',
        width: '70px',
        renderCell: (p) => (
          <span className="text-xs font-mono text-black/70 dark:text-white/75">{p.taxRate ?? 19}%</span>
        ),
      },
      {
        key: 'price',
        header: 'Prix Vente HT',
        width: '125px',
        sortable: true,
        renderCell: (p) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatMoney(p.price?.amount || 0)}
          </span>
        ),
      },
      {
        key: 'cost',
        header: "Coût d'Achat HT",
        width: '120px',
        renderCell: (p) => (
          <span className="font-mono text-xs text-black/55 dark:text-white/55 tabular-nums">
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
                <span className="font-mono font-bold text-xs tabular-nums text-black dark:text-white">
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
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white rounded-lg cursor-pointer"
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
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg cursor-pointer"
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
        subtitle={`${products.length} ${isAr ? 'عنصر' : isEn ? 'catalog items' : 'références'}`}
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
          data={sortedItems}
          keyExtractor={(p) => p.id}
          viewMode={viewMode}
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
          customActions={(p) =>
            p.unit !== 'forfait'
              ? [
                  {
                    id: 'replenish',
                    label: '+10 Stock',
                    icon: <PackagePlus size={13} />,
                    variant: 'primary',
                    onClick: () => handleReplenishStock(p, 10),
                  },
                ]
              : []
          }
          renderCard={(p) => {
            const marginPercent =
              (p.price?.amount || 0) > 0
                ? Math.round(
                    (((p.price?.amount || 0) - (p.cost?.amount || p.costPrice || 0)) / (p.price?.amount || 1)) * 100
                  )
                : 0;
            const isLowStock = (p.stockQuantity || 0) <= (p.reorderLevel || 10);
            return (
              <div className="p-4 border border-[#E6DED6] dark:border-neutral-700/70 bg-white dark:bg-neutral-800/80 rounded-2xl flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                      {p.sku || 'N/A'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#d4522f]/10 text-[#d4522f]">
                      {p.category || 'Général'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-black dark:text-white line-clamp-1 mb-1">{p.name}</h3>
                  <div className="mt-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-black/55 dark:text-white/55">Prix Vente HT :</span>
                      <span className="font-mono font-bold text-[#d4522f] tabular-nums">
                        {formatMoney(p.price?.amount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-black/55 dark:text-white/55">Marge Brute :</span>
                      <span className={`font-mono font-semibold ${marginPercent >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {marginPercent}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  {p.unit !== 'forfait' ? (
                    <>
                      <span className={`font-mono font-semibold ${isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {p.stockQuantity || 0} {p.unit || 'u'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplenishStock(p, 10);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#d4522f]/10 hover:bg-[#d4522f]/20 text-[#d4522f] text-[11px] font-bold cursor-pointer"
                      >
                        +10 Stock
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-black/55 dark:text-white/55">
                      <Sparkles size={13} className="text-[#d4522f]" />
                      <span>Prestation au Forfait</span>
                    </div>
                  )}
                </div>
              </div>
            );
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
        avatarText={activeProduct ? activeProduct.name.charAt(0).toUpperCase() : 'P'}
        branchName={
          activeProduct ? resolveRecordBranch(activeProduct, branchesById, currentBranch, language).name : undefined
        }
        statusLabel={activeProduct?.unit === 'forfait' ? 'Service' : `${activeProduct?.stockQuantity || 0} ${activeProduct?.unit || 'u'}`}
        tabs={[
          { id: 'fiche', label: 'Fiche' },
          { id: 'stock', label: 'Stock' },
          { id: 'marge', label: 'Marge' },
          { id: 'notes', label: 'Notes' },
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
        renderBody={(prod, tab) => (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2">
              {prod.unit !== 'forfait' && (
                <button
                  type="button"
                  onClick={() => handleReplenishStock(prod, 10)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#d4522f] hover:bg-[#b83f1f] text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PackagePlus size={13} />
                  <span>+10 Stock</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleEdit(prod)}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-black dark:text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Edit size={13} />
                <span>Modifier</span>
              </button>
            </div>

            {tab === 'fiche' && (
              <div className="p-3.5 bg-[#FBF8F5] dark:bg-neutral-800/50 rounded-xl space-y-2 border border-[#E6DED6] dark:border-neutral-800">
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Référence SKU :</span>
                  <span className="font-mono font-bold">{prod.sku || 'SANS SKU'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Catégorie :</span>
                  <span className="font-semibold">{prod.category || 'Général'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Unité :</span>
                  <span className="font-mono">{prod.unit || 'u'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">TVA :</span>
                  <span className="font-mono font-bold text-emerald-600">{prod.taxRate ?? 19}%</span>
                </div>
              </div>
            )}

            {tab === 'stock' &&
              (prod.unit === 'forfait' ? (
                <div className="p-4 text-center text-black/55 dark:text-white/55 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                  Cet article est un service immatériel.
                </div>
              ) : (
                <div className="p-3.5 bg-[#FBF8F5] dark:bg-neutral-800/50 rounded-xl space-y-2 border border-[#E6DED6] dark:border-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Stock Réel :</span>
                    <span className="font-mono font-bold">
                      {prod.stockQuantity || 0} {prod.unit || 'u'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Seuil Alerte :</span>
                    <span className="font-mono">{prod.reorderLevel || 10}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Valorisation HT :</span>
                    <span className="font-mono font-bold text-[#d4522f]">
                      {formatMoney((prod.stockQuantity || 0) * (prod.cost?.amount || prod.costPrice || 0))}
                    </span>
                  </div>
                </div>
              ))}

            {tab === 'marge' && (
              <div className="p-3.5 bg-[#FBF8F5] dark:bg-neutral-800/50 rounded-xl space-y-2 border border-[#E6DED6] dark:border-neutral-800">
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Prix de Vente HT :</span>
                  <span className="font-mono font-bold">{formatMoney(prod.price?.amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Coût d'Achat HT :</span>
                  <span className="font-mono">{formatMoney(prod.cost?.amount || prod.costPrice || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-black/55 dark:text-white/55">Marge Unitaire :</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatMoney((prod.price?.amount || 0) - (prod.cost?.amount || prod.costPrice || 0))}
                  </span>
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-black/55 dark:text-white/55 font-medium">Spécifications :</label>
                  {isSavingNotes ? (
                    <span className="text-[10px] animate-pulse">Sauvegarde...</span>
                  ) : notesSavedNotice ? (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check size={11} /> Sauvegardé
                    </span>
                  ) : null}
                </div>
                <textarea
                  rows={5}
                  value={productNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Spécifications techniques..."
                  className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
                />
              </div>
            )}
          </div>
        )}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {editingProduct ? "Modifier l'Article" : 'Ajouter au Catalogue'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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
      )}
    </div>
  );
};
