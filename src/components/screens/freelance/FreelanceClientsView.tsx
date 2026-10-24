import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Play,
  FileText,
  DollarSign,
  Briefcase,
  Clock,
  ChevronRight,
  X,
  Mail,
  Phone,
  Globe,
  Edit2,
  CheckCircle,
  Building,
  Trash2,
  AlertTriangle,
  Pin,
  Download,
  Sparkles,
  Home,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount, formatDuration } from '../../../utils/rules';
import { FreelanceClient, FreelanceClientStatus, CurrencyCode } from '../../../types/index';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';

export const FreelanceClientsView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
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
    resetFreelanceMockData,
    businesses,
    branches,
    currentBusinessId,
    currentBranchId,
    switchBusiness,
    switchBranch,
    setScreen,
    showToast,
  } = useAtriumStore();

  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // Auto-heal empty freelance client directory safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && freelanceClients.length === 0) {
      hasAutoHealed.current = true;
      resetFreelanceMockData();
    }
  }, [freelanceClients.length, resetFreelanceMockData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<FreelanceClient | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<FreelanceClient | null>(null);
  const [clientToDelete, setClientToDelete] = useState<FreelanceClient | null>(null);
  const [deleteCascade, setDeleteCascade] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [pinnedClientIds, setPinnedClientIds] = useState<Set<string>>(new Set());
  const [clientSortBy, setClientSortBy] = useState<string>('client');
  const [clientSortDir, setClientSortDir] = useState<'asc' | 'desc'>('asc');

  // Form state
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

  const filteredClients = useMemo(() => {
    return freelanceClients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' ? true : client.status.toLowerCase() === selectedStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [freelanceClients, searchQuery, selectedStatus]);

  // Aggregate metrics
  const totalClientsCount = freelanceClients.length;
  const activeRetainersCount = freelanceClients.filter((c) => c.status === 'ActiveRetainer').length;
  const totalBilledEquiv = freelanceInvoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const getClientUnbilledTime = (clientId: string) => {
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
  };

  const handleOpenAddModal = () => {
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
  };

  const handleOpenEditModal = (client: FreelanceClient) => {
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
  };

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

  const handleQuickStartTimer = (client: FreelanceClient) => {
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
  };

  const handleQuickBill = (client: FreelanceClient) => {
    try {
      billUnbilledHours(client.id, 0, `Invoice for unbilled hours - ${client.name}`);
      setScreen('shop');
    } catch (err: any) {
      console.error('Unable to bill unbilled hours:', err?.message || err);
    }
  };

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
      if (clientSortBy === 'rate') {
        return clientSortDir === 'asc' ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate;
      }
      return 0;
    });
  }, [filteredClients, pinnedClientIds, clientSortBy, clientSortDir]);

  const clientColumns: ColumnDefinition<FreelanceClient>[] = useMemo(() => [
    {
      key: 'client',
      header: t('free_clients_table_client', language) || 'Client',
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (client) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
            {client.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900 dark:text-white truncate hover:text-[#C4785A] transition-colors">
              {client.name}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {client.company || t('free_clients_private_client', language)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('free_clients_table_status', language) || 'Status',
      width: '1.8*',
      minWidth: '140px',
      renderCell: (client) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            client.status === 'ActiveRetainer'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : client.status === 'ProjectBased'
              ? 'bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] border border-[#F5E2D8] dark:border-neutral-700'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
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
      width: '1.8*',
      minWidth: '150px',
      sortable: true,
      renderCell: (client) => (
        <div className="text-xs">
          <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(client.hourlyRate, client.currency)}{t('free_dash_per_hour', language)}
          </span>
          {client.monthlyRetainerHours ? (
            <span className="block text-[10px] text-neutral-400">
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 tabular-nums">
            {count} {t('free_nav_deliverables', language)}
          </span>
        );
      },
    },
    {
      key: 'unbilled',
      header: t('free_kpi_unbilled_hours', language),
      width: '1.8*',
      minWidth: '140px',
      renderCell: (client) => {
        const unbilled = getClientUnbilledTime(client.id);
        return unbilled.amount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 tabular-nums">
            {unbilled.hours}h · {formatCurrencyAmount(unbilled.amount, client.currency)}
          </span>
        ) : (
          <span className="text-neutral-400 text-xs">0h</span>
        );
      },
    },
  ], [freelanceProjects, language, t]);

  const handleExportCSV = () => {
    if (freelanceClients.length === 0) return;
    const headers = [
      language === 'ar' ? 'معرف العميل' : 'Client ID',
      language === 'ar' ? 'اسم العميل' : 'Client Name',
      language === 'ar' ? 'الشركة' : 'Company',
      language === 'ar' ? 'البريد الإلكتروني' : 'Email',
      language === 'ar' ? 'الهاتف' : 'Phone',
      language === 'ar' ? 'البلد' : 'Country',
      language === 'ar' ? 'العملة' : 'Currency',
      language === 'ar' ? 'سعر الساعة' : 'Hourly Rate',
      language === 'ar' ? 'الحالة' : 'Status',
      language === 'ar' ? 'ساعات الحجز الشهري' : 'Retainer Hours',
      language === 'ar' ? 'مبلغ الحجز الشهري' : 'Retainer Amount',
      language === 'ar' ? 'المشاريع' : 'Projects Count',
      language === 'ar' ? 'الساعات غير المفوترة' : 'Unbilled Hours',
    ];

    const rows = sortedClients.map((client) => {
      const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);
      const unbilled = getClientUnbilledTime(client.id);
      return [
        `"${client.id}"`,
        `"${client.name.replace(/"/g, '""')}"`,
        `"${(client.company || '').replace(/"/g, '""')}"`,
        `"${client.email}"`,
        `"${client.phone || ''}"`,
        `"${client.country || ''}"`,
        `"${client.currency}"`,
        client.hourlyRate,
        `"${client.status}"`,
        client.monthlyRetainerHours || 0,
        client.monthlyRetainerAmount || 0,
        clientProjects.length,
        unbilled.hours,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atrium_freelance_clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchSetRetainer = () => {
    if (selectedClientIds.size === 0) return;
    selectedClientIds.forEach((id) => {
      updateFreelanceClient(id, { status: 'ActiveRetainer' });
    });
    const count = selectedClientIds.size;
    setSelectedClientIds(new Set());
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Mis à jour' : 'Updated',
      message: `${count} ${language === 'ar' ? 'عملاء تم تحويلهم لعقد شهري' : 'clients updated to Active Retainer'}`,
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
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Mis à jour' : 'Updated',
      message: `${count} ${language === 'ar' ? 'عملاء تم تحويلهم لنمط المشاريع' : 'clients updated to Project Based'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDelete = () => {
    if (selectedClientIds.size === 0) return;
    const count = selectedClientIds.size;
    if (confirm(language === 'ar' ? `هل أنت متأكد من حذف ${count} عملاء؟` : `Delete ${count} selected clients?`)) {
      selectedClientIds.forEach((id) => {
        deleteFreelanceClient(id, false);
      });
      setSelectedClientIds(new Set());
      showToast({
        type: 'info',
        title: language === 'ar' ? 'تم الحذف' : language === 'fr' ? 'Suppression' : 'Deleted',
        message: `${count} ${language === 'ar' ? 'عملاء تم حذفهم' : 'clients deleted'}`,
        category: 'freelance_solo',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t('free_clients_crm_title', language)}
              </h1>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {totalClientsCount} {t('free_clients_accounts', language)} · {activeRetainersCount} {t('free_clients_active_retainers', language)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('free_clients_crm_subtitle', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Studio Main'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Facility Dropdown Menu */}
            {isFacilityDropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'الفروع والمراكز' : language === 'fr' ? 'Établissements & Espaces' : 'Facilities & Branches'}
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
                      className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
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

          {/* Export CSV Button */}
          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
            title="Export CSV"
          >
            <span className="hidden sm:inline">CSV</span>
          </AtriumButton>

          {/* Seed Demo Data Button */}
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={resetFreelanceMockData}
            title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
          >
            <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
          </AtriumButton>

          <AtriumButton
            type="button"
            variant="primary"
            size="sm"
            glow
            icon={<Plus size={14} />}
            onClick={handleOpenAddModal}
          >
            {t('free_clients_add_new', language)}
          </AtriumButton>
        </div>
      </div>

      {/* Batch Selection Toolbar */}
      {selectedClientIds.size > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              {selectedClientIds.size} {language === 'ar' ? 'عملاء محددين' : language === 'fr' ? 'clients sélectionnés' : 'clients selected'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedClientIds(new Set())}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect'}
            </button>
            <button
              onClick={handleBatchSetRetainer}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle size={13} />
              <span>{language === 'ar' ? 'تحويل لعقد شهري' : language === 'fr' ? 'Passer en Retainer' : 'Set Active Retainer'}</span>
            </button>
            <button
              onClick={handleBatchSetProject}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Briefcase size={13} />
              <span>{language === 'ar' ? 'تحويل لمشروع' : language === 'fr' ? 'Passer au Projet' : 'Set Project Based'}</span>
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 size={13} />
              <span>{language === 'ar' ? 'حذف المحدد' : language === 'fr' ? 'Supprimer' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_clients_total_network', language)}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {totalClientsCount}
            </span>
            <span className="text-xs text-neutral-500">
              {activeRetainersCount} {t('free_clients_active_retainers', language)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_kpi_active_clients', language)}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {activeRetainersCount}
            </span>
            <span className="text-xs text-neutral-500">
              {t('free_clients_active_retainers', language)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_kpi_invoiced_ytd', language)}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {totalBilledEquiv.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500">
              DZD
            </span>
          </div>
        </div>
      </div>

      {/* Search & Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Seek Kinetic Search Box */}
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('free_search_clients_ph', language)}
          shutSize={36}
          openWidth={260}
        />

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: t('free_clients_all_statuses', language) },
            { id: 'activeretainer', label: t('free_clients_status_active_retainer', language) },
            { id: 'projectbased', label: t('free_clients_status_project_based', language) },
            { id: 'prospect', label: t('free_clients_status_prospect', language) },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Universal Collection (List view & Grid view with 6-button corner-fan) */}
      <UniversalDataCollection<FreelanceClient>
        items={sortedClients}
        keyExtractor={(c) => c.id}
        defaultViewMode="list"
        columns={clientColumns}
        sortBy={clientSortBy}
        sortDirection={clientSortDir}
        onSortChange={(key) => {
          if (clientSortBy === key) {
            setClientSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setClientSortBy(key);
            setClientSortDir('asc');
          }
        }}
        renderCard={(client) => {
          const unbilled = getClientUnbilledTime(client.id);
          const clientProjects = freelanceProjects.filter((p) => p.clientId === client.id);

          return (
            <div className="flex flex-col items-center justify-center w-full">
              <div className="w-24 h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center text-[32px] font-bold shadow-md mb-4 select-none border border-neutral-200 dark:border-neutral-700">
                {client.name.charAt(0)}
              </div>
              <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white truncate max-w-[210px] mb-1 tracking-tight">
                {client.name}
              </h3>
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A] border border-[#F5E2D8] dark:border-neutral-700 mb-3 truncate max-w-[200px]">
                {client.company || t('free_clients_private_client', language)}
              </span>

              <div className="w-full pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-1.5 text-center">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span className="text-[11px]">{t('free_clients_hourly_rate', language)}:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {formatCurrencyAmount(client.hourlyRate, client.currency)}{t('free_dash_per_hour', language)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span className="text-[11px]">{t('free_kpi_active_projects', language)}:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {clientProjects.length}
                  </span>
                </div>

                {unbilled.amount > 0 && (
                  <div className="mt-2 p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-[11px]">
                    <span className="text-amber-800 dark:text-amber-300 font-medium">
                      {unbilled.hours}h unbilled
                    </span>
                    <span className="font-bold text-amber-900 dark:text-amber-200 tabular-nums">
                      {formatCurrencyAmount(unbilled.amount, client.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        }}
        onItemClick={(client) => setSelectedClient(client)}
        onViewDetails={(client) => setSelectedClient(client)}
        onEdit={(client) => handleOpenEditModal(client)}
        onTogglePin={(client) => {
          setPinnedClientIds((prev) => {
            const next = new Set(prev);
            if (next.has(client.id)) {
              next.delete(client.id);
              showToast?.({
                type: 'info',
                title: 'Unpinned',
                message: `${client.name} unpinned`,
              });
            } else {
              next.add(client.id);
              showToast?.({
                type: 'info',
                title: 'Pinned',
                message: `${client.name} pinned to top`,
              });
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
              iconColor: '#C4785A',
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                handleQuickStartTimer(client);
              },
            },
          ];
          if (unbilled.count > 0) {
            actions.push({
              id: 'bill',
              tooltip: `${t('free_clients_quick_bill', language)} (${unbilled.hours}h)`,
              icon: <FileText size={13} />,
              iconColor: '#10B981',
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                handleQuickBill(client);
              },
            });
          }
          return actions;
        }}
        isPinned={(client) => pinnedClientIds.has(client.id)}
        selectedIds={selectedClientIds}
        onSelectionChange={setSelectedClientIds}
        emptyTitle={t('free_clients_no_clients', language)}
        emptyDescription={t('free_clients_no_clients_desc', language)}
        primaryActionLabel={t('free_clients_add_new', language)}
        onAddFirstItem={handleOpenAddModal}
      />

      {/* 360° Client Inspector Slide-over Drawer */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#18181B] h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#C4785A] uppercase tracking-wider block">
                  {t('free_clients_profile_360', language)}
                </span>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {selectedClient.name}
                </h2>
                <p className="text-xs text-neutral-500">{selectedClient.company || t('free_clients_private_client', language)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-[#EDF1F3] dark:border-neutral-800 space-y-2.5">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Mail size={13} className="text-neutral-400 shrink-0" />
                  <span className="truncate">{selectedClient.email}</span>
                </div>
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Phone size={13} className="text-neutral-400 shrink-0" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
                {selectedClient.country && (
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Globe size={13} className="text-neutral-400 shrink-0" />
                    <span>{selectedClient.country} · {t('free_clients_billing_in', language)} {selectedClient.currency}</span>
                  </div>
                )}
              </div>

              {/* Retainer & Rate Parameters */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-900 dark:text-white block">
                  {t('free_clients_contract_terms', language)}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                      {t('free_clients_hourly_rate', language)}
                    </span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(selectedClient.hourlyRate, selectedClient.currency)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                      {t('free_clients_monthly_retainer', language)}
                    </span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white tabular-nums">
                      {selectedClient.monthlyRetainerHours || 0} {t('free_dash_hours_unit', language)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Projects & Deliverables */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {t('free_kpi_active_projects', language)} ({freelanceProjects.filter((p) => p.clientId === selectedClient.id).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setScreen('scheduler');
                    }}
                    className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
                  >
                    {t('free_clients_manage_deliv', language)}
                  </button>
                </div>

                <div className="space-y-2">
                  {freelanceProjects
                    .filter((p) => p.clientId === selectedClient.id)
                    .map((project) => (
                      <div
                        key={project.id}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {project.title}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {project.stage === 'InProgress' ? t('free_stage_in_progress', language) : project.stage === 'ClientReview' ? t('free_stage_client_review', language) : project.stage === 'Approved' ? t('free_stage_approved', language) : project.stage === 'Briefing' ? (t('pm_status_brief', language) || 'Briefing') : project.stage === 'Billed' ? (t('free_stage_completed', language) || 'Billed') : (project.stage as string)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-neutral-500 mt-1 text-[11px]">
                          <span>
                            {t('free_dash_logged_label', language)} <strong className="text-neutral-700 dark:text-neutral-300 tabular-nums">{project.loggedHours}h</strong> / {project.estimatedHours}h
                          </span>
                          <span>·</span>
                          <span>{t('free_dash_budget_label', language)} {formatCurrencyAmount(project.budget, project.currency)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Unbilled Time Logs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {t('free_clients_unbilled_logs', language)}
                  </span>
                  {getClientUnbilledTime(selectedClient.id).count > 0 && (
                    <button
                      type="button"
                      onClick={() => handleQuickBill(selectedClient)}
                      className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
                    >
                      {t('free_clients_gen_invoice', language)}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {timeLogs
                    .filter((t) => t.clientId === selectedClient.id && !t.isInvoiced)
                    .slice(0, 5)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                            {log.taskDescription}
                          </p>
                          <span className="text-neutral-400">{log.date}</span>
                        </div>
                        <span className="font-bold tabular-nums text-neutral-900 dark:text-white">
                          {formatDuration(log.durationSeconds)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div className="space-y-1">
                  <span className="font-semibold text-neutral-900 dark:text-white block">
                    {t('free_clients_engagement_notes', language)}
                  </span>
                  <p className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs">
                    {selectedClient.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickStartTimer(selectedClient)}
                className="flex-1 py-2.5 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Play size={13} />
                <span>{t('free_timer_start', language)}</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedClient)}
                className="px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {t('free_clients_edit', language)}
              </button>
              <button
                type="button"
                onClick={() => setClientToDelete(selectedClient)}
                className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title={t('free_clients_delete', language)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {clientToEdit ? t('free_clients_modal_title_edit', language) : t('free_clients_modal_title_add', language)}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t('free_clients_modal_desc', language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="ClientName"
                  label={`${t('free_clients_full_name', language)} *`}
                  required
                  value={formData.name}
                  onChange={(v) => setFormData({ ...formData, name: v })}
                  placeholder={t('free_clients_ph_name', language)}
                  width="100%"
                  height={46}
                  corner={14}
                />
                <LabelInput
                  field="Company"
                  label={t('free_clients_company', language)}
                  value={formData.company}
                  onChange={(v) => setFormData({ ...formData, company: v })}
                  placeholder={t('free_clients_ph_company', language)}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="ClientEmail"
                  label={`${t('free_clients_email', language)} *`}
                  type="email"
                  required
                  value={formData.email}
                  onChange={(v) => setFormData({ ...formData, email: v })}
                  placeholder={t('free_clients_ph_email', language)}
                  width="100%"
                  height={46}
                  corner={14}
                />
                <LabelInput
                  field="ClientPhone"
                  label={t('free_clients_phone', language)}
                  type="tel"
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                  placeholder={t('free_clients_ph_phone', language)}
                  width="100%"
                  height={46}
                  corner={14}
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
                      currency: (val?.target?.value ?? String(val)) as CurrencyCode,
                    })
                  }
                  options={[
                    { value: 'DZD', label: 'DZD (DA)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'USD', label: 'USD ($)' },
                  ]}
                  height={46}
                  corner={14}
                />
                <LabelInput
                  field="HourlyRate"
                  label={t('free_clients_hourly_rate', language)}
                  type="number"
                  value={formData.hourlyRate ? String(formData.hourlyRate) : ''}
                  onChange={(v) => setFormData({ ...formData, hourlyRate: Number(v) || 0 })}
                  width="100%"
                  height={46}
                  corner={14}
                />
                <LabelSelect
                  field="Status"
                  label={t('free_clients_status', language)}
                  value={formData.status}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      status: (val?.target?.value ?? String(val)) as FreelanceClientStatus,
                    })
                  }
                  options={[
                    { value: 'ActiveRetainer', label: t('free_clients_status_active_retainer', language) },
                    { value: 'ProjectBased', label: t('free_clients_status_project_based', language) },
                    { value: 'Prospect', label: t('free_clients_status_prospect', language) },
                    { value: 'Archived', label: t('free_clients_status_archived', language) },
                  ]}
                  height={46}
                  corner={14}
                />
              </div>

              {formData.status === 'ActiveRetainer' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <LabelInput
                    field="RetainerHours"
                    label={t('free_clients_retainer_hours', language)}
                    type="number"
                    value={formData.monthlyRetainerHours ? String(formData.monthlyRetainerHours) : ''}
                    onChange={(v) => setFormData({ ...formData, monthlyRetainerHours: Number(v) || 0 })}
                    placeholder={t('free_clients_ph_retainer_hrs', language)}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                  <LabelInput
                    field="FlatFee"
                    label={t('free_clients_flat_fee', language)}
                    type="number"
                    value={formData.monthlyRetainerAmount ? String(formData.monthlyRetainerAmount) : ''}
                    onChange={(v) => setFormData({ ...formData, monthlyRetainerAmount: Number(v) || 0 })}
                    placeholder={t('free_clients_ph_flat_fee', language)}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t('free_clients_notes', language)}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('free_clients_notes_ph', language)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('free_clients_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {clientToEdit ? t('free_clients_save_changes', language) : t('free_clients_create_btn', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{t('free_clients_delete', language)}</h3>
                <p className="text-xs text-neutral-500">{t('free_clients_delete_warning', language)}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              {t('free_clients_delete_confirm', language)} <strong className="text-neutral-900 dark:text-white font-semibold">{clientToDelete.name}</strong> ({clientToDelete.company || t('free_clients_private_badge', language)})?
            </p>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteCascade}
                onChange={(e) => setDeleteCascade(e.target.checked)}
                className="mt-0.5 rounded text-[#C4785A] focus:ring-[#C4785A]"
              />
              <div>
                <span className="font-semibold block text-neutral-900 dark:text-white">{t('free_clients_cascade_delete', language)}</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                  {t('free_clients_cascade_desc', language)}
                </span>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setClientToDelete(null);
                  setDeleteCascade(false);
                }}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('free_clients_cancel', language)}
              </button>
              <button
                type="button"
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
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {t('free_clients_delete', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
