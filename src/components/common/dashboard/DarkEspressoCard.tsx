import React from 'react';

export interface DarkEspressoCardProps {
  title?: string;
  label?: string;
  badgeLabel?: string;
  badgeText?: string;
  badgeVariant?: 'amber' | 'orange' | 'green' | 'red' | 'neutral' | 'success' | 'warning';
  value: string | number;
  unit?: string;
  subtitle?: string;
  sublabel?: string;
  subtext?: string;
  className?: string;
  showSparkline?: boolean;
}

export const DarkEspressoCard: React.FC<DarkEspressoCardProps> = ({
  title,
  label,
  badgeLabel,
  badgeText,
  badgeVariant = 'orange',
  value,
  unit,
  subtitle,
  sublabel,
  subtext,
  className = '',
  showSparkline = true,
}) => {
  const displayTitle = label || title || '';
  const displayBadge = badgeText || badgeLabel;
  const displaySubtitle = sublabel || subtext || subtitle;

  const normalizedVariant =
    badgeVariant === 'success' ? 'green' :
    badgeVariant === 'neutral' ? 'amber' :
    badgeVariant;

  const badgeColors: Record<string, string> = {
    amber: 'bg-[#3D2817] text-[#FB923C]',
    orange: 'bg-[#3D2415] text-[#FB923C]',
    green: 'bg-[#143320] text-[#34D399]',
    red: 'bg-[#361517] text-[#F87171]',
  };

  const currentBadgeColor = badgeColors[normalizedVariant] || badgeColors.orange;

  return (
    <div
      data-surface="dark"
      data-sq="card"
      data-sq-border="solid"
      className={`sq-elev-card bg-[#1F1D1B] p-[var(--card-pad,20px)] card-opt border-0 [--sq-stroke:var(--sq-stroke-obsidian)] text-white relative overflow-hidden min-h-[var(--kpi-min-h,168px)] flex flex-col gap-[var(--s3,12px)] group select-none ${className}`}
    >
      {showSparkline && (
        <div className="absolute -right-3 -bottom-4 opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none">
          <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
            <path
              d="M5 50 L30 35 L55 42 L80 18 L110 22"
              stroke="#FF8F63"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <div className="flex flex-col gap-[var(--s2,8px)]">
        <span className="t-small text-[var(--text-dark-2,#A99E92)] block truncate">
          {displayTitle}
        </span>
        {displayBadge && (
          <div>
            <span className={`${currentBadgeColor} t-small px-[var(--badge-px,6px)] h-[var(--badge-h,22px)] rounded-full inline-flex items-center`}>
              {displayBadge}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-[var(--num-unit-gap,6px)] z-10 mt-auto">
        <span className="t-kpi-m text-[var(--brand-on-dark,#FF8F63)] rtl:[font-family:var(--font-ui)] rtl:font-medium rtl:text-2xl">
          {value}
        </span>
        {unit && (
          <span className="t-cap text-[var(--text-dark-2,#A99E92)]">
            {unit}
          </span>
        )}
      </div>
      {displaySubtitle && (
        <span className="t-cap text-[var(--text-dark-2,#A99E92)] tabular-nums block z-10">
          {displaySubtitle}
        </span>
      )}
    </div>
  );
};
