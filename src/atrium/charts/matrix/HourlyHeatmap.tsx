import React, { useMemo, useRef, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { useIsRtl } from '../hooks';
import { formatChartValue, getDefaultChartStrings } from '../math';
import { HourlyHeatmapProps } from '../types';

export const HourlyHeatmap: React.FC<HourlyHeatmapProps> = React.memo(
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
    rows,
    cols,
    cells,
    unit,
    format = 'number',
    lowLabel,
    highLabel,
    peakLabel,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const gridRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<{ r: number; c: number } | null>(null);

    const metrics = useMemo(() => {
      if (!rows?.length || !cols?.length || !cells?.length) {
        return {
          max: 0,
          peak: { r: 0, c: 0, val: 0 },
          total: 0,
          matrix: [] as Array<Array<{ bg: string; delay: string }>>,
        };
      }
      let max = 0;
      let peakR = 0;
      let peakC = 0;
      let total = 0;
      for (let r = 0; r < rows.length; r++) {
        const rowVals = cells[r] || [];
        for (let c = 0; c < cols.length; c++) {
          const val = Math.max(0, Number.isFinite(rowVals[c]) ? rowVals[c] : 0);
          total += val;
          if (val > max) {
            max = val;
            peakR = r;
            peakC = c;
          }
        }
      }
      const matrix = rows.map((_, r) => {
        const rowVals = cells[r] || [];
        return cols.map((__, c) => {
          const raw = Math.max(0, Number.isFinite(rowVals[c]) ? rowVals[c] : 0);
          const intensity = max > 0 ? raw / max : 0;
          const bg =
            raw <= 0
              ? 'var(--ax-soft)'
              : `color-mix(in srgb, var(--ax-c1) ${Math.round(
                  (0.14 + intensity * 0.86) * 100
                )}%, var(--ax-slab))`;
          return {
            bg,
            delay: `${Math.min((r * cols.length + c) * 7, 280)}ms`,
          };
        });
      });
      return { max, peak: { r: peakR, c: peakC, val: max }, total, matrix };
    }, [rows, cols, cells]);

    const isEmpty =
      state === 'ready' && (!rows?.length || !cols?.length || !cells?.length);
    const effectiveState = isEmpty ? 'empty' : state;

    const currentCell = active
      ? {
          r: active.r,
          c: active.c,
          val: Math.max(0, cells[active.r]?.[active.c] ?? 0),
        }
      : metrics.peak;

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]');
      if (!target) return;
      const r = Number(target.getAttribute('data-r'));
      const c = Number(target.getAttribute('data-c'));
      if (Number.isInteger(r) && Number.isInteger(c)) {
        setActive((prev) => (prev?.r === r && prev?.c === c ? prev : { r, c }));
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!rows.length || !cols.length) return;
      const cur = active ?? { r: metrics.peak.r, c: metrics.peak.c };
      const forwardCol = isRtl ? -1 : 1;
      let next: { r: number; c: number } | null = null;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next = { r: cur.r, c: Math.max(0, Math.min(cols.length - 1, cur.c + forwardCol)) };
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        next = { r: cur.r, c: Math.max(0, Math.min(cols.length - 1, cur.c - forwardCol)) };
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        next = { r: Math.min(rows.length - 1, cur.r + 1), c: cur.c };
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        next = { r: Math.max(0, cur.r - 1), c: cur.c };
      } else if (e.key === 'Escape') {
        setActive(null);
        return;
      }

      if (next) setActive(next);
    };

    const activeRowLabel = rows[currentCell.r] || '';
    const activeColLabel = cols[currentCell.c] || '';
    const ariaSummary = `${title}: ${peakLabel || strings.peakLabel} ${activeRowLabel} ${activeColLabel} (${formatChartValue(
      currentCell.val,
      { locale, format, unit }
    )})`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="matrix"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        filter={filter}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-hm text-[var(--ax-acc)]">
              <RollingDigits
                value={formatChartValue(currentCell.val, { locale, format, unit })}
              />
            </span>
            <span className="ax-tk">
              {activeRowLabel} · {activeColLabel}
            </span>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-2 pt-1 ax-tk">
            <span>
              {peakLabel || strings.peakLabel}:{' '}
              <strong className="text-[var(--ax-on)]">
                {rows[metrics.peak.r]} {cols[metrics.peak.c]}
              </strong>
            </span>
            <div className="flex items-center gap-2">
              <span>{lowLabel || strings.calmLabel}</span>
              <span
                className="h-2.5 w-20 rounded-full border border-[var(--ax-bdr)]"
                style={{
                  background:
                    'linear-gradient(90deg, color-mix(in srgb, var(--ax-c1) 12%, var(--ax-slab)), var(--ax-c1))',
                }}
              />
              <span>{highLabel || strings.fullLabel}</span>
            </div>
          </div>
        }
      >
        {/* Delegated Grid — zero per-cell event listeners */}
        <div
          ref={gridRef}
          tabIndex={0}
          role="grid"
          aria-label={ariaSummary}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={handleKeyDown}
          className="ax-plot-focus flex flex-col gap-1 select-none"
        >
          {/* Column headers */}
          <div
            className="grid gap-1 items-center"
            style={{
              gridTemplateColumns: `40px repeat(${cols.length}, minmax(0, 1fr))`,
            }}
          >
            <span />
            {cols.map((col, c) => (
              <span
                key={col}
                className={`ax-tk text-center truncate ${
                  active?.c === c ? 'text-[var(--ax-on)] font-semibold' : ''
                }`}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row, r) => (
            <div
              key={row}
              className="grid gap-1 items-center"
              style={{
                gridTemplateColumns: `40px repeat(${cols.length}, minmax(0, 1fr))`,
              }}
            >
              <span
                className={`ax-tk truncate pr-1 ${
                  active?.r === r ? 'text-[var(--ax-on)] font-semibold' : ''
                }`}
              >
                {row}
              </span>
              {cols.map((_, c) => {
                const cellMeta = metrics.matrix[r]?.[c];
                const isSelected = active?.r === r && active?.c === c;
                const isCross = active ? active.r === r || active.c === c : true;
                const isPeak = !active && r === metrics.peak.r && c === metrics.peak.c;

                return (
                  <div
                    key={c}
                    data-cell="1"
                    data-r={r}
                    data-c={c}
                    role="gridcell"
                    aria-selected={isSelected}
                    className={`ax-pop-item h-[22px] rounded-[5px] cursor-pointer ${
                      isSelected ? 'relative z-10' : ''
                    }`}
                    style={{
                      background: cellMeta?.bg || 'var(--ax-soft)',
                      opacity: isCross ? 1 : 0.3,
                      transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                      outline:
                        isSelected || isPeak
                          ? '2px solid var(--ax-on)'
                          : '1px solid transparent',
                      outlineOffset: '-1px',
                      '--ax-delay': cellMeta?.delay || '0ms',
                      transition: 'transform 0.24s var(--ax-sp2), opacity 0.16s ease',
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }
);

HourlyHeatmap.displayName = 'HourlyHeatmap';
