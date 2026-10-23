import React from 'react';
import { Users, RotateCcw, Plus } from 'lucide-react';

interface CollectionEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
}

export const CollectionEmptyState: React.FC<CollectionEmptyStateProps> = ({
  title = 'No records found',
  description = 'Try adjusting your search query, status filters, or clear active parameters.',
  icon,
  primaryActionLabel = 'Add New',
  onPrimaryAction,
  onResetFilters,
  hasActiveFilters = false,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center p-12 text-center overflow-hidden min-h-[380px]">
      {/* 160px low opacity accent glow circle */}
      <div
        className="absolute w-40 h-40 rounded-full pointer-events-none -z-0"
        style={{
          background: 'radial-gradient(circle, rgba(196,120,90,0.12) 0%, rgba(196,120,90,0) 70%)',
        }}
      />

      {/* 68x68px rounded icon container */}
      <div className="relative z-10 w-[68px] h-[68px] rounded-[34px] bg-[#C4785A]/15 flex items-center justify-center mb-4 text-[#C4785A] shadow-inner">
        {icon || <Users className="w-8 h-8" />}
      </div>

      {/* Primary title text */}
      <h3 className="relative z-10 text-[20px] font-semibold text-neutral-900 dark:text-neutral-50 mb-1.5 tracking-tight">
        {title}
      </h3>

      {/* Description text */}
      <p className="relative z-10 text-[14px] text-neutral-500 dark:text-neutral-400 max-w-[320px] mb-6 leading-relaxed">
        {description}
      </p>

      {/* Action buttons row */}
      <div className="relative z-10 flex items-center gap-3">
        {onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white font-medium text-[13px] shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{primaryActionLabel}</span>
          </button>
        )}

        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium text-[13px] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
