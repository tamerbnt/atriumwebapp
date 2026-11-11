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

  const filterOptions: Array<{ id: 'all' | StaffLifecycleStatus; label: string }> = [
    { id: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
    { id: 'active', label: isAr ? 'في الخدمة' : isEn ? 'Active' : 'En Poste' },
    { id: 'on_leave', label: isAr ? 'عطلة' : isEn ? 'On Leave' : 'En Congé' },
    { id: 'frozen', label: isAr ? 'موقوف' : isEn ? 'Suspended' : 'Suspendu' },
    { id: 'terminated', label: isAr ? 'منتهي' : isEn ? 'Terminated' : 'Archivé' },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
      {/* Left: Quick Pointage + Search + Status Filters */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* RFID / PIN Quick Pointage Trigger */}
        <button
          type="button"
          onClick={onOpenPointage}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F3EDE7] dark:bg-[#1C1C1E] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-xs"
        >
          <QrCode size={15} className="text-[#d4522f]" />
          <span>{isAr ? 'مسح البادج / PIN' : isEn ? 'Scan Badge / PIN' : 'Pointer Présence'}</span>
        </button>

        {/* Seek expanding search lens */}
        <div className="w-56 lg:w-64">
          <Seek
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={isAr ? 'بحث بالاسم، الهاتف، البادج...' : isEn ? 'Search staff, phone, token...' : 'Rechercher collaborateur...'}
          />
        </div>

        {/* Status filter capsules */}
        <LiveSegmentedControl
          size="sm"
          options={filterOptions.map((opt) => ({
            value: opt.id,
            label: opt.label,
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
            {newStaffButtonLabel || (isAr ? 'إضافة موظف' : isEn ? 'Add Staff Member' : 'Nouveau Collaborateur')}
          </AtriumButton>
        )}
      </div>
    </div>
  );
};
