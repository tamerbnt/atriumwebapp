import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button as AtriumCoreButton, Tone as AtriumTone } from '@/atrium';
import type { Size as AtriumSize } from '@/atrium';

export interface AtriumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  glow?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
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
      dangerClass = '!border-[var(--atr-danger)] !text-[var(--atr-danger)]';
      break;
  }

  // Map size to Atrium scale (sm = 36px, md = 40px, lg = 48px, xs = 30px)
  let atrSize: AtriumSize = 40;
  if (typeof size === 'number') {
    atrSize = size;
  } else {
    switch (size) {
      case 'xs':
        atrSize = 30;
        break;
      case 'sm':
        atrSize = 36;
        break;
      case 'md':
        atrSize = 40;
        break;
      case 'lg':
        atrSize = 48;
        break;
      default:
        atrSize = 40;
        break;
    }
  }

  const loaderSize =
    typeof size === 'number'
      ? Math.round(size * 0.42)
      : size === 'xs'
      ? 14
      : size === 'sm'
      ? 16
      : size === 'lg'
      ? 20
      : 18;

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
