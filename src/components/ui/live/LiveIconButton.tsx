import React, { forwardRef } from 'react';
import { LiveButton, LiveButtonTone, LiveButtonSize } from './LiveButton';
import { LiveBadge, liveBadgeClasses } from './LiveBadge';
import { spinIcon } from '../../../utils/atriumSprings';

export interface LiveIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  icon: React.ReactNode;
  badge?: number | string | null;
  kick?: 'spin' | 'none';
  tone?: LiveButtonTone;
  size?: LiveButtonSize;
}

function getSizeProps(size?: LiveButtonSize, style?: React.CSSProperties) {
  if (size === undefined) return { style };
  if (typeof size === 'number') {
    return {
      style: {
        ...style,
        '--atr-h': `${size}px`,
      } as React.CSSProperties,
    };
  }
  return {
    'data-atr-size': size,
    style,
  };
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
      ...props
    },
    ref
  ) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (kick === 'spin' && !e.defaultPrevented) {
        const svg = e.currentTarget.querySelector('svg');
        if (svg) {
          spinIcon(svg as SVGElement);
        }
      }
    };

    if (badge === undefined || badge === null) {
      return (
        <LiveButton
          ref={ref}
          iconOnly
          tone={tone}
          size={size}
          style={style}
          onClick={handleClick}
          leading={icon}
          className={className}
          {...props}
        />
      );
    }

    const sizeProps = getSizeProps(size, style);

    return (
      <span className={liveBadgeClasses.wrap} {...sizeProps}>
        <LiveButton
          ref={ref}
          iconOnly
          tone={tone}
          size={size}
          onClick={handleClick}
          leading={icon}
          className={className}
          {...props}
        />
        <LiveBadge value={badge} floating />
      </span>
    );
  }
);

LiveIconButton.displayName = 'LiveIconButton';
