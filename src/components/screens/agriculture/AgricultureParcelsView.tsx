import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Sprout,
  Droplets,
  ShieldCheck,
  Package,
  Download,
  Edit,
  Pin,
  Save,
  Check,
  Activity,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { AgriParcel, AgriParcelStatus, AgriTreatmentLog, AgriHarvestTicket } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AgricultureParcelModal } from './AgricultureParcelModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
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
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const AgricultureParcelsView: React.FC = () => {
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
    parcels,
    treatmentLogs,
    harvestTickets,
    selectedParcelId,
    setSelectedParcelId,
    addParcel,
    updateParcel,
    deleteParcel,
    addTreatmentLog,
  } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterIrrigation, setFilterIrrigation] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['parc_02']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [parcelToEdit, setParcelToEdit] = useState<AgriParcel | null>(null);

  const [selectedParcel, setSelectedParcel] = useState<AgriParcel | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('agronomy');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  useEffect(() => {
    if (selectedParcelId && parcels.some((p) => p.id === selectedParcelId)) {
      const match = parcels.find((p) => p.id === selectedParcelId);
      if (match) setInspectorNotes(match.notes || '');
    }
  }, [selectedParcelId, parcels]);

  const activeParcel = useMemo(() => {
    if (!selectedParcel) return null;
    return parcels.find((p) => p.id === selectedParcel.id) || selectedParcel;
  }, [selectedParcel, parcels]);

  const totalHectares = useMemo(
    () => parcels.reduce((acc, p) => acc + p.surfaceHectares, 0),
    [parcels]
  );
  const dripSurface = useMemo(
    () =>
      parcels
        .filter((p) => p.irrigationType === 'Drip')
        .reduce((acc, p) => acc + p.surfaceHectares, 0),
    [parcels]
  );
  const activeCrops = useMemo(
    () => parcels.filter((p) => p.status === 'Growing' || p.status === 'Harvesting').length,
    [parcels]
  );

  const branchOptions = useMemo(() => {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    parcels.forEach((p) => {
      const resolved = resolveRecordBranch(p, branchesById, currentBranch, language);
      const prev = counts.get(resolved.id);
      counts.set(resolved.id, {
        id: resolved.id,
        name: resolved.name,
        count: (prev?.count || 0) + 1,
      });
    });
    return [
      { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All' : 'Toutes', count: parcels.length },
      ...Array.from(counts.values()).map((b) => ({
        value: b.id,
        label: b.name,
        count: b.count,
      })),
    ];
  }, [parcels, branchesById, currentBranch, language, isAr, isEn]);

  const filteredParcels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parcels.filter((p) => {
      if (filterIrrigation !== 'All' && p.irrigationType !== filterIrrigation) return false;
      if (filterStatus === 'ActiveCrops' && p.status !== 'Growing' && p.status !== 'Harvesting') {
        return false;
      } else if (filterStatus !== 'All' && filterStatus !== 'ActiveCrops' && p.status !== filterStatus) {
        return false;
      }
      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(p, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCrop = (p.currentCrop?.toLowerCase() || '').includes(q);
        const matchesSoil = p.soilType.toLowerCase().includes(q);
        const matchesCode = (p.code || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCrop && !matchesSoil && !matchesCode) return false;
      }
      return true;
    });
  }, [
    parcels,
    filterIrrigation,
    filterStatus,
    branchFilter,
    branchesById,
    currentBranch,
    language,
    searchQuery,
  ]);

  const sortedParcels = useMemo(() => {
    const arr = [...filteredParcels];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortBy === 'surface' || sortBy === 'surfaceHectares') {
        return (a.surfaceHectares - b.surfaceHectares) * dir;
      }
      if (sortBy === 'irrigation' || sortBy === 'irrigationType') {
        return a.irrigationType.localeCompare(b.irrigationType) * dir;
      }
      if (sortBy === 'soilType') {
        return a.soilType.localeCompare(b.soilType) * dir;
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status) * dir;
      }
      if (sortBy === 'dates' || sortBy === 'expectedHarvestDate') {
        return (a.expectedHarvestDate || '').localeCompare(b.expectedHarvestDate || '') * dir;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * dir;
      }
      return a.name.localeCompare(b.name) * dir;
    });
    return arr;
  }, [filteredParcels, sortBy, sortDir, pinnedIds, branchesById, currentBranch, language]);

  const handleSelectParcel = useCallback(
    (p: AgriParcel, openerEl?: HTMLElement | null) => {
      if (openerEl) setDrawerOpenerEl(openerEl);
      setSelectedParcel(p);
      setSelectedParcelId(p.id);
      setInspectorNotes(p.notes || '');
      setActiveTab('agronomy');
    },
    [setSelectedParcelId]
  );

  const handleTogglePin = useCallback(
    (p: AgriParcel) => {
      const wasPinned = pinnedIds.has(p.id);
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(p.id)) next.delete(p.id);
        else next.add(p.id);
        return next;
      });
      showToast(
        wasPinned
          ? isAr ? 'تم إلغاء التثبيت' : 'Parcelle désépinglée'
          : isAr ? 'تم تثبيت القطعة' : 'Parcelle épinglée',
        'info'
      );
    },
    [pinnedIds, isAr]
  );

  const handleOpenAdd = useCallback(() => {
    setParcelToEdit(null);
    setIsParcelModalOpen(true);
  }, []);

  const handleEdit = useCallback((p: AgriParcel) => {
    setParcelToEdit(p);
    setIsParcelModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (p: AgriParcel) => {
      deleteParcel(p.id);
      if (selectedParcel?.id === p.id) setSelectedParcel(null);
      showToast(isAr ? 'تم حذف القطعة الفلاحية' : 'Parcelle agricole supprimée', 'success');
    },
    [deleteParcel, selectedParcel, isAr]
  );

  const handleQuickCycle = useCallback(
    (p: AgriParcel) => {
      const nextStatus: AgriParcelStatus =
        p.status === 'Growing' ? 'Harvesting' : p.status === 'Harvesting' ? 'Fallow' : 'Growing';
      const updated: AgriParcel = {
        ...p,
        status: nextStatus,
      };
      updateParcel(updated);
      if (selectedParcel?.id === p.id) setSelectedParcel(updated);
      showToast(
        isAr ? `تم تحديث الطور الزراعي: ${nextStatus}` : `Stade phénologique actualisé : ${nextStatus}`,
        'success'
      );
    },
    [updateParcel, selectedParcel, isAr]
  );

  const handleQuickTreatmentLog = useCallback(
    (p: AgriParcel) => {
      const today = new Date().toISOString().split('T')[0];
      const newTreat: AgriTreatmentLog = {
        id: `treat_${Date.now()}`,
        accountId: 'acc_01',
        businessId: p.businessId,
        branchId: p.branchId,
        staffId: p.staffId,
        parcelId: p.id,
        treatmentDate: today,
        commercialProductName: 'Fertilisant Foliar Oligo-Mix (Bio)',
        activeIngredient: 'Oligo-éléments chélatés Fe-Mn-Zn',
        targetPestDisease: 'Optimisation de la nouaison & vigueur foliaire',
        dosagePerHa: '3.0 L/ha',
        darDays: 3,
        harvestAllowedDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
        operatorName: 'Équipe Agronomie Domaine',
        notes: 'Application matinale par rampe basse. DAR 3 jours respecté.',
        createdAt: new Date().toISOString(),
      };
      addTreatmentLog(newTreat);
      showToast(
        isAr
          ? 'تم قيد معالجة زراعية في السجل النباتي'
          : 'Traitement consigné dans le carnet phytosanitaire',
        'success'
      );
      if (selectedParcel?.id === p.id) setActiveTab('treatments');
    },
    [addTreatmentLog, selectedParcel, isAr]
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      'Code',
      'Nom Parcelle',
      'Surface (ha)',
      'Culture',
      'Mode Irrigation',
      'Type Sol',
      'Agence / Domaine',
      'Semis',
      'Récolte Prévue',
      'Statut',
    ];
    const rows = sortedParcels.map((p) => [
      p.code || '',
      p.name,
      p.surfaceHectares,
      p.currentCrop || '',
      p.irrigationType,
      p.soilType,
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
      p.plantingDate || '',
      p.expectedHarvestDate || '',
      p.status,
    ]);
    downloadCsvSafe(
      `parcelles_agricoles_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير ملف القطع الفلاحية CSV' : 'Export CSV du parcellaire généré', 'info');
  }, [sortedParcels, branchesById, currentBranch, language, isAr]);

  const handleSaveNotes = useCallback(() => {
    if (!activeParcel) return;
    const updated: AgriParcel = { ...activeParcel, notes: inspectorNotes };
    updateParcel(updated);
    setSelectedParcel(updated);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ التوجيهات الزراعية' : 'Cahier agronomique mis à jour', 'success');
  }, [activeParcel, inspectorNotes, updateParcel, isAr]);

  const currentTreatments = useMemo(() => {
    if (!activeParcel) return [];
    return treatmentLogs.filter((t) => t.parcelId === activeParcel.id);
  }, [treatmentLogs, activeParcel]);

  const currentHarvests = useMemo(() => {
    if (!activeParcel) return [];
    return (harvestTickets as AgriHarvestTicket[]).filter((h) => h.parcelId === activeParcel.id);
  }, [harvestTickets, activeParcel]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterIrrigation !== 'All') count += 1;
    if (filterStatus !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [filterIrrigation, filterStatus, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterIrrigation !== 'All') {
      chips.push({
        key: 'irrigation',
        label: `${isAr ? 'الري' : 'Irrigation'}: ${filterIrrigation}`,
        onRemove: () => setFilterIrrigation('All'),
      });
    }
    if (filterStatus !== 'All') {
      chips.push({
        key: 'status',
        label: `${isAr ? 'الطور' : 'Stade'}: ${filterStatus}`,
        onRemove: () => setFilterStatus('All'),
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
  }, [filterIrrigation, filterStatus, branchFilter, branchOptions, isAr]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterIrrigation('All');
    setFilterStatus('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'irrigation',
        kind: 'segmented',
        label: isAr ? 'نظام الري' : isEn ? 'Irrigation Mode' : "Système d'Irrigation",
        value: filterIrrigation,
        onChange: setFilterIrrigation,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: parcels.length },
          {
            value: 'Drip',
            label: isAr ? 'تقطير' : 'Goutte-à-goutte',
            count: parcels.filter((p) => p.irrigationType === 'Drip').length,
          },
          {
            value: 'Pivot',
            label: isAr ? 'محوري' : 'Pivot',
            count: parcels.filter((p) => p.irrigationType === 'Pivot').length,
          },
          {
            value: 'Gravity',
            label: isAr ? 'انسيابي' : 'Gravitaire',
            count: parcels.filter((p) => p.irrigationType === 'Gravity').length,
          },
        ],
      },
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'الطور الزراعي' : isEn ? 'Growth Phase' : 'Stade Phénologique',
        value: filterStatus,
        onChange: setFilterStatus,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: parcels.length },
          { value: 'ActiveCrops', label: isAr ? 'قيد الإنتاج' : 'En Production', count: activeCrops },
          {
            value: 'Harvesting',
            label: isAr ? 'في الحصاد' : 'Récolte',
            count: parcels.filter((p) => p.status === 'Harvesting').length,
          },
          {
            value: 'Fallow',
            label: isAr ? 'راحة' : 'Jachère',
            count: parcels.filter((p) => p.status === 'Fallow').length,
          },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'المزرعة / الفرع' : isEn ? 'Branch / Estate' : 'Exploitation / Domaine',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, filterIrrigation, filterStatus, branchFilter, parcels, activeCrops, branchOptions]
  );

  const columns: ColumnDefinition<AgriParcel>[] = useMemo(
    () => [
      {
        key: 'name',
        header: isAr ? 'القطعة الزراعية' : 'Désignation Parcelle',
        width: '2.3*',
        sortable: true,
        renderCell: (p) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0"
            >
              <Sprout size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{p.name}</span>
                {pinnedIds.has(p.id) && (
                  <Pin size={10} className="fill-[#d4522f] text-[#d4522f] shrink-0" />
                )}
              </div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                {p.currentCrop || '—'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'surface',
        header: isAr ? 'المساحة' : 'Surface (ha)',
        width: '1.1*',
        sortable: true,
        renderCell: (p) => (
          <div className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {p.surfaceHectares} ha
          </div>
        ),
      },
      {
        key: 'irrigation',
        header: isAr ? 'نظام الري' : 'Irrigation',
        width: '1.3*',
        sortable: true,
        renderCell: (p) => (
          <div className="flex items-center gap-1.5 text-xs text-black/70 dark:text-white/75 truncate">
            <Droplets size={13} className="text-blue-500 shrink-0" />
            <span className="truncate">
              {p.irrigationType === 'Drip'
                ? 'Goutte-à-goutte'
                : p.irrigationType === 'Pivot'
                ? 'Pivot'
                : p.irrigationType === 'Gravity'
                ? 'Gravitaire'
                : 'Bour (Pluvial)'}
            </span>
          </div>
        ),
      },
      {
        key: 'soilType',
        header: isAr ? 'التربة' : 'Nature du Sol',
        width: '1.3*',
        sortable: true,
        renderCell: (p) => (
          <div className="text-xs text-black/70 dark:text-white/75 truncate">{p.soilType}</div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Domaine',
        width: '1.2*',
        sortable: true,
        renderCell: (p) => (
          <span className="text-xs text-black/65 dark:text-white/70 truncate block">
            {resolveRecordBranch(p, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الطور' : isEn ? 'Stage' : 'Stade',
        width: '1.2*',
        sortable: true,
        renderCell: (p) => {
          let badgeColor =
            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
          let label = isAr ? 'نمو' : isEn ? 'Growing' : 'En Végétation';
          if (p.status === 'Harvesting') {
            badgeColor =
              'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
            label = isAr ? 'في الحصاد' : isEn ? 'Harvesting' : 'En Récolte';
          } else if (p.status === 'Fallow') {
            badgeColor =
              'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
            label = isAr ? 'راحة' : isEn ? 'Fallow' : 'Jachère';
          }
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: 'dates',
        header: isAr ? 'تاريخ الحصاد' : 'Récolte Prévue',
        width: '1.1*',
        sortable: true,
        renderCell: (p) => (
          <div className="text-xs font-mono text-black/70 dark:text-white/75">
            {p.expectedHarvestDate || '—'}
          </div>
        ),
      },
    ],
    [isAr, isEn, pinnedIds, branchesById, currentBranch, language]
  );

  const getRowMeta = useCallback(
    (p: AgriParcel): Partial<KineticRowData> => {
      const branchName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      const statusVariant =
        p.status === 'Harvesting' ? 'active' : p.status === 'Fallow' ? 'warning' : 'neutral';
      const statusLabel =
        p.status === 'Harvesting'
          ? isAr ? 'في الحصاد' : isEn ? 'Harvesting' : 'En Récolte'
          : p.status === 'Fallow'
          ? isAr ? 'راحة' : isEn ? 'Fallow' : 'Jachère'
          : isAr ? 'نمو' : isEn ? 'Growing' : 'En Végétation';
      return {
        subline: `${p.currentCrop || 'Jachère'} · ${p.soilType}`,
        categoryLabel:
          p.irrigationType === 'Drip'
            ? 'Goutte-à-goutte'
            : p.irrigationType === 'Pivot'
            ? 'Pivot'
            : p.irrigationType,
        statusLabel,
        statusVariant,
        metricPrimary: `${p.surfaceHectares} ha`,
        metricSecondary: p.expectedHarvestDate || '—',
        detailCol1: {
          heading: isAr ? 'القطعة والموقع' : isEn ? 'Parcel & Soil' : 'Parcelle & Sol',
          primaryText: p.name,
          secondaryText: `${p.soilType} · ${p.surfaceHectares} ha`,
          tertiaryText: branchName,
        },
        detailCol2: {
          heading: isAr ? 'المحصول والري' : isEn ? 'Crop & Irrigation' : 'Culture & Irrigation',
          primaryText: p.currentCrop || 'Aucune culture en terre',
          secondaryText: `Mode: ${p.irrigationType}`,
          tertiaryText: `Code ${p.code || 'CAD'}`,
        },
        detailCol3: {
          heading: isAr ? 'مواعيد الحملة' : isEn ? 'Season Dates' : 'Dates campagne',
          primaryText: p.expectedHarvestDate ? `Récolte ${p.expectedHarvestDate}` : statusLabel,
          secondaryText: `Semis: ${p.plantingDate || '—'}`,
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getFanActions = useCallback(
    (p: AgriParcel): KineticRowFanAction[] => [
      {
        id: 'treat',
        label: isAr ? 'معالجة' : 'Phyto',
        icon: <ShieldCheck className="w-[15px] h-[15px]" />,
        onClick: () => handleQuickTreatmentLog(p),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-[15px] h-[15px]" />,
        onClick: () => handleEdit(p),
      },
      {
        id: 'open',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Sprout className="w-[15px] h-[15px]" />,
        onClick: (e) => handleSelectParcel(p, e.currentTarget),
      },
    ],
    [handleQuickTreatmentLog, handleEdit, handleSelectParcel, isAr, isEn]
  );

  const getDetailActions = useCallback(
    (p: AgriParcel): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'معاينة القطعة' : isEn ? 'Inspect Parcel' : 'Ouvrir fiche',
        icon: <Sprout className="w-3.5 h-3.5" />,
        onClick: () => handleSelectParcel(p),
      },
      {
        id: 'cycle',
        label: isAr ? 'تغيير الطور' : 'Avancer stade',
        icon: <Activity className="w-3.5 h-3.5 text-[#096b40]" />,
        onClick: () => handleQuickCycle(p),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-3.5 h-3.5" />,
        onClick: () => handleEdit(p),
      },
    ],
    [handleSelectParcel, handleQuickCycle, handleEdit, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: parcels.length > 0,
  });

  if (showSkeleton && (parcels.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.3*', minWidth: '120px' },
          { width: '1.3*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
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
        title={isAr ? 'القطع' : isEn ? 'Parcels' : 'Parcelles'}
        primaryAction={{
          label: isAr ? 'قطعة جديدة' : isEn ? 'New Parcel' : 'Nouvelle Parcelle',
          onClick: handleOpenAdd,
          dataAction: 'add-parcel',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'توزيع الأراضي الزراعية ونظم الري'
            : isEn
            ? 'Estate Acreage & Irrigation Allocation'
            : 'Répartition du Domaine & Assolement'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'القطع قيد الإنتاج الفعلي' : isEn ? 'Active Crops' : 'Cultures Actives en Terre',
          badgeText: isAr ? 'نشط' : isEn ? 'Growing' : 'En Végétation',
          count: activeCrops,
          tone: 'emerald',
          isActive: filterStatus === 'ActiveCrops',
          onToggle: () =>
            setFilterStatus((prev) => (prev === 'ActiveCrops' ? 'All' : 'ActiveCrops')),
        }}
        secondaryCard={{
          label: isAr
            ? 'المساحة المسقية بالتقطير'
            : isEn
            ? 'Drip Irrigated Ha'
            : 'Surfaces Goutte-à-Goutte',
          badgeText: isAr ? 'بالتقطير' : 'Drip',
          count: Math.round(dripSurface * 10),
          formatValue: (v) => `${(v / 10).toFixed(1)} ha`,
          tone: 'terracotta',
          isActive: filterIrrigation === 'Drip',
          onToggle: () => setFilterIrrigation((prev) => (prev === 'Drip' ? 'All' : 'Drip')),
        }}
        darkCard={{
          label: isAr
            ? 'المساحة الكلية للمستثمرة'
            : isEn
            ? 'Total Estate Area'
            : 'Superficie Totale Domaine',
          badgeCount: parcels.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'قطعة' : isEn ? 'parcels' : 'parcelles',
          valueCount: Math.round(totalHectares * 10),
          valuePrefix: '',
          formatValue: (v) => `${(v / 10).toFixed(1)} ha`,
          caption: isAr ? 'سجل المسح الفلاحي والموارد' : isEn ? 'Estate Cadastre & Irrigated Registry' : 'Agri-Exploitation · Parcellaire cadastral',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'سجل القطع الفلاحية والبيوت المحمية'
              : isEn
              ? 'Cadastre & Greenhouse Registry'
              : 'Cadastre Parcellaire & Blocs de Serres'
          }
          liveRegionText={`${sortedParcels.length} ${isAr ? 'قطعة' : isEn ? 'parcels' : 'parcelles'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث بالقطعة، المحصول، نوع التربة...'
              : isEn
              ? 'Search parcel, crop, soil type...'
              : 'Rechercher parcelle, culture, type de sol...'
          }
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: parcels.length },
            {
              value: 'Drip',
              label: isAr ? 'تقطير' : isEn ? 'Drip' : 'Goutte-à-goutte',
              count: parcels.filter((p) => p.irrigationType === 'Drip').length,
            },
            {
              value: 'Pivot',
              label: isAr ? 'محوري' : 'Pivot',
              count: parcels.filter((p) => p.irrigationType === 'Pivot').length,
            },
          ]}
          statusValue={filterIrrigation}
          onStatusChange={setFilterIrrigation}
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

        <UniversalDataCollection<AgriParcel>
          hideToolbar
          items={sortedParcels}
          columns={columns}
          keyExtractor={(p) => p.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير السجل العقاري' : 'Exporter Parcelles',
            icon: <Download size={14} />,
            onClick: () => handleExportCsv(),
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteParcel(id));
            setSelectedIds(new Set<string>());
            if (selectedParcel && ids.has(selectedParcel.id)) setSelectedParcel(null);
            showToast(
              isAr ? 'تم حذف القطع الفلاحية المحددة' : 'Parcelles sélectionnées supprimées',
              'info'
            );
          }}
          isPinned={(p) => pinnedIds.has(p.id)}
          onTogglePin={handleTogglePin}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          openItemId={activeParcel?.id || null}
          onItemClick={handleSelectParcel}
          onViewDetails={handleSelectParcel}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyTitle={isAr ? 'لا توجد قطع فلاحية' : isEn ? 'No parcels found' : 'Aucune parcelle trouvée'}
          emptyDescription={
            searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : isEn ? 'No parcels match your search' : 'Aucun résultat ne correspond à votre recherche'
              : isAr ? 'قم بإضافة أول قطعة زراعية للبدء' : isEn ? 'Create your first farm parcel' : 'Créez votre première parcelle de culture'
          }
          primaryActionLabel={isAr ? 'قطعة جديدة' : isEn ? 'New Parcel' : 'Nouvelle Parcelle'}
          onAddFirstItem={handleOpenAdd}
          onResetFilters={resetAllFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          customActions={(p) => [
            {
              id: 'treatment',
              label: isAr ? 'معالجة نباتية' : 'Traitement Phyto',
              icon: <ShieldCheck size={14} />,
              onClick: () => handleQuickTreatmentLog(p),
            },
            {
              id: 'cycle',
              label: isAr ? 'تغيير الطور' : 'Avancer Stade',
              icon: <Activity size={14} />,
              onClick: () => handleQuickCycle(p),
            },
          ]}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedParcels.length}
        entityPluralLabel={isAr ? 'قطع' : 'parcelles'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<AgriParcel>
        isOpen={Boolean(activeParcel)}
        item={activeParcel}
        allItems={sortedParcels}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeParcel?.name || ''}
        subtitle={
          activeParcel
            ? `${activeParcel.surfaceHectares} ha · ${activeParcel.currentCrop || '—'}`
            : undefined
        }
        categoryLabel={activeParcel?.irrigationType}
        avatarText={((activeParcel?.code || '').replace(/[^A-Za-z0-9]/g, '') || activeParcel?.name || 'PA').slice(0, 2).toUpperCase()}
        branchName={
          activeParcel
            ? resolveRecordBranch(activeParcel, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeParcel?.status === 'Harvesting'
            ? isAr ? 'في الجني' : isEn ? 'Harvesting' : 'En Récolte'
            : activeParcel?.status === 'Growing'
            ? isAr ? 'في طور النمو' : isEn ? 'Growing' : 'En Végétation'
            : activeParcel?.status === 'Fallow'
            ? isAr ? 'أرض بور' : isEn ? 'Fallow' : 'Jachère'
            : activeParcel?.status
        }
        statusClassName={
          activeParcel?.status === 'Harvesting'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : activeParcel?.status === 'Growing'
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'agronomy', label: isAr ? 'الزراعة' : isEn ? 'Agronomy' : 'Agronomie' },
          {
            id: 'treatments',
            label: `${isAr ? 'المعالجات' : 'Phyto DAR'} (${currentTreatments.length})`,
          },
          {
            id: 'harvests',
            label: `${isAr ? 'الحصاد' : 'Récolte'} (${currentHarvests.length})`,
          },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => handleSelectParcel(item)}
        onClose={() => setSelectedParcel(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(item, tab) => {
          if (tab === 'treatments') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'السجل النباتي' : isEn ? 'Phytosanitary Log' : 'Traitements & DAR'}>
                  {currentTreatments.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`agri-treat-${item.id}`}>
                      <EmptyState
                        variant="compact"
                        tone="positive"
                        icon={<ShieldCheck />}
                        title={isAr ? 'لا توجد معالجات مسجلة' : 'Aucun traitement phytosanitaire consigné'}
                        description="Historique INPV vierge"
                        secondaryAction={{
                          label: isAr ? 'قيد معالجة' : 'Consigner un traitement',
                          onClick: () => handleQuickTreatmentLog(item),
                        }}
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {currentTreatments.map((t, idx) => (
                        <InspectorListItem
                          key={t.id}
                          title={t.commercialProductName}
                          subtitle={`${t.activeIngredient} · ${t.treatmentDate}`}
                          metaRight={`→ ${t.harvestAllowedDate}`}
                          badge={{ label: `DAR ${t.darDays}j`, tone: 'warn' }}
                          isLast={idx === currentTreatments.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
                </InspectorSection>
                {currentTreatments.length > 0 && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={isAr ? '+ قيد معالجة جديدة' : '+ Consigner un traitement phyto'}
                      onClick={() => handleQuickTreatmentLog(item)}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }

          if (tab === 'harvests') {
            return (
              <InspectorSection index={0} title={isAr ? 'تذاكر الحصاد' : isEn ? 'Harvest Tickets' : 'Bons de récolte'}>
                {currentHarvests.length === 0 ? (
                  <KineticEmptyStateMotion motionKey={`agri-harv-${item.id}`}>
                    <EmptyState
                      variant="compact"
                      icon={<Package />}
                      title={isAr ? 'لا توجد تذاكر جني مسجلة' : 'Aucun bon de pesée consigné'}
                      description="Aucune expédition rattachée à cette parcelle"
                    />
                  </KineticEmptyStateMotion>
                ) : (
                  <InspectorCard>
                    {currentHarvests.map((h, idx) => (
                      <InspectorListItem
                        key={h.id}
                        title={h.ticketCode || h.ticketNumber}
                        subtitle={`${h.cropDesignation} · ${h.harvestDate || h.date}`}
                        metaRight={`${h.netWeightKg} Kg`}
                        badge={{ label: h.qualityGrade || 'Standard', tone: 'ok' }}
                        isLast={idx === currentHarvests.length - 1}
                      />
                    ))}
                  </InspectorCard>
                )}
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
                      onClick: () => handleEdit(item),
                    },
                    {
                      id: 'treat',
                      label: isAr ? 'معالجة' : 'Traitement',
                      icon: <ShieldCheck className="w-[18px] h-[18px]" />,
                      onClick: () => handleQuickTreatmentLog(item),
                    },
                    {
                      id: 'cycle',
                      label: isAr ? 'الطور التالي' : 'Stade +',
                      icon: <Activity className="w-[18px] h-[18px]" />,
                      onClick: () => handleQuickCycle(item),
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(item.id)
                        ? isAr ? 'إلغاء تثبيت' : 'Désépingler'
                        : isAr ? 'تثبيت' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handleTogglePin(item),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'البيانات الزراعية' : isEn ? 'Parcel Cadastre' : 'Cadastre & Pédologie'}>
                <InspectorCard>
                  <InspectorKeyValue label="Surface cadastrale" value={`${item.surfaceHectares} Hectares`} />
                  <InspectorKeyValue label="Culture en place" value={item.currentCrop || '—'} tone="ok" mono={false} />
                  <InspectorKeyValue label="Système d'irrigation" value={item.irrigationType} mono={false} />
                  <InspectorKeyValue label="Pédologie / Sol" value={item.soilType} mono={false} />
                  <InspectorKeyValue label="Date de semis" value={item.plantingDate || '—'} />
                  <InspectorKeyValue label="Récolte prévisionnelle" value={item.expectedHarvestDate || '—'} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'كراس الحقل' : isEn ? 'Agronomy Notebook' : 'Cahier agronomique'}>
                <InspectorNotesField
                  value={inspectorNotes}
                  onSave={handleSaveNotes}
                  placeholder={
                    isAr
                      ? 'سجل ملاحظات التربة، رطوبة الحقل، مكافحة الأعشاب الضارة...'
                      : 'Noter les analyses de sève, relevés tensiométriques, apports NPK...'
                  }
                />
              </InspectorSection>
            </>
          );
        }}
      />

      <AgricultureParcelModal
        isOpen={isParcelModalOpen}
        onClose={() => {
          setIsParcelModalOpen(false);
          setParcelToEdit(null);
        }}
        onSave={(parcel) => {
          if (parcelToEdit) {
            updateParcel(parcel);
            if (selectedParcel?.id === parcel.id) setSelectedParcel(parcel);
          } else {
            addParcel(parcel);
            setSelectedParcel(parcel);
          }
          setIsParcelModalOpen(false);
          setParcelToEdit(null);
        }}
        initialData={parcelToEdit}
      />
    </div>
  );
};
