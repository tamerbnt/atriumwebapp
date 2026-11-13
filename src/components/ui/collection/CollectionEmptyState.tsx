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
  title = 'No results',
  description = 'No matching records.',
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
      <div className="relative z-10 w-[68px] h-[68px] rounded-[34px] bg-[#d4522f]/15 flex items-center justify-center mb-4 text-[#d4522f] shadow-inner">
        {icon || <Users className="w-8 h-8" />}
      </div>

      {/* Primary title text */}
      <h3 className="relative z-10 text-xl font-bold text-black dark:text-white mb-1.5 tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">
        {title}
      </h3>

      {/* Description text */}
      <p className="relative z-10 text-[14px] text-black/70 dark:text-white/75 max-w-[320px] mb-6 leading-relaxed">
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
            Reset
          </AtriumButton>
        )}
      </div>
    </div>
  );
};
