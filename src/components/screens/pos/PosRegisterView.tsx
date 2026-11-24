import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  User,
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
  Settings2,
  Eye,
} from 'lucide-react';
import {
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
  selectCurrentMembersFromState,
  selectCurrentParkedOrdersFromState,
  selectCurrentProductsFromState,
  selectCurrentSalesFromState,
  selectCurrentStaffFromState,
  selectCurrentStockMovementsFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
  useDashboardShellState,
} from '../../../services/store';
import { Product, ParkedOrder } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion, useRetainedModalValue } from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonPosRegister } from '../../ui/skeleton/StructuralSkeletons';
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
  ListAdvancedMenuButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  notes?: string;
}

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
    // ignore audio failure in headless browsers
  }
};

export const PosRegisterView: React.FC<{ initialTab?: 'register' | 'parked' | 'receipt_settings' | 'inventory' }> = ({
  initialTab = 'register',
}) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    processSale,
    adjustStock,
    addProduct,
    updateProduct,
    deleteProduct,
    parkOrder,
    resumeParkedOrder,
    deleteParkedOrder,
    updateReceiptConfig,
  } = useAtriumActions();
  const { isSyncing, networkMode, isSyncTimeout, lastSyncedAt, retryCloudSync } =
    useDashboardShellState();
  const {
    products,
    members,
    staff,
    currentBranch,
    currentBusinessConfig,
    branches,
    parkedOrders,
    sales,
    stockMovements,
    receiptConfig,
  } = useAtriumSelector(
    (s) => ({
      products: selectCurrentProductsFromState(s),
      members: selectCurrentMembersFromState(s),
      staff: selectCurrentStaffFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
      branches: s.branches,
      parkedOrders: selectCurrentParkedOrdersFromState(s),
      sales: selectCurrentSalesFromState(s),
      stockMovements: selectCurrentStockMovementsFromState(s),
      receiptConfig: s.receiptConfig,
    }),
    shallowEqualObjects
  );
  const configuredDefaultTva = currentBusinessConfig.defaultTvaRate ?? 19;

  const [activeTab, setActiveTab] = useState<'register' | 'parked' | 'receipt_settings' | 'inventory'>(initialTab);
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderDiscountType, setOrderDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [orderDiscountValue, setOrderDiscountValue] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState(1000);
  const [customItemCategory, setCustomItemCategory] = useState('General');

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'single' | 'split'>('single');
  const [singlePaymentMethod, setSinglePaymentMethod] = useState('Cash');
  const [amountTenderedInput, setAmountTenderedInput] = useState('');
  const [selectedCashierName, setSelectedCashierName] = useState(staff[0]?.fullName || 'Cashier Desk');
  const [checkoutCustomerPhone, setCheckoutCustomerPhone] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [splitPayments, setSplitPayments] = useState([
    { method: 'Cash', amount: 0 },
    { method: 'Card', amount: 0 },
  ]);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const retainedCompletedSale = useRetainedModalValue(completedSale);

  const [isHoldOrderModalOpen, setIsHoldOrderModalOpen] = useState(false);
  const [holdOrderRefName, setHoldOrderRefName] = useState('');
  const [holdOrderNotes, setHoldOrderNotes] = useState('');

  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const retainedProductForAdjust = useRetainedModalValue(
    isAdjustStockModalOpen ? selectedProductForAdjust : null
  );
  const [adjustQuantity, setAdjustQuantity] = useState(10);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState('');

  const [isProductFormModalOpen, setIsProductFormModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Beverage');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formPrice, setFormPrice] = useState(1500);
  const [formCost, setFormCost] = useState(900);
  const [formStock, setFormStock] = useState(25);
  const [formReorder, setFormReorder] = useState(5);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formTaxRate, setFormTaxRate] = useState(configuredDefaultTva);

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedProductIds, setPinnedProductIds] = useState<Set<string>>(() => new Set<string>());
  const [invSortBy, setInvSortBy] = useState('name');
  const [invSortDir, setInvSortDir] = useState<'asc' | 'desc'>('asc');

  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [inspectingParked, setInspectingParked] = useState<ParkedOrder | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      const isOut = p.stockQuantity <= 0;
      const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
      if (stockStatusFilter === 'out' && !isOut) return false;
      if (stockStatusFilter === 'low' && !isLow) return false;
      if (q) {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [products, branchFilter, categoryFilter, stockStatusFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedInventory = useMemo(() => {
    const sign = invSortDir === 'asc' ? 1 : -1;
    return [...filteredProducts].sort((a, b) => {
      const aPinned = pinnedProductIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedProductIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (invSortBy === 'category') return a.category.localeCompare(b.category) * sign;
      if (invSortBy === 'sku') return a.sku.localeCompare(b.sku) * sign;
      if (invSortBy === 'cost') {
        const aCost = a.costPrice || a.cost?.amount || Math.round(a.price.amount * 0.6);
        const bCost = b.costPrice || b.cost?.amount || Math.round(b.price.amount * 0.6);
        return (aCost - bCost) * sign;
      }
      if (invSortBy === 'retail' || invSortBy === 'price') return (a.price.amount - b.price.amount) * sign;
      if (invSortBy === 'stock') return (a.stockQuantity - b.stockQuantity) * sign;
      if (invSortBy === 'val') return (a.price.amount * a.stockQuantity - b.price.amount * b.stockQuantity) * sign;
      if (invSortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return a.name.localeCompare(b.name) * sign;
    });
  }, [filteredProducts, pinnedProductIds, invSortBy, invSortDir, branchesById, currentBranch, language]);

  const inventoryStats = useMemo(() => {
    let totalUnits = 0;
    let retailValuation = 0;
    let costValuation = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    const branchCounts = new Map<string, number>();

    products.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
      totalUnits += p.stockQuantity;
      retailValuation += p.price.amount * p.stockQuantity;
      const c = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);
      costValuation += c * p.stockQuantity;
      if (p.stockQuantity <= 0) outOfStockItems++;
      else if (p.stockQuantity <= (p.reorderLevel || 5)) lowStockItems++;
    });

    return {
      totalSKUs: products.length,
      totalUnits,
      retailValuation,
      costValuation,
      potentialProfit: Math.max(0, retailValuation - costValuation),
      lowStockItems,
      outOfStockItems,
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [products, branchesById, currentBranch, language]);

  const sessionMetrics = useMemo(() => {
    const todaySales = (sales || []).filter((s) => s.facilityId === currentBranch.id && s.status !== 'Refunded');
    const turnover = todaySales.reduce((acc, s) => acc + (typeof s.totalAmount === 'number' ? s.totalAmount : 0), 0);
    const totalCash = todaySales.reduce((acc, s) => {
      if (s.paymentMethod === 'Cash') return acc + (s.totalAmount || 0);
      if (s.paymentMethod === 'Split' && s.payments) {
        return acc + s.payments.filter((p) => p.method === 'Cash').reduce((cAcc, cp) => cAcc + cp.amount, 0);
      }
      return acc;
    }, 0);
    const parkedCount = parkedOrders.length;
    const parkedValuation = parkedOrders.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    return { todaySalesCount: todaySales.length, turnover, totalCash, parkedCount, parkedValuation };
  }, [sales, currentBranch.id, parkedOrders]);

  const cartSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.product.price.amount * item.quantity - item.discount, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (orderDiscountType === 'percent') {
      return Math.round((cartSubtotal * Math.min(100, Math.max(0, orderDiscountValue))) / 100);
    }
    return Math.min(cartSubtotal, Math.max(0, orderDiscountValue));
  }, [cartSubtotal, orderDiscountType, orderDiscountValue]);

  const taxAmount = useMemo(() => {
    if (!receiptConfig.showTaxBreakdown || cartSubtotal <= 0) return 0;
    const discountRatio = Math.max(0, 1 - discountAmount / cartSubtotal);
    const totalTax = cart.reduce((acc, item) => {
      const lineNet = (item.product.price.amount * item.quantity - item.discount) * discountRatio;
      const itemRate = item.product.taxRate ?? configuredDefaultTva;
      return acc + lineNet * (Math.max(0, itemRate) / 100);
    }, 0);
    return Math.round(totalTax);
  }, [cart, cartSubtotal, discountAmount, receiptConfig.showTaxBreakdown, configuredDefaultTva]);

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal - discountAmount + taxAmount),
    [cartSubtotal, discountAmount, taxAmount]
  );

  const numericAmountTendered = useMemo(() => {
    const n = parseFloat(amountTenderedInput);
    return isNaN(n) ? 0 : n;
  }, [amountTenderedInput]);

  const changeDue = useMemo(() => {
    if (checkoutMode === 'split' || singlePaymentMethod !== 'Cash') return 0;
    return Math.max(0, numericAmountTendered - cartTotal);
  }, [checkoutMode, singlePaymentMethod, numericAmountTendered, cartTotal]);

  const splitTotal = useMemo(
    () => splitPayments.reduce((acc, sp) => acc + (sp.amount || 0), 0),
    [splitPayments]
  );
  const splitRemaining = useMemo(() => cartTotal - splitTotal, [cartTotal, splitTotal]);

  const addToCart = useCallback(
    (product: Product) => {
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
    },
    [soundEnabled, t]
  );

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
      if (soundEnabled) playBeep(330, 0.2);
      showToast({
        type: 'warning',
        title: t('shop_toast_not_found_title'),
        message: t('shop_toast_not_found_msg', { query: barcodeQuery }),
      });
    }
  };

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

  const updateLineDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, discount: Math.max(0, Math.min(item.product.price.amount * item.quantity, discount)) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

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
      stockQuantity: 9999,
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
      (checkoutMode === 'split' ? 'Split' : singlePaymentMethod) as any,
      selectedCustomerId || undefined,
      checkoutNotes.trim() || undefined,
      {
        subtotal: cartSubtotal,
        discount: discountAmount,
        discountAmount,
        taxAmount,
        payments: (checkoutMode === 'split' ? splitPayments.filter((p) => p.amount > 0) : undefined) as any,
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
  };

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
  };

  const handleResumeOrder = (parked: ParkedOrder) => {
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

  const handleConfirmStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    const deltaOrVal =
      adjustMode === 'add'
        ? Math.abs(adjustQuantity)
        : adjustMode === 'remove'
        ? -Math.abs(adjustQuantity)
        : Math.max(0, adjustQuantity);
    const movementType = adjustMode === 'set' ? 'Adjustment' : adjustMode === 'add' ? 'Restock' : 'Damage';
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
    setFormTaxRate(prod.taxRate ?? configuredDefaultTva);
    setIsProductFormModalOpen(true);
  };

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
    setFormTaxRate(configuredDefaultTva);
    setIsProductFormModalOpen(true);
  };

  const handleResetFilters = useCallback(() => {
    setCategoryFilter('All');
    setStockStatusFilter('all');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = categoryFilter !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (categoryFilter !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const handleExportInventoryCSV = useCallback(() => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Retail Price (DA)',
      'Cost (DA)',
      'Stock Qty',
      'Reorder Level',
      'Valuation (DA)',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedInventory.map((p) => [
      p.sku,
      p.barcode || '',
      p.name,
      p.category,
      p.unit || 'pcs',
      p.price.amount,
      p.costPrice || p.cost?.amount || 0,
      p.stockQuantity,
      p.reorderLevel || 0,
      p.price.amount * p.stockQuantity,
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`atrium-pos-catalog-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [sortedInventory, isAr, isEn, branchesById, currentBranch, language]);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: products.length },
      { value: 'low', label: isAr ? 'منخفض' : isEn ? 'Low' : 'Bas', count: inventoryStats.lowStockItems },
      { value: 'out', label: isAr ? 'نفذ' : isEn ? 'Out' : 'Rupture', count: inventoryStats.outOfStockItems },
    ],
    [isAr, isEn, products.length, inventoryStats.lowStockItems, inventoryStats.outOfStockItems]
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
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: products.length },
          ...inventoryStats.branchOptionsWithCounts,
        ],
      },
      {
        id: 'category',
        label: isAr ? 'التصنيف' : isEn ? 'Category' : 'Catégorie',
        value: categoryFilter,
        onChange: setCategoryFilter,
        kind: 'tiles',
        columns: 2,
        options: categories.map((c) => ({
          value: c,
          label: c === 'All' ? t('shop_categories_all') : c,
        })),
      },
      {
        id: 'stockStatus',
        label: isAr ? 'حالة المخزون' : isEn ? 'Stock Level' : 'Niveau de stock',
        value: stockStatusFilter,
        onChange: (val) => setStockStatusFilter(val as 'all' | 'low' | 'out'),
        kind: 'segmented',
        options: statusOptions,
      },
    ],
    [isAr, isEn, branchFilter, products.length, inventoryStats.branchOptionsWithCounts, categoryFilter, categories, t, stockStatusFilter, statusOptions]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (categoryFilter !== 'All') chips.push({ key: 'category', label: categoryFilter, onRemove: () => setCategoryFilter('All') });
    return chips;
  }, [branchFilter, categoryFilter]);

  const registerProductColumns = useMemo<ColumnDefinition<Product>[]>(
    () => [
      {
        key: 'name',
        header: t('shop_col_product'),
        width: '2.2*',
        minWidth: '160px',
        sortable: true,
        renderCell: (p) => (
          <div className="flex items-center gap-2">
            <div
              data-sq="thumb"
              data-sq-border="none"
              className="w-7 h-7 bg-[#EFE9E2] dark:bg-[#2B2825] flex items-center justify-center font-semibold t-small text-black/70 dark:text-white/75 shrink-0"
            >
              {p.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="font-semibold t-small text-black dark:text-white truncate block">{p.name}</span>
              <span className="t-cap text-black/55 dark:text-white/55 tabular-nums block">
                {p.sku} {p.barcode ? `· ${p.barcode}` : ''}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: t('shop_col_category'),
        width: '1.1*',
        minWidth: '90px',
        sortable: true,
        renderCell: (p) => (
          <span className="px-2 py-1 rounded-[var(--r-check,6px)] bg-[#EFE9E2] dark:bg-[#2B2825] t-small font-semibold text-black/70 dark:text-white/75">
            {p.category}
          </span>
        ),
      },
      {
        key: 'price',
        header: t('shop_col_retail'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => (
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">
            {formatMoney(p.price.amount)}
          </span>
        ),
      },
      {
        key: 'stock',
        header: t('shop_col_stock'),
        width: '1.1*',
        minWidth: '95px',
        sortable: true,
        renderCell: (p) => {
          const isOut = p.stockQuantity <= 0;
          const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
          return (
            <span
              className={`inline-flex items-center gap-1 font-semibold px-2 py-1 rounded-full t-small tabular-nums ${
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
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => (
          <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(p, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'action',
        header: '',
        width: '90px',
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className={`h-7 px-2.5 t-small font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                isOut
                  ? 'bg-[#EFE9E2] dark:bg-[#2B2825] text-black/55 dark:text-white/55 cursor-not-allowed'
                  : inCartItem
                  ? 'bg-[var(--brand-fill,#C9461F)] text-white'
                  : 'bg-[#EFE9E2] dark:bg-[#2B2825] hover:bg-[#d4522f] hover:text-white text-black dark:text-white'
              }`}
            >
              <Plus size={12} />
              <span>{inCartItem ? `(${inCartItem.quantity})` : t('shop_add_btn')}</span>
            </button>
          );
        },
      },
    ],
    [t, cart, addToCart, isAr, isEn, branchesById, currentBranch, language]
  );

  const parkedOrderColumns = useMemo<ColumnDefinition<ParkedOrder>[]>(
    () => [
      {
        key: 'ref',
        header: isAr ? 'مرجع التذكرة' : isEn ? 'Ticket Reference' : 'Réf Commande',
        width: '1.8*',
        minWidth: '150px',
        sortable: true,
        renderCell: (po) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block">{po.referenceName}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums block">
              {new Date(po.createdAt).toLocaleTimeString()}
            </span>
          </div>
        ),
      },
      {
        key: 'items',
        header: isAr ? 'الأصناف' : isEn ? 'Items Preview' : 'Articles',
        width: '2.5*',
        minWidth: '180px',
        renderCell: (po) => (
          <div className="flex items-center gap-2 flex-wrap">
            {po.items.slice(0, 3).map((it, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-[var(--r-check,6px)] bg-[#EFE9E2] dark:bg-[#2B2825] t-small font-medium text-black/70 dark:text-white/75"
              >
                {it.quantity}x {it.productName}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: 'total',
        header: isAr ? 'المجموع' : isEn ? 'Total Amount' : 'Total',
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (po) => (
          <span className="tabular-nums font-semibold t-label text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
            {formatMoney(po.totalAmount)}
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (po) => (
          <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(po, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '140px',
        renderCell: (po) => (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleResumeOrder(po);
              }}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="h-8 px-3 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer"
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
              data-sq="ctl-sm"
              data-sq-border="none"
              className="h-8 px-2 text-black/55 dark:text-white/55 hover:text-red-500 cursor-pointer"
              title={t('shop_discard_order')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [isAr, isEn, t, branchesById, currentBranch, language, deleteParkedOrder]
  );

  const productColumns = useMemo<ColumnDefinition<Product>[]>(
    () => [
      {
        key: 'name',
        header: t('shop_col_item'),
        width: '2.2*',
        minWidth: '200px',
        sortable: true,
        renderCell: (p) => (
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white truncate">{p.name}</div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {p.description || t('shop_standard_article')}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: t('shop_col_category'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => (
          <span className="px-2 py-1 rounded-[var(--r-check,6px)] bg-[#EFE9E2] dark:bg-[#2B2825] t-small font-semibold text-black/70 dark:text-white/75">
            {p.category}
          </span>
        ),
      },
      {
        key: 'sku',
        header: t('shop_col_sku'),
        width: '1.3*',
        minWidth: '120px',
        sortable: true,
        renderCell: (p) => (
          <div className="tabular-nums t-cap text-black/55 dark:text-white/55">
            <div>{p.sku}</div>
            {p.barcode && <div className="t-cap">{p.barcode}</div>}
          </div>
        ),
      },
      {
        key: 'retail',
        header: t('shop_col_retail'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => (
          <span className="tabular-nums font-semibold text-black dark:text-white">
            {formatMoney(p.price.amount)}
          </span>
        ),
      },
      {
        key: 'stock',
        header: t('shop_col_stock'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => {
          const isOut = p.stockQuantity <= 0;
          const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
          return (
            <span
              className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full t-small tabular-nums ${
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
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => (
          <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(p, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [t, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: products.length > 0,
  });

  if (showSkeleton && (products.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonPosRegister
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative" dir={isRtl ? 'rtl' : 'ltr'}>
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
            font-size: 12px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <ScreenHeaderBar
        icon={<ShoppingBag size={22} />}
        title={t('shop_hub_title')}
        secondaryActions={
          <div className="flex items-center gap-2 flex-wrap">
            <LiveSegmentedControl
              size="md"
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as any)}
              options={[
                {
                  value: 'register',
                  label: t('nav_pos_register'),
                  icon: <Coins size={14} />,
                  count: cart.reduce((a, b) => a + b.quantity, 0),
                },
                {
                  value: 'parked',
                  label: t('shop_held_orders'),
                  icon: <PauseCircle size={14} />,
                  count: parkedOrders.length,
                },
                {
                  value: 'receipt_settings',
                  label: t('shop_receipt_printed'),
                  icon: <Settings2 size={14} />,
                },
              ]}
              aria-label="POS Register Mode Tabs"
            />
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? t('shop_sound_enabled_tip') : t('shop_sound_muted_tip')}
              data-sq="ctl"
              data-sq-border="solid"
              className={`h-10 w-10 flex items-center justify-center cursor-pointer transition-colors ${
                soundEnabled
                  ? '[--sq-stroke:#6EE7B7] text-emerald-600 dark:[--sq-stroke:#065F46] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'text-black/55 dark:text-white/55 bg-white dark:bg-[#22201E]'
              }`}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        }
        primaryAction={{
          label: t('shop_custom_item_btn'),
          icon: <Tag size={15} />,
          onClick: () => setIsCustomItemModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'جلسة البيع ومؤشرات الصندوق' : isEn ? 'Register Session & Live Sales' : 'Session de Caisse & Indicateurs Directs'}
        language={language}
        primaryCard={{
          label: isAr ? 'حجم مبيعات اليوم' : isEn ? 'Today Register Turnover' : 'Volume Ventes Caisse',
          badgeText: `${sessionMetrics.todaySalesCount} tickets clôturés`,
          count: sessionMetrics.turnover,
          formatValue: (n) => formatMoney(n),
          tone: 'emerald',
          isActive: activeTab === 'register',
          onToggle: () => setActiveTab('register'),
        }}
        secondaryCard={{
          label: isAr ? 'تذاكر قيد الانتظار' : isEn ? 'Parked Carts Queue' : 'Paniers Suspendus',
          badgeText: 'tickets en attente',
          count: sessionMetrics.parkedCount,
          tone: 'terracotta',
          isActive: activeTab === 'parked',
          onToggle: () => setActiveTab((p) => (p === 'parked' ? 'register' : 'parked')),
        }}
        darkCard={{
          label: isAr ? 'سيولة الدرج النقدية' : isEn ? 'Drawer Cash Turnover' : 'Liquidités Tiroir-Caisse',
          badgePrefix: '',
          badgeCount: sessionMetrics.todaySalesCount,
          badgeSuffix: isAr ? 'عملية' : 'tickets',
          valuePrefix: '',
          valueCount: sessionMetrics.totalCash,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Caisse'} · Espèces en tiroir`,
        }}
      />

      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <ScreenPod>
              <form
                onSubmit={handleBarcodeSubmit}
                data-sq="card"
                data-sq-border="solid"
                className="p-2 bg-white dark:bg-[#22201E] sq-elev-card flex items-center gap-2"
              >
                <div className="flex-1">
                  <LabelInput
                    field="Barcode"
                    label={t('shop_barcode_label')}
                    value={barcodeQuery}
                    onChange={setBarcodeQuery}
                    width="100%"
                    height={40}
                    corner={14}
                    prefix={<Barcode size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
                  />
                </div>
                <button
                  type="submit"
                  data-sq="ctl"
                  data-sq-border="none"
                  className="px-4 py-2 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold hover:opacity-90 cursor-pointer transition-opacity shrink-0 mx-1"
                >
                  {t('shop_scan_btn')}
                </button>
              </form>

              <ScreenCollectionToolbar
                title={isAr ? 'كتالوج البيع السريع' : isEn ? 'Quick Sale Catalog' : 'Catalogue Caisse'}
                liveRegionText={`${sortedInventory.length} articles`}
                language={language}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t('shop_search_catalog')}
                statusOptions={statusOptions}
                statusValue={stockStatusFilter}
                onStatusChange={(val) => setStockStatusFilter(val as 'all' | 'low' | 'out')}
                hasActiveAdvancedFilters={hasActiveAdvancedFilters}
                activeFiltersCount={activeFiltersCount}
                isFilterModalOpen={isFilterModalOpen}
                filterButtonRef={filterButtonRef}
                onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
                viewMode={viewMode}
                onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
                onExport={handleExportInventoryCSV}
                activeChips={activeChips}
                onResetAllFilters={handleResetFilters}
              />

              {products.length === 0 ? (
                <KineticEmptyStateMotion motionKey="pos-reg-inv-empty">
                  <EmptyState
                    variant="island"
                    icon={<Package />}
                    title={t('shop_empty_inventory_title', { branch: currentBranch.name })}
                    description={t('shop_empty_inventory_desc')}
                    width={500}
                  />
                </KineticEmptyStateMotion>
              ) : (
                <UniversalDataCollection<Product>
                  items={sortedInventory}
                  keyExtractor={(p) => p.id}
                  defaultViewMode="grid"
                  viewMode={viewMode === 'grid' ? 'grid' : 'list'}
                  hideToolbar
                  openItemId={inspectingProduct?.id ?? null}
                  columns={registerProductColumns}
                  sortBy={invSortBy}
                  sortDirection={invSortDir}
                  onSortChange={(col, dir) => {
                    setInvSortBy(col);
                    setInvSortDir(dir);
                  }}
                  onItemClick={(product) => {
                    if (product.stockQuantity > 0) addToCart(product);
                  }}
                  onViewDetails={(product, opener) => {
                    setDrawerOpenerEl(opener || null);
                    setInspectorTab('overview');
                    setInspectingProduct(product);
                  }}
                  getRowMeta={(product): Partial<KineticRowData> => {
                    const isOut = product.stockQuantity <= 0;
                    const isLow = !isOut && product.stockQuantity <= (product.reorderLevel || 5);
                    const inCartItem = cart.find((c) => c.product.id === product.id);
                    const bInfo = resolveRecordBranch(product, branchesById, currentBranch, language);
                    return {
                      title: product.name,
                      subline: `${product.sku}${product.barcode ? ` · ${product.barcode}` : ''}`,
                      avatarText: (product.name || 'PR').slice(0, 2).toUpperCase(),
                      avatarColor: '#d4522f',
                      categoryLabel: product.category,
                      branchName: bInfo.name,
                      branchCode: bInfo.code,
                      statusLabel: inCartItem
                        ? t('shop_in_cart_badge', { count: inCartItem.quantity })
                        : isOut
                        ? t('shop_sold_out_badge')
                        : `${product.stockQuantity} ${product.unit || t('shop_unit_pcs')}`,
                      statusVariant: isOut ? 'expired' : isLow ? 'warning' : inCartItem ? 'info' : 'active',
                      metricPrimary: formatMoney(product.price.amount),
                      metricSecondary: `${product.stockQuantity} ${product.unit || t('shop_unit_pcs')}`,
                      detailCol1: { heading: 'SKU', primaryText: product.sku },
                      detailCol2: {
                        heading: t('shop_col_category'),
                        primaryText: product.category,
                      },
                      detailCol3: {
                        heading: t('shop_col_stock'),
                        primaryText: `${product.stockQuantity} ${product.unit || t('shop_unit_pcs')}`,
                      },
                    };
                  }}
                  getFanActions={(product): KineticRowFanAction[] => [
                    {
                      id: 'add-cart',
                      label: t('shop_add_btn'),
                      icon: <Plus size={14} />,
                      onClick: (e) => {
                        e.stopPropagation();
                        addToCart(product);
                      },
                    },
                    {
                      id: 'inspect',
                      label: isAr ? 'معاينة' : isEn ? 'Inspect' : 'Détails',
                      icon: <Eye size={14} />,
                      onClick: (e) => {
                        e.stopPropagation();
                        setDrawerOpenerEl(e.currentTarget);
                        setInspectorTab('overview');
                        setInspectingProduct(product);
                      },
                    },
                  ]}
                  getDetailActions={(product): KineticDetailAction[] => [
                    {
                      id: 'add-cart',
                      label: t('shop_add_btn'),
                      icon: <Plus size={14} />,
                      onClick: () => addToCart(product),
                    },
                    {
                      id: 'inspect',
                      label: isAr ? 'التفاصيل' : isEn ? 'Details' : 'Fiche article',
                      icon: <Eye size={14} />,
                      onClick: () => {
                        setInspectorTab('overview');
                        setInspectingProduct(product);
                      },
                    },
                  ]}
                />
              )}
            </ScreenPod>
          </div>

          {/* Sticky Checkout Cart Dock */}
          <div className="lg:col-span-5 xl:col-span-4 sq-elev-card sticky top-4">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#22201E] p-4.5 space-y-4"
            >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white flex items-center gap-2">
                  <Receipt size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <span>{t('pos_current_order_title')}</span>
                </h2>
                <div className="t-cap text-black/55 dark:text-white/55">
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
                    data-sq="ctl-sm"
                    data-sq-border="none"
                    className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                  >
                    <PauseCircle size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    title={t('shop_clear_cart_tooltip')}
                    data-sq="ctl-sm"
                    data-sq-border="none"
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <LabelSelect
              field="Customer"
              label={t('pos_customer_attribution')}
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              options={[
                { value: '', label: t('pos_guest_walkin') },
                ...members.map((m) => ({ value: m.id, label: `${m.fullName} (${m.phoneNumber})` })),
              ]}
              height={40}
              corner={12}
            />

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--atr-divider)]">
              {cart.length === 0 ? (
                <KineticEmptyStateMotion motionKey="pos-reg-cart-empty">
                  <EmptyState
                    variant="compact"
                    icon={<ShoppingBag />}
                    title={t('shop_cart_empty_title')}
                    description={t('shop_cart_empty_desc')}
                  />
                </KineticEmptyStateMotion>
              ) : (
                cart.map((item) => {
                  const lineTotal = item.product.price.amount * item.quantity - item.discount;
                  return (
                    <div key={item.product.id} className="pt-2 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="t-small font-semibold text-black dark:text-white truncate">{item.product.name}</div>
                          <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                            {formatMoney(item.product.price.amount)} {t('shop_per_unit')}
                          </div>
                        </div>
                        <div className="shrink-0 text-end">
                          <div className="t-small font-semibold tabular-nums text-black dark:text-white">
                            {formatMoney(lineTotal)}
                          </div>
                          {item.discount > 0 && (
                            <div className="t-small text-emerald-600 font-semibold">
                              {t('shop_discount_badge', { amount: formatMoney(item.discount) })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div
                          data-sq="ctl-sm"
                          data-sq-border="none"
                          className="flex items-center gap-1 bg-[#EFE9E2] dark:bg-[#191716] p-1"
                        >
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-6 h-6 rounded-[calc(var(--r-ctl-sm,10px)-2px)] flex items-center justify-center text-black/70 dark:text-white/75 hover:bg-white dark:hover:bg-[#2B2825] cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-7 text-center t-small font-semibold tabular-nums text-black dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-6 h-6 rounded-[calc(var(--r-ctl-sm,10px)-2px)] flex items-center justify-center text-black/70 dark:text-white/75 hover:bg-white dark:hover:bg-[#2B2825] cursor-pointer"
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
                            className={`w-20 h-6 px-2 t-cap rounded-[var(--r-check,6px)] border-0 bg-[#F5F1EC] dark:bg-[#2B2825] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]/30 tabular-nums ${
                              isRtl ? 'text-left' : 'text-right'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-black/55 dark:text-white/55 hover:text-red-500 cursor-pointer p-1"
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

            {cart.length > 0 && (
              <div className="pt-2 border-t border-[var(--atr-divider)] space-y-1">
                <div className="flex items-center justify-between t-small font-semibold text-black/55 dark:text-white/55">
                  <span>{t('pos_cart_discount_label')}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('fixed')}
                      data-sq="check"
                      data-sq-border="none"
                      className={`px-2 py-1 t-small font-semibold cursor-pointer ${
                        orderDiscountType === 'fixed' ? 'bg-[var(--brand-fill,#C9461F)] text-white' : 'text-black/55 dark:text-white/55'
                      }`}
                    >
                      {isAr ? 'د.ج' : 'DA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('percent')}
                      data-sq="check"
                      data-sq-border="none"
                      className={`px-2 py-1 t-small font-semibold cursor-pointer ${
                        orderDiscountType === 'percent' ? 'bg-[var(--brand-fill,#C9461F)] text-white' : 'text-black/55 dark:text-white/55'
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
                  className="w-full h-8 px-2.5 t-cap rounded-[var(--r-ctl,12px)] border-0 bg-[#F5F1EC] dark:bg-[#2B2825] tabular-nums text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]/30"
                />
              </div>
            )}

            <div className="pt-2 border-t border-[var(--atr-divider)] space-y-2 t-cap">
              <div className="flex justify-between text-black/55 dark:text-white/55">
                <span>{t('pos_subtotal_label')}</span>
                <span className="tabular-nums font-semibold">{formatMoney(cartSubtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>{t('pos_total_discount_label')}</span>
                  <span className="tabular-nums">-{formatMoney(discountAmount)}</span>
                </div>
              )}
              {receiptConfig.showTaxBreakdown && taxAmount > 0 && (
                <div className="flex justify-between text-black/55 dark:text-white/55">
                  <span>{t('shop_vat_line')}</span>
                  <span className="tabular-nums">{formatMoney(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-[var(--atr-divider)] text-black dark:text-white font-semibold">
                <span className="t-body">{t('pos_total_due_label')}</span>
                <span className="t-dialog tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(cartTotal)}</span>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="t-small font-semibold text-black/55 dark:text-white/55">
                  {t('pos_quick_cash_title')}
                </div>
                <div className="grid grid-cols-4 gap-2">
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
                        data-sq="ctl"
                        data-sq-border="solid"
                        className={`p-2 t-small font-semibold tabular-nums text-center cursor-pointer transition-colors ${
                          isExact
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-black [--sq-stroke:transparent]'
                            : 'bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B] text-black/70 dark:text-white/75'
                        }`}
                      >
                        {isExact ? t('shop_quick_cash_exact') : `${amt.toLocaleString()} ${isAr ? 'د.ج' : 'DA'}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={cart.length > 0 ? 'sq-elev-card' : ''}>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                data-sq="card"
                data-sq-border="none"
                className={`w-full h-12 t-small font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  cart.length === 0
                    ? 'bg-[#EFE9E2] dark:bg-[#2B2825] text-black/55 dark:text-white/55 cursor-not-allowed'
                    : 'bg-[var(--brand-fill,#C9461F)] text-white hover:opacity-90 active:scale-98'
                }`}
              >
                <Coins size={16} />
                <span>{t('shop_charge_button', { amount: formatMoney(cartTotal) })}</span>
                <ArrowRight size={15} className={isRtl ? 'rotate-180' : ''} />
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'parked' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={t('shop_held_orders_title', { count: parkedOrders.length })}
            liveRegionText={`${parkedOrders.length} tickets en attente`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Rechercher ticket en pause..."
            viewMode={viewMode}
            onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          />

          <UniversalDataCollection<ParkedOrder>
            items={parkedOrders}
            keyExtractor={(po) => po.id}
            defaultViewMode="list"
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            hideToolbar
            openItemId={inspectingParked?.id ?? null}
            columns={parkedOrderColumns}
            onItemClick={(po, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectorTab('overview');
              setInspectingParked(po);
            }}
            onViewDetails={(po, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectorTab('overview');
              setInspectingParked(po);
            }}
            getRowMeta={(po): Partial<KineticRowData> => {
              const bInfo = resolveRecordBranch(po, branchesById, currentBranch, language);
              return {
                title: po.referenceName,
                subline: `${po.items.length} ${isAr ? 'أصناف' : isEn ? 'items' : 'articles'} · ${new Date(po.createdAt).toLocaleTimeString()}`,
                avatarText: (po.referenceName || 'PK').slice(0, 2).toUpperCase(),
                avatarColor: '#d4522f',
                categoryLabel: po.customerName || t('shop_receipt_walkin'),
                branchName: bInfo.name,
                branchCode: bInfo.code,
                statusLabel: isAr ? 'معلق' : isEn ? 'Parked' : 'En pause',
                statusVariant: 'warning',
                metricPrimary: formatMoney(po.totalAmount),
                metricSecondary: `${po.items.length} art.`,
                detailCol1: { heading: isAr ? 'العميل' : isEn ? 'Customer' : 'Client', primaryText: po.customerName || t('shop_receipt_walkin') },
                detailCol2: { heading: isAr ? 'الأصناف' : isEn ? 'Items' : 'Articles', primaryText: String(po.items.length) },
                detailCol3: { heading: isAr ? 'الوقت' : isEn ? 'Time' : 'Heure', primaryText: new Date(po.createdAt).toLocaleTimeString() },
              };
            }}
            getFanActions={(po): KineticRowFanAction[] => [
              {
                id: 'resume',
                label: t('shop_resume_in_register'),
                icon: <PlayCircle size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  handleResumeOrder(po);
                },
              },
              {
                id: 'delete',
                label: t('shop_discard_order'),
                icon: <Trash2 size={14} />,
                isDanger: true,
                onClick: (e) => {
                  e.stopPropagation();
                  deleteParkedOrder(po.id);
                },
              },
            ]}
            getDetailActions={(po): KineticDetailAction[] => [
              {
                id: 'resume',
                label: t('shop_resume_in_register'),
                icon: <PlayCircle size={14} />,
                onClick: () => handleResumeOrder(po),
              },
              {
                id: 'inspect',
                label: isAr ? 'التفاصيل' : isEn ? 'Inspect' : 'Détails',
                icon: <Eye size={14} />,
                onClick: () => {
                  setInspectorTab('overview');
                  setInspectingParked(po);
                },
              },
            ]}
            emptyTitle={t('shop_no_held_title')}
            emptyDescription={t('shop_no_held_desc')}
          />
        </ScreenPod>
      )}

      {activeTab === 'inventory' && (
        <ScreenPod>
          <ScreenCollectionToolbar
            title={isAr ? 'المخزون السريع' : 'Inventaire Rapide'}
            liveRegionText={`${sortedInventory.length} produits`}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusOptions={statusOptions}
            statusValue={stockStatusFilter}
            onStatusChange={(val) => setStockStatusFilter(val as 'all' | 'low' | 'out')}
            hasActiveAdvancedFilters={hasActiveAdvancedFilters}
            activeFiltersCount={activeFiltersCount}
            isFilterModalOpen={isFilterModalOpen}
            filterButtonRef={filterButtonRef}
            onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
            viewMode={viewMode}
            onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
            onExport={handleExportInventoryCSV}
            extraTrailingControls={
              <AtriumButton variant="primary" size="sm" onClick={handleOpenAddProduct} icon={<Plus size={14} />}>
                {t('shop_add_product')}
              </AtriumButton>
            }
            activeChips={activeChips}
            onResetAllFilters={handleResetFilters}
          />
          <UniversalDataCollection<Product>
            items={sortedInventory}
            keyExtractor={(p) => p.id}
            defaultViewMode="list"
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            hideToolbar
            columns={productColumns}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            sortBy={invSortBy}
            sortDirection={invSortDir}
            onSortChange={(col, dir) => {
              setInvSortBy(col);
              setInvSortDir(dir);
            }}
            onItemClick={(p) => handleOpenEditProduct(p)}
            onViewDetails={(p, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectorTab('overview');
              setInspectingProduct(p);
            }}
            onEdit={(p) => handleOpenEditProduct(p)}
            pinnedIds={pinnedProductIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              setPinnedProductIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onDelete={(p) => deleteProduct(p.id)}
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            getRowMeta={(p): Partial<KineticRowData> => {
              const isOut = p.stockQuantity <= 0;
              const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
              const bInfo = resolveRecordBranch(p, branchesById, currentBranch, language);
              return {
                title: p.name,
                subline: `${p.sku}${p.barcode ? ` · ${p.barcode}` : ''}`,
                avatarText: (p.name || 'PR').slice(0, 2).toUpperCase(),
                avatarColor: '#d4522f',
                categoryLabel: p.category,
                branchName: bInfo.name,
                branchCode: bInfo.code,
                statusLabel: isOut
                  ? isAr ? 'نفذ' : isEn ? 'Out' : 'Rupture'
                  : isLow
                  ? isAr ? 'منخفض' : isEn ? 'Low' : 'Bas'
                  : isAr ? 'متوفر' : isEn ? 'In Stock' : 'En stock',
                statusVariant: isOut ? 'expired' : isLow ? 'warning' : 'active',
                metricPrimary: formatMoney(p.price.amount),
                metricSecondary: `${p.stockQuantity} ${p.unit || t('shop_unit_pcs')}`,
                detailCol1: { heading: 'SKU', primaryText: p.sku },
                detailCol2: { heading: t('shop_col_stock'), primaryText: `${p.stockQuantity} ${p.unit || t('shop_unit_pcs')}` },
                detailCol3: { heading: t('shop_col_retail'), primaryText: formatMoney(p.price.amount) },
              };
            }}
            getFanActions={(p): KineticRowFanAction[] => [
              {
                id: 'adjust',
                label: isAr ? 'تعديل المخزون' : isEn ? 'Adjust Stock' : 'Ajuster',
                icon: <ArrowDownUp size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedProductForAdjust(p);
                  setIsAdjustStockModalOpen(true);
                },
              },
              {
                id: 'edit',
                label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                icon: <Settings2 size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  handleOpenEditProduct(p);
                },
              },
            ]}
            getDetailActions={(p): KineticDetailAction[] => [
              {
                id: 'adjust',
                label: isAr ? 'ضبط الكمية' : isEn ? 'Adjust' : 'Ajuster stock',
                icon: <ArrowDownUp size={14} />,
                onClick: () => {
                  setSelectedProductForAdjust(p);
                  setIsAdjustStockModalOpen(true);
                },
              },
              {
                id: 'edit',
                label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                icon: <Settings2 size={14} />,
                onClick: () => handleOpenEditProduct(p),
              },
            ]}
            emptyTitle={t('shop_table_empty')}
            emptyDescription={t('shop_empty_cat_sub')}
            primaryActionLabel={t('shop_add_product')}
            onAddFirstItem={handleOpenAddProduct}
          />
          {stockMovements.length > 0 && (
            <div
              data-sq="card"
              data-sq-border="solid"
              className="bg-white dark:bg-[#22201E] sq-elev-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="t-small font-semibold text-black/55 dark:text-white/55">
                  {t('shop_movements_title')}
                </h3>
                <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                  {t('shop_movements_count', { count: stockMovements.length })}
                </span>
              </div>
              <div className="divide-y divide-[var(--atr-divider)] t-cap">
                {stockMovements.slice(0, 6).map((sm) => (
                  <div key={sm.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-black dark:text-white truncate">{sm.productName}</div>
                      <div className="t-cap text-black/55 dark:text-white/55">
                        {t('shop_movement_by', {
                          reason: sm.reason || sm.type,
                          user: sm.createdBy || 'Staff',
                          date: new Date(sm.createdAt).toLocaleString(),
                        })}
                      </div>
                    </div>
                    <div className={`shrink-0 ${isRtl ? 'text-left' : 'text-right'}`}>
                      <span className={`tabular-nums font-semibold t-small ${sm.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {sm.quantity > 0 ? `+${sm.quantity}` : sm.quantity}
                      </span>
                      <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                        {sm.previousStock} → {sm.newStock}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScreenPod>
      )}

      {activeTab === 'receipt_settings' && (
        <ScreenPod>
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="t-pod text-[var(--text-1)] dark:text-white">
              {t('shop_receipt_branding_title')}
            </h2>
            <ListAdvancedMenuButton language={language} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-5 bg-white dark:bg-[#22201E] sq-elev-card space-y-4"
            >
              <h2 className="t-card font-semibold text-black dark:text-white">
                {t('shop_receipt_branding_title')}
              </h2>
              <div className="space-y-3 t-cap">
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
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)]" data-sq="ctl-sm" data-sq-border="none">
                    <span className="t-cap font-semibold text-black/75 dark:text-white/80">{t('shop_toggle_tax')}</span>
                    <LiveSwitch
                      checked={receiptConfig.showTaxBreakdown}
                      onCheckedChange={(checked) => updateReceiptConfig({ showTaxBreakdown: checked })}
                      aria-label={t('shop_toggle_tax')}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)]" data-sq="ctl-sm" data-sq-border="none">
                    <span className="t-cap font-semibold text-black/75 dark:text-white/80">{t('shop_toggle_cashier')}</span>
                    <LiveSwitch
                      checked={receiptConfig.showCashier}
                      onCheckedChange={(checked) => updateReceiptConfig({ showCashier: checked })}
                      aria-label={t('shop_toggle_cashier')}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[var(--lbi-bg,#F5F1EC)] dark:bg-[var(--lbi-bg,#292624)]" data-sq="ctl-sm" data-sq-border="none">
                    <span className="t-cap font-semibold text-black/75 dark:text-white/80">{t('shop_toggle_barcode')}</span>
                    <LiveSwitch
                      checked={receiptConfig.showBarcode}
                      onCheckedChange={(checked) => updateReceiptConfig({ showBarcode: checked })}
                      aria-label={t('shop_toggle_barcode')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-5 bg-white dark:bg-[#22201E] sq-elev-card flex flex-col items-center"
            >
              <div className="t-small font-semibold text-black/55 dark:text-white/55 mb-3">
                {t('shop_preview_title')}
              </div>
              <div className="w-[300px] bg-white text-black p-5 shadow-xl tabular-nums t-cap leading-relaxed border-t-4 border-[#d4522f]">
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-black/[0.22]">
                  <div className="t-card font-semibold">{receiptConfig.headerTitle}</div>
                  {receiptConfig.subHeader && <div className="t-cap text-black/75">{receiptConfig.subHeader}</div>}
                  {receiptConfig.address && <div className="t-cap text-black/55">{receiptConfig.address}</div>}
                  {receiptConfig.phone && <div className="t-cap text-black/55">Tel: {receiptConfig.phone}</div>}
                  {receiptConfig.taxId && <div className="t-small font-semibold text-black/75 pt-0.5">{receiptConfig.taxId}</div>}
                </div>
                <div className="py-2 t-cap border-b border-dashed border-black/[0.22] space-y-0.5">
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
                <div className="py-2 space-y-2 border-b border-dashed border-black/[0.22]">
                  <div className="flex justify-between font-semibold t-small">
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
                <div className="py-2 space-y-1 border-b border-dashed border-black/[0.22]">
                  <div className="flex justify-between">
                    <span>{t('shop_receipt_subtotal_header')}</span>
                    <span>4,160 DA</span>
                  </div>
                  {receiptConfig.showTaxBreakdown && (
                    <div className="flex justify-between t-cap text-black/75">
                      <span>{t('shop_receipt_vat_header')}</span>
                      <span>374 DA</span>
                    </div>
                  )}
                  <div className="flex justify-between t-label font-semibold pt-1">
                    <span>{t('shop_receipt_total_due_header')}</span>
                    <span>4,160 DA</span>
                  </div>
                </div>
                <div className="pt-3 text-center space-y-2">
                  {receiptConfig.showBarcode && (
                    <div className="w-40 h-8 mx-auto bg-neutral-900 text-white t-cap flex items-center justify-center tabular-nums">
                      ||||| | |||| || ||| ||||
                    </div>
                  )}
                  <div className="t-small font-semibold text-black">
                    {receiptConfig.footerMessage || t('shop_receipt_default_footer')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScreenPod>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedInventory.length}
        entityPluralLabel={isAr ? 'منتجات' : 'articles'}
        hasActiveFilters={hasActiveAdvancedFilters || stockStatusFilter !== 'all'}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Product>
        isOpen={inspectingProduct !== null}
        item={inspectingProduct}
        allItems={sortedInventory}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingProduct?.name || ''}
        subtitle={inspectingProduct ? `${inspectingProduct.sku} · ${inspectingProduct.category}` : undefined}
        avatarText={(inspectingProduct?.name || 'PR').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={inspectingProduct ? resolveRecordBranch(inspectingProduct, branchesById, currentBranch, language).name : undefined}
        statusLabel={
          inspectingProduct
            ? inspectingProduct.stockQuantity <= 0
              ? isAr ? 'نفذ' : isEn ? 'Out of stock' : 'Rupture'
              : inspectingProduct.stockQuantity <= (inspectingProduct.reorderLevel || 5)
              ? isAr ? 'مخزون منخفض' : isEn ? 'Low stock' : 'Stock bas'
              : isAr ? 'متوفر' : isEn ? 'In stock' : 'En stock'
            : undefined
        }
        statusClassName={
          inspectingProduct && inspectingProduct.stockQuantity <= 0
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
            : inspectingProduct && inspectingProduct.stockQuantity <= (inspectingProduct.reorderLevel || 5)
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'المنتج' : isEn ? 'Product' : 'Article' },
          { id: 'stock', label: isAr ? 'المخزون' : isEn ? 'Stock & Margin' : 'Stock & Marge' },
          { id: 'actions', label: isAr ? 'الإجراءات' : isEn ? 'Actions' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingProduct(null)}
        onSelectItem={(p) => {
          setInspectorTab('overview');
          setInspectingProduct(p);
        }}
        renderBody={(prod, tab, epoch) => {
          const cost = prod.costPrice || prod.cost?.amount || Math.round(prod.price.amount * 0.6);
          const margin = prod.price.amount - cost;
          const reorder = prod.reorderLevel || 5;
          const stockPct = Math.min(100, Math.round((prod.stockQuantity / Math.max(reorder * 4, 20)) * 100));
          const stockTone = prod.stockQuantity <= 0 ? 'danger' : prod.stockQuantity <= reorder ? 'warn' : 'ok';

          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'add',
                      label: t('shop_add_btn'),
                      icon: <Plus size={16} />,
                      primary: true,
                      disabled: prod.stockQuantity <= 0,
                      onClick: () => {
                        addToCart(prod);
                        setInspectingProduct(null);
                      },
                    },
                    {
                      id: 'adjust',
                      label: isAr ? 'تعديل المخزون' : isEn ? 'Adjust' : 'Ajuster',
                      icon: <ArrowDownUp size={16} />,
                      onClick: () => {
                        setSelectedProductForAdjust(prod);
                        setIsAdjustStockModalOpen(true);
                      },
                    },
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                      icon: <Settings2 size={16} />,
                      onClick: () => handleOpenEditProduct(prod),
                    },
                  ]}
                />
              </InspectorSection>

              {tab === 'overview' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'سعر البيع بالتجزئة' : isEn ? 'Retail Price' : 'Tarif Vente TTC'}>
                    <InspectorBigStat
                      value={formatMoney(prod.price.amount)}
                      tone="accent"
                      caption={`${prod.category} · ${prod.stockQuantity} ${prod.unit || t('shop_unit_pcs')}`}
                    />
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'معلومات الصنف' : isEn ? 'Catalog Details' : 'Identification'}>
                    <InspectorCard>
                      <InspectorKeyValue label="SKU" value={prod.sku} copyText={prod.sku} />
                      {prod.barcode && <InspectorKeyValue label={isAr ? 'الباركود' : 'Barcode'} value={prod.barcode} copyText={prod.barcode} />}
                      <InspectorKeyValue label={t('shop_col_category')} value={prod.category} mono={false} />
                      <InspectorKeyValue
                        label={isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}
                        value={resolveRecordBranch(prod, branchesById, currentBranch, language).name}
                        mono={false}
                        isLast
                      />
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'stock' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'مستوى المخزون' : isEn ? 'Stock Level' : 'Niveau de Stock'}>
                    <InspectorCard>
                      <InspectorKeyValue
                        label={t('shop_col_stock')}
                        value={`${prod.stockQuantity} ${prod.unit || t('shop_unit_pcs')}`}
                        tone={stockTone}
                      />
                      <InspectorKeyValue label={isAr ? 'حد التنبيه' : isEn ? 'Reorder Level' : 'Seuil alerte'} value={`${reorder} ${prod.unit || 'pcs'}`} isLast />
                      <InspectorProgressBar percent={stockPct} tone={stockTone} animateKey={epoch} />
                    </InspectorCard>
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'الهوامش والتكلفة' : isEn ? 'Cost & Valuation' : 'Coûts & Valorisation'}>
                    <InspectorCard>
                      <InspectorKeyValue label={isAr ? 'سعر التكلفة' : isEn ? 'Cost Price' : 'Prix achat'} value={formatMoney(cost)} />
                      <InspectorKeyValue label={isAr ? 'الهامش الوحدوي' : isEn ? 'Unit Margin' : 'Marge unitaire'} value={formatMoney(margin)} tone="ok" />
                      <InspectorKeyValue
                        label={isAr ? 'قيمة المخزون' : isEn ? 'Stock Value' : 'Valeur stock'}
                        value={formatMoney(prod.price.amount * prod.stockQuantity)}
                        tone="accent"
                        isLast
                      />
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'actions' && (
                <InspectorSection index={1} title={isAr ? 'إجراءات الصندوق' : isEn ? 'Register Actions' : 'Opérations Caisse'}>
                  <div className="space-y-2">
                    <InspectorWideButton
                      label={t('shop_add_btn')}
                      icon={<Plus size={15} />}
                      tone="accent"
                      disabled={prod.stockQuantity <= 0}
                      onClick={() => {
                        addToCart(prod);
                        setInspectingProduct(null);
                      }}
                    />
                    <InspectorWideButton
                      label={isAr ? 'ضبط المخزون' : isEn ? 'Adjust Stock' : 'Ajuster le stock'}
                      icon={<ArrowDownUp size={15} />}
                      tone="dark"
                      onClick={() => {
                        setSelectedProductForAdjust(prod);
                        setIsAdjustStockModalOpen(true);
                      }}
                    />
                    <InspectorWideButton
                      label={isAr ? 'تعديل البطاقة' : isEn ? 'Edit Product' : 'Modifier la fiche'}
                      icon={<Settings2 size={15} />}
                      tone="neutral"
                      onClick={() => handleOpenEditProduct(prod)}
                    />
                  </div>
                </InspectorSection>
              )}
            </div>
          );
        }}
      />

      <KineticSlideOverInspector<ParkedOrder>
        isOpen={inspectingParked !== null}
        item={inspectingParked}
        allItems={parkedOrders}
        keyExtractor={(po) => po.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingParked?.referenceName || ''}
        subtitle={inspectingParked ? new Date(inspectingParked.createdAt).toLocaleString() : undefined}
        avatarText={(inspectingParked?.referenceName || 'PK').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={inspectingParked ? resolveRecordBranch(inspectingParked, branchesById, currentBranch, language).name : undefined}
        statusLabel={isAr ? 'معلق' : isEn ? 'Parked' : 'En pause'}
        statusClassName="bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]"
        tabs={[
          { id: 'overview', label: isAr ? 'التذكرة' : isEn ? 'Ticket' : 'Ticket' },
          { id: 'items', label: isAr ? 'الأصناف' : isEn ? 'Items' : 'Articles' },
          { id: 'actions', label: isAr ? 'استئناف' : isEn ? 'Resume' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingParked(null)}
        onSelectItem={(po) => {
          setInspectorTab('overview');
          setInspectingParked(po);
        }}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(po) => {
          deleteParkedOrder(po.id);
          setInspectingParked(null);
        }}
        renderBody={(po, tab) => (
          <div className="space-y-4">
            <InspectorSection index={0}>
              <InspectorQuickActions
                actions={[
                  {
                    id: 'resume',
                    label: t('shop_resume_in_register'),
                    icon: <PlayCircle size={16} />,
                    primary: true,
                    onClick: () => {
                      handleResumeOrder(po);
                      setInspectingParked(null);
                    },
                  },
                  {
                    id: 'discard',
                    label: t('shop_discard_order'),
                    icon: <Trash2 size={16} />,
                    onClick: () => {
                      deleteParkedOrder(po.id);
                      setInspectingParked(null);
                    },
                  },
                ]}
              />
            </InspectorSection>

            {tab === 'overview' && (
              <>
                <InspectorSection index={1} title={isAr ? 'إجمالي التذكرة' : isEn ? 'Ticket Total' : 'Montant Total'}>
                  <InspectorBigStat
                    value={formatMoney(po.totalAmount)}
                    tone="accent"
                    caption={`${po.items.length} ${isAr ? 'أصناف' : isEn ? 'items' : 'articles'} · ${po.customerName || t('shop_receipt_walkin')}`}
                  />
                </InspectorSection>
                <InspectorSection index={2} title={isAr ? 'تفاصيل التذكرة' : isEn ? 'Ticket Metadata' : 'Informations'}>
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'المرجع' : isEn ? 'Reference' : 'Référence'} value={po.referenceName} copyText={po.referenceName} />
                    <InspectorKeyValue label={isAr ? 'العميل' : isEn ? 'Customer' : 'Client'} value={po.customerName || t('shop_receipt_walkin')} mono={false} />
                    <InspectorKeyValue label={isAr ? 'المجموع الفرعي' : isEn ? 'Subtotal' : 'Sous-total'} value={formatMoney(po.subtotal)} />
                    <InspectorKeyValue label={isAr ? 'الخصم' : isEn ? 'Discount' : 'Remise'} value={formatMoney(po.discount || 0)} isLast={!po.notes} />
                    {po.notes && <InspectorKeyValue label={isAr ? 'ملاحظات' : isEn ? 'Notes' : 'Notes'} value={po.notes} mono={false} isLast />}
                  </InspectorCard>
                </InspectorSection>
              </>
            )}

            {tab === 'items' && (
              <InspectorSection index={1} title={isAr ? 'قائمة الأصناف' : isEn ? 'Line Items' : 'Articles du panier'}>
                <InspectorCard>
                  {po.items.map((it, idx) => (
                    <InspectorListItem
                      key={idx}
                      title={it.productName}
                      subtitle={`${it.quantity} × ${formatMoney(it.unitPrice)}`}
                      metaRight={formatMoney(it.totalPrice)}
                      isLast={idx === po.items.length - 1}
                    />
                  ))}
                </InspectorCard>
              </InspectorSection>
            )}

            {tab === 'actions' && (
              <InspectorSection index={1} title={isAr ? 'استئناف الطلب' : isEn ? 'Order Actions' : 'Traitement Caisse'}>
                <InspectorWideButton
                  label={t('shop_resume_in_register')}
                  icon={<PlayCircle size={15} />}
                  tone="accent"
                  onClick={() => {
                    handleResumeOrder(po);
                    setInspectingParked(null);
                  }}
                />
              </InspectorSection>
            )}
          </div>
        )}
      />

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title={t('shop_modal_checkout_title')}
      >
        <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LiveSegmentedControl
            value={checkoutMode}
            onChange={(v) => setCheckoutMode(v as 'single' | 'split')}
            options={[
              { value: 'single', label: t('shop_mode_single'), icon: <Banknote size={14} /> },
              { value: 'split', label: t('shop_mode_split'), icon: <Split size={14} /> },
            ]}
            fullWidth
          />

          {checkoutMode === 'single' && (
            <div className="space-y-3">
              <div className="t-small font-semibold text-black/70 dark:text-white/75">{t('shop_tender_method_label')}</div>
              <LiveSegmentedControl
                value={singlePaymentMethod}
                onChange={setSinglePaymentMethod}
                options={[
                  { value: 'Cash', label: t('pos_tender_cash'), icon: <Banknote size={14} /> },
                  { value: 'Card', label: t('pos_tender_card'), icon: <CreditCard size={14} /> },
                  { value: 'MemberBalance', label: t('shop_tender_member_bal'), icon: <User size={14} /> },
                ]}
                fullWidth
              />
              {singlePaymentMethod === 'Cash' && (
                <div
                  data-sq="card"
                  data-sq-border="none"
                  className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="t-small font-semibold text-black/55 dark:text-white/55">
                      {t('shop_cash_settlement')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountTenderedInput(cartTotal.toString())}
                      className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline cursor-pointer"
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
                    height={40}
                    corner={12}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="t-small font-semibold text-black/55 dark:text-white/55">
                      {t('pos_change_due_label')} :
                    </span>
                    <span className="t-pod font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoney(changeDue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {checkoutMode === 'split' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between t-small font-semibold">
                <span className="text-black/55 dark:text-white/55">
                  {t('shop_split_total_order', { amount: formatMoney(cartTotal) })}
                </span>
                <span className={splitRemaining === 0 ? 'text-emerald-600 tabular-nums' : 'text-red-500 tabular-nums'}>
                  {splitRemaining === 0
                    ? t('shop_split_balanced')
                    : t('shop_split_remaining', { amount: formatMoney(splitRemaining) })}
                </span>
              </div>
              <div className="space-y-2">
                {splitPayments.map((sp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-36">
                      <LabelSelect
                        field={`Method-${idx}`}
                        label={t('shop_split_col_method')}
                        value={sp.method}
                        onChange={(v) => {
                          const newArr = [...splitPayments];
                          newArr[idx].method = v;
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
                        field={`Amount-${idx}`}
                        label={t('shop_split_col_amount')}
                        type="number"
                        value={sp.amount || ''}
                        onChange={(val) => {
                          const newArr = [...splitPayments];
                          newArr[idx].amount = parseFloat(val) || 0;
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
                        className="text-black/55 dark:text-white/55 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setSplitPayments([...splitPayments, { method: 'Cash', amount: Math.max(0, splitRemaining) }])
                  }
                  className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus size={13} />
                  <span>{t('shop_add_split_line')}</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--atr-divider)]">
            <LabelSelect
              field="Cashier"
              label={t('shop_field_cashier')}
              value={selectedCashierName}
              onChange={setSelectedCashierName}
              options={staff.map((s) => ({ value: s.fullName, label: `${s.fullName} (${s.role})` }))}
              height={40}
              corner={12}
            />
            <LabelInput
              field="CustPhone"
              label={t('shop_field_phone_optional')}
              type="tel"
              value={checkoutCustomerPhone}
              onChange={setCheckoutCustomerPhone}
              placeholder="+213 550..."
              width="100%"
              height={40}
              corner={12}
            />
          </div>
          <LabelInput
            field="TransNotes"
            label={t('shop_field_notes_optional')}
            value={checkoutNotes}
            onChange={setCheckoutNotes}
            placeholder="e.g. Counter #1 - BaridiMob Ref #9812"
            width="100%"
            height={40}
            corner={12}
          />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={() => setIsCheckoutModalOpen(false)}>
              {t('action_cancel')}
            </Button>
            <Button
              type="button"
              tone="accent"
              size={40}
              leading={<CheckCircle2 size={15} />}
              onClick={handleConfirmCheckout}
            >
              {t('shop_btn_complete_sale')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        title={t('shop_sale_success_title')}
      >
        {retainedCompletedSale && (
          <div className="space-y-4" dir="ltr">
            <div className="sq-elev-card mx-auto max-w-[340px]">
              <div
                id="pos-thermal-receipt-container"
                data-sq="card"
                data-sq-border="solid"
                className="bg-white text-black p-4 [--sq-stroke:rgba(23,19,15,0.12)] tabular-nums t-cap leading-relaxed"
              >
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black/[0.22]">
                <div className="t-label font-semibold">{receiptConfig.headerTitle}</div>
                {receiptConfig.subHeader && <div className="t-cap text-black/75">{receiptConfig.subHeader}</div>}
                {receiptConfig.address && <div className="t-cap text-black/55">{receiptConfig.address}</div>}
                {receiptConfig.phone && <div className="t-cap text-black/55">Tel: {receiptConfig.phone}</div>}
                {receiptConfig.taxId && <div className="t-small font-semibold text-black/75">{receiptConfig.taxId}</div>}
              </div>
              <div className="py-2 t-cap border-b border-dashed border-black/[0.22] space-y-0.5">
                <div className="flex justify-between">
                  <span>RECEIPT: #{retainedCompletedSale.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(retainedCompletedSale.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER: {retainedCompletedSale.cashierName || 'Cashier'}</span>
                  <span>{new Date(retainedCompletedSale.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="py-2 space-y-1 border-b border-dashed border-black/[0.22] t-cap">
                {retainedCompletedSale.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.productName}
                    </span>
                    <span className="font-semibold">{formatMoney(it.totalPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="py-2 space-y-1 border-b border-dashed border-black/[0.22]">
                <div className="flex justify-between t-label font-semibold pt-1">
                  <span>TOTAL PAYÉ</span>
                  <span>{formatMoney(retainedCompletedSale.totalAmount)}</span>
                </div>
              </div>
              <div className="pt-2 text-center space-y-2">
                {receiptConfig.showBarcode && (
                  <div className="w-36 h-6 mx-auto bg-neutral-900 text-white t-cap flex items-center justify-center">
                    |||| || ||||| || |||
                  </div>
                )}
                <div className="t-small font-semibold">{receiptConfig.footerMessage || t('shop_receipt_default_footer')}</div>
              </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button
                type="button"
                tone="soft"
                size={40}
                leading={<Printer size={14} />}
                onClick={() => window.print()}
              >
                {t('shop_btn_print')}
              </Button>
              <Button
                type="button"
                tone="accent"
                size={40}
                onClick={() => setCompletedSale(null)}
              >
                {t('shop_btn_new_order')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        title={t('shop_custom_modal_title')}
      >
        <form onSubmit={handleAddCustomItem} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="CustomItemName"
            label={t('shop_custom_name')}
            required
            value={customItemName}
            onChange={setCustomItemName}
            placeholder="e.g. Special Fresh Order"
            width="100%"
            height={40}
            corner={12}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="CustomPrice"
              label={t('shop_custom_price')}
              type="number"
              required
              value={customItemPrice ? String(customItemPrice) : ''}
              onChange={(v) => setCustomItemPrice(parseFloat(v) || 0)}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="CustomCategory"
              label={t('shop_custom_category')}
              value={customItemCategory}
              onChange={setCustomItemCategory}
              placeholder="General"
              width="100%"
              height={40}
              corner={12}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={() => setIsCustomItemModalOpen(false)}>
              {t('action_cancel')}
            </Button>
            <Button type="submit" tone="accent" size={40}>
              {t('shop_custom_btn_add')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isHoldOrderModalOpen}
        onClose={() => setIsHoldOrderModalOpen(false)}
        title={t('shop_hold_modal_title')}
      >
        <form onSubmit={handleHoldOrder} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="HoldRef"
            label={t('shop_hold_ref')}
            value={holdOrderRefName}
            onChange={setHoldOrderRefName}
            placeholder={t('shop_hold_ref_ph')}
            width="100%"
            height={40}
            corner={12}
          />
          <LabelInput
            field="HoldNotes"
            label={t('shop_hold_notes')}
            value={holdOrderNotes}
            onChange={setHoldOrderNotes}
            placeholder={t('shop_hold_notes_ph')}
            width="100%"
            height={40}
            corner={12}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={() => setIsHoldOrderModalOpen(false)}>
              {t('action_cancel')}
            </Button>
            <Button type="submit" tone="accent" size={40} leading={<PauseCircle size={14} />}>
              {t('shop_hold_confirm_btn')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAdjustStockModalOpen && Boolean(selectedProductForAdjust)}
        onClose={() => {
          setIsAdjustStockModalOpen(false);
          setSelectedProductForAdjust(null);
        }}
        title={t('shop_adjust_modal_title')}
      >
          <form onSubmit={handleConfirmStockAdjust} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            {retainedProductForAdjust && (
              <div className="t-small text-black/65 dark:text-white/65">
                {retainedProductForAdjust.name}
              </div>
            )}
            <LiveSegmentedControl
              value={adjustMode}
              onChange={(v) => setAdjustMode(v as 'add' | 'remove' | 'set')}
              options={[
                { value: 'add', label: t('shop_adjust_restock') },
                { value: 'remove', label: t('shop_adjust_damage') },
                { value: 'set', label: t('shop_adjust_audit') },
              ]}
              fullWidth
            />
            <LabelInput
              field="AdjustQuantity"
              label={adjustMode === 'set' ? t('shop_adjust_new_count') : t('shop_adjust_quantity')}
              type="number"
              min="0"
              required
              value={adjustQuantity}
              onChange={(val) => setAdjustQuantity(Number(val || 0))}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="AdjustReason"
              label={t('shop_adjust_reason')}
              value={adjustReason}
              onChange={setAdjustReason}
              placeholder={t('shop_adjust_reason_ph')}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsAdjustStockModalOpen(false)}>
                {t('action_cancel')}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {t('shop_adjust_apply_btn')}
              </Button>
            </div>
          </form>
      </Modal>

      <Modal
        isOpen={isProductFormModalOpen}
        onClose={() => {
          setIsProductFormModalOpen(false);
          setEditingProductId(null);
        }}
        title={editingProductId ? t('shop_product_modal_edit') : t('shop_product_modal_add')}
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
            height={40}
            corner={12}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="Price"
              label={t('shop_prod_price')}
              type="number"
              required
              value={formPrice ? String(formPrice) : ''}
              onChange={(v) => setFormPrice(parseFloat(v) || 0)}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="Stock"
              label={t('shop_prod_stock')}
              type="number"
              required
              value={formStock !== undefined ? String(formStock) : ''}
              onChange={(v) => setFormStock(parseInt(v) || 0)}
              width="100%"
              height={40}
              corner={12}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={() => setIsProductFormModalOpen(false)}>
              {t('action_cancel')}
            </Button>
            <Button type="submit" tone="accent" size={40}>
              {editingProductId ? t('shop_prod_update') : t('shop_prod_save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ShopScreen = PosRegisterView;
