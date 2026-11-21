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
    <div className={`sq-elev-card-hover ${className}`}>
      <div
        data-sq="card"
        data-sq-border="solid"
        className="relative p-[var(--card-pad,20px)] card-opt bg-white dark:bg-[#22201E] hover:bg-[#FCF9F6] dark:hover:bg-[#282523] flex flex-col gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)] transition-colors duration-200"
      >
        <div className="flex items-center justify-between gap-[var(--s3,12px)]">
          <span className="t-small text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
            {label}
          </span>
          <div
            data-sq="tile"
            data-sq-border="none"
            style={{
              backgroundColor: 'var(--color-accent-dim)',
              color: 'var(--brand-text)',
            }}
            className="relative w-[var(--tile,40px)] h-[var(--tile,40px)] flex items-center justify-center shrink-0"
          >
            {icon}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-[var(--s3,12px)]">
          <div className="t-kpi-m text-[var(--text-1)] dark:text-white">
            {value}
          </div>
          {(trendValue || subtitle) && (
            <div className="flex items-center gap-[var(--s2,8px)]">
              {trend && trendValue && (
                <span
                  className={`t-small px-[var(--pill-px,10px)] h-[var(--pill-h,24px)] inline-flex items-center rounded-full ${
                    trend === 'up'
                      ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40'
                      : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40'
                  }`}
                >
                  {trend === 'up' ? '↗' : '↘'} {trendValue}
                </span>
              )}
              {subtitle && (
                <span className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
