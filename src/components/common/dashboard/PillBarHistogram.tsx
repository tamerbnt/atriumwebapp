import React from 'react';

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
  className?: string;
}

export const PillBarHistogram: React.FC<PillBarHistogramProps> = ({
  bars: propBars,
  data: propData,
  height = 120,
  maxScale,
  activeColor = '#d4522f',
  barColor,
  mutedColor = '#E8DFD8',
  showYAxis = true,
  unit = '',
  className = '',
}) => {
  const rawList = propBars || propData || [
    { label: 'week 1', value: 8 },
    { label: 'week 2', value: 6 },
    { label: 'week 3', value: 9 },
    { label: 'week 4', value: 7, highlight: true },
  ];

  const normalizedBars = rawList.map((item) => ({
    label: item.label || item.week || '',
    value: item.value,
    highlight: item.highlight,
  }));

  const primaryColor = barColor || activeColor;
  const max = maxScale || Math.max(...normalizedBars.map((b) => b.value), 10);
  const yTicks = [10, 8, 6, 4, 2, 0];

  return (
    <div className={`w-full flex items-end gap-3 pt-2 ${className}`}>
      {showYAxis && (
        <div
          className="flex flex-col justify-between text-[9px] font-mono text-neutral-400 select-none pb-5 text-right w-4"
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
        >
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-b border-neutral-300 dark:border-neutral-600 w-full" />
            ))}
          </div>

          {normalizedBars.map((bar, idx) => {
            const pct = Math.min(100, Math.max(8, (bar.value / max) * 100));
            return (
              <div
                key={idx}
                className="flex-1 max-w-[48px] flex flex-col items-center gap-1.5 group h-full justify-end z-10"
              >
                <div
                  style={{
                    height: `${pct}%`,
                    backgroundColor: bar.highlight ? primaryColor : undefined,
                  }}
                  className={`w-full rounded-full transition-all duration-300 ${
                    bar.highlight
                      ? 'opacity-90 group-hover:opacity-100 shadow-xs'
                      : 'bg-[#F2ECE7] dark:bg-neutral-700/80 group-hover:bg-[#E2D8D0] dark:group-hover:bg-neutral-600'
                  }`}
                  title={`${bar.label}: ${bar.value} ${unit}`}
                />
              </div>
            );
          })}
        </div>

        {/* Labels below bars */}
        <div className="flex justify-around text-[10px] font-medium text-neutral-500 dark:text-neutral-400 pt-2 px-1">
          {normalizedBars.map((bar, idx) => (
            <span key={idx} className="truncate text-center">
              {bar.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
