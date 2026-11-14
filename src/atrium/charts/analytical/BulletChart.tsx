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

    const ariaSummary = `${title}: ${processed.rows.length} ${strings.indicatorsWord}`;

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
          <div className="flex flex-wrap items-center gap-4 ax-tk pt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-[9px] rounded-full bg-[var(--ax-c1)]" />
              <span>{actualLegendLabel || strings.actualLabel}</span>
            </span>
            {processed.hasAnyTarget && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-[3px] h-4 rounded-full bg-[var(--ax-on)]" />
                <span>{targetLegendLabel || strings.targetLabel}</span>
              </span>
            )}
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
                className={`ax-plot-focus ax-row-stack grid grid-cols-[minmax(76px,104px)_minmax(0,1fr)_auto] items-center gap-2.5 px-1.5 py-1 rounded-[10px] cursor-pointer transition-all duration-150 ${
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

                {/* 24px track with 80% neutral zone + centered 10px coral fill + overhanging 3px target tick */}
                <div className="relative h-6 rounded-[6px] bg-[var(--ax-soft)] flex items-center">
                  <div
                    className="h-full rounded-s-[6px] bg-[var(--ax-on)]/[0.06] pointer-events-none"
                    style={{ width: '80%' }}
                    aria-hidden="true"
                  />
                  <div
                    className="ax-bar-x absolute top-1/2 -translate-y-1/2 h-2.5 inset-inline-start-0 rounded-full w-full"
                    style={{
                      transform: `scaleX(${Math.max(0.015, row.valPct / 100)})`,
                      background: 'var(--ax-c1)',
                      transitionDelay: `${Math.min(idx * 65, 260)}ms`,
                    }}
                  />
                  {row.tgtPct !== undefined && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-[3px] -bottom-[3px] w-[3px] rounded-full bg-[var(--ax-on)] z-10 pointer-events-none transition-transform duration-200"
                      style={{
                        insetInlineStart: `calc(${row.tgtPct}% - 1.5px)`,
                        transform: isHovered ? 'scaleY(1.16)' : 'scaleY(1)',
                      }}
                    />
                  )}
                </div>

                {/* Readout & Semantic Achievement Chip (green on target reached, neutral otherwise) */}
                <div className="ax-row-meta-sm flex items-center justify-end gap-1.5 shrink-0">
                  <span className="ax-nv text-[12px]" dir="ltr">
                    {formatChartValue(row.val, { locale, format, currency, unit })}
                  </span>
                  {row.deltaPct !== undefined && (
                    <span
                      dir="ltr"
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
