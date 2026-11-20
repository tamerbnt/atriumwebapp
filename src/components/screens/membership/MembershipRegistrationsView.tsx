import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Check,
  X,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Eye,
  Pin,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentLeadsFromState,
  selectCurrentPlansFromState,
  selectCurrentBranchFromState,
  selectTerminologyFromState,
  showToast,
} from '../../../services/store';
import { RegistrationLead } from '../../../types/index';
import { Avatar } from '../../ui/Avatar';
import { Modal } from '../../ui/Modal';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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
  InspectorListItem,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';
import { localizeStatus } from '../../../utils/rules';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import { t } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export interface MembershipRegistrationsViewProps {
  onAddLead: () => void;
}

export const MembershipRegistrationsView: React.FC<MembershipRegistrationsViewProps> = React.memo(({
  onAddLead,
}) => {
  const {
    leads,
    plans,
    branches,
    currentBranch,
    terminology,
    language,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      leads: selectCurrentLeadsFromState(s),
      plans: selectCurrentPlansFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      terminology: selectTerminologyFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );

  const {
    updateLeadStatus,
    deleteLead,
    convertLeadToMember,
    retryCloudSync,
  } = useAtriumActions();

  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState<RegistrationLead | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [conversionLead, setConversionLead] = useState<RegistrationLead | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(() => new Set());
  const [pinnedLeadIds, setPinnedLeadIds] = useState<Set<string>>(() => new Set());
  const [leadSortBy, setLeadSortBy] = useState('date');
  const [leadSortDir, setLeadSortDir] = useState<'asc' | 'desc'>('desc');

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchOptionsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach((l) => {
      const bName = resolveRecordBranch(l, branchesById, currentBranch, language).name;
      counts.set(bName, (counts.get(bName) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({
      value: name,
      label: name,
      count,
    }));
  }, [leads, branchesById, currentBranch, language]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'All' && lead.status !== statusFilter) return false;
      if (planFilter !== 'All') {
        if (lead.preferredPlanId !== planFilter && lead.preferredPlanName !== planFilter) return false;
      }
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(lead, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bName = resolveRecordBranch(lead, branchesById, currentBranch, language).name.toLowerCase();
        const matchesName = lead.fullName.toLowerCase().includes(q);
        const matchesPhone = (lead.phoneNumber || '').includes(q);
        const matchesEmail = (lead.email || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !bName.includes(q)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, planFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const aPinned = pinnedLeadIds.has(a.id);
      const bPinned = pinnedLeadIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (leadSortBy === 'applicant') {
        const cmp = a.fullName.localeCompare(b.fullName);
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      if (leadSortBy === 'plan') {
        const cmp = (a.preferredPlanName || '').localeCompare(b.preferredPlanName || '');
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      if (leadSortBy === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      if (leadSortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return leadSortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredLeads, pinnedLeadIds, leadSortBy, leadSortDir, branchesById, currentBranch, language]);

  const pendingCount = useMemo(() => leads.filter((l) => l.status === 'Pending').length, [leads]);
  const approvedCount = useMemo(() => leads.filter((l) => l.status === 'Approved').length, [leads]);
  const declinedCount = useMemo(() => leads.filter((l) => l.status === 'Declined').length, [leads]);

  const handleTogglePinLead = useCallback((leadOrId: RegistrationLead | string) => {
    const id = typeof leadOrId === 'string' ? leadOrId : leadOrId.id;
    setPinnedLeadIds((prev) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleStartConversion = useCallback((lead: RegistrationLead) => {
    setConversionLead(lead);
    setSelectedPlanId(lead.preferredPlanId || plans[0]?.id || 'plan_a1');
  }, [plans]);

  const handleConfirmConversion = useCallback(() => {
    if (!conversionLead) return;
    const plan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    convertLeadToMember(
      conversionLead.id,
      plan ? plan.id : 'standard_pkg',
      plan ? plan.name : 'Standard Package',
      plan ? plan.durationDays : 365
    );
    setConversionLead(null);
    if (selectedLead?.id === conversionLead.id) setSelectedLead(null);
  }, [conversionLead, plans, selectedPlanId, convertLeadToMember, selectedLead]);

  const handleBatchApprove = useCallback(() => {
    const targetIds = Array.from(selectedLeadIds);
    const plan = plans[0];
    targetIds.forEach((id) => {
      const lead = leads.find((l) => l.id === id);
      if (lead && lead.status === 'Pending') {
        convertLeadToMember(
          lead.id,
          lead.preferredPlanId || (plan ? plan.id : 'standard_pkg'),
          lead.preferredPlanName || (plan ? plan.name : 'Standard Package'),
          plan ? plan.durationDays : 365
        );
      }
    });
    setSelectedLeadIds(new Set<string>());
    showToast?.({
      type: 'success',
      title: language === 'ar' ? 'تم اعتماد الطلبات' : language === 'fr' ? 'Dossiers validés' : 'Leads Converted',
      message: `${targetIds.length} ${
        language === 'ar' ? 'طلب تم تحويلهم بنجاح' : language === 'fr' ? 'demandes approuvées et inscrites' : 'leads approved and converted'
      }.`,
    });
  }, [selectedLeadIds, plans, leads, convertLeadToMember, showToast, language]);

  const handleBatchDelete = useCallback(() => {
    const targetIds = Array.from(selectedLeadIds);
    if (deleteLead) targetIds.forEach((id) => deleteLead(id));
    else targetIds.forEach((id) => updateLeadStatus(id, 'Declined'));
    setSelectedLeadIds(new Set<string>());
    showToast?.({
      type: 'warning',
      title: language === 'ar' ? 'حذف من السجل' : language === 'fr' ? 'Suppression effectuée' : 'Leads Removed',
      message: `${targetIds.length} ${
        language === 'ar' ? 'طلب تم حذفه من السجل' : language === 'fr' ? 'demandes supprimées' : 'leads removed'
      }.`,
    });
  }, [selectedLeadIds, deleteLead, updateLeadStatus, showToast, language]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      language === 'ar' ? 'مقدم الطلب' : language === 'fr' ? 'Candidat' : 'Applicant Name',
      language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone',
      language === 'ar' ? 'البريد الإلكتروني' : language === 'fr' ? 'E-mail' : 'Email',
      language === 'ar' ? 'الباقة المفضلة' : language === 'fr' ? 'Formule souhaitée' : 'Preferred Plan',
      language === 'ar' ? 'قناة الاستقطاب' : language === 'fr' ? "Canal d'acquisition" : 'Source',
      language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      language === 'ar' ? 'تاريخ التقديم' : language === 'fr' ? 'Date de soumission' : 'Submitted Date',
    ];
    const rows = sortedLeads.map((l) => [
      l.fullName,
      l.phoneNumber,
      l.email,
      l.preferredPlanName || plans[0]?.name || 'Standard Package',
      l.source,
      localizeStatus(l.status, language),
      resolveRecordBranch(l, branchesById, currentBranch, language).name,
      new Date(l.createdAt).toLocaleDateString(),
    ]);
    downloadCsvSafe(`atrium-leads-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [sortedLeads, language, plans, branchesById, currentBranch]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter('All');
    setPlanFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = planFilter !== 'All' || branchFilter !== 'All' || statusFilter === 'Declined';
  const activeFiltersCount =
    (planFilter !== 'All' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0) +
    (statusFilter === 'Declined' ? 1 : 0);

  const leadColumns = useMemo<ColumnDefinition<RegistrationLead>[]>(() => [
    {
      key: 'applicant',
      header: language === 'ar' ? 'مقدم الطلب' : language === 'fr' ? 'Candidat / Prospect' : 'Applicant',
      sortable: true,
      renderCell: (lead) => {
        const isPinned = pinnedLeadIds.has(lead.id);
        return (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={lead.fullName} size={36} />
            <div className="min-w-0">
              <div className="t-label font-semibold text-black dark:text-white truncate flex items-center gap-2">
                <span>{lead.fullName}</span>
                {isPinned && <Pin size={11} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />}
              </div>
              <div className="t-cap text-black/62 dark:text-white/70 truncate">
                {lead.phoneNumber} · {lead.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'plan',
      header: language === 'ar' ? 'الباقة المفضلة' : language === 'fr' ? 'Formule souhaitée' : `Preferred ${terminology.plan}`,
      sortable: true,
      renderCell: (lead) => (
        <span className="inline-block px-2 py-1 rounded-full bg-[#d4522f]/10 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] t-small font-semibold border border-[#d4522f]/20 truncate max-w-full">
          {lead.preferredPlanName || plans[0]?.name || 'Standard Package'}
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      sortable: true,
      renderCell: (lead) => {
        const isApp = lead.status === 'Approved';
        const isDec = lead.status === 'Declined';
        return (
          <span
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold ${
              isApp
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : isDec
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isApp ? 'bg-emerald-500' : isDec ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            />
            {localizeStatus(lead.status, language)}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: language === 'ar' ? 'التاريخ والاستقطاب' : language === 'fr' ? 'Date & Canal' : 'Date & Source',
      sortable: true,
      renderCell: (lead) => (
        <div className="tabular-nums">
          <span className="t-small font-medium text-black dark:text-white block">
            {new Date(lead.createdAt).toLocaleDateString()}
          </span>
          <span className="t-cap text-black/62 dark:text-white/65 truncate block">
            {lead.source}
          </span>
        </div>
      ),
    },
    {
      key: 'branch',
      header: language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      sortable: true,
      renderCell: (lead) => (
        <span className="t-small font-medium text-black/80 dark:text-white/85 truncate block">
          {resolveRecordBranch(lead, branchesById, currentBranch, language).name}
        </span>
      ),
    },
  ], [language, pinnedLeadIds, terminology.plan, plans, branchesById, currentBranch]);

  const statusOptions = useMemo(() => [
    {
      value: 'All',
      label: t('member_filter_all', language),
      count: leads.length,
    },
    {
      value: 'Pending',
      label: language === 'ar' ? 'منتظر' : language === 'fr' ? 'Attente' : 'Pending',
      count: pendingCount,
    },
    {
      value: 'Approved',
      label: language === 'ar' ? 'معتمد' : language === 'fr' ? 'Approuvé' : 'Approved',
      count: approvedCount,
    },
  ], [language, leads.length, pendingCount, approvedCount]);

  const filterSections = useMemo<KineticFilterSection[]>(() => [
    {
      id: 'branch',
      label: language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      value: branchFilter,
      onChange: setBranchFilter,
      kind: 'tiles',
      columns: 2,
      options: [
        {
          value: 'All',
          label: language === 'ar' ? 'كل الفروع' : language === 'fr' ? 'Toutes les branches' : 'All Branches',
          count: leads.length,
        },
        ...branchOptionsWithCounts,
      ],
    },
    {
      id: 'plan',
      label: t('member_filter_plan_label', language),
      value: planFilter,
      onChange: setPlanFilter,
      kind: 'tiles',
      columns: 2,
      options: [
        {
          value: 'All',
          label: t('member_filter_all_plans', language),
          count: leads.length,
        },
        ...plans.map((p) => ({
          value: p.id,
          label: compactFilterLabel(p.name).label,
          tooltip: p.name,
        })),
      ],
    },
    {
      id: 'status',
      label: language === 'ar' ? 'حالة الطلب' : language === 'fr' ? 'Statut du dossier' : 'Request Status',
      value: statusFilter,
      onChange: setStatusFilter,
      kind: 'segmented',
      options: [
        ...statusOptions,
        {
          value: 'Declined',
          label: language === 'ar' ? 'مرفوض' : language === 'fr' ? 'Refusé' : 'Declined',
          count: declinedCount,
        },
      ],
    },
  ], [language, branchFilter, leads.length, branchOptionsWithCounts, planFilter, plans, statusFilter, statusOptions, declinedCount]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    }
    if (planFilter !== 'All') {
      const fullName = plans.find((p) => p.id === planFilter)?.name || planFilter;
      chips.push({
        key: 'plan',
        label: compactFilterLabel(fullName).label,
        title: fullName,
        onRemove: () => setPlanFilter('All'),
      });
    }
    if (statusFilter === 'Declined') {
      chips.push({
        key: 'status',
        label: localizeStatus('Declined', language),
        onRemove: () => setStatusFilter('All'),
      });
    }
    return chips;
  }, [branchFilter, planFilter, plans, statusFilter, language]);

  const getRowMeta = useCallback(
    (lead: RegistrationLead): Partial<KineticRowData> => {
      const planLabel = lead.preferredPlanName || plans[0]?.name || 'Standard Package';
      const branch = resolveRecordBranch(lead, branchesById, currentBranch, language);
      const statusVariant: KineticRowData['statusVariant'] =
        lead.status === 'Approved' ? 'active' : lead.status === 'Declined' ? 'blocked' : 'warning';
      return {
        subline: lead.phoneNumber || lead.email,
        categoryLabel: planLabel,
        statusLabel: localizeStatus(lead.status, language),
        statusVariant,
        metricPrimary: new Date(lead.createdAt).toLocaleDateString(),
        metricSecondary: lead.source || 'Direct',
        detailCol1: {
          heading: language === 'ar' ? 'بيانات المتقدم' : language === 'fr' ? 'Coordonnées' : 'Applicant Info',
          primaryText: lead.phoneNumber || '—',
          secondaryText: lead.email || '—',
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: language === 'ar' ? 'الاشتراك المطلوب' : language === 'fr' ? 'Formule & Canal' : 'Requested Plan',
          primaryText: planLabel,
          secondaryText: `${language === 'ar' ? 'القناة:' : language === 'fr' ? 'Source :' : 'Source:'} ${lead.source}`,
          tertiaryText: `${language === 'ar' ? 'البدء:' : language === 'fr' ? 'Début :' : 'Start:'} ${
            lead.preferredStartDate || (language === 'ar' ? 'فوري' : 'Immédiat')
          }`,
        },
        detailCol3: {
          heading: language === 'ar' ? 'ملاحظات الطلب' : language === 'fr' ? 'Notes du prospect' : 'Notes',
          primaryText: localizeStatus(lead.status, language),
          secondaryText: lead.notes || (language === 'ar' ? 'طلب جاهز للمراجعة' : 'Dossier prêt pour validation'),
        },
      };
    },
    [plans, branchesById, currentBranch, language]
  );

  const getFanActions = useCallback(
    (lead: RegistrationLead): KineticRowFanAction[] => [
      ...(lead.status === 'Pending'
        ? [
            {
              id: 'convert',
              label: language === 'ar' ? 'اعتماد' : language === 'fr' ? 'Valider & Inscrire' : 'Convert',
              icon: <UserCheck className="w-[15px] h-[15px]" />,
              onClick: () => handleStartConversion(lead),
            },
          ]
        : [
            {
              id: 'view',
              label: language === 'ar' ? 'عرض' : language === 'fr' ? 'Fiche' : 'View',
              icon: <Eye className="w-[15px] h-[15px]" />,
              onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                setDrawerOpenerEl(e.currentTarget);
                setSelectedLead(lead);
              },
            },
          ]),
      {
        id: 'del',
        label: language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete',
        icon: <X className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          if (deleteLead) deleteLead(lead.id);
          else updateLeadStatus(lead.id, 'Declined');
        },
      },
    ],
    [language, handleStartConversion, deleteLead, updateLeadStatus]
  );

  const getDetailActions = useCallback(
    (lead: RegistrationLead): KineticDetailAction[] => [
      {
        id: 'view',
        label: language === 'ar' ? 'معاينة' : language === 'fr' ? 'Fiche complète' : 'Details',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => setSelectedLead(lead),
      },
      ...(lead.status === 'Pending'
        ? [
            {
              id: 'convert',
              label: language === 'ar' ? 'اعتماد' : language === 'fr' ? 'Convertir' : 'Convert',
              icon: <UserCheck className="w-3.5 h-3.5 text-[#096b40]" />,
              onClick: () => handleStartConversion(lead),
            },
            {
              id: 'decline',
              label: language === 'ar' ? 'رفض' : language === 'fr' ? 'Refuser' : 'Decline',
              icon: <X className="w-3.5 h-3.5 text-[#c0283d]" />,
              onClick: () => updateLeadStatus(lead.id, 'Declined'),
            },
          ]
        : []),
    ],
    [language, handleStartConversion, updateLeadStatus]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: leads.length > 0,
  });

  if (showSkeleton && (leads.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  const conversionRate = leads.length > 0 ? Math.round((approvedCount / leads.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      <ScreenHeaderBar
        icon={<ClipboardList size={22} />}
        title={terminology.registration}
        primaryAction={{
          label: t('reg_add_lead', language),
          onClick: onAddLead,
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-lead',
        }}
      />

      <ScreenKpiBanner
        heading={t('reg_pipeline_health_title', language)}
        language={language}
        primaryCard={{
          label: t('reg_converted_members_label', language),
          badgeText: `↗ ${conversionRate}% ${language === 'ar' ? 'تحويل' : language === 'fr' ? 'Convertis' : 'Converted'}`,
          count: approvedCount,
          tone: 'emerald',
          isActive: statusFilter === 'Approved',
          onToggle: () => setStatusFilter((prev) => (prev === 'Approved' ? 'All' : 'Approved')),
        }}
        secondaryCard={{
          label: t('reg_active_intake_label', language),
          badgeText: language === 'ar' ? 'قيد المراجعة' : language === 'fr' ? 'en attente' : 'pending review',
          count: pendingCount,
          tone: 'terracotta',
          isActive: statusFilter === 'Pending',
          onToggle: () => setStatusFilter((prev) => (prev === 'Pending' ? 'All' : 'Pending')),
        }}
        darkCard={{
          label: t('reg_intake_sla_label', language),
          badgePrefix: '+',
          badgeCount: leads.length,
          badgeSuffix: language === 'ar' ? 'طلب' : language === 'fr' ? 'dossiers' : 'leads',
          valuePrefix: '',
          valueCount: 15,
          valueSuffix: ' min',
          caption:
            language === 'ar'
              ? 'بوابة التسجيل الذاتي وموقع الجوال'
              : language === 'fr'
              ? 'Borne libre-service & web mobile'
              : 'Self-service Kiosk & Mobile Web',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={`${terminology.registration} ${t('reg_requests_title', language)}`}
          liveRegionText={`${sortedLeads.length} ${language === 'ar' ? 'سجل' : language === 'fr' ? 'dossiers' : 'leads'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            language === 'ar'
              ? 'بحث باسم المتقدم، الهاتف...'
              : language === 'fr'
              ? 'Rechercher nom, tél, e-mail...'
              : 'Search applicant name, phone, email...'
          }
          statusOptions={statusOptions}
          statusValue={statusFilter === 'Declined' ? 'All' : statusFilter}
          onStatusChange={setStatusFilter}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<RegistrationLead>
          items={sortedLeads}
          keyExtractor={(lead) => lead.id}
          viewMode={viewMode}
          hideToolbar
          openItemId={selectedLead?.id ?? null}
          columns={leadColumns}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
          pinnedIds={pinnedLeadIds}
          onPinToggle={handleTogglePinLead}
          onItemClick={(lead, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedLead(lead);
          }}
          onViewDetails={(lead, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedLead(lead);
          }}
          onDelete={(lead) => {
            if (deleteLead) deleteLead(lead.id);
            else updateLeadStatus(lead.id, 'Declined');
          }}
          bulkSecondaryAction={{
            label: language === 'ar' ? 'اعتماد وتحويل' : language === 'fr' ? 'Valider sélection' : 'Approve Selected',
            icon: <UserCheck size={13} />,
            onClick: handleBatchApprove,
            variant: 'primary',
          }}
          onBulkDelete={handleBatchDelete}
          sortBy={leadSortBy}
          sortDirection={leadSortDir}
          onSortChange={(colKey, dir) => {
            setLeadSortBy(colKey);
            setLeadSortDir(dir);
          }}
          customActions={(lead) =>
            lead.status === 'Pending'
              ? [
                  {
                    label: language === 'ar' ? 'اعتماد وتحويل' : language === 'fr' ? 'Valider' : 'Convert',
                    icon: <UserCheck size={13} />,
                    onClick: () => handleStartConversion(lead),
                  },
                ]
              : [
                  {
                    label: language === 'ar' ? 'معاينة' : language === 'fr' ? 'Fiche' : 'View',
                    icon: <Eye size={13} />,
                    onClick: () => setSelectedLead(lead),
                  },
                ]
          }
          emptyTitle={
            language === 'ar'
              ? 'لا توجد طلبات تسجيل'
              : language === 'fr'
              ? "Aucune demande d'inscription"
              : 'No Registration Requests'
          }
          emptyDescription={
            language === 'ar'
              ? 'لا توجد طلبات تطابق الفلتر الحالي'
              : language === 'fr'
              ? 'Aucun prospect ne correspond aux critères actuels.'
              : 'No intake leads match current filters.'
          }
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || statusFilter !== 'All' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedLeads.length}
        entityPluralLabel={language === 'ar' ? 'طلبات' : language === 'fr' ? 'dossiers' : 'leads'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<RegistrationLead>
        isOpen={selectedLead !== null}
        item={selectedLead}
        allItems={sortedLeads}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedLead?.fullName || ''}
        subtitle={selectedLead ? `${selectedLead.phoneNumber} · ${selectedLead.email}` : undefined}
        avatarText={selectedLead ? selectedLead.fullName.slice(0, 2).toUpperCase() : undefined}
        branchName={
          selectedLead
            ? resolveRecordBranch(selectedLead, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={selectedLead ? localizeStatus(selectedLead.status, language) : undefined}
        statusClassName={
          selectedLead?.status === 'Approved'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : selectedLead?.status === 'Declined'
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'overview', label: language === 'ar' ? 'المرشح' : language === 'fr' ? 'Aperçu candidat' : 'Overview' },
          { id: 'plan', label: language === 'ar' ? 'الباقة المفضلة' : language === 'fr' ? 'Formule & Canal' : 'Preferred Plan' },
          { id: 'tracking', label: language === 'ar' ? 'المتابعة' : language === 'fr' ? 'Historique' : 'Tracking' },
        ]}
        holdToDelete={Boolean(deleteLead)}
        onClose={() => setSelectedLead(null)}
        onSelectItem={(lead) => setSelectedLead(lead)}
        onDelete={
          deleteLead
            ? (lead) => {
                deleteLead(lead.id);
                setSelectedLead(null);
              }
            : undefined
        }
        renderBody={(lead, activeTab) => {
          const planLabel = lead.preferredPlanName || plans[0]?.name || 'Standard Package';
          if (activeTab === 'plan') {
            return (
              <>
                <InspectorSection index={0} title={language === 'ar' ? 'الاشتراك المطلوب' : language === 'fr' ? 'Formule choisie' : 'Selected Plan'}>
                  <InspectorCard>
                    <InspectorKeyValue label={t('member_field_plan_package', language)} value={planLabel} mono={false} tone="accent" />
                    <InspectorKeyValue label={language === 'ar' ? 'قناة الاستقطاب' : 'Source'} value={lead.source} mono={false} />
                    <InspectorKeyValue
                      label={language === 'ar' ? 'تاريخ البدء' : 'Début souhaité'}
                      value={lead.preferredStartDate || (language === 'ar' ? 'فوري' : 'Immédiat')}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
                {lead.status === 'Pending' && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={language === 'ar' ? 'تحويل إلى مشترك الآن' : language === 'fr' ? "Valider l'adhésion & Créer" : 'Convert to Active Member'}
                      icon={<UserCheck className="w-4 h-4" />}
                      tone="accent"
                      onClick={() => handleStartConversion(lead)}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }

          if (activeTab === 'tracking') {
            return (
              <InspectorSection index={0} title={language === 'ar' ? 'سجل الطلب' : language === 'fr' ? 'Journal d’admission' : 'Intake Log'}>
                <InspectorCard>
                  <InspectorListItem
                    title={language === 'ar' ? 'تقديم الطلب' : 'Demande soumise'}
                    subtitle={`${new Date(lead.createdAt).toLocaleDateString()} · ${lead.source}`}
                    badge={{ label: localizeStatus(lead.status, language), tone: lead.status === 'Approved' ? 'ok' : lead.status === 'Declined' ? 'danger' : 'warn' }}
                    isLast={!lead.notes}
                  />
                  {lead.notes && (
                    <InspectorListItem title={lead.notes} subtitle={language === 'ar' ? 'ملاحظات المتقدم' : 'Remarques'} isLast />
                  )}
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions rapides' : 'Quick Actions'}>
                <InspectorQuickActions
                  actions={[
                    ...(lead.status === 'Pending'
                      ? [
                          {
                            id: 'convert',
                            label: language === 'ar' ? 'اعتماد وتحويل' : language === 'fr' ? 'Valider adhésion' : 'Convert',
                            icon: <UserCheck className="w-[18px] h-[18px]" />,
                            primary: true,
                            onClick: () => handleStartConversion(lead),
                          },
                          {
                            id: 'decline',
                            label: language === 'ar' ? 'رفض الطلب' : language === 'fr' ? 'Refuser dossier' : 'Decline',
                            icon: <X className="w-[18px] h-[18px] text-[#c0283d]" />,
                            onClick: () => {
                              updateLeadStatus(lead.id, 'Declined');
                              setSelectedLead(null);
                            },
                          },
                        ]
                      : []),
                    {
                      id: 'call',
                      label: language === 'ar' ? 'نسخ الهاتف' : language === 'fr' ? 'Copier Tél.' : 'Copy Phone',
                      icon: <Phone className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        navigator.clipboard?.writeText(lead.phoneNumber);
                        showToast?.({ type: 'success', title: 'Copié', message: lead.phoneNumber });
                      },
                    },
                    {
                      id: 'mail',
                      label: language === 'ar' ? 'نسخ الإيميل' : language === 'fr' ? 'Copier E-mail' : 'Copy Email',
                      icon: <Mail className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        navigator.clipboard?.writeText(lead.email);
                        showToast?.({ type: 'success', title: 'Copié', message: lead.email });
                      },
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={language === 'ar' ? 'بيانات الاتصال' : language === 'fr' ? 'Contact & Préférences' : 'Contact Info'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={language === 'ar' ? 'الهاتف' : 'Téléphone'}
                    icon={<Phone className="w-[15px] h-[15px]" />}
                    value={lead.phoneNumber || '—'}
                    copyText={lead.phoneNumber}
                    onCopied={(v) => showToast?.({ type: 'success', title: 'Copié', message: v })}
                  />
                  <InspectorKeyValue
                    label="E-mail"
                    icon={<Mail className="w-[15px] h-[15px]" />}
                    value={lead.email || '—'}
                    copyText={lead.email}
                    onCopied={(v) => showToast?.({ type: 'success', title: 'Copié', message: v })}
                  />
                  <InspectorKeyValue
                    label={language === 'ar' ? 'الباقة المطلوبة' : 'Formule souhaitée'}
                    value={planLabel}
                    tone="accent"
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={language === 'ar' ? 'تاريخ البدء' : 'Début souhaité'}
                    icon={<Calendar className="w-[15px] h-[15px]" />}
                    value={lead.preferredStartDate || (language === 'ar' ? 'فوري' : 'Immédiat')}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />

      <Modal
        isOpen={conversionLead !== null}
        onClose={() => setConversionLead(null)}
        title={
          language === 'ar'
            ? 'اعتماد العضوية وتسجيل المشترك'
            : language === 'fr'
            ? "Valider l'adhésion et créer l'adhérent"
            : 'Convert Lead to Active Member'
        }
        subtitle={
          language === 'ar'
            ? `ترقية ${conversionLead?.fullName} إلى مشترك رسمي في ${currentBranch?.name || 'الفرع'}`
            : language === 'fr'
            ? `Finaliser l'inscription de ${conversionLead?.fullName} au sein de ${currentBranch?.name || 'Atrium 1'}`
            : `Promote ${conversionLead?.fullName} to official member status in ${currentBranch?.name || 'Atrium 1'}`
        }
      >
        {conversionLead && (
          <div className="space-y-4">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-4 bg-[#FBF8F5] dark:bg-[#262422] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] t-cap space-y-1"
            >
              <div>
                <strong className="text-black dark:text-white">
                  {language === 'ar' ? 'المتقدم:' : language === 'fr' ? 'Candidat :' : 'Applicant:'}
                </strong>{' '}
                {conversionLead.fullName}
              </div>
              <div>
                <strong className="text-black dark:text-white">
                  {language === 'ar' ? 'الهاتف:' : language === 'fr' ? 'Téléphone :' : 'Phone:'}
                </strong>{' '}
                {conversionLead.phoneNumber} · {conversionLead.email}
              </div>
              <div>
                <strong className="text-black dark:text-white">
                  {language === 'ar' ? 'القناة:' : language === 'fr' ? 'Canal :' : 'Source:'}
                </strong>{' '}
                {conversionLead.source}
              </div>
            </div>
            <div>
              <LabelSelect
                field="MembershipPlan"
                label={`${t('member_field_plan_package', language)} *`}
                value={selectedPlanId}
                onChange={(val) => setSelectedPlanId(val?.target?.value ?? String(val))}
                options={plans.map((p) => ({
                  value: p.id,
                  label: p.name,
                  sublabel: `${p.durationDays} ${t('member_days_unit', language)} · ${p.price.amount.toLocaleString()} ${
                    language === 'ar' ? 'د.ج' : 'DA'
                  }`,
                }))}
                searchable
                width="100%"
                height={46}
                corner={12}
              />
            </div>
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-3 bg-[#d4522f]/10 [--sq-stroke:rgba(212,82,47,0.2)] t-cap text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]"
            >
              {language === 'ar'
                ? 'عند التأكيد، سيتم إنشاء معرف بطاقة RFID تلقائياً، واعتماد الطلب، وتسجيل المشترك مباشرة.'
                : language === 'fr'
                ? "Dès validation, un badge RFID unique sera attribué, le dossier sera approuvé et l'adhérent actif immédiatement."
                : 'Upon confirmation, a unique RFID card credential will be generated automatically, the lead will be marked Approved, and the member will be enrolled immediately.'}
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <AtriumButton type="button" variant="ghost" onClick={() => setConversionLead(null)}>
                <span>{t('action_cancel', language)}</span>
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="primary"
                onClick={handleConfirmConversion}
                icon={<Check size={15} />}
              >
                <span>
                  {language === 'ar'
                    ? 'تأكيد وإنشاء المشترك'
                    : language === 'fr'
                    ? "Confirmer & Créer l'adhérent"
                    : 'Confirm & Create Member'}
                </span>
              </AtriumButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
});

MembershipRegistrationsView.displayName = 'MembershipRegistrationsView';
export const RegistrationsScreen = MembershipRegistrationsView;
