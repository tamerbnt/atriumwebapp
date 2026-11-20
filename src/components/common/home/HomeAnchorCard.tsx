import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { setScreenAction, setActivePmSubScreenAction } from '../../../services/store';
import type { ActiveScreen } from '../../../services/store';

export interface HomeAnchorCardProps {
  title: string;
  value: string | number;
  unit?: string;
  badgeText?: string;
  badgeVariant?: 'amber' | 'orange' | 'green' | 'red' | 'neutral' | 'success' | 'warning';
  sublabel?: string;
  targetScreen?: ActiveScreen;
  targetPmSubScreen?: string;
  onNavigate?: () => void;
  className?: string;
}

const BADGE_CLASSES: Record<
  NonNullable<HomeAnchorCardProps['badgeVariant']>,
  string
> = {
  amber: 'bg-amber-500/20 text-amber-300 border border-amber-400/25',
  orange: 'bg-[#FB923C]/20 text-[#FDBA74] border border-[#FB923C]/30',
  green: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/25',
  success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/25',
  warning: 'bg-amber-500/20 text-amber-300 border border-amber-400/25',
  red: 'bg-rose-500/25 text-rose-300 border border-rose-400/30',
  neutral: 'bg-[#A78BFA]/20 text-[#DDD6FE] border border-[#A78BFA]/30',
};

export const HomeAnchorCard: React.FC<HomeAnchorCardProps> = ({
  title,
  value,
  unit,
  badgeText,
  badgeVariant = 'orange',
  sublabel,
  targetScreen,
  targetPmSubScreen,
  onNavigate,
  className = '',
}) => {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
      return;
    }
    if (targetScreen) {
      setScreenAction(targetScreen);
      if (targetPmSubScreen) {
        setActivePmSubScreenAction(targetPmSubScreen);
      }
    }
  };

  const isInteractive = Boolean(targetScreen || onNavigate);

  const cardBody = (
    <div
      data-sq="card"
      data-sq-border="solid"
      data-surface="dark"
      className={`bg-gradient-to-br from-[#2B1F19] via-[#1F1713] to-[#161210] p-[var(--card-pad,20px)] card-opt border border-[#4D382B]/85 [--sq-stroke:rgba(77,56,43,0.85)] text-white min-h-[var(--kpi-min-h,168px)] flex flex-col justify-between gap-[var(--kpi-gap,12px)] relative overflow-hidden transition-colors duration-150 ${
        isInteractive ? 'group-hover/anchor:[--sq-stroke:rgba(251,146,60,0.55)]' : ''
      }`}
    >
      {/* Subtle Espresso + Complementary Lavender & Terracotta Wave Backdrop */}
      <div
        aria-hidden="true"
        className="w-36 h-16 absolute -bottom-2 end-2 opacity-65 pointer-events-none"
      >
        <svg viewBox="0 0 120 48" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="home-anchor-wave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#FB923C" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path
            d="M4 38 C 24 34, 42 40, 62 24 C 80 10, 96 18, 116 6"
            fill="none"
            stroke="url(#home-anchor-wave)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M8 43 C 34 40, 56 32, 78 28 C 94 25, 106 16, 116 14"
            fill="none"
            stroke="#C4B5FD"
            strokeWidth="1.25"
            strokeOpacity="0.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Header Row with room for Top-Right NE Arrow */}
      <div className="flex items-start justify-between gap-[var(--s2,8px)] relative z-10 pe-[var(--s8,48px)]">
        <div className="flex items-center gap-[var(--s2,8px)] flex-wrap min-w-0">
          <span className="t-label text-[#EBDCD0]/85">
            {title}
          </span>
          {badgeText && (
            <span
              className={`inline-flex items-center h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full t-small whitespace-nowrap ${BADGE_CLASSES[badgeVariant]}`}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>

      {/* KPI Value + Sublabel */}
      <div className="flex items-end justify-between gap-[var(--s3,12px)] relative z-10 mt-auto">
        <div className="flex items-baseline gap-[var(--num-unit-gap,6px)] min-w-0">
          <span className="t-kpi-m text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="t-small text-[var(--text-dark-2,#A99E92)]">{unit}</span>
          )}
        </div>
        {sublabel && (
          <span className="t-cap text-[var(--text-dark-2,#A99E92)] text-end max-w-[54%] line-clamp-2">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );

  if (!isInteractive) {
    return <div className={className}>{cardBody}</div>;
  }

  return (
    <button
      type="button"
      data-no-liquid="true"
      onClick={handleClick}
      className={`group/anchor relative w-full text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB923C] shrink-0 ${className}`}
    >
      {cardBody}
      <span
        aria-hidden="true"
        className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full bg-white/[0.1] border border-white/[0.16] text-white/85 group-hover/anchor:bg-[#FB923C] group-hover/anchor:text-[#151413] group-hover/anchor:border-[#FB923C] flex items-center justify-center absolute top-[var(--card-pad,20px)] end-[var(--card-pad,20px)] transition-colors duration-150"
      >
        <ArrowUpRight
          size={16}
          strokeWidth={1.5}
          className="rtl:-scale-x-100 transition-transform duration-200 ltr:group-hover/anchor:translate-x-0.5 rtl:group-hover/anchor:-translate-x-0.5 group-hover/anchor:-translate-y-0.5 motion-reduce:transform-none"
        />
      </span>
    </button>
  );
};
