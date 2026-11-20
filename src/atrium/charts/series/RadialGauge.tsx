import React, { useCallback, useMemo, useState } from 'react';
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
    filter,
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

    const metricOptions = useMemo(
      () => (metrics.length > 1 ? metrics.map((m) => ({ id: m.id, label: m.label })) : undefined),
      [metrics]
    );

    const handleMetricChange = useCallback(
      (id: string) => {
        setInternalMetricId(id);
        onMetricChange?.(id);
      },
      [onMetricChange]
    );

    const tickList = useMemo(() => {
      const items = [];
      const activeCount = Math.round((pct / 100) * TOTAL_TICKS);
      for (let i = 0; i < TOTAL_TICKS; i++) {
        const deg = START_ANGLE + (i / (TOTAL_TICKS - 1)) * SWEEP_DEG;
        const rad = (deg * Math.PI) / 180;
        const r1 = 85;
        const r2 = i % 6 === 0 ? 96 : 92;
        const x1 = 100 + r1 * Math.cos(rad);
        const y1 = 100 + r1 * Math.sin(rad);
        const x2 = 100 + r2 * Math.cos(rad);
        const y2 = 100 + r2 * Math.sin(rad);
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
        filter={metrics.length <= 1 ? filter : undefined}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          metricOptions ? (
            <ChartSegmented
              options={metricOptions}
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
            <div className="flex items-center justify-between gap-[var(--s2,8px)] ax-tk">
              {typeof activeMetric.target === 'number' ? (
                <span>
                  {activeMetric.targetLabel || strings.targetLabel}:{' '}
                  <strong className="font-semibold text-[var(--ax-on)]">
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
        <div className="relative flex items-center justify-center py-[var(--s1,4px)]">
          <svg
            viewBox="0 0 200 200"
            className="w-[200px] h-[200px] overflow-visible"
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
                strokeWidth="2.9"
                strokeLinecap="round"
                className="ax-pop-item"
                style={{
                  transformOrigin: '100px 100px',
                  '--ax-delay': `${Math.min(idx * 10, 320)}ms`,
                  transition: 'stroke 0.25s ease',
                } as React.CSSProperties}
              />
            ))}

            {/* Track Arc (270°) */}
            <circle
              cx="100"
              cy="100"
              r="67"
              fill="none"
              pathLength={100}
              stroke="var(--ax-tick-off)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${arcMax} ${100 - arcMax}`}
              transform="rotate(135 100 100)"
            />

            {/* Active Arc */}
            <circle
              cx="100"
              cy="100"
              r="67"
              fill="none"
              pathLength={100}
              stroke="var(--ax-ok)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${arcActive} ${100 - arcActive}`}
              transform="rotate(135 100 100)"
              className="ax-donut-arc"
              style={{
                transition: 'stroke-dasharray 0.72s var(--ax-sp2)',
              }}
            />

            {/* Optional Target Radial Tick */}
            {targetAngle !== null && (
              <line
                x1="160"
                y1="100"
                x2="174"
                y2="100"
                stroke="var(--ax-on)"
                strokeWidth="3.6"
                strokeLinecap="round"
                transform={`rotate(${targetAngle} 100 100)`}
              />
            )}

            {/* Rotating Orbiting Marker Dot (#F4EDE6 cream dot with #151413 border) */}
            <g
              style={{
                transformOrigin: '100px 100px',
                transform: `rotate(${dotAngle}deg)`,
                transition: 'transform 0.9s var(--ax-sp)',
              }}
            >
              <circle
                cx="167"
                cy="100"
                r="11.2"
                fill="var(--ax-ok)"
                opacity="0.24"
              />
              <circle
                cx="167"
                cy="100"
                r="7.6"
                fill="#F4EDE6"
                stroke="#151413"
                strokeWidth="3.6"
              />
            </g>

            {/* 0% and 100% horseshoe base labels */}
            <text
              x="42"
              y="176"
              textAnchor="middle"
              className="fill-[var(--ax-mut)]"
              style={{
                fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                fontSize: '12px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              0%
            </text>
            <text
              x="158"
              y="176"
              textAnchor="middle"
              className="fill-[var(--ax-mut)]"
              style={{
                fontFamily: "var(--font-ui, 'Inter', sans-serif)",
                fontSize: '12px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              100%
            </text>
          </svg>

          {/* Centered Rolling Readout + Subtitle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[var(--s1,4px)] pointer-events-none">
            <span className="ax-disp ax-big-gauge text-[var(--ax-on)]">
              <RollingDigits value={`${Math.round(pct)}${unitStr}`} />
            </span>
            {activeMetric && (
              <span className="t-small text-[var(--ax-sub)]">
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
