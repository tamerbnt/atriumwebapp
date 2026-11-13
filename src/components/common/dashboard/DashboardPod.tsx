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
    <div
      className={`bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs space-y-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-[#FBF8F5] dark:bg-white/[0.06] border border-[#E6DED6] dark:border-neutral-700/60 flex items-center justify-center text-[#d4522f] shrink-0">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] leading-snug text-black dark:text-white">
              {title}
            </h3>
            {badge}
          </div>
        </div>

        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>

      <div className="space-y-4 sm:space-y-4.5 flex-1 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
};
