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
    green: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    neutral: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300',
    red: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  };

  const currentBadgeColor = badgeColors[normalizedVariant] || badgeColors.green;
  const displayBadge = badgeText || badgeLabel;
  const displaySubtext = subtext || sublabel || subValue;

  return (
    <div
      title={tooltip}
      className={`bg-white dark:bg-neutral-800 rounded-[18px] p-4 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs min-h-[124px] flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 block truncate">
            {label}
          </span>
          {trend && (
            <span
              className={`text-[10px] font-bold font-mono ${
                trendDirection === 'down'
                  ? 'text-red-500'
                  : trendDirection === 'neutral'
                  ? 'text-neutral-400'
                  : 'text-emerald-600'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
        {displayBadge && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${currentBadgeColor}`}
          >
            {displayBadge}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl lg:text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
            {value}
          </span>
        </div>
        {displaySubtext && (
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-semibold font-mono block mt-0.5">
            {displaySubtext}
          </span>
        )}
      </div>
    </div>
  );
};
