import React from 'react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { StaffHeaderTray } from '../../common/staff/StaffHeaderTray';
import { StaffActionToolbar } from '../../common/staff/StaffActionToolbar';
import { QuickPointageModal } from '../../common/staff/QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../../common/StaffInspectorDrawer';
import { StaffMember } from '../../../types/index';
import { Wrench, Shield, CheckCircle2 } from 'lucide-react';

export const AutoGarageStaffView: React.FC = () => {
  const foundation = useStaffFoundation({ category: 'auto_garage' });
  const { isAr, isEn, language } = foundation;

  const columns: ColumnDefinition<StaffMember>[] = [
    {
      id: 'fullName',
      header: isAr ? 'الميكانيكي / التقني' : isEn ? 'Mechanic / Technician' : 'Mécanicien & Technicien',
      accessorKey: 'fullName',
      sortable: true,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0">
            {member.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900 dark:text-white text-xs truncate">
              {member.fullName}
            </div>
            <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1.5">
              <span>{member.role}</span>
              {member.technicalSpecialty && (
                <>
                  <span>·</span>
                  <span className="text-[#d4522f] font-medium">{member.technicalSpecialty}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: isAr ? 'حالة الورشة' : isEn ? 'Bay Status' : 'Statut Atelier',
      accessorKey: 'status',
      cell: (member) => {
        const isPresent =
          member.isClockedInToday ||
          member.attendanceLogs?.some(
            (l) => (l.timestamp || '').slice(0, 10) === new Date().toISOString().slice(0, 10) && l.type === 'in'
          );
        return (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                member.status === 'active'
                  ? isPresent
                    ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950'
                    : 'bg-emerald-500'
                  : member.status === 'on_leave'
                  ? 'bg-amber-500'
                  : member.status === 'frozen'
                  ? 'bg-rose-500'
                  : 'bg-neutral-400'
              }`}
            />
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {member.status === 'active'
                ? isPresent
                  ? isAr
                    ? 'على الجسر (نشط)'
                    : isEn
                    ? 'At Bay (Working)'
                    : 'En Baie / Intervention'
                  : isAr
                  ? 'نشط'
                  : isEn
                  ? 'Active'
                  : 'En Poste'
                : member.status === 'on_leave'
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
      id: 'assignedBayId',
      header: isAr ? 'جسر الرفع / الباب' : isEn ? 'Assigned Lift Bay' : 'Pont Élévateur / Baie',
      accessorKey: 'assignedBayId',
      cell: (member) => (
        <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300">
          {member.assignedBayId ? `Pont #${member.assignedBayId}` : isAr ? 'ورشة عامة' : 'Atelier Global'}
        </span>
      ),
    },
    {
      id: 'technicalSpecialty',
      header: isAr ? 'التخصص التقني' : isEn ? 'Technical Specialty' : 'Spécialité Technique',
      accessorKey: 'technicalSpecialty',
      cell: (member) => (
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {member.technicalSpecialty || (isAr ? 'ميكانيك عام' : 'Mécanique Générale')}
        </span>
      ),
    },
    {
      id: 'phoneNumber',
      header: isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone',
      accessorKey: 'phoneNumber',
      cell: (member) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
          {member.phoneNumber || '—'}
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
        categoryTitle={isAr ? 'فريق صيانة السيارات' : isEn ? 'Garage Mechanics & Techs' : 'Mécaniciens & Atelier Auto'}
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
        newStaffButtonLabel={isAr ? 'إضافة تقني / ميكانيكي' : isEn ? 'Add Mechanic' : 'Nouveau Mécanicien'}
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
        currentCategory="auto_garage"
      />

      <StaffModal
        isOpen={foundation.isModalOpen}
        onClose={foundation.handleCloseModal}
        staffToEdit={foundation.staffToEdit}
        currentCategory="auto_garage"
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
