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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
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
    retryCloudSync,
    lastSyncedAt,
  } = useAtriumStore();
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
            <div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              <Tag size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black dark:text-white truncate">
                {a.earTagNumber}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55 truncate">
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
          <div className="text-xs">
            <span className="font-medium text-black/70 dark:text-white/75">
              {a.reproStatus || 'Lactation'}
            </span>
            <div className="text-[10px] text-black/55 dark:text-white/55">
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
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
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
          <span className="text-xs text-black/65 dark:text-white/70 truncate block">
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
          <div className="text-xs">
            <div className="font-mono font-bold text-black dark:text-white">
              {a.dailyProductionLiters ?? a.dailyAvgLiters ?? 0} L/j
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55">
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
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Milk size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black dark:text-white">
                {m.sessionDate}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55">
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
          <div className="text-xs">
            <div className="font-mono font-bold text-black dark:text-white">
              {m.conformingLiters.toLocaleString()} L
            </div>
            {m.rejectedWithholdingLiters > 0 && (
              <div className="text-[10px] text-amber-600 font-medium">
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
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
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
          <div className="text-xs font-mono font-bold text-[#d4522f]">
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
          <span className="text-xs text-black/65 dark:text-white/70 truncate block">
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
          <div className="text-xs text-black/70 dark:text-white/75 min-w-0">
            <div className="truncate">{m.destinationDairy}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono truncate">
              {m.dairyDeliverySlipNo || 'BL-Attente'}
            </div>
          </div>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
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
        subtitle={
          isAr
            ? `${livestock.length} رأس ماشية · ${totalMilkProduction.toFixed(1)} ل/يوم`
            : isEn
            ? `${livestock.length} head · ${totalMilkProduction.toFixed(1)} L/day`
            : `${livestock.length} têtes · ${totalMilkProduction.toFixed(1)} L/jour`
        }
        secondaryActions={
          <AtriumButton
            variant="outline"
            size="sm"
            onClick={() => setIsOnilModalOpen(true)}
            icon={<Milk size={14} className="text-[#d4522f]" />}
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
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-800 dark:text-amber-300 text-xs">
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
            data={sortedAnimals}
            columns={animalColumns}
            keyExtractor={(a) => a.id}
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
            }}
            onViewDetails={(a, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedMilking(null);
              setSelectedAnimal(a);
            }}
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
            renderCard={(a) => {
              const hs =
                a.healthStatus || (a.isInWithholdingLockout ? 'InTreatment' : 'Healthy');
              return (
                <div className="space-y-2.5 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-xs text-[#d4522f]">
                        {a.earTagNumber}
                      </div>
                      <div className="text-xs font-bold text-black dark:text-white mt-0.5">
                        {a.nameOrNumber || a.breed}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hs === 'Healthy'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {hs}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-black/55 dark:text-white/55">{a.reproStatus}</span>
                    <span className="font-mono font-bold text-black dark:text-white">
                      {a.dailyProductionLiters ?? a.dailyAvgLiters ?? 0} L/j
                    </span>
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <UniversalDataCollection<AgriMilkingRecord>
            hideToolbar
            data={sortedMilking}
            columns={milkingColumns}
            keyExtractor={(m) => m.id}
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
            }}
            onViewDetails={(m, el) => {
              if (el) setDrawerOpenerEl(el);
              setSelectedAnimal(null);
              setSelectedMilking(m);
            }}
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
            renderCard={(m) => (
              <div className="space-y-2.5 w-full">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-bold text-xs text-black dark:text-white">
                      {m.sessionDate}
                    </div>
                    <div className="text-[11px] text-black/55 dark:text-white/55">
                      {m.sessionPeriod === 'morning' ? 'Matin' : 'Soir'} • {m.destinationDairy}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs text-[#d4522f]">
                    +{formatMoney(m.onilTotalSubsidyDzd, language)}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-emerald-600">
                    {m.conformingLiters} L conformes
                  </span>
                  <span className="font-mono text-black/65 dark:text-white/65">
                    +{m.tankTemperatureCelsius}°C
                  </span>
                </div>
              </div>
            )}
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
          activeAnimal ? `${activeAnimal.nameOrNumber} • ${activeAnimal.breed}` : undefined
        }
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
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
        }
        onSelectItem={(a) => setSelectedAnimal(a)}
        onClose={() => setSelectedAnimal(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(animal) => {
          const isLocked =
            animal.isInWithholdingLockout ||
            animal.healthStatus === 'InTreatment' ||
            animal.healthStatus === 'Quarantine';
          return (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Espèce &amp; Sexe:</span>
                  <span className="font-semibold">
                    {animal.species || 'Bovine'} ({animal.gender || 'Female'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Race:</span>
                  <span className="font-semibold">{animal.breed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Date de Naissance:</span>
                  <span className="font-mono">{animal.birthDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Statut Reproduction:</span>
                  <span className="font-semibold text-black dark:text-white">
                    {animal.reproStatus || 'Lactation'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">N° de Lactation:</span>
                  <span className="font-mono font-bold">
                    Lactation {animal.lactationNumber || 1}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Production L/jour:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {animal.dailyProductionLiters ?? animal.dailyAvgLiters ?? 0} L/j
                  </span>
                </div>
              </div>
              {isLocked && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Retrait laitier actif</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Interdiction d&apos;incorporation dans le tank collectif Giplait/Soummam.
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => openEditModal(animal)}
                  icon={<Edit size={13} />}
                >
                  {isAr ? 'تعديل البيانات' : 'Modifier Fiche'}
                </AtriumButton>
                <AtriumButton
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => handleToggleHealth(animal)}
                >
                  {!isLocked ? 'Mettre en Soins' : 'Rétablir Sain'}
                </AtriumButton>
              </div>
            </div>
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
        avatarText="ML"
        branchName={
          activeMilking
            ? resolveRecordBranch(activeMilking, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeMilking ? `+${formatMoney(activeMilking.onilTotalSubsidyDzd, language)}` : undefined
        }
        statusClassName="bg-[#d4522f]/15 text-[#d4522f]"
        onSelectItem={(m) => setSelectedMilking(m)}
        onClose={() => setSelectedMilking(null)}
        onDelete={(m) => {
          deleteMilkingRecord(m.id);
          if (selectedMilking?.id === m.id) setSelectedMilking(null);
          showToast(isAr ? 'تم حذف جلسة الحلب' : 'Session de traite retirée', 'info');
        }}
        holdToDelete
        renderBody={(milk) => (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Volume Total Trait:</span>
                <span className="font-mono font-semibold">{milk.totalTankLiters} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Volume Écarté (Retrait):</span>
                <span className="font-mono text-amber-600">-{milk.rejectedWithholdingLiters} L</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-neutral-200 dark:border-neutral-700 font-bold">
                <span>Volume Conforme Livré:</span>
                <span className="font-mono text-emerald-600">{milk.conformingLiters} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Température Tank:</span>
                <span className="font-mono font-bold">+{milk.tankTemperatureCelsius}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">Laiterie Destinataire:</span>
                <span className="font-medium text-black dark:text-white">
                  {milk.destinationDairy}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/55 dark:text-white/55">N° Bon Livraison (BL):</span>
                <span className="font-mono">{milk.dairyDeliverySlipNo || 'N/A'}</span>
              </div>
            </div>
            <AtriumButton
              variant="primary"
              size="sm"
              className="w-full justify-center"
              onClick={() => setIsOnilModalOpen(true)}
              icon={<FileText size={13} />}
            >
              {isAr ? 'طباعة كشف دعم ONIL' : 'Imprimer Bordereau ONIL'}
            </AtriumButton>
          </div>
        )}
      />

      {isAnimalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
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
