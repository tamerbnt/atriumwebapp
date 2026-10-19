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
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { Member, MemberStatus } from '../../types/index';
import { calculateDaysRemaining, formatMoney } from '../../utils/rules';
import { AppointmentModal } from '../modals/AppointmentModal';
import { Seek } from '../ui/Seek';
import { ActionNode } from '../ui/ActionNode';

interface MembersScreenProps {
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
}

export const MembersScreen: React.FC<MembersScreenProps> = ({
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
    appointments,
    sales,
    switchBusiness,
    switchBranch,
    selectedMember,
    isDetailOpen,
    selectMember,
    closeDetail,
    updateMember,
    deleteMember,
    setScreen,
    showToast,
  } = useAtriumStore();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expiring' | 'Expired' | 'Archived'>('All');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [saveNoteSuccess, setSaveNoteSuccess] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

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

  const isPOS = currentBusiness.category === 'pos_inventory';
  const isSalon = currentBusiness.category === 'appointment_service';

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

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Card ID', 'Plan', 'Status', 'Balance', 'Phone', 'Email', 'Expiration Date'];
    const rows = displayMembers.map((m) => [
      `"${m.fullName}"`,
      `"${m.cardId || ''}"`,
      `"${m.membershipPlanName || 'Standard'}"`,
      `"${m.status}"`,
      `"0.00 DA"`,
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
              Browse, filter, and manage {terminology.members.toLowerCase()} profiles, packages, and visit history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
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
                  Switch Facility
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
          <button
            type="button"
            onClick={onAddMember}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add {terminology.memberSingle}</span>
          </button>
        </div>
      </div>

      {/* Row 1: "Roster & Retention Health" Banner Card matching Screenshot 881 */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {terminology.members} & Retention Health
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Active {terminology.members.toLowerCase()} pipeline, renewal retention, and intake volume
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Active Member Base — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                Active {terminology.members} Base
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ 100% Actifs
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
                {isPOS ? 'Customer Ledger Volume' : 'Renewal & Retention Alert'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  {isPOS ? 'Total Account Spend' : `${expiringCount} expirent bientôt`}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
              {isPOS ? formatMoney(customerSalesMetrics.totalSpend) : expiringCount}
            </div>
          </div>

          {/* Tile 3: Active Purchasing Customers or Monthly Inflow */}
          <div className="p-5 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div>
              <span className="text-xs font-medium text-neutral-300">
                {isPOS ? 'Active Purchasing Customers' : 'Monthly Inflow'}
              </span>
              <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                {isPOS ? 'Profiles with settled POS order history' : 'New packages & client profiles this month'}
              </div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              {isPOS
                ? `${customerSalesMetrics.purchasingCount} clients`
                : `+${displayMembers.length} ${terminology.members.toLowerCase()}`}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Members Master Table Group matching Screenshot 881 */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
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
              placeholder={`Search ${terminology.members.toLowerCase()}...`}
              shutSize={36}
              openWidth={220}
            />

            {/* Status Filter Segmented Capsules matching Screenshot 881 */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Active', 'Expiring', 'Expired', 'Archived'] as const).map(
                (filter) => {
                  const isActive = statusFilter === filter;
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
                      {filter}
                    </button>
                  );
                }
              )}
            </div>

            {/* Plan Filter Dropdown */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer focus:outline-none shadow-2xs"
            >
              <option value="All">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Export Data Button with Tray Icon */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-full border border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              title="Download CSV export"
            >
              <Download size={13} />
              <span>Export Data</span>
            </button>

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
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
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
            {viewMode === 'list' ? (
              <div className="space-y-2">
                {/* Desktop Column Header Bar matching Screenshot 881 */}
                <div className="grid grid-cols-12 items-center px-4 py-3 rounded-2xl bg-white dark:bg-neutral-800/90 border border-[#E9EEF0] dark:border-neutral-700/60 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider shadow-2xs">
                  <div className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === displayMembers.length &&
                        displayMembers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded-md border-neutral-300 text-[#C4785A] focus:ring-[#C4785A] cursor-pointer"
                    />
                  </div>
                  <div className="col-span-4 flex items-center gap-1">
                    <span>{terminology.memberSingle}</span>
                    <span className="text-[10px]">↕</span>
                  </div>
                  <div className="col-span-2 text-center flex items-center justify-center gap-1">
                    <span>{terminology.plan}</span>
                    <span className="text-[10px]">↕</span>
                  </div>
                  <div className="col-span-2 text-center flex items-center justify-center gap-1">
                    <span>Status</span>
                    <span className="text-[10px]">↕</span>
                  </div>
                  <div className="col-span-2 text-right flex items-center justify-end gap-1 pr-2">
                    <span>{currentBusiness.category === 'appointment_service' ? 'Package / Value' : 'Balance'}</span>
                    <span className="text-[10px]">↕</span>
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {/* Member Card Strips matching Screenshot 881 */}
                <div className="space-y-2">
                  {displayMembers.map((member) => {
                    const isChecked = selectedIds.includes(member.id);
                    const isSelected = selectedMember?.id === member.id && isDetailOpen;
                    const avatarColor = getMemberInitialsColor(member.fullName);
                    const matchedPlan = plans.find((p) => p.id === member.membershipPlanId);
                    const priceDisplay = matchedPlan ? formatMoney(matchedPlan.price.amount) : '1,500.00 DA';

                    return (
                      <div
                        key={member.id}
                        onClick={() => selectMember(member.id)}
                        className={`grid grid-cols-12 items-center px-4 py-3.5 rounded-2xl bg-white dark:bg-neutral-800 border transition-all cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'border-[#C4785A] ring-1 ring-[#C4785A]/30'
                            : 'border-[#E9EEF0] dark:border-neutral-700/60 hover:border-[#D5DFE3] dark:hover:border-neutral-600'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className="col-span-1 flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOne(member.id)}
                            className="w-4 h-4 rounded-md border-neutral-300 text-[#C4785A] focus:ring-[#C4785A] cursor-pointer"
                          />
                        </div>

                        {/* Member Identity Stack with Avatar */}
                        <div className="col-span-4 flex items-center gap-3 min-w-0 pr-2">
                          <div
                            style={{ backgroundColor: avatarColor }}
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs"
                          >
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-neutral-900 dark:text-white capitalize truncate">
                              {member.fullName.toLowerCase()}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono">
                              ID: {member.cardId?.replace('RFID-', '') || '46466446'}
                            </div>
                          </div>
                        </div>

                        {/* Plan Tag */}
                        <div className="col-span-2 text-center">
                          <span className="inline-block px-3 py-0.5 rounded-full bg-[#FDF4F0] dark:bg-neutral-700/80 text-[#C4785A] text-[11px] font-bold border border-[#F5E2D8] dark:border-neutral-600 truncate max-w-[130px]">
                            {member.membershipPlanName || 'Standard'}
                          </span>
                        </div>

                        {/* Status (● Active with green dot) */}
                        <div className="col-span-2 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                              member.status === 'Active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                                : member.status === 'Frozen'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.status === 'Active'
                                  ? 'bg-emerald-500'
                                  : member.status === 'Frozen'
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {member.status}
                          </span>
                        </div>

                        {/* Balance / Value */}
                        <div className="col-span-2 text-right font-mono font-bold text-xs text-neutral-900 dark:text-white tabular-nums pr-2">
                          {priceDisplay}
                        </div>

                        {/* Eye inspect action icon */}
                        <div
                          className="col-span-1 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectMember(member.id);
                          }}
                        >
                          <button
                            type="button"
                            className="p-1.5 rounded-full text-neutral-400 hover:text-[#C4785A] hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                            title={`Inspect ${terminology.memberSingle.toLowerCase()} details`}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Grid View Cards with ActionNode */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {displayMembers.map((member) => {
                  const isChecked = selectedIds.includes(member.id);
                  const isSelected = selectedMember?.id === member.id && isDetailOpen;
                  const avatarColor = getMemberInitialsColor(member.fullName);
                  const matchedPlan = plans.find((p) => p.id === member.membershipPlanId);
                  const priceDisplay = matchedPlan ? formatMoney(matchedPlan.price.amount) : '1,500.00 DA';

                  return (
                    <ActionNode
                      key={member.id}
                      title={member.fullName}
                      description={`Plan: ${member.membershipPlanName || 'Standard'} · Balance: ${priceDisplay}`}
                      tag={member.status}
                      selected={isSelected}
                      onClick={() => selectMember(member.id)}
                      width="100%"
                      air={14}
                      corner={20}
                      icon={
                        <div
                          style={{ backgroundColor: avatarColor }}
                          className="w-full h-full rounded-[inherit] flex items-center justify-center font-bold text-white text-xs"
                        >
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                      }
                      avatars={[
                        {
                          id: member.id,
                          name: member.fullName,
                          color: avatarColor,
                        },
                      ]}
                      actions={[
                        {
                          id: 'view',
                          label: 'Inspect Member',
                          icon: <Eye size={14} />,
                          onClick: () => selectMember(member.id),
                        },
                        {
                          id: 'edit',
                          label: 'Edit Member',
                          icon: <Edit size={14} />,
                          onClick: () => onEditMember(member),
                        },
                        {
                          id: 'checkin',
                          label: 'Check-in Member',
                          icon: <Check size={14} />,
                          onClick: () => {
                            updateMember(member.id, {
                              lastVisitDate: new Date().toISOString().split('T')[0],
                            });
                            showToast({
                              type: 'success',
                              title: 'Member Checked In',
                              message: `${member.fullName} (${member.cardId || 'Access Granted'}) session recorded.`,
                              category: currentBusiness?.category,
                              action: {
                                label: 'Inspect',
                                onClick: () => selectMember(member.id),
                              },
                            });
                          },
                        },
                      ]}
                    >
                      <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-[#EDF1F3] dark:border-neutral-700/60">
                        <span className="text-[11px] text-neutral-400 font-mono">
                          ID: {member.cardId?.replace('RFID-', '') || '46466446'}
                        </span>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOne(member.id)}
                            className="w-4 h-4 rounded-md border-neutral-300 text-[#C4785A] focus:ring-[#C4785A] cursor-pointer"
                          />
                        </div>
                      </div>
                    </ActionNode>
                  );
                })}
              </div>
            )}

            {/* Table Footer */}
            <div className="text-center py-3 text-xs text-neutral-400">
              {displayMembers.length} {terminology.members.toLowerCase()} affichés
            </div>
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
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#C4785A] bg-[#C4785A]/15 px-2 py-0.5 rounded-full">
                          {selectedMember.membershipPlanName || 'Standard Package'}
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
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onEditMember(selectedMember)}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <Edit size={14} className="text-[#C4785A]" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedMember.status === 'Frozen' ? 'Active' : 'Frozen';
                      updateMember(selectedMember.id, { status: next });
                    }}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    {selectedMember.status === 'Frozen' ? (
                      <Unlock size={14} className="text-emerald-500" />
                    ) : (
                      <Lock size={14} className="text-amber-500" />
                    )}
                    <span>{selectedMember.status === 'Frozen' ? 'Unfreeze' : 'Freeze'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMember(selectedMember.id, { remainingSessions: (selectedMember.remainingSessions || 0) + 30 })}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={14} className="text-blue-500" />
                    <span>{currentBusiness.category === 'appointment_service' ? '+Pass' : '+30 Sess'}</span>
                  </button>
                </div>

                {/* Subscription / Package Details Card */}
                <div className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      {currentBusiness.category === 'appointment_service' ? 'Package Plan:' : 'Account Plan:'}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[180px]">
                      {selectedMember.membershipPlanName || 'Standard Package'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Expiration Date:</span>
                    <span className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                      {selectedMember.expirationDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Remaining Days:</span>
                    <span className="font-bold text-[#C4785A] tabular-nums">
                      {calculateDaysRemaining(false, selectedMember.expirationDate)} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      {currentBusiness.category === 'appointment_service' ? 'Included Sessions:' : 'Remaining Sessions:'}
                    </span>
                    <span className="font-bold text-emerald-600 tabular-nums">
                      {selectedMember.remainingSessions || 30} visits
                    </span>
                  </div>
                </div>

                {/* POS Receipt Ledger for Customer or Appointments for Salon */}
                {isPOS ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <Receipt size={12} className="text-[#C4785A]" />
                        <span>POS Orders & Receipts</span>
                      </h4>
                      <span className="text-[10px] font-bold text-neutral-400">
                        {sales.filter((s) => s.memberId === selectedMember.id).length} orders
                      </span>
                    </div>

                    {(() => {
                      const customerSales = sales.filter((s) => s.memberId === selectedMember.id);
                      if (customerSales.length === 0) {
                        return (
                          <div className="p-3 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
                            <p className="text-[11px]">No purchases recorded for this customer yet.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {customerSales.map((sale) => (
                            <div
                              key={sale.id}
                              className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-neutral-900 dark:text-white font-mono truncate">
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
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <Scissors size={12} className="text-[#C4785A]" />
                        <span>Bookings & Treatments</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsBookModalOpen(true)}
                        className="text-[11px] font-bold text-[#C4785A] hover:underline cursor-pointer"
                      >
                        + Book Service
                      </button>
                    </div>

                    {(() => {
                      const clientApts = appointments.filter((a) => a.clientId === selectedMember.id);
                      if (clientApts.length === 0) {
                        return (
                          <div className="p-3 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-neutral-400">
                            <p className="text-[11px]">No treatments booked yet.</p>
                            <button
                              type="button"
                              onClick={() => setIsBookModalOpen(true)}
                              className="mt-1 text-[11px] font-bold text-[#C4785A] cursor-pointer"
                            >
                              Schedule first appointment →
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {clientApts.map((apt) => (
                            <div
                              key={apt.id}
                              className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-neutral-900 dark:text-white truncate">
                                  {apt.serviceName}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                    apt.status === 'InChair'
                                      ? 'bg-amber-500 text-white'
                                      : apt.status === 'Completed'
                                      ? 'bg-emerald-600 text-white'
                                      : apt.status === 'Cancelled'
                                      ? 'bg-neutral-400 text-white'
                                      : 'bg-indigo-600 text-white'
                                  }`}
                                >
                                  {apt.status === 'InChair' ? 'In Chair' : apt.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                                <span>
                                  {apt.date} • {apt.startTime} ({apt.durationMinutes}m)
                                </span>
                                <span className="font-bold text-[#C4785A]">{formatMoney(apt.price)}</span>
                              </div>
                              <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                                <span>Stylist: {apt.staffName}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-2 text-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Contact & Access
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
                      Staff Notes
                    </h4>
                    {saveNoteSuccess && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check size={11} /> Saved
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
                    placeholder="Add private staff notes..."
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-xs focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              {/* Bottom Delete */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete ${selectedMember.fullName}?`)) {
                      deleteMember(selectedMember.id);
                    }
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete {terminology.memberSingle}</span>
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
            {selectedIds.length} {terminology.members.toLowerCase()} selected
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
            Freeze Selected
          </button>
          <button
            type="button"
            onClick={() => {
              selectedIds.forEach((id) => updateMember(id, { status: 'Active' }));
              setSelectedIds([]);
            }}
            className="hover:text-emerald-400 cursor-pointer font-medium"
          >
            Activate Selected
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="hover:text-[#C4785A] cursor-pointer font-medium"
          >
            Export Selected
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
