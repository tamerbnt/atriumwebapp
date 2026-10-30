import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Droplets,
  Clock,
  CheckCircle2,
  X,
  Sprout,
  Download,
  Trash2,
  Edit,
  Pin,
  Save,
  Check,
  Send,
  Activity,
  Layers,
  MapPin,
  DollarSign,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { AgriTreatmentLog, AgriCropCycle, AgriCyclePhase } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { AgriCropCycleModal } from './AgriCropCycleModal';
import { AgriTreatmentModal } from './AgriTreatmentModal';
import { formatMoney } from '../../../utils/rules';
import { evaluateDarSafety } from '../../../utils/agriRules';

export const AgricultureCyclesView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
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

  // Active Main Hub Tab
  const [activeTabMode, setActiveTabMode] = useState<'cycles' | 'treatments'>('cycles');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParcel, setFilterParcel] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['cycle_01', 'treat_01']));
  const [sortBy, setSortBy] = useState<string>('sowingDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [cycleToEdit, setCycleToEdit] = useState<AgriCropCycle | null>(null);

  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [treatmentToEdit, setTreatmentToEdit] = useState<AgriTreatmentLog | null>(null);

  // 390px Side Inspector
  const [selectedCycle, setSelectedCycle] = useState<AgriCropCycle | null>(() => cropCycles[0] || null);
  const [selectedTreatment, setSelectedTreatment] = useState<AgriTreatmentLog | null>(() => treatmentLogs[0] || null);
  const [inspectorTab, setInspectorTab] = useState<'details' | 'rendement' | 'couts' | 'dar'>('details');

  // Helper parcel name map
  const parcelNameMap = useMemo(() => {
    const map = new Map<string, string>();
    parcels.forEach((p) => map.set(p.id, `${p.code} - ${p.name}`));
    return map;
  }, [parcels]);

  // Phase labels and styles
  const getPhaseConfig = (phase: AgriCyclePhase) => {
    switch (phase) {
      case 'planned':
        return {
          label: isAr ? 'مخطط (Budget)' : 'Planifié',
          bg: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
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
          bg: 'bg-[#C4785A]/15 text-[#C4785A]',
        };
      case 'closed':
        return {
          label: isAr ? 'مكتمل ومغلق' : 'Clôturé',
          bg: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
        };
      default:
        return {
          label: phase,
          bg: 'bg-neutral-100 text-neutral-600',
        };
    }
  };

  // Filtered Cycles
  const filteredCycles = useMemo(() => {
    return cropCycles.filter((c) => {
      if (filterParcel !== 'all' && c.parcelId !== filterParcel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCrop = c.cropName.toLowerCase().includes(q);
        const matchesVar = c.variety.toLowerCase().includes(q);
        const matchesParcel = (parcelNameMap.get(c.parcelId) || '').toLowerCase().includes(q);
        if (!matchesCrop && !matchesVar && !matchesParcel) return false;
      }
      return true;
    });
  }, [cropCycles, filterParcel, searchQuery, parcelNameMap]);

  // Filtered Treatments
  const filteredTreatments = useMemo(() => {
    return treatmentLogs.filter((t) => {
      if (filterParcel !== 'all' && t.parcelId !== filterParcel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.commercialProductName.toLowerCase().includes(q);
        const matchesActive = t.activeIngredient.toLowerCase().includes(q);
        const matchesPest = t.targetPestDisease.toLowerCase().includes(q);
        const matchesOp = t.operatorName.toLowerCase().includes(q);
        if (!matchesName && !matchesActive && !matchesPest && !matchesOp) return false;
      }
      return true;
    });
  }, [treatmentLogs, filterParcel, searchQuery]);

  // Handlers for Cycles
  const handleOpenCreateCycle = () => {
    setCycleToEdit(null);
    setIsCycleModalOpen(true);
  };

  const handleOpenEditCycle = (cycle: AgriCropCycle) => {
    setCycleToEdit(cycle);
    setIsCycleModalOpen(true);
  };

  const handleSaveCycle = (cycle: AgriCropCycle) => {
    if (cycleToEdit) {
      updateCropCycle(cycle);
      if (selectedCycle?.id === cycle.id) setSelectedCycle(cycle);
      showToast(isAr ? 'تم تحديث دورة المحصول' : 'Cycle de culture mis à jour', 'success');
    } else {
      addCropCycle(cycle);
      setSelectedCycle(cycle);
      showToast(isAr ? 'تم فتح موسم المحصول الفلاحي' : 'Nouveau cycle de culture enregistré', 'success');
    }
    setIsCycleModalOpen(false);
  };

  const handleDeleteCycle = (cycle: AgriCropCycle) => {
    deleteCropCycle(cycle.id);
    if (selectedCycle?.id === cycle.id) setSelectedCycle(null);
    showToast(isAr ? 'تم حذف دورة المحصول' : 'Cycle de culture supprimé', 'info');
  };

  // Handlers for Treatments
  const handleOpenCreateTreatment = () => {
    setTreatmentToEdit(null);
    setIsTreatmentModalOpen(true);
  };

  const handleOpenEditTreatment = (t: AgriTreatmentLog) => {
    setTreatmentToEdit(t);
    setIsTreatmentModalOpen(true);
  };

  const handleSaveTreatment = (treatment: AgriTreatmentLog) => {
    if (treatmentToEdit) {
      updateTreatmentLog(treatment);
      if (selectedTreatment?.id === treatment.id) setSelectedTreatment(treatment);
      showToast(isAr ? 'تم تحديث المعالجة في السجل' : 'Traitement sanitaire mis à jour', 'success');
    } else {
      addTreatmentLog(treatment);
      setSelectedTreatment(treatment);
      showToast(isAr ? 'تم قيد المعالجة وتفعيل فترة الأمان DAR' : 'Traitement consigné et délai DAR activé', 'success');
    }
    setIsTreatmentModalOpen(false);
  };

  const handleDeleteTreatment = (t: AgriTreatmentLog) => {
    deleteTreatmentLog(t.id);
    if (selectedTreatment?.id === t.id) setSelectedTreatment(null);
    showToast(isAr ? 'تم حذف المعالجة' : 'Traitement retiré', 'info');
  };

  // Export CSV
  const handleExportCsv = () => {
    if (activeTabMode === 'cycles') {
      const headers = ['Culture', 'Variété', 'Parcelle', 'Campagne', 'Surface Ha', 'Semis', 'Récolte Prévue', 'Rendement Prévu Qtx', 'Rendement Réalisé Qtx', 'Phase'];
      const rows = filteredCycles.map((c) => [
        `"${c.cropName.replace(/"/g, '""')}"`,
        `"${c.variety.replace(/"/g, '""')}"`,
        `"${(parcelNameMap.get(c.parcelId) || c.parcelId).replace(/"/g, '""')}"`,
        c.campaignYear,
        c.surfaceAllocatedHa,
        c.sowingDate,
        c.projectedHarvestDate,
        c.projectedYieldQtx,
        c.actualYieldQtx || 0,
        c.currentPhase,
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.href = encodeURI(csv);
      link.download = `cycles_cultures_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } else {
      const headers = ['Produit', 'Substance Active', 'Cible', 'Dose/ha', 'Date Traitement', 'DAR Jours', 'Récolte Autorisée', 'Applicateur'];
      const rows = filteredTreatments.map((t) => [
        `"${t.commercialProductName.replace(/"/g, '""')}"`,
        `"${t.activeIngredient.replace(/"/g, '""')}"`,
        `"${t.targetPestDisease.replace(/"/g, '""')}"`,
        t.dosagePerHa,
        t.treatmentDate,
        t.darDays,
        t.harvestAllowedDate,
        `"${t.operatorName.replace(/"/g, '""')}"`,
      ]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.href = encodeURI(csv);
      link.download = `traitements_phyto_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    }
    showToast(isAr ? 'تم تصدير ملف CSV' : 'Export CSV généré', 'info');
  };

  // KPIs
  const totalAllocatedHa = cropCycles.reduce((acc, c) => acc + c.surfaceAllocatedHa, 0);
  const activeDarCyclesCount = cropCycles.filter((c) => c.currentPhase === 'treatment_locked').length;
  const readyHarvestCount = cropCycles.filter((c) => c.currentPhase === 'ready_harvest').length;
  const totalTreatmentsLogged = treatmentLogs.length;

  // Cycle columns for UniversalDataCollection
  const cycleColumns: ColumnDefinition<AgriCropCycle>[] = [
    {
      id: 'crop',
      header: isAr ? 'المحصول والصنف' : 'Culture & Variété',
      accessorKey: 'cropName',
      sortable: true,
      minWidth: '200px',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shrink-0">
            <Sprout size={16} />
          </div>
          <div>
            <div className="font-bold text-xs text-neutral-900 dark:text-white">
              {c.cropName}
            </div>
            <div className="text-[10px] text-neutral-400">
              {c.variety} • Campagne {c.campaignYear}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'parcel',
      header: isAr ? 'القطعة الفلاحية' : 'Parcelle',
      accessorKey: 'parcelId',
      sortable: true,
      minWidth: '160px',
      cell: (c) => (
        <div className="text-xs text-neutral-700 dark:text-neutral-300">
          <div className="font-medium truncate max-w-[150px]">
            {parcelNameMap.get(c.parcelId) || c.parcelId}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono">
            {c.surfaceAllocatedHa} ha alloués
          </div>
        </div>
      ),
    },
    {
      id: 'dates',
      header: isAr ? 'رزنامة الحملة' : 'Calendrier',
      accessorKey: 'sowingDate',
      sortable: true,
      minWidth: '150px',
      cell: (c) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          <div>Semis: <span className="font-mono text-neutral-900 dark:text-white">{c.sowingDate}</span></div>
          <div className="text-[10px] text-neutral-400">Récolte: <span className="font-mono">{c.projectedHarvestDate}</span></div>
        </div>
      ),
    },
    {
      id: 'yield',
      header: isAr ? 'المحصول (قنطار)' : 'Rendement (Qtx)',
      accessorKey: 'projectedYieldQtx',
      sortable: true,
      minWidth: '140px',
      cell: (c) => (
        <div className="text-xs">
          <div className="font-mono font-bold text-neutral-900 dark:text-white">
            {c.actualYieldQtx ? `${c.actualYieldQtx} / ` : ''}{c.projectedYieldQtx} Qtx
          </div>
          <div className="text-[10px] text-neutral-400">
            {Math.round(c.projectedYieldQtx / (c.surfaceAllocatedHa || 1))} Qtx/ha
          </div>
        </div>
      ),
    },
    {
      id: 'phase',
      header: isAr ? 'حالة الدورة' : 'Phase Actuelle',
      accessorKey: 'currentPhase',
      sortable: true,
      minWidth: '150px',
      cell: (c) => {
        const conf = getPhaseConfig(c.currentPhase);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${conf.bg}`}>
              {conf.label}
            </span>
            {c.activeDarLockoutUntil && (
              <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle size={11} />
                DAR jusqu'au {c.activeDarLockoutUntil}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // Treatment columns for UniversalDataCollection
  const treatmentColumns: ColumnDefinition<AgriTreatmentLog>[] = [
    {
      id: 'product',
      header: isAr ? 'المادة والمبيد' : 'Produit Commercial',
      accessorKey: 'commercialProductName',
      sortable: true,
      minWidth: '180px',
      cell: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="font-bold text-xs text-neutral-900 dark:text-white">
              {t.commercialProductName}
            </div>
            <div className="text-[10px] text-neutral-400">
              {t.activeIngredient}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'target',
      header: isAr ? 'الآفة المستهدفة' : 'Cible / Maladie',
      accessorKey: 'targetPestDisease',
      sortable: true,
      minWidth: '160px',
      cell: (t) => (
        <div className="text-xs text-neutral-700 dark:text-neutral-300">
          <div className="font-medium">{t.targetPestDisease}</div>
          <div className="text-[10px] text-neutral-400 font-mono">Dose: {t.dosagePerHa}</div>
        </div>
      ),
    },
    {
      id: 'parcel',
      header: isAr ? 'القطعة المعالجة' : 'Parcelle',
      accessorKey: 'parcelId',
      sortable: true,
      minWidth: '140px',
      cell: (t) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          {parcelNameMap.get(t.parcelId) || t.parcelId}
        </div>
      ),
    },
    {
      id: 'dar',
      header: isAr ? 'فترة الأمان DAR' : 'Délai DAR & Récolte',
      accessorKey: 'darDays',
      sortable: true,
      minWidth: '170px',
      cell: (t) => {
        const safety = evaluateDarSafety(t.treatmentDate, t.darDays);
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                safety.isLocked
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}>
                {t.darDays} jours DAR
              </span>
              {safety.isLocked && (
                <span className="text-[10px] text-amber-600 font-mono font-bold">
                  ({safety.daysRemaining}j restants)
                </span>
              )}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              Autorisé: <span className="font-mono text-neutral-700 dark:text-neutral-300">{t.harvestAllowedDate}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'operator',
      header: isAr ? 'المطبق المسؤول' : 'Applicateur',
      accessorKey: 'operatorName',
      sortable: true,
      minWidth: '140px',
      cell: (t) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          <div>{t.operatorName}</div>
          <div className="text-[10px] text-neutral-400 font-mono">{t.treatmentDate}</div>
        </div>
      ),
    },
  ];

  // Actions for Cycles
  const getCycleActions = (c: AgriCropCycle): ActionButtonDef[] => [
    {
      label: isAr ? 'تعديل الدورة' : 'Modifier',
      icon: <Edit size={14} />,
      onClick: () => handleOpenEditCycle(c),
    },
    {
      label: isAr ? 'حذف' : 'Supprimer',
      icon: <Trash2 size={14} />,
      variant: 'danger',
      onClick: () => handleDeleteCycle(c),
    },
  ];

  // Actions for Treatments
  const getTreatmentActions = (t: AgriTreatmentLog): ActionButtonDef[] => [
    {
      label: isAr ? 'تعديل' : 'Modifier',
      icon: <Edit size={14} />,
      onClick: () => handleOpenEditTreatment(t),
    },
    {
      label: isAr ? 'حذف' : 'Supprimer',
      icon: <Trash2 size={14} />,
      variant: 'danger',
      onClick: () => handleDeleteTreatment(t),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'دورات المحاصيل والسجل الصحي النباتي' : 'Cycles de Culture & Carnet Phyto'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {cropCycles.length} {isAr ? 'دورات' : 'cycles'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'متابعة الحملات الزراعية، المردود بالقنطار، وقفل الأمان الكيميائي DAR'
                : 'Planification des assolements, rendements et verrouillage de récolte sanitaire'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AtriumButton
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download size={14} />}
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </AtriumButton>

          {activeTabMode === 'cycles' ? (
            <AtriumButton
              variant="primary"
              onClick={handleOpenCreateCycle}
              icon={<Plus size={14} />}
            >
              {isAr ? 'دورة محصول جديدة' : 'Nouveau Cycle de Culture'}
            </AtriumButton>
          ) : (
            <AtriumButton
              variant="primary"
              onClick={handleOpenCreateTreatment}
              icon={<ShieldCheck size={14} />}
            >
              {isAr ? 'قيد معالجة جديدة (DAR)' : 'Consigner Traitement Phyto'}
            </AtriumButton>
          )}
        </div>
      </div>

      {/* Main Switcher: Cycles vs Phytosanitary Ledger */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTabMode('cycles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTabMode === 'cycles'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Sprout size={15} />
          {isAr ? 'دورات المحاصيل والمواسم الفلاحية' : 'Cycles de Culture & Assolement'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">
            {cropCycles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode('treatments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTabMode === 'treatments'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <ShieldCheck size={15} />
          {isAr ? 'السجل الصحي وفترة الأمان DAR' : 'Carnet Phyto & Délais DAR'}
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-1">
            {treatmentLogs.length}
          </span>
        </button>
      </div>

      {/* Active DAR Alert Banner */}
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
                : 'L’émission de bons de récolte et de pesée reste bloquée jusqu’à expiration des délais de rémanence homologués.'}
            </p>
          </div>
        </div>
      )}

      {/* Top 3-Card Metrics Tray */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500">
            {isAr ? 'المساحة الإجمالية للدورات' : 'Superficie Assolement Actif'}
          </span>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white mt-1">
            {totalAllocatedHa.toFixed(1)} <span className="text-xs font-normal text-neutral-500">ha</span>
          </div>
          <p className="text-[10.5px] text-[#C4785A] mt-0.5">
            {cropCycles.length} {isAr ? 'دورات موسمية' : 'cycles en exploitation'}
          </p>
        </div>

        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500">
            {isAr ? 'جاهز للحصاد والجني' : 'Cultures Prêtes pour Récolte'}
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {readyHarvestCount} <span className="text-xs font-normal text-neutral-500">{isAr ? 'محاصيل' : 'parcelles'}</span>
          </div>
          <p className="text-[10.5px] text-neutral-400 mt-0.5">
            {isAr ? 'تم استيفاء شروط النضج والأمان' : 'Conformes pour pesée pont-bascule'}
          </p>
        </div>

        <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
          <span className="text-[11px] font-medium text-neutral-500">
            {isAr ? 'معالجات المقيدة بالسجل' : 'Traitements Phyto Enregistrés'}
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {totalTreatmentsLogged}
          </div>
          <p className="text-[10.5px] text-neutral-400 mt-0.5">
            {activeDarCyclesCount} {isAr ? 'فترات أمان نشطة حالياً' : 'DAR actifs en cours'}
          </p>
        </div>
      </div>

      {/* Main Collection & Side Drawer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: UniversalDataCollection Table/Grid */}
        <div className="lg:col-span-8">
          {activeTabMode === 'cycles' ? (
            <UniversalDataCollection<AgriCropCycle>
              data={filteredCycles}
              columns={cycleColumns}
              keyExtractor={(c) => c.id}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pinnedIds={pinnedIds}
              onPinToggle={(c) => {
                const id = typeof c === 'string' ? c : c.id;
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
              onItemClick={(c: AgriCropCycle) => setSelectedCycle(c)}
              customActions={(c: AgriCropCycle) => getCycleActions(c)}
              emptyTitle={isAr ? 'لا توجد دورات محاصيل مسجلة' : 'Aucun cycle de culture enregistré'}
              renderGridCard={(c: AgriCropCycle) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCycle(c)}
                  className={`p-4 rounded-2xl border transition cursor-pointer relative space-y-3 ${
                    selectedCycle?.id === c.id
                      ? 'border-[#C4785A] bg-[#C4785A]/5'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                        <Sprout size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                          {c.cropName}
                        </h3>
                        <p className="text-[10px] text-neutral-400">
                          {c.variety} • Campagne {c.campaignYear}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPhaseConfig(c.currentPhase).bg}`}>
                      {getPhaseConfig(c.currentPhase).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div>
                      <span className="text-neutral-400">Surface: </span>
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {c.surfaceAllocatedHa} ha
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Prévu: </span>
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {c.projectedYieldQtx} Qtx
                      </span>
                    </div>
                  </div>

                  {c.activeDarLockoutUntil && (
                    <div className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1 font-medium">
                      <AlertTriangle size={12} />
                      DAR actif jusqu’au {c.activeDarLockoutUntil}
                    </div>
                  )}
                </div>
              )}
            />
          ) : (
            <UniversalDataCollection<AgriTreatmentLog>
              data={filteredTreatments}
              columns={treatmentColumns}
              keyExtractor={(t) => t.id}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pinnedIds={pinnedIds}
              onPinToggle={(t) => {
                const id = typeof t === 'string' ? t : t.id;
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
              onItemClick={(t: AgriTreatmentLog) => setSelectedTreatment(t)}
              customActions={(t: AgriTreatmentLog) => getTreatmentActions(t)}
              emptyTitle={isAr ? 'لا توجد معالجات مسجلة' : 'Aucun traitement phytosanitaire consigné'}
            />
          )}
        </div>

        {/* Right Side: 390px Inline Side Inspector Drawer */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
          {activeTabMode === 'cycles' ? (
            selectedCycle ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                      <Sprout size={16} />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-neutral-900 dark:text-white">
                        {selectedCycle.cropName}
                      </h2>
                      <p className="text-[10px] text-neutral-400">
                        {selectedCycle.variety} • Campagne {selectedCycle.campaignYear}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPhaseConfig(selectedCycle.currentPhase).bg}`}>
                    {getPhaseConfig(selectedCycle.currentPhase).label}
                  </span>
                </div>

                <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('details')}
                    className={`pb-2 px-2 font-bold border-b-2 transition ${
                      inspectorTab === 'details'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500'
                    }`}
                  >
                    {isAr ? 'البيانات' : 'Détails'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('rendement')}
                    className={`pb-2 px-2 font-bold border-b-2 transition ${
                      inspectorTab === 'rendement'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500'
                    }`}
                  >
                    {isAr ? 'المردود' : 'Rendement'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('couts')}
                    className={`pb-2 px-2 font-bold border-b-2 transition ${
                      inspectorTab === 'couts'
                        ? 'border-[#C4785A] text-[#C4785A]'
                        : 'border-transparent text-neutral-500'
                    }`}
                  >
                    {isAr ? 'التكاليف' : 'Coûts'}
                  </button>
                </div>

                {inspectorTab === 'details' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Parcelle:</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {parcelNameMap.get(selectedCycle.parcelId) || selectedCycle.parcelId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Surface Allouée:</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          {selectedCycle.surfaceAllocatedHa} ha
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Lot Semence:</span>
                        <span className="font-mono text-neutral-700 dark:text-neutral-300">
                          {selectedCycle.seedLotNumber || 'CCLS-Standard'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Date Semis:</span>
                        <span className="font-mono text-neutral-700 dark:text-neutral-300">
                          {selectedCycle.sowingDate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Récolte Prévue:</span>
                        <span className="font-mono text-neutral-700 dark:text-neutral-300">
                          {selectedCycle.projectedHarvestDate}
                        </span>
                      </div>
                    </div>

                    {selectedCycle.activeDarLockoutUntil && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Interdiction de récolte active</div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            {selectedCycle.activePestWarning || `DAR jusqu'au ${selectedCycle.activeDarLockoutUntil}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {inspectorTab === 'rendement' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Objectif Prévu:</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          {selectedCycle.projectedYieldQtx} Qtx
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Réalisé:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {selectedCycle.actualYieldQtx || 0} Qtx
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#C4785A] h-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((selectedCycle.actualYieldQtx || 0) /
                                  (selectedCycle.projectedYieldQtx || 1)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10.5px] text-neutral-400 text-right">
                        Taux de réalisation :{' '}
                        {Math.round(
                          ((selectedCycle.actualYieldQtx || 0) /
                            (selectedCycle.projectedYieldQtx || 1)) *
                            100
                        )}
                        %
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === 'couts' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Intrants & Semences:</span>
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">
                          {formatMoney(selectedCycle.totalInputCostDzd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Main d'œuvre Tâcherons:</span>
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">
                          {formatMoney(selectedCycle.totalLaborCostDzd || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Matériel & Carburant:</span>
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">
                          {formatMoney(selectedCycle.totalMachineryCostDzd || 0)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between font-bold">
                        <span>Total Coûts Engagés:</span>
                        <span className="font-mono text-[#C4785A]">
                          {formatMoney(
                            (selectedCycle.totalInputCostDzd || 0) +
                              (selectedCycle.totalLaborCostDzd || 0) +
                              (selectedCycle.totalMachineryCostDzd || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
                  <AtriumButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleOpenEditCycle(selectedCycle)}
                    icon={<Edit size={13} />}
                  >
                    {isAr ? 'تعديل الدورة' : 'Modifier le Cycle'}
                  </AtriumButton>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-neutral-400 text-xs">
                {isAr ? 'حدد دورة محصول لمعاينة التفاصيل' : 'Sélectionnez un cycle pour afficher l’inspecteur'}
              </div>
            )
          ) : selectedTreatment ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {selectedTreatment.commercialProductName}
                    </h2>
                    <p className="text-[10px] text-neutral-400">
                      {selectedTreatment.activeIngredient}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  {selectedTreatment.darDays}j DAR
                </span>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Cible / Maladie:</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {selectedTreatment.targetPestDisease}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Parcelle:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {parcelNameMap.get(selectedTreatment.parcelId) || selectedTreatment.parcelId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Dose appliquée:</span>
                  <span className="font-mono font-semibold">{selectedTreatment.dosagePerHa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Date Application:</span>
                  <span className="font-mono">{selectedTreatment.treatmentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Récolte Autorisée:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTreatment.harvestAllowedDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Applicateur:</span>
                  <span>{selectedTreatment.operatorName}</span>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl text-xs space-y-1">
                <span className="text-neutral-400 font-medium">Consignes & Météo:</span>
                <p className="text-neutral-700 dark:text-neutral-300 italic text-[11px]">
                  "{selectedTreatment.notes || 'Aucune observation particulière.'}"
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenEditTreatment(selectedTreatment)}
                  icon={<Edit size={13} />}
                >
                  {isAr ? 'تعديل المعالجة' : 'Modifier le Traitement'}
                </AtriumButton>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-neutral-400 text-xs">
              {isAr ? 'حدد معالجة لمعاينة التفاصيل' : 'Sélectionnez un traitement pour afficher l’inspecteur'}
            </div>
          )}
        </div>
      </div>

      {/* Crop Cycle Modal */}
      <AgriCropCycleModal
        isOpen={isCycleModalOpen}
        onClose={() => setIsCycleModalOpen(false)}
        onSave={handleSaveCycle}
        cycleToEdit={cycleToEdit}
        parcels={parcels}
      />

      {/* Phytosanitary Treatment Modal */}
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
