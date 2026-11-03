import React from 'react';
import { LiveSegmentedControl } from './live/LiveSegmentedControl';
import { LiveBadge } from './live/LiveBadge';

export interface FilterOption<T extends string = string> {
  key: T;
  label: string;
  count?: number | string;
  disabled?: boolean;
}

export interface FilterCapsulesProps<T extends string = string> {
  options: FilterOption<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  size?: 'sm' | 'md' | number;
  className?: string;
  'aria-label'?: string;
}

export function FilterCapsules<T extends string = string>({
  options,
  activeKey,
  onChange,
  size = 'sm',
  className = '',
  'aria-label': ariaLabel = 'Status Filter',
}: FilterCapsulesProps<T>) {
  const segmentedOptions = options.map((option) => ({
    value: option.key,
    label: option.label,
    count: option.count,
    disabled: option.disabled,
  }));

  return (
    <div className={`inline-flex max-w-full overflow-x-auto ${className}`}>
      <LiveSegmentedControl
        options={segmentedOptions}
        value={activeKey}
        onValueChange={(val) => onChange(val as T)}
        size={size}
        aria-label={ariaLabel}
      />
    </div>
  );
}
