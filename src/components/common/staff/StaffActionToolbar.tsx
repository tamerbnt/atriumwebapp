import React from 'react';
import { UserPlus, QrCode, LayoutGrid, List } from 'lucide-react';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { StaffLifecycleStatus } from '../../../types/index';

interface StaffActionToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | StaffLifecycleStatus;
  onStatusFilterChange: (status: 'all' | StaffLifecycleStatus) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onOpenCreate: () => void;
  onOpenPointage: () => void;
  canCreate: boolean;
  language: string;
  newStaffButtonLabel?: string;
}

export const StaffActionToolbar: React.FC<StaffActionToolbarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onOpenCreate,
  onOpenPointage,
  canCreate,
  language,
  newStaffButtonLabel,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const filterOptions: Array<{ id: 'all' | StaffLifecycleStatus; label: string; tooltip: string }> = [
    {
      id: 'all',
      label: isAr ? 'الكل' : isEn ? 'All' : 'Tous',
      tooltip: isAr ? 'جميع أفراد الطاقم' : isEn ? 'All staff members' : 'Tous les collaborateurs',
    },
    {
      id: 'active',
      label: isAr ? 'نشط' : isEn ? 'Active' : 'Actifs',
      tooltip: isAr ? 'الموظفون في الخدمة حالياً' : isEn ? 'Currently active staff' : 'Collaborateurs en poste',
    },
    {
      id: 'on_leave',
      label: isAr ? 'عطلة' : isEn ? 'Leave' : 'Congé',
      tooltip: isAr ? 'الموظفون في عطلة' : isEn ? 'Staff on leave' : 'Collaborateurs en congé',
    },
    {
      id: 'frozen',
      label: isAr ? 'موقوف' : isEn ? 'Paused' : 'Suspendu',
      tooltip: isAr ? 'الحسابات الموقوفة مؤقتاً' : isEn ? 'Temporarily suspended' : 'Temporairement suspendus',
    },
    {
      id: 'terminated',
      label: isAr ? 'منتهي' : isEn ? 'Ended' : 'Archivé',
      tooltip: isAr ? 'عقود العمل المنتهية' : isEn ? 'Terminated or archived' : 'Fin de contrat / Archivés',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
      {/* Left: Quick Pointage + Search + Status Filters */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* RFID / PIN Quick Pointage Trigger */}
        <button
          type="button"
          onClick={onOpenPointage}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-[#1C1C1E] text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-xs"
        >
          <QrCode size={15} className="text-[#d4522f]" />
          <span>{isAr ? 'تسجيل الحضور' : isEn ? 'Clock In' : 'Pointage'}</span>
        </button>

        {/* Seek expanding search lens */}
        <div className="w-56 lg:w-64">
          <Seek
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={isAr ? 'بحث...' : isEn ? 'Search...' : 'Rechercher...'}
          />
        </div>

        {/* Status filter capsules */}
        <LiveSegmentedControl
          size="sm"
          options={filterOptions.map((opt) => ({
            value: opt.id,
            label: opt.label,
            tooltip: opt.tooltip,
          }))}
          value={statusFilter}
          onValueChange={(val) => onStatusFilterChange(val as 'all' | StaffLifecycleStatus)}
          aria-label="Staff Lifecycle Filter"
        />
      </div>

      {/* Right: List/Grid mode + New Staff Button */}
      <div className="flex items-center gap-2.5 self-end lg:self-auto shrink-0">
        <LiveSegmentedControl
          size="sm"
          options={[
            { value: 'list', icon: <List size={14} />, 'aria-label': 'List view' },
            { value: 'grid', icon: <LayoutGrid size={14} />, 'aria-label': 'Grid view' },
          ]}
          value={viewMode}
          onValueChange={(val) => onViewModeChange(val as 'list' | 'grid')}
          aria-label="View Mode"
        />

        {canCreate && (
          <AtriumButton
            variant="primary"
            onClick={onOpenCreate}
            icon={<UserPlus size={16} />}
          >
            {newStaffButtonLabel || (isAr ? 'إضافة موظف' : isEn ? 'Add Staff' : 'Nouveau')}
          </AtriumButton>
        )}
      </div>
    </div>
  );
};
