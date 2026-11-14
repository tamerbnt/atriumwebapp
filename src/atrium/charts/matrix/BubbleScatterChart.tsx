import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import {
  formatChartValue,
  formatCompactTick,
  niceScale,
} from '../math';
import { BubbleScatterChartProps } from '../types';

const BUBBLE_COLORS = [
  'var(--ax-c1)',
  'var(--ax-on)',
  'var(--ax-c3)',
  'var(--ax-c4)',
  'var(--ax-ok)',
];

export const BubbleScatterChart: React.FC<BubbleScatterChartProps> = React.memo(
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
    groups,
    points,
    xAxisLabel,
    yFormat = 'currency',
    xFormat = 'number',
    sizeFormat = 'currency',
    currency = 'DZD',
    xUnit,
    yUnit,
    sizeUnit,
  }) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [hiddenGroups, setHiddenGroups] = useState<Record<string, boolean>>({});

    const groupMeta = useMemo(() => {
      const map = new Map<string, { id: string; label: string; color: string }>();
      (groups || []).forEach((g, idx) => {
        map.set(g.id, {
          id: g.id,
          label: g.label,
          color: g.color || BUBBLE_COLORS[idx % BUBBLE_COLORS.length],
        });
      });
      return map;
    }, [groups]);

    const visiblePoints = useMemo(
      () =>
        (points || []).filter(
          (p) =>
            !hiddenGroups[p.groupId] &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            Number.isFinite(p.size)
        ),
      [points, hiddenGroups]
    );

    const isEmpty = state === 'ready' && visiblePoints.length === 0 && (points?.length || 0) === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const geom = useMemo(() => {
      const W = 520;
      const H = 220;
      const PAD_L = 48;
      const PAD_R = 20;
      const PAD_T = 18;
      const PAD_B = 34;

      if (visiblePoints.length === 0) {
        return {
          W,
          H,
          PAD_L,
          PAD_R,
          PAD_T,
          PAD_B,
          xScale: niceScale(0, 10, 4),
          yScale: niceScale(0, 100, 4),
          bubbles: [],
        };
      }

      const xMin = Math.min(0, ...visiblePoints.map((p) => p.x));
      const xMax = Math.max(...visiblePoints.map((p) => p.x), 1);
      const yMin = Math.min(0, ...visiblePoints.map((p) => p.y));
      const yMax = Math.max(...visiblePoints.map((p) => p.y), 1);
      const maxSize = Math.max(...visiblePoints.map((p) => Math.max(0, p.size)), 1);

      const xScale = niceScale(xMin, xMax, 5);
      const yScale = niceScale(yMin, yMax, 4);

      const innerW = W - PAD_L - PAD_R;
      const innerH = H - PAD_T - PAD_B;
      const xSpan = Math.max(1e-9, xScale.max - xScale.min);
      const ySpan = Math.max(1e-9, yScale.max - yScale.min);

      const bubbles = visiblePoints.map((p) => {
        const cx = PAD_L + ((p.x - xScale.min) / xSpan) * innerW;
        const cy = PAD_T + (1 - (p.y - yScale.min) / ySpan) * innerH;
        const r = 6 + Math.sqrt(Math.max(0, p.size) / maxSize) * 16;
        const grp = groupMeta.get(p.groupId);
        return {
          ...p,
          cx,
          cy,
          r,
          color: grp?.color || 'var(--ax-c1)',
          groupLabel: grp?.label || p.groupId,
        };
      });

      return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, xScale, yScale, bubbles };
    }, [visiblePoints, groupMeta]);

    const activeBubble = geom.bubbles.find((b) => b.id === activeId) || null;
    const ariaSummary = `${title}: ${visiblePoints.length} points analysés`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="scatter"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {(groups || []).map((g, idx) => {
                const color = g.color || BUBBLE_COLORS[idx % BUBBLE_COLORS.length];
                const isOff = !!hiddenGroups[g.id];
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setHiddenGroups((prev) => ({ ...prev, [g.id]: !prev[g.id] }))
                    }
                    aria-pressed={!isOff}
                    className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium cursor-pointer transition-opacity ${
                      isOff ? 'opacity-40 line-through' : 'opacity-95'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-[var(--ax-sub)]">{g.label}</span>
                  </button>
                );
              })}
            </div>
            {xAxisLabel && <span className="ax-tk">{xAxisLabel}</span>}
          </div>
        }
      >
        <div className="relative" onPointerLeave={() => setActiveId(null)}>
          <svg
            viewBox={`0 0 ${geom.W} ${geom.H}`}
            className="w-full h-52 overflow-visible select-none"
            role="img"
            aria-label={ariaSummary}
          >
            {/* Dashed Y Gridlines & Ticks */}
            {geom.yScale.ticks.map((tick, idx) => {
              const span = Math.max(1e-9, geom.yScale.max - geom.yScale.min);
              const y =
                geom.PAD_T +
                (1 - (tick - geom.yScale.min) / span) *
                  (geom.H - geom.PAD_T - geom.PAD_B);
              return (
                <g key={idx}>
                  <line
                    x1={geom.PAD_L}
                    y1={y}
                    x2={geom.W - geom.PAD_R}
                    y2={y}
                    stroke="var(--ax-bdr)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={geom.PAD_L - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-[var(--ax-mut)]"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
                  >
                    {formatCompactTick(tick, locale)}
                  </text>
                </g>
              );
            })}

            {/* X Ticks */}
            {geom.xScale.ticks.map((tick, idx) => {
              const span = Math.max(1e-9, geom.xScale.max - geom.xScale.min);
              const x =
                geom.PAD_L +
                ((tick - geom.xScale.min) / span) *
                  (geom.W - geom.PAD_L - geom.PAD_R);
              return (
                <text
                  key={idx}
                  x={x}
                  y={geom.H - 10}
                  textAnchor="middle"
                  className="fill-[var(--ax-mut)]"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
                >
                  {formatCompactTick(tick, locale)}
                </text>
              );
            })}

            {/* Bubbles */}
            {geom.bubbles.map((b) => {
              const isActive = activeId === b.id;
              const isDim = activeId !== null && !isActive;
              return (
                <circle
                  key={b.id}
                  cx={b.cx}
                  cy={b.cy}
                  r={b.r}
                  fill={b.color}
                  fillOpacity={isActive ? 0.92 : 0.72}
                  stroke={isActive ? 'var(--ax-on)' : 'var(--ax-slab)'}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="cursor-pointer outline-none"
                  opacity={isDim ? 0.25 : 1}
                  style={{ transition: 'opacity 0.16s ease, fill-opacity 0.16s ease' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${b.label} (${b.groupLabel})`}
                  onPointerEnter={() => setActiveId(b.id)}
                  onFocus={() => setActiveId(b.id)}
                  onBlur={() => setActiveId(null)}
                />
              );
            })}
          </svg>

          {activeBubble && (
            <div
              className="ax-tip top-1"
              style={{
                left: `${Math.min(
                  68,
                  Math.max(8, (activeBubble.cx / geom.W) * 100 - 12)
                )}%`,
              }}
            >
              <div className="font-semibold">
                {activeBubble.label} · {activeBubble.groupLabel}
              </div>
              <div>
                X:{' '}
                {formatChartValue(activeBubble.x, {
                  locale,
                  format: xFormat,
                  currency,
                  unit: xUnit,
                })}{' '}
                · Y:{' '}
                {formatChartValue(activeBubble.y, {
                  locale,
                  format: yFormat,
                  currency,
                  unit: yUnit,
                })}
              </div>
              <div className="opacity-80">
                Vol:{' '}
                {formatChartValue(activeBubble.size, {
                  locale,
                  format: sizeFormat,
                  currency,
                  unit: sizeUnit,
                })}
              </div>
            </div>
          )}
        </div>
      </ChartCard>
    );
  }
);

BubbleScatterChart.displayName = 'BubbleScatterChart';
