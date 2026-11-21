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
      className={`relative bg-[#F3EDE7] dark:bg-[#191716] p-[var(--pod-pad,12px)] flex flex-col justify-start min-w-0 ${className}`}
    >
      <div
        className="flex items-start justify-between gap-[var(--card-head-gap,12px)] flex-wrap"
        style={{ padding: 'var(--pod-head-pad, 4px 12px 12px)' }}
      >
        <div className="flex items-start gap-[var(--card-head-gap,12px)] min-w-0 flex-1">
          {icon && (
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="relative w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] bg-[#FBF8F5] dark:bg-[#2B2825] flex items-center justify-center text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shrink-0"
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1 flex flex-col gap-[var(--s1,4px)]">
            <div className="flex items-center gap-[var(--s2,8px)] flex-wrap">
              <h2 className="t-pod dark:font-medium text-[var(--text-1)]">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="t-cap text-[var(--text-2)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {rightSlot && <div className="flex items-center gap-[var(--s2,8px)] shrink-0">{rightSlot}</div>}
      </div>

      <div className="flex-1 flex flex-col gap-[var(--card-gap,12px)] justify-start min-w-0">
        {children}
      </div>
    </section>
  );
};
