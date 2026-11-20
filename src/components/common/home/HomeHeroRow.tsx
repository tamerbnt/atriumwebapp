import React from 'react';
import { DashboardPod } from '../dashboard';
import { HomePodGrid, HOME_POD_DIRECTORY_CLASS, HOME_POD_PULSE_CLASS } from './HomeShell';
import type { HomeColumnRatio } from './homeTypes';

export interface HomeHeroRowProps {
  ratio?: HomeColumnRatio;
  heroTitle: string;
  heroSubtitle?: string;
  heroIcon?: React.ReactNode;
  heroBadge?: React.ReactNode;
  heroChildren: React.ReactNode;
  priorityTitle: string;
  prioritySubtitle?: string;
  priorityIcon?: React.ReactNode;
  priorityBadge?: React.ReactNode;
  priorityChildren: React.ReactNode;
  className?: string;
}

export const HomeHeroRow: React.FC<HomeHeroRowProps> = ({
  ratio = '40_60',
  heroTitle,
  heroSubtitle,
  heroIcon,
  heroBadge,
  heroChildren,
  priorityTitle,
  prioritySubtitle,
  priorityIcon,
  priorityBadge,
  priorityChildren,
  className = '',
}) => {
  return (
    <HomePodGrid ratio={ratio} className={className} data-testid="home-row-hero">
      <DashboardPod
        title={heroTitle}
        subtitle={heroSubtitle}
        icon={heroIcon}
        badge={heroBadge}
        className={HOME_POD_PULSE_CLASS}
      >
        <div className="flex-1 flex flex-col gap-[var(--card-gap,12px)] min-w-0">
          {heroChildren}
        </div>
      </DashboardPod>

      <DashboardPod
        title={priorityTitle}
        subtitle={prioritySubtitle}
        icon={priorityIcon}
        badge={priorityBadge}
        className={HOME_POD_DIRECTORY_CLASS}
      >
        <div className="flex-1 flex flex-col gap-[var(--card-gap,12px)] min-w-0">
          {priorityChildren}
        </div>
      </DashboardPod>
    </HomePodGrid>
  );
};
