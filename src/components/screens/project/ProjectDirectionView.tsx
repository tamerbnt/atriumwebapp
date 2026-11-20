import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  useAtriumSelector,
  useDashboardShellState,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentPmProjectsFromState,
  selectCurrentPmMilestonesFromState,
  selectCurrentPmMissionsFromState,
  selectCurrentPmTalentsFromState,
  selectCurrentPmPayrollBatchesFromState,
  selectCurrentPmExpensesFromState,
  selectCurrentStaffFromState,
  addPmProjectAction as addPmProject,
  deletePmProjectAction as deletePmProject,
  batchDeletePmProjectsAction as batchDeletePmProjects,
  batchUpdatePmProjectStatusAction as batchUpdatePmProjectStatus,
  approvePmExpenseAction as approvePmExpense,
  rejectPmExpenseAction as rejectPmExpense,
  batchApprovePmExpensesAction as batchApprovePmExpenses,
  approvePmPayrollBatchAction as approvePmPayrollBatch,
  batchApprovePmPayrollBatchesAction as batchApprovePmPayrollBatches,
  setActivePmSubScreenAction as setActivePmSubScreen,
  showToast,
} from '../../../services/store';
import { PMProject } from '../../../types/index';
import {
  TrendingUp,
  Plus,
  ShieldCheck,
  Eye,
  X,
  Sparkles,
  Download,
  CheckCircle,
  Ban,
  Layers,
  Pin,
  FolderKanban,
  Receipt,
  Calendar,
  Briefcase,
  UserCheck,
  Palette,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState, EMPTY_STATE_ICONS } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { useCardFilters } from '../../../hooks/useCardFilters';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { SkeletonDashboardProject } from '../../ui/skeleton/StructuralSkeletons';
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
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  KineticStatusVariant,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';
import {
  BulletChart,
  ConversionFunnel,
  KpiMetricInverseCard,
  KpiSparkCard,
  RadialGauge,
  RankedBarList,
  WaterfallChart,
} from '@/atrium';
import {
  DashboardBentoFrame,
  DashboardHeader,
  DashboardPod,
  DashboardPodGrid,
  POD_SPAN,
  getSurfaceProps,
  localizeText,
  toChartLocale,
} from '../../common/dashboard';
import {
  getFullTimeframeOptions,
  getPortfolioTimeframeOptions,
  resolveChartState,
} from '../../../utils/dashboardSelectors/common';
import { selectProjectDashboard } from '../../../utils/dashboardSelectors/coreVerticals';
import { getDashboardHelpText } from '../../../utils/dashboardSelectors/dashboardHelpText';
import { getDashboardPodTitle } from '../../../utils/dashboardSelectors/dashboardPodTitles';

interface ProjectDirectionViewProps {
  initialTab?: 'dashboard' | 'projects' | 'new_project' | 'approvals' | 'reports';
}

const getProjectStatusBadge = (
  status: string,
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  switch (status) {
    case 'framing':
      return {
        label: isAr ? 'دفتر الشروط' : isEn ? 'Scoping' : 'Cahier des charges',
        variant: 'neutral',
        pillClass:
          'bg-[#F3EDE7] dark:bg-neutral-800 text-black/75 dark:text-white/80 border border-[#E6DED6] dark:border-neutral-700',
      };
    case 'creative_kv':
    case 'crea_active':
      return {
        label: isAr ? 'التصميم الإبداعي' : isEn ? 'Creative KV' : 'KV Créa',
        variant: 'warning',
        pillClass:
          'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
      };
    case 'client_validated':
    case 'print_ready':
      return {
        label: isAr ? 'مُصدّق من العميل' : isEn ? 'Client Validated' : 'Validé Client',
        variant: 'info',
        pillClass:
          'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#164E63]',
      };
    case 'production':
      return {
        label: isAr ? 'قيد الإنتاج' : isEn ? 'Production' : 'En Production',
        variant: 'info',
        pillClass:
          'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#164E63]',
      };
    case 'field_execution':
    case 'field_active':
      return {
        label: isAr ? 'الميدان الحي' : isEn ? 'Live Field' : 'Terrain Live',
        variant: 'blocked',
        pillClass:
          'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
      };
    case 'completed':
    case 'closed':
      return {
        label: isAr ? 'مغلق' : isEn ? 'Completed' : 'Clôturé',
        variant: 'active',
        pillClass:
          'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
      };
    default:
      return {
        label: status,
        variant: 'neutral',
        pillClass:
          'bg-[#F3EDE7] dark:bg-neutral-800 text-black/75 dark:text-white/80 border border-[#E6DED6] dark:border-neutral-700',
      };
  }
};

