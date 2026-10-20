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
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

export const FreelanceTimeTrackerView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
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
    showToast,
  } = useAtriumStore();

  const [selectedClientId, setSelectedClientId] = useState<string>(
    freelanceClients[0]?.id || ''
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    freelanceProjects[0]?.id || ''
  );
  const [taskDescription, setTaskDescription] = useState('');
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

  const availableManualProjects = useMemo(() => {
    if (!manualForm.clientId) return freelanceProjects;
    const clientProjects = freelanceProjects.filter((p) => p.clientId === manualForm.clientId);
    return clientProjects.length > 0 ? clientProjects : freelanceProjects;
  }, [freelanceProjects, manualForm.clientId]);

  const handleManualClientChange = (newClientId: string) => {
    const nextProjects = freelanceProjects.filter((p) => p.clientId === newClientId);
    setManualForm((prev) => ({
      ...prev,
      clientId: newClientId,
      projectId: nextProjects[0]?.id || '',
    }));
  };

  const handleOpenManualModal = () => {
    const defaultClientId = freelanceClients[0]?.id || '';
    const defaultProjects = freelanceProjects.filter((p) => p.clientId === defaultClientId);
    setManualForm({
      clientId: defaultClientId,
      projectId: defaultProjects[0]?.id || freelanceProjects[0]?.id || '',
      taskDescription: '',
      hours: 2,
      minutes: 30,
      date: new Date().toISOString().split('T')[0],
      isBillable: true,
    });
    setIsManualModalOpen(true);
  };

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
  const [searchQuery, setSearchQuery] = useState('');

  // Client projects filtered
  const availableProjects = useMemo(() => {
    return freelanceProjects.filter((p) => p.clientId === selectedClientId);
  }, [freelanceProjects, selectedClientId]);

  // Search filtered time logs
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return timeLogs;
    const q = searchQuery.toLowerCase();
    return timeLogs.filter(
      (entry) =>
        entry.taskDescription.toLowerCase().includes(q) ||
        entry.clientName.toLowerCase().includes(q) ||
        entry.projectTitle.toLowerCase().includes(q) ||
        (entry.deliverableTitle && entry.deliverableTitle.toLowerCase().includes(q))
    );
  }, [timeLogs, searchQuery]);

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
      taskDescription || (language === 'ar' ? 'مهمة عمل' : language === 'fr' ? 'Session de travail' : 'Sprint Task'),
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
      clientName: client?.name || (language === 'ar' ? 'العميل' : language === 'fr' ? 'Client' : 'Client'),
      projectId: manualForm.projectId,
      projectTitle: project?.title || (language === 'ar' ? 'المشروع' : language === 'fr' ? 'Projet' : 'Project'),
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

    showToast({
      type: 'success',
      title: t('toast_time_logged_title', language),
      message: `${manualForm.hours}h ${manualForm.minutes}m ${t('toast_time_logged_msg', language)} "${project?.title || t('nav_scheduler', language)}".`,
      category: 'freelance_solo',
      action: {
        label: t('nav_shop', language),
        onClick: () => setScreen('shop'),
      },
    });
  };

  const handleBillClientUnbilled = (clientId: string) => {
    try {
      const inv = billUnbilledHours(clientId, 0);
      showToast({
        type: 'success',
        title: t('toast_invoice_gen_title', language),
        message: `${t('toast_invoice_gen_msg', language)} ${inv?.clientName || ''}.`,
        category: 'freelance_solo',
        action: {
          label: t('toast_invoice_preview_btn', language),
          onClick: () => setScreen('shop'),
        },
      });
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
              {t('free_time_title', language)}
            </h1>
            <span className="text-xs text-neutral-500">
              {language === 'ar'
                ? 'مؤقت مباشر، إيقاع بومودورو وفوترة بنقرة واحدة'
                : language === 'fr'
                ? 'Chronomètre en direct, sessions Pomodoro & facturation en 1 clic'
                : 'Live stopwatch, Pomodoro rhythms & 1-click invoice roll-up'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t('free_time_subtitle', language)}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleOpenManualModal}
            className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>{t('free_time_btn_manual', language)}</span>
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
                    ? t('free_time_timer_paused_status', language)
                    : t('free_time_live_session_status', language)
                  : t('free_time_ready_status', language)}
              </span>
              {activeTimer.isPomodoro && (
                <span className="text-amber-400">
                  · Pomodoro {activeTimer.pomodoroMode === 'work' ? t('free_time_pomodoro_sprint', language) : t('free_time_pomodoro_rest', language)}
                </span>
              )}
            </div>

            <div className="text-5xl sm:text-7xl font-mono font-black tracking-tight text-white tabular-nums drop-shadow-sm">
              {formatDuration(activeTimer.elapsedSeconds)}
            </div>

            {activeTimer.isRunning && (
              <div className="text-xs text-neutral-300 font-medium">
                {t('free_time_working_on_label', language)}{' '}
                <strong className="text-white">{activeTimer.clientName}</strong> ·{' '}
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
                <span>{t('free_time_timer_start', language)}</span>
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
                    <span>{t('free_time_timer_resume', language)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="h-12 px-6 rounded-2xl bg-amber-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    <Pause size={16} />
                    <span>{t('free_time_timer_pause', language)}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={stopTimer}
                  className="h-12 px-6 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center gap-2 hover:bg-rose-700 transition-colors cursor-pointer"
                  title={t('free_time_stop_save_tt', language)}
                >
                  <Square size={16} className="fill-current" />
                  <span>{t('free_time_timer_stop', language)}</span>
                </button>

                <button
                  type="button"
                  onClick={resetTimer}
                  className="h-12 w-12 rounded-2xl bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={t('free_time_discard_tt', language)}
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
            <LabelSelect
              field="Client"
              label={t('free_invoice_client', language)}
              value={selectedClientId}
              onChange={(val) => {
                const cId = val?.target?.value ?? String(val);
                setSelectedClientId(cId);
                const firstProj = freelanceProjects.find((p) => p.clientId === cId);
                if (firstProj) setSelectedProjectId(firstProj.id);
              }}
              options={freelanceClients.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.company || t('free_clients_private_badge', language)})`,
              }))}
              placeholder={t('free_deliv_ph_select_client', language)}
              height={46}
              corner={14}
            />

            <LabelSelect
              field="Project"
              label={t('free_time_project_label', language)}
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val?.target?.value ?? String(val))}
              options={availableProjects.map((p) => ({
                value: p.id,
                label: p.title,
              }))}
              placeholder={t('free_time_ph_select_project', language)}
              height={46}
              corner={14}
            />

              <LabelInput
                field="Task"
                label={t('free_time_working_on', language)}
                placeholder={t('free_time_live_what_working_on', language)}
                value={taskDescription}
                onChange={setTaskDescription}
                width="100%"
                height={46}
                corner={14}
              />

            <div className="flex items-center justify-between sm:justify-end gap-4 pt-4 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  className="rounded text-[#C4785A] focus:ring-0"
                />
                <span>{t('free_time_billable', language)}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={isPomodoro}
                  onChange={(e) => setIsPomodoro(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>{t('free_topbar_pomodoro', language)} (25m)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_time_total_hours_logged', language)}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {(totalSecondsAll / 3600).toFixed(1)}h
            </span>
            <span className="text-xs text-neutral-500">
              {timeLogs.length} {t('free_time_tracked_sessions_unit', language)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_time_billable_ratio', language)}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {billableRatio}%
            </span>
            <span className="text-xs text-neutral-500">
              {(billableSeconds / 3600).toFixed(1)}h {t('free_time_billable_hours_unit', language)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_time_unbilled_total', language)}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {unbilledHours}h
            </span>
            <span className="text-xs text-neutral-500">
              {t('free_time_awaiting_invoice', language)}
            </span>
          </div>
        </div>
      </div>

      {/* Time Entries Timesheet Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {t('free_time_recent_logs', language)} ({filteredLogs.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('free_time_ph_search_logs', language)}
            />
            {unbilledLogs.length > 0 && (
              <button
                type="button"
                onClick={() => handleBillClientUnbilled(unbilledLogs[0].clientId)}
                className="h-8 px-3 rounded-lg bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs shrink-0"
              >
                <FileText size={12} />
                <span>{t('free_clients_quick_bill', language)} ({unbilledHours}h)</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className={`pb-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t('common_date', language)}</th>
                <th className={`pb-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t('free_invoice_client', language)} & {t('free_time_project_label', language)}</th>
                <th className={`pb-2.5 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t('free_time_field_notes', language)}</th>
                <th className={`pb-2.5 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t('free_time_duration', language)}</th>
                <th className={`pb-2.5 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t('free_time_rate', language)}</th>
                <th className="pb-2.5 font-semibold text-center">{t('common_status', language)}</th>
                <th className={`pb-2.5 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t('common_actions', language)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredLogs.map((entry) => (
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
                        {t('free_time_milestone_prefix', language)}: {entry.deliverableTitle}
                      </span>
                    )}
                  </td>
                  <td className={`py-3 ${isRtl ? 'text-left' : 'text-right'} font-mono font-bold text-neutral-900 dark:text-white tabular-nums`}>
                    {formatDuration(entry.durationSeconds)}
                  </td>
                  <td className={`py-3 ${isRtl ? 'text-left' : 'text-right'} font-medium text-neutral-700 dark:text-neutral-300 tabular-nums`}>
                    {formatCurrencyAmount(entry.rateAtMoment, entry.currency)}/h
                  </td>
                  <td className="py-3 text-center">
                    {entry.isInvoiced ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {t('free_kanban_invoiced', language)}
                      </span>
                    ) : entry.isBillable ? (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {t('free_time_unbilled_badge', language)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-neutral-400">
                        {t('free_time_non_billable', language)}
                      </span>
                    )}
                  </td>
                  <td className={`py-3 ${isRtl ? 'text-left' : 'text-right'}`}>
                    <div className={`flex items-center ${isRtl ? 'justify-start' : 'justify-end'} gap-1.5`}>
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
                        title={entry.isInvoiced ? t('free_time_no_edit_invoiced_tt', language) : t('free_time_edit_log_tt', language)}
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
                        title={entry.isInvoiced ? t('free_time_no_delete_invoiced_tt', language) : t('free_time_delete_log_tt', language)}
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
              {t('free_time_empty_logs', language)}
            </h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {t('free_time_empty_logs_desc', language)}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>{t('free_time_btn_manual', language)}</span>
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
                {t('free_time_modal_manual_title', language)}
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
              <LabelSelect
                field="Client"
                label={`${t('free_invoice_client', language)} *`}
                placeholder={t('free_time_ph_select_client', language)}
                value={manualForm.clientId}
                onChange={(val) => handleManualClientChange(val?.target?.value ?? String(val))}
                options={freelanceClients.map((c) => ({
                  value: c.id,
                  label: c.name,
                  sublabel: c.company || t('free_clients_private_badge', language),
                }))}
                searchable
                width="100%"
                height={40}
                corner={12}
              />

              <LabelSelect
                field="Project"
                label={`${t('free_time_project_label', language)} *`}
                placeholder={t('free_time_ph_select_project', language)}
                value={manualForm.projectId}
                onChange={(val) =>
                  setManualForm((prev) => ({
                    ...prev,
                    projectId: val?.target?.value ?? String(val),
                  }))
                }
                options={availableManualProjects.map((p) => ({
                  value: p.id,
                  label: p.title,
                  sublabel: `${p.pricingModel === 'Fixed' ? t('free_deliv_pricing_fixed', language) : p.pricingModel === 'Hourly' ? t('free_deliv_pricing_hourly', language) : t('free_deliv_pricing_retainer', language)} · ${p.clientName}`,
                }))}
                searchable
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                id="manual-task-summary"
                label={t('free_time_field_notes', language)}
                required
                placeholder={t('free_time_ph_task_summary', language)}
                value={manualForm.taskDescription}
                onChange={(e) =>
                  setManualForm((prev) => ({
                    ...prev,
                    taskDescription: e?.target?.value ?? String(e),
                  }))
                }
                width="100%"
                height={40}
                corner={12}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="manual-hours"
                  label={t('free_time_field_hours', language)}
                  type="number"
                  min="0"
                  value={manualForm.hours}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      hours: Number(e?.target?.value ?? e),
                    }))
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="manual-minutes"
                  label={t('free_time_field_minutes', language)}
                  type="number"
                  min="0"
                  max="59"
                  value={manualForm.minutes}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      minutes: Number(e?.target?.value ?? e),
                    }))
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <LabelInput
                id="manual-date"
                label={t('free_time_field_date', language)}
                type="date"
                value={manualForm.date}
                onChange={(e) =>
                  setManualForm((prev) => ({
                    ...prev,
                    date: e?.target?.value ?? String(e),
                  }))
                }
                width="100%"
                height={40}
                corner={12}
              />

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
                  {t('free_time_billable', language)}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('common_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('common_save', language)}
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
                  {t('free_time_edit_modal_title', language)}
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
              <LabelInput
                id="edit-task-summary"
                label={t('free_time_field_notes', language)}
                required
                value={editLogForm.taskDescription}
                onChange={(e) =>
                  setEditLogForm((prev) => ({
                    ...prev,
                    taskDescription: e?.target?.value ?? String(e),
                  }))
                }
                width="100%"
                height={40}
                corner={12}
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="edit-hours"
                  label={t('free_time_field_hours', language)}
                  type="number"
                  min="0"
                  value={editLogForm.hours}
                  onChange={(e) =>
                    setEditLogForm((prev) => ({
                      ...prev,
                      hours: Number(e?.target?.value ?? e),
                    }))
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="edit-minutes"
                  label={t('free_time_field_minutes', language)}
                  type="number"
                  min="0"
                  max="59"
                  value={editLogForm.minutes}
                  onChange={(e) =>
                    setEditLogForm((prev) => ({
                      ...prev,
                      minutes: Number(e?.target?.value ?? e),
                    }))
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <LabelInput
                id="edit-date"
                label={t('free_time_field_date', language)}
                type="date"
                value={editLogForm.date}
                onChange={(e) =>
                  setEditLogForm((prev) => ({
                    ...prev,
                    date: e?.target?.value ?? String(e),
                  }))
                }
                width="100%"
                height={40}
                corner={12}
              />

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
                  {t('free_time_billable', language)}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setLogToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('common_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('common_save', language)}
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
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('free_time_delete_modal_title', language)}
                </h3>
                <p className="text-xs text-neutral-500">{logToDelete.date} · {formatDuration(logToDelete.durationSeconds)}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {t('free_time_delete_modal_confirm', language)} "{logToDelete.taskDescription}" ({logToDelete.projectTitle})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('common_cancel', language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTimeLog(logToDelete.id);
                  setLogToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {t('common_delete', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
