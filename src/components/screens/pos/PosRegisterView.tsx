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
  ChevronDown,
  Building2,
  Check,
  Sparkles,
  Barcode,
  Printer,
  PauseCircle,
  PlayCircle,
  ArrowRight,
  ArrowDownUp,
  Tag,
  Volume2,
  VolumeX,
  Coins,
  Split,
  Edit2,
  Settings2,
  Pin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Product, PaymentDetail, ParkedOrder, StockMovement } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Modal } from '../../ui/Modal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // line discount in DZD
  notes?: string;
}

// Sound feedback for scanner
const playBeep = (freq = 880, duration = 0.08) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors if blocked by browser policy
  }
};

export interface PosRegisterViewProps {
  initialTab?: 'register' | 'parked' | 'inventory' | 'receipt_settings';
}

export const PosRegisterView: React.FC<PosRegisterViewProps> = ({ initialTab = 'register' }) => {
  const { t, language, isRtl } = useTranslation();

  const {
    products,
    members,
    staff,
    currentBranch,
    branches,
    switchBranch,
    processSale,
    adjustStock,
    addProduct,
    updateProduct,
    deleteProduct,
    parkedOrders,
    parkOrder,
    resumeParkedOrder,
    deleteParkedOrder,
    sales,
    stockMovements,
    receiptConfig,
    updateReceiptConfig,
    seedDemoInventory,
  } = useAtriumStore();

  // Active top-level subtab
  const [activeTab, setActiveTab] = useState<'register' | 'parked' | 'inventory' | 'receipt_settings'>(initialTab);
  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Register state
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderDiscountType, setOrderDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [orderDiscountValue, setOrderDiscountValue] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Quick custom item modal
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState(1000);
  const [customItemCategory, setCustomItemCategory] = useState('General');

  // Checkout modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'single' | 'split'>('single');
  const [singlePaymentMethod, setSinglePaymentMethod] = useState<'Cash' | 'Card' | 'MemberBalance' | 'BankTransfer' | 'Credit'>('Cash');
  const [amountTenderedInput, setAmountTenderedInput] = useState<string>('');
  const [selectedCashierName, setSelectedCashierName] = useState<string>(staff[0]?.fullName || 'Cashier Desk');
  const [checkoutCustomerPhone, setCheckoutCustomerPhone] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Split payment rows
  const [splitPayments, setSplitPayments] = useState<PaymentDetail[]>([
    { method: 'Cash', amount: 0 },
    { method: 'Card', amount: 0 },
  ]);

  // Completed sale modal for thermal slip preview
  const [completedSale, setCompletedSale] = useState<any>(null);

  // Hold / Park Order Modal
  const [isHoldOrderModalOpen, setIsHoldOrderModalOpen] = useState(false);
  const [holdOrderRefName, setHoldOrderRefName] = useState('');
  const [holdOrderNotes, setHoldOrderNotes] = useState('');

  // Inventory Filter state
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Stock Adjustment Modal
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Add / Edit Product Modal
  const [isProductFormModalOpen, setIsProductFormModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Beverage');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formPrice, setFormPrice] = useState<number>(1500);
  const [formCost, setFormCost] = useState<number>(900);
  const [formStock, setFormStock] = useState<number>(25);
  const [formReorder, setFormReorder] = useState<number>(5);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formTaxRate, setFormTaxRate] = useState<number>(19);

  // Unique categories in catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products in Register
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  // Filtered products in Inventory Tab
  const filteredInventory = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const isOut = p.stockQuantity <= 0;
      const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);

      if (stockStatusFilter === 'out') return matchCat && isOut;
      if (stockStatusFilter === 'low') return matchCat && isLow;
      return matchCat;
    });
  }, [products, categoryFilter, stockStatusFilter]);

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [pinnedProductIds, setPinnedProductIds] = useState<Set<string>>(new Set());
  const [invSortBy, setInvSortBy] = useState<string>('name');
  const [invSortDir, setInvSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedInventory = useMemo(() => {
    return [...filteredInventory].sort((a, b) => {
      const aPinned = pinnedProductIds.has(a.id);
      const bPinned = pinnedProductIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (invSortBy === 'name' || invSortBy === 'item') {
        const cmp = a.name.localeCompare(b.name);
        return invSortDir === 'asc' ? cmp : -cmp;
      }
      if (invSortBy === 'category') {
        const cmp = a.category.localeCompare(b.category);
        return invSortDir === 'asc' ? cmp : -cmp;
      }
      if (invSortBy === 'sku') {
        const cmp = a.sku.localeCompare(b.sku);
        return invSortDir === 'asc' ? cmp : -cmp;
      }
      if (invSortBy === 'cost') {
        const aCost = a.costPrice || a.cost?.amount || Math.round(a.price.amount * 0.6);
        const bCost = b.costPrice || b.cost?.amount || Math.round(b.price.amount * 0.6);
        return invSortDir === 'asc' ? aCost - bCost : bCost - aCost;
      }
      if (invSortBy === 'retail' || invSortBy === 'price') {
        return invSortDir === 'asc' ? a.price.amount - b.price.amount : b.price.amount - a.price.amount;
      }
      if (invSortBy === 'stock') {
        return invSortDir === 'asc' ? a.stockQuantity - b.stockQuantity : b.stockQuantity - a.stockQuantity;
      }
      if (invSortBy === 'val' || invSortBy === 'valuation') {
        const aVal = a.price.amount * a.stockQuantity;
        const bVal = b.price.amount * b.stockQuantity;
        return invSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredInventory, pinnedProductIds, invSortBy, invSortDir]);

  const productColumns: ColumnDefinition<Product>[] = useMemo(() => [
    {
      key: 'name',
      header: t('shop_col_item'),
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (p) => (
        <div className="min-w-0">
          <div className="font-bold text-neutral-900 dark:text-white truncate">
            {p.name}
          </div>
          <div className="text-[10px] text-neutral-400 truncate">
            {p.description || t('shop_standard_article')}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('shop_col_category'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (p) => (
        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
          {p.category}
        </span>
      ),
    },
    {
      key: 'sku',
      header: t('shop_col_sku'),
      width: '1.5*',
      minWidth: '130px',
      sortable: true,
      renderCell: (p) => (
        <div className="font-mono text-[11px] text-neutral-500">
          <div>{p.sku}</div>
          {p.barcode && <div className="text-[10px] text-neutral-400">{p.barcode}</div>}
        </div>
      ),
    },
    {
      key: 'cost',
      header: t('shop_col_cost'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (p) => {
        const costAmt = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);
        return (
          <span className="font-mono text-neutral-500 tabular-nums">
            {formatMoney(costAmt)}
          </span>
        );
      },
    },
    {
      key: 'retail',
      header: t('shop_col_retail'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (p) => (
        <span className="font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
          {formatMoney(p.price.amount)}
        </span>
      ),
    },
    {
      key: 'stock',
      header: t('shop_col_stock'),
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (p) => {
        const isOut = p.stockQuantity <= 0;
        const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
        return (
          <span
            className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-[10px] tabular-nums ${
              isOut
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : isLow
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {p.stockQuantity} {p.unit || t('shop_unit_pcs')}
          </span>
        );
      },
    },
    {
      key: 'val',
      header: t('shop_col_val'),
      width: '1.3*',
      minWidth: '120px',
      sortable: true,
      renderCell: (p) => (
        <span className="font-mono font-bold text-[#C4785A] tabular-nums">
          {formatMoney(p.price.amount * p.stockQuantity)}
        </span>
      ),
    },
  ], [t]);

  // Columns for Register Product Catalog UniversalDataCollection
  const registerProductColumns: ColumnDefinition<Product>[] = useMemo(() => [
    {
      key: 'name',
      header: t('shop_col_product'),
      width: '2.5*',
      minWidth: '160px',
      sortable: true,
      renderCell: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-600 dark:text-neutral-300 shrink-0">
            {p.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-xs text-neutral-900 dark:text-white truncate block">
              {p.name}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono block">
              {p.sku} {p.barcode ? `· ${p.barcode}` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('shop_col_category'),
      width: '1.2*',
      minWidth: '100px',
      sortable: true,
      renderCell: (p) => (
        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
          {p.category}
        </span>
      ),
    },
    {
      key: 'price',
      header: t('shop_col_retail'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (p) => (
        <span className="font-mono font-black text-xs text-neutral-900 dark:text-white tabular-nums">
          {formatMoney(p.price.amount)}
        </span>
      ),
    },
    {
      key: 'stock',
      header: t('shop_col_stock'),
      width: '1.2*',
      minWidth: '100px',
      sortable: true,
      renderCell: (p) => {
        const isOut = p.stockQuantity <= 0;
        const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
        return (
          <span
            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] tabular-nums ${
              isOut
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : isLow
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {p.stockQuantity} {p.unit || t('shop_unit_pcs')}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: '',
      width: '1*',
      minWidth: '80px',
      renderCell: (p) => {
        const inCartItem = cart.find((c) => c.product.id === p.id);
        const isOut = p.stockQuantity <= 0;
        return (
          <button
            type="button"
            disabled={isOut}
            onClick={(e) => {
              e.stopPropagation();
              addToCart(p);
            }}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              isOut
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                : inCartItem
                ? 'bg-[#C4785A] text-white shadow-2xs'
                : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-800 dark:text-neutral-200'
            }`}
          >
            <Plus size={12} />
            <span>{inCartItem ? `(${inCartItem.quantity})` : t('shop_add_btn')}</span>
          </button>
        );
      },
    },
  ], [t, cart]);

  // Columns for Held/Parked Orders UniversalDataCollection
  const parkedOrderColumns: ColumnDefinition<ParkedOrder>[] = useMemo(() => [
    {
      key: 'ref',
      header: language === 'ar' ? 'مرجع التذكرة' : language === 'fr' ? 'Réf Commande' : 'Ticket Reference',
      width: '2*',
      minWidth: '150px',
      sortable: true,
      renderCell: (po) => (
        <div>
          <span className="font-bold text-xs text-neutral-900 dark:text-white block">
            {po.referenceName}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono block">
            {new Date(po.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: language === 'ar' ? 'الأصناف' : language === 'fr' ? 'Articles' : 'Items Preview',
      width: '3*',
      minWidth: '200px',
      renderCell: (po) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {po.items.slice(0, 3).map((it, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
              {it.quantity}x {it.productName}
            </span>
          ))}
          {po.items.length > 3 && (
            <span className="text-[10px] text-neutral-400 font-bold">
              +{po.items.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: language === 'ar' ? 'المجموع' : language === 'fr' ? 'Total' : 'Total Amount',
      width: '1.5*',
      minWidth: '120px',
      sortable: true,
      renderCell: (po) => (
        <span className="font-mono font-black text-sm text-[#C4785A] tabular-nums">
          {formatMoney(po.totalAmount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '1.8*',
      minWidth: '140px',
      renderCell: (po) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleResumeOrder(po);
            }}
            className="h-8 px-3 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 cursor-pointer"
          >
            <PlayCircle size={13} />
            <span>{t('shop_resume_in_register')}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteParkedOrder(po.id);
            }}
            className="h-8 px-2 rounded-xl text-neutral-400 hover:text-red-500 cursor-pointer"
            title={t('shop_discard_order')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [language, t]);

  // Inventory valuation KPIs
  const inventoryStats = useMemo(() => {
    let totalSKUs = products.length;
    let totalUnits = 0;
    let retailValuation = 0;
    let costValuation = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    products.forEach((p) => {
      totalUnits += p.stockQuantity;
      retailValuation += p.price.amount * p.stockQuantity;
      const c = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);
      costValuation += c * p.stockQuantity;
      if (p.stockQuantity <= 0) {
        outOfStockItems++;
      } else if (p.stockQuantity <= (p.reorderLevel || 5)) {
        lowStockItems++;
      }
    });

    return {
      totalSKUs,
      totalUnits,
      retailValuation,
      costValuation,
      potentialProfit: Math.max(0, retailValuation - costValuation),
      lowStockItems,
      outOfStockItems,
    };
  }, [products]);

  // Session & Register KPIs for Top Metrics Pod Tray
  const sessionMetrics = useMemo(() => {
    const todaySales = (sales || []).filter(
      (s) => s.facilityId === currentBranch.id && s.status !== 'Refunded'
    );
    const turnover = todaySales.reduce((acc, s) => {
      const amt = typeof s.totalAmount === 'number' ? s.totalAmount : 0;
      return acc + amt;
    }, 0);
    const totalCash = todaySales.reduce((acc, s) => {
      if (s.paymentMethod === 'Cash') return acc + (s.totalAmount || 0);
      if (s.paymentMethod === 'Split' && s.payments) {
        const cashAmt = s.payments
          .filter((p) => p.method === 'Cash')
          .reduce((cAcc, cp) => cAcc + cp.amount, 0);
        return acc + cashAmt;
      }
      return acc;
    }, 0);
    const parkedCount = parkedOrders.length;
    const parkedValuation = parkedOrders.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    return {
      todaySalesCount: todaySales.length,
      turnover,
      totalCash,
      parkedCount,
      parkedValuation,
    };
  }, [sales, currentBranch.id, parkedOrders]);

  // Cart financial calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price.amount * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (orderDiscountType === 'percent') {
      return Math.round((cartSubtotal * Math.min(100, Math.max(0, orderDiscountValue))) / 100);
    }
    return Math.min(cartSubtotal, Math.max(0, orderDiscountValue));
  }, [cartSubtotal, orderDiscountType, orderDiscountValue]);

  const taxAmount = useMemo(() => {
    if (!receiptConfig.showTaxBreakdown) return 0;
    // Calculate approx 9% VAT
    return Math.round((cartSubtotal - discountAmount) * 0.09);
  }, [cartSubtotal, discountAmount, receiptConfig.showTaxBreakdown]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount + taxAmount);
  }, [cartSubtotal, discountAmount, taxAmount]);

  // Cash change calculation
  const numericAmountTendered = useMemo(() => {
    const n = parseFloat(amountTenderedInput);
    return isNaN(n) ? 0 : n;
  }, [amountTenderedInput]);

  const changeDue = useMemo(() => {
    if (checkoutMode === 'split') return 0;
    if (singlePaymentMethod !== 'Cash') return 0;
    return Math.max(0, numericAmountTendered - cartTotal);
  }, [checkoutMode, singlePaymentMethod, numericAmountTendered, cartTotal]);

  // Total split sum
  const splitTotal = useMemo(() => {
    return splitPayments.reduce((acc, sp) => acc + (sp.amount || 0), 0);
  }, [splitPayments]);

  const splitRemaining = useMemo(() => {
    return cartTotal - splitTotal;
  }, [cartTotal, splitTotal]);

  // Handle barcode quick add
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeQuery.trim()) return;
    const clean = barcodeQuery.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        p.sku.toLowerCase() === clean ||
        p.id.toLowerCase() === clean
    );

    if (found) {
      addToCart(found);
      if (soundEnabled) playBeep(880, 0.08);
      setBarcodeQuery('');
    } else {
      if (soundEnabled) playBeep(330, 0.2); // error low beep
      showToast({
        type: 'warning',
        title: t('shop_toast_not_found_title'),
        message: t('shop_toast_not_found_msg', { query: barcodeQuery }),
      });
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      showToast({
        type: 'warning',
        title: t('shop_toast_out_of_stock_title'),
        message: t('shop_toast_out_of_stock_msg', { name: product.name }),
      });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          showToast({
            type: 'warning',
            title: t('shop_toast_max_stock_title'),
            message: t('shop_toast_max_stock_msg', { limit: product.stockQuantity }),
          });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
    if (soundEnabled) playBeep(920, 0.05);
  };

  // Update line quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stockQuantity) {
              showToast({
                type: 'warning',
                title: t('shop_toast_max_stock_title'),
                message: t('shop_toast_max_stock_msg', { limit: item.product.stockQuantity }),
              });
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Update line discount
  const updateLineDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, discount: Math.max(0, Math.min(item.product.price.amount * item.quantity, discount)) }
          : item
      )
    );
  };

  // Remove item
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Quick custom item submission
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim() || customItemPrice <= 0) return;
    const tempProduct: Product = {
      id: `custom_${Date.now()}`,
      tenantId: 'acc_01',
      facilityId: currentBranch.id,
      name: customItemName.trim(),
      description: 'Quick custom entered register item',
      price: { amount: customItemPrice, currency: 'DZD' },
      cost: { amount: Math.round(customItemPrice * 0.6), currency: 'DZD' },
      costPrice: Math.round(customItemPrice * 0.6),
      stockQuantity: 9999, // unlimited virtual stock
      sku: `QUICK-${Date.now().toString().slice(-4)}`,
      category: customItemCategory,
      reorderLevel: 0,
      isActive: true,
      isPinned: false,
    };
    addToCart(tempProduct);
    setCustomItemName('');
    setCustomItemPrice(1000);
    setIsCustomItemModalOpen(false);
  };

  // Open checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setAmountTenderedInput(cartTotal.toString());
    setSplitPayments([
      { method: 'Cash', amount: Math.ceil(cartTotal / 2) },
      { method: 'Card', amount: Math.floor(cartTotal / 2) },
    ]);
    const customer = members.find((m) => m.id === selectedCustomerId);
    setCheckoutCustomerPhone(customer?.phoneNumber || '');
    setIsCheckoutModalOpen(true);
  };

  // Process checkout
  const handleConfirmCheckout = () => {
    if (cart.length === 0) return;

    if (checkoutMode === 'split' && splitRemaining !== 0) {
      showToast({
        type: 'warning',
        title: t('shop_toast_split_mismatch_title'),
        message: t('shop_toast_split_mismatch_msg', { remaining: formatMoney(splitRemaining) }),
      });
      return;
    }

    const customer = members.find((m) => m.id === selectedCustomerId);
    const sale = processSale(
      cart,
      checkoutMode === 'split' ? 'Split' : singlePaymentMethod,
      selectedCustomerId || undefined,
      checkoutNotes.trim() || undefined,
      {
        subtotal: cartSubtotal,
        discount: discountAmount,
        discountAmount,
        taxAmount,
        payments: checkoutMode === 'split' ? splitPayments.filter((p) => p.amount > 0) : undefined,
        amountTendered: singlePaymentMethod === 'Cash' ? numericAmountTendered : cartTotal,
        changeGiven: changeDue,
        cashierName: selectedCashierName,
        customerPhone: checkoutCustomerPhone || customer?.phoneNumber,
        customerName: customer?.fullName || t('shop_receipt_walkin'),
      }
    );

    if (soundEnabled) playBeep(1200, 0.15);
    setCompletedSale(sale);
    setCart([]);
    setOrderDiscountValue(0);
    setSelectedCustomerId('');
    setCheckoutNotes('');
    setIsCheckoutModalOpen(false);

    showToast({
      type: 'success',
      title: t('shop_toast_settled_title'),
      message: t('shop_toast_settled_msg', {
        id: sale.id.slice(-6).toUpperCase(),
        amount: formatMoney(sale.totalAmount),
      }),
      category: 'pos_inventory',
      action: {
        label: t('shop_receipt_printed'),
        onClick: () => window.print?.(),
      },
    });
  };

  // Hold current order
  const handleHoldOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    const customer = members.find((m) => m.id === selectedCustomerId);
    const ref =
      holdOrderRefName.trim() ||
      (customer ? `${customer.fullName} (#${cart.length})` : `Held #${Date.now().toString().slice(-4)}`);

    parkOrder({
      referenceName: ref,
      customerId: selectedCustomerId || undefined,
      customerName: customer?.fullName || t('shop_receipt_walkin'),
      customerPhone: customer?.phoneNumber,
      subtotal: cartSubtotal,
      discount: discountAmount,
      totalAmount: cartTotal,
      notes: holdOrderNotes,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price.amount,
        totalPrice: c.product.price.amount * c.quantity - c.discount,
        costPrice: c.product.costPrice,
        barcode: c.product.barcode,
        unit: c.product.unit,
        discount: c.discount,
        notes: c.notes,
      })),
    });

    setCart([]);
    setOrderDiscountValue(0);
    setSelectedCustomerId('');
    setHoldOrderRefName('');
    setHoldOrderNotes('');
    setIsHoldOrderModalOpen(false);
    showToast({
      type: 'info',
      title: t('shop_toast_parked_title'),
      message: t('shop_toast_parked_msg'),
    });
  };

  // Resume parked order
  const handleResumeOrder = (parked: ParkedOrder) => {
    if (cart.length > 0) {
      const confirmReplace = window.confirm(t('shop_confirm_replace_cart'));
      if (!confirmReplace) return;
    }

    const restoredCart: CartItem[] = [];
    for (const item of parked.items) {
      const liveProduct = products.find((p) => p.id === item.productId);
      if (liveProduct) {
        restoredCart.push({
          product: liveProduct,
          quantity: item.quantity,
          discount: item.discount || 0,
          notes: item.notes,
        });
      } else {
        // Fallback for virtual product
        restoredCart.push({
          product: {
            id: item.productId,
            tenantId: 'acc_01',
            facilityId: currentBranch.id,
            name: item.productName,
            description: 'Restored from held order',
            price: { amount: item.unitPrice, currency: 'DZD' },
            cost: { amount: item.unitPrice * 0.6, currency: 'DZD' },
            stockQuantity: 9999,
            sku: item.barcode || 'HELD-ITEM',
            category: 'General',
            reorderLevel: 0,
            isActive: true,
            isPinned: false,
          },
          quantity: item.quantity,
          discount: item.discount || 0,
          notes: item.notes,
        });
      }
    }

    setCart(restoredCart);
    if (parked.customerId) setSelectedCustomerId(parked.customerId);
    if (parked.discount) {
      setOrderDiscountType('fixed');
      setOrderDiscountValue(parked.discount);
    }
    resumeParkedOrder(parked.id);
    setActiveTab('register');
    if (soundEnabled) playBeep(880, 0.1);
  };

  // Stock Adjustment confirm
  const handleConfirmStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    const deltaOrVal =
      adjustMode === 'add'
        ? Math.abs(adjustQuantity)
        : adjustMode === 'remove'
        ? -Math.abs(adjustQuantity)
        : Math.max(0, adjustQuantity);

    const movementType: StockMovement['type'] =
      adjustMode === 'set'
        ? 'Adjustment'
        : adjustMode === 'add'
        ? 'Restock'
        : 'Damage';

    adjustStock(
      selectedProductForAdjust.id,
      deltaOrVal,
      adjustMode === 'set' ? 'set' : 'delta',
      adjustReason || 'Manual Inventory Adjustment',
      movementType
    );

    setIsAdjustStockModalOpen(false);
    setSelectedProductForAdjust(null);
  };

  // Product Add / Edit submit
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice <= 0) return;

    if (editingProductId) {
      updateProduct(editingProductId, {
        name: formName.trim(),
        category: formCategory,
        sku: formSku.trim(),
        barcode: formBarcode.trim() || undefined,
        price: { amount: formPrice, currency: 'DZD' },
        cost: { amount: formCost, currency: 'DZD' },
        costPrice: formCost,
        stockQuantity: formStock,
        reorderLevel: formReorder,
        unit: formUnit,
        taxRate: formTaxRate,
      });
    } else {
      addProduct({
        name: formName.trim(),
        description: `${formCategory} item in ${currentBranch.name}`,
        category: formCategory,
        sku: formSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: formBarcode.trim() || `6131100${Date.now().toString().slice(-6)}`,
        price: { amount: formPrice, currency: 'DZD' },
        cost: { amount: formCost, currency: 'DZD' },
        costPrice: formCost,
        stockQuantity: formStock,
        reorderLevel: formReorder,
        unit: formUnit,
        taxRate: formTaxRate,
        isActive: true,
        isPinned: false,
      });
    }

    setIsProductFormModalOpen(false);
    setEditingProductId(null);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setFormName(prod.name);
    setFormCategory(prod.category || 'Beverage');
    setFormSku(prod.sku || '');
    setFormBarcode(prod.barcode || '');
    setFormPrice(prod.price.amount);
    setFormCost(prod.costPrice || prod.cost?.amount || Math.round(prod.price.amount * 0.6));
    setFormStock(prod.stockQuantity);
    setFormReorder(prod.reorderLevel || 5);
    setFormUnit(prod.unit || 'pcs');
    setFormTaxRate(prod.taxRate || 19);
    setIsProductFormModalOpen(true);
  };

  // Open Add Product Modal
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setFormName('');
    setFormCategory('Beverage');
    setFormSku(`SKU-${Date.now().toString().slice(-4)}`);
    setFormBarcode(`6131100${Date.now().toString().slice(-6)}`);
    setFormPrice(1500);
    setFormCost(900);
    setFormStock(25);
    setFormReorder(5);
    setFormUnit('pcs');
    setFormTaxRate(19);
    setIsProductFormModalOpen(true);
  };

  // Export inventory CSV
  const handleExportInventoryCSV = () => {
    const headers = ['SKU', 'Barcode', 'Product Name', 'Category', 'Unit', 'Retail Price (DA)', 'Cost (DA)', 'Stock Qty', 'Reorder Level', 'Valuation (DA)'];
    const rows = filteredInventory.map((p) => [
      `"${p.sku}"`,
      `"${p.barcode || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.unit || 'pcs'}"`,
      p.price.amount,
      p.costPrice || p.cost?.amount || 0,
      p.stockQuantity,
      p.reorderLevel || 0,
      p.price.amount * p.stockQuantity,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventory_${currentBranch.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Outer Workspace Panel */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        {/* Print stylesheet for thermal receipt */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #pos-thermal-receipt-container, #pos-thermal-receipt-container * {
              visibility: visible !important;
            }
            #pos-thermal-receipt-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 8px !important;
              font-size: 11px !important;
              background: white !important;
              color: black !important;
            }
          }
        `}</style>

        {/* Screen Header & Facility Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <ShoppingBag className="text-[#C4785A]" size={26} />
                <span>{t('shop_hub_title')}</span>
              </h1>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                {t('status_active')}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t('shop_hub_desc')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Branch / Store selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:border-[#C4785A] transition-colors cursor-pointer"
              >
                <Building2 size={15} className="text-[#C4785A]" />
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <div className="text-[10px] uppercase font-bold text-neutral-400 leading-none">{t('shop_active_store')}</div>
                  <div className="text-xs font-bold leading-tight truncate max-w-[150px]">
                    {currentBranch?.name || t('shop_main_branch')}
                  </div>
                </div>
                <ChevronDown size={14} className="text-neutral-400 ml-1" />
              </button>

              {isFacilityDropdownOpen && (
                <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-40`}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {t('shop_select_store')}
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        switchBranch(b.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer ${
                        isRtl ? 'text-right' : 'text-left'
                      } ${
                        b.id === currentBranch.id ? 'font-bold text-[#C4785A] bg-neutral-50 dark:bg-neutral-800/50' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {b.id === currentBranch.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Demo Recharge */}
            <button
              type="button"
              onClick={() => seedDemoInventory()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles size={14} className="text-[#C4785A]" />
              <span>{language === 'ar' ? 'شحن العينة' : 'Démo Recharge'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? t('shop_sound_enabled_tip') : t('shop_sound_muted_tip')}
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors shadow-2xs ${
                soundEnabled
                  ? 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-neutral-200 text-neutral-400 dark:border-neutral-800 bg-white dark:bg-neutral-900'
              }`}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        {/* TOP METRICS POD TRAY */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E9EEF0] dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'جلسة البيع & مؤشرات الصندوق' : language === 'fr' ? 'Session de Caisse & Indicateurs Directs' : 'Register Session & Live Sales'}
              </h2>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {language === 'ar'
                  ? 'متابعة العمليات اليومية، التذاكر المعلقة، والسيولة النقدية المتوقعة في الدرج'
                  : 'Encaissements instantanés, gestion des paniers suspendus et liquidités physiques attendues au tiroir.'}
              </p>
            </div>

            {/* View/Subtab Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-[#C4785A] text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                <Coins size={14} />
                <span>{t('nav_pos_register')}</span>
                {cart.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    activeTab === 'register' ? 'bg-white text-[#C4785A]' : 'bg-[#C4785A] text-white'
                  }`}>
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('parked')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'parked'
                    ? 'bg-[#C4785A] text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                <PauseCircle size={14} />
                <span>{t('shop_held_orders')}</span>
                {parkedOrders.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    activeTab === 'parked' ? 'bg-white text-[#C4785A]' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {parkedOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('receipt_settings')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'receipt_settings'
                    ? 'bg-[#C4785A] text-white shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
                }`}
              >
                <Settings2 size={14} />
                <span>{t('shop_receipt_printed')}</span>
              </button>
            </div>
          </div>

          {/* 3-Card Canonical Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Today Register Turnover */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'حجم مبيعات اليوم' : language === 'fr' ? 'Volume Ventes Caisse' : 'Today Register Turnover'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    {sessionMetrics.todaySalesCount} {language === 'ar' ? 'عملية مسددة' : 'tickets clôturés'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {formatMoney(sessionMetrics.turnover)}
              </div>
            </div>

            {/* Card 2: Parked Carts Queue */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {language === 'ar' ? 'تذاكر قيد الانتظار' : language === 'fr' ? 'Paniers Suspendus' : 'Parked Carts Queue'}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                    {sessionMetrics.parkedCount} {language === 'ar' ? 'تذكرة مؤقتة' : 'tickets en attente'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {formatMoney(sessionMetrics.parkedValuation)}
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
                  {language === 'ar' ? 'سيولة الدرج النقدية' : language === 'fr' ? 'Liquidités Tiroir-Caisse' : 'Drawer Cash Turnover'}
                </span>
                <div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
                  <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                    {language === 'ar' ? 'نقداً محصلاً (DZD)' : 'Tiroir Actif (Espèces)'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-white tabular-nums font-mono">
                {formatMoney(sessionMetrics.totalCash)}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM WORKSTATION POD TRAY */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          {/* ========================================================================= */}
          {/* TAB 1: POS REGISTER                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 7-8 COLS: Catalog & Scanner */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Barcode / SKU Instant Scanner Bar */}
            <form
              onSubmit={handleBarcodeSubmit}
              className="p-1 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-center gap-2"
            >
              <div className="flex-1">
                <LabelInput
                  field="Barcode"
                  label={t('shop_barcode_label')}
                  value={barcodeQuery}
                  onChange={(val) => setBarcodeQuery(val?.target?.value ?? String(val))}
                  width="100%"
                  height={44}
                  corner={14}
                  prefix={<Barcode size={18} className="text-[#C4785A]" />}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#C4785A] text-white text-xs font-bold hover:opacity-90 cursor-pointer transition-opacity shrink-0 mx-2"
              >
                {t('shop_scan_btn')}
              </button>
            </form>

            {/* Filter Bar & Quick Custom Item */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                {/* Seek Kinetic Search Box */}
                <Seek
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t('shop_search_catalog')}
                  shutSize={36}
                  openWidth={260}
                />

                <button
                  type="button"
                  onClick={() => setIsCustomItemModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer border border-neutral-200 dark:border-neutral-700"
                >
                  <Tag size={13} className="text-[#C4785A]" />
                  <span>{t('shop_custom_item_btn')}</span>
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-800 rounded-xl p-0.5 bg-white dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[#C4785A] text-white' : 'text-neutral-400'
                  }`}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    viewMode === 'list' ? 'bg-[#C4785A] text-white' : 'text-neutral-400'
                  }`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors ${
                    categoryFilter === cat
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-2xs'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  {cat === 'All' ? t('shop_categories_all') : cat}
                </button>
              ))}
            </div>

            {/* Empty Branch notice with 1-click Demo Seed */}
            {products.length === 0 && (
              <div className="p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-3">
                <Package size={36} className="text-[#C4785A] mx-auto opacity-70" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('shop_empty_inventory_title', { branch: currentBranch.name })}
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  {t('shop_empty_inventory_desc')}
                </p>
                <button
                  type="button"
                  onClick={() => seedDemoInventory(currentBranch.id)}
                  className="px-5 py-2.5 rounded-full bg-[#C4785A] text-white text-xs font-bold hover:opacity-90 cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  <span>{t('shop_seed_catalog_btn')}</span>
                </button>
              </div>
            )}

            {/* Universal Product Catalog Collection */}
            {products.length > 0 && (
              <UniversalDataCollection<Product>
                items={filteredProducts}
                keyExtractor={(p) => p.id}
                defaultViewMode="grid"
                columns={registerProductColumns}
                onItemClick={(product) => {
                  if (product.stockQuantity > 0) addToCart(product);
                }}
                renderCard={(product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock = !isOutOfStock && product.stockQuantity <= (product.reorderLevel || 5);
                  const inCartItem = cart.find((c) => c.product.id === product.id);

                  return (
                    <div
                      onClick={() => {
                        if (!isOutOfStock) addToCart(product);
                      }}
                      className={`relative p-3.5 rounded-2xl transition-all flex flex-col justify-between h-full cursor-pointer group ${
                        isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between w-full gap-1 mb-2">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate max-w-[90px]">
                          {product.category}
                        </span>
                        {inCartItem && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#C4785A] text-white text-[10px] font-black">
                            {t('shop_in_cart_badge', { count: inCartItem.quantity })}
                          </span>
                        )}
                        {!inCartItem && isLowStock && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                            {t('shop_left_badge', { count: product.stockQuantity })}
                          </span>
                        )}
                        {!inCartItem && isOutOfStock && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[10px] font-bold">
                            {t('shop_sold_out_badge')}
                          </span>
                        )}
                      </div>

                      {/* Product Name & SKU */}
                      <div className="my-1.5">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-[#C4785A] transition-colors">
                          {product.name}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                          {product.sku}
                        </div>
                      </div>

                      {/* Price & Stock & Quick Add */}
                      <div className="flex items-center justify-between w-full pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <div>
                          <div className="text-sm font-black text-neutral-900 dark:text-white font-mono">
                            {formatMoney(product.price.amount)}
                          </div>
                          <div className="text-[10px] font-bold text-neutral-400">
                            {product.stockQuantity} {product.unit || t('shop_unit_pcs')}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          className={`h-8 px-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                              : inCartItem
                              ? 'bg-[#C4785A] text-white shadow-2xs'
                              : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          <Plus size={13} />
                          <span>{inCartItem ? `(${inCartItem.quantity})` : t('shop_add_btn')}</span>
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>

          {/* RIGHT 4-5 COLS: Checkout Register Cart Panel */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-4 sticky top-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h2 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Receipt size={18} className="text-[#C4785A]" />
                  <span>{t('pos_current_order_title')}</span>
                </h2>
                <div className="text-[11px] text-neutral-400">
                  {t('shop_unique_items_summary', {
                    unique: cart.length,
                    total: cart.reduce((a, b) => a + b.quantity, 0),
                  })}
                </div>
              </div>

              {cart.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsHoldOrderModalOpen(true)}
                    title={t('shop_hold_cart_tooltip')}
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                  >
                    <PauseCircle size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    title={t('shop_clear_cart_tooltip')}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Customer selector (Walk-in vs Account) */}
            <LabelSelect
              field="Customer"
              label={t('pos_customer_attribution')}
              value={selectedCustomerId}
              onChange={(val) => setSelectedCustomerId(typeof val === 'string' ? val : val.target?.value || val)}
              options={[
                { value: '', label: t('pos_guest_walkin') },
                ...members.map((m) => ({
                  value: m.id,
                  label: `${m.fullName} (${m.phoneNumber})`,
                })),
              ]}
              height={40}
              corner={12}
            />

            {/* Cart Items List */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <ShoppingBag size={32} className="mx-auto opacity-40" />
                  <p className="text-xs font-semibold">
                    {t('shop_cart_empty_title')}
                  </p>
                  <p className="text-[11px] text-neutral-400 max-w-[200px] mx-auto">
                    {t('shop_cart_empty_desc')}
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const lineTotal = item.product.price.amount * item.quantity - item.discount;

                  return (
                    <div key={item.product.id} className="pt-2 first:pt-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {formatMoney(item.product.price.amount)} {t('shop_per_unit')}
                          </div>
                        </div>

                        <div className={`shrink-0 ${isRtl ? 'text-left' : 'text-right'}`}>
                          <div className="text-xs font-black font-mono text-neutral-900 dark:text-white">
                            {formatMoney(lineTotal)}
                          </div>
                          {item.discount > 0 && (
                            <div className="text-[10px] text-emerald-600 font-bold">
                              {t('shop_discount_badge', { amount: formatMoney(item.discount) })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stepper & Line discount */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-7 text-center text-xs font-black font-mono text-neutral-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder={t('shop_line_discount_ph')}
                            value={item.discount || ''}
                            onChange={(e) => updateLineDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                            className={`w-20 h-6 px-1.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-700 bg-transparent font-mono ${
                              isRtl ? 'text-left' : 'text-right'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-neutral-400 hover:text-red-500 cursor-pointer p-0.5"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Discount Input */}
            {cart.length > 0 && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-500">
                  <span>{t('pos_cart_discount_label')}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('fixed')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        orderDiscountType === 'fixed' ? 'bg-[#C4785A] text-white' : 'text-neutral-400'
                      }`}
                    >
                      {language === 'ar' ? 'د.ج' : 'DA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('percent')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        orderDiscountType === 'percent' ? 'bg-[#C4785A] text-white' : 'text-neutral-400'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max={orderDiscountType === 'percent' ? 100 : cartSubtotal}
                  value={orderDiscountValue || ''}
                  onChange={(e) => setOrderDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder={orderDiscountType === 'percent' ? '10%' : t('shop_order_discount_ph')}
                  className="w-full h-8 px-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 font-mono text-neutral-900 dark:text-white"
                />
              </div>
            )}

            {/* Price Breakdown */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-500">
                <span>{t('pos_subtotal_label')}</span>
                <span className="font-mono font-semibold">{formatMoney(cartSubtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>{t('pos_total_discount_label')}</span>
                  <span className="font-mono">-{formatMoney(discountAmount)}</span>
                </div>
              )}

              {receiptConfig.showTaxBreakdown && taxAmount > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>{t('shop_vat_line')}</span>
                  <span className="font-mono">{formatMoney(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-black">
                <span className="text-sm">{t('pos_total_due_label')}</span>
                <span className="text-2xl font-mono text-[#C4785A]">{formatMoney(cartTotal)}</span>
              </div>
            </div>

            {/* Quick Cash Buttons */}
            {cart.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('pos_quick_cash_title')}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[cartTotal, 1000, 2000, 5000].map((amt, idx) => {
                    const isExact = idx === 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSinglePaymentMethod('Cash');
                          setAmountTenderedInput(amt.toString());
                          handleOpenCheckout();
                        }}
                        className={`p-1.5 rounded-xl text-[10px] font-bold font-mono text-center border cursor-pointer hover:border-[#C4785A] transition-colors ${
                          isExact
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent'
                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {isExact ? t('shop_quick_cash_exact') : `${amt.toLocaleString()} ${language === 'ar' ? 'د.ج' : 'DA'}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className={`w-full h-12 rounded-2xl text-xs font-black tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                cart.length === 0
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none'
                  : 'bg-[#C4785A] text-white hover:opacity-90 active:scale-98'
              }`}
            >
              <Coins size={16} />
              <span>{t('shop_charge_button', { amount: formatMoney(cartTotal) })}</span>
              <ArrowRight size={15} className={isRtl ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HELD / PARKED ORDERS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'parked' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-neutral-900 dark:text-white">
                {t('shop_held_orders_title', { count: parkedOrders.length })}
              </h2>
              <p className="text-xs text-neutral-500">
                {t('shop_held_orders_desc')}
              </p>
            </div>
          </div>

          <UniversalDataCollection<ParkedOrder>
            items={parkedOrders}
            keyExtractor={(po) => po.id}
            defaultViewMode="grid"
            columns={parkedOrderColumns}
            onItemClick={(po) => handleResumeOrder(po)}
            renderCard={(po) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-black text-neutral-900 dark:text-white">
                        {po.referenceName}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {t('shop_held_at_time', {
                          time: new Date(po.createdAt).toLocaleTimeString(),
                          count: po.items.length,
                        })}
                      </div>
                    </div>
                    <div className="text-sm font-black font-mono text-[#C4785A]">
                      {formatMoney(po.totalAmount)}
                    </div>
                  </div>

                  {/* Item preview list */}
                  <div className="text-xs bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl space-y-1">
                    {po.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-300">
                        <span>{it.quantity}x {it.productName}</span>
                        <span className="font-mono">{formatMoney(it.totalPrice)}</span>
                      </div>
                    ))}
                  </div>

                  {po.notes && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-2">
                      {t('shop_note_prefix', { notes: po.notes })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResumeOrder(po);
                    }}
                    className="flex-1 h-9 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 cursor-pointer"
                  >
                    <PlayCircle size={14} />
                    <span>{t('shop_resume_in_register')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteParkedOrder(po.id);
                    }}
                    className="h-9 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 cursor-pointer"
                    title={t('shop_discard_order')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
            emptyTitle={t('shop_no_held_title')}
            emptyDescription={t('shop_no_held_desc')}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVENTORY & STOCK MANAGEMENT                                      */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {/* Inventory Valuation Header Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {t('shop_kpi_skus')}
              </div>
              <div className="text-xl font-black text-neutral-900 dark:text-white">
                {inventoryStats.totalSKUs}
              </div>
              <div className="text-[10px] text-neutral-400">
                {t('shop_kpi_skus_sub', { count: inventoryStats.totalUnits })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {t('shop_kpi_retail_val')}
              </div>
              <div className="text-xl font-black font-mono text-[#C4785A]">
                {formatMoney(inventoryStats.retailValuation)}
              </div>
              <div className="text-[10px] text-neutral-400">
                {t('shop_kpi_retail_val_sub', { cost: formatMoney(inventoryStats.costValuation) })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {t('shop_kpi_margin')}
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(inventoryStats.potentialProfit)}
              </div>
              <div className="text-[10px] text-neutral-400">
                {t('shop_kpi_margin_sub')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {t('shop_kpi_low_stock')}
              </div>
              <div className="text-xl font-black text-red-600 dark:text-red-400 flex items-center gap-2">
                <span>{t('shop_kpi_low_items', { count: inventoryStats.lowStockItems })}</span>
                {inventoryStats.outOfStockItems > 0 && (
                  <span className="text-xs font-bold text-red-400">
                    {t('shop_kpi_out_items', { count: inventoryStats.outOfStockItems })}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400">
                {t('shop_kpi_low_sub')}
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status pill filter */}
              <div className="flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    stockStatusFilter === 'all' ? 'bg-[#C4785A] text-white' : 'text-neutral-500'
                  }`}
                >
                  {t('shop_filter_all', { count: products.length })}
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('low')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    stockStatusFilter === 'low' ? 'bg-amber-600 text-white' : 'text-neutral-500'
                  }`}
                >
                  {t('shop_filter_low', { count: inventoryStats.lowStockItems })}
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('out')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    stockStatusFilter === 'out' ? 'bg-red-600 text-white' : 'text-neutral-500'
                  }`}
                >
                  {t('shop_filter_out', { count: inventoryStats.outOfStockItems })}
                </button>
              </div>

              {/* Category selector */}
              <FilterSelect
                label={t('shop_filter_category_label')}
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={categories.map((c) => ({ value: c, label: c === 'All' ? t('shop_categories_all') : c }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportInventoryCSV}
                className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <Download size={13} />
                <span>{t('shop_export_csv')}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="h-9 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>{t('shop_add_product')}</span>
              </button>
            </div>
          </div>

          {/* Universal Inventory Collection */}
          <UniversalDataCollection<Product>
            items={sortedInventory}
            keyExtractor={(p) => p.id}
            defaultViewMode="list"
            columns={productColumns}
            sortBy={invSortBy}
            sortDirection={invSortDir}
            onSortChange={(key) => {
              if (invSortBy === key) {
                setInvSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setInvSortBy(key);
                setInvSortDir('asc');
              }
            }}
            renderCard={(p) => {
              const isOut = p.stockQuantity <= 0;
              const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
              const costAmt = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);

              return (
                <div className="flex flex-col justify-between w-full h-full">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                        {p.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] tabular-nums ${
                          isOut
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {p.stockQuantity} {p.unit || t('shop_unit_pcs')}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1 mb-1">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mb-3">
                      {p.description || t('shop_standard_article')}
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-xs mb-3">
                      <div>
                        <span className="text-neutral-400 block text-[9px] uppercase font-medium">
                          {t('shop_col_cost')}
                        </span>
                        <span className="font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                          {formatMoney(costAmt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[9px] uppercase font-medium">
                          {t('shop_col_retail')}
                        </span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                          {formatMoney(p.price.amount)}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-neutral-400 text-[10px] font-mono">
                          {p.sku}
                        </span>
                        <span className="font-mono font-bold text-[#C4785A] text-xs tabular-nums">
                          {formatMoney(p.price.amount * p.stockQuantity)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductForAdjust(p);
                        setAdjustQuantity(10);
                        setAdjustMode('add');
                        setIsAdjustStockModalOpen(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-[#C4785A] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowDownUp size={13} />
                      <span>{t('shop_adjust_tooltip') || 'Adjust Stock'}</span>
                    </button>
                  </div>
                </div>
              );
            }}
            onItemClick={(p) => handleOpenEditProduct(p)}
            onViewDetails={(p) => handleOpenEditProduct(p)}
            onEdit={(p) => handleOpenEditProduct(p)}
            onTogglePin={(p) => {
              setPinnedProductIds((prev) => {
                const next = new Set(prev);
                if (next.has(p.id)) {
                  next.delete(p.id);
                  showToast({
                    type: 'info',
                    title: 'Unpinned',
                    message: `${p.name} unpinned`,
                  });
                } else {
                  next.add(p.id);
                  showToast({
                    type: 'info',
                    title: 'Pinned',
                    message: `${p.name} pinned to top`,
                  });
                }
                return next;
              });
            }}
            onDelete={(p) => {
              if (window.confirm(t('shop_delete_confirm', { name: p.name }))) {
                deleteProduct(p.id);
              }
            }}
            customActions={(p) => [
              {
                id: 'adjust',
                tooltip: t('shop_adjust_tooltip') || 'Adjust Stock',
                icon: <ArrowDownUp size={13} />,
                iconColor: '#C4785A',
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedProductForAdjust(p);
                  setAdjustQuantity(10);
                  setAdjustMode('add');
                  setIsAdjustStockModalOpen(true);
                },
              },
            ]}
            isPinned={(p) => pinnedProductIds.has(p.id)}
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            emptyTitle={t('shop_table_empty')}
            emptyDescription={t('shop_empty_cat_sub')}
            primaryActionLabel={t('shop_add_product')}
            onAddFirstItem={handleOpenAddProduct}
          />

          {/* Recent Stock Movements Log */}
          {stockMovements.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  {t('shop_movements_title')}
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {t('shop_movements_count', { count: stockMovements.length })}
                </span>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {stockMovements.slice(0, 6).map((sm) => (
                  <div key={sm.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-900 dark:text-white truncate">
                        {sm.productName}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {t('shop_movement_by', {
                          reason: sm.reason || sm.type,
                          user: sm.createdBy || 'Staff',
                          date: new Date(sm.createdAt).toLocaleString(),
                        })}
                      </div>
                    </div>
                    <div className={`shrink-0 ${isRtl ? 'text-left' : 'text-right'}`}>
                      <span className={`font-mono font-bold text-xs ${
                        sm.quantity > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {sm.quantity > 0 ? `+${sm.quantity}` : sm.quantity}
                      </span>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {sm.previousStock} → {sm.newStock}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RECEIPT & REGISTER SETUP                                          */}
      {/* ========================================================================= */}
      {activeTab === 'receipt_settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Settings Form */}
          <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div>
              <h2 className="text-base font-black text-neutral-900 dark:text-white">
                {t('shop_receipt_branding_title')}
              </h2>
              <p className="text-xs text-neutral-500">
                {t('shop_receipt_branding_desc')}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <LabelInput
                field="StoreTitle"
                label={t('shop_field_store_title')}
                value={receiptConfig.headerTitle}
                onChange={(v) => updateReceiptConfig({ headerTitle: v })}
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                field="Tagline"
                label={t('shop_field_tagline')}
                value={receiptConfig.subHeader || ''}
                onChange={(v) => updateReceiptConfig({ subHeader: v })}
                width="100%"
                height={40}
                corner={12}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="Phone"
                  label={t('shop_field_phone')}
                  value={receiptConfig.phone || ''}
                  onChange={(v) => updateReceiptConfig({ phone: v })}
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  field="TaxId"
                  label={t('shop_field_tax_id')}
                  value={receiptConfig.taxId || ''}
                  onChange={(v) => updateReceiptConfig({ taxId: v })}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <LabelInput
                field="Address"
                label={t('shop_field_address')}
                value={receiptConfig.address || ''}
                onChange={(v) => updateReceiptConfig({ address: v })}
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                field="Footer"
                label={t('shop_field_footer')}
                value={receiptConfig.footerMessage || ''}
                onChange={(v) => updateReceiptConfig({ footerMessage: v })}
                width="100%"
                height={40}
                corner={12}
              />

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={receiptConfig.showTaxBreakdown}
                    onChange={(e) => updateReceiptConfig({ showTaxBreakdown: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C4785A]"
                  />
                  <span>{t('shop_toggle_tax')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={receiptConfig.showCashier}
                    onChange={(e) => updateReceiptConfig({ showCashier: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C4785A]"
                  />
                  <span>{t('shop_toggle_cashier')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={receiptConfig.showBarcode}
                    onChange={(e) => updateReceiptConfig({ showBarcode: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C4785A]"
                  />
                  <span>{t('shop_toggle_barcode')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Receipt Slip Preview */}
          <div className="p-5 rounded-3xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 flex flex-col items-center">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              {t('shop_preview_title')}
            </div>

            <div className="w-[300px] bg-white text-black p-5 shadow-xl font-mono text-[11px] leading-relaxed border-t-4 border-[#C4785A]">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-neutral-400">
                <div className="text-base font-black tracking-wider uppercase">
                  {receiptConfig.headerTitle}
                </div>
                {receiptConfig.subHeader && (
                  <div className="text-[10px] text-neutral-600">{receiptConfig.subHeader}</div>
                )}
                {receiptConfig.address && (
                  <div className="text-[9px] text-neutral-500">{receiptConfig.address}</div>
                )}
                {receiptConfig.phone && (
                  <div className="text-[9px] text-neutral-500">Tel: {receiptConfig.phone}</div>
                )}
                {receiptConfig.taxId && (
                  <div className="text-[9px] font-bold text-neutral-600 pt-0.5">{receiptConfig.taxId}</div>
                )}
              </div>

              <div className="py-2.5 text-[10px] border-b border-dashed border-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>{t('shop_receipt_sample_num')}</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                {receiptConfig.showCashier && (
                  <div className="flex justify-between">
                    <span>{t('shop_receipt_sample_cashier')}</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('shop_receipt_sample_client')}</span>
                  <span>{t('shop_receipt_terminal')}</span>
                </div>
              </div>

              {/* Items table */}
              <div className="py-2.5 space-y-1.5 border-b border-dashed border-neutral-400">
                <div className="flex justify-between font-bold text-[10px]">
                  <span>{t('shop_receipt_item_qty_header')}</span>
                  <span>{t('shop_receipt_total_header')}</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Espresso Beans 1kg</span>
                  <span>3,200 DA</span>
                </div>
                <div className="flex justify-between">
                  <span>2x French Croissant</span>
                  <span>960 DA</span>
                </div>
              </div>

              {/* Summary */}
              <div className="py-2.5 space-y-1 border-b border-dashed border-neutral-400">
                <div className="flex justify-between">
                  <span>{t('shop_receipt_subtotal_header')}</span>
                  <span>4,160 DA</span>
                </div>
                {receiptConfig.showTaxBreakdown && (
                  <div className="flex justify-between text-[10px] text-neutral-600">
                    <span>{t('shop_receipt_vat_header')}</span>
                    <span>374 DA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>{t('shop_receipt_total_due_header')}</span>
                  <span>4,160 DA</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600 pt-1">
                  <span>{t('shop_receipt_tender_cash_header')}</span>
                  <span>5,000 DA</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>{t('shop_receipt_change_header')}</span>
                  <span>840 DA</span>
                </div>
              </div>

              {/* Barcode & Footer */}
              <div className="pt-3 text-center space-y-2">
                {receiptConfig.showBarcode && (
                  <div className="w-40 h-8 mx-auto bg-neutral-900 text-white text-[8px] flex items-center justify-center tracking-widest font-mono">
                    ||||| | |||| || ||| ||||
                  </div>
                )}
                <div className="text-[10px] font-bold text-neutral-800">
                  {receiptConfig.footerMessage || t('shop_receipt_default_footer')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* End of Bottom Workstation Pod Tray */}
      </div>
      {/* End of Outer Workspace Panel */}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CHECKOUT / ENCAISSEMENT                                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title={t('shop_modal_checkout_title')}
        subtitle={t('shop_modal_checkout_subtitle', { amount: formatMoney(cartTotal) })}
      >
        <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Mode Switch: Single vs Split */}
          <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCheckoutMode('single')}
              className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                checkoutMode === 'single'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              <Banknote size={14} />
              <span>{t('shop_mode_single')}</span>
            </button>
            <button
              type="button"
              onClick={() => setCheckoutMode('split')}
              className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                checkoutMode === 'split'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              <Split size={14} />
              <span>{t('shop_mode_split')}</span>
            </button>
          </div>

          {/* Single Tender Method Selection */}
          {checkoutMode === 'single' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {t('shop_tender_method_label')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Card', 'MemberBalance'] as const).map((method) => {
                  const isSelected = singlePaymentMethod === method;
                  const label =
                    method === 'Cash'
                      ? t('pos_tender_cash')
                      : method === 'Card'
                      ? t('pos_tender_card')
                      : t('shop_tender_member_bal');
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSinglePaymentMethod(method)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A] shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {method === 'Cash' && <Banknote size={18} />}
                      {method === 'Card' && <CreditCard size={18} />}
                      {method === 'MemberBalance' && <User size={18} />}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Change Calculator */}
              {singlePaymentMethod === 'Cash' && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-neutral-400">
                      {t('shop_cash_settlement')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountTenderedInput(cartTotal.toString())}
                      className="text-[11px] font-bold text-[#C4785A] hover:underline cursor-pointer"
                    >
                      {t('shop_exact_cash_btn', { amount: formatMoney(cartTotal) })}
                    </button>
                  </div>
                  <LabelInput
                    field="Tendered"
                    label={t('shop_amount_tendered_input')}
                    type="number"
                    value={amountTenderedInput}
                    onChange={setAmountTenderedInput}
                    width="100%"
                    height={48}
                    corner={14}
                  />

                  {/* Change output */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-neutral-500">
                      {t('pos_change_due_label')} :
                    </span>
                    <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatMoney(changeDue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Split Payment Form */}
          {checkoutMode === 'split' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-neutral-500">
                  {t('shop_split_total_order', { amount: formatMoney(cartTotal) })}
                </span>
                <span className={splitRemaining === 0 ? 'text-emerald-600 font-mono' : 'text-red-500 font-mono'}>
                  {splitRemaining === 0 ? t('shop_split_balanced') : t('shop_split_remaining', { amount: formatMoney(splitRemaining) })}
                </span>
              </div>

              <div className="space-y-2">
                {splitPayments.map((sp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-36">
                      <LabelSelect
                        field="Method"
                        label={t('shop_split_col_method')}
                        value={sp.method}
                        onChange={(val) => {
                          const v = typeof val === 'string' ? val : val.target?.value || val;
                          const newArr = [...splitPayments];
                          newArr[idx].method = v as any;
                          setSplitPayments(newArr);
                        }}
                        options={[
                          { value: 'Cash', label: t('pos_tender_cash') },
                          { value: 'Card', label: t('pos_tender_card') },
                          { value: 'BankTransfer', label: t('pos_tender_baridimob') },
                          { value: 'Credit', label: t('shop_split_credit') },
                        ]}
                        height={40}
                        corner={12}
                      />
                    </div>

                    <div className="flex-1">
                      <LabelInput
                        field="Amount"
                        label={t('shop_split_col_amount')}
                        type="number"
                        value={sp.amount || ''}
                        onChange={(val) => {
                          const newArr = [...splitPayments];
                          newArr[idx].amount = parseFloat(val?.target?.value ?? val) || 0;
                          setSplitPayments(newArr);
                        }}
                        width="100%"
                        height={40}
                        corner={12}
                      />
                    </div>

                    {splitPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                        className="text-neutral-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setSplitPayments([...splitPayments, { method: 'Cash', amount: Math.max(0, splitRemaining) }])}
                  className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus size={13} />
                  <span>{t('shop_add_split_line')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Cashier Attribution & Contact Phone */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              <LabelSelect
                field="Cashier"
                label={t('shop_field_cashier')}
                value={selectedCashierName}
                onChange={(val) => setSelectedCashierName(typeof val === 'string' ? val : val.target?.value || val)}
                options={staff.map((s) => ({
                  value: s.fullName,
                  label: `${s.fullName} (${s.role})`,
                }))}
                height={46}
                corner={14}
              />
            </div>

            <div>
              <LabelInput
                field="CustPhone"
                label={t('shop_field_phone_optional')}
                type="tel"
                value={checkoutCustomerPhone}
                onChange={setCheckoutCustomerPhone}
                placeholder="+213 550..."
                width="100%"
                height={42}
                corner={12}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <LabelInput
              field="TransNotes"
              label={t('shop_field_notes_optional')}
              value={checkoutNotes}
              onChange={setCheckoutNotes}
              placeholder="e.g. Counter #1 - BaridiMob Ref #9812"
              width="100%"
              height={42}
              corner={12}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmCheckout}
              className="h-10 px-6 text-xs font-bold text-white bg-[#C4785A] rounded-full flex items-center gap-2 hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
            >
              <CheckCircle2 size={15} />
              <span>{t('shop_btn_complete_sale')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SALE CONFIRMATION & THERMAL RECEIPT SLIP                           */}
      {/* ========================================================================= */}
      {completedSale && (
        <Modal
          isOpen={true}
          onClose={() => setCompletedSale(null)}
          title={t('shop_sale_success_title')}
          subtitle={t('shop_receipt_number_sub', { id: completedSale.id.slice(-6).toUpperCase() })}
        >
          <div className="space-y-4" dir="ltr">
            {/* Printable Thermal Receipt Slip Container */}
            <div
              id="pos-thermal-receipt-container"
              className="mx-auto max-w-[340px] bg-white text-black p-4 rounded-xl border border-neutral-300 font-mono text-[11px] leading-relaxed shadow-xs"
            >
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-neutral-400">
                <div className="text-sm font-black uppercase tracking-wider">
                  {receiptConfig.headerTitle}
                </div>
                {receiptConfig.subHeader && (
                  <div className="text-[10px] text-neutral-600">{receiptConfig.subHeader}</div>
                )}
                {receiptConfig.address && (
                  <div className="text-[9px] text-neutral-500">{receiptConfig.address}</div>
                )}
                {receiptConfig.phone && (
                  <div className="text-[9px] text-neutral-500">Tel: {receiptConfig.phone}</div>
                )}
                {receiptConfig.taxId && (
                  <div className="text-[9px] font-bold text-neutral-600">{receiptConfig.taxId}</div>
                )}
              </div>

              <div className="py-2 text-[10px] border-b border-dashed border-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>{language === 'ar' ? `وصل رقم / TICKET : #${completedSale.id.slice(-8).toUpperCase()}` : language === 'fr' ? `TICKET : #${completedSale.id.slice(-8).toUpperCase()}` : `RECEIPT: #${completedSale.id.slice(-8).toUpperCase()}`}</span>
                  <span>{new Date(completedSale.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'ar' ? `الكاشير / CAISSIER : ${completedSale.cashierName || 'Cashier'}` : language === 'fr' ? `CAISSIER : ${completedSale.cashierName || 'Caissier'}` : `CASHIER: ${completedSale.cashierName || 'Cashier'}`}</span>
                  <span>{new Date(completedSale.createdAt).toLocaleTimeString()}</span>
                </div>
                {completedSale.memberName && (
                  <div className="flex justify-between font-bold">
                    <span>{language === 'ar' ? 'الزبون / CLIENT :' : language === 'fr' ? 'CLIENT :' : 'CUSTOMER:'}</span>
                    <span>{completedSale.memberName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400 text-[11px]">
                {completedSale.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">
                      {formatMoney(it.totalPrice)} {language === 'ar' ? 'د.ج' : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Tenders */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400">
                {completedSale.subtotal && completedSale.subtotal !== completedSale.totalAmount && (
                  <div className="flex justify-between text-neutral-600">
                    <span>{language === 'ar' ? 'المجموع الفرعي / SOUS-TOTAL' : language === 'fr' ? 'SOUS-TOTAL' : 'SUBTOTAL'}</span>
                    <span>{formatMoney(completedSale.subtotal)} {language === 'ar' ? 'د.ج' : ''}</span>
                  </div>
                )}
                {completedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>{language === 'ar' ? 'الخصم / REMISE' : language === 'fr' ? 'REMISE' : 'DISCOUNT'}</span>
                    <span>-{formatMoney(completedSale.discountAmount)} {language === 'ar' ? 'د.ج' : ''}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>{language === 'ar' ? 'المجموع المدفوع / TOTAL PAYÉ' : language === 'fr' ? 'TOTAL PAYÉ' : 'TOTAL PAID'}</span>
                  <span>{formatMoney(completedSale.totalAmount)} {language === 'ar' ? 'د.ج' : ''}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600 pt-1">
                  <span>{language === 'ar' ? 'طريقة الدفع / MODE DE PAIEMENT :' : language === 'fr' ? 'MODE DE PAIEMENT :' : 'METHOD:'}</span>
                  <span className="font-bold">
                    {completedSale.paymentMethod === 'Cash'
                      ? (language === 'ar' ? 'نقداً / Espèces' : language === 'fr' ? 'Espèces' : 'Cash')
                      : completedSale.paymentMethod}
                  </span>
                </div>
                {completedSale.amountTendered !== undefined && completedSale.paymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span>{language === 'ar' ? 'المقبوض / REÇU :' : language === 'fr' ? 'REÇU :' : 'TENDERED:'}</span>
                      <span>{formatMoney(completedSale.amountTendered)} {language === 'ar' ? 'د.ج' : ''}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>{language === 'ar' ? 'المتبقي / RENDU :' : language === 'fr' ? 'MONNAIE RENDUE :' : 'CHANGE DUE:'}</span>
                      <span>{formatMoney(completedSale.changeGiven || 0)} {language === 'ar' ? 'د.ج' : ''}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Barcode & Footer */}
              <div className="pt-2 text-center space-y-1.5">
                {receiptConfig.showBarcode && (
                  <div className="w-36 h-6 mx-auto bg-neutral-900 text-white text-[7px] flex items-center justify-center tracking-widest">
                    |||| || ||||| || |||
                  </div>
                )}
                <div className="text-[10px] font-bold">
                  {receiptConfig.footerMessage || t('shop_receipt_default_footer')}
                </div>
              </div>
            </div>

            {/* Desktop ESC/POS Notice */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-neutral-800 dark:text-neutral-200">
                <span className="flex items-center gap-1.5 text-[#C4785A]">
                  <Printer size={13} />
                  <span>{t('shop_escpos_hardware_title')}</span>
                </span>
                <span className="text-[10px] bg-[#C4785A]/15 text-[#C4785A] px-2 py-0.5 rounded-full">
                  Atrium Desktop
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                {t('shop_escpos_hardware_desc')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-full cursor-pointer flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700"
              >
                <Printer size={14} />
                <span>{t('shop_btn_print')}</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 h-10 text-xs font-bold text-white bg-[#C4785A] rounded-full cursor-pointer hover:opacity-90 shadow-xs"
              >
                {t('shop_btn_new_order')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM UNLISTED ITEM                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        title={t('shop_custom_modal_title')}
        subtitle={t('shop_custom_modal_subtitle')}
      >
        <form onSubmit={handleAddCustomItem} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="CustomItemName"
            label={t('shop_custom_name')}
            required
            value={customItemName}
            onChange={setCustomItemName}
            placeholder="e.g. Special Fresh Order / Custom Repair"
            width="100%"
            height={46}
            corner={14}
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="CustomPrice"
              label={t('shop_custom_price')}
              type="number"
              required
              value={customItemPrice ? String(customItemPrice) : ''}
              onChange={(v) => setCustomItemPrice(parseFloat(v) || 0)}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="CustomCategory"
              label={t('shop_custom_category')}
              value={customItemCategory}
              onChange={setCustomItemCategory}
              placeholder="General"
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsCustomItemModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs cursor-pointer"
            >
              {t('shop_custom_btn_add')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: HOLD / PARK ORDER                                                 */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHoldOrderModalOpen}
        onClose={() => setIsHoldOrderModalOpen(false)}
        title={t('shop_hold_modal_title')}
        subtitle={t('shop_hold_modal_subtitle')}
      >
        <form onSubmit={handleHoldOrder} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="HoldRef"
            label={t('shop_hold_ref')}
            value={holdOrderRefName}
            onChange={setHoldOrderRefName}
            placeholder={t('shop_hold_ref_ph')}
            width="100%"
            height={46}
            corner={14}
          />

          <LabelInput
            field="HoldNotes"
            label={t('shop_hold_notes')}
            value={holdOrderNotes}
            onChange={setHoldOrderNotes}
            placeholder={t('shop_hold_notes_ph')}
            width="100%"
            height={46}
            corner={14}
          />

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsHoldOrderModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PauseCircle size={14} />
              <span>{t('shop_hold_confirm_btn')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: STOCK ADJUSTMENT / AUDIT                                          */}
      {/* ========================================================================= */}
      {selectedProductForAdjust && (
        <Modal
          isOpen={isAdjustStockModalOpen}
          onClose={() => {
            setIsAdjustStockModalOpen(false);
            setSelectedProductForAdjust(null);
          }}
          title={t('shop_adjust_modal_title')}
          subtitle={selectedProductForAdjust.name}
        >
          <form onSubmit={handleConfirmStockAdjust} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between text-xs font-bold">
              <span className="text-neutral-500">{t('shop_adjust_current')}</span>
              <span className="font-mono text-neutral-900 dark:text-white text-sm">
                {selectedProductForAdjust.stockQuantity} {selectedProductForAdjust.unit || t('shop_unit_pcs')}
              </span>
            </div>

            {/* Mode selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {t('shop_adjust_action')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    adjustMode === 'add' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {t('shop_adjust_restock')}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('remove')}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    adjustMode === 'remove' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {t('shop_adjust_damage')}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('set')}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    adjustMode === 'set' ? 'border-[#C4785A] bg-orange-50 text-[#C4785A] dark:bg-orange-950/40' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {t('shop_adjust_audit')}
                </button>
              </div>
            </div>

            <div>
              <LabelInput
                field="AdjustQuantity"
                label={adjustMode === 'set' ? t('shop_adjust_new_count') : t('shop_adjust_quantity')}
                type="number"
                min="0"
                required
                value={adjustQuantity}
                onChange={(val) => setAdjustQuantity(Number(val?.target?.value || val || 0))}
                width="100%"
                height={46}
                corner={14}
              />
            </div>

            <div>
              <LabelInput
                field="AdjustReason"
                label={t('shop_adjust_reason')}
                value={adjustReason}
                onChange={setAdjustReason}
                placeholder={t('shop_adjust_reason_ph')}
                width="100%"
                height={46}
                corner={14}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsAdjustStockModalOpen(false);
                  setSelectedProductForAdjust(null);
                }}
                className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
              >
                {t('action_cancel')}
              </button>
              <button
                type="submit"
                className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs cursor-pointer"
              >
                {t('shop_adjust_apply_btn')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PRODUCT                                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isProductFormModalOpen}
        onClose={() => {
          setIsProductFormModalOpen(false);
          setEditingProductId(null);
        }}
        title={editingProductId ? t('shop_product_modal_edit') : t('shop_product_modal_add')}
        subtitle={t('shop_product_modal_sub', { branch: currentBranch.name })}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="ProductName"
            label={t('shop_prod_name')}
            required
            value={formName}
            onChange={setFormName}
            placeholder={t('shop_prod_name_ph')}
            width="100%"
            height={46}
            corner={14}
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelSelect
              field="Category"
              label={t('shop_prod_cat')}
              value={formCategory}
              onChange={(val) => setFormCategory(typeof val === 'string' ? val : val.target?.value || val)}
              options={[
                { value: 'Beverage', label: t('shop_cat_beverage') },
                { value: 'Grocery', label: t('shop_cat_grocery') },
                { value: 'Bakery', label: t('shop_cat_bakery') },
                { value: 'General', label: t('shop_cat_general') },
                { value: 'Supplement', label: t('shop_cat_supplement') },
                { value: 'Equipment', label: t('shop_cat_equipment') },
                { value: 'Clothing', label: t('shop_cat_clothing') },
                { value: 'Service', label: t('shop_cat_service') },
              ]}
              height={46}
              corner={14}
            />

            <LabelSelect
              field="Unit"
              label={t('shop_prod_unit')}
              value={formUnit}
              onChange={(val) => setFormUnit(typeof val === 'string' ? val : val.target?.value || val)}
              options={[
                { value: 'pcs', label: `${t('shop_unit_pcs')} (pcs)` },
                { value: 'pack', label: t('shop_unit_pack') },
                { value: 'box', label: t('shop_unit_box') },
                { value: 'kg', label: t('shop_unit_kg') },
                { value: 'g', label: t('shop_unit_g') },
                { value: 'l', label: t('shop_unit_l') },
              ]}
              height={46}
              corner={14}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="Sku"
              label={t('shop_prod_sku')}
              value={formSku}
              onChange={setFormSku}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="Barcode"
              label={t('shop_prod_barcode')}
              value={formBarcode}
              onChange={setFormBarcode}
              placeholder="6131100..."
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="Price"
              label={t('shop_prod_price')}
              type="number"
              required
              value={formPrice ? String(formPrice) : ''}
              onChange={(v) => setFormPrice(parseFloat(v) || 0)}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="Cost"
              label={t('shop_prod_cost')}
              type="number"
              value={formCost ? String(formCost) : ''}
              onChange={(v) => setFormCost(parseFloat(v) || 0)}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="Stock"
              label={t('shop_prod_stock')}
              type="number"
              required
              value={formStock !== undefined ? String(formStock) : ''}
              onChange={(v) => setFormStock(parseInt(v) || 0)}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="Reorder"
              label={t('shop_prod_reorder')}
              type="number"
              value={formReorder !== undefined ? String(formReorder) : ''}
              onChange={(v) => setFormReorder(parseInt(v) || 5)}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsProductFormModalOpen(false);
                setEditingProductId(null);
              }}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="h-10 px-6 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs cursor-pointer"
            >
              {editingProductId ? t('shop_prod_update') : t('shop_prod_save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ShopScreen = PosRegisterView;
export type ShopScreenProps = PosRegisterViewProps;
