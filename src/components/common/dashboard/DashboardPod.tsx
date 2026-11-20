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
      data-sq="panel"
      data-sq-border="solid"
      className={`relative bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] border border-[#E6DED6] dark:border-[#33302D] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] flex flex-col justify-start min-w-0 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap pt-1 px-3 pb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icon && (
            <div
              data-sq="ctl-sm"
              data-sq-border="solid"
              className="relative w-8 h-8 bg-[#FBF8F5] dark:bg-white/[0.06] border border-[#E6DED6] dark:border-neutral-700/60 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] flex items-center justify-center text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0"
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[var(--t-h3)] leading-[var(--pod-head-h,22px)] font-semibold tracking-[-0.015em] rtl:tracking-normal text-[var(--text-1)]">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--text-2)] leading-[var(--lh-small)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
      </div>

      <div className="flex-1 flex flex-col gap-[var(--card-gap,12px)] justify-start min-w-0">
        {children}
      </div>
    </section>
  );
};
