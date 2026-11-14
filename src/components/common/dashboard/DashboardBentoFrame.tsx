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
  <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch ${className}`}>
    {children}
  </div>
);

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
