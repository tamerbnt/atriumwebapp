import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

interface RawMaterial {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  minThreshold: number;
  unitCostDzd: number;
}

const INITIAL_MATERIALS: RawMaterial[] = [
  { id: 'm_01', sku: 'RAW-WD-01', name: 'Bois Chêne Brut Séché 50mm', category: 'Bois & Dérivés', stock: 12.5, unit: 'm³', minThreshold: 3, unitCostDzd: 180000 },
  { id: 'm_02', sku: 'RAW-STL-02', name: 'Piètement Acier Poudré Noir', category: 'Métallurgie', stock: 14, unit: 'Pièce', minThreshold: 6, unitCostDzd: 15000 },
  { id: 'm_03', sku: 'RAW-CHM-03', name: 'Vernis Polyuréthane Mat 5L', category: 'Chimie & Peinture', stock: 8, unit: 'Bidon', minThreshold: 5, unitCostDzd: 12000 },
  { id: 'm_04', sku: 'RAW-PLS-04', name: 'Granulés Polypropylène Vierge', category: 'Polymères', stock: 450, unit: 'kg', minThreshold: 200, unitCostDzd: 420 },
];

export const ManufacturingMaterialsView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const [materials, setMaterials] = useState<RawMaterial[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_mfg_raw_materials');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MATERIALS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['m_01']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<RawMaterial | null>(null);

  // Form states inside Modal
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bois & Dérivés');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('m³');
  const [minThreshold, setMinThreshold] = useState('3');
  const [unitCostDzd, setUnitCostDzd] = useState('15000');

  // 390px Inline Side Inspector
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(() => {
    return materials[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'fiche' | 'stock' | 'fournisseur' | 'notes'>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Persist materials
  const saveMaterials = (newMaterials: RawMaterial[]) => {
    setMaterials(newMaterials);
    try {
      localStorage.setItem('atrium_mfg_raw_materials', JSON.stringify(newMaterials));
    } catch {}
  };

  const openCreateModal = () => {
    setMaterialToEdit(null);
    setSku(`RAW-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategory('Bois & Dérivés');
    setStock('10');
    setUnit('Pièce');
    setMinThreshold('3');
    setUnitCostDzd('15000');
    setIsModalOpen(true);
  };

  const openEditModal = (m: RawMaterial) => {
    setMaterialToEdit(m);
    setSku(m.sku);
    setName(m.name);
    setCategory(m.category);
    setStock(String(m.stock));
    setUnit(m.unit);
    setMinThreshold(String(m.minThreshold));
    setUnitCostDzd(String(m.unitCostDzd));
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      showToast(isAr ? 'يرجى إدخال رمز المادة واسمها' : 'Veuillez saisir le SKU et nom de la matière', 'error');
      return;
    }

    const payload: RawMaterial = {
      id: materialToEdit?.id || `m_${Date.now()}`,
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      stock: parseFloat(stock) || 0,
      unit: unit.trim(),
      minThreshold: parseFloat(minThreshold) || 1,
      unitCostDzd: parseFloat(unitCostDzd) || 0,
    };

    if (materialToEdit) {
      const updated = materials.map((m) => (m.id === payload.id ? payload : m));
      saveMaterials(updated);
      if (selectedMaterial?.id === payload.id) setSelectedMaterial(payload);
      showToast(isAr ? 'تم تحديث بيانات المادة الأولية' : 'Matière première mise à jour', 'success');
    } else {
      const updated = [payload, ...materials];
      saveMaterials(updated);
      setSelectedMaterial(payload);
      showToast(isAr ? 'تمت إضافة مادة أولية جديدة' : 'Nouvelle matière première enregistrée', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (categoryFilter !== 'All' && m.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesSku = m.sku.toLowerCase().includes(q);
        const matchesCat = m.category.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      return true;
    });
  }, [materials, categoryFilter, searchQuery]);

  // KPIs
  const lowStockCount = materials.filter((m) => m.stock <= m.minThreshold).length;
  const totalStockValuation = materials.reduce((acc, m) => acc + m.stock * m.unitCostDzd, 0);

  // Actions
  const handlePin = (m: RawMaterial) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
    showToast(
      pinnedIds.has(m.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Matière désépinglée')
        : (isAr ? 'تم تثبيت المادة' : 'Matière épinglée'),
      'info'
    );
  };

  const handleDelete = (m: RawMaterial) => {
    const updated = materials.filter((item) => item.id !== m.id);
    saveMaterials(updated);
    if (selectedMaterial?.id === m.id) {
      setSelectedMaterial(null);
    }
    showToast(isAr ? 'تم حذف المادة الأولية' : 'Matière retirée des stocks', 'success');
  };

  const handleQuickAddStock = (m: RawMaterial) => {
    const updated = materials.map((item) => {
      if (item.id === m.id) {
        return { ...item, stock: item.stock + 10 };
      }
      return item;
    });
    saveMaterials(updated);
    const target = updated.find((item) => item.id === m.id);
    if (target && selectedMaterial?.id === m.id) setSelectedMaterial(target);
    showToast(
      isAr ? 'تمت إضافة كمية (+10) للمخزون' : 'Réapprovisionnement (+10) enregistré',
      'success'
    );
  };

  const handleExportCsv = () => {
    const headers = ['SKU', 'Désignation Matière', 'Catégorie', 'Stock', 'Unité', 'Seuil Alerte', 'Coût Unitaire DZD', 'Valeur Totale DZD'];
    const rows = filteredMaterials.map((m) => [
      m.sku,
      `"${m.name.replace(/"/g, '""')}"`,
      m.category,
      m.stock,
      m.unit,
      m.minThreshold,
      m.unitCostDzd,
      m.stock * m.unitCostDzd,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `matieres_premieres_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف المواد الأولية CSV' : 'Export CSV des matières généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedMaterial) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ التوجيهات' : 'Consignes enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<RawMaterial>[] = [
    {
      id: 'sku',
      header: isAr ? 'رمز المادة' : 'SKU Matière',
      accessorKey: 'sku',
      sortable: true,
      minWidth: '130px',
      cell: (m) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Boxes size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {m.sku}
              {pinnedIds.has(m.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              {m.category}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'name',
      header: isAr ? 'اسم المادة الخام' : 'Désignation Matière',
      accessorKey: 'name',
      sortable: true,
      minWidth: '220px',
      cell: (m) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {m.name}
          </div>
          <div className="text-[11px] text-neutral-500">
            {m.category}
          </div>
        </div>
      ),
    },
    {
      id: 'stock',
      header: isAr ? 'الكمية في المخزن' : 'Stock Disponible',
      accessorKey: 'stock',
      sortable: true,
      minWidth: '130px',
      cell: (m) => {
        const isLow = m.stock <= m.minThreshold;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                isLow
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {m.stock} {m.unit}
            </span>
            {isLow && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
          </div>
        );
      },
    },
    {
      id: 'unitCost',
      header: isAr ? 'تكلفة الوحدة' : 'Coût Unitaire',
      accessorKey: 'unitCostDzd',
      sortable: true,
      minWidth: '130px',
      cell: (m) => (
        <div>
          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
            {formatMoney(m.unitCostDzd)}
          </div>
          <div className="text-[10px] text-neutral-400">
            par {m.unit}
          </div>
        </div>
      ),
    },
    {
      id: 'totalValuation',
      header: isAr ? 'التقييم الإجمالي' : 'Valeur Totale',
      accessorKey: 'unitCostDzd',
      sortable: false,
      minWidth: '130px',
      cell: (m) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(m.stock * m.unitCostDzd)}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Boxes size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'المواد الأولية والمخرجات' : 'Matières Premières & Stocks Usine'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {materials.length} références
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إدارة مخزون المواد الخام لخطوط الإنتاج والتنبيه عند انخفاض الكميات'
                : 'Stocks d’approvisionnement, alertes seuil critique & valorisation matière'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download size={14} />}
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </AtriumButton>
          <AtriumButton
            variant="primary"
            onClick={openCreateModal}
            icon={<Plus size={14} />}
          >
            {isAr ? 'مادة جديدة' : 'Nouvelle Matière'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مستويات مخزون المواد الأولية' : 'Niveaux de Stocks Matières & Disponibilité'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة المواد المتاحة لخطوط التجميع، التنبيهات والتقييم الإجمالي' : 'Matières pour ordres de fabrication, alertes seuil critique et immobilisation'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Références Totales */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'أصناف المواد الأولية' : 'Références Enregistrées'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {materials.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'موردون معتمدون' : 'Fournisseurs qualifiés'}
              </p>
            </div>
          </div>

          {/* Card 2: Ruptures / Alertes */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'تنبيهات انخفاض المخزون' : 'Alertes Approvisionnement'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {lowStockCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {lowStockCount > 0 ? (isAr ? 'تحت حد الأمان' : 'Sous le seuil d’alerte') : 'Tous stocks conformes'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'القيمة الإجمالية للمخزون' : 'Valorisation Globale'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Matières
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalStockValuation)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'مستودع مواد خام مؤمّن' : 'Immobilisation matière active'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
      <div className="flex items-start gap-4">
        {/* Main Collection Container */}
        <div className="flex-1 min-w-0">
          <UniversalDataCollection<RawMaterial>
            data={filteredMaterials}
            columns={columns}
            keyExtractor={(m) => m.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث بالرمز، الاسم، الفئة...' : 'Rechercher par référence, désignation, catégorie...'}
            filterValue={categoryFilter}
            onFilterChange={setCategoryFilter}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع الفئات' : 'Toutes les catégories' },
              { value: 'Bois & Dérivés', label: 'Bois & Dérivés' },
              { value: 'Métallurgie', label: 'Métallurgie' },
              { value: 'Chimie & Peinture', label: 'Chimie & Peinture' },
              { value: 'Polymères', label: 'Polymères' },
            ]}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={handlePin}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            onItemClick={(m) => {
              setSelectedMaterial(m);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<Boxes size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد مواد أولية' : 'Aucune matière trouvée'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche')
                : (isAr ? 'قم بإضافة أول مادة خام للمصنع' : 'Enregistrez votre première matière première')
            }
            customActions={[
              {
                id: 'addStock',
                label: isAr ? 'إضافة كمية (+10)' : 'Réappro (+10)',
                icon: <Plus size={14} />,
                onClick: handleQuickAddStock,
              },
            ]}
            renderGridCard={(m) => {
              const isLow = m.stock <= m.minThreshold;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {m.sku}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLow
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {m.stock} {m.unit}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                      {m.name}
                    </h3>
                    <div className="text-xs text-neutral-500 font-medium mt-0.5">
                      {m.category}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Coût Unitaire</div>
                      <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                        {formatMoney(m.unitCostDzd)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Valeur Stock</div>
                      <div className="font-mono font-bold text-[#C4785A] mt-0.5">
                        {formatMoney(m.stock * m.unitCostDzd)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedMaterial && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Boxes size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedMaterial.sku}
                    </span>
                    {selectedMaterial.stock <= selectedMaterial.minThreshold && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Seuil Bas
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedMaterial.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleQuickAddStock(selectedMaterial)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <Plus size={12} />
                {isAr ? '+10 مخزون' : '+10 Stock'}
              </button>
              <button
                onClick={() => openEditModal(selectedMaterial)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedMaterial)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('fiche')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'fiche'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المواصفات' : 'Fiche Matière'}
              </button>
              <button
                onClick={() => setActiveTab('stock')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'stock'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الكميات والقيمة' : 'Stock & Seuils'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الملاحظات' : 'Consignes'}
              </button>
            </div>

            {/* Tab 1: Fiche */}
            {activeTab === 'fiche' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Code Référence SKU:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedMaterial.sku}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Famille Matière:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedMaterial.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Unité de mesure:</span>
                    <span className="font-semibold text-[#C4785A]">
                      {selectedMaterial.unit}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Coût d’achat unitaire:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(selectedMaterial.unitCostDzd)} / {selectedMaterial.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Stock & Seuils */}
            {activeTab === 'stock' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Quantité en magasin:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedMaterial.stock} {selectedMaterial.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Seuil de réapprovisionnement:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      {selectedMaterial.minThreshold} {selectedMaterial.unit}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Valeur totale immobilisée:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(selectedMaterial.stock * selectedMaterial.unitCostDzd)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Consignes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Conditions de conservation (température, hygrométrie, empilage) :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les tolérances d'humidité, délais de livraison fournisseur..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                >
                  {noteSaved ? (
                    <>
                      <Check size={14} />
                      {isAr ? 'تم الحفظ' : 'Consignes enregistrées'}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isAr ? 'حفظ' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New / Edit Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Boxes size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {materialToEdit
                      ? (isAr ? 'تعديل المادة الأولية' : 'Modifier la Matière Première')
                      : (isAr ? 'إضافة مادة أولية جديدة' : 'Nouvelle Matière Première')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'إدارة مواصفات المواد الخام وأسعار الشراء' : 'Gestion des références matière et seuils d’approvisionnement'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رمز SKU *' : 'Code SKU *'}
                  placeholder="RAW-WD-01"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الفئة' : 'Catégorie'}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'Bois & Dérivés', label: 'Bois & Dérivés' },
                    { value: 'Métallurgie', label: 'Métallurgie' },
                    { value: 'Chimie & Peinture', label: 'Chimie & Peinture' },
                    { value: 'Polymères', label: 'Polymères' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'اسم وتعيين المادة الأولية *' : 'Désignation Matière *'}
                placeholder="Ex: Bois Chêne Brut Séché 50mm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية المخزنة' : 'Quantité Stock'}
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'الوحدة' : 'Unité'}
                  placeholder="m³, kg, Pièce..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'حد الأمان' : 'Seuil Min'}
                  type="number"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  required
                />
              </div>

              <LabelInput
                label={isAr ? 'تكلفة الشراء للوحدة (دج)' : 'Coût Unitaire (DZD)'}
                type="number"
                value={unitCostDzd}
                onChange={(e) => setUnitCostDzd(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {materialToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'إضافة المادة' : 'Ajouter la Matière')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
