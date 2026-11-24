import React from 'react';
import { LiveSelect, SelectOption } from './live/LiveSelect';
import { LiveBadge } from './live/LiveBadge';
import { compactFilterLabel } from '../../utils/filterLexicon';

export interface FilterSelectOption {
  value: string | number;
  label: string;
  tooltip?: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface FilterSelectProps {
  value?: string | number;
  onChange: (val: string) => void;
  options: (FilterSelectOption | string)[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  value: controlledValue,
  onChange,
  options,
  placeholder = 'All',
  label,
  icon,
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      const compact = compactFilterLabel(String(opt));
      return {
        value: String(opt),
        label: compact.label,
        tooltip: compact.tooltip,
      };
    }
    const compact = compactFilterLabel(opt.label, undefined, opt.tooltip);
    return {
      value: String(opt.value),
      tooltip: compact.tooltip,
      label: (
        <span className="inline-flex items-center gap-[var(--s2,8px)]">
          <span>{compact.label}</span>
          {typeof opt.count === 'number' && (
            <LiveBadge value={opt.count} floating={false} max={999} showZero />
          )}
        </span>
      ),
      icon: opt.icon,
      disabled: opt.disabled,
    };
  });

  const handleValueChange = (val: string) => {
    onChange(val);
  };

  return (
    <div className={`inline-flex items-center gap-[var(--icon-text-gap,8px)] ${className}`} title={label || ariaLabel}>
      {icon && <span className="text-[var(--text-2)] dark:text-[var(--text-dark-2)] shrink-0">{icon}</span>}
      {label && (
        <span className="t-label text-[var(--text-2)] dark:text-[var(--text-dark-2)]" title={label}>
          {compactFilterLabel(label).label}:
        </span>
      )}
      <LiveSelect
        options={normalizedOptions}
        value={controlledValue !== undefined ? String(controlledValue) : undefined}
        onValueChange={handleValueChange}
        placeholder={compactFilterLabel(placeholder).label}
        tone="soft"
        size="md"
        disabled={disabled}
        aria-label={ariaLabel || label || placeholder}
      />
    </div>
  );
};

export default FilterSelect;
