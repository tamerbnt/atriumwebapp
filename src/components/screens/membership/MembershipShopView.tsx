import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Search,
  Package,
  Receipt,
  CheckCircle2,
  Dumbbell,
  Tag,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

interface CartItem {
  product: Product;
  quantity: number;
}

export const MembershipShopView: React.FC = () => {
  const { language, isRtl } = useTranslation();
  const { products, processSale, currentBusiness, currentBranch } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');

  // Filter products for gym / fitness pro-shop
  const gymProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category || 'General'));
    return ['All', ...Array.from(set)];
  }, [products]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price.amount * item.quantity, 0);
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    processSale(
      cart.map((i) => ({ product: i.product, quantity: i.quantity })),
      paymentMethod,
      undefined,
      'Pro Shop Gym Sale',
      { customerName: 'Pro Shop Walk-in Member' }
    );
    setCart([]);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تمت عملية البيع بنجاح' : language === 'fr' ? 'Vente validée' : 'Sale Completed',
      message: `${formatMoney(totalAmount, language)} (${paymentMethod})`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المتجر الرياضي والمكملات' : language === 'fr' ? 'Boutique Pro-Shop & Nutrition' : 'Club Pro Shop & Nutrition'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {products.length} {language === 'ar' ? 'منتجات، مكملات غذائية وإكسسوارات تدريب' : language === 'fr' ? 'articles en stock (protéines, boissons, équipements)' : 'items in stock'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث عن منتج...' : 'Recherche produit...'}
              openWidth={260}
              shutSize={36}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Products on Left, Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {gymProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white dark:bg-[#18181B] rounded-[22px] p-4 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/50 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mb-2">
                  <span>{p.sku}</span>
                  <span className={p.stockQuantity <= 5 ? 'text-amber-600 font-bold' : ''}>
                    Stock: {p.stockQuantity}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white group-hover:text-[#C4785A] transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                  {p.category}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-sm font-black text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(p.price.amount, language)}
                </span>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center font-bold text-xs"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pro Shop Cart */}
        <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-[#C4785A]" />
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'سلة المشتريات' : language === 'fr' ? 'Panier Pro-Shop' : 'Current Cart'}
                </h2>
              </div>
              <span className="text-xs font-bold text-neutral-400">
                {cart.length} {language === 'ar' ? 'عناصر' : language === 'fr' ? 'articles' : 'items'}
              </span>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-y-auto mt-2">
              {cart.map((item) => (
                <div key={item.product.id} className="py-3 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-neutral-900 dark:text-white block truncate">
                      {item.product.name}
                    </span>
                    <span className="text-neutral-400 text-[11px]">
                      {formatMoney(item.product.price.amount, language)} × {item.quantity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="px-2 font-mono font-bold text-[11px]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-neutral-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-12 text-center text-xs text-neutral-400">
                  {language === 'ar' ? 'السلة فارغة. اختر منتجا للإضافة.' : 'Panier vide. Cliquez sur un article.'}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex justify-between items-center text-sm font-bold">
              <span>Total à régler:</span>
              <span className="text-xl font-black text-[#C4785A] tabular-nums">
                {formatMoney(totalAmount, language)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  paymentMethod === 'Cash'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                Espèces (Cash)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Card')}
                className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  paymentMethod === 'Card'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                Carte Dahabia
              </button>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              Encaisser la vente ({formatMoney(totalAmount, language)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
