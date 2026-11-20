import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Layers,
  Plus,
  X,
  Milk,
  Edit,
  AlertTriangle,
  Tag,
  Thermometer,
  FileText,
  Pin,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  showToast,
} from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriLivestock, AgriMilkingRecord, CowReproStatus } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { OnilBordereauPrintModal } from './OnilBordereauPrintModal';
import { AgriMilkingModal } from './AgriMilkingModal';
import { formatMoney } from '../../../utils/rules';
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
  InspectorBigStat,
  InspectorNotesField,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (v: unknown): string => {
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (v && typeof v === 'object' && 'target' in v) {
    const tgt = (v as { target?: { value?: string } }).target;
    if (tgt && typeof tgt.value === 'string') return tgt.value;
  }
  return String(v ?? '');
};

export const AgricultureLivestockView: React.FC = () => {
  const {
    language,
    currentBusiness,
    currentBranch,
    branches,
    currentUser,
    isSyncing,
    networkMode,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      currentUser: s.currentUser,
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
    livestock,
    milkingRecords,
    addLivestock,
    updateLivestock,
    deleteLivestock,
    addMilkingRecord,
    deleteMilkingRecord,
  } = useAgricultureData();

  const [activeTabMode, setActiveTabMode] = useState<'cheptel' | 'milking'>('cheptel');
  const [isOnilModalOpen, setIsOnilModalOpen] = useState(false);
  const [isMilkingModalOpen, setIsMilkingModalOpen] = useState(false);
  const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<AgriLivestock | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [healthFilter, setHealthFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['cow_01']));
  const [sortBy, setSortBy] = useState<string>('earTagNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [earTag, setEarTag] = useState('DZ-16-');
  const [nameOrNumber, setNameOrNumber] = useState('La Noire');
  const [species, setSpecies] = useState<'Bovine' | 'Ovine' | 'Caprine' | 'Other'>('Bovine');
  const [breed, setBreed] = useState('Holstein');
  const [gender, setGender] = useState<'Female' | 'Male'>('Female');
  const [reproStatus, setReproStatus] = useState<CowReproStatus>('Lactation');
  const [lactationNumber, setLactationNumber] = useState('2');
  const [birthDate, setBirthDate] = useState('2023-05-10');
  const [milkProduction, setMilkProduction] = useState('25.0');
  const [healthStatus, setHealthStatus] = useState<'Healthy' | 'InTreatment' | 'Quarantine' | 'Sick'>('Healthy');
  const [notes, setNotes] = useState('Vaccination à jour. Bon état corporel.');

  const [selectedAnimal, setSelectedAnimal] = useState<AgriLivestock | null>(null);
  const [selectedMilking, setSelectedMilking] = useState<AgriMilkingRecord | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [animalTab, setAnimalTab] = useState<string>('overview');
  const [milkingTab, setMilkingTab] = useState<string>('overview');
  const [animalNotesDraft, setAnimalNotesDraft] = useState<string>('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeAnimal = useMemo(() => {
    if (!selectedAnimal) return null;
    return livestock.find((a) => a.id === selectedAnimal.id) || selectedAnimal;
  }, [selectedAnimal, livestock]);

  const activeMilking = useMemo(() => {
    if (!selectedMilking) return null;
    return milkingRecords.find((m) => m.id === selectedMilking.id) || selectedMilking;
  }, [selectedMilking, milkingRecords]);

  const openCreateModal = useCallback(() => {
    setAnimalToEdit(null);
    setEarTag(`DZ-16-${Math.floor(10000 + Math.random() * 90000)}`);
    setNameOrNumber('Vache Laitière');
    setSpecies('Bovine');
    setBreed('Holstein');
    setGender('Female');
    setReproStatus('Lactation');
    setLactationNumber('2');
    setBirthDate('2023-05-10');
    setMilkProduction('25.0');
    setHealthStatus('Healthy');
    setNotes('Vaccination à jour. Bon état corporel.');
    setIsAnimalModalOpen(true);
  }, []);

  const openEditModal = useCallback((a: AgriLivestock) => {
    setAnimalToEdit(a);
    setEarTag(a.earTagNumber);
    setNameOrNumber(a.nameOrNumber || a.earTagNumber);
    setSpecies(a.species || 'Bovine');
    setBreed(String(a.breed));
    setGender(a.gender || 'Female');
    setReproStatus(a.reproStatus || 'Lactation');
    setLactationNumber(String(a.lactationNumber || 1));
    setBirthDate(a.birthDate || '2023-05-10');
    setMilkProduction(String(a.dailyProductionLiters || a.dailyAvgLiters || '20.0'));
    setHealthStatus(a.healthStatus || (a.isInWithholdingLockout ? 'InTreatment' : 'Healthy'));
    setNotes(a.notes || '');
    setIsAnimalModalOpen(true);
  }, []);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!earTag.trim()) {
      showToast(
        isAr ? 'يرجى إدخال رقم الحلقة / الترقيم' : 'Veuillez saisir le numéro de boucle',
        'error'
      );
      return;
    }
    const payload: AgriLivestock = {
      id: animalToEdit?.id || `ani_${Date.now()}`,
      accountId: animalToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: animalToEdit?.branchId || currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      earTagNumber: earTag.trim(),
      nameOrNumber: nameOrNumber.trim() || earTag.trim(),
      species,
      breed: breed.trim(),
      gender,
      birthDate,
      reproStatus,
      lactationNumber: parseInt(lactationNumber, 10) || 1,
      dailyAvgLiters: parseFloat(milkProduction) || 0,
      isInWithholdingLockout: healthStatus === 'InTreatment' || healthStatus === 'Quarantine',
      healthStatus,
      dailyProductionLiters:
        species === 'Bovine' && gender === 'Female' ? parseFloat(milkProduction) || 0 : undefined,
      notes: notes.trim(),
      createdAt: animalToEdit?.createdAt || new Date().toISOString(),
    };
    if (animalToEdit) {
      updateLivestock(payload);
      if (selectedAnimal?.id === payload.id) setSelectedAnimal(payload);
      showToast(isAr ? 'تم تحديث بيانات الحيوان' : 'Fiche animale mise à jour', 'success');
    } else {
      addLivestock(payload);
      setSelectedAnimal(payload);
      showToast(
        isAr ? 'تم تسجيل رأس الماشية في السجل البيطري' : 'Animal enregistré au carnet sanitaire',
        'success'
      );
    }
    setIsAnimalModalOpen(false);
  };

  const branchOptions = useMemo(() => {
    const records = activeTabMode === 'cheptel' ? livestock : milkingRecords;
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
  }, [activeTabMode, livestock, milkingRecords, branchesById, currentBranch, language, isAr, isEn]);

  const filteredAnimals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return livestock.filter((a) => {
      if (speciesFilter !== 'All' && (a.species || 'Bovine') !== speciesFilter) return false;
      const effectiveHealth =
        a.healthStatus || (a.isInWithholdingLockout ? 'InTreatment' : 'Healthy');
      if (healthFilter === 'Healthy' && effectiveHealth !== 'Healthy') return false;
      if (
        healthFilter === 'Withholding' &&
        effectiveHealth !== 'InTreatment' &&
        effectiveHealth !== 'Quarantine' &&
        !a.isInWithholdingLockout
      ) {
        return false;
      }
      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(a, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }
      if (q) {
        const matchesTag = a.earTagNumber.toLowerCase().includes(q);
        const matchesName = (a.nameOrNumber || '').toLowerCase().includes(q);
        const matchesBreed = String(a.breed || '').toLowerCase().includes(q);
        if (!matchesTag && !matchesName && !matchesBreed) return false;
      }
      return true;
    });
  }, [
    livestock,
    speciesFilter,
    healthFilter,
    branchFilter,
    branchesById,
    currentBranch,
    language,
    searchQuery,
  ]);

  const sortedAnimals = useMemo(() => {
    const arr = [...filteredAnimals];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortBy === 'reproStatus') return a.reproStatus.localeCompare(b.reproStatus) * dir;
      if (sortBy === 'healthStatus') {
        return (a.healthStatus || 'Healthy').localeCompare(b.healthStatus || 'Healthy') * dir;
      }
      if (sortBy === 'dailyProductionLiters') {
        return (
          ((a.dailyProductionLiters ?? a.dailyAvgLiters) -
            (b.dailyProductionLiters ?? b.dailyAvgLiters)) *
          dir
        );
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * dir;
      }
      return a.earTagNumber.localeCompare(b.earTagNumber) * dir;
    });
    return arr;
  }, [filteredAnimals, sortBy, sortDir, pinnedIds, branchesById, currentBranch, language]);

  const filteredMilking = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return milkingRecords.filter((m) => {
      if (branchFilter !== 'All') {
        const resolved = resolveRecordBranch(m, branchesById, currentBranch, language);
        if (resolved.id !== branchFilter) return false;
      }
      if (q) {
        const matchesDairy = m.destinationDairy.toLowerCase().includes(q);
        const matchesSlip = (m.dairyDeliverySlipNo || '').toLowerCase().includes(q);
        const matchesDate = m.sessionDate.toLowerCase().includes(q);
        if (!matchesDairy && !matchesSlip && !matchesDate) return false;
      }
      return true;
    });
  }, [milkingRecords, branchFilter, branchesById, currentBranch, language, searchQuery]);

  const sortedMilking = useMemo(() => {
    const arr = [...filteredMilking];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === 'conformingLiters') return (a.conformingLiters - b.conformingLiters) * dir;
      if (sortBy === 'tankTemperatureCelsius') {
        return (a.tankTemperatureCelsius - b.tankTemperatureCelsius) * dir;
      }
      if (sortBy === 'onilTotalSubsidyDzd') {
        return (a.onilTotalSubsidyDzd - b.onilTotalSubsidyDzd) * dir;
      }
      if (sortBy === 'destinationDairy') {
        return a.destinationDairy.localeCompare(b.destinationDairy) * dir;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * dir;
      }
      return a.sessionDate.localeCompare(b.sessionDate) * dir;
    });
    return arr;
  }, [filteredMilking, sortBy, sortDir, branchesById, currentBranch, language]);

  const totalMilkProduction = useMemo(
    () =>
      livestock.reduce((acc, a) => acc + (a.dailyProductionLiters ?? a.dailyAvgLiters ?? 0), 0),
    [livestock]
  );
  const bovineCount = useMemo(
    () => livestock.filter((a) => (a.species || 'Bovine') === 'Bovine').length,
    [livestock]
  );
  const treatmentCount = useMemo(
    () =>
      livestock.filter(
        (a) =>
          a.isInWithholdingLockout ||
          a.healthStatus === 'InTreatment' ||
          a.healthStatus === 'Quarantine'
      ).length,
    [livestock]
  );
  const totalMonthlyDeliveredLiters = useMemo(
    () => milkingRecords.reduce((acc, m) => acc + m.conformingLiters, 0),
    [milkingRecords]
  );
  const totalMonthlyOnilSubsidyDzd = useMemo(
    () => milkingRecords.reduce((acc, m) => acc + m.onilTotalSubsidyDzd, 0),
    [milkingRecords]
  );

  const handlePin = useCallback((item: AgriLivestock | AgriMilkingRecord) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    (a: AgriLivestock) => {
      deleteLivestock(a.id);
      if (selectedAnimal?.id === a.id) setSelectedAnimal(null);
      showToast(isAr ? 'تم حذف الحيوان من السجل' : 'Animal retiré du registre', 'info');
    },
    [deleteLivestock, selectedAnimal, isAr]
  );

  const handleToggleHealth = useCallback(
    (a: AgriLivestock) => {
      const currentlyHealthy =
        !a.isInWithholdingLockout && (!a.healthStatus || a.healthStatus === 'Healthy');
      const nextHealth = currentlyHealthy ? 'InTreatment' : 'Healthy';
      const updated: AgriLivestock = {
        ...a,
        healthStatus: nextHealth,
        isInWithholdingLockout: nextHealth === 'InTreatment',
      };
      updateLivestock(updated);
      if (selectedAnimal?.id === a.id) setSelectedAnimal(updated);
      showToast(
        isAr ? `تغيرت الحالة الصحية: ${nextHealth}` : `Statut sanitaire mis à jour : ${nextHealth}`,
        'info'
      );
    },
    [updateLivestock, selectedAnimal, isAr]
  );

  const handleExportCsv = useCallback(() => {
    if (activeTabMode === 'cheptel') {
      const headers = [
        'N° Boucle',
        'Nom/Numéro',
        'Espèce',
        'Race',
        'Agence / Ferme',
        'Statut Repro',
        'Statut Sanitaire',
        'Production L/j',
      ];
      const rows = sortedAnimals.map((a) => [
        a.earTagNumber,
        a.nameOrNumber || '',
        a.species || 'Bovine',
        String(a.breed),
        resolveRecordBranch(a, branchesById, currentBranch, language).name,
        a.reproStatus,
        a.healthStatus || (a.isInWithholdingLockout ? 'InTreatment' : 'Healthy'),
        a.dailyProductionLiters || a.dailyAvgLiters || 0,
      ]);
      downloadCsvSafe(
        `cheptel_bovin_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );
    } else {
      const headers = [
        'Date',
        'Session',
        'Agence / Ferme',
        'Volume Total Litres',
        'Volume Écarté',
        'Volume Conforme',
        'Température °C',
        'Laiterie',
        'BL N°',
        'Prime ONIL (12 DA/L)',
      ];
      const rows = sortedMilking.map((m) => [
        m.sessionDate,
        m.sessionPeriod,
        resolveRecordBranch(m, branchesById, currentBranch, language).name,
        m.totalTankLiters,
        m.rejectedWithholdingLiters,
        m.conformingLiters,
        m.tankTemperatureCelsius,
        m.destinationDairy,
        m.dairyDeliverySlipNo || '',
        m.onilTotalSubsidyDzd,
      ]);
      downloadCsvSafe(
        `sessions_traite_lait_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );
    }
    showToast(isAr ? 'تم تصدير ملف CSV' : 'Export CSV généré', 'info');
  }, [activeTabMode, sortedAnimals, sortedMilking, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (speciesFilter !== 'All') count += 1;
    if (healthFilter !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [speciesFilter, healthFilter, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (speciesFilter !== 'All') {
      chips.push({
        key: 'species',
        label: `${isAr ? 'النوع' : 'Espèce'}: ${speciesFilter}`,
        onRemove: () => setSpeciesFilter('All'),
      });
    }
    if (healthFilter !== 'All') {
      chips.push({
        key: 'health',
        label: `${isAr ? 'الصحة' : 'Santé'}: ${healthFilter}`,
        onRemove: () => setHealthFilter('All'),
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
  }, [speciesFilter, healthFilter, branchFilter, branchOptions, isAr]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSpeciesFilter('All');
    setHealthFilter('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'health',
        kind: 'segmented',
        label: isAr ? 'الحالة الصحية' : isEn ? 'Sanitary Status' : 'Statut Sanitaire',
        value: healthFilter,
        onChange: setHealthFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: livestock.length },
          {
            value: 'Healthy',
            label: isAr ? 'سليم' : 'Sains',
            count: livestock.length - treatmentCount,
          },
          {
            value: 'Withholding',
            label: isAr ? 'حجز دوائي' : 'Retrait Lait',
            count: treatmentCount,
          },
        ],
      },
      {
        id: 'species',
        kind: 'segmented',
        label: isAr ? 'الفصيلة' : isEn ? 'Species' : 'Espèce',
        value: speciesFilter,
        onChange: setSpeciesFilter,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: livestock.length },
          { value: 'Bovine', label: 'Bovine', count: bovineCount },
          {
            value: 'Ovine',
            label: 'Ovine',
            count: livestock.filter((a) => a.species === 'Ovine').length,
          },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'المزرعة / الفرع' : isEn ? 'Branch / Farm' : 'Exploitation / Étable',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, healthFilter, speciesFilter, branchFilter, livestock, treatmentCount, bovineCount, branchOptions]
  );

  const animalColumns: ColumnDefinition<AgriLivestock>[] = useMemo(
    () => [
      {
        key: 'earTagNumber',
        header: isAr ? 'رقم الحلقة والاسم' : 'N° Boucle & Nom',
        width: '2*',
        sortable: true,
        renderCell: (a) => (
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-8 h-8 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center tabular-nums font-semibold t-small shrink-0"
            >
              <Tag size={15} />
            </div>
            <div className="min-w-0">
              <div className="tabular-nums font-semibold t-small text-black dark:text-white truncate">
                {a.earTagNumber}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 truncate">
                {a.nameOrNumber || a.species || 'Bovine'} • {a.breed}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'reproStatus',
        header: isAr ? 'الحالة التناسلية' : 'Statut Repro',
        width: '1.3*',
        sortable: true,
        renderCell: (a) => (
          <div className="t-cap">
            <span className="font-medium text-black/70 dark:text-white/75">
              {a.reproStatus || 'Lactation'}
            </span>
            <div className="t-cap text-black/55 dark:text-white/55">
              Lactation N° {a.lactationNumber || 1}
            </div>
          </div>
        ),
      },
      {
        key: 'healthStatus',
        header: isAr ? 'الحالة الصحية' : 'Statut Sanitaire',
        width: '1.4*',
        sortable: true,
        renderCell: (a) => {
          const hs = a.healthStatus || (a.isInWithholdingLockout ? 'InTreatment' : 'Healthy');
          let badgeColor =
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
          let label = isAr ? 'سليم / مطابق' : 'Sain / Conforme';
          if (hs === 'InTreatment') {
            badgeColor =
              'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
            label = isAr ? 'علاج (سحب)' : 'Traitement (Retrait)';
          } else if (hs === 'Quarantine') {
            badgeColor = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
            label = isAr ? 'حجر صحي' : 'Quarantaine';
          }
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full t-small font-semibold ${badgeColor}`}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Étable',
        width: '1.2*',
        sortable: true,
        renderCell: (a) => (
          <span className="t-cap text-black/65 dark:text-white/70 truncate block">
            {resolveRecordBranch(a, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'dailyProductionLiters',
        header: isAr ? 'الإنتاج اليومي' : 'Moyenne L/jour',
        width: '1.2*',
        sortable: true,
        renderCell: (a) => (
          <div className="t-cap">
            <div className="tabular-nums font-semibold text-black dark:text-white">
              {a.dailyProductionLiters ?? a.dailyAvgLiters ?? 0} L/j
            </div>
            <div className="t-cap text-black/55 dark:text-white/55">
              {(a.gender || 'Female') === 'Female' ? 'Traite active' : 'Mâle'}
            </div>
          </div>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const milkingColumns: ColumnDefinition<AgriMilkingRecord>[] = useMemo(
    () => [
      {
        key: 'sessionDate',
        header: isAr ? 'الجلسة والتاريخ' : 'Date & Période',
        width: '1.5*',
        sortable: true,
        renderCell: (m) => (
          <div className="flex items-center gap-3 min-w-0">
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-8 h-8 bg-blue-500/15 text-blue-600 flex items-center justify-center font-semibold shrink-0"
            >
              <Milk size={16} />
            </div>
            <div className="min-w-0">
              <div className="tabular-nums font-semibold t-small text-black dark:text-white">
                {m.sessionDate}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55">
                {m.sessionPeriod === 'morning' ? 'Traite du Matin' : 'Traite du Soir'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'conformingLiters',
        header: isAr ? 'اللترات المطابقة' : 'Volume Conforme',
        width: '1.4*',
        sortable: true,
        renderCell: (m) => (
          <div className="t-cap">
            <div className="tabular-nums font-semibold text-black dark:text-white">
              {m.conformingLiters.toLocaleString()} L
            </div>
            {m.rejectedWithholdingLiters > 0 && (
              <div className="t-small text-amber-600 font-medium">
                (-{m.rejectedWithholdingLiters} L écartés retrait)
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'tankTemperatureCelsius',
        header: isAr ? 'حرارة الخزان' : 'Température Tank',
        width: '1.2*',
        sortable: true,
        renderCell: (m) => (
          <div className="flex items-center gap-2 t-small tabular-nums font-semibold">
            <Thermometer
              size={14}
              className={m.tankTemperatureCelsius <= 4 ? 'text-emerald-500' : 'text-amber-500'}
            />
            <span
              className={
                m.tankTemperatureCelsius <= 4
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600'
              }
            >
              +{m.tankTemperatureCelsius}°C
            </span>
          </div>
        ),
      },
      {
        key: 'onilTotalSubsidyDzd',
        header: isAr ? 'دعم أونيل (12 دج/ل)' : 'Prime ONIL (12 DA/L)',
        width: '1.4*',
        sortable: true,
        renderCell: (m) => (
          <div className="t-small tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
            +{formatMoney(m.onilTotalSubsidyDzd, language)}
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Étable',
        width: '1.1*',
        sortable: true,
        renderCell: (m) => (
          <span className="t-cap text-black/65 dark:text-white/70 truncate block">
            {resolveRecordBranch(m, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'destinationDairy',
        header: isAr ? 'الملبنة المستلمة' : 'Laiterie',
        width: '1.6*',
        sortable: true,
        renderCell: (m) => (
          <div className="t-cap text-black/70 dark:text-white/75 min-w-0">
            <div className="truncate">{m.destinationDairy}</div>
            <div className="t-cap text-black/55 dark:text-white/55 tabular-nums truncate">
              {m.dairyDeliverySlipNo || 'BL-Attente'}
            </div>
          </div>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const getAnimalRowMeta = useCallback(
    (a: AgriLivestock): Partial<KineticRowData> => {
      const hs = a.healthStatus || (a.isInWithholdingLockout ? 'InTreatment' : 'Healthy');
      const isLocked = hs === 'InTreatment' || hs === 'Quarantine' || a.isInWithholdingLockout;
      const prod = a.dailyProductionLiters ?? a.dailyAvgLiters ?? 0;
      const branchName = resolveRecordBranch(a, branchesById, currentBranch, language).name;
      return {
        subline: `${a.earTagNumber} · ${a.breed}`,
        categoryLabel: `${a.species || 'Bovine'} (${a.reproStatus || 'Lactation'})`,
        statusLabel:
          hs === 'Healthy'
            ? isAr ? 'سليم' : isEn ? 'Healthy' : 'Sain / Conforme'
            : hs === 'Quarantine'
            ? isAr ? 'حجر صحي' : 'Quarantaine'
            : isAr ? 'سحب دوائي' : 'Retrait Lait',
        statusVariant: hs === 'Quarantine' ? 'blocked' : isLocked ? 'warning' : 'active',
        metricPrimary: `${prod} L/j`,
        metricSecondary: `Lact. N°${a.lactationNumber || 1}`,
        detailCol1: {
          heading: isAr ? 'التعريف والسلالة' : isEn ? 'Identification' : 'Identification DZ-16',
          primaryText: a.earTagNumber,
          secondaryText: `${a.nameOrNumber || a.species || 'Bovine'} · ${a.breed}`,
          tertiaryText: branchName,
        },
        detailCol2: {
          heading: isAr ? 'الإنتاج والحلب' : isEn ? 'Dairy Output' : 'Production laitière',
          primaryText: `${prod} L/jour`,
          secondaryText: `${a.reproStatus || 'Lactation'} (N° ${a.lactationNumber || 1})`,
          tertiaryText: `Né(e): ${a.birthDate}`,
        },
        detailCol3: {
          heading: isAr ? 'الحالة البيطرية' : isEn ? 'Biosecurity' : 'Suivi sanitaire',
          primaryText: isLocked ? 'Exclusion Tank ONIL' : 'Lait Conforme ONIL',
          secondaryText: a.notes || 'Prophylaxie à jour',
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getAnimalFanActions = useCallback(
    (a: AgriLivestock): KineticRowFanAction[] => [
      {
        id: 'health',
        label: isAr ? 'تبديل الصحة' : 'Statut santé',
        icon: <AlertTriangle className="w-[15px] h-[15px]" />,
        onClick: () => handleToggleHealth(a),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-[15px] h-[15px]" />,
        onClick: () => openEditModal(a),
      },
      {
        id: 'open',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Tag className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedMilking(null);
          setSelectedAnimal(a);
          setAnimalNotesDraft(a.notes || '');
          setAnimalTab('overview');
        },
      },
    ],
    [handleToggleHealth, openEditModal, isAr, isEn]
  );

  const getAnimalDetailActions = useCallback(
    (a: AgriLivestock): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'بطاقة الحيوان' : isEn ? 'View Profile' : 'Ouvrir fiche',
        icon: <Tag className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedMilking(null);
          setSelectedAnimal(a);
          setAnimalNotesDraft(a.notes || '');
          setAnimalTab('overview');
        },
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit className="w-3.5 h-3.5" />,
        onClick: () => openEditModal(a),
      },
    ],
    [openEditModal, isAr, isEn]
  );

  const getMilkingRowMeta = useCallback(
    (m: AgriMilkingRecord): Partial<KineticRowData> => {
      const branchName = resolveRecordBranch(m, branchesById, currentBranch, language).name;
      const tempOk = m.tankTemperatureCelsius <= 4;
      return {
        subline: `${m.sessionDate} · ${m.sessionPeriod === 'morning' ? 'Matin' : 'Soir'}`,
        categoryLabel: m.destinationDairy,
        statusLabel: `+${m.tankTemperatureCelsius}°C`,
        statusVariant: tempOk ? 'active' : 'warning',
        metricPrimary: `${m.conformingLiters.toLocaleString()} L`,
        metricSecondary: `+${formatMoney(m.onilTotalSubsidyDzd, language)}`,
        detailCol1: {
          heading: isAr ? 'الملبنة والوصل' : isEn ? 'Dairy & Slip' : 'Laiterie & BL',
          primaryText: m.destinationDairy,
          secondaryText: m.dairyDeliverySlipNo || 'BL en attente',
          tertiaryText: branchName,
        },
        detailCol2: {
          heading: isAr ? 'الكمية المطابقة' : isEn ? 'Conforming Milk' : 'Volume conforme',
          primaryText: `${m.conformingLiters.toLocaleString()} L`,
          secondaryText: `Total ${m.totalTankLiters} L (-${m.rejectedWithholdingLiters} L écartés)`,
          tertiaryText: `Tank +${m.tankTemperatureCelsius}°C`,
        },
        detailCol3: {
          heading: isAr ? 'دعم الدولة ONIL' : isEn ? 'ONIL Subsidy' : 'Prime ONIL (12 DA/L)',
          primaryText: `+${formatMoney(m.onilTotalSubsidyDzd, language)}`,
          secondaryText: m.sessionPeriod === 'morning' ? 'Collecte du Matin' : 'Collecte du Soir',
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getMilkingFanActions = useCallback(
    (m: AgriMilkingRecord): KineticRowFanAction[] => [
      {
        id: 'onil',
        label: 'ONIL',
        icon: <FileText className="w-[15px] h-[15px]" />,
        onClick: () => setIsOnilModalOpen(true),
      },
      {
        id: 'open',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Milk className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedAnimal(null);
          setSelectedMilking(m);
          setMilkingTab('overview');
        },
      },
    ],
    [isAr, isEn]
  );

  const getMilkingDetailActions = useCallback(
    (m: AgriMilkingRecord): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل الجلسة' : isEn ? 'Inspect Session' : 'Ouvrir session',
        icon: <Milk className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedAnimal(null);
          setSelectedMilking(m);
          setMilkingTab('overview');
        },
      },
      {
        id: 'onil',
        label: 'Bordereau ONIL',
        icon: <FileText className="w-3.5 h-3.5" />,
        onClick: () => setIsOnilModalOpen(true),
      },
    ],
    [isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: livestock.length > 0 || milkingRecords.length > 0,
  });

  if (
    showSkeleton &&
    ((livestock.length === 0 && milkingRecords.length === 0) ||
      networkMode === 'force_skeleton')
  ) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.4*', minWidth: '130px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.4*', minWidth: '130px' },
          { width: '1.5*', minWidth: '140px' },
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
        icon={<Layers size={22} />}
        title={isAr ? 'المواشي' : isEn ? 'Livestock' : 'Cheptel'}
        secondaryActions={
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => setIsOnilModalOpen(true)}
            icon={<Milk size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
          >
            {isAr ? 'جدول دعم ONIL' : 'Bordereau ONIL (12 DA/L)'}
          </AtriumButton>
        }
        primaryAction={{
          label:
            activeTabMode === 'cheptel'
              ? isAr
                ? 'تسجيل رأس بقر'
                : 'Ajouter Animal'
              : isAr
              ? 'تسجيل جلسة حلب'
              : 'Session de Traite',
          onClick:
            activeTabMode === 'cheptel' ? openCreateModal : () => setIsMilkingModalOpen(true),
          icon: <Plus size={14} />,
          dataAction: activeTabMode === 'cheptel' ? 'add-animal' : 'add-milking',
        }}
      />

      {treatmentCount > 0 && (
        <div
          data-sq="card"
          data-sq-border="solid"
          style={{ '--sq-stroke': 'rgba(245, 158, 11, 0.35)' } as React.CSSProperties}
          className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 t-cap"
        >
          <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold">
              {isAr
                ? 'تنبيه فترة السحب الدوائي (Délai d’attente antibiotique) :'
                : "Alerte Retrait Antibiotique (Délai d'Attente) :"}
            </span>{' '}
            {isAr
              ? `يوجد ${treatmentCount} أبقار خاضعة للعلاج البيطري. حليبها مستبعد تلقائياً من خزان التبريد لضمان مطابقة الدعم.`
              : `${treatmentCount} vache(s) sous antibiothérapie. Lait consigné comme non-conforme et exclu du volume subventionné ONIL.`}
          </div>
        </div>
      )}

      <ScreenKpiBanner
        heading={
          isAr
            ? 'إنتاج الحليب والرقابة الصحية للقطيع'
            : isEn
            ? 'Dairy Yield & ONIL Subsidy Compliance'
            : 'Production Laitière & Conformité Prime ONIL'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'القطيع السليم المطابق'
            : isEn
            ? 'Healthy Conforming Herd'
            : 'Cheptel Sain & Conforme',
          badgeText: isAr ? 'رأس' : 'Têtes',
          count: Math.max(0, livestock.length - treatmentCount),
          tone: 'emerald',
          isActive: healthFilter === 'Healthy',
          onToggle: () => {
            setActiveTabMode('cheptel');
            setHealthFilter((prev) => (prev === 'Healthy' ? 'All' : 'Healthy'));
          },
        }}
        secondaryCard={{
          label: isAr
            ? 'أبقار قيد السحب الدوائي'
            : isEn
            ? 'Antibiotic Withholding'
            : 'En Retrait Antibiotique',
          badgeText: isAr ? 'مستبعد' : 'Exclus ONIL',
          count: treatmentCount,
          tone: 'terracotta',
          isActive: healthFilter === 'Withholding',
          onToggle: () => {
            setActiveTabMode('cheptel');
            setHealthFilter((prev) => (prev === 'Withholding' ? 'All' : 'Withholding'));
          },
        }}
        darkCard={{
          label: isAr
            ? 'إجمالي مستحقات دعم ONIL'
            : isEn
            ? 'ONIL State Subsidy (12 DA/L)'
            : 'Total Prime État ONIL (12 DA/L)',
          badgeCount: totalMonthlyDeliveredLiters,
          badgePrefix: '',
          badgeSuffix: 'L',
          valueCount: Math.round(totalMonthlyOnilSubsidyDzd),
          valuePrefix: '',
          formatValue: (v) => formatMoney(v, language),
          caption: `${milkingRecords.length} ${
            isAr ? 'وصولات تسليم مسجلة' : 'bons de livraison enregistrés'
          }`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            activeTabMode === 'cheptel'
              ? isAr
                ? 'سجل القطيع والترقيم (DZ-16)'
                : 'Cheptel & Identification (DZ-16)'
              : isAr
              ? 'جلسات الحلب وخزان التبريد'
              : 'Sessions de Traite & Tank à Lait'
          }
          liveRegionText={`${
            activeTabMode === 'cheptel' ? sortedAnimals.length : sortedMilking.length
          } ${isAr ? 'سجل' : 'entrées'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeTabMode === 'cheptel'
              ? isAr
                ? 'بحث برقم الحلقة، السلالة...'
                : 'Rechercher N° boucle, race, nom...'
              : isAr
              ? 'بحث بالملبنة، رقم الوصل...'
              : 'Rechercher laiterie, N° BL, date...'
          }
          statusOptions={
            activeTabMode === 'cheptel'
              ? [
                  { value: 'All', label: isAr ? 'الكل' : 'Tous', count: livestock.length },
                  {
                    value: 'Healthy',
                    label: isAr ? 'سليم' : 'Sains',
                    count: Math.max(0, livestock.length - treatmentCount),
                  },
                  {
                    value: 'Withholding',
                    label: isAr ? 'سحب دوائي' : 'Retrait Lait',
                    count: treatmentCount,
                  },
                ]
              : undefined
          }
          statusValue={activeTabMode === 'cheptel' ? healthFilter : undefined}
          onStatusChange={activeTabMode === 'cheptel' ? setHealthFilter : undefined}
          extraTrailingControls={
            <LiveSegmentedControl
              value={activeTabMode}
              onValueChange={(val) => {
                setSelectedIds(new Set<string>());
                setActiveTabMode(val as 'cheptel' | 'milking');
              }}
              size="md"
              options={[
                {
                  id: 'cheptel',
                  value: 'cheptel',
                  label: isAr ? 'القطيع' : 'Cheptel',
                  count: livestock.length,
                },
                {
                  id: 'milking',
                  value: 'milking',
                  label: isAr ? 'الحلب' : 'Traite',
                  count: milkingRecords.length,
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

        {activeTabMode === 'cheptel' ? (
          <UniversalDataCollection<AgriLivestock>
            hideToolbar
            items={sortedAnimals}
            columns={animalColumns}
            keyExtractor={(a) => a.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteLivestock(id));
              setSelectedIds(new Set<string>());
              if (selectedAnimal && ids.has(selectedAnimal.id)) setSelectedAnimal(null);
              showToast(isAr ? 'تم حذف الرؤوس المحددة' : 'Animaux retirés du registre', 'info');
            }}
            isPinned={(a) => pinnedIds.has(a.id)}
            onTogglePin={handlePin}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            openItemId={activeAnimal?.id || null}
            onItemClick={(a, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedMilking(null);
              setSelectedAnimal(a);
              setAnimalNotesDraft(a.notes || '');
              setAnimalTab('overview');
            }}
            onViewDetails={(a, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedMilking(null);
              setSelectedAnimal(a);
              setAnimalNotesDraft(a.notes || '');
              setAnimalTab('overview');
            }}
            getRowMeta={getAnimalRowMeta}
            getFanActions={getAnimalFanActions}
            getDetailActions={getAnimalDetailActions}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyTitle={isAr ? 'لا توجد مواشي مسجلة' : 'Aucun animal enregistré'}
            primaryActionLabel={isAr ? 'تسجيل رأس بقر' : 'Ajouter Animal'}
            onAddFirstItem={openCreateModal}
            onResetFilters={resetAllFilters}
            hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
            customActions={(a) => [
              {
                id: 'toggleHealth',
                label:
                  !a.isInWithholdingLockout && (!a.healthStatus || a.healthStatus === 'Healthy')
                    ? isAr
                      ? 'حجز دوائي'
                      : 'Retrait Vétérinaire'
                    : isAr
                    ? 'إنهاء الحجز'
                    : 'Rétablir Sain',
                icon: <AlertTriangle size={14} />,
                onClick: () => handleToggleHealth(a),
              },
            ]}
          />
        ) : (
          <UniversalDataCollection<AgriMilkingRecord>
            hideToolbar
            items={sortedMilking}
            columns={milkingColumns}
            keyExtractor={(m) => m.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode={viewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onBulkDelete={(ids) => {
              ids.forEach((id) => deleteMilkingRecord(id));
              setSelectedIds(new Set<string>());
              if (selectedMilking && ids.has(selectedMilking.id)) setSelectedMilking(null);
              showToast(isAr ? 'تم حذف الجلسات المحددة' : 'Sessions de traite retirées', 'info');
            }}
            isPinned={(m) => pinnedIds.has(m.id)}
            onTogglePin={handlePin}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            openItemId={activeMilking?.id || null}
            onItemClick={(m, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedAnimal(null);
              setSelectedMilking(m);
              setMilkingTab('overview');
            }}
            onViewDetails={(m, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedAnimal(null);
              setSelectedMilking(m);
              setMilkingTab('overview');
            }}
            getRowMeta={getMilkingRowMeta}
            getFanActions={getMilkingFanActions}
            getDetailActions={getMilkingDetailActions}
            onDelete={(m) => {
              deleteMilkingRecord(m.id);
              if (selectedMilking?.id === m.id) setSelectedMilking(null);
              showToast(isAr ? 'تم حذف جلسة الحلب' : 'Session de traite retirée', 'info');
            }}
            emptyTitle={
              isAr ? 'لا توجد جلسات حلب مسجلة' : 'Aucune session de traite enregistrée'
            }
            primaryActionLabel={isAr ? 'تسجيل جلسة حلب' : 'Enregistrer Session'}
            onAddFirstItem={() => setIsMilkingModalOpen(true)}
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
        displayCount={activeTabMode === 'cheptel' ? sortedAnimals.length : sortedMilking.length}
        entityPluralLabel={activeTabMode === 'cheptel' ? (isAr ? 'رأس' : 'têtes') : (isAr ? 'جلسات' : 'traites')}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<AgriLivestock>
        isOpen={Boolean(activeAnimal)}
        item={activeAnimal}
        allItems={sortedAnimals}
        keyExtractor={(a) => a.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeAnimal?.earTagNumber || ''}
        subtitle={
          activeAnimal ? `${activeAnimal.nameOrNumber} · ${activeAnimal.breed}` : undefined
        }
        categoryLabel={activeAnimal?.species || 'Bovine'}
        avatarText={(activeAnimal?.nameOrNumber || 'DZ').slice(0, 2).toUpperCase()}
        branchName={
          activeAnimal
            ? resolveRecordBranch(activeAnimal, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeAnimal
            ? activeAnimal.healthStatus ||
              (activeAnimal.isInWithholdingLockout ? 'InTreatment' : 'Healthy')
            : undefined
        }
        statusClassName={
          activeAnimal?.isInWithholdingLockout || activeAnimal?.healthStatus === 'InTreatment'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : activeAnimal?.healthStatus === 'Quarantine' || activeAnimal?.healthStatus === 'Sick'
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'نظرة عامة' : isEn ? 'Overview' : 'Fiche Bovine' },
          { id: 'health', label: isAr ? 'الصحة' : isEn ? 'Biosecurity' : 'Sanitaire' },
          { id: 'notes', label: isAr ? 'ملاحظات' : isEn ? 'Notes' : 'Prophylaxie' },
        ]}
        activeTab={animalTab}
        onTabChange={setAnimalTab}
        onSelectItem={(a) => {
          setSelectedAnimal(a);
          setAnimalNotesDraft(a.notes || '');
        }}
        onClose={() => setSelectedAnimal(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(animal, tab) => {
          const isLocked =
            animal.isInWithholdingLockout ||
            animal.healthStatus === 'InTreatment' ||
            animal.healthStatus === 'Quarantine';
          const dailyLiters = animal.dailyProductionLiters ?? animal.dailyAvgLiters ?? 0;

          if (tab === 'health') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'الرقابة الصحية' : isEn ? 'Milk Exclusion' : 'Statut laitier ONIL'}>
                  <InspectorBigStat
                    value={isLocked ? (isAr ? 'موقوف' : 'Retrait Actif') : isAr ? 'مطابق' : 'Lait Conforme'}
                    tone={isLocked ? 'accent' : 'ok'}
                    caption={
                      isLocked
                        ? "Interdiction d'incorporation dans le tank collectif Giplait/Soummam"
                        : 'Éligible à la collecte laiterie & prime ONIL 12 DA/L'
                    }
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={!isLocked ? 'Mettre en retrait antibiotique' : 'Rétablir animal sain'}
                    onClick={() => handleToggleHealth(animal)}
                  />
                </InspectorSection>
              </>
            );
          }

          if (tab === 'notes') {
            return (
              <InspectorSection index={0} title={isAr ? 'الملاحظات البيطرية' : isEn ? 'Veterinary Notes' : 'Observations & Prophylaxie'}>
                <InspectorNotesField
                  value={animalNotesDraft}
                  onSave={(next) => {
                    setAnimalNotesDraft(next);
                    const updated: AgriLivestock = { ...animal, notes: next };
                    updateLivestock(updated);
                    setSelectedAnimal(updated);
                    showToast(isAr ? 'تم حفظ الملاحظات البيطرية' : 'Carnet sanitaire enregistré', 'success');
                  }}
                  placeholder="Vaccinations, vermifuges, dates d'insémination..."
                />
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
                      onClick: () => openEditModal(animal),
                    },
                    {
                      id: 'health',
                      label: !isLocked ? 'Soins / Retrait' : 'Rétablir Sain',
                      icon: <AlertTriangle className="w-[18px] h-[18px]" />,
                      onClick: () => handleToggleHealth(animal),
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(animal.id)
                        ? isAr ? 'إلغاء تثبيت' : 'Désépingler'
                        : isAr ? 'تثبيت' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handlePin(animal),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1}>
                <InspectorBigStat
                  value={`${dailyLiters} L/j`}
                  tone={isLocked ? 'accent' : 'ok'}
                  caption={`${animal.reproStatus || 'Lactation'} · Lactation N° ${animal.lactationNumber || 1}`}
                />
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'بطاقة الحيوان' : isEn ? 'Animal Record' : 'Identité & Cheptel'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'النوع والجنس' : isEn ? 'Species & Sex' : 'Espèce & Sexe'}
                    value={`${animal.species || 'Bovine'} (${animal.gender || 'Female'})`}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'السلالة' : isEn ? 'Breed' : 'Race'}
                    value={String(animal.breed)}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'تاريخ الميلاد' : isEn ? 'Birth Date' : 'Date de naissance'}
                    value={animal.birthDate}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'الإنتاج اليومي' : isEn ? 'Daily Output' : 'Production moyenne'}
                    value={`${dailyLiters} L/j`}
                    tone="ok"
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticSlideOverInspector<AgriMilkingRecord>
        isOpen={Boolean(activeMilking)}
        item={activeMilking}
        allItems={sortedMilking}
        keyExtractor={(m) => m.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeMilking?.sessionDate || ''}
        subtitle={
          activeMilking
            ? activeMilking.sessionPeriod === 'morning'
              ? 'Traite du Matin'
              : 'Traite du Soir'
            : undefined
        }
        categoryLabel={activeMilking?.destinationDairy}
        avatarText="ML"
        branchName={
          activeMilking
            ? resolveRecordBranch(activeMilking, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeMilking ? `+${formatMoney(activeMilking.onilTotalSubsidyDzd, language)}` : undefined
        }
        statusClassName="bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]"
        tabs={[
          { id: 'overview', label: isAr ? 'نظرة عامة' : isEn ? 'Overview' : 'Traite' },
          { id: 'tank', label: isAr ? 'خزان التبريد' : isEn ? 'Cooling Tank' : 'Tank & Qualité' },
          { id: 'onil', label: isAr ? 'دعم ONIL' : isEn ? 'ONIL Subsidy' : 'Prime ONIL' },
        ]}
        activeTab={milkingTab}
        onTabChange={setMilkingTab}
        onSelectItem={(m) => setSelectedMilking(m)}
        onClose={() => setSelectedMilking(null)}
        onDelete={(m) => {
          deleteMilkingRecord(m.id);
          if (selectedMilking?.id === m.id) setSelectedMilking(null);
          showToast(isAr ? 'تم حذف جلسة الحلب' : 'Session de traite retirée', 'info');
        }}
        holdToDelete
        renderBody={(milk, tab) => {
          if (tab === 'tank') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'تبريد الحليب' : isEn ? 'Tank Temp' : 'Température tank'}>
                  <InspectorBigStat
                    value={`+${milk.tankTemperatureCelsius}°C`}
                    tone={milk.tankTemperatureCelsius <= 4 ? 'ok' : 'accent'}
                    caption={`Norme chaîne du froid ≤ 4.0°C · BL ${milk.dairyDeliverySlipNo || 'En attente'}`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'موازنة الكميات' : isEn ? 'Volume Audit' : 'Bilan des volumes'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Volume total trait" value={`${milk.totalTankLiters} L`} />
                    <InspectorKeyValue label="Écarté (retrait antibio)" value={`-${milk.rejectedWithholdingLiters} L`} tone="warn" />
                    <InspectorKeyValue label="Volume conforme livré" value={`${milk.conformingLiters} L`} tone="ok" isLast />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (tab === 'onil') {
            return (
              <>
                <InspectorSection index={0} title="Subvention ONIL (12 DA/L)">
                  <InspectorBigStat
                    value={`+${formatMoney(milk.onilTotalSubsidyDzd, language)}`}
                    tone="accent"
                    caption={`${milk.conformingLiters} L conformes · ${milk.destinationDairy}`}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'طباعة كشف دعم ONIL' : 'Imprimer Bordereau ONIL'}
                    onClick={() => setIsOnilModalOpen(true)}
                  />
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
                      id: 'onil',
                      label: isAr ? 'كشف ONIL' : 'Bordereau ONIL',
                      icon: <FileText className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => setIsOnilModalOpen(true),
                    },
                    {
                      id: 'export',
                      label: 'CSV',
                      icon: <Milk className="w-[18px] h-[18px]" />,
                      onClick: handleExportCsv,
                    },
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفاصيل الجلسة' : isEn ? 'Delivery Summary' : 'Livraison laiterie'}>
                <InspectorCard>
                  <InspectorKeyValue label="Volume conforme livré" value={`${milk.conformingLiters} L`} tone="ok" />
                  <InspectorKeyValue label="Température tank" value={`+${milk.tankTemperatureCelsius}°C`} />
                  <InspectorKeyValue label="Laiterie destinataire" value={milk.destinationDairy} mono={false} />
                  <InspectorKeyValue label="N° Bon Livraison (BL)" value={milk.dairyDeliverySlipNo || 'N/A'} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {isAnimalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="sq-elev-pop w-full max-w-lg">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {animalToEdit
                    ? isAr
                      ? 'تعديل بيانات رأس الماشية'
                      : 'Modifier Fiche Bovine'
                    : isAr
                    ? 'تسجيل رأس ماشية في السجل'
                    : 'Ajouter un Animal au Cheptel'}
                </h2>
                <button
                  type="button"
                  aria-label={isAr ? 'إغلاق' : 'Fermer'}
                  onClick={() => setIsAnimalModalOpen(false)}
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={18} className="text-black/55 dark:text-white/55" />
                </button>
              </div>
            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رقم الحلقة الرسمي (DZ-16) *' : 'N° Boucle Officiel (DZ-16) *'}
                  placeholder="Ex: DZ-16-10482"
                  value={earTag}
                  onChange={(e) => setEarTag(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'اسم أو رقم التعريف' : 'Nom / Numéro Vache'}
                  placeholder="Ex: La Blanche"
                  value={nameOrNumber}
                  onChange={(e) => setNameOrNumber(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label={isAr ? 'النوع *' : 'Espèce *'}
                  value={species}
                  onChange={(val) =>
                    setSpecies(extractStr(val) as 'Bovine' | 'Ovine' | 'Caprine' | 'Other')
                  }
                  options={[
                    { value: 'Bovine', label: 'Bovine (Bétail Laitier)' },
                    { value: 'Ovine', label: 'Ovine (Moutons)' },
                    { value: 'Caprine', label: 'Caprine (Chèvres)' },
                  ]}
                />
                <LabelInput
                  label={isAr ? 'السلالة *' : 'Race *'}
                  placeholder="Ex: Holstein, Montbéliarde"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label={isAr ? 'الحالة التناسلية *' : 'Statut Reproduction *'}
                  value={reproStatus}
                  onChange={(val) => setReproStatus(extractStr(val) as CowReproStatus)}
                  options={[
                    { value: 'Lactation', label: 'Lactation (En Traite)' },
                    { value: 'Génisse', label: 'Génisse (Jeune Femelle)' },
                    { value: 'Tarissement', label: 'Tarissement (Repos)' },
                    { value: 'Gestante', label: 'Gestante (Pleine)' },
                    { value: 'Quarantaine', label: 'Quarantaine / Soins' },
                    { value: 'Réformée', label: 'Réformée' },
                  ]}
                />
                <LabelInput
                  label={isAr ? 'الإنتاج اليومي (لتر) *' : 'Production Moyenne (L/j) *'}
                  type="number"
                  step="0.5"
                  value={milkProduction}
                  onChange={(e) => setMilkProduction(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'تاريخ الميلاد' : 'Date de Naissance'}
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
                <LabelSelect
                  label={isAr ? 'الحالة الصحية *' : 'Statut Sanitaire *'}
                  value={healthStatus}
                  onChange={(val) =>
                    setHealthStatus(
                      extractStr(val) as 'Healthy' | 'InTreatment' | 'Quarantine' | 'Sick'
                    )
                  }
                  options={[
                    { value: 'Healthy', label: 'Sain / Conforme' },
                    { value: 'InTreatment', label: 'En Soins (Retrait Lait)' },
                    { value: 'Quarantine', label: 'Quarantaine' },
                    { value: 'Sick', label: 'Malade' },
                  ]}
                />
              </div>
              <LabelInput
                label={isAr ? 'ملاحظات بيطرية وتطعيمات' : 'Observations & Prophylaxie'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setIsAnimalModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {animalToEdit ? 'Enregistrer' : 'Ajouter Animal'}
                </AtriumButton>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      <AgriMilkingModal
        isOpen={isMilkingModalOpen}
        onClose={() => setIsMilkingModalOpen(false)}
        onSave={(rec) => {
          addMilkingRecord(rec);
          setSelectedMilking(rec);
          setIsMilkingModalOpen(false);
          showToast(
            isAr ? 'تم قيد جلسة الحلب بنجاح' : 'Session de traite enregistrée',
            'success'
          );
        }}
        dairyCows={livestock}
      />
      <OnilBordereauPrintModal
        isOpen={isOnilModalOpen}
        onClose={() => setIsOnilModalOpen(false)}
        milkingRecords={milkingRecords}
        dairyCows={livestock}
      />
    </div>
  );
};
