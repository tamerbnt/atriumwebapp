import React, { forwardRef } from 'react';
import { IconButton as AtriumIconButton } from '@/atrium';
import type { LiveButtonTone, LiveButtonSize } from './LiveButton';

export interface LiveIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  icon: React.ReactNode;
  badge?: number | string | null;
  kick?: 'spin' | 'none';
  tone?: LiveButtonTone;
  size?: LiveButtonSize;
  'aria-label'?: string;
}

export const LiveIconButton = forwardRef<HTMLButtonElement, LiveIconButtonProps>(
  function LiveIconButton(
    {
      icon,
      badge,
      kick,
      size,
      style,
      tone = 'soft',
      onClick,
      className = '',
      'aria-label': ariaLabel,
      title,
      ...props
    },
    ref
  ) {
    const label = ariaLabel || title || 'Action';
    return (
      <AtriumIconButton
        ref={ref}
        icon={icon}
        aria-label={label}
        badge={badge ?? undefined}
        kick={kick === 'spin' ? 'spin' : undefined}
        tone={tone}
        size={size}
        style={style}
        onClick={onClick}
        className={className}
        title={title}
        {...props}
      />
    );
  }
);

LiveIconButton.displayName = 'LiveIconButton';
