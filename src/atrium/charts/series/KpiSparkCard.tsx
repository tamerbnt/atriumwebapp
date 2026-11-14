import React, { useId, useMemo, useRef, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { useChartKeyboardScrub, useIsRtl } from '../hooks';
import { formatChartValue, getDefaultChartStrings, smoothSplinePath } from '../math';
import { KpiSparkCardProps } from '../types';

export const KpiSparkCard: React.FC<KpiSparkCardProps> = React.memo(
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
    value,
    previousValue,
    deltaPercent,
    deltaLabel,
    higherIsBetter = true,
    format = 'number',
    currency = 'DZD',
    unit,
    compactAbove = 100_000,
    rangeLabel,
    series,
    minLabel,
    maxLabel,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const uid = useId();
    const svgRef = useRef<SVGSVGElement>(null);
    const rectRef = useRef<DOMRect | null>(null);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    const activeIdxRef = useRef<number | null>(null);
    activeIdxRef.current = activeIdx;

    const safeSeries = useMemo(
      () =>
        (series || []).filter(
          (pt) => Number.isFinite(pt.value)
        ),
      [series]
    );

    const isEmpty = state === 'ready' && !Number.isFinite(value) && safeSeries.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const computedDelta = useMemo(() => {
      if (typeof deltaPercent === 'number' && Number.isFinite(deltaPercent)) {
        return deltaPercent;
      }
      if (
        typeof previousValue === 'number' &&
        Number.isFinite(previousValue) &&
        previousValue !== 0
      ) {
        return ((value - previousValue) / Math.abs(previousValue)) * 100;
      }
      return undefined;
    }, [deltaPercent, previousValue, value]);

    const geom = useMemo(() => {
      const W = 260;
      const H = 64;
      const PAD_X = 6;
      const PAD_Y = 8;

      if (safeSeries.length === 0) {
        return { W, H, pts: [], prevPts: [], d: '', areaD: '', prevD: '', minVal: 0, maxVal: 0 };
      }

      const vals = safeSeries.map((p) => p.value);
      const prevVals = safeSeries
        .map((p) => p.previous)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const all = [...vals, ...prevVals];
      let minVal = Math.min(...all);
      let maxVal = Math.max(...all);
      if (minVal === maxVal) {
        const pad = Math.abs(minVal) * 0.1 || 1;
        minVal -= pad;
        maxVal += pad;
      }

      const spanY = maxVal - minVal;
      const innerW = W - PAD_X * 2;
      const innerH = H - PAD_Y * 2;

      const xFor = (i: number) =>
        safeSeries.length === 1
          ? W / 2
          : PAD_X + (i / (safeSeries.length - 1)) * innerW;
      const yFor = (v: number) => PAD_Y + (1 - (v - minVal) / spanY) * innerH;

      const pts = safeSeries.map((p, i) => ({ x: xFor(i), y: yFor(p.value), raw: p }));
      const d = smoothSplinePath(pts);
      const last = pts[pts.length - 1];
      const first = pts[0];
      const areaD =
        pts.length >= 2
          ? `${d} L ${last.x.toFixed(2)} ${(H - 2).toFixed(2)} L ${first.x.toFixed(2)} ${(H - 2).toFixed(2)} Z`
          : '';

      const hasPrev = safeSeries.every((p) => typeof p.previous === 'number' && Number.isFinite(p.previous));
      const prevPts = hasPrev
        ? safeSeries.map((p, i) => ({ x: xFor(i), y: yFor(p.previous as number) }))
        : [];
      const prevD = prevPts.length >= 2 ? smoothSplinePath(prevPts) : '';

      return {
        W,
        H,
        pts,
        prevPts,
        d,
        areaD,
        prevD,
        minVal: Math.min(...vals),
        maxVal: Math.max(...vals),
      };
    }, [safeSeries]);

    const clampedIdx =
      activeIdx !== null && activeIdx >= 0 && activeIdx < geom.pts.length
        ? activeIdx
        : null;

    const displayedValue = clampedIdx !== null ? geom.pts[clampedIdx].raw.value : value;
    const displayedLabel = clampedIdx !== null ? geom.pts[clampedIdx].raw.label : rangeLabel;

    const formattedHeadline = formatChartValue(displayedValue, {
      locale,
      format,
      currency,
      unit,
      compactAbove,
    });

    const isPositiveDelta =
      computedDelta === undefined
        ? null
        : computedDelta === 0
          ? null
          : higherIsBetter
            ? computedDelta > 0
            : computedDelta < 0;

    const chipClass =
      isPositiveDelta === null
        ? 'ax-chip-neutral'
        : isPositiveDelta
          ? 'ax-chip-ok'
          : 'ax-chip-bad';

    const setScrubIdx = (idx: number | null) => {
      if (idx === activeIdxRef.current) return;
      activeIdxRef.current = idx;
      setActiveIdx(idx);
    };

    const onKeyDown = useChartKeyboardScrub(
      geom.pts.length,
      clampedIdx,
      setScrubIdx,
      isRtl
    );

    const handlePointerEnter = () => {
      if (svgRef.current) {
        rectRef.current = svgRef.current.getBoundingClientRect();
      }
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if (geom.pts.length === 0 || !svgRef.current) return;
      const rect = rectRef.current || svgRef.current.getBoundingClientRect();
      rectRef.current = rect;
      if (rect.width <= 0) return;
      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const idx = Math.round(relX * (geom.pts.length - 1));
      setScrubIdx(idx);
    };

    const ariaSummary = `${title}: ${formatChartValue(value, { locale, format, currency, unit })}${
      computedDelta !== undefined
        ? `, ${computedDelta >= 0 ? '+' : ''}${computedDelta.toFixed(1)}%`
        : ''
    }`;

    const activePt = clampedIdx !== null ? geom.pts[clampedIdx] : null;
    const activePrevPt =
      clampedIdx !== null && geom.prevPts.length > clampedIdx
        ? geom.prevPts[clampedIdx]
        : null;

    const deltaBadge =
      computedDelta !== undefined ? (
        <span className={`ax-chip ${chipClass}`}>
          <span aria-hidden="true">
            {computedDelta > 0 ? '▲' : computedDelta < 0 ? '▼' : '•'}
          </span>
          <span dir="ltr">
            {formatChartValue(computedDelta, {
              locale,
              format: 'percent',
              signed: true,
              maximumFractionDigits: 1,
            })}
          </span>
          {deltaLabel && <span className="opacity-80">{deltaLabel}</span>}
        </span>
      ) : null;

    const hasHeaderFilter = Boolean(filter && filter.options.length > 0);

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        isKpi
        state={effectiveState}
        skeletonKind="kpi"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        filter={filter}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={!hasHeaderFilter ? deltaBadge : undefined}
      >
        <div className="flex items-baseline justify-between gap-2 flex-wrap min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
            <div className="ax-disp ax-big text-[var(--ax-on)]">
              <RollingDigits value={formattedHeadline} />
            </div>
            {hasHeaderFilter && deltaBadge}
          </div>
          {displayedLabel && (
            <span className="ax-tk truncate max-w-[140px]" title={displayedLabel}>
              {displayedLabel}
            </span>
          )}
        </div>

        {geom.pts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${geom.W} ${geom.H}`}
              className="w-full h-16 overflow-visible ax-plot-focus cursor-crosshair select-none touch-pan-y"
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
            >
              <defs>
                <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ax-c1)" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="var(--ax-c1)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {geom.areaD && (
                <path d={geom.areaD} fill={`url(#${uid}-grad)`} className="ax-area-fade" />
              )}

              {geom.prevD && (
                <path
                  d={geom.prevD}
                  fill="none"
                  stroke="var(--ax-c4)"
                  strokeWidth="1.4"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  className="ax-area-fade"
                />
              )}

              {geom.d && (
                <path
                  d={geom.d}
                  pathLength={100}
                  fill="none"
                  stroke="var(--ax-c1)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  className="ax-line-draw"
                />
              )}

              {geom.pts.length === 1 && (
                <circle cx={geom.pts[0].x} cy={geom.pts[0].y} r="4" fill="var(--ax-c1)" />
              )}

              {/* Subtle zero/baseline dotted hairline */}
              {geom.pts.length >= 2 && (
                <line
                  x1={6}
                  y1={geom.H - 4}
                  x2={geom.W - 6}
                  y2={geom.H - 4}
                  stroke="var(--ax-bdr)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  opacity="0.7"
                />
              )}

              {/* Persistent live end-point dot with halo at rest */}
              {!activePt && geom.pts.length >= 2 && (() => {
                const lastPt = geom.pts[geom.pts.length - 1];
                return (
                  <g className="ax-pop-item" style={{ transformOrigin: `${lastPt.x}px ${lastPt.y}px` }}>
                    <circle
                      cx={lastPt.x}
                      cy={lastPt.y}
                      r="6.5"
                      fill="var(--ax-c1)"
                      opacity="0.2"
                    />
                    <circle
                      cx={lastPt.x}
                      cy={lastPt.y}
                      r="3.2"
                      fill="var(--ax-slab)"
                      stroke="var(--ax-c1)"
                      strokeWidth="2"
                    />
                  </g>
                );
              })()}

              {activePt && (
                <g pointerEvents="none">
                  <line
                    x1={0}
                    y1={2}
                    x2={0}
                    y2={geom.H - 2}
                    stroke="var(--ax-bdr)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    style={{
                      transform: `translate3d(${activePt.x}px, 0, 0)`,
                      transition: 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                  {activePrevPt && (
                    <circle
                      cx={0}
                      cy={0}
                      r="3"
                      fill="var(--ax-slab)"
                      stroke="var(--ax-c4)"
                      strokeWidth="1.5"
                      style={{
                        transform: `translate3d(${activePrevPt.x}px, ${activePrevPt.y}px, 0)`,
                        transition: 'transform 0.22s var(--ax-sp)',
                      }}
                    />
                  )}
                  <circle
                    cx={0}
                    cy={0}
                    r="4.2"
                    fill="var(--ax-c1)"
                    stroke="var(--ax-slab)"
                    strokeWidth="2"
                    style={{
                      transform: `translate3d(${activePt.x}px, ${activePt.y}px, 0)`,
                      transition: 'transform 0.22s var(--ax-sp)',
                    }}
                  />
                </g>
              )}
            </svg>

            <div className="flex items-center justify-between gap-2 text-[11px] ax-tk">
              <span>
                {minLabel || strings.minLabel}:{' '}
                <strong className="font-semibold text-[var(--ax-sub)]" dir="ltr">
                  {formatChartValue(geom.minVal, { locale, format, currency, unit })}
                </strong>
              </span>
              {geom.prevD && (
                <span className="inline-flex items-center gap-1.5 opacity-85">
                  <span className="w-3 border-t-[1.5px] border-dashed border-[var(--ax-c4)]" />
                  <span>{strings.previousLabel}</span>
                </span>
              )}
              <span>
                {maxLabel || strings.maxLabel}:{' '}
                <strong className="font-semibold text-[var(--ax-sub)]" dir="ltr">
                  {formatChartValue(geom.maxVal, { locale, format, currency, unit })}
                </strong>
              </span>
            </div>
          </div>
        )}
      </ChartCard>
    );
  }
);

KpiSparkCard.displayName = 'KpiSparkCard';
