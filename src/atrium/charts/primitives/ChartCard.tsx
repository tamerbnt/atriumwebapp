import React from 'react';
import { ChartInfoPopover } from './ChartInfoPopover';
import { ChartSegmented } from './ChartSegmented';
import { useInViewReveal, useIsRtl } from '../hooks';
import { getDefaultChartStrings } from '../math';
import { ChartCardFilter, ChartLocale, ChartSkeletonKind, ChartState, ChartSurface } from '../types';
import { EmptyState, EMPTY_STATE_ICONS } from '../../components/EmptyState';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  helpText?: string;
  locale?: ChartLocale;
  surface?: ChartSurface;
  inlineDark?: boolean;
  isKpi?: boolean;
  state?: ChartState;
  skeletonKind?: ChartSkeletonKind;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  filter?: ChartCardFilter;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  ariaSummary?: string;
  className?: string;
  'data-testid'?: string;
  children?: React.ReactNode;
}

const ChartSkeleton: React.FC<{ kind: ChartSkeletonKind }> = ({ kind }) => {
  if (kind === 'kpi') {
    return (
      <div className="flex flex-col gap-3 pt-1" aria-hidden="true">
        <div className="flex items-baseline justify-between gap-3">
          <div className="ax-skel-block h-11 w-28" />
          <div className="ax-skel-block h-5 w-16" />
        </div>
        <div className="ax-skel-block h-14 w-full" />
      </div>
    );
  }
  if (kind === 'donut' || kind === 'gauge') {
    return (
      <div className="flex items-center justify-center py-6" aria-hidden="true">
        <div className="ax-skel-block h-40 w-40 !rounded-full" />
      </div>
    );
  }
  if (kind === 'matrix' || kind === 'waffle') {
    return (
      <div className="grid grid-cols-10 gap-1.5 py-2" aria-hidden="true">
        {Array.from({ length: 40 }).map((_, idx) => (
          <div key={idx} className="ax-skel-block h-5 w-full" />
        ))}
      </div>
    );
  }
  if (kind === 'treemap') {
    return (
      <div className="grid grid-cols-3 gap-2 h-48" aria-hidden="true">
        <div className="ax-skel-block col-span-2 h-full" />
        <div className="grid grid-rows-2 gap-2 h-full">
          <div className="ax-skel-block h-full" />
          <div className="ax-skel-block h-full" />
        </div>
      </div>
    );
  }
  if (kind === 'list' || kind === 'timeline') {
    return (
      <div className="flex flex-col gap-3 py-2" aria-hidden="true">
        {[82, 66, 54, 38].map((pct, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="ax-skel-block h-3.5 w-24 shrink-0" />
            <div className="ax-skel-block h-3.5" style={{ width: `${pct}%` }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2.5 h-44 pt-4 px-2" aria-hidden="true">
      {[42, 68, 55, 84, 62, 91, 48].map((pct, idx) => (
        <div
          key={idx}
          className="ax-skel-block flex-1"
          style={{ height: `${pct}%` }}
        />
      ))}
    </div>
  );
};

/**
 * Shared Atrium Dashboard card shell (.ax-card parity) with container queries,
 * optional per-card filter control, ? help popover, and loading/empty/error states.
 */
export const ChartCard: React.FC<ChartCardProps> = React.memo(({
  title,
  subtitle,
  helpText,
  locale = 'fr',
  surface = 'auto',
  inlineDark = false,
  isKpi = false,
  state = 'ready',
  skeletonKind = 'bars',
  emptyMessage,
  errorMessage,
  onRetry,
  filter,
  headerRight,
  footer,
  ariaSummary,
  className = '',
  'data-testid': testId,
  children,
}) => {
  const [cardRef, isRevealed] = useInViewReveal();
  const isRtl = useIsRtl(locale);
  const strings = getDefaultChartStrings(locale);
  const resolvedDir = locale === 'ar' ? 'rtl' : undefined;
  const hasFilter = Boolean(filter && filter.options.length > 0);

  return (
    <section
      ref={cardRef}
      dir={resolvedDir}
      data-testid={testId}
      data-surface={surface !== 'auto' ? surface : undefined}
      data-inline-dark={inlineDark ? 'true' : undefined}
      data-kpi={isKpi ? 'true' : undefined}
      data-visible={isRevealed ? 'true' : 'false'}
      data-state={state}
      className={`ax-card ax-reveal ${className}`}
      aria-label={ariaSummary || title}
    >
      <div className="ax-card-bg" aria-hidden="true" data-sq="card" data-sq-border="solid" />
      <header className="ax-head">
        <div className="ax-head-meta">
          <div className="ax-title-row">
            <h3 className="ax-title">{title}</h3>
            {helpText && (
              <ChartInfoPopover text={helpText} ariaLabel={strings.helpLabel} />
            )}
          </div>
          {subtitle && <p className="ax-sub">{subtitle}</p>}
        </div>
        {(hasFilter || headerRight) && (
          <div className="ax-head-actions flex flex-col items-end gap-1.5 min-w-0 max-w-full">
            {hasFilter && filter && (
              <ChartSegmented
                options={filter.options}
                value={filter.value}
                onChange={filter.onChange}
                isRtl={isRtl}
                ariaLabel={filter.ariaLabel || title}
              />
            )}
            {headerRight && <div className="min-w-0 max-w-full">{headerRight}</div>}
          </div>
        )}
      </header>

      {state === 'loading' ? (
        <div role="status" aria-label={strings.loading}>
          <ChartSkeleton kind={skeletonKind} />
        </div>
      ) : state === 'error' ? (
        <EmptyState
          variant="compact"
          tone="error"
          icon={<EMPTY_STATE_ICONS.WifiSlash />}
          title={strings.error}
          description={errorMessage}
          primaryAction={
            onRetry
              ? {
                  label: strings.retry,
                  icon: <EMPTY_STATE_ICONS.ArrowClockwise />,
                  onClick: onRetry,
                }
              : undefined
          }
        />
      ) : state === 'empty' ? (
        <EmptyState
          variant="compact"
          tone="neutral"
          icon={<EMPTY_STATE_ICONS.Receipt />}
          title={emptyMessage || strings.empty}
        />
      ) : (
        children
      )}

      {footer && state === 'ready' && <footer className="pt-0.5">{footer}</footer>}
    </section>
  );
});

ChartCard.displayName = 'ChartCard';
