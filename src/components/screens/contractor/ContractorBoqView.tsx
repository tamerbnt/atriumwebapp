import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  FileText,
  CheckCircle2,
  Building,
  Layers,
  X,
  Download,
  Trash2,
  Edit,
  Pin,
  Save,
  Check,
  Send,
  AlertTriangle,
  TrendingUp,
  Percent,
  Calculator,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorBoqItem } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { PriceRevisionModal } from './PriceRevisionModal';

export const ContractorBoqView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { boqItems, projects, selectedProjectId, setSelectedProjectId, addBoqItem, updateBoqItem, deleteBoqItem } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['boq_01']));
  const [sortBy, setSortBy] = useState<string>('itemCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPriceRevisionModalOpen, setIsPriceRevisionModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ContractorBoqItem | null>(null);

  // Form states inside Modal
  const [itemCode, setItemCode] = useState('05.01');
  const [designation, setDesignation] = useState('');
  const [unit, setUnit] = useState<ContractorBoqItem['unit']>('m2');
  const [plannedQty, setPlannedQty] = useState('100');
  const [unitPrice, setUnitPrice] = useState('3500');
  const [targetProjectId, setTargetProjectId] = useState(projects[0]?.id || selectedProjectId);

  // 390px Inline Side Inspector
  const [selectedItem, setSelectedItem] = useState<ContractorBoqItem | null>(() => {
    return boqItems[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'poste' | 'quantites' | 'notes'>('poste');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const openCreateModal = () => {
    setItemToEdit(null);
    setItemCode(`0${Math.floor(1 + Math.random() * 9)}.01`);
    setDesignation('');
    setUnit('m2');
    setPlannedQty('100');
    setUnitPrice('3500');
    setTargetProjectId(projects[0]?.id || selectedProjectId);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ContractorBoqItem) => {
    setItemToEdit(item);
    setItemCode(item.itemCode);
    setDesignation(item.designation);
    setUnit(item.unit);
    setPlannedQty(String(item.plannedQty));
    setUnitPrice(String(item.unitPriceDzd));
    setTargetProjectId(item.projectId);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim()) {
      showToast(isAr ? 'يرجى إدخال توصيف البند' : 'Veuillez saisir la désignation du poste', 'error');
      return;
    }

    const qty = parseFloat(plannedQty) || 0;
    const price = parseFloat(unitPrice) || 0;

    const payload: ContractorBoqItem = {
      id: itemToEdit?.id || `boq_${Date.now()}`,
      accountId: itemToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: targetProjectId,
      itemCode: itemCode.trim(),
      designation: designation.trim(),
      unit,
      plannedQty: qty,
      executedQty: itemToEdit?.executedQty || 0,
      unitPriceDzd: price,
      totalPlannedDzd: qty * price,
      totalExecutedDzd: (itemToEdit?.executedQty || 0) * price,
      createdAt: itemToEdit?.createdAt || new Date().toISOString(),
    };

    if (itemToEdit) {
      updateBoqItem(payload);
      if (selectedItem?.id === payload.id) setSelectedItem(payload);
      showToast(isAr ? 'تم تحديث بند المقايسة' : 'Poste BOQ mis à jour', 'success');
    } else {
      addBoqItem(payload);
      setSelectedItem(payload);
      showToast(isAr ? 'تمت إضافة البند إلى الكشف التقديري' : 'Poste ajouté au bordereau BOQ', 'success');
    }
    setIsModalOpen(false);
  };

  const filteredItems = useMemo(() => {
    return boqItems.filter((item) => {
      if (filterProject !== 'all' && item.projectId !== filterProject) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = item.itemCode.toLowerCase().includes(q);
        const matchesDesig = item.designation.toLowerCase().includes(q);
        if (!matchesCode && !matchesDesig) return false;
      }
      return true;
    });
  }, [boqItems, filterProject, searchQuery]);

  // KPIs
  const totalPlannedValue = filteredItems.reduce((acc, item) => acc + item.totalPlannedDzd, 0);
  const totalExecutedValue = filteredItems.reduce((acc, item) => acc + item.totalExecutedDzd, 0);
  const executionRatio = totalPlannedValue > 0 ? Math.round((totalExecutedValue / totalPlannedValue) * 100) : 0;

  // Actions
  const handlePin = (item: ContractorBoqItem) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    showToast(
      pinnedIds.has(item.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Poste désépinglé')
        : (isAr ? 'تم تثبيت البند' : 'Poste épinglé'),
      'info'
    );
  };

  const handleDelete = (item: ContractorBoqItem) => {
    deleteBoqItem(item.id);
    if (selectedItem?.id === item.id) setSelectedItem(null);
    showToast(isAr ? 'تم حذف بند المقايسة' : 'Poste BOQ supprimé', 'success');
  };

  const handleAdvanceExecution = (item: ContractorBoqItem) => {
    const additional = Math.max(1, Math.round(item.plannedQty * 0.1));
    const nextExecuted = Math.min(item.plannedQty, item.executedQty + additional);
    const updated: ContractorBoqItem = {
      ...item,
      executedQty: nextExecuted,
      totalExecutedDzd: nextExecuted * item.unitPriceDzd,
    };
    updateBoqItem(updated);
    if (selectedItem?.id === item.id) setSelectedItem(updated);
    showToast(
      isAr
        ? `تم قيد كمية منفذة جديدة: ${nextExecuted} ${item.unit}`
        : `Métré exécuté actualisé : ${nextExecuted} ${item.unit}`,
      'success'
    );
  };

  const handleExportCsv = () => {
    const headers = ['Code Article', 'Désignation', 'Unité', 'Quantité Prévue', 'Quantité Exécutée', 'Prix Unitaire DZD', 'Total Prévu DZD', 'Total Exécuté DZD'];
    const rows = filteredItems.map((item) => [
      item.itemCode,
      `"${item.designation.replace(/"/g, '""')}"`,
      item.unit,
      item.plannedQty,
      item.executedQty,
      item.unitPriceDzd,
      item.totalPlannedDzd,
      item.totalExecutedDzd,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bordereau_boq_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف BOQ CSV' : 'Export CSV du bordereau généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedItem) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات البند' : 'Notes de métré enregistrées', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<ContractorBoqItem>[] = [
    {
      id: 'itemCode',
      header: isAr ? 'كود البند' : 'N° Poste',
      accessorKey: 'itemCode',
      sortable: true,
      minWidth: '110px',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <ClipboardList size={16} />
          </div>
          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            {item.itemCode}
            {pinnedIds.has(item.id) && (
              <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'designation',
      header: isAr ? 'توصيف الأشغال' : 'Désignation des Travaux',
      accessorKey: 'designation',
      sortable: true,
      minWidth: '240px',
      cell: (item) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-2">
            {item.designation}
          </div>
          <div className="text-[10px] text-neutral-400">
            Unité: {item.unit} • PU: {formatMoney(item.unitPriceDzd)}
          </div>
        </div>
      ),
    },
    {
      id: 'quantities',
      header: isAr ? 'الكمية المنفذة' : 'Avancement Quantitatif',
      accessorKey: 'executedQty',
      sortable: true,
      minWidth: '150px',
      cell: (item) => {
        const pct = item.plannedQty > 0 ? Math.round((item.executedQty / item.plannedQty) * 100) : 0;
        const isOverrun = item.executedQty > item.plannedQty;
        return (
          <div className="space-y-1 w-full max-w-[140px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-neutral-900 dark:text-white">
                {item.executedQty} / {item.plannedQty} {item.unit}
              </span>
              <span className={`font-mono text-[10px] font-bold ${isOverrun ? 'text-rose-600 dark:text-rose-400' : 'text-[#C4785A]'}`}>
                {pct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isOverrun ? 'bg-rose-500' : 'bg-[#C4785A]'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            {isOverrun && (
              <div className="flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 py-0.5 rounded w-fit">
                <AlertTriangle size={10} className="shrink-0" />
                <span>+{pct - 100}% Dépassement</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'totalPlanned',
      header: isAr ? 'المبلغ التقديري' : 'Montant Prévu',
      accessorKey: 'totalPlannedDzd',
      sortable: true,
      minWidth: '130px',
      cell: (item) => (
        <div>
          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
            {formatMoney(item.totalPlannedDzd)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
            Exécuté: {formatMoney(item.totalExecutedDzd)}
          </div>
        </div>
      ),
    },
  ];

  const projectFilterOptions = [
    { value: 'all', label: isAr ? 'جميع المشاريع' : 'Tous les chantiers' },
    ...projects.map((p) => ({ value: p.id, label: p.projectCode })),
  ];

  const selectedProject = projects.find((p) => p.id === (filterProject !== 'all' ? filterProject : selectedProjectId)) || projects[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الكشف الكمي والتقديري (BOQ / BPU)' : 'Bordereau Quantitatif & Estimatif (BOQ)'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {filteredItems.length} postes
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'جداول الأسعار الأحادية، قياس الكميات المنجزة ومطابقة الكشوفات'
                : 'Métrés contradictoires, décomptes provisoires et suivi budgétaire par poste'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="secondary"
            size="sm"
            onClick={() => setIsPriceRevisionModalOpen(true)}
            icon={<Calculator size={14} />}
          >
            {isAr ? 'مراجعة الأسعار (CCAG)' : 'Révision Prix CCAG'}
          </AtriumButton>
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
            {isAr ? 'إضافة بند' : 'Nouveau Poste'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'التقييم المالي والإنجاز الكمي للمشروع' : 'Suivi Budgétaire & Avancement Métré'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'مقارنة المبالغ التقديرية بالكميات الميدانية المحققة' : 'Comparatif prévisionnel vs situation d’attachement'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Prévu */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'القيمة الإجمالية المقدرة' : 'Montant Prévu (BPU)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {formatMoney(totalPlannedValue)}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {filteredItems.length} {isAr ? 'بند مقايسة' : 'postes au bordereau'}
              </p>
            </div>
          </div>

          {/* Card 2: Exécuté */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الأشغال المنفذة فعلياً' : 'Montant Réalisé (Attachement)'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {formatMoney(totalExecutedValue)}
              </div>
              <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">
                {executionRatio}% {isAr ? 'نسبة الاستهلاك المالي' : 'consommation globale'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'المتبقي للإنجاز' : 'Reste à Exécuter'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Solde Marché
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(Math.max(0, totalPlannedValue - totalExecutedValue))}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'مطابق لدفتر الشروط' : 'Contrôlé au métré'}
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
              {isAr ? 'قائمة بنود المقايسة والتسعير التعاقدي' : 'Nomenclature des Postes & Relevés Métrés'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'تتبع الكميات المنفذة والأسعار الأحادية التعاقدية' : 'Bordereau quantitatif avec suivi d’avancement physique et financier'}
            </p>
          </div>

          {/* Authentic BTP Execution Filter Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'all', label: isAr ? 'جميع البنود' : 'Tous les postes' },
              { id: 'terrassement', label: isAr ? 'أعمال الحفر' : 'Terrassement' },
              { id: 'gros_oeuvre', label: isAr ? 'الهيكل الخرساني' : 'Gros Œuvre' },
              { id: 'second_oeuvre', label: isAr ? 'التشطيبات' : 'Second Œuvre' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterProject('all')}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: filterProject === 'all' && f.id === 'all' ? '#FCEEE8' : 'transparent',
                  color: filterProject === 'all' && f.id === 'all' ? 'var(--color-accent)' : '#71717A',
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
            <UniversalDataCollection<ContractorBoqItem>
            data={filteredItems}
            columns={columns}
            keyExtractor={(item) => item.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم البند أو التوصيف...' : 'Rechercher par code poste, désignation...'}
            filterValue={filterProject}
            onFilterChange={setFilterProject}
            filterOptions={projectFilterOptions}
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
            onItemClick={(item) => {
              setSelectedItem(item);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<ClipboardList size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد بنود' : 'Aucun poste BOQ trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun article ne correspond à votre recherche')
                : (isAr ? 'قم بإضافة أول بند إلى المقايسة' : 'Créez votre premier poste au bordereau')
            }
            customActions={[
              {
                id: 'advance',
                label: isAr ? 'قيد إنجاز (+10%)' : 'Métré (+10%)',
                icon: <TrendingUp size={14} />,
                onClick: handleAdvanceExecution,
              },
            ]}
            renderGridCard={(item) => {
              const pct = item.plannedQty > 0 ? Math.round((item.executedQty / item.plannedQty) * 100) : 0;
              const isOverrun = item.executedQty > item.plannedQty;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {item.itemCode}
                    </span>
                    <span className={`font-mono text-xs font-bold ${isOverrun ? 'text-rose-600 dark:text-rose-400' : 'text-[#C4785A]'}`}>
                      {pct}% réalisé
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-2">
                      {item.designation}
                    </h3>
                    <div className="text-xs text-neutral-500 font-medium mt-0.5">
                      {item.executedQty} / {item.plannedQty} {item.unit}
                    </div>
                    {isOverrun && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded w-fit">
                        <AlertTriangle size={10} className="shrink-0" />
                        <span>Dépassement (+{pct - 100}%) · Avenant obligatoire</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Prix Unitaire</div>
                      <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                        {formatMoney(item.unitPriceDzd)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Montant Exécuté</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatMoney(item.totalExecutedDzd)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedItem && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      Poste {selectedItem.itemCode}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedItem.designation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleAdvanceExecution(selectedItem)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <TrendingUp size={12} />
                {isAr ? 'قيد إنجاز (+10%)' : '+10% Avancement'}
              </button>
              <button
                onClick={() => openEditModal(selectedItem)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedItem)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('poste')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'poste'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'البند' : 'Fiche Poste'}
              </button>
              <button
                onClick={() => setActiveTab('quantites')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'quantites'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الكميات والمبالغ' : 'Métrés & Devis'}
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
            {activeTab === 'poste' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Numéro d'article:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedItem.itemCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Unité de mesure:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedItem.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Prix unitaire bordereau:</span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {formatMoney(selectedItem.unitPriceDzd)}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-1">
                  <span className="text-neutral-500 block">Désignation complète :</span>
                  <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                    {selectedItem.designation}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Métrés & Devis */}
            {activeTab === 'quantites' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Quantité prévue:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedItem.plannedQty} {selectedItem.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Quantité constatée (exécutée):</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedItem.executedQty} {selectedItem.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Montant total prévu:</span>
                    <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatMoney(selectedItem.totalPlannedDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Montant exécuté validé:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(selectedItem.totalExecutedDzd)}
                    </span>
                  </div>
                </div>

                {selectedItem.executedQty > selectedItem.plannedQty && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                      <span>Dépassement de Quantité (+{Math.round(((selectedItem.executedQty - selectedItem.plannedQty) / selectedItem.plannedQty) * 100)}%)</span>
                    </div>
                    <p className="text-[10px] leading-tight text-rose-700 dark:text-rose-300">
                      Conformément au Décret 15-247 (Art. 136), tout volume supérieur à la prévision contractuelle requiert un Avenant validé en Commission des Marchés avant mandatement.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Consignes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  Observations de métré, réserves contradictoires et bordereaux d'attachement :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les relevés géomètre, tolérances d'épaisseur, validation maître d'œuvre..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                >
                  {noteSaved ? (
                    <>
                      <Check size={14} />
                      {isAr ? 'تم الحفظ' : 'Observations enregistrées'}
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

      {/* New / Edit BOQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {itemToEdit
                      ? (isAr ? 'تعديل بند المقايسة' : 'Modifier le Poste BOQ')
                      : (isAr ? 'إضافة بند إلى الكشف التقديري' : 'Nouveau Poste au Bordereau BOQ')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'تعريف وحدات العمل والأسعار الأحادية' : 'Définition du poste, prix unitaire et quantités contractuelles'}
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
                  label={isAr ? 'رقم / كود البند *' : 'Code Poste / Article *'}
                  placeholder="01.01"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الوحدة' : 'Unité de Mesure'}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ContractorBoqItem['unit'])}
                  options={[
                    { value: 'm3', label: 'm³ (Mètre cube)' },
                    { value: 'm2', label: 'm² (Mètre carré)' },
                    { value: 'ml', label: 'ml (Mètre linéaire)' },
                    { value: 'kg', label: 'kg (Kilogramme)' },
                    { value: 'ton', label: 'Tonne' },
                    { value: 'u', label: 'Unité / Forfait' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'توصيف الأشغال والمواد *' : 'Désignation des Travaux *'}
                placeholder="Ex: Béton armé dosé à 350 kg/m3 pour semelles"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية التعاقدية المخططة' : 'Quantité Prévue'}
                  type="number"
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'السعر الأحادي (دج)' : 'Prix Unitaire (DZD)'}
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {itemToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'إضافة البند' : 'Ajouter au Bordereau')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official CCAG Price Revision Modal */}
      {selectedProject && (
        <PriceRevisionModal
          isOpen={isPriceRevisionModalOpen}
          onClose={() => setIsPriceRevisionModalOpen(false)}
          project={selectedProject}
        />
      )}
    </div>
  );
};
