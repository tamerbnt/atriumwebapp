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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriLivestock } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const AgricultureLivestockView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { livestock, addLivestock, updateLivestock, deleteLivestock } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['ani_01']));
  const [sortBy, setSortBy] = useState<string>('earTagNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [animalToEdit, setAnimalToEdit] = useState<AgriLivestock | null>(null);

  // Form states inside Modal
  const [earTag, setEarTag] = useState('DZ-16-');
  const [species, setSpecies] = useState<AgriLivestock['species']>('Bovine');
  const [breed, setBreed] = useState('Holstein Frisonne Prime');
  const [gender, setGender] = useState<AgriLivestock['gender']>('Female');
  const [birthDate, setBirthDate] = useState('2023-05-10');
  const [milkProduction, setMilkProduction] = useState('25.0');
  const [healthStatus, setHealthStatus] = useState<AgriLivestock['healthStatus']>('Healthy');
  const [notes, setNotes] = useState('Vaccination à jour. Bon état corporel.');

  // 390px Inline Side Inspector
  const [selectedAnimal, setSelectedAnimal] = useState<AgriLivestock | null>(() => {
    return livestock[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'fiche' | 'milk' | 'vet' | 'notes'>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const openCreateModal = () => {
    setAnimalToEdit(null);
    setEarTag(`DZ-16-${Math.floor(1000 + Math.random() * 9000)}`);
    setSpecies('Bovine');
    setBreed('Holstein Frisonne Prime');
    setGender('Female');
    setBirthDate('2023-05-10');
    setMilkProduction('25.0');
    setHealthStatus('Healthy');
    setNotes('Vaccination à jour. Bon état corporel.');
    setIsModalOpen(true);
  };

  const openEditModal = (a: AgriLivestock) => {
    setAnimalToEdit(a);
    setEarTag(a.earTagNumber);
    setSpecies(a.species);
    setBreed(a.breed);
    setGender(a.gender);
    setBirthDate(a.birthDate || '2023-05-10');
    setMilkProduction(String(a.dailyProductionLiters || '0'));
    setHealthStatus(a.healthStatus);
    setNotes(a.notes || '');
    setIsModalOpen(true);
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
      species,
      breed: breed.trim(),
      gender,
      birthDate,
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
    setIsModalOpen(false);
  };

  const filteredAnimals = useMemo(() => {
    return livestock.filter((a) => {
      if (speciesFilter !== 'All' && a.species !== speciesFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTag = a.earTagNumber.toLowerCase().includes(q);
        const matchesBreed = a.breed.toLowerCase().includes(q);
        const matchesSpec = a.species.toLowerCase().includes(q);
        if (!matchesTag && !matchesBreed && !matchesSpec) return false;
      }
      return true;
    });
  }, [livestock, speciesFilter, searchQuery]);

  // KPIs
  const totalMilkProduction = livestock
    .filter((a) => a.dailyProductionLiters)
    .reduce((acc, a) => acc + (a.dailyProductionLiters || 0), 0);
  const healthyCount = livestock.filter((a) => a.healthStatus === 'Healthy').length;
  const bovineCount = livestock.filter((a) => a.species === 'Bovine').length;

  // Actions
  const handlePin = (a: AgriLivestock) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
    showToast(
      pinnedIds.has(a.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Animal désépinglé')
        : (isAr ? 'تم تثبيت الحيوان' : 'Animal épinglé'),
      'info'
    );
  };

  const handleDelete = (a: AgriLivestock) => {
    deleteLivestock(a.id);
    if (selectedAnimal?.id === a.id) {
      setSelectedAnimal(null);
    }
    showToast(isAr ? 'تم حذف الحيوان من السجل' : 'Animal retiré du registre', 'success');
  };

  const handleQuickMilkYield = (a: AgriLivestock) => {
    const currentYield = a.dailyProductionLiters || 0;
    const newYield = Number((currentYield + 1.0).toFixed(1));
    const updated: AgriLivestock = {
      ...a,
      dailyProductionLiters: newYield,
    };
    updateLivestock(updated);
    if (selectedAnimal?.id === a.id) setSelectedAnimal(updated);
    showToast(
      isAr ? `تم تحديث إنتاج الحليب: ${newYield} L/j` : `Production laitière actualisée : ${newYield} L/jour`,
      'success'
    );
  };

  const handleToggleHealth = (a: AgriLivestock) => {
    const nextHealth: AgriLivestock['healthStatus'] =
      a.healthStatus === 'Healthy' ? 'InTreatment' : 'Healthy';
    const updated: AgriLivestock = {
      ...a,
      healthStatus: nextHealth,
    };
    updateLivestock(updated);
    if (selectedAnimal?.id === a.id) setSelectedAnimal(updated);
    showToast(
      isAr ? `تغيرت الحالة الصحية: ${nextHealth}` : `Statut sanitaire mis à jour : ${nextHealth}`,
      'info'
    );
  };

  const handleExportCsv = () => {
    const headers = ['N° Boucle', 'Espèce', 'Race', 'Sexe', 'Naissance', 'Statut Sanitaire', 'Production L/j', 'Notes'];
    const rows = filteredAnimals.map((a) => [
      a.earTagNumber,
      a.species,
      `"${a.breed.replace(/"/g, '""')}"`,
      a.gender,
      a.birthDate || '',
      a.healthStatus,
      a.dailyProductionLiters || 0,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cheptel_animaux_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير سجل الماشية CSV' : 'Export CSV du cheptel généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedAnimal) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ ملاحظات الحيوان' : 'Carnet de l’animal mis à jour', 'success');
  };

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<AgriLivestock>[] = [
    {
      id: 'earTagNumber',
      header: isAr ? 'رقم الحلقة' : 'N° Boucle / Tag',
      accessorKey: 'earTagNumber',
      sortable: true,
      minWidth: '150px',
      cell: (a) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Tag size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {a.earTagNumber}
              {pinnedIds.has(a.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400 capitalize">
              {a.species} • {a.gender === 'Female' ? 'Femelle' : 'Mâle'}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'breed',
      header: isAr ? 'السلالة / الفصيلة' : 'Race & Génétique',
      accessorKey: 'breed',
      sortable: true,
      minWidth: '200px',
      cell: (a) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {a.breed}
          </div>
          <div className="text-[11px] text-neutral-500">
            Né(e) le: {a.birthDate || '—'}
          </div>
        </div>
      ),
    },
    {
      id: 'healthStatus',
      header: isAr ? 'الحالة الصحية' : 'Statut Sanitaire',
      accessorKey: 'healthStatus',
      sortable: true,
      minWidth: '140px',
      cell: (a) => {
        let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
        let label = 'Sain / Conforme';
        if (a.healthStatus === 'InTreatment') {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
          label = 'En Soins';
        } else if (a.healthStatus === 'Sick' || a.healthStatus === 'Quarantine') {
          badgeColor = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300';
          label = a.healthStatus === 'Quarantine' ? 'Quarantaine' : 'Malade';
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      id: 'dailyProduction',
      header: isAr ? 'الإنتاج اليومي' : 'Production L/j',
      accessorKey: 'dailyProductionLiters',
      sortable: true,
      minWidth: '130px',
      cell: (a) => (
        a.dailyProductionLiters ? (
          <div className="flex items-center gap-1 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
            <Milk size={13} />
            <span>{a.dailyProductionLiters} L/jour</span>
          </div>
        ) : (
          <span className="text-neutral-400 text-xs">—</span>
        )
      ),
    },
    {
      id: 'notes',
      header: isAr ? 'ملاحظات السجل' : 'Observations',
      accessorKey: 'notes',
      sortable: false,
      minWidth: '180px',
      cell: (a) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
          {a.notes || 'R.A.S'}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Layers size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'إدارة الثروة الحيوانية والإنتاج اللبني' : 'Gestion du Cheptel & Production Laitière'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {livestock.length} {isAr ? 'رأس' : 'têtes'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'متابعة ترقيم المواشي، مراقبة الحلب، السجلات البيطرية والتناسل'
                : 'Identification individuelle, traçabilité des boucles, contrôle laitier et prophylaxie'}
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
            onClick={openCreateModal}
            icon={<Plus size={14} />}
          >
            {isAr ? 'تسجيل حيوان' : 'Ajouter Animal'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الأداء البيطري والإنتاجي' : 'Indicateurs Zootechniques & Sanitaires'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'تتبع الحالة الصحية للقطيع، إنتاج الحليب اليومي وتوزيع السلالات'
              : 'Santé globale du troupeau, pic de lactation et contrôles vétérinaires périodiques'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Santé */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'رؤوس الماشية السليمة' : 'Cheptel Sain & Conforme'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {healthyCount} / {livestock.length}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {Math.round((healthyCount / (livestock.length || 1)) * 100)}% {isAr ? 'مطابقة للمعاير البيطرية' : 'taux de conformité sanitaire'}
              </p>
            </div>
          </div>

          {/* Card 2: Production Laitière */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إنتاج الحليب الإجمالي اليومي' : 'Production Laitière Jour'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {totalMilkProduction.toFixed(1)} L
              </div>
              <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5 font-medium">
                {isAr ? 'متوسط الحلبة الصباحية والمسائية' : 'Traite matinale & vespérale'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي الأبقار الحلوب' : 'Vaches Laitières'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Élevage Bovin
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {bovineCount} têtes
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {isAr ? 'تتبع وراثي مسجل' : 'Inscrites au Herd-Book'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
      <div className="flex items-start gap-4">
        {/* Main Collection Container */}
        <div className="flex-1 min-w-0">
          <UniversalDataCollection<AgriLivestock>
            data={filteredAnimals}
            columns={columns}
            keyExtractor={(a) => a.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برقم الحلقة، الفصيلة، السلالة...' : 'Rechercher par boucle, race, espèce...'}
            filterValue={speciesFilter}
            onFilterChange={setSpeciesFilter}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع الفصائل' : 'Toutes les espèces' },
              { value: 'Bovine', label: 'Bovins (Vaches/Génisses)' },
              { value: 'Ovine', label: 'Ovins (Brebis/Béliers)' },
              { value: 'Caprine', label: 'Caprins (Chèvres)' },
              { value: 'Camelid', label: 'Camelins (Chameaux)' },
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
            onItemClick={(a) => {
              setSelectedAnimal(a);
            }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyIcon={<Layers size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد مواشي' : 'Aucun animal trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun animal ne correspond à votre recherche')
                : (isAr ? 'قم بإضافة أول رأس ماشية للسجل' : 'Enregistrez votre première bête au registre')
            }
            customActions={[
              {
                id: 'milkYield',
                label: isAr ? 'مراقبة الحليب (+1L)' : 'Traite (+1L)',
                icon: <Milk size={14} />,
                onClick: handleQuickMilkYield,
              },
              {
                id: 'toggleHealth',
                label: isAr ? 'تبديل الحالة الصحية' : 'Statut Sanitaire',
                icon: <ShieldCheck size={14} />,
                onClick: handleToggleHealth,
              },
            ]}
            renderGridCard={(a) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-orange-500/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-500/20">
                    {a.earTagNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      a.healthStatus === 'Healthy'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {a.healthStatus === 'Healthy' ? 'Sain' : a.healthStatus}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {a.breed}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5">
                    {a.species} • {a.gender === 'Female' ? 'Femelle' : 'Mâle'}
                  </div>
                </div>

                {a.dailyProductionLiters ? (
                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl font-medium">
                    <div className="flex items-center gap-1.5">
                      <Milk size={13} />
                      <span>Production</span>
                    </div>
                    <span className="font-mono font-bold">{a.dailyProductionLiters} L/jour</span>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 p-2 rounded-xl">
                    Élevage allaitant / engraissement
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <span>Naissance: <span className="font-mono text-neutral-700 dark:text-neutral-300">{a.birthDate || '—'}</span></span>
                  <span className="truncate max-w-[110px]">{a.notes || 'R.A.S'}</span>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedAnimal && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Tag size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedAnimal.earTagNumber}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedAnimal.healthStatus === 'Healthy'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {selectedAnimal.healthStatus}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {selectedAnimal.breed} ({selectedAnimal.species})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnimal(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedAnimal.dailyProductionLiters !== undefined && (
                <button
                  onClick={() => handleQuickMilkYield(selectedAnimal)}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                >
                  <Milk size={12} />
                  {isAr ? '+1 لتر حليب' : '+1L Traite'}
                </button>
              )}
              <button
                onClick={() => handleToggleHealth(selectedAnimal)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <ShieldCheck size={12} />
                {isAr ? 'الحالة الصحية' : 'Soins/Sain'}
              </button>
              <button
                onClick={() => openEditModal(selectedAnimal)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedAnimal)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('fiche')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'fiche'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'البطاقة' : 'Fiche Animal'}
              </button>
              <button
                onClick={() => setActiveTab('milk')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'milk'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الحليب' : 'Lait & Traite'}
              </button>
              <button
                onClick={() => setActiveTab('vet')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'vet'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'البيطرة' : 'Vétérinaire'}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'الملاحظات' : 'Carnet'}
              </button>
            </div>

            {/* Tab 1: Fiche */}
            {activeTab === 'fiche' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'رقم الحلقة الرسمية:' : 'Boucle Auriculaire:'}</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedAnimal.earTagNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'الفصيلة:' : 'Espèce Zoologique:'}</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedAnimal.species}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'السلالة:' : 'Race Génétique:'}</span>
                    <span className="font-semibold text-[#C4785A]">
                      {selectedAnimal.breed}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'الجنس:' : 'Sexe:'}</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {selectedAnimal.gender === 'Female' ? 'Femelle' : 'Mâle'}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'تاريخ الميلاد:' : 'Date de Naissance:'}</span>
                    <span className="text-neutral-800 dark:text-neutral-200 font-mono">
                      {selectedAnimal.birthDate || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'الحالة الصحية الحالية:' : 'Statut Sanitaire:'}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedAnimal.healthStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Lait & Traite */}
            {activeTab === 'milk' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {isAr ? 'الإنتاج اليومي المقاس' : 'Traite Journalière Relevée'}
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {selectedAnimal.dailyProductionLiters ? `${selectedAnimal.dailyProductionLiters} L/jour` : 'Non laitière'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Contrôle de lactation régulier. Teneur en matière grasse estimée à 38 g/L.
                  </p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Traite Matinale:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedAnimal.dailyProductionLiters ? `${(selectedAnimal.dailyProductionLiters * 0.55).toFixed(1)} L` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Traite Soir:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedAnimal.dailyProductionLiters ? `${(selectedAnimal.dailyProductionLiters * 0.45).toFixed(1)} L` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Mois en cours estimé:</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {selectedAnimal.dailyProductionLiters ? `${Math.round(selectedAnimal.dailyProductionLiters * 30.5)} Litres` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Vétérinaire */}
            {activeTab === 'vet' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[11px]">
                    <span className="text-neutral-900 dark:text-white">Vaccin Fièvre Aphteuse</span>
                    <span className="text-emerald-600 font-mono text-[10px]">Conforme</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">Rappel semestriel effectué par Dr. Vétérinaire Brahimi.</p>
                </div>

                <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[11px]">
                    <span className="text-neutral-900 dark:text-white">Dépistage Brucellose & Tuberculose</span>
                    <span className="text-emerald-600 font-mono text-[10px]">Négatif (Indemne)</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">Prélèvement sérologique conforme aux normes nationales.</p>
                </div>

                <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-[11px]">
                    <span className="text-neutral-900 dark:text-white">Vermifugation & Antiparasitaire</span>
                    <span className="text-blue-600 font-mono text-[10px]">À jour</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">Bolus d’Ivermectine administré en début de saison.</p>
                </div>
              </div>
            )}

            {/* Tab 4: Carnet / Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  {isAr
                    ? 'سجل التغذية الفردية والملاحظات السلوكية والتناسل:'
                    : 'Carnet individuel d’élevage, rationnement alimentaire et insémination :'}
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes || selectedAnimal.notes || ''}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'سجل ملاحظات الحيوان، العلف المركز، التلقيح الاصطناعي...'
                      : 'Noter les rations d’ensilage, date de saillie/IA, comportement au cornadis...'
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
                      {isAr ? 'تم الحفظ بنجاح' : 'Carnet de l’animal mis à jour'}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isAr ? 'حفظ الملاحظات' : 'Enregistrer dans le carnet'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New / Edit Animal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {animalToEdit
                      ? (isAr ? 'تعديل بيانات رأس الماشية' : 'Modifier la Fiche Animale')
                      : (isAr ? 'تسجيل رأس ماشية جديد' : 'Enregistrer un Nouvel Animal')}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {isAr ? 'ترقيم الأذن، السلالة، والتفاصيل الإنتاجية' : 'Identification par boucle, espèce, race et suivi zootechnique'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <LabelInput
                label={isAr ? 'رقم الحلقة / البوكل *' : 'Numéro de Boucle (Tag) *'}
                placeholder="Ex: DZ-16-0921"
                value={earTag}
                onChange={(e) => setEarTag(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label={isAr ? 'الفصيلة' : 'Espèce'}
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as AgriLivestock['species'])}
                  options={[
                    { value: 'Bovine', label: 'Bovins (Vaches/Génisses)' },
                    { value: 'Ovine', label: 'Ovins (Brebis/Béliers)' },
                    { value: 'Caprine', label: 'Caprins (Chèvres)' },
                    { value: 'Camelid', label: 'Camelins (Chameaux)' },
                  ]}
                />
                <LabelSelect
                  label={isAr ? 'الجنس' : 'Sexe'}
                  value={gender}
                  onChange={(e) => setGender(e.target.value as AgriLivestock['gender'])}
                  options={[
                    { value: 'Female', label: 'Femelle' },
                    { value: 'Male', label: 'Mâle' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'السلالة' : 'Race'}
                  placeholder="Ex: Holstein Frisonne, Montbéliarde..."
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'تاريخ الميلاد' : 'Date de Naissance'}
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الإنتاج اليومي (لتر/يوم)' : 'Production Lait (L/j)'}
                  type="number"
                  step="0.1"
                  value={milkProduction}
                  onChange={(e) => setMilkProduction(e.target.value)}
                />
                <LabelSelect
                  label={isAr ? 'الحالة الصحية' : 'Statut Sanitaire'}
                  value={healthStatus}
                  onChange={(e) => setHealthStatus(e.target.value as AgriLivestock['healthStatus'])}
                  options={[
                    { value: 'Healthy', label: 'Sain (Healthy)' },
                    { value: 'InTreatment', label: 'En Traitement / Soins' },
                    { value: 'Quarantine', label: 'Quarantaine' },
                    { value: 'Sick', label: 'Malade' },
                  ]}
                />
              </div>

              <LabelInput
                label={isAr ? 'ملاحظات وتوجيهات' : 'Observations & Prophylaxie'}
                placeholder="Ex: Vaccination aphteuse à jour, alimentation foin de luzerne..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {animalToEdit
                    ? (isAr ? 'حفظ التعديلات' : 'Enregistrer')
                    : (isAr ? 'تسجيل الحيوان' : 'Enregistrer l’Animal')}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
