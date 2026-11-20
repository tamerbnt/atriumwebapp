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
    card: 'bg-white dark:bg-[#171413] border-[#E4D8CF] dark:border-[#2E2724] [--sq-stroke:#E4D8CF] dark:[--sq-stroke:#2E2724] hover:[--sq-stroke:rgba(212,82,47,0.55)] dark:hover:[--sq-stroke:rgba(251,146,60,0.55)]',
    topAccent: 'bg-[#d4522f]/80 dark:bg-[#FB923C]/75',
    iconWell:
      'bg-[#FCEEE9] dark:bg-[#2B1B17] border-[#F3D5CA] dark:border-[#492A20] [--sq-stroke:#F3D5CA] dark:[--sq-stroke:#492A20] text-[#B83B1B] dark:text-[#FB923C]',
    accentText: 'text-[#B83B1B] dark:text-[#FB923C]',
    titleHover: 'group-hover/card:text-[#B83B1B] dark:group-hover/card:text-[#FB923C]',
    divider: 'divide-[#EFE6DF] dark:divide-[#27211E] border-[#EFE6DF] dark:border-[#27211E]',
    rowHover: 'hover:bg-[#FDF6F3] dark:hover:bg-white/[0.035]',
    neButton:
      'bg-[#F7EEE8] dark:bg-white/[0.06] border-[#E6D7CC] dark:border-[#362E2A] text-[#3B2A20]/80 dark:text-white/80 hover:bg-[#d4522f] hover:border-[#d4522f] hover:text-white dark:hover:bg-[#FB923C] dark:hover:border-[#FB923C] dark:hover:text-[#151413]',
    ring: 'focus-visible:ring-[#d4522f]',
    footerLink: 'text-[#B83B1B] dark:text-[#FB923C]',
  },
  brown: {
    card: 'bg-[#FFFCF8] dark:bg-[#171310] border-[#E0D2C3] dark:border-[#352B22] [--sq-stroke:#E0D2C3] dark:[--sq-stroke:#352B22] hover:[--sq-stroke:rgba(124,78,45,0.6)] dark:hover:[--sq-stroke:rgba(217,169,126,0.55)]',
    topAccent: 'bg-[#7C4E2D]/85 dark:bg-[#D9A97E]/75',
    iconWell:
      'bg-[#F2E5D8] dark:bg-[#291F17] border-[#DFCBB7] dark:border-[#473526] [--sq-stroke:#DFCBB7] dark:[--sq-stroke:#473526] text-[#6B4122] dark:text-[#D9A97E]',
    accentText: 'text-[#6B4122] dark:text-[#D9A97E]',
    titleHover: 'group-hover/card:text-[#6B4122] dark:group-hover/card:text-[#D9A97E]',
    divider: 'divide-[#EFE4D8] dark:divide-[#2B231C] border-[#EFE4D8] dark:border-[#2B231C]',
    rowHover: 'hover:bg-[#F7EFE7] dark:hover:bg-[#241C16]/70',
    neButton:
      'bg-[#F2E5D8] dark:bg-[#251E18] border-[#DFCBB7] dark:border-[#3D3025] text-[#4A301C]/85 dark:text-[#EAD8C7] hover:bg-[#6B4122] hover:border-[#6B4122] hover:text-white dark:hover:bg-[#D9A97E] dark:hover:border-[#D9A97E] dark:hover:text-[#151413]',
    ring: 'focus-visible:ring-[#7C4E2D]',
    footerLink: 'text-[#6B4122] dark:text-[#D9A97E]',
  },
  lavender: {
    card: 'bg-[#FCFBFF] dark:bg-[#16141D] border-[#DCD3EC] dark:border-[#312A45] [--sq-stroke:#DCD3EC] dark:[--sq-stroke:#312A45] hover:[--sq-stroke:rgba(104,77,168,0.6)] dark:hover:[--sq-stroke:rgba(196,181,253,0.55)]',
    topAccent: 'bg-[#684DA8]/85 dark:bg-[#A78BFA]/75',
    iconWell:
      'bg-[#EFEBF9] dark:bg-[#231D36] border-[#D7CCF0] dark:border-[#3D325B] [--sq-stroke:#D7CCF0] dark:[--sq-stroke:#3D325B] text-[#5B41A1] dark:text-[#C4B5FD]',
    accentText: 'text-[#5B41A1] dark:text-[#C4B5FD]',
    titleHover: 'group-hover/card:text-[#5B41A1] dark:group-hover/card:text-[#C4B5FD]',
    divider: 'divide-[#ECE6F6] dark:divide-[#262136] border-[#ECE6F6] dark:border-[#262136]',
    rowHover: 'hover:bg-[#F4F0FC] dark:hover:bg-[#221D33]/70',
    neButton:
      'bg-[#EFEBF9] dark:bg-[#221D34] border-[#D7CCF0] dark:border-[#3A3056] text-[#3E2D6E]/85 dark:text-[#DED6FE] hover:bg-[#5B41A1] hover:border-[#5B41A1] hover:text-white dark:hover:bg-[#A78BFA] dark:hover:border-[#A78BFA] dark:hover:text-[#151413]',
    ring: 'focus-visible:ring-[#684DA8]',
    footerLink: 'text-[#5B41A1] dark:text-[#C4B5FD]',
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
      className={`group/card relative overflow-hidden h-full border p-3.5 sm:p-4 flex flex-col justify-between transition-colors duration-200 min-w-0 ${styles.card} ${className}`}
      data-testid={`home-preview-${config.id}`}
    >
      {/* Clean 2.5px Top Accent Hairline */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[2.5px] ${styles.topAccent}`}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Card Header + Top-Right North-East Arrow */}
        <div className="flex items-start justify-between gap-2.5 mb-2.5 shrink-0">
          <button
            type="button"
            data-no-liquid="true"
            data-sq="row"
            data-sq-border="none"
            onClick={navigate}
            className={`relative flex items-center gap-2.5 min-w-0 flex-1 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${styles.ring}`}
          >
            <span
              data-sq="ctl-sm"
              data-sq-border="solid"
              className={`relative w-8 h-8 border flex items-center justify-center shrink-0 ${styles.iconWell}`}
            >
              {config.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2 min-w-0">
                <span
                  className={`text-[14.5px] font-bold text-black dark:text-white tracking-[-0.01em] truncate transition-colors ${styles.titleHover}`}
                >
                  {config.title}
                </span>
                <span
                  className={`text-[13px] font-bold tabular-nums shrink-0 font-['Barlow_Condensed',sans-serif] rtl:font-sans ${styles.accentText}`}
                >
                  {countDisplay}
                </span>
              </span>
              {config.subtitle && (
                <span className="block text-[11.5px] text-black/58 dark:text-white/58 truncate">
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
            className={`group/nav w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ${styles.neButton} ${styles.ring}`}
          >
            <ArrowUpRight
              size={16}
              strokeWidth={2.2}
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
                  className={`relative w-full py-1.5 flex items-center justify-between gap-2.5 text-start px-1.5 -mx-1.5 transition-colors cursor-pointer group/row ${styles.rowHover}`}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {row.statusTone && (
                      <span
                        aria-hidden="true"
                        className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${STATUS_DOT_COLOR[row.statusTone]}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[13px] font-semibold text-black dark:text-white truncate leading-snug transition-colors ${styles.titleHover}`}
                      >
                        {row.primary}
                      </div>
                      {row.secondary && (
                        <div className="text-[11.5px] text-black/58 dark:text-white/58 truncate leading-tight tabular-nums">
                          {row.secondary}
                        </div>
                      )}
                    </div>
                  </div>

                  {row.trailing && (
                    <span className="text-[12px] font-semibold text-black/82 dark:text-white/85 tabular-nums whitespace-nowrap shrink-0">
                      {row.trailing}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1 flex flex-col justify-center py-1">
            <KineticEmptyStateMotion motionKey={`home-${config.id}-${language}`}>
              <EmptyState
                variant="compact"
                tone="neutral"
                icon={config.icon}
                title={config.emptyTitle}
                secondaryAction={{
                  label: config.emptyCtaLabel,
                  icon: <ArrowUpRight size={14} className="rtl:-scale-x-100" />,
                  onClick: config.onEmptyAction || navigate,
                }}
              />
            </KineticEmptyStateMotion>
          </div>
        )}
      </div>

      {/* Card Footer Navigation Link */}
      <div
        className={`pt-2 mt-2 border-t flex items-center justify-between gap-2 shrink-0 ${styles.divider}`}
      >
        <span className="text-[11px] font-medium text-black/55 dark:text-white/55 truncate tabular-nums">
          {config.countLabel || `${countDisplay}`}
        </span>
        <button
          type="button"
          data-no-liquid="true"
          onClick={navigate}
          className={`group/foot inline-flex items-center gap-1 text-[12px] font-semibold hover:underline cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${styles.ring} rounded ${styles.footerLink}`}
        >
          <span>{config.viewAllLabel || strings.viewAll}</span>
          <ArrowUpRight
            size={13.5}
            strokeWidth={2.2}
            className="rtl:-scale-x-100 transition-transform duration-200 ltr:group-hover/foot:translate-x-0.5 rtl:group-hover/foot:-translate-x-0.5 group-hover/foot:-translate-y-0.5 motion-reduce:transform-none"
          />
        </button>
      </div>
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
      className={`group/card relative overflow-hidden w-full text-start border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 ${styles.card} ${styles.ring} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[2px] ${styles.topAccent}`}
      />
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span
          data-sq="ctl-sm"
          data-sq-border="solid"
          className={`relative w-8 h-8 border flex items-center justify-center shrink-0 ${styles.iconWell}`}
        >
          {config.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className={`text-[13.5px] font-bold text-black dark:text-white tracking-[-0.01em] truncate transition-colors ${styles.titleHover}`}
            >
              {config.title}
            </span>
            <span
              className={`text-[12.5px] font-bold tabular-nums shrink-0 font-['Barlow_Condensed',sans-serif] rtl:font-sans ${styles.accentText}`}
            >
              {config.count}
            </span>
          </div>
          <p className="text-[11px] text-black/58 dark:text-white/58 truncate">
            {config.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {config.statusText && (
          <span className="hidden sm:inline text-[11.5px] font-semibold text-black/70 dark:text-white/75 tabular-nums whitespace-nowrap">
            {config.statusText}
          </span>
        )}
        <span
          aria-hidden="true"
          title={`${strings.openModule} ${config.title}`}
          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150 ${styles.neButton}`}
        >
          <ArrowUpRight
            size={15}
            strokeWidth={2.2}
            className="rtl:-scale-x-100 transition-transform duration-200 ltr:group-hover/card:translate-x-0.5 rtl:group-hover/card:-translate-x-0.5 group-hover/card:-translate-y-0.5 motion-reduce:transform-none"
          />
        </span>
      </div>
    </button>
  );
};
