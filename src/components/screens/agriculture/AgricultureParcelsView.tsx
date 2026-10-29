import React, { useState, useMemo } from 'react';
import {
  Sprout,
  Plus,
  Droplets,
  MapPin,
  Calendar,
  CheckCircle2,
  Tractor,
  Layers,
  ShieldCheck,
  Package,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  Activity,
  Flame,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { AgriParcel, AgriTreatmentLog, AgriHarvestTicket } from '../../../types';
import { useAgricultureData } from './agricultureData';
import { AgricultureParcelModal } from './AgricultureParcelModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const AgricultureParcelsView: React.FC = () => {
  const { language, showToast } = useAtriumStore();
  const isAr = language === 'ar';
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['parc_02']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [parcelToEdit, setParcelToEdit] = useState<AgriParcel | null>(null);

  // 390px Inline Side Inspector
  const [selectedParcel, setSelectedParcel] = useState<AgriParcel | null>(() => {
    return parcels.find((p) => p.id === selectedParcelId) || parcels[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'agronomy' | 'treatments' | 'harvests' | 'notes'>('agronomy');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  React.useEffect(() => {
    if (selectedParcelId) {
      const match = parcels.find((p) => p.id === selectedParcelId);
      if (match) setSelectedParcel(match);
    }
  }, [selectedParcelId, parcels]);

  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      if (filterIrrigation !== 'All' && p.irrigationType !== filterIrrigation) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCrop = (p.currentCrop?.toLowerCase() || '').includes(q);
        const matchesSoil = p.soilType.toLowerCase().includes(q);
        if (!matchesName && !matchesCrop && !matchesSoil) return false;
      }
      return true;
    });
  }, [parcels, filterIrrigation, searchQuery]);

  // KPIs
  const totalHectares = parcels.reduce((acc, p) => acc + p.surfaceHectares, 0);
  const dripSurface = parcels
    .filter((p) => p.irrigationType === 'Drip')
    .reduce((acc, p) => acc + p.surfaceHectares, 0);
  const activeCrops = parcels.filter((p) => p.status === 'Growing' || p.status === 'Harvesting').length;

  // Actions
  const handlePin = (p: AgriParcel) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    showToast(
      pinnedIds.has(p.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Parcelle désépinglée')
        : (isAr ? 'تم تثبيت القطعة' : 'Parcelle épinglée'),
      'info'
    );
  };

  const handleEdit = (p: AgriParcel) => {
    setParcelToEdit(p);
    setIsParcelModalOpen(true);
  };

  const handleDelete = (p: AgriParcel) => {
    deleteParcel(p.id);
    if (selectedParcel?.id === p.id) {
      setSelectedParcel(null);
    }
    showToast(isAr ? 'تم حذف القطعة الفلاحية' : 'Parcelle agricole supprimée', 'success');
  };

  const handleQuickCycle = (p: AgriParcel) => {
    const nextStatus: AgriParcel['status'] =
      p.status === 'Growing' ? 'Harvesting' : p.status === 'Harvesting' ? 'Fallow' : 'Growing';
    const updated: AgriParcel = {
      ...p,
      status: nextStatus,
    };
    updateParcel(updated);
    if (selectedParcel?.id === p.id) {
      setSelectedParcel(updated);
    }
    showToast(
      isAr
        ? `تم تحديث الطور الزراعي: ${nextStatus}`
        : `Stade phénologique actualisé : ${nextStatus}`,
      'success'
    );
  };

  const handleQuickTreatmentLog = (p: AgriParcel) => {
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
      harvestAllowedDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      operatorName: 'Équipe Agronomie Domaine',
      notes: 'Application matinale par rampe basse. DAR 3 jours respecté.',
      createdAt: new Date().toISOString(),
    };
    addTreatmentLog(newTreat);
    showToast(
      isAr ? 'تم قيد معالجة زراعية في السجل النباتي' : 'Traitement consigné dans le carnet phytosanitaire',
      'success'
    );
    if (selectedParcel?.id === p.id) {
      setActiveTab('treatments');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Nom Parcelle', 'Surface (ha)', 'Culture', 'Mode Irrigation', 'Type Sol', 'Semis', 'Récolte Prévue', 'Statut'];
    const rows = filteredParcels.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.surfaceHectares,
      `"${(p.currentCrop || '').replace(/"/g, '""')}"`,
      p.irrigationType,
      `"${p.soilType.replace(/"/g, '""')}"`,
      p.plantingDate || '',
      p.expectedHarvestDate || '',
      p.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `parcelles_agricoles_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف القطع الفلاحية CSV' : 'Export CSV du parcellaire généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedParcel) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ التوجيهات الزراعية' : 'Cahier agronomique mis à jour', 'success');
  };

  const currentTreatments = useMemo(() => {
    if (!selectedParcel) return [];
    return treatmentLogs.filter((t) => t.parcelId === selectedParcel.id);
  }, [treatmentLogs, selectedParcel]);

  const currentHarvests = useMemo(() => {
    if (!selectedParcel) return [];
    return harvestTickets.filter((h) => h.parcelId === selectedParcel.id);
  }, [harvestTickets, selectedParcel]);

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<AgriParcel>[] = [
    {
      id: 'name',
      header: isAr ? 'القطعة الزراعية' : 'Désignation Parcelle',
      accessorKey: 'name',
      sortable: true,
      minWidth: '220px',
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
            <Sprout size={16} />
          </div>
          <div>
            <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {p.name}
              {pinnedIds.has(p.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[11px] text-neutral-500 line-clamp-1">
              {p.currentCrop}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'surface',
      header: isAr ? 'المساحة' : 'Surface (ha)',
      accessorKey: 'surfaceHectares',
      sortable: true,
      minWidth: '120px',
      cell: (p) => (
        <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
          {p.surfaceHectares} ha
        </div>
      ),
    },
    {
      id: 'irrigation',
      header: isAr ? 'نظام الري' : 'Irrigation',
      accessorKey: 'irrigationType',
      sortable: true,
      minWidth: '140px',
      cell: (p) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
          <Droplets size={13} className="text-blue-500 shrink-0" />
          <span>
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
      id: 'soilType',
      header: isAr ? 'التربة' : 'Nature du Sol',
      accessorKey: 'soilType',
      sortable: true,
      minWidth: '150px',
      cell: (p) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
          {p.soilType}
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الطور' : 'Stade',
      accessorKey: 'status',
      sortable: true,
      minWidth: '120px',
      cell: (p) => {
        let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
        let label = 'En Végétation';
        if (p.status === 'Harvesting') {
          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
          label = 'En Récolte';
        } else if (p.status === 'Fallow') {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
          label = 'Jachère';
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      id: 'dates',
      header: isAr ? 'تاريخ الحصاد المتوقع' : 'Récolte Prévue',
      accessorKey: 'expectedHarvestDate',
      sortable: true,
      minWidth: '130px',
      cell: (p) => (
        <div className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
          {p.expectedHarvestDate || '—'}
        </div>
      ),
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
                {isAr ? 'القطع الفلاحية والبيوت المحمية' : 'Parcelles & Blocs de Serres'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {parcels.length} {isAr ? 'قطعة' : 'parcelles'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'مساحات المستثمرة الفلاحية، نظم الري بالتقطير، والمحاصيل الموسمية'
                : 'Cartographie parcellaire, assolements, modes d’irrigation et cycles culturaux'}
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
          <AtriumButton
            variant="primary"
            onClick={() => {
              setParcelToEdit(null);
              setIsParcelModalOpen(true);
            }}
            icon={<Plus size={14} />}
          >
            {isAr ? 'قطعة جديدة' : 'Nouvelle Parcelle'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'توزيع الأراضي الزراعية ونظم الري' : 'Répartition du Domaine & Assolement'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة القطع النشطة، شبكات التسميد السائل والري المحوري'
              : 'Surfaces cultivées, pilotage de l\'irrigation et rotation des cultures'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Parcelles actives */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'القطع قيد الإنتاج الفعلي' : 'Cultures Actives en Terre'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCrops}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'حالة نباتية مثالية' : 'En végétation & récolte active'}
              </p>
            </div>
          </div>

          {/* Card 2: Drip irrigation */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'المساحة المسقية بالتقطير' : 'Surfaces Goutte-à-Goutte'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {dripSurface.toFixed(1)} ha
              </div>
              <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5 font-medium">
                {isAr ? 'توفير المياه والتسميد' : 'Éco-irrigation et fertigation'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'المساحة الكلية للمستثمرة' : 'Superficie Totale Domaine'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Agri-Exploitation
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {totalHectares.toFixed(1)} ha
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {parcels.length} {isAr ? 'قطع مسجلة بالسجل' : 'parcelles cadastrales'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Elevated Pod Tray Enclosing Collection & Inspector Drawer */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Domain Filter Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'سجل القطع الفلاحية والبيوت المحمية' : 'Cadastre Parcellaire & Blocs de Serres'}
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? 'تتبع المحاصيل الموسمية ونظم الري بالتقطير والمحوري' : 'Cartographie des assolements et statut hydrique par parcelle'}
            </p>
          </div>

          {/* Authentic Agriculture Irrigation Capsules */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs overflow-x-auto">
            {[
              { id: 'All', label: isAr ? 'جميع القطع' : 'Toutes parcelles' },
              { id: 'Drip', label: 'Goutte-à-goutte' },
              { id: 'Pivot', label: 'Pivot' },
              { id: 'Gravity', label: 'Gravitaire' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterIrrigation(f.id)}
                className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: filterIrrigation === f.id ? '#FCEEE8' : 'transparent',
                  color: filterIrrigation === f.id ? 'var(--color-accent)' : '#71717A',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
        <div className="flex items-start gap-4">
          {/* Main Collection Container */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<AgriParcel>
            data={filteredParcels}
            columns={columns}
            keyExtractor={(p) => p.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث بالقطعة، المحصول، نوع التربة...' : 'Rechercher par parcelle, culture, type de sol...'}
            filterValue={filterIrrigation}
            onFilterChange={setFilterIrrigation}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع نظم الري' : 'Tous modes d’irrigation' },
              { value: 'Drip', label: 'Goutte-à-goutte (Drip)' },
              { value: 'Pivot', label: 'Pivot d’arrosage' },
              { value: 'Gravity', label: 'Gravitaire' },
              { value: 'Rainfed', label: 'Bour (Pluvial)' },
            ]}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pinnedIds={pinnedIds}
            onPinToggle={handlePin}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
            }}
            onItemClick={(p) => {
              setSelectedParcel(p);
              setSelectedParcelId(p.id);
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyIcon={<Sprout size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد قطع فلاحية' : 'Aucune parcelle trouvée'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche')
                : (isAr ? 'قم بإضافة أول قطعة زراعية للبدء' : 'Créez votre première parcelle de culture')
            }
            customActions={[
              {
                id: 'treatment',
                label: isAr ? 'معالجة نباتية' : 'Traitement Phyto',
                icon: <ShieldCheck size={14} />,
                onClick: handleQuickTreatmentLog,
              },
              {
                id: 'cycle',
                label: isAr ? 'تغيير الطور' : 'Avancer Stade',
                icon: <Activity size={14} />,
                onClick: handleQuickCycle,
              },
            ]}
            renderGridCard={(p) => (
              <div className="space-y-3">
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
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {p.name}
                  </h3>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    {p.currentCrop}
                  </div>
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <Droplets size={13} className="shrink-0 text-blue-500" />
                    <span className="text-[11px]">{p.irrigationType}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 truncate max-w-[110px]">{p.soilType}</span>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-neutral-500">
                    Semis: <span className="font-mono text-neutral-700 dark:text-neutral-300">{p.plantingDate || '—'}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Récolte: <span className="font-mono text-neutral-700 dark:text-neutral-300">{p.expectedHarvestDate || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedParcel && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
                  <Sprout size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedParcel.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedParcel.status === 'Growing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : selectedParcel.status === 'Harvesting'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {selectedParcel.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {selectedParcel.surfaceHectares} ha • {selectedParcel.currentCrop}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedParcel(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleQuickTreatmentLog(selectedParcel)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <ShieldCheck size={12} />
                {isAr ? 'معالجة' : 'Traitement'}
              </button>
              <button
                onClick={() => handleQuickCycle(selectedParcel)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <Activity size={12} />
                {isAr ? 'الطور التالي' : 'Cycle'}
              </button>
              <button
                onClick={() => handleEdit(selectedParcel)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedParcel)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('agronomy')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'agronomy'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الزراعة' : 'Agronomie'}
              </button>
              <button
                onClick={() => setActiveTab('treatments')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'treatments'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المعالجات' : 'Phyto & DAR'}
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded-full">
                  {currentTreatments.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('harvests')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'harvests'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الحصاد' : 'Récolte'}
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded-full">
                  {currentHarvests.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الكراس' : 'Cahier'}
              </button>
            </div>

            {/* Tab 1: Agronomie */}
            {activeTab === 'agronomy' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'المساحة:' : 'Surface Cadastrale:'}</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedParcel.surfaceHectares} Hectares
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'المحصول المزروع:' : 'Culture en Place:'}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedParcel.currentCrop}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'طريقة الري:' : 'Système d’Irrigation:'}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedParcel.irrigationType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'نوع التربة:' : 'Pédologie / Sol:'}</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {selectedParcel.soilType}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'تاريخ الغرس / البذر:' : 'Date de Semis:'}</span>
                    <span className="text-neutral-800 dark:text-neutral-200 font-mono">
                      {selectedParcel.plantingDate || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'تاريخ الحصاد المتوقع:' : 'Récolte Prévisionnelle:'}</span>
                    <span className="text-neutral-800 dark:text-neutral-200 font-mono">
                      {selectedParcel.expectedHarvestDate || '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Treatments & DAR */}
            {activeTab === 'treatments' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150 max-h-[360px] overflow-y-auto pr-1">
                {currentTreatments.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <ShieldCheck size={28} className="mx-auto mb-2 opacity-40" />
                    <p>{isAr ? 'لا توجد معالجات مسجلة' : 'Aucun traitement phytosanitaire consigné'}</p>
                    <button
                      onClick={() => handleQuickTreatmentLog(selectedParcel)}
                      className="mt-3 text-emerald-600 hover:underline text-xs font-semibold"
                    >
                      {isAr ? '+ قيد معالجة جديدة' : '+ Consigner un traitement'}
                    </button>
                  </div>
                ) : (
                  currentTreatments.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-900 dark:text-white text-[11px]">
                          {t.commercialProductName}
                        </span>
                        <span className="font-mono text-[10px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-1.5 py-0.5 rounded font-bold">
                          DAR: {t.darDays}j
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        {t.activeIngredient} • {t.dosagePerHa}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
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

            {/* Tab 3: Harvests */}
            {activeTab === 'harvests' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150 max-h-[360px] overflow-y-auto pr-1">
                {currentHarvests.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <Package size={28} className="mx-auto mb-2 opacity-40" />
                    <p>{isAr ? 'لا توجد تذاكر جني مسجلة' : 'Aucun bon de pesée / récolte consigné'}</p>
                  </div>
                ) : (
                  currentHarvests.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[11px] text-[#C4785A]">
                          {h.ticketCode}
                        </span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">
                          {h.netWeightKg} Kg
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        Variété: {h.cropVariety} • Calibre: {h.qualityGrade}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Date: {h.harvestDate} • {h.destinationStorage}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Cahier / Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  {isAr
                    ? 'كراس الحقل والملاحظات الفلاحية وبرامج التسميد والمكافحة:'
                    : 'Cahier d’exploitation agronomique, calendrier d’irrigation et doses d’engrais :'}
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
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-1 focus:ring-[#C4785A] outline-hidden resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#C4785A] text-white hover:bg-[#a86246] transition-colors font-medium text-xs shadow-xs"
                >
                  {noteSaved ? (
                    <>
                      <Check size={14} />
                      {isAr ? 'تم الحفظ بنجاح' : 'Cahier agronomique mis à jour'}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isAr ? 'حفظ الملاحظات' : 'Enregistrer dans le cahier'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* New / Edit Parcel Modal */}
      <AgricultureParcelModal
        isOpen={isParcelModalOpen}
        onClose={() => {
          setIsParcelModalOpen(false);
          setParcelToEdit(null);
        }}
        onSave={(parcel) => {
          if (parcelToEdit) {
            updateParcel(parcel);
            if (selectedParcel?.id === parcel.id) {
              setSelectedParcel(parcel);
            }
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
