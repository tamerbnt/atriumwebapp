import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  setActivePmSubScreenAction,
  setScreenAction,
} from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { EmptyState } from '../../../atrium/components/EmptyState';
import { KineticEmptyStateMotion } from '../../ui/kinetic/KineticEmptyStateMotion';
import type {
  HomeCardTone,
  HomeCompactStripConfig,
  HomePreviewCardConfig,
  HomeRowStatusTone,
} from './homeTypes';
import { getHomeStrings } from './homeLocalization';

const STATUS_DOT_COLOR: Record<HomeRowStatusTone, string> = {
  positive: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  danger: 'bg-rose-500 dark:bg-rose-400',
  neutral: 'bg-[#8E8277] dark:bg-neutral-500',
};

interface ToneStyles {
  card: string;
  topAccent: string;
  iconWell: string;
  accentText: string;
  titleHover: string;
  divider: string;
  rowHover: string;
  neButton: string;
  ring: string;
  footerLink: string;
}

const TONE_STYLES: Record<HomeCardTone, ToneStyles> = {
  terracotta: {
    card: 'bg-white dark:bg-[#171413] border-black/[0.06] dark:border-white/[0.09] hover:bg-[#FCF9F7] dark:hover:bg-[#1D1918]',
    topAccent: 'bg-[#d4522f]/80 dark:bg-[#FB923C]/75',
    iconWell:
      'bg-[#FCEEE9] dark:bg-[#2B1B17] border-[#d4522f]/15 dark:border-[#FB923C]/20 [--sq-stroke:rgba(212,82,47,0.16)] dark:[--sq-stroke:rgba(251,146,60,0.2)] text-[#B83B1B] dark:text-[#FB923C]',
    accentText: 'text-[#B83B1B] dark:text-[#FB923C]',
    titleHover: 'group-hover/card:text-[#B83B1B] dark:group-hover/card:text-[#FB923C]',
    divider: 'divide-black/[0.055] dark:divide-white/[0.07] border-black/[0.055] dark:border-white/[0.07]',
    rowHover: 'hover:bg-[#FDF6F3] dark:hover:bg-white/[0.035]',
    neButton:
      'bg-[#F7EEE8] dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.1] text-[#3B2A20]/80 dark:text-white/80 hover:bg-[#d4522f] hover:border-[#d4522f] hover:text-white dark:hover:bg-[#FB923C] dark:hover:border-[#FB923C] dark:hover:text-[#151413]',
    ring: 'focus-visible:ring-[#d4522f]',
    footerLink: 'text-[#B83B1B] dark:text-[#FB923C]',
  },
  brown: {
    card: 'bg-[#FFFCF8] dark:bg-[#171310] border-[#7C4E2D]/[0.1] dark:border-white/[0.09] [--sq-stroke:rgba(124,78,45,0.1)] dark:[--sq-stroke:var(--sq-stroke-obsidian)] hover:bg-[#FAF5EE] dark:hover:bg-[#1D1814]',
    topAccent: 'bg-[#7C4E2D]/85 dark:bg-[#D9A97E]/75',
    iconWell:
      'bg-[#F2E5D8] dark:bg-[#291F17] border-[#7C4E2D]/15 dark:border-[#D9A97E]/20 [--sq-stroke:rgba(124,78,45,0.16)] dark:[--sq-stroke:rgba(217,169,126,0.2)] text-[#6B4122] dark:text-[#D9A97E]',
    accentText: 'text-[#6B4122] dark:text-[#D9A97E]',
    titleHover: 'group-hover/card:text-[#6B4122] dark:group-hover/card:text-[#D9A97E]',
    divider: 'divide-black/[0.055] dark:divide-white/[0.07] border-black/[0.055] dark:border-white/[0.07]',
    rowHover: 'hover:bg-[#F7EFE7] dark:hover:bg-[#241C16]/70',
    neButton:
      'bg-[#F2E5D8] dark:bg-[#251E18] border-[#7C4E2D]/15 dark:border-white/[0.1] text-[#4A301C]/85 dark:text-[#EAD8C7] hover:bg-[#6B4122] hover:border-[#6B4122] hover:text-white dark:hover:bg-[#D9A97E] dark:hover:border-[#D9A97E] dark:hover:text-[#151413]',
    ring: 'focus-visible:ring-[#7C4E2D]',
    footerLink: 'text-[#6B4122] dark:text-[#D9A97E]',
  },
  lavender: {
    card: 'bg-[#FCFBFF] dark:bg-[#16141D] border-[#684DA8]/[0.11] dark:border-white/[0.09] [--sq-stroke:rgba(104,77,168,0.11)] dark:[--sq-stroke:var(--sq-stroke-obsidian)] hover:bg-[#F7F4FC] dark:hover:bg-[#1C1926]',
    topAccent: 'bg-[#684DA8]/85 dark:bg-[#A78BFA]/75',
    iconWell:
      'bg-[#EFEBF9] dark:bg-[#231D36] border-[#684DA8]/15 dark:border-[#C4B5FD]/20 [--sq-stroke:rgba(104,77,168,0.16)] dark:[--sq-stroke:rgba(196,181,253,0.2)] text-[#5B41A1] dark:text-[#C4B5FD]',
    accentText: 'text-[#5B41A1] dark:text-[#C4B5FD]',
    titleHover: 'group-hover/card:text-[#5B41A1] dark:group-hover/card:text-[#C4B5FD]',
    divider: 'divide-black/[0.05] dark:divide-white/[0.07] border-black/[0.05] dark:border-white/[0.07]',
    rowHover: 'hover:bg-[#F4F0FC] dark:hover:bg-[#221D33]/70',
    neButton:
      'bg-[#EFEBF9] dark:bg-[#221D34] border-[#684DA8]/15 dark:border-white/[0.1] text-[#3E2D6E]/85 dark:text-[#DED6FE] hover:bg-[#5B41A1] hover:border-[#5B41A1] hover:text-white dark:hover:bg-[#A78BFA] dark:hover:border-[#A78BFA] dark:hover:text-[#151413]',
    ring: 'focus-visible:ring-[#684DA8]',
    footerLink: 'text-[#5B41A1] dark:text-[#C4B5FD]',
  },
  sage: {
    card: 'bg-[#FAFDFB] dark:bg-[#121916] border-emerald-700/[0.12] dark:border-white/[0.09] [--sq-stroke:rgba(21,128,61,0.12)] dark:[--sq-stroke:var(--sq-stroke-obsidian)] hover:bg-[#F3FAF5] dark:hover:bg-[#17211C]',
    topAccent: 'bg-[#15803D]/80 dark:bg-[#4ADE80]/75',
    iconWell:
      'bg-[#EAF6EE] dark:bg-[#192E22] border-emerald-700/15 dark:border-emerald-400/20 [--sq-stroke:rgba(21,128,61,0.16)] dark:[--sq-stroke:rgba(74,222,128,0.2)] text-[#166534] dark:text-[#4ADE80]',
    accentText: 'text-[#166534] dark:text-[#4ADE80]',
    titleHover: 'group-hover/card:text-[#166534] dark:group-hover/card:text-[#4ADE80]',
    divider: 'divide-black/[0.05] dark:divide-white/[0.07] border-black/[0.05] dark:border-white/[0.07]',
    rowHover: 'hover:bg-[#F2FAF5] dark:hover:bg-[#1A2A20]/70',
    neButton:
      'bg-[#EAF6EE] dark:bg-[#1A2A20] border-emerald-700/15 dark:border-white/[0.1] text-[#14532D]/85 dark:text-[#BBF7D0] hover:bg-[#15803D] hover:border-[#15803D] hover:text-white dark:hover:bg-[#4ADE80] dark:hover:border-[#4ADE80] dark:hover:text-[#151413]',
    ring: 'focus-visible:ring-[#15803D]',
    footerLink: 'text-[#166534] dark:text-[#4ADE80]',
  },
};

