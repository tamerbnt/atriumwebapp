import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Shield,
  KeyRound,
  DollarSign,
  UserCheck,
  Search,
  Download,
  LayoutGrid,
  List,
  Maximize2,
  Home,
  ChevronDown,
  Building2,
  X,
  Check,
  Phone,
  Mail,
  Calendar,
  Lock,
  Sparkles,
  Pin,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StaffMember, StaffRole } from '../../../types/index';
import { Avatar } from '../../ui/Avatar';
import { Modal } from '../../ui/Modal';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { formatMoney } from '../../../utils/rules';
import { t } from '../../../utils/i18n';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const MembershipFinanceView: React.FC = () => {
  const {
    staff,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    subscription,
    addStaff,
    language,
    showToast,
    isSyncing,
    networkMode,
    isSyncTimeout,
    retryCloudSync,
  } = useAtriumStore();

  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [pinnedStaffIds, setPinnedStaffIds] = useState<Set<string>>(new Set());
  const [staffSortBy, setStaffSortBy] = useState<string>('name');
  const [staffSortDir, setStaffSortDir] = useState<'asc' | 'desc'>('asc');

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'All' | 'Manager' | 'Cashier' | 'Owner' | 'Staff' | 'Stylist'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<StaffRole>('Staff');
  const [salary, setSalary] = useState(65000);
  const [paymentDay, setPaymentDay] = useState(28);
  const [pinCode, setPinCode] = useState('1122');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const totalMonthlyPayroll = useMemo(() => {
    return staff.reduce((sum, s) => sum + s.salary, 0);
  }, [staff]);

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      if (roleFilter !== 'All') {
        if (roleFilter === 'Staff' && member.role !== 'Staff' && member.role !== 'Technician' && member.role !== 'Waiter' && member.role !== 'Stylist') return false;
        if (roleFilter !== 'Staff' && member.role !== roleFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = member.fullName.toLowerCase().includes(q);
        const matchesEmail = member.email.toLowerCase().includes(q);
        const matchesPhone = member.phoneNumber.includes(q);
        const matchesRole = member.role.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRole) return false;
      }
      return true;
    });
  }, [staff, roleFilter, searchQuery]);

  const getRoleBadge = (role: StaffRole, rank: number) => {
    switch (role) {
      case 'Owner':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200';
      case 'Manager':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200';
      case 'Cashier':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200';
      case 'Stylist':
        return 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200';
    }
  };

  const getRoleAvatarColor = (role: StaffRole): string => {
    switch (role) {
      case 'Owner':
        return '#8B5CF6';
      case 'Manager':
        return '#3B82F6';
      case 'Cashier':
        return '#10B981';
      case 'Stylist':
        return '#EC4899';
      case 'Technician':
        return '#F59E0B';
      default:
        return '#64748B';
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleCopyClipboard = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    if (showToast) {
      showToast({
        type: 'info',
        title: `${label} copied to clipboard`,
        message: text,
      });
    }
  };

  const sortedStaff = useMemo(() => {
    const list = [...filteredStaff];
    list.sort((a, b) => {
      const aPinned = pinnedStaffIds.has(a.id) ? 1 : 0;
      const bPinned = pinnedStaffIds.has(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      let comp = 0;
      if (staffSortBy === 'name') comp = a.fullName.localeCompare(b.fullName);
      else if (staffSortBy === 'role') comp = a.role.localeCompare(b.role);
      else if (staffSortBy === 'phone') comp = (a.phoneNumber || '').localeCompare(b.phoneNumber || '');
      else if (staffSortBy === 'status') comp = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
      return staffSortDir === 'asc' ? comp : -comp;
    });
    return list;
  }, [filteredStaff, pinnedStaffIds, staffSortBy, staffSortDir]);

  const staffColumns: ColumnDefinition<StaffMember>[] = useMemo(() => [
    {
      key: 'name',
      header: language === 'ar' ? 'عضو الفريق' : language === 'fr' ? 'Collaborateur' : 'Team Member',
      width: '2.2*',
      minWidth: '180px',
      sortable: true,
      renderCell: (member) => {
        const isPinnedMember = pinnedStaffIds.has(member.id);
        const avatarBg = getRoleAvatarColor(member.role);
        const initials = getInitials(member.fullName);

        return (
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Sub-col 0: 36x36px Avatar circle */}
            <div
              style={{ backgroundColor: avatarBg }}
              className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-[13px] font-bold shadow-xs select-none"
            >
              {initials}
            </div>

            {/* Sub-col 1: Name + Email button */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {member.fullName}
                </span>
                {isPinnedMember && (
                  <Pin className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B] shrink-0" />
                )}
              </div>

              {/* Email click-to-copy button */}
              {member.email && (
                <button
                  type="button"
                  onClick={(e) => handleCopyClipboard(member.email, 'Email', e)}
                  title="Click to copy email"
                  className="group -ml-0.5 mt-0.5 inline-flex items-center gap-1.5 px-1 py-0.5 rounded text-[11px] text-neutral-400 hover:text-[#C4785A] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer w-fit"
                >
                  <Mail className="w-2.5 h-2.5 shrink-0 text-neutral-400 group-hover:text-[#C4785A]" />
                  <span className="truncate">{member.email}</span>
                </button>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: language === 'ar' ? 'الدور' : language === 'fr' ? 'Rôle' : 'Role',
      width: '1.2*',
      minWidth: '120px',
      sortable: true,
      renderCell: (member) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold border ${getRoleBadge(
            member.role,
            member.roleRank
          )}`}
        >
          <span className="truncate">{member.role}</span>
          <span className="text-[9px] opacity-70">#{member.roleRank}</span>
        </span>
      ),
    },
    {
      key: 'phone',
      header: language === 'ar' ? 'الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone',
      width: '1.2*',
      minWidth: '120px',
      sortable: true,
      renderCell: (member) => {
        if (!member.phoneNumber) {
          return <span className="text-neutral-400 text-[12px]">—</span>;
        }
        return (
          <button
            type="button"
            onClick={(e) => handleCopyClipboard(member.phoneNumber, 'Phone', e)}
            title="Click to copy phone"
            className="group inline-flex items-center gap-1.5 px-1.5 py-1 rounded-[6px] text-[12px] text-neutral-600 dark:text-neutral-300 hover:text-[#C4785A] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Phone className="w-3 h-3 text-neutral-400 group-hover:text-[#C4785A]" />
            <span className="tabular-nums font-mono">{member.phoneNumber}</span>
          </button>
        );
      },
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      width: '1*',
      minWidth: '95px',
      sortable: true,
      renderCell: (member) => {
        const isActive = member.isActive !== false;
        return (
          <div className="flex flex-col">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[10px] text-[11px] font-bold w-fit ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-emerald-500 animate-heartbeat' : 'bg-neutral-400 opacity-60'
                }`}
              />
              <span>{isActive ? 'Active' : 'Inactive'}</span>
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5 ml-0.5">
              {isActive ? 'Active today' : 'Offline'}
            </span>
          </div>
        );
      },
    },
  ], [language, pinnedStaffIds]);

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    try {
      const roleRankMap: Record<StaffRole, number> = {
        Owner: 8,
        Manager: 1,
        Cashier: 2,
        Technician: 3,
        Stylist: 3,
        Waiter: 4,
        Staff: 7,
        AgencyDirector: 20,
        ProjectManager: 21,
        Creative: 22,
      };

      addStaff({
        fullName,
        email,
        phoneNumber,
        role,
        roleRank: roleRankMap[role] || 7,
        isActive: true,
        hireDate: new Date().toISOString().split('T')[0],
        salary: Number(salary),
        paymentDay: Number(paymentDay),
        pinCode,
        allowedModules: ['members', 'shop'],
      });

      setIsAddStaffOpen(false);
      setFullName('');
      setEmail('');
      setPhoneNumber('');
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to add staff member.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Full Name', 'Role', 'Rank', 'Salary (DA)', 'Payday', 'Email', 'Phone', 'Hire Date'];
    const rows = filteredStaff.map((s) => [
      `"${s.fullName}"`,
      `"${s.role}"`,
      `"${s.roleRank}"`,
      `"${s.salary}"`,
      `"Day ${s.paymentDay}"`,
      `"${s.email}"`,
      `"${s.phoneNumber}"`,
      `"${s.hireDate}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-staff-payroll-${new Date().toISOString().split('T')[0]}.csv`);
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

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: staff.length > 0,
  });

  if (showSkeleton && (staff.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode="list"
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Row 0: Top Header matching Desktop App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {t('finance_payroll_title', language)}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {language === 'ar'
                ? `دليل الموظفين، مراتب الصلاحيات وصرف الرواتب لـ ${currentBranch?.name || 'الفرع'}`
                : language === 'fr'
                ? `Annuaire de l'équipe, niveaux d'accès et décaissements des salaires pour ${currentBranch?.name || 'l\'établissement'}`
                : `Workforce directory, role authorization ranks, and salary disbursements for ${currentBranch?.name || 'Atrium 1'}`}
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

          {/* Add Staff Button */}
          <AtriumButton
            type="button"
            variant="primary"
            onClick={() => setIsAddStaffOpen(true)}
            icon={<Plus size={15} strokeWidth={2.5} />}
          >
            <span>{t('finance_add_member_btn', language)}</span>
          </AtriumButton>
        </div>
      </div>

      {/* Row 1: Workforce & Compensation Health Banner Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'فريق العمل والكتلة الشهرية للأجور' : language === 'fr' ? 'Équipe & Masse salariale mensuelle' : 'Workforce & Compensation Health'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar' ? 'عدد الموظفين النشطين، إجمالي الرواتب الشهرية ومستويات الصلاحيات' : language === 'fr' ? 'Effectif actif, engagements salariaux mensuels et privilèges d\'accès' : 'Active team headcount, monthly salary commitments, and role access privileges'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Active Team Size — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {t('finance_active_staff_count', language)}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ 100% {language === 'ar' ? 'تشغيلي' : language === 'fr' ? 'Opérationnel' : 'Operational'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {staff.length}{' '}
              <span className="text-xs font-normal text-neutral-400">
                / {subscription.plan.maxStaff > 100 ? '∞' : subscription.plan.maxStaff} max
              </span>
            </div>
          </div>

          {/* Tile 2: Monthly Payroll — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {t('finance_monthly_payout', language)}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  {language === 'ar' ? 'يوم الصرف: 28' : language === 'fr' ? 'Échéance le 28' : 'Due on 28th'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
              {formatMoney(totalMonthlyPayroll)}
            </div>
          </div>

          {/* Tile 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Security Ranks & Access */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'مستويات الصلاحيات الأمنية' : language === 'fr' ? 'Niveaux de sécurité configurés' : 'Security Ranks Configured'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                {new Set(staff.map((s) => s.role)).size} {language === 'ar' ? 'أدوار' : 'rôles'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {new Set(staff.map((s) => s.role)).size}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>{language === 'ar' ? 'صلاحيات الوحدات بحسب الدور' : language === 'fr' ? 'Droits d\'accès basés sur les rôles' : 'Role-Based Module Permissions'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Staff Roster Master Table Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {t('finance_staff_roster', language)}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {filteredStaff.length}
            </span>
          </div>

          {/* Right Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Seek Kinetic Search Box */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'البحث عن موظف بالاسم، الدور، البريد...' : language === 'fr' ? 'Rechercher un collaborateur par nom, rôle, email...' : 'Search staff name, role, email...'}
              openWidth={260}
              shutSize={38}
            />

            {/* Role Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Manager', 'Cashier', 'Stylist', 'Staff'] as const).map((r) => {
                const isActive = roleFilter === r;
                const label =
                  r === 'All'
                    ? t('member_filter_all', language)
                    : r === 'Manager'
                    ? t('finance_role_manager', language)
                    : r === 'Cashier'
                    ? t('finance_role_cashier', language)
                    : r === 'Stylist'
                    ? t('finance_role_stylist', language)
                    : t('finance_role_staff', language);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
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
              })}
            </div>

          </div>
        </div>

        {/* Universal Collection View Mode (List with 46px Action Strip & Grid with 6-button Corner Fan) */}
        <UniversalDataCollection<StaffMember>
          items={sortedStaff}
          keyExtractor={(s) => s.id}
          defaultViewMode="list"
          columns={staffColumns}
          renderCard={(member) => {
            const avatarBg = getRoleAvatarColor(member.role);
            const initials = getInitials(member.fullName);

            return (
              <div className="flex flex-col items-center justify-center w-full">
                {/* 96x96px Avatar circle with 32px bold initials */}
                <div
                  style={{ backgroundColor: avatarBg }}
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-[32px] font-bold shadow-md mb-4 select-none"
                >
                  {initials}
                </div>

                {/* Full Name */}
                <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white truncate max-w-[210px] mb-2 tracking-tight">
                  {member.fullName}
                </h3>

                {/* Role Badge Pill */}
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-[8px] text-[12px] font-semibold border mb-4 ${getRoleBadge(
                    member.role,
                    member.roleRank
                  )}`}
                >
                  <span>{member.role}</span>
                  <span className="text-[10px] opacity-70">Rank #{member.roleRank}</span>
                </span>

                {/* Monthly compensation */}
                <div className="w-full flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                  <span className="text-neutral-400">Monthly Compensation</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {formatMoney(member.salary)}
                  </span>
                </div>
              </div>
            );
          }}
          onItemClick={(member) => setSelectedStaff(member)}
          onViewDetails={(member) => setSelectedStaff(member)}
          onEdit={(member) => {
            setSelectedStaff(member);
          }}
          onPay={(member) => {
            showToast?.({
              type: 'success',
              title: 'Payroll Transferred',
              message: `Salary of ${formatMoney(member.salary)} prepared for ${member.fullName}`,
            });
          }}
          onToggleStatus={(member) => {
            showToast?.({
              type: 'info',
              title: member.isActive ? 'Staff Frozen' : 'Staff Reactivated',
              message: `${member.fullName} status updated`,
            });
          }}
          onTogglePin={(member) => {
            setPinnedStaffIds((prev) => {
              const next = new Set(prev);
              if (next.has(member.id)) {
                next.delete(member.id);
                showToast?.({
                  type: 'info',
                  title: 'Unpinned',
                  message: `${member.fullName} unpinned from top`,
                });
              } else {
                next.add(member.id);
                showToast?.({
                  type: 'info',
                  title: 'Pinned',
                  message: `${member.fullName} pinned to top`,
                });
              }
              return next;
            });
          }}
          onDelete={(member) => {
            showToast?.({
              type: 'warning',
              title: 'Staff Record Removed',
              message: `${member.fullName} was deleted`,
            });
          }}
          isPinned={(member) => pinnedStaffIds.has(member.id)}
          isActive={(member) => member.isActive !== false}
          selectedIds={selectedStaffIds}
          onSelectionChange={setSelectedStaffIds}
          sortBy={staffSortBy}
          sortDirection={staffSortDir}
          onSortChange={(colKey) => {
            if (staffSortBy === colKey) {
              setStaffSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            } else {
              setStaffSortBy(colKey);
              setStaffSortDir('asc');
            }
          }}
          headerActions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="h-8 px-3 rounded-full border border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
                title="Download CSV payroll roster"
              >
                <Download size={13} />
                <span>
                  {language === 'ar'
                    ? 'تصدير الأجور'
                    : language === 'fr'
                    ? 'Exporter les salaires'
                    : 'Export Payroll'}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
                title="Toggle Fullscreen"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          }
          emptyTitle={
            language === 'ar'
              ? 'لا يوجد موظفون'
              : language === 'fr'
              ? 'Aucun collaborateur'
              : 'No staff members'
          }
          emptyDescription={
            language === 'ar'
              ? 'لم يتم العثور على موظفين يطابقون خيارات البحث الحالية.'
              : language === 'fr'
              ? 'Aucun collaborateur ne correspond aux critères de recherche actuels.'
              : 'No staff members match the current filter or search query.'
          }
          primaryActionLabel={
            language === 'ar'
              ? 'إضافة موظف'
              : language === 'fr'
              ? 'Ajouter un collaborateur'
              : 'Add Staff Member'
          }
          onAddFirstItem={() => setIsAddStaffOpen(true)}
          onResetFilters={() => {
            setSearchQuery('');
            setRoleFilter('All');
          }}
          hasActiveFilters={Boolean(searchQuery || roleFilter !== 'All')}
        />
      </div>

      {/* Desktop Slide-out Inspector Drawer for Staff Member */}
      {selectedStaff && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-[#C4785A]" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                Employee Personnel File
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStaff(null)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Profile Avatar Card */}
            <div className="p-5 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center gap-4">
              <Avatar name={selectedStaff.fullName} size={54} />
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {selectedStaff.fullName}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${getRoleBadge(
                    selectedStaff.role,
                    selectedStaff.roleRank
                  )}`}
                >
                  {selectedStaff.role} · Security Rank #{selectedStaff.roleRank}
                </span>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Contact & Credentials
              </span>
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    {selectedStaff.email}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                    {selectedStaff.phoneNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    Hire Date: <strong className="text-neutral-900 dark:text-white">{selectedStaff.hireDate}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <KeyRound size={14} className="text-[#C4785A]" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    POS PIN:{' '}
                    <span className="font-mono bg-[#C4785A]/10 text-[#C4785A] px-2 py-0.5 rounded-full font-bold">
                      •••• (configured)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Compensation Card */}
            <div className="p-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#E8DFD8] dark:border-neutral-700 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#C4785A]">Monthly Salary</span>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Direct transfer on day {selectedStaff.paymentDay}
                </div>
              </div>
              <span className="text-xl font-black text-[#C4785A] tabular-nums">
                {formatMoney(selectedStaff.salary)}
              </span>
            </div>

            {/* Authorized Modules */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Authorized Workspace Modules
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedStaff.allowedModules.map((mod) => (
                  <span
                    key={mod}
                    className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs border border-neutral-200 dark:border-neutral-700"
                  >
                    ✓ {mod.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <AtriumButton
                type="button"
                variant="primary"
                onClick={() => setSelectedStaff(null)}
                className="w-full justify-center"
              >
                <span>{language === 'ar' ? 'إغلاق الملف الشخصي' : language === 'fr' ? 'Fermer le dossier' : 'Close Personnel File'}</span>
              </AtriumButton>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Add Staff Member"
        subtitle={`Grant workspace access to ${currentBranch?.name || 'Atrium 1'}`}
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {errorNotice && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200">
              {errorNotice}
            </div>
          )}

          <LabelInput
            field="StaffName"
            label={`${t('modal_name', language)} *`}
            required
            value={fullName}
            onChange={setFullName}
            placeholder="e.g. Farida Oulmou"
            width="100%"
            height={46}
            corner={14}
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="StaffEmail"
              label={`${t('modal_email', language)} *`}
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="staff@atrium.dz"
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="StaffPhone"
              label={t('modal_phone', language)}
              type="tel"
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="+213 555 00 11 22"
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <LabelSelect
              field="Role"
              label={language === 'ar' ? 'الدور الوظيفي' : language === 'fr' ? 'Rôle' : 'Staff Role'}
              value={role}
              onChange={(val) => setRole(typeof val === 'string' ? (val as StaffRole) : (val.target?.value || val))}
              options={[
                { value: 'Manager', label: language === 'ar' ? 'مدير (رتبة 1)' : language === 'fr' ? 'Gérant (Rang 1)' : 'Manager (Rank 1)' },
                { value: 'Cashier', label: language === 'ar' ? 'أمين صندوق (رتبة 2)' : language === 'fr' ? 'Caissier (Rang 2)' : 'Cashier (Rank 2)' },
                { value: 'Stylist', label: language === 'ar' ? 'مصفف / ممارس (رتبة 3)' : language === 'fr' ? 'Praticien / Coiffeur (Rang 3)' : 'Stylist / Practitioner (Rank 3)' },
                { value: 'Technician', label: language === 'ar' ? 'تقني (رتبة 3)' : language === 'fr' ? 'Technicien (Rang 3)' : 'Technician (Rank 3)' },
                { value: 'Waiter', label: language === 'ar' ? 'نادل / مقدم خدمة (رتبة 4)' : language === 'fr' ? 'Serveur (Rang 4)' : 'Waiter (Rank 4)' },
                { value: 'Staff', label: language === 'ar' ? 'موظف عام (رتبة 7)' : language === 'fr' ? 'Personnel général (Rang 7)' : 'General Staff (Rank 7)' },
              ]}
              height={46}
              corner={14}
            />

            <LabelInput
              field="Salary"
              label={language === 'ar' ? 'الراتب الشهري (دج)' : language === 'fr' ? 'Salaire mensuel (DZD)' : 'Monthly Salary (DZD)'}
              type="number"
              value={salary ? String(salary) : ''}
              onChange={(v) => setSalary(Number(v) || 0)}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="Payday"
              label={language === 'ar' ? 'يوم الدفع (1-31)' : language === 'fr' ? 'Jour de paie (1-31)' : 'Payday (1-31)'}
              type="number"
              value={paymentDay ? String(paymentDay) : ''}
              onChange={(v) => setPaymentDay(Number(v) || 1)}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <AtriumButton
              type="button"
              variant="ghost"
              onClick={() => setIsAddStaffOpen(false)}
            >
              <span>{language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}</span>
            </AtriumButton>
            <AtriumButton
              type="submit"
              variant="primary"
            >
              <span>{language === 'ar' ? 'حفظ الموظف' : language === 'fr' ? 'Enregistrer le collaborateur' : 'Save Staff Member'}</span>
            </AtriumButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const FinanceStaffScreen = MembershipFinanceView;
