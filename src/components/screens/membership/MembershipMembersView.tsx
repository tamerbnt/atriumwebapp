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
  const [memberSortBy, setMemberSortBy] = useState<string>('member');
  const [memberSortDir, setMemberSortDir] = useState<'asc' | 'desc'>('asc');
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
    if (name.toLowerCase().startsWith('y')) return '#C4785A'; // Terracotta
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
                    <span className="hover:text-[#C4785A] transition-colors">{member.phoneNumber}</span>
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
          <span className="inline-block px-3 py-0.5 rounded-full bg-[#FDF4F0] dark:bg-neutral-700/80 text-[#C4785A] text-[11px] font-bold border border-[#F5E2D8] dark:border-neutral-600 truncate max-w-[130px]">
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
              <Home size={16} className="text-[#C4785A]" />
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
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
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

            {/* Streamlined Quick Status Tabs (40px Standard Squircle) */}
            <div className="shrink-0">
              <LiveSegmentedControl
                size="md"
                value={statusFilter === 'Expired' || statusFilter === 'Archived' ? '' : statusFilter}
                onValueChange={(val) => setStatusFilter(val as any)}
                options={quickStatusOptions}
                aria-label="Member Status Filter"
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
                    ? 'bg-[#FCEEE8] dark:bg-[#C4785A]/15 text-[#C4785A] border-[#C4785A]/40 ring-1 ring-[#C4785A]/20'
                    : 'bg-white dark:bg-neutral-800 border-[#E9EEF0] dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                }`}
                title={language === 'ar' ? 'مرشحات متقدمة' : language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}
                aria-expanded={isFilterPopoverOpen}
              >
                <SlidersHorizontal size={15} className={hasActiveAdvancedFilters ? 'text-[#C4785A]' : 'text-neutral-500'} />
                <span>{language === 'ar' ? 'مرشحات' : language === 'fr' ? 'Filtres' : 'Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center bg-[#C4785A] text-white tabular-nums">
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
                  <div className="w-9 h-9 rounded-full bg-[#FCEEE8] dark:bg-[#C4785A]/20 flex items-center justify-center text-[#C4785A] shadow-2xs">
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
                      className="text-xs font-semibold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md"
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
                        className="text-[10px] text-[#C4785A] font-semibold hover:underline cursor-pointer"
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
                        className="text-[10px] text-[#C4785A] font-semibold hover:underline cursor-pointer"
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
                              ? 'bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border-[#C4785A]/40 font-bold shadow-2xs'
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
                        className="text-[10px] text-[#C4785A] font-semibold hover:underline cursor-pointer"
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
                          ? 'bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border-[#C4785A]/40 font-bold shadow-2xs'
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
                              ? 'bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border-[#C4785A]/40 font-bold shadow-2xs'
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
                        className="text-[10px] text-[#C4785A] font-semibold hover:underline cursor-pointer"
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
                              ? 'bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border-[#C4785A]/40 font-bold shadow-2xs'
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
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border border-[#C4785A]/30 text-xs font-semibold">
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
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border border-[#C4785A]/30 text-xs font-semibold">
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
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border border-[#C4785A]/30 text-xs font-semibold">
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
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#FCEEE8] dark:bg-[#C4785A]/20 text-[#C4785A] border border-[#C4785A]/30 text-xs font-semibold">
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
                    <div className="mt-1.5 inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] border border-[#F5E2D8] dark:border-neutral-700">
                      {member.membershipPlanName || 'Standard'}
                    </div>

                    {/* Contact & RFID Detail */}
                    <div className="mt-3 w-full pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-xs text-center text-neutral-500 dark:text-neutral-400">
                      <div className="font-mono text-[11px] text-neutral-400">
                        RFID: {member.cardId?.replace('RFID-', '') || '46466446'}
                      </div>
                      {member.phoneNumber && (
                        <div className="truncate font-mono text-[11px] hover:text-[#C4785A] transition-colors">
                          {member.phoneNumber}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                        </span>
                        <span className="font-mono font-bold text-[#C4785A] tabular-nums">
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
              emptyIcon={<Users size={32} className="text-[#C4785A]" />}
              primaryActionLabel={`${t('action_add', language)} ${terminology.memberSingle}`}
              onAddFirstItem={onAddMember}
            />
          </div>
        </div>
      </div>

      {/* Floating Free-Floating Member Detail Island Card (Separated like Sidebar) */}
      {isDetailOpen && selectedMember && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end p-4 pointer-events-none animate-in fade-in duration-200" role="dialog" aria-modal="true">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-neutral-950/40 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer pointer-events-auto"
            onClick={closeDetail}
            aria-hidden="true"
          />

          {/* Floating Freely 480px Card with Complete Rounded Corners (Matching Sidebar Margin & Radius) */}
          <aside
            style={{
              width: '480px',
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: '28px',
            }}
            className="relative z-10 h-full bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] flex flex-col justify-between overflow-hidden pointer-events-auto animate-in zoom-in-95 fade-in duration-200 select-none touch-pan-y"
          >
            {/* Drawer Body with Apple Top-Level Segmented Tabs */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Header: Avatar, Name, Badges, Close */}
              <div className="p-6 pb-3 shrink-0 border-b border-neutral-100 dark:border-neutral-800/80">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      style={{
                        backgroundColor: getMemberInitialsColor(selectedMember.fullName),
                      }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm ring-2 ring-white dark:ring-neutral-700 select-none"
                    >
                      {selectedMember.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white capitalize leading-tight">
                        {selectedMember.fullName}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-[#C4785A] bg-[#FCEEE8] dark:bg-[#C4785A]/15 px-2.5 py-0.5 rounded-full border border-[#C4785A]/20">
                          {selectedMember.membershipPlanName || (language === 'ar' ? 'الباقة القياسية' : language === 'fr' ? 'Formule Standard' : 'Standard Package')}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> {t('member_drawer_verified', language)}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          ID: {selectedMember.cardId || '46466446'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeDetail}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors shadow-2xs border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                    aria-label="Close details"
                  >
                    <X size={17} />
                  </button>
                </div>

                {/* Top-Level Apple Segmented Control - Full Width Tabs */}
                <div className="mt-4 pt-1">
                  <LiveSegmentedControl
                    size="md"
                    value={gymDrawerTab}
                    onValueChange={(val) => setGymDrawerTab(val as any)}
                    options={[
                      {
                        value: 'history',
                        label: language === 'ar' ? 'البطاقة والاشتراك' : language === 'fr' ? 'Aperçu & Forfait' : 'Overview & Pass',
                      },
                      {
                        value: 'bookings',
                        label: language === 'ar' ? 'سجل الدخول والحصص' : language === 'fr' ? 'Accès & Séances' : 'Access & Bookings',
                      },
                      {
                        value: 'sales',
                        label: language === 'ar' ? 'المشتريات والفواتير' : language === 'fr' ? 'Ventes & Factures' : 'Sales & Receipts',
                      },
                    ]}
                    aria-label="Member Detail Inspector Navigation"
                  />
                </div>
              </div>

              {/* Tab 1: Overview & Subscription (Full Height) */}
              {gymDrawerTab === 'history' && (
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5 animate-in fade-in duration-150">
                  {/* Quick Action Squircle Tiles */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      {language === 'ar' ? 'الإجراءات السريعة' : language === 'fr' ? 'Actions rapides' : 'Quick Actions'}
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => checkInMember(selectedMember.id)}
                        className="h-16 p-2 rounded-[14px] bg-[#FDF4F0] dark:bg-[#C4785A]/15 text-xs font-semibold flex flex-col items-center justify-center gap-1 text-[#C4785A] hover:bg-[#FCEEE8] cursor-pointer transition-all border border-[#F5E2D8] dark:border-[#C4785A]/30 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                        title={t('member_drawer_quick_checkin', language)}
                      >
                        <UserCheck size={18} />
                        <span className="text-[10px] font-medium truncate max-w-full">{t('member_drawer_quick_checkin', language)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditMember(selectedMember)}
                        className="h-16 p-2 rounded-[14px] bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold flex flex-col items-center justify-center gap-1 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Edit size={18} className="text-[#C4785A]" />
                        <span className="text-[10px] font-medium truncate max-w-full">{t('action_edit', language)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = selectedMember.status === 'Frozen' ? 'Active' : 'Frozen';
                          updateMember(selectedMember.id, { status: next });
                        }}
                        className="h-16 p-2 rounded-[14px] bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold flex flex-col items-center justify-center gap-1 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {selectedMember.status === 'Frozen' ? (
                          <Unlock size={18} className="text-emerald-500" />
                        ) : (
                          <Lock size={18} className="text-amber-500" />
                        )}
                        <span className="text-[10px] font-medium truncate max-w-full">
                          {selectedMember.status === 'Frozen'
                            ? t('member_drawer_unblock', language)
                            : t('member_drawer_block', language)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMember(selectedMember.id, { remainingSessions: (selectedMember.remainingSessions || 0) + 30 })}
                        className="h-16 p-2 rounded-[14px] bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold flex flex-col items-center justify-center gap-1 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <RotateCcw size={18} className="text-blue-500" />
                        <span className="text-[10px] font-medium truncate max-w-full">{currentBusiness.category === 'appointment_service' ? '+Pass' : t('member_drawer_renew', language)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Subscription Overview Card */}
                  <div className="p-4 rounded-[20px] bg-[#F8F9FA] dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/70 text-xs space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-200/50 dark:border-neutral-700/50">
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                        {currentBusiness.category === 'appointment_service'
                          ? t('salon_package_plan', language)
                          : (language === 'ar' ? 'باقة الاشتراك:' : language === 'fr' ? 'Formule d\'abonnement :' : 'Account Plan:')}
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[220px]">
                        {selectedMember.membershipPlanName || (currentBusiness.category === 'appointment_service' ? t('salon_standard_package', language) : (language === 'ar' ? 'الباقة القياسية' : language === 'fr' ? 'Formule Standard' : 'Standard Package'))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                        {language === 'ar' ? 'تاريخ الانتهاء:' : language === 'fr' ? 'Date d\'échéance :' : 'Expiration Date:'}
                      </span>
                      <span className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200 font-mono">
                        {selectedMember.expirationDate}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                        {language === 'ar' ? 'الأيام المتبقية:' : language === 'fr' ? 'Jours restants :' : 'Remaining Days:'}
                      </span>
                      <span className="font-bold text-[#C4785A] tabular-nums">
                        {calculateDaysRemaining(false, selectedMember.expirationDate)} {t('member_days_unit', language)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                        {currentBusiness.category === 'appointment_service'
                          ? t('salon_included_sessions', language)
                          : (language === 'ar' ? 'الحصص المتبقية:' : language === 'fr' ? 'Séances restantes :' : 'Remaining Sessions:')}
                      </span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {selectedMember.remainingSessions || 30} {currentBusiness.category === 'appointment_service' ? t('salon_session_unit', language) : (language === 'ar' ? 'حصة' : language === 'fr' ? 'séances' : 'visits')}
                      </span>
                    </div>
                  </div>

                  {/* Contact Information Group */}
                  <div className="space-y-2 text-xs">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      {language === 'ar' ? 'بيانات الاتصال والدخول' : language === 'fr' ? 'Contact & Accès' : 'Contact & Access'}
                    </h4>
                    <div className="p-3.5 rounded-[18px] bg-[#F8F9FA] dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
                        <Phone size={14} className="text-neutral-400 shrink-0" />
                        <span className="font-mono text-xs">{selectedMember.phoneNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300">
                        <Mail size={14} className="text-neutral-400 shrink-0" />
                        <span className="text-xs truncate">{selectedMember.email || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Staff Notes */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        {language === 'ar' ? 'ملاحظات الفريق' : language === 'fr' ? 'Notes du personnel' : 'Staff Notes'}
                      </h4>
                      {saveNoteSuccess && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check size={11} /> {language === 'ar' ? 'تم الحفظ' : language === 'fr' ? 'Enregistré' : 'Saved'}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={selectedMember.notes || ''}
                      onChange={(e) => {
                        updateMember(selectedMember.id, { notes: e.target.value });
                        setSaveNoteSuccess(true);
                        setTimeout(() => setSaveNoteSuccess(false), 2000);
                      }}
                      placeholder={language === 'ar' ? 'أضف ملاحظات خاصة حول المشترك...' : language === 'fr' ? 'Ajouter des notes internes sur l\'adhérent...' : 'Add private staff notes...'}
                      className="w-full p-3.5 rounded-[18px] border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-800/60 text-xs focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white resize-none shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Turnstile Access & Bookings (Full Vertical Height) */}
              {gymDrawerTab === 'bookings' && (
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5 animate-in fade-in duration-150">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        {language === 'ar' ? 'سجل دخول البوابة الإلكترونية' : language === 'fr' ? 'Historique des passages tourniquet' : 'Turnstile Access Log'}
                      </h4>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        {language === 'ar' ? 'مباشر' : 'Live'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3.5 rounded-[18px] border border-neutral-200/70 dark:border-neutral-800/80 bg-[#F8F9FA] dark:bg-neutral-800/40 text-xs flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">
                              {language === 'ar' ? 'بوابة الدخول الرئيسية A1' : language === 'fr' ? 'Portique Tourniquet A1' : 'Main Turnstile Gate A1'}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {language === 'ar' ? 'اليوم · 09:14' : language === 'fr' ? 'Aujourd\'hui · 09:14' : 'Today · 09:14'} · {selectedMember.cardId || 'RFID-994821'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                          {language === 'ar' ? 'تم الدخول' : language === 'fr' ? 'Accès Autorisé' : 'Admitted'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-[18px] border border-neutral-200/70 dark:border-neutral-800/80 bg-[#F8F9FA] dark:bg-neutral-800/40 text-xs flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">
                              {language === 'ar' ? 'بوابة الدخول الرئيسية A1' : language === 'fr' ? 'Portique Tourniquet A1' : 'Main Turnstile Gate A1'}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {language === 'ar' ? 'أمس · 17:35' : language === 'fr' ? 'Hier · 17:35' : 'Yesterday · 17:35'} · {selectedMember.cardId || 'RFID-994821'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                          {language === 'ar' ? 'تم الدخول' : language === 'fr' ? 'Accès Autorisé' : 'Admitted'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      {language === 'ar' ? 'الحصص والأنشطة المحجوزة' : language === 'fr' ? 'Séances & Cours réservés' : 'Booked Classes & Sessions'}
                    </h4>
                    <div className="space-y-2">
                      {schedule.slice(0, 4).map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-[18px] border border-neutral-200/70 dark:border-neutral-800/80 bg-[#F8F9FA] dark:bg-neutral-800/40 text-xs flex flex-col gap-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {ev.title}
                            </span>
                            <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2.5 py-0.5 rounded-full">
                              {ev.category}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-500">
                            <span>{ev.startTime} - {ev.endTime} • {ev.roomOrArea}</span>
                            <span className="text-neutral-400 font-medium">{ev.trainerOrStaff}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Sales & Purchases (Full Vertical Height) */}
              {gymDrawerTab === 'sales' && (
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 animate-in fade-in duration-150">
                  {(() => {
                    const memberSales = sales.filter((s) => s.memberId === selectedMember.id);
                    if (memberSales.length === 0) {
                      return (
                        <div className="p-8 rounded-[20px] border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
                          <ShoppingCart size={24} className="text-neutral-300 dark:text-neutral-600" />
                          <p className="text-xs font-medium">
                            {language === 'ar' ? 'لا توجد مشتريات مسجلة للمشترك' : language === 'fr' ? 'Aucun achat boutique enregistré' : 'No purchases recorded for this member'}
                          </p>
                        </div>
                      );
                    }

                    const totalSpent = memberSales.reduce((sum, s) => sum + s.totalAmount, 0);

                    return (
                      <>
                        <div className="p-4 rounded-[20px] bg-[#FCEEE8] dark:bg-[#C4785A]/15 border border-[#C4785A]/30 flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[11px] text-[#C4785A] font-bold uppercase tracking-wider block">
                              {language === 'ar' ? 'إجمالي المشتريات' : language === 'fr' ? 'Total des achats' : 'Lifetime Spend'}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {memberSales.length} {language === 'ar' ? 'عمليات دفع' : 'factures'}
                            </span>
                          </div>
                          <span className="text-lg font-bold font-mono text-[#C4785A] tabular-nums">
                            {formatMoney(totalSpent)}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {memberSales.map((sale) => (
                            <div
                              key={sale.id}
                              className="p-3.5 rounded-[18px] border border-neutral-200/70 dark:border-neutral-800/80 bg-[#F8F9FA] dark:bg-neutral-800/40 text-xs flex flex-col gap-1.5 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-neutral-900 dark:text-white font-mono">
                                  #{sale.id.slice(-6).toUpperCase()}
                                </span>
                                <span className="font-bold text-emerald-600 font-mono">
                                  {formatMoney(sale.totalAmount)}
                                </span>
                              </div>
                              <div className="text-[11px] text-neutral-500 truncate">
                                {sale.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1.5 border-t border-neutral-200/50 dark:border-neutral-700/50">
                                <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                                <span className="font-medium text-neutral-600 dark:text-neutral-300">{sale.paymentMethod}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const confirmMsg = language === 'ar'
                    ? `هل أنت متأكد من حذف ${selectedMember.fullName}؟`
                    : language === 'fr'
                    ? `Supprimer définitivement ${selectedMember.fullName} ?`
                    : `Delete ${selectedMember.fullName}?`;
                  if (confirm(confirmMsg)) {
                    deleteMember(selectedMember.id);
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 size={14} />
                <span>
                  {language === 'ar'
                    ? `حذف ${terminology.memberSingle}`
                    : language === 'fr'
                    ? `Supprimer ${terminology.memberSingle.toLowerCase()}`
                    : `Delete ${terminology.memberSingle}`}
                </span>
              </button>

              <AtriumButton
                variant="primary"
                size="md"
                onClick={closeDetail}
                className="font-semibold shadow-2xs"
              >
                {language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close'}
              </AtriumButton>
            </div>
          </aside>
        </div>,
        document.body
      )}

      {/* Floating Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#18181B] text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-4 z-50 text-xs animate-in slide-in-from-bottom-4">
          <span className="font-semibold text-neutral-300">
            {selectedIds.length}{' '}
            {language === 'ar'
              ? 'مشتركين تم تحديدهم'
              : language === 'fr'
              ? 'adhérents sélectionnés'
              : `${terminology.members.toLowerCase()} selected`}
          </span>
          <div className="h-4 w-px bg-neutral-700" />
          <button
            type="button"
            onClick={() => {
              selectedIds.forEach((id) => updateMember(id, { status: 'Frozen' }));
              setSelectedIds([]);
            }}
            className="hover:text-amber-400 cursor-pointer font-medium"
          >
            {language === 'ar' ? 'تجميد وحظر المحدد' : language === 'fr' ? 'Bloquer la sélection' : 'Freeze Selected'}
          </button>
          <button
            type="button"
            onClick={() => {
              selectedIds.forEach((id) => updateMember(id, { status: 'Active' }));
              setSelectedIds([]);
            }}
            className="hover:text-emerald-400 cursor-pointer font-medium"
          >
            {language === 'ar' ? 'تفعيل المحدد' : language === 'fr' ? 'Activer la sélection' : 'Activate Selected'}
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="hover:text-[#C4785A] cursor-pointer font-medium"
          >
            {language === 'ar' ? 'تصدير المحدد' : language === 'fr' ? 'Exporter la sélection' : 'Export Selected'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-neutral-400 hover:text-white cursor-pointer ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
