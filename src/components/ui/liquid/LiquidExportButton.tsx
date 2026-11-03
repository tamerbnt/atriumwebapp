import React from 'react';
import { LiquidButton } from '@/atrium';
import type { Size } from '@/atrium';

export interface LiquidExportButtonProps {
  onExport: () => Promise<void> | void;
  idleLabel?: string;
  busyLabel?: string;
  doneLabel?: string;
  size?: Size;
  variant?: 'orange' | 'dark';
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  progress?: number;
}

export const LiquidExportButton: React.FC<LiquidExportButtonProps> = ({
  onExport,
  idleLabel = 'Export',
  busyLabel = 'Exporting',
  doneLabel = 'Exported',
  size = 'sm',
  variant,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
  progress,
}) => {
  return (
    <LiquidButton
      kind="export"
      size={size}
      tone={variant === 'dark' ? 'ink' : 'accent'}
      disabled={disabled}
      className={className}
      id={id}
      progress={progress}
      aria-label={ariaLabel || idleLabel}
      labels={{
        idle: idleLabel,
        busy: busyLabel,
        done: doneLabel,
      }}
      onPress={onExport}
    />
  );
};
