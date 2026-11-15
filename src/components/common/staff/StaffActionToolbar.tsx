import React, { useMemo, useRef } from 'react';
import { QrCode } from 'lucide-react';
import { StaffLifecycleStatus } from '../../../types/index';
import {
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
} from '../../ui/kinetic';

interface StaffActionToolbarProps {
  title?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | StaffLifecycleStatus;
  onStatusFilterChange: (status: 'all' | StaffLifecycleStatus) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onOpenCreate?: () => void;
  onOpenPointage: () => void;
  canCreate?: boolean;
  language: string;
  newStaffButtonLabel?: string;
  branchFilter?: string;
  onBranchFilterChange?: (branchId: string) => void;
  contractFilter?: string;
  onContractFilterChange?: (contract: string) => void;
  branches?: Array<{ id: string; name: string; arabicName?: string }>;
  isFilterModalOpen?: boolean;
  onToggleFilterModal?: () => void;
  onCloseFilterModal?: () => void;
  onResetFilters?: () => void;
  onExportCsv?: () => void | Promise<void>;
  totalCount?: number;
  filteredCount?: number;
  activeCount?: number;
  onLeaveCount?: number;
  frozenCount?: number;
}

export const StaffActionToolbar: React.FC<StaffActionToolbarProps> = React.memo(({
  title,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onOpenPointage,
  language,
  branchFilter = 'All',
  onBranchFilterChange,
  contractFilter = 'All',
  onContractFilterChange,
  branches = [],
  isFilterModalOpen: controlledFilterOpen,
  onToggleFilterModal,
  onCloseFilterModal,
  onResetFilters,
  onExportCsv,
  totalCount = 0,
  filteredCount = 0,
  activeCount,
  onLeaveCount,
  frozenCount,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const [internalFilterOpen, setInternalFilterOpen] = React.useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const isFilterOpen = controlledFilterOpen ?? internalFilterOpen;
  const toggleFilter = onToggleFilterModal || (() => setInternalFilterOpen((p) => !p));
  const closeFilter = onCloseFilterModal || (() => setInternalFilterOpen(false));

  const statusOptions = useMemo(
    () => [
      {
        value: 'all',
        label: isAr ? 'الكل' : isEn ? 'All' : 'Tous',
        tooltip: isAr ? 'جميع أفراد الطاقم' : isEn ? 'All staff members' : 'Tous les collaborateurs',
        count: totalCount || undefined,
      },
      {
        value: 'active',
        label: isAr ? 'نشط' : isEn ? 'Active' : 'Actifs',
        tooltip: isAr ? 'الموظفون في الخدمة حالياً' : isEn ? 'Currently active staff' : 'Collaborateurs en poste',
        count: activeCount,
      },
      {
        value: 'on_leave',
        label: isAr ? 'عطلة' : isEn ? 'Leave' : 'Congé',
        tooltip: isAr ? 'الموظفون في عطلة' : isEn ? 'Staff on leave' : 'Collaborateurs en congé',
        count: onLeaveCount,
      },
      {
        value: 'frozen',
        label: isAr ? 'موقوف' : isEn ? 'Paused' : 'Suspendu',
        tooltip: isAr ? 'الحسابات الموقوفة مؤقتاً' : isEn ? 'Temporarily suspended' : 'Temporairement suspendus',
        count: frozenCount,
      },
    ],
    [isAr, isEn, totalCount, activeCount, onLeaveCount, frozenCount]
  );

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (contractFilter !== 'All' ? 1 : 0) +
    (statusFilter === 'terminated' ? 1 : 0);
  const hasActiveAdvancedFilters = activeFiltersCount > 0;

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      const b = branches.find((br) => br.id === branchFilter);
      const bLabel = (isAr && b?.arabicName) || b?.name || branchFilter;
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع:' : isEn ? 'Branch:' : 'Branche :'} ${bLabel}`,
        onRemove: () => onBranchFilterChange?.('All'),
      });
    }
    if (contractFilter !== 'All') {
      chips.push({
        key: 'contract',
        label: `${isAr ? 'العقد:' : isEn ? 'Contract:' : 'Contrat :'} ${contractFilter}`,
        onRemove: () => onContractFilterChange?.('All'),
      });
    }
    if (statusFilter === 'terminated') {
      chips.push({
        key: 'status',
        label: isAr ? 'منتهي العقد' : isEn ? 'Terminated' : 'Fin de contrat',
        onRemove: () => onStatusFilterChange('all'),
      });
    }
    return chips;
  }, [
    branchFilter,
    branches,
    contractFilter,
    statusFilter,
    isAr,
    isEn,
    onBranchFilterChange,
    onContractFilterChange,
    onStatusFilterChange,
  ]);

  const filterSections = useMemo<KineticFilterSection[]>(() => {
    const sections: KineticFilterSection[] = [
      {
        id: 'status',
        label: isAr ? 'حالة العقد' : isEn ? 'Employment Status' : 'Statut Collaborateur',
        value: statusFilter,
        resetValue: 'all',
        resetLabel: isAr ? 'الكل' : isEn ? 'All' : 'Tous',
        kind: 'segmented',
        onChange: (val) => onStatusFilterChange(val as 'all' | StaffLifecycleStatus),
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'active', label: isAr ? 'نشط' : isEn ? 'Active' : 'Actif' },
          { value: 'on_leave', label: isAr ? 'عطلة' : isEn ? 'Leave' : 'Congé' },
          { value: 'frozen', label: isAr ? 'موقوف' : isEn ? 'Paused' : 'Gelé' },
          { value: 'terminated', label: isAr ? 'منتهي' : isEn ? 'Ended' : 'Archivé' },
        ],
      },
    ];

    if (onContractFilterChange) {
      sections.push({
        id: 'contract',
        label: isAr ? 'نوع العقد' : isEn ? 'Contract Type' : 'Type de Contrat',
        value: contractFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 3,
        onChange: onContractFilterChange,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'CDI', label: 'CDI' },
          { value: 'CDD', label: 'CDD' },
          { value: 'Freelance', label: isAr ? 'حر / متعاون' : isEn ? 'Contractor' : 'Prestataire' },
        ],
      });
    }

    if (onBranchFilterChange && branches.length > 0) {
      sections.push({
        id: 'branch',
        label: isAr ? 'الفرع / الموقع' : isEn ? 'Branch / Facility' : 'Branche / Site',
        value: branchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        onChange: onBranchFilterChange,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches',
          },
          ...branches.map((b) => ({
            value: b.id,
            label: (isAr && b.arabicName) || b.name,
          })),
        ],
      });
    }

    return sections;
  }, [
    isAr,
    isEn,
    statusFilter,
    onStatusFilterChange,
    contractFilter,
    onContractFilterChange,
    branchFilter,
    onBranchFilterChange,
    branches,
  ]);

  const pointageTrigger = (
    <button
      type="button"
      data-no-liquid="true"
      onClick={onOpenPointage}
      className="h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors shadow-2xs bg-white dark:bg-neutral-800 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-[#FBF8F5] dark:hover:bg-neutral-700/50 shrink-0"
      title={isAr ? 'كشك البصمة السريع' : isEn ? 'Quick Attendance Clock-In' : 'Kiosk Pointage RFID / PIN'}
    >
      <QrCode size={15} className="text-[#d4522f]" />
      <span>{isAr ? 'تسجيل الحضور' : isEn ? 'Clock In' : 'Pointage'}</span>
    </button>
  );

  return (
    <>
      <ScreenCollectionToolbar
        title={
          title ||
          (isAr ? 'قائمة فريق العمل' : isEn ? 'Staff Directory' : 'Liste des collaborateurs')
        }
        language={language}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder={
          isAr ? 'بحث بالاسم، الدور، البادج...' : isEn ? 'Search staff, role, badge...' : 'Rechercher collaborateur...'
        }
        statusOptions={statusOptions}
        statusValue={statusFilter}
        onStatusChange={(val) => onStatusFilterChange(val as 'all' | StaffLifecycleStatus)}
        hasActiveAdvancedFilters={hasActiveAdvancedFilters}
        activeFiltersCount={activeFiltersCount}
        isFilterModalOpen={isFilterOpen}
        filterButtonRef={filterButtonRef}
        onToggleFilterModal={toggleFilter}
        viewMode={viewMode}
        onViewModeChange={(m) => onViewModeChange(m === 'grid' ? 'grid' : 'list')}
        onExport={onExportCsv}
        extraTrailingControls={pointageTrigger}
        activeChips={activeChips}
        onResetAllFilters={() => {
          onResetFilters?.();
          onBranchFilterChange?.('All');
          onContractFilterChange?.('All');
          onStatusFilterChange('all');
        }}
      />

      <KineticFilterModal
        isOpen={isFilterOpen}
        onClose={closeFilter}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={filteredCount || totalCount}
        entityPluralLabel={isAr ? 'موظفين' : isEn ? 'staff' : 'collaborateurs'}
        hasActiveFilters={hasActiveAdvancedFilters || statusFilter !== 'all'}
        onResetFilters={() => {
          onResetFilters?.();
          onBranchFilterChange?.('All');
          onContractFilterChange?.('All');
          onStatusFilterChange('all');
        }}
        sections={filterSections}
      />
    </>
  );
});

StaffActionToolbar.displayName = 'StaffActionToolbar';
