import React from 'react';
import { UserPlus, QrCode, LayoutGrid, List } from 'lucide-react';
import { Seek } from '../../ui/Seek';
import { AtriumButton } from '../../ui/AtriumButton';
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
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-[#1C1C1E] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-xs"
        >
          <QrCode size={15} className="text-[#C4785A]" />
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
        <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl text-xs font-medium">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStatusFilterChange(opt.id)}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                statusFilter === opt.id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: List/Grid mode + New Staff Button */}
      <div className="flex items-center gap-2.5 self-end lg:self-auto shrink-0">
        <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-label="List view"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
            }`}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-label="Grid view"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'
            }`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>

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
