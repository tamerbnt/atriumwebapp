import React, { useMemo, useState } from 'react';
import { ChartCard } from '../primitives/ChartCard';
import { RollingDigits } from '../primitives/RollingDigits';
import { formatChartValue, formatCompactTick, niceScale } from '../math';
import { WaterfallChartProps } from '../types';

export const WaterfallChart: React.FC<WaterfallChartProps> = React.memo(
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
    steps,
    format = 'currency',
    currency = 'DZD',
    unit,
    shareBasisIndex = 0,
  }) => {
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    const processed = useMemo(() => {
      if (!steps || steps.length === 0) {
        return {
          bars: [],
          scale: niceScale(0, 100),
          closingTotal: 0,
          basisVal: 0,
        };
      }

      let running = 0;
      const bars = steps.map((step, idx) => {
        const val = Number.isFinite(step.value) ? step.value : 0;
        let start = 0;
        let end = val;
        if (step.kind === 'total') {
          start = 0;
          end = idx === 0 ? val : running !== 0 ? running : val;
          running = end;
        } else {
          start = running;
          end = running + val;
          running = end;
        }
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        const polarity: 'total' | 'pos' | 'neg' =
          step.kind === 'total' ? 'total' : val >= 0 ? 'pos' : 'neg';
        return {
          ...step,
          val: step.kind === 'total' ? end : val,
          start,
          end,
          lo,
          hi,
          polarity,
        };
      });

      const allVals = bars.flatMap((b) => [b.lo, b.hi, 0]);
      const minV = Math.min(...allVals);
      const maxV = Math.max(...allVals);
      const scale = niceScale(minV, maxV, 4);
      const closingTotal = bars[bars.length - 1]?.end ?? 0;
      const basisVal = Math.abs(bars[shareBasisIndex]?.end || 0);

      return { bars, scale, closingTotal, basisVal };
    }, [steps, shareBasisIndex]);

    const isEmpty = state === 'ready' && processed.bars.length === 0;
    const effectiveState = isEmpty ? 'empty' : state;

    const activeBar =
      activeIdx !== null && processed.bars[activeIdx] ? processed.bars[activeIdx] : null;
    const displayVal = activeBar ? activeBar.val : processed.closingTotal;
    const sharePct =
      activeBar && processed.basisVal > 0
        ? (Math.abs(activeBar.val) / processed.basisVal) * 100
        : processed.basisVal > 0
          ? (processed.closingTotal / processed.basisVal) * 100
          : null;

    const span = Math.max(1e-9, processed.scale.max - processed.scale.min);
    const yPct = (v: number) => ((v - processed.scale.min) / span) * 100;
    const zeroPct = yPct(0);

    const ariaSummary = `${title}: ${formatChartValue(processed.closingTotal, {
      locale,
      format,
      currency,
      unit,
    })}`;

    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        helpText={helpText}
        locale={locale}
        surface={surface}
        inlineDark={inlineDark}
        state={effectiveState}
        skeletonKind="bars"
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        onRetry={onRetry}
        ariaSummary={ariaSummary}
        className={className}
        data-testid={testId}
        headerRight={
          <div className="flex flex-col items-end text-right rtl:text-left">
            <span className="ax-disp ax-big-mid text-[var(--ax-on)]">
              <RollingDigits
                value={formatChartValue(displayVal, {
                  locale,
                  format,
                  currency,
                  unit,
                  signed: activeBar?.kind === 'delta',
                })}
              />
            </span>
            <span className="ax-tk">
              {activeBar ? `${activeBar.label}` : processed.bars[processed.bars.length - 1]?.label}
              {sharePct !== null && Number.isFinite(sharePct)
                ? ` · ${Math.round(sharePct)}%`
                : ''}
            </span>
          </div>
        }
      >
        <div
          className="relative flex gap-2.5 pt-2"
          onPointerLeave={() => setActiveIdx(null)}
        >
          {/* Y-axis */}
          <div
            className="flex flex-col justify-between items-end shrink-0 pb-6 ax-tk select-none"
            style={{ height: 184 }}
            aria-hidden="true"
          >
            {[...processed.scale.ticks].reverse().map((tick, idx) => (
              <span key={idx} className="leading-none">
                {formatCompactTick(tick, locale)}
              </span>
            ))}
          </div>

          {/* Plot Area */}
          <div className="relative flex-1 min-w-0">
            <div className="relative h-[160px] w-full">
              {processed.scale.ticks.map((tick, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-x-0 pointer-events-none ${
                    tick === 0
                      ? 'border-t border-[var(--ax-bdr)]'
                      : 'border-t border-dashed border-[var(--ax-bdr)] opacity-65'
                  }`}
                  style={{ bottom: `${yPct(tick)}%` }}
                />
              ))}

              {/* Bars */}
              <div
                className="relative z-10 h-full grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${processed.bars.length}, minmax(0, 1fr))`,
                }}
              >
                {processed.bars.map((bar, idx) => {
                  const bottomPct = yPct(bar.lo);
                  const heightPct = Math.max(2.5, yPct(bar.hi) - bottomPct);
                  const isActive = activeIdx === idx;
                  const isDim = activeIdx !== null && !isActive;

                  const fill =
                    bar.polarity === 'total'
                      ? 'var(--ax-on)'
                      : bar.polarity === 'pos'
                        ? 'var(--ax-ok)'
                        : 'var(--ax-c1)';

                  const nextBar = processed.bars[idx + 1];
                  const connectorBottomPct = yPct(bar.end);

                  return (
                    <div
                      key={bar.id}
                      className="relative h-full flex items-end"
                      style={{ opacity: isDim ? 0.36 : 1, transition: 'opacity 0.16s ease' }}
                    >
                      {/* Dashed Connector to next bar */}
                      {nextBar && (
                        <div
                          className="absolute left-1/2 -right-2 border-t border-dashed border-[var(--ax-mut)] pointer-events-none"
                          style={{ bottom: `${connectorBottomPct}%` }}
                        />
                      )}

                      <button
                        type="button"
                        onPointerEnter={() => setActiveIdx(idx)}
                        onFocus={() => setActiveIdx(idx)}
                        onBlur={() => setActiveIdx(null)}
                        onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                        aria-label={`${bar.label}: ${formatChartValue(bar.val, {
                          locale,
                          format,
                          currency,
                          unit,
                          signed: bar.kind === 'delta',
                        })}`}
                        className="ax-plot-focus ax-bar-y absolute inset-x-0 rounded-[7px] cursor-pointer"
                        style={{
                          bottom: `${Math.max(0, bottomPct)}%`,
                          height: `${heightPct}%`,
                          background: fill,
                          boxShadow: isActive ? '0 0 0 2px var(--ax-acc)' : undefined,
                          transformOrigin:
                            bar.hi <= 0 ? 'top center' : bottomPct >= zeroPct ? 'bottom center' : 'center',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis Labels */}
            <div
              className="grid gap-2 pt-1.5 text-center ax-tk"
              style={{
                gridTemplateColumns: `repeat(${processed.bars.length}, minmax(0, 1fr))`,
              }}
            >
              {processed.bars.map((bar, idx) => (
                <span
                  key={bar.id}
                  className={`truncate ${
                    activeIdx === idx ? 'text-[var(--ax-on)] font-semibold' : ''
                  }`}
                >
                  {bar.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>
    );
  }
);

WaterfallChart.displayName = 'WaterfallChart';
