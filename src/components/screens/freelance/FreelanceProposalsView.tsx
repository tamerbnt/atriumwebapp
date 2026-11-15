import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  CheckCircle,
  Calendar,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceProposal, PricingModel, CurrencyCode } from '../../../types/index';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const FreelanceProposalsView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    freelanceProposals,
    createFreelanceProposal,
    updateFreelanceProposal,
    deleteFreelanceProposal,
    convertProposalToProject,
    branches,
    currentBranch,
    setScreen,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
  } = useAtriumStore();

  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedProposalIds, setPinnedProposalIds] = useState<Set<string>>(() => new Set<string>());
  const [proposalSortBy, setProposalSortBy] = useState<string>('title');
  const [proposalSortDir, setProposalSortDir] = useState<'asc' | 'desc'>('asc');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedProposal, setSelectedProposal] = useState<FreelanceProposal | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [proposalToEdit, setProposalToEdit] = useState<FreelanceProposal | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<FreelanceProposal | null>(null);

  const [editFormData, setEditFormData] = useState<{
    clientName: string;
    clientCompany: string;
    clientEmail: string;
    title: string;
    overview: string;
    scopeItems: string[];
    pricingModel: PricingModel;
    proposedBudget: number;
    currency: CurrencyCode;
    estimatedTimelineWeeks: number;
    validUntil: string;
  }>({
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    title: '',
    overview: '',
    scopeItems: [],
    pricingModel: 'Fixed',
    proposedBudget: 0,
    currency: 'DZD',
    estimatedTimelineWeeks: 4,
    validUntil: '',
  });

  const [formData, setFormData] = useState({
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    title: '',
    overview: '',
    scopeItems:
      language === 'ar'
        ? [
            'دراسة المتطلبات وهندسة تجربة المستخدم',
            'تصميم واجهات المستخدم عالية الدقة على Figma',
            'تطوير النظام البرمجي المتكامل واختبارات الجودة',
          ]
        : language === 'fr'
        ? [
            'Analyse des besoins & parcours',
            'Conception UI haute-fidélité sur Figma',
            'Ingénierie full-stack & tests unitaires',
          ]
        : [
            'Discovery & user journey architecture',
            'High-fidelity Figma UI design',
            'Full-stack engineering & unit tests',
          ],
    pricingModel: 'Fixed' as PricingModel,
    proposedBudget: 250000,
    currency: 'DZD' as CurrencyCode,
    estimatedTimelineWeeks: 4,
    validUntil: new Date(Date.now() + 1814400000).toISOString().split('T')[0],
  });

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    freelanceProposals.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [freelanceProposals, branchesById, currentBranch, language]);

  const filteredProposals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return freelanceProposals.filter((p) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (q) {
        const matches =
          p.title.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          (p.clientCompany && p.clientCompany.toLowerCase().includes(q)) ||
          p.overview.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [freelanceProposals, branchFilter, statusFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedProposals = useMemo(() => {
    return [...filteredProposals].sort((a, b) => {
      const aPinned = pinnedProposalIds.has(a.id);
      const bPinned = pinnedProposalIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (proposalSortBy === 'title') {
        const cmp = a.title.localeCompare(b.title);
        return proposalSortDir === 'asc' ? cmp : -cmp;
      }
      if (proposalSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return proposalSortDir === 'asc' ? cmp : -cmp;
      }
      if (proposalSortBy === 'client') {
        const cmp = a.clientName.localeCompare(b.clientName);
        return proposalSortDir === 'asc' ? cmp : -cmp;
      }
      if (proposalSortBy === 'budget') {
        return proposalSortDir === 'asc'
          ? a.proposedBudget - b.proposedBudget
          : b.proposedBudget - a.proposedBudget;
      }
      if (proposalSortBy === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return proposalSortDir === 'asc' ? cmp : -cmp;
      }
      if (proposalSortBy === 'validUntil') {
        const cmp = a.validUntil.localeCompare(b.validUntil);
        return proposalSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [
    filteredProposals,
    pinnedProposalIds,
    proposalSortBy,
    proposalSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const activeProposal = useMemo(() => {
    if (!selectedProposal) return null;
    return freelanceProposals.find((p) => p.id === selectedProposal.id) || selectedProposal;
  }, [selectedProposal, freelanceProposals]);

  const draftOrPendingProposals = useMemo(
    () => freelanceProposals.filter((p) => p.status === 'Pending'),
    [freelanceProposals]
  );
  const acceptedProposals = useMemo(
    () => freelanceProposals.filter((p) => p.status === 'Accepted'),
    [freelanceProposals]
  );
  const pipelineValue = useMemo(
    () => draftOrPendingProposals.reduce((sum, p) => sum + (Number(p.proposedBudget) || 0), 0),
    [draftOrPendingProposals]
  );
  const wonValue = useMemo(
    () => acceptedProposals.reduce((sum, p) => sum + (Number(p.proposedBudget) || 0), 0),
    [acceptedProposals]
  );

  const handleScopeItemChange = (index: number, val: string) => {
    const next = [...formData.scopeItems];
    next[index] = val;
    setFormData({ ...formData, scopeItems: next });
  };

  const handleAddScopeItem = () => {
    setFormData({ ...formData, scopeItems: [...formData.scopeItems, ''] });
  };

  const handleRemoveScopeItem = (index: number) => {
    setFormData({
      ...formData,
      scopeItems: formData.scopeItems.filter((_, i) => i !== index),
    });
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim() || !formData.title.trim()) return;
    createFreelanceProposal({
      clientName: formData.clientName,
      clientCompany: formData.clientCompany,
      clientEmail: formData.clientEmail,
      title: formData.title,
      overview: formData.overview,
      scopeItems: formData.scopeItems.filter((s) => s.trim().length > 0),
      pricingModel: formData.pricingModel,
      proposedBudget: Number(formData.proposedBudget),
      currency: formData.currency,
      estimatedTimelineWeeks: Number(formData.estimatedTimelineWeeks),
      validUntil: formData.validUntil,
      status: 'Pending',
    });
    setIsDraftModalOpen(false);
  };

  const handleOpenEditModal = useCallback((prop: FreelanceProposal) => {
    setProposalToEdit(prop);
    setEditFormData({
      clientName: prop.clientName,
      clientCompany: prop.clientCompany || '',
      clientEmail: prop.clientEmail,
      title: prop.title,
      overview: prop.overview,
      scopeItems: [...prop.scopeItems],
      pricingModel: prop.pricingModel,
      proposedBudget: prop.proposedBudget,
      currency: prop.currency,
      estimatedTimelineWeeks: prop.estimatedTimelineWeeks,
      validUntil: prop.validUntil,
    });
  }, []);

  const handleEditProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalToEdit || !editFormData.clientName.trim() || !editFormData.title.trim()) return;
    updateFreelanceProposal(proposalToEdit.id, {
      clientName: editFormData.clientName,
      clientCompany: editFormData.clientCompany,
      clientEmail: editFormData.clientEmail,
      title: editFormData.title,
      overview: editFormData.overview,
      scopeItems: editFormData.scopeItems.filter((s) => s.trim().length > 0),
      pricingModel: editFormData.pricingModel,
      proposedBudget: Number(editFormData.proposedBudget),
      currency: editFormData.currency,
      estimatedTimelineWeeks: Number(editFormData.estimatedTimelineWeeks),
      validUntil: editFormData.validUntil,
    });
    setProposalToEdit(null);
  };

  const handleConvert = useCallback(
    (proposalId: string) => {
      try {
        convertProposalToProject(proposalId);
        setScreen('scheduler');
      } catch (err: any) {
        showToast({
          type: 'error',
          title: isAr ? 'تعذر التحويل' : isFr ? 'Erreur' : 'Conversion failed',
          message: String(err?.message || err),
        });
      }
    },
    [convertProposalToProject, setScreen, isAr, isFr]
  );

  const proposalColumns: ColumnDefinition<FreelanceProposal>[] = useMemo(
    () => [
      {
        key: 'title',
        header: isAr
          ? 'عرض السعر والعميل'
          : isFr
          ? 'Proposition & Client'
          : 'Proposal & Client',
        width: '2.4*',
        minWidth: '210px',
        sortable: true,
        renderCell: (proposal) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate hover:text-[#d4522f] transition-colors">
                {proposal.title}
              </div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate flex items-center gap-1.5">
                <span>{proposal.clientName}</span>
                {proposal.clientCompany && (
                  <>
                    <span>·</span>
                    <span className="text-[#d4522f] font-medium">{proposal.clientCompany}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '120px',
        sortable: true,
        renderCell: (proposal) => {
          const bInfo = resolveRecordBranch(proposal, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'budget',
        header: isAr
          ? 'الميزانية المقترحة'
          : isFr
          ? 'Budget Proposé'
          : 'Proposed Budget',
        width: '1.8*',
        minWidth: '140px',
        sortable: true,
        renderCell: (proposal) => (
          <div>
            <span className="font-bold text-black dark:text-white tabular-nums block">
              {formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55">
              {proposal.pricingModel} · {proposal.estimatedTimelineWeeks}{' '}
              {isAr ? 'أسابيع' : 'wks'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isFr ? 'Statut' : 'Status',
        width: '1.5*',
        minWidth: '120px',
        sortable: true,
        renderCell: (proposal) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              proposal.status === 'Accepted'
                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : proposal.status === 'Declined'
                ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {proposal.status === 'Accepted'
              ? isAr
                ? 'موقّع ونشط'
                : isFr
                ? 'Signé & Actif'
                : 'Signed & Active'
              : proposal.status === 'Declined'
              ? t('free_prop_status_rejected', language)
              : isAr
              ? 'بانتظار المراجعة'
              : isFr
              ? 'En attente'
              : 'Pending'}
          </span>
        ),
      },
      {
        key: 'validUntil',
        header: isAr ? 'صالح حتى' : isFr ? 'Validité' : 'Valid Until',
        width: '1.4*',
        minWidth: '115px',
        sortable: true,
        renderCell: (proposal) => (
          <div className="flex items-center gap-1.5 text-xs text-black/70 dark:text-white/75">
            <Calendar size={12} className="text-black/55 dark:text-white/55" />
            <span>{proposal.validUntil}</span>
          </div>
        ),
      },
    ],
    [language, t, branchesById, currentBranch, isAr, isFr]
  );

  const handleExportCSV = useCallback(() => {
    if (sortedProposals.length === 0) return;
    const headers = [
      isAr ? 'معرف العرض' : 'Proposal ID',
      isAr ? 'العنوان' : 'Title',
      isAr ? 'العميل' : 'Client',
      isAr ? 'الشركة' : 'Company',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'البريد الإلكتروني' : 'Email',
      isAr ? 'نموذج التسعير' : 'Pricing Model',
      isAr ? 'الميزانية المقترحة' : 'Proposed Budget',
      isAr ? 'العملة' : 'Currency',
      isAr ? 'الجدول الزمني (أسابيع)' : 'Timeline Weeks',
      isAr ? 'الحالة' : 'Status',
      isAr ? 'صالح حتى' : 'Valid Until',
    ];
    const rows = sortedProposals.map((p) => [
      p.id,
      p.title,
      p.clientName,
      p.clientCompany || '',
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
      p.clientEmail,
      p.pricingModel,
      p.proposedBudget,
      p.currency,
      p.estimatedTimelineWeeks,
      p.status,
      p.validUntil,
    ]);
    downloadCsvSafe(
      `atrium_freelance_proposals_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [sortedProposals, branchesById, currentBranch, language, isAr, isFr]);

  const handleBatchAccept = () => {
    if (selectedProposalIds.size === 0) return;
    selectedProposalIds.forEach((id) => {
      updateFreelanceProposal(id, { status: 'Accepted' });
    });
    const count = selectedProposalIds.size;
    setSelectedProposalIds(new Set());
    showToast({
      type: 'success',
      title: isAr ? 'تم التحديث' : isFr ? 'Mis à jour' : 'Updated',
      message: `${count} ${isAr ? 'عروض أسعار تم قبولها' : 'proposals marked as Accepted'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDecline = () => {
    if (selectedProposalIds.size === 0) return;
    selectedProposalIds.forEach((id) => {
      updateFreelanceProposal(id, { status: 'Declined' });
    });
    const count = selectedProposalIds.size;
    setSelectedProposalIds(new Set());
    showToast({
      type: 'info',
      title: isAr ? 'تم التحديث' : isFr ? 'Mis à jour' : 'Updated',
      message: `${count} ${isAr ? 'عروض أسعار تم رفضها' : 'proposals marked as Declined'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDelete = () => {
    if (selectedProposalIds.size === 0) return;
    const count = selectedProposalIds.size;
    selectedProposalIds.forEach((id) => {
      deleteFreelanceProposal(id);
      if (selectedProposal?.id === id) setSelectedProposal(null);
    });
    setSelectedProposalIds(new Set());
    showToast({
      type: 'info',
      title: isAr ? 'تم الحذف' : isFr ? 'Suppression' : 'Deleted',
      message: `${count} ${isAr ? 'عروض أسعار تم حذفها' : 'proposals deleted'}`,
      category: 'freelance_solo',
    });
  };

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('common_all', language) },
      { value: 'Pending', label: isAr ? 'بانتظار المراجعة' : isFr ? 'En attente' : 'Pending' },
      { value: 'Accepted', label: isAr ? 'موقّع' : isFr ? 'Signé' : 'Accepted' },
      { value: 'Declined', label: t('free_prop_status_rejected', language) },
    ],
    [t, language, isAr, isFr]
  );

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      {
        value: 'All',
        label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
        count: freelanceProposals.length,
      },
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
        label: t('common_status', language),
        value: statusFilter,
        onChange: setStatusFilter,
        resetValue: 'all',
        kind: 'segmented',
        options: statusOptions.map((o) => ({ value: o.value, label: String(o.label) })),
      },
    ];
  }, [isAr, isFr, freelanceProposals.length, branchCounts, branchFilter, statusFilter, statusOptions, t, language]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
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
  }, [branchFilter, statusFilter, statusOptions, isAr, isFr]);

  const activeFiltersCount = (branchFilter !== 'All' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: freelanceProposals.length > 0,
  });

  if (showSkeleton && (freelanceProposals.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '150px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<FileText size={22} />}
        title={t('free_prop_title', language)}
        subtitle={`${freelanceProposals.length} ${isAr ? 'عروض' : isFr ? 'devis' : 'proposals'}`}
        primaryAction={{
          label: t('free_prop_btn_new', language),
          onClick: () => setIsDraftModalOpen(true),
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-freelance-proposal',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات العروض التجارية والفرص التعاقدية'
            : isFr
            ? 'Indicateurs des Devis & Opportunités'
            : 'Proposals & Deal Pipeline Indicators'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'عروض قيد المراجعة'
            : isFr
            ? 'Devis en Négociation'
            : 'Pending Review',
          badgeText: `${draftOrPendingProposals.length} ${isAr ? 'عروض' : 'active'}`,
          count: draftOrPendingProposals.length,
          tone: 'emerald',
          isActive: statusFilter === 'Pending',
          onToggle: () => setStatusFilter((prev) => (prev === 'Pending' ? 'all' : 'Pending')),
        }}
        secondaryCard={{
          label: isAr
            ? 'قيمة خط العروض (Pipeline)'
            : isFr
            ? 'Pipeline Devis Actif'
            : 'Active Pipeline',
          badgeText: `${draftOrPendingProposals.length} ${isAr ? 'عرض' : 'devis'}`,
          count: Math.round(pipelineValue),
          formatValue: (n) => formatCurrencyAmount(n, 'EUR'),
          tone: 'terracotta',
          isActive: statusFilter === 'Accepted',
          onToggle: () => setStatusFilter((prev) => (prev === 'Accepted' ? 'all' : 'Accepted')),
        }}
        darkCard={{
          label: isAr
            ? 'عقود موقّعة ومحققة'
            : isFr
            ? 'Contrats Signés & Gagnés'
            : 'Won Contracts Value',
          badgeCount: acceptedProposals.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'عقد' : isFr ? 'gagnés' : 'won',
          valueCount: Math.round(wonValue),
          formatValue: (n) => formatCurrencyAmount(n, 'EUR'),
          caption: isAr
            ? 'قيمة المشاريع المحولة للإنتاج'
            : isFr
            ? 'Volume converti en projets'
            : 'Converted project value',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('free_prop_title', language)}
          liveRegionText={`${sortedProposals.length} ${isAr ? 'عروض' : 'proposals'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث عن عروض الأسعار حسب العنوان أو العميل...'
              : isFr
              ? 'Rechercher devis par titre, client...'
              : 'Search proposals by title, client...'
          }
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
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setStatusFilter('all');
            setSearchQuery('');
          }}
        />

        {selectedProposalIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
              <span className="text-xs font-bold text-black dark:text-white">
                {selectedProposalIds.size}{' '}
                {isAr
                  ? 'عروض محددة'
                  : isFr
                  ? 'devis sélectionnés'
                  : 'proposals selected'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedProposalIds(new Set())}
                className="px-3 py-1.5 text-xs text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
              >
                {isAr ? 'إلغاء التحديد' : isFr ? 'Désélectionner' : 'Deselect'}
              </button>
              <button
                type="button"
                onClick={handleBatchAccept}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle size={13} />
                <span>
                  {isAr ? 'قبول العروض' : isFr ? 'Marquer Accepté' : 'Mark Accepted'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleBatchDecline}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <XCircle size={13} />
                <span>
                  {isAr ? 'رفض العروض' : isFr ? 'Marquer Refusé' : 'Mark Declined'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 size={13} />
                <span>{isAr ? 'حذف المحدد' : isFr ? 'Supprimer' : 'Delete'}</span>
              </button>
            </div>
          </div>
        )}

        <UniversalDataCollection<FreelanceProposal>
          hideToolbar
          data={sortedProposals}
          keyExtractor={(p) => p.id}
          viewMode={viewMode}
          columns={proposalColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={proposalSortBy}
          sortDirection={proposalSortDir}
          onSortChange={(key, dir) => {
            setProposalSortBy(key);
            setProposalSortDir(dir);
          }}
          openItemId={activeProposal?.id ?? null}
          renderCard={(proposal) => (
            <div className="flex flex-col justify-between w-full h-full space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-black/55 dark:text-white/75 uppercase tracking-wider block">
                      {proposal.clientCompany || proposal.clientName}
                    </span>
                    <h3 className="text-sm font-bold text-black dark:text-white mt-0.5 leading-snug">
                      {proposal.title}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      proposal.status === 'Accepted'
                        ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                        : proposal.status === 'Declined'
                        ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200'
                        : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200'
                    }`}
                  >
                    {proposal.status === 'Accepted'
                      ? isAr
                        ? 'موقّع ونشط'
                        : isFr
                        ? 'Signé & Actif'
                        : 'Signed & Active'
                      : proposal.status === 'Declined'
                      ? t('free_prop_status_rejected', language)
                      : isAr
                      ? 'بانتظار المراجعة'
                      : isFr
                      ? 'En attente'
                      : 'Awaiting Review'}
                  </span>
                </div>
                <p className="text-xs text-black/70 dark:text-white/75 mt-2 line-clamp-2 leading-relaxed">
                  {proposal.overview}
                </p>
                <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1 text-[11px]">
                  <span className="text-[10px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider block">
                    {t('free_prop_scope', language)} ({proposal.scopeItems.length})
                  </span>
                  {proposal.scopeItems.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 text-black/70 dark:text-white/75 truncate"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] mt-1 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider block">
                    {t('free_prop_total_quote', language)}
                  </span>
                  <span className="text-base font-black text-[#d4522f] tabular-nums block">
                    {formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
                  </span>
                  <span className="text-[10px] text-black/55 dark:text-white/55">
                    {proposal.estimatedTimelineWeeks}w · {proposal.validUntil}
                  </span>
                </div>
                {proposal.status === 'Pending' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvert(proposal.id);
                    }}
                    className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                  >
                    <CheckCircle size={12} />
                    <span>{t('free_prop_btn_convert', language)}</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>{isAr ? 'مشروع نشط' : 'Active Project'}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          onItemClick={(proposal, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedProposal(proposal);
          }}
          onViewDetails={(proposal, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedProposal(proposal);
          }}
          onEdit={(proposal) => handleOpenEditModal(proposal)}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            const target = freelanceProposals.find((p) => p.id === id);
            setPinnedProposalIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
                if (target) {
                  showToast({
                    type: 'info',
                    title: 'Unpinned',
                    message: `${target.title} unpinned`,
                  });
                }
              } else {
                next.add(id);
                if (target) {
                  showToast({
                    type: 'info',
                    title: 'Pinned',
                    message: `${target.title} pinned to top`,
                  });
                }
              }
              return next;
            });
          }}
          onDelete={(proposal) => setProposalToDelete(proposal)}
          customActions={(proposal) => [
            {
              id: 'convert',
              tooltip: t('free_prop_btn_convert', language),
              icon: <CheckCircle size={13} />,
              iconColor: '#10B981',
              onClick: () => handleConvert(proposal.id),
            },
          ]}
          pinnedIds={pinnedProposalIds}
          selectedIds={selectedProposalIds}
          onSelectionChange={setSelectedProposalIds}
          emptyTitle={t('free_prop_empty_title', language)}
          emptyDescription={t('free_prop_empty_desc', language)}
          primaryActionLabel={t('free_prop_btn_new', language)}
          onAddFirstItem={() => setIsDraftModalOpen(true)}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedProposals.length}
        entityPluralLabel={isAr ? 'عروض' : 'devis'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setStatusFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<FreelanceProposal>
        isOpen={Boolean(activeProposal)}
        item={activeProposal}
        allItems={sortedProposals}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeProposal?.title || ''}
        subtitle={
          activeProposal
            ? `${activeProposal.clientName}${
                activeProposal.clientCompany ? ` · ${activeProposal.clientCompany}` : ''
              }`
            : ''
        }
        avatarText="P"
        avatarColor="#d4522f"
        branchName={
          activeProposal
            ? resolveRecordBranch(activeProposal, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeProposal
            ? activeProposal.status === 'Accepted'
              ? isFr
                ? 'Signé & Actif'
                : 'Accepted'
              : activeProposal.status === 'Declined'
              ? t('free_prop_status_rejected', language)
              : isFr
              ? 'En attente'
              : 'Pending'
            : undefined
        }
        onSelectItem={(p) => setSelectedProposal(p)}
        onClose={() => setSelectedProposal(null)}
        onDelete={(p) => setProposalToDelete(p)}
        holdToDelete={false}
        renderBody={(proposal) => (
          <div className="space-y-5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                type="button"
                variant="secondary"
                size="sm"
                icon={<Edit2 size={13} />}
                onClick={() => handleOpenEditModal(proposal)}
              >
                {t('common_edit', language) || (isFr ? 'Modifier' : 'Edit')}
              </AtriumButton>
              {proposal.status === 'Pending' && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle size={13} />}
                  onClick={() => handleConvert(proposal.id)}
                >
                  {t('free_prop_btn_convert', language)}
                </AtriumButton>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                <span className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider block">
                  {t('free_prop_total_quote', language)}
                </span>
                <span className="text-lg font-mono font-bold text-[#d4522f] tabular-nums">
                  {formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                <span className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider block">
                  {t('free_prop_valid_until', language)}
                </span>
                <span className="text-base font-bold text-black dark:text-white tabular-nums">
                  {proposal.validUntil} ({proposal.estimatedTimelineWeeks}w)
                </span>
              </div>
            </div>

            {proposal.overview && (
              <div className="p-4 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800 text-black/80 dark:text-white/80 leading-relaxed">
                {proposal.overview}
              </div>
            )}

            <div className="space-y-2">
              <span className="font-semibold text-black dark:text-white block">
                {t('free_prop_scope', language)} ({proposal.scopeItems.length})
              </span>
              <div className="space-y-1.5">
                {proposal.scopeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-[#E6DED6] dark:border-neutral-800 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
                    <span className="text-black dark:text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      />

      {/* Draft Proposal Modal */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-black dark:text-white">
                {t('free_prop_modal_new_title', language)}
              </h3>
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmitProposal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  id="draft-client-name"
                  label={t('free_clients_field_contact', language)}
                  required
                  placeholder={t('free_prop_ph_contact', language)}
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: extractStr(e) })}
                />
                <LabelInput
                  id="draft-client-company"
                  label={t('free_clients_field_company', language)}
                  placeholder={t('free_prop_ph_company', language)}
                  value={formData.clientCompany}
                  onChange={(e) => setFormData({ ...formData, clientCompany: extractStr(e) })}
                />
              </div>
              <LabelInput
                id="draft-client-email"
                label={t('free_clients_field_email', language)}
                type="email"
                required
                placeholder="contact@company.com"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: extractStr(e) })}
              />
              <LabelInput
                id="draft-proposal-title"
                label={t('free_prop_engagement_title', language)}
                required
                placeholder={t('free_prop_ph_title', language)}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: extractStr(e) })}
              />
              <div>
                <label className="font-semibold text-black/70 dark:text-white/75 block mb-1">
                  {t('free_prop_exec_summary', language)}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('free_prop_scope_ph', language)}
                  value={formData.overview}
                  onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white"
                />
              </div>
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-black dark:text-white">
                    {t('free_prop_scope', language)}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddScopeItem}
                    className="text-[#d4522f] hover:underline font-semibold cursor-pointer"
                  >
                    {t('free_prop_btn_add_item', language)}
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.scopeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <LabelInput
                          field={`ScopeItem-${idx}`}
                          label={`${t('free_prop_deliverable_item', language)} ${idx + 1}`}
                          value={item}
                          onChange={(v) => handleScopeItemChange(idx, extractStr(v))}
                          width="100%"
                          height={44}
                          corner={12}
                        />
                      </div>
                      {formData.scopeItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveScopeItem(idx)}
                          className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-500 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <LabelSelect
                  label={t('free_invoices_currency', language)}
                  value={formData.currency}
                  onChange={(val) =>
                    setFormData({ ...formData, currency: extractStr(val) as CurrencyCode })
                  }
                  options={[
                    { value: 'DZD', label: 'DZD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USD', label: 'USD' },
                  ]}
                />
                <LabelInput
                  id="draft-budget"
                  label={isAr ? 'الميزانية' : isFr ? 'Budget' : 'Budget'}
                  type="number"
                  value={String(formData.proposedBudget)}
                  onChange={(e) =>
                    setFormData({ ...formData, proposedBudget: Number(extractStr(e)) || 0 })
                  }
                />
                <LabelInput
                  id="draft-weeks"
                  label={isAr ? 'المدة (أسابيع)' : isFr ? 'Délai (sem.)' : 'Est. Weeks'}
                  type="number"
                  value={String(formData.estimatedTimelineWeeks)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedTimelineWeeks: Number(extractStr(e)) || 1,
                    })
                  }
                />
              </div>
              <LabelInput
                id="draft-valid-until"
                label={t('free_prop_valid_until', language)}
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: extractStr(e) })}
              />
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                >
                  {t('free_clients_cancel', language)}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" glow type="submit">
                  {isAr
                    ? 'حفظ عرض السعر'
                    : isFr
                    ? 'Enregistrer le Devis'
                    : 'Save Proposal'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Proposal Scope Modal */}
      {proposalToEdit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-black dark:text-white">
                {isAr
                  ? 'تعديل عرض السعر ونطاق العمل'
                  : isFr
                  ? 'Modifier le Devis & Périmètre'
                  : 'Edit Proposal Scope & Terms'}
              </h3>
              <button
                type="button"
                onClick={() => setProposalToEdit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditProposalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  id="edit-client-name"
                  label={t('free_clients_field_contact', language)}
                  required
                  value={editFormData.clientName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, clientName: extractStr(e) })
                  }
                />
                <LabelInput
                  id="edit-client-company"
                  label={t('free_clients_field_company', language)}
                  value={editFormData.clientCompany}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, clientCompany: extractStr(e) })
                  }
                />
              </div>
              <LabelInput
                id="edit-proposal-title"
                label={
                  isAr
                    ? 'عنوان المشروع / المهمة'
                    : isFr
                    ? 'Intitulé de la Mission'
                    : 'Proposal Title'
                }
                required
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: extractStr(e) })}
              />
              <div>
                <label className="font-semibold text-black/70 dark:text-white/75 block mb-1">
                  {isAr
                    ? 'ملخص تنفيذي للمشروع'
                    : isFr
                    ? 'Résumé Exécutif du Projet'
                    : 'Executive Overview'}
                </label>
                <textarea
                  rows={2}
                  value={editFormData.overview}
                  onChange={(e) => setEditFormData({ ...editFormData, overview: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-black/70 dark:text-white/75">
                    {t('free_prop_scope', language)}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditFormData({
                        ...editFormData,
                        scopeItems: [...editFormData.scopeItems, ''],
                      })
                    }
                    className="text-[11px] font-semibold text-[#d4522f] hover:underline cursor-pointer"
                  >
                    {isAr ? '+ إضافة تسليمة' : isFr ? '+ Ajouter un livrable' : '+ Add Item'}
                  </button>
                </div>
                {editFormData.scopeItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <LabelInput
                        field={`EditScopeItem-${idx}`}
                        label={`${
                          isAr ? 'تسليمة' : isFr ? 'Livrable' : 'Deliverable Item'
                        } ${idx + 1}`}
                        value={item}
                        onChange={(v) => {
                          const updated = [...editFormData.scopeItems];
                          updated[idx] = extractStr(v);
                          setEditFormData({ ...editFormData, scopeItems: updated });
                        }}
                        width="100%"
                        height={44}
                        corner={12}
                      />
                    </div>
                    {editFormData.scopeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            scopeItems: editFormData.scopeItems.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-black/55 dark:text-white/55 hover:text-rose-600 p-1 cursor-pointer"
                        aria-label="Remove item"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <LabelSelect
                  label={t('free_invoices_currency', language)}
                  value={editFormData.currency}
                  onChange={(val) =>
                    setEditFormData({
                      ...editFormData,
                      currency: extractStr(val) as CurrencyCode,
                    })
                  }
                  options={[
                    { value: 'DZD', label: 'DZD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USD', label: 'USD' },
                  ]}
                />
                <LabelInput
                  id="edit-budget"
                  label={isAr ? 'الميزانية' : isFr ? 'Budget' : 'Budget'}
                  type="number"
                  value={String(editFormData.proposedBudget)}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      proposedBudget: Number(extractStr(e)) || 0,
                    })
                  }
                />
                <LabelInput
                  id="edit-weeks"
                  label={isAr ? 'المدة (أسابيع)' : isFr ? 'Délai (sem.)' : 'Est. Weeks'}
                  type="number"
                  value={String(editFormData.estimatedTimelineWeeks)}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      estimatedTimelineWeeks: Number(extractStr(e)) || 1,
                    })
                  }
                />
              </div>
              <LabelInput
                id="edit-valid-until"
                label={t('free_prop_valid_until', language)}
                type="date"
                value={editFormData.validUntil}
                onChange={(e) => setEditFormData({ ...editFormData, validUntil: extractStr(e) })}
              />
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setProposalToEdit(null)}
                >
                  {t('free_clients_cancel', language)}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" glow type="submit">
                  {isAr
                    ? 'حفظ التعديلات'
                    : isFr
                    ? 'Enregistrer les Modifications'
                    : 'Save Changes'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Proposal Modal */}
      {proposalToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  {isAr ? 'حذف عرض السعر' : isFr ? 'Supprimer le Devis' : 'Delete Proposal'}
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55">
                  {proposalToDelete.clientName}
                </p>
              </div>
            </div>
            <p className="text-xs text-black/70 dark:text-white/75 leading-relaxed">
              {isAr
                ? `هل أنت متأكد من حذف عرض السعر "${proposalToDelete.title}"؟`
                : isFr
                ? `Supprimer le devis "${proposalToDelete.title}" du pipeline ?`
                : `Delete proposal "${proposalToDelete.title}" from your pipeline?`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <AtriumButton
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setProposalToDelete(null)}
              >
                {t('free_clients_cancel', language)}
              </AtriumButton>
              <AtriumButton
                variant="danger"
                size="sm"
                type="button"
                onClick={() => {
                  deleteFreelanceProposal(proposalToDelete.id);
                  if (selectedProposal?.id === proposalToDelete.id) setSelectedProposal(null);
                  setProposalToDelete(null);
                }}
              >
                {t('free_prop_delete_modal_title', language)}
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
