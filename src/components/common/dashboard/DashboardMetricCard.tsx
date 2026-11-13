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
      className={`bg-white dark:bg-neutral-800/90 rounded-[18px] p-4 sm:p-5 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs min-h-[132px] flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[12px] font-medium tracking-[-0.005em] text-black/68 dark:text-white/72 block truncate">
            {label}
          </span>
          {trend && (
            <span
              className={`text-[10.5px] font-semibold font-mono tabular-nums ${
                trendDirection === 'down'
                  ? 'text-red-600 dark:text-red-400'
                  : trendDirection === 'neutral'
                  ? 'text-black/56 dark:text-white/60'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
        {displayBadge && (
          <span
            className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md inline-block mt-1.5 ${currentBadgeColor}`}
          >
            {displayBadge}
          </span>
        )}
      </div>

      <div className="pt-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] lg:text-[32px] leading-[0.95] font-bold tracking-[-0.01em] text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:text-2xl rtl:lg:text-[26px]">
            {value}
          </span>
        </div>
        {displaySubtext && (
          <span className="text-[11.5px] text-black/56 dark:text-white/60 font-medium tabular-nums block mt-1.5">
            {displaySubtext}
          </span>
        )}
      </div>
    </div>
  );
};