function resolveTone(id: string, tone?: HomeCardTone): HomeCardTone {
  if (tone) return tone;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 3;
  }
  return hash === 0 ? 'brown' : hash === 1 ? 'lavender' : 'terracotta';
}

export interface HomePreviewCardProps {
  config: HomePreviewCardConfig;
  className?: string;
}

export const HomePreviewCard: React.FC<HomePreviewCardProps> = React.memo(({
  config,
  className = '',
}) => {
  const { language } = useTranslation();
  const strings = getHomeStrings(language);
  const styles = TONE_STYLES[resolveTone(config.id, config.tone)];

  const navigate = () => {
    if (config.onNavigate) {
      config.onNavigate();
      return;
    }
    setScreenAction(config.targetScreen);
    if (config.targetPmSubScreen) {
      setActivePmSubScreenAction(config.targetPmSubScreen);
    }
  };

  const countDisplay =
    config.count !== undefined ? config.count : config.items.length;

  return (
    <div
      data-sq="card"
      data-sq-border="solid"
      className={`group/card sq-elev-card sq-elev-card-hover relative overflow-hidden h-full border p-[var(--card-pad,20px)] card-opt flex flex-col justify-between transition-colors duration-200 min-w-0 ${styles.card} ${className}`}
      data-testid={`home-preview-${config.id}`}
    >
      {/* Clean 2.5px Top Accent Hairline */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[2.5px] ${styles.topAccent}`}
      />

      <div className="flex-1 flex flex-col gap-[var(--card-body-gap,20px)] min-h-0">
        {/* Card Header + Top-Right North-East Arrow */}
        <div className="flex items-start justify-between gap-[var(--card-head-gap,12px)] shrink-0">
          <button
            type="button"
            data-no-liquid="true"
            data-sq="row"
            data-sq-border="none"
            onClick={navigate}
            className={`relative flex items-center gap-[var(--card-head-gap,12px)] min-w-0 flex-1 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${styles.ring}`}
          >
            <span
              data-sq="ctl-sm"
              data-sq-border="solid"
              className={`relative w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] border flex items-center justify-center shrink-0 ${styles.iconWell}`}
            >
              {config.icon}
            </span>
            <span className="min-w-0 flex-1 flex flex-col gap-[var(--title-cap-gap,2px)]">
              <span className="flex items-baseline gap-[var(--s2,8px)] min-w-0">
                <span
                  className={`t-card dark:font-medium text-[var(--text-1)] dark:text-white truncate transition-colors ${styles.titleHover}`}
                >
                  {config.title}
                </span>
                <span
                  className={`t-label font-semibold tabular-nums shrink-0 ${styles.accentText}`}
                >
                  {countDisplay}
                </span>
              </span>
              {config.subtitle && (
                <span className="block t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
                  {config.subtitle}
                </span>
              )}
            </span>
          </button>

          {/* Fast North-East Navigation Trigger (40x40 minimum touch target) */}
          <button
            type="button"
            data-no-liquid="true"
            onClick={navigate}
            aria-label={`${strings.openModule} ${config.title}`}
            title={`${strings.openModule} ${config.title}`}
            className={`group/nav w-[var(--btn-h,40px)] h-[var(--btn-h,40px)] rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ${styles.neButton} ${styles.ring}`}
          >
            <ArrowUpRight
              size={16}
              strokeWidth={1.5}
              className="rtl:-scale-x-100 transition-transform duration-200 ease-out ltr:group-hover/nav:translate-x-0.5 rtl:group-hover/nav:-translate-x-0.5 group-hover/nav:-translate-y-0.5 motion-reduce:transform-none"
            />
          </button>
        </div>

        {/* Top 3 Live Rows or Clean Empty Prompt (Zero Nested Card Border) */}
        {config.items.length > 0 ? (
          <ul className={`divide-y ${styles.divider}`}>
            {config.items.slice(0, 3).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  data-no-liquid="true"
                  data-sq="row"
                  data-sq-border="none"
                  onClick={() => {
                    if (row.onClick) {
                      row.onClick();
                    } else {
                      navigate();
                    }
                  }}
                  className={`relative w-full py-[var(--s2,8px)] flex items-center justify-between gap-[var(--s3,12px)] text-start transition-colors cursor-pointer group/row ${styles.rowHover}`}
                >
                  <div className="flex items-center gap-[var(--s2,8px)] min-w-0 flex-1">
                    {row.statusTone && (
                      <span
                        aria-hidden="true"
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_COLOR[row.statusTone]}`}
                      />
                    )}
                    <div className="min-w-0 flex-1 flex flex-col gap-[var(--title-cap-gap,2px)]">
                      <div
                        className={`t-label dark:font-medium text-[var(--text-1)] dark:text-white truncate transition-colors ${styles.titleHover}`}
                      >
                        {row.primary}
                      </div>
                      {row.secondary && (
                        <div className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate tabular-nums">
                          {row.secondary}
                        </div>
                      )}
                    </div>
                  </div>

                  {row.trailing && (
                    <span className="t-small font-semibold text-[var(--text-1)] dark:text-white/85 tabular-nums whitespace-nowrap shrink-0">
                      {row.trailing}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
            <KineticEmptyStateMotion motionKey={`home-${config.id}-${language}`}>
              <EmptyState
                variant="compact"
                tone="neutral"
                icon={config.icon}
                title={config.emptyTitle}
                secondaryAction={{
                  label: config.emptyCtaLabel,
                  icon: <ArrowUpRight size={16} strokeWidth={1.5} className="rtl:-scale-x-100" />,
                  onClick: config.onEmptyAction || navigate,
                }}
              />
            </KineticEmptyStateMotion>
          </div>
        )}
      </div>

      {/* Card Footer Navigation Link (suppressed on empty states per spec) */}
      {config.items.length > 0 && (
        <div
          className={`pt-[var(--footer-gap,16px)] border-t flex items-center justify-between gap-[var(--s2,8px)] shrink-0 ${styles.divider}`}
        >
          <span className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate tabular-nums">
            {config.countLabel || `${countDisplay}`}
          </span>
          <button
            type="button"
            data-no-liquid="true"
            onClick={navigate}
            className={`group/foot inline-flex items-center gap-[var(--s1,4px)] t-btn font-semibold hover:underline cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${styles.ring} rounded-[var(--r-check,6px)] ${styles.footerLink}`}
          >
            <span>{config.viewAllLabel || strings.viewAll}</span>
            <ArrowUpRight
              size={16}
              strokeWidth={1.5}
              className="rtl:-scale-x-100 transition-transform duration-200 ltr:group-hover/foot:translate-x-0.5 rtl:group-hover/foot:-translate-x-0.5 group-hover/foot:-translate-y-0.5 motion-reduce:transform-none"
            />
          </button>
        </div>
      )}
    </div>
  );
});

