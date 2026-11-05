import { useState, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { StaffMember, StaffLifecycleStatus, BusinessCategory } from '../../../types/index';
import {
  canAccessStaffScreen,
  canViewSensitivePayroll,
  getCategoryPerformanceMetricLabel,
  getEffectiveUserRole,
  canCreateStaff,
} from '../../../utils/staffRules';

export interface UseStaffFoundationOptions {
  category: BusinessCategory | string;
}

export function useStaffFoundation({ category }: UseStaffFoundationOptions) {
  const {
    staff: allStaff,
    currentBranchId,
    currentUser,
    punchStaffAttendance,
    updateStaffMember,
    deleteStaffMember,
    freezeStaffMember,
    vacationStaffMember,
    terminateStaffMember,
    staffAttendanceLogs,
    staffSalaryAdvances,
    staffPayrollRuns,
    staffPayrollSlips,
    createStaffSalaryAdvance,
    waiveStaffSalaryAdvance,
    generateStaffPayrollRun,
    approveStaffPayrollRun,
    markStaffPayrollSlipPaid,
    logStaffAttendanceManual,
    showToast,
    language,
    activePmRole,
    activeGarageRole,
    activeRealEstateRole,
    activeManufacturingRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
    activeAgriRole,
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
  } = useAtriumStore();

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'attendance' | 'payroll' | 'history'>('directory');

  // Strict RBAC Access Check based on Effective Active Role
  const effectiveRole = getEffectiveUserRole(category, {
    currentUser,
    activePmRole,
    activeGarageRole,
    activeRealEstateRole,
    activeManufacturingRole,
    activeLegalRole,
    activeLogisticsRole,
    activeContractorRole,
    activeAgriRole,
    activeMembershipRole,
    activeAppointmentRole,
    activePosRole,
    activeEducationRole,
  });

  const hasAccess = canAccessStaffScreen(category, effectiveRole);
  const isOwnerViewer = canViewSensitivePayroll(effectiveRole);
  const canCreate = canCreateStaff(category, effectiveRole);
  const metricLabel = getCategoryPerformanceMetricLabel(category);

  // Facility / Branch filtering
  const facilityStaff = useMemo(() => {
    return allStaff.filter((s) => {
      if (s.facilityId && currentBranchId) {
        return s.facilityId === currentBranchId || s.branchId === currentBranchId;
      }
      return true;
    });
  }, [allStaff, currentBranchId]);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StaffLifecycleStatus>('all');
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [pinnedStaffIds, setPinnedStaffIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('fullName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerStaff, setDrawerStaff] = useState<StaffMember | null>(null);
  const [isPointageScannerOpen, setIsPointageScannerOpen] = useState(false);

  // Filtered & Sorted Staff
  const filteredStaff = useMemo(() => {
    return facilityStaff.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.fullName?.toLowerCase().includes(q);
        const matchesEmail = s.email?.toLowerCase().includes(q);
        const matchesPhone = s.phoneNumber?.includes(q);
        const matchesRole = s.role?.toLowerCase().includes(q);
        const matchesToken = s.badgeToken?.toLowerCase().includes(q) || s.cardId?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRole && !matchesToken) {
          return false;
        }
      }
      return true;
    });
  }, [facilityStaff, statusFilter, searchQuery]);

  // Aggregate Metrics for Header Pods
  const activeCount = useMemo(() => facilityStaff.filter((s) => s.status === 'active').length, [facilityStaff]);
  const onLeaveCount = useMemo(() => facilityStaff.filter((s) => s.status === 'on_leave' || s.status === 'vacation').length, [facilityStaff]);
  const frozenCount = useMemo(() => facilityStaff.filter((s) => s.status === 'frozen').length, [facilityStaff]);

  const todayPresentCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return facilityStaff.filter((s) => s.isClockedInToday || s.attendanceLogs?.some((l) => (l.timestamp || '').slice(0, 10) === today && l.type === 'in')).length;
  }, [facilityStaff]);

  const presentPercentage = facilityStaff.length > 0 ? Math.round((todayPresentCount / facilityStaff.length) * 100) : 0;

  const totalMonthlyPayroll = useMemo(() => {
    return facilityStaff.filter((s) => s.status !== 'terminated').reduce((sum, s) => sum + (s.salary || 0), 0);
  }, [facilityStaff]);

  // Handlers
  const handleOpenCreate = () => {
    setStaffToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    setStaffToEdit(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setStaffToEdit(null);
  };

  const handleOpenDrawer = (member: StaffMember) => {
    setDrawerStaff(member);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerStaff(null);
  };

  const handlePunchPointage = (staffId: string) => {
    punchStaffAttendance(staffId);
    const member = facilityStaff.find((s) => s.id === staffId);
    showToast({
      title: isAr ? 'تسجيل الحضور' : isEn ? 'Attendance Pointage' : 'Pointage Présence',
      message: isAr
        ? `تم تحديث الحضور لـ ${member?.fullName || ''}`
        : isEn
        ? `Attendance updated for ${member?.fullName || ''}`
        : `Pointage enregistré pour ${member?.fullName || ''}`,
      type: 'success',
    });
  };

  const handleBulkStatusChange = (status: StaffLifecycleStatus) => {
    if (selectedStaffIds.size === 0) return;
    selectedStaffIds.forEach((id) => {
      if (status === 'frozen') freezeStaffMember(id);
      else if (status === 'vacation' || status === 'on_leave') vacationStaffMember(id);
      else if (status === 'terminated') terminateStaffMember(id);
      else updateStaffMember(id, { status, isActive: status === 'active' });
    });
    setSelectedStaffIds(new Set());
    showToast({
      title: isAr ? 'تحديث الحالة' : isEn ? 'Status Updated' : 'Statut actualisé',
      message: isAr
        ? `تم تحديث حالة ${selectedStaffIds.size} موظف`
        : isEn
        ? `Status updated for ${selectedStaffIds.size} staff members`
        : `Statut mis à jour pour ${selectedStaffIds.size} collaborateurs`,
      type: 'success',
    });
  };

  const handleBulkDelete = () => {
    if (selectedStaffIds.size === 0) return;
    const count = selectedStaffIds.size;
    selectedStaffIds.forEach((id) => {
      deleteStaffMember(id);
    });
    setSelectedStaffIds(new Set());
    showToast({
      title: isAr ? 'حذف جماعي' : isEn ? 'Bulk Deletion' : 'Suppression groupée',
      message: isAr
        ? `تم حذف ${count} موظف بنجاح`
        : isEn
        ? `Deleted ${count} staff members`
        : `${count} collaborateurs supprimés avec succès`,
      type: 'warning',
    });
  };

  const handleBulkPointage = () => {
    if (selectedStaffIds.size === 0) return;
    selectedStaffIds.forEach((id) => {
      punchStaffAttendance(id);
    });
    const count = selectedStaffIds.size;
    setSelectedStaffIds(new Set());
    showToast({
      title: isAr ? 'تسجيل جماعي' : isEn ? 'Bulk Pointage' : 'Pointage groupé',
      message: isAr
        ? `تم تسجيل الحضور جماعياً لـ ${count} موظف`
        : isEn
        ? `Bulk check-in logged for ${count} staff`
        : `Pointage d'entrée enregistré pour ${count} collaborateurs`,
      type: 'success',
    });
  };

  return {
    allStaff,
    facilityStaff,
    filteredStaff,
    effectiveRole,
    hasAccess,
    isOwnerViewer,
    canCreate,
    metricLabel,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedStaffIds,
    setSelectedStaffIds,
    pinnedStaffIds,
    setPinnedStaffIds,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    viewMode,
    setViewMode,
    activeCount,
    onLeaveCount,
    frozenCount,
    todayPresentCount,
    presentPercentage,
    totalMonthlyPayroll,
    isModalOpen,
    staffToEdit,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    isDrawerOpen,
    drawerStaff,
    handleOpenDrawer,
    handleCloseDrawer,
    isPointageScannerOpen,
    setIsPointageScannerOpen,
    handlePunchPointage,
    handleBulkStatusChange,
    handleBulkDelete,
    handleBulkPointage,
    activeSubTab,
    setActiveSubTab,
    staffAttendanceLogs,
    staffSalaryAdvances,
    staffPayrollRuns,
    staffPayrollSlips,
    createStaffSalaryAdvance,
    waiveStaffSalaryAdvance,
    generateStaffPayrollRun,
    approveStaffPayrollRun,
    markStaffPayrollSlipPaid,
    logStaffAttendanceManual,
    isAr,
    isEn,
    language,
  };
}
