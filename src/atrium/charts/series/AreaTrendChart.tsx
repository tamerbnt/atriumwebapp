import React, { useId, useMemo, useRef, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { ChartSegmented } from '../primitives/ChartSegmented';
import { RollingDigits } from '../primitives/RollingDigits';
import { useChartKeyboardScrub, useIsRtl } from '../hooks';
import {
  formatChartValue,
  formatCompactTick,
  getDefaultChartStrings,
  niceScale,
  smoothSplinePath,
} from '../math';
import { AreaTrendChartProps } from '../types';

export const AreaTrendChart: React.FC<AreaTrendChartProps> = React.memo(
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
    points,
    ranges,
    activeRangeId,
    onRangeChange,
    currentLabel,
    previousLabel,
    averageLabel,
    peakLabel,
    showAverage = true,
    showPeak = true,
    format = 'number',
    currency = 'DZD',
    unit,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const uid = useId();
    const svgRef = useRef<SVGSVGElement>(null);

    const [internalRangeId, setInternalRangeId] = useState<string>(
      () => activeRangeId || ranges?.[0]?.id || ''
    );
    const resolvedRangeId = activeRangeId ?? internalRangeId;
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const currentRange = useMemo(() => {
      if (!ranges || ranges.length === 0) return null;
      return ranges.find((r) => r.id === resolvedRangeId) || ranges[0];
    }, [ranges, resolvedRangeId]);

    const activePoints = useMemo(
      () => (currentRange ? currentRange.points : points || []).filter((p) => Number.isFinite(p.value)),
      [currentRange, points]
    );

    const isEmpty = state === 'ready' && activePoints.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const geom = useMemo(() => {
      const W = 600;
      const H = 200;
      const PAD_L = 44;
      const PAD_R = 14;
      const PAD_T = 16;
      const PAD_B = 26;

      if (activePoints.length === 0) {
        return {
          W,
          H,
          PAD_L,
          PAD_R,
          PAD_T,
          PAD_B,
          pts: [],
          prevPts: [],
          d: '',
          areaD: '',
          prevD: '',
          scale: niceScale(0, 100),
          avg: 0,
          avgY: H - PAD_B,
          peakIdx: -1,
          total: 0,
          hasPrev: false,
        };
      }

      const vals = activePoints.map((p) => p.value);
      const prevVals = activePoints
        .map((p) => p.previous)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const minRaw = Math.min(0, ...vals, ...prevVals);
      const maxRaw = Math.max(...vals, ...prevVals, 1);
      const scale = niceScale(minRaw, maxRaw, 4);

      const innerW = W - PAD_L - PAD_R;
      const innerH = H - PAD_T - PAD_B;
      const spanY = Math.max(1e-9, scale.max - scale.min);

      const xFor = (i: number) =>
        activePoints.length === 1
          ? PAD_L + innerW / 2
          : PAD_L + (i / (activePoints.length - 1)) * innerW;
      const yFor = (v: number) => PAD_T + (1 - (v - scale.min) / spanY) * innerH;

      const pts = activePoints.map((p, i) => ({ x: xFor(i), y: yFor(p.value), raw: p }));
      const d = smoothSplinePath(pts);
      const baseY = H - PAD_B;
      const areaD =
        pts.length >= 2
          ? `${d} L ${pts[pts.length - 1].x.toFixed(2)} ${baseY} L ${pts[0].x.toFixed(2)} ${baseY} Z`
          : '';

      const hasPrev =
        activePoints.length >= 2 &&
        activePoints.some((p) => typeof p.previous === 'number' && Number.isFinite(p.previous));
      const prevPts = hasPrev
        ? activePoints.map((p, i) => ({
            x: xFor(i),
            y: yFor(typeof p.previous === 'number' ? p.previous : p.value),
          }))
        : [];
      const prevD = prevPts.length >= 2 ? smoothSplinePath(prevPts) : '';

      const total = vals.reduce((a, b) => a + b, 0);
      const avg = total / vals.length;
      const avgY = yFor(avg);

      let peakIdx = 0;
      for (let i = 1; i < vals.length; i++) {
        if (vals[i] > vals[peakIdx]) peakIdx = i;
      }

      return {
        W,
        H,
        PAD_L,
        PAD_R,
        PAD_T,
        PAD_B,
        pts,
        prevPts,
        d,
        areaD,
        prevD,
        scale,
        avg,
        avgY,
        peakIdx,
        total,
        hasPrev,
      };
    }, [activePoints]);

    const handleRangeChange = (id: string) => {
      setInternalRangeId(id);
      setActiveIdx(null);
      onRangeChange?.(id);
    };

    const onKeyDown = useChartKeyboardScrub(
      geom.pts.length,
      activeIdx,
      setActiveIdx,
      isRtl
    );

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current || geom.pts.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const svgX = ((e.clientX - rect.left) / rect.width) * geom.W;
      const usableW = geom.W - geom.PAD_L - geom.PAD_R;
      const frac = Math.max(0, Math.min(1, (svgX - geom.PAD_L) / usableW));
      setActiveIdx(Math.round(frac * (geom.pts.length - 1)));
    };

    const activePt =
      activeIdx !== null && geom.pts[activeIdx] ? geom.pts[activeIdx] : null;
    const activePrevPt =
      activeIdx !== null && geom.prevPts[activeIdx] ? geom.prevPts[activeIdx] : null;
    const peakPt =
      showPeak && geom.pts.length >= 2 && geom.peakIdx >= 0
        ? geom.pts[geom.peakIdx]
        : null;

    const headlineVal = activePt ? activePt.raw.value : geom.total;
    const ariaSummary = `${title}: ${formatChartValue(geom.total, {
      locale,
      format,
      currency,
      unit,
    })}`;

    // Label step so dense series (e.g. 30 daily points) never collide on X-axis
    const xLabelStep =
      geom.pts.length <= 8 ? 1 : Math.ceil(geom.pts.length / 6);

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="area"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          ranges && ranges.length > 1 ? (
            <ChartSegmented
              options={ranges.map((r) => ({ id: r.id, label: r.label }))}
              value={currentRange?.id || ''}
              onChange={handleRangeChange}
              isRtl={isRtl}
              ariaLabel={title}
            />
          ) : undefined
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 ax-tk">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-[2px] bg-[var(--ax-c1)] rounded-full" />
                <span>{currentLabel || strings.currentLabel}</span>
              </span>
              {geom.hasPrev && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 border-t-[1.5px] border-dashed border-[var(--ax-c4)]" />
                  <span>{previousLabel || strings.previousLabel}</span>
                </span>
              )}
              {showAverage && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 border-t border-dashed border-[var(--ax-acc)]" />
                  <span>
                    {averageLabel || strings.avgLabel}:{' '}
                    {formatChartValue(geom.avg, { locale, format, currency, unit })}
                  </span>
                </span>
              )}
            </div>
            {peakPt && (
              <span>
                {peakLabel || strings.peakLabel}:{' '}
                <strong className="text-[var(--ax-on)]">
                  {peakPt.raw.label} ·{' '}
                  {formatChartValue(peakPt.raw.value, {
                    locale,
                    format,
                    currency,
                    unit,
                  })}
                </strong>
              </span>
            )}
          </div>
        }
      >
        {/* Headline Total */}
        <div className="flex items-baseline gap-2.5">
          <span className="ax-disp ax-big-plot text-[var(--ax-on)]">
            <RollingDigits
              value={formatChartValue(headlineVal, {
                locale,
                format,
                currency,
                unit,
              })}
            />
          </span>
          {activePt && (
            <span className="ax-tk text-[var(--ax-acc)] font-semibold">
              {activePt.raw.label}
            </span>
          )}
        </div>

        {/* SVG Plot */}
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${geom.W} ${geom.H}`}
            className="w-full h-48 overflow-visible ax-plot-focus cursor-crosshair select-none touch-pan-y"
            tabIndex={0}
            role="img"
            aria-label={ariaSummary}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveIdx(null)}
            onKeyDown={onKeyDown}
          >
            <defs>
              <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ax-c1)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--ax-c1)" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal dashed grid & Y ticks */}
            {geom.scale.ticks.map((tick, idx) => {
              const span = Math.max(1e-9, geom.scale.max - geom.scale.min);
              const y =
                geom.PAD_T +
                (1 - (tick - geom.scale.min) / span) *
                  (geom.H - geom.PAD_T - geom.PAD_B);
              return (
                <g key={idx}>
                  <line
                    x1={geom.PAD_L}
                    y1={y}
                    x2={geom.W - geom.PAD_R}
                    y2={y}
                    stroke="var(--ax-bdr)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={geom.PAD_L - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-[var(--ax-mut)]"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10.5px',
                    }}
                  >
                    {formatCompactTick(tick, locale)}
                  </text>
                </g>
              );
            })}

            {/* Average dashed reference */}
            {showAverage && geom.pts.length >= 2 && (
              <line
                x1={geom.PAD_L}
                y1={geom.avgY}
                x2={geom.W - geom.PAD_R}
                y2={geom.avgY}
                stroke="var(--ax-acc)"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.7"
              />
            )}

            {/* Area & Curves */}
            {geom.areaD && <path d={geom.areaD} fill={`url(#${uid}-area)`} />}

            {geom.prevD && (
              <path
                d={geom.prevD}
                fill="none"
                stroke="var(--ax-c4)"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            )}

            {geom.d && (
              <path
                d={geom.d}
                fill="none"
                stroke="var(--ax-c1)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            )}

            {/* Annotated Peak Ring */}
            {peakPt && !activePt && (
              <g>
                <circle
                  cx={peakPt.x}
                  cy={peakPt.y}
                  r="6"
                  fill="none"
                  stroke="var(--ax-c1)"
                  strokeWidth="1.5"
                  opacity="0.45"
                />
                <circle
                  cx={peakPt.x}
                  cy={peakPt.y}
                  r="3.2"
                  fill="var(--ax-slab)"
                  stroke="var(--ax-c1)"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* X-axis Ticks */}
            {geom.pts.map((pt, idx) => {
              if (idx % xLabelStep !== 0 && idx !== geom.pts.length - 1) return null;
              return (
                <text
                  key={idx}
                  x={pt.x}
                  y={geom.H - 6}
                  textAnchor="middle"
                  className={
                    activeIdx === idx ? 'fill-[var(--ax-on)] font-semibold' : 'fill-[var(--ax-mut)]'
                  }
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10.5px',
                  }}
                >
                  {pt.raw.label}
                </text>
              );
            })}

            {/* Scrubber vertical crosshair + dual dots */}
            {activePt && (
              <g>
                <line
                  x1={activePt.x}
                  y1={geom.PAD_T}
                  x2={activePt.x}
                  y2={geom.H - geom.PAD_B}
                  stroke="var(--ax-on)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.45"
                />
                {activePrevPt && (
                  <circle
                    cx={activePrevPt.x}
                    cy={activePrevPt.y}
                    r="4"
                    fill="var(--ax-slab)"
                    stroke="var(--ax-c4)"
                    strokeWidth="2"
                  />
                )}
                <circle
                  cx={activePt.x}
                  cy={activePt.y}
                  r="5"
                  fill="var(--ax-c1)"
                  stroke="var(--ax-slab)"
                  strokeWidth="2.2"
                />
              </g>
            )}
          </svg>

          {activePt && (
            <div
              className="ax-tip top-1"
              style={{
                left: `${Math.min(72, Math.max(8, (activePt.x / geom.W) * 100 - 10))}%`,
              }}
            >
              <div className="font-semibold">{activePt.raw.label}</div>
              <div>
                {currentLabel || strings.currentLabel}:{' '}
                {formatChartValue(activePt.raw.value, {
                  locale,
                  format,
                  currency,
                  unit,
                })}
              </div>
              {typeof activePt.raw.previous === 'number' && (
                <div className="opacity-75">
                  {previousLabel || strings.previousLabel}:{' '}
                  {formatChartValue(activePt.raw.previous, {
                    locale,
                    format,
                    currency,
                    unit,
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </ChartCard>
    );
  }
);

AreaTrendChart.displayName = 'AreaTrendChart';
