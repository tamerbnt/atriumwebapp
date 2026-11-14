import React from 'react';
import { Segmented } from '../../components/Segmented/Segmented';

export interface ChartSegmentedOption {
  id: string;
  label: string;
}

export interface ChartSegmentedProps {
  options: ChartSegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  isRtl?: boolean;
  className?: string;
}

/**
 * Branded Atrium liquid-blob segmented control for chart period & metric toggles.
 * Uses dual-spring SegBody clip-path physics and ink-to-on-accent color mixing.
 */
export const ChartSegmented: React.FC<ChartSegmentedProps> = React.memo(
  ({ options, value, onChange, ariaLabel, className = '' }) => {
    if (options.length === 0) return null;

    return (
      <Segmented
        options={options.map((opt) => ({
          value: opt.id,
          label: opt.label,
        }))}
        value={value}
        onValueChange={onChange}
        size={30}
        aria-label={ariaLabel}
        className={`shrink-0 ${className}`.trim()}
      />
    );
  }
);

ChartSegmented.displayName = 'ChartSegmented';
