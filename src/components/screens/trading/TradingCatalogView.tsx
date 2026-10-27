import React, { useState, useMemo } from 'react';
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
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<CatalogTab>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

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
                  openWidth={280}
                />
              </div>
            </div>
          </div>

          {/* Table Container Inside Pod Tray */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
            <UniversalDataCollection
              items={filteredItems}
              keyExtractor={(p) => p.id}
              columns={columns}
              renderCard={(p) => (
                <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">{p.sku}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#C4785A]/10 text-[#C4785A]">
                      {p.category}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-neutral-900 dark:text-white">{p.name}</p>
                  <div className="flex justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-700">
                    <span className="text-neutral-500">Prix Vente HT :</span>
                    <span className="font-bold text-[#C4785A]">{formatMoney(p.price?.amount || 0)}</span>
                  </div>
                </div>
              )}
              emptyTitle="Aucun article trouvé"
            />
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
