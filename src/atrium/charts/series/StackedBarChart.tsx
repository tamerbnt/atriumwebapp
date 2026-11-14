import React, { useMemo, useRef, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { ChartSegmented } from '../primitives/ChartSegmented';
import { RollingDigits } from '../primitives/RollingDigits';
import { useChartKeyboardScrub, useIsRtl } from '../hooks';
import {
  formatChartValue,
  formatCompactTick,
  getDefaultChartStrings,
  niceScale,
} from '../math';
import { StackedBarChartProps } from '../types';

const DEFAULT_SERIES_COLORS = ['var(--ax-c1)', 'var(--ax-c3)', 'var(--ax-c4)', 'var(--ax-c5)'];

export const StackedBarChart: React.FC<StackedBarChartProps> = React.memo(
  ({
    title,
    subtitle,
    helpText,
    locale = 'fr',
    surface = 'auto',
    inlineDark = false,
    state = 'ready',
    emptyMessage,
    errorMessage,
    onRetry,
    className = '',
    'data-testid': testId,
    series,
    buckets,
    periods,
    activePeriodId,
    onPeriodChange,
    cancelledLabel,
    showAverage = true,
    averageLabel,
    format = 'number',
    currency = 'DZD',
    unit,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const plotRef = useRef<HTMLDivElement>(null);

    const [internalPeriodId, setInternalPeriodId] = useState<string>(
      () => activePeriodId || periods?.[0]?.id || ''
    );
    const resolvedPeriodId = activePeriodId ?? internalPeriodId;
    const [hiddenIds, setHiddenIds] = useState<Record<string, boolean>>({});
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const handlePeriodChange = (id: string) => {
      setInternalPeriodId(id);
      setActiveIdx(null);
      onPeriodChange?.(id);
    };

    const currentPeriod = useMemo(() => {
      if (!periods || periods.length === 0) return null;
      return periods.find((p) => p.id === resolvedPeriodId) || periods[0];
    }, [periods, resolvedPeriodId]);

    const activeBuckets = currentPeriod ? currentPeriod.buckets : buckets || [];
    const activeSeries = useMemo(
      () =>
        series.map((s, idx) => ({
          ...s,
          color: s.color || DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length],
          hidden: !!hiddenIds[s.id],
        })),
      [series, hiddenIds]
    );

    const visibleSeries = activeSeries.filter((s) => !s.hidden);
    const hasAnyCancelled = useMemo(
      () => activeBuckets.some((b) => typeof b.cancelled === 'number' && b.cancelled > 0),
      [activeBuckets]
    );

    const isEmpty = state === 'ready' && (activeBuckets.length === 0 || series.length === 0);
    const effectiveState = isEmpty ? 'empty' : state;

    const metrics = useMemo(() => {
      const totals = activeBuckets.map((b) =>
        visibleSeries.reduce((sum, s) => sum + Math.max(0, b.values[s.id] || 0), 0)
      );
      const maxPos = totals.length > 0 ? Math.max(...totals, 1) : 1;
      const maxCancel = hasAnyCancelled
        ? Math.max(...activeBuckets.map((b) => Math.max(0, b.cancelled || 0)), 0)
        : 0;

      const scale = niceScale(0, maxPos, 4);
      const sumTotal = totals.reduce((a, b) => a + b, 0);
      const avg = totals.length > 0 ? sumTotal / totals.length : 0;

      return { totals, maxCancel, scale, sumTotal, avg };
    }, [activeBuckets, visibleSeries, hasAnyCancelled]);

    const headline =
      currentPeriod?.headlineValue !== undefined
        ? currentPeriod.headlineValue
        : metrics.sumTotal;

    const onKeyDown = useChartKeyboardScrub(
      activeBuckets.length,
      activeIdx,
      setActiveIdx,
      isRtl
    );

    const toggleSeries = (id: string) => {
      setHiddenIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePlotPointer = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!plotRef.current || activeBuckets.length === 0) return;
      const rect = plotRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawFrac = (e.clientX - rect.left) / rect.width;
      const frac = Math.max(0, Math.min(0.9999, isRtl ? 1 - rawFrac : rawFrac));
      const idx = Math.floor(frac * activeBuckets.length);
      setActiveIdx(idx);
    };

    const avgRatio =
      metrics.scale.max > 0 ? Math.min(1, metrics.avg / metrics.scale.max) : 0;

    const activeBucket =
      activeIdx !== null && activeBuckets[activeIdx] ? activeBuckets[activeIdx] : null;
    const activeBucketTotal =
      activeIdx !== null ? metrics.totals[activeIdx] ?? 0 : headline;

    const ariaSummary = `${title}: ${formatChartValue(headline, {
      locale,
      format,
      currency,
      unit,
    })}, ${activeBuckets.length} périodes`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="bars"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          periods && periods.length > 1 ? (
            <ChartSegmented
              options={periods.map((p) => ({ id: p.id, label: p.label }))}
              value={currentPeriod?.id || ''}
              onChange={handlePeriodChange}
              isRtl={isRtl}
              ariaLabel={title}
            />
          ) : undefined
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {activeSeries.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSeries(s.id)}
                  aria-pressed={!s.hidden}
                  className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium cursor-pointer transition-opacity ${
                    s.hidden ? 'opacity-40 line-through' : 'opacity-95 hover:opacity-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-[var(--ax-sub)]">{s.label}</span>
                </button>
              ))}
              {hasAnyCancelled && (
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--ax-sub)]">
                  <span className="w-2.5 h-2.5 rounded-[3px] ax-es border border-[var(--ax-bdr)] shrink-0" />
                  <span>{cancelledLabel || 'Annulés'}</span>
                </span>
              )}
            </div>
            {showAverage && (
              <span className="ax-tk">
                {averageLabel || strings.avgLabel}:{' '}
                {formatChartValue(metrics.avg, { locale, format, currency, unit })}
              </span>
            )}
          </div>
        }
      >
        {/* Headline Total */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="ax-disp ax-big-plot text-[var(--ax-on)]">
              <RollingDigits
                value={formatChartValue(activeBucket ? activeBucketTotal : headline, {
                  locale,
                  format,
                  currency,
                  unit,
                })}
              />
            </span>
            {activeBucket && (
              <span className="ax-tk text-[var(--ax-acc)] font-semibold">
                {activeBucket.label}
              </span>
            )}
          </div>
          {currentPeriod?.deltaPercent !== undefined && !activeBucket && (
            <span
              className={`ax-chip ${
                currentPeriod.deltaPercent >= 0 ? 'ax-chip-ok' : 'ax-chip-bad'
              }`}
            >
              {currentPeriod.deltaPercent >= 0 ? '▲' : '▼'}{' '}
              {formatChartValue(currentPeriod.deltaPercent, {
                locale,
                format: 'percent',
                signed: true,
                maximumFractionDigits: 1,
              })}
            </span>
          )}
        </div>

        {/* Plot */}
        <div className="relative flex gap-2.5 pt-2">
          {/* Y-axis ticks */}
          <div
            className="flex flex-col justify-between items-end shrink-0 pb-6 ax-tk select-none"
            style={{ height: hasAnyCancelled ? 188 : 162 }}
            aria-hidden="true"
          >
            {[...metrics.scale.ticks].reverse().map((tick, idx) => (
              <span key={idx} className="leading-none">
                {formatCompactTick(tick, locale)}
              </span>
            ))}
          </div>

          <div
            ref={plotRef}
            tabIndex={0}
            role="img"
            aria-label={ariaSummary}
            onPointerMove={handlePlotPointer}
            onPointerLeave={() => setActiveIdx(null)}
            onKeyDown={onKeyDown}
            className="relative flex-1 min-w-0 ax-plot-focus select-none cursor-pointer"
          >
            {/* Gridlines */}
            <div
              className="relative w-full"
              style={{ height: hasAnyCancelled ? 164 : 138 }}
            >
              {metrics.scale.ticks.map((_, idx) => {
                const pct =
                  metrics.scale.ticks.length > 1
                    ? (idx / (metrics.scale.ticks.length - 1)) * 100
                    : 0;
                return (
                  <div
                    key={idx}
                    className="absolute inset-x-0 border-t border-dashed border-[var(--ax-bdr)] pointer-events-none"
                    style={{ bottom: `${hasAnyCancelled ? 26 + pct * 0.84 : pct}%` }}
                  />
                );
              })}

              {/* Moving average guide line */}
              {showAverage && metrics.avg > 0 && (
                <div
                  className="absolute inset-x-0 border-t-[1.5px] border-dashed border-[var(--ax-acc)] pointer-events-none z-10"
                  style={{
                    bottom: `${
                      hasAnyCancelled ? 26 + avgRatio * 84 : avgRatio * 100
                    }%`,
                  }}
                />
              )}

              {/* Columns */}
              <div
                className="relative z-10 h-full grid gap-1.5 items-end"
                style={{
                  gridTemplateColumns: `repeat(${activeBuckets.length}, minmax(0, 1fr))`,
                }}
              >
                {activeBuckets.map((bucket, idx) => {
                  const isActive = activeIdx === idx;
                  const isDimmed = activeIdx !== null && !isActive;
                  const positiveHeightPct =
                    metrics.scale.max > 0
                      ? Math.min(100, (metrics.totals[idx] / metrics.scale.max) * 100)
                      : 0;
                  const cancelRatio =
                    hasAnyCancelled && metrics.maxCancel > 0
                      ? Math.min(1, Math.max(0, bucket.cancelled || 0) / metrics.maxCancel)
                      : 0;

                  return (
                    <div
                      key={`${bucket.label}-${idx}`}
                      className="h-full flex flex-col justify-end items-center transition-opacity duration-150"
                      style={{ opacity: isDimmed ? 0.35 : 1 }}
                    >
                      {/* Positive stack */}
                      <div
                        className="w-full flex flex-col justify-end"
                        style={{ height: hasAnyCancelled ? 'calc(100% - 26px)' : '100%' }}
                      >
                        <div
                          className="ax-bar-y w-full flex flex-col-reverse overflow-hidden rounded-t-[6px]"
                          style={{
                            height: `${Math.max(positiveHeightPct, metrics.totals[idx] > 0 ? 3 : 0)}%`,
                            boxShadow: isActive ? '0 0 0 2px var(--ax-acc)' : undefined,
                          }}
                        >
                          {visibleSeries.map((s) => {
                            const val = Math.max(0, bucket.values[s.id] || 0);
                            const slicePct =
                              metrics.totals[idx] > 0
                                ? (val / metrics.totals[idx]) * 100
                                : 0;
                            if (slicePct <= 0) return null;
                            return (
                              <div
                                key={s.id}
                                style={{
                                  height: `${slicePct}%`,
                                  background: s.color,
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Negative / Cancelled hatched baseline */}
                      {hasAnyCancelled && (
                        <div className="w-full h-[26px] border-t border-[var(--ax-bdr)] flex items-start justify-center pt-[2px]">
                          {(bucket.cancelled || 0) > 0 && (
                            <div
                              className="w-full ax-es rounded-b-[4px] border border-[var(--ax-bdr)]"
                              style={{ height: `${Math.max(20, cancelRatio * 100)}%` }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div
              className="grid gap-1.5 pt-1.5 text-center ax-tk"
              style={{
                gridTemplateColumns: `repeat(${activeBuckets.length}, minmax(0, 1fr))`,
              }}
            >
              {activeBuckets.map((b, idx) => (
                <span
                  key={idx}
                  className={`truncate ${
                    activeIdx === idx ? 'text-[var(--ax-on)] font-semibold' : ''
                  }`}
                >
                  {b.shortLabel || b.label}
                </span>
              ))}
            </div>

            {/* Floating Tip */}
            {activeBucket && activeIdx !== null && (
              <div
                className="ax-tip top-1"
                style={{
                  insetInlineStart: `${Math.min(
                    76,
                    Math.max(4, ((activeIdx + 0.5) / activeBuckets.length) * 100 - 12)
                  )}%`,
                }}
              >
                <div className="font-semibold mb-0.5">{activeBucket.label}</div>
                {visibleSeries.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <span className="opacity-75">{s.label}</span>
                    <span>
                      {formatChartValue(activeBucket.values[s.id] || 0, {
                        locale,
                        format,
                        currency,
                        unit,
                      })}
                    </span>
                  </div>
                ))}
                {hasAnyCancelled && (activeBucket.cancelled || 0) > 0 && (
                  <div className="flex items-center justify-between gap-3 opacity-80 border-t border-white/15 mt-1 pt-0.5">
                    <span>{cancelledLabel || 'Annulés'}</span>
                    <span>
                      {formatChartValue(activeBucket.cancelled || 0, {
                        locale,
                        format,
                        currency,
                        unit,
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ChartCard>
    );
  }
);

StackedBarChart.displayName = 'StackedBarChart';
