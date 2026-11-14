import React, { useMemo, useRef, useState } from 'react';
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
    className = '',
    'data-testid': testId,
    bins,
    highlightIndex,
    showMedian = true,
    medianLabel,
    totalLabel,
    format = 'number',
    currency = 'DZD',
    unit,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const plotRef = useRef<HTMLDivElement>(null);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

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

    const isEmpty =
      state === 'ready' && (safeBins.length === 0 || metrics.total <= 0);
    const effectiveState = isEmpty ? 'empty' : state;

    const onKeyDown = useChartKeyboardScrub(
      safeBins.length,
      activeIdx,
      setActiveIdx,
      isRtl
    );

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!plotRef.current || safeBins.length === 0) return;
      const rect = plotRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawFrac = (e.clientX - rect.left) / rect.width;
      const frac = Math.max(0, Math.min(0.9999, isRtl ? 1 - rawFrac : rawFrac));
      setActiveIdx(Math.floor(frac * safeBins.length));
    };

    const activeBin =
      activeIdx !== null && safeBins[activeIdx] ? safeBins[activeIdx] : null;
    const medianBin =
      metrics.resolvedHighlight >= 0 ? safeBins[metrics.resolvedHighlight] : null;

    const ariaSummary = `${title}: ${safeBins.length} tranches${
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
            <div className="flex items-center justify-between gap-2 ax-tk pt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--ax-c1)]" />
                <span>
                  {medianLabel || strings.medianLabel}:{' '}
                  <strong className="text-[var(--ax-on)]">{medianBin.label}</strong>
                </span>
              </span>
              <span>
                {formatChartValue(medianBin.value, {
                  locale,
                  format,
                  currency,
                  unit,
                })}
              </span>
            </div>
          ) : undefined
        }
      >
        <div className="relative flex gap-2.5 pt-5">
          {/* Y-Axis */}
          <div
            className="flex flex-col justify-between items-end shrink-0 pb-6 ax-tk select-none"
            style={{ height: 176 }}
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
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIdx(null)}
            onKeyDown={onKeyDown}
            className="relative flex-1 min-w-0 ax-plot-focus select-none cursor-pointer"
          >
            <div className="relative h-[152px] w-full">
              {metrics.scale.ticks.map((_, idx) => {
                const pct =
                  metrics.scale.ticks.length > 1
                    ? (idx / (metrics.scale.ticks.length - 1)) * 100
                    : 0;
                return (
                  <div
                    key={idx}
                    className="absolute inset-x-0 border-t border-dashed border-[var(--ax-bdr)] pointer-events-none"
                    style={{ bottom: `${pct}%` }}
                  />
                );
              })}

              <div
                className="relative z-10 h-full grid gap-1.5 items-end"
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

                  return (
                    <div
                      key={bin.id}
                      className="relative h-full flex flex-col justify-end items-center transition-opacity duration-150"
                      style={{ opacity: isDim ? 0.36 : 1 }}
                    >
                      {/* Median Pill above highlighted bin */}
                      {isMedian && (
                        <span
                          className="absolute -top-5 px-1.5 py-[1px] rounded-[5px] bg-[var(--ax-c1)] text-[var(--ax-tc1)] text-[9.5px] font-semibold uppercase tracking-wide whitespace-nowrap z-20"
                          style={{
                            bottom: `calc(${Math.max(4, heightPct)}% + 4px)`,
                            top: 'auto',
                          }}
                        >
                          {medianLabel || strings.medianLabel}
                        </span>
                      )}

                      {/* Share % above non-median bars when space allows */}
                      {!isMedian && sharePct > 0 && (
                        <span
                          className="ax-hide-sm ax-tk text-[10px] mb-0.5 pointer-events-none"
                          aria-hidden="true"
                        >
                          {sharePct}%
                        </span>
                      )}

                      <div
                        className="ax-bar-y w-full rounded-t-[6px]"
                        style={{
                          height: `${Math.max(bin.value > 0 ? 3 : 0, heightPct)}%`,
                          background: isMedian
                            ? 'var(--ax-c1)'
                            : isActive
                              ? 'var(--ax-on)'
                              : 'var(--ax-c3)',
                          boxShadow: isActive ? '0 0 0 2px var(--ax-acc)' : undefined,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bin Labels */}
            <div
              className="grid gap-1.5 pt-1.5 text-center ax-tk"
              style={{
                gridTemplateColumns: `repeat(${safeBins.length}, minmax(0, 1fr))`,
              }}
            >
              {safeBins.map((bin, idx) => (
                <span
                  key={bin.id}
                  className={`truncate ${
                    activeIdx === idx || idx === metrics.resolvedHighlight
                      ? 'text-[var(--ax-on)] font-semibold'
                      : ''
                  }`}
                >
                  {bin.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>
    );
  }
);

HistogramChart.displayName = 'HistogramChart';
