import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../../utils/useTranslation';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  title?: string;
  segments?: DonutSegment[];
  data?: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  unit?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
  showFilter?: boolean;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  segments: propSegments,
  data: propData,
  size = 120,
  strokeWidth = 14,
  centerLabel,
  unit = '',
  period: controlledPeriod,
  onPeriodChange,
  showFilter = false,
  className = '',
}) => {
  const { language } = useTranslation();
  const [internalPeriod, setInternalPeriod] = useState<string>('month');
  const activePeriod = controlledPeriod !== undefined ? controlledPeriod : internalPeriod;

  const handlePeriodChange = (val: string) => {
    if (onPeriodChange) {
      onPeriodChange(val);
    } else {
      setInternalPeriod(val);
    }
  };

  const filterOptions = [
    { id: 'month', label: language === 'ar' ? 'هذا الشهر' : language === 'fr' ? 'Ce mois' : 'Month' },
    { id: 'year', label: language === 'ar' ? 'السنة' : language === 'fr' ? 'Année' : 'Year' },
    { id: 'all', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Global' : 'Total' },
  ];

  const rawSegments = propSegments || propData || [];

  const segments = useMemo(() => {
    if (activePeriod === 'year') {
      return rawSegments.map((s, idx) => ({
        ...s,
        value: Math.round(s.value * (11 + ((idx % 3) * 0.4))),
      }));
    }
    if (activePeriod === 'all') {
      return rawSegments.map((s, idx) => ({
        ...s,
        value: Math.round(s.value * (28 + ((idx % 2) * 1.2))),
      }));
    }
    return rawSegments;
  }, [rawSegments, activePeriod]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = useMemo(() => {
    return segments.reduce((sum, s) => sum + s.value, 0) || 1;
  }, [segments]);

  const radius = (size - strokeWidth - 4) / 2;
  const circumference = 2 * Math.PI * radius;

  const activeSegment = hoveredIdx !== null && segments[hoveredIdx] ? segments[hoveredIdx] : null;

  return (
    <div className={`flex flex-col items-center justify-between h-full w-full ${className}`}>
      {/* Optional Card Header & Scope Filter */}
      {(title || showFilter) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--s2,8px)] w-full pb-[var(--s3,12px)]">
          {title && (
            <span className="t-card text-[var(--text-1)]">
              {title}
            </span>
          )}

          {showFilter && (
            <div
              data-sq="ctl-sm"
              data-sq-border="solid"
              className="inline-flex items-center h-[var(--seg-m-h,32px)] p-[var(--seg-m-pad,2px)] bg-[#F3EDE7] dark:bg-neutral-800/80 border border-[#E6DED6] dark:border-neutral-700/60 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] self-start sm:self-auto"
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
                        ? 'bg-white dark:bg-neutral-700 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shadow-xs'
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

      {/* Donut graphic with center callout */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          className="relative flex items-center justify-center cursor-pointer"
          style={{ width: size, height: size }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
            {/* Base track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-black/[0.06] dark:text-white/[0.08]"
            />

            {(() => {
              let currentOffset = 0;
              return segments.map((seg, idx) => {
                const segLength = (seg.value / total) * circumference;
                const strokeDasharray = `${segLength} ${circumference}`;
                const strokeDashoffset = -currentOffset;
                currentOffset += segLength;

                const isHovered = hoveredIdx === idx;
                const isOtherHovered = hoveredIdx !== null && !isHovered;

                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    style={{
                      opacity: isOtherHovered ? 0.35 : 1,
                      filter: isHovered ? `drop-shadow(0 0 6px ${seg.color}80)` : 'none',
                    }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                  />
                );
              });
            })()}
          </svg>

          {/* Dynamic Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-[var(--s2,8px)] text-center">
            {activeSegment ? (
              <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-[var(--s1,4px)]">
                <span className="t-small text-[var(--text-2)] block truncate max-w-[80px]">
                  {activeSegment.label}
                </span>
                <span className="t-small font-semibold tabular-nums text-[var(--text-1)] block">
                  {Math.round((activeSegment.value / total) * 100)}%
                </span>
                <span className="t-cap tabular-nums text-[var(--text-2)] block">
                  {activeSegment.value.toLocaleString()} {unit}
                </span>
              </div>
            ) : (
              <span className="t-small font-semibold tabular-nums text-[var(--text-1)]">
                {centerLabel || `${total.toLocaleString()} ${unit}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Legend below donut */}
      <div className="flex flex-wrap items-center justify-center gap-[var(--chart-leg-row-gap,16px)] pt-[var(--chart-legend-gap,12px)] w-full">
        {segments.map((seg, idx) => {
          const isHovered = hoveredIdx === idx;
          const isOtherHovered = hoveredIdx !== null && !isHovered;

          return (
            <div
              key={idx}
              className={`flex items-center gap-[var(--chart-swatch-gap,6px)] t-small cursor-pointer transition-all duration-200 ${
                isHovered
                  ? 'text-[var(--text-1)] font-semibold'
                  : isOtherHovered
                  ? 'text-[var(--text-3)]'
                  : 'text-[var(--text-2)]'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span
                className="w-[var(--chart-swatch,8px)] h-[var(--chart-swatch,8px)] rounded-full shrink-0 transition-transform"
                style={{
                  backgroundColor: seg.color,
                  transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              <span className="truncate max-w-[96px]">{seg.label}</span>
              <span className="t-cap tabular-nums opacity-85">
                {Math.round((seg.value / total) * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
