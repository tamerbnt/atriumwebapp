import React from 'react';

export interface DashboardPodProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  rightControls?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DashboardPod: React.FC<DashboardPodProps> = ({
  title,
  subtitle,
  icon,
  badge,
  rightControls,
  headerRight,
  children,
  className = '',
}) => {
  const rightSlot = rightControls || headerRight;

  return (
    <section
      className={`bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 sm:p-6 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4 sm:space-y-5 flex flex-col justify-start min-w-0 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-[#FBF8F5] dark:bg-white/[0.06] border border-[#E6DED6] dark:border-neutral-700/60 flex items-center justify-center text-[#d4522f] shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15.5px] sm:text-[16.5px] font-semibold tracking-[-0.018em] leading-snug text-black dark:text-white">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-black/60 dark:text-white/60 leading-snug mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-start min-w-0">
        {children}
      </div>
    </section>
  );
};
