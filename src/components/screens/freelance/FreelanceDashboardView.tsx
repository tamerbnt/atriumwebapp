import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  Briefcase,
  AlertCircle,
  Play,
  Pause,
  Square,
  ArrowUpRight,
  Plus,
  FileText,
  DollarSign,
  ChevronRight,
  Flame,
  CheckCircle2,
  Building2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatDuration, formatCurrencyAmount } from '../../../utils/rules';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { FreelanceInvoice } from '../../../types/index';

export const FreelanceDashboardView: React.FC = () => {
  const {
    freelanceClients,
    freelanceProjects,
    timeLogs,
    freelanceInvoices,
    freelanceProposals,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    businesses,
    branches,
    currentBusinessId,
    currentBusiness,
    switchBusiness,
    switchBranch,
    setScreen,
    updateInvoiceStatus,
  } = useAtriumStore();

  const [previewInvoice, setPreviewInvoice] = useState<FreelanceInvoice | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Compute stats
  const paidInvoices = freelanceInvoices.filter((i) => i.status === 'Paid');
  const overdueInvoices = freelanceInvoices.filter((i) => i.status === 'Overdue');
  const pendingInvoices = freelanceInvoices.filter((i) => i.status === 'Sent');

  // Dynamic pipeline by currency
  const pipelineByCurrency = freelanceInvoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.currency] = (acc[inv.currency] || 0) + inv.totalAmount;
    return acc;
  }, {});
  const formattedPipeline = Object.entries(pipelineByCurrency).length > 0
    ? Object.entries(pipelineByCurrency)
        .map(([curr, sum]) => formatCurrencyAmount(sum, curr as any))
        .join(' · ')
    : '0 EUR';

  // Weekly hours logged
  const totalSecondsLogged = timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
  const billableSeconds = timeLogs.filter((l) => l.isBillable).reduce((sum, log) => sum + log.durationSeconds, 0);
  const totalBillableHours = Number((billableSeconds / 3600).toFixed(1));
  const weeklyTargetHours = 35;
  const capacityPercent = Math.min(100, Math.round((totalBillableHours / weeklyTargetHours) * 100));

  // Dynamic Effective Hourly Rate (Total billed EUR equivalent / billable hours)
  const totalBilledValueEUR = timeLogs.reduce((sum, log) => {
    if (!log.isBillable) return sum;
    const factor = log.currency === 'DZD' ? 1 / 215 : 1;
    return sum + (log.durationSeconds / 3600) * (log.rateAtMoment || 85) * factor;
  }, 0);
  const ehrRate = totalBillableHours > 0
    ? Math.round(totalBilledValueEUR / totalBillableHours)
    : (freelanceClients[0]?.hourlyRate || 85);

  // Active deliverables count & scope creep check
  let activeDeliverablesCount = 0;
  let scopeCreepCount = 0;
  let highestOverrunDeliverable: { title: string; projectTitle: string; diffHours: number } | null = null;
  freelanceProjects.forEach((proj) => {
    (proj.deliverables || []).forEach((d) => {
      if (!d.isCompleted) activeDeliverablesCount++;
      if (d.loggedHours > d.estimatedHours) {
        scopeCreepCount++;
        const diff = Number((d.loggedHours - d.estimatedHours).toFixed(1));
        if (!highestOverrunDeliverable || diff > highestOverrunDeliverable.diffHours) {
          highestOverrunDeliverable = {
            title: d.title,
            projectTitle: proj.title,
            diffHours: diff,
          };
        }
      }
    });
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            Solo Practice Command Center
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A] uppercase tracking-wider">
              Category 16 · Freelance
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time billable pipeline, active deliverables, multi-currency invoices & focus timer
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Facility Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
            >
              <Building2 size={14} className="text-[#C4785A]" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">
                {currentBusiness?.name || 'Atlas Studio'}
              </span>
              <ChevronDown size={13} className="text-neutral-400" />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Switch Facility / Vertical
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setScreen('scheduler')}
            className="h-10 px-4 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>New Deliverable</span>
          </button>
          <button
            type="button"
            onClick={() => setScreen('shop')}
            className="h-10 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText size={14} />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Row 1: Four Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Invoiced Pipeline */}
        <div className="p-5 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Invoiced Pipeline</span>
            <DollarSign size={16} className="text-[#C4785A]" />
          </div>
          <div className="my-2">
            <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight truncate block">
              {formattedPipeline}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
              {paidInvoices.length} paid · {pendingInvoices.length} pending settlement
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>Multi-currency</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">EUR · USD · DZD</span>
          </div>
        </div>

        {/* Metric 2: Effective Hourly Rate */}
        <div className="p-5 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Effective Hourly Rate (EHR)</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
              €{ehrRate} <span className="text-xs font-medium text-neutral-400">/ hr</span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
              {ehrRate >= 75 ? '+18% vs. target baseline (€75/hr)' : 'Target baseline: €75/hr'}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>Tracked profitability</span>
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {ehrRate >= 85 ? 'High Tier' : 'Standard Tier'}
            </span>
          </div>
        </div>

        {/* Metric 3: Active Deliverables & Scope Creep */}
        <div className="p-5 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Active Deliverables</span>
            <Briefcase size={16} className="text-blue-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
              {activeDeliverablesCount} Active
            </span>
            <span
              className={`text-[11px] font-medium block mt-0.5 ${
                scopeCreepCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
              }`}
            >
              {scopeCreepCount > 0
                ? `⚠️ ${scopeCreepCount} deliverable exceeding estimate`
                : 'All deliverables on schedule'}
            </span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>{freelanceProjects.length} client projects</span>
            <button
              onClick={() => setScreen('scheduler')}
              className="font-semibold text-[#C4785A] hover:underline cursor-pointer"
            >
              Kanban →
            </button>
          </div>
        </div>

        {/* Metric 4: Weekly Billable Gauge */}
        <div className="p-5 rounded-[24px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold">
            <span>Weekly Workload Target</span>
            <Clock size={16} className="text-purple-500" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
                {totalBillableHours} <span className="text-xs font-medium text-neutral-400">/ {weeklyTargetHours}h</span>
              </span>
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                {capacityPercent}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#C4785A] h-full rounded-full transition-all duration-300"
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between">
            <span>Capacity status</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Optimal Pace</span>
          </div>
        </div>
      </div>

      {/* Row 2: Urgent Action Alert Strip (Scope Creep & Overdue Invoices) */}
      {(overdueInvoices.length > 0 || scopeCreepCount > 0) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold">Attention Required:</strong>{' '}
              {overdueInvoices.length > 0 && (
                <span>
                  Invoice #{overdueInvoices[0].invoiceNumber} for {overdueInvoices[0].clientName} ({formatCurrencyAmount(overdueInvoices[0].totalAmount, overdueInvoices[0].currency)}) is overdue.{' '}
                </span>
              )}
              {scopeCreepCount > 0 && highestOverrunDeliverable && (
                <span>
                  Deliverable "{highestOverrunDeliverable.title}" ({highestOverrunDeliverable.projectTitle}) has exceeded estimated budget by {highestOverrunDeliverable.diffHours} hours.
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {overdueInvoices.length > 0 && (
              <button
                type="button"
                onClick={() => setPreviewInvoice(overdueInvoices[0])}
                className="px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer"
              >
                Inspect Overdue Invoice
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 3: Quick Focus Stopwatch Dock + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Focus Stopwatch Dock */}
        <div className="lg:col-span-1 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-6 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Flame size={14} className="text-[#C4785A]" />
              Focus Sprint Timer
            </span>
            <span className="text-[11px] font-semibold text-neutral-500">
              {activeTimer.isPomodoro ? 'Pomodoro (25m)' : 'Standard Chrono'}
            </span>
          </div>

          <div className="text-center py-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <span className="text-4xl font-black font-mono tracking-tight text-neutral-900 dark:text-white tabular-nums">
              {formatDuration(activeTimer.elapsedSeconds)}
            </span>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 truncate px-4">
              {activeTimer.projectTitle ? (
                <span>{activeTimer.projectTitle} · <strong className="text-neutral-800 dark:text-neutral-200">{activeTimer.taskDescription || 'Sprint Task'}</strong></span>
              ) : (
                <span>No active task selected</span>
              )}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-3">
            {!activeTimer.isRunning ? (
              <button
                type="button"
                onClick={() => {
                  if (freelanceClients.length === 0 || freelanceProjects.length === 0) {
                    setScreen('scheduler');
                    return;
                  }
                  const client = freelanceClients[0];
                  const project = freelanceProjects.find((p) => p.clientId === client.id) || freelanceProjects[0];
                  const deliverable = project?.deliverables?.find((d) => !d.isCompleted) || project?.deliverables?.[0];
                  startTimer(
                    client.id,
                    client.company || client.name,
                    project.id,
                    project.title,
                    deliverable ? `Working on ${deliverable.title}` : 'Focus Sprint Session',
                    deliverable?.id,
                    deliverable?.title
                  );
                }}
                className="h-10 px-5 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Play size={14} />
                <span>
                  {freelanceProjects.length === 0 ? 'Create Project to Track' : 'Start Focus Sprint'}
                </span>
              </button>
            ) : activeTimer.isPaused ? (
              <button
                type="button"
                onClick={resumeTimer}
                className="h-10 px-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
              >
                <Play size={14} />
                <span>Resume Timer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseTimer}
                className="h-10 px-5 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
              >
                <Pause size={14} />
                <span>Pause Timer</span>
              </button>
            )}

            {activeTimer.isRunning && (
              <button
                type="button"
                onClick={stopTimer}
                title="Log hours & stop timer"
                className="h-10 px-4 rounded-full border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Square size={13} />
                <span>Log Hours</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Recent Invoices & Quick Review */}
        <div className="lg:col-span-2 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-6 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Recent Invoices & Retainers
            </h3>
            <button
              type="button"
              onClick={() => setScreen('shop')}
              className="text-xs font-bold text-[#C4785A] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View All Invoices</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-2.5">
            {freelanceInvoices.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                <FileText size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">No invoices generated yet</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Bill your unbilled hours or create an invoice in the Invoicing tab.</p>
                <button
                  type="button"
                  onClick={() => setScreen('shop')}
                  className="mt-3 px-3 py-1.5 rounded-full bg-[#C4785A] text-white text-[11px] font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Create Invoice</span>
                </button>
              </div>
            ) : (
              freelanceInvoices.slice(0, 3).map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => setPreviewInvoice(invoice)}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between hover:border-[#C4785A]/60 transition-colors cursor-pointer group shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-[#C4785A] transition-colors">
                        {invoice.clientCompany || invoice.clientName}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        #{invoice.invoiceNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate max-w-sm">
                      {invoice.items[0]?.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-sm font-black text-neutral-900 dark:text-white tabular-nums block">
                        {formatCurrencyAmount(invoice.totalAmount, invoice.currency)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        Due: {invoice.dueDate}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        invoice.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : invoice.status === 'Overdue'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Client Roster Quick Snapshot */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-6 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Client Accounts & Retainer Balances
            </h3>
            <p className="text-xs text-neutral-400">
              Active clients across Europe, USA, and Algeria
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScreen('members')}
            className="text-xs font-bold text-[#C4785A] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Manage All Clients</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {freelanceClients.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
              <Building2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">No client accounts yet</p>
              <button
                type="button"
                onClick={() => setScreen('members')}
                className="mt-2 text-xs font-bold text-[#C4785A] hover:underline cursor-pointer"
              >
                + Add your first client in Clients CRM
              </button>
            </div>
          ) : (
            freelanceClients.map((client) => {
            const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);
            return (
              <div
                key={client.id}
                onClick={() => setScreen('members')}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3 cursor-pointer hover:border-[#C4785A]/60 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {client.company || client.name}
                  </span>
                  <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/15 px-1.5 py-0.5 rounded">
                    {client.currency}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Hourly Rate</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                      {formatCurrencyAmount(client.hourlyRate, client.currency)}/h
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Lifetime Billed</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                      {formatCurrencyAmount(client.lifetimeBilled, client.currency)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                  <span>{clientProjects.length} projects</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {client.status === 'ActiveRetainer' ? 'Active Retainer' : 'Active'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
        onMarkPaid={(id) => updateInvoiceStatus(id, 'Paid')}
      />
    </div>
  );
};
