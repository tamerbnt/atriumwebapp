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
import { MemberRow, MemberRowData } from './components/MemberRow';
import { FloatingBulkBar } from './components/FloatingBulkBar';
import { MemberSlideOverInspector } from './MemberSlideOverInspector';
import { useSpringCountRef } from './motion/adherentsMotion';
import { useKineticRowLayout } from './motion/useKineticRowLayout';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button as BrandedAtriumButton, LiquidButton } from '@/atrium';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { Seek } from '../../ui/Seek';
import { t } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

const MEMBER_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });

export interface MembershipMembersViewProps {
  onAddMember: (originEl?: HTMLElement | null) => void;
  onEditMember: (member: Member, originEl?: HTMLElement | null) => void;
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

  const toggleExpandMember = useCallback((id: string | number) => {
    const key = String(id);
    setExpandedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [panelInitialTab, setPanelInitialTab] = useState<'overview' | 'access' | 'billing'>('overview');
  const panelOpenerRef = useRef<HTMLElement | null>(null);
  const lastSelectedIdxRef = useRef<number>(-1);
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

  // Cached days-remaining lookup + single-pass counts for O(N) 1000+ member scalability
  const daysRemainingByDate = useMemo(() => {
    const cache = new Map<string, number>();
    for (let i = 0; i < members.length; i++) {
      const exp = members[i].expirationDate || '';
      if (!cache.has(exp)) {
        cache.set(exp, calculateDaysRemaining(false, exp));
      }
    }
    return cache;
  }, [members]);

  const { activeMembersCount, expiringCount, expiredCount, archivedCount } = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let archived = 0;
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m.status === 'Active') active++;
      else if (m.status === 'Expired') expired++;
      else if (m.status === 'Banned' || m.status === 'Suspended') archived++;
      const d = daysRemainingByDate.get(m.expirationDate || '') ?? 999;
      if (d <= 14 && d > 0) expiring++;
    }
    return {
      activeMembersCount: active,
      expiringCount: expiring,
      expiredCount: expired,
      archivedCount: archived,
    };
  }, [members, daysRemainingByDate]);

  // Desktop sample members
  const displayMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((member) => {
      if (statusFilter !== 'All') {
        if (statusFilter === 'Active' && member.status !== 'Active') return false;
        if (statusFilter === 'Expired' && member.status !== 'Expired') return false;
        if (statusFilter === 'Expiring') {
          const d = daysRemainingByDate.get(member.expirationDate || '') ?? calculateDaysRemaining(false, member.expirationDate);
          if (d > 14) return false;
        }
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
      if (q) {
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
  }, [members, daysRemainingByDate, statusFilter, planFilter, genderFilter, ageGroupFilter, searchQuery]);

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
        const comp = MEMBER_COLLATOR.compare(a.fullName, b.fullName);
        return memberSortDir === 'asc' ? comp : -comp;
      }
      if (memberSortBy === 'plan') {
        const comp = MEMBER_COLLATOR.compare(a.membershipPlanName || '', b.membershipPlanName || '');
        return memberSortDir === 'asc' ? comp : -comp;
      }
      if (memberSortBy === 'status') {
        const comp = MEMBER_COLLATOR.compare(a.status, b.status);
        return memberSortDir === 'asc' ? comp : -comp;
      }
      if (memberSortBy === 'expiration') {
        const ea = a.expirationDate || '';
        const eb = b.expirationDate || '';
        const comp = ea < eb ? -1 : ea > eb ? 1 : 0;
        return memberSortDir === 'asc' ? comp : -comp;
      }
      if (memberSortBy === 'balance') {
        const balA = Number((a as any).balance || 0);
        const balB = Number((b as any).balance || 0);
        const comp = balA - balB;
        return memberSortDir === 'asc' ? comp : -comp;
      }
      return 0;
    });
    return list;
  }, [displayMembers, pinnedMemberIds, memberSortBy, memberSortDir]);

  // Kinetic absolute row & grid morph layout (direct DOM refs on single shared rAF loop)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const rowsElRef = useRef<HTMLDivElement | null>(null);
  const filterKey = `${statusFilter}|${planFilter}|${genderFilter}|${ageGroupFilter}|${searchQuery}`;

  const handlePruneSelection = useCallback((hiddenIds: string[]) => {
    if (hiddenIds.length === 0) return;
    setSelectedMemberIds((prev) => {
      let changed = false;
      hiddenIds.forEach((id) => {
        if (prev.has(id)) changed = true;
      });
      if (!changed) return prev;
      const next = new Set(prev);
      hiddenIds.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleFilterScrollReset = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      scrollContainerRef.current.scrollTop = 0;
    }
    const outerScroll = scrollContainerRef.current?.closest('main, [data-scroll-container]');
    if (outerScroll) {
      outerScroll.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const { renderedRows, registerRowRefs } = useKineticRowLayout({
    matchingMembers: sortedMembers,
    expandedMemberIds,
    viewMode,
    filterKey,
    rowsElRef,
    scrollContainerRef,
    openMemberId: isDetailOpen ? selectedMember?.id ?? null : null,
    onPruneSelection: handlePruneSelection,
    onFilterChange: handleFilterScrollReset,
  });

  const memberRowDataMap = useMemo(() => {
    const map = new Map<string, MemberRowData>();
    for (let i = 0; i < renderedRows.length; i++) {
      const member = renderedRows[i].member;
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

      map.set(member.id, {
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
        remainingSessions: (member as any).remainingSessions ?? 24,
        notes: member.notes,
        isBlocked,
      });
    }
    return map;
  }, [renderedRows]);

  // Lookup refs for stable memoized row callbacks
  const sortedMembersRef = useRef(sortedMembers);
  sortedMembersRef.current = sortedMembers;
  const membersByIdRef = useRef(new Map<string, Member>());
  membersByIdRef.current = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const handleSelectRow = useCallback((id: string | number, e: React.MouseEvent) => {
    const key = String(id);
    const list = sortedMembersRef.current;
    const idx = list.findIndex((m) => m.id === key);
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedIdxRef.current > -1 && idx > -1) {
        const start = Math.min(lastSelectedIdxRef.current, idx);
        const end = Math.max(lastSelectedIdxRef.current, idx);
        for (let i = start; i <= end; i++) {
          next.add(list[i].id);
        }
      } else if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    if (idx > -1) lastSelectedIdxRef.current = idx;
  }, []);

  const handleOpenRowDetails = useCallback(
    (id: string | number, originEl?: HTMLElement | null) => {
      panelOpenerRef.current = originEl || (document.activeElement as HTMLElement | null);
      setPanelInitialTab('overview');
      selectMember(String(id));
    },
    [selectMember]
  );

  const handleEditRow = useCallback(
    (id: string | number, originEl?: HTMLElement | null) => {
      const m = membersByIdRef.current.get(String(id));
      if (m) onEditMember(m, originEl);
    },
    [onEditMember]
  );

  const handleMessageRow = useCallback(
    (id: string | number) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      if (m.email) {
        window.location.href = `mailto:${m.email}`;
      } else {
        showToast({
          type: 'info',
          title: 'Email draft',
          message: `No email address for ${m.fullName}`,
        });
      }
    },
    [showToast]
  );

  const handleDeleteRow = useCallback(
    (id: string | number) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      deleteMember(m.id);
      showToast({
        type: 'info',
        title: 'Adhérent supprimé',
        message: `${m.fullName} a été retiré.`,
      });
    },
    [deleteMember, showToast]
  );

  const handleRenewRow = useCallback(
    (id: string | number) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      const currentExp = new Date(m.expirationDate || new Date().toISOString());
      const newExp = new Date(currentExp.getTime() + 30 * 864e5).toISOString().split('T')[0];
      updateMember(m.id, { expirationDate: newExp, status: 'Active' });
      showToast({
        type: 'success',
        title: 'Abonnement renouvelé',
        message: `${m.fullName} prolongé jusqu'au ${newExp}`,
      });
    },
    [updateMember, showToast]
  );

  const handleArchiveRow = useCallback(
    (id: string | number) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      updateMember(m.id, { status: 'Suspended' });
      showToast({
        type: 'info',
        title: 'Adhérent archivé',
        message: `${m.fullName} archivé (suspendu).`,
      });
    },
    [updateMember, showToast]
  );

  const handleToggleStatusRow = useCallback(
    (id: string | number) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      const isBlocked = m.status === 'Suspended' || m.status === 'Banned' || Boolean((m as any).isBlocked);
      const newStatus: MemberStatus = isBlocked ? 'Active' : 'Suspended';
      updateMember(m.id, { status: newStatus });
      showToast({
        type: isBlocked ? 'success' : 'info',
        title: isBlocked ? 'Badge réactivé' : 'Badge gelé',
        message: `${m.fullName}: ${isBlocked ? 'Accès rétabli' : 'Accès temporairement suspendu'}`,
      });
    },
    [updateMember, showToast]
  );

  const handleTogglePinRow = useCallback(
    (id: string | number) => {
      const key = String(id);
      const m = membersByIdRef.current.get(key);
      setPinnedMemberIds((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          if (m) showToast({ type: 'info', title: 'Détaché', message: `${m.fullName} n'est plus épinglé` });
        } else {
          next.add(key);
          if (m) showToast({ type: 'success', title: 'Épinglé', message: `${m.fullName} épinglé en tête de liste` });
        }
        return next;
      });
    },
    [showToast]
  );

  const handlePayRow = useCallback(
    (id: string | number) => {
      setPanelInitialTab('billing');
      selectMember(String(id));
    },
    [selectMember]
  );

  useEffect(() => {
    const handleCreated = (e: any) => {
      const newMember = e.detail;
      if (statusFilter !== 'All' && statusFilter !== newMember?.status) {
        setStatusFilter('All');
      }
      setSearchQuery('');
      setPlanFilter('All');
      setGenderFilter('All');
      setAgeGroupFilter('All');
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    };
    window.addEventListener('atrium-member-created', handleCreated);
    return () => window.removeEventListener('atrium-member-created', handleCreated);
  }, [statusFilter]);

  // Zero-re-render DOM-ref metric count-up springs (tune 20)
  const activeCountRef = useSpringCountRef<HTMLDivElement>(activeMembersCount);
  const expiringChipCountRef = useSpringCountRef<HTMLSpanElement>(expiringCount);
  const expiringBigCountRef = useSpringCountRef<HTMLDivElement>(expiringCount);
  const inflowChipCountRef = useSpringCountRef<HTMLSpanElement>(displayMembers.length, { prefix: '+' });
  const inflowBigCountRef = useSpringCountRef<HTMLDivElement>(displayMembers.length, { prefix: '+' });
  const listBadgeCountRef = useSpringCountRef<HTMLSpanElement>(displayMembers.length);

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
              className="h-10 px-4 rounded-[6px] bg-white dark:bg-neutral-800/80 border border-[#E6DED6] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs"
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
            data-action="add-member"
            onClick={(e) => onAddMember(e.currentTarget)}
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
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {terminology.members} & {language === 'ar' ? 'مؤشرات التجديد' : language === 'fr' ? 'Rétention & Renouvellements' : 'Retention Health'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Active Member Base — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
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
            <div ref={activeCountRef} className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {activeMembersCount}
            </div>
          </div>

          {/* Tile 2: Customer Spend Volume or Renewal Churn Risk */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {language === 'ar' ? 'تنبيهات انتهاء الاشتراك' : language === 'fr' ? 'Alertes de renouvellement' : 'Renewal & Retention Alert'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-full">
                  <span ref={expiringChipCountRef}>{expiringCount}</span> {language === 'ar' ? 'تنتهي قريباً (<14j)' : language === 'fr' ? 'expirent sous 14j' : 'expiring (<14d)'}
                </span>
              </div>
            </div>
            <div ref={expiringBigCountRef} className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
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
                <span ref={inflowChipCountRef}>+{displayMembers.length}</span>&nbsp;{terminology.members.toLowerCase()}
              </span>
            </div>
            <div>
              <div ref={inflowBigCountRef} className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
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
      <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs">
        {/* Unified Header & Tools Row: Title on Left, Search & Filters Middle, Export on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          {/* Left: Section Title & Count Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              {language === 'ar' ? 'قائمة المشتركين' : 'Liste des adhérents'}
            </h2>
            <span
              ref={listBadgeCountRef}
              className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/70 text-neutral-700 dark:text-neutral-300 shadow-2xs tabular-nums"
            >
              {displayMembers.length}
            </span>
          </div>

          {/* Accessible Live Region Announcing Result Count */}
          <div aria-live="polite" className="sr-only">
            {displayMembers.length === 0
              ? 'Aucun adhérent ne correspond'
              : `${displayMembers.length} adhérent${displayMembers.length > 1 ? 's' : ''} trouvé${displayMembers.length > 1 ? 's' : ''}`}
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

            {/* Streamlined Quick Status Tabs (Official Atrium Branded Switcher Toggle with live counter badges) */}
            <div className="shrink-0">
              <LiveSegmentedControl
                size="md"
                options={[
                  {
                    value: 'All',
                    label: language === 'ar' ? 'جميع المشتركين' : language === 'fr' ? 'Tous les adhérents' : 'All Members',
                    count: members.length,
                  },
                  {
                    value: 'Active',
                    label: language === 'ar' ? 'اشتراكات نشطة' : language === 'fr' ? 'Abonnements actifs' : 'Active Members',
                    count: activeMembersCount,
                  },
                  {
                    value: 'Expiring',
                    label: language === 'ar' ? 'قيد التجديد (<14j)' : language === 'fr' ? 'À renouveler (<14j)' : 'Expiring (<14d)',
                    count: expiringCount,
                  },
                ]}
                value={statusFilter === 'Expired' || statusFilter === 'Archived' ? 'All' : statusFilter}
                onValueChange={(val) => setStatusFilter(val as any)}
                aria-label={language === 'ar' ? 'تصفية المشتركين' : 'Filtre des adhérents'}
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
                    : 'bg-white dark:bg-neutral-800 border-[#E6DED6] dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
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
                {/* Section 1: Gender (Atrium Branded Switcher Toggle) */}
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
                  <LiveSegmentedControl
                    size="sm"
                    className="w-full flex [&>button]:flex-1"
                    options={[
                      { value: 'All', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All' },
                      { value: 'Male', label: language === 'ar' ? 'ذكور' : language === 'fr' ? 'Hommes' : 'Male' },
                      { value: 'Female', label: language === 'ar' ? 'إناث' : language === 'fr' ? 'Femmes' : 'Female' },
                      { value: 'Other', label: language === 'ar' ? 'آخر' : language === 'fr' ? 'Autre' : 'Other' },
                    ]}
                    value={genderFilter}
                    onValueChange={(val) => setGenderFilter(val as any)}
                    aria-label={language === 'ar' ? 'الجنس' : 'Sexe'}
                  />
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

                {/* Section 4: Extended Status Filter (Atrium Branded Switcher Toggle) */}
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
                  <LiveSegmentedControl
                    size="sm"
                    className="w-full flex [&>button]:flex-1 overflow-x-auto"
                    options={[
                      { value: 'All', label: t('member_filter_all', language), count: members.length },
                      { value: 'Active', label: t('member_filter_active', language), count: activeMembersCount },
                      { value: 'Expiring', label: t('member_filter_expiring', language), count: expiringCount },
                      { value: 'Expired', label: t('member_filter_expired', language), count: expiredCount },
                      { value: 'Archived', label: t('member_filter_archived', language), count: archivedCount },
                    ]}
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as any)}
                    aria-label={language === 'ar' ? 'حالة الحساب' : 'Statut du compte'}
                  />
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

        {/* Master Content Area - Persistent Kinetic Row/Grid Morph Canvas */}
        <div className="w-full">
          <div className="w-full overflow-x-auto">
            <div className="w-full flex flex-col min-w-[940px]">
              {/* Collapsible Header Bar (.th-adherents) — smoothly collapses in Grid View */}
              <div
                className="th th-adherents bg-white dark:bg-[#1C1B1A] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-[var(--atr-ink,#1B1917)] dark:text-[#EAE3DC] box-border select-none"
                data-v={viewMode === 'grid' ? 'g' : 'l'}
                aria-hidden={viewMode === 'grid'}
              >
                <button
                  type="button"
                  role="checkbox"
                  tabIndex={viewMode === 'grid' ? -1 : 0}
                  aria-checked={
                    selectedMemberIds.size === 0
                      ? 'false'
                      : selectedMemberIds.size === sortedMembers.length && sortedMembers.length > 0
                      ? 'true'
                      : 'mixed'
                  }
                  aria-label="Tout sélectionner"
                  onClick={() => {
                    if (selectedMemberIds.size === sortedMembers.length) {
                      setSelectedMemberIds(new Set());
                    } else {
                      setSelectedMemberIds(new Set(sortedMembers.map((m) => m.id)));
                    }
                  }}
                  className={`cb w-[22px] h-[22px] rounded-[7px] border-[1.5px] grid place-items-center p-0 cursor-pointer ${
                    selectedMemberIds.size === sortedMembers.length && sortedMembers.length > 0
                      ? 'bg-[var(--atr-acc,#C9441F)] border-[var(--atr-acc,#C9441F)] text-white'
                      : 'bg-white dark:bg-[#262422] border-[#B3A89E] dark:border-[#5A5550] text-transparent hover:border-[var(--atr-acc,#C9441F)]'
                  }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 stroke-[3] transition-opacity duration-120 ${
                      selectedMemberIds.size > 0 ? 'opacity-100 text-white' : 'opacity-0'
                    }`}
                  />
                </button>
                {[
                  { key: 'member', label: terminology.memberSingle },
                  { key: 'plan', label: t('member_col_plan', language) },
                  { key: 'status', label: t('member_col_access', language) },
                  { key: 'expiration', label: t('member_col_expiration', language) },
                  { key: 'balance', label: language === 'ar' ? 'الرصيد' : language === 'fr' ? 'Solde' : 'Balance' },
                ].map((col) => {
                  const isOn = memberSortBy === col.key;
                  const dir = memberSortDir;
                  return (
                    <button
                      key={col.key}
                      type="button"
                      data-k={col.key}
                      data-on={isOn ? 'true' : undefined}
                      tabIndex={viewMode === 'grid' ? -1 : 0}
                      aria-sort={isOn ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      onClick={() => {
                        if (memberSortBy === col.key) {
                          setMemberSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setMemberSortBy(col.key);
                          setMemberSortDir('asc');
                        }
                      }}
                      className="text-left rtl:text-right font-medium text-[13px] flex items-center gap-2 cursor-pointer hover:text-[var(--atr-acc,#C9441F)] bg-transparent border-0 p-0 text-inherit whitespace-nowrap truncate min-w-0"
                    >
                      <span className="truncate">{col.label}</span>
                      <i
                        className={`not-italic text-[10px] px-1.5 py-0.5 rounded-[6px] ${
                          isOn
                            ? 'bg-[var(--atr-hl,#FBE7DF)] text-[var(--atr-acc,#C9441F)]'
                            : 'bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-[var(--atr-mut,#6B635C)]'
                        }`}
                      >
                        {isOn ? (dir === 'asc' ? '↑' : '↓') : '↕'}
                      </i>
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Kinetic Rows/Cards Canvas (.scr -> .rows[data-v]) */}
              <div
                ref={scrollContainerRef}
                className="scr relative mt-2.5 overflow-y-auto overflow-x-hidden pr-1 pb-[70px] max-h-[640px]"
              >
                <div
                  ref={rowsElRef}
                  role="list"
                  aria-label="Adhérents"
                  data-v={viewMode === 'grid' ? 'g' : 'l'}
                  className="rows relative w-full"
                >
                  {renderedRows.map((rowItem) => {
                    const member = rowItem.member;
                    const memberRowData = memberRowDataMap.get(member.id)!;

                    return (
                      <MemberRow
                        key={member.id}
                        member={memberRowData}
                        isSelected={selectedMemberIds.has(member.id)}
                        isOpen={isDetailOpen && selectedMember?.id === member.id}
                        isExpanded={expandedMemberIds.has(member.id)}
                        isPinned={pinnedMemberIds.has(member.id)}
                        registerRowRefs={registerRowRefs}
                        onSelect={handleSelectRow}
                        onToggleExpand={toggleExpandMember}
                        onOpenDetails={handleOpenRowDetails}
                        onEdit={handleEditRow}
                        onMessage={handleMessageRow}
                        onDelete={handleDeleteRow}
                        onRenew={handleRenewRow}
                        onArchive={handleArchiveRow}
                        onToggleStatus={handleToggleStatusRow}
                        onTogglePin={handleTogglePinRow}
                        onPay={handlePayRow}
                      />
                    );
                  })}
                </div>

                {sortedMembers.length === 0 && (
                  <p className="empty text-center text-[#6B635C] dark:text-[#A89F95] py-10">
                    Aucun adhérent ne correspond. Modifiez la recherche ou les filtres.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Atrium 560px Floating Card Slide-In Panel */}
      <MemberSlideOverInspector
        isOpen={isDetailOpen && Boolean(selectedMember)}
        member={selectedMember}
        allMembers={sortedMembers}
        openerElement={panelOpenerRef.current}
        initialTab={panelInitialTab}
        onClose={closeDetail}
        onSelectMember={(m) => selectMember(m.id)}
        onEdit={(m) => onEditMember(m, document.activeElement as HTMLElement | null)}
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

      {/* Floating Batch Actions Bar */}
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
          selectedMemberIds.forEach((id) => deleteMember(id));
          setSelectedMemberIds(new Set());
          showToast({
            type: 'info',
            title: 'Suppression groupée',
            message: 'Adhérents supprimés.',
          });
        }}
      />

      {/* Appointment Booking Modal */}
      {isBookModalOpen && selectedMember && (
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
