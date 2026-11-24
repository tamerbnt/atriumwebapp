import React from 'react';
import { X } from 'lucide-react';
import { SkeletonModalForm } from './skeleton/StructuralSkeletons';
import { KineticModalShell } from './kinetic/KineticModalShell';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  isLoading?: boolean;
  skeletonFieldsCount?: number;
  triggerRef?: React.RefObject<HTMLElement | null>;
  originElement?: HTMLElement | null;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle: _deprecatedSubtitle,
  children,
  maxWidth = 'md',
  isLoading = false,
  skeletonFieldsCount = 4,
  triggerRef,
  originElement,
}) => {
  const widthClasses: Record<NonNullable<ModalProps['maxWidth']>, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      originElement={originElement}
      maxWidthClass={widthClasses[maxWidth]}
      zIndexClass="z-[9990]"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="relative w-full max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-[var(--s4,16px)] p-[var(--modal-pad,24px)] pb-[var(--s4,16px)] border-b border-[var(--atr-divider)] shrink-0">
          <h2 className="t-dialog text-[var(--text-1)] dark:text-white truncate min-w-0">
            {title}
          </h2>
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
    </KineticModalShell>
  );
};
