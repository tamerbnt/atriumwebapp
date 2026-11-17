import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Plus,
  ShieldCheck,
  AlertTriangle,
  Sprout,
  Download,
  Edit,
  Pin,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { AgriTreatmentLog, AgriCropCycle, AgriCyclePhase } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AgriCropCycleModal } from './AgriCropCycleModal';
import { AgriTreatmentModal } from './AgriTreatmentModal';
import { formatMoney } from '../../../utils/rules';
import { evaluateDarSafety } from '../../../utils/agriRules';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorBigStat,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const AgricultureCyclesView: React.FC = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    cropCycles,
    treatmentLogs,
    parcels,
    addCropCycle,
    updateCropCycle,
    deleteCropCycle,
    addTreatmentLog,
    updateTreatmentLog,
    deleteTreatmentLog,
  } = useAgricultureData();

  const [activeTabMode, setActiveTabMode] = useState<'cycles' | 'treatments'>('cycles');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParcel, setFilterParcel] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set<string>(['cycle_01', 'treat_01'])
  );
  const [sortBy, setSortBy] = useState<string>('sowingDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [cycleToEdit, setCycleToEdit] = useState<AgriCropCycle | null>(null);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [treatmentToEdit, setTreatmentToEdit] = useState<AgriTreatmentLog | null>(null);

  const [selectedCycle, setSelectedCycle] = useState<AgriCropCycle | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<AgriTreatmentLog | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('details');
  const [treatmentInspectorTab, setTreatmentInspectorTab] = useState<string>('overview');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeCycle = useMemo(() => {
    if (!selectedCycle) return null;
    return cropCycles.find((c) => c.id === selectedCycle.id) || selectedCycle;
  }, [selectedCycle, cropCycles]);

  const activeTreatment = useMemo(() => {
    if (!selectedTreatment) return null;
    return treatmentLogs.find((t) => t.id === selectedTreatment.id) || selectedTreatment;
  }, [selectedTreatment, treatmentLogs]);

  const parcelNameMap = useMemo(() => {
    const map = new Map<string, string>();
    parcels.forEach((p) => map.set(p.id, `${p.code || 'P'} - ${p.name}`));
    return map;
  }, [parcels]);

  const getPhaseConfig = useCallback(
    (phase: AgriCyclePhase | string) => {
      switch (phase) {
        case 'planned':
          return {
            label: isAr ? 'مخطط (Budget)' : 'Planifié',
            bg: 'bg-[#F3EDE7] text-black/70 dark:bg-neutral-800 dark:text-white/75',
          };
        case 'sowing':
          return {
            label: isAr ? 'بذر / شتل' : 'Semis en cours',
            bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
          };
        case 'vegetative':
          return {
            label: isAr ? 'نمو وعناية' : 'En Végétation',
            bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
          };
        case 'treatment_locked':
          return {
            label: isAr ? 'حظر DAR كيميائي' : 'DAR Actif (Verrouillé)',
            bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
          };
        case 'ready_harvest':
          return {
            label: isAr ? 'جاهز للحصاد' : 'Prêt Récolte',
            bg: 'bg-[#d4522f]/15 text-[#d4522f]',
          };
        case 'closed':
          return {
            label: isAr ? 'مكتمل ومغلق' : 'Clôturé',
            bg: 'bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75',
          };
        default:
          return {
            label: phase,
            bg: 'bg-neutral-100 text-black/70 dark:text-white/75',
          };
      }
    },
    [isAr]
  );

  const branchOptions = useMemo(() => {
    const records = activeTabMode === 'cycles' ? cropCycles : treatmentLogs;
    const counts = new Map<string, { id: string; name: string; count: number }>();
    records.forEach((r) => {
      const resolved = resolveRecordBranch(r, branchesById, currentBranch, language);
      const prev = counts.get(resolved.id);
      counts.set(resolved.id, {
        id: resolved.id,
        name: resolved.name,
        count: (prev?.count || 0) + 1,
      });
    });
    return [
      { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All' : 'Toutes', count: records.length },
      ...Array.from(counts.values()).map((b) => ({
        value: b.id,
        label: b.name,
        count: b.count,
      })),
    ];
  }, [activeTabMode, cropCycles, treatmentLogs, branchesById, currentBranch, language, isAr, isEn]);

  const filteredCycles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cropCycles.filter((c) => {
      if (filterParcel !== 'all' && c.parcelId !== filterParcel) return false;
      if (phaseFilter === 'ready_harvest' && c.currentPhase !== 'ready_harvest') return false;
      if (phaseFilter === 'treatment_locked' && c.currentPhase !== 'treatment_locked') return false;
      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(c, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }
      if (q) {
        const matchesCrop = c.cropName.toLowerCase().includes(q);
        const matchesVar = c.variety.toLowerCase().includes(q);
        const matchesParcel = (parcelNameMap.get(c.parcelId) || '').toLowerCase().includes(q);
        if (!matchesCrop && !matchesVar && !matchesParcel) return false;
      }
      return true;
    });
  }, [
    cropCycles,
    filterParcel,
    phaseFilter,
    branchFilter,
    branchesById,
    currentBranch,
    language,
    searchQuery,
    parcelNameMap,
  ]);

  const sortedCycles = useMemo(() => {
    const arr = [...filteredCycles];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortBy === 'cropName') return a.cropName.localeCompare(b.cropName) * dir;
      if (sortBy === 'parcelId') return a.parcelId.localeCompare(b.parcelId) * dir;
      if (sortBy === 'projectedYieldQtx') return (a.projectedYieldQtx - b.projectedYieldQtx) * dir;
      if (sortBy === 'currentPhase') return a.currentPhase.localeCompare(b.currentPhase) * dir;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * dir;
      }
      return a.sowingDate.localeCompare(b.sowingDate) * dir;
    });
    return arr;
  }, [filteredCycles, sortBy, sortDir, pinnedIds, branchesById, currentBranch, language]);

  const filteredTreatments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return treatmentLogs.filter((t) => {
      if (filterParcel !== 'all' && t.parcelId !== filterParcel) return false;
      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(t, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }
      if (q) {
        const matchesName = t.commercialProductName.toLowerCase().includes(q);
        const matchesActive = t.activeIngredient.toLowerCase().includes(q);
        const matchesPest = t.targetPestDisease.toLowerCase().includes(q);
        const matchesOp = t.operatorName.toLowerCase().includes(q);
        if (!matchesName && !matchesActive && !matchesPest && !matchesOp) return false;
      }
      return true;
    });
  }, [treatmentLogs, filterParcel, branchFilter, branchesById, currentBranch, language, searchQuery]);

  const sortedTreatments = useMemo(() => {
    const arr = [...filteredTreatments];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortBy === 'commercialProductName') {
        return a.commercialProductName.localeCompare(b.commercialProductName) * dir;
      }
      if (sortBy === 'darDays') return (a.darDays - b.darDays) * dir;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * dir;
      }
      return a.treatmentDate.localeCompare(b.treatmentDate) * dir;
    });
    return arr;
  }, [filteredTreatments, sortBy, sortDir, pinnedIds, branchesById, currentBranch, language]);

  const handleOpenCreateCycle = useCallback(() => {
    setCycleToEdit(null);
    setIsCycleModalOpen(true);
  }, []);

  const handleOpenEditCycle = useCallback((cycle: AgriCropCycle) => {
    setCycleToEdit(cycle);
    setIsCycleModalOpen(true);
  }, []);

  const handleSaveCycle = useCallback(
    (cycle: AgriCropCycle) => {
      if (cycleToEdit) {
        updateCropCycle(cycle);
        if (selectedCycle?.id === cycle.id) setSelectedCycle(cycle);
        showToast(isAr ? 'تم تحديث دورة المحصول' : 'Cycle de culture mis à jour', 'success');
      } else {
        addCropCycle(cycle);
        setSelectedCycle(cycle);
        showToast(
          isAr ? 'تم فتح موسم المحصول الفلاحي' : 'Nouveau cycle de culture enregistré',
          'success'
        );
      }
      setIsCycleModalOpen(false);
    },
    [cycleToEdit, updateCropCycle, addCropCycle, selectedCycle, isAr]
  );

  const handleDeleteCycle = useCallback(
    (cycle: AgriCropCycle) => {
      deleteCropCycle(cycle.id);
      if (selectedCycle?.id === cycle.id) setSelectedCycle(null);
      showToast(isAr ? 'تم حذف دورة المحصول' : 'Cycle de culture supprimé', 'info');
    },
    [deleteCropCycle, selectedCycle, isAr]
  );

  const handleOpenCreateTreatment = useCallback(() => {
    setTreatmentToEdit(null);
    setIsTreatmentModalOpen(true);
  }, []);

  const handleOpenEditTreatment = useCallback((t: AgriTreatmentLog) => {
    setTreatmentToEdit(t);
    setIsTreatmentModalOpen(true);
  }, []);

  const handleSaveTreatment = useCallback(
    (treatment: AgriTreatmentLog) => {
      if (treatmentToEdit) {
        updateTreatmentLog(treatment);
        if (selectedTreatment?.id === treatment.id) setSelectedTreatment(treatment);
        showToast(isAr ? 'تم تحديث المعالجة في السجل' : 'Traitement sanitaire mis à jour', 'success');
      } else {
        addTreatmentLog(treatment);
        setSelectedTreatment(treatment);
        showToast(
          isAr
            ? 'تم قيد المعالجة وتفعيل فترة الأمان DAR'
            : 'Traitement consigné et délai DAR activé',
          'success'
        );
      }
      setIsTreatmentModalOpen(false);
    },
    [treatmentToEdit, updateTreatmentLog, addTreatmentLog, selectedTreatment, isAr]
  );

  const handleDeleteTreatment = useCallback(
    (t: AgriTreatmentLog) => {
      deleteTreatmentLog(t.id);
      if (selectedTreatment?.id === t.id) setSelectedTreatment(null);
      showToast(isAr ? 'تم حذف المعالجة' : 'Traitement retiré', 'info');
    },
    [deleteTreatmentLog, selectedTreatment, isAr]
  );

  const handleExportCsv = useCallback(() => {
    if (activeTabMode === 'cycles') {
      const headers = [
        'Culture',
        'Variété',
        'Parcelle',
        'Agence / Domaine',
        'Campagne',
        'Surface Ha',
        'Semis',
        'Récolte Prévue',
        'Rendement Prévu Qtx',
        'Rendement Réalisé Qtx',
        'Phase',
      ];
      const rows = sortedCycles.map((c) => [
        c.cropName,
        c.variety,
        parcelNameMap.get(c.parcelId) || c.parcelId,
        resolveRecordBranch(c, branchesById, currentBranch, language).name,
        c.campaignYear,
        c.surfaceAllocatedHa,
        c.sowingDate,
        c.projectedHarvestDate,
        c.projectedYieldQtx,
        c.actualYieldQtx || 0,
        c.currentPhase,
      ]);
      downloadCsvSafe(
        `cycles_cultures_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );
    } else {
      const headers = [
        'Produit',
        'Substance Active',
        'Cible',
        'Agence / Domaine',
        'Dose/ha',
        'Date Traitement',
        'DAR Jours',
        'Récolte Autorisée',
        'Applicateur',
      ];
      const rows = sortedTreatments.map((t) => [
        t.commercialProductName,
        t.activeIngredient,
        t.targetPestDisease,
        resolveRecordBranch(t, branchesById, currentBranch, language).name,
        t.dosagePerHa,
        t.treatmentDate,
        t.darDays,
        t.harvestAllowedDate,
        t.operatorName,
      ]);
      downloadCsvSafe(
        `traitements_phyto_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );
    }
    showToast(isAr ? 'تم تصدير ملف CSV' : 'Export CSV généré', 'info');
  }, [
    activeTabMode,
    sortedCycles,
    sortedTreatments,
    parcelNameMap,
    branchesById,
    currentBranch,
    language,
    isAr,
  ]);

  const totalAllocatedHa = useMemo(
    () => cropCycles.reduce((acc, c) => acc + c.surfaceAllocatedHa, 0),
    [cropCycles]
  );
  const activeDarCyclesCount = useMemo(
    () => cropCycles.filter((c) => c.currentPhase === 'treatment_locked').length,
    [cropCycles]
  );
  const readyHarvestCount = useMemo(
    () => cropCycles.filter((c) => c.currentPhase === 'ready_harvest').length,
    [cropCycles]
  );
  const totalTreatmentsLogged = treatmentLogs.length;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterParcel !== 'all') count += 1;
    if (phaseFilter !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [filterParcel, phaseFilter, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterParcel !== 'all') {
      chips.push({
        key: 'parcel',
        label: `${isAr ? 'القطعة' : 'Parcelle'}: ${parcelNameMap.get(filterParcel) || filterParcel}`,
        onRemove: () => setFilterParcel('all'),
      });
    }
    if (phaseFilter !== 'All') {
      chips.push({
        key: 'phase',
        label: `${isAr ? 'الحالة' : 'Phase'}: ${getPhaseConfig(phaseFilter).label}`,
        onRemove: () => setPhaseFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const bName = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : 'Site'}: ${bName}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [filterParcel, phaseFilter, branchFilter, parcelNameMap, getPhaseConfig, branchOptions, isAr]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterParcel('all');
    setPhaseFilter('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'phase',
        kind: 'segmented',
        label: isAr ? 'حالة الدورة' : isEn ? 'Cycle Phase' : 'Phase du Cycle',
        value: phaseFilter,
        onChange: setPhaseFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: cropCycles.length },
          { value: 'ready_harvest', label: isAr ? 'جاهز للحصاد' : 'Prêt Récolte', count: readyHarvestCount },
          {
            value: 'treatment_locked',
            label: isAr ? 'حظر DAR' : 'Verrouillés DAR',
            count: activeDarCyclesCount,
          },
        ],
      },
      {
        id: 'parcel',
        kind: 'tiles',
        label: isAr ? 'القطعة الفلاحية' : isEn ? 'Parcel' : 'Parcelle Cadastrale',
        value: filterParcel,
        onChange: setFilterParcel,
        resetValue: 'all',
        options: [
          { value: 'all', label: isAr ? 'كل القطع' : 'Toutes parcelles', count: cropCycles.length },
          ...parcels.map((p) => ({
            value: p.id,
            label: `${p.code || 'P'} - ${p.name}`,
            count: cropCycles.filter((c) => c.parcelId === p.id).length,
          })),
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'الفرع / المزرعة' : isEn ? 'Branch / Estate' : 'Exploitation / Domaine',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [
      isAr,
      isEn,
      phaseFilter,
      filterParcel,
      branchFilter,
      cropCycles,
      readyHarvestCount,
      activeDarCyclesCount,
      parcels,
      branchOptions,
    ]
  );

  const cycleColumns: ColumnDefinition<AgriCropCycle>[] = useMemo(
    () => [
      {
        key: 'cropName',
        header: isAr ? 'المحصول والصنف' : 'Culture & Variété',
        width: '2.1*',
        sortable: true,
        renderCell: (c) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shrink-0">
              <Sprout size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{c.cropName}</span>
                {pinnedIds.has(c.id) && (
                  <Pin size={10} className="fill-[#d4522f] text-[#d4522f] shrink-0" />
                )}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55 truncate">
                {c.variety} • Campagne {c.campaignYear}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'parcelId',
        header: isAr ? 'القطعة الفلاحية' : 'Parcelle',
        width: '1.6*',
        sortable: true,
        renderCell: (c) => (
          <div className="text-xs text-black/70 dark:text-white/75 min-w-0">
            <div className="font-medium truncate">{parcelNameMap.get(c.parcelId) || c.parcelId}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
              {c.surfaceAllocatedHa} ha alloués
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Domaine',
        width: '1.2*',
        sortable: true,
        renderCell: (c) => (
          <span className="text-xs text-black/65 dark:text-white/70 truncate block">
            {resolveRecordBranch(c, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'sowingDate',
        header: isAr ? 'رزنامة الحملة' : 'Calendrier',
        width: '1.4*',
        sortable: true,
        renderCell: (c) => (
          <div className="text-xs text-black/70 dark:text-white/75">
            <div>
              Semis: <span className="font-mono text-black dark:text-white">{c.sowingDate}</span>
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55">
              Récolte: <span className="font-mono">{c.projectedHarvestDate}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'projectedYieldQtx',
        header: isAr ? 'المحصول (قنطار)' : 'Rendement (Qtx)',
        width: '1.3*',
        sortable: true,
        renderCell: (c) => (
          <div className="text-xs">
            <div className="font-mono font-bold text-black dark:text-white">
              {c.actualYieldQtx ? `${c.actualYieldQtx} / ` : ''}
              {c.projectedYieldQtx} Qtx
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55">
              {Math.round(c.projectedYieldQtx / (c.surfaceAllocatedHa || 1))} Qtx/ha
            </div>
          </div>
        ),
      },
      {
        key: 'currentPhase',
        header: isAr ? 'حالة الدورة' : 'Phase Actuelle',
        width: '1.5*',
        sortable: true,
        renderCell: (c) => {
          const conf = getPhaseConfig(c.currentPhase);
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${conf.bg}`}>
                {conf.label}
              </span>
              {c.activeDarLockoutUntil && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle size={11} />
                  DAR jusqu&apos;au {c.activeDarLockoutUntil}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [isAr, isEn, pinnedIds, parcelNameMap, branchesById, currentBranch, language, getPhaseConfig]
  );

  const treatmentColumns: ColumnDefinition<AgriTreatmentLog>[] = useMemo(
    () => [
      {
        key: 'commercialProductName',
        header: isAr ? 'المادة والمبيد' : 'Produit Commercial',
        width: '2*',
        sortable: true,
        renderCell: (t) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-black dark:text-white truncate">
                {t.commercialProductName}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55 truncate">
                {t.activeIngredient}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'targetPestDisease',
        header: isAr ? 'الآفة المستهدفة' : 'Cible / Maladie',
        width: '1.6*',
        sortable: true,
        renderCell: (t) => (
          <div className="text-xs text-black/70 dark:text-white/75 min-w-0">
            <div className="font-medium truncate">{t.targetPestDisease}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
              Dose: {t.dosagePerHa}
            </div>
          </div>
        ),
      },
      {
        key: 'parcelId',
        header: isAr ? 'القطعة المعالجة' : 'Parcelle',
        width: '1.3*',
        sortable: true,
        renderCell: (t) => (
          <div className="text-xs text-black/70 dark:text-white/75 truncate">
            {parcelNameMap.get(t.parcelId) || t.parcelId}
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Domaine',
        width: '1.2*',
        sortable: true,
        renderCell: (t) => (
          <span className="text-xs text-black/65 dark:text-white/70 truncate block">
            {resolveRecordBranch(t, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'darDays',
        header: isAr ? 'فترة الأمان DAR' : 'Délai DAR & Récolte',
        width: '1.5*',
        sortable: true,
        renderCell: (t) => {
          const safety = evaluateDarSafety(t.treatmentDate, t.darDays);
          return (
            <div className="text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    safety.isLocked
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  {t.darDays} jours DAR
                </span>
                {safety.isLocked && (
                  <span className="text-[10px] text-amber-600 font-mono font-bold">
                    ({safety.daysRemaining}j)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55 mt-0.5">
                Autorisé: <span className="font-mono">{t.harvestAllowedDate}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'treatmentDate',
        header: isAr ? 'المطبق المسؤول' : 'Applicateur',
        width: '1.3*',
        sortable: true,
        renderCell: (t) => (
          <div className="text-xs text-black/70 dark:text-white/75">
            <div className="truncate">{t.operatorName}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
              {t.treatmentDate}
            </div>
          </div>
        ),
      },
    ],
    [isAr, isEn, parcelNameMap, branchesById, currentBranch, language]
  );

  const handleTogglePin = useCallback(
    (item: AgriCropCycle | AgriTreatmentLog) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    },
    []
  );

  const getCycleRowMeta = useCallback(
    (c: AgriCropCycle): Partial<KineticRowData> => {
      const conf = getPhaseConfig(c.currentPhase);
      const branchName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
      const parcelName = parcelNameMap.get(c.parcelId) || c.parcelId;
      const statusVariant =
        c.currentPhase === 'ready_harvest' || c.currentPhase === 'vegetative'
          ? 'active'
          : c.currentPhase === 'treatment_locked'
          ? 'warning'
          : 'neutral';
      return {
        subline: `${c.variety} · ${parcelName}`,
        categoryLabel: `Campagne ${c.campaignYear}`,
        statusLabel: conf.label,
        statusVariant,
        metricPrimary: `${c.projectedYieldQtx} Qtx`,
        metricSecondary: `${c.surfaceAllocatedHa} ha`,
        detailCol1: {
          heading: isAr ? 'القطعة والموسم' : isEn ? 'Parcel & Campaign' : 'Parcelle & Campagne',
          primaryText: parcelName,
          secondaryText: `${c.surfaceAllocatedHa} ha alloués`,
          tertiaryText: branchName,
        },
        detailCol2: {
          heading: isAr ? 'توقعات المحصول' : isEn ? 'Yield Outlook' : 'Objectif Rendement',
          primaryText: `${c.actualYieldQtx ? `${c.actualYieldQtx} / ` : ''}${c.projectedYieldQtx} Qtx`,
          secondaryText: `${Math.round(c.projectedYieldQtx / (c.surfaceAllocatedHa || 1))} Qtx/ha`,
          tertiaryText: `Lot ${c.seedLotNumber || 'Standard'}`,
        },
        detailCol3: {
          heading: isAr ? 'الرزنامة والأمان' : isEn ? 'Schedule & DAR' : 'Calendrier & DAR',
          primaryText: `${c.sowingDate} → ${c.projectedHarvestDate}`,
          secondaryText: c.activeDarLockoutUntil
            ? `DAR jusqu'au ${c.activeDarLockoutUntil}`
            : conf.label,
        },
      };
    },
    [getPhaseConfig, branchesById, currentBranch, language, parcelNameMap, isAr, isEn]
  );

  const getCycleFanActions = useCallback(
    (c: AgriCropCycle): KineticRowFanAction[] => [
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-[15px] h-[15px]" />,
        onClick: () => handleOpenEditCycle(c),
      },
      {
        id: 'pin',
        label: isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-[15px] h-[15px]" />,
        onClick: () => handleTogglePin(c),
      },
      {
        id: 'open',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Sprout className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedTreatment(null);
          setSelectedCycle(c);
          setInspectorTab('details');
        },
      },
    ],
    [handleOpenEditCycle, handleTogglePin, isAr, isEn]
  );

  const getCycleDetailActions = useCallback(
    (c: AgriCropCycle): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'معاينة الدورة' : isEn ? 'Inspect Cycle' : 'Ouvrir fiche',
        icon: <Sprout className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedTreatment(null);
          setSelectedCycle(c);
          setInspectorTab('details');
        },
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-3.5 h-3.5" />,
        onClick: () => handleOpenEditCycle(c),
      },
    ],
    [handleOpenEditCycle, isAr, isEn]
  );

  const getTreatmentRowMeta = useCallback(
    (t: AgriTreatmentLog): Partial<KineticRowData> => {
      const safety = evaluateDarSafety(t.treatmentDate, t.darDays);
      const branchName = resolveRecordBranch(t, branchesById, currentBranch, language).name;
      const parcelName = parcelNameMap.get(t.parcelId) || t.parcelId;
      return {
        subline: `${t.activeIngredient} · ${parcelName}`,
        categoryLabel: t.targetPestDisease,
        statusLabel: `${t.darDays}j DAR`,
        statusVariant: safety.isLocked ? 'warning' : 'active',
        metricPrimary: t.dosagePerHa,
        metricSecondary: t.treatmentDate,
        detailCol1: {
          heading: isAr ? 'القطعة والمادة' : isEn ? 'Parcel & Active' : 'Parcelle & Substance',
          primaryText: parcelName,
          secondaryText: t.activeIngredient,
          tertiaryText: branchName,
        },
        detailCol2: {
          heading: isAr ? 'الاستهداف والجرعة' : isEn ? 'Target & Dosage' : 'Cible & Dosage',
          primaryText: t.targetPestDisease,
          secondaryText: `Dose: ${t.dosagePerHa}`,
          tertiaryText: t.operatorName,
        },
        detailCol3: {
          heading: isAr ? 'فترة الأمان DAR' : isEn ? 'DAR Release' : 'Délai DAR',
          primaryText: safety.isLocked
            ? `${safety.daysRemaining}j restants`
            : isAr
            ? 'آمن للجني'
            : 'Récolte autorisée',
          secondaryText: `Autorisé dès ${t.harvestAllowedDate}`,
        },
      };
    },
    [branchesById, currentBranch, language, parcelNameMap, isAr, isEn]
  );

  const getTreatmentFanActions = useCallback(
    (t: AgriTreatmentLog): KineticRowFanAction[] => [
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-[15px] h-[15px]" />,
        onClick: () => handleOpenEditTreatment(t),
      },
      {
        id: 'open',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <ShieldCheck className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedCycle(null);
          setSelectedTreatment(t);
          setTreatmentInspectorTab('overview');
        },
      },
    ],
    [handleOpenEditTreatment, isAr, isEn]
  );

  const getTreatmentDetailActions = useCallback(
    (t: AgriTreatmentLog): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'معاينة السجل' : isEn ? 'Inspect Log' : 'Ouvrir fiche',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedCycle(null);
          setSelectedTreatment(t);
          setTreatmentInspectorTab('overview');
        },
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-3.5 h-3.5" />,
        onClick: () => handleOpenEditTreatment(t),
      },
    ],
    [handleOpenEditTreatment, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: cropCycles.length > 0 || treatmentLogs.length > 0,
  });

  if (
    showSkeleton &&
    ((cropCycles.length === 0 && treatmentLogs.length === 0) ||
      networkMode === 'force_skeleton')
  ) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.4*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
        ]}
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Sprout size={22} />}
        title={isAr ? 'المحاصيل' : isEn ? 'Crops' : 'Cultures'}
        secondaryActions={
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={activeTabMode === 'cycles' ? handleOpenCreateTreatment : handleOpenCreateCycle}
            icon={activeTabMode === 'cycles' ? <ShieldCheck size={14} /> : <Sprout size={14} />}
          >
            {activeTabMode === 'cycles'
              ? isAr ? 'قيد معالجة DAR' : 'Traitement DAR'
              : isAr ? 'دورة جديدة' : 'Nouveau Cycle'}
          </AtriumButton>
        }
        primaryAction={{
          label:
            activeTabMode === 'cycles'
              ? isAr ? 'دورة محصول جديدة' : 'Nouveau Cycle de Culture'
              : isAr ? 'قيد معالجة جديدة' : 'Consigner Traitement Phyto',
          onClick:
            activeTabMode === 'cycles' ? handleOpenCreateCycle : handleOpenCreateTreatment,
          icon: activeTabMode === 'cycles' ? <Plus size={14} /> : <ShieldCheck size={14} />,
          dataAction: activeTabMode === 'cycles' ? 'add-cycle' : 'add-treatment',
        }}
      />

      {activeDarCyclesCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle size={20} className="shrink-0 text-amber-600" />
          <div className="flex-1">
            <span className="font-bold">
              {isAr
                ? `تنبيه أمان صحي: توجد ${activeDarCyclesCount} قطع فلاحية خاضعة لفترة الأمان الكيميائي (DAR)`
                : `Alerte Sanitaire : ${activeDarCyclesCount} cycle(s) sous verrouillage phytosanitaire DAR`}
            </span>
            <p className="text-[11px] opacity-85 mt-0.5">
              {isAr
                ? 'الجني محظور ومقفل نظامياً حتى انقضاء مدة الأمان المقررة في المعهد الوطني لحماية النباتات (INPV).'
                : "L'émission de bons de récolte et de pesée reste bloquée jusqu'à expiration des délais de rémanence homologués."}
            </p>
          </div>
        </div>
      )}

      <ScreenKpiBanner
        heading={
          isAr
            ? 'متابعة المواسم الزراعية وفترة الأمان DAR'
            : isEn
            ? 'Seasonal Rotation & DAR Biosecurity'
            : 'Assolement Actif & Conformité Phytosanitaire'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'جاهز للحصاد والجني'
            : isEn
            ? 'Ready for Harvest'
            : 'Cultures Prêtes Récolte',
          badgeText: isAr ? 'حصاد' : 'Prêt Pesée',
          count: readyHarvestCount,
          tone: 'emerald',
          isActive: activeTabMode === 'cycles' && phaseFilter === 'ready_harvest',
          onToggle: () => {
            setActiveTabMode('cycles');
            setPhaseFilter((prev) => (prev === 'ready_harvest' ? 'All' : 'ready_harvest'));
          },
        }}
        secondaryCard={{
          label: isAr
            ? 'دورات قيد الحظر DAR'
            : isEn
            ? 'DAR Locked Cycles'
            : 'Cycles Verrouillés DAR',
          badgeText: isAr ? 'حظر' : 'DAR Actifs',
          count: activeDarCyclesCount,
          tone: 'terracotta',
          isActive: activeTabMode === 'cycles' && phaseFilter === 'treatment_locked',
          onToggle: () => {
            setActiveTabMode('cycles');
            setPhaseFilter((prev) =>
              prev === 'treatment_locked' ? 'All' : 'treatment_locked'
            );
          },
        }}
        darkCard={{
          label: isAr
            ? 'المساحة الإجمالية للدورات'
            : isEn
            ? 'Total Allocated Acreage'
            : 'Superficie Assolement Actif',
          badgeCount: totalTreatmentsLogged,
          badgePrefix: '',
          badgeSuffix: isAr ? 'معالجة' : 'traitements',
          valueCount: Math.round(totalAllocatedHa * 10),
          valuePrefix: '',
          formatValue: (v) => `${(v / 10).toFixed(1)} ha`,
          caption: `${cropCycles.length} ${isAr ? 'دورات موسمية' : 'cycles en exploitation'}`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            activeTabMode === 'cycles'
              ? isAr
                ? 'دورات المحاصيل والمواسم الفلاحية'
                : 'Cycles de Culture & Assolement'
              : isAr
              ? 'السجل الصحي وفترة الأمان DAR'
              : 'Carnet Phyto & Délais DAR'
          }
          liveRegionText={`${
            activeTabMode === 'cycles' ? sortedCycles.length : sortedTreatments.length
          } ${isAr ? 'عنصر' : 'éléments'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeTabMode === 'cycles'
              ? isAr
                ? 'بحث بالمحصول، الصنف، القطعة...'
                : 'Rechercher culture, variété, parcelle...'
              : isAr
              ? 'بحث بالمبيد، المادة الفعالة، الآفة...'
              : 'Rechercher produit, substance, cible...'
          }
          statusOptions={
            activeTabMode === 'cycles'
              ? [
                  { value: 'All', label: isAr ? 'الكل' : 'Tous', count: cropCycles.length },
                  { value: 'ready_harvest', label: isAr ? 'جاهز للحصاد' : 'Prêt Récolte', count: readyHarvestCount },
                  { value: 'treatment_locked', label: isAr ? 'حظر DAR' : 'DAR Actifs', count: activeDarCyclesCount },
                ]
              : undefined
          }
          statusValue={activeTabMode === 'cycles' ? phaseFilter : undefined}
          onStatusChange={activeTabMode === 'cycles' ? setPhaseFilter : undefined}
          extraTrailingControls={
            <LiveSegmentedControl
              value={activeTabMode}
              onValueChange={(val) => {
                setSelectedIds(new Set<string>());
                setActiveTabMode(val as 'cycles' | 'treatments');
              }}
              size="md"
              options={[
                {
                  id: 'cycles',
                  value: 'cycles',
                  label: isAr ? 'الدورات' : 'Cycles',
                  count: cropCycles.length,
                },
                {
                  id: 'treatments',
                  value: 'treatments',
                  label: isAr ? 'المعالجات' : 'Phyto DAR',
                  count: treatmentLogs.length,
                },
              ]}
            />
          }
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

        {activeTabMode === 'cycles' ? (
          <UniversalDataCollection<AgriCropCycle>
            hideToolbar
            items={sortedCycles}
            columns={cycleColumns}
            keyExtractor={(c) => c.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkSecondaryAction={{
              label: isAr ? 'تصدير الدورات' : 'Exporter Cycles',
              icon: <Download size={14} />,
              onClick: () => handleExportCsv(),
            }}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteCropCycle(id));
              setSelectedIds(new Set<string>());
              if (selectedCycle && ids.has(selectedCycle.id)) setSelectedCycle(null);
              showToast(isAr ? 'تم حذف الدورات المحددة' : 'Cycles sélectionnés supprimés', 'info');
            }}
            isPinned={(c) => pinnedIds.has(c.id)}
            onTogglePin={handleTogglePin}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            openItemId={activeCycle?.id || null}
            onItemClick={(c, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedTreatment(null);
              setSelectedCycle(c);
              setInspectorTab('details');
            }}
            onViewDetails={(c, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedTreatment(null);
              setSelectedCycle(c);
              setInspectorTab('details');
            }}
            getRowMeta={getCycleRowMeta}
            getFanActions={getCycleFanActions}
            getDetailActions={getCycleDetailActions}
            onEdit={handleOpenEditCycle}
            onDelete={handleDeleteCycle}
            emptyTitle={
              isAr ? 'لا توجد دورات محاصيل مسجلة' : 'Aucun cycle de culture enregistré'
            }
            primaryActionLabel={isAr ? 'دورة محصول جديدة' : 'Nouveau Cycle'}
            onAddFirstItem={handleOpenCreateCycle}
            onResetFilters={resetAllFilters}
            hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          />
        ) : (
          <UniversalDataCollection<AgriTreatmentLog>
            hideToolbar
            items={sortedTreatments}
            columns={treatmentColumns}
            keyExtractor={(t) => t.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkSecondaryAction={{
              label: isAr ? 'تصدير السجل الصحي' : 'Exporter Traitements',
              icon: <Download size={14} />,
              onClick: () => handleExportCsv(),
            }}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteTreatmentLog(id));
              setSelectedIds(new Set<string>());
              if (selectedTreatment && ids.has(selectedTreatment.id)) setSelectedTreatment(null);
              showToast(
                isAr ? 'تم حذف المعالجات المحددة' : 'Traitements sélectionnés supprimés',
                'info'
              );
            }}
            isPinned={(t) => pinnedIds.has(t.id)}
            onTogglePin={handleTogglePin}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            openItemId={activeTreatment?.id || null}
            onItemClick={(t, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedCycle(null);
              setSelectedTreatment(t);
              setTreatmentInspectorTab('overview');
            }}
            onViewDetails={(t, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedCycle(null);
              setSelectedTreatment(t);
              setTreatmentInspectorTab('overview');
            }}
            getRowMeta={getTreatmentRowMeta}
            getFanActions={getTreatmentFanActions}
            getDetailActions={getTreatmentDetailActions}
            onEdit={handleOpenEditTreatment}
            onDelete={handleDeleteTreatment}
            emptyTitle={
              isAr ? 'لا توجد معالجات مسجلة' : 'Aucun traitement phytosanitaire consigné'
            }
            primaryActionLabel={isAr ? 'قيد معالجة' : 'Consigner Traitement'}
            onAddFirstItem={handleOpenCreateTreatment}
            onResetFilters={resetAllFilters}
            hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={activeTabMode === 'cycles' ? sortedCycles.length : sortedTreatments.length}
        entityPluralLabel={activeTabMode === 'cycles' ? (isAr ? 'دورات' : 'cycles') : (isAr ? 'معالجات' : 'traitements')}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<AgriCropCycle>
        isOpen={Boolean(activeCycle)}
        item={activeCycle}
        allItems={sortedCycles}
        keyExtractor={(c) => c.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeCycle?.cropName || ''}
        subtitle={
          activeCycle
            ? `${activeCycle.variety} · Campagne ${activeCycle.campaignYear}`
            : undefined
        }
        categoryLabel={activeCycle ? parcelNameMap.get(activeCycle.parcelId) || activeCycle.parcelId : undefined}
        avatarText={(activeCycle?.cropName || 'CY').slice(0, 2).toUpperCase()}
        branchName={
          activeCycle
            ? resolveRecordBranch(activeCycle, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeCycle ? getPhaseConfig(activeCycle.currentPhase).label : undefined}
        statusClassName={
          activeCycle?.currentPhase === 'treatment_locked'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : activeCycle?.currentPhase === 'ready_harvest' || activeCycle?.currentPhase === 'vegetative'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
        }
        tabs={[
          { id: 'details', label: isAr ? 'نظرة عامة' : isEn ? 'Overview' : 'Détails' },
          { id: 'rendement', label: isAr ? 'المردود' : isEn ? 'Yield' : 'Rendement' },
          { id: 'couts', label: isAr ? 'التكاليف' : isEn ? 'Costs' : 'Coûts' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(c) => setSelectedCycle(c)}
        onClose={() => setSelectedCycle(null)}
        onDelete={handleDeleteCycle}
        holdToDelete
        renderBody={(cycle, tab) => {
          const yieldPct = Math.min(
            100,
            Math.round(((cycle.actualYieldQtx || 0) / (cycle.projectedYieldQtx || 1)) * 100)
          );
          const totalCost =
            (cycle.totalInputCostDzd || 0) +
            (cycle.totalLaborCostDzd || 0) +
            (cycle.totalMachineryCostDzd || 0);

          if (tab === 'rendement') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'مؤشر المردود' : isEn ? 'Yield Progress' : 'Rendement réalisé'}>
                  <InspectorProgressBar
                    label={`${cycle.actualYieldQtx || 0} / ${cycle.projectedYieldQtx} Qtx`}
                    value={`${yieldPct}%`}
                    percent={yieldPct}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'تفاصيل الحصاد' : isEn ? 'Production Targets' : 'Objectifs de récolte'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'الهدف المتوقع' : isEn ? 'Projected Yield' : 'Objectif prévu'}
                      value={`${cycle.projectedYieldQtx} Qtx`}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'المردود الفعلي' : isEn ? 'Actual Yield' : 'Rendement réalisé'}
                      value={`${cycle.actualYieldQtx || 0} Qtx`}
                      tone="ok"
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الكثافة' : isEn ? 'Density' : 'Rendement / ha'}
                      value={`${Math.round(cycle.projectedYieldQtx / (cycle.surfaceAllocatedHa || 1))} Qtx/ha`}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (tab === 'couts') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'إجمالي التكاليف' : isEn ? 'Total Engaged Cost' : 'Coûts engagés'}>
                  <InspectorBigStat
                    value={formatMoney(totalCost, language)}
                    tone="accent"
                    caption={`${cycle.surfaceAllocatedHa} ha · ${cycle.variety}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'توزيع النفقات' : isEn ? 'Cost Breakdown' : 'Ventilation des charges'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'البذور والمدخلات' : isEn ? 'Inputs & Seeds' : 'Intrants & Semences'}
                      value={formatMoney(cycle.totalInputCostDzd || 0, language)}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'اليد العاملة' : isEn ? 'Seasonal Labor' : "Main d'œuvre tâcherons"}
                      value={formatMoney(cycle.totalLaborCostDzd || 0, language)}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الآلات والوقود' : isEn ? 'Machinery & Fuel' : 'Matériel & Carburant'}
                      value={formatMoney(cycle.totalMachineryCostDzd || 0, language)}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                      icon: <Edit className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => handleOpenEditCycle(cycle),
                    },
                    {
                      id: 'treat',
                      label: isAr ? 'معالجة DAR' : isEn ? 'Log DAR' : 'Traiter DAR',
                      icon: <ShieldCheck className="w-[18px] h-[18px]" />,
                      onClick: handleOpenCreateTreatment,
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(cycle.id)
                        ? isAr ? 'إلغاء تثبيت' : 'Désépingler'
                        : isAr ? 'تثبيت' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handleTogglePin(cycle),
                    },
                    {
                      id: 'export',
                      label: 'CSV',
                      icon: <Download className="w-[18px] h-[18px]" />,
                      onClick: handleExportCsv,
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'بطاقة الموسم' : isEn ? 'Cycle Sheet' : 'Fiche culturale'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'القطعة' : isEn ? 'Parcel' : 'Parcelle'}
                    value={parcelNameMap.get(cycle.parcelId) || cycle.parcelId}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'المساحة المخصصة' : isEn ? 'Allocated Area' : 'Surface allouée'}
                    value={`${cycle.surfaceAllocatedHa} ha`}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'حصة البذور' : isEn ? 'Seed Lot' : 'Lot semence'}
                    value={cycle.seedLotNumber || 'CCLS-Standard'}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'تاريخ البذر' : isEn ? 'Sowing Date' : 'Date semis'}
                    value={cycle.sowingDate}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'الحصاد المتوقع' : isEn ? 'Expected Harvest' : 'Récolte prévue'}
                    value={cycle.projectedHarvestDate}
                    isLast={!cycle.activeDarLockoutUntil}
                  />
                  {cycle.activeDarLockoutUntil && (
                    <InspectorKeyValue
                      label={isAr ? 'حظر DAR حتى' : isEn ? 'DAR Lockout' : 'Verrouillage DAR'}
                      value={cycle.activeDarLockoutUntil}
                      tone="warn"
                      isLast
                    />
                  )}
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticSlideOverInspector<AgriTreatmentLog>
        isOpen={Boolean(activeTreatment)}
        item={activeTreatment}
        allItems={sortedTreatments}
        keyExtractor={(t) => t.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeTreatment?.commercialProductName || ''}
        subtitle={activeTreatment?.activeIngredient}
        categoryLabel={activeTreatment?.targetPestDisease}
        avatarText={(activeTreatment?.commercialProductName || 'PH').slice(0, 2).toUpperCase()}
        branchName={
          activeTreatment
            ? resolveRecordBranch(activeTreatment, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeTreatment ? `${activeTreatment.darDays}j DAR` : undefined}
        statusClassName={
          activeTreatment && evaluateDarSafety(activeTreatment.treatmentDate, activeTreatment.darDays).isLocked
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'نظرة عامة' : isEn ? 'Overview' : 'Aperçu' },
          { id: 'dar', label: isAr ? 'فترة الأمان' : isEn ? 'DAR Safety' : 'Délai DAR' },
          { id: 'notes', label: isAr ? 'التعليمات' : isEn ? 'Notes' : 'Consignes' },
        ]}
        activeTab={treatmentInspectorTab}
        onTabChange={setTreatmentInspectorTab}
        onSelectItem={(t) => setSelectedTreatment(t)}
        onClose={() => setSelectedTreatment(null)}
        onDelete={handleDeleteTreatment}
        holdToDelete
        renderBody={(treat, tab) => {
          const safety = evaluateDarSafety(treat.treatmentDate, treat.darDays);

          if (tab === 'dar') {
            const elapsedPct = safety.isLocked
              ? Math.max(10, Math.min(95, Math.round(((treat.darDays - safety.daysRemaining) / (treat.darDays || 1)) * 100)))
              : 100;
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'حالة فترة الأمان' : isEn ? 'DAR Status' : 'Rémanence INPV'}>
                  <InspectorBigStat
                    value={safety.isLocked ? `${safety.daysRemaining}j` : '0j'}
                    tone={safety.isLocked ? 'warn' : 'ok'}
                    caption={`Récolte autorisée : ${treat.harvestAllowedDate}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'تقدم مدة الأمان' : isEn ? 'Safety Window' : 'Progression DAR'}>
                  <InspectorProgressBar
                    label={`${treat.darDays} jours réglementaires`}
                    value={`${elapsedPct}%`}
                    percent={elapsedPct}
                  />
                </InspectorSection>
              </>
            );
          }

          if (tab === 'notes') {
            return (
              <InspectorSection index={0} title={isAr ? 'توصيات الطقس والمعالجة' : isEn ? 'Field Notes' : 'Consignes & Météo'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'المطبق' : isEn ? 'Operator' : 'Applicateur'}
                    value={treat.operatorName}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'الملاحظات' : isEn ? 'Notes' : 'Observations'}
                    value={treat.notes || 'Aucune observation particulière.'}
                    mono={false}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
                      icon: <Edit className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => handleOpenEditTreatment(treat),
                    },
                    {
                      id: 'export',
                      label: 'CSV',
                      icon: <Download className="w-[18px] h-[18px]" />,
                      onClick: handleExportCsv,
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفاصيل التطبيق' : isEn ? 'Application Details' : 'Détails phytosanitaires'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'الآفة المستهدفة' : isEn ? 'Target Pest' : 'Cible / Maladie'}
                    value={treat.targetPestDisease}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'القطعة' : isEn ? 'Parcel' : 'Parcelle'}
                    value={parcelNameMap.get(treat.parcelId) || treat.parcelId}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'الجرعة' : isEn ? 'Dosage' : 'Dose appliquée'}
                    value={treat.dosagePerHa}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'تاريخ التطبيق' : isEn ? 'Applied Date' : 'Date application'}
                    value={treat.treatmentDate}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'تاريخ الجني المسموح' : isEn ? 'Harvest Allowed' : 'Récolte autorisée'}
                    value={treat.harvestAllowedDate}
                    tone="ok"
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2}>
                <InspectorWideButton
                  label={isAr ? 'تعديل سجل المعالجة' : isEn ? 'Edit Treatment Log' : 'Modifier ce traitement'}
                  onClick={() => handleOpenEditTreatment(treat)}
                />
              </InspectorSection>
            </>
          );
        }}
      />

      <AgriCropCycleModal
        isOpen={isCycleModalOpen}
        onClose={() => setIsCycleModalOpen(false)}
        onSave={handleSaveCycle}
        cycleToEdit={cycleToEdit}
        parcels={parcels}
      />
      <AgriTreatmentModal
        isOpen={isTreatmentModalOpen}
        onClose={() => setIsTreatmentModalOpen(false)}
        onSave={handleSaveTreatment}
        logToEdit={treatmentToEdit}
        parcels={parcels}
        cropCycles={cropCycles}
      />
    </div>
  );
};
