import React from 'react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StaffHeaderTray } from '../../common/staff/StaffHeaderTray';
import { StaffActionToolbar } from '../../common/staff/StaffActionToolbar';
import { QuickPointageModal } from '../../common/staff/QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../../common/StaffInspectorDrawer';
import { StaffMember } from '../../../types/index';
import { Laptop, Briefcase, CheckCircle2 } from 'lucide-react';

export const FreelanceStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'freelance_solo' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'المتعاون / المستقل الشريك' : isEn ? 'Collaborator / Freelancer' : 'Collaborateur & Freelance',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-black dark:text-white text-xs truncate">
              {member.fullName}
            </div>
            <div className="text-[11px] text-black/55 dark:text-white/55 truncate">
              {member.role}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة التفرغ' : isEn ? 'Availability' : 'Disponibilité',
      accessorKey: 'status',
      cell: (member) => (
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              member.status === 'active'
                ? 'bg-emerald-500'
                : member.status === 'on_leave'
                ? 'bg-amber-500'
                : member.status === 'frozen'
                ? 'bg-rose-500'
                : 'bg-neutral-400'
            }`}
          />
          <span className="text-xs font-medium text-black dark:text-white">
            {member.status === 'active'
              ? isAr
                ? 'متاح للمشاريع'
                : isEn
                ? 'Available'
                : 'Disponible'
              : member.status === 'on_leave'
              ? isAr
                ? 'في عطلة'
                : isEn
                ? 'On Break'
                : 'En Pause'
              : member.status === 'frozen'
              ? isAr
                ? 'غير متاح'
                : isEn
                ? 'Unavailable'
                : 'Indisponible'
              : isAr
              ? 'مؤرشف'
              : isEn
              ? 'Archived'
              : 'Archivé'}
          </span>
        </div>
      ),
    },
    {
      id: 'phoneNumber',
      header: isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      accessorKey: 'phoneNumber',
      cell: (member) => (
        <span className="text-xs text-black/70 dark:text-white/75 tabular-nums">
          {member.phoneNumber || '—'}
        </span>
      ),
    },
    {
      id: 'contractType',
      header: isAr ? 'صيغة التعاقد' : isEn ? 'Contract Model' : 'Type Collaboration',
      accessorKey: 'contractType',
      cell: (member) => (
        <span className="text-xs font-medium text-black/70 dark:text-white/75">
          {member.contractType === 'cdi' ? 'Sous-traitance Régulière' : 'Mission Ponctuelle'}
        </span>
      ),
    },
  ];

  return (
    <div className="w-full">
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
        categoryTitle={isAr ? 'شبكة المتعاونين والمستقلين' : isEn ? 'Collaborators & Subcontractors' : 'Collaborateurs & Freelances'}
      />

      <StaffActionToolbar
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
        newStaffButtonLabel={isAr ? 'إضافة متعاون' : isEn ? 'Add Collaborator' : 'Nouveau Collaborateur'}
      />

      <UniversalDataCollection
        data={foundation.filteredStaff}
        columns={columns}
        keyExtractor={(item) => item.id}
        viewMode={foundation.viewMode}
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
        onItemClick={(item) => foundation.handleOpenDrawer(item)}
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

      <StaffInspectorDrawer
        staff={foundation.drawerStaff}
        isOpen={foundation.isDrawerOpen}
        onClose={foundation.handleCloseDrawer}
        onEdit={(member) => {
          foundation.handleCloseDrawer();
          foundation.handleOpenEdit(member);
        }}
        currentCategory="freelance_solo"
      />

      <StaffModal
        isOpen={foundation.isModalOpen}
        onClose={foundation.handleCloseModal}
        staffToEdit={foundation.staffToEdit}
        currentCategory="freelance_solo"
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
