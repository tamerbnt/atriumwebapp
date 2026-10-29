import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Clock,
  Boxes,
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
  Play,
  Hammer,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { ManufacturingBom } from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const ManufacturingBomView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { boms, addBom, updateBom, deleteBom } = useManufacturingData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['bom_01']));
  const [sortBy, setSortBy] = useState<string>('bomCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bomToEdit, setBomToEdit] = useState<ManufacturingBom | null>(null);

  // Form states inside Modal
  const [bomCode, setBomCode] = useState('');
  const [productName, setProductName] = useState('');
  const [batchYield, setBatchYield] = useState('1');
  const [unit, setUnit] = useState('Unité');
  const [laborHours, setLaborHours] = useState('10');
  const [estimatedCost, setEstimatedCost] = useState('80000');

  // 390px Inline Side Inspector
  const [selectedBom, setSelectedBom] = useState<ManufacturingBom | null>(() => {
    return boms[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'fiche' | 'composants' | 'costs' | 'notes'>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const openCreateModal = () => {
    setBomToEdit(null);
    setBomCode(`BOM-PRD-${Math.floor(10 + Math.random() * 90)}`);
    setProductName('');
    setBatchYield('1');
    setUnit('Unité');
    setLaborHours('10');
    setEstimatedCost('80000');
    setIsModalOpen(true);
  };

  const openEditModal = (b: ManufacturingBom) => {
    setBomToEdit(b);
    setBomCode(b.bomCode);
    setProductName(b.finishedProductName);
    setBatchYield(String(b.batchYield));
    setUnit(b.unit);
    setLaborHours(String(b.standardLaborHours));
    setEstimatedCost(String(b.estimatedCostDzd));
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomCode.trim() || !productName.trim()) {
      showToast(isAr ? 'يرجى إدخال رمز التركيبة واسم المنتج' : 'Veuillez saisir le code BOM et nom produit', 'error');
      return;
    }

    const payload: ManufacturingBom = {
      id: bomToEdit?.id || `bom_${Date.now()}`,
      accountId: bomToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_manufacturing',
      branchId: currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      finishedProductId: bomToEdit?.finishedProductId || `prod_${Date.now()}`,
      finishedProductName: productName.trim(),
      bomCode: bomCode.trim(),
      batchYield: parseInt(batchYield, 10) || 1,
      unit: unit.trim(),
      standardLaborHours: parseFloat(laborHours) || 1,
      components: bomToEdit?.components || [
        { rawProductId: 'raw_01', rawProductName: 'Matière Principale Standard', quantity: 1, unit: 'u', unitCostDzd: 40000 },
      ],
      estimatedCostDzd: parseFloat(estimatedCost) || 50000,
      isActive: true,
      createdAt: bomToEdit?.createdAt || new Date().toISOString(),
    };

    if (bomToEdit) {
      updateBom(payload);
      if (selectedBom?.id === payload.id) setSelectedBom(payload);
      showToast(isAr ? 'تم تحديث جدول المكونات BOM' : 'Nomenclature mise à jour avec succès', 'success');
    } else {
      addBom(payload);
      setSelectedBom(payload);
      showToast(isAr ? 'تم إنشاء جدول مكونات جديد' : 'Nouvelle nomenclature BOM créée', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredBoms = useMemo(() => {
    return boms.filter((b) => {
      if (filterActive === 'Active' && !b.isActive) return false;
      if (filterActive === 'Inactive' && b.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = b.bomCode.toLowerCase().includes(q);
        const matchesProduct = b.finishedProductName.toLowerCase().includes(q);
        if (!matchesCode && !matchesProduct) return false;
      }
      return true;
    });
  }, [boms, filterActive, searchQuery]);

  // KPIs
  const totalComponents = boms.reduce((acc, b) => acc + (b.components?.length || 0), 0);
  const avgCost = boms.length > 0 ? boms.reduce((acc, b) => acc + b.estimatedCostDzd, 0) / boms.length : 0;
  const totalHours = boms.reduce((acc, b) => acc + (b.standardLaborHours || 0), 0);

  // Actions
  const handlePin = (b: ManufacturingBom) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(b.id)) next.delete(b.id);
      else next.add(b.id);
      return next;
    });
    showToast(
      pinnedIds.has(b.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'BOM désépinglée')
        : (isAr ? 'تم تثبيت التركيبة' : 'BOM épinglée'),
      'info'
    );
  };

  const handleDelete = (b: ManufacturingBom) => {
    deleteBom(b.id);
    if (selectedBom?.id === b.id) {
      setSelectedBom(null);
    }
    showToast(isAr ? 'تم حذف جدول المكونات' : 'Nomenclature supprimée', 'success');
  };

  const handleToggleActive = (b: ManufacturingBom) => {
    const updated: ManufacturingBom = {
      ...b,
      isActive: !b.isActive,
    };
    updateBom(updated);
    if (selectedBom?.id === b.id) setSelectedBom(updated);
    showToast(
      updated.isActive
        ? (isAr ? 'تم تفعيل جدول المكونات' : 'BOM activée pour les OF')
        : (isAr ? 'تم إيقاف تفعيل التركيبة' : 'BOM désactivée'),
      'info'
    );
  };

  const handleExportCsv = () => {
    const headers = ['Code BOM', 'Produit Fini', 'Rendement Lot', 'Unité', 'Heures MO', 'Coût Estimé DZD', 'Statut Actif'];
    const rows = filteredBoms.map((b) => [
      b.bomCode,
      `"${b.finishedProductName.replace(/"/g, '""')}"`,
      b.batchYield,
      b.unit,
      b.standardLaborHours,
      b.estimatedCostDzd,
      b.isActive ? 'Actif' : 'Inactif',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nomenclatures_bom_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف BOM CSV' : 'Export CSV des BOM généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedBom) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ التوجيهات الهندسية' : 'Consignes opératoires enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<ManufacturingBom>[] = [
    {
      id: 'bomCode',
      header: isAr ? 'رمز التركيبة' : 'Code BOM',
      accessorKey: 'bomCode',
      sortable: true,
      minWidth: '130px',
      cell: (b) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {b.bomCode}
              {pinnedIds.has(b.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              Rendement: {b.batchYield} {b.unit}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'finishedProduct',
      header: isAr ? 'المنتج النهائي' : 'Produit Fini Fabriqué',
      accessorKey: 'finishedProductName',
      sortable: true,
      minWidth: '220px',
      cell: (b) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {b.finishedProductName}
          </div>
          <div className="text-[11px] text-neutral-500">
            {b.components?.length || 0} composants intégrés
          </div>
        </div>
      ),
    },
    {
      id: 'laborHours',
      header: isAr ? 'ساعات العمل' : 'Temps Gamme',
      accessorKey: 'standardLaborHours',
      sortable: true,
      minWidth: '120px',
      cell: (b) => (
        <div className="flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
          <Clock size={13} className="text-[#C4785A] shrink-0" />
          <span className="font-mono font-bold">{b.standardLaborHours} h</span>
        </div>
      ),
    },
    {
      id: 'estimatedCost',
      header: isAr ? 'التكلفة المعيارية' : 'Coût Standard DZD',
      accessorKey: 'estimatedCostDzd',
      sortable: true,
      minWidth: '140px',
      cell: (b) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {formatMoney(b.estimatedCostDzd)}
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الحالة' : 'Statut',
      accessorKey: 'isActive',
      sortable: true,
      minWidth: '110px',
      cell: (b) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            b.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
          }`}
        >
          {b.isActive ? 'Active' : 'Inactif'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'جداول المكونات والنومكلاتور (BOM)' : 'Nomenclatures Produits (Bill of Materials)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {boms.length} BOM
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تعريف المواد الأولية، تكاليف المكونات، وساعات اليد العاملة المعيارية'
                : 'Structure des produits finis, décomposition matière & temps de gamme opératoire'}
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
            {isAr ? 'تركيبة جديدة' : 'Nouvelle BOM'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'هندسة المنتجات والمكونات المعيارية' : 'Ingénierie Produits & Standard de Coût'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة الوصفات التصنيعية، المواد المستهلكة ومتوسط التكلفة للوحدة'
              : 'Formules de fabrication actives, matières premières mobilisées et coût moyen'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Nomenclatures Actives */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'جداول المكونات المعتمدة' : 'BOM Produits Définies'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {boms.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                100% {isAr ? 'جاهزة لإطلاق OF' : 'prêtes pour production'}
              </p>
            </div>
          </div>

          {/* Card 2: Composants référencés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي المكونات والمواد' : 'Composants Intégrés'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {totalComponents}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'مواد أولية وقطع وسيطة' : 'Matières premières & sous-ensembles'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'متوسط تكلفة التصنيع' : 'Coût Moyen Estimé'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Prix Revient
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(avgCost)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {totalHours} {isAr ? 'ساعات عمل تراكمية' : 'heures gamme standard'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'قوائم المكونات الصناعية والتركيبات (BOM)' : 'Nomenclatures Produits & Formules BOM'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'تفكيك المواد، كميات الاستهلاك المعيارية، وساعات العمل الصناعية' : 'Structures multi-niveaux, coûts de revient standard et temps gamme atelier'}
            </p>
          </div>

          {/* Authentic Manufacturing BOM Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'All', label: isAr ? 'جميع التركيبات' : 'Toutes BOM' },
              { id: 'Active', label: isAr ? 'سارية بالإنتاج' : 'Actives série' },
              { id: 'Inactive', label: isAr ? 'غير نشطة' : 'Inactives' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterActive(f.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: filterActive === f.id ? '#FCEEE8' : 'transparent',
                  color: filterActive === f.id ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
        <div className="flex items-start gap-4">
          {/* Main Collection Container */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<ManufacturingBom>
            data={filteredBoms}
            columns={columns}
            keyExtractor={(b) => b.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برمز BOM أو اسم المنتج...' : 'Rechercher par code BOM, produit fini...'}
            filterValue={filterActive}
            onFilterChange={setFilterActive}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع التركيبات' : 'Toutes les nomenclatures' },
              { value: 'Active', label: 'Actives' },
              { value: 'Inactive', label: 'Inactives' },
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
            onItemClick={(b) => {
              setSelectedBom(b);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<Layers size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد جداول مكونات' : 'Aucune nomenclature trouvée'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucune nomenclature ne correspond à votre recherche')
                : (isAr ? 'قم بإنشاء أول جدول مكونات لمنتجاتك' : 'Créez votre première BOM produit')
            }
            customActions={[
              {
                id: 'toggleActive',
                label: isAr ? 'تبديل الحالة' : 'Activer / Suspendre',
                icon: <ShieldCheck size={14} />,
                onClick: handleToggleActive,
              },
            ]}
            renderGridCard={(b) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                    {b.bomCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}
                  >
                    {b.isActive ? 'Active' : 'Inactif'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {b.finishedProductName}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5">
                    {b.components?.length || 0} matières & pièces associées
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Coût Estimé</div>
                    <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                      {formatMoney(b.estimatedCostDzd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Gamme MO</div>
                    <div className="font-mono font-semibold text-neutral-700 dark:text-neutral-300 mt-0.5">
                      {b.standardLaborHours}h
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedBom && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Layers size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedBom.bomCode}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedBom.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {selectedBom.isActive ? 'Active' : 'Inactif'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedBom.finishedProductName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBom(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleToggleActive(selectedBom)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <ShieldCheck size={12} />
                {selectedBom.isActive ? 'Désactiver' : 'Activer'}
              </button>
              <button
                onClick={() => openEditModal(selectedBom)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedBom)}
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
                {isAr ? 'البطاقة' : 'Fiche BOM'}
              </button>
              <button
                onClick={() => setActiveTab('composants')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'composants'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المكونات' : 'Composants'}
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded-full">
                  {selectedBom.components?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('costs')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'costs'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'التكلفة' : 'Coûts'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'التعليمات' : 'Consignes'}
              </button>
            </div>

            {/* Tab 1: Fiche */}
            {activeTab === 'fiche' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Code Formule:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedBom.bomCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Produit Cible:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[190px]">
                      {selectedBom.finishedProductName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Rendement de lot:</span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {selectedBom.batchYield} {selectedBom.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Gamme Opératoire:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedBom.standardLaborHours} heures MO
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Coût Standard Unitaire:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(selectedBom.estimatedCostDzd)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Composants */}
            {activeTab === 'composants' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150 max-h-[360px] overflow-y-auto pr-1">
                {(selectedBom.components || []).map((c, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-900 dark:text-white text-[11px]">
                        {c.rawProductName}
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(c.quantity * c.unitCostDzd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span>Dose: {c.quantity} {c.unit}</span>
                      <span>PU: {formatMoney(c.unitCostDzd)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Costs */}
            {activeTab === 'costs' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Matières Premières:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney((selectedBom.components || []).reduce((acc, c) => acc + c.quantity * c.unitCostDzd, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Main d'oeuvre estimée:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {formatMoney(selectedBom.standardLaborHours * 1500)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Consignes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Directives techniques d'usinage, tolérances et normes d'assemblage :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les étapes opératoires, réglages de coupe, temps de séchage..."
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
      </div>

      {/* New / Edit BOM Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {bomToEdit
                      ? (isAr ? 'تعديل جدول المكونات (BOM)' : 'Modifier la Nomenclature')
                      : (isAr ? 'إنشاء جدول مكونات جديد (BOM)' : 'Nouvelle Nomenclature Produit')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'تحديد مواصفات تصنيع المنتجات والمواد' : 'Définition de la recette de fabrication et standard de coût'}
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
                  label={isAr ? 'رمز التركيبة *' : 'Code BOM *'}
                  placeholder="BOM-TAB-01"
                  value={bomCode}
                  onChange={(e) => setBomCode(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'وحدة الإنتاج' : 'Unité de lot'}
                  placeholder="Unité, Lot de 10..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>

              <LabelInput
                label={isAr ? 'اسم المنتج النهائي المصنّع *' : 'Produit Fini Fabriqué *'}
                placeholder="Ex: Table Réunion Chêne Massif 3.2m"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />

              <div className="grid grid-cols-3 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية المنتجة' : 'Rendement Lot'}
                  type="number"
                  value={batchYield}
                  onChange={(e) => setBatchYield(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'ساعات العمل' : 'Heures MO'}
                  type="number"
                  value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'التكلفة المعيارية' : 'Coût Total DZD'}
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {bomToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'إنشاء التركيبة' : 'Créer la BOM')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
