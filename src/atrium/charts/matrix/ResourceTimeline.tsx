import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { useIsRtl } from '../hooks';
import { getDefaultChartStrings } from '../math';
import { ResourceTimelineProps, TimelineTone } from '../types';

const TONE_STYLE: Record<TimelineTone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--ax-c1)', fg: 'var(--ax-tc1)' },
  secondary: { bg: 'var(--ax-c3)', fg: '#0a0a0a' },
  neutral: { bg: 'var(--ax-on)', fg: 'var(--ax-slab)' },
};

export const ResourceTimeline: React.FC<ResourceTimelineProps> = React.memo(
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
    resources,
    blocks,
    startHour,
    endHour,
    nowHour,
    nowLabel,
    toneLabels,
    maxVisibleResources = 7,
  }) => {
    const isRtl = useIsRtl(locale);
    const strings = getDefaultChartStrings(locale);
    const resolvedNowLabel = nowLabel || strings.nowLabel;
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

    const spanHours = Math.max(1, endHour - startHour);
    const visibleResources = useMemo(
      () => (resources || []).slice(0, maxVisibleResources),
      [resources, maxVisibleResources]
    );

    const clippedBlocks = useMemo(() => {
      const ids = new Set(visibleResources.map((r) => r.id));
      return (blocks || [])
        .filter((b) => ids.has(b.resourceId) && b.endHour > startHour && b.startHour < endHour)
        .map((b) => {
          const s = Math.max(startHour, Math.min(endHour, b.startHour));
          const e = Math.max(s + 0.15, Math.min(endHour, b.endHour));
          return {
            ...b,
            leftPct: ((s - startHour) / spanHours) * 100,
            widthPct: ((e - s) / spanHours) * 100,
          };
        });
    }, [blocks, visibleResources, startHour, endHour, spanHours]);

    const hourTicks = useMemo(() => {
      const step = spanHours > 12 ? 2 : spanHours > 6 ? 2 : 1;
      const arr: number[] = [];
      for (let h = Math.ceil(startHour); h <= Math.floor(endHour); h += step) {
        arr.push(h);
      }
      return arr;
    }, [startHour, endHour, spanHours]);

    const isEmpty = state === 'ready' && visibleResources.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const activeBlock =
      clippedBlocks.find((b) => b.id === activeBlockId) || null;

    const showNow =
      typeof nowHour === 'number' &&
      Number.isFinite(nowHour) &&
      nowHour >= startHour &&
      nowHour <= endHour;
    const nowPct = showNow ? ((nowHour! - startHour) / spanHours) * 100 : 0;

    const formatHour = (h: number) => {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return `${String(hh).padStart(2, '0')}h${mm > 0 ? String(mm).padStart(2, '0') : ''}`;
    };

    const activeTones = useMemo(() => {
      const present = new Set<TimelineTone>();
      clippedBlocks.forEach((b) => present.add(b.tone || 'primary'));
      return (['primary', 'secondary', 'neutral'] as TimelineTone[]).filter((t) =>
        present.has(t)
      );
    }, [clippedBlocks]);

    const defaultToneLabel = (tone: TimelineTone) => {
      if (tone === 'secondary') return toneLabels?.secondary || strings.secondaryToneLabel;
      if (tone === 'neutral') return toneLabels?.neutral || strings.neutralToneLabel;
      return toneLabels?.primary || strings.primaryToneLabel;
    };

    const bookedHours = useMemo(
      () =>
        clippedBlocks.reduce(
          (sum, b) => sum + Math.max(0, b.endHour - b.startHour),
          0
        ),
      [clippedBlocks]
    );
    const totalSlotHours = Math.max(1, visibleResources.length * spanHours);
    const occupancyPct = Math.min(100, Math.round((bookedHours / totalSlotHours) * 100));

    const ariaSummary = `${title}: ${occupancyPct}% (${clippedBlocks.length} ${strings.slotsWord} / ${visibleResources.length} ${strings.resourcesWord})`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="timeline"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        filter={filter}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-mid text-[var(--ax-acc)]">
              <RollingDigits value={`${occupancyPct}%`} />
            </span>
            <span className="ax-tk truncate max-w-[165px]">
              {activeBlock
                ? `${activeBlock.label} · ${formatHour(activeBlock.startHour)}–${formatHour(
                    activeBlock.endHour
                  )}`
                : `${clippedBlocks.length} ${strings.slotsWord} · ${formatHour(startHour)}–${formatHour(endHour)}`}
            </span>
          </div>
        }
        footer={
          (activeTones.length > 0 || showNow) ? (
            <div className="flex flex-wrap items-center justify-between gap-2 ax-tk pt-1">
              <div className="flex flex-wrap items-center gap-3">
                {activeTones.map((tone) => (
                  <span key={tone} className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                      style={{ background: TONE_STYLE[tone].bg }}
                    />
                    <span>{defaultToneLabel(tone)}</span>
                  </span>
                ))}
              </div>
              {showNow && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-[2px] h-3 rounded-full bg-[var(--ax-acc)]" />
                  <span>
                    {resolvedNowLabel}:{' '}
                    <strong className="text-[var(--ax-on)]" dir="ltr">
                      {formatHour(nowHour!)}
                    </strong>
                  </span>
                </span>
              )}
            </div>
          ) : undefined
        }
      >
        <div
          className="relative flex flex-col gap-2.5 select-none"
          role="region"
          aria-label={ariaSummary}
          onPointerLeave={() => setActiveBlockId(null)}
        >
          {/* Hour Ticks Header */}
          <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-2.5 items-center">
            <span />
            <div className="relative h-4 ax-tk">
              {hourTicks.map((h) => {
                const pct = ((h - startHour) / spanHours) * 100;
                return (
                  <span
                    key={h}
                    className="absolute -translate-x-1/2 rtl:translate-x-1/2"
                    style={{ insetInlineStart: `${pct}%` }}
                  >
                    {h}h
                  </span>
                );
              })}
              {showNow && (
                <span
                  className="absolute -top-0.5 -translate-x-1/2 rtl:translate-x-1/2 px-1.5 py-[1px] rounded bg-[var(--ax-acc)] text-[var(--ax-tc1)] text-[9px] font-semibold whitespace-nowrap z-20"
                  style={{ insetInlineStart: `${nowPct}%` }}
                >
                  {formatHour(nowHour!)}
                </span>
              )}
            </div>
          </div>

          {/* Resource Lanes */}
          <div className="relative flex flex-col gap-2">
            {visibleResources.map((res) => {
              const rowBlocks = clippedBlocks.filter((b) => b.resourceId === res.id);
              return (
                <div
                  key={res.id}
                  className="grid grid-cols-[108px_minmax(0,1fr)] gap-2.5 items-center"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-[var(--ax-on)] truncate">
                      {res.label}
                    </div>
                    {res.meta && (
                      <div className="text-[10.5px] text-[var(--ax-mut)] truncate">
                        {res.meta}
                      </div>
                    )}
                  </div>

                  <div className="relative h-10 rounded-[10px] bg-[var(--ax-soft)] overflow-hidden">
                    {/* Vertical Hour Gridlines */}
                    {hourTicks.map((h) => {
                      const pct = ((h - startHour) / spanHours) * 100;
                      return (
                        <span
                          key={h}
                          className="absolute inset-y-0 border-s border-[var(--ax-bdr)] opacity-60 pointer-events-none"
                          style={{ insetInlineStart: `${pct}%` }}
                        />
                      );
                    })}

                    {/* Optional Current-Time Hairline */}
                    {showNow && (
                      <span
                        title={resolvedNowLabel}
                        className="absolute inset-y-0 w-[2px] bg-[var(--ax-acc)] z-20 pointer-events-none"
                        style={{ insetInlineStart: `${nowPct}%` }}
                      />
                    )}

                    {/* Blocks (34px pill height inside 40px lane) */}
                    {rowBlocks.map((b, bIdx) => {
                      const tone = TONE_STYLE[b.tone || 'primary'];
                      const isActive = activeBlockId === b.id;
                      const isDim = activeBlockId !== null && !isActive;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          data-no-liquid="true"
                          onPointerEnter={() => setActiveBlockId(b.id)}
                          onFocus={() => setActiveBlockId(b.id)}
                          onBlur={() => setActiveBlockId(null)}
                          onClick={() =>
                            setActiveBlockId((prev) => (prev === b.id ? null : b.id))
                          }
                          aria-label={`${res.label} — ${b.label}, ${formatHour(
                            b.startHour
                          )} à ${formatHour(b.endHour)}`}
                          className="ax-abs ax-bar-x ax-plot-focus top-[3px] bottom-[3px] rounded-[8px] px-2.5 flex items-center text-[11px] font-semibold truncate cursor-pointer"
                          style={{
                            insetInlineStart: `${b.leftPct}%`,
                            width: `${b.widthPct}%`,
                            background: tone.bg,
                            color: tone.fg,
                            opacity: isDim ? 0.34 : 1,
                            zIndex: isActive ? 15 : 10,
                            transform: isActive
                              ? 'translate3d(0, -1px, 0) scale(1.02)'
                              : 'translate3d(0, 0, 0) scale(1)',
                            boxShadow: isActive ? '0 0 0 2px var(--ax-on)' : undefined,
                            transitionDelay: isActive ? '0ms' : `${Math.min(bIdx * 45, 220)}ms`,
                          }}
                        >
                          <span className="truncate leading-none">{b.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ChartCard>
    );
  }
);

ResourceTimeline.displayName = 'ResourceTimeline';
