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
      className={`bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {icon && <div className="text-[#d4522f]">{icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13.5px] font-bold text-neutral-900 dark:text-white">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
};
