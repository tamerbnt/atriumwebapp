import React, { useState, useMemo } from 'react';
import {
  Building,
  Plus,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  HardHat,
  FileSpreadsheet,
  BookOpen,
  DollarSign,
  TrendingUp,
  Download,
  Trash2,
  Edit,
  Pin,
  X,
  Save,
  Check,
  Send,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { ContractorProject, ContractorBoqItem, ContractorDailyLog } from '../../../types';
import { useContractorData } from './contractorData';
import { ContractorProjectModal } from './ContractorProjectModal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const ContractorSitesView: React.FC = () => {
  const { language, showToast } = useAtriumStore();
  const isAr = language === 'ar';
  const {
    projects,
    boqItems,
    dailyLogs,
    selectedProjectId,
    setSelectedProjectId,
    addProject,
    updateProject,
    deleteProject,
    addDailyLog,
  } = useContractorData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['proj_btp_01']));
  const [sortBy, setSortBy] = useState<string>('projectCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & 390px Inspector Drawer State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ContractorProject | null>(null);

  // 390px Inline Side Inspector
  const [selectedProject, setSelectedProject] = useState<ContractorProject | null>(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'dossier' | 'boq' | 'logs' | 'notes'>('dossier');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  // Sync selectedProject when selectedProjectId changes from external
  React.useEffect(() => {
    if (selectedProjectId) {
      const match = projects.find((p) => p.id === selectedProjectId);
      if (match) setSelectedProject(match);
    }
  }, [selectedProjectId, projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterStatus !== 'All' && p.status !== filterStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = p.projectCode.toLowerCase().includes(q);
        const matchesName = p.projectName.toLowerCase().includes(q);
        const matchesClient = p.clientName.toLowerCase().includes(q);
        const matchesLoc = p.siteLocation.toLowerCase().includes(q);
        const matchesSup = p.supervisorName.toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesClient && !matchesLoc && !matchesSup) return false;
      }
      return true;
    });
  }, [projects, filterStatus, searchQuery]);

  // KPIs
  const activeCount = projects.filter((p) => p.status === 'InProgress').length;
  const handoverCount = projects.filter((p) => p.status === 'ProvisionalHandover' || p.status === 'DefinitiveHandover').length;
  const totalContractDzd = projects.reduce((acc, p) => acc + p.contractAmountDzd, 0);
  const totalRetentionDzd = projects.reduce((acc, p) => acc + p.retentionAmountDzd, 0);

  // Actions
  const handlePin = (p: ContractorProject) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    showToast(
      pinnedIds.has(p.id)
        ? (isAr ? 'تم إلغاء التثبيت' : 'Chantier désépinglé')
        : (isAr ? 'تم تثبيت الورشة' : 'Chantier épinglé'),
      'info'
    );
  };

  const handleEdit = (p: ContractorProject) => {
    setProjectToEdit(p);
    setIsProjectModalOpen(true);
  };

  const handleDelete = (p: ContractorProject) => {
    deleteProject(p.id);
    if (selectedProject?.id === p.id) {
      setSelectedProject(null);
    }
    showToast(isAr ? 'تم حذف ملف الورشة' : 'Fiche chantier supprimée', 'success');
  };

  const handleQuickProgress = (p: ContractorProject) => {
    const nextProgress = Math.min(100, (p.progressPercent || 0) + 5);
    const updated: ContractorProject = {
      ...p,
      progressPercent: nextProgress,
      status: nextProgress === 100 ? 'ProvisionalHandover' : p.status,
    };
    updateProject(updated);
    if (selectedProject?.id === p.id) {
      setSelectedProject(updated);
    }
    showToast(
      isAr
        ? `تم تحديث تقدم الورشة: ${nextProgress}%`
        : `Avancement chantier actualisé : ${nextProgress}%`,
      'success'
    );
  };

  const handleCreateDailyLogQuick = (p: ContractorProject) => {
    const today = new Date().toISOString().split('T')[0];
    const newLog: ContractorDailyLog = {
      id: `log_${Date.now()}`,
      accountId: 'acc_01',
      businessId: p.businessId,
      branchId: p.branchId,
      staffId: p.staffId,
      projectId: p.id,
      date: today,
      logDate: today,
      weather: 'Ensoleillé',
      weatherCondition: 'Ensoleillé / 24°C',
      headcountWorkers: 18,
      workforceCount: 18,
      equipmentOnSite: ['Grue', 'Toupie à béton'],
      tasksAccomplished: 'Poursuite ferraillage et coulage voiles périphériques niveau R+2.',
      worksSummary: 'Poursuite ferraillage et coulage voiles périphériques niveau R+2.',
      incidentsSafety: 'R.A.S',
      incidentsOrDelays: 'R.A.S - Approvisionnement agrégats conforme.',
      supervisorSignature: 'Chef de Chantier',
      createdAt: new Date().toISOString(),
    };
    addDailyLog(newLog);
    showToast(
      isAr ? 'تم إنشاء تقرير يومي سريع للورشة' : 'Nouveau journal quotidien consigné',
      'success'
    );
    if (selectedProject?.id === p.id) {
      setActiveTab('logs');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Code', 'Chantier', 'Client', 'Localisation', 'Montant DZD', 'Retenue 5%', 'Avancement %', 'Statut', 'Conducteur', 'Echéance'];
    const rows = filteredProjects.map((p) => [
      p.projectCode,
      `"${p.projectName.replace(/"/g, '""')}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      `"${p.siteLocation.replace(/"/g, '""')}"`,
      p.contractAmountDzd,
      p.retentionAmountDzd,
      `${p.progressPercent}%`,
      p.status,
      `"${p.supervisorName.replace(/"/g, '""')}"`,
      p.targetEndDate,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chantiers_btp_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? 'تم تصدير ملف الورشات CSV' : 'Export CSV des chantiers généré', 'info');
  };

  const handleSaveNotes = () => {
    if (!selectedProject) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ توجيهات الورشة' : 'Consignes de chantier enregistrées', 'success');
  };

  // Associate BOQ items and logs with selectedProject
  const currentBoqItems = useMemo(() => {
    if (!selectedProject) return [];
    return boqItems.filter((b) => b.projectId === selectedProject.id);
  }, [boqItems, selectedProject]);

  const currentDailyLogs = useMemo(() => {
    if (!selectedProject) return [];
    return dailyLogs.filter((l) => l.projectId === selectedProject.id);
  }, [dailyLogs, selectedProject]);

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<ContractorProject>[] = [
    {
      id: 'projectCode',
      header: isAr ? 'كود الورشة' : 'Code Chantier',
      accessorKey: 'projectCode',
      sortable: true,
      minWidth: '130px',
      cell: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <HardHat size={16} />
          </div>
          <div>
            <div className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {p.projectCode}
              {pinnedIds.has(p.id) && (
                <Pin size={10} className="fill-[#C4785A] text-[#C4785A]" />
              )}
            </div>
            <div className="text-[10px] text-neutral-400">
              {p.startDate ? `ODS: ${p.startDate}` : 'BTP'}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'projectName',
      header: isAr ? 'المشروع والعميل' : 'Chantier & Maître d’Ouvrage',
      accessorKey: 'projectName',
      sortable: true,
      minWidth: '220px',
      cell: (p) => (
        <div>
          <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-1">
            {p.projectName}
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center gap-1">
            <Building size={11} className="text-neutral-400 shrink-0" />
            <span className="truncate">{p.clientName}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'siteLocation',
      header: isAr ? 'الموقع' : 'Emplacement',
      accessorKey: 'siteLocation',
      sortable: true,
      minWidth: '150px',
      cell: (p) => (
        <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
          <MapPin size={12} className="text-[#C4785A] shrink-0" />
          <span className="truncate">{p.siteLocation}</span>
        </div>
      ),
    },
    {
      id: 'progress',
      header: isAr ? 'التقدم' : 'Avancement',
      accessorKey: 'progressPercent',
      sortable: true,
      minWidth: '140px',
      cell: (p) => (
        <div className="space-y-1 w-full max-w-[130px]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{p.progressPercent}%</span>
            <span className="text-[10px] text-neutral-400">{p.targetEndDate}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-[#C4785A] rounded-full transition-all duration-300"
              style={{ width: `${p.progressPercent}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'contractAmount',
      header: isAr ? 'مبلغ الصفقة' : 'Montant Marché',
      accessorKey: 'contractAmountDzd',
      sortable: true,
      minWidth: '140px',
      cell: (p) => (
        <div>
          <div className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
            {formatMoney(p.contractAmountDzd)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
            Ret. 5%: {formatMoney(p.retentionAmountDzd)}
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'الحالة' : 'Statut',
      accessorKey: 'status',
      sortable: true,
      minWidth: '130px',
      cell: (p) => {
        let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
        let label = 'En Cours';
        if (p.status === 'ProvisionalHandover') {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
          label = 'Réception Prov.';
        } else if (p.status === 'DefinitiveHandover') {
          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
          label = 'Réception Déf.';
        }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      id: 'supervisor',
      header: isAr ? 'المشرف' : 'Conducteur',
      accessorKey: 'supervisorName',
      sortable: true,
      minWidth: '140px',
      cell: (p) => (
        <div className="text-xs text-neutral-700 dark:text-neutral-300 truncate">
          {p.supervisorName}
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
            <HardHat size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'المشاريع والورشات (Chantiers)' : 'Projets & Chantiers en Cours'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {projects.length} {isAr ? 'ورشة' : 'sites'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'إدارة محفظة صفقات البناء، أوامر الخدمة، والتقارير الهندسية'
                : 'Fiches chantiers, attachements, bordereaux BOQ et suivi des retenues de garantie'}
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
              setProjectToEdit(null);
              setIsProjectModalOpen(true);
            }}
            icon={<Plus size={14} />}
          >
            {isAr ? 'ورشة جديدة' : 'Nouveau Chantier'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'توزيع الورشات والالتزامات التعاقدية' : 'Suivi Opérationnel & Engagements BTP'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'متابعة مراحل التنفيذ، تواريخ التسليم التعاقدية والضمانات البنكية'
              : 'État d’avancement physique, réceptions provisoires et retenues de garantie'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Chantiers en cours */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الورشات النشطة قيد الإنجاز' : 'Chantiers en Cours'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {activeCount}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'متابعة دورية مستمرة' : 'Sous conduite de travaux active'}
              </p>
            </div>
          </div>

          {/* Card 2: Réceptions */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'الاستلامات المؤقتة والنهائية' : 'Réceptions & Clôtures'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {handoverCount}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'مشاريع مسلّمة ومرحلة الضمان' : 'Livrés avec PV de réception'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'إجمالي محفظة الصفقات' : 'Montant Total Engagé'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Marchés BTP
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalContractDzd)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {formatMoney(totalRetentionDzd)} {isAr ? 'ضمان 5%' : 'retenues de garantie'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HardHat size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'دليل الورشات والمشاريع' : 'Registre Général des Chantiers'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {filteredProjects.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث برمز الورشة، المشروع...' : 'Rechercher code, projet, client...'}
              shutSize={36}
              openWidth={220}
            />

            {/* Contractor Domain Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(
                [
                  { id: 'All', label: isAr ? 'الكل' : 'Tous' },
                  { id: 'InProgress', label: isAr ? 'قيد الإنجاز' : 'En cours' },
                  { id: 'ProvisionalHandover', label: isAr ? 'استلام مؤقت' : 'Réc. provisoire' },
                  { id: 'DefinitiveHandover', label: isAr ? 'استلام نهائي' : 'Réc. définitive' },
                ] as const
              ).map((filter) => {
                const isActive = filterStatus === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setFilterStatus(filter.id)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Workspace: Left Collection + Right 390px Inspector Drawer */}
        <div className="flex items-start gap-4">
          {/* Main Collection Container */}
          <div className="flex-1 min-w-0">
            <UniversalDataCollection<ContractorProject>
            data={filteredProjects}
            columns={columns}
            keyExtractor={(p) => p.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={isAr ? 'بحث برمز الورشة، المشروع، العميل...' : 'Rechercher par code, projet, client, lieu...'}
            filterValue={filterStatus}
            onFilterChange={setFilterStatus}
            filterOptions={[
              { value: 'All', label: isAr ? 'جميع الحالات' : 'Tous les statuts' },
              { value: 'InProgress', label: isAr ? 'قيد الإنجاز' : 'En Cours' },
              { value: 'ProvisionalHandover', label: isAr ? 'استلام مؤقت' : 'Réception Provisoire' },
              { value: 'DefinitiveHandover', label: isAr ? 'استلام نهائي' : 'Réception Définitive' },
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
              setSelectedProject(p);
              setSelectedProjectId(p.id);
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyIcon={<HardHat size={32} className="text-neutral-400" />}
            emptyTitle={isAr ? 'لا توجد ورشات' : 'Aucun chantier trouvé'}
            emptyDescription={
              searchQuery
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche')
                : (isAr ? 'قم بإضافة ورشة جديدة للبدء' : 'Créez votre première fiche de chantier')
            }
            customActions={[
              {
                id: 'dailyLog',
                label: isAr ? 'تقرير يومي سريع' : 'Journal de Chantier',
                icon: <BookOpen size={14} />,
                onClick: handleCreateDailyLogQuick,
              },
              {
                id: 'progress',
                label: isAr ? 'تقديم الإنجاز (+5%)' : 'Avancer (+5%)',
                icon: <TrendingUp size={14} />,
                onClick: handleQuickProgress,
              },
            ]}
            renderGridCard={(p) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                    {p.projectCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'InProgress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {p.status === 'InProgress' ? 'En Cours' : p.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                    {p.projectName}
                  </h3>
                  <div className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-1">
                    <Building size={12} className="text-neutral-400 shrink-0" />
                    <span className="truncate">{p.clientName}</span>
                  </div>
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl">
                  <MapPin size={13} className="shrink-0 text-[#C4785A]" />
                  <span className="truncate text-[11px]">{p.siteLocation}</span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-medium text-[11px]">{isAr ? 'الإنجاز:' : 'Avancement:'}</span>
                    <span className="font-mono font-bold text-[#C4785A] text-xs">{p.progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-[#C4785A] rounded-full transition-all duration-300"
                      style={{ width: `${p.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Montant Marché</div>
                    <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5 text-xs">
                      {formatMoney(p.contractAmountDzd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Conducteur</div>
                    <div className="font-medium text-neutral-700 dark:text-neutral-300 mt-0.5 truncate max-w-[110px] text-xs">
                      {p.supervisorName}
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* 390px Inline Side Inspector Drawer */}
        {selectedProject && (
          <div className="w-[390px] shrink-0 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 shadow-lg animate-in slide-in-from-right-4 duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
                  <HardHat size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedProject.projectCode}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedProject.status === 'InProgress'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {selectedProject.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 line-clamp-1">
                    {selectedProject.projectName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleCreateDailyLogQuick(selectedProject)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-orange-50 text-[#C4785A] hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 transition-colors"
              >
                <BookOpen size={12} />
                {isAr ? 'تقرير يومي' : 'Journal'}
              </button>
              <button
                onClick={() => handleQuickProgress(selectedProject)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <TrendingUp size={12} />
                {isAr ? '+5% إنجاز' : '+5% Avancement'}
              </button>
              <button
                onClick={() => handleEdit(selectedProject)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
              >
                <Edit size={12} />
                {isAr ? 'تعديل' : 'Modifier'}
              </button>
              <button
                onClick={() => handleDelete(selectedProject)}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition-colors ml-auto"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div className="flex border-b border-neutral-100 dark:border-neutral-800 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('dossier')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'dossier'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المشروع' : 'Dossier'}
              </button>
              <button
                onClick={() => setActiveTab('boq')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'boq'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'المقايسة' : 'BOQ'}
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded-full">
                  {currentBoqItems.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`pb-2 px-2 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'logs'
                    ? 'border-[#C4785A] text-[#C4785A] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {isAr ? 'التقارير' : 'Journaux'}
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded-full">
                  {currentDailyLogs.length}
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
                {isAr ? 'التوجيهات' : 'Consignes'}
              </button>
            </div>

            {/* Tab 1: Dossier Chantier */}
            {activeTab === 'dossier' && (
              <div className="space-y-3.5 text-xs animate-in fade-in duration-150">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'صاحب المشروع:' : 'Maître d’Ouvrage:'}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[190px]">
                      {selectedProject.clientName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'موقع الورشة:' : 'Localisation:'}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[190px]">
                      {selectedProject.siteLocation}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'المهندس المشرف:' : 'Conducteur Travaux:'}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {selectedProject.supervisorName}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'قيمة الصفقة:' : 'Montant Total Marché:'}</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {formatMoney(selectedProject.contractAmountDzd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'نسبة الضمان (Retenue):' : 'Retenue de Garantie:'}</span>
                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {selectedProject.retentionGuaranteePercent}% ({formatMoney(selectedProject.retentionAmountDzd)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'تاريخ انطلاق الأشغال:' : 'Ordre de Service (ODS):'}</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {selectedProject.startDate || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">{isAr ? 'تاريخ التسليم التعاقدي:' : 'Échéance Contractuelle:'}</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {selectedProject.targetEndDate || '—'}
                    </span>
                  </div>
                </div>

                {/* Progress bar card */}
                <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {isAr ? 'نسبة الإنجاز الفعلية' : 'Avancement Consigné'}
                    </span>
                    <span className="font-mono font-bold text-[#C4785A]">
                      {selectedProject.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full bg-[#C4785A] rounded-full transition-all"
                      style={{ width: `${selectedProject.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: BOQ / Devis */}
            {activeTab === 'boq' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150 max-h-[360px] overflow-y-auto pr-1">
                {currentBoqItems.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <FileSpreadsheet size={28} className="mx-auto mb-2 opacity-40" />
                    <p>{isAr ? 'لا توجد مقايسة مسجلة لهذه الورشة' : 'Aucun article BOQ lié à ce chantier'}</p>
                  </div>
                ) : (
                  currentBoqItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[10px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-700 dark:text-neutral-300">
                          {item.itemCode}
                        </span>
                        <span className="font-mono text-neutral-900 dark:text-white font-bold">
                          {formatMoney(item.totalPlannedDzd)}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 line-clamp-2">
                        {item.designation}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                        <span>
                          Qté: {item.executedQty} / {item.plannedQty} {item.unit}
                        </span>
                        <span className="font-mono text-[#C4785A] font-semibold">
                          {Math.round((item.executedQty / item.plannedQty) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Daily Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150 max-h-[360px] overflow-y-auto pr-1">
                {currentDailyLogs.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
                    <p>{isAr ? 'لا توجد تقارير يومية مسجلة' : 'Aucun journal quotidien consigné'}</p>
                    <button
                      onClick={() => handleCreateDailyLogQuick(selectedProject)}
                      className="mt-3 text-[#C4785A] hover:underline text-xs font-semibold"
                    >
                      {isAr ? '+ إنشاء أول تقرير يومي' : '+ Créer le premier journal'}
                    </button>
                  </div>
                ) : (
                  currentDailyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-[#C4785A]">
                          {log.logDate}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {log.workforceCount} ouvriers • {log.weatherCondition}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-800 dark:text-neutral-200">
                        {log.worksSummary}
                      </p>
                      {log.incidentsOrDelays && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={11} className="shrink-0" />
                          <span className="truncate">{log.incidentsOrDelays}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Directives & Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs animate-in fade-in duration-150">
                <p className="text-neutral-500 text-[11px]">
                  {isAr
                    ? 'تعليمات وتوجيهات السلامة وتنبيهات توريد المواد لمهندس الورشة:'
                    : 'Consignes de sécurité, ordres de service internes et réserves du conducteur :'}
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? 'سجل ملاحظات الورشة، تعليمات السلامة والتموين...'
                      : 'Noter les consignes de ferraillage, contrôles de résistance béton, sécurité EPI...'
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
                      {isAr ? 'تم الحفظ بنجاح' : 'Consignes enregistrées'}
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isAr ? 'حفظ التوجيهات' : 'Enregistrer les consignes'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* New / Edit Project Modal */}
      <ContractorProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        onSave={(proj) => {
          if (projectToEdit) {
            updateProject(proj);
            if (selectedProject?.id === proj.id) {
              setSelectedProject(proj);
            }
          } else {
            addProject(proj);
            setSelectedProject(proj);
          }
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        initialData={projectToEdit}
      />
    </div>
  );
};
