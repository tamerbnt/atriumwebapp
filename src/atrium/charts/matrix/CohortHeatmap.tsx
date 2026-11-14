import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { useIsRtl } from '../hooks';
import { CohortHeatmapProps } from '../types';

export const CohortHeatmap: React.FC<CohortHeatmapProps> = React.memo(
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
    cohorts,
    columnPrefix = 'M',
    unit = '%',
  }) => {
    const isRtl = useIsRtl(locale);
    const [active, setActive] = useState<{ r: number; c: number } | null>(null);

    const maxCols = useMemo(
      () =>
        (cohorts || []).reduce((m, row) => Math.max(m, row.values?.length || 0), 0),
      [cohorts]
    );

    const isEmpty = state === 'ready' && (!cohorts?.length || maxCols === 0);
    const effectiveState = isEmpty ? 'empty' : state;

    const latestAvg = useMemo(() => {
      if (!cohorts?.length) return 0;
      const vals = cohorts
        .flatMap((row) => row.values.slice(1))
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (vals.length === 0) return 0;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }, [cohorts]);

    const activeVal =
      active !== null ? cohorts[active.r]?.values?.[active.c] ?? null : null;

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-ch]');
      if (!cell) return;
      const r = Number(cell.getAttribute('data-r'));
      const c = Number(cell.getAttribute('data-c'));
      if (Number.isInteger(r) && Number.isInteger(c)) {
        setActive((prev) => (prev?.r === r && prev?.c === c ? prev : { r, c }));
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!cohorts.length || maxCols === 0) return;
      const cur = active ?? { r: 0, c: 0 };
      const forward = isRtl ? -1 : 1;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActive({ r: cur.r, c: Math.max(0, Math.min(maxCols - 1, cur.c + forward)) });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive({ r: cur.r, c: Math.max(0, Math.min(maxCols - 1, cur.c - forward)) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive({ r: Math.min(cohorts.length - 1, cur.r + 1), c: cur.c });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive({ r: Math.max(0, cur.r - 1), c: cur.c });
      } else if (e.key === 'Escape') {
        setActive(null);
      }
    };

    const ariaSummary = `${title}: rétention moyenne ${latestAvg}${unit}`;

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
                value={`${
                  typeof activeVal === 'number' ? Math.round(activeVal) : latestAvg
                }${unit}`}
              />
            </span>
            <span className="ax-tk">
              {active
                ? `${cohorts[active.r]?.label} · ${columnPrefix}${active.c}`
                : 'Moyenne M+'}
            </span>
          </div>
        }
      >
        <div
          tabIndex={0}
          role="grid"
          aria-label={ariaSummary}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={handleKeyDown}
          className="ax-plot-focus flex flex-col gap-1 select-none"
        >
          {/* Header Row */}
          <div
            className="grid gap-1 items-center"
            style={{
              gridTemplateColumns: `56px repeat(${maxCols}, minmax(0, 1fr))`,
            }}
          >
            <span />
            {Array.from({ length: maxCols }).map((_, c) => (
              <span
                key={c}
                className={`ax-tk text-center ${
                  active?.c === c ? 'text-[var(--ax-on)] font-semibold' : ''
                }`}
              >
                {columnPrefix}
                {c}
              </span>
            ))}
          </div>

          {/* Cohort Rows */}
          {cohorts.map((row, r) => (
            <div
              key={row.label}
              className="grid gap-1 items-center"
              style={{
                gridTemplateColumns: `56px repeat(${maxCols}, minmax(0, 1fr))`,
              }}
            >
              <span
                className={`ax-tk truncate pr-1 ${
                  active?.r === r ? 'text-[var(--ax-on)] font-semibold' : ''
                }`}
              >
                {row.label}
              </span>

              {Array.from({ length: maxCols }).map((_, c) => {
                const raw = row.values[c];
                if (typeof raw !== 'number' || !Number.isFinite(raw)) {
                  return <div key={c} className="h-[26px]" />;
                }
                const pct = Math.max(0, Math.min(100, raw));
                const isSelected = active?.r === r && active?.c === c;
                const isCross = active ? active.r === r || active.c === c : true;
                const mixPct = Math.round(14 + (pct / 100) * 86);
                const textColor =
                  pct >= 58 ? 'var(--ax-tc1)' : 'var(--ax-on)';

                return (
                  <div
                    key={c}
                    data-ch="1"
                    data-r={r}
                    data-c={c}
                    role="gridcell"
                    aria-selected={isSelected}
                    className="h-[26px] rounded-[6px] flex items-center justify-center ax-mono text-[10.5px] font-medium cursor-pointer transition-opacity duration-150"
                    style={{
                      background: `color-mix(in srgb, var(--ax-c1) ${mixPct}%, var(--ax-slab))`,
                      color: textColor,
                      opacity: isCross ? 1 : 0.32,
                      outline: isSelected ? '2px solid var(--ax-on)' : undefined,
                    }}
                  >
                    {Math.round(pct)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }
);

CohortHeatmap.displayName = 'CohortHeatmap';
