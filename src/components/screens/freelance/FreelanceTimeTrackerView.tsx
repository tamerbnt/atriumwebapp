import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  FileText,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatDuration, formatCurrencyAmount } from '../../../utils/rules';
import { TimeLogEntry } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
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
  InspectorBigStat,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const FreelanceTimeTrackerView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

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
    branches,
    currentBranch,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();

  const [selectedClientId, setSelectedClientId] = useState(freelanceClients[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState(freelanceProjects[0]?.id || '');
  const [taskDescription, setTaskDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [isPomodoro, setIsPomodoro] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedLog, setSelectedLog] = useState<TimeLogEntry | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('session');

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

  const [logToEdit, setLogToEdit] = useState<TimeLogEntry | null>(null);
  const [editLogForm, setEditLogForm] = useState({
    taskDescription: '',
    hours: 0,
    minutes: 0,
    date: '',
    isBillable: true,
  });
  const [logToDelete, setLogToDelete] = useState<TimeLogEntry | null>(null);

  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedLogIds, setPinnedLogIds] = useState<Set<string>>(() => new Set<string>());
  const [timeLogSortBy, setTimeLogSortBy] = useState<string>('date');
  const [timeLogSortDir, setTimeLogSortDir] = useState<'asc' | 'desc'>('desc');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    timeLogs.forEach((entry) => {
      const bName = resolveRecordBranch(entry, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [timeLogs, branchesById, currentBranch, language]);

  const availableProjects = useMemo(() => {
    return freelanceProjects.filter((p) => p.clientId === selectedClientId);
  }, [freelanceProjects, selectedClientId]);

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

  const handleOpenManualModal = useCallback(() => {
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
  }, [freelanceClients, freelanceProjects]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return timeLogs.filter((entry) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(entry, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (clientFilter !== 'all' && entry.clientId !== clientFilter) return false;
      if (statusFilter === 'invoiced' && !entry.isInvoiced) return false;
      if (statusFilter === 'unbilled' && (entry.isInvoiced || !entry.isBillable)) return false;
      if (statusFilter === 'non_billable' && (entry.isInvoiced || entry.isBillable)) return false;
      if (q) {
        const matches =
          entry.taskDescription.toLowerCase().includes(q) ||
          entry.clientName.toLowerCase().includes(q) ||
          (entry.projectTitle && entry.projectTitle.toLowerCase().includes(q)) ||
          (entry.deliverableTitle && entry.deliverableTitle.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [
    timeLogs,
    branchFilter,
    clientFilter,
    statusFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const aPinned = pinnedLogIds.has(a.id);
      const bPinned = pinnedLogIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (timeLogSortBy === 'client') {
        const cmp = a.clientName.localeCompare(b.clientName);
        return timeLogSortDir === 'asc' ? cmp : -cmp;
      }
      if (timeLogSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return timeLogSortDir === 'asc' ? cmp : -cmp;
      }
      if (timeLogSortBy === 'duration') {
        return timeLogSortDir === 'asc'
          ? a.durationSeconds - b.durationSeconds
          : b.durationSeconds - a.durationSeconds;
      }
      if (timeLogSortBy === 'rate') {
        return timeLogSortDir === 'asc'
          ? a.rateAtMoment - b.rateAtMoment
          : b.rateAtMoment - a.rateAtMoment;
      }
      if (timeLogSortBy === 'status') {
        const getStatusKey = (l: TimeLogEntry) =>
          l.isInvoiced ? 'invoiced' : l.isBillable ? 'unbilled' : 'non_billable';
        const cmp = getStatusKey(a).localeCompare(getStatusKey(b));
        return timeLogSortDir === 'asc' ? cmp : -cmp;
      }
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return timeLogSortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [
    filteredLogs,
    pinnedLogIds,
    timeLogSortBy,
    timeLogSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const activeLog = useMemo(() => {
    if (!selectedLog) return null;
    return timeLogs.find((l) => l.id === selectedLog.id) || selectedLog;
  }, [selectedLog, timeLogs]);

  const handleBatchDeleteLogs = () => {
    const targetIds = Array.from(selectedLogIds);
    let count = 0;
    targetIds.forEach((id) => {
      const log = timeLogs.find((l) => l.id === id);
      if (log && !log.isInvoiced) {
        deleteTimeLog(id);
        if (selectedLog?.id === id) setSelectedLog(null);
        count++;
      }
    });
    setSelectedLogIds(new Set());
    showToast({
      type: 'warning',
      title: isAr ? 'حذف الجلسات' : isFr ? 'Sessions supprimées' : 'Sessions Removed',
      message: `${count} ${
        isAr
          ? 'جلسة تم حذفها من السجل'
          : isFr
          ? 'sessions supprimées du journal'
          : 'time logs removed'
      }.`,
    });
  };

  const handleBatchBillSelected = () => {
    const unbilledSelected = timeLogs.filter(
      (l) => selectedLogIds.has(l.id) && l.isBillable && !l.isInvoiced
    );
    if (unbilledSelected.length === 0) return;
    Array.from(new Set(unbilledSelected.map((l) => l.clientId))).forEach((cId) =>
      billUnbilledHours(cId, 0)
    );
    setSelectedLogIds(new Set());
    showToast({
      type: 'success',
      title: isAr ? 'تم إنشاء الفواتير' : isFr ? 'Factures générées' : 'Invoices Created',
      message: `${unbilledSelected.length} ${
        isAr
          ? 'جلسة تم فوترتها بنجاح'
          : isFr
          ? 'heures facturées avec succès'
          : 'sessions billed to client invoices'
      }.`,
      category: 'freelance_solo',
      action: {
        label: t('toast_invoice_preview_btn', language),
        onClick: () => setScreen('shop'),
      },
    });
  };

  const handleExportCSV = useCallback(() => {
    if (sortedLogs.length === 0) return;
    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'العميل' : 'Client',
      isAr ? 'المشروع' : isFr ? 'Projet' : 'Project',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'المهمة' : isFr ? 'Tâche' : 'Task',
      isAr ? 'المدة' : isFr ? 'Durée' : 'Duration',
      isAr ? 'الثواني' : isFr ? 'Secondes' : 'Seconds',
      isAr ? 'سعر الساعة' : isFr ? 'Taux horaire' : 'Rate',
      isAr ? 'العملة' : isFr ? 'Devise' : 'Currency',
      isAr ? 'قابل للفوترة' : isFr ? 'Facturable' : 'Billable',
      isAr ? 'الحالة' : isFr ? 'Statut' : 'Status',
    ];
    const rows = sortedLogs.map((l) => [
      l.date,
      l.clientName,
      l.projectTitle || '',
      resolveRecordBranch(l, branchesById, currentBranch, language).name,
      l.taskDescription,
      formatDuration(l.durationSeconds),
      l.durationSeconds,
      l.rateAtMoment,
      l.currency,
      l.isBillable ? 'Yes' : 'No',
      l.isInvoiced ? 'Invoiced' : l.isBillable ? 'Unbilled' : 'Non-billable',
    ]);
    downloadCsvSafe(
      `atrium-timesheet-${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [sortedLogs, branchesById, currentBranch, language, isAr, isFr]);

  const totalSecondsAll = timeLogs.reduce((sum, l) => sum + l.durationSeconds, 0);
  const billableSeconds = timeLogs
    .filter((l) => l.isBillable)
    .reduce((sum, l) => sum + l.durationSeconds, 0);
  const unbilledLogs = timeLogs.filter((l) => l.isBillable && !l.isInvoiced);
  const unbilledHours = Number(
    (unbilledLogs.reduce((sum, l) => sum + l.durationSeconds, 0) / 3600).toFixed(1)
  );
  const billableRatio =
    totalSecondsAll > 0 ? Math.round((billableSeconds / totalSecondsAll) * 100) : 100;

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
      taskDescription || (isAr ? 'مهمة عمل' : isFr ? 'Session de travail' : 'Sprint Task'),
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
      clientName: client?.name || (isAr ? 'العميل' : 'Client'),
      projectId: manualForm.projectId,
      projectTitle: project?.title || (isAr ? 'المشروع' : isFr ? 'Projet' : 'Project'),
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
      message: `${manualForm.hours}h ${manualForm.minutes}m ${t('toast_time_logged_msg', language)} "${
        project?.title || t('nav_scheduler', language)
      }".`,
      category: 'freelance_solo',
      action: {
        label: t('nav_shop', language),
        onClick: () => setScreen('shop'),
      },
    });
  };

  const handleBillClientUnbilled = useCallback(
    (clientId: string) => {
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
        showToast({
          type: 'error',
          title: isAr ? 'تعذر الفوترة' : isFr ? 'Erreur' : 'Billing failed',
          message: String(err?.message || err),
        });
      }
    },
    [billUnbilledHours, setScreen, t, language, isAr, isFr]
  );

  const openEditFromEntry = useCallback((entry: TimeLogEntry) => {
    setLogToEdit(entry);
    const totalMin = Math.round(entry.durationSeconds / 60);
    setEditLogForm({
      taskDescription: entry.taskDescription,
      hours: Math.floor(totalMin / 60),
      minutes: totalMin % 60,
      date: entry.date,
      isBillable: entry.isBillable,
    });
  }, []);

  const getTimeLogRowMeta = useCallback(
    (entry: TimeLogEntry): KineticRowMeta => {
      const val = Math.round((entry.durationSeconds / 3600) * entry.rateAtMoment);
      return {
        avatarText: entry.clientName.slice(0, 2).toUpperCase(),
        subline: `${entry.clientName} · ${entry.projectTitle}`,
        categoryLabel: entry.currency,
        statusVariant: entry.isInvoiced ? 'active' : entry.isBillable ? 'warning' : 'info',
        statusLabel: entry.isInvoiced
          ? t('free_kanban_invoiced', language)
          : entry.isBillable
          ? t('free_time_unbilled_badge', language)
          : t('free_time_non_billable', language),
        metricPrimary: formatDuration(entry.durationSeconds),
        metricSecondary: formatCurrencyAmount(val, entry.currency),
      };
    },
    [language, t]
  );

  const getTimeLogFanActions = useCallback(
    (entry: TimeLogEntry): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isFr ? 'Détails' : 'Details',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedLog(entry);
          setInspectorTab('session');
        },
      },
      ...(!entry.isInvoiced
        ? [
            {
              id: 'edit',
              label: t('free_time_edit_log_tt', language),
              icon: <Edit2 className="w-[15px] h-[15px]" />,
              onClick: () => openEditFromEntry(entry),
            },
            {
              id: 'del',
              label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
              icon: <Trash2 className="w-[15px] h-[15px]" />,
              isDanger: true,
              onClick: () => setLogToDelete(entry),
            },
          ]
        : []),
    ],
    [isAr, isFr, language, t, openEditFromEntry]
  );

  const getTimeLogDetailActions = useCallback(
    (entry: TimeLogEntry): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isFr ? 'Ouvrir' : 'Open',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedLog(entry);
          setInspectorTab('session');
        },
      },
      ...(!entry.isInvoiced
        ? [
            {
              id: 'edit',
              label: t('free_time_edit_log_tt', language),
              icon: <Edit2 className="w-3.5 h-3.5" />,
              onClick: () => openEditFromEntry(entry),
            },
          ]
        : []),
      ...(entry.isBillable && !entry.isInvoiced
        ? [
            {
              id: 'bill',
              label: t('free_clients_quick_bill', language),
              icon: <FileText className="w-3.5 h-3.5" />,
              onClick: () => handleBillClientUnbilled(entry.clientId),
            },
          ]
        : []),
      ...(!entry.isInvoiced
        ? [
            {
              id: 'del',
              label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
              icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
              onClick: () => setLogToDelete(entry),
            },
          ]
        : []),
    ],
    [isAr, isFr, language, t, openEditFromEntry, handleBillClientUnbilled]
  );

  const timeLogColumns: ColumnDefinition<TimeLogEntry>[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('common_date', language),
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (entry) => (
          <span className="text-xs text-black/65 dark:text-white/65 tabular-nums">
            {entry.date}
          </span>
        ),
      },
      {
        key: 'client',
        header: `${t('free_invoice_client', language)} & ${t('free_time_project_label', language)}`,
        width: '2.2*',
        minWidth: '180px',
        sortable: true,
        renderCell: (entry) => (
          <div className="min-w-0">
            <span className="font-bold text-sm text-black dark:text-white block truncate">
              {entry.clientName}
            </span>
            <span className="text-[11px] text-black/55 dark:text-white/55 truncate block">
              {entry.projectTitle}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.2*',
        minWidth: '120px',
        sortable: true,
        renderCell: (entry) => {
          const bInfo = resolveRecordBranch(entry, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'task',
        header: t('free_time_field_notes', language),
        width: '2.2*',
        minWidth: '170px',
        renderCell: (entry) => (
          <div className="min-w-0 max-w-xs">
            <span className="text-xs font-medium text-black dark:text-white truncate block">
              {entry.taskDescription}
            </span>
            {entry.deliverableTitle && (
              <span className="text-[10px] text-[#d4522f] truncate block mt-0.5">
                {t('free_time_milestone_prefix', language)}: {entry.deliverableTitle}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'duration',
        header: t('free_time_duration', language),
        width: '1.2*',
        minWidth: '100px',
        sortable: true,
        renderCell: (entry) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
            {formatDuration(entry.durationSeconds)}
          </span>
        ),
      },
      {
        key: 'rate',
        header: t('free_time_rate', language),
        width: '1.2*',
        minWidth: '105px',
        sortable: true,
        renderCell: (entry) => (
          <span className="font-mono text-xs text-black/70 dark:text-white/75 tabular-nums">
            {formatCurrencyAmount(entry.rateAtMoment, entry.currency)}/h
          </span>
        ),
      },
      {
        key: 'status',
        header: t('common_status', language),
        width: '1.3*',
        minWidth: '115px',
        sortable: true,
        renderCell: (entry) => {
          if (entry.isInvoiced) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('free_kanban_invoiced', language)}
              </span>
            );
          }
          if (entry.isBillable) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t('free_time_unbilled_badge', language)}
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-black/55 dark:text-white/55">
              {t('free_time_non_billable', language)}
            </span>
          );
        },
      },
    ],
    [language, t, branchesById, currentBranch, isAr, isFr]
  );

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('common_all', language) },
      { value: 'unbilled', label: t('free_time_unbilled_badge', language) },
      { value: 'invoiced', label: t('free_kanban_invoiced', language) },
      { value: 'non_billable', label: t('free_time_non_billable', language) },
    ],
    [t, language]
  );

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      {
        value: 'All',
        label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
        count: timeLogs.length,
      },
      ...Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    ];

    const clientOpts = [
      {
        value: 'all',
        label: t('free_clients_all_statuses', language) || (isFr ? 'Tous les clients' : 'All Clients'),
        count: timeLogs.length,
      },
      ...freelanceClients.map((c) => ({
        value: c.id,
        label: c.name,
        sublabel: c.company,
        count: timeLogs.filter((l) => l.clientId === c.id).length,
      })),
    ];

    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الموقع' : isFr ? 'Branche' : 'Branch',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'client',
        label: t('free_invoice_client', language),
        value: clientFilter,
        onChange: setClientFilter,
        resetValue: 'all',
        kind: 'tiles',
        columns: 2,
        options: clientOpts,
      },
      {
        id: 'status',
        label: t('common_status', language),
        value: statusFilter,
        onChange: setStatusFilter,
        resetValue: 'all',
        kind: 'segmented',
        options: statusOptions.map((o) => ({ value: o.value, label: String(o.label) })),
      },
    ];
  }, [
    isAr,
    isFr,
    timeLogs,
    branchCounts,
    branchFilter,
    freelanceClients,
    clientFilter,
    statusFilter,
    statusOptions,
    t,
    language,
  ]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (clientFilter !== 'all') {
      const cl = freelanceClients.find((c) => c.id === clientFilter);
      chips.push({
        key: 'client',
        label: cl ? cl.name : clientFilter,
        onRemove: () => setClientFilter('all'),
      });
    }
    if (statusFilter !== 'all') {
      const m = statusOptions.find((o) => o.value === statusFilter);
      chips.push({
        key: 'status',
        label: String(m?.label || statusFilter),
        onRemove: () => setStatusFilter('all'),
      });
    }
    return chips;
  }, [branchFilter, clientFilter, statusFilter, freelanceClients, statusOptions, isAr, isFr]);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (clientFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: timeLogs.length > 0,
  });

  if (showSkeleton && (timeLogs.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Clock size={22} />}
        title={t('free_time_title', language)}
        primaryAction={{
          label: t('free_time_btn_manual', language),
          onClick: handleOpenManualModal,
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-manual-time',
        }}
      />

      {/* Live Focus Timer Hero Widget */}
      <ScreenPod>
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 dark:bg-black text-white border border-neutral-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4522f]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold tracking-wider text-white/75 uppercase">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTimer.isRunning && !activeTimer.isPaused
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
              <span>
                {activeTimer.isRunning
                  ? activeTimer.isPaused
                    ? t('free_time_timer_paused_status', language)
                    : t('free_time_live_session_status', language)
                  : t('free_time_ready_status', language)}
              </span>
              {activeTimer.isPomodoro && (
                <span className="text-amber-400">
                  · Pomodoro{' '}
                  {activeTimer.pomodoroMode === 'work'
                    ? t('free_time_pomodoro_sprint', language)
                    : t('free_time_pomodoro_rest', language)}
                </span>
              )}
            </div>
            <div className="text-5xl sm:text-7xl font-mono font-black tracking-tight text-white tabular-nums drop-shadow-sm">
              {formatDuration(activeTimer.elapsedSeconds)}
            </div>
            {activeTimer.isRunning && (
              <div className="text-xs text-white/80 font-medium">
                {t('free_time_working_on_label', language)}{' '}
                <strong className="text-white">{activeTimer.clientName}</strong> ·{' '}
                <span className="text-white/75">{activeTimer.taskDescription}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!activeTimer.isRunning ? (
              <button
                type="button"
                onClick={handleStartFocusTimer}
                className="h-14 px-8 rounded-2xl bg-[#d4522f] text-white text-sm font-bold flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer shadow-lg hover:shadow-[#d4522f]/20"
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
                  className="h-12 w-12 rounded-2xl bg-neutral-800 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={t('free_time_discard_tt', language)}
                  aria-label={t('free_time_discard_tt', language)}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {!activeTimer.isRunning && (
          <div className="mt-8 pt-6 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <LabelSelect
              field="Client"
              label={t('free_invoice_client', language)}
              value={selectedClientId}
              onChange={(val) => {
                const cId = extractStr(val);
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
              onChange={(val) => setSelectedProjectId(extractStr(val))}
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
              onChange={(v) => setTaskDescription(extractStr(v))}
              width="100%"
              height={46}
              corner={14}
            />
            <div className="flex items-center justify-between sm:justify-end gap-4 pt-4 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  className="rounded text-[#d4522f] focus:ring-0"
                />
                <span>{t('free_time_billable', language)}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
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
      </ScreenPod>

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات تتبع الوقت والإنتاجية'
            : isFr
            ? 'Indicateurs de Temps & Productivité'
            : 'Time Tracking & Productivity Metrics'
        }
        language={language}
        primaryCard={{
          label: t('free_time_billable_ratio', language),
          badgeText: `${(billableSeconds / 3600).toFixed(1)}h ${
            isAr ? 'قابلة للفوترة' : isFr ? 'facturables' : 'billable'
          }`,
          count: billableRatio,
          formatValue: (n) => `${n}%`,
          tone: 'emerald',
          isActive: statusFilter === 'invoiced',
          onToggle: () =>
            setStatusFilter((prev) => (prev === 'invoiced' ? 'all' : 'invoiced')),
        }}
        secondaryCard={{
          label: t('free_time_total_hours_logged', language),
          badgeText: t('free_time_tracked_sessions_unit', language),
          count: Math.round((totalSecondsAll / 3600) * 10) / 10,
          formatValue: (n) => `${n}h`,
          tone: 'terracotta',
          isActive: statusFilter === 'unbilled',
          onToggle: () =>
            setStatusFilter((prev) => (prev === 'unbilled' ? 'all' : 'unbilled')),
        }}
        darkCard={{
          label: t('free_time_unbilled_total', language),
          badgeCount: unbilledLogs.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'جلسات' : 'logs',
          valueCount: unbilledHours,
          valuePrefix: '',
          valueSuffix: 'h',
          caption: t('free_time_awaiting_invoice', language),
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('free_time_recent_logs', language)}
          liveRegionText={`${sortedLogs.length} ${t('free_time_tracked_sessions_unit', language)}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('free_time_ph_search_logs', language)}
          statusOptions={statusOptions}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          extraTrailingControls={
            unbilledLogs.length > 0 ? (
              <button
                type="button"
                onClick={() => handleBillClientUnbilled(unbilledLogs[0].clientId)}
                className="h-10 px-3.5 rounded-xl bg-[#d4522f] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs shrink-0"
              >
                <FileText size={13} />
                <span>
                  {t('free_clients_quick_bill', language)} ({unbilledHours}h)
                </span>
              </button>
            ) : undefined
          }
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setClientFilter('all');
            setStatusFilter('all');
            setSearchQuery('');
          }}
        />

        {selectedLogIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-neutral-900 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-[#d4522f] text-white font-bold text-[11px]">
                {selectedLogIds.size}
              </span>
              <span>
                {isAr
                  ? 'جلسة محددة'
                  : isFr
                  ? 'sessions sélectionnées'
                  : 'sessions selected'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLogIds(new Set())}
                className="text-white/75 hover:text-white underline text-xs cursor-pointer ml-1"
              >
                {isAr ? 'إلغاء التحديد' : isFr ? 'Désélectionner' : 'Deselect all'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchBillSelected}
                className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <FileText size={13} />
                <span>
                  {isAr ? 'فوترة المحدد' : isFr ? 'Facturer la sélection' : 'Batch Bill'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleBatchDeleteLogs}
                className="h-8 px-3 rounded-full bg-rose-600/80 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{isAr ? 'حذف' : isFr ? 'Supprimer' : 'Batch Delete'}</span>
              </button>
            </div>
          </div>
        )}

        <UniversalDataCollection<TimeLogEntry>
          hideToolbar
          items={sortedLogs}
          keyExtractor={(entry) => entry.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={timeLogColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          selectedIds={selectedLogIds}
          onSelectionChange={setSelectedLogIds}
          pinnedIds={pinnedLogIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedLogIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          sortBy={timeLogSortBy}
          sortDirection={timeLogSortDir}
          onSortChange={(colKey, dir) => {
            setTimeLogSortBy(colKey);
            setTimeLogSortDir(dir);
          }}
          openItemId={activeLog?.id ?? null}
          onItemClick={(entry, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedLog(entry);
            setInspectorTab('session');
          }}
          onViewDetails={(entry, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedLog(entry);
            setInspectorTab('session');
          }}
          getRowMeta={getTimeLogRowMeta}
          getFanActions={getTimeLogFanActions}
          getDetailActions={getTimeLogDetailActions}
          onEdit={(entry) => {
            if (!entry.isInvoiced) openEditFromEntry(entry);
          }}
          onDelete={(entry) => {
            if (!entry.isInvoiced) setLogToDelete(entry);
          }}
          emptyTitle={t('free_time_empty_logs', language)}
          emptyDescription={t('free_time_empty_logs_desc', language)}
          primaryActionLabel={t('free_time_btn_manual', language)}
          onAddFirstItem={handleOpenManualModal}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedLogs.length}
        entityPluralLabel={t('free_time_tracked_sessions_unit', language)}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setClientFilter('all');
          setStatusFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<TimeLogEntry>
        isOpen={Boolean(activeLog)}
        item={activeLog}
        allItems={sortedLogs}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeLog?.taskDescription || ''}
        subtitle={activeLog ? `${activeLog.clientName} · ${activeLog.projectTitle}` : ''}
        categoryLabel={activeLog?.currency || 'EUR'}
        avatarText={activeLog ? activeLog.clientName.slice(0, 2).toUpperCase() : 'TL'}
        avatarColor="#d4522f"
        branchName={
          activeLog
            ? resolveRecordBranch(activeLog, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeLog
            ? activeLog.isInvoiced
              ? t('free_kanban_invoiced', language)
              : activeLog.isBillable
              ? t('free_time_unbilled_badge', language)
              : t('free_time_non_billable', language)
            : undefined
        }
        statusClassName={
          activeLog?.isInvoiced
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : activeLog?.isBillable
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
        }
        tabs={[
          { id: 'session', label: isAr ? 'الجلسة' : isFr ? 'Session' : 'Session' },
          { id: 'billing', label: isAr ? 'الفوترة' : isFr ? 'Facturation' : 'Billing' },
          { id: 'actions', label: isAr ? 'إجراءات' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(l) => {
          setSelectedLog(l);
          setInspectorTab('session');
        }}
        onClose={() => setSelectedLog(null)}
        onDelete={(l) => {
          if (!l.isInvoiced) setLogToDelete(l);
        }}
        holdToDelete={false}
        renderBody={(entry, tab) => {
          const val = Math.round((entry.durationSeconds / 3600) * entry.rateAtMoment);
          if (tab === 'billing') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatCurrencyAmount(val, entry.currency)}
                    tone={entry.isInvoiced ? 'ok' : entry.isBillable ? 'accent' : 'default'}
                    caption={`${formatCurrencyAmount(entry.rateAtMoment, entry.currency)}/h · ${formatDuration(entry.durationSeconds)}`}
                    action={
                      entry.isBillable && !entry.isInvoiced
                        ? {
                            label: t('free_clients_quick_bill', language),
                            onClick: () => handleBillClientUnbilled(entry.clientId),
                          }
                        : undefined
                    }
                  />
                </InspectorSection>
                <InspectorSection
                  index={1}
                  title={isAr ? 'حالة الفوترة' : isFr ? 'Statut de Facturation' : 'Billing Breakdown'}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={t('free_time_billable', language)}
                      value={entry.isBillable ? (isAr ? 'نعم' : isFr ? 'Oui' : 'Yes') : isAr ? 'لا' : 'No'}
                      tone={entry.isBillable ? 'ok' : 'warn'}
                    />
                    <InspectorKeyValue
                      label={t('common_status', language)}
                      value={
                        entry.isInvoiced
                          ? t('free_kanban_invoiced', language)
                          : entry.isBillable
                          ? t('free_time_unbilled_badge', language)
                          : t('free_time_non_billable', language)
                      }
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }
          if (tab === 'actions') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isFr ? 'Actions Rapides' : 'Quick Actions'}>
                  <InspectorQuickActions
                    actions={[
                      ...(!entry.isInvoiced
                        ? [
                            {
                              id: 'edit',
                              label: t('free_time_edit_log_tt', language),
                              icon: <Edit2 size={16} />,
                              primary: true,
                              onClick: () => openEditFromEntry(entry),
                            },
                          ]
                        : []),
                      ...(entry.isBillable && !entry.isInvoiced
                        ? [
                            {
                              id: 'bill',
                              label: t('free_clients_quick_bill', language),
                              icon: <FileText size={16} />,
                              onClick: () => handleBillClientUnbilled(entry.clientId),
                            },
                          ]
                        : []),
                    ]}
                  />
                </InspectorSection>
                {!entry.isInvoiced && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={t('common_delete', language)}
                      icon={<Trash2 size={14} />}
                      tone="neutral"
                      onClick={() => setLogToDelete(entry)}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }
          return (
            <>
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatDuration(entry.durationSeconds)}
                  tone="accent"
                  caption={`${entry.date} · ${formatCurrencyAmount(val, entry.currency)}`}
                />
              </InspectorSection>
              <InspectorSection
                index={1}
                title={isAr ? 'تفاصيل الجلسة' : isFr ? 'Détails de la Session' : 'Session Metadata'}
              >
                <InspectorCard>
                  <InspectorKeyValue label={t('free_invoice_client', language)} value={entry.clientName} />
                  <InspectorKeyValue label={t('free_time_project_label', language)} value={entry.projectTitle} />
                  <InspectorKeyValue label={t('common_date', language)} value={entry.date} mono isLast={!entry.deliverableTitle} />
                  {entry.deliverableTitle && (
                    <InspectorKeyValue
                      label={t('free_time_milestone_prefix', language)}
                      value={entry.deliverableTitle}
                      tone="accent"
                      isLast
                    />
                  )}
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {/* Manual Time Log Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-black dark:text-white">
                {t('free_time_modal_manual_title', language)}
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
                aria-label="Close"
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
                onChange={(val) => handleManualClientChange(extractStr(val))}
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
                  setManualForm((prev) => ({ ...prev, projectId: extractStr(val) }))
                }
                options={availableManualProjects.map((p) => ({
                  value: p.id,
                  label: p.title,
                  sublabel: `${
                    p.pricingModel === 'Fixed'
                      ? t('free_deliv_pricing_fixed', language)
                      : p.pricingModel === 'Hourly'
                      ? t('free_deliv_pricing_hourly', language)
                      : t('free_deliv_pricing_retainer', language)
                  } · ${p.clientName}`,
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
                  setManualForm((prev) => ({ ...prev, taskDescription: extractStr(e) }))
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
                  min={0}
                  value={String(manualForm.hours)}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, hours: Number(extractStr(e)) || 0 }))
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="manual-minutes"
                  label={t('free_time_field_minutes', language)}
                  type="number"
                  min={0}
                  max={59}
                  value={String(manualForm.minutes)}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, minutes: Number(extractStr(e)) || 0 }))
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
                onChange={(e) => setManualForm((prev) => ({ ...prev, date: extractStr(e) }))}
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
                  className="rounded text-[#d4522f]"
                />
                <label
                  htmlFor="billableManual"
                  className="font-medium text-black/70 dark:text-white/75"
                >
                  {t('free_time_billable', language)}
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  {t('common_cancel', language)}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" glow type="submit">
                  {t('common_save', language)}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {logToEdit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  {t('free_time_edit_modal_title', language)}
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55">
                  {logToEdit.clientName} · {logToEdit.projectTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLogToEdit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
                aria-label="Close"
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
                  setEditLogForm((prev) => ({ ...prev, taskDescription: extractStr(e) }))
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
                  min={0}
                  value={String(editLogForm.hours)}
                  onChange={(e) =>
                    setEditLogForm((prev) => ({ ...prev, hours: Number(extractStr(e)) || 0 }))
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="edit-minutes"
                  label={t('free_time_field_minutes', language)}
                  type="number"
                  min={0}
                  max={59}
                  value={String(editLogForm.minutes)}
                  onChange={(e) =>
                    setEditLogForm((prev) => ({ ...prev, minutes: Number(extractStr(e)) || 0 }))
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
                onChange={(e) => setEditLogForm((prev) => ({ ...prev, date: extractStr(e) }))}
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
                  className="rounded text-[#d4522f]"
                />
                <label
                  htmlFor="billableEdit"
                  className="font-medium text-black/70 dark:text-white/75 cursor-pointer"
                >
                  {t('free_time_billable', language)}
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="outline" size="sm" type="button" onClick={() => setLogToEdit(null)}>
                  {t('common_cancel', language)}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" glow type="submit">
                  {t('common_save', language)}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Log Modal */}
      {logToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  {t('free_time_delete_modal_title', language)}
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55">
                  {logToDelete.date} · {formatDuration(logToDelete.durationSeconds)}
                </p>
              </div>
            </div>
            <p className="text-xs text-black/70 dark:text-white/75 leading-relaxed">
              {t('free_time_delete_modal_confirm', language)} "{logToDelete.taskDescription}" (
              {logToDelete.projectTitle})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <AtriumButton variant="outline" size="sm" type="button" onClick={() => setLogToDelete(null)}>
                {t('common_cancel', language)}
              </AtriumButton>
              <AtriumButton
                variant="danger"
                size="sm"
                type="button"
                onClick={() => {
                  deleteTimeLog(logToDelete.id);
                  if (selectedLog?.id === logToDelete.id) setSelectedLog(null);
                  setLogToDelete(null);
                }}
              >
                {t('common_delete', language)}
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
