import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { getDefaultChartStrings } from '../math';
import { RadarBalanceChartProps } from '../types';

const RINGS = [25, 50, 75, 100];

export const RadarBalanceChart: React.FC<RadarBalanceChartProps> = React.memo(
  ({
    title,
    subtitle,
    helpText,
    locale = 'fr',
    surface = 'dark',
    inlineDark = true,
    state = 'ready',
    emptyMessage,
    errorMessage,
    onRetry,
    className = '',
    'data-testid': testId,
    axes,
    primaryLabel,
    benchmarkLabel,
    unit = '%',
  }) => {
    const strings = getDefaultChartStrings(locale);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const safeAxes = useMemo(
      () =>
        (axes || []).map((a) => ({
          ...a,
          value: Math.max(0, Math.min(100, Number.isFinite(a.value) ? a.value : 0)),
          benchmark:
            typeof a.benchmark === 'number' && Number.isFinite(a.benchmark)
              ? Math.max(0, Math.min(100, a.benchmark))
              : undefined,
        })),
      [axes]
    );

    const isEmpty = state === 'ready' && safeAxes.length < 3;
    const effectiveState = isEmpty ? 'empty' : state;

    const hasBenchmark = useMemo(
      () => safeAxes.some((a) => typeof a.benchmark === 'number'),
      [safeAxes]
    );

    const geom = useMemo(() => {
      const CX = 130;
      const CY = 112;
      const R = 74;
      const N = safeAxes.length;
      if (N < 3) {
        return { CX, CY, R, ringPolys: [], spokes: [], primaryPoly: '', benchPoly: '', avg: 0 };
      }

      const ptAt = (idx: number, pct: number) => {
        const angle = -Math.PI / 2 + (idx / N) * Math.PI * 2;
        const rad = (pct / 100) * R;
        return {
          x: CX + rad * Math.cos(angle),
          y: CY + rad * Math.sin(angle),
          lx: CX + (R + 18) * Math.cos(angle),
          ly: CY + (R + 18) * Math.sin(angle),
        };
      };

      const ringPolys = RINGS.map((pct) =>
        safeAxes
          .map((_, i) => {
            const p = ptAt(i, pct);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ')
      );

      const spokes = safeAxes.map((axis, i) => {
        const outer = ptAt(i, 100);
        const valPt = ptAt(i, axis.value);
        const benchPt =
          typeof axis.benchmark === 'number' ? ptAt(i, axis.benchmark) : null;
        return { axis, outer, valPt, benchPt };
      });

      const primaryPoly = spokes
        .map((s) => `${s.valPt.x.toFixed(1)},${s.valPt.y.toFixed(1)}`)
        .join(' ');

      const benchPoly = hasBenchmark
        ? spokes
            .map((s) => {
              const p = s.benchPt || ptAt(spokes.indexOf(s), 0);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ')
        : '';

      const avg = safeAxes.reduce((sum, a) => sum + a.value, 0) / N;

      return { CX, CY, R, ringPolys, spokes, primaryPoly, benchPoly, avg };
    }, [safeAxes, hasBenchmark]);

    const activeAxis =
      activeIdx !== null && safeAxes[activeIdx] ? safeAxes[activeIdx] : null;
    const ariaSummary = `${title}: ${safeAxes
      .map((a) => `${a.label} ${Math.round(a.value)}${unit}`)
      .join(', ')}`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="radar"
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
                value={`${Math.round(activeAxis ? activeAxis.value : geom.avg)}${unit}`}
              />
            </span>
            <span className="ax-tk">
              {activeAxis ? activeAxis.label : strings.avgLabel}
            </span>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 ax-tk pt-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--ax-c1)]" />
                <span>{primaryLabel || strings.currentLabel}</span>
              </span>
              {hasBenchmark && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 border-t-[1.5px] border-dashed border-[var(--ax-c4)]" />
                  <span>{benchmarkLabel || strings.targetLabel}</span>
                </span>
              )}
            </div>
            {activeAxis && typeof activeAxis.benchmark === 'number' && (
              <span>
                {benchmarkLabel || strings.targetLabel}:{' '}
                <strong className="text-[var(--ax-on)]">
                  {Math.round(activeAxis.benchmark)}
                  {unit}
                </strong>
              </span>
            )}
          </div>
        }
      >
        <div className="flex justify-center">
          <svg
            viewBox="0 0 260 224"
            className="w-full max-w-[280px] h-[216px] overflow-visible select-none"
            role="img"
            aria-label={ariaSummary}
            onPointerLeave={() => setActiveIdx(null)}
          >
            {/* 4 Concentric Rings */}
            {geom.ringPolys.map((pts, idx) => (
              <polygon
                key={idx}
                points={pts}
                fill="none"
                stroke="var(--ax-bdr)"
                strokeWidth="1"
              />
            ))}

            {/* Axis Spokes & Labels */}
            {geom.spokes.map((s, idx) => {
              const isRight = s.outer.lx > geom.CX + 12;
              const isLeft = s.outer.lx < geom.CX - 12;
              const anchor = isRight ? 'start' : isLeft ? 'end' : 'middle';
              const isActive = activeIdx === idx;
              return (
                <g key={s.axis.id}>
                  <line
                    x1={geom.CX}
                    y1={geom.CY}
                    x2={s.outer.x}
                    y2={s.outer.y}
                    stroke="var(--ax-bdr)"
                    strokeWidth="1"
                  />
                  <text
                    x={s.outer.lx}
                    y={s.outer.ly + 3}
                    textAnchor={anchor}
                    className={
                      isActive ? 'fill-[var(--ax-acc)] font-semibold' : 'fill-[var(--ax-sub)]'
                    }
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '10.5px',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {s.axis.label}
                  </text>
                </g>
              );
            })}

            {/* Optional Benchmark Polygon */}
            {geom.benchPoly && (
              <polygon
                points={geom.benchPoly}
                fill="none"
                stroke="var(--ax-c4)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            )}

            {/* Primary Value Polygon */}
            {geom.primaryPoly && (
              <polygon
                points={geom.primaryPoly}
                fill="color-mix(in srgb, var(--ax-c1) 24%, transparent)"
                stroke="var(--ax-c1)"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
            )}

            {/* Focusable Vertices */}
            {geom.spokes.map((s, idx) => {
              const isActive = activeIdx === idx;
              return (
                <circle
                  key={s.axis.id}
                  cx={s.valPt.x}
                  cy={s.valPt.y}
                  r={isActive ? 5.5 : 3.8}
                  fill={isActive ? 'var(--ax-on)' : 'var(--ax-c1)'}
                  stroke="var(--ax-slab)"
                  strokeWidth="1.8"
                  className="cursor-pointer outline-none"
                  style={{ transition: 'r 0.2s var(--ax-sp2)' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.axis.label}: ${Math.round(s.axis.value)}${unit}`}
                  onPointerEnter={() => setActiveIdx(idx)}
                  onFocus={() => setActiveIdx(idx)}
                  onBlur={() => setActiveIdx(null)}
                />
              );
            })}
          </svg>
        </div>
      </ChartCard>
    );
  }
);

RadarBalanceChart.displayName = 'RadarBalanceChart';
