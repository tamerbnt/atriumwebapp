import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
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
      >
        <div
          className="relative w-full h-[212px] rounded-[14px] overflow-visible select-none"
          role="list"
          aria-label={ariaSummary}
          onPointerLeave={() => setActiveId(null)}
        >
          {rects.map((rect, idx) => {
            const palette = TREEMAP_PALETTE[idx % TREEMAP_PALETTE.length];
            const isActive = activeId === rect.id;
            const isDim = activeId !== null && !isActive;
            const showLabel = rect.w >= 11 && rect.h >= 13;
            const showDetails = rect.w >= 14 && rect.h >= 27;

            return (
              <button
                key={rect.id}
                type="button"
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
                className="ax-plot-focus absolute flex flex-col justify-between p-2.5 rounded-[11px] border-2 border-[var(--ax-slab)] text-left rtl:text-right overflow-hidden cursor-pointer"
                style={{
                  insetInlineStart: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.w}%`,
                  height: `${rect.h}%`,
                  background: rect.color || palette.bg,
                  color: palette.fg,
                  opacity: isDim ? 0.68 : 1,
                  transform: isActive ? 'scale(1.016)' : 'scale(1)',
                  zIndex: isActive ? 15 : 1,
                  transition:
                    'transform 0.28s var(--ax-sp2), opacity 0.18s ease',
                }}
              >
                {showLabel && (
                  <span className="text-[11.5px] font-semibold leading-tight line-clamp-2 break-words">
                    {rect.label}
                  </span>
                )}
                {showDetails && (
                  <span className="flex items-baseline justify-between gap-1.5 ax-mono text-[11px] mt-auto pt-1">
                    <span className="font-bold">{Math.round(rect.share)}%</span>
                    {rect.w >= 26 && (
                      <span className="opacity-85 truncate">
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

          {activeRect && (
            <div
              className="ax-tip bottom-2"
              style={{
                insetInlineStart: `${Math.min(
                  66,
                  Math.max(4, activeRect.x + activeRect.w / 2 - 12)
                )}%`,
              }}
            >
              <div className="font-semibold">{activeRect.label}</div>
              <div>
                {formatChartValue(activeRect.value, {
                  locale,
                  format,
                  currency,
                  unit,
                })}{' '}
                · {activeRect.share.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </ChartCard>
    );
  }
);

SquarifiedTreemap.displayName = 'SquarifiedTreemap';
