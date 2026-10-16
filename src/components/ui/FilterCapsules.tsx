import React from 'react';

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
  return (
    <div
      className={`inline-flex items-center p-0.5 gap-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-x-auto max-w-full ${className}`}
    >
      {options.map((option) => {
        const isActive = activeKey === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            style={{
              backgroundColor: isActive ? '#FCEEE8' : 'transparent',
              color: isActive ? 'var(--color-accent)' : '#71717A',
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                style={{
                  backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                  color: isActive ? '#FFFFFF' : 'var(--color-text-tertiary)',
                }}
                className="px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums"
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
