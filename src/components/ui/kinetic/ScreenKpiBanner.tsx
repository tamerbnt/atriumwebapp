import React from 'react';
import { useSpringCountRef } from './kineticMotion';

export interface KpiFilterCardConfig {
  label: string;
  badgeText: string;
  count: number;
  isActive?: boolean;
  onToggle?: () => void;
  title?: string;
  tone?: 'emerald' | 'terracotta';
  formatValue?: (rounded: number) => string;
  filteredLabel?: string;
}

export interface KpiDarkCardConfig {
  label: string;
  badgeCount: number;
  badgeSuffix?: string;
  badgePrefix?: string;
  valueCount: number;
  valuePrefix?: string;
  valueSuffix?: string;
  caption: string;
  formatBadgeValue?: (rounded: number) => string;
  formatValue?: (rounded: number) => string;
}

export interface ScreenKpiBannerProps {
  heading: string;
  language?: string;
  primaryCard: KpiFilterCardConfig;
  secondaryCard: KpiFilterCardConfig;
  darkCard: KpiDarkCardConfig;
  className?: string;
}

const WhiteKpiCard: React.FC<{
  card: KpiFilterCardConfig;
  defaultTone: 'emerald' | 'terracotta';
  language: string;
}> = React.memo(({ card, defaultTone, language }) => {
  const tone = card.tone || defaultTone;
  const isEmerald = tone === 'emerald';
  const countRef = useSpringCountRef<HTMLDivElement>(card.count, {
    formatValue: card.formatValue,
  });
  const chipCountRef = useSpringCountRef<HTMLSpanElement>(card.count, {
    formatValue: card.formatValue,
  });

  const filteredText =
    card.filteredLabel ||
    (language === 'ar' ? 'مُصفّى' : language === 'fr' ? 'Filtré' : 'Filtered');

  const activeBorder = isEmerald
    ? 'border-emerald-500/70 dark:border-emerald-400/70 ring-2 ring-emerald-500/20 shadow-[0_10px_24px_-6px_rgba(16,185,129,0.22),0_4px_10px_-2px_rgba(20,16,12,0.06)] dark:shadow-[0_12px_26px_-6px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]'
    : 'border-[#d4522f]/75 dark:border-[#e8643f]/75 ring-2 ring-[#d4522f]/20 shadow-[0_10px_24px_-6px_rgba(212,82,47,0.22),0_4px_10px_-2px_rgba(20,16,12,0.06)] dark:shadow-[0_12px_26px_-6px_rgba(232,100,63,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]';

  const inactiveBorder =
    'border-[#E6DED6] dark:border-neutral-700/60 shadow-[0_2px_8px_rgba(20,16,12,0.05),0_1px_2px_rgba(20,16,12,0.04)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#D5C9BE] dark:hover:border-neutral-600/80 hover:shadow-[0_12px_28px_-6px_rgba(20,16,12,0.12),0_4px_10px_-2px_rgba(20,16,12,0.06)] dark:hover:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.1)]';

  const glowGradient = isEmerald
    ? 'bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.14),transparent_70%)]'
    : 'bg-[radial-gradient(240px_circle_at_90%_10%,rgba(212,82,47,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(232,100,63,0.14),transparent_70%)]';

  const chipClass = isEmerald
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40'
    : 'text-[#d4522f] bg-[#d4522f]/10';

  const filteredPillClass = isEmerald
    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/12'
    : 'text-[#d4522f] dark:text-[#FF8D7A] bg-[#d4522f]/12';

  const focusRing = isEmerald
    ? 'focus-visible:ring-emerald-500/70'
    : 'focus-visible:ring-[#d4522f]/70';

  const content = (
    <>
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${glowGradient} ${
          card.isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />
      <div className="relative z-10 w-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-black/68 dark:text-white/72 truncate">
            {card.label}
          </span>
          {card.isActive && (
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-md shrink-0 ${filteredPillClass}`}
            >
              {filteredText}
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <span
            className={`inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 ${chipClass}`}
          >
            {isEmerald ? (
              card.badgeText
            ) : (
              <>
                <span ref={chipCountRef}>
                  {card.formatValue ? card.formatValue(card.count) : card.count}
                </span>{' '}
                {card.badgeText}
              </>
            )}
          </span>
        </div>
      </div>
      <div
        ref={countRef}
        className="relative z-10 text-[30px] lg:text-[32px] leading-[0.95] font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left rtl:origin-right group-hover:scale-[1.03]"
      >
        {card.formatValue ? card.formatValue(card.count) : card.count}
      </div>
    </>
  );

  const sharedClass = `group relative overflow-hidden p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border text-left rtl:text-right flex flex-col justify-between min-h-[132px] w-full select-none transform-gpu transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] focus:outline-none focus-visible:ring-2 ${focusRing} motion-reduce:transition-none motion-reduce:hover:transform-none ${
    card.onToggle ? 'cursor-pointer active:translate-y-0 active:scale-[0.995]' : ''
  } ${card.isActive ? activeBorder : inactiveBorder}`;

  if (card.onToggle) {
    return (
      <button
        type="button"
        data-no-liquid="true"
        onClick={card.onToggle}
        aria-pressed={Boolean(card.isActive)}
        title={card.title || card.label}
        className={sharedClass}
      >
        {content}
      </button>
    );
  }

  return (
    <div title={card.title || card.label} className={sharedClass}>
      {content}
    </div>
  );
});

WhiteKpiCard.displayName = 'WhiteKpiCard';

export const ScreenKpiBanner: React.FC<ScreenKpiBannerProps> = React.memo(({
  heading,
  language = 'fr',
  primaryCard,
  secondaryCard,
  darkCard,
  className = '',
}) => {
  const darkChipCountRef = useSpringCountRef<HTMLSpanElement>(darkCard.badgeCount, {
    prefix: darkCard.badgePrefix ?? '+',
    formatValue: darkCard.formatBadgeValue,
  });
  const darkBigCountRef = useSpringCountRef<HTMLDivElement>(darkCard.valueCount, {
    prefix: darkCard.valuePrefix ?? '+',
    suffix: darkCard.valueSuffix ?? '',
    formatValue: darkCard.formatValue,
  });

  return (
    <div
      className={`bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs ${className}`}
    >
      <div>
        <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
          {heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <WhiteKpiCard card={primaryCard} defaultTone="emerald" language={language} />
        <WhiteKpiCard card={secondaryCard} defaultTone="terracotta" language={language} />

        {/* 3rd Dark #1F1D1B Card with #FB923C orange figure */}
        <div className="group relative overflow-hidden p-4.5 sm:p-5 rounded-[18px] bg-[#1F1D1B] border border-white/[0.08] text-white flex flex-col justify-between min-h-[132px] shadow-[0_4px_14px_rgba(20,16,12,0.16),0_1px_3px_rgba(20,16,12,0.12)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.07)] transform-gpu transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] hover:border-[#FB923C]/35 hover:shadow-[0_14px_30px_-6px_rgba(212,82,47,0.24),0_6px_14px_-2px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.72),0_0_0_1px_rgba(251,146,60,0.22)] motion-reduce:transition-none motion-reduce:hover:transform-none">
          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(260px_circle_at_88%_12%,rgba(251,146,60,0.14),transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-white/75 truncate">
              {darkCard.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 shrink-0">
              <span ref={darkChipCountRef}>
                {darkCard.formatBadgeValue
                  ? darkCard.formatBadgeValue(darkCard.badgeCount)
                  : `${darkCard.badgePrefix ?? '+'}${darkCard.badgeCount}`}
              </span>
              {darkCard.badgeSuffix ? <span>{darkCard.badgeSuffix.trim()}</span> : null}
            </span>
          </div>
          <div className="relative z-10">
            <div
              ref={darkBigCountRef}
              className="text-[30px] lg:text-[32px] leading-[0.95] font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left rtl:origin-right group-hover:scale-[1.03]"
            >
              {darkCard.formatValue
                ? darkCard.formatValue(darkCard.valueCount)
                : `${darkCard.valuePrefix ?? '+'}${darkCard.valueCount}${darkCard.valueSuffix ?? ''}`}
            </div>
            <p className="text-[11.5px] text-white/65 mt-1.5 truncate">{darkCard.caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

ScreenKpiBanner.displayName = 'ScreenKpiBanner';
