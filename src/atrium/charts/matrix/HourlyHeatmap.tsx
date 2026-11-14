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
        return { max: 0, peak: { r: 0, c: 0, val: 0 }, total: 0 };
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
      return { max, peak: { r: peakR, c: peakC, val: max }, total };
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
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-hm text-[var(--ax-on)]">
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
            <div className="flex items-center gap-1.5">
              <span>{lowLabel || strings.lowLabel}</span>
              {[0.12, 0.32, 0.56, 0.78, 1].map((op, i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-[3px] border border-[var(--ax-bdr)]"
                  style={{
                    background: `color-mix(in srgb, var(--ax-c1) ${Math.round(op * 100)}%, var(--ax-soft))`,
                  }}
                />
              ))}
              <span>{highLabel || strings.highLabel}</span>
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
                const raw = Math.max(0, cells[r]?.[c] ?? 0);
                const intensity = metrics.max > 0 ? raw / metrics.max : 0;
                const isSelected = active?.r === r && active?.c === c;
                const isCross = active ? active.r === r || active.c === c : true;
                const isPeak = !active && r === metrics.peak.r && c === metrics.peak.c;
                const bg =
                  raw <= 0
                    ? 'var(--ax-soft)'
                    : `color-mix(in srgb, var(--ax-c1) ${Math.round(
                        (0.14 + intensity * 0.86) * 100
                      )}%, var(--ax-slab))`;

                return (
                  <div
                    key={c}
                    data-cell="1"
                    data-r={r}
                    data-c={c}
                    role="gridcell"
                    aria-selected={isSelected}
                    className="h-[22px] rounded-[5px] cursor-pointer transition-opacity duration-150"
                    style={{
                      background: bg,
                      opacity: isCross ? 1 : 0.3,
                      outline:
                        isSelected || isPeak
                          ? '2px solid var(--ax-on)'
                          : '1px solid transparent',
                      outlineOffset: '-1px',
                    }}
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
