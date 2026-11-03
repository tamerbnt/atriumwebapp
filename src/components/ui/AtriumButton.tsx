import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button as AtriumCoreButton, Tone as AtriumTone } from '@/atrium';
import type { Size as AtriumSize } from '@/atrium';

export interface AtriumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const AtriumButton = forwardRef<HTMLButtonElement, AtriumButtonProps>(function AtriumButton(
  {
    children,
    variant = 'primary',
    size = 'sm',
    glow = true,
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  // Map variant to official Atrium Button tone
  let tone: AtriumTone = 'accent';
  let dangerClass = '';
  switch (variant) {
    case 'primary':
      tone = 'accent';
      break;
    case 'secondary':
    case 'ghost':
      tone = 'soft';
      break;
    case 'outline':
      tone = 'outline';
      break;
    case 'success':
      tone = 'success';
      break;
    case 'danger':
      tone = 'outline';
      dangerClass = '!border-[var(--atr-danger)] !text-[var(--atr-danger)]';
      break;
  }

  // Map size to Atrium scale (sm = 28px, md = 34px, lg = 44px, xs = 24px)
  let atrSize: AtriumSize = 'sm';
  switch (size) {
    case 'xs':
      atrSize = 24;
      break;
    case 'sm':
      atrSize = 'sm';
      break;
    case 'md':
      atrSize = 'md';
      break;
    case 'lg':
      atrSize = 'lg';
      break;
  }

  const leading = loading ? (
    <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="animate-spin" />
  ) : icon && iconPosition === 'left' ? (
    icon
  ) : undefined;

  const trailing = !loading && icon && iconPosition === 'right' ? icon : undefined;

  return (
    <AtriumCoreButton
      ref={ref}
      type={type}
      tone={tone}
      size={atrSize}
      disabled={disabled || loading}
      leading={leading}
      trailing={trailing}
      className={[dangerClass, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </AtriumCoreButton>
  );
});

AtriumButton.displayName = 'AtriumButton';

export const Button = AtriumButton;
export default AtriumButton;
