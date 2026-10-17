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
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatDuration, formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceClient, FreelanceProject, CurrencyCode, TimeLogEntry } from '../../../types/index';

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
    updateTimeLog,
    deleteTimeLog,
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

  // Edit Log State
  const [logToEdit, setLogToEdit] = useState<TimeLogEntry | null>(null);
  const [editLogForm, setEditLogForm] = useState({
    taskDescription: '',
    hours: 0,
    minutes: 0,
    date: '',
    isBillable: true,
  });

  // Delete Log State
  const [logToDelete, setLogToDelete] = useState<TimeLogEntry | null>(null);

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
    if (freelanceClients.length === 0) {
      setScreen('members');
      return;
    }
    if (freelanceProjects.length === 0) {
      setScreen('scheduler');
      return;
    }

    const client = freelanceClients.find((c) => c.id === selectedClientId) || freelanceClients[0];
    const project =
      availableProjects.find((p) => p.id === selectedProjectId) ||
      freelanceProjects.find((p) => p.clientId === client.id) ||
      freelanceProjects[0];

    startTimer(
      client.id,
      client.company || client.name,
      project.id,
      project.title,
      taskDescription || 'Sprint Task',
      project.deliverables?.[0]?.id,
      project.deliverables?.[0]?.title,
      isBillable,
      isPomodoro
    );
  };

  const handleEditLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logToEdit || !editLogForm.taskDescription.trim()) return;

    const durationSeconds = Number(editLogForm.hours) * 3600 + Number(editLogForm.minutes) * 60;
    updateTimeLog(logToEdit.id, {
      taskDescription: editLogForm.taskDescription,
      durationSeconds,
      date: editLogForm.date,
      isBillable: editLogForm.isBillable,
    });
    setLogToEdit(null);
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
                <th className="pb-2.5 font-semibold text-right">Actions</th>
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
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={entry.isInvoiced}
                        onClick={() => {
                          setLogToEdit(entry);
                          const totalMin = Math.round(entry.durationSeconds / 60);
                          setEditLogForm({
                            taskDescription: entry.taskDescription,
                            hours: Math.floor(totalMin / 60),
                            minutes: totalMin % 60,
                            date: entry.date,
                            isBillable: entry.isBillable,
                          });
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          entry.isInvoiced
                            ? 'opacity-30 cursor-not-allowed text-neutral-400'
                            : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer'
                        }`}
                        title={entry.isInvoiced ? 'Invoiced logs cannot be edited' : 'Edit time log'}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={entry.isInvoiced}
                        onClick={() => setLogToDelete(entry)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          entry.isInvoiced
                            ? 'opacity-30 cursor-not-allowed text-neutral-400'
                            : 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                        }`}
                        title={entry.isInvoiced ? 'Invoiced logs cannot be deleted' : 'Delete time log'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {timeLogs.length === 0 && (
          <div className="py-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-8 space-y-3">
            <Clock size={32} className="mx-auto text-neutral-300 dark:text-neutral-600" />
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              No Time Entries Recorded Yet
            </h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Start the live focus stopwatch above or log historical work hours to build your billable activity ledger.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Log Manual Time</span>
              </button>
            </div>
          </div>
        )}
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

      {/* Edit Time Entry Modal */}
      {logToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Edit Time Entry
                </h3>
                <p className="text-xs text-neutral-500">
                  {logToEdit.clientName} · {logToEdit.projectTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLogToEdit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditLogSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Task Summary *
                </label>
                <input
                  type="text"
                  required
                  value={editLogForm.taskDescription}
                  onChange={(e) =>
                    setEditLogForm({ ...editLogForm, taskDescription: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
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
                    value={editLogForm.hours}
                    onChange={(e) =>
                      setEditLogForm({ ...editLogForm, hours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
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
                    value={editLogForm.minutes}
                    onChange={(e) =>
                      setEditLogForm({ ...editLogForm, minutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editLogForm.date}
                  onChange={(e) => setEditLogForm({ ...editLogForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="billableEdit"
                  checked={editLogForm.isBillable}
                  onChange={(e) =>
                    setEditLogForm({ ...editLogForm, isBillable: e.target.checked })
                  }
                  className="rounded text-[#C4785A]"
                />
                <label
                  htmlFor="billableEdit"
                  className="font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  Billable to client
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setLogToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Update Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Time Entry Confirmation Modal */}
      {logToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Delete Time Entry</h3>
                <p className="text-xs text-neutral-500">{logToDelete.date} · {formatDuration(logToDelete.durationSeconds)}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete this time entry for <strong className="text-neutral-900 dark:text-white font-semibold">"{logToDelete.taskDescription}"</strong> on <strong className="text-neutral-900 dark:text-white font-semibold">{logToDelete.projectTitle}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTimeLog(logToDelete.id);
                  setLogToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
