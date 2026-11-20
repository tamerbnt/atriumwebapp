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
      className={`flex-1 bg-gradient-to-br from-[#2B1F19] via-[#1F1713] to-[#161210] p-4 sm:p-5 border border-[#4D382B]/85 [--sq-stroke:rgba(77,56,43,0.85)] text-white relative overflow-hidden flex flex-col justify-between group/kiosk ${className}`}
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

      <div className="relative z-10 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span
              data-sq="tile"
              data-sq-border="solid"
              className="relative w-10 h-10 bg-gradient-to-br from-[#FB923C]/20 to-[#A78BFA]/20 border border-white/[0.14] [--sq-stroke:rgba(255,255,255,0.14)] text-[#FB923C] flex items-center justify-center shrink-0"
            >
              {config.icon}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C4B5FD] block truncate rtl:tracking-normal">
                {config.eyebrow}
              </span>
              <h3 className="text-[17px] font-bold text-white leading-tight mt-0.5 truncate">
                {config.title}
              </h3>
              <p className="text-[12px] text-[#E6D9CE]/72 mt-0.5 line-clamp-2">
                {config.subtitle}
              </p>
            </div>
          </div>

          <div className="text-end shrink-0">
            <span className="text-[28px] font-bold leading-none text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans block">
              {config.metricValue}
            </span>
            <span className="text-[11px] text-[#DECFC3]/70 block mt-0.5 whitespace-nowrap">
              {config.metricLabel}
            </span>
          </div>
        </div>

        {config.items.length > 0 && (
          <ul className="divide-y divide-white/[0.09] border-t border-b border-white/[0.09]">
            {config.items.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className="py-2 flex items-center justify-between gap-3 text-[12.5px]"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-white truncate block">
                    {item.primary}
                  </span>
                  {item.secondary && (
                    <span className="text-[11px] text-[#DDD0C6]/62 truncate block tabular-nums">
                      {item.secondary}
                    </span>
                  )}
                </div>
                {item.trailing && (
                  <span className="font-semibold text-[#FB923C] tabular-nums whitespace-nowrap shrink-0">
                    {item.trailing}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-10 pt-3.5 flex items-center justify-end">
        <AtriumButton
          variant="primary"
          size="md"
          onClick={handleLaunch}
          icon={
            <ArrowUpRight
              size={16}
              strokeWidth={2.2}
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
