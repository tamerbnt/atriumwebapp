import React from 'react';

export interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subtext?: string;
  sublabel?: string;
  badgeLabel?: string;
  badgeText?: string;
  badgeVariant?: 'green' | 'amber' | 'neutral' | 'red' | 'success' | 'warning' | 'orange';
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  tooltip?: string;
  className?: string;
}

export const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  label,
  value,
  subValue,
  subtext,
  sublabel,
  badgeLabel,
  badgeText,
  badgeVariant = 'green',
  trend,
  trendDirection,
  tooltip,
  className = '',
}) => {
  const normalizedVariant =
    badgeVariant === 'success' ? 'green' :
    badgeVariant === 'warning' || badgeVariant === 'orange' ? 'amber' :
    badgeVariant;

  const badgeColors: Record<string, string> = {
    green: 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
    amber: 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
    neutral: 'bg-[#F3EDE7] dark:bg-white/10 text-black/75 dark:text-white/80',
    red: 'bg-red-50/90 dark:bg-red-950/40 text-red-700 dark:text-red-400',
  };

  const currentBadgeColor = badgeColors[normalizedVariant] || badgeColors.green;
  const displayBadge = badgeText || badgeLabel;
  const displaySubtext = subtext || sublabel || subValue;

  return (
    <div
      title={tooltip}
      data-sq="card"
      data-sq-border="solid"
      className={`relative bg-white dark:bg-neutral-800/90 p-[var(--card-pad,20px)] card-opt border border-[#E6DED6] dark:border-neutral-700/60 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] min-h-[var(--kpi-min-h,168px)] flex flex-col gap-[var(--s3,12px)] ${className}`}
    >
      <div className="flex flex-col gap-[var(--s2,8px)]">
        <div className="flex items-center justify-between gap-[var(--s2,8px)]">
          <span className="t-small text-[var(--text-2)] block truncate">
            {label}
          </span>
          {trend && (
            <span
              className={`t-small font-semibold tabular-nums ${
                trendDirection === 'down'
                  ? 'text-red-700 dark:text-red-400'
                  : trendDirection === 'neutral'
                  ? 'text-[var(--text-2)]'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
        {displayBadge && (
          <div>
            <span
              className={`t-small px-[var(--badge-px,6px)] h-[var(--badge-h,22px)] rounded-full inline-flex items-center ${currentBadgeColor}`}
            >
              {displayBadge}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-[var(--num-unit-gap,6px)] mt-auto">
        <span className="t-kpi-m text-[var(--text-1)] rtl:[font-family:var(--font-ui)] rtl:font-semibold rtl:text-2xl">
          {value}
        </span>
      </div>
      {displaySubtext && (
        <span className="t-cap text-[var(--text-2)] tabular-nums block">
          {displaySubtext}
        </span>
      )}
    </div>
  );
};
