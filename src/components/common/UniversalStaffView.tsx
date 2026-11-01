import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  QrCode,
  Scan,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Shield,
  CreditCard,
  Lock,
  PauseCircle,
  Plane,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { UniversalDataCollection, ColumnDefinition } from '../ui/collection/UniversalDataCollection';
import { AtriumButton } from '../ui/AtriumButton';
import { StaffModal } from '../modals/StaffModal';
import { StaffInspectorDrawer } from './StaffInspectorDrawer';
import { StaffMember, BusinessCategory } from '../../types/index';
import { useAtriumStore } from '../../services/store';
import {
  canAccessStaffScreen,
  canViewSensitivePayroll,
  getCategoryPerformanceMetricLabel,
} from '../../utils/staffRules';

interface UniversalStaffViewProps {
  currentCategory?: BusinessCategory | string;
}

export const UniversalStaffView: React.FC<UniversalStaffViewProps> = ({
  currentCategory: propCategory,
}) => {
  const {
    staff: allStaff,
    currentBusinessId,
    currentBranchId,
    businesses,
    currentUser,
    punchStaffAttendance,
    language,
  } = useAtriumStore();

  const currentBiz = businesses.find((b) => b.id === currentBusinessId);
  const activeCategory = propCategory || currentBiz?.category || 'membership_session';

  const isAr = language === 'ar';
  const isEn = language === 'en';

  // Strict RBAC Access Check
  const hasAccess = canAccessStaffScreen(activeCategory, currentUser?.role);
  const isOwnerViewer = canViewSensitivePayroll(currentUser?.role);
  const metricLabel = getCategoryPerformanceMetricLabel(activeCategory);

  // Filter staff by current facility / branch
  const facilityStaff = useMemo(() => {
    const list = allStaff.filter((s) => {
      if (s.facilityId && currentBranchId) {
        return s.facilityId === currentBranchId || s.branchId === currentBranchId;
      }
      return true;
    });
    // If facility has no staff yet, fallback to all staff so screen isn't empty in demo
    return list.length > 0 ? list : allStaff;
  }, [allStaff, currentBranchId]);

  // Modal and Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Quick scanner input state
  const [scanInput, setScanInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'vacation' | 'frozen' | 'terminated'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return facilityStaff.filter((s) => {
      // Status filter
      if (statusFilter !== 'all') {
        const sStatus = s.status || (s.isActive ? 'active' : 'frozen');
        if (sStatus !== statusFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesEmail = (s.email || '').toLowerCase().includes(q);
        const matchesPhone = (s.phoneNumber || '').includes(q);
        const matchesRole = (s.role || '').toLowerCase().includes(q);
        const matchesBadge = (s.cardId || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone || matchesRole || matchesBadge;
      }

      return true;
    });
  }, [facilityStaff, statusFilter, searchQuery]);

  // KPI Calculations
  const totalCount = facilityStaff.length;
  const activeCount = facilityStaff.filter((s) => (s.status || 'active') === 'active').length;
  const clockedInTodayCount = facilityStaff.filter((s) => s.isClockedInToday).length;
  const presenceRate = totalCount > 0 ? Math.round((clockedInTodayCount / totalCount) * 100) : 0;
  const totalPayrollDZD = facilityStaff.reduce((acc, s) => acc + (s.salary || 0), 0);

  // Quick Scanner Handle
  const handleQuickScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim()) return;
    const res = punchStaffAttendance(scanInput.trim());
    if (res.success) {
      setScanInput('');
    }
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setIsModalOpen(true);
    setIsDrawerOpen(false);
  };

  const handleRowClick = (s: StaffMember) => {
    setSelectedStaff(s);
    setIsDrawerOpen(true);
  };

  // If user is locked out by RBAC
  if (!hasAccess) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {isAr
            ? 'الوصول مقتصر على الإدارة وصاحب العمل'
            : isEn
            ? 'Workforce Access Restricted'
            : 'Accès Équipe Restreint'}
        </h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          {isAr
            ? 'شاشة إدارة فريق العمل والتعيينات مخصصة حصرياً لمالك المؤسسة أو المسؤولين المفوضين لإدارة الفرق.'
            : isEn
            ? 'The Staff and Workforce Management module is strictly reserved for the Facility Owner and authorized Operational Team Leads.'
            : 'Le module de gestion du personnel et des présences est strictement réservé au Propriétaire ou aux Responsables d\'équipe habilités.'}
        </p>
      </div>
    );
  }

  // Column definitions for UniversalDataCollection
  const columns: ColumnDefinition<StaffMember>[] = [
    {
      key: 'member',
      header: isAr ? 'الموظف' : isEn ? 'Collaborator' : 'Collaborateur',
      width: '2.5*',
      minWidth: '220px',
      renderCell: (s) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-[#C4785A]/10 text-[#C4785A] font-bold text-xs flex items-center justify-center">
              {s.fullName.charAt(0)}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#18181B] ${
                s.isClockedInToday ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
              title={s.isClockedInToday ? 'Présent sur site' : 'Non pointé aujourd\'hui'}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
              {s.fullName}
            </p>
            <p className="text-[11px] text-neutral-400 font-mono truncate">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: isAr ? 'المنصب' : isEn ? 'Role' : 'Rôle & Poste',
      width: '1.8*',
      minWidth: '150px',
      renderCell: (s) => (
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            {s.role}
          </span>
          {s.categoryProperties?.medicalSpecialty || s.categoryProperties?.technicalSpecialty ? (
            <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
              {s.categoryProperties?.medicalSpecialty || s.categoryProperties?.technicalSpecialty}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'presence',
      header: isAr ? 'الحضور اليومي' : isEn ? 'Daily Attendance' : 'Pointage du Jour',
      width: '1.8*',
      minWidth: '160px',
      renderCell: (s) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              punchStaffAttendance(s.id);
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-xs ${
              s.isClockedInToday
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:border-[#C4785A]/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                s.isClockedInToday ? 'bg-emerald-500' : 'bg-neutral-400'
              }`}
            />
            <span>
              {s.isClockedInToday
                ? `${isAr ? 'حاضر' : 'Présent'} (${s.lastClockInTime || '08:00'})`
                : isAr
                ? 'غير مسجل'
                : 'Non pointé'}
            </span>
          </button>
        </div>
      ),
    },
    {
      key: 'performance',
      header: isAr ? metricLabel.labelAr : isEn ? metricLabel.labelEn : metricLabel.labelFr,
      width: '1.6*',
      minWidth: '140px',
      renderCell: (s) => (
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#C4785A]">
              {s.performance?.kpiValue ?? '90%'}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {s.performance?.scorePercentage ?? 85}%
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-[#C4785A] h-full rounded-full"
              style={{ width: `${s.performance?.scorePercentage ?? 85}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: isAr ? 'حالة الحساب' : isEn ? 'Status' : 'État & Contrat',
      width: '1.4*',
      minWidth: '120px',
      renderCell: (s) => {
        const status = s.status || (s.isActive ? 'active' : 'frozen');
        const badgeColors = {
          active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          vacation: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          frozen: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          terminated: 'bg-red-500/10 text-red-500 border-red-500/20',
        }[status] || 'bg-neutral-500/10 text-neutral-500';

        const label = {
          active: isAr ? 'نشط' : isEn ? 'Active' : 'Actif',
          vacation: isAr ? 'عطلة' : isEn ? 'Vacation' : 'Congé',
          frozen: isAr ? 'مجمد' : isEn ? 'Frozen' : 'Gelé',
          terminated: isAr ? 'منتهي' : isEn ? 'Terminated' : 'Arrêté',
        }[status];

        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColors}`}
            >
              {label}
            </span>
            <span className="text-[10px] text-neutral-400 uppercase font-mono">
              {s.recruitmentType || 'CDI'}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#C4785A]" />
            <span>{isAr ? 'فريق العمل' : isEn ? 'Staff' : 'Équipe'}</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {isAr
              ? 'إدارة الموظفين، نقاط الحضور ببطاقات RFID، الرواتب، وتتبع الأداء'
              : isEn
              ? 'Staff directory, RFID attendance check-in, payroll dossier, and performance tracking'
              : 'Annuaire des collaborateurs, pointage quotidien RFID, contrats et indicateurs de performance'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AtriumButton
            onClick={handleOpenCreate}
            className="px-4 py-2.5 text-xs font-semibold shadow-md flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {isAr ? 'إضافة موظف جديد' : isEn ? 'Create Staff' : 'Créer un collaborateur'}
            </span>
          </AtriumButton>
        </div>
      </div>

      {/* 3-KPI Elevated Tray */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Total Staff */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              {isAr ? 'إجمالي الموظفين' : isEn ? 'Total Workforce' : 'Effectif Total'}
            </p>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
              {activeCount} <span className="text-xs font-normal text-neutral-400">/ {totalCount}</span>
            </h3>
            <p className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{activeCount} {isAr ? 'عقود نشطة' : 'collaborateurs actifs'}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Live Presence */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              {isAr ? 'حضور اليوم على الموقع' : isEn ? 'Clocked In Today' : 'Présence sur Site'}
            </p>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
              {clockedInTodayCount} <span className="text-xs font-normal text-neutral-400">({presenceRate}%)</span>
            </h3>
            <p className="text-[11px] text-blue-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل فوري عبر الشارات' : 'Pointages en direct'}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Monthly Payroll / Compensation */}
        <div className="p-4 rounded-3xl bg-[#1F1D1B] text-white border border-neutral-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400">
              {isAr ? 'الكتلة الأجرية الشهرية' : isEn ? 'Monthly Payroll' : 'Masse Salariale Mensuelle'}
            </p>
            <h3 className="text-xl font-bold text-white mt-1">
              {isOwnerViewer ? (
                `${totalPayrollDZD.toLocaleString()} DZD`
              ) : (
                <span className="flex items-center gap-1.5 text-neutral-400 text-sm">
                  <Lock className="w-4 h-4 text-[#C4785A]" />
                  <span>{isAr ? 'بيانات محجوبة' : 'Confidentiel'}</span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1">
              {isOwnerViewer
                ? isAr ? 'تحويلات CCP وبنكية' : 'Virements CCP & Bancaires'
                : isAr ? 'خاص بالإدارة العليا' : 'Réservé à la Direction'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#C4785A]/20 text-[#C4785A] flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Attendance RFID / NFC / QR Scanner Strip */}
      <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {isAr ? 'ماسح الحضور السريع (RFID / NFC / QR / PIN)' : isEn ? 'Quick Scan Clock-In (RFID / NFC / QR)' : 'Scanner Badge & Pointage Rapide'}
            </h4>
            <p className="text-[11px] text-neutral-500">
              {isAr
                ? 'مرر الشارة أو أدخل الرمز لتسجيل الدخول / الخروج فوراً'
                : isEn
                ? 'Scan badge token or enter PIN to instantly toggle clock-in status'
                : 'Scannez le badge ou saisissez le code pour valider l\'arrivée ou le départ'}
            </p>
          </div>
        </div>

        <form onSubmit={handleQuickScan} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scanner badge / PIN / Tél..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-[#C4785A]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-2xl bg-[#C4785A] text-white hover:bg-[#b0674b] transition-colors shrink-0 shadow-xs"
          >
            {isAr ? 'تسجيل' : isEn ? 'Punch' : 'Pointer'}
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
              { id: 'active', label: isAr ? 'نشط' : isEn ? 'Active' : 'Actifs' },
              { id: 'vacation', label: isAr ? 'عطلة' : isEn ? 'Vacation' : 'En congé' },
              { id: 'frozen', label: isAr ? 'مجمد' : isEn ? 'Frozen' : 'Gelés' },
              { id: 'terminated', label: isAr ? 'منتهي' : isEn ? 'Terminated' : 'Arrêtés' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، المنصب، الشارة...' : 'Rechercher par nom, rôle, badge...'}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-2xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-[#C4785A]"
          />
        </div>
      </div>

      {/* Universal Data Collection Table / Grid */}
      <div className="bg-white dark:bg-[#18181B] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <UniversalDataCollection<StaffMember>
          items={filteredStaff}
          columns={columns}
          keyExtractor={(s) => s.id}
          onItemClick={handleRowClick}
          onEdit={handleOpenEdit}
          defaultViewMode="list"
          renderCard={(s) => (
            <div
              onClick={() => handleRowClick(s)}
              className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-[#C4785A]/40 transition-all cursor-pointer bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C4785A]/10 text-[#C4785A] font-bold text-xs flex items-center justify-center">
                    {s.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {s.fullName}
                    </h4>
                    <p className="text-[10px] text-neutral-400">{s.role}</p>
                  </div>
                </div>

                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    s.isClockedInToday ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'
                  }`}
                  title={s.isClockedInToday ? 'Présent' : 'Non pointé'}
                />
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">{metricLabel.labelFr}:</span>
                <span className="font-bold text-[#C4785A]">
                  {s.performance?.kpiValue ?? '90%'}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Staff Creation & Edit Modal */}
      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffToEdit={editingStaff}
        currentCategory={activeCategory}
      />

      {/* Staff Inspector Slide-Over Drawer */}
      <StaffInspectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        staff={selectedStaff}
        onEdit={handleOpenEdit}
        currentCategory={activeCategory}
      />
    </div>
  );
};
