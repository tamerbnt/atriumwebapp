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
      className={`bg-[#1F1D1B] rounded-[18px] p-4 border border-neutral-800 text-white relative overflow-hidden h-[124px] flex flex-col justify-between shadow-sm group select-none ${className}`}
    >
      {showSparkline && (
        <div className="absolute -right-3 -bottom-4 opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none">
          <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
            <path
              d="M5 50 L30 35 L55 42 L80 18 L110 22"
              stroke="#FB923C"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <div>
        <span className="text-[11px] font-semibold text-white/80 block truncate">
          {displayTitle}
        </span>
        {displayBadge && (
          <div className="text-[10px] font-semibold mt-0.5">
            <span className={`${currentBadgeColor} px-2 py-0.5 rounded-full inline-block`}>
              {displayBadge}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 z-10">
        <span className="text-[28px] leading-none font-bold tracking-tight text-[#FB923C] tabular-nums font-['Barlow_Condensed'] rtl:font-sans rtl:text-2xl">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-white/70 font-normal">
            {unit}
          </span>
        )}
        {displaySubtitle && (
          <span className="text-[10px] text-white/70 ms-auto">
            {displaySubtitle}
          </span>
        )}
      </div>
    </div>
  );
};
