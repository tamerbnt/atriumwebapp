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
  User,
  Download,
  LayoutGrid,
  List,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  X,
  Check,
  AlertTriangle,
  Sparkles,
  Barcode,
  Printer,
  Laptop,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { Product } from '../../types/index';
import { formatMoney } from '../../utils/rules';
import { Modal } from '../ui/Modal';

interface CartItem {
  product: Product;
  quantity: number;
}

export const ShopScreen: React.FC = () => {
  const {
    products,
    members,
    staff,
    terminology,
    currentBranch,
    currentBusiness,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    processSale,
    addProduct,
    openDesktopUpgradeModal,
  } = useAtriumStore();

  const isSalon = currentBusiness.category === 'appointment_service';

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'MemberBalance'>('Cash');
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // New product fields
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<string>(
    isSalon ? 'Hair Care' : 'Supplement'
  );
  const [newProductSku, setNewProductSku] = useState('PROD-');
  const [newProductPrice, setNewProductPrice] = useState(2500);
  const [newProductStock, setNewProductStock] = useState(25);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    if (isSalon) {
      ['Hair Care', 'Skin Care', 'Beauty Products', 'Nails & Spa', 'Accessories'].forEach((c) => set.add(c));
    } else {
      ['Supplement', 'Equipment', 'Beverage', 'Service'].forEach((c) => set.add(c));
    }
    return Array.from(set);
  }, [products, isSalon]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  const totalInventoryValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.price.amount * p.stockQuantity, 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5).length;
  }, [products]);

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
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

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price.amount * item.quantity, 0);
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const assignedStaff = staff.find((s) => s.id === selectedStaffId);
    const notes = assignedStaff ? `Serviced by: ${assignedStaff.fullName}` : undefined;
    const sale = processSale(cart, paymentMethod, selectedMemberId || undefined, notes);
    setCompletedSale(sale);
    setCart([]);
    setIsCheckoutModalOpen(false);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    addProduct({
      name: newProductName,
      category: newProductCategory,
      sku: newProductSku || `SKU-${Date.now().toString().slice(-4)}`,
      description: `${newProductCategory} product for athletes`,
      price: { amount: Number(newProductPrice), currency: 'DZD' },
      cost: { amount: Math.round(Number(newProductPrice) * 0.65), currency: 'DZD' },
      stockQuantity: Number(newProductStock),
      reorderLevel: 5,
      isActive: true,
      isPinned: false,
    });

    setIsAddProductModalOpen(false);
    setNewProductName('');
  };

  const handleExportCSV = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Price (DA)', 'Stock Quantity', 'Valuation (DA)'];
    const rows = filteredProducts.map((p) => [
      `"${p.name}"`,
      `"${p.sku}"`,
      `"${p.category}"`,
      `"${p.price.amount}"`,
      `"${p.stockQuantity}"`,
      `"${p.price.amount * p.stockQuantity}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-shop-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Row 0: Top Header matching Desktop App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {terminology.shop} POS Register
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Point of sale checkout register, retail inventory, and athlete replenishment for {currentBranch?.name || 'Atrium 1'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Switch Facility
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
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
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

          {/* Add Product Button */}
          <button
            type="button"
            onClick={() => setIsAddProductModalOpen(true)}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Row 1: Inventory & POS Health Banner Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Inventory Valuation & Checkout Velocity
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Stock reserves, restock thresholds, and instant retail register liquidity
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Stock Valuation — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                Inventory Retail Valuation
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ 98% En Stock
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(totalInventoryValuation)}
            </div>
          </div>

          {/* Tile 2: Low Stock Alerts — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                Restock Reorder Alerts
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  {lowStockCount} articles sous seuil
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {products.length}{' '}
              <span className="text-xs font-normal text-neutral-400">références SKU</span>
            </div>
          </div>

          {/* Tile 3: Dark Obsidian Card */}
          <div className="p-5 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div>
              <span className="text-xs font-medium text-neutral-300">
                Barcode Terminal State
              </span>
              <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                Quick-scan Optical Reader Ready
              </div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Caisse Connectée
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: POS Catalog & Live Register Split Master Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <Package size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              Inventory Catalog
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {filteredProducts.length} items
            </span>
          </div>

          {/* Right Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Circular Search Button */}
            <div className="relative flex items-center">
              {isSearchActive ? (
                <div className="flex items-center animate-in fade-in duration-150">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product name, SKU, barcode..."
                    className="h-9 px-3 text-xs rounded-full border border-[#E9EEF0] dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] w-52 text-neutral-900 dark:text-white shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchActive(false);
                      setSearchQuery('');
                    }}
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 ml-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchActive(true)}
                  className="w-9 h-9 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
                  title="Search inventory"
                >
                  <Search size={14} />
                </button>
              )}
            </div>

            {/* Category Segmented Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs overflow-x-auto">
              {categories.map((cat) => {
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Export Data Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-full border border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              title="Download CSV inventory"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* Catalog & Cart 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Catalog Area (2 cols) */}
          <div className="lg:col-span-2">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`p-5 rounded-[20px] border transition-all flex flex-col justify-between h-[210px] shadow-2xs ${
                        isOutOfStock
                          ? 'opacity-50 cursor-not-allowed border-[#E9EEF0] dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/20'
                          : 'cursor-pointer border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 hover:border-[#D5DFE3] dark:hover:border-neutral-600 hover:shadow-xs group'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full font-bold">
                            {product.sku}
                          </span>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              isOutOfStock ? 'text-rose-600' : 'text-neutral-500'
                            }`}
                          >
                            {isOutOfStock ? 'Sold Out' : `${product.stockQuantity} in stock`}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-[#C4785A] transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-xs text-[#52525B] dark:text-neutral-400 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#EDF1F3] dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-base font-black text-neutral-900 dark:text-white tabular-nums">
                          {formatMoney(product.price.amount, product.price.currency)}
                        </span>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          style={{
                            backgroundColor: isOutOfStock
                              ? 'var(--color-border)'
                              : '#FCEEE8',
                            color: isOutOfStock ? '#999' : 'var(--color-accent)',
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-105 transition-transform"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Catalog Table View */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-neutral-200/60 dark:border-neutral-800/80 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider h-11">
                      <th className="px-4">Product Name</th>
                      <th className="px-3">SKU</th>
                      <th className="px-3">Category</th>
                      <th className="px-3">Stock Level</th>
                      <th className="px-3">Price</th>
                      <th className="px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/60">
                    {filteredProducts.map((product) => {
                      const isOutOfStock = product.stockQuantity <= 0;
                      return (
                        <tr
                          key={product.id}
                          className="h-16 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-xs text-neutral-900 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-neutral-400">{product.description}</div>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-neutral-500">
                            {product.sku}
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs font-bold tabular-nums">
                            {product.stockQuantity}
                          </td>
                          <td className="px-3 py-3 text-sm font-black tabular-nums text-neutral-900 dark:text-white">
                            {formatMoney(product.price.amount)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => addToCart(product)}
                              style={{ backgroundColor: 'var(--color-accent)' }}
                              className="h-8 px-3 rounded-full text-xs font-bold text-white hover:opacity-90 disabled:opacity-40 cursor-pointer shadow-xs inline-flex items-center gap-1"
                            >
                              <Plus size={13} />
                              <span>Add</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Live POS Register Order Cart Panel */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between min-h-[460px] sticky top-24 shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F3] dark:border-neutral-700/80">
                <div className="flex items-center gap-2">
                  <Receipt size={17} className="text-[#C4785A]" />
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    POS Register Cart
                  </h3>
                </div>
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 tabular-nums bg-[#F8F9FA] dark:bg-neutral-700 px-2.5 py-0.5 rounded-full border border-[#E9EEF0] dark:border-neutral-600">
                  {cart.reduce((n, i) => n + i.quantity, 0)} items
                </span>
              </div>

              {/* Quick Member Link */}
              <div className="my-3 space-y-1">
                <label className="text-[11px] font-bold text-[#64748B] dark:text-neutral-400">
                  Assign Customer:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-full border border-[#E9EEF0] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none shadow-2xs"
                >
                  <option value="">Guest Walk-In Customer</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.phoneNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50 max-h-64 overflow-y-auto my-3">
                {cart.length === 0 ? (
                  <div className="text-center py-14 text-xs text-neutral-400">
                    <Package size={32} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                    Register cart is empty. Tap any product to add it.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-neutral-400 tabular-nums">
                          {formatMoney(item.product.price.amount)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-full p-0.5 bg-white dark:bg-neutral-800">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <span className="text-xs font-bold tabular-nums text-neutral-900 dark:text-white w-16 text-right">
                          {formatMoney(item.product.price.amount * item.quantity)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cart Summary & Tender */}
            <div className="pt-4 border-t border-neutral-200/60 dark:border-neutral-700/80 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500 font-semibold">Order Subtotal:</span>
                <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(subtotal)}
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setIsCheckoutModalOpen(true)}
                style={{
                  backgroundColor: cart.length === 0 ? 'var(--color-border)' : 'var(--color-accent)',
                }}
                className={`w-full h-11 rounded-full text-xs font-bold text-white flex items-center justify-center gap-2 transition-transform shadow-xs ${
                  cart.length > 0 ? 'hover:opacity-90 active:scale-98 cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <CreditCard size={16} />
                <span>Checkout & Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Complete POS Sale"
        subtitle={`Settle payment for ${cart.reduce((n, i) => n + i.quantity, 0)} items`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#E8DFD8] dark:border-neutral-700 flex justify-between items-center">
            <span className="text-xs font-bold text-[#C4785A]">Total Payable:</span>
            <span className="text-2xl font-black text-[#C4785A] tabular-nums">
              {formatMoney(subtotal)}
            </span>
          </div>

          {/* Member assignment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Customer Account
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            >
              <option value="">Guest Walk-In Customer</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.phoneNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Stylist / Staff attribution */}
          {staff.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Attributed Stylist / Staff
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value="">None / General Retail</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Payment Tender
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'Card', 'MemberBalance'] as const).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      backgroundColor: isSelected ? '#FCEEE8' : 'transparent',
                      borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                      color: isSelected ? 'var(--color-accent)' : 'inherit',
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
                      isSelected ? 'shadow-2xs' : ''
                    }`}
                  >
                    {method === 'Cash' && <Banknote size={16} />}
                    {method === 'Card' && <CreditCard size={16} />}
                    {method === 'MemberBalance' && <User size={16} />}
                    <span>{method === 'MemberBalance' ? 'Balance' : method}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              className="h-10 px-6 text-xs font-bold text-white rounded-full flex items-center gap-2 hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
            >
              <CheckCircle2 size={15} />
              <span>Confirm & Print Receipt</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        title="Add Inventory Item"
        subtitle={`Register retail item in ${currentBranch?.name || 'Atrium 1'}`}
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="e.g. Whey Gold Standard 2.27kg"
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Category
              </label>
              <select
                value={newProductCategory}
                onChange={(e) => setNewProductCategory(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
              >
                {isSalon ? (
                  <>
                    <option value="Hair Care">Hair Care & Treatment</option>
                    <option value="Skin Care">Skin Care & Serums</option>
                    <option value="Beauty Products">Beauty & Cosmetics</option>
                    <option value="Nails & Spa">Nails & Spa Retail</option>
                    <option value="Accessories">Salon Tools & Accessories</option>
                  </>
                ) : (
                  <>
                    <option value="Supplement">Supplement</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Service">Service</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                SKU Code
              </label>
              <input
                type="text"
                value={newProductSku}
                onChange={(e) => setNewProductSku(e.target.value)}
                placeholder="PROD-101"
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Retail Price (DZD) *
              </label>
              <input
                type="number"
                required
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(Number(e.target.value))}
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Initial Stock Units
              </label>
              <input
                type="number"
                required
                value={newProductStock}
                onChange={(e) => setNewProductStock(Number(e.target.value))}
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddProductModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              className="h-10 px-5 text-xs font-bold text-white rounded-full cursor-pointer hover:opacity-90 shadow-xs"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Sale Confirmation Receipt Modal */}
      {completedSale && (
        <Modal
          isOpen={true}
          onClose={() => setCompletedSale(null)}
          title="Payment Successful"
          subtitle={`Receipt #${completedSale.id} settled`}
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-xl font-black text-neutral-900 dark:text-white">
              {formatMoney(completedSale.totalAmount)} Paid
            </h3>
            <p className="text-xs text-neutral-400">
              Tendered via {completedSale.paymentMethod} at {new Date(completedSale.createdAt).toLocaleTimeString()}
            </p>

            <div className="text-left text-xs p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 space-y-1.5 my-3">
              {completedSale.memberName && (
                <div className="font-bold text-neutral-900 dark:text-white pb-1 border-b border-neutral-200 dark:border-neutral-700">
                  Customer: {completedSale.memberName}
                </div>
              )}
              {completedSale.items.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.quantity}x {it.productName}</span>
                  <span className="font-mono font-bold">{formatMoney(it.totalPrice)}</span>
                </div>
              ))}
            </div>

            {/* Hardware ESC/POS Desktop Prompt */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-bold">
                  <Printer size={13} className="text-[#C4785A]" />
                  <span>Thermal POS Hardware</span>
                </div>
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/15 px-2 py-0.5 rounded-full">
                  Atrium Desktop
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Direct ESC/POS 80mm/58mm thermal receipt printing and automated cash drawer triggers require Atrium Desktop.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCompletedSale(null);
                  openDesktopUpgradeModal('general');
                }}
                className="text-[11px] font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
              >
                <Laptop size={11} />
                <span>Get Desktop POS Hardware Edition</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-full cursor-pointer flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700"
              >
                <Printer size={13} />
                <span>Print Browser Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                style={{
                  backgroundColor: 'var(--color-accent)',
                }}
                className="flex-1 h-10 text-xs font-bold text-white rounded-full cursor-pointer hover:opacity-90 shadow-xs"
              >
                Done / New Register Order
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
