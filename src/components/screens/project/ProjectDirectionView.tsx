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

interface ProjectDirectionViewProps {
  initialTab?: 'dashboard' | 'new_project' | 'approvals' | 'reports' | 'all' | 'payroll' | 'expenses';
}

export const ProjectDirectionView: React.FC<ProjectDirectionViewProps> = ({ initialTab = 'dashboard' }) => {
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
      b.batchReference.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      b.missionTitle.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      b.items.some((item) => item.talentName.toLowerCase().includes(approvalSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });
  const pendingExpenses = pmExpenses.filter((e) => {
    const matchesStatus = e.status === 'pending_direction_approval';
    const matchesSearch = !approvalSearch.trim() ||
      e.title.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      e.category.toLowerCase().includes(approvalSearch.toLowerCase()) ||
      e.declaredByName.toLowerCase().includes(approvalSearch.toLowerCase());
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
              Rôle 1 · Direction Générale
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Executive Command Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {currentScreen === 'dashboard'
              ? "Command Center & Vue d'Ensemble"
              : currentScreen === 'new_project'
              ? 'Cadrage Projet & Cahier des Charges'
              : currentScreen === 'approvals'
              ? 'Gouvernance Financière & Approbations'
              : 'Rapports d\'Activité & Analyse de Performance'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit CSV
          </button>
        </div>
      </div>



      {/* SCREEN 1.1: COMMAND CENTER */}
      {currentScreen === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Ribbon matching Slide 5 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">CA DU MOIS</span>
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
                <span className="font-semibold uppercase tracking-wider text-[11px]">MISSIONS ACTIVES</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  +3
                </span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                12
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">ANIMATEURS</span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                86
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 shadow-xs">
              <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-400 mb-1">
                <span className="font-semibold uppercase tracking-wider text-[11px]">PAIES À VALIDER</span>
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                  !
                </span>
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-red-700 dark:text-red-400 tabular-nums">
                23
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
                    Missions par mois
                  </h3>
                  <span className="text-xs text-zinc-400">Année 2026</span>
                </div>
                <div className="h-32 flex items-end justify-between gap-3 pt-4 px-2">
                  {[
                    { month: 'Jan', count: 4, height: '40%' },
                    { month: 'Fév', count: 6, height: '55%' },
                    { month: 'Mar', count: 5, height: '48%' },
                    { month: 'Avr', count: 8, height: '70%' },
                    { month: 'Mai', count: 9, height: '78%' },
                    { month: 'Juin', count: 7, height: '62%' },
                    { month: 'Juil', count: 12, height: '100%', active: true },
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
                    Injection de cahier des charges
                  </h3>
                  <span className="text-[11px] text-zinc-400">Step 1 ➔ Créa</span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <span>Nouveau cahier des charges</span>
                    <span className="text-zinc-500 font-normal">Client : Ooredoo · Échéance : 20/07</span>
                  </div>
                  <LabelInput
                    field="Brief"
                    label="Brief synthétique pour l'équipe Créa..."
                    placeholder="Brief synthétique pour l'équipe Créa..."
                    value={quickBriefTitle}
                    onChange={setQuickBriefTitle}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                  {quickBriefSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-4 h-4 text-emerald-600" /> Cahier des charges injecté avec succès vers le studio Créa !
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
                      Envoyer à la Créa
                    </button>
                  </div>
                </div>
              </div>

              {/* Activité récente (Slide 5) */}
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Activité récente
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                        €
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        <strong>F. Nassima</strong> a généré 3 formulaires CCP
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Il y a 8 min</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
                        S
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        <strong>R. Sofiane</strong> a clôturé le pointage — Mission n°142
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Il y a 26 min</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-[10px]">
                        C
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        <strong>S. Meriem</strong> a livré BAT_rollup_ooredoo.pdf
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Il y a 1 h</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">
                        P
                      </div>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        <strong>K. Yacine</strong> a déclaré un achat : 8 400 DA
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Il y a 2 h</span>
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
                    Paies en attente de validation
                  </h3>
                  <span className="text-xs font-mono text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded font-bold">
                    4 requêtes
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 uppercase font-semibold">
                        <th className="pb-2">ANIMATEUR</th>
                        <th className="pb-2">MISSION</th>
                        <th className="pb-2 text-right">MONTANT</th>
                        <th className="pb-2 text-right">ACTION</th>
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
                                  <Check className="w-3.5 h-3.5" /> Validée DG
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

              {/* Ce que ça change Panel (Slide 5) */}
              <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Ce que ça change
                </h4>
                <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>Des décisions prises sur des données du jour, pas du mois dernier.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>Un cahier des charges injecté = la Créa notifiée dans la seconde.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>Double validation sur chaque dinar : rien ne part sans l'aval de la direction.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                    <span>Export Excel de tous les tableaux en un clic.</span>
                  </li>
                </ul>
                <div className="pt-2 text-[11px] text-zinc-500 italic">
                  Vos événements remontent en chiffres, en direct.
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
              Écran 1.2 · Cadrage & Cahier des Charges
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Formalisation du Dispositif d'Activation & Enveloppes Budgétaires
            </h2>
            <p className="text-xs text-zinc-500">
              Définissez les objectifs de campagne, les plafonds de dépenses terrain et assignez les chefs de file.
            </p>
          </div>

          {projectCreatedSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3 text-xs font-semibold animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Projet créé avec succès ! Dispatching instantané vers le Chef de Projet et le Studio Créa...
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <LabelInput
                  field="Title"
                  label="Titre de l'Opération / Campagne d'Activation *"
                  required
                  placeholder="Ex: Roadshow National 5G Ooredoo — Caravane des Plages 2026"
                  value={newProjectTitle}
                  onChange={setNewProjectTitle}
                  width="100%"
                  height={48}
                  corner={14}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Client Annonceur
                </label>
                <select
                  value={newProjectClientId}
                  onChange={(e) => setNewProjectClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  {pmClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.wilaya})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <LabelInput
                  field="BudgetCap"
                  label="Plafond Budgétaire Global (Budget Cap DA)"
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
                  label="Plafond Dépenses Terrain (Seuil Verrouillé DA)"
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
                  label="Marge Brute Cible (%)"
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
                  Cahier des Charges & Dispositif Opérationnel
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Détaillez le dispositif : nombre de stands éphémères, cibles d'échantillonnage, animations GMS, tenues personnalisées..."
                  value={newProjectScope}
                  onChange={(e) => setNewProjectScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                />
              </div>

              <div>
                <LabelInput
                  field="StartDate"
                  label="Date de Lancement Campagne"
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
                  label="Date de Clôture Terrain"
                  type="date"
                  value={newProjectEndDate}
                  onChange={setNewProjectEndDate}
                  width="100%"
                  height={48}
                  corner={14}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Chef de Projet Attitré (Lead PM)
                </label>
                <select
                  value={newProjectPmId}
                  onChange={(e) => setNewProjectPmId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="stf_pm_01">Amine Meziane (Senior PM)</option>
                  <option value="stf_pm_02">Samy Cherif (Event Lead)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Lead Graphiste Créa Attitré
                </label>
                <select
                  value={newProjectCreaId}
                  onChange={(e) => setNewProjectCreaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="stf_crea_01">Lina Hadj-Ali (Directrice Artistique)</option>
                  <option value="stf_crea_02">Rachid Benali (Infographiste Print)</option>
                </select>
              </div>
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
                Écran 1.3 · Gouvernance Financière & Visa Double-Clé
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                Registre d'Autorisation des Décaissements
              </h2>
              <p className="text-xs text-zinc-500">
                Chaque ligne approuvée ici débloque le virement postal ou le remboursement en trésorerie.
              </p>
            </div>

            {/* Search & Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <Seek
                value={approvalSearch}
                onChange={setApprovalSearch}
                placeholder="Rechercher lot ou dépense..."
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
                  Tous ({totalPendingApprovals})
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
                  Lots Paie ({pendingPayrollBatches.length})
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
                  Achats Terrain ({pendingExpenses.length})
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
                        LOT DE PAIE SUPERVISEUR
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
                      <span className="text-[10px] text-zinc-400 block uppercase font-medium">Montant Total</span>
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
                      Valider pour Virement CCP
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
                        ACHAT LOGISTIQUE
                      </span>
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {expense.title}
                      </span>
                      {expense.hasFiscalInvoice && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          Facture NIF
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
                        Voir Reçu
                      </button>
                    )}
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block uppercase font-medium">Montant</span>
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
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectionModalId(expense.id)}
                      className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                    >
                      Rejeter
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
                  CA CUMULÉ 2026
                </span>
                <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  58,4 M DA
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">+18% vs 2025</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  MARGE BRUTE MOYENNE
                </span>
                <div className="text-2xl font-mono font-bold text-emerald-600 tabular-nums">
                  31,4 %
                </div>
                <span className="text-[11px] text-zinc-500">Objectif agence : 30%</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  MISSIONS CLÔTURÉES
                </span>
                <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  48
                </div>
                <span className="text-[11px] text-zinc-500">58 Wilayas couvertes</span>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  ASSIDUITÉ TERRAIN
                </span>
                <div className="text-2xl font-mono font-bold text-blue-600 tabular-nums">
                  98,2 %
                </div>
                <span className="text-[11px] text-zinc-500">Moyenne note : 4,6★</span>
              </div>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Breakdown */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                <span>Rentabilité par Compte Client</span>
                <span className="text-xs text-zinc-400 font-normal">Part du CA</span>
              </h3>

              <div className="space-y-3">
                {[
                  { name: 'Ooredoo Algérie', ca: '24,5 M DA', pct: 42, margin: '32%', color: 'bg-red-500' },
                  { name: 'Danone Djurdjura', ca: '16,3 M DA', pct: 28, margin: '30%', color: 'bg-blue-500' },
                  { name: 'Cevital Agro', ca: '10,5 M DA', pct: 18, margin: '34%', color: 'bg-emerald-500' },
                  { name: 'Autres Annonceurs', ca: '7,1 M DA', pct: 12, margin: '28%', color: 'bg-amber-500' },
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
                <span>Déploiement Territorial</span>
                <span className="text-xs text-zinc-400 font-normal">Activations</span>
              </h3>

              <div className="space-y-3">
                {[
                  { wilaya: '16 - Alger (Centre)', count: 20, pct: 42, color: 'bg-[#C4785A]' },
                  { wilaya: '31 - Oran (Ouest)', count: 12, pct: 25, color: 'bg-amber-500' },
                  { wilaya: '25 - Constantine (Est)', count: 9, pct: 19, color: 'bg-blue-500' },
                  { wilaya: '19 - Sétif (Hauts Plateaux)', count: 5, pct: 10, color: 'bg-emerald-500' },
                  { wilaya: 'Autres Wilayas', count: 2, pct: 4, color: 'bg-zinc-400' },
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
                Inspection Justificatif de Caisse
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
                Fermer
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
              Motif du Rejet de la Dépense
            </h3>
            <textarea
              rows={3}
              placeholder="Indiquez pourquoi cette dépense est rejetée (ex: reçu illisible, hors budget)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectionModalId(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
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
