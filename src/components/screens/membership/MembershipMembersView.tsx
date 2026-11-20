import React, { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  Edit,
  Eye,
  CreditCard,
  Activity,
} from 'lucide-react';
import { compactFilterLabel } from '../../../utils/filterLexicon';
import {
  useAtriumSelector,
  selectCurrentMembersFromState,
  selectCurrentPlansFromState,
  selectCurrentBranchFromState,
  selectTerminologyFromState,
  selectSelectedMemberFromState,
  selectMemberAction,
  closeDetailAction,
  addMemberAction,
  updateMemberAction,
  deleteMemberAction,
  checkInMemberAction,
  retryCloudSyncAction,
  openFastSwitchAction,
  showToast as showToastAction,
} from '../../../services/store';
import { resolveEmptyState } from '../../../atrium/components/EmptyState';
import { Member } from '../../../types/index';
import { calculateDaysRemaining, formatMoney, localizeStatus } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { MemberSlideOverInspector } from './MemberSlideOverInspector';
import { t } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenPod,
  ScreenKpiBanner,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticCollectionStage,
  KineticColumnHeader,
  KineticRowData,
  KineticFilterModal,
  KineticFilterSection,
  KineticFloatingBulkBar,
  KineticBulkAction,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
  useSpringCountRef,
} from '../../ui/kinetic';

const MEMBER_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });

const computeMemberAge = (
  dobString: any,
  refYear: number,
  refMonth: number,
  refDate: number
): number | null => {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  let age = refYear - dob.getFullYear();
  const m = refMonth - dob.getMonth();
  if (m < 0 || (m === 0 && refDate < dob.getDate())) age--;
  return age >= 0 ? age : null;
};

const matchesAgeValue = (age: number | null, group: string) => {
  if (group === 'All') return true;
  if (group === 'unspecified') return age === null;
  if (age === null) return false;
  if (group === 'under18') return age < 18;
  if (group === '18-25') return age >= 18 && age <= 25;
  if (group === '26-40') return age >= 26 && age <= 40;
  if (group === '41-60') return age >= 41 && age <= 60;
  if (group === 'over60') return age > 60;
  return true;
};

const getMemberInitialsColor = (name: any) => {
  const ch = name ? String(name).trim()[0]?.toLowerCase() : '';
  if (ch === 'a') return '#D946EF';
  if (ch === 's') return '#2563EB';
  if (ch === 'y') return '#d4522f';
  if (ch === 'n') return '#10B981';
  if (ch === 'r') return '#06B6D4';
  return '#8B5CF6';
};

interface PreparedMemberEntry {
  member: Member;
  daysRemaining: number;
  age: number | null;
  searchHaystack: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  balanceNum: number;
  expStr: string;
  isBlocked: boolean;
  isExpired: boolean;
  rowData: KineticRowData;
}

