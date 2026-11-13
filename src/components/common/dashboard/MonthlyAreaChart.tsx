import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from '../../../utils/useTranslation';

export interface MonthlyAreaChartProps {
  data?: number[]; // typically 30 data points
  color?: string; // e.g. '#8B5CF6' or '#d4522f'
  height?: number;
  className?: string;
  currency?: string;
  title?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
  showPeriodFilter?: boolean;
}

export const MonthlyAreaChart: React.FC<MonthlyAreaChartProps> = ({
  data: propData = [
    12000, 15000, 14000, 18000, 22000, 26000, 24000, 31000, 34000, 29000,
    35000, 42000, 38000, 45000, 49000, 44000, 52000, 58000, 54000, 61000,
    67000, 62000, 71000, 75000, 70000, 79000, 84000, 82000, 88000, 95000,
  ],
  color = '#8B5CF6',
  height = 95,
  className = '',
  currency = 'DA',
  title,
  period: controlledPeriod,
  onPeriodChange,
  showPeriodFilter = true,
}) => {
  const { language } = useTranslation();
  const [internalPeriod, setInternalPeriod] = useState<string>('this_month');
  const activePeriod = controlledPeriod !== undefined ? controlledPeriod : internalPeriod;

  const handlePeriodChange = (val: string) => {
    if (onPeriodChange) {
      onPeriodChange(val);
    } else {
      setInternalPeriod(val);
    }
  };

  // Monthly / Financial context-adapted filter options
  const filterOptions = [
    { id: 'this_month', label: language === 'ar' ? 'هذا الشهر' : language === 'fr' ? 'Ce mois' : 'This Month' },
    { id: 'last_month', label: language === 'ar' ? 'الشهر السابق' : language === 'fr' ? 'Mois dernier' : 'Last Month' },
    { id: 'quarter', label: language === 'ar' ? 'الربع 90J' : language === 'fr' ? 'Trimestre 90J' : '90D Quarter' },
    { id: 'year', label: language === 'ar' ? 'السنة' : language === 'fr' ? 'Année' : 'Year' },
  ];

  // Dynamic context data depending on active financial filter
  const currentData = useMemo(() => {
    if (activePeriod === 'last_month') {
      return propData.map((v, i) => Math.max(1000, Math.round(v * 0.88 + Math.cos(i * 0.4) * 4500)));
    }
    if (activePeriod === 'quarter') {
      // 3-month aggregate progression
      return propData.map((v, i) => Math.max(1000, Math.round(v * 1.45 + Math.sin(i * 0.5) * 8000)));
    }
    if (activePeriod === 'year') {
      // Annualized trajectory
      return propData.map((v, i) => Math.max(1000, Math.round(v * 3.8 + (i * 1200))));
    }
    return propData;
  }, [propData, activePeriod]);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const max = Math.max(...currentData, 1);
  const width = 600;
  const h = height;
  const paddingX = 12;
  const paddingY = 12;

  const points = useMemo(() => {
    return currentData.map((val, idx) => {
      const x = paddingX + (idx / Math.max(1, currentData.length - 1)) * (width - paddingX * 2);
      const y = h - paddingY - (val / max) * (h - paddingY * 2);
      return { x, y, val };
    });
  }, [currentData, max, width, h, paddingX, paddingY]);

  const pathD = useMemo(() => {
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    }, '');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    return `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;
  }, [pathD, points, h]);

  // Pointer scrubbing
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  const handlePointerLeave = () => {
    setHoverIdx(null);
  };

  const activePoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const dayNumber = hoverIdx !== null ? hoverIdx + 1 : 1;
  const activeDayLabel = hoverIdx !== null
    ? (language === 'ar' ? `اليوم ${dayNumber}` : language === 'fr' ? `Jour ${dayNumber}` : `Day ${dayNumber}`)
    : '';

  const prevValue = hoverIdx !== null && hoverIdx > 0 ? points[hoverIdx - 1]?.val : null;
  const deltaPct = activePoint && prevValue !== null && prevValue > 0
    ? Math.round(((activePoint.val - prevValue) / prevValue) * 100)
    : null;

  // Filter day numbers to show ~10 points to prevent text collision
  const dayIndices = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  return (
    <div className={`w-full flex flex-col justify-end pt-2 ${className}`}>
      {/* Optional Card Header & Context-Adaptive Date Filter */}
      {(title || showPeriodFilter) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          {title && (
            <span className="text-xs font-bold text-black dark:text-white">
              {title}
            </span>
          )}

          {showPeriodFilter && (
            <div
              className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700/60 self-start sm:self-auto shadow-2xs"
              role="group"
              aria-label="Monthly Filter"
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
                        : 'text-black/65 dark:text-white/70 hover:text-black dark:hover:text-white'
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

      {/* Interactive SVG Canvas with Crosshair & Floating Tooltip */}
      <div
        ref={containerRef}
        className="relative w-full cursor-crosshair touch-none select-none"
        style={{ height: `${height}px` }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${h}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-monthly-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
            <filter id="monthly-dot-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={color} floodOpacity="0.45" />
            </filter>
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

          {/* Base Dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === idx ? 4.5 : 2}
              fill={hoverIdx === idx ? '#FFFFFF' : color}
              stroke={hoverIdx === idx ? color : 'none'}
              strokeWidth={hoverIdx === idx ? 2 : 0}
              className="transition-all duration-150"
            />
          ))}

          {/* Interactive Crosshair Vertical Guide */}
          {activePoint && (
            <g className="animate-in fade-in duration-100">
              <line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={h}
                stroke={color}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.85"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#FFFFFF"
                stroke={color}
                strokeWidth="2.5"
                filter="url(#monthly-dot-glow)"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none -top-10 transition-all duration-75 ease-out"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-neutral-900/95 dark:bg-neutral-800/95 text-white backdrop-blur-md rounded-xl px-2.5 py-1.5 shadow-xl border border-neutral-700/60 flex items-center gap-2.5 whitespace-nowrap text-left rtl:text-right">
              <div>
                <div className="text-[10px] text-white/70 font-medium">
                  {activeDayLabel}
                </div>
                <div className="text-xs font-bold font-mono tabular-nums text-white flex items-center gap-1.5">
                  <span>{activePoint.val.toLocaleString()}</span>
                  <span className="text-[9px] text-[#E09070] font-sans font-semibold">{currency}</span>
                </div>
              </div>

              {deltaPct !== null && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                    deltaPct >= 0
                      ? 'bg-emerald-950/80 text-emerald-400'
                      : 'bg-rose-950/80 text-rose-400'
                  }`}
                >
                  {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Days 1 to 30 */}
      <div className="flex justify-between text-[9px] font-mono tabular-nums font-medium text-black/60 dark:text-white/60 pt-2 px-1">
        {dayIndices.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
};
