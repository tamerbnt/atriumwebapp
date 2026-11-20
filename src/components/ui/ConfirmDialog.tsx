import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { AtriumButton } from './AtriumButton';

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
    let didLockBody = false;
    let prevOverflow = '';
    if (isOpen) {
      if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
        prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        didLockBody = true;
      }
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (didLockBody) {
        document.body.style.overflow = prevOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 [--sq-stroke:#FECDD3] dark:[--sq-stroke:rgba(136,19,55,0.6)]',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/30',
      Icon: AlertTriangle,
    },
    warning: {
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 [--sq-stroke:#FDE68A] dark:[--sq-stroke:rgba(120,53,15,0.6)]',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500/30',
      Icon: AlertCircle,
    },
    info: {
      iconBg: 'bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] [--sq-stroke:rgba(212,82,47,0.25)]',
      btnBg: 'bg-[var(--brand-fill)] hover:bg-[var(--brand-accent)] text-white shadow-xs focus:ring-[#d4522f]/30',
      Icon: Info,
    },
  }[variant];

  const IconComponent = variantStyles.Icon;

  const dialogContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-[var(--s4,16px)]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transform-gpu transition-opacity duration-200"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Surface Card */}
      <div className="relative w-full max-w-md z-10 sq-elev-pop">
        <div
          role="alertdialog"
          aria-modal="true"
          data-sq="panel"
          data-sq-border="solid"
          style={{ contain: 'layout paint' }}
          className="relative w-full overflow-hidden bg-white dark:bg-[#18181B] [--sq-stroke:var(--sq-stroke-pop)] transform-gpu animate-in fade-in zoom-in-95 duration-150 p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)]"
        >
          <div className="flex items-start gap-[var(--s4,16px)]">
            <div
              data-sq="tile-lg"
              data-sq-border="solid"
              className={`relative w-[var(--tile-lg,48px)] h-[var(--tile-lg,48px)] shrink-0 flex items-center justify-center ${variantStyles.iconBg}`}
            >
              <IconComponent size={24} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0 pe-[var(--s8,48px)] flex flex-col gap-[var(--s1,4px)]">
              <h3 className="t-dialog text-[var(--text-1)] dark:text-white">
                {title}
              </h3>
              <p className="t-body text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {description}
              </p>
            </div>
            <button
              type="button"
              data-no-liquid="true"
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-[var(--s4,16px)] end-[var(--s4,16px)] w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-white/65 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-[var(--s3,12px)] pt-[var(--s4,16px)] border-t border-[var(--atr-divider)]">
            <AtriumButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onClick={onClose}
            >
              {cancelLabel}
            </AtriumButton>
            <AtriumButton
              type="button"
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              loading={isLoading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AtriumButton>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : dialogContent;
};
