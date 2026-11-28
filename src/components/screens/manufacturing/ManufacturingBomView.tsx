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
  GitBranch,
  Lock,
  Scissors,
  FileText,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { pickLocalizedText, runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { centimesToDzd, dzdToCentimes } from '../../../utils/money';
import {
  isBomLockedByOrders,
  optimizeLinearBarCutting1D,
  optimizeSheetSlabCutting2D,
  buildDimensionQuoteLineItems,
} from '../../../utils/manufacturingDepth';
import { ManufacturingBom, MfgCuttingPartInput, MfgCuttingPlan } from '../../../types';
import { useManufacturingData } from './manufacturingData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import {
  UnifiedInvoiceComposerModal,
  type UnifiedInvoiceComposerPrefill,
} from '../../common/invoicing/UnifiedInvoiceComposerModal';
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
  KineticModalShell,
  KineticSlideOverInspector,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const ManufacturingBomView: React.FC<any> = () => {
  const { account, language, currentBusiness, currentBranch, branches, currentUser, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      currentUser: s.currentUser,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { boms, orders, cuttingPlans, addBom, updateBom, forkBom, deleteBom, saveCuttingPlan } =
    useManufacturingData();

  const [bomSubTab, setBomSubTab] = useState<'boms' | 'cutting'>('boms');
  const [cutTitle, setCutTitle] = useState('Débit Aluminium / Panneaux Client');
  const [cutTrade, setCutTrade] = useState<MfgCuttingPlan['tradeCategory']>('Aluminum');
  const [cutMode, setCutMode] = useState<MfgCuttingPlan['cuttingMode']>('1d_linear');
  const [stockLenMm, setStockLenMm] = useState('6000');
  const [stockWidMm, setStockWidMm] = useState('1220');
  const [kerfMm, setKerfMm] = useState('4');
  const [cutUnitPriceDzd, setCutUnitPriceDzd] = useState('1850');
  const [cutParts, setCutParts] = useState<MfgCuttingPartInput[]>([
    { id: 'cp_1', label: 'Montant Dormant', lengthMm: 2150, widthMm: 600, quantity: 4, allowRotation: true },
    { id: 'cp_2', label: 'Traverse Basse', lengthMm: 950, widthMm: 500, quantity: 4, allowRotation: true },
  ]);
  const [newPartLabel, setNewPartLabel] = useState('');
  const [newPartLength, setNewPartLength] = useState('1200');
  const [newPartWidth, setNewPartWidth] = useState('500');
  const [newPartQty, setNewPartQty] = useState('2');
  const [cutQuotePrefill, setCutQuotePrefill] = useState<UnifiedInvoiceComposerPrefill | null>(null);

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
  const [batchYield, setBatchYield] = useState('');
  const [unit, setUnit] = useState('Unité');
  const [laborHours, setLaborHours] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  const [selectedBom, setSelectedBom] = useState<ManufacturingBom | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const cuttingResult = useMemo(() => {
    const stockL = Math.max(100, parseFloat(stockLenMm) || 6000);
    const stockW = Math.max(100, parseFloat(stockWidMm) || 1220);
    const kerf = Math.max(0, parseFloat(kerfMm) || 4);
    if (cutMode === '1d_linear') {
      return optimizeLinearBarCutting1D({
        stockLengthMm: stockL,
        kerfMm: kerf,
        parts: cutParts,
        minReusableOffcutMm: 500,
      });
    }
    return optimizeSheetSlabCutting2D({
      stockLengthMm: stockL,
      stockWidthMm: stockW,
      kerfMm: kerf,
      parts: cutParts,
    });
  }, [cutMode, stockLenMm, stockWidMm, kerfMm, cutParts]);

  const handleSaveCutPlan = () => {
    const saved = saveCuttingPlan({
      title: cutTitle.trim() || `Débit ${cutTrade}`,
      tradeCategory: cutTrade,
      cuttingMode: cutMode,
      stockLengthMm: Math.max(100, parseFloat(stockLenMm) || 6000),
      stockWidthMm: Math.max(100, parseFloat(stockWidMm) || 1220),
      kerfMm: Math.max(0, parseFloat(kerfMm) || 4),
      parts: cutParts,
      layoutResult: cuttingResult,
      stockUnitsRequired: cuttingResult.stockUnitsRequired,
      wastePercent: cuttingResult.wastePercent,
      reusableOffcuts: cuttingResult.reusableOffcutsSummary,
      unitPriceCentimes: dzdToCentimes(Math.max(0, parseFloat(cutUnitPriceDzd) || 0)),
    });
    showToast(
      isAr ? `تم حفظ مخطط التقطيع ${saved.planNumber}` : `Plan de coupe ${saved.planNumber} enregistré`,
      'success'
    );
  };

  const handleLaunchDimensionQuote = () => {
    const quoteLines = buildDimensionQuoteLineItems({
      tradeCategory: cutTrade,
      cuttingMode: cutMode,
      parts: cutParts,
      layoutResult: cuttingResult,
      unitPriceDzd: Math.max(0, parseFloat(cutUnitPriceDzd) || 1850),
    });
    setCutQuotePrefill({
      docType: 'devis',
      sourceVertical: 'manufacturing_production',
      notesTop: `${cutTitle} · ${cuttingResult.stockUnitsRequired} unités stock · Chutes ${cuttingResult.wastePercent}%`,
      items: quoteLines,
    });
  };

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeBom = useMemo(() => {
    if (!selectedBom) return null;
    return boms.find((b) => b.id === selectedBom.id) || selectedBom;
  }, [selectedBom, boms]);

  const openCreateModal = useCallback(() => {
    setBomToEdit(null);
    setBomCode(`BOM-PRD-${Math.floor(10 + Math.random() * 90)}`);
    setProductName('');
    setBatchYield('');
    setUnit('Unité');
    setLaborHours('');
    setEstimatedCost('');
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
    const parsedCost = parseFloat(estimatedCost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      showToast(isAr ? 'يرجى إدخال التكلفة المعيارية' : 'Veuillez saisir un coût standard valide', 'error');
      return;
    }
    const activeAccountId = (bomToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (bomToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const payload: ManufacturingBom = {
      id: bomToEdit?.id || `bom_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      finishedProductId: bomToEdit?.finishedProductId || `prod_${Date.now()}`,
      finishedProductName: productName.trim(),
      bomCode: bomCode.trim(),
      batchYield: parseInt(batchYield, 10) || 1,
      unit: unit.trim(),
      standardLaborHours: parseFloat(laborHours) || 1,
      components: bomToEdit?.components || [],
      estimatedCostDzd: parsedCost,
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
        renderCell: (b) => {
          const locked = isBomLockedByOrders(b.id, orders);
          return (
          <div className="flex items-center gap-2 min-w-0">
            <div data-sq="tile" data-sq-border="none" className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center tabular-nums font-semibold t-small shrink-0">
              <Layers size={16} />
            </div>
            <div className="min-w-0">
              <div className="tabular-nums font-semibold t-small text-black dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>{b.bomCode}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#EFE9E2] dark:bg-[#2B2825] text-[11px] font-semibold">
                  v{b.version || 1}
                </span>
                {locked && (
                  <span title={isAr ? 'مقفلة بأوامر تصنيع' : 'Verrouillée par OF actif'} className="inline-flex items-center text-amber-600 dark:text-amber-400">
                    <Lock size={11} />
                  </span>
                )}
                {pinnedIds.has(b.id) && <Pin size={10} className="fill-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55">
                Rendement: {b.batchYield} {b.unit}
              </div>
            </div>
          </div>
          );
        },
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
        secondaryActions={
          <LiveSegmentedControl
            size="md"
            value={bomSubTab}
            onValueChange={(v) => setBomSubTab(v as 'boms' | 'cutting')}
            options={[
              { value: 'boms', label: isAr ? 'التركيبات BOM' : 'Nomenclatures BOM', count: boms.length },
              { value: 'cutting', label: isAr ? 'تقطيع m²/ml' : 'Découpe 1D/2D & Devis', count: cuttingPlans.length },
            ]}
            aria-label="BOM and Cutting Optimizer Switcher"
          />
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

      {bomSubTab === 'cutting' && (
        <ScreenPod>
          <div className="space-y-4" data-testid="mfg-cutting-optimizer-pod">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
                  <Scissors size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  <span>
                    {isAr
                      ? 'محرك تحسين التقطيع والتسعير (خشب / ألمنيوم / رخام / نسيج)'
                      : 'Optimiseur Débit Barres (1D) & Panneaux/Dalles (2D) + Devis m²/ml'}
                  </span>
                </h2>
                <p className="t-cap text-black/55 dark:text-white/60">
                  {isAr
                    ? 'خوارزمية FFD مع احتساب سمك المنشار والفضلات القابلة لإعادة الاستعمال'
                    : 'Algorithme First-Fit Decreasing avec trait de scie (kerf), chutes réutilisables et génération Devis 6.1.'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <AtriumButton type="button" variant="outline" size="sm" icon={<Save size={14} />} onClick={handleSaveCutPlan}>
                  {isAr ? 'حفظ مخطط التقطيع' : 'Enregistrer Plan'}
                </AtriumButton>
                <AtriumButton type="button" variant="primary" size="sm" icon={<FileText size={14} />} onClick={handleLaunchDimensionQuote}>
                  {isAr ? 'إنشاء عرض سعر 6.1' : 'Créer Devis m²/ml (6.1)'}
                </AtriumButton>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <LabelInput
                field="cutTitle"
                label={isAr ? 'عنوان المشروع' : 'Intitulé Débit'}
                value={cutTitle}
                onChange={setCutTitle}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="cutTrade"
                label={isAr ? 'التخصص' : 'Métier'}
                value={cutTrade}
                onChange={(v) => {
                  const trade = v as MfgCuttingPlan['tradeCategory'];
                  setCutTrade(trade);
                  if (trade === 'Wood' || trade === 'Marble' || trade === 'Textile') setCutMode('2d_sheet');
                  else setCutMode('1d_linear');
                }}
                options={[
                  { value: 'Aluminum', label: 'Menuiserie Aluminium' },
                  { value: 'Wood', label: 'Menuiserie Bois / MDF' },
                  { value: 'Marble', label: 'Marbre & Granit' },
                  { value: 'Textile', label: 'Textile & Confection' },
                ]}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="cutMode"
                label={isAr ? 'نمط التقطيع' : 'Mode'}
                value={cutMode}
                onChange={(v) => setCutMode(v as MfgCuttingPlan['cuttingMode'])}
                options={[
                  { value: '1d_linear', label: '1D Barres (ml)' },
                  { value: '2d_sheet', label: '2D Panneaux / Dalles (m²)' },
                ]}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="cutStockLen"
                label={cutMode === '1d_linear' ? 'Longueur Barre (mm)' : 'Longueur Plaque (mm)'}
                type="number"
                value={stockLenMm}
                onChange={setStockLenMm}
                width="100%"
                height={40}
                corner={12}
              />
              {cutMode === '2d_sheet' ? (
                <LabelInput
                  field="cutStockWid"
                  label="Largeur Plaque (mm)"
                  type="number"
                  value={stockWidMm}
                  onChange={setStockWidMm}
                  width="100%"
                  height={40}
                  corner={12}
                />
              ) : (
                <LabelInput
                  field="cutKerf"
                  label="Trait scie / Kerf (mm)"
                  type="number"
                  value={kerfMm}
                  onChange={setKerfMm}
                  width="100%"
                  height={40}
                  corner={12}
                />
              )}
              <LabelInput
                field="cutUnitPrice"
                label={cutMode === '1d_linear' ? 'Tarif HT / ml (DZD)' : 'Tarif HT / m² (DZD)'}
                type="number"
                value={cutUnitPriceDzd}
                onChange={setCutUnitPriceDzd}
                width="100%"
                height={40}
                corner={12}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 space-y-3">
                <div data-sq="card" data-sq-border="solid" className="p-3 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-2">
                  <div className="t-small font-semibold text-black dark:text-white">
                    {isAr ? 'القطع المطلوبة' : `Liste de Débit (${cutParts.length} repères)`}
                  </div>
                  <div className="space-y-1.5">
                    {cutParts.map((part) => (
                      <div key={part.id} className="flex items-center justify-between gap-2 p-2 rounded bg-white dark:bg-[#191716] t-cap">
                        <div>
                          <span className="font-semibold text-black dark:text-white">{part.label}</span>
                          <span className="text-black/55 dark:text-white/55 tabular-nums ml-2">
                            {part.lengthMm}mm{cutMode === '2d_sheet' ? ` × ${part.widthMm || 500}mm` : ''} × {part.quantity} pcs
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Supprimer ${part.label}`}
                          onClick={() => setCutParts((prev) => prev.filter((p) => p.id !== part.id))}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--atr-divider)]">
                    <LabelInput field="newCutLabel" label="Repère" value={newPartLabel} onChange={setNewPartLabel} placeholder="Traverse" width="100%" height={36} corner={10} />
                    <LabelInput field="newCutLen" label="L (mm)" type="number" value={newPartLength} onChange={setNewPartLength} width="100%" height={36} corner={10} />
                    {cutMode === '2d_sheet' && (
                      <LabelInput field="newCutWid" label="l (mm)" type="number" value={newPartWidth} onChange={setNewPartWidth} width="100%" height={36} corner={10} />
                    )}
                    <LabelInput field="newCutQty" label="Qté" type="number" value={newPartQty} onChange={setNewPartQty} width="100%" height={36} corner={10} />
                  </div>
                  <AtriumButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => {
                      const len = parseFloat(newPartLength) || 0;
                      const wid = parseFloat(newPartWidth) || 500;
                      const qty = parseInt(newPartQty, 10) || 1;
                      if (!newPartLabel.trim() || len <= 0) return;
                      setCutParts((prev) => [
                        ...prev,
                        { id: `cp_${Date.now()}`, label: newPartLabel.trim(), lengthMm: len, widthMm: wid, quantity: qty, allowRotation: true },
                      ]);
                      setNewPartLabel('');
                    }}
                  >
                    {isAr ? 'إضافة قطعة' : 'Ajouter Repère'}
                  </AtriumButton>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <div className="grid grid-cols-3 gap-2 tabular-nums">
                  <div data-sq="card" data-sq-border="solid" className="p-3 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
                    <span className="t-cap text-black/55 dark:text-white/55 block">{cutMode === '1d_linear' ? 'Barres requises' : 'Plaques requises'}</span>
                    <span className="t-card font-semibold text-black dark:text-white">{cuttingResult.stockUnitsRequired}</span>
                  </div>
                  <div data-sq="card" data-sq-border="solid" className="p-3 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
                    <span className="t-cap text-black/55 dark:text-white/55 block">Taux Chutes</span>
                    <span className="t-card font-semibold text-amber-600 dark:text-amber-400">{cuttingResult.wastePercent}%</span>
                  </div>
                  <div data-sq="card" data-sq-border="solid" className="p-3 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
                    <span className="t-cap text-black/55 dark:text-white/55 block">Chutes réutilisables</span>
                    <span className="t-card font-semibold text-emerald-600 dark:text-emerald-400">{cuttingResult.reusableOffcutsCount}</span>
                  </div>
                </div>
                <div data-sq="card" data-sq-border="solid" className="p-3 bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-2 max-h-60 overflow-y-auto">
                  <div className="t-small font-semibold text-black dark:text-white">
                    {isAr ? 'تفصيل التموضع' : `Calepinage (${cuttingResult.layouts.length} unités stock)`}
                  </div>
                  {cuttingResult.layouts.map((lay) => (
                    <div key={lay.stockIndex} className="p-2 rounded bg-[#F5F1EC] dark:bg-[#191716] t-cap space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>#{lay.stockIndex}</span>
                        <span className="tabular-nums text-black/60 dark:text-white/60">
                          {lay.cuts.length} pièces · reste {lay.offcutsMm.map((o) => (o.widthMm ? `${o.lengthMm}×${o.widthMm}mm` : `${o.lengthMm}mm`)).join(', ') || '0'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lay.cuts.map((c, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                            {c.label}: {c.lengthMm}{c.widthMm ? `×${c.widthMm}` : ''}mm
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {cuttingPlans.length > 0 && (
              <div className="pt-2 border-t border-[var(--atr-divider)]">
                <div className="t-small font-semibold text-black dark:text-white mb-2">
                  {isAr ? 'المخططات المحفوظة' : `Plans de Coupe Enregistrés (${cuttingPlans.length})`}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {cuttingPlans.map((cp) => (
                    <div key={cp.id} data-sq="ctl" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-black dark:text-white truncate">{cp.planNumber} · {cp.title}</div>
                        <div className="text-black/55 dark:text-white/55 tabular-nums">
                          {cp.tradeCategory} · {cp.stockUnitsRequired} u · chute {cp.wastePercent}%
                        </div>
                      </div>
                      <AtriumButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCutTitle(cp.title);
                          setCutTrade(cp.tradeCategory);
                          setCutMode(cp.cuttingMode);
                          setStockLenMm(String(cp.stockLengthMm));
                          if (cp.stockWidthMm) setStockWidMm(String(cp.stockWidthMm));
                          setKerfMm(String(cp.kerfMm));
                          setCutParts(cp.parts);
                          if (cp.unitPriceCentimes) setCutUnitPriceDzd(String(centimesToDzd(cp.unitPriceCentimes)));
                        }}
                      >
                        {isAr ? 'تحميل' : 'Charger'}
                      </AtriumButton>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScreenPod>
      )}

      {bomSubTab === 'boms' && (
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
      )}

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
                variant="primary"
                size="sm"
                icon={<GitBranch size={13} />}
                onClick={() => {
                  const next = forkBom(bom, {});
                  if (next) setSelectedBom(next);
                }}
              >
                {isAr ? `نسخة جديدة v${(bom.version || 1) + 1}` : `Nouvelle Version v${(bom.version || 1) + 1}`}
              </AtriumButton>
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
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2">
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
                    className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] space-y-1"
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
                <div data-sq="card" data-sq-border="none" className="bg-[#F5F1EC] dark:bg-[#22201E] p-4 space-y-2">
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
                <LabelTextarea
                  field="bomInspectorNotes"
                  label={isAr ? 'توجيهات التصنيع والتجميع' : "Directives techniques d'usinage"}
                  rows={6}
                  value={inspectorNotes}
                  onChange={setInspectorNotes}
                  placeholder="Noter les étapes opératoires, réglages de coupe, temps de séchage..."
                  width="100%"
                  corner={12}
                />
                <Button
                  type="button"
                  tone="accent"
                  size={36}
                  className="w-full justify-center"
                  leading={noteSaved ? <Check size={14} /> : <Save size={14} />}
                  onClick={handleSaveNotes}
                >
                  {noteSaved ? (isAr ? 'تم الحفظ' : 'Consignes enregistrées') : isAr ? 'حفظ' : 'Enregistrer'}
                </Button>
              </div>
            )}
          </div>
        )}
      />

      <KineticModalShell
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-2.5">
              <div data-sq="tile" data-sq-border="none" className="w-9 h-9 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0">
                <Layers size={20} />
              </div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {bomToEdit
                  ? isAr ? 'تعديل جدول المكونات (BOM)' : 'Modifier la Nomenclature'
                  : isAr ? 'إنشاء جدول مكونات جديد (BOM)' : 'Nouvelle Nomenclature Produit'}
              </h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="bomCode"
                label={isAr ? 'رمز التركيبة *' : 'Code BOM *'}
                placeholder="BOM-TAB-01"
                value={bomCode}
                onChange={setBomCode}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="bomUnit"
                label={isAr ? 'وحدة الإنتاج' : 'Unité de lot'}
                placeholder="Unité, Lot de 10..."
                value={unit}
                onChange={setUnit}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="bomProductName"
              label={isAr ? 'اسم المنتج النهائي المصنّع *' : 'Produit Fini Fabriqué *'}
              placeholder="Ex: Table Réunion Chêne Massif 3.2m"
              value={productName}
              onChange={setProductName}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelInput
                field="bomBatchYield"
                label={isAr ? 'الكمية المنتجة' : 'Rendement Lot'}
                type="number"
                placeholder="1"
                value={batchYield}
                onChange={setBatchYield}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="bomLaborHours"
                label={isAr ? 'ساعات العمل' : 'Heures MO'}
                type="number"
                placeholder="10"
                value={laborHours}
                onChange={setLaborHours}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="bomEstimatedCost"
                label={isAr ? 'التكلفة المعيارية' : 'Coût Total DZD'}
                type="number"
                placeholder="80000"
                value={estimatedCost}
                onChange={setEstimatedCost}
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsModalOpen(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {bomToEdit ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : isAr ? 'إنشاء التركيبة' : 'Créer la BOM'}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <UnifiedInvoiceComposerModal
        isOpen={Boolean(cutQuotePrefill)}
        onClose={() => setCutQuotePrefill(null)}
        prefill={cutQuotePrefill}
        onSaved={() => setCutQuotePrefill(null)}
      />
    </div>
  );
};
