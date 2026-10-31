import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Plus,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  X,
  Mail,
  Building,
  DollarSign,
  ChevronRight,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  Home,
  ChevronDown,
  Building2,
  Check,
  Pin,
  XCircle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceProposal, PricingModel, CurrencyCode } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const FreelanceProposalsView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    freelanceProposals,
    createFreelanceProposal,
    updateFreelanceProposal,
    deleteFreelanceProposal,
    convertProposalToProject,
    resetFreelanceMockData,
    businesses,
    branches,
    currentBusinessId,
    currentBranchId,
    switchBusiness,
    switchBranch,
    setScreen,
    showToast,
    isSyncing,
    networkMode,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();

  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());
  const [pinnedProposalIds, setPinnedProposalIds] = useState<Set<string>>(new Set());
  const [proposalSortBy, setProposalSortBy] = useState<string>('title');
  const [proposalSortDir, setProposalSortDir] = useState<'asc' | 'desc'>('asc');

  // Auto-heal empty freelance proposals safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && freelanceProposals.length === 0) {
      hasAutoHealed.current = true;
      resetFreelanceMockData();
    }
  }, [freelanceProposals.length, resetFreelanceMockData]);

  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [proposalToEdit, setProposalToEdit] = useState<FreelanceProposal | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<FreelanceProposal | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    title: '',
    overview: '',
    scopeItems: [] as string[],
    pricingModel: 'Fixed' as PricingModel,
    proposedBudget: 0,
    currency: 'DZD' as CurrencyCode,
    estimatedTimelineWeeks: 4,
    validUntil: '',
  });

  // Proposal form state
  const [formData, setFormData] = useState({
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    title: '',
    overview: '',
    scopeItems: language === 'ar'
      ? ['دراسة المتطلبات وهندسة تجربة المستخدم', 'تصميم واجهات المستخدم عالية الدقة على Figma', 'تطوير النظام البرمجي المتكامل واختبارات الجودة']
      : language === 'fr'
      ? ['Cadrage & architecture du parcours utilisateur', 'Conception UI haute-fidélité sur Figma', 'Ingénierie full-stack & tests unitaires']
      : ['Discovery & user journey architecture', 'High-fidelity Figma UI design', 'Full-stack engineering & unit tests'],
    pricingModel: 'Fixed' as PricingModel,
    proposedBudget: 250000,
    currency: 'DZD' as CurrencyCode,
    estimatedTimelineWeeks: 4,
    validUntil: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredProposals = React.useMemo(() => {
    if (!searchQuery.trim()) return freelanceProposals;
    const q = searchQuery.toLowerCase();
    return freelanceProposals.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.clientCompany?.toLowerCase().includes(q) ||
        p.overview.toLowerCase().includes(q)
    );
  }, [freelanceProposals, searchQuery]);

  const draftOrPendingProposals = useMemo(
    () => freelanceProposals.filter((p) => p.status === 'Pending'),
    [freelanceProposals]
  );
  const acceptedProposals = useMemo(
    () => freelanceProposals.filter((p) => p.status === 'Accepted'),
    [freelanceProposals]
  );
  const pipelineValue = useMemo(() => {
    return draftOrPendingProposals.reduce((sum, p) => sum + (Number(p.proposedBudget) || 0), 0);
  }, [draftOrPendingProposals]);
  const wonValue = useMemo(() => {
    return acceptedProposals.reduce((sum, p) => sum + (Number(p.proposedBudget) || 0), 0);
  }, [acceptedProposals]);

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

  const handleOpenEditModal = (prop: FreelanceProposal) => {
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
  };

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

  const handleConvert = (proposalId: string) => {
    try {
      convertProposalToProject(proposalId);
      setScreen('scheduler');
    } catch (err: any) {
      console.error('Error converting proposal:', err?.message || err);
    }
  };

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
      if (proposalSortBy === 'client') {
        const cmp = a.clientName.localeCompare(b.clientName);
        return proposalSortDir === 'asc' ? cmp : -cmp;
      }
      if (proposalSortBy === 'budget') {
        return proposalSortDir === 'asc' ? a.proposedBudget - b.proposedBudget : b.proposedBudget - a.proposedBudget;
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
  }, [filteredProposals, pinnedProposalIds, proposalSortBy, proposalSortDir]);

  const proposalColumns: ColumnDefinition<FreelanceProposal>[] = useMemo(() => [
    {
      key: 'title',
      header: language === 'ar' ? 'عرض السعر والعميل' : language === 'fr' ? 'Proposition & Client' : 'Proposal & Client',
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (proposal) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900 dark:text-white truncate hover:text-[#C4785A] transition-colors">
              {proposal.title}
            </div>
            <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
              <span>{proposal.clientName}</span>
              {proposal.clientCompany && (
                <>
                  <span>·</span>
                  <span className="text-[#C4785A] font-medium">{proposal.clientCompany}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'budget',
      header: language === 'ar' ? 'الميزانية المقترحة' : language === 'fr' ? 'Budget Proposé' : 'Proposed Budget',
      width: '2*',
      minWidth: '150px',
      sortable: true,
      renderCell: (proposal) => (
        <div>
          <span className="font-bold text-neutral-900 dark:text-white tabular-nums block">
            {formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
          </span>
          <span className="text-[10px] text-neutral-400">
            {proposal.pricingModel} · {proposal.estimatedTimelineWeeks} {language === 'ar' ? 'أسابيع' : 'wks'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      width: '1.8*',
      minWidth: '130px',
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
            ? (language === 'ar' ? 'موقّع ونشط' : language === 'fr' ? 'Signé & Actif' : 'Signed & Active')
            : proposal.status === 'Declined'
            ? t('free_prop_status_rejected')
            : (language === 'ar' ? 'بانتظار المراجعة' : language === 'fr' ? 'En attente' : 'Pending')}
        </span>
      ),
    },
    {
      key: 'validUntil',
      header: language === 'ar' ? 'صالح حتى' : language === 'fr' ? 'Validité' : 'Valid Until',
      width: '1.5*',
      minWidth: '120px',
      sortable: true,
      renderCell: (proposal) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
          <Calendar size={12} className="text-neutral-400" />
          <span>{proposal.validUntil}</span>
        </div>
      ),
    },
  ], [language, t]);

  const handleExportCSV = () => {
    if (freelanceProposals.length === 0) return;
    const headers = [
      language === 'ar' ? 'معرف العرض' : 'Proposal ID',
      language === 'ar' ? 'العنوان' : 'Title',
      language === 'ar' ? 'العميل' : 'Client',
      language === 'ar' ? 'الشركة' : 'Company',
      language === 'ar' ? 'البريد الإلكتروني' : 'Email',
      language === 'ar' ? 'نموذج التسعير' : 'Pricing Model',
      language === 'ar' ? 'الميزانية المقترحة' : 'Proposed Budget',
      language === 'ar' ? 'العملة' : 'Currency',
      language === 'ar' ? 'الجدول الزمني (أسابيع)' : 'Timeline Weeks',
      language === 'ar' ? 'الحالة' : 'Status',
      language === 'ar' ? 'صالح حتى' : 'Valid Until',
    ];

    const rows = sortedProposals.map((p) => [
      `"${p.id}"`,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      `"${(p.clientCompany || '').replace(/"/g, '""')}"`,
      `"${p.clientEmail}"`,
      `"${p.pricingModel}"`,
      p.proposedBudget,
      `"${p.currency}"`,
      p.estimatedTimelineWeeks,
      `"${p.status}"`,
      `"${p.validUntil}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atrium_freelance_proposals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchAccept = () => {
    if (selectedProposalIds.size === 0) return;
    selectedProposalIds.forEach((id) => {
      updateFreelanceProposal(id, { status: 'Accepted' });
    });
    const count = selectedProposalIds.size;
    setSelectedProposalIds(new Set());
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Mis à jour' : 'Updated',
      message: `${count} ${language === 'ar' ? 'عروض أسعار تم قبولها' : 'proposals marked as Accepted'}`,
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
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Mis à jour' : 'Updated',
      message: `${count} ${language === 'ar' ? 'عروض أسعار تم رفضها' : 'proposals marked as Declined'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDelete = () => {
    if (selectedProposalIds.size === 0) return;
    const count = selectedProposalIds.size;
    if (confirm(language === 'ar' ? `هل أنت متأكد من حذف ${count} عروض أسعار؟` : `Delete ${count} selected proposals?`)) {
      selectedProposalIds.forEach((id) => {
        deleteFreelanceProposal(id);
      });
      setSelectedProposalIds(new Set());
      showToast({
        type: 'info',
        title: language === 'ar' ? 'تم الحذف' : language === 'fr' ? 'Suppression' : 'Deleted',
        message: `${count} ${language === 'ar' ? 'عروض أسعار تم حذفها' : 'proposals deleted'}`,
        category: 'freelance_solo',
      });
    }
  };

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t('free_prop_title')}
              </h1>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {freelanceProposals.length} {language === 'ar' ? 'عروض' : 'proposals'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('free_prop_subtitle')}
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
            variant="outline"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
            title="Export CSV"
          >
            <span className="hidden sm:inline">CSV</span>
          </AtriumButton>

          {/* Seed Demo Data Button */}
          <AtriumButton
            variant="outline"
            size="sm"
            icon={<Sparkles size={14} className="text-[#C4785A]" />}
            onClick={resetFreelanceMockData}
            title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
          >
            <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
          </AtriumButton>

          <AtriumButton
            variant="primary"
            size="sm"
            glow
            icon={<Plus size={14} />}
            onClick={() => setIsDraftModalOpen(true)}
          >
            <span>{t('free_prop_btn_new')}</span>
          </AtriumButton>
        </div>
      </div>

      {/* Top Metrics Pod Tray: 3 Inset Cards including Dark Espresso Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات العروض التجارية والفرص التعاقدية' : language === 'fr' ? 'Indicateurs des Devis & Opportunités' : 'Proposals & Deal Pipeline Indicators'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'متابعة العروض قيد الدراسة، الصفقات الموقعة وقيمة العقود الإجمالية' : language === 'fr' ? 'Suivi du pipeline de prospection, des propositions gagnées et du volume contracté' : 'Pipeline conversion status, active quotes, and total won contract value'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Pending Proposals */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'عروض قيد المراجعة' : language === 'fr' ? 'Devis en Négociation' : 'Pending Review'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                {draftOrPendingProposals.length} {language === 'ar' ? 'عروض' : 'actifs'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums font-mono">
                {draftOrPendingProposals.length}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar' ? 'بانتظار موافقة وتوقيع العملاء' : 'En attente de signature client'}
              </p>
            </div>
          </div>

          {/* Card 2: Sent Devis Pipeline Value */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'قيمة خط العروض (Pipeline)' : language === 'fr' ? 'Pipeline Devis Actif' : 'Active Pipeline'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {draftOrPendingProposals.length} {language === 'ar' ? 'عرض' : 'devis'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums font-mono">
                {formatCurrencyAmount(pipelineValue, 'EUR')}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar' ? 'إجمالي الميزانيات المقترحة' : 'Cumul prévisionnel des devis'}
              </p>
            </div>
          </div>

          {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'عقود موقّعة ومحققة' : language === 'fr' ? 'Contrats Signés & Gagnés' : 'Won Contracts Value'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                {acceptedProposals.length} {language === 'ar' ? 'عقد' : 'gagnés'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {formatCurrencyAmount(wonValue, 'EUR')}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>{language === 'ar' ? 'قيمة المشاريع المحولة للإنتاج' : 'Volume converti en projets'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Collection Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Batch Selection Toolbar */}
        {selectedProposalIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                {selectedProposalIds.size} {language === 'ar' ? 'عروض محددة' : language === 'fr' ? 'devis sélectionnés' : 'proposals selected'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedProposalIds(new Set())}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect'}
              </button>
              <button
                onClick={handleBatchAccept}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle size={13} />
                <span>{language === 'ar' ? 'قبول العروض' : language === 'fr' ? 'Marquer Accepté' : 'Mark Accepted'}</span>
              </button>
              <button
                onClick={handleBatchDecline}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <XCircle size={13} />
                <span>{language === 'ar' ? 'رفض العروض' : language === 'fr' ? 'Marquer Refusé' : 'Mark Declined'}</span>
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

        {/* Seek Search Bar */}
        <div className="flex items-center justify-between gap-4">
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={
            language === 'ar'
              ? 'بحث عن عروض الأسعار حسب العنوان أو العميل...'
              : language === 'fr'
              ? 'Rechercher devis par titre, client...'
              : 'Search proposals by title, client...'
          }
        />
      </div>

      {/* Universal Collection (List view & Grid view with 6-button corner-fan) */}
      <UniversalDataCollection<FreelanceProposal>
        items={sortedProposals}
        keyExtractor={(p) => p.id}
        defaultViewMode="grid"
        columns={proposalColumns}
        sortBy={proposalSortBy}
        sortDirection={proposalSortDir}
        onSortChange={(key) => {
          if (proposalSortBy === key) {
            setProposalSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setProposalSortBy(key);
            setProposalSortDir('asc');
          }
        }}
        renderCard={(proposal) => (
          <div className="flex flex-col justify-between w-full h-full space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                    {proposal.clientCompany || proposal.clientName}
                  </span>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5 leading-snug">
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
                    ? (language === 'ar' ? 'موقّع ونشط' : language === 'fr' ? 'Signé & Actif' : 'Signed & Active')
                    : proposal.status === 'Declined'
                    ? t('free_prop_status_rejected')
                    : (language === 'ar' ? 'بانتظار المراجعة' : language === 'fr' ? 'En attente' : 'Awaiting Review')}
                </span>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-2 leading-relaxed">
                {proposal.overview}
              </p>

              {/* Scope Bullets */}
              <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1 text-[11px]">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  {t('free_prop_scope')} ({proposal.scopeItems.length})
                </span>
                {proposal.scopeItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-neutral-700 dark:text-neutral-300 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C4785A] mt-1 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial terms & conversion action */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  {t('free_prop_total_quote')}
                </span>
                <span className="text-base font-black text-[#C4785A] tabular-nums block">
                  {formatCurrencyAmount(proposal.proposedBudget, proposal.currency)}
                </span>
                <span className="text-[10px] text-neutral-500">
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
                  <span>{language === 'ar' ? 'مشروع نشط' : 'Active Project'}</span>
                </span>
              )}
            </div>
          </div>
        )}
        onItemClick={(proposal) => handleOpenEditModal(proposal)}
        onEdit={(proposal) => handleOpenEditModal(proposal)}
        onTogglePin={(proposal) => {
          setPinnedProposalIds((prev) => {
            const next = new Set(prev);
            if (next.has(proposal.id)) {
              next.delete(proposal.id);
              showToast?.({
                type: 'info',
                title: 'Unpinned',
                message: `${proposal.title} unpinned`,
              });
            } else {
              next.add(proposal.id);
              showToast?.({
                type: 'info',
                title: 'Pinned',
                message: `${proposal.title} pinned to top`,
              });
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
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              handleConvert(proposal.id);
            },
          },
        ]}
        isPinned={(proposal) => pinnedProposalIds.has(proposal.id)}
        selectedIds={selectedProposalIds}
        onSelectionChange={setSelectedProposalIds}
        emptyTitle={t('free_prop_empty_title')}
        emptyDescription={t('free_prop_empty_desc')}
        primaryActionLabel={t('free_prop_btn_new')}
        onAddFirstItem={() => setIsDraftModalOpen(true)}
      />
      </div>

      {/* Draft Proposal Modal */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('free_prop_modal_new_title')}
              </h3>
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
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
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
                <LabelInput
                  id="draft-client-company"
                  label={t('free_clients_field_company', language)}
                  placeholder={t('free_prop_ph_company', language)}
                  value={formData.clientCompany}
                  onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                />
              </div>

              <LabelInput
                id="draft-client-email"
                label={t('free_clients_field_email', language)}
                type="email"
                required
                placeholder="contact@company.com"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              />

              <LabelInput
                id="draft-proposal-title"
                label={t('free_prop_engagement_title', language)}
                required
                placeholder={t('free_prop_ph_title', language)}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t('free_prop_exec_summary', language)}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('free_prop_scope_ph', language)}
                  value={formData.overview}
                  onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Scope Deliverables */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {t('free_prop_scope', language)}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddScopeItem}
                    className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
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
                          onChange={(v) => handleScopeItemChange(idx, String(v?.target?.value || v || ''))}
                          width="100%"
                          height={44}
                          corner={12}
                        />
                      </div>
                      {formData.scopeItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveScopeItem(idx)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 cursor-pointer"
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
                    setFormData({
                      ...formData,
                      currency: (val?.target?.value ?? String(val)) as CurrencyCode,
                    })
                  }
                  options={['DZD', 'EUR', 'USD']}
                />
                <div>
                  <LabelInput
                    id="draft-budget"
                    label={language === 'ar' ? 'الميزانية' : language === 'fr' ? 'Budget' : 'Budget'}
                    type="number"
                    value={formData.proposedBudget}
                    onChange={(e) => setFormData({ ...formData, proposedBudget: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <LabelInput
                    id="draft-weeks"
                    label={language === 'ar' ? 'المدة (أسابيع)' : language === 'fr' ? 'Délai (sem.)' : 'Est. Weeks'}
                    type="number"
                    value={formData.estimatedTimelineWeeks}
                    onChange={(e) => setFormData({ ...formData, estimatedTimelineWeeks: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <LabelInput
                  id="draft-valid-until"
                  label={t('free_prop_valid_until')}
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                >
                  {t('free_clients_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  type="submit"
                >
                  {language === 'ar' ? 'حفظ عرض السعر' : language === 'fr' ? 'Enregistrer le Devis' : 'Save Proposal'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Proposal Modal */}
      {proposalToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'تعديل عرض السعر ونطاق العمل' : language === 'fr' ? 'Modifier le Devis & Périmètre' : 'Edit Proposal Scope & Terms'}
              </h3>
              <button
                type="button"
                onClick={() => setProposalToEdit(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditProposalSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  id="edit-client-name"
                  label={t('free_clients_field_contact')}
                  required
                  value={editFormData.clientName}
                  onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                />
                <LabelInput
                  id="edit-client-company"
                  label={t('free_clients_field_company')}
                  value={editFormData.clientCompany}
                  onChange={(e) => setEditFormData({ ...editFormData, clientCompany: e.target.value })}
                />
              </div>

              <LabelInput
                id="edit-proposal-title"
                label={language === 'ar' ? 'عنوان المشروع / المهمة' : language === 'fr' ? 'Intitulé de la Mission' : 'Proposal Title'}
                required
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {language === 'ar' ? 'ملخص تنفيذي للمشروع' : language === 'fr' ? 'Résumé Exécutif du Projet' : 'Executive Overview'}
                </label>
                <textarea
                  rows={2}
                  value={editFormData.overview}
                  onChange={(e) => setEditFormData({ ...editFormData, overview: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Scope Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {t('free_prop_scope')}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditFormData({
                        ...editFormData,
                        scopeItems: [...editFormData.scopeItems, ''],
                      })
                    }
                    className="text-[11px] font-semibold text-[#C4785A] hover:underline cursor-pointer"
                  >
                    {language === 'ar' ? '+ إضافة تسليمة' : language === 'fr' ? '+ Ajouter un livrable' : '+ Add Item'}
                  </button>
                </div>
                {editFormData.scopeItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <LabelInput
                        field={`EditScopeItem-${idx}`}
                        label={`${language === 'ar' ? 'تسليمة' : language === 'fr' ? 'Livrable' : 'Deliverable Item'} ${idx + 1}`}
                        value={item}
                        onChange={(v) => {
                          const updated = [...editFormData.scopeItems];
                          updated[idx] = String(v?.target?.value || v || '');
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
                        className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <LabelSelect
                  label={t('free_invoices_currency')}
                  value={editFormData.currency}
                  onChange={(val) =>
                    setEditFormData({
                      ...editFormData,
                      currency: (val?.target?.value ?? String(val)) as CurrencyCode,
                    })
                  }
                  options={['DZD', 'EUR', 'USD']}
                />
                <div>
                  <LabelInput
                    id="edit-budget"
                    label={language === 'ar' ? 'الميزانية' : language === 'fr' ? 'Budget' : 'Budget'}
                    type="number"
                    value={editFormData.proposedBudget}
                    onChange={(e) => setEditFormData({ ...editFormData, proposedBudget: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <LabelInput
                    id="edit-weeks"
                    label={language === 'ar' ? 'المدة (أسابيع)' : language === 'fr' ? 'Délai (sem.)' : 'Est. Weeks'}
                    type="number"
                    value={editFormData.estimatedTimelineWeeks}
                    onChange={(e) => setEditFormData({ ...editFormData, estimatedTimelineWeeks: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <LabelInput
                  id="edit-valid-until"
                  label={t('free_prop_valid_until')}
                  type="date"
                  value={editFormData.validUntil}
                  onChange={(e) => setEditFormData({ ...editFormData, validUntil: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setProposalToEdit(null)}
                >
                  {t('free_clients_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  type="submit"
                >
                  {language === 'ar' ? 'حفظ التعديلات' : language === 'fr' ? 'Enregistrer les Modifications' : 'Save Changes'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Proposal Confirmation Modal */}
      {proposalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'حذف عرض السعر' : language === 'fr' ? 'Supprimer le Devis' : 'Delete Proposal'}
                </h3>
                <p className="text-xs text-neutral-500">{proposalToDelete.clientName}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف عرض السعر "${proposalToDelete.title}"؟ سيتم حذف هذا العرض نهائياً من خط العمل.`
                : language === 'fr'
                ? `Êtes-vous sûr de vouloir supprimer le devis "${proposalToDelete.title}" ? Cette action retirera le devis de votre pipeline.`
                : `Are you sure you want to delete proposal "${proposalToDelete.title}"? This will remove the proposal draft from your pipeline.`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <AtriumButton
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setProposalToDelete(null)}
              >
                {t('free_clients_cancel')}
              </AtriumButton>
              <AtriumButton
                variant="danger"
                size="sm"
                type="button"
                onClick={() => {
                  deleteFreelanceProposal(proposalToDelete.id);
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
