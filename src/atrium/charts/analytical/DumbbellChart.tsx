import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import {
  formatChartValue,
  formatCompactTick,
  getDefaultChartStrings,
  niceScale,
} from '../math';
import { DumbbellChartProps } from '../types';

export const DumbbellChart: React.FC<DumbbellChartProps> = React.memo(
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
    items,
    prevLabel,
    currentLabel,
    format = 'number',
    currency = 'DZD',
    unit,
    deltaUnit,
    higherIsBetter = true,
  }) => {
    const strings = getDefaultChartStrings(locale);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const processed = useMemo(() => {
      const clean = (items || []).filter(
        (it) => Number.isFinite(it.prev) && Number.isFinite(it.value)
      );
      if (clean.length === 0) {
        return { rows: [], scale: niceScale(0, 100, 5) };
      }

      const all = clean.flatMap((it) => [it.prev, it.value]);
      const minV = Math.min(...all);
      const maxV = Math.max(...all);
      const scale = niceScale(minV, maxV, 5);
      const span = Math.max(1e-9, scale.max - scale.min);

      const rows = clean.map((it, idx) => {
        const prevPct = ((it.prev - scale.min) / span) * 100;
        const valPct = ((it.value - scale.min) / span) * 100;
        const diff = it.value - it.prev;
        const improved =
          diff === 0 ? null : higherIsBetter ? diff > 0 : diff < 0;
        return {
          id: it.id || `db-${idx}`,
          label: it.label,
          prev: it.prev,
          value: it.value,
          prevPct,
          valPct,
          leftPct: Math.min(prevPct, valPct),
          widthPct: Math.abs(valPct - prevPct),
          diff,
          improved,
        };
      });

      return { rows, scale };
    }, [items, higherIsBetter]);

    const isEmpty = state === 'ready' && processed.rows.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const ariaSummary = `${title}: ${processed.rows.length} ${strings.itemsWord}`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="list"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        filter={filter}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 ax-tk pt-1">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-[var(--ax-c4)] bg-[var(--ax-slab)]" />
                <span>{prevLabel || strings.previousLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ax-c1)]" />
                <span>{strings.improvementLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ax-on)]" />
                <span>{strings.degradationLabel}</span>
              </span>
            </div>
            <div className="flex items-center gap-2" dir="ltr">
              {[
                processed.scale.min,
                (processed.scale.min + processed.scale.max) / 2,
                processed.scale.max,
              ].map((tk, idx) => (
                <span key={idx} className="opacity-70">
                  {formatCompactTick(tk, locale)}
                  {idx < 2 ? ' ·' : ''}
                </span>
              ))}
            </div>
          </div>
        }
      >
        <div
          className="flex flex-col gap-3"
          role="list"
          aria-label={ariaSummary}
          onPointerLeave={() => setHoveredIdx(null)}
        >
          {processed.rows.map((row, idx) => {
            const isHovered = hoveredIdx === idx;
            const isDim = hoveredIdx !== null && !isHovered;
            const dotColor =
              row.improved === null
                ? 'var(--ax-c4)'
                : row.improved
                  ? 'var(--ax-c1)'
                  : 'var(--ax-on)';

            return (
              <div
                key={row.id}
                role="listitem"
                tabIndex={0}
                onPointerEnter={() => setHoveredIdx(idx)}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx(null)}
                className={`ax-plot-focus ax-row-stack grid grid-cols-[minmax(76px,98px)_minmax(0,1fr)_auto] items-center gap-2.5 px-1.5 py-1 rounded-[var(--r-ctl-sm,10px)] cursor-pointer transition-[background-color,opacity] duration-150 ${
                  isHovered ? 'bg-[var(--ax-soft)]' : ''
                }`}
                style={{ opacity: isDim ? 0.4 : 1 }}
              >
                <span
                  className="text-[12px] font-medium text-[var(--ax-on)] truncate"
                  title={row.label}
                >
                  {row.label}
                </span>

                {/* Track + 4px Connector + Hollow Previous Ring + Filled Current Dot */}
                <div className="relative h-5 mx-1.5 flex items-center">
                  <div className="absolute inset-x-0 h-[4px] bg-[var(--ax-soft)] rounded-full" />

                  <div
                    className="ax-bar-x absolute h-[4px] rounded-full"
                    style={{
                      insetInlineStart: `${row.leftPct}%`,
                      width: `${Math.max(0.5, row.widthPct)}%`,
                      background: dotColor,
                      transformOrigin: row.valPct >= row.prevPct ? 'left center' : 'right center',
                      transitionDelay: `${Math.min(idx * 55, 260)}ms`,
                    }}
                  />

                  {/* Previous Hollow Ring */}
                  <span
                    className="absolute -translate-x-1/2 rtl:translate-x-1/2 z-10 pointer-events-none"
                    style={{ insetInlineStart: `${row.prevPct}%` }}
                  >
                    <span
                      className="ax-pop-item block w-3 h-3 rounded-full border-[2.5px] border-[var(--ax-c4)] bg-[var(--ax-slab)]"
                      style={{
                        transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                        '--ax-delay': `${Math.min(idx * 55, 260)}ms`,
                        transition: 'transform 0.24s var(--ax-sp2)',
                      } as React.CSSProperties}
                    />
                  </span>

                  {/* Current Filled Dot */}
                  <span
                    className="absolute -translate-x-1/2 rtl:translate-x-1/2 z-20 pointer-events-none"
                    style={{ insetInlineStart: `${row.valPct}%` }}
                  >
                    <span
                      className="ax-pop-item block w-3 h-3 rounded-full ring-2 ring-[var(--ax-slab)]"
                      style={{
                        background: dotColor,
                        transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                        '--ax-delay': `${Math.min(idx * 55 + 70, 320)}ms`,
                        transition: 'transform 0.24s var(--ax-sp2)',
                      } as React.CSSProperties}
                    />
                  </span>
                </div>

                {/* Current Value & Semantic Delta Chip */}
                <div className="ax-row-meta-sm flex items-center justify-end gap-1.5 shrink-0">
                  <span className="ax-nv text-[12px]" dir="ltr">
                    {formatChartValue(row.value, { locale, format, currency, unit })}
                  </span>
                  <span
                    className={`ax-chip ${
                      row.improved === null
                        ? 'ax-chip-neutral'
                        : row.improved
                          ? 'ax-chip-ok'
                          : 'ax-chip-neutral'
                    }`}
                  >
                    <span aria-hidden="true">
                      {row.diff > 0 ? '▲' : row.diff < 0 ? '▼' : '•'}
                    </span>
                    <span dir="ltr">
                      {formatChartValue(row.diff, {
                        locale,
                        format,
                        currency,
                        unit: deltaUnit ?? unit,
                        signed: true,
                      })}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    );
  }
);

DumbbellChart.displayName = 'DumbbellChart';
