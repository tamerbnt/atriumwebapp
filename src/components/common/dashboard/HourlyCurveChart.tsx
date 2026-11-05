import React from 'react';

export interface HourlyCurveChartProps {
  data?: number[]; // typically 10 or 24 hourly points
  labels?: string[]; // e.g. ['00:00', '05:00', '10:00', '15:00', '20:00']
  color?: string; // e.g. '#10B981' or '#d4522f'
  height?: number;
  className?: string;
}

export const HourlyCurveChart: React.FC<HourlyCurveChartProps> = ({
  data = [12, 18, 45, 60, 85, 92, 70, 48, 30, 20],
  labels = ['00:00', '05:00', '10:00', '15:00', '20:00'],
  color = '#10B981',
  height = 90,
  className = '',
}) => {
  const max = Math.max(...data, 1);
  const width = 400;
  const h = height;
  const paddingX = 10;
  const paddingY = 12;

  // Build points
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

  return (
    <div className={`w-full flex flex-col justify-end pt-2 ${className}`}>
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${h}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Active dots on key points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill={color}
              className="transition-all hover:r-4"
            />
          ))}
        </svg>
      </div>

      {/* Axis timestamps */}
      <div className="flex justify-between text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-500 pt-2 px-1">
        {labels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
};
