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

  const activeStrokeVars = isEmerald
    ? '[--sq-stroke:rgba(16,185,129,0.75)] dark:[--sq-stroke:rgba(52,211,153,0.75)]'
    : '[--sq-stroke:rgba(212,82,47,0.78)] dark:[--sq-stroke:rgba(232,100,63,0.78)]';

  const inactiveStrokeVars =
    '[--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.65)] group-hover:[--sq-stroke:#D5C9BE] dark:group-hover:[--sq-stroke:rgba(82,82,82,0.85)]';

  const glowGradient = isEmerald
    ? 'bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.14),transparent_70%)]'
    : 'bg-[radial-gradient(240px_circle_at_90%_10%,rgba(212,82,47,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(232,100,63,0.14),transparent_70%)]';

  const chipClass = isEmerald
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40'
    : 'text-[#d4522f] bg-[#d4522f]/10';

  const filteredPillClass = isEmerald
    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/12'
    : 'text-[#d4522f] dark:text-[#FF8D7A] bg-[#d4522f]/12';

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
              className={`text-[10px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-full shrink-0 ${filteredPillClass}`}
            >
              {filteredText}
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <span
            className={`inline-block text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 ${chipClass}`}
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

  const sharedClass = `relative overflow-hidden p-4.5 sm:p-5 rounded-[var(--r-card,16px)] bg-white dark:bg-neutral-800/90 text-left rtl:text-right flex flex-col justify-between min-h-[132px] h-full w-full select-none focus:outline-none ${
    card.onToggle ? 'cursor-pointer' : ''
  } ${card.isActive ? activeStrokeVars : inactiveStrokeVars}`;

  const wrapperClass = `group sq-elev-card-hover h-full transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] motion-reduce:transition-none motion-reduce:hover:transform-none ${
    card.onToggle ? 'active:translate-y-0 active:scale-[0.995]' : ''
  }`;

  if (card.onToggle) {
    return (
      <div className={wrapperClass}>
        <button
          type="button"
          data-no-liquid="true"
          data-sq="card"
          data-sq-border="solid"
          data-sq-stroke-w={card.isActive ? '2' : '1'}
          onClick={card.onToggle}
          aria-pressed={Boolean(card.isActive)}
          title={card.title || card.label}
          className={sharedClass}
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div
        title={card.title || card.label}
        data-sq="card"
        data-sq-border="solid"
        data-sq-stroke-w={card.isActive ? '2' : '1'}
        className={sharedClass}
      >
        {content}
      </div>
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
      data-sq="panel"
      data-sq-border="solid"
      className={`bg-[#F3EDE7] dark:bg-[#141312] rounded-[var(--r-panel,28px)] p-3 space-y-3 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] ${className}`}
    >
      <div className="px-2 pt-1">
        <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
          {heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <WhiteKpiCard card={primaryCard} defaultTone="emerald" language={language} />
        <WhiteKpiCard card={secondaryCard} defaultTone="terracotta" language={language} />

        {/* 3rd Dark #1F1D1B Card with #FB923C orange figure */}
        <div className="group sq-elev-card-hover h-full transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] motion-reduce:transition-none motion-reduce:hover:transform-none">
          <div
            data-sq="card"
            data-sq-border="solid"
            className="relative overflow-hidden p-4.5 sm:p-5 rounded-[var(--r-card,16px)] bg-[#1F1D1B] [--sq-stroke:rgba(255,255,255,0.08)] group-hover:[--sq-stroke:rgba(251,146,60,0.4)] text-white flex flex-col justify-between min-h-[132px] h-full"
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(260px_circle_at_88%_12%,rgba(251,146,60,0.14),transparent_70%)]" />
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-white/75 truncate">
                {darkCard.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 shrink-0">
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
    </div>
  );
});

ScreenKpiBanner.displayName = 'ScreenKpiBanner';
