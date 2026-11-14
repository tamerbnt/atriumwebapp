import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { ChartSegmented } from '../primitives/ChartSegmented';
import { RollingDigits } from '../primitives/RollingDigits';
import { useIsRtl } from '../hooks';
import { formatChartValue, getDefaultChartStrings } from '../math';
import { RadialGaugeProps } from '../types';

const TOTAL_TICKS = 36;
const SWEEP_DEG = 270;
const START_ANGLE = 135; // bottom-left

export const RadialGauge: React.FC<RadialGaugeProps> = React.memo(
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
    metrics,
    activeMetricId,
    onMetricChange,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const [internalMetricId, setInternalMetricId] = useState<string>(
      () => activeMetricId || metrics?.[0]?.id || ''
    );
    const resolvedId = activeMetricId ?? internalMetricId;

    const activeMetric = useMemo(() => {
      if (!metrics || metrics.length === 0) return null;
      return metrics.find((m) => m.id === resolvedId) || metrics[0];
    }, [metrics, resolvedId]);

    const isEmpty = state === 'ready' && !activeMetric;
    const effectiveState = isEmpty ? 'empty' : state;

    const pct = useMemo(() => {
      if (!activeMetric || !Number.isFinite(activeMetric.value)) return 0;
      return Math.max(0, Math.min(100, activeMetric.value));
    }, [activeMetric]);

    const handleMetricChange = (id: string) => {
      setInternalMetricId(id);
      onMetricChange?.(id);
    };

    const tickList = useMemo(() => {
      const items = [];
      const activeCount = Math.round((pct / 100) * TOTAL_TICKS);
      for (let i = 0; i < TOTAL_TICKS; i++) {
        const deg = START_ANGLE + (i / (TOTAL_TICKS - 1)) * SWEEP_DEG;
        const rad = (deg * Math.PI) / 180;
        const r1 = 42.5;
        const r2 = i % 6 === 0 ? 48 : 46;
        const x1 = 50 + r1 * Math.cos(rad);
        const y1 = 50 + r1 * Math.sin(rad);
        const x2 = 50 + r2 * Math.cos(rad);
        const y2 = 50 + r2 * Math.sin(rad);
        const isOn = i < activeCount;
        const mixWeight = Math.round((1 - i / (TOTAL_TICKS - 1)) * 100);
        const color = !isOn
          ? 'var(--ax-tick-off)'
          : `color-mix(in srgb, var(--ax-ok) ${Math.max(35, mixWeight)}%, var(--ax-c1))`;
        items.push({ x1, y1, x2, y2, color });
      }
      return items;
    }, [pct]);

    const targetAngle =
      typeof activeMetric?.target === 'number' && Number.isFinite(activeMetric.target)
        ? START_ANGLE + (Math.max(0, Math.min(100, activeMetric.target)) / 100) * SWEEP_DEG
        : null;

    const dotAngle = START_ANGLE + (pct / 100) * SWEEP_DEG;

    // 270deg / 360deg = 0.75 of circle circumference (pathLength = 100)
    const arcMax = 75;
    const arcActive = (pct / 100) * arcMax;

    const unitStr = activeMetric?.unit || '%';
    const ariaSummary = `${title}${activeMetric ? ` — ${activeMetric.label}: ${Math.round(pct)}${unitStr}` : ''}`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="gauge"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          metrics.length > 1 ? (
            <ChartSegmented
              options={metrics.map((m) => ({ id: m.id, label: m.label }))}
              value={activeMetric?.id || ''}
              onChange={handleMetricChange}
              isRtl={isRtl}
              ariaLabel={title}
            />
          ) : undefined
        }
        footer={
          activeMetric &&
          (typeof activeMetric.target === 'number' || typeof activeMetric.delta === 'number') ? (
            <div className="flex items-center justify-between gap-2 ax-tk pt-1">
              {typeof activeMetric.target === 'number' ? (
                <span>
                  {activeMetric.targetLabel || strings.targetLabel}:{' '}
                  <strong className="text-[var(--ax-on)]">
                    {Math.round(activeMetric.target)}
                    {unitStr}
                  </strong>
                </span>
              ) : (
                <span />
              )}
              {typeof activeMetric.delta === 'number' && (
                <span
                  className={`ax-chip ${
                    activeMetric.delta >= 0 ? 'ax-chip-ok' : 'ax-chip-bad'
                  }`}
                >
                  <span aria-hidden="true">{activeMetric.delta >= 0 ? '▲' : '▼'}</span>
                  <span dir="ltr">
                    {formatChartValue(activeMetric.delta, {
                      locale,
                      format: 'percent',
                      signed: true,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </span>
              )}
            </div>
          ) : undefined
        }
      >
        <div className="relative flex items-center justify-center py-1">
          <svg
            viewBox="0 0 100 100"
            className="w-[206px] h-[196px] overflow-visible"
            role="img"
            aria-label={ariaSummary}
          >
            {/* 36 radial perimeter ticks */}
            {tickList.map((tk, idx) => (
              <line
                key={idx}
                x1={tk.x1}
                y1={tk.y1}
                x2={tk.x2}
                y2={tk.y2}
                stroke={tk.color}
                strokeWidth="1.45"
                strokeLinecap="round"
                className="ax-pop-item"
                style={{
                  transformOrigin: '50px 50px',
                  '--ax-delay': `${Math.min(idx * 10, 320)}ms`,
                  transition: 'stroke 0.25s ease',
                } as React.CSSProperties}
              />
            ))}

            {/* Track Arc (270°) */}
            <circle
              cx="50"
              cy="50"
              r="33.5"
              fill="none"
              pathLength={100}
              stroke="var(--ax-tick-off)"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeDasharray={`${arcMax} ${100 - arcMax}`}
              transform="rotate(135 50 50)"
            />

            {/* Active Arc (Main.dc.html emerald health stroke) */}
            <circle
              cx="50"
              cy="50"
              r="33.5"
              fill="none"
              pathLength={100}
              stroke="var(--ax-ok)"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeDasharray={`${arcActive} ${100 - arcActive}`}
              transform="rotate(135 50 50)"
              className="ax-donut-arc"
              style={{
                transition: 'stroke-dasharray 0.72s var(--ax-sp2)',
              }}
            />

            {/* Optional Target Radial Tick */}
            {targetAngle !== null && (
              <line
                x1="80"
                y1="50"
                x2="87"
                y2="50"
                stroke="var(--ax-on)"
                strokeWidth="1.8"
                strokeLinecap="round"
                transform={`rotate(${targetAngle} 50 50)`}
              />
            )}

            {/* Rotating Orbiting Marker Dot (#F4EDE6 cream dot with #151413 border) */}
            <g
              style={{
                transformOrigin: '50px 50px',
                transform: `rotate(${dotAngle}deg)`,
                transition: 'transform 0.9s var(--ax-sp)',
              }}
            >
              <circle
                cx="83.5"
                cy="50"
                r="5.6"
                fill="var(--ax-ok)"
                opacity="0.24"
              />
              <circle
                cx="83.5"
                cy="50"
                r="3.8"
                fill="#F4EDE6"
                stroke="#151413"
                strokeWidth="1.8"
              />
            </g>

            {/* 0% and 100% horseshoe base labels */}
            <text
              x="21"
              y="88"
              textAnchor="middle"
              className="fill-[var(--ax-mut)]"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '5.5px' }}
            >
              0%
            </text>
            <text
              x="79"
              y="88"
              textAnchor="middle"
              className="fill-[var(--ax-mut)]"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '5.5px' }}
            >
              100%
            </text>
          </svg>

          {/* Centered 52px Rolling Readout + Uppercase Mono Subtitle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-1">
            <span className="ax-disp ax-big-gauge text-[var(--ax-on)]">
              <RollingDigits value={`${Math.round(pct)}${unitStr}`} />
            </span>
            {activeMetric && (
              <span className="ax-tk uppercase tracking-[0.09em] text-[var(--ax-sub)] mt-1">
                {activeMetric.label}
              </span>
            )}
          </div>
        </div>
      </ChartCard>
    );
  }
);

RadialGauge.displayName = 'RadialGauge';