export const ProjectDirectionView: React.FC<ProjectDirectionViewProps> = ({
  initialTab = 'dashboard',
}) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const { theme, isSyncing, networkMode, isSyncTimeout, lastSyncedAt, retryCloudSync } =
    useDashboardShellState();

  const {
    currentBranch,
    currentBranchId,
    branches,
    pmProjects,
    pmMilestones,
    pmMissions,
    pmTalents,
    pmPayrollBatches,
    pmExpenses,
    pmClients,
    staff,
    activePmSubScreen,
  } = useAtriumSelector(
    (s) => ({
      currentBranch: selectCurrentBranchFromState(s),
      currentBranchId: s.currentBranchId,
      branches: s.branches,
      pmProjects: selectCurrentPmProjectsFromState(s),
      pmMilestones: selectCurrentPmMilestonesFromState(s),
      pmMissions: selectCurrentPmMissionsFromState(s),
      pmTalents: selectCurrentPmTalentsFromState(s),
      pmPayrollBatches: selectCurrentPmPayrollBatchesFromState(s),
      pmExpenses: selectCurrentPmExpensesFromState(s),
      pmClients: s.pmClients || [],
      staff: selectCurrentStaffFromState(s),
      activePmSubScreen: s.activePmSubScreen || 'dashboard',
    }),
    shallowEqualObjects
  );

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: pmProjects.length > 0,
  });

  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const currentScreen =
    activePmSubScreen === 'new_project' || initialTab === 'new_project'
      ? 'new_project'
      : activePmSubScreen === 'approvals' || initialTab === 'approvals'
      ? 'approvals'
      : activePmSubScreen === 'reports' || initialTab === 'reports'
      ? 'reports'
      : activePmSubScreen === 'projects' || initialTab === 'projects'
      ? 'projects'
      : 'dashboard';

  const { filters: dashFilters, makeFilter: makeDashFilter } = useCardFilters({
    budget: '30d',
    approvals: 'all',
    waterfall: '30d',
    funnel: '30d',
    bullets: 'all',
  });

  const dashPortfolioTf = useMemo(() => getPortfolioTimeframeOptions(language), [language]);
  const dashFullTf = useMemo(() => getFullTimeframeOptions(language), [language]);
  const dashApprovalOpts = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'payroll', label: localizeText(language, 'Paies', 'Payroll', 'أجور') },
      { id: 'expenses', label: localizeText(language, 'Frais', 'Expenses', 'مصاريف') },
    ],
    [language]
  );
  const dashBulletOpts = useMemo(
    () => [
      { id: 'all', label: localizeText(language, 'Tous', 'All', 'الكل') },
      { id: 'over50', label: '>50%' },
    ],
    [language]
  );
  const dashRankCriteria = useMemo(
    () => [
      {
        id: 'margin',
        label: localizeText(language, 'Marge %', 'Margin %', 'الهامش %'),
        format: 'percent' as const,
      },
      {
        id: 'budget',
        label: localizeText(language, 'Plafond', 'Cap', 'السقف'),
        format: 'currency' as const,
        currency: 'DZD',
      },
    ],
    [language]
  );

  const projectDashData = useMemo(
    () =>
      selectProjectDashboard({
        projects: pmProjects,
        milestones: pmMilestones,
        payrollBatches: pmPayrollBatches,
        expenses: pmExpenses,
        period: '30d',
        cardFilters: dashFilters,
        language,
      }),
    [pmProjects, pmMilestones, pmPayrollBatches, pmExpenses, dashFilters, language]
  );

  // Collection state (projects tab)
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [projectClientFilter, setProjectClientFilter] = useState('All');
  const [projectMarginFilter, setProjectMarginFilter] = useState('All');
  const [projectViewMode, setProjectViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);
  const projectFilterBtnRef = useRef<HTMLButtonElement | null>(null);

  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedProjectIds, setPinnedProjectIds] = useState<Set<string>>(() => new Set<string>());
  const [projectSortBy, setProjectSortBy] = useState('project');
  const [projectSortDir, setProjectSortDir] = useState<'asc' | 'desc'>('asc');

  // Slide-over Inspector state
  const [inspectedProject, setInspectedProject] = useState<PMProject | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');
  const [projectNotesMap, setProjectNotesMap] = useState<Record<string, string>>({});

  // Approvals state
  const [approvalsTab, setApprovalsTab] = useState<'all' | 'payroll' | 'expenses'>('all');
  const [approvalSearch, setApprovalSearch] = useState('');

  // New project form state
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectClientId, setNewProjectClientId] = useState(pmClients[0]?.id || '');
  const [newProjectScope, setNewProjectScope] = useState('');
  const [newProjectBudgetCap, setNewProjectBudgetCap] = useState('3500000');
  const [newProjectMaxField, setNewProjectMaxField] = useState('650000');
  const [newProjectMargin, setNewProjectMargin] = useState('30');
  const [newProjectStartDate, setNewProjectStartDate] = useState('2026-11-01');
  const [newProjectEndDate, setNewProjectEndDate] = useState('2026-12-15');
  const [newProjectPmId, setNewProjectPmId] = useState('stf_pm_01');
  const [newProjectCreaId, setNewProjectCreaId] = useState('stf_crea_01');
  const [projectCreatedSuccess, setProjectCreatedSuccess] = useState(false);

  const activeInspectedProject = useMemo(() => {
    if (!inspectedProject) return null;
    return pmProjects.find((p) => p.id === inspectedProject.id) || null;
  }, [inspectedProject, pmProjects]);

  const totalTurnoverDzd = useMemo(
    () => pmProjects.reduce((acc, p) => acc + p.budgetCapDzd, 0),
    [pmProjects]
  );
  const avgMarginPct = useMemo(
    () =>
      pmProjects.length > 0
        ? Math.round(
            pmProjects.reduce((acc, p) => acc + p.targetGrossMarginPercent, 0) / pmProjects.length
          )
        : 0,
    [pmProjects]
  );
  const activeExecutionCount = useMemo(
    () =>
      pmProjects.filter(
        (p) =>
          p.status === 'production' ||
          p.status === 'crea_active' ||
          p.status === 'print_ready' ||
          p.status === 'field_execution' ||
          p.status === 'field_active'
      ).length,
    [pmProjects]
  );

  const pendingPayrollBatches = useMemo(() => {
    return pmPayrollBatches.filter((b) => {
      const matchesStatus = b.status === 'pending_direction_approval';
      const q = approvalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.projectTitle.toLowerCase().includes(q) ||
        b.missionCode.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [pmPayrollBatches, approvalSearch]);

  const pendingExpenses = useMemo(() => {
    return pmExpenses.filter((e) => {
      const matchesStatus = e.status === 'pending_direction_approval';
      const q = approvalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.declaredByUserName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [pmExpenses, approvalSearch]);

  const totalPendingApprovals = pendingPayrollBatches.length + pendingExpenses.length;

  const clientOptions = useMemo(() => {
    const counts = new Map<string, number>();
    pmProjects.forEach((p) => {
      counts.set(p.clientName, (counts.get(p.clientName) || 0) + 1);
    });
    return [
      {
        value: 'All',
        label: localizeText(language, 'Tous les clients', 'All clients', 'جميع العملاء'),
        count: pmProjects.length,
      },
      ...Array.from(counts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    ];
  }, [pmProjects, language]);

  const filteredProjects = useMemo(() => {
    return pmProjects.filter((p) => {
      const q = projectSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.projectManagerName.toLowerCase().includes(q) ||
        p.leadCreativeName.toLowerCase().includes(q);
      const matchStatus =
        projectStatusFilter === 'all' ||
        p.status === projectStatusFilter ||
        (projectStatusFilter === 'production' &&
          (p.status === 'production' ||
            p.status === 'crea_active' ||
            p.status === 'print_ready')) ||
        (projectStatusFilter === 'field_execution' &&
          (p.status === 'field_execution' || p.status === 'field_active')) ||
        (projectStatusFilter === 'completed' &&
          (p.status === 'completed' || p.status === 'closed'));
      const matchClient = projectClientFilter === 'All' || p.clientName === projectClientFilter;
      const matchMargin =
        projectMarginFilter === 'All' ||
        (projectMarginFilter === 'high' && p.targetGrossMarginPercent >= 30) ||
        (projectMarginFilter === 'standard' && p.targetGrossMarginPercent < 30);
      return matchSearch && matchStatus && matchClient && matchMargin;
    });
  }, [pmProjects, projectSearch, projectStatusFilter, projectClientFilter, projectMarginFilter]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      const aPinned = pinnedProjectIds.has(a.id);
      const bPinned = pinnedProjectIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (projectSortBy === 'project') {
        const cmp = a.title.localeCompare(b.title);
        return projectSortDir === 'asc' ? cmp : -cmp;
      }
      if (projectSortBy === 'budget') {
        return projectSortDir === 'asc'
          ? a.budgetCapDzd - b.budgetCapDzd
          : b.budgetCapDzd - a.budgetCapDzd;
      }
      if (projectSortBy === 'margin') {
        return projectSortDir === 'asc'
          ? a.targetGrossMarginPercent - b.targetGrossMarginPercent
          : b.targetGrossMarginPercent - a.targetGrossMarginPercent;
      }
      if (projectSortBy === 'deadline') {
        const cmp = a.endDate.localeCompare(b.endDate);
        return projectSortDir === 'asc' ? cmp : -cmp;
      }
      if (projectSortBy === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return projectSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredProjects, pinnedProjectIds, projectSortBy, projectSortDir]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (projectStatusFilter !== 'all') c += 1;
    if (projectClientFilter !== 'All') c += 1;
    if (projectMarginFilter !== 'All') c += 1;
    return c;
  }, [projectStatusFilter, projectClientFilter, projectMarginFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (projectStatusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: getProjectStatusBadge(projectStatusFilter, language).label,
        onRemove: () => setProjectStatusFilter('all'),
      });
    }
    if (projectClientFilter !== 'All') {
      chips.push({
        key: 'client',
        label: projectClientFilter,
        onRemove: () => setProjectClientFilter('All'),
      });
    }
    if (projectMarginFilter !== 'All') {
      chips.push({
        key: 'margin',
        label: projectMarginFilter === 'high' ? 'Marge ≥ 30%' : 'Marge < 30%',
        onRemove: () => setProjectMarginFilter('All'),
      });
    }
    return chips;
  }, [projectStatusFilter, projectClientFilter, projectMarginFilter, language]);

  const resetProjectFilters = useCallback(() => {
    setProjectSearch('');
    setProjectStatusFilter('all');
    setProjectClientFilter('All');
    setProjectMarginFilter('All');
  }, []);

  const projectFilterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'status',
        kind: 'segmented',
        label: localizeText(language, 'Phase Campagne', 'Campaign Phase', 'مرحلة الحملة'),
        value: projectStatusFilter,
        resetValue: 'all',
        onChange: setProjectStatusFilter,
        options: [
          { value: 'all', label: localizeText(language, 'Tous', 'All', 'الكل'), count: pmProjects.length },
          {
            value: 'framing',
            label: localizeText(language, 'Cadrage', 'Scoping', 'تأطير'),
            count: pmProjects.filter((p) => p.status === 'framing').length,
          },
          {
            value: 'production',
            label: localizeText(language, 'Production', 'Production', 'إنتاج'),
            count: pmProjects.filter(
              (p) =>
                p.status === 'production' ||
                p.status === 'crea_active' ||
                p.status === 'print_ready'
            ).length,
          },
          {
            value: 'field_execution',
            label: localizeText(language, 'Terrain', 'Field', 'الميدان'),
            count: pmProjects.filter(
              (p) => p.status === 'field_execution' || p.status === 'field_active'
            ).length,
          },
          {
            value: 'completed',
            label: localizeText(language, 'Clôturés', 'Closed', 'مغلق'),
            count: pmProjects.filter((p) => p.status === 'completed' || p.status === 'closed')
              .length,
          },
        ],
      },
      {
        id: 'margin',
        kind: 'segmented',
        label: localizeText(language, 'Seuil de Marge Brute', 'Target Margin', 'هامش الربح'),
        value: projectMarginFilter,
        resetValue: 'All',
        onChange: setProjectMarginFilter,
        options: [
          { value: 'All', label: localizeText(language, 'Toutes', 'All', 'الكل') },
          { value: 'high', label: '≥ 30%' },
          { value: 'standard', label: '< 30%' },
        ],
      },
      {
        id: 'client',
        kind: 'tiles',
        label: localizeText(language, 'Client Grand Compte', 'Key Client', 'العميل'),
        value: projectClientFilter,
        resetValue: 'All',
        onChange: setProjectClientFilter,
        options: clientOptions,
      },
    ],
    [
      language,
      projectStatusFilter,
      projectMarginFilter,
      projectClientFilter,
      pmProjects,
      clientOptions,
    ]
  );

  const handleTogglePinProject = useCallback(
    (proj: PMProject) => {
      setPinnedProjectIds((prev) => {
        const next = new Set(prev);
        const wasPinned = next.has(proj.id);
        if (wasPinned) next.delete(proj.id);
        else next.add(proj.id);
        showToast(
          wasPinned
            ? localizeText(language, 'Projet désépinglé', 'Project unpinned', 'تم إلغاء التثبيت')
            : localizeText(language, 'Projet épinglé en haut', 'Project pinned', 'تم تثبيت المشروع'),
          'info'
        );
        return next;
      });
    },
    [language]
  );

  const handleSelectProject = useCallback(
    (proj: PMProject, originEl?: HTMLElement | null) => {
      if (originEl) setDrawerOpenerEl(originEl);
      setInspectedProject(proj);
      setInspectorTab('overview');
    },
    []
  );

  const handleExportProjectsCsv = useCallback(() => {
    const headers = [
      'ID Projet',
      'Titre de la Campagne',
      'Client',
      'Plafond Budgétaire DZD',
      'Dépenses Terrain Max DZD',
      'Marge Cible %',
      'Date Début',
      'Date Fin',
      'Chef de Projet',
      'Directeur Artistique',
      'Statut',
    ];
    const rows = sortedProjects.map((p) => [
      p.id,
      p.title,
      p.clientName,
      p.budgetCapDzd,
      p.maxFieldExpensesDzd,
      p.targetGrossMarginPercent,
      p.startDate,
      p.endDate,
      p.projectManagerName,
      p.leadCreativeName,
      p.status,
    ]);
    downloadCsvSafe(
      `portefeuille_projets_nch_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(
      localizeText(
        language,
        'Export CSV du portefeuille projets généré',
        'Projects portfolio CSV exported',
        'تم تصدير ملف المشاريع CSV'
      ),
      'info'
    );
  }, [sortedProjects, language]);

  const handleExportAuditCsv = useCallback(() => {
    const headers = ['Type', 'Ref', 'Projet', 'Montant DZD', 'Statut'];
    const rows = [
      ...pendingPayrollBatches.map((b) => [
        'Paie',
        b.batchNumber,
        b.projectTitle,
        b.totalAmountDzd,
        'En attente',
      ]),
      ...pendingExpenses.map((e) => [
        'Achat',
        e.title,
        e.projectTitle,
        e.amountDzd,
        'En attente',
      ]),
    ];
    downloadCsvSafe(
      `audit_direction_nch_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(
      localizeText(
        language,
        'Export CSV audit financier généré',
        'Financial audit CSV exported',
        'تم تصدير التدقيق المالي CSV'
      ),
      'info'
    );
  }, [pendingPayrollBatches, pendingExpenses, language]);

  const projectColumns = useMemo<ColumnDefinition<PMProject>[]>(
    () => [
      {
        key: 'project',
        header: localizeText(language, 'Projet & Client', 'Project & Client', 'المشروع والعميل'),
        width: '2.5*',
        minWidth: '240px',
        sortable: true,
        renderCell: (proj) => {
          const isPinned = pinnedProjectIds.has(proj.id);
          return (
            <div className="flex items-center gap-3">
              <div data-sq="ctl" className="w-9 h-9 bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0">
                {proj.title.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-black dark:text-white text-xs truncate max-w-[200px] flex items-center gap-1">
                  {proj.title}
                  {isPinned && <Pin className="w-3 h-3 fill-[#d4522f] text-[#d4522f] shrink-0" />}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
                  {proj.clientName} · <span className="font-mono text-[10px]">{proj.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'budget',
        header: localizeText(language, 'Plafond Budgétaire', 'Budget Cap', 'السقف المالي'),
        width: '1.5*',
        minWidth: '150px',
        sortable: true,
        align: 'right',
        renderCell: (proj) => (
          <div className="font-mono text-xs font-semibold text-black dark:text-white tabular-nums">
            {formatMoney(proj.budgetCapDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'margin',
        header: localizeText(language, 'Marge Brute', 'Margin', 'الهامش'),
        width: '1*',
        minWidth: '110px',
        sortable: true,
        align: 'center',
        renderCell: (proj) => (
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-[var(--r-check,6px)]">
            {proj.targetGrossMarginPercent}%
          </span>
        ),
      },
      {
        key: 'deadline',
        header: localizeText(language, 'Période & Clôture', 'Schedule', 'الفترة'),
        width: '1.5*',
        minWidth: '160px',
        sortable: true,
        renderCell: (proj) => (
          <div className="text-xs text-black/70 dark:text-white/75 font-mono">
            {proj.startDate} <span className="text-black/45 dark:text-white/45">→</span> {proj.endDate}
          </div>
        ),
      },
      {
        key: 'leads',
        header: localizeText(language, 'Équipe Responsable', 'Leads', 'الفريق المسؤول'),
        width: '1.5*',
        minWidth: '170px',
        renderCell: (proj) => (
          <div className="text-[11px] text-black/70 dark:text-white/75 space-y-0.5">
            <div>
              <span className="text-black/55 dark:text-white/55 font-medium">CDP:</span>{' '}
              {proj.projectManagerName}
            </div>
            <div>
              <span className="text-black/55 dark:text-white/55 font-medium">Créa:</span>{' '}
              {proj.leadCreativeName}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: localizeText(language, 'Statut Campagne', 'Status', 'الحالة'),
        width: '1.2*',
        minWidth: '130px',
        sortable: true,
        align: 'center',
        renderCell: (proj) => {
          const badge = getProjectStatusBadge(proj.status, language);
          return (
            <span className={`inline-flex px-2.5 py-0.5 rounded-[var(--r-check,6px)] text-[11px] font-semibold ${badge.pillClass}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [pinnedProjectIds, language]
  );

  const getProjectRowMeta = useCallback(
    (proj: PMProject): KineticRowMeta => {
      const badge = getProjectStatusBadge(proj.status, language);
      const branchInfo = resolveRecordBranch(proj, branchesById, currentBranch, language);
      return {
        title: proj.title,
        subline: `${proj.clientName} · ${proj.startDate} → ${proj.endDate}`,
        avatarText: proj.title.slice(0, 2).toUpperCase(),
        categoryLabel: `${proj.targetGrossMarginPercent}% ${isAr ? 'هامش' : 'marge'}`,
        statusLabel: badge.label,
        statusVariant: badge.variant,
        metricPrimary: formatMoney(proj.budgetCapDzd, 'DZD'),
        metricSecondary: `Terrain max ${formatMoney(proj.maxFieldExpensesDzd, 'DZD')}`,
        branchName: branchInfo.name,
        isPinned: pinnedProjectIds.has(proj.id),
        detailCol1: {
          heading: isAr ? 'رئيس المشروع' : 'Chef de Projet',
          primaryText: proj.projectManagerName,
        },
        detailCol2: {
          heading: isAr ? 'المدير الفني' : 'Directeur Artistique',
          primaryText: proj.leadCreativeName,
        },
        detailCol3: {
          heading: isAr ? 'الجدول الزمني' : 'Échéancier',
          primaryText: `${proj.startDate} → ${proj.endDate}`,
        },
      };
    },
    [language, isAr, branchesById, currentBranch, pinnedProjectIds]
  );

  const getProjectFanActions = useCallback(
    (proj: PMProject): KineticRowFanAction<PMProject>[] => [
      {
        id: 'field',
        label: isAr ? 'ميدان' : 'Terrain',
        icon: <TrendingUp size={13} />,
        onClick: () => {
          batchUpdatePmProjectStatus([proj.id], 'field_active');
          showToast(
            localizeText(language, 'Campagne passée en exécution terrain', 'Moved to live field', 'تم التحويل إلى الميدان'),
            'success'
          );
        },
      },
      {
        id: 'close',
        label: isAr ? 'إغلاق' : 'Clôturer',
        icon: <CheckCircle size={13} />,
        onClick: () => {
          batchUpdatePmProjectStatus([proj.id], 'closed');
          showToast(
            localizeText(language, 'Projet clôturé', 'Project closed', 'تم إغلاق المشروع'),
            'success'
          );
        },
      },
      {
        id: 'pin',
        label: pinnedProjectIds.has(proj.id) ? (isAr ? 'إلغاء' : 'Détacher') : isAr ? 'تثبيت' : 'Épingler',
        icon: <Pin size={13} />,
        onClick: () => handleTogglePinProject(proj),
      },
    ],
    [isAr, language, pinnedProjectIds, handleTogglePinProject]
  );

  const getProjectDetailActions = useCallback(
    (proj: PMProject): KineticDetailAction[] => [
      {
        id: 'field',
        label: isAr ? 'تمرير للميدان' : 'Passer Terrain',
        icon: <TrendingUp size={14} />,
        onClick: () => {
          batchUpdatePmProjectStatus([proj.id], 'field_active');
          showToast(localizeText(language, 'Statut mis à jour : Terrain', 'Status updated: Field', 'تم التحديث'), 'success');
        },
      },
      {
        id: 'close',
        label: isAr ? 'إغلاق المشروع' : 'Clôturer',
        icon: <CheckCircle size={14} />,
        onClick: () => {
          batchUpdatePmProjectStatus([proj.id], 'closed');
          showToast(localizeText(language, 'Campagne clôturée', 'Campaign closed', 'تم الإغلاق'), 'success');
        },
      },
    ],
    [isAr, language]
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const client = pmClients.find((c) => c.id === newProjectClientId) || pmClients[0];
    const pmMember = staff.find((s) => s.id === newProjectPmId) || {
      fullName: 'Amine Meziane (PM)',
    };
    const creaMember = staff.find((s) => s.id === newProjectCreaId) || {
      fullName: 'Lina Hadj-Ali (Créa)',
    };
    addPmProject({
      tenantId: 'acc_01',
      facilityId: currentBranchId || 'branch_agency_main',
      clientId: client?.id || 'pm_cli_01',
      clientName: client?.name || 'Client National',
      title: newProjectTitle || 'Nouvelle Campagne Terrain',
      scopeOfWork: newProjectScope || 'Cahier des charges standard activation.',
      budgetCapDzd: Number(newProjectBudgetCap) || 2e6,
      maxFieldExpensesDzd: Number(newProjectMaxField) || 4e5,
      targetGrossMarginPercent: Number(newProjectMargin) || 28,
      startDate: newProjectStartDate,
      endDate: newProjectEndDate,
      kvDeadline: newProjectStartDate,
      printDeadline: newProjectStartDate,
      executionStartDate: newProjectStartDate,
      projectManagerId: newProjectPmId,
      projectManagerName: pmMember.fullName,
      leadCreativeId: newProjectCreaId,
      leadCreativeName: creaMember.fullName,
      status: 'framing',
    });
    setProjectCreatedSuccess(true);
    showToast(
      localizeText(language, 'Campagne créée et dispatchée', 'Project created and dispatched', 'تم إنشاء المشروع وتوزيعه'),
      'success'
    );
    setTimeout(() => {
      setProjectCreatedSuccess(false);
      setActivePmSubScreen('projects');
    }, 1500);
    setNewProjectTitle('');
    setNewProjectScope('');
  };

  const handleRejectConfirm = () => {
    if (rejectionModalId) {
      rejectPmExpense(rejectionModalId, rejectionReason || 'Non conforme au cahier des charges');
      setRejectionModalId(null);
      setRejectionReason('');
    }
  };

  if (showSkeleton && (pmProjects.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync}
        />
        <SkeletonDashboardProject />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />

      {currentScreen !== 'dashboard' && (
        <ScreenHeaderBar
          icon={
            currentScreen === 'projects' ? (
              <FolderKanban size={22} />
            ) : currentScreen === 'approvals' ? (
              <ShieldCheck size={22} />
            ) : currentScreen === 'reports' ? (
              <Layers size={22} />
            ) : (
              <Plus size={22} />
            )
          }
          title={
            currentScreen === 'projects'
              ? isAr
                ? 'المشاريع'
                : isEn
                ? 'Projects'
                : 'Projets'
              : currentScreen === 'new_project'
              ? isAr
                ? 'مشروع جديد'
                : isEn
                ? 'New Brief'
                : 'Nouveau Brief'
              : currentScreen === 'approvals'
              ? isAr
                ? 'الموافقات'
                : isEn
                ? 'Approvals'
                : 'Validations'
              : isAr
              ? 'التقارير'
              : isEn
              ? 'Reports'
              : 'Rapports'
          }
          secondaryActions={
            <AtriumButton
              variant="outline"
              size="md"
              icon={<Download size={15} />}
              onClick={currentScreen === 'projects' ? handleExportProjectsCsv : handleExportAuditCsv}
            >
              {isAr ? 'تصدير CSV' : isEn ? 'Export CSV' : 'Exporter CSV'}
            </AtriumButton>
          }
          primaryAction={
            currentScreen !== 'new_project'
              ? {
                  label: localizeText(language, 'Nouveau Projet', 'New Project', 'مشروع جديد'),
                  onClick: () => setActivePmSubScreen('new_project'),
                  dataAction: 'add-project',
                }
              : undefined
          }
        />
      )}

      <div className="flex border-b border-[#E6DED6] dark:border-neutral-800 gap-1 overflow-x-auto">
        {[
          {
            id: 'dashboard',
            label: t('nav_dashboard', language),
            icon: TrendingUp,
          },
          {
            id: 'projects',
            label: localizeText(language, 'Portefeuille Projets', 'Projects Portfolio', 'محفظة المشاريع'),
            icon: FolderKanban,
            count: pmProjects.length,
          },
          {
            id: 'approvals',
            label: localizeText(language, 'Approbations & Décaissements', 'Approvals & Payouts', 'الموافقات والصرف'),
            icon: ShieldCheck,
            count: totalPendingApprovals,
          },
          {
            id: 'reports',
            label: localizeText(language, 'Rapports & Marges', 'Reports & Margins', 'التقارير والهوامش'),
            icon: Layers,
          },
          {
            id: 'new_project',
            label: localizeText(language, '+ Nouveau Projet', '+ New Project', '+ مشروع جديد'),
            icon: Plus,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePmSubScreen(tab.id)}
              className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#d4522f] text-[#d4522f]'
                  : 'border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    tab.id === 'approvals'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      : 'bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {currentScreen === 'dashboard' && (
        <DashboardBentoFrame theme={theme} isRtl={isRtl} data-testid="project-dashboard">
          <DashboardHeader
            onExportReport={handleExportAuditCsv}
            extraActions={
              <div className="flex items-center gap-2 flex-wrap">
                {totalPendingApprovals > 0 && (
                  <AtriumButton
                    variant="outline"
                    size="md"
                    icon={<ShieldCheck size={15} />}
                    onClick={() => setActivePmSubScreen('approvals')}
                  >
                    {localizeText(
                      language,
                      `Valider (${totalPendingApprovals})`,
                      `Approvals (${totalPendingApprovals})`,
                      `موافقات (${totalPendingApprovals})`
                    )}
                  </AtriumButton>
                )}
                <AtriumButton
                  variant="primary"
                  size="md"
                  icon={<Plus size={15} />}
                  onClick={() => setActivePmSubScreen('new_project')}
                >
                  {localizeText(language, 'Nouveau Projet', 'New Project', 'مشروع جديد')}
                </AtriumButton>
              </div>
            }
          />

          <DashboardPod title={getDashboardPodTitle('project', 'kpis', language)}>
            <DashboardPodGrid layout="equal">
              <KpiSparkCard
                className={POD_SPAN.half}
                title={localizeText(language, 'Portefeuille engagé', 'Committed Portfolio', 'محفظة العقود')}
                helpText={getDashboardHelpText('project', 'budget', language)}
                subtitle={localizeText(
                  language,
                  `${pmProjects.length} campagnes · ${pmTalents.length} talents`,
                  `${pmProjects.length} active projects · ${pmTalents.length} crew`,
                  `${pmProjects.length} مشاريع · ${pmTalents.length} كوادر`
                )}
                locale={toChartLocale(language)}
                {...getSurfaceProps(theme, false)}
                state={resolveChartState(projectDashData.hasProjects)}
                value={projectDashData.totalBudget}
                deltaPercent={projectDashData.budgetDelta}
                format="currency"
                currency="DZD"
                series={projectDashData.budgetSpark}
                filter={makeDashFilter('budget', dashPortfolioTf)}
                emptyMessage={localizeText(
                  language,
                  'Aucun contrat projet engagé.',
                  'No project contracts committed.',
                  'لا توجد عقود مشاريع مسجلة.'
                )}
              />

              <KpiMetricInverseCard
                className={POD_SPAN.half}
                title={localizeText(
                  language,
                  'Approbations en attente',
                  'Pending Approvals',
                  'موافقات قيد الانتظار'
                )}
                helpText={getDashboardHelpText('project', 'approvals', language)}
                subtitle={localizeText(
                  language,
                  `${pendingPayrollBatches.length} paies · ${pendingExpenses.length} frais terrain`,
                  `${pendingPayrollBatches.length} payroll batches · ${pendingExpenses.length} expenses`,
                  `${pendingPayrollBatches.length} دفعات أجور · ${pendingExpenses.length} مصاريف`
                )}
                locale={toChartLocale(language)}
                {...getSurfaceProps(theme, false)}
                state={resolveChartState(projectDashData.hasProjects || totalPendingApprovals > 0)}
                value={projectDashData.pendingApprovals}
                format="number"
                unit={localizeText(language, 'dossiers', 'items', 'ملفات')}
                series={[]}
                filter={makeDashFilter('approvals', dashApprovalOpts)}
                emptyMessage={localizeText(
                  language,
                  'Aucun dossier à valider.',
                  'No pending approvals.',
                  'لا توجد ملفات بانتظار الموافقة.'
                )}
              />
            </DashboardPodGrid>
          </DashboardPod>

          <DashboardPod title={getDashboardPodTitle('project', 'sla', language)}>
            <DashboardPodGrid layout="split84">
              <WaterfallChart
                className={POD_SPAN.wide8}
                title={localizeText(
                  language,
                  'Pont financier portefeuille',
                  'Portfolio Margin Bridge',
                  'جسر صافي هوامش المشاريع'
                )}
                helpText={getDashboardHelpText('project', 'waterfall', language)}
                subtitle={localizeText(
                  language,
                  'Contrats engagés → Paies talents → Frais terrain → Marge nette',
                  'Contract Cap → Talent Payroll → Field Ops → Net Margin',
                  'العقود ← الأجور ← المصاريف ← الصافي'
                )}
                locale={toChartLocale(language)}
                {...getSurfaceProps(theme, false)}
                state={resolveChartState(projectDashData.waterfallSteps.length > 0)}
                steps={projectDashData.waterfallSteps}
                format="currency"
                currency="DZD"
                filter={makeDashFilter('waterfall', dashFullTf)}
                emptyMessage={localizeText(
                  language,
                  'Aucune donnée financière projet.',
                  'No project financials available.',
                  'لا توجد بيانات مالية للمشاريع.'
                )}
              />

              <RadialGauge
                className={POD_SPAN.side4}
                title={localizeText(
                  language,
                  'Santé exécution & marge',
                  'SLA & Margin Gauge',
                  'مؤشر الإنجاز والهامش'
                )}
                helpText={getDashboardHelpText('project', 'gauges', language)}
                subtitle={localizeText(
                  language,
                  'Jalons livrés et marge nette portefeuille',
                  'Milestone SLA and net portfolio margin',
                  'إنجاز المراحل وصافي الهامش'
                )}
                locale={toChartLocale(language)}
                {...getSurfaceProps(theme, true)}
                state={resolveChartState(projectDashData.hasProjects)}
                metrics={projectDashData.gauges}
                emptyMessage={localizeText(
                  language,
                  'Ajoutez des projets et jalons pour suivre la performance.',
                  'Add projects and milestones to track SLA.',
                  'أضف مشاريع ومراحل لمتابعة الأداء.'
                )}
              />
            </DashboardPodGrid>
          </DashboardPod>

          <DashboardPod title={getDashboardPodTitle('project', 'delivery', language)}>
            <DashboardPodGrid layout="equal">
              <BulletChart
                className={POD_SPAN.full}
                title={localizeText(
                  language,
                  'Consommation vs Plafond budget',
                  'Spend vs Budget Cap',
                  'الإنفاق مقابل السقف المالي'
                )}
                helpText={getDashboardHelpText('project', 'bullets', language)}
                subtitle={localizeText(
                  language,
                  'Engagements paie + terrain face au budget contrat',
                  'Payroll and field spend compared to contract caps',
                  'النفقات الفعلية مقارنة بسقف العقد'
                )}
                locale={toChartLocale(language)}
                {...getSurfaceProps(theme, false)}
                state={resolveChartState(projectDashData.bulletItems.length > 0)}
                items={projectDashData.bulletItems}
                format="currency"
                currency="DZD"
                filter={makeDashFilter('bullets', dashBulletOpts)}
                emptyMessage={localizeText(
                  language,
                  'Aucun budget projet configuré.',
                  'No project budgets configured.',
                  'لا توجد ميزانيات مشاريع مهيأة.'
                )}
              />

              <ConversionFunnel
                className={POD_SPAN.half}
                title={localizeText(
                  language,
                  'Pipeline de livraison',
                  'Delivery Pipeline',
                  'مسار تسليم المشاريع'
                )}
                helpText={getDashboardHelpText('project', 'funnel', language)}
                subtitle={localizeText(
                  language,
                  'Cadrage → Créa & BAT → Terrain → Clôture',
                  'Scoping → Creative → Field Ops → Completed',
                  'التأطير ← التصميم ← الميدان ← الإغلاق'
                )}
                locale={toChartLocale(language)}
                {...getSurfaceProps(theme, false)}
                state={resolveChartState(projectDashData.pipelineStages.length > 0)}
                stages={projectDashData.pipelineStages}
                filter={makeDashFilter('funnel', dashPortfolioTf)}
                emptyMessage={localizeText(
                  language,
                  'Aucun projet dans le pipeline.',
                  'No projects in pipeline.',
                  'لا توجد مشاريع في المسار.'
                )}
              />

              <RankedBarList
                className={POD_SPAN.half}
                title={localizeText(
                  language,
                  'Classement marges projets',
                  'Project Margin Leaderboard',
                  'ترتيب المشاريع حسب الهامش'
                )}
                helpText={getDashboardHelpText('project', 'ranked', language)}
                subtitle={localizeText(
                  language,
                  'Trié par marge cible ou plafond contrat',
                  'Ranked by target margin or contract cap',
                  'الترتيب حسب الهامش المستهدف أو الميزانية'
                )}
                locale={toChartLocale(language)}
                {...getSurfaceProps(theme, false)}
                state={resolveChartState(projectDashData.rankedProjects.length > 0)}
                criteria={dashRankCriteria}
                items={projectDashData.rankedProjects}
                emptyMessage={localizeText(
                  language,
                  'Aucun projet actif à classer.',
                  'No active projects to rank.',
                  'لا توجد مشاريع نشطة للترتيب.'
                )}
              />
            </DashboardPodGrid>
          </DashboardPod>
        </DashboardBentoFrame>
      )}

      {currentScreen === 'projects' && (
        <>
          <ScreenKpiBanner
            heading={localizeText(
              language,
              'Gouvernance du Portefeuille & Engagements Direction',
              'Portfolio Governance & Direction Commitments',
              'حوكمة محفظة المشاريع والالتزامات المالية'
            )}
            language={language}
            primaryCard={{
              label: localizeText(
                language,
                'Campagnes en Production & Terrain',
                'Active & Live Campaigns',
                'الحملات قيد الإنتاج والميدان'
              ),
              badgeText: isAr ? 'نشط' : isEn ? 'Active' : 'En cours',
              count: activeExecutionCount,
              tone: 'emerald',
              isActive: projectStatusFilter === 'production',
              onToggle: () =>
                setProjectStatusFilter((prev) => (prev === 'production' ? 'all' : 'production')),
            }}
            secondaryCard={{
              label: localizeText(
                language,
                'Dossiers en Attente d’Arbitrage DG',
                'Pending DG Approvals',
                'ملفات بانتظار موافقة الإدارة'
              ),
              badgeText: isAr ? 'ملفات معلقة' : isEn ? 'pending items' : 'dossiers DG',
              count: totalPendingApprovals,
              tone: 'terracotta',
              onToggle: () => setActivePmSubScreen('approvals'),
            }}
            darkCard={{
              label: localizeText(
                language,
                'Plafond Budgétaire Engagé',
                'Committed Portfolio Cap',
                'إجمالي السقف المالي للمشاريع'
              ),
              badgeCount: avgMarginPct,
              badgePrefix: 'Marge ',
              badgeSuffix: '%',
              valueCount: totalTurnoverDzd,
              formatValue: (v) => formatMoney(Math.round(v), 'DZD'),
              caption: localizeText(
                language,
                `${pmProjects.length} comptes · ${pmMilestones.filter((m) => m.isCompleted).length}/${pmMilestones.length} jalons livrés`,
                `${pmProjects.length} accounts · ${pmMilestones.filter((m) => m.isCompleted).length}/${pmMilestones.length} milestones`,
                `${pmProjects.length} مشاريع · ${pmMilestones.filter((m) => m.isCompleted).length}/${pmMilestones.length} مراحل منجزة`
              ),
            }}
          />

          <ScreenPod>
            <ScreenCollectionToolbar
              title={localizeText(
                language,
                'Portefeuille Projets & Gouvernance Grands Comptes',
                'Projects Portfolio & Key Account Governance',
                'سجل محفظة المشاريع والتعاقدات'
              )}
              liveRegionText={`${sortedProjects.length} ${isAr ? 'مشروع' : 'projets'}`}
              language={language}
              searchQuery={projectSearch}
              onSearchChange={setProjectSearch}
              searchPlaceholder={localizeText(
                language,
                'Rechercher campagne, client ou chef de projet...',
                'Search campaign, client or PM...',
                'بحث باسم الحملة أو العميل...'
              )}
              statusOptions={[
                { value: 'all', label: localizeText(language, 'Tous', 'All', 'الكل'), count: pmProjects.length },
                {
                  value: 'framing',
                  label: localizeText(language, 'Cadrage', 'Scoping', 'تأطير'),
                  count: pmProjects.filter((p) => p.status === 'framing').length,
                },
                {
                  value: 'production',
                  label: localizeText(language, 'Production', 'Production', 'إنتاج'),
                  count: pmProjects.filter(
                    (p) =>
                      p.status === 'production' ||
                      p.status === 'crea_active' ||
                      p.status === 'print_ready'
                  ).length,
                },
                {
                  value: 'field_execution',
                  label: localizeText(language, 'Terrain', 'Field', 'ميدان'),
                  count: pmProjects.filter(
                    (p) => p.status === 'field_execution' || p.status === 'field_active'
                  ).length,
                },
                {
                  value: 'completed',
                  label: localizeText(language, 'Clôturés', 'Closed', 'مغلق'),
                  count: pmProjects.filter((p) => p.status === 'completed' || p.status === 'closed')
                    .length,
                },
              ]}
              statusValue={projectStatusFilter}
              onStatusChange={setProjectStatusFilter}
              hasActiveAdvancedFilters={activeFiltersCount > 0}
              activeFiltersCount={activeFiltersCount}
              isFilterModalOpen={isProjectFilterOpen}
              filterButtonRef={projectFilterBtnRef}
              onToggleFilterModal={() => setIsProjectFilterOpen((prev) => !prev)}
              viewMode={projectViewMode}
              onViewModeChange={setProjectViewMode}
              showViewToggle
              onExport={handleExportProjectsCsv}
              activeChips={activeChips}
              onResetAllFilters={resetProjectFilters}
            />

            <UniversalDataCollection<PMProject>
              hideToolbar
              items={sortedProjects}
              keyExtractor={(p) => p.id}
              viewMode={projectViewMode === 'grid' ? 'grid' : 'list'}
              defaultViewMode={projectViewMode === 'grid' ? 'grid' : 'list'}
              columns={projectColumns}
              sortBy={projectSortBy}
              sortDirection={projectSortDir}
              onSortChange={(key, dir) => {
                setProjectSortBy(key);
                setProjectSortDir(dir);
              }}
              selectedIds={selectedProjectIds}
              onSelectionChange={setSelectedProjectIds}
              openItemId={activeInspectedProject?.id ?? null}
              isPinned={(p) => pinnedProjectIds.has(p.id)}
              onTogglePin={handleTogglePinProject}
              onItemClick={handleSelectProject}
              onViewDetails={handleSelectProject}
              onDelete={(p) => {
                deletePmProject(p.id);
                if (activeInspectedProject?.id === p.id) setInspectedProject(null);
                showToast(
                  localizeText(language, 'Projet supprimé', 'Project deleted', 'تم حذف المشروع'),
                  'success'
                );
              }}
              bulkSecondaryAction={{
                label: localizeText(language, 'Clôturer sélection', 'Close selected', 'إغلاق المحدد'),
                icon: <CheckCircle size={14} />,
                onClick: (ids) => {
                  batchUpdatePmProjectStatus(Array.from(ids), 'closed');
                  setSelectedProjectIds(new Set<string>());
                  showToast(
                    localizeText(language, 'Projets marqués clôturés', 'Projects closed', 'تم إغلاق المشاريع'),
                    'success'
                  );
                },
              }}
              onBulkDelete={(ids) => {
                batchDeletePmProjects(Array.from(ids));
                setSelectedProjectIds(new Set<string>());
                if (activeInspectedProject && ids.has(activeInspectedProject.id)) {
                  setInspectedProject(null);
                }
                showToast(
                  localizeText(language, 'Projets supprimés', 'Projects deleted', 'تم حذف المشاريع'),
                  'success'
                );
              }}
              getRowMeta={getProjectRowMeta}
              getFanActions={getProjectFanActions}
              getDetailActions={getProjectDetailActions}
              emptyTitle={localizeText(
                language,
                'Aucune campagne trouvée',
                'No campaigns found',
                'لا توجد مشاريع مطابقة'
              )}
              emptyDescription={localizeText(
                language,
                'Ajustez vos filtres ou lancez un nouveau brief campagne',
                'Adjust your filters or launch a new project brief',
                'عدّل معايير البحث أو أنشئ مشروعاً جديداً'
              )}
              primaryActionLabel={localizeText(language, 'Nouveau Projet', 'New Project', 'مشروع جديد')}
              onAddFirstItem={() => setActivePmSubScreen('new_project')}
              onResetFilters={resetProjectFilters}
              hasActiveFilters={projectSearch.length > 0 || activeFiltersCount > 0}
              renderCard={(proj) => (
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#d4522f] uppercase tracking-wider truncate">
                        {proj.clientName}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-[var(--r-check,6px)]">
                        {proj.targetGrossMarginPercent}%
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-black dark:text-white line-clamp-1">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-black/55 dark:text-white/55 line-clamp-2">
                      {proj.scopeOfWork}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-black/55 dark:text-white/55">Plafond Budget:</span>
                      <span className="font-mono font-bold text-black dark:text-white tabular-nums">
                        {formatMoney(proj.budgetCapDzd, 'DZD')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black/55 dark:text-white/55">Plafond Terrain:</span>
                      <span className="font-mono text-black/70 dark:text-white/75 tabular-nums">
                        {formatMoney(proj.maxFieldExpensesDzd, 'DZD')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-black/55 dark:text-white/55">
                      <span>CDP: {proj.projectManagerName.split(' ')[0]}</span>
                      <span>Créa: {proj.leadCreativeName.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              )}
            />
          </ScreenPod>

          <KineticFilterModal
            isOpen={isProjectFilterOpen}
            onClose={() => setIsProjectFilterOpen(false)}
            triggerRef={projectFilterBtnRef}
            language={language}
            displayCount={sortedProjects.length}
            entityPluralLabel={isAr ? 'مشاريع' : isEn ? 'projects' : 'projets'}
            hasActiveFilters={activeFiltersCount > 0}
            onResetFilters={resetProjectFilters}
            sections={projectFilterSections}
          />

          <KineticSlideOverInspector<PMProject>
            isOpen={Boolean(activeInspectedProject)}
            item={activeInspectedProject}
            allItems={sortedProjects}
            keyExtractor={(p) => p.id}
            openerElement={drawerOpenerEl}
            language={language}
            title={activeInspectedProject?.title || ''}
            subtitle={activeInspectedProject ? `${activeInspectedProject.clientName} · ${activeInspectedProject.startDate} → ${activeInspectedProject.endDate}` : ''}
            avatarText={activeInspectedProject?.title.slice(0, 2).toUpperCase() || 'PM'}
            categoryLabel={`${activeInspectedProject?.targetGrossMarginPercent || 0}% marge`}
            branchName={
              activeInspectedProject
                ? resolveRecordBranch(activeInspectedProject, branchesById, currentBranch, language).name
                : undefined
            }
            statusLabel={
              activeInspectedProject
                ? getProjectStatusBadge(activeInspectedProject.status, language).label
                : undefined
            }
            statusClassName={
              activeInspectedProject
                ? getProjectStatusBadge(activeInspectedProject.status, language).pillClass
                : undefined
            }
            tabs={[
              { id: 'overview', label: isAr ? 'التفاصيل' : isEn ? 'Overview' : 'Gouvernance' },
              { id: 'milestones', label: isAr ? 'المراحل' : isEn ? 'Milestones' : 'Jalons' },
              { id: 'financials', label: isAr ? 'الميزانية' : isEn ? 'Budget Burn' : 'Budget & Frais' },
            ]}
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            onSelectItem={(p) => handleSelectProject(p)}
            onClose={() => setInspectedProject(null)}
            onDelete={(p) => {
              deletePmProject(p.id);
              setInspectedProject(null);
              showToast(localizeText(language, 'Projet supprimé', 'Project deleted', 'تم حذف المشروع'), 'success');
            }}
            holdToDelete
            renderBody={(proj, tab) => {
              const projMilestones = pmMilestones.filter((m) => m.projectId === proj.id);
              const completedMs = projMilestones.filter((m) => m.isCompleted).length;
              const msPct =
                projMilestones.length > 0 ? Math.round((completedMs / projMilestones.length) * 100) : 0;

              const projExpenses = pmExpenses.filter((e) => e.projectId === proj.id);
              const spentField = projExpenses.reduce((acc, e) => acc + e.amountDzd, 0);
              const projPayrolls = pmPayrollBatches.filter((b) => b.projectId === proj.id);
              const spentPayroll = projPayrolls.reduce((acc, b) => acc + b.totalAmountDzd, 0);
              const totalBurnPct =
                proj.budgetCapDzd > 0
                  ? Math.min(100, Math.round(((spentField + spentPayroll) / proj.budgetCapDzd) * 100))
                  : 0;

              if (tab === 'milestones') {
                return (
                  <InspectorSection
                    index={0}
                    title={localizeText(
                      language,
                      `Jalons Opérationnels (${completedMs}/${projMilestones.length})`,
                      `Milestones (${completedMs}/${projMilestones.length})`,
                      `المراحل (${completedMs}/${projMilestones.length})`
                    )}
                  >
                    <InspectorCard className="mb-3">
                      <InspectorKeyValue label="Progression" value={`${msPct}%`} tone="ok" isLast />
                      <InspectorProgressBar percent={msPct} tone="ok" animateKey={proj.id} />
                    </InspectorCard>
                    {projMilestones.length === 0 ? (
                      <KineticEmptyStateMotion motionKey={`pm-ms-${proj.id}`}>
                        <EmptyState
                          variant="compact"
                          icon={<Calendar />}
                          title="Aucun jalon configuré"
                        />
                      </KineticEmptyStateMotion>
                    ) : (
                      <InspectorCard>
                        {projMilestones.map((m, idx) => (
                          <InspectorListItem
                            key={m.id}
                            title={m.title}
                            subtitle={`${m.assignedRole} · ${m.targetDate}`}
                            badge={
                              m.isCompleted
                                ? { label: 'Livré', tone: 'ok' }
                                : { label: 'En attente', tone: 'warn' }
                            }
                            isLast={idx === projMilestones.length - 1}
                          />
                        ))}
                      </InspectorCard>
                    )}
                  </InspectorSection>
                );
              }

              if (tab === 'financials') {
                return (
                  <>
                    <InspectorSection index={0}>
                      <InspectorBigStat
                        value={formatMoney(spentField + spentPayroll, 'DZD')}
                        tone={totalBurnPct > 85 ? 'danger' : 'accent'}
                        caption={`Consommation globale vs Plafond ${formatMoney(proj.budgetCapDzd, 'DZD')} (${totalBurnPct}%)`}
                      />
                    </InspectorSection>
                    <InspectorSection index={1} title="Ventilation Engagements">
                      <InspectorCard>
                        <InspectorKeyValue label="Plafond Contrat" value={formatMoney(proj.budgetCapDzd, 'DZD')} />
                        <InspectorKeyValue label="Paies Terrain" value={formatMoney(spentPayroll, 'DZD')} />
                        <InspectorKeyValue
                          label="Frais Terrain"
                          value={`${formatMoney(spentField, 'DZD')} / ${formatMoney(proj.maxFieldExpensesDzd, 'DZD')}`}
                          tone={spentField > proj.maxFieldExpensesDzd ? 'danger' : 'ok'}
                          isLast
                        />
                        <InspectorProgressBar
                          percent={totalBurnPct}
                          tone={totalBurnPct > 85 ? 'danger' : 'accent'}
                          animateKey={`${proj.id}-fin`}
                        />
                      </InspectorCard>
                    </InspectorSection>
                    <InspectorSection index={2} title={`Notes de Frais (${projExpenses.length})`}>
                      {projExpenses.length === 0 ? (
                        <KineticEmptyStateMotion motionKey={`pm-exp-${proj.id}`}>
                          <EmptyState
                            variant="compact"
                            tone="positive"
                            icon={<EMPTY_STATE_ICONS.Receipt />}
                            title="Aucune dépense déclarée"
                          />
                        </KineticEmptyStateMotion>
                      ) : (
                        <InspectorCard>
                          {projExpenses.map((e, idx) => (
                            <InspectorListItem
                              key={e.id}
                              title={e.title}
                              subtitle={`${e.declaredByUserName} · ${e.category}`}
                              metaRight={formatMoney(e.amountDzd, 'DZD')}
                              badge={{
                                label:
                                  e.status === 'approved_by_direction'
                                    ? 'Validé'
                                    : e.status === 'rejected'
                                    ? 'Refusé'
                                    : 'Attente',
                                tone:
                                  e.status === 'approved_by_direction'
                                    ? 'ok'
                                    : e.status === 'rejected'
                                    ? 'danger'
                                    : 'warn',
                              }}
                              isLast={idx === projExpenses.length - 1}
                            />
                          ))}
                        </InspectorCard>
                      )}
                    </InspectorSection>
                  </>
                );
              }

              return (
                <>
                  <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions Direction'}>
                    <InspectorQuickActions
                      actions={[
                        {
                          id: 'prod',
                          label: 'Production',
                          icon: <Layers className="w-[18px] h-[18px]" />,
                          onClick: () => {
                            batchUpdatePmProjectStatus([proj.id], 'production');
                            showToast('Phase mise à jour : Production', 'success');
                          },
                        },
                        {
                          id: 'field',
                          label: 'Terrain Live',
                          icon: <TrendingUp className="w-[18px] h-[18px]" />,
                          primary: true,
                          onClick: () => {
                            batchUpdatePmProjectStatus([proj.id], 'field_active');
                            showToast('Phase mise à jour : Terrain Live', 'success');
                          },
                        },
                        {
                          id: 'close',
                          label: 'Clôturer',
                          icon: <CheckCircle className="w-[18px] h-[18px]" />,
                          onClick: () => {
                            batchUpdatePmProjectStatus([proj.id], 'closed');
                            showToast('Campagne clôturée', 'success');
                          },
                        },
                        {
                          id: 'pin',
                          label: pinnedProjectIds.has(proj.id) ? 'Détacher' : 'Épingler',
                          icon: <Pin className="w-[18px] h-[18px]" />,
                          onClick: () => handleTogglePinProject(proj),
                        },
                      ]}
                    />
                  </InspectorSection>

                  <InspectorSection index={1}>
                    <InspectorBigStat
                      value={formatMoney(proj.budgetCapDzd, 'DZD')}
                      tone="accent"
                      caption={`Marge cible ${proj.targetGrossMarginPercent}% · Plafond terrain ${formatMoney(proj.maxFieldExpensesDzd, 'DZD')}`}
                    />
                  </InspectorSection>

                  <InspectorSection index={2} title={isAr ? 'بطاقة المشروع' : 'Fiche Gouvernance'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Client" value={proj.clientName} icon={<Briefcase size={14} />} mono={false} />
                      <InspectorKeyValue label="Chef de Projet" value={proj.projectManagerName} icon={<UserCheck size={14} />} mono={false} />
                      <InspectorKeyValue label="Directeur Artistique" value={proj.leadCreativeName} icon={<Palette size={14} />} mono={false} />
                      <InspectorKeyValue label="Période" value={`${proj.startDate} → ${proj.endDate}`} icon={<Calendar size={14} />} isLast />
                    </InspectorCard>
                  </InspectorSection>

                  <InspectorSection index={3} title="Cahier des charges & Directives">
                    <InspectorCard className="mb-3">
                      <p className="text-xs text-black/75 dark:text-white/80 py-2 leading-relaxed">
                        {proj.scopeOfWork}
                      </p>
                    </InspectorCard>
                    <InspectorNotesField
                      value={projectNotesMap[proj.id] || ''}
                      onSave={(next) => {
                        setProjectNotesMap((prev) => ({ ...prev, [proj.id]: next }));
                        showToast('Note direction enregistrée', 'success');
                      }}
                      placeholder="Ajouter une directive exécutive..."
                    />
                  </InspectorSection>
                </>
              );
            }}
          />
        </>
      )}

      {currentScreen === 'new_project' && (
        <ScreenPod>
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-6 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] max-w-4xl mx-auto space-y-6"
          >
            <div>
              <span className="text-xs font-semibold text-[#d4522f] uppercase tracking-wide">
                {t('pm_dir_screen_new_badge')}
              </span>
              <h2 className="text-xl font-bold text-black dark:text-white mt-1">
                {t('pm_dir_screen_new_title')}
              </h2>
            </div>
            {projectCreatedSuccess && (
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="p-4 bg-emerald-50 dark:bg-emerald-950/40 [--sq-stroke:#a7f3d0] dark:[--sq-stroke:#065f46] text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold animate-in fade-in"
              >
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                {t('pm_dir_screen_new_success')}
              </div>
            )}
            <form onSubmit={handleCreateProject} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <LabelInput
                    field="Title"
                    label={t('pm_dir_field_title')}
                    required
                    placeholder={t('pm_dir_field_title_ph')}
                    value={newProjectTitle}
                    onChange={setNewProjectTitle}
                    width="100%"
                    height={48}
                    corner={14}
                  />
                </div>
                <LabelSelect
                  field="Client"
                  label={t('pm_dir_field_client')}
                  value={newProjectClientId}
                  onChange={(val) =>
                    setNewProjectClientId(typeof val === 'string' ? val : val.target?.value || val)
                  }
                  options={pmClients.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.wilaya})`,
                  }))}
                  height={48}
                  corner={14}
                />
                <LabelInput
                  field="BudgetCap"
                  label={t('pm_dir_field_budget_cap')}
                  type="number"
                  value={newProjectBudgetCap}
                  onChange={setNewProjectBudgetCap}
                  width="100%"
                  height={48}
                  corner={14}
                />
                <LabelInput
                  field="MaxField"
                  label={t('pm_dir_field_max_field')}
                  type="number"
                  value={newProjectMaxField}
                  onChange={setNewProjectMaxField}
                  width="100%"
                  height={48}
                  corner={14}
                />
                <LabelInput
                  field="Margin"
                  label={t('pm_dir_field_margin')}
                  type="number"
                  value={newProjectMargin}
                  onChange={setNewProjectMargin}
                  width="100%"
                  height={48}
                  corner={14}
                />
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-black/70 dark:text-white/75 block mb-1">
                    {t('pm_dir_field_scope')}
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={t('pm_dir_field_scope_ph')}
                    value={newProjectScope}
                    onChange={(e) => setNewProjectScope(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-[var(--r-ctl,12px)] border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
                  />
                </div>
                <LabelInput
                  field="StartDate"
                  label={t('pm_dir_field_start_date')}
                  type="date"
                  value={newProjectStartDate}
                  onChange={setNewProjectStartDate}
                  width="100%"
                  height={48}
                  corner={14}
                />
                <LabelInput
                  field="EndDate"
                  label={t('pm_dir_field_end_date')}
                  type="date"
                  value={newProjectEndDate}
                  onChange={setNewProjectEndDate}
                  width="100%"
                  height={48}
                  corner={14}
                />
                <LabelSelect
                  field="LeadPM"
                  label={t('pm_dir_field_pm')}
                  value={newProjectPmId}
                  onChange={(val) =>
                    setNewProjectPmId(typeof val === 'string' ? val : val.target?.value || val)
                  }
                  options={[
                    { value: 'stf_pm_01', label: 'Amine Meziane (Senior PM)' },
                    { value: 'stf_pm_02', label: 'Samy Cherif (Event Lead)' },
                  ]}
                  height={48}
                  corner={14}
                />
                <LabelSelect
                  field="LeadCrea"
                  label={t('pm_dir_field_crea')}
                  value={newProjectCreaId}
                  onChange={(val) =>
                    setNewProjectCreaId(typeof val === 'string' ? val : val.target?.value || val)
                  }
                  options={[
                    { value: 'stf_crea_01', label: 'Lina Hadj-Ali (Directrice Artistique)' },
                    { value: 'stf_crea_02', label: 'Rachid Benali (Infographiste Print)' },
                  ]}
                  height={48}
                  corner={14}
                />
              </div>
              <div className="pt-4 border-t border-[#E6DED6] dark:border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewProjectTitle('');
                    setNewProjectScope('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 hover:text-black cursor-pointer"
                >
                  Réinitialiser
                </button>
                <AtriumButton type="submit" variant="primary" size="md" icon={<Sparkles className="w-4 h-4" />}>
                  Lancer le Projet & Dispatcher →
                </AtriumButton>
              </div>
            </form>
          </div>
        </ScreenPod>
      )}

      {currentScreen === 'approvals' && (
        <ScreenPod>
          <div
            data-sq="card"
            data-sq-border="solid"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626]"
          >
            <div>
              <span className="text-xs font-semibold text-[#d4522f] uppercase tracking-wide">
                {t('pm_dir_approvals_badge')}
              </span>
              <h2 className="text-xl font-bold text-black dark:text-white mt-0.5">
                {t('pm_dir_approvals_title')}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Seek
                value={approvalSearch}
                onChange={setApprovalSearch}
                placeholder={t('common_search')}
                openWidth={260}
                shutSize={38}
              />
              <div data-sq="ctl" className="flex items-center gap-1.5 p-1 bg-[#F3EDE7] dark:bg-neutral-800 text-xs">
                {(
                  [
                    { id: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
                    { id: 'payroll', label: isAr ? 'الرواتب' : isEn ? 'Payroll' : 'Paie' },
                    { id: 'expenses', label: isAr ? 'المصاريف' : isEn ? 'Expenses' : 'Frais' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setApprovalsTab(item.id)}
                    data-sq="ctl-sm"
                    className={`px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                      approvalsTab === item.id
                        ? 'bg-white dark:bg-neutral-700 text-black dark:text-white'
                        : 'text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(approvalsTab === 'all' || approvalsTab === 'payroll') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-black/70 dark:text-white/75 px-1">
                <span>Lots de Paie Terrain en Attente de Déblocage</span>
                {pendingPayrollBatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      batchApprovePmPayrollBatches(pendingPayrollBatches.map((b) => b.id))
                    }
                    className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                  >
                    Valider tous les lots de paie ({pendingPayrollBatches.length})
                  </button>
                )}
              </div>
              {pendingPayrollBatches.length === 0 ? (
                <KineticEmptyStateMotion motionKey="pm-dir-pay-empty">
                  <EmptyState
                    variant="compact"
                    tone="positive"
                    icon={<CheckCircle />}
                    title="Aucun lot de paie en attente d'approbation"
                  />
                </KineticEmptyStateMotion>
              ) : (
                pendingPayrollBatches.map((batch) => (
                  <div
                    key={batch.id}
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-5 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-white dark:bg-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-[var(--r-check,6px)] text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          Lot de Paie
                        </span>
                        <span className="font-mono text-xs font-semibold text-black dark:text-white">
                          {batch.batchNumber}
                        </span>
                        <span className="text-black/55 dark:text-white/55">·</span>
                        <span className="text-xs text-black/70 dark:text-white/75 font-medium">
                          {batch.projectTitle}
                        </span>
                      </div>
                      <p className="text-xs text-black/55 dark:text-white/55">
                        Mission <span className="font-mono font-semibold">{batch.missionCode}</span> ·{' '}
                        {batch.totalBeneficiaries} animateurs pointés et vérifiés par le Superviseur.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
                          {t('common_amount')}
                        </span>
                        <span className="font-bold text-lg text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                          {formatMoney(batch.totalAmountDzd, 'DZD')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => approvePmPayrollBatch(batch.id)}
                        data-sq="ctl"
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('pm_dir_btn_validate_ccp')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {(approvalsTab === 'all' || approvalsTab === 'expenses') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-black/70 dark:text-white/75 px-1">
                <span>Achats & Notes de Frais Terrain Déclarés</span>
                {pendingExpenses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => batchApprovePmExpenses(pendingExpenses.map((e) => e.id))}
                    className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                  >
                    Valider toutes les notes de frais ({pendingExpenses.length})
                  </button>
                )}
              </div>
              {pendingExpenses.length === 0 ? (
                <KineticEmptyStateMotion motionKey="pm-dir-exp-empty">
                  <EmptyState
                    variant="compact"
                    tone="positive"
                    icon={<CheckCircle />}
                    title="Aucun frais d'activation en attente d'arbitrage"
                  />
                </KineticEmptyStateMotion>
              ) : (
                pendingExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-5 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-white dark:bg-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-[var(--r-check,6px)] text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          {expense.category}
                        </span>
                        <span className="text-xs font-semibold text-black dark:text-white">
                          {expense.title}
                        </span>
                        {expense.hasFiscalInvoice && (
                          <span className="px-1.5 py-0.5 rounded-[var(--r-check,6px)] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Facture Fiscale
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-black/55 dark:text-white/55">
                        Déclaré par {expense.declaredByUserName} ({expense.declaredByRole}) ·{' '}
                        {expense.projectTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {expense.receiptPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptUrl(expense.receiptPhotoUrl || null)}
                          data-sq="ctl"
                          data-sq-border="solid"
                          className="px-3 py-1.5 text-xs text-black/70 dark:text-white/75 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040] hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Justificatif
                        </button>
                      )}
                      <div className="text-right">
                        <span className="text-[10px] text-black/55 dark:text-white/55 block uppercase font-medium">
                          {t('common_amount')}
                        </span>
                        <span className="font-bold text-base text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                          {formatMoney(expense.amountDzd, 'DZD')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => approvePmExpense(expense.id)}
                        data-sq="ctl"
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectionModalId(expense.id)}
                        data-sq="ctl"
                        data-sq-border="solid"
                        className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 [--sq-stroke:#fecaca] dark:[--sq-stroke:#991b1b] transition-colors cursor-pointer"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </ScreenPod>
      )}

      {currentScreen === 'reports' && (
        <ScreenPod>
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-6 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">
                  Rapports d'Activité & Marges
                </span>
                <h2 className="text-xl font-bold text-black dark:text-white">
                  Audit Financier Consolidé — Année 2026
                </h2>
              </div>
              <AtriumButton
                variant="primary"
                size="md"
                icon={<Download size={15} />}
                onClick={handleExportAuditCsv}
              >
                {isAr
                  ? 'تحميل التدقيق المالي'
                  : isEn
                  ? 'Download Audit (CSV)'
                  : 'Télécharger Audit (CSV)'}
              </AtriumButton>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="p-4 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-[#FBF8F5]/80 dark:bg-neutral-800/40"
              >
                <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">
                  {t('pm_dir_kpi_cumul_ca')}
                </span>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  58,4 M DA
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {t('pm_dir_vs_2025')}
                </span>
              </div>
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="p-4 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-[#FBF8F5]/80 dark:bg-neutral-800/40"
              >
                <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">
                  {t('pm_dir_kpi_avg_margin')}
                </span>
                <div className="text-2xl font-bold text-emerald-600 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  31,4 %
                </div>
                <span className="text-[11px] text-black/55 dark:text-white/55">
                  {t('pm_dir_target_objective')}
                </span>
              </div>
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="p-4 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-[#FBF8F5]/80 dark:bg-neutral-800/40"
              >
                <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">
                  {t('pm_dir_kpi_closed_missions')}
                </span>
                <div className="text-2xl font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  48
                </div>
                <span className="text-[11px] text-black/55 dark:text-white/55">
                  {t('pm_dir_coverage_wilayas')}
                </span>
              </div>
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="p-4 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-[#FBF8F5]/80 dark:bg-neutral-800/40"
              >
                <span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block mb-1">
                  {t('pm_dir_kpi_attendance_rate')}
                </span>
                <div className="text-2xl font-bold text-blue-600 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                  98,2 %
                </div>
                <span className="text-[11px] text-black/55 dark:text-white/55">
                  {t('pm_dir_rating_avg')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-6 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] space-y-4"
            >
              <h3 className="text-sm font-semibold text-black dark:text-white flex items-center justify-between">
                <span>{t('pm_dir_client_profitability')}</span>
                <span className="text-xs text-black/55 dark:text-white/55 font-normal">
                  {t('pm_dir_turnover_share')}
                </span>
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Ooredoo Algérie', ca: '24,5 M DA', pct: 42, margin: '32%', color: 'bg-red-500' },
                  { name: t('pm_dir_client_danone'), ca: '16,3 M DA', pct: 28, margin: '30%', color: 'bg-blue-500' },
                  { name: t('pm_dir_client_cevital'), ca: '10,5 M DA', pct: 18, margin: '34%', color: 'bg-emerald-500' },
                  { name: t('pm_dir_client_others'), ca: '7,1 M DA', pct: 12, margin: '28%', color: 'bg-amber-500' },
                ].map((cli) => (
                  <div key={cli.name} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-black dark:text-white">{cli.name}</span>
                      <span className="font-mono text-black/55 dark:text-white/55">
                        {cli.ca} · Marge {cli.margin}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 overflow-hidden">
                      <div className={`h-full ${cli.color}`} style={{ width: `${cli.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-6 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] space-y-4"
            >
              <h3 className="text-sm font-semibold text-black dark:text-white flex items-center justify-between">
                <span>Ventilation des Dépenses par Poste</span>
                <span className="text-xs text-black/55 dark:text-white/55 font-normal">
                  Terrain & Logistique
                </span>
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Indemnités & Paies Animateurs (CCP)', amount: '34,2 M DA', pct: 58, color: 'bg-[#DC2626]' },
                  { label: 'Production POSM & Impression Imprimeur', amount: '14,8 M DA', pct: 25, color: 'bg-purple-500' },
                  { label: 'Transport, Carburant & Hébergement', amount: '6,5 M DA', pct: 11, color: 'bg-amber-500' },
                  { label: 'Frais de Régie & Autorisations APC', amount: '2,9 M DA', pct: 6, color: 'bg-blue-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-black dark:text-white">{item.label}</span>
                      <span className="font-mono text-black/55 dark:text-white/55">{item.amount}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScreenPod>
      )}

      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="sq-elev-pop max-w-lg w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#d4522f]" />
                  Justificatif Fiscal de Paiement
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptUrl(null)}
                  data-sq="ctl-sm"
                  className="p-1 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 text-black/55 dark:text-white/55 hover:text-black/80 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div
                data-sq="ctl"
                data-sq-border="solid"
                className="w-full h-72 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-neutral-100 dark:bg-neutral-800"
              >
                <img
                  src={selectedReceiptUrl}
                  alt="Scan Justificatif"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReceiptUrl(null)}
                  data-sq="ctl"
                  className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 bg-[#F3EDE7] dark:bg-neutral-800 hover:bg-[#EAE1D8] cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectionModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="sq-elev-pop max-w-md w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  Motif du Rejet de la Dépense
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectionModalId(null)}
                  data-sq="ctl-sm"
                  className="p-1 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 text-black/55 dark:text-white/55 hover:text-black/80 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-black/55 dark:text-white/55">
                Veuillez préciser la raison du refus (ex: justificatif illisible, montant hors barème APC, achat non approuvé).
              </p>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Facture proforma non conforme ou facture fiscale manquante..."
                className="w-full px-3 py-2 text-xs rounded-[var(--r-ctl,12px)] border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalId(null)}
                  className="px-4 py-2 text-xs font-semibold text-black/70 dark:text-white/75 hover:text-black cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  data-sq="ctl"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer"
                >
                  Confirmer le Rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
