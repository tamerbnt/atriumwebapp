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
  Eye,
  FileSignature,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  useDashboardShellState,
  shallowEqualObjects,
  selectCurrentFreelanceProposalsFromState,
  selectCurrentFreelanceClientsFromState,
  selectCurrentFreelanceContractTemplatesFromState,
  selectCurrentFreelanceClientContractsFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { formatCurrencyAmount } from '../../../utils/rules';
import {
  buildDefaultFreelanceContractTemplates,
  renderFreelanceContractBody,
} from '../../../utils/freelanceDepth';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import {
  FreelanceProposal,
  FreelanceClientContract,
  FreelanceContractCategory,
  PricingModel,
  CurrencyCode,
} from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LabelTextarea } from '../../ui/LabelTextarea';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
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
  KineticModalShell,
  useRetainedModalValue,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const FreelanceProposalsView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    freelanceProposals,
    freelanceClients,
    contractTemplates,
    clientContracts,
    account,
    branches,
    currentBranch,
  } = useAtriumSelector(
    (s) => ({
      freelanceProposals: selectCurrentFreelanceProposalsFromState(s),
      freelanceClients: selectCurrentFreelanceClientsFromState(s),
      contractTemplates: selectCurrentFreelanceContractTemplatesFromState(s),
      clientContracts: selectCurrentFreelanceClientContractsFromState(s),
      account: s.account,
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
    }),
    shallowEqualObjects
  );
  const { isSyncing, networkMode, isSyncTimeout, lastSyncedAt, retryCloudSync } =
    useDashboardShellState();
  const {
    createFreelanceProposal,
    updateFreelanceProposal,
    deleteFreelanceProposal,
    convertProposalToProject,
    createFreelanceContract,
    signFreelanceContract,
    deleteFreelanceContract,
    setScreen,
  } = useAtriumActions();

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'proposals' | 'contracts'>('proposals');
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [contractToSign, setContractToSign] = useState<FreelanceClientContract | null>(null);
  const [signerNameInput, setSignerNameInput] = useState('');

  const availableTemplates = useMemo(() => {
    const defaults = buildDefaultFreelanceContractTemplates();
    if (!contractTemplates || contractTemplates.length === 0) return defaults;
    const seen = new Set(contractTemplates.map((tpl) => tpl.templateKey));
    return [...contractTemplates, ...defaults.filter((tpl) => !seen.has(tpl.templateKey))];
  }, [contractTemplates]);

  const [contractClientId, setContractClientId] = useState(freelanceClients[0]?.id || '');
  const [contractTemplateId, setContractTemplateId] = useState(
    () => availableTemplates[0]?.id || 'tpl_freelance_msa'
  );
  const [contractTitle, setContractTitle] = useState('');
  const [contractScope, setContractScope] = useState('');
  const [contractValue, setContractValue] = useState(150000);
  const [contractCurrency, setContractCurrency] = useState<CurrencyCode>('DZD');
  const [contractEffectiveDate, setContractEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );

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
  const [inspectorTab, setInspectorTab] = useState<string>('summary');

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

  const getProposalRowMeta = useCallback(
    (proposal: FreelanceProposal): KineticRowMeta => {
      const branchInfo = resolveRecordBranch(proposal, branchesById, currentBranch, language);
      return {
        avatarText: proposal.clientName.slice(0, 2).toUpperCase(),
        subline: `${proposal.clientName}${proposal.clientCompany ? ` · ${proposal.clientCompany}` : ''}`,
        categoryLabel: proposal.pricingModel,
        statusVariant:
          proposal.status === 'Accepted'
            ? 'active'
            : proposal.status === 'Declined'
            ? 'blocked'
            : 'warning',
        statusLabel:
          proposal.status === 'Accepted'
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
            : 'Pending',
        metricPrimary: formatCurrencyAmount(proposal.proposedBudget, proposal.currency),
        metricSecondary: `${proposal.estimatedTimelineWeeks}w · ${proposal.validUntil}`,
        detailCol1: {
          heading: isAr ? 'العميل' : 'Client',
          primaryText: proposal.clientName,
          secondaryText: proposal.clientCompany || proposal.clientEmail || '—',
        },
        detailCol2: {
          heading: isAr ? 'الميزانية والنطاق' : isFr ? 'Budget & Périmètre' : 'Budget & Scope',
          primaryText: formatCurrencyAmount(proposal.proposedBudget, proposal.currency),
          secondaryText: `${proposal.scopeItems.length} ${isAr ? 'بنود' : isFr ? 'livrables' : 'scope items'} · ${proposal.pricingModel}`,
        },
        detailCol3: {
          heading: isAr ? 'المدة والفرع' : isFr ? 'Délai & Branche' : 'Timeline & Branch',
          primaryText: `${proposal.estimatedTimelineWeeks}${isAr ? ' أسبوع' : isFr ? ' sem.' : 'w'} · ${proposal.validUntil}`,
          secondaryText: branchInfo.name,
        },
      };
    },
    [branchesById, currentBranch, isAr, isFr, language, t]
  );

  const getProposalFanActions = useCallback(
    (proposal: FreelanceProposal): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isFr ? 'Détails' : 'Details',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedProposal(proposal);
          setInspectorTab('summary');
        },
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
        icon: <Edit2 className="w-[15px] h-[15px]" />,
        onClick: () => handleOpenEditModal(proposal),
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => setProposalToDelete(proposal),
      },
    ],
    [isAr, isFr, handleOpenEditModal]
  );

  const getProposalDetailActions = useCallback(
    (proposal: FreelanceProposal): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'فتح' : isFr ? 'Ouvrir' : 'Open',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedProposal(proposal);
          setInspectorTab('summary');
        },
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isFr ? 'Modifier' : 'Edit',
        icon: <Edit2 className="w-3.5 h-3.5" />,
        onClick: () => handleOpenEditModal(proposal),
      },
      ...(proposal.status === 'Pending'
        ? [
            {
              id: 'convert',
              label: t('free_prop_btn_convert', language),
              icon: <CheckCircle className="w-3.5 h-3.5" />,
              onClick: () => handleConvert(proposal.id),
            },
          ]
        : []),
      {
        id: 'del',
        label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => setProposalToDelete(proposal),
      },
    ],
    [isAr, isFr, language, t, handleOpenEditModal, handleConvert]
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
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-9 h-9 bg-[#F5F1EC] dark:bg-[#2B2825] text-black dark:text-white flex items-center justify-center font-semibold t-small shrink-0"
            >
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white truncate hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-colors">
                {proposal.title}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 truncate flex items-center gap-2">
                <span>{proposal.clientName}</span>
                {proposal.clientCompany && (
                  <>
                    <span>·</span>
                    <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-medium">{proposal.clientCompany}</span>
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
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-medium bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white truncate">
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
            <span className="font-semibold text-black dark:text-white tabular-nums block">
              {formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
            </span>
            <span className="t-cap text-black/55 dark:text-white/55">
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
            className={`inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold ${
              proposal.status === 'Accepted'
                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400'
                : proposal.status === 'Declined'
                ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400'
                : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400'
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
          <div className="flex items-center gap-2 t-cap text-black/70 dark:text-white/75">
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
    const count = selectedProposalIds.size;
    runUndoBatch(
      {
        vertical: 'freelance_solo',
        operationType: 'bulk',
        affectedCount: count,
        summary: isAr
          ? `قبول عروض (${count})`
          : isFr
          ? `Acceptation devis (${count})`
          : `Accept proposals (${count})`,
      },
      () => {
        selectedProposalIds.forEach((id) => {
          updateFreelanceProposal(id, { status: 'Accepted' });
        });
      }
    );
    setSelectedProposalIds(new Set());
  };

  const handleBatchDecline = () => {
    if (selectedProposalIds.size === 0) return;
    const count = selectedProposalIds.size;
    runUndoBatch(
      {
        vertical: 'freelance_solo',
        operationType: 'bulk',
        affectedCount: count,
        summary: isAr
          ? `رفض عروض (${count})`
          : isFr
          ? `Refus devis (${count})`
          : `Decline proposals (${count})`,
      },
      () => {
        selectedProposalIds.forEach((id) => {
          updateFreelanceProposal(id, { status: 'Declined' });
        });
      }
    );
    setSelectedProposalIds(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedProposalIds.size === 0) return;
    const count = selectedProposalIds.size;
    runUndoBatch(
      {
        vertical: 'freelance_solo',
        operationType: 'bulk',
        affectedCount: count,
        summary: isAr
          ? `حذف عروض (${count})`
          : isFr
          ? `Suppression devis (${count})`
          : `Delete proposals (${count})`,
      },
      () => {
        selectedProposalIds.forEach((id) => {
          deleteFreelanceProposal(id);
          if (selectedProposal?.id === id) setSelectedProposal(null);
        });
      }
    );
    setSelectedProposalIds(new Set());
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

  const retainedProposalToEdit = useRetainedModalValue(proposalToEdit);
  const retainedProposalToDelete = useRetainedModalValue(proposalToDelete);

  const selectedTemplate = useMemo(
    () => availableTemplates.find((tpl) => tpl.id === contractTemplateId) || availableTemplates[0],
    [availableTemplates, contractTemplateId]
  );

  const contractPreview = useMemo(() => {
    const cl =
      freelanceClients.find((c) => c.id === contractClientId) || freelanceClients[0];
    return renderFreelanceContractBody(selectedTemplate?.bodyTemplate || '', {
      provider_name: account?.fullName || 'Studio Provider',
      client_name: cl?.name || 'Client',
      client_company: cl?.company || cl?.name || 'Client',
      scope_summary: contractScope || contractTitle || selectedTemplate?.title || '',
      contract_value: contractValue,
      currency: contractCurrency,
      effective_date: contractEffectiveDate,
    });
  }, [
    selectedTemplate,
    freelanceClients,
    contractClientId,
    account?.fullName,
    contractScope,
    contractTitle,
    contractValue,
    contractCurrency,
    contractEffectiveDate,
  ]);

  const handleCreateContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedClientId = contractClientId || freelanceClients[0]?.id;
    if (!resolvedClientId || !contractTitle.trim()) return;
    createFreelanceContract({
      clientId: resolvedClientId,
      templateId: selectedTemplate?.id,
      category: (selectedTemplate?.category || 'service_agreement') as FreelanceContractCategory,
      title: contractTitle.trim(),
      renderedBody: contractPreview.renderedBody,
      currency: contractCurrency,
      contractValue: Number(contractValue) || 0,
      effectiveDate: contractEffectiveDate,
    });
    setContractTitle('');
    setContractScope('');
    setIsNewContractOpen(false);
  };

  if (
    activeWorkspaceTab === 'proposals' &&
    showSkeleton &&
    (freelanceProposals.length === 0 || networkMode === 'force_skeleton')
  ) {
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
        icon={activeWorkspaceTab === 'contracts' ? <FileSignature size={22} /> : <FileText size={22} />}
        title={
          activeWorkspaceTab === 'contracts'
            ? t('free_depth_tab_contracts', language)
            : t('free_prop_title', language)
        }
        secondaryActions={
          <LiveSegmentedControl
            size="md"
            value={activeWorkspaceTab}
            onValueChange={(v) => setActiveWorkspaceTab(v as 'proposals' | 'contracts')}
            aria-label={t('free_prop_title', language)}
            options={[
              { value: 'proposals', label: t('free_depth_tab_proposals', language) },
              { value: 'contracts', label: t('free_depth_tab_contracts', language) },
            ]}
          />
        }
        primaryAction={{
          label:
            activeWorkspaceTab === 'contracts'
              ? t('free_depth_ctr_new', language)
              : t('free_prop_btn_new', language),
          onClick: () => {
            if (activeWorkspaceTab === 'contracts') {
              if (!contractClientId && freelanceClients[0]?.id) {
                setContractClientId(freelanceClients[0].id);
              }
              setIsNewContractOpen(true);
            } else {
              setIsDraftModalOpen(true);
            }
          },
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction:
            activeWorkspaceTab === 'contracts' ? 'add-freelance-contract' : 'add-freelance-proposal',
        }}
      />

      {activeWorkspaceTab === 'contracts' ? (
        <ScreenPod>
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <h3 className="t-label font-semibold text-black dark:text-white">
                  {t('free_depth_tab_contracts', language)} ({clientContracts.length})
                </h3>
              </div>
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  if (!contractClientId && freelanceClients[0]?.id) {
                    setContractClientId(freelanceClients[0].id);
                  }
                  setIsNewContractOpen(true);
                }}
              >
                {t('free_depth_ctr_new', language)}
              </AtriumButton>
            </div>

            {clientContracts.length === 0 ? (
              <div
                data-sq="card"
                data-sq-border="solid"
                className="bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] p-8 text-center space-y-3"
              >
                <p className="t-body text-black/65 dark:text-white/70">
                  {isAr
                    ? 'لا توجد عقود عملاء مسجلة بعد. أنشئ عقداً من القوالب الجاهزة.'
                    : isFr
                    ? 'Aucun contrat client généré pour l’instant. Créez-en un depuis les modèles.'
                    : 'No client contracts drafted yet. Generate an MSA, NDA, or release from presets.'}
                </p>
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<FileSignature size={14} />}
                  onClick={() => setIsNewContractOpen(true)}
                >
                  {t('free_depth_ctr_new', language)}
                </AtriumButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {clientContracts.map((ctr) => {
                  const isSigned = ctr.status === 'signed';
                  return (
                    <div
                      key={ctr.id}
                      data-sq="card"
                      data-sq-border="solid"
                      className="bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] p-4 lg:p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono t-small font-semibold text-black/65 dark:text-white/65">
                              {ctr.contractNumber}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full t-small font-semibold ${
                                isSigned
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-[#EFE9E2] dark:bg-[#2B2825] text-black/75 dark:text-white/80'
                              }`}
                            >
                              {isSigned && <Lock size={11} />}
                              <span>
                                {isSigned
                                  ? t('free_depth_ctr_signed_badge', language)
                                  : t('free_depth_ctr_draft_badge', language)}
                              </span>
                            </span>
                          </div>
                          <h4 className="t-label font-semibold text-black dark:text-white mt-1 truncate">
                            {ctr.title}
                          </h4>
                          <p className="t-cap text-black/60 dark:text-white/65">
                            {ctr.clientName} · {ctr.effectiveDate} ·{' '}
                            <span className="tabular-nums font-semibold">
                              {formatCurrencyAmount(ctr.contractValue, ctr.currency)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isSigned && (
                            <AtriumButton
                              type="button"
                              variant="primary"
                              size="sm"
                              icon={<FileSignature size={13} />}
                              onClick={() => {
                                setContractToSign(ctr);
                                setSignerNameInput(ctr.clientName);
                              }}
                            >
                              {t('free_depth_ctr_sign_btn', language)}
                            </AtriumButton>
                          )}
                          {!isSigned && (
                            <button
                              type="button"
                              onClick={() => deleteFreelanceContract(ctr.id)}
                              className="p-2 rounded-lg text-black/50 dark:text-white/50 hover:text-rose-600 cursor-pointer"
                              aria-label={`${t('common_delete', language)} ${ctr.contractNumber}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans t-small text-black/75 dark:text-white/80 bg-[#F7F3EE] dark:bg-[#191715] p-3 rounded-xl max-h-36 overflow-y-auto">
                        {ctr.renderedBody}
                      </pre>
                      {isSigned && (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--atr-divider)] t-small text-black/60 dark:text-white/65">
                          <span>
                            {t('free_depth_ctr_signer_name', language)}:{' '}
                            <strong className="text-black dark:text-white">{ctr.signerName}</strong>
                          </span>
                          <span className="font-mono">
                            {t('free_depth_ctr_hash', language)}: {ctr.signatureHash}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScreenPod>
      ) : (
        <>

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
          <div
            data-sq="card"
            data-sq-border="none"
            className="flex items-center justify-between p-3 px-4 bg-[#FCEEE8] dark:bg-[#2B2825] animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
              <span className="t-small font-semibold text-black dark:text-white">
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
                className="px-3 py-2 t-small text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
              >
                {isAr ? 'إلغاء التحديد' : isFr ? 'Désélectionner' : 'Deselect'}
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={handleBatchAccept}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle size={13} />
                <span>
                  {isAr ? 'قبول العروض' : isFr ? 'Marquer Accepté' : 'Mark Accepted'}
                </span>
              </button>
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={handleBatchDecline}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white t-small font-semibold flex items-center gap-2 cursor-pointer"
              >
                <XCircle size={13} />
                <span>
                  {isAr ? 'رفض العروض' : isFr ? 'Marquer Refusé' : 'Mark Declined'}
                </span>
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

        <UniversalDataCollection<FreelanceProposal>
          hideToolbar
          items={sortedProposals}
          keyExtractor={(p) => p.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
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
          onItemClick={(proposal, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedProposal(proposal);
            setInspectorTab('summary');
          }}
          onViewDetails={(proposal, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedProposal(proposal);
            setInspectorTab('summary');
          }}
          getRowMeta={getProposalRowMeta}
          getFanActions={getProposalFanActions}
          getDetailActions={getProposalDetailActions}
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
        categoryLabel={activeProposal?.pricingModel || 'Fixed'}
        avatarText={activeProposal ? activeProposal.clientName.slice(0, 2).toUpperCase() : 'PR'}
        avatarColor="#d4522f"
        branchName={
          activeProposal
            ? resolveRecordBranch(activeProposal, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeProposal
            ? activeProposal.status === 'Accepted'
              ? isAr
                ? 'موقّع ونشط'
                : isFr
                ? 'Signé & Actif'
                : 'Accepted'
              : activeProposal.status === 'Declined'
              ? t('free_prop_status_rejected', language)
              : isAr
              ? 'بانتظار المراجعة'
              : isFr
              ? 'En attente'
              : 'Pending'
            : undefined
        }
        statusClassName={
          activeProposal?.status === 'Accepted'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : activeProposal?.status === 'Declined'
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'summary', label: isAr ? 'الملخص' : isFr ? 'Synthèse' : 'Summary' },
          { id: 'scope', label: isAr ? 'النطاق' : isFr ? 'Périmètre' : 'Scope' },
          { id: 'terms', label: isAr ? 'الشروط' : isFr ? 'Conditions' : 'Terms & Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(p) => {
          setSelectedProposal(p);
          setInspectorTab('summary');
        }}
        onClose={() => setSelectedProposal(null)}
        onDelete={(p) => setProposalToDelete(p)}
        holdToDelete={false}
        renderBody={(proposal, tab) => {
          if (tab === 'scope') {
            return (
              <>
                <InspectorSection
                  index={0}
                  title={`${t('free_prop_scope', language)} (${proposal.scopeItems.length})`}
                >
                  <InspectorCard>
                    {proposal.scopeItems.map((item, idx) => (
                      <InspectorListItem
                        key={idx}
                        title={item}
                        metaRight={`#${idx + 1}`}
                        isLast={idx === proposal.scopeItems.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection
                  index={1}
                  title={isAr ? 'نظرة عامة على العرض' : isFr ? 'Présentation du Devis' : 'Proposal Overview'}
                >
                  <InspectorNotesField
                    value={proposal.overview || ''}
                    onSave={(next) => updateFreelanceProposal(proposal.id, { overview: next })}
                  />
                </InspectorSection>
              </>
            );
          }
          if (tab === 'terms') {
            return (
              <>
                <InspectorSection
                  index={0}
                  title={isAr ? 'شروط العرض والتسليم' : isFr ? 'Termes & Délais' : 'Commercial Terms'}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={t('free_prop_total_quote', language)}
                      value={formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
                      mono
                      tone="accent"
                    />
                    <InspectorKeyValue
                      label={t('free_deliv_field_pricing', language)}
                      value={proposal.pricingModel}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الجدول الزمني' : isFr ? 'Durée estimée' : 'Timeline'}
                      value={`${proposal.estimatedTimelineWeeks} ${isAr ? 'أسابيع' : 'weeks'}`}
                      mono
                    />
                    <InspectorKeyValue
                      label={t('free_prop_valid_until', language)}
                      value={proposal.validUntil}
                      mono
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
                {proposal.status === 'Pending' && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={t('free_prop_btn_convert', language)}
                      icon={<CheckCircle size={14} />}
                      tone="accent"
                      onClick={() => handleConvert(proposal.id)}
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
                    ...(proposal.status === 'Pending'
                      ? [
                          {
                            id: 'convert',
                            label: t('free_prop_btn_convert', language),
                            icon: <CheckCircle size={16} />,
                            primary: true,
                            onClick: () => handleConvert(proposal.id),
                          },
                        ]
                      : []),
                    {
                      id: 'edit',
                      label: t('common_edit', language) || (isFr ? 'Modifier' : 'Edit'),
                      icon: <Edit2 size={16} />,
                      primary: proposal.status !== 'Pending',
                      onClick: () => handleOpenEditModal(proposal),
                    },
                    ...(proposal.status === 'Pending'
                      ? [
                          {
                            id: 'decline',
                            label: t('free_prop_status_rejected', language),
                            icon: <XCircle size={16} />,
                            onClick: () => updateFreelanceProposal(proposal.id, { status: 'Declined' }),
                          },
                        ]
                      : []),
                  ]}
                />
              </InspectorSection>
              <InspectorSection index={1}>
                <InspectorBigStat
                  value={formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
                  tone={proposal.status === 'Accepted' ? 'ok' : proposal.status === 'Declined' ? 'danger' : 'accent'}
                  caption={`${proposal.pricingModel} · ${proposal.estimatedTimelineWeeks}w · ${t('free_prop_valid_until', language)} ${proposal.validUntil}`}
                />
              </InspectorSection>
              <InspectorSection
                index={2}
                title={isAr ? 'تفاصيل العميل' : isFr ? 'Coordonnées Client' : 'Client & Contact'}
              >
                <InspectorCard>
                  <InspectorKeyValue
                    label={t('free_clients_field_contact', language)}
                    value={proposal.clientName}
                  />
                  {proposal.clientCompany && (
                    <InspectorKeyValue
                      label={t('free_clients_field_company', language)}
                      value={proposal.clientCompany}
                    />
                  )}
                  <InspectorKeyValue
                    label={t('free_clients_email', language)}
                    value={proposal.clientEmail || '—'}
                    copyText={proposal.clientEmail}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />
        </>
      )}

      {/* Draft Proposal Modal */}
      <KineticModalShell
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_prop_modal_new_title', language)}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">
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
          <form onSubmit={handleSubmitProposal} className="space-y-4 t-cap">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                id="draft-client-name"
                field="DraftClientName"
                label={t('free_clients_field_contact', language)}
                required
                placeholder={t('free_prop_ph_contact', language)}
                value={formData.clientName}
                onChange={(v) => setFormData({ ...formData, clientName: v })}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                id="draft-client-company"
                field="DraftClientCompany"
                label={t('free_clients_field_company', language)}
                placeholder={t('free_prop_ph_company', language)}
                value={formData.clientCompany}
                onChange={(v) => setFormData({ ...formData, clientCompany: v })}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              id="draft-client-email"
              field="DraftClientEmail"
              label={t('free_clients_field_email', language)}
              type="email"
              required
              placeholder="contact@company.com"
              value={formData.clientEmail}
              onChange={(v) => setFormData({ ...formData, clientEmail: v })}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              id="draft-proposal-title"
              field="DraftProposalTitle"
              label={t('free_prop_engagement_title', language)}
              required
              placeholder={t('free_prop_ph_title', language)}
              value={formData.title}
              onChange={(v) => setFormData({ ...formData, title: v })}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelTextarea
              field="DraftOverview"
              label={t('free_prop_exec_summary', language)}
              rows={2}
              placeholder={t('free_prop_scope_ph', language)}
              value={formData.overview}
              onChange={(v) => setFormData({ ...formData, overview: v })}
              width="100%"
              corner={12}
            />
            <div className="space-y-2 pt-2 border-t border-[var(--atr-divider)]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-black dark:text-white">
                  {t('free_prop_scope', language)}
                </span>
                <button
                  type="button"
                  onClick={handleAddScopeItem}
                  className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline font-semibold cursor-pointer"
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
                        onChange={(v) => handleScopeItemChange(idx, v)}
                        width="100%"
                        height={40}
                        corner={12}
                      />
                    </div>
                    {formData.scopeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveScopeItem(idx)}
                        className="p-2 text-black/55 dark:text-white/55 hover:text-rose-500 cursor-pointer"
                        aria-label="Remove item"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelSelect
                field="DraftCurrency"
                label={t('free_invoices_currency', language)}
                value={formData.currency}
                onChange={(val) =>
                  setFormData({ ...formData, currency: val as CurrencyCode })
                }
                options={[
                  { value: 'DZD', label: 'DZD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'USD', label: 'USD' },
                ]}
                height={40}
                corner={12}
              />
              <LabelInput
                id="draft-budget"
                field="DraftBudget"
                label={isAr ? 'الميزانية' : isFr ? 'Budget' : 'Budget'}
                type="number"
                value={String(formData.proposedBudget)}
                onChange={(v) =>
                  setFormData({ ...formData, proposedBudget: Number(v) || 0 })
                }
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                id="draft-weeks"
                field="DraftWeeks"
                label={isAr ? 'المدة (أسابيع)' : isFr ? 'Délai (sem.)' : 'Est. Weeks'}
                type="number"
                value={String(formData.estimatedTimelineWeeks)}
                onChange={(v) =>
                  setFormData({
                    ...formData,
                    estimatedTimelineWeeks: Number(v) || 1,
                  })
                }
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              id="draft-valid-until"
              field="DraftValidUntil"
              label={t('free_prop_valid_until', language)}
              type="date"
              value={formData.validUntil}
              onChange={(v) => setFormData({ ...formData, validUntil: v })}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsDraftModalOpen(false)}>
                {t('free_clients_cancel', language)}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {isAr
                  ? 'حفظ عرض السعر'
                  : isFr
                  ? 'Enregistrer le Devis'
                  : 'Save Proposal'}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      {/* Edit Proposal Scope Modal */}
      <KineticModalShell
        isOpen={Boolean(proposalToEdit)}
        onClose={() => setProposalToEdit(null)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-[70]"
        scrimClassName="bg-black/60"
        ariaLabel={
          isAr
            ? 'تعديل عرض السعر ونطاق العمل'
            : isFr
            ? 'Modifier le Devis & Périmètre'
            : 'Edit Proposal Scope & Terms'
        }
      >
        {retainedProposalToEdit && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <h3 className="t-card font-semibold text-black dark:text-white">
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
            <form onSubmit={handleEditProposalSubmit} className="space-y-4 t-cap">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  id="edit-client-name"
                  field="EditClientName"
                  label={t('free_clients_field_contact', language)}
                  required
                  value={editFormData.clientName}
                  onChange={(v) =>
                    setEditFormData({ ...editFormData, clientName: v })
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="edit-client-company"
                  field="EditClientCompany"
                  label={t('free_clients_field_company', language)}
                  value={editFormData.clientCompany}
                  onChange={(v) =>
                    setEditFormData({ ...editFormData, clientCompany: v })
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <LabelInput
                id="edit-proposal-title"
                field="EditProposalTitle"
                label={
                  isAr
                    ? 'عنوان المشروع / المهمة'
                    : isFr
                    ? 'Intitulé de la Mission'
                    : 'Proposal Title'
                }
                required
                value={editFormData.title}
                onChange={(v) => setEditFormData({ ...editFormData, title: v })}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelTextarea
                field="EditOverview"
                label={
                  isAr
                    ? 'ملخص تنفيذي للمشروع'
                    : isFr
                    ? 'Résumé Exécutif du Projet'
                    : 'Executive Overview'
                }
                rows={2}
                value={editFormData.overview}
                onChange={(v) => setEditFormData({ ...editFormData, overview: v })}
                width="100%"
                corner={12}
              />
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
                    className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline cursor-pointer"
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
                          updated[idx] = v;
                          setEditFormData({ ...editFormData, scopeItems: updated });
                        }}
                        width="100%"
                        height={40}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LabelSelect
                  field="EditCurrency"
                  label={t('free_invoices_currency', language)}
                  value={editFormData.currency}
                  onChange={(val) =>
                    setEditFormData({
                      ...editFormData,
                      currency: val as CurrencyCode,
                    })
                  }
                  options={[
                    { value: 'DZD', label: 'DZD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USD', label: 'USD' },
                  ]}
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="edit-budget"
                  field="EditBudget"
                  label={isAr ? 'الميزانية' : isFr ? 'Budget' : 'Budget'}
                  type="number"
                  value={String(editFormData.proposedBudget)}
                  onChange={(v) =>
                    setEditFormData({
                      ...editFormData,
                      proposedBudget: Number(v) || 0,
                    })
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  id="edit-weeks"
                  field="EditWeeks"
                  label={isAr ? 'المدة (أسابيع)' : isFr ? 'Délai (sem.)' : 'Est. Weeks'}
                  type="number"
                  value={String(editFormData.estimatedTimelineWeeks)}
                  onChange={(v) =>
                    setEditFormData({
                      ...editFormData,
                      estimatedTimelineWeeks: Number(v) || 1,
                    })
                  }
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <LabelInput
                id="edit-valid-until"
                field="EditValidUntil"
                label={t('free_prop_valid_until', language)}
                type="date"
                value={editFormData.validUntil}
                onChange={(v) => setEditFormData({ ...editFormData, validUntil: v })}
                width="100%"
                height={40}
                corner={12}
              />
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
                <Button type="button" tone="soft" size={40} onClick={() => setProposalToEdit(null)}>
                  {t('free_clients_cancel', language)}
                </Button>
                <Button type="submit" tone="accent" size={40}>
                  {isAr
                    ? 'حفظ التعديلات'
                    : isFr
                    ? 'Enregistrer les Modifications'
                    : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>

      {/* Delete Proposal Modal */}
      <KineticModalShell
        isOpen={Boolean(proposalToDelete)}
        onClose={() => setProposalToDelete(null)}
        role="alertdialog"
        maxWidthClass="max-w-md"
        zIndexClass="z-[70]"
        scrimClassName="bg-black/60"
        ariaLabel={isAr ? 'حذف عرض السعر' : isFr ? 'Supprimer le Devis' : 'Delete Proposal'}
      >
        {retainedProposalToDelete && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0"
              >
                <AlertTriangle size={20} />
              </div>
              <h3 className="t-card font-semibold text-black dark:text-white">
                {isAr ? 'حذف عرض السعر' : isFr ? 'Supprimer le Devis' : 'Delete Proposal'}
              </h3>
            </div>
            <p className="t-cap text-black/70 dark:text-white/75 leading-relaxed">
              {isAr
                ? `هل أنت متأكد من حذف عرض السعر "${retainedProposalToDelete.title}"؟`
                : isFr
                ? `Supprimer le devis "${retainedProposalToDelete.title}" du pipeline ?`
                : `Delete proposal "${retainedProposalToDelete.title}" from your pipeline?`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setProposalToDelete(null)}>
                {t('free_clients_cancel', language)}
              </Button>
              <AtriumButton
                variant="danger"
                size="md"
                type="button"
                onClick={() => {
                  if (!proposalToDelete) return;
                  deleteFreelanceProposal(proposalToDelete.id);
                  if (selectedProposal?.id === proposalToDelete.id) setSelectedProposal(null);
                  setProposalToDelete(null);
                }}
              >
                {t('free_prop_delete_modal_title', language)}
              </AtriumButton>
            </div>
          </div>
        )}
      </KineticModalShell>

      {/* New Client Contract Modal */}
      <KineticModalShell
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        maxWidthClass="max-w-xl"
        zIndexClass="z-[60]"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_depth_ctr_new', language)}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {t('free_depth_ctr_new', language)}
            </h3>
            <button
              type="button"
              onClick={() => setIsNewContractOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreateContractSubmit} className="space-y-4 t-cap">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelSelect
                field="CtrClient"
                label={t('free_invoice_client', language)}
                value={contractClientId || freelanceClients[0]?.id || ''}
                onChange={setContractClientId}
                options={freelanceClients.map((c) => ({
                  value: c.id,
                  label: c.company || c.name,
                }))}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="CtrTemplate"
                label={t('free_depth_ctr_template', language)}
                value={contractTemplateId}
                onChange={setContractTemplateId}
                options={availableTemplates.map((tpl) => ({
                  value: tpl.id,
                  label: tpl.title,
                }))}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="CtrTitle"
              label={t('free_prop_field_title', language)}
              required
              value={contractTitle}
              onChange={setContractTitle}
              placeholder={selectedTemplate?.title}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelInput
                field="CtrDate"
                label={t('free_depth_ae_effective_from', language)}
                type="date"
                required
                value={contractEffectiveDate}
                onChange={setContractEffectiveDate}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="CtrValue"
                label={t('common_amount', language)}
                type="number"
                min={0}
                value={String(contractValue)}
                onChange={(v) => setContractValue(Number(v) || 0)}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="CtrCurrency"
                label={t('common_currency', language)}
                value={contractCurrency}
                onChange={(v) => setContractCurrency(v as CurrencyCode)}
                options={[
                  { value: 'DZD', label: 'DZD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'USD', label: 'USD' },
                ]}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="CtrScope"
              label={t('free_prop_scope_items', language)}
              value={contractScope}
              onChange={setContractScope}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="space-y-1">
              <span className="t-small font-medium text-black/60 dark:text-white/65">
                {selectedTemplate?.title}
              </span>
              <pre className="whitespace-pre-wrap font-sans t-small text-black/80 dark:text-white/85 bg-[#F5F1EC] dark:bg-[#22201E] p-3 rounded-xl max-h-36 overflow-y-auto">
                {contractPreview.renderedBody}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsNewContractOpen(false)}>
                {t('free_clients_cancel', language)}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {t('free_depth_ctr_new', language)}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      {/* Sign & Lock Contract Modal */}
      <KineticModalShell
        isOpen={Boolean(contractToSign)}
        onClose={() => setContractToSign(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-[75]"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_depth_ctr_sign_btn', language)}
      >
        {contractToSign && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <h3 className="t-card font-semibold text-black dark:text-white">
                {t('free_depth_ctr_sign_btn', language)} · {contractToSign.contractNumber}
              </h3>
              <button
                type="button"
                onClick={() => setContractToSign(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!signerNameInput.trim()) return;
                signFreelanceContract(contractToSign.id, signerNameInput.trim());
                setContractToSign(null);
              }}
              className="space-y-4 t-cap"
            >
              <LabelInput
                field="SignerFullName"
                label={t('free_depth_ctr_signer_name', language)}
                required
                value={signerNameInput}
                onChange={setSignerNameInput}
                width="100%"
                height={40}
                corner={12}
              />
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
                <Button type="button" tone="soft" size={40} onClick={() => setContractToSign(null)}>
                  {t('free_clients_cancel', language)}
                </Button>
                <Button type="submit" tone="accent" size={40}>
                  {t('free_depth_ctr_sign_btn', language)}
                </Button>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};
