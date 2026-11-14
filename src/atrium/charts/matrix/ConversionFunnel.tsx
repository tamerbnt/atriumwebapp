import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { formatChartValue, getDefaultChartStrings } from '../math';
import { ConversionFunnelProps } from '../types';

const FUNNEL_COLORS = [
  'var(--ax-c1)',
  'var(--ax-c3)',
  'var(--ax-c5)',
  'var(--ax-c4)',
  'var(--ax-on)',
];

export const ConversionFunnel: React.FC<ConversionFunnelProps> = React.memo(
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
    stages,
    format = 'number',
    currency = 'DZD',
    unit,
    conversionLabel,
    stepLabel,
  }) => {
    const strings = getDefaultChartStrings(locale);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const processed = useMemo(() => {
      if (!stages || stages.length === 0) return { rows: [], overallRate: 0, maxVal: 0 };
      const clean = stages.map((s) => ({
        ...s,
        value: Math.max(0, Number.isFinite(s.value) ? s.value : 0),
      }));
      const firstVal = clean[0].value;
      const lastVal = clean[clean.length - 1].value;
      const maxVal = Math.max(...clean.map((s) => s.value), 1);

      const rows = clean.map((s, idx) => {
        const prevVal = idx > 0 ? clean[idx - 1].value : s.value;
        const stepRetention =
          idx === 0 ? 100 : prevVal > 0 ? Math.min(100, (s.value / prevVal) * 100) : 0;
        const dropOff = idx === 0 ? 0 : Math.max(0, 100 - stepRetention);
        const overallPct = firstVal > 0 ? (s.value / firstVal) * 100 : 0;
        const topWidth = maxVal > 0 ? Math.max(16, (prevVal / maxVal) * 100) : 16;
        const botWidth = maxVal > 0 ? Math.max(12, (s.value / maxVal) * 100) : 12;
        return {
          ...s,
          color: s.color || FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
          stepRetention,
          dropOff,
          overallPct,
          topWidth: idx === 0 ? botWidth : topWidth,
          botWidth,
        };
      });

      const overallRate = firstVal > 0 ? (lastVal / firstVal) * 100 : 0;
      return { rows, overallRate, maxVal };
    }, [stages]);

    const isEmpty = state === 'ready' && processed.rows.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const activeRow =
      activeIdx !== null && processed.rows[activeIdx] ? processed.rows[activeIdx] : null;
    const headerVal = activeRow ? activeRow.overallPct : processed.overallRate;
    const headerSub = activeRow
      ? `${stepLabel || strings.stepLabel}: ${Math.round(activeRow.stepRetention)}% (${
          activeRow.label
        })`
      : conversionLabel || strings.conversionLabel;

    const ariaSummary = `${title}: ${processed.rows
      .map((r) => `${r.label} ${r.value}`)
      .join(' → ')}`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="funnel"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-mid text-[var(--ax-on)]">
              <RollingDigits value={`${Math.round(headerVal)}%`} />
            </span>
            <span className="ax-tk truncate max-w-[160px]">{headerSub}</span>
          </div>
        }
      >
        <div
          className="flex flex-col gap-2 py-1"
          role="list"
          aria-label={ariaSummary}
          onPointerLeave={() => setActiveIdx(null)}
        >
          {processed.rows.map((row, idx) => {
            const isActive = activeIdx === idx;
            const isDim = activeIdx !== null && !isActive;
            const x1L = 50 - row.topWidth / 2;
            const x1R = 50 + row.topWidth / 2;
            const x2L = 50 - row.botWidth / 2;
            const x2R = 50 + row.botWidth / 2;

            return (
              <button
                key={row.id}
                type="button"
                role="listitem"
                onPointerEnter={() => setActiveIdx(idx)}
                onFocus={() => setActiveIdx(idx)}
                onBlur={() => setActiveIdx(null)}
                onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                aria-label={`${row.label}: ${formatChartValue(row.value, {
                  locale,
                  format,
                  currency,
                  unit,
                })} (${Math.round(row.overallPct)}%)`}
                className="ax-plot-focus relative w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[12px] cursor-pointer transition-opacity duration-150 overflow-hidden bg-[var(--ax-soft)]"
                style={{ opacity: isDim ? 0.38 : 1 }}
              >
                {/* SVG Trapezoid backdrop */}
                <svg
                  viewBox="0 0 100 32"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  aria-hidden="true"
                >
                  <polygon
                    points={`${x1L},0 ${x1R},0 ${x2R},32 ${x2L},32`}
                    fill={row.color}
                    opacity={isActive ? 0.34 : 0.22}
                    style={{ transition: 'opacity 0.2s ease' }}
                  />
                  <line
                    x1={x2L}
                    y1={31}
                    x2={x2R}
                    y2={31}
                    stroke={row.color}
                    strokeWidth="2"
                  />
                </svg>

                <span className="relative z-10 flex items-center gap-2 min-w-0 text-left rtl:text-right">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: row.color }}
                  />
                  <span className="text-[12.5px] font-semibold text-[var(--ax-on)] truncate">
                    {row.label}
                  </span>
                </span>

                <span className="relative z-10 flex items-center gap-2.5 shrink-0 ax-nv">
                  <span>
                    {formatChartValue(row.value, {
                      locale,
                      format,
                      currency,
                      unit,
                    })}
                  </span>
                  <span className="ax-tk w-11 text-right rtl:text-left text-[var(--ax-sub)]">
                    {idx === 0 ? '100%' : `${Math.round(row.stepRetention)}%`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </ChartCard>
    );
  }
);

ConversionFunnel.displayName = 'ConversionFunnel';
