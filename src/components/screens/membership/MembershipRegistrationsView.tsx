import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Check,
  X,
  UserCheck,
  Search,
  Download,
  LayoutGrid,
  List,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  Filter,
  Eye,
  Trash2,
  Pin,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RegistrationLead } from '../../../types/index';
import { Avatar } from '../../ui/Avatar';
import { Modal } from '../../ui/Modal';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { localizeStatus } from '../../../utils/rules';
import { t } from '../../../utils/i18n';

export interface MembershipRegistrationsViewProps {
  onAddLead: () => void;
}

export const MembershipRegistrationsView: React.FC<MembershipRegistrationsViewProps> = ({ onAddLead }) => {
  const {
    leads,
    plans,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    terminology,
    updateLeadStatus,
    deleteLead,
    convertLeadToMember,
    currentBusiness,
    language,
    showToast,
  } = useAtriumStore();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Declined'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<RegistrationLead | null>(null);
  const [conversionLead, setConversionLead] = useState<RegistrationLead | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Selection & Pinning State for UniversalDataCollection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [pinnedLeadIds, setPinnedLeadIds] = useState<Set<string>>(new Set());
  const [leadSortBy, setLeadSortBy] = useState<string>('date');
  const [leadSortDir, setLeadSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'All' && lead.status !== statusFilter) return false;
      if (planFilter !== 'All') {
        if (lead.preferredPlanId !== planFilter && lead.preferredPlanName !== planFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.fullName.toLowerCase().includes(q);
        const matchesPhone = lead.phoneNumber.includes(q);
        const matchesEmail = lead.email.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }
      return true;
    });
  }, [leads, statusFilter, planFilter, searchQuery]);

  // Sort with pinning prioritized
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
      if (leadSortBy === 'source') {
        const cmp = a.source.localeCompare(b.source);
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      if (leadSortBy === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return leadSortDir === 'asc' ? cmp : -cmp;
      }
      // Default: date
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return leadSortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredLeads, pinnedLeadIds, leadSortBy, leadSortDir]);

  const pendingCount = useMemo(() => leads.filter((l) => l.status === 'Pending').length, [leads]);
  const approvedCount = useMemo(() => leads.filter((l) => l.status === 'Approved').length, [leads]);

  const handleTogglePinLead = (lead: RegistrationLead) => {
    setPinnedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(lead.id)) {
        next.delete(lead.id);
      } else {
        next.add(lead.id);
      }
      return next;
    });
  };

  const handleStartConversion = (lead: RegistrationLead) => {
    setConversionLead(lead);
    setSelectedPlanId(lead.preferredPlanId || plans[0]?.id || 'plan_a1');
  };

  const handleConfirmConversion = () => {
    if (!conversionLead) return;
    const plan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    convertLeadToMember(
      conversionLead.id,
      plan ? plan.id : 'standard_pkg',
      plan ? plan.name : 'Standard Package',
      plan ? plan.durationDays : 365
    );
    setConversionLead(null);
    if (selectedLead?.id === conversionLead.id) {
      setSelectedLead(null);
    }
  };

  // Batch actions
  const handleBatchApprove = () => {
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
    setSelectedLeadIds(new Set());
    showToast?.({
      type: 'success',
      title: language === 'ar' ? 'تم اعتماد الطلبات' : language === 'fr' ? 'Dossiers validés' : 'Leads Converted',
      message: `${targetIds.length} ${language === 'ar' ? 'طلب تم تحويلهم بنجاح' : language === 'fr' ? 'demandes approuvées et inscrites' : 'leads approved and converted to members'}.`,
    });
  };

  const handleBatchDecline = () => {
    const targetIds = Array.from(selectedLeadIds);
    targetIds.forEach((id) => updateLeadStatus(id, 'Declined'));
    setSelectedLeadIds(new Set());
    showToast?.({
      type: 'info',
      title: language === 'ar' ? 'تم رفض الطلبات' : language === 'fr' ? 'Dossiers refusés' : 'Leads Declined',
      message: `${targetIds.length} ${language === 'ar' ? 'طلب تم رفضهم' : language === 'fr' ? 'demandes passées en refusé' : 'leads marked as declined'}.`,
    });
  };

  const handleBatchDelete = () => {
    const targetIds = Array.from(selectedLeadIds);
    if (deleteLead) {
      targetIds.forEach((id) => deleteLead(id));
    } else {
      targetIds.forEach((id) => updateLeadStatus(id, 'Declined'));
    }
    setSelectedLeadIds(new Set());
    showToast?.({
      type: 'warning',
      title: language === 'ar' ? 'حذف من السجل' : language === 'fr' ? 'Suppression effectuée' : 'Leads Removed',
      message: `${targetIds.length} ${language === 'ar' ? 'طلب تم حذفه من السجل' : language === 'fr' ? 'demandes supprimées' : 'leads removed from registry'}.`,
    });
  };

  const handleExportCSV = () => {
    const headers = [
      language === 'ar' ? 'مقدم الطلب' : language === 'fr' ? 'Candidat' : 'Applicant Name',
      language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone',
      language === 'ar' ? 'البريد الإلكتروني' : language === 'fr' ? 'E-mail' : 'Email',
      language === 'ar' ? 'الباقة المفضلة' : language === 'fr' ? 'Formule souhaitée' : 'Preferred Plan',
      language === 'ar' ? 'قناة الاستقطاب' : language === 'fr' ? 'Canal d\'acquisition' : 'Source',
      language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      language === 'ar' ? 'تاريخ التقديم' : language === 'fr' ? 'Date de soumission' : 'Submitted Date',
    ];
    const rows = sortedLeads.map((l) => [
      `"${l.fullName.replace(/"/g, '""')}"`,
      `"${l.phoneNumber}"`,
      `"${l.email}"`,
      `"${(l.preferredPlanName || plans[0]?.name || 'Standard Package').replace(/"/g, '""')}"`,
      `"${l.source.replace(/"/g, '""')}"`,
      `"${localizeStatus(l.status, language)}"`,
      `"${new Date(l.createdAt).toLocaleDateString()}"`,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `atrium-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Columns definition for UniversalDataCollection
  const leadColumns: ColumnDefinition<RegistrationLead>[] = useMemo(() => [
    {
      key: 'applicant',
      header: language === 'ar' ? 'مقدم الطلب' : language === 'fr' ? 'Candidat / Prospect' : 'Applicant',
      width: '2.5*',
      sortable: true,
      renderCell: (lead) => {
        const isPinned = pinnedLeadIds.has(lead.id);
        return (
          <div className="flex items-center gap-3 min-w-0">
            {isPinned && (
              <span className="w-1.5 h-6 rounded-full bg-[#C4785A] shrink-0" title="Pinned" />
            )}
            <Avatar name={lead.fullName} size={36} />
            <div className="min-w-0">
              <div className="text-sm font-bold text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                <span>{lead.fullName}</span>
                {isPinned && <Pin size={11} className="text-[#C4785A] shrink-0" />}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {lead.phoneNumber} · {lead.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'source',
      header: language === 'ar' ? 'قناة الاستقطاب' : language === 'fr' ? 'Canal d\'acquisition' : 'Acquisition Source',
      width: '1.8*',
      sortable: true,
      renderCell: (lead) => (
        <div>
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {lead.source}
          </span>
          {lead.notes && (
            <span className="block text-[11px] text-neutral-400 truncate max-w-xs mt-0.5">
              {lead.notes}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'plan',
      header: language === 'ar' ? 'الباقة المفضلة' : language === 'fr' ? 'Formule souhaitée' : `Preferred ${terminology.plan}`,
      width: '1.8*',
      sortable: true,
      renderCell: (lead) => (
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] text-xs font-bold border border-[#F5E2D8] dark:border-neutral-700">
            {lead.preferredPlanName || plans[0]?.name || 'Standard Package'}
          </span>
          {lead.preferredStartDate && (
            <span className="block text-[11px] text-neutral-400 mt-0.5">
              {language === 'ar' ? 'بدء: ' : language === 'fr' ? 'Début : ' : 'Start: '}
              {lead.preferredStartDate}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: language === 'ar' ? 'تاريخ التقديم' : language === 'fr' ? 'Date de soumission' : 'Submission Date',
      width: '1.4*',
      sortable: true,
      renderCell: (lead) => (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
          {new Date(lead.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      width: '1.4*',
      sortable: true,
      renderCell: (lead) => {
        const isApp = lead.status === 'Approved';
        const isDec = lead.status === 'Declined';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isApp
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                : isDec
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200'
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
      key: 'actions',
      header: language === 'ar' ? 'إجراءات الاعتماد' : language === 'fr' ? 'Actions' : 'Actions',
      width: '1.6*',
      renderCell: (lead) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {lead.status === 'Pending' ? (
            <>
              <button
                type="button"
                onClick={() => handleStartConversion(lead)}
                style={{ backgroundColor: 'var(--color-accent)' }}
                className="h-7 px-2.5 text-xs font-bold text-white rounded-full flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                title={language === 'ar' ? 'اعتماد' : language === 'fr' ? 'Valider' : 'Convert'}
              >
                <UserCheck size={13} />
                <span>{language === 'ar' ? 'اعتماد' : language === 'fr' ? 'Valider' : 'Convert'}</span>
              </button>
              <button
                type="button"
                onClick={() => updateLeadStatus(lead.id, 'Declined')}
                className="h-7 w-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                title={language === 'ar' ? 'رفض الطلب' : language === 'fr' ? 'Refuser le dossier' : 'Decline Lead'}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedLead(lead)}
              className="h-7 px-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Eye size={12} />
              <span>{language === 'ar' ? 'معاينة' : language === 'fr' ? 'Fiche' : 'View'}</span>
            </button>
          )}
        </div>
      ),
    },
  ], [language, pinnedLeadIds, terminology.plan, plans, updateLeadStatus]);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200 relative">
      {/* Row 0: Top Header matching Desktop App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {terminology.registration}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {language === 'ar'
                ? `إدارة طلبات الانضمام والاستفسارات وتسجيل المشتركين الجدد في ${currentBranch?.name || 'الفرع'}`
                : language === 'fr'
                ? `Traiter les demandes d'adhésion, qualifier les prospects et intégrer les nouveaux membres dans ${currentBranch?.name || 'l\'établissement'}`
                : `Review self-service intake requests, qualify prospects, and onboard new members into ${currentBranch?.name || 'Atrium 1'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative flex-wrap sm:flex-nowrap">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('fast_switch_title', language)}
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
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
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

          {/* Quick Registration Primary Action Button */}
          <AtriumButton
            type="button"
            variant="primary"
            onClick={onAddLead}
            icon={<Plus size={15} strokeWidth={2.5} />}
          >
            <span>{t('reg_add_lead', language)}</span>
          </AtriumButton>
        </div>
      </div>

      {/* Row 1: Pipeline Velocity & Intake Health Banner Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {t('reg_pipeline_health_title', language)}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {t('reg_pipeline_health_desc', language)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Pending Leads Pipeline — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {t('reg_active_intake_label', language)}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                  ↗ {pendingCount} {language === 'ar' ? 'في الانتظار' : language === 'fr' ? 'En attente' : 'Pending'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {pendingCount}
            </div>
          </div>

          {/* Tile 2: Converted Enrollments — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {t('reg_converted_members_label', language)}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  {language === 'ar' ? 'تحويل مؤكد' : language === 'fr' ? 'Conversion réussie' : 'Converted'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {approvedCount}
            </div>
          </div>

          {/* Tile 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Intake Velocity & SLA */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {t('reg_intake_sla_label', language)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                &lt; 15 min
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                &lt; 15 min
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>
                  {language === 'ar' ? 'بوابة التسجيل الذاتي وموقع الجوال' : language === 'fr' ? 'Borne libre-service & web mobile' : 'Self-service Kiosk & Mobile Web'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Registrations Master Table Group */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {terminology.registration} {t('reg_requests_title', language)}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {filteredLeads.length}
            </span>
          </div>

          {/* Right Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Seek Kinetic Search Box */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={
                language === 'ar'
                  ? 'بحث باسم المتقدم، الهاتف، البريد...'
                  : language === 'fr'
                  ? 'Rechercher nom, tél, e-mail...'
                  : 'Search applicant name, phone, email...'
              }
              shutSize={36}
              openWidth={240}
            />

            {/* Status Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Pending', 'Approved', 'Declined'] as const).map((filter) => {
                const isActive = statusFilter === filter;
                const label =
                  filter === 'All'
                    ? t('member_filter_all', language)
                    : filter === 'Pending'
                    ? (language === 'ar' ? 'قيد الانتظار' : language === 'fr' ? 'En attente' : 'Pending')
                    : filter === 'Approved'
                    ? (language === 'ar' ? 'معتمد' : language === 'fr' ? 'Approuvé' : 'Approved')
                    : (language === 'ar' ? 'مرفوض' : language === 'fr' ? 'Refusé' : 'Declined');
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold shadow-2xs' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Plan Filter Dropdown */}
            <LabelSelect
              field="Plan"
              label={t('member_filter_plan_label', language)}
              value={planFilter}
              onChange={(val) => setPlanFilter(val?.target?.value ?? String(val))}
              options={[
                { value: 'All', label: t('member_filter_all_plans', language) },
                ...plans.map((p) => ({ value: p.id, label: p.name })),
              ]}
              width={160}
              height={36}
              corner={18}
            />

            {/* Export Data Button */}
            <AtriumButton
              type="button"
              variant="secondary"
              onClick={handleExportCSV}
              icon={<Download size={13} />}
              title="Download CSV export"
            >
              <span>{language === 'ar' ? 'تصدير البيانات' : language === 'fr' ? 'Exporter les données' : 'Export Data'}</span>
            </AtriumButton>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* Floating Batch Action Toolbar */}
        {selectedLeadIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-neutral-900 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-[#C4785A] text-white font-bold text-[11px]">
                {selectedLeadIds.size}
              </span>
              <span>{language === 'ar' ? 'طلب محدد' : language === 'fr' ? 'dossiers sélectionnés' : 'leads selected'}</span>
              <button
                type="button"
                onClick={() => setSelectedLeadIds(new Set())}
                className="text-neutral-400 hover:text-white underline text-xs cursor-pointer ml-1"
              >
                {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect all'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <AtriumButton
                type="button"
                variant="primary"
                size="xs"
                onClick={handleBatchApprove}
                icon={<UserCheck size={13} />}
              >
                <span>{language === 'ar' ? 'اعتماد وتحويل' : language === 'fr' ? 'Valider la sélection' : 'Batch Approve'}</span>
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="secondary"
                size="xs"
                onClick={handleBatchDecline}
                icon={<X size={13} />}
              >
                <span>{language === 'ar' ? 'رفض' : language === 'fr' ? 'Refuser' : 'Decline'}</span>
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="danger"
                size="xs"
                onClick={handleBatchDelete}
                icon={<Trash2 size={13} />}
              >
                <span>{language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete'}</span>
              </AtriumButton>
            </div>
          </div>
        )}

        {/* UniversalDataCollection Component */}
        <UniversalDataCollection<RegistrationLead>
          items={sortedLeads}
          keyExtractor={(lead) => lead.id}
          defaultViewMode={viewMode}
          columns={leadColumns}
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
          isPinned={(lead) => pinnedLeadIds.has(lead.id)}
          onTogglePin={handleTogglePinLead}
          onItemClick={(lead) => setSelectedLead(lead)}
          sortBy={leadSortBy}
          sortDirection={leadSortDir}
          onSortChange={(colKey) => {
            if (leadSortBy === colKey) {
              setLeadSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
              setLeadSortBy(colKey);
              setLeadSortDir('asc');
            }
          }}
          showViewToggle={false}
          emptyTitle={
            language === 'ar'
              ? 'لا توجد طلبات تسجيل'
              : language === 'fr'
              ? 'Aucune demande d\'inscription'
              : 'No Registration Requests'
          }
          emptyDescription={
            language === 'ar'
              ? 'لا توجد طلبات تطابق الفلتر الحالي، يمكنك إضافة طلب تسجيل جديد'
              : language === 'fr'
              ? 'Aucun prospect ne correspond aux critères actuels. Vous pouvez saisir une nouvelle demande.'
              : 'No intake leads match current filters. You can record a new intake lead.'
          }
          renderCard={(lead) => {
            const isPinned = pinnedLeadIds.has(lead.id);
            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`p-5 rounded-[22px] border transition-all cursor-pointer relative shadow-2xs ${
                  selectedLead?.id === lead.id
                    ? 'border-[#C4785A] bg-[#FCEEE8]/40 dark:bg-neutral-800/80 ring-1 ring-[#C4785A]/30'
                    : 'border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 hover:border-[#D5DFE3] dark:hover:border-neutral-600'
                }`}
              >
                {/* Pin indicator */}
                {isPinned && (
                  <div className="absolute top-3 left-3 text-[#C4785A]" title="Pinned lead">
                    <Pin size={12} className="fill-[#C4785A]" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3 pl-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      lead.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : lead.status === 'Declined'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {localizeStatus(lead.status, language)}
                  </span>
                  <span className="text-[11px] text-neutral-400 tabular-nums">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={lead.fullName} size={42} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {lead.fullName}
                    </h3>
                    <p className="text-xs text-neutral-500 truncate">{lead.phoneNumber}</p>
                  </div>
                </div>

                <div className="text-xs space-y-1 mb-4 text-neutral-600 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{language === 'ar' ? 'الباقة:' : language === 'fr' ? 'Formule :' : 'Plan:'}</span>
                    <span className="font-bold text-[#C4785A] truncate max-w-[140px]">
                      {lead.preferredPlanName || plans[0]?.name || 'Standard Package'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{language === 'ar' ? 'المصدر:' : language === 'fr' ? 'Source :' : 'Source:'}</span>
                    <span className="truncate max-w-[140px]">{lead.source}</span>
                  </div>
                </div>

                {lead.status === 'Pending' ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <AtriumButton
                      type="button"
                      variant="primary"
                      size="xs"
                      onClick={() => handleStartConversion(lead)}
                      icon={<UserCheck size={13} />}
                      className="flex-1 justify-center"
                    >
                      <span>{language === 'ar' ? 'اعتماد وتحويل' : language === 'fr' ? 'Valider' : 'Convert'}</span>
                    </AtriumButton>
                    <button
                      type="button"
                      onClick={() => updateLeadStatus(lead.id, 'Declined')}
                      className="h-7 w-7 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <AtriumButton
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLead(lead);
                    }}
                    icon={<Eye size={13} />}
                    className="w-full justify-center"
                  >
                    <span>{language === 'ar' ? 'عرض تفاصيل الملف' : language === 'fr' ? 'Consulter le dossier' : 'View Full Dossier'}</span>
                  </AtriumButton>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Desktop Slide-out Inspector Drawer for Registration Lead */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={17} className="text-[#C4785A]" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'معاينة ملف المرشح' : language === 'fr' ? 'Fiche du prospect' : 'Prospect Dossier Inspector'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLead(null)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Lead Card Profile */}
            <div className="p-5 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center gap-4">
              <Avatar name={selectedLead.fullName} size={50} />
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedLead.fullName}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                    selectedLead.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : selectedLead.status === 'Declined'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {localizeStatus(selectedLead.status, language)}
                </span>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'معلومات الاتصال والتفاصيل' : language === 'fr' ? 'Contact & Détails' : 'Contact & Details'}
              </span>
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    {selectedLead.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    {selectedLead.email}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {language === 'ar' ? 'تاريخ البدء المطلوب:' : language === 'fr' ? 'Début souhaité :' : 'Requested start:'}{' '}
                    <strong className="text-neutral-900 dark:text-white">
                      {selectedLead.preferredStartDate || (language === 'ar' ? 'فوري' : language === 'fr' ? 'Immédiat' : 'Immediate')}
                    </strong>
                  </span>
                </div>
                {selectedLead.notes && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 text-neutral-500">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {language === 'ar' ? 'الملاحظات:' : language === 'fr' ? 'Remarques :' : 'Notes:'}
                    </span>{' '}
                    {selectedLead.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Preferred Plan */}
            <div className="p-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#E8DFD8] dark:border-neutral-700 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#C4785A]">
                  {language === 'ar' ? 'الباقة المفضلة' : language === 'fr' ? 'Formule préférée' : 'Preferred Plan'}
                </span>
                <div className="text-sm font-black text-neutral-900 dark:text-white mt-0.5">
                  {selectedLead.preferredPlanName || plans[0]?.name || 'Standard Package'}
                </div>
              </div>
              <span className="text-base font-black text-[#C4785A] tabular-nums">
                1 500 {language === 'ar' ? 'د.ج' : 'DA'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {selectedLead.status === 'Pending' ? (
                <>
                  <AtriumButton
                    type="button"
                    variant="primary"
                    onClick={() => handleStartConversion(selectedLead)}
                    icon={<UserCheck size={16} />}
                    className="w-full justify-center"
                  >
                    <span>
                      {language === 'ar'
                        ? 'اعتماد العضوية وتسجيل الاشتراك'
                        : language === 'fr'
                        ? 'Valider l\'adhésion & Inscrire'
                        : 'Approve & Convert to Member'}
                    </span>
                  </AtriumButton>
                  <AtriumButton
                    type="button"
                    variant="danger"
                    onClick={() => {
                      updateLeadStatus(selectedLead.id, 'Declined');
                      setSelectedLead(null);
                    }}
                    className="w-full justify-center"
                  >
                    <span>{language === 'ar' ? 'رفض الطلب' : language === 'fr' ? 'Refuser la demande' : 'Decline Registration'}</span>
                  </AtriumButton>
                </>
              ) : (
                <AtriumButton
                  type="button"
                  variant="primary"
                  onClick={() => setSelectedLead(null)}
                  className="w-full justify-center"
                >
                  <span>{language === 'ar' ? 'إغلاق الملف' : language === 'fr' ? 'Fermer le dossier' : 'Close Dossier'}</span>
                </AtriumButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert Lead to Member Modal */}
      <Modal
        isOpen={conversionLead !== null}
        onClose={() => setConversionLead(null)}
        title={
          language === 'ar'
            ? 'اعتماد العضوية وتسجيل المشترك'
            : language === 'fr'
            ? 'Valider l\'adhésion et créer l\'adhérent'
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
            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 text-xs space-y-1">
              <div>
                <strong className="text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'المتقدم:' : language === 'fr' ? 'Candidat :' : 'Applicant:'}
                </strong>{' '}
                {conversionLead.fullName}
              </div>
              <div>
                <strong className="text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'الهاتف:' : language === 'fr' ? 'Téléphone :' : 'Phone:'}
                </strong>{' '}
                {conversionLead.phoneNumber} · {conversionLead.email}
              </div>
              <div>
                <strong className="text-neutral-900 dark:text-white">
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
                  sublabel: `${p.durationDays} ${t('member_days_unit', language)} · ${p.price.amount.toLocaleString()} ${language === 'ar' ? 'د.ج' : 'DA'}`,
                }))}
                searchable
                width="100%"
                height={46}
                corner={14}
              />
            </div>

            <div className="p-3 rounded-2xl bg-[#C4785A]/10 border border-[#C4785A]/20 text-xs text-[#C4785A]">
              {language === 'ar'
                ? 'عند التأكيد، سيتم إنشاء معرف بطاقة RFID تلقائياً، واعتماد الطلب، وتسجيل المشترك مباشرة.'
                : language === 'fr'
                ? 'Dès validation, un badge RFID unique sera attribué, le dossier sera approuvé et l\'adhérent actif immédiatement.'
                : 'Upon confirmation, a unique RFID card credential will be generated automatically, the lead will be marked Approved, and the member will be enrolled immediately.'}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <AtriumButton
                type="button"
                variant="ghost"
                onClick={() => setConversionLead(null)}
              >
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
                    ? 'Confirmer & Créer l\'adhérent'
                    : 'Confirm & Create Member'}
                </span>
              </AtriumButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export const RegistrationsScreen = MembershipRegistrationsView;
export type RegistrationsScreenProps = MembershipRegistrationsViewProps;
