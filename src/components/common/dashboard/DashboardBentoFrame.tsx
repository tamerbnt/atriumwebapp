import React from 'react';
import { AppTheme, SupportedLanguage } from '../../../types/index';
import { ChartLocale, ChartSurface } from '@/atrium';
import { OfflineRetryBanner } from '../OfflineRetryBanner';

export interface DashboardBentoFrameProps {
  theme: AppTheme;
  isRtl: boolean;
  isOffline?: boolean;
  isTimedOut?: boolean;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => void;
  'data-testid'?: string;
  children: React.ReactNode;
}

export const DashboardBentoFrame: React.FC<DashboardBentoFrameProps> = ({
  theme,
  isRtl,
  isOffline = false,
  isTimedOut = false,
  isSyncing = false,
  lastSyncedAt = null,
  onRetry,
  'data-testid': testId,
  children,
}) => {
  return (
    <div
      data-atrium-theme={theme === 'dark' ? 'dark' : 'light'}
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid={testId}
      className="ax-scope space-y-5 sm:space-y-6 animate-in fade-in duration-200"
    >
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onRetry={onRetry}
      />
      {children}
    </div>
  );
};

export const DashboardBentoGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-4 sm:gap-5 items-stretch ${className}`}>
    {children}
  </div>
);

export const BENTO_SPAN = {
  kpiHalf: 'col-span-1 md:col-span-3 xl:col-span-6',
  full: 'col-span-1 md:col-span-6 xl:col-span-12',
  hero8: 'col-span-1 md:col-span-6 xl:col-span-8',
  side4: 'col-span-1 md:col-span-6 xl:col-span-4',
  wide7: 'col-span-1 md:col-span-6 xl:col-span-7',
  medium5: 'col-span-1 md:col-span-6 xl:col-span-5',
  pair5Compact: 'col-span-1 md:col-span-3 xl:col-span-5',
  pair7Compact: 'col-span-1 md:col-span-3 xl:col-span-7',
  halfCompact: 'col-span-1 md:col-span-3 xl:col-span-6',
  thirdCompact: 'col-span-1 md:col-span-3 xl:col-span-4',
  thirdWideTablet: 'col-span-1 md:col-span-6 xl:col-span-4',
} as const;

export const POD_SPAN = {
  half: 'col-span-1',
  full: 'col-span-full',
  wide7: 'col-span-1 lg:col-span-7',
  side5: 'col-span-1 lg:col-span-5',
  wide8: 'col-span-1 lg:col-span-8',
  side4: 'col-span-1 lg:col-span-4',
  half12: 'col-span-1 lg:col-span-6',
} as const;

export interface DashboardPodGridProps {
  children: React.ReactNode;
  layout?: 'equal' | 'split75' | 'split84';
  className?: string;
}

export const DashboardPodGrid: React.FC<DashboardPodGridProps> = ({
  children,
  layout = 'equal',
  className = '',
}) => {
  const layoutClass =
    layout === 'equal'
      ? 'grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5'
      : 'grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5';

  return <div className={`grid ${layoutClass} items-stretch ${className}`}>{children}</div>;
};

export function getInlineDarkSurface(theme: AppTheme): ChartSurface {
  return theme === 'light' ? 'dark' : 'auto';
}

export function getSurfaceProps(
  theme: AppTheme,
  featured = false
): { surface: ChartSurface; inlineDark: boolean } {
  if (featured && theme === 'light') {
    return { surface: 'dark', inlineDark: true };
  }
  return { surface: 'auto', inlineDark: false };
}

export function toChartLocale(language: SupportedLanguage): ChartLocale {
  return language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en';
}

export function localizeText(
  language: SupportedLanguage,
  fr: string,
  en: string,
  ar: string
): string {
  return language === 'ar' ? ar : language === 'fr' ? fr : en;
}
