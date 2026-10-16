import React, { useState, useMemo } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
  Flame,
  Coffee,
  X,
  Search,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatDuration, formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceClient, FreelanceProject, CurrencyCode } from '../../../types/index';

export const FreelanceTimeTrackerView: React.FC = () => {
  const {
    activeTimer,
    timeLogs,
    freelanceClients,
    freelanceProjects,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    logTimeEntry,
    billUnbilledHours,
    setScreen,
  } = useAtriumStore();

  const [selectedClientId, setSelectedClientId] = useState<string>(
    freelanceClients[0]?.id || ''
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    freelanceProjects[0]?.id || ''
  );
  const [taskDescription, setTaskDescription] = useState('Sprint execution & feature implementation');
  const [isBillable, setIsBillable] = useState(true);
  const [isPomodoro, setIsPomodoro] = useState(false);

  // Manual Log Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    clientId: freelanceClients[0]?.id || '',
    projectId: freelanceProjects[0]?.id || '',
    taskDescription: '',
    hours: 2,
    minutes: 30,
    date: new Date().toISOString().split('T')[0],
    isBillable: true,
  });

  // Client projects filtered
  const availableProjects = useMemo(() => {
    return freelanceProjects.filter((p) => p.clientId === selectedClientId);
  }, [freelanceProjects, selectedClientId]);

  // Aggregate metrics
  const totalSecondsAll = timeLogs.reduce((sum, l) => sum + l.durationSeconds, 0);
  const billableSeconds = timeLogs
    .filter((l) => l.isBillable)
    .reduce((sum, l) => sum + l.durationSeconds, 0);
  const unbilledLogs = timeLogs.filter((l) => l.isBillable && !l.isInvoiced);
  const unbilledHours = Number(
    (unbilledLogs.reduce((sum, l) => sum + l.durationSeconds, 0) / 3600).toFixed(1)
  );

  const billableRatio = totalSecondsAll > 0 ? Math.round((billableSeconds / totalSecondsAll) * 100) : 100;

  const handleStartFocusTimer = () => {
    const client = freelanceClients.find((c) => c.id === selectedClientId);
    const project = freelanceProjects.find((p) => p.id === selectedProjectId);

    startTimer(
      client?.id || 'fcli_01',
      client?.name || 'Client',
      project?.id || 'fproj_01',
      project?.title || 'General Development',
      taskDescription || 'Sprint Task',
      project?.deliverables[0]?.id,
      project?.deliverables[0]?.title,
      isBillable,
      isPomodoro
    );
  };

  const handleManualLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.taskDescription.trim()) return;

    const client = freelanceClients.find((c) => c.id === manualForm.clientId);
    const project = freelanceProjects.find((p) => p.id === manualForm.projectId);
    const durationSeconds = Number(manualForm.hours) * 3600 + Number(manualForm.minutes) * 60;

    logTimeEntry({
      clientId: manualForm.clientId,
      clientName: client?.name || 'Client',
      projectId: manualForm.projectId,
      projectTitle: project?.title || 'Project',
      taskDescription: manualForm.taskDescription,
      durationSeconds,
      isBillable: manualForm.isBillable,
      rateAtMoment: client?.hourlyRate || 85,
      currency: client?.currency || 'EUR',
      date: manualForm.date,
    });

    setManualForm({
      clientId: freelanceClients[0]?.id || '',
      projectId: freelanceProjects[0]?.id || '',
      taskDescription: '',
      hours: 2,
      minutes: 30,
      date: new Date().toISOString().split('T')[0],
      isBillable: true,
    });
    setIsManualModalOpen(false);
  };

  const handleBillClientUnbilled = (clientId: string) => {
    try {
      billUnbilledHours(clientId, 0);
      setScreen('shop');
    } catch (err: any) {
      console.error('Error billing hours:', err?.message || err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Focus Chronometer & Timesheet
            </h1>
            <span className="text-xs text-neutral-500">
              Live stopwatch, Pomodoro rhythms & 1-click invoice roll-up
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Capture exact billable seconds with zero manual friction or spreadsheet drift
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>Manual Time Entry</span>
          </button>
        </div>
      </div>

      {/* Main Digital Chronometer Console */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 dark:bg-black text-white border border-neutral-800 shadow-xl relative overflow-hidden">
        {/* Subtle terracotta ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C4785A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left: Huge Digital Counter */}
          <div className="space-y-3 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
              <span className={`w-2 h-2 rounded-full ${activeTimer.isRunning && !activeTimer.isPaused ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
              <span>
                {activeTimer.isRunning
                  ? activeTimer.isPaused
                    ? 'Timer Paused'
                    : 'Live Session in Progress'
                  : 'Ready to Track'}
              </span>
              {activeTimer.isPomodoro && (
                <span className="text-amber-400">
                  · Pomodoro {activeTimer.pomodoroMode === 'work' ? 'Sprint (25m)' : 'Rest (5m)'}
                </span>
              )}
            </div>

            <div className="text-5xl sm:text-7xl font-mono font-black tracking-tight text-white tabular-nums drop-shadow-sm">
              {formatDuration(activeTimer.elapsedSeconds)}
            </div>

            {activeTimer.isRunning && (
              <div className="text-xs text-neutral-300 font-medium">
                Working on <strong className="text-white">{activeTimer.clientName}</strong> ·{' '}
                <span className="text-neutral-400">{activeTimer.taskDescription}</span>
              </div>
            )}
          </div>

          {/* Right: Controller Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!activeTimer.isRunning ? (
              <button
                type="button"
                onClick={handleStartFocusTimer}
                className="h-14 px-8 rounded-2xl bg-[#C4785A] text-white text-sm font-bold flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer shadow-lg hover:shadow-[#C4785A]/20"
              >
                <Play size={18} className="fill-current" />
                <span>Start Focus Timer</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {activeTimer.isPaused ? (
                  <button
                    type="button"
                    onClick={resumeTimer}
                    className="h-12 px-6 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <Play size={16} className="fill-current" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="h-12 px-6 rounded-2xl bg-amber-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    <Pause size={16} />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={stopTimer}
                  className="h-12 px-6 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-rose-700 transition-colors cursor-pointer"
                  title="Stop and save time log into history"
                >
                  <Square size={16} className="fill-current" />
                  <span>Stop & Save Log</span>
                </button>

                <button
                  type="button"
                  onClick={resetTimer}
                  className="h-12 w-12 rounded-2xl bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Discard elapsed time"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Bar below timer */}
        {!activeTimer.isRunning && (
          <div className="mt-8 pt-6 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Client Target
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const firstProj = freelanceProjects.find((p) => p.clientId === e.target.value);
                  if (firstProj) setSelectedProjectId(firstProj.id);
                }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 text-white border border-neutral-700 focus:outline-none"
              >
                {freelanceClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company || 'Private'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Active Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 text-white border border-neutral-700 focus:outline-none"
              >
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Task Brief
              </label>
              <input
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="What are you working on?"
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 text-white border border-neutral-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 pt-4 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  className="rounded text-[#C4785A] focus:ring-0"
                />
                <span>Billable Time</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={isPomodoro}
                  onChange={(e) => setIsPomodoro(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>Pomodoro (25m)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Total Hours Logged
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {(totalSecondsAll / 3600).toFixed(1)}h
            </span>
            <span className="text-xs text-neutral-500">
              {timeLogs.length} tracked sessions
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Billable Efficiency Ratio
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {billableRatio}%
            </span>
            <span className="text-xs text-neutral-500">
              {(billableSeconds / 3600).toFixed(1)}h billable
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Unbilled Hours Buffer
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {unbilledHours}h
            </span>
            <span className="text-xs text-neutral-500">
              awaiting invoice conversion
            </span>
          </div>
        </div>
      </div>

      {/* Time Entries Timesheet Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Activity Ledger & Time Entries ({timeLogs.length})
          </h3>

          {unbilledLogs.length > 0 && (
            <button
              type="button"
              onClick={() => handleBillClientUnbilled(unbilledLogs[0].clientId)}
              className="h-8 px-3 rounded-lg bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            >
              <FileText size={12} />
              <span>Bill Unbilled Hours ({unbilledHours}h)</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="pb-2.5 font-semibold">Date</th>
                <th className="pb-2.5 font-semibold">Client & Project</th>
                <th className="pb-2.5 font-semibold">Task Description</th>
                <th className="pb-2.5 font-semibold text-right">Duration</th>
                <th className="pb-2.5 font-semibold text-right">Effective Rate</th>
                <th className="pb-2.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {timeLogs.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="py-3 text-neutral-500 tabular-nums">
                    {entry.date}
                  </td>
                  <td className="py-3">
                    <span className="font-bold text-neutral-900 dark:text-white block">
                      {entry.clientName}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {entry.projectTitle}
                    </span>
                  </td>
                  <td className="py-3 max-w-xs text-neutral-700 dark:text-neutral-300">
                    <span className="truncate block font-medium">
                      {entry.taskDescription}
                    </span>
                    {entry.deliverableTitle && (
                      <span className="text-[10px] text-[#C4785A]">
                        Milestone: {entry.deliverableTitle}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                    {formatDuration(entry.durationSeconds)}
                  </td>
                  <td className="py-3 text-right font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
                    {formatCurrencyAmount(entry.rateAtMoment, entry.currency)}/h
                  </td>
                  <td className="py-3 text-center">
                    {entry.isInvoiced ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Invoiced
                      </span>
                    ) : entry.isBillable ? (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Unbilled
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-neutral-400">
                        Non-billable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Time Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Log Manual Time
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleManualLogSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Client *
                </label>
                <select
                  value={manualForm.clientId}
                  onChange={(e) => setManualForm({ ...manualForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                >
                  {freelanceClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company || 'Private'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Project *
                </label>
                <select
                  value={manualForm.projectId}
                  onChange={(e) => setManualForm({ ...manualForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                >
                  {freelanceProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Task Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architectural code review & test refactoring"
                  value={manualForm.taskDescription}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, taskDescription: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualForm.hours}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, hours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualForm.minutes}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, minutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="billableManual"
                  checked={manualForm.isBillable}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, isBillable: e.target.checked })
                  }
                  className="rounded text-[#C4785A]"
                />
                <label
                  htmlFor="billableManual"
                  className="font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Billable to client
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
