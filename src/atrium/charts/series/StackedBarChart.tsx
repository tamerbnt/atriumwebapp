import React, { useCallback, useMemo, useRef, useState } from 'react';
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
const POS_H = 140;
const NEG_H = 26;
const LIFT_PX = 2;

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
    filter,
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
    const rectRef = useRef<DOMRect | null>(null);

    const [internalPeriodId, setInternalPeriodId] = useState<string>(
      () => activePeriodId || periods?.[0]?.id || ''
    );
    const resolvedPeriodId = activePeriodId ?? internalPeriodId;
    const [hiddenIds, setHiddenIds] = useState<Record<string, boolean>>({});
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const activeIdxRef = useRef<number | null>(null);
    activeIdxRef.current = activeIdx;
    const [lastIdx, setLastIdx] = useState<number>(0);

    const periodOptions = useMemo(
      () => (periods && periods.length > 1 ? periods.map((p) => ({ id: p.id, label: p.label })) : undefined),
      [periods]
    );

    const handlePeriodChange = useCallback(
      (id: string) => {
        setInternalPeriodId(id);
        activeIdxRef.current = null;
        setActiveIdx(null);
        onPeriodChange?.(id);
      },
      [onPeriodChange]
    );

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

    const visibleSeries = useMemo(() => activeSeries.filter((s) => !s.hidden), [activeSeries]);
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

    const reversedTicks = useMemo(
      () => [...metrics.scale.ticks].reverse(),
      [metrics.scale.ticks]
    );

    const headline =
      currentPeriod?.headlineValue !== undefined
        ? currentPeriod.headlineValue
        : metrics.sumTotal;

    const setScrubIdx = useCallback((idx: number | null) => {
      if (idx === activeIdxRef.current) return;
      activeIdxRef.current = idx;
      setActiveIdx(idx);
      if (idx !== null) setLastIdx(idx);
    }, []);

    const onKeyDown = useChartKeyboardScrub(
      activeBuckets.length,
      activeIdx,
      setScrubIdx,
      isRtl
    );

    const toggleSeries = (id: string) => {
      setHiddenIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePlotEnter = () => {
      if (plotRef.current) {
        rectRef.current = plotRef.current.getBoundingClientRect();
      }
    };

    const handlePlotPointer = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!plotRef.current || activeBuckets.length === 0) return;
      const rect = rectRef.current || plotRef.current.getBoundingClientRect();
      rectRef.current = rect;
      if (rect.width <= 0) return;
      const rawFrac = (e.clientX - rect.left) / rect.width;
      const frac = Math.max(0, Math.min(0.9999, isRtl ? 1 - rawFrac : rawFrac));
      const idx = Math.floor(frac * activeBuckets.length);
      setScrubIdx(idx);
    };

    const avgRatio =
      metrics.scale.max > 0 ? Math.min(1, metrics.avg / metrics.scale.max) : 0;

    const activeBucket =
      activeIdx !== null && activeBuckets[activeIdx] ? activeBuckets[activeIdx] : null;
    const tipBucketIndex = activeIdx !== null ? activeIdx : Math.min(lastIdx, Math.max(0, activeBuckets.length - 1));
    const tipBucket = activeBuckets[tipBucketIndex] || null;
    const activeBucketTotal =
      activeIdx !== null ? metrics.totals[activeIdx] ?? 0 : headline;

    // Tight spring bounding ring geometry (wraps active bar stack + optional below-zero bar)
    const nCols = Math.max(1, activeBuckets.length);
    const ringGeometry = useMemo(() => {
      const idx = Math.min(lastIdx, nCols - 1);
      const colPct = 100 / nCols;
      const leftPct = (isRtl ? nCols - 1 - idx : idx) * colPct;
      const posVal = metrics.totals[idx] || 0;
      const posRatio = metrics.scale.max > 0 ? Math.min(1, posVal / metrics.scale.max) : 0;
      const posPx = Math.max(posVal > 0 ? 6 : 0, posRatio * (POS_H - LIFT_PX));
      const cancelVal = Math.max(0, activeBuckets[idx]?.cancelled || 0);
      const cancelPx =
        hasAnyCancelled && metrics.maxCancel > 0 && cancelVal > 0
          ? Math.max(6, (cancelVal / metrics.maxCancel) * (NEG_H - 4))
          : 0;

      const topPx = Math.max(0, POS_H - LIFT_PX - posPx - 4);
      const bottomEdgePx = POS_H + (cancelPx > 0 ? cancelPx + 6 : 2);
      const heightPx = Math.max(18, bottomEdgePx - topPx);

      const centerPct = leftPct + colPct / 2;
      const flipToLeftSide = centerPct > 56;

      return {
        leftPct,
        colPct,
        topPx,
        heightPx,
        centerPct,
        flipToLeftSide,
      };
    }, [lastIdx, nCols, isRtl, metrics.totals, metrics.scale.max, metrics.maxCancel, activeBuckets, hasAnyCancelled]);

    const ariaSummary = `${title}: ${formatChartValue(headline, {
      locale,
      format,
      currency,
      unit,
    })}, ${activeBuckets.length} ${strings.periodsWord}`;

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
        filter={!(periods && periods.length > 1) ? filter : undefined}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          periodOptions ? (
            <ChartSegmented
              options={periodOptions}
              value={currentPeriod?.id || ''}
              onChange={handlePeriodChange}
              isRtl={isRtl}
              ariaLabel={title}
            />
          ) : undefined
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-[var(--s2,8px)] ax-tk">
            {showAverage ? (
              <span>
                {averageLabel || strings.avgLabel}:{' '}
                <strong className="font-semibold text-[var(--ax-on)]" dir="ltr">
                  {formatChartValue(metrics.avg, { locale, format, currency, unit })}
                </strong>
              </span>
            ) : (
              <span />
            )}
            <span>
              {activeBuckets.length} {strings.periodsWord}
            </span>
          </div>
        }
      >
        {/* Filter Pills (.leg2) positioned cleanly above headline figure */}
        <div className="flex flex-wrap items-center gap-[var(--s2,8px)]">
          {activeSeries.map((s) => (
            <button
              key={s.id}
              type="button"
              data-no-liquid="true"
              onClick={() => toggleSeries(s.id)}
              aria-pressed={!s.hidden}
              className="ax-leg-pill"
            >
              <span
                className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                style={{ background: s.color }}
              />
              <span>{s.label}</span>
            </button>
          ))}
          {hasAnyCancelled && (
            <span className="inline-flex items-center gap-[var(--pill-gap,6px)] h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full border border-[var(--ax-bdr)] t-small text-[var(--ax-sub)]">
              <span className="w-2.5 h-2.5 rounded-[3px] ax-es border border-[var(--ax-bdr)] shrink-0" />
              <span>{cancelledLabel || strings.cancelledLabel}</span>
            </span>
          )}
        </div>

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
              <span aria-hidden="true">{currentPeriod.deltaPercent >= 0 ? '▲' : '▼'}</span>
              <span dir="ltr">
                {formatChartValue(currentPeriod.deltaPercent, {
                  locale,
                  format: 'percent',
                  signed: true,
                  maximumFractionDigits: 1,
                })}
              </span>
            </span>
          )}
        </div>

        {/* Plot */}
        <div className="relative flex gap-2.5 pt-1">
          {/* Y-axis ticks aligned strictly to positive 0..max zone above hatched baseline */}
          <div
            className="flex flex-col justify-between items-end shrink-0 ax-tk select-none"
            style={{ height: POS_H }}
            aria-hidden="true"
          >
            {reversedTicks.map((tick, idx) => (
              <span key={idx} className="leading-none -translate-y-0.5">
                {formatCompactTick(tick, locale)}
              </span>
            ))}
          </div>

          <div
            ref={plotRef}
            tabIndex={0}
            role="img"
            aria-label={ariaSummary}
            onPointerEnter={handlePlotEnter}
            onPointerMove={handlePlotPointer}
            onPointerLeave={() => {
              rectRef.current = null;
              setScrubIdx(null);
            }}
            onKeyDown={onKeyDown}
            className="relative flex-1 min-w-0 ax-plot-focus select-none cursor-pointer"
          >
            <div key={currentPeriod?.id || 'default'} className="relative w-full">
              {/* Spring-gliding tight bounding ring around hovered column (matches Main.dc.html #ring) */}
              <span
                className="ax-ring"
                data-active={activeBucket ? 'true' : 'false'}
                aria-hidden="true"
                style={{
                  left: `${ringGeometry.leftPct}%`,
                  width: `${ringGeometry.colPct}%`,
                  top: `${ringGeometry.topPx}px`,
                  height: `${ringGeometry.heightPx}px`,
                }}
              />

              {/* Floating black high-contrast data rectangle (.ax-tip) */}
              {tipBucket && (
                <div
                  className="ax-tip"
                  data-open={activeBucket ? 'true' : 'false'}
                  style={{
                    top: 4,
                    left: ringGeometry.flipToLeftSide
                      ? `clamp(2px, calc(${ringGeometry.leftPct}% - min(196px, 66cqw) - 8px), calc(100% - min(196px, 66cqw) - 2px))`
                      : `clamp(2px, calc(${ringGeometry.leftPct + ringGeometry.colPct}% + 8px), calc(100% - min(196px, 66cqw) - 2px))`,
                  }}
                  aria-hidden={!activeBucket}
                >
                  <div className="ax-tip-box" data-sq="ctl" data-sq-border="solid">
                    <div className="ax-tip-hd">
                      <span className="ax-tip-lbl">{tipBucket.label}</span>
                      <span className="ax-tip-tot" dir="ltr">
                        {formatChartValue(metrics.totals[tipBucketIndex] || 0, {
                          locale,
                          format,
                          currency,
                          unit,
                        })}
                      </span>
                    </div>
                    {visibleSeries.map((s) => (
                      <div key={s.id} className="ax-tip-row">
                        <span className="ax-tip-key">
                          <span className="ax-tip-sw" style={{ background: s.color }} />
                          <span>{s.label}</span>
                        </span>
                        <span className="ax-tip-val" dir="ltr">
                          {formatChartValue(Math.max(0, tipBucket.values[s.id] || 0), {
                            locale,
                            format,
                            currency,
                            unit,
                          })}
                        </span>
                      </div>
                    ))}
                    {hasAnyCancelled && (tipBucket.cancelled || 0) > 0 && (
                      <div className="ax-tip-row">
                        <span className="ax-tip-key">
                          <span
                            className="ax-tip-sw ax-es"
                            style={{
                              border: '1px solid color-mix(in srgb, var(--ax-tip-on) 30%, transparent)',
                            }}
                          />
                          <span>{cancelledLabel || strings.cancelledLabel}</span>
                        </span>
                        <span
                          className="ax-tip-val"
                          dir="ltr"
                          style={{ color: 'var(--ax-tip-acc)' }}
                        >
                          -
                          {formatChartValue(tipBucket.cancelled || 0, {
                            locale,
                            format,
                            currency,
                            unit,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Positive 0..max Zone with 2px baseline lift */}
              <div className="relative w-full" style={{ height: POS_H }}>
                {metrics.scale.ticks.map((tick, idx) => {
                  const pct =
                    metrics.scale.ticks.length > 1
                      ? (idx / (metrics.scale.ticks.length - 1)) * 100
                      : 0;
                  return (
                    <div
                      key={idx}
                      className={`absolute inset-x-0 pointer-events-none ${
                        tick === 0
                          ? 'border-t border-[var(--ax-on)]/25'
                          : 'border-t border-dashed border-[var(--ax-bdr)] opacity-75'
                      }`}
                      style={{ bottom: `${pct}%` }}
                    />
                  );
                })}

                {/* Moving average dashed hairline with right-aligned badge */}
                {showAverage && metrics.avg > 0 && (
                  <div
                    className="absolute inset-x-0 border-t-[1.5px] border-dashed border-[var(--ax-acc)] pointer-events-none z-20 flex justify-end"
                    style={{ bottom: `${avgRatio * 100}%` }}
                  >
                    <span className="inline-flex items-center h-[var(--badge-h,22px)] px-[var(--badge-px,6px)] me-[var(--s1,4px)] -translate-y-1/2 rounded-[var(--r-check,6px)] border border-[var(--ax-acc)]/35 bg-[var(--ax-slab)] t-small text-[var(--ax-acc)] font-semibold shadow-xs">
                      {averageLabel || strings.avgLabel}
                    </span>
                  </div>
                )}

                {/* Positive Stacked Columns (2px lift from baseline + 2px air gap between slices) */}
                <div
                  className="relative z-10 h-full grid gap-[6px] items-end pb-[2px] px-[2px]"
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
                    const delayStyle = {
                      '--ax-delay': `${Math.min(idx * 16, 260)}ms`,
                    } as React.CSSProperties;

                    return (
                      <div
                        key={`${bucket.label}-${idx}`}
                        className="relative h-full flex flex-col justify-end items-center transition-opacity duration-200"
                        style={{ opacity: isDimmed ? 0.3 : 1 }}
                      >
                        <div
                          className="ax-col-enter relative z-10 w-full flex flex-col justify-end"
                          style={{
                            ...delayStyle,
                            height: `${Math.max(positiveHeightPct, metrics.totals[idx] > 0 ? 3 : 0)}%`,
                          }}
                        >
                          <div className="ax-bar-y w-full h-full flex flex-col-reverse gap-[2px] overflow-hidden rounded-t-[5px]">
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
                                  className="w-full rounded-[3px]"
                                  style={{
                                    height: `${slicePct}%`,
                                    background: s.color,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hatched negative/cancelled bars hanging strictly below 0 baseline */}
              {hasAnyCancelled && (
                <div
                  className="grid gap-[6px] px-[2px] pt-[3px]"
                  style={{
                    height: NEG_H,
                    gridTemplateColumns: `repeat(${activeBuckets.length}, minmax(0, 1fr))`,
                  }}
                >
                  {activeBuckets.map((bucket, idx) => {
                    const isActive = activeIdx === idx;
                    const isDimmed = activeIdx !== null && !isActive;
                    const cancelRatio =
                      metrics.maxCancel > 0
                        ? Math.min(1, Math.max(0, bucket.cancelled || 0) / metrics.maxCancel)
                        : 0;
                    const negDelayStyle = {
                      '--ax-delay': `${Math.min(idx * 16 + 60, 320)}ms`,
                    } as React.CSSProperties;
                    return (
                      <div
                        key={`neg-${idx}`}
                        className="h-full flex items-start justify-center transition-opacity duration-200"
                        style={{ opacity: isDimmed ? 0.3 : 1 }}
                      >
                        {(bucket.cancelled || 0) > 0 && (
                          <div
                            className="ax-col-neg-enter w-full ax-es rounded-b-[4px] border border-[var(--ax-on)]/25"
                            style={{
                              ...negDelayStyle,
                              height: `${Math.max(26, cancelRatio * 100)}%`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* X-axis labels */}
            <div
              className="grid gap-[6px] pt-1.5 text-center ax-tk"
              style={{
                gridTemplateColumns: `repeat(${activeBuckets.length}, minmax(0, 1fr))`,
              }}
            >
              {activeBuckets.map((b, idx) => (
                <span
                  key={idx}
                  className={`truncate transition-colors duration-150 ${
                    activeIdx === idx ? 'text-[var(--ax-acc)] font-semibold' : ''
                  }`}
                >
                  {b.shortLabel || b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>
    );
  }
);

StackedBarChart.displayName = 'StackedBarChart';
