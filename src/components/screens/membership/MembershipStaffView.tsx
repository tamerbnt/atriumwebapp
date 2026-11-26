import React, { useMemo, useCallback } from 'react';
import {
  Users,
  Clock,
  DollarSign,
  History,
  MapPin,
  Fingerprint,
  Edit3,
  Trash2,
  Pin,
} from 'lucide-react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StaffHeaderTray } from '../../common/staff/StaffHeaderTray';
import { StaffActionToolbar } from '../../common/staff/StaffActionToolbar';
import { QuickPointageModal } from '../../common/staff/QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../../common/StaffInspectorDrawer';
import { StaffMember } from '../../../types/index';
import { useAtriumSelector, selectCurrentBranchFromState } from '../../../services/store';
import { StaffAttendanceSubView } from '../../common/staff/StaffAttendanceSubView';
import { StaffPayrollSubView } from '../../common/staff/StaffPayrollSubView';
import { StaffHistorySubView } from '../../common/staff/StaffHistorySubView';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import {
  ScreenPod,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
} from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { AccessRestrictedView } from '../../common/AccessRestrictedView';

export const MembershipStaffView: React.FC<any> = () => {
  const foundation = useStaffFoundation({ category: 'membership_session' });
  const { isAr, isEn, language } = foundation;
  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);
  const branchesById = useMemo(() => buildBranchesByIdMap(foundation.branches), [foundation.branches]);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: foundation.isSyncing || foundation.networkMode === 'force_skeleton',
    hasCachedData: foundation.facilityStaff.length > 0,
  });

  const getRowMeta = useCallback(
    (member: StaffMember): Partial<KineticRowData> => {
      const today = new Date().toISOString().slice(0, 10);
      const isPresent =
        member.isClockedInToday ||
        member.attendanceLogs?.some((l) => (l.timestamp || '').slice(0, 10) === today && l.type === 'in');
      const statusVariant: KineticRowData['statusVariant'] =
        member.status === 'frozen'
          ? 'blocked'
          : member.status === 'on_leave' || member.status === 'vacation'
          ? 'warning'
          : 'active';
      const statusLabel =
        member.status === 'active'
          ? isPresent
            ? isAr ? 'متواجد بالصالة' : isEn ? 'In Gym' : 'Présent en Salle'
            : isAr ? 'نشط' : isEn ? 'Active' : 'En Poste'
          : member.status === 'on_leave' || member.status === 'vacation'
          ? isAr ? 'عطلة' : isEn ? 'On Leave' : 'En Congé'
          : member.status === 'frozen'
          ? isAr ? 'موقوف' : isEn ? 'Suspended' : 'Suspendu'
          : isAr ? 'منتهي' : isEn ? 'Ended' : 'Fin Contrat';
      const branch = resolveRecordBranch(member, branchesById, currentBranch, language);
      return {
        subline: member.chairOrStudio ? `${member.role} · ${member.chairOrStudio}` : member.role,
        categoryLabel: member.contractType || member.recruitmentType || 'CDI',
        statusLabel,
        statusVariant,
        metricPrimary: member.salary ? `${member.salary.toLocaleString()} DZD` : '—',
        metricSecondary: member.badgeToken || member.cardId || branch.name,
        isPinned: foundation.pinnedStaffIds.has(member.id),
        detailCol1: {
          heading: isAr ? 'بيانات الاتصال والفرع' : isEn ? 'Contact & Branch' : 'Contact & Agence',
          primaryText: member.phoneNumber || '—',
          secondaryText: member.email || '—',
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: isAr ? 'المنصب والشارة' : isEn ? 'Role & Access' : 'Poste & Badge',
          primaryText: member.role,
          secondaryText: member.badgeToken || member.cardId || 'RFID Non assigné',
          tertiaryText: member.chairOrStudio || undefined,
        },
        detailCol3: {
          heading: isAr ? 'الراتب والحضور' : isEn ? 'Payroll & Shift' : 'Paie & Présence',
          primaryText: member.salary ? `${member.salary.toLocaleString()} DZD` : 'Non défini',
          secondaryText: `${member.contractType || 'CDI'} · ${isPresent ? (isAr ? 'حاضر اليوم' : 'Pointé auj.') : (isAr ? 'غير موقع' : 'Non pointé')}`,
        },
      };
    },
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const getFanActions = useCallback(
    (member: StaffMember): KineticRowFanAction[] => [
      {
        id: 'punch',
        label: isAr ? 'حضور' : isEn ? 'Punch In' : 'Pointer',
        icon: <Fingerprint className="w-[15px] h-[15px]" />,
        onClick: () => foundation.handlePunchPointage(member.id),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit3 className="w-[15px] h-[15px]" />,
        onClick: () => foundation.handleOpenEdit(member),
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => foundation.handleDeleteStaff(member),
      },
    ],
    [isAr, isEn, foundation]
  );

  const getDetailActions = useCallback(
    (member: StaffMember): KineticDetailAction[] => [
      {
        id: 'punch',
        label: isAr ? 'تسجيل حضور' : isEn ? 'Clock In' : 'Pointer',
        icon: <Fingerprint className="w-3.5 h-3.5 text-[#096b40]" />,
        onClick: () => foundation.handlePunchPointage(member.id),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
        icon: <Edit3 className="w-3.5 h-3.5" />,
        onClick: () => foundation.handleOpenEdit(member),
      },
      {
        id: 'pin',
        label: foundation.pinnedStaffIds.has(member.id)
          ? isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher'
          : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
        icon: <Pin className="w-3.5 h-3.5" />,
        onClick: () => {
          const next = new Set(foundation.pinnedStaffIds);
          if (next.has(member.id)) next.delete(member.id);
          else next.add(member.id);
          foundation.setPinnedStaffIds(next);
        },
      },
    ],
    [isAr, isEn, foundation]
  );

  if (showSkeleton && (foundation.facilityStaff.length === 0 || foundation.networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.3*', minWidth: '110px' },
          { width: '1.3*', minWidth: '110px' },
          { width: '1.3*', minWidth: '110px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        viewMode={foundation.viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={foundation.retryCloudSync || retry}
      />
    );
  }

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'المدرب / الموظف' : isEn ? 'Coach / Staff' : 'Coach & Collaborateur',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold t-small flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white t-small truncate">
              {member.fullName}
            </div>
            <div className="t-cap text-black/62 dark:text-white/65 truncate flex items-center gap-2">
              <span>{member.role}</span>
              {member.chairOrStudio && (
                <>
                  <span>·</span>
                  <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-medium">{member.chairOrStudio}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة العمل' : isEn ? 'Duty Status' : 'Statut Présence',
      accessorKey: 'status',
      cell: (member) => {
        const today = new Date().toISOString().slice(0, 10);
        const isPresent =
          member.isClockedInToday ||
          member.attendanceLogs?.some((l) => (l.timestamp || '').slice(0, 10) === today && l.type === 'in');
        return (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                member.status === 'active'
                  ? isPresent
                    ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950'
                    : 'bg-emerald-500'
                  : member.status === 'on_leave' || member.status === 'vacation'
                  ? 'bg-amber-500'
                  : member.status === 'frozen'
                  ? 'bg-rose-500'
                  : 'bg-[#8A8178]'
              }`}
            />
            <span className="t-small font-medium text-black dark:text-white">
              {member.status === 'active'
                ? isPresent
                  ? isAr
                    ? 'متواجد بالصالة'
                    : isEn
                    ? 'In Gym (Shift On)'
                    : 'Présent en Salle'
                  : isAr
                  ? 'نشط'
                  : isEn
                  ? 'Active'
                  : 'En Poste'
                : member.status === 'on_leave' || member.status === 'vacation'
                ? isAr
                  ? 'عطلة'
                  : isEn
                  ? 'On Leave'
                  : 'En Congé'
                : member.status === 'frozen'
                ? isAr
                  ? 'موقوف'
                  : isEn
                  ? 'Suspended'
                  : 'Suspendu'
                : isAr
                ? 'منتهي'
                : isEn
                ? 'Terminated'
                : 'Fin de Contrat'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'badgeToken',
      header: isAr ? 'رمز البادج RFID' : isEn ? 'RFID Badge' : 'Badge Tourniquet RFID',
      accessorKey: 'badgeToken',
      cell: (member) => (
        <span className="tabular-nums t-cap text-black/70 dark:text-white/75">
          {member.badgeToken || member.cardId || '—'}
        </span>
      ),
    },
    {
      id: 'phoneNumber',
      header: isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      accessorKey: 'phoneNumber',
      cell: (member) => (
        <span className="t-cap text-black/70 dark:text-white/75 tabular-nums">
          {member.phoneNumber || '—'}
        </span>
      ),
    },
    {
      id: 'contractType',
      header: isAr ? 'نوع العقد' : isEn ? 'Contract' : 'Contrat',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="t-small font-semibold text-black/70 dark:text-white/75">
          {member.contractType || member.recruitmentType || 'CDI'}
        </span>
      ),
    },
    {
      id: 'branch',
      key: 'branch',
      header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Agence',
      accessorKey: 'facilityId',
      sortable: true,
      renderCell: (member) => {
        const b = resolveRecordBranch(member, branchesById, currentBranch, language);
        return (
          <div className="flex items-center gap-1 t-cap text-black/75 dark:text-white/75 truncate">
            <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
            <span className="truncate">{b.name}</span>
          </div>
        );
      },
    },
    {
      id: 'salary',
      header: isAr ? 'الراتب القاعدي' : isEn ? 'Base Salary' : 'Salaire de Base',
      accessorKey: 'salary',
      cell: (member) => (
        <span className="t-small font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
          {member.salary ? `${member.salary.toLocaleString()} DZD` : '—'}
        </span>
      ),
    },
  ];

  const categoryTitle = isAr
    ? 'فريق العمل ومؤشرات الحضور'
    : isEn
    ? 'Workforce & Operational Health'
    : 'Effectif & Santé Opérationnelle';
  const newBtnLabel = isAr
    ? 'إضافة مدرب / موظف'
    : isEn
    ? 'Add Coach / Staff'
    : 'Nouveau Collaborateur';

  if (!foundation.hasAccess) {
    return (
      <AccessRestrictedView
        attemptedScreen="staff"
        category="membership_session"
        effectiveRole={foundation.effectiveRole}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      <StaffHeaderTray
        totalStaffCount={foundation.facilityStaff.length}
        activeCount={foundation.activeCount}
        onLeaveCount={foundation.onLeaveCount}
        frozenCount={foundation.frozenCount}
        presentPercentage={foundation.presentPercentage}
        todayPresentCount={foundation.todayPresentCount}
        totalMonthlyPayroll={foundation.totalMonthlyPayroll}
        isOwnerViewer={foundation.isOwnerViewer}
        metricLabel={foundation.metricLabel}
        language={language}
        categoryTitle={categoryTitle}
        headerTitle={isAr ? 'الفريق' : isEn ? 'Staff' : 'Équipe'}
        onOpenCreate={foundation.handleOpenCreate}
        canCreate={foundation.canCreate}
        newStaffButtonLabel={newBtnLabel}
        statusFilter={foundation.statusFilter}
        onStatusFilterChange={foundation.setStatusFilter}
      />

      <div className="flex items-center">
        <LiveSegmentedControl
          value={foundation.activeSubTab}
          onValueChange={(val) => foundation.setActiveSubTab(val as any)}
          size="md"
          options={[
            {
              value: 'directory',
              label: isAr ? 'الفريق' : isEn ? 'Directory' : 'Annuaire',
              tooltip: isAr ? 'دليل الفريق والمدربين' : isEn ? 'Staff Directory' : 'Annuaire & RH',
              icon: <Users size={16} className="mr-1.5" />,
              count: foundation.facilityStaff.length,
            },
            {
              value: 'attendance',
              label: isAr ? 'الحضور' : isEn ? 'Attendance' : 'Pointage',
              tooltip: isAr ? 'الحضور والتوقيع اليومي' : isEn ? 'Attendance & Clock-in' : 'Pointage & Présence',
              icon: <Clock size={16} className="mr-1.5" />,
              count: foundation.todayPresentCount,
            },
            {
              value: 'payroll',
              label: isAr ? 'الرواتب' : isEn ? 'Payroll' : 'Paie',
              tooltip: isAr ? 'الرواتب والأجور وكشوف الأجر' : isEn ? 'Payroll & Slips' : 'Salaires & Paie',
              icon: <DollarSign size={16} className="mr-1.5" />,
            },
            {
              value: 'history',
              label: isAr ? 'الأرشيف' : isEn ? 'History' : 'Historique',
              tooltip: isAr ? 'الأرشيف والسجلات الإدارية' : isEn ? 'History & Audits' : 'Historique & Audit',
              icon: <History size={16} className="mr-1.5" />,
            },
          ]}
        />
      </div>

      {foundation.activeSubTab === 'directory' && (
        <ScreenPod>
          <StaffActionToolbar
            title={
              isAr
                ? 'قائمة فريق العمل والمدربين'
                : isEn
                ? 'Staff & Coaches Directory'
                : 'Liste des collaborateurs'
            }
            searchQuery={foundation.searchQuery}
            onSearchChange={foundation.setSearchQuery}
            statusFilter={foundation.statusFilter}
            onStatusFilterChange={foundation.setStatusFilter}
            viewMode={foundation.viewMode}
            onViewModeChange={foundation.setViewMode}
            onOpenCreate={foundation.handleOpenCreate}
            onOpenPointage={() => foundation.setIsPointageScannerOpen(true)}
            canCreate={foundation.canCreate}
            language={language}
            newStaffButtonLabel={newBtnLabel}
            branchFilter={foundation.branchFilter}
            onBranchFilterChange={foundation.setBranchFilter}
            contractFilter={foundation.contractFilter}
            onContractFilterChange={foundation.setContractFilter}
            branches={foundation.branches}
            isFilterModalOpen={foundation.isFilterModalOpen}
            onToggleFilterModal={() => foundation.setIsFilterModalOpen((p) => !p)}
            onCloseFilterModal={() => foundation.setIsFilterModalOpen(false)}
            onResetFilters={foundation.handleResetFilters}
            onExportCsv={foundation.handleExportCsv}
            totalCount={foundation.facilityStaff.length}
            filteredCount={foundation.filteredStaff.length}
            activeCount={foundation.activeCount}
            onLeaveCount={foundation.onLeaveCount}
            frozenCount={foundation.frozenCount}
          />

          <UniversalDataCollection
            items={foundation.filteredStaff}
            columns={columns}
            getRowMeta={getRowMeta}
            getFanActions={getFanActions}
            getDetailActions={getDetailActions}
            keyExtractor={(item) => item.id}
            viewMode={foundation.viewMode}
            hideToolbar
            openItemId={foundation.isDrawerOpen ? foundation.drawerStaff?.id ?? null : null}
            selectedIds={foundation.selectedStaffIds}
            onSelectionChange={foundation.setSelectedStaffIds}
            pinnedIds={foundation.pinnedStaffIds}
            onPinToggle={(id: any) => {
              const key = typeof id === 'string' ? id : id?.id;
              const next = new Set<string>(foundation.pinnedStaffIds);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              foundation.setPinnedStaffIds(next);
            }}
            onItemClick={(item, openerEl) => foundation.handleOpenDrawer(item, openerEl)}
            onViewDetails={(item, openerEl) => foundation.handleOpenDrawer(item, openerEl)}
            onEdit={(item) => foundation.handleOpenEdit(item)}
            onDelete={foundation.handleDeleteStaff}
            onBulkDelete={foundation.handleBulkDelete}
            bulkCustomActions={[
              {
                id: 'punch_in',
                label: isAr ? 'تسجيل حضور' : isEn ? 'Punch In' : 'Pointer Présents',
                onClick: foundation.handleBulkPointage,
              },
              {
                id: 'on_leave',
                label: isAr ? 'تحويل لعطلة' : isEn ? 'Set On Leave' : 'Mettre en Congé',
                onClick: () => foundation.handleBulkStatusChange('on_leave'),
              },
              {
                id: 'frozen',
                label: isAr ? 'تجميد مؤقت' : isEn ? 'Suspend' : 'Suspendre',
                onClick: () => foundation.handleBulkStatusChange('frozen'),
              },
            ]}
          />
        </ScreenPod>
      )}

      {foundation.activeSubTab === 'attendance' && (
        <ScreenPod>
          <StaffAttendanceSubView
            staffList={foundation.facilityStaff}
            attendanceLogs={foundation.staffAttendanceLogs}
            onOpenKiosk={() => foundation.setIsPointageScannerOpen(true)}
            onPunchStaff={foundation.handlePunchPointage}
            onManualLog={foundation.logStaffAttendanceManual}
            language={language}
          />
        </ScreenPod>
      )}

      {foundation.activeSubTab === 'payroll' && (
        <ScreenPod>
          <StaffPayrollSubView
            staffList={foundation.facilityStaff}
            payrollRuns={foundation.staffPayrollRuns}
            payrollSlips={foundation.staffPayrollSlips}
            salaryAdvances={foundation.staffSalaryAdvances}
            onGeneratePayroll={(month, year, opts) => {
              foundation.generateStaffPayrollRun(month, year, 'membership_session', opts);
            }}
            onApprovePayroll={foundation.approveStaffPayrollRun}
            onMarkSlipPaid={foundation.markStaffPayrollSlipPaid}
            onCreateAdvance={foundation.createStaffSalaryAdvance}
            onWaiveAdvance={foundation.waiveStaffSalaryAdvance}
            effectiveStatutoryRate={foundation.effectiveStatutoryRate}
            businessName={foundation.currentBusiness?.name}
            fiscalProfile={foundation.currentBusinessConfig?.fiscalProfile}
            language={language}
          />
        </ScreenPod>
      )}

      {foundation.activeSubTab === 'history' && (
        <ScreenPod>
          <StaffHistorySubView
            staffList={foundation.facilityStaff}
            payrollRuns={foundation.staffPayrollRuns}
            payrollSlips={foundation.staffPayrollSlips}
            attendanceLogs={foundation.staffAttendanceLogs}
            language={language}
          />
        </ScreenPod>
      )}

      <StaffInspectorDrawer
        staff={foundation.drawerStaff}
        allStaff={foundation.filteredStaff}
        openerElement={foundation.drawerOpenerEl}
        isOpen={foundation.isDrawerOpen}
        onClose={foundation.handleCloseDrawer}
        onSelectStaff={(nextStaff) => foundation.handleOpenDrawer(nextStaff)}
        onEdit={(member) => {
          foundation.handleCloseDrawer();
          foundation.handleOpenEdit(member);
        }}
        currentCategory="membership_session"
      />

      <StaffModal
        isOpen={foundation.isModalOpen}
        onClose={foundation.handleCloseModal}
        staffToEdit={foundation.staffToEdit}
        currentCategory="membership_session"
      />

      <QuickPointageModal
        isOpen={foundation.isPointageScannerOpen}
        onClose={() => foundation.setIsPointageScannerOpen(false)}
        staffList={foundation.facilityStaff}
        onPunch={foundation.handlePunchPointage}
        language={language}
      />
    </div>
  );
};
