import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  Barcode,
  Zap,
  Eye,
  Copy,
  Package,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentProductsFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
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
  InspectorListItem,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonPosRegister } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export const MembershipShopView: React.FC = React.memo(() => {
  const {
    products,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      products: selectCurrentProductsFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );

  const { processSale, retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'InStock' | 'Low'>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [pinnedProductIds, setPinnedProductIds] = useState<Set<string>>(() => new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      if (p.category) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([cat, count]) => ({
      value: cat,
      label: compactFilterLabel(cat).label,
      tooltip: cat,
      count,
    }));
  }, [products]);

  const branchOptionsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      counts.set(bName, (counts.get(bName) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ value: name, label: name, count }));
  }, [products, branchesById, currentBranch, language]);

  const { lowStockCount, inStockCount, totalCatalogInventoryValue } = useMemo(() => {
    let low = 0;
    let inStock = 0;
    let totalVal = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.stockQuantity <= (p.reorderLevel || 5)) low++;
      else inStock++;
      totalVal += p.price.amount * p.stockQuantity;
    }
    return { lowStockCount: low, inStockCount: inStock, totalCatalogInventoryValue: totalVal };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (stockFilter === 'Low' && p.stockQuantity > (p.reorderLevel || 5)) return false;
      if (stockFilter === 'InStock' && p.stockQuantity <= (p.reorderLevel || 5)) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, stockFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedProducts = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredProducts].sort((a, b) => {
      const aPinned = pinnedProductIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedProductIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'price') return (a.price.amount - b.price.amount) * sign;
      if (sortBy === 'stock') return (a.stockQuantity - b.stockQuantity) * sign;
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '') * sign;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return a.name.localeCompare(b.name) * sign;
    });
  }, [filteredProducts, pinnedProductIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const cartTotal = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + item.product.price.amount * item.quantity, 0);
    const disc = cart.reduce((sum, item) => sum + item.discount, 0);
    return Math.max(0, sub - disc);
  }, [cart]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      if (product.stockQuantity <= 0) {
        showToast?.({
          type: 'warning',
          title: isAr ? 'نفاد الكمية' : 'Rupture de Stock',
          message: `${product.name} ${isAr ? 'غير متوفر حالياً' : 'est en rupture de stock.'}`,
        });
        return;
      }
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          if (existing.quantity >= product.stockQuantity) {
            showToast?.({
              type: 'warning',
              title: 'Stock Limit',
              message: `Only ${product.stockQuantity} units available in stock.`,
            });
            return prev;
          }
          return prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return [...prev, { product, quantity: 1, discount: 0 }];
      });
    },
    [isAr, showToast]
  );

  const handleUpdateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  }, []);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    const saleItems = cart.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      discount: item.discount,
    }));
    const newSale = processSale(saleItems, paymentMethod);
    setCart([]);
    showToast?.({
      type: 'success',
      title: isAr ? 'تمت عملية البيع بنجاح' : 'Vente Clôturée avec Succès',
      message: `${isAr ? 'وصل رقم' : 'Ticket'} #${newSale.id.slice(-6).toUpperCase()} · ${formatMoney(cartTotal)}`,
    });
  }, [cart, processSale, paymentMethod, showToast, isAr, cartTotal]);

  const handleResetFilters = useCallback(() => {
    setSelectedCategory('All');
    setStockFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'SKU',
      isAr ? 'المنتج' : isEn ? 'Product' : 'Désignation Article',
      isAr ? 'الفئة' : isEn ? 'Category' : 'Catégorie',
      isAr ? 'المخزون' : isEn ? 'Stock' : 'Stock Dispo',
      isAr ? 'السعر' : isEn ? 'Price' : 'Prix Vente',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedProducts.map((p) => [
      p.sku,
      p.name,
      p.category || 'Pro-Shop',
      p.stockQuantity,
      p.price.amount,
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`atrium-proshop-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [sortedProducts, isAr, isEn, branchesById, currentBranch, language]);

  const hasActiveAdvancedFilters = selectedCategory !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (selectedCategory !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: products.length },
      { value: 'InStock', label: isAr ? 'متوفر' : isEn ? 'In Stock' : 'Disponible', count: inStockCount },
      { value: 'Low', label: isAr ? 'منخفض' : isEn ? 'Low' : 'Faible', count: lowStockCount },
    ],
    [isAr, isEn, products.length, inStockCount, lowStockCount]
  );

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches',
            count: products.length,
          },
          ...branchOptionsWithCounts,
        ],
      },
      {
        id: 'category',
        label: isAr ? 'الفئات' : isEn ? 'Categories' : 'Catégories',
        value: selectedCategory,
        onChange: setSelectedCategory,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: products.length },
          ...categories,
        ],
      },
      {
        id: 'stock',
        label: isAr ? 'حالة المخزون' : isEn ? 'Stock Level' : 'Niveau de stock',
        value: stockFilter,
        onChange: (val) => setStockFilter(val as any),
        kind: 'segmented',
        options: statusOptions,
      },
    ],
    [isAr, isEn, branchFilter, products.length, branchOptionsWithCounts, selectedCategory, categories, stockFilter, statusOptions]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    }
    if (selectedCategory !== 'All') {
      chips.push({
        key: 'category',
        label: compactFilterLabel(selectedCategory).label,
        title: selectedCategory,
        onRemove: () => setSelectedCategory('All'),
      });
    }
    return chips;
  }, [branchFilter, selectedCategory]);

  const columns: ColumnDefinition<Product>[] = useMemo(
    () => [
      {
        id: 'name',
        header: isAr ? 'المنتج' : isEn ? 'Product & SKU' : 'Désignation & SKU',
        accessorKey: 'name',
        sortable: true,
        renderCell: (p) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">
              {p.name}
            </span>
            <span className="t-small tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold">
              {p.sku} · {p.category || 'Pro-Shop'}
            </span>
          </div>
        ),
      },
      {
        id: 'category',
        header: isAr ? 'الفئة' : isEn ? 'Category' : 'Catégorie',
        accessorKey: 'category',
        sortable: true,
        renderCell: (p) => (
          <span className="inline-block px-2 py-1 rounded-full bg-[#F3EDE7] dark:bg-[#262422] t-small font-semibold text-black/75 dark:text-white/80 truncate max-w-full">
            {p.category || 'Fitness & Nutrition'}
          </span>
        ),
      },
      {
        id: 'stock',
        header: isAr ? 'المخزون' : isEn ? 'Stock Status' : 'Stock Dispo',
        accessorKey: 'stockQuantity',
        sortable: true,
        renderCell: (p) => {
          const isLow = p.stockQuantity <= (p.reorderLevel || 5);
          return (
            <span
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold tabular-nums ${
                p.stockQuantity <= 0
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                  : isLow
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  p.stockQuantity <= 0 ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              {p.stockQuantity} {isAr ? 'قطعة' : isEn ? 'units' : 'unités'}
            </span>
          );
        },
      },
      {
        id: 'price',
        header: isAr ? 'السعر' : isEn ? 'Price' : 'Prix Vente',
        accessorKey: 'price.amount',
        sortable: true,
        renderCell: (p) => (
          <span className="tabular-nums t-label font-semibold text-black dark:text-white">
            {formatMoney(p.price.amount)}
          </span>
        ),
      },
      {
        id: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        sortable: true,
        renderCell: (p) => (
          <span className="t-small font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(p, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const getRowMeta = useCallback(
    (p: Product): Partial<KineticRowData> => {
      const reorder = p.reorderLevel || 5;
      const isOut = p.stockQuantity <= 0;
      const isLow = p.stockQuantity <= reorder;
      const branch = resolveRecordBranch(p, branchesById, currentBranch, language);
      return {
        subline: `${p.sku} · ${p.category || 'Pro-Shop'}`,
        categoryLabel: p.category || 'Pro-Shop',
        statusLabel: isOut
          ? isAr ? 'نفد' : isEn ? 'Out' : 'Rupture'
          : isLow
          ? isAr ? 'منخفض' : isEn ? 'Low' : 'Stock faible'
          : isAr ? 'متوفر' : isEn ? 'In stock' : 'Disponible',
        statusVariant: isOut ? 'blocked' : isLow ? 'warning' : 'active',
        metricPrimary: formatMoney(p.price.amount),
        metricSecondary: `${p.stockQuantity} ${isAr ? 'قطعة' : isEn ? 'units' : 'unités'}`,
        detailCol1: {
          heading: isAr ? 'تفاصيل الصنف' : isEn ? 'Catalog SKU' : 'Référence SKU',
          primaryText: p.sku,
          secondaryText: p.category || 'Nutrition & Équipement',
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: isAr ? 'حالة المخزون' : isEn ? 'Stock Level' : 'Niveau de stock',
          primaryText: `${p.stockQuantity} ${isAr ? 'قطعة' : 'unités'}`,
          secondaryText: `${isAr ? 'حد التنبيه:' : 'Seuil alerte:'} ${reorder}`,
        },
        detailCol3: {
          heading: isAr ? 'التسعير' : isEn ? 'Pricing' : 'Valorisation',
          primaryText: formatMoney(p.price.amount),
          secondaryText: formatMoney(p.price.amount * p.stockQuantity),
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getFanActions = useCallback(
    (p: Product): KineticRowFanAction[] => [
      {
        id: 'cart',
        label: isAr ? 'إضافة للسلة' : isEn ? '+ Cart' : '+ Panier',
        icon: <Plus className="w-[15px] h-[15px]" />,
        onClick: () => handleAddToCart(p),
      },
      {
        id: 'view',
        label: isAr ? 'معاينة' : isEn ? 'View' : 'Fiche',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedProduct(p);
        },
      },
    ],
    [isAr, isEn, handleAddToCart]
  );

  const getDetailActions = useCallback(
    (p: Product): KineticDetailAction[] => [
      {
        id: 'cart',
        label: isAr ? 'إضافة للسلة' : isEn ? 'Add to Cart' : 'Ajouter au panier',
        icon: <ShoppingBag className="w-3.5 h-3.5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />,
        onClick: () => handleAddToCart(p),
      },
      {
        id: 'view',
        label: isAr ? 'تفاصيل المنتج' : isEn ? 'Product Details' : 'Fiche article',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => setSelectedProduct(p),
      },
    ],
    [isAr, isEn, handleAddToCart]
  );

  if (showSkeleton && (products.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonPosRegister
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      <ScreenHeaderBar
        icon={<Zap size={22} />}
        title={isAr ? 'المتجر' : isEn ? 'Pro Shop' : 'Boutique'}
        primaryAction={{
          label:
            cart.length > 0
              ? `${isAr ? 'تحصيل السلة' : isEn ? 'Checkout' : 'Encaisser'} (${cart.length})`
              : isAr
              ? 'السلة فارغة'
              : isEn
              ? 'POS Cart'
              : 'Caisse Pro-Shop',
          icon: <Receipt size={15} />,
          disabled: cart.length === 0,
          onClick: handleCheckout,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات مبيعات المتجر وتدفق الصندوق' : isEn ? 'Pro-Shop & Inventory Metrics' : 'Indicateurs Pro-Shop & Rotation de Stock'}
        language={language}
        primaryCard={{
          label: isAr ? 'أصناف متوفرة' : isEn ? 'In-Stock Catalog' : 'Catalogue Disponible',
          badgeText: `↗ ${products.length} ${isAr ? 'صنف' : isEn ? 'SKUs' : 'articles'}`,
          count: inStockCount,
          tone: 'emerald',
          isActive: stockFilter === 'InStock',
          onToggle: () => setStockFilter((p) => (p === 'InStock' ? 'All' : 'InStock')),
        }}
        secondaryCard={{
          label: isAr ? 'تنبيهات انخفاض المخزون' : isEn ? 'Low Stock Alerts' : 'Alertes Réapprovisionnement',
          badgeText: isAr ? 'تحت الحد' : isEn ? 'below threshold' : 'sous le seuil',
          count: lowStockCount,
          tone: 'terracotta',
          isActive: stockFilter === 'Low',
          onToggle: () => setStockFilter((p) => (p === 'Low' ? 'All' : 'Low')),
        }}
        darkCard={{
          label: isAr ? 'قيمة مخزون الصالة' : isEn ? 'Catalog Inventory Value' : 'Valorisation Globale Stock',
          badgePrefix: '',
          badgeCount: cart.length,
          badgeSuffix: isAr ? 'بالسلة' : isEn ? 'in cart' : 'au panier',
          valuePrefix: '',
          valueCount: totalCatalogInventoryValue,
          formatValue: (n) => formatMoney(n),
          caption: isAr ? 'أصول المتجر الجاهزة للبيع' : isEn ? 'Retail merchandise assets' : 'Stock Marchandises Pro-Shop',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'كتالوج المنتجات والمكملات' : isEn ? 'Pro-Shop Catalog' : 'Catalogue Pro-Shop & Articles'}
          liveRegionText={`${sortedProducts.length} ${isAr ? 'منتج' : 'articles'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث بالاسم، الكود أو الفئة...'
              : isEn
              ? 'Search product, SKU, category...'
              : 'Rechercher article, SKU, catégorie...'
          }
          statusOptions={statusOptions}
          statusValue={stockFilter}
          onStatusChange={(v) => setStockFilter(v as any)}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<Product>
              items={sortedProducts}
              keyExtractor={(p) => p.id}
              viewMode={viewMode}
              hideToolbar
              openItemId={selectedProduct?.id ?? null}
              isLoading={isSyncing || networkMode === 'force_skeleton'}
              isOffline={networkMode === 'offline'}
              isTimedOut={isSyncTimeout}
              lastSyncedAt={lastSyncedAt}
              onRetrySync={retryCloudSync}
              columns={columns}
              getRowMeta={getRowMeta}
              getFanActions={getFanActions}
              getDetailActions={getDetailActions}
              selectedIds={selectedProductIds}
              onSelectionChange={setSelectedProductIds}
              pinnedIds={pinnedProductIds}
              onPinToggle={(p: any) => {
                const key = typeof p === 'string' ? p : p.id;
                setPinnedProductIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                });
              }}
              sortBy={sortBy}
              sortDirection={sortDir}
              onSortChange={(col, dir) => {
                setSortBy(col);
                setSortDir(dir);
              }}
              onItemClick={(p, opener) => {
                setDrawerOpenerEl(opener || null);
                setSelectedProduct(p);
              }}
              onViewDetails={(p, opener) => {
                setDrawerOpenerEl(opener || null);
                setSelectedProduct(p);
              }}
              bulkSecondaryAction={{
                label: isAr ? 'إضافة للسلة' : isEn ? 'Add to Cart' : 'Ajouter au panier',
                icon: <ShoppingBag size={13} />,
                onClick: (ids) => {
                  let added = 0;
                  ids.forEach((id) => {
                    const prod = products.find((item) => item.id === id);
                    if (prod && prod.stockQuantity > 0) {
                      handleAddToCart(prod);
                      added++;
                    }
                  });
                  setSelectedProductIds(new Set());
                  showToast?.({
                    type: 'success',
                    title: isAr ? 'السلة' : 'Panier',
                    message: `${added} ${isAr ? 'منتجات أضيفت' : 'article(s) ajouté(s)'}`,
                  });
                },
                variant: 'primary',
              }}
              customActions={(p) => [
                {
                  label: isAr ? 'إضافة للسلة' : '+ Panier',
                  icon: <Plus size={14} />,
                  onClick: () => handleAddToCart(p),
                },
                {
                  label: isAr ? 'معاينة' : 'Fiche',
                  icon: <Eye size={14} />,
                  onClick: () => setSelectedProduct(p),
                },
              ]}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveAdvancedFilters || stockFilter !== 'All' || searchQuery.trim().length > 0}
              emptyTitle={isAr ? 'لا توجد منتجات' : isEn ? 'No products match filters' : 'Aucun article trouvé'}
              emptyDescription={isAr ? 'جرب تعديل الفلاتر' : 'Try adjusting category or branch filters.'}
            />
          </div>

          {/* Persistent Live POS Checkout Cart Dock */}
          <div className="sq-elev-card w-full xl:w-[340px] shrink-0">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="w-full bg-white dark:bg-[#1C1B1A] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] flex flex-col max-h-[640px] overflow-hidden"
            >
            <div className="px-4 py-3 border-b border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between bg-[#FBF8F5] dark:bg-[#151413]">
              <span className="t-small font-semibold text-black dark:text-white flex items-center gap-2">
                <ShoppingBag size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>{isAr ? `السلة (${cart.length})` : `Panier (${cart.length})`}</span>
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="t-small font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {isAr ? 'تفريغ' : isEn ? 'Clear' : 'Vider'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
              {cart.length === 0 ? (
                <KineticEmptyStateMotion motionKey="mem-shop-cart-empty">
                  <EmptyState
                    variant="compact"
                    icon={<ShoppingBag />}
                    title={isAr ? 'السلة فارغة' : isEn ? 'Cart is empty' : 'Le panier est vide.'}
                    description={isAr ? 'أضف منتجات عبر الصفوف أو البطاقات' : 'Ajoutez un article pour encaisser'}
                  />
                </KineticEmptyStateMotion>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="p-3 bg-[#FBF8F5] dark:bg-[#262422] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold t-small text-black dark:text-white truncate block">
                        {item.product.name}
                      </span>
                      <span className="tabular-nums t-cap text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                        {formatMoney(item.product.price.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        data-sq="check"
                        data-sq-border="solid"
                        className="w-6 h-6 bg-white dark:bg-[#1C1B1A] [--sq-stroke:#D4C8BC] dark:[--sq-stroke:#3A3734] flex items-center justify-center cursor-pointer"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="tabular-nums t-small font-semibold w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        data-sq="check"
                        data-sq-border="solid"
                        className="w-6 h-6 bg-white dark:bg-[#1C1B1A] [--sq-stroke:#D4C8BC] dark:[--sq-stroke:#3A3734] flex items-center justify-center cursor-pointer"
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCart((p) => p.filter((c) => c.product.id !== item.product.id))}
                        className="w-6 h-6 rounded-full text-black/55 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[#E6DED6] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#151413] space-y-3">
              <div className="flex justify-between t-cap items-baseline">
                <span className="text-black/62 dark:text-white/65">{isAr ? 'الإجمالي:' : 'Total à Payer:'}</span>
                <span className="tabular-nums font-semibold t-card text-black dark:text-white">
                  {formatMoney(cartTotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="ctl"
                  data-sq-border="solid"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`p-2 t-small font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    paymentMethod === 'Cash'
                      ? '[--sq-stroke:#d4522f] bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                      : '[--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] text-black/72 dark:text-white/75'
                  }`}
                >
                  <Banknote size={13} />
                  <span>{isAr ? 'نقداً' : 'Espèces'}</span>
                </button>
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="ctl"
                  data-sq-border="solid"
                  onClick={() => setPaymentMethod('Card')}
                  className={`p-2 t-small font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    paymentMethod === 'Card'
                      ? '[--sq-stroke:#d4522f] bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]'
                      : '[--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] text-black/72 dark:text-white/75'
                  }`}
                >
                  <CreditCard size={13} />
                  <span>CIB</span>
                </button>
              </div>
              <AtriumButton
                type="button"
                variant="primary"
                className="w-full justify-center"
                disabled={cart.length === 0}
                onClick={handleCheckout}
                icon={<Receipt size={14} />}
              >
                {isAr ? `تحصيل (${formatMoney(cartTotal)})` : `Encaisser (${formatMoney(cartTotal)})`}
              </AtriumButton>
            </div>
            </div>
          </div>
        </div>
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedProducts.length}
        entityPluralLabel={isAr ? 'منتجات' : isEn ? 'products' : 'articles'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Product>
        isOpen={selectedProduct !== null}
        item={selectedProduct}
        allItems={sortedProducts}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedProduct?.name || ''}
        subtitle={selectedProduct ? `SKU: ${selectedProduct.sku} · ${selectedProduct.category || 'Pro-Shop'}` : undefined}
        avatarText={selectedProduct ? selectedProduct.name.slice(0, 2).toUpperCase() : undefined}
        categoryLabel={selectedProduct?.category || 'Pro-Shop'}
        branchName={
          selectedProduct
            ? resolveRecordBranch(selectedProduct, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          selectedProduct
            ? selectedProduct.stockQuantity <= 0
              ? isAr ? 'نفد' : isEn ? 'Out of stock' : 'Rupture'
              : selectedProduct.stockQuantity <= (selectedProduct.reorderLevel || 5)
              ? isAr ? 'منخفض' : isEn ? 'Low stock' : 'Stock faible'
              : isAr ? 'متوفر' : isEn ? 'In stock' : 'Disponible'
            : undefined
        }
        statusClassName={
          selectedProduct && selectedProduct.stockQuantity <= 0
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
            : selectedProduct && selectedProduct.stockQuantity <= (selectedProduct.reorderLevel || 5)
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'المنتج والتسعير' : isEn ? 'Overview' : 'Fiche & Prix' },
          { id: 'stock', label: isAr ? 'المخزون' : isEn ? 'Inventory' : 'Stock & Seuils' },
          { id: 'cart', label: isAr ? 'السلة والفوترة' : isEn ? 'POS Cart' : 'Panier POS' },
        ]}
        onClose={() => setSelectedProduct(null)}
        onSelectItem={(p) => setSelectedProduct(p)}
        renderBody={(p, activeTab) => {
          const reorder = p.reorderLevel || 5;
          const maxStock = Math.max(reorder * 4, p.stockQuantity, 20);
          const stockPct = Math.round((p.stockQuantity / maxStock) * 100);
          const inCartQty = cart.find((c) => c.product.id === p.id)?.quantity || 0;
          const branchName = resolveRecordBranch(p, branchesById, currentBranch, language).name;

          if (activeTab === 'stock') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'مستوى المخزون' : isEn ? 'Stock Level' : 'Disponibilité en rayon'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'الكمية المتاحة' : 'Stock disponible'}
                      value={`${p.stockQuantity} ${isAr ? 'قطعة' : 'unités'}`}
                      tone={p.stockQuantity <= reorder ? 'danger' : 'ok'}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'حد التنبيه' : 'Seuil réappro'}
                      value={`${reorder} ${isAr ? 'قطعة' : 'unités'}`}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'قيمة المخزون' : 'Valorisation'}
                      value={formatMoney(p.price.amount * p.stockQuantity)}
                      tone="accent"
                      isLast
                    />
                    <InspectorProgressBar
                      percent={stockPct}
                      tone={p.stockQuantity <= 0 ? 'danger' : p.stockQuantity <= reorder ? 'accent' : 'ok'}
                    />
                  </InspectorCard>
                </InspectorSection>

                <InspectorSection index={1} title={isAr ? 'التخزين' : isEn ? 'Warehouse' : 'Emplacement'}>
                  <InspectorCard>
                    <InspectorListItem
                      title={branchName}
                      subtitle={`SKU ${p.sku} · ${p.category || 'Pro-Shop'}`}
                      badge={{ label: p.stockQuantity > reorder ? 'OK' : 'Réappro', tone: p.stockQuantity > reorder ? 'ok' : 'warn' }}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (activeTab === 'cart') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'السلة الحالية' : isEn ? 'Current POS Cart' : 'Statut dans le panier'}>
                  <InspectorBigStat
                    value={formatMoney(cartTotal)}
                    tone={cart.length > 0 ? 'accent' : 'ok'}
                    action={
                      cart.length > 0
                        ? {
                            label: isAr ? 'إتمام البيع الآن' : 'Encaisser maintenant',
                            onClick: handleCheckout,
                          }
                        : undefined
                    }
                  />
                </InspectorSection>

                <InspectorSection index={1} title={isAr ? 'كمية هذا المنتج بالسلة' : 'Quantité sélectionnée'}>
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'في السلة' : 'Dans le panier'} value={`${inCartQty}x`} tone="accent" />
                    <InspectorKeyValue label={isAr ? 'سعر الوحدة' : 'Prix unitaire'} value={formatMoney(p.price.amount)} isLast />
                  </InspectorCard>
                </InspectorSection>

                <InspectorSection index={2}>
                  <InspectorWideButton
                    label={isAr ? 'إضافة إلى السلة' : isEn ? 'Add to Cart' : 'Ajouter au Panier'}
                    icon={<Plus className="w-4 h-4" />}
                    tone="accent"
                    onClick={() => handleAddToCart(p)}
                  />
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'add-cart',
                      label: isAr ? 'إضافة للسلة' : isEn ? 'Add to Cart' : 'Ajouter au panier',
                      icon: <Plus className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => handleAddToCart(p),
                    },
                    {
                      id: 'copy-sku',
                      label: isAr ? 'نسخ الرمز' : isEn ? 'Copy SKU' : 'Copier SKU',
                      icon: <Copy className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        navigator.clipboard?.writeText(p.sku);
                        showToast?.({ type: 'success', title: 'SKU Copié', message: p.sku });
                      },
                    },
                    {
                      id: 'barcode',
                      label: isAr ? 'باركود' : isEn ? 'Barcode' : 'Code-Barres',
                      icon: <Barcode className="w-[18px] h-[18px]" />,
                      onClick: () =>
                        showToast?.({ type: 'info', title: 'Barcode', message: `${p.sku} (${p.name})` }),
                    },
                    {
                      id: 'checkout',
                      label: isAr ? 'تحصيل' : isEn ? 'Checkout' : 'Encaisser',
                      icon: <Receipt className="w-[18px] h-[18px] text-[#096b40]" />,
                      onClick: () => {
                        if (cart.length === 0) handleAddToCart(p);
                        else handleCheckout();
                      },
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'السعر والمواصفات' : isEn ? 'Pricing & Specs' : 'Tarification & Référence'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'سعر البيع' : 'Prix de vente'} value={formatMoney(p.price.amount)} tone="accent" />
                  <InspectorKeyValue label="SKU" value={p.sku} copyText={p.sku} onCopied={(v) => showToast?.({ type: 'success', title: 'Copié', message: v })} />
                  <InspectorKeyValue label={isAr ? 'الفئة' : 'Catégorie'} value={p.category || 'Nutrition & Sport'} mono={false} />
                  <InspectorKeyValue
                    label={isAr ? 'الكمية المتوفرة' : 'Stock dispo'}
                    icon={<Package className="w-[15px] h-[15px]" />}
                    value={`${p.stockQuantity} ${isAr ? 'قطعة' : 'unités'}`}
                    tone={p.stockQuantity <= reorder ? 'danger' : 'ok'}
                    isLast
                  />
                  <InspectorProgressBar
                    percent={stockPct}
                    tone={p.stockQuantity <= 0 ? 'danger' : p.stockQuantity <= reorder ? 'accent' : 'ok'}
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />
    </div>
  );
});

MembershipShopView.displayName = 'MembershipShopView';
