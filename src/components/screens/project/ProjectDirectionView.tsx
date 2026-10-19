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

interface ProjectDirectionViewProps {
  initialTab?: 'dashboard' | 'new_project' | 'approvals' | 'all' | 'payroll' | 'expenses';
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

  // Top screen selection: dashboard, new_project, approvals
  const currentScreen =
    activePmSubScreen === 'new_project' || initialTab === 'new_project'
      ? 'new_project'
      : activePmSubScreen === 'approvals' || initialTab === 'approvals'
      ? 'approvals'
      : 'dashboard';

  const [approvalsTab, setApprovalsTab] = useState<'all' | 'payroll' | 'expenses'>('all');

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
  const pendingPayrollBatches = pmPayrollBatches.filter((b) => b.status === 'pending_direction_approval');
  const pendingExpenses = pmExpenses.filter((e) => e.status === 'pending_direction_approval');
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
              : 'Gouvernance Financière & Approbations'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {currentScreen !== 'new_project' && (
            <button
              onClick={() => setActivePmSubScreen('new_project')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nouveau Projet
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActivePmSubScreen('dashboard')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            currentScreen === 'dashboard'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          1.1 Command Center
        </button>

        <button
          type="button"
          onClick={() => setActivePmSubScreen('new_project')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            currentScreen === 'new_project'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          1.2 Cadrage & Cahier des Charges
        </button>

        <button
          type="button"
          onClick={() => setActivePmSubScreen('approvals')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
            currentScreen === 'approvals'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          1.3 Double-Lock Approbations
          {totalPendingApprovals > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {totalPendingApprovals}
            </span>
          )}
        </button>
      </div>

      {/* SCREEN 1.1: COMMAND CENTER */}
      {currentScreen === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>Chiffre d'Affaires Engagé</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {totalTurnoverDzd.toLocaleString()} <span className="text-xs font-normal text-zinc-500">DA</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                +18% marge brute moyenne cible
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>Missions Live Aujourd'hui</span>
                <Radio className="w-4 h-4 text-[#C4785A]" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {activeMissionsToday} <span className="text-xs font-normal text-zinc-500">en cours</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Bab Ezzouar Mall & GMS Oran</p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>Vivier Talents Disponibles</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {availableTalentsCount} <span className="text-xs font-normal text-zinc-500">vettés</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">58 wilayas · Note moy. 4.6★</p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 shadow-xs">
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 mb-2">
                <span>Autorisations Double-Clé</span>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-amber-800 dark:text-amber-300 tabular-nums">
                {totalPendingApprovals} <span className="text-xs font-normal text-amber-600">en attente</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                Paies & achats bloqués sans visa DG
              </p>
            </div>
          </div>

          {/* Center Split: Fast Approvals & Live Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#C4785A]" />
                    Validation Express des Décaissements
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Visa direct pour débloquer les virements CCP en Comptabilité.
                  </p>
                </div>
                {totalPendingApprovals > 0 && (
                  <button
                    onClick={handleBatchApproveAll}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Tout Valider ({totalPendingApprovals})
                  </button>
                )}
              </div>

              {totalPendingApprovals === 0 ? (
                <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Toutes les autorisations financières sont à jour.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Aucun lot de paie ni dépense en attente d'approbation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPayrollBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            LOT DE PAIE
                          </span>
                          <span className="font-mono text-xs text-zinc-500">{batch.batchNumber}</span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                            {batch.missionCode} — {batch.projectTitle}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          {batch.totalBeneficiaries} animateurs pointés sur le terrain.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block uppercase">Total Brut</span>
                          <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                            {batch.totalAmountDzd.toLocaleString()} DA
                          </span>
                        </div>
                        <button
                          onClick={() => approvePmPayrollBatch(batch.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Valider
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            ACHAT TERRAIN
                          </span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {expense.title}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Déclaré par {expense.declaredByUserName} · {expense.projectTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {expense.receiptPhotoUrl && (
                          <button
                            onClick={() => setSelectedReceiptUrl(expense.receiptPhotoUrl || null)}
                            className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            Reçu
                          </button>
                        )}
                        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {expense.amountDzd.toLocaleString()} DA
                        </span>
                        <button
                          onClick={() => approvePmExpense(expense.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs cursor-pointer"
                        >
                          Valider
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Live Audit Feed */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C4785A]" />
                  Flux d'Activité en Direct
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="relative pl-5 border-l-2 border-emerald-500 space-y-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Superviseur Sofiane a clôturé le pointage
                  </p>
                  <p className="text-[11px] text-zinc-500">Mission #104 Bab Ezzouar · 4 présents · Il y a 12m</p>
                </div>

                <div className="relative pl-5 border-l-2 border-blue-500 space-y-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Studio Créa a déposé le BAT v2 (300 DPI)
                  </p>
                  <p className="text-[11px] text-zinc-500">Campagne Ooredoo 5G · Il y a 28m</p>
                </div>

                <div className="relative pl-5 border-l-2 border-[#C4785A] space-y-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Comptabilité a préparé 3 bordereaux CCP
                  </p>
                  <p className="text-[11px] text-zinc-500">Lot SFP 01 généré · Total 14 000 DA · Il y a 45m</p>
                </div>

                <div className="relative pl-5 border-l-2 border-purple-500 space-y-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    RH a validé le dossier de Yasmine Belkacem
                  </p>
                  <p className="text-[11px] text-zinc-500">Wilaya 16 · Clé CCP 45 vérifiée · Il y a 1h</p>
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
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Titre de l'Opération / Campagne d'Activation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Roadshow National 5G Ooredoo — Caravane des Plages 2026"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
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
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Plafond Budgétaire Global (Budget Cap en DA)
                </label>
                <input
                  type="number"
                  value={newProjectBudgetCap}
                  onChange={(e) => setNewProjectBudgetCap(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Plafond Dépenses Terrain (Seuil Verrouillé)
                </label>
                <input
                  type="number"
                  value={newProjectMaxField}
                  onChange={(e) => setNewProjectMaxField(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Marge Brute Cible (%)
                </label>
                <input
                  type="number"
                  value={newProjectMargin}
                  onChange={(e) => setNewProjectMargin(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
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
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Date de Lancement Campagne
                </label>
                <input
                  type="date"
                  value={newProjectStartDate}
                  onChange={(e) => setNewProjectStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Date de Clôture Terrain
                </label>
                <input
                  type="date"
                  value={newProjectEndDate}
                  onChange={(e) => setNewProjectEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
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
                onClick={() => setActivePmSubScreen('dashboard')}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                Annuler
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

            {/* Filter Pills */}
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
