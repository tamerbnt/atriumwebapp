import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Home,
  ChevronDown,
  Search,
  Download,
  LayoutGrid,
  List,
  Maximize2,
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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Member, MemberStatus } from '../../../types/index';
import { calculateDaysRemaining, formatMoney, localizeStatus } from '../../../utils/rules';
import { AppointmentModal } from '../../modals/AppointmentModal';
import { Seek } from '../../ui/Seek';
import { ActionNode } from '../../ui/ActionNode';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { t } from '../../../utils/i18n';

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
  }, [members, statusFilter, planFilter, searchQuery]);


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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {language === 'ar'
                ? `إدارة وتصفية ملفات ${terminology.members} والباقات وسجل الزيارات`
                : language === 'fr'
                ? `Gérer et filtrer les profils, forfaits et historique des ${terminology.members.toLowerCase()}`
                : `Browse, filter, and manage ${terminology.members.toLowerCase()} profiles, packages, and visit history`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
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

          {/* Add Member Primary Button */}
          <AtriumButton
            variant="primary"
            onClick={onAddMember}
            icon={<Plus size={15} strokeWidth={2.5} />}
          >
            {t('action_add', language)} {terminology.memberSingle}
          </AtriumButton>
        </div>
      </div>

      {/* Row 1: "Roster & Retention Health" Banner Card matching Screenshot 881 */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {terminology.members} & {language === 'ar' ? 'مؤشرات التجديد' : language === 'fr' ? 'Rétention & Renouvellements' : 'Retention Health'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar'
              ? `متابعة اشتراكات ${terminology.members} ومعدلات التجديد وحجم التسجيلات`
              : language === 'fr'
              ? `Pipeline des ${terminology.members.toLowerCase()}, taux de renouvellement et adhésions`
              : `Active ${terminology.members.toLowerCase()} pipeline, renewal retention, and intake volume`}
          </p>
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

      {/* Row 2: Members Master Table Group matching Screenshot 881 */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {terminology.members}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {displayMembers.length}
            </span>
          </div>

          {/* Right Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Seek Kinetic Search Box */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? `البحث في ${terminology.members}...` : language === 'fr' ? `Rechercher ${terminology.members.toLowerCase()}...` : `Search ${terminology.members.toLowerCase()}...`}
              shutSize={36}
              openWidth={220}
            />

            {/* Status Filter Segmented Capsules matching Screenshot 881 */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Active', 'Expiring', 'Expired', 'Archived'] as const).map(
                (filter) => {
                  const isActive = statusFilter === filter;
                  const label =
                    filter === 'All'
                      ? t('member_filter_all', language)
                      : filter === 'Active'
                      ? t('member_filter_active', language)
                      : filter === 'Expiring'
                      ? t('member_filter_expiring', language)
                      : filter === 'Expired'
                      ? t('member_filter_expired', language)
                      : t('member_filter_archived', language);
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
                        isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                }
              )}
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

            {/* Export Data Button with Tray Icon */}
            <AtriumButton
              variant="secondary"
              onClick={handleExportCSV}
              icon={<Download size={13} />}
              size="sm"
            >
              <span>{t('members_export_csv', language)}</span>
            </AtriumButton>

            {/* View Mode Toggle: Grid & List */}
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

            {/* Fullscreen Expand Icon */}
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

        {/* Master Content Area + 390px Detail Inspector Panel */}
        <div className="flex items-start gap-4">
          {/* Table / Grid Container */}
          <div
            className={`flex-1 transition-all duration-300 min-w-0 ${
              isDetailOpen ? 'max-w-[calc(100%-406px)]' : 'w-full'
            }`}
          >
            <UniversalDataCollection<Member>
              items={sortedMembers}
              keyExtractor={(m) => m.id}
              defaultViewMode={viewMode}
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
              showViewToggle={true}
              emptyTitle={language === 'ar' ? 'لا يوجد مشتركون' : language === 'fr' ? 'Aucun adhérent trouvé' : 'No members found'}
              emptyDescription={language === 'ar' ? 'جرب تغيير معايير البحث أو إضافة مشترك جديد' : language === 'fr' ? 'Essayez de modifier vos filtres ou ajoutez un nouvel adhérent' : 'Try adjusting your search filters or add a new member'}
              emptyIcon={<Users size={32} className="text-[#C4785A]" />}
              primaryActionLabel={`${t('action_add', language)} ${terminology.memberSingle}`}
              onAddFirstItem={onAddMember}
            />
          </div>

          {/* 390px Slide-in Detail Inspector Panel */}
          {isDetailOpen && selectedMember && (
            <aside
              style={{
                width: '390px',
              }}
              className="shrink-0 p-6 flex flex-col justify-between max-h-[calc(100vh-220px)] overflow-y-auto animate-in slide-in-from-right-8 duration-200 bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 rounded-[24px] shadow-lg"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3.5">
                    <div
                      style={{
                        backgroundColor: getMemberInitialsColor(selectedMember.fullName),
                      }}
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs"
                    >
                      {selectedMember.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white capitalize">
                        {selectedMember.fullName}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-[#C4785A] bg-[#C4785A]/15 px-2 py-0.5 rounded-full">
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
                    className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => checkInMember(selectedMember.id)}
                    className="p-2 rounded-xl bg-[#FDF4F0] dark:bg-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 text-[#C4785A] hover:bg-[#FCEEE8] cursor-pointer transition-colors border border-[#F5E2D8] dark:border-neutral-700"
                    title={t('member_drawer_quick_checkin', language)}
                  >
                    <UserCheck size={14} />
                    <span className="text-[10px] truncate max-w-full">{t('member_drawer_quick_checkin', language)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditMember(selectedMember)}
                    className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <Edit size={14} className="text-[#C4785A]" />
                    <span className="text-[10px] truncate max-w-full">{t('action_edit', language)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedMember.status === 'Frozen' ? 'Active' : 'Frozen';
                      updateMember(selectedMember.id, { status: next });
                    }}
                    className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    {selectedMember.status === 'Frozen' ? (
                      <Unlock size={14} className="text-emerald-500" />
                    ) : (
                      <Lock size={14} className="text-amber-500" />
                    )}
                    <span className="text-[10px] truncate max-w-full">
                      {selectedMember.status === 'Frozen'
                        ? t('member_drawer_unblock', language)
                        : t('member_drawer_block', language)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMember(selectedMember.id, { remainingSessions: (selectedMember.remainingSessions || 0) + 30 })}
                    className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={14} className="text-blue-500" />
                    <span className="text-[10px] truncate max-w-full">{currentBusiness.category === 'appointment_service' ? '+Pass' : t('member_drawer_renew', language)}</span>
                  </button>
                </div>

                {/* Subscription / Package Details Card */}
                <div className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      {currentBusiness.category === 'appointment_service'
                        ? t('salon_package_plan', language)
                        : (language === 'ar' ? 'باقة الاشتراك:' : language === 'fr' ? 'Formule d\'abonnement :' : 'Account Plan:')}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[180px]">
                      {selectedMember.membershipPlanName || (currentBusiness.category === 'appointment_service' ? t('salon_standard_package', language) : (language === 'ar' ? 'الباقة القياسية' : language === 'fr' ? 'Formule Standard' : 'Standard Package'))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      {language === 'ar' ? 'تاريخ الانتهاء:' : language === 'fr' ? 'Date d\'échéance :' : 'Expiration Date:'}
                    </span>
                    <span className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                      {selectedMember.expirationDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      {language === 'ar' ? 'الأيام المتبقية:' : language === 'fr' ? 'Jours restants :' : 'Remaining Days:'}
                    </span>
                    <span className="font-bold text-[#C4785A] tabular-nums">
                      {calculateDaysRemaining(false, selectedMember.expirationDate)} {t('member_days_unit', language)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      {currentBusiness.category === 'appointment_service'
                        ? t('salon_included_sessions', language)
                        : (language === 'ar' ? 'الحصص المتبقية:' : language === 'fr' ? 'Séances restantes :' : 'Remaining Sessions:')}
                    </span>
                    <span className="font-bold text-emerald-600 tabular-nums">
                      {selectedMember.remainingSessions || 30} {currentBusiness.category === 'appointment_service' ? t('salon_session_unit', language) : (language === 'ar' ? 'حصة' : language === 'fr' ? 'séances' : 'visits')}
                    </span>
                  </div>
                </div>


                  /* Dedicated Gym & Fitness Tabs: Turnstile History, Pro-Shop Sales, and Class Bookings */
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center p-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setGymDrawerTab('history')}
                          className={`px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                            gymDrawerTab === 'history'
                              ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          {t('member_drawer_tab_history', language)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGymDrawerTab('sales')}
                          className={`px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                            gymDrawerTab === 'sales'
                              ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          {t('member_drawer_tab_sales', language)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGymDrawerTab('bookings')}
                          className={`px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                            gymDrawerTab === 'bookings'
                              ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                              : 'text-neutral-500 hover:text-neutral-800'
                          }`}
                        >
                          {t('member_drawer_tab_bookings', language)}
                        </button>
                      </div>
                    </div>

                    {gymDrawerTab === 'history' && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div>
                              <div className="font-bold text-neutral-900 dark:text-white">
                                {language === 'ar' ? 'بوابة الدخول الرئيسية A1' : language === 'fr' ? 'Portique Tourniquet A1' : 'Main Turnstile Gate A1'}
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                {language === 'ar' ? 'اليوم · 09:14' : language === 'fr' ? 'Aujourd\'hui · 09:14' : 'Today · 09:14'} · {selectedMember.cardId || 'RFID-994821'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            {language === 'ar' ? 'تم الدخول' : language === 'fr' ? 'Accès Autorisé' : 'Admitted'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div>
                              <div className="font-bold text-neutral-900 dark:text-white">
                                {language === 'ar' ? 'بوابة الدخول الرئيسية A1' : language === 'fr' ? 'Portique Tourniquet A1' : 'Main Turnstile Gate A1'}
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                {language === 'ar' ? 'أمس · 17:35' : language === 'fr' ? 'Hier · 17:35' : 'Yesterday · 17:35'} · {selectedMember.cardId || 'RFID-994821'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            {language === 'ar' ? 'تم الدخول' : language === 'fr' ? 'Accès Autorisé' : 'Admitted'}
                          </span>
                        </div>
                      </div>
                    )}

                    {gymDrawerTab === 'sales' && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {(() => {
                          const memberSales = sales.filter((s) => s.memberId === selectedMember.id);
                          if (memberSales.length === 0) {
                            return (
                              <div className="p-3 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
                                <p className="text-[11px]">{language === 'ar' ? 'لا توجد مشتريات مسجلة للمشترك' : language === 'fr' ? 'Aucun achat boutique enregistré' : 'No purchases recorded for this member'}</p>
                              </div>
                            );
                          }
                          return memberSales.map((sale) => (
                            <div
                              key={sale.id}
                              className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex flex-col gap-1"
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
                              <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5 border-t border-neutral-200/50 dark:border-neutral-700/50">
                                <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                                <span className="font-medium text-neutral-600 dark:text-neutral-300">{sale.paymentMethod}</span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {gymDrawerTab === 'bookings' && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {schedule.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-neutral-900 dark:text-white">
                                {ev.title}
                              </span>
                              <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
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
                    )}
                  </div>

                {/* Contact Information */}
                <div className="space-y-2 text-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'بيانات الاتصال والدخول' : language === 'fr' ? 'Contact & Accès' : 'Contact & Access'}
                  </h4>
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Phone size={13} className="text-neutral-400" />
                    <span>{selectedMember.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <Mail size={13} className="text-neutral-400" />
                    <span>{selectedMember.email}</span>
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
                    rows={2}
                    value={selectedMember.notes || ''}
                    onChange={(e) => {
                      updateMember(selectedMember.id, { notes: e.target.value });
                      setSaveNoteSuccess(true);
                      setTimeout(() => setSaveNoteSuccess(false), 2000);
                    }}
                    placeholder={language === 'ar' ? 'أضف ملاحظات خاصة حول المشترك...' : language === 'fr' ? 'Ajouter des notes internes sur l\'adhérent...' : 'Add private staff notes...'}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* Bottom Delete */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
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
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>
                    {language === 'ar'
                      ? `حذف ${terminology.memberSingle}`
                      : language === 'fr'
                      ? `Supprimer ${terminology.memberSingle.toLowerCase()}`
                      : `Delete ${terminology.memberSingle}`}
                  </span>
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>

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
