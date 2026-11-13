import React, { useState, useMemo } from 'react';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  CheckCircle2,
  Package,
  Receipt,
  Home,
  ChevronDown,
  Building2,
  Check,
  Sparkles,
  Barcode,
  Printer,
  Zap,
  Tag,
  AlertTriangle,
  UserCheck,
  Eye,
  Share2,
  X,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonPosRegister } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export const MembershipShopView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const {
    products,
    members,
    currentBranch,
    branches,
    businesses,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    processSale,
    seedDemoInventory,
    showToast,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'BankTransfer'>('Cash');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'fiche' | 'stock' | 'fournisseur'>('fiche');
  const [sidePanelMode, setSidePanelMode] = useState<'cart' | 'inspector'>('cart');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory === 'All') return true;
      return p.category === selectedCategory;
    });
  }, [products, selectedCategory]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= (p.reorderLevel || 5)).length;
  }, [products]);

  const totalCatalogInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.price.amount * p.stockQuantity, 0);
  }, [products]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price.amount * item.quantity, 0);
  }, [cart]);

  const cartDiscount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount, 0);
  }, [cart]);

  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      showToast({
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
          showToast({
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
    setSidePanelMode('cart');
  };

  const handleUpdateQty = (productId: string, delta: number) => {
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
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const saleItems = cart.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      discount: item.discount,
    }));

    const newSale = processSale(saleItems, paymentMethod, selectedMemberId || undefined);

    setCart([]);
    setSelectedMemberId('');

    showToast({
      type: 'success',
      title: isAr ? 'تمت عملية البيع بنجاح' : 'Vente Clôturée avec Succès',
      message: `${isAr ? 'وصل رقم' : 'Ticket'} #${newSale.id.slice(-6).toUpperCase()} · ${formatMoney(cartTotal)}`,
    });
  };

  const getProductActions = (p: Product): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة المنتج' : 'Consulter Article',
      icon: <Eye size={14} />,
      onClick: () => {
        setSelectedProduct(p);
        setSidePanelMode('inspector');
      },
    },
    {
      label: isAr ? 'إضافة للسلة' : '+ Panier',
      icon: <Plus size={14} />,
      onClick: () => handleAddToCart(p),
    },
    {
      label: isAr ? 'باركود' : 'Code-Barres',
      icon: <Barcode size={14} />,
      onClick: () => {
        showToast({
          type: 'info',
          title: 'Étiquette Barcode',
          message: `Impression étiquette EAN pour ${p.sku}`,
        });
      },
    },
  ];

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
    <div className="space-y-6 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white">
            <Zap size={22} />
          </div>
          <div>
            <h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-[0.98] rtl:leading-tight tracking-[0.012em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {isAr ? 'المتجر' : language === 'en' ? 'Pro Shop' : 'Boutique'}
            </h1>
          </div>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
        <div>
          <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
            {isAr ? 'مؤشرات مبيعات المتجر وتدفق الصندوق' : 'Indicateurs Pro-Shop & Rotation de Stock'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
            <div>
              <span className="text-[12px] font-medium text-black/68 dark:text-white/72">
                {isAr ? 'مبيعات المتجر اليوم' : 'Chiffre d’Affaires Pro-Shop'}
              </span>
              <div className="mt-1.5">
                <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md tabular-nums">
                  ↗ {products.length} {isAr ? 'أصناف معروضة' : 'articles catalogue'}
                </span>
              </div>
            </div>
            <div className="text-[26px] lg:text-[28px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {formatMoney(cartTotal > 0 ? cartTotal : 34800)}
            </div>
          </div>

          <div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
            <div>
              <span className="text-[12px] font-medium text-black/68 dark:text-white/72">
                {isAr ? 'تنبيهات انخفاض المخزون' : 'Alertes Réapprovisionnement'}
              </span>
              <div className="mt-1.5">
                <span
                  className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md tabular-nums ${
                    lowStockCount > 0
                      ? 'text-amber-700 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/40'
                      : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40'
                  }`}
                >
                  {lowStockCount > 0 ? `${lowStockCount} sous le seuil d'alerte` : 'Stock Optimal 100%'}
                </span>
              </div>
            </div>
            <div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {lowStockCount}{' '}
              <span className="text-xs font-sans text-black/62 dark:text-white/65 font-normal">
                {isAr ? 'منتجات' : 'références'}
              </span>
            </div>
          </div>

          <div className="p-4.5 sm:p-5 rounded-[18px] bg-[#1F1D1B] border border-white/[0.08] text-white flex flex-col justify-between min-h-[132px] shadow-sm">
            <div>
              <span className="text-[12px] font-medium text-white/75">
                {isAr ? 'قيمة مخزون الصالة الإجمالية' : 'Valorisation Globale Stock'}
              </span>
              <div className="text-[10.5px] text-[#FB923C] font-semibold mt-1.5">
                <span className="bg-[#3D2817] border border-[#FB923C]/25 px-2 py-0.5 rounded-md inline-block">
                  {isAr ? 'أصول الصندوق الجاهزة للبيع' : 'Stock Marchandises'}
                </span>
              </div>
            </div>
            <div className="text-[26px] lg:text-[28px] leading-[0.95] font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
              {formatMoney(totalCatalogInventoryValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs">
        {/* Workstation Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={16} className="text-black/62 dark:text-white/65" />
            <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
              {isAr ? 'كتالوج المنتجات والمكملات' : 'Catalogue Pro-Shop & Articles'}
            </h2>
          </div>

          {/* Right: Domain Filter Capsules for Product Categories */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <div className="flex items-center p-0.5 rounded-xl bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] gap-0.5 text-xs font-semibold shadow-2xs overflow-x-auto max-w-full">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const compact = cat === 'All'
                  ? { label: isAr ? 'الكل' : 'Tous', tooltip: isAr ? 'جميع الفئات' : 'Toutes les catégories' }
                  : compactFilterLabel(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    title={compact.tooltip || cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#d4522f]/12 text-[#d4522f] dark:bg-[#d4522f]/20 dark:text-[#FB923C] font-bold'
                        : 'text-black/68 dark:text-white/72 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {compact.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

          {/* Main Collection Area + 390px Inspector / Cart Drawer */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 w-full">
            <UniversalDataCollection<Product>
              title={isAr ? 'كتالوج المنتجات والمكملات' : 'Catalogue Pro-Shop & Articles'}
              subtitle={isAr ? 'التغذية، المكملات والإكسسوارات الرياضية' : 'Gestion des références, prix de vente et rotation'}
              items={filteredProducts}
              keyExtractor={(p) => p.id}
              isLoading={isSyncing || networkMode === 'force_skeleton'}
              isOffline={networkMode === 'offline'}
              isTimedOut={isSyncTimeout}
              lastSyncedAt={lastSyncedAt}
              onRetrySync={retryCloudSync}
              searchPlaceholder={isAr ? 'بحث بالاسم، الكود، الفئة...' : 'Rechercher article, SKU, marque, catégorie...'}
              searchFilter={(p, query) =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.sku.toLowerCase().includes(query.toLowerCase()) ||
                (p.category || '').toLowerCase().includes(query.toLowerCase())
              }
              onSelectRow={(p) => {
                setSelectedProduct(p);
                setSidePanelMode('inspector');
              }}
              customActions={(p) => getProductActions(p)}
              columns={[
                {
                  id: 'sku',
                  header: 'SKU / Réf',
                  width: '120px',
                  sortable: true,
                  renderCell: (p) => (
                    <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded border border-[#d4522f]/20">
                      {p.sku}
                    </span>
                  ),
                },
                {
                  id: 'name',
                  header: isAr ? 'المنتج' : 'Désignation Article',
                  renderCell: (p) => (
                    <div>
                      <span className="font-bold text-xs text-black dark:text-white block">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-black/62 dark:text-white/65">
                        {p.category || 'Fitness & Nutrition'}
                      </span>
                    </div>
                  ),
                },
                {
                  id: 'price',
                  header: isAr ? 'السعر' : 'Prix Vente',
                  width: '130px',
                  sortable: true,
                  renderCell: (p) => (
                    <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
                      {formatMoney(p.price.amount)}
                    </span>
                  ),
                },
                {
                  id: 'stock',
                  header: isAr ? 'المخزون' : 'Stock Dispo',
                  width: '120px',
                  sortable: true,
                  renderCell: (p) => {
                    const isLow = p.stockQuantity <= (p.reorderLevel || 5);
                    return (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums ${
                          p.stockQuantity <= 0
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {p.stockQuantity} unités
                      </span>
                    );
                  },
                },
                {
                  id: 'action',
                  header: isAr ? 'إجراء' : 'Comptoir',
                  width: '120px',
                  renderCell: (p) => (
                    <AtriumButton
                      size="xs"
                      variant="primary"
                      onClick={() => handleAddToCart(p)}
                      icon={<Plus size={12} />}
                    >
                      {isAr ? 'شراء' : '+ Panier'}
                    </AtriumButton>
                  ),
                },
              ]}
              renderCard={(p) => {
                const isLow = p.stockQuantity <= (p.reorderLevel || 5);
                return (
                  <div className="p-4 flex flex-col justify-between h-full space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded-md">
                        {p.sku}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md tabular-nums ${
                          p.stockQuantity <= 0
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {p.stockQuantity} en stock
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-black dark:text-white line-clamp-2">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-black/62 dark:text-white/65 mt-0.5">
                        {p.category || 'Pro-Shop'}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#E6DED6]/60 dark:border-[#3A3734] flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#d4522f] tabular-nums">
                        {formatMoney(p.price.amount)}
                      </span>
                      <AtriumButton
                        size="xs"
                        variant="primary"
                        onClick={() => handleAddToCart(p)}
                        icon={<Plus size={11} />}
                      >
                        + Panier
                      </AtriumButton>
                    </div>
                  </div>
                );
              }}
            />
          </div>

          {/* 390px Side Inspector / Cart Drawer */}
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-[#1C1B1A] rounded-2xl border border-[#E6DED6] dark:border-[#3A3734] shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Top Toggle Switch between Cart and Inspector */}
            <div className="p-3 border-b border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between bg-[#FBF8F5] dark:bg-[#151413]">
              <div className="inline-flex rounded-xl bg-[#F3EDE7] dark:bg-[#262422] p-0.5 border border-[#E6DED6]/60 dark:border-[#3A3734]">
                <button
                  onClick={() => setSidePanelMode('cart')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sidePanelMode === 'cart'
                      ? 'bg-white dark:bg-[#1C1B1A] text-[#d4522f] shadow-xs'
                      : 'text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Panier ({cart.length})
                </button>
                <button
                  onClick={() => setSidePanelMode('inspector')}
                  disabled={!selectedProduct}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                    sidePanelMode === 'inspector'
                      ? 'bg-white dark:bg-[#1C1B1A] text-[#d4522f] shadow-xs'
                      : 'text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Fiche Article
                </button>
              </div>

              {selectedProduct && sidePanelMode === 'inspector' && (
                <button
                  onClick={() => setSidePanelMode('cart')}
                  className="w-7 h-7 rounded-lg hover:bg-[#F3EDE7] dark:hover:bg-[#262422] flex items-center justify-center text-black/62 dark:text-white/65 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {sidePanelMode === 'inspector' && selectedProduct ? (
              /* Product Inspector */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex border-b border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#1C1B1A] px-3 pt-2 gap-2">
                  <button
                    onClick={() => setInspectorTab('fiche')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 cursor-pointer ${
                      inspectorTab === 'fiche'
                        ? 'border-[#d4522f] text-[#d4522f]'
                        : 'border-transparent text-black/62 dark:text-white/65'
                    }`}
                  >
                    Détails Article
                  </button>
                  <button
                    onClick={() => setInspectorTab('stock')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 cursor-pointer ${
                      inspectorTab === 'stock'
                        ? 'border-[#d4522f] text-[#d4522f]'
                        : 'border-transparent text-black/62 dark:text-white/65'
                    }`}
                  >
                    Niveau Stock
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  <div className="p-4 bg-[#1F1D1B] border border-white/[0.08] rounded-xl text-white space-y-2 shadow-sm">
                    <span className="text-[11px] text-white/75 font-mono">SKU: {selectedProduct.sku}</span>
                    <h3 className="text-base font-bold text-white">{selectedProduct.name}</h3>
                    <div className="text-2xl font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                      {formatMoney(selectedProduct.price.amount)}
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FBF8F5] dark:bg-[#262422] rounded-xl border border-[#E6DED6] dark:border-[#3A3734] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black/62 dark:text-white/65">Catégorie:</span>
                      <span className="font-semibold text-black dark:text-white">{selectedProduct.category || 'Nutrition'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/62 dark:text-white/65">Stock en rayon:</span>
                      <span className="font-mono font-bold text-black dark:text-white tabular-nums">{selectedProduct.stockQuantity} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/62 dark:text-white/65">Seuil de réappro:</span>
                      <span className="font-mono text-black/72 dark:text-white/75 tabular-nums">{selectedProduct.reorderLevel || 5} pcs</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-[#E6DED6] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#151413] space-y-2">
                  <AtriumButton
                    variant="primary"
                    className="w-full justify-center"
                    icon={<Plus size={14} />}
                    onClick={() => handleAddToCart(selectedProduct)}
                  >
                    Ajouter au Panier
                  </AtriumButton>
                </div>
              </div>
            ) : (
              /* POS Cart Panel */
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E6DED6]/60 dark:border-[#3A3734]">
                    <span className="text-xs font-bold text-black dark:text-white">Articles ({cart.length})</span>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Vider
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center text-black/62 dark:text-white/65 text-xs">
                      <ShoppingBag size={32} className="text-black/45 dark:text-white/45 mb-2" />
                      <p>Le panier est vide.</p>
                      <span className="text-[11px] text-black/62 dark:text-white/65 mt-1">Cliquez sur "+ Panier" pour ajouter des articles</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-2.5 rounded-xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-black dark:text-white truncate block">
                              {item.product.name}
                            </span>
                            <span className="font-mono text-[11px] text-[#d4522f] tabular-nums">
                              {formatMoney(item.product.price.amount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleUpdateQty(item.product.id, -1)}
                              className="w-6 h-6 rounded-md bg-white dark:bg-[#1C1B1A] border border-[#D4C8BC] dark:border-[#3A3734] flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="font-mono text-xs font-bold w-4 text-center tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQty(item.product.id, 1)}
                              className="w-6 h-6 rounded-md bg-white dark:bg-[#1C1B1A] border border-[#D4C8BC] dark:border-[#3A3734] flex items-center justify-center text-xs cursor-pointer"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.product.id)}
                              className="w-6 h-6 rounded-md text-black/62 dark:text-white/65 hover:text-rose-600 flex items-center justify-center ml-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checkout Section */}
                <div className="p-4 border-t border-[#E6DED6] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#151413] space-y-3">
                  <div className="flex justify-between text-xs items-baseline">
                    <span className="text-black/62 dark:text-white/65">Total à Payer:</span>
                    <span className="font-mono font-bold text-base text-black dark:text-white tabular-nums">
                      {formatMoney(cartTotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod('Cash')}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        paymentMethod === 'Cash'
                          ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                          : 'border-[#E6DED6] dark:border-[#3A3734] text-black/72 dark:text-white/75'
                      }`}
                    >
                      <Banknote size={13} />
                      <span>Espèces</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('Card')}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        paymentMethod === 'Card'
                          ? 'border-[#d4522f] bg-[#d4522f]/10 text-[#d4522f]'
                          : 'border-[#E6DED6] dark:border-[#3A3734] text-black/72 dark:text-white/75'
                      }`}
                    >
                      <CreditCard size={13} />
                      <span>Carte CIB/Edahabia</span>
                    </button>
                  </div>

                  <AtriumButton
                    variant="primary"
                    className="w-full justify-center"
                    disabled={cart.length === 0}
                    onClick={handleCheckout}
                    icon={<Receipt size={14} />}
                  >
                    Encaisser ({formatMoney(cartTotal)})
                  </AtriumButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