HomePreviewCard.displayName = 'HomePreviewCard';

export interface HomeCompactStripProps {
  config: HomeCompactStripConfig;
  className?: string;
}

/**
 * Compact horizontal shortcut strip used when the Pulse pod pairs Anchor + Preview + Team/Secondary route
 * while staying cleanly within the fixed desktop viewport budget.
 */
export const HomeCompactStrip: React.FC<HomeCompactStripProps> = ({
  config,
  className = '',
}) => {
  const { language } = useTranslation();
  const strings = getHomeStrings(language);
  const styles = TONE_STYLES[resolveTone(config.id, config.tone || 'lavender')];

  const navigate = () => {
    if (config.onNavigate) {
      config.onNavigate();
      return;
    }
    setScreenAction(config.targetScreen);
    if (config.targetPmSubScreen) {
      setActivePmSubScreenAction(config.targetPmSubScreen);
    }
  };

  return (
    <button
      type="button"
      data-no-liquid="true"
      data-sq="card"
      data-sq-border="solid"
      onClick={navigate}
      data-testid={`home-strip-${config.id}`}
      className={`group/card sq-elev-card sq-elev-card-hover relative overflow-hidden w-full text-start border px-[var(--card-pad,20px)] py-[var(--s3,12px)] flex items-center justify-between gap-[var(--card-head-gap,12px)] transition-colors duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 ${styles.card} ${styles.ring} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[2px] ${styles.topAccent}`}
      />
      <div className="flex items-center gap-[var(--card-head-gap,12px)] min-w-0 flex-1">
        <span
          data-sq="ctl-sm"
          data-sq-border="solid"
          className={`relative w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] border flex items-center justify-center shrink-0 ${styles.iconWell}`}
        >
          {config.icon}
        </span>
        <div className="min-w-0 flex-1 flex flex-col gap-[var(--title-cap-gap,2px)]">
          <div className="flex items-baseline gap-[var(--s2,8px)] min-w-0">
            <span
              className={`t-card dark:font-medium text-[var(--text-1)] dark:text-white truncate transition-colors ${styles.titleHover}`}
            >
              {config.title}
            </span>
            <span
              className={`t-label font-semibold tabular-nums shrink-0 ${styles.accentText}`}
            >
              {config.count}
            </span>
          </div>
          <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)] truncate">
            {config.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-[var(--s2,8px)] shrink-0">
        {config.statusText && (
          <span className="hidden sm:inline t-small font-semibold text-[var(--text-2)] dark:text-white/75 tabular-nums whitespace-nowrap">
            {config.statusText}
          </span>
        )}
        <span
          aria-hidden="true"
          title={`${strings.openModule} ${config.title}`}
          className={`w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150 ${styles.neButton}`}
        >
          <ArrowUpRight
            size={16}
            strokeWidth={1.5}
            className="rtl:-scale-x-100 transition-transform duration-200 ltr:group-hover/card:translate-x-0.5 rtl:group-hover/card:-translate-x-0.5 group-hover/card:-translate-y-0.5 motion-reduce:transform-none"
          />
        </span>
      </div>
    </button>
  );
};
