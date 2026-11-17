import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownUp,
  Trash2,
  Edit2,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Truck,
  Clock,
  Printer,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Product, PurchaseDocument } from '../../../types/index';
import { formatMoney, localizeStatus } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { B2bEntityModal } from '../trading/B2bEntityModal';
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

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'PR').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
const MEMBER_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]';
const MEMBER_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]';
const MEMBER_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]';

export const PosInventoryView: React.FC<any> = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    products,
    currentBranch,
    branches,
    addProduct,
    updateProduct,
    deleteProduct,
    batchDeleteProducts,
    batchRestockProducts,
    adjustStock,
    purchaseDocs,
    b2bSuppliers,
    createPurchaseDoc,
    receivePurchaseDoc,
    currentBusiness,
    currentBranchId,
    activePosRole,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const isStaff = activePosRole === 'staff';
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'purchases'>('inventory');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [branchFilter, setBranchFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedProductIds, setPinnedProductIds] = useState<Set<string>>(() => new Set<string>());
  const [invSortBy, setInvSortBy] = useState('name');
  const [invSortDir, setInvSortDir] = useState<'asc' | 'desc'>('asc');

  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [inspectingPurchase, setInspectingPurchase] = useState<PurchaseDocument | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

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
  const [formTaxRate, setFormTaxRate] = useState(19);

  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState(10);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState('');

  const [isBatchRestockModalOpen, setIsBatchRestockModalOpen] = useState(false);
  const [batchRestockQty, setBatchRestockQty] = useState(10);

  const [isRetailPoModalOpen, setIsRetailPoModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(b2bSuppliers[0]?.id || '');
  const [poExpectedDate, setPoExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<any[]>([]);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const handleOpenNewRetailPo = () => {
    setPoSupplierId(b2bSuppliers[0]?.id || '');
    setPoExpectedDate(new Date(Date.now() + 6048e5).toISOString().split('T')[0]);
    setPoNotes('');
    setPoItems([
      {
        productId: products[0]?.id || '',
        description: products[0]?.name || '',
        orderedQty: 10,
        unitCostHt:
          products[0]?.costPrice ||
          products[0]?.cost?.amount ||
          Math.round((products[0]?.price.amount || 1000) * 0.6),
        unit: products[0]?.unit || 'pcs',
      },
    ]);
    setIsRetailPoModalOpen(true);
  };

  const handlePreFillLowStockPo = () => {
    const lowItems = products.filter((p) => p.stockQuantity <= (p.reorderLevel || 5));
    if (lowItems.length === 0) {
      showToast({
        type: 'info',
        title: isAr ? 'المخزون كافٍ' : 'Stock suffisant',
        message: isAr ? 'لا توجد منتجات منخفضة المخزون' : 'Aucun article sous le seuil d’alerte.',
      });
      return;
    }
    setPoSupplierId(b2bSuppliers[0]?.id || '');
    setPoExpectedDate(new Date(Date.now() + 432e6).toISOString().split('T')[0]);
    setPoNotes('Réapprovisionnement d’urgence pour articles en alerte de stock.');
    setPoItems(
      lowItems.map((p) => ({
        productId: p.id,
        description: p.name,
        orderedQty: Math.max(10, (p.reorderLevel || 5) * 2),
        unitCostHt: p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6),
        unit: p.unit || 'pcs',
      }))
    );
    setIsRetailPoModalOpen(true);
  };

  const handleCreateRetailPo = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0 || poItems.some((it) => it.orderedQty <= 0)) {
      showToast({
        type: 'error',
        title: isAr ? 'خطأ في الكميات' : 'Quantités invalides',
        message: isAr ? 'يرجى تحديد كميات صالحة' : 'Veuillez saisir des quantités supérieures à zéro.',
      });
      return;
    }
    const sup = b2bSuppliers.find((s) => s.id === poSupplierId) || b2bSuppliers[0];
    const supName = sup?.supplierName || 'Fournisseur Grossiste';
    const docNumber = `PO-${new Date().getFullYear()}-${(
      (purchaseDocs || []).filter((p) => p.type === 'po').length + 1
    )
      .toString()
      .padStart(4, '0')}`;
    const totalHt = poItems.reduce((sum, it) => sum + it.orderedQty * it.unitCostHt, 0);
    const totalTva = totalHt * 0.19;
    const totalTtc = totalHt + totalTva;
    createPurchaseDoc({
      tenantId: currentBusiness?.id || 'biz_pos',
      facilityId: currentBranchId || 'branch_main',
      docNumber,
      type: 'po',
      supplierId: sup?.id || 'sup_default',
      supplierName: supName,
      depotId: currentBranchId || 'branch_main',
      depotName: currentBranch?.name || 'Magasin de Vente',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryExpectedDate: poExpectedDate || new Date(Date.now() + 6048e5).toISOString().split('T')[0],
      currency: 'DZD',
      items: poItems.map((it, idx) => ({
        id: `poi_${idx}_${Date.now()}`,
        productId: it.productId,
        description: it.description,
        orderedQty: it.orderedQty,
        receivedQty: 0,
        unit: it.unit,
        unitCostHt: it.unitCostHt,
        tvaPercent: 19,
        totalHt: it.orderedQty * it.unitCostHt,
      })),
      totalHt,
      totalTva,
      totalTtc,
      status: 'Ordered',
      notes: poNotes,
    });
    showToast({
      type: 'success',
      title: isAr ? 'تم إنشاء الطلبية' : 'Commande Fournisseur Créée',
      message: isAr
        ? `تم تسجيل طلبية المورد ${docNumber}`
        : `Commande d’achat ${docNumber} enregistrée avec succès !`,
    });
    setIsRetailPoModalOpen(false);
  };

  const handleReceiveRetailPo = (poId: string) => {
    receivePurchaseDoc(poId);
    showToast({
      type: 'success',
      title: isAr ? 'تم استلام البضاعة' : 'Réception Validée',
      message: isAr
        ? 'تم استلام البضاعة وتحديث مخزون المحل آلياً !'
        : 'Réception confirmée ! Les stocks du magasin ont été augmentés.',
    });
  };

  const purchaseStats = useMemo(() => {
    const allPos = purchaseDocs || [];
    const pending = allPos.filter((p) => p.type === 'po' && p.status === 'Ordered');
    const received = allPos.filter((p) => p.type === 'br' || p.status === 'Received');
    const totalPurchasedValue = received.reduce((sum, p) => sum + (p.totalTtc || 0), 0);
    const lowStockCount = products.filter((p) => p.stockQuantity <= (p.reorderLevel || 5)).length;
    return {
      pendingCount: pending.length,
      receivedCount: received.length,
      totalPurchasedValue,
      lowStockCount,
      suppliersCount: b2bSuppliers.length,
    };
  }, [purchaseDocs, products, b2bSuppliers]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

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

  const filteredInventory = useMemo(() => {
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
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchesCat = (p.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesCat && !bName.includes(q)) return false;
      }
      return true;
    });
  }, [products, branchFilter, categoryFilter, stockStatusFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedInventory = useMemo(() => {
    const sign = invSortDir === 'asc' ? 1 : -1;
    return [...filteredInventory].sort((a, b) => {
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
      if (invSortBy === 'val') {
        return (a.price.amount * a.stockQuantity - b.price.amount * b.stockQuantity) * sign;
      }
      if (invSortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return a.name.localeCompare(b.name) * sign;
    });
  }, [filteredInventory, pinnedProductIds, invSortBy, invSortDir, branchesById, currentBranch, language]);

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (purchaseDocs || []).filter((doc) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(doc, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        return (
          doc.docNumber.toLowerCase().includes(q) ||
          doc.supplierName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [purchaseDocs, branchFilter, searchQuery, branchesById, currentBranch, language]);

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
      showToast({
        type: 'success',
        title: isAr ? 'تم تعديل المنتج' : 'Produit Mis à Jour',
        message: `${formName.trim()} (${formSku.trim()})`,
        category: 'pos_inventory',
      });
    } else {
      addProduct({
        name: formName.trim(),
        description: `${formCategory} article in ${currentBranch.name}`,
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
      showToast({
        type: 'success',
        title: isAr ? 'تمت إضافة الصنف' : 'Nouvel Article Ajouté',
        message: `${formName.trim()} (${formSku.trim()})`,
        category: 'pos_inventory',
      });
    }
    setIsProductFormModalOpen(false);
    setEditingProductId(null);
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
    const movementType =
      adjustMode === 'set' ? 'Adjustment' : adjustMode === 'add' ? 'Restock' : 'Damage';
    adjustStock(
      selectedProductForAdjust.id,
      deltaOrVal,
      adjustMode === 'set' ? 'set' : 'delta',
      adjustReason || (adjustMode === 'add' ? 'Réassort stock régulier' : 'Ajustement manuel inventaire'),
      movementType
    );
    setIsAdjustStockModalOpen(false);
    setSelectedProductForAdjust(null);
  };

  const handleConfirmBatchRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.size === 0) return;
    batchRestockProducts(Array.from(selectedProductIds), batchRestockQty);
    setSelectedProductIds(new Set<string>());
    setIsBatchRestockModalOpen(false);
  };

  const handleBatchDelete = () => {
    if (selectedProductIds.size === 0) return;
    batchDeleteProducts(Array.from(selectedProductIds));
    setSelectedProductIds(new Set<string>());
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
      ...(!isStaff ? ['Cost (DA)'] : []),
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
      ...(!isStaff ? [p.costPrice || p.cost?.amount || 0] : []),
      p.stockQuantity,
      p.reorderLevel || 0,
      p.price.amount * p.stockQuantity,
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(
      `atrium-pos-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  }, [sortedInventory, isStaff, isAr, isEn, branchesById, currentBranch, language]);

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

  const productColumns = useMemo<ColumnDefinition<Product>[]>(() => {
    const base: ColumnDefinition<Product>[] = [
      {
        key: 'name',
        header: isAr ? 'المنتج / الصنف' : t('shop_col_item'),
        width: '2.3*',
        minWidth: '200px',
        sortable: true,
        renderCell: (p) => (
          <div className="min-w-0">
            <div className="font-bold text-xs text-black dark:text-white truncate">{p.name}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 truncate">
              {p.description || t('shop_standard_article')}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: isAr ? 'التصنيف' : t('shop_col_category'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => (
          <span className="text-[10px] font-bold text-black/70 dark:text-white/75">{p.category}</span>
        ),
      },
      {
        key: 'sku',
        header: isAr ? 'الرمز والباركود' : t('shop_col_sku'),
        width: '1.3*',
        minWidth: '120px',
        sortable: true,
        renderCell: (p) => (
          <div className="font-mono text-[11px] text-black/55 dark:text-white/55">
            <div>{p.sku}</div>
            {p.barcode && <div className="text-[10px]">{p.barcode}</div>}
          </div>
        ),
      },
      {
        key: 'cost',
        header: isAr ? 'سعر التكلفة' : t('shop_col_cost'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => {
          const costAmt = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);
          return (
            <span className="font-mono text-black/55 dark:text-white/55 tabular-nums">
              {formatMoney(costAmt)}
            </span>
          );
        },
      },
      {
        key: 'retail',
        header: isAr ? 'سعر البيع' : t('shop_col_retail'),
        width: '1.1*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => (
          <span className="font-mono font-bold text-black dark:text-white tabular-nums">
            {formatMoney(p.price.amount)}
          </span>
        ),
      },
      {
        key: 'stock',
        header: isAr ? 'المتوفر' : t('shop_col_stock'),
        width: '1.2*',
        minWidth: '100px',
        sortable: true,
        renderCell: (p) => {
          const isOut = p.stockQuantity <= 0;
          const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
          return (
            <span
              className={`inline-flex items-center gap-1 font-bold text-[11px] tabular-nums ${
                isOut
                  ? 'text-red-600 dark:text-red-400 font-black'
                  : isLow
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-black dark:text-white'
              }`}
            >
              {p.stockQuantity} {p.unit || t('shop_unit_pcs')}
            </span>
          );
        },
      },
      {
        key: 'val',
        header: isAr ? 'القيمة' : t('shop_col_val'),
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (p) => (
          <span className="font-mono font-bold text-[#d4522f] tabular-nums">
            {formatMoney(p.price.amount * p.stockQuantity)}
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (p) => (
          <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(p, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '110px',
        renderCell: (p) => (
          <div className="flex items-center gap-1 justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProductForAdjust(p);
                setAdjustQuantity(10);
                setAdjustMode('add');
                setIsAdjustStockModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-[#d4522f] hover:bg-[#d4522f]/10 cursor-pointer"
              title="Adjust Stock"
            >
              <ArrowDownUp size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditProduct(p);
              }}
              className="p-1.5 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
              title="Edit Product"
            >
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteProduct(p.id);
              }}
              className="p-1.5 rounded-lg text-black/55 dark:text-white/55 hover:text-red-500 cursor-pointer"
              title="Delete Product"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ];
    return base.filter((c) => !isStaff || c.key !== 'cost');
  }, [isAr, isEn, t, deleteProduct, isStaff, branchesById, currentBranch, language]);

  const purchaseColumns = useMemo<ColumnDefinition<PurchaseDocument>[]>(
    () => [
      {
        key: 'docNumber',
        header: isAr ? 'رقم السند' : 'N° Document',
        width: '150px',
        sortable: true,
        renderCell: (doc) => {
          const isBr = doc.type === 'br';
          return (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                  isBr
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                }`}
              >
                {isBr ? 'BR' : 'PO'}
              </span>
              <span className="font-mono font-bold text-xs text-black dark:text-white">
                {doc.docNumber}
              </span>
            </div>
          );
        },
      },
      {
        key: 'supplier',
        header: isAr ? 'المورد' : 'Fournisseur',
        minWidth: '180px',
        sortable: true,
        renderCell: (doc) => (
          <div className="text-xs">
            <div className="font-bold text-black dark:text-white truncate">{doc.supplierName}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
              {doc.items.length} {isAr ? 'أصناف محددة' : 'articles commandés'}
            </div>
          </div>
        ),
      },
      {
        key: 'date',
        header: isAr ? 'التاريخ' : 'Date & Échéance',
        width: '130px',
        sortable: true,
        renderCell: (doc) => (
          <div className="text-xs font-mono">
            <div className="text-black dark:text-white">{doc.orderDate}</div>
            {doc.deliveryExpectedDate && (
              <div className="text-[10px] text-black/55 dark:text-white/55">
                {isAr ? 'التسليم:' : 'Prévue:'} {doc.deliveryExpectedDate}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'totalTtc',
        header: isAr ? 'المبلغ الإجمالي' : 'Total TTC',
        width: '125px',
        sortable: true,
        renderCell: (doc) => (
          <span className="font-mono font-bold text-xs text-[#d4522f] tabular-nums">
            {formatMoney(doc.totalTtc)}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut',
        width: '115px',
        sortable: true,
        renderCell: (doc) => {
          const isReceived = doc.status === 'Received' || doc.type === 'br';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isReceived
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
              }`}
            >
              {isReceived ? <CheckCircle2 size={11} /> : <Clock size={11} />}
              <span>{isReceived ? (isAr ? 'تم الاستلام' : 'Réceptionné') : isAr ? 'قيد التوريد' : 'En commande'}</span>
            </span>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '120px',
        sortable: true,
        renderCell: (doc) => (
          <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(doc, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '150px',
        renderCell: (doc) => (
          <div className="flex items-center justify-end gap-1.5">
            {doc.type === 'po' && doc.status === 'Ordered' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReceiveRetailPo(doc.id);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <CheckCircle2 size={12} />
                <span>{isAr ? 'استلام' : 'Réceptionner'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.print();
              }}
              className="p-1.5 text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Imprimer"
            >
              <Printer size={14} />
            </button>
          </div>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
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
          { width: '1.2*', minWidth: '100px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Boxes size={22} />}
        title={isAr ? 'المخزون' : isEn ? 'Inventory' : 'Stock'}
        secondaryActions={
          !isStaff ? (
            <div className="flex items-center gap-2 flex-wrap">
              <LiveSegmentedControl
                size="md"
                value={activeSubTab}
                onValueChange={(val) => setActiveSubTab(val as 'inventory' | 'purchases')}
                options={[
                  {
                    value: 'inventory',
                    label: isAr ? 'المخزون' : 'Catalogue',
                    icon: <Boxes size={14} />,
                    count: inventoryStats.totalSKUs,
                  },
                  {
                    value: 'purchases',
                    label: isAr ? 'المشتريات' : 'Achats',
                    icon: <Truck size={14} />,
                    count: purchaseStats.pendingCount,
                  },
                ]}
                aria-label="POS Inventory Section Switcher"
              />
              {activeSubTab === 'purchases' && purchaseStats.lowStockCount > 0 && (
                <AtriumButton
                  variant="secondary"
                  size="md"
                  onClick={handlePreFillLowStockPo}
                  icon={<AlertTriangle size={14} className="text-amber-600" />}
                >
                  {isAr ? `تموين (${purchaseStats.lowStockCount})` : `Ruptures (${purchaseStats.lowStockCount})`}
                </AtriumButton>
              )}
            </div>
          ) : undefined
        }
        primaryAction={{
          label:
            isStaff || activeSubTab === 'inventory'
              ? isAr ? 'إضافة منتج جديد' : isEn ? 'Add Product' : 'Nouveau Produit'
              : isAr ? 'طلب توريد جديد' : isEn ? 'New Purchase Order' : 'Nouvelle Commande',
          icon: <Plus size={15} />,
          onClick: isStaff || activeSubTab === 'inventory' ? handleOpenAddProduct : handleOpenNewRetailPo,
        }}
      />

      {isStaff || activeSubTab === 'inventory' ? (
        <>
          <ScreenKpiBanner
            heading={isAr ? 'تقييم المخزون ومؤشرات النواقص' : isEn ? 'Inventory Valuation & Stock Alerts' : 'Valorisation Stock & Alertes Réassort'}
            language={language}
            primaryCard={{
              label: isStaff ? (isAr ? 'الكتالوج المعروض' : 'Articles au Catalogue') : t('shop_kpi_retail_val'),
              badgeText: !isStaff ? `+${formatMoney(inventoryStats.potentialProfit)} marge` : `${inventoryStats.totalUnits} unités`,
              count: inventoryStats.retailValuation,
              formatValue: (n) => formatMoney(n),
              tone: 'emerald',
            }}
            secondaryCard={{
              label: t('shop_kpi_low_stock'),
              badgeText: `alertes (${inventoryStats.outOfStockItems} ruptures)`,
              count: inventoryStats.lowStockItems,
              tone: 'terracotta',
              isActive: stockStatusFilter === 'low',
              onToggle: () => setStockStatusFilter((p) => (p === 'low' ? 'all' : 'low')),
            }}
            darkCard={{
              label: t('shop_kpi_skus'),
              badgePrefix: '',
              badgeCount: inventoryStats.totalUnits,
              badgeSuffix: isAr ? 'وحدة' : 'unités',
              valuePrefix: '',
              valueCount: inventoryStats.totalSKUs,
              valueSuffix: ' SKUs',
              caption: `${currentBranch?.name || 'Magasin'} · ${inventoryStats.outOfStockItems} en rupture`,
            }}
          />

          <ScreenPod>
            <ScreenCollectionToolbar
              title={isAr ? 'المخزون والمنتجات' : isEn ? 'Store Catalog & Stock' : 'Catalogue & Stocks Magasin'}
              liveRegionText={`${sortedInventory.length} produits`}
              language={language}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={isAr ? 'بحث بالاسم، الباركود، SKU أو الفرع...' : 'Recherche produit, code-barres, branche...'}
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

            <UniversalDataCollection<Product>
              items={sortedInventory}
              keyExtractor={(p) => p.id}
              viewMode={viewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode="list"
              hideToolbar
              openItemId={inspectingProduct?.id ?? null}
              columns={productColumns}
              isLoading={isSyncing || networkMode === 'force_skeleton'}
              isOffline={networkMode === 'offline'}
              isTimedOut={isSyncTimeout}
              lastSyncedAt={lastSyncedAt}
              onRetrySync={retryCloudSync}
              selectedIds={selectedProductIds}
              onSelectionChange={setSelectedProductIds}
              bulkSecondaryAction={{
                label: isAr ? 'تموين جماعي' : 'Réassort groupé',
                icon: <ArrowDownUp size={13} />,
                onClick: () => setIsBatchRestockModalOpen(true),
                variant: 'primary',
              }}
              onBulkDelete={handleBatchDelete}
              sortBy={invSortBy}
              sortDirection={invSortDir}
              onSortChange={(col, dir) => {
                setInvSortBy(col);
                setInvSortDir(dir);
              }}
              onItemClick={(p, opener) => {
                setDrawerOpenerEl(opener || null);
                setInspectorTab('overview');
                setInspectingProduct(p);
              }}
              onViewDetails={(p, opener) => {
                setDrawerOpenerEl(opener || null);
                setInspectorTab('overview');
                setInspectingProduct(p);
              }}
              onEdit={(p) => handleOpenEditProduct(p)}
              onDelete={(p) => {
                deleteProduct(p.id);
                if (inspectingProduct?.id === p.id) setInspectingProduct(null);
              }}
              getRowMeta={(p): Partial<KineticRowData> => {
                const isOut = p.stockQuantity <= 0;
                const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
                const costAmt = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);
                const branchInfo = resolveRecordBranch(p, branchesById, currentBranch, language);
                return {
                  title: p.name,
                  subline: `${p.sku}${p.barcode ? ` · ${p.barcode}` : ''}`,
                  avatarText: getInitials2(p.name),
                  categoryLabel: p.category || 'Catalogue',
                  statusLabel: isOut
                    ? isAr ? 'نفذت الكمية' : 'Rupture'
                    : isLow
                    ? isAr ? 'مخزون منخفض' : 'Stock Bas'
                    : isAr ? 'متوفر' : 'Disponible',
                  statusVariant: isOut ? 'blocked' : isLow ? 'warning' : 'active',
                  metricPrimary: formatMoney(p.price.amount),
                  metricSecondary: `${p.stockQuantity} ${p.unit || t('shop_unit_pcs')}`,
                  branchName: branchInfo.name,
                  branchCode: branchInfo.code,
                  isPinned: pinnedProductIds.has(p.id),
                  detailCol1: {
                    heading: isAr ? 'المنتج' : 'Article',
                    primaryText: p.name,
                    secondaryText: `SKU ${p.sku}`,
                    tertiaryText: p.barcode || branchInfo.name,
                  },
                  detailCol2: {
                    heading: isAr ? 'التسعير والهامش' : 'Tarification',
                    primaryText: formatMoney(p.price.amount),
                    secondaryText: !isStaff ? `Coût: ${formatMoney(costAmt)}` : undefined,
                    tertiaryText: `TVA ${p.taxRate || 19}%`,
                  },
                  detailCol3: {
                    heading: isAr ? 'المخزون' : 'Stock & Seuil',
                    primaryText: `${p.stockQuantity} ${p.unit || 'pcs'}`,
                    secondaryText: `Seuil min: ${p.reorderLevel || 5}`,
                    tertiaryText: `Val: ${formatMoney(p.price.amount * p.stockQuantity)}`,
                  },
                };
              }}
              getFanActions={(p): KineticRowFanAction[] => [
                {
                  id: 'adjust',
                  label: isAr ? 'تعديل الرصيد' : 'Ajuster stock',
                  icon: <ArrowDownUp className="w-[15px] h-[15px]" />,
                  onClick: (e) => {
                    e.stopPropagation();
                    setSelectedProductForAdjust(p);
                    setAdjustQuantity(10);
                    setAdjustMode('add');
                    setIsAdjustStockModalOpen(true);
                  },
                },
                {
                  id: 'edit',
                  label: isAr ? 'تعديل' : 'Modifier',
                  icon: <Edit2 className="w-[15px] h-[15px]" />,
                  onClick: (e) => {
                    e.stopPropagation();
                    handleOpenEditProduct(p);
                  },
                },
                {
                  id: 'del',
                  label: isAr ? 'حذف' : 'Supprimer',
                  icon: <Trash2 className="w-[15px] h-[15px]" />,
                  isDanger: true,
                  onClick: () => {
                    deleteProduct(p.id);
                    if (inspectingProduct?.id === p.id) setInspectingProduct(null);
                  },
                },
              ]}
              getDetailActions={(p): KineticDetailAction[] => [
                {
                  id: 'inspect',
                  label: isAr ? 'فتح البطاقة' : 'Ouvrir fiche',
                  icon: <Eye className="w-3.5 h-3.5" />,
                  onClick: () => {
                    setInspectorTab('overview');
                    setInspectingProduct(p);
                  },
                },
                {
                  id: 'adjust',
                  label: isAr ? 'تعديل المخزون' : 'Ajuster Stock',
                  icon: <ArrowDownUp className="w-3.5 h-3.5" />,
                  onClick: () => {
                    setSelectedProductForAdjust(p);
                    setAdjustQuantity(10);
                    setAdjustMode('add');
                    setIsAdjustStockModalOpen(true);
                  },
                },
                {
                  id: 'edit',
                  label: isAr ? 'تعديل' : 'Modifier',
                  icon: <Edit2 className="w-3.5 h-3.5" />,
                  onClick: () => handleOpenEditProduct(p),
                },
              ]}
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
              emptyTitle={t('shop_table_empty')}
              emptyDescription={t('shop_empty_cat_sub')}
              primaryActionLabel={t('shop_add_product')}
              onAddFirstItem={handleOpenAddProduct}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveAdvancedFilters || stockStatusFilter !== 'all' || searchQuery.trim().length > 0}
            />
          </ScreenPod>
        </>
      ) : (
        <>
          <ScreenKpiBanner
            heading={isAr ? 'المشتريات وإعادة التموين' : isEn ? 'Purchasing & Suppliers' : 'Approvisionnement & Commandes Fournisseurs'}
            language={language}
            primaryCard={{
              label: isAr ? 'الطلبيات قيد التوريد' : 'Commandes en cours',
              badgeText: `${purchaseStats.suppliersCount} partenaires`,
              count: purchaseStats.pendingCount,
              tone: 'emerald',
            }}
            secondaryCard={{
              label: isAr ? 'النواقص تحت حد التنبيه' : 'Articles en Alerte Stock',
              badgeText: 'références critiques',
              count: purchaseStats.lowStockCount,
              tone: 'terracotta',
              onToggle: handlePreFillLowStockPo,
            }}
            darkCard={{
              label: isAr ? 'إجمالي المشتريات المستلمة' : 'Total Réceptions (TTC)',
              badgePrefix: '',
              badgeCount: purchaseStats.receivedCount,
              badgeSuffix: isAr ? 'وصول' : 'bons',
              valuePrefix: '',
              valueCount: purchaseStats.totalPurchasedValue,
              formatValue: (n) => formatMoney(n),
              caption: `${currentBranch?.name || 'Magasin'} · Réceptions certifiées`,
            }}
          />

          <ScreenPod>
            <ScreenCollectionToolbar
              title={isAr ? 'سجل طلبيات الشراء' : 'Commandes Fournisseurs & Réceptions'}
              liveRegionText={`${filteredPurchases.length} commandes`}
              language={language}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Rechercher bon PO/BR, fournisseur..."
              hasActiveAdvancedFilters={branchFilter !== 'All'}
              activeFiltersCount={branchFilter !== 'All' ? 1 : 0}
              isFilterModalOpen={isFilterModalOpen}
              filterButtonRef={filterButtonRef}
              onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
              viewMode={viewMode}
              onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
              extraTrailingControls={
                <AtriumButton
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSupplierModalOpen(true)}
                  icon={<Building2 size={13} />}
                >
                  {isAr ? 'مورد جديد' : 'Fournisseur'}
                </AtriumButton>
              }
              activeChips={branchFilter !== 'All' ? [{ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') }] : []}
              onResetAllFilters={handleResetFilters}
            />

            <UniversalDataCollection<PurchaseDocument>
              items={filteredPurchases}
              columns={purchaseColumns}
              keyExtractor={(p) => p.id}
              viewMode={viewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode="list"
              hideToolbar
              openItemId={inspectingPurchase?.id ?? null}
              isLoading={isSyncing || networkMode === 'force_skeleton'}
              isOffline={networkMode === 'offline'}
              isTimedOut={isSyncTimeout}
              lastSyncedAt={lastSyncedAt}
              onRetrySync={retryCloudSync}
              onItemClick={(doc, opener) => {
                setDrawerOpenerEl(opener || null);
                setInspectorTab('overview');
                setInspectingPurchase(doc);
              }}
              onViewDetails={(doc, opener) => {
                setDrawerOpenerEl(opener || null);
                setInspectorTab('overview');
                setInspectingPurchase(doc);
              }}
              getRowMeta={(doc): Partial<KineticRowData> => {
                const isReceived = doc.status === 'Received' || doc.type === 'br';
                const branchInfo = resolveRecordBranch(doc, branchesById, currentBranch, language);
                return {
                  title: doc.supplierName,
                  subline: `${doc.docNumber} · ${doc.orderDate}`,
                  avatarText: doc.type === 'br' ? 'BR' : 'PO',
                  categoryLabel: doc.type === 'br' ? 'Bon Réception' : 'Bon Commande',
                  statusLabel: isReceived ? (isAr ? 'تم الاستلام' : 'Réceptionné') : isAr ? 'قيد التوريد' : 'En commande',
                  statusVariant: isReceived ? 'active' : 'info',
                  metricPrimary: formatMoney(doc.totalTtc),
                  metricSecondary: `${doc.items.length} ${isAr ? 'أصناف' : 'articles'}`,
                  branchName: branchInfo.name,
                  branchCode: branchInfo.code,
                };
              }}
              getFanActions={(doc): KineticRowFanAction[] => [
                ...(doc.type === 'po' && doc.status === 'Ordered'
                  ? [
                      {
                        id: 'receive',
                        label: isAr ? 'استلام البضاعة' : 'Réceptionner',
                        icon: <CheckCircle2 className="w-[15px] h-[15px]" />,
                        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          handleReceiveRetailPo(doc.id);
                        },
                      },
                    ]
                  : []),
                {
                  id: 'print',
                  label: isAr ? 'طباعة' : 'Imprimer',
                  icon: <Printer className="w-[15px] h-[15px]" />,
                  onClick: (e) => {
                    e.stopPropagation();
                    window.print();
                  },
                },
              ]}
              getDetailActions={(doc): KineticDetailAction[] => [
                {
                  id: 'open',
                  label: isAr ? 'عرض السند' : 'Consulter bon',
                  icon: <Eye className="w-3.5 h-3.5" />,
                  onClick: () => {
                    setInspectorTab('overview');
                    setInspectingPurchase(doc);
                  },
                },
                ...(doc.type === 'po' && doc.status === 'Ordered'
                  ? [
                      {
                        id: 'receive',
                        label: isAr ? 'استلام' : 'Réceptionner',
                        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                        onClick: () => handleReceiveRetailPo(doc.id),
                      },
                    ]
                  : []),
              ]}
              emptyTitle={isAr ? 'لا توجد طلبيات شراء حالياً' : 'Aucune commande fournisseur'}
              emptyDescription={
                isAr
                  ? 'أنشئ أول طلبية لتسجيل البضاعة القادمة من الموردين'
                  : 'Créez votre premier bon de commande pour approvisionner le magasin.'
              }
              primaryActionLabel={isAr ? 'إنشاء طلبية' : 'Nouvelle Commande'}
              onAddFirstItem={handleOpenNewRetailPo}
            />

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-[#d4522f]" />
                  <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    {isAr ? 'دليل الموردين التجاريين' : 'Fournisseurs & Grossistes Partenaires'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="text-xs font-bold text-[#d4522f] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + {isAr ? 'إضافة مورد جديد' : 'Nouveau Fournisseur'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {b2bSuppliers.map((sup) => (
                  <div
                    key={sup.id}
                    className="p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-black dark:text-white truncate">{sup.supplierName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-700 text-black/70 dark:text-white/75">
                        {sup.city || 'Alger'}
                      </span>
                    </div>
                    <div className="text-[11px] text-black/55 dark:text-white/55">
                      {sup.contactName ? `${sup.contactName} · ` : ''}
                      {sup.phone || 'Sans contact'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-black/55 dark:text-white/55 font-mono pt-1 border-t border-neutral-200/50 dark:border-neutral-800">
                      <span>{sup.sector || 'Grossiste'}</span>
                      <span>{sup.paymentTermsDays || 30}j paiement</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScreenPod>
        </>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={activeSubTab === 'inventory' ? sortedInventory.length : filteredPurchases.length}
        entityPluralLabel={activeSubTab === 'inventory' ? 'articles' : 'commandes'}
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
        subtitle={inspectingProduct ? `${inspectingProduct.sku}${inspectingProduct.barcode ? ` · ${inspectingProduct.barcode}` : ''}` : undefined}
        avatarText={inspectingProduct ? getInitials2(inspectingProduct.name) : 'PR'}
        avatarColor="#d4522f"
        branchName={inspectingProduct ? resolveRecordBranch(inspectingProduct, branchesById, currentBranch, language).name : undefined}
        headerPills={
          inspectingProduct?.category ? (
            <span className="pill inline-flex items-center gap-1 px-2.5 py-[3px] rounded-md text-[12px] font-medium bg-[#F3EDE7] dark:bg-[#262422] text-black dark:text-white border border-[#E6DED6] dark:border-[#3A3734]">
              {inspectingProduct.category}
            </span>
          ) : undefined
        }
        statusLabel={
          inspectingProduct
            ? inspectingProduct.stockQuantity <= 0
              ? isAr ? 'نفذت الكمية' : 'Rupture'
              : inspectingProduct.stockQuantity <= (inspectingProduct.reorderLevel || 5)
              ? isAr ? 'مخزون منخفض' : 'Stock Bas'
              : isAr ? 'متوفر' : 'Disponible'
            : undefined
        }
        statusClassName={
          inspectingProduct && inspectingProduct.stockQuantity <= 0
            ? MEMBER_PILL_DANGER
            : inspectingProduct && inspectingProduct.stockQuantity <= (inspectingProduct.reorderLevel || 5)
            ? MEMBER_PILL_WARN
            : MEMBER_PILL_OK
        }
        tabs={[
          { id: 'overview', label: isAr ? 'البطاقة' : isEn ? 'Overview' : 'Fiche' },
          { id: 'stock', label: isAr ? 'المخزون والهامش' : isEn ? 'Stock & Margin' : 'Stock & Marge' },
          { id: 'actions', label: isAr ? 'إجراءات' : isEn ? 'Actions' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingProduct(null)}
        onSelectItem={(p) => {
          setInspectorTab('overview');
          setInspectingProduct(p);
        }}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(p) => {
          deleteProduct(p.id);
          setInspectingProduct(null);
        }}
        renderBody={(prod, tab, epoch) => {
          const costAmt = prod.costPrice || prod.cost?.amount || Math.round(prod.price.amount * 0.6);
          const unitMargin = prod.price.amount - costAmt;
          const marginPct = prod.price.amount > 0 ? Math.round((unitMargin / prod.price.amount) * 100) : 0;
          const reorder = prod.reorderLevel || 5;
          const targetCap = Math.max(reorder * 3, prod.stockQuantity, 10);
          const stockPct = Math.min(100, Math.round((prod.stockQuantity / targetCap) * 100));
          const stockTone = prod.stockQuantity <= 0 ? 'danger' : prod.stockQuantity <= reorder ? 'warn' : 'ok';

          if (tab === 'stock') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isAr ? 'تقييم المخزون والربحية' : 'Valorisation & Marge'}>
                  <InspectorBigStat
                    value={formatMoney(prod.price.amount * prod.stockQuantity)}
                    tone={stockTone === 'danger' ? 'danger' : 'accent'}
                    caption={`${prod.stockQuantity} ${prod.unit || 'pcs'} × ${formatMoney(prod.price.amount)}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'مستوى التموين' : 'Niveau de couverture'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'الرصيد الفعلي' : 'Stock actuel'}
                      value={`${prod.stockQuantity} ${prod.unit || 'pcs'}`}
                      tone={stockTone}
                    />
                    <InspectorProgressBar
                      percent={stockPct}
                      tone={stockTone}
                      animateKey={`${prod.id}-${epoch}-stock`}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'حد التنبيه' : 'Seuil réassort'}
                      value={`${reorder} ${prod.unit || 'pcs'}`}
                    />
                    {!isStaff && (
                      <InspectorKeyValue
                        label={isAr ? 'الهامش الصافي للوحدة' : 'Marge unitaire'}
                        value={`+${formatMoney(unitMargin)} (${marginPct}%)`}
                        tone="ok"
                        isLast
                      />
                    )}
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'actions') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isAr ? 'العمليات السريعة' : 'Opérations Rapides'}>
                  <InspectorQuickActions
                    actions={[
                      {
                        id: 'adjust',
                        label: isAr ? 'تعديل الرصيد' : 'Ajuster stock',
                        icon: <ArrowDownUp size={16} />,
                        primary: true,
                        onClick: () => {
                          setSelectedProductForAdjust(prod);
                          setAdjustQuantity(10);
                          setAdjustMode('add');
                          setInspectingProduct(null);
                          setIsAdjustStockModalOpen(true);
                        },
                      },
                      {
                        id: 'edit',
                        label: isAr ? 'تعديل' : 'Modifier',
                        icon: <Edit2 size={16} />,
                        onClick: () => {
                          setInspectingProduct(null);
                          handleOpenEditProduct(prod);
                        },
                      },
                      {
                        id: 'po',
                        label: isAr ? 'طلب تموين' : 'Commander PO',
                        icon: <Truck size={16} />,
                        onClick: () => {
                          setInspectingProduct(null);
                          handlePreFillLowStockPo();
                        },
                      },
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'تعديل رصيد المخزون' : 'Ajuster le Stock Manuellement'}
                    icon={<ArrowDownUp size={15} />}
                    onClick={() => {
                      setSelectedProductForAdjust(prod);
                      setAdjustQuantity(10);
                      setAdjustMode('add');
                      setInspectingProduct(null);
                      setIsAdjustStockModalOpen(true);
                    }}
                  />
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'adjust',
                      label: isAr ? 'تعديل الرصيد' : 'Ajuster stock',
                      icon: <ArrowDownUp size={16} />,
                      primary: true,
                      onClick: () => {
                        setSelectedProductForAdjust(prod);
                        setAdjustQuantity(10);
                        setAdjustMode('add');
                        setInspectingProduct(null);
                        setIsAdjustStockModalOpen(true);
                      },
                    },
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : 'Modifier',
                      icon: <Edit2 size={16} />,
                      onClick: () => {
                        setInspectingProduct(null);
                        handleOpenEditProduct(prod);
                      },
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'التفاصيل والتسعير' : 'Tarification & Références'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'سعر البيع TTC' : 'Prix de vente TTC'}
                    value={formatMoney(prod.price.amount)}
                    tone="accent"
                  />
                  {!isStaff && (
                    <InspectorKeyValue
                      label={isAr ? 'تكلفة الشراء' : 'Coût d’achat HT'}
                      value={formatMoney(costAmt)}
                    />
                  )}
                  <InspectorKeyValue label="SKU" value={prod.sku} copyText={prod.sku} />
                  {prod.barcode && (
                    <InspectorKeyValue label="EAN-13" value={prod.barcode} copyText={prod.barcode} />
                  )}
                  <InspectorKeyValue
                    label={isAr ? 'المخزون المتوفر' : 'Stock actuel'}
                    value={`${prod.stockQuantity} ${prod.unit || 'pcs'}`}
                    tone={stockTone}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />

      <KineticSlideOverInspector<PurchaseDocument>
        isOpen={inspectingPurchase !== null}
        item={inspectingPurchase}
        allItems={filteredPurchases}
        keyExtractor={(d) => d.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingPurchase?.docNumber || ''}
        subtitle={inspectingPurchase ? `${inspectingPurchase.supplierName} · ${inspectingPurchase.orderDate}` : undefined}
        avatarText={inspectingPurchase?.type === 'br' ? 'BR' : 'PO'}
        avatarColor="#d4522f"
        branchName={inspectingPurchase ? resolveRecordBranch(inspectingPurchase, branchesById, currentBranch, language).name : undefined}
        statusLabel={inspectingPurchase ? localizeStatus(inspectingPurchase.status, language) : undefined}
        statusClassName={
          inspectingPurchase && (inspectingPurchase.status === 'Received' || inspectingPurchase.type === 'br')
            ? MEMBER_PILL_OK
            : MEMBER_PILL_INFO
        }
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Overview' : 'Synthèse' },
          { id: 'items', label: isAr ? 'السلع' : isEn ? 'Items' : 'Lignes' },
          { id: 'actions', label: isAr ? 'إجراءات' : isEn ? 'Actions' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingPurchase(null)}
        onSelectItem={(d) => {
          setInspectorTab('overview');
          setInspectingPurchase(d);
        }}
        renderBody={(doc, tab) => {
          if (tab === 'items') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={`${doc.items.length} ${isAr ? 'أصناف' : 'articles commandés'}`}>
                  <InspectorCard>
                    {doc.items.map((it, idx) => (
                      <InspectorListItem
                        key={it.id || idx}
                        title={it.description}
                        subtitle={`${it.orderedQty} ${it.unit || 'pcs'} × ${formatMoney(it.unitCostHt)}`}
                        metaRight={formatMoney(it.totalHt)}
                        isLast={idx === doc.items.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'actions') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0}>
                  <InspectorQuickActions
                    actions={[
                      {
                        id: 'print',
                        label: isAr ? 'طباعة' : 'Imprimer',
                        icon: <Printer size={16} />,
                        onClick: () => window.print(),
                      },
                      ...(doc.type === 'po' && doc.status === 'Ordered'
                        ? [
                            {
                              id: 'receive',
                              label: isAr ? 'استلام' : 'Réceptionner',
                              icon: <CheckCircle2 size={16} />,
                              primary: true,
                              onClick: () => {
                                handleReceiveRetailPo(doc.id);
                                setInspectingPurchase(null);
                              },
                            },
                          ]
                        : []),
                    ]}
                  />
                </InspectorSection>
                {doc.type === 'po' && doc.status === 'Ordered' && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={isAr ? 'تأكيد الاستلام في المخزون' : 'Valider la Réception en Stock'}
                      icon={<CheckCircle2 size={15} />}
                      onClick={() => {
                        handleReceiveRetailPo(doc.id);
                        setInspectingPurchase(null);
                      }}
                    />
                  </InspectorSection>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatMoney(doc.totalTtc)}
                  tone="accent"
                  caption={`${doc.supplierName} · ${doc.items.length} article(s)`}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفاصيل الطلبية' : 'Informations Document'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'المورد' : 'Fournisseur'} value={doc.supplierName} mono={false} />
                  <InspectorKeyValue label={isAr ? 'المبلغ HT' : 'Total HT'} value={formatMoney(doc.totalHt)} />
                  <InspectorKeyValue label="TVA 19%" value={formatMoney(doc.totalTva)} />
                  <InspectorKeyValue label={isAr ? 'التاريخ' : 'Date'} value={doc.orderDate} />
                  <InspectorKeyValue
                    label={isAr ? 'الحالة' : 'Statut'}
                    value={localizeStatus(doc.status, language)}
                    tone={doc.status === 'Received' || doc.type === 'br' ? 'ok' : 'warn'}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
              {doc.type === 'po' && doc.status === 'Ordered' && (
                <InspectorSection index={2}>
                  <InspectorWideButton
                    label={isAr ? 'تأكيد الاستلام' : 'Valider la Réception en Stock'}
                    icon={<CheckCircle2 size={15} />}
                    onClick={() => {
                      handleReceiveRetailPo(doc.id);
                      setInspectingPurchase(null);
                    }}
                  />
                </InspectorSection>
              )}
            </div>
          );
        }}
      />

      <Modal
        isOpen={isProductFormModalOpen}
        onClose={() => setIsProductFormModalOpen(false)}
        title={
          editingProductId
            ? isAr ? 'تعديل بيانات المنتج' : 'Modifier le Produit'
            : isAr ? 'إضافة منتج جديد للكتالوج' : 'Ajouter un Nouveau Produit'
        }
        subtitle={editingProductId ? formSku : currentBranch.name}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="ProdName"
            label={isAr ? 'اسم المنتج أو الصنف' : 'Nom de l’article / désignation'}
            required
            value={formName}
            onChange={setFormName}
            placeholder="Ex: Café Torréfié Arabica 1kg"
            width="100%"
            height={44}
            corner={12}
          />
          <div className="grid grid-cols-2 gap-3">
            <LabelSelect
              field="ProdCategory"
              label={isAr ? 'التصنيف' : 'Catégorie'}
              value={formCategory}
              onChange={(val) => setFormCategory(typeof val === 'string' ? val : val.target?.value || val)}
              options={[
                { value: 'Beverage', label: 'Boissons & Cafés' },
                { value: 'Grocery', label: 'Épicerie Fine & Huiles' },
                { value: 'Bakery', label: 'Boulangerie & Pâtisserie' },
                { value: 'Supplement', label: 'Compléments & Diététique' },
                { value: 'Equipment', label: 'Équipements & Accessoires' },
                { value: 'General', label: 'Articles Généraux' },
              ]}
              height={44}
              corner={12}
            />
            <LabelSelect
              field="ProdUnit"
              label={isAr ? 'وحدة القياس' : 'Unité de vente'}
              value={formUnit}
              onChange={(val) => setFormUnit(typeof val === 'string' ? val : val.target?.value || val)}
              options={[
                { value: 'pcs', label: 'Pièce (pcs)' },
                { value: 'pack', label: 'Paquet / Lot' },
                { value: 'box', label: 'Boîte' },
                { value: 'kg', label: 'Kilogramme (kg)' },
                { value: 'l', label: 'Litre (l)' },
              ]}
              height={44}
              corner={12}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LabelInput field="ProdSku" label="SKU" required value={formSku} onChange={setFormSku} placeholder="POS-COF-01" width="100%" height={44} corner={12} />
            <LabelInput field="ProdBarcode" label={isAr ? 'الباركود EAN' : 'Code-Barres EAN-13'} value={formBarcode} onChange={setFormBarcode} placeholder="6131100200101" width="100%" height={44} corner={12} />
          </div>
          <div className={`grid ${isStaff ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            <LabelInput
              field="ProdRetail"
              label={isAr ? 'سعر البيع للعموم (د.ج)' : 'Prix de Vente TTC (DA)'}
              type="number"
              required
              value={formPrice ? String(formPrice) : ''}
              onChange={(v) => setFormPrice(parseFloat(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />
            {!isStaff && (
              <LabelInput
                field="ProdCost"
                label={isAr ? 'سعر التكلفة / الشراء (د.ج)' : 'Coût d’Achat HT (DA)'}
                type="number"
                required
                value={formCost ? String(formCost) : ''}
                onChange={(v) => setFormCost(parseFloat(v) || 0)}
                width="100%"
                height={44}
                corner={12}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="ProdStock"
              label={isAr ? 'الكمية المتوفرة حالياً' : 'Stock Initial Réel'}
              type="number"
              required
              value={formStock !== undefined ? String(formStock) : ''}
              onChange={(v) => setFormStock(parseInt(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />
            <LabelInput
              field="ProdReorder"
              label={isAr ? 'حد التنبيه بالنقص' : 'Seuil d’Alerte Réassort'}
              type="number"
              required
              value={formReorder !== undefined ? String(formReorder) : ''}
              onChange={(v) => setFormReorder(parseInt(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3">
            <button type="button" onClick={() => setIsProductFormModalOpen(false)} className="h-10 px-4 text-xs font-semibold text-black/55 dark:text-white/55 rounded-full hover:bg-neutral-100 cursor-pointer">
              {t('action_cancel')}
            </button>
            <button type="submit" className="h-10 px-5 text-xs font-bold text-white bg-[#d4522f] rounded-full hover:opacity-90 cursor-pointer shadow-xs">
              {editingProductId ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : isAr ? 'إضافة الصنف' : 'Créer l’Article'}
            </button>
          </div>
        </form>
      </Modal>

      {selectedProductForAdjust && (
        <Modal
          isOpen={isAdjustStockModalOpen}
          onClose={() => setIsAdjustStockModalOpen(false)}
          title={isAr ? 'تعديل رصيد المخزون' : 'Ajustement Manuel de Stock'}
          subtitle={`${selectedProductForAdjust.name} (Actuel: ${selectedProductForAdjust.stockQuantity} ${selectedProductForAdjust.unit || 'pcs'})`}
        >
          <form onSubmit={handleConfirmStockAdjust} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 text-xs font-bold">
              <button type="button" onClick={() => setAdjustMode('add')} className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${adjustMode === 'add' ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs' : 'text-black/55 dark:text-white/55'}`}>
                + {isAr ? 'إضافة تموين' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => setAdjustMode('remove')} className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${adjustMode === 'remove' ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs' : 'text-black/55 dark:text-white/55'}`}>
                - {isAr ? 'خصم / تلف' : 'Retirer (Casse)'}
              </button>
              <button type="button" onClick={() => setAdjustMode('set')} className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${adjustMode === 'set' ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xs' : 'text-black/55 dark:text-white/55'}`}>
                = {isAr ? 'تحديد دقيق' : 'Fixer Solde'}
              </button>
            </div>
            <LabelInput
              field="AdjustQty"
              label={adjustMode === 'set' ? 'Nouveau Solde Réel' : 'Quantité à modifier'}
              type="number"
              required
              value={adjustQuantity ? String(adjustQuantity) : ''}
              onChange={(v) => setAdjustQuantity(parseInt(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />
            <LabelInput
              field="AdjustReason"
              label={isAr ? 'سبب التعديل' : 'Motif de l’opération'}
              value={adjustReason}
              onChange={setAdjustReason}
              placeholder="Ex: Réception livraison, Casse accidentelle..."
              width="100%"
              height={44}
              corner={12}
            />
            <div className="flex items-center justify-end gap-3 pt-3">
              <button type="button" onClick={() => setIsAdjustStockModalOpen(false)} className="h-10 px-4 text-xs font-semibold text-black/55 dark:text-white/55 rounded-full hover:bg-neutral-100 cursor-pointer">
                {t('action_cancel')}
              </button>
              <button type="submit" className="h-10 px-5 text-xs font-bold text-white bg-[#d4522f] rounded-full hover:opacity-90 cursor-pointer shadow-xs">
                {isAr ? 'تأكيد التعديل' : 'Valider l’Ajustement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Modal
        isOpen={isBatchRestockModalOpen}
        onClose={() => setIsBatchRestockModalOpen(false)}
        title={isAr ? 'تموين جماعي للأصناف المحددة' : 'Réassort Groupé d’Articles'}
        subtitle={`${selectedProductIds.size} ${isAr ? 'أصناف مختارة' : 'produits sélectionnés'}`}
      >
        <form onSubmit={handleConfirmBatchRestock} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="BatchQty"
            label={isAr ? 'الكمية الإضافية لكل صنف (+)' : 'Quantité à rajouter par article (+)'}
            type="number"
            required
            value={batchRestockQty ? String(batchRestockQty) : ''}
            onChange={(v) => setBatchRestockQty(parseInt(v) || 0)}
            width="100%"
            height={44}
            corner={12}
          />
          <div className="flex items-center justify-end gap-3 pt-3">
            <button type="button" onClick={() => setIsBatchRestockModalOpen(false)} className="h-10 px-4 text-xs font-semibold text-black/55 dark:text-white/55 rounded-full hover:bg-neutral-100 cursor-pointer">
              {t('action_cancel')}
            </button>
            <button type="submit" className="h-10 px-5 text-xs font-bold text-white bg-[#d4522f] rounded-full hover:opacity-90 cursor-pointer shadow-xs">
              {isAr ? 'تطبيق التموين' : 'Confirmer le Réassort'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRetailPoModalOpen}
        onClose={() => setIsRetailPoModalOpen(false)}
        title={isAr ? 'إنشاء طلبية تموين من المورد' : 'Nouvelle Commande de Réapprovisionnement'}
        subtitle={isAr ? 'سند طلبية شراء موجه للمورد مع تاريخ التسليم' : 'Bon de commande fournisseur (PO) avec délai prévisionnel'}
      >
        <form onSubmit={handleCreateRetailPo} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelSelect
              field="PoSupplier"
              label={isAr ? 'المورد التجاري' : 'Fournisseur / Grossiste'}
              value={poSupplierId}
              onChange={(val) => setPoSupplierId(typeof val === 'string' ? val : val.target?.value || val)}
              options={b2bSuppliers.map((s) => ({
                value: s.id,
                label: `${s.supplierName} (${s.city || 'Alger'})`,
              }))}
              height={44}
              corner={12}
            />
            <LabelInput
              field="PoExpectedDate"
              label={isAr ? 'تاريخ التسليم المتوقع' : 'Date de livraison prévue'}
              type="date"
              value={poExpectedDate}
              onChange={setPoExpectedDate}
              width="100%"
              height={44}
              corner={12}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                {isAr ? 'السلع المطلوبة' : 'Articles & Quantités à commander'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPoItems((prev) => [
                    ...prev,
                    {
                      productId: products[0]?.id || '',
                      description: products[0]?.name || '',
                      orderedQty: 10,
                      unitCostHt:
                        products[0]?.costPrice ||
                        products[0]?.cost?.amount ||
                        Math.round((products[0]?.price.amount || 1000) * 0.6),
                      unit: products[0]?.unit || 'pcs',
                    },
                  ])
                }
                className="text-xs font-bold text-[#d4522f] hover:underline flex items-center gap-1 cursor-pointer"
              >
                + {isAr ? 'إضافة صنف' : 'Ajouter une ligne'}
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
              {poItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                >
                  <div className="sm:col-span-6">
                    <LabelSelect
                      label="Produit"
                      value={item.productId}
                      onChange={(val) => {
                        const prodId = typeof val === 'string' ? val : val?.target?.value || val;
                        const sel = products.find((p) => p.id === prodId);
                        if (!sel) return;
                        setPoItems((prev) => {
                          const next = [...prev];
                          next[idx] = {
                            ...next[idx],
                            productId: sel.id,
                            description: sel.name,
                            unitCostHt: sel.costPrice || sel.cost?.amount || Math.round(sel.price.amount * 0.6),
                            unit: sel.unit || 'pcs',
                          };
                          return next;
                        });
                      }}
                      options={products.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.sku})`,
                      }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <LabelInput
                      type="number"
                      min="1"
                      label="Qté"
                      value={item.orderedQty}
                      onChange={(val) => {
                        const parsed = parseInt(typeof val === 'string' ? val : val?.target?.value || '1') || 1;
                        setPoItems((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], orderedQty: parsed };
                          return next;
                        });
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <LabelInput
                      type="number"
                      label="Prix Achat"
                      value={item.unitCostHt}
                      onChange={(val) => {
                        const parsed = parseFloat(typeof val === 'string' ? val : val?.target?.value || '0') || 0;
                        setPoItems((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], unitCostHt: parsed };
                          return next;
                        });
                      }}
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end">
                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPoItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <LabelInput
            field="PoNotes"
            label={isAr ? 'ملاحظات وتوجيهات الشحن' : 'Instructions de livraison & Note'}
            value={poNotes}
            onChange={setPoNotes}
            placeholder="Ex: Livraison par camionnette..."
            width="100%"
            height={44}
            corner={12}
          />
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-black/70 dark:text-white/75">
              {isAr ? 'المجموع المقدر (TTC شامل 19% رسم)' : 'Total Estimé TTC (TVA 19% incluse) :'}
            </span>
            <span className="font-mono font-black text-sm text-[#d4522f] tabular-nums">
              {formatMoney(poItems.reduce((sum, it) => sum + it.orderedQty * it.unitCostHt, 0) * 1.19)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3">
            <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsRetailPoModalOpen(false)}>
              {t('action_cancel')}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" size="sm">
              {isAr ? 'تأكيد وإرسال الطلبية' : 'Émettre le Bon de Commande'}
            </AtriumButton>
          </div>
        </form>
      </Modal>

      <B2bEntityModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        entityType="supplier"
        onSaved={(sup) => {
          const supName =
            'supplierName' in sup ? sup.supplierName : 'companyName' in sup ? sup.companyName : (sup as any).clientName || '';
          showToast({
            type: 'success',
            title: isAr ? 'مورد جديد' : 'Nouveau Fournisseur',
            message: isAr ? 'تم تسجيل المورد الجديد بنجاح' : `Fournisseur ${supName} enregistré avec succès.`,
          });
          setPoSupplierId(sup.id);
          setIsSupplierModalOpen(false);
        }}
      />
    </div>
  );
};
