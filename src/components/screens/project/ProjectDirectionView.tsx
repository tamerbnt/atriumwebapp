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
  } = useAtriumStore();

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!pmProjects || pmProjects.length === 0) {
      resetPmMockData();
    }
  }, [pmProjects, resetPmMockData]);

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
      const matchStatus = projectStatusFilter === 'all' || p.status === projectStatusFilter;
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
                    ? 'text-[#C4785A] bg-[#C4785A]/10'
                    : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title={isPinned ? 'Détacher le projet' : 'Épingler en haut'}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center font-bold text-xs shrink-0">
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

  return (
    <div className="space-y-6">
      {/* Top Header with Facility Switcher & Demo Data Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              {t('pm_role_direction_badge')}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Direction Générale & Arbitrage</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {currentScreen === 'dashboard'
              ? 'Cockpit & Vue d\'Ensemble'
              : currentScreen === 'projects'
              ? 'Portefeuille Projets'
              : currentScreen === 'new_project'
              ? t('pm_btn_new_project')
              : currentScreen === 'approvals'
              ? 'Approbations & Décaissements'
              : t('nav_pm_dir_reports')}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Facility Switcher Dropdown Pill */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-750 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
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
                          ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span>{b.name}</span>
                      {currentBranch?.id === b.id && <Check className="w-3.5 h-3.5 text-[#C4785A]" />}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">NCH Tower B (Cyberpark Alger)</div>
                )}
              </div>
            )}
          </div>

          {/* 1-Click Demo Data Recharge Button */}
          <button
            onClick={() => resetPmMockData()}
            title="Recharger les données démo complètes de l'agence"
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
            <span>Demo Data</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={currentScreen === 'projects' ? handleExportProjectsCsv : handleExportAuditCsv}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('common_export')} CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Cockpit & Vue d\'Ensemble', icon: TrendingUp },
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
                  ? 'border-[#C4785A] text-[#C4785A]'
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
          {/* KPI Ribbon matching Slide 5 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">{t('pm_kpi_budget_committed')}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  +12 %
                </span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatMoney(totalTurnoverDzd, 'DZD')}
              </div>
            </div>

            <div
              onClick={() => setActivePmSubScreen('projects')}
              className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs cursor-pointer hover:border-[#C4785A] transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">{t('pm_kpi_active_projects')}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  Voir tout ➔
                </span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {pmProjects.length}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">{t('pm_kpi_field_talents')}</span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {pmTalents.length}
              </div>
            </div>

            <div
              onClick={() => setActivePmSubScreen('approvals')}
              className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 shadow-xs cursor-pointer hover:border-red-400 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Paies & Frais en Attente</span>
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                  {totalPendingApprovals}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-red-700 dark:text-red-400 tabular-nums">
                {totalPendingApprovals}
              </div>
            </div>
          </div>

          {/* Main Grid: Left Widgets & Right Live Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Chart & Specs Injection */}
            <div className="lg:col-span-7 space-y-6">
              {/* Missions par mois Bar Chart */}
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('pm_dir_missions_month')}
                  </h3>
                  <span className="text-xs text-zinc-400">{t('pm_dir_year')}</span>
                </div>
                <div className="h-32 flex items-end justify-between gap-3 pt-4 px-2">
                  {[
                    { month: t('pm_month_jan'), count: 4, height: '40%' },
                    { month: t('pm_month_feb'), count: 6, height: '55%' },
                    { month: t('pm_month_mar'), count: 5, height: '48%' },
                    { month: t('pm_month_apr'), count: 8, height: '70%' },
                    { month: t('pm_month_may'), count: 9, height: '78%' },
                    { month: t('pm_month_jun'), count: 7, height: '62%' },
                    { month: t('pm_month_jul'), count: 12, height: '100%', active: true },
                  ].map((bar) => (
                    <div key={bar.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-mono font-semibold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {bar.count}
                      </span>
                      <div
                        style={{ height: bar.height }}
                        className={`w-full rounded-t-md transition-all ${
                          bar.active
                            ? 'bg-[#DC2626] shadow-sm'
                            : 'bg-red-200 dark:bg-red-950/60 hover:bg-red-300'
                        }`}
                      />
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Injection de cahier des charges */}
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#DC2626]" />
                    {t('pm_dir_injection_title')}
                  </h3>
                  <span className="text-[11px] text-zinc-400">{t('pm_dir_step_crea')}</span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <span>{t('pm_dir_new_specs')}</span>
                    <span className="text-zinc-500 font-normal">{t('pm_dir_client_deadline')}</span>
                  </div>
                  <LabelInput
                    field="Brief"
                    value={quickBriefTitle}
                    onChange={setQuickBriefTitle}
                    placeholder="Titre du brief / campagne"
                    height={44}
                    corner={12}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-500">
                      Transmis instantanément au Studio Créa pour élaboration du Key Visual.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickBriefSuccess(true);
                        setTimeout(() => setQuickBriefSuccess(false), 2000);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg shadow-xs cursor-pointer transition-colors"
                    >
                      {quickBriefSuccess ? 'Transmis !' : 'Injecter au Studio ➔'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Paies en attente de validation & Ce que ça change */}
            <div className="lg:col-span-5 space-y-6">
              {/* Paies en attente de validation Table */}
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('pm_dir_pending_validation')}
                  </h3>
                  <span className="text-xs font-mono text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded font-bold">
                    {pendingPayrollBatches.length} lot(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 uppercase font-semibold">
                        <th className="pb-2">Réf. Lot</th>
                        <th className="pb-2">Projet</th>
                        <th className="pb-2 text-right">Montant</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {pendingPayrollBatches.slice(0, 4).map((batch) => {
                        const isValidated = validatedPaieIds.includes(batch.id);
                        return (
                          <tr key={batch.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                            <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                              {batch.batchNumber}
                            </td>
                            <td className="py-2.5 text-zinc-500 truncate max-w-[120px]">{batch.projectTitle}</td>
                            <td className="py-2.5 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {batch.totalAmountDzd.toLocaleString()} DA
                            </td>
                            <td className="py-2.5 text-right">
                              {isValidated ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                                  <Check className="w-3.5 h-3.5" /> {t('pm_dir_status_validated_dg')}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setValidatedPaieIds((prev) => [...prev, batch.id]);
                                    approvePmPayrollBatch(batch.id);
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg shadow-xs cursor-pointer transition-colors"
                                >
                                  Valider
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ce que ça change Panel */}
              <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  {t('pm_dir_what_changes')}
                </h4>
                <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>{t('pm_dir_benefit_1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>{t('pm_dir_benefit_2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>{t('pm_dir_benefit_3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>{t('pm_dir_benefit_4')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 1.2: PORTEFEUILLE PROJETS (UniversalDataCollection) */}
      {currentScreen === 'projects' && (
        <div className="space-y-4">
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
              <button
                type="button"
                onClick={() => setActivePmSubScreen('new_project')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Projet</span>
              </button>
            </div>
          </div>

          {/* Floating Batch Action Toolbar */}
          {selectedProjectIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#C4785A]/10 border border-[#C4785A]/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#C4785A]">
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
                    <span className="text-[11px] font-bold text-[#C4785A] uppercase tracking-wider truncate">
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
            <span className="text-xs font-semibold text-[#C4785A] uppercase tracking-wide">
              {t('pm_dir_screen_new_badge')}
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {t('pm_dir_screen_new_title')}
            </h2>
            <p className="text-xs text-zinc-500">
              {t('pm_dir_screen_new_sub')}
            </p>
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
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
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
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Lancer le Projet & Dispatcher ➔
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SCREEN 1.4: FINANCIAL GOVERNANCE & APPROVALS */}
      {currentScreen === 'approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div>
              <span className="text-xs font-semibold text-[#C4785A] uppercase tracking-wide">
                {t('pm_dir_approvals_badge')}
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {t('pm_dir_approvals_title')}
              </h2>
              <p className="text-xs text-zinc-500">
                {t('pm_dir_approvals_sub')}
              </p>
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
                <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider block">
                  Écran 1.4 · Rapports d'Activité & Marges
                </span>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Audit Financier Consolidé — Année 2026
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Analyse transversale de la rentabilité par client, wilaya et catégorie d'activation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start"
              >
                <Download className="w-4 h-4" />
                Télécharger l'Audit Fiscal & Marge (CSV)
              </button>
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
                <Receipt className="w-4 h-4 text-[#C4785A]" />
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
