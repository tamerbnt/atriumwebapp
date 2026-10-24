import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/30',
      Icon: AlertTriangle,
    },
    warning: {
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500/30',
      Icon: AlertCircle,
    },
    info: {
      iconBg: 'bg-[#C4785A]/10 text-[#C4785A] border border-[#C4785A]/20',
      btnBg: 'bg-[#C4785A] hover:bg-[#b3684a] text-white shadow-xs focus:ring-[#C4785A]/30',
      Icon: Info,
    },
  }[variant];

  const IconComponent = variantStyles.Icon;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Surface Card */}
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-md z-10 overflow-hidden rounded-[24px] bg-white dark:bg-[#18181B] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150 p-6"
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${variantStyles.iconBg}`}>
            <IconComponent size={22} />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${variantStyles.btnBg} ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
