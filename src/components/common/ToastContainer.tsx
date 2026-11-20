import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  CloudCheck,
  Cloud,
  Database,
} from 'lucide-react';
import { useAtriumStore, dismissToast } from '../../services/store';
import { ToastNotification } from '../../types/index';

export const ToastContainer: React.FC = () => {
  const { toasts } = useAtriumStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed bottom-[var(--s5,20px)] right-[var(--s5,20px)] rtl:right-auto rtl:left-[var(--s5,20px)] z-[99999] flex flex-col gap-[var(--s2,8px)] max-w-sm sm:max-w-md w-full pointer-events-none px-[var(--s4,16px)] sm:px-0"
    >
      {toasts.map((toast: ToastNotification) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isInfo = toast.type === 'info';

        return (
          <div key={toast.id} className="pointer-events-auto sq-elev-pop">
            <div
              role="status"
              aria-live="polite"
              data-sq="card"
              data-sq-border="solid"
              className="bg-white/95 dark:bg-[#1E1E22]/95 backdrop-blur-md rounded-[var(--r-card,16px)] p-[var(--s4,16px)] [--sq-stroke:var(--sq-stroke-pop)] flex items-start gap-[var(--s3,12px)] transition-all duration-300 animate-in slide-in-from-bottom-3"
            >
              {/* Status Icon */}
              <div className="shrink-0">
                {isSuccess && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-[var(--r-tile,12px)] bg-emerald-50 dark:bg-emerald-950/60 [--sq-stroke:#a7f3d0] dark:[--sq-stroke:#065f46] flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 size={16} strokeWidth={1.5} />
                  </div>
                )}
                {isError && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-[var(--r-tile,12px)] bg-rose-50 dark:bg-rose-950/60 [--sq-stroke:#fecdd3] dark:[--sq-stroke:#9f1239] flex items-center justify-center text-rose-600 dark:text-rose-400"
                  >
                    <AlertCircle size={16} strokeWidth={1.5} />
                  </div>
                )}
                {isWarning && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-[var(--r-tile,12px)] bg-amber-50 dark:bg-amber-950/60 [--sq-stroke:#fde68a] dark:[--sq-stroke:#92400e] flex items-center justify-center text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle size={16} strokeWidth={1.5} />
                  </div>
                )}
                {isInfo && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-[var(--r-tile,12px)] bg-sky-50 dark:bg-sky-950/60 [--sq-stroke:#bae6fd] dark:[--sq-stroke:#075985] flex items-center justify-center text-sky-600 dark:text-sky-400"
                  >
                    <Info size={16} strokeWidth={1.5} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col gap-[var(--s1,4px)]">
                <div className="flex items-center gap-[var(--s2,8px)] flex-wrap">
                  <h4 className="t-label font-semibold text-[var(--text-1)]">
                    {toast.title}
                  </h4>

                  {/* Cloud Sync Status Badge */}
                  {toast.syncStatus === 'synced' && (
                    <span className="inline-flex items-center gap-[var(--pill-gap,6px)] h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 t-small text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                      <Cloud size={12} strokeWidth={1.5} className="text-emerald-600 dark:text-emerald-400" />
                      Supabase Synced
                    </span>
                  )}
                  {toast.syncStatus === 'local' && (
                    <span className="inline-flex items-center gap-[var(--pill-gap,6px)] h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full bg-neutral-100 dark:bg-neutral-800 t-small text-[var(--text-2)] border border-black/[0.06] dark:border-white/[0.10]">
                      <Database size={12} strokeWidth={1.5} />
                      Saved to Local Storage
                    </span>
                  )}
                  {toast.syncStatus === 'error' && (
                    <span className="inline-flex items-center gap-[var(--pill-gap,6px)] h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] rounded-full bg-amber-100/70 dark:bg-amber-900/40 t-small text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                      <AlertCircle size={12} strokeWidth={1.5} />
                      Sync Notice
                    </span>
                  )}
                </div>

                <p className="t-cap text-[var(--text-2)] break-words">
                  {toast.message}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Dismiss notification"
                aria-label="Dismiss notification"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
};
