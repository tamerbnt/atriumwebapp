import React from 'react';

export interface MonthlyAreaChartProps {
  data?: number[]; // typically 30 data points
  color?: string; // e.g. '#8B5CF6' or '#d4522f'
  height?: number;
  className?: string;
  currency?: string;
}

export const MonthlyAreaChart: React.FC<MonthlyAreaChartProps> = ({
  data = [
    12000, 15000, 14000, 18000, 22000, 26000, 24000, 31000, 34000, 29000,
    35000, 42000, 38000, 45000, 49000, 44000, 52000, 58000, 54000, 61000,
    67000, 62000, 71000, 75000, 70000, 79000, 84000, 82000, 88000, 95000,
  ],
  color = '#8B5CF6',
  height = 95,
  className = '',
  currency = 'DA',
}) => {
  const max = Math.max(...data, 1);
  const width = 600;
  const h = height;
  const paddingX = 10;
  const paddingY = 10;

  const points = data.map((val, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * (width - paddingX * 2);
    const y = h - paddingY - (val / max) * (h - paddingY * 2);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  // Filter day numbers to show ~8-10 points to prevent text collision
  const dayIndices = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  return (
    <div className={`w-full flex flex-col justify-end pt-2 ${className}`}>
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${h}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-monthly-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area */}
          <path d={areaD} fill={`url(#grad-monthly-${color.replace('#', '')})`} />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Dots on key days */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="2"
              fill={color}
              className="hover:r-3.5 transition-all"
            />
          ))}
        </svg>
      </div>

      {/* Days 1 to 30 */}
      <div className="flex justify-between text-[9px] font-mono text-neutral-400 dark:text-neutral-500 pt-2 px-1">
        {dayIndices.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
};
