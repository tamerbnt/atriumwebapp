import React, { useCallback } from 'react';
import { Clock, Edit, Eye, Trash2, CheckCircle2, Pin } from 'lucide-react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  ScreenPod,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  resolveRecordBranch,
  extractInitials,
  computeInitialsColor,
} from '../../ui/kinetic';
import { StaffHeaderTray } from './StaffHeaderTray';
import { StaffActionToolbar } from './StaffActionToolbar';
import { QuickPointageModal } from './QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../StaffInspectorDrawer';
import { StaffMember, BusinessCategory } from '../../../types/index';
import { useStaffFoundation } from './useStaffFoundation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { formatMoney } from '../../../utils/rules';

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

  const { showSkeleton, isOffline, isTimedOut, retry } = useSkeletonLoading({
    isLoading: foundation.isSyncing || foundation.networkMode === 'force_skeleton',
    hasCachedData: foundation.facilityStaff.length > 0,
  });

  const getStaffStatusMeta = useCallback(
    (status?: string): { label: string; variant: KineticRowData['statusVariant'] } => {
      switch (status) {
        case 'frozen':
          return {
            label: isAr ? 'موقف مؤقتاً' : isEn ? 'Paused' : 'Suspendu',
            variant: 'warning',
          };
        case 'vacation':
        case 'on_leave':
          return {
            label: isAr ? 'في عطلة' : isEn ? 'On Leave' : 'En congé',
            variant: 'info',
          };
        case 'terminated':
          return {
            label: isAr ? 'منتهي' : isEn ? 'Ended' : 'Archivé',
            variant: 'blocked',
          };
        case 'active':
        default:
          return {
            label: isAr ? 'نشط' : isEn ? 'Active' : 'Actif',
            variant: 'active',
          };
      }
    },
    [isAr, isEn]
  );

  const getRowMeta = useCallback(
    (s: StaffMember): Partial<KineticRowData> => {
      const branch = resolveRecordBranch(s, foundation.branchesById, foundation.currentBranch, language);
      const st = getStaffStatusMeta(s.status);
      const contractType = (s.contractType || s.recruitmentType || 'CDI').toUpperCase();
      const score = s.performance?.kpiValue || `${s.performance?.scorePercentage ?? 90}%`;
      const salaryDisplay = foundation.isOwnerViewer
        ? `${formatMoney(s.salary || 0)} DZD`
        : s.badgeToken || s.cardId || contractType;

      return {
        title: s.fullName,
        subline: s.phoneNumber || s.email || s.role,
        avatarText: extractInitials(s.fullName),
        avatarColor: computeInitialsColor(s.fullName),
        categoryLabel: s.role || contractType,
        statusLabel: st.label,
        statusVariant: st.variant,
        metricPrimary: foundation.isOwnerViewer ? `${formatMoney(s.salary || 0)} DZD` : String(score),
        metricSecondary: s.isClockedInToday
          ? isAr
            ? `حاضر · ${s.lastClockInTime || '08:00'}`
            : isEn
            ? `In · ${s.lastClockInTime || '08:00'}`
            : `Pointé · ${s.lastClockInTime || '08:00'}`
          : contractType,
        branchName: branch.name,
        branchCode: branch.code,
        isPinned: foundation.pinnedStaffIds.has(s.id),
        detailCol1: {
          heading: isAr ? 'بيانات الاتصال والوظيفة' : isEn ? 'Contact & Role' : 'Contact & Poste',
          primaryText: s.phoneNumber || '—',
          secondaryText: s.email || s.role || '—',
          tertiaryText: s.badgeToken ? `RFID: ${s.badgeToken}` : branch.name,
        },
        detailCol2: {
          heading: isAr ? 'العقد والراتب' : isEn ? 'Contract & Pay' : 'Contrat & Paie',
          primaryText: `${contractType} · ${salaryDisplay}`,
          secondaryText: s.chairOrStudio
            ? `${isAr ? 'الموقع:' : isEn ? 'Station:' : 'Poste :'} ${s.chairOrStudio}`
            : undefined,
          tertiaryText: s.isClockedInToday
            ? isAr
              ? `حاضر (${s.lastClockInTime || '08:00'})`
              : isEn
              ? `Present (${s.lastClockInTime || '08:00'})`
              : `Présent (${s.lastClockInTime || '08:00'})`
            : isAr
            ? 'غير مسجل اليوم'
            : isEn
            ? 'Not clocked in'
            : "Non pointé aujourd'hui",
        },
        detailCol3: {
          heading: isAr ? 'الأداء والملاحظات' : isEn ? 'Performance & Notes' : 'Performance & Notes',
          primaryText: `${isAr ? 'مؤشر الأداء' : isEn ? 'Score' : 'Score'} · ${score}`,
          secondaryText:
            s.notes ||
            (s.address
              ? s.address
              : isAr
              ? 'سجل نشط متوافق مع البصمة'
              : isEn
              ? 'Active RFID profile'
              : 'Profil collaborateur actif'),
        },
      };
    },
    [foundation.branchesById, foundation.currentBranch, foundation.isOwnerViewer, language, getStaffStatusMeta, isAr, isEn]
  );

  const getFanActions = useCallback(
    (s: StaffMember): KineticRowFanAction[] => {
      const acts: KineticRowFanAction[] = [
        {
          id: 'punch',
          label: isAr ? 'تسجيل الحضور' : isEn ? 'Clock In / Out' : 'Pointer entrée/sortie',
          icon: <Clock className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => foundation.handlePunchPointage(s.id),
        },
      ];
      if (foundation.canCreate) {
        acts.push({
          id: 'edit',
          label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
          icon: <Edit className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => foundation.handleOpenEdit(s),
        });
        acts.push({
          id: 'del',
          label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
          icon: <Trash2 className="w-4 h-4" strokeWidth={1.5} />,
          isDanger: true,
          onClick: () => foundation.handleDeleteStaff(s),
        });
      }
      return acts;
    },
    [foundation, isAr, isEn]
  );

  const getDetailActions = useCallback(
    (s: StaffMember): KineticDetailAction[] => {
      const acts: KineticDetailAction[] = [
        {
          id: 'view',
          label: isAr ? 'عرض الملف' : isEn ? 'Full Profile' : 'Fiche complète',
          icon: <Eye className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => foundation.handleOpenDrawer(s),
        },
        {
          id: 'punch',
          label: s.isClockedInToday
            ? isAr
              ? 'خروج'
              : isEn
              ? 'Clock Out'
              : 'Sortie'
            : isAr
            ? 'دخول'
            : isEn
            ? 'Clock In'
            : 'Pointer',
          icon: <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => foundation.handlePunchPointage(s.id),
        },
        {
          id: 'pin',
          label: foundation.pinnedStaffIds.has(s.id)
            ? isAr ? 'إلغاء التثبيت' : isEn ? 'Unpin' : 'Détacher'
            : isAr ? 'تثبيت' : isEn ? 'Pin' : 'Épingler',
          icon: <Pin className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => {
            const next = new Set(foundation.pinnedStaffIds);
            if (next.has(s.id)) next.delete(s.id);
            else next.add(s.id);
            foundation.setPinnedStaffIds(next);
          },
        },
      ];
      if (foundation.canCreate) {
        acts.push({
          id: 'edit',
          label: isAr ? 'تعديل' : isEn ? 'Edit' : 'Modifier',
          icon: <Edit className="w-4 h-4" strokeWidth={1.5} />,
          onClick: () => foundation.handleOpenEdit(s),
        });
        acts.push({
          id: 'del',
          label: isAr ? 'حذف' : isEn ? 'Delete' : 'Supprimer',
          icon: <Trash2 className="w-4 h-4 text-[#c0283d]" strokeWidth={1.5} />,
          onClick: () => foundation.handleDeleteStaff(s),
        });
      }
      return acts;
    },
    [foundation, isAr, isEn]
  );

  if (showSkeleton && (foundation.facilityStaff.length === 0 || foundation.networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        viewMode={foundation.viewMode}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '140px' },
          { width: '1.5*', minWidth: '110px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={150}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={foundation.retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-[var(--ph-mb,24px)] animate-in fade-in duration-200 relative">
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
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          onItemClick={(item, openerEl) => foundation.handleOpenDrawer(item, openerEl)}
          onViewDetails={(item, openerEl) => foundation.handleOpenDrawer(item, openerEl)}
          onEdit={foundation.canCreate ? (item) => foundation.handleOpenEdit(item) : undefined}
          onDelete={foundation.canCreate ? foundation.handleDeleteStaff : undefined}
          onBulkDelete={foundation.canCreate ? foundation.handleBulkDelete : undefined}
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
