import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Plus,
  Home,
  ChevronDown,
  Search,
  Download,
  Check,
  Eye,
  X,
  Phone,
  Mail,
  Calendar,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  Edit,
  AlertCircle,
  Building2,
  Sparkles,
  Scissors,
  Clock,
  Receipt,
  ShoppingCart,
  UserCheck,
  Activity,
  SlidersHorizontal,
  List,
  LayoutGrid,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Member, MemberStatus } from '../../../types/index';
import { calculateDaysRemaining, formatMoney, localizeStatus } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { Seek } from '../../ui/Seek';
import { ActionNode } from '../../ui/ActionNode';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { MemberRow, MemberRowData } from './components/MemberRow';
import { StatusTabs } from './components/StatusTabs';
import { FloatingBulkBar } from './components/FloatingBulkBar';
import { MemberSlideOverInspector } from './MemberSlideOverInspector';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button as BrandedAtriumButton, LiquidButton } from '@/atrium';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { t } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export interface MembershipMembersViewProps {
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
}

export const MembershipMembersView: React.FC<MembershipMembersViewProps> = ({
  onAddMember,
  onEditMember,
}) => {
  const {
    members,
    plans,
    businesses,
    branches,
    currentBusiness,
    currentBusinessId,
    currentBranch,
    terminology,
    language,
    appointments,
    sales,
    schedule,
    switchBusiness,
    switchBranch,
    selectedMember,
    isDetailOpen,
    selectMember,
    closeDetail,
    updateMember,
    deleteMember,
    checkInMember,
    setScreen,
    showToast,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expiring' | 'Expired' | 'Archived'>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female' | 'Other'>('All');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'All' | 'under18' | '18-25' | '26-40' | '41-60' | 'over60' | 'unspecified'>('All');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [pinnedMemberIds, setPinnedMemberIds] = useState<Set<string>>(new Set());
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(new Set());
  const [memberSortBy, setMemberSortBy] = useState<string>('member');
  const [memberSortDir, setMemberSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleExpandMember = (id: string) => {
    setExpandedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [saveNoteSuccess, setSaveNoteSuccess] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [gymDrawerTab, setGymDrawerTab] = useState<'history' | 'sales' | 'bookings'>('history');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  // Helper to compute age from birthdate
  const getMemberAge = (dobString?: string): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const matchesAgeGroup = (dobString: string | undefined, group: string): boolean => {
    if (group === 'All') return true;
    const age = getMemberAge(dobString);
    if (group === 'unspecified') return age === null;
    if (age === null) return false;
    if (group === 'under18') return age < 18;
    if (group === '18-25') return age >= 18 && age <= 25;
    if (group === '26-40') return age >= 26 && age <= 40;
    if (group === '41-60') return age >= 41 && age <= 60;
    if (group === 'over60') return age > 60;
    return true;
  };

  const toggleFilterPopover = () => {
    setIsFilterPopoverOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isFilterPopoverOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterPopoverOpen(false);
        filterButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterPopoverOpen]);

  const hasActiveAdvancedFilters =
    planFilter !== 'All' ||
    genderFilter !== 'All' ||
    ageGroupFilter !== 'All' ||
    statusFilter === 'Expired' ||
    statusFilter === 'Archived';

  const activeFiltersCount =
    (planFilter !== 'All' ? 1 : 0) +
    (genderFilter !== 'All' ? 1 : 0) +
    (ageGroupFilter !== 'All' ? 1 : 0) +
    (statusFilter === 'Expired' || statusFilter === 'Archived' ? 1 : 0);

  const handleResetFilters = () => {
    setPlanFilter('All');
    setGenderFilter('All');
    setAgeGroupFilter('All');
    if (statusFilter === 'Expired' || statusFilter === 'Archived') {
      setStatusFilter('All');
    }
    setSearchQuery('');
    setIsFilterPopoverOpen(false);
  };

  // Dynamic distinct plans derived directly from current catalog and members
  const dynamicAvailablePlans = useMemo(() => {
    const map = new Map<string, { id: string; name: string; price: number }>();
    plans.forEach((p) => {
      map.set(p.id, { id: p.id, name: p.name, price: p.price?.amount || 0 });
    });
    members.forEach((m) => {
      if (m.membershipPlanId && !map.has(m.membershipPlanId)) {
        map.set(m.membershipPlanId, {
          id: m.membershipPlanId,
          name: m.membershipPlanName || m.membershipPlanId,
          price: 0,
        });
      }
    });
    return Array.from(map.values());
  }, [plans, members]);

  // Desktop sample members matching screenshot amira and saraa
  const displayMembers = useMemo(() => {
    return members.filter((member) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'Active' && member.status !== 'Active') return false;
        if (statusFilter === 'Expired' && member.status !== 'Expired') return false;
        if (statusFilter === 'Expiring' && calculateDaysRemaining(false, member.expirationDate) > 14) return false;
        if (statusFilter === 'Archived' && member.status !== 'Banned' && member.status !== 'Suspended') return false;
      }
      if (planFilter !== 'All') {
        if (member.membershipPlanId !== planFilter && member.membershipPlanName !== planFilter) return false;
      }
      if (genderFilter !== 'All') {
        if (genderFilter === 'Other') {
          if (member.gender === 'Male' || member.gender === 'Female') return false;
        } else if (member.gender !== genderFilter) {
          return false;
        }
      }
      if (ageGroupFilter !== 'All') {
        if (!matchesAgeGroup(member.dateOfBirth, ageGroupFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !member.fullName.toLowerCase().includes(q) &&
          !member.phoneNumber.includes(q) &&
          !member.cardId?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [members, statusFilter, planFilter, genderFilter, ageGroupFilter, searchQuery]);


  const customerSalesMetrics = useMemo(() => {
    const memberSalesMap: Record<string, number> = {};
    let totalSpend = 0;
    sales.forEach((s) => {
      if (s.memberId) {
        memberSalesMap[s.memberId] = (memberSalesMap[s.memberId] || 0) + s.totalAmount;
        totalSpend += s.totalAmount;
      }
    });
    const purchasingCount = Object.keys(memberSalesMap).length;
    return { memberSalesMap, totalSpend, purchasingCount };
  }, [sales]);

  const activeMembersCount = useMemo(() => {
    return members.filter((m) => m.status === 'Active').length;
  }, [members]);

  const expiringCount = useMemo(() => {
    return members.filter((m) => calculateDaysRemaining(false, m.expirationDate) <= 14 && calculateDaysRemaining(false, m.expirationDate) > 0).length;
  }, [members]);

  const expiredCount = useMemo(() => {
    return members.filter((m) => m.status === 'Expired').length;
  }, [members]);

  const archivedCount = useMemo(() => {
    return members.filter((m) => m.status === 'Banned' || m.status === 'Suspended').length;
  }, [members]);

  const quickStatusOptions = useMemo(() => [
    { value: 'All', label: t('member_filter_all', language), count: members.length },
    { value: 'Active', label: t('member_filter_active', language), count: activeMembersCount },
    { value: 'Expiring', label: t('member_filter_expiring', language), count: expiringCount },
  ], [language, members.length, activeMembersCount, expiringCount]);

  const toggleSelectAll = () => {
    if (selectedIds.length === displayMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayMembers.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getMemberInitialsColor = (name: string) => {
    if (name.toLowerCase().startsWith('a')) return '#D946EF'; // Magenta amira
    if (name.toLowerCase().startsWith('s')) return '#2563EB'; // Blue saraa
    if (name.toLowerCase().startsWith('y')) return '#d4522f'; // Terracotta
    if (name.toLowerCase().startsWith('n')) return '#10B981'; // Green
    if (name.toLowerCase().startsWith('r')) return '#06B6D4'; // Cyan
    return '#8B5CF6'; // Purple
  };

  const sortedMembers = useMemo(() => {
    const list = [...displayMembers];
    list.sort((a, b) => {
      const aPinned = pinnedMemberIds.has(a.id) ? 1 : 0;
      const bPinned = pinnedMemberIds.has(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      if (memberSortBy === 'member') {
        const comp = a.fullName.localeCompare(b.fullName);
        return memberSortDir === 'asc' ? comp : -comp;
      }
      if (memberSortBy === 'plan') {
        const comp = (a.membershipPlanName || '').localeCompare(b.membershipPlanName || '');
        return memberSortDir === 'asc' ? comp : -comp;
      }
      if (memberSortBy === 'status') {
        const comp = a.status.localeCompare(b.status);
        return memberSortDir === 'asc' ? comp : -comp;
      }
      if (memberSortBy === 'expiration') {
        const comp = (a.expirationDate || '').localeCompare(b.expirationDate || '');
        return memberSortDir === 'asc' ? comp : -comp;
      }
      return 0;
    });
    return list;
  }, [displayMembers, pinnedMemberIds, memberSortBy, memberSortDir]);

  const memberColumns = useMemo<ColumnDefinition<Member>[]>(() => [
    {
      key: 'member',
      header: terminology.memberSingle,
      width: '3.2*',
      sortable: true,
      renderCell: (member) => {
        const avatarColor = getMemberInitialsColor(member.fullName);
        return (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              style={{ backgroundColor: avatarColor }}
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs"
            >
              {member.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-white capitalize truncate">
                  {member.fullName.toLowerCase()}
                </span>
                {pinnedMemberIds.has(member.id) && (
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                    📌 VIP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                <span>ID: {member.cardId?.replace('RFID-', '') || '46466446'}</span>
                {member.phoneNumber && (
                  <>
                    <span>·</span>
                    <span className="hover:text-[#d4522f] transition-colors">{member.phoneNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'plan',
      header: t('member_col_plan', language),
      width: '1.8*',
      sortable: true,
      renderCell: (member) => (
        <div className="text-center">
          <span className="inline-block px-3 py-0.5 rounded-full bg-[#FDF4F0] dark:bg-neutral-700/80 text-[#d4522f] text-[11px] font-bold border border-[#F5E2D8] dark:border-neutral-600 truncate max-w-[130px]">
            {member.membershipPlanName || 'Standard'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('member_col_access', language),
      width: '1.6*',
      sortable: true,
      renderCell: (member) => {
        const isAct = member.status === 'Active';
        const isFroz = member.status === 'Frozen';
        return (
          <div className="text-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                isAct
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                  : isFroz
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAct
                    ? 'bg-emerald-500 animate-[live-heartbeat_1.2s_infinite]'
                    : isFroz
                    ? 'bg-blue-500'
                    : 'bg-rose-500'
                }`}
              />
              {localizeStatus(member.status, language)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'expiration',
      header: currentBusiness.category === 'appointment_service' ? t('salon_col_package_val', language) : t('member_col_expiration', language),
      width: '1.8*',
      sortable: true,
      renderCell: (member) => {
        const daysLeft = calculateDaysRemaining(false, member.expirationDate);
        const isExpiringSoon = daysLeft <= 14 && daysLeft > 0;
        return (
          <div className="text-right pr-2">
            <div className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
              {member.expirationDate || 'N/A'}
            </div>
            <div className={`text-[10px] ${isExpiringSoon ? 'text-amber-600 font-bold' : 'text-neutral-400'}`}>
              {daysLeft > 0 ? `${daysLeft}d remaining` : 'Expired'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'balance',
      header: language === 'ar' ? 'الرصيد' : language === 'fr' ? 'Solde' : 'Balance',
      width: '1.4*',
      sortable: true,
      renderCell: (member) => {
        const matchedPlan = plans.find((p) => p.id === member.membershipPlanId);
        const priceDisplay = matchedPlan ? formatMoney(matchedPlan.price.amount) : '1,500.00 DA';
        return (
          <div className="text-right font-mono font-bold text-xs text-neutral-900 dark:text-white tabular-nums pr-2">
            {priceDisplay}
          </div>
        );
      },
    },
  ], [terminology.memberSingle, language, pinnedMemberIds, currentBusiness.category, plans]);

  const handleExportCSV = () => {
    const headers = [
      language === 'ar' ? 'الاسم الكامل' : language === 'fr' ? 'Nom complet' : 'Full Name',
      language === 'ar' ? 'معرف البطاقة' : language === 'fr' ? 'Identifiant carte' : 'Card ID',
      language === 'ar' ? 'الباقة' : language === 'fr' ? 'Formule' : 'Plan',
      language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      language === 'ar' ? 'الرصيد' : language === 'fr' ? 'Solde' : 'Balance',
      language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone',
      language === 'ar' ? 'البريد الإلكتروني' : language === 'fr' ? 'E-mail' : 'Email',
      language === 'ar' ? 'تاريخ الانتهاء' : language === 'fr' ? 'Date d\'expiration' : 'Expiration Date',
    ];
    const rows = displayMembers.map((m) => [
      `"${m.fullName}"`,
      `"${m.cardId || ''}"`,
      `"${m.membershipPlanName || (language === 'ar' ? 'القياسية' : language === 'fr' ? 'Standard' : 'Standard')}"`,
      `"${localizeStatus(m.status, language)}"`,
      `"0.00 ${language === 'ar' ? 'د.ج' : 'DA'}"`,
      `"${m.phoneNumber}"`,
      `"${m.email}"`,
      `"${m.expirationDate}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-members-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: members.length > 0,
  });

  if (showSkeleton && (members.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '90px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Row 0: Top Header matching Desktop Screenshot 881 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {terminology.members}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Selector: 40px Standard Squircle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-[6px] bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={16} className="text-[#d4522f]" />
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

            {/* Facility Dropdown Menu */}
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
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#d4522f] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#d4522f]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Member Primary Button: Refined 40px Action */}
          <AtriumButton
            variant="primary"
            size="md"
            onClick={onAddMember}
            icon={<Plus size={16} strokeWidth={2.2} />}
            className="px-4 font-semibold shadow-xs"
          >
            <span className="text-xs sm:text-sm font-semibold">
              {t('action_add', language)} {terminology.memberSingle}
            </span>
          </AtriumButton>
        </div>
      </div>

      {/* Row 1: "Roster & Retention Health" Banner Card matching Screenshot 881 */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {terminology.members} & {language === 'ar' ? 'مؤشرات التجديد' : language === 'fr' ? 'Rétention & Renouvellements' : 'Retention Health'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Active Member Base — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {language === 'ar' ? `قاعدة ${terminology.members} النشطة` : language === 'fr' ? `Base active ${terminology.members.toLowerCase()}` : `Active ${terminology.members} Base`}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ 100% {language === 'ar' ? 'نشط' : language === 'fr' ? 'Actifs' : 'Active'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {activeMembersCount}
            </div>
          </div>

          {/* Tile 2: Customer Spend Volume or Renewal Churn Risk */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {language === 'ar' ? 'تنبيهات انتهاء الاشتراك' : language === 'fr' ? 'Alertes de renouvellement' : 'Renewal & Retention Alert'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">
                  {expiringCount} {language === 'ar' ? 'تنتهي قريباً (<14j)' : language === 'fr' ? 'expirent sous 14j' : 'expiring (<14d)'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
              {expiringCount}
            </div>
          </div>

          {/* Tile 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Monthly Inflow & Retention */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'الوافدون الجدد شهرياً' : language === 'fr' ? 'Adhésions du mois' : 'Monthly Inflow'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                +{displayMembers.length} {terminology.members.toLowerCase()}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                +{displayMembers.length}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>
                  {language === 'ar' ? 'باقات وحسابات جديدة هذا الشهر' : language === 'fr' ? 'Nouveaux forfaits et profils ce mois-ci' : 'New packages & client profiles this month'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Members Master Table Group */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Unified Header & Tools Row: Title on Left, Search & Filters Middle, Export on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          {/* Left: Section Title & Count Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              {language === 'ar' ? 'قائمة المشتركين' : 'Liste des adhérents'}
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/70 text-neutral-700 dark:text-neutral-300 shadow-2xs tabular-nums">
              {displayMembers.length}
            </span>
          </div>

          {/* Middle: Search + Quick Status Tabs + Filter Modal Button */}
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            {/* Seek Kinetic Search Box (40px Standard Squircle) */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? `البحث في ${terminology.members}...` : language === 'fr' ? `Rechercher...` : `Search...`}
              shutSize={40}
              openWidth={240}
              className="shrink-0 !rounded-xl"
            />

            {/* Streamlined Quick Status Tabs (Prototype StatusTabs with live counter badges) */}
            <div className="shrink-0">
              <StatusTabs
                tabs={[
                  {
                    id: 'All',
                    label: language === 'ar' ? 'جميع المشتركين' : language === 'fr' ? 'Tous les adhérents' : 'All Members',
                    count: members.length,
                  },
                  {
                    id: 'Active',
                    label: language === 'ar' ? 'اشتراكات نشطة' : language === 'fr' ? 'Abonnements actifs' : 'Active Members',
                    count: activeMembersCount,
                  },
                  {
                    id: 'Expiring',
                    label: language === 'ar' ? 'قيد التجديد (<14 يوم)' : language === 'fr' ? 'À renouveler (<14j)' : 'Expiring (<14d)',
                    count: expiringCount,
                  },
                ]}
                activeTab={statusFilter === 'Expired' || statusFilter === 'Archived' ? 'All' : statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
              />
            </div>

            {/* On-Demand Filters Modal Trigger Button (40px Standard Squircle) */}
            <div className="relative shrink-0">
              <button
                ref={filterButtonRef}
                type="button"
                onClick={toggleFilterPopover}
                className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all shadow-2xs select-none ${
                  hasActiveAdvancedFilters || isFilterPopoverOpen
                    ? 'bg-[#FCEEE8] dark:bg-[#d4522f]/15 text-[#d4522f] border-[#d4522f]/40 ring-1 ring-[#d4522f]/20'
                    : 'bg-white dark:bg-neutral-800 border-[#E9EEF0] dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                }`}
                title={language === 'ar' ? 'مرشحات متقدمة' : language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}
                aria-expanded={isFilterPopoverOpen}
              >
                <SlidersHorizontal size={15} className={hasActiveAdvancedFilters ? 'text-[#d4522f]' : 'text-neutral-500'} />
                <span>{language === 'ar' ? 'مرشحات' : language === 'fr' ? 'Filtres' : 'Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center bg-[#d4522f] text-white tabular-nums">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 text-neutral-400 ${
                    isFilterPopoverOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right Utility Group: View Switcher (List/Grid) + Branded Atrium Export Button (40px Squircle) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Switcher: List | Grid (40px standard squircle) */}
            <LiveSegmentedControl
              size="md"
              options={[
                { value: 'list', icon: <List className="w-4 h-4" />, 'aria-label': 'List View' },
                { value: 'grid', icon: <LayoutGrid className="w-4 h-4" />, 'aria-label': 'Grid View' },
              ]}
              value={viewMode}
              onValueChange={(val) => setViewMode(val as any)}
              aria-label="View Switcher"
            />

            {/* Official Branded Atrium Liquid Export Button (exact 40px height matching row) */}
            <LiquidButton
              kind="export"
              size={40}
              tone="accent"
              labels={{
                idle: language === 'ar' ? 'تصدير' : language === 'fr' ? 'Exporter' : 'Export',
                busy: language === 'ar' ? 'جاري التصدير' : language === 'fr' ? 'Exportation...' : 'Exporting...',
                done: language === 'ar' ? 'تم التصدير' : language === 'fr' ? 'Exporté' : 'Exported',
                error: language === 'ar' ? 'فشل' : language === 'fr' ? 'Échec' : 'Failed',
              }}
              onPress={async () => {
                await new Promise((resolve) => setTimeout(resolve, 600));
                handleExportCSV();
              }}
              title={t('members_export_csv', language)}
              aria-label={t('members_export_csv', language)}
              className="shrink-0 !h-10 !max-h-10 !rounded-xl"
              style={{ height: '40px', maxHeight: '40px', width: '148px' }}
            />
          </div>
        </div>

        {/* Centered Apple-Style Filters Modal Sheet with Frosted Backdrop */}
        {isFilterPopoverOpen && createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsFilterPopoverOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={language === 'ar' ? 'مرشحات متقدمة' : language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}
          >
            <div
              ref={filterPopoverRef}
              className="w-full max-w-lg max-h-[85vh] bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-2xl rounded-[26px] border border-black/5 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-white overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Title, Total Matches, Reset & Close */}
              <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-[#d4522f]/20 flex items-center justify-center text-[#d4522f] shadow-2xs">
                    <SlidersHorizontal size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight block">
                      {language === 'ar' ? 'مرشحات متقدمة' : language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {displayMembers.length} {terminology.members.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveAdvancedFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs font-semibold text-[#d4522f] hover:underline flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md"
                    >
                      <RotateCcw size={12} />
                      <span>{language === 'ar' ? 'إعادة ضبط' : language === 'fr' ? 'Réinitialiser' : 'Reset'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterPopoverOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Close filters"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Filters Body (Apple Inset Groups with Atrium Terracotta Styling) */}
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[58vh] -mr-1">
                {/* Section 1: Gender (Apple Segmented Control Style) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {language === 'ar' ? 'الجنس' : language === 'fr' ? 'Sexe / Genre' : 'Gender'}
                    </label>
                    {genderFilter !== 'All' && (
                      <button
                        type="button"
                        onClick={() => setGenderFilter('All')}
                        className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer"
                      >
                        {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-[10px] border border-neutral-200/60 dark:border-neutral-700/60">
                    {[
                      { val: 'All', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All' },
                      { val: 'Male', label: language === 'ar' ? 'ذكور' : language === 'fr' ? 'Hommes' : 'Male' },
                      { val: 'Female', label: language === 'ar' ? 'إناث' : language === 'fr' ? 'Femmes' : 'Female' },
                      { val: 'Other', label: language === 'ar' ? 'آخر' : language === 'fr' ? 'Autre' : 'Other' },
                    ].map((g) => {
                      const isSelected = genderFilter === g.val;
                      return (
                        <button
                          key={g.val}
                          type="button"
                          onClick={() => setGenderFilter(g.val as any)}
                          className={`h-7 rounded-[7px] text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-bold'
                              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Age Groups (Apple Inset Grouped Tiles) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {language === 'ar' ? 'الفئات العمرية' : language === 'fr' ? "Tranches d'âge" : 'Age Groups'}
                    </label>
                    {ageGroupFilter !== 'All' && (
                      <button
                        type="button"
                        onClick={() => setAgeGroupFilter('All')}
                        className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer"
                      >
                        {language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { val: 'All', label: language === 'ar' ? 'جميع الأعمار' : language === 'fr' ? 'Tous les âges' : 'All Ages' },
                      { val: 'under18', label: '< 18 ans' },
                      { val: '18-25', label: '18 - 25 ans' },
                      { val: '26-40', label: '26 - 40 ans' },
                      { val: '41-60', label: '41 - 60 ans' },
                      { val: 'over60', label: '> 60 ans' },
                    ].map((ag) => {
                      const isSelected = ageGroupFilter === ag.val;
                      const count = members.filter((m) => matchesAgeGroup(m.dateOfBirth, ag.val)).length;
                      return (
                        <button
                          key={ag.val}
                          type="button"
                          onClick={() => setAgeGroupFilter(ag.val as any)}
                          className={`h-9 px-2.5 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-bold shadow-2xs'
                              : 'bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/40'
                          }`}
                        >
                          <span className="truncate">{ag.label}</span>
                          <span className="text-[10px] font-mono opacity-70 tabular-nums ml-1">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Dynamic Membership Plans (Dynamic to Catalog and Database) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {t('member_filter_plan_label', language)}
                    </label>
                    {planFilter !== 'All' && (
                      <button
                        type="button"
                        onClick={() => setPlanFilter('All')}
                        className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer"
                      >
                        {language === 'ar' ? 'عرض الكل' : language === 'fr' ? 'Toutes' : 'Show All'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setPlanFilter('All')}
                      className={`px-3 py-2 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-all ${
                        planFilter === 'All'
                          ? 'bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-bold shadow-2xs'
                          : 'bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <span className="truncate">{t('member_filter_all_plans', language)}</span>
                      <span className="text-[10px] font-mono opacity-70 tabular-nums ml-1">
                        {members.length}
                      </span>
                    </button>
                    {dynamicAvailablePlans.map((p) => {
                      const isSelected = planFilter === p.id || planFilter === p.name;
                      const count = members.filter(
                        (m) => m.membershipPlanId === p.id || m.membershipPlanName === p.name
                      ).length;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlanFilter(p.id)}
                          className={`px-3 py-2 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-bold shadow-2xs'
                              : 'bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                          }`}
                        >
                          <div className="min-w-0 text-left rtl:text-right">
                            <div className="truncate font-semibold">{p.name}</div>
                            {p.price > 0 && (
                              <div className="text-[10px] text-neutral-400 font-mono">
                                {formatMoney(p.price)}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-mono opacity-70 tabular-nums ml-2 shrink-0">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Extended Status Filter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      {language === 'ar' ? 'حالة الحساب والوصول' : language === 'fr' ? 'Statut du compte' : 'Account Status'}
                    </label>
                    {statusFilter !== 'All' && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter('All')}
                        className="text-[10px] text-[#d4522f] font-semibold hover:underline cursor-pointer"
                      >
                        {language === 'ar' ? 'إعادة ضبط' : language === 'fr' ? 'Réinitialiser' : 'Reset'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { val: 'All', label: t('member_filter_all', language), count: members.length, color: 'neutral' },
                      { val: 'Active', label: t('member_filter_active', language), count: activeMembersCount, color: 'emerald' },
                      { val: 'Expiring', label: t('member_filter_expiring', language), count: expiringCount, color: 'amber' },
                      { val: 'Expired', label: t('member_filter_expired', language), count: expiredCount, color: 'rose' },
                      { val: 'Archived', label: t('member_filter_archived', language), count: archivedCount, color: 'zinc' },
                    ].map((item) => {
                      const isSelected = statusFilter === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setStatusFilter(item.val as any)}
                          className={`h-9 px-2.5 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-bold shadow-2xs'
                              : 'bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/40'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                item.color === 'emerald'
                                  ? 'bg-emerald-500'
                                  : item.color === 'amber'
                                  ? 'bg-amber-500'
                                  : item.color === 'rose'
                                  ? 'bg-rose-500'
                                  : item.color === 'zinc'
                                  ? 'bg-neutral-400'
                                  : 'bg-neutral-300'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <span className="text-[10px] font-mono opacity-70 tabular-nums ml-1">
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Action: Reset & Confirmation Button with Branded Atrium Buttons */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 shrink-0">
                {hasActiveAdvancedFilters && (
                  <BrandedAtriumButton
                    tone="soft"
                    size={40}
                    onClick={handleResetFilters}
                    className="font-semibold text-xs"
                  >
                    <span>{language === 'ar' ? 'إعادة ضبط' : language === 'fr' ? 'Réinitialiser' : 'Reset'}</span>
                  </BrandedAtriumButton>
                )}
                <BrandedAtriumButton
                  tone="accent"
                  size={40}
                  onClick={() => setIsFilterPopoverOpen(false)}
                  className="flex-1 font-semibold text-xs"
                >
                  <span>
                    {language === 'ar'
                      ? `عرض ${displayMembers.length} من ${terminology.members}`
                      : language === 'fr'
                      ? `Afficher ${displayMembers.length} ${terminology.members.toLowerCase()}`
                      : `Show ${displayMembers.length} ${terminology.members}`}
                  </span>
                </BrandedAtriumButton>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Active Filter Capsules (Progressive Disclosure Sub-Row) */}
        {hasActiveAdvancedFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
            <span className="text-neutral-400 font-medium text-[11px]">
              {language === 'ar' ? 'المرشحات النشطة:' : language === 'fr' ? 'Filtres actifs:' : 'Active filters:'}
            </span>

            {genderFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
                <span>
                  {language === 'ar' ? 'الجنس' : 'Sexe'}: {genderFilter === 'Male' ? (language === 'ar' ? 'ذكور' : 'Hommes') : genderFilter === 'Female' ? (language === 'ar' ? 'إناث' : 'Femmes') : (language === 'ar' ? 'آخر' : 'Autre')}
                </span>
                <button
                  type="button"
                  onClick={() => setGenderFilter('All')}
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Supprimer filtre"
                  aria-label="Remove gender filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {ageGroupFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
                <span>
                  {language === 'ar' ? 'العمر' : 'Âge'}: {
                    ageGroupFilter === 'under18' ? '< 18 ans' :
                    ageGroupFilter === '18-25' ? '18 - 25 ans' :
                    ageGroupFilter === '26-40' ? '26 - 40 ans' :
                    ageGroupFilter === '41-60' ? '41 - 60 ans' :
                    ageGroupFilter === 'over60' ? '> 60 ans' : 'Tous'
                  }
                </span>
                <button
                  type="button"
                  onClick={() => setAgeGroupFilter('All')}
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Supprimer filtre"
                  aria-label="Remove age filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {planFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
                <span>
                  {t('member_filter_plan_label', language)}: {dynamicAvailablePlans.find((p) => p.id === planFilter)?.name || plans.find((p) => p.id === planFilter)?.name || planFilter}
                </span>
                <button
                  type="button"
                  onClick={() => setPlanFilter('All')}
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Supprimer filtre"
                  aria-label="Remove filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {(statusFilter === 'Expired' || statusFilter === 'Archived') && (
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold">
                <span>
                  {language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status'}: {localizeStatus(statusFilter, language)}
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('All')}
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Supprimer filtre"
                  aria-label="Remove filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline cursor-pointer ml-1"
            >
              {language === 'ar' ? 'إعادة تعيين الكل' : language === 'fr' ? 'Effacer tout' : 'Reset all'}
            </button>
          </div>
        )}

        {/* Master Content Area - Full 100% Width Table / Grid */}
        <div className="w-full">
          {/* Table / Grid Container */}
          <div className="w-full">
            {viewMode === 'list' ? (
              <div className="w-full flex flex-col">
                {/* Prototype Header Bar (.lh) */}
                <div
                  className="lh w-full grid grid-cols-[22px_40px_minmax(200px,1.5fr)_minmax(150px,1fr)_100px_150px_110px] gap-3.5 items-center px-4 pr-[130px] h-[38px] mb-2.5 bg-white dark:bg-[#18181B] border border-neutral-200/90 dark:border-neutral-800 rounded-[12px] text-[#6B635C] dark:text-[#A89F95] font-semibold text-[12px] uppercase tracking-wider shadow-xs box-border select-none"
                  aria-hidden="true"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selectedMemberIds.size === sortedMembers.length && sortedMembers.length > 0}
                    aria-label="Tout sélectionner"
                    onClick={() => {
                      if (selectedMemberIds.size === sortedMembers.length) {
                        setSelectedMemberIds(new Set());
                      } else {
                        setSelectedMemberIds(new Set(sortedMembers.map((m) => m.id)));
                      }
                    }}
                    className={`cb w-[22px] h-[22px] rounded-[7px] border-[1.5px] grid place-items-center p-0 transition-colors duration-140 cursor-pointer ${
                      selectedMemberIds.size === sortedMembers.length && sortedMembers.length > 0
                        ? 'bg-[#C9441F] border-[#C9441F] text-white'
                        : 'bg-white dark:bg-[#262422] border-[#B3A89E] dark:border-[#5A5550] text-transparent hover:border-[#C9441F]'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 stroke-[3] transition-opacity duration-120 ${
                        selectedMemberIds.size === sortedMembers.length && sortedMembers.length > 0
                          ? 'opacity-100 text-white'
                          : 'opacity-0'
                      }`}
                    />
                  </button>
                  <span />
                  <button
                    type="button"
                    onClick={() => {
                      if (memberSortBy === 'member') {
                        setMemberSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setMemberSortBy('member');
                        setMemberSortDir('asc');
                      }
                    }}
                    className="text-left font-semibold text-[12px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-[#C9441F] bg-transparent border-0 p-0 text-inherit"
                  >
                    <span>{terminology.memberSingle}</span>
                    {memberSortBy === 'member' && <span>{memberSortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (memberSortBy === 'plan') {
                        setMemberSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setMemberSortBy('plan');
                        setMemberSortDir('asc');
                      }
                    }}
                    className="text-left font-semibold text-[12px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-[#C9441F] bg-transparent border-0 p-0 text-inherit"
                  >
                    <span>{t('member_col_plan', language)}</span>
                    {memberSortBy === 'plan' && <span>{memberSortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (memberSortBy === 'status') {
                        setMemberSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setMemberSortBy('status');
                        setMemberSortDir('asc');
                      }
                    }}
                    className="text-left font-semibold text-[12px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-[#C9441F] bg-transparent border-0 p-0 text-inherit"
                  >
                    <span>{t('member_col_access', language)}</span>
                    {memberSortBy === 'status' && <span>{memberSortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (memberSortBy === 'expiration') {
                        setMemberSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setMemberSortBy('expiration');
                        setMemberSortDir('asc');
                      }
                    }}
                    className="text-left font-semibold text-[12px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-[#C9441F] bg-transparent border-0 p-0 text-inherit"
                  >
                    <span>{t('member_col_expiration', language)}</span>
                    {memberSortBy === 'expiration' && <span>{memberSortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (memberSortBy === 'balance') {
                        setMemberSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setMemberSortBy('balance');
                        setMemberSortDir('asc');
                      }
                    }}
                    className="text-left font-semibold text-[12px] uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-[#C9441F] bg-transparent border-0 p-0 text-inherit"
                  >
                    <span>{language === 'ar' ? 'الرصيد' : language === 'fr' ? 'Solde' : 'Balance'}</span>
                    {memberSortBy === 'balance' && <span>{memberSortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </div>

                {/* List of Member Rows */}
                {sortedMembers.length === 0 ? (
                  <p className="empty text-center text-[#6B635C] dark:text-[#A89F95] py-10">
                    Aucun adhérent ne correspond. Effacez la recherche ou changez de filtre.
                  </p>
                ) : (
                  <div role="list" aria-label="Adhérents" className="flex flex-col">
                    {sortedMembers.map((member) => {
                      const daysRemaining = calculateDaysRemaining(false, member.expirationDate);
                      const remainingText =
                        daysRemaining > 0
                          ? `${daysRemaining} j restants`
                          : daysRemaining === 0
                          ? 'Expire aujourd’hui'
                          : 'Expiré';
                      const isBlocked =
                        member.status === 'Suspended' ||
                        member.status === 'Banned' ||
                        Boolean((member as any).isBlocked);
                      const isExp = member.status === 'Expired' || daysRemaining <= 0;

                      const memberRowData: MemberRowData = {
                        id: member.id,
                        name: member.fullName || 'Adhérent',
                        phone: member.phoneNumber || '',
                        email: member.email || '',
                        planName: member.membershipPlanName || 'Full Access Monthly',
                        status: isBlocked ? 'Bloqué' : isExp ? 'Expiré' : 'Actif',
                        statusVariant: isBlocked ? 'blocked' : isExp ? 'expired' : 'active',
                        expiryDate: member.expirationDate || 'Non spécifié',
                        daysRemainingLabel: remainingText,
                        balance: (member as any).balance || 0,
                        balanceLabel: (member as any).balance
                          ? `${Math.round((member as any).balance).toLocaleString()} DZD`
                          : 'Soldé',
                        avatarColor: getMemberInitialsColor(member.fullName),
                        remainingSessions: (member as any).remainingSessions || 24,
                        notes: member.notes,
                        isBlocked: isBlocked,
                        isPinned: pinnedMemberIds.has(member.id),
                      };

                      return (
                        <MemberRow
                          key={member.id}
                          member={memberRowData}
                          isSelected={selectedMemberIds.has(member.id)}
                          isOpen={isDetailOpen && selectedMember?.id === member.id}
                          isExpanded={expandedMemberIds.has(member.id)}
                          isPinned={pinnedMemberIds.has(member.id)}
                          viewMode="list"
                          onSelect={() => {
                            setSelectedMemberIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(member.id)) next.delete(member.id);
                              else next.add(member.id);
                              return next;
                            });
                          }}
                          onToggleExpand={() => toggleExpandMember(member.id)}
                          onOpenDetails={() => selectMember(member.id)}
                          onEdit={() => onEditMember(member)}
                          onMessage={() => {
                            if (member.email) {
                              window.location.href = `mailto:${member.email}`;
                            } else {
                              showToast({
                                type: 'info',
                                title: 'Email draft',
                                message: `No email address for ${member.fullName}`,
                              });
                            }
                          }}
                          onDelete={() => {
                            if (window.confirm(`Delete ${member.fullName}?`)) {
                              deleteMember(member.id);
                              showToast({
                                type: 'info',
                                title: 'Member Removed',
                                message: `${member.fullName} has been removed.`,
                              });
                            }
                          }}
                          onRenew={() => {
                            const daysToAdd = 30;
                            const currentExp = new Date(member.expirationDate || new Date().toISOString());
                            const newExp = new Date(currentExp.getTime() + daysToAdd * 864e5).toISOString().split('T')[0];
                            updateMember(member.id, { expirationDate: newExp, status: 'Active' });
                            showToast({
                              type: 'success',
                              title: 'Abonnement renouvelé',
                              message: `${member.fullName} prolongé jusqu'au ${newExp}`,
                            });
                          }}
                          onArchive={() => {
                            updateMember(member.id, { status: 'Suspended' });
                            showToast({
                              type: 'info',
                              title: 'Member Archived',
                              message: `${member.fullName} archivé (suspendu).`,
                            });
                          }}
                          onToggleStatus={() => {
                            const newStatus: MemberStatus = isBlocked ? 'Active' : 'Suspended';
                            updateMember(member.id, { status: newStatus });
                            showToast({
                              type: isBlocked ? 'success' : 'info',
                              title: isBlocked ? 'Badge réactivé' : 'Badge gelé',
                              message: `${member.fullName}: ${isBlocked ? 'Accès rétabli' : 'Accès temporairement suspendu'}`,
                            });
                          }}
                          onTogglePin={() => {
                            setPinnedMemberIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(member.id)) {
                                next.delete(member.id);
                                showToast({
                                  type: 'info',
                                  title: 'Détaché',
                                  message: `${member.fullName} n'est plus épinglé`,
                                });
                              } else {
                                next.add(member.id);
                                showToast({
                                  type: 'success',
                                  title: 'Épinglé',
                                  message: `${member.fullName} épinglé en tête de liste`,
                                });
                              }
                              return next;
                            });
                          }}
                          onPay={() => {
                            selectMember(member.id);
                            setGymDrawerTab('sales');
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <UniversalDataCollection<Member>
                items={sortedMembers}
                keyExtractor={(m) => m.id}
                defaultViewMode={viewMode}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                showViewToggle={false}
                columns={memberColumns}
              isLoading={isSyncing || networkMode === 'force_skeleton'}
              isOffline={networkMode === 'offline'}
              isTimedOut={isSyncTimeout}
              lastSyncedAt={lastSyncedAt}
              onRetrySync={retryCloudSync}
              renderCard={(member) => {
                const avatarColor = getMemberInitialsColor(member.fullName);
                const matchedPlan = plans.find((p) => p.id === member.membershipPlanId);
                const priceDisplay = matchedPlan ? formatMoney(matchedPlan.price.amount) : '1,500.00 DA';
                const daysLeft = calculateDaysRemaining(false, member.expirationDate);

                return (
                  <div className="flex flex-col items-center justify-center w-full">
                    {/* 96x96px Avatar circle with bold initials */}
                    <div
                      style={{ backgroundColor: avatarColor }}
                      className="w-24 h-24 rounded-full flex items-center justify-center text-white text-[32px] font-bold shadow-md mb-4 select-none"
                    >
                      {member.fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* Member Full Name */}
                    <div className="text-base font-bold text-neutral-900 dark:text-white capitalize text-center truncate max-w-[220px]">
                      {member.fullName.toLowerCase()}
                    </div>

                    {/* Plan Badge Pill */}
                    <div className="mt-1.5 inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#FDF4F0] dark:bg-neutral-800 text-[#d4522f] border border-[#F5E2D8] dark:border-neutral-700">
                      {member.membershipPlanName || 'Standard'}
                    </div>

                    {/* Contact & RFID Detail */}
                    <div className="mt-3 w-full pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-xs text-center text-neutral-500 dark:text-neutral-400">
                      <div className="font-mono text-[11px] text-neutral-400">
                        RFID: {member.cardId?.replace('RFID-', '') || '46466446'}
                      </div>
                      {member.phoneNumber && (
                        <div className="truncate font-mono text-[11px] hover:text-[#d4522f] transition-colors">
                          {member.phoneNumber}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                        </span>
                        <span className="font-mono font-bold text-[#d4522f] tabular-nums">
                          {priceDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
              onItemClick={(member) => selectMember(member.id)}
              onViewDetails={(member) => selectMember(member.id)}
              onEdit={(member) => onEditMember(member)}
              onToggleStatus={(member) => {
                const nextStatus: MemberStatus = member.status === 'Active' ? 'Frozen' : 'Active';
                updateMember(member.id, { status: nextStatus });
                showToast({
                  type: 'info',
                  title: `${member.fullName}: ${localizeStatus(nextStatus, language)}`,
                  message: `Status updated to ${nextStatus}`,
                });
              }}
              onTogglePin={(member) => {
                setPinnedMemberIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(member.id)) {
                    next.delete(member.id);
                  } else {
                    next.add(member.id);
                  }
                  return next;
                });
              }}
              onDelete={(member) => {
                if (window.confirm(`Delete ${member.fullName}?`)) {
                  deleteMember(member.id);
                  showToast({
                    type: 'info',
                    title: 'Member Removed',
                    message: `${member.fullName} has been removed.`,
                  });
                }
              }}
              customActions={(member) => [
                {
                  id: 'checkin',
                  label: t('member_drawer_quick_checkin', language),
                  icon: <Check size={14} />,
                  color: '#10B981',
                  tooltip: 'Quick Turnstile Check-in',
                  onClick: (e) => {
                    e.stopPropagation();
                    updateMember(member.id, {
                      lastVisitDate: new Date().toISOString().split('T')[0],
                    });
                    showToast({
                      type: 'success',
                      title: t('toast_checkin_granted_title', language),
                      message: `${member.fullName} (${member.cardId || 'Access Granted'}) : ${t('toast_checkin_granted_msg', language)}`,
                      category: currentBusiness?.category,
                      action: {
                        label: language === 'ar' ? 'معاينة' : language === 'fr' ? 'Consulter' : 'Inspect',
                        onClick: () => selectMember(member.id),
                      },
                    });
                  },
                },
              ]}
              selectedIds={selectedMemberIds}
              onSelectionChange={setSelectedMemberIds}
              bulkSecondaryAction={{
                label: language === 'ar' ? 'تفعيل المشتركين' : language === 'fr' ? 'Activer sélection' : 'Activate Selected',
                icon: <Check size={13} />,
                onClick: (ids) => {
                  ids.forEach((id) => updateMember(id, { status: 'Active' }));
                  showToast({
                    type: 'success',
                    title: language === 'ar' ? 'تم التحديث' : 'Mise à jour effectuée',
                    message: `${ids.size} ${language === 'ar' ? 'مشتركين تم تفعيلهم' : 'adhérents activés'}.`,
                  });
                },
                variant: 'primary',
              }}
              onBulkDelete={(ids) => {
                ids.forEach((id) => deleteMember(id));
                showToast({
                  type: 'info',
                  title: language === 'ar' ? 'حذف المشتركين' : 'Adhérents supprimés',
                  message: `${ids.size} ${language === 'ar' ? 'مشتركين تم حذفهم' : 'adhérents retirés'}.`,
                });
              }}
              isPinned={(member) => pinnedMemberIds.has(member.id)}
              isActive={(member) => member.status === 'Active'}
              sortBy={memberSortBy}
              sortDirection={memberSortDir}
              onSortChange={(key) => {
                if (memberSortBy === key) {
                  setMemberSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setMemberSortBy(key);
                  setMemberSortDir('asc');
                }
              }}
              emptyTitle={language === 'ar' ? 'لا يوجد مشتركون' : language === 'fr' ? 'Aucun adhérent trouvé' : 'No members found'}
              emptyDescription={language === 'ar' ? 'جرب تغيير معايير البحث أو إضافة مشترك جديد' : language === 'fr' ? 'Essayez de modifier vos filtres ou ajoutez un nouvel adhérent' : 'Try adjusting your search filters or add a new member'}
              emptyIcon={<Users size={32} className="text-[#d4522f]" />}
              primaryActionLabel={`${t('action_add', language)} ${terminology.memberSingle}`}
              onAddFirstItem={onAddMember}
            />
          )}
        </div>
      </div>

      {/* Atrium 560px Kinetic Slide-Over Inspector with Shallow Water Wave Physics */}
      <MemberSlideOverInspector
        isOpen={isDetailOpen && Boolean(selectedMember)}
        member={selectedMember}
        allMembers={sortedMembers}
        onClose={closeDetail}
        onSelectMember={(m) => selectMember(m.id)}
        onEdit={(m) => onEditMember(m)}
        onDelete={(m) => {
          deleteMember(m.id);
          closeDetail();
          showToast({
            type: 'info',
            title: 'Adhérent supprimé',
            message: `${m.fullName} a été supprimé.`,
          });
        }}
        onCheckIn={(m) => {
          checkInMember(m.id);
          showToast({
            type: 'success',
            title: 'Passage enregistré',
            message: `Accès autorisé pour ${m.fullName}`,
          });
        }}
        onRenew={(m) => {
          const daysToAdd =
            m.membershipPlanName?.toLowerCase().includes('trimest') ||
            m.membershipPlanName?.toLowerCase().includes('quarter')
              ? 90
              : 30;
          const currentExp = new Date(m.expirationDate || new Date().toISOString());
          const newExp = new Date(currentExp.getTime() + daysToAdd * 864e5).toISOString().split('T')[0];
          updateMember(m.id, { expirationDate: newExp, status: 'Active' });
          showToast({
            type: 'success',
            title: 'Abonnement renouvelé',
            message: `${m.fullName} prolongé jusqu'au ${newExp}`,
          });
        }}
        onToggleBlock={(m) => {
          const isCurrentlyBlocked = m.status === 'Suspended' || m.status === 'Banned' || Boolean((m as any).isBlocked);
          const nextStatus: MemberStatus = isCurrentlyBlocked ? 'Active' : 'Suspended';
          updateMember(m.id, { status: nextStatus, isBlocked: !isCurrentlyBlocked } as any);
          showToast({
            type: 'info',
            title: !isCurrentlyBlocked ? 'Badge bloqué' : 'Badge débloqué',
            message: `Badge de ${m.fullName} ${!isCurrentlyBlocked ? 'bloqué' : 'débloqué'}.`,
          });
        }}
        onUpdateNotes={(id, notes) => updateMember(id, { notes })}
        showToast={(msg) =>
          showToast({
            type: 'info',
            title: 'Notification',
            message: msg,
          })
        }
      />

      {/* Floating Batch Actions Bar (Prototype FloatingBulkBar with spring scale/translate) */}
      <FloatingBulkBar
        selectedCount={selectedMemberIds.size}
        onClear={() => setSelectedMemberIds(new Set())}
        onExport={handleExportCSV}
        onRenew={() => {
          selectedMemberIds.forEach((id) => {
            const m = members.find((x) => x.id === id);
            if (m) {
              const currentExp = new Date(m.expirationDate || new Date().toISOString());
              const newExp = new Date(currentExp.getTime() + 30 * 864e5).toISOString().split('T')[0];
              updateMember(m.id, { expirationDate: newExp, status: 'Active' });
            }
          });
          showToast({
            type: 'success',
            title: 'Renouvellement groupé',
            message: `${selectedMemberIds.size} adhérents renouvelés.`,
          });
        }}
        onArchive={() => {
          selectedMemberIds.forEach((id) => {
            updateMember(id, { status: 'Suspended' });
          });
          setSelectedMemberIds(new Set());
          showToast({
            type: 'info',
            title: 'Archivage groupé',
            message: `${selectedMemberIds.size} adhérents archivés.`,
          });
        }}
        onDelete={() => {
          if (window.confirm(`Supprimer ${selectedMemberIds.size} adhérents?`)) {
            selectedMemberIds.forEach((id) => deleteMember(id));
            setSelectedMemberIds(new Set());
            showToast({
              type: 'info',
              title: 'Suppression groupée',
              message: `Adhérents supprimés.`,
            });
          }
        }}
      />

      {/* Appointment Booking Modal */}
      {selectedMember && (
        <AppointmentModal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          appointment={null}
          initialDate={new Date().toISOString().split('T')[0]}
          initialTime="10:00"
          initialStaffId={undefined}
        />
      )}
    </div>
  );
};

export const MembersScreen = MembershipMembersView;
export type MembersScreenProps = MembershipMembersViewProps;
