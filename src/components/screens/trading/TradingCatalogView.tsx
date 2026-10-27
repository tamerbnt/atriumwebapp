import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Building2,
  Home,
  ChevronDown,
  Sparkles,
  Layers,
  TrendingUp,
  Percent,
  Download,
  Maximize2,
  Package,
  Boxes,
  Check,
  X,
  PackagePlus,
  ArrowUpRight,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

type CatalogTab = 'products' | 'services';

export const TradingCatalogView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    currentBranch,
    branches,
    switchBranch,
    resetTradingMockData,
    showToast,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<CatalogTab>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Inspector & Collection State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [drawerTab, setDrawerTab] = useState<'fiche' | 'stock' | 'marge' | 'notes'>('fiche');
  const [productNotes, setProductNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  const activeProduct = useMemo(() => {
    if (!selectedProduct) return null;
    return products.find((p) => p.id === selectedProduct.id) || selectedProduct;
  }, [selectedProduct, products]);

  useEffect(() => {
    if (activeProduct) {
      setProductNotes(activeProduct.description || '');
    }
  }, [activeProduct?.id]);

  const handleNotesChange = (val: string) => {
    setProductNotes(val);
    if (!activeProduct) return;
    setIsSavingNotes(true);
    updateProduct(activeProduct.id, { description: val });
    setTimeout(() => {
      setIsSavingNotes(false);
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 2000);
    }, 400);
  };

  const handleReplenishStock = (prod: Product, delta = 10) => {
    const nextStock = (prod.stockQuantity || 0) + delta;
    updateProduct(prod.id, { stockQuantity: nextStock });
    showToast?.({
      type: 'success',
      title: 'Stock Réapprovisionné',
      message: `+${delta} ${prod.unit || 'u'} ajoutés à ${prod.name} (Nouveau stock: ${nextStock})`,
    });
  };

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState(1000);
  const [costAmount, setCostAmount] = useState(700);
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('u');
  const [taxRate, setTaxRate] = useState(19);
  const [category, setCategory] = useState('Matériaux BTP');
  const [reorderLevel, setReorderLevel] = useState(10);
  const [stockQuantity, setStockQuantity] = useState(50);

  // Filtered items
  const filteredItems = useMemo(() => {
    return products.filter((p) => {
      const isSrv =
        p.category?.toLowerCase().includes('service') ||
        p.category?.toLowerCase().includes('prestation') ||
        p.unit === 'forfait';
      if (activeTab === 'services' && !isSrv) return false;
      if (activeTab === 'products' && isSrv) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        const matchesCat = (p.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      return true;
    });
  }, [products, activeTab, searchQuery]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'sku') {
        const cmp = (a.sku || '').localeCompare(b.sku || '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'price') {
        const aP = a.price?.amount || 0;
        const bP = b.price?.amount || 0;
        return sortDir === 'asc' ? aP - bP : bP - aP;
      }
      if (sortBy === 'stock') {
        const aS = a.stockQuantity || 0;
        const bS = b.stockQuantity || 0;
        return sortDir === 'asc' ? aS - bS : bS - aS;
      }
      return 0;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Désignation',
      'Catégorie',
      'Type',
      'Unité',
      'TVA %',
      'Prix Vente HT',
      'Coût Achat HT',
      'Stock Réel',
      'Seuil Alerte',
    ];
    const rows = filteredItems.map((p) => [
      `"${p.sku || ''}"`,
      `"${p.name}"`,
      `"${p.category || ''}"`,
      `"${p.unit === 'forfait' ? 'Service' : 'Produit'}"`,
      `"${p.unit || 'u'}"`,
      `"${p.taxRate ?? 19}"`,
      `"${p.price?.amount || 0}"`,
      `"${p.cost?.amount || p.costPrice || 0}"`,
      `"${p.stockQuantity ?? ''}"`,
      `"${p.reorderLevel ?? ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-trading-catalog-${new Date().toISOString().split('T')[0]}.csv`);
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

  // Catalog Metrics
  const stats = useMemo(() => {
    const physicalProducts = products.filter(
      (p) =>
        !p.category?.toLowerCase().includes('service') &&
        !p.category?.toLowerCase().includes('prestation') &&
        p.unit !== 'forfait'
    );
    const services = products.filter(
      (p) =>
        p.category?.toLowerCase().includes('service') ||
        p.category?.toLowerCase().includes('prestation') ||
        p.unit === 'forfait'
    );

    const totalValuation = physicalProducts.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0),
      0
    );

    const totalSalesPotential = physicalProducts.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.price?.amount || 0),
      0
    );

    const avgMargin =
      totalSalesPotential > 0
        ? Math.round(((totalSalesPotential - totalValuation) / totalSalesPotential) * 100)
        : 32;

    return {
      productsCount: physicalProducts.length,
      servicesCount: services.length,
      totalValuation,
      totalSalesPotential,
      avgMargin,
    };
  }, [products]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPriceAmount(1000);
    setCostAmount(700);
    setSku('');
    setUnit(activeTab === 'services' ? 'forfait' : 'u');
    setTaxRate(activeTab === 'services' ? 9 : 19);
    setCategory(activeTab === 'services' ? 'Prestations & Services' : 'Matériaux BTP');
    setReorderLevel(10);
    setStockQuantity(50);
    setModalOpen(true);
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setPriceAmount(p.price?.amount || 0);
    setCostAmount(p.cost?.amount || p.costPrice || 0);
    setSku(p.sku || '');
    setUnit(p.unit || 'u');
    setTaxRate(p.taxRate ?? 19);
    setCategory(p.category || 'Général');
    setReorderLevel(p.reorderLevel || 10);
    setStockQuantity(p.stockQuantity || 0);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: name.trim(),
        description: description.trim(),
        price: { amount: priceAmount, currency: 'DZD' },
        cost: { amount: costAmount, currency: 'DZD' },
        sku: sku.trim() || undefined,
        unit,
        taxRate,
        category,
        reorderLevel,
        stockQuantity: activeTab === 'services' ? 999 : stockQuantity,
      });
    } else {
      addProduct({
        name: name.trim(),
        description: description.trim(),
        price: { amount: priceAmount, currency: 'DZD' },
        cost: { amount: costAmount, currency: 'DZD' },
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        unit,
        taxRate,
        category,
        reorderLevel,
        stockQuantity: activeTab === 'services' ? 999 : stockQuantity,
        isActive: true,
        isPinned: false,
      });
    }

    setModalOpen(false);
  };

  const columns: ColumnDefinition<Product>[] = [
    {
      key: 'sku',
      header: 'Réf. SKU',
      width: '120px',
      renderCell: (p) => (
        <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
          {p.sku || 'N/A'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Désignation',
      minWidth: '220px',
      renderCell: (p) => (
        <div className="text-xs">
          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
            {p.name}
          </span>
          <span className="text-[10px] text-neutral-400">{p.category}</span>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unité',
      width: '70px',
      renderCell: (p) => <span className="text-xs font-mono text-neutral-500">{p.unit || 'u'}</span>,
    },
    {
      key: 'tva',
      header: 'TVA %',
      width: '70px',
      renderCell: (p) => <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300">{p.taxRate ?? 19}%</span>,
    },
    {
      key: 'price',
      header: 'Prix Vente HT',
      width: '130px',
      renderCell: (p) => (
        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 tabular-nums">
          {formatMoney(p.price?.amount || 0)}
        </span>
      ),
    },
    {
      key: 'cost',
      header: "Coût d'Achat HT",
      width: '120px',
      renderCell: (p) => (
        <span className="font-mono text-xs text-neutral-500 tabular-nums">
          {formatMoney(p.cost?.amount || p.costPrice || 0)}
        </span>
      ),
    },
    ...(activeTab === 'products'
      ? [
          {
            key: 'stock',
            header: 'Stock Réel',
            width: '100px',
            renderCell: (p: Product) => (
              <span className="font-mono font-bold text-xs tabular-nums text-neutral-800 dark:text-neutral-200">
                {p.stockQuantity || 0}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'actions',
      header: '',
      width: '80px',
      renderCell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleEdit(p)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => deleteProduct(p.id)}
            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Outer Workspace Panel */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('trading_catalog_title', 'Catalogue Produits & Prestations')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {products.length} {language === 'ar' ? 'عنصر' : 'références'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('trading_catalog_subtitle', 'Tarifs HT, taux de TVA réglementaires (0%, 9%, 19%) et gestion des unités de vente')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Dépôt Central'}
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
                    {language === 'ar' ? 'المستودعات والفروع' : 'Dépôts & Points de Vente'}
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left rtl:text-right text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-between"
                    >
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{b.name}</span>
                      {b.id === currentBranch?.id && <span className="text-[#C4785A] text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demo Data Reset */}
            <button
              type="button"
              onClick={() => resetTradingMockData && resetTradingMockData()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Réinitialiser les données B2B de test"
            >
              <Sparkles size={13} className="text-[#C4785A]" />
              <span>{language === 'ar' ? 'بيانات تجريبية' : 'Démo B2B'}</span>
            </button>

            {/* Primary Action Button */}
            <AtriumButton
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              icon={<Plus size={15} />}
            >
              {activeTab === 'products'
                ? language === 'ar'
                  ? 'مادة جديدة'
                  : 'Nouvel Article'
                : language === 'ar'
                ? 'خدمة جديدة'
                : 'Nouvelle Prestation'}
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Articles de Stock */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'مواد وسلع المخزن' : 'Articles & Matériaux'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {stats.productsCount} références
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {stats.productsCount}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <Tag size={13} className="text-[#C4785A]" />
                  <span>Prix de vente HT moyen: <strong>{formatMoney(1850)}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Services & Prestations */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'الخدمات والاستشارات' : 'Prestations & Services'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {stats.servicesCount} forfaits
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {stats.servicesCount}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <Percent size={13} className="text-emerald-500" />
                  <span>Marge commerciale brute: <strong className="text-neutral-800 dark:text-neutral-200">{stats.avgMargin}%</strong></span>
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  {language === 'ar' ? 'القيمة الإجمالية للكتالوج المخزني' : 'Valorisation Globale du Stock'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  Coût d'Achat
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(stats.totalValuation)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-[#FB923C]" />
                    <span>Potentiel Vente HT: {formatMoney(stats.totalSalesPotential)}</span>
                  </span>
                  <span className="font-mono text-stone-300">DZD</span>
                </div>
              </div>
              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Bottom Collection Pod Tray (SurfaceBgElevated: #F8F9FA) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Integrated Toolbar: Left Anchor + Controls Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left Title / Icon / Count Anchor */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
                <ShoppingBag size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {activeTab === 'products'
                    ? t('trading_catalog_articles_title', 'Articles de Négoce')
                    : t('trading_catalog_services_title', 'Prestations & Forfaits')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] font-semibold font-mono">
                  {filteredItems.length}
                </span>
              </div>
            </div>

            {/* Controls Bar: Segment Tabs + Seek Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Segment Toggle Capsules */}
              <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl overflow-x-auto self-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'products'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('trading_catalog_tab_products', 'Articles & Matériaux de Stock')}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'products' ? 'bg-[#C4785A] text-white' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'}`}>
                    {stats.productsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'services'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('trading_catalog_tab_services', 'Prestations & Services Immatériels')}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'services' ? 'bg-[#C4785A] text-white' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'}`}>
                    {stats.servicesCount}
                  </span>
                </button>
              </div>

              {/* Seek Search */}
              <div className="self-end sm:self-auto">
                <Seek
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={language === 'ar' ? 'بحث بالاسم، الرمز، الفئة...' : 'Filtrer nom, SKU, catégorie...'}
                  shutSize={36}
                  openWidth={240}
                />
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-9 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download size={13} />
                <span>Exporter</span>
              </button>

              {/* Fullscreen Expand */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Plein écran"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* Batch Selection Banner */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  {selectedIds.size} articles sélectionnés
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  Désélectionner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer ${selectedIds.size} articles ?`)) {
                      selectedIds.forEach((id) => deleteProduct(id));
                      setSelectedIds(new Set());
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 size={13} />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          )}

          {/* Dual Collection Table + 390px Inline Side Inspector */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <UniversalDataCollection<Product>
                items={sortedItems}
                keyExtractor={(p) => p.id}
                defaultViewMode="list"
                columns={columns}
                sortBy={sortBy}
                sortDirection={sortDir}
                onSortChange={(key) => {
                  if (sortBy === key) {
                    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy(key);
                    setSortDir('asc');
                  }
                }}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                isPinned={(p) => pinnedIds.has(p.id)}
                onTogglePin={(p) => {
                  setPinnedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  });
                }}
                onItemClick={(p) => setSelectedProduct(p)}
                onViewDetails={(p) => setSelectedProduct(p)}
                onEdit={(p) => handleEdit(p)}
                onDelete={(p) => {
                  if (window.confirm(`Supprimer ${p.name} ?`)) {
                    deleteProduct(p.id);
                    if (selectedProduct?.id === p.id) setSelectedProduct(null);
                  }
                }}
                customActions={(p) =>
                  p.unit !== 'forfait'
                    ? [
                        {
                          id: 'replenish',
                          label: '+10 Stock',
                          icon: <PackagePlus size={13} />,
                          variant: 'primary',
                          onClick: () => handleReplenishStock(p, 10),
                        },
                      ]
                    : []
                }
                renderCard={(p) => {
                  const marginPercent =
                    (p.price?.amount || 0) > 0
                      ? Math.round(
                          (((p.price?.amount || 0) - (p.cost?.amount || p.costPrice || 0)) /
                            (p.price?.amount || 1)) *
                            100
                        )
                      : 0;
                  const isLowStock = (p.stockQuantity || 0) <= (p.reorderLevel || 10);

                  return (
                    <div className="flex flex-col justify-between w-full h-full">
                      <div>
                        {/* Header: SKU & Category */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                            {p.sku || 'N/A'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A]">
                            {p.category || 'Général'}
                          </span>
                        </div>

                        {/* Title & Desc */}
                        <h3 className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1 mb-1">
                          {p.name}
                        </h3>
                        <p className="text-xs text-neutral-400 line-clamp-2 min-h-[32px]">
                          {p.description || 'Article standard de négoce et distribution Atrium.'}
                        </p>

                        {/* Financial metrics */}
                        <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Prix Vente HT :</span>
                            <span className="font-mono font-bold text-[#C4785A] text-sm tabular-nums">
                              {formatMoney(p.price?.amount || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>Coût d'Achat :</span>
                            <span className="font-mono tabular-nums">
                              {formatMoney(p.cost?.amount || p.costPrice || 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-100 dark:border-neutral-700">
                            <span className="text-neutral-500">Marge Brute :</span>
                            <span className={`font-semibold font-mono ${marginPercent >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {marginPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Footer */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                        {p.unit !== 'forfait' ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  (p.stockQuantity || 0) === 0
                                    ? 'bg-rose-500'
                                    : isLowStock
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                                {p.stockQuantity || 0} {p.unit || 'u'} en stock
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplenishStock(p, 10);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#C4785A]/10 hover:bg-[#C4785A]/20 text-[#C4785A] text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              +10 Stock
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-neutral-500">
                            <Sparkles size={13} className="text-[#C4785A]" />
                            <span>Prestation au Forfait</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
                emptyTitle="Aucun article trouvé"
              />
            </div>

            {/* 390px Inline Side Inspector Drawer */}
            {activeProduct && (
              <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center text-lg font-bold shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                      <ShoppingBag size={22} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-neutral-900 dark:text-white truncate text-base">
                        {activeProduct.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <span className="font-mono font-semibold">{activeProduct.sku || 'SANS SKU'}</span>
                        <span>·</span>
                        <span>{activeProduct.category || 'Général'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Quick Action Ribbon */}
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  {activeProduct.unit !== 'forfait' && (
                    <button
                      type="button"
                      onClick={() => handleReplenishStock(activeProduct, 10)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-[#C4785A] hover:bg-[#B3684A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <PackagePlus size={13} />
                      <span>+10 Stock</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(activeProduct)}
                    className="py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit size={13} />
                    <span>Modifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Supprimer ${activeProduct.name} ?`)) {
                        deleteProduct(activeProduct.id);
                        setSelectedProduct(null);
                      }
                    }}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-neutral-500 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* 4 Tabs */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('fiche')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'fiche'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Fiche
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('stock')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'stock'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('marge')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'marge'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Marge
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('notes')}
                    className={`flex-1 py-1 text-center rounded-lg transition-all ${
                      drawerTab === 'notes'
                        ? 'bg-white dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Notes
                  </button>
                </div>

                {/* Tab 1: Fiche */}
                {drawerTab === 'fiche' && (
                  <div className="space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-2 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Référence SKU :</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                          {activeProduct.sku || 'SANS SKU'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Catégorie :</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {activeProduct.category || 'Général'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Unité de vente :</span>
                        <span className="font-mono text-neutral-700 dark:text-neutral-300">
                          {activeProduct.unit || 'u'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Taux de TVA :</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {activeProduct.taxRate ?? 19}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Stock */}
                {drawerTab === 'stock' && (
                  <div className="space-y-3 text-xs animate-in fade-in duration-150">
                    {activeProduct.unit === 'forfait' ? (
                      <div className="p-4 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                        Cet article est un service/forfait immatériel. Aucun stock physique géré.
                      </div>
                    ) : (
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Stock Réel Disponible :</span>
                          <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">
                            {activeProduct.stockQuantity || 0} {activeProduct.unit || 'u'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Seuil Réapprovisionnement :</span>
                          <span className="font-mono text-neutral-800 dark:text-neutral-200">
                            {activeProduct.reorderLevel || 10} {activeProduct.unit || 'u'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">Valorisation Stock HT :</span>
                          <span className="font-mono font-bold text-[#C4785A]">
                            {formatMoney((activeProduct.stockQuantity || 0) * (activeProduct.cost?.amount || activeProduct.costPrice || 0))}
                          </span>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleReplenishStock(activeProduct, 10)}
                            className="w-full py-2 rounded-xl bg-[#C4785A] hover:bg-[#B3684A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <PackagePlus size={14} />
                            <span>Ajouter +10 {activeProduct.unit || 'u'} au stock</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Marge */}
                {drawerTab === 'marge' && (
                  <div className="space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Prix de Vente HT :</span>
                        <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">
                          {formatMoney(activeProduct.price?.amount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Coût d'Achat HT :</span>
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">
                          {formatMoney(activeProduct.cost?.amount || activeProduct.costPrice || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <span className="text-neutral-500">Marge Brute Unitaire :</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {formatMoney((activeProduct.price?.amount || 0) - (activeProduct.cost?.amount || activeProduct.costPrice || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">Taux de Marque :</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {(activeProduct.price?.amount || 0) > 0
                            ? Math.round(
                                (((activeProduct.price?.amount || 0) - (activeProduct.cost?.amount || activeProduct.costPrice || 0)) /
                                  (activeProduct.price?.amount || 1)) *
                                  100
                              )
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Notes & Consignes */}
                {drawerTab === 'notes' && (
                  <div className="space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <label className="text-neutral-500 font-medium">Spécifications & Consignes :</label>
                      {isSavingNotes ? (
                        <span className="text-[10px] text-neutral-400 animate-pulse">Sauvegarde...</span>
                      ) : notesSavedNotice ? (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Check size={11} /> Sauvegardé
                        </span>
                      ) : null}
                    </div>
                    <textarea
                      rows={6}
                      value={productNotes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Spécifications techniques, fiches de sécurité, fournisseur de référence, conditionnement..."
                      className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingProduct ? 'Modifier l\'Article' : 'Ajouter au Catalogue'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <LabelInput
                  label="Désignation Commerciale *"
                  placeholder="Ex: Ciment Portland CPJ-42.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <LabelInput
                    label="Référence / SKU"
                    placeholder="Ex: MAT-CIM-50"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                  <LabelSelect
                    label="Unité de Mesure"
                    value={unit}
                    onChange={(val) => setUnit(typeof val === 'string' ? val : val?.target?.value || val)}
                    options={[
                      { value: "u", label: "u (Unité)" },
                      { value: "pcs", label: "pcs (Pièces)" },
                      { value: "sac", label: "sac (Sac)" },
                      { value: "barre", label: "barre (Barre)" },
                      { value: "fut", label: "fût (Fût)" },
                      { value: "tonne", label: "tonne (Tonne)" },
                      { value: "m", label: "m (Mètre)" },
                      { value: "m²", label: "m² (Mètre carré)" },
                      { value: "pack", label: "pack (Couronne/Lot)" },
                      { value: "forfait", label: "forfait (Prestation)" }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <LabelInput
                    type="number"
                    label="Prix Vente HT (DA) *"
                    value={priceAmount}
                    step={10}
                    onChange={(e) => setPriceAmount(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <LabelInput
                    type="number"
                    label="Coût d'Achat HT"
                    value={costAmount}
                    step={10}
                    onChange={(e) => setCostAmount(parseFloat(e.target.value) || 0)}
                  />
                  <LabelSelect
                    label="Taux TVA"
                    value={taxRate}
                    onChange={(val) => setTaxRate(Number(typeof val === 'object' && val?.target ? val.target.value : val))}
                    options={[
                      { value: 19, label: "19% (Standard)" },
                      { value: 9, label: "9% (Réduit)" },
                      { value: 0, label: "0% (Exonéré)" }
                    ]}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <AtriumButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalOpen(false)}
                  >
                    Annuler
                  </AtriumButton>
                  <AtriumButton
                    type="submit"
                    variant="primary"
                    size="sm"
                  >
                    Enregistrer
                  </AtriumButton>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
