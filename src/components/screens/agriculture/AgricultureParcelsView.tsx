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
import { useAtriumStore, showToast } from '../../../services/store';
import { AgriParcel, AgriParcelStatus, AgriTreatmentLog, AgriHarvestTicket } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AgricultureParcelModal } from './AgricultureParcelModal';
import { AtriumButton } from '../../ui/AtriumButton';
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
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();
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
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
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
        subtitle={
          isAr
            ? `${parcels.length} قطعة فلاحية · ${totalHectares.toFixed(1)} هكتار`
            : isEn
            ? `${parcels.length} farm parcels · ${totalHectares.toFixed(1)} ha`
            : `${parcels.length} parcelles cadastrales · ${totalHectares.toFixed(1)} ha exploités`
        }
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
            {
              value: 'Gravity',
              label: isAr ? 'انسيابي' : isEn ? 'Gravity' : 'Gravitaire',
              count: parcels.filter((p) => p.irrigationType === 'Gravity').length,
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
          data={sortedParcels}
          columns={columns}
          keyExtractor={(p) => p.id}
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
          renderCard={(p) => (
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {p.surfaceHectares} ha
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'Growing'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      : p.status === 'Harvesting'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                  {p.name}
                </h3>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  {p.currentCrop}
                </div>
              </div>
              <div className="text-xs text-black/70 dark:text-white/75 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <Droplets size={13} className="shrink-0 text-blue-500" />
                  <span className="text-[11px]">{p.irrigationType}</span>
                </div>
                <span className="text-[10px] text-black/55 dark:text-white/55 truncate max-w-[110px]">
                  {p.soilType}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <div className="text-[11px] text-black/55 dark:text-white/55">
                  Semis: <span className="font-mono text-black/70 dark:text-white/75">{p.plantingDate || '—'}</span>
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55">
                  Récolte:{' '}
                  <span className="font-mono text-black/70 dark:text-white/75">
                    {p.expectedHarvestDate || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
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
            ? `${activeParcel.surfaceHectares} ha • ${activeParcel.currentCrop || '—'}`
            : undefined
        }
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
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
            : activeParcel?.status === 'Growing'
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
        }
        tabs={[
          { id: 'agronomy', label: isAr ? 'الزراعة' : 'Agronomie' },
          {
            id: 'treatments',
            label: `${isAr ? 'المعالجات' : 'Phyto & DAR'} (${currentTreatments.length})`,
          },
          {
            id: 'harvests',
            label: `${isAr ? 'الحصاد' : 'Récolte'} (${currentHarvests.length})`,
          },
          { id: 'notes', label: isAr ? 'الكراس' : 'Cahier' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => handleSelectParcel(item)}
        onClose={() => setSelectedParcel(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(item, tab) => (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                variant="outline"
                size="sm"
                onClick={() => handleQuickTreatmentLog(item)}
                icon={<ShieldCheck size={13} />}
              >
                {isAr ? 'معالجة' : 'Traitement'}
              </AtriumButton>
              <AtriumButton
                variant="outline"
                size="sm"
                onClick={() => handleQuickCycle(item)}
                icon={<Activity size={13} />}
              >
                {isAr ? 'الطور التالي' : 'Avancer Cycle'}
              </AtriumButton>
              <AtriumButton
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(item)}
                icon={<Edit size={13} />}
              >
                {isAr ? 'تعديل' : 'Modifier'}
              </AtriumButton>
            </div>

            {tab === 'agronomy' && (
              <div className="space-y-3 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'المساحة:' : 'Surface Cadastrale:'}
                    </span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {item.surfaceHectares} Hectares
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'المحصول المزروع:' : 'Culture en Place:'}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.currentCrop || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'طريقة الري:' : "Système d'Irrigation:"}
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      {item.irrigationType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'نوع التربة:' : 'Pédologie / Sol:'}
                    </span>
                    <span className="text-black dark:text-white">{item.soilType}</span>
                  </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'تاريخ الغرس / البذر:' : 'Date de Semis:'}
                    </span>
                    <span className="text-black dark:text-white font-mono">
                      {item.plantingDate || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'تاريخ الحصاد المتوقع:' : 'Récolte Prévisionnelle:'}
                    </span>
                    <span className="text-black dark:text-white font-mono">
                      {item.expectedHarvestDate || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'treatments' && (
              <div className="space-y-3 text-xs">
                {currentTreatments.length === 0 ? (
                  <div className="text-center py-8 text-black/55 dark:text-white/55">
                    <ShieldCheck size={28} className="mx-auto mb-2 opacity-40" />
                    <p>
                      {isAr
                        ? 'لا توجد معالجات مسجلة'
                        : 'Aucun traitement phytosanitaire consigné'}
                    </p>
                    <AtriumButton
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleQuickTreatmentLog(item)}
                    >
                      {isAr ? '+ قيد معالجة جديدة' : '+ Consigner un traitement'}
                    </AtriumButton>
                  </div>
                ) : (
                  currentTreatments.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-black dark:text-white text-[11px]">
                          {t.commercialProductName}
                        </span>
                        <span className="font-mono text-[10px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-1.5 py-0.5 rounded font-bold">
                          DAR: {t.darDays}j
                        </span>
                      </div>
                      <p className="text-[11px] text-black/70 dark:text-white/75">
                        {t.activeIngredient} • {t.dosagePerHa}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-black/55 dark:text-white/55 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                        <span>Date: {t.treatmentDate}</span>
                        <span className="text-emerald-600 font-semibold">
                          Récolte auto: {t.harvestAllowedDate}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'harvests' && (
              <div className="space-y-3 text-xs">
                {currentHarvests.length === 0 ? (
                  <div className="text-center py-8 text-black/55 dark:text-white/55">
                    <Package size={28} className="mx-auto mb-2 opacity-40" />
                    <p>
                      {isAr
                        ? 'لا توجد تذاكر جني مسجلة'
                        : 'Aucun bon de pesée / récolte consigné'}
                    </p>
                  </div>
                ) : (
                  currentHarvests.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[11px] text-[#d4522f]">
                          {h.ticketCode || h.ticketNumber}
                        </span>
                        <span className="font-mono font-bold text-black dark:text-white">
                          {h.netWeightKg} Kg
                        </span>
                      </div>
                      <div className="text-[11px] text-black/70 dark:text-white/75">
                        {h.cropDesignation} • {h.qualityGrade || 'Standard'}
                      </div>
                      <div className="text-[10px] text-black/55 dark:text-white/55">
                        Date: {h.harvestDate || h.date} •{' '}
                        {h.destinationStorage || h.destinationWholesaleMarket}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 text-xs">
                <p className="text-black/55 dark:text-white/55 text-[11px]">
                  {isAr
                    ? 'كراس الحقل والملاحظات الفلاحية وبرامج التسميد والمكافحة:'
                    : "Cahier d'exploitation agronomique, calendrier d'irrigation et doses d'engrais :"}
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'سجل ملاحظات التربة، رطوبة الحقل، مكافحة الأعشاب الضارة...'
                      : 'Noter les analyses de sève, relevés tensiométriques, apports NPK en fertigation...'
                  }
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-1 focus:ring-[#d4522f] outline-hidden resize-none"
                />
                <AtriumButton
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={handleSaveNotes}
                  icon={noteSaved ? <Check size={14} /> : <Save size={14} />}
                >
                  {noteSaved
                    ? isAr ? 'تم الحفظ بنجاح' : 'Cahier agronomique mis à jour'
                    : isAr ? 'حفظ الملاحظات' : 'Enregistrer dans le cahier'}
                </AtriumButton>
              </div>
            )}
          </div>
        )}
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
