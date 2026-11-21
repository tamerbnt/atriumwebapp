import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Layers,
  Plus,
  Clock,
  ShieldCheck,
  Edit,
  Pin,
  X,
  Save,
  Check,
  MapPin,
  Eye,
  Trash2,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { pickLocalizedText, runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { ManufacturingBom } from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const ManufacturingBomView: React.FC<any> = () => {
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

  const { boms, addBom, updateBom, deleteBom } = useManufacturingData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['bom_01']));
  const [sortBy, setSortBy] = useState<string>('bomCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bomToEdit, setBomToEdit] = useState<ManufacturingBom | null>(null);
  const [bomCode, setBomCode] = useState('');
  const [productName, setProductName] = useState('');
  const [batchYield, setBatchYield] = useState('1');
  const [unit, setUnit] = useState('Unité');
  const [laborHours, setLaborHours] = useState('10');
  const [estimatedCost, setEstimatedCost] = useState('80000');

  const [selectedBom, setSelectedBom] = useState<ManufacturingBom | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeBom = useMemo(() => {
    if (!selectedBom) return null;
    return boms.find((b) => b.id === selectedBom.id) || selectedBom;
  }, [selectedBom, boms]);

  const openCreateModal = useCallback(() => {
    setBomToEdit(null);
    setBomCode(`BOM-PRD-${Math.floor(10 + Math.random() * 90)}`);
    setProductName('');
    setBatchYield('1');
    setUnit('Unité');
    setLaborHours('10');
    setEstimatedCost('80000');
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((b: ManufacturingBom) => {
    setBomToEdit(b);
    setBomCode(b.bomCode);
    setProductName(b.finishedProductName);
    setBatchYield(String(b.batchYield));
    setUnit(b.unit);
    setLaborHours(String(b.standardLaborHours));
    setEstimatedCost(String(b.estimatedCostDzd));
    setIsModalOpen(true);
  }, []);

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
      branchId: bomToEdit?.branchId || currentBranch?.id || 'branch_manufacturing_main',
      staffId: currentUser?.id || 'staff_01',
      finishedProductId: bomToEdit?.finishedProductId || `prod_${Date.now()}`,
      finishedProductName: productName.trim(),
      bomCode: bomCode.trim(),
      batchYield: parseInt(batchYield, 10) || 1,
      unit: unit.trim(),
      standardLaborHours: parseFloat(laborHours) || 1,
      components: bomToEdit?.components || [
        {
          rawProductId: 'raw_01',
          rawProductName: 'Matière Principale Standard',
          quantity: 1,
          unit: 'u',
          unitCostDzd: 40000,
        },
      ],
      estimatedCostDzd: parseFloat(estimatedCost) || 50000,
      isActive: bomToEdit?.isActive ?? true,
      status: bomToEdit?.status || 'Active',
      createdAt: bomToEdit?.createdAt || new Date().toISOString(),
    };
    if (bomToEdit) {
      updateBom(payload);
      if (selectedBom?.id === payload.id) setSelectedBom(payload);
    } else {
      addBom(payload);
    }
    setIsModalOpen(false);
  };

  const activeBomsCount = useMemo(() => boms.filter((b) => b.isActive).length, [boms]);
  const inactiveBomsCount = useMemo(() => boms.filter((b) => !b.isActive).length, [boms]);
  const totalComponents = useMemo(() => boms.reduce((acc, b) => acc + (b.components?.length || 0), 0), [boms]);
  const avgCost = useMemo(
    () => (boms.length > 0 ? Math.round(boms.reduce((acc, b) => acc + b.estimatedCostDzd, 0) / boms.length) : 0),
    [boms]
  );

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    boms.forEach((bom) => {
      const b = resolveRecordBranch(bom, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [boms, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: boms.length },
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
        count: branchCounts.get(currentBranch.id) || boms.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, boms.length, isAr, isEn]);

  const filteredBoms = useMemo(() => {
    return boms.filter((bom) => {
      if (filterActive === 'Active' && !bom.isActive) return false;
      if (filterActive === 'Inactive' && bom.isActive) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(bom, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(bom, branchesById, currentBranch, language);
        const matches =
          bom.bomCode.toLowerCase().includes(q) ||
          bom.finishedProductName.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [boms, filterActive, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedBoms = useMemo(() => {
    const list = [...filteredBoms];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'bomCode') cmp = a.bomCode.localeCompare(b.bomCode);
      else if (sortBy === 'finishedProduct') cmp = a.finishedProductName.localeCompare(b.finishedProductName);
      else if (sortBy === 'laborHours') cmp = a.standardLaborHours - b.standardLaborHours;
      else if (sortBy === 'estimatedCost') cmp = a.estimatedCostDzd - b.estimatedCostDzd;
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredBoms, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handlePin = useCallback((b: ManufacturingBom) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(b.id)) next.delete(b.id);
      else next.add(b.id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    (b: ManufacturingBom) => {
      deleteBom(b.id);
      if (selectedBom?.id === b.id) setSelectedBom(null);
    },
    [deleteBom, selectedBom?.id]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      const count = ids.size;
      runUndoBatch(
        {
          operationType: 'bulk',
          vertical: 'manufacturing_production',
          affectedCount: count,
          summary: pickLocalizedText(language, {
            fr: `${count} nomenclatures BOM supprimées`,
            en: `${count} BOMs deleted`,
            ar: `تم حذف ${count} جداول مكونات`,
          }),
          toastTitle: pickLocalizedText(language, {
            fr: 'Nomenclatures BOM',
            en: 'Bills of Materials',
            ar: 'جداول المكونات BOM',
          }),
        },
        () => {
          ids.forEach((id) => deleteBom(id));
        }
      );
      if (selectedBom && ids.has(selectedBom.id)) setSelectedBom(null);
      setSelectedIds(new Set());
    },
    [deleteBom, selectedBom, language]
  );

  const handleToggleActive = useCallback(
    (b: ManufacturingBom) => {
      const updated: ManufacturingBom = { ...b, isActive: !b.isActive, status: !b.isActive ? 'Active' : 'Archived' };
      updateBom(updated);
      if (selectedBom?.id === b.id) setSelectedBom(updated);
    },
    [updateBom, selectedBom?.id]
  );

  const handleSelectBom = useCallback((b: ManufacturingBom, openerEl?: HTMLElement | null) => {
    setSelectedBom(b);
    setDrawerOpenerEl(openerEl || null);
    setActiveTab('fiche');
    setInspectorNotes('');
    setNoteSaved(false);
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = ['Code BOM', 'Produit Fini', 'Branche', 'Rendement Lot', 'Unité', 'Heures MO', 'Coût Estimé DZD', 'Statut Actif'];
    const rows = sortedBoms.map((bom) => {
      const b = resolveRecordBranch(bom, branchesById, currentBranch, language);
      return [
        bom.bomCode,
        bom.finishedProductName,
        b.name,
        bom.batchYield,
        bom.unit,
        bom.standardLaborHours,
        bom.estimatedCostDzd,
        bom.isActive ? 'Actif' : 'Inactif',
      ];
    });
    downloadCsvSafe(`nomenclatures_bom_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير ملف BOM CSV' : 'Export CSV des BOM généré', 'info');
  }, [sortedBoms, branchesById, currentBranch, language, isAr]);

  const handleSaveNotes = () => {
    if (!activeBom) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ التوجيهات الهندسية' : 'Consignes opératoires enregistrées', 'success');
  };

  const activeFiltersCount = branchFilter !== 'All' ? 1 : 0;
  const hasAnyFilters = filterActive !== 'All' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterActive('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterActive !== 'All') {
      chips.push({ key: 'active', label: filterActive, onRemove: () => setFilterActive('All') });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [filterActive, branchFilter, branchOptions]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'activeStatus',
        label: isAr ? 'حالة التفعيل' : isEn ? 'Status' : 'Statut Nomenclature',
        value: filterActive,
        onChange: setFilterActive,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: boms.length },
          { value: 'Active', label: isAr ? 'سارية' : 'Actives', count: activeBomsCount },
          { value: 'Inactive', label: isAr ? 'معطلة' : 'Inactives', count: inactiveBomsCount },
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'المصنع / الفرع' : isEn ? 'Branch' : 'Unité / Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ],
    [filterActive, branchFilter, boms.length, activeBomsCount, inactiveBomsCount, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<ManufacturingBom>[] = useMemo(
    () => [
      {
        key: 'bomCode',
        header: isAr ? 'رمز التركيبة' : 'Code BOM',
        width: '2.0*',
        sortable: true,
        renderCell: (b) => (
          <div className="flex items-center gap-2 min-w-0">
            <div data-sq="tile" data-sq-border="none" className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center tabular-nums font-semibold t-small shrink-0">
              <Layers size={16} />
            </div>
            <div className="min-w-0">
              <div className="tabular-nums font-semibold t-small text-black dark:text-white flex items-center gap-2">
                {b.bomCode}
                {pinnedIds.has(b.id) && <Pin size={10} className="fill-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55">
                Rendement: {b.batchYield} {b.unit}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'finishedProduct',
        header: isAr ? 'المنتج النهائي' : 'Produit Fini Fabriqué',
        width: '2.8*',
        sortable: true,
        renderCell: (b) => (
          <div className="min-w-0">
            <div className="font-semibold t-small text-black dark:text-white truncate">{b.finishedProductName}</div>
            <div className="t-cap text-black/55 dark:text-white/55">{b.components?.length || 0} composants intégrés</div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'المصنع' : isEn ? 'Branch' : 'Unité',
        width: '1.8*',
        sortable: true,
        renderCell: (bom) => {
          const b = resolveRecordBranch(bom, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'laborHours',
        header: isAr ? 'ساعات العمل' : 'Temps Gamme',
        width: '1.3*',
        sortable: true,
        renderCell: (b) => (
          <div className="flex items-center gap-1 t-cap text-black/70 dark:text-white/75">
            <Clock size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
            <span className="tabular-nums font-semibold">{b.standardLaborHours} h</span>
          </div>
        ),
      },
      {
        key: 'estimatedCost',
        header: isAr ? 'التكلفة المعيارية' : 'Coût Standard DZD',
        width: '1.6*',
        sortable: true,
        renderCell: (b) => (
          <div className="tabular-nums font-semibold t-small text-black dark:text-white">{formatMoney(b.estimatedCostDzd, language)}</div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut',
        width: '1.2*',
        renderCell: (b) => (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold ${
              b.isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-[#F3EDE7] text-black/70 dark:bg-[#2B2825] dark:text-white/75'
            }`}
          >
            {b.isActive ? 'Active' : 'Inactif'}
          </span>
        ),
      },
    ],
    [pinnedIds, branchesById, currentBranch, language, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: boms.length > 0,
  });

  if (showSkeleton && (boms.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  const activeBranchInfo = activeBom ? resolveRecordBranch(activeBom, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Layers size={22} />}
        title={isAr ? 'الوصفات' : isEn ? 'Recipes' : 'Recettes'}
        subtitle={
          isAr
            ? `${boms.length} تركيبة BOM · ${totalComponents} مكون صناعي`
            : `${boms.length} nomenclatures BOM · ${totalComponents} composants intégrés`
        }
        primaryAction={{
          label: isAr ? 'تركيبة جديدة' : 'Nouvelle BOM',
          onClick: openCreateModal,
          icon: <Plus size={16} strokeWidth={2.2} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'هندسة المنتجات والمكونات المعيارية' : 'Ingénierie Produits & Standard de Coût'}
        language={language}
        primaryCard={{
          label: isAr ? 'جداول المكونات السارية' : 'BOM Actives en Série',
          badgeText: isAr ? 'جاهزة لإطلاق OF' : 'Actives',
          count: activeBomsCount,
          tone: 'emerald',
          isActive: filterActive === 'Active',
          onToggle: () => setFilterActive((prev) => (prev === 'Active' ? 'All' : 'Active')),
        }}
        secondaryCard={{
          label: isAr ? 'تركيبات موقوفة / أرشيف' : 'BOM Suspendues / Inactives',
          badgeText: isAr ? 'قيد المراجعة' : 'Inactives',
          count: inactiveBomsCount,
          tone: 'terracotta',
          isActive: filterActive === 'Inactive',
          onToggle: () => setFilterActive((prev) => (prev === 'Inactive' ? 'All' : 'Inactive')),
        }}
        darkCard={{
          label: isAr ? 'متوسط تكلفة التصنيع المعيارية' : 'Coût Moyen Estimé (Prix Revient)',
          badgeCount: totalComponents,
          badgePrefix: '',
          badgeSuffix: isAr ? 'مكون' : 'composants',
          valueCount: avgCost,
          valuePrefix: '',
          valueSuffix: ' DA',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? 'تقدير معياري شامل للمواد وساعات التشغيل' : 'Matériaux & gammes opératoires',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'قوائم المكونات الصناعية والتركيبات (BOM)' : 'Nomenclatures Produits & Formules BOM'}
          liveRegionText={`${sortedBoms.length} BOM`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث برمز BOM أو اسم المنتج...' : 'Rechercher par code BOM, produit fini...'}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: boms.length },
            { value: 'Active', label: isAr ? 'سارية' : isEn ? 'Active' : 'Actives', count: activeBomsCount },
            { value: 'Inactive', label: isAr ? 'معطلة' : isEn ? 'Inactive' : 'Inactives', count: inactiveBomsCount },
          ]}
          statusValue={filterActive}
          onStatusChange={setFilterActive}
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

        <UniversalDataCollection
          hideToolbar
          data={sortedBoms}
          keyExtractor={(b) => b.id}
          defaultViewMode={viewMode}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={handleBulkDelete}
          isPinned={(b) => pinnedIds.has(b.id)}
          onTogglePin={handlePin}
          openItemId={activeBom?.id}
          onItemClick={handleSelectBom}
          onViewDetails={handleSelectBom}
          onEdit={openEditModal}
          onDelete={handleDelete}
          getRowMeta={(b): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(b, branchesById, currentBranch, language);
            const compCount = b.components?.length || 0;
            return {
              title: b.finishedProductName,
              subline: `${b.bomCode} · ${compCount} ${isAr ? 'مكونات' : 'composants'}`,
              avatarText: (b.bomCode || 'BM').slice(0, 3).toUpperCase(),
              avatarColor: b.isActive ? '#d4522f' : '#64748B',
              categoryLabel: `${compCount} ${isAr ? 'مكون' : 'matières'}`,
              statusLabel: b.isActive ? (isAr ? 'سارية' : isEn ? 'Active' : 'Active') : isAr ? 'معطلة' : isEn ? 'Inactive' : 'Inactif',
              statusVariant: b.isActive ? 'active' : 'blocked',
              metricPrimary: formatMoney(b.estimatedCostDzd, language),
              metricSecondary: `${b.standardLaborHours}h MO`,
              branchName: bInfo.name,
              branchCode: bInfo.code,
              isPinned: pinnedIds.has(b.id),
              detailCol1: {
                heading: isAr ? 'المنتج المعني' : isEn ? 'Finished Good' : 'Produit Fini',
                primaryText: b.finishedProductName,
                secondaryText: b.bomCode,
                tertiaryText: bInfo.name,
              },
              detailCol2: {
                heading: isAr ? 'المكونات وساعات التشغيل' : isEn ? 'Components & Labor' : 'Nomenclature & Gamme',
                primaryText: `${compCount} ${isAr ? 'مكون' : 'composants'}`,
                secondaryText: `${b.standardLaborHours}h ${isAr ? 'عمل معياري' : 'MO standard'}`,
              },
              detailCol3: {
                heading: isAr ? 'التكلفة المعيارية' : isEn ? 'Standard Cost' : 'Coût Revient Est.',
                primaryText: formatMoney(b.estimatedCostDzd, language),
                secondaryText: b.isActive ? (isAr ? 'جاهزة للإنتاج' : 'Prête pour OF') : isAr ? 'أرشيف' : 'Suspendue',
              },
            };
          }}
          getFanActions={(b): KineticRowFanAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'عرض' : isEn ? 'Details' : 'Détails',
              icon: <Eye className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                e.stopPropagation();
                handleSelectBom(b, e.currentTarget);
              },
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
              icon: <Edit className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                e.stopPropagation();
                openEditModal(b);
              },
            },
            {
              id: 'del',
              label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
              icon: <Trash2 className="w-[15px] h-[15px]" />,
              isDanger: true,
              onClick: (e) => {
                e.stopPropagation();
                handleDelete(b);
              },
            },
          ]}
          getDetailActions={(b): KineticDetailAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'فتح البطاقة' : isEn ? 'Open' : 'Fiche BOM',
              icon: <Eye className="w-3.5 h-3.5" />,
              onClick: () => handleSelectBom(b),
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
              icon: <Edit className="w-3.5 h-3.5" />,
              onClick: () => openEditModal(b),
            },
            {
              id: 'toggleActive',
              label: isAr ? 'تبديل الحالة' : b.isActive ? 'Suspendre' : 'Activer',
              icon: <ShieldCheck className="w-3.5 h-3.5" />,
              onClick: () => handleToggleActive(b),
            },
            {
              id: 'del',
              label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
              icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
              onClick: () => handleDelete(b),
            },
          ]}
          customActions={(b) => [
            {
              id: 'toggleActive',
              label: isAr ? 'تبديل الحالة' : b.isActive ? 'Suspendre' : 'Activer',
              icon: <ShieldCheck size={14} />,
              onClick: () => handleToggleActive(b),
            },
          ]}
          renderCard={(b) => (
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="tabular-nums font-semibold t-small bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] px-2.5 py-1 rounded-full">
                  {b.bomCode}
                </span>
                <span
                  className={`t-small font-semibold px-2 py-1 rounded-full ${
                    b.isActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-[#F3EDE7] text-black/70 dark:bg-[#2B2825] dark:text-white/75'
                  }`}
                >
                  {b.isActive ? 'Active' : 'Inactif'}
                </span>
              </div>
              <div>
                <h3 className="t-label font-semibold text-black dark:text-white line-clamp-1">{b.finishedProductName}</h3>
                <div className="t-small text-black/55 dark:text-white/55 font-medium mt-0.5">
                  {b.components?.length || 0} matières & pièces associées
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--atr-divider)] flex items-center justify-between t-cap">
                <div>
                  <div className="t-cap text-black/55 dark:text-white/55">Coût Estimé</div>
                  <div className="tabular-nums font-semibold text-black dark:text-white mt-0.5">{formatMoney(b.estimatedCostDzd, language)}</div>
                </div>
                <div className="text-right">
                  <div className="t-cap text-black/55 dark:text-white/55">Gamme MO</div>
                  <div className="tabular-nums font-semibold text-black/70 dark:text-white/75 mt-0.5">{b.standardLaborHours}h</div>
                </div>
              </div>
            </div>
          )}
          emptyTitle={isAr ? 'لا توجد جداول مكونات' : 'Aucune nomenclature trouvée'}
          emptyDescription={
            searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucune nomenclature ne correspond à votre recherche'
              : isAr ? 'قم بإنشاء أول جدول مكونات لمنتجاتك' : 'Créez votre première BOM produit'
          }
          primaryActionLabel={isAr ? 'تركيبة جديدة' : 'Nouvelle BOM'}
          onAddFirstItem={openCreateModal}
          onResetFilters={resetAllFilters}
          hasActiveFilters={hasAnyFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedBoms.length}
        entityPluralLabel={isAr ? 'تركيبة BOM' : isEn ? 'BOMs' : 'nomenclatures'}
        hasActiveFilters={activeFiltersCount > 0 || filterActive !== 'All'}
        onResetFilters={() => {
          setFilterActive('All');
          setBranchFilter('All');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeBom)}
        item={activeBom}
        allItems={sortedBoms}
        keyExtractor={(b) => b.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeBom?.bomCode || ''}
        subtitle={activeBom?.finishedProductName || ''}
        avatarText="BOM"
        branchName={activeBranchInfo?.name}
        statusLabel={activeBom?.isActive ? (isAr ? 'سارية' : 'Active') : isAr ? 'معطلة' : 'Inactif'}
        statusClassName={
          activeBom?.isActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-[#F3EDE7] text-black/70 dark:bg-[#2B2825] dark:text-white/75'
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'البطاقة' : 'Fiche BOM' },
          { id: 'composants', label: isAr ? 'المكونات' : `Composants (${activeBom?.components?.length || 0})` },
          { id: 'costs', label: isAr ? 'التكلفة' : 'Coûts' },
          { id: 'notes', label: isAr ? 'التعليمات' : 'Consignes' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(b) => handleSelectBom(b)}
        onClose={() => setSelectedBom(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(bom, tab) => (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                icon={<ShieldCheck size={13} />}
                onClick={() => handleToggleActive(bom)}
              >
                {bom.isActive ? (isAr ? 'تعطيل' : 'Désactiver') : isAr ? 'تفعيل' : 'Activer'}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                icon={<Edit size={13} />}
                onClick={() => openEditModal(bom)}
              >
                {isAr ? 'تعديل' : 'Modifier'}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="ghost"
                size="sm"
                icon={<Pin size={13} />}
                onClick={() => handlePin(bom)}
              >
                {pinnedIds.has(bom.id) ? (isAr ? 'مثبت' : 'Épinglé') : isAr ? 'تثبيت' : 'Épingler'}
              </AtriumButton>
            </div>

            {tab === 'fiche' && (
              <div className="space-y-4 t-cap">
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#1D1B19] p-4 space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">Code Formule:</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">{bom.bomCode}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">Produit Cible:</span>
                    <span className="font-semibold text-black dark:text-white truncate max-w-[200px]">{bom.finishedProductName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">Rendement de lot:</span>
                    <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                      {bom.batchYield} {bom.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-black/55 dark:text-white/55">Gamme Opératoire:</span>
                    <span className="tabular-nums text-black dark:text-white">{bom.standardLaborHours} heures MO</span>
                  </div>
                </div>
                <div data-sq="card" data-sq-border="none" className="p-4 bg-[#FCEEE8]/75 dark:bg-[#2B2825]">
                  <div className="flex justify-between items-center">
                    <span className="text-black/70 dark:text-white/75">Coût Standard Unitaire:</span>
                    <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(bom.estimatedCostDzd, language)}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'composants' && (
              <div className="space-y-2 t-cap">
                {(bom.components || []).map((c, i) => (
                  <div
                    key={i}
                    data-sq="card"
                    data-sq-border="none"
                    className="p-3 bg-[#F5F1EC] dark:bg-[#1D1B19] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-black dark:text-white t-small">{c.rawProductName}</span>
                      <span className="tabular-nums font-semibold text-black dark:text-white">
                        {formatMoney(c.quantity * c.unitCostDzd, language)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between t-cap text-black/55 dark:text-white/55">
                      <span>
                        Dose: {c.quantity} {c.unit}
                      </span>
                      <span>PU: {formatMoney(c.unitCostDzd, language)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'costs' && (
              <div className="space-y-4 t-cap">
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#1D1B19] p-4 space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-[var(--atr-divider)]">
                    <span className="text-black/55 dark:text-white/55">Matières Premières:</span>
                    <span className="tabular-nums font-semibold text-black dark:text-white">
                      {formatMoney(
                        (bom.components || []).reduce((acc, c) => acc + c.quantity * c.unitCostDzd, 0),
                        language
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-black/55 dark:text-white/55">Main d'oeuvre estimée:</span>
                    <span className="tabular-nums text-black dark:text-white">
                      {formatMoney(bom.standardLaborHours * 1500, language)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 t-cap">
                <p className="text-black/55 dark:text-white/55 t-cap">
                  Directives techniques d'usinage, tolérances et normes d'assemblage :
                </p>
                <div data-sq="ctl" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow">
                  <textarea
                    rows={6}
                    value={inspectorNotes}
                    onChange={(e) => setInspectorNotes(e.target.value)}
                    placeholder="Noter les étapes opératoires, réglages de coupe, temps de séchage..."
                    className="lbi-field w-full p-3 bg-transparent border-0 text-black dark:text-white t-cap outline-hidden resize-none"
                  />
                </div>
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  icon={noteSaved ? <Check size={14} /> : <Save size={14} />}
                  onClick={handleSaveNotes}
                >
                  {noteSaved ? (isAr ? 'تم الحفظ' : 'Consignes enregistrées') : isAr ? 'حفظ' : 'Enregistrer'}
                </AtriumButton>
              </div>
            )}
          </div>
        )}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sq-elev-pop max-w-lg w-full">
            <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
                <div className="flex items-center gap-2">
                  <div data-sq="tile" data-sq-border="none" className="w-9 h-9 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="t-card font-semibold text-black dark:text-white">
                      {bomToEdit
                        ? isAr ? 'تعديل جدول المكونات (BOM)' : 'Modifier la Nomenclature'
                        : isAr ? 'إنشاء جدول مكونات جديد (BOM)' : 'Nouvelle Nomenclature Produit'}
                    </h2>
                    <p className="t-cap text-black/55 dark:text-white/55">
                      {isAr ? 'تحديد مواصفات تصنيع المنتجات والمواد' : 'Définition de la recette de fabrication et standard de coût'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
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
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {bomToEdit ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : isAr ? 'إنشاء التركيبة' : 'Créer la BOM'}
                </AtriumButton>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
