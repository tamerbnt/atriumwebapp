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

    const ariaSummary = `${title}: comparaison sur ${processed.rows.length} éléments`;

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
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 ax-tk pt-1">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--ax-c4)] bg-[var(--ax-slab)]" />
                <span>{prevLabel || strings.previousLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ax-c1)]" />
                <span>{currentLabel || strings.currentLabel}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {processed.scale.ticks.map((tk, idx) => (
                <span key={idx} className="opacity-70">
                  {formatCompactTick(tk, locale)}
                  {idx < processed.scale.ticks.length - 1 ? ' ·' : ''}
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
                  ? 'var(--ax-ok)'
                  : 'var(--ax-c1)';

            return (
              <div
                key={row.id}
                role="listitem"
                tabIndex={0}
                onPointerEnter={() => setHoveredIdx(idx)}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx(null)}
                className="ax-plot-focus ax-row-stack grid grid-cols-[minmax(92px,136px)_minmax(0,1fr)_auto] items-center gap-3 cursor-pointer transition-opacity duration-150"
                style={{ opacity: isDim ? 0.42 : 1 }}
              >
                <span
                  className="text-[12.5px] font-medium text-[var(--ax-on)] truncate"
                  title={row.label}
                >
                  {row.label}
                </span>

                {/* Track + Connector + Hollow Previous Ring + Filled Current Dot */}
                <div className="relative h-5 flex items-center">
                  <div className="absolute inset-x-0 h-[1.5px] bg-[var(--ax-bdr)] rounded-full" />

                  <div
                    className="absolute h-[3px] rounded-full transition-opacity duration-200"
                    style={{
                      insetInlineStart: `${row.leftPct}%`,
                      width: `${Math.max(0.5, row.widthPct)}%`,
                      background: dotColor,
                    }}
                  />

                  {/* Previous Hollow Ring */}
                  <span
                    className="absolute w-2.5 h-2.5 rounded-full border-2 border-[var(--ax-c4)] bg-[var(--ax-slab)] -translate-x-1/2 rtl:translate-x-1/2 z-10"
                    style={{ insetInlineStart: `${row.prevPct}%` }}
                  />

                  {/* Current Filled Dot */}
                  <span
                    className="absolute w-3 h-3 rounded-full -translate-x-1/2 rtl:translate-x-1/2 z-20 ring-2 ring-[var(--ax-slab)]"
                    style={{
                      insetInlineStart: `${row.valPct}%`,
                      background: dotColor,
                    }}
                  />
                </div>

                {/* Current Value & Semantic Delta Chip */}
                <div className="ax-row-meta-sm flex items-center justify-end gap-2 shrink-0">
                  <span className="ax-nv">
                    {formatChartValue(row.value, { locale, format, currency, unit })}
                  </span>
                  <span
                    className={`ax-chip ${
                      row.improved === null
                        ? 'ax-chip-neutral'
                        : row.improved
                          ? 'ax-chip-ok'
                          : 'ax-chip-bad'
                    }`}
                  >
                    <span aria-hidden="true">
                      {row.diff > 0 ? '▲' : row.diff < 0 ? '▼' : '•'}
                    </span>
                    <span>
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
