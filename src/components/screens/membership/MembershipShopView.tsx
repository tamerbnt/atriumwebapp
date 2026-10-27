import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Search,
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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export const MembershipShopView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    products,
    members,
    staff,
    currentBranch,
    branches,
    businesses,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    processSale,
    seedDemoInventory,
    showToast,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'BankTransfer'>('Cash');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ id: string; total: number; date: string } | null>(null);

  // Filter gym products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Metrics
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= (p.reorderLevel || 5)).length;
  }, [products]);

  const totalCatalogInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.price.amount * p.stockQuantity, 0);
  }, [products]);

  // Cart math
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price.amount * item.quantity, 0);
  }, [cart]);

  const cartDiscount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount, 0);
  }, [cart]);

  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

  // Cart actions
  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      showToast({
        type: 'warning',
        title: language === 'ar' ? 'نفاد الكمية' : 'Rupture de Stock',
        message: `${product.name} ${language === 'ar' ? 'غير متوفر حالياً' : 'est en rupture de stock.'}`,
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

    setLastReceipt({
      id: newSale.id.slice(-6).toUpperCase(),
      total: cartTotal,
      date: new Date().toLocaleTimeString(),
    });

    setCart([]);
    setSelectedMemberId('');

    showToast({
      type: 'success',
      title: language === 'ar' ? 'تمت عملية البيع بنجاح' : 'Vente Clôturée avec Succès',
      message: `${language === 'ar' ? 'وصل رقم' : 'Ticket'} #${newSale.id.slice(-6).toUpperCase()} · ${formatMoney(cartTotal)}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Outer Workspace Panel matching Desktop Spec (rounded-28, white background, subtle border) */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        {/* Row 0: Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Zap size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {language === 'ar' ? 'متجر المكملات والتغذية الرياضية' : language === 'fr' ? 'Pro-Shop & Nutrition Sportive' : 'Gym Pro-Shop & Nutrition'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar'
                  ? 'مبيعات الصندوق المباشرة للبروتين، المكملات، الشيكرز والألبسة الرياضية.'
                  : language === 'fr'
                  ? 'Vente au comptoir de protéines, compléments alimentaires, shakers et textile.'
                  : 'Counter sales of protein, fitness supplements, accessories, and gym apparel.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative flex-wrap">
            {/* Facility Pill: Branch Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Club Principal'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'فروع النادي' : 'Clubs & Complexes'}
                  </div>
                  {businesses.map((biz) => {
                    const isCurrent = biz.id === currentBusinessId;
                    const matchingBranch = branches.find((b) => b.businessId === biz.id);
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          switchBusiness(biz.id);
                          if (matchingBranch) switchBranch(matchingBranch.id);
                          setIsFacilityDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                          <span className="truncate">{biz.name}</span>
                        </div>
                        {isCurrent && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Seed Demo Inventory */}
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
                  message: 'Pro-Shop supplements and merchandise demo stock replenished.',
                });
              }}
              title={language === 'ar' ? 'إعادة شحن المخزون' : 'Réapprovisionner Stock'}
            >
              <span className="hidden sm:inline">
                {language === 'ar' ? 'شحن المخزون' : 'Stock Démo'}
              </span>
            </AtriumButton>
          </div>
        </div>

        {/* Row 1: Top Metrics Pod Tray matching Desktop Spec */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'مؤشرات مبيعات المتجر وتدفق الصندوق' : 'Indicateurs Pro-Shop & Rotation de Stock'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {language === 'ar'
                ? 'متابعة حركة المخزون، تنبيهات إعادة التوريد وسيولة صندوق المتجر'
                : 'Valorisation des stocks, alertes de réassort et encaissements au comptoir'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Today Pro-Shop Turnover */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'مبيعات المتجر اليوم' : 'Chiffre d\'Affaires Pro-Shop'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    ↗ {products.length} {language === 'ar' ? 'أصناف معروضة' : 'articles au catalogue'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {formatMoney(cartTotal > 0 ? cartTotal : 34800)}
              </div>
            </div>

            {/* Card 2: Low Stock Warnings */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'تنبيهات انخفاض المخزون' : 'Alertes Réapprovisionnement'}
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
                  {language === 'ar' ? 'منتجات' : 'références'}
                </span>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
                <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                  <path
                    d="M10 65 L35 50 L60 55 L85 25 L110 30 L135 12"
                    stroke="#FB923C"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="135" cy="12" r="4" fill="#FB923C" />
                </svg>
              </div>

              <div>
                <span className="text-xs font-medium text-neutral-300">
                  {language === 'ar' ? 'قيمة مخزون الصالة الإجمالية' : 'Valorisation Globale du Stock'}
                </span>
                <div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
                  <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                    {language === 'ar' ? 'أصول الصندوق الجاهزة للبيع' : 'Stock Marchandises (DZD)'}
                  </span>
                </div>
              </div>

              <div className="text-2xl font-black text-white tabular-nums font-mono">
                {formatMoney(totalCatalogInventoryValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Bottom Workstation Pod Tray (Catalog + POS Cart Terminal) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[#C4785A]" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'محطة بيع المكملات السريعة' : 'Caisse Tactile & Catalogue Nutrition'}
              </h3>
            </div>

            {/* Seek Search Bar */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم، الباركود أو الصنف...' : 'Recherche par produit, SKU ou catégorie...'}
            />
          </div>

          {/* Category Filter Capsules */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#C4785A] text-white shadow-xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-[#E9EEF0] dark:border-neutral-700/60 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                {cat === 'All' ? (language === 'ar' ? 'كافة الأصناف' : 'Tous les Articles') : cat}
              </button>
            ))}
          </div>

          {/* Split Workstation Layout: 7 cols Catalog / 5 cols Cart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Catalog Grid (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  const isLow = p.stockQuantity <= (p.reorderLevel || 5);

                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between hover:border-[#C4785A]/40 transition-all group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                            {p.category || 'Nutrition'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                : isLow
                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}
                          >
                            {p.stockQuantity} {language === 'ar' ? 'قطعة' : 'en stock'}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1 group-hover:text-[#C4785A] transition-colors">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 font-mono">
                          {p.sku}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-neutral-100 dark:border-neutral-750">
                        <div className="text-base font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                          {formatMoney(p.price.amount)}
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(p)}
                          className="h-8 px-3 rounded-xl bg-[#FCEEE8] dark:bg-neutral-700 hover:bg-[#C4785A] text-[#C4785A] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                          <span>{language === 'ar' ? 'إضافة' : 'Ajouter'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart & Ticket Register Station (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-neutral-800 rounded-[20px] p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-750">
                  <div className="flex items-center gap-2">
                    <Receipt size={17} className="text-[#C4785A]" />
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {language === 'ar' ? 'تذكرة البيع الحالية' : 'Ticket de Caisse en Cours'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                    {cart.reduce((a, b) => a + b.quantity, 0)} {language === 'ar' ? 'عناصر' : 'articles'}
                  </span>
                </div>

                {/* Member linking selector */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                    {language === 'ar' ? 'ربط بحساب مشترك (اختياري)' : 'Associer à un Adhérent (Optionnel)'}
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs px-3 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:border-[#C4785A]"
                  >
                    <option value="">
                      {language === 'ar' ? 'زبون عابر (بدون ملف)' : 'Client de passage (sans compte)'}
                    </option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.phoneNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cart Items List */}
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400 space-y-2">
                      <ShoppingBag size={28} className="mx-auto opacity-30" />
                      <p className="text-xs">
                        {language === 'ar' ? 'انقر على المنتجات لإضافتها للتذكرة' : 'Sélectionnez des articles pour débuter le ticket'}
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product.id} className="pt-2 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                            {item.product.name}
                          </h5>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {formatMoney(item.product.price.amount)} x {item.quantity}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, 1)}
                            className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.product.id)}
                            className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer ml-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Payment Block */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-750">
                {/* Payment Tender Selectors */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Cash', 'Card', 'BankTransfer'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        paymentMethod === method
                          ? 'bg-[#C4785A] text-white shadow-2xs'
                          : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {method === 'Cash' ? (
                        <>
                          <Banknote size={12} />
                          <span>{language === 'ar' ? 'نقداً' : 'Espèces'}</span>
                        </>
                      ) : method === 'Card' ? (
                        <>
                          <CreditCard size={12} />
                          <span>{language === 'ar' ? 'ذهبية' : 'Dahabia'}</span>
                        </>
                      ) : (
                        <>
                          <Zap size={12} />
                          <span>{language === 'ar' ? 'بريدي' : 'Baridi'}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {/* Total and Checkout */}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-bold text-neutral-500">
                    {language === 'ar' ? 'الإجمالي للدفع:' : 'Net à Payer :'}
                  </span>
                  <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono text-[#C4785A]">
                    {formatMoney(cartTotal)}
                  </span>
                </div>

                <AtriumButton
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  icon={<Check size={16} strokeWidth={2.5} />}
                >
                  <span>
                    {language === 'ar' ? 'إتمام وقبض الفاتورة' : 'Valider & Encaisser le Ticket'}
                  </span>
                </AtriumButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
