import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { computeSquarifiedTreemap, formatChartValue } from '../math';
import { SquarifiedTreemapProps } from '../types';

const TREEMAP_PALETTE = [
  { bg: 'var(--ax-c1)', fg: 'var(--ax-tc1)' },
  { bg: 'var(--ax-on)', fg: 'var(--ax-slab)' },
  { bg: 'var(--ax-c6)', fg: '#ffffff' },
  { bg: 'var(--ax-c3)', fg: '#0a0a0a' },
  { bg: 'var(--ax-c5)', fg: '#0a0a0a' },
  { bg: 'var(--ax-c4)', fg: '#0a0a0a' },
];

export const SquarifiedTreemap: React.FC<SquarifiedTreemapProps> = React.memo(
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
    ratio = 1.618,
    variant = 'squarified',
    format = 'number',
    currency = 'DZD',
    unit,
    showLegend = true,
  }) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const rects = useMemo(() => {
      if (variant === 'split') {
        const clean = (items || [])
          .filter((i) => Number.isFinite(i.value) && i.value > 0)
          .sort((a, b) => b.value - a.value);
        const total = clean.reduce((s, i) => s + i.value, 0);
        if (clean.length === 0 || total <= 0) return [];
        if (clean.length === 1) {
          return [
            {
              id: clean[0].id || 'tm-0',
              label: clean[0].label,
              value: clean[0].value,
              share: 100,
              color: clean[0].color,
              index: 0,
              x: 0,
              y: 0,
              w: 100,
              h: 100,
            },
          ];
        }
        // Main.dc.html classic dominant split + right column stack when requested
        const lead = clean[0];
        const leadW = Math.max(42, Math.min(72, (lead.value / total) * 100));
        const rest = clean.slice(1);
        const restTotal = rest.reduce((s, r) => s + r.value, 0) || 1;
        let cy = 0;
        return [
          {
            id: lead.id || 'tm-0',
            label: lead.label,
            value: lead.value,
            share: (lead.value / total) * 100,
            color: lead.color,
            index: 0,
            x: 0,
            y: 0,
            w: leadW,
            h: 100,
          },
          ...rest.map((item, idx) => {
            const h = (item.value / restTotal) * 100;
            const rect = {
              id: item.id || `tm-${idx + 1}`,
              label: item.label,
              value: item.value,
              share: (item.value / total) * 100,
              color: item.color,
              index: idx + 1,
              x: leadW,
              y: cy,
              w: 100 - leadW,
              h,
            };
            cy += h;
            return rect;
          }),
        ];
      }
      return computeSquarifiedTreemap(items || [], 100, 100, ratio);
    }, [items, ratio, variant]);

    const isEmpty = state === 'ready' && rects.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const activeRect = rects.find((r) => r.id === activeId) || null;
    const ariaSummary = `${title}: ${rects
      .slice(0, 5)
      .map((r) => `${r.label} ${Math.round(r.share)}%`)
      .join(', ')}`;

    const leadRect = activeRect || rects[0] || null;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="treemap"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          leadRect ? (
            <div className="flex flex-col items-end text-right rtl:text-left">
              <span className="ax-disp ax-big-mid text-[var(--ax-on)]">
                <RollingDigits value={`${Math.round(leadRect.share)}%`} />
              </span>
              <span className="ax-tk truncate max-w-[175px]">
                {leadRect.label} ·{' '}
                {formatChartValue(leadRect.value, {
                  locale,
                  format,
                  currency,
                  unit,
                })}
              </span>
            </div>
          ) : undefined
        }
        footer={
          showLegend && rects.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
              {rects.map((rect, idx) => {
                const palette = TREEMAP_PALETTE[idx % TREEMAP_PALETTE.length];
                const isActive = activeId === rect.id;
                const isDim = activeId !== null && !isActive;
                return (
                  <button
                    key={rect.id}
                    type="button"
                    data-no-liquid="true"
                    onPointerEnter={() => setActiveId(rect.id)}
                    onPointerLeave={() => setActiveId(null)}
                    onFocus={() => setActiveId(rect.id)}
                    onBlur={() => setActiveId(null)}
                    onClick={() =>
                      setActiveId((prev) => (prev === rect.id ? null : rect.id))
                    }
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-opacity ${
                      isDim ? 'opacity-40' : 'opacity-95'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                      style={{ background: rect.color || palette.bg }}
                    />
                    <span className="text-[var(--ax-sub)] max-w-[130px] truncate">
                      {rect.label}
                    </span>
                    <span className="ax-mono text-[10.5px] text-[var(--ax-mut)]" dir="ltr">
                      {Math.round(rect.share)}%
                    </span>
                  </button>
                );
              })}
            </div>
          ) : undefined
        }
      >
        <div
          className="ax-tmw relative w-full h-[218px] rounded-[14px] overflow-hidden select-none"
          role="list"
          aria-label={ariaSummary}
          onPointerLeave={() => setActiveId(null)}
        >
          {rects.map((rect, idx) => {
            const palette = TREEMAP_PALETTE[idx % TREEMAP_PALETTE.length];
            const isActive = activeId === rect.id;
            const isDim = activeId !== null && !isActive;
            const showLabel = rect.w >= 11 && rect.h >= 13;
            const showShare = rect.w >= 12 && rect.h >= 22;
            const showValue = rect.w >= 34 && rect.h >= 27;
            const isLarge = rect.w >= 40 && rect.h >= 40;

            const isNarrow = rect.w < 24;

            return (
              <button
                key={rect.id}
                type="button"
                data-no-liquid="true"
                data-active={isActive ? 'true' : 'false'}
                role="listitem"
                onPointerEnter={() => setActiveId(rect.id)}
                onFocus={() => setActiveId(rect.id)}
                onBlur={() => setActiveId(null)}
                onClick={() =>
                  setActiveId((prev) => (prev === rect.id ? null : rect.id))
                }
                aria-label={`${rect.label}: ${Math.round(rect.share)}% (${formatChartValue(
                  rect.value,
                  { locale, format, currency, unit }
                )})`}
                className={`ax-tm-tile ax-plot-focus ax-pop-item absolute flex flex-col justify-between ${
                  rect.w < 18 || rect.h < 28 ? 'p-1.5' : 'p-2.5'
                } rounded-[12px] border-2 border-[var(--ax-slab)] text-left rtl:text-right overflow-hidden cursor-pointer`}
                style={{
                  insetInlineStart: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.w}%`,
                  height: `${rect.h}%`,
                  background: rect.color || palette.bg,
                  color: palette.fg,
                  opacity: isDim ? 0.68 : 1,
                  zIndex: isActive ? 15 : 1,
                  '--ax-delay': `${Math.min(idx * 25, 160)}ms`,
                  transition:
                    'transform 0.24s var(--ax-sp2), opacity 0.18s ease, filter 0.18s ease',
                } as React.CSSProperties}
              >
                {showLabel && (
                  <span
                    className={`font-semibold leading-tight w-full ${
                      isNarrow || rect.h < 28
                        ? 'text-[10.5px] truncate'
                        : 'text-[11.5px] line-clamp-2'
                    }`}
                  >
                    {rect.label}
                  </span>
                )}
                {showShare && (
                  <span className="flex items-baseline justify-between gap-1.5 mt-auto pt-1 w-full">
                    <span
                      className={`ax-disp leading-none ${
                        isLarge ? 'text-[22px]' : 'text-[15px]'
                      }`}
                      dir="ltr"
                    >
                      {Math.round(rect.share)}%
                    </span>
                    {showValue && (
                      <span className="ax-mono text-[10.5px] opacity-85 truncate" dir="ltr">
                        {formatChartValue(rect.value, {
                          locale,
                          format,
                          currency,
                          unit,
                        })}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ChartCard>
    );
  }
);

SquarifiedTreemap.displayName = 'SquarifiedTreemap';
