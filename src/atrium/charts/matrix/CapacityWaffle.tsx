import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { getDefaultChartStrings } from '../math';
import { CapacityWaffleProps } from '../types';

export const CapacityWaffle: React.FC<CapacityWaffleProps> = React.memo(
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
    occupied,
    capacity = 100,
    occupiedLabel,
    availableLabel,
    unitLabel = '%',
  }) => {
    const strings = getDefaultChartStrings(locale);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const metrics = useMemo(() => {
      const safeCap = Math.max(0, Number.isFinite(capacity) ? capacity : 0);
      const safeOcc = Math.max(0, Number.isFinite(occupied) ? occupied : 0);
      const ratio = safeCap > 0 ? Math.min(1, safeOcc / safeCap) : 0;
      const filledDots = Math.round(ratio * 100);
      const pct = Math.round(ratio * 100);
      return { safeCap, safeOcc, filledDots, pct };
    }, [occupied, capacity]);

    const isEmpty = state === 'ready' && metrics.safeCap <= 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const previewPct = hoverIndex !== null ? hoverIndex + 1 : metrics.pct;

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      const dot = (e.target as HTMLElement).closest<HTMLElement>('[data-dot]');
      if (!dot) return;
      const idx = Number(dot.getAttribute('data-dot'));
      if (Number.isInteger(idx)) setHoverIndex(idx);
    };

    const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setHoverIndex((prev) =>
          prev === null ? Math.max(0, metrics.filledDots - 1) : Math.min(99, prev + 1)
        );
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHoverIndex((prev) =>
          prev === null ? Math.max(0, metrics.filledDots - 1) : Math.max(0, prev - 1)
        );
      } else if (e.key === 'Escape') {
        setHoverIndex(null);
      }
    };

    const ariaSummary = `${title}: ${metrics.pct}% (${metrics.safeOcc} / ${metrics.safeCap})`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="waffle"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-donut text-[var(--ax-on)]">
              <RollingDigits value={`${previewPct}${unitLabel}`} />
            </span>
            <span className="ax-tk">
              {metrics.safeOcc} / {metrics.safeCap}
            </span>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-2 ax-tk pt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--ax-c1)]" />
              <span>
                {occupiedLabel || strings.occupiedLabel} ({metrics.filledDots}%)
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--ax-waffle-off)] border border-[var(--ax-bdr)]" />
              <span>
                {availableLabel || strings.availableLabel} ({100 - metrics.filledDots}%)
              </span>
            </span>
          </div>
        }
      >
        <div className="flex justify-center py-1">
          <svg
            viewBox="0 0 216 216"
            className="w-full max-w-[224px] h-auto ax-plot-focus cursor-pointer select-none"
            tabIndex={0}
            role="img"
            aria-label={ariaSummary}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
            onKeyDown={handleKeyDown}
          >
            {Array.from({ length: 100 }).map((_, idx) => {
              const row = Math.floor(idx / 10);
              const col = idx % 10;
              const cx = 13 + col * 21;
              const cy = 13 + row * 21;
              const isFilled = idx < metrics.filledDots;
              const isPreview =
                hoverIndex !== null &&
                ((idx <= hoverIndex && !isFilled) || (idx > hoverIndex && isFilled));
              const isCursor = hoverIndex === idx;

              return (
                <circle
                  key={idx}
                  data-dot={idx}
                  cx={cx}
                  cy={cy}
                  r={isCursor ? 8.8 : 7.5}
                  fill={
                    isFilled
                      ? isPreview
                        ? 'var(--ax-c3)'
                        : 'var(--ax-c1)'
                      : isPreview
                        ? 'color-mix(in srgb, var(--ax-c1) 45%, var(--ax-waffle-off))'
                        : 'var(--ax-waffle-off)'
                  }
                  style={{
                    transition: 'fill 0.16s ease, r 0.24s var(--ax-sp2)',
                  }}
                />
              );
            })}
          </svg>
        </div>
      </ChartCard>
    );
  }
);

CapacityWaffle.displayName = 'CapacityWaffle';
