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
  TrendingUp,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { ContractorProject, ContractorDailyLog } from '../../../types';
import { useContractorData } from './contractorData';
import { ContractorProjectModal } from './ContractorProjectModal';
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
  InspectorProgressBar,
  InspectorBigStat,
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

export const ContractorSitesView: React.FC = () => {
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
    },
    [deleteProject, selectedProject]
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
    },
    [updateProject, selectedProject]
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
      if (selectedProject?.id === p.id) setActiveTab('logs');
    },
    [addDailyLog, selectedProject]
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

  const handleSaveNotes = useCallback(
    (next: string) => {
      if (!activeProject) return;
      setInspectorNotes(next);
      showToast(isAr ? 'تم حفظ توجيهات الورشة' : 'Consignes de chantier enregistrées', 'success');
    },
    [activeProject, isAr]
  );

  const handleSelectProject = useCallback(
    (p: ContractorProject, originEl?: HTMLElement | null) => {
      if (originEl) setDrawerOpenerEl(originEl);
      setSelectedProject(p);
      setSelectedProjectId(p.id);
      setActiveTab('dossier');
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

  const getRowMeta = useCallback(
    (p: ContractorProject): Partial<KineticRowData> => {
      const br = resolveRecordBranch(p, branchesById, currentBranch, language);
      const statusVariant: KineticRowData['statusVariant'] =
        p.status === 'DefinitiveHandover'
          ? 'active'
          : p.status === 'ProvisionalHandover'
          ? 'warning'
          : 'info';
      const statusLabel =
        p.status === 'DefinitiveHandover'
          ? isAr ? 'استلام نهائي' : 'Réception Déf.'
          : p.status === 'ProvisionalHandover'
          ? isAr ? 'استلام مؤقت' : 'Réception Prov.'
          : isAr ? 'جاري' : 'En Cours';
      return {
        title: p.projectName,
        subline: `${p.projectCode} · ${p.clientName}`,
        categoryLabel: p.clientName,
        statusLabel,
        statusVariant,
        metricPrimary: formatMoney(p.contractAmountDzd, language),
        metricSecondary: `${p.progressPercent}%`,
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'المشروع وصاحب العمل' : isEn ? 'Project & Client' : 'Marché & Maître d’Ouvrage',
          primaryText: p.projectName,
          secondaryText: `${p.projectCode} · ${p.clientName}`,
          tertiaryText: br.name,
        },
        detailCol2: {
          heading: isAr ? 'التقدم والمدة' : isEn ? 'Progress & Dates' : 'Avancement & Délais',
          primaryText: `${p.progressPercent}% ${isAr ? 'منجز' : 'exécuté'}`,
          secondaryText: `${p.startDate} → ${p.revisedEndDate || p.targetEndDate || '—'}`,
        },
        detailCol3: {
          heading: isAr ? 'قيمة الصفقة' : isEn ? 'Contract Value' : 'Montant Marché',
          primaryText: formatMoney(p.contractAmountDzd, language),
          secondaryText: statusLabel,
        },
      };
    },
    [branchesById, currentBranch, language, isAr]
  );

  const getFanActions = useCallback(
    (p: ContractorProject): KineticRowFanAction[] => [
      {
        id: 'progress',
        label: '+5%',
        icon: <TrendingUp size={14} />,
        onClick: () => handleQuickProgress(p),
      },
      {
        id: 'dailyLog',
        label: isAr ? 'يومية' : 'Journal',
        icon: <BookOpen size={14} />,
        onClick: () => handleCreateDailyLogQuick(p),
      },
    ],
    [handleQuickProgress, handleCreateDailyLogQuick, isAr]
  );

  const getDetailActions = useCallback(
    (p: ContractorProject): KineticDetailAction[] => [
      {
        id: 'progress',
        label: isAr ? 'تقديم +5%' : 'Avancer +5%',
        icon: <TrendingUp size={14} />,
        onClick: () => handleQuickProgress(p),
      },
      {
        id: 'dailyLog',
        label: isAr ? 'تقرير يومي' : 'Journal Chantier',
        icon: <BookOpen size={14} />,
        onClick: () => handleCreateDailyLogQuick(p),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Modifier',
        icon: <Edit size={14} />,
        onClick: () => handleEdit(p),
      },
    ],
    [handleQuickProgress, handleCreateDailyLogQuick, handleEdit, isAr]
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
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-8 h-8 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center tabular-nums font-semibold t-small shrink-0"
            >
              <HardHat size={16} />
            </div>
            <div className="min-w-0">
              <div className="tabular-nums font-semibold t-small text-black dark:text-white flex items-center gap-2">
                {p.projectCode}
                {pinnedIds.has(p.id) && <Pin size={10} className="fill-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55">
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
            <div className="font-semibold t-small text-black dark:text-white line-clamp-1">
              {p.projectName}
            </div>
            <div className="t-cap text-black/70 dark:text-white/75 flex items-center gap-1 truncate">
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
            <div className="flex items-center gap-1 t-cap text-black/75 dark:text-white/75 truncate">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
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
            <div className="flex items-center justify-between t-cap">
              <span className="tabular-nums font-semibold text-black dark:text-white">
                {p.progressPercent}%
              </span>
              <span className="t-cap text-black/55 dark:text-white/55">
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
            <div className="tabular-nums font-semibold t-small text-black dark:text-white">
              {formatMoney(p.contractAmountDzd, language)}
            </div>
            <div className="t-cap text-emerald-600 dark:text-emerald-400">
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
              className={`inline-flex items-center px-2 py-1 rounded-full t-small font-semibold border ${badgeColor}`}
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
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<HardHat size={22} />}
        title={isAr ? 'الورشات' : isEn ? 'Sites' : 'Chantiers'}
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
            { value: 'InProgress', label: isAr ? 'جاري' : 'En Cours', count: activeCount },
            {
              value: 'ProvisionalHandover',
              label: isAr ? 'استلام' : 'Réceptions',
              count: handoverCount,
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
          items={sortedProjects}
          columns={columns}
          keyExtractor={(p) => p.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'تصدير المشاريع' : 'Exporter Chantiers',
            icon: <Download size={14} />,
            onClick: () => handleExportCsv(),
          }}
          onBulkDelete={(ids) => {
            const count = ids.size;
            runUndoBatch(
              {
                operationType: 'bulk',
                vertical: 'contractor',
                label: {
                  fr: `${count} chantiers supprimés`,
                  en: `${count} construction sites deleted`,
                  ar: `تم حذف ${count} مشاريع`,
                },
                moduleLabel: {
                  fr: 'Chantiers BTP',
                  en: 'Construction Sites',
                  ar: 'إدارة الورشات',
                },
              },
              () => {
                ids.forEach((id) => deleteProject(id));
              }
            );
            setSelectedIds(new Set<string>());
            if (selectedProject && ids.has(selectedProject.id)) setSelectedProject(null);
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
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
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
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={projects.length}
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
        categoryLabel={activeProject?.clientName || 'Marché BTP'}
        avatarText={(activeProject?.projectName || 'BT').slice(0, 2).toUpperCase()}
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
        statusClassName={
          activeProject?.status === 'DefinitiveHandover'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : activeProject?.status === 'ProvisionalHandover'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
        }
        tabs={[
          { id: 'dossier', label: isAr ? 'المشروع' : 'Dossier & Consignes' },
          { id: 'boq', label: isAr ? 'المقايسة' : 'Bordereau BOQ' },
          { id: 'logs', label: isAr ? 'التقارير' : 'Journaux' },
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

          if (tab === 'boq') {
            return (
              <InspectorSection index={0} title={isAr ? 'بنود المقايسة' : `Postes BOQ (${currentBoqItems.length})`}>
                {currentBoqItems.length === 0 ? (
                  <KineticEmptyStateMotion motionKey={`ctr-boq-${p.id}`}>
                    <EmptyState
                      variant="compact"
                      icon={<FileSpreadsheet />}
                      title={isAr ? 'لا توجد مقايسة مسجلة' : 'Aucun article BOQ lié à ce chantier'}
                    />
                  </KineticEmptyStateMotion>
                ) : (
                  <InspectorCard>
                    {currentBoqItems.map((item, idx) => (
                      <InspectorListItem
                        key={item.id}
                        title={item.designation}
                        subtitle={`${item.itemCode} · ${item.executedQty}/${item.plannedQty} ${item.unit}`}
                        metaRight={formatMoney(item.totalPlannedDzd, language)}
                        isLast={idx === currentBoqItems.length - 1}
                      />
                    ))}
                  </InspectorCard>
                )}
              </InspectorSection>
            );
          }

          if (tab === 'logs') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'التقارير اليومية' : `Journaux de chantier (${currentDailyLogs.length})`}>
                  {currentDailyLogs.length === 0 ? (
                    <KineticEmptyStateMotion motionKey={`ctr-log-${p.id}`}>
                      <EmptyState
                        variant="compact"
                        icon={<BookOpen />}
                        title={isAr ? 'لا توجد تقارير مسجلة' : 'Aucun journal quotidien consigné'}
                        secondaryAction={{
                          label: isAr ? 'إضافة تقرير يومي' : 'Nouveau journal',
                          onClick: () => handleCreateDailyLogQuick(p),
                        }}
                      />
                    </KineticEmptyStateMotion>
                  ) : (
                    <InspectorCard>
                      {currentDailyLogs.map((log, idx) => (
                        <InspectorListItem
                          key={log.id}
                          title={log.worksSummary || log.tasksAccomplished}
                          subtitle={`${log.logDate || log.date} · ${log.workforceCount ?? log.headcountWorkers} ouvriers`}
                          badge={log.incidentsOrDelays ? { label: 'HSE', tone: 'warn' } : { label: 'RAS', tone: 'ok' }}
                          isLast={idx === currentDailyLogs.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  )}
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? '+ إنشاء تقرير يومي' : '+ Consigner un journal quotidien'}
                    onClick={() => handleCreateDailyLogQuick(p)}
                  />
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'progress',
                      label: '+5% Avancement',
                      icon: <TrendingUp className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => handleQuickProgress(p),
                    },
                    {
                      id: 'journal',
                      label: 'Journal +',
                      icon: <BookOpen className="w-[18px] h-[18px]" />,
                      onClick: () => handleCreateDailyLogQuick(p),
                    },
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : 'Modifier',
                      icon: <Edit className="w-[18px] h-[18px]" />,
                      onClick: () => handleEdit(p),
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(p.id) ? 'Désépingler' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handleTogglePin(p),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1}>
                <InspectorBigStat
                  value={formatMoney(p.contractAmountDzd, language)}
                  tone="accent"
                  caption={
                    p.hasBankCautionReplacement
                      ? `Caution bancaire (${p.bankCautionReference || 'Active'})`
                      : `Retenue garantie 5%: ${formatMoney(p.retentionAmountDzd, language)}`
                  }
                />
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'تفاصيل الورشة' : 'Dossier Technique & Délais'}>
                <InspectorCard>
                  <InspectorKeyValue label="Maître d’Ouvrage" value={p.clientName} mono={false} />
                  <InspectorKeyValue label="Localisation" value={p.siteLocation} mono={false} />
                  <InspectorKeyValue label="Conducteur Travaux" value={p.supervisorName} mono={false} />
                  <InspectorKeyValue label="ODS / Échéance" value={`${p.startDate || '—'} → ${p.targetEndDate || '—'}`} />
                  <InspectorKeyValue label="Avancement physique" value={`${p.progressPercent}%`} tone="ok" isLast />
                  <InspectorProgressBar percent={p.progressPercent} tone="ok" animateKey={p.id} />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={3} title={isAr ? 'التوجيهات' : 'Consignes de chantier'}>
                <InspectorNotesField
                  value={inspectorNotes}
                  onSave={handleSaveNotes}
                  placeholder={
                    isAr
                      ? 'سجل ملاحظات الورشة...'
                      : 'Noter les consignes de ferraillage, contrôles de résistance béton...'
                  }
                />
              </InspectorSection>
            </>
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
