import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  AlertCircle,
  Search,
  CheckCircle2,
  ShieldCheck,
  Tag,
  Package,
  Layers,
  MapPin,
  TrendingUp,
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
  DollarSign,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, SparePart } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const AutoGaragePartsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { parts, addPart, updatePart, deletePart } = useGarageData();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['part_01']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<SparePart | null>(null);

  // Form states inside Modal
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<SparePart['category']>('Freinage');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [minThreshold, setMinThreshold] = useState('4');
  const [buyingPriceDzd, setBuyingPriceDzd] = useState('4000');
  const [sellingPriceDzd, setSellingPriceDzd] = useState('6500');
  const [locationBin, setLocationBin] = useState('Rayon A-01');
  const [compatibility, setCompatibility] = useState('Renault, Dacia, Peugeot');

  // 390px Inline Side Inspector
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(() => {
    return parts[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'fiche' | 'stock' | 'mouvements' | 'notes'>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const openCreateModal = () => {
    setPartToEdit(null);
    setName('');
    setSku(`PR-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory('Freinage');
    setStockQuantity('10');
    setMinThreshold('4');
    setBuyingPriceDzd('4000');
    setSellingPriceDzd('6500');
    setLocationBin('Rayon A-01');
    setCompatibility('Multi-marques');
    setIsModalOpen(true);
  };

  const openEditModal = (p: SparePart) => {
    setPartToEdit(p);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setStockQuantity(String(p.stockQuantity));
    setMinThreshold(String(p.minThreshold));
    setBuyingPriceDzd(String(p.buyingPriceDzd));
    setSellingPriceDzd(String(p.sellingPriceDzd));
    setLocationBin(p.locationBin);
    setCompatibility(p.compatibility?.join(', ') || '');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم القطعة ورمز SKU' : 'Veuillez saisir le nom et le SKU', 'error');
      return;
    }

    const payload: SparePart = {
      id: partToEdit?.id || `part_${Date.now()}`,
      accountId: partToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      name: name.trim(),
      sku: sku.trim(),
      category: category as SparePart['category'],
      stockQuantity: parseInt(stockQuantity, 10) || 0,
      minThreshold: parseInt(minThreshold, 10) || 1,
      buyingPriceDzd: parseFloat(buyingPriceDzd) || 0,
      sellingPriceDzd: parseFloat(sellingPriceDzd) || 0,
      locationBin: locationBin.trim() || 'Rayon A-01',
      compatibility: compatibility.split(',').map((s) => s.trim()).filter(Boolean),
      createdAt: partToEdit?.createdAt || new Date().toISOString(),
    };

    if (partToEdit) {
      updatePart(payload);
      if (selectedPart?.id === payload.id) setSelectedPart(payload);
      showToast(isAr ? 'تم تحديث بيانات الصنف' : 'Pièce mise à jour avec succès', 'success');
    } else {
      addPart(payload);
      setSelectedPart(payload);
      showToast(isAr ? 'تمت إضافة صنف جديد للمخزن' : 'Nouvelle référence enregistrée', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        const matchesLoc = p.locationBin.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat && !matchesLoc) return false;
      }
      return true;
    });
  }, [parts, categoryFilter, searchQuery]);

  // KPIs
  const lowStockCount = parts.filter((p) => p.stockQuantity <= p.minThreshold).length;
  const totalStockUnits = parts.reduce((acc, p) => acc + p.stockQuantity, 0);
  const totalValuation = parts.reduce((acc, p) => acc + p.stockQuantity * p.sellingPriceDzd, 0);

  // Actions
  const handlePin = (p: SparePart) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    showToast(
      pinnedIds.has(p.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Référence désépinglée')
        : (isAr ? 'تم تثبيت الصنف' : 'Référence épinglée'),
      'info'
    );
  };

  const handleDelete = (p: SparePart) => {
    deletePart(p.id);
    if (selectedPart?.id === p.id) {
      setSelectedPart(null);
    }
    showToast(isAr ? 'تم حذف القطعة من المخزن' : 'Référence retirée du stock', 'success');
  };

  const handleQuickAddStock = (p: SparePart) => {
    const updated: SparePart = {
      ...p,
      stockQuantity: p.stockQuantity + 5,
    };
    updatePart(updated);
    if (selectedPart?.id === p.id) setSelectedPart(updated);
    showToast(
      isAr ? `تمت زيادة المخزون (+5): ${updated.stockQuantity} وحدات` : `Stock réapprovisionné (+5) : ${updated.stockQuantity} unités`,
      'success'
    );
  };

  const handleExportCsv = () => {
    const headers = ['SKU', 'Désignation', 'Catégorie', 'Emplacement', 'Stock', 'Seuil Min', 'Prix Achat DZD', 'Prix Vente DZD'];
    const rows = filteredParts.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.locationBin,
      p.stockQuantity,
      p.minThreshold,
      p.buyingPriceDzd,
      p.sellingPriceDzd,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `magasin_pieces_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف قطع الغيار CSV' : 'Export CSV des pièces généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedPart) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ تعليمات التخزين' : 'Consignes de stockage enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<SparePart>[] = [
    {
      id: 'sku',
      header: isAr ? 'رمز القطعة' : 'SKU / Réf',
      accessorKey: 'sku',
      sortable: true,
      minWidth: '130px',
      cell: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Boxes size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {p.sku}
              {pinnedIds.has(p.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              {p.locationBin}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'name',
      header: isAr ? 'اسم الصنف' : 'Désignation Pièce',
      accessorKey: 'name',
      sortable: true,
      minWidth: '220px',
      cell: (p) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {p.name}
          </div>
          <div className="text-[11px] text-neutral-500">
            {p.category}
          </div>
        </div>
      ),
    },
    {
      id: 'stockQuantity',
      header: isAr ? 'الكمية المتوفرة' : 'Stock en Rayon',
      accessorKey: 'stockQuantity',
      sortable: true,
      minWidth: '130px',
      cell: (p) => {
        const isLow = p.stockQuantity <= p.minThreshold;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                isLow
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {p.stockQuantity} u.
            </span>
            {isLow && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
          </div>
        );
      },
    },
    {
      id: 'sellingPrice',
      header: isAr ? 'سعر البيع' : 'Prix de Vente',
      accessorKey: 'sellingPriceDzd',
      sortable: true,
      minWidth: '130px',
      cell: (p) => (
        <div>
          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
            {formatMoney(p.sellingPriceDzd)}
          </div>
          <div className="text-[10px] text-neutral-400">
            Achat: {formatMoney(p.buyingPriceDzd)}
          </div>
        </div>
      ),
    },
    {
      id: 'locationBin',
      header: isAr ? 'الموقع' : 'Emplacement',
      accessorKey: 'locationBin',
      sortable: true,
      minWidth: '130px',
      cell: (p) => (
        <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          <MapPin size={12} className="text-[#C4785A] shrink-0" />
          <span>{p.locationBin}</span>
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
                {isAr ? 'مخزن قطع الغيار والمستهلكات' : 'Magasin Pièces de Rechange'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {parts.length} {isAr ? 'صنف' : 'références'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إدارة مخزون الورشة، حدود الطلب الحرج، ومواقع التخزين'
                : 'Inventaire atelier, seuils de réapprovisionnement & emplacements de stockage'}
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
            {isAr ? 'صنف جديد' : 'Nouvelle Référence'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات المستودع والقطع الحرجة' : 'Niveaux de Stock & Approvisionnement'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة الأصناف المتوفرة، القطع القريبة من النفاد والتقييم المالي'
              : 'Références gérées, articles sous le seuil d’alerte et valeur globale'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Références */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي القطع المتوفرة' : 'Unités en Rayon'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {totalStockUnits}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {parts.length} {isAr ? 'صنف مفهرس' : 'références cataloguées'}
              </p>
            </div>
          </div>

          {/* Card 2: Low Stock Alerts */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'قطع تحت حد الأمان' : 'Alertes Réapprovisionnement'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {lowStockCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {lowStockCount > 0 ? (isAr ? 'تتطلب طلبية مورد' : 'Commande fournisseur requise') : 'Aucune rupture'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'القيمة التقديرية للمخزون' : 'Valeur Estimée Stock'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Prix Vente Atelier
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalValuation)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'مستودع مؤمن ومطابق' : 'Valorisation active'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
      <div className="flex items-start gap-4">
        {/* Main Collection Container */}
        <div className="flex-1 min-w-0">
          <UniversalDataCollection<SparePart>
            data={filteredParts}
            columns={columns}
            keyExtractor={(p) => p.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث بالرمز، الاسم، الفئة، الموقع...' : 'Rechercher par référence, désignation, rayon...'}
            filterValue={categoryFilter}
            onFilterChange={setCategoryFilter}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع الفئات' : 'Toutes les catégories' },
              { value: 'Freinage', label: 'Freinage' },
              { value: 'Filtration', label: 'Filtration' },
              { value: 'Suspension', label: 'Suspension' },
              { value: 'Distribution', label: 'Distribution' },
              { value: 'Lubrifiants', label: 'Lubrifiants' },
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
            onItemClick={(p) => {
              setSelectedPart(p);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<Boxes size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد قطع غيار' : 'Aucune pièce trouvée'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucune référence ne correspond à votre recherche')
                : (isAr ? 'قم بإضافة أول صنف لمخزن الورشة' : 'Enregistrez votre première pièce en stock')
            }
            customActions={[
              {
                id: 'addStock',
                label: isAr ? 'إضافة مخزون (+5)' : 'Réappro (+5)',
                icon: <Plus size={14} />,
                onClick: handleQuickAddStock,
              },
            ]}
            renderGridCard={(p) => {
              const isLow = p.stockQuantity <= p.minThreshold;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {p.sku}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLow
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {p.stockQuantity} en stock
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                      {p.name}
                    </h3>
                    <div className="text-xs text-neutral-500 font-medium mt-0.5">
                      {p.category} • Rayon {p.locationBin}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Prix Vente</div>
                      <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                        {formatMoney(p.sellingPriceDzd)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Seuil Min</div>
                      <div className="font-mono font-semibold text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {p.minThreshold} u.
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedPart && (
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
                      {selectedPart.sku}
                    </span>
                    {selectedPart.stockQuantity <= selectedPart.minThreshold && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Seuil Bas
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedPart.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPart(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleQuickAddStock(selectedPart)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <Plus size={12} />
                {isAr ? '+5 مخزون' : '+5 Stock'}
              </button>
              <button
                onClick={() => openEditModal(selectedPart)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedPart)}
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
                {isAr ? 'المواصفات' : 'Fiche Pièce'}
              </button>
              <button
                onClick={() => setActiveTab('stock')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'stock'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الأسعار والمخزون' : 'Prix & Marges'}
              </button>
              <button
                onClick={() => setActiveTab('mouvements')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'mouvements'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'التوافق' : 'Compatibilité'}
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
                    <span className="text-neutral-500">{isAr ? 'رمز القطعة SKU:' : 'Code SKU Atelier:'}</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedPart.sku}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'الفئة:' : 'Catégorie:'}</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedPart.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'موقع التخزين:' : 'Emplacement Rayon:'}</span>
                    <span className="font-semibold text-[#C4785A]">
                      {selectedPart.locationBin}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'الكمية المتوفرة:' : 'Quantité en Stock:'}</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedPart.stockQuantity} unités
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'حد الطلب الأدنى:' : 'Seuil d’Alerte Min:'}</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      {selectedPart.minThreshold} unités
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Prix & Marges */}
            {activeTab === 'stock' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'سعر الشراء (مورد):' : 'Prix d’Achat Fournisseur:'}</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatMoney(selectedPart.buyingPriceDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'سعر البيع (ورشة):' : 'Prix de Vente Client:'}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(selectedPart.sellingPriceDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-500">{isAr ? 'الهامش الصافي للقطعة:' : 'Marge Brute Unitaire:'}</span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {formatMoney(selectedPart.sellingPriceDzd - selectedPart.buyingPriceDzd)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Valeur totale en rayon:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(selectedPart.stockQuantity * selectedPart.sellingPriceDzd)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Compatibilité */}
            {activeTab === 'mouvements' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Modèles et motorisations compatibles avec cette référence :
                </p>
                <div className="space-y-1.5">
                  {(selectedPart.compatibility && selectedPart.compatibility.length > 0) ? (
                    selectedPart.compatibility.map((c: string, i: number) => (
                      <div key={i} className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span>{c}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-400 text-center py-4">
                      Référence universelle / adaptable standard
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Consignes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  {isAr
                    ? 'تعليمات التخزين، المورد المفضل، وشروط الضمان:'
                    : 'Conditions de stockage, fournisseur référent et consignes magasinier :'}
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les détails de conditionnement, références équivalentes OE..."
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

      {/* New / Edit Part Modal */}
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
                    {partToEdit
                      ? (isAr ? 'تعديل صنف قطعة الغيار' : 'Modifier la Référence')
                      : (isAr ? 'إضافة صنف جديد للمخزن' : 'Nouvelle Référence Magasin')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'البيانات الفنية، المخزون، والأسعار' : 'Gestion du catalogue pièces et seuils d’alerte'}
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
                  placeholder="PR-1029"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الفئة' : 'Catégorie'}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'Freinage', label: 'Freinage' },
                    { value: 'Filtration', label: 'Filtration' },
                    { value: 'Suspension', label: 'Suspension' },
                    { value: 'Distribution', label: 'Distribution' },
                    { value: 'Lubrifiants', label: 'Lubrifiants' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'اسم وتعيين القطعة *' : 'Désignation de la Pièce *'}
                placeholder="Ex: Jeu 4 Plaquettes de frein avant"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية في المخزن' : 'Quantité Stock'}
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'حد الأمان الأدنى' : 'Seuil d’Alerte Min'}
                  type="number"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'سعر الشراء (دج)' : 'Prix d’Achat (DZD)'}
                  type="number"
                  value={buyingPriceDzd}
                  onChange={(e) => setBuyingPriceDzd(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'سعر البيع (دج)' : 'Prix de Vente (DZD)'}
                  type="number"
                  value={sellingPriceDzd}
                  onChange={(e) => setSellingPriceDzd(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'موقع التخزين / الرف' : 'Emplacement / Rayon'}
                  placeholder="Ex: Rayon B-04"
                  value={locationBin}
                  onChange={(e) => setLocationBin(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'التوافق' : 'Compatibilité (marques)'}
                  placeholder="Ex: Renault Clio 4, Dacia Sandero"
                  value={compatibility}
                  onChange={(e) => setCompatibility(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {partToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'تسجيل القطعة' : 'Ajouter au Stock')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
