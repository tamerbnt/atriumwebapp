import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from '../../../utils/useTranslation';

export interface HourlyCurveChartProps {
  data?: number[]; // typically 10 or 24 hourly points
  labels?: string[]; // e.g. ['00:00', '05:00', '10:00', '15:00', '20:00']
  color?: string; // e.g. '#10B981' or '#d4522f'
  height?: number;
  className?: string;
  title?: string;
  unit?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
  showPeriodFilter?: boolean;
}

export const HourlyCurveChart: React.FC<HourlyCurveChartProps> = ({
  data: propData = [12, 18, 45, 60, 85, 92, 70, 48, 30, 20],
  labels: propLabels = ['00:00', '05:00', '10:00', '15:00', '20:00'],
  color = '#10B981',
  height = 95,
  className = '',
  title,
  unit,
  period: controlledPeriod,
  onPeriodChange,
  showPeriodFilter = true,
}) => {
  const { language, isRtl } = useTranslation();
  const [internalPeriod, setInternalPeriod] = useState<string>('today');
  const activePeriod = controlledPeriod !== undefined ? controlledPeriod : internalPeriod;

  const handlePeriodChange = (val: string) => {
    if (onPeriodChange) {
      onPeriodChange(val);
    } else {
      setInternalPeriod(val);
    }
  };

  // Daily context-adapted filter options
  const filterOptions = [
    { id: 'today', label: language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today' },
    { id: 'yesterday', label: language === 'ar' ? 'أمس' : language === 'fr' ? 'Hier' : 'Yesterday' },
    { id: 'day_before', label: language === 'ar' ? 'أول أمس' : language === 'fr' ? 'Avant-hier' : '-48h' },
    { id: '7d_avg', label: language === 'ar' ? 'متوسط ٧أيام' : language === 'fr' ? 'Moyenne 7J' : '7D Avg' },
  ];

  // Dynamic context data depending on active daily filter
  const currentData = useMemo(() => {
    if (activePeriod === 'yesterday') {
      return propData.map((v, i) => Math.max(0, Math.round(v * 0.92 + Math.sin(i * 0.8) * 6)));
    }
    if (activePeriod === 'day_before') {
      return propData.map((v, i) => Math.max(0, Math.round(v * 0.85 + Math.cos(i * 0.9) * 8)));
    }
    if (activePeriod === '7d_avg') {
      return propData.map((v, i) => {
        const prev = propData[i > 0 ? i - 1 : 0] || v;
        const next = propData[i < propData.length - 1 ? i + 1 : propData.length - 1] || v;
        return Math.round((v * 1.5 + prev + next) / 3.5);
      });
    }
    return propData;
  }, [propData, activePeriod]);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const max = Math.max(...currentData, 1);
  const width = 440;
  const h = height;
  const paddingX = 14;
  const paddingY = 14;

  // Build coordinate points
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

  // Handle pointer scrub
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
  const activeLabel = hoverIdx !== null ? (propLabels[hoverIdx] || `${hoverIdx * 2}h00`) : '';
  const prevValue = hoverIdx !== null && hoverIdx > 0 ? points[hoverIdx - 1]?.val : null;
  const deltaPct = activePoint && prevValue !== null && prevValue > 0
    ? Math.round(((activePoint.val - prevValue) / prevValue) * 100)
    : null;

  const unitLabel = unit || (language === 'ar' ? 'وحدة' : language === 'fr' ? 'visiteurs' : 'visitors');

  return (
    <div className={`w-full flex flex-col justify-end ${className}`}>
      {/* Optional Card Header & Context-Adaptive Date Filter */}
      {(title || showPeriodFilter) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5">
          {title && (
            <span className="text-xs font-bold text-black dark:text-white">
              {title}
            </span>
          )}

          {showPeriodFilter && (
            <div
              className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700/60 self-start sm:self-auto shadow-2xs"
              role="group"
              aria-label="Hourly Filter"
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

      {/* SVG Interactive Canvas with Scrubbing Line & Tooltip */}
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
            <linearGradient id={`grad-hourly-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
            <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={color} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill={`url(#grad-hourly-${color.replace('#', '')})`} />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Base dots on all points */}
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
                filter="url(#dot-glow)"
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
            <div className="bg-neutral-900/95 dark:bg-neutral-800/95 text-white backdrop-blur-md rounded-xl px-2.5 py-1.5 shadow-xl border border-neutral-700/60 flex items-center gap-2 whitespace-nowrap text-left rtl:text-right">
              <div>
                <div className="text-[10px] text-white/70 font-medium">
                  {activeLabel}
                </div>
                <div className="text-xs font-bold font-mono tabular-nums text-white flex items-center gap-1.5">
                  <span>{activePoint.val.toLocaleString()}</span>
                  <span className="text-[9px] text-white/70 font-sans font-normal">{unitLabel}</span>
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

      {/* Axis timestamps */}
      <div className="flex justify-between text-[10px] font-mono tabular-nums font-medium text-black/60 dark:text-white/60 pt-2 px-1">
        {propLabels.map((lbl, idx) => (
          <span key={idx}>{lbl}</span>
        ))}
      </div>
    </div>
  );
};
