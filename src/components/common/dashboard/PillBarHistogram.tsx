import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../../utils/useTranslation';

export interface HistogramBar {
  label?: string; // e.g. "week 1", "lun", "salle A"
  week?: string;
  value: number;
  highlight?: boolean;
}

export interface PillBarHistogramProps {
  bars?: HistogramBar[];
  data?: HistogramBar[];
  height?: number;
  maxScale?: number;
  activeColor?: string;
  barColor?: string;
  mutedColor?: string;
  showYAxis?: boolean;
  unit?: string;
  title?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
  showFilter?: boolean;
  className?: string;
}

export const PillBarHistogram: React.FC<PillBarHistogramProps> = ({
  bars: propBars,
  data: propData,
  height = 160,
  maxScale,
  activeColor = '#d4522f',
  barColor,
  mutedColor = '#E8DFD8',
  showYAxis = true,
  unit = '',
  title,
  period: controlledPeriod,
  onPeriodChange,
  showFilter = false,
  className = '',
}) => {
  const { language } = useTranslation();
  const [internalPeriod, setInternalPeriod] = useState<string>('week');
  const activePeriod = controlledPeriod !== undefined ? controlledPeriod : internalPeriod;

  const handlePeriodChange = (val: string) => {
    if (onPeriodChange) {
      onPeriodChange(val);
    } else {
      setInternalPeriod(val);
    }
  };

  const filterOptions = [
    { id: 'week', label: language === 'ar' ? 'أسبوع' : language === 'fr' ? 'Semaine' : 'Week' },
    { id: 'month', label: language === 'ar' ? 'شهر' : language === 'fr' ? 'Mois' : 'Month' },
    { id: 'quarter', label: language === 'ar' ? 'فصل' : language === 'fr' ? 'Trimestre' : 'Quarter' },
  ];

  const rawList = propBars || propData || [
    { label: 'Sem 1', value: 8 },
    { label: 'Sem 2', value: 6 },
    { label: 'Sem 3', value: 9 },
    { label: 'Sem 4', value: 7, highlight: true },
  ];

  const normalizedBars = useMemo(() => {
    return rawList.map((item, idx) => {
      let multiplier = 1;
      if (activePeriod === 'month') multiplier = 1.35;
      if (activePeriod === 'quarter') multiplier = 2.1;

      const adjustedVal = Math.round(item.value * multiplier);
      return {
        label: item.label || item.week || `P${idx + 1}`,
        value: adjustedVal,
        highlight: item.highlight,
      };
    });
  }, [rawList, activePeriod]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const primaryColor = barColor || activeColor;
  const max = maxScale || Math.max(...normalizedBars.map((b) => b.value), 10);
  const totalValue = normalizedBars.reduce((sum, b) => sum + b.value, 0) || 1;
  const yTicks = [10, 8, 6, 4, 2, 0];

  const hoveredBar = hoveredIdx !== null && normalizedBars[hoveredIdx] ? normalizedBars[hoveredIdx] : null;

  return (
    <div className={`w-full flex flex-col justify-end gap-2 ${className}`}>
      {/* Optional Card Title & Cadence Filter */}
      {(title || showFilter) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s2,8px)] pb-[var(--s1,4px)]">
          {title && (
            <span className="t-card text-[var(--text-1)]">
              {title}
            </span>
          )}

          {showFilter && (
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="inline-flex items-center h-[var(--seg-m-h,32px)] p-[var(--seg-m-pad,2px)] bg-[#F3EDE7] dark:bg-[#191716] border-0 self-start sm:self-auto"
              role="group"
            >
              {filterOptions.map((opt) => {
                const isSelected = activePeriod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePeriodChange(opt.id)}
                    className={`px-[var(--seg-px,12px)] h-[calc(var(--seg-m-h,32px)-4px)] rounded-[var(--r-thumb,9px)] t-small transition-all duration-150 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-white dark:bg-[#2B2825] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shadow-[0_1px_3px_rgba(23,19,15,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="w-full flex items-end gap-3 relative">
        {showYAxis && (
          <div
            className="flex flex-col justify-between t-small tabular-nums text-[var(--text-2)] select-none pb-5 text-right w-6"
            style={{ height: `${height}px` }}
          >
            {yTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-end">
          <div
            className="w-full flex items-end justify-around gap-2 px-1 relative"
            style={{ height: `${height - 20}px` }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b border-black/[0.05] dark:border-white/[0.06] w-full" />
              ))}
            </div>

            {normalizedBars.map((bar, idx) => {
              const pct = Math.min(100, Math.max(8, (bar.value / max) * 100));
              const isHovered = hoveredIdx === idx;
              const isHighlighted = bar.highlight || isHovered;

              return (
                <div
                  key={idx}
                  className="flex-1 max-w-[var(--s8,48px)] flex flex-col items-center gap-[var(--chart-bar-gap,4px)] h-full justify-end z-10 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                >
                  <div
                    style={{
                      height: `${pct}%`,
                      backgroundColor: isHighlighted ? primaryColor : undefined,
                    }}
                    className={`w-full rounded-full transition-all duration-200 transform ${
                      isHovered ? 'scale-x-110 shadow-md brightness-110' : ''
                    } ${
                      isHighlighted
                        ? 'opacity-95 shadow-xs'
                        : 'bg-[#F2ECE7] dark:bg-[#2B2825] hover:bg-[#E2D8D0] dark:hover:bg-[#3A3632]'
                    }`}
                  />
                </div>
              );
            })}

            {/* Floating Tooltip Card */}
            {hoveredBar && hoveredIdx !== null && (
              <div
                className="absolute z-30 pointer-events-none -top-10 transition-all duration-100 ease-out sq-elev-pop"
                style={{
                  left: `${((hoveredIdx + 0.5) / normalizedBars.length) * 100}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="bg-[#262422]/95 text-white backdrop-blur-md px-3 py-2 border-0 [--sq-stroke:url(#sq-spec-dark-pop)] flex items-center gap-2 whitespace-nowrap text-left rtl:text-right"
                >
                  <div className="flex flex-col gap-[var(--name-sub-gap,2px)]">
                    <div className="t-small text-[var(--text-dark-2,#A99E92)]">
                      {hoveredBar.label}
                    </div>
                    <div className="t-small font-semibold tabular-nums text-white flex items-center gap-[var(--s1,4px)]">
                      <span>{hoveredBar.value.toLocaleString()}</span>
                      {unit && <span className="t-cap text-[var(--text-dark-2,#A99E92)]">{unit}</span>}
                    </div>
                  </div>
                  <span className="t-small tabular-nums font-semibold px-[var(--s2,8px)] py-[var(--s1,4px)] rounded-[var(--r-check,6px)] bg-white/10 text-white/90">
                    {Math.round((hoveredBar.value / totalValue) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Labels below bars */}
          <div className="flex justify-around t-small text-[var(--text-2)] pt-[var(--s2,8px)] px-[var(--s1,4px)]">
            {normalizedBars.map((bar, idx) => (
              <span
                key={idx}
                className={`truncate text-center transition-colors ${
                  hoveredIdx === idx ? 'text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] font-semibold' : ''
                }`}
              >
                {bar.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
