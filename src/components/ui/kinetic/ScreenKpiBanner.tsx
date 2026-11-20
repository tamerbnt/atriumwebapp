import React, { useId, useLayoutEffect, useRef } from 'react';
import { useSpringCountRef } from './kineticMotion';
import { useScreenFocus } from './ScreenFocusContext';

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
    '[--sq-stroke:var(--sq-stroke-card,rgba(23,19,15,0.06))] group-hover:[--sq-stroke:var(--sq-stroke-card,rgba(23,19,15,0.09))] dark:group-hover:[--sq-stroke:var(--sq-stroke-ctl-hover,url(#sq-spec-dark-ctl-hover))]';

  const glowGradient = isEmerald
    ? 'bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(16,185,129,0.14),transparent_70%)]'
    : 'bg-[radial-gradient(240px_circle_at_90%_10%,rgba(212,82,47,0.09),transparent_70%)] dark:bg-[radial-gradient(240px_circle_at_90%_10%,rgba(232,100,63,0.14),transparent_70%)]';

  const chipClass = isEmerald
    ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40'
    : 'text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] bg-[#d4522f]/10';

  const filteredPillClass = isEmerald
    ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-500/12'
    : 'text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] bg-[#d4522f]/12';

  const content = (
    <>
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${glowGradient} ${
          card.isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />
      <div className="relative z-10 w-full flex flex-col gap-[var(--s2,8px)]">
        <div className="flex items-center justify-between gap-[var(--s2,8px)]">
          <span className="t-small text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
            {card.label}
          </span>
          {card.isActive && (
            <span
              className={`h-[var(--badge-h,22px)] inline-flex items-center t-small px-[var(--badge-px,6px)] rounded-full shrink-0 ${filteredPillClass}`}
            >
              {filteredText}
            </span>
          )}
        </div>
        <div>
          <span
            className={`inline-flex items-center gap-[var(--s1,4px)] h-[var(--badge-h,22px)] t-small px-[var(--s2,8px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 ${chipClass}`}
          >
            {isEmerald ? (
              card.badgeText
            ) : (
              <>
                <span ref={chipCountRef}>
                  {card.formatValue ? card.formatValue(card.count) : card.count}
                </span>
                <span>{card.badgeText}</span>
              </>
            )}
          </span>
        </div>
      </div>
      <div
        ref={countRef}
        className="relative z-10 t-kpi-m text-[var(--text-1)] dark:text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left rtl:origin-right group-hover:scale-[1.03] mt-auto"
      >
        {card.formatValue ? card.formatValue(card.count) : card.count}
      </div>
    </>
  );

  const sharedClass = `relative overflow-hidden p-[var(--card-pad,20px)] card-opt rounded-[var(--r-card,16px)] bg-white dark:bg-neutral-800/90 text-left rtl:text-right flex flex-col justify-between gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)] h-full w-full select-none focus:outline-none ${
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
  const bannerId = useId();
  const focusCtx = useScreenFocus();
  const bannerRef = useRef<HTMLDivElement>(null);
  const isExpanded = Boolean(focusCtx?.isExpanded);

  useLayoutEffect(() => {
    if (!focusCtx) return;
    focusCtx.registerUpperBanner(bannerId, isExpanded ? null : bannerRef.current);
    return () => {
      focusCtx.registerUpperBanner(bannerId, null);
    };
  }, [focusCtx, bannerId, isExpanded]);

  const darkChipCountRef = useSpringCountRef<HTMLSpanElement>(darkCard.badgeCount, {
    prefix: darkCard.badgePrefix ?? '+',
    formatValue: darkCard.formatBadgeValue,
  });
  const darkBigCountRef = useSpringCountRef<HTMLDivElement>(darkCard.valueCount, {
    prefix: darkCard.valuePrefix ?? '+',
    suffix: darkCard.valueSuffix ?? '',
    formatValue: darkCard.formatValue,
  });

  if (isExpanded) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      data-sq="panel"
      data-sq-border="solid"
      className={`bg-[#F3EDE7] dark:bg-[#141312] rounded-[var(--r-panel,28px)] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)] ${className}`}
    >
      <div className="pt-[var(--s1,4px)] px-[var(--s3,12px)] pb-[var(--s3,12px)]">
        <h2 className="t-pod text-[var(--text-1)] dark:text-white">
          {heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--card-gap,12px)]">
        <WhiteKpiCard card={primaryCard} defaultTone="emerald" language={language} />
        <WhiteKpiCard card={secondaryCard} defaultTone="terracotta" language={language} />

        {/* 3rd Dark #1F1D1B Card with #FF8F63 orange figure */}
        <div className="group sq-elev-card-hover h-full transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:scale-[1.008] motion-reduce:transition-none motion-reduce:hover:transform-none">
          <div
            data-surface="dark"
            data-sq="card"
            data-sq-border="solid"
            className="relative overflow-hidden p-[var(--card-pad,20px)] card-opt rounded-[var(--r-card,16px)] bg-[#1F1D1B] [--sq-stroke:var(--sq-stroke-obsidian,url(#sq-spec-dark-card))] group-hover:[--sq-stroke:rgba(255,143,99,0.45)] text-white flex flex-col justify-between gap-[var(--s3,12px)] min-h-[var(--kpi-min-h,168px)] h-full"
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(260px_circle_at_88%_12%,rgba(255,143,99,0.14),transparent_70%)]" />
            <div className="relative z-10 flex items-center justify-between gap-[var(--s2,8px)]">
              <span className="t-small text-[var(--text-dark-2)] truncate">
                {darkCard.label}
              </span>
              <span className="inline-flex items-center gap-[var(--s1,4px)] h-[var(--badge-h,22px)] px-[var(--s2,8px)] rounded-full t-small bg-[#3D2817] text-[var(--brand-on-dark)] border border-[#FF8F63]/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 shrink-0">
                <span ref={darkChipCountRef}>
                  {darkCard.formatBadgeValue
                    ? darkCard.formatBadgeValue(darkCard.badgeCount)
                    : `${darkCard.badgePrefix ?? '+'}${darkCard.badgeCount}`}
                </span>
                {darkCard.badgeSuffix ? <span>{darkCard.badgeSuffix.trim()}</span> : null}
              </span>
            </div>
            <div
              ref={darkBigCountRef}
              className="relative z-10 t-kpi-m text-[var(--brand-on-dark)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-left rtl:origin-right group-hover:scale-[1.03] mt-auto"
            >
              {darkCard.formatValue
                ? darkCard.formatValue(darkCard.valueCount)
                : `${darkCard.valuePrefix ?? '+'}${darkCard.valueCount}${darkCard.valueSuffix ?? ''}`}
            </div>
            <p className="relative z-10 t-cap text-[var(--text-dark-2)] truncate">{darkCard.caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

ScreenKpiBanner.displayName = 'ScreenKpiBanner';
