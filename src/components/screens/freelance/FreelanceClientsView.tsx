import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Play,
  FileText,
  Briefcase,
  Mail,
  Phone,
  Globe,
  Edit2,
  CheckCircle,
  Trash2,
  AlertTriangle,
  X,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatCurrencyAmount, formatDuration } from '../../../utils/rules';
import { FreelanceClient, FreelanceClientStatus, CurrencyCode } from '../../../types/index';
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
  InspectorListItem,
  InspectorNotesField,
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

export const FreelanceClientsView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    freelanceClients,
    freelanceProjects,
    timeLogs,
    freelanceInvoices,
    addFreelanceClient,
    updateFreelanceClient,
    deleteFreelanceClient,
    startTimer,
    billUnbilledHours,
    branches,
    currentBranch,
    setScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedClient, setSelectedClient] = useState<FreelanceClient | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('profile');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<FreelanceClient | null>(null);
  const [clientToDelete, setClientToDelete] = useState<FreelanceClient | null>(null);
  const [deleteCascade, setDeleteCascade] = useState(false);

  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedClientIds, setPinnedClientIds] = useState<Set<string>>(() => new Set<string>());
  const [clientSortBy, setClientSortBy] = useState<string>('client');
  const [clientSortDir, setClientSortDir] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    country: 'Algeria',
    currency: 'DZD' as CurrencyCode,
    hourlyRate: 3500,
    status: 'ProjectBased' as FreelanceClientStatus,
    monthlyRetainerHours: 0,
    monthlyRetainerAmount: 0,
    notes: '',
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    freelanceClients.forEach((c) => {
      const bName = resolveRecordBranch(c, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [freelanceClients, branchesById, currentBranch, language]);

  const filteredClients = useMemo(() => {
    return freelanceClients.filter((client) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(client, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          client.name.toLowerCase().includes(q) ||
          (client.company && client.company.toLowerCase().includes(q)) ||
          client.email.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (selectedStatus !== 'all') {
        if (client.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }
      return true;
    });
  }, [freelanceClients, branchFilter, searchQuery, selectedStatus, branchesById, currentBranch, language]);

  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      const aPinned = pinnedClientIds.has(a.id);
      const bPinned = pinnedClientIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (clientSortBy === 'client') {
        const cmp = a.name.localeCompare(b.name);
        return clientSortDir === 'asc' ? cmp : -cmp;
      }
      if (clientSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return clientSortDir === 'asc' ? cmp : -cmp;
      }
      if (clientSortBy === 'rate') {
        return clientSortDir === 'asc' ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate;
      }
      return 0;
    });
  }, [filteredClients, pinnedClientIds, clientSortBy, clientSortDir, branchesById, currentBranch, language]);

  const activeClient = useMemo(() => {
    if (!selectedClient) return null;
    return freelanceClients.find((c) => c.id === selectedClient.id) || selectedClient;
  }, [selectedClient, freelanceClients]);

  const totalClientsCount = freelanceClients.length;
  const activeRetainersCount = freelanceClients.filter((c) => c.status === 'ActiveRetainer').length;
  const projectBasedCount = freelanceClients.filter((c) => c.status === 'ProjectBased').length;
  const totalBilledEquiv = freelanceInvoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const getClientUnbilledTime = useCallback(
    (clientId: string) => {
      const unbilledLogs = timeLogs.filter(
        (log) => log.clientId === clientId && log.isBillable && !log.isInvoiced
      );
      const totalSeconds = unbilledLogs.reduce((acc, log) => acc + log.durationSeconds, 0);
      const unbilledAmount = unbilledLogs.reduce(
        (acc, log) => acc + (log.durationSeconds / 3600) * log.rateAtMoment,
        0
      );
      return {
        hours: Number((totalSeconds / 3600).toFixed(1)),
        seconds: totalSeconds,
        amount: Math.round(unbilledAmount),
        count: unbilledLogs.length,
      };
    },
    [timeLogs]
  );

  const handleOpenAddModal = useCallback(() => {
    setClientToEdit(null);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      country: 'Algeria',
      currency: 'DZD',
      hourlyRate: 3500,
      status: 'ProjectBased',
      monthlyRetainerHours: 0,
      monthlyRetainerAmount: 0,
      notes: '',
    });
    setIsAddModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((client: FreelanceClient) => {
    setClientToEdit(client);
    setFormData({
      name: client.name,
      company: client.company || '',
      email: client.email,
      phone: client.phone || '',
      country: client.country || 'Algeria',
      currency: client.currency,
      hourlyRate: client.hourlyRate,
      status: client.status,
      monthlyRetainerHours: client.monthlyRetainerHours || 0,
      monthlyRetainerAmount: client.monthlyRetainerAmount || 0,
      notes: client.notes || '',
    });
    setIsAddModalOpen(true);
  }, []);

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (clientToEdit) {
      updateFreelanceClient(clientToEdit.id, {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        currency: formData.currency,
        hourlyRate: Number(formData.hourlyRate),
        status: formData.status,
        monthlyRetainerHours: Number(formData.monthlyRetainerHours),
        monthlyRetainerAmount: Number(formData.monthlyRetainerAmount),
        notes: formData.notes,
      });
      if (selectedClient?.id === clientToEdit.id) {
        setSelectedClient({
          ...selectedClient,
          ...formData,
        });
      }
    } else {
      const created = addFreelanceClient({
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        currency: formData.currency,
        hourlyRate: Number(formData.hourlyRate),
        status: formData.status,
        monthlyRetainerHours: Number(formData.monthlyRetainerHours),
        monthlyRetainerAmount: Number(formData.monthlyRetainerAmount),
        notes: formData.notes,
      });
      setSelectedClient(created);
    }

    setIsAddModalOpen(false);
  };

  const handleQuickStartTimer = useCallback(
    (client: FreelanceClient) => {
      const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);
      const activeProject = clientProjects[0];
      startTimer(
        client.id,
        client.name,
        activeProject ? activeProject.id : 'proj_general',
        activeProject ? activeProject.title : t('free_inv_default_item_desc', language),
        `${t('free_time_working_on_label', language)} ${client.name}`,
        activeProject?.deliverables[0]?.id,
        activeProject?.deliverables[0]?.title,
        true,
        false
      );
      showToast({
        type: 'success',
        title: t('free_timer_start', language),
        message: client.name,
        category: 'freelance_solo',
      });
    },
    [freelanceProjects, startTimer, t, language]
  );

  const handleQuickBill = useCallback(
    (client: FreelanceClient) => {
      try {
        billUnbilledHours(client.id, 0, `Invoice for unbilled hours - ${client.name}`);
        setScreen('shop');
      } catch (err: any) {
        showToast({
          type: 'error',
          title: isAr ? 'تعذر الفوترة' : isFr ? 'Facturation impossible' : 'Billing failed',
          message: String(err?.message || err),
          category: 'freelance_solo',
        });
      }
    },
    [billUnbilledHours, setScreen, isAr, isFr]
  );

  const getClientRowMeta = useCallback(
    (client: FreelanceClient): KineticRowMeta => {
      const unbilled = getClientUnbilledTime(client.id);
      const clientProjectsCount = freelanceProjects.filter((p) => p.clientId === client.id).length;
      const branchInfo = resolveRecordBranch(client, branchesById, currentBranch, language);
      return {
        avatarText: client.name.slice(0, 2).toUpperCase(),
        subline: client.company || t('free_clients_private_client', language),
        categoryLabel: client.currency,
        statusVariant:
          client.status === 'ActiveRetainer'
            ? 'active'
            : client.status === 'ProjectBased'
            ? 'warning'
            : 'info',
        statusLabel:
          client.status === 'ActiveRetainer'
            ? t('free_clients_status_active_retainer', language)
            : client.status === 'ProjectBased'
            ? t('free_clients_status_project_based', language)
            : client.status,
        metricPrimary: `${formatCurrencyAmount(client.hourlyRate, client.currency)}${t('free_dash_per_hour', language)}`,
        metricSecondary:
          unbilled.amount > 0
            ? `${unbilled.hours}h ${isAr ? 'غير مفوترة' : isFr ? 'non fact.' : 'unbilled'}`
            : `${clientProjectsCount} ${t('free_nav_deliverables', language)}`,
        detailCol1: {
          heading: isAr ? 'التواصل والموقع' : isFr ? 'Contact & Pays' : 'Contact & Region',
          primaryText: client.email || client.phone || '—',
          secondaryText: client.country || (client.phone ? client.phone : '—'),
        },
        detailCol2: {
          heading: isAr ? 'التسعير والنشاط' : isFr ? 'Tarif & Activité' : 'Rate & Activity',
          primaryText: `${formatCurrencyAmount(client.hourlyRate, client.currency)}${t('free_dash_per_hour', language)}`,
          secondaryText:
            unbilled.amount > 0
              ? `${unbilled.hours}h · ${formatCurrencyAmount(unbilled.amount, client.currency)}`
              : `${clientProjectsCount} ${t('free_nav_deliverables', language)}`,
        },
        detailCol3: {
          heading: isAr ? 'الفرع والعقد' : isFr ? 'Branche & Contrat' : 'Branch & Terms',
          primaryText: branchInfo.name,
          secondaryText:
            client.status === 'ActiveRetainer' && client.monthlyRetainerHours
              ? `${client.monthlyRetainerHours}h / ${isAr ? 'شهر' : isFr ? 'mois' : 'mo'}`
              : client.currency,
        },
      };
    },
    [freelanceProjects, getClientUnbilledTime, branchesById, currentBranch, language, t, isAr, isFr]
  );

  const getClientFanActions = useCallback(
    (client: FreelanceClient): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isFr ? 'Détails' : 'Details',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedClient(client);
          setInspectorTab('profile');
        },
      },
      {
        id: 'timer',
        label: t('free_timer_start', language),
        icon: <Play className="w-[15px] h-[15px]" />,
        onClick: () => handleQuickStartTimer(client),
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => setClientToDelete(client),
      },
    ],
    [isAr, isFr, language, t, handleQuickStartTimer]
  );

  const getClientDetailActions = useCallback(
    (client: FreelanceClient): KineticDetailAction[] => {
      const unbilled = getClientUnbilledTime(client.id);
      return [
        {
          id: 'inspect',
          label: isAr ? 'فتح' : isFr ? 'Ouvrir' : 'Open',
          icon: <Eye className="w-3.5 h-3.5" />,
          onClick: () => {
            setSelectedClient(client);
            setInspectorTab('profile');
          },
        },
        {
          id: 'timer',
          label: t('free_timer_start', language),
          icon: <Play className="w-3.5 h-3.5" />,
          onClick: () => handleQuickStartTimer(client),
        },
        {
          id: 'edit',
          label: t('common_edit', language) || (isFr ? 'Modifier' : 'Edit'),
          icon: <Edit2 className="w-3.5 h-3.5" />,
          onClick: () => handleOpenEditModal(client),
        },
        ...(unbilled.count > 0
          ? [
              {
                id: 'bill',
                label: `${t('free_clients_quick_bill', language)} (${unbilled.hours}h)`,
                icon: <FileText className="w-3.5 h-3.5" />,
                onClick: () => handleQuickBill(client),
              },
            ]
          : []),
        {
          id: 'del',
          label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
          icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
          onClick: () => setClientToDelete(client),
        },
      ];
    },
    [getClientUnbilledTime, isAr, isFr, language, t, handleQuickStartTimer, handleOpenEditModal, handleQuickBill]
  );

  const clientColumns: ColumnDefinition<FreelanceClient>[] = useMemo(
    () => [
      {
        key: 'client',
        header: t('free_clients_table_client', language) || 'Client',
        width: '2.3*',
        minWidth: '210px',
        sortable: true,
        renderCell: (client) => (
          <div className="flex items-center gap-3">
            <div
              data-sq="tile"
              data-sq-border="solid"
              className="w-9 h-9 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-semibold t-small shrink-0 border border-neutral-200 dark:border-neutral-700"
            >
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-colors">
                {client.name}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 truncate">
                {client.company || t('free_clients_private_client', language)}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '125px',
        sortable: true,
        renderCell: (client) => {
          const bInfo = resolveRecordBranch(client, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: t('free_clients_table_status', language) || 'Status',
        width: '1.6*',
        minWidth: '130px',
        renderCell: (client) => (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold ${
              client.status === 'ActiveRetainer'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : client.status === 'ProjectBased'
                ? 'bg-[#FCEEE8] dark:bg-neutral-800 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] border border-[#F5E2D8] dark:border-neutral-700'
                : 'bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75'
            }`}
          >
            {client.status === 'ActiveRetainer'
              ? t('free_clients_status_active_retainer', language)
              : client.status === 'ProjectBased'
              ? t('free_clients_status_project_based', language)
              : client.status}
          </span>
        ),
      },
      {
        key: 'rate',
        header: t('free_clients_hourly_rate', language),
        width: '1.6*',
        minWidth: '140px',
        sortable: true,
        renderCell: (client) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white tabular-nums">
              {formatCurrencyAmount(client.hourlyRate, client.currency)}
              {t('free_dash_per_hour', language)}
            </span>
            {client.monthlyRetainerHours ? (
              <span className="block t-cap text-black/55 dark:text-white/55">
                {client.monthlyRetainerHours}h Retainer
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'projects',
        header: t('free_kpi_active_projects', language),
        width: '1.2*',
        minWidth: '100px',
        renderCell: (client) => {
          const count = freelanceProjects.filter((p) => p.clientId === client.id).length;
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full t-small font-medium bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75 tabular-nums">
              {count} {t('free_nav_deliverables', language)}
            </span>
          );
        },
      },
      {
        key: 'unbilled',
        header: t('free_kpi_unbilled_hours', language),
        width: '1.6*',
        minWidth: '130px',
        renderCell: (client) => {
          const unbilled = getClientUnbilledTime(client.id);
          return unbilled.amount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full t-small font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 tabular-nums">
              {unbilled.hours}h · {formatCurrencyAmount(unbilled.amount, client.currency)}
            </span>
          ) : (
            <span className="text-black/55 dark:text-white/55 t-cap">0h</span>
          );
        },
      },
    ],
    [freelanceProjects, getClientUnbilledTime, language, t, branchesById, currentBranch, isAr, isFr]
  );

  const handleExportCSV = useCallback(() => {
    if (sortedClients.length === 0) return;
    const headers = [
      isAr ? 'معرف العميل' : 'Client ID',
      isAr ? 'اسم العميل' : 'Client Name',
      isAr ? 'الشركة' : 'Company',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'البريد الإلكتروني' : 'Email',
      isAr ? 'الهاتف' : 'Phone',
      isAr ? 'البلد' : 'Country',
      isAr ? 'العملة' : 'Currency',
      isAr ? 'سعر الساعة' : 'Hourly Rate',
      isAr ? 'الحالة' : 'Status',
      isAr ? 'ساعات الحجز الشهري' : 'Retainer Hours',
      isAr ? 'مبلغ الحجز الشهري' : 'Retainer Amount',
      isAr ? 'المشاريع' : 'Projects Count',
      isAr ? 'الساعات غير المفوترة' : 'Unbilled Hours',
    ];

    const rows = sortedClients.map((client) => {
      const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);
      const unbilled = getClientUnbilledTime(client.id);
      const bName = resolveRecordBranch(client, branchesById, currentBranch, language).name;
      return [
        client.id,
        client.name,
        client.company || '',
        bName,
        client.email,
        client.phone || '',
        client.country || '',
        client.currency,
        client.hourlyRate,
        client.status,
        client.monthlyRetainerHours || 0,
        client.monthlyRetainerAmount || 0,
        clientProjects.length,
        unbilled.hours,
      ];
    });

    downloadCsvSafe(
      `atrium_freelance_clients_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [sortedClients, freelanceProjects, getClientUnbilledTime, branchesById, currentBranch, language, isAr, isFr]);

  const handleBatchSetRetainer = () => {
    if (selectedClientIds.size === 0) return;
    selectedClientIds.forEach((id) => {
      updateFreelanceClient(id, { status: 'ActiveRetainer' });
    });
    const count = selectedClientIds.size;
    setSelectedClientIds(new Set());
    showToast({
      type: 'success',
      title: isAr ? 'تم التحديث' : isFr ? 'Mis à jour' : 'Updated',
      message: `${count} ${isAr ? 'عملاء تم تحويلهم لعقد شهري' : 'clients updated to Active Retainer'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchSetProject = () => {
    if (selectedClientIds.size === 0) return;
    selectedClientIds.forEach((id) => {
      updateFreelanceClient(id, { status: 'ProjectBased' });
    });
    const count = selectedClientIds.size;
    setSelectedClientIds(new Set());
    showToast({
      type: 'info',
      title: isAr ? 'تم التحديث' : isFr ? 'Mis à jour' : 'Updated',
      message: `${count} ${isAr ? 'عملاء تم تحويلهم لنمط المشاريع' : 'clients updated to Project Based'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDelete = () => {
    if (selectedClientIds.size === 0) return;
    const count = selectedClientIds.size;
    selectedClientIds.forEach((id) => {
      deleteFreelanceClient(id, false);
      if (selectedClient?.id === id) setSelectedClient(null);
    });
    setSelectedClientIds(new Set());
    showToast({
      type: 'info',
      title: isAr ? 'تم الحذف' : isFr ? 'Suppression' : 'Deleted',
      message: `${count} ${isAr ? 'عملاء تم حذفهم' : 'clients deleted'}`,
      category: 'freelance_solo',
    });
  };

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('free_clients_all_statuses', language) },
      { value: 'activeretainer', label: t('free_clients_status_active_retainer', language) },
      { value: 'projectbased', label: t('free_clients_status_project_based', language) },
      { value: 'prospect', label: t('free_clients_status_prospect', language) },
    ],
    [t, language]
  );

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      { value: 'All', label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches', count: freelanceClients.length },
      ...Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
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
        id: 'status',
        label: t('free_clients_status', language),
        value: selectedStatus,
        onChange: setSelectedStatus,
        resetValue: 'all',
        kind: 'segmented',
        options: statusOptions.map((o) => ({ value: o.value, label: String(o.label) })),
      },
    ];
  }, [isAr, isFr, freelanceClients.length, branchCounts, branchFilter, t, language, selectedStatus, statusOptions]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (selectedStatus !== 'all') {
      const matched = statusOptions.find((o) => o.value === selectedStatus);
      chips.push({
        key: 'status',
        label: String(matched?.label || selectedStatus),
        onRemove: () => setSelectedStatus('all'),
      });
    }
    return chips;
  }, [branchFilter, selectedStatus, statusOptions, isAr, isFr]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0);

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (freelanceClients || []).length > 0,
  });

  if (showSkeleton && ((freelanceClients || []).length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '220px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.4*', minWidth: '120px' },
          { width: '1.4*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={130}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Users size={22} />}
        title={t('free_clients_crm_title', language)}
        primaryAction={{
          label: t('free_clients_add_new', language),
          onClick: handleOpenAddModal,
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-freelance-client',
        }}
      />

      {selectedClientIds.size > 0 && (
        <div
          data-sq="card"
          data-sq-border="solid"
          className="flex items-center justify-between p-3 px-4 bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 [--sq-stroke:#F5E2D8] dark:[--sq-stroke:#404040] animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
            <span className="t-small font-semibold text-black dark:text-white">
              {selectedClientIds.size}{' '}
              {isAr ? 'عملاء محددين' : isFr ? 'clients sélectionnés' : 'clients selected'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedClientIds(new Set())}
              className="px-3 py-2 t-small text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
            >
              {isAr ? 'إلغاء التحديد' : isFr ? 'Désélectionner' : 'Deselect'}
            </button>
            <button
              type="button"
              data-no-liquid="true"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={handleBatchSetRetainer}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle size={13} />
              <span>{isAr ? 'تحويل لعقد شهري' : isFr ? 'Passer en Retainer' : 'Set Active Retainer'}</span>
            </button>
            <button
              type="button"
              data-no-liquid="true"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={handleBatchSetProject}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Briefcase size={13} />
              <span>{isAr ? 'تحويل لمشروع' : isFr ? 'Passer au Projet' : 'Set Project Based'}</span>
            </button>
            <button
              type="button"
              data-no-liquid="true"
              data-sq="ctl-sm"
              data-sq-border="none"
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{isAr ? 'حذف المحدد' : isFr ? 'Supprimer' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

      <ScreenKpiBanner
        heading={
          isAr
            ? 'سعة ومؤشرات شبكة العملاء'
            : isFr
            ? 'Capacité & Santé du Portefeuille Clients'
            : 'Client Roster & Capacity'
        }
        language={language}
        primaryCard={{
          label: t('free_kpi_active_clients', language),
          badgeText: `${activeRetainersCount} ${isAr ? 'عقد شهري' : isFr ? 'forfaits' : 'retainers'}`,
          count: activeRetainersCount,
          tone: 'emerald',
          isActive: selectedStatus === 'activeretainer',
          onToggle: () =>
            setSelectedStatus((prev) => (prev === 'activeretainer' ? 'all' : 'activeretainer')),
        }}
        secondaryCard={{
          label: t('free_clients_status_project_based', language),
          badgeText: isAr ? 'بالـمشروع' : isFr ? 'au projet' : 'project-based',
          count: projectBasedCount,
          tone: 'terracotta',
          isActive: selectedStatus === 'projectbased',
          onToggle: () =>
            setSelectedStatus((prev) => (prev === 'projectbased' ? 'all' : 'projectbased')),
        }}
        darkCard={{
          label: t('free_kpi_invoiced_ytd', language),
          badgeCount: totalClientsCount,
          badgePrefix: '',
          badgeSuffix: isAr ? 'عميل' : 'clients',
          valueCount: totalBilledEquiv,
          valuePrefix: '',
          valueSuffix: ' DZD',
          formatValue: (n) => `${n.toLocaleString()} DZD`,
          caption: isAr ? 'إجمالي المقبوضات المسواة' : isFr ? 'Volume cumulé réglé' : 'Total paid revenue',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('free_clients_crm_title', language)}
          liveRegionText={`${sortedClients.length} ${isAr ? 'عملاء' : 'clients'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('free_search_clients_ph', language)}
          statusOptions={statusOptions}
          statusValue={selectedStatus}
          onStatusChange={setSelectedStatus}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setSelectedStatus('all');
            setSearchQuery('');
          }}
        />

        <UniversalDataCollection<FreelanceClient>
          hideToolbar
          items={sortedClients}
          keyExtractor={(c) => c.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={clientColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={clientSortBy}
          sortDirection={clientSortDir}
          onSortChange={(key, dir) => {
            setClientSortBy(key);
            setClientSortDir(dir);
          }}
          openItemId={activeClient?.id ?? null}
          onItemClick={(client, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedClient(client);
            setInspectorTab('profile');
          }}
          onViewDetails={(client, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedClient(client);
            setInspectorTab('profile');
          }}
          getRowMeta={getClientRowMeta}
          getFanActions={getClientFanActions}
          getDetailActions={getClientDetailActions}
          onEdit={(client) => handleOpenEditModal(client)}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            const target = freelanceClients.find((c) => c.id === id);
            setPinnedClientIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
                if (target) {
                  showToast({
                    type: 'info',
                    title: 'Unpinned',
                    message: `${target.name} unpinned`,
                  });
                }
              } else {
                next.add(id);
                if (target) {
                  showToast({
                    type: 'info',
                    title: 'Pinned',
                    message: `${target.name} pinned to top`,
                  });
                }
              }
              return next;
            });
          }}
          onDelete={(client) => setClientToDelete(client)}
          customActions={(client) => {
            const unbilled = getClientUnbilledTime(client.id);
            const actions = [
              {
                id: 'timer',
                tooltip: t('free_timer_start', language),
                icon: <Play size={13} />,
                iconColor: '#d4522f',
                onClick: () => handleQuickStartTimer(client),
              },
            ];
            if (unbilled.count > 0) {
              actions.push({
                id: 'bill',
                tooltip: `${t('free_clients_quick_bill', language)} (${unbilled.hours}h)`,
                icon: <FileText size={13} />,
                iconColor: '#10B981',
                onClick: () => handleQuickBill(client),
              });
            }
            return actions;
          }}
          pinnedIds={pinnedClientIds}
          selectedIds={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
          emptyTitle={t('free_clients_no_clients', language)}
          emptyDescription={t('free_clients_no_clients_desc', language)}
          primaryActionLabel={t('free_clients_add_new', language)}
          onAddFirstItem={handleOpenAddModal}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedClients.length}
        entityPluralLabel={isAr ? 'عملاء' : 'clients'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setSelectedStatus('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<FreelanceClient>
        isOpen={Boolean(activeClient)}
        item={activeClient}
        allItems={sortedClients}
        keyExtractor={(c) => c.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeClient?.name || ''}
        subtitle={activeClient?.company || t('free_clients_private_client', language)}
        categoryLabel={activeClient?.currency || 'DZD'}
        avatarText={activeClient ? activeClient.name.slice(0, 2).toUpperCase() : 'CL'}
        avatarColor="#d4522f"
        branchName={
          activeClient
            ? resolveRecordBranch(activeClient, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeClient
            ? activeClient.status === 'ActiveRetainer'
              ? t('free_clients_status_active_retainer', language)
              : activeClient.status === 'ProjectBased'
              ? t('free_clients_status_project_based', language)
              : activeClient.status
            : undefined
        }
        statusClassName={
          activeClient?.status === 'ActiveRetainer'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : activeClient?.status === 'ProjectBased'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
        }
        tabs={[
          { id: 'profile', label: isAr ? 'الملف' : isFr ? 'Profil' : 'Profile' },
          { id: 'projects', label: isAr ? 'المشاريع' : isFr ? 'Projets' : 'Projects' },
          { id: 'unbilled', label: isAr ? 'الفوترة' : isFr ? 'À facturer' : 'Unbilled' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(c) => {
          setSelectedClient(c);
          setInspectorTab('profile');
        }}
        onClose={() => setSelectedClient(null)}
        onDelete={(c) => setClientToDelete(c)}
        holdToDelete={false}
        renderBody={(client, tab) => {
          const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);
          const unbilled = getClientUnbilledTime(client.id);
          const clientLogs = timeLogs
            .filter((tl) => tl.clientId === client.id && !tl.isInvoiced)
            .slice(0, 6);

          if (tab === 'projects') {
            return (
              <>
                <InspectorSection
                  index={0}
                  title={`${t('free_kpi_active_projects', language)} (${clientProjects.length})`}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setScreen('scheduler');
                      }}
                      className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline t-small font-semibold cursor-pointer"
                    >
                      {t('free_clients_manage_deliv', language)}
                    </button>
                  }
                >
                  {clientProjects.length > 0 ? (
                    <InspectorCard>
                      {clientProjects.map((project, idx) => (
                        <InspectorListItem
                          key={project.id}
                          title={project.title}
                          subtitle={`${project.loggedHours}h / ${project.estimatedHours}h · ${formatCurrencyAmount(project.budget, project.currency)}`}
                          badge={{
                            label:
                              project.stage === 'InProgress'
                                ? t('free_stage_in_progress', language)
                                : project.stage === 'ClientReview'
                                ? t('free_stage_client_review', language)
                                : project.stage === 'Approved'
                                ? t('free_stage_approved', language)
                                : String(project.stage),
                            tone: project.stage === 'Approved' ? 'ok' : 'accent',
                          }}
                          isLast={idx === clientProjects.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  ) : (
                    <InspectorCard>
                      <InspectorKeyValue
                        label={t('free_kpi_active_projects', language)}
                        value={isAr ? 'لا توجد مشاريع مرتبطة' : isFr ? 'Aucun projet associé' : 'No active projects yet'}
                        isLast
                      />
                    </InspectorCard>
                  )}
                </InspectorSection>
                <InspectorSection index={1} title={t('free_clients_notes', language)}>
                  <InspectorNotesField
                    value={client.notes || ''}
                    onSave={(next) => updateFreelanceClient(client.id, { notes: next })}
                  />
                </InspectorSection>
              </>
            );
          }

          if (tab === 'unbilled') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatCurrencyAmount(unbilled.amount, client.currency)}
                    tone={unbilled.amount > 0 ? 'accent' : 'ok'}
                    caption={`${unbilled.hours}h ${t('free_kpi_unbilled_hours', language)}`}
                    action={
                      unbilled.count > 0
                        ? {
                            label: `${t('free_clients_gen_invoice', language)} (${unbilled.hours}h)`,
                            onClick: () => handleQuickBill(client),
                          }
                        : undefined
                    }
                  />
                </InspectorSection>
                <InspectorSection
                  index={1}
                  title={`${t('free_clients_unbilled_logs', language)} (${clientLogs.length})`}
                >
                  {clientLogs.length > 0 ? (
                    <InspectorCard>
                      {clientLogs.map((log, idx) => (
                        <InspectorListItem
                          key={log.id}
                          title={log.taskDescription}
                          subtitle={log.date}
                          metaRight={formatDuration(log.durationSeconds)}
                          isLast={idx === clientLogs.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  ) : (
                    <InspectorCard>
                      <InspectorKeyValue
                        label={t('free_clients_unbilled_logs', language)}
                        value={isAr ? 'لا توجد ساعات غير مفوترة' : isFr ? 'Aucune heure non facturée' : 'No unbilled entries'}
                        isLast
                      />
                    </InspectorCard>
                  )}
                </InspectorSection>
                {unbilled.count > 0 && (
                  <InspectorSection index={2}>
                    <InspectorWideButton
                      label={`${t('free_clients_gen_invoice', language)} (${unbilled.hours}h)`}
                      icon={<FileText size={14} />}
                      tone="accent"
                      onClick={() => handleQuickBill(client)}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isFr ? 'Actions Rapides' : 'Quick Actions'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'timer',
                      label: t('free_timer_start', language),
                      icon: <Play size={16} />,
                      primary: true,
                      onClick: () => handleQuickStartTimer(client),
                    },
                    {
                      id: 'edit',
                      label: t('common_edit', language) || (isFr ? 'Modifier' : 'Edit'),
                      icon: <Edit2 size={16} />,
                      onClick: () => handleOpenEditModal(client),
                    },
                    ...(unbilled.count > 0
                      ? [
                          {
                            id: 'bill',
                            label: t('free_clients_quick_bill', language),
                            icon: <FileText size={16} />,
                            onClick: () => handleQuickBill(client),
                          },
                        ]
                      : []),
                  ]}
                />
              </InspectorSection>
              <InspectorSection
                index={1}
                title={isAr ? 'بيانات الاتصال' : isFr ? 'Coordonnées' : 'Contact Information'}
              >
                <InspectorCard>
                  <InspectorKeyValue
                    label={t('free_clients_email', language)}
                    value={client.email}
                    icon={<Mail size={13} />}
                    copyText={client.email}
                  />
                  {client.phone && (
                    <InspectorKeyValue
                      label={t('free_clients_phone', language)}
                      value={client.phone}
                      icon={<Phone size={13} />}
                      copyText={client.phone}
                    />
                  )}
                  <InspectorKeyValue
                    label={isAr ? 'البلد والعملة' : isFr ? 'Pays & Devise' : 'Country & Billing'}
                    value={`${client.country || 'Algeria'} · ${client.currency}`}
                    icon={<Globe size={13} />}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2} title={t('free_clients_contract_terms', language)}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={t('free_clients_hourly_rate', language)}
                    value={`${formatCurrencyAmount(client.hourlyRate, client.currency)}${t('free_dash_per_hour', language)}`}
                    mono
                    tone="accent"
                  />
                  <InspectorKeyValue
                    label={t('free_clients_monthly_retainer', language)}
                    value={`${client.monthlyRetainerHours || 0} ${t('free_dash_hours_unit', language)}`}
                    mono
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      {/* Add / Edit Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="sq-elev-pop max-w-lg w-full animate-in zoom-in-95 duration-150">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 w-full p-6 space-y-5"
            >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="t-card font-semibold text-black dark:text-white">
                  {clientToEdit
                    ? t('free_clients_modal_title_edit', language)
                    : t('free_clients_modal_title_add', language)}
                </h3>
                <p className="t-cap text-black/55 dark:text-white/55 mt-0.5">
                  {t('free_clients_modal_desc', language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitClient} className="space-y-4 t-cap">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="ClientName"
                  label={`${t('free_clients_full_name', language)} *`}
                  required
                  value={formData.name}
                  onChange={(v) => setFormData({ ...formData, name: extractStr(v) })}
                  placeholder={t('free_clients_ph_name', language)}
                  width="100%"
                  height={46}
                  corner={12}
                />
                <LabelInput
                  field="Company"
                  label={t('free_clients_company', language)}
                  value={formData.company}
                  onChange={(v) => setFormData({ ...formData, company: extractStr(v) })}
                  placeholder={t('free_clients_ph_company', language)}
                  width="100%"
                  height={46}
                  corner={12}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="ClientEmail"
                  label={`${t('free_clients_email', language)} *`}
                  type="email"
                  required
                  value={formData.email}
                  onChange={(v) => setFormData({ ...formData, email: extractStr(v) })}
                  placeholder={t('free_clients_ph_email', language)}
                  width="100%"
                  height={46}
                  corner={12}
                />
                <LabelInput
                  field="ClientPhone"
                  label={t('free_clients_phone', language)}
                  type="tel"
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: extractStr(v) })}
                  placeholder={t('free_clients_ph_phone', language)}
                  width="100%"
                  height={46}
                  corner={12}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LabelSelect
                  field="Currency"
                  label={t('free_clients_currency', language)}
                  value={formData.currency}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      currency: extractStr(val) as CurrencyCode,
                    })
                  }
                  options={[
                    { value: 'DZD', label: 'DZD (DA)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'USD', label: 'USD ($)' },
                  ]}
                  height={46}
                  corner={12}
                />
                <LabelInput
                  field="HourlyRate"
                  label={t('free_clients_hourly_rate', language)}
                  type="number"
                  value={formData.hourlyRate ? String(formData.hourlyRate) : ''}
                  onChange={(v) => setFormData({ ...formData, hourlyRate: Number(extractStr(v)) || 0 })}
                  width="100%"
                  height={46}
                  corner={12}
                />
                <LabelSelect
                  field="Status"
                  label={t('free_clients_status', language)}
                  value={formData.status}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      status: extractStr(val) as FreelanceClientStatus,
                    })
                  }
                  options={[
                    {
                      value: 'ActiveRetainer',
                      label: t('free_clients_status_active_retainer', language),
                    },
                    {
                      value: 'ProjectBased',
                      label: t('free_clients_status_project_based', language),
                    },
                    { value: 'Prospect', label: t('free_clients_status_prospect', language) },
                    { value: 'Archived', label: t('free_clients_status_archived', language) },
                  ]}
                  height={46}
                  corner={12}
                />
              </div>

              {formData.status === 'ActiveRetainer' && (
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 [--sq-stroke:rgba(253,230,138,0.6)] dark:[--sq-stroke:rgba(120,53,15,0.4)]"
                >
                  <LabelInput
                    field="RetainerHours"
                    label={t('free_clients_retainer_hours', language)}
                    type="number"
                    value={formData.monthlyRetainerHours ? String(formData.monthlyRetainerHours) : ''}
                    onChange={(v) =>
                      setFormData({ ...formData, monthlyRetainerHours: Number(extractStr(v)) || 0 })
                    }
                    placeholder={t('free_clients_ph_retainer_hrs', language)}
                    width="100%"
                    height={46}
                    corner={12}
                  />
                  <LabelInput
                    field="FlatFee"
                    label={t('free_clients_flat_fee', language)}
                    type="number"
                    value={formData.monthlyRetainerAmount ? String(formData.monthlyRetainerAmount) : ''}
                    onChange={(v) =>
                      setFormData({
                        ...formData,
                        monthlyRetainerAmount: Number(extractStr(v)) || 0,
                      })
                    }
                    placeholder={t('free_clients_ph_flat_fee', language)}
                    width="100%"
                    height={46}
                    corner={12}
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-black/70 dark:text-white/75 block mb-1">
                  {t('free_clients_notes', language)}
                </label>
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                >
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('free_clients_notes_ph', language)}
                    className="lbi-field w-full px-3 py-2 bg-transparent border-0 text-black dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="ctl"
                  data-sq-border="solid"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 t-small font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('free_clients_cancel', language)}
                </button>
                <button
                  type="submit"
                  data-sq="ctl"
                  data-sq-border="none"
                  className="px-5 py-2 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {clientToEdit
                    ? t('free_clients_save_changes', language)
                    : t('free_clients_create_btn', language)}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="sq-elev-pop max-w-md w-full animate-in zoom-in-95 duration-150">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div
                  data-sq="tile"
                  data-sq-border="solid"
                  className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60 [--sq-stroke:#fecdd3] dark:[--sq-stroke:rgba(136,19,55,0.6)]"
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="t-card font-semibold text-black dark:text-white">
                    {t('free_clients_delete', language)}
                  </h3>
                  <p className="t-cap text-black/55 dark:text-white/55">
                    {t('free_clients_delete_warning', language)}
                  </p>
                </div>
              </div>

              <p className="t-cap text-black/70 dark:text-white/75">
                {t('free_clients_delete_confirm', language)}{' '}
                <strong className="text-black dark:text-white font-semibold">
                  {clientToDelete.name}
                </strong>{' '}
                ({clientToDelete.company || t('free_clients_private_badge', language)})?
              </p>

              <label
                data-sq="card"
                data-sq-border="solid"
                className="flex items-start gap-2 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 t-cap text-black/70 dark:text-white/75 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={deleteCascade}
                  onChange={(e) => setDeleteCascade(e.target.checked)}
                  className="mt-0.5 rounded-[var(--r-check,6px)] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] focus:ring-[#d4522f]"
                />
              <div>
                <span className="font-semibold block text-black dark:text-white">
                  {t('free_clients_cascade_delete', language)}
                </span>
                <span className="t-cap text-black/55 dark:text-white/75 block mt-0.5">
                  {t('free_clients_cascade_desc', language)}
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <AtriumButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClientToDelete(null);
                  setDeleteCascade(false);
                }}
              >
                {t('free_clients_cancel', language)}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  if (clientToDelete) {
                    deleteFreelanceClient(clientToDelete.id, deleteCascade);
                    if (selectedClient?.id === clientToDelete.id) {
                      setSelectedClient(null);
                    }
                    setClientToDelete(null);
                    setDeleteCascade(false);
                  }
                }}
              >
                {t('free_clients_delete', language)}
              </AtriumButton>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
