import React from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  subtitle?: string;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  icon,
  trend,
  trendValue,
  subtitle,
  className = '',
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-card-bg)',
        border: '1px solid var(--color-card-border)',
        borderRadius: 'var(--radius-card)',
      }}
      className={`p-5 flex flex-col justify-between h-[130px] transition-all duration-200 hover:shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        <div
          style={{
            backgroundColor: 'var(--color-accent-dim)',
            color: 'var(--color-accent)',
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        >
          {icon}
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold tracking-tight tabular-nums text-neutral-900 dark:text-white">
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {trend && trendValue && (
            <span
              className={`text-xs font-medium ${
                trend === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
