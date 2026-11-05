import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMProject, PMPayrollBatch, PMExpense } from '../../../types/index';
import {
  TrendingUp,
  Radio,
  Users,
  AlertCircle,
  CheckCircle,
  Plus,
  ShieldCheck,
  Eye,
  X,
  FileText,
  Clock,
  Sparkles,
  DollarSign,
  ChevronRight,
  Filter,
  Download,
  Check,
  Ban,
  Calendar,
  Layers,
  ArrowUpRight,
  Building2,
  ChevronDown,
  Pin,
  Trash2,
  FolderKanban,
  Edit2,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiquidExportButton } from '../../ui/liquid/LiquidExportButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { SkeletonDashboardProject } from '../../ui/skeleton/StructuralSkeletons';
import {
  DashboardPod,
  DashboardMetricCard,
  DarkEspressoCard,
  HourlyCurveChart,
  PillBarHistogram,
  MonthlyAreaChart,
  DonutChart,
  GuardianCard,
} from '../../common/dashboard';

interface ProjectDirectionViewProps {
  initialTab?: 'dashboard' | 'projects' | 'new_project' | 'approvals' | 'reports';
}

export const ProjectDirectionView: React.FC<ProjectDirectionViewProps> = ({ initialTab = 'dashboard' }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    pmProjects,
    pmMissions,
    pmTalents,
    pmPayrollBatches,
    pmExpenses,
    pmClients,
    staff,
    addPmProject,
    deletePmProject,
    batchDeletePmProjects,
    batchUpdatePmProjectStatus,
    approvePmExpense,
    rejectPmExpense,
    batchApprovePmExpenses,
    batchRejectPmExpenses,
    batchDeletePmExpenses,
    approvePmPayrollBatch,
    batchApprovePmPayrollBatches,
    resetPmMockData,
    activePmSubScreen,
    setActivePmSubScreen,
    showToast,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: pmProjects.length > 0,
  });
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Top screen selection: dashboard, projects, new_project, approvals, reports
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

  // Dashboard Analytical Period
  const [directionPeriod, setDirectionPeriod] = useState<string>('today');

  // Projects Collection State
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [pinnedProjectIds, setPinnedProjectIds] = useState<Set<string>>(new Set());
  const [projectSortBy, setProjectSortBy] = useState<string>('project');
  const [projectSortDir, setProjectSortDir] = useState<'asc' | 'desc'>('asc');

  // Approvals State
  const [approvalsTab, setApprovalsTab] = useState<'all' | 'payroll' | 'expenses'>('all');
  const [approvalSearch, setApprovalSearch] = useState('');
  const [selectedApprovalBatchIds, setSelectedApprovalBatchIds] = useState<Set<string>>(new Set());
  const [selectedApprovalExpenseIds, setSelectedApprovalExpenseIds] = useState<Set<string>>(new Set());
  const [validatedPaieIds, setValidatedPaieIds] = useState<string[]>([]);
  const [quickBriefTitle, setQuickBriefTitle] = useState('Roadshow 5G Ouest — Rollup, A5, Kakemonos & Stands');
  const [quickBriefSuccess, setQuickBriefSuccess] = useState(false);

  // Form State for New Project
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

  // Metrics
  const totalTurnoverDzd = pmProjects.reduce((acc, p) => acc + p.budgetCapDzd, 0);
  const activeMissionsToday = pmMissions.filter((m) => m.status === 'live_today').length;
  const availableTalentsCount = pmTalents.filter((t) => t.status === 'active').length;

  const pendingPayrollBatches = useMemo(() => {
    return pmPayrollBatches.filter((b) => {
      const matchesStatus = b.status === 'pending_direction_approval';
      const matchesSearch =
        !approvalSearch.trim() ||
        b.batchNumber.toLowerCase().includes(approvalSearch.toLowerCase()) ||
        b.projectTitle.toLowerCase().includes(approvalSearch.toLowerCase()) ||
        b.missionCode.toLowerCase().includes(approvalSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [pmPayrollBatches, approvalSearch]);

  const pendingExpenses = useMemo(() => {
    return pmExpenses.filter((e) => {
      const matchesStatus = e.status === 'pending_direction_approval';
      const matchesSearch =
        !approvalSearch.trim() ||
        e.title.toLowerCase().includes(approvalSearch.toLowerCase()) ||
        e.category.toLowerCase().includes(approvalSearch.toLowerCase()) ||
        e.declaredByUserName.toLowerCase().includes(approvalSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [pmExpenses, approvalSearch]);

  const totalPendingApprovals = pendingPayrollBatches.length + pendingExpenses.length;

  // Filtered & Sorted Projects
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
        (projectStatusFilter === 'production' && (p.status === 'production' || p.status === 'crea_active' || p.status === 'print_ready')) ||
        (projectStatusFilter === 'field_execution' && (p.status === 'field_execution' || p.status === 'field_active')) ||
        (projectStatusFilter === 'completed' && (p.status === 'completed' || p.status === 'closed'));
      return matchSearch && matchStatus;
    });
  }, [pmProjects, projectSearch, projectStatusFilter]);

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
        return projectSortDir === 'asc'
          ? a.endDate.localeCompare(b.endDate)
          : b.endDate.localeCompare(a.endDate);
      }
      if (projectSortBy === 'status') {
        return projectSortDir === 'asc'
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      return 0;
    });
  }, [filteredProjects, pinnedProjectIds, projectSortBy, projectSortDir]);

  // Project Column Definitions
  const projectColumns: ColumnDefinition<PMProject>[] = useMemo(
    () => [
      {
        key: 'project',
        header: 'Projet & Client',
        width: '2.5*',
        minWidth: '240px',
        sortable: true,
        renderCell: (proj) => {
          const isPinned = pinnedProjectIds.has(proj.id);
          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedProjectIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(proj.id)) next.delete(proj.id);
                    else next.add(proj.id);
                    return next;
                  });
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPinned
                    ? 'text-[#d4522f] bg-[#d4522f]/10'
                    : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title={isPinned ? 'Détacher le projet' : 'Épingler en haut'}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-[#d4522f]/10 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0">
                {proj.title.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate max-w-[200px]">
                  {proj.title}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {proj.clientName} · <span className="font-mono text-[10px]">{proj.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'budget',
        header: 'Plafond Budgétaire',
        width: '1.5*',
        minWidth: '150px',
        sortable: true,
        align: 'right',
        renderCell: (proj) => (
          <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(proj.budgetCapDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'margin',
        header: 'Marge Brute',
        width: '1*',
        minWidth: '110px',
        sortable: true,
        align: 'center',
        renderCell: (proj) => (
          <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
            {proj.targetGrossMarginPercent}%
          </span>
        ),
      },
      {
        key: 'timeline',
        header: 'Période & Clôture',
        width: '1.5*',
        minWidth: '160px',
        sortable: true,
        renderCell: (proj) => (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            {proj.startDate} <span className="text-zinc-400">➔</span> {proj.endDate}
          </div>
        ),
      },
      {
        key: 'leads',
        header: 'Équipe Responsable',
        width: '1.5*',
        minWidth: '170px',
        renderCell: (proj) => (
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
            <div><span className="text-zinc-400 font-medium">CDP:</span> {proj.projectManagerName}</div>
            <div><span className="text-zinc-400 font-medium">Créa:</span> {proj.leadCreativeName}</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Statut Campagne',
        width: '1.2*',
        minWidth: '130px',
        sortable: true,
        align: 'center',
        renderCell: (proj) => {
          const statusMap: Record<string, { label: string; bg: string; text: string }> = {
            framing: { label: 'Cahier des charges', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300' },
            creative_kv: { label: 'KV Créa', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
            client_validated: { label: 'Validé Client', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
            production: { label: 'En Production', bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
            field_execution: { label: 'Terrain Live', bg: 'bg-red-100 dark:bg-red-950/60', text: 'text-red-700 dark:text-red-300' },
            completed: { label: 'Clôturé', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
            archived: { label: 'Archivé', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500' },
          };
          const badge = statusMap[proj.status] || { label: proj.status, bg: 'bg-zinc-100', text: 'text-zinc-700' };
          return (
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [pinnedProjectIds]
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const client = pmClients.find((c) => c.id === newProjectClientId) || pmClients[0];
    const pmMember = staff.find((s) => s.id === newProjectPmId) || { fullName: 'Amine Meziane (PM)' };
    const creaMember = staff.find((s) => s.id === newProjectCreaId) || { fullName: 'Lina Hadj-Ali (Créa)' };

    addPmProject({
      tenantId: 'acc_01',
      facilityId: 'branch_agency_main',
      clientId: client?.id || 'pm_cli_01',
      clientName: client?.name || 'Client National',
      title: newProjectTitle || 'Nouvelle Campagne Terrain',
      scopeOfWork: newProjectScope || 'Cahier des charges standard activation.',
      budgetCapDzd: Number(newProjectBudgetCap) || 2000000,
      maxFieldExpensesDzd: Number(newProjectMaxField) || 400000,
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
    setTimeout(() => {
      setProjectCreatedSuccess(false);
      setActivePmSubScreen('projects');
    }, 1800);
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

  const handleBatchApproveAll = () => {
    pendingPayrollBatches.forEach((b) => approvePmPayrollBatch(b.id));
    pendingExpenses.forEach((e) => approvePmExpense(e.id));
  };

  const handleExportProjectsCsv = () => {
    const headers = ['ID Projet', 'Titre de la Campagne', 'Client', 'Plafond Budgétaire DZD', 'Dépenses Terrain Max DZD', 'Marge Cible %', 'Date Début', 'Date Fin', 'Chef de Projet', 'Directeur Artistique', 'Statut'];
    const rows = sortedProjects.map((p) => [
      `"${p.id}"`,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      p.budgetCapDzd,
      p.maxFieldExpensesDzd,
      p.targetGrossMarginPercent,
      p.startDate,
      p.endDate,
      `"${p.projectManagerName.replace(/"/g, '""')}"`,
      `"${p.leadCreativeName.replace(/"/g, '""')}"`,
      p.status,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portefeuille_projets_nch_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportAuditCsv = () => {
    const csvContent =
      '\uFEFF' +
      ['Type,Ref,Projet,Montant DZD,Statut',
        ...pendingPayrollBatches.map((b) => `Paie,${b.batchNumber},${b.projectTitle},${b.totalAmountDzd},En attente`),
        ...pendingExpenses.map((e) => `Achat,${e.title},${e.projectTitle},${e.amountDzd},En attente`),
      ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_direction_nch_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    <div className="space-y-6 animate-in fade-in duration-200">
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync}
      />
      {/* Top Header with Facility Switcher & Demo Data Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          {currentScreen !== 'dashboard' && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#d4522f]">
                {t('pm_role_direction_badge')}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-xs text-zinc-500">Direction Générale & Arbitrage</span>
            </div>
          )}
          <div className="flex items-center gap-3.5">
            {currentScreen === 'dashboard' && (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
            )}
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {currentScreen === 'dashboard'
                ? t('nav_dashboard', language)
                : currentScreen === 'projects'
                ? 'Portefeuille Projets'
                : currentScreen === 'new_project'
                ? t('pm_btn_new_project')
                : currentScreen === 'approvals'
                ? 'Approbations & Décaissements'
                : t('nav_pm_dir_reports')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">

          {/* Facility Switcher Dropdown Pill */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-750 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#d4522f]" />
              <span>{currentBranch?.name || 'NCH Cyberpark Tower B'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isBranchDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1.5 z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Antennes Agence
                </div>
                {branches && branches.length > 0 ? (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer ${
                        currentBranch?.id === b.id
                          ? 'bg-[#d4522f]/10 text-[#d4522f] font-bold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{b.name}</span>
                      {currentBranch?.id === b.id && <Check className="w-3.5 h-3.5 text-[#d4522f]" />}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">NCH Tower B (Cyberpark Alger)</div>
                )}
              </div>
            )}
          </div>


          {/* Liquid CSV Export */}
          <LiquidExportButton
            size="sm"
            onExport={currentScreen === 'projects' ? handleExportProjectsCsv : handleExportAuditCsv}
            idleLabel={language === 'ar' ? 'تصدير CSV' : language === 'fr' ? 'EXPORTER CSV' : 'EXPORT CSV'}
            id="pm-dir-export-btn"
          />
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: t('nav_dashboard', language), icon: TrendingUp },
          { id: 'projects', label: 'Portefeuille Projets', icon: FolderKanban, count: pmProjects.length },
          { id: 'approvals', label: 'Approbations & Décaissements', icon: ShieldCheck, count: totalPendingApprovals },
          { id: 'reports', label: 'Rapports & Marges', icon: Layers },
          { id: 'new_project', label: '+ Nouveau Projet', icon: Plus },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePmSubScreen(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#d4522f] text-[#d4522f]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  tab.id === 'approvals'
                    ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SCREEN 1.1: COCKPIT & COMMAND CENTER */}
      {currentScreen === 'dashboard' && (
        <div className="space-y-6">
          {/* TOP ROW: Two Pods */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* POD 1: Sprint Velocity & Deliverable Flow (42% width) */}
            <div className="lg:col-span-5 flex flex-col">
              <DashboardPod
                title={language === 'ar' ? 'حركة تسليم المشاريع والمهام' : language === 'fr' ? 'Vélocité Projets & Livrables' : 'Active Sprint Velocity & Deliverable Flow'}
                icon={<TrendingUp size={18} className="text-[#d4522f]" />}
                badge={
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {pmProjects.length} {language === 'ar' ? 'مشاريع نشطة' : 'Campagnes Actives'}
                  </span>
                }
                rightControls={
                  <span className="text-xs font-semibold text-gray-500">
                    {pmTalents.length} {language === 'ar' ? 'فريق معتمد' : 'Talents Mobilisés'}
                  </span>
                }
                className="flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 block mb-1">
                          {language === 'ar' ? 'الحملات قيد التنفيذ' : 'Campagnes Terrain'}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">
                            {pmProjects.length}
                          </span>
                          <span className="text-xs text-gray-400">/ 12 obj</span>
                        </div>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-medium rounded-full">
                          ● {language === 'ar' ? 'تسليم في الموعد' : 'Dans les délais'}
                        </span>
                      </div>
                      <div className="w-px h-12 bg-gray-200 dark:bg-neutral-700 mx-4" />
                      <div className="flex-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 block mb-1">
                          {language === 'ar' ? 'تأشيرات معلقة' : 'Approbations Requises'}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">
                            {totalPendingApprovals}
                          </span>
                          <span className="text-xs text-gray-400">{language === 'ar' ? 'ملفات' : 'décaissements'}</span>
                        </div>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full">
                          {language === 'ar' ? 'بانتظار الإدارة' : 'En attente DG'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-700">
                      <span className="text-[11px] text-gray-400 block mb-2">
                        {language === 'ar' ? 'كثافة نشاط الفريق على مدار 24 ساعة' : 'Courbe horaire de cadence agence (24h)'}
                      </span>
                      <HourlyCurveChart data={[0, 2, 8, 6, 2]} color="#d4522f" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">
                        {language === 'ar' ? 'نسبة إنجاز مراحل المشاريع' : 'Burn-Down & Avancement Lots'}
                      </span>
                      <span className="text-base font-bold font-mono text-gray-900 dark:text-white tabular-nums">
                        88%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-[#d4522f] h-full rounded-full transition-all duration-500"
                        style={{ width: '88%' }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>88% {language === 'ar' ? 'منجز' : 'réalisé'}</span>
                      <span>Target 95%</span>
                    </div>
                  </div>
                </div>
              </DashboardPod>
            </div>

            {/* POD 2: Project Portfolio Development (58% width) */}
            <div className="lg:col-span-7 flex flex-col">
              <DashboardPod
                title={language === 'ar' ? 'تطور محفظة المشاريع والعملاء' : language === 'fr' ? 'Développement Portefeuille & Contrats' : 'Project Portfolio Development'}
                icon={<FolderKanban size={18} className="text-[#d4522f]" />}
                rightControls={
                  <span className="text-xs font-semibold text-gray-500">
                    58 Wilayas Coverage
                  </span>
                }
                className="flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <DashboardMetricCard
                      label={language === 'ar' ? 'حملات نشطة' : 'Campagnes Actives'}
                      value={pmProjects.length}
                      badgeText={language === 'ar' ? 'سارية' : 'En cours'}
                      badgeVariant="success"
                      tooltip={language === 'ar' ? 'مشاريع قيد التنفيذ' : 'Projets déployés'}
                    />

                    <DashboardMetricCard
                      label={language === 'ar' ? 'طاقم العمل الميداني' : 'Talents Mobilisés'}
                      value={pmTalents.length}
                      badgeText="Terrain"
                      badgeVariant="neutral"
                      tooltip={language === 'ar' ? 'مشرفين ومنشطين معتمدين' : 'Superviseurs qualifiés'}
                    />

                    <DarkEspressoCard
                      label={language === 'ar' ? 'حجم التعاقدات المعتمدة' : 'Budget Engagé Validé'}
                      value={formatMoney(totalTurnoverDzd)}
                      sublabel={language === 'ar' ? 'عقود مؤشرة' : 'Volume d’affaires'}
                      badgeText="Contrats"
                      badgeVariant="neutral"
                    />
                  </div>

                  <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-gray-700 dark:text-neutral-200">
                        {language === 'ar' ? 'إنجاز المراحل أسبوعياً' : 'Jalons & Livrables clôturés (4 semaines)'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {language === 'ar' ? 'مقارنة شهرية' : '4 dernières semaines'}
                      </span>
                    </div>
                    <PillBarHistogram
                      data={[
                        { week: 'Semaine 1', value: 8 },
                        { week: 'Semaine 2', value: 14 },
                        { week: 'Semaine 3', value: 11 },
                        { week: 'Semaine 4', value: 16 },
                      ]}
                      maxScale={20}
                      barColor="#d4522f"
                    />
                  </div>
                </div>
              </DashboardPod>
            </div>
          </div>

          {/* BOTTOM ROW: Two Pods */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* POD 3: Financial Trajectory & Margin P&L (42% width) */}
            <div className="lg:col-span-5 flex flex-col">
              <DashboardPod
                title={language === 'ar' ? 'المسار المالي وهوامش المشاريع' : language === 'fr' ? 'Trajectoire Financière & Marges' : 'Financial Trajectory & Project P&L'}
                subtitle={language === 'ar' ? 'تتبع الإيرادات المفوترة، تكاليف المواهب وهامش الربحية' : language === 'fr' ? 'Suivi de la facturation client, coûts talents et marge nette' : 'Billing milestones, talent fees and gross margins'}
                icon={<DollarSign size={18} className="text-[#d4522f]" />}
                rightControls={
                  <span className="text-xs font-semibold text-gray-500 font-mono">
                    {language === 'ar' ? 'نوفمبر 2026' : 'NOVEMBRE 2026'}
                  </span>
                }
              >
                <div className="space-y-4">
                  {/* 3 Metric cards strip */}
                  <div className="grid grid-cols-3 gap-2">
                    <DashboardMetricCard
                      label={language === 'ar' ? 'صافي الهامش' : language === 'fr' ? 'Marge Nette' : 'Net Margin'}
                      value={`${Math.round(totalTurnoverDzd * 0.42).toLocaleString()} DA`}
                      subtext={language === 'ar' ? '42% نسبة الهامش' : '42.0% ratio'}
                      trend="+8.4%"
                      trendDirection="up"
                    />
                    <DashboardMetricCard
                      label={language === 'ar' ? 'المفوتر' : language === 'fr' ? 'Facturé' : 'Invoiced'}
                      value={`${totalTurnoverDzd.toLocaleString()} DA`}
                      subtext={language === 'ar' ? 'ميزانيات العقود' : 'Engagé client'}
                    />
                    <DashboardMetricCard
                      label={language === 'ar' ? 'تكاليف الإنتاج' : language === 'fr' ? 'Coûts Engagés' : 'Talent & Ops'}
                      value={`${Math.round(totalTurnoverDzd * 0.58).toLocaleString()} DA`}
                      subtext={language === 'ar' ? 'رواتب ونفقات' : 'Paies & frais'}
                      trendDirection="neutral"
                    />
                  </div>

                  {/* 30-day Cash Trajectory Curve */}
                  <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {language === 'ar' ? 'مسار الفوترة والتحصيل (30 يوماً)' : language === 'fr' ? 'Trajectoire Facturation & Recouvrement (30j)' : 'Billing & Collections Trajectory (30d)'}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-semibold">
                        +12.6% M/M
                      </span>
                    </div>
                    <MonthlyAreaChart
                      data={[
                        80000, 120000, 150000, 190000, 240000, 280000, 310000, 360000, 420000, 480000,
                        510000, 560000, 620000, 680000, 710000, 750000, 820000, 890000, 940000, 990000,
                        1050000, 1120000, 1180000, 1240000, 1310000, 1380000, 1420000, 1490000, 1560000, totalTurnoverDzd || 1650000
                      ]}
                      currency="DA"
                      color="#d4522f"
                    />
                  </div>

                  {/* 4 Inset Domain KPIs */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'نسبة التحصيل' : language === 'fr' ? 'Taux de Recouvrement' : 'Collection Rate'}</span>
                      <span className="text-base font-bold font-mono text-gray-900 dark:text-white tabular-nums">92.4%</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">{language === 'ar' ? 'ممتاز' : 'Optimal'}</span>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'متوسط السداد (DSO)' : language === 'fr' ? 'Délai Paiement Client' : 'Average DSO'}</span>
                      <span className="text-base font-bold font-mono text-gray-900 dark:text-white tabular-nums">28j</span>
                      <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">{language === 'ar' ? 'تحت الهدف' : '< 30 jours'}</span>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'انحراف الميزانية' : language === 'fr' ? 'Dérapage Budgétaire' : 'Budget Variance'}</span>
                      <span className="text-base font-bold font-mono text-gray-900 dark:text-white tabular-nums">0.0%</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">{language === 'ar' ? 'مضبوط' : 'Sous contrôle'}</span>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-[16px] border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block">{language === 'ar' ? 'المشاريع الرابحة' : language === 'fr' ? 'Projets Rentables' : 'Profitable Projects'}</span>
                      <span className="text-base font-bold font-mono text-gray-900 dark:text-white tabular-nums">94%</span>
                      <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">↗ +4.0%</span>
                    </div>
                  </div>
                </div>
              </DashboardPod>
            </div>

            {/* POD 4: Team Allocation & Budget Runaway Guardian (58% width) */}
            <div className="lg:col-span-7 flex flex-col">
              <DashboardPod
                title={language === 'ar' ? 'ذكاء الفريق ومراقبة الانحراف' : language === 'fr' ? 'Intelligence Équipe & Gardien Budget' : 'Team Allocation & Budget Runaway Guardian'}
                subtitle={language === 'ar' ? 'توزيع الموارد حسب التخصص وحماية هوامش المشاريع' : language === 'fr' ? 'Répartition par pôle, cadence créative et prévention des dépassements' : 'Workload distribution, creative cadence and runaway guard'}
                icon={<ShieldCheck size={18} className="text-[#d4522f]" />}
              >
                <div className="space-y-4">
                  {/* Two domain intelligence charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-3.5 border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                        {language === 'ar' ? 'توزيع ساعات العمل' : language === 'fr' ? 'Répartition Heures / Pôle' : 'Hours by Discipline'}
                      </span>
                      <DonutChart
                        segments={[
                          { label: language === 'ar' ? 'تصميم وهوية' : 'Key Visual / UI', value: 45, color: '#d4522f' },
                          { label: language === 'ar' ? 'تطوير وإنتاج' : 'Dev / Motion', value: 30, color: '#6366F1' },
                          { label: language === 'ar' ? 'استراتيجية وإدارة' : 'Stratégie & PM', value: 15, color: '#10B981' },
                          { label: language === 'ar' ? 'مراجعة وتدقيق' : 'QA & Recette', value: 10, color: '#F59E0B' },
                        ]}
                        size={110}
                      />
                    </div>
                    <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-3.5 border border-[#EDF1F3] dark:border-neutral-700/60 shadow-sm flex flex-col justify-between">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                        {language === 'ar' ? 'وتيرة إنجاز المهام (أسبوعياً)' : language === 'fr' ? 'Cadence Livrables / Semaine' : 'Weekly Deliverable Cadence'}
                      </span>
                      <PillBarHistogram
                        bars={[
                          { label: language === 'ar' ? 'أسبوع 1' : 'Sem 1', value: 14 },
                          { label: language === 'ar' ? 'أسبوع 2' : 'Sem 2', value: 18 },
                          { label: language === 'ar' ? 'أسبوع 3' : 'Sem 3', value: 16 },
                          { label: language === 'ar' ? 'أسبوع 4' : 'Sem 4', value: 20, highlight: true },
                        ]}
                        activeColor="#d4522f"
                      />
                    </div>
                  </div>

                  {/* Dark Espresso Guardian Card */}
                  <GuardianCard
                    title={language === 'ar' ? 'حارس ميزانية المشاريع' : language === 'fr' ? 'Budget Runaway Guardian' : 'Budget Runaway Guardian'}
                    subtitle={
                      pendingPayrollBatches.length > 0
                        ? language === 'ar'
                          ? `تنبيه: يوجد ${pendingPayrollBatches.length} دفعة رواتب معلقة تتطلب مصادقة الإدارة العامة.`
                          : `${pendingPayrollBatches.length} lot(s) de paie en attente de visa direction.`
                        : language === 'ar'
                        ? 'ممتاز! جميع الميزانيات ونفقات المواهب مطابقة لسقوف العقود.'
                        : 'Excellente gestion: tous les jalons livrables sont dans l\'enveloppe budgétaire.'
                    }
                    score={pendingPayrollBatches.length > 0 ? 88 : 96}
                    scoreLabel={language === 'ar' ? 'معدل الحماية' : 'Conformité'}
                    gaugeColor={pendingPayrollBatches.length > 0 ? '#F59E0B' : '#10B981'}
                    onToggle={() => showToast(language === 'ar' ? 'تم تحديث وضع حارس الميزانية' : 'Gardien budgétaire actif', 'info')}
                  />
                </div>
              </DashboardPod>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 1.2: PORTEFEUILLE PROJETS (UniversalDataCollection) */}
      {currentScreen === 'projects' && (
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          {/* Domain Filter Header Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل محفظة المشاريع والتعاقدات' : 'Portefeuille Projets & Gouvernance Grands Comptes'}
              </h2>
            </div>

            {/* Authentic Direction Project Status Kinetic Switcher */}
            <LiveSegmentedControl
              size="sm"
              value={projectStatusFilter}
              onValueChange={(val) => setProjectStatusFilter(val)}
              options={[
                { value: 'all', label: language === 'ar' ? 'جميع المشاريع' : 'Tous les comptes', count: pmProjects.length },
                { value: 'framing', label: language === 'ar' ? 'دفتر الشروط' : 'Cahier des charges', count: pmProjects.filter(p => p.status === 'framing').length },
                { value: 'production', label: language === 'ar' ? 'قيد الإنتاج' : 'En production', count: pmProjects.filter(p => p.status === 'production' || p.status === 'crea_active' || p.status === 'print_ready').length },
                { value: 'field_execution', label: language === 'ar' ? 'الميدان الحي' : 'Terrain live', count: pmProjects.filter(p => p.status === 'field_execution' || p.status === 'field_active').length },
                { value: 'completed', label: language === 'ar' ? 'مكتملة ومقفلة' : 'Clôturés', count: pmProjects.filter(p => p.status === 'completed' || p.status === 'closed').length },
              ]}
            />
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
              <Seek
                value={projectSearch}
                onChange={setProjectSearch}
                placeholder="Rechercher par campagne, client ou responsable..."
                openWidth={360}
                shutSize={38}
              />
              <FilterSelect
                label="Statut"
                value={projectStatusFilter}
                onChange={(val) => setProjectStatusFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: 'Tous les statuts' },
                  { value: 'framing', label: 'Cahier des charges' },
                  { value: 'creative_kv', label: 'KV Créa' },
                  { value: 'client_validated', label: 'Validé Client' },
                  { value: 'production', label: 'En Production' },
                  { value: 'field_execution', label: 'Terrain Live' },
                  { value: 'completed', label: 'Clôturé' },
                  { value: 'archived', label: 'Archivé' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setActivePmSubScreen('new_project')}
              >
                Nouveau Projet
              </AtriumButton>
            </div>
          </div>

          {/* Floating Batch Action Toolbar */}
          {selectedProjectIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#d4522f]/10 border border-[#d4522f]/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#d4522f]">
                <span>{selectedProjectIds.size} projet(s) sélectionné(s)</span>
                <button
                  type="button"
                  onClick={() => setSelectedProjectIds(new Set())}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  Désélectionner
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchUpdatePmProjectStatus(Array.from(selectedProjectIds), 'closed');
                    setSelectedProjectIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer"
                >
                  Marquer Clôturés
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchUpdatePmProjectStatus(Array.from(selectedProjectIds), 'field_active');
                    setSelectedProjectIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl transition-colors cursor-pointer"
                >
                  Passer Terrain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchDeletePmProjects(Array.from(selectedProjectIds));
                    setSelectedProjectIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          )}

          {/* Universal Data Collection for Projects */}
          <UniversalDataCollection<PMProject>
            items={sortedProjects}
            keyExtractor={(p) => p.id}
            defaultViewMode="list"
            columns={projectColumns}
            sortBy={projectSortBy}
            sortDirection={projectSortDir}
            onSortChange={(key) => {
              if (projectSortBy === key) {
                setProjectSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setProjectSortBy(key);
                setProjectSortDir('asc');
              }
            }}
            selectedIds={selectedProjectIds}
            onSelectionChange={setSelectedProjectIds}
            renderCard={(proj) => (
              <div className="flex flex-col justify-between h-full space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#d4522f] uppercase tracking-wider truncate">
                      {proj.clientName}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                      {proj.targetGrossMarginPercent}%
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {proj.scopeOfWork}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Plafond Budget:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatMoney(proj.budgetCapDzd, 'DZD')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Plafond Terrain:</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {formatMoney(proj.maxFieldExpensesDzd, 'DZD')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-zinc-500">
                    <span>CDP: {proj.projectManagerName.split(' ')[0]}</span>
                    <span>Créa: {proj.leadCreativeName.split(' ')[0]}</span>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* SCREEN 1.3: INTAKE & NEW PROJECT */}
      {currentScreen === 'new_project' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs max-w-4xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-semibold text-[#d4522f] uppercase tracking-wide">
              {t('pm_dir_screen_new_badge')}
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {t('pm_dir_screen_new_title')}
            </h2>
          </div>

          {projectCreatedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold animate-in fade-in">
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
                onChange={(val) => setNewProjectClientId(typeof val === 'string' ? val : val.target?.value || val)}
                options={pmClients.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.wilaya})`,
                }))}
                height={48}
                corner={14}
              />

              <div>
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
              </div>

              <div>
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
              </div>

              <div>
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
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  {t('pm_dir_field_scope')}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={t('pm_dir_field_scope_ph')}
                  value={newProjectScope}
                  onChange={(e) => setNewProjectScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
                />
              </div>

              <div>
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
              </div>

              <div>
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
              </div>

              <LabelSelect
                field="LeadPM"
                label={t('pm_dir_field_pm')}
                value={newProjectPmId}
                onChange={(val) => setNewProjectPmId(typeof val === 'string' ? val : val.target?.value || val)}
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
                onChange={(val) => setNewProjectCreaId(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'stf_crea_01', label: 'Lina Hadj-Ali (Directrice Artistique)' },
                  { value: 'stf_crea_02', label: 'Rachid Benali (Infographiste Print)' },
                ]}
                height={48}
                corner={14}
              />
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setNewProjectTitle('');
                  setNewProjectScope('');
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                Réinitialiser
              </button>
              <AtriumButton
                type="submit"
                variant="primary"
                size="md"
                icon={<Sparkles className="w-4 h-4" />}
              >
                Lancer le Projet & Dispatcher ➔
              </AtriumButton>
            </div>
          </form>
        </div>
      )}

      {/* SCREEN 1.4: FINANCIAL GOVERNANCE & APPROVALS */}
      {currentScreen === 'approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div>
              <span className="text-xs font-semibold text-[#d4522f] uppercase tracking-wide">
                {t('pm_dir_approvals_badge')}
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
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
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setApprovalsTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    approvalsTab === 'all'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {t('pm_dir_filter_all')} ({totalPendingApprovals})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalsTab('payroll')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    approvalsTab === 'payroll'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Lots de Paie ({pendingPayrollBatches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalsTab('expenses')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    approvalsTab === 'expenses'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Notes de Frais ({pendingExpenses.length})
                </button>
              </div>
            </div>
          </div>

          {/* Payroll Batches Queue */}
          {(approvalsTab === 'all' || approvalsTab === 'payroll') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 px-1">
                <span>Lots de Paie Terrain en Attente de Déblocage</span>
                {pendingPayrollBatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => batchApprovePmPayrollBatches(pendingPayrollBatches.map((b) => b.id))}
                    className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
                  >
                    Valider tous les lots de paie ({pendingPayrollBatches.length})
                  </button>
                )}
              </div>

              {pendingPayrollBatches.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  Aucun lot de paie en attente d'approbation.
                </div>
              ) : (
                pendingPayrollBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          Lot de Paie
                        </span>
                        <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {batch.batchNumber}
                        </span>
                        <span className="text-zinc-400">·</span>
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                          {batch.projectTitle}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Mission <span className="font-mono font-semibold">{batch.missionCode}</span> · {batch.totalBeneficiaries} animateurs pointés et vérifiés par le Superviseur.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block uppercase font-medium">{t('common_amount')}</span>
                        <span className="font-mono font-bold text-lg text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatMoney(batch.totalAmountDzd, 'DZD')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => approvePmPayrollBatch(batch.id)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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

          {/* Expenses Queue */}
          {(approvalsTab === 'all' || approvalsTab === 'expenses') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 px-1">
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
                <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  Aucun frais d'activation en attente d'arbitrage.
                </div>
              ) : (
                pendingExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          {expense.category}
                        </span>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {expense.title}
                        </span>
                        {expense.hasFiscalInvoice && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Facture Fiscale
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Déclaré par {expense.declaredByUserName} ({expense.declaredByRole}) · {expense.projectTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {expense.receiptPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptUrl(expense.receiptPhotoUrl || null)}
                          className="px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Justificatif
                        </button>
                      )}
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block uppercase font-medium">{t('common_amount')}</span>
                        <span className="font-mono font-bold text-base text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatMoney(expense.amountDzd, 'DZD')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => approvePmExpense(expense.id)}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectionModalId(expense.id)}
                        className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 1.5: EXECUTIVE AUDIT & REPORTS */}
      {currentScreen === 'reports' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">
                  Écran 1.4 · Rapports d'Activité & Marges
                </span>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Audit Financier Consolidé — Année 2026
                </h2>
              </div>

              <LiquidExportButton
                size="md"
                onExport={handleExportAuditCsv}
                idleLabel={language === 'ar' ? 'تحميل التدقيق المالي' : language === 'fr' ? 'TÉLÉCHARGER AUDIT (CSV)' : 'DOWNLOAD AUDIT (CSV)'}
                id="pm-dir-audit-export-btn"
              />
            </div>

            {/* 4 Performance Indicators */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  {t('pm_dir_kpi_cumul_ca')}
                </span>
                <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  58,4 M DA
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">{t('pm_dir_vs_2025')}</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  {t('pm_dir_kpi_avg_margin')}
                </span>
                <div className="text-2xl font-mono font-bold text-emerald-600 tabular-nums">
                  31,4 %
                </div>
                <span className="text-[11px] text-zinc-500">{t('pm_dir_target_objective')}</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  {t('pm_dir_kpi_closed_missions')}
                </span>
                <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  48
                </div>
                <span className="text-[11px] text-zinc-500">{t('pm_dir_coverage_wilayas')}</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  {t('pm_dir_kpi_attendance_rate')}
                </span>
                <div className="text-2xl font-mono font-bold text-blue-600 tabular-nums">
                  98,2 %
                </div>
                <span className="text-[11px] text-zinc-500">{t('pm_dir_rating_avg')}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                <span>{t('pm_dir_client_profitability')}</span>
                <span className="text-xs text-zinc-400 font-normal">{t('pm_dir_turnover_share')}</span>
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
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{cli.name}</span>
                      <span className="font-mono text-zinc-500">{cli.ca} · Marge {cli.margin}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className={`h-full ${cli.color}`} style={{ width: `${cli.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                <span>Ventilation des Dépenses par Poste</span>
                <span className="text-xs text-zinc-400 font-normal">Terrain & Logistique</span>
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
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.label}</span>
                      <span className="font-mono text-zinc-500">{item.amount}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#d4522f]" />
                Justificatif Fiscal de Paiement
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={selectedReceiptUrl}
              alt="Scan Justificatif"
              className="w-full h-72 object-cover rounded-xl border border-zinc-200 dark:border-zinc-800"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Rejection Reason Modal */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Motif du Rejet de la Dépense
              </h3>
              <button
                type="button"
                onClick={() => setRejectionModalId(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Veuillez préciser la raison du refus (ex: justificatif illisible, montant hors barème APC, achat non approuvé).
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Facture proforma non conforme ou facture fiscale manquante..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalId(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs cursor-pointer"
              >
                Confirmer le Rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
