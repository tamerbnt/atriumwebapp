import React, { useRef, useEffect } from 'react';
import { popBadge } from '../../../utils/atriumSprings';

export const liveBadgeClasses = {
  wrap: 'x',
  badge: 'm',
  floating: 'k',
  inline: 'w',
  dot: 'y',
};

export interface LiveBadgeProps {
  value?: number | string | null;
  max?: number;
  showZero?: boolean;
  floating?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function LiveBadge({
  value,
  max = 99,
  showZero = false,
  floating = true,
  className = '',
  style,
}: LiveBadgeProps) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef<number | string | null | undefined>(value);

  useEffect(() => {
    if (
      typeof value === 'number' &&
      typeof prevRef.current === 'number' &&
      value > prevRef.current &&
      badgeRef.current
    ) {
      popBadge(badgeRef.current);
    }
    prevRef.current = value;
  }, [value]);

  if (value === undefined || value === null || value === '' || (value === 0 && !showZero)) {
    return null;
  }

  const formatted = typeof value === 'number' && value > max ? `${max}+` : String(value);

  const classes = [
    liveBadgeClasses.badge,
    floating ? liveBadgeClasses.floating : liveBadgeClasses.inline,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span ref={badgeRef} className={classes} style={style} aria-hidden="true">
      {formatted}
    </span>
  );
}

export interface LiveStatusDotProps {
  className?: string;
  style?: React.CSSProperties;
}

export function LiveStatusDot({ className = '', style }: LiveStatusDotProps) {
  const classes = [liveBadgeClasses.dot, className].filter(Boolean).join(' ');
  return <span className={classes} style={style} aria-hidden="true" />;
}
