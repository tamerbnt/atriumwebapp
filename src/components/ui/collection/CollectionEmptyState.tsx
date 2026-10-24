import React from 'react';
import { Users, RotateCcw, Plus } from 'lucide-react';

import { AtriumButton } from '../AtriumButton';

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
          <AtriumButton
            onClick={onPrimaryAction}
            icon={<Plus className="w-4 h-4" />}
            size="md"
          >
            {primaryActionLabel}
          </AtriumButton>
        )}

        {hasActiveFilters && onResetFilters && (
          <AtriumButton
            variant="secondary"
            onClick={onResetFilters}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            size="md"
          >
            Reset Filters
          </AtriumButton>
        )}
      </div>
    </div>
  );
};
