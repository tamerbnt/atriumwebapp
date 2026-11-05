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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full pb-2">
          {title && (
            <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
              {title}
            </span>
          )}

          {showFilter && (
            <div
              className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700/60 self-start sm:self-auto shadow-2xs"
              role="group"
            >
              {filterOptions.map((opt) => {
                const isSelected = activePeriod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePeriodChange(opt.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-white dark:bg-neutral-700 text-[#d4522f] dark:text-[#E09070] shadow-xs'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
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
      <div
        className="relative flex items-center justify-center my-auto cursor-pointer"
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
            className="text-neutral-100 dark:text-neutral-800"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center">
          {activeSegment ? (
            <div className="animate-in fade-in zoom-in-95 duration-150">
              <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 block leading-tight truncate max-w-[70px]">
                {activeSegment.label}
              </span>
              <span className="text-xs font-bold font-mono tabular-nums text-neutral-900 dark:text-white block leading-tight">
                {Math.round((activeSegment.value / total) * 100)}%
              </span>
              <span className="text-[8px] font-mono text-neutral-500 block leading-tight">
                {activeSegment.value.toLocaleString()} {unit}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-bold font-mono text-neutral-800 dark:text-white">
              {centerLabel || `${total.toLocaleString()} ${unit}`}
            </span>
          )}
        </div>
      </div>

      {/* Legend below donut */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 w-full">
        {segments.map((seg, idx) => {
          const isHovered = hoveredIdx === idx;
          const isOtherHovered = hoveredIdx !== null && !isHovered;

          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 text-[10px] cursor-pointer transition-all duration-200 ${
                isHovered
                  ? 'text-neutral-900 dark:text-white font-bold scale-105'
                  : isOtherHovered
                  ? 'text-neutral-400 dark:text-neutral-600 opacity-60'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-transform"
                style={{
                  backgroundColor: seg.color,
                  transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              <span className="truncate max-w-[85px]">{seg.label}</span>
              <span className="font-mono text-[9px] opacity-75">
                {Math.round((seg.value / total) * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
