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
import { useAtriumStore } from '../../services/store';
import { ToastNotification } from '../../types/index';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useAtriumStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast: ToastNotification) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isInfo = toast.type === 'info';

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto bg-white/95 dark:bg-[#1E1E22]/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-neutral-200/90 dark:border-neutral-700/80 flex items-start gap-3.5 transition-all duration-300 animate-in slide-in-from-top-3"
          >
            {/* Status Icon */}
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
              )}
              {isError && (
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <AlertCircle size={18} />
                </div>
              )}
              {isWarning && (
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={18} />
                </div>
              )}
              {isInfo && (
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Info size={18} />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white tracking-tight">
                  {toast.title}
                </h4>

                {/* Cloud Sync Status Badge */}
                {toast.syncStatus === 'synced' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-900/40 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                    <Cloud size={10} className="text-emerald-600 dark:text-emerald-400" />
                    Supabase Synced
                  </span>
                )}
                {toast.syncStatus === 'local' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <Database size={10} />
                    Saved to Local Storage
                  </span>
                )}
                {toast.syncStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-900/40 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                    <AlertCircle size={10} />
                    Sync Notice
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </aside>
  );
};
