import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { useChartKeyboardScrub, useIsRtl } from '../hooks';
import {
  computeMedianBucketIndex,
  formatChartValue,
  formatCompactTick,
  getDefaultChartStrings,
  niceScale,
} from '../math';
import { HistogramChartProps } from '../types';

export const HistogramChart: React.FC<HistogramChartProps> = React.memo(
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
    bins,
    highlightIndex,
    showMedian = true,
    medianLabel,
    otherBinsLabel,
    totalLabel,
    format = 'number',
    currency = 'DZD',
    unit,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const plotRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<DOMRect | null>(null);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const activeIdxRef = useRef<number | null>(null);
    activeIdxRef.current = activeIdx;

    const safeBins = useMemo(
      () =>
        (bins || []).map((b, idx) => ({
          id: b.id || `bin-${idx}`,
          label: b.label,
          value: Math.max(0, Number.isFinite(b.value) ? b.value : 0),
        })),
      [bins]
    );

    const metrics = useMemo(() => {
      const total = safeBins.reduce((s, b) => s + b.value, 0);
      const maxVal = safeBins.length > 0 ? Math.max(...safeBins.map((b) => b.value), 1) : 1;
      const scale = niceScale(0, maxVal, 4);
      const autoMedianIdx = showMedian ? computeMedianBucketIndex(safeBins) : -1;
      const resolvedHighlight =
        typeof highlightIndex === 'number' &&
        highlightIndex >= 0 &&
        highlightIndex < safeBins.length
          ? highlightIndex
          : autoMedianIdx;

      return { total, maxVal, scale, resolvedHighlight };
    }, [safeBins, showMedian, highlightIndex]);

    const reversedTicks = useMemo(
      () => [...metrics.scale.ticks].reverse(),
      [metrics.scale.ticks]
    );

    const setScrubIdx = useCallback((idx: number | null) => {
      if (idx === activeIdxRef.current) return;
      activeIdxRef.current = idx;
      setActiveIdx(idx);
    }, []);

    const isEmpty =
      state === 'ready' && (safeBins.length === 0 || metrics.total <= 0);
    const effectiveState = isEmpty ? 'empty' : state;

    const onKeyDown = useChartKeyboardScrub(
      safeBins.length,
      activeIdx,
      setScrubIdx,
      isRtl
    );

    const handlePointerEnter = () => {
      if (plotRef.current) {
        rectRef.current = plotRef.current.getBoundingClientRect();
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!plotRef.current || safeBins.length === 0) return;
      const rect = rectRef.current || plotRef.current.getBoundingClientRect();
      rectRef.current = rect;
      if (rect.width <= 0) return;
      const rawFrac = (e.clientX - rect.left) / rect.width;
      const frac = Math.max(0, Math.min(0.9999, isRtl ? 1 - rawFrac : rawFrac));
      setScrubIdx(Math.floor(frac * safeBins.length));
    };

    const activeBin =
      activeIdx !== null && safeBins[activeIdx] ? safeBins[activeIdx] : null;
    const medianBin =
      metrics.resolvedHighlight >= 0 ? safeBins[metrics.resolvedHighlight] : null;

    const ariaSummary = `${title}: ${safeBins.length} ${strings.bucketsWord}${
      medianBin ? `, ${medianLabel || strings.medianLabel} ${medianBin.label}` : ''
    }`;

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
        filter={filter}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-mid text-[var(--ax-on)]">
              <RollingDigits
                value={formatChartValue(
                  activeBin ? activeBin.value : metrics.total,
                  { locale, format, currency, unit }
                )}
              />
            </span>
            <span className="ax-tk">
              {activeBin
                ? `${activeBin.label} (${
                    metrics.total > 0
                      ? Math.round((activeBin.value / metrics.total) * 100)
                      : 0
                  }%)`
                : totalLabel || strings.totalLabel}
            </span>
          </div>
        }
        footer={
          medianBin ? (
            <div className="flex flex-wrap items-center justify-between gap-2 ax-tk pt-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--ax-c1)]" />
                  <span>
                    {medianLabel || strings.medianLabel}:{' '}
                    <strong className="text-[var(--ax-on)]">{medianBin.label}</strong>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--ax-c3)]" />
                  <span>{otherBinsLabel || strings.otherBinsLabel}</span>
                </span>
              </div>
              <span dir="ltr">
                {formatChartValue(medianBin.value, {
                  locale,
                  format,
                  currency,
                  unit,
                })}{' '}
                ({metrics.total > 0 ? Math.round((medianBin.value / metrics.total) * 100) : 0}%)
              </span>
            </div>
          ) : undefined
        }
      >
        <div className="relative flex gap-2 pt-8">
          {/* Y-Axis (34px gutter matching Histogram.dc.html) */}
          <div
            className="w-[34px] flex flex-col justify-between items-end shrink-0 pb-9 ax-tk select-none"
            style={{ height: 226 }}
            aria-hidden="true"
          >
            {reversedTicks.map((tick, idx) => (
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
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => {
              rectRef.current = null;
              setScrubIdx(null);
            }}
            onKeyDown={onKeyDown}
            className="relative flex-1 min-w-0 ax-plot-focus select-none cursor-pointer"
          >
            <div className="relative h-[190px] w-full">
              {metrics.scale.ticks.map((_, idx) => {
                const pct =
                  metrics.scale.ticks.length > 1
                    ? (idx / (metrics.scale.ticks.length - 1)) * 100
                    : 0;
                return (
                  <div
                    key={idx}
                    className={`absolute inset-x-0 pointer-events-none ${
                      idx === 0
                        ? 'border-t border-[var(--ax-on)]/25'
                        : 'border-t border-dashed border-[var(--ax-bdr)]'
                    }`}
                    style={{ bottom: `${pct}%` }}
                  />
                );
              })}

              <div
                className="relative z-10 h-full grid gap-2 items-end"
                style={{
                  gridTemplateColumns: `repeat(${safeBins.length}, minmax(0, 1fr))`,
                }}
              >
                {safeBins.map((bin, idx) => {
                  const heightPct =
                    metrics.scale.max > 0
                      ? Math.min(100, (bin.value / metrics.scale.max) * 100)
                      : 0;
                  const sharePct =
                    metrics.total > 0 ? Math.round((bin.value / metrics.total) * 100) : 0;
                  const isMedian = idx === metrics.resolvedHighlight;
                  const isActive = activeIdx === idx;
                  const isDim = activeIdx !== null && !isActive;

                  const delayStyle = {
                    '--ax-delay': `${Math.min(idx * 42, 320)}ms`,
                  } as React.CSSProperties;

                  return (
                    <div
                      key={bin.id}
                      className="relative h-full flex flex-col justify-end items-center transition-opacity duration-200"
                      style={{ opacity: isDim ? 0.34 : 1 }}
                    >
                      {/* Bold count value stacked cleanly above bar (+ MEDIANE pill above it) */}
                      {isMedian && (
                        <span
                          className="ax-pop-item absolute px-1.5 py-[1px] rounded-[5px] bg-[var(--ax-c1)] text-[var(--ax-tc1)] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap z-20"
                          style={{
                            bottom: `calc(${Math.max(4, heightPct)}% + 22px)`,
                            '--ax-delay': `${Math.min(idx * 42 + 120, 420)}ms`,
                          } as React.CSSProperties}
                        >
                          {medianLabel || strings.medianLabel}
                        </span>
                      )}

                      {bin.value > 0 && (
                        <span
                          dir="ltr"
                          className={`ax-nv absolute text-[12px] font-bold whitespace-nowrap pointer-events-none z-20 ${
                            isMedian || isActive ? 'text-[var(--ax-on)]' : 'text-[var(--ax-sub)]'
                          }`}
                          style={{
                            bottom: `calc(${Math.max(4, heightPct)}% + 4px)`,
                          }}
                        >
                          {formatCompactTick(bin.value, locale)}
                        </span>
                      )}

                      <div
                        className="ax-col-enter relative z-10 w-full flex flex-col justify-end"
                        style={{
                          ...delayStyle,
                          height: `${Math.max(bin.value > 0 ? 3 : 0, heightPct)}%`,
                        }}
                      >
                        <div
                          className="ax-bar-y w-full h-full rounded-t-[9px] rounded-b-[4px]"
                          style={{
                            background: isMedian ? 'var(--ax-c1)' : 'var(--ax-c3)',
                            boxShadow: isActive
                              ? `0 0 0 3px color-mix(in srgb, ${isMedian ? 'var(--ax-c1)' : 'var(--ax-on)'} 28%, transparent)`
                              : undefined,
                            transform: isActive ? 'scale3d(1.04, 1.02, 1)' : 'scale3d(1, 1, 1)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bin Labels + % Share Underneath (matching Histogram.dc.html) */}
            <div
              className="grid gap-2 pt-1.5 text-center"
              style={{
                gridTemplateColumns: `repeat(${safeBins.length}, minmax(0, 1fr))`,
              }}
            >
              {safeBins.map((bin, idx) => {
                const sharePct =
                  metrics.total > 0 ? Math.round((bin.value / metrics.total) * 100) : 0;
                const isEmph = activeIdx === idx || idx === metrics.resolvedHighlight;
                return (
                  <div key={bin.id} className="flex flex-col items-center min-w-0">
                    <span
                      className={`ax-tk truncate w-full ${
                        isEmph ? 'text-[var(--ax-on)] font-semibold' : ''
                      }`}
                    >
                      {bin.label}
                    </span>
                    <span className="ax-tk text-[9.5px] italic opacity-75" dir="ltr">
                      {sharePct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ChartCard>
    );
  }
);

HistogramChart.displayName = 'HistogramChart';
