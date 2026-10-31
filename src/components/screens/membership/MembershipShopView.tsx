import React, { useState, useMemo } from 'react';
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
    <div className="space-y-6">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Zap size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {isAr ? 'متجر المكملات والتغذية الرياضية' : 'Pro-Shop & Nutrition Sportive'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {isAr
                  ? 'مبيعات الصندوق المباشرة للبروتين، المكملات، الشيكرز والألبسة الرياضية'
                  : 'Vente au comptoir de protéines, compléments alimentaires, shakers et textile'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative flex-wrap">
            <AtriumButton
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles size={14} className="text-[#C4785A]" />}
              onClick={() => {
                seedDemoInventory();
                showToast({
                  type: 'success',
                  title: 'Inventory Restocked',
                  message: 'Pro-Shop supplements stock replenished.',
                });
              }}
            >
              <span className="hidden sm:inline">{isAr ? 'شحن المخزون' : 'Stock Démo'}</span>
            </AtriumButton>
          </div>
        </div>

        {/* Canonical 3-Card Top Metrics Pod Tray */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'مؤشرات مبيعات المتجر وتدفق الصندوق' : 'Indicateurs Pro-Shop & Rotation de Stock'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {isAr
                ? 'متابعة حركة المخزون، تنبيهات إعادة التوريد وسيولة صندوق المتجر'
                : 'Valorisation des stocks, alertes de réassort et encaissements au comptoir'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {isAr ? 'مبيعات المتجر اليوم' : 'Chiffre d’Affaires Pro-Shop'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    ↗ {products.length} {isAr ? 'أصناف معروضة' : 'articles catalogue'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {formatMoney(cartTotal > 0 ? cartTotal : 34800)}
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {isAr ? 'تنبيهات انخفاض المخزون' : 'Alertes Réapprovisionnement'}
                </span>
                <div className="mt-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      lowStockCount > 0
                        ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-emerald-700 bg-emerald-50'
                    }`}
                  >
                    {lowStockCount > 0 ? `${lowStockCount} sous le seuil d'alerte` : 'Stock Optimal 100%'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {lowStockCount}{' '}
                <span className="text-xs text-neutral-400 font-normal">
                  {isAr ? 'منتجات' : 'références'}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div>
                <span className="text-xs font-medium text-neutral-300">
                  {isAr ? 'قيمة مخزون الصالة الإجمالية' : 'Valorisation Globale Stock'}
                </span>
                <div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
                  <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                    {isAr ? 'أصول الصندوق الجاهزة للبيع' : 'Stock Marchandises'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-white tabular-nums font-mono">
                {formatMoney(totalCatalogInventoryValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Workstation Pod Tray */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          {/* Workstation Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-neutral-500" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {isAr ? 'كتالوج المنتجات والمكملات' : 'Catalogue Pro-Shop & Articles'}
              </span>
              <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
                {filteredProducts.length}
              </span>
            </div>

            {/* Right: Domain Filter Capsules for Product Categories */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs overflow-x-auto max-w-full">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  const label = cat === 'All' ? (isAr ? 'الكل' : 'Tous') : cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : '#71717A',
                      }}
                      className={`px-3 py-1 rounded-full cursor-pointer transition-all whitespace-nowrap ${
                        isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {label}
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
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded border border-[#C4785A]/20">
                      {p.sku}
                    </span>
                  ),
                },
                {
                  id: 'name',
                  header: isAr ? 'المنتج' : 'Désignation Article',
                  renderCell: (p) => (
                    <div>
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-neutral-400">
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
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
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
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.stockQuantity <= 0
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
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
                      <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded">
                        {p.sku}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.stockQuantity <= 0
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {p.stockQuantity} en stock
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {p.category || 'Pro-Shop'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#C4785A]">
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
          <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
            {/* Top Toggle Switch between Cart and Inspector */}
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
              <div className="inline-flex rounded-xl bg-neutral-200/60 dark:bg-neutral-800 p-0.5">
                <button
                  onClick={() => setSidePanelMode('cart')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    sidePanelMode === 'cart'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Panier ({cart.length})
                </button>
                <button
                  onClick={() => setSidePanelMode('inspector')}
                  disabled={!selectedProduct}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                    sidePanelMode === 'inspector'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Fiche Article
                </button>
              </div>

              {selectedProduct && sidePanelMode === 'inspector' && (
                <button
                  onClick={() => setSidePanelMode('cart')}
                  className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {sidePanelMode === 'inspector' && selectedProduct ? (
              /* Product Inspector */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2">
                  <button
                    onClick={() => setInspectorTab('fiche')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                      inspectorTab === 'fiche'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500'
                    }`}
                  >
                    Détails Article
                  </button>
                  <button
                    onClick={() => setInspectorTab('stock')}
                    className={`pb-2 text-xs font-semibold border-b-2 transition-colors px-2 ${
                      inspectorTab === 'stock'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500'
                    }`}
                  >
                    Niveau Stock
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                    <span className="text-[10px] text-neutral-400 font-mono">SKU: {selectedProduct.sku}</span>
                    <h3 className="text-base font-bold text-white">{selectedProduct.name}</h3>
                    <div className="text-2xl font-black font-mono text-[#FB923C]">
                      {formatMoney(selectedProduct.price.amount)}
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Catégorie:</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{selectedProduct.category || 'Nutrition'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Stock en rayon:</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{selectedProduct.stockQuantity} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Seuil de réappro:</span>
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">{selectedProduct.reorderLevel || 5} pcs</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
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
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">Articles ({cart.length})</span>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-[11px] text-red-500 hover:underline"
                      >
                        Vider
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center text-neutral-400 text-xs">
                      <ShoppingBag size={32} className="text-neutral-300 dark:text-neutral-700 mb-2" />
                      <p>Le panier est vide.</p>
                      <span className="text-[10px] text-neutral-500 mt-1">Cliquez sur "+ Panier" pour ajouter des articles</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-neutral-900 dark:text-white truncate block">
                              {item.product.name}
                            </span>
                            <span className="font-mono text-[11px] text-[#C4785A]">
                              {formatMoney(item.product.price.amount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleUpdateQty(item.product.id, -1)}
                              className="w-6 h-6 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xs"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="font-mono text-xs font-bold w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQty(item.product.id, 1)}
                              className="w-6 h-6 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xs"
                            >
                              <Plus size={10} />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.product.id)}
                              className="w-6 h-6 rounded text-neutral-400 hover:text-red-500 flex items-center justify-center ml-1"
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
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Total à Payer:</span>
                    <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">
                      {formatMoney(cartTotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod('Cash')}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'Cash'
                          ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <Banknote size={13} />
                      <span>Espèces</span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('Card')}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'Card'
                          ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A]'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
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
  </div>
  );
};
