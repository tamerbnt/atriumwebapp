import React, { useState } from 'react';
import { Shield, Sparkles } from 'lucide-react';

export interface GuardianCardProps {
  title: string;
  subtitle?: string;
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
    <div className={`sq-elev-card h-full ${className}`}>
      <div
        data-surface="dark"
        data-sq="card"
        data-sq-border="solid"
        className="bg-[#22201E] rounded-[var(--r-card,16px)] p-[var(--card-pad,20px)] card-opt [--sq-stroke:var(--sq-stroke-obsidian)] text-white relative overflow-hidden flex flex-col justify-between gap-[var(--card-body-gap,20px)] h-full"
      >
        {/* Top row: Title and Toggle */}
        <div className="flex items-center justify-between gap-[var(--card-head-gap,12px)]">
          <div className="flex items-center gap-[var(--card-head-gap,12px)]">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-[var(--r-tile,12px)] bg-white/[0.08] text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center shrink-0"
            >
              <Shield size={16} strokeWidth={1.5} />
            </div>
            <h4 className="t-card text-white">
              {title}
            </h4>
          </div>

          {/* Toggle pill */}
          <button
            type="button"
            onClick={handleToggle}
            className={`w-12 h-6 rounded-full transition-colors p-1 relative cursor-pointer flex items-center ${
              isEnabled ? 'bg-white/20' : 'bg-[#2B2825]'
            }`}
            title={isEnabled ? 'Active' : 'Disabled'}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform flex items-center justify-center ${
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
        <div className="flex items-center justify-center relative">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[var(--s1,4px)]">
              <span className="t-unit text-white tabular-nums">
                {metricValue || `${score}%`}
              </span>
              <span className="t-small text-[var(--text-dark-2,#A99E92)]">
                {metricLabel || scoreLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom status indicator */}
        <div className="flex items-center justify-between pt-[var(--footer-gap,16px)] border-t border-white/[0.06] text-[var(--text-dark-2,#A99E92)]">
          <span className="t-small text-emerald-400">
            {statusText || 'Active'}
          </span>
          <span className="t-cap text-[var(--text-dark-2,#A99E92)] tabular-nums">
            {trendText || 'Live'}
          </span>
        </div>
      </div>
    </div>
  );
};
