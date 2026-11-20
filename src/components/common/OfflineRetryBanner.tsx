import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle, Clock } from 'lucide-react';

export interface OfflineRetryBannerProps {
  isOffline?: boolean;
  isTimedOut?: boolean;
  isSyncing?: boolean;
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
      data-sq="ctl"
      data-sq-border="solid"
      className={`w-full flex items-center justify-between gap-[var(--s3,12px)] px-[var(--empty-pad-x,16px)] py-[var(--s2,8px)] rounded-[var(--r-ctl,12px)] [--sq-stroke:rgba(253,230,138,0.85)] dark:[--sq-stroke:rgba(120,53,15,0.5)] bg-amber-50/90 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 t-cap transition-all animate-in fade-in duration-200 ${className}`}
    >
      <div className="flex items-center gap-[var(--s3,12px)] min-w-0">
        <div className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
          {isOffline ? <WifiOff size={16} strokeWidth={1.5} /> : <AlertCircle size={16} strokeWidth={1.5} />}
        </div>
        <div className="flex flex-wrap items-center gap-x-[var(--s2,8px)] gap-y-[var(--s1,4px)] min-w-0">
          <span className="t-small font-semibold whitespace-nowrap">
            {isOffline ? 'Offline Mode active' : 'Cloud Sync Delayed'}
          </span>
          <span className="t-cap text-amber-800/80 dark:text-amber-300/80">
            — Displaying cached local data
          </span>
          {formattedTime && (
            <span className="inline-flex items-center gap-[var(--s1,4px)] t-cap text-amber-700/75 dark:text-amber-400/75">
              <Clock size={12} strokeWidth={1.5} />
              Cached at {formattedTime}
            </span>
          )}
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          data-sq="ctl-sm"
          data-sq-border="none"
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-[var(--btn-sm-gap,6px)] h-[var(--btn-sm-h,32px)] px-[var(--btn-sm-px,12px)] rounded-[var(--r-ctl-sm,10px)] bg-amber-200/80 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 t-btn transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw size={16} strokeWidth={1.5} className={isRetrying ? 'animate-spin' : ''} />
          <span>{isRetrying ? 'Syncing...' : 'Retry Now'}</span>
        </button>
      )}
    </div>
  );
};
