import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { formatChartValue, getDefaultChartStrings } from '../math';
import { DonutChartProps, DonutSegment } from '../types';

const DONUT_PALETTE = [
  'var(--ax-c1)',
  'var(--ax-on)',
  'var(--ax-c3)',
  'var(--ax-c4)',
  'var(--ax-c5)',
  'var(--ax-c6)',
];

export const DonutChart: React.FC<DonutChartProps> = React.memo(
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
    segments,
    centerFormat = 'percent',
    totalLabel,
    format = 'number',
    currency = 'DZD',
    unit,
    maxSlices = 6,
    otherLabel,
  }) => {
    const strings = getDefaultChartStrings(locale);
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const processed = useMemo(() => {
      const cleaned = (segments || [])
        .filter((s) => Number.isFinite(s.value) && s.value > 0)
        .sort((a, b) => b.value - a.value);

      if (cleaned.length === 0) {
        return { slices: [] as Array<DonutSegment & { color: string; pct: number; offset: number }>, total: 0 };
      }

      let grouped: DonutSegment[] = cleaned;
      if (cleaned.length > maxSlices) {
        const head = cleaned.slice(0, maxSlices - 1);
        const tailSum = cleaned.slice(maxSlices - 1).reduce((s, x) => s + x.value, 0);
        grouped = [
          ...head,
          {
            id: '__other__',
            label: otherLabel || (locale === 'ar' ? 'أخرى' : locale === 'en' ? 'Other' : 'Autres'),
            value: tailSum,
            color: 'var(--ax-c4)',
          },
        ];
      }

      const total = grouped.reduce((s, x) => s + x.value, 0);
      let cursor = 0;
      const slices = grouped.map((seg, idx) => {
        const pct = total > 0 ? (seg.value / total) * 100 : 0;
        const offset = cursor;
        cursor += pct;
        return {
          ...seg,
          color: seg.color || DONUT_PALETTE[idx % DONUT_PALETTE.length],
          pct,
          offset,
        };
      });

      return { slices, total };
    }, [segments, maxSlices, otherLabel, locale]);

    const isEmpty = state === 'ready' && processed.slices.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const activeSlice =
      activeIdx !== null && processed.slices[activeIdx] ? processed.slices[activeIdx] : null;
    const leadSlice = activeSlice || processed.slices[0];

    const centerMain =
      centerFormat === 'percent' && leadSlice
        ? `${Math.round(leadSlice.pct)}%`
        : formatChartValue(activeSlice ? activeSlice.value : processed.total, {
            locale,
            format,
            currency,
            unit,
          });

    const centerCaption = activeSlice
      ? activeSlice.label
      : leadSlice
        ? leadSlice.label
        : totalLabel || strings.totalLabel;

    const ariaSummary = `${title}: ${processed.slices
      .map((s) => `${s.label} ${Math.round(s.pct)}%`)
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
        skeletonKind="donut"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
      >
        <div className="flex flex-col items-center gap-4">
          {/* 200px Centered Ring */}
          <div className="relative w-[196px] h-[196px] flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full -rotate-90 overflow-visible"
              role="img"
              aria-label={ariaSummary}
              onPointerLeave={() => setActiveIdx(null)}
            >
              {processed.slices.map((slice, idx) => {
                const isActive = activeIdx === idx;
                const isDim = activeIdx !== null && !isActive;
                const gap = processed.slices.length > 1 ? 0.9 : 0;
                const dashLen = Math.max(0.5, slice.pct - gap);
                return (
                  <circle
                    key={slice.id}
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    pathLength={100}
                    stroke={slice.color}
                    strokeWidth={isActive ? 15.5 : 11}
                    strokeDasharray={`${dashLen} ${100 - dashLen}`}
                    strokeDashoffset={-slice.offset}
                    strokeLinecap="butt"
                    opacity={isDim ? 0.52 : 1}
                    className="cursor-pointer outline-none"
                    style={{
                      transition:
                        'stroke-width 0.34s var(--ax-sp2), opacity 0.2s ease',
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${slice.label}: ${Math.round(slice.pct)}% (${formatChartValue(
                      slice.value,
                      { locale, format, currency, unit }
                    )})`}
                    onPointerEnter={() => setActiveIdx(idx)}
                    onFocus={() => setActiveIdx(idx)}
                    onBlur={() => setActiveIdx(null)}
                    onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
              <span className="ax-disp ax-big-donut text-[var(--ax-on)]">
                <RollingDigits value={centerMain} />
              </span>
              <span className="text-[11.5px] font-medium text-[var(--ax-sub)] truncate max-w-[116px] mt-0.5">
                {centerCaption}
              </span>
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="w-full flex flex-col gap-1.5">
            {processed.slices.map((slice, idx) => {
              const isActive = activeIdx === idx;
              const isDim = activeIdx !== null && !isActive;
              return (
                <button
                  key={slice.id}
                  type="button"
                  onPointerEnter={() => setActiveIdx(idx)}
                  onPointerLeave={() => setActiveIdx(null)}
                  onFocus={() => setActiveIdx(idx)}
                  onBlur={() => setActiveIdx(null)}
                  onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                  aria-pressed={isActive}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1 rounded-[9px] text-left rtl:text-right cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[var(--ax-soft)]'
                      : 'hover:bg-[var(--ax-soft)]'
                  }`}
                  style={{ opacity: isDim ? 0.55 : 1 }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: slice.color }}
                    />
                    <span className="text-[12px] font-medium text-[var(--ax-on)] truncate">
                      {slice.label}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 ax-nv">
                    <span className="text-[var(--ax-sub)]">
                      {formatChartValue(slice.value, {
                        locale,
                        format,
                        currency,
                        unit,
                      })}
                    </span>
                    <span className="w-9 text-right rtl:text-left font-semibold text-[var(--ax-on)]">
                      {Math.round(slice.pct)}%
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </ChartCard>
    );
  }
);

DonutChart.displayName = 'DonutChart';
