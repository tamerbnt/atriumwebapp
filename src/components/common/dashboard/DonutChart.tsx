import React from 'react';

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
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  segments: propSegments,
  data: propData,
  size = 110,
  strokeWidth = 14,
  centerLabel,
  className = '',
}) => {
  const segments = propSegments || propData || [];
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className={`flex flex-col items-center justify-between h-full ${className}`}>
      {title && (
        <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 self-start mb-2">
          {title}
        </span>
      )}

      <div className="relative flex items-center justify-center my-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-neutral-100 dark:text-neutral-800"
          />
          {segments.map((seg, idx) => {
            const strokeDasharray = `${(seg.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += (seg.value / total) * circumference;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        {centerLabel && (
          <span className="absolute text-[11px] font-bold font-mono text-neutral-800 dark:text-white">
            {centerLabel}
          </span>
        )}
      </div>

      {/* Legend below donut */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[10px] text-neutral-600 dark:text-neutral-400">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="truncate max-w-[80px]">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
