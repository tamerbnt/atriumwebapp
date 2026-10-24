import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownUp,
  Download,
  Trash2,
  Edit2,
  Package,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Search,
  Building2,
  Check,
  CheckCircle2,
  Tag,
  Truck,
  Clock,
  Printer,
  FileText,
  X,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Product, StockMovement, PurchaseDocument, B2bSupplier } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { B2bEntityModal } from '../trading/B2bEntityModal';

export const PosInventoryView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    products,
    currentBranch,
    branches,
    switchBranch,
    addProduct,
    updateProduct,
    deleteProduct,
    batchDeleteProducts,
    batchRestockProducts,
    adjustStock,
    resetPosMockData,
    purchaseDocs,
    b2bSuppliers,
    createPurchaseDoc,
    receivePurchaseDoc,
    createB2bSupplier,
    currentBusiness,
    currentBranchId,
  } = useAtriumStore();

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Pinning
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [pinnedProductIds, setPinnedProductIds] = useState<Set<string>>(new Set());

  // Sorting
  const [invSortBy, setInvSortBy] = useState<string>('name');
  const [invSortDir, setInvSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals
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

  // Stock Adjustment Modal
  const [isAdjustStockModalOpen, setIsAdjustStockModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Batch Restock Modal
  const [isBatchRestockModalOpen, setIsBatchRestockModalOpen] = useState(false);
  const [batchRestockQty, setBatchRestockQty] = useState<number>(10);

  // Sub-tab Navigation: Catalog Stock vs Supplier Restocking
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'purchases'>('inventory');

  // Supplier & PO States
  const [isRetailPoModalOpen, setIsRetailPoModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState<string>(b2bSuppliers[0]?.id || '');
  const [poExpectedDate, setPoExpectedDate] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('');
  const [poItems, setPoItems] = useState<
    Array<{
      productId: string;
      description: string;
      orderedQty: number;
      unitCostHt: number;
      unit: string;
    }>
  >([]);

  const handleOpenNewRetailPo = () => {
    setPoSupplierId(b2bSuppliers[0]?.id || '');
    setPoExpectedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setPoNotes('');
    setPoItems([
      {
        productId: products[0]?.id || '',
        description: products[0]?.name || '',
        orderedQty: 10,
        unitCostHt: products[0]?.costPrice || products[0]?.cost?.amount || Math.round(products[0]?.price.amount * 0.6),
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
        title: language === 'ar' ? 'المخزون كافٍ' : 'Stock suffisant',
        message: language === 'ar' ? 'لا توجد منتجات منخفضة المخزون' : 'Aucun article sous le seuil d’alerte.',
      });
      return;
    }
    setPoSupplierId(b2bSuppliers[0]?.id || '');
    setPoExpectedDate(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
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
        title: language === 'ar' ? 'خطأ في الكميات' : 'Quantités invalides',
        message: language === 'ar' ? 'يرجى تحديد كميات صالحة' : 'Veuillez saisir des quantités supérieures à zéro.',
      });
      return;
    }
    const sup = b2bSuppliers.find((s) => s.id === poSupplierId) || b2bSuppliers[0];
    const supName = sup?.supplierName || 'Fournisseur Grossiste';
    const currentYear = new Date().getFullYear();
    const count = (purchaseDocs || []).filter((p) => p.type === 'po').length + 1;
    const docNumber = `PO-${currentYear}-${count.toString().padStart(4, '0')}`;
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
      deliveryExpectedDate: poExpectedDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
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
      title: language === 'ar' ? 'تم إنشاء الطلبية' : 'Commande Fournisseur Créée',
      message: language === 'ar' ? `تم تسجيل طلبية المورد ${docNumber}` : `Commande d’achat ${docNumber} enregistrée avec succès !`,
    });
    setIsRetailPoModalOpen(false);
  };

  const handleReceiveRetailPo = (poId: string) => {
    receivePurchaseDoc(poId);
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم استلام البضاعة' : 'Réception Validée',
      message: language === 'ar' ? 'تم استلام البضاعة وتحديث مخزون المحل آلياً !' : 'Réception confirmée ! Les stocks du magasin ont été augmentés.',
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

  // Unique categories in catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchesCatName = (p.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesCatName) return false;
      }
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const isOut = p.stockQuantity <= 0;
      const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);

      if (stockStatusFilter === 'out') return matchCat && isOut;
      if (stockStatusFilter === 'low') return matchCat && isLow;
      return matchCat;
    });
  }, [products, categoryFilter, stockStatusFilter, searchQuery]);

  // Sorted inventory with pinning
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

  // Columns for Inventory UniversalDataCollection
  const productColumns: ColumnDefinition<Product>[] = useMemo(() => [
    {
      key: 'name',
      header: language === 'ar' ? 'المنتج / الصنف' : t('shop_col_item'),
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (p) => (
        <div className="min-w-0">
          <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
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
      header: language === 'ar' ? 'التصنيف' : t('shop_col_category'),
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (p) => (
        <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
          {p.category}
        </span>
      ),
    },
    {
      key: 'sku',
      header: language === 'ar' ? 'الرمز والباركود' : t('shop_col_sku'),
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
      header: language === 'ar' ? 'سعر التكلفة' : t('shop_col_cost'),
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
      header: language === 'ar' ? 'سعر البيع' : t('shop_col_retail'),
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
      header: language === 'ar' ? 'المتوفر في المخزن' : t('shop_col_stock'),
      width: '1.4*',
      minWidth: '120px',
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
                : 'text-neutral-800 dark:text-neutral-200'
            }`}
          >
            {p.stockQuantity} {p.unit || t('shop_unit_pcs')}
          </span>
        );
      },
    },
    {
      key: 'val',
      header: language === 'ar' ? 'القيمة الإجمالية' : t('shop_col_val'),
      width: '1.3*',
      minWidth: '120px',
      sortable: true,
      renderCell: (p) => (
        <span className="font-mono font-bold text-[#C4785A] tabular-nums">
          {formatMoney(p.price.amount * p.stockQuantity)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '1.5*',
      minWidth: '110px',
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
            className="p-1.5 rounded-lg text-[#C4785A] hover:bg-[#C4785A]/10 cursor-pointer"
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
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            title="Edit Product"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(t('shop_delete_confirm', { name: p.name }))) {
                deleteProduct(p.id);
              }
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 cursor-pointer"
            title="Delete Product"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [language, t, deleteProduct]);

  // Columns for Purchases UniversalDataCollection
  const purchaseColumns: ColumnDefinition<PurchaseDocument>[] = useMemo(() => [
    {
      key: 'docNumber',
      header: language === 'ar' ? 'رقم السند' : 'N° Document',
      width: '160px',
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
            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
              {doc.docNumber}
            </span>
          </div>
        );
      },
    },
    {
      key: 'supplier',
      header: language === 'ar' ? 'المورد' : 'Fournisseur',
      minWidth: '200px',
      sortable: true,
      renderCell: (doc) => (
        <div className="text-xs">
          <div className="font-bold text-neutral-900 dark:text-white truncate">
            {doc.supplierName}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono">
            {doc.items.length} {language === 'ar' ? 'أصناف محددة' : 'articles commandés'}
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: language === 'ar' ? 'التاريخ والتسليم' : 'Date & Échéance',
      width: '140px',
      sortable: true,
      renderCell: (doc) => (
        <div className="text-xs font-mono">
          <div className="text-neutral-800 dark:text-neutral-200">{doc.orderDate}</div>
          {doc.deliveryExpectedDate && (
            <div className="text-[10px] text-neutral-400">
              {language === 'ar' ? 'التسليم:' : 'Prévue:'} {doc.deliveryExpectedDate}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'totalHt',
      header: language === 'ar' ? 'المبلغ بدون ضريبة' : 'Total HT',
      width: '120px',
      sortable: true,
      renderCell: (doc) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
          {formatMoney(doc.totalHt)}
        </span>
      ),
    },
    {
      key: 'totalTtc',
      header: language === 'ar' ? 'المبلغ الإجمالي TTC' : 'Total TTC',
      width: '130px',
      sortable: true,
      renderCell: (doc) => (
        <span className="font-mono font-bold text-xs text-[#C4785A] tabular-nums">
          {formatMoney(doc.totalTtc)}
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : 'Statut',
      width: '120px',
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
            {isReceived ? (
              <>
                <CheckCircle2 size={11} />
                <span>{language === 'ar' ? 'تم الاستلام' : 'Réceptionné'}</span>
              </>
            ) : (
              <>
                <Clock size={11} />
                <span>{language === 'ar' ? 'قيد التوريد' : 'En commande'}</span>
              </>
            )}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      renderCell: (doc) => (
        <div className="flex items-center justify-end gap-1.5">
          {doc.type === 'po' && doc.status === 'Ordered' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReceiveRetailPo(doc.id);
              }}
              title={language === 'ar' ? 'استلام ودخول المخزن' : 'Réceptionner à quai'}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={12} />
              <span>{language === 'ar' ? 'استلام' : 'Réceptionner'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.print();
            }}
            title={language === 'ar' ? 'طباعة' : 'Imprimer'}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Printer size={14} />
          </button>
        </div>
      ),
    },
  ], [language]);

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

  // Submit Add / Edit
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
        title: language === 'ar' ? 'تم تعديل المنتج' : 'Produit Mis à Jour',
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
        title: language === 'ar' ? 'تمت إضافة الصنف' : 'Nouvel Article Ajouté',
        message: `${formName.trim()} (${formSku.trim()})`,
        category: 'pos_inventory',
      });
    }

    setIsProductFormModalOpen(false);
    setEditingProductId(null);
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
      adjustReason || (adjustMode === 'add' ? 'Réassort stock régulier' : 'Ajustement manuel inventaire'),
      movementType
    );

    setIsAdjustStockModalOpen(false);
    setSelectedProductForAdjust(null);
  };

  // Batch Restock confirm
  const handleConfirmBatchRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.size === 0) return;
    batchRestockProducts(Array.from(selectedProductIds), batchRestockQty);
    setSelectedProductIds(new Set());
    setIsBatchRestockModalOpen(false);
  };

  // Batch Delete confirm
  const handleBatchDelete = () => {
    if (selectedProductIds.size === 0) return;
    if (window.confirm(`Supprimer ${selectedProductIds.size} produits sélectionnés ?`)) {
      batchDeleteProducts(Array.from(selectedProductIds));
      setSelectedProductIds(new Set());
    }
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
    link.setAttribute('download', `Inventory_Catalog_${currentBranch.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Boxes className="text-[#C4785A]" size={26} />
              <span>
                {language === 'ar' ? 'المخزون والكتالوج العام' : language === 'fr' ? 'Inventaire & Gestion des Stocks' : 'Inventory & Stock Catalog'}
              </span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {inventoryStats.totalSKUs} {language === 'ar' ? 'صنفاً' : 'articles'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'ar'
              ? 'مراقبة كميات السلع، التنبيه بالنواقص، تعديل أسعار التكلفة والتجزئة، وتصدير ملفات الجرد'
              : 'Gestion des fiches produits, codes-barres EAN-13, seuils d’alerte, valorisation à l’achat et réassort groupé.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeSubTab === 'inventory' ? (
            <>
              <button
                type="button"
                onClick={resetPosMockData}
                className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Sparkles size={14} className="text-[#C4785A]" />
                <span>{language === 'ar' ? 'شحن العينة' : 'Démo Recharge'}</span>
              </button>

              <AtriumButton
                variant="secondary"
                size="sm"
                onClick={handleExportInventoryCSV}
                icon={<Download size={13} />}
              >
                {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              </AtriumButton>

              <AtriumButton
                variant="primary"
                size="sm"
                onClick={handleOpenAddProduct}
                icon={<Plus size={15} />}
              >
                {language === 'ar' ? 'إضافة منتج جديد' : 'Nouveau Produit'}
              </AtriumButton>
            </>
          ) : (
            <>
              {purchaseStats.lowStockCount > 0 && (
                <button
                  type="button"
                  onClick={handlePreFillLowStockPo}
                  className="h-10 px-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs hover:bg-amber-100"
                >
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>
                    {language === 'ar'
                      ? `تموين النواقص (${purchaseStats.lowStockCount})`
                      : `Réapprovisionner Ruptures (${purchaseStats.lowStockCount})`}
                  </span>
                </button>
              )}

              <AtriumButton
                variant="secondary"
                size="sm"
                onClick={() => setIsSupplierModalOpen(true)}
                icon={<Building2 size={13} />}
              >
                {language === 'ar' ? 'إضافة مورد' : 'Nouveau Fournisseur'}
              </AtriumButton>

              <AtriumButton
                variant="primary"
                size="sm"
                onClick={handleOpenNewRetailPo}
                icon={<Plus size={15} />}
              >
                {language === 'ar' ? 'طلب توريد جديد' : 'Nouvelle Commande Fournisseur'}
              </AtriumButton>
            </>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation: Catalog Stock vs Achats & Fournisseurs */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-850 rounded-xl w-fit border border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('inventory')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'inventory'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Boxes size={14} className={activeSubTab === 'inventory' ? 'text-[#C4785A]' : ''} />
          <span>{t('nav_pos_inventory_tab_stock') || (language === 'ar' ? 'المخزون والمنتجات' : 'État des Stocks & Catalogue')}</span>
          <span className="text-[10px] font-mono text-neutral-400">({inventoryStats.totalSKUs})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('purchases')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'purchases'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Truck size={14} className={activeSubTab === 'purchases' ? 'text-[#C4785A]' : ''} />
          <span>{t('nav_pos_inventory_tab_purchases') || (language === 'ar' ? 'المشتريات وإعادة التموين' : 'Achats & Fournisseurs')}</span>
          {purchaseStats.pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              {purchaseStats.pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'inventory' ? (
        <>
          {/* Inventory KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {t('shop_kpi_skus')}
          </div>
          <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
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
          <div className="text-xl font-black font-mono text-[#C4785A] tabular-nums">
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
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
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
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums flex items-center gap-2">
            <span>{inventoryStats.lowStockItems}</span>
            {inventoryStats.outOfStockItems > 0 && (
              <span className="text-xs text-red-500 font-bold">
                ({inventoryStats.outOfStockItems} {language === 'ar' ? 'نفد' : 'ruptures'})
              </span>
            )}
          </div>
          <div className="text-[10px] text-neutral-400">
            {t('shop_kpi_low_sub')}
          </div>
        </div>
      </div>

      {/* Filter and Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
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

          <FilterSelect
            label={t('shop_filter_category_label')}
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(typeof val === 'string' ? val : val.target?.value || val)}
            options={categories.map((c) => ({ value: c, label: c === 'All' ? t('shop_categories_all') : c }))}
          />

          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث بالاسم، الباركود، SKU...' : 'Recherche produit, code-barres...'}
          />
        </div>

        {/* Batch Actions Toolbar */}
        {selectedProductIds.size > 0 && (
          <div className="flex items-center gap-2 p-1 px-3 bg-neutral-900 text-white rounded-xl shadow-md text-xs">
            <span className="font-bold">
              {selectedProductIds.size} {language === 'ar' ? 'محدد' : 'sélectionnés'}
            </span>
            <button
              type="button"
              onClick={() => setIsBatchRestockModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-[#C4785A] hover:opacity-90 font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowDownUp size={12} />
              <span>{language === 'ar' ? 'تموين جماعي' : 'Réassort groupé'}</span>
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} />
              <span>{language === 'ar' ? 'حذف' : 'Supprimer'}</span>
            </button>
          </div>
        )}
      </div>

      {/* UniversalDataCollection: Products */}
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
        onItemClick={(p) => handleOpenEditProduct(p)}
        renderCard={(p) => {
          const isOut = p.stockQuantity <= 0;
          const isLow = !isOut && p.stockQuantity <= (p.reorderLevel || 5);
          const costAmt = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);

          return (
            <div className="flex flex-col justify-between w-full h-full">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-neutral-500">
                    {p.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      isOut
                        ? 'text-red-600 font-black'
                        : isLow
                        ? 'text-amber-600 font-bold'
                        : 'text-neutral-700 dark:text-neutral-300'
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
                  <span>{t('shop_adjust_tooltip') || 'Ajuster Stock'}</span>
                </button>
              </div>
            </div>
          );
        }}
        selectedIds={selectedProductIds}
        onSelectionChange={setSelectedProductIds}
        isPinned={(p) => pinnedProductIds.has(p.id)}
        onTogglePin={(p) => {
          setPinnedProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(p.id)) next.delete(p.id);
            else next.add(p.id);
            return next;
          });
        }}
        emptyTitle={t('shop_table_empty')}
        emptyDescription={t('shop_empty_cat_sub')}
        primaryActionLabel={t('shop_add_product')}
        onAddFirstItem={handleOpenAddProduct}
      />
    </>
  ) : (
    <div className="space-y-6">
      {/* Purchase KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {language === 'ar' ? 'الطلبيات قيد التوريد' : 'Commandes en Cours'}
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
            {purchaseStats.pendingCount}
          </div>
          <div className="text-[10px] text-neutral-400">
            {language === 'ar' ? 'في انتظار وصول البضاعة' : 'En attente de réception à quai'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {language === 'ar' ? 'النواقص تحت حد التنبيه' : 'Articles en Alerte Stock'}
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums flex items-center justify-between">
            <span>{purchaseStats.lowStockCount}</span>
            {purchaseStats.lowStockCount > 0 && (
              <button
                type="button"
                onClick={handlePreFillLowStockPo}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'طلب فوري' : 'Commander'}
              </button>
            )}
          </div>
          <div className="text-[10px] text-neutral-400">
            {language === 'ar' ? 'تستلزم إعادة تموين سريعة' : 'Réassort recommandé'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {language === 'ar' ? 'إجمالي المشتريات المستلمة' : 'Total Réceptions (TTC)'}
          </div>
          <div className="text-xl font-black font-mono text-[#C4785A] tabular-nums">
            {formatMoney(purchaseStats.totalPurchasedValue)}
          </div>
          <div className="text-[10px] text-neutral-400">
            {purchaseStats.receivedCount} {language === 'ar' ? 'وصولات مستلمة' : 'bons réceptionnés'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {language === 'ar' ? 'شبكة الموردين' : 'Fournisseurs Référencés'}
          </div>
          <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums flex items-center justify-between">
            <span>{purchaseStats.suppliersCount}</span>
            <button
              type="button"
              onClick={() => setIsSupplierModalOpen(true)}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 font-bold transition-colors cursor-pointer"
            >
              + {language === 'ar' ? 'إضافة' : 'Nouveau'}
            </button>
          </div>
          <div className="text-[10px] text-neutral-400">
            {language === 'ar' ? 'موردين معتمدين' : 'Grossistes & importateurs'}
          </div>
        </div>
      </div>

      {/* Purchase Orders and Dock Receipts Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل طلبيات الشراء ووصولات الاستلام' : 'Commandes Fournisseurs & Bons de Réception'}
            </h2>
            <p className="text-[11px] text-neutral-400">
              {language === 'ar' ? 'تتبع الطلبيات، التحقق عند الرصيف، وتحديث المخزون بنقرة واحدة' : 'Suivi des réceptions à quai avec incrémentation automatique du stock magasin'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenNewRetailPo}
              className="h-9 px-3.5 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>{language === 'ar' ? 'طلب توريد جديد' : 'Nouvelle Commande Fournisseur'}</span>
            </button>
          </div>
        </div>

        <UniversalDataCollection
          items={purchaseDocs || []}
          columns={purchaseColumns}
          keyExtractor={(p) => p.id}
          renderCard={(doc) => (
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {doc.docNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    doc.status === 'Received' || doc.type === 'br'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700'
                  }`}
                >
                  {doc.status === 'Received' || doc.type === 'br' ? 'Réceptionné' : 'En commande'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                  {doc.supplierName}
                </h3>
                <p className="text-[11px] text-neutral-400 font-mono">
                  {doc.orderDate} · {doc.items.length} articles
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="font-mono font-bold text-sm text-[#C4785A]">
                  {formatMoney(doc.totalTtc)}
                </span>
                {doc.type === 'po' && doc.status === 'Ordered' && (
                  <button
                    type="button"
                    onClick={() => handleReceiveRetailPo(doc.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Réceptionner
                  </button>
                )}
              </div>
            </div>
          )}
          emptyTitle={language === 'ar' ? 'لا توجد طلبيات شراء حالياً' : 'Aucune commande fournisseur'}
          emptyDescription={language === 'ar' ? 'أنشئ أول طلبية لتسجيل البضاعة القادمة من الموردين' : 'Créez votre premier bon de commande pour approvisionner le magasin.'}
          primaryActionLabel={language === 'ar' ? 'إنشاء طلبية' : 'Nouvelle Commande'}
          onAddFirstItem={handleOpenNewRetailPo}
        />
      </div>

      {/* Supplier Directory Quick Grid */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#C4785A]" />
            <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              {language === 'ar' ? 'دليل الموردين التجاريين' : 'Fournisseurs & Grossistes Partenaires'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1"
          >
            + {language === 'ar' ? 'إضافة مورد جديد' : 'Nouveau Fournisseur'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {b2bSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                  {sup.supplierName}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-200/60 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {sup.city || 'Alger'}
                </span>
              </div>
              <div className="text-[11px] text-neutral-500">
                {sup.contactName ? `${sup.contactName} · ` : ''}{sup.phone || 'Sans contact'}
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-200/50 dark:border-neutral-800">
                <span>{sup.sector || 'Grossiste'}</span>
                <span>{sup.paymentTermsDays || 30}j paiement</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

      {/* MODAL: Add / Edit Product */}
      <Modal
        isOpen={isProductFormModalOpen}
        onClose={() => setIsProductFormModalOpen(false)}
        title={editingProductId ? (language === 'ar' ? 'تعديل بيانات المنتج' : 'Modifier le Produit') : (language === 'ar' ? 'إضافة منتج جديد للكتالوج' : 'Ajouter un Nouveau Produit')}
        subtitle={editingProductId ? formSku : currentBranch.name}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="ProdName"
            label={language === 'ar' ? 'اسم المنتج أو الصنف' : 'Nom de l’article / désignation'}
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
              label={language === 'ar' ? 'التصنيف' : 'Catégorie'}
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
              label={language === 'ar' ? 'وحدة القياس' : 'Unité de vente'}
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
            <LabelInput
              field="ProdSku"
              label="SKU"
              required
              value={formSku}
              onChange={setFormSku}
              placeholder="POS-COF-01"
              width="100%"
              height={44}
              corner={12}
            />

            <LabelInput
              field="ProdBarcode"
              label={language === 'ar' ? 'الباركود EAN' : 'Code-Barres EAN-13'}
              value={formBarcode}
              onChange={setFormBarcode}
              placeholder="6131100200101"
              width="100%"
              height={44}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="ProdRetail"
              label={language === 'ar' ? 'سعر البيع للعموم (د.ج)' : 'Prix de Vente TTC (DA)'}
              type="number"
              required
              value={formPrice ? String(formPrice) : ''}
              onChange={(v) => setFormPrice(parseFloat(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />

            <LabelInput
              field="ProdCost"
              label={language === 'ar' ? 'سعر التكلفة / الشراء (د.ج)' : 'Coût d’Achat HT (DA)'}
              type="number"
              required
              value={formCost ? String(formCost) : ''}
              onChange={(v) => setFormCost(parseFloat(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="ProdStock"
              label={language === 'ar' ? 'الكمية المتوفرة حالياً' : 'Stock Initial Réel'}
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
              label={language === 'ar' ? 'حد التنبيه بالنقص' : 'Seuil d’Alerte Réassort'}
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
            <button
              type="button"
              onClick={() => setIsProductFormModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 cursor-pointer shadow-xs"
            >
              {editingProductId ? (language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer') : (language === 'ar' ? 'إضافة الصنف' : 'Créer l’Article')}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Stock Adjustment */}
      {selectedProductForAdjust && (
        <Modal
          isOpen={isAdjustStockModalOpen}
          onClose={() => setIsAdjustStockModalOpen(false)}
          title={language === 'ar' ? 'تعديل رصيد المخزون' : 'Ajustement Manuel de Stock'}
          subtitle={`${selectedProductForAdjust.name} (Actuel: ${selectedProductForAdjust.stockQuantity} ${selectedProductForAdjust.unit || 'pcs'})`}
        >
          <form onSubmit={handleConfirmStockAdjust} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdjustMode('add')}
                className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${
                  adjustMode === 'add' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500'
                }`}
              >
                + {language === 'ar' ? 'إضافة تموين' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('remove')}
                className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${
                  adjustMode === 'remove' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500'
                }`}
              >
                - {language === 'ar' ? 'خصم / تلف' : 'Retirer (Casse)'}
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('set')}
                className={`flex-1 py-2 rounded-lg cursor-pointer transition-colors ${
                  adjustMode === 'set' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500'
                }`}
              >
                = {language === 'ar' ? 'تحديد دقيق' : 'Fixer Solde'}
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
              label={language === 'ar' ? 'سبب التعديل' : 'Motif de l’opération'}
              value={adjustReason}
              onChange={setAdjustReason}
              placeholder="Ex: Réception livraison, Casse accidentelle, Inventaire trimestriel..."
              width="100%"
              height={44}
              corner={12}
            />

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAdjustStockModalOpen(false)}
                className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
              >
                {t('action_cancel')}
              </button>
              <button
                type="submit"
                className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 cursor-pointer shadow-xs"
              >
                {language === 'ar' ? 'تأكيد التعديل' : 'Valider l’Ajustement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Batch Restock */}
      <Modal
        isOpen={isBatchRestockModalOpen}
        onClose={() => setIsBatchRestockModalOpen(false)}
        title={language === 'ar' ? 'تموين جماعي للأصناف المحددة' : 'Réassort Groupé d’Articles'}
        subtitle={`${selectedProductIds.size} ${language === 'ar' ? 'أصناف مختارة' : 'produits sélectionnés'}`}
      >
        <form onSubmit={handleConfirmBatchRestock} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="BatchQty"
            label={language === 'ar' ? 'الكمية الإضافية لكل صنف (+)' : 'Quantité à rajouter par article (+)'}
            type="number"
            required
            value={batchRestockQty ? String(batchRestockQty) : ''}
            onChange={(v) => setBatchRestockQty(parseInt(v) || 0)}
            width="100%"
            height={44}
            corner={12}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsBatchRestockModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 cursor-pointer shadow-xs"
            >
              {language === 'ar' ? 'تطبيق التموين' : 'Confirmer le Réassort'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Create Retail Purchase Order */}
      <Modal
        isOpen={isRetailPoModalOpen}
        onClose={() => setIsRetailPoModalOpen(false)}
        title={language === 'ar' ? 'إنشاء طلبية تموين من المورد' : 'Nouvelle Commande de Réapprovisionnement'}
        subtitle={language === 'ar' ? 'سند طلبية شراء موجه للمورد مع تاريخ التسليم' : 'Bon de commande fournisseur (PO) avec délai prévisionnel'}
      >
        <form onSubmit={handleCreateRetailPo} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelSelect
              field="PoSupplier"
              label={language === 'ar' ? 'المورد التجاري' : 'Fournisseur / Grossiste'}
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
              label={language === 'ar' ? 'تاريخ التسليم المتوقع' : 'Date de livraison prévue'}
              type="date"
              value={poExpectedDate}
              onChange={setPoExpectedDate}
              width="100%"
              height={44}
              corner={12}
            />
          </div>

          {/* PO Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                {language === 'ar' ? 'السلع المطلوبة' : 'Articles & Quantités à commander'}
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
                      unitCostHt: products[0]?.costPrice || products[0]?.cost?.amount || Math.round(products[0]?.price.amount * 0.6),
                      unit: products[0]?.unit || 'pcs',
                    },
                  ])
                }
                className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                + {language === 'ar' ? 'إضافة صنف' : 'Ajouter une ligne'}
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
              {poItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850/50 flex flex-col sm:flex-row items-center gap-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center w-full">
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
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setPoItems((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], orderedQty: val };
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
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPoItems((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], unitCostHt: val };
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
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <LabelInput
            field="PoNotes"
            label={language === 'ar' ? 'ملاحظات وتوجيهات الشحن' : 'Instructions de livraison & Note'}
            value={poNotes}
            onChange={setPoNotes}
            placeholder="Ex: Livraison par camionnette au magasin Didouche..."
            width="100%"
            height={44}
            corner={12}
          />

          {/* Financial summary */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-800/60 flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">
              {language === 'ar' ? 'المجموع المقدر (TTC شامل 19% رسم)' : 'Total Estimé TTC (TVA 19% incluse) :'}
            </span>
            <span className="font-mono font-black text-sm text-[#C4785A] tabular-nums">
              {formatMoney(
                poItems.reduce((sum, it) => sum + it.orderedQty * it.unitCostHt, 0) * 1.19
              )}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <AtriumButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRetailPoModalOpen(false)}
            >
              {t('action_cancel')}
            </AtriumButton>
            <AtriumButton
              type="submit"
              variant="primary"
              size="sm"
            >
              {language === 'ar' ? 'تأكيد وإرسال الطلبية' : 'Émettre le Bon de Commande'}
            </AtriumButton>
          </div>
        </form>
      </Modal>

      {/* MODAL: Register New Supplier */}
      <B2bEntityModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        entityType="supplier"
        onSaved={(sup) => {
          const supName = 'supplierName' in sup ? sup.supplierName : ('companyName' in sup ? sup.companyName : (sup as any).clientName || '');
          showToast({
            type: 'success',
            title: language === 'ar' ? 'مورد جديد' : 'Nouveau Fournisseur',
            message: language === 'ar' ? 'تم تسجيل المورد الجديد بنجاح' : `Fournisseur ${supName} enregistré avec succès.`,
          });
          setPoSupplierId(sup.id);
          setIsSupplierModalOpen(false);
        }}
      />
    </div>
  );
};
