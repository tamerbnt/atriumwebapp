import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  useAtriumActions,
  selectCurrentBranchFromState,
  retryCloudSyncAction,
  showToast,
} from '../../../services/store';
import { StaffMember, StaffLifecycleStatus, BusinessCategory } from '../../../types/index';
import { runUndoBatch } from '../../../services/undoEngine';
import {
  canAccessStaffScreen,
  canViewSensitivePayroll,
  getCategoryPerformanceMetricLabel,
  getEffectiveUserRole,
  canCreateStaff,
} from '../../../utils/staffRules';
import { recordRouteAccessDenied } from '../../../utils/routePermissions';
import {
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export interface UseStaffFoundationOptions {
  category: BusinessCategory | string;
}

export function useStaffFoundation({ category }: UseStaffFoundationOptions) {
  const storeSlice = useAtriumSelector(
    (s) => ({
      allStaff: s.staff,
      branches: s.branches,
      accountId: s.account?.id || null,
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
      currentUser: s.currentUser,
      staffAttendanceLogs: s.staffAttendanceLogs,
      staffSalaryAdvances: s.staffSalaryAdvances,
      staffPayrollRuns: s.staffPayrollRuns,
      staffPayrollSlips: s.staffPayrollSlips,
      language: s.language,
      activePmRole: s.activePmRole,
      activeGarageRole: s.activeGarageRole,
      activeRealEstateRole: s.activeRealEstateRole,
      activeManufacturingRole: s.activeManufacturingRole,
      activeLegalRole: s.activeLegalRole,
      activeLogisticsRole: s.activeLogisticsRole,
      activeContractorRole: s.activeContractorRole,
      activeAgriRole: s.activeAgriRole,
      activeMembershipRole: s.activeMembershipRole,
      activeAppointmentRole: s.activeAppointmentRole,
      activePosRole: s.activePosRole,
      activeEducationRole: s.activeEducationRole,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );

  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);

  const {
    punchStaffAttendance,
    updateStaffMember,
    deleteStaffMember,
    freezeStaffMember,
    vacationStaffMember,
    terminateStaffMember,
    createStaffSalaryAdvance,
    waiveStaffSalaryAdvance,
    generateStaffPayrollRun,
    approveStaffPayrollRun,
    markStaffPayrollSlipPaid,
    logStaffAttendanceManual,
  } = useAtriumActions();

  const {
    allStaff,
    branches,
    accountId,
    currentBusinessId,
    currentBranchId,
    currentUser,
    staffAttendanceLogs,
    staffSalaryAdvances,
    staffPayrollRuns,
    staffPayrollSlips,
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
    isSyncing,
    networkMode,
  } = storeSlice;

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'attendance' | 'payroll' | 'history'>('directory');

  // Strict RBAC Access Check based on Effective Active Role
  const effectiveRole = useMemo(
    () =>
      getEffectiveUserRole(category, {
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
      }),
    [
      category,
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
    ]
  );

  const hasAccess = canAccessStaffScreen(category, effectiveRole);
  const isOwnerViewer = canViewSensitivePayroll(effectiveRole);
  const canCreate = canCreateStaff(category, effectiveRole);
  const metricLabel = useMemo(() => getCategoryPerformanceMetricLabel(category), [category]);

  useEffect(() => {
    if (!hasAccess) {
      void recordRouteAccessDenied({
        attemptedScreen: 'staff',
        category: String(category),
        state: {
          currentUser,
          accountId,
          businessId: currentBusinessId,
          branchId: currentBranchId,
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
        },
      });
    }
  }, [
    hasAccess,
    category,
    currentUser,
    accountId,
    currentBusinessId,
    currentBranchId,
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
  ]);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  // Facility / Branch filtering
  const facilityStaff = useMemo(() => {
    return (allStaff || []).filter((s) => {
      if (s.facilityId && currentBranchId) {
        return s.facilityId === currentBranchId || s.branchId === currentBranchId;
      }
      return true;
    });
  }, [allStaff, currentBranchId]);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StaffLifecycleStatus>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [contractFilter, setContractFilter] = useState<string>('All');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(() => new Set());
  const [pinnedStaffIds, setPinnedStaffIds] = useState<Set<string>>(() => new Set());
  const [sortBy, setSortBy] = useState<string>('fullName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerStaff, setDrawerStaff] = useState<StaffMember | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [isPointageScannerOpen, setIsPointageScannerOpen] = useState(false);

  // Filtered & Sorted Staff
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = facilityStaff.filter((s) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'on_leave') {
          if (s.status !== 'on_leave' && s.status !== 'vacation') return false;
        } else if (s.status !== statusFilter) {
          return false;
        }
      }
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language);
        if (b.id !== branchFilter) return false;
      }
      if (contractFilter !== 'All') {
        const ct = (s.contractType || s.recruitmentType || 'CDI').toLowerCase();
        if (ct !== contractFilter.toLowerCase()) return false;
      }
      if (q) {
        const b = resolveRecordBranch(s, branchesById, currentBranch, language);
        const matchesName = s.fullName?.toLowerCase().includes(q);
        const matchesEmail = s.email?.toLowerCase().includes(q);
        const matchesPhone = s.phoneNumber?.includes(q);
        const matchesRole = s.role?.toLowerCase().includes(q);
        const matchesBranch = b.name.toLowerCase().includes(q);
        const matchesToken =
          s.badgeToken?.toLowerCase().includes(q) || s.cardId?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRole && !matchesBranch && !matchesToken) {
          return false;
        }
      }
      return true;
    });
    if (pinnedStaffIds.size === 0) return list;
    return [...list].sort((a, b) => {
      const aPin = pinnedStaffIds.has(a.id) ? 1 : 0;
      const bPin = pinnedStaffIds.has(b.id) ? 1 : 0;
      return bPin - aPin;
    });
  }, [
    facilityStaff,
    statusFilter,
    branchFilter,
    contractFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
    pinnedStaffIds,
  ]);

  // Aggregate Metrics for Header Pods
  const activeCount = useMemo(
    () => facilityStaff.filter((s) => s.status === 'active').length,
    [facilityStaff]
  );
  const onLeaveCount = useMemo(
    () => facilityStaff.filter((s) => s.status === 'on_leave' || s.status === 'vacation').length,
    [facilityStaff]
  );
  const frozenCount = useMemo(
    () => facilityStaff.filter((s) => s.status === 'frozen').length,
    [facilityStaff]
  );

  const todayPresentCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return facilityStaff.filter(
      (s) =>
        s.isClockedInToday ||
        s.attendanceLogs?.some((l) => (l.timestamp || '').slice(0, 10) === today && l.type === 'in')
    ).length;
  }, [facilityStaff]);

  const presentPercentage =
    facilityStaff.length > 0 ? Math.round((todayPresentCount / facilityStaff.length) * 100) : 0;

  const totalMonthlyPayroll = useMemo(() => {
    return facilityStaff
      .filter((s) => s.status !== 'terminated')
      .reduce((sum, s) => sum + (s.salary || 0), 0);
  }, [facilityStaff]);

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setStaffToEdit(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((member: StaffMember) => {
    setStaffToEdit(member);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setStaffToEdit(null);
  }, []);

  const handleOpenDrawer = useCallback((member: StaffMember, openerEl?: HTMLElement | null) => {
    setDrawerStaff(member);
    if (openerEl !== undefined) setDrawerOpenerEl(openerEl);
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handlePunchPointage = useCallback(
    (staffId: string) => {
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
    },
    [punchStaffAttendance, facilityStaff, isAr, isEn]
  );

  const handleBulkStatusChange = useCallback(
    (status: StaffLifecycleStatus) => {
      if (selectedStaffIds.size === 0) return;
      const count = selectedStaffIds.size;
      const ids = Array.from(selectedStaffIds);
      runUndoBatch(
        {
          vertical: 'staff',
          operationType: 'bulk',
          affectedCount: count,
          businessId: storeSlice.currentBusinessId,
          branchId: storeSlice.currentBranchId,
          toastType: 'success',
          toastTitle: isAr ? 'تحديث الحالة' : isEn ? 'Status Updated' : 'Statut actualisé',
          summary: isAr
            ? `تم تحديث حالة ${count} موظف`
            : isEn
            ? `Status updated for ${count} staff members`
            : `Statut mis à jour pour ${count} collaborateurs`,
        },
        () => {
          ids.forEach((id) => {
            if (status === 'frozen') freezeStaffMember(id);
            else if (status === 'vacation' || status === 'on_leave') vacationStaffMember(id);
            else if (status === 'terminated') terminateStaffMember(id);
            else updateStaffMember(id, { status, isActive: status === 'active' });
          });
        }
      );
      setSelectedStaffIds(new Set());
    },
    [
      selectedStaffIds,
      storeSlice.currentBusinessId,
      storeSlice.currentBranchId,
      freezeStaffMember,
      vacationStaffMember,
      terminateStaffMember,
      updateStaffMember,
      isAr,
      isEn,
    ]
  );

  const handleBulkDelete = useCallback(() => {
    if (selectedStaffIds.size === 0) return;
    const count = selectedStaffIds.size;
    const ids = Array.from(selectedStaffIds);
    runUndoBatch(
      {
        vertical: 'staff',
        operationType: 'bulk',
        affectedCount: count,
        businessId: storeSlice.currentBusinessId,
        branchId: storeSlice.currentBranchId,
        toastType: 'warning',
        toastTitle: isAr ? 'حذف جماعي' : isEn ? 'Bulk Deletion' : 'Suppression groupée',
        summary: isAr
          ? `تم حذف ${count} موظف بنجاح`
          : isEn
          ? `Deleted ${count} staff members`
          : `${count} collaborateurs supprimés avec succès`,
      },
      () => {
        ids.forEach((id) => {
          deleteStaffMember(id);
        });
      }
    );
    setSelectedStaffIds(new Set());
  }, [
    selectedStaffIds,
    storeSlice.currentBusinessId,
    storeSlice.currentBranchId,
    deleteStaffMember,
    isAr,
    isEn,
  ]);

  const handleDeleteStaff = useCallback(
    (member: StaffMember) => {
      deleteStaffMember(member.id);
      if (drawerStaff?.id === member.id) {
        setIsDrawerOpen(false);
      }
      showToast({
        title: isAr ? 'تم الحذف' : isEn ? 'Staff Removed' : 'Collaborateur supprimé',
        message: member.fullName,
        type: 'warning',
      });
    },
    [deleteStaffMember, drawerStaff?.id, isAr, isEn]
  );

  const handleBulkPointage = useCallback(() => {
    if (selectedStaffIds.size === 0) return;
    const count = selectedStaffIds.size;
    const ids = Array.from(selectedStaffIds);
    runUndoBatch(
      {
        vertical: 'staff',
        operationType: 'bulk',
        affectedCount: count,
        businessId: storeSlice.currentBusinessId,
        branchId: storeSlice.currentBranchId,
        toastType: 'success',
        toastTitle: isAr ? 'تسجيل جماعي' : isEn ? 'Bulk Pointage' : 'Pointage groupé',
        summary: isAr
          ? `تم تسجيل الحضور جماعياً لـ ${count} موظف`
          : isEn
          ? `Bulk check-in logged for ${count} staff`
          : `Pointage d'entrée enregistré pour ${count} collaborateurs`,
      },
      () => {
        ids.forEach((id) => {
          punchStaffAttendance(id);
        });
      }
    );
    setSelectedStaffIds(new Set());
  }, [
    selectedStaffIds,
    storeSlice.currentBusinessId,
    storeSlice.currentBranchId,
    punchStaffAttendance,
    isAr,
    isEn,
  ]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setBranchFilter('All');
    setContractFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (filteredStaff.length === 0) {
      showToast(
        isAr ? 'لا يوجد موظفون للتصدير' : isEn ? 'No staff to export' : 'Aucun collaborateur à exporter',
        'info'
      );
      return;
    }
    const branchCol = isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche / Site';
    const headers = [
      'ID',
      isAr ? 'الاسم الكامل' : isEn ? 'Full Name' : 'Nom & Prénom',
      isAr ? 'الدور' : isEn ? 'Role' : 'Poste / Spécialité',
      branchCol,
      isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
      isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      isAr ? 'العقد' : isEn ? 'Contract' : 'Contrat',
      isOwnerViewer ? (isAr ? 'الراتب (دج)' : isEn ? 'Salary (DZD)' : 'Salaire (DZD)') : 'Badge RFID',
    ];
    const rows = filteredStaff.map((s) => {
      const b = resolveRecordBranch(s, branchesById, currentBranch, language);
      return [
        s.id,
        s.fullName,
        s.role || '',
        b.name,
        s.status,
        s.phoneNumber || '',
        s.contractType || s.recruitmentType || 'CDI',
        isOwnerViewer ? s.salary || 0 : s.badgeToken || s.cardId || '',
      ];
    });
    downloadCsvSafe(
      `atrium-staff-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast({
      type: 'success',
      title: isAr ? 'تصدير الفريق' : isEn ? 'Staff Exported' : 'Export collaborateurs',
      message: `${filteredStaff.length} ${isAr ? 'سجل' : isEn ? 'records' : 'collaborateurs'}`,
    });
  }, [filteredStaff, branchesById, currentBranch, language, isOwnerViewer, isAr, isEn]);

  return {
    allStaff,
    branches,
    currentBranch,
    branchesById,
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
    branchFilter,
    setBranchFilter,
    contractFilter,
    setContractFilter,
    isFilterModalOpen,
    setIsFilterModalOpen,
    handleResetFilters,
    handleExportCsv,
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
    drawerOpenerEl,
    handleOpenDrawer,
    handleCloseDrawer,
    handleDeleteStaff,
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
    updateStaffMember,
    isSyncing,
    networkMode,
    retryCloudSync: retryCloudSyncAction,
    isAr,
    isEn,
    language,
  };
}
