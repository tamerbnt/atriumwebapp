import React from 'react';
import { LiquidButton } from '@/atrium';
import type { Size } from '@/atrium';

export interface LiquidContinueButtonProps {
  onClick?: () => void;
  label?: string;
  size?: Size;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export const LiquidContinueButton: React.FC<LiquidContinueButtonProps> = ({
  onClick,
  label = 'Continue',
  size = 'lg',
  disabled = false,
  className = '',
  id,
  'aria-label': ariaLabel,
}) => {
  return (
    <LiquidButton
      kind="continue"
      size={size}
      disabled={disabled}
      className={className}
      id={id}
      aria-label={ariaLabel || label}
      labels={{
        idle: label,
      }}
      onPress={onClick}
    />
  );
};
