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
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { StaffMember, StaffRole } from '../../types/index';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Seek } from '../ui/Seek';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { formatMoney } from '../../utils/rules';

export const FinanceStaffScreen: React.FC = () => {
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
  } = useAtriumStore();

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
              Staff & Payroll Ledger
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Workforce directory, role authorization ranks, and salary disbursements for {currentBranch?.name || 'Atrium 1'}
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

          {/* Add Staff Button */}
          <button
            type="button"
            onClick={() => setIsAddStaffOpen(true)}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Row 1: Workforce & Compensation Health Banner Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Workforce & Compensation Health
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Active team headcount, monthly salary commitments, and role access privileges
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Active Team Size — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                Active Team Headcount
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ 100% Opérationnel
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
                Monthly Payroll Total
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  Échéance le 28
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(totalMonthlyPayroll)}
            </div>
          </div>

          {/* Tile 3: Dark Obsidian Card */}
          <div className="p-5 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div>
              <span className="text-xs font-medium text-neutral-300">
                Security Ranks Configured
              </span>
              <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                Role-Based Module Permissions
              </div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              {new Set(staff.map((s) => s.role)).size}{' '}
              <span className="text-xs font-normal text-neutral-400">
                profils de sécurité
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Staff Roster Master Table Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              Staff Directory
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
              placeholder="Search staff name, role, email..."
              openWidth={260}
              shutSize={38}
            />

            {/* Role Filter Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Manager', 'Cashier', 'Stylist', 'Staff'] as const).map((r) => {
                const isActive = roleFilter === r;
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
                    {r}
                  </button>
                );
              })}
            </div>

            {/* Export Data Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-full border border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              title="Download CSV payroll roster"
            >
              <Download size={13} />
              <span>Export Payroll</span>
            </button>

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
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* View Mode Display */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200/60 dark:border-neutral-800/80 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider h-11">
                  <th className="px-5">Staff Member</th>
                  <th className="px-4">Role & Security Rank</th>
                  <th className="px-4">Monthly Salary</th>
                  <th className="px-4">Payday of Month</th>
                  <th className="px-4">POS PIN / RFID</th>
                  <th className="px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/60">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-xs text-neutral-400">
                      No staff members match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedStaff(member)}
                      className={`h-16 transition-colors cursor-pointer ${
                        selectedStaff?.id === member.id
                          ? 'bg-[#FCEEE8]/60 dark:bg-neutral-800'
                          : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      {/* Staff Info */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={member.fullName} size={38} />
                          <div>
                            <div className="text-sm font-bold text-neutral-900 dark:text-white">
                              {member.fullName}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {member.email} · {member.phoneNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadge(
                            member.role,
                            member.roleRank
                          )}`}
                        >
                          <span>{member.role}</span>
                          <span className="text-[10px] opacity-70">Rank #{member.roleRank}</span>
                        </span>
                      </td>

                      {/* Salary */}
                      <td className="px-4 py-3 text-sm font-black text-neutral-900 dark:text-white tabular-nums">
                        {formatMoney(member.salary)}
                      </td>

                      {/* Payday */}
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
                        Day {member.paymentDay} of month
                      </td>

                      {/* PIN / RFID */}
                      <td className="px-4 py-3">
                        {member.pinCode && (
                          <span className="text-xs font-mono tracking-widest text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full font-bold">
                            ••••
                          </span>
                        )}
                        {member.cardId && (
                          <span className="text-[11px] font-mono text-neutral-400 ml-2">
                            {member.cardId}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active Staff
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View matching desktop cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((member) => (
              <div
                key={member.id}
                onClick={() => setSelectedStaff(member)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedStaff?.id === member.id
                    ? 'border-[#C4785A] bg-[#FAF9F6] dark:bg-neutral-800/80 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${getRoleBadge(
                      member.role,
                      member.roleRank
                    )}`}
                  >
                    {member.role} (Rank #{member.roleRank})
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Payday {member.paymentDay}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={member.fullName} size={42} />
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {member.fullName}
                    </h3>
                    <p className="text-xs text-neutral-500">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs text-neutral-400 font-medium">Monthly Compensation</span>
                  <span className="text-base font-black text-neutral-900 dark:text-white tabular-nums">
                    {formatMoney(member.salary)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                style={{ backgroundColor: 'var(--color-accent)' }}
                className="w-full h-10 rounded-full text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:opacity-90 shadow-xs"
              >
                Close Personnel File
              </button>
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
            label="Full Name *"
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
              label="Email Address *"
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
              label="Phone Number"
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
              label="Staff Role"
              value={role}
              onChange={(val) => setRole(typeof val === 'string' ? (val as StaffRole) : (val.target?.value || val))}
              options={[
                { value: 'Manager', label: 'Manager (Rank 1)' },
                { value: 'Cashier', label: 'Cashier (Rank 2)' },
                { value: 'Stylist', label: 'Stylist / Practitioner (Rank 3)' },
                { value: 'Technician', label: 'Technician (Rank 3)' },
                { value: 'Waiter', label: 'Waiter (Rank 4)' },
                { value: 'Staff', label: 'General Staff (Rank 7)' },
              ]}
              height={46}
              corner={14}
            />

            <LabelInput
              field="Salary"
              label="Monthly Salary (DZD)"
              type="number"
              value={salary ? String(salary) : ''}
              onChange={(v) => setSalary(Number(v) || 0)}
              width="100%"
              height={46}
              corner={14}
            />

            <LabelInput
              field="Payday"
              label="Payday (1-31)"
              type="number"
              value={paymentDay ? String(paymentDay) : ''}
              onChange={(v) => setPaymentDay(Number(v) || 1)}
              width="100%"
              height={46}
              corner={14}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddStaffOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              className="h-10 px-5 text-xs font-bold text-white rounded-full cursor-pointer hover:opacity-90 shadow-xs"
            >
              Save Staff Member
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
