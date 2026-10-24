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
  const { products, addProduct, updateProduct, deleteProduct } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<CatalogTab>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
        <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
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
          <span className="font-bold text-stone-900 dark:text-stone-100 block">
            {p.name}
          </span>
          <span className="text-[10px] text-stone-400">{p.category}</span>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unité',
      width: '70px',
      renderCell: (p) => <span className="text-xs font-mono text-stone-500">{p.unit || 'u'}</span>,
    },
    {
      key: 'tva',
      header: 'TVA %',
      width: '70px',
      renderCell: (p) => <span className="text-xs font-mono text-stone-600">{p.taxRate ?? 19}%</span>,
    },
    {
      key: 'price',
      header: 'Prix Vente HT',
      width: '120px',
      renderCell: (p) => (
        <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
          {formatMoney(p.price?.amount || 0)}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Coût Achat HT',
      width: '110px',
      renderCell: (p) => (
        <span className="font-mono text-xs text-stone-500 tabular-nums">
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
              <span className="font-mono font-bold text-xs tabular-nums text-stone-800 dark:text-stone-200">
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
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => deleteProduct(p.id)}
            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t('trading_catalog_title', 'Catalogue Produits & Prestations')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A]">
              {products.length} {language === 'ar' ? 'عنصر' : 'références'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('trading_catalog_subtitle', 'Tarifs HT, taux de TVA réglementaires (0%, 9%, 19%) et gestion des unités de vente')}
          </p>
        </div>

        <AtriumButton
          variant="primary"
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

      {/* Segmented Toggle & Search */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {t('trading_catalog_tab_products', 'Articles & Matériaux de Stock')}
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {t('trading_catalog_tab_services', 'Prestations & Services Immatériels')}
          </button>
        </div>

        <div>
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={language === 'ar' ? 'بحث بالاسم، الرمز، الفئة...' : 'Filtrer nom, SKU, catégorie...'}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <UniversalDataCollection
          items={filteredItems}
          keyExtractor={(p) => p.id}
          columns={columns}
          renderCard={(p) => (
            <div className="p-4 border rounded-xl space-y-1">
              <span className="font-mono text-xs">{p.sku}</span>
              <p className="font-bold text-xs">{p.name}</p>
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-stone-500">Prix HT :</span>
                <span className="font-bold">{formatMoney(p.price?.amount || 0)}</span>
              </div>
            </div>
          )}
          emptyTitle="Aucun article trouvé"
        />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
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

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:bg-[#b06749]"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
