import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  X,
  Check,
  AlertTriangle,
  Sparkles,
  Barcode,
  Printer,
  Laptop,
  PauseCircle,
  PlayCircle,
  ArrowRight,
  ArrowDownUp,
  Tag,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  RefreshCw,
  Coins,
  Split,
  Edit2,
  Settings2,
  FileText,
  Phone,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { Product, PaymentDetail, ParkedOrder, StockMovement, ReceiptConfig } from '../../types/index';
import { formatMoney } from '../../utils/rules';
import { Modal } from '../ui/Modal';
import { Seek } from '../ui/Seek';

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
    refundSale,
    adjustStock,
    addProduct,
    updateProduct,
    deleteProduct,
    parkedOrders,
    parkOrder,
    resumeParkedOrder,
    deleteParkedOrder,
    stockMovements,
    receiptConfig,
    updateReceiptConfig,
    seedDemoInventory,
    openDesktopUpgradeModal,
  } = useAtriumStore();

  // Active top-level subtab
  const [activeTab, setActiveTab] = useState<'register' | 'parked' | 'inventory' | 'receipt_settings'>('register');

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

  // Completed sale receipt preview
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Stock management state
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('Supplier Delivery Restock');

  // Add / Edit Product modal
  const [isProductFormModalOpen, setIsProductFormModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Beverage');
  const [formSku, setFormSku] = useState('SKU-');
  const [formBarcode, setFormBarcode] = useState('');
  const [formPrice, setFormPrice] = useState(1200);
  const [formCost, setFormCost] = useState(800);
  const [formStock, setFormStock] = useState(30);
  const [formReorder, setFormReorder] = useState(10);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formTaxRate, setFormTaxRate] = useState(19);

  // Hold order modal
  const [isHoldOrderModalOpen, setIsHoldOrderModalOpen] = useState(false);
  const [holdOrderRefName, setHoldOrderRefName] = useState('');
  const [holdOrderNotes, setHoldOrderNotes] = useState('');

  // Scanner input ref
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Dynamic categories
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    // Add default fallbacks if none exist
    ['Beverage', 'Grocery', 'Bakery', 'General'].forEach((c) => set.add(c));
    return Array.from(set);
  }, [products]);

  // Filtered products for register
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesSku && !matchesBarcode) return false;
      }
      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (stockStatusFilter === 'low' && p.stockQuantity > (p.reorderLevel || 5)) return false;
      if (stockStatusFilter === 'out' && p.stockQuantity > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesSku && !matchesBarcode) return false;
      }
      return true;
    });
  }, [products, categoryFilter, stockStatusFilter, searchQuery]);

  // Inventory valuation KPIs
  const inventoryStats = useMemo(() => {
    const totalSKUs = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.stockQuantity, 0);
    const retailValuation = products.reduce((acc, p) => acc + p.price.amount * p.stockQuantity, 0);
    const costValuation = products.reduce((acc, p) => acc + (p.costPrice || p.cost?.amount || 0) * p.stockQuantity, 0);
    const lowStockItems = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= (p.reorderLevel || 5)).length;
    const outOfStockItems = products.filter((p) => p.stockQuantity <= 0).length;
    return {
      totalSKUs,
      totalUnits,
      retailValuation,
      costValuation,
      potentialProfit: retailValuation - costValuation,
      lowStockItems,
      outOfStockItems,
    };
  }, [products]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const lineTotal = item.product.price.amount * item.quantity;
      return sum + Math.max(0, lineTotal - item.discount);
    }, 0);
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
        title: 'Product Not Found',
        message: `No item found matching Barcode or SKU "${barcodeQuery}".`,
      });
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      showToast({
        type: 'warning',
        title: 'Out of Stock',
        message: `"${product.name}" is currently sold out and unavailable.`,
      });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          showToast({
            type: 'warning',
            title: 'Max Stock Reached',
            message: `Cannot exceed available inventory limit (${product.stockQuantity} units).`,
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
                title: 'Inventory Cap',
                message: `Maximum in-stock count for this item is ${item.product.stockQuantity} units.`,
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
        item.product.id === productId ? { ...item, discount: Math.max(0, discount) } : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Quick custom item addition
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
        title: 'Payment Mismatch',
        message: `Split payments total must equal the cart total exactly. Remaining balance: ${splitRemaining} DA`,
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
        customerName: customer?.fullName || 'Walk-in Customer',
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
      title: 'Payment Settled',
      message: `Receipt #${sale.id.slice(-6).toUpperCase()} processed (${sale.totalAmount.toLocaleString()} DZD).`,
      category: 'pos_inventory',
      action: {
        label: 'Receipt',
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
      (customer ? `${customer.fullName} (#${cart.length} items)` : `Held Order #${Date.now().toString().slice(-4)}`);

    parkOrder({
      referenceName: ref,
      customerId: selectedCustomerId || undefined,
      customerName: customer?.fullName || 'Walk-in Customer',
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
      title: 'Order Parked',
      message: 'Order held successfully. You can resume it anytime from the Held Orders tab.',
    });
  };

  // Resume parked order
  const handleResumeOrder = (parked: ParkedOrder) => {
    if (cart.length > 0) {
      const confirmReplace = window.confirm(
        'The register currently has active items. Replace active cart with held order?'
      );
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
    <div className="space-y-5 pb-16">
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
              <span>Universal POS & Inventory Hub</span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Production Ready
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Universal counter checkout, barcode scanner, multi-tender split pay, and real-time inventory management for any retail business.
          </p>
        </div>

        {/* Branch / Store selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:border-[#C4785A] transition-colors cursor-pointer"
          >
            <Building2 size={15} className="text-[#C4785A]" />
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-neutral-400 leading-none">Active Store</div>
              <div className="text-xs font-bold leading-tight truncate max-w-[150px]">
                {currentBranch?.name || 'Main Branch'}
              </div>
            </div>
            <ChevronDown size={14} className="text-neutral-400 ml-1" />
          </button>

          {isFacilityDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-40">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Select Store Location
              </div>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    switchBranch(b.id);
                    setIsFacilityDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer ${
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
      </div>

      {/* Top POS Hub Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'register'
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Coins size={15} />
            <span>POS Register</span>
            {cart.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white text-[#C4785A] text-[10px] font-black">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parked')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'parked'
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <PauseCircle size={15} />
            <span>Held Orders</span>
            {parkedOrders.length > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'parked' ? 'bg-white text-[#C4785A]' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {parkedOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'inventory'
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Package size={15} />
            <span>Inventory & Stock</span>
            {inventoryStats.lowStockItems > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-black">
                {inventoryStats.lowStockItems} low
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receipt_settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'receipt_settings'
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Settings2 size={15} />
            <span>Receipt & Register Setup</span>
          </button>
        </div>

        {/* Global Sound & Hardware indicators */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Beep sound enabled' : 'Muted'}
            className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
              soundEnabled
                ? 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-neutral-200 text-neutral-400 dark:border-neutral-800'
            }`}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

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
              className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-center gap-2"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#C4785A] flex items-center justify-center shrink-0">
                <Barcode size={18} />
              </div>
              <input
                ref={scannerInputRef}
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                placeholder="Scan or type Barcode / SKU and hit Enter..."
                className="flex-1 bg-transparent border-0 text-sm font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-[#C4785A] text-white text-xs font-bold hover:opacity-90 cursor-pointer transition-opacity"
              >
                Scan Add
              </button>
            </form>

            {/* Filter Bar & Quick Custom Item */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                {/* Seek Kinetic Search Box */}
                <Seek
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search catalog by name or code..."
                  shutSize={36}
                  openWidth={260}
                />

                <button
                  type="button"
                  onClick={() => setIsCustomItemModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer border border-neutral-200 dark:border-neutral-700"
                  title="Add custom unlisted article on the fly"
                >
                  <Tag size={13} className="text-[#C4785A]" />
                  <span>+ Custom Item</span>
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
                  {cat}
                </button>
              ))}
            </div>

            {/* Empty Branch notice with 1-click Demo Seed */}
            {products.length === 0 && (
              <div className="p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-3">
                <Package size={36} className="text-[#C4785A] mx-auto opacity-70" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  No Inventory Items in {currentBranch.name}
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Seed sample retail & POS merchandise with barcodes, prices, and stock units to start ringing up sales right away.
                </p>
                <button
                  type="button"
                  onClick={() => seedDemoInventory(currentBranch.id)}
                  className="px-5 py-2.5 rounded-full bg-[#C4785A] text-white text-xs font-bold hover:opacity-90 cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  <span>Seed Retail Demo Catalog</span>
                </button>
              </div>
            )}

            {/* Product Display: Grid or List */}
            {products.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock = !isOutOfStock && product.stockQuantity <= (product.reorderLevel || 5);
                  const inCartItem = cart.find((c) => c.product.id === product.id);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product)}
                      className={`relative p-3.5 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between min-h-[140px] group ${
                        isOutOfStock
                          ? 'bg-neutral-100 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-orange-50/70 dark:bg-orange-950/20 border-[#C4785A] shadow-xs'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-[#C4785A] hover:shadow-xs'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate max-w-[90px]">
                          {product.category}
                        </span>
                        {inCartItem && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#C4785A] text-white text-[10px] font-black">
                            {inCartItem.quantity} in cart
                          </span>
                        )}
                        {!inCartItem && isLowStock && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                            {product.stockQuantity} left
                          </span>
                        )}
                        {!inCartItem && isOutOfStock && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[10px] font-bold">
                            Sold Out
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

                      {/* Price & Stock */}
                      <div className="flex items-baseline justify-between w-full pt-1 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="text-sm font-black text-neutral-900 dark:text-white font-mono">
                          {formatMoney(product.price.amount)}
                        </div>
                        <div className="text-[10px] font-bold text-neutral-400">
                          {product.stockQuantity} {product.unit || 'pcs'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {products.length > 0 && viewMode === 'list' && (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  const inCartItem = cart.find((c) => c.product.id === product.id);

                  return (
                    <div
                      key={product.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-500 font-bold text-xs">
                          {product.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {product.name}
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-2 font-mono">
                            <span>{product.sku}</span>
                            {product.barcode && <span>· {product.barcode}</span>}
                            <span>· {product.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-black font-mono text-neutral-900 dark:text-white">
                            {formatMoney(product.price.amount)}
                          </div>
                          <div className={`text-[10px] font-bold ${
                            isOutOfStock
                              ? 'text-red-600'
                              : product.stockQuantity <= 5
                              ? 'text-amber-600'
                              : 'text-neutral-400'
                          }`}>
                            {product.stockQuantity} in stock
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => addToCart(product)}
                          className={`h-8 px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                              : inCartItem
                              ? 'bg-[#C4785A] text-white shadow-2xs'
                              : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C4785A] hover:text-white text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          <Plus size={13} />
                          <span>{inCartItem ? `(${inCartItem.quantity})` : 'Add'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 4-5 COLS: Checkout Register Cart Panel */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-4 sticky top-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h2 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Receipt size={18} className="text-[#C4785A]" />
                  <span>Current Register Order</span>
                </h2>
                <div className="text-[11px] text-neutral-400">
                  {cart.length} unique {cart.length === 1 ? 'item' : 'items'} · {cart.reduce((a, b) => a + b.quantity, 0)} units
                </div>
              </div>

              {cart.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsHoldOrderModalOpen(true)}
                    title="Hold / Park this order to serve another customer"
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                  >
                    <PauseCircle size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    title="Clear current cart"
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Customer selector (Walk-in vs Account) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Customer Account / Attribution
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-[#C4785A]"
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
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <ShoppingBag size={32} className="mx-auto opacity-40" />
                  <p className="text-xs font-semibold">Register cart is empty</p>
                  <p className="text-[11px] text-neutral-400 max-w-[200px] mx-auto">
                    Click any product or scan a barcode to begin ringing up sales.
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
                            {formatMoney(item.product.price.amount)} each
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black font-mono text-neutral-900 dark:text-white">
                            {formatMoney(lineTotal)}
                          </div>
                          {item.discount > 0 && (
                            <div className="text-[10px] text-emerald-600 font-bold">
                              -{formatMoney(item.discount)} disc
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
                            placeholder="Discount (DA)"
                            value={item.discount || ''}
                            onChange={(e) => updateLineDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                            className="w-20 h-6 px-1.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-700 bg-transparent text-right font-mono"
                            title="Line item discount in DA"
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
                  <span>Cart Order Discount</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOrderDiscountType('fixed')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        orderDiscountType === 'fixed' ? 'bg-[#C4785A] text-white' : 'text-neutral-400'
                      }`}
                    >
                      DA
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
                  placeholder={orderDiscountType === 'percent' ? 'Discount % (e.g. 10)' : 'Discount amount DA'}
                  className="w-full h-8 px-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 font-mono text-neutral-900 dark:text-white"
                />
              </div>
            )}

            {/* Price Breakdown */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span className="font-mono font-semibold">{formatMoney(cartSubtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Total Discount</span>
                  <span className="font-mono">-{formatMoney(discountAmount)}</span>
                </div>
              )}

              {receiptConfig.showTaxBreakdown && taxAmount > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>VAT / Tax (9%)</span>
                  <span className="font-mono">{formatMoney(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-black">
                <span className="text-sm">Total Due</span>
                <span className="text-2xl font-mono text-[#C4785A]">{formatMoney(cartTotal)}</span>
              </div>
            </div>

            {/* Quick Cash Buttons */}
            {cart.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Quick Cash Settlement
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
                        {isExact ? 'Exact' : `${amt} DA`}
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
              <span>Charge {formatMoney(cartTotal)}</span>
              <ArrowRight size={15} />
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
                Held Orders ({parkedOrders.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Customers stepping away or pending split payment. Resume any order to ring up in the register.
              </p>
            </div>
          </div>

          {parkedOrders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <PauseCircle size={36} className="text-neutral-400 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">No held orders</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                While ringing up sales in the POS Register, click the pause icon to hold an order and free the till for the next customer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {parkedOrders.map((po) => (
                <div
                  key={po.id}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-2xs hover:border-[#C4785A] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-black text-neutral-900 dark:text-white">
                        {po.referenceName}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        Held {new Date(po.createdAt).toLocaleTimeString()} · {po.items.length} items
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
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                      Note: {po.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => handleResumeOrder(po)}
                      className="flex-1 h-9 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 cursor-pointer"
                    >
                      <PlayCircle size={14} />
                      <span>Resume in Register</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteParkedOrder(po.id)}
                      className="h-9 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 cursor-pointer"
                      title="Discard order"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                Total Catalog SKUs
              </div>
              <div className="text-xl font-black text-neutral-900 dark:text-white">
                {inventoryStats.totalSKUs}
              </div>
              <div className="text-[10px] text-neutral-400">
                {inventoryStats.totalUnits} physical units in store
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Retail Stock Valuation
              </div>
              <div className="text-xl font-black font-mono text-[#C4785A]">
                {formatMoney(inventoryStats.retailValuation)}
              </div>
              <div className="text-[10px] text-neutral-400">
                Cost base: {formatMoney(inventoryStats.costValuation)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Potential Gross Margin
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(inventoryStats.potentialProfit)}
              </div>
              <div className="text-[10px] text-neutral-400">
                Projected full catalog margin
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Low Stock Alerts
              </div>
              <div className="text-xl font-black text-red-600 dark:text-red-400 flex items-center gap-2">
                <span>{inventoryStats.lowStockItems} items</span>
                {inventoryStats.outOfStockItems > 0 && (
                  <span className="text-xs font-bold text-red-400">({inventoryStats.outOfStockItems} sold out)</span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400">
                Requires supplier reorder
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
                  All Items ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('low')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    stockStatusFilter === 'low' ? 'bg-amber-600 text-white' : 'text-neutral-500'
                  }`}
                >
                  Low Stock ({inventoryStats.lowStockItems})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('out')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    stockStatusFilter === 'out' ? 'bg-red-600 text-white' : 'text-neutral-500'
                  }`}
                >
                  Out of Stock ({inventoryStats.outOfStockItems})
                </button>
              </div>

              {/* Category selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportInventoryCSV}
                className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddProduct}
                className="h-9 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Add Product</span>
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">SKU / Barcode</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Retail Price</th>
                    <th className="py-3 px-4 text-center">In Stock</th>
                    <th className="py-3 px-4 text-right">Valuation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-400">
                        No products match current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((p) => {
                      const isOut = p.stockQuantity <= 0;
                      const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
                      const costAmt = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);

                      return (
                        <tr key={p.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white">
                            <div className="truncate max-w-[220px]">{p.name}</div>
                            <div className="text-[10px] font-normal text-neutral-400 truncate max-w-[220px]">
                              {p.description || 'Standard store article'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                            <div>{p.sku}</div>
                            {p.barcode && <div className="text-[10px] text-neutral-400">{p.barcode}</div>}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-neutral-500">
                            {formatMoney(costAmt)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">
                            {formatMoney(p.price.amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                              isOut
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : isLow
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {p.stockQuantity} {p.unit || 'pcs'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#C4785A]">
                            {formatMoney(p.price.amount * p.stockQuantity)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductForAdjust(p);
                                  setAdjustQuantity(10);
                                  setAdjustMode('add');
                                  setIsAdjustStockModalOpen(true);
                                }}
                                title="Adjust Stock / Restock"
                                className="p-1.5 rounded-lg text-[#C4785A] hover:bg-orange-50 dark:hover:bg-orange-950/40 cursor-pointer"
                              >
                                <ArrowDownUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                title="Edit Product details"
                                className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete product "${p.name}"?`)) {
                                    deleteProduct(p.id);
                                  }
                                }}
                                title="Delete Product"
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Stock Movements Log */}
          {stockMovements.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Recent Stock Audits & Adjustments
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {stockMovements.length} log events
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
                        {sm.reason || sm.type} · by {sm.createdBy || 'Staff'} at {new Date(sm.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
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
                Thermal Receipt & Register Branding
              </h2>
              <p className="text-xs text-neutral-500">
                Configure your store name, tax registration numbers, address, and personalized customer footer message.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">
                  Store / Header Title
                </label>
                <input
                  type="text"
                  value={receiptConfig.headerTitle}
                  onChange={(e) => updateReceiptConfig({ headerTitle: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">
                  Tagline / Subheader
                </label>
                <input
                  type="text"
                  value={receiptConfig.subHeader || ''}
                  onChange={(e) => updateReceiptConfig({ subHeader: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">
                    Store Phone
                  </label>
                  <input
                    type="text"
                    value={receiptConfig.phone || ''}
                    onChange={(e) => updateReceiptConfig({ phone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700 dark:text-neutral-300">
                    Tax ID (NIF / RC)
                  </label>
                  <input
                    type="text"
                    value={receiptConfig.taxId || ''}
                    onChange={(e) => updateReceiptConfig({ taxId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">
                  Store Physical Address
                </label>
                <input
                  type="text"
                  value={receiptConfig.address || ''}
                  onChange={(e) => updateReceiptConfig({ address: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700 dark:text-neutral-300">
                  Receipt Footer Note
                </label>
                <input
                  type="text"
                  value={receiptConfig.footerMessage || ''}
                  onChange={(e) => updateReceiptConfig({ footerMessage: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={receiptConfig.showTaxBreakdown}
                    onChange={(e) => updateReceiptConfig({ showTaxBreakdown: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C4785A]"
                  />
                  <span>Show Tax / VAT Breakdown line on receipt</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={receiptConfig.showCashier}
                    onChange={(e) => updateReceiptConfig({ showCashier: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C4785A]"
                  />
                  <span>Print Cashier / Attendant Name</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={receiptConfig.showBarcode}
                    onChange={(e) => updateReceiptConfig({ showBarcode: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C4785A]"
                  />
                  <span>Print Barcode & Transaction QR</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Receipt Slip Preview */}
          <div className="p-5 rounded-3xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 flex flex-col items-center">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              Interactive 80mm ESC/POS Thermal Slip Preview
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
                  <span>RECEIPT: #SAMPLE-0042</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                {receiptConfig.showCashier && (
                  <div className="flex justify-between">
                    <span>CASHIER: Amine B.</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>CLIENT: Walk-in Customer</span>
                  <span>POS-TERMINAL 01</span>
                </div>
              </div>

              {/* Items table */}
              <div className="py-2.5 space-y-1.5 border-b border-dashed border-neutral-400">
                <div className="flex justify-between font-bold text-[10px]">
                  <span>ITEM / QTY</span>
                  <span>TOTAL</span>
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
                  <span>SUBTOTAL</span>
                  <span>4,160 DA</span>
                </div>
                {receiptConfig.showTaxBreakdown && (
                  <div className="flex justify-between text-[10px] text-neutral-600">
                    <span>VAT (9%)</span>
                    <span>374 DA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>TOTAL DUE</span>
                  <span>4,160 DA</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600 pt-1">
                  <span>TENDER: CASH</span>
                  <span>PAID: 5,000 DA</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>CHANGE RETURNED</span>
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
                  {receiptConfig.footerMessage || 'Thank you for your visit!'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHECKOUT / ENCAISSEMENT                                           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Register Checkout & Settlement"
        subtitle={`Total to pay: ${formatMoney(cartTotal)}`}
      >
        <div className="space-y-4">
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
              <span>Single Tender</span>
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
              <span>Split Payment</span>
            </button>
          </div>

          {/* Single Tender Method Selection */}
          {checkoutMode === 'single' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Card', 'MemberBalance'] as const).map((method) => {
                  const isSelected = singlePaymentMethod === method;
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
                      <span>{method === 'MemberBalance' ? 'Store Credit' : method}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Change Calculator */}
              {singlePaymentMethod === 'Cash' && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Amount Tendered by Customer (DA)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmountTenderedInput(cartTotal.toString())}
                      className="text-[10px] font-bold text-[#C4785A] hover:underline"
                    >
                      Exact Cash
                    </button>
                  </div>
                  <input
                    type="number"
                    value={amountTenderedInput}
                    onChange={(e) => setAmountTenderedInput(e.target.value)}
                    className="w-full h-11 px-3 text-lg font-mono font-black rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />

                  {/* Change output */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-neutral-500">Change Due to Customer:</span>
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
                <span className="text-neutral-500">Total Order: {formatMoney(cartTotal)}</span>
                <span className={splitRemaining === 0 ? 'text-emerald-600 font-mono' : 'text-red-500 font-mono'}>
                  {splitRemaining === 0 ? '✓ Balanced' : `Remaining: ${formatMoney(splitRemaining)}`}
                </span>
              </div>

              <div className="space-y-2">
                {splitPayments.map((sp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={sp.method}
                      onChange={(e) => {
                        const newArr = [...splitPayments];
                        newArr[idx].method = e.target.value as any;
                        setSplitPayments(newArr);
                      }}
                      className="w-32 h-10 px-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="BankTransfer">Transfer</option>
                      <option value="Credit">Credit</option>
                    </select>

                    <input
                      type="number"
                      value={sp.amount || ''}
                      onChange={(e) => {
                        const newArr = [...splitPayments];
                        newArr[idx].amount = parseFloat(e.target.value) || 0;
                        setSplitPayments(newArr);
                      }}
                      placeholder="Amount (DA)"
                      className="flex-1 h-10 px-3 text-xs font-mono font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />

                    {splitPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                        className="text-neutral-400 hover:text-red-500 p-1"
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
                  <span>Add Split Tender Line</span>
                </button>
              </div>
            </div>
          )}

          {/* Cashier Attribution & Contact Phone */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500">Cashier Attribution</label>
              <select
                value={selectedCashierName}
                onChange={(e) => setSelectedCashierName(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.fullName}>{s.fullName} ({s.role})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500">Customer Phone (Optional)</label>
              <input
                type="text"
                value={checkoutCustomerPhone}
                onChange={(e) => setCheckoutCustomerPhone(e.target.value)}
                placeholder="+213 550..."
                className="w-full h-9 px-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-500">Transaction Notes (Optional)</label>
            <input
              type="text"
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="e.g. Counter #1 - SATIM Ref #9812"
              className="w-full h-9 px-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>

          {/* Action buttons */}
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
              onClick={handleConfirmCheckout}
              className="h-10 px-6 text-xs font-bold text-white bg-[#C4785A] rounded-full flex items-center gap-2 hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
            >
              <CheckCircle2 size={15} />
              <span>Complete Sale & Print Receipt</span>
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
          title="Payment Completed"
          subtitle={`Receipt #${completedSale.id.slice(-6).toUpperCase()}`}
        >
          <div className="space-y-4">
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
                  <span>RECEIPT: #{completedSale.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(completedSale.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER: {completedSale.cashierName || 'Cashier'}</span>
                  <span>{new Date(completedSale.createdAt).toLocaleTimeString()}</span>
                </div>
                {completedSale.memberName && (
                  <div className="flex justify-between font-bold">
                    <span>CUSTOMER:</span>
                    <span>{completedSale.memberName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400 text-[11px]">
                {completedSale.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">{formatMoney(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {/* Total & Tenders */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400">
                {completedSale.subtotal && completedSale.subtotal !== completedSale.totalAmount && (
                  <div className="flex justify-between text-neutral-600">
                    <span>SUBTOTAL</span>
                    <span>{formatMoney(completedSale.subtotal)}</span>
                  </div>
                )}
                {completedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>DISCOUNT</span>
                    <span>-{formatMoney(completedSale.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>TOTAL PAID</span>
                  <span>{formatMoney(completedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600 pt-1">
                  <span>METHOD:</span>
                  <span className="font-bold">{completedSale.paymentMethod}</span>
                </div>
                {completedSale.amountTendered !== undefined && completedSale.paymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span>TENDERED:</span>
                      <span>{formatMoney(completedSale.amountTendered)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>CHANGE DUE:</span>
                      <span>{formatMoney(completedSale.changeGiven || 0)}</span>
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
                  {receiptConfig.footerMessage || 'Thank you for your business!'}
                </div>
              </div>
            </div>

            {/* Desktop ESC/POS Notice */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-neutral-800 dark:text-neutral-200">
                <span className="flex items-center gap-1.5 text-[#C4785A]">
                  <Printer size={13} />
                  <span>Hardware Thermal POS</span>
                </span>
                <span className="text-[10px] bg-[#C4785A]/15 text-[#C4785A] px-2 py-0.5 rounded-full">
                  Atrium Desktop
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                To connect direct 80mm ESC/POS USB or network receipt printers and open the physical cash drawer automatically on payment, use Atrium Desktop.
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
                <span>Print Thermal Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 h-10 text-xs font-bold text-white bg-[#C4785A] rounded-full cursor-pointer hover:opacity-90 shadow-xs"
              >
                New Register Order
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
        title="Add Custom Item to Register"
        subtitle="Ring up an unlisted article or custom-priced service on the fly"
      >
        <form onSubmit={handleAddCustomItem} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Item Name / Description *
            </label>
            <input
              type="text"
              required
              value={customItemName}
              onChange={(e) => setCustomItemName(e.target.value)}
              placeholder="e.g. Special Fresh Order / Custom Repair"
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Price (DZD) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3 text-sm font-mono font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Category
              </label>
              <input
                type="text"
                value={customItemCategory}
                onChange={(e) => setCustomItemCategory(e.target.value)}
                placeholder="General"
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsCustomItemModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs"
            >
              Add to Register Cart
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
        title="Park Current Order"
        subtitle="Save this cart and free the register for waiting customers"
      >
        <form onSubmit={handleHoldOrder} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Reference / Customer Tag
            </label>
            <input
              type="text"
              value={holdOrderRefName}
              onChange={(e) => setHoldOrderRefName(e.target.value)}
              placeholder="e.g. Customer in Red Jacket / Table 4 / Phone order"
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Reason / Notes
            </label>
            <input
              type="text"
              value={holdOrderNotes}
              onChange={(e) => setHoldOrderNotes(e.target.value)}
              placeholder="e.g. Fetching wallet from car"
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsHoldOrderModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs flex items-center gap-1.5"
            >
              <PauseCircle size={14} />
              <span>Confirm & Park Order</span>
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
          title="Adjust Inventory Stock"
          subtitle={selectedProductForAdjust.name}
        >
          <form onSubmit={handleConfirmStockAdjust} className="space-y-4">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between text-xs font-bold">
              <span className="text-neutral-500">Current In Stock:</span>
              <span className="font-mono text-neutral-900 dark:text-white text-sm">
                {selectedProductForAdjust.stockQuantity} {selectedProductForAdjust.unit || 'pcs'}
              </span>
            </div>

            {/* Mode selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Adjustment Action
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode('add')}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    adjustMode === 'add' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  + Restock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('remove')}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    adjustMode === 'remove' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  - Damage/Loss
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode('set')}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    adjustMode === 'set' ? 'border-[#C4785A] bg-orange-50 text-[#C4785A] dark:bg-orange-950/40' : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  = Count Audit
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {adjustMode === 'set' ? 'New Total Physical Count' : 'Units to Adjust'}
              </label>
              <input
                type="number"
                required
                min="0"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                className="w-full h-11 px-3 text-sm font-mono font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Audit Reason / Supplier Note
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Batch delivery from local wholesaler"
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsAdjustStockModalOpen(false);
                  setSelectedProductForAdjust(null);
                }}
                className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs"
              >
                Apply Stock Adjustment
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
        title={editingProductId ? 'Edit Product Item' : 'Add New Inventory Product'}
        subtitle={`Registered in store: ${currentBranch.name}`}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Product Title / Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Artisanal Espresso Beans 1kg"
              className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              >
                <option value="Beverage">Beverage</option>
                <option value="Grocery">Grocery</option>
                <option value="Bakery">Bakery & Food</option>
                <option value="General">General Merchandise</option>
                <option value="Supplement">Supplements</option>
                <option value="Equipment">Equipment</option>
                <option value="Clothing">Clothing & Goods</option>
                <option value="Service">Service</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Unit of Sale
              </label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              >
                <option value="pcs">Pieces (pcs)</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="l">Liter (l)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                SKU Identifier
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="w-full h-11 px-3 text-sm font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Barcode / EAN-13
              </label>
              <input
                type="text"
                value={formBarcode}
                onChange={(e) => setFormBarcode(e.target.value)}
                placeholder="6131100..."
                className="w-full h-11 px-3 text-sm font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Retail Selling Price (DZD) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formPrice}
                onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3 text-sm font-mono font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Cost Price (DZD)
              </label>
              <input
                type="number"
                min="0"
                value={formCost}
                onChange={(e) => setFormCost(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-3 text-sm font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Initial Stock Units
              </label>
              <input
                type="number"
                required
                min="0"
                value={formStock}
                onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                className="w-full h-11 px-3 text-sm font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Low Stock Reorder Alert Level
              </label>
              <input
                type="number"
                min="1"
                value={formReorder}
                onChange={(e) => setFormReorder(parseInt(e.target.value) || 5)}
                className="w-full h-11 px-3 text-sm font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsProductFormModalOpen(false);
                setEditingProductId(null);
              }}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-6 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 shadow-xs"
            >
              {editingProductId ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
