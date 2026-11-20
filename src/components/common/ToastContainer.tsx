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
      className="fixed bottom-5 right-5 rtl:right-auto rtl:left-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
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
              className="bg-white/95 dark:bg-[#1E1E22]/95 backdrop-blur-md rounded-[var(--r-card,16px)] p-4 [--sq-stroke:rgba(229,229,229,0.9)] dark:[--sq-stroke:rgba(64,64,64,0.8)] flex items-start gap-3.5 transition-all duration-300 animate-in slide-in-from-bottom-3"
            >
              {/* Status Icon */}
              <div className="shrink-0 mt-0.5">
                {isSuccess && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-8 h-8 rounded-[var(--r-tile,12px)] bg-emerald-50 dark:bg-emerald-950/60 [--sq-stroke:#a7f3d0] dark:[--sq-stroke:#065f46] flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 size={18} />
                  </div>
                )}
                {isError && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-8 h-8 rounded-[var(--r-tile,12px)] bg-rose-50 dark:bg-rose-950/60 [--sq-stroke:#fecdd3] dark:[--sq-stroke:#9f1239] flex items-center justify-center text-rose-600 dark:text-rose-400"
                  >
                    <AlertCircle size={18} />
                  </div>
                )}
                {isWarning && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-8 h-8 rounded-[var(--r-tile,12px)] bg-amber-50 dark:bg-amber-950/60 [--sq-stroke:#fde68a] dark:[--sq-stroke:#92400e] flex items-center justify-center text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle size={18} />
                  </div>
                )}
                {isInfo && (
                  <div
                    data-sq="tile"
                    data-sq-border="solid"
                    className="w-8 h-8 rounded-[var(--r-tile,12px)] bg-sky-50 dark:bg-sky-950/60 [--sq-stroke:#bae6fd] dark:[--sq-stroke:#075985] flex items-center justify-center text-sky-600 dark:text-sky-400"
                  >
                    <Info size={18} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h4 className="text-xs font-bold text-black dark:text-white tracking-tight">
                    {toast.title}
                  </h4>

                  {/* Cloud Sync Status Badge */}
                  {toast.syncStatus === 'synced' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                      <Cloud size={10} className="text-emerald-600 dark:text-emerald-400" />
                      Supabase Synced
                    </span>
                  )}
                  {toast.syncStatus === 'local' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-black/75 dark:text-white/85 border border-neutral-200 dark:border-neutral-700">
                      <Database size={10} />
                      Saved to Local Storage
                    </span>
                  )}
                  {toast.syncStatus === 'error' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/70 dark:bg-amber-900/40 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                      <AlertCircle size={10} />
                      Sync Notice
                    </span>
                  )}
                </div>

                <p className="text-xs text-black/75 dark:text-white/80 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-black/55 hover:text-black dark:text-white/60 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Dismiss notification"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
};
