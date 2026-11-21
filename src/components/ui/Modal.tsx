import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SkeletonModalForm } from './skeleton/StructuralSkeletons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  skeletonFieldsCount?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  isLoading = false,
  skeletonFieldsCount = 4,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
  }[maxWidth];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transform-gpu transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Dialog Surface */}
      <div className={`relative w-full ${widthClasses} z-10 sq-elev-pop`}>
        <div
          data-sq="panel"
          data-sq-border="solid"
          style={{ contain: 'layout paint' }}
          className="relative w-full max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] transform-gpu animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-[var(--s4,16px)] p-[var(--modal-pad,24px)] pb-[var(--s4,16px)] border-b border-[var(--atr-divider)]">
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <h2 className="t-dialog text-[var(--text-1)] dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="t-cap text-[var(--text-2)] dark:text-[var(--text-dark-2)]">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              data-no-liquid="true"
              onClick={onClose}
              className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-[var(--text-dark-2)] dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#2B2825] transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-[var(--modal-pad,24px)] overflow-y-auto max-h-[calc(90vh-140px)]">
            {isLoading ? (
              <SkeletonModalForm fieldsCount={skeletonFieldsCount} />
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
