import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { formatChartValue, getDefaultChartStrings } from '../math';
import { ConversionFunnelProps } from '../types';

const FUNNEL_COLORS = [
  'var(--ax-on)',
  'var(--ax-c5)',
  'var(--ax-c3)',
  'var(--ax-c1)',
  'var(--ax-c6)',
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
    filter,
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
        const nextVal = idx < clean.length - 1 ? clean[idx + 1].value : s.value * 0.72;
        const prevVal = idx > 0 ? clean[idx - 1].value : s.value;
        const stepRetention =
          idx === 0 ? 100 : prevVal > 0 ? Math.min(100, (s.value / prevVal) * 100) : 0;
        const dropOff = idx === 0 ? 0 : Math.max(0, 100 - stepRetention);
        const overallPct = firstVal > 0 ? (s.value / firstVal) * 100 : 0;
        const topPct = maxVal > 0 ? Math.max(18, (s.value / maxVal) * 100) : 18;
        const botPct =
          idx < clean.length - 1 && maxVal > 0
            ? Math.max(14, (nextVal / maxVal) * 100)
            : Math.max(12, topPct * 0.78);
        return {
          ...s,
          color: s.color || FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
          stepRetention,
          dropOff,
          overallPct,
          topPct,
          botPct,
        };
      });

      const overallRate = firstVal > 0 ? (lastVal / firstVal) * 100 : 0;
      const maxDropRow = rows.reduce<(typeof rows)[0] | null>(
        (best, row) => (row.dropOff > (best?.dropOff ?? 0) ? row : best),
        null
      );
      return { rows, overallRate, maxVal, maxDropRow };
    }, [stages]);

    const isEmpty = state === 'ready' && processed.rows.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const activeRow =
      activeIdx !== null && processed.rows[activeIdx] ? processed.rows[activeIdx] : null;
    const headerVal = activeRow ? activeRow.overallPct : processed.overallRate;
    const headerSub = activeRow
      ? activeRow.dropOff > 0
        ? `${activeRow.label} (-${Math.round(activeRow.dropOff)}% ${strings.dropoffLabel.toLowerCase()})`
        : `${stepLabel || strings.stepLabel}: 100%`
      : conversionLabel || strings.conversionLabel;

    const ariaSummary = `${title}: ${processed.rows
      .map((r) => `${r.label} ${r.value}`)
      .join(' → ')}`;

    const rowHeight = Math.max(36, Math.min(48, Math.floor(196 / Math.max(1, processed.rows.length))));
    const svgH = processed.rows.length * rowHeight + 8;
    const cx = 204;
    const maxTrapHalfW = 84;

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
        filter={filter}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-mid text-[var(--ax-acc)]">
              <RollingDigits value={`${Math.round(headerVal)}%`} />
            </span>
            <span className="ax-tk truncate max-w-[170px]">{headerSub}</span>
          </div>
        }
        footer={
          processed.rows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 ax-tk pt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--ax-c1)]" />
                <span>
                  {conversionLabel || strings.conversionLabel}:{' '}
                  <strong className="text-[var(--ax-on)]" dir="ltr">
                    {Math.round(processed.overallRate)}%
                  </strong>
                </span>
              </span>
              {processed.maxDropRow && processed.maxDropRow.dropOff > 0 && (
                <span className="truncate">
                  {strings.dropoffLabel}:{' '}
                  <strong className="text-[var(--ax-on)]">
                    {processed.maxDropRow.label}
                  </strong>{' '}
                  <span dir="ltr">(-{Math.round(processed.maxDropRow.dropOff)}%)</span>
                </span>
              )}
            </div>
          ) : undefined
        }
      >
        {/* Unified Centered SVG Funnel matching Main.dc.html */}
        <div
          className="relative w-full select-none"
          onPointerLeave={() => setActiveIdx(null)}
        >
          <svg
            viewBox={`0 0 400 ${svgH}`}
            className="w-full h-auto overflow-visible"
            style={{ direction: 'ltr' }}
            role="img"
            aria-label={ariaSummary}
          >
            {processed.rows.map((row, idx) => {
              const isActive = activeIdx === idx;
              const isDim = activeIdx !== null && !isActive;
              const yTop = idx * rowHeight + 4;
              const yBot = yTop + rowHeight - 5;
              const yMid = (yTop + yBot) / 2;
              const hwTop = (row.topPct / 100) * maxTrapHalfW;
              const hwBot = (row.botPct / 100) * maxTrapHalfW;

              const points = `${(cx - hwTop).toFixed(1)},${yTop} ${(cx + hwTop).toFixed(1)},${yTop} ${(cx + hwBot).toFixed(1)},${yBot} ${(cx - hwBot).toFixed(1)},${yBot}`;

              return (
                <g
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`${row.label}: ${formatChartValue(row.value, {
                    locale,
                    format,
                    currency,
                    unit,
                  })} (${Math.round(row.overallPct)}%)`}
                  onPointerEnter={() => setActiveIdx(idx)}
                  onFocus={() => setActiveIdx(idx)}
                  onBlur={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                  className="cursor-pointer outline-none"
                  style={{
                    opacity: isDim ? 0.3 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {/* Transparent full-width hit target */}
                  <rect x="0" y={yTop - 2} width="400" height={rowHeight} fill="transparent" />

                  {/* Tapered centered trapezoid with horizontal spring reveal */}
                  <polygon
                    points={points}
                    fill={row.color}
                    className="ax-pop-item"
                    style={{
                      transformOrigin: `${cx}px ${yMid}px`,
                      transform: isActive ? 'scale(1.045, 1.03)' : 'scale(1, 1)',
                      '--ax-delay': `${Math.min(idx * 105, 360)}ms`,
                      transition: 'transform 0.32s var(--ax-sp2)',
                    } as React.CSSProperties}
                  />

                  {/* Stage label left */}
                  <text
                    x="4"
                    y={yMid + 4}
                    textAnchor="start"
                    className="fill-[var(--ax-on)]"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      unicodeBidi: 'plaintext',
                    }}
                  >
                    {row.label}
                  </text>

                  {/* Hairline guide from label toward trapezoid */}
                  <line
                    x1="108"
                    y1={yMid}
                    x2={cx - hwTop - 8}
                    y2={yMid}
                    stroke="var(--ax-bdr)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity={hwTop < 80 ? 0.65 : 0}
                  />

                  {/* Count · Step Retention right */}
                  <text
                    x="396"
                    y={yMid + 4}
                    textAnchor="end"
                    className="fill-[var(--ax-on)]"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11.5px',
                      fontWeight: 600,
                    }}
                  >
                    {formatChartValue(row.value, {
                      locale,
                      format,
                      currency,
                      unit,
                    })}{' '}
                    · {idx === 0 ? '100%' : `${Math.round(row.stepRetention)}%`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </ChartCard>
    );
  }
);

ConversionFunnel.displayName = 'ConversionFunnel';
