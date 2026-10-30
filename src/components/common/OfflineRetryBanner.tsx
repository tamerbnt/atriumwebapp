import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle, Clock } from 'lucide-react';

export interface OfflineRetryBannerProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetry?: () => Promise<void> | void;
  className?: string;
  compact?: boolean;
}

export const OfflineRetryBanner: React.FC<OfflineRetryBannerProps> = ({
  isOffline = false,
  isTimedOut = false,
  lastSyncedAt,
  onRetry,
  className = '',
  compact = false,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  // If neither offline nor timed out, don't render
  if (!isOffline && !isTimedOut) return null;

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await Promise.resolve(onRetry());
    } finally {
      // 1.5s visual feedback lockout to prevent rapid button spam
      setTimeout(() => {
        setIsRetrying(false);
      }, 1500);
    }
  };

  const formattedTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs shadow-2xs transition-all animate-in fade-in duration-200 mb-4 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
          {isOffline ? <WifiOff size={13} /> : <AlertCircle size={13} />}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-semibold whitespace-nowrap">
            {isOffline ? 'Offline Mode active' : 'Cloud Sync Delayed'}
          </span>
          <span className="text-amber-800/80 dark:text-amber-300/80">
            — Displaying cached local data
          </span>
          {formattedTime && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700/70 dark:text-amber-400/70">
              <Clock size={10} />
              Cached at {formattedTime}
            </span>
          )}
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 font-medium text-xs transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw size={12} className={isRetrying ? 'animate-spin' : ''} />
          <span>{isRetrying ? 'Syncing...' : 'Retry Now'}</span>
        </button>
      )}
    </div>
  );
};
