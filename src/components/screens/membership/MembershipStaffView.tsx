import React, { useMemo } from 'react';
import {
  Users,
  Clock,
  DollarSign,
  History,
  MapPin,
} from 'lucide-react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StaffHeaderTray } from '../../common/staff/StaffHeaderTray';
import { StaffActionToolbar } from '../../common/staff/StaffActionToolbar';
import { QuickPointageModal } from '../../common/staff/QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../../common/StaffInspectorDrawer';
import { StaffMember } from '../../../types/index';
import { useAtriumStore } from '../../../services/store';
import { StaffAttendanceSubView } from '../../common/staff/StaffAttendanceSubView';
import { StaffPayrollSubView } from '../../common/staff/StaffPayrollSubView';
import { StaffHistorySubView } from '../../common/staff/StaffHistorySubView';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { ScreenPod, buildBranchesByIdMap, resolveRecordBranch } from '../../ui/kinetic';

export const MembershipStaffView: React.FC<any> = () => {
  const foundation = useStaffFoundation({ category: 'membership_session' });
  const { isAr, isEn, language } = foundation;
  const currentBranch = useAtriumStore((s) => s.currentBranch);
  const branchesById = useMemo(() => buildBranchesByIdMap(foundation.branches), [foundation.branches]);

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'المدرب / الموظف' : isEn ? 'Coach / Staff' : 'Coach & Collaborateur',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#d4522f]/15 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white text-xs truncate">
              {member.fullName}
            </div>
            <div className="text-[11px] text-black/62 dark:text-white/65 truncate flex items-center gap-1.5">
              <span>{member.role}</span>
              {member.chairOrStudio && (
                <>
                  <span>·</span>
                  <span className="text-[#d4522f] font-medium">{member.chairOrStudio}</span>
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
            <span className="text-xs font-medium text-black dark:text-white">
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
        <span className="font-mono text-xs text-black/70 dark:text-white/75">
          {member.badgeToken || member.cardId || '—'}
        </span>
      ),
    },
    {
      id: 'phoneNumber',
      header: isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      accessorKey: 'phoneNumber',
      cell: (member) => (
        <span className="text-xs text-black/70 dark:text-white/75 tabular-nums font-mono">
          {member.phoneNumber || '—'}
        </span>
      ),
    },
    {
      id: 'contractType',
      header: isAr ? 'نوع العقد' : isEn ? 'Contract' : 'Contrat',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="text-xs font-bold text-black/70 dark:text-white/75">
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
          <div className="flex items-center gap-1 text-xs text-black/75 dark:text-white/75 truncate">
            <MapPin size={12} className="text-[#d4522f] shrink-0" />
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
        <span className="text-xs font-bold font-mono tabular-nums text-[#d4522f]">
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
            data={foundation.filteredStaff}
            columns={columns}
            keyExtractor={(item) => item.id}
            viewMode={foundation.viewMode}
            hideToolbar
            openItemId={foundation.isDrawerOpen ? foundation.drawerStaff?.id ?? null : null}
            selectedIds={foundation.selectedStaffIds}
            onSelectionChange={foundation.setSelectedStaffIds}
            pinnedIds={foundation.pinnedStaffIds}
            onPinToggle={(id: any) => {
              const key = typeof id === 'string' ? id : id?.id;
              const next = new Set(foundation.pinnedStaffIds);
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
            onGeneratePayroll={(month, year) =>
              foundation.generateStaffPayrollRun(month, year, 'membership_session')
            }
            onApprovePayroll={foundation.approveStaffPayrollRun}
            onMarkSlipPaid={foundation.markStaffPayrollSlipPaid}
            onCreateAdvance={foundation.createStaffSalaryAdvance}
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
