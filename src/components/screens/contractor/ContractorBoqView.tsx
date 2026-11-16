import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ClipboardList,
  X,
  Edit,
  Pin,
  Save,
  Check,
  AlertTriangle,
  TrendingUp,
  Calculator,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useContractorData } from './contractorData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { ContractorBoqItem } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { PriceRevisionModal } from './PriceRevisionModal';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (v: unknown): string =>
  typeof v === 'string'
    ? v
    : typeof v === 'number'
    ? String(v)
    : (v as { target?: { value?: string } })?.target?.value ?? '';

export const ContractorBoqView: React.FC<any> = () => {
  const {
    language,
    currentBusiness,
    currentBranch,
    branches,
    currentUser,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { boqItems, projects, selectedProjectId, addBoqItem, updateBoqItem, deleteBoqItem } =
    useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [executionFilter, setExecutionFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['boq_01']));
  const [sortBy, setSortBy] = useState<string>('itemCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPriceRevisionModalOpen, setIsPriceRevisionModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ContractorBoqItem | null>(null);

  const [itemCode, setItemCode] = useState('05.01');
  const [designation, setDesignation] = useState('');
  const [unit, setUnit] = useState<ContractorBoqItem['unit']>('m2');
  const [plannedQty, setPlannedQty] = useState('100');
  const [unitPrice, setUnitPrice] = useState('3500');
  const [targetProjectId, setTargetProjectId] = useState(projects[0]?.id || selectedProjectId);

  const [selectedItem, setSelectedItem] = useState<ContractorBoqItem | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('poste');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeItem = useMemo(() => {
    if (!selectedItem) return null;
    return boqItems.find((b) => b.id === selectedItem.id) || selectedItem;
  }, [selectedItem, boqItems]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    boqItems.forEach((b) => {
      const br = resolveRecordBranch(b, branchesById, currentBranch, language);
      const key = br.id || br.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [boqItems, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: boqItems.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || boqItems.length,
      });
    }
    return opts;
  }, [branches, branchCounts, currentBranch, boqItems.length, isAr, isEn]);

  const openCreateModal = useCallback(() => {
    setItemToEdit(null);
    setItemCode(`0${Math.floor(1 + Math.random() * 9)}.01`);
    setDesignation('');
    setUnit('m2');
    setPlannedQty('100');
    setUnitPrice('3500');
    setTargetProjectId(projects[0]?.id || selectedProjectId);
    setIsModalOpen(true);
  }, [projects, selectedProjectId]);

  const openEditModal = useCallback((item: ContractorBoqItem) => {
    setItemToEdit(item);
    setItemCode(item.itemCode);
    setDesignation(item.designation);
    setUnit(item.unit);
    setPlannedQty(String(item.plannedQty));
    setUnitPrice(String(item.unitPriceDzd));
    setTargetProjectId(item.projectId);
    setIsModalOpen(true);
  }, []);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim()) {
      showToast(
        isAr ? 'يرجى إدخال توصيف البند' : 'Veuillez saisir la désignation du poste',
        'error'
      );
      return;
    }
    const qty = parseFloat(plannedQty) || 0;
    const price = parseFloat(unitPrice) || 0;
    const payload: ContractorBoqItem = {
      id: itemToEdit?.id || `boq_${Date.now()}`,
      accountId: itemToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: itemToEdit?.branchId || currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
      projectId: targetProjectId || projects[0]?.id || '',
      lotCode: itemToEdit?.lotCode || 'LOT_01_GROS_OEUVRE',
      lotTitle: itemToEdit?.lotTitle || 'Travaux Principaux',
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
      showToast(
        isAr ? 'تمت إضافة البند إلى الكشف التقديري' : 'Poste ajouté au bordereau BOQ',
        'success'
      );
    }
    setIsModalOpen(false);
  };

  const completedCount = useMemo(
    () => boqItems.filter((i) => i.executedQty >= i.plannedQty && i.plannedQty > 0).length,
    [boqItems]
  );
  const inProgressCount = useMemo(
    () => boqItems.filter((i) => i.executedQty < i.plannedQty || i.plannedQty === 0).length,
    [boqItems]
  );

  const filteredItems = useMemo(() => {
    return boqItems.filter((item) => {
      if (filterProject !== 'all' && item.projectId !== filterProject) return false;
      if (executionFilter === 'Completed' && item.executedQty < item.plannedQty) return false;
      if (executionFilter === 'Pending' && item.executedQty >= item.plannedQty) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(item, branchesById, currentBranch, language);
        if (b.id !== branchFilter && b.name !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = item.itemCode.toLowerCase().includes(q);
        const matchesDesig = item.designation.toLowerCase().includes(q);
        if (!matchesCode && !matchesDesig) return false;
      }
      return true;
    });
  }, [
    boqItems,
    filterProject,
    executionFilter,
    branchFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'itemCode') {
        const cmp = a.itemCode.localeCompare(b.itemCode);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'designation') {
        const cmp = a.designation.localeCompare(b.designation);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'quantities') {
        const cmp = (a.executedQty || 0) - (b.executedQty || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'totalPlanned') {
        const cmp = (a.totalPlannedDzd || 0) - (b.totalPlannedDzd || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredItems, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const totalPlannedValue = useMemo(
    () => filteredItems.reduce((acc, item) => acc + item.totalPlannedDzd, 0),
    [filteredItems]
  );
  const totalExecutedValue = useMemo(
    () => filteredItems.reduce((acc, item) => acc + item.totalExecutedDzd, 0),
    [filteredItems]
  );

  const handleTogglePin = useCallback(
    (item: ContractorBoqItem) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const wasPinned = next.has(item.id);
        if (wasPinned) next.delete(item.id);
        else next.add(item.id);
        showToast(
          wasPinned
            ? isAr ? 'تم إلغاء التثبيت' : 'Poste désépinglé'
            : isAr ? 'تم تثبيت البند' : 'Poste épinglé',
          'info'
        );
        return next;
      });
    },
    [isAr]
  );

  const handleDelete = useCallback(
    (item: ContractorBoqItem) => {
      deleteBoqItem(item.id);
      if (selectedItem?.id === item.id) setSelectedItem(null);
      showToast(isAr ? 'تم حذف بند المقايسة' : 'Poste BOQ supprimé', 'success');
    },
    [deleteBoqItem, selectedItem, isAr]
  );

  const handleAdvanceExecution = useCallback(
    (item: ContractorBoqItem) => {
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
    },
    [updateBoqItem, selectedItem, isAr]
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      'Code Article',
      'Désignation',
      'Agence / Direction',
      'Unité',
      'Quantité Prévue',
      'Quantité Exécutée',
      'Prix Unitaire DZD',
      'Total Prévu DZD',
      'Total Exécuté DZD',
    ];
    const rows = sortedItems.map((item) => {
      const b = resolveRecordBranch(item, branchesById, currentBranch, language);
      return [
        item.itemCode,
        item.designation,
        b.name,
        item.unit,
        item.plannedQty,
        item.executedQty,
        item.unitPriceDzd,
        item.totalPlannedDzd,
        item.totalExecutedDzd,
      ];
    });
    downloadCsvSafe(
      `bordereau_boq_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير ملف BOQ CSV' : 'Export CSV du bordereau généré', 'info');
  }, [sortedItems, branchesById, currentBranch, language, isAr]);

  const handleSaveNotes = useCallback(() => {
    if (!activeItem) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات البند' : 'Notes de métré enregistrées', 'success');
  }, [activeItem, isAr]);

  const handleSelectItem = useCallback(
    (item: ContractorBoqItem, originEl?: HTMLElement | null) => {
      if (originEl) setDrawerOpenerEl(originEl);
      setSelectedItem(item);
      setActiveTab('poste');
      setNoteSaved(false);
    },
    []
  );

  const selectedProject =
    projects.find((p) => p.id === (filterProject !== 'all' ? filterProject : selectedProjectId)) ||
    projects[0];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterProject !== 'all') count += 1;
    if (executionFilter !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [filterProject, executionFilter, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterProject !== 'all') {
      const proj = projects.find((p) => p.id === filterProject);
      chips.push({
        key: 'project',
        label: proj?.projectCode || filterProject,
        onRemove: () => setFilterProject('all'),
      });
    }
    if (executionFilter !== 'All') {
      chips.push({
        key: 'execution',
        label: executionFilter === 'Completed' ? '100% Exécuté' : 'En Cours',
        onRemove: () => setExecutionFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const opt = branchOptions.find((o) => o.value === branchFilter);
      chips.push({
        key: 'branch',
        label: opt?.label || branchFilter,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [filterProject, executionFilter, branchFilter, projects, branchOptions]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterProject('all');
    setExecutionFilter('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'project',
        kind: 'tiles',
        label: isAr ? 'المشروع / الورشة' : isEn ? 'Project' : 'Chantier',
        value: filterProject,
        onChange: setFilterProject,
        options: [
          { value: 'all', label: isAr ? 'جميع المشاريع' : 'Tous les chantiers', count: boqItems.length },
          ...projects.map((p) => ({
            value: p.id,
            label: p.projectCode,
            count: boqItems.filter((b) => b.projectId === p.id).length,
          })),
        ],
      },
      {
        id: 'execution',
        kind: 'segmented',
        label: isAr ? 'تقدم التنفيذ' : isEn ? 'Execution Progress' : 'Avancement Métré',
        value: executionFilter,
        onChange: setExecutionFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: boqItems.length },
          { value: 'Pending', label: isAr ? 'جاري التنفيذ' : 'En Cours', count: inProgressCount },
          { value: 'Completed', label: isAr ? 'مكتمل 100%' : 'Achevés (100%)', count: completedCount },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'الفرع / المديرية' : isEn ? 'Branch' : 'Agence / Direction',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [
      isAr,
      isEn,
      filterProject,
      executionFilter,
      branchFilter,
      boqItems,
      projects,
      inProgressCount,
      completedCount,
      branchOptions,
    ]
  );

  const columns: ColumnDefinition<ContractorBoqItem>[] = useMemo(
    () => [
      {
        key: 'itemCode',
        header: isAr ? 'كود البند' : 'N° Poste',
        width: '1.2*',
        sortable: true,
        renderCell: (item) => (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              <ClipboardList size={16} />
            </div>
            <div className="font-mono font-bold text-xs text-black dark:text-white flex items-center gap-1.5">
              {item.itemCode}
              {pinnedIds.has(item.id) && <Pin size={10} className="fill-[#d4522f] text-[#d4522f]" />}
            </div>
          </div>
        ),
      },
      {
        key: 'designation',
        header: isAr ? 'توصيف الأشغال' : 'Désignation des Travaux',
        width: '2.6*',
        sortable: true,
        renderCell: (item) => (
          <div className="min-w-0">
            <div className="font-semibold text-xs text-black dark:text-white line-clamp-2">
              {item.designation}
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55">
              Unité: {item.unit} • PU: {formatMoney(item.unitPriceDzd, language)}
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
        width: '1.3*',
        sortable: true,
        renderCell: (item) => {
          const b = resolveRecordBranch(item, branchesById, currentBranch, language);
          return (
            <div className="flex items-center gap-1 text-xs text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'quantities',
        header: isAr ? 'الكمية المنفذة' : 'Avancement Quantitatif',
        width: '1.6*',
        sortable: true,
        renderCell: (item) => {
          const pct = item.plannedQty > 0 ? Math.round((item.executedQty / item.plannedQty) * 100) : 0;
          const isOverrun = item.executedQty > item.plannedQty;
          return (
            <div className="space-y-1 w-full max-w-[140px]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-black dark:text-white">
                  {item.executedQty} / {item.plannedQty} {item.unit}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    isOverrun ? 'text-rose-600 dark:text-rose-400' : 'text-[#d4522f]'
                  }`}
                >
                  {pct}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverrun ? 'bg-rose-500' : 'bg-[#d4522f]'
                  }`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              {isOverrun && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 py-0.5 rounded w-fit">
                  <AlertTriangle size={10} className="shrink-0" />
                  <span>+{pct - 100}% Dépassement</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'totalPlanned',
        header: isAr ? 'المبلغ التقديري' : 'Montant Prévu',
        width: '1.5*',
        sortable: true,
        renderCell: (item) => (
          <div>
            <div className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
              {formatMoney(item.totalPlannedDzd, language)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              Exécuté: {formatMoney(item.totalExecutedDzd, language)}
            </div>
          </div>
        ),
      },
    ],
    [pinnedIds, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: boqItems.length > 0,
  });

  if (showSkeleton && (boqItems.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<ClipboardList size={22} />}
        title={isAr ? 'الكميات' : isEn ? 'Quantities' : 'Devis'}
        subtitle={
          isAr
            ? `${filteredItems.length} بند مقايسة`
            : `${filteredItems.length} postes au bordereau BOQ`
        }
        primaryAction={{
          label: isAr ? 'إضافة بند' : isEn ? 'New Item' : 'Nouveau Poste',
          onClick: openCreateModal,
          dataAction: 'add-boq-item',
        }}
        secondaryActions={
          <AtriumButton
            variant="secondary"
            size="sm"
            onClick={() => setIsPriceRevisionModalOpen(true)}
            icon={<Calculator size={14} />}
          >
            {isAr ? 'مراجعة الأسعار (CCAG)' : 'Révision Prix CCAG'}
          </AtriumButton>
        }
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'التقييم المالي والإنجاز الكمي للمشروع'
            : 'Suivi Budgétaire & Avancement Métré'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'بنود قيد التنفيذ' : isEn ? 'In Execution' : 'Postes en Cours',
          badgeText: isAr ? 'جاري' : 'En Cours',
          count: inProgressCount,
          tone: 'terracotta',
          isActive: executionFilter === 'Pending',
          onToggle: () =>
            setExecutionFilter((prev) => (prev === 'Pending' ? 'All' : 'Pending')),
        }}
        secondaryCard={{
          label: isAr ? 'بنود منجزة 100%' : isEn ? 'Completed Items' : 'Postes Achevés (100%)',
          badgeText: isAr ? 'مكتمل' : 'Achevés',
          count: completedCount,
          tone: 'emerald',
          isActive: executionFilter === 'Completed',
          onToggle: () =>
            setExecutionFilter((prev) => (prev === 'Completed' ? 'All' : 'Completed')),
        }}
        darkCard={{
          label: isAr ? 'المتبقي للإنجاز (رصيد الصفقة)' : isEn ? 'Remaining BTP Balance' : 'Reste à Exécuter',
          badgeCount: totalExecutedValue,
          badgePrefix: 'Réalisé ',
          badgeSuffix: ' DZD',
          formatBadgeValue: (v) => Math.round(v).toLocaleString(),
          valueCount: Math.max(0, totalPlannedValue - totalExecutedValue),
          formatValue: (v) => formatMoney(Math.round(v), language),
          caption: isAr ? 'مطابق لدفتر الشروط' : 'Contrôlé au métré (Attachements)',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'قائمة بنود المقايسة والتسعير التعاقدي'
              : 'Nomenclature des Postes & Relevés Métrés'
          }
          liveRegionText={`${sortedItems.length} ${isAr ? 'بند' : 'postes'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث برقم البند أو التوصيف...' : 'Rechercher par code poste, désignation...'
          }
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : 'Tous', count: boqItems.length },
            { value: 'Pending', label: isAr ? 'جاري' : 'En Cours', count: inProgressCount },
            { value: 'Completed', label: isAr ? 'مكتمل' : 'Achevés', count: completedCount },
          ]}
          statusValue={executionFilter}
          onStatusChange={setExecutionFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection<ContractorBoqItem>
          hideToolbar
          data={sortedItems}
          columns={columns}
          keyExtractor={(item) => item.id}
          defaultViewMode={viewMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير جدول المقايسة' : 'Exporter Postes BOQ',
            icon: <TrendingUp size={14} />,
            onClick: () => handleExportCsv(),
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteBoqItem(id));
            setSelectedIds(new Set<string>());
            if (selectedItem && ids.has(selectedItem.id)) setSelectedItem(null);
            showToast(isAr ? 'تم حذف البنود المحددة' : 'Postes BOQ supprimés', 'success');
          }}
          isPinned={(item) => pinnedIds.has(item.id)}
          onTogglePin={handleTogglePin}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          openItemId={activeItem?.id || null}
          onItemClick={handleSelectItem}
          onViewDetails={handleSelectItem}
          onEdit={openEditModal}
          onDelete={handleDelete}
          emptyTitle={isAr ? 'لا توجد بنود' : 'Aucun poste BOQ trouvé'}
          emptyDescription={
            searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun article ne correspond à votre recherche'
              : isAr ? 'قم بإضافة أول بند إلى المقايسة' : 'Créez votre premier poste au bordereau'
          }
          primaryActionLabel={isAr ? 'إضافة بند' : 'Nouveau Poste'}
          onAddFirstItem={openCreateModal}
          onResetFilters={resetAllFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          customActions={(item) => [
            {
              id: 'advance',
              label: isAr ? 'قيد إنجاز (+10%)' : 'Métré (+10%)',
              icon: <TrendingUp size={14} />,
              onClick: () => handleAdvanceExecution(item),
            },
          ]}
          renderCard={(item) => {
            const pct = item.plannedQty > 0 ? Math.round((item.executedQty / item.plannedQty) * 100) : 0;
            const isOverrun = item.executedQty > item.plannedQty;
            return (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2.5 py-1 rounded-lg border border-[#d4522f]/20">
                    {item.itemCode}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      isOverrun ? 'text-rose-600 dark:text-rose-400' : 'text-[#d4522f]'
                    }`}
                  >
                    {pct}% réalisé
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black dark:text-white line-clamp-2">
                    {item.designation}
                  </h3>
                  <div className="text-xs text-black/55 dark:text-white/55 font-medium mt-0.5">
                    {item.executedQty} / {item.plannedQty} {item.unit}
                  </div>
                  {isOverrun && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded w-fit">
                      <AlertTriangle size={10} className="shrink-0" />
                      <span>Dépassement (+{pct - 100}%) · Avenant obligatoire</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider">
                      Prix Unitaire
                    </div>
                    <div className="font-mono font-bold text-black dark:text-white mt-0.5">
                      {formatMoney(item.unitPriceDzd, language)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider">
                      Montant Exécuté
                    </div>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatMoney(item.totalExecutedDzd, language)}
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedItems.length}
        entityPluralLabel={isAr ? 'بنود' : 'postes BOQ'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeItem)}
        item={activeItem}
        allItems={sortedItems}
        keyExtractor={(item) => item.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeItem ? `Poste ${activeItem.itemCode}` : ''}
        subtitle={activeItem?.designation}
        avatarText={(activeItem?.itemCode || 'BOQ').slice(0, 4)}
        branchName={
          activeItem
            ? resolveRecordBranch(activeItem, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeItem && activeItem.plannedQty > 0
            ? `${Math.round((activeItem.executedQty / activeItem.plannedQty) * 100)}%`
            : '0%'
        }
        tabs={[
          { id: 'poste', label: isAr ? 'البند' : 'Fiche Poste' },
          { id: 'quantites', label: isAr ? 'الكميات والمبالغ' : 'Métrés & Devis' },
          { id: 'notes', label: isAr ? 'الملاحظات' : 'Consignes' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => handleSelectItem(item)}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(item, tab) => (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                variant="primary"
                size="sm"
                icon={<TrendingUp size={13} />}
                onClick={() => handleAdvanceExecution(item)}
              >
                {isAr ? 'قيد إنجاز (+10%)' : '+10% Avancement'}
              </AtriumButton>
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Edit size={13} />}
                onClick={() => openEditModal(item)}
              >
                {isAr ? 'تعديل' : 'Modifier'}
              </AtriumButton>
            </div>

            {tab === 'poste' && (
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2 border border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Numéro d'article:</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {item.itemCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Unité de mesure:</span>
                    <span className="font-semibold text-black dark:text-white">{item.unit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Prix unitaire bordereau:</span>
                    <span className="font-mono font-bold text-[#d4522f]">
                      {formatMoney(item.unitPriceDzd, language)}
                    </span>
                  </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-1 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-black/55 dark:text-white/55 block">Désignation complète :</span>
                  <p className="text-black dark:text-white leading-relaxed font-medium">
                    {item.designation}
                  </p>
                </div>
              </div>
            )}

            {tab === 'quantites' && (
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2 border border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Quantité prévue:</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {item.plannedQty} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Quantité constatée:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.executedQty} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Montant total prévu:</span>
                    <span className="font-mono font-semibold text-black dark:text-white">
                      {formatMoney(item.totalPlannedDzd, language)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Montant exécuté validé:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(item.totalExecutedDzd, language)}
                    </span>
                  </div>
                </div>
                {item.executedQty > item.plannedQty && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                      <span>
                        Dépassement de Quantité (+
                        {Math.round(((item.executedQty - item.plannedQty) / item.plannedQty) * 100)}
                        %)
                      </span>
                    </div>
                    <p className="text-[10px] leading-tight text-rose-700 dark:text-rose-300">
                      Conformément au Décret 15-247 (Art. 136), tout volume supérieur à la prévision contractuelle requiert un Avenant validé en Commission des Marchés avant mandatement.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 text-xs">
                <p className="text-black/55 dark:text-white/55 text-[11px]">
                  Observations de métré, réserves contradictoires et bordereaux d'attachement :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les relevés géomètre, tolérances d'épaisseur, validation maître d'œuvre..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-1 focus:ring-[#d4522f] outline-hidden resize-none"
                />
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={noteSaved ? <Check size={14} /> : <Save size={14} />}
                  onClick={handleSaveNotes}
                >
                  {noteSaved
                    ? isAr ? 'تم الحفظ' : 'Observations enregistrées'
                    : isAr ? 'حفظ' : 'Enregistrer'}
                </AtriumButton>
              </div>
            )}
          </div>
        )}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {itemToEdit
                      ? isAr ? 'تعديل بند المقايسة' : 'Modifier le Poste BOQ'
                      : isAr ? 'إضافة بند إلى الكشف التقديري' : 'Nouveau Poste au Bordereau BOQ'}
                  </h2>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    {isAr
                      ? 'تعريف وحدات العمل والأسعار الأحادية'
                      : 'Définition du poste, prix unitaire et quantités contractuelles'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
                  onChange={(v) => setUnit(extractStr(v) as ContractorBoqItem['unit'])}
                  options={[
                    { value: 'm3', label: 'm³ (Mètre cube)' },
                    { value: 'm2', label: 'm² (Mètre carré)' },
                    { value: 'ml', label: 'ml (Mètre linéaire)' },
                    { value: 'kg', label: 'kg (Kilogramme)' },
                    { value: 'ton', label: 'Tonne' },
                    { value: 'unit', label: 'Unité' },
                    { value: 'forfait', label: 'Forfait' },
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
                <AtriumButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {itemToEdit
                    ? isAr ? 'حفظ التعديلات' : 'Enregistrer'
                    : isAr ? 'إضافة البند' : 'Ajouter au Bordereau'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

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
