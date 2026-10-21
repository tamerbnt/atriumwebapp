import React, { useState } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMProject } from '../../../types/index';
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
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

interface ProjectDirectionViewProps {
  initialTab?: 'dashboard' | 'new_project' | 'approvals' | 'reports' | 'all' | 'payroll' | 'expenses';
}

export const ProjectDirectionView: React.FC<ProjectDirectionViewProps> = ({ initialTab = 'dashboard' }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    pmProjects,
    pmMissions,
    pmTalents,
    pmPayrollBatches,
    pmExpenses,
    pmClients,
    staff,
    addPmProject,
    approvePmExpense,
    rejectPmExpense,
    approvePmPayrollBatch,
    activePmSubScreen,
    setActivePmSubScreen,
  } = useAtriumStore();

  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Top screen selection: dashboard, new_project, approvals, reports
  const currentScreen =
    activePmSubScreen === 'new_project' || initialTab === 'new_project'
      ? 'new_project'
      : activePmSubScreen === 'approvals' || initialTab === 'approvals'
      ? 'approvals'
      : activePmSubScreen === 'reports' || initialTab === 'reports'
      ? 'reports'
      : 'dashboard';

  const [approvalsTab, setApprovalsTab] = useState<'all' | 'payroll' | 'expenses'>('all');
  const [approvalSearch, setApprovalSearch] = useState('');
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
  const pendingPayrollBatches = pmPayrollBatches.filter((b) => {
    const matchesStatus = b.status === 'pending_direction_approval';
    const matchesSearch = !approvalSearch.trim() ||
      b.batchNumber.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      b.projectTitle.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      b.missionCode.toLowerCase().includes(approvalSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const pendingExpenses = pmExpenses.filter((e) => {
    const matchesStatus = e.status === 'pending_direction_approval';
    const matchesSearch = !approvalSearch.trim() ||
      e.title.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      e.category.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      e.declaredByUserName.toLowerCase().includes(approvalSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const totalPendingApprovals = pendingPayrollBatches.length + pendingExpenses.length;

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
      setActivePmSubScreen('dashboard');
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

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Type,Ref,Projet,Montant DZD,Statut',
        ...pendingPayrollBatches.map((b) => `Paie,${b.batchNumber},${b.projectTitle},${b.totalAmountDzd},En attente`),
        ...pendingExpenses.map((e) => `Achat,${e.title},${e.projectTitle},${e.amountDzd},En attente`),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_direction_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              {t('pm_role_direction_badge')}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">{t('pm_dir_title')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {currentScreen === 'dashboard'
              ? t('pm_dir_title')
              : currentScreen === 'new_project'
              ? t('pm_btn_new_project')
              : currentScreen === 'approvals'
              ? t('pm_btn_approve_payroll')
              : t('nav_pm_dir_reports')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {t('common_export')} CSV
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: t('pm_dir_tab_cockpit'), icon: TrendingUp },
          { id: 'new_project', label: t('pm_dir_tab_new_project'), icon: Plus },
          { id: 'approvals', label: t('pm_dir_tab_approvals'), icon: ShieldCheck, count: totalPendingApprovals },
          { id: 'reports', label: t('pm_dir_tab_reports'), icon: Layers },
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
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SCREEN 1.1: COMMAND CENTER */}
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
                4,2 M DA
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">{t('pm_kpi_active_projects')}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  +3
                </span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {pmProjects.length || 12}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">{t('pm_kpi_field_talents')}</span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {pmTalents.length || 86}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 shadow-xs">
              <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">{t('pm_kpi_payroll_due')}</span>
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                  !
                </span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-red-700 dark:text-red-400 tabular-nums">
                {pendingPayrollBatches.length || 23}
              </div>
            </div>
          </div>

          {/* Main Grid: Left Widgets & Right Live Queue (matching Slide 5 layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Chart, Injection, Feed */}
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

              {/* Injection de cahier des charges (Slide 5) */}
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
                    label={t('pm_dir_new_specs')}
                    placeholder={t('pm_dir_new_specs')}
                    value={quickBriefTitle}
                    onChange={setQuickBriefTitle}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                  {quickBriefSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-4 h-4 text-emerald-600" /> {t('pm_dir_injected_success')}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const client = pmClients[0];
                        addPmProject({
                          tenantId: 'acc_01',
                          facilityId: 'branch_agency_main',
                          clientId: client?.id || 'pm_cli_01',
                          clientName: 'Ooredoo Algérie',
                          title: quickBriefTitle || 'Roadshow 5G Ouest',
                          scopeOfWork: 'Brief injecté par la Direction Générale : création de Rollup, Flyer A5, Kakemonos et comptoirs PLV.',
                          budgetCapDzd: 3800000,
                          maxFieldExpensesDzd: 600000,
                          targetGrossMarginPercent: 32,
                          startDate: '2026-07-20',
                          endDate: '2026-08-15',
                          kvDeadline: '2026-07-20',
                          printDeadline: '2026-07-22',
                          executionStartDate: '2026-07-25',
                          projectManagerId: 'stf_pm_01',
                          projectManagerName: 'K. Yacine (CDP)',
                          leadCreativeId: 'stf_crea_01',
                          leadCreativeName: 'S. Meriem (DA)',
                          status: 'framing',
                        });
                        setQuickBriefSuccess(true);
                        setTimeout(() => setQuickBriefSuccess(false), 3000);
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('pm_dir_send_crea')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Activité récente (Slide 5) */}
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t('pm_dir_recent_activity')}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                        €
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {t('pm_dir_activity_ccp_generated', { user: 'F. Nassima', count: 3 })}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{t('pm_dir_time_ago_min', { min: 8 })}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
                        S
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {t('pm_dir_activity_rollcall_closed', { user: 'R. Sofiane', code: 142 })}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{t('pm_dir_time_ago_min', { min: 26 })}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-[10px]">
                        C
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {t('pm_dir_activity_bat_delivered', { user: 'S. Meriem', file: 'BAT_rollup_ooredoo.pdf' })}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{t('pm_dir_time_ago_hours', { count: 1 })}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">
                        P
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {t('pm_dir_activity_purchase_declared', { user: 'K. Yacine', amount: '8 400' })}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{t('pm_dir_time_ago_hours', { count: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Paies en attente de validation & Ce que ça change */}
            <div className="lg:col-span-5 space-y-6">
              {/* Paies en attente de validation Table (Slide 5) */}
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {t('pm_dir_pending_validation')}
                  </h3>
                  <span className="text-xs font-mono text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded font-bold">
                    {t('pm_dir_requests_count', { count: 4 })}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 uppercase font-semibold">
                        <th className="pb-2">{t('pm_dir_table_animator')}</th>
                        <th className="pb-2">{t('pm_dir_table_mission')}</th>
                        <th className="pb-2 text-right">{t('pm_dir_table_amount')}</th>
                        <th className="pb-2 text-right">{t('pm_dir_table_action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {[
                        { name: 'Amina B.', mission: 'Roadshow', amount: 12500, id: 'p_01' },
                        { name: 'Yacine K.', mission: 'GMS Carrefour', amount: 9000, id: 'p_02' },
                        { name: 'Mohamed L.', mission: 'Street mkt', amount: 11200, id: 'p_03' },
                        { name: 'Lina T.', mission: 'Porte-à-porte', amount: 8400, id: 'p_04' },
                      ].map((item) => {
                        const isValidated = validatedPaieIds.includes(item.id);
                        return (
                          <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                            <td className="py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </td>
                            <td className="py-2.5 text-zinc-500">{item.mission}</td>
                            <td className="py-2.5 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {item.amount.toLocaleString()} DA
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
                                    setValidatedPaieIds((prev) => [...prev, item.id]);
                                    handleBatchApproveAll();
                                  }}
                                  className="px-3 py-1 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg shadow-xs cursor-pointer transition-colors"
                                >
                                  {t('pm_dir_btn_validate')}
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

              {/* Ce que ça change Panel (Slide 5) */}
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
                <div className="pt-2 text-[11px] text-zinc-500 italic">
                  {t('pm_dir_live_tagline')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 1.2: PROJECT INTAKE & TERMS OF REFERENCE */}
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

      {/* SCREEN 1.3: FINANCIAL GOVERNANCE & APPROVALS */}
      {currentScreen === 'approvals' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[#C4785A] uppercase tracking-wide">
                {t('pm_dir_approvals_badge')}
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {t('pm_dir_approvals_title')}
              </h2>
              <p className="text-xs text-zinc-500">
                {t('pm_dir_approvals_sub')}
              </p>
            </div>

            {/* Search & Filter Pills */}
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
                  {t('pm_dir_filter_payroll')} ({pendingPayrollBatches.length})
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
                  {t('pm_dir_filter_expenses')} ({pendingExpenses.length})
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Payroll items */}
            {(approvalsTab === 'all' || approvalsTab === 'payroll') &&
              pendingPayrollBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {t('pm_dir_payroll_badge')}
                      </span>
                      <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {batch.batchNumber}
                      </span>
                      <span className="text-zinc-400">·</span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        {batch.projectTitle}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Pointage clôturé par le Superviseur terrain. {batch.totalBeneficiaries} bénéficiaires avec comptes CCP vérifiés.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block uppercase font-medium">{t('common_amount')}</span>
                      <span className="font-mono font-bold text-lg text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {batch.totalAmountDzd.toLocaleString()} DA
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
              ))}

            {/* Expenses items */}
            {(approvalsTab === 'all' || approvalsTab === 'expenses') &&
              pendingExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        {t('pm_dir_logistics_badge')}
                      </span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {expense.title}
                      </span>
                      {expense.hasFiscalInvoice && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          {t('pm_dir_fiscal_invoice')}
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
                        {t('pm_dir_see_receipt')}
                      </button>
                    )}
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block uppercase font-medium">{t('common_amount')}</span>
                      <span className="font-mono font-bold text-base text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {expense.amountDzd.toLocaleString()} DA
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => approvePmExpense(expense.id)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {t('pm_dir_approve_btn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectionModalId(expense.id)}
                      className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                    >
                      {t('pm_dir_reject_btn')}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SCREEN 1.4: EXECUTIVE AUDIT & REPORTS */}
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
                onClick={handleExportCsv}
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
            {/* Client Breakdown */}
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
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${cli.color} rounded-full`} style={{ width: `${cli.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographical Wilaya Distribution */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                <span>{t('pm_dir_territorial_deploy')}</span>
                <span className="text-xs text-zinc-400 font-normal">{t('pm_dir_activations_count')}</span>
              </h3>

              <div className="space-y-3">
                {[
                  { wilaya: '16 - Alger (Centre)', count: 20, pct: 42, color: 'bg-[#C4785A]' },
                  { wilaya: '31 - Oran (Ouest)', count: 12, pct: 25, color: 'bg-amber-500' },
                  { wilaya: '25 - Constantine (Est)', count: 9, pct: 19, color: 'bg-blue-500' },
                  { wilaya: '19 - Sétif (Hauts Plateaux)', count: 5, pct: 10, color: 'bg-emerald-500' },
                  { wilaya: t('pm_dir_wilaya_others'), count: 2, pct: 4, color: 'bg-zinc-400' },
                ].map((w) => (
                  <div key={w.wilaya} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{w.wilaya}</span>
                      <span className="font-mono text-zinc-500">{w.count} missions ({w.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${w.color} rounded-full`} style={{ width: `${w.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receipt Zoom Inspector */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {t('pm_dir_see_receipt')}
              </h4>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-zinc-950 flex items-center justify-center min-h-[300px]">
              <img
                src={selectedReceiptUrl}
                alt="Ticket Justificatif"
                className="max-h-[450px] w-auto rounded-lg object-contain shadow-lg"
              />
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 flex justify-end">
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-4 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer"
              >
                {t('common_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('pm_dir_reject_modal_title')}
            </h3>
            <textarea
              rows={3}
              placeholder={t('pm_dir_reject_modal_ph')}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectionModalId(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer"
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
              >
                {t('pm_dir_btn_confirm_reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