export const MembershipMembersView: React.FC<any> = React.memo(({ onAddMember, onEditMember }) => {
  const members = useAtriumSelector(selectCurrentMembersFromState);
  const plans = useAtriumSelector(selectCurrentPlansFromState);
  const branches = useAtriumSelector((s) => s.branches);
  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);
  const terminology = useAtriumSelector(selectTerminologyFromState);
  const language = useAtriumSelector((s) => s.language);
  const selectedMember = useAtriumSelector(selectSelectedMemberFromState);
  const isDetailOpen = useAtriumSelector((s) => s.isDetailOpen);
  const isSyncing = useAtriumSelector((s) => s.isSyncing);
  const networkMode = useAtriumSelector((s) => s.networkMode || 'online');
  const lastSyncedAt = useAtriumSelector((s) => s.lastSyncedAt);
  const syncErrorMessage = useAtriumSelector((s) => s.syncErrorMessage);
  const isSyncTimeout = useAtriumSelector((s) => s.isSyncTimeout);
  const currentUser = useAtriumSelector((s) => s.currentUser);

  const selectMember = selectMemberAction;
  const closeDetail = closeDetailAction;
  const addMember = addMemberAction;
  const updateMember = updateMemberAction;
  const deleteMember = deleteMemberAction;
  const checkInMember = checkInMemberAction;
  const retryCloudSync = retryCloudSyncAction;
  const openFastSwitch = openFastSwitchAction;
  const showToast = showToastAction;

  const [statusFilter, setStatusFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [ageGroupFilter, setAgeGroupFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const deferredPlanFilter = useDeferredValue(planFilter);
  const deferredGenderFilter = useDeferredValue(genderFilter);
  const deferredAgeGroupFilter = useDeferredValue(ageGroupFilter);
  const deferredBranchFilter = useDeferredValue(branchFilter);

  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => new Set());
  const [pinnedMemberIds, setPinnedMemberIds] = useState<Set<string>>(() => new Set());
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(() => new Set());
  const [memberSortBy, setMemberSortBy] = useState('member');
  const [memberSortDir, setMemberSortDir] = useState<'asc' | 'desc'>('asc');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [panelInitialTab, setPanelInitialTab] = useState<'overview' | 'access' | 'billing'>('overview');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const panelOpenerRef = useRef<any>(null);
  const lastSelectedIdxRef = useRef(-1);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const toggleExpandMember = useCallback((id: string) => {
    const key = String(id);
    setExpandedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleFilterPopover = useCallback(() => {
    setIsFilterPopoverOpen((prev) => !prev);
  }, []);

  const closeFilterPopover = useCallback(() => {
    setIsFilterPopoverOpen(false);
  }, []);

  const hasActiveAdvancedFilters =
    planFilter !== 'All' ||
    genderFilter !== 'All' ||
    ageGroupFilter !== 'All' ||
    branchFilter !== 'All' ||
    statusFilter === 'Expired' ||
    statusFilter === 'Archived';

  const activeFiltersCount =
    (planFilter !== 'All' ? 1 : 0) +
    (genderFilter !== 'All' ? 1 : 0) +
    (ageGroupFilter !== 'All' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0) +
    (statusFilter === 'Expired' || statusFilter === 'Archived' ? 1 : 0);

  const handleResetFilters = useCallback(() => {
    setPlanFilter('All');
    setGenderFilter('All');
    setAgeGroupFilter('All');
    setBranchFilter('All');
    setStatusFilter((prev) => (prev === 'Expired' || prev === 'Archived' ? 'All' : prev));
    setSearchQuery('');
    setIsFilterPopoverOpen(false);
  }, []);

  const dynamicAvailablePlans = useMemo(() => {
    const map = new Map<string, { id: string; name: string; price: number }>();
    plans.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        price: p.price?.amount || 0,
      });
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

  const daysRemainingByDate = useMemo(() => {
    const cache = new Map<string, number>();
    for (let i = 0; i < members.length; i++) {
      const exp = members[i].expirationDate || '';
      if (!cache.has(exp)) cache.set(exp, calculateDaysRemaining(false, exp));
    }
    return cache;
  }, [members]);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const preparedMembers = useMemo<PreparedMemberEntry[]>(() => {
    const now = new Date();
    const refYear = now.getFullYear();
    const refMonth = now.getMonth();
    const refDate = now.getDate();

    return members.map((member) => {
      const daysRemaining =
        daysRemainingByDate.get(member.expirationDate || '') ??
        calculateDaysRemaining(false, member.expirationDate);
      const age = computeMemberAge(member.dateOfBirth, refYear, refMonth, refDate);
      const fullNameLower = (member.fullName || '').toLowerCase();
      const phone = member.phoneNumber || '';
      const cardLower = (member.cardId || '').toLowerCase();
      const branchInfo = resolveRecordBranch(member, branchesById, currentBranch, language);

      const remainingText =
        daysRemaining > 0
          ? language === 'ar'
            ? `${daysRemaining} يوم متبقي`
            : language === 'fr'
            ? `${daysRemaining} j restants`
            : `${daysRemaining}d left`
          : daysRemaining === 0
          ? language === 'ar'
            ? 'ينتهي اليوم'
            : language === 'fr'
            ? 'Expire aujourd’hui'
            : 'Expires today'
          : language === 'ar'
          ? 'منتهي'
          : language === 'fr'
          ? 'Expiré'
          : 'Expired';

      const isBlocked =
        member.status === 'Suspended' ||
        member.status === 'Banned' ||
        Boolean((member as any).isBlocked);
      const isExpired = member.status === 'Expired' || daysRemaining <= 0;

      const statusLabel = isBlocked
        ? language === 'ar'
          ? 'محظور'
          : language === 'fr'
          ? 'Bloqué'
          : 'Blocked'
        : isExpired
        ? language === 'ar'
          ? 'منتهي'
          : language === 'fr'
          ? 'Expiré'
          : 'Expired'
        : language === 'ar'
        ? 'نشط'
        : language === 'fr'
        ? 'Actif'
        : 'Active';

      const rowData: KineticRowData = {
        id: member.id,
        title: member.fullName || 'Adhérent',
        subline: phone || member.email || '—',
        avatarColor: getMemberInitialsColor(member.fullName),
        vipBadge: pinnedMemberIds.has(member.id) ? 'VIP' : undefined,
        categoryLabel: member.membershipPlanName || 'Full Access Monthly',
        statusLabel,
        statusVariant: isBlocked ? 'blocked' : isExpired ? 'expired' : 'active',
        metricPrimary: member.expirationDate || 'Non spécifié',
        metricSecondary: remainingText,
        branchName: branchInfo.name,
        branchCode: branchInfo.code,
        notes: member.notes,
        detailCol1: {
          heading: language === 'ar' ? 'التواصل والفرع' : language === 'fr' ? 'Contact & Branche' : 'Contact & Branch',
          primaryText: phone || 'Non renseigné',
          secondaryText: member.email || 'E-mail non renseigné',
          tertiaryText: branchInfo.name,
        },
        detailCol2: {
          heading: language === 'ar' ? 'الحصص والرصيد' : language === 'fr' ? 'Séances & Solde' : 'Sessions & Balance',
          primaryText:
            member.balance && member.balance > 0
              ? `${Math.round(member.balance).toLocaleString()} DZD`
              : language === 'ar'
              ? 'خالص'
              : language === 'fr'
              ? 'Soldé'
              : 'Settled',
          secondaryText: `${member.remainingSessions ?? 24} ${
            language === 'ar' ? 'حصص متبقية' : language === 'fr' ? 'séances restantes' : 'sessions left'
          }`,
          tertiaryText: member.membershipPlanName || 'Standard',
        },
      };

      return {
        member,
        daysRemaining,
        age,
        searchHaystack: `${fullNameLower}\0${phone}\0${cardLower}\0${branchInfo.name.toLowerCase()}`,
        branchId: branchInfo.id,
        branchName: branchInfo.name,
        branchCode: branchInfo.code,
        balanceNum: Number(member.balance || 0),
        expStr: member.expirationDate || '',
        isBlocked,
        isExpired,
        rowData,
      };
    });
  }, [members, daysRemainingByDate, branchesById, currentBranch, language, pinnedMemberIds]);

  const {
    activeMembersCount,
    expiringCount,
    expiredCount,
    archivedCount,
    ageGroupCounts,
    planCounts,
    branchOptionsWithCounts,
  } = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let archived = 0;
    const ag: Record<string, number> = {
      All: preparedMembers.length,
      under18: 0,
      '18-25': 0,
      '26-40': 0,
      '41-60': 0,
      over60: 0,
      unspecified: 0,
    };
    const pc = new Map<string, number>();
    const bc = new Map<string, { label: string; count: number }>();

    for (let i = 0; i < preparedMembers.length; i++) {
      const item = preparedMembers[i];
      const m = item.member;
      if (m.status === 'Active') active++;
      else if (m.status === 'Expired') expired++;
      else if (m.status === 'Banned' || m.status === 'Suspended') archived++;
      if (item.daysRemaining <= 14 && item.daysRemaining > 0) expiring++;
      const age = item.age;
      if (age === null) ag.unspecified++;
      else if (age < 18) ag.under18++;
      else if (age <= 25) ag['18-25']++;
      else if (age <= 40) ag['26-40']++;
      else if (age <= 60) ag['41-60']++;
      else ag.over60++;

      if (m.membershipPlanId) pc.set(m.membershipPlanId, (pc.get(m.membershipPlanId) || 0) + 1);
      if (m.membershipPlanName && m.membershipPlanName !== m.membershipPlanId) {
        pc.set(m.membershipPlanName, (pc.get(m.membershipPlanName) || 0) + 1);
      }

      const bKey = item.branchName;
      const existingB = bc.get(bKey);
      if (existingB) existingB.count++;
      else bc.set(bKey, { label: bKey, count: 1 });
    }

    for (let i = 0; i < dynamicAvailablePlans.length; i++) {
      const p = dynamicAvailablePlans[i];
      if (!pc.has(p.id) && pc.has(p.name)) pc.set(p.id, pc.get(p.name)!);
    }

    return {
      activeMembersCount: active,
      expiringCount: expiring,
      expiredCount: expired,
      archivedCount: archived,
      ageGroupCounts: ag,
      planCounts: pc,
      branchOptionsWithCounts: Array.from(bc.entries()).map(([name, info]) => ({
        value: name,
        label: info.label,
        count: info.count,
      })),
    };
  }, [preparedMembers, dynamicAvailablePlans]);

  const sortedPreparedMembers = useMemo(() => {
    const dirSign = memberSortDir === 'asc' ? 1 : -1;
    const rankWeight = (m: Member) =>
      pinnedMemberIds.has(m.id)
        ? 0
        : m.status === 'Active'
        ? 1
        : m.status === 'Expired'
        ? 2
        : 3;

    const list = [...preparedMembers];
    list.sort((a, b) => {
      const aPinned = pinnedMemberIds.has(a.member.id) ? 0 : 1;
      const bPinned = pinnedMemberIds.has(b.member.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (memberSortBy === 'member') {
        return MEMBER_COLLATOR.compare(a.member.fullName || '', b.member.fullName || '') * dirSign;
      }
      if (memberSortBy === 'plan') {
        return (
          MEMBER_COLLATOR.compare(
            a.member.membershipPlanName || '',
            b.member.membershipPlanName || ''
          ) * dirSign
        );
      }
      if (memberSortBy === 'status') {
        return (rankWeight(a.member) - rankWeight(b.member)) * dirSign;
      }
      if (memberSortBy === 'expiration') {
        return MEMBER_COLLATOR.compare(a.expStr, b.expStr) * dirSign;
      }
      if (memberSortBy === 'branch') {
        return MEMBER_COLLATOR.compare(a.branchName, b.branchName) * dirSign;
      }
      return (a.balanceNum - b.balanceNum) * dirSign;
    });
    return list;
  }, [preparedMembers, pinnedMemberIds, memberSortBy, memberSortDir]);

  const sortedMembers = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const hasStatus = deferredStatusFilter !== 'All';
    const hasPlan = deferredPlanFilter !== 'All';
    const hasGender = deferredGenderFilter !== 'All';
    const hasAge = deferredAgeGroupFilter !== 'All';
    const hasBranch = deferredBranchFilter !== 'All';
    const hasQuery = q.length > 0;
    if (!hasStatus && !hasPlan && !hasGender && !hasAge && !hasBranch && !hasQuery) {
      return sortedPreparedMembers.map((item) => item.member);
    }
    const result: Member[] = [];
    for (let i = 0; i < sortedPreparedMembers.length; i++) {
      const item = sortedPreparedMembers[i];
      const member = item.member;
      if (hasStatus) {
        if (deferredStatusFilter === 'Active' && member.status !== 'Active') continue;
        if (deferredStatusFilter === 'Expired' && member.status !== 'Expired') continue;
        if (deferredStatusFilter === 'Expiring' && item.daysRemaining > 14) continue;
        if (
          deferredStatusFilter === 'Archived' &&
          member.status !== 'Banned' &&
          member.status !== 'Suspended'
        ) {
          continue;
        }
      }
      if (hasPlan) {
        if (
          member.membershipPlanId !== deferredPlanFilter &&
          member.membershipPlanName !== deferredPlanFilter
        ) {
          continue;
        }
      }
      if (hasBranch && item.branchName !== deferredBranchFilter) continue;
      if (hasGender) {
        if (deferredGenderFilter === 'Other') {
          if (member.gender === 'Male' || member.gender === 'Female') continue;
        } else if (member.gender !== deferredGenderFilter) continue;
      }
      if (hasAge && !matchesAgeValue(item.age, deferredAgeGroupFilter)) continue;
      if (hasQuery && !item.searchHaystack.includes(q)) continue;
      result.push(member);
    }
    return result;
  }, [
    sortedPreparedMembers,
    deferredStatusFilter,
    deferredPlanFilter,
    deferredGenderFilter,
    deferredAgeGroupFilter,
    deferredBranchFilter,
    deferredSearchQuery,
  ]);

  const displayMembers = sortedMembers;

  const isErrorState =
    isSyncTimeout ||
    Boolean(syncErrorMessage) ||
    (networkMode === 'offline' && members.length === 0);

  const isBranchForbidden = useMemo(() => {
    if (!currentBranch) return false;
    const allowed: string[] | undefined = (currentUser as any)?.allowedBranchIds;
    const restricted: string[] | undefined = (currentUser as any)?.restrictedBranchIds;
    if (Array.isArray(restricted) && restricted.includes(currentBranch.id)) return true;
    if (Array.isArray(allowed) && !allowed.includes(currentBranch.id)) return true;
    return false;
  }, [currentBranch, currentUser]);

  const hideCountsForIssue = isErrorState || isBranchForbidden;

  const quickStatusOptions = useMemo(
    () => [
      {
        value: 'All',
        label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All',
        tooltip:
          language === 'ar'
            ? 'جميع المشتركين'
            : language === 'fr'
            ? 'Tous les adhérents'
            : 'All Members',
        count: hideCountsForIssue ? '–' : members.length,
      },
      {
        value: 'Active',
        label: language === 'ar' ? 'نشط' : language === 'fr' ? 'Actifs' : 'Active',
        tooltip:
          language === 'ar'
            ? 'اشتراكات نشطة'
            : language === 'fr'
            ? 'Abonnements actifs'
            : 'Active Subscriptions',
        count: hideCountsForIssue ? '–' : activeMembersCount,
      },
      {
        value: 'Expiring',
        label: language === 'ar' ? 'قريب' : language === 'fr' ? 'Imminent' : 'Expiring',
        tooltip:
          language === 'ar'
            ? 'قيد التجديد خلال أقل من 14 يوماً'
            : language === 'fr'
            ? 'À renouveler sous 14 jours'
            : 'Expiring within 14 days',
        count: hideCountsForIssue ? '–' : expiringCount,
      },
    ],
    [language, hideCountsForIssue, members.length, activeMembersCount, expiringCount]
  );

  const extendedStatusOptions = useMemo(
    () => [
      { value: 'All', label: t('member_filter_all', language), count: members.length },
      { value: 'Active', label: t('member_filter_active', language), count: activeMembersCount },
      { value: 'Expiring', label: t('member_filter_expiring', language), count: expiringCount },
      { value: 'Expired', label: t('member_filter_expired', language), count: expiredCount },
      { value: 'Archived', label: t('member_filter_archived', language), count: archivedCount },
    ],
    [language, members.length, activeMembersCount, expiringCount, expiredCount, archivedCount]
  );

  const genderFilterOptions = useMemo(
    () => [
      { value: 'All', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All' },
      { value: 'Male', label: language === 'ar' ? 'ذكور' : language === 'fr' ? 'Hommes' : 'Male' },
      {
        value: 'Female',
        label: language === 'ar' ? 'إناث' : language === 'fr' ? 'Femmes' : 'Female',
      },
      { value: 'Other', label: language === 'ar' ? 'آخر' : language === 'fr' ? 'Autre' : 'Other' },
    ],
    [language]
  );

  const memberRowDataMap = useMemo(() => {
    const map = new Map<string, KineticRowData>();
    for (let i = 0; i < preparedMembers.length; i++) {
      map.set(preparedMembers[i].member.id, preparedMembers[i].rowData);
    }
    return map;
  }, [preparedMembers]);

  const membersByIdRef = useRef<Map<string, Member>>(new Map());
  membersByIdRef.current = useMemo(() => {
    const map = new Map<string, Member>();
    for (let i = 0; i < members.length; i++) map.set(members[i].id, members[i]);
    return map;
  }, [members]);

  const sortedIndexByIdRef = useRef<Map<string, number>>(new Map());
  sortedIndexByIdRef.current = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < sortedMembers.length; i++) map.set(sortedMembers[i].id, i);
    return map;
  }, [sortedMembers]);

  const sortedMembersRef = useRef(sortedMembers);
  sortedMembersRef.current = sortedMembers;

  const selectedMemberIdsRef = useRef(selectedMemberIds);
  selectedMemberIdsRef.current = selectedMemberIds;

  const displayMembersRef = useRef(displayMembers);
  displayMembersRef.current = displayMembers;

  const handlePruneSelection = useCallback((hiddenIds: string[]) => {
    if (hiddenIds.length === 0) return;
    setSelectedMemberIds((prev) => {
      if (!hiddenIds.some((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      hiddenIds.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    const list = sortedMembersRef.current;
    setSelectedMemberIds((prev) => {
      if (prev.size === list.length && list.length > 0) return new Set();
      return new Set(list.map((m) => m.id));
    });
  }, []);

  const handleToggleSort = useCallback((colKey: string) => {
    setMemberSortBy((prevBy) => {
      if (prevBy === colKey) {
        setMemberSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevBy;
      }
      setMemberSortDir('asc');
      return colKey;
    });
  }, []);

  const handleSelectRow = useCallback((id: string, e: React.MouseEvent) => {
    const key = String(id);
    const list = sortedMembersRef.current;
    const idx = sortedIndexByIdRef.current.get(key) ?? -1;
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedIdxRef.current > -1 && idx > -1) {
        const start = Math.min(lastSelectedIdxRef.current, idx);
        const end = Math.max(lastSelectedIdxRef.current, idx);
        for (let i = start; i <= end; i++) next.add(list[i].id);
      } else if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (idx > -1) lastSelectedIdxRef.current = idx;
  }, []);

  const handleOpenRowDetails = useCallback(
    (id: string, originEl?: HTMLElement | null) => {
      panelOpenerRef.current = originEl || document.activeElement;
      setPanelInitialTab('overview');
      selectMember(String(id));
    },
    [selectMember]
  );

  const handleEditRow = useCallback(
    (id: string, originEl?: HTMLElement | null) => {
      const m = membersByIdRef.current.get(String(id));
      if (m) onEditMember(m, originEl);
    },
    [onEditMember]
  );

  const handleMessageRow = useCallback(
    (id: string) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      if (m.email) window.location.href = `mailto:${m.email}`;
      else
        showToast({
          type: 'info',
          title: 'Email draft',
          message: `No email address for ${m.fullName}`,
        });
    },
    [showToast]
  );

  const handleDeleteRow = useCallback(
    (id: string) => {
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
    (id: string) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      const currentExp = new Date(m.expirationDate || new Date().toISOString());
      const newExp = new Date(currentExp.getTime() + 2592e6).toISOString().split('T')[0];
      updateMember(m.id, { expirationDate: newExp, status: 'Active' });
      showToast({
        type: 'success',
        title: 'Abonnement renouvelé',
        message: `${m.fullName} prolongé jusqu'au ${newExp}`,
      });
    },
    [updateMember, showToast]
  );

  const handleToggleStatusRow = useCallback(
    (id: string) => {
      const m = membersByIdRef.current.get(String(id));
      if (!m) return;
      const isBlocked =
        m.status === 'Suspended' || m.status === 'Banned' || Boolean((m as any).isBlocked);
      updateMember(m.id, { status: isBlocked ? 'Active' : 'Suspended' });
      showToast({
        type: isBlocked ? 'success' : 'info',
        title: isBlocked ? 'Badge réactivé' : 'Badge gelé',
        message: `${m.fullName}: ${
          isBlocked ? 'Accès rétabli' : 'Accès temporairement suspendu'
        }`,
      });
    },
    [updateMember, showToast]
  );

  const handleTogglePinRow = useCallback(
    (id: string) => {
      const key = String(id);
      const m = membersByIdRef.current.get(key);
      setPinnedMemberIds((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          if (m) showToast({ type: 'info', title: 'Détaché', message: `${m.fullName} détaché` });
        } else {
          next.add(key);
          if (m)
            showToast({
              type: 'success',
              title: 'Épinglé',
              message: `${m.fullName} épinglé en tête`,
            });
        }
        return next;
      });
    },
    [showToast]
  );

  useEffect(() => {
    const handleCreated = (e: any) => {
      const newMember = e.detail;
      if (statusFilter !== 'All' && statusFilter !== newMember?.status) setStatusFilter('All');
      setSearchQuery('');
      setPlanFilter('All');
      setGenderFilter('All');
      setAgeGroupFilter('All');
      setBranchFilter('All');
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    };
    window.addEventListener('atrium-member-created', handleCreated);
    return () => window.removeEventListener('atrium-member-created', handleCreated);
  }, [statusFilter]);

  const handleInspectorSelectMember = useCallback(
    (m: Member) => selectMember(m.id),
    [selectMember]
  );
  const handleInspectorEdit = useCallback(
    (m: Member, originEl?: HTMLElement | null) =>
      onEditMember(m, originEl || document.activeElement),
    [onEditMember]
  );
  const handleInspectorDelete = useCallback(
    (m: Member) => {
      deleteMember(m.id);
      closeDetail();
      showToast({
        type: 'info',
        title: 'Adhérent supprimé',
        message: `${m.fullName} a été supprimé.`,
      });
    },
    [deleteMember, closeDetail, showToast]
  );
  const handleInspectorCheckIn = useCallback(
    (m: Member) => {
      checkInMember(m.id);
      showToast({
        type: 'success',
        title: 'Passage enregistré',
        message: `Accès autorisé pour ${m.fullName}`,
      });
    },
    [checkInMember, showToast]
  );
  const handleInspectorRenew = useCallback(
    (m: Member) => {
      const daysToAdd =
        m.membershipPlanName?.toLowerCase().includes('trimest') ||
        m.membershipPlanName?.toLowerCase().includes('quarter')
          ? 90
          : 30;
      const currentExp = new Date(m.expirationDate || new Date().toISOString());
      const newExp = new Date(currentExp.getTime() + daysToAdd * 864e5)
        .toISOString()
        .split('T')[0];
      updateMember(m.id, { expirationDate: newExp, status: 'Active' });
      showToast({
        type: 'success',
        title: 'Abonnement renouvelé',
        message: `${m.fullName} prolongé jusqu'au ${newExp}`,
      });
    },
    [updateMember, showToast]
  );
  const handleInspectorToggleBlock = useCallback(
    (m: Member) => {
      const isCurrentlyBlocked =
        m.status === 'Suspended' || m.status === 'Banned' || Boolean((m as any).isBlocked);
      updateMember(m.id, {
        status: isCurrentlyBlocked ? 'Active' : 'Suspended',
        isBlocked: !isCurrentlyBlocked,
      } as any);
      showToast({
        type: 'info',
        title: !isCurrentlyBlocked ? 'Badge bloqué' : 'Badge débloqué',
        message: `Badge de ${m.fullName} ${!isCurrentlyBlocked ? 'bloqué' : 'débloqué'}.`,
      });
    },
    [updateMember, showToast]
  );
  const handleInspectorUpdateNotes = useCallback(
    (id: string, notes: string) => updateMember(id, { notes }),
    [updateMember]
  );
  const handleInspectorToast = useCallback(
    (msg: string) => showToast({ type: 'info', title: 'Notification', message: msg }),
    [showToast]
  );

  const handleBulkClear = useCallback(() => setSelectedMemberIds(new Set()), []);
  const handleBulkRenew = useCallback(() => {
    const ids = selectedMemberIdsRef.current;
    ids.forEach((id) => {
      const m = membersByIdRef.current.get(id);
      if (m) {
        const currentExp = new Date(m.expirationDate || new Date().toISOString());
        const newExp = new Date(currentExp.getTime() + 2592e6).toISOString().split('T')[0];
        updateMember(m.id, { expirationDate: newExp, status: 'Active' });
      }
    });
    showToast({
      type: 'success',
      title: 'Renouvellement groupé',
      message: `${ids.size} adhérents renouvelés.`,
    });
  }, [updateMember, showToast]);
  const handleBulkArchive = useCallback(() => {
    const ids = selectedMemberIdsRef.current;
    ids.forEach((id) => updateMember(id, { status: 'Suspended' }));
    setSelectedMemberIds(new Set());
    showToast({
      type: 'info',
      title: 'Archivage groupé',
      message: `${ids.size} adhérents archivés.`,
    });
  }, [updateMember, showToast]);
  const handleBulkDelete = useCallback(() => {
    selectedMemberIdsRef.current.forEach((id) => deleteMember(id));
    setSelectedMemberIds(new Set());
    showToast({ type: 'info', title: 'Suppression groupée', message: 'Adhérents supprimés.' });
  }, [deleteMember, showToast]);

  const handleExportCSV = useCallback(() => {
    const list = displayMembersRef.current;
    const headers = [
      language === 'ar' ? 'الاسم الكامل' : language === 'fr' ? 'Nom complet' : 'Full Name',
      language === 'ar' ? 'معرف البطاقة' : language === 'fr' ? 'Identifiant carte' : 'Card ID',
      language === 'ar' ? 'الباقة' : language === 'fr' ? 'Formule' : 'Plan',
      language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone',
      language === 'ar' ? 'البريد الإلكتروني' : language === 'fr' ? 'E-mail' : 'Email',
      language === 'ar' ? 'تاريخ الانتهاء' : language === 'fr' ? "Date d'expiration" : 'Expiration Date',
    ];
    const rows = list.map((m) => {
      const branch = resolveRecordBranch(m, branchesById, currentBranch, language).name;
      return [
        m.fullName,
        m.cardId || '',
        m.membershipPlanName || (language === 'ar' ? 'القياسية' : language === 'fr' ? 'Standard' : 'Standard'),
        localizeStatus(m.status, language),
        branch,
        m.phoneNumber,
        m.email,
        m.expirationDate,
      ];
    });
    downloadCsvSafe(
      `atrium-members-${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [language, branchesById, currentBranch]);

  const handleToggleKpiStatusFilter = useCallback((targetStatus: 'Active' | 'Expiring') => {
    setStatusFilter((prev) => (prev === targetStatus ? 'All' : targetStatus));
  }, []);

  const stageColumns = useMemo<KineticColumnHeader[]>(
    () => [
      { key: 'member', label: terminology.memberSingle },
      { key: 'plan', label: t('member_col_plan', language) },
      { key: 'status', label: t('member_col_access', language) },
      { key: 'expiration', label: t('member_col_expiration', language) },
      {
        key: 'branch',
        label: language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      },
    ],
    [terminology.memberSingle, language]
  );

  const getRowData = useCallback(
    (m: Member): KineticRowData => {
      return (
        memberRowDataMap.get(m.id) || {
          id: m.id,
          title: m.fullName || 'Adhérent',
          categoryLabel: m.membershipPlanName || 'Standard',
          statusLabel: localizeStatus(m.status, language),
          metricPrimary: m.expirationDate || '—',
          branchName: resolveRecordBranch(m, branchesById, currentBranch, language).name,
        }
      );
    },
    [memberRowDataMap, language, branchesById, currentBranch]
  );

  const getFanActions = useCallback(
    (m: Member): KineticRowFanAction[] => [
      {
        id: 'edit',
        label: `Modifier ${m.fullName}`,
        icon: <Edit className="w-[15px] h-[15px]" />,
        onClick: (e) => handleEditRow(m.id, e.currentTarget),
      },
      {
        id: 'msg',
        label: `Contacter ${m.fullName}`,
        icon: <Mail className="w-[15px] h-[15px]" />,
        onClick: () => handleMessageRow(m.id),
      },
      {
        id: 'del',
        label: `Supprimer ${m.fullName}`,
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => handleDeleteRow(m.id),
      },
    ],
    [handleEditRow, handleMessageRow, handleDeleteRow]
  );

  const getDetailActions = useCallback(
    (m: Member): KineticDetailAction[] => {
      const isBlocked =
        m.status === 'Suspended' || m.status === 'Banned' || Boolean((m as any).isBlocked);
      return [
        {
          id: 'details',
          label: 'Ouvrir fiche',
          icon: <Eye className="w-3.5 h-3.5" />,
          onClick: () => handleOpenRowDetails(m.id),
        },
        {
          id: 'edit',
          label: 'Modifier',
          icon: <Edit className="w-3.5 h-3.5" />,
          onClick: () => handleEditRow(m.id),
        },
        {
          id: 'pay',
          label: 'Facturation',
          icon: <CreditCard className="w-3.5 h-3.5" />,
          onClick: () => {
            setPanelInitialTab('billing');
            selectMember(m.id);
          },
        },
        {
          id: 'renew',
          label: 'Renouveler',
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          onClick: () => handleRenewRow(m.id),
        },
        {
          id: 'status',
          label: isBlocked ? 'Débloquer' : 'Geler',
          icon: isBlocked ? (
            <Unlock className="w-3.5 h-3.5 text-[#096b40]" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          ),
          onClick: () => handleToggleStatusRow(m.id),
        },
        {
          id: 'delete',
          label: 'Supprimer',
          icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
          onClick: () => handleDeleteRow(m.id),
        },
      ];
    },
    [
      handleOpenRowDetails,
      handleEditRow,
      selectMember,
      handleRenewRow,
      handleToggleStatusRow,
      handleDeleteRow,
    ]
  );

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
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
            count: members.length,
          },
          ...branchOptionsWithCounts,
        ],
      },
      {
        id: 'gender',
        label: language === 'ar' ? 'الجنس' : language === 'fr' ? 'Sexe / Genre' : 'Gender',
        value: genderFilter,
        onChange: setGenderFilter,
        kind: 'segmented',
        options: genderFilterOptions,
      },
      {
        id: 'age',
        label: language === 'ar' ? 'الفئات العمرية' : language === 'fr' ? "Tranches d'âge" : 'Age Groups',
        value: ageGroupFilter,
        onChange: setAgeGroupFilter,
        kind: 'tiles',
        columns: 3,
        options: [
          { val: 'All', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All' },
          { val: 'under18', label: '<18' },
          { val: '18-25', label: '18-25' },
          { val: '26-40', label: '26-40' },
          { val: '41-60', label: '41-60' },
          { val: 'over60', label: '>60' },
        ].map((ag) => ({
          value: ag.val,
          label: ag.label,
          count: ageGroupCounts[ag.val] ?? 0,
        })),
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
            count: members.length,
          },
          ...dynamicAvailablePlans.map((p) => ({
            value: p.id,
            label: compactFilterLabel(p.name).label,
            sublabel: p.price > 0 ? formatMoney(p.price) : undefined,
            count: planCounts.get(p.id) ?? 0,
            tooltip: p.name,
          })),
        ],
      },
      {
        id: 'status',
        label: language === 'ar' ? 'حالة الحساب والوصول' : language === 'fr' ? 'Statut du compte' : 'Account Status',
        value: statusFilter,
        onChange: setStatusFilter,
        kind: 'segmented',
        options: extendedStatusOptions,
      },
    ],
    [
      language,
      branchFilter,
      members.length,
      branchOptionsWithCounts,
      genderFilter,
      genderFilterOptions,
      ageGroupFilter,
      ageGroupCounts,
      planFilter,
      dynamicAvailablePlans,
      planCounts,
      statusFilter,
      extendedStatusOptions,
    ]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: branchFilter,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (genderFilter !== 'All') {
      chips.push({
        key: 'gender',
        label: genderFilterOptions.find((g) => g.value === genderFilter)?.label || genderFilter,
        onRemove: () => setGenderFilter('All'),
      });
    }
    if (ageGroupFilter !== 'All') {
      chips.push({
        key: 'age',
        label:
          ageGroupFilter === 'under18'
            ? '<18'
            : ageGroupFilter === 'over60'
            ? '>60'
            : ageGroupFilter,
        onRemove: () => setAgeGroupFilter('All'),
      });
    }
    if (planFilter !== 'All') {
      const fullPlanName =
        dynamicAvailablePlans.find((p) => p.id === planFilter)?.name ||
        plans.find((p) => p.id === planFilter)?.name ||
        planFilter;
      chips.push({
        key: 'plan',
        label: compactFilterLabel(fullPlanName).label,
        title: fullPlanName,
        onRemove: () => setPlanFilter('All'),
      });
    }
    if (statusFilter === 'Expired' || statusFilter === 'Archived') {
      chips.push({
        key: 'status',
        label: localizeStatus(statusFilter, language),
        onRemove: () => setStatusFilter('All'),
      });
    }
    return chips;
  }, [
    branchFilter,
    genderFilter,
    genderFilterOptions,
    ageGroupFilter,
    planFilter,
    dynamicAvailablePlans,
    plans,
    statusFilter,
    language,
  ]);

  const bulkActions = useMemo<KineticBulkAction[]>(
    () => [
      {
        id: 'renew',
        label: language === 'ar' ? 'تجديد' : language === 'fr' ? 'Renouveler' : 'Renew',
        icon: <RotateCcw className="w-4 h-4" />,
        onClick: handleBulkRenew,
      },
      {
        id: 'archive',
        label: language === 'ar' ? 'أرشفة' : language === 'fr' ? 'Archiver' : 'Archive',
        icon: <Lock className="w-4 h-4" />,
        onClick: handleBulkArchive,
      },
    ],
    [language, handleBulkRenew, handleBulkArchive]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: members.length > 0,
  });

  const nextExpiry = useMemo(() => {
    if (statusFilter !== 'Expiring') return undefined;
    let best: { date: string; name: string; days: number } | undefined;
    for (let i = 0; i < preparedMembers.length; i++) {
      const item = preparedMembers[i];
      if (item.member.status !== 'Active' || item.daysRemaining <= 0) continue;
      if (!best || item.daysRemaining < best.days) {
        best = {
          date: item.expStr || item.member.expirationDate,
          name: item.member.fullName,
          days: item.daysRemaining,
        };
      }
    }
    return best;
  }, [preparedMembers, statusFilter]);

  const handleImportCsv = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 0) return;

        const defaultPlan = plans[0];
        const todayIso = new Date().toISOString().split('T')[0];
        const expIso = new Date(Date.now() + (defaultPlan?.durationDays || 30) * 864e5)
          .toISOString()
          .split('T')[0];

        let imported = 0;
        lines.forEach((line, idx) => {
          const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ''));
          if (idx === 0 && /nom|name|id/i.test(cols[0] || '') && /nom|name|phone|tel/i.test(cols[1] || '')) {
            return;
          }
          const cardId = cols[0] && cols.length >= 2 ? cols[0] : `RFID-${Date.now()}-${idx}`;
          const fullName = cols.length >= 2 ? cols[1] : cols[0];
          const phoneNumber = cols[2] || '';
          const planName = cols[3] || defaultPlan?.name || 'Standard';
          if (!fullName) return;
          const matchedPlan = plans.find((p) => p.name.toLowerCase() === planName.toLowerCase()) || defaultPlan;
          addMember({
            fullName,
            email: '',
            phoneNumber,
            cardId,
            status: 'Active',
            startDate: todayIso,
            expirationDate: expIso,
            membershipPlanId: matchedPlan?.id,
            membershipPlanName: matchedPlan?.name || planName,
            remainingSessions: 30,
            gender: 'Male',
          });
          imported++;
        });

        if (imported > 0) {
          showToast({
            type: 'success',
            title: language === 'ar' ? 'تم الاستيراد' : language === 'fr' ? 'Import réussi' : 'Import complete',
            message: `${imported} ${terminology.members.toLowerCase()}`,
          });
        }
      };
      reader.readAsText(file);
    },
    [plans, addMember, showToast, language, terminology.members]
  );

  const formattedLastSync = useMemo(() => {
    if (!lastSyncedAt) return undefined;
    try {
      return new Date(lastSyncedAt).toLocaleTimeString(
        language === 'ar' ? 'ar-DZ' : language === 'en' ? 'en-US' : 'fr-FR',
        { hour: '2-digit', minute: '2-digit' }
      );
    } catch {
      return lastSyncedAt;
    }
  }, [lastSyncedAt, language]);

  const emptyStateProps = useMemo(() => {
    if (!isErrorState && !isBranchForbidden && sortedMembers.length > 0) {
      return undefined;
    }
    const esLocale = language === 'ar' ? 'ar' : language === 'en' ? 'en' : 'fr';
    const siteName = currentBranch?.name || 'Siège Principal';
    const tabParam =
      statusFilter === 'Expiring'
        ? 'renewals'
        : statusFilter !== 'All' && statusFilter !== 'Expired' && statusFilter !== 'Archived'
        ? statusFilter.toLowerCase()
        : undefined;

    return resolveEmptyState({
      error: isErrorState
        ? {
            status: networkMode === 'offline' ? 503 : 500,
            lastSync: formattedLastSync,
          }
        : undefined,
      forbidden: isBranchForbidden ? { site: siteName } : undefined,
      total: members.length,
      results: sortedMembers.length,
      query: searchQuery,
      tab: tabParam,
      filters: activeChips.map((c) => c.label),
      site: siteName,
      nextExpiry,
      locale: esLocale,
      handlers: {
        retry: () => {
          retry();
          void retryCloudSync();
        },
        clearSearch: () => setSearchQuery(''),
        addMember: (prefill) => onAddMember(undefined, prefill),
        importFile: () => csvInputRef.current?.click(),
        resetFilters: handleResetFilters,
        showAll: () => setStatusFilter('All'),
        requestAccess: () =>
          showToast({
            type: 'info',
            title:
              language === 'ar'
                ? 'تم إرسال طلب الصلاحية'
                : language === 'fr'
                ? 'Demande envoyée'
                : 'Access request sent',
            message: siteName,
          }),
        changeSite: () => openFastSwitch(),
        report: () =>
          showToast({
            type: 'info',
            title:
              language === 'ar'
                ? 'تم الإبلاغ عن المشكلة'
                : language === 'fr'
                ? 'Incident signalé'
                : 'Issue reported',
            message: syncErrorMessage || 'Code 503',
          }),
      },
    });
  }, [
    language,
    currentBranch?.name,
    statusFilter,
    isErrorState,
    networkMode,
    formattedLastSync,
    isBranchForbidden,
    members.length,
    sortedMembers.length,
    searchQuery,
    activeChips,
    nextExpiry,
    retry,
    retryCloudSync,
    onAddMember,
    handleResetFilters,
    showToast,
    openFastSwitch,
    syncErrorMessage,
  ]);

  const filterKey = `${deferredStatusFilter}|${deferredPlanFilter}|${deferredGenderFilter}|${deferredAgeGroupFilter}|${deferredBranchFilter}|${deferredSearchQuery}`;
  const membersLower = terminology.members.toLowerCase();

  if (
    showSkeleton &&
    !isTimedOut &&
    (!isErrorState || networkMode === 'force_skeleton') &&
    (members.length === 0 || networkMode === 'force_skeleton')
  ) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '140px', minWidth: '120px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportCsv}
      />
      <ScreenHeaderBar
        icon={<Users size={22} />}
        title={terminology.members}
        primaryAction={{
          label: `${t('action_add', language)} ${terminology.memberSingle}`,
          onClick: onAddMember,
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-member',
        }}
      />

      <ScreenKpiBanner
        heading={`${terminology.members} & ${
          language === 'ar'
            ? 'مؤشرات التجديد'
            : language === 'fr'
            ? 'Rétention & Renouvellements'
            : 'Retention Health'
        }`}
        language={language}
        primaryCard={{
          label:
            language === 'ar'
              ? `قاعدة ${terminology.members} النشطة`
              : language === 'fr'
              ? `Base active ${membersLower}`
              : `Active ${terminology.members} Base`,
          badgeText: `↗ 100% ${
            language === 'ar' ? 'نشط' : language === 'fr' ? 'Actifs' : 'Active'
          }`,
          count: activeMembersCount,
          isActive: statusFilter === 'Active',
          onToggle: () => handleToggleKpiStatusFilter('Active'),
          title:
            language === 'ar'
              ? 'تصفية حسب المشتركين النشطين'
              : language === 'fr'
              ? 'Filtrer les adhérents actifs'
              : 'Filter active members',
        }}
        secondaryCard={{
          label:
            language === 'ar'
              ? 'تنبيهات انتهاء الاشتراك'
              : language === 'fr'
              ? 'Alertes de renouvellement'
              : 'Renewal & Retention Alert',
          badgeText:
            language === 'ar'
              ? 'تنتهي قريباً (<14 يوم)'
              : language === 'fr'
              ? 'expirent sous 14j'
              : 'expiring (<14d)',
          count: expiringCount,
          isActive: statusFilter === 'Expiring',
          onToggle: () => handleToggleKpiStatusFilter('Expiring'),
          title:
            language === 'ar'
              ? 'تصفية حسب الاشتراكات التي تنتهي قريباً'
              : language === 'fr'
              ? 'Filtrer les renouvellements imminents'
              : 'Filter expiring memberships',
        }}
        darkCard={{
          label:
            language === 'ar'
              ? 'الوافدون الجدد شهرياً'
              : language === 'fr'
              ? 'Adhésions du mois'
              : 'Monthly Inflow',
          badgeCount: displayMembers.length,
          badgePrefix: '+',
          badgeSuffix: membersLower,
          valueCount: displayMembers.length,
          valuePrefix: '+',
          caption:
            language === 'ar'
              ? 'باقات وحسابات جديدة هذا الشهر'
              : language === 'fr'
              ? 'Nouveaux forfaits et profils ce mois-ci'
              : 'New packages & client profiles this month',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            language === 'ar'
              ? 'قائمة المشتركين'
              : language === 'fr'
              ? 'Liste des adhérents'
              : 'Members Directory'
          }
          liveRegionText={
            displayMembers.length === 0
              ? 'Aucun adhérent ne correspond'
              : `${displayMembers.length} adhérent${displayMembers.length > 1 ? 's' : ''} trouvé${
                  displayMembers.length > 1 ? 's' : ''
                }`
          }
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            language === 'ar'
              ? `البحث في ${terminology.members}...`
              : language === 'fr'
              ? 'Rechercher...'
              : 'Search...'
          }
          statusOptions={quickStatusOptions}
          statusValue={statusFilter === 'Expired' || statusFilter === 'Archived' ? 'All' : statusFilter}
          onStatusChange={setStatusFilter}
          statusAriaLabel={language === 'ar' ? 'تصفية المشتركين' : 'Filtre des adhérents'}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterPopoverOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={toggleFilterPopover}
          viewMode={viewMode}
          onViewModeChange={(val) => setViewMode(val === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          exportTooltip={t('members_export_csv', language)}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <KineticCollectionStage<Member>
          scrollContainerRef={scrollContainerRef}
          items={isErrorState || isBranchForbidden ? [] : sortedMembers}
          keyExtractor={(m) => m.id}
          columns={stageColumns}
          getRowData={getRowData}
          viewMode={viewMode}
          filterKey={filterKey}
          expandedIds={expandedMemberIds}
          selectedIds={selectedMemberIds}
          pinnedIds={pinnedMemberIds}
          openItemId={isDetailOpen ? selectedMember?.id ?? null : null}
          sortBy={memberSortBy}
          sortDir={memberSortDir}
          language={language}
          ariaLabel="Adhérents"
          emptyMessage={
            language === 'ar'
              ? 'لا يوجد مشتركين مطابقين.'
              : language === 'fr'
              ? 'Aucun adhérent ne correspond. Modifiez la recherche ou les filtres.'
              : 'No members match. Adjust search or filters.'
          }
          emptyState={emptyStateProps}
          onPruneSelection={handlePruneSelection}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSort={handleToggleSort}
          onSelectRow={handleSelectRow}
          onToggleExpand={toggleExpandMember}
          onOpenDetails={handleOpenRowDetails}
          onEdit={handleEditRow}
          onSecondaryAction={handleMessageRow}
          onDelete={handleDeleteRow}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterPopoverOpen}
        onClose={closeFilterPopover}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={displayMembers.length}
        entityPluralLabel={membersLower}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <MemberSlideOverInspector
        isOpen={isDetailOpen && Boolean(selectedMember)}
        member={selectedMember}
        allMembers={sortedMembers}
        openerElement={panelOpenerRef.current}
        initialTab={panelInitialTab}
        onClose={closeDetail}
        onSelectMember={handleInspectorSelectMember}
        onEdit={handleInspectorEdit}
        onDelete={handleInspectorDelete}
        onCheckIn={handleInspectorCheckIn}
        onRenew={handleInspectorRenew}
        onToggleBlock={handleInspectorToggleBlock}
        onUpdateNotes={handleInspectorUpdateNotes}
        showToast={handleInspectorToast}
      />

      <KineticFloatingBulkBar
        selectedCount={selectedMemberIds.size}
        language={language}
        actions={bulkActions}
        onExport={handleExportCSV}
        onDelete={handleBulkDelete}
        onClear={handleBulkClear}
      />

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
});

MembershipMembersView.displayName = 'MembershipMembersView';
export const MembersScreen = MembershipMembersView;
