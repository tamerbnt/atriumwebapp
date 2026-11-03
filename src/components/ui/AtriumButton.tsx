import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { LiveButton, LiveButtonTone, LiveButtonSize } from './live/LiveButton';

export interface AtriumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
  // Map variant to Atrium Live Button tone
  let tone: LiveButtonTone = 'accent';
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
    case 'danger':
      tone = 'outline';
      dangerClass = '!border-rose-500 !text-rose-500 hover:!bg-rose-500/10';
      break;
  }

  // Map size to Atrium Live scale
  let liveSize: LiveButtonSize = 'md';
  switch (size) {
    case 'xs':
      liveSize = 26;
      break;
    case 'sm':
      liveSize = 'sm'; // 28px
      break;
    case 'md':
      liveSize = 'md'; // 34px standard desktop density
      break;
    case 'lg':
      liveSize = 'lg'; // 44px
      break;
  }

  const leading = loading ? (
    <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="animate-spin" />
  ) : icon && iconPosition === 'left' ? (
    icon
  ) : undefined;

  const trailing = !loading && icon && iconPosition === 'right' ? icon : undefined;

  return (
    <LiveButton
      ref={ref}
      type={type}
      tone={tone}
      size={liveSize}
      disabled={disabled || loading}
      leading={leading}
      trailing={trailing}
      className={[dangerClass, className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </LiveButton>
  );
});

AtriumButton.displayName = 'AtriumButton';

export const Button = AtriumButton;
export default AtriumButton;
