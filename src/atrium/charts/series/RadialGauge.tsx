import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { ChartSegmented } from '../primitives/ChartSegmented';
import { RollingDigits } from '../primitives/RollingDigits';
import { useIsRtl } from '../hooks';
import { formatChartValue } from '../math';
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
        const r1 = 42;
        const r2 = i % 6 === 0 ? 47.5 : 46;
        const x1 = 50 + r1 * Math.cos(rad);
        const y1 = 50 + r1 * Math.sin(rad);
        const x2 = 50 + r2 * Math.cos(rad);
        const y2 = 50 + r2 * Math.sin(rad);
        const isOn = i < activeCount;
        const ratio = i / (TOTAL_TICKS - 1);
        const color = !isOn
          ? 'var(--ax-tick-off)'
          : ratio > 0.72
            ? 'var(--ax-c1)'
            : 'var(--ax-c3)';
        items.push({ x1, y1, x2, y2, color });
      }
      return items;
    }, [pct]);

    const dotCoords = useMemo(() => {
      const deg = START_ANGLE + (pct / 100) * SWEEP_DEG;
      const rad = (deg * Math.PI) / 180;
      return {
        x: 50 + 36 * Math.cos(rad),
        y: 50 + 36 * Math.sin(rad),
      };
    }, [pct]);

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
                  {activeMetric.targetLabel || 'Objectif'}:{' '}
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
                  {activeMetric.delta >= 0 ? '▲' : '▼'}{' '}
                  {formatChartValue(activeMetric.delta, {
                    locale,
                    format: 'percent',
                    signed: true,
                    maximumFractionDigits: 1,
                  })}
                </span>
              )}
            </div>
          ) : undefined
        }
      >
        <div className="relative flex items-center justify-center py-2">
          <svg
            viewBox="0 0 100 100"
            className="w-[208px] h-[196px] overflow-visible"
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
                strokeWidth="1.6"
                strokeLinecap="round"
                style={{ transition: 'stroke 0.25s ease' }}
              />
            ))}

            {/* Track Arc (270°) */}
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              pathLength={100}
              stroke="var(--ax-tick-off)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${arcMax} ${100 - arcMax}`}
              transform="rotate(135 50 50)"
            />

            {/* Active Arc */}
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              pathLength={100}
              stroke="var(--ax-c1)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${arcActive} ${100 - arcActive}`}
              transform="rotate(135 50 50)"
              style={{
                transition: 'stroke-dasharray 0.55s var(--ax-sp2)',
              }}
            />

            {/* Orbiting Marker Dot */}
            <circle
              cx={dotCoords.x}
              cy={dotCoords.y}
              r="4.5"
              fill="var(--ax-slab)"
              stroke="var(--ax-c1)"
              strokeWidth="2.4"
              style={{
                transition: 'cx 0.45s var(--ax-sp2), cy 0.45s var(--ax-sp2)',
              }}
            />
          </svg>

          {/* Centered 52px Rolling Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
            <span className="ax-disp ax-big-gauge text-[var(--ax-on)]">
              <RollingDigits value={`${Math.round(pct)}${unitStr}`} />
            </span>
            {activeMetric && (
              <span className="text-[11.5px] font-medium text-[var(--ax-sub)] mt-1">
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
