import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Heart,
  ShieldCheck,
  CheckCircle2,
  X,
  Milk,
  Calendar,
  Activity,
  Edit,
  Trash2,
  Pin,
  Save,
  Check,
  Download,
  AlertTriangle,
  Send,
  Droplet,
  Tag,
  Thermometer,
  FileText,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriLivestock, AgriMilkingRecord, BovineBreed, CowReproStatus } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { OnilBordereauPrintModal } from './OnilBordereauPrintModal';
import { AgriMilkingModal } from './AgriMilkingModal';
import { formatMoney } from '../../../utils/rules';

export const AgricultureLivestockView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    livestock,
    milkingRecords,
    addLivestock,
    updateLivestock,
    deleteLivestock,
    addMilkingRecord,
    deleteMilkingRecord,
  } = useAgricultureData();

  // Mode switcher: Cheptel vs Sessions de Traite
  const [activeTabMode, setActiveTabMode] = useState<'cheptel' | 'milking'>('cheptel');

  // Modals
  const [isOnilModalOpen, setIsOnilModalOpen] = useState(false);
  const [isMilkingModalOpen, setIsMilkingModalOpen] = useState(false);
  const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<AgriLivestock | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['ani_01']));
  const [sortBy, setSortBy] = useState<string>('earTagNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Form states inside Animal Modal
  const [earTag, setEarTag] = useState('DZ-16-');
  const [nameOrNumber, setNameOrNumber] = useState('La Noire');
  const [species, setSpecies] = useState<AgriLivestock['species']>('Bovine');
  const [breed, setBreed] = useState<BovineBreed | string>('Holstein');
  const [gender, setGender] = useState<AgriLivestock['gender']>('Female');
  const [reproStatus, setReproStatus] = useState<CowReproStatus>('Lactation');
  const [lactationNumber, setLactationNumber] = useState('2');
  const [birthDate, setBirthDate] = useState('2023-05-10');
  const [milkProduction, setMilkProduction] = useState('25.0');
  const [healthStatus, setHealthStatus] = useState<AgriLivestock['healthStatus']>('Healthy');
  const [notes, setNotes] = useState('Vaccination à jour. Bon état corporel.');

  // 390px Inline Side Inspector
  const [selectedAnimal, setSelectedAnimal] = useState<AgriLivestock | null>(() => livestock[0] || null);
  const [selectedMilking, setSelectedMilking] = useState<AgriMilkingRecord | null>(() => milkingRecords[0] || null);
  const [inspectorTab, setInspectorTab] = useState<'fiche' | 'milk' | 'vet' | 'notes'>('fiche');

  // Handlers for Animal Modal
  const openCreateModal = () => {
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
  };

  const openEditModal = (a: AgriLivestock) => {
    setAnimalToEdit(a);
    setEarTag(a.earTagNumber);
    setNameOrNumber(a.nameOrNumber || a.earTagNumber);
    setSpecies(a.species || 'Bovine');
    setBreed(a.breed);
    setGender(a.gender || 'Female');
    setReproStatus(a.reproStatus || 'Lactation');
    setLactationNumber(String(a.lactationNumber || 1));
    setBirthDate(a.birthDate || '2023-05-10');
    setMilkProduction(String(a.dailyProductionLiters || a.dailyAvgLiters || '20.0'));
    setHealthStatus(a.healthStatus || 'Healthy');
    setNotes(a.notes || '');
    setIsAnimalModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!earTag.trim()) {
      showToast(isAr ? 'يرجى إدخال رقم الحلقة / الترقيم' : 'Veuillez saisir le numéro de boucle', 'error');
      return;
    }

    const payload: AgriLivestock = {
      id: animalToEdit?.id || `ani_${Date.now()}`,
      accountId: animalToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
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
      dailyProductionLiters: species === 'Bovine' && gender === 'Female' ? parseFloat(milkProduction) || 0 : undefined,
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
      showToast(isAr ? 'تم تسجيل رأس الماشية في السجل البيطري' : 'Animal enregistré au carnet sanitaire', 'success');
    }
    setIsAnimalModalOpen(false);
  };

  // Filtered Animals
  const filteredAnimals = useMemo(() => {
    return livestock.filter((a) => {
      if (speciesFilter !== 'All' && a.species !== speciesFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTag = a.earTagNumber.toLowerCase().includes(q);
        const matchesName = (a.nameOrNumber || '').toLowerCase().includes(q);
        const matchesBreed = (a.breed || '').toLowerCase().includes(q);
        if (!matchesTag && !matchesName && !matchesBreed) return false;
      }
      return true;
    });
  }, [livestock, speciesFilter, searchQuery]);

  // Filtered Milking Records
  const filteredMilking = useMemo(() => {
    return milkingRecords.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDairy = m.destinationDairy.toLowerCase().includes(q);
        const matchesSlip = (m.dairyDeliverySlipNo || '').toLowerCase().includes(q);
        const matchesDate = m.sessionDate.toLowerCase().includes(q);
        if (!matchesDairy && !matchesSlip && !matchesDate) return false;
      }
      return true;
    });
  }, [milkingRecords, searchQuery]);

  // KPIs
  const totalMilkProduction = livestock
    .filter((a) => a.dailyProductionLiters)
    .reduce((acc, a) => acc + (a.dailyProductionLiters || 0), 0);
  const healthyCount = livestock.filter((a) => a.healthStatus === 'Healthy').length;
  const bovineCount = livestock.filter((a) => a.species === 'Bovine').length;
  const treatmentCount = livestock.filter((a) => a.healthStatus === 'InTreatment' || a.healthStatus === 'Quarantine').length;

  const totalMonthlyDeliveredLiters = milkingRecords.reduce((acc, m) => acc + m.conformingLiters, 0);
  const totalMonthlyOnilSubsidyDzd = milkingRecords.reduce((acc, m) => acc + m.onilTotalSubsidyDzd, 0);

  // Actions
  const handlePin = (a: AgriLivestock) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
  };

  const handleDelete = (a: AgriLivestock) => {
    deleteLivestock(a.id);
    if (selectedAnimal?.id === a.id) setSelectedAnimal(null);
    showToast(isAr ? 'تم حذف الحيوان من السجل' : 'Animal retiré du registre', 'info');
  };

  const handleToggleHealth = (a: AgriLivestock) => {
    const nextHealth: AgriLivestock['healthStatus'] =
      a.healthStatus === 'Healthy' ? 'InTreatment' : 'Healthy';
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
  };

  const handleExportCsv = () => {
    if (activeTabMode === 'cheptel') {
      const headers = ['N° Boucle', 'Nom/Numéro', 'Espèce', 'Race', 'Sexe', 'Statut Repro', 'Statut Sanitaire', 'Production L/j'];
      const rows = filteredAnimals.map((a) => [
        a.earTagNumber,
        `"${(a.nameOrNumber || '').replace(/"/g, '""')}"`,
        a.species,
        `"${a.breed.replace(/"/g, '""')}"`,
        a.gender,
        a.reproStatus,
        a.healthStatus,
        a.dailyProductionLiters || a.dailyAvgLiters || 0,
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.href = encodeURI(csv);
      link.download = `cheptel_bovin_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } else {
      const headers = ['Date', 'Session', 'Volume Total Litres', 'Volume Écarté', 'Volume Conforme', 'Température °C', 'Laiterie', 'BL N°', 'Prime ONIL (12 DA/L)'];
      const rows = filteredMilking.map((m) => [
        m.sessionDate,
        m.sessionPeriod,
        m.totalTankLiters,
        m.rejectedWithholdingLiters,
        m.conformingLiters,
        m.tankTemperatureCelsius,
        `"${m.destinationDairy.replace(/"/g, '""')}"`,
        m.dairyDeliverySlipNo || '',
        m.onilTotalSubsidyDzd,
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.href = encodeURI(csv);
      link.download = `sessions_traite_lait_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    }
    showToast(isAr ? 'تم تصدير ملف CSV' : 'Export CSV généré', 'info');
  };

  // Columns for Cheptel
  const animalColumns: ColumnDefinition<AgriLivestock>[] = [
    {
      id: 'tag',
      header: isAr ? 'رقم الحلقة والاسم' : 'N° Boucle & Nom',
      accessorKey: 'earTagNumber',
      sortable: true,
      minWidth: '180px',
      cell: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Tag size={15} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
              {a.earTagNumber}
            </div>
            <div className="text-[10px] text-neutral-400">
              {a.nameOrNumber || a.species} • {a.breed}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'repro',
      header: isAr ? 'الحالة التناسلية' : 'Statut Repro',
      accessorKey: 'reproStatus',
      sortable: true,
      minWidth: '140px',
      cell: (a) => (
        <div className="text-xs">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {a.reproStatus || 'Lactation'}
          </span>
          <div className="text-[10px] text-neutral-400">
            Lactation N° {a.lactationNumber || 1}
          </div>
        </div>
      ),
    },
    {
      id: 'health',
      header: isAr ? 'الحالة الصحية' : 'Statut Sanitaire',
      accessorKey: 'healthStatus',
      sortable: true,
      minWidth: '150px',
      cell: (a) => {
        let badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
        let label = 'Sain / Conforme';
        if (a.healthStatus === 'InTreatment') {
          badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
          label = 'Traitement (Retrait)';
        } else if (a.healthStatus === 'Quarantine') {
          badgeColor = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
          label = 'Quarantaine';
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      id: 'milk',
      header: isAr ? 'الإنتاج اليومي' : 'Moyenne L/jour',
      accessorKey: 'dailyProductionLiters',
      sortable: true,
      minWidth: '140px',
      cell: (a) => (
        <div className="text-xs">
          <div className="font-mono font-bold text-neutral-900 dark:text-white">
            {a.dailyProductionLiters || a.dailyAvgLiters || 0} L/j
          </div>
          <div className="text-[10px] text-neutral-400">
            {a.gender === 'Female' ? 'Traite active' : 'Mâle'}
          </div>
        </div>
      ),
    },
  ];

  // Columns for Milking Sessions
  const milkingColumns: ColumnDefinition<AgriMilkingRecord>[] = [
    {
      id: 'session',
      header: isAr ? 'الجلسة والتاريخ' : 'Date & Période',
      accessorKey: 'sessionDate',
      sortable: true,
      minWidth: '170px',
      cell: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Milk size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
              {m.sessionDate}
            </div>
            <div className="text-[10px] text-neutral-400">
              {m.sessionPeriod === 'morning' ? 'Traite du Matin' : 'Traite du Soir'}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'liters',
      header: isAr ? 'اللترات المطابقة' : 'Volume Conforme',
      accessorKey: 'conformingLiters',
      sortable: true,
      minWidth: '160px',
      cell: (m) => (
        <div className="text-xs">
          <div className="font-mono font-bold text-neutral-900 dark:text-white">
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
      id: 'temp',
      header: isAr ? 'حرارة الخزان' : 'Température Tank',
      accessorKey: 'tankTemperatureCelsius',
      sortable: true,
      minWidth: '140px',
      cell: (m) => (
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
          <Thermometer size={14} className={m.tankTemperatureCelsius <= 4.0 ? 'text-emerald-500' : 'text-amber-500'} />
          <span className={m.tankTemperatureCelsius <= 4.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}>
            +{m.tankTemperatureCelsius}°C
          </span>
        </div>
      ),
    },
    {
      id: 'subsidy',
      header: isAr ? 'دعم أونيل (12 دج/ل)' : 'Prime ONIL (12 DA/L)',
      accessorKey: 'onilTotalSubsidyDzd',
      sortable: true,
      minWidth: '160px',
      cell: (m) => (
        <div className="text-xs font-mono font-bold text-[#C4785A]">
          +{formatMoney(m.onilTotalSubsidyDzd)}
        </div>
      ),
    },
    {
      id: 'dairy',
      header: isAr ? 'الملبنة المستلمة' : 'Laiterie',
      accessorKey: 'destinationDairy',
      sortable: true,
      minWidth: '180px',
      cell: (m) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[170px]">
          <div>{m.destinationDairy}</div>
          <div className="text-[10px] text-neutral-400 font-mono">{m.dairyDeliverySlipNo || 'BL-Attente'}</div>
        </div>
      ),
    },
  ];

  // Actions for Animal
  const getAnimalActions = (a: AgriLivestock): ActionButtonDef[] => [
    {
      label: isAr ? 'تعديل' : 'Modifier',
      icon: <Edit size={14} />,
      onClick: () => openEditModal(a),
    },
    {
      label: a.healthStatus === 'Healthy' ? (isAr ? 'حجز دوائي' : 'Retrait Vétérinaire') : (isAr ? 'إنهاء الحجز' : 'Rétablir'),
      icon: <AlertTriangle size={14} />,
      onClick: () => handleToggleHealth(a),
    },
    {
      label: isAr ? 'حذف' : 'Supprimer',
      icon: <Trash2 size={14} />,
      variant: 'danger',
      onClick: () => handleDelete(a),
    },
  ];

  // Actions for Milking Session
  const getMilkingActions = (m: AgriMilkingRecord): ActionButtonDef[] => [
    {
      label: isAr ? 'حذف الجلسة' : 'Supprimer',
      icon: <Trash2 size={14} />,
      variant: 'danger',
      onClick: () => {
        deleteMilkingRecord(m.id);
        if (selectedMilking?.id === m.id) setSelectedMilking(null);
        showToast(isAr ? 'تم حذف جلسة الحلب' : 'Session de traite retirée', 'info');
      },
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
                {isAr ? 'إدارة الثروة الحيوانية والإنتاج اللبني' : 'Cheptel Bovin Laitier & Traite'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {livestock.length} {isAr ? 'رأس' : 'têtes'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'متابعة ترقيم الأبقار DZ-16، جلسات الحلب، تبريد الخزان ودعم أونيل'
                : 'Identification individuelle, traçabilité des boucles, tank à lait et prime ONIL'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={() => setIsOnilModalOpen(true)}
            icon={<Milk size={14} className="text-[#C4785A]" />}
          >
            {isAr ? 'جدول دعم الحليب ONIL (12 دج/ل)' : 'Bordereau ONIL (12 DA/L)'}
          </AtriumButton>
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download size={14} />}
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </AtriumButton>

          {activeTabMode === 'cheptel' ? (
            <AtriumButton
              variant="primary"
              onClick={openCreateModal}
              icon={<Plus size={14} />}
            >
              {isAr ? 'تسجيل رأس بقر' : 'Ajouter Animal'}
            </AtriumButton>
          ) : (
            <AtriumButton
              variant="primary"
              onClick={() => setIsMilkingModalOpen(true)}
              icon={<Plus size={14} />}
            >
              {isAr ? 'تسجيل جلسة حلب' : 'Enregistrer Session de Traite'}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* Main Switcher: Cheptel vs Milking Sessions */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTabMode('cheptel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTabMode === 'cheptel'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Layers size={15} />
          {isAr ? 'سجل القطيع والترقيم (DZ-16)' : 'Cheptel & Identification (DZ-16)'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">
            {livestock.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode('milking')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTabMode === 'milking'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Milk size={15} />
          {isAr ? 'جلسات الحلب وخزان التبريد' : 'Sessions de Traite & Tank à Lait'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">
            {milkingRecords.length}
          </span>
        </button>
      </div>

      {/* Antibiotic Milk Withholding / Sécurité Sanitaire Alert Banner */}
      {treatmentCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold">
              {isAr ? 'تنبيه فترة السحب الدوائي (Délai d’attente antibiotique) :' : 'Alerte Retrait Antibiotique (Délai d’Attente) :'}
            </span>{' '}
            {isAr
              ? `يوجد ${treatmentCount} أبقار خاضعة للعلاج البيطري. حليبها مستبعد تلقائياً من خزان التبريد لضمان مطابقة الدعم.`
              : `${treatmentCount} vache(s) sous antibiothérapie. Lait consigné comme non-conforme et exclu du volume subventionné ONIL.`}
          </div>
        </div>
      )}

      {/* Top 3-Card Metrics Tray */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500">
            {isAr ? 'الإنتاج اللبني اليومي التقديري' : 'Production Laitière Estimée'}
          </span>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
            {totalMilkProduction.toFixed(1)} <span className="text-xs font-normal text-neutral-500">L / jour</span>
          </div>
          <p className="text-[10.5px] text-[#C4785A] mt-0.5">
            {bovineCount} {isAr ? 'أبقار حلوب بالضيعة' : 'vaches laitières actives'}
          </p>
        </div>

        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500">
            {isAr ? 'الحليب المورد للملبنات (المطابق)' : 'Lait Conforme Livré ce Mois'}
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {totalMonthlyDeliveredLiters.toLocaleString()} <span className="text-xs font-normal text-neutral-500">Litres</span>
          </div>
          <p className="text-[10.5px] text-neutral-400 mt-0.5">
            {isAr ? 'تم استبعاد الحليب المعالج' : 'Sans résidus antibiotiques'}
          </p>
        </div>

        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500">
            {isAr ? 'إجمالي مستحقات دعم ONIL' : 'Total Prime État ONIL (12 DA/L)'}
          </span>
          <div className="text-2xl font-bold font-mono text-[#C4785A] mt-1">
            {formatMoney(totalMonthlyOnilSubsidyDzd)}
          </div>
          <p className="text-[10.5px] text-neutral-400 mt-0.5">
            {milkingRecords.length} {isAr ? 'وصولات تسليم مسجلة' : 'bons de livraison enregistrés'}
          </p>
        </div>
      </div>

      {/* Main Collection & Side Drawer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side */}
        <div className="lg:col-span-8">
          {activeTabMode === 'cheptel' ? (
            <UniversalDataCollection<AgriLivestock>
              data={filteredAnimals}
              columns={animalColumns}
              keyExtractor={(a) => a.id}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pinnedIds={pinnedIds}
              onPinToggle={handlePin}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={(field: string, dir: 'asc' | 'desc') => {
                setSortBy(field);
                setSortDir(dir);
              }}
              onItemClick={(a: AgriLivestock) => setSelectedAnimal(a)}
              customActions={(a: AgriLivestock) => getAnimalActions(a)}
              emptyTitle={isAr ? 'لا توجد مواشي مسجلة' : 'Aucun animal enregistré'}
            />
          ) : (
            <UniversalDataCollection<AgriMilkingRecord>
              data={filteredMilking}
              columns={milkingColumns}
              keyExtractor={(m) => m.id}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pinnedIds={pinnedIds}
              onPinToggle={(m) => {
                const id = typeof m === 'string' ? m : m.id;
                const next = new Set(pinnedIds);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                setPinnedIds(next);
              }}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={(field: string, dir: 'asc' | 'desc') => {
                setSortBy(field);
                setSortDir(dir);
              }}
              onItemClick={(m: AgriMilkingRecord) => setSelectedMilking(m)}
              customActions={(m: AgriMilkingRecord) => getMilkingActions(m)}
              emptyTitle={isAr ? 'لا توجد جلسات حلب مسجلة' : 'Aucune session de traite enregistrée'}
            />
          )}
        </div>

        {/* Right Side 390px Inspector Drawer */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
          {activeTabMode === 'cheptel' ? (
            selectedAnimal ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                      <Tag size={16} />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-neutral-900 dark:text-white">
                        {selectedAnimal.earTagNumber}
                      </h2>
                      <p className="text-[10px] text-neutral-400">
                        {selectedAnimal.nameOrNumber} • {selectedAnimal.breed}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedAnimal.healthStatus === 'Healthy'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {selectedAnimal.healthStatus}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Espèce & Sexe:</span>
                    <span className="font-semibold">{selectedAnimal.species} ({selectedAnimal.gender})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Race:</span>
                    <span className="font-semibold">{selectedAnimal.breed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Date de Naissance:</span>
                    <span className="font-mono">{selectedAnimal.birthDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Statut Reproduction:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedAnimal.reproStatus || 'Lactation'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">N° de Lactation:</span>
                    <span className="font-mono font-bold">Lactation {selectedAnimal.lactationNumber || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Production L/jour:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedAnimal.dailyProductionLiters || selectedAnimal.dailyAvgLiters || 0} L/j
                    </span>
                  </div>
                </div>

                {selectedAnimal.isInWithholdingLockout && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Retrait laitier actif</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Interdiction d'incorporation dans le tank collectif Giplait/Soummam.
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
                  <AtriumButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openEditModal(selectedAnimal)}
                    icon={<Edit size={13} />}
                  >
                    {isAr ? 'تعديل البيانات' : 'Modifier Fiche'}
                  </AtriumButton>
                  <AtriumButton
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleToggleHealth(selectedAnimal)}
                  >
                    {selectedAnimal.healthStatus === 'Healthy' ? 'Mettre en Soins' : 'Rétablir Sain'}
                  </AtriumButton>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-neutral-400 text-xs">
                {isAr ? 'حدد رأس بقر لمعاينة التفاصيل' : 'Sélectionnez un animal pour afficher sa fiche'}
              </div>
            )
          ) : selectedMilking ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
                    <Milk size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {selectedMilking.sessionDate}
                    </h2>
                    <p className="text-[10px] text-neutral-400">
                      {selectedMilking.sessionPeriod === 'morning' ? 'Traite du Matin' : 'Traite du Soir'}
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-[#C4785A]">
                  +{formatMoney(selectedMilking.onilTotalSubsidyDzd)}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Volume Total Trait:</span>
                  <span className="font-mono font-semibold">{selectedMilking.totalTankLiters} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Volume Écarté (Retrait):</span>
                  <span className="font-mono text-amber-600">-{selectedMilking.rejectedWithholdingLiters} L</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700 font-bold">
                  <span>Volume Conforme Livré:</span>
                  <span className="font-mono text-emerald-600">{selectedMilking.conformingLiters} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Température Tank:</span>
                  <span className="font-mono font-bold">+{selectedMilking.tankTemperatureCelsius}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Laiterie Destinataire:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedMilking.destinationDairy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">N° Bon Livraison (BL):</span>
                  <span className="font-mono">{selectedMilking.dairyDeliverySlipNo || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsOnilModalOpen(true)}
                  icon={<FileText size={13} />}
                >
                  {isAr ? 'طباعة كشف دعم ONIL' : 'Imprimer Bordereau ONIL'}
                </AtriumButton>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-neutral-400 text-xs">
              {isAr ? 'حدد جلسة حلب لمعاينة التفاصيل' : 'Sélectionnez une session pour afficher les détails'}
            </div>
          )}
        </div>
      </div>

      {/* Animal Modal */}
      {isAnimalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {animalToEdit
                  ? (isAr ? 'تعديل بيانات رأس الماشية' : 'Modifier Fiche Bovine')
                  : (isAr ? 'تسجيل رأس ماشية في السجل' : 'Ajouter un Animal au Cheptel')}
              </h2>
              <button onClick={() => setIsAnimalModalOpen(false)}>
                <X size={18} className="text-neutral-400" />
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
                  value={species || 'Bovine'}
                  onChange={(val) => setSpecies(val as AgriLivestock['species'])}
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
                  onChange={(val) => setReproStatus(val as CowReproStatus)}
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
                  value={healthStatus || 'Healthy'}
                  onChange={(val) => setHealthStatus(val as AgriLivestock['healthStatus'])}
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
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsAnimalModalOpen(false)}>
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

      {/* Milking Modal */}
      <AgriMilkingModal
        isOpen={isMilkingModalOpen}
        onClose={() => setIsMilkingModalOpen(false)}
        onSave={(rec) => {
          addMilkingRecord(rec);
          setSelectedMilking(rec);
          setIsMilkingModalOpen(false);
          showToast(isAr ? 'تم قيد جلسة الحلب بنجاح' : 'Session de traite enregistrée', 'success');
        }}
        dairyCows={livestock}
      />

      {/* Official ONIL Subsidy Print Modal */}
      <OnilBordereauPrintModal
        isOpen={isOnilModalOpen}
        onClose={() => setIsOnilModalOpen(false)}
        milkingRecords={milkingRecords}
        dairyCows={livestock}
      />
    </div>
  );
};
