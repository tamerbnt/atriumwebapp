import React from 'react';
import { LiveSegmentedControl } from './live/LiveSegmentedControl';
import { LiveBadge } from './live/LiveBadge';

interface FilterOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface FilterCapsulesProps<T extends string> {
  options: FilterOption<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export function FilterCapsules<T extends string>({
  options,
  activeKey,
  onChange,
  className = '',
}: FilterCapsulesProps<T>) {
  const segmentedOptions = options.map((option) => ({
    value: option.key,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <span>{option.label}</span>
        {typeof option.count === 'number' && (
          <LiveBadge value={option.count} floating={false} max={999} showZero />
        )}
      </span>
    ),
  }));

  return (
    <div className={`inline-flex max-w-full overflow-x-auto ${className}`}>
      <LiveSegmentedControl
        options={segmentedOptions}
        value={activeKey}
        onValueChange={(val) => onChange(val as T)}
        aria-label="Filter"
      />
    </div>
  );
}
