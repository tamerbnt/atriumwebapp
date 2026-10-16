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
      className={`p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[130px] transition-all duration-200 hover:border-[#D5DFE3] dark:hover:border-neutral-600 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-[#64748B] dark:text-neutral-400">
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
        <div className="text-2xl font-black tracking-tight tabular-nums text-neutral-900 dark:text-white">
          {value}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {trend && trendValue && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                trend === 'up'
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
              }`}
            >
              {trend === 'up' ? '↗' : '↘'} {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
