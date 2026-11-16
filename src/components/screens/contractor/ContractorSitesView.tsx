import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Building,
  MapPin,
  CheckCircle2,
  HardHat,
  FileSpreadsheet,
  BookOpen,
  Download,
  Edit,
  Pin,
  Save,
  Check,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { ContractorProject, ContractorDailyLog } from '../../../types';
import { useContractorData } from './contractorData';
import { ContractorProjectModal } from './ContractorProjectModal';
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

export const ContractorSitesView: React.FC = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

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
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['proj_btp_01']));
  const [sortBy, setSortBy] = useState<string>('projectCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ContractorProject | null>(null);

  const [selectedProject, setSelectedProject] = useState<ContractorProject | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dossier');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState(false);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  useEffect(() => {
    if (selectedProjectId && selectedProject && selectedProject.id !== selectedProjectId) {
      const match = projects.find((p) => p.id === selectedProjectId);
      if (match) setSelectedProject(match);
    }
  }, [selectedProjectId, projects, selectedProject]);

  const activeProject = useMemo(() => {
    if (!selectedProject) return null;
    return projects.find((p) => p.id === selectedProject.id) || selectedProject;
  }, [selectedProject, projects]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      const b = resolveRecordBranch(p, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [projects, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: projects.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || projects.length,
      });
    }
    return opts;
  }, [branches, branchCounts, currentBranch, projects.length, isAr, isEn]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterStatus !== 'All' && p.status !== filterStatus) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(p, branchesById, currentBranch, language);
        if (b.id !== branchFilter && b.name !== branchFilter) return false;
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
  }, [projects, filterStatus, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'projectCode') {
        const cmp = a.projectCode.localeCompare(b.projectCode);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'projectName') {
        const cmp = a.projectName.localeCompare(b.projectName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'progress') {
        const cmp = (a.progressPercent || 0) - (b.progressPercent || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'contractAmount') {
        const cmp = (a.contractAmountDzd || 0) - (b.contractAmountDzd || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return list;
  }, [filteredProjects, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const activeCount = useMemo(
    () => projects.filter((p) => p.status === 'InProgress').length,
    [projects]
  );
  const handoverCount = useMemo(
    () =>
      projects.filter(
        (p) => p.status === 'ProvisionalHandover' || p.status === 'DefinitiveHandover'
      ).length,
    [projects]
  );
  const totalContractDzd = useMemo(
    () => projects.reduce((acc, p) => acc + p.contractAmountDzd, 0),
    [projects]
  );
  const totalRetentionDzd = useMemo(
    () => projects.reduce((acc, p) => acc + p.retentionAmountDzd, 0),
    [projects]
  );

  const handleTogglePin = useCallback(
    (p: ContractorProject) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        const wasPinned = next.has(p.id);
        if (wasPinned) next.delete(p.id);
        else next.add(p.id);
        showToast(
          wasPinned
            ? isAr ? 'تم إلغاء التثبيت' : 'Chantier désépinglé'
            : isAr ? 'تم تثبيت الورشة' : 'Chantier épinglé',
          'info'
        );
        return next;
      });
    },
    [isAr]
  );

  const handleOpenAdd = useCallback(() => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  }, []);

  const handleEdit = useCallback((p: ContractorProject) => {
    setProjectToEdit(p);
    setIsProjectModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (p: ContractorProject) => {
      deleteProject(p.id);
      if (selectedProject?.id === p.id) setSelectedProject(null);
      showToast(isAr ? 'تم حذف ملف الورشة' : 'Fiche chantier supprimée', 'success');
    },
    [deleteProject, selectedProject, isAr]
  );

  const handleQuickProgress = useCallback(
    (p: ContractorProject) => {
      const nextProgress = Math.min(100, (p.progressPercent || 0) + 5);
      const updated: ContractorProject = {
        ...p,
        progressPercent: nextProgress,
        status: nextProgress === 100 ? 'ProvisionalHandover' : p.status,
      };
      updateProject(updated);
      if (selectedProject?.id === p.id) setSelectedProject(updated);
      showToast(
        isAr
          ? `تم تحديث تقدم الورشة: ${nextProgress}%`
          : `Avancement chantier actualisé : ${nextProgress}%`,
        'success'
      );
    },
    [updateProject, selectedProject, isAr]
  );

  const handleCreateDailyLogQuick = useCallback(
    (p: ContractorProject) => {
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
      if (selectedProject?.id === p.id) setActiveTab('logs');
    },
    [addDailyLog, selectedProject, isAr]
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      'Code',
      'Chantier',
      'Client',
      'Agence / Direction',
      'Localisation',
      'Montant DZD',
      'Retenue 5%',
      'Avancement %',
      'Statut',
      'Conducteur',
      'Échéance',
    ];
    const rows = sortedProjects.map((p) => {
      const b = resolveRecordBranch(p, branchesById, currentBranch, language);
      return [
        p.projectCode,
        p.projectName,
        p.clientName,
        b.name,
        p.siteLocation,
        p.contractAmountDzd,
        p.retentionAmountDzd,
        `${p.progressPercent}%`,
        p.status,
        p.supervisorName,
        p.targetEndDate,
      ];
    });
    downloadCsvSafe(
      `chantiers_btp_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(isAr ? 'تم تصدير ملف الورشات CSV' : 'Export CSV des chantiers généré', 'info');
  }, [sortedProjects, branchesById, currentBranch, language, isAr]);

  const handleSaveNotes = useCallback(() => {
    if (!activeProject) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    showToast(isAr ? 'تم حفظ توجيهات الورشة' : 'Consignes de chantier enregistrées', 'success');
  }, [activeProject, isAr]);

  const handleSelectProject = useCallback(
    (p: ContractorProject, originEl?: HTMLElement | null) => {
      if (originEl) setDrawerOpenerEl(originEl);
      setSelectedProject(p);
      setSelectedProjectId(p.id);
      setActiveTab('dossier');
      setNoteSaved(false);
    },
    [setSelectedProjectId]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'All') count += 1;
    if (branchFilter !== 'All') count += 1;
    return count;
  }, [filterStatus, branchFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filterStatus !== 'All') {
      chips.push({
        key: 'status',
        label: filterStatus,
        onRemove: () => setFilterStatus('All'),
      });
    }
    if (branchFilter !== 'All') {
      const opt = branchOptions.find((o) => o.value === branchFilter);
      chips.push({
        key: 'branch',
        label: opt?.label || branchFilter,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [filterStatus, branchFilter, branchOptions]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('All');
    setBranchFilter('All');
  }, []);

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: isAr ? 'حالة المشروع' : isEn ? 'Status' : 'Statut Chantier',
        value: filterStatus,
        onChange: setFilterStatus,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: projects.length },
          { value: 'InProgress', label: isAr ? 'جاري' : 'En Cours', count: activeCount },
          {
            value: 'ProvisionalHandover',
            label: isAr ? 'استلام مؤقت' : 'Réception Provisoire',
            count: projects.filter((p) => p.status === 'ProvisionalHandover').length,
          },
          {
            value: 'DefinitiveHandover',
            label: isAr ? 'استلام نهائي' : 'Réception Définitive',
            count: projects.filter((p) => p.status === 'DefinitiveHandover').length,
          },
        ],
      },
      {
        id: 'branch',
        kind: 'tiles',
        label: isAr ? 'الفرع / المديرية' : isEn ? 'Branch' : 'Agence / Direction',
        value: branchFilter,
        onChange: setBranchFilter,
        options: branchOptions,
      },
    ],
    [isAr, isEn, filterStatus, branchFilter, projects, activeCount, branchOptions]
  );

  const columns: ColumnDefinition<ContractorProject>[] = useMemo(
    () => [
      {
        key: 'projectCode',
        header: isAr ? 'كود الورشة' : 'Code Chantier',
        width: '1.5*',
        sortable: true,
        renderCell: (p) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              <HardHat size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black dark:text-white flex items-center gap-1.5">
                {p.projectCode}
                {pinnedIds.has(p.id) && <Pin size={10} className="fill-[#d4522f] text-[#d4522f]" />}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55">
                {p.startDate ? `ODS: ${p.startDate}` : 'BTP'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'projectName',
        header: isAr ? 'المشروع والعميل' : 'Chantier & Maître d’Ouvrage',
        width: '2.5*',
        sortable: true,
        renderCell: (p) => (
          <div className="min-w-0">
            <div className="font-semibold text-xs text-black dark:text-white line-clamp-1">
              {p.projectName}
            </div>
            <div className="text-[11px] text-black/70 dark:text-white/75 flex items-center gap-1 truncate">
              <Building size={11} className="text-black/55 dark:text-white/55 shrink-0" />
              <span className="truncate">{p.clientName}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
        width: '1.4*',
        sortable: true,
        renderCell: (p) => {
          const b = resolveRecordBranch(p, branchesById, currentBranch, language);
          return (
            <div className="flex items-center gap-1 text-xs text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'progress',
        header: isAr ? 'التقدم' : 'Avancement',
        width: '1.5*',
        sortable: true,
        renderCell: (p) => (
          <div className="space-y-1 w-full max-w-[130px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-black dark:text-white">
                {p.progressPercent}%
              </span>
              <span className="text-[10px] text-black/55 dark:text-white/55">
                {p.targetEndDate}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-[#d4522f] rounded-full transition-all duration-300"
                style={{ width: `${p.progressPercent}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'contractAmount',
        header: isAr ? 'مبلغ الصفقة' : 'Montant Marché',
        width: '1.6*',
        sortable: true,
        renderCell: (p) => (
          <div>
            <div className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
              {formatMoney(p.contractAmountDzd, language)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Ret. 5%: {formatMoney(p.retentionAmountDzd, language)}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut',
        width: '1.3*',
        renderCell: (p) => {
          let badgeColor =
            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
          let label = isAr ? 'جاري' : 'En Cours';
          if (p.status === 'ProvisionalHandover') {
            badgeColor =
              'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
            label = isAr ? 'استلام مؤقت' : 'Réception Prov.';
          } else if (p.status === 'DefinitiveHandover') {
            badgeColor =
              'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
            label = isAr ? 'استلام نهائي' : 'Réception Déf.';
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
    ],
    [pinnedIds, isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: projects.length > 0,
  });

  if (showSkeleton && (projects.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode={viewMode === 'grid' ? 'grid' : 'list'}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<HardHat size={22} />}
        title={isAr ? 'الورشات' : isEn ? 'Sites' : 'Chantiers'}
        subtitle={
          isAr
            ? `${projects.length} ورشة مسجلة · ${activeCount} نشطة`
            : isEn
            ? `${projects.length} construction sites · ${activeCount} active`
            : `${projects.length} chantiers enregistrés · ${activeCount} en cours d'exécution`
        }
        primaryAction={{
          label: isAr ? 'ورشة جديدة' : isEn ? 'New Site' : 'Nouveau Chantier',
          onClick: handleOpenAdd,
          dataAction: 'add-site',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'توزيع الورشات والالتزامات التعاقدية'
            : isEn
            ? 'Operational Sites & BTP Portfolio'
            : 'Suivi Opérationnel & Engagements BTP'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'الورشات النشطة قيد الإنجاز' : isEn ? 'Active Sites' : 'Chantiers en Cours',
          badgeText: isAr ? 'نشط' : 'En Cours',
          count: activeCount,
          tone: 'terracotta',
          isActive: filterStatus === 'InProgress',
          onToggle: () =>
            setFilterStatus((prev) => (prev === 'InProgress' ? 'All' : 'InProgress')),
        }}
        secondaryCard={{
          label: isAr
            ? 'الاستلامات المؤقتة والنهائية'
            : isEn
            ? 'Handovers'
            : 'Réceptions & Clôtures',
          badgeText: isAr ? 'مُسلّم' : 'Réception',
          count: handoverCount,
          tone: 'emerald',
          isActive: filterStatus === 'ProvisionalHandover',
          onToggle: () =>
            setFilterStatus((prev) =>
              prev === 'ProvisionalHandover' ? 'All' : 'ProvisionalHandover'
            ),
        }}
        darkCard={{
          label: isAr ? 'إجمالي محفظة الصفقات' : isEn ? 'Contract Portfolio' : 'Montant Total Engagé',
          badgeCount: totalRetentionDzd,
          badgePrefix: 'Ret. ',
          badgeSuffix: ' DZD',
          formatBadgeValue: (v) => Math.round(v).toLocaleString(),
          valueCount: totalContractDzd,
          formatValue: (v) => formatMoney(Math.round(v), language),
          caption: isAr ? 'ضمان مالي محتجز 5%' : 'Marchés BTP & retenues de garantie',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'دليل الورشات والمشاريع'
              : isEn
              ? 'General Sites Registry'
              : 'Registre Général des Chantiers'
          }
          liveRegionText={`${sortedProjects.length} ${isAr ? 'ورشة' : 'chantiers'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث برمز الورشة، المشروع...' : 'Rechercher code, projet, client...'
          }
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : 'Tous', count: projects.length },
            { value: 'InProgress', label: isAr ? 'جاري' : 'Cours', count: activeCount },
            {
              value: 'ProvisionalHandover',
              label: isAr ? 'مؤقت' : 'Provisoire',
              count: projects.filter((p) => p.status === 'ProvisionalHandover').length,
            },
            {
              value: 'DefinitiveHandover',
              label: isAr ? 'نهائي' : 'Définitive',
              count: projects.filter((p) => p.status === 'DefinitiveHandover').length,
            },
          ]}
          statusValue={filterStatus}
          onStatusChange={setFilterStatus}
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

        <UniversalDataCollection<ContractorProject>
          hideToolbar
          data={sortedProjects}
          columns={columns}
          keyExtractor={(p) => p.id}
          defaultViewMode={viewMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير المشاريع' : 'Exporter Chantiers',
            icon: <Download size={14} />,
            onClick: () => handleExportCsv(),
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deleteProject(id));
            setSelectedIds(new Set<string>());
            if (selectedProject && ids.has(selectedProject.id)) setSelectedProject(null);
            showToast(
              isAr ? 'تم حذف المشاريع المحددة' : 'Chantiers sélectionnés supprimés',
              'success'
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
          openItemId={activeProject?.id || null}
          onItemClick={handleSelectProject}
          onViewDetails={handleSelectProject}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyTitle={isAr ? 'لا توجد ورشات' : 'Aucun chantier trouvé'}
          emptyDescription={
            searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche'
              : isAr ? 'قم بإضافة ورشة جديدة للبدء' : 'Créez votre première fiche de chantier'
          }
          primaryActionLabel={isAr ? 'ورشة جديدة' : 'Nouveau Chantier'}
          onAddFirstItem={handleOpenAdd}
          onResetFilters={resetAllFilters}
          hasActiveFilters={searchQuery.length > 0 || activeFiltersCount > 0}
          customActions={(p) => [
            {
              id: 'dailyLog',
              label: isAr ? 'تقرير يومي سريع' : 'Journal de Chantier',
              icon: <BookOpen size={14} />,
              onClick: () => handleCreateDailyLogQuick(p),
            },
            {
              id: 'progress',
              label: isAr ? 'تقديم الإنجاز (+5%)' : 'Avancer (+5%)',
              icon: <TrendingUp size={14} />,
              onClick: () => handleQuickProgress(p),
            },
          ]}
          renderCard={(p) => (
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2.5 py-1 rounded-lg border border-[#d4522f]/20">
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
                <h3 className="text-sm font-bold text-black dark:text-white line-clamp-1">
                  {p.projectName}
                </h3>
                <div className="text-xs text-black/70 dark:text-white/75 font-medium mt-0.5 flex items-center gap-1">
                  <Building size={12} className="text-black/55 dark:text-white/55 shrink-0" />
                  <span className="truncate">{p.clientName}</span>
                </div>
              </div>
              <div className="text-xs text-black/70 dark:text-white/70 flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl">
                <MapPin size={13} className="shrink-0 text-[#d4522f]" />
                <span className="truncate text-[11px]">{p.siteLocation}</span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-black/70 dark:text-white/75 font-medium text-[11px]">
                    {isAr ? 'الإنجاز:' : 'Avancement:'}
                  </span>
                  <span className="font-mono font-bold text-[#d4522f] text-xs">
                    {p.progressPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-[#d4522f] rounded-full transition-all duration-300"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider">
                    Montant Marché
                  </div>
                  <div className="font-mono font-bold text-black dark:text-white mt-0.5 text-xs">
                    {formatMoney(p.contractAmountDzd, language)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider">
                    Conducteur
                  </div>
                  <div className="font-medium text-black dark:text-white mt-0.5 truncate max-w-[110px] text-xs">
                    {p.supervisorName}
                  </div>
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
        displayCount={sortedProjects.length}
        entityPluralLabel={isAr ? 'ورشات' : 'chantiers'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={resetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeProject)}
        item={activeProject}
        allItems={sortedProjects}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeProject?.projectCode || ''}
        subtitle={activeProject?.projectName}
        avatarText={(activeProject?.projectName || 'BTP').slice(0, 2).toUpperCase()}
        branchName={
          activeProject
            ? resolveRecordBranch(activeProject, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeProject?.status === 'ProvisionalHandover'
            ? isAr ? 'استلام مؤقت' : isEn ? 'Provisional Handover' : 'Réception Prov.'
            : activeProject?.status === 'DefinitiveHandover'
            ? isAr ? 'استلام نهائي' : isEn ? 'Definitive Handover' : 'Réception Déf.'
            : activeProject?.status === 'InProgress'
            ? isAr ? 'جاري' : isEn ? 'In Progress' : 'En Cours'
            : activeProject?.status
        }
        tabs={[
          { id: 'dossier', label: isAr ? 'المشروع' : 'Dossier' },
          { id: 'boq', label: isAr ? 'المقايسة' : 'BOQ' },
          { id: 'logs', label: isAr ? 'التقارير' : 'Journaux' },
          { id: 'notes', label: isAr ? 'التوجيهات' : 'Consignes' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(p) => handleSelectProject(p)}
        onClose={() => setSelectedProject(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(p, tab) => {
          const currentBoqItems = boqItems.filter((b) => b.projectId === p.id);
          const currentDailyLogs = dailyLogs.filter((l) => l.projectId === p.id);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <AtriumButton
                  variant="primary"
                  size="sm"
                  icon={<TrendingUp size={13} />}
                  onClick={() => handleQuickProgress(p)}
                >
                  {isAr ? '+5% إنجاز' : '+5% Avancement'}
                </AtriumButton>
                <AtriumButton
                  variant="secondary"
                  size="sm"
                  icon={<BookOpen size={13} />}
                  onClick={() => handleCreateDailyLogQuick(p)}
                >
                  {isAr ? 'تقرير يومي' : 'Journal'}
                </AtriumButton>
                <AtriumButton
                  variant="outline"
                  size="sm"
                  icon={<Edit size={13} />}
                  onClick={() => handleEdit(p)}
                >
                  {isAr ? 'تعديل' : 'Modifier'}
                </AtriumButton>
              </div>

              {tab === 'dossier' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex justify-between items-center">
                      <span className="text-black/70 dark:text-white/75">
                        {isAr ? 'صاحب المشروع:' : 'Maître d’Ouvrage:'}
                      </span>
                      <span className="font-semibold text-black dark:text-white truncate max-w-[190px]">
                        {p.clientName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black/70 dark:text-white/75">
                        {isAr ? 'موقع الورشة:' : 'Localisation:'}
                      </span>
                      <span className="font-semibold text-black dark:text-white truncate max-w-[190px]">
                        {p.siteLocation}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black/70 dark:text-white/75">
                        {isAr ? 'المهندس المشرف:' : 'Conducteur Travaux:'}
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {p.supervisorName}
                      </span>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl space-y-2 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex justify-between items-center">
                      <span className="text-black/70 dark:text-white/75">
                        {isAr ? 'قيمة الصفقة:' : 'Montant Total Marché:'}
                      </span>
                      <span className="font-mono font-bold text-black dark:text-white">
                        {formatMoney(p.contractAmountDzd, language)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black/70 dark:text-white/75">
                        {isAr ? 'الضمان المالي:' : 'Garantie Financière:'}
                      </span>
                      {p.hasBankCautionReplacement ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={11} /> Caution ({p.bankCautionReference || 'Active'})
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                          Retenue 5% ({formatMoney(p.retentionAmountDzd, language)})
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black/70 dark:text-white/75">ODS / Échéance:</span>
                      <span className="font-mono text-black dark:text-white">
                        {p.startDate || '—'} → {p.targetEndDate || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'boq' && (
                <div className="space-y-2.5 text-xs">
                  {currentBoqItems.length === 0 ? (
                    <div className="text-center py-8 text-black/55 dark:text-white/55">
                      <FileSpreadsheet size={28} className="mx-auto mb-2 opacity-40" />
                      <p>
                        {isAr
                          ? 'لا توجد مقايسة مسجلة لهذه الورشة'
                          : 'Aucun article BOQ lié à ce chantier'}
                      </p>
                    </div>
                  ) : (
                    currentBoqItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[10px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-black dark:text-white">
                            {item.itemCode}
                          </span>
                          <span className="font-mono text-black dark:text-white font-bold">
                            {formatMoney(item.totalPlannedDzd, language)}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-black dark:text-white line-clamp-2">
                          {item.designation}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'logs' && (
                <div className="space-y-2.5 text-xs">
                  {currentDailyLogs.length === 0 ? (
                    <div className="text-center py-8 text-black/55 dark:text-white/55">
                      <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
                      <p>
                        {isAr ? 'لا توجد تقارير يومية مسجلة' : 'Aucun journal quotidien consigné'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCreateDailyLogQuick(p)}
                        className="mt-3 text-[#d4522f] hover:underline text-xs font-semibold cursor-pointer"
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
                          <span className="font-mono font-bold text-[#d4522f]">
                            {log.logDate || log.date}
                          </span>
                          <span className="text-[10px] text-black/70 dark:text-white/75">
                            {log.workforceCount ?? log.headcountWorkers} ouvriers
                          </span>
                        </div>
                        <p className="text-[11px] text-black dark:text-white">
                          {log.worksSummary || log.tasksAccomplished}
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

              {tab === 'notes' && (
                <div className="space-y-3 text-xs">
                  <textarea
                    rows={6}
                    value={inspectorNotes}
                    onChange={(e) => setInspectorNotes(e.target.value)}
                    placeholder={
                      isAr
                        ? 'سجل ملاحظات الورشة...'
                        : 'Noter les consignes de ferraillage, contrôles de résistance béton...'
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-1 focus:ring-[#d4522f] outline-hidden resize-none"
                  />
                  <AtriumButton
                    variant="primary"
                    size="sm"
                    icon={noteSaved ? <Check size={14} /> : <Save size={14} />}
                    onClick={handleSaveNotes}
                  >
                    {noteSaved
                      ? isAr ? 'تم الحفظ بنجاح' : 'Consignes enregistrées'
                      : isAr ? 'حفظ التوجيهات' : 'Enregistrer les consignes'}
                  </AtriumButton>
                </div>
              )}
            </div>
          );
        }}
      />

      <ContractorProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        onSave={(proj) => {
          if (projectToEdit) {
            updateProject(proj);
            if (selectedProject?.id === proj.id) setSelectedProject(proj);
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
