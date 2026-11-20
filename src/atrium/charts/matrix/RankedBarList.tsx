import React, { useCallback, useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { ChartSegmented } from '../primitives/ChartSegmented';
import { useIsRtl } from '../hooks';
import { formatChartValue } from '../math';
import { RankedBarListProps } from '../types';

const ROW_HEIGHT = 48;

export const RankedBarList: React.FC<RankedBarListProps> = React.memo(
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
    criteria,
    items,
    activeCriterionId,
    onCriterionChange,
    maxVisible = 8,
  }) => {
    const isRtl = useIsRtl(locale);
    const [internalCritId, setInternalCritId] = useState<string>(
      () => activeCriterionId || criteria?.[0]?.id || ''
    );
    const resolvedCritId = activeCriterionId ?? internalCritId;
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const activeCriterion = useMemo(() => {
      if (!criteria || criteria.length === 0) return null;
      return criteria.find((c) => c.id === resolvedCritId) || criteria[0];
    }, [criteria, resolvedCritId]);

    const criteriaOptions = useMemo(
      () => (criteria.length > 1 ? criteria.map((c) => ({ id: c.id, label: c.label })) : undefined),
      [criteria]
    );

    const handleCritChange = useCallback(
      (id: string) => {
        setInternalCritId(id);
        onCriterionChange?.(id);
      },
      [onCriterionChange]
    );

    const ranked = useMemo(() => {
      if (!activeCriterion || !items?.length) {
        return { ordered: [], rankById: new Map<string, number>(), maxVal: 1, visibleCount: 0 };
      }
      const scored = items.map((item) => ({
        ...item,
        val: Math.max(0, item.values[activeCriterion.id] ?? 0),
      }));
      scored.sort((a, b) => b.val - a.val);
      const capped = scored.slice(0, maxVisible);
      const rankById = new Map<string, number>();
      capped.forEach((it, idx) => rankById.set(it.id, idx));
      const maxVal = capped.length > 0 ? Math.max(...capped.map((i) => i.val), 1) : 1;

      const stableItems = items.filter((it) => rankById.has(it.id));
      return { ordered: stableItems, rankById, maxVal, visibleCount: capped.length };
    }, [items, activeCriterion, maxVisible]);

    const isEmpty = state === 'ready' && ranked.visibleCount === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const ariaSummary = `${title}${activeCriterion ? ` (${activeCriterion.label})` : ''}`;

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
        filter={criteria.length <= 1 ? filter : undefined}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          criteriaOptions ? (
            <ChartSegmented
              options={criteriaOptions}
              value={activeCriterion?.id || ''}
              onChange={handleCritChange}
              isRtl={isRtl}
              ariaLabel={title}
            />
          ) : undefined
        }
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ height: ranked.visibleCount * ROW_HEIGHT }}
          role="list"
          aria-label={ariaSummary}
          onPointerLeave={() => setHoveredId(null)}
        >
          {ranked.ordered.map((item) => {
            const rank = ranked.rankById.get(item.id) ?? 0;
            const val = Math.max(0, item.values[activeCriterion?.id || ''] ?? 0);
            const ratio = Math.max(0.02, Math.min(1, val / ranked.maxVal));
            const isHovered = hoveredId === item.id;
            const isDim = hoveredId !== null && !isHovered;
            const isAccent = hoveredId !== null ? isHovered : rank === 0;

            return (
              <div
                key={item.id}
                role="listitem"
                tabIndex={0}
                onPointerEnter={() => setHoveredId(item.id)}
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId(null)}
                className={`ax-plot-focus absolute inset-x-0 top-0 flex flex-col justify-center gap-[var(--s2,8px)] px-[var(--s2,8px)] rounded-[var(--r-ctl-sm,10px)] cursor-pointer ${
                  isHovered ? 'bg-[var(--ax-soft)]' : ''
                }`}
                style={{
                  height: ROW_HEIGHT - 2,
                  transform: `translate3d(0, ${rank * ROW_HEIGHT}px, 0)`,
                  opacity: isDim ? 0.34 : 1,
                  transition:
                    'transform 0.6s var(--ax-sp), opacity 0.18s ease, background-color 0.16s ease',
                }}
              >
                <div className="flex items-center justify-between gap-[var(--s2,8px)] t-small">
                  <span className="flex items-center gap-[var(--s2,8px)] min-w-0">
                    <span className="ax-tk w-4 text-[var(--ax-mut)] font-semibold shrink-0">
                      #{rank + 1}
                    </span>
                    <span className="t-small text-[var(--ax-on)] truncate">
                      {item.label}
                    </span>
                  </span>
                  <span className="ax-nv shrink-0">
                    {formatChartValue(val, {
                      locale,
                      format: activeCriterion?.format || 'number',
                      currency: activeCriterion?.currency || 'DZD',
                      unit: activeCriterion?.unit,
                    })}
                  </span>
                </div>

                {/* 14px Track + Compositor scaleX Fill (coral lead/hover vs ink others) */}
                <div className="h-[14px] w-full rounded-full bg-[var(--ax-soft)] overflow-hidden">
                  <div
                    className="ax-bar-x h-full w-full rounded-full"
                    style={{
                      transform: `scaleX(${ratio})`,
                      background: isAccent ? 'var(--ax-c1)' : 'var(--ax-on)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    );
  }
);

RankedBarList.displayName = 'RankedBarList';
