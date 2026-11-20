import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { setScreenAction } from '../../../services/store';
import { AtriumButton } from '../../ui/AtriumButton';
import type { HomeKioskConfig } from './homeTypes';

export interface HomeKioskCardProps {
  config: HomeKioskConfig;
  className?: string;
}

export const HomeKioskCard: React.FC<HomeKioskCardProps> = ({
  config,
  className = '',
}) => {
  const handleLaunch = () => {
    if (config.onNavigate) {
      config.onNavigate();
    } else {
      setScreenAction(config.targetScreen);
    }
  };

  return (
    <div
      data-sq="card"
      data-sq-border="solid"
      data-surface="dark"
      className={`flex-1 sq-elev-card bg-gradient-to-br from-[#2B1F19] via-[#1F1713] to-[#161210] p-[var(--card-pad,20px)] card-opt border-0 [--sq-stroke:var(--sq-stroke-obsidian)] text-white relative overflow-hidden flex flex-col justify-between group/kiosk ${className}`}
      data-testid={`home-kiosk-${config.id}`}
    >
      {/* Subtle architectural sparkline backdrop in Lavender + Terracotta */}
      <div
        aria-hidden="true"
        className="absolute -right-4 -bottom-4 opacity-35 group-hover/kiosk:opacity-55 transition-opacity pointer-events-none"
      >
        <svg width="160" height="84" viewBox="0 0 140 80" fill="none">
          <path
            d="M8 58 L38 40 L68 48 L98 20 L132 25"
            stroke="#FB923C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 66 L44 52 L74 58 L106 32 L134 36"
            stroke="#A78BFA"
            strokeWidth="1.75"
            strokeOpacity="0.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col gap-[var(--card-body-gap,20px)]">
        <div className="flex items-start justify-between gap-[var(--s3,12px)]">
          <div className="flex items-start gap-[var(--card-head-gap,12px)] min-w-0 flex-1">
            <span
              data-sq="tile"
              data-sq-border="solid"
              className="relative w-[var(--tile-md,40px)] h-[var(--tile-md,40px)] bg-gradient-to-br from-[#FB923C]/20 to-[#A78BFA]/20 border-0 [--sq-stroke:var(--sq-stroke-ctl)] text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center shrink-0"
            >
              {config.icon}
            </span>
            <div className="min-w-0 flex-1 flex flex-col gap-[var(--title-cap-gap,2px)]">
              <span className="t-small text-[#C4B5FD] block truncate">
                {config.eyebrow}
              </span>
              <h3 className="t-pod text-white truncate">
                {config.title}
              </h3>
              <p className="t-cap text-[var(--text-dark-2,#A99E92)] line-clamp-2">
                {config.subtitle}
              </p>
            </div>
          </div>

          <div className="text-end shrink-0 flex flex-col gap-[var(--title-cap-gap,2px)]">
            <span className="t-kpi-m text-[var(--brand-on-dark,#FF8F63)] tabular-nums block">
              {config.metricValue}
            </span>
            <span className="t-cap text-[var(--text-dark-2,#A99E92)] block whitespace-nowrap">
              {config.metricLabel}
            </span>
          </div>
        </div>

        {config.items.length > 0 && (
          <ul className="divide-y divide-white/[0.09] border-t border-b border-white/[0.09]">
            {config.items.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className="py-[var(--s2,8px)] flex items-center justify-between gap-[var(--s3,12px)]"
              >
                <div className="min-w-0 flex-1 flex flex-col gap-[var(--title-cap-gap,2px)]">
                  <span className="t-label text-white truncate block">
                    {item.primary}
                  </span>
                  {item.secondary && (
                    <span className="t-cap text-[var(--text-dark-2,#A99E92)] truncate block tabular-nums">
                      {item.secondary}
                    </span>
                  )}
                </div>
                {item.trailing && (
                  <span className="t-label font-semibold text-[var(--brand-on-dark,#FF8F63)] tabular-nums whitespace-nowrap shrink-0">
                    {item.trailing}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-10 pt-[var(--footer-gap,16px)] flex items-center justify-end">
        <AtriumButton
          variant="primary"
          size="md"
          onClick={handleLaunch}
          icon={
            <ArrowUpRight
              size={16}
              strokeWidth={1.5}
              className="rtl:-scale-x-100"
            />
          }
          iconPosition="right"
          className="whitespace-nowrap shrink-0"
        >
          {config.ctaLabel}
        </AtriumButton>
      </div>
    </div>
  );
};
