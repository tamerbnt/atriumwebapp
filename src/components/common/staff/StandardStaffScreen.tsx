import React from 'react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { ScreenPod } from '../../ui/kinetic';
import { StaffHeaderTray } from './StaffHeaderTray';
import { StaffActionToolbar } from './StaffActionToolbar';
import { QuickPointageModal } from './QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../StaffInspectorDrawer';
import { StaffMember, BusinessCategory } from '../../../types/index';
import { useStaffFoundation } from './useStaffFoundation';

export interface StandardStaffScreenProps {
  foundation: ReturnType<typeof useStaffFoundation>;
  category: BusinessCategory | string;
  columns: ColumnDefinition<StaffMember>[];
  categoryTitle: string;
  headerTitle?: string;
  headerIcon?: React.ReactNode;
  newStaffButtonLabel: string;
}

export const StandardStaffScreen: React.FC<StandardStaffScreenProps> = React.memo(({
  foundation,
  category,
  columns,
  categoryTitle,
  headerTitle,
  headerIcon,
  newStaffButtonLabel,
}) => {
  const { isAr, isEn, language } = foundation;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 relative">
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
        headerTitle={headerTitle || (isAr ? 'الفريق والموارد' : isEn ? 'Team & Staff' : 'Équipe')}
        headerIcon={headerIcon}
        onOpenCreate={foundation.handleOpenCreate}
        canCreate={foundation.canCreate}
        newStaffButtonLabel={newStaffButtonLabel}
        statusFilter={foundation.statusFilter}
        onStatusFilterChange={foundation.setStatusFilter}
      />

      <ScreenPod>
        <StaffActionToolbar
          title={categoryTitle}
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
          newStaffButtonLabel={newStaffButtonLabel}
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
        currentCategory={category}
      />

      <StaffModal
        isOpen={foundation.isModalOpen}
        onClose={foundation.handleCloseModal}
        staffToEdit={foundation.staffToEdit}
        currentCategory={category}
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
});

StandardStaffScreen.displayName = 'StandardStaffScreen';
