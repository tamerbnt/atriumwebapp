import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button as AtriumCoreButton, Tone as AtriumTone } from '@/atrium/core';
import type { Size as AtriumSize } from '@/atrium/core';

export interface AtriumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  glow?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  shape?: 'squircle' | 'capsule';
}

export const AtriumButton = forwardRef<HTMLButtonElement, AtriumButtonProps>(function AtriumButton(
  {
    children,
    variant = 'primary',
    size = 'md',
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
      dangerClass = '!border-[var(--atr-danger)] !text-[var(--atr-danger)] [--sq-stroke:var(--atr-danger)]';
      break;
  }

  // Map size to Atrium core token sizes (sm = 32px/28px compact, md = 40px/36px compact, lg = 48px)
  let atrSize: AtriumSize = 'md';
  if (typeof size === 'number') {
    atrSize = size;
  } else {
    switch (size) {
      case 'xs':
      case 'sm':
        atrSize = 'sm';
        break;
      case 'md':
        atrSize = 'md';
        break;
      case 'lg':
        atrSize = 48;
        break;
      default:
        atrSize = 'md';
        break;
    }
  }

  const loaderSize =
    typeof size === 'number'
      ? (size >= 48 ? 20 : 16)
      : size === 'lg'
      ? 20
      : 16;

  const leading = loading ? (
    <Loader2 size={loaderSize} className="animate-spin" />
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
