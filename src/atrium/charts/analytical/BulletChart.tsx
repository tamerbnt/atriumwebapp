import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { formatChartValue, getDefaultChartStrings } from '../math';
import { BulletChartProps } from '../types';

export const BulletChart: React.FC<BulletChartProps> = React.memo(
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
    format = 'number',
    currency = 'DZD',
    unit,
    achievedLabel,
    actualLegendLabel,
    targetLegendLabel,
  }) => {
    const strings = getDefaultChartStrings(locale);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const processed = useMemo(() => {
      const clean = (items || []).filter(
        (it) => Number.isFinite(it.value)
      );
      if (clean.length === 0) return { rows: [], maxDomain: 100, hasAnyTarget: false };

      const maxRaw = Math.max(
        ...clean.flatMap((it) => [
          Math.max(0, it.value),
          typeof it.target === 'number' && Number.isFinite(it.target)
            ? Math.max(0, it.target)
            : 0,
        ]),
        1
      );
      const maxDomain = maxRaw * 1.12;
      const hasAnyTarget = clean.some(
        (it) => typeof it.target === 'number' && Number.isFinite(it.target) && it.target > 0
      );

      const rows = clean.map((it, idx) => {
        const val = Math.max(0, it.value);
        const hasTarget =
          typeof it.target === 'number' && Number.isFinite(it.target) && it.target > 0;
        const tgt = hasTarget ? (it.target as number) : undefined;
        const valPct = Math.min(100, (val / maxDomain) * 100);
        const tgtPct = tgt !== undefined ? Math.min(100, (tgt / maxDomain) * 100) : undefined;
        const isReached = tgt !== undefined ? val >= tgt : false;
        const deltaPct =
          tgt !== undefined && tgt > 0 ? ((val - tgt) / tgt) * 100 : undefined;

        return {
          id: it.id || `bl-${idx}`,
          label: it.label,
          val,
          tgt,
          valPct,
          tgtPct,
          isReached,
          deltaPct,
        };
      });

      return { rows, maxDomain, hasAnyTarget };
    }, [items]);

    const isEmpty = state === 'ready' && processed.rows.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const ariaSummary = `${title}: ${processed.rows.length} indicateurs`;

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
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-[var(--ax-c1)]" />
                <span>{actualLegendLabel || strings.actualLabel}</span>
              </span>
              {processed.hasAnyTarget && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-[2px] h-3 bg-[var(--ax-on)]" />
                  <span>{targetLegendLabel || strings.targetLabel}</span>
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--ax-ok)]" />
              <span>{achievedLabel || strings.achievedLabel}</span>
            </span>
          </div>
        }
      >
        <div
          className="flex flex-col gap-3.5"
          role="list"
          aria-label={ariaSummary}
          onPointerLeave={() => setHoveredIdx(null)}
        >
          {processed.rows.map((row, idx) => {
            const isHovered = hoveredIdx === idx;
            const isDim = hoveredIdx !== null && !isHovered;

            return (
              <div
                key={row.id}
                role="listitem"
                tabIndex={0}
                onPointerEnter={() => setHoveredIdx(idx)}
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() => setHoveredIdx(null)}
                className="ax-plot-focus ax-row-stack grid grid-cols-[minmax(96px,140px)_minmax(0,1fr)_auto] items-center gap-3 cursor-pointer transition-opacity duration-150"
                style={{ opacity: isDim ? 0.42 : 1 }}
              >
                <span
                  className="text-[12.5px] font-medium text-[var(--ax-on)] truncate"
                  title={row.label}
                >
                  {row.label}
                </span>

                {/* 80% neutral zone + actual fill + optional target hairline */}
                <div className="relative h-6 rounded-[8px] bg-[var(--ax-soft)] flex items-center px-0 overflow-hidden">
                  <div
                    className="h-full bg-[var(--ax-soft)] border-e border-[var(--ax-bdr)] pointer-events-none"
                    style={{ width: '80%' }}
                    aria-hidden="true"
                  />
                  <div
                    className="ax-bar-x absolute top-1.5 bottom-1.5 inset-inline-start-0 rounded-full w-full"
                    style={{
                      transform: `scaleX(${Math.max(0.015, row.valPct / 100)})`,
                      background: row.isReached ? 'var(--ax-ok)' : 'var(--ax-c1)',
                    }}
                  />
                  {row.tgtPct !== undefined && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0.5 bottom-0.5 w-[2.5px] rounded-full bg-[var(--ax-on)] z-10 pointer-events-none"
                      style={{ insetInlineStart: `calc(${row.tgtPct}% - 1px)` }}
                    />
                  )}
                </div>

                {/* Readout & Achievement Badge */}
                <div className="ax-row-meta-sm flex items-center justify-end gap-2 shrink-0">
                  <span className="ax-nv">
                    {formatChartValue(row.val, { locale, format, currency, unit })}
                  </span>
                  {row.deltaPct !== undefined && (
                    <span
                      className={`ax-chip ${
                        row.isReached ? 'ax-chip-ok' : 'ax-chip-neutral'
                      }`}
                    >
                      {row.isReached
                        ? row.deltaPct > 0.5
                          ? `+${Math.round(row.deltaPct)}%`
                          : achievedLabel || strings.achievedLabel
                        : `${Math.round(row.deltaPct)}%`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    );
  }
);

BulletChart.displayName = 'BulletChart';
