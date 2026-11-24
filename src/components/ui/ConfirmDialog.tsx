import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { AtriumButton } from './AtriumButton';
import { KineticModalShell } from './kinetic/KineticModalShell';

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
  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 [--sq-stroke:#FECDD3] dark:[--sq-stroke:rgba(136,19,55,0.6)]',
      Icon: AlertTriangle,
    },
    warning: {
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 [--sq-stroke:#FDE68A] dark:[--sq-stroke:rgba(120,53,15,0.6)]',
      Icon: AlertCircle,
    },
    info: {
      iconBg: 'bg-[#d4522f]/10 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] [--sq-stroke:rgba(212,82,47,0.25)]',
      Icon: Info,
    },
  }[variant];

  const IconComponent = variantStyles.Icon;

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      zIndexClass="z-[9995]"
      role="alertdialog"
      closeOnScrimClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="relative w-full overflow-hidden bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)]"
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
            className="absolute top-[var(--s4,16px)] end-[var(--s4,16px)] w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-white/65 dark:hover:text-white bg-[#F3EDE7] dark:bg-[#2B2825] hover:bg-[#EAE2D9] dark:hover:bg-[#36322E] transition-colors cursor-pointer"
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
    </KineticModalShell>
  );
};
