import React from 'react';
import { LiveSelect, SelectOption } from './live/LiveSelect';
import { LiveBadge } from './live/LiveBadge';

export interface FilterSelectOption {
  value: string | number;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface FilterSelectProps {
  value?: string | number;
  onChange: (val: any) => void;
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
      return {
        value: String(opt),
        label: String(opt),
      };
    }
    return {
      value: String(opt.value),
      label: (
        <span className="inline-flex items-center gap-1.5">
          <span>{opt.label}</span>
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
    // Preserve backwards-compatible hybrid string/event object for legacy callers
    const hybrid: any = new String(val);
    hybrid.target = { value: val };
    hybrid.currentTarget = { value: val };
    hybrid.value = val;
    hybrid.valueOf = () => val;
    hybrid.toString = () => String(val);
    onChange(hybrid);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {icon && <span className="text-neutral-400 shrink-0">{icon}</span>}
      {label && <span className="text-neutral-400 text-xs font-normal">{label}:</span>}
      <LiveSelect
        options={normalizedOptions}
        value={controlledValue !== undefined ? String(controlledValue) : undefined}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        tone="soft"
        size="md"
        disabled={disabled}
        aria-label={ariaLabel || label || placeholder}
      />
    </div>
  );
};

export default FilterSelect;
