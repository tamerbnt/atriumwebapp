import React, { useState } from 'react';
import { Shield, Sparkles } from 'lucide-react';

export interface GuardianCardProps {
  title: string;
  subtitle: string;
  score: number; // 0 to 100
  scoreLabel?: string;
  metricLabel?: string;
  metricValue?: string;
  statusText?: string;
  trendText?: string;
  gaugeColor?: string; // default green '#10B981' or terracotta '#d4522f'
  color?: string;
  isActive?: boolean;
  defaultEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

export const GuardianCard: React.FC<GuardianCardProps> = ({
  title,
  subtitle,
  score = 94,
  scoreLabel = 'Score',
  metricLabel,
  metricValue,
  statusText,
  trendText,
  gaugeColor,
  color,
  isActive = true,
  defaultEnabled = true,
  onToggle,
  className = '',
}) => {
  const [isEnabled, setIsEnabled] = useState(isActive && defaultEnabled);

  const activeColor = color || gaugeColor || '#10B981';
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const handleToggle = () => {
    const next = !isEnabled;
    setIsEnabled(next);
    if (onToggle) onToggle(next);
  };

  return (
    <div
      className={`bg-[#1F1D1B] rounded-[20px] p-5 sm:p-6 border border-white/[0.08] text-white relative overflow-hidden flex flex-col justify-between shadow-md ${className}`}
    >
      {/* Top row: Title + Subtitle and Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.08] text-[#FB923C] flex items-center justify-center shrink-0">
            <Shield size={16} />
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-white tracking-[-0.015em] leading-snug">
              {title}
            </h4>
            <p className="text-[12px] text-white/70 mt-0.5 leading-snug">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Toggle pill */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-12 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
            isEnabled ? 'bg-white/20' : 'bg-neutral-800'
          }`}
          title={isEnabled ? 'Active' : 'Disabled'}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform flex items-center justify-center ${
              isEnabled ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isEnabled ? 'bg-[#10B981]' : 'bg-black/40'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Center: Large Glowing Circular Progress Ring */}
      <div className="flex items-center justify-center my-4 relative">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="transparent"
              stroke="#2A2825"
              strokeWidth="7"
            />
            {/* Active Gauge */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="transparent"
              stroke={activeColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Score */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[30px] leading-none font-bold tracking-[-0.01em] text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:text-2xl">
              {metricValue || `${score}%`}
            </span>
            <span className="text-[10.5px] uppercase tracking-[0.06em] text-white/68 font-semibold mt-1">
              {metricLabel || scoreLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom status indicator */}
      <div className="flex items-center justify-between text-[11.5px] pt-2.5 border-t border-white/10 text-white/72">
        <span className="text-emerald-400 font-medium">
          {statusText || 'Active'}
        </span>
        <span className="text-[11px] text-white/60 font-mono tabular-nums">
          {trendText || 'Live'}
        </span>
      </div>
    </div>
  );
};
